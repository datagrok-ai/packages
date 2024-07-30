import * as DG from 'datagrok-api/dg';
import {tTest} from '@datagrok-libraries/statistics/src/tests';
import {RawData} from './types';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';
import {ClusterType} from '../viewers/logo-summary';
import {AGG_STATS_MAPPING} from './constants';

export type StatsItem = {
  count: number,
  pValue: number | null,
  meanDifference: number,
  ratio: number,
  mask: BitArray,
  mean: number,
  aggValue?: number,
};

export type PositionStats = { [monomer: string]: StatsItem } & { general: SummaryStats };
export type MonomerPositionStats = { [position: string]: PositionStats } & { general: SummaryStats };
export type CacheItem = { filter: Int32Array, stats: MonomerPositionStats, selection: Int32Array };
export type MonomerPositionStatsCache = { [colName: string]: CacheItem };
export type ClusterStats = { [cluster: string]: StatsItem };
export type ClusterTypeStats = { [clusterType in ClusterType]: ClusterStats };
export type MasksInfo = {
  [monomerOrCluster: string]: { [positionOrClusterType: string | ClusterType]: { mask: BitArray } }
};

export type SummaryStats = {
  minCount: number, maxCount: number,
  minMeanDifference: number, maxMeanDifference: number,
  minPValue: number, maxPValue: number,
  minRatio: number, maxRatio: number,
  minMean: number, maxMean: number,
};

export const getAggregatedColName = (aggF: string, colName: string): string => `${aggF}(${colName})`;
export type AggregationColumns = { [col: string]: DG.AggregationType };

/**
 * Returns statistics for the given activity data and bit array.
 * @param data - Activity data to calculate statistics for.
 * @param bitArray - Bit array to use for the calculation.
 * @return - Statistics for the given data and bit array.
 */
export function getStats(data: RawData | number[], bitArray: BitArray,
  aggData?: {col: DG.Column, type: DG.AGG}): StatsItem {
  if (data.length !== bitArray.length && data.some((v, i) => i >= bitArray.length ? v !== 0 : false))
    throw new Error('PeptidesError: Data and bit array have different lengths');

  const selected = new Float32Array(bitArray.trueCount());
  const rest = new Float32Array(bitArray.falseCount());
  let aggValue: number | undefined;
  if (aggData) {
    try {
      aggValue = DG.DataFrame.fromColumns([aggData.col])
        .clone(DG.BitSet.fromBytes(bitArray.buffer.buffer, bitArray.length)).col(aggData.col.name)
        ?.aggregate(aggData.type);
    } catch (e) {
      console.error(e);
    }
  }
  let selectedIndex = 0;
  let restIndex = 0;
  for (let i = 0; i < bitArray.length; ++i) {
    if (bitArray.getBit(i))
      selected[selectedIndex++] = data[i];
    else
      rest[restIndex++] = data[i];
  }

  const selectedMean = selected.reduce((a, b) => a + b, 0) / Math.max(selected.length, 1);
  if (selected.length < 2 || rest.length < 2) {
    const restMean = rest.reduce((a, b) => a + b, 0) / Math.max(rest.length, 1);
    return {
      count: selected.length,
      pValue: null,
      mean: selectedMean,
      meanDifference: selectedMean - restMean,
      ratio: selected.length / (bitArray.length),
      mask: bitArray,
      aggValue,
    };
  }

  const testResult = tTest(selected, rest);
  const currentMeanDiff = testResult['Mean difference']!;
  return {
    count: selected.length,
    pValue: testResult[currentMeanDiff >= 0 ? 'p-value more' : 'p-value less'],
    mean: selectedMean,
    meanDifference: currentMeanDiff,
    ratio: selected.length / (bitArray.length),
    mask: bitArray,
    aggValue,
  };
}

/**
 * Returns statistics for the given activity data and bit array.
 * @param col - Column to get aggregated value for.
 * @param agg - Aggregation type to use.
 * @param [mask] - BitSet to use for the calculation.
 * @return - Aggregated value.
 */
export function getAggregatedValue(col: DG.Column<number>, agg: DG.AggregationType, mask?: DG.BitSet): number {
  const mappedAgg = AGG_STATS_MAPPING[agg];
  const stat = DG.Stats.fromColumn(col, mask);
  if (!(mappedAgg in stat))
    throw new Error(`Aggregation type ${mappedAgg} is not supported`);


  //@ts-ignore: this is a hack to avoid using switch to access the getters
  return stat[mappedAgg] as number;
}

/**
 * Calculate aggregated values for the given columns.
 * @param df - Data frame to get aggregated values from.
 * @param columns - Columns to get aggregated values for.
 * @param options - Options to use.
 * @param [options.filterDf] - Whether to use dataframe filter.
 * @param [options.mask] - BitSet to use for the calculation.
 * @param options.fractionDigits - Number of fraction digits to use.
 * @return - Mapping object with aggregated column values.
 */
export function getAggregatedColumnValues(df: DG.DataFrame, columns: [string, DG.AggregationType][],
  options: { filterDf?: boolean, mask?: DG.BitSet, fractionDigits?: number } = {}): StringDictionary {
  options.filterDf ??= false;
  options.fractionDigits ??= 3;

  const filteredDf = options.filterDf && df.filter.anyFalse ? df.clone(df.filter) : df;

  const colResults: StringDictionary = {};
  for (const [colName, aggFn] of columns) {
    const newColName = getAggregatedColName(aggFn, colName);
    const value = getAggregatedValue(filteredDf.getCol(colName), aggFn, options.mask);
    colResults[newColName] = value.toFixed(options.fractionDigits);
  }
  return colResults;
}

/**
 * Gets aggregated column values from the given dataframe at the row index.
 * @param df - Data frame to get aggregated values from.
 * @param idx - Row index to get aggregated values for.
 * @param columns - Columns to get aggregated values for.
 * @param options - Aggregated columns options.
 * @param [options.fractionDigits] - Number of fraction digits to use.
 * @return - Mapping object with aggregated column values.
 */
export function getAggregatedColumnValuesFromDf(df: DG.DataFrame, idx: number,
  columns: [string, DG.AggregationType][], options: { fractionDigits?: number }): StringDictionary {
  options.fractionDigits ??= 3;
  const colResults: StringDictionary = {};
  for (const [colName, aggFn] of columns) {
    const newColName = getAggregatedColName(aggFn, colName);
    const value = df.get(newColName, idx);
    colResults[newColName] = value.toFixed(options.fractionDigits);
  }
  return colResults;
}

export function getStringColAggregatedJSON(df: DG.DataFrame, colName: string, mask?: DG.BitSet): string {
  const col = df.col(colName.substring(5, colName.length - 1)); // remove 'dist(' and ')'
  if (!col || !col.matches('categorical'))
    return '{}';
  mask ??= DG.BitSet.create(df.rowCount, () => true);
  const values = col.getRawData();
  const valueCounts = new Map<number, number>();
  for (let i = -1; (i = mask.findNext(i, true)) !== -1;)
    valueCounts.set(values[i], (valueCounts.get(values[i]) ?? 0) + 1);

  const resJSON: {[_: string]: number} = {};
  for (const [value, count] of valueCounts)
    resJSON[col.categories[value]] = count;
  return JSON.stringify(resJSON);
}
