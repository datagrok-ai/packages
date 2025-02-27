/** A viewer that is typically docked inside a [TableView]. */
import {FILTER_TYPE, TYPE, VIEWER, ViewerPropertyType, ViewerType} from "./const";
import {BitSet, DataFrame} from "./dataframe.js";
import {Property, PropertyOptions} from "./entities";
import {Menu, ObjectPropertyBag, Widget, Filter, TypedEventArgs} from "./widgets";
import {_toJson, MapProxy} from "./utils";
import {toJs, toDart} from "./wrappers";
import {__obs, EventData, StreamSubscription} from "./events";
import * as rxjs from "rxjs";
import {Subscription} from "rxjs";
import {filter, map} from 'rxjs/operators';
import {Grid, Point, Rect} from "./grid";
import {FormulaLinesHelper} from "./helpers";
import * as interfaces from "./interfaces/d4";
import dayjs from "dayjs";
import {TableView, View} from "./views/view";
import {ViewerEvent} from './api/d4.api.g';

declare let DG: any;
declare let ui: any;
let api = <any>window;

/**
 * Represents a {@link https://datagrok.ai/help/visualize/viewers | viewer}.
 * See also {@link https://datagrok.ai/help/develop/how-to/manipulate-viewers}
 *
 * @see Use Viewer to control the viewers. To develop a custom viewer, {@link JsViewer}.
 *
 * @example
 * let view = grok.shell.addTableView(grok.data.demo.demog());
 * view.scatterPlot({
     x: 'height',
     y: 'weight',
     size: 'age',
     color: 'race',
   });
 **/
export class Viewer<TSettings = any> extends Widget<TSettings> {

  public tags: any;
  private _meta: ViewerMetaHelper | undefined;
  private _filter: BitSet | null = null;

  /** @constructs Viewer */
  constructor(dart: any, root?: HTMLElement) {
    super(root ?? api.grok_Viewer_Root(dart));
    this.initDartObject(dart);
  }

  /** combined filter of the viewer */
  get filter(): BitSet { 
    return this._filter ??= this.dart ? toJs(api.grok_Viewer_Get_Filter(this.dart)) : BitSet.create(0); 
  }
  set filter(f: BitSet) {
    this._filter = f;
  }
  get onDataEvent(): rxjs.Observable<ViewerEvent> { return this.onEvent('d4-data-event'); }
  get onTooltipCreated(): rxjs.Observable<ViewerEvent> { return this.onEvent('d4-data-event').pipe(filter((e) => e.type == 'd4-tooltip')); }
  get onDataSelected(): rxjs.Observable<ViewerEvent> { return this.onEvent('d4-data-event').pipe(filter((e) => e.type == 'd4-select')); }
  /// current row clicked
  get onDataRowClicked(): rxjs.Observable<ViewerEvent> { return this.onEvent('d4-data-event').pipe(filter((e) => e.type == 'd4-row-click')); }
  get onPropertyValueChanged(): rxjs.Observable<EventData<Property>> { return this.onEvent('d4-property-value-changed'); }

  initDartObject(dart: any) {
    this.dart = dart;

    if (dart != null) {
      /** @member {ObjectPropertyBag} */
      // @ts-ignore
      this.props = new ObjectPropertyBag(this, api.grok_Viewer_Get_Look(this.dart));
      this.tags = new MapProxy(api.grok_Viewer_Get_Tags(this.dart), 'tags', 'string');
    }
  }

  /** Creates a new viewer of the specified type.
   * @param {ViewerType} viewerType
   * @param {DataFrame} table
   * @param options
   * @returns {Viewer} */
  static fromType(viewerType: ViewerType, table: DataFrame, options: object | null = null): Viewer {
    return toJs(api.grok_Viewer_FromType(viewerType, table.dart, _toJson(options)));
  }

  static getViewerTypes(): ViewerType[] {
    return api.grok_Viewer_GetViewerTypes();
  }

  /**
   *  Sets viewer options. See also {@link getOptions}
   *  Sample: {@link https://public.datagrok.ai/js/samples/ui/viewers/types/scatter-plot}
   *  @param {object} map */
  // add tsettings
  setOptions(map: { type?: ViewerType, [key: string]: any }): void {
    api.grok_Viewer_Options(this.dart, JSON.stringify(map));
  }

