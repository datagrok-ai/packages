import {Cell, Column, DataFrame, Row} from './dataframe';
import {Viewer} from './viewer';
import {toDart, toJs} from './wrappers';
import {__obs, _sub, EventData, GridCellArgs, StreamSubscription} from './events';
import {_identityInt32, _isDartium, _toIterable, MapProxy} from './utils';
import {Observable} from 'rxjs';
import {Color, RangeSlider, Widget} from './widgets';
import {SemType} from './const';
import {Property} from './entities';
import {IFormSettings, IGridSettings} from "./interfaces/d4";
import {IDartApi} from "./api/grok_api.g";
import * as DG from "./dataframe";


const api: IDartApi = <any>window;
let _bytes = new Float64Array(4);

export type ColorType = number | string;

export interface IPoint {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Represents a point. */
export class Point implements IPoint {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Creates a point from an [x, y] array */
  static fromXY(xy: number[]): Point {
    return new Point(xy[0], xy[1]);
  }

  /** Distance to the specified point. */
  distanceTo(p: Point): number {
    return Math.sqrt((this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y));
  }

  /** Returns the bounding rectangle for the specified points. */
  static getBounds(points: IPoint[]): Rect {
    if (!points || points.length == 0)
      return new Rect(0, 0, 1, 1);

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (let i = 1; i < points.length; i++) {
      minX = Math.min(minX, points[i].x);
      minY = Math.min(minY, points[i].y);
      maxX = Math.max(maxX, points[i].x);
      maxY = Math.max(maxY, points[i].y);
    }

    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }
}


/** Represents a rectangle. */
export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  static fromPoints(x1: number, y1: number, x2: number, y2: number): Rect {
    let minX = Math.min(x1, x2);
    let minY = Math.min(y1, y2);
    return new Rect(minX, minY, Math.max(x1, x2) - minX, Math.max(y1, y2) - minY)
  }

  static fromXYArrays(x: number[], y: number[]): Rect {
    let minX = x[0];
    let minY = y[0];
    let maxX = x[0];
    let maxY = y[0];
  
    for (let i = 1; i < x.length; i++) {
      minX = Math.min(minX, x[i]);
      minY = Math.min(minY, y[i]);
      maxX = Math.max(maxX, x[i]);
      maxY = Math.max(maxY, y[i]);
    }
  
    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }

  static fromDart(dart: any): Rect {
    api.grok_Rect_Pack(dart, _bytes);
    return new Rect(_bytes[0], _bytes[1], _bytes[2], _bytes[3]);
  }

  static toDart(rect: Rect): any {
    _bytes[0] = rect.x;
    _bytes[1] = rect.y;
    _bytes[2] = rect.width;
    _bytes[3] = rect.height;
    return api.grok_Rect_Unpack(_bytes);
  }

  toDart(): any {
    _bytes[0] = this.x;
    _bytes[1] = this.y;
    _bytes[2] = this.width;
    _bytes[3] = this.height;
    return api.grok_Rect_Unpack(_bytes);
  }

  /** Rectangle of the specified size, with the specified center */
  fromCenterSize(cx: number, cy: number, width: number, height: number): Rect {
    return new Rect(cx - width / 2, cy - height / 2, width, height);
  }

  /** The midpoint of the rectangle along the x-axis. */
  get midX(): number {
    return this.x + this.width / 2;
  }

  /** The midpoint of the rectangle along the y-axis. */
  get midY(): number {
    return this.y + this.height / 2;
  }

  /** Same as x */
  get minX(): number { return this.x; }

  /** Same as (x + width), or (right) */
  get maxX(): number { return this.x + this.width; }

  /** Same as (y) */
  get minY(): number { return this.y; }

  /** Same as x + width */
  get maxY(): number { return this.bottom; }

  /** Left border position of the rectangle along the x-axis. */
  get left(): number {
    return this.x;
  }

  /** Top border position of the rectangle along the y-axis. */
  get top(): number {
    return this.y;
  }

  /** Right border position of the rectangle along the x-axis. */
  get right(): number {
    return this.x + this.width;
  }

  /** Bottom border position of the rectangle along the y-axis. */
  get bottom(): number {
    return this.y + this.height;
  }

  // --

  /** Moves rectangle by the specified offsets. */
  move(dx: number, dy: number): Rect {
    return new Rect(this.x + dx, this.y + dy, this.width, this.height);
  }

  /**
   * Rectangle's top part of height {@link height}.
   * New rectangle with the same top border as the original, but with a height of {@link height}.
   * The result may be larger than the original rectangle along y-axis.
   * @param height {number} new rectangle height
   */
  getTop(height: number): Rect {
    return new Rect(this.left, this.top, this.width, height);
  }

  /**
   * Rectangle's bottom part of height {@link height}.
   * New rectangle with the same bottom border as the original, but with a height of {@link height}.
   * The result may be larger than the original rectangle along y-axis.
   * @param height {number} new rectangle height
   */
  getBottom(height: number): Rect {
    return new Rect(this.left, this.bottom - height, this.width, height);
  }

  /**
   * Rectangle's left part of width {@link width}.
   * New rectangle with the same left border as the original, but with a width of {@link width}.
   * The result may be larger than the original rectangle along x-axis.
   * @param width {number} new rectangle width
   */
  getLeft(width: number): Rect {
    return new Rect(this.left, this.top, width, this.height);
  }

  /**
   * Rectangle's right part of width {@link width}.
   * New rectangle with the same right border as the original, but with a width of {@link width}.
   * The result may be larger than the original rectangle along x-axis.
   * @param width {number} new rectangle width
   */
  getRight(width: number): Rect {
    return new Rect(this.right - width, this.top, width, this.height);
  }

  /**
   * New rectangle with the same top-left corner as the original, but with new {@link width} and {@link height}.
   * The result may be larger than the original rectangle on both axes.
   * @param width {number} new rectangle width
   * @param height {number} new rectangle height
   */
  getTopLeft(width: number, height: number): Rect {
    return new Rect(this.left, this.top, width, height);
  }

  /**
   * New rectangle with the same top-right corner as the original, but with new {@link width} and {@link height}.
   * The result may be larger than the original rectangle on both axes.
   * @param width {number} new rectangle width
   * @param height {number} new rectangle height
   */
  getTopRight(width: number, height: number): Rect {
    return new Rect(this.right - width, this.top, width, height);
  }

  /**
   * New rectangle with the same bottom-left corner as the original,
   * but with new {@link width} and {@link height}.
   * The result may be larger than the original rectangle on both axes.
   * @param width {number} new rectangle width
   * @param height {number} new rectangle height
   */
  getBottomLeft(width: number, height: number): Rect {
    return new Rect(this.left, this.bottom - height, width, height);
  }

  /**
   * New rectangle with the same bottom-right corner as the original,
   * but with new {@link width} and {@link height}.
   * The result may be larger than the original rectangle on both axes.
   * @param width {number} new rectangle width
   * @param height {number} new rectangle height
   */
  getBottomRight(width: number, height: number): Rect {
    return new Rect(this.right - width, this.bottom - height, width, height);
  }

  //--

  /**
   * New rectangle with the same right border as the original, but with the left border clipped by {@link dw}.
   * @param dw {number} delta width
   */
  cutLeft(dw: number): Rect {
    return new Rect(this.left + dw, this.top, this.width - dw, this.height);
  }

