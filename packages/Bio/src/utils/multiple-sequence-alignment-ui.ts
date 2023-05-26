import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {ALPHABET, NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {runKalign} from './multiple-sequence-alignment';
import {pepseaMethods, runPepsea} from './pepsea';
import {checkInputColumnUI} from './check-input-column';
import {NotationConverter} from '@datagrok-libraries/bio/src/utils/notation-converter';
import {_package} from '../package';
import {multipleSequenceAlginmentUIOptions} from './types';
import {kalignVersion, msaDefaultOptions} from './constants';
import '../../css/msa.css';
export class MsaWarning extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export async function multipleSequenceAlignmentUI(
  options: multipleSequenceAlginmentUIOptions = {}
): Promise<DG.Column> {
  return new Promise(async (resolve, reject) => {
    options.clustersCol ??= null;
    options.pepsea ??= {};
    options.pepsea.method ??= msaDefaultOptions.pepsea.method;
    options.pepsea.gapOpen ??= msaDefaultOptions.pepsea.gapOpen;
    options.pepsea.gapExtend ??= msaDefaultOptions.pepsea.gapExtend;

    const table = options.col?.dataFrame ?? grok.shell.t;
    const seqCol = options.col ?? table.columns.bySemType(DG.SEMTYPE.MACROMOLECULE);
    if (seqCol == null) {
      const errMsg = `MSAError: dataset doesn't conain any Macromolecule column`;
      grok.shell.warning(errMsg);
      reject(new MsaWarning(errMsg));
    }

    // UI for PepSea alignment
    const methodInput = ui.choiceInput('Method', options.pepsea.method, pepseaMethods);
    methodInput.setTooltip('Alignment method');

    // UI for Kalign alignment
    const terminalGapInput = ui.floatInput('Terminal gap', options?.kalign?.terminalGap ?? null);
    terminalGapInput.setTooltip('Penalty for opening a gap at the beginning or end of the sequence');
    const kalignVersionDiv = ui.p(`Kalign version: ${kalignVersion}`, 'kalign-version');

    // shared UI
    const gapOpenInput = ui.floatInput('Gap open', options.pepsea.gapOpen);
    gapOpenInput.setTooltip('Gap opening penalty at group-to-group alignment');
    const gapExtendInput = ui.floatInput('Gap extend', options.pepsea.gapExtend);
    gapExtendInput.setTooltip('Gap extension penalty to skip the alignment');

    const pepseaInputRootStyles: CSSStyleDeclaration[] = [methodInput.root.style];
    const kalignInputRootStyles: CSSStyleDeclaration[] = [terminalGapInput.root.style, kalignVersionDiv.style];

    let performAlignment: (() => Promise<DG.Column<string> | null>) | undefined;

    // TODO: allow only macromolecule colums to be chosen
    const colInput = ui.columnInput('Sequence', table, seqCol, async () => {
      performAlignment = await onColInputChange(
        colInput.value, table, pepseaInputRootStyles, kalignInputRootStyles,
        methodInput, clustersColInput, gapOpenInput, gapExtendInput, terminalGapInput
      );
    }
    ) as DG.InputBase<DG.Column<string>>;
    colInput.setTooltip('Sequences column to use for alignment');
    const clustersColInput = ui.columnInput('Clusters', table, options.clustersCol);
    clustersColInput.nullable = true;
    colInput.fireChanged();
    //if column is specified (from tests), run alignment and resolve with the result
    if (options.col) {
      performAlignment = await onColInputChange(
        options.col, table, pepseaInputRootStyles, kalignInputRootStyles,
        methodInput, clustersColInput, gapOpenInput, gapExtendInput, terminalGapInput
      );

      await onDialogOk(colInput, table, performAlignment, resolve, reject);
      return;
    }
    const dlg = ui.dialog('MSA')
      .add(colInput)
      .add(clustersColInput)
      .add(methodInput)
      .add(gapOpenInput)
      .add(gapExtendInput)
      .add(terminalGapInput)
      .add(kalignVersionDiv)
      .onOK(async () => { await onDialogOk(colInput, table, performAlignment, resolve, reject); })
      .show();
  });
}

async function onDialogOk(
  colInput: DG.InputBase< DG.Column<any>>,
  table: DG.DataFrame,
  performAlignment: (() => Promise<DG.Column<string> | null>) | undefined,
  resolve: (value: DG.Column<any>) => void,
  reject: (reason: any) => void
): Promise<void> {
  let msaCol: DG.Column<string> | null = null;
  const pi = DG.TaskBarProgressIndicator.create('Analyze for MSA ...');
  try {
    colInput.fireChanged();
    if (colInput.value.semType !== DG.SEMTYPE.MACROMOLECULE)
      throw new Error('Chosen column has to be of Macromolecule semantic type');
    if (performAlignment === undefined) // value can only be undefined when column can't be processed with either method
      throw new Error('Invalid column format');
    msaCol = await performAlignment(); // progress
    if (msaCol == null)
      return grok.shell.warning('PepSeA container has not started');

    table.columns.add(msaCol);
    await grok.data.detectSemanticTypes(table);

    resolve(msaCol);
  } catch (err: any) {
    const errMsg: string = err instanceof Error ? err.message : err.toString();
    grok.shell.error(errMsg);
    reject(err);
  } finally {
    pi.close();
  }
}


async function onColInputChange(
  col: DG.Column<string>, table: DG.DataFrame,
  pepseaInputRootStyles: CSSStyleDeclaration[], kalignInputRootStyles: CSSStyleDeclaration[],
  methodInput: DG.InputBase<string | null>, clustersColInput: DG.InputBase<DG.Column<any> | null>,
  gapOpenInput: DG.InputBase<number | null>, gapExtendInput: DG.InputBase<number | null>,
  terminalGapInput: DG.InputBase<number | null>
): Promise<(() => Promise<DG.Column<string> | null>) | undefined> {
  try {
    if (col.semType !== DG.SEMTYPE.MACROMOLECULE)
      return;
    const unusedName = table.columns.getUnusedName(`msa(${col.name})`);

    if (checkInputColumnUI(col, col.name,
      [NOTATION.FASTA, NOTATION.SEPARATOR], [ALPHABET.DNA, ALPHABET.RNA, ALPHABET.PT], false)
    ) { // Kalign - natural alphabets. if the notation is separator, convert to fasta and then run kalign
      switchDialog(pepseaInputRootStyles, kalignInputRootStyles, 'kalign');
      gapOpenInput.value = null;
      gapExtendInput.value = null;
      terminalGapInput.value = null;
      const potentialColNC = new NotationConverter(col);
      const performCol: DG.Column<string> = potentialColNC.isFasta() ? col :
        potentialColNC.convert(NOTATION.FASTA);
      return async () => await runKalign(performCol, false, unusedName, clustersColInput.value);
    } else if (checkInputColumnUI(col, col.name,
      [NOTATION.HELM], [], false)
    ) { // PepSeA branch - Helm notation or separator notation with unknown alphabets
      switchDialog(pepseaInputRootStyles, kalignInputRootStyles, 'pepsea');
      gapOpenInput.value = msaDefaultOptions.pepsea.gapOpen;
      gapExtendInput.value = msaDefaultOptions.pepsea.gapExtend;

      return async () => await runPepsea(col, unusedName, methodInput.value!,
          gapOpenInput.value!, gapExtendInput.value!, clustersColInput.value);
    } else if (checkInputColumnUI(col, col.name, [NOTATION.SEPARATOR], [ALPHABET.UN], false)) {
      //if the column is separator with unknown alphabet, it might be helm. check if it can be converted to helm
      const potentialColNC = new NotationConverter(col);
      if (!await potentialColNC.checkHelmCompatibility())
        return;
      const helmCol = potentialColNC.convert(NOTATION.HELM);
      switchDialog(pepseaInputRootStyles, kalignInputRootStyles, 'pepsea');
      gapOpenInput.value = msaDefaultOptions.pepsea.gapOpen;
      gapExtendInput.value = msaDefaultOptions.pepsea.gapExtend;
      // convert to helm and assign alignment function to PepSea

      return async () => await runPepsea(helmCol, unusedName, methodInput.value!,
            gapOpenInput.value!, gapExtendInput.value!, clustersColInput.value);
    } else {
      switchDialog(pepseaInputRootStyles, kalignInputRootStyles, 'kalign');
      return;
    }
  } catch (err: any) {
    const errMsg: string = err instanceof Error ? err.message : err.toString();
    grok.shell.error(errMsg);
    _package.logger.error(errMsg);
  }
}

type MSADialogType = 'kalign' | 'pepsea';

function switchDialog(
  pepseaInputRootStyles: CSSStyleDeclaration[], kalignInputRootStyles: CSSStyleDeclaration[], dialogType: MSADialogType
) {
  if (dialogType === 'kalign') {
    for (const inputRootStyle of pepseaInputRootStyles)
      inputRootStyle.display = 'none';
    for (const inputRootStyle of kalignInputRootStyles)
      inputRootStyle.removeProperty('display');
  } else {
    for (const inputRootStyle of kalignInputRootStyles)
      inputRootStyle.display = 'none';
    for (const inputRootStyle of pepseaInputRootStyles)
      inputRootStyle.removeProperty('display');
  }
}
