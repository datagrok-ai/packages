import {toDart, toJs} from "./wrappers";
import {__obs, _sub, EventData, InputArgs, observeStream, StreamSubscription} from "./events";
import * as rxjs from "rxjs";
import {fromEvent, Observable, Subject, Subscription} from "rxjs";
import {Func, Property, PropertyOptions} from "./entities";
import {Cell, Column, DataFrame} from "./dataframe";
import {LegendPosition, Type} from "./const";
import {filter, map} from 'rxjs/operators';
import $ from "cash-dom";
import {MapProxy, Completer} from "./utils";
import dayjs from "dayjs";
import typeahead from 'typeahead-standalone';
import {Dictionary, typeaheadConfig} from 'typeahead-standalone/dist/types';
import * as d4 from './../src/api/d4.api.g';


import '../css/breadcrumbs.css';
import '../css/drop-down.css';
import '../css/typeahead-input.css';
import '../css/tags-input.css';
import {FuncCall} from "./functions";
import {IDartApi} from "./api/grok_api.g";
import {HttpDataSource} from "./dapi";
import {ColumnGrid} from "./grid";

declare let grok: any;
declare let DG: any;
declare let ui: any;
const api: IDartApi = <any>window;


export class TypedEventArgs<TData> {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  /** Event type id */
  get type(): string {
    return api.grok_TypedEventArgs_Get_Type(this.dart);
  }

  get data(): TData {
    let data = api.grok_TypedEventArgs_Get_Data(this.dart);
    return toJs(data);
  }

  /** Event arguments. Only applies when data is EventData */
  get args(): {[key: string]: any} | null {
    // @ts-ignore
    if (!this.data?.dart)
      return null;

    // @ts-ignore
    return api.grok_EventData_Get_Args(this.data.dart);
  }
}

export type RangeSliderStyle = 'barbell' | 'lines' | 'thin_barbell';

export type SliderOptions = {
  style?: RangeSliderStyle
}

export type ICodeEditorOptions = {
  root?: HTMLDivElement;
}
export type TypeAheadConfig = Omit<typeaheadConfig<Dictionary>, 'input' | 'className'>;
export type CodeConfig = {
  script?: string;
  mode?: string;
  placeholder?: string;
};
export type TagsInputConfig = {
  tags?: string[];
  showButton?: boolean;
};

export class ObjectPropertyBag {
  source: any;

  constructor(source: any, x: any = null) {

    /** @member {Object} */
    this.source = source;

    if (x == null)
      x = source;

    let props = this;

    const handler = {
      ownKeys(target: any) {
        return props.getProperties().map((p: Property) => p.name);
      },
      has(target: any, name: string) {
        return props.getProperties().find((p: Property) => p.name === name) !== null;
      },
      getOwnPropertyDescriptor(target: any, key: any) {
        return {
          enumerable: true,
          configurable: true
        };
      },
      set(target: any, name: string, value: any) {
        if (<any>x instanceof DartWidget)
          x = toDart(x);
        target.getProperty(name).set(x, value);
        return true;
      },
      get(target: any, name: any) {
        const own = ['__proto__', 'hasProperty', 'getProperty', 'getProperties',
          'get', 'set', 'setAll', 'apply', 'setDefault', 'resetDefault'];
        if (own.includes(name) || props.hasOwnProperty(name))
          // @ts-ignore
          return props[name];
        if (<any>x instanceof DartWidget)
          x = toDart(x);
        return target.getProperty(name)?.get(x);
      }
    }

    return new Proxy(this, handler);
  }

  /**
   * Gets the value of the specified property
   * @param {string} propertyName
   * @returns {object}
   * */
  get(propertyName: string): object {
    return this.getProperty(propertyName).get(this.source);
  }

  /**
   * Sets the value of the specified property
   * @param {string} propertyName
   * @param {object} propertyValue
   * */
  set(propertyName: string, propertyValue: object) {
    this.getProperty(propertyName).set(this.source, propertyValue);
  }

  /** Sets all properties according to the passed object containing key-value pairs */
  setAll(params: object) {
    for (const [k, v] of Object.entries(params))
      this.set(k, v);
  }

  /** @returns {Property[]} */
  getProperties(): Property[] {
    return this.source.getProperties();
  }

  /** Gets property by name (case-sensitive).
   * @param {string} name
   * @returns {Property} */
  getProperty(name: string): Property {
    let property = this.getProperties().find((p) => p.name === name);
    if (typeof property == 'undefined')
      throw `Property not found: ${name}`;
    return property;
  }

  /**
   * @param {string} name
   * @returns {boolean} */
  hasProperty(name: string): boolean {
    return this.getProperties().findIndex((p) => p.name === name) !== -1;
  }

  /** Sets the current state of viewer properties as the default configuration used to create new viewer
  * instances of this type. Equivalent to the "Pick Up / Apply | Set as Default" context menu command.
  * Read more about viewer commands: https://datagrok.ai/help/visualize/viewers/#common-actions
  * @param data indicates if data settings should be copied.
  * @param style indicates if style (non-data) settings should be copied. */
  setDefault(data: boolean = false, style: boolean = true) {
    if (this.source instanceof DG.Viewer)
      api.grok_Viewer_Props_SetDefault(this.source.dart, data, style);
    else
      throw 'Call failed: object is not Viewer instance';
  }

  static setDefaultProperty(viewerType: string, propertyName: string, propertyValue: any) {
    api.grok_Viewer_Props_SetDefaultProperty(viewerType, propertyName, propertyValue);
  }

  /** Clears the previously remembered default settings for viewers of this type. See also: [setDefault] */
  resetDefault() {
    if (this.source instanceof DG.Viewer)
      api.grok_Viewer_Props_ResetDefault(this.source.dart);
    else
      throw 'Call failed: object is not Viewer instance';
  }
}


/** Base class for controls that have a visual root and a set of properties. */
export class Widget<TSettings = any> {

  public get type(): string { return 'Unknown'; }

  /** Contains auxiliary information */
  public temp: any;

  /** Constructor function. No parameters, returns [Widget]. */
  factory: Func | null = null;

  protected _root: HTMLElement;
  protected _properties: Property[];
  props: TSettings & ObjectPropertyBag; //ObjectPropertyBag;
  subs: Subscription[];
  dart: any;
  isDetached: boolean = false;

  /** @constructs Widget and initializes its root. */
  constructor(widgetRoot: HTMLElement) {

    /** @member {HTMLElement} */
    this._root = widgetRoot;

    /** @member {Property[]}*/
    this._properties = [];

    /** @member {ObjectPropertyBag} */
    // @ts-ignore
    this.props = new ObjectPropertyBag(this);

    /** @member {StreamSubscription[]} */
    this.subs = [];

    this.getProperties = this.getProperties.bind(this);

    this.temp = {};
  }

  /** Returns all currently active widgets. */
  static getAll(): Widget[] {
    return api.grok_Widget_GetAll();
  }

  /** Finds existing widget from its visual root. */
  static find(root: Element): Widget | null {
    return api.grok_Widget_FromRoot(root);
  }

  toDart() {
    if (this.dart == null)
      this.dart = api.grok_Widget_Wrap(this);
    return this.dart;
  }

  /** Registers a subscription to an external event.
   * @param {Subscription} subscription */
  sub(subscription: Subscription): void {
    this.subs.push(subscription);
  }

  /**
   * @param {Object} properties
   * @returns {Widget} */
  apply(properties: object): Widget {
    for (let name of Object.keys(properties))
      if (typeof name !== 'undefined')
        // @ts-ignore
        this.props[name] = properties[name];

     //this.props.apply(properties);
    return this;
  }

  getProperties(): Property[] { return this._properties; }

  /** Gets called when viewer's property is changed.
   * @param {Property} property - or null, if multiple properties were changed. */
  onPropertyChanged(property: Property | null): void {}

  getDartProperties(): any[] {
    return this.getProperties().map((p) => p.dart);
  }

  sourceRowsChanged(): void {};

  onFrameAttached(dataFrame: DataFrame): void {
    if (this.props.hasProperty('dataFrame'))
      this.props.set('dataFrame', dataFrame);
  }

  /** Widget's visual root.
   * @type {HTMLElement} */
  get root(): HTMLElement { return this._root; }
  set root(r: HTMLElement) { this._root = r; }

  /** Gets called when a widget is detached and will no longer be used. Typically used for unsubscribing from events.
   * Be sure to call super.detach() if this method is overridden.  */
  detach(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.isDetached = true;
  }

  /** Registers an property with the specified type, name, and defaultValue.
   *  @see Registered property gets added to {@link properties}.
   *  Returns default value, thus allowing to combine registering a property with the initialization
   *
   * @param {string} propertyName
   * @param {TYPE} propertyType
   * @param defaultValue
   * @param {Object} options
   * @returns {*}
   * @private
   */
  addProperty(propertyName: string, propertyType: Type, defaultValue: any = null, options: { [key: string]: any } & PropertyOptions | null = null): any {
    const fieldName = options?.fieldName ?? propertyName;

    let obj = this;
    // @ts-ignore
    let p = Property.create(propertyName, propertyType, (_) => obj[fieldName], null, defaultValue);
    p.set = function (_: any, x: any) {
      // @ts-ignore
      obj[fieldName] = x;
      obj.onPropertyChanged(p);
    };

    if (options !== null) {
      for (let key of Object.keys(options))
        if (key != 'fieldName')
          api.grok_PropMixin_SetPropertyValue(p.dart, key, options[key]);
    }

    this._properties.push(p);
    return p.defaultValue;
  }

  /** Creates a new widget from the root element. */
  static fromRoot(root: HTMLElement): Widget {
    return new Widget(root);
  }

  // /** Creates a {@see Widget} from the specified React component. */
  // // @ts-ignore
  // static react(reactComponent: React.DOMElement<any, any> | Array<React.DOMElement<any, any>> | React.CElement<any, any> | Array<React.CElement<any, any>> | React.ReactElement | Array<React.ReactElement>): Widget {
  //   let widget = Widget.fromRoot(ui.div());
  //   // @ts-ignore
  //   ReactDOM.render(reactComponent, widget.root);
  //   return widget;
  // }
}


/** Base class for DataFrame-bound filtering controls.
 * Supports collaborative filtering by efficiently working together with
 * other filters. */
export abstract class Filter extends Widget {

  /** An indicator icon on the left of the filter header, before the name.
   * A filter is responsible for hiding or showing it, depending on its state. */
  indicator: HTMLDivElement;

