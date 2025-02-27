/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import '@datagrok-libraries/bio/src/types/ngl'; // To enable import from the NGL module declared in bio lib

import {BuiltInTrajectoryFormat} from 'molstar/lib/mol-plugin-state/formats/trajectory';

import {IPdbHelper} from '@datagrok-libraries/bio/src/pdb/pdb-helper';
import {INglViewer} from '@datagrok-libraries/bio/src/viewers/ngl-gl-viewer';
import {NglGlServiceBase} from '@datagrok-libraries/bio/src/viewers/ngl-gl-service';
import {IBiostructureViewer} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';
import {IBiotrackViewer} from '@datagrok-libraries/bio/src/viewers/biotrack';
import {BiostructureDataJson} from '@datagrok-libraries/bio/src/pdb/types';
import {delay} from '@datagrok-libraries/utils/src/test';

import {byData, byId, MolstarViewer} from './viewers/molstar-viewer';
import {SaguaroViewer} from './viewers/saguaro-viewer';
import {PdbGridCellRenderer, PdbGridCellRendererBack, PdbIdGridCellRenderer} from './utils/pdb-grid-cell-renderer';
import {NglForGridTestApp} from './apps/ngl-for-grid-test-app';
import {nglViewerGen as _nglViewerGen} from './utils/ngl-viewer-gen';
import {NglViewer} from './viewers/ngl-viewer';
import {NglViewerApp} from './apps/ngl-viewer-app';
import {PdbHelper, PdbResDataFrame} from './utils/pdb-helper';
import {nglWidgetUI} from './viewers/ngl-ui';
import {dockingDemoApp} from './demo/docking';
import {biostructureInGridApp} from './demo/biostructure-in-grid';
import {BiotrackViewerApp} from './apps/biotrack-viewer-app';
import {BiostructureAndTrackViewerApp} from './apps/biostructure-and-track-viewer-app';
import {previewBiostructure, previewNgl, viewNgl} from './viewers/view-preview';
import {BiostructureViewerApp} from './apps/biostructure-viewer-app';
import {LigandsWithBiostructureApp, LigandsWithNglApp} from './apps/ligands-with-base-app';
import {importPdbqtUI} from './utils/import-pdbqt';
import {_getNglGlService, BsvPackage} from './package-utils';
import {demoBio07NoScript} from './demo/bio07-molecule3d-in-grid';
import {demoBio06NoScript} from './demo/bio06-docking-ngl';
import {Pdbqt} from './utils/pdbqt-parser';
import {viewMolstarUI} from './viewers/molstar-viewer/utils';
import {BiostructureDataProviderApp} from './apps/biostructure-data-provider-app';
import {copyRawValue, downloadRawValue, showBiostructureViewer, showNglViewer} from './utils/context-menu';
import {defaultErrorHandler} from './utils/err-info';

export const _package: BsvPackage = new BsvPackage();

//name: init
//tags: init
//description:
export async function init() {
  _package.logger.debug('BiostructureViewer.initBiostructureViewer() init package start');
}

//name: pdbCellRenderer
//tags: cellRenderer
//meta.cellType: Molecule3D
//meta.columnTags: quality=Molecule3D
//output: grid_cell_renderer result
export function Molecule3dCellRenderer(): PdbGridCellRenderer {
  return new PdbGridCellRenderer();
}

//name: chemCellRenderer
//tags: cellRenderer, cellRenderer-PDB_ID
//meta.cellType: PDB_ID
//output: grid_cell_renderer result
export function pdbIdCellRenderer(): PdbIdGridCellRenderer {
  return new PdbIdGridCellRenderer();
}


//name: viewPdbById
//input: string pdbId
export async function viewPdbById(pdbId: string) {
  const pi = DG.TaskBarProgressIndicator.create(`Opening PDB ${pdbId}...`);
  try {
    await byId(pdbId);
  } finally {
    pi.close();
  }
}

//name: viewPdbByData
//input: string pdbData
//input: string name
export async function viewPdbByData(pdbData: string, name: string): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create(`Opening PDB '${name ?? '[data]'}'...`);
  try {
    await byData(pdbData, name);
  } finally {
    pi.close();
  }
}

//name: getNglGlService
//output: object result
export function getNglGlService(): NglGlServiceBase {
  return _getNglGlService();
}

//name: viewBiostructure
//input: string content
//input: string format
//input: string name { optional: true }
export async function viewBiostructure(content: string, format: string, name?: string): Promise<void> {
  await viewMolstarUI(content, name, format as BuiltInTrajectoryFormat);
}

