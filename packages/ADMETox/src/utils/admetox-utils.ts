import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { _package } from '../package-test';
import { properties, models } from './const';
import { ColumnInputOptions } from '@datagrok-libraries/utils/src/type-declarations';
import '../css/admetox.css';

const _STORAGE_NAME = 'admet_models';
const _KEY = 'selected';

export async function runAdmetox(csvString: string, queryParams: string, addProbability: string): Promise<string | null> {
  const admetoxContainer = await grok.dapi.docker.dockerContainers.filter('admetox').first();
  if (admetoxContainer.status !== 'started' && admetoxContainer.status !== 'checking') {
    grok.shell.warning('ADMETox container has not started yet. Try again in a few seconds');
    grok.dapi.docker.dockerContainers.run(admetoxContainer.id);
    return null;
  }

  const params: RequestInit = {
    method: 'POST',
    headers: {
      'Accept': 'text/csv',
      'Content-type': 'text/csv'
    },
    body: csvString
  };

  const path = `/df_upload?models=${queryParams}&probability=${addProbability}`;
  try {
    const response = await grok.dapi.docker.dockerContainers.request(admetoxContainer.id, path, params);
    return response;
  } catch (error) {
    //grok.log.error(error);
    return null;
  }
}

export async function addCalculationsToTable(viewTable: DG.DataFrame) {
  openModelsDialog(await getSelected(), viewTable, async (selected: any, includeProbabilities: boolean, smilesCol: DG.Column) => {
    await grok.dapi.userDataStorage.postValue(_STORAGE_NAME, _KEY, JSON.stringify(selected));
    selected = await getSelected();
    await performChemicalPropertyPredictions(smilesCol, viewTable, selected.join(','), includeProbabilities);
  });
}

export async function performChemicalPropertyPredictions(molColumn: DG.Column, viewTable: DG.DataFrame, properties: string, includeProbabilities: boolean) {
  const progressIndicator = DG.TaskBarProgressIndicator.create('Running ADMETox...');
  const smilesColumn = await extractSmilesColumn(molColumn);
  const csvString = DG.DataFrame.fromColumns([smilesColumn]).toCsv();
  progressIndicator.update(10, 'Getting predictions...');

  try {
    const admetoxResults = await runAdmetox(csvString, properties, String(includeProbabilities));
    progressIndicator.update(80, 'Results are ready');
    const table = admetoxResults ? DG.DataFrame.fromCsv(admetoxResults) : null;
    table ? addResultColumns(table, viewTable) : grok.log.warning('');
  } catch (e) {
    //grok.log.error(e);
  } finally {
    progressIndicator.close();
  }
}

async function extractSmilesColumn(molColumn: DG.Column): Promise<DG.Column> {
  const isSmiles = molColumn?.getTag(DG.TAGS.UNITS) === DG.UNITS.Molecule.SMILES;
  const smilesList: string[] = new Array<string>(molColumn.length);
  for (let rowIndex = 0; rowIndex < molColumn.length; rowIndex++) {
    let el: string = molColumn?.get(rowIndex);
    if (!isSmiles) {
      try {
        el = await grok.functions.call('Chem:convertMolNotation', {
          molecule: el,
          sourceNotation: DG.chem.Notation.Unknown,
          targetNotation: DG.chem.Notation.Smiles
        });
      } catch {
        el = '';
      }
    }

    smilesList[rowIndex] = el;
  }
  const smilesColumn: DG.Column = DG.Column.fromStrings('smiles', smilesList);
  return smilesColumn;
}

export function addColorCoding(table: DG.DataFrame, columnNames: string[]) {
  const tv = grok.shell.tableView(table.name);
  if (!tv)
    return;
  
  const nonSpecificModels = getNonSpecificModels(properties);

  for (const columnName of columnNames) {
    const col = tv.grid.col(columnName);
    const isNonSpecific = nonSpecificModels.some((model) => columnName.includes(model));
    if (col) {
      col.isTextColorCoded = true;
      col.column!.tags[DG.TAGS.COLOR_CODING_TYPE] = 'Linear';
      col.column!.tags[DG.TAGS.COLOR_CODING_LINEAR] = isNonSpecific
        ? `[${DG.Color.red}, ${DG.Color.green}]`
        : `[${DG.Color.orange}, ${DG.Color.purple}]`;
    }
  }
}

function getNonSpecificModels(properties: any): string[] {
  return Object.keys(properties)
    .flatMap(property => properties[property]['models'])
    .filter(obj => obj['specific'] !== true)
    .map(obj => obj['name']);
}

export async function addAllModelPredictions(molCol: DG.Column, viewTable: DG.DataFrame) {
  const queryParams = getQueryParams();
  try {
    await performChemicalPropertyPredictions(molCol, viewTable, queryParams, false);
  } catch (e) {
    //grok.log.error(e);
  }
}

function getQueryParams(): string {
  return Object.keys(properties)
    .flatMap(property => properties[property]['models'])
    .filter(obj => obj['skip'] !== true)
    .map(obj => obj['name'])
    .join(',');
}

function addResultColumns(table: DG.DataFrame, viewTable: DG.DataFrame) {
  if (table.columns.length === 0)
    return;

  if (table.rowCount > viewTable.rowCount)
    table.rows.removeAt(table.rowCount - 1);

  const modelNames: string[] = table.columns.names();
  const updatedModelNames: string[] = [];

  for (let i = 0; i < modelNames.length; ++i) {
    let column: DG.Column = table.columns.byName(modelNames[i]);
    const newColumnName = viewTable.columns.getUnusedName(modelNames[i]);
    column.name = newColumnName;
    column.setTag(DG.TAGS.FORMAT, '0.00');

    for (const key in models) {
      if (modelNames[i].includes(key)) {
        column.setTag(DG.TAGS.DESCRIPTION, models[key]);
        break;
      }
    }

    updatedModelNames[i] = newColumnName;
    viewTable.columns.add(column);
  }

  addColorCoding(viewTable, updatedModelNames);
}

