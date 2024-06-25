import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import wu from 'wu';
import {fromEvent, Observable, Subject, Unsubscribable} from 'rxjs';

import {SeqHandler} from '@datagrok-libraries/bio/src/utils/seq-handler';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import {
  monomerToShort, pickUpPalette, pickUpSeqCol, TAGS as bioTAGS, positionSeparator
} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {
  FilterSources, HorizontalAlignments, IWebLogoViewer, PositionHeight, PositionMarginStates,
  VerticalAlignments, WebLogoProps, WebLogoPropsDefault
} from '@datagrok-libraries/bio/src/viewers/web-logo';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {intToHtmlA} from '@datagrok-libraries/utils/src/color';
import {GAP_SYMBOL, ISeqSplitted} from '@datagrok-libraries/bio/src/utils/macromolecule/types';
import {testEvent} from '@datagrok-libraries/utils/src/test';
import {PromiseSyncer} from '@datagrok-libraries/bio/src/utils/syncer';

import {AggFunc, getAgg} from '../utils/agg';
import {buildCompositionTable} from '../widgets/composition-analysis-widget';

import {_package} from '../package';

declare global {
  interface HTMLCanvasElement {
    getCursorPosition(event: MouseEvent, r: number): DG.Point;
  }
}

/**@param {MouseEvent} event
 * @param {number} r devicePixelRation
 * @return {DG.Point} canvas related cursor position
 */
HTMLCanvasElement.prototype.getCursorPosition = function(event: MouseEvent, r: number): DG.Point {
  const rect = this.getBoundingClientRect();
  return new DG.Point((event.clientX - rect.left) * r, (event.clientY - rect.top) * r);
};

DG.Rect.prototype.contains = function(x: number, y: number): boolean {
  return this.left <= x && x <= this.right && this.top <= y && y <= this.bottom;
};

export class PositionMonomerInfo {
  /** Sequences count with monomer in position */
  public rowCount: number;
  /** Aggregated value */
  public value: number;
  /** Aggregated value shifted to be non-negative */
  public plotValue: number;

  public valueList: (number | null)[] | null = null;
  public valueIdx: number = 0;

  /** Remember screen coords rect */
  public bounds?: DG.Rect;

  constructor(rowCount: number = 0, bounds?: DG.Rect) {
    this.value = this.rowCount = rowCount;
    this.bounds = bounds;
  }

  public push(value: number | null): void {
    if (!this.valueList) {
      this.valueList = new Array<number>(this.rowCount);
      this.valueIdx = 0;
    }
    this.valueList[this.valueIdx] = value;
    ++this.valueIdx;
  }

  public aggregate(aggFunc: AggFunc): void {
    this.value = aggFunc(this.valueList!) ?? 0;
    this.valueList = null; // clear
  }
}

export class PositionInfo {
  private readonly _label: string | undefined;
  public get label(): string { return !!this._label ? this._label : this.name; }

  private readonly _freqs: { [m: string]: PositionMonomerInfo };

  sumRowCount: number = 0;
  /** Sum of plot value */
  sumPlotValue: number;
  /** Sum of plot value scaled to alphabet size with pseudo-count correction */
  sumPlotValueForHeight: number;

  /** freq = {}, rowCount = 0
   * @param {number} pos Position in sequence
   * @param {string} name Name of position ('111A', '111.1', etc)
   * @param {string[]} freqs frequency of monomers in position
   * @param options sumRowCount - count of elements in column
   *                sumValueForHeight - sum of all monomer counts for height calculation
   *                label - displaying position label
   */
  constructor(
    /** Position in sequence */ public readonly pos: number,
    /** Position name from column tag*/ public readonly name: string,
    freqs?: { [m: string]: PositionMonomerInfo },
    options?: { sumRowCount?: number, sumValueForHeight?: number, label?: string }
  ) {
    this._freqs = freqs ?? {};

    if (options?.sumRowCount) this.sumRowCount = options.sumRowCount;
    if (options?.sumValueForHeight) this.sumPlotValue = options.sumValueForHeight;
    if (options?.label) this._label = options.label;
  }

  public getMonomers(): string[] {
    return Object.keys(this._freqs);
  }

  public hasMonomer(m: string): boolean {
    return m in this._freqs;
  }

  /** Creates empty PositionMonomerInfo for {@link m} key if missed in {@link _freqs}. */
  public getFreq(m: string): PositionMonomerInfo {
    let res: PositionMonomerInfo = this._freqs[m];
    if (!res) res = this._freqs[m] = new PositionMonomerInfo();
    return res;
  }

  /** Calculates {@link agg} aggregation function for all ${link this.freqs} and clears ${} */
  public aggregate(agg: DG.AggregationType): void {
    const aggFunc = getAgg(agg);
    for (const [m, pmi] of Object.entries(this._freqs))
      pmi.aggregate(aggFunc);
    // this.sumValueForHeight will be calculated before drawing
  }

  getMinValue() {
    return Math.min(...Object.values(this._freqs).map((pmi) => pmi.value));
  }

  calcPlotValue(shiftAggValue: number) {
    for (const pmi of Object.values(this._freqs))
      pmi.plotValue = pmi.value - shiftAggValue;
  }

  /** Calculates {@link .sumPlotValue} overall position */
  calcHeights(heightMode: PositionHeight): void {
    this.sumPlotValue = 0;
    for (const pmi of Object.values(this._freqs))
      this.sumPlotValue += pmi.plotValue;

    this.sumPlotValueForHeight = 0;
    if (heightMode === PositionHeight.Entropy) {
      const freqsSize = Object.keys(this._freqs).length;
      const sumPseudoCount = 0.01 * this.sumPlotValue;
      const pseudoCount = sumPseudoCount / freqsSize;
      for (const pmi of Object.values(this._freqs)) {
        const pn = (pmi.plotValue + pseudoCount) / (this.sumPlotValue + sumPseudoCount);
        this.sumPlotValueForHeight += -pn * Math.log2(pn);
      }
    } else if (heightMode === PositionHeight.full) {
      for (const [_m, pmi] of Object.entries(this._freqs)) {
        const pn = pmi.plotValue / this.sumPlotValue;
        this.sumPlotValueForHeight += pn;
      }
    }
  }

  calcScreen(posIdx: number, firstVisiblePosIdx: number,
    absoluteMaxHeight: number, heightMode: PositionHeight, alphabetSizeLog: number,
    positionWidthWithMargin: number, positionWidth: number, dpr: number, positionLabelsHeight: number
  ): void {
    const maxHeight = (heightMode === PositionHeight.Entropy) ?
      (absoluteMaxHeight * (alphabetSizeLog - (this.sumPlotValueForHeight)) / alphabetSizeLog) :
      absoluteMaxHeight;
    let y: number = positionLabelsHeight * dpr + (absoluteMaxHeight - maxHeight - 1);

    const entries = Object.entries(this._freqs)
      .sort((a, b) => {
        if (a[0] !== GAP_SYMBOL && b[0] !== GAP_SYMBOL)
          return b[1].value - a[1].value;
        else if (a[0] === GAP_SYMBOL && b[0] === GAP_SYMBOL)
          return 0;
        else if (a[0] === GAP_SYMBOL)
          return -1;
        else /* (b[0] === GAP_SYMBOL) */
          return +1;
      });
    for (const [_m, pmi] of entries) {
      const h: number = maxHeight * pmi.plotValue / this.sumPlotValue;

      pmi.bounds = new DG.Rect(
        (posIdx - firstVisiblePosIdx) * dpr * positionWidthWithMargin, y,
        positionWidth * dpr, h);
      y += h;
    }
  }

