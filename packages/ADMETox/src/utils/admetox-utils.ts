import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { _package } from '../package-test';
import { ColumnInputOptions } from '@datagrok-libraries/utils/src/type-declarations';
import '../css/admetox.css';
import { PieChartCellRenderer } from '../../../PowerGrid/src/sparklines/piechart';
import { STORAGE_NAME, KEY, TEMPLATES_FOLDER, Model, ModelColoring, Subgroup, Template } from './constants';

export let DEFAULT_LOWER_VALUE = 0.8;
export let DEFAULT_UPPER_VALUE = 1.0;
export let DEFAULT_APPLICABILITY_VALUE = 0.43;
export let properties: any;

async function getAdmetoxContainer() {
  const admetoxContainer = await grok.dapi.docker.dockerContainers.filter('admetox').first();
  return admetoxContainer;
}

async function startAdmetoxContainer(containerId: string) {
  grok.shell.warning('ADMETox container has not started yet. Try again in a few seconds');
  grok.dapi.docker.dockerContainers.run(containerId);
}

async function sendRequestToContainer(containerId: string, path: string, params: RequestInit): Promise<string | null> {
  try {
    const response = await grok.dapi.docker.dockerContainers.request(containerId, path, params);
    return response;
  } catch (error) {
    //grok.log.error(error);
    return null;
  }
}

