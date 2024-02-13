/**
 * Routines for building UI
 * @module ui
 **/

import {ElementOptions, IndexPredicate} from './src/const';
import {Viewer} from './src/viewer';
import {View, VirtualView} from './src/views/view';
import {
  Accordion,
  Dialog,
  InputBase,
  Menu,
  TabControl,
  TreeViewGroup,
  Widget,
  RangeSlider,
  RangeSliderStyle,
  FilesWidget,
  DateInput,
  fileShares,
  SliderOptions,
  Breadcrumbs,
  DropDown,
  TypeAhead,
  TypeAheadConfig,
  TagsInput, ChoiceInput, InputForm
} from './src/widgets';
import {toDart, toJs} from './src/wrappers';
import {Functions} from './src/functions';
import $ from 'cash-dom';
import {__obs, StreamSubscription} from './src/events';
import {HtmlUtils, _isDartium, _options} from './src/utils';
import * as rxjs from 'rxjs';
import { CanvasRenderer, GridCellRenderer, SemanticValue } from './src/grid';
import {Entity, Property, User} from './src/entities';
import { Column, DataFrame } from './src/dataframe';
import dayjs from "dayjs";
import { Wizard, WizardPage } from './src/ui/wizard';
import {ItemsGrid} from "./src/ui/items-grid";
import * as d4 from './src/api/d4.api.g';


let api = <any>window;
declare let grok: any;

/** Creates an instance of the element for the specified tag, and optionally assigns it a CSS class.
 * @param {string} tagName The name of an element.
 * @param {string | null} className
 * @returns {HTMLElement} */
export function element(tagName: string, className: string | null = null): HTMLElement & any {
  let x = document.createElement(tagName);
  if (className !== null)
    _class(x, className);
  return x;
}

/** Appends multiple elements to root, and returns root.
 *  An element could be either {@link HTMLElement} or {@link Viewer}.
 *
 * @param {HTMLElement} root
 * @param {(HTMLElement | Viewer)[]} elements
 * @returns {HTMLElement} */
export function appendAll(root: HTMLElement, elements: (HTMLElement | Viewer)[]): HTMLElement {
  let fragment = document.createDocumentFragment();
  for (let e of elements)
    fragment.appendChild(render(e));
  root.appendChild(fragment);
  return root;
}

/** Removes all child nodes, and disposes widgets that these nodes
 *  might contain. See also [remove]. */
export function empty(e: HTMLElement): HTMLElement {
  while (e.firstChild) {
    api.grok_Widget_Kill(e.firstChild);
    e.removeChild(e.firstChild);
  }
  return e;
}

export function setClass(e: HTMLElement, classes: string, flag: boolean) {
  if (flag)
    $(e).addClass(classes);
  else
    $(e).removeClass(classes);
}

/** Removes the [element] from the DOM, and disposes any widgets that
 *  the [element] might contain. See also [empty]. */
export function remove(element: HTMLElement): void {
  api.grok_Widget_Kill(element);
  element.remove();
}

export function _innerText(x: HTMLElement, s: string): HTMLElement {
  x.innerText = s;
  return x;
}

export function _class(x: HTMLElement, s: string): HTMLElement {
  x.classList.add(s);
  return x;
}

export function _color(x: HTMLElement, s: string): HTMLElement {
  x.style.color = s;
  return x;
}

export function _backColor(x: HTMLElement, s: string): HTMLElement {
  x.style.backgroundColor = s;
  return x;
}

/**
 * @param {number} height
 * @param {number} width
 * @returns {HTMLCanvasElement} */
export function canvas(width: number | null = null, height: number | null = null): HTMLCanvasElement {
  let result = element('CANVAS');
  if (height != null && width != null) {
    $(result).height(height);
    $(result).width(width);
    $(result).prop('height', `${height}`);
    $(result).prop('width', `${width}`);
  }
  return result as HTMLCanvasElement;
}

/** 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 * @returns {HTMLHeadingElement} */
export function h1(s: string | Element, options: string | ElementOptions | null = null): HTMLHeadingElement {
  let x = element('h1');
  if (typeof s === 'string')
    x.innerText = s;
  else
    $(x).append(s);
  return _options(x, options) as HTMLHeadingElement;
}

/** 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 * @returns {HTMLHeadingElement} */
export function h2(s: string | Element, options: string | ElementOptions | null = null): HTMLHeadingElement {
  let x = element('h2');
  if (typeof s === 'string')
    x.innerText = s;
  else
    $(x).append(s);
  return _options(x, options) as HTMLHeadingElement;
}

/** 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 * @returns {HTMLHeadingElement} */
export function h3(s: string | Element, options: string | ElementOptions | null = null): HTMLHeadingElement {
  let x = element('h3');
  if (typeof s === 'string')
    x.innerText = s;
  else
    $(x).append(s);
  return _options(x, options) as HTMLHeadingElement;
}

/** Creates an accordion with dynamically populated panes.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/accordion}
 * @returns {Accordion} */
export function accordion(key: any = null): Accordion {
  return Accordion.create(key);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/tab-control}
 * @param {Object} pages - list of page factories
 * @param {boolean} vertical
 * @returns {TabControl} */
export function tabControl(pages: { [key: string]: any; } | null = null, vertical: boolean = false): TabControl {
  let tabs = TabControl.create(vertical);
  if (pages != null) {
    for (let key of Object.keys(pages)) {
      let value = pages[key];
      tabs.addPane(key, value instanceof Function ? value : () => render(value));
    }
  }
  return tabs;
}

/** Returns DivElement with the specified inner text.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 * @param {string} text
 * @param {string | ElementOptions | null} options
 * @returns {HTMLDivElement} */
export function divText(text: string, options: string | ElementOptions | any | null = null): HTMLDivElement {
  let e = element('div');
  e.innerText = text;
  _options(e, options);
  return e as HTMLDivElement;
}

export function tags(entity: Entity): HTMLElement {
  return api.grok_UI_Tags(entity.dart);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/markdown}
 */
export function markdown(text: string): HTMLElement {
  return api.grok_UI_Markdown(text);
}

/** Returns a font-awesome icon with the specified name, handler, and tooltip.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/icons}
 * @param {string} name - icon name (omit the "fa-" prefix)
 * @param {Function} handler
 * @param {String} tooltipMsg
 * @returns {HTMLElement} */
export function iconFA(name: string, handler: ((this: HTMLElement, ev: MouseEvent) => any) | null = null, tooltipMsg: string | null = null): HTMLElement {
  let i = element('i');
  i.classList.add('grok-icon');
  i.classList.add('fal');
  i.classList.add(`fa-${name}`);
  if (handler !== null)
    i.addEventListener('click', handler);
  if (tooltipMsg !== null)
    tooltip.bind(i, tooltipMsg);
  return i;
}

export function iconImage(name: string, path: string,
                          handler: ((this: HTMLElement, ev: MouseEvent) => any) | null = null,
                          tooltipMsg: string | null = null,
                          options: ElementOptions | null = null
                          ): HTMLElement {
  let i = element('i');
  i.classList.add('grok-icon');
  i.classList.add('image-icon');
  if (!path.startsWith('http') && !path.startsWith('/') && !path.startsWith('data:'))
    path = '/images/$path';
  i.style.backgroundImage = `url(${path})`;
  if (handler !== null)
    i.addEventListener('click', handler);
  if (tooltipMsg !== null)
    tooltip.bind(i, tooltipMsg);
  return _options(i, options);
}

export function iconSvg(name: string, handler: ((this: HTMLElement, ev: MouseEvent) => any) | null = null, tooltipMsg: string | null = null): HTMLElement {
  let i = element('i');
  i.classList.add('svg-icon');
  i.classList.add('grok-icon');
  i.classList.add(`svg-${name}`);
  if (handler !== null)
    i.addEventListener('click', handler);
  if (tooltipMsg !== null)
    tooltip.bind(i, tooltipMsg);
  return i;
}

export function extractRoot(x: any): HTMLElement | null {
  if (x == null)
    return null;
  if (x instanceof Widget)
    return x.root;
  if (typeof x.root !== 'undefined')
    return x.root;
  if (typeof x.wrap === 'function') {
    if (x.length === 1)
      return x[0];
    else
      return span(x.get());
  }  // jquery (cash) object
  return x;
}

//function applyToNode(HTMLElement element)

/** Renders object to html element. */
export function render(x: any, options?: ElementOptions): HTMLElement {
  function renderImpl() {
    x = extractRoot(x);
    if (x == null)
      return div();
    if (api.grok_UI_Render == null)
      return x;
    return api.grok_UI_Render(x);
  }
  return _options(renderImpl(), options);
}

/** Renders a table cell to html element, taking into account grid's formatting and color-coding.
 * @param {Cell} tableCell
 * @returns {HTMLElement} */
// export function renderCell(tableCell) {
//
// }

/** Renders a table cell to html element,
 * Takes into account grid's formatting and color-coding.
 * @param {Row} table
 * @param {string[]} columnNames
 * @returns {HTMLElement} */
// export function renderForm(table, columnNames = null) {
//   return null;
// }

/** Renders object to html card.
 * @param {object} x
 * @returns {HTMLElement}. */
export function renderCard(x: object): HTMLElement {
  return api.grok_UI_RenderCard(x);
}

/** Renders multiple objects as a span */
export function span(x: any[], options: string | ElementOptions | null = null): HTMLElement {
  return _options(api.grok_UI_Span(x), options);
}

export function renderInline(x: HTMLElement): HTMLElement {
  let handler = ObjectHandler.forEntity(x);
  return handler == null ? render(x) : handler.renderMarkup(x);
}


/** Renders inline text, calling [renderMarkup] for each non-HTMLElement.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 * @param {object[]} objects
 * @returns {HTMLElement}. */
export function inlineText(objects: any[]): HTMLElement {
  return span(objects.map((item) => renderInline(item)));
}

/**
 * @param {object[]} children
 * @param {string | ElementOptions} options
 * @returns {HTMLDivElement} */
export function div(children: any[] | string | HTMLElement = [], options: string | ElementOptions | null = null): HTMLDivElement {
  if (!Array.isArray(children))
    children = [children];
  let d = document.createElement('div');
  if (children != null) {
    $(d).append(children.map(x => render(x)));
  }
  _options(d, options);
  $(d).addClass('ui-div');
  return d;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/info-bar} 
 */
export function info(children: HTMLElement[] | HTMLElement | string, header: string | null = null, reopenable: boolean = true): HTMLDivElement {
  let root: HTMLDivElement | null;
  let divContent: HTMLElement[] = [];
  let divActual: HTMLDivElement | null = null;
  let show = iconFA('lightbulb-exclamation', () => {
    if (divActual) divActual.style.display = 'block';
    close.style.display = 'block';
    show.style.display = 'none';
  });
  let close = iconFA('times', () => {
    if (divActual) divActual.style.display = 'none';
    close.style.display = 'none';
    show.style.display = reopenable ? 'block' : 'none';
  });
  if (header !== null && header !== undefined) {
    divContent.push(h1(header));
  }
  if (!Array.isArray(children)) {
    if (children === null || typeof children === 'string') {
      children = [divText(<string>children)];
    } else {
      children = [children];
    }
  }
  divContent = divContent.concat(children);
  divActual = div(divContent, 'grok-info-bar');
  root = div([show, close, divActual], 'grok-info-bar-container');
  return root;
}

