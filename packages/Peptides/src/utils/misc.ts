import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as C from './constants';
import * as type from './types';
import {PeptidesSettings} from './types';
import {StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {AggregationColumns, MasksInfo, MonomerPositionStats, PositionStats} from './statistics';
import {PeptideViewer} from '../widgets/distribution';
import wu from 'wu';

/**
 * Gets seprator for sequence column.
 * @param col - Macromolecule column.
 * @return - Separator symbol.
 */
export function getSeparator(col: DG.Column<string>): string {
  return col.getTag(C.TAGS.SEPARATOR) ?? '';
}

/**
 * Scales activity column values.
 * @param activityCol - Activity column.
 * @param scaling - Scaling method.
 * @return - Scaled activity column.
 */
export function scaleActivity(activityCol: DG.Column<number>, scaling: C.SCALING_METHODS = C.SCALING_METHODS.NONE,
): DG.Column<number> {
  let formula = (x: number): number => x;
  switch (scaling) {
  case C.SCALING_METHODS.NONE:
    break;
  case C.SCALING_METHODS.LG:
    formula = (x: number): number => Math.log10(x);
    break;
  case C.SCALING_METHODS.MINUS_LG:
    formula = (x: number): number => -Math.log10(x);
    break;
  default:
    throw new Error(`ScalingError: method \`${scaling}\` is not available.`);
  }
  const activityColData = activityCol.getRawData();
  const scaledCol: DG.Column<number> = DG.Column.float(C.COLUMNS_NAMES.ACTIVITY, activityCol.length)
    .init((i) => {
      const val = activityColData[i];
      return val === DG.FLOAT_NULL || val === DG.INT_NULL ? val : formula(val);
    });
  scaledCol.setTag(C.TAGS.ANALYSIS_COL, `${true}`);
  scaledCol.setTag(DG.TAGS.FORMULA, scaling);
  return scaledCol;
}

//TODO: optimize
/**
 * Calculates number of selected monomers for each position.
 * @param df - Dataframe with position columns.
 * @return - Object with number of selected monomers for each position.
 */
export function calculateSelected(df: DG.DataFrame): type.SelectionStats {
  const monomerColumns: DG.Column<string>[] = df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER);
  const selectedObj: type.SelectionStats = {};
  const selectedIndexes = df.filter.clone().and(df.selection).getSelectedIndexes();
  for (const idx of selectedIndexes) {
    for (const col of monomerColumns) {
      const monomer = col.get(idx);
      if (!monomer)
        continue;


      selectedObj[col.name] ??= {};
      selectedObj[col.name][monomer] ??= 0;
      selectedObj[col.name][monomer] += 1;
    }
  }

  return selectedObj;
}

/**
 * Extracts raw data from column.
 * @param col - Column.
 * @return - Object with column name, categories and raw data.
 */
export function extractColInfo(col: DG.Column<string>): type.RawColumn {
  return {
    name: col.name,
    cat: col.categories,
    rawData: col.getRawData(),
  };
}

export enum SPLIT_CATEGORY {
  SELECTION = 'Selection',
  ALL = 'All',
  PEPTIDES_SELECTION = 'Peptides selection',
}

export type DistributionLabelMap = { [key in SPLIT_CATEGORY]?: string };

/**
 * Creates a panel to plot activity distribution.
 * @param hist - Histogram viewer.
 * @param statsMap - Object with statistics names and values.
 * @param labelMap - Mapping object for distribution labels.
 * @return - Panel with distribution plot and statistics.
 */
