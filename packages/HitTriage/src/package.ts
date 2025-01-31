/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {HitTriageApp} from './app/hit-triage-app';
import {HitDesignApp} from './app/hit-design-app';
import {GasteigerPngRenderer} from './pngRenderers';
import {loadCampaigns} from './app/utils';
import {AppName} from './app';
import {PeptiHitApp} from './app/pepti-hit-app';
import {PeptiHitHelmColName} from './app/consts';
import {htPackageSettingsEditorWidget} from './packageSettingsEditor';
// import {loadCampaigns} from './app/utils';

export class HTPackage extends DG.Package {
  molToSmilesLruCache = new DG.LruCache<string, string>(2000);

  convertToSmiles(mol: string): string {
    if (!mol)
      return '';
    return this.molToSmilesLruCache.getOrCreate(mol,
      (mol) => grok.chem.convert(mol, grok.chem.Notation.Unknown, grok.chem.Notation.Smiles),
    );
  }
}

export const _package = new HTPackage();

async function hitAppTB(treeNode: DG.TreeViewGroup, browseView: any, name: AppName) {// TODO: DG.BrowseView
  const loaderDiv = ui.div([], {style: {width: '50px', height: '24px', position: 'relative'}});
  loaderDiv.innerHTML = `<div class="grok-loader"><div></div><div></div><div></div><div></div></div>`;
  const loaderItem = treeNode.item(loaderDiv);
  const camps = await loadCampaigns(name, []);

  for (const [_, camp] of Object.entries(camps)) {
    const savePath = 'ingest' in camp ? camp.ingest.query : camp.savePath;
    if (!savePath || !(await grok.dapi.files.exists(savePath)))
      continue;
    const node = treeNode.item(camp.friendlyName ?? camp.name);
    node.onSelected.subscribe(async (_) => {
      try {
        const df = await grok.dapi.files.readCsv(savePath);
        if (!df)
          return;
        const semtypeInfo = camp.columnSemTypes;
        if (semtypeInfo) {
          for (const [colName, semType] of Object.entries(semtypeInfo)) {
            const col = df.columns.byName(colName);
            if (col) {
              col.semType = semType;
              if (semType === DG.SEMTYPE.MACROMOLECULE && colName === PeptiHitHelmColName) {
                col.setTag('units', 'helm');
                col.setTag('.alphabetIsMultichar', 'true');
                col.setTag('cell.renderer', 'helm');
              }
            }
          }
        }
        const tv = DG.TableView.create(df, false);
        browseView.preview = tv;
        const layout = camp.layout;
        if (layout)
          tv.loadLayout(DG.ViewLayout.fromViewState(layout));
      } catch (e) {
        console.error(e);
      }
    });
  }
  loaderItem.remove();
}

//input: dynamic treeNode
//input: view browseView
export async function hitTriageAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: any) {// TODO: DG.BrowseView
  await hitAppTB(treeNode, browseView, 'Hit Triage');
}

//input: dynamic treeNode
//input: view browseView
export async function hitDesignAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: any) {// TODO: DG.BrowseView
  await hitAppTB(treeNode, browseView, 'Hit Design');
}

//input: dynamic treeNode
//input: view browseView
export async function peptiHitAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: any) {// TODO: DG.BrowseView
  await hitAppTB(treeNode, browseView, 'PeptiHit');
}

//tags: app
//name: Hit Triage
//output: view v
//meta.browsePath: Chem
export async function hitTriageApp(): Promise<DG.ViewBase> {
  const c = grok.functions.getCurrentCall();
  return new HitTriageApp(c).multiView;
}

//tags: app
//name: Hit Design
//meta.icon: images/icons/hit-design-icon.png
//output: view v
//meta.browsePath: Chem
export async function hitDesignApp(): Promise<DG.ViewBase> {
  const c = grok.functions.getCurrentCall();
  return new HitDesignApp(c).multiView;
}

//tags: app
//name: PeptiHit
//meta.icon: images/icons/pepti-hit-icon.png
//output: view v
//meta.browsePath: Peptides
export async function peptiHitApp(): Promise<DG.ViewBase> {
  const c = grok.functions.getCurrentCall();
  await grok.functions.call('Bio:initBio', {});
  return new PeptiHitApp(c).multiView;
}

//name: Demo Molecules 100
//tags: HitTriageDataSource
//output: dataframe result
export async function demoFileIngest(): Promise<DG.DataFrame> {
  const df = grok.data.demo.molecules(100);
  df.name = '100 Molecules';
  return df;
}

//name: Demo Molecules 5000
//tags: HitTriageDataSource
//output: dataframe result
export async function demoFileIngest1(): Promise<DG.DataFrame> {
  const df = grok.data.demo.molecules(5000);
  df.name = '5000 Molecules';
  return df;
}

//name: Demo Molecules variable
//input: int numberOfMolecules [Molecules count]
//tags: HitTriageDataSource
//output: dataframe result
export async function demoFileIngest2(numberOfMolecules: number): Promise<DG.DataFrame> {
  const df = grok.data.demo.molecules(numberOfMolecules);
  df.name = 'Variable Molecules number';
  return df;
}

//name: Demo File Submit
//tags: HitTriageSubmitFunction
//input: dataframe df [Dataframe]
//input: string molecules [Molecules column name]
export async function demoFileSubmit(df: DG.DataFrame, molecules: string): Promise<void> {
  grok.shell.info(df.rowCount);
  grok.shell.info(molecules);
}

// //name: Gasteiger Partial Charges
// //top-menu: Chem | Gasteiger
// //tags: HitTriageFunction
// //input: dataframe table [Input data table] {caption: Table}
// //input: column molecules {caption: Molecules; type: categorical; semType: Molecule}
// //input: int contours = 4 {caption: Contours;}
// //output: dataframe result
// export async function gasteigerPartialCharges(
//   table: DG.DataFrame, molecules: DG.Column, contours: number = 4): Promise<DG.DataFrame> {
//   const newColName = table.columns.getUnusedName('Gasteiger Partial Charges');
//   const newCol = table.columns.addNew(newColName, 'string');
//   newCol.semType = 'customGasteigerPNG';
//   for (let i = 0; i < molecules.length; i++) {
//     const mol = molecules.get(i);
//     if (mol === null)
//       continue;
//     const p = {mol, contours: contours};
//     const res = await grok.functions.call('Chem:ChemistryGasteigerPartialCharges', p);
//     newCol.set(i, res);
//   }
//   return table;
// }

//name: gasteigerRenderer
//tags: cellRenderer
//meta.cellType: customGasteigerPNG
//meta.columnTags: quality=customGasteigerPNG
//output: grid_cell_renderer result
export function gasteigerCellRenderer(): GasteigerPngRenderer {
  return new GasteigerPngRenderer();
}

//name: Hit Triage package settings editor
//tags: packageSettingsEditor
//input: object propList
//output: widget result
export async function htPackageSettingEditor(properties: DG.Property[]) {
  return htPackageSettingsEditorWidget(properties);
}
