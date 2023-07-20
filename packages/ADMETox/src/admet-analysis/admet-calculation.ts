import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { _package } from '../package-test';
import { models, properties } from './const';
import { delay } from '@datagrok-libraries/utils/src/test';
import { ColumnInputOptions } from '@datagrok-libraries/utils/src/type-declarations';
import { DockerContainer, DockerContainersDataSource } from 'datagrok-api/dg';

const _STORAGE_NAME = 'admet_models';
const _KEY = 'selected';
const _COLUMN_NAME_STORAGE = 'column_names';

/**
 * Fetches the Admetox Docker container.
 * @returns {Promise<DockerContainer | undefined>} A promise that returns Admetox Docker container or undefined if not found.
 */
async function getAdmetoxContainer(): Promise<DockerContainer | undefined> {
  try {
    const dockerContainers: DockerContainersDataSource = await grok.dapi.docker.dockerContainers;
    return dockerContainers.filter('admetox').first();
  } catch (error) {
    console.error('Failed to get the Admetox container:', error);
    return undefined;
  }
}

/**
 * Sends a POST request to the Admetox server with CSV data and specific query parameters.
 *
 * @param {string} csvString - The CSV data to be sent to the server (structures).
 * @param {string} queryParams - The query parameters to be included in the request URL (model names).
 * @returns {Promise<string | null | undefined>} A promise that resolves to the server response or undefined if an error occurs.
 */
export async function accessServer(csvString: string, queryParams: string): Promise<string | null | undefined> {
  const admetDockerfile = await getAdmetoxContainer();

  if (!admetDockerfile) {
    console.error('Admetox container is not available.');
    return;
  }

  const params: RequestInit = {
    method: 'POST',
    headers: {
      'Accept': 'text/csv',
      'Content-type': 'text/csv'
    },
    body: csvString
  };

  const path = `/smiles/df_upload/?models=${queryParams}`;
  try {
    const response = await grok.dapi.docker.dockerContainers.request(admetDockerfile.id, path, params);
    return response;
  } catch (error) {
    console.error('Failed to access the server:', error);
    return;
  }
}

/**
 * Attaches a tooltip handler to the DataGrid cells in the current TableView to show
 * additional information based on the cell's content and column.
 */
export function addTooltip() {
  const tableView = grok.shell.tv;

  tableView.grid.onCellTooltip((cell, x, y) => {
    const col = cell.tableColumn?.name;

    if (cell.isTableCell && col && models[col]) {
      const keys = Object.keys(models[col]);
      const rowValue = tableView.dataFrame.get(cell.gridColumn.name, cell.gridRow);

      let val = '';
      keys.some((range, i) => {
        const nextRange = keys[i + 1];
        const isLastRange = i === keys.length - 1;

        if (nextRange && rowValue >= +range && rowValue <= +nextRange) {
          val = models[col][range];
          return true;
        } else if (isLastRange) {
          val = models[col][range];
          return true;
        }
      });

      ui.tooltip.show(ui.divV([ui.div(val)]), x, y);
      return true;
    }
  });
}

/**
 * Applies color coding to the specified columns in the current TableView.
 * The color coding is based on a conditional rule.
 *
 * @param {string[]} columnNames - An array of column names to which color coding will be applied.
 */
export function addColorCoding(columnNames: string[]) {
  const tv = grok.shell.tv;
  for (const columnName of columnNames) {
    tv.grid.col(columnName)!.isTextColorCoded = true;
    tv.grid.col(columnName)!.column!.tags[DG.TAGS.COLOR_CODING_TYPE] = 'Conditional';
    tv.grid.col(columnName)!.column!.tags[DG.TAGS.COLOR_CODING_CONDITIONAL] = `{"<=0.5":"#e87c79",">0.5":"#43b579"}`;
  }  
}

/**
 * Adds form-based results from the Admetox server to the specified DataFrame view.
 * The form properties and corresponding models are fetched from the 'properties' object.
 *
 * @param {DG.Column} smilesCol - The column containing SMILES data to be sent to the server.
 * @param {DG.DataFrame} viewTable - The DataFrame view to which the results will be added.
 */
export async function addForm(smilesCol: DG.Column, viewTable: DG.DataFrame) {
  const queryParams = Object.keys(properties)
    .flatMap(property => properties[property]['models'])
    .filter(obj => obj['skip'] !== true)
    .map(obj => obj['name'])
    .join(',');
  const csvString = await accessServer(DG.DataFrame.fromColumns([smilesCol]).toCsv(), queryParams);
  const table = processCsv(csvString);
  addResultColumns(table, viewTable);
}

/**
 * Retrieves the selected models and performs predictions for ADME/Tox properties on a DataFrame column.
 *
 * @param {DG.DataFrame} viewTable - The DataFrame containing the molecules.
 * @param {DG.Column} column - The column representing the SMILES strings of the molecules.
 * @returns {Promise<DG.DataFrame>} A promise that resolves to a DataFrame with ADME/Tox predictions.
 */
