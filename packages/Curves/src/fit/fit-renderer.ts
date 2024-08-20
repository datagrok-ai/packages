import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {
  IFitChartData,
  IFitSeries,
  FitStatistics,
  fitChartDataProperties,
  fitSeriesProperties, IFitChartOptions, IFitPoint,
} from '@datagrok-libraries/statistics/src/fit/fit-curve';
import {Viewport} from '@datagrok-libraries/utils/src/transform';

import {
  fitSeries,
  createDefaultChartData,
  getChartBounds,
  getSeriesFitFunction,
  getCurve,
  LogOptions,
} from '@datagrok-libraries/statistics/src/fit/fit-data';

import {convertXMLToIFitChartData} from './fit-parser';
import {CellRenderViewer} from './cell-render-viewer';
import { calculateSeriesStats, getChartDataAggrStats } from './fit-grid-cell-handler';
import {FitConstants} from './const';
import {
  assignSeriesColors, renderAxesLabels,
  renderConfidenceIntervals, renderConnectDots,
  renderDroplines,
  renderFitLine, renderLegend,
  renderPoints, renderStatistics, renderTitle
} from './render-utils';


function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function showIncorrectFitCell(g: CanvasRenderingContext2D, screenBounds: DG.Rect): void {
  DG.Paint.marker(g, DG.MARKER_TYPE.OUTLIER, screenBounds.midX, screenBounds.midY, DG.Color.red,
    clamp(Math.min(screenBounds.width, screenBounds.height) * 0.8,0, 30));
}

/** Merges properties of the two objects by iterating over the specified {@link properties}
 * and assigning properties from {@link source} to {@link target} only when
 * the property is not defined in target and is defined in source. */
export function mergeProperties(properties: DG.Property[], source: any, target: any): void {
  if (!source || !target)
    return;

  for (const p of properties) {
    if (!(p.name in target) && p.name in source)
      target[p.name] = source[p.name];
  }
}

export function mergeChartOptions(chartOptions: IFitChartOptions[]): IFitChartOptions {
  if (chartOptions.length === 0)
    return {};

  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;
  let xAxisName: string | undefined;
  let yAxisName: string | undefined;
  let title: string | undefined;
  let logX: boolean = false;
  let logY: boolean = false;
  let allowXZeroes: boolean = false;

  for (const options of chartOptions) {
    if (options.minX !== null && options.minX !== undefined)
      minX = Math.min(minX, options.minX);
    if (options.minY !== null && options.minY !== undefined)
      minY = Math.min(minY, options.minY);
    if (options.maxX !== null && options.maxX !== undefined)
      maxX = Math.max(maxX, options.maxX);
    if (options.maxY !== null && options.maxY !== undefined)
      maxY = Math.max(maxY, options.maxY);
    if (options.title !== null && options.title !== undefined)
      title ??= options.title;
    if (options.xAxisName !== null && options.xAxisName !== undefined)
      xAxisName ??= options.xAxisName;
    if (options.yAxisName !== null && options.yAxisName !== undefined)
      yAxisName ??= options.yAxisName;
    if (options.logX !== null && options.logX !== undefined && options.logX)
      logX = true;
    if (options.logY !== null && options.logY !== undefined && options.logY)
      logY = true;
    if (options.allowXZeroes !== null && options.allowXZeroes !== undefined && options.allowXZeroes)
      allowXZeroes = true;
  }

  return {
    minX: minX === Number.MAX_VALUE ? undefined : minX,
    minY: minY === Number.MAX_VALUE ? undefined : minY,
    maxX: maxX === Number.MIN_VALUE ? undefined : maxX,
    maxY: maxY === Number.MIN_VALUE ? undefined : maxY,
    title: title,
    xAxisName: xAxisName,
    yAxisName: yAxisName,
    logX: logX,
    logY: logY,
    allowXZeroes: allowXZeroes,
  };
}

