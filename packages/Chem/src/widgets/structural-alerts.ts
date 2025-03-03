// This file may not be used in
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
// The file is imported from a WebWorker. Don't use Datagrok imports
import {getRdKitModule, drawMoleculeToCanvas, getRdKitWebRoot} from '../utils/chem-common-rdkit';
import {RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {_convertMolNotation} from '../utils/convert-notation-utils';
import {HIGHLIGHT_BY_SCAFFOLD_TAG} from '../constants';
import {IColoredScaffold} from '../rendering/rdkit-cell-renderer';


let alertsDf: DG.DataFrame | null = null;
const _smartsMap: Map<string, RDMol> = new Map();
let rdKitModule: RDModule | null = null;
const NO_HIGHLIGHT = 0;

export async function getStructuralAlerts(molecule: string): Promise<number[]> {
  console.log(`Entered getStructuralAlerts, alertsDf: ${alertsDf}`);
  if (alertsDf == null)
    await loadSADataset();
  rdKitModule ??= getRdKitModule();

  console.log(`Loaded alertsDf: ${alertsDf?.rowCount}`);

  const alerts: number[] = [];
  let mol: RDMol | null = null;
  try {
    mol = rdKitModule.get_mol(molecule);
    //TODO: use SustructLibrary and count_matches instead. Currently throws an error on rule id 221
    // const lib = new _structuralAlertsRdKitModule.SubstructLibrary();
    // lib.add_smiles(smiles);
    const smartsCol = alertsDf!.getCol('smarts');
    console.log(`smartsCol: ${smartsCol.length}`);
    console.log(`smartsCol, 0: ${smartsCol.get(0)}`);
    console.log(`smartsCol, 1: ${smartsCol.get(1)}`);
    for (let i = 0; i < smartsCol.length; i++) {
      const subMol = _smartsMap.get(smartsCol.get(i));
      // lib.count_matches(subMol);
      const matches = mol.get_substruct_matches(subMol!);
      if (matches !== '{}') {
        alerts.push(i);
        console.log(`********* alert: ${i}`);
      }
    }
  } finally {
    mol?.delete();
  }
  return alerts;
}

async function loadSADataset(): Promise<void> {
  const path = getRdKitWebRoot() + 'files/alert-collection.csv';
  alertsDf = await grok.data.loadTable(path);
  const smartsCol = alertsDf.getCol('smarts');
  rdKitModule ??= getRdKitModule();

  for (let i = 0; i < smartsCol.length; i++) {
    const currentSmarts = smartsCol.get(i);
    _smartsMap.set(currentSmarts, rdKitModule.get_qmol(currentSmarts));
  }
}

export async function structuralAlertsWidget(molecule: string): Promise<DG.Widget> {
  const colors = [NO_HIGHLIGHT].concat(DG.Color.categoricalPalette.slice(0, 10));
  rdKitModule ??= getRdKitModule();
  let alerts = [];
  try {
    console.log(`Entered structuralAlertsWidget, molecule: ${molecule}`);
    alerts = await getStructuralAlerts(molecule);
  } catch (e) {
    console.warn(e);
    return new DG.Widget(ui.divText('Molecule is possibly malformed'));
  }
  if (alerts.length == 0)
    return new DG.Widget(ui.divText('No alerts'));

  const width = 200;
  const height = 100;
  const descriptionCol = alertsDf!.getCol('description');
  const smartsCol = alertsDf!.getCol('smarts');
  const calcForWholeButton = ui.button('Calculate for whole dataset', async () => {
    const alertsFunc = DG.Func.find({package: 'Chem', name: 'structuralAlertsTopMenu'})[0];
    const alertsFuncCall = alertsFunc.prepare();
    ui.dialog('Structural alers')
      .add(await alertsFuncCall.getEditor())
      .onOK(() => {
        const args: any = {};
        Object.entries(alertsFuncCall.inputs).forEach(([key, val]) => args[key] = val);
        alertsFunc.apply(args);
      })
      .show({center: true});
  });
  calcForWholeButton.style.justifyContent = 'flex-start';
  const list = ui.div(alerts.map((i) => {
    const description = ui.divText(descriptionCol.get(i));
    const imageHost = ui.canvas(width, height);
    //in case molecule is smiles setting correct coordinates to save molecule orientation
    if (!DG.chem.isMolBlock(molecule))
      molecule = _convertMolNotation(molecule, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock, rdKitModule!);
    drawMoleculeToCanvas(0, 0, width, height, imageHost, molecule, smartsCol.get(i));
    const moreBtn = ui.iconFA(
      'ellipsis-v',
      (e: MouseEvent) => {
        e.stopImmediatePropagation();
        const menu = DG.Menu.popup();
        menu.group('Highlight fragment')
          .items(colors.map((color) => ui.tools.click(getColoredDiv(color), () => {
            const substr = smartsCol.get(i);
            const col = grok.shell.tv.dataFrame.currentCol;
            const array: IColoredScaffold[] = col.getTag(HIGHLIGHT_BY_SCAFFOLD_TAG) ?
              JSON.parse(col.getTag(HIGHLIGHT_BY_SCAFFOLD_TAG)) : [];
            const substrIdx = array.findIndex((it) => it.molecule === substr);
            if (substrIdx !== -1) {
              if (color !== NO_HIGHLIGHT)
                array[substrIdx].color = DG.Color.toHtml(color)!;
              else
                array.splice(substrIdx, 1);
            } else {
              if (color !== NO_HIGHLIGHT)
                array.push({molecule: smartsCol.get(i), color: DG.Color.toHtml(color)!});
            }
            col.setTag(HIGHLIGHT_BY_SCAFFOLD_TAG, JSON.stringify(array));
            grok.shell.tv.dataFrame?.fireValuesChanged();
          })), () => { });
        /*           menu.item('Filter by alert', () => {
            filterByAlert(grok.shell.tv.dataFrame.currentCol, smartsCol.get(i));
          }) */
        menu.show();
      },
      'More',
    );
    $(moreBtn).addClass('chem-mol-view-icon pep-more-icon');
    const host = ui.div([description,
      ui.divV([moreBtn, imageHost], 'chem-mol-box struct-alerts-mol-box')], 'd4-flex-col');
    host.style.margin = '5px';
    return host;
  }), {classes: 'd4-flex-wrap chem-search-panel-wrapper'});

  return new DG.Widget(ui.divV([calcForWholeButton, ui.box(list)]));
}

function getColoredDiv(color: number): HTMLDivElement {
  return color === NO_HIGHLIGHT ?
    ui.div('None', {style: {width: '100%', minHeight: '20px', marginLeft: '2px'}}) :
    ui.div('', {style:
      {width: '100%', minHeight: '20px', marginRight: '6px', backgroundColor: DG.Color.toHtml(color)}});
}

function filterByAlert(molCol: DG.Column, alert: string): void {
  const tv = grok.shell.tv;
  //@ts-ignore
  const filterState =
    tv.getFiltersGroup({createDefaultFilters: false}).getStates(molCol.name, 'Chem:scaffoldTreeFilter');
  let newScaffoldTree = [{scaffold: alert}];
  if (filterState.length) {
    // @ts-ignore
    newScaffoldTree = JSON.parse(filterState[0].savedTree);
    if (newScaffoldTree.findIndex((it: any) => it.scaffold === alert) !== -1)
      grok.shell.warning(`Structure already added to filter`);
    else
      newScaffoldTree = newScaffoldTree.concat([{scaffold: alert}]);
  }
  tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: 'Chem:scaffoldTreeFilter',
    column: molCol.name,
    columnName: molCol.name,
    savedTree: JSON.stringify(newScaffoldTree),
  });
}
