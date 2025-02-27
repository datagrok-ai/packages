/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import '@datagrok-libraries/bio/src/types/ngl'; // To enable import from the NGL module declared in bio lib
import {IAutoDockService} from '@datagrok-libraries/bio/src/pdb/auto-dock-service';
import {BiostructureData, BiostructureDataJson} from '@datagrok-libraries/bio/src/pdb/types';

import {AutoDockApp, AutoDockDataType} from './apps/auto-dock-app';
import {_runAutodock, AutoDockService, _runAutodock2} from './utils/auto-dock-service';
import {_package, TARGET_PATH, BINDING_ENERGY_COL, POSE_COL, BINDING_ENERGY_COL_UNUSED, POSE_COL_UNUSED, ERROR_COL_NAME, ERROR_MESSAGE, AUTODOCK_PROPERTY_DESCRIPTIONS} from './utils/constants';
import { _demoFolding, _demoDocking } from './demo/demo';
import { DockingViewApp } from './demo/docking-app';
import { addColorCoding, formatColumns, getFromPdbs, getReceptorData, processAutodockResults, prop } from './utils/utils';
import { BoltzService } from './utils/boltz-service';

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

//name: getConfigFiles
//output: list<string> configFiles
export async function getConfigFiles(): Promise<string[]> {
  const targetsFiles: DG.FileInfo[] = await grok.dapi.files.list(TARGET_PATH, true);
  const directoriesWithGpf = await Promise.all(
    targetsFiles.filter(file => file.isDirectory).map(async dir => {
      const filesInDir = await grok.dapi.files.list(dir.fullPath, true);
      return filesInDir.some(file => file.path.endsWith('.gpf')) ? dir.name : null;
    })
  );
  return directoriesWithGpf.filter((dir): dir is string => Boolean(dir));
}

export async function prepareAutoDockData(
  target: string, 
  table: DG.DataFrame, 
  ligandColumn: string, 
  poses: number
): Promise<AutoDockDataType | null> {
  const isGpfFile = (file: DG.FileInfo): boolean => file.extension === 'gpf';
  const configFile = (await grok.dapi.files.list(`${TARGET_PATH}/${target}`, true)).find(isGpfFile)!;
  const receptor = (await grok.dapi.files.list(`${TARGET_PATH}/${target}`))
    .find(file => ['pdbqt', 'pdb'].includes(file.extension)) || null;
  
  if (!configFile || !receptor) {
    grok.shell.warning('Missing .gpf or .pdbqt/.pdb file in the target folder.');
    return null;
  }

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
    posesNum: poses,
    ligandDfString: table.columns.byName(ligandColumn).toString(),
  };
}

export function getTableView(tableName?: string): DG.TableView {
  const inBrowseView = grok.shell.v.type === DG.VIEW_TYPE.BROWSE;
  const tableView = inBrowseView
    ? ((grok.shell.view('Browse') as DG.BrowseView)?.preview as DG.TableView)
    : (tableName ? grok.shell.getTableView(tableName) : grok.shell.tv);
  return tableView;
}


