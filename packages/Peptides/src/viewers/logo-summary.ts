import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import {ClusterType, CLUSTER_TYPE, PeptidesModel, VIEWER_TYPE} from '../model';
import * as C from '../utils/constants';
import * as CR from '../utils/cell-renderer';
import {TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {getSplitterForColumn} from '@datagrok-libraries/bio/src/utils/macromolecule/utils';
import {HorizontalAlignments, PositionHeight} from '@datagrok-libraries/bio/src/viewers/web-logo';
import {getAggregatedValue, getStats, Stats} from '../utils/statistics';
import wu from 'wu';
import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';
import {getActivityDistribution, getDistributionLegend, getStatsTableMap} from '../widgets/distribution';
import {getStatsSummary} from '../utils/misc';
import BitArray from '@datagrok-libraries/utils/src/bit-array';

const getAggregatedColName = (aggF: string, colName: string): string => `${aggF}(${colName})`;

export enum LST_PROPERTIES {
  WEB_LOGO_MODE = 'webLogoMode',
  MEMBERS_RATIO_THRESHOLD = 'membersRatioThreshold',
};

export class LogoSummaryTable extends DG.JsViewer {
  _titleHost = ui.divText(VIEWER_TYPE.LOGO_SUMMARY_TABLE, {id: 'pep-viewer-title'});
  model!: PeptidesModel;
  viewerGrid!: DG.Grid;
  initialized: boolean = false;
  webLogoMode: string;
  membersRatioThreshold: number;
  webLogoDfPlot: DG.DataFrame[] = [];
  distributionDfPlot: DG.DataFrame[] = [];

  constructor() {
    super();

    this.webLogoMode = this.string(LST_PROPERTIES.WEB_LOGO_MODE, PositionHeight.Entropy,
      {choices: [PositionHeight.full, PositionHeight.Entropy]});
    this.membersRatioThreshold = this.float(LST_PROPERTIES.MEMBERS_RATIO_THRESHOLD, 0.3, {min: 0, max: 1.0});
  }

  onTableAttached(): void {
    super.onTableAttached();

    this.model = PeptidesModel.getInstance(this.dataFrame);
    this.subs.push(this.model.onSettingsChanged.subscribe(() => {
      this.createLogoSummaryGrid();
      this.render();
    }));
    this.subs.push(this.model.onNewCluster.subscribe(() => this.clusterFromSelection()));
    this.subs.push(this.model.onRemoveCluster.subscribe(() => this.removeCluster()));
    this.subs.push(this.model.onFilterChanged.subscribe(() => {
      this.createLogoSummaryGrid();
      this.render();
    }));

    this.createLogoSummaryGrid();
    this.initialized = true;
    this.render();
  }

  detach(): void {this.subs.forEach((sub) => sub.unsubscribe());}

  render(): void {
    if (this.initialized) {
      $(this.root).empty();
      const df = this.viewerGrid.dataFrame;
      if (!df.filter.anyTrue) {
        const emptyDf = ui.divText('No clusters to satisfy the threshold. ' +
          'Please, lower the threshold in viewer proeperties to include clusters');
        this.root.appendChild(ui.divV([this._titleHost, emptyDf]));
        return;
      }
      this.viewerGrid.root.style.width = 'auto';
      this.root.appendChild(ui.divV([this._titleHost, this.viewerGrid.root]));
      this.viewerGrid.invalidate();
    }
  }

  onPropertyChanged(property: DG.Property): void {
    super.onPropertyChanged(property);
    if (property.name === 'membersRatioThreshold')
      this.updateFilter();
    this.render();
  }

  createLogoSummaryGrid(): DG.Grid {
    const clustersColName = this.model.settings.clustersColumnName!;
    const isDfFiltered = this.dataFrame.filter.anyFalse;
    const filteredDf = isDfFiltered ? this.dataFrame.clone(this.dataFrame.filter) : this.dataFrame;
    const filteredDfCols = filteredDf.columns;
    const filteredDfRowCount = filteredDf.rowCount;
    const activityCol = filteredDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    const activityColData = activityCol.getRawData();

    const filteredDfClustCol = filteredDf.getCol(clustersColName);
    const filteredDfClustColData = filteredDfClustCol.getRawData();
    const filteredDfClustColCat = filteredDfClustCol.categories;

    const pepCol: DG.Column<string> = filteredDf.getCol(this.model.settings.sequenceColumnName!);

    const query: { [key: string]: string } = {};
    query[C.TAGS.CUSTOM_CLUSTER] = '1';
    const customClustColList: DG.Column<boolean>[] =
      wu(filteredDfCols.byTags(query)).filter((c) => c.max > 0).toArray();

    const customLST = DG.DataFrame.create(customClustColList.length);
    const customLSTCols = customLST.columns;
    const customLSTClustCol = customLSTCols.addNewString(clustersColName);

    const customMembersColData = customLSTCols.addNewInt(C.LST_COLUMN_NAMES.MEMBERS).getRawData();
    const customWebLogoCol = customLSTCols.addNewString(C.LST_COLUMN_NAMES.WEB_LOGO);
    const customDistCol = customLSTCols.addNewString(C.LST_COLUMN_NAMES.DISTRIBUTION);
    const customMDColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.MEAN_DIFFERENCE).getRawData();
    const customPValColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.P_VALUE).getRawData();
    const customRatioColData = customLSTCols.addNewFloat(C.LST_COLUMN_NAMES.RATIO).getRawData();

    let origLSTBuilder = filteredDf.groupBy([clustersColName]);
    const aggColsEntries = Object.entries(this.model.settings.columns ?? {});
    const aggColNames = aggColsEntries.map(([colName, aggFn]) => getAggregatedColName(aggFn, colName));
    const customAggRawCols = new Array(aggColNames.length);
    const colAggEntries = aggColsEntries.map(
      ([colName, aggFn]) => [filteredDf.getCol(colName), aggFn] as [DG.Column<number>, DG.AggregationType]);

    for (let aggIdx = 0; aggIdx < aggColsEntries.length; ++aggIdx) {
      const [colName, aggFn] = aggColsEntries[aggIdx];
      origLSTBuilder = origLSTBuilder.add(aggFn, colName, aggColNames[aggIdx]);
      const customLSTAggCol = customLSTCols.addNewFloat(aggColNames[aggIdx]);
      customAggRawCols[aggIdx] = customLSTAggCol.getRawData();
    }

    // BEGIN: fill LST part with custom clusters
    const customWebLogoTables: DG.DataFrame[] = new Array(customClustColList.length);
    const customDistTables: DG.DataFrame[] = new Array(customClustColList.length);

    for (let rowIdx = 0; rowIdx < customClustColList.length; ++rowIdx) {
      const customClustCol = customClustColList[rowIdx];
      customLSTClustCol.set(rowIdx, customClustCol.name);
      const bitArray = BitArray.fromUint32Array(filteredDfRowCount, customClustCol.getRawData() as Uint32Array);
      const bsMask = DG.BitSet.create(filteredDfRowCount, (i) => bitArray.getBit(i));

      const stats: Stats = isDfFiltered ? getStats(activityColData, bitArray) :
        this.model.clusterStats[CLUSTER_TYPE.CUSTOM][customClustCol.name];

      customMembersColData[rowIdx] = stats.count;
      customWebLogoTables[rowIdx] = this.createWebLogoPlot(pepCol, bsMask);
      customDistTables[rowIdx] = this.createDistributionPlot(activityCol, customClustColList[rowIdx]);
      customMDColData[rowIdx] = stats.meanDifference;
      customPValColData[rowIdx] = stats.pValue;
      customRatioColData[rowIdx] = stats.ratio;

      for (let aggColIdx = 0; aggColIdx < aggColNames.length; ++aggColIdx) {
        const [col, aggFn] = colAggEntries[aggColIdx];
        customAggRawCols[aggColIdx][rowIdx] = getAggregatedValue(col, aggFn, bsMask);
      }
    }

    customWebLogoCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    customDistCol.setTag(DG.TAGS.CELL_RENDERER, 'html');

    // END

    // BEGIN: fill LST part with original clusters
    const origLST = origLSTBuilder.aggregate();
    const origLSTLen = origLST.rowCount;
    const origLSTCols = origLST.columns;
    const origLSTClustCol: DG.Column<string> = origLST.getCol(clustersColName);

    const origLSTClustColCat = origLSTClustCol.categories;

    const origMembersColData = origLSTCols.addNewInt(C.LST_COLUMN_NAMES.MEMBERS).getRawData();
    const origWebLogoCol = origLSTCols.addNewString(C.LST_COLUMN_NAMES.WEB_LOGO);
    const origDistCol = origLSTCols.addNewString(C.LST_COLUMN_NAMES.DISTRIBUTION);
    const origMDColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.MEAN_DIFFERENCE).getRawData();
    const origPValColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.P_VALUE).getRawData();
    const origRatioColData = origLSTCols.addNewFloat(C.LST_COLUMN_NAMES.RATIO).getRawData();

    const origWebLogoTables: DG.DataFrame[] = new Array(origLSTLen);
    const origDistTables: DG.DataFrame[] = new Array(origLSTLen);

    const origClustMasks = Array.from({length: origLSTLen},
      () => BitArray.fromSeq(filteredDfRowCount, () => false));

    for (let rowIdx = 0; rowIdx < filteredDfRowCount; ++rowIdx) {
      const filteredClustName = filteredDfClustColCat[filteredDfClustColData[rowIdx]];
      const origClustIdx = origLSTClustColCat.indexOf(filteredClustName);
      origClustMasks[origClustIdx].setTrue(rowIdx);
    }

    for (let rowIdx = 0; rowIdx < origLSTLen; ++rowIdx) {
      const mask = origClustMasks[rowIdx];
      const bsMask = DG.BitSet.create(filteredDfRowCount, (i) => mask.getBit(i));

      const stats = isDfFiltered ? getStats(activityColData, mask) :
        this.model.clusterStats[CLUSTER_TYPE.ORIGINAL][origLSTClustColCat[rowIdx]];

      origMembersColData[rowIdx] = stats.count;
      origWebLogoTables[rowIdx] = this.createWebLogoPlot(pepCol, bsMask);
      origDistTables[rowIdx] = this.createDistributionPlot(activityCol,
        DG.Column.fromBitSet(C.COLUMNS_NAMES.SPLIT_COL, bsMask));
      origMDColData[rowIdx] = stats.meanDifference;
      origPValColData[rowIdx] = stats.pValue;
      origRatioColData[rowIdx] = stats.ratio;
    }

    origWebLogoCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    origDistCol.setTag(DG.TAGS.CELL_RENDERER, 'html');
    // END

    // combine LSTs and create a grid
    const summaryTable = origLST.append(customLST);
    this.webLogoDfPlot = origWebLogoTables.concat(customWebLogoTables);
    this.distributionDfPlot = origDistTables.concat(customDistTables);

    this.viewerGrid = summaryTable.plot.grid();
    this.viewerGrid.sort([C.LST_COLUMN_NAMES.MEMBERS], [false]);
    this.updateFilter();
    const gridClustersCol = this.viewerGrid.col(clustersColName)!;
    gridClustersCol.column!.name = C.LST_COLUMN_NAMES.CLUSTER;
    gridClustersCol.visible = true;
    this.viewerGrid.columns.setOrder([C.LST_COLUMN_NAMES.CLUSTER, C.LST_COLUMN_NAMES.MEMBERS,
      C.LST_COLUMN_NAMES.WEB_LOGO, C.LST_COLUMN_NAMES.DISTRIBUTION, C.LST_COLUMN_NAMES.MEAN_DIFFERENCE,
      C.LST_COLUMN_NAMES.P_VALUE, C.LST_COLUMN_NAMES.RATIO, ...aggColNames]);
    this.viewerGrid.columns.rowHeader!.visible = false;
    this.viewerGrid.props.rowHeight = 55;
    this.viewerGrid.onCellPrepare((cell) => {
      const currentRowIdx = cell.tableRowIndex;
      if (!cell.isTableCell || currentRowIdx === null || currentRowIdx === -1)
        return;

      const height = cell.bounds.height;
      if (cell.tableColumn?.name === C.LST_COLUMN_NAMES.WEB_LOGO) {
        const webLogoTable = this.webLogoDfPlot[currentRowIdx];
        const webLogoTableRowCount = webLogoTable.rowCount;
        const webLogoTablePepCol = webLogoTable.getCol(pepCol.name);
        const webLogoTablePepColData = webLogoTablePepCol.getRawData();
        const webLogoTablePepColCat = webLogoTablePepCol.categories;
        const splitter = getSplitterForColumn(webLogoTablePepCol);
        let maxSequenceLength = 0;
        for (let i = 0; i < webLogoTableRowCount; ++i) {
          maxSequenceLength = Math.max(maxSequenceLength,
            splitter(webLogoTablePepColCat[webLogoTablePepColData[i]]).length);
        }
        const positionWidth = Math.floor((cell.bounds.width - 2 - (4 * (maxSequenceLength - 1))) / maxSequenceLength);
        webLogoTable.plot
          .fromType('WebLogo', {positionHeight: this.webLogoMode, horizontalAlignment: HorizontalAlignments.LEFT,
            maxHeight: 1000, minHeight: height - 2, positionWidth: positionWidth})
          .then((viewer) => cell.element = viewer.root);
      } else if (cell.tableColumn?.name === C.LST_COLUMN_NAMES.DISTRIBUTION) {
        const viewerRoot = this.distributionDfPlot[currentRowIdx].plot.histogram({
          filteringEnabled: false,
          valueColumnName: C.COLUMNS_NAMES.ACTIVITY_SCALED,
          splitColumnName: C.COLUMNS_NAMES.SPLIT_COL,
          legendVisibility: 'Never',
          showXAxis: false,
          showColumnSelector: false,
          showRangeSlider: false,
          showBinSelector: false,
          backColor: DG.Color.toHtml(DG.Color.white),
          xAxisHeight: 1,
        }).root;

        viewerRoot.style.width = 'auto';
        viewerRoot.style.height = `${height-2}px`;
        cell.element = viewerRoot;
      }
    });
    this.viewerGrid.root.addEventListener('click', (ev) => {
      const cell = this.viewerGrid.hitTest(ev.offsetX, ev.offsetY);
      if (!cell || !cell.isTableCell || cell.tableColumn?.name !== clustersColName)
        return;

      summaryTable.currentRowIdx = -1;
      if (!ev.shiftKey)
        this.model.initClusterSelection({notify: false});

      this.model.modifyClusterSelection(cell.cell.value);
      this.viewerGrid.invalidate();
    });
    this.viewerGrid.onCellRender.subscribe((gridCellArgs) => {
      const gc = gridCellArgs.cell;
      if (gc.tableColumn?.name !== clustersColName || gc.isColHeader)
        return;
      const canvasContext = gridCellArgs.g;
      const bound = gridCellArgs.bounds;
      canvasContext.save();
      canvasContext.beginPath();
      canvasContext.rect(bound.x, bound.y, bound.width, bound.height);
      canvasContext.clip();
      CR.renderLogoSummaryCell(canvasContext, gc.cell.value, this.model.clusterSelection, bound);
      gridCellArgs.preventDefault();
      canvasContext.restore();
    });
    this.viewerGrid.onCellTooltip((cell, x, y) => {
      if (!cell.isColHeader && cell.tableColumn?.name === clustersColName) {
        const clustName = cell.cell.value;
        const clustColCat = this.dataFrame.getCol(this.model.settings.clustersColumnName!).categories;
        const clustType = clustColCat.includes(clustName) ? CLUSTER_TYPE.ORIGINAL : CLUSTER_TYPE.CUSTOM;
        this.showTooltip(clustName, x, y, clustType);
      }
      return true;
    });
    const webLogoGridCol = this.viewerGrid.columns.byName('WebLogo')!;
    webLogoGridCol.cellType = 'html';
    webLogoGridCol.width = 350;

    const gridProps = this.viewerGrid.props;
    gridProps.allowEdit = false;
    gridProps.allowRowSelection = false;
    gridProps.allowBlockSelection = false;
    gridProps.allowColSelection = false;

    return this.viewerGrid;
  }

  updateFilter(): void {
    const table = this.viewerGrid.table;
    const memberstCol = table.getCol(C.LST_COLUMN_NAMES.MEMBERS);
    const membersColData = memberstCol.getRawData();
    const maxCount = memberstCol.stats.max;
    const minMembers = Math.ceil(maxCount * this.membersRatioThreshold);
    table.filter.init((i) => membersColData[i] > minMembers);
  }

  clusterFromSelection(): void {
    const filteredDf = this.dataFrame.filter.anyFalse ? this.dataFrame.clone(this.dataFrame.filter, null, true) :
      this.dataFrame;
    const selection = filteredDf.selection;
    const viewerDf = this.viewerGrid.dataFrame;
    const viewerDfCols = viewerDf.columns;
    const viewerDfColsLength = viewerDfCols.length;
    const newClusterVals = new Array(viewerDfCols.length);

    const activityScaledCol = filteredDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    const bitArray = BitArray.fromString(selection.toBinaryString());
    const stats = getStats(activityScaledCol.getRawData(), bitArray);
    const distributionTable =
      DG.DataFrame.fromColumns([activityScaledCol, filteredDf.getCol(this.model.splitCol.name)]);

    const peptideCol: DG.Column<string> = filteredDf.getCol(this.model.settings.sequenceColumnName!);
    const peptideColData = peptideCol.getRawData();
    const peptideColCategories = peptideCol.categories;
    const peptideColTags = peptideCol.tags;
    const selectedIndexes = selection.getSelectedIndexes();
    const tCol = DG.Column.string('peptides', selectedIndexes.length);

    for (let i = 0; i < selectedIndexes.length; ++i)
      tCol.set(i, peptideColCategories[peptideColData[selectedIndexes[i]]]);
    for (const tag of peptideColTags)
      tCol.setTag(tag[0], tag[1]);

    const uh = new UnitsHandler(tCol);
    tCol.setTag(bioTAGS.alphabetSize, uh.getAlphabetSize().toString());

    const webLogoTable = DG.DataFrame.fromColumns([tCol]);
    this.webLogoDfPlot.push(webLogoTable);
    this.distributionDfPlot.push(distributionTable);

    const newClusterName = viewerDfCols.getUnusedName('New Cluster');

    const aggregatedValues: {[colName: string]: number} = {};
    const aggColsEntries = Object.entries(this.model.settings.columns ?? {});
    for (const [colName, aggFn] of aggColsEntries) {
      const newColName = getAggregatedColName(aggFn, colName);
      const col = filteredDf.getCol(colName);
      aggregatedValues[newColName] = getAggregatedValue(col, aggFn, selection);
    }

    for (let i = 0; i < viewerDfColsLength; ++i) {
      const col = viewerDfCols.byIndex(i);
      newClusterVals[i] = col.name === C.LST_COLUMN_NAMES.CLUSTER ? newClusterName :
        col.name === C.LST_COLUMN_NAMES.MEMBERS ? selection.trueCount :
          col.name === C.LST_COLUMN_NAMES.WEB_LOGO ? null :
            col.name === C.LST_COLUMN_NAMES.DISTRIBUTION ? null :
              col.name === C.LST_COLUMN_NAMES.MEAN_DIFFERENCE ? stats.meanDifference:
                col.name === C.LST_COLUMN_NAMES.P_VALUE ? stats.pValue:
                  col.name === C.LST_COLUMN_NAMES.RATIO ? stats.ratio:
                    col.name in aggregatedValues ? aggregatedValues[col.name] :
        console.warn(`PeptidesLSTWarn: value for column ${col.name} is undefined`)! || null;
    }
    viewerDf.rows.addNew(newClusterVals);

    this.model.clusterStats[CLUSTER_TYPE.CUSTOM][newClusterName] = stats;
    this.model.addNewCluster(newClusterName);
  }

  removeCluster(): void {
    const lss = this.model.clusterSelection;
    const customClusters = wu(this.model.customClusters).map((cluster) => cluster.name).toArray();

    // Names of the clusters to remove
    const clustNames = lss.filter((cluster) => customClusters.includes(cluster));
    if (clustNames.length === 0)
      return grok.shell.warning('No custom clusters selected to be removed');

    const viewerDf = this.viewerGrid.dataFrame;
    const viewerDfRows = viewerDf.rows;
    const clustCol = viewerDf.getCol(C.LST_COLUMN_NAMES.CLUSTER);
    const clustColCat = clustCol.categories;
    const dfCols = this.dataFrame.columns;

    for (const cluster of clustNames) {
      lss.splice(lss.indexOf(cluster), 1);
      dfCols.remove(cluster);
      delete this.model.clusterStats[CLUSTER_TYPE.CUSTOM][cluster];
      const clustIdx = clustColCat.indexOf(cluster);
      viewerDfRows.removeAt(clustIdx);
      this.webLogoDfPlot.splice(clustIdx, 1);
      this.distributionDfPlot.splice(clustIdx, 1);
    }

    clustCol.compact();

    this.model.clusterSelection = lss;
    this.render();
  }

  showTooltip(clustName: string, x: number, y: number, clustType: ClusterType = 'original'): HTMLDivElement | null {
    const bs = this.dataFrame.filter;
    const filteredDf = bs.anyFalse ? this.dataFrame.clone(bs) : this.dataFrame;
    const rowCount = filteredDf.rowCount;

    const bitArray = new BitArray(rowCount);
    const activityCol = filteredDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    const activityColData = activityCol.getRawData();


    if (clustType === CLUSTER_TYPE.ORIGINAL) {
      const origClustCol = filteredDf.getCol(C.LST_COLUMN_NAMES.CLUSTER);
      const origClustColData = origClustCol.getRawData();
      const origClustColCategories = origClustCol.categories;
      const seekValue = origClustColCategories.indexOf(clustName);

      for (let i = 0; i < rowCount; ++i)
        bitArray.setBit(i, origClustColData[i] === seekValue);
    } else {
      const clustCol: DG.Column<boolean> = filteredDf.getCol(clustName);
      bitArray.buffer = clustCol.getRawData() as Uint32Array;
    }

    const stats = bs.anyFalse ? getStats(activityColData, bitArray) : this.model.clusterStats[clustType][clustName];

    if (!stats.count)
      return null;

    const mask = DG.BitSet.create(rowCount, (i) => bitArray.getBit(i));
    const distributionTable = DG.DataFrame.fromColumns(
      [activityCol, DG.Column.fromBitSet(C.COLUMNS_NAMES.SPLIT_COL, mask)]);
    const labels = getDistributionLegend(`Cluster: ${clustName}`, 'Other');
    const hist = getActivityDistribution(distributionTable, true);
    const tableMap = getStatsTableMap(stats, {fractionDigits: 2});
    const aggregatedColMap = this.model.getAggregatedColumnValues({filterDf: true, mask: mask, fractionDigits: 2});

    const resultMap: {[key: string]: any} = {...tableMap, ...aggregatedColMap};
    const tooltip = getStatsSummary(labels, hist, resultMap, true);

    ui.tooltip.show(tooltip, x, y);

    return tooltip;
  }

  createWebLogoPlot(pepCol: DG.Column<string>, mask: DG.BitSet): DG.DataFrame {
    return DG.DataFrame.fromColumns([pepCol]).clone(mask);
  }

  createDistributionPlot(activityCol: DG.Column<number>, splitCol: DG.Column<boolean>): DG.DataFrame {
    return DG.DataFrame.fromColumns([activityCol, splitCol]);
  }
}
