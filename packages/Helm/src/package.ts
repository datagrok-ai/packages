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
import {App, HweWindow} from '@datagrok-libraries/bio/src/helm/types';
import {IHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';
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
import {buildWebEditorApp} from './helm-web-editor';
import {JSDraw2HelmModule, OrgHelmModule, ScilModule} from './types';

export const _package = new HelmPackage();

let monomerLib: IMonomerLib | null = null;

/*
  Loading modules:
  Through Helm/package.json/sources section
    dojo from ajax.googleapis.com
    HELMWebEditor
      JSDraw.Lite is embedded into HELMWebEditor bundle (dist/package.js)
 */

declare const window: Window & HweWindow;
declare const scil: ScilModule;
declare const JSDraw2: JSDraw2HelmModule;
declare const org: OrgHelmModule;

//tags: init
export async function initHelm(): Promise<void> {
  const logPrefix: string = 'Helm: _package.initHelm()';
  _package.logger.debug(`${logPrefix}, start`);

  try {
    const [_, lib]: [void, IMonomerLib] = await Promise.all([
      Promise.all([
        new Promise<void>((resolve, reject) => {
          // @ts-ignore
          // try { dojo.ready(function() { resolve(null); }); } catch (err: any) { reject(err); }
          resolve();
        }),
        (async () => {
          _package.logger.debug(`${logPrefix}, dependence loading …`);
          const t1: number = performance.now();

          _package.logger.debug(`${logPrefix}, dojox loading and patching …`);
          await initHelmLoadAndPatchDojo();
          _package.logger.debug(`${logPrefix}, dojox loaded and patched`);

          // through webpack.config.ts/alias
          require('vendor/helm-web-editor');

          _package.logger.debug(`${logPrefix}, HelmWebEditor awaiting …`);
          await window.helmWebEditor$.initPromise;
          _package.logger.debug(`${logPrefix}, HelmWebEditor loaded`);
          org.helm.webeditor.kCaseSensitive = true; // GROK-13880

          _package.logger.debug(`${logPrefix}, scil.Utils.alert patch`);
          _package.initHelmPatchScilAlert(); // patch immediately

          const t2: number = performance.now();
          _package.logger.debug(`${logPrefix}, dependence loaded, ET: ${(t2 - t1)} ms`);
        })()
      ]).then(() => {

        // settings
      }),
      (async () => {
        const libHelper = await getMonomerLibHelper();
        return libHelper.getBioLib();
      })()
    ]);

    _package.logger.debug(`${logPrefix}, then(), lib loaded`);
    monomerLib = lib;
    // rewriteLibraries(); // initHelm()
    await _package.initHelmPatchPistoia(monomerLib);

    monomerLib.onChanged.subscribe((_) => {
      const logPrefixInt = `${logPrefix} monomerLib.onChanged()`;
      try {
        const libSummary = monomerLib!.getSummaryObj();
        const isLibEmpty = Object.keys(libSummary).length == 0;
        const libSummaryLog = isLibEmpty ? 'empty' : Object.entries(libSummary)
          .map(([pt, count]) => `${pt}: ${count}`)
          .join(', ');
        _package.logger.debug(`${logPrefixInt}, start, lib: { ${libSummaryLog} }`);

        const libSummaryHtml = isLibEmpty ? 'empty' : Object.entries(libSummary)
          .map(([pt, count]) => `${pt} ${count}`)
          .join('<br />');
        const libMsg: string = `Monomer lib updated:<br /> ${libSummaryHtml}`;
        grok.shell.info(libMsg);

        // _package.logger.debug(`${logPrefixInt}, org,helm.webeditor.Monomers updating ...`);
        // rewriteLibraries(); // initHelm() monomerLib.onChanged()
        // _package.logger.debug(`${logPrefixInt}, end, org.helm.webeditor.Monomers completed`);
      } catch (err: any) {
        const errMsg = errorToConsole(err);
        console.error(`${logPrefixInt} error:\n` + errMsg);
        // throw err; // Prevent disabling event handler
      }
    });
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

export function getMonomerLib(): IMonomerLib | null {
  return monomerLib;
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
  const colUnits = col.getTag(DG.TAGS.UNITS);
  if (colUnits === NOTATION.HELM)
    checkMonomersAndOpenWebEditor(df.currentCell, undefined, undefined);
  const convert = colSh.getConverter(NOTATION.HELM);
  const helmMol = convert(mol);
  checkMonomersAndOpenWebEditor(df.currentCell, helmMol, col.getTag(DG.TAGS.UNITS));
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
  let app: App;
  setTimeout(async () => {
    app = await buildWebEditorApp(view);
    if (!!cell && units === undefined)
      app.canvas.helm.setSequence(cell.value, 'HELM');
    else
      app.canvas.helm.setSequence(value!, 'HELM');
  }, 20);
  const dlg = ui.dialog({showHeader: false, showFooter: true})
    .add(view)
    .onOK(() => {
      const helmValue: string = app.canvas.getHelm(true).replace(/<\/span>/g, '')
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
export function getMolfiles(col: DG.Column): DG.Column {
  const res = DG.Column.string('mols', col.length);

  const host = ui.div([], {style: {width: '0', height: '0'}});
  document.documentElement.appendChild(host);
  try {
    const editor = new JSDraw2.Editor(host, {viewonly: true});
    res.init((i) => {
      editor.setHelm(col.get(i));
      const mol = editor.getMolfile();
      return mol;
    });
    return res;
  } finally {
    $(host).empty();
    host.remove();
  }
}

// -- Utils --

//name: getHelmHelper
//output: object result
export async function getHelmHelper(): Promise<IHelmHelper> {
  return _package.hh;
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