  /** Group of control icons on the right of the filter header, after the name.
   * FilterGroup takes care of its visibility. */
  controls: HTMLDivElement;

  /** A DataFrame this filter is associated with. */
  dataFrame: DataFrame | null;

  /** A column this filter is associated with. */
  column: Column | null = null;

  columnName?: string;

  /** Caption to be shown in the filter group. */
  get caption(): string { return this.columnName ?? ''}

  constructor() {
    super(ui.div());

    this.dataFrame = null;
    this.indicator = ui.div([], 'd4-filter-indicator');
    this.controls = ui.div([], 'd4-flex-row');

    $(this.indicator).hide();
  }

  // static create(type: FILTER_TYPE | null, column: Column): Filter {
  //   return api.grok_Filter_ForColumn(column, type);
  // }
  //
  // static forColumn(column: Column) { return Filter.create(null, column); }
  //
  // static histogram(column: Column) { return Filter.create(FILTER_TYPE.HISTOGRAM, column); }
  // static categorical(column: Column) { return Filter.create(FILTER_TYPE.CATEGORICAL, column); }
  // static multiValue(column: Column) { return Filter.create(FILTER_TYPE.MULTI_VALUE, column); }
  // static freeText(column: Column) { return Filter.create(FILTER_TYPE.FREE_TEXT, column); }

  /** Override to indicate whether the filter actually filters something (most don't in the initial state).
   * This is used to minimize the number of unnecessary computations.
   * Make sure to call super.isFiltering to check whether the filter has been disabled by the user */
  get isFiltering(): boolean {
    return !(this.root.parentElement?.classList?.contains('d4-filter-disabled') == true) &&
      !(this.root.parentElement?.parentElement?.parentElement?.classList?.contains('d4-filters-disabled') == true);
  }

  /** Whether a filter is ready to apply the filtering mask synchronously. */
  get isReadyToApplyFilter(): boolean { return true; }

  /** Override to provide short filter summary that might be shown on viewers or in the context panel. */
  abstract get filterSummary(): string;

  /** Override to filter the dataframe.
   * The method should work with `this.dataFrame.filter`, should disregard
   * false values (these are filtered out already by other filters), and should
   * filter out corresponding indexes. */
  abstract applyFilter(): void;

  /** Override to save filter state. */
  saveState(): any {
    return {
      column: this.columnName,
      columnName: this.columnName
    };
  }

  /** Override to load filter state. */
  applyState(state: any): void {
    this.columnName = state.columnName;
    this.column = this.columnName && this.dataFrame ? this.dataFrame.col(this.columnName) : null;
  }

  /** Gets called when a data frame is attached.
   * Make sure to call super.attach(dataFrame) when overriding.
   * @param {DataFrame} dataFrame*/
  attach(dataFrame: DataFrame): void {
    this.dataFrame = dataFrame;
    this.subs.push(this.dataFrame.onRowsFiltering
      .pipe(filter((_) => this.isFiltering && this.isReadyToApplyFilter))
      .subscribe((_) => {
        this.applyFilter();
        this.dataFrame!.rows.filters.push(`${this.columnName}: ${this.filterSummary}`);
      })
    );
  }

  /** Gets called when a previously used filter gets moved in the DOM tree.
   * Normally, you don't need to do anything, but this might be handy for
   * the iframe-based filters. */
  refresh() {}

  detach(): void {
    super.detach();
    if (this.isFiltering)
      this.dataFrame?.rows?.requestFilter();
  }
}


export class DartWidget extends Widget {
  constructor(dart: any) {
    super(api.grok_Widget_Get_Root(dart));
    this.dart = dart;
    this.temp = new MapProxy(api.grok_Widget_Get_Temp(this.dart));
  }

  get type(): string {
    return api.grok_Widget_Get_Type(this.dart);
  }

  get root(): HTMLElement {
    return api.grok_Widget_Get_Root(this.dart);
  }

  getProperties(): Property[] {
    return toJs(api.grok_PropMixin_GetProperties(this.dart));
  }
}

/**
 * Accordion control with collapsible/expandable panes.
 * Samples: {@link https://public.datagrok.ai/js/samples/ui/accordion}
 * @extends {DartWidget}
 * */
export class Accordion extends DartWidget {

  /** @constructs Accordion */
  constructor(dart: any) {
    super(dart);
  }

  /** An object this accordion is associated with */
  get context(): any {
    return toJs(api.grok_Accordion_Get_Context(this.dart));
  }
  set context(x: any) {
    api.grok_Accordion_Set_Context(this.dart, toDart(x));
  }

  /** Creates a new instance of Accordion */
  static create(key: any = null): Accordion {
    return toJs(api.grok_Accordion(key));
  }

  /** @type {AccordionPane[]} */
  get panes(): AccordionPane[] {
    return api.grok_TabControlBase_Get_Panes(this.dart).map(toJs);
  }

  /** Header element on top of the accordion */
  get header(): HTMLElement { return api.grok_Accordion_Get_Header(this.dart); }
  set header(header) { api.grok_Accordion_Set_Header(this.dart, header); }

  /** Whether tab header should be hidden if there is only one tab */
  get autoHideTabHeader(): boolean { return api.grok_Accordion_Get_AutoHideTabHeader(this.dart); }
  set autoHideTabHeader(x) { api.grok_Accordion_Set_AutoHideTabHeader(this.dart, x); }

  /** Returns a pane with the specified name.
   * @param {string} name
   * @returns {AccordionPane} */
  getPane(name: string): AccordionPane {
    return toJs(api.grok_TabControlBase_GetPane(this.dart, name));
  }

  /** Adds a title element. */
  addTitle(element: HTMLElement): void {
    return api.grok_Accordion_AddTitle(this.dart, element);
  }

  /** Adds a pane */
  addPane(name: string, getContent: () => HTMLElement, expanded: boolean = false, before: AccordionPane | null = null,
    allowDragOut: boolean = true): AccordionPane {
    return toJs(api.grok_Accordion_AddPane(this.dart, name, getContent, expanded, before !== null ? before.dart : null, null, allowDragOut));
  }

  /** Adds a pane with the count indicator next to the title.
   * getCount() is executed immediately. */
  addCountPane(name: string, getContent: () => HTMLElement, getCount: () => number, expanded: boolean = false, before: AccordionPane | null = null,
    allowDragOut: boolean = true): AccordionPane {
    return toJs(api.grok_Accordion_AddPane(this.dart, name, getContent, expanded, before !== null ? before.dart : null, getCount, allowDragOut));
  }

  /** Removed the specified pane. */
  removePane(pane: AccordionPane) {
    api.grok_Accordion_RemovePane(this.dart, pane.dart);
  }

  /** Finalizes accordion construction */
  end() {
    api.grok_Accordion_End(this.dart);
  }
}


/** A pane in the {@link Accordion} control. */
export class AccordionPane extends DartWidget {
  declare dart: any;

  constructor(dart: any) {
    super(dart);
  }

  /** Expanded state
   * @type {boolean} */
  get expanded(): boolean {
    return api.grok_AccordionPane_Get_Expanded(this.dart);
  }

  set expanded(v: boolean) {
    api.grok_AccordionPane_Set_Expanded(this.dart, v);
  }

  /** @type {string} */
  get name(): string {
    return api.grok_AccordionPane_Get_Name(this.dart);
  }

  set name(name: string) {
    api.grok_AccordionPane_Set_Name(this.dart, name);
  }
}


/** Tab control that hosts panes inside. See also {@link TabPane} */
export class TabControl {
  dart: any;
  constructor(dart: any) {
    this.dart = dart;
  }

  /** Creates a new TabControl */
  static create(vertical: boolean = false): TabControl {
    return toJs(api.grok_TabControl(vertical));
  }

  /** Visual root */
  get root(): HTMLDivElement {
    return api.grok_Widget_Get_Root(this.dart);
  }

  /** Header shown on top of the control */
  get header(): HTMLDivElement {
    return api.grok_TabControlBase_Get_Header(this.dart);
  }

  /** Panes currently present in the pane control.
   * Do not change the array, use {@link addPane} instead */
  get panes(): TabPane[] {
    return api.grok_TabControlBase_Get_Panes(this.dart).map(toJs);
  }

  /** Gets the pane with the specified name */
  getPane(name: string): TabPane {
    return toJs(api.grok_TabControlBase_GetPane(this.dart, name));
  }

  /** Adds a new pane with the specified name */
  addPane(name: string, getContent: () => HTMLElement, icon: any = null, options?: {allowClose: boolean}): TabPane {
    return toJs(api.grok_TabControlBase_AddPane(this.dart, name, getContent, icon, options?.allowClose ?? false));
  }

  /** Removes all panes */
  clear(): void {
    api.grok_TabControlBase_Clear(this.dart);
  }

  /** Currently visible pane */
  get currentPane(): TabPane { return api.grok_TabControlBase_Get_CurrentPane(this.dart); }
  set currentPane(v: TabPane) { api.grok_TabControlBase_Set_CurrentPane(this.dart, v.dart); }

  /** Occurs before the active pane is changed */
  get onBeforeTabChanged(): Observable<any> { return __obs('d4-tabcontrol-before-tab-changed', this.dart); }

  /** Occurs after the active pane is changed */
  get onTabChanged(): Observable<any> { return __obs('d4-tabcontrol-tab-changed', this.dart); }

  get onTabAdded(): Observable<any> { return __obs('d4-tabcontrol-tab-added', this.dart); }
  get onTabRemoved(): Observable<any> { return __obs('d4-tabcontrol-tab-removed', this.dart); }
}


/** Represents a pane of either {@link TabControl} or {@link Accordion} */
export class TabPane {
  dart: any;

  /** Creates TabPane from the Dart handle */
  constructor(dart: any) {
    this.dart = dart;
  }

  /** {@link TabControl} this pane belongs to */
  get parent(): TabControl {
    return toJs(api.grok_TabPane_Get_Parent(this.dart));
  }

  /** A control shown on top of the pane */
  get header(): HTMLDivElement {
    return api.grok_TabPane_Get_Header(this.dart);
  }

  /** Content */
  get content(): HTMLDivElement {
    return api.grok_TabPane_Get_Content(this.dart);
  }

  /** Whether the pane is expanded. Applicable to Accordion's panes only. */
  get expanded(): boolean { return api.grok_AccordionPane_Get_Expanded(this.dart); }
  set expanded(v: boolean) { api.grok_AccordionPane_Set_Expanded(this.dart, v); }

