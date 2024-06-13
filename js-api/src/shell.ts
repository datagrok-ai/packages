import { DataFrame } from "./dataframe";
import { TableView, View, ViewBase } from "./views/view";
import { Project, User } from "./entities";
import { toDart, toJs } from "./wrappers";
import { Menu, TabControl } from "./widgets";
import { DockManager } from "./docking";
import { DockType, DOCK_TYPE } from "./const";
import { JsViewer, Viewer } from "./viewer";
import {_toIterable} from "./utils";
import { FuncCall } from "./functions";
import { SettingsInterface } from './api/xamgle.api.g';
import {IDartApi} from "./api/grok_api.g";
import {ComponentBuildInfo} from "./dapi";

declare let ui: any;
declare let grok: { shell: Shell };
const api: IDartApi = <any>window;

class AppBuildInfo {
  get client(): ComponentBuildInfo { return api.grok_Shell_GetClientBuildInfo(); }
  server: ComponentBuildInfo = new ComponentBuildInfo();
}

/**
 * Grok visual shell, use it to get access to top-level views, tables, methods, etc.
 * @example
 * grok.shell.addTableView(grok.data.demo.biosensor(1000));
 * */
export class Shell {
  windows: Windows = new Windows();
  settings: Settings & SettingsInterface = new Settings() as Settings & SettingsInterface;
  build: AppBuildInfo = new AppBuildInfo();

  testError(s: String): void {
    return api.grok_Test_Error(s);
  }

  /** Current table, or null. */
  get t(): DataFrame {
    return toJs(api.grok_CurrentTable());
  }

  /** Current view */
  get v(): ViewBase { return toJs(api.grok_Get_CurrentView()); }
  set v(view: ViewBase) { api.grok_Set_CurrentView(view.dart); }

  /** Current table view, or null */
  get tv(): TableView { return toJs(api.grok_Get_CurrentView()); }

  /** Current project */
  get project(): Project {
    return toJs(api.grok_Project());
  }

  /** Adds a table to the workspace. */
  addTable(table: DataFrame): DataFrame {
    api.grok_AddTable(table.dart);
    return table;
  }

  /** Closes a table and removes from the workspace. */
  closeTable(table: DataFrame): void {
    api.grok_CloseTable(table.dart);
  }

  /** Last error state */
  get lastError(): Promise<string|undefined> { return api.grok_Get_LastError(); }

  set lastError(s: any) { api.grok_Set_LastError(s); }

  clearLastError(): void { api.grok_Clear_LastError(); }

  /** Current user */
  get user(): User {
    return toJs(api.grok_User());
  }

  /** Current object (rendered in the context panel) */
  get o(): any { return toJs(api.grok_Get_CurrentObject(), false); }
  set o(x: any) { this.setCurrentObject(x, true); }

  setCurrentObject(x: any, freeze: boolean) {
    api.grok_Set_CurrentObject(toDart(x), freeze);
  }

  /** Current viewer */
  get viewer(): Viewer { return toJs(api.grok_Get_CurrentViewer(), false); }
  set viewer(x: Viewer) { api.grok_Set_CurrentViewer(toDart(x)); }

  /** @type {TabControl} */
  get sidebar(): TabControl {
    return toJs(api.grok_Get_Sidebar());
  }

  /** @type {Menu} */
  get topMenu(): Menu {
    return toJs(api.grok_Get_TopMenu());
  }

  /** @type {HTMLDivElement} */
  get topPanel(): HTMLDivElement {
    return api.grok_Get_TopPanel();
  }

  /** @type {HTMLDivElement} */
  get bottomPanel(): HTMLDivElement {
    return api.grok_Get_BottomPanel();
  }

  /** Shows information message (green background)
   * @param {string} x - message */
  info(x: any): void {
    api.grok_Balloon(typeof x == "string" || x instanceof HTMLElement ? x : JSON.stringify(x), 'info');
  }

  /** Shows information message (red background)
   * @param {string} s - message */
  error(s: string | HTMLElement): void {
    api.grok_Balloon(s, 'error');
  }

