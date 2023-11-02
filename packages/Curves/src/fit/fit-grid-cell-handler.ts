import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {
  fitSeries,
  getColumnChartOptions,
  getSeriesStatistics,
  getSeriesFitFunction,
  getDataFrameChartOptions,
  LogOptions,
} from '@datagrok-libraries/statistics/src/fit/fit-data';
import {statisticsProperties, fitSeriesProperties, fitChartDataProperties, FIT_CELL_TYPE, TAG_FIT, IFitChartData, IFitSeries, IFitChartOptions, FIT_SEM_TYPE, IFitSeriesOptions, FitStatistics} from '@datagrok-libraries/statistics/src/fit/fit-curve';
import {TAG_FIT_CHART_FORMAT, TAG_FIT_CHART_FORMAT_3DX, getChartData, isColorValid, mergeProperties} from './fit-renderer';
import {CellRenderViewer} from './cell-render-viewer';
import {convertXMLToIFitChartData} from './fit-parser';


const SOURCE_COLUMN_TAG = '.sourceColumn';
const SERIES_NUMBER_TAG = '.seriesNumber';
const SERIES_AGGREGATION_TAG = '.seriesAggregation';
const STATISTICS_TAG = '.statistics';
const CHART_OPTIONS = 'chartOptions';
const SERIES_OPTIONS = 'seriesOptions';
enum MANIPULATION_LEVEL {
  DATAFRAME = 'Dataframe',
  COLUMN = 'Column',
  CELL = 'Cell'
};
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


export function calculateSeriesStats(series: IFitSeries, chartLogOptions: LogOptions): FitStatistics {
  const fitFunction = getSeriesFitFunction(series);
  if (series.parameters) {
    if (chartLogOptions.logX)
      if (series.parameters[2] > 0)
        series.parameters[2] = Math.log10(series.parameters[2]);
  }
  else 
    series.parameters = fitSeries(series, fitFunction, chartLogOptions).parameters;

  const seriesStatistics = getSeriesStatistics(series, fitFunction, chartLogOptions);
  return seriesStatistics;
}

export function getChartDataAggrStats(chartData: IFitChartData, aggrType: string): FitStatistics {
  const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
  const rSquaredValues: number[] = [], aucValues: number[] = [], interceptXValues: number[] =  [], interceptYValues: number[] = [],
    slopeValues: number[] = [], topValues: number[] = [], bottomValues: number[] = [];
  for (let i = 0, j = 0; i < chartData.series?.length!; i++) {
    if (chartData.series![i].points.every((p) => p.outlier))
      continue;
    const seriesStats = calculateSeriesStats(chartData.series![i], chartLogOptions);
    rSquaredValues[j] = seriesStats.rSquared!;
    aucValues[j] = seriesStats.auc!;
    interceptXValues[j] = seriesStats.interceptX;
    interceptYValues[j] = seriesStats.interceptY;
    slopeValues[j] = seriesStats.slope;
    topValues[j] = seriesStats.top!;
    bottomValues[j] = seriesStats.bottom!;
    j++;
  }

  return {
    rSquared: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'rSquared', rSquaredValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    auc: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'auc', aucValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    interceptX: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'interceptX', interceptXValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    interceptY: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'interceptY', interceptYValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    slope: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'slope', slopeValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    top: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'top', topValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number,
    bottom: DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'bottom', bottomValues).stats[AGGREGATION_TYPES[aggrType] as keyof DG.Stats] as number
  };
}

function addStatisticsColumn(chartColumn: DG.GridColumn, p: DG.Property, series: IFitSeries, seriesNumber: number): void {
  const grid = chartColumn.grid;
  const column = DG.Column.float(`${chartColumn.name}_${series.name}_${p.name}`, chartColumn.column?.length);
  column.tags[SOURCE_COLUMN_TAG] = chartColumn.name;
  column.tags[SERIES_NUMBER_TAG] = seriesNumber;
  column.tags[STATISTICS_TAG] = p.name;

  column
    .init((i) => {
      const gridCell = DG.GridCell.fromColumnRow(grid, chartColumn.name, grid.tableRowToGrid(i));
      if (gridCell.cell.value === '')
        return null;
      const chartData = gridCell.cell.column.getTag(TAG_FIT_CHART_FORMAT) === TAG_FIT_CHART_FORMAT_3DX ?
        convertXMLToIFitChartData(gridCell.cell.value) : getChartData(gridCell);
      if (chartData.series![seriesNumber] === undefined || chartData.series![seriesNumber].points.every((p) => p.outlier))
        return null;
      const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
      const fitResult = calculateSeriesStats(chartData.series![seriesNumber], chartLogOptions);
      return p.get(fitResult);
    });
  grid.dataFrame.columns.insert(column, chartColumn.idx);
}