  /**
   * New rectangle with the same bottom border as the original, but with the top border clipped by {@link dh}.
   * @param dh {number} delta height
   */
  cutTop(dh: number): Rect {
    return new Rect(this.left, this.top + dh, this.width, this.height - dh);
  }

  /**
   * New rectangle with the same top border as the original, but with the bottom border clipped by {@link dh}.
   * @param dh {number} delta height
   */
  cutBottom(dh: number): Rect {
    return new Rect(this.left, this.top, this.width, this.height - dh);
  }

  /**
   * New rectangle with the same left border as the original, but with the right border clipped by {@link dw}.
   * @param dw {number} delta width
   */
  cutRight(dw: number): Rect {
    return new Rect(this.left, this.top, this.width - dw, this.height);
  }

  // --

  /** New rectangle below the original with a height of {@link height}.
   * @param height {number} new rectangle height
   */
  below(height: number): Rect {
    return new Rect(this.left, this.bottom, this.width, height);
  }

  /** New rectangle above the original with a height of {@link height}.
   * @param height {number} new rectangle height
   */
  above(height: number): Rect {
    return new Rect(this.left, this.top - height, this.width, height);
  }

  /** New rectangle to the left of the original with a width of {@link width}.
   * @param width {number} new rectangle width
   */
  toTheLeft(width: number): Rect {
    return new Rect(this.left - width, this.top, width, this.height);
  }

  /**
   * New rectangle to the right of the original with a width of {@link width}.
   * @param width {number} new rectangle width
   */
  toTheRight(width: number): Rect {
    return new Rect(this.right, this.top, width, this.height);
  }

  /**
   * New rectangle above the original with a height of {@link height}. See {@link above}.
   * @param height {number} new rectangle height
   */
  toTheTop(height: number): Rect {
    return this.above(height);
  }

  /**
   * New rectangle below the original with a height of {@link height}. See {@link below}.
   * @param height {number} new rectangle height
   */
  toTheBottom(height: number): Rect {
    return this.below(height);
  }

  // --

  /**
   * New rectangle with the same top border as the original, but with a height
   * scaled with {@link ratio} of the original height. See also {@link getTop}.
   * @param ratio {number} height scale factor
   */
  getTopScaled(ratio: number): Rect {
    return this.getTop(this.height * ratio);
  }

  /**
   * New rectangle with the same bottom border as the original, but with a height
   * scaled with {@link ratio} of the original height. See also {@link getBottom}.
   * @param ratio {number} height scale factor
   */
  getBottomScaled(ratio: number): Rect {
    return this.getBottom(this.height * ratio);
  }

  /**
   * New rectangle with the same left border as the original, but with a width
   * scaled with {@link ratio} of original width. See also {@link getLeft}.
   * @param ratio {number} width scale factor
   */
  getLeftScaled(ratio: number): Rect {
    return this.getLeft(this.width * ratio);
  }

  /**
   * New rectangle with the same right border as the original, but with a width
   * scaled with {@link ratio} of original width. See also {@link getRight}.
   * @param ratio {number} width scale factor
   */
  getRightScaled(ratio: number): Rect {
    return this.getRight(this.width * ratio);
  }

  // --

  /**
   * Horizontal part of {@link index} of the original rectangle sliced on {@link count} parts.
   * @param count {number} count of parts to divide the rectangle vertically
   * @param index {number} index of part to return
   */
  getTopPart(count: number, index: number): Rect {
    return new Rect(
      this.left, this.top + (this.height / count) * index,
      this.width, this.height / count);
  }

  /**
   * Vertical part of {@link index} of the original rectangle slices on {@link count} parts.
   * @param count {number} count of parts to divide rectangle horizontally
   * @param index {number} index of part to return
   */
  getLeftPart(count: number, index: number): Rect {
    return new Rect(
      this.left + (this.width / count) * index, this.top,
      this.width / count, this.height);
  }

  /**
   * Returns ({@link x}, {@link y}) part of the original rectangle divided into parts by a grid.
   * @param xCount {number} dividing grid size along x-axis
   * @param yCount {number} dividing grid size along y-axis
   * @param x {number} index of part to return along x-axis
   * @param y {number} index of part to return along y-axis
   */
  getGridPart(xCount: number, yCount: number, x: number, y: number): Rect {
    return new Rect(
      this.left + (this.width / xCount) * x, this.top + (this.height / yCount) * y,
      this.width / xCount, this.height / y);
  }

  // --

  /**
   * Inflated rectangle with left and right borders of the original shifted outside by {@link dx}
   * and top and bottom borders shifted outside by {@link dy}.
   * Overall size increased by 2*{@link dx} along x-axis, and by 2*{@link dy} along y-axis.
   * @param dx {number} vertical borders shift delta along x-axis
   * @param dy {number} horizontal borders shift delta along y-axis
   */
  inflate(dx: number, dy: number): Rect {
    return new Rect(
      this.left - dx, this.top - dy,
      this.width + 2 * dx, this.height + 2 * dy);
  }

  /**
   * Inflated rectangle with right border of the original shifted outside by {@link dw}
   * and bottom border shifted outside by {@link dh}.
   * @param dw {number} delta width
   * @param dh {number} delta height
   */
  inflateSize(dw: number, dh: number): Rect {
    return new Rect(this.left, this.top, this.width + dw, this.height + dh);
  }

  /**
   * Inflated rectangle with new width scaled by {@link dxRatio} of the original
   * and height scaled by {@link dyRatio}.
   * @param dxRatio {number} width scale ratio
   * @param dyRatio {number} height scale ratio
   */
  inflateRel(dxRatio: number, dyRatio: number): Rect {
    return this.inflate(this.width * (dxRatio - 1), this.height * (dyRatio - 1));
  }

  /** Square fitted (inscribed) to the original rectangle */
  fitSquare(): Rect {
    const size = Math.min(this.width, this.height);
    return new Rect(
      this.left + (this.width - size) / 2, this.top + (this.height - size) / 2, size, size);
  }

  /** The biggest rectangle that fits within this rect that keeps the width/height aspect ratio
   * Positioned in the center. Useful for rendering images in cells. */
  fit(width: number, height: number): Rect {
    return width / height > this.width / this.height
      ? this.fromCenterSize(this.midX, this.midY, this.width, height * (this.width / width))
      : this.fromCenterSize(this.midX, this.midY, width * (this.height / height), this.height)
  }

  /** Checks if this Rect contains the point (x; y) inside */
  contains(x: number, y: number): boolean {
    return this.left <= x && x <= this.right && this.top <= y && y <= this.bottom;
  }

  /** Checks if this Rect contains the specified point */
  containsPoint(p: Point): boolean {
    return this.contains(p.x, p.y);
  }

  /** Returns a rectangle that contains both this and r. */
  union(r: Rect): Rect {
    return Rect.fromPoints(
      Math.min(this.minX, r.minX),
      Math.min(this.minY, r.minY),
      Math.max(this.maxX, r.maxX),
      Math.max(this.maxY, r.maxY));
  }
}

/** Represents a grid cell */
export class GridCell {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  /** @returns {GridCell} */
  static fromColumnRow(grid: Grid, columnName: string, gridRow: number): GridCell {
    return new GridCell(api.grok_Grid_GetCell(grid.dart, columnName, gridRow));
  }