async function getPredictions(viewTable: DG.DataFrame, column: DG.Column): Promise<DG.DataFrame> {
  const selected = await getSelected();

  return new Promise<DG.DataFrame>((resolve, reject) => {
    openModelsDialog(selected, column, async (selected: any) => {
      await grok.dapi.userDataStorage.postValue(_STORAGE_NAME, _KEY, JSON.stringify(selected));
      if (selected.length === 0) {
        grok.shell.warning('No models have been selected!');
        reject('No models selected');
        return;
      }
      const queryParams = selected.join(',');

      const colName = await grok.dapi.userDataStorage.getValue(_COLUMN_NAME_STORAGE, _KEY);
      const smilesCol = viewTable.columns.byName(colName);
      const malformedIndexes = await grok.functions.call('Chem:_getMolSafe', {molecules: smilesCol});
      const smilesColFiltered = DG.Column.fromStrings(smilesCol.name, Array.from(smilesCol.values()).filter((_, index) => !malformedIndexes.includes(index)));

      if (smilesCol.length > 10000) {
        const dialog = ui.dialog({ title: 'Proceed with computations' });
        dialog
          .add(
            ui.divText(
              `Performing computations could potentially consume a significant amount of time.
               Do you want to continue?`
            )
          )
          .addButton('YES', async () => {
            dialog.close();
            const result = await addColumnsAndProcessInBatches(smilesColFiltered, selected);
            resolve(result);
          })
          .show();
      } else {
        const result = await addColumnsAndProcessInBatches(smilesColFiltered, selected);
        resolve(result);
      }
    });
  });
}

/**
 * Fetches ADME/Tox predictions for the specified DataFrame column and adds the result columns to the DataFrame.
 *
 * @param {DG.DataFrame} viewTable - The DataFrame containing the molecules.
 * @param {DG.Column} column - The column representing the SMILES strings of the molecules.
 * @returns {Promise<void>} A promise that resolves when the predictions are added to the DataFrame.
 */
export async function addPredictions(viewTable: DG.DataFrame, column: DG.Column) {
  const df = await getPredictions(viewTable, column);
  addResultColumns(df, viewTable);
}

async function addColumnsAndProcessInBatches(smilesCol: DG.Column, queryParams: string): Promise<DG.DataFrame> {
  return await processColumnInBatches(smilesCol, 100, queryParams);
}

function addResultColumns(table: DG.DataFrame, viewTable: DG.DataFrame, malformedIndexes?: any[]): void {
  if (table.columns.length > 0) {
    if (malformedIndexes)
      malformedIndexes.map((index) => table.rows.insertAt(index));
    const modelNames: string[] = table.columns.names()
    for (let i = 0; i < modelNames.length; ++i) {
      let column: DG.Column = table.columns.byName(modelNames[i]);
      column.name = viewTable.columns.getUnusedName(modelNames[i]);
      column = column.convertTo("double");
      viewTable.columns.add(column);
    }
    addColorCoding(modelNames);
    addTooltip();
  }
}

function processCsv(csvString: string | null | undefined): DG.DataFrame {
  csvString = csvString!.replaceAll('"', '');
  const table = DG.DataFrame.fromCsv(csvString);
  table.rows.removeAt(table.rowCount - 1);
  const removeRow = Array.from(table.row(table.rowCount - 1).cells).some((cell: DG.Cell) => cell.value == '');
  if (removeRow)
    table.rows.removeAt(table.rowCount - 1);
  const modelNames: string[] = [];
  const prevColNames = table.columns.names();
  for (let i = 0; i < prevColNames.length; ++i) {
    modelNames[i] = table.get(prevColNames[i], 0);
  }
  table.rows.removeAt(0);
  for (let i = 0; i < prevColNames.length; ++i) {
    const column: DG.Column = table.columns.byName(prevColNames[i]);
    column.name = column.dataFrame.columns.getUnusedName(modelNames[i]);
  }
  return table;
}

/**
 * Creates and returns an accordion with results for ADME/Tox models for a single molecule.
 *
 * @param {DG.SemanticValue<string>} smiles - The SMILES representation of the molecule.
 * @returns {DG.Accordion} An accordion control containing results for ADME/Tox models.
 */
export function getModelsSingle(smiles: DG.SemanticValue<string>): DG.Accordion {
  const acc = ui.accordion('ADME/Tox');
  const accPanes = document.getElementsByClassName('d4-accordion-pane-header');
  for (let i = 0; i < accPanes.length; ++i) {
    if (accPanes[i].innerHTML === 'ADME/Tox') 
      accPanes[i].append(ui.icons.help(() => {window.open('https://github.com/datagrok-ai/public/blob/1ef0f6c050754a432640301139f41fcc26e2b6c3/packages/ADMETox/README.md', '_blank')}));
  }
  const update = async (result: HTMLDivElement, modelName: string) => {
    const queryParams = properties[modelName]['models'].map((model: any) => model['name']);
    if (smiles.value === 'MALFORMED_INPUT_VALUE') {
      result.appendChild(ui.divText('The molecule is possibly malformed'));
    } else {
      result.appendChild(ui.loader());
      accessServer(
        `smiles
        ${smiles.value}`,
        queryParams.toString()
      ).catch((e: any) => {
        result.appendChild(ui.divText('Couldn\'t analyse properties'));
        console.log(e);
      }).then((csvString: any) => {
        ui.empty(result);
        const table = processCsv(csvString);
        const map: { [_: string]: any } = {};
        for (const model of queryParams)
          map[model] = Number(table.col(model)?.get(0)).toFixed(2);
  
          result.appendChild(ui.tableFromMap(map));
      }); 
    }
  };

  for (const property of Object.keys(properties)) {
    const result = ui.div();
    acc.addPane(property, () => {
      update(result, property);
      return result;
    }, false);
  }

  return acc;
}

