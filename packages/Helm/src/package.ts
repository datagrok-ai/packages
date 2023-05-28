/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {WebEditorMonomer, RGROUP_CAP_GROUP_NAME, RGROUP_LABEL, SMILES} from './constants';
import {HelmWebEditor} from './helm-web-editor';
import {HelmCellRenderer} from './cell-renderer';
import {IMonomerLib, Monomer} from '@datagrok-libraries/bio/src/types';
import {NotationConverter} from '@datagrok-libraries/bio/src/utils/notation-converter';
import {findMonomers} from './utils';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';

export const _package = new DG.Package();
let monomerLib: IMonomerLib | null = null;

//tags: init
export async function initHelm(): Promise<void> {
  return Promise.all([new Promise((resolve, reject) => {
    // @ts-ignore
    dojo.ready(function() { resolve(null); });
  }), await grok.functions.call('Bio:getBioLib')]).then(([_, lib]: [void, IMonomerLib]) => {
    monomerLib = lib;
    rewriteLibraries(); // initHelm()
    monomerLib.onChanged.subscribe((_) => {
      try {
        rewriteLibraries(); // initHelm()

        const polymerTypeList: string[] = monomerLib.getPolymerTypes();
        const msgStr: string = 'Monomer lib updated:<br />' + (
          polymerTypeList.length == 0 ? 'empty' : polymerTypeList.map((polymerType) => {
            return `${polymerType} ${monomerLib.getMonomerSymbolsByType(polymerType).length}`;
          }).join('<br />'));

        grok.shell.info(msgStr);
      } catch (err: any) {
        const errMsg = errorToConsole(err);
        console.error('Helm: initHelm monomerLib.onChanged() error:\n' + errMsg);
        // throw err; // Prevent disabling event handler
      }
    });
  });
}

function rewriteLibraries() {
  org.helm.webeditor.Monomers.clear();
  monomerLib.getPolymerTypes().forEach((polymerType) => {
    const monomerSymbols = monomerLib.getMonomerSymbolsByType(polymerType);
    monomerSymbols.forEach((monomerSymbol) => {
      let isBroken = false;
      const monomer: Monomer = monomerLib.getMonomer(polymerType, monomerSymbol);
      const webEditorMonomer: WebEditorMonomer = {
        id: monomerSymbol,
        m: monomer.molfile,
        n: monomer.name,
        na: monomer.naturalAnalog,
        rs: monomer.rgroups.length,
        type: monomer.polymerType,
        mt: monomer.monomerType,
        at: {}
      };

      if (monomer.rgroups.length > 0) {
        webEditorMonomer.rs = monomer.rgroups.length;
        const at = {};
        monomer.rgroups.forEach((it) => {
          at[it[RGROUP_LABEL]] = it[RGROUP_CAP_GROUP_NAME];
        });
        webEditorMonomer.at = at;
      } else if (monomer[SMILES] != null) {
        webEditorMonomer.rs = Object.keys(getRS(monomer[SMILES].toString())).length;
        webEditorMonomer.at = getRS(monomer[SMILES].toString());
      } else {
        isBroken = true;
      }

      if (!isBroken)
        org.helm.webeditor.Monomers.addOneMonomer(webEditorMonomer);
    });
  });

  // Obsolete
  const grid: DG.Grid = grok.shell.tv.grid;
  if (grid) grid.invalidate();
}

//name: helmCellRenderer
//tags: cellRenderer
//meta.cellType: helm
//meta.columnTags: units=helm
//output: grid_cell_renderer result
export function helmCellRenderer(): HelmCellRenderer {
  return new HelmCellRenderer();
}

function checkMonomersAndOpenWebEditor(cell?: DG.Cell, value?: string, units?: string) {
  const cellValue = typeof units === 'undefined' ? cell.value : value;
  const monomers = findMonomers(cellValue);
  if (monomers.size == 0) {
    webEditor(cell, value, units);
  } else {
    grok.shell.warning(`Monomers ${Array.from(monomers).join(', ')} are absent! <br/>` +
    `Please, upload the monomer library! <br/>` +
    `<a href="https://datagrok.ai/help/domains/bio/macromolecules" target="_blank">Learn more</a>`);
  }
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
  const col = df.columns.bySemType('Macromolecule');
  const colUnits = col.getTag(DG.TAGS.UNITS);
  if (colUnits === NOTATION.HELM)
    checkMonomersAndOpenWebEditor(df.currentCell, undefined, undefined);
  const converter = new NotationConverter(col);
  const resStr = converter.convertStringToHelm(mol, '/');
  checkMonomersAndOpenWebEditor(df.currentCell, resStr, col.getTag(DG.TAGS.UNITS));
}