/** Div flex-box container that positions child elements vertically.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/flexbox} 
 * @param {object[]} items
 * @param {string | ElementOptions} options
 * @returns {HTMLDivElement} */
export function divV(items: any[], options: string | ElementOptions | null = null): HTMLDivElement {
  return <HTMLDivElement>_options(api.grok_UI_DivV(items == null ? null : items.map(x => render(x)), 'ui-div'), options);
}

/** Div flex-box container that positions child elements horizontally.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/flexbox} 
 * @param {object[]} items
 * @param {string | ElementOptions} options
 * @returns {HTMLDivElement} */
export function divH(items: (HTMLElement | null)[], options: string | ElementOptions | null = null): HTMLDivElement {
  return <HTMLDivElement>_options(api.grok_UI_DivH(items == null ? null : items.map(x => render(x)), 'ui-div'), options);
}

/** Renders content as a card. */
export function card(content: HTMLElement): HTMLDivElement {
  return div([content], 'd4-item-card');
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/loading-indicators}
 */
export function loader(): any {
  return api.grok_UI_Loader();
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/update-indicator}
 */
export function setUpdateIndicator(element: HTMLElement, updating: boolean = true): void {
  return api.grok_UI_SetUpdateIndicator(element, updating);
}

/**
 * Creates a button with the specified text, click handler, and tooltip.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/buttons}
 * @param {string | Element | Array<string | Element>} content
 * @param {Function} handler
 * @param {string} tooltip
 * @returns {HTMLButtonElement} */
export function button(content: string | Element | (string | Element)[], handler: Function, tooltip: string | null = null): HTMLButtonElement {
  return api.grok_UI_Button(content, handler, tooltip);
}

export function bigButton(text: string, handler: Function, tooltip: string | null = null): HTMLButtonElement {
  return api.grok_UI_BigButton(text, handler, tooltip);
}

/**
 * Creates a combo popup with the specified icons and items.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/combo-popup}
 * @param {string | HTMLElement} caption
 * @param {Array<string>} items
 * @param {Function} handler (item) => {...}
 * @param {Function} renderer (item) => {...}
 * @returns {HTMLElement} */
export function comboPopup(caption: string | HTMLElement, items: string[], handler: (item: any) => void, renderer?: ((item: any) => HTMLElement) | null): HTMLElement {
  return api.grok_UI_ComboPopup(caption, items, handler, renderer ? (item: any) => renderer(toJs(item)) : null);
}

/**
 * Creates a combo popup with the specified icons and items
 * @param {string | HTMLElement} caption
 * @param {Map<string>} items
 * @returns {HTMLElement} */
export function comboPopupItems(caption: string | HTMLElement, items: { [key: string]: Function }): HTMLElement {
  return api.grok_UI_ComboPopup(caption, Object.keys(items), (key: string) => items[key](), null);
}

/** Creates an html table based on [map]. 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/html-tables}
*/
export function tableFromMap(map: { [key: string]: any }): HTMLTableElement {
  return api.grok_UI_TableFromMap(map);
}

/** Creates an editable html table for the specified items (rows) and properties (columns). */
export function tableFromProperties(items: any[], properties: Property[]) {
  return table(items,
    (item, _) => properties.map((p) => InputBase.forProperty(p, item).input),
    properties.map((p) => p.name));
}

/** Creates a visual table based on [items] and [renderer]. */
export function table<T>(items: T[], renderer: ((item: T, ind: number) => any) | null, columnNames: string[] | null = null): HTMLTableElement {
  return toJs(api.grok_HtmlTable(items, renderer !== null ? (object: any, ind: number) => renderer(toJs(object), ind) : null, columnNames)).root;
}

/** Waits for `Future<Element>` function to complete and collect its result.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/loading-indicators}
*/
export function wait(getElement: () => Promise<HTMLElement>): any {
  return toJs(api.grok_UI_Wait(getElement));
}

/** Waits for `Future<Element>` function to complete and collect its result as a ui.box.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/loading-indicators}
*/
export function waitBox(getElement: () => Promise<HTMLElement>): any {
  return toJs(api.grok_UI_WaitBox(getElement));
}

/** Creates a visual element representing list of [items]. 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/list}
*/
export function list(items: any[], options?: {processNode?: (node: HTMLElement) => void}): HTMLElement {
  const host: HTMLElement = api.grok_UI_List(Array.from(items).map(toDart));
  if (options?.processNode != null)
    for (const c of Array.from(host.children))
      options.processNode(c as HTMLElement);
  return host;
}
/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/iframe}
 */
export function iframe(options?: {src?: string, width?: string, height?: string}) {
  let frame = element('iframe') as HTMLIFrameElement;
  if (options?.src != null)
    frame.src = options?.src;
  if (options?.width != null) {
    frame.width = options.width;
    frame.style.width = options.width;
  }
  if (options?.height != null) {
    frame.height = options.height;
    frame.style.height = options.height;
  }

  return frame;
}

function _link(element: HTMLElement, target: string | Function, tooltipMsg?: string): void {
  if (!tooltipMsg && typeof target === 'string')
    tooltipMsg = 'Open in new tab';

  element.style.cursor = 'pointer';
  element.addEventListener('click', (_) => {
    if (target instanceof Function)
      target();
    else
      window.open(target, '_blank');
  });

  tooltip.bind(element, tooltipMsg);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/image}
 */
export function image(src: string, width: number, height: number, options?: {target?: string | Function, tooltipMsg?: string}) {
  let image = element('div') as HTMLDivElement;
  image.classList.add('ui-image');

  image.style.backgroundImage = `url(${src})`;
  image.style.width = `${width}px`;
  image.style.height = `${height}px`;

  if (options?.target)
    _link(image, options?.target, options?.tooltipMsg);

  return image;
}

/** Creates an `<a>` element. */
export function link(
    text: string,
    target: string | Function | object,
    tooltipMsg?: string,
    options: string | ElementOptions | null = { classes: 'd4-link-external' }): HTMLAnchorElement {
  let link = element('a') as HTMLAnchorElement;
  link.classList.add('ui-link');
  link.innerText = text;
  if (target instanceof Function) {
    link.addEventListener('click', (_) => target());
  }
  else if (typeof target === 'string') {
    link.href = target;
    link.target = '_blank';
  }
  else {
    bind(target, link);
  }
  tooltip.bind(link, tooltipMsg);
  _options(link, options);
  return link;
}

/** Creates a [Dialog]. 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/splitters}
*/
export function dialog(options?: { title?: string, helpUrl?: string, showHeader?: boolean, showFooter?: boolean } | string): Dialog {
  return Dialog.create(options);
}

/** Binds [item] with the [element]. It enables selecting it as a current object, drag-and-drop,
 * tooltip, and popup menu.*/
export function bind(item: any, element: HTMLElement, options?: {contextMenu: boolean}): HTMLElement {
  return api.grok_UI_Bind(toDart(item), element, options?.contextMenu);
}

/** Shows popup with the [element] near the [anchor].
 * tooltip, and popup menu.
 * @param {Element} element
 * @param {Element} anchor
 * @param {boolean} vertical
 * @returns {Element}. */
export function showPopup(element: HTMLElement, anchor: HTMLElement, vertical: boolean = false): Element {
  return api.grok_UI_ShowPopup(element, anchor, vertical);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/range-slider}
 */
export function rangeSlider(minRange: number, maxRange: number, min: number, max: number, vertical: boolean = false, style: RangeSliderStyle | SliderOptions = 'barbell'): RangeSlider {
  let rs = RangeSlider.create(vertical, style);
  rs.setValues(minRange, maxRange, min, max);
  return rs;
}

/**
 * Creates a virtual list widget.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/views/virtual-view}
 * @param {number} length - number of elements
 * @param {Function} renderer
 * @param {boolean} verticalScroll - vertical or horizontal scrolling
 * @param {number} maxColumns - maximum number of items on the non-scrolling axis
 * @returns {VirtualView} */
export function virtualView(length: number, renderer: Function, verticalScroll: boolean = true, maxColumns: number = 1000): VirtualView {
  let view = VirtualView.create(verticalScroll, maxColumns);
  view.setData(length, renderer);
  return view;
}

export function popupMenu(items: any): void {
  function populate(menu: Menu, item: { [key: string]: any; }) {
    for (let key of Object.keys(item)) {
      let value = item[key];
      if (value instanceof Function)
        menu.item(key, value);
      else
        populate(menu.group(key), value);
    }
  }

  let menu = Menu.popup();
  populate(menu, items);
  menu.show();
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/interactivity/drag-and-drop}
 */
export function makeDraggable<T>(e: Element,
    options?: {
      allowCopy?: () => boolean,
      check?: () => boolean,
      getDragObject?: () => any,
      getDragCaption?: () => any,
      dragObjectType?: string,
      getDragHint?: () => string,
      getDragContext?: () => any,
      onDragStart?: (me: MouseEvent) => boolean,
      onDragEnd?: () => void
    }): Element {
  return api.grok_UI_MakeDraggable(e,
      options?.allowCopy,
      options?.check,
      options?.getDragObject ? () => toDart(options.getDragObject!()) : null,
      options?.getDragCaption ? () => toDart(options.getDragCaption!()) : null,
      options?.dragObjectType,
      options?.getDragHint,
      options?.getDragContext ? () => toDart(options.getDragContext!()) : null,
      options?.onDragStart,
      options?.onDragEnd
  );
}

export function makeDroppable<T>(e: Element,
    options?: {
      acceptDrop?: (dragObject: T) => boolean,
      doDrop?: (dragObject: T, copying: boolean) => void
    }): void {
  api.grok_UI_MakeDroppable(e,
      options?.acceptDrop ? (dragObject: T) => options.acceptDrop!(toJs(dragObject)) : null,
      options?.doDrop ? (dragObject: T, copying: boolean) => options.doDrop!(toJs(dragObject), toJs(copying)) : null,
  );
}

export function bindInputs(inputs: InputBase[]): StreamSubscription[] {
  let s: StreamSubscription[] = [];
  inputs.map((i) => {
    inputs.map((j) => {
      if (j != i)
        s.push(j.onChanged(() => {
          i.notify = false;
          i.stringValue = j.stringValue;
          i.notify = true;
        }));
    })
  });
  return s;
}

export function inputs(inputs: Iterable<InputBase>, options: any = null) {
  return form([...inputs], options, true);
}

/** Creates new nodes tree.
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/tree-view}
 * @returns {TreeViewGroup} */
export function tree(): TreeViewGroup {
  return TreeViewGroup.tree();
}


// TODO: create a new file - inputs.ts for these inputs
export namespace input {
  // TODO: add label here
  interface IInputInitOptions<T = any> {
    value?: T;
    property?: Property;
    elementOptions?: ElementOptions;
    onCreated?: (input: InputBase<T>) => void;
    onValueChanged?: (input: InputBase<T>) => void;
  }