//top-menu: Chem | Docking | AutoDock...
//name: Autodock
//tags: HitTriageFunction
//description: Autodock plugin UI
//input: dataframe table [Input data table]
//input: column ligands {type:categorical; semType: Molecule} [Small molecules to dock]
//input: string target {choices: Docking: getConfigFiles} [Folder with config and macromolecule]
//input: int poses = 10 [Number of output conformations for each small molecule]
export async function runAutodock5(table: DG.DataFrame, ligands: DG.Column, target: string, poses: number): Promise<void> {
  const desirableHeight = 100;
  const desirableWidth = 100;
  const pi = DG.TaskBarProgressIndicator.create('AutoDock load data ...');
  try {
    const data = await prepareAutoDockData(target, table, ligands.name, poses);
    if (!data)
      return;

    const app = new AutoDockApp();
    const autodockResults = await app.init(data);
    if (!autodockResults)
      return;

    formatColumns(autodockResults);
    const processedResults = processAutodockResults(autodockResults, table);
    for (let col of processedResults.columns)
      table.columns.add(col);
    
    const {grid} = getTableView(table.name);

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

//name: isApplicableAutodock
//input: string molecule
//output: bool result
export function isApplicableAutodock(molecule: string): boolean {
  return molecule.includes('binding energy');
}


//name: AutoDock
//tags: panel, chem, widgets
//input: semantic_value molecule { semType: Molecule3D }
//condition: Docking:isApplicableAutodock(molecule)
//output: widget result
export async function autodockWidget(molecule: DG.SemanticValue): Promise<DG.Widget<any> | null> {
  return await getAutodockSingle(molecule);
}

//name: getAutodockSingle
export async function getAutodockSingle(
  molecule: DG.SemanticValue, showProperties: boolean = true, 
  table?: DG.DataFrame): Promise<DG.Widget<any> | null> {
  const value = molecule.value;
  if (value.toLowerCase().includes(ERROR_COL_NAME))
    return new DG.Widget(ui.divText(value));

  const tableView = getTableView();
  const currentTable = table ?? tableView.dataFrame;
  
  const addedToPdb = value.includes(BINDING_ENERGY_COL);
  if (!addedToPdb)
    return new DG.Widget(ui.divText('Docking has not been run'));

  const autodockResults: DG.DataFrame = getFromPdbs(molecule);
  const widget = new DG.Widget(ui.div([]));

  if (table)
    currentTable.currentRowIdx = 0;

  const receptorData = await getReceptorData(value);
  const targetViewer = await currentTable.plot.fromType('Biostructure', {
    dataJson: BiostructureDataJson.fromData(receptorData),
    ligandColumnName: molecule.cell.column.name,
    zoom: true,
  });
  targetViewer.root.classList.add('bsv-container-info-panel');
  widget.root.append(targetViewer.root);
  if (!showProperties) return widget;

  const result = ui.div();
  const map: { [_: string]: any } = {};
  for (let i = 3; i < autodockResults!.columns.length; ++i) {
    const columnName = autodockResults!.columns.names()[i];
    const propertyCol = autodockResults!.col(columnName);
    map[columnName] = prop(molecule, propertyCol!, result, AUTODOCK_PROPERTY_DESCRIPTIONS);
  }
  result.appendChild(ui.tableFromMap(map));
  widget.root.append(result);

  return widget;
}

//name: Demo Docking
//description: Small molecule docking to a macromolecule with pose visualization
//meta.demoPath: Bioinformatics | Docking
export async function demoDocking(): Promise<void> {
  await _demoDocking();
}

//name: Demo Folding
//description: Demonstrates ESMFold and Boltz-1 for biomolecular folding predictions
//meta.demoPath: Bioinformatics | Folding
export async function demoFolding(): Promise<void> {
  await _demoFolding();
}

//name: Biology | AutoDock
//tags: panel, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export async function autodockPanel(smiles: DG.SemanticValue): Promise<DG.Widget> {
  const items = await getConfigFiles();
  const target = ui.input.choice('Target', {value: items[0], items: items})
  const poses = ui.input.int('Poses', {value: 10});

  const resultsContainer = ui.div();
  const button = ui.button('Run', async () => {
    resultsContainer.innerHTML = '';

    const loader = ui.loader();
    resultsContainer.appendChild(loader);

    const widget = await runDocking(smiles, target.value!, poses.value!);
    resultsContainer.removeChild(loader);
    if (widget) {
      resultsContainer.appendChild(widget.root);
    }
  });

  const form = ui.form([target, poses]);
  const panels = ui.divV([form, button, resultsContainer]);

  return DG.Widget.fromRoot(panels);
}

export async function runDocking(
  smiles: DG.SemanticValue,
  target: string,
  poses: number
): Promise<DG.Widget | null> {
  const ligandColumnName = 'ligand';
  const column = DG.Column.fromStrings(ligandColumnName, [smiles.value]);
  const table = DG.DataFrame.fromColumns([column]);
  column.semType = DG.SEMTYPE.MOLECULE;
  await grok.data.detectSemanticTypes(table);

  const data = await prepareAutoDockData(target, table, ligandColumnName, poses);
  if (!data)
    return null;

  const app = new AutoDockApp();
  const autodockResults = await app.init(data);

  if (autodockResults) {
    const pose = autodockResults.cell(0, POSE_COL);
    return await getAutodockSingle(DG.SemanticValue.fromTableCell(pose!), false, autodockResults);
  }

  return null;
}

//name: Docking
//tags: app
//input: string path {meta.url: true; optional: true}
//output: view v
//meta.browsePath: Bio
export async function dockingApp(path?: string): Promise<DG.ViewBase | null> {
  const parent = grok.functions.getCurrentCall();
  const app = new DockingViewApp(parent);
  await app.init();
  return app.tableView!;
}

//name: getBoltzConfigFolders
//output: list<string> configFiles
export async function getBoltzConfigFolders(): Promise<string[]> {
  return await BoltzService.getBoltzConfigFolders();
}

//name: runBoltz
//meta.cache: all
//meta.cache.invalidateOn: 0 0 1 * *
//input: string config
//input: string msa
//output: string s
export async function runBoltz(config: string, msa: string): Promise<string> {
  return await BoltzService.runBoltz(config, msa);
}

//top-menu: Bio | Folding | Boltz-1...
//name: Folding
//input: dataframe table
//input: column sequences {semType: Macromolecule}
//output: dataframe result
export async function folding(table: DG.DataFrame, sequences: DG.Column): Promise<DG.DataFrame> {
  return await BoltzService.folding(table, sequences);
}

//top-menu: Chem | Docking | Boltz-1...
//name: Docking
//input: dataframe table
//input: column ligands {semType: Molecule}
//input: string configuration {choices: Docking: getBoltzConfigFolders} [Folder with config files for docking]
//output: dataframe result
export async function docking(df: DG.DataFrame, molecules: DG.Column, config: string): Promise<DG.DataFrame> {
  return await BoltzService.docking(df, molecules, config);
}

//name: Boltz-1
//tags: panel, chem, widgets
//input: semantic_value molecule { semType: Molecule3D }
//condition: Docking:isApplicableBoltz(molecule)
//output: widget result
export async function boltzWidget(molecule: DG.SemanticValue): Promise<DG.Widget<any> | null> {
  return await BoltzService.boltzWidget(molecule);
}

//name: isApplicableBoltz
//input: string molecule
//output: bool result
export function isApplicableBoltz(molecule: string): boolean {
  return molecule.includes('confidence_score');
}