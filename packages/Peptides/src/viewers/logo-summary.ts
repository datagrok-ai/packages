import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import {PeptidesModel, VIEWER_TYPE} from '../model';
import * as C from '../utils/constants';
import {COLUMN_NAME, SCALING_METHODS} from '../utils/constants';
import * as CR from '../utils/cell-renderer';
import {HorizontalAlignments, IWebLogoViewer, PositionHeight} from '@datagrok-libraries/bio/src/viewers/web-logo';
import {
  AggregationColumns,
  ClusterTypeStats,
  getAggregatedColumnValues,
  getAggregatedValue,
  getStats,
  getStringColAggregatedJSON,
  StatsItem,
} from '../utils/statistics';
import wu from 'wu';
import {getActivityDistribution, getStatsTableMap} from '../widgets/distribution';
import {
  getDistributionPanel,
  getDistributionTable,
  getTotalAggColumns,
  isApplicableDataframe,
  modifySelection,
  scaleActivity,
} from '../utils/misc';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import * as type from '../utils/types';
import {SelectionItem} from '../utils/types';
import {_package} from '../package';
import {calculateClusterStatistics} from '../utils/algorithms';
import {splitAlignedSequences} from '@datagrok-libraries/bio/src/utils/splitter';
import {SARViewer} from './sar-viewer';

const getAggregatedColName = (aggF: string, colName: string): string => `${aggF}(${colName})`;

export enum CLUSTER_TYPE {
  ORIGINAL = 'original',
  CUSTOM = 'custom',
}

export type ClusterType = `${CLUSTER_TYPE}`;

export const enum LST_PROPERTIES {
  WEB_LOGO_MODE = 'webLogoMode',
  MEMBERS_RATIO_THRESHOLD = 'membersRatioThreshold',
  SEQUENCE = 'sequence',
  CLUSTERS = 'clusters',
  COLUMNS = 'columns',
  AGGREGATION = 'aggregation',
  ACTIVITY_SCALING = 'activityScaling',
  ACTIVITY = 'activity',
}

enum LST_CATEGORIES {
  GENERAL = 'General',
  STYLE = 'WebLogo',
  AGGREGATION = 'Aggregation',
}

export interface ILogoSummaryTable {
  sequenceColumnName: string;
  clustersColumnName: string;
  activityColumnName: string;
  activityScaling: string;
}

/** LogoSummaryTable viewer shows per cluster information. */
export class LogoSummaryTable extends DG.JsViewer implements ILogoSummaryTable {
  _titleHost = ui.divText(VIEWER_TYPE.LOGO_SUMMARY_TABLE, {id: 'pep-viewer-title'});
  sequenceColumnName: string;
  clustersColumnName: string;
  webLogoMode: string;
  membersRatioThreshold: number;
  bitsets: DG.BitSet[] = [];
  keyPress: boolean = false;
  currentRowIndex: number | null = null;
  columns: string[];
  aggregation: string;
  activityColumnName: string;
  activityScaling: SCALING_METHODS;
  _scaledActivityColumn: DG.Column | null = null;

  /** Creates LogoSummaryTable properties. */
  constructor() {
    super();

    this.sequenceColumnName = this.column(LST_PROPERTIES.SEQUENCE,
      {
        category: LST_CATEGORIES.GENERAL,
        nullable: false,
      });
    this.clustersColumnName = this.column(LST_PROPERTIES.CLUSTERS,
      {
        category: LST_CATEGORIES.GENERAL,
        nullable: false,
        columnTypeFilter: DG.TYPE.CATEGORICAL,
      });
    this.activityColumnName = this.column(LST_PROPERTIES.ACTIVITY, {
      category: LST_CATEGORIES.GENERAL, nullable: false, columnTypeFilter: DG.TYPE.NUMERICAL,
    });
    this.activityScaling = this.string(LST_PROPERTIES.ACTIVITY_SCALING, C.SCALING_METHODS.NONE,
      {
        category: LST_CATEGORIES.GENERAL,
        choices: Object.values(C.SCALING_METHODS),
      }) as SCALING_METHODS;

    this.webLogoMode = this.string(LST_PROPERTIES.WEB_LOGO_MODE, PositionHeight.Entropy,
      {
        choices: [PositionHeight.full, PositionHeight.Entropy],
        category: LST_CATEGORIES.STYLE,
      });
    this.membersRatioThreshold = this.float(LST_PROPERTIES.MEMBERS_RATIO_THRESHOLD, 0.1,
      {
        min: 0,
        max: 1.0,
        category: LST_CATEGORIES.STYLE,
      });

    this.columns = this.columnList(LST_PROPERTIES.COLUMNS, [], {category: LST_CATEGORIES.AGGREGATION});
    this.aggregation = this.string(LST_PROPERTIES.AGGREGATION, DG.AGG.AVG,
      {
        category: LST_CATEGORIES.AGGREGATION,
        choices: C.AGGREGATION_TYPES,
      });
  }

  /**
   * Returns PeptidesModel instance that belongs to the attached dataframe.
   * @return - PeptidesModel instance.
   */
  get model(): PeptidesModel {
    return PeptidesModel.getInstance(this.dataFrame);
  }

  _viewerGrid: DG.Grid | null = null;