  /** Tab pane name */
  get name(): string { return api.grok_AccordionPane_Get_Name(this.dart); }
  set name(name: string) { api.grok_AccordionPane_Set_Name(this.dart, name); }
}


export class ToolboxPage {
  dart: any;
  constructor(dart: any) {
    this.dart = dart;
  }

  get accordion(): Accordion {
    return toJs(api.grok_ToolboxPage_Get_Accordion(this.dart));
  }
}


/**
 * A non-modal dialog.
 * Sample: https://public.datagrok.ai/js/samples/ui/dialogs
 *
 * @example
 * ui.dialog('Windows')
 *   .add(ui.)
 *   .add(ui.span(['People of Earth, your attention, please… ']))
 *   .onOK(() => { grok.shell.info('OK!'); })
 *   .show();
 * */
export class Dialog extends DartWidget {

  constructor(dart: any) {
    super(dart);
  }

  /** Creates a new dialog with the specified options. */
  static create(options?: { title?: string, helpUrl?: string, showHeader?: boolean, showFooter?: boolean } | string): Dialog {
    if (typeof options === 'string')
      return Dialog.create({ title: options });
    else
      return new Dialog(api.grok_Dialog(options?.title ?? '', options?.helpUrl, options?.showHeader ?? true, options?.showFooter ?? true));
  }

  /** When provided, adds a "?" icon to the dialog header on the right. */
  get helpUrl(): string { return api.grok_Dialog_Get_HelpUrl(this.dart); };
  set helpUrl(url: string) { api.grok_Dialog_Set_HelpUrl(this.dart, url); };

  /** Returns the title of a dialog. */
  get title(): string { return api.grok_Dialog_Get_Title(this.dart); };
  set title(t: string) { api.grok_Dialog_Set_Title(this.dart, t); };

  /** Returns a list of the dialog's inputs. */
  get inputs(): InputBase[] { return api.grok_Dialog_Get_Inputs(this.dart); }

  /** Returns an input with the specified caption, or throws an exception. */
  input(caption: string): InputBase {
    const input = this.inputs.find((f) => f.caption == caption);
    if (!input)
      throw `Input "${caption}" not found.`;
    return input;
  }

  /**
   * Sets the OK button handler, and shows the OK button
   * @param {Function} handler
   * @returns {Dialog} */
  onOK(handler: Function): Dialog {
    api.grok_Dialog_OnOK(this.dart, handler);
    return this;
  }

  /**
   * Sets the OK button handler and returns a promise of the handler callback.
   * @param {Function} handler
   * @returns {Promise} */
  async awaitOnOK<T = any>(handler: () => Promise<T>): Promise<T> {
    let completer = new Completer<T>();
    this.onOK(() => {
      handler().then((res) => completer.complete(res))
               .catch((error) => completer.reject(error));
    });
    this.onCancel(() => {
      completer.reject();
    });
    return completer.promise;
  }

  /**
   * Sets the CANCEL button handler
   * @param {Function} handler
   * @returns {Dialog} */
  onCancel(handler: Function): Dialog {
    api.grok_Dialog_OnCancel(this.dart, handler);
    return this;
  }

  /** @returns {Observable} */
  get onClose(): Observable<any> {
    return __obs('d4-dialog-closed', this.dart);
  }

  // Using __obs is a recommended method. The below are obsolete and shall not be used:
  // onClose(handler) { api.grok_Dialog_OnClose(this.dart, handler); return this; }
  // onClose(handler) { let s = _sub(api.grok_Dialog_OnClose(this.dart, () => { handler(); s.cancel(); })); return this; }

  /** @returns {Dialog}
   * @param {{modal: boolean, fullScreen: boolean, center: boolean, centerAt: Element, x: number, y: number, width: number, height: number}|{}} options
   * */
  show(options?: { modal?: boolean; resizable?: boolean; fullScreen?: boolean; center?: boolean; centerAt?: Element; x?: number; y?: number; width?: number; height?: number; backgroundColor?: string; showNextTo?: HTMLElement}): Dialog {
    api.grok_Dialog_Show(this.dart, options?.modal, options?.resizable, options?.fullScreen, options?.center, options?.centerAt, options?.x, options?.y, options?.width, options?.height, options?.backgroundColor, options?.showNextTo);
    return this;
  }

  /** @returns {Dialog}
   * @param {boolean} fullScreen  */
  showModal(fullScreen: boolean): Dialog {
    api.grok_Dialog_Show(this.dart, true, null, fullScreen, false, null, null, null, null, null, null, null);
    return this;
  }

  /** Adds content to the dialog.
   * @param {HTMLElement | Widget | InputBase} content
   * @returns {Dialog} */
  add(content: HTMLElement | Widget | InputBase): Dialog {
    api.grok_Dialog_Add(this.dart, toDart(content));
    return this;
  }

  /** Closes the dialog. */
  close(): void {
    api.grok_Dialog_Close(this.dart);
  }

  /** Returns command button with the specified text.
   * @param {string} text
   * @returns {HTMLButtonElement}
   * */
  getButton(text: string): HTMLButtonElement {
    return api.grok_Dialog_GetButton(this.dart, text);
  }

  /** Adds command button with the specified text.
   * @param {string} text
   * @param {Function} action
   * @param index
   * @param tooltip
   * @returns {Dialog}
   * */
  addButton(text: string, action: Function, index: number = 0, tooltip: any = null): Dialog {
    api.grok_Dialog_AddButton(this.dart, text, action, index, tooltip);
    return this;
  }

  /** Adds context action with the specified text.
   * @param {string} text
   * @param {Function} action
   * @returns {Dialog}
   * */
  addContextAction(text: string, action: Function): Dialog {
    api.grok_Dialog_AddContextAction(this.dart, text, action);
    return this;
  }

  /** Initializes the 'history' feature.
   * @param {Function} getInput - collects the input from UI into JSON-serializable object
   * @param {Function} applyInput - refreshes the UI according to input
   * */
  history(getInput: () => any, applyInput: (x: any) => void): void {
    api.grok_Dialog_History(this.dart, getInput, applyInput);
  }

  /** Initializes default history. */
  initDefaultHistory(): Dialog {
    api.grok_Dialog_InitDefaultHistory(this.dart);
    return this;
  }

  /** Clears the content. */
  clear() {
    api.grok_Dialog_Clear(this.dart);
  }

  /** Returns currently open dialogs. */
  static getOpenDialogs(): Dialog[] {
    return api.grok_Dialog_GetOpenDialogs();
  }
}


/** See {@link Menu.items} */
export interface IMenuItemsOptions<T = any> {

  /** Whether a check box appears before the item */
  isChecked?: (item: T) => boolean;

  /** If result is not null, the item is grayed out and the result is shown in the tooltip */
  isValid?: (item: T) => string | null;

  /** Text to be shown on the menu item */
  toString?: (item: T) => string;

  /** Tooltip */
  getTooltip?: (item: T) => string;

  /** Gets invoked when the mouse enters the item */
  onMouseEnter?: (item: T) => void;

  /** Identifies a group of items where only one can be checked at a time. */
  radioGroup?: string;
}

/** See {@link Menu.colorPalette} */
export interface IMenuColorPaletteOptions {

  /** Returns value put into the selector as initial or to reset. */
  getInitialValue?: () => number[];

  /** Called when color is selected by click.
   * @param {number[]} list - A sequence of selected color palette.
  */
  onSelect?: (list: number[]) => void;

  /** Called when color is hovered or reset.
   * @param {number[]} list - A sequence of selected color palette.
  */
  onPreview?: (list: number[]) => void;

  /** Either the current item is a separate subgroup by defined `string` name or inside main menu. */
  asGroup?: string | null;

  /** Whether the current item is visible. */
  visible?: boolean | null;

  /** Either the palette is displayed as a gradient (if `false`) or as a separate colors sequence (if `true`). */
  categorical?: boolean;

  /** Whether hover effect preview is allowed. */
  allowPreview?: boolean;

  /** Delay when color value reset to default after leaving hovered item. */
  resetColorMs: number;
}

/** See {@link IMenuSingleColumnSelectorOptions} and {@link IMenuMultiColumnSelectorOptions} */
export interface IMenuColumnSelectorOptions<T> {

  /** Value put into the selector as initial or to reset. */
  initialValue?: T;

  /** Called when selector value is changed */
  onChange?: (...args: any[]) => void;

  /** Either the current item is a separate subgroup by defined `string` name or inside main menu. */
  asGroup?: string | null,

  /** Whether the current item is visible. */
  visible?: boolean;

  /** Whether the current item can be changed or its visibility can be toggled. */
  editable?: boolean;

  /** Filters set selector columns to be displayed. */
  columnFilter?: (c: Column) => boolean;
}

/** See {@link Menu.singleColumnSelector} */
export interface IMenuSingleColumnSelectorOptions extends IMenuColumnSelectorOptions<string> {

  /** Called when selector value is changed.
   * @param {ColumnGrid} g - selector column grid instance.
   * @param {Column} c - A column to be selected.
   * @param {boolean} currentRowChanged - Either the current row is changed by click or just selected on hover.
  */
  onChange?: (grid: ColumnGrid, column: Column, currentRowChanged: boolean) => void;

  /** Whether selector contains empty value to indicate none selected. */
  nullable?: boolean;

  /** Whether the current item is closed after click. */
  closeOnClick?: boolean;

  /** Whether a hovered value is selected. */
  changeOnHover?: boolean;
}

/** See {@link Menu.multiColumnSelector} */
export interface IMenuMultiColumnSelectorOptions extends IMenuColumnSelectorOptions<string[]> {

  /** Called when selector value is changed.
   * @param {ColumnGrid} g - selector column grid instance.
  */
  onChange?: (grid: ColumnGrid) => void;
}

/** See {@link Menu.header} */
export interface IMenuHeaderOptions {

  /** Called when header is clicked. */
  onClick?: (item: any) => void;

  /** Whether hover effect is applied. */
  hasHoverEffect?: boolean;

  /** Tooltip to be shown on the menu item. */
  getDescription?: () => string;
}

export interface IMenuItemOptions {
  /** Identifies a group of items where only one can be checked at a time. */
  radioGroup?: string;

  /** Position in the menu */
  order?: number;

  /** Shortcut to be shown on the item. NOTE: it does not handle the keypress, just shows the shortcut*/
  shortcut?: string;

