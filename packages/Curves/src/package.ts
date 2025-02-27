import {_PlateGridCellRenderer} from './package.g';
import {_MultiCurveViewer} from './package.g';
import {_FitChartCellRenderer} from './package.g';
/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';

import {FitGridCellHandler, calculateSeriesStats, getChartDataAggrStats} from './fit/fit-grid-cell-handler';
import {getOrCreateParsedChartData, substituteZeroes} from './fit/fit-renderer';
import {curveDemo} from './fit/fit-demo';
import {convertXMLToIFitChartData} from './fit/fit-parser';
import {LogOptions} from '@datagrok-libraries/statistics/src/fit/fit-data';
import {FitStatistics} from '@datagrok-libraries/statistics/src/fit/fit-curve';
import {FitConstants} from './fit/const';
import {PlateCellHandler} from "./plate/plate-cell-renderer";
import {FitSeries} from '@datagrok-libraries/statistics/src/fit/new-fit-API';


export const _package = new DG.Package();
const SOURCE_COLUMN_TAG = '.sourceColumn';
const SERIES_NUMBER_TAG = '.seriesNumber';
const SERIES_AGGREGATION_TAG = '.seriesAggregation';
const STATISTICS_TAG = '.statistics';


//name: Curve fitting
//description: Curve fitting is the process of constructing a curve, or mathematical function, that has the best fit to a series of data points
//meta.demoPath: Curves | Curve Fitting
//test: curveFitDemo() //wait: 2000
export async function curveFitDemo(): Promise<void> {
  await curveDemo();
}

//tags: init
export function _initCurves(): void {
  DG.ObjectHandler.register(new FitGridCellHandler());
  DG.ObjectHandler.register(new PlateCellHandler());
}

//name: addStatisticsColumn
//tags: Transform
//input: dataframe df
//input: string colName
//input: string propName
//input: string seriesName
//input: int seriesNumber
export function addStatisticsColumn(df: DG.DataFrame, colName: string, propName: string, seriesName: string, seriesNumber: number): void {
  const grid = DG.Viewer.grid(df);
  const chartColumn = grid.col(colName)!;
  const column = DG.Column.float(`${colName} ${seriesName} ${propName}`, chartColumn.column?.length);
  column.tags[SOURCE_COLUMN_TAG] = colName;
  column.tags[SERIES_NUMBER_TAG] = seriesNumber;
  column.tags[STATISTICS_TAG] = propName;

  column
    .init((i) => {
      const gridCell = DG.GridCell.fromColumnRow(grid, colName, grid.tableRowToGrid(i));
      if (gridCell.cell.value === '')
        return null;
      const chartData = gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX ?
        convertXMLToIFitChartData(gridCell.cell.value) : getOrCreateParsedChartData(gridCell);
      if (chartData.series![seriesNumber] === undefined || chartData.series![seriesNumber].points.every((p) => p.outlier))
        return null;
      if (chartData.chartOptions?.allowXZeroes && chartData.chartOptions?.logX &&
        chartData.series?.some((series) => series.points.some((p) => p.x === 0)))
        substituteZeroes(chartData);
      const chartLogOptions: LogOptions = {logX: chartData.chartOptions?.logX, logY: chartData.chartOptions?.logY};
      const fitResult = calculateSeriesStats(chartData.series![seriesNumber], seriesNumber, chartLogOptions, gridCell);
      return fitResult[propName as keyof FitStatistics];
    });
  df.columns.insert(column, chartColumn.idx);
}

//name: addAggrStatisticsColumn
//tags: Transform
//input: dataframe df
//input: string colName
//input: string propName
//input: string aggrType
export function addAggrStatisticsColumn(df: DG.DataFrame, colName: string, propName: string, aggrType: string): void {
  const grid = DG.Viewer.grid(df);
  const chartColumn = grid.col(colName)!;
  const column = DG.Column.float(`${colName} ${aggrType} ${propName}`, chartColumn.column?.length);
  column.tags[SOURCE_COLUMN_TAG] = colName;
  column.tags[SERIES_AGGREGATION_TAG] = aggrType;
  column.tags[STATISTICS_TAG] = propName;

  column
    .init((i) => {
      const gridCell = DG.GridCell.fromColumnRow(grid, colName, grid.tableRowToGrid(i));
      if (gridCell.cell.value === '')
        return null;
      const chartData = gridCell.cell.column.getTag(FitConstants.TAG_FIT_CHART_FORMAT) === FitConstants.TAG_FIT_CHART_FORMAT_3DX ?
        convertXMLToIFitChartData(gridCell.cell.value) : getOrCreateParsedChartData(gridCell);
      if (chartData.series?.every((series) => series.points.every((p) => p.outlier)))
        return null;
      if (chartData.chartOptions?.allowXZeroes && chartData.chartOptions?.logX &&
        chartData.series?.some((series) => series.points.some((p) => p.x === 0)))
        substituteZeroes(chartData);
      const fitResult = getChartDataAggrStats(chartData, aggrType, gridCell);
      return fitResult[propName as keyof FitStatistics];
    });
  df.columns.insert(column, chartColumn.idx);
}

//name: testPlatesCurvesNewAPI
export function testPlatesCurvesNewAPI(): void {
  const series = new FitSeries([
    {'x': 0, 'y': 0},
    {'x': 1, 'y': 0.5},
    {'x': 2, 'y': 1},
    {'x': 3, 'y': 10, 'outlier': true},
    {'x': 4, 'y': 0},
  ]);
  const params = series.fit.sigmoid();
  console.log(params);
}

export {_FitChartCellRenderer};
export {_MultiCurveViewer};
export {_PlateGridCellRenderer};
