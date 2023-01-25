/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {DockingApp} from './apps/docking-app';
import {byId, byData} from './viewers/molstar-viewer';
import {PdbRenderer} from './utils/cell-renderer';
import {NglGlService} from './utils/ngl-gl-service';
import {NglForGridTestApp} from './apps/ngl-for-grid-test-app';
import {nglViewerGen as _nglViewerGen} from './utils/ngl-viewer-gen';

import {IPdbHelper, NglGlServiceBase} from '@datagrok-libraries/bio';
import {TwinPviewer} from './viewers/twin-p-viewer';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {PROPS as nglPROPS, NglViewer} from './viewers/ngl-viewer';
import {NglViewerApp} from './apps/ngl-viewer-app';
import {TAGS as pdbTAGS} from '@datagrok-libraries/bio/src/pdb';
import {PdbHelper} from './utils/pdb-helper';
import {PdbApp} from './apps/pdb-app';
import {nglViewUI, nglWidgetUI} from './viewers/ngl-ui';

export const _package = new DG.Package();

//name: pdbCellRenderer
//tags: cellRenderer
//meta.cellType: Molecule3D
//meta.columnTags: quality=Molecule3D
//output: grid_cell_renderer result
export function Molecule3dCellRenderer(): PdbRenderer {
  return new PdbRenderer();
}

//name: Docking
//tags: app
export async function dockingApp() {
  const pi = DG.TaskBarProgressIndicator.create('Opening BioStructure Viewer');
  try {
    const app = new DockingApp();
    await app.init();
  } finally {
    pi.close();
  }
}

//name: Mol* BioStructure Viewer Id.
//tags: viewer
//input: string pdbID
export async function molstarViewId(pdbID: string) {
  const pi = DG.TaskBarProgressIndicator.create('Opening BioStructure* Viewer Id');
  await byId(pdbID);
  pi.close();
}

//name: Mol* BioStructure Viewer Data.
//tags: viewer
export async function molstarViewData() {
  const pdbData = await _package.files.readAsText('1bdq.pdb');
  const pi = DG.TaskBarProgressIndicator.create('Opening BioStructure* Viewer Data');
  await byData(pdbData);
  pi.close();
}


type BsvWindowType = Window & {
  $pdbHelper?: IPdbHelper,
  $nglGlService?: NglGlServiceBase,
};
declare const window: BsvWindowType;

//name: getNglGlService
//output: object result
export function getNglGlService(): NglGlServiceBase {
  if (!(window.$nglGlService)) {
    const svc: NglGlService = new NglGlService();
    window.$nglGlService = svc;
  }

  return window.$nglGlService;
}

// -- File handlers --

//name: importPdb
//description: Opens PDB file
//tags: file-handler
//meta.ext: pdb
//input: string fileContent
//output: list tables
export async function importPdb(fileContent: string): Promise<DG.DataFrame[]> {
  const ph: IPdbHelper = new PdbHelper();
  const df: DG.DataFrame = await ph.pdbToDf(fileContent, '');

  const app = new PdbApp();
  await app.init(df);

  return [];
}

// -- File (pre)viewers --

//tags: fileViewer, fileViewer-mol, fileViewer-cif, fileViewer-mcif, fileViewer-mmcif, fileViewer-gro, fileViewer-pdb, fileViewer-ent, fileViewer-pqr, fileViewer-mmtf, fileViewer-mtl, fileViewer-sd
//input: file file
//output: view v
export function molecule3dNglView1(file: any): DG.View {
  return nglViewUI(file);
}

//tags: fileViewer, fileViewer-ply, fileViewer-obj
//input: file file
//output: view v
export function molecule3dNglView2(file: any): DG.View {
  return nglViewUI(file);
}

//tags: fileViewer, fileViewer-prmtop, fileViewer-parm7, fileViewer-psf, fileViewer-top
//input: file file
//output: view v
export function molecule3dNglView3(file: any): DG.View {
  return nglViewUI(file);
}

//tags: fileViewer, fileViewer-dsn6, fileViewer-brix, fileViewer-cube, fileViewer-cub, fileViewer-dx, fileViewer-dxbin, fileViewer-xplor, fileViewer-cns, fileViewer-mrc, fileViewer-map, fileViewer-ccp4
//input: file file
//output: view v
export function molecule3dNglView4(file: any): DG.View {
  return nglViewUI(file);
}

// -- Panel widgets --

//name: PDB id viewer
//tags: panel
//input: string pdbId {semType: PDB_ID}
//output: widget w
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

// -- Viewers --

//name: NglViewer
//description: 3D structure viewer for large biological molecules (proteins, DNA, and RNA)
//tags: viewer, panel
//output: viewer result
export function nglViewer(): DG.JsViewer {
  return new NglViewer();
}

// -- Top menu --

// code pdbViewer moved to utils/pdb-viewer.ts because of annotations in comments

// -- Utils --


//name: getPdbHelper
//output: object result
export function getPdbHelper(): IPdbHelper {
  if (!(window.$pdbHelper)) {
    const ph = new PdbHelper();
    window.$pdbHelper = ph;
  }
  return window.$pdbHelper;
}

export async function nglViewerGen(): Promise<void> {
  _nglViewerGen();
}