  /** Shows warning message (yellow background)
   * @param {string} s - message */
  warning(s: string | HTMLElement): void {
    api.grok_Balloon(s, 'warning');
  }

  /** Docks element in a separate window.
   * Sample: {@link https://public.datagrok.ai/js/samples/ui/docking/docking}
   * @param {HTMLElement} element
   * @param {string} title
   * @param {DockType} dockStyle
   * @param {number} ratio - area to take (relative to parent) */
  dockElement(element: HTMLElement, title: string | null = null, dockStyle: DockType = DOCK_TYPE.FILL, ratio: number = 0.5): void {
    api.grok_DockElement(element, title, dockStyle, ratio);
  }

  /** Opens the view that handles the specified url.
   * Sample: {@link https://public.datagrok.ai/js/samples/ui/docking/docking} */
  route(url: string): View {
    return toJs(api.grok_Route(url));
  }

  /** Adds an item to the workspace.
   * It could be a DataFrame, a View, or an HtmlElement.
   * Throws an error, if the item has a different type. */
  add(item: DataFrame | ViewBase | HTMLElement): Shell {
    if (item instanceof DataFrame)
      this.addTableView(item);
    else if (item instanceof ViewBase)
      this.addView(item);
    else if (item instanceof HTMLElement)
      this.dockElement(item);
    else
      throw 'Unknown type';
    return this;
  }

  /** Adds a view. */
  addView(v: ViewBase, dockType: DockType = DOCK_TYPE.FILL, width: number | null = null, context: FuncCall | null = null): ViewBase {
    if (api.grok_AddView == null) {
      document.body.append(v.root);
      v.root.style.width = '100vw';
      v.root.style.height = '100vh';
    } else {
      if (context != null)
        v.parentCall = context;
      api.grok_AddView(v.dart, dockType, width);
    }
    return v;
  }

  /**
   * Adds a new view with the specified name.
   * @param {string} name - view name
   * @param {Object[]} children - content to be added by calling {@link ui.appendAll}
   * @param {string | ElementOptions | null} options
   * @returns {View}
   */
  newView(name: string = 'view', children?: object[], options?: string | {} | null): View {
    if (children == null)
      children = [];
    let view = View.create(options);
    view.name = name;
    ui.appendAll(view.root, children);
    this.addView(view);
    return view;
  }

  /** Adds a view for the specified table.
   * @param {DataFrame} table
   * @param {DockType} dockType
   * @param {number} width
   * @returns {TableView} */
  addTableView(table: DataFrame, dockType: DockType | null = DOCK_TYPE.FILL, width: number | null = null): TableView {
    return toJs(api.grok_AddTableView(table.dart, dockType, width));
  }

  /**
   * Returns {@link TableView} for the specified table if it exists, opens a new view if necessary.
   * Search is case-insensitive.
   * @param {string} tableName
   * @returns {TableView} */
  //Obsolete
  getTableView(tableName: string): TableView {
    return toJs(api.grok_GetTableView(tableName));
  }

  /** Closes everything (views, tables, projects) and returns the platform to the initial state. */
  closeAll(): void {
    api.grok_CloseAll();
  }

  // /** Registers a view.
  //  * @param {string} viewTypeName
  //  * @param {Function} createView - a function that returns {@link ViewBase}
  //  * @param {string} viewUrlPath */
  // registerView(viewTypeName: string, createView: (...params: any[]) => ViewBase, viewUrlPath: string = ''): void {
  //   api.grok_RegisterView(viewTypeName, createView, viewUrlPath);
  // }

  /** Registers a viewer.
   * Sample: {@link https://public.datagrok.ai/js/samples/scripts/functions/custom-viewers}
   * @param {string} viewerTypeName
   * @param {string} description
   * @param {Function} createViewer - a function that returns {@link JsViewer} */
  registerViewer(viewerTypeName: string, description: string, createViewer: (...params: any[]) => JsViewer): void {
    api.grok_RegisterViewer(viewerTypeName, description, createViewer);
  }

