import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';

import $ from 'cash-dom';

import * as C from '../utils/constants';
import {AggregationColumns, getAggregatedColumnValues, getStats, StatsItem} from '../utils/statistics';
import {DistributionLabelMap, getDistributionPanel, getDistributionTable, SPLIT_CATEGORY} from '../utils/misc';
import {SARViewer} from '../viewers/sar-viewer';
import {CLUSTER_TYPE, LogoSummaryTable} from '../viewers/logo-summary';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {Selection} from '../utils/types';

export type DistributionItemOptions = {
  peptideSelection: DG.BitSet, columns: AggregationColumns, clusterColName?: string,
  activityCol: DG.Column<number>, monomerPositionSelection: Selection, clusterSelection: Selection,
};

export enum DISTRIBUTION_CATEGORIES_KEYS {
  SEPARATE_MONOMERS = 'separateMonomers',
  SEPARATE_POSITIONS = 'separatePositions',
  SEPARATE_CLUSTERS = 'separateClusters',
}

const general = 'general';
const key2category = (key: DISTRIBUTION_CATEGORIES_KEYS | typeof general): string => {
  if (key === general)
    return 'General';


  return key.substring(8);
};
export type PeptideViewer = SARViewer | LogoSummaryTable;


/**
 * Builds Distribution panel
 * @param table - Dataframe with peptides
 * @param options - Distribution options
 * @return - Distribution panel
 */
export function getDistributionWidget(table: DG.DataFrame, options: DistributionItemOptions): HTMLDivElement {
  const mask = table.selection;
  if (!mask.anyTrue)
    return ui.divText('No distribution');


  const getDistributionCategoreisHost = (): HTMLDivElement => {
    const distributionCategories: HTMLDivElement[] = [getDistributionCategory(general, table, options)];
    for (const tag of Object.values(DISTRIBUTION_CATEGORIES_KEYS)) {
      if (table.getTag(tag) !== `${true}` ||
        (tag === DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_CLUSTERS && !options.clusterColName))
        continue;


      distributionCategories.push(getDistributionCategory(tag, table, options));
    }
    return (distributionCategories.length === 1) ? distributionCategories[0] : ui.div(distributionCategories);
  };
  const distributionCategoriesHost = ui.div(getDistributionCategoreisHost());
  const inputsNames = Object.values(DISTRIBUTION_CATEGORIES_KEYS);
  const inputsArray: DG.InputBase[] = new Array(inputsNames.length);
  for (let inputIdx = 0; inputIdx < inputsNames.length; inputIdx++) {
    const inputName = inputsNames[inputIdx].substring(8);
    inputsArray[inputIdx] = ui.input.bool(inputName,
      {value: table.getTag(inputsNames[inputIdx]) === `${true}`, onValueChanged: () => {
        table.setTag(inputsNames[inputIdx], `${inputsArray[inputIdx].value}`);
        $(distributionCategoriesHost).empty();
        distributionCategoriesHost.append(getDistributionCategoreisHost());
      }}) as DG.InputBase<boolean>;
    $(inputsArray[inputIdx].captionLabel).addClass('ui-label-right').css('text-align', 'left');
    $(inputsArray[inputIdx].root).find('.ui-input-editor').css('margin', '0px');
    $(inputsArray[inputIdx].root).find('.ui-input-description').css('margin', '0px');
    inputsArray[inputIdx].setTooltip(`Show distribution for each ${inputName}`);
    if (inputName === DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_CLUSTERS)
      inputsArray[inputIdx].enabled = !!(options.clusterColName && options.clusterSelection[CLUSTER_TYPE.ORIGINAL]);
    else if (inputName === DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_MONOMERS ||
      inputName === DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_POSITIONS)
      inputsArray[inputIdx].enabled = Object.entries(options.monomerPositionSelection).length !== 0;
  }

  const inputsHost = ui.form(inputsArray);
  // $(inputsHost).css('display', 'inline-flex');
  return ui.divV([inputsHost, distributionCategoriesHost]);
}

/**
 * Builds activity distribution histogram
 * @param table - Dataframe with peptides
 * @param isTooltip - Is histogram for tooltip
 * @return - Histogram viewer
 */
export function getActivityDistribution(
  table: DG.DataFrame, isTooltip: boolean = false,
  // @ts-ignore TODO: fix after api update
): DG.Viewer<DG.IHistogramSettings> {
  const hist = table.plot.histogram({
    filteringEnabled: false,
    valueColumnName: C.COLUMNS_NAMES.ACTIVITY,
    splitColumnName: C.COLUMNS_NAMES.SPLIT_COL,
    legendVisibility: 'Never',
    showXAxis: true,
    showColumnSelector: false,
    showRangeSlider: false,
    showBinSelector: false,
    backColor: isTooltip ? '#fdffe5' : '#fffff',
    // @ts-ignore TODO: fix after api update
  }) as DG.Viewer<DG.IHistogramSettings>;
  hist.root.style.width = 'auto';
  return hist;
}

/**
 * Builds stats table map
 * @param stats - Stats item
 * @param options - Stats table map options
 * @param options.fractionDigits - Number of fraction digits for stats values
 * @return - Stats table map
 */