  /** Whether the menu is visible; if false, the menu is not added. Might be handy in for-loops and fluent API. */
  visible?: boolean;

  /** A function that gets called each time an item is shown.
   * Should return null if the item is enabled, otherwise the reason why it's disabled.
   * The reason for being disabled is shown in a tooltip. */
  isEnabled?: () => (string | null);

  /** For items preceded by checkboxes, indicates if the item is checked. */
  check?: boolean;

  /** Tooltip to be shown on the menu item */
  description?: string;
}


export interface IShowMenuOptions {
  element?: HTMLElement,
  causedBy?: MouseEvent,
  x?: number,
  y?: number,
  nextToElement?: boolean
}

/**
 * Menu (either top menu or popup menu).
 * Top menu sample: {@link https://public.datagrok.ai/js/samples/ui/menu}
 * Popup menu sample: {@link https://public.datagrok.ai/js/samples/ui/popup-menu}
 *
 * @example
 * DG.Menu.popup()
 *   .item('Show info', () => grok.shell.info('Info'))
 *   .separator()
 *   .items(['First', 'Second'], (s) => grok.shell.info(s))
 *   .show();
 * */
export class Menu {
  dart: any;
  _check: HTMLDivElement = ui.div('d4-menu-item-check');

  constructor(dart: any) {
    this.dart = dart;
  }

  static create(): Menu {
    return toJs(api.grok_Menu());
  }

  /** Creates a popup menu. */
  static popup(): Menu {
    return toJs(api.grok_Menu_Context());
  }

  get root(): HTMLElement { return api.grok_Menu_Get_Root(this.dart); }

  get closeOnClick(): boolean { return api.grok_Menu_Get_CloseOnClick(this.dart); }
  set closeOnClick(value: boolean) { api.grok_Menu_Set_CloseOnClick(this.dart, value); }

  /** Finds a child menu item with the specified text. */
  find(text: string): Menu {
    return toJs(api.grok_Menu_Find(this.dart, text));
  }

  /** Executes the onClick function for that menu item.
   * Only works for items, not groups. */
  click(): void {
    api.grok_Menu_Click(this.dart);
  }

  /** Removes a child menu item with the specified text. */
  remove(text: string): void {
    api.grok_Menu_Remove(this.dart, text);
  }

  /** Removes all child menu items. */
  clear(): void {
    api.grok_Menu_Clear(this.dart);
  }

  /** Returns an existing menu group or adds a new group with the specified text. */
  group(text: string, order: number | null = null): Menu {
    return toJs(api.grok_Menu_Group(this.dart, text, order));
  }

  /** Ends a group of menu items and returns to the higher menu level.
   * @returns {Menu} `this` menu itself. */
  endGroup(): Menu {
    return toJs(api.grok_Menu_EndGroup(this.dart));
  }

  /** Adds a menu group with the specified text and handler. */
  item(text: string, onClick: () => void, order: number | null = null, options: IMenuItemOptions | null = null): Menu {
    return toJs(api.grok_Menu_Item(this.dart, text, onClick, order, options));
  }

  /** For each item in items, adds a menu group with the specified text and handler. */
  items<T = any>(items: T[], onClick: (item: T) => void, options: IMenuItemsOptions<T> | null = null): Menu {
    return toJs(api.grok_Menu_Items(this.dart, items, onClick, options?.isValid, options?.isChecked,
      options?.hasOwnProperty('toString') ? options.toString : null,
      options?.getTooltip, options?.onMouseEnter, options?.radioGroup));
  }

  /** Adds color palettes colors to menu.
   * @param initial - Initial colors to be set first or reset.
   * @param colors - Array of arrays of color choices.
   * @param options - Optional params and functions, see {@link IMenuColorPaletteOptions}.
   * @returns {Menu} `this` menu itself. */
  colorPalette(colors: number[][], options?: IMenuColorPaletteOptions): Menu {
    return toJs(api.grok_Menu_ColorPalette(this.dart, colors, options?.getInitialValue, options?.onSelect,
      options?.onPreview, options?.asGroup, options?.visible, options?.categorical ?? false, options?.resetColorMs ?? 200));
  }

  /** Adds single-column selector to menu.
   * @param dataFrame - Data frame to be used for the selector,where column choices are taken from.
   * @param options - Optional params and functions, see {@link IMenuSingleColumnSelectorOptions}.
   * @returns {Menu} `this` menu itself. */
  singleColumnSelector(dataFrame: DataFrame, options?: IMenuSingleColumnSelectorOptions): Menu {
    return toJs(api.grok_Menu_SingleColumSelector(this.dart, dataFrame.dart, options?.initialValue,
      !options?.onChange ? null : (grid: any, c: any, currentRowChanged: boolean) => options?.onChange?.(toJs(grid), toJs(c), currentRowChanged),
      options?.asGroup, options?.nullable ?? false, options?.visible ?? true, options?.editable ?? false, options?.closeOnClick ?? false,
      options?.changeOnHover ?? true, (c: any) => options?.columnFilter?.(toJs(c)) ?? true));
  }

  /** Adds multi-column selector to menu.
   * @param dataFrame - Data frame to be used for the selector,where column choices are taken from.
   * @param options - Optional params and functions, see {@link IMenuMultiColumnSelectorOptions}.
   * @returns {Menu} `this` menu itself. */
  multiColumnSelector(dataFrame: DataFrame, options?: IMenuMultiColumnSelectorOptions): Menu {
    return toJs(api.grok_Menu_MultiColumSelector(this.dart, dataFrame.dart, options?.initialValue,
      !options?.onChange ? null : (grid: any) => options?.onChange?.(toJs(grid)),
      options?.asGroup, options?.visible ?? true, options?.editable ?? false, (c: any) => options?.columnFilter?.(toJs(c)) ?? true));
  }

  /** Adds a header title.
   * @param text - Header title text.
   * @param options - Optional params and functions, see {@link IMenuHeaderOptions}.
   * @returns {Menu} `this` menu itself. */
  header(text: string, options?: IMenuHeaderOptions): Menu {
    return toJs(api.grok_Menu_Header(this.dart, text, options?.onClick, options?.hasHoverEffect ?? false, options?.getDescription));
  }

  /** Adds a separator line.
   *  @returns {Menu} */
  separator(): Menu {
    return toJs(api.grok_Menu_Separator(this.dart));
  }

  /** Shows the menu.
   * @returns {Menu} `this` menu itself. */
  show(options?: IShowMenuOptions): Menu {
    return toJs(api.grok_Menu_Show(this.dart, options?.element, options?.causedBy, options?.x, options?.y, options?.nextToElement));
  }

  /** Binds the menu to the specified {@link options.element} */
  bind(element: HTMLElement): Menu {
    element.oncontextmenu = (ev) => {
      ev.preventDefault();
      this.show({causedBy: ev});
    }
    return this;
  }

  get onContextMenuItemClick() {
    return __obs('d4-menu-item-click', this.dart);
  }

  toString(): string {
    return api.grok_MenuItem_ToString(this.dart);
  }
}


/** Balloon-style visual notifications. */
export class Balloon {

  /** Shows information message (green background) */
   info(s: string | HTMLElement): void {
    api.grok_Balloon(s, 'info', toDart({}));
  }

  /** Shows information message (red background) */
  error(s: string | HTMLElement): void {
    api.grok_Balloon(s, 'error', toDart({}));
  }

  warning(s: string | HTMLElement): void {
    api.grok_Balloon(s, 'warning', toDart({}));
  }

  /** Closes all balloons currently shown */
  static closeAll(): void {
    api.grok_Balloon_CloseAll();
  }
}



/** Class for code input editor. */
export class CodeEditor {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static create(script = '', mode = 'javascript', placeholder = '', options?: ICodeEditorOptions): CodeEditor {
    return toJs(api.grok_CodeEditor(script, mode, placeholder, options?.root));
  }

  append(text: string): void {
    api.grok_CodeEditor_Append(this.dart, text);
  }

  async setReadOnly(value: boolean): Promise<void> {
    await api.grok_CodeEditor_SetReadOnly(this.dart, value);
  }

  get root(): HTMLElement { return api.grok_CodeEditor_Get_Root(this.dart); }

  get value(): string { return api.grok_CodeEditor_Get_Value(this.dart); }
  set value(x: string) { api.grok_CodeEditor_Set_Value(this.dart, x); }

  get onValueChanged(): Observable<any> { return observeStream(api.grok_CodeEditor_OnValueChanged(this.dart)); }
}

/** Input control base. Could be used for editing {@link Property} values as well.
 * The root is a div that consists of {@link captionLabel} and {@link input}.
 * */
export class InputBase<T = any> {
  dart: any;

  constructor(dart: any, onChanged: any = null) {
    this.dart = dart;
    if (onChanged != null)
      this.onChanged.subscribe((_) => onChanged(this.value));
  }

  /** Creates input for the specified property, and optionally binds it to the specified object */
  static forProperty(property: Property, source: any = null): InputBase {
    return toJs(api.grok_InputBase_ForProperty(property.dart, source));
  }

  /** Creates input for the specified input type */
  static forInputType(inputType: string | d4.InputType): InputBase {
    return toJs(api.grok_InputBase_ForInputType(inputType as string));
  }

  /** Creates input for the specified column */
  static forColumn<T = any>(column: Column<T>): InputBase<T | null> {
    return toJs(api.grok_InputBase_ForColumn(column.dart));
  }

  /** Input type identifier (such as "Slider" for the slider input). See {@link InputType}. */
  get inputType(): string {
    return api.grok_InputBase_Get_InputType(this.dart);
  };

  /** Data type this input can edit. See {@link Type}. */
  get dataType(): string { return api.grok_InputBase_Get_DataType(this.dart); };

  /** Visual root (typically a div element that contains {@link caption} and {@link input}) */
  get root(): HTMLElement { return api.grok_InputBase_Get_Root(this.dart); };

  get caption(): string {
    return api.grok_InputBase_Get_Caption(this.dart);
  }
  set caption(s: string) { api.grok_InputBase_Set_Caption(this.dart, s); }

  /** Property if associated with */
  get property(): any { return toJs(api.grok_InputBase_Get_Property(this.dart)); }
  set property(p: Property) { api.grok_InputBase_Set_Property(this.dart, toDart(p)); }

  /** Value format. */
  get format(): string { return api.grok_InputBase_Get_Format(this.dart); }
  set format(s: string) { api.grok_InputBase_Set_Format(this.dart, s); }