  /** Returns a {@link DataFrame} with the specified [tableName]. */
  table(tableName: string): DataFrame {
    return this.tableByName(tableName);
  }

  /** Returns a view with the specified [name], or null if there is no such view. */
  view(name: string): View | null {
    return toJs(api.grok_GetView(name));
  }

  /** Returns a first TableView for the specified [tableName], or null if there
   *  are no such views. */
  tableView(tableName: string): TableView {
    return this.getTableView(tableName);
  }

  /** Names of the currently open tables
   *  @type {string[]} */
  get tableNames(): string[] {
    return api.grok_TableNames();
  }

  /** List of currently open tables
   *  @type {DataFrame[]}*/
  get tables(): DataFrame[] {
    return this.tableNames.map(this.tableByName);
  }

  /** Returns currently open views*/
  get views(): Iterable<View> {
    return _toIterable(api.grok_GetViews());
  }

  /** Returns currently open table views*/
  get tableViews(): Iterable<TableView> {
    return _toIterable(api.grok_GetTableViews());
  }

  /** Returns a table by its name. Search is case-insensitive.
   * @param {string} tableName
   * @returns {DataFrame} */
  //Obsolete
  tableByName(tableName: string): DataFrame {
    return toJs(api.grok_TableByName(tableName));
  }

  /** Returns the value of the specified variable. Search is case-insensitive.
   * @param {string} variableName
   * @returns {Object} */
  getVar(variableName: string): object {
    return toJs(api.grok_GetVar(variableName));
  }

  /** Sets the value of the specified variable, and returns this value.
   * @param {string} variableName
   * @param {Object} variableValue */
  setVar(variableName: string, variableValue: object): object {
    api.grok_SetVar(variableName, toDart(variableValue));
    return variableValue;
  }

  /** @returns {DockManager} */
  get dockManager(): DockManager {
    return new DockManager(api.grok_Get_DockManager());
  }

  /** Clears dirty flag in scratchpad and open projects. */
  clearDirtyFlag(): void {
    api.grok_ClearDirtyFlag();
  }

  get startUri(): string { return api.grok_Get_StartUri(); }
}


/** Represents help panel that shows help for the current object and is toggleable
 * by pressing F1 */
export class ShellHelpPanel {
  /** Controls whether the help panel shows help for the current object as it changes */
  get syncCurrentObject(): boolean { return api.grok_HelpPanel_Get_SyncCurrentObject(); }
  set syncCurrentObject(x: boolean) { api.grok_HelpPanel_Set_SyncCurrentObject(x); }

  /** Controls help panel visibility */
  get visible(): boolean { return grok.shell.windows.showHelp; }
  set visible(x: boolean) { grok.shell.windows.showHelp = x; }

  /** Shows the content in the help window for the [x] URL or object. */
  showHelp(x: any) { api.grok_ShowHelp(x); }
}


/** Represents context panel that shows properties for the current object
 and is toggleable by pressing F1 */
export class ShellContextPanel {
  /** Controls whether the context panel shows context for the current object as it changes */
  get syncCurrentObject(): boolean { return api.grok_ContextPanel_Get_SyncCurrentObject(); }
  set syncCurrentObject(x: boolean) { api.grok_ContextPanel_Set_SyncCurrentObject(x); }

  /** Controls context panel visibility */
  get visible(): boolean { return grok.shell.windows.showContextPanel; }
  set visible(x: boolean) { grok.shell.windows.showContextPanel = x; }
}


/** Controls tool windows visibility */
export class Windows {

  help: ShellHelpPanel = new ShellHelpPanel();
  context: ShellContextPanel = new ShellContextPanel();

  /** Controls the visibility of the sidebar. */
  get showSidebar(): boolean { return api.grok_Windows_Get_ShowSidebar(); }
  set showSidebar(x: boolean) { api.grok_Windows_Set_ShowSidebar(x); }

