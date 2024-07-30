/* eslint-disable max-len */
import * as DG from 'datagrok-api/dg';
import * as C from './constants';
import * as type from './types';
import {ParallelMutationCliffs} from './parallel-mutation-cliffs';
import {CLUSTER_TYPE} from '../viewers/logo-summary';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {
  ClusterStats,
  ClusterTypeStats,
  getStats,
  MonomerPositionStats,
  PositionStats,
  StatsItem,
  SummaryStats,
} from './statistics';

export type MutationCliffsOptions = {
  maxMutations?: number,
  minActivityDelta?: number,
  targetCol?: type.RawColumn | null,
  currentTarget?: string | null
};

/**
 * Finds mutation cliffs in the set of sequences.
 * @param activityArray - Activity column raw data.
 * @param monomerInfoArray - Split sequence raw columns.
 * @param options - Options for the mutation cliffs algorithm.
 * @return - Mutation cliffs map.
 */
export async function findMutations(activityArray: type.RawData, monomerInfoArray: type.RawColumn[],
  options: MutationCliffsOptions = {}): Promise<type.MutationCliffs> {
  const nCols = monomerInfoArray.length;
  if (nCols === 0)
    throw new Error(`PepAlgorithmError: Couldn't find any column of semType '${C.SEM_TYPES.MONOMER}'`);


  options.minActivityDelta ??= 0;
  options.maxMutations ??= 1;
  const mutationCliffsService = new ParallelMutationCliffs();
  const substitutionsInfo = await mutationCliffsService.calc(activityArray, monomerInfoArray, options);
  mutationCliffsService.terminate();
  return substitutionsInfo;
}

/**
 * Calculates statistics for mutation cliffs, used for mutation cliffst table (coloring, tooltips, distribution...)
 * @param cliffs - mutation cliffs data
 * @param activityArray - array of activities
 *
 */
export function calculateCliffsStatistics(
  cliffs: type.MutationCliffs, activityArray: type.RawData,
): type.MutationCliffStats {
  const res: type.MutationCliffStats['stats'] = new Map();
  let minDiff = 999999; let maxDiff = -999999; let minCount = 2; let maxCount = 2;
  for (const monomer of cliffs.keys()) {
    const monomerStatsMap: Map<string, StatsItem> = new Map();
    res.set(monomer, monomerStatsMap);
    // monomer substitutions map from mutations cliffs
    const monomerSubMap = cliffs.get(monomer)!;
    for (const position of monomerSubMap.keys()) {
      const subMap = monomerSubMap.get(position)!;
      const mask = new BitArray(activityArray.length, false);
      if (subMap.size === 0)
        continue;
      for (const index of subMap.keys()) {
        mask.setFast(index, true);
        const toIndexes = subMap.get(index)!;
        toIndexes.forEach((i) => mask.setFast(i, true));
      }
      const stats = getStats(activityArray, mask);
      minDiff = Math.min(minDiff, stats.meanDifference);
      maxDiff = Math.max(maxDiff, stats.meanDifference);
      minCount = Math.min(minCount, stats.count);
      maxCount = Math.max(maxCount, stats.count);
      monomerStatsMap.set(position, stats);
    }
  }
  return {stats: res, minDiff, maxDiff, minCount, maxCount};
}


/**
 * Calculates statistics for each monomer position.
 * @param activityCol - Activity column.
 * @param filter - Dataframe filter to consider.
 * @param positionColumns - Position columns containing monomers.
 * @param [options] - Options for the algorithm.
 * @param [options.isFiltered] - Whether the dataframe is filtered.
 * @param [options.columns] - Columns to consider when calculating statistics.
 * @param [options.target] - Target column and category to consider.
 * @param [options.aggValue] - Column and aggregation type to consider instead of count.
 * @return - Statistics for each monomer position.
 */