function addAggrStatisticsColumn(chartColumn: DG.GridColumn, p: DG.Property, aggrType: string): void {
  const grid = chartColumn.grid;
  const column = DG.Column.float(`${chartColumn.name}_${aggrType}_${p.name}`, chartColumn.column?.length);
  column.tags[SOURCE_COLUMN_TAG] = chartColumn.name;
  column.tags[SERIES_AGGREGATION_TAG] = aggrType;
  column.tags[STATISTICS_TAG] = p.name;

  column
    .init((i) => {
      const gridCell = DG.GridCell.fromColumnRow(grid, chartColumn.name, grid.tableRowToGrid(i));
      if (gridCell.cell.value === '')
        return null;
      const chartData = gridCell.cell.column.getTag(TAG_FIT_CHART_FORMAT) === TAG_FIT_CHART_FORMAT_3DX ?
        convertXMLToIFitChartData(gridCell.cell.value) : getChartData(gridCell);
      if (chartData.series?.every((series) => series.points.every((p) => p.outlier)))
        return null;
      const fitResult = getChartDataAggrStats(chartData, aggrType);
      return p.get(fitResult);
    });
  grid.dataFrame.columns.insert(column, chartColumn.idx);
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
  column.setTag(TAG_FIT_CHART_FORMAT, '');
}

