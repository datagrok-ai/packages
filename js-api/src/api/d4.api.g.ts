/// this file was generated automatically from d4 classes declarations
import { toDart } from "../wrappers";
let api = <any>window;

export class InputType {
  static Int = 'Int';

  static BigInt = 'BigInt';

  static Float = 'Float';

  static QNum = 'QNum';

  static Slider = 'Slider';

  static Bool = 'Bool';

  static Switch = 'Switch';

  static TextArea = 'TextArea';

  static Text = 'Text';

  static Date = 'Date';

  static Map = 'Map';

  static File = 'File';

  static List = 'List';

  static Color = 'Color';

  static Column = 'Column';

  static Columns = 'Columns';

  static ColumnsMap = 'ColumnsMap';

  static Radio = 'Radio';

  static Choice = 'Choice';

  static MultiChoice = 'MultiChoice';

  static Table = 'Table';

  static Molecule = 'Molecule';

  static UserGroupSelector = 'UserGroupSelector';

  static Dynamic = 'Dynamic';

  static JsInputProxy = 'JsInputProxy';

}
export class GridCellStyleEx {
  public dart: any;
  constructor(dart: any) {
    this.dart = dart;
  }
  static create(): GridCellStyleEx {
    return new GridCellStyleEx(api.grok_GridCellStyleEx_Create());
  }
  get font(): string { return api.grok_GridCellStyle_Get_font(this.dart); };
  set font(x: string) {api.grok_GridCellStyle_Set_font(this.dart, toDart(x)); }
  get horzAlign(): string { return api.grok_GridCellStyle_Get_horzAlign(this.dart); };
  set horzAlign(x: string) {api.grok_GridCellStyle_Set_horzAlign(this.dart, toDart(x)); }
  get vertAlign(): string { return api.grok_GridCellStyle_Get_vertAlign(this.dart); };
  set vertAlign(x: string) {api.grok_GridCellStyle_Set_vertAlign(this.dart, toDart(x)); }
  get tooltip(): string { return api.grok_GridCellStyle_Get_tooltip(this.dart); };
  set tooltip(x: string) {api.grok_GridCellStyle_Set_tooltip(this.dart, toDart(x)); }
  get cursor(): string { return api.grok_GridCellStyle_Get_cursor(this.dart); };
  set cursor(x: string) {api.grok_GridCellStyle_Set_cursor(this.dart, toDart(x)); }
  get textWrap(): string { return api.grok_GridCellStyle_Get_textWrap(this.dart); };
  set textWrap(x: string) {api.grok_GridCellStyle_Set_textWrap(this.dart, toDart(x)); }
  /// Marker to be shown when the value does not fit in the cell
  get marker(): string { return api.grok_GridCellStyle_Get_marker(this.dart); };
  set marker(x: string) {api.grok_GridCellStyle_Set_marker(this.dart, toDart(x)); }
  get textColor(): number { return api.grok_GridCellStyle_Get_textColor(this.dart); };
  set textColor(x: number) {api.grok_GridCellStyle_Set_textColor(this.dart, toDart(x)); }
  get backColor(): number { return api.grok_GridCellStyle_Get_backColor(this.dart); };
  set backColor(x: number) {api.grok_GridCellStyle_Set_backColor(this.dart, toDart(x)); }
  get marginLeft(): number { return api.grok_GridCellStyle_Get_marginLeft(this.dart); };
  set marginLeft(x: number) {api.grok_GridCellStyle_Set_marginLeft(this.dart, toDart(x)); }
  get marginRight(): number { return api.grok_GridCellStyle_Get_marginRight(this.dart); };
  set marginRight(x: number) {api.grok_GridCellStyle_Set_marginRight(this.dart, toDart(x)); }
  get marginTop(): number { return api.grok_GridCellStyle_Get_marginTop(this.dart); };
  set marginTop(x: number) {api.grok_GridCellStyle_Set_marginTop(this.dart, toDart(x)); }
  get marginBottom(): number { return api.grok_GridCellStyle_Get_marginBottom(this.dart); };
  set marginBottom(x: number) {api.grok_GridCellStyle_Set_marginBottom(this.dart, toDart(x)); }
  get textVertical(): boolean { return api.grok_GridCellStyle_Get_textVertical(this.dart); };
  set textVertical(x: boolean) {api.grok_GridCellStyle_Set_textVertical(this.dart, toDart(x)); }
  get imageScale(): number { return api.grok_GridCellStyle_Get_imageScale(this.dart); };
  set imageScale(x: number) {api.grok_GridCellStyle_Set_imageScale(this.dart, toDart(x)); }
  get opacity(): number { return api.grok_GridCellStyle_Get_opacity(this.dart); };
  set opacity(x: number) {api.grok_GridCellStyle_Set_opacity(this.dart, toDart(x)); }
  /// For 'html' cell types only
  get element(): any { return api.grok_GridCellStyle_Get_element(this.dart); };
  set element(x: any) {api.grok_GridCellStyle_Set_element(this.dart, toDart(x)); }
  get choices(): Array<string> { return api.grok_GridCellStyle_Get_choices(this.dart); };
  set choices(x: Array<string>) {api.grok_GridCellStyle_Set_choices(this.dart, toDart(x)); }
}
export function renderMultipleHistograms(g: CanvasRenderingContext2D, bounds: any, histograms: Array<Int32List>, options?: {categoryColumn?: any, colors?: Array<number>, tension?: number, normalize?: boolean, markerSize?: number, fill?: boolean, minBin?: number, maxBin?: number, localMaximum?: boolean}): any
  { return api.grok_renderMultipleHistograms(toDart(g), toDart(bounds), toDart(histograms), toDart(options?.categoryColumn), toDart(options?.colors), toDart(options?.tension), toDart(options?.normalize), toDart(options?.markerSize), toDart(options?.fill), toDart(options?.minBin), toDart(options?.maxBin), toDart(options?.localMaximum)); }