  render(g: CanvasRenderingContext2D,
    fontStyle: string, uppercaseLetterAscent: number, uppercaseLetterHeight: number, cp: SeqPalette
  ) {
    for (const [monomer, pmInfo] of Object.entries(this._freqs)) {
      if (monomer !== GAP_SYMBOL) {
        const monomerTxt = monomerToShort(monomer, 5);
        const b = pmInfo.bounds!;
        const left = b.left;

        g.resetTransform();
        g.strokeStyle = 'lightgray';
        g.lineWidth = 1;
        g.rect(left, b.top, b.width, b.height);
        g.fillStyle = cp.get(monomer) ?? cp.get('other');
        g.textAlign = 'left';
        g.font = fontStyle;
        //g.fillRect(b.left, b.top, b.width, b.height);
        const mTm: TextMetrics = g.measureText(monomerTxt);

        g.setTransform(
          b.width / mTm.width, 0, 0, b.height / uppercaseLetterHeight,
          left, b.top);
        g.fillText(monomerTxt, 0, -uppercaseLetterAscent);
      }
    }
  }

  getMonomerAt(calculatedX: number, y: number): string | undefined {
    const findRes = Object.entries(this._freqs)
      .find(([m, pmInfo]) => {
        return pmInfo.bounds!.contains(calculatedX, y);
      });
    return !!findRes ? findRes[0] : undefined;
  }

  buildCompositionTable(palette: SeqPalette): HTMLTableElement {
    if ('-' in this._freqs)
      throw new Error(`Unexpected monomer symbol '-'.`);
    return buildCompositionTable(palette,
      Object.assign({}, ...Object.entries(this._freqs)
        .map(([m, pmi]) => ({[m]: pmi.rowCount})))
    );
  }
}

export enum PROPS_CATS {
  STYLE = 'Style',
  BEHAVIOR = 'Behavior',
  LAYOUT = 'Layout',
  DATA = 'Data',
}

export enum PROPS {
  // -- Data --
  sequenceColumnName = 'sequenceColumnName',
  valueAggrType = 'valueAggrType',
  valueColumnName = 'valueColumnName',
  startPositionName = 'startPositionName',
  endPositionName = 'endPositionName',
  skipEmptySequences = 'skipEmptySequences',
  skipEmptyPositions = 'skipEmptyPositions',
  shrinkEmptyTail = 'shrinkEmptyTail',

  // -- Style --
  backgroundColor = 'backgroundColor',
  positionHeight = 'positionHeight',
  positionWidth = 'positionWidth',

  // -- Layout --
  verticalAlignment = 'verticalAlignment',
  horizontalAlignment = 'horizontalAlignment',
  fixWidth = 'fixWidth',
  fitArea = 'fitArea',
  minHeight = 'minHeight',
  maxHeight = 'maxHeight',
  showPositionLabels = 'showPositionLabels',
  positionMarginState = 'positionMarginState',
  positionMargin = 'positionMargin',

  // -- Behavior --
  filterSource = 'filterSource',
}

const defaults: WebLogoProps = WebLogoPropsDefault;

enum WlRenderLevel {
  None = 0,
  Render = 1,
  Layout = 1,
  Freqs = 2,
}

export const Debounces = new class {
  render: number = 20;
}();

const POSITION_LABELS_HEIGHT: number = 12;

export class WebLogoViewer extends DG.JsViewer implements IWebLogoViewer {
  public static residuesSet = 'nucleotides';

  private viewed: boolean = false;

  private seqHandler: SeqHandler | null;
  private initialized: boolean = false;

  // private readonly colorScheme: ColorScheme = ColorSchemes[NucleotidesWebLogo.residuesSet];
  protected palette: SeqPalette | null = null;

  private host?: HTMLDivElement;
  private msgHost?: HTMLElement;
  private canvas: HTMLCanvasElement;
  private readonly slider: DG.RangeSlider;
  private readonly textBaseline: CanvasTextBaseline;

  private seqCol: DG.Column<string> | null = null;
  private positions: PositionInfo[] = [];

  private visibleSlider: boolean = false;
  private allowResize: boolean = true;
  private turnOfResizeForOneSetValue: boolean = false;

  // Viewer's properties (likely they should be public)
  // -- Data --
  public sequenceColumnName: string | null;
  public valueAggrType: DG.AggregationType;
  public valueColumnName: string;
  public skipEmptySequences: boolean;
  public skipEmptyPositions: boolean;

  // -- Style --
  /** Gets value from properties or {@link setOptions} */ public positionWidth: number;
  /** Scaled value to fit area */ private _positionWidth: number;
  private _positionWidthWithMargin: number;
  public get positionWidthWithMargin(): number { return this._positionWidthWithMargin; }

  public minHeight: number;
  public backgroundColor: number = 0xFFFFFFFF;
  public maxHeight: number;
  public showPositionLabels: boolean;
  public positionMarginState: PositionMarginStates;
  /** Gets value from properties or setOptions */ public positionMargin: number = 0;
  /** Scaled value to fit area */ private _positionMargin: number;
  public startPositionName: string | null;
  public endPositionName: string | null;
  public fixWidth: boolean;
  public verticalAlignment: VerticalAlignments;
  public horizontalAlignment: HorizontalAlignments;
  public fitArea: boolean;
  public shrinkEmptyTail: boolean;
  public positionHeight: PositionHeight;

  // -- Behavior --
  public filterSource: FilterSources;

  private positionNames: string[] = [];
  private positionLabels: string[] | undefined = undefined;
  private startPosition: number = -1;
  private endPosition: number = -1;

  private error: Error | null = null;

  /** Full length of {@link positions}.
   * Inclusive, for startPosition equals to endPosition Length is 1
   */
  public get Length(): number {
    if (this.skipEmptyPositions)
      return this.positions.length;

    return this.startPosition <= this.endPosition ? this.endPosition - this.startPosition + 1 : 0;
  }

  public get positionMarginValue(): number {
    if (this.positionMarginState === PositionMarginStates.AUTO && this.seqHandler!.getAlphabetIsMultichar() === true)
      return this.positionMargin;
    else if (this.positionMarginState === PositionMarginStates.ON)
      return this.positionMargin;
    else
      return 0;
  }