/**
 * Opens a dialog for selecting models to apply on the specified SMILES column in the DataFrame view.
 *
 * @param {any} selected - An array containing the names of the initially selected models.
 * @param {DG.Column} smilesColumn - The column containing SMILES data.
 * @param {any} onOK - A function to be called when the 'OK' button is clicked, with the selected model names as an argument.
 * @returns {Promise<void>} A promise that resolves when the dialog is closed.
 */
async function openModelsDialog(selected: any, smilesColumn: DG.Column, onOK: any): Promise<void> {
  const tree = ui.tree();
  tree.root.style.maxHeight = '400px';
  tree.root.style.width = '200px';

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
  selectAll.style.marginLeft = '6px';
  selectAll.style.marginRight = '12px';
  const selectNone = ui.label('None', {classes: 'd4-link-label', onClick: () => checkAll(false)});

  const countLabel = ui.label('0 checked');
  countLabel.style.marginLeft = '24px';
  countLabel.style.display = 'inline-flex';

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
  
  const df = grok.shell.tv.dataFrame;
  await grok.dapi.userDataStorage.postValue(_COLUMN_NAME_STORAGE, _KEY, smilesColumn.name);
  const molInput = ui.columnInput('Molecules', df, smilesColumn, async (col: DG.Column) => {
    smilesColumn = col;
    await grok.dapi.userDataStorage.postValue(_COLUMN_NAME_STORAGE, _KEY, smilesColumn.name);
    //@ts-ignore
  }, {filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE && col.getTag(DG.TAGS.UNITS) === DG.UNITS.Molecule.SMILES} as ColumnInputOptions);
  molInput.root.style.marginLeft = '-70px';
  const dlg = ui.dialog('ADME/Tox');
  dlg
    .add(molInput)
    .add(ui.divH([selectAll, selectNone, countLabel]))
    .add(tree.root)
    .onOK(() => onOK(items.filter((i) => i.checked).map((i: any) => i.value['name'])))
    .show()
    .history(
      () => saveInputHistory(),
      (x) => loadInputHistory(x) 
    );
}

/**
 * Retrieves the selected models from the user data storage.
 *
 * @returns {Promise<any>} A promise that resolves to an array containing the selected models.
 */
async function getSelected() : Promise<any> {
  const str = await grok.dapi.userDataStorage.getValue(_STORAGE_NAME, _KEY);
  let selected = (str != null && str !== '') ? JSON.parse(str) : [];
  return selected;
}

let resultDf: DG.DataFrame;
let entered: boolean = false;
async function processBatch(batch: any, queryParams: string) {
  if (terminated) {
    return;
  }
  const [csvString] = await Promise.all([
    accessServer(DG.DataFrame.fromColumns([DG.Column.fromStrings('smiles', batch)]).toCsv(), queryParams),
    new Promise((resolve) => setTimeout(resolve, 1000))]);
  if (!entered) {
    resultDf = processCsv(csvString);
    entered = true;
  } else {
    const table = processCsv(csvString);
    resultDf.append(table, true);
  }
}

class Semaphore {
  concurrency: number;
  current: number;
  queue: (() => void)[];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.concurrency) {
      this.current++;
      return Promise.resolve();
    } else {
      return new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve?.();
    }
  }
}

let terminated = false;

async function processColumnInBatches(column: DG.Column, batchSize = 100, queryParams: string): Promise<DG.DataFrame> {
  //@ts-ignore
  const progressIndicator = DG.TaskBarProgressIndicator.create('Evaluating predictions...', {cancelable: true});
  //@ts-ignore
  progressIndicator.onCanceled.subscribe(() => {
    progressIndicator.close();
    terminated = true;
  });

  const semaphore = new Semaphore(10);

  const totalBatches = Math.ceil(column.length / batchSize);
  let processedBatches = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (terminated) {
      break; // Stop processing batches if terminated
    }

    await semaphore.acquire();

    const start = batchIndex * batchSize;
    const end = start + batchSize;
    const batch = Array.from(column.values()).slice(start, end);

    processBatch(batch, queryParams)
      .then(() => {
        processedBatches++;
        const percent = (processedBatches / totalBatches) * 100;
        progressIndicator.update(percent, `${percent.toFixed(2)}% is evaluated...`);
        semaphore.release();
      })
      .catch(error => {
        console.error('Error processing batch:', error);
        semaphore.release();
      });
  }

  while (processedBatches < totalBatches) {
    if (terminated) {
      break; // Stop waiting for batches if terminated
    }
    await delay(100);
  }

  progressIndicator.close();
  return resultDf;
}