export async function runAdmetox(csvString: string, queryParams: string, addProbability: string): Promise<string | null> {
  const admetoxContainer = await getAdmetoxContainer();
  if (!admetoxContainer || (admetoxContainer.status !== 'started' && admetoxContainer.status !== 'checking')) {
    await startAdmetoxContainer(admetoxContainer?.id);
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
  return await sendRequestToContainer(admetoxContainer.id, path, params);
}

async function setProperties() {
  if (properties) return;
  const items = await grok.dapi.files.list(TEMPLATES_FOLDER);
  const fileName = items[0].fileName;
  const propertiesJson = await grok.dapi.files.readAsText(`${TEMPLATES_FOLDER}/${fileName}`);
  properties = JSON.parse(propertiesJson);
}

export async function addCalculationsToTable(viewTable: DG.DataFrame) {
  openModelsDialog(await getSelected(), viewTable, async (selected: any, smilesCol: DG.Column) => {
    await grok.dapi.userDataStorage.postValue(STORAGE_NAME, KEY, JSON.stringify(selected));
    selected = await getSelected();
    await performChemicalPropertyPredictions(smilesCol, viewTable, selected.join(','));
  });
}

export async function performChemicalPropertyPredictions(molColumn: DG.Column, viewTable: DG.DataFrame, properties: string) {
  const progressIndicator = DG.TaskBarProgressIndicator.create('Running ADMETox...');
  const smilesColumn = await extractSmilesColumn(molColumn);
  const csvString = DG.DataFrame.fromColumns([smilesColumn]).toCsv();
  progressIndicator.update(10, 'Predicting...');

  try {
    const admetoxResults = await runAdmetox(csvString, properties, 'true');
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

function applyColorCoding(col: DG.GridColumn, model: Model): void {
  if (!model.coloring) return;
  col.isTextColorCoded = true;
  const { type, min, max, colors } = model.coloring;
  if (type === 'Linear') {
    col.column!.tags[DG.TAGS.COLOR_CODING_TYPE] = 'Linear';
    col.column!.tags[DG.TAGS.COLOR_CODING_LINEAR] = colors;
    col.column!.tags[DG.TAGS.COLOR_CODING_SCHEME_MIN] = min;
    col.column!.tags[DG.TAGS.COLOR_CODING_SCHEME_MAX] = max;
  } else if (type === 'Conditional') {
    col.column!.tags[DG.TAGS.COLOR_CODING_TYPE] = 'Conditional';
    col.column!.tags[DG.TAGS.COLOR_CODING_CONDITIONAL] = createConditionalColoringString(model.coloring);
  }
}

export function addColorCoding(table: DG.DataFrame, columnNames: string[]): void {
  const tv = grok.shell.tableView(table.name);
  if (!tv) return;

  for (const columnName of columnNames) {
    const col = tv.grid.col(columnName);
    const model = properties.subgroup.flatMap((subg: Subgroup) => subg.models)
      .find((model: Model) => columnName.includes(model.name));
    if (model) applyColorCoding(col!, model);
  }
}

function createConditionalColoringString(coloring: ModelColoring): string {
  const conditionalColors = Object.entries(coloring).slice(1);
  return `{${conditionalColors.map(([range, color]) => `"${range}":"${color}"`).join(",")}}`;
}

export async function addAllModelPredictions(molCol: DG.Column, viewTable: DG.DataFrame) {
  const queryParams = await getQueryParams();
  try {
    await performChemicalPropertyPredictions(molCol, viewTable, queryParams);
  } catch (e) {
    //grok.log.error(e);
  }
}

export async function getQueryParams(): Promise<string> {
  await setProperties();
  return properties.subgroup.flatMap((subg: Subgroup) => subg.models)
      .map((model: Model) => model.name).join(',');
}

function createPieSettings(columnNames: string[], properties: any, probabilities: { [key: string]: number[] }): any {
  const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
  let sectors: any[] = [];
  let sectorColorIndex = 0;

  for (const subgroup of properties.subgroup) {
    const sector: any = {
      sectorColor: colors[sectorColorIndex],
      subsectors: []
    };
    
    for (const model of subgroup.models) {
      const modelName = columnNames.find((name: string) => name.includes(model.name));
      let weightProperty;
      if (modelName) {
        let { min, max } = model;
        if (model.properties) {
          const directionProperty = model.properties.find((prop: any) => prop.property.name === 'direction');
          weightProperty = model.properties.find((prop: any) => prop.property.name === 'weight');
          if (directionProperty && directionProperty.object.direction === 'Lower is better')
            [min, max] = [max, min]; // Swap min and max
        }
          
        sector.subsectors.push({
          name: modelName,
          lowThreshold: min,
          highThreshold: max,
          weight: weightProperty.object.weight,
          applicability: DEFAULT_APPLICABILITY_VALUE,
          probabilities: Object.entries(probabilities)
            .filter(([key, value]) => key.includes(modelName))
            .reduce((acc, [key, value]) => acc.concat(value), [] as number[])
        });
      }
    }

    if (sector.subsectors.length > 0)
      sectors.push(sector);

    sectorColorIndex = (sectorColorIndex + 1) % colors.length;  
  }
    
  return {
    sectors: {
      lowerBound: DEFAULT_LOWER_VALUE,
      upperBound: DEFAULT_UPPER_VALUE,
      values: '',
      sectors
    }
  };
}

export function addSparklines(table: DG.DataFrame, columnNames: string[], probabilities: { [key: string]: number[] }): void {
  const tv = grok.shell.tableView(table.name);
  if (!tv) return;

  const pie = tv.grid.columns.add({ cellType: 'piechart' });
  pie.settings = { columnNames: columnNames };
  pie.settings = createPieSettings(columnNames, properties, probabilities);
}

function getTooltipContent(model: any, value: any): string {
  if (!model) return '';
  const rangesProp = model.properties.find((prop: any) => prop.property.name === 'ranges');
  let tooltipContent = '';
  if (model && rangesProp) {
    const ranges = rangesProp.object.ranges;
    for (const rangeKey in ranges) {
      const rangeParts = rangeKey.split(' ');
      const rangeType = rangeParts.includes('-') ? '-' : rangeParts[0];
      const rangeStart = rangeParts.includes('-') ? parseFloat(rangeParts[0]) : parseFloat(rangeParts[1]);
      const rangeEnd = parseFloat(rangeParts[2]);
      if ((rangeType === '-' && value >= rangeStart && value <= rangeEnd) ||
        (rangeType === '<' && value < rangeStart) ||
        (rangeType === '>' && value > rangeStart)) {
        tooltipContent += `${ranges[rangeKey as keyof typeof ranges]}\n`;
        break;
      }
    }
  } else {
    const direction = model.properties.find((prop: any) => prop.property.name === 'direction');
    const interpretation = direction ? direction.object.direction : '';
    tooltipContent += `${interpretation}\n`;
  }
  return tooltipContent;
}

export function addCustomTooltip(table: string): void {
  const view = grok.shell.tableView(table);
  view.grid.onCellTooltip((cell, x, y) => {
    if (cell.isTableCell) {
      const subgroup = cell.tableColumn!.name;
      const value = cell.cell.value;
      const model = properties.subgroup.flatMap((subg: Subgroup) => subg.models)
        .find((model: Model) => subgroup.includes(model.name));
      const tooltipContent = getTooltipContent(model, value);
      ui.tooltip.show(ui.divV([
        ui.divText(tooltipContent)
      ]), x, y);
      return true;
    }
  });
}

function updateColumnProperties(column: DG.Column, model: any, viewTable: DG.DataFrame): void {
  const newColumnName = viewTable.columns.getUnusedName(column.name);
  column.name = newColumnName;
  column.setTag(DG.TAGS.FORMAT, '0.00');
  column.setTag(DG.TAGS.DESCRIPTION, model.properties.find((prop: any) => prop.property.name === 'description').object.description);
  column.setTag(DG.TAGS.UNITS, model.properties.find((prop: any) => prop.property.name === 'units').object.units);
}

export function addResultColumns(table: DG.DataFrame, viewTable: DG.DataFrame): void {
  if (table.columns.length === 0) return;

  if (table.rowCount > viewTable.rowCount)
    table.rows.removeAt(table.rowCount - 1);

  const modelNames: string[] = table.columns.names();
  const updatedModelNames: string[] = [];
  const models = properties.subgroup.flatMap((subgroup: any) => subgroup.models.map((model: any) => model));
  const probabilities: { [key: string]: number[] } = {};

  for (let i = 0; i < modelNames.length; ++i) {
    if (modelNames[i].includes('probability')) {
      probabilities[modelNames[i - 1]] = table.columns.byName(modelNames[i]).toList();
      continue;
    }
    let column: DG.Column = table.columns.byName(modelNames[i]);
    for (const model of models) {
      if (model.name === modelNames[i]) {
        updateColumnProperties(column, model, viewTable);
        break;
      }
    }
    updatedModelNames.push(column.name);
    viewTable.columns.add(column);
  }

  addColorCoding(viewTable, updatedModelNames);
  addSparklines(viewTable, updatedModelNames, probabilities);
  addCustomTooltip(viewTable.name);
}

async function createPieChartPane(semValue: DG.SemanticValue): Promise<HTMLElement> {
  const view = grok.shell.tableView(semValue.cell.dataFrame.name);
  const gridCol = view.grid.col(semValue.cell.column.name);
  const gridCell = view.grid.cell(semValue.cell.column.name, semValue.cell.rowIndex);
  const container = ui.div();
  const params = await getQueryParams();
  const result = await runAdmetox(`smiles\n${semValue.cell.value}`, params, 'true');
  const probabilities: { [key: string]: number[] } = {};
  const columns = Array.from(DG.DataFrame.fromCsv(result!).columns);
  for (let i = 0; i < columns.length; ++i) {
    if (columns[i].name.includes('probability'))
      probabilities[columns[i].name] = columns[i].toList();
  }
  const pieSettings = createPieSettings(params.split(','), properties, probabilities);
  pieSettings.sectors.values = result!;
  gridCol!.settings = pieSettings;
  const canvas = ui.canvas();
  canvas.width = 300;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const pieChartRenderer = new PieChartCellRenderer();
      
  //@ts-ignore
  pieChartRenderer.render(ctx!, 0, 0, canvas.width, canvas.height, gridCell, DG.GridCellStyle.create());
  container.appendChild(canvas);
  return container;
}

export async function getModelsSingle(smiles: string, semValue: DG.SemanticValue): Promise<DG.Accordion> {
  const acc = ui.accordion('ADME/Tox');
  await setProperties();
  const update = async (result: HTMLDivElement, modelName: string) => {
    const queryParams = properties.subgroup.find((subg: any) => subg.name === modelName)
      ['models'].map((model: any) => model.name);

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

  for (const subgroup of properties.subgroup) {
    const result = ui.div();
    acc.addPane(subgroup.name, () => {
      update(result, subgroup.name);
      return result;
    }, false);
  }

  const result = ui.div();
  acc.addPane('Summary', () => {
    result.append(ui.loader());
    try {
      createPieChartPane(semValue).then((canvas) => {
        canvas.style.marginLeft = '-70px';
        ui.empty(result);
        result.appendChild(canvas);
      });
    } catch (error) {
      ui.empty(result);
      result.appendChild(ui.divText('Error creating pie chart'));
      console.error(error);
    }
    return result;
  }, false);


  return acc;
}

function createInputForProperty(property: any) {
  const object = property.property.inputType === DG.InputType.Map ? {} : property.object;
  const prop = DG.Property.fromOptions(property.property);
  const input = DG.InputBase.forProperty(prop, object);
  input.enabled = property.property.enable;
  const key = property.property.name as keyof typeof property.object;
  input.value = property.object[key];
  input.addCaption('');
  input.onChanged(() => {
    property.object[key] = input.value;
  });
  return input.root;
}

function createConditionalInput(coloring: ModelColoring) {
  const conditionalColors = Object.entries(coloring).slice(1);
  const conditionalColoring = `{${conditionalColors.map(([range, color]) => `"${range}":"${color}"`).join(",")}}`;
  return ui.patternsInput(JSON.parse(conditionalColoring));
}

function createLinearInput(coloring: ModelColoring) {
  const linearInput = ui.schemeInput(JSON.parse(coloring.colors!) as number[]);
  const minInput = ui.intInput('min', coloring.min!);
  const maxInput = ui.intInput('max', coloring.max!);
  linearInput.removeChild(linearInput.firstChild!);
  minInput.root.style.marginLeft = '-113px';
  maxInput.root.style.marginLeft = '-110px';
  const div = ui.divV([linearInput, minInput, maxInput]);
  return div;
}

export function createTabControl(template: Template, selected: string[]) {
  const tabsV = ui.tabControl(null, true);

  template.subgroup.forEach((subgroup: any) => {
    subgroup.models.forEach((model: any) => {
      const inputs = ui.divV([]);
      inputs.classList.add('admetox-input-form');
      const properties = model.properties;
      const coloring = model.coloring;

      properties.forEach((p: any) => {
        const input = createInputForProperty(p);
        inputs.appendChild(input);
      });

      if (coloring.type === 'Conditional') {
        const conditionalInput = createConditionalInput(coloring);
        inputs.appendChild(conditionalInput);
      } else if (coloring.type === 'Linear') {
        const linearInput = createLinearInput(coloring);
        inputs.appendChild(linearInput);
      }
      tabsV.addPane(model.name, () => inputs);
    });
  });

  tabsV.panes.forEach((pane) => {
    const functionCheck = ui.boolInput('', false, (v: boolean) => {
    if (v)
      selected.push(pane.name);
    else
      selected.splice(selected.indexOf(pane.name), 1);
    });
    pane.header.insertBefore(functionCheck.root, pane.header.firstChild);
    pane.header.classList.add('admetox-pane-header');
  });

  return { tabsV, selected };
}

async function openModelsDialog(selected: any, viewTable: DG.DataFrame, onOK: any): Promise<void> {
  let selectedItems: string[] = [];
  await setProperties();
  const items = (await grok.dapi.files.list('System:AppData/Admetox/templates')).map((file) => file.fileName.split('.')[0]);
  const result = createTabControl(properties, selectedItems);
  const tabsV = result.tabsV;
  selectedItems = result.selected;
  const templates = ui.choiceInput('Template', items[0], items);
  const lowerBound = ui.floatInput('Lower bound', DEFAULT_LOWER_VALUE, (value: number) => DEFAULT_LOWER_VALUE = value);
  const upperBound = ui.floatInput('Upper bound', DEFAULT_UPPER_VALUE, (value: number) => DEFAULT_UPPER_VALUE = value);
  const applicability = ui.floatInput('Applicability range', DEFAULT_APPLICABILITY_VALUE, (value: number) => DEFAULT_APPLICABILITY_VALUE = value);
  let templateCopy = properties;
  const host = ui.div([]);
  
  host.appendChild(tabsV.root);

  let smilesCol = viewTable.columns.bySemType(DG.SEMTYPE.MOLECULE);
  const molInput = ui.columnInput('Molecules', viewTable, smilesCol, async (col: DG.Column) => {
    smilesCol = col;
  }, {filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE} as ColumnInputOptions);

  const dlg = ui.dialog('ADME/Tox');
  dlg
    .add(molInput)
    .add(templates)
    .add(lowerBound)
    .add(upperBound)
    .add(applicability)
    .add(host)
    .onOK(() => {
      properties = templateCopy;
      onOK(selectedItems, smilesCol);
    })
    .show()
}

async function getSelected() : Promise<any> {
  const str = await grok.dapi.userDataStorage.getValue(STORAGE_NAME, KEY);
  let selected = (str != null && str !== '') ? JSON.parse(str) : [];
  return selected;
}