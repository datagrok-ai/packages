import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {
  getSeriesStatistics,
  getSeriesFitFunction,
  LogOptions,
  getChartBounds,
} from '@datagrok-libraries/statistics/src/fit/fit-data';
import {statisticsProperties, fitSeriesProperties, fitChartDataProperties, IFitChartData, IFitSeries, IFitChartOptions, IFitSeriesOptions, FitStatistics} from '@datagrok-libraries/statistics/src/fit/fit-curve';
import {
  getOrCreateParsedChartData,
  getColumnChartOptions,
  getDataFrameChartOptions,
  isColorValid,
  mergeProperties,
  substituteZeroes, getOrCreateCachedFitCurve, getOrCreateCachedCurvesDataPoints, FitChartCellRenderer
} from './fit-renderer';
import {convertXMLToIFitChartData} from './fit-parser';
import {FitConstants} from './const';
import {ColorType, getSeriesColor} from './render-utils';


const CHART_OPTIONS = 'chartOptions';
const SERIES_OPTIONS = 'seriesOptions';
enum MANIPULATION_LEVEL {
  DATAFRAME = 'Dataframe',
  COLUMN = 'Column',
  CELL = 'Cell'
}
const AGGREGATION_TYPES: {[key: string]: string} = {
  'count': 'totalCount',
  'nulls': 'missingValueCount',
  'unique': 'uniqueCount',
  'values': 'valueCount',
  'min': 'min',
  'max': 'max',
  'sum': 'sum',
  'avg': 'avg',
  'stdev': 'stdev',
  'variance': 'variance',
  'skew': 'skew',
  'kurt': 'kurt',
  'med': 'med',
  'q1': 'q1',
  'q2': 'q2',
  'q3': 'q3'
};


export function calculateSeriesStats(series: IFitSeries, seriesIdx: number, chartLogOptions: LogOptions,
  gridCell: DG.GridCell): FitStatistics {
  const fitFunction = getSeriesFitFunction(series);
  if (series.parameters) {
    if (chartLogOptions.logX)
      if (series.parameters[2] > 0)
        series.parameters[2] = Math.log10(series.parameters[2]);
  }
  else {
    const params = getOrCreateCachedFitCurve(series, seriesIdx, fitFunction, chartLogOptions, gridCell).parameters;
    series.parameters = [...params];
  }

  const seriesStatistics = getSeriesStatistics(series, fitFunction,
    getOrCreateCachedCurvesDataPoints(series, seriesIdx, chartLogOptions, false, gridCell), chartLogOptions);
  return seriesStatistics;
}