  /**
   * Gets the serialized viewer options. [includeDefaults] flag specifies whether the
   * properties with the default values should be returned. Not including default
   * properties makes it more clean and efficient for serialization purposes.
   *
   * See also {@link setOptions}
   *  Sample: https://public.datagrok.ai/js/samples/ui/viewers/types/scatter-plot
   *  @returns {object} */
  getOptions(includeDefaults: boolean = false): {id: string, type: ViewerType, look: {[key: string]: any}} {
    return JSON.parse(api.grok_Viewer_Serialize(this.dart, includeDefaults));
  }

  getInfo(): { [index: string]: any } {
    return api.grok_Viewer_GetInfo(this.dart);
  }

  getProperties(): Property[] {
    return api.grok_Viewer_Get_Properties(this.dart);
  }

  /** Closes and detaches the viewer. */
  close(): void {
    api.grok_Viewer_Close(this.dart);
  }

  /** Visual root.
   * @type {HTMLElement} */
  get root(): HTMLElement {
    return api.grok_Viewer_Root(this.dart);
  }

  get meta(): ViewerMetaHelper {
    if (this._meta == undefined)
      this._meta = new ViewerMetaHelper(this);
    return this._meta;
  }

  /** Returns viewer type (see VIEWER constants)
   * @returns {string} */
  get type(): ViewerType {
    return api.grok_Viewer_Get_Type(this.dart);
  }

  get table(): DataFrame {
    return toJs(api.grok_Viewer_Get_DataFrame(this.dart));
  }

  /** Returns a view this viewer is associated with, or null */
  get view(): View | null {
    return toJs(api.grok_Viewer_Get_View(this.dart));
  }

  /** Returns a view this viewer is associated with, or null */
  get tableView(): TableView | null {
    return toJs(api.grok_Viewer_Get_View(this.dart));
  }

  /** @type {DataFrame} */
  get dataFrame(): DataFrame { return toJs(api.grok_Viewer_Get_DataFrame(this.dart)); }
  set dataFrame(t: DataFrame) { api.grok_Viewer_Set_DataFrame(this.dart, t == null ? null : t.dart); }

  /** Help URL */
  get helpUrl(): string { return api.grok_Viewer_Get_HelpUrl(this.dart); }
  set helpUrl(s: string) { api.grok_Viewer_Set_HelpUrl(this.dart, s); }

  static grid(t: DataFrame, options?: Partial<interfaces.IGridSettings>): Grid {
    return new DG.Grid(api.grok_Viewer_Grid(t.dart, _toJson(options)));
  }

  static histogram(t: DataFrame, options?: Partial<interfaces.IHistogramSettings>): Viewer<interfaces.IHistogramSettings> {
    return new Viewer(api.grok_Viewer_Histogram(t.dart, _toJson(options)));
  }

  static barChart(t: DataFrame, options?: Partial<interfaces.IBarChartSettings>): Viewer<interfaces.IBarChartSettings> {
    return <Viewer>Viewer.fromType(VIEWER.BAR_CHART, t, options);
  }

  static heatMap(t: DataFrame, options?: Partial<interfaces.IGridSettings>): Grid {
    return new DG.Grid(Viewer.fromType(VIEWER.HEAT_MAP, t, options).dart);
  }

  static boxPlot(t: DataFrame, options?: Partial<interfaces.IBoxPlotSettings>): Viewer<interfaces.IBoxPlotSettings> {
    return new Viewer(api.grok_Viewer_BoxPlot(t.dart, _toJson(options)));
  }

  static filters(t: DataFrame, options?: Partial<interfaces.IFiltersSettings>): Viewer<interfaces.IFiltersSettings> {
    return new Viewer(api.grok_Viewer_Filters(t.dart, _toJson(options)));
  }

  static scatterPlot(t: DataFrame, options?: Partial<interfaces.IScatterPlotSettings>): ScatterPlotViewer {
    return new ScatterPlotViewer(api.grok_Viewer_ScatterPlot(t.dart, _toJson(options)));
  }

  static lineChart(t: DataFrame, options?: Partial<interfaces.ILineChartSettings>): Viewer<interfaces.ILineChartSettings> {
    return new Viewer(api.grok_Viewer_LineChart(t.dart, _toJson(options)));
  }