// -- File handlers --

/* The Chem package is opening formats 'mol2', 'sdf', 'mol' for small molecules */
//name: importPdb
//description: Opens PDB file
//tags: file-handler
//meta.ext: mmcif, cifCore, pdb, gro
//input: string fileContent
//output: list tables
export async function importPdb(fileContent: string): Promise<DG.DataFrame[]> {
  // Do not build up data frame from PDB file, allows to open various formats
  // const ph: IPdbHelper = await _getPdbHelper();
  // const df: DG.DataFrame = await ph.pdbToDf(fileContent, '');
  // const app = new BiostructureApp();
  // await app.init(df);

  await viewBiostructure(fileContent, 'pdb');
  return [];
}

/* as file is handled as string we don't know its extension, thus we need a separate handler **/
//name: importXYZ
//description: Opens XYZ file
//tags: file-handler
//meta.ext: xyz
//input: string fileContent
//output: list tables
export async function importXYZ(fileContent: string): Promise<DG.DataFrame[]> {
  await viewBiostructure(fileContent, 'xyz');
  return [];
}

//name: importWithNgl
//description: Opens biostructure files supported with NGL
//tags: file-handler
//meta.ext: mmtf, cns, top, prmtop, ply, obj, ccp4
//input: string fileContent
//output: list tables
export async function importWithNgl(fileContent: string): Promise<DG.DataFrame[]> {
  await viewNgl(fileContent);
  return [];
}

//name: importPdbqt
//description: Opens .pdbqt file with docking result ligand poses
//tags: file-handler
//meta.ext: pdbqt
//input: string fileContent
//input: bool test =false {optional: true}
//output: list tables
export async function importPdbqt(fileContent: string, test: boolean): Promise<DG.DataFrame[]> {
  return importPdbqtUI(fileContent, test);
}

// -- File (pre)viewers --

/** Structure formats not supported with Molstar are handled with NGL viewer
 * fileViewer-mtl is from NglViewer package, but NGL can not open it
 * //TODO: Support preview .mol2 with Molstar (hangs on sp-after.mol2)
 * //TODO: Fix preview .pqr
 */
//tags: fileViewer
//meta.fileViewer: mmtf,cns,top,prmtop,pqr
//input: file file
//output: view result
export function previewNglStructure(file: any): DG.View {
  return previewNgl(file);
}

/** Shape / surface formats not supported with Molstar are handled with NGL viewer
 * TODO: Support preview .ply with Molstar
 */
//tags: fileViewer
//meta.fileViewer: ply,obj
//input: file file
//output: view v
export function previewNglSurface(file: any) {
  return previewNgl(file);
}

// TODO: Support preview .ccp4 with Molstar
//eslint-disable-next-line max-len
//tags: fileViewer
//meta.fileViewer: ccp4
//input: file file
//output: view v
export function previewNglDensity(file: any) {
  return previewNgl(file);
}


