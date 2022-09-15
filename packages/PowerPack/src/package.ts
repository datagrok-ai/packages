/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { welcomeView } from "./welcome-view";
import { compareColumns } from './compare-columns';
import { AddNewColumnDialog } from './dialogs/add-new-column';
import { FormulaLinesDialog, DEFAULT_OPTIONS, EditorOptions } from './dialogs/formula-lines';
import { DistributionProfilerViewer } from './distribution-profiler';
import { SystemStatusWidget } from "./widgets/system-status-widget";
import { RecentProjectsWidget } from "./widgets/recent-projects-widget";
import { CommunityWidget } from './widgets/community-widget';
import { WebWidget } from './widgets/web-widget';
import { LearningWidget } from "./widgets/learning-widget";
import { AboutWidget } from "./widgets/about-widget";
import { functionSearch, pdbSearch, pubChemSearch, scriptsSearch, usersSearch, wikiSearch } from './search/entity-search';
import { KpiWidget } from "./widgets/kpi-widget";
import { HtmlWidget } from "./widgets/html-widget";
import { PowerPackSettingsEditor } from "./settings-editor";
import { viewersGallery } from "./viewers-gallery";
import { VIEWER } from 'datagrok-api/dg';

export let _package = new DG.Package();
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

//name: distributionProfiler
//tags: viewer
//output: viewer result
export function _distributionProfiler(): DistributionProfilerViewer {
  return new DistributionProfilerViewer();
}

//name: welcomeView
//tags: autostart
//meta.autostartImmediate: true
export function _welcomeView(): void {
  if (_properties['showWelcomeView'])
    welcomeView();
}

//output: widget result
//tags: dashboard
export function systemStatusWidget(): DG.Widget {
  return new SystemStatusWidget();
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
  let src = args.args.context;
  if (src instanceof DG.ScatterPlotViewer || (src instanceof DG.Viewer && src.getOptions()['type'] == VIEWER.LINE_CHART)) {
    let menu = args.args.menu.find('Tools');
    if (menu != null)
      menu.item('Formula Lines...', () => { formulaLinesDialog(src); });
  }
});

//tags: init
export async function powerPackInit() {
  _properties = await _package.getProperties();
}

//description: ViewerGallery
//tags: autostart
export function _viewerGallery(): void {
  //grok.shell.topMenu.find('Add').separator().item('Add viewer...', ()=>viewersGallery())
  grok.events.onViewAdded.subscribe((view) => {
    if (view.type == 'TableView') {
      let panel = view.getRibbonPanels();
      panel[0][1].remove();

      let icon = ui.iconFA('', () => { viewersGallery() }, 'Add viewer');
      icon.className = 'grok-icon svg-icon svg-add-viewer';

      let btn = ui.div([icon]);
      btn.className = 'd4-ribbon-item';
      panel[0][0].after(btn)
    }
  });
}