export function getStatsTableMap(stats: StatsItem,
  options: { fractionDigits?: number } = {},
): StringDictionary {
  options.fractionDigits ??= 3;
  const tableMap: StringDictionary = {
    'Count': `${stats.count} (${(stats.ratio * 100).toFixed(options.fractionDigits)}%)`,
    'Mean difference': stats.meanDifference.toFixed(options.fractionDigits),
    'Mean activity': stats.mean.toFixed(options.fractionDigits),
  };
  if (stats.pValue != null)
    tableMap['p-value'] = stats.pValue < 0.01 ? '<0.01' : stats.pValue.toFixed(options.fractionDigits);

  return tableMap;
}

/**
 * Builds distribution for signle item
 * @param table - Dataframe with peptides
 * @param stats - Stats item
 * @param options - Distribution options
 * @param [labelMap] - Map for histogram legend labels
 * @return - Distribution panel
 */
function getSingleDistribution(table: DG.DataFrame, stats: StatsItem, options: DistributionItemOptions,
  labelMap: DistributionLabelMap = {}): HTMLDivElement {
  const hist = getActivityDistribution(getDistributionTable(options.activityCol, table.selection,
    options.peptideSelection));
  const aggregatedColMap = getAggregatedColumnValues(table, Object.entries(options.columns),
    {filterDf: true, mask: DG.BitSet.fromBytes(stats.mask.buffer.buffer, stats.mask.length)});
  const tableMap = getStatsTableMap(stats);
  const resultMap: { [key: string]: any } = {...tableMap, ...aggregatedColMap};
  const distributionRoot = getDistributionPanel(hist, resultMap, labelMap);
  $(distributionRoot).addClass('d4-flex-col');

  return distributionRoot;
}

/**
 * Builds distribution item for specified category
 * @param category - Distribution category
 * @param table - Dataframe with peptides
 * @param options - Distribution options
 * @return - Distribution item
 */
function getDistributionCategory(category: DISTRIBUTION_CATEGORIES_KEYS | typeof general, table: DG.DataFrame,
  options: DistributionItemOptions): HTMLDivElement {
  let body: HTMLDivElement = ui.divText('No distribution');
  switch (category) {
  case general:
    const bitArray = BitArray.fromSeq(table.selection.length, (i: number) => table.selection.get(i));
    const stats = !table.selection.anyTrue || !table.selection.anyFalse ?
      {
        count: options.activityCol.length, pValue: null, meanDifference: 0, ratio: 1, mask: bitArray,
        mean: options.activityCol.stats.avg,
      } :
      getStats(options.activityCol.getRawData(), bitArray);

    body = getSingleDistribution(table, stats, options);
    break;
  case DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_CLUSTERS:
    body = getDistributionForClusters(table, options as Required<DistributionItemOptions>, options.clusterSelection);
    break;
  case DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_MONOMERS:
    const reversedSelectionObject = getReversedObject(options.monomerPositionSelection);
    body = getDistributionForMonomers(table, options, reversedSelectionObject);
    break;
  case DISTRIBUTION_CATEGORIES_KEYS.SEPARATE_POSITIONS:
    body = getDistributionForPositions(table, options, options.monomerPositionSelection);
    break;
  }

  return ui.divV([ui.h1(key2category(category)), body]);
}

/**
 * Builds distribution group for clusters
 * @param table - Dataframe with peptides
 * @param options - Distribution options
 * @param selectionObject - Selection object
 * @return - Distribution group host
 */
function getDistributionForClusters(table: DG.DataFrame, options: Required<DistributionItemOptions>,
  selectionObject: Selection): HTMLDivElement {
  const rowCount = table.rowCount;
  const distributions: HTMLDivElement[] = [];
  const activityColData = options.activityCol.getRawData();
  const clusterCol = table.getCol(options.clusterColName);
  const clusterColCategories = clusterCol.categories;
  const clusterColData = clusterCol.getRawData() as Int32Array;

  // Build distributions for original clusters
  const selectedClustersCategoryIndexes = selectionObject[CLUSTER_TYPE.ORIGINAL]
    .map((cluster: string) => clusterColCategories.indexOf(cluster));
  const clusterMasks: BitArray[] = new Array(selectedClustersCategoryIndexes.length).fill(new BitArray(rowCount));
  for (let i = 0; i < rowCount; i++) {
    const cluster = clusterColData[i];
    const selectedIndex = selectedClustersCategoryIndexes.indexOf(cluster);
    if (selectedIndex !== -1)
      clusterMasks[selectedIndex].setTrue(i);
  }
  for (let selectedClusterIdx = 0; selectedClusterIdx < selectedClustersCategoryIndexes.length; selectedClusterIdx++) {
    const selectedClusterCategoryIndex = selectedClustersCategoryIndexes[selectedClusterIdx];
    const stats = getStats(activityColData, clusterMasks[selectedClusterIdx]);
    distributions.push(getSingleDistribution(table, stats, options,
      {[SPLIT_CATEGORY.SELECTION]: clusterColCategories[selectedClusterCategoryIndex]}));
  }

  // Build distributions for custom clusters
  const customClusterSelection = selectionObject[CLUSTER_TYPE.CUSTOM];
  for (const clusterColumnName of customClusterSelection) {
    const customClustCol = table.getCol(clusterColumnName);
    const bitArray = BitArray.fromUint32Array(rowCount, customClustCol.getRawData() as Uint32Array);
    const stats = getStats(activityColData, bitArray);
    distributions.push(getSingleDistribution(table, stats, options,
      {[SPLIT_CATEGORY.SELECTION]: clusterColumnName}));
  }

  return ui.div(distributions, 'd4-flex-wrap');
}