// @ts-ignore TODO: fix after api update
export function getDistributionPanel(hist: DG.Viewer<DG.IHistogramSettings>, statsMap: StringDictionary,
  labelMap: DistributionLabelMap = {}): HTMLDivElement {
  const splitCol = hist.dataFrame.getCol(C.COLUMNS_NAMES.SPLIT_COL);
  const labels = [];
  const categories = splitCol.categories as SPLIT_CATEGORY[];
  const rawData = splitCol.getRawData();
  for (let categoryIdx = 0; categoryIdx < categories.length; ++categoryIdx) {
    if (!Object.values(SPLIT_CATEGORY).includes(categories[categoryIdx]))
      continue;


    const color = DG.Color.toHtml(splitCol.meta.colors.getColor(rawData.indexOf(categoryIdx)));
    const label = ui.label(labelMap[categories[categoryIdx]] ?? categories[categoryIdx], {style: {color}});
    labels.push(label);
  }

  const result = ui.divV([ui.divV(labels), hist.root, ui.tableFromMap(statsMap)]);
  hist.root.style.maxHeight = '75px';
  return result;
}

/**
 * Creates a table to plot activity distribution.
 * @param activityCol - Activity column.
 * @param selection - Selection bitset.
 * @param [peptideSelection] - Peptide selection bitset.
 * @return - Dataframe with activity distribution.
 */
export function getDistributionTable(activityCol: DG.Column<number>, selection: DG.BitSet, peptideSelection?: DG.BitSet,
): DG.DataFrame {
  const selectionMismatch = peptideSelection?.clone().xor(selection).anyTrue ?? false;
  const rowCount = activityCol.length;
  const activityColData = activityCol.getRawData();
  const activityData = new Float32Array(rowCount + selection.trueCount +
    (selectionMismatch ? (peptideSelection?.trueCount ?? 0) : 0));
  const categories: string[] = new Array(activityData.length);

  for (let i = 0, j = 0, k = 0; i < rowCount; ++i) {
    const isSelected = selection.get(i);
    activityData[i] = activityColData[i];
    categories[i] = isSelected ? SPLIT_CATEGORY.SELECTION : SPLIT_CATEGORY.ALL;
    if (isSelected) {
      activityData[rowCount + j] = activityColData[i];
      categories[rowCount + j] = SPLIT_CATEGORY.ALL;
      ++j;
    }
    if (selectionMismatch && peptideSelection?.get(i)) {
      activityData[rowCount + selection.trueCount + k] = activityColData[i];
      categories[rowCount + selection.trueCount + k] = SPLIT_CATEGORY.PEPTIDES_SELECTION;
      ++k;
    }
  }

  const splitCol = DG.Column.fromStrings(C.COLUMNS_NAMES.SPLIT_COL, categories);
  const categoryOrder = [SPLIT_CATEGORY.ALL, SPLIT_CATEGORY.SELECTION];
  if (selectionMismatch)
    categoryOrder.push(SPLIT_CATEGORY.PEPTIDES_SELECTION);


  splitCol.setCategoryOrder(categoryOrder);
  splitCol.meta.colors.setCategorical();
  return DG.DataFrame.fromColumns([DG.Column.fromFloat32Array(C.COLUMNS_NAMES.ACTIVITY, activityData), splitCol]);
}

/**
 * Adds expand in full screen icon to the grid.
 * @param grid - Grid to add expand icon to.
 */
export function addExpandIcon(grid: DG.Grid): void {
  const fullscreenIcon = ui.iconFA('expand-alt', () => {
    const fullscreenGrid = grid.dataFrame.plot.grid();
    setGridProps(fullscreenGrid, false);
    fullscreenGrid.root.style.height = '100%';
    const pairsFullscreenDialog = ui.dialog(grid.dataFrame.name);
    pairsFullscreenDialog.add(fullscreenGrid.root);
    pairsFullscreenDialog.showModal(true);
    fullscreenGrid.invalidate();
  });
  grid.root.appendChild(fullscreenIcon);
  fullscreenIcon.style.position = 'absolute';
  fullscreenIcon.style.right = '0px';
  fullscreenIcon.style.top = '0px';
  fullscreenIcon.style.visibility = 'hidden';
  grid.root.addEventListener('mouseenter', (_) => {
    fullscreenIcon.style.visibility = 'visible';
  });
  grid.root.addEventListener('mouseleave', (_) => {
    fullscreenIcon.style.visibility = 'hidden';
  });
}