  /**
   * Returns LogoSummaryTable grid. Creates a new one if it is null.
   * @return - LogoSummaryTable grid.
   */
  get viewerGrid(): DG.Grid {
    this._viewerGrid ??= this.createLogoSummaryTableGrid();
    return this._viewerGrid;
  }

  _clusterStats: ClusterTypeStats | null = null;

  /**
   * Returns cluster statistics. Calculates it if it is null.
   * @return - cluster statistics.
   */
  get clusterStats(): ClusterTypeStats {
    this._clusterStats ??= calculateClusterStatistics(this.dataFrame, this.clustersColumnName,
      this.customClusters.toArray(), this.getScaledActivityColumn());
    return this._clusterStats;
  }

  _clusterSelection: type.Selection | null = null;

  /**
   * Returns cluster selection. Initializes it if it is null.
   * @return - cluster selection.
   */
  get clusterSelection(): type.Selection {
    const tagSelection = this.dataFrame.getTag(C.TAGS.CLUSTER_SELECTION);
    this._clusterSelection ??= tagSelection === null ? this.initClusterSelection({notify: false}) :
      JSON.parse(tagSelection);
    return this._clusterSelection!;
  }

  /**
   * Sets cluster selection.
   * @param selection - cluster selection.
   */
  set clusterSelection(selection: type.Selection) {
    this._clusterSelection = selection;
    this.dataFrame.setTag(C.TAGS.CLUSTER_SELECTION, JSON.stringify(selection));
    this.model.fireBitsetChanged(VIEWER_TYPE.LOGO_SUMMARY_TABLE);
    this.model.analysisView.grid.invalidate();
  }

  _logoSummaryTable: DG.DataFrame | null = null;

  /**
   * Returns LogoSummaryTable dataframe. Creates a new one if it is null.
   * @return - LogoSummaryTable dataframe.
   */
  get logoSummaryTable(): DG.DataFrame {
    this._logoSummaryTable ??= this.createLogoSummaryTable();
    return this._logoSummaryTable;
  }

  /**
   * Sets LogoSummaryTable dataframe.
   * @param df - LogoSummaryTable dataframe.
   */
  set logoSummaryTable(df: DG.DataFrame) {
    this._logoSummaryTable = df;
  }

  _positionColumns: DG.Column<string>[] | null = null;

  /**
   * Returns position columns. If position columns are not attached to LogoSummaryTable, it tries to get them from
   * other viewers or analysis (given that relevant parameters are the same), or creates own position columns.
   * @return - position columns.
   */
  get positionColumns(): DG.Column<string>[] {
    if (this._positionColumns != null)
      return this._positionColumns;


    const getSharedPositionColumns = (viewerType: VIEWER_TYPE): DG.Column<string>[] | null => {
      const viewer = this.model.findViewer(viewerType) as SARViewer | null;
      if (this.sequenceColumnName === viewer?.sequenceColumnName)
        return viewer._positionColumns;


      return null;
    };

    if (this.model.positionColumns != null && this.sequenceColumnName === this.model.settings?.sequenceColumnName)
      this._positionColumns = this.model.positionColumns;


    this._positionColumns ??= getSharedPositionColumns(VIEWER_TYPE.MONOMER_POSITION) ??
      getSharedPositionColumns(VIEWER_TYPE.MOST_POTENT_RESIDUES) ??
      splitAlignedSequences(this.dataFrame.getCol(this.sequenceColumnName)).columns.toList();
    return this._positionColumns!;
  }

  /**
   * Checks if cluster selection is empty.
   * @return - flag indicating if cluster selection is empty.
   */
  get isClusterSelectionEmpty(): boolean {
    const clusterSelectionCount =
      this.clusterSelection[CLUSTER_TYPE.ORIGINAL].length + this.clusterSelection[CLUSTER_TYPE.CUSTOM].length;
    return clusterSelectionCount === 0;
  }

  /**
   * Gets iterable over custom clusters columns.
   * @return - iterable over custom clusters columns.
   */
  get customClusters(): wu.WuIterable<DG.Column<boolean>> {
    const query: {
      [key: string]: string
    } = {};
    query[C.TAGS.CUSTOM_CLUSTER] = '1';
    return wu(this.dataFrame.columns.byTags(query));
  }

  /**
   * Gets scaled activity column.
   * @param isFiltered - flag indicating if only filtered rows should be taken into account.
   * @return - scaled activity column.
   */
  getScaledActivityColumn(isFiltered: boolean = false): DG.Column<number> {
    if (this.model.settings?.activityColumnName === this.activityColumnName &&
      this.model.settings?.activityScaling === this.activityScaling)
      this._scaledActivityColumn = this.model.getScaledActivityColumn(isFiltered);


    this._scaledActivityColumn ??= scaleActivity(this.dataFrame.getCol(this.activityColumnName),
      this.activityScaling);
    if (isFiltered) {
      return DG.DataFrame.fromColumns([this._scaledActivityColumn]).clone(this.dataFrame.filter)
        .getCol(this._scaledActivityColumn.name) as DG.Column<number>;
    }
    return this._scaledActivityColumn as DG.Column<number>;
  }

  /**
   * Gets a map of columns and aggregations.
   * @return - map of columns and aggregations.
   */
  getAggregationColumns(): AggregationColumns {
    return Object.fromEntries(this.columns.map((colName) => [colName, this.aggregation] as [string, DG.AGG])
      .filter(([colName, _]) => this.model.df.columns.contains(colName) &&
        this.model.df.col(colName)!.matches('numerical')));
  }

