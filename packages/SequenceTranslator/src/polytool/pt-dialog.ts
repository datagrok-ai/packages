/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {RuleInputs, RULES_PATH, RULES_STORAGE_NAME} from './pt-rules';
import {addTransformedColumn} from './pt-conversion';

import {handleError} from './utils';
import {getLibrariesList, HelmInput, getEnumeration} from './pt-enumeration';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';

const PT_ERROR_DATAFRAME = 'No dataframe with macromolecule columns open';
const PT_WARNING_COLUMN = 'No marcomolecule column chosen!';

const PT_UI_GET_HELM = 'Get HELM';
const PT_UI_ADD_HELM = 'Add HELM column';
const PT_UI_USE_CHIRALITY = 'Chirality engine';
const PT_UI_DIALOG_CONVERSION = 'Poly Tool Conversion';
const PT_UI_DIALOG_ENUMERATION = 'Poly Tool Enumeration';
const PT_UI_RULES_USED = 'Rules used';

export async function getPolyToolConversionDialog(): Promise<DG.Dialog> {
  const targetColumns = grok.shell.t.columns.bySemTypeAll(DG.SEMTYPE.MACROMOLECULE);
  if (!targetColumns)
    throw new Error(PT_ERROR_DATAFRAME);

  const targetColumnInput = ui.columnInput(
    'Column', grok.shell.t, targetColumns[0], null,
    {filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MACROMOLECULE}
  );

  const generateHelmChoiceInput = ui.boolInput(PT_UI_GET_HELM, true);
  ui.tooltip.bind(generateHelmChoiceInput.root, PT_UI_ADD_HELM);

  const chiralityEngineInput = ui.boolInput(PT_UI_USE_CHIRALITY, false);
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

  const dialog = ui.dialog(PT_UI_DIALOG_CONVERSION)
    .add(div)
    .onOK(async () => {
      const pi = DG.TaskBarProgressIndicator.create('PolyTool converting');
      try {
        const sequencesCol = targetColumnInput.value;
        if (!sequencesCol) {
          grok.shell.warning(PT_WARNING_COLUMN);
          return;
        }

        const files = await ruleInputs.getActive();

        addTransformedColumn(sequencesCol!,
          generateHelmChoiceInput.value!,
          files,
          chiralityEngineInput.value!);
      } catch (err: any) {
        handleError(err);
      } finally {
        pi.close();
      }
    });

  return dialog;
}

export async function getPolyToolEnumerationDialog(): Promise<DG.Dialog> {
  const helmInput = await HelmInput.init();

  const libList = await getLibrariesList();
  const screenLibrary = ui.choiceInput('Library to use', null, libList);

  screenLibrary.input.setAttribute('style', `min-width:250px!important;`);

  const div = ui.div([
    helmInput.getDiv(),
    screenLibrary.root
  ]);

  const cccSubs = grok.events.onCurrentCellChanged.subscribe(() => {
    const cell = grok.shell.tv.dataFrame.currentCell;

    if (cell.column.semType === DG.SEMTYPE.MACROMOLECULE && cell.column.tags[DG.TAGS.UNITS] === NOTATION.HELM)
      helmInput.setHelmString(cell.value);
  });

  const dialog = ui.dialog(PT_UI_DIALOG_ENUMERATION)
    .add(div)
    .onOK(async () => {
      try {
        const helmString = helmInput.getHelmString();
        const helmSelections = helmInput.getHelmSelections();
        if (helmString === undefined || helmString === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else if (helmSelections === undefined || helmSelections.length < 1) {
          grok.shell.warning('PolyTool: no selection was provided');
        } else {
          const molecules = await getEnumeration(helmString, helmSelections, screenLibrary.value!);
          const molCol = DG.Column.fromStrings('Enumerated', molecules);
          const df = DG.DataFrame.fromColumns([molCol]);
          grok.shell.addTableView(df);
        }
      } catch (err: any) {

      } finally {
        cccSubs.unsubscribe();
      }
    }).onCancel(() => {
      cccSubs.unsubscribe();
    });

  return dialog;
}