  /** Controls the visibility of the toolbox. */
  get showToolbox(): boolean { return api.grok_Windows_Get_ShowToolbox(); }
  set showToolbox(x: boolean) { api.grok_Windows_Set_ShowToolbox(x); }

  /** Controls the visibility of the status bar. */
  get showStatusBar(): boolean { return api.grok_Windows_Get_ShowStatusBar(); }
  set showStatusBar(x: boolean) { api.grok_Windows_Set_ShowStatusBar(x); }

  /** Controls the visibility of the console. */
  get showConsole(): boolean { return api.grok_Windows_Get_ShowConsole(); }
  set showConsole(x: boolean) { api.grok_Windows_Set_ShowConsole(x); }

  /** Controls the visibility of the help window. */
  get showHelp(): boolean { return api.grok_Windows_Get_ShowHelp();   }
  set showHelp(x: boolean) { api.grok_Windows_Set_ShowHelp(x); }

  /** Obsolete. Controls the visibility of the properties window. */
  get showProperties(): boolean { return api.grok_Windows_Get_ShowProperties(); }
  set showProperties(x: boolean) { api.grok_Windows_Set_ShowProperties(x); }

  /** Controls the visibility of the context pane. */
  get showContextPanel(): boolean { return api.grok_Windows_Get_ShowProperties(); }
  set showContextPanel(x: boolean) { api.grok_Windows_Set_ShowProperties(x); }

  /** Controls the visibility of the variables window. */
  get showVariables(): boolean { return api.grok_Windows_Get_ShowVariables(); }
  set showVariables(x: boolean) { api.grok_Windows_Set_ShowVariables(x); }

  /** Controls the visibility of the tables window. */
  get showTables(): boolean { return api.grok_Windows_Get_ShowTables(); }
  set showTables(x: boolean) { api.grok_Windows_Set_ShowTables(x); }

  /** Controls the visibility of the columns window. */
  get showColumns(): boolean { return api.grok_Windows_Get_ShowColumns(); }
  set showColumns(x: boolean) { api.grok_Windows_Set_ShowColumns(x); }

  /** Controls the visibility of the top menu ribbon. */
  get showRibbon(): boolean { return api.grok_Windows_Get_ShowRibbon(); }
  set showRibbon(x: boolean) { api.grok_Windows_Set_ShowRibbon(x); }

  /** Hide dock tabs in presentation mode **/
  get hideTabsInPresentationMode(): boolean { return api.grok_Get_HideTabsInPresentationMode(); }
  set hideTabsInPresentationMode(x: boolean) { api.grok_Set_HideTabsInPresentationMode(x); }

  /** Presentation mode */
  get presentationMode(): boolean { return api.grok_Get_PresentationMode(); }
  set presentationMode(x: boolean) { api.grok_Set_PresentationMode(x); }

  /** New menu style **/
  get simpleMode(): boolean { return api.grok_Get_SimpleMode(); }
  set simpleMode(x: boolean) { api.grok_Set_SimpleMode(x); }
}

/** User-specific platform settings. */
export class Settings {

  constructor() {
    return new Proxy({}, {
      get: function (target: any, prop: string) {
        return toJs(api.grok_PropMixin_GetPropertyValue(api.grok_Get_Settings(), prop));
      },
      set: function (target, prop: string, value) {
        if (target.hasOwnProperty(prop))
          return target[prop];
        if (target.hasOwnProperty(prop)) {
          target[prop] = value;
          return true;
        }
        api.grok_PropMixin_SetPropertyValue(api.grok_Get_Settings(), prop, toDart(value));
        return true;
      }
    });
  }

  /** Jupyter Notebook URL */
  get jupyterNotebook(): string {
    return api.grok_Settings_Get_JupyterNotebook();
  }

  /** Jupyter Notebook Token */
  get jupyterNotebookToken(): string {
    return api.grok_Settings_Get_JupyterNotebookToken();
  }
}

export class SearchResult {
  caption?: string;
  imageUrl?: string;
}