  static network(t: DataFrame, options?: Partial<interfaces.INetworkDiagramSettings>): Viewer<interfaces.INetworkDiagramSettings> {
    return <Viewer>Viewer.fromType(VIEWER.NETWORK_DIAGRAM, t, options);
  }

  static calendar(t: DataFrame, options?: Partial<interfaces.ICalendarSettings>): Viewer<interfaces.ICalendarSettings> {
    return <Viewer>Viewer.fromType(VIEWER.CALENDAR, t, options);
  }

  static correlationPlot(t: DataFrame, options?: Partial<interfaces.ICorrelationPlotSettings>): Viewer<interfaces.ICorrelationPlotSettings> {
    return <Viewer>Viewer.fromType(VIEWER.CORR_PLOT, t, options);
  }

  static densityPlot(t: DataFrame, options?: Partial<interfaces.IDensityPlotSettings>): Viewer<interfaces.IDensityPlotSettings> {
    return <Viewer>Viewer.fromType(VIEWER.DENSITY_PLOT, t, options);
  }

  static form(t: DataFrame, options?: Partial<interfaces.IFormSettings>): Viewer<interfaces.IFormSettings> {
    return <Viewer>Viewer.fromType(VIEWER.FORM, t, options);
  }

  static markup(t: DataFrame, options?: Partial<interfaces.IMarkupViewerSettings>): Viewer<interfaces.IMarkupViewerSettings> {
    return <Viewer>Viewer.fromType(VIEWER.MARKUP, t, options);
  }

  static matrixPlot(t: DataFrame, options?: Partial<interfaces.IMatrixPlotSettings>): Viewer<interfaces.IMatrixPlotSettings> {
    return <Viewer>Viewer.fromType(VIEWER.MATRIX_PLOT, t, options);
  }

  static pcPlot(t: DataFrame, options?: Partial<interfaces.IPcPlotSettings>): Viewer<interfaces.IPcPlotSettings> {
    return <Viewer>Viewer.fromType(VIEWER.PC_PLOT, t, options);
  }

  static pieChart(t: DataFrame, options?: Partial<interfaces.IPieChartSettings>): Viewer<interfaces.IPieChartSettings> {
    return <Viewer>Viewer.fromType(VIEWER.PIE_CHART, t, options);
  }

  static scatterPlot3d(t: DataFrame, options?: Partial<interfaces.IScatterPlot3dSettings>): Viewer<interfaces.IScatterPlot3dSettings> {
    return <Viewer>Viewer.fromType(VIEWER.SCATTER_PLOT_3D, t, options);
  }

  static statistics(t: DataFrame, options?: Partial<interfaces.IStatsViewerSettings>): Viewer<interfaces.IStatsViewerSettings> {
    return <Viewer>Viewer.fromType(VIEWER.STATISTICS, t, options);
  }

  static tile(t: DataFrame, options?: Partial<interfaces.ITileViewerSettings>): Viewer<interfaces.ITileViewerSettings> {
    return <Viewer>Viewer.fromType(VIEWER.TILE_VIEWER, t, options);
  }

  static treeMap(t: DataFrame, options?: Partial<interfaces.ITreeMapSettings>): Viewer<interfaces.ITreeMapSettings> {
    return <Viewer>Viewer.fromType(VIEWER.TREE_MAP, t, options);
  }

  static trellisPlot(t: DataFrame, options?: Partial<interfaces.ITrellisPlotSettings>): Viewer<interfaces.ITrellisPlotSettings> {
    return <Viewer>Viewer.fromType(VIEWER.TRELLIS_PLOT, t, options);
  }

  /** @deprecated */
  static wordCloud(t: DataFrame, options?: any): Viewer {
    return <Viewer>Viewer.fromType(VIEWER.WORD_CLOUD, t, options);
  }

  get onContextMenu(): rxjs.Observable<Menu> {
    return this.onEvent('d4-context-menu').pipe(map(x => x.args.menu));
  }

  /** Observes platform events with the specified eventId. */
  onEvent(eventId: string | null = null): rxjs.Observable<any> {
    if (eventId !== null)
      return __obs(eventId, this.dart);

    let dartStream = api.grok_Viewer_Get_EventBus_Events(this.dart);
    return rxjs.fromEventPattern(
      function (handler) {
        return api.grok_Stream_Listen(dartStream, function (x: any) {
          handler(new TypedEventArgs(x));
        });
      },
      function (handler, dart) {
        new StreamSubscription(dart).cancel();
      }
    );
  }