  interface ITextBoxInputInitOptions<T> extends IInputInitOptions<T> {
    clearIcon?: boolean;
    escClears?: boolean;
    placeholder?: string;
  }

  interface INumberInputInitOptions<T> extends ITextBoxInputInitOptions<T> {
    min?: number;
    max?: number;
    step?: number;
  }

  interface IChoiceInputInitOptions<T> extends ITextBoxInputInitOptions<T> {
    items?: T[];
    nullable?: boolean;
  }

  interface IMultiChoiceInputInitOptions<T> extends Omit<IChoiceInputInitOptions<T>, 'value'> {
    value?: T[];
  }

  interface IStringInputInitOptions<T> extends ITextBoxInputInitOptions<T> {
    icon?: string | HTMLElement;
    // typeAheadConfig?: typeaheadConfig<Dictionary>; // - if it is set - create TypeAhead - make it for text input
  }

  interface IColumnInputInitOptions<T> extends ITextBoxInputInitOptions<T> {
    table?: DataFrame;
    filter?: Function;
  }

  interface IColumnsInputInitOptions<T> extends IColumnInputInitOptions<T> {
    available?: string[];
    checked?: string[];
  }

  /** Creates input for the specified property, and optionally binds it to the specified object */
  export function forProperty(property: Property, source: any = null, options?: IInputInitOptions): InputBase {
    const input = InputBase.forProperty(property, source);
    if (options?.onCreated)
      options.onCreated(input);
    if (options?.onValueChanged)
      input.onChanged(() => options.onValueChanged!(input));
    return input;
  }

  export function forInputType(inputType: d4.InputType | string): InputBase {
    return InputBase.forInputType(inputType);
  }

  export function grid(items: any[], properties: Property[]): ItemsGrid {
    return new ItemsGrid(items, properties);
  }

  /** Returns a form for the specified properties, bound to the specified object */
  export function form(source: any, props: Property[], options?: IInputInitOptions): HTMLElement {
    return inputs(props.map((p) => forProperty(p, source, options)));
  }

  export function userGroups(name: string, value?: User[], onValueChanged: Function | null = null): InputBase<User[]> {
    const i = forInputType(d4.InputType.UserGroups);
    if (value)
      i.value = value;
    return i;
  }

  function _create(type: d4.InputType, name: string, options?: IInputInitOptions): InputBase {
    const input = forInputType(type);
    input.caption = name;
    // go through properties and set them
    _options(input.root, options?.elementOptions);
    return input;
  }

  export function int(name: string, options?: INumberInputInitOptions<number>): InputBase<number> {
    return _create(d4.InputType.Int, name, options);
  }

  export function slider(name: string, options?: INumberInputInitOptions<number>): InputBase<number> {
    return _create(d4.InputType.Slider, name, options);
  }

  export function choice<T>(name: string, options?: IChoiceInputInitOptions<T>): ChoiceInput<T> {
    return _create(d4.InputType.Choice, name, options) as ChoiceInput<T>;
  }

  export function multiChoice<T>(name: string, options?: IMultiChoiceInputInitOptions<T>): InputBase<T[]> {
    return _create(d4.InputType.MultiChoice, name, options);
  }

  export function string(name: string, options?: IStringInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.Text, name, options);
  }

  export function search(name: string, options?: IInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.Search, name, options);
  }

  export function float(name: string, options?: INumberInputInitOptions<number>): InputBase<number> {
    return _create(d4.InputType.Float, name, options);
  }

  export function date(name: string, options?: ITextBoxInputInitOptions<dayjs.Dayjs>): DateInput {
    return _create(d4.InputType.Date, name, options);
  }

  export function bool(name: string, options?: IInputInitOptions<boolean>): InputBase<boolean> {
    return _create(d4.InputType.Bool, name, options);
  }

  // do we need this?
  export function toggle(name: string, options?: IInputInitOptions<boolean>): InputBase<boolean> {
    return _create(d4.InputType.Switch, name, options);
  }

  export function molecule(name: string, options?: IInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.Molecule, name, options);
  }

  // export function column(name: string, options?: IColumnInputInitOptions<Column>): InputBase<Column> {
    // const filter = options && typeof options.filter === 'function' ? (x: any) => options.filter!(toJs(x)) : null;
    // return new InputBase(api.grok_ColumnInput(name, table.dart, filter, value?.dart), onValueChanged);
  // }

  export function columns(name: string, options?: IColumnsInputInitOptions<Column[]>): InputBase<Column[]> {
    return _create(d4.InputType.Columns, name, options);
  }

  export function table(name: string, options?: IChoiceInputInitOptions<DataFrame[]>): InputBase<DataFrame> {
    return _create(d4.InputType.Table, name, options);
  }

  export function textArea(name: string, options?: ITextBoxInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.TextArea, name, options);
  }

  export function color(name: string, options?: ITextBoxInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.Color, name, options);
  }

  export function radio(name: string, options?: IChoiceInputInitOptions<string>): InputBase<string> {
    return _create(d4.InputType.Radio, name, options);
  }
}

export function inputsRow(name: string, inputs: InputBase[]): HTMLElement {
  let d = div([label(name, 'ui-label ui-input-label')], 'ui-input-root ui-input-row');
  d.appendChild(div(inputs));
  return d;
}

export function intInput(name: string, value: number | null, onValueChanged: Function | null = null): InputBase<number | null> {
  return new InputBase(api.grok_IntInput(name, value), onValueChanged);
}

export function sliderInput(name: string, value: number | null, min: number, max: number, onValueChanged: Function | null = null, options: {step: number | null} | null = null): InputBase<number | null> {
  return new InputBase(api.grok_SliderInput(name, value, min, max, options?.step), onValueChanged);
}

export function choiceInput<T>(name: string, selected: T, items: T[], onValueChanged: Function | null = null, options: { nullable?: boolean } | null = null): ChoiceInput<T | null> {
  return new ChoiceInput<T>(api.grok_ChoiceInput(name, selected, items, options), onValueChanged);
}

export function multiChoiceInput<T>(name: string, value: T[], items: T[], onValueChanged: Function | null = null): InputBase<T[] | null> {
  return new InputBase(api.grok_MultiChoiceInput(name, value, items), onValueChanged);
}

export function stringInput(name: string, value: string, onValueChanged: Function | null = null, options: { icon?: string | HTMLElement, clearIcon?: boolean, escClears?: boolean, placeholder?: String } | null = null): InputBase<string> {
  return new InputBase(api.grok_StringInput(name, value, options), onValueChanged);
}

export function searchInput(name: string, value: string, onValueChanged: Function | null = null): InputBase<string> {
  return new InputBase(api.grok_SearchInput(name, value), onValueChanged);
}

export function floatInput(name: string, value: number | null, onValueChanged: Function | null = null): InputBase<number | null> {
  return new InputBase(api.grok_FloatInput(name, value), onValueChanged);
}

export function dateInput(name: string, value: dayjs.Dayjs | null, onValueChanged: Function | null = null): DateInput {
  return new DateInput(api.grok_DateInput(name, value?.valueOf()), onValueChanged);
}

export function boolInput(name: string, value: boolean, onValueChanged: Function | null = null): InputBase<boolean | null> {
  return new InputBase(api.grok_BoolInput(name, value), onValueChanged);
}

export function switchInput(name: string, value: boolean, onValueChanged: Function | null = null): InputBase<boolean> {
  return new InputBase(api.grok_SwitchInput(name, value), onValueChanged);
}

export function moleculeInput(name: string, value: string, onValueChanged: Function | null = null): InputBase<string> {
  return new InputBase(api.grok_MoleculeInput(name, value), onValueChanged);
}

export function columnInput(name: string, table: DataFrame, value: Column | null, onValueChanged: Function | null = null, options?: {filter?: Function | null}): InputBase<Column | null> {
  const filter = options && typeof options.filter === 'function' ? (x: any) => options.filter!(toJs(x)) : null;
  return new InputBase(api.grok_ColumnInput(name, table.dart, filter, value?.dart), onValueChanged);
}

export function columnsInput(name: string, table: DataFrame, onValueChanged: (columns: Column[]) => void,
                             options?: {available?: string[], checked?: string[]}): InputBase<Column[]> {
  return new InputBase(api.grok_ColumnsInput(name, table.dart, options?.available, options?.checked), onValueChanged);
}

export function tableInput(name: string, table: DataFrame | null, tables: DataFrame[] = grok.shell.tables, onValueChanged: Function | null = null): InputBase<DataFrame | null> {
  return new InputBase(api.grok_TableInput(name, table?.dart, tables.map(toDart)), onValueChanged);
}

export function textInput(name: string, value: string, onValueChanged: Function | null = null): InputBase<string> {
  return new InputBase(api.grok_TextInput(name, value), onValueChanged);
}

export function colorInput(name: string, value: string, onValueChanged: Function | null = null): InputBase<string> {
  return new InputBase(api.grok_ColorInput(name, value), onValueChanged);
}

export function colorPicker(color: number, onChanged: (color: number) => void, colorDiv: HTMLElement): HTMLElement {
  return api.grok_ColorPicker(color, onChanged, colorDiv);
}

export function radioInput(name: string, value: string, items: string[], onValueChanged: Function | null = null): InputBase<string | null> {
  return new InputBase(api.grok_RadioInput(name, value, items), onValueChanged);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/ui-events}
 * @param {HTMLElement} element
 * @returns {rxjs.Observable} */
export function onSizeChanged(element: HTMLElement): rxjs.Observable<any> {

  if (_isDartium()) {
    // Polyfill for Dartium which does not have a native ResizeObserver
    return new rxjs.Observable(function(observer: any) {
      let width = element.clientWidth;
      let height = element.clientHeight;
      let interval = setInterval(() => {
        let newWidth = element.clientWidth;
        let newHeight = element.clientHeight;
        if (newWidth !== width || newHeight !== height) {
          width = newWidth;
          height = newHeight;
          observer.next(element);
        }
      }, 100);
      return () => clearInterval(interval);
    });
  }

  return rxjs.Observable.create(function (observer: { next: (arg0: ResizeObserverEntry) => void; }) {
    const resizeObserver = new ResizeObserver(observerEntries => {
      // trigger a new item on the stream when resizes happen
      for (const entry of observerEntries) {
        observer.next(entry);
      }
    });

    // start listening for resize events
    resizeObserver.observe(element);

    // cancel resize observer on cancellation
    return () => resizeObserver.disconnect();
  });

}

/** UI Tools **/
export class tools {
  private static mutationObserver: MutationObserver | null = null;
  private static mutationObserverElements: {
    element: HTMLElement, resolveF: (element: HTMLElement) => void, timestamp: number
  }[] = [];

  static handleResize(element: HTMLElement, onChanged: (width: number, height: number) => void): () => void {
    let width = element.clientWidth;
    let height = element.clientHeight;
    let interval = setInterval(() => {
      let newWidth = element.clientWidth;
      let newHeight = element.clientHeight;
      if ((newWidth === 0 && newHeight === 0)) {
        return
      }

      if (newWidth !== width || newHeight !== height) {
        width = newWidth;
        height = newHeight;
        onChanged(width, height);
      }
    }, 100);
    return () => clearInterval(interval);
  }