export function mergeSeries(series: IFitSeries[]): IFitSeries | null {
  if (series.length === 0)
    return null;
  const mergedSeries: IFitSeries = {
    points: [],
    name: series[0].name,
    fitFunction: series[0].fitFunction,
    markerType: series[0].markerType,
    lineStyle: series[0].lineStyle,
    pointColor: series[0].pointColor,
    fitLineColor: series[0].fitLineColor,
    confidenceIntervalColor: series[0].confidenceIntervalColor,
    outlierColor: series[0].outlierColor,
    connectDots: series[0].connectDots,
    showFitLine: series[0].showFitLine,
    showPoints: series[0].showPoints,
    showCurveConfidenceInterval: series[0].showCurveConfidenceInterval,
    errorModel: series[0].errorModel,
    clickToToggle: series[0].clickToToggle,
    labels: series[0].labels,
    droplines: series[0].droplines,
    columnName: series[0].columnName,
  };
  for (const s of series)
    mergedSeries.points = [...mergedSeries.points, ...s.points];
  return mergedSeries;
}

/** Constructs {@link IFitChartData} from the grid cell, taking into account
 * chart and fit settings potentially defined on the dataframe and column level. */
export function getChartData(gridCell: DG.GridCell): IFitChartData {
  // removing '|' from JSON (how did it get here?)
  let cellValue = gridCell.cell.value as string;
  if (cellValue.includes('|'))
    cellValue = cellValue.replaceAll('|', '');
  const cellChartData: IFitChartData = gridCell.cell?.column?.type === DG.TYPE.STRING ?
    (gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX ?
    convertXMLToIFitChartData(cellValue) :
    JSON.parse(cellValue ?? '{}') ?? {}) : createDefaultChartData();

  const columnChartOptions = gridCell.cell.column ? getColumnChartOptions(gridCell.cell.column) : {};
  const dfChartOptions = gridCell.cell.column ? getDataFrameChartOptions(gridCell.cell.dataFrame) : {};

  cellChartData.series ??= [];
  cellChartData.chartOptions ??= columnChartOptions.chartOptions;

  // merge cell options with column options
  mergeProperties(fitChartDataProperties, columnChartOptions.chartOptions, cellChartData.chartOptions);
  mergeProperties(fitChartDataProperties, dfChartOptions.chartOptions, cellChartData.chartOptions);
  for (const series of cellChartData.series) {
    mergeProperties(fitSeriesProperties, cellChartData.seriesOptions, series);
    mergeProperties(fitSeriesProperties, columnChartOptions.seriesOptions, series);
    mergeProperties(fitSeriesProperties, dfChartOptions.seriesOptions, series);
  }

  return cellChartData;
}

/** Returns existing, or creates new dataframe default chart options. */
export function getDataFrameChartOptions(df: DG.DataFrame): IFitChartData {
  return JSON.parse(df.tags[FitConstants.TAG_FIT] ??= JSON.stringify(createDefaultChartData()));
}

/** Returns existing, or creates new column default chart options. */
export function getColumnChartOptions(column: DG.Column): IFitChartData {
  return JSON.parse(column.tags[FitConstants.TAG_FIT] ??= JSON.stringify(createDefaultChartData()));
}

/** Performs a chart layout, returning [viewport, xAxis, yAxis] */
export function layoutChart(rect: DG.Rect, showAxesLabels: boolean, showTitle: boolean): [DG.Rect, DG.Rect?, DG.Rect?] {
  if (rect.width < FitConstants.MIN_AXES_CELL_PX_WIDTH || rect.height < FitConstants.MIN_AXES_CELL_PX_HEIGHT)
    return [rect, undefined, undefined];
  const axesLeftPxMargin = showAxesLabels ? FitConstants.AXES_LEFT_PX_MARGIN_WITH_AXES_LABELS : FitConstants.AXES_LEFT_PX_MARGIN;
  const axesBottomPxMargin = showAxesLabels ? FitConstants.AXES_BOTTOM_PX_MARGIN_WITH_AXES_LABELS : FitConstants.AXES_BOTTOM_PX_MARGIN;
  const axesTopPxMargin = showTitle ? FitConstants.AXES_TOP_PX_MARGIN_WITH_TITLE : FitConstants.AXES_TOP_PX_MARGIN;
  return [
    rect.cutLeft(axesLeftPxMargin).cutBottom(axesBottomPxMargin).cutTop(axesTopPxMargin).cutRight(FitConstants.AXES_RIGHT_PX_MARGIN),
    rect.getBottom(axesBottomPxMargin).getTop(axesTopPxMargin).cutLeft(axesLeftPxMargin).cutRight(FitConstants.AXES_RIGHT_PX_MARGIN),
    rect.getLeft(axesLeftPxMargin).getRight(FitConstants.AXES_RIGHT_PX_MARGIN).cutBottom(axesBottomPxMargin).cutTop(axesTopPxMargin)
  ];
}

