/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import { fromByteArray } from 'base64-js';

import '@datagrok-libraries/bio/src/types/ngl'; // To enable import from the NGL module declared in bio lib
import {GridSize, IAutoDockService} from '@datagrok-libraries/bio/src/pdb/auto-dock-service';
import {BiostructureData, BiostructureDataJson} from '@datagrok-libraries/bio/src/pdb/types';

import {AutoDockApp, AutoDockDataType} from './apps/auto-dock-app';
import {_runAutodock, AutoDockService, _runAutodock2} from './utils/auto-dock-service';
import {_package, TARGET_PATH, CACHED_DOCKING, BINDING_ENERGY_COL, POSE_COL, 
  PROPERTY_DESCRIPTIONS, BINDING_ENERGY_COL_UNUSED, POSE_COL_UNUSED, setPose, setAffinity, ERROR_COL_NAME, ERROR_MESSAGE,
  ADCP_PROPERTY_DESCRIPTIONS,
  CACHED_ADCP} from './utils/constants';
import { _demoDocking } from './demo/demo-docking';
import { AdcpApp, AdcpDataType } from './apps/adcp-app';

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

// -- Services & Helpers --

//name: getAutoDockService
//output: object result
export async function getAutoDockService(): Promise<IAutoDockService> {
  const resSvc: IAutoDockService = await AutoDockService.getSvc();
  return resSvc;
}

// -- Test apps --

//name: autoDockApp
export async function autoDockApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('AutoDock app...');
  try {
    const app = new AutoDockApp('autoDockApp');
    await app.init();
  } finally {
    pi.close();
  }
}

// -- AutoDock --

//name: runAutodock
//input: file receptor
//input: file ligand
//input: int x
//input: int y
//input: int z
//output: dataframe result
export async function runAutodock(
  receptor: DG.FileInfo, ligand: DG.FileInfo, x: number, y: number, z: number,
): Promise<DG.DataFrame | null> {
  const npts = new GridSize(x, y, z);
  return await _runAutodock(receptor, ligand, npts);
}

//name: runAutodock2
// //input: dataframe df
// //input: column molCol { semType: Molecule }
// //input: file receptorFi { optional: true }
export async function runAutodock2(): Promise<void> {
  const [csv, receptorPdb] = await Promise.all([
    grok.functions.call(`${_package.name}:readAsText`,
      {file: 'CHEMBL2366517/ic50.mol.csv'}),
    grok.functions.call(`${_package.name}:readAsText`, {file: 'CHEMBL2366517/1bdq.pdb'}),
  ]);
  if (!csv || !receptorPdb)
    throw new Error('Empty input data');

  const df = DG.DataFrame.fromCsv(csv);
  const molCol: DG.Column<string> = df.getCol('molecule');

  return await _runAutodock2(molCol, receptorPdb);
}

//name: runAutodock3
//input: dataframe name
//input: column ligandCol
export async function runAutodock3(df: DG.DataFrame, ligandCol: DG.Column): Promise<void> {

}

//name: runAutodock4
//input: file receptor { caption: 'Receptor structure file' }
//input: file gridParams { nullable: true, caption: 'Grid parameters file' }
//input: dataframe ligandTable { caption: 'Ligand table' }
//input: column ligandColumn { caption: 'Ligand molecule column', semType: Molecule }
//editor: Docking:getRunAutodockFuncEditor
export async function runAutodock4(
  receptor: DG.FileInfo, gridParams: DG.FileInfo | null, ligandTable: DG.DataFrame, ligandColumn: DG.Column
): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('AutoDock load data ...');
  try {
    // AutoDock works with .pdb or .pdbqt files, both are text formats.
    const receptorData: BiostructureData = {
      binary: false,
      data: (new TextDecoder).decode(receptor.data) ?? (await grok.dapi.files.readAsText(receptor)),
      ext: receptor.extension,
      options: {name: receptor.name,},
    };

    const data: AutoDockDataType = {
      ligandDf: ligandTable,
      ligandMolColName: ligandColumn.name,
      receptor: receptorData,
    };

    const app = new AutoDockApp();
    await app.init(data);
  } finally {
    pi.close();
  }
}

//name: getConfigFiles
//output: list<string> configFiles
export async function getConfigFiles(): Promise<string[]> {
  const targetsFiles: DG.FileInfo[] = await grok.dapi.files.list(TARGET_PATH, true);
  return targetsFiles.filter(file => file.isDirectory).map(file => file.name);
}