//name: Properties
//tags: panel, widgets
//input: string helmString {semType: Macromolecule}
//output: widget result
export async function propertiesPanel(helmString: string) {
  const grid = grok.shell.tv.grid;
  const parent = grid.root.parentElement;
  const host = ui.div([]);
  parent.appendChild(host);
  const editor = new JSDraw2.Editor(host, {viewonly: true});
  host.style.width = '0px';
  host.style.height = '0px';
  editor.setHelm(helmString);
  const formula = editor.getFormula(true);
  const molWeight = Math.round(editor.getMolWeight() * 100) / 100;
  const coef = Math.round(editor.getExtinctionCoefficient(true) * 100) / 100;
  parent.lastChild.remove();
  return new DG.Widget(
    ui.tableFromMap({
      'formula': formula.replace(/<sub>/g, '').replace(/<\/sub>/g, ''),
      'molecular weight': molWeight,
      'extinction coefficient': coef,
    })
  );
}

function webEditor(cell?: DG.Cell, value?: string, units?: string) {
  const view = ui.div();
  const df = grok.shell.tv.grid.dataFrame;
  const converter = new NotationConverter(df.columns.bySemType('Macromolecule'));
  org.helm.webeditor.MolViewer.molscale = 0.8;
  const app = new scil.helm.App(view, {
    showabout: false,
    mexfontsize: '90%',
    mexrnapinontab: true,
    topmargin: 20,
    mexmonomerstab: true,
    sequenceviewonly: false,
    mexfavoritefirst: true,
    mexfilter: true
  });
  const sizes = app.calculateSizes();
  app.canvas.resize(sizes.rightwidth - 100, sizes.topheight - 210);
  let s = {width: sizes.rightwidth - 100 + 'px', height: sizes.bottomheight + 'px'};
  //@ts-ignore
  scil.apply(app.sequence.style, s);
  //@ts-ignore
  scil.apply(app.notation.style, s);
  s = {width: sizes.rightwidth + 'px', height: (sizes.bottomheight + app.toolbarheight) + 'px'};
  //@ts-ignore
  scil.apply(app.properties.parent.style, s);
  app.structureview.resize(sizes.rightwidth, sizes.bottomheight + app.toolbarheight);
  app.mex.resize(sizes.topheight - 80);
  setTimeout(() => {
    if (typeof units === 'undefined')
      app.canvas.helm.setSequence(cell.value, 'HELM');
    else
      app.canvas.helm.setSequence(value, 'HELM');
  }, 200);
  //@ts-ignore
  ui.dialog({showHeader: false, showFooter: true})
    .add(view)
    .onOK(() => {
      const helmValue = app.canvas.getHelm(true).replace(/<\/span>/g, '')
        .replace(/<span style='background:#bbf;'>/g, '');
      if (typeof units === 'undefined') {
        cell.value = helmValue;
      } else {
        const convertedRes = converter.convertHelmToFastaSeparator(helmValue, units);
        cell.value = convertedRes;
      }
    }).show({modal: true, fullScreen: true});
}

function getRS(smiles: string) {
  const newS = smiles.match(/(?<=\[)[^\][]*(?=])/gm);
  const res = {};
  let el = '';
  let digit;
  for (let i = 0; i < newS.length; i++) {
    if (newS[i] != null) {
      if (/\d/.test(newS[i])) {
        digit = newS[i][newS[i].length - 1];
        newS[i] = newS[i].replace(/[0-9]/g, '');
        for (let j = 0; j < newS[i].length; j++) {
          if (newS[i][j] != ':')
            el += newS[i][j];
        }
        res['R' + digit] = el;
        el = '';
      }
    }
  }
  return res;
}

//name: getMolfiles
//input: column col {semType: Macromolecule}
//output: column res
export function getMolfiles(col: DG.Column): DG.Column {
  const grid = grok.shell.tv.grid;
  const parent = grid.root.parentElement;
  const res = DG.Column.string('mols', col.length);
  const host = ui.div([]);
  parent.appendChild(host);
  const editor = new JSDraw2.Editor(host, {viewonly: true});
  host.style.width = '0px';
  host.style.height = '0px';
  res.init((i) => {
    editor.setHelm(col.get(i));
    const mol = editor.getMolfile();
    return mol;
  });
  parent.lastChild.remove();
  return res;
}

//name: helmWebEditor
//output: object
export function helmWebEditor(): HelmWebEditor {
  return new HelmWebEditor();
}