export function addExpandIconsToGridPair(grids: DG.Grid[], name: string, onCloseFunc?: Function): void {
  //const host = ui.divV([], {style: {height: '100%'}});
  grids.forEach((grid) => {
    const fullscreenIcon = ui.iconFA('expand-alt', () => {
      const fullscreenGrids = grids.map((g) => {
        const out = g;
        setGridProps(out, false);
        return out;
      });
      //setGridProps(fullscreenGrid, false);
      //fullscreenGrid.root.style.height = '100%';
      const pairsFullscreenDialog = ui.dialog(name);
      const host = ui.divV([], {style: {height: '100%'}});
      pairsFullscreenDialog.add(host);
      fullscreenGrids.forEach((g) => {
        host.appendChild(ui.h1(g.dataFrame.name));
        host.appendChild(g.root);
      });
      //pairsFullscreenDialog.add(fullscreenGrid.root);
      pairsFullscreenDialog.showModal(true);
      pairsFullscreenDialog.onClose.subscribe(() => {
        onCloseFunc?.();
      });
      //fullscreenGrid.invalidate();
      fullscreenGrids.forEach((g) => g.invalidate());
    });
    grid.root.appendChild(fullscreenIcon);
    fullscreenIcon.style.position = 'absolute';
    fullscreenIcon.style.right = '0px';
    fullscreenIcon.style.top = '0px';
    fullscreenIcon.style.visibility = 'hidden';
    grid.root.addEventListener('mouseenter', (_) => {
      fullscreenIcon.style.visibility = 'visible';
    });
    grid.root.addEventListener('mouseleave', (_) => {
      fullscreenIcon.style.visibility = 'hidden';
    });
  });
}

export function addExpandIconGen(dialogName: string,
  root: HTMLElement, mouseOverRoot: HTMLElement, onClickElementFunc: () => HTMLElement,
): void {
  const fullScreenIcon = ui.iconFA('expand-alt', () => {
    const fullScreenElement = onClickElementFunc();
    const fullScreenDialog = ui.dialog(dialogName);
    fullScreenDialog.add(fullScreenElement);
    fullScreenDialog.show(
      {resizable: true, modal: true, width: window.innerWidth - 60, x: 30, y: 30, height: window.innerHeight - 60});
  }, 'Expand to full screen');
  fullScreenIcon.style.marginLeft = 'auto';
  fullScreenIcon.style.marginRight = '15px';
  mouseOverRoot.addEventListener('mouseenter', () => {
    fullScreenIcon.style.visibility = 'visible';
  });
  mouseOverRoot.addEventListener('mouseleave', () => {
    fullScreenIcon.style.visibility = 'hidden';
  });
  root.appendChild(fullScreenIcon);
}

/**
 * Sets common properties for grid in property panel.
 * @param grid - Grid to set properties to.
 * @param autosize - Flag whether to autosize grid.
 */
export function setGridProps(grid: DG.Grid, autosize: boolean = true): void {
  grid.props.allowEdit = false;
  grid.props.showReadOnlyNotifications = false;
  grid.props.allowRowSelection = false;
  grid.props.allowBlockSelection = false;
  grid.props.allowColSelection = false;
  grid.props.showRowHeader = false;
  grid.props.showCurrentRowIndicator = false;
  grid.root.style.width = '100%';
  grid.root.style.maxWidth = '100%';
  if (autosize)
    grid.autoSize(1000, 175, 0, 0, true);
}

/**
 * Checks whether selection is empty.
 * @param selection - Selection object.
 * @return - Flag whether selection is empty.
 */
export function isSelectionEmpty(selection: type.Selection): boolean {
  for (const selectionList of Object.values(selection)) {
    if (selectionList.length !== 0)
      return false;
  }
  return true;
}