export async function prepareAutoDockData(
  target: string, 
  table: DG.DataFrame, 
  ligandColumn: string, 
  confirmations: number
): Promise<AutoDockDataType> {
  const isGpfFile = (file: DG.FileInfo): boolean => file.extension === 'gpf';
  const configFile = (await grok.dapi.files.list(`${TARGET_PATH}/${target}`, true)).find(isGpfFile)!;
  const receptor = (await grok.dapi.files.list(`${TARGET_PATH}/${target}`)).find((file) => file.extension === 'pdbqt')!;

  const receptorData: BiostructureData = {
    binary: false,
    data: await grok.dapi.files.readAsText(receptor.fullPath),
    ext: receptor.extension,
    options: { name: receptor.name },
  };

  return {
    ligandDf: table,
    ligandMolColName: ligandColumn,
    receptor: receptorData,
    gpfFile: await grok.dapi.files.readAsText(configFile.fullPath),
    confirmationNum: confirmations,
    ligandDfString: table.columns.byName(ligandColumn).toString(),
  };
}


//top-menu: Chem | Autodock...
//name: Autodock
//tags: HitTriageFunction
//description: Autodock plugin UI
//input: dataframe table [Input data table]
//input: column ligands {type:categorical; semType: Molecule} [Small molecules to dock]
//input: string target {choices: Docking: getConfigFiles} [Folder with config and macromolecule]
//input: int conformations = 10 [Number of output conformations for each small molecule]
export async function runAutodock5(table: DG.DataFrame, ligands: DG.Column, target: string, confirmations: number): Promise<void> {
  const desirableHeight = 100;
  const desirableWidth = 100;
  const pi = DG.TaskBarProgressIndicator.create('AutoDock load data ...');
  try {
    const data = await prepareAutoDockData(target, table, ligands.name, confirmations);

    const app = new AutoDockApp();
    const autodockResults = await app.init(data);
    if (!autodockResults)
      return;

    formatColumns(autodockResults);
    const processedResults = processAutodockResults(autodockResults, table);
    for (let col of processedResults.columns)
      table.columns.add(col);

    const grid = grok.shell.getTableView(table.name).grid;

    addColorCoding(grid.columns.byName(BINDING_ENERGY_COL_UNUSED)!);
    grid.sort([BINDING_ENERGY_COL_UNUSED]);

    await grok.data.detectSemanticTypes(table);

    grid.onCellRender.subscribe((args: any) => {
      grid.setOptions({ 'rowHeight': desirableHeight });
      grid.col(POSE_COL_UNUSED)!.width = desirableWidth;
      grid.col(BINDING_ENERGY_COL_UNUSED)!.width = desirableWidth + 50;

      const { cell, g, bounds } = args;
      const value = cell.cell.value;
      const isPoseCell = cell.isTableCell && cell.cell.column.name === POSE_COL_UNUSED;
      const isErrorValue = typeof value === 'string' && value.toLowerCase().includes(ERROR_COL_NAME);

      if (isPoseCell && isErrorValue) {
        g.fillStyle = 'black';
        g.fillText(ERROR_MESSAGE, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        args.preventDefault();
      }
    });
  } finally {
    pi.close();
  }
}

function formatColumns(autodockResults: DG.DataFrame) {
  for (let col of autodockResults.columns.numerical)
    col.setTag(DG.TAGS.FORMAT, '0.00');
}

export function addColorCoding(column: DG.GridColumn) {
  if (!column) return;
  column.isTextColorCoded = true;
  column.column!.tags[DG.TAGS.COLOR_CODING_TYPE] = 'Linear';
  column.column!.tags[DG.TAGS.COLOR_CODING_LINEAR] = `[${DG.Color.green}, ${DG.Color.red}]`;
}

function processAutodockResults(autodockResults: DG.DataFrame, table: DG.DataFrame): DG.DataFrame {
  const affinityDescription = 'Estimated Free Energy of Binding.\
    Lower values correspond to stronger binding.';
  const poseCol = autodockResults.col(POSE_COL);
  poseCol!.name = table.columns.getUnusedName(POSE_COL);
  setPose(poseCol!.name);
  const affinityCol = autodockResults.col(BINDING_ENERGY_COL);
  affinityCol!.name = table.columns.getUnusedName(BINDING_ENERGY_COL);
  setAffinity(affinityCol!.name);
  const processedTable = DG.DataFrame.fromColumns([poseCol!, affinityCol!]);
  affinityCol!.setTag(DG.TAGS.DESCRIPTION, affinityDescription);
  return processedTable;
}

//name: Docking
//tags: panel, chem, widgets
//input: semantic_value molecule { semType: Molecule3D }
//output: widget result
export async function autodockWidget(molecule: DG.SemanticValue): Promise<DG.Widget<any> | null> {
  const type = molecule.cell.column.getTag('docking.type');
  if (type === 'adcp')
    return await getDockingResults(molecule, CACHED_ADCP);
  return await getDockingResults(molecule, CACHED_DOCKING);
}

async function getDockingResults(molecule: DG.SemanticValue, cachedDocking: DG.LruCache, showProperties: boolean = true, table?: DG.DataFrame): Promise<DG.Widget<any> | null> {
  const value = molecule.value;
  if (value.toLowerCase().includes(ERROR_COL_NAME))
    return new DG.Widget(ui.divText(value));

  const currentTable = table ?? grok.shell.tv.dataFrame;
  //@ts-ignore
  const index = cachedDocking.V.findIndex((cachedData: DG.DataFrame) => {
    if (cachedData) {
      const names = currentTable?.columns.names();
      const indexPoses = names!.findIndex(name => name.includes(molecule.cell.column.name));
      const samePoses = cachedData.col(molecule.cell.column.name)?.toString() === currentTable?.col(names![indexPoses])?.toString();
      return currentTable?.rowCount === cachedData.rowCount && samePoses;
    }
    return false;
  });

  //@ts-ignore
  const key = cachedDocking.K[index];
  //@ts-ignore
  const matchingValue = cachedDocking.V[index];
  if (!matchingValue)
    return new DG.Widget(ui.divText('Docking has not been run'));

  const resultsDf: DG.DataFrame = matchingValue.clone();
  const widget = new DG.Widget(ui.div([]));
  const targetViewer = await currentTable!.plot.fromType('Biostructure', {
    dataJson: BiostructureDataJson.fromData(key.receptor),
    ligandColumnName: molecule.cell.column.name,
    zoom: true,
  });

  widget.root.append(targetViewer.root);
  if (!showProperties) return widget;

  const result = ui.div();
  const map: { [_: string]: any } = {};
  for (let i = 1; i < resultsDf!.columns.length; ++i) {
    const columnName = resultsDf!.columns.names()[i];
    const propertyCol = resultsDf!.col(columnName);
    map[columnName] = prop(molecule, propertyCol!, result, PROPERTY_DESCRIPTIONS);
  }
  result.appendChild(ui.tableFromMap(map));
  widget.root.append(result);

  return widget;
}

function prop(molecule: DG.SemanticValue, propertyCol: DG.Column, host: HTMLElement, description: any) : HTMLElement {
  const addColumnIcon = ui.iconFA('plus', () => {
    const df = molecule.cell.dataFrame;
    propertyCol.name = df.columns.getUnusedName(propertyCol.name);
    const propDescription = Object.keys(description).find(key => key.includes(propertyCol.name));
    propertyCol.setTag(DG.TAGS.DESCRIPTION, propDescription!);
    df.columns.add(propertyCol);
  }, `Calculate ${propertyCol.name} for the whole table`);

  ui.tools.setHoverVisibility(host, [addColumnIcon]);
  $(addColumnIcon)
    .css('color', '#2083d5')
    .css('position', 'absolute')
    .css('top', '2px')
    .css('left', '-12px')
    .css('margin-right', '5px');
  
  const idx = molecule.cell.rowIndex;
  return ui.divH([addColumnIcon, propertyCol.get(idx)], {style: {'position': 'relative'}});
}

//name: Demo Docking
//description: Small molecule docking to a macromolecule with pose visualization
//meta.demoPath: Bioinformatics | Docking
export async function demoDocking(): Promise<void> {
  await _demoDocking();
}

//name: Biology | Docking
//tags: panel, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export async function autodockPanel(smiles: DG.SemanticValue): Promise<DG.Widget> {
  const items = await getConfigFiles();
  const target = ui.choiceInput('Target', items[0], items);
  const conformations = ui.intInput('Conformations', 10);

  const resultsContainer = ui.div();
  const button = ui.button('Run', async () => {
    resultsContainer.innerHTML = '';

    const loader = ui.loader();
    resultsContainer.appendChild(loader);

    const table = smiles.cell.dataFrame.clone();
    table.rows.removeWhereIdx((idx) => idx !== 0);

    const data = await prepareAutoDockData(target.value!, table, smiles.cell.column.name, conformations.value!);

    const app = new AutoDockApp();
    const autodockResults = await app.init(data);

    let widget;
    if (autodockResults) {
      formatColumns(autodockResults);
      const processedResults = processAutodockResults(autodockResults, table);
      for (let col of processedResults.columns)
        table.columns.add(col);
      
      const pose = table.cell(0, POSE_COL);
      widget = await getDockingResults(DG.SemanticValue.fromTableCell(pose!), CACHED_DOCKING, false, table);
      resultsContainer.removeChild(loader);
      resultsContainer.appendChild(widget!.root);
    }
  });

  const form = ui.form([target, conformations]);
  const panels = ui.divV([form, button, resultsContainer]);

  return DG.Widget.fromRoot(panels);
}