  static setHoverVisibility(host: HTMLElement, items: HTMLElement[]) {
    api.grok_Tools_SetHoverVisibility(host, items);
  }

  static createElementFromHtml(htmlString: string): HTMLDivElement {
    let host = div([]);
    host.innerHTML = htmlString.trim();
    return host;
  }

  static initFormulaAccelerators(textInput: InputBase, table: DataFrame): void {
    api.grok_UI_InitFormulaAccelerators(toDart(textInput), table.dart);
  }

  /** Waits until the specified element is in the DOM. */
  static waitForElementInDom(element: HTMLElement): Promise<HTMLElement> {
    if (_isDartium()) {
      return new Promise(resolve => {
        const intervalId = setInterval(function() {
          if (document.contains(element)) {
            clearInterval(intervalId);
            return resolve(element);
          }
        }, 100);
      });
    }

    tools.mutationObserver ??=  new MutationObserver((_) => {
      tools.mutationObserverElements.forEach((item, index) => {
        if (document.contains(item.element)) {
          item.resolveF(item.element);
          tools.mutationObserverElements.splice(index, 1);
        }
      })
    });
    tools.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return new Promise(resolve => {
      if (document.contains(element))
        return resolve(element);
      tools.mutationObserverElements.push({element: element, resolveF: resolve, timestamp: Date.now()});
    });
  }

  static async resizeFormLabels(element: HTMLElement): Promise<void> { 
    if (this.skipResizing(element)) return;
    
    //Default form width
    let minFormWidth = 150;
    let maxFormWidth = 450;

    //Min input width and padding
    const minInputWidth = 58;
    const minInputPadding = 28;

    const tempForm = this.createTempForm(element, minFormWidth, maxFormWidth);

    const selectors = [
      'div.ui-input-root:not(.ui-input-buttons) > label.ui-input-label:not(:empty',
      'div.ui-input-root:not(.ui-input-buttons) > .ui-input-editor, div.ui-input-root:not(.ui-input-buttons) > .d4-table.d4-item-table',
      'div.ui-input-root:not(.ui-input-buttons) > .ui-input-options'
    ];
    const labels = this.calculateWidths(tempForm, selectors[0], 'data-label', minInputWidth, minInputPadding);
    const inputs = this.calculateWidths(tempForm, selectors[1], 'data-input', minInputWidth, minInputPadding);
    const options = this.calculateWidths(tempForm, selectors[2], 'data-options', minInputWidth, minInputPadding);

    this.applyStyles(tempForm, labels, inputs, options, minInputWidth);
    this.copyAttributesToForm(element, tempForm, labels);
    this.adjustButtonContainer(element);
    this.adjustDialogForm(element, tempForm);
    this.handleFormResize(element, labels, minInputWidth);

    tempForm.remove();
  }

  private static createInputRows (tempForm: HTMLElement) {

    Array.from(tempForm.children).forEach((item, index) => {
      if(!item.hasAttribute('data-align')) return;
      if (item.getAttribute('data-align') != 'row') return;

      let root = document.createElement('div');
      root.className = 'ui-input-root ui-input-row';

      let label = document.createElement('label');
      label.className = 'ui-input-label ui-label';

      let editor = document.createElement('div');
      editor.className = 'ui-input-editor ui-input-row';

    });
  }

  private static createTempForm(element: HTMLElement, minFormWidth:number, maxFormWidth:number): HTMLElement {
    const tempForm = element.cloneNode(true) as HTMLElement;
    document.body.append(tempForm);
    tempForm.className = 'ui-form';
    tempForm.setAttribute('data-min-width', String(minFormWidth));
    tempForm.setAttribute('data-max-width', String(maxFormWidth));
    tempForm.setAttribute('data-type','form');

    this.createInputRows(element);
    return tempForm;
  }

  private static skipResizing(element: HTMLElement): boolean {
    return element.hasAttribute('data-type') || element.children.length == 0 || element.classList.contains('ui-form-condensed') || element.classList.contains('ui-form-wide');
  }

  private static calculateWidths(tempForm: HTMLElement, selector: string, attribute: string, minInputWidth: number, minInputPadding:number): number[] {
    const width: number[] = [];
    const elements = $(tempForm).find(selector);

    elements.each((i) => {
      let renderWidth = minInputWidth;
      let element = elements[i] as HTMLElement;
      let value = document.createElement('span');
      value.style.visibility = 'hidden';
      value.style.position = 'fixed';
      value.style.padding = '0';
      value.style.margin = '0';
      tempForm.append(value);

      // Calculate width for field labels
      if (attribute == 'data-label') {
        value.textContent = element.textContent;
        renderWidth = Math.ceil(value.getBoundingClientRect().width);
        element.parentElement?.setAttribute(attribute, String(renderWidth));
      }

      // Calculate width for field options
      if (attribute == 'data-options') {
        renderWidth = Math.ceil(element.getBoundingClientRect().width);
        element.parentElement?.setAttribute(attribute, String(renderWidth));
      }

      // Calculate width for field inputs
      if (attribute == 'data-input') {

        // Calculate value width
        if (element.tagName == 'INPUT' || element.tagName == 'SELECT') {
          let temp = element as HTMLInputElement;
          value.textContent = temp.value != undefined ? temp.value : '';
          renderWidth = Math.ceil(value.getBoundingClientRect().width);
        }

        // Get table container width
        if (element.tagName == 'TABLE') {
          renderWidth = Math.ceil(element.getBoundingClientRect().width);
        }

        // Get textarea container width
        if (element.tagName == 'TEXTAREA') {
          let temp = element as HTMLInputElement;
          value.textContent = temp.value != undefined ? temp.value : '';
          renderWidth = Math.ceil(value.getBoundingClientRect().width);
          if (renderWidth < 120)
            renderWidth = 120
          else if (renderWidth > 250) {
            //IF form has other elements exept textarea limit width to 250px (222+28)
            //Else expand to 400px (372+28)
            //28 is input paddings
            if ($(tempForm).find('.ui-input-editor:not(textarea, .ui-buttons-editor)').length != 0)
              renderWidth = 222
            else
              renderWidth = 372
          }
        }

        // Get text content width
        if (element.tagName == 'DIV') {
          // If Multi-choice or radio button - get container width
          if (element.parentElement?.classList.contains('ui-input-radio') || element.parentElement?.classList.contains('ui-input-multi-choice')) {
            renderWidth = Math.ceil(element.getBoundingClientRect().width)-minInputPadding;
          } else {
            value.textContent = element.textContent;
            renderWidth = Math.ceil(value.getBoundingClientRect().width);
          }
        }

        // Set canvas min width
        if ($(element).has('canvas').length != 0) { renderWidth = 100; }

        //Check if calculated width not smaller than minimun input width
        renderWidth+minInputPadding < minInputWidth ? renderWidth = minInputWidth : renderWidth = renderWidth+minInputPadding;
        element.parentElement?.setAttribute(attribute, String(renderWidth));
      }

      width.push(renderWidth);
      value.remove();
    });

    return width;
  }

  private static applyStyles(tempForm: HTMLElement, labels: number[], inputs: number[], options: number[], minInputWidth:number) {
    
    //Set the min and max width to input label element
    Array.from(tempForm.children).forEach((element) => {
      let label = element.querySelector('label.ui-input-label') as HTMLElement;
      
      if (label == null) return;

      label.style.minWidth = String(Math.min(...labels))+'px';;
      label.style.maxWidth = String(Math.max(...labels))+'px';
      label.style.width = '100%';

    });

    //Set the min and max width to input-root element
    Array.from(tempForm.children).forEach((item, index) => {
      let element = item as HTMLElement;

      if (!item.classList.contains('ui-input-root')) return;

      //Get the max width;
      let maxLabelWidth = labels.length > 0 ? Math.max(...labels) : 0;
      let maxInputWidth = inputs.length > 0 ? Math.max(...inputs) : 0;
      let maxOptionsWidth = options.length > 0 ? Math.max(...options) : 0;
      
      //Max and min form width + 8px label margin
      let maxFormWidth = maxLabelWidth + maxInputWidth + maxOptionsWidth + 8;
      let minFormWidth = maxLabelWidth + minInputWidth + 8;

      element.style.width = '100%';
      element.style.maxWidth = String(maxFormWidth)+'px';

      //Update the max form width attribute
      tempForm.setAttribute('data-max-width', String(maxFormWidth));
      tempForm.setAttribute('data-min-width', String(minFormWidth));
    });

  }

  private static copyAttributesToForm (element: HTMLElement, tempForm: HTMLElement, labels: number[]) {
    let currentWidth = element.getBoundingClientRect().width;
    let maxFormWidth = Number(tempForm.getAttribute('data-max-width'));
    let maxLabelWidth = Math.max(...labels);
    let avaliableSpace = currentWidth - maxFormWidth > 0 ? currentWidth - maxFormWidth : 0;
    let inputWidth = 0;

    //If form has avalibable space then adjust min form width to maxFormWidth+128. 
    //Where 128 is space form input-ediotr + input-options if exist.
    if (maxFormWidth < maxLabelWidth+128) {
      if (avaliableSpace != 0){
        if (maxFormWidth+avaliableSpace < maxLabelWidth+128) {
          maxFormWidth = maxFormWidth+avaliableSpace;
          inputWidth = maxFormWidth - maxLabelWidth - 8;
        }
        else {
          maxFormWidth = maxLabelWidth+128;
          inputWidth = 120;
        }
      }
    }

    //Set attributes to form fields
    Array.from(tempForm.children).forEach((item, index) => {
      let root = element.children[index] as HTMLElement;
      let label = element.children[index].firstElementChild as HTMLElement;

      let rootStyle = item.getAttribute('style');
      let labelStyle = item.firstElementChild?.getAttribute('style');

      if (rootStyle != null) {
        root.setAttribute('style', rootStyle);
        root.style.maxWidth = String(maxFormWidth)+'px';
      }
      if (labelStyle != null) label.setAttribute('style', labelStyle);

      let dataLabel = item.getAttribute('data-label');
      let dataInput = item.getAttribute('data-input');
      let dataOptions = item.getAttribute('data-options');

      if (dataLabel != null) root.setAttribute('data-label', dataLabel);
      if (dataOptions != null) root.setAttribute('data-options', dataOptions);
      if (dataInput != null) root.setAttribute('data-input', dataInput);

    });

    //Set attributes to form
    element.setAttribute('data-type', 'form');
    element.setAttribute('data-min-width', tempForm.getAttribute('data-min-width')!);
    element.setAttribute('data-max-width', String(maxFormWidth));
    element.style.maxWidth = String(maxFormWidth)+'px';
  }

  private static adjustDialogForm(element: HTMLElement, tempForm:HTMLElement) {
    if (element.classList.contains('d4-dialog-contents') || element.parentElement?.classList.contains('d4-dialog-contents')) {
      element.style.removeProperty('max-width');
    
      const formWidth = Math.ceil(element.getBoundingClientRect().width-24);
      const maxFormWidth = Number(element.getAttribute('data-max-width'));

      Array.from(element.children).forEach((field) => {
        let root = field as HTMLElement;
        let label = root.querySelector('label') as HTMLElement;

        if (label == null) return;

        if (maxFormWidth < formWidth)
          root.style.maxWidth = String(formWidth)+'px';

        label.style.removeProperty('width')
      });
    } 
    else {
      this.adjustForm(element, tempForm);
    }
  }
  