/** Checks if the color is valid */
export function isColorValid(color: string | null | undefined): boolean {
  if (color === undefined || color === null || color === '')
    return false;
  return DG.Color.fromHtml(color) !== undefined;
}

/** Performs x zeroes substitution if log x */
export function substituteZeroes(data: IFitChartData): void {
  for (let i = 0; i < data.series?.length!; i++) {
    const series = data.series![i];
    if (series.points.every((p) => p.x !== 0))
      continue;
    let minNonZeroX = Number.MAX_VALUE;
    let maxNonZeroX = 0;
    let countOfDistNonZeroX = 0;
    const uniqueArr: number[] = [];
    for (let j = 0; j < series.points.length; j++) {
      if (series.points[j].x < minNonZeroX && series.points[j].x !== 0)
        minNonZeroX = series.points[j].x;
      if (series.points[j].x > maxNonZeroX && series.points[j].x !== 0)
        maxNonZeroX = series.points[j].x;
      if (!uniqueArr.includes(series.points[j].x)) {
        uniqueArr[uniqueArr.length] = series.points[j].x;
        countOfDistNonZeroX++;
      }
    }
    const zeroSubstitute = Math.pow(10, Math.log10(minNonZeroX) - (Math.log10(maxNonZeroX) - Math.log10(minNonZeroX) / (countOfDistNonZeroX - 1)));
    for (let j = 0; j < series.points.length; j++) {
      if (series.points[j].x === 0)
        series.points[j].x = zeroSubstitute;
    }
  }
}

@grok.decorators.cellRenderer({
  name: 'Fit',
  cellType: 'fit',
  virtual: true,
})
export class FitChartCellRenderer extends DG.GridCellRenderer {
  get name() { return FitConstants.FIT_CELL_TYPE; }

  get cellType() { return FitConstants.FIT_CELL_TYPE; }

  getDefaultSize(gridColumn: DG.GridColumn): {width?: number | null, height?: number | null} {
    return {width: FitConstants.CELL_DEFAULT_WIDTH, height: FitConstants.CELL_DEFAULT_HEIGHT};
  }