export function calculateMonomerPositionStatistics(activityCol: DG.Column<number>, filter: DG.BitSet,
  positionColumns: DG.Column<string>[], options: {
    isFiltered?: boolean,
    columns?: string[],
    target?: {
      col: DG.Column<string>,
      cat: string,
    },
    aggValue?: {
      col: DG.Column,
      type: DG.AGG
    }
  } = {}): MonomerPositionStats {
  options.isFiltered ??= false;
  const monomerPositionObject = {general: {}} as MonomerPositionStats & { general: SummaryStats };
  let activityColData: Float64Array = activityCol.getRawData() as Float64Array;
  let sourceDfLen = activityCol.length;
  if (options.isFiltered) {
    sourceDfLen = filter.trueCount;
    const tempActivityData = new Float64Array(sourceDfLen);
    const selectedIndexes = filter.getSelectedIndexes();
    for (let i = 0; i < sourceDfLen; ++i)
      tempActivityData[i] = activityColData[selectedIndexes[i]];


    activityColData = tempActivityData;
    positionColumns = DG.DataFrame.fromColumns(positionColumns).clone(filter).columns.toList();
    if (options.target)
      options.target.col = options.target.col.clone(filter);
    if (options.aggValue)
      options.aggValue.col = options.aggValue.col.clone(filter);
  }
  options.columns ??= positionColumns.map((col) => col.name);
  const targetColIndexes = options.target?.col?.getRawData();
  const targetColCat = options.target?.col.categories;
  const targetIndex = options.target?.cat ? targetColCat?.indexOf(options.target.cat) : -1;
  for (const posCol of positionColumns) {
    if (!options.columns.includes(posCol.name))
      continue;


    const posColData = posCol.getRawData();
    const posColCateogries = posCol.categories;
    const currentPositionObject = {general: {}} as PositionStats & { general: SummaryStats };

    for (let categoryIndex = 0; categoryIndex < posColCateogries.length; ++categoryIndex) {
      const monomer = posColCateogries[categoryIndex];
      if (monomer === '')
        continue;


      const boolArray: boolean[] = new Array(sourceDfLen).fill(false);
      for (let i = 0; i < sourceDfLen; ++i) {
        if (posColData[i] === categoryIndex && (!targetColIndexes || targetIndex === -1 || targetColIndexes[i] === targetIndex))
          boolArray[i] = true;
      }
      const bitArray = BitArray.fromValues(boolArray);
      if (bitArray.allFalse)
        continue;
      const stats = getStats(activityColData, bitArray, options.aggValue);
      currentPositionObject[monomer] = stats;
      getSummaryStats(currentPositionObject.general, stats);
    }
    monomerPositionObject[posCol.name] = currentPositionObject;
    getSummaryStats(monomerPositionObject.general, null, currentPositionObject.general);
  }
  return monomerPositionObject;
}

/**
 * Calculates summary statistics for the monomer position statistics such as maximum and minimum values for each
 * statistic in general and on each position.
 * @param genObj - Object to store the summary statistics to.
 * @param stats - Statistics for a single monomer position.
 * @param summaryStats - Summary statistics for all monomer positions.
 */