  private static adjustButtonContainer(element: HTMLElement) {
    let buttons = element.querySelector('.ui-input-buttons') as HTMLElement;
    
    if (buttons == null) return;

    let label = buttons.querySelector('label') as HTMLElement;
    let editor = buttons.querySelector('div.ui-input-editor') as HTMLElement;
    
    if (label != null) label.remove();

    if (editor != null) {
      editor.classList.add('ui-buttons-editor');
      editor.style.flexWrap = 'wrap';
      editor.style.padding = '0';
    }
  }

  private static adjustForm(element:HTMLElement, tempForm:HTMLElement){
    const minFormWidth = Number(tempForm.getAttribute('data-min-width'));
    const maxFormWidth = Number(tempForm.getAttribute('data-max-width'));
    const currentWidth = element.getBoundingClientRect().width;
    const label = tempForm.querySelector('label.ui-input-label') as HTMLElement;
    const maxLabelWidth = label != null ? parseInt(label.style.maxWidth) : 0;
    
    if (currentWidth > minFormWidth) {
      Array.from(element.children).forEach((field)=>{
        let inputWidth = field.getAttribute('data-input') != null ? Number(field.getAttribute('data-input')) : 0;
        let optionWidth = field.getAttribute('data-options') != null ? Number(field.getAttribute('data-options')) : 0;
        let option = field.querySelector('.ui-input-options') as HTMLElement;
        let optionIcon = iconFA('ellipsis-h', ()=>{
          $(element).find('.ui-input-options').not(option).removeClass('ui-input-options-expand');
          $(option).toggleClass('ui-input-options-expand');
        });
        optionIcon.classList.add('ui-input-options-icon');

        if (option == null) return;

        if ($(option).has('i').length != 0) option.append(optionIcon);

        if (currentWidth < maxLabelWidth+inputWidth+8+optionWidth) {
         $(option).children().css('display', 'none');
         $(optionIcon).css('display', 'flex');
        }
        else {
          $(option).children().css('display', 'flex');
          $(optionIcon).css('display', 'none');
        }

      });
    }
    else if (currentWidth < minFormWidth)
      element.classList.add('ui-form-condensed')

    // Add tooltips for radio and multi-choice inputs
    Array.from(element.children).forEach((field)=>{ 
      let editor = field.querySelector('.ui-input-editor');
      if (editor != null && editor.children.length != 0) {
        Array.from(editor.children).forEach((item) => {
          let label = item.querySelector('label');
          if (label != null)
            api.grok_Tooltip_SetOn(label, label.textContent)
        })
      }
    });
  }

  private static handleFormResize(element: HTMLElement, labels: number[], minInputWidth: number) {
    const fields = Array.from(element.children) as HTMLElement [];
    const fieldsCount = element.querySelectorAll('.ui-input-root').length;
    const formClassName = element.className;
    const minFormWidth = element.getAttribute('data-min-width') != null ? Number(element.getAttribute('data-min-width')) : Math.max(...labels)+minInputWidth;
    
    tools.handleResize(element, (currentWidth) => { 
      let shrinkedLabels = 0;

      fields.forEach((field, index) => {
        //Get label and options containers
        let label = field.querySelector('label.ui-input-label') as HTMLElement;
        let editor = field.querySelector('.ui-input-editor') as HTMLElement;
        let option = field.querySelector('.ui-input-options') as HTMLElement;

        //Get field data attributes
        let labelWidth = field.getAttribute('data-label') != null ? Number(field.getAttribute('data-label')) : 0;
        let inputWidth = field.getAttribute('data-input') != null ? Number(field.getAttribute('data-input')) : 0;
        let optionWidth = field.getAttribute('data-options') != null ? Number(field.getAttribute('data-options')) : 0;
        
        //Hide options if current width less than max label width + current input and options width + 8px label margin
        if (currentWidth < Math.max(...labels)+inputWidth+8+optionWidth) {
          if (option != null)
            $(option).children().css('display','none');
            $(option).find('.ui-input-options-icon').css('display','flex');
        }
        else {
          if (option != null)
            $(option).removeClass('ui-input-options-expand');
            $(option).children().css('display','flex');
            $(option).find('.ui-input-options-icon').css('display','none');
        }

        //Shrink labels if current form width less than min form width
        if (currentWidth < Math.max(...labels)+minInputWidth) {
          if (label != null) {
            label.style.width = String(Math.ceil(Math.max(...labels)/(Math.max(...labels)+58)*100))+'%';
            label.style.flexShrink = String(1-Math.max(...labels)/(Math.max(...labels)+58));
            api.grok_Tooltip_SetOn(label, label?.textContent);
          }

          if (editor == null) return;

          editor.style.maxWidth = String(minInputWidth)+'px';
          editor.style.width = '100%';
        }
        else {
          if (label != null) {
            label.style.width = '100%';
            label.style.removeProperty('flex-shrink');
          }
          if (editor != null) {
            editor.style.removeProperty('max-width');
            editor.style.removeProperty('width');
          }
        }
  
        //Detect when label become to shrink  
        if (currentWidth < labelWidth+minInputWidth)
          shrinkedLabels++;
  
        //Hide options for condensed form  
        if (element.classList.contains('ui-form-condensed')) {
          if (editor != null) {
            editor.style.maxWidth = 'initial';
            editor.style.removeProperty('width');
          }

          if (currentWidth < inputWidth+8+optionWidth) {
            if (option != null) { 
              $(option).children().css('display','none');
              $(option).find('.ui-input-options-icon').css('display','flex');
            }
          }
          else {
            if (option != null) {
              $(option).removeClass('ui-input-options-expand');
              $(option).children().css('display','flex');
              $(option).find('.ui-input-options-icon').css('display','none');
            }
          }
        }
      });

      //If 80% of labels are shrinked change form type to condensed
      if (Math.round(100-(shrinkedLabels/fieldsCount*100)) < 80)
        element.classList.add('ui-form-condensed');
      else
        element.classList.remove('ui-form-condensed');
    });
    
  }
}

/** Represents a tooltip. */
export class Tooltip {

  /** Hides the tooltip. */
  hide(): void {
    api.grok_Tooltip_Hide();
  }

  /** Associated the specified visual element with the corresponding item. 
   * Example: {@link https://public.datagrok.ai/js/samples/ui/tooltips/tooltips}
  */
  bind(element: HTMLElement, tooltip?: string | null | (() => string | HTMLElement | null)): HTMLElement {
    if (tooltip != null)
      api.grok_Tooltip_SetOn(element, tooltip);
    return element;
  }

  /** Shows the tooltip at the specified position */
  show(content: HTMLElement | string, x: number, y: number): void {
    api.grok_Tooltip_Show(content, x, y);
  }

  showRowGroup(dataFrame: DataFrame, indexPredicate: IndexPredicate, x: number, y: number): void {
    api.grok_Tooltip_ShowRowGroup(dataFrame.dart, indexPredicate, x, y);
  }

  /** Returns a tooltip element. */
  get root(): HTMLElement {
    return api.grok_Tooltip_Get_Root();
  }

  get isVisible(): boolean { return api.grok_Tooltip_Is_Visible(); }

  get onTooltipRequest(): rxjs.Observable<any> { return __obs('d4-tooltip-request'); }
  get onTooltipShown(): rxjs.Observable<any> { return __obs('d4-tooltip-shown'); }
  get onTooltipClosed(): rxjs.Observable<any> { return __obs('d4-tooltip-closed'); }
}

export let tooltip = new Tooltip();

export class ObjectHandlerResolutionArgs {
  semValue: SemanticValue;
  context: object | null;
  handler: ObjectHandler | null;

  get value(): any { return this.semValue.value; }

  constructor(semValue: SemanticValue, context: object | null) {
    this.semValue = semValue;
    this.context = context;
    this.handler = null;
  }
}

let _objectHandlerSubject = new rxjs.Subject<ObjectHandlerResolutionArgs>();

/**
 * Override the corresponding methods, and {@link register} an instance to
 * let Datagrok know how to handle objects of the specified type.
 *
 * {@link isApplicable} is used to associate an object with the handler.
 * When handling an object x, the platform uses the first registered handler that
 * claims that it is applicable to that object.
 *
 * TODO: search, destructuring to properties
 *
 * Example: {@link https://public.datagrok.ai/js/samples/ui/handlers/handlers} */
export class ObjectHandler {

  /** Type of the object that this meta handles. */
  get type(): string {
    throw 'Not defined.';
  }

  get name(): string { return `${this.type} handler`; }

  toString(): string { return this.name; }

  async getById(id: string): Promise<any> {
    return null;
  }

  async refresh(x: any): Promise<any> {
    return x;
  }
  /**
   * Override this method to check whether this meta class should handle the specified object.
   * @param x - specified object.
   * @returns {boolean} */
  isApplicable(x: any): boolean {
    throw 'Not defined.';
  }

  /** String representation of the [item], by default item.toString().
   * @param x - item
   * @returns {string} */
  getCaption(x: any): string {
    return `${x}`;
  }

  /** @returns {CanvasRenderer} */
  getCanvasRenderer(): CanvasRenderer | null {
    return null;
  }

  /** @returns {GridCellRenderer} */
  getGridCellRenderer(): GridCellRenderer | null {
    return null;
  }

  /** Renders icon for the item. */
  renderIcon(x: any, context: any = null): HTMLElement {
    return divText(this.getCaption(x));
  }

  /** Renders markup for the item. */
  renderMarkup(x: any, context: any = null): HTMLElement {
    return divText(this.getCaption(x));
  }

  /** Renders tooltip for the item. */
  renderTooltip(x: any, context: any = null): HTMLElement {
    return divText(this.getCaption(x));
  }

  /** Renders card div for the item. */
  renderCard(x: any, context: any = null): HTMLElement {
    return divText(this.getCaption(x));
  }

  /** Renders properties list for the item. */
  renderProperties(x: any, context: any = null): HTMLElement {
    return divText(this.getCaption(x));
  }

  /** Renders preview list for the item. */
  async renderPreview(x: any, context: any = null): Promise<View> {
    return View.create();
  }

  /** Renders view for the item. */
  renderView(x: any, context: any = null): HTMLElement {
    return this.renderProperties(x);
  }

  /** Gets called once upon the registration of meta export class. */
  init(): void { }

  /** Registers entity handler. */
  static register(meta: ObjectHandler): void {
    api.grok_Meta_Register(meta);
    let cellRenderer = meta.getGridCellRenderer();
    if (cellRenderer != null)
      GridCellRenderer.register(cellRenderer);
  }

  static list(): ObjectHandler[] {
    return toJs(api.grok_Meta_List());
  }

  static onResolve(observer: rxjs.PartialObserver<ObjectHandlerResolutionArgs>): rxjs.Subscription {
    return _objectHandlerSubject.subscribe(observer);
  }