/**
 * Modifies selection based on pressed keys. If shift and ctrl keys are both pressed, it removes item from selection.
 * If only shift key is pressed, it adds item to selection. If only ctrl key is pressed, it changes item
 * presence in selection. If none of the keys is pressed, it sets item as the only selected one.
 * @param selection - Selection object.
 * @param clusterOrMonomerPosition - Selection item object.
 * @param options - Selection options object.
 * @return - Modified selection object.
 */
export function modifySelection(selection: type.Selection, clusterOrMonomerPosition: type.SelectionItem,
  options: type.SelectionOptions): type.Selection {
  const monomerList = selection[clusterOrMonomerPosition.positionOrClusterType];
  const monomerIndex = monomerList.indexOf(clusterOrMonomerPosition.monomerOrCluster);
  if (options.shiftPressed && options.ctrlPressed) {
    if (monomerIndex !== -1)
      monomerList.splice(monomerIndex, 1);
  } else if (options.ctrlPressed) {
    if (monomerIndex === -1)
      monomerList.push(clusterOrMonomerPosition.monomerOrCluster);
    else
      monomerList.splice(monomerIndex, 1);
  } else if (options.shiftPressed) {
    if (monomerIndex === -1)
      monomerList.push(clusterOrMonomerPosition.monomerOrCluster);
  } else {
    const selectionKeys = Object.keys(selection);
    selection = {};
    for (const posOrClustType of selectionKeys) {
      selection[posOrClustType] = [];
      if (posOrClustType === clusterOrMonomerPosition.positionOrClusterType)
        selection[posOrClustType].push(clusterOrMonomerPosition.monomerOrCluster);
    }
  }
  return selection;
}

/**
 * Highlights rows containing monomer-position in the dataframe.
 * @param monomerPosition - Monomer-position item object.
 * @param dataFrame - Dataframe to highlight rows in.
 * @param monomerPositionStats - Object with statistics for monomer-positions.
 */
export function highlightMonomerPosition(monomerPosition: type.SelectionItem, dataFrame: DG.DataFrame,
  monomerPositionStats: MonomerPositionStats): void {
  if (!dataFrame) return;
  const bitArray = new BitArray(dataFrame.rowCount);
  if (monomerPosition.positionOrClusterType === C.COLUMNS_NAMES.MONOMER) {
    const positionStats = Object.values(monomerPositionStats);
    for (const posStat of positionStats) {
      const monomerPositionStats = (posStat as PositionStats)[monomerPosition.monomerOrCluster];
      if (typeof monomerPositionStats !== 'undefined')
        bitArray.or(monomerPositionStats.mask);
    }
  } else {
    const positionStats = monomerPositionStats[monomerPosition.positionOrClusterType];
    if (typeof positionStats !== 'undefined') {
      const monomerPositionStats = positionStats[monomerPosition.monomerOrCluster];
      if (typeof monomerPositionStats !== 'undefined')
        bitArray.or(monomerPositionStats.mask);
    }
  }

  dataFrame.rows.highlight((i) => bitArray.getBit(i));
}

/**
 * Initializes selection object.
 * @param positionColumns - Array of position columns.
 * @return - Initialized selection object.
 */
export function initSelection(positionColumns: DG.Column<string>[]): type.Selection {
  const tempSelection: type.Selection = {};
  for (const posCol of positionColumns)
    tempSelection[posCol.name] = [];


  return tempSelection;
}

/**
 * Gets selection bitset.
 * @param selection - Selection object.
 * @param stats - Object with monomer-position or cluster masks.
 * @return - Selection bitset.
 */