//top-menu: Chem | ADCP...
//name: ADCP
//input: dataframe table [Input data table]
//input: column ligands {type:categorical; semType: Molecule3D} [Small molecules to dock]
//input: string target {choices: Docking: getConfigFiles} [Folder with config and macromolecule]
//input: int searches = 20 [Number of independent searches]
//input: int evaluations = 1000000 [Number of evaluations of the scoring function]
export async function runAdcp(table: DG.DataFrame, ligands: DG.Column, target: string, searches: number, evaluations: number) {
  const adcpApp = new AdcpApp();
  const data = await prepareAdcpData(target, table, ligands.name, searches, evaluations);

  const resultDf = await adcpApp.init(data);
  if (resultDf !== undefined) {
    const energyCol = resultDf.col(BINDING_ENERGY_COL);
    const clusterCol = resultDf.col('cluster size');
    const columns = [energyCol, clusterCol];
    for (const col of columns) {
      if (col)
        table.columns.add(col);
    }

    const poseCol = resultDf.getCol(POSE_COL);
    poseCol.semType = DG.SEMTYPE.MOLECULE3D;
    poseCol.setTag('docking.role', 'ligand');
    poseCol.setTag('units', 'pdbqt');
    poseCol.setTag('docking.type', 'adcp');
    table.columns.add(poseCol!);
    await grok.data.detectSemanticTypes(table);

    const grid = grok.shell.getTableView(table.name).grid;

    addColorCoding(grid.col(BINDING_ENERGY_COL)!);
    grid.sort([BINDING_ENERGY_COL]);


    grid.onCellRender.subscribe((args: any) => {
      grid.setOptions({ 'rowHeight': 100 });
      grid.col('pose')!.width = 100;
      //grid.col('binding energy')!.width = 100 + 50;

      const { cell, g, bounds } = args;
      const value = cell.cell.value;
      const isPoseCell = cell.isTableCell && cell.cell.column.name === POSE_COL;
      const isErrorValue = typeof value === 'string' && value.toLowerCase().includes(ERROR_COL_NAME);

      if (isPoseCell && isErrorValue) {
        g.fillStyle = 'black';
        g.fillText(ERROR_MESSAGE, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        args.preventDefault();
      }
    });
  }
}

async function prepareAdcpData(
  target: string, 
  table: DG.DataFrame, 
  ligandColumn: string, 
  searches: number,
  evaluations: number
): Promise<AdcpDataType> {
  const isTrgFile = (file: DG.FileInfo): boolean => file.extension === 'trg';
  const targetFiles = await grok.dapi.files.list(`${TARGET_PATH}/${target}`, true);
  const targetFile = targetFiles.find(isTrgFile)!;
  const targetData = await grok.dapi.files.readAsBytes(targetFile.fullPath);
  const binaryDataBase64 = fromByteArray(targetData);

  const receptorFiles = await grok.dapi.files.list(`${TARGET_PATH}/${target}`);
  const receptor = receptorFiles.find(file => file.extension === 'pdbqt' || file.extension === 'pdb')!;

  const receptorData: BiostructureData = {
    binary: false,
    data: await grok.dapi.files.readAsText(receptor.fullPath),
    ext: receptor.extension,
    options: { name: receptor.name },
  };

  return {
    ligandDf: table,
    ligandMolColName: ligandColumn,
    receptor: receptorData,
    target: binaryDataBase64,
    searches: searches,
    evaluations: evaluations
  };
}