  toCompactLook() {
    api.grok_Viewer_To_Trellis_Look(this.dart);
  }

  get onDartPropertyChanged(): rxjs.Observable<null> {
    let dartStream = api.grok_Viewer_Get_PropertyChanged_Events(this.dart);
    return rxjs.fromEventPattern(
      function (handler) {
        return api.grok_Stream_Listen(dartStream, function (x: any) {
          handler(new TypedEventArgs(x));
        });
      },
      function (handler, dart) {
        new StreamSubscription(dart).cancel();
      }
    );
  }

  copyViewersLook(other: Viewer) {
    api.grok_Viewer_Copy_Viewers_Look(this.dart, other.dart);
  }

  removeFromView() {
    return toJs(api.grok_Viewer_Remove_From_View(this.dart));
  }
}


/** Subclass JsViewer to implement a DataFrame-bound Datagrok viewer in JavaScript.
 *  See an example on github: {@link https://github.com/datagrok-ai/public/tree/master/packages/Leaflet}
 *  */
export class JsViewer extends Viewer {
  public dart: any;

  subs: Subscription[];
  obs: rxjs.Observable<any>[];
  props: ObjectPropertyBag;
  rowSource: string | undefined;
  formulaFilter: string | undefined;

  /** @constructs JsViewer */
  constructor() {
    let _root = ui.box();
    super(null, _root);

    this.dart = api.grok_Viewer_FromJsViewer(this);
    this.initDartObject(this.dart);
    this._root = _root;

    /** @type {StreamSubscription[]} */
    this.subs = [];  // stream subscriptions - will be canceled when the viewer is detached

    this.obs = [];

    /** @member {ObjectPropertyBag} */
    this.props = new ObjectPropertyBag(this);
  }

  addRowSourceAndFormula() {
    this.rowSource = this.string('rowSource', 'Filtered',
        { choices: ['All', 'Filtered', 'Selected', 'SelectedOrCurrent', 'FilteredSelected', 'MouseOverGroup', 'CurrentRow', 'MouseOverRow']});
    this.formulaFilter = this.string('filter', '', {fieldName: 'formulaFilter'});
  }

  onFrameAttached(dataFrame: DataFrame): void {
    this.onTableAttached();
  }

  sourceRowsChanged(): void {
    this.filter = toJs(api.grok_Viewer_Get_Filter(this.dart));
    this.onSourceRowsChanged();
  }

  onSourceRowsChanged(): void {}

  get root(): HTMLElement { return this._root; }
  set root(r: HTMLElement) { this._root = r; }

  /** Gets called when a table is attached to the viewer. */
  onTableAttached(): void { }