  /** Returns a synthecic GridCell that only contains value but no row/col. Useful for rendering values. */
  static fromValue(value: any): GridCell {
    return new GridCell(api.grok_GridCell_FromValue(value));
  }

  static createColHeader(gridColumn: GridColumn): GridCell {
    return new GridCell(api.grok_GridCell_CreateColHeader(gridColumn.dart));
  }

  /** @returns {string} Cell type */
  get cellType(): string {
    return api.grok_GridCell_Get_CellType(this.dart);
  }

  /** Allows to set cell type (needed when rendering single grid cell) */
  set cellType(x: string) {
    api.grok_GridCell_Set_CellType(this.dart, x);
  }

  /** @returns {boolean} Whether this is a table (data) cell (as opposed to special cells like row headers). */
  get isTableCell(): boolean {
    return api.grok_GridCell_Get_IsTableCell(this.dart);
  }

  /** @returns {boolean} Whether this is a row header. */
  get isRowHeader(): boolean {
    return api.grok_GridCell_Get_IsRowHeader(this.dart);
  }

  /** @returns {boolean} Whether this is a column header. */
  get isColHeader(): boolean {
    return api.grok_GridCell_Get_IsColHeader(this.dart);
  }

  /** @returns {Column} Corresponding table column, or null. */
  get tableColumn(): Column | null {
    return this.gridColumn.column;
  }

  /** @returns {Row} Corresponding table row, or null. */
  get tableRow(): Row | null {
    return this.cell?.row;
  }

  /** @returns {number|null} Index of the corresponding table row. */
  get tableRowIndex(): number | null {
    return this.isTableCell || this.isRowHeader ? this.cell.rowIndex : null;
  }

  /** @returns {number} Index of the corresponding grid row. */
  get gridRow(): number {
    return api.grok_GridCell_Get_GridRow(this.dart);
  }

  /** @returns {GridColumn} Corresponding grid column. */
  get gridColumn(): GridColumn {
    return new GridColumn(api.grok_GridCell_Get_GridColumn(this.dart));
  }

  /** Custom text to be shown in a cell . */
  get customText(): string { return api.grok_GridCell_Get_CustomText(this.dart); }
  set customText(x: string) { api.grok_GridCell_Set_CustomText(this.dart, x); }

  /** @returns {Grid} this cell belongs to. */
  get grid(): Grid {
    return new Grid(api.grok_GridCell_Get_Grid(this.dart));
  }

  /** @returns {Cell} Corresponding table cell. */
  get cell(): Cell {
    return new Cell(api.grok_GridCell_Get_Cell(this.dart));
  }

  /** Returns the value of the grid cell.
   * Note that the value could differ from the corresponding table cell due to the following:
   * 1. setting gridCell.value inside onPrepareCell
   * 2. as a result of evaluating onPrepareValueScript */
  get value(): any {
    return toJs(api.grok_GridCell_Get_Value(this.dart));
  }

  /** @returns {GridCellStyle} Style to use for rendering. */
  get style(): GridCellStyle {
    return new GridCellStyle(api.grok_GridCell_Get_Style(this.dart));
  }

  /** Calculates cell background color, according to color-coding. */
  get color(): number { return api.grok_GridCell_Get_Color(this.dart); }

  /** Grid cell bounds.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/cell-bounds}
   */
  get bounds(): Rect {
    return Rect.fromDart(api.grok_GridCell_Get_Bounds(this.dart));
  }

  /** Grid cell bounds, relative to the document. Useful for showing hints, tooltips, etc.*/
  get documentBounds(): Rect {
    const r = this.bounds;
    const clientRect = this.grid.root.getBoundingClientRect();
    return new Rect(window.scrollX + clientRect.x + r.x, window.scrollY + clientRect.y + r.y, r.width, r.height);
  }

  /** Returns grid cell renderer. */
  get renderer(): GridCellRenderer {
    return api.grok_GridCell_Get_Renderer(this.dart);
  }

  render(options?: { context?: CanvasRenderingContext2D, bounds?: Rect}) {
    api.grok_GridCell_Render(this.dart, options?.context, options?.bounds?.toDart());
  }

  /** Gets or sets HTML element for this grid cell. */
  get element(): HTMLElement { return api.grok_GridCell_Get_Element(this.dart); }
  set element(e: HTMLElement) { api.grok_GridCell_Set_Element(this.dart, e); }

  /** Sets the grid cell value and fires onCellValueEdited if notify is true */
  setValue(x: any, notify: boolean = true): void { api.grok_GridCell_SetValue(this.dart, x, notify); }
}

/** Renders the content of the specified [gridCell], and provides interactivity as well. */
export class GridCellWidget {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static fromGridCell(gridCell: GridCell, canvasSize: Size = {width: 300, height: 150}): GridCellWidget {
    const gridCellWidget = toJs(api.grok_GridCellWidget());
    gridCellWidget.gridCell = gridCell;
    gridCellWidget.root.style.removeProperty('height');
    gridCellWidget.root.style.aspectRatio = `${canvasSize.width / canvasSize.height}`;
    gridCellWidget.canvas.width = canvasSize.width;
    gridCellWidget.canvas.height = canvasSize.height;
    if (_isDartium())
      gridCellWidget.root.style.height = `${canvasSize.height}px`;
    return gridCellWidget;
  }

  get canvas(): HTMLCanvasElement { return api.grok_GridCellWidget_Get_Canvas(this.dart); }

  get root(): HTMLDivElement { return api.grok_GridCellWidget_Get_Root(this.dart); }

  get gridCell(): GridCell { return new GridCell(api.grok_GridCellWidget_Get_GridCell(this.dart)); }
  set gridCell(x: GridCell) { api.grok_GridCellWidget_Set_GridCell(this.dart, x.dart); }

  get bounds(): Rect { return Rect.fromDart(api.grok_GridCellWidget_Get_Bounds(this.dart)); }

  render(): void { api.grok_GridCellWidget_Render(this.dart); }
}

export type GridColumnTooltipType = 'Default' | 'None' | 'Form' | 'Columns';

/** Represents a grid column */
export class GridColumn {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static fromDart(dart: any): GridColumn | null {
    return dart == null ? null : new GridColumn(dart);
  }

  /** A {@link Grid} this column is associated with */
  get grid(): Grid {
    return toJs(api.grok_GridColumn_Get_Grid(this.dart));
  }

  /** @returns {Column} Corresponding table column, or null. */
  get column(): Column | null {
    let col = api.grok_GridColumn_Get_Column(this.dart);
    return col === null ? null : new Column(col);
  }

  /** Index of the column. */
  get idx(): number {
    return api.grok_GridColumn_Get_Idx(this.dart);
  }

  /** @returns {string} Column name. */
  get name(): string { return api.grok_GridColumn_Get_Name(this.dart); }
  set name(x: string) { api.grok_GridColumn_Set_Name(this.dart, x); }

  /** Cell style used for rendering data cells */
  get contentCellStyle(): GridCellStyle { return api.grok_GridColumn_Get_ContentCellStyle(this.dart); }

  /** Cell style used for rendering header cells */
  get headerCellStyle(): GridCellStyle { return api.grok_GridColumn_Get_HeaderCellStyle(this.dart); }