  get captionLabel(): HTMLElement { return api.grok_InputBase_Get_CaptionLabel(this.dart); }

  /** Returns the actual input */
  get input(): HTMLElement { return api.grok_InputBase_Get_Input(this.dart); }

  /** Whether empty values are allowed */
  get nullable(): boolean { return api.grok_InputBase_Get_Nullable(this.dart); }
  set nullable(v: boolean) { api.grok_InputBase_Set_Nullable(this.dart, v); }

  /** Whether events are thrown on value set */
  get notify(): boolean { return api.grok_InputBase_Get_Notify(this.dart); }
  set notify(v: boolean) { api.grok_InputBase_Set_Notify(this.dart, v); }

  /** Input value */
  get value(): T { return toJs(api.grok_InputBase_Get_Value(this.dart)); }
  set value(x: T) { api.grok_InputBase_Set_Value(this.dart, toDart(x)); }

  /** String representation of the {@link value} */
  get stringValue(): string { return api.grok_InputBase_Get_StringValue(this.dart); }
  set stringValue(s: string) { api.grok_InputBase_Set_StringValue(this.dart, s); }

  /** Whether the input is readonly */
  get readOnly(): boolean { return api.grok_InputBase_Get_ReadOnly(this.dart); }
  set readOnly(v: boolean) { api.grok_InputBase_Set_ReadOnly(this.dart, v); }

  /** Whether the input is enabled */
  get enabled(): boolean { return api.grok_InputBase_Get_Enabled(this.dart); }
  set enabled(v: boolean) { api.grok_InputBase_Set_Enabled(this.dart, v); }

  /** Occurs when [value] is changed, either by user or programmatically. */
  get onChanged(): Observable<T> { return api.grok_InputBase_OnChanged(this.dart); }

  /** Occurs when [value] is changed by user. */
  get onInput(): Observable<Event> { return api.grok_InputBase_OnInput(this.dart); }

  /** Saves the value. Used in dialog history. See also {@link load} */
  save(): any {
    return api.grok_InputBase_Save(this.dart);
  };

  /** Loads the value. Used in dialog history. See also {@link load} */
  load(s: any): any { return api.grok_InputBase_Load(this.dart, s); };

  init(): any {
    return api.grok_InputBase_Init(this.dart);
  };

  /** Fires the 'changed' event (value has changed). See also {@link fireInput} */
  fireChanged(): any {
    return api.grok_InputBase_FireChanged(this.dart);
  };

  /** Fires the 'input' event (user input). See also {@link fireChanged} */
  fireInput(): any {
    return api.grok_InputBase_FireInput(this.dart);
  };

  /** Adds the specified caption */
  addCaption(caption: string): InputBase<T> {
    api.grok_InputBase_AddCaption(this.dart, caption);
    return this;
  };

  /** Adds the specified postfix */
  addPostfix(postfix: string): InputBase<T> {
    api.grok_InputBase_AddPostfix(this.dart, postfix);
    return this;
  };

  /** Adds the specified options */
  addOptions(options: HTMLElement): InputBase<T> {
    api.grok_InputBase_AddOptions(this.dart, options);
    return this;
  };

  /** Adds a usage example to the input's hamburger menu */
  addPatternMenu(pattern: any): void {
    api.grok_InputBase_AddPatternMenu(this.dart, pattern);
  }

  /** Adds a validator that accepts a string representation of the edited value
   * and returns null if valid, or error message if invalid*/
  addValidator(validator: (value: string) => string | null): void {
    api.grok_InputBase_AddValidator(this.dart, validator);
  }

  /** Sets the tooltip */
  setTooltip(msg: string, tooltipCheck: (() => boolean) | null = null): InputBase<T> {
    api.grok_InputBase_SetTooltip(this.dart, msg, tooltipCheck);
    return this;
  };

  get classList(): DOMTokenList { return this.root.classList; }
}


export class DartWrapper {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }
}


/** A form with multiple inputs inside */
export class InputForm extends DartWrapper {
  constructor(dart: any) { super(dart); }

  /** Creates an InputForm for the specified function call. */
  static async forFuncCall(funcCall: FuncCall, options?: { twoWayBinding?: boolean, skipDefaultInit?: boolean }): Promise<InputForm> {
    return new InputForm(await api.grok_InputForm_ForFuncCallAsync(funcCall.dart, options?.twoWayBinding ?? true, options?.skipDefaultInit ?? false));
  }

  static forInputs(inputs: InputBase[]): InputForm {
    return new InputForm(api.grok_InputForm_ForInputs(inputs.map((input) => input.dart)));
  }

  get root(): HTMLElement { return api.grok_InputForm_Get_Root(this.dart); };

  getInput(propertyName: string): InputBase { return toJs(api.grok_InputForm_GetInput(this.dart, propertyName)); }

  get source(): any { return toJs(api.grok_InputForm_Get_Source(this.dart)); };

  set source(source: any) { api.grok_InputForm_Set_Source(this.dart, toDart(source)); };

  /** Occurs when user changes any input value in a form. */
  get onInputChanged(): Observable<EventData<InputArgs>> { return observeStream(api.grok_InputForm_OnInputChanged(this.dart)); }

  /** Occurs after the form is validated, no matter whether it is valid or not. */
  get onValidationCompleted(): Observable<any> { return observeStream(api.grok_InputForm_OnValidationCompleted(this.dart)); }

  get isValid(): boolean { return api.grok_InputForm_Get_IsValid(this.dart); }
}


/** Base class for JS value editors */
export abstract class JsInputBase<T = any> extends InputBase<T> {
  //onInput: rxjs.Subject<any> = new rxjs.Subject<any>();

  abstract get inputType(): string;
  abstract get dataType(): string;

  abstract getInput(): HTMLElement;

  abstract getValue(): T;
  abstract setValue(value: T): void;

  abstract getStringValue(): string;
  abstract setStringValue(value: string): void;

  get input() { return this.getInput(); }

  get value(): T { return this.getValue(); }
  set value(value: T) { this.setValue(value); }

  get stringValue(): string { return this.getStringValue(); }
  set stringValue(value: string) { this.setStringValue(value); }

  constructor() {
    super(null, null);
    this.dart = api.grok_InputBase_FromJS(this);
  }
}


export class DateInput extends InputBase<dayjs.Dayjs | null> {
  declare dart: any;

  constructor(dart: any, onChanged: any = null) {
    super(dart, onChanged);
  }

  get value(): dayjs.Dayjs | null {
    const date = api.grok_DateInput_Get_Value(this.dart);
    return date == null ? date : dayjs(date);
  }
  set value(x: dayjs.Dayjs | null) { toDart(api.grok_DateInput_Set_Value(this.dart, x?.valueOf())); }
}


export class ChoiceInput<T> extends InputBase<T> {
  declare dart: any;

  constructor(dart: any, onChanged: any = null) {
    super(dart, onChanged);
  }

  get items(): T[] { return toJs(api.grok_ChoiceInput_Get_Items(this.dart)); }
  set items(s: T[]) { api.grok_ChoiceInput_Set_Items(this.dart, toDart(s)); }
}


export class ProgressIndicator {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static create() {
    return toJs(api.grok_ProgressIndicator_Create());
  }

  get percent(): number {
    return api.grok_ProgressIndicator_Get_Percent(this.dart);
  }

  /** Flag indicating whether the operation was canceled by the user. */
  get canceled(): boolean { return api.grok_ProgressIndicator_Get_Canceled(this.dart); }

  get description(): string { return api.grok_ProgressIndicator_Get_Description(this.dart); }
  set description(s: string) { api.grok_ProgressIndicator_Set_Description(this.dart, s); }

  update(percent: number, description: string): void {
    api.grok_ProgressIndicator_Update(this.dart, percent, description);
  }

  log(line: string): void {
    api.grok_ProgressIndicator_Log(this.dart, line);
  }

  get onProgressUpdated(): Observable<any> {
    return observeStream(api.grok_Progress_Updated(this.dart));
  }

  get onLogUpdated(): Observable<any> {
    return observeStream(api.grok_Progress_Log_Updated(this.dart));
  }

  get onCanceled(): Observable<any> {
    return observeStream(api.grok_Progress_Canceled(this.dart));
  }
}


export class TaskBarProgressIndicator extends ProgressIndicator {
  static create(name?: string, options?: { cancelable?: boolean, pausable?: boolean, spinner?: boolean }): TaskBarProgressIndicator {
    return toJs(api.grok_TaskBarProgressIndicator_Create(name, options?.cancelable ?? false, options?.pausable ?? false, options?.spinner ?? false));
  }

  close(): any {
    return api.grok_TaskBarProgressIndicator_Close(this.dart);
  }
}


export class TagEditor {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static create(): TagEditor {
    return toJs(api.grok_TagEditor());
  }

  get root(): HTMLElement {
    return api.grok_TagEditor_Get_Root(this.dart);
  }

  get tags(): TagElement[] {
    return api.grok_TagEditor_Get_Tags(this.dart);
  }

  addTag(tag: TagElement | string, notify: boolean = true) {
    return api.grok_TagEditor_AddTag(this.dart, tag, notify);
  }

  removeTag(tag: TagElement | string): void {
    api.grok_TagEditor_RemoveTag(this.dart, tag);
  }

  clearTags(): void {
    api.grok_TagEditor_ClearTags(this.dart);
  }

  set acceptsDragDrop(predicate: (...params: any[]) => boolean) {
    api.grok_TagEditor_Set_AcceptsDragDrop(this.dart, (x: any) => predicate(toJs(x, false)));
  };

  set doDrop(action: Function) {
    api.grok_TagEditor_Set_DoDrop(this.dart, (x: any) => action(toJs(x, false)));
  }

  onChanged(callback: Function): StreamSubscription {
    return _sub(api.grok_TagEditor_OnChanged(this.dart, callback));
  }
}


export class TagElement {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  get tag(): TagElement | string {
    return api.grok_TagElement_Get_Tag(this.dart);
  };

  set tag(x: TagElement | string) {
    api.grok_TagElement_Set_Tag(this.dart, x);
  };
}


/** Color-related routines. */
export class Color {

  /** Returns a color associated with the specified cell as an ARGB-formatted integer.
   * To convert to html color, use {@link getCellColorHtml} or {@link toHtml}. */
  static getCellColor(cell: Cell): number {
    return api.grok_Color_FromCell(cell.dart);
  }