  /** Gets called when this viewer is detached. */
  detach(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  /** Gets property by name (case-sensitive).
   * @param {string} name
   * @returns {Property} */
  getProperty(name: string): Property | undefined {
    return this.getProperties().find((p) => p.name === name);
  }

  getProperties(): Property[] {
    return this._properties;
  }

  /** cleanup() will get called when the viewer is disposed */
  protected registerCleanup(cleanup: Function): void {
    api.grok_Widget_RegisterCleanup(this.root, cleanup);
  }

  protected _obs(observable: rxjs.Observable<any>): rxjs.Observable<any> {
    this.obs.push(observable);
    return observable;
  }

  /** Returns the column bound to the specified data property.
   *  Note that "ColumnName" suffix (this determines whether this is a data property) should be omitted. */
  protected column(dataPropertyName: string, options: { [key: string]: any } & PropertyOptions | null = null): string {
    return this.addProperty(`${dataPropertyName}ColumnName`, TYPE.STRING, null, options);
  }

  protected columnList(propertyName: ViewerPropertyType, defaultValue: string[] | null = null, options: { [key: string]: any } & PropertyOptions | null = null): string[] {
    return this.addProperty(propertyName, DG.TYPE.COLUMN_LIST, defaultValue, options);
  }

  /** Registers an integer property with the specified name and defaultValue */
  protected int(propertyName: ViewerPropertyType, defaultValue: number | null = null, options: { [key: string]: any } & PropertyOptions | null = null): number {
    return this.addProperty(propertyName, TYPE.INT, defaultValue, options);
  }

  /** Registers a floating point property with the specified name and defaultValue */
  protected float(propertyName: ViewerPropertyType, defaultValue: number | null = null, options: { [key: string]: any } & PropertyOptions | null = null): number {
    return this.addProperty(propertyName, TYPE.FLOAT, defaultValue, options);
  }

  /** Registers a string property with the specified name and defaultValue */
  protected string(propertyName: ViewerPropertyType, defaultValue: string | null = null, options: { [key: string]: any } & PropertyOptions | null = null): string {
    return this.addProperty(propertyName, TYPE.STRING, defaultValue, options);
  }

  /** Registers a string list property with the specified name and defaultValue */
  protected stringList(propertyName: ViewerPropertyType, defaultValue: string[] | null = null, options: { [key: string]: any } & PropertyOptions | null = null): string[] {
    return this.addProperty(propertyName, TYPE.STRING_LIST, defaultValue, options);
  }

  /** Registers a boolean property with the specified name and defaultValue */
  protected bool(propertyName: ViewerPropertyType, defaultValue: boolean | null = null, options: { [key: string]: any } & PropertyOptions | null = null): boolean {
    return this.addProperty(propertyName, TYPE.BOOL, defaultValue, options);
  }

  /** Registers a datetime property with the specified name and defaultValue */
  protected dateTime(propertyName: ViewerPropertyType, defaultValue: dayjs.Dayjs | null = null, options: { [key: string]: any } & PropertyOptions | null = null): dayjs.Dayjs {
    return this.addProperty(propertyName, TYPE.DATE_TIME, defaultValue, options);
  }
}


export interface FilterState {
  type: FILTER_TYPE | string;
  column?: string;
}


/** Represents a group of filters that are located together. */
export class FilterGroup extends Viewer {
  declare dart: any;

  constructor(dart: any) {
    super(dart);
  }

  getStates(columnName: string, filterType: String): Array<Object> {
    return api.grok_FilterGroup_GetStates(this.dart, columnName, filterType);
  }

  add<T extends FilterState>(state: T) {
    api.grok_FilterGroup_Add(this.dart, state);
  }

  updateOrAdd<T extends FilterState>(state: T, requestFilter?: boolean) {
    api.grok_FilterGroup_UpdateOrAdd(this.dart, state, requestFilter);
  }

  getFilterSummary(): Element {
    return api.grok_FilterGroup_GetFilterSummary(this.dart);
  }

  /** Returns array of filters in FilterGroup. Filter if js filter and dart object if dart filter */
  get filters(): Array<Filter | Widget> {
    return toJs(api.grok_FilterGroup_Get_Filters(this.dart));
  }

  setEnabled(filter: Filter | Widget | FilterState, active: boolean) {
    api.grok_FilterGroup_SetEnabled(this.dart, filter, active);
  }

  setExpanded(filter: Filter | Widget, active: boolean) {
    api.grok_FilterGroup_SetExpanded(this.dart, filter, active);
  }

  remove(filter: Filter | Widget) {
    api.grok_FilterGroup_Remove(this.dart, filter);
  }
}

export type CategoryDataArgs = {
  matchCondition: {[key: string]: any},
  matchConditionStr: string,
  options: {[key: string]: any}
}

export type RowDataArgs = {
  rowId: number,
}

export type LineChartLineArgs = {
  chartIdx: number,
  yColumnNames: string[],
  yAggrTypes: string[],
}

export type CorrPlotCellArgs = {
  column1: string,
  column2: string,
  value: number,
}

export class LineChartViewer extends Viewer<interfaces.ILineChartSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get activeFrame(): DataFrame {
    return api.grok_LineChartViewer_activeFrame(this.dart);
  }

  resetView(): void{
    api.grok_LineChartViewer_ResetView(this.dart);
  }

  get onAfterDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-after-draw-scene'); }
  get onBeforeDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-before-draw-scene'); }
  get onZoomed(): rxjs.Observable<null> { return this.onEvent('d4-linechart-zoomed'); }
  get onLineSelected(): rxjs.Observable<EventData<LineChartLineArgs>> { return this.onEvent('d4-linechart-line-selected'); }
  get onResetView(): rxjs.Observable<null> { return this.onEvent('d4-linechart-reset-view'); }
}