// eslint-disable-next-line max-len
//tags: fileViewer
//meta.fileViewer: mol,mol2,cif,mcif,mmcif,gro,pdb,pdbqt,ent,sd,xyz
//input: file file
//output: view v
export function previewBiostructureStructure(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

//tags: fileViewer
//meta.fileViewer: parm7,psf
//input: file file
//output: view v
export function previewBiostructureTopology(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

// eslint-disable-next-line max-len
//tags: fileViewer
//meta.fileViewer: dsn6,brix,cube,cub,dx,dxbin,xplor,mrc,map
//input: file file
//output: view v
export function previewBiostructureDensity(file: DG.FileInfo): DG.View {
  return previewBiostructure(file);
}

//name: openPdbResidues
//input: file fi
export async function openPdbResidues(fi: DG.FileInfo): Promise<void> {
  const ph = await PdbHelper.getInstance();
  const pdbStr: string = await fi.readAsString();
  const pdbDf: PdbResDataFrame = await ph.pdbToDf(pdbStr, fi.fileName);
  const view = grok.shell.addTableView(pdbDf);
  const viewer = await pdbDf.plot.fromType('NGL', {});
  view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'NGL', 0.40);
}

// -- Panel widgets --

//name: PDB id viewer
//tags: panel
//input: string pdbId {semType: PDB_ID}
//output: widget result
export function pdbIdNglPanelWidget(pdbId: string): DG.Widget {
  return nglWidgetUI(pdbId);
}

// -- Test apps --

//name: nglForGridTestApp
//description: Example app for NGL drawing in grid cells
export async function nglForGridTestApp() {
  const pi = DG.TaskBarProgressIndicator.create('open nglForGridTest app');
  try {
    const app = new NglForGridTestApp();
    await app.init();
  } finally {
    pi.close();
  }
}

//name: nglViewerApp
//description: Test app for NglViewer
export async function nglViewerApp() {
  const pi = DG.TaskBarProgressIndicator.create('open nglViewer app');
  try {
    const app = new NglViewerApp('nglViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biostructureViewerApp
//description: Test app for BiostructureViewer (molstar)
export async function biostructureViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biostructureViewer app');
  try {
    const app = new BiostructureViewerApp('biostructureViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biotrackViewerApp
//description: Test app for BiotrackViewer (saguaro)
export async function biotrackViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biotrackViewer app');
  try {
    const app = new BiotrackViewerApp('biotrackViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biostructureAndTrackViewerApp
//description: Test app for twin BiostructureViewer (molstar) and BiotrackViewer (saguaro)
export async function biostructureAndTrackViewerApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('open biostructureAndTrackViewer app');
  try {
    const app = new BiostructureAndTrackViewerApp('biostructureAndTrackViewerApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: ligandsWithNglApp
export async function ligandsWithNglApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Ligands with NGL app');
  try {
    const app = new LigandsWithNglApp('ligandsWithNglApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: ligandsWithBiostructureApp
export async function ligandsWithBiostructureApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Ligands with Biostructure app');
  try {
    const app = new LigandsWithBiostructureApp('ligandsWithBiostructureApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: biostructureDataProviderApp
export async function biostructureDataProviderApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Biostructure data provider app');
  try {
    const app = new BiostructureDataProviderApp();
    await app.init();
  } finally {
    pi.close();
  }
}


// -- Viewers --

//name: NGL
// eslint-disable-next-line max-len
//description: 3D structure viewer for large biological molecules (proteins, DNA, and RNA)
//meta.keywords: PDB, Biostructure
//meta.icon: files/icons/ngl-viewer.svg
//tags: viewer, panel
//output: viewer result
export function nglViewer(): DG.JsViewer & INglViewer {
  return new NglViewer();
}

//name: Biostructure
// eslint-disable-next-line max-len
//description: 3D structure molstar RCSB viewer for large biological molecules (proteins, DNA, and RNA)
//meta.keywords: Molstar, PDB
//meta.icon: files/icons/biostructure-viewer.svg
//tags: viewer, panel
//output: viewer result
export function molstarViewer(): DG.JsViewer & IBiostructureViewer {
  return new MolstarViewer();
}

//name: Biotrack
//description: structure polymer annotation tracks
//meta.keywords: PDB, track
//tags: viewer, panel
//output: viewer result
export function saguaroViewer(): DG.JsViewer & IBiotrackViewer {
  return new SaguaroViewer();
}

// -- Top menu --

// code pdbViewer moved to utils/pdb-viewer.ts because of annotations in comments

// -- Utils --


//name: getPdbHelper
//output: object result
export async function getPdbHelper(): Promise<IPdbHelper> {
  return PdbHelper.getInstance();
}

//name: dockingDemo
//description:
export async function dockingDemo() {
  const piMsg: string = 'Opening docking demo app ...';
  const pi: DG.TaskBarProgressIndicator = DG.TaskBarProgressIndicator.create(piMsg);
  try {
    await dockingDemoApp('dockingDemo', pi);
  } finally {
    pi.close();
  }
}

//name: inGridDemo
//description:
export async function inGridDemo() {
  const piMsg: string = 'Opening biostructure in grid demo app ...';
  const pi: DG.TaskBarProgressIndicator = DG.TaskBarProgressIndicator.create(piMsg);
  try {
    await biostructureInGridApp('inGridDemo', pi);
  } finally {
    pi.close();
  }
}

// -- Handle context menu --

//name: Copy Biostructure raw value
//input: object gridCell
export async function copyRawBiostructureValue(gridCell: DG.GridCell): Promise<void> {
  copyRawValue(gridCell);
}

//name: Download Biostructure raw value
//input: object gridCell
export async function downloadRawBiostructureValue(gridCell: DG.GridCell): Promise<void> {
  downloadRawValue(gridCell);
}

//name: Show Biostructure Viewer menu item
//input: object gridCell
export async function showBiostructureViewerMenuItem(gridCell: DG.GridCell) {
  await showBiostructureViewer(gridCell);
}

//name: Show NGL Viewer menu item
//input: object gridCell
export async function showNglViewerMenuItem(gridCell: DG.GridCell) {
  await showNglViewer(gridCell);
}

//name: Open PDB residues table menu item
//input: object fi
export async function openTableResiduesMenuItem(fi: DG.FileInfo) {
  try {
    await openPdbResidues(fi);
  } catch (err: any) {
    defaultErrorHandler(err);
  }
}
// -- Demo --

//  // demoBio06
//  //name: demoBioDockingConformationsOld
//  //meta.demoPath: Bioinformatics | Docking Conformations Old
//  //description: Docking ligands along the structure
//  //meta.path: /apps/Tutorials/Demo/Bioinformatics/Docking%20Conformations%20Old
//  //test: demoBioDockingConformationsOld() //wait: 3000
//  export async function demoBioDockingConformationsOld(): Promise<void> {
//    // Do not use any script for this demo (askalkin, 2023-05-17)
//    //await demoBio06UI();
//    await demoBio06NoScript();
//  }

// demoBio06b
//name: demoBioDockingConformations
//meta.demoPath: Bioinformatics | Docking Conformations
//description: Display ligand poses along the structure
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Docking%20Conformations
//meta.demoWait: 3000
//meta.demoSkip: GROK-15250
//test: demoBioDockingConformations() //wait: 3000, timeout: 60000, skip: GROK-15250
export async function demoBioDockingConformations(): Promise<void> {
  await demoBio06NoScript();
}

// demoBio07
//name: demoBioProteins
//meta.demoPath: Bioinformatics | Proteins
//description: View structures PDB in grids
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Proteins
//meta.demoWait: 3000
//meta.demoSkip: GROK-15250
//test: demoBioProteins() //wait: 3000, timeout: 60000, skip: GROK-15250
export async function demoBioProteins(): Promise<void> {
  const t1: number = window.performance.now();
  await demoBio07NoScript();
  const t2: number = window.performance.now();
  _package.logger.debug(`demoBioProteins(), end ET: ${t2 - t1}`);
}

const dataDir = 'Admin:Data/PDB/CHEMBL2366517/';

//name: demoFix1
export async function demoFix1(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('demoFix1 loading ...');
  try {
    const [ligandCsv, poseCsv] = await Promise.all([
      grok.dapi.files.readAsText(dataDir + 'ic50.mol.csv'),
      grok.dapi.files.readAsText(dataDir + 'ic50.pose.csv'),
      getPdbHelper(),
    ]);
    const ligandDf = DG.DataFrame.fromCsv(ligandCsv);
    const poseDf = DG.DataFrame.fromCsv(poseCsv);

    if (ligandDf.rowCount !== poseDf.rowCount / 30)
      throw new Error('Unsupported input data');

    // region Cols
    const Cols = {
      id: 'Molecule ChEMBL ID',
      molName: 'Molecule Name',
      mw: 'Molecular Weight',
      ic50: 'IC50',
      ic50units: 'IC50 Units',

      affinity: 'affinity',
      intermolecular: 'intermolecular (1)',
      electrostatic: 'electrostatic',
      ligandFixed: 'ligand fixed',
      ligandMoving: 'ligand moving',
      totalInternal: 'total internal (2)',
      torsionalFree: 'torsional free (3)',
      unboundSystems: 'unbound systems (4)',

      mol: 'mol',
    };

    const lIdCol = ligandDf.getCol(Cols.id);
    const lMolNameCol = ligandDf.getCol(Cols.molName);
    const lMwCol = ligandDf.getCol(Cols.mw);

    const lIc50ValCol = ligandDf.getCol('Standard Value');
    const lIc50UnitsCol = ligandDf.getCol('Standard Units');

    const pModelCol = poseDf.getCol('pdbqt_model');
    const pIdCol = poseDf.col(Cols.id) ?? poseDf.columns.addNewString(Cols.id);
    const pMolNameCol = poseDf.col(Cols.molName) ?? poseDf.columns.addNewString(Cols.molName);
    const pMwCol = poseDf.col(Cols.mw) ?? poseDf.columns.addNewFloat(Cols.mw);
    const pIc50ValCol = poseDf.col(Cols.ic50) ?? poseDf.columns.addNewFloat(Cols.ic50);
    const pIc50UnitsCol = poseDf.col(Cols.ic50units) ?? poseDf.columns.addNewString(Cols.ic50units);

    const ppAffinityCol = poseDf.col(Cols.affinity) ?? poseDf.columns.addNewFloat(Cols.affinity);
    const ppIntermolecularCol = poseDf.col(Cols.intermolecular) ?? poseDf.columns.addNewFloat(Cols.intermolecular);
    const ppElectrostaticCol = poseDf.col(Cols.electrostatic) ?? poseDf.columns.addNewFloat(Cols.electrostatic);
    const ppLigandFixedCol = poseDf.col(Cols.ligandFixed) ?? poseDf.columns.addNewFloat(Cols.ligandFixed);
    const ppLigandMovingCol = poseDf.col(Cols.ligandMoving) ?? poseDf.columns.addNewFloat(Cols.ligandMoving);
    const ppTotalInternalCol = poseDf.col(Cols.totalInternal) ?? poseDf.columns.addNewFloat(Cols.totalInternal);
    const ppTorsionalFreeCol = poseDf.col(Cols.torsionalFree) ?? poseDf.columns.addNewFloat(Cols.torsionalFree);
    const ppUnboundSystemsCol = poseDf.col(Cols.unboundSystems) ?? poseDf.columns.addNewFloat(Cols.unboundSystems);

    const _pMolCol = poseDf.col(Cols.mol) ?? poseDf.columns.addNewString(Cols.mol);
    // endregion Cols
    let lastProgress: number = 0;
    const poseCount = poseDf.rowCount;
    for (let poseI = 0; poseI < poseCount; ++poseI) {
      const ligandI = Math.trunc(poseI / 30);

      pIdCol.set(poseI, lIdCol.get(ligandI));
      pMolNameCol.set(poseI, lMolNameCol.get(ligandI));
      pMwCol.set(poseI, lMwCol.get(ligandI));
      pIc50ValCol.set(poseI, lIc50ValCol.get(ligandI));
      pIc50UnitsCol.set(poseI, lIc50UnitsCol.get(ligandI));

      const modelPdbqtStr = pModelCol.get(poseI);
      const pm = Pdbqt.parse(modelPdbqtStr).models[0];
      // region Docking props
      ppAffinityCol.set(poseI, pm.affinity);
      ppIntermolecularCol.set(poseI, pm.intermolecular);
      ppElectrostaticCol.set(poseI, pm.electrostatic);
      ppLigandFixedCol.set(poseI, pm.ligandFixed);
      ppLigandMovingCol.set(poseI, pm.ligandMoving);
      ppTotalInternalCol.set(poseI, pm.totalInternal);
      ppTorsionalFreeCol.set(poseI, pm.torsionalFree);
      ppUnboundSystemsCol.set(poseI, pm.unboundSystems);
      // endregion Docking props

      const progress = poseI / poseCount;
      if (progress - lastProgress >= 0.01) {
        pi.update(100 * progress, 'demoFix1 parsing ...');
        lastProgress = progress;
        await delay(0);
      }
    }

    pi.update(1, 'demoFix1 downloading ...');
    DG.Utils.download('ic50.pose-props.csv', poseDf.toCsv());
  } finally {
    pi.close();
  }
}

//name: demoFix2
export async function demoFix2(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('demoFix2 loading ...');
  try {
    const [poseCsv] = await Promise.all([
      grok.dapi.files.readAsText(dataDir + 'ic50.pose-props.flt2.csv'),
    ]);
    if (!poseCsv)
      throw new Error('Empty input data');

    const poseDf = DG.DataFrame.fromCsv(poseCsv);
    const pdbqtModelCol = poseDf.getCol('pdbqt_model');
    const pdbqtVal = pdbqtModelCol.toList().join('\n');

    pi.update(1, 'demoFix2 downloading .pdbqt ...');
    DG.Utils.download('ic50.pose.flt2.pdbqt', pdbqtVal);
  } finally {
    pi.close();
  }
}

//name: demoFix3
export async function demoFix3(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('demoFix3 loading ...');
  try {
    const [poseCsv, ph] = await Promise.all([
      grok.dapi.files.readAsText(dataDir + 'ic50.pose-props.flt2.csv'),
      getPdbHelper(),
    ]);
    if (!poseCsv)
      throw new Error('Empty input data');

    const poseDf = DG.DataFrame.fromCsv(poseCsv);
    const pdbqtModelCol = poseDf.getCol('pdbqt_model');
    const pMolCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, 'mol', poseDf.rowCount);
    poseDf.columns.insert(pMolCol, 0);

    let lastProgress: number = 0;
    const poseCount: number = poseDf.rowCount;
    for (let poseI = 0; poseI < poseCount; ++poseI) {
      const pdbqtModelStr = pdbqtModelCol.get(poseI);
      const pMol: string = await ph.pdbqtToMol(pdbqtModelStr);
      pMolCol.set(poseI, pMol);

      const progress = poseI / poseCount;
      if (progress - lastProgress >= 0.01) {
        pi.update(100 * progress, 'demoFix3 pdbqt -> mol ...');
        lastProgress = progress;
        await delay(0);
      }
    }

    pi.update(1, 'demoFix3 downloading .pdbqt ...');
    DG.Utils.download('ic50.pose.flt2.mol.csv', poseDf.toCsv());
  } finally {
    pi.close();
  }
}


// -- cache --
//name: readAsText
//meta.cache: client
//meta.cache.invalidateOn: 0 * * * *
//input: string file
//output: string result
export async function readAsText(file: string): Promise<string> {
  return await _package.files.readAsText(file);
}

//name: readAsTextDapi
//meta.cache: client
//meta.cache.invalidateOn: 0 * * * *
//input: string file
//output: string result
export async function readAsTextDapi(file: string): Promise<string> {
  const [resStr, exists] = await Promise.all([
    grok.dapi.files.readAsText(file),
    grok.dapi.files.exists(file)
  ]);
  if (!exists)
    throw new Error(`File not found '${file}'.`);
  return resStr;
}

// -- Data provider --

//name: RCSB PDB
//description: Get biostructure by id as PDB
//meta.dataProvider: Molecule3D
//input: string id
//output: string result
export async function getBiostructureRcsbPdb(id: string): Promise<string> {
  const url = `https://files.rcsb.org/download/${id}.pdb`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(response.statusText);
  const data: string = await response.text();
  return BiostructureDataJson.fromData({binary: false, data: data, ext: 'pdb', options: {name: id}});
}

//name: RCSB mmCIF
//description: Get biostructure by id as mmCIF
//meta.dataProvider: Molecule3D
//meta.cache: client
//meta.cache.invalidateOn: 0 * * * *
//input: string id
//output: string result
export async function getBiostructureRcsbMmcif(id: string): Promise<string> {
  const url = `https://files.rcsb.org/download/${id}.cif`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(response.statusText);
  const data: string = await response.text();
  return BiostructureDataJson.fromData({binary: false, data: data, ext: 'cif', options: {name: id}});
}

//name: RCSB bCIF
//description: Get biostructure by id as BinaryCIF
//meta.dataProvider: Molecule3D
//meta.cache: client
//meta.cache.invalidateOn: 0 * * * *
//input: string id ='1QBS'
//output: string result
export async function getBiostructureRcsbBcif(id: string): Promise<string> {
  const url = `https://models.rcsb.org/${id}.bcif`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(response.statusText);
  const data: ArrayBuffer = await response.arrayBuffer();
  const dataA = new Uint8Array(data, 0, data.byteLength);
  return BiostructureDataJson.fromData({binary: true, data: dataA, ext: 'bcif', options: {name: id}});
}

//name: biostructureDataToJson
//description: Packs BiostructureData value into JSON string
//input: bool binary
//input: object data
//input: string ext
//input: map options {optional: true}
//output: string result
export function biostructureDataToJson(
  binary: boolean, data: string | Uint8Array, ext: string, options: object
): string {
  return BiostructureDataJson.fromData({binary, data, ext, options});
}

//name: 3D Structure
//tags: panel, bio, widgets
//input: semantic_value molecule { semType: Molecule3D }
//output: widget result
export function structure3D(molecule: DG.SemanticValue): DG.Widget {
  const widget = new DG.Widget(ui.div([]));
  widget.root.append(ui.loader());
  const {dataFrame, column, rowIndex} = molecule.cell;
  const inBrowseView = grok.shell.v.type === DG.VIEW_TYPE.BROWSE;
  const tableView = inBrowseView ?
    ((grok.shell.view('Browse') as DG.BrowseView)?.preview as DG.TableView) :
    grok.shell.getTableView(dataFrame.name);
  const {grid} = tableView;
  const gridCell = grid.cell(column.name, rowIndex);
  const renderer = new PdbGridCellRendererBack(null, column);

  renderer.createViewer(gridCell, tableView).then(async ({tview, viewer}) => {
    if (tview && viewer) {
      viewer.root.classList.add('bsv-container-info-panel');
      ui.empty(widget.root);
      widget.root.appendChild(viewer.root);
    }
  });
  return widget;
}