  /** Column width in pixels.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-columns} */
  get width(): number { return api.grok_GridColumn_Get_Width(this.dart); }
  set width(x: number) { api.grok_GridColumn_Set_Width(this.dart, x); }

  /** Background column as a 4-byte ARGB number. */
  get backColor(): Color { return api.grok_GridColumn_Get_BackColor(this.dart); }
  set backColor(x: Color) { api.grok_GridColumn_Set_BackColor(this.dart, x); }

  /** Column format.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/html-markup-cells} */
  get format(): string { return api.grok_GridColumn_Get_Format(this.dart); }
  set format(x: string) { api.grok_GridColumn_Set_Format(this.dart, x); }

  /** @returns {string} Cell type. */
  get cellType(): string { return api.grok_GridColumn_Get_CellType(this.dart); }
  set cellType(x: string) { api.grok_GridColumn_Set_CellType(this.dart, x); }

  /** Grid cell renderer. */
  get renderer(): GridCellRenderer { return toJs(api.grok_GridColumn_Get_Renderer(this.dart)); }
  set renderer(x: GridCellRenderer) { api.grok_GridColumn_Set_Renderer(this.dart, toDart(x)); }

  /** Column visibility.  */
  get visible(): boolean { return api.grok_GridColumn_Get_Visible(this.dart); }
  set visible(x: boolean) { api.grok_GridColumn_Set_Visible(this.dart, x); }

  /** Custom colors for categories.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/category-colors}
   *  @returns {Object.<string, number>} */
  get categoryColors(): { [s: string]: number } { return api.grok_GridColumn_Get_CategoryColors(this.dart); }
  set categoryColors(x: { [s: string]: number }) { api.grok_GridColumn_Set_CategoryColors(this.dart, x); }

  /** Whether the column is editable.
   *  @returns {boolean} */
  get editable(): boolean { return api.grok_GridColumn_Get_Editable(this.dart); }
  set editable(x: boolean) { api.grok_GridColumn_Set_Editable(this.dart, x); }

  /** Whether the column is selected. */
  get selected(): boolean { return api.grok_GridColumn_Get_Selected(this.dart); }
  set selected(x: boolean) { api.grok_GridColumn_Set_Selected(this.dart, x); }

  /** Tooltip type, specific to this column. */
  get tooltipType(): GridColumnTooltipType { return api.grok_GridColumn_Get_TooltipType(this.dart); }
  set tooltipType(x: GridColumnTooltipType) { api.grok_GridColumn_Set_TooltipType(this.dart, x); }

  /** Tooltip form. Also requires {@link tooltipType} to be 'Form'. */
  get tooltipForm(): string { return api.grok_GridColumn_Get_TooltipForm(this.dart); }
  set tooltipForm(x: string) { api.grok_GridColumn_Set_TooltipForm(this.dart, x); }

  /** Tooltip columns. Also requires {@link tooltipType} to be 'Columns'. */
  get tooltipColumns(): string[] { return api.grok_GridColumn_Get_TooltipColumns(this.dart); }
  set tooltipColumns(x: string[]) { api.grok_GridColumn_Set_TooltipColumns(this.dart, x); }

  /** isTextColorCoded. Whether to apply color to the text or background. */
  get isTextColorCoded(): boolean { return api.grok_GridColumn_Get_isTextColorCoded(this.dart); }
  set isTextColorCoded(x: boolean) { api.grok_GridColumn_Set_isTextColorCoded(this.dart, x); }

  /** A script that returns cell value, using the "gridCell" parameter.
   * See example: ApiSamples/grid/advanced/dynamic-value-retrieval.js */
  get onPrepareValueScript(): string { return api.grok_GridColumn_Get_OnPrepareValueScript(this.dart); }
  set onPrepareValueScript(x: string) { api.grok_GridColumn_Set_OnPrepareValueScript(this.dart, x); }

  /** Left border (in pixels in the virtual viewport) */
  get left(): number { return api.grok_GridColumn_Get_Left(this.dart); }

  /** Right border (in pixels in the virtual viewport) */
  get right(): number { return api.grok_GridColumn_Get_Right(this.dart); }

  /** Returns all visible cells */
  getVisibleCells(): Iterable<GridCell> { return this.grid.getVisibleCells(this); }

  /** Grid column settings. */
  get settings(): any | null { return api.grok_GridColumn_Get_Settings(this.dart); }
  set settings(s: any | null) { api.grok_GridColumn_Set_Settings(this.dart, s); }

  /** Use this field to keep arbitrary auxiliary data. It is serialized as JSON, so be careful. See also {@link temp}. */
  get tags(): {[indexer: string]: any} { return api.grok_GridColumn_Get_Tags(this.dart); }

  /** Use this field to keep auxiliary data. It is not serialized. See also {@link tags}. */
  get temp(): {[indexer: string]: any} { return api.grok_GridColumn_Get_Temp(this.dart); }

  /** Returns null if column is editable, or the reason of not being editable, otherwise */
  checkEditable(): string { return api.grok_GridColumn_CheckEditable(this.dart); }

  /** Moves the specified column to the specified position */
  move(position: number) { api.grok_GridColumnList_Move(this.grid.columns.dart, this.dart, position); }

  /** Number of pixels required to render the longest element in the column. */
  getDataWidth(): number { return api.grok_GridColumn_GetDataWidth(this.dart); }

  /** If this column is not entirely visible, scrolls the grid horizontally to show it. */
  scrollIntoView(): void { api.grok_GridColumn_ScrollIntoView(this.dart); }
}

/** Represents grid columns. */
export class GridColumnList {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  /** Row header column.
   *  @returns {GridColumn}  */
  get rowHeader(): GridColumn | null {
    return this.byIndex(0);
  }

  /** Returns a grid column by index, or null if it does not exist.
   *  @param {number} index
   *  @returns {GridColumn}  */
  byIndex(index: number): GridColumn | null {
    return GridColumn.fromDart(api.grok_GridColumnList_ByIndex(this.dart, index));
  }

  /** Returns a grid column by name, or null if it does not exist.
   *  @param {string} columnName
   *  @returns {GridColumn}  */
  byName(columnName: string): GridColumn | null {
    return GridColumn.fromDart(api.grok_GridColumnList_ByName(this.dart, columnName));
  }

  /** Sets column order.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-columns}
   *  @param {string[]} columnNames - Order of columns. */
  setOrder(columnNames: string[]): void {
    api.grok_GridColumnList_SetOrder(this.dart, columnNames);
  }

  /** Shows the specified columns (and hides the rest).
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/hide-columns}
   *  @param {string[]} columnNames - Names of the columns to show. */
  setVisible(columnNames: string[]): void {
    api.grok_GridColumnList_SetVisible(this.dart, columnNames);
  }

  /** GridColumnList length.
   *  @returns {number}  */
  get length(): number {
    return api.grok_GridColumnList_Get_Length(this.dart);
  }

  /** Adds a new column to the grid (but not to the underlying dataframe). */
  add(options: {gridColumnName?: string, cellType: string, index?: number}): GridColumn {
    return api.grok_GridColumnList_Add(this.dart, options.cellType, options.gridColumnName);
  }

  /** Removes a grid column at the specified position. */
  removeAt(index: number) { api.grok_GridColumnList_RemoveAt(this.dart, index); }

  /** Removes all columns. */
  clear() { api.grok_GridColumnList_Clear(this.dart); }
}