  /** Returns a string representation of the color associated with the specified cell.
   * For batch color manipulations, use {@link getCellColor}. */
  static getCellColorHtml(cell: Cell): string {
    return Color.toHtml(Color.getCellColor(cell));
  }

  /** Returns a color associated with the specified category within a column.
   * Returns ARGB-formatted integer. To convert to html color, use {@link toHtml}. */
  static getCategoryColor(column: Column, category: any): number {
    return api.grok_Color_FromCategory(column.dart, category);
  }

  /** Returns the Alpha component of the color represented as ARGB-formatted integer. */
  static a(c: number): number { return (c >> 24) & 0xFF; }

  /** Returns the Red component of the color represented as ARGB-formatted integer. */
  static r(c: number): number { return (c >> 16) & 0xFF; }

  /** Returns the Green component of the color represented as ARGB-formatted integer. */
  static g(c: number): number { return (c >> 8) & 0xFF; }

  /** Returns the Blue component of the color represented as ARGB-formatted integer. */
  static b(c: number): number { return c & 0xFF; }

  static argb(a: number, r: number, g: number, b: number) {
    return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
  }

  /** Returns the color with the specified alpha component (0-255). */
  static setAlpha(color: number, alpha: number) {
    return Color.argb(alpha, Color.r(color), Color.g(color), Color.b(color));
  }

  /** Returns i-th categorical color (looping over the palette if needed) */
  static getCategoricalColor(i: number): number {
    return Color.categoricalPalette[i % Color.categoricalPalette.length];
  }

  /** Returns either black or white color, depending on which one would be most contrast to the specified [color]. */
  static getContrastColor(color: number): number {
    return api.grok_Color_GetContrastColor(color);
  }

 /** Converts ARGB-formatted integer color to a HTML-formatted string (such as `#ffffff`). See also {@link toRgb}. */
  static toHtml(color: number): string { return api.grok_Color_ToHtml(color); }

  /** Convert HTML-formatted string (such as `#ffffff`) to ARGB-fromatted integer color */
  static fromHtml(htmlColor: string): number { return api.grok_Color_FromHtml(htmlColor); }

  /** Converts ARGB-formatted integer color to a HTML-formatted string (such as `rbg(20, 46, 124)`). See also {@link toHtml. }*/
  static toRgb(color: number): string {
    return color === null ? '' : `rgb(${Color.r(color)},${Color.g(color)},${Color.b(color)})`;
  }

  /** For RDKit molecule substruct highlight */
  static hexToPercentRgb(hex: string): number[] | null {
    const result = hex.length === 7 ? /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) :
      /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 256,
      parseInt(result[2], 16) / 256,
      parseInt(result[3], 16) / 256,
      result.length > 4 ? parseInt(result[4], 16) / 256 : 0.3
    ] : null;
  }


  /** Returns the standard palette of the categorical colors used across all visualizations in Datagrok. */
  static get categoricalPalette(): number[] {
    return api.grok_Color_CategoricalPalette();
  }

  /** Returns the map of existing palettes used in Datagrok. */
  static get categoricalPalettes(): {[key: string]: any} {
    return new MapProxy(api.grok_Color_GetCategoricalPalettes());
  }

  /** Returns the list of categorical color schemes used in Datagrok. */
  static get categoricalSchemes(): number[] {
    return api.grok_Color_CategoricalSchemes();
  }

  /** Returns the list of continuous color schemes for linear coloring used in Datagrok. */
  static get continuousSchemes(): number[] {
    return api.grok_Color_ContinuousSchemes();
  }
  

  static scaleColor(x: number, min: number, max: number, alpha?: number, colorScheme?: number[]): number {
    return api.grok_Color_ScaleColor(x, min, max, alpha ? alpha : null, colorScheme ? colorScheme : null);
  }

  static highlight(color: number): number {
    return api.grok_Color_Highlight(color);
  }

  static darken(color: number, diff: number): number {
    return api.grok_Color_Darken(color, diff);
  }

  static  getRowColor(column: Column, row: number): number {
    return api.grok_Color_GetRowColor(column.dart, row);
  }

  static scale(x: number, min: number, max: number): number {
    return min === max ? min : (x - min) / (max - min);
  }

  static get gray(): number {
    return 0xFF808080;
  }

  static get lightLightGray(): number {
    return 0xFFF0F0F0;
  }

  static get lightGray(): number {
    return 0xFFD3D3D3;
  }

  static get darkGray(): number {
    return 0xFF838383;
  }

  static get blue(): number {
    return 0xFF0000FF;
  }

  static get green(): number {
    return 0xFF00FF00;
  }

  static get darkGreen(): number {
    return 0xFF006400;
  }

  static get black(): number {
    return 0xFF000000;
  }

  static get yellow(): number {
    return 0xFFFFFF00;
  }

  static get white(): number {
    return 0xFFFFFFFF;
  }

  static get red(): number {
    return 0xFFFF0000;
  }

  static get darkRed(): number {
    return 0xFF8b0000;
  }

  static get maroon(): number {
    return 0xFF800000;
  }

  static get olive(): number {
    return 0xFF808000;
  }

  static get orange(): number {
    return 0xFFFFA500;
  }

  static get darkOrange(): number {
    return 0xFFFF8C00;
  }

  static get lightBlue(): number {
    return 0xFFADD8E6;
  }

  static get darkBlue(): number {
    return 0xFF0000A0;
  }

  static get purple(): number {
    return 0xFF800080;
  }

  static get whitesmoke(): number {
    return 0xFFF5F5F5;
  }

  static get navy(): number {
    return 0xFF000080;
  }

  static get cyan(): number {
    return 0xFF00ffff;
  }

  static get filteredRows(): number {
    return 0xff1f77b4;
  }

  static get filteredOutRows(): number {
    return Color.lightLightGray;
  }

  static get selectedRows(): number {
    return Color.darkOrange;
  }

  static get missingValueRows(): number {
    return Color.filteredOutRows;
  }

  static get mouseOverRows(): number {
    return 0xFFAAAAAA;
  }

  static get currentRow(): number {
    return 0xFF38B738;
  }

  static get histogramBar(): number {
    return Color.filteredRows;
  }

  static get barChart(): number {
    return 0xFF24A221;
  }

  static get scatterPlotMarker(): number {
    return 0xFF40699c;
  }

  static get scatterPlotSelection(): number {
    return 0x80323232;
  }

  static get scatterPlotZoom(): number {
    return 0x80626200;
  }

  static get areaSelection(): number {
    return Color.lightBlue;
  }

  static get rowSelection(): number {
    return 0x60dcdca0;
  }

  static get colSelection(): number {
    return 0x60dcdca0;
  }

  static get areaZoom(): number {
    return 0x80323232;
  }

  static get gridWarningBackground(): number {
    return 0xFFFFB9A7;
  }

  static get success(): number {
    return 0xFF3cb173;
  }

  static get failure(): number {
    return 0xFFeb6767;
  }
}


/** Tree view node.
 * Sample: {@link https://public.datagrok.ai/js/samples/ui/tree-view}
 * */
export class TreeViewNode<T = any> {
  dart: any;

  /** @constructs {TreeView} from the Dart object */
  constructor(dart: any) {
    this.dart = dart;
  }

  /** Visual root */
  get root(): HTMLElement {
    return api.grok_TreeViewNode_Root(this.dart);
  }

  get rootNode(): TreeViewGroup {
    let x: TreeViewNode = this;
    while (x.parent)
      x = x.parent;
    return x as TreeViewGroup;
  }

  /* Node's parent */
  get parent(): TreeViewNode {
    return toJs(api.grok_TreeViewNode_Parent(this.dart));
  }

  /** Caption label */
  get captionLabel(): HTMLElement {
    return api.grok_TreeViewNode_CaptionLabel(this.dart);
  }

  /** Check box element  */
  get checkBox(): HTMLElement | null {
    return api.grok_TreeViewNode_CheckBox(this.dart);
  }

  /** Returns `true` if checked */
  get checked(): boolean { return api.grok_TreeViewNode_Get_Checked(this.dart); }
  set checked(checked: boolean) { api.grok_TreeViewNode_Set_Checked(this.dart, checked); }

  /** Node text */
  get text(): string { return api.grok_TreeViewNode_Get_Text(this.dart); }
  set text(value: string) {api.grok_TreeViewNode_Set_Text(this.dart, value); }

  get tag(): any { return api.grok_TreeViewNode_Get_Tag(this.dart); }
  set tag(t : any) { api.grok_TreeViewNode_Set_Tag(this.dart, t); }

  /** Node value */
  get value(): T { return api.grok_TreeViewNode_Get_Value(this.dart); };
  set value(v: T) { api.grok_TreeViewNode_Set_Value(this.dart, v); };

  /** Enables checkbox */
  enableCheckBox(checked: boolean = false): void {
    api.grok_TreeViewNode_EnableCheckBox(this.dart, checked);
  }

  /**  */
  get onSelected(): Observable<TreeViewNode> { return __obs('d4-tree-view-node-current', this.dart); }

  /** Removes the node and its children from the parent */
  remove(): void {
    api.grok_TreeViewNode_Remove(this.dart);
  }
}

export class TreeViewGroup extends TreeViewNode {
  /** Creates new tree */
  static tree(): TreeViewGroup {
    return toJs(api.grok_TreeViewNode_Tree());
  }

  static fromItemCategories(items: any[], props: string[], options?: {
    removeEmpty: boolean, itemToElement?: (item:any) => Element, itemToString?: (item: any) => string, itemToValue?: (item: any) => any
  }): TreeViewGroup {

    function init(node: TreeViewGroup, path: string[]) {

      //
      const pathItems = items
        .filter((item) => props.every((p: string) => !(options?.removeEmpty ?? false) || item[p] != null))
        .filter((item) => path.every((p, i) => item[props[i]] == path[i]));

      // leafs
      if (path.length == props.length) {
        let itemToValue = options!.itemToValue ?? function (i) {return i;};
        let itemToString = options!.itemToElement ?? options!.itemToString;
        for (let item of pathItems)
          node.item(itemToString!(item), itemToValue(item));
      }
      else {
        let categories: Set<string> = new Set<string>();
        for (let item of pathItems)
          categories.add(item[props[path.length]]);

        for (let category of categories)
          init(node.group(category), [...path, category]);

        // lazy loading - use it for big collections and async queries
        // for (let category of categories)
        //   node.group(category)
        //     .onNodeExpanding
        //     .subscribe((expandingNode) => init(expandingNode, [...path, category]));
      }
    }

    let rootNode = TreeViewGroup.tree();
    init(rootNode, []);
    return rootNode;
  }