export function getSelectionBitset(selection: type.Selection, stats: MasksInfo): DG.BitSet | null {
  let combinedBitset: BitArray | null = null;
  const selectionEntries = Object.entries(selection);
  for (const [positionOrClusterType, selected] of selectionEntries) {
    const statsType = stats[positionOrClusterType];
    for (const monomerOrCluster of selected) {
      const statsItem = statsType[monomerOrCluster];
      if (!statsItem) continue;
      combinedBitset ??= new BitArray(statsItem.mask.length, false);
      combinedBitset!.or(statsItem.mask);
    }
  }

  return (combinedBitset != null) ? DG.BitSet.fromBytes(combinedBitset!.buffer.buffer, combinedBitset!.length) : null;
}

/**
 * Checks if viewer parameters are equal.
 * @param o1 - First viewer or settings object.
 * @param o2 - Second viewer or settings object.
 * @return - Flag whether viewer parameters are equal.
 */
export function areParametersEqual(o1: PeptideViewer | PeptidesSettings, o2: PeptideViewer | PeptidesSettings,
): boolean {
  return o1.sequenceColumnName === o2.sequenceColumnName && o1.activityColumnName === o2.activityColumnName &&
    o1.activityScaling === o2.activityScaling;
}

/**
 * Converts mutation cliffs to masks info.
 * @param mutationCliffs - Mutation Cliffs map.
 * @param rowCount - Number of rows in dataframe.
 * @return - Object with monomer-position masks.
 */
export function mutationCliffsToMaskInfo(mutationCliffs: type.MutationCliffs, rowCount: number): MasksInfo {
  const result: MasksInfo = {};
  for (const [position, monomerMap] of mutationCliffs) {
    for (const [monomer, indexMap] of monomerMap) {
      result[monomer] ??= {};
      const bitArray = new BitArray(rowCount, false);
      for (const [index, indexList] of indexMap) {
        bitArray.setTrue(index);
        for (const i of indexList)
          bitArray.setTrue(i);
      }
      result[monomer][position] = {mask: bitArray};
    }
  }
  return result;
}

/**
 * Gets combined aggregation columns.
 * @param viewerSelectedColNames - Array of selected columns in viewer properties.
 * @param aggColsViewer - Object with aggregation columns from viewer properties.
 * @param aggColsModel - Object with aggregation columns from analysis settings.
 * @return - Array of combined aggregation columns.
 */
export function getTotalAggColumns(df: DG.DataFrame, viewerSelectedColNames: string[],
  aggColsViewer: AggregationColumns, aggColsModel?: AggregationColumns): [string, DG.AggregationType][] {
  const aggColsEntries = Object.entries(aggColsViewer);
  const aggColsEntriesFromSettings = !aggColsModel ? [] : Object.entries(aggColsModel)
    .filter((it) => !viewerSelectedColNames.includes(it[0]) || aggColsViewer[it[0]] !== it[1]);

  return aggColsEntries.concat(aggColsEntriesFromSettings)
    .filter((it) => df.columns.contains(it[0]) && df.col(it[0])!.matches('numerical'));
}

/**
 * Checks if dataframe is applicable for analysis. To be applicable, dataframe must contain at least one macromolecule
 * column, at least one numerical column for activity and at least two rows.
 * @param table - Dataframe to check.
 * @param minRows - Minimum number of rows in dataframe.
 * @return - Flag whether dataframe is applicable for analysis.
 */
export function isApplicableDataframe(table: DG.DataFrame, minRows: number = 2): boolean {
  return table.columns.bySemTypeAll(DG.SEMTYPE.MACROMOLECULE).length > 0 &&
    wu(table.columns.numerical).toArray().length > 0 && table.rowCount >= minRows;
}

export function debounce<T extends Array<any>, K>(f: (...args: T) => Promise<K>, timeout: number = 500,
): (...args: T) => Promise<K> {
  let timer: NodeJS.Timeout | number | undefined;
  return async (...args: T) => {
    return new Promise<K>((resolve) => {
      clearTimeout(timer);
      timer = setTimeout(() => resolve(f(...args)), timeout);
    });
  };
}