/** DataFrame-bound viewer that contains {@link Form} */
export class FormViewer extends Viewer<IFormSettings> {
  constructor(dart: any) {
    super(dart);
  }

  /** Creates a new default form for the specified columns. */
  static createDefault(df: DataFrame, options?: {columns?: string[]}): FormViewer {
    return new FormViewer(api.grok_FormViewer_CreateDefault(df.dart, options?.columns));
  }

  get form(): Form { return api.grok_FormViewer_Get_Form(this.dart); }

  get editable(): boolean { return api.grok_FormViewer_Get_Editable(this.dart); }
  set editable(x: boolean) { api.grok_FormViewer_Set_Editable(this.dart, x); }

  get designMode(): boolean { return api.grok_FormViewer_Get_DesignMode(this.dart); }
  set designMode(x: boolean) { api.grok_FormViewer_Set_DesignMode(this.dart, x); }
}


/** Represents a form that can be user-designed or edited. */
export class Form {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  /** Creates a new grid. */
  static forDataFrame(df: DataFrame, options?: {columns?: string[]}): Form {
    return api.grok_Form_ForDataFrame(df.dart, options?.columns);
  }

  /** When in editable mode, users can edit field values. */
  get editable(): boolean { return api.grok_Form_Get_Editable(this.dart); }
  set editable(x: boolean) { api.grok_Form_Set_Editable(this.dart, x); }

  /** When in design mode, users can move form controls. */
  get designMode(): boolean { return api.grok_Form_Get_DesignMode(this.dart); }
  set designMode(x: boolean) { api.grok_Form_Set_DesignMode(this.dart, x); }

  /** Data frame row bound to the form. */
  get row(): Row { return new Row(api.grok_Form_Get_DataFrame(this.dart), api.grok_Form_Get_RowIdx(this.dart)); }
  set row(row: Row) { api.grok_Form_Set_Row(this.dart, row.toDart()); }

  /** Serialized form content. Use it for persistence purposes. */
  get state() { return api.grok_Form_Get_State(this.dart); }
  set state(s: string) { api.grok_Form_Set_State(this.dart, s); }
}


/** High-performance, flexible spreadsheet control */
export class Grid extends Viewer<IGridSettings> {

  constructor(dart: any) {
    super(dart);
  }

  /** Creates a new grid. */
  static create(table: { dart: any; }): Grid {
    return new Grid(api.grok_Grid_Create(table.dart));
  }

  /** Creates a new grid from a list of items (rows) and their properties (columns) */
  static fromProperties(items: any[], props: Property[]): Grid {
    const t = DataFrame.create(items.length);
    for (let p of props)
      t.columns.addNewVirtual(p.name,
        (i: number) => p.get(items[i]), p.propertyType,
        p.set == null ? null : ((i: number, x: any) => p.set(items[i], x)));
    return Grid.create(t);
  }

  /** Grid columns.
   *  @returns {GridColumnList} */
  get columns(): GridColumnList {
    return new GridColumnList(api.grok_Grid_Get_Columns(this.dart));
  }

  /** Returns a column with the specified name.
   * @param {string} name
   * @returns {GridColumn} */
  col(name: string): GridColumn | null {
    return this.columns.byName(name);
  }

  /** Returns a grid cell at the specified position. */
  cell(columnName: string, gridRow: number): GridCell {
    return GridCell.fromColumnRow(this, columnName, gridRow);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-rendering-indexes}
   * @returns {Observable<GridCellRenderArgs>} */
  get onCellRender(): Observable<GridCellRenderArgs> {
    return __obs('d4-grid-cell-render', this.dart);
  }

  /** @returns {HTMLCanvasElement} */
  get canvas(): HTMLCanvasElement {
    return api.grok_Grid_Get_Canvas(this.dart);
  }

  /** @returns {HTMLCanvasElement} */
  get overlay(): HTMLCanvasElement {
    return api.grok_Grid_Get_Overlay(this.dart);
  }

  /** List of columns the grid is sorted by. */
  get sortByColumns(): Column[] { return toJs(api.grok_Grid_Get_SortByColumns(this.dart)); }