function detectSettings(df: DG.DataFrame): void {
  const fitColumns = df.columns.bySemTypeAll(FIT_SEM_TYPE);
  for (let i = 0; i < fitColumns.length; i++) {
    fitChartDataProperties.map((prop) => {
      fitColumns[i].temp[`${CHART_OPTIONS}-custom-${prop.name}`] = false;
    });
    fitSeriesProperties.map((prop) => {
      fitColumns[i].temp[`${SERIES_OPTIONS}-custom-${prop.name}`] = false;
    });
    if (fitColumns[i].getTag(TAG_FIT_CHART_FORMAT) === TAG_FIT_CHART_FORMAT_3DX)
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
      gridCell.cell.dataFrame.tags[TAG_FIT] = JSON.stringify(chartOptions);
      columns = gridCell.cell.dataFrame.columns.bySemTypeAll(FIT_SEM_TYPE);
    }
    else {
      gridCell.cell.column.tags[TAG_FIT] = JSON.stringify(chartOptions);
      columns = [gridCell.cell.column];
    }
    
    for (let i = 0; i < columns.length; i++) {
      if (manipulationLevel === MANIPULATION_LEVEL.DATAFRAME) {
        const columnChartOptions = getColumnChartOptions(columns[i]);
        options === CHART_OPTIONS ? delete columnChartOptions.chartOptions![propertyName as keyof IFitChartOptions] :
          delete columnChartOptions.seriesOptions![propertyName as keyof IFitSeriesOptions];
        columns[i].tags[TAG_FIT] = JSON.stringify(columnChartOptions);
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
    return x instanceof DG.GridCell && x.cellType === FIT_CELL_TYPE;
  }
  
  // TODO: add aspect ratio for the cell
  // TODO: add legend
  // TODO: add the table for the values on the cell or don't render it at all
  // TODO: fix the curves demo app

  renderProperties(gridCell: DG.GridCell, context: any = null): HTMLElement {
    const acc = ui.accordion('Curves property panel');
    // TODO: make just the base ui.choiceInput after nullable option is added
    const switchProperty = DG.Property.js('level', DG.TYPE.STRING, {description: 'Controls the level at which properties will be switched',
      defaultValue: 'Column', choices: ['Dataframe', 'Column', 'Cell'], nullable: false});
    const switchLevelInput = ui.input.forProperty(switchProperty);

    // temporarily because input doesn't show the tooltip
    ui.tooltip.bind(switchLevelInput.captionLabel, 'Controls the level at which properties will be switched');

    const chartData = getChartData(gridCell);
    const columnChartOptions = getColumnChartOptions(gridCell.cell.column);
    const dfChartOptions = getDataFrameChartOptions(gridCell.cell.dataFrame);

    const seriesOptionsRefresh = {onValueChanged: (inputBase: DG.InputBase) => 
      changeCurvesOptions(gridCell, inputBase, SERIES_OPTIONS, switchLevelInput.value)};
    const chartOptionsRefresh = {onValueChanged: (inputBase: DG.InputBase) =>
      changeCurvesOptions(gridCell, inputBase, CHART_OPTIONS, switchLevelInput.value)};

    if (!isColorValid(dfChartOptions.seriesOptions?.pointColor) && !isColorValid(columnChartOptions.seriesOptions?.pointColor)) {
      if (chartData.seriesOptions) {
        if (!isColorValid(chartData.seriesOptions.pointColor))
          chartData.seriesOptions.pointColor = DG.Color.toHtml(DG.Color.getCategoricalColor(0));
      }
      else {
        if (!isColorValid(chartData.series ? chartData.series![0].pointColor : ''))
          chartData.series![0].pointColor = DG.Color.toHtml(DG.Color.getCategoricalColor(0));
      }
    }

    if (!isColorValid(dfChartOptions.seriesOptions?.fitLineColor) && !isColorValid(columnChartOptions.seriesOptions?.fitLineColor)) {
      if (chartData.seriesOptions) {
        if (!isColorValid(chartData.seriesOptions.fitLineColor))
          chartData.seriesOptions.fitLineColor = DG.Color.toHtml(DG.Color.getCategoricalColor(0));
      }
      else {
        if (!isColorValid(chartData.series ? chartData.series![0].fitLineColor : ''))
          chartData.series![0].fitLineColor = DG.Color.toHtml(DG.Color.getCategoricalColor(0));
      }
    }

    mergeProperties(fitSeriesProperties, columnChartOptions.seriesOptions, chartData.seriesOptions ? chartData.seriesOptions :
      chartData.series ? chartData.series[0] ?? {} : {});
    mergeProperties(fitSeriesProperties, dfChartOptions.seriesOptions, chartData.seriesOptions ? chartData.seriesOptions :
      chartData.series ? chartData.series[0] ?? {} : {});
    mergeProperties(fitChartDataProperties, columnChartOptions.chartOptions,
      chartData.chartOptions ? chartData.chartOptions : {});
    mergeProperties(fitChartDataProperties, dfChartOptions.chartOptions,
      chartData.chartOptions ? chartData.chartOptions : {});

    acc.addPane('Options', () => ui.divV([
      switchLevelInput.root,
      ui.h3('Series options'),
      ui.input.form(chartData.seriesOptions ? chartData.seriesOptions : chartData.series![0], fitSeriesProperties, seriesOptionsRefresh),
      ui.h3('Chart options'),
      ui.input.form(chartData.chartOptions, fitChartDataProperties, chartOptionsRefresh),
    ]));

    const seriesStatsProperty = DG.Property.js('series', DG.TYPE.STRING,
      {description: 'Controls whether to show series statistics or aggregated statistics',
        defaultValue: 'All', choices: ['all', 'aggregated'], nullable: false});
    const seriesStatsInput = ui.input.forProperty(seriesStatsProperty, null, {onValueChanged(input) {
      acc.getPane('Fit').root.lastElementChild!.replaceChildren(createFitPane());
    }});
    const aggrTypeProperty = DG.Property.js('aggregation type', DG.TYPE.STRING,
      {description: 'Controls which aggregation to use on the series statistics',
        defaultValue: 'med', choices: Object.values(DG.STATS), nullable: false});
    const aggrTypeInput = ui.input.forProperty(aggrTypeProperty, null, {onValueChanged(input) {
      acc.getPane('Fit').root.lastElementChild!.replaceChildren(createFitPane());
    }});

    function createFitPane(): HTMLElement {
      const host = ui.divV(seriesStatsInput.stringValue === 'aggregated' ? [seriesStatsInput.root, aggrTypeInput.root] : [seriesStatsInput.root]);
      if (seriesStatsInput.stringValue === 'all') {
        const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
        for (let i = 0; i < chartData.series!.length; i++) {
          const series = chartData.series![i];
          const seriesStatistics = calculateSeriesStats(series, chartLogOptions);
  
          const color = series.fitLineColor ? DG.Color.fromHtml(series.fitLineColor) ?
            series.fitLineColor : DG.Color.toHtml(DG.Color.getCategoricalColor(i)) : DG.Color.toHtml(DG.Color.getCategoricalColor(i));
          host.appendChild(ui.panel([
            ui.h1(series.name ?? 'series ' + i, {style: {color: color}}),
            ui.input.form(seriesStatistics, statisticsProperties, {
              onCreated: (input) => input.root.appendChild(
                ui.iconFA('plus', () => addStatisticsColumn(gridCell.gridColumn, input.property, series, i),
                  `Calculate ${input.property.name} for the whole column`))
            })
          ]));
        }
      }
      else {
        const seriesStatistics = getChartDataAggrStats(chartData, aggrTypeInput.stringValue);
        host.appendChild(ui.panel([
            ui.h1(`series ${aggrTypeInput.stringValue}`),
            ui.input.form(seriesStatistics, statisticsProperties, {
              onCreated: (input) => input.root.appendChild(
                ui.iconFA('plus', () => addAggrStatisticsColumn(gridCell.gridColumn, input.property, aggrTypeInput.stringValue),
                  `Calculate ${input.property.name} for the whole column`))
            })
          ]));
      }

      return host;
    }

    acc.addPane('Fit', () => {
      return createFitPane();
    });

    acc.addPane('Chart', () => CellRenderViewer.fromGridCell(gridCell).root);

    return acc.root;
  }
}