  /** Processes attached table and sets viewer properties. */
  onTableAttached(): void {
    super.onTableAttached();
    if (isApplicableDataframe(this.dataFrame)) {
      this.getProperty(`${LST_PROPERTIES.SEQUENCE}${COLUMN_NAME}`)
        ?.set(this, this.dataFrame.columns.bySemType(DG.SEMTYPE.MACROMOLECULE)!.name);
      this.getProperty(`${LST_PROPERTIES.ACTIVITY}${COLUMN_NAME}`)
        ?.set(this, wu(this.dataFrame.columns.numerical).next().value.name);
      this.getProperty(`${LST_PROPERTIES.CLUSTERS}${COLUMN_NAME}`)
        ?.set(this, wu(this.dataFrame.columns.categorical).next().value.name);
    } else {
      const msg = 'PeptidesError: dataframe is missing Macromolecule or numeric columns';
      grok.log.error(msg);
      grok.shell.warning(msg);
    }
    this.render();
  }

  /** Removes all the active subscriptions. */
  detach(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  /** Renders Logo Summary Table body. */
  render(): void {
    $(this.root).empty();
    if (this.clustersColumnName == null || this.sequenceColumnName == null || this.activityColumnName == null) {
      this.root.appendChild(
        ui.divText('Please, select a sequence, cluster and activity columns in the viewer properties'));
      return;
    }

    if (!this.logoSummaryTable.filter.anyTrue) {
      const emptyDf = ui.divText('No clusters to satisfy the threshold. ' +
        'Please, lower the threshold in viewer proeperties to include clusters');
      this.root.appendChild(ui.divV([this._titleHost, emptyDf]));
      return;
    }
    const expand = ui.iconFA('expand-alt', () => {
      const dialog = ui.dialog('Logo Summary Table');
      dialog.add(this.viewerGrid.root);
      dialog.onCancel(() => this.render());
      dialog.showModal(true);
      this.viewerGrid.invalidate();
    }, 'Show Logo Summary Table in full screen');
    $(expand).addClass('pep-help-icon');
    this.viewerGrid.root.style.width = 'auto';
    this.root.appendChild(ui.divV([
      ui.divH([this._titleHost, expand], {
        style: {
          alignSelf: 'center',
          lineHeight: 'normal',
        },
      }),
      this.viewerGrid.root,
    ]));
    this.viewerGrid.invalidate();
  }

  /**
   * Processes property changes.
   * @param property - changed property.
   */
  onPropertyChanged(property: DG.Property): void {
    super.onPropertyChanged(property);
    let doRender = false;
    switch (property.name) {
    case LST_PROPERTIES.MEMBERS_RATIO_THRESHOLD:
      this.updateFilter();
      break;
    case `${LST_PROPERTIES.SEQUENCE}${COLUMN_NAME}`:
      this._viewerGrid = null;
      this._logoSummaryTable = null;
      doRender = true;
      break;
    case `${LST_PROPERTIES.CLUSTERS}${COLUMN_NAME}`:
      this._clusterStats = null;
      this._clusterSelection = null;
      this._viewerGrid = null;
      this._logoSummaryTable = null;
      doRender = true;
      break;
    case `${LST_PROPERTIES.ACTIVITY}${COLUMN_NAME}`:
    case LST_PROPERTIES.ACTIVITY_SCALING:
      this._scaledActivityColumn = null;
      this._viewerGrid = null;
      this._clusterStats = null;
      this._logoSummaryTable = null;
      doRender = true;
      break;
    case LST_PROPERTIES.COLUMNS:
    case LST_PROPERTIES.AGGREGATION:
      this._viewerGrid = null;
      this._logoSummaryTable = null;
      doRender = true;
      break;
    case LST_PROPERTIES.WEB_LOGO_MODE:
      this.viewerGrid.invalidate();
    }
    if (doRender)
      this.render();
  }

  /**
   * Initializes cluster selection.
   * @param options - initializatiion options.
   * @param options.notify - flag that indicates if bitset changed event should fire.
   * @return - cluster selection.
   */
  initClusterSelection(options: {
    notify?: boolean
  } = {}): type.Selection {
    options.notify ??= true;

    const newClusterSelection = {} as type.Selection;
    newClusterSelection[CLUSTER_TYPE.ORIGINAL] = [];
    newClusterSelection[CLUSTER_TYPE.CUSTOM] = [];
    if (options.notify)
      this.clusterSelection = newClusterSelection;
    else
      this._clusterSelection = newClusterSelection;


    return this.clusterSelection;
  }

  /**
   * Gets total viewer aggregated columns from viewer properties and analysis settings if applicable.
   * @return - total viewer aggregated columns.
   */
  getTotalViewerAggColumns(): [string, DG.AggregationType][] {
    const aggrCols = this.getAggregationColumns();
    return getTotalAggColumns(this.model.df, this.columns, aggrCols, this.model?.settings?.columns);
  }

  getStringAggregatedColumns(): string[] {
    return this.columns.filter((colName) => this.model.df.columns.contains(colName) &&
      this.model.df.col(colName)!.matches('categorical')).map((cn) => `dist(${cn})`);
  }

  /**
   * Creates LogoSummaryTable dataframe to be used in LogoSummaryTable grid.
   * @return - LogoSummaryTable dataframe.
   */
  createLogoSummaryTable(): DG.DataFrame {
    const clustersColName = this.clustersColumnName;
    const isDfFiltered = this.dataFrame.filter.anyFalse;
    const filteredDf = isDfFiltered ? this.dataFrame.clone(this.dataFrame.filter) : this.dataFrame;
    const filteredDfCols = filteredDf.columns;
    const filteredDfRowCount = filteredDf.rowCount;
    const activityColData = this.getScaledActivityColumn(isDfFiltered).getRawData();

    const filteredDfClustCol = filteredDf.getCol(clustersColName);
    const filteredDfClustColData = filteredDfClustCol.getRawData();
    const filteredDfClustColCat = filteredDfClustCol.categories;

    const query: {
      [key: string]: string
    } = {};
    query[C.TAGS.CUSTOM_CLUSTER] = '1';
    const customClustColList: DG.Column<boolean>[] = wu(filteredDfCols.byTags(query))
      .filter((c) => c.max > 0).toArray();

    const customLST = DG.DataFrame.create(customClustColList.length);
    const customLSTCols = customLST.columns;
    const customLSTClustCol = customLSTCols.addNewString(C.LST_COLUMN_NAMES.CLUSTER);

    const customMembersColData = customLSTCols.addNewInt(C.LST_COLUMN_NAMES.MEMBERS).getRawData();
    const customWebLogoCol = customLSTCols.addNewString(C.LST_COLUMN_NAMES.WEB_LOGO);
    const customDistCol = customLSTCols.addNewString(C.LST_COLUMN_NAMES.DISTRIBUTION);
    const customMDColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.MEAN_DIFFERENCE).getRawData();
    const customPValColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.P_VALUE).getRawData();
    const customRatioColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.RATIO).getRawData();

    let origLSTBuilder = filteredDf.groupBy([clustersColName]);
    const aggNumericColsEntries = this.getTotalViewerAggColumns();
    const aggStringColNames = this.getStringAggregatedColumns();
    const aggStringCols = aggStringColNames.map((colName) => customLSTCols.addNewString(colName));
    const aggNumericColNames = aggNumericColsEntries.map(([colName, aggFn]) => getAggregatedColName(aggFn, colName));
    const customAggRawCols = new Array(aggNumericColNames.length + aggStringColNames.length);
    const numericColAggEntries = aggNumericColsEntries.map(
      ([colName, aggFn]) => [filteredDf.getCol(colName), aggFn] as [DG.Column<number>, DG.AggregationType]);

    for (let aggIdx = 0; aggIdx < aggNumericColsEntries.length; ++aggIdx) {
      const [colName, aggFn] = aggNumericColsEntries[aggIdx];
      origLSTBuilder = origLSTBuilder.add(aggFn, colName, aggNumericColNames[aggIdx]);
      const customLSTAggCol = customLSTCols.addNewFloat(aggNumericColNames[aggIdx]);
      customAggRawCols[aggIdx] = customLSTAggCol.getRawData();
    }

    // BEGIN: fill LST part with custom clusters
    const customBitsets: DG.BitSet[] = new Array(customClustColList.length);

    for (let rowIdx = 0; rowIdx < customClustColList.length; ++rowIdx) {
      const customClustCol = customClustColList[rowIdx];
      customLSTClustCol.set(rowIdx, customClustCol.name);
      const bitArray = BitArray.fromUint32Array(filteredDfRowCount, customClustCol.getRawData() as Uint32Array);
      if (bitArray.allFalse)
        continue;


      const bsMask = DG.BitSet.fromBytes(bitArray.buffer.buffer, filteredDfRowCount);

      const stats: StatsItem = isDfFiltered ? getStats(activityColData, bitArray) :
        this.clusterStats[CLUSTER_TYPE.CUSTOM][customClustCol.name];

      customMembersColData[rowIdx] = stats.count;
      customBitsets[rowIdx] = bsMask;
      customMDColData[rowIdx] = stats.meanDifference;
      customPValColData[rowIdx] = stats.pValue ?? DG.FLOAT_NULL;
      customRatioColData[rowIdx] = stats.ratio;

      for (let aggColIdx = 0; aggColIdx < aggNumericColNames.length; ++aggColIdx) {
        const [col, aggFn] = numericColAggEntries[aggColIdx];
        customAggRawCols[aggColIdx][rowIdx] = getAggregatedValue(col, aggFn, bsMask);
      }
      for (let aggColIdx = aggNumericColNames.length; aggColIdx < customAggRawCols.length; ++aggColIdx) {
        const colName = aggStringColNames[aggColIdx - aggNumericColNames.length];
        aggStringCols[aggColIdx - aggNumericColNames.length]
          .set(rowIdx, getStringColAggregatedJSON(filteredDf, colName, bsMask));
      }
    }
    customWebLogoCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    customDistCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    // END

    // BEGIN: fill LST part with original clusters
    const origLST = origLSTBuilder.aggregate();
    const origLSTLen = origLST.rowCount;
    const origLSTCols = origLST.columns;
    let origLSTClustCol: DG.Column<string> = origLST.getCol(clustersColName);
    origLSTClustCol.name = C.LST_COLUMN_NAMES.CLUSTER;
    if (origLSTClustCol.type !== DG.COLUMN_TYPE.STRING) {
      origLST.columns.replace(origLSTClustCol, origLSTClustCol.convertTo(DG.COLUMN_TYPE.STRING));
      origLSTClustCol = origLST.getCol(origLSTClustCol.name);
    }


    const origLSTClustColCat = origLSTClustCol.categories;
    const origMembersColData = origLSTCols.addNewInt(C.LST_COLUMN_NAMES.MEMBERS).getRawData();
    const origWebLogoCol = origLSTCols.addNewString(C.LST_COLUMN_NAMES.WEB_LOGO);
    const origDistCol = origLSTCols.addNewString(C.LST_COLUMN_NAMES.DISTRIBUTION);
    const origMDColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.MEAN_DIFFERENCE).getRawData();
    const origPValColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.P_VALUE).getRawData();
    const origRatioColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.RATIO).getRawData();
    const origAggStringCols = aggStringColNames.map((colName) => origLSTCols.addNewString(colName));
    const origBitsets: DG.BitSet[] = new Array(origLSTLen);
    const origClustMasks = Array.from({length: origLSTLen},
      () => new BitArray(filteredDfRowCount, false));

    for (let rowIdx = 0; rowIdx < filteredDfRowCount; ++rowIdx) {
      const filteredClustName = filteredDfClustColCat[filteredDfClustColData[rowIdx]];
      const origClustIdx = origLSTClustColCat.indexOf(filteredClustName);
      origClustMasks[origClustIdx]?.setTrue(rowIdx);
    }

    for (let rowIdx = 0; rowIdx < origLSTLen; ++rowIdx) {
      const mask = origClustMasks[rowIdx];
      if (mask.allFalse)
        continue;


      const bsMask = DG.BitSet.fromBytes(mask.buffer.buffer, filteredDfRowCount);
      const stats = isDfFiltered ? getStats(activityColData, mask) :
        this.clusterStats[CLUSTER_TYPE.ORIGINAL][origLSTClustColCat[rowIdx]];
      for (let aggColIdx = 0; aggColIdx < aggStringColNames.length; ++aggColIdx) {
        const colName = aggStringColNames[aggColIdx];
        origAggStringCols[aggColIdx]
          .set(rowIdx, getStringColAggregatedJSON(filteredDf, colName, bsMask));
      }
      origMembersColData[rowIdx] = stats.count;
      origBitsets[rowIdx] = bsMask;
      origMDColData[rowIdx] = stats.meanDifference;
      origPValColData[rowIdx] = stats.pValue ?? DG.FLOAT_NULL;
      origRatioColData[rowIdx] = stats.ratio;
    }
    origWebLogoCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    origDistCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    // END

    // combine LSTs and create a grid
    const summaryTable = origLST.append(customLST);
    this.bitsets = origBitsets.concat(customBitsets);

    aggStringColNames.forEach((sn) => summaryTable.col(sn)!.semType = 'lst-pie-chart');

    return summaryTable;
  }

  /**
   * Builds LogoSummaryTable interactive grid.
   * @return - LogoSummaryTable grid.
   */
  createLogoSummaryTableGrid(): DG.Grid {
    const isDfFiltered = this.dataFrame.filter.anyFalse;
    const filteredDf = isDfFiltered ? this.dataFrame.clone(this.dataFrame.filter) : this.dataFrame;
    const aggColsEntries = this.getTotalViewerAggColumns();
    const aggColNames = aggColsEntries.map(([colName, aggFn]) => getAggregatedColName(aggFn, colName));

    const grid = this.logoSummaryTable.plot.grid();
    grid.sort([C.LST_COLUMN_NAMES.MEMBERS], [false]);
    this.updateFilter();
    const gridClustersCol = grid.col(C.LST_COLUMN_NAMES.CLUSTER)!;
    gridClustersCol.visible = true;
    grid.columns.setOrder([C.LST_COLUMN_NAMES.CLUSTER, C.LST_COLUMN_NAMES.MEMBERS,
      C.LST_COLUMN_NAMES.WEB_LOGO, ...this.getStringAggregatedColumns(),
      C.LST_COLUMN_NAMES.DISTRIBUTION, C.LST_COLUMN_NAMES.MEAN_DIFFERENCE,
      C.LST_COLUMN_NAMES.P_VALUE, C.LST_COLUMN_NAMES.RATIO, ...aggColNames]);
    grid.columns.rowHeader!.visible = false;
    grid.props.rowHeight = 55;

    const webLogoCache = new DG.LruCache<number, DG.Viewer & IWebLogoViewer>();
    // @ts-ignore TODO: fix after api update
    const distCache = new DG.LruCache<number, DG.Viewer<DG.IHistogramSettings>>();
    const maxSequenceLen = this.positionColumns.length;
    const webLogoGridCol = grid.columns.byName(C.LST_COLUMN_NAMES.WEB_LOGO)!;
    webLogoGridCol.cellType = 'html';
    webLogoGridCol.width = 350;
    const activityCol = this.getScaledActivityColumn(isDfFiltered);
    const pepCol: DG.Column<string> = filteredDf.getCol(this.sequenceColumnName);

    grid.onCellRender.subscribe(async (gridCellArgs) => {
      const gridCell = gridCellArgs.cell;
      const currentRowIdx = gridCell.tableRowIndex;
      if (!gridCell.isTableCell || currentRowIdx == null || currentRowIdx === -1)
        return;


      const canvasContext = gridCellArgs.g;
      const bound = gridCellArgs.bounds;
      canvasContext.save();
      canvasContext.beginPath();
      canvasContext.rect(bound.x, bound.y, bound.width, bound.height);
      canvasContext.clip();

      try {
        const height = Math.max(gridCell.bounds.height - 2, 0);
        const clusterBitSet = this.bitsets[currentRowIdx];

        if (gridCell.tableColumn?.name === C.LST_COLUMN_NAMES.CLUSTER) {
          CR.renderLogoSummaryCell(canvasContext, gridCell.cell.value, this.clusterSelection, bound);
          gridCellArgs.preventDefault();
        } else if (gridCell.tableColumn?.name === C.LST_COLUMN_NAMES.WEB_LOGO) {
          const positionWidth = Math.floor((gridCell.bounds.width - 2 - (4 * (maxSequenceLen - 1))) / maxSequenceLen);

          let viewer = webLogoCache.get(currentRowIdx);
          if (viewer !== undefined) {
            const viewerProps = viewer.getProperties();

            for (const prop of viewerProps) {
              if (prop.name === 'positionHeight' && prop.get(viewer) !== this.webLogoMode)
                prop.set(viewer, this.webLogoMode);
              else if (prop.name === 'positionWidth' && prop.get(viewer) !== positionWidth)
                prop.set(viewer, positionWidth);
              else if (prop.name === 'minHeight' && prop.get(viewer) !== height)
                prop.set(viewer, height);
            }
            const viewerRoot = $(viewer.root).css('height', `${height}px`);//;
            viewerRoot.children().first().css('overflow-y', 'hidden !important');
          } else {
            const webLogoTable = this.createWebLogoDf(pepCol, clusterBitSet);
            viewer = await webLogoTable.plot
              .fromType('WebLogo', {
                positionHeight: this.webLogoMode,
                horizontalAlignment: HorizontalAlignments.LEFT,
                maxHeight: 1000,
                minHeight: height,
                positionWidth: positionWidth,
                showPositionLabels: false,
              });
            webLogoCache.set(currentRowIdx, viewer);
          }
          viewer.root.style.height = `${height}px`;
          gridCell.element = viewer.root;
          gridCellArgs.preventDefault();
        } else if (gridCell.tableColumn?.name === C.LST_COLUMN_NAMES.DISTRIBUTION) {
          let viewer = distCache.get(currentRowIdx);
          if (viewer === undefined) {
            const distributionDf = getDistributionTable(activityCol, clusterBitSet);
            viewer = distributionDf.plot.histogram({
              filteringEnabled: false,
              valueColumnName: activityCol.name,
              splitColumnName: C.COLUMNS_NAMES.SPLIT_COL,
              legendVisibility: 'Never',
              showXAxis: false,
              showColumnSelector: false,
              showRangeSlider: false,
              showBinSelector: false,
              backColor: DG.Color.toHtml(DG.Color.white),
              xAxisHeight: 1,
              showSplitSelector: false,
            });
            viewer.root.style.width = 'auto';
            distCache.set(currentRowIdx, viewer);
          }
          viewer.root.style.height = `${height}px`;
          gridCell.element = viewer.root;
          gridCellArgs.preventDefault();
        }
      } finally {
        canvasContext.restore();
      }
    });
    grid.root.addEventListener('mouseleave', (_ev) => this.model.unhighlight());
    DG.debounce(grid.onCurrentCellChanged, 500).subscribe((gridCell) => {
      if (!gridCell.isTableCell)
        return;


      try {
        if (!this.keyPress || gridCell.tableColumn?.name !== C.LST_COLUMN_NAMES.CLUSTER)
          return;


        if (this.currentRowIndex !== null && this.currentRowIndex !== -1) {
          this.modifyClusterSelection(this.getCluster(grid.cell(C.LST_COLUMN_NAMES.CLUSTER, this.currentRowIndex)),
            {
              shiftPressed: true,
              ctrlPressed: true,
            }, false);
        }

        this.modifyClusterSelection(this.getCluster(gridCell), {
          shiftPressed: true,
          ctrlPressed: false,
        });
        grid.invalidate();
      } finally {
        this.keyPress = false;
        this.currentRowIndex = gridCell.gridRow;
      }
    });
    grid.root.addEventListener('keydown', (ev) => {
      this.keyPress = ev.key.startsWith('Arrow');
      if (this.keyPress)
        return;


      if (ev.key === 'Escape' || (ev.code === 'KeyA' && ev.shiftKey && ev.ctrlKey))
        this.initClusterSelection({notify: false});
      else if (ev.code === 'KeyA' && ev.ctrlKey) {
        for (let rowIdx = 0; rowIdx < this.logoSummaryTable.rowCount; ++rowIdx) {
          this.modifyClusterSelection(this.getCluster(grid.cell(C.LST_COLUMN_NAMES.CLUSTER, rowIdx)),
            {
              shiftPressed: true,
              ctrlPressed: false,
            }, false);
        }
      }
      this.model.fireBitsetChanged(VIEWER_TYPE.LOGO_SUMMARY_TABLE);
      grid.invalidate();
    });
    grid.root.addEventListener('click', (ev) => {
      const gridCell = grid.hitTest(ev.offsetX, ev.offsetY);
      if (!gridCell || !gridCell.isTableCell || gridCell.tableColumn?.name !== C.LST_COLUMN_NAMES.CLUSTER)
        return;


      const selection = this.getCluster(gridCell);
      this.modifyClusterSelection(selection, {
        shiftPressed: ev.shiftKey,
        ctrlPressed: ev.ctrlKey,
      });
      grid.invalidate();

      _package.files.readAsText('help/logo-summary-table.md').then((text) => {
        grok.shell.windows.help.showHelp(ui.markdown(text));
      }).catch((e) => grok.log.error(e));
    });
    grid.onCellTooltip((gridCell, x, y) => {
      if (!gridCell.isTableCell) {
        this.model.unhighlight();
        return true;
      }

      const cluster = this.getCluster(gridCell);
      this.highlightCluster(cluster);
      if (gridCell.tableColumn?.name === C.LST_COLUMN_NAMES.CLUSTER)
        this.showTooltip(cluster, x, y);


      return true;
    });

    const gridProps = grid.props;
    gridProps.allowEdit = false;
    gridProps.allowRowSelection = false;
    gridProps.allowBlockSelection = false;
    gridProps.allowColSelection = false;
    gridProps.showCurrentRowIndicator = false;
    gridProps.showReadOnlyNotifications = false;

    return grid;
  }

  /**
   * Highlights selected cluster.
   * @param cluster - cluster to highlight.
   */
  highlightCluster(cluster: type.SelectionItem): void {
    const bitArray = this.clusterStats[cluster.positionOrClusterType as ClusterType][cluster.monomerOrCluster].mask;
    this.dataFrame.rows.highlight((i) => bitArray.getBit(i));
    this.model.isHighlighting = true;
  }

  /**
   * Gets cluster from LogoSummaryTable grid cell.
   * @param gridCell - LogoSummaryTable grid cell.
   * @return - cluster.
   */
  getCluster(gridCell: DG.GridCell): SelectionItem {
    const clustName = this.logoSummaryTable.get(C.LST_COLUMN_NAMES.CLUSTER, gridCell.tableRowIndex!);
    const clustColCat = this.dataFrame.getCol(this.clustersColumnName).categories;
    return {
      positionOrClusterType: clustColCat.includes(clustName) ? CLUSTER_TYPE.ORIGINAL : CLUSTER_TYPE.CUSTOM,
      monomerOrCluster: clustName,
    };
  }

  /** Updates LogoSummaryTable filter. */
  updateFilter(): void {
    const memberstCol = this.logoSummaryTable.getCol(C.LST_COLUMN_NAMES.MEMBERS);
    const membersColData = memberstCol.getRawData();
    const maxCount = memberstCol.stats.max;
    const minMembers = Math.ceil(maxCount * this.membersRatioThreshold);
    this.logoSummaryTable.filter.init((i) => membersColData[i] > minMembers);
  }

  /** Creates a new cluster from current selection and adds to Logo Summary Table. */
  clusterFromSelection(): void {
    const currentSelection = this.model.getVisibleSelection();
    const viewerDfCols = this.logoSummaryTable.columns;
    const viewerDfColsLength = viewerDfCols.length;
    const newClusterVals = new Array(viewerDfCols.length);
    const activityScaledCol = this.getScaledActivityColumn();
    const bitArray = BitArray.fromString(currentSelection.toBinaryString());
    const stats = getStats(activityScaledCol.getRawData(), bitArray);

    this.bitsets.push(currentSelection.clone());

    const newClusterName = this.dataFrame.columns.getUnusedName('New Cluster');
    const aggregatedValues: {
      [colName: string]: number
    } = {};
    const stringAggregatedValues: {
      [colName: string]: string
    } = {};
    const aggColsEntries = this.getTotalViewerAggColumns();
    const aggStringColNames = this.getStringAggregatedColumns();
    for (const [colName, aggFn] of aggColsEntries) {
      const newColName = getAggregatedColName(aggFn, colName);
      const col = this.dataFrame.getCol(colName);
      aggregatedValues[newColName] = getAggregatedValue(col, aggFn, currentSelection);
    }

    for (const colName of aggStringColNames)
      stringAggregatedValues[colName] = getStringColAggregatedJSON(this.dataFrame, colName, currentSelection);


    for (let i = 0; i < viewerDfColsLength; ++i) {
      const col = viewerDfCols.byIndex(i);
      newClusterVals[i] = col.name === C.LST_COLUMN_NAMES.CLUSTER ? newClusterName :
        col.name === C.LST_COLUMN_NAMES.MEMBERS ? currentSelection.trueCount :
          col.name === C.LST_COLUMN_NAMES.WEB_LOGO ? null :
            col.name === C.LST_COLUMN_NAMES.DISTRIBUTION ? null :
              col.name === C.LST_COLUMN_NAMES.MEAN_DIFFERENCE ? stats.meanDifference :
                col.name === C.LST_COLUMN_NAMES.P_VALUE ? stats.pValue :
                  col.name === C.LST_COLUMN_NAMES.RATIO ? stats.ratio :
                    col.name in aggregatedValues ? aggregatedValues[col.name] :
                      col.name in stringAggregatedValues ? stringAggregatedValues[col.name] :
                        undefined;
      if (typeof newClusterVals[i] === 'undefined')
        _package.logger.warning(`PeptidesLSTWarn: value for column ${col.name} is undefined`);
    }
    this.logoSummaryTable.rows.addNew(newClusterVals);

    this.clusterStats[CLUSTER_TYPE.CUSTOM][newClusterName] = stats;
    this.addNewCluster(newClusterName);
  }

  /** Removes selected custom clusters from Logo Summary Table. */
  removeCluster(): void {
    const lss = this.clusterSelection[CLUSTER_TYPE.CUSTOM];

    // Names of the clusters to remove
    if (lss.length === 0) {
      grok.shell.warning('No custom clusters selected to be removed');
      return;
    }

    const viewerDfRows = this.logoSummaryTable.rows;
    const clustCol = this.logoSummaryTable.getCol(C.LST_COLUMN_NAMES.CLUSTER);
    const clustColCat = clustCol.categories;
    const dfCols = this.dataFrame.columns;

    for (const cluster of lss) {
      lss.splice(lss.indexOf(cluster), 1);
      dfCols.remove(cluster);
      delete this.clusterStats[CLUSTER_TYPE.CUSTOM][cluster];
      const clustIdx = clustColCat.indexOf(cluster);
      viewerDfRows.removeAt(clustIdx);
      this.bitsets.splice(clustIdx, 1);
    }

    clustCol.compact();

    this.clusterSelection[CLUSTER_TYPE.CUSTOM] = lss;
    this.render();
  }

  /**
   * Adds new cluster to the dataframe viewer attached to.
   * @param clusterName - cluster name.
   */
  addNewCluster(clusterName: string): void {
    const newClusterCol = DG.Column.fromBitSet(clusterName, this.model.getVisibleSelection());
    newClusterCol.setTag(C.TAGS.CUSTOM_CLUSTER, '1');
    newClusterCol.setTag(C.TAGS.ANALYSIS_COL, `${true}`);
    this.dataFrame.columns.add(newClusterCol);
    this.model.analysisView.grid.col(newClusterCol.name)!.visible = false;
  }

  /**
   * Modifies cluster selection. If shift and ctrl keys are both pressed, it removes cluster from selection.
   * If only shift key is pressed, it adds cluster to selection. If only ctrl key is pressed, it changes cluster
   * presence in selection. If none of the keys is pressed, it sets cluster as the only selected one.
   * @param cluster - cluster to modify selection with.
   * @param options - selection options.
   * @param notify - flag indicating if bitset changed event should fire.
   */
  modifyClusterSelection(cluster: type.SelectionItem, options: type.SelectionOptions = {
    shiftPressed: false,
    ctrlPressed: false,
  }, notify: boolean = true): void {
    if (notify)
      this.clusterSelection = modifySelection(this.clusterSelection, cluster, options);
    else
      this._clusterSelection = modifySelection(this.clusterSelection, cluster, options);
  }

  /**
   * Shows tooltip for a cluster.
   * @param cluster - cluster to show tooltip for.
   * @param x - x coordinate of the tooltip.
   * @param y - y coordinate of the tooltip.
   * @return - tooltip body.
   */
  showTooltip(cluster: SelectionItem, x: number, y: number): HTMLDivElement | null {
    const bs = this.dataFrame.filter;
    const filteredDf = bs.anyFalse ? this.dataFrame.clone(bs) : this.dataFrame;
    const rowCount = filteredDf.rowCount;
    const bitArray = new BitArray(rowCount, false);
    const activityCol = this.getScaledActivityColumn(bs.anyFalse);
    const activityColData = activityCol.getRawData();

    if (cluster.positionOrClusterType === CLUSTER_TYPE.ORIGINAL) {
      const origClustCol = filteredDf.getCol(this.clustersColumnName);
      const origClustColData = origClustCol.getRawData();
      const origClustColCategories = origClustCol.categories;
      const seekValue = origClustColCategories.indexOf(cluster.monomerOrCluster);

      for (let i = 0; i < rowCount; ++i) {
        if (origClustColData[i] === seekValue)
          bitArray.setTrue(i);
      }
      bitArray.incrementVersion();
    } else {
      const clustCol: DG.Column<boolean> = filteredDf.getCol(cluster.monomerOrCluster);
      bitArray.buffer = clustCol.getRawData() as Uint32Array;
    }

    const stats = bs.anyFalse ? getStats(activityColData, bitArray) :
      this.clusterStats[cluster.positionOrClusterType as ClusterType][cluster.monomerOrCluster];

    if (!stats.count)
      return null;


    const mask = DG.BitSet.fromBytes(bitArray.buffer.buffer, rowCount);
    const distributionTable = getDistributionTable(activityCol, mask);
    const hist = getActivityDistribution(distributionTable, true);
    const tableMap = getStatsTableMap(stats);
    const aggregatedColMap = getAggregatedColumnValues(this.dataFrame,
      this.getTotalViewerAggColumns(), {
        filterDf: true,
        mask: mask,
      });
    const resultMap: {
      [key: string]: any
    } = {...tableMap, ...aggregatedColMap};
    const tooltip = getDistributionPanel(hist, resultMap);

    ui.tooltip.show(tooltip, x, y);

    return tooltip;
  }

  /**
   * Creates a dataframe for WebLogo viewer.
   * @param pepCol - column with peptides.
   * @param mask - bitset to filter dataframe with.
   * @return - dataframe for WebLogo viewer.
   */
  createWebLogoDf(pepCol: DG.Column<string>, mask: DG.BitSet): DG.DataFrame {
    const newDf = DG.DataFrame.fromColumns([pepCol]);
    newDf.filter.copyFrom(mask);
    return newDf;
  }
}