  /** Sort directions for [sortByColumns]: true = ascending order, false = descending order. */
  get sortTypes(): boolean[] { return api.grok_Grid_Get_SortTypes(this.dart); }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-prepare}
   */
  onCellPrepare(callback: (cell: GridCell) => any): StreamSubscription {
    return _sub(api.grok_Grid_OnCellPrepare(this.dart, (dcell: any) => {
      return callback(new GridCell(dcell));
    }));
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/custom-cell-tooltip}
   */
  onCellTooltip(callback: (cell: GridCell, x: number, y: number) => any): StreamSubscription {
    return _sub(api.grok_Grid_OnCellTooltip(this.dart, (dcell: any, x: any, y: any) => {
      return callback(new GridCell(dcell), x, y);
    }));
  }

  /** Returns a grid cell at the specified position, or null if there is none.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/hit-test} */
  hitTest(x: number, y: number): GridCell | null {
    return toJs(api.grok_Grid_HitTest(this.dart, x, y));
  }

  /** Sorts rows by the specified [columnIds].
   *  Specify sort directions via [asc] array (true = ascending, false = descending)
   *  If [asc] is not specified, sorts in ascending order. */
  sort(columns: string[] | Column[], orders: boolean[] | null = null): Grid {
    api.grok_Grid_Sort(this.dart, (columns as any[]).map((c: string | Column) => c instanceof Column ? c.dart : c), orders);
    return this;
  }

  /** Sorts the rows, using the specified comparer that accepts indexes.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-rows-by-comparer}
   * Also, @see setRowOrder */
  sortIndexes(indexComparer: (a: number, b: number) => number): Grid {
    let indexes = _identityInt32(this.table.rowCount);
    indexes.sort(indexComparer);
    this.setRowOrder(<number[]><unknown>indexes);
    return this;
  }

  /** Returns the order of rows in the table. */
  getRowOrder(): Int32Array {
    return api.grok_Grid_GetRowOrder(this.dart);
  }

  /** Sets the order or rows in the table.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/order-rows}
   * Also, @see sortIndexes */
  setRowOrder(indexes: number[]): Grid {
    api.grok_Grid_SetRowOrder(this.dart, indexes);
    return this;
  }

  /** Pinned rows.
   *  @returns {Iterable<number>} */
  get pinnedRows(): Iterable<number> {
    return _toIterable(api.grok_Grid_Get_PinnedRows(this.dart));
  }

  /** Returns a grid cell at the specified position.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-to-cell}
   */
  scrollToCell(column: string | Column, row: number): void {
    api.grok_Grid_ScrollToCell(this.dart, toDart(column), row);
  }

  /** Scrolls the grid to the specified position.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-to-pixels}
   */
  scrollToPixels(x: number, y: number): void {
    api.grok_Grid_ScrollToPixels(this.dart, x, y);
  }

  /** Causes the grid to repaint.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/advanced/invalidate}
   **/
  invalidate(): void { api.grok_Grid_Invalidate(this.dart); }

  /** Vertical scroll bar.
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/scroll-bars}
   */
  get vertScroll(): RangeSlider {
    return toJs(api.grok_Grid_Get_VertScroll(this.dart));
  }

  /** Converts table row index to grid index. See also {@link gridRowToTable} */
  tableRowToGrid(tableRow: number): number { return api.grok_Grid_TableRowToGrid(this.dart, tableRow); }

  /** Converts grid row index to table index. See also {@link tableRowToGrid} */
  gridRowToTable(gridRow: number): number { return api.grok_Grid_GridRowToTable(this.dart, gridRow); }

  /** Horizontal scroll bar */
  get horzScroll(): RangeSlider {
    return toJs(api.grok_Grid_Get_HorzScroll(this.dart));
  }

  /** Column labels height */
  get colHeaderHeight(): number {
    return toJs(api.grok_Grid_Get_ColHeaderHeight(this.dart));
  }

  /** Resets rows height */
  resetRowHeight(): void { api.grok_Grid_ResetRowHeight(this.dart); }

  /** Column labels box */
  get colHeaderBox(): Rect {
    return toJs(api.grok_Grid_Get_ColHeaderRect(this.dart));
  }

  /** Forces the grid to execute calculations that were postponed before the next rendering (such as recalculating layout).
   * Call it in case the client code changes column widths and needs to access the new recalculated layout. */
  runPostponedComputations(): void {
    api.grok_CanvasViewer_RunPostponedComputations(this.dart);
  }

  /**
   * Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-events}
   */
  get onColumnResized(): Observable<any> {
    return __obs('d4-grid-column-resized', this.dart);
  }

  /** Sample: {@link https://public.datagrok.ai/js/samples/grid/resize-events} */
  get onRowsResized(): Observable<any> { return __obs('d4-grid-rows-resized', this.dart); }

  /** Sample: {@link https://public.datagrok.ai/js/samples/grid/order-rows} */
  get onRowsSorted(): Observable<any> { return __obs('d4-grid-rows-sorted', this.dart); }
  get onPinnedRowsChanged(): Observable<any> { return __obs('d4-grid-pinned_rows-changed', this.dart); }

  get onCellValueEdited(): Observable<GridCell> { return __obs('d4-grid-cell-value-edited', this.dart); }
  get onCurrentCellChanged(): Observable<GridCell> { return __obs('d4-grid-current-cell-changed', this.dart); }
  get onCellMouseEnter(): Observable<GridCell> { return __obs('d4-grid-cell-mouse-enter', this.dart); }
  get onCellMouseLeave(): Observable<GridCell> { return __obs('d4-grid-cell-mouse-leave', this.dart); }

  get onCellClick(): Observable<GridCell> { return __obs('d4-grid-cell-click', this.dart); }
  get onCellDoubleClick(): Observable<GridCell> { return __obs('d4-grid-cell-double-click', this.dart); }
  get onCellMouseDown(): Observable<GridCell> { return __obs('d4-grid-cell-mouse-down', this.dart); }
  get onCellKeyDown(): Observable<GridCell> { return __obs('d4-grid-cell-key-down', this.dart); }
  get onRowEnter(): Observable<GridCell> { return __obs('d4-grid-row-enter', this.dart); }

  get onBeforeDrawOverlay(): Observable<EventData> { return __obs('d4-grid-before-draw-overlay', this.dart); }
  get onAfterDrawOverlay(): Observable<EventData> { return __obs('d4-grid-after-draw-overlay', this.dart); }
  get onBeforeDrawContent(): Observable<EventData> { return __obs('d4-grid-before-draw-content', this.dart); }
  get onAfterDrawContent(): Observable<EventData> { return __obs('d4-grid-after-draw-content', this.dart); }

  get onGridCellLinkClicked(): Observable<EventData<GridCellArgs>> {return __obs('d4-grid-cell-link-clicked-local', this.dart); }

  /** Returns currently visible cells */
  getVisibleCells(column: GridColumn | null = null): Iterable<GridCell> {
    return _toIterable(api.grok_Grid_GetVisibleCells(this.dart, column?.dart))
  }

  /** Resizes the grid to fit the content */
  autoSize(maxWidth: number, maxHeight: number, minWidth?: number, minHeight?: number, autoSizeOnDataChange?: boolean): void {
    api.grok_Grid_AutoSize(this.dart, maxWidth, maxHeight, minWidth, minHeight, autoSizeOnDataChange);
  }

  /** Renders the content of this grid to the specified canvas and bounds. */
  render(g: CanvasRenderingContext2D, bounds: Rect) {
    api.grok_Grid_Render(this.dart, g, bounds.toDart());
  }
}


export type HorzAlign = 'right' | 'center' | 'left';
export type VertAlign = 'top' | 'center' | 'bottom';


/** Represents grid cell style. */
export class GridCellStyle {
  dart: any;

  constructor(dart: any) {
    this.dart = dart;
  }

  static create(): GridCellStyle {
    return new GridCellStyle(api.grok_GridCellStyle_Create());
  }

  /** Font. Example: 12px Verdana */
  get font(): string { return api.grok_GridCellStyle_Get_Font(this.dart); }
  set font(x: string) { api.grok_GridCellStyle_Set_Font(this.dart, x); }

  get horzAlign(): HorzAlign | null { return api.grok_GridCellStyle_Get_HorzAlign(this.dart); }
  set horzAlign(x: HorzAlign | null) { api.grok_GridCellStyle_Set_HorzAlign(this.dart, x); }

  get marker(): string { return api.grok_GridCellStyle_Get_Marker(this.dart) ?? ''; }
  set marker(x: string) { api.grok_GridCellStyle_Set_Marker(this.dart, x); }

  get marginLeft(): number { return api.grok_GridCellStyle_Get_MarginLeft(this.dart) ?? ''; }
  set marginLeft(x: number) { api.grok_GridCellStyle_Set_MarginLeft(this.dart, x); }

  /** Text color (RGBA-encoded) */
  get textColor(): number { return api.grok_GridCellStyle_Get_TextColor(this.dart); }
  set textColor(x: number) { api.grok_GridCellStyle_Set_TextColor(this.dart, x); }
  get textColorHtml(): string { return Color.toHtml(this.textColor); }

  /** Background color (RGBA-encoded) */
  get backColor(): number { return api.grok_GridCellStyle_Get_BackColor(this.dart); }
  set backColor(x: number) { api.grok_GridCellStyle_Set_BackColor(this.dart, x); }
  get backColorHtml(): string { return Color.toHtml(this.backColor); }

  /** DOM Element to put in the cell */
  get element(): HTMLElement { return api.grok_GridCellStyle_Get_Element(this.dart); }
  set element(x: HTMLElement) { api.grok_GridCellStyle_Set_Element(this.dart, x); }

  /** Vertical text orientation */
  get textVertical(): boolean { return api.grok_GridCellStyle_Get_TextVertical(this.dart); }
  set textVertical(x: boolean) { api.grok_GridCellStyle_Set_TextVertical(this.dart, x); }
}


/** Grid cell rendering args. */
export class GridCellRenderArgs extends EventData {

  constructor(dart: any) {
    super(dart);
  }

  /** @returns {CanvasRenderingContext2D} */
  get g(): CanvasRenderingContext2D {
    return api.grok_GridCellRenderArgs_Get_G(this.dart);
  }

  /** Cell that is being rendered. */
  get cell(): GridCell {
    return new GridCell(api.grok_GridCellRenderArgs_Get_Cell(this.dart));
  }

  /** Cell bounds to render to. */
  get bounds(): Rect {
    return api.grok_GridCellRenderArgs_Get_Bounds(this.dart);
  }
}


