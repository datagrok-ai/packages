/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {HelmAtom} from '@datagrok-libraries/bio/src/helm/types';

import {RuleInputs, RULES_PATH, RULES_STORAGE_NAME} from './pt-rules';
import {addTransformedColumn} from './pt-conversion';

import {handleError} from './utils';
import {defaultErrorHandler} from '../utils/err-info';
import {getLibrariesList} from './utils';
import {getEnumerationHelm, PT_HELM_EXAMPLE} from './pt-enumeration-helm';
import {getEnumerationChem, getGroupsNumber, PT_CHEM_EXAMPLE} from './pt-enumeration-chem';

const PT_ERROR_DATAFRAME = 'No dataframe with macromolecule columns open';
const PT_WARNING_COLUMN = 'No marcomolecule column chosen!';

const PT_UI_GET_HELM = 'Get HELM';
const PT_UI_ADD_HELM = 'Add HELM column';
const PT_UI_USE_CHIRALITY = 'Chirality engine';
const PT_UI_DIALOG_CONVERSION = 'Poly Tool Conversion';
const PT_UI_DIALOG_ENUMERATION = 'Poly Tool Enumeration';
const PT_UI_RULES_USED = 'Rules used';

export function polyToolEnumerateHelmUI(cell?: DG.Cell): void {
  getPolyToolEnumerationHelmDialog(cell)
    .then((dialog) => {
      dialog.show({resizable: true});
    })
    .catch((_err: any) => {
      grok.shell.warning('To run PolyTool Enumeration, sketch the macromolecule and select monomers to vary');
    });
}

export function polyToolEnumerateChemUI(cell?: DG.Cell): void {
  getPolyToolEnumerationChemDialog(cell)
    .then((dialog) => {
      dialog.show({resizable: true});
    })
    .catch((_err: any) => {
      grok.shell.warning('To run PolyTool Enumeration, sketch the molecule and specify the R group to vary');
    });
}

export async function getPolyToolConversionDialog(targetCol?: DG.Column): Promise<DG.Dialog> {
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

async function getPolyToolEnumerationHelmDialog(cell?: DG.Cell): Promise<DG.Dialog> {
  const [libList, helmHelper] = await Promise.all([
    getLibrariesList(), getHelmHelper()]);

  const helmValue = cell ? cell.value : PT_HELM_EXAMPLE;

  const helmInput = helmHelper.createHelmInput('Macromolecule', {value: helmValue});
  const screenLibrary = ui.input.choice('Library to use', {value: null, items: libList});

  helmInput.input.setAttribute('style', `min-width:250px!important;`);
  screenLibrary.input.setAttribute('style', `min-width:250px!important;`);

  const div = ui.div([
    helmInput.root,
    screenLibrary.root
  ]);

  // Displays the molecule from a current cell (monitors changes)
  const cccSubs = grok.events.onCurrentCellChanged.subscribe(() => {
    const cell = grok.shell.tv.dataFrame.currentCell;

    if (cell.column.semType === DG.SEMTYPE.MACROMOLECULE && cell.column.meta.units === NOTATION.HELM)
      helmInput.stringValue = cell.value;
  });

  const dialog = ui.dialog(PT_UI_DIALOG_ENUMERATION)
    .add(div)
    .onOK(async () => {
      try {
        const helmString = helmInput.stringValue;
        const helmSelections: number[] = wu.enumerate<HelmAtom>(helmInput.value.atoms)
          .filter(([a, aI]) => a.highlighted)
          .map(([a, aI]) => aI).toArray();
        if (helmString === undefined || helmString === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else if (helmSelections === undefined || helmSelections.length < 1) {
          grok.shell.warning('PolyTool: no selection was provided');
        } else {
          const molecules = await getEnumerationHelm(helmString, helmSelections, screenLibrary.value!);
          const molCol = DG.Column.fromStrings('Enumerated', molecules);
          const df = DG.DataFrame.fromColumns([molCol]);
          grok.shell.addTableView(df);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      } finally {
        cccSubs.unsubscribe();
      }
    }).onCancel(() => {
      cccSubs.unsubscribe();
    });

  return dialog;
}

function getInputs(rNumber: number, libList: string[]) :  DG.ChoiceInput<string | null> [] {
  const screenLibrariesInputs: DG.ChoiceInput<string | null> [] = [];

  for (let i = 0; i < rNumber; i++) {
    const screenLibrary = ui.input.choice(`R${i + 1} library to use`, {value: null, items: libList});
    screenLibrary.input.setAttribute('style', `min-width:250px!important;`);
    screenLibrariesInputs.push(screenLibrary);
  }

  return screenLibrariesInputs;
}

async function getPolyToolEnumerationChemDialog(cell?: DG.Cell): Promise<DG.Dialog> {
  const [libList, helmHelper] = await Promise.all([
    getLibrariesList(), getHelmHelper()]);

  let molValue = PT_CHEM_EXAMPLE;//cell ? cell.value : PT_CHEM_EXAMPLE;
  let rNumber = await getGroupsNumber(molValue);
  let screenLibrariesInputs = getInputs(rNumber, libList);
  let inputsDiv = ui.divV(screenLibrariesInputs);

  const molInput = new DG.chem.Sketcher(DG.chem.SKETCHER_MODE.EXTERNAL);
  molInput.syncCurrentObject = false;
  molInput.onChanged.subscribe(async (_: any) => {
    molValue = molInput.getMolFile();
    const rNewNumber = await getGroupsNumber(molValue);
    screenLibrariesInputs = getInputs(rNewNumber, libList);
    //inputsDiv = ui.divV(screenLibrariesInputs);
    for (let i = rNumber; i < rNewNumber; i++)
      inputsDiv.append(screenLibrariesInputs[i].root)

    rNumber = rNewNumber;
    
  });

  molInput.root.classList.add('ui-input-editor');
  molInput.root.style.marginTop = '3px';
  molInput.setMolFile(molValue);
  molInput.root.setAttribute('style', `min-width:250px!important;`);
  molInput.root.setAttribute('style', `max-width:250px!important;`);

  const div = ui.div([
    molInput.root,
    inputsDiv
  ]);

  const cccSubs = grok.events.onCurrentCellChanged.subscribe(() => {
    const cell = grok.shell.tv.dataFrame.currentCell;

    if (cell.column.semType === DG.SEMTYPE.MOLECULE)
      molInput.setValue(cell.value);
  });

  // Displays the molecule from a current cell (monitors changes)
  const dialog = ui.dialog(PT_UI_DIALOG_ENUMERATION)
    .add(div)
    .onOK(async () => {
      try {
        const molString = molInput.getMolFile();

        if (molString === undefined || molString === '') {
          grok.shell.warning('PolyTool: no molecule was provided');
        } else if (!molString.includes('R#')) {
          grok.shell.warning('PolyTool: no R group was provided');
        } else {
          const molecules = await getEnumerationChem(molString, screenLibrariesInputs.map((sc) => sc.value!));
          const molCol = DG.Column.fromStrings('Enumerated', molecules);
          const df = DG.DataFrame.fromColumns([molCol]);
          grok.shell.addTableView(df);
        }
      } catch (err: any) {
        defaultErrorHandler(err);
      } finally {
        cccSubs.unsubscribe();
      }
    }).onCancel(() => {
      cccSubs.unsubscribe();
    });

  return dialog;
}