  /** Gets all node items */
  get items(): TreeViewNode[] {
    return api.grok_TreeViewNode_Items(this.dart).map((i: any) => toJs(i));
  }

  /** Gets the node's children */
  get children(): TreeViewNode[] {
    return api.grok_TreeViewNode_Children(this.dart).map((i: any) => toJs(i));
  }

  get expanded(): boolean { return api.grok_TreeViewNode_Get_Expanded(this.dart); }

  set expanded(isExpanded: boolean) { api.grok_TreeViewNode_Set_Expanded(this.dart, isExpanded); }

  /** Indicates whether check or uncheck is applied to a node only or to all node's children */
  get autoCheckChildren(): boolean { return api.grok_TreeViewNode_GetAutoCheckChildren(this.dart); }
  set autoCheckChildren(auto: boolean) { api.grok_TreeViewNode_SetAutoCheckChildren(this.dart, auto); }

  get currentItem(): TreeViewNode { return toJs(api.grok_TreeViewNode_Get_CurrentItem(this.dart)); }
  set currentItem(node: TreeViewNode) { api.grok_TreeViewNode_Set_CurrentItem(this.dart, toDart(node)); }

  /** Adds new group */
  group(text: string | Element, value: object | null = null, expanded: boolean = true, index: number | null = null): TreeViewGroup {
    return toJs(api.grok_TreeViewNode_Group(this.dart, text, value, expanded, index));
  }

  /** Returns existing, or creates a new node group */
  getOrCreateGroup(text: string, value: object | null = null, expanded: boolean = true): TreeViewGroup {
    return toJs(api.grok_TreeViewNode_GetOrCreateGroup(this.dart, text, value, expanded));
  }

  /** Adds new item to group */
  item(text: string | Element, value: object | null = null): TreeViewNode {
    return toJs(api.grok_TreeViewNode_Item(this.dart, text, value));
  }

  get onNodeExpanding(): Observable<TreeViewGroup> { return __obs('d4-tree-view-node-expanding', this.dart); }

  get onNodeAdded(): Observable<TreeViewNode> { return __obs('d4-tree-view-node-added', this.dart); }

  get onNodeCheckBoxToggled(): Observable<TreeViewNode> { return __obs('d4-tree-view-node-checkbox-toggled', this.dart); }

  get onChildNodeExpandedChanged(): Observable<TreeViewGroup> { return __obs('d4-tree-view-child-node-expanded-changed', this.dart); }

  get onChildNodeExpanding(): Observable<TreeViewGroup> { return __obs('d4-tree-view-child-node-expanding', this.dart); }

  // get onChildNodeContextMenu(): Observable<TreeViewNode> { return __obs('d4-tree-view-child-node-context-menu', this.dart); }
  get onNodeContextMenu(): Observable<TreeViewNode> { return __obs('d4-tree-view-node-context-menu', this.dart); }

  get onSelectedNodeChanged(): Observable<TreeViewNode> { return __obs('d4-tree-view-selected-node-changed', this.dart); }

  get onNodeMouseEnter(): Observable<TreeViewNode> { return __obs('d4-tree-view-child-node-mouse-enter', this.dart); }

  get onNodeMouseLeave(): Observable<TreeViewNode> { return __obs('d4-tree-view-child-node-mouse-leave', this.dart); }

  get onNodeEnter(): Observable<TreeViewNode> { return __obs('d4-tree-view-node-enter', this.dart); }

  async loadSources(source: HttpDataSource<any>): Promise<void> {
    return api.grok_TreeViewGroup_Load_Sources(this.dart, source.dart);
  }
}


/** A slider that lets user control both min and max values. */
export class RangeSlider extends DartWidget {

  static create(vertical: boolean = false, optionsStyle: RangeSliderStyle | SliderOptions = 'barbell'): RangeSlider {
    let options: SliderOptions = {};
    if (typeof optionsStyle !== 'string') {
      options.style = optionsStyle.style;
    } else {
      options.style = optionsStyle;
    }
    return toJs(api.grok_RangeSlider(options.style, vertical));
  }

  /** Minimum range value. */
  get minRange(): number { return api.grok_RangeSlider_Get_MinRange(this.dart); };

  /** Gets maximum range value. */
  get maxRange(): number { return api.grok_RangeSlider_Get_MaxRange(this.dart); };

  /** Gets minimum value. */
  get min(): number { return api.grok_RangeSlider_Get_Min(this.dart); };

  /** Gets maximum value. */
  get max(): number { return api.grok_RangeSlider_Get_Max(this.dart); };

  /** Sets values to range slider.
   * @param {number} minRange
   * @param {number} maxRange
   * @param {number} min
   * @param {number} max */
  setValues(minRange: number, maxRange: number, min: number, max: number): void {
    api.grok_RangeSlider_SetValues(this.dart, minRange, maxRange, min, max);
  }

  /** Sets showHandles in range slider.
   * @param {boolean} value */
  setShowHandles(value: boolean): void {
    api.grok_RangeSlider_SetShowHandles(this.dart, value);
  }

  /** Sets the specified min value, preserving the range (scrolls). */
  scrollTo(newMinValue: number): void { return api.grok_RangeSlider_ScrollTo(this.dart, newMinValue); }

  /** Shifts min and max values by the specified delta. */
  scrollBy(delta: number): void { return api.grok_RangeSlider_ScrollTo(this.dart, delta); }

  /** @returns {Observable} */
  get onValuesChanged(): Observable<any> {
    return observeStream(api.grok_RangeSlider_Get_OnValuesChanged(this.dart));
  }
}


export class HtmlTable extends DartWidget {

  /** @constructs {HtmlTable} */
  constructor(dart: any) {
    super(dart);
  }

  /** Creates a visual table based on [items], [renderer], and [columnNames]
   * @returns {HtmlTable} */
  static create(items: any, renderer: any, columnNames: any = null): HtmlTable {
    return toJs(api.grok_HtmlTable(items, renderer !== null ? (object: any, ind: number) => renderer(toJs(object), ind) : null, columnNames));
  }

  /** Removes item */
  remove(item: any): void {
    api.grok_HtmlTable_Remove(this.dart, item);
  }
}


/** A combo box with columns as item.
 * Supports sorting, searching, custom tooltips, column-specific rendering, drag-and-drop, etc */
export class ColumnComboBox extends DartWidget {
  /** @constructs {ColumnComboBox} */
  constructor(dart: any) {
    super(dart);
  }

  /** Creates a column combo box with specified [dataframe] and [predicate]. */
  static create(dataframe: DataFrame, predicate: Function): ColumnComboBox {
    return toJs(api.grok_ColumnComboBox(dataframe.dart, (x: any) => predicate(toJs(x))));
  }

  /** @type {boolean} */
  get vertical(): boolean {
    return api.grok_ColumnComboBox_Get_Vertical(this.dart);
  }

  /** Text to be shown before the combo box */
  get caption(): string { return api.grok_ColumnComboBox_Get_Caption(this.dart); }
  set caption(c: string) { api.grok_ColumnComboBox_Set_Caption(this.dart, c); }

  /** @type {Property} */
  get property(): Property {
    return toJs(api.grok_ColumnComboBox_Get_Property(this.dart));
  }

  onEvent(eventId: string): rxjs.Observable<any> {
    return __obs(eventId, this.dart);
  }

  /** Occurs when the value is changed. */
  get onChanged(): rxjs.Observable<String> { return this.onEvent('d4-column-box-column-changed'); }
}


/** Column legend for viewers */
export class Legend extends DartWidget {
  constructor(dart: any) {
    super(dart);
  }

  static create(column: Column): Legend {
    return toJs(api.grok_Legend(column.dart));
  }

  /** Column for the legend */
  get column(): Column { return toJs(api.grok_Legend_Get_Column(this.dart)); }
  set column(column: Column) { api.grok_Legend_Set_Column(this.dart, column.dart); }

  /** Whether to show empty categories */
  get showNulls(): boolean { return api.grok_Legend_Get_ShowNulls(this.dart); }
  set showNulls(show: boolean) { api.grok_Legend_Set_ShowNulls(this.dart, show); }

  /** Position (left / right / top / bottom) */
  get position(): LegendPosition { return api.grok_Legend_Get_Position(this.dart); }
  set position(pos: LegendPosition) { api.grok_Legend_Set_Position(this.dart, pos); }

  set onViewerLegendChanged(handler: Function) {
    api.grok_Legend_Set_OnViewerLegendChanged(this.dart, handler);
  }

  get filterBy() { return api.grok_Legend_Get_FilterBy(this.dart); }
}


export class PropertyGrid extends DartWidget {

  constructor() {
    super(api.grok_PropertyGrid());
  }

  update(src: any, props: Property[]) {
    api.grok_PropertyGrid_Update(this.dart, src, props.map((x) => toDart(x)));
  }
}

export type fileShares = 'S3';

/** File browser widget */
export class FilesWidget extends DartWidget {
  /** Creates a [FilesWidget] and opens a directory, if [path] is specified.
   * [path] accepts a full-qualified name (see [Entity.nqName]). */
  static create(params: {path?: string, dataSourceFilter?: fileShares[]} = {}): FilesWidget {
    return toJs(api.grok_FilesWidget(params));
  }
}

export class Breadcrumbs {
  path: string[];
  root: HTMLDivElement;

  constructor(path: string[]) {
    this.root = ui.div();
    this.path = path;

    this.root = ui.divH(path.map((element) => ui.div(
      ui.link(element, () => {}, '', 'ui-breadcrumbs-text-element'), 'ui-breadcrumbs-element')), 'ui-breadcrumbs');

    const rootElements = this.root.getElementsByClassName('ui-breadcrumbs-element');
    for (let i = 0; i < rootElements.length - 1; i++)
      rootElements[i].after(ui.iconFA('chevron-right'));
  }


  get onPathClick(): Observable<string[]> {
    const pathElements = this.root.getElementsByClassName('ui-breadcrumbs-text-element');

    return fromEvent<MouseEvent>(pathElements, 'click')
      .pipe(
        map((event) => {
          const currentElement = (event.target as HTMLElement).innerText;
          return this.path.slice(0, this.path.indexOf(currentElement) + 1);
        })
      );
  }
}