export class CanvasRenderer {
  get defaultWidth(): number | null {
    return null;
  }

  get defaultHeight(): number | null {
    return null;
  }

  getDefaultSize(gridColumn: GridColumn): {width?: number | null, height?: number | null} {
    return { width: this.defaultWidth, height: this.defaultHeight};
  }

  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, value: any, context: any): void {
    throw 'Not implemented';
  }
}


export class GridCellRenderer extends CanvasRenderer {
  clip: boolean = true;

  get name(): string {
    throw '"name" property not implemented';
  }

  get cellType(): string {
    throw '"cellType" property not implemented';
  }

  renderSettings(gridColumn: GridColumn): Element | null { return null; }

  renderInternal(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: GridCell, cellStyle: GridCellStyle): void {
    try {
      if (this.clip) {
        g.save()
        g.rect(x, y, w, h);
        g.clip();
      }
      this.render(g, x, y, w, h, new GridCell(gridCell), new GridCellStyle(cellStyle));
    }
    finally {
      if (this.clip)
        g.restore();
    }
  }

  static register(renderer: any): void {
    api.grok_GridCellRenderer_Register(renderer);
  }

  static byName(rendererName: string): GridCellRenderer | null {
    return api.grok_GridCellRenderer_ByName(rendererName);
  }

  hasContextValue(gridCell: GridCell): boolean { return false; }
  async getContextValue (gridCell: GridCell): Promise<any> { return null; }

  onKeyDown(gridCell: GridCell, e: KeyboardEvent): void {}
  onKeyPress(gridCell: GridCell, e: KeyboardEvent): void {}

  onMouseEnter(gridCell: GridCell, e: MouseEvent): void {}
  onMouseLeave(gridCell: GridCell, e: MouseEvent): void {}
  onMouseDown(gridCell: GridCell, e: MouseEvent): void {}
  onMouseUp(gridCell: GridCell, e: MouseEvent): void {}
  onMouseMove(gridCell: GridCell, e: MouseEvent): void {}
  onClick(gridCell: GridCell, e: MouseEvent): void {}
  onDoubleClick(gridCell: GridCell, e: MouseEvent): void {}
}


/** Proxy class for the Dart-based grid cell renderers. */
export class GridCellRendererProxy extends GridCellRenderer {
  dart: any;

  constructor(dart: any) {
    super();
    this.dart = dart;
  }

  get name(): string { return api.grok_GridCellRenderer_Get_CellType(this.dart); }
  get cellType(): string { return api.grok_GridCellRenderer_Get_CellType(this.dart); }

  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, value: any, context: any): void {
    this.renderInternal(g, x, y, w, h, value, context);
  }

  renderInternal(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: GridCell, cellStyle: GridCellStyle): void {
    api.grok_GridCellRenderer_Render(this.dart, g, x, y, w, h, gridCell.dart);
  }
}


export class SemanticValue<T = any> {
  private readonly dart: any;
  public tags: {[key: string]: any};

  constructor(dart: any) {
    this.dart = dart;
    this.tags = new MapProxy(api.grok_SemanticValue_Get_Tags(this.dart), 'tags');
  }

  static fromValueType(value: any, semType: SemType | null, units?: string) {
    const v = new SemanticValue(api.grok_SemanticValue(value, semType));
    if (units)
      v.units = units;
    return v;
  }

  static fromTableCell(cell: Cell) {
    return new SemanticValue(api.grok_SemanticValue_FromTableCell(cell.dart));
  }

  static fromGridCell(gridCell: GridCell) {
    return new SemanticValue(api.grok_SemanticValue_FromGridCell(gridCell.dart));
  }

  static parse(s: string): SemanticValue { return api.grok_SemanticValue_Parse(s); }

  static registerRegExpDetector(semType: string, regexp: string, description?: string) {
    api.grok_SemanticValue_Register_RegExp_Detector(semType, regexp, description);
  }

  get value(): T { return api.grok_SemanticValue_Get_Value(this.dart); }
  set value(x: T) { api.grok_SemanticValue_Set_Value(this.dart, x); }

  get units(): any { return api.grok_SemanticValue_Get_Units(this.dart); }
  set units(x: any) { api.grok_SemanticValue_Set_Units(this.dart, x); }

  get dataType(): string { return api.grok_SemanticValue_Get_DataType(this.dart); }

  get semType(): string { return api.grok_SemanticValue_Get_SemType(this.dart); }
  set semType(x: string) { api.grok_SemanticValue_Set_SemType(this.dart, x); }

  getMeta(name: string): any { return api.grok_SemanticValue_Get_Meta(this.dart, name); }
  setMeta(name: string, value: any): void { api.grok_SemanticValue_Set_Meta(this.dart, name, toDart(value)); }

  get cell(): Cell { return api.grok_SemanticValue_Get_Cell(this.dart); }
  set cell(x: Cell) { api.grok_SemanticValue_Set_Cell(this.dart, toDart(x)); }

  get gridCell(): GridCell { return api.grok_SemanticValue_Get_GridCell(this.dart); }
  set gridCell(x: GridCell) { api.grok_SemanticValue_Set_GridCell(this.dart, toDart(x)); }

  get viewer(): Viewer { return api.grok_SemanticValue_Get_Viewer(this.dart); }
  set viewer(x: Viewer) { api.grok_SemanticValue_Set_Viewer(this.dart, toDart(x)); }
}


/** Proxy class for the Dart-based column grid. */
export class ColumnGrid extends Widget {
  constructor(public readonly dart: any) {
    super(api.grok_Widget_Get_Root(dart));
  }

  /** Creates a new grid. */
  static create(options?: {
    filter: (c: Column) => boolean;
    isColGrayedOut: (input: any) => any;
    gridOptions: { [key: string]: any };
    showMenuIcon: boolean;
  }): ColumnGrid {
    return new ColumnGrid(api.grok_ColumnGrid_Create(options?.filter, options?.isColGrayedOut, options?.gridOptions, options?.showMenuIcon));
  }

  /** Creates a new column manager grid. */
  static columnManager(dfSource?: DataFrame, filter?: (c: Column) => boolean, gridOptions?: { [key: string]: any }): ColumnGrid {
    return new ColumnGrid(api.grok_ColumnGrid_Create_ColumnManager(dfSource?.dart, filter, gridOptions));
  }

  /** Creates a new column reorder manager grid. */
  static columnReorderManagerDialog(df: DataFrame, title: string, options?: {
    dfSource?: Grid;
    filter?: (c: Column) => boolean;
    order?: Column[];
    checks?: (colName: string) => boolean;
    addAdditionalChecks?: (colName: string) => boolean;
    additionalChecksName?: string;
    applyOrder?: (cg: ColumnGrid) => void;
    applyVisibility?: (cg: ColumnGrid) => void;
    gridOptions?: { [key: string]: any };
    addServiceColumns: boolean;
  }) : ColumnGrid {
    return new ColumnGrid(api.grok_ColumnGrid_Create_ColumnReorderManagerDialog(df.dart, title,
      toJs(options?.dfSource), options?.filter, options?.order?.map(c => c.dart), options?.checks, options?.addAdditionalChecks,
      options?.additionalChecksName ?? null, options?.applyOrder ? (cg: any) => options?.applyOrder?.(toJs(cg)) : null,
      options?.applyVisibility ? (cg: any) => options?.applyVisibility?.(toJs(cg)) : null,
      options?.gridOptions, options?.addServiceColumns));
  }
  