/**
 * Builds distribution group for positions category
 * @param table - Dataframe with peptides
 * @param options - Distribution options
 * @param selectionObject - Selection object
 * @return - Distribution group host
 */
function getDistributionForPositions(table: DG.DataFrame, options: DistributionItemOptions,
  selectionObject: Selection): HTMLDivElement {
  const positions = Object.keys(selectionObject);
  const rowCount = table.rowCount;
  const distributions: HTMLDivElement[] = [];
  const activityColData = options.activityCol.getRawData();
  const positionColumns: (DG.Column<string> | undefined)[] = [];
  const positionColumnsCategories: (string[] | undefined)[] = [];
  const positionColumnsData: (Int32Array | undefined)[] = [];

  for (let posIdx = 0; posIdx < positions.length; posIdx++) {
    const position = positions[posIdx];
    const monomerList = selectionObject[position];
    if (monomerList.length === 0)
      continue;


    positionColumns[posIdx] ??= table.getCol(position);
    positionColumnsCategories[posIdx] ??= positionColumns[posIdx]!.categories;
    positionColumnsData[posIdx] ??= positionColumns[posIdx]!.getRawData() as Int32Array;

    const mask = new BitArray(table.rowCount);
    for (let monomerIdx = 0; monomerIdx < monomerList.length; monomerIdx++) {
      const monomer = monomerList[monomerIdx];
      const monomerCategoryIndex = positionColumnsCategories[posIdx]!.indexOf(monomer);

      for (let i = 0; i < rowCount; i++) {
        if (positionColumnsData[posIdx]![i] === monomerCategoryIndex)
          mask.setTrue(i);
      }
    }
    const stats = getStats(activityColData, mask);
    distributions.push(getSingleDistribution(table, stats, options, {[SPLIT_CATEGORY.SELECTION]: position}));
  }

  return ui.div(distributions, 'd4-flex-wrap');
}

/**
 * Builds distribution group for monomers category
 * @param table - Dataframe with peptides
 * @param options - Distribution options
 * @param reversedSelectionObject - Selection object with monomers as keys and list of positions as values
 * @return - Distribution group host
 */
function getDistributionForMonomers(table: DG.DataFrame, options: DistributionItemOptions,
  reversedSelectionObject: Selection): HTMLDivElement {
  const monomers = Object.keys(reversedSelectionObject);
  const rowCount = table.rowCount;
  const distributions: HTMLDivElement[] = [];
  const positionColumns: (DG.Column<string> | undefined)[] = [];
  const positionColumnsCategories: (string[] | undefined)[] = [];
  const positionColumnsData: (Int32Array | undefined)[] = [];
  const activityColData = options.activityCol.getRawData();

  for (const monomer of monomers) {
    const posList = reversedSelectionObject[monomer];
    const mask = new BitArray(rowCount);

    for (let posIdx = 0; posIdx < posList.length; posIdx++) {
      const position = posList[posIdx];
      positionColumns[posIdx] ??= table.getCol(position);
      positionColumnsCategories[posIdx] ??= positionColumns[posIdx]!.categories;
      positionColumnsData[posIdx] ??= positionColumns[posIdx]!.getRawData() as Int32Array;

      const monomerCategoryIndex = positionColumnsCategories[posIdx]!.indexOf(monomer);
      for (let i = 0; i < rowCount; i++) {
        if (positionColumnsData[posIdx]![i] === monomerCategoryIndex)
          mask.setTrue(i);
      }
    }
    const stats = getStats(activityColData, mask);

    distributions.push(getSingleDistribution(table, stats, options, {[SPLIT_CATEGORY.SELECTION]: monomer}));
  }

  return ui.div(distributions, 'd4-flex-wrap');
}

/**
 * Converts monomer-position selection object to have monomers as keys and list of positions as values
 * @param selectionObject - Selection object
 * @return - Reversed selection object
 */
function getReversedObject(selectionObject: Selection): Selection {
  const reversedSelectionObject: Selection = {};
  const positions = Object.keys(selectionObject);
  for (const position of positions) {
    for (const monomer of selectionObject[position]) {
      if (!reversedSelectionObject.hasOwnProperty(monomer)) {
        reversedSelectionObject[monomer] = [position];
        continue;
      }
      if (!reversedSelectionObject[monomer].includes(position))
        reversedSelectionObject[monomer].push(position);
    }
  }
  return reversedSelectionObject;
}
