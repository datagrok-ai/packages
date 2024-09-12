/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {Unsubscribable} from 'rxjs';

import {getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {getSeqHelper, ISeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';

import {getRules, RuleInputs, RULES_PATH, RULES_STORAGE_NAME} from './pt-rules';
import {doPolyToolConvert} from './pt-conversion';
import {defaultErrorHandler} from '../utils/err-info';
import {getLibrariesList} from './utils';
import {getEnumerationChem, PT_CHEM_EXAMPLE} from './pt-enumeration-chem';

import {
  PT_ERROR_DATAFRAME, PT_UI_ADD_HELM, PT_UI_DIALOG_CONVERSION, PT_UI_DIALOG_ENUMERATION,
  PT_UI_GET_HELM, PT_UI_RULES_USED, PT_UI_USE_CHIRALITY, PT_WARNING_COLUMN
} from './const';

import {_package} from '../package';

export function polyToolEnumerateChemUI(cell?: DG.Cell): void {
  getPolyToolEnumerationChemDialog(cell)
    .then((dialog) => {
      dialog.show({resizable: true});
    })
    .catch((_err: any) => {
      grok.shell.warning('To run PolyTool Enumeration, sketch the molecule and specify the R group to vary');
    });
}

export async function polyToolConvertUI(): Promise<void> {
  let dialog: DG.Dialog;
  try {
    dialog = await getPolyToolConvertDialog();
    dialog.show();
  } catch (err: any) {
    const [errMsg, errStack] = errInfo(err);
    grok.shell.warning('To run PolyTool Conversion, open a dataframe with macromolecules');
    _package.logger.error(errMsg, undefined, errStack);
  }
}

export async function getPolyToolConvertDialog(targetCol?: DG.Column): Promise<DG.Dialog> {
  const subs: Unsubscribable[] = [];
  const destroy = () => {
    for (const sub of subs) sub.unsubscribe();
  };
  try {
    const targetColumns = grok.shell.t.columns.bySemTypeAll(DG.SEMTYPE.MACROMOLECULE);
    if (!targetColumns)
      throw new Error(PT_ERROR_DATAFRAME);

    const targetColumnInput = ui.input.column('Column', {
      table: grok.shell.t, value: targetColumns[0],
      filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MACROMOLECULE
    });

    targetColumnInput.value = targetCol ? targetCol : targetColumnInput.value;

    const generateHelmChoiceInput = ui.input.bool(PT_UI_GET_HELM, {value: true});
    ui.tooltip.bind(generateHelmChoiceInput.root, PT_UI_ADD_HELM);

    const chiralityEngineInput = ui.input.bool(PT_UI_USE_CHIRALITY, {value: false});
    const ruleInputs = new RuleInputs(RULES_PATH, RULES_STORAGE_NAME, '.json');
    const rulesHeader = ui.inlineText([PT_UI_RULES_USED]);
    ui.tooltip.bind(rulesHeader, 'Add or specify rules to use');
    const rulesForm = await ruleInputs.getForm();

    const div = ui.div([
      targetColumnInput,
      generateHelmChoiceInput,
      chiralityEngineInput,
      rulesHeader,
      rulesForm
    ]);


    const exec = async (): Promise<void> => {
      try {
        const ruleFileList = await ruleInputs.getActive();
        await polyToolConvert(targetColumnInput.value!, generateHelmChoiceInput.value!, chiralityEngineInput.value!, ruleFileList);
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    };

    const dialog = ui.dialog(PT_UI_DIALOG_CONVERSION)
      .add(div)
      .onOK(() => { exec(); });
    subs.push(dialog.onClose.subscribe(() => {
      destroy();
    }));

    return dialog;
  } catch (err: any) {
    destroy(); // on failing to build a dialog
    throw err;
  }
}

async function getPolyToolEnumerationChemDialog(cell?: DG.Cell): Promise<DG.Dialog> {
  const subs: Unsubscribable[] = [];
  const destroy = () => {
    for (const sub of subs) sub.unsubscribe();
  };
  try {
    const [libList, helmHelper] = await Promise.all([
      getLibrariesList(), getHelmHelper()]);

    const molStr = (cell && cell.rowIndex >= 0) ? cell.value : PT_CHEM_EXAMPLE;//cell ? cell.value : PT_CHEM_EXAMPLE;
    let molfileValue: string = await (async (): Promise<string> => {
      if (DG.chem.isMolBlock(molStr)) return molStr;
      return (await grok.functions.call('Chem:convertMolNotation', {
        molecule: molStr,
        sourceNotation: cell?.column.getTag(DG.TAGS.UNITS) ?? DG.chem.Notation.Unknown,
        targetNotation: DG.chem.Notation.MolBlock,
      }));
    })();

    const molInput = new DG.chem.Sketcher(DG.chem.SKETCHER_MODE.EXTERNAL);
    molInput.syncCurrentObject = false;
    // sketcher.setMolFile(col.tags[ALIGN_BY_SCAFFOLD_TAG]);
    molInput.onChanged.subscribe((_: any) => {
      molfileValue = molInput.getMolFile();
    });
    molInput.root.classList.add('ui-input-editor');
    molInput.root.style.marginTop = '3px';
    molInput.setMolFile(molfileValue);

    //const helmInput = helmHelper.createHelmInput('Macromolecule', {value: helmValue});
    const screenLibrary = ui.input.choice('Library to use', {value: null, items: libList});

    molInput.root.setAttribute('style', `min-width:250px!important;`);
    molInput.root.setAttribute('style', `max-width:250px!important;`);
    screenLibrary.input.setAttribute('style', `min-width:250px!important;`);

    const div = ui.div([
      molInput.root,
      screenLibrary.root
    ]);

    subs.push(grok.events.onCurrentCellChanged.subscribe(() => {
      const cell = grok.shell.tv.dataFrame.currentCell;

      if (cell.column.semType === DG.SEMTYPE.MOLECULE)
        molInput.setValue(cell.value);
    }));

    const exec = async (): Promise<void> => {
      try {
        const molString = molInput.getMolFile();

        if (molString === undefined || molString === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else if (!molString.includes('R#')) {
          grok.shell.warning('PolyTool: no R group was provided');
        } else {
          const molecules = await getEnumerationChem(molString, screenLibrary.value!);
          const molCol = DG.Column.fromStrings('Enumerated', molecules);
          const df = DG.DataFrame.fromColumns([molCol]);
          grok.shell.addTableView(df);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      }
    };

    // Displays the molecule from a current cell (monitors changes)
    const dialog = ui.dialog(PT_UI_DIALOG_ENUMERATION)
      .add(div)
      .onOK(() => {
        exec().finally(() => { destroy(); });
      })
      .onCancel(() => {
        destroy();
      });
    subs.push(dialog.onClose.subscribe(() => {
      destroy();
    }));
    return dialog;
  } catch (err: any) {
    destroy();
    throw err;
  }
}

/** Returns Helm and molfile columns.  */
export async function polyToolConvert(
  seqCol: DG.Column<string>, generateHelm: boolean, chiralityEngine: boolean, ruleFiles: string[]
): Promise<[DG.Column, DG.Column]> {
  const pi = DG.TaskBarProgressIndicator.create('PolyTool converting...');
  try {
    const getUnusedName = (df: DG.DataFrame | undefined, colName: string): string => {
      if (!df) return colName;
      return df.columns.getUnusedName(colName);
    };
    await getHelmHelper(); // initializes JSDraw and org

    const table = seqCol.dataFrame;
    const rules = await getRules(ruleFiles);
    const resList = doPolyToolConvert(seqCol.toList(), rules);

    const resHelmColName = getUnusedName(table, `transformed(${seqCol.name})`);
    const resHelmCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, resHelmColName, resList.length)
      .init((rowIdx: number) => { return resList[rowIdx]; });
    resHelmCol.semType = DG.SEMTYPE.MACROMOLECULE;
    resHelmCol.meta.units = NOTATION.HELM;
    resHelmCol.setTag(DG.TAGS.CELL_RENDERER, 'helm');
    if (generateHelm && table) table.columns.add(resHelmCol, true);

    const seqHelper: ISeqHelper = await getSeqHelper();
    const toAtomicLevelRes = await seqHelper.helmToAtomicLevel(resHelmCol, chiralityEngine, /* highlight */ generateHelm);
    const resMolCol = toAtomicLevelRes.molCol;
    resMolCol.name = getUnusedName(table, `molfile(${seqCol.name})`);
    resMolCol.semType = DG.SEMTYPE.MOLECULE;
    if (table) {
      table.columns.add(resMolCol, true);
      await grok.data.detectSemanticTypes(table);
    }
    return [resHelmCol, resMolCol];
  } finally {
    pi.close();
  }
}