  /** Creates a new popup grid. */
  static popup(dfSource: DataFrame, options?: {
    filter?: (c: Column) => boolean;
    addEmpty?: boolean;
    widgetMode?: boolean;
    grayedOutColsMode?: boolean;
    serviceColsTagName?: string;
  }): ColumnGrid {
    return new ColumnGrid(api.grok_ColumnGrid_Create_Popup(dfSource.dart, options?.filter, options?.addEmpty ?? false,
      options?.widgetMode ?? false, options?.grayedOutColsMode ?? false, options?.serviceColsTagName ?? null));
    }

  /** Creates a new column selector grid. */
  static columnSelector(dfSource: DataFrame, options?: {
    checkAll?: boolean;
    filter?: (c: Column) => boolean;
    isChecked?: (c: Column) => boolean;
  }): ColumnGrid {
    return new ColumnGrid(api.grok_ColumnGrid_Create_ColumnSelector(dfSource.dart, options?.checkAll ?? false, options?.filter, options?.isChecked));  
  }
  
  get dfColumns(): DataFrame { return toJs(api.grok_ColumnGrid_Get_DfColumns(this.dart)); }
  get dfSource(): DataFrame { return toJs(api.grok_ColumnGrid_Get_DfSource(this.dart)); }
  get gridSource(): Grid { return toJs(api.grok_ColumnGrid_Get_GridSource(this.dart)); }
  get grid(): Grid { return toJs(api.grok_ColumnGrid_Get_Grid(this.dart)); }
  get nameCol(): Column { return toJs(api.grok_ColumnGrid_Get_NameCol(this.dart)); }
  get typeNameCol(): Column { return toJs(api.grok_ColumnGrid_Get_TypeNameCol(this.dart)); }

  get filter(): (c: Column) => boolean { return api.grok_ColumnGrid_Get_Filter(this.dart); }
  set filter(f: (c: Column) => boolean) { api.grok_ColumnGrid_Set_Filter(this.dart, f); }
  
  addCheckedSelect(): void { api.grok_ColumnGrid_AddCheckedSelect(this.dart); }
  filterColumns(): void { api.grok_ColumnGrid_FilterColumns(this.dart); }
  shouldShowColumnTooltip(col: Column): boolean { return api.grok_ColumnGrid_ShouldShowColumnTooltip(this.dart, col.dart); }
  passesFilter(col: Column, columnName?: string): boolean { return api.grok_ColumnGrid_PassesFilter(this.dart, col.dart, columnName ?? null); }
  refreshStats(): void { api.grok_ColumnGrid_RefreshStats(this.dart); }

  get showSearch(): boolean { return api.grok_ColumnGrid_Get_ShowSearch(this.dart); }
  set showSearch(x: boolean) { api.grok_ColumnGrid_Set_ShowSearch(this.dart, x); }

  close(): void { api.grok_ColumnGrid_Close(this.dart); }
  detach(): void { api.grok_ColumnGrid_Detach(this.dart); }
  addColumnSelectionControls(): void { api.grok_ColumnGrid_AddColumnSelectionControls(this.dart); }

  initGrayedOutColumnStyle(): void { api.grok_ColumnGrid_InitGrayedOutColumnStyle(this.dart); }
  initTypeColoring(): void { api.grok_ColumnGrid_InitTypeColoring(this.dart); }
  initColumnTooltips(): void { api.grok_ColumnGrid_InitColumnTooltips(this.dart); }
  initColumnDragDrop(): void { api.grok_ColumnGrid_InitColumnDragDrop(this.dart); }
  init(dfSource: DataFrame, gridSource?: Grid, filter?: (c: Column) => boolean,
  syncSelections?: boolean, order?: Column[], addServiceColumns?: boolean): void {
    api.grok_ColumnGrid_Init(this.dart, dfSource.dart, gridSource?.dart, filter,
      syncSelections ?? true, order?.map((c) => c.dart), addServiceColumns ?? false);
  }
  initColumnSelector(dfSource: DataFrame, checkAll?: boolean, filter?: (c: Column) => boolean): void {
    api.grok_ColumnGrid_InitColumnSelector(this.dart, dfSource.dart ?? false, checkAll, filter);
  }
  initContextMenu(): void { api.grok_ColumnGrid_InitContextMenu(this.dart); }
  initColumnManager(dfSource: DataFrame, filter?: (c: Column) => boolean) : void {
    api.grok_ColumnGrid_InitColumnManager(this.dart, dfSource.dart, filter);
  }

  getRow(col: Column): number { return api.grok_ColumnGrid_GetRow(this.dart, col.dart); }
  getCol(row: number): Column { return toJs(api.grok_ColumnGrid_GetCol(this.dart, row)); }
  get currentColumn(): Column { return toJs(api.grok_ColumnGrid_Get_CurrentColumn(this.dart)); }
  get mouseOverColumn(): Column { return toJs(api.grok_ColumnGrid_Get_MouseOverColumn(this.dart)); }

  addChecks(isChecked: (colName: string) => boolean, addAdditionalChecks: (colName: string) => boolean, additionalChecksName: string): void {
    api.grok_ColumnGrid_AddChecks(this.dart, isChecked, addAdditionalChecks, additionalChecksName);
  }
  checkAll(isChecked?: boolean): void { api.grok_ColumnGrid_CheckAll(this.dart, isChecked ?? false); }

  getCheckedIndexes(): number[] { return api.grok_ColumnGrid_GetCheckedIndexes(this.dart); }
  getCheckedColumns(): Column[] { return api.grok_ColumnGrid_GetCheckedColumns(this.dart).map(toJs); }
  getCheckedColumnNames(): string[] { return api.grok_ColumnGrid_GetCheckedColumnNames(this.dart); }

  getAdditionalCheckedIndexes(): number[] { return api.grok_ColumnGrid_GetAdditionalCheckedIndexes(this.dart); }
  getAdditionalCheckedColumns(): Column[] { return api.grok_ColumnGrid_GetAdditionalCheckedColumns(this.dart).map(toJs); }
  getAdditionalCheckedColumnNames(): string[] { return api.grok_ColumnGrid_GetAdditionalCheckedColumnNames(this.dart); }

  getSelectedColumns(): Column[] { return api.grok_ColumnGrid_GetSelectedColumns(this.dart).map(toJs); }
  setSelectedColumns(columnIds: any[]): void { api.grok_ColumnGrid_SetSelectedColumns(this.dart, columnIds); }

  indexes(rows: string): number[] { return api.grok_ColumnGrid_Indexes(this.dart, rows); }
  addColumnStats(aggType: string): Column { return toJs(api.grok_ColumnGrid_AddColumnStats(this.dart, aggType)); }
  addColumnProperty(p: Property): Column { return toJs(api.grok_ColumnGrid_AddColumnProperty(this.dart, p.dart)); }
  columnsToDataFrame(columnsOrder?: Column[], addServiceColumns?: boolean, serviceColsTagName?: string): void {
    api.grok_ColumnGrid_ColumnsToDataFrame(this.dart, columnsOrder?.map(c => c.dart), addServiceColumns ?? false, serviceColsTagName ?? null);
  }
}