export class DropDown {
  private _element: HTMLElement;
  private _dropDownElement: HTMLDivElement;
  private _isMouseOverElement: boolean;
  private _label: string | Element;

  isExpanded: boolean;
  root: HTMLDivElement;


  constructor(label: string | Element, createElement: () => HTMLElement) {
    this._isMouseOverElement = false;
    this.isExpanded = false;

    this._label = label;
    this._element = createElement();
    this._dropDownElement = ui.div(ui.div(this._element, 'ui-drop-down-content'), 'ui-combo-drop-down-fixed');
    this._dropDownElement.style.visibility = 'hidden';

    this.root = ui.div([this._dropDownElement, this._label], 'ui-drop-down-root');

    this._initEventListeners();
  }


  private _initEventListeners() {
    this.root.addEventListener('mousedown', (e) => {
      // check if the button is LMB
      if (e.button !== 0)
        return;
      if (this._isMouseOverElement)
        return;

      this._setExpandedState(this.isExpanded);
    });

    this._dropDownElement.addEventListener('mouseover', () => {
      this._isMouseOverElement = true;
    }, false);

    this._dropDownElement.addEventListener('mouseleave', () => {
      this._isMouseOverElement = false;
    }, false);

    document.addEventListener('click', (event) => {
      if (this.root.contains(event.target as Node))
        return;
      if (!this.isExpanded)
        return;

      this._setExpandedState(this.isExpanded);
    });
  }

  private _setExpandedState(isExpanded: boolean) {
    this.isExpanded = !isExpanded;
    if (isExpanded) {
      this.root.classList.remove('ui-drop-down-root-expanded');
      this._dropDownElement.style.visibility = 'hidden';
      return;
    }

    this.root.classList.add('ui-drop-down-root-expanded');
    this._dropDownElement.style.visibility = 'visible';
  }


  get onExpand(): Observable<MouseEvent> {
    return fromEvent<MouseEvent>(this.root, 'click').pipe(filter(() => !this._isMouseOverElement));
  }

  get onElementClick(): Observable<MouseEvent> {
    return fromEvent<MouseEvent>(this._dropDownElement, 'click');
  }

  // TODO: add list constructor to DropDown
}

export class TypeAhead extends InputBase {
  constructor(name: string, config: TypeAheadConfig) {
    const inputElement = ui.input.string(name, {value: ''});
    super(inputElement.dart);

    const typeAheadConfig: typeaheadConfig<Dictionary> = Object.assign(
      {input: <HTMLInputElement> this.input}, config);

    typeahead(typeAheadConfig);
    this._changeStyles();
  }

  _changeStyles() {
    this.root.getElementsByClassName('tt-list')[0].className = 'ui-input-list';
    this.root.getElementsByClassName('ui-input-list')[0].removeAttribute('style');
    this.root.getElementsByClassName('tt-input')[0].className = 'ui-input-editor';
    this.root.getElementsByClassName('typeahead-standalone')[0].classList.add('ui-input-root');
  }
}

export class TagsInput extends InputBase {
  private _tags: string[];
  private _tagsDiv: HTMLDivElement;
  private _addTagIcon: HTMLElement;

  private _onTagAdded: Subject<string> = new Subject<string>();
  private _onTagRemoved: Subject<string> = new Subject<string>();


  constructor(name: string, config?: TagsInputConfig) {
    super(ui.input.string(name, {value: ''}).dart);

    this._addTagIcon = (config?.showButton ?? true) ?
      ui.iconFA('plus', () => this.addTag((this.input as HTMLInputElement).value)) :
      ui.iconFA('');

    this._tags = config?.tags ?? [];
    this._tagsDiv = ui.div(this._tags.map((tag) => { return this._createTag(tag); }), 'ui-tag-list');

    this._createRoot();
    this._initEventListeners();
  }


  private _createTag(tag: string): HTMLElement {
    const icon = ui.iconFA('times', () => this.removeTag(currentTag.innerText));
    const currentTag = ui.span([ui.span([tag]), icon], `ui-tag`);
    currentTag.dataset.tag = tag;

    currentTag.ondblclick = () => {
      const input = this._createTagEditInput(currentTag);
      (currentTag.firstElementChild as HTMLElement).innerText = '';
      currentTag.insertBefore(input, currentTag.firstElementChild);

      input.select();
      input.focus();
    };

    return currentTag;
  }

  private _createTagEditInput(currentTag: HTMLElement): HTMLInputElement {
    const tagValue = currentTag.innerText;
    const input = document.createElement('input');
    input.value = tagValue;

    let blurFlag = true;

    input.onblur = () => {
      if (!blurFlag)
        return;
      const newTag = input.value;
      input.remove();
      this._renameTag(tagValue, newTag, currentTag);
    };

    input.onkeyup = (event) => {
      if (event.key === 'Escape') {
        blurFlag = false;
        input.remove();
        (currentTag.firstElementChild as HTMLElement).innerText = tagValue;
      } else if (event.key === 'Enter') {
        blurFlag = false;
        const newTag = input.value;
        input.remove();
        this._renameTag(tagValue, newTag, currentTag);
      }
    };

    return input;
  }

  private _createRoot(): void {
    const inputContainer = ui.div([this.captionLabel, this.input, ui.div(this._addTagIcon, 'ui-input-options')],
      'ui-input-root');
    const tagContainer = ui.div([ui.label(' ', 'ui-input-label'), this._tagsDiv], 'ui-input-root');

    this.root.append(inputContainer, tagContainer);
    this.root.classList.add('ui-input-tags');
  }

  private _initEventListeners(): void {
    this.input.addEventListener('keyup', (event: KeyboardEvent) => {
      if (event.code === 'Enter')
        this.addTag((this.input as HTMLInputElement).value);
    });

    this.input.addEventListener('keydown', (event: KeyboardEvent) => {
      if ((this.input as HTMLInputElement).value.length === 0 && event.code === 'Backspace')
        this.removeTag(this._tags[0]);
    });
  }

  private _renameTag(oldTag: string, newTag: string, currentTag: HTMLElement): void {
    const currentTagSpan = currentTag.firstElementChild as HTMLElement;
    if (!this._isProper(newTag)) {
      currentTagSpan.innerText = oldTag;
      return;
    }

    currentTagSpan.innerText = newTag;
    currentTag.dataset.tag = newTag;
    this._tags[this._tags.indexOf(oldTag)] = newTag;
  }

  private _isProper(tag: string): boolean {
    return !(tag === '' || this._tags.includes(tag));
  }


  addTag(tag: string): void {
    if (!this._isProper(tag))
      return;

    this._tags.unshift(tag);
    const currentTag = this._createTag(tag);
    this._tagsDiv.insertBefore(currentTag, this._tagsDiv.firstChild);
    (this.input as HTMLInputElement).value = '';
    this._onTagAdded.next(tag);
  }

  removeTag(tag: string): void {
    const tagIndex = this._tags.indexOf(tag);
    if (tagIndex === -1)
      return;
    this._tags.splice(tagIndex, 1);
    const currentTag = this._tagsDiv.querySelector(`[data-tag="${tag}"]`);
    this._tagsDiv.removeChild(currentTag!);
    this._onTagRemoved.next(tag);
  }

  getTags(): string[] {
    return this._tags;
  }

  setTags(tags: string[]): void {
    this._tags = tags;
    this._tagsDiv = ui.div(tags.map((tag) => { return this._createTag(tag); }), 'ui-tag-list');
    const currentTagsDiv = this.root.getElementsByClassName('ui-tag-list')[0];
    currentTagsDiv.replaceWith(this._tagsDiv);
  }


  get onTagAdded(): Observable<string> {
    return this._onTagAdded;
  }

  get onTagRemoved(): Observable<string> {
    return this._onTagRemoved;
  }
}

export class MarkdownInput extends JsInputBase<string> {
  // Quill.js instance - loaded from the core .min.js file
  private editor: any;
  private readonly _editorRoot: HTMLDivElement = ui.div([], 'markdown-input');

  private constructor(caption?: string) {
    super();
    this.root.classList.add('markdown-input-root');
    this.addCaption(caption ?? '');
  }

  static async create(caption?: string): Promise<MarkdownInput> {
    const input = new MarkdownInput(caption);
    await DG.Utils.loadJsCss([
      '/js/common/quill/quill.min.js',
      '/js/common/quill/quill.snow.css',
    ]);
    //@ts-ignore
    input.editor = new Quill(input._editorRoot, {
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block', 'image'],
        ],
      },
      theme: 'snow', // or 'bubble'
    });
    input.editor.on('text-change', (_: any, __: any, source: string) => {
      if (source === 'api')
        input.fireChanged();
      else if (source === 'user')
        input.fireInput();
    });

    return input;
  }

  getInput(): HTMLElement { return this._editorRoot; }

  get inputType(): string { return 'markdown'; }

  get dataType(): string { return `${DG.TYPE.STRING}`; }

  get attachedImages(): string[] {
    const ops: { [key:string]: any; }[] = this.editor?.getContents()['ops'] ?? [];
    return ops
        .filter((op) => op['insert']?.constructor === Object
            && (op['insert']['image']?.startsWith('data:image') ?? false))
        .map((op) => op['insert']['image']);
  }

  getStringValue(): string {
    return this.editor?.getText() ?? '';
  }

  getValue(): string {
    return this.editor?.root?.innerHTML;
  }

  setStringValue(value: string): void {
    this.editor?.setText(value);
  }

  setValue(value: any): void {
    this.editor?.setText(value);
  }
}

export class CodeInput extends InputBase {
  declare dart: any;
  editor: CodeEditor;

  constructor(name: string, config?: CodeConfig) {
    const inputElement = ui.input.textArea(name);
    super(inputElement.dart);

    this.editor = CodeEditor.create(config?.script ?? '', config?.mode ?? 'javascript', config?.placeholder ?? '');
    this.input.style.display = 'none';
    this.root.classList.add('ui-input-code');
    this.root.append(this.editor.root);
  }

  get value(): string { return this.editor.value; }
  set value(x: string) { this.editor.value = x; }

  get onValueChanged(): Observable<any> { return this.editor.onValueChanged; }
}

export class FunctionsWidget extends DartWidget {
  constructor(dart: any) {
    super(dart);
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

  get onActionClicked(): rxjs.Observable<Func> { return this.onEvent('d4-action-click'); }
  get onActionPlusIconClicked(): rxjs.Observable<Func> { return this.onEvent('d4-action-plus-icon-click'); }
}