  onClick(gridCell: DG.GridCell, e: MouseEvent): void {
    if (!gridCell.cell.value)
      return;

    const data = gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX ?
      convertXMLToIFitChartData(gridCell.cell.value) : getChartData(gridCell);

    for (const [message, condition] of Object.entries(FitConstants.CONDITION_MAP)) {
      if (condition(data.series)) {
        grok.shell.o = ui.divText(message, {style: {color: 'red'}});
        return;
      }
    }

    grok.shell.o = gridCell;

    const screenBounds = gridCell.bounds.inflate(FitConstants.INFLATE_SIZE, FitConstants.INFLATE_SIZE);
    const dataBox = layoutChart(screenBounds, this.areAxesLabelsShown(screenBounds, data),
      this.isTitleShown(screenBounds, data))[0];
    const dataBounds = getChartBounds(data);
    const viewport = new Viewport(dataBounds, dataBox, data.chartOptions?.logX ?? false, data.chartOptions?.logY ?? false);

    for (let i = 0; i < data.series?.length!; i++) {
      if (data.series![i].connectDots || !data.series![i].clickToToggle || data.series![i].showPoints !== 'points' ||
        screenBounds.width < FitConstants.MIN_AXES_CELL_PX_WIDTH || screenBounds.height < FitConstants.MIN_AXES_CELL_PX_HEIGHT)
        continue;
      for (let j = 0; j < data.series![i].points.length!; j++) {
        const p = data.series![i].points[j];
        if (this.hitTest(e, p, viewport)) {
          p.outlier = !p.outlier;
          const columns = gridCell.grid.dataFrame.columns.byTags({'.sourceColumn': gridCell.cell.column.name});
          if (columns) {
            for (const column of columns) {
              const chartLogOptions: LogOptions = {logX: data.chartOptions?.logX, logY: data.chartOptions?.logY};
              const stats = column.tags['.seriesAggregation'] !== null ?
                getChartDataAggrStats(data, column.tags['.seriesAggregation']) :
                column.tags['.seriesNumber'] === i ? calculateSeriesStats(data.series![i], chartLogOptions) : null;
              if (stats === null)
                continue;
              column.set(gridCell.cell.rowIndex, stats[column.tags['.statistics'] as keyof FitStatistics]);  
            }
          }
          
          // temporarily works only for JSON structure
          if (gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) !== FitConstants.TAG_FIT_CHART_FORMAT_3DX) {
            const gridCellValue = JSON.parse(gridCell.cell.value) as IFitChartData;
            gridCellValue.series![i].points[j].outlier = p.outlier;
            gridCell.cell.value = JSON.stringify(gridCellValue);
          }
          return;
        }
      }
    }
  }

  onDoubleClick(gridCell: DG.GridCell, e: MouseEvent): void {
    if (!gridCell.cell.value)
      return;

    const cellRenderViewer = CellRenderViewer.fromGridCell(gridCell);
    const dlg = ui.dialog({title: 'Edit chart'})
      .add(cellRenderViewer.root)
      .show({resizable: true});

    // canvas is created as (300, 150), so we change its size to the dialog contents box size
    const dlgContentsBox = dlg.root.getElementsByClassName('d4-dialog-contents dlg-edit-chart')[0].firstChild as HTMLElement;
    cellRenderViewer.canvas.width = dlgContentsBox.clientWidth;
    cellRenderViewer.canvas.height = dlgContentsBox.clientHeight;
    cellRenderViewer.render();

    // contents ui-box isn't resizable by default
    dlgContentsBox.style.width = '100%';
    dlgContentsBox.style.height = '100%';

    ui.tools.handleResize(dlgContentsBox, (w: number, h: number) => {
      cellRenderViewer.canvas.width = w;
      cellRenderViewer.canvas.height = h;
      cellRenderViewer.render();
    });
  }

  areAxesShown(screenBounds: DG.Rect): boolean {
    return screenBounds.width >= FitConstants.MIN_AXES_CELL_PX_WIDTH && screenBounds.height >= FitConstants.MIN_AXES_CELL_PX_HEIGHT;
  }

  areAxesLabelsShown(screenBounds: DG.Rect, data: IFitChartData): boolean {
    // TODO: make bigger sizes
    return screenBounds.width >= FitConstants.MIN_X_AXIS_NAME_VISIBILITY_PX_WIDTH &&
      screenBounds.height >= FitConstants.MIN_Y_AXIS_NAME_VISIBILITY_PX_HEIGHT && !!data.chartOptions?.xAxisName && !!data.chartOptions.yAxisName;
  }

  isTitleShown(screenBounds: DG.Rect, data: IFitChartData): boolean {
    return screenBounds.width >= FitConstants.MIN_TITLE_PX_WIDTH && screenBounds.height >= FitConstants.MIN_TITLE_PX_HEIGHT && !!data.chartOptions?.title;
  }

  isLegendShown(screenBounds: DG.Rect): boolean {
    return screenBounds.width >= FitConstants.MIN_LEGEND_PX_WIDTH && screenBounds.height >= FitConstants.MIN_LEGEND_PX_HEIGHT;
  }

  areDroplinesShown(screenBounds: DG.Rect): boolean {
    return screenBounds.width >= FitConstants.MIN_DROPLINES_VISIBILITY_PX_WIDTH && screenBounds.height >= FitConstants.MIN_DROPLINES_VISIBILITY_PX_HEIGHT;
  }

  renderCurves(g: CanvasRenderingContext2D, screenBounds: DG.Rect, data: IFitChartData): void {
    g.save();
    g.beginPath();
    g.rect(screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height);
    g.clip();

    if (data.chartOptions?.allowXZeroes && data.chartOptions?.logX &&
      data.series?.some((series) => series.points.some((p) => p.x === 0)))
      substituteZeroes(data);
    const [dataBox, xAxisBox, yAxisBox] = layoutChart(screenBounds,
      this.areAxesLabelsShown(screenBounds, data), this.isTitleShown(screenBounds, data));

    const dataBounds = getChartBounds(data);
    if ((dataBounds.x < 0 && data.chartOptions) || (dataBounds.x === 0 && data.chartOptions && !data.chartOptions.allowXZeroes))
      data.chartOptions.logX = false;
    if (dataBounds.y <= 0 && data.chartOptions)
      data.chartOptions.logY = false;
    const viewport = new Viewport(dataBounds, dataBox, data.chartOptions?.logX ?? false, data.chartOptions?.logY ?? false);
    const minSize = Math.min(dataBox.width, dataBox.height);
    // TODO: make thinner
    const ratio = minSize > 100 ? 1 : 0.2 + (minSize / 100) * 0.8;
    const chartLogOptions: LogOptions = {logX: data.chartOptions?.logX, logY: data.chartOptions?.logY};

    g.save();
    g.font = '11px Roboto, "Roboto Local"';
    viewport.drawCoordinateGrid(g, xAxisBox, yAxisBox);
    g.restore();

    for (let i = 0; i < data.series?.length!; i++) {
      const series = data.series![i];
      if (series.points.some((point) => point.x === undefined || point.y === undefined))
        continue;
      if (screenBounds.width < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_WIDTH ||
        screenBounds.height < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_HEIGHT) {
        series.showPoints = '';
        if (data.chartOptions)
          data.chartOptions.showStatistics = [];
      }
      series.points.sort((a, b) => a.x - b.x);

      let userParamsFlag = true;
      const fitFunc = getSeriesFitFunction(series);
      let curve: ((x: number) => number) | null = null;
      if (!(series.connectDots && !series.showFitLine)) {
        if (series.parameters) {
          if (data.chartOptions?.logX) {
            if (series.parameters[2] > 0)
              series.parameters[2] = Math.log10(series.parameters[2]);
          }
          curve = getCurve(series, fitFunc);
        }
        else {
          const fitResult = fitSeries(series, fitFunc, chartLogOptions);
          curve = fitResult.fittedCurve;
          const params = [...fitResult.parameters]
          series.parameters = params;
          userParamsFlag = false;
        }
      }

      assignSeriesColors(series, i);
      renderConnectDots(g, series, {viewport, ratio});
      renderPoints(g, series, {viewport, ratio});
      renderFitLine(g, series, {viewport, ratio, logOptions: chartLogOptions, showAxes: this.areAxesShown(screenBounds),
        showAxesLabels: this.areAxesLabelsShown(screenBounds, data), screenBounds, curveFunc: curve!});
      renderConfidenceIntervals(g, series, {viewport, logOptions: chartLogOptions, showAxes: this.areAxesShown(screenBounds),
        showAxesLabels: this.areAxesLabelsShown(screenBounds, data), screenBounds, fitFunc, userParamsFlag});
      if (series.parameters)
        renderDroplines(g, series, {viewport, ratio, showDroplines: this.areDroplinesShown(screenBounds),
          xValue: series.parameters![2], dataBounds, curveFunc: curve!, logOptions: chartLogOptions});
      renderStatistics(g, series, {statistics: data.chartOptions?.showStatistics, fitFunc,
        logOptions: chartLogOptions, dataBox});
    }

    renderTitle(g, {showTitle: this.isTitleShown(screenBounds, data), title: data.chartOptions?.title, dataBox, screenBounds});
    renderAxesLabels(g, {showTitle: this.isTitleShown(screenBounds, data), dataBox, screenBounds,
      showAxesLabels: this.areAxesLabelsShown(screenBounds, data), xAxisName: data.chartOptions?.xAxisName,
      yAxisName: data.chartOptions?.yAxisName});
    renderLegend(g, data, {showLegend: this.isLegendShown(screenBounds), dataBox, ratio});

    g.restore();
  }

  // TODO: Curves: make less margins in the right, also in the left
  // TODO: Curves: add a warning or error in top right if some mistakes in data
  render(g: CanvasRenderingContext2D,
         x: number, y: number, w: number, h: number,
         gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    if (!gridCell.cell.value)
      return;
    if (w < FitConstants.MIN_CELL_RENDERER_PX_WIDTH || h < FitConstants.MIN_CELL_RENDERER_PX_HEIGHT)
      return;

    const data = gridCell.cell.column?.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX ?
      convertXMLToIFitChartData(gridCell.cell.value) : getChartData(gridCell);
    const screenBounds = new DG.Rect(x, y, w, h).inflate(FitConstants.INFLATE_SIZE, FitConstants.INFLATE_SIZE);

    for (const [message, condition] of Object.entries(FitConstants.CONDITION_MAP)) {
      if (condition(data.series)) {
        showIncorrectFitCell(g, screenBounds);
        return;
      }
    }

    data.series?.forEach((series) => series.columnName = gridCell.cell.column.name);
    if (data.chartOptions?.mergeSeries)
      data.series = [mergeSeries(data.series!)!];

    this.renderCurves(g, screenBounds, data);
  }

  hitTest(e: MouseEvent, point: IFitPoint, viewport: Viewport): boolean {
    const screenX = viewport.xToScreen(point.x);
    const screenY = viewport.yToScreen(point.y);
    const pxPerMarkerType = ((point.outlier ? FitConstants.OUTLIER_PX_SIZE : FitConstants.POINT_PX_SIZE) / 2) + FitConstants.OUTLIER_HITBOX_RADIUS;
    const pointRect = new DG.Rect(screenX - pxPerMarkerType, screenY - pxPerMarkerType,
      2 * pxPerMarkerType, 2 * pxPerMarkerType);
    return pointRect.containsPoint(new DG.Point(e.offsetX, e.offsetY));
  }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    if (!gridCell.cell.value)
      return;

    const screenBounds = gridCell.bounds.inflate(FitConstants.INFLATE_SIZE, FitConstants.INFLATE_SIZE);
    if (screenBounds.width < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_WIDTH ||
      screenBounds.height < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_HEIGHT) {
      const canvas = ui.canvas(300, 200);
      this.render(canvas.getContext('2d')!, 0, 0, 300, 200, gridCell, null as any);
      const content = ui.divV([canvas]);
      ui.tooltip.show(content, e.x, e.y);
    }

    // TODO: add caching
    const data = gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX
      ? convertXMLToIFitChartData(gridCell.cell.value)
      : getChartData(gridCell);

    if (screenBounds.width >= FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_WIDTH &&
      screenBounds.height >= FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_HEIGHT) {
      const dataBox = layoutChart(screenBounds, this.areAxesLabelsShown(screenBounds, data), this.isTitleShown(screenBounds, data))[0];
      const dataBounds = getChartBounds(data);
      const viewport = new Viewport(dataBounds, dataBox, data.chartOptions?.logX ?? false, data.chartOptions?.logY ?? false);

      for (let i = 0; i < data.series?.length!; i++) {
        if (data.series![i].showPoints !== 'points')
          continue;
        for (let j = 0; j < data.series![i].points.length!; j++) {
          const p = data.series![i].points[j];
          if (this.hitTest(e, p, viewport)) {
            ui.tooltip.show(ui.divV([ui.divText(`x: ${DG.format(p.x, '#0.000')}`),
              ui.divText(`y: ${DG.format(p.y, '#0.000')}`)]), e.x + 16, e.y + 16);
            if (!data.series![i].connectDots && data.series![i].clickToToggle && screenBounds.width >= FitConstants.MIN_AXES_CELL_PX_WIDTH &&
              screenBounds.height >= FitConstants.MIN_AXES_CELL_PX_HEIGHT)
              document.body.style.cursor = 'pointer';
            return;
          }
        }
      }
      ui.tooltip.hide();
    }
    document.body.style.cursor = 'default';
  }
}

const sample: IFitChartData = {
  // chartOptions could be retrieved either from the column, or from the cell
  'chartOptions': {
    'minX': 0, 'minY': 0, 'maxX': 5, 'maxY': 10,
    'xAxisName': 'concentration',
    'yAxisName': 'activity',
    'logX': false,
    'logY': false,
  },
  // These options are used as default options for the series. They could be overridden in series.
  'seriesOptions': {
    'fitFunction': 'sigmoid',
    // parameters not specified -> auto-fitting by default
    'pointColor': 'blue',
    'fitLineColor': 'red',
    'clickToToggle': true,
    'showPoints': 'points',
    'showFitLine': true,
    'showCurveConfidenceInterval': true,
  },
  'series': [
    {
      'fitFunction': 'sigmoid',
      // parameters specified -> use them, no autofitting
      'parameters': [1.86011e-07, -0.900, 103.748, -0.001],
      'points': [
        {'x': 0, 'y': 0},
        {'x': 1, 'y': 0.5},
        {'x': 2, 'y': 1},
        {'x': 3, 'y': 10, 'outlier': true},
        {'x': 4, 'y': 0},
      ],
    },
  ],
};