  static forEntity(object: object, context: object | null = null): ObjectHandler | null {
    let semValue = object instanceof SemanticValue ? object : SemanticValue.fromValueType(object, null);

    let args = new ObjectHandlerResolutionArgs(semValue, context);
    _objectHandlerSubject.next(args);
    if (args.handler !== null)
      return args.handler;

    return toJs(api.grok_Meta_ForEntity(toDart(object)));
  }

  static forSemType(semType: string): Promise<ObjectHandler[]> {
    return new Promise((resolve, reject) => api.grok_Meta_ForSemType(semType, (t: any) => resolve(toJs(t)), (e: any) => reject(e)));
  }

  /**
   * Registers a function that takes applicable objects as the only argument.
   * It will be suggested to run in the context menu for that object, and
   * also in the "Actions" pane on the context panel.
   *
   * Example: {@link https://public.datagrok.ai/js/samples/ui/docking/docking}
   *
   * @param {string} name - function name
   * @param run - a function that takes exactly one parameter
   * */
  registerParamFunc(name: string, run: (param: any) => any): void {
    // @ts-ignore
    new Functions().registerParamFunc(name, this.type, run, this.isApplicable);
  }
}

export class EntityMetaDartProxy extends ObjectHandler {
  dart: any;

  constructor(d: any) {
    super();
    this.dart = d;
  }

  get type(): string { return api.grok_Meta_Get_Type(this.dart); }
  isApplicable(x: any): boolean { return api.grok_Meta_IsApplicable(this.dart, toDart(x)); }
  getCaption(x: any): string { return api.grok_Meta_Get_Name(this.dart, x); }

  renderIcon(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderIcon(x); }
  renderMarkup(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderMarkup(x); }
  renderTooltip(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderTooltip(x); }
  renderCard(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderCard(x); }
  renderProperties(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderProperties(x); }
  renderView(x: any, context: any = null): HTMLDivElement { return api.grok_Meta_RenderProperties(x); }
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/box} 
 */
export function box(item: Widget | InputBase | HTMLElement | null = null, options: string | ElementOptions | null = null): HTMLDivElement {
  if (item instanceof Widget) {
    item = item.root;
  }
  if (item instanceof InputBase) {
    console.log('inputbase');
    item = item.root;
  }
  if (item != null && $(item).hasClass('ui-box')) {
    return item as HTMLDivElement;
  }
  let c = document.createElement('div');
  _options(c, options);
  $(c).append(item).addClass('ui-box');
  return c;
}

export function boxFixed(item: Widget | InputBase | HTMLElement | null, options: ElementOptions | null = null): HTMLDivElement {
  let c = box(item, options);
  $(c).addClass('ui-box-fixed');
  return c;
}

/** Div flex-box container that positions child elements vertically. 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/splitters} 
*/
export function splitV(items: HTMLElement[], options: ElementOptions | null = null, resize: boolean | null = false): HTMLDivElement {
  let b = box(null, options);
  if (resize && items.length > 1){
    items.forEach((v, i) => {
      let divider = box();
      divider.className='ui-split-v-divider';
      $(b).addClass('ui-split-v').append(box(v))
      if (i != items.length - 1) {
        $(b).append(divider)
        spliterResize(divider, items[i], items[i + 1])
      }
    });

    tools.waitForElementInDom(b).then((x)=>{
      const rootHeight = x.getBoundingClientRect().height;
      const childs = Array.from(b.children as HTMLCollectionOf<HTMLElement>);
      let defaultHeigh = 0;
      let noHeightCount = 0;
      
      childs.forEach((element) => { 
        if (!element.classList.contains('ui-split-v-divider')) {
          if (element.style.height != '') {
            defaultHeigh += Number(element.style.height.replace(/px$/, ''));
          } else {
            noHeightCount++;
          }
        }else{
          element.style.height = '4px';
        } 
      });

      childs.forEach((element) => { 
        if (!element.classList.contains('ui-split-v-divider')) {
          if (element.style.height == '') {
            let height = (rootHeight-defaultHeigh-($(b).find('.ui-split-v-divider').length*4))/noHeightCount;
            element.style.height = String(height)+'px';
          }
        }
      })

    });

    tools.handleResize(b, (w,h)=>{
      const rootHeight = b.getBoundingClientRect().height;

      for (let i = 0; i < b.children.length; i++){
        if ($(b.childNodes[i]).hasClass('ui-split-v-divider')!=true){
          let height = (h-rootHeight)/b.children.length+$(b.childNodes[i]).height();
          $(b.childNodes[i]).css('height', String(height)+'px');
          //$(b.childNodes[i]).attr('style', `height:${(h-rootHeight)/b.children.length+$(b.childNodes[i]).height()}px;`);
        } else {
          $(b.childNodes[i]).css('height', 4);
        }
      }
      
    });

  } else {
    $(b).addClass('ui-split-v').append(items.map(item => box(item)))
  }
  return b;
}

/** Div flex-box container that positions child elements horizontally. 
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/splitters}
*/
export function splitH(items: HTMLElement[], options: ElementOptions | null = null, resize: boolean | null = false): HTMLDivElement {
  let b = box(null, options);

  if (resize && items.length > 1) {
    items.forEach((v, i) => {
      let divider = box();
      divider.className='ui-split-h-divider';
      $(b).addClass('ui-split-h').append(box(v))
      if (i != items.length - 1) {
        $(b).append(divider)
        spliterResize(divider, items[i], items[i + 1], true);
      }
    });

    tools.waitForElementInDom(b).then((x)=>{
      const rootWidth = x.getBoundingClientRect().width;
      const childs = Array.from(b.children as HTMLCollectionOf<HTMLElement>);
      let defaultWidth = 0;
      let noWidthCount = 0;
      
      childs.forEach((element) => { 
        if (!element.classList.contains('ui-split-h-divider')) {
          if (element.style.width != '') {
            defaultWidth += Number(element.style.width.replace(/px$/, ''));
          } else {
            noWidthCount++;
          }
        }else{
          element.style.width = '4px';
        } 
      });

      childs.forEach((element) => { 
        if (!element.classList.contains('ui-split-h-divider')) {
          if (element.style.width == '') {
            let width = (rootWidth-defaultWidth-($(b).find('.ui-split-h-divider').length*4))/noWidthCount;
            element.style.width = String(width)+'px';
          }
        }
      })

    });

    tools.handleResize(b, (w,h)=>{
      const rootWidth = b.getBoundingClientRect().width;

      for (let i = 0; i < b.children.length; i++){
        if ($(b.childNodes[i]).hasClass('ui-split-h-divider')!=true){
          let width = (w-rootWidth)/b.children.length+$(b.childNodes[i]).width();
          $(b.childNodes[i]).css('width', String(width)+'px');
        } else {
          $(b.childNodes[i]).css('width', 4);
        }
      }
      
    });

  } else {
    $(b).addClass('ui-split-h').append(items.map(item => box(item)))
  }
  return b;
}

function spliterResize(divider: HTMLElement, previousSibling: HTMLElement, nextSibling: HTMLElement, horizontal: boolean = false) {
let md: any;
divider.onmousedown = onMouseDown;

if (horizontal) {
  divider.style.cssText = `
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='20'><path d='M 8 3 h 10 M 8 6 h 10 M 8 9 h 10' fill='none' stroke='%239497A0' stroke-width='1.25'/></svg>");
  max-width: 4px;
  width: 4px;
  min-width: 4px;
  cursor: col-resize;`
}
else {
  divider.style.cssText = `
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='20'><path d='M 2 5 v 10 M 5 5 v 10 M 8 5 v 10' fill='none' stroke='%239497A0' stroke-width='1.25'/></svg>");
  max-height: 4px;
  height: 4px;
  min-height: 4px;
  cursor: row-resize;`
}

divider.style.backgroundRepeat = 'no-repeat';
divider.style.backgroundPosition = 'center';
divider.style.backgroundColor = 'var(--grey-1)';

function onMouseDown(e: any) {
  if (!nextSibling.classList.contains('ui-box'))
  nextSibling = nextSibling.parentElement!;
  if (!previousSibling.classList.contains('ui-box'))
  previousSibling = previousSibling.parentElement!;

  md = {
      e,
      offsetLeft: divider.offsetLeft,
      offsetTop: divider.offsetTop,
      topHeight: previousSibling.offsetHeight,
      bottomHeight: nextSibling.offsetHeight,
      leftWidth: previousSibling.offsetWidth,
      rightWidth: nextSibling.offsetWidth
  };

  divider.style.backgroundColor = 'var(--grey-2)';
  document.onmousemove = onMouseMove;
  document.onmouseup = () => {
  divider.style.backgroundColor = 'var(--grey-1)';
  document.onmousemove = document.onmouseup = null;
  }
}

function onMouseMove(e: any) {
  const delta = {x: e.clientX - md.e.clientX, y: e.clientY - md.e.clientY};
  if (horizontal) {
      delta.x = Math.min(Math.max(delta.x, - md.leftWidth), md.rightWidth);
      //$(previousSibling).css('width', md.leftWidth + delta.x);
      //$(nextSibling).css('width', md.rightWidth - delta.x);
      let newPrevWidth = md.leftWidth + delta.x;
      let newNextWidth = md.rightWidth - delta.x;
      previousSibling.style.width = String(newPrevWidth)+'px';
      nextSibling.style.width = String(newNextWidth)+'px';
      //previousSibling.setAttribute('style',`width: ${(md.leftWidth + delta.x)}px;`);
      //nextSibling.setAttribute('style',`width:${(md.rightWidth - delta.x)}px;`);
  } else {
      delta.x = Math.min(Math.max(delta.y, - md.topHeight), md.bottomHeight);
      //$(previousSibling).css('height', md.topHeight + delta.y);
      //$(nextSibling).css('height', md.bottomHeight - delta.y);
      let newPrevHeight = md.topHeight + delta.y;
      let newNextHeight = md.bottomHeight - delta.y;
      previousSibling.style.height = String(newPrevHeight)+'px';
      nextSibling.style.height = String(newNextHeight)+'px';
      //previousSibling.setAttribute('style',`height: ${(md.topHeight + delta.y)}px;`);
      //nextSibling.setAttribute('style',`height: ${(md.bottomHeight - delta.y)}px;`);
  }
}
}

export function ribbonPanel(items: HTMLElement[] | null): HTMLDivElement {
  const root = document.createElement('div');
  $(root).addClass('d4-ribbon');
  if (items != null) {
    $(root).append(items.map(item => {
      let itemBox = document.createElement('div');
      $(itemBox).addClass('d4-ribbon-item');
      $(itemBox).append(item);
      return render(itemBox)
    }));
  }
  const wrapSpacer = document.createElement('div');
  $(wrapSpacer).addClass('d4-ribbon-wrap-spacer');
  $(root).prepend(wrapSpacer);
  return root;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/blocks}
 */
export function block(items: HTMLElement[], options: string | ElementOptions | null = null): HTMLDivElement {
  let c = div(items, options);
  $(c).addClass('ui-block');
  return c;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/blocks}
 */
export function block75(items: HTMLElement[], options: ElementOptions | null = null): HTMLDivElement {
  let c = block(items, options);
  $(c).addClass('ui-block-75');
  return c;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/blocks}
 */