export function getChartDataAggrStats(chartData: IFitChartData, aggrType: string, gridCell: DG.GridCell): FitStatistics {
  const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
  const rSquaredValues: number[] = [], aucValues: number[] = [], interceptXValues: number[] =  [], interceptYValues: number[] = [],
    slopeValues: number[] = [], topValues: number[] = [], bottomValues: number[] = [];
  for (let i = 0, j = 0; i < chartData.series?.length!; i++) {
    if (chartData.series![i].points.every((p) => p.outlier))
      continue;
    const seriesStats = calculateSeriesStats(chartData.series![i], i, chartLogOptions, gridCell);
    rSquaredValues[j] = seriesStats.rSquared!;
    aucValues[j] = seriesStats.auc!;
    interceptXValues[j] = seriesStats.interceptX!;
    interceptYValues[j] = seriesStats.interceptY!;
    slopeValues[j] = seriesStats.slope!;
    topValues[j] = seriesStats.top!;
    bottomValues[j] = seriesStats.bottom!;
    j++;
  }

  return {
    rSquared: rSquaredValues.some((elem) => elem === undefined || elem === null) ? undefined:
      DG.Stats.fromValues(rSquaredValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    auc: aucValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(aucValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    interceptX: interceptXValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(interceptXValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    interceptY: interceptYValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(interceptYValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    slope: slopeValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(slopeValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    top: topValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(topValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    bottom: bottomValues.some((elem) => elem === undefined || elem === null) ? undefined :
      DG.Stats.fromValues(bottomValues)[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number
  };
}

function changePlotOptions(chartData: IFitChartData, inputBase: DG.InputBase, options: string): void {
  const propertyName = inputBase.property.name as string;
  if (options === CHART_OPTIONS) {
    if (chartData.chartOptions === undefined) return;
    (chartData.chartOptions[propertyName as keyof IFitChartOptions] as any) = inputBase.value;
  }
  else if (options === SERIES_OPTIONS) {
    if (chartData.series === undefined) return;
    for (let i = 0; i < chartData.series.length; i++)
      (chartData.series[i][propertyName as keyof IFitSeries] as any) = inputBase.value;
  }
}

function convertJnJColumnToJSON(column: DG.Column): void {
  for (let i = 0; i < column.length; i++) {
    const value = column.get(i);
    if (value === '') continue;
    const chartData: IFitChartData = convertXMLToIFitChartData(value);
    column.set(i, JSON.stringify(chartData));
  }
  column.setTag(FitConstants.TAG_FIT_CHART_FORMAT, '');
}

function detectSettings(df: DG.DataFrame): void {
  const fitColumns = df.columns.bySemTypeAll(FitConstants.FIT_SEM_TYPE);
  for (let i = 0; i < fitColumns.length; i++) {
    fitChartDataProperties.map((prop) => {
      fitColumns[i].temp[`${CHART_OPTIONS}-custom-${prop.name}`] = false;
    });
    fitSeriesProperties.map((prop) => {
      fitColumns[i].temp[`${SERIES_OPTIONS}-custom-${prop.name}`] = false;
    });
    if (fitColumns[i].getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX)
      convertJnJColumnToJSON(fitColumns[i]);

    for (let j = 0; j < fitColumns[i].length; j++) {
      if (fitColumns[i].get(j) === '') continue;
      const chartData = (JSON.parse(fitColumns[i].get(j) ?? '{}') ?? {}) as IFitChartData;

      fitChartDataProperties.map((prop) => {
        if (!chartData.chartOptions) return;
        if (chartData.chartOptions[prop.name as keyof IFitChartOptions] !== undefined)
          fitColumns[i].temp[`${CHART_OPTIONS}-custom-${prop.name}`] = true;
      });

      fitSeriesProperties.map((prop) => {
        if (!chartData.series) return;
        for (const series of chartData.series) {
          if (series[prop.name as keyof IFitSeriesOptions] !== undefined)
            fitColumns[i].temp[`${SERIES_OPTIONS}-custom-${prop.name}`] = true;
        }
      });
    }
  }
}

function changeCurvesOptions(gridCell: DG.GridCell, inputBase: DG.InputBase, options: string, manipulationLevel: string): void {
  if (gridCell.cell.column.temp[`${CHART_OPTIONS}-custom-title`] === undefined)
    detectSettings(gridCell.cell.dataFrame);
  const propertyName = inputBase.property.name as string;
  const chartOptions = manipulationLevel === MANIPULATION_LEVEL.DATAFRAME ?
    getDataFrameChartOptions(gridCell.cell.dataFrame) : getColumnChartOptions(gridCell.cell.column);
  if (options === CHART_OPTIONS)
    (chartOptions.chartOptions![propertyName as keyof IFitChartOptions] as any) = inputBase.value;
  else if (options === SERIES_OPTIONS)
    (chartOptions.seriesOptions![propertyName as keyof IFitSeriesOptions] as any) = inputBase.value;

  if (manipulationLevel === MANIPULATION_LEVEL.CELL) {
    const value = gridCell.cell.value;
    if (value === '') return;
    const chartData: IFitChartData = JSON.parse(value ?? '{}') ?? {};
    changePlotOptions(chartData, inputBase, options);
    gridCell.cell.value = JSON.stringify(chartData);
  }
  else {
    let columns: DG.Column[];
    if (manipulationLevel === MANIPULATION_LEVEL.DATAFRAME) {
      gridCell.cell.dataFrame.tags[FitConstants.TAG_FIT] = JSON.stringify(chartOptions);
      columns = gridCell.cell.dataFrame.columns.bySemTypeAll(FitConstants.FIT_SEM_TYPE);
    }
    else {
      gridCell.cell.column.tags[FitConstants.TAG_FIT] = JSON.stringify(chartOptions);
      columns = [gridCell.cell.column];
    }
    
    for (let i = 0; i < columns.length; i++) {
      if (manipulationLevel === MANIPULATION_LEVEL.DATAFRAME) {
        const columnChartOptions = getColumnChartOptions(columns[i]);
        options === CHART_OPTIONS ? delete columnChartOptions.chartOptions![propertyName as keyof IFitChartOptions] :
          delete columnChartOptions.seriesOptions![propertyName as keyof IFitSeriesOptions];
        columns[i].tags[FitConstants.TAG_FIT] = JSON.stringify(columnChartOptions);
      }
      if (columns[i].temp[`${options}-custom-${propertyName}`] === false) continue;

      columns[i].init((j) => {
        const value = columns[i].get(j);
        if (value === '') return value;
        const chartData = (JSON.parse(columns[i].get(j) ?? '{}') ?? {}) as IFitChartData;
        if (options === CHART_OPTIONS) {
          if (chartData.chartOptions === undefined) return value;
          if (chartData.chartOptions[propertyName as keyof IFitChartOptions] === undefined)
            return value;
          delete chartData.chartOptions[propertyName as keyof IFitChartOptions];
        }
        else {
          if (chartData.series === undefined) return value;
          let isSeriesChanged = false;
          for (const series of chartData.series)
            if (series[propertyName as keyof IFitSeriesOptions] !== undefined) {
              delete series[propertyName as keyof IFitSeriesOptions];
              isSeriesChanged = true;
            }
          if (chartData.seriesOptions)
            delete chartData.seriesOptions[propertyName as keyof IFitSeriesOptions];
          if (!isSeriesChanged) return value;
        }
        return JSON.stringify(chartData);
      });
      columns[i].temp[`${options}-custom-${propertyName}`] = false;
    }
  }
  gridCell.grid.invalidate();
}


export class FitGridCellHandler extends DG.ObjectHandler {
  get type(): string {
    return 'GridCell';
  }

  isApplicable(x: any): boolean {
    return x instanceof DG.GridCell && x.cellType === FitConstants.FIT_CELL_TYPE;
  }
  
  // TODO: add aspect ratio for the cell
  // TODO: add legend
  // TODO: add the table for the values on the cell or don't render it at all
  // TODO: fix the curves demo app

  renderProperties(gridCell: DG.GridCell, context: any = null): HTMLElement {
    const acc = ui.accordion('Curves property panel');
    // TODO: make just the base ui.input.choice after nullable option is added
    const switchProperty = DG.Property.js('level', DG.TYPE.STRING, {description: 'Controls the level at which properties will be switched',
      defaultValue: 'Column', choices: ['Dataframe', 'Column', 'Cell'], nullable: false});
    const switchLevelInput = ui.input.forProperty(switchProperty);

    // temporarily because input doesn't show the tooltip
    ui.tooltip.bind(switchLevelInput.captionLabel, 'Controls the level at which properties will be switched');

    const chartData = getOrCreateParsedChartData(gridCell);
    const columnChartOptions = getColumnChartOptions(gridCell.cell.column);
    const dfChartOptions = getDataFrameChartOptions(gridCell.cell.dataFrame);

    const seriesOptionsRefresh = {onValueChanged: (v: any, inputBase: DG.InputBase) => 
      changeCurvesOptions(gridCell, inputBase, SERIES_OPTIONS, switchLevelInput.value)};
    const chartOptionsRefresh = {onValueChanged: (v: any, inputBase: DG.InputBase) =>
      changeCurvesOptions(gridCell, inputBase, CHART_OPTIONS, switchLevelInput.value)};

    const setValidColors = (colorFieldName: string) => {
      if (dfChartOptions.seriesOptions && !isColorValid(dfChartOptions.seriesOptions[colorFieldName]) &&
        columnChartOptions.seriesOptions && !isColorValid(columnChartOptions.seriesOptions[colorFieldName])) {
        if (chartData.seriesOptions) {
          if (!isColorValid(chartData.seriesOptions[colorFieldName]))
            chartData.seriesOptions[colorFieldName] = DG.Color.toHtml(colorFieldName === 'outlierColor' ?
              DG.Color.red : DG.Color.getCategoricalColor(0));
        }
        else {
          if (!isColorValid(chartData.series ? chartData.series[0][colorFieldName] : ''))
            chartData.series![0][colorFieldName] = DG.Color.toHtml(colorFieldName === 'outlierColor' ?
              DG.Color.red : DG.Color.getCategoricalColor(0));
        }
      }
    }

    setValidColors('pointColor');
    setValidColors('fitLineColor');
    setValidColors('outlierColor');

    mergeProperties(fitSeriesProperties, columnChartOptions.seriesOptions, chartData.seriesOptions ? chartData.seriesOptions :
      chartData.series ? chartData.series[0] ?? {} : {});
    mergeProperties(fitSeriesProperties, dfChartOptions.seriesOptions, chartData.seriesOptions ? chartData.seriesOptions :
      chartData.series ? chartData.series[0] ?? {} : {});
    mergeProperties(fitChartDataProperties, columnChartOptions.chartOptions,
      chartData.chartOptions ? chartData.chartOptions : {});
    mergeProperties(fitChartDataProperties, dfChartOptions.chartOptions,
      chartData.chartOptions ? chartData.chartOptions : {});

    if (chartData.chartOptions?.allowXZeroes && chartData.chartOptions?.logX &&
      chartData.series?.some((series) => series.points.some((p) => p.x === 0)))
      substituteZeroes(chartData);

    const form = ui.form([switchLevelInput]);
    const fitSeriesChildren = fitSeriesProperties.map((p) => ui.input.forProperty(p, chartData.seriesOptions ? chartData.seriesOptions : chartData.series![0], seriesOptionsRefresh));
    ui.forms.addGroup(form, 'Series options', fitSeriesChildren);
    ui.forms.addGroup(form, 'Chart options', fitChartDataProperties.map((p) => ui.input.forProperty(p, chartData.chartOptions, chartOptionsRefresh)));
    acc.addPane('Options', () => form);

    const choices = (chartData.series?.length ?? 0) > 1 ? ['all', 'aggregated'] : ['all'];
    const seriesStatsProperty = DG.Property.js('series', DG.TYPE.STRING,
      {description: 'Controls whether to show series statistics or aggregated statistics',
        defaultValue: 'all', choices: choices, nullable: false});
    const seriesStatsInput = ui.input.forProperty(seriesStatsProperty, null, {onValueChanged: () => {
      acc.getPane('Fit').root.lastElementChild!.replaceChildren(createFitPane());
    }});
    const aggrTypeProperty = DG.Property.js('aggregation type', DG.TYPE.STRING,
      {description: 'Controls which aggregation to use on the series statistics',
        defaultValue: 'med', choices: Object.values(DG.STATS), nullable: false});
    const aggrTypeInput = ui.input.forProperty(aggrTypeProperty, null, {onValueChanged: () => {
      acc.getPane('Fit').root.lastElementChild!.replaceChildren(createFitPane());
    }});

    function createFitPane(): HTMLElement {
      const hostItems = (chartData.series?.length ?? 0) > 1 ? seriesStatsInput.stringValue === 'aggregated' ?
        [seriesStatsInput.root, aggrTypeInput.root] : [seriesStatsInput.root] : null;
      const host = ui.divV(hostItems!);
      const dataBounds = getChartBounds(chartData);
      if (dataBounds.x <= 0 && chartData.chartOptions) chartData.chartOptions.logX = false;
      if (dataBounds.y <= 0 && chartData.chartOptions) chartData.chartOptions.logY = false;

      if (seriesStatsInput.stringValue === 'all') {
        const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
        for (let i = 0; i < chartData.series!.length; i++) {
          const series = chartData.series![i];
          const seriesStatistics = calculateSeriesStats(series, i, chartLogOptions, gridCell);
  
          const color = getSeriesColor(series, i, ColorType.FIT_LINE);
          const seriesName = series.name ?? 'series ' + i;
          host.appendChild(ui.panel([
            ui.h1(seriesName, {style: {color: color}}),
            ui.input.form(seriesStatistics, statisticsProperties, {
              onCreated: (input) => input.root.appendChild(ui.iconFA('plus', async () => {
                  const funcParams = {df: gridCell.cell.dataFrame, colName: gridCell.gridColumn.name, propName: input.property.name, seriesName: seriesName, seriesNumber: i};
                  await DG.Func.find({name: 'addStatisticsColumn'})[0].prepare(funcParams).call(undefined, undefined, {processed: false});
                }, `Calculate ${input.property.name} for the whole column`))
            })
          ]));
        }
      }
      else {
        const seriesStatistics = getChartDataAggrStats(chartData, aggrTypeInput.stringValue, gridCell);
        host.appendChild(ui.panel([
            ui.h1(`series ${aggrTypeInput.stringValue}`),
            ui.input.form(seriesStatistics, statisticsProperties, {
              onCreated: (input) => input.root.appendChild(ui.iconFA('plus', async () => {
                  const funcParams = {df: gridCell.cell.dataFrame, colName: gridCell.gridColumn.name, propName: input.property.name, aggrType: aggrTypeInput.stringValue};
                  await DG.Func.find({name: 'addAggrStatisticsColumn'})[0].prepare(funcParams).call(undefined, undefined, {processed: false});
                }, `Calculate ${input.property.name} ${aggrTypeInput.stringValue} for the whole column`))
            })
          ]));
      }

      return host;
    }

    const chartPane = acc.addPane('Chart', () => DG.GridCellWidget.fromGridCell(gridCell).root);
    const screenBounds = FitChartCellRenderer.inflateScreenBounds(gridCell.bounds);
    if (screenBounds.width < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_WIDTH ||
      screenBounds.height < FitConstants.MIN_POINTS_AND_STATS_VISIBILITY_PX_HEIGHT)
      chartPane.expanded = true;

    acc.addPane('Fit', () => createFitPane());

    return acc.root;
  }
}
