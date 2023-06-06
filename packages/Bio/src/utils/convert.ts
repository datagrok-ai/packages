import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';

import $ from 'cash-dom';
import {Subscription} from 'rxjs';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {NotationConverter} from '@datagrok-libraries/bio/src/utils/notation-converter';


let convertDialog: DG.Dialog | null = null;
let convertDialogSubs: Subscription[] = [];

/**
 * Converts notations of a Macromolecule column
 *
 * @param {DG.column} col Column with 'Macromolecule' semantic type
 */
export function convert(col?: DG.Column): void {

  let tgtCol = col ?? grok.shell.t.columns.bySemType('Macromolecule')!;
  if (!tgtCol)
    throw new Error('No column with Macromolecule semantic type found');
  let converter = new NotationConverter(tgtCol);
  let currentNotation: NOTATION = converter.notation;
  const dialogHeader =  ui.divText(
    'Current notation: ' + currentNotation,
    {
      style: {
        'text-align': 'center',
        'font-weight': 'bold',
        'font-size': '14px',
        'padding': '5px',
      },
    },
  );
  const notations = [
    NOTATION.FASTA,
    NOTATION.SEPARATOR,
    NOTATION.HELM,
  ];
  const toggleColumn = (newCol: DG.Column) => {
    if (newCol.semType !== DG.SEMTYPE.MACROMOLECULE) {
      targetColumnInput.value = tgtCol;
      return;
    }

    tgtCol = newCol;
    converter = new NotationConverter(tgtCol);
    currentNotation = converter.notation;
    dialogHeader.textContent = 'Current notation: ' + currentNotation;
    filteredNotations = notations.filter((e) => e !== currentNotation);
    targetNotationInput = ui.choiceInput('Convert to', filteredNotations[0], filteredNotations);
    toggleSeparator();
    convertDialog?.clear();
    convertDialog?.add(ui.div([
      dialogHeader,
      targetColumnInput.root,
      targetNotationInput.root,
      separatorInput.root
    ]))
  };

  const targetColumnInput = ui.columnInput('Column', grok.shell.t, tgtCol, toggleColumn);

  const separatorArray = ['-', '.', '/'];
  let filteredNotations = notations.filter((e) => e !== currentNotation);
  let targetNotationInput = ui.choiceInput('Convert to', filteredNotations[0], filteredNotations);

  const separatorInput = ui.choiceInput('Separator', separatorArray[0], separatorArray);

  // hide the separator input for non-SEPARATOR target notations
  const toggleSeparator = () => {
    if (targetNotationInput.value !== NOTATION.SEPARATOR)
      $(separatorInput.root).hide();
    else
      $(separatorInput.root).show();
  };

  // set correct visibility on init
  toggleSeparator();

  targetNotationInput.onChanged(() => {
    toggleSeparator();
  });

  if (convertDialog == null) {
    convertDialog = ui.dialog('Convert Sequence Notation')
      .add(ui.div([
        dialogHeader,
        targetColumnInput.root,
        targetNotationInput.root,
        separatorInput.root,
      ]))
      .onOK(async () => {
        const targetNotation = targetNotationInput.value as NOTATION;
        const separator: string | null = separatorInput.value;

        await convertDo(tgtCol, targetNotation, separator);
      })
      .show({x: 350, y: 100});

    convertDialogSubs.push(convertDialog.onClose.subscribe((_value) => {
      convertDialogSubs.forEach((s) => { s.unsubscribe(); });
      convertDialogSubs = [];
      convertDialog = null;
    }));
  }
}

/** Creates a new column with converted sequences and detects its semantic type
 * @param {DG.Column} srcCol Column with 'Macromolecule' semantic type
 * @param {NOTATION} targetNotation Target notation
 * @param {string | null} separator Separator for SEPARATOR notation
 */
export async function convertDo(
  srcCol: DG.Column, targetNotation: NOTATION, separator: string | null,
): Promise<DG.Column> {
  const converter = new NotationConverter(srcCol);
  const newColumn = converter.convert(targetNotation, separator);
  srcCol.dataFrame.columns.add(newColumn);

  // Call detector directly to escape some error on detectSemanticTypes
  const semType = await grok.functions.call('Bio:detectMacromolecule', {col: newColumn});
  if (semType)
    newColumn.semType = semType;

  // call to calculate 'cell.renderer' tag
  await grok.data.detectSemanticTypes(srcCol.dataFrame);

  return newColumn;
}