export function block25(items: HTMLElement[], options: ElementOptions | null = null): HTMLDivElement {
  let c = block(items, options);
  $(c).addClass('ui-block-25');
  return c;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/blocks}
 */
export function block50(items: HTMLElement[], options: ElementOptions | null = null): HTMLDivElement {
  let c = block(items, options);
  $(c).addClass('ui-block-50');
  return c;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 */
export function p(text: string, options: any = null): HTMLParagraphElement {
  let c = document.createElement('p');
  c.textContent = text;
  $(c).addClass('ui-p');
  _options(c, options);
  return c;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/containers/panels} 
 */
export function panel(items: HTMLElement[] = [], options?: string | ElementOptions): HTMLDivElement {
  let e = div(items, options);
  $(e).addClass('ui-panel');
  return e;
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/typography}
 */
export function label(text: string | null, options: {} | null = null): HTMLLabelElement {
  let c = document.createElement('label');
  c.textContent = text;
  $(c).addClass('ui-label');
  _options(c, options);
  return c;
}

export namespace forms {

  export function normal(children: InputBase[], options: {} | null = null){
    let d = form(children, options, true);
    return d;
  }

  export function condensed(children: InputBase[], options: {} | null = null){
    let d = narrowForm(children, options);
    return d;
  }

  export function wide(children: InputBase[], options: {} | null = null){
    let d = wideForm(children, options);
    return d;
  }

  export function addButtons(form: HTMLElement, children: HTMLButtonElement[] = []) {
    if (!Array.isArray(children))
      children = [children];
  
    if (children == null)
      return;

    let style = $(form).find('div.ui-input-root').first().attr('style');
    let root = document.createElement('div');
    let editor = document.createElement('div');
    $(editor).addClass('ui-input-editor').css('flex-wrap', 'wrap').css('padding', '0');
    $(root).addClass('ui-input-root ui-input-buttons').attr('style', style != null ? style : '');
    
    if ($(form).find('.ui-input-buttons').length != 0) {
        $(form).find('.ui-input-buttons > div.ui-input-editor').prepend(children.map(x => render(x)));
    } else {
      $(editor).append(children.map(x => render(x)));
      root.append(editor);
      form.append(root);
    }
  }
}

export function form(inputs: InputBase[], options: {} | null = null, autosize: boolean = true): HTMLElement {
  const form = InputForm.forInputs(inputs);
  const d = form.root;
  _options(d, options);
  $(d).addClass('ui-form');
  return d;
}

export function narrowForm(children: InputBase[] = [], options: {} | null = null): HTMLElement {
  let d = form(children, options, false);
  $(d).addClass('ui-form-condensed');
  return d;
}

export function wideForm(children: InputBase[] = [], options: {} | null = null): HTMLElement {
  let d = form(children, options, false);
  $(d).addClass('ui-form-wide');
  return d;
}

export function buttonsInput(children: HTMLButtonElement[] = []): HTMLDivElement {
  if (!Array.isArray(children))
    children = [children];

  let d = document.createElement('div');
  let l = document.createElement('label');
  let e = document.createElement('div');
  $(e).addClass('ui-input-editor');
  if (children != null)
    $(e).append(children.map(x => render(x)));
  l.textContent = ' ';
  $(l).addClass('ui-label ui-input-label');
  $(d).addClass('ui-input-root ui-input-buttons').append(l).append(e);
  return d;
}

export function contextActions(x: any): HTMLElement {
  return api.grok_UI_Context_Actions(x);
}

export function star(id: string): HTMLElement {
  return api.grok_UI_Star(id);
}

function _icon(type: string, handler: Function, tooltipMsg: string | null = null): HTMLElement {
  let e = $(`<i class="grok-icon grok-font-icon-${type}"></i>`)[0] as HTMLElement;
  e?.addEventListener('click', (e) => handler(e));
  tooltip.bind(e, tooltipMsg);
  return e;
}

function _iconFA(type: string, handler: Function | null, tooltipMsg: string | null = null): HTMLElement {
  let e = $(`<i class="grok-icon fal fa-${type}"></i>`)[0] as HTMLElement;
  if (handler != null)
    e?.addEventListener('click', (e) => handler(e));
  tooltip.bind(e, tooltipMsg);
  return e;
}

/**  
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/breadcrumbs} 
 */
export function breadcrumbs(path: string[]): Breadcrumbs {
  return new Breadcrumbs(path);
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/combo-popup}
 */
export function dropDown(label: string | Element, createElement: () => HTMLElement): DropDown {
  return new DropDown(label, createElement);
}

export function typeAhead(name: string, config: TypeAheadConfig): TypeAhead {
  return new TypeAhead(name, config);
}

export function tagsInput(name: string, tags: string[], showBtn: boolean) {
  return new TagsInput(name, tags, showBtn);
}

export let icons = {
  close: (handler: Function, tooltipMsg: string | null = null) => _icon('close', handler, tooltipMsg),
  help: (handler: Function, tooltipMsg: string | null = null) => _icon('help', handler, tooltipMsg),
  settings: (handler: Function, tooltipMsg: string | null = null) => _icon('settings', handler, tooltipMsg),
  edit: (handler: Function, tooltipMsg: string | null = null) => _iconFA('pen', handler, tooltipMsg),
  save: (handler: Function | null, tooltipMsg: string | null = null) => _iconFA('save', handler, tooltipMsg),
  copy: (handler: Function, tooltipMsg: string | null = null) => _iconFA('copy', handler, tooltipMsg),
  add: (handler: Function, tooltipMsg: string | null = null) => _iconFA('plus', handler, tooltipMsg),
  remove: (handler: Function, tooltipMsg: string | null = null) => _iconFA('minus', handler, tooltipMsg),
  delete: (handler: Function, tooltipMsg: string | null = null) => _iconFA('trash-alt', handler, tooltipMsg),
  undo: (handler: Function, tooltipMsg: string | null = null) => _iconFA('undo', handler, tooltipMsg),
  sync: (handler: Function, tooltipMsg: string | null = null) => _iconFA('sync', handler, tooltipMsg),
  info: (handler: Function, tooltipMsg: string | null = null) => _iconFA('info-circle', handler, tooltipMsg),
  search: (handler: Function, tooltipMsg: string | null = null) => _iconFA('search', handler, tooltipMsg),
  filter: (handler: Function, tooltipMsg: string | null = null) => _iconFA('filter', handler, tooltipMsg),
  play: (handler: Function, tooltipMsg: string | null = null) => _iconFA('play', handler, tooltipMsg),
}

export function setDisplayAll(elements: HTMLElement[], show: boolean): void {
  elements.forEach((e) => setDisplay(e, show));
}

export function setDisplay(element: HTMLElement, show: boolean) {
  if (show)
    element.style.removeProperty('display');
  else
    element.style.display = 'none';
  return element;
}

export function setDisabled(element: HTMLElement, disabled:boolean, tooltip?: string | null | (() => string | HTMLElement | null)): void {
  if (!disabled) {
    element.classList.remove('d4-disabled');
    element.classList.contains('ui-input-root') ? element.classList.remove('ui-input-disabled') : null
  }
  else {
    element.classList.add('d4-disabled');
    element.classList.contains('ui-input-root') ? element.classList.add('ui-input-disabled') : null
  }

  if (tooltip == null)
    return;

  api.grok_Tooltip_SetOn(element, tooltip);

  const overlay = document.createElement('span');
  overlay.style.position = 'fixed';

  if ($(document.body).has('.d4-tooltip-overlays').length != 0)
    $('.d4-tooltip-overlays').append(overlay)
  else
    document.body.append(div([overlay],'d4-tooltip-overlays'));

  let interval = setInterval(()=> {
    let target = element.getBoundingClientRect();
    
    overlay.style.left = String(target.left)+'px';
    overlay.style.top = String(target.top)+'px';
    overlay.style.width = String(target.width)+'px';
    overlay.style.height = String(target.height)+'px';
    
    if ($('body').has(element).length == 0 || !element.classList.contains('d4-disabled')) { 
      overlay.remove();
      clearInterval(interval);
    }
  }, 100);

  overlay.addEventListener('mousemove', (e:MouseEvent)=> {
    api.grok_Tooltip_Show(tooltip, e.clientX+10, e.clientY+10);
  });

  overlay.addEventListener('mouseleave', (e:MouseEvent) => {
    setTimeout(() => {
      api.grok_Tooltip_Hide();
    }, 200)
  });
}

/**
 * Example: {@link https://public.datagrok.ai/js/samples/ui/components/file-browser}
 */
export function fileBrowser(params: {path?: string, dataSourceFilter?: fileShares[]} = {}): Widget {
  return FilesWidget.create(params);
}

export namespace tools {
  export function click<T extends HTMLElement>(e: T, handler: () => void): T {
    e.addEventListener('click', handler);
    return e;
  }
}

export namespace cards {

  /** Two columns, with picture on the left and details on the right. 
   * Example: {@link https://public.datagrok.ai/js/samples/ui/components/summary-card}
  */
  export function summary(picture: HTMLElement, details: any[]): HTMLElement {
    return divH([
      $(picture).addClass('ui-card-picture').get()[0],
      div(details.map((d) => render(d)), 'ui-card-details')
    ], 'ui-card')
  }
}

export namespace labels {

  /** Minor details to show using the smaller font */
  export function details(s: string): HTMLDivElement {
    return divText(s, 'ui-label-details');
  }
}

/** Visual hints attached to an element. They can be used to introduce a new app to users. */
export namespace hints {

  export enum POSITION {
    TOP = 'top',
    BOTTOM = 'bottom',
    LEFT = 'left',
    RIGHT = 'right',
  }

  /** Adds a popup window with the specified [content] next to an [element].
   * Set [position] to control where the popup will appear. The default position is [POSITION.RIGHT]. */
  export function addHint(el: HTMLElement, content: HTMLElement, position: `${POSITION}` = POSITION.RIGHT) {
    const root = document.createElement('div');
    root.className = 'ui-hint-popup';

    const closeBtn = iconFA('times', () => root.remove());
    closeBtn.style.cssText = `
      position: absolute;
      right: 10px;
      top: 10px;
      color: var(--grey-4);
    `;

    const node = el.getBoundingClientRect();

    root.append(closeBtn);
    root.append(content);
    $('body').append(root);

    if (position == POSITION.RIGHT) {
      const right = node.right + 8;
      root.style.left = right + 'px';
      root.style.top = node.top + (el.offsetHeight / 2) - 17 + 'px';
      root.classList.add(`ui-hint-popup-${position}`);
    } else if (position == POSITION.LEFT) {
      let left = node.left - root.offsetWidth - 8;
      if (left < 0)
        left = 0;
      root.style.left = left + 'px';
      root.style.top = node.top + (el.offsetHeight / 2) - 17 + 'px';
      root.classList.add(`ui-hint-popup-${position}`);
    } else if (position == POSITION.TOP) {
      let top = node.top - root.offsetHeight - 8;
      if (top < 0)
        top = 0;
      root.style.left = node.left + (el.offsetWidth / 2) - 17 + 'px';
      root.style.top = top + 'px';
      root.classList.add(`ui-hint-popup-${position}`);
    } else if (position == POSITION.BOTTOM) {
      let bottom = node.bottom + 8;
      if (bottom + root.offsetHeight > window.innerHeight)
        bottom = window.innerHeight - root.offsetHeight;
      root.style.left = node.left + (el.offsetWidth / 2) - 17 + 'px';
      root.style.top = bottom + 'px';
      root.classList.add(`ui-hint-popup-${position}`);
    }

    return root;
  }

  /** Adds a hint indication to the provided element and returns it.
   * Example: {@link https://public.datagrok.ai/js/samples/ui/interactivity/hints}
   */
  export function addHintIndicator(el: HTMLElement, clickToClose: boolean = true, autoClose?: number): HTMLElement {
    const id = Math.floor(Math.random() * 1000);
    const hintIndicator = document.createElement('div');
    hintIndicator.className = 'ui-hint-blob';

    hintIndicator.setAttribute('data-target', 'hint-target-' + id);
    el.setAttribute('data-target', 'hint-target-' + id);

    el.classList.add('ui-hint-target');
    $('body').append(hintIndicator);
    
    hintIndicator.style.position = 'fixed';
    hintIndicator.style.zIndex = '4000';

    let setPosition = setInterval(function () {
      if ($('body').has(el).length != 0) {
        const indicatorNode = el.getBoundingClientRect();
        hintIndicator.style.left = indicatorNode.left + 'px';
        hintIndicator.style.top = indicatorNode.top + 'px';
      } else {
        hintIndicator.remove();
        clearInterval(setPosition);
      } 
    }, 10);

    if (clickToClose) {
      $(el).on('click', () => {
        remove(el);
      });
    }

    if (autoClose! > 0) {
      setTimeout(() => remove(el), autoClose);
    }
    return el;
  }

  /** Describes series of visual components in the wizard. Each wizard page is associated with the
   * [showNextTo] element. Provide either [text] or [root] parameter to populate the page, the other
   * parameters are optional. The wizard header is shown only if [title] or [helpUrl] are provided.
   * The user can use the arrow buttons to navigate the set of instructions. The wizard can be closed
   * from the dialog header (the "x" icon), via the "Cancel" button, or via the [Wizard.close()] method.
   * Example: {@link https://public.datagrok.ai/js/samples/ui/interactivity/wizard-hints}:*/
  export function addTextHint(options: {title?: string, helpUrl?: string, pages?: HintPage[]}): Wizard {
    let targetElement: HTMLElement | undefined;
    const overlay = div([], 'ui-hint-overlay');
    $('body').prepend(overlay);
    const horizontalOffset = 10;
    const wizard = new Wizard({title: options.title, helpUrl: options.helpUrl});

    const cancelBtn = wizard.getButton('CANCEL');
    $(cancelBtn)?.hide();
    const prevBtn = wizard.getButton('<<');
    $(prevBtn).empty();
    const prevIcon = iconFA('chevron-left');
    $(prevIcon).css('color', 'inherit');
    prevBtn.append(prevIcon);
    const nextBtn = wizard.getButton('>>');
    nextBtn.innerText = 'OK';

    if (options.pages) {
      nextBtn.innerText = (wizard.pageIndex === options.pages.length - 1) ? 'OK' : 'NEXT';
      const pageNumberStr = `${wizard.pageIndex + 1}/${options.pages.length}`;
      wizard.addButton(pageNumberStr, () => {}, 1);
      const pageNumberField = wizard.getButton(pageNumberStr);
      pageNumberField.classList.add('disabled');
      $(pageNumberField).css('font-weight', 500);

      function ok() {
        if (nextBtn.innerText === 'OK')
          wizard.close();
      }

      for (const p of options.pages) {
        const page = Object.assign({}, p);
        page.onActivated = () => {
          if (wizard.pageIndex === options.pages!.length - 1) {
            nextBtn.innerText = 'OK';
            // Use delay to override default wizard behavior
            setTimeout(() => nextBtn.classList.remove('disabled'), 10);
            $(nextBtn).on('click', ok);
          } else {
            nextBtn.innerText = 'NEXT';
            $(nextBtn).off('click', ok);
          }

          pageNumberField.innerText = `${wizard.pageIndex + 1}/${options.pages!.length}`;
          if (p.showNextTo) {
            if (targetElement)
              targetElement.classList.remove('ui-text-hint-target');
            targetElement = p.showNextTo;
            p.showNextTo.classList.add('ui-text-hint-target');
            const rect = HtmlUtils.htmlGetBounds(p.showNextTo);
            $(wizard.root).css('left', rect.right + horizontalOffset);
            $(wizard.root).css('top', rect.top);
          }
          if (p.onActivated)
            p.onActivated();
        };
        page.root = p.root ?? divText(p.text ?? '');
        wizard.page(<WizardPage>page);
      }
    }
    wizard.onClose.subscribe(() => remove(targetElement));
    $(overlay).on('click', () => wizard.close());
    const _x = $(wizard.root).css('left');
    const _y = $(wizard.root).css('top');
    wizard.show({width: 250, height: 200,
      x: _x ? parseInt(_x) : undefined, y: _y ? parseInt(_y) : undefined});
    return wizard;
  }

  /** Removes the hint indication from the provided element and returns it. */
  export function remove(el?: HTMLElement): HTMLElement | null {
    if (el != null) {
      const id = el.getAttribute('data-target');
      $(`div.ui-hint-blob[data-target="${id}"]`)[0]?.remove();
      el.classList.remove('ui-hint-target', 'ui-text-hint-target');
    }
    $('div.ui-hint-overlay')?.remove();
    return el ?? null;
  }
}

interface HintPage {

  /** Displays the wizard next to the specified element when the page is current. */
  showNextTo: HTMLElement;

  /** Page root. Can also be set via [text] property */
  root?: HTMLDivElement;

  /** Adds a div with the specified text as the page root. */
  text?: string;

  /** Caption to be displayed on top of the panel */
  caption?: HTMLElement | string;

  /** Called when the page is activated */
  onActivated?: () => void;

  /** Returns error message (and stops wizard from proceeding to the next page),
   * or null if validated */
  validate?: () => string | null;
}

export namespace css {

  export enum flex {
    row = 'd4-flex-row',
    col = 'd4-flex-col',
    wrap = 'd4-flex-wrap',
    nowrap = 'd4-flex-nowrap',
    grow = 'd4-flex-grow',
  }

  export enum alignItems {
    start = 'css-align-items-start',
    end = 'css-align-items-end',
    center = 'css-align-items-center',
    baseline = 'css-align-items-baseline',
    stretch = 'css-align-items-stretch',
  }

  export enum justifyContent {
    start = 'css-justify-content-start',
    end = 'css-justify-content-end',
    center = 'css-justify-content-center',
    between = 'css-justify-content-between',
    around = 'css-justify-content-around',
  }

  export enum gap {
    small = 'css-gap-small',
    medium = 'css-gap-medium',
    large = 'css-gap-large',
  }

  export enum margin {
    none = 'css-m-none',
    small = 'css-m-small',
    medium = 'css-m-medium',
    large = 'css-m-large',
    auto = 'css-m-auto'
  }

  export enum marginX {
    none = 'css-mx-none',
    small = 'css-mx-small',
    medium = 'css-mx-medium',
    large = 'css-mx-large',
    auto = 'css-mx-auto'
  }

  export enum marginY {
    none = 'css-my-none',
    small = 'css-my-small',
    medium = 'css-my-medium',
    large = 'css-my-large',
    auto = 'css-my-auto'
  }

  export enum marginLeft {
    none = 'css-ml-none',
    small = 'css-ml-small',
    medium = 'css-ml-medium',
    large = 'css-ml-large',
    auto = 'css-ml-auto'
  }

  export enum marginRight {
    none = 'css-mr-none',
    small = 'css-mr-small',
    medium = 'css-mr-medium',
    large = 'css-mr-large',
    auto = 'css-mr-auto'
  }

  export enum marginTop {
    none = 'css-mt-none',
    small = 'css-mt-small',
    medium = 'css-mt-medium',
    large = 'css-mt-large',
    auto = 'css-mt-auto'
  }

  export enum marginBottom {
    none = 'css-mb-none',
    small = 'css-mb-small',
    medium = 'css-mb-medium',
    large = 'css-mb-large',
    auto = 'css-mb-auto'
  }

  export enum padding {
    none = 'css-p-none',
    small = 'css-p-small',
    medium = 'css-p-medium',
    large = 'css-p-large',
  }

  export enum paddingX {
    none = 'css-px-none',
    small = 'css-px-small',
    medium = 'css-px-medium',
    large = 'css-px-large',
  }

  export enum paddingY {
    none = 'css-py-none',
    small = 'css-py-small',
    medium = 'css-py-medium',
    large = 'css-py-large',
  }

  export enum paddingLeft {
    none = 'css-pl-none',
    small = 'css-pl-small',
    medium = 'css-pl-medium',
    large = 'css-pl-large',
  }

  export enum paddingRight {
    none = 'css-pr-none',
    small = 'css-pr-small',
    medium = 'css-pr-medium',
    large = 'css-pr-large',
  }

  export enum paddingTop {
    none = 'css-pt-none',
    small = 'css-pt-small',
    medium = 'css-pt-medium',
    large = 'css-pt-large',
  }

  export enum paddingBottom {
    none = 'css-pb-none',
    small = 'css-pb-small',
    medium = 'css-pb-medium',
    large = 'css-pb-large',
  }

  export enum textSize {
    small = 'css-text-small',
    medium = 'css-text-medium',
    large = 'css-text-large',
  }

  export enum textAlign {
    left = 'css-text-left',
    right = 'css-text-right',
    center = 'css-text-center',
  }

  export enum textWeight {
    light = 'css-text-light',
    normal = 'css-text-normal',
    bolder = 'css-text-bolder',
    bold = 'css-text-bold',
  }

  export enum textTransform {
    lowercase = 'css-text-lowercase',
    uppercase = 'css-text-uppercase',
    capitalize = 'css-text-capitalize',
  }

  export enum lineHeight {
    small = 'css-lh-small',
    medium = 'css-lh-medium',
    large = 'css-lh-large',
  }

  export enum background {
    none = 'css-bg-none',
    white = 'css-bg-white',
    light = 'css-bg-light',
  }

  export enum shadow {
    none = 'css-shadow-none',
    small = 'css-shadow-small',
    medium = 'css-shadow-medium',
    large = 'css-shadow-large',
  }

  export enum table {
    normal = 'css-table',
    wide = 'css-table-wide'
  }

  export enum tableSize {
    small = 'css-table-small',
    medium = 'css-table-medium',
    large = 'css-table-large'
  }

  export enum tableStyle {
    border = 'css-table-border',
    linesRow = 'css-table-row-lines',
    linesCol = 'css-table-col-lines',
    striped = 'css-table-striped'
  }
  
  export enum border {
    all = 'css-border',
    right = 'css-border-right',
    left = 'css-border-left',
    top = 'css-border-top',
    bottom = 'css-border-bottom',
    leftRight = 'css-border-left-right',
    topBottom = 'css-border-top-bottom'
  }

}