  constructor() {
    super();

    this.textBaseline = 'top';
    this.seqHandler = null;

    // -- Data --
    this.sequenceColumnName = this.string(PROPS.sequenceColumnName, defaults.sequenceColumnName,
      {category: PROPS_CATS.DATA});
    const aggExcludeList = [DG.AGG.KEY, DG.AGG.PIVOT, DG.AGG.MISSING_VALUE_COUNT, DG.AGG.SKEW, DG.AGG.KURT,
      DG.AGG.SELECTED_ROWS_COUNT];
    const aggChoices = Object.values(DG.AGG).filter((agg) => !aggExcludeList.includes(agg));
    this.valueAggrType = this.string(PROPS.valueAggrType, defaults.valueAggrType,
      {category: PROPS_CATS.DATA, choices: aggChoices}) as DG.AggregationType;
    this.valueColumnName = this.string(PROPS.valueColumnName, defaults.valueColumnName,
      {category: PROPS_CATS.DATA});
    this.startPositionName = this.string(PROPS.startPositionName, defaults.startPositionName,
      {category: PROPS_CATS.DATA});
    this.endPositionName = this.string(PROPS.endPositionName, defaults.endPositionName,
      {category: PROPS_CATS.DATA});
    this.skipEmptySequences = this.bool(PROPS.skipEmptySequences, defaults.skipEmptySequences,
      {category: PROPS_CATS.DATA});
    this.skipEmptyPositions = this.bool(PROPS.skipEmptyPositions, defaults.skipEmptyPositions,
      {category: PROPS_CATS.DATA});
    this.shrinkEmptyTail = this.bool(PROPS.shrinkEmptyTail, defaults.shrinkEmptyTail,
      {category: PROPS_CATS.DATA});

    // -- Style --
    this.backgroundColor = this.int(PROPS.backgroundColor, defaults.backgroundColor,
      {category: PROPS_CATS.STYLE});
    this.positionHeight = this.string(PROPS.positionHeight, defaults.positionHeight,
      {category: PROPS_CATS.STYLE, choices: Object.values(PositionHeight)}) as PositionHeight;
    this._positionWidth = this.positionWidth = this.float(PROPS.positionWidth, defaults.positionWidth,
      {category: PROPS_CATS.STYLE/* editor: 'slider', min: 4, max: 64, postfix: 'px' */});

    // -- Layout --
    this.verticalAlignment = this.string(PROPS.verticalAlignment, defaults.verticalAlignment,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(VerticalAlignments)}) as VerticalAlignments;
    this.horizontalAlignment = this.string(PROPS.horizontalAlignment, defaults.horizontalAlignment,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(HorizontalAlignments)}) as HorizontalAlignments;
    this.fixWidth = this.bool(PROPS.fixWidth, defaults.fixWidth,
      {category: PROPS_CATS.LAYOUT, userEditable: false});
    this.fitArea = this.bool(PROPS.fitArea, defaults.fitArea,
      {category: PROPS_CATS.LAYOUT});
    this.minHeight = this.float(PROPS.minHeight, defaults.minHeight,
      {category: PROPS_CATS.LAYOUT/*, editor: 'slider', min: 25, max: 250, postfix: 'px'*/});
    this.maxHeight = this.float(PROPS.maxHeight, defaults.maxHeight,
      {category: PROPS_CATS.LAYOUT/*, editor: 'slider', min: 25, max: 500, postfix: 'px'*/});
    this.showPositionLabels = this.bool(PROPS.showPositionLabels, defaults.showPositionLabels,
      {category: PROPS_CATS.LAYOUT});
    this.positionMarginState = this.string(PROPS.positionMarginState, defaults.positionMarginState,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(PositionMarginStates)}) as PositionMarginStates;
    let defaultValueForPositionMargin = 0;
    if (this.positionMarginState === 'auto') defaultValueForPositionMargin = 4;
    this.positionMargin = this.int(PROPS.positionMargin, defaultValueForPositionMargin,
      {category: PROPS_CATS.LAYOUT, min: 0, max: 16});

    // -- Behavior --
    this.filterSource = this.string(PROPS.filterSource, defaults.filterSource,
      {category: PROPS_CATS.BEHAVIOR, choices: Object.values(FilterSources)}) as FilterSources;

    const style: DG.SliderOptions = {style: 'barbell'};
    this.slider = ui.rangeSlider(0, 100, 0, 20, false, style);
    this.canvas = ui.canvas();
    this.canvas.classList.value = 'bio-wl-canvas';
    this.canvas.style.width = '100%';

    /* this.root.style.background = '#FFEEDD'; */
    this.viewSyncer = new PromiseSyncer(_package.logger);
  }

  private static viewerCounter: number = -1;
  private readonly viewerId: number = ++WebLogoViewer.viewerCounter;

  private toLog(): string { return `WebLogoViewer<${this.viewerId}>`; }

  // -- Data --

  setData(): void {
    const logPrefix = `${this.toLog()}.setData()`;
    _package.logger.debug(`${logPrefix}, in`);
    this.viewSyncer.sync(`${logPrefix}`, async () => { // setData
      if (!this.setDataInProgress) this.setDataInProgress = true; else return; // check setDataInProgress synced
      try {
        if (this.viewed) {
          this.renderRequestSub.unsubscribe();
          await this.destroyView();
          this.viewed = false;
        }

        this.updateSeqCol();
        this.updateEditors();

        if (!this.viewed) {
          await this.buildView(); //requests rendering
          this.viewed = true;
        }
      } finally {
        this.setDataInProgress = false;
      }
    });
    _package.logger.debug(`${logPrefix}, out`);
  }

  // -- View --

  private viewSyncer: PromiseSyncer;
  private setDataInProgress: boolean = false;
  private viewSubs: Unsubscribable[] = [];

  private async destroyView(): Promise<void> {
    for (const sub of this.viewSubs) sub.unsubscribe();
    this.viewSubs = [];

    const dataFrameTxt = `${this.dataFrame ? 'data' : 'null'}`;
    _package.logger.debug(`${this.toLog()}.destroyView( dataFrame = ${dataFrameTxt} ) start`);

    this.host!.remove();
    this.msgHost = undefined;
    this.host = undefined;

    _package.logger.debug(`${this.toLog()}.destroyView() end`);
  }

  private async buildView(): Promise<void> {
    const dataFrameTxt: string = this.dataFrame ? 'data' : 'null';
    _package.logger.debug(`${this.toLog()}.buildView( dataFrame = ${dataFrameTxt} ) start`);
    const dpr = window.devicePixelRatio;
    this.viewSubs.push(DG.debounce(this.renderRequest, Debounces.render)
      .subscribe(this.renderRequestOnDebounce.bind(this)));

    this.helpUrl = '/help/visualize/viewers/web-logo.md';

    this.msgHost = ui.div('No message', {classes: 'bio-wl-msg'});
    this.msgHost.style.display = 'none';

    this.canvas = ui.canvas();
    this.canvas.style.width = '100%';

    //this.slider.setShowHandles(false);
    this.slider.root.style.position = 'absolute';
    this.slider.root.style.zIndex = '999';
    this.slider.root.style.display = 'none';
    this.slider.root.style.height = '0.7em';

    this.visibleSlider = false;

    this.host = ui.div([this.msgHost, this.canvas],
      {
        classes: 'bio-wl-host',
        style: {
          display: 'flex',
          flexDirection: 'row',
          /** For alignContent to have an effect */ flexWrap: 'wrap',
          /* backgroundColor: '#EEFFEE' */
        }
      });

    this.root.append(this.host);
    this.root.append(this.slider.root);

    if (!!this.error) {
      this.msgHost!.innerText = this.error.message;
      ui.tooltip.bind(this.msgHost!, this.error.stack);
      this.msgHost!.style.setProperty('display', null);
    }

    if (this.dataFrame) {
      this.viewSubs.push(this.dataFrame.filter.onChanged.subscribe(this.dataFrameFilterOnChanged.bind(this)));
      this.viewSubs.push(this.dataFrame.selection.onChanged.subscribe(this.dataFrameSelectionOnChanged.bind(this)));
    }
    this.viewSubs.push(ui.onSizeChanged(this.root).subscribe(this.rootOnSizeChanged.bind(this)));
    this.viewSubs.push(this.slider.onValuesChanged.subscribe(this.sliderOnValuesChanged.bind(this)));
    this.viewSubs.push(
      fromEvent<MouseEvent>(this.canvas, 'mousemove').subscribe(this.canvasOnMouseMove.bind(this)));
    this.viewSubs.push(
      fromEvent<MouseEvent>(this.canvas, 'mousedown').subscribe(this.canvasOnMouseDown.bind(this)));
    this.viewSubs.push(
      fromEvent<WheelEvent>(this.canvas, 'wheel').subscribe(this.canvasOnWheel.bind(this)));

    this.render(WlRenderLevel.Freqs, 'buildView');
    _package.logger.debug(`${this.toLog()}.buildView() end`);
  }

  private lastSize: { width: number, height: number } = {width: -1, height: -1};

  /** Handler of changing size WebLogo */
  private rootOnSizeChanged(value: ResizeObserverEntry): void {
    const size = {width: value.target.clientWidth, height: value.target.clientHeight};
    if (this.lastSize.width != size.width || this.lastSize.height != size.height) {
      _package.logger.debug(
        `${this.toLog()}.rootOnSizeChanged(), ${JSON.stringify(size)}, start `);
      this.render(WlRenderLevel.Layout, 'rootOnSizeChanged');
    }
    this.lastSize = size;
  }

  private updateEditors(): void {
    const valueColumnNameProp = this.props.getProperty(PROPS.valueColumnName);
    valueColumnNameProp.choices = wu(this.dataFrame.columns.numerical)
      .map((col) => col.name).toArray();
    // Set valueColumnNameProp.choices has no effect
  }

  /** Assigns {@link seqCol} and {@link palette} based on {@link sequenceColumnName} and calls {@link render}(). */
  private updateSeqCol(): void {
    if (this.dataFrame) {
      this.seqCol = this.sequenceColumnName ? this.dataFrame.col(this.sequenceColumnName) : null;
      if (this.seqCol == null) {
        this.seqCol = pickUpSeqCol(this.dataFrame);
        this.sequenceColumnName = this.seqCol ? this.seqCol.name : null;
      }
      if (this.seqCol) {
        try {
          this.seqHandler = SeqHandler.forColumn(this.seqCol);

          this.palette = pickUpPalette(this.seqCol);
          this.render(WlRenderLevel.Freqs, 'updateSeqCol()');
          this.error = null;
        } catch (err: any) {
          this.seqCol = null;
          this.error = err instanceof Error ? err : new Error(err.toString());
          throw err;
        }
        if (!this.seqCol) {
          this.seqHandler = null;
          this.positionNames = [];
          this.positionLabels = [];
          this.startPosition = -1;
          this.endPosition = -1;
          this.palette = null;
        }
      }
    }
  }

  private getFilter(): DG.BitSet {
    let dfFilterRes: DG.BitSet;
    switch (this.filterSource) {
    case FilterSources.Filtered:
      dfFilterRes = this.dataFrame.filter;
      break;

    case FilterSources.Selected:
      dfFilterRes = this.dataFrame.selection.trueCount === 0 ? this.dataFrame.filter : this.dataFrame.selection;
      break;
    }
    return dfFilterRes;
  }

  setSliderVisibility(visible: boolean): void {
    if (visible) {
      this.slider.root.style.display = 'inherit';
      this.visibleSlider = true;
    } else {
      this.slider.root.style.display = 'none';
      this.visibleSlider = false;
    }
  }

  /** Updates {@link host}, {@link canvas}, {@link slider} .min, .max.
   * Calls {@link render} with {@link WlRenderLevel.Layout}
   */
  private calcLayout(dpr: number): void {
    if (!this.host || !this.canvas || !this.slider) return;

    this.host.classList.remove('bio-wl-fixWidth', 'bio-wl-fitArea');
    this.canvas.classList.remove('bio-wl-fixWidth', 'bio-wl-fitArea');

    this._positionWidth = this.positionWidth;
    this._positionMargin = this.positionMargin;
    this._positionWidthWithMargin = this._positionWidth + this.positionMarginValue;

    if (this.fixWidth)
      this.calcLayoutFixWidth(dpr);
    else if (this.fitArea)
      this.calcLayoutFitArea(dpr);
    else
      this.calcLayoutNoFitArea(dpr);

    this.slider.root.style.width = `${this.host.clientWidth}px`;
  }

  /** */
  private calcLayoutFixWidth(dpr: number): void {
    if (!this.host || !this.canvas || !this.slider) return; // for es-lint

    this.host.classList.add('bio-wl-fixWidth');
    this.canvas.classList.add('bio-wl-fitArea');

    const areaWidth: number = this._positionWidthWithMargin * this.Length;
    const areaHeight: number = Math.min(Math.max(this.minHeight, this.root.clientHeight), this.maxHeight);

    this.host.style.justifyContent = HorizontalAlignments.LEFT;
    this.host.style.removeProperty('margin-left');
    this.host.style.removeProperty('margin-top');

    this.host.style.width = this.canvas.style.width = `${areaWidth}px`;
    this.host.style.height = this.canvas.style.height = `${areaHeight}px`;
    this.host.style.left = this.canvas.style.left = '0';
    this.host.style.top = this.canvas.style.top = '0';
    this.host.style.setProperty('overflow', 'hidden', 'important');

    this.slider.root.style.display = 'none';

    this.slider.setValues(0, Math.max(0, this.Length - 1), 0, Math.max(0, this.Length - 1));

    this.canvas.width = areaWidth * dpr;
    this.canvas.height = areaHeight * dpr;
  }

  private calcLayoutNoFitArea(dpr: number): void {
    if (!this.host || !this.canvas || !this.slider) return; // for es-lint

    const areaWidth: number = this._positionWidthWithMargin * this.Length;
    const areaHeight: number = Math.min(Math.max(this.minHeight, this.root.clientHeight), this.maxHeight);

    const height = areaHeight;
    const width = Math.min(this.root.clientWidth, areaWidth);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.host.style.width = `${width}px`;
    this.host.style.height = `${this.root.clientHeight}px`;

    // host style flex-direction: row;
    this.host.style.justifyContent = this.horizontalAlignment;
    this.host.style.alignContent =
      this.verticalAlignment === VerticalAlignments.TOP ? 'start' :
        this.verticalAlignment === VerticalAlignments.MIDDLE ? 'center' :
          this.verticalAlignment === VerticalAlignments.BOTTOM ? 'end' :
            'inherit';

    if (this.root.clientHeight < this.minHeight) {
      this.host.style.alignContent = 'start'; /* For vertical scroller to work properly */
      this.host.style.width = `${width + 6}px`; /* */
    }

    this.host.style.width = `${this.host}px`;

    const sliderVisibility = areaWidth > width;
    this.setSliderVisibility(sliderVisibility);
    if (sliderVisibility) {
      this.slider.root.style.removeProperty('display');
      this.host.style.justifyContent = 'left'; /* For horizontal scroller to prevent */
      this.host.style.height = `${this.root.clientHeight - this.slider.root.offsetHeight}px`;
      this.slider.root.style.top = `${this.host.offsetHeight}px`;

      let newMin = Math.min(Math.max(0, this.slider.min), this.Length - 0.001);
      let newMax = Math.min(Math.max(0, this.slider.max), this.Length - 0.001);

      const visibleLength = this.root.clientWidth / this._positionWidthWithMargin;
      newMax = Math.min(Math.max(newMin, 0) + visibleLength, this.Length - 0.001);
      newMin = Math.max(0, Math.min(newMax, this.Length - 0.001) - visibleLength);

      this.slider.setValues(0, Math.max(this.Length - 0.001), newMin, newMax);
    } else {
      //
      this.slider.setValues(0, Math.max(0, this.Length - 0.001), 0, Math.max(0, this.Length - 0.001));
    }

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }

  private calcLayoutFitArea(dpr: number): void {
    if (!this.host || !this.canvas || !this.slider) return; // for es-lint

    const originalAreaWidthWoMargins: number = this._positionWidth * this.Length;
    const originalAreaHeight: number = Math.min(Math.max(this.minHeight, this.root.clientHeight), this.maxHeight);

    // TODO: scale
    const xScale = originalAreaWidthWoMargins > 0 ?
      (this.root.clientWidth - this.positionMarginValue * this.Length) / originalAreaWidthWoMargins : 0;
    const yScale = this.root.clientHeight / originalAreaHeight;
    const scale = Math.max(1, Math.min(xScale, yScale));

    this._positionWidth = this.positionWidth * scale;
    // Do not scale this._positionMargin
    this._positionWidthWithMargin = this._positionWidth + this.positionMarginValue;
    const areaWidth = (this._positionWidth + this.positionMarginValue) * this.Length;
    const areaHeight = scale * originalAreaHeight;

    const height = areaHeight;
    const width = Math.min(this.root.clientWidth, areaWidth);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.host.style.width = `${width}px`;
    this.host.style.height = `${this.root.clientHeight}px`;

    // host style flex-direction: row;
    this.host.style.justifyContent = this.horizontalAlignment;
    this.host.style.alignContent =
      this.verticalAlignment === VerticalAlignments.TOP ? 'start' :
        this.verticalAlignment === VerticalAlignments.MIDDLE ? 'center' :
          this.verticalAlignment === VerticalAlignments.BOTTOM ? 'end' :
            'inherit';

    if (this.root.clientHeight < this.minHeight) {
      this.host.style.alignContent = 'start'; /* For vertical scroller to work properly */
      this.host.style.width = `${width + 6}px`; /* */
    }

    this.host.style.width = `${this.host}px`;

    const sliderVisibility = areaWidth > width;
    this.setSliderVisibility(sliderVisibility);
    if (sliderVisibility) {
      this.slider.root.style.removeProperty('display');
      this.host.style.justifyContent = 'left'; /* For horizontal scroller to prevent */
      this.host.style.height = `${this.root.clientHeight - this.slider.root.offsetHeight}px`;
      this.slider.root.style.top = `${this.host.offsetHeight}px`;

      let newMin = Math.min(Math.max(0, this.slider.min), this.Length - 0.001);
      let newMax = Math.min(Math.max(0, this.slider.max), this.Length - 0.001);

      const visibleLength = this.root.clientWidth / this._positionWidthWithMargin;
      newMax = Math.min(Math.max(newMin, 0) + visibleLength, this.Length - 0.001);
      newMin = Math.max(0, Math.min(newMax, this.Length - 0.001) - visibleLength);

      this.slider.setValues(0, Math.max(0, this.Length - 0.001), newMin, newMax);
    } else {
      //
      this.slider.setValues(0, Math.max(0, this.Length - 0.001), 0, Math.max(0, this.Length - 0.001));
    }

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
  }


  /** Handler of property change events.
   * @param {DG.Property} property - property which was changed.
   */
  public override onPropertyChanged(property: DG.Property): void {
    super.onPropertyChanged(property);

    switch (property.name) {
    case PROPS.sequenceColumnName:
      this.updateSeqCol();
      break;
    case PROPS.sequenceColumnName:
    case PROPS.startPositionName:
    case PROPS.endPositionName:
    case PROPS.filterSource:
    case PROPS.shrinkEmptyTail:
    case PROPS.skipEmptyPositions:
    case PROPS.positionHeight: {
      this.render(WlRenderLevel.Freqs, `onPropertyChanged( ${property.name} )`);
      break;
    }
    case PROPS.valueColumnName:
    case PROPS.valueAggrType: {
      this.render(WlRenderLevel.Freqs, `onPropertyChanged( ${property.name} )`);
      break;
    }
    case PROPS.minHeight:
    case PROPS.maxHeight:
    case PROPS.positionWidth:
    case PROPS.showPositionLabels:
    case PROPS.fixWidth:
    case PROPS.fitArea:
    case PROPS.horizontalAlignment:
    case PROPS.verticalAlignment:
    case PROPS.positionMargin:
    case PROPS.positionMarginState: {
      // this.positionWidth obtains a new value
      // this.updateSlider updates this._positionWidth
      this.render(WlRenderLevel.Layout, `onPropertyChanged(${property.name})`);
      break;
    }
    case PROPS.backgroundColor: {
      this.render(WlRenderLevel.Render, `onPropertyChanged(${property.name})`);
      break;
    }
    }
  }

  /** Add filter handlers when table is a attached  */
  public override onTableAttached() {
    _package.logger.debug(`${this.toLog()}.onTableAttached(), `);

    super.onTableAttached();
    this.setData();
  }

  /** Remove all handlers when table is a detach  */
  public override detach() {
    const logPrefix = `${this.toLog()}.detach()`;
    _package.logger.debug(`${logPrefix}, in`);

    const superDetach = super.detach.bind(this);
    this.viewSyncer.sync(`${logPrefix}`, async () => { // detach
      if (this.setDataInProgress) return; // check setDataInProgress synced
      if (this.viewed) {
        await this.destroyView();
        this.viewed = false;
      }
      superDetach();
    });
    _package.logger.debug(`${logPrefix}, out`);
  }

  private _onSizeChanged: Subject<void> = new Subject<void>();

  public get onSizeChanged(): Observable<void> { return this._onSizeChanged; }

  private _onFreqsCalculated: Subject<void> = new Subject<void>();

  /** Allows {@link VdRegionsViewer} to fit enclosed WebLogo viewers */
  public get onFreqsCalculated(): Observable<void> { return this._onFreqsCalculated; }

  /** Allows {@link VdRegionsViewer} to fit enclosed WebLogo viewers */
  private _onLayoutCalculated: Subject<void> = new Subject<void>();
  public get onLayoutCalculated(): Observable<void> { return this._onLayoutCalculated; }

  // -- Routines --

  getMonomer(p: DG.Point, dpr: number): [PositionInfo | null, string | null, PositionMonomerInfo | null] {
    const calculatedX = p.x;
    const jPos = Math.floor(p.x / (this._positionWidthWithMargin * dpr) + Math.floor(this.slider.min));
    const pi: PositionInfo = this.positions[jPos];

    if (!pi)
      return [null, null, null];

    const monomer: string | undefined = pi.getMonomerAt(calculatedX, p.y);
    if (monomer === undefined)
      return [pi, null, null];

    return [pi, monomer, pi.getFreq(monomer)];
  };

  /** Helper function for rendering
   * @param {boolean} fillerResidue
   * @return {string} - string with null sequence
   */
  protected _nullSequence(fillerResidue = 'X'): string {
    if (!this.skipEmptySequences)
      return new Array(this.Length).fill(fillerResidue).join('');

    return '';
  }

  /** Function for removing empty positions */
  protected _removeEmptyPositions() {
    if (this.skipEmptyPositions) {
      this.positions = wu(this.positions).filter((pi) => {
        return !pi.hasMonomer(GAP_SYMBOL) || pi.getFreq(GAP_SYMBOL).rowCount !== pi.sumRowCount;
      }).toArray();
    }
  }

  /** default value of RecalcLevel.Freqs is for recalc from the scratch at the beginning */
  private requestedRenderLevel: WlRenderLevel = WlRenderLevel.Freqs;
  private readonly renderRequest: Subject<WlRenderLevel> = new Subject<WlRenderLevel>();
  private renderRequestSub: Unsubscribable;

  /** Renders requested repeatedly will be performed once on window.requestAnimationFrame() */
  render(renderLevel: WlRenderLevel, reason: string): void {
    _package.logger.debug(`${this.toLog()}` +
      `.render( recalcLevelVal=${renderLevel}, reason='${reason}' )`);
    this.requestedRenderLevel = Math.max(this.requestedRenderLevel, renderLevel);
    this.renderRequest.next(this.requestedRenderLevel);
  }

  /** Render WebLogo sensitive to changes in params of rendering
   *@param {WlRenderLevel} renderLevel - indicates that need to recalculate data for rendering
   */
  protected async renderInt(renderLevel: WlRenderLevel): Promise<void> {
    _package.logger.debug(`${this.toLog()}.render.renderInt( renderLevel=${renderLevel} ), ` +
      `start `);

    /** Calculate freqs of monomers */
    const calculateFreqsInt = (): void => {
      _package.logger.debug(`${this.toLog()}.render.calculateFreqsInt(), start `);
      if (!this.host || !this.seqCol || !this.dataFrame) return;

      // region updatePositions

      /** positionNames and positionLabel can be set up through the column's tags only */
      const positionNamesTxt = this.seqCol.getTag(bioTAGS.positionNames);
      const positionLabelsTxt = this.seqCol.getTag(bioTAGS.positionLabels);

      // WebLogo in the column tooltip / widget is limited, speed up for long sequences
      let splitLimit: number | undefined = undefined;
      if (!positionNamesTxt && this.endPositionName && /\d+/.test(this.endPositionName))
        splitLimit = Number(this.endPositionName);
      else if (positionNamesTxt && this.endPositionName) {
        splitLimit = positionNamesTxt.split(positionSeparator).indexOf(this.endPositionName);
        splitLimit = splitLimit !== -1 ? splitLimit : undefined;
      }

      const dfFilter = this.getFilter();
      const maxLength: number = dfFilter.trueCount === 0 ? this.seqHandler!.maxLength :
        wu.count(0).take(this.seqHandler!.length).map((rowIdx) => {
          const mList = this.seqHandler!.getSplitted(rowIdx, splitLimit);
          return dfFilter.get(rowIdx) && !!mList ? mList.length : 0;
        }).reduce((max, l) => Math.max(max, l), 0);

      this.positionNames = !!positionNamesTxt ? positionNamesTxt.split(positionSeparator).map((v) => v.trim()) :
        [...Array(maxLength).keys()].map((jPos) => `${jPos + 1}`)/* fallback if tag is not provided */;
      this.positionLabels = !!positionLabelsTxt ? positionLabelsTxt.split(positionSeparator).map((v) => v.trim()) :
        undefined;

      this.startPosition = (this.startPositionName && this.positionNames &&
        this.positionNames.includes(this.startPositionName)) ?
        this.positionNames.indexOf(this.startPositionName) : 0;
      this.endPosition = (this.endPositionName && this.positionNames &&
        this.positionNames.includes(this.endPositionName)) ?
        this.positionNames.indexOf(this.endPositionName) : (maxLength - 1);

      // endregion updatePositions

      const length: number = this.startPosition <= this.endPosition ? this.endPosition - this.startPosition + 1 : 0;
      this.seqHandler = SeqHandler.forColumn(this.seqCol);
      const posCount: number = this.startPosition <= this.endPosition ? this.endPosition - this.startPosition + 1 : 0;
      this.positions = new Array(posCount);
      for (let jPos = 0; jPos < length; jPos++) {
        const posName: string = this.positionNames[this.startPosition + jPos];
        const posLabel: string | undefined = this.positionLabels ?
          this.positionLabels[this.startPosition + jPos] : undefined;
        this.positions[jPos] = new PositionInfo(this.startPosition + jPos, posName, {}, {label: posLabel});
      }

      // 2022-05-05 askalkin instructed to show WebLogo based on filter (not selection)
      const dfRowCount = this.dataFrame.rowCount;

      for (let jPos = 0; jPos < length; ++jPos) {
        // Here we want to build lists of values for every monomer in position jPos
        for (let rowI = 0; rowI < dfRowCount; ++rowI) {
          if (dfFilter.get(rowI)) {
            const seqS: ISeqSplitted = this.seqHandler.getSplitted(rowI);
            const om: string = jPos < seqS.length ? seqS.getCanonical(this.startPosition + jPos) :
              this.seqHandler.defaultGapOriginal;
            const cm: string = this.seqHandler.defaultGapOriginal === om ? GAP_SYMBOL : om;
            const pi = this.positions[jPos];
            const pmi = pi.getFreq(cm);
            ++pi.sumRowCount;
            pmi.value = ++pmi.rowCount;
          }
        }
        if (this.valueAggrType === DG.AGG.TOTAL_COUNT) continue;

        // Now we have counts for each monomer in position jPos,
        // this allows us to allocate list of values
        let valueCol: DG.Column<number> | null = null;
        try {
          valueCol = this.dataFrame.getCol(this.valueColumnName);
          if (!valueCol.matches('numerical')) valueCol = null;
        } catch { valueCol = null; }
        if (!valueCol) continue; // fallback to TOTAL_COUNT

        for (let rowI = 0; rowI < dfRowCount; ++rowI) {
          if (dfFilter.get(rowI)) { // respect the filter
            const seqMList: ISeqSplitted = this.seqHandler.getSplitted(rowI);
            const cm: string = seqMList.getCanonical(this.startPosition + jPos);
            const value: number | null = valueCol.get(rowI);
            this.positions[jPos].getFreq(cm).push(value);
          }
        }
        this.positions[jPos].aggregate(this.valueAggrType);
      }

      const shiftAggValue: number = this.valueAggrType === DG.AGG.TOTAL_COUNT ? 0 :
        Math.min(0, Math.min(...this.positions.map((pi) => pi.getMinValue())));
      for (let jPos = 0; jPos < length; ++jPos) {
        this.positions[jPos].calcPlotValue(shiftAggValue);
        this.positions[jPos].calcHeights(this.positionHeight);
      }

      this._removeEmptyPositions();
      this._onFreqsCalculated.next();
    };

    /** Calculate layout of monomers on screen (canvas) based on freqs, required to handle mouse events */
    const calculateLayoutInt = (firstPos: number, lastPos: number, dpr: number, positionLabelsHeight: number): void => {
      _package.logger.debug(`${this.toLog()}.render.calculateLayoutInt(), start `);

      const absoluteMaxHeight: number = this.canvas.height - positionLabelsHeight * dpr;
      let alphabetSizeLog: number;
      if (this.valueAggrType === DG.AGG.TOTAL_COUNT) {
        const alphabetSize: number = this.getAlphabetSize();
        if ((this.positionHeight == PositionHeight.Entropy) && (alphabetSize == null))
          grok.shell.error('WebLogo: alphabet is undefined.');
        alphabetSizeLog = Math.log2(alphabetSize);
      } else {
        alphabetSizeLog = Math.max(...wu.count(firstPos).takeWhile((jPos) => jPos <= lastPos)
          .map((jPos) => this.positions[jPos].sumPlotValueForHeight));
      }

      for (let jPos = firstPos; jPos <= lastPos; ++jPos) {
        if (!(jPos in this.positions)) {
          _package.logger.warning(`${this.toLog()}.render.calculateLayoutInt() ` +
            `this.positions.length = ${this.positions.length}, jPos = ${jPos}`);
          continue;
        }
        this.positions[jPos].calcScreen(
          jPos, this.slider.min, absoluteMaxHeight, this.positionHeight,
          alphabetSizeLog, this._positionWidthWithMargin, this._positionWidth, dpr, positionLabelsHeight);
      }
      _package.logger.debug(`${this.toLog()}.render.calculateLayoutInt(), end `);
      this._onLayoutCalculated.next();
    };

    if (this.msgHost) {
      if (this.seqCol && !this.palette) {
        this.msgHost!.innerText = `Unknown palette (column semType: '${this.seqCol.semType}').`;
        this.msgHost!.style.display = '';
      } else
        this.msgHost!.style.display = 'none';
    }

    if (!this.seqCol || !this.dataFrame || !this.palette || this.host == null || this.slider == null)
      return;

    const dpr: number = window.devicePixelRatio;
    /** 0 is for no position labels */
    const positionLabelsHeight = this.showPositionLabels ? POSITION_LABELS_HEIGHT : 0;
    if (renderLevel >= WlRenderLevel.Freqs) calculateFreqsInt();
    this.calcLayout(dpr); // after _skipEmptyPositions
    if ( /* this.positions.length === 0 || */ this.startPosition === -1 /* || this.endPosition === -1*/) return;
    const firstPos: number = Math.max(Math.floor(this.slider.min), 0);
    const lastPos: number = Math.min(this.positions.length - 1, Math.floor(this.slider.max));
    if (renderLevel >= WlRenderLevel.Layout)
      calculateLayoutInt(firstPos, lastPos, window.devicePixelRatio, positionLabelsHeight);

    const g = this.canvas.getContext('2d');
    if (!g) return;
    g.save();
    try {
      const length: number = this.Length;
      g.resetTransform();
      g.fillStyle = intToHtmlA(this.backgroundColor);
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      g.textBaseline = this.textBaseline;

      //#region Plot positionNames
      const positionFontSize = 10 * dpr;
      g.resetTransform();
      g.fillStyle = 'black';
      g.textAlign = 'center';
      g.font = `${positionFontSize.toFixed(1)}px Roboto, Roboto Local, sans-serif`;

      if (positionLabelsHeight > 0 && this.positions.length > 0) {
        renderPositionLabels(g, dpr, this._positionWidthWithMargin, this._positionWidth, positionLabelsHeight,
          this.positions, this.slider.min, this.slider.max);
      }
      //#endregion Plot positionNames
      const fontStyle = '16px Roboto, Roboto Local, sans-serif';
      // Hacks to scale uppercase characters to target rectangle
      const uppercaseLetterAscent = 0.25;
      const uppercaseLetterHeight = 12.2;
      for (let jPos = firstPos; jPos <= lastPos; jPos++)
        this.positions[jPos].render(g, fontStyle, uppercaseLetterAscent, uppercaseLetterHeight, this.palette);
    } finally {
      g.restore();
    }

    _package.logger.debug(`${this.toLog()}.render.renderInt( recalcLevel=${renderLevel} ), end`);
  }

  private renderRequestOnDebounce(renderLevel: WlRenderLevel): void {
    const logPrefix = `${this.toLog()}.renderRequestOnDebounce()`;
    if ($(this.root).offsetParent().get()[0]?.tagName === 'HTML') {
      _package.logger.warning(`${logPrefix}, $(this.root).offsetParent() is the 'HTML' tag.`);
      return;
    }
    this.requestedRenderLevel = WlRenderLevel.None;
    this.viewSyncer.sync(logPrefix, async () => {
      await this.renderInt(renderLevel);
    });
  }

  private _lastWidth: number;
  private _lastHeight: number;

  public getAlphabetSize(): number {
    return this.seqHandler?.getAlphabetSize() ?? 0;
  }

  // -- Handle events --

  private sliderOnValuesChanged(_value: any): void {
    // if ((this.host == null)) return;
    // const dpr = window.devicePixelRatio;
    //
    try {
      const val = {
        minRange: this.slider.minRange,
        min: this.slider.min, max: this.slider.max,
        maxRange: this.slider.maxRange
      };
      _package.logger.debug(
        `${this.toLog()}.sliderOnValuesChanged( ${JSON.stringify(val)} ), start`);
      this.render(WlRenderLevel.Layout, 'sliderOnValuesChanged');
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.sliderOnValuesChanged() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  private dataFrameFilterOnChanged(_value: any): void {
    _package.logger.debug(`${this.toLog()}.dataFrameFilterChanged()`);
    try {
      if (this.filterSource === FilterSources.Filtered)
        this.render(WlRenderLevel.Freqs, 'dataFrameFilterOnChanged');
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.dataFrameFilterOnChanged() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  private dataFrameSelectionOnChanged(_value: any): void {
    _package.logger.debug(`${this.toLog()}.dataFrameSelectionOnChanged()`);
    try {
      if (this.filterSource === FilterSources.Selected)
        this.render(WlRenderLevel.Freqs, 'dataFrameSelectionOnChanged');
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.dataFrameSelectionOnChanged() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  private canvasOnMouseMove(e: MouseEvent) {
    const dpr = window.devicePixelRatio;
    try {
      const args = e as MouseEvent;

      const cursorP: DG.Point = this.canvas.getCursorPosition(args, dpr);
      const [pi, monomer] = this.getMonomer(cursorP, dpr);
      const positionLabelHeight = this.showPositionLabels ? POSITION_LABELS_HEIGHT * dpr : 0;

      if (pi !== null && monomer === null && 0 <= cursorP.y && cursorP.y <= positionLabelHeight) {
        // Position tooltip

        const tooltipRows = [ui.divText(`Position ${pi.label}`)];
        if (this.valueAggrType === DG.AGG.TOTAL_COUNT)
          tooltipRows.push(pi.buildCompositionTable(this.palette!));
        const tooltipEl = ui.divV(tooltipRows);
        ui.tooltip.show(tooltipEl, args.x + 16, args.y + 16);
      } else if (pi !== null && monomer && this.dataFrame && this.seqCol && this.seqHandler) {
        // Monomer at position tooltip
        // const monomerAtPosSeqCount = countForMonomerAtPosition(
        //   this.dataFrame, this.seqHandler!, this.getFilter(), monomer, atPI);
        const pmi = pi.getFreq(monomer);

        const tooltipRows = [
          // ui.div(`pos ${jPos}`),
          ui.div(`${monomer}`),
          ui.div(`${pmi.rowCount} rows`)
        ];
        if (this.valueAggrType !== DG.AGG.TOTAL_COUNT)
          tooltipRows.push(ui.div(`${this.valueAggrType}: ${pmi.value.toFixed(3)}`));
        const tooltipEl = ui.divV(tooltipRows);
        ui.tooltip.show(tooltipEl, args.x + 16, args.y + 16);
      } else
        ui.tooltip.hide();
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.canvasOnMouseMove() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  private canvasOnMouseDown(e: MouseEvent): void {
    try {
      const args = e as MouseEvent;
      const dpr: number = window.devicePixelRatio;
      const [pi, monomer] = this.getMonomer(this.canvas.getCursorPosition(args, dpr), dpr);

      // prevents deselect all rows if we miss monomer bounds
      if (pi !== null && monomer !== null && this.dataFrame && this.seqCol && this.seqHandler) {
        // Calculate a new BitSet object for selection to prevent interfering with existing
        const selBS: DG.BitSet = DG.BitSet.create(this.dataFrame.selection.length, (rowI: number) => {
          return checkSeqForMonomerAtPos(this.dataFrame, this.seqHandler!, this.getFilter(), rowI, monomer, pi);
        });
        this.dataFrame.selection.init((i) => selBS.get(i));
      }
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.canvasOnMouseDown() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  private canvasOnWheel(e: WheelEvent) {
    const dpr = window.devicePixelRatio;
    try {
      if (!this.visibleSlider) return;
      const visibleLength = this.canvas.width / (this._positionWidthWithMargin * dpr);
      const countOfScrollPositions = (e.deltaY / 100) * Math.max(Math.floor((visibleLength) / 5), 1);
      this.slider.scrollBy(this.slider.min + countOfScrollPositions);
    } catch (err: any) {
      const errMsg = errorToConsole(err);
      _package.logger.error(`${this.toLog()}.canvasOnWheel() error:\n` + errMsg);
      //throw err; // Do not throw to prevent disabling event handler
    }
  }

  // -- IRenderer --

  private _onRendered: Subject<void> = new Subject<void>();

  get onRendered(): Observable<void> { return this._onRendered; }

  invalidate(caller?: string): void {
    const callLog = `invalidate(${caller ? ` <- ${caller} ` : ''})`;
    const logPrefix = `${this.toLog()}.${callLog}`;
    // Put the event trigger in the tail of the synced calls queue.
    this.render(WlRenderLevel.None, callLog); // Put render request to the syncer
    this.viewSyncer.sync(`${logPrefix}`, async () => {
      this._onRendered.next();
    });
  }

  async awaitRendered(timeout: number | undefined = 5000): Promise<void> {
    await testEvent(this.onRendered, () => {}, () => {
      this.invalidate();
    }, timeout);

    // Rethrow stored syncer error (for test purposes)
    const viewErrors = this.viewSyncer.resetErrors();
    if (viewErrors.length > 0) throw viewErrors[0];
  }
}

function renderPositionLabels(g: CanvasRenderingContext2D,
  dpr: number, positionWidthWithMargin: number, positionWidth: number, positionLabelsHeight: number,
  positions: PositionInfo[], firstVisiblePosIdx: number, lastVisiblePosIdx: number
): void {
  g.save();
  try {
    g.textAlign = 'center';

    let maxPosNameWidth: number | null = null;
    let maxPosNameHeight: number | null = null;
    for (let jPos = Math.floor(firstVisiblePosIdx); jPos <= Math.floor(lastVisiblePosIdx); jPos++) {
      const pos = positions[jPos];
      const tm = g.measureText(pos.name);
      const textHeight = tm.actualBoundingBoxDescent - tm.actualBoundingBoxAscent;
      maxPosNameWidth = maxPosNameWidth === null ? tm.width : Math.max(maxPosNameWidth, tm.width);
      maxPosNameHeight = maxPosNameHeight === null ? textHeight : Math.max(maxPosNameHeight, textHeight);
    }
    const hScale = maxPosNameWidth! < (positionWidth * dpr - 2) ? 1 : (positionWidth * dpr - 2) / maxPosNameWidth!;

    for (let jPos = Math.floor(firstVisiblePosIdx); jPos <= Math.floor(lastVisiblePosIdx); jPos++) {
      const pos: PositionInfo = positions[jPos];
      const labelCenterX = (jPos - firstVisiblePosIdx) * positionWidthWithMargin * dpr + positionWidth * dpr / 2;
      const labelTopY = (positionLabelsHeight * dpr - maxPosNameHeight!) / 2;
      g.setTransform(
        hScale, 0, 0,
        1, labelCenterX, labelTopY);
      g.measureText(pos.label);
      g.fillText(pos.label, 0, 0);
    }
  } finally {
    g.restore();
  }
}

export function checkSeqForMonomerAtPos(
  df: DG.DataFrame, sh: SeqHandler, filter: DG.BitSet, rowI: number, monomer: string, at: PositionInfo,
): boolean {
  const seqMList: ISeqSplitted = sh.getSplitted(rowI);
  const seqCM: string | null = at.pos < seqMList.length ? seqMList.getCanonical(at.pos) : null;
  return seqCM !== null && seqCM === monomer;
}

export function countForMonomerAtPosition(
  df: DG.DataFrame, sh: SeqHandler, filter: DG.BitSet, monomer: string, at: PositionInfo
): number {
  let count = 0;
  let rowI = -1;
  while ((rowI = filter.findNext(rowI, true)) != -1) {
    const seqMList: ISeqSplitted = sh.getSplitted(rowI);
    const seqMPos: number = at.pos;
    const seqCM: string | null = seqMPos < seqMList.length ? seqMList.getCanonical(seqMPos) : null;
    if (seqCM !== null && seqCM === monomer) count++;
  }
  return count;
}