export function getSummaryStats(genObj: SummaryStats, stats: StatsItem | null = null,
  summaryStats: SummaryStats | null = null): void {
  if (stats === null && summaryStats === null)
    throw new Error(`MonomerPositionStatsError: either stats or summaryStats must be present`);


  const possibleMaxCount = stats?.count ?? summaryStats!.maxCount;
  genObj.maxCount ??= possibleMaxCount;
  if (genObj.maxCount < possibleMaxCount)
    genObj.maxCount = possibleMaxCount;


  const possibleMinCount = stats?.count ?? summaryStats!.minCount;
  genObj.minCount ??= possibleMinCount;
  if (genObj.minCount > possibleMinCount)
    genObj.minCount = possibleMinCount;


  const possibleMaxMeanDifference = stats?.meanDifference ?? summaryStats!.maxMeanDifference;
  genObj.maxMeanDifference ??= possibleMaxMeanDifference;
  if (genObj.maxMeanDifference < possibleMaxMeanDifference)
    genObj.maxMeanDifference = possibleMaxMeanDifference;


  const possibleMinMeanDifference = stats?.meanDifference ?? summaryStats!.minMeanDifference;
  genObj.minMeanDifference ??= possibleMinMeanDifference;
  if (genObj.minMeanDifference > possibleMinMeanDifference)
    genObj.minMeanDifference = possibleMinMeanDifference;


  if (!isNaN(stats?.pValue ?? NaN)) {
    const possibleMaxPValue = stats?.pValue ?? summaryStats!.maxPValue;
    genObj.maxPValue ??= possibleMaxPValue;
    if (genObj.maxPValue < possibleMaxPValue)
      genObj.maxPValue = possibleMaxPValue;


    const possibleMinPValue = stats?.pValue ?? summaryStats!.minPValue;
    genObj.minPValue ??= possibleMinPValue;
    if (genObj.minPValue > possibleMinPValue)
      genObj.minPValue = possibleMinPValue;
  }

  const possibleMaxRatio = stats?.ratio ?? summaryStats!.maxRatio;
  genObj.maxRatio ??= possibleMaxRatio;
  if (genObj.maxRatio < possibleMaxRatio)
    genObj.maxRatio = possibleMaxRatio;


  const possibleMinRatio = stats?.ratio ?? summaryStats!.minRatio;
  genObj.minRatio ??= possibleMinRatio;
  if (genObj.minRatio > possibleMinRatio)
    genObj.minRatio = possibleMinRatio;
}

/**
 * Calculates statistics for each cluster type.
 * @param df - Dataframe containing the clusters column.
 * @param clustersColumnName - Name of the original clusters column.
 * @param customClusters - Array of custom clusters columns names.
 * @param activityCol - Activity column.
 * @return - Statistics for each cluster type.
 */
export function calculateClusterStatistics(df: DG.DataFrame, clustersColumnName: string,
  customClusters: DG.Column<boolean>[], activityCol: DG.Column<number>): ClusterTypeStats {
  const rowCount = df.rowCount;
  const origClustCol = df.getCol(clustersColumnName);
  const origClustColData = origClustCol.getRawData();
  const origClustColCat = origClustCol.categories;
  const origClustMasks: BitArray[] = Array.from({length: origClustColCat.length},
    () => new BitArray(rowCount, false));
  for (let rowIdx = 0; rowIdx < rowCount; ++rowIdx)
    origClustMasks[origClustColData[rowIdx]].setTrue(rowIdx);


  const customClustMasks = customClusters.map(
    (v) => BitArray.fromUint32Array(rowCount, v.getRawData() as Uint32Array));
  const customClustColNamesList = customClusters.map((v) => v.name);

  const activityColData = activityCol.getRawData() as Float64Array;

  const origClustStats: ClusterStats = {};
  const customClustStats: ClusterStats = {};

  for (const clustType of Object.values(CLUSTER_TYPE)) {
    const masks = clustType === CLUSTER_TYPE.ORIGINAL ? origClustMasks : customClustMasks;
    const clustNames = clustType === CLUSTER_TYPE.ORIGINAL ? origClustColCat : customClustColNamesList;
    const resultStats = clustType === CLUSTER_TYPE.ORIGINAL ? origClustStats : customClustStats;
    for (let maskIdx = 0; maskIdx < masks.length; ++maskIdx) {
      const mask = masks[maskIdx];
      resultStats[clustNames[maskIdx]] = mask.allTrue || mask.allFalse ?
        {count: mask.length, meanDifference: 0, ratio: 1.0, pValue: null, mask: mask, mean: activityCol.stats.avg} :
        getStats(activityColData, mask);
    }
  }

  const resultStats = {} as ClusterTypeStats;
  resultStats[CLUSTER_TYPE.ORIGINAL] = origClustStats;
  resultStats[CLUSTER_TYPE.CUSTOM] = customClustStats;
  return resultStats;
}