/** 2D scatter plot */
export class ScatterPlotViewer extends Viewer<interfaces.IScatterPlotSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get canvas(): HTMLCanvasElement { return this.getInfo()['canvas']; }
  get overlay(): HTMLCanvasElement { return this.getInfo()['overlay']; }

  /** Rerender plot */
  invalidateCanvas(): void{
    api.grok_ScatterPlotViewer_InvalidateCanvas(this.dart);
  }

  /** Row hit test using canvas coords */
  hitTest(x: number, y: number): number {
    return api.grok_ScatterPlotViewer_HitTest(this.dart, x, y);
  }

  /** Zoom using world coords */
  zoom(x1: number, y1: number, x2: number, y2: number) {
    api.grok_ScatterPlotViewer_Zoom(this.dart, x1, y1, x2, y2);
  }

  get viewBox(): Rect { return toJs(api.grok_ScatterPlotViewer_Get_ViewBox(this.dart)); }
  get xAxisBox(): Rect { return toJs(api.grok_ScatterPlotViewer_Get_XAxisBox(this.dart)); }
  get yAxisBox(): Rect { return toJs(api.grok_ScatterPlotViewer_Get_YAxisBox(this.dart)); }

  get viewport(): Rect { return toJs(api.grok_ScatterPlotViewer_Get_Viewport(this.dart)); }
  set viewport(viewport: Rect) { api.grok_ScatterPlotViewer_Set_Viewport(this.dart, viewport.x, viewport.y, viewport.width, viewport.height); }

  /** Convert coords */
  worldToScreen(x: number, y: number): Point { return Point.fromXY(api.grok_ScatterPlotViewer_WorldToScreen(this.dart, x, y)); }
  screenToWorld(x: number, y: number): Point { return Point.fromXY(api.grok_ScatterPlotViewer_ScreenToWorld(this.dart, x, y)); }

  /// 32-bit integer with X in the hi 16 bits, and Y in the lo 16 bits
  pointToScreen(index: number): Point { return Point.fromXY(api.grok_ScatterPlotViewer_PointToScreen(this.dart, index)); }

  render(g: CanvasRenderingContext2D): void { api.grok_ScatterPlotViewer_Render(this.dart, g); }
  getRowTooltip(rowIdx: number): HTMLDivElement { return api.grok_ScatterPlotViewer_GetRowTooltip(this.dart, rowIdx); }
  getMarkerSize(rowIdx: number): number { return api.grok_ScatterPlotViewer_GetMarkerSize(this.dart, rowIdx); }
  getMarkerSizes(): Float32Array { return api.grok_ScatterPlotViewer_GetMarkerSizes(this.dart); }
  getMarkerType(rowIdx: number): string { return api.grok_ScatterPlotViewer_GetMarkerType(this.dart, rowIdx); }
  getMarkerTypes(): Uint32Array { return api.grok_ScatterPlotViewer_GetMarkerTypes(this.dart); }
  getMarkerColor(rowIdx: number): number { return api.grok_ScatterPlotViewer_GetMarkerColor(this.dart, rowIdx); }
  getMarkerColors(): Uint32Array { return api.grok_ScatterPlotViewer_GetMarkerColors(this.dart); }


  get onZoomed(): rxjs.Observable<Rect> { return this.onEvent('d4-scatterplot-zoomed'); }
  get onResetView(): rxjs.Observable<null> { return this.onEvent('d4-scatterplot-reset-view'); }
  get onViewportChanged(): rxjs.Observable<Rect> { return this.onEvent('d4-viewport-changed'); }
  get onAfterDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-after-draw-scene'); }
  get onBeforeDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-before-draw-scene'); }
  get onPointClicked(): rxjs.Observable<EventData<RowDataArgs>> { return this.onEvent('d4-scatterplot-point-click'); }
  get onPointDoubleClicked(): rxjs.Observable<EventData<RowDataArgs>> { return this.onEvent('d4-scatterplot-point-double-click'); }
}