export function getModelsSingle(smiles: string): DG.Accordion {
  const acc = ui.accordion('ADME/Tox');

  const update = async (result: HTMLDivElement, modelName: string) => {
    const queryParams = properties[modelName]['models']
      .filter((model: any) => !model.skip)
      .map((model: any) => model.name);

    if (smiles === 'MALFORMED_INPUT_VALUE') {
      result.appendChild(ui.divText('The molecule is possibly malformed'));
      return;
    }

    result.appendChild(ui.loader());
    try {
      const csvString = await runAdmetox(`smiles\n${smiles}`, queryParams.join(','), 'false');
      ui.empty(result);
      const table = DG.DataFrame.fromCsv(csvString!);
      const map: { [_: string]: any } = {};
      for (const model of queryParams) {
        map[model] = Number(table.col(model)?.get(0)).toFixed(2);
      }
      result.appendChild(ui.tableFromMap(map));
    } catch (e) {
      result.appendChild(ui.divText('Couldn\'t analyse properties'));
      //console.log(e);
    }
  };

  for (const property of Object.keys(properties)) {
    const models = properties[property]['models'];
    const shouldAddProperty = models.some((model: any) => !model.skip);

    if (shouldAddProperty) {
      const result = ui.div();
      acc.addPane(property, () => {
        update(result, property);
        return result;
      }, false);
    }
  }

  return acc;
}

async function openModelsDialog(selected: any, viewTable: DG.DataFrame, onOK: any): Promise<void> {
  const tree = ui.tree();
  tree.root.classList.add('admetox-dialog-tree');

  const groups: { [_: string]: any } = {};
  const items: DG.TreeViewNode[] = [];
  const selectedModels: { [_: string]: string } = {};

  const checkAll = (val: boolean) => {
    for (const g of Object.values(groups))
      g.checked = val;
    for (const i of items)
      i.checked = val;
  };

  const selectAll = ui.label('All', {classes: 'd4-link-label', onClick: () => checkAll(true)});
  selectAll.classList.add('admetox-dialog-select-all');
  const selectNone = ui.label('None', {classes: 'd4-link-label', onClick: () => checkAll(false)});
  const countLabel = ui.label('0 checked');
  countLabel.classList.add('admetox-dialog-count');

  const keys = Object.keys(properties);
  for (const groupName of keys) {
    const group = tree.group(groupName, null, false);
    group.enableCheckBox();
    groups[groupName] = group;

    group.checkBox!.onchange = (_e) => {
      countLabel.textContent = `${items.filter((i) => i.checked).length} checked`;
      if (group.checked) 
        selectedModels[group.text] = group.text;
      group.items.filter((i) => {
        if (i.checked) 
          selectedModels[i.text] = group.text;
      })
    };

    for (const property of properties[groupName]['models']) {
      if (property['skip'] === false) {
        const item = group.item(property['name'], property);
        item.enableCheckBox(selected.includes(property['name']));
        items.push(item);
        
        item.checkBox!.onchange = (_e) => {
          countLabel.textContent = `${items.filter((i) => i.checked).length} checked`;
          if (item.checked) 
            selectedModels[item.text] = groupName;
        };
      }
    }

    if (group.items.length === 0) 
      group.remove(); 
    
    checkAll(false);
  }

  const saveInputHistory = (): any => {
    let resultHistory: { [_: string]: any } = {};
    const modelNames = Object.keys(selectedModels);
    for (const modelName of modelNames) 
      resultHistory[modelName] = selectedModels[modelName];
    return resultHistory;
  }

  const loadInputHistory = (history: any): void => {
    checkAll(false);
    const keys: string[] = Object.keys(history);
    for (const key of keys) {
      groups[history[key]].items.filter(function (i: any) {
        if (i.text === key) 
          i.checked = true;
      })
      if (key === history[key])
        groups[history[key]].checked = true;
    }
    countLabel.textContent = `${keys.length} checked`;
  }
  
  let smilesCol = viewTable.columns.bySemType(DG.SEMTYPE.MOLECULE);
  const molInput = ui.columnInput('Molecules', viewTable, smilesCol, async (col: DG.Column) => {
    smilesCol = col;
  }, {filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE} as ColumnInputOptions);
  molInput.root.classList.add('admetox-mol-input');
  const boolInput = ui.boolInput('Probability', false);
  boolInput.root.classList.add('admetox-bool-input');

  const dlg = ui.dialog('ADME/Tox');
  dlg
    .add(molInput)
    .add(ui.divH([selectAll, selectNone, countLabel]))
    .add(tree.root)
    .add(boolInput)
    .onOK(() => onOK(items.filter((i) => i.checked).map((i: any) => i.value['name']), boolInput.value, smilesCol))
    .show()
    .history(
      () => saveInputHistory(),
      (x) => loadInputHistory(x) 
    );
}

async function getSelected() : Promise<any> {
  const str = await grok.dapi.userDataStorage.getValue(_STORAGE_NAME, _KEY);
  let selected = (str != null && str !== '') ? JSON.parse(str) : [];
  return selected;
}