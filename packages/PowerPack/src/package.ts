/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {welcomeView} from './welcome-view';
import {compareColumns} from './compare-columns';
import {AddNewColumnDialog} from './dialogs/add-new-column';
import {FormulaLinesDialog, DEFAULT_OPTIONS, EditorOptions} from './dialogs/formula-lines';
import {RecentProjectsWidget} from './widgets/recent-projects-widget';
import {CommunityWidget} from './widgets/community-widget';
import {WebWidget} from './widgets/web-widget';
import {LearningWidget} from './widgets/learning-widget';
import {AboutWidget} from './widgets/about-widget';
import {functionSearch, pdbSearch, pubChemSearch, scriptsSearch, usersSearch, wikiSearch} from './search/entity-search';
import {KpiWidget} from './widgets/kpi-widget';
import {HtmlWidget} from './widgets/html-widget';
import {viewersDialog} from './viewers-gallery';
import {windowsManagerPanel} from './windows-manager';
import {initSearch} from './search/power-search';

export const _package = new DG.Package();
export let _properties: { [propertyName: string]: any };

//name: compareColumns
//top-menu: Data | Compare Columns...
export function _compareColumns(): void {
  compareColumns();
}

//name: addNewColumn
//input: funccall call {optional: true}
//editor-for: AddNewColumn
export function addNewColumnDialog(call: DG.FuncCall | null = null): AddNewColumnDialog {
  return new AddNewColumnDialog(call);
}

//name: welcomeView
//meta.autostartImmediate: true
//output: view home
export function _welcomeView(): DG.View | undefined {
  return welcomeView();
}

//output: widget result
//tags: dashboard
export function recentProjectsWidget(): DG.Widget {
  return new RecentProjectsWidget();
}

//output: widget result
//tags: dashboard
export function communityWidget(): DG.Widget {
  return new CommunityWidget();
}

//output: widget result
export function webWidget(): DG.Widget {
  return new WebWidget();
}

//output: widget result
export function htmlWidget(): DG.Widget {
  return new HtmlWidget();
}

//output: widget result
//tags: dashboard
export function learnWidget(): DG.Widget {
  return new LearningWidget();
}

//output: widget about
//tags: dashboard
export function aboutWidget(): DG.Widget {
  return new AboutWidget();
}

//output: widget kpi
export function kpiWidget(): DG.Widget {
  return new KpiWidget();
}

//description: Functions
//tags: search
//input: string s
//output: list result
export function _functionSearch(s: string): Promise<any[]> {
  return functionSearch(s);
}

//description: Scripts
//tags: search
//input: string s
//output: list result
export function _scriptsSearch(s: string): Promise<any[]> {
  return scriptsSearch(s);
}

//description: Users
//tags: search
//input: string s
//output: list result
export function _usersSearch(s: string): Promise<any[]> {
  return usersSearch(s);
}

//description: Protein Data Bank
//tags: search
//input: string s
//output: widget w
export function _pdbSearch(s: string): Promise<any> {
  return pdbSearch(s);
}

//description: PubChem
//tags: search
//input: string s
//output: widget w
export function _pubChemSearch(s: string): Promise<any> {
  return pubChemSearch(s);
}

//description: PubChem
//tags: search
//input: string s
//output: widget w
export function _wikiSearch(s: string): Promise<any> {
  return wikiSearch(s);
}

//name: formulaLinesEditor
//input: dataframe src {optional: grok.shell.o}
//top-menu: Data | Formula Lines...
export function formulaLinesDialog(src: DG.DataFrame | DG.Viewer): FormulaLinesDialog {
  const options = Object.keys(_properties)
    .filter((k) => k in DEFAULT_OPTIONS)
    .reduce((opts, k) => (opts[k] = _properties[k], opts), <EditorOptions>{});
  //TODO: use property's 'category' or 'tags' to distinguish relevant properties
  return new FormulaLinesDialog(src, options);
}

// Adds "Formula Lines" menu group to the Scatter Plot context menu:
grok.events.onContextMenu.subscribe((args) => {
  const src = args.args.context;
  let menu;
  if (src instanceof DG.ScatterPlotViewer ||
      (src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.LINE_CHART))
    menu = args.args.menu.find('Tools');

  if (src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.TRELLIS_PLOT &&
      src.getOptions().look['viewerType'] == DG.VIEWER.SCATTER_PLOT)
    menu = args.args.menu.find('Inner Viewer').find('Tools');

  if (menu != null)
    menu.item('Formula Lines...', () => {formulaLinesDialog(src);});
});

//tags: init
export async function powerPackInit() {
  initSearch();
  _properties = await _package.getProperties();
}

//description: Windows Manager
//tags: autostart
export function windowsManager() {
  windowsManagerPanel();
}

//name: viewerDialog
//description: Open "Viewer Gallery" dialog
//input: dynamic tv
export function viewerDialog(tv: DG.TableView) {
  if (tv instanceof DG.TableView)
    return viewersDialog(tv, tv.table!);
}

//description: ViewerGallery
//tags: autostart
export function viewerGallery(): void {
  grok.events.onViewAdded.subscribe((view) => _viewerGallery(view));
  _viewerGallery(grok.shell.v);
}

function _viewerGallery(view: DG.ViewBase): void {
  if (view?.type == 'TableView') {
    const panels = view.getRibbonPanels();
    for (const p of panels) {
      for (const d of p) {
        if (d instanceof HTMLDivElement) {
          if (d.querySelector('.svg-add-viewer')) {
            const icon = ui.iconFA('',
              () => {
                viewersDialog(view as DG.TableView, (view as DG.TableView).table!);
              }, 'Add viewer');
            icon.className = 'grok-icon svg-icon svg-add-viewer';
            const btn = ui.div([icon]);
            btn.className = 'd4-ribbon-item';
            p[p.indexOf(d)] = btn;
          }
        }
      }
    }
    view.setRibbonPanels(panels);
  }
}
