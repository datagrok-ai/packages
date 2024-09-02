/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';

import {testEvent} from '@datagrok-libraries/utils/src/test';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {SeqHandler} from '@datagrok-libraries/bio/src/utils/seq-handler';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';
import {App, Editor, HelmMol, HelmType, HweWindow} from '@datagrok-libraries/bio/src/helm/types';
import {HelmInputBase, IHelmHelper, IHelmInputInitOptions} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {HelmServiceBase} from '@datagrok-libraries/bio/src/viewers/helm-service';
import {getMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';

import {HelmCellRenderer} from './cell-renderer';
import {HelmHelper} from './helm-helper';
import {getPropertiesWidget} from './widgets/properties-widget';
import {HelmGridCellRenderer, HelmGridCellRendererBack} from './utils/helm-grid-cell-renderer';
import {_getHelmService, HelmPackage, initHelmLoadAndPatchDojo} from './package-utils';
import {RGROUP_CAP_GROUP_NAME, RGROUP_LABEL, SMILES} from './constants';
import {getRS} from './utils/get-monomer-dummy';

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

//tags: init
export async function initHelm(): Promise<void> {
  const logPrefix: string = 'Helm: _package.initHelm()';
  _package.logger.debug(`${logPrefix}, start`);

  try {
    const [_, libHelper] = await Promise.all([
      _package.initHELMWebEditor(),
      getMonomerLibHelper(),
    ]);

    _package.logger.debug(`${logPrefix}, lib loaded`);
    _package.initMonomerLib(libHelper);
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
//output: object result
export function getHelmService(): HelmServiceBase {
  return _getHelmService();
}

//name: helmCellRenderer
//tags: cellRenderer
//meta.cellType: helm
//meta.columnTags: quality=Macromolecule, units=helm
//output: grid_cell_renderer result
export function helmCellRenderer(): HelmCellRenderer {
  const logPrefix = `Helm: _package.getHelmCellRenderer()`;
  _package.logger.debug(`${logPrefix}, start`);
  // return new HelmCellRenderer(); // old
  return new HelmGridCellRenderer(); // new
}

function checkMonomersAndOpenWebEditor(cell: DG.Cell, value?: string, units?: string) {
  openWebEditor(cell, value, units);
}

//tags: cellEditor
//description: Macromolecule
//input: grid_cell cell
//meta.columnTags: quality=Macromolecule, units=helm
export function editMoleculeCell(cell: DG.GridCell): void {
  checkMonomersAndOpenWebEditor(cell.cell, undefined, undefined);
}

//name: Open Helm Web Editor
//description: Adds editor
//meta.action: Open Helm Web Editor
//input: string mol { semType: Macromolecule }
export function openEditor(mol: string): void {
  const df = grok.shell.tv.grid.dataFrame;
  const col = df.columns.bySemType('Macromolecule')! as DG.Column<string>;
  const colSh = SeqHandler.forColumn(col);
  const colUnits = col.meta.units;
  if (colUnits === NOTATION.HELM)
    checkMonomersAndOpenWebEditor(df.currentCell, undefined, undefined);
  const convert = colSh.getConverter(NOTATION.HELM);
  const helmMol = convert(mol);
  checkMonomersAndOpenWebEditor(df.currentCell, helmMol, col.meta.units!);
}

//name: Properties
//tags: panel, bio, helm, widgets
//input: semantic_value sequence {semType: Macromolecule}
//output: widget result
export function propertiesWidget(sequence: DG.SemanticValue): DG.Widget {
  return getPropertiesWidget(sequence);
}

function openWebEditor(cell: DG.Cell, value?: string, units?: string) {
  const view = ui.div();
  // const df = grok.shell.tv.grid.dataFrame;
  // const col = df.columns.bySemType('Macromolecule')!;
  const col = cell.column as DG.Column<string>;
  const sh = SeqHandler.forColumn(col);
  const rowIdx = cell.rowIndex;
  const app: App = _package.helmHelper.createWebEditorApp(view, !!cell && units === undefined ? cell.value : value!);
  const dlg = ui.dialog({showHeader: false, showFooter: true});
  dlg.add(view)
    .onOK(() => {
      const helmValue: string = app.canvas!.getHelm(true).replace(/<\/span>/g, '')
        .replace(/<span style='background:#bbf;'>/g, '');
      if (!!cell) {
        if (units === undefined)
          cell.value = helmValue;
        else {
          const convertedRes = sh.convertHelmToFastaSeparator(helmValue, units!, sh.separator);
          cell.value = convertedRes;
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
export async function getHelmHelper(): Promise<IHelmHelper> {
  return _package.helmHelper;
}

//name: measureCellRenderer
export async function measureCellRenderer(): Promise<void> {
  const grid = grok.shell.tv.grid;
  const gridCol = grid.columns.byName('sequence')!;
  const back = gridCol.temp['rendererBack'] as HelmGridCellRendererBack;

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
