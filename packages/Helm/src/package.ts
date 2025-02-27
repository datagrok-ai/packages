/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';

import {testEvent} from '@datagrok-libraries/utils/src/test';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {getSeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';
import {App, HweWindow} from '@datagrok-libraries/bio/src/helm/types';
import {HelmInputBase, IHelmHelper, IHelmInputInitOptions} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {HelmServiceBase} from '@datagrok-libraries/bio/src/viewers/helm-service';
import {getMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';

import {getPropertiesWidget} from './widgets/properties-widget';
import {HelmGridCellRenderer, HelmGridCellRendererBack} from './utils/helm-grid-cell-renderer';
import {_getHelmService, HelmPackage} from './package-utils';
import {HelmHelper} from './helm-helper';
import {getRdKitModule} from '@datagrok-libraries/bio/src/chem/rdkit-module';

// Do not import anything than types from @datagrok/helm-web-editor/src/types
import type {JSDraw2Module, OrgHelmModule, ScilModule} from './types';

export const _package = new HelmPackage(/*{debug: true}/**/);

/*
  Loading modules:
  Through Helm/package.json/sources section
    dojo from ajax.googleapis.com
    HELMWebEditor
      JSDraw.Lite is embedded into HELMWebEditor bundle (dist/package.js)
 */

declare const window: Window & HweWindow;
declare const scil: ScilModule;
declare const JSDraw2: JSDraw2Module;
declare const org: OrgHelmModule;

let initHelmPromise: Promise<void> | null = null;

//tags: init
export async function initHelm(): Promise<void> {
  if (initHelmPromise === null)
    initHelmPromise = initHelmInt();
  return initHelmPromise;
}

async function initHelmInt(): Promise<void> {
  const logPrefix: string = 'Helm: _package.initHelm()';
  _package.logger.debug(`${logPrefix}, start`);

  try {
    // order of things is very important
    await getRdKitModule();
    const seqHelper = await getSeqHelper();
    const libHelper = await getMonomerLibHelper();
    await _package.initHELMWebEditor();
    const helmHelper: IHelmHelper = new HelmHelper(seqHelper, _package.logger);
    _package.completeInit(helmHelper, libHelper);
  } catch (err: any) {
    const [errMsg, errStack] = errInfo(err);
    // const errMsg: string = err instanceof Error ? err.message : !!err ? err.toString() : 'Exception \'undefined\'';
    grok.shell.error(`Package \'Helm\' init error:\n${errMsg}`);
    const errRes = new Error(`${logPrefix} error:\n  ${errMsg}\n${errStack}`);
    errRes.stack = errStack;
    throw errRes;
  } finally {
    _package.logger.debug(`${logPrefix}, finally`);
  }
  _package.logger.debug(`${logPrefix}, end`);
}

//name: getHelmService
//description: Helm renderer service
//output: object result
export async function getHelmService(): Promise<HelmServiceBase> {
  return _getHelmService();
}

//name: helmCellRenderer
//tags: cellRenderer
//meta.cellType: helm
//meta.columnTags: quality=Macromolecule, units=helm
//output: grid_cell_renderer result
export function helmCellRenderer(): DG.GridCellRenderer {
  const logPrefix = `Helm: _package.getHelmCellRenderer()`;
  _package.logger.debug(`${logPrefix}, start`);
  // return new HelmCellRenderer(); // old
  return new HelmGridCellRenderer(); // new
}

function checkMonomersAndOpenWebEditor(cell: DG.GridCell, value?: string, units?: string) {
  openWebEditor(cell, value, units);
}

//tags: cellEditor
//description: Macromolecule
//input: grid_cell cell
//meta.columnTags: quality=Macromolecule, units=helm
export function editMoleculeCell(cell: DG.GridCell): void {
  checkMonomersAndOpenWebEditor(cell, undefined, undefined);
}

//name: Edit Helm...
//description: Adds editor
//meta.action: Edit Helm...
//input: semantic_value mol { semType: Macromolecule }
export function openEditor(mol: DG.SemanticValue): void {
  const df = grok.shell.tv.grid.dataFrame;
  const col = df.columns.bySemType('Macromolecule')! as DG.Column<string>;
  const colSh = _package.seqHelper.getSeqHandler(col);
  const colUnits = col.meta.units;
  if (df.currentRowIdx === -1)
    return;
  const gCell = DG.GridCell.fromColumnRow(grok.shell.tv.grid, col.name, df.currentRowIdx);
  if (colUnits === NOTATION.HELM)
    checkMonomersAndOpenWebEditor(gCell, undefined, undefined);
  else {
    const convert = colSh.getConverter(NOTATION.HELM);
    const helmMol = convert(mol.value);
    checkMonomersAndOpenWebEditor(gCell, helmMol, col.meta.units!);
  }
}

//name: Properties
//tags: panel, bio, helm, widgets
//input: semantic_value sequence {semType: Macromolecule}
//output: widget result
export function propertiesWidget(sequence: DG.SemanticValue): DG.Widget {
  return getPropertiesWidget(sequence);
}

function openWebEditor(cell: DG.GridCell, value?: string, units?: string) {
  const view = ui.div();
  // const df = grok.shell.tv.grid.dataFrame;
  // const col = df.columns.bySemType('Macromolecule')!
  const col = cell.cell.column as DG.Column<string>;
  const sh = _package.seqHelper.getSeqHandler(col);
  const app: App =
    _package.helmHelper.createWebEditorApp(view, !!cell && units === undefined ? cell.cell.value : value!);
  const dlg = ui.dialog({showHeader: false, showFooter: true});
  dlg.add(view)
    .onOK(() => {
      const helmValue: string = app.canvas!.getHelm(true).replace(/<\/span>/g, '')
        .replace(/<span style='background:#bbf;'>/g, '');
      if (!!cell) {
        if (units === undefined)
          cell.setValue(helmValue);
        else {
          const convertedRes = sh.convertHelmToFastaSeparator(helmValue, units!, sh.separator);
          cell.setValue(convertedRes);
        }
      }
    }).show({modal: true, fullScreen: true});

  // Quick fix for full screen dialog
  const dlgCntDiv = $(dlg.root).find('div').get()[0] as HTMLDivElement;
  dlgCntDiv.className = dlgCntDiv.className.replace('dlg- ui-form', 'dlg-ui-form');
}

//name: getMolfiles
//input: column col {semType: Macromolecule}
//output: column res
export function getMolfiles(col: DG.Column<string>): DG.Column<string> {
  const helmStrList = col.toList();
  const molfileList = _package.helmHelper.getMolfiles(helmStrList);
  const molfileCol = DG.Column.fromStrings('mols', molfileList);
  return molfileCol;
}

// -- Inputs --

//name: helmInput
//tags: valueEditor
//meta.propertyType: string
//meta.semType: Macromolecule
//input: string name =undefined {optional: true}
//input: object options =undefined {optional: true}
//output: object result
export function helmInput(name: string, options: IHelmInputInitOptions): HelmInputBase {
  // TODO: Annotate for semType = 'Macromolecule' AND units = 'helm'
  return _package.helmHelper.createHelmInput(name, options);
}

// -- Utils --

//name: getHelmHelper
//output: object result
export function getHelmHelper(): IHelmHelper {
  return _package.helmHelper;
}

//name: measureCellRenderer
export async function measureCellRenderer(): Promise<void> {
  const grid = grok.shell.tv.grid;
  const gridCol = grid.columns.byName('sequence')!;
  const back = gridCol.temp.rendererBack as HelmGridCellRendererBack;

  let etSum: number = 0;
  let etCount: number = 0;
  for (let i = 0; i < 20; ++i) {
    const t1 = window.performance.now();
    let t2: number;
    if (!back.cacheEnabled) {
      await testEvent(back.onRendered, () => {
        t2 = window.performance.now();
        _package.logger.info(`measureCellRenderer() cache disabled , ET: ${t2 - t1} ms`);
      }, () => {
        back.invalidate(); // grid.invalidate();
      }, 5000);
    } else {
      await testEvent(grid.onAfterDrawContent, () => {
        t2 = window.performance.now();
        _package.logger.info(`measureCellRenderer() cache enabled, ET: ${t2! - t1} ms`);
      }, () => {
        grid.invalidate();
      }, 5000);
    }

    etSum += (t2! - t1);
    etCount++;
  }
  _package.logger.info(`measureCellRenderer(), avg ET: ${etSum / etCount} ms`);
}

// -- Test apps --

//name: Highlight Monomers
//output: view result
export async function highlightMonomers(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Test app highlight monomers');
  try {
    const df = await _package.files.readCsv('tests/peptide.csv');
    df.name = 'peptide.csv';
    await initHelmPromise;

    const seqCol = df.columns.byName('helm')!;
    await grok.data.detectSemanticTypes(df);
    await grok.functions.call('Bio:toAtomicLevel', {table: df, seqCol: seqCol, nonlinear: true, highlight: true});

    // const resView = DG.TableView.create(df, false);
    // return resView;
    grok.shell.addTableView(df);
  } finally {
    pi.close();
  }
}