export class HistogramViewer extends Viewer<interfaces.IHistogramSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onBinsSelected(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-histogram-select-bins'); }
  get onLineSelected(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-histogram-select-line'); }
  get onMouseOverBins(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-histogram-mouse-over-bins'); }
  get onMouseOverLine(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-histogram-mouse-over-line'); }
}

export class BarChartViewer extends Viewer<interfaces.IBarChartSettings> {
  constructor(dart: any) {
    super(dart);
  }

  resetView(): void{
    api.grok_BarChartViewer_ResetView(this.dart);
  }

  get onCategoryClicked(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-bar-chart-on-category-clicked'); }
  get onCategoryHovered(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-bar-chart-on-category-hovered'); }
  get onResetView(): rxjs.Observable<null> { return this.onEvent('d4-bar-chart-reset-view'); }
}

export class PieChartViewer extends Viewer<interfaces.IPieChartSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onSegmentClicked(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-pie-chart-on-segment-clicked'); }
}

export class PcPlot extends Viewer<interfaces.IPcPlotSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onLineClicked(): rxjs.Observable<EventData<RowDataArgs>> { return this.onEvent('d4-pc-plot-on-line-clicked'); }
  get onLineHovered(): rxjs.Observable<EventData<RowDataArgs>> { return this.onEvent('d4-pc-plot-on-line-hovered'); }
}

export class BoxPlot extends Viewer<interfaces.IBoxPlotSettings> {
  constructor(dart: any) {
    super(dart);
  }

  resetView(): void{
    api.grok_BoxPlotViewer_ResetView(this.dart);
  }

  get onResetView(): rxjs.Observable<null> { return this.onEvent('d4-boxplot-reset-view'); }
  get onAfterDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-after-draw-scene'); }
  get onBeforeDrawScene(): rxjs.Observable<null> { return this.onEvent('d4-before-draw-scene'); }
  get onPointClicked(): rxjs.Observable<EventData<RowDataArgs>> { return this.onEvent('d4-boxplot-point-click'); }
}


export class CorrelationPlot extends Viewer<interfaces.ICorrelationPlotSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onCorrCellClicked(): rxjs.Observable<EventData<CorrPlotCellArgs>> { return this.onEvent('d4-correlation-plot-corr-cell-click'); }
}

export class ConfusionMatrix extends Viewer<interfaces.IConfusionMatrixSettings> {
  constructor(dart: any) {
    super(dart);
  }
}

export class RocCurve extends Viewer<interfaces.IRocCurveSettings> {
  constructor(dart: any) {
    super(dart);
  }
}


export class CalendarViewer extends Viewer<interfaces.ICalendarSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onCalendarClicked(): rxjs.Observable<EventData<CategoryDataArgs>> { return this.onEvent('d4-calendar-clicked'); }
}

export class PivotViewer extends Viewer<interfaces.IPivotViewerSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onAggregationChanged(): rxjs.Observable<null> { return this.onEvent('d4-pivot-grid-aggr-changed'); }
}

export class ViewerMetaHelper {
  private readonly _viewer: Viewer;

  readonly formulaLines: ViewerFormulaLinesHelper;

  constructor(viewer: Viewer) {
    this._viewer = viewer;
    this.formulaLines = new ViewerFormulaLinesHelper(this._viewer);
  }
}

export class TrellisPlotViewer extends Viewer<interfaces.ITrellisPlotSettings> {
  constructor(dart: any) {
    super(dart);
  }

  get onInnerViewerClicked(): rxjs.Observable<number[]> { return this.onEvent('d4-trellis-plot-inner-viewer-clicked'); }
  get onTrellisCurrentCellChanged(): rxjs.Observable<CategoryDataArgs> { return this.onEvent('d4-trellis-plot-current-cell-changed'); }
  get onViewerTypeChanged(): rxjs.Observable<string> { return this.onEvent('d4-trellis-plot-viewer-type-changed'); }
}

export class ViewerFormulaLinesHelper extends FormulaLinesHelper {
  readonly viewer: Viewer;

  get storage(): string {
    if (this.viewer.getOptions()['type'] === DG.VIEWER.TRELLIS_PLOT) {
      let innerLook = this.viewer.props['innerViewerLook'];
      return api.grok_PropMixin_GetPropertyValue(innerLook, 'formulaLines');
    }
    return this.viewer.props['formulaLines'];
  }
  set storage(value: string) {
    if (this.viewer.getOptions()['type'] === DG.VIEWER.TRELLIS_PLOT) {
      let innerLook = this.viewer.props['innerViewerLook'];
      api.grok_PropMixin_SetPropertyValue(innerLook, 'formulaLines', value);
    } else
      this.viewer.props['formulaLines'] = value;
  }

  constructor(viewer: Viewer) {
    super();
    this.viewer = viewer;
  }
}
