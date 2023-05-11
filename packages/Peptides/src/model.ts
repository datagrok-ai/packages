import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {splitAlignedSequences} from '@datagrok-libraries/bio/src/utils/splitter';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import {MonomerWorks} from '@datagrok-libraries/bio/src/monomer-works/monomer-works';
import {pickUpPalette, TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';
import {DistanceMatrix} from '@datagrok-libraries/bio/src/trees/distance-matrix';
import {StringMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';
import {TAGS as treeTAGS} from '@datagrok-libraries/bio/src/trees';

import wu from 'wu';
import * as rxjs from 'rxjs';
import * as uuid from 'uuid';

import * as C from './utils/constants';
import * as type from './utils/types';
import {calculateSelected, extractMonomerInfo, scaleActivity, getStatsSummary} from './utils/misc';
import {MonomerPosition, MostPotentResiduesViewer} from './viewers/sar-viewer';
import * as CR from './utils/cell-renderer';
import {mutationCliffsWidget} from './widgets/mutation-cliffs';
import {getActivityDistribution, getDistributionLegend, getDistributionWidget, getStatsTableMap,
} from './widgets/distribution';
import {getAggregatedValue, getStats, Stats} from './utils/statistics';
import {LogoSummaryTable} from './viewers/logo-summary';
import {getSettingsDialog} from './widgets/settings';
import {_package, getMonomerWorksInstance, getTreeHelperInstance} from './package';
import {findMutations} from './utils/algorithms';
import {createDistanceMatrixWorker} from './utils/worker-creator';
import BitArray from '@datagrok-libraries/utils/src/bit-array';

export type SummaryStats = {
  minCount: number, maxCount: number,
  minMeanDifference: number, maxMeanDifference: number,
  minPValue: number, maxPValue: number,
  minRatio: number, maxRatio: number,
};
export type PositionStats = { [monomer: string]: Stats } & { general: SummaryStats };
export type MonomerPositionStats = { [position: string]: PositionStats } & { general: SummaryStats };
export type ClusterStats = {[cluster: string]: Stats};
export enum CLUSTER_TYPE {
  ORIGINAL = 'original',
  CUSTOM = 'custom',
};
export type ClusterType = `${CLUSTER_TYPE}`;
export type ClusterTypeStats = {[clusterType in ClusterType]: ClusterStats};
export enum VIEWER_TYPE {
  MONOMER_POSITION = 'Monomer-Position',
  MOST_POTENT_RESIDUES = 'Most Potent Residues',
  LOGO_SUMMARY_TABLE = 'Logo Summary Table',
  DENDROGRAM = 'Dendrogram',
};

export const getAggregatedColName = (aggF: string, colName: string): string => `${aggF}(${colName})`;

export class PeptidesModel {
  static modelName = 'peptidesModel';

  _settingsSubject: rxjs.Subject<type.PeptidesSettings> = new rxjs.Subject();
  _monomerPositionSelectionSubject: rxjs.Subject<undefined> = new rxjs.Subject();
  _newClusterSubject: rxjs.Subject<undefined> = new rxjs.Subject();
  _removeClusterSubject: rxjs.Subject<undefined> = new rxjs.Subject();
  _filterChangedSubject: rxjs.Subject<undefined> = new rxjs.Subject();

  _isUpdating: boolean = false;
  isBitsetChangedInitialized = false;
  isCellChanging = false;
  isUserChangedSelection = true;

  df: DG.DataFrame;
  splitCol!: DG.Column<boolean>;
  _monomerPositionStats?: MonomerPositionStats;
  _clusterStats?: ClusterTypeStats;
  _monomerPositionSelection!: type.PositionToAARList;
  _monomerPositionFilter!: type.PositionToAARList;
  _clusterSelection!: string[];
  _mutationCliffs?: type.MutationCliffs;
  isInitialized = false;
  _analysisView?: DG.TableView;

  monomerMap: { [key: string]: { molfile: string, fullName: string } } = {};
  monomerLib: IMonomerLib | null = null; // To get monomers from lib(s)
  monomerWorks: MonomerWorks | null = null; // To get processed monomers

  _settings!: type.PeptidesSettings;
  isRibbonSet = false;

  _cp?: SeqPalette;
  initBitset: DG.BitSet;
  isInvariantMapTrigger: boolean = false;
  headerSelectedMonomers: type.MonomerSelectionStats = {};
  webLogoBounds: { [positon: string]: { [monomer: string]: DG.Rect } } = {};
  cachedWebLogoTooltip: { bar: string; tooltip: HTMLDivElement | null; } = {bar: '', tooltip: null};
  _monomerPositionDf?: DG.DataFrame;
  _alphabet?: string;
  _mostPotentResiduesDf?: DG.DataFrame;
  _matrixDf?: DG.DataFrame;
  _splitSeqDf?: DG.DataFrame;
  _distanceMatrix!: DistanceMatrix;
  _treeHelper!: ITreeHelper;
  _dm!: DistanceMatrix;

  private constructor(dataFrame: DG.DataFrame) {
    this.df = dataFrame;
    this.initBitset = this.df.filter.clone();
  }

  static getInstance(dataFrame: DG.DataFrame): PeptidesModel {
    dataFrame.temp[PeptidesModel.modelName] ??= new PeptidesModel(dataFrame);
    (dataFrame.temp[PeptidesModel.modelName] as PeptidesModel).init();
    return dataFrame.temp[PeptidesModel.modelName] as PeptidesModel;
  }

  get treeHelper(): ITreeHelper {
    this._treeHelper ??= getTreeHelperInstance();
    return this._treeHelper;
  }

  get monomerPositionDf(): DG.DataFrame {
    this._monomerPositionDf ??= this.createMonomerPositionDf();
    return this._monomerPositionDf;
  }

  set monomerPositionDf(df: DG.DataFrame) {
    this._monomerPositionDf = df;
  }

  get monomerPositionStats(): MonomerPositionStats {
    this._monomerPositionStats ??= this.calculateMonomerPositionStatistics();
    return this._monomerPositionStats;
  }

  set monomerPositionStats(mps: MonomerPositionStats) {
    this._monomerPositionStats = mps;
  }

  get matrixDf(): DG.DataFrame {
    this._matrixDf ??= this.buildMatrixDf();
    return this._matrixDf;
  }

  set matrixDf(df: DG.DataFrame) {
    this._matrixDf = df;
  }

  get splitSeqDf(): DG.DataFrame {
    this._splitSeqDf ??= this.buildSplitSeqDf();
    return this._splitSeqDf;
  }

  set splitSeqDf(df: DG.DataFrame) {
    this._splitSeqDf = df;
  }

  get mostPotentResiduesDf(): DG.DataFrame {
    this._mostPotentResiduesDf ??= this.createMostPotentResiduesDf();
    return this._mostPotentResiduesDf;
  }

  set mostPotentResiduesDf(df: DG.DataFrame) {
    this._mostPotentResiduesDf = df;
  }

  get alphabet(): string {
    const col = this.df.getCol(this.settings.sequenceColumnName!);
    return col.getTag(bioTAGS.alphabet);
  }

  get mutationCliffs(): type.MutationCliffs {
    if (this._mutationCliffs)
      return this._mutationCliffs;

    const scaledActivityCol: DG.Column<number> = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    //TODO: set categories ordering the same to share compare indexes instead of strings
    const monomerColumns: type.RawColumn[] = this.df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER).map(extractMonomerInfo);
    this._mutationCliffs = findMutations(scaledActivityCol.getRawData(), monomerColumns, this.settings);
    return this._mutationCliffs;
  }

  set mutationCliffs(si: type.MutationCliffs) {
    this._mutationCliffs = si;
  }

  get clusterStats(): ClusterTypeStats {
    this._clusterStats ??= this.calculateClusterStatistics();
    return this._clusterStats;
  }

  set clusterStats(clusterStats: ClusterTypeStats) {
    this._clusterStats = clusterStats;
  }

  get cp(): SeqPalette {
    this._cp ??= pickUpPalette(this.df.getCol(this.settings.sequenceColumnName!));
    return this._cp;
  }

  set cp(_cp: SeqPalette) {
    this._cp = _cp;
  }

  get analysisView(): DG.TableView {
    this._analysisView ??=
      wu(grok.shell.tableViews).find(({dataFrame}) => dataFrame.getTag(C.TAGS.UUID) == this.df.getTag(C.TAGS.UUID)) ??
        grok.shell.addTableView(this.df);
    if (this.df.getTag(C.MULTIPLE_VIEWS) != '1')
      grok.shell.v = this._analysisView;

    return this._analysisView;
  }

  get onMonomerPositionSelectionChanged(): rxjs.Observable<undefined> {
    return this._monomerPositionSelectionSubject.asObservable();
  }

  get onSettingsChanged(): rxjs.Observable<type.PeptidesSettings> {
    return this._settingsSubject.asObservable();
  }

  get onNewCluster(): rxjs.Observable<undefined> {
    return this._newClusterSubject.asObservable();
  }

  get onRemoveCluster(): rxjs.Observable<undefined> {
    return this._removeClusterSubject.asObservable();
  }

  get onFilterChanged(): rxjs.Observable<undefined> {
    return this._filterChangedSubject.asObservable();
  }

  get monomerPositionSelection(): type.PositionToAARList {
    this._monomerPositionSelection ??= JSON.parse(this.df.tags[C.TAGS.SELECTION] || '{}');
    return this._monomerPositionSelection;
  }

  set monomerPositionSelection(selection: type.PositionToAARList) {
    this._monomerPositionSelection = selection;
    this.df.tags[C.TAGS.SELECTION] = JSON.stringify(selection);
    this.fireBitsetChanged();
    this._monomerPositionSelectionSubject.next();
    this.analysisView.grid.invalidate();
  }

  get monomerPositionFilter(): type.PositionToAARList {
    this._monomerPositionFilter ??= JSON.parse(this.df.tags[C.TAGS.FILTER] || '{}');
    return this._monomerPositionFilter;
  }

  set monomerPositionFilter(selection: type.PositionToAARList) {
    this._monomerPositionFilter = selection;
    this.df.tags[C.TAGS.FILTER] = JSON.stringify(selection);
    this.isInvariantMapTrigger = true;
    this.fireBitsetChanged(true);
    this.isInvariantMapTrigger = false;
    this.analysisView.grid.invalidate();
  }

  get clusterSelection(): string[] {
    this._clusterSelection ??= JSON.parse(this.df.tags[C.TAGS.CLUSTER_SELECTION] || '[]');
    return this._clusterSelection;
  }

  set clusterSelection(selection: string[]) {
    this._clusterSelection = selection;
    this.df.tags[C.TAGS.CLUSTER_SELECTION] = JSON.stringify(selection);
    this.fireBitsetChanged();
    this.analysisView.grid.invalidate();
  }

  get splitByPos(): boolean {
    const splitByPosFlag = (this.df.tags['distributionSplit'] || '00')[0];
    return splitByPosFlag == '1' ? true : false;
  }

  set splitByPos(flag: boolean) {
    const splitByAARFlag = (this.df.tags['distributionSplit'] || '00')[1];
    this.df.tags['distributionSplit'] = `${flag ? 1 : 0}${splitByAARFlag}`;
  }

  get splitByAAR(): boolean {
    const splitByPosFlag = (this.df.tags['distributionSplit'] || '00')[1];
    return splitByPosFlag == '1' ? true : false;
  }

  set splitByAAR(flag: boolean) {
    const splitByAARFlag = (this.df.tags['distributionSplit'] || '00')[0];
    this.df.tags['distributionSplit'] = `${splitByAARFlag}${flag ? 1 : 0}`;
  }

  get isMonomerPositionSelectionEmpty(): boolean {
    for (const aarList of Object.values(this.monomerPositionSelection)) {
      if (aarList.length !== 0)
        return false;
    }
    return true;
  }

  get isClusterSelectionEmpty(): boolean {
    return this.clusterSelection.length === 0;
  }

  get customClusters(): Iterable<DG.Column<boolean>> {
    const query: { [key: string]: string } = {};
    query[C.TAGS.CUSTOM_CLUSTER] = '1';
    return this.df.columns.byTags(query);
  }

  get settings(): type.PeptidesSettings {
    this._settings ??= JSON.parse(this.df.getTag('settings')!);
    return this._settings;
  }

  set settings(s: type.PeptidesSettings) {
    const newSettingsEntries = Object.entries(s);
    const updateVars: Set<string> = new Set();
    for (const [key, value] of newSettingsEntries) {
      this._settings[key as keyof type.PeptidesSettings] = value as any;
      switch (key) {
      case 'scaling':
        updateVars.add('activity');
        updateVars.add('mutationCliffs');
        updateVars.add('stats');
        break;
      case 'columns':
        updateVars.add('grid');
        break;
      case 'maxMutations':
      case 'minActivityDelta':
        updateVars.add('mutationCliffs');
        break;
      case 'showDendrogram':
        updateVars.add('dendrogram');
        break;
      case 'showLogoSummaryTable':
        updateVars.add('logoSummaryTable');
        break;
      case 'showMonomerPosition':
        updateVars.add('monomerPosition');
        break;
      case 'showMostPotentResidues':
        updateVars.add('mostPotentResidues');
        break;
      }
    }
    this.df.setTag('settings', JSON.stringify(this._settings));
    for (const variable of updateVars) {
      switch (variable) {
      case 'activity':
        this.createScaledCol();
        break;
      case 'mutationCliffs':
        const scaledActivityCol: DG.Column<number> = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
        //TODO: set categories ordering the same to share compare indexes instead of strings
        const monomerCols: type.RawColumn[] = this.df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER).map(extractMonomerInfo);
        this.mutationCliffs = findMutations(scaledActivityCol.getRawData(), monomerCols, this.settings);
        break;
      case 'stats':
        this.monomerPositionStats = this.calculateMonomerPositionStatistics();
        this.monomerPositionDf = this.createMonomerPositionDf();
        this.mostPotentResiduesDf = this.createMostPotentResiduesDf();
        this.clusterStats = this.calculateClusterStatistics();
        break;
      case 'grid':
        this.postProcessGrids();
        break;
      case 'dendrogram':
        this.settings.showDendrogram ? this.addDendrogram() : this.closeViewer(VIEWER_TYPE.DENDROGRAM);
        break;
      case 'logoSummaryTable':
        this.settings.showLogoSummaryTable ? this.addLogoSummaryTable() :
          this.closeViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE);
        break;
      case 'monomerPosition':
        this.settings.showMonomerPosition ? this.addMonomerPosition() :
          this.closeViewer(VIEWER_TYPE.MONOMER_POSITION);
        break;
      case 'mostPotentResidues':
        this.settings.showMostPotentResidues ? this.addMostPotentResidues() :
          this.closeViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES);
        break;
      }
    }

    //TODO: handle settings change
    this._settingsSubject.next(this.settings);
  }

  createMonomerPositionDf(): DG.DataFrame {
    const positions = this.splitSeqDf.columns.names();
    const matrixDf = this.matrixDf
      .groupBy([C.COLUMNS_NAMES.MONOMER])
      .aggregate();
    for (const pos of positions)
      matrixDf.columns.addNewString(pos);

    const monomerCol = matrixDf.getCol(C.COLUMNS_NAMES.MONOMER);
    for (let i = 0; i < monomerCol.length; ++i) {
      if (monomerCol.get(i) == '') {
        matrixDf.rows.removeAt(i);
        break;
      }
    }
    matrixDf.name = 'SAR';

    return matrixDf;
  }

  buildMatrixDf(): DG.DataFrame {
    const splitSeqDfColumns = this.splitSeqDf.columns;
    const positionColumns = splitSeqDfColumns.names();
    return this.splitSeqDf
      .groupBy(positionColumns)
      .aggregate()
      .unpivot([], positionColumns, C.COLUMNS_NAMES.POSITION, C.COLUMNS_NAMES.MONOMER)
      .groupBy([C.COLUMNS_NAMES.POSITION, C.COLUMNS_NAMES.MONOMER])
      .aggregate();
  }

  buildSplitSeqDf(): DG.DataFrame {
    const sequenceCol = this.df.getCol(this.settings.sequenceColumnName!);
    const splitSeqDf = splitAlignedSequences(sequenceCol);

    return splitSeqDf;
  }

  getCompoundBitset(): DG.BitSet {
    return this.df.selection.clone().and(this.df.filter);
  }

  createAccordion(): DG.Accordion | null {
    const trueModel: PeptidesModel | undefined = grok.shell.t.temp[PeptidesModel.modelName];
    if (!trueModel)
      return null;

    const acc = ui.accordion();
    acc.root.style.width = '100%';
    const filterAndSelectionBs = trueModel.getCompoundBitset();
    const filteredTitlePart = trueModel.df.filter.anyFalse ? ` among ${trueModel.df.filter.trueCount} filtered` : '';
    acc.addTitle(ui.h1(`${filterAndSelectionBs.trueCount} selected rows${filteredTitlePart}`));
    if (filterAndSelectionBs.anyTrue) {
      acc.addPane('Actions', () => {
        const newViewButton = ui.button('New view', () => trueModel.createNewView(),
          'Creates a new view from current selection');
        const newCluster = ui.button('New cluster', () => trueModel._newClusterSubject.next(),
          'Creates a new cluster from selection');
        const removeCluster = ui.button('Remove cluster', () => trueModel._removeClusterSubject.next(),
          'Removes currently selected custom cluster');
        removeCluster.disabled = trueModel.clusterSelection.length === 0 ||
          !wu(this.customClusters).some((c) => trueModel.clusterSelection.includes(c.name));
        return ui.divV([newViewButton, newCluster, removeCluster]);
      });
    }
    const table = trueModel.df.filter.anyFalse ? trueModel.df.clone(trueModel.df.filter, null, true) : trueModel.df;
    acc.addPane('Mutation Cliff pairs', () => mutationCliffsWidget(trueModel.df, trueModel).root);
    acc.addPane('Distribution', () => getDistributionWidget(table, trueModel).root);

    return acc;
  }

  updateGrid(): void {
    this.joinDataFrames();

    this.sortSourceGrid();

    this.createScaledCol();

    this.initMonomerPositionFilter({notify: false});
    this.initMonomerPositionSelection({notify: false});

    this.setWebLogoInteraction();
    this.webLogoBounds = {};

    this.setCellRenderers();

    this.setTooltips();

    this.setBitsetCallback();

    this.postProcessGrids();
  }

  initMonomerPositionFilter(options: {cleanInit?: boolean, notify?: boolean} = {}): void {
    options.cleanInit ??= false;
    options.notify ??= true;

    const tempFilter: type.PositionToAARList = this.monomerPositionFilter;
    const positionColumns = this.splitSeqDf.columns.names();
    for (const pos of positionColumns) {
      if (options.cleanInit || !tempFilter.hasOwnProperty(pos))
        tempFilter[pos] = [];
    }

    if (options.notify)
      this.monomerPositionFilter = tempFilter;
    else
      this._monomerPositionFilter = tempFilter;
  }

  initMonomerPositionSelection(options: {cleanInit?: boolean, notify?: boolean} = {}): void {
    options.cleanInit ??= false;
    options.notify ??= true;

    const tempSelection: type.PositionToAARList = this.monomerPositionSelection;
    const positionColumns = this.splitSeqDf.columns.names();
    for (const pos of positionColumns) {
      if (options.cleanInit || !tempSelection.hasOwnProperty(pos))
        tempSelection[pos] = [];
    }

    if (options.notify)
      this.monomerPositionSelection = tempSelection;
    else
      this._monomerPositionSelection = tempSelection;
  }

  joinDataFrames(): void {
    // append splitSeqDf columns to source table and make sure columns are not added more than once
    const name = this.df.name;
    const cols = this.df.columns;
    const positionColumns = this.splitSeqDf.columns.names();
    for (const colName of positionColumns) {
      const col = this.df.col(colName);
      const newCol = this.splitSeqDf.getCol(colName);
      if (col === null)
        cols.add(newCol);
      else {
        cols.remove(colName);
        cols.add(newCol);
      }
      CR.setAARRenderer(newCol, this.alphabet);
    }
    this.df.name = name;
  }

  sortSourceGrid(): void {
    const colNames: DG.GridColumn[] = [];
    const sourceGridCols = this.analysisView.grid.columns;
    const sourceGridColsCount = sourceGridCols.length;
    for (let i = 1; i < sourceGridColsCount; i++)
      colNames.push(sourceGridCols.byIndex(i)!);

    colNames.sort((a, b) => {
      if (a.column!.semType == C.SEM_TYPES.MONOMER) {
        if (b.column!.semType == C.SEM_TYPES.MONOMER)
          return 0;
        return -1;
      }
      if (b.column!.semType == C.SEM_TYPES.MONOMER)
        return 1;
      return 0;
    });
    sourceGridCols.setOrder(colNames.map((v) => v.name));
  }

  createScaledCol(): void {
    const sourceGrid = this.analysisView.grid;
    const scaledCol = scaleActivity(this.df.getCol(this.settings.activityColumnName!), this.settings.scaling);
    //TODO: make another func
    this.df.columns.replace(C.COLUMNS_NAMES.ACTIVITY_SCALED, scaledCol);

    sourceGrid.columns.setOrder([scaledCol.name]);
  }

  calculateMonomerPositionStatistics(): MonomerPositionStats {
    const positionColumns = this.splitSeqDf.columns.toList();
    const monomerPositionObject = {general: {}} as MonomerPositionStats & { general: SummaryStats };
    const activityColData = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED).getRawData();
    const sourceDfLen = activityColData.length;

    for (const posCol of positionColumns) {
      const posColData = posCol.getRawData();
      const posColCateogries = posCol.categories;
      const currentPositionObject = {general: {}} as PositionStats & { general: SummaryStats };

      for (let categoryIndex = 0; categoryIndex < posColCateogries.length; ++categoryIndex) {
        const monomer = posColCateogries[categoryIndex];
        if (monomer == '')
          continue;

        const bitArray = BitArray.fromSeq(sourceDfLen, (i: number) => posColData[i] === categoryIndex);
        const stats = getStats(activityColData, bitArray);
        currentPositionObject[monomer] = stats;
        this.getSummaryStats(currentPositionObject.general, stats);
      }
      monomerPositionObject[posCol.name] = currentPositionObject;
      this.getSummaryStats(monomerPositionObject.general, null, currentPositionObject.general);
    }
    return monomerPositionObject;
  }

  getSummaryStats(genObj: SummaryStats, stats: Stats | null = null, summaryStats: SummaryStats | null = null): void {
    if (stats == null && summaryStats == null)
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

    const possibleMaxPValue = stats?.pValue ?? summaryStats!.maxPValue;
    genObj.maxPValue ??= possibleMaxPValue;
    if (genObj.maxPValue < possibleMaxPValue)
      genObj.maxPValue = possibleMaxPValue;

    const possibleMinPValue = stats?.pValue ?? summaryStats!.minPValue;
    genObj.minPValue ??= possibleMinPValue;
    if (genObj.minPValue > possibleMinPValue)
      genObj.minPValue = possibleMinPValue;

    const possibleMaxRatio = stats?.ratio ?? summaryStats!.maxRatio;
    genObj.maxRatio ??= possibleMaxRatio;
    if (genObj.maxRatio < possibleMaxRatio)
      genObj.maxRatio = possibleMaxRatio;

    const possibleMinRatio = stats?.ratio ?? summaryStats!.minRatio;
    genObj.minRatio ??= possibleMinRatio;
    if (genObj.minRatio > possibleMinRatio)
      genObj.minRatio = possibleMinRatio;
  }

  calculateClusterStatistics(): ClusterTypeStats {
    const rowCount = this.df.rowCount;

    const origClustCol = this.df.getCol(this.settings.clustersColumnName!);
    const origClustColData = origClustCol.getRawData();
    const origClustColCat = origClustCol.categories;
    const origClustMasks: BitArray[] = Array.from({length: origClustColCat.length},
      () => BitArray.fromSeq(rowCount, (_: number) => false));
    for (let rowIdx = 0; rowIdx < rowCount; ++rowIdx)
      origClustMasks[origClustColData[rowIdx]].setTrue(rowIdx);


    const customClustColList = wu(this.customClusters).toArray();
    const customClustMasks = customClustColList.map(
      (v) => BitArray.fromUint32Array(rowCount, v.getRawData() as Uint32Array));
    const customClustColNamesList = customClustColList.map((v) => v.name);

    const activityColData: type.RawData = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED).getRawData();

    const origClustStats: ClusterStats = {};
    const customClustStats: ClusterStats = {};

    for (let clustType = 0; clustType < 2; ++clustType) {
      const masks = clustType == 0 ? origClustMasks : customClustMasks;
      const clustNames = clustType == 0 ? origClustColCat : customClustColNamesList;
      const resultStats = clustType == 0 ? origClustStats : customClustStats;
      for (let maskIdx = 0; maskIdx < masks.length; ++maskIdx) {
        const mask = masks[maskIdx];
        const stats = getStats(activityColData, mask);
        resultStats[clustNames[maskIdx]] = stats;
      }
    }

    const resultStats = {} as ClusterTypeStats;
    resultStats[CLUSTER_TYPE.ORIGINAL] = origClustStats;
    resultStats[CLUSTER_TYPE.CUSTOM] = customClustStats;
    return resultStats;
  }

  createMostPotentResiduesDf(): DG.DataFrame {
    const monomerPositionStatsEntries = Object.entries(this.monomerPositionStats) as [string, PositionStats][];
    const mprDf = DG.DataFrame.create(monomerPositionStatsEntries.length - 1); // Subtract 'general' entry from mp-stats
    const mprDfCols = mprDf.columns;
    const posCol = mprDfCols.addNewInt(C.COLUMNS_NAMES.POSITION);
    const monomerCol = mprDfCols.addNewString(C.COLUMNS_NAMES.MONOMER);
    const mdCol = mprDfCols.addNewFloat(C.COLUMNS_NAMES.MEAN_DIFFERENCE);
    const pValCol = mprDfCols.addNewFloat(C.COLUMNS_NAMES.P_VALUE);
    const countCol = mprDfCols.addNewInt(C.COLUMNS_NAMES.COUNT);
    const ratioCol = mprDfCols.addNewFloat(C.COLUMNS_NAMES.RATIO);

    let i = 0;
    for (const [position, positionStats] of monomerPositionStatsEntries) {
      const generalPositionStats = positionStats.general;
      if (!generalPositionStats)
        continue;

      const filteredMonomerStats = Object.entries(positionStats).filter((v) => {
        const key = v[0];
        if (key == 'general')
          return false;

        return (v[1] as Stats).pValue == generalPositionStats.minPValue;
      }) as [string, Stats][];

      let maxEntry: [string, Stats];
      for (const [monomer, monomerStats] of filteredMonomerStats) {
        if (typeof maxEntry! == 'undefined' || maxEntry[1].meanDifference < monomerStats.meanDifference)
          maxEntry = [monomer, monomerStats];
      }

      posCol.set(i, parseInt(position));
      monomerCol.set(i, maxEntry![0]);
      mdCol.set(i, maxEntry![1].meanDifference);
      pValCol.set(i, maxEntry![1].pValue);
      countCol.set(i, maxEntry![1].count);
      ratioCol.set(i, maxEntry![1].ratio);
      ++i;
    }
    return mprDf;
  }

  modifyClusterSelection(cluster: string): void {
    const tempSelection = this.clusterSelection;
    const idx = tempSelection.indexOf(cluster);
    if (idx !== -1)
      tempSelection.splice(idx, 1);
    else
      tempSelection.push(cluster);

    this.clusterSelection = tempSelection;
  }

  initClusterSelection(options: {notify?: boolean} = {}): void {
    options.notify ??= true;

    if (options.notify)
      this.clusterSelection = [];
    else
      this._clusterSelection = [];
  }

  setWebLogoInteraction(): void {
    const sourceView = this.analysisView.grid;
    const eventAction = (ev: MouseEvent): void => {
      const cell = sourceView.hitTest(ev.offsetX, ev.offsetY);
      if (cell?.isColHeader && cell.tableColumn?.semType == C.SEM_TYPES.MONOMER) {
        const newBarPart = this.findAARandPosition(cell, ev);
        this.requestBarchartAction(ev, newBarPart);
      }
    };

    // The following events makes the barchart interactive
    rxjs.fromEvent<MouseEvent>(sourceView.overlay, 'mousemove')
      .subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
    rxjs.fromEvent<MouseEvent>(sourceView.overlay, 'click')
      .subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
  }

  findAARandPosition(cell: DG.GridCell, ev: MouseEvent): { monomer: string, position: string } | null {
    const barCoords = this.webLogoBounds[cell.tableColumn!.name];
    for (const [monomer, coords] of Object.entries(barCoords)) {
      const isIntersectingX = ev.offsetX >= coords.x && ev.offsetX <= coords.x + coords.width;
      const isIntersectingY = ev.offsetY >= coords.y && ev.offsetY <= coords.y + coords.height;
      if (isIntersectingX && isIntersectingY)
        return {monomer: monomer, position: cell.tableColumn!.name};
    }

    return null;
  }

  requestBarchartAction(ev: MouseEvent, barPart: {position: string, monomer: string} | null): void {
    if (!barPart)
      return;
    const monomer = barPart.monomer;
    const position = barPart.position;
    if (ev.type === 'click') {
      if (!ev.shiftKey)
        this.initMonomerPositionSelection({cleanInit: true, notify: false});

      this.modifyMonomerPositionSelection(monomer, position, false);
    } else {
      const bar = `${position} = ${monomer}`;
      if (this.cachedWebLogoTooltip.bar == bar)
        ui.tooltip.show(this.cachedWebLogoTooltip.tooltip!, ev.clientX, ev.clientY);
      else
        this.cachedWebLogoTooltip = {bar: bar, tooltip: this.showTooltipAt(monomer, position, ev.clientX, ev.clientY)};

      //TODO: how to unghighlight?
      // this.df.rows.match(bar).highlight();
    }
  }

  setCellRenderers(): void {
    const sourceGrid = this.analysisView.grid;
    sourceGrid.setOptions({'colHeaderHeight': 130});
    sourceGrid.onCellRender.subscribe((gcArgs) => {
      const ctx = gcArgs.g;
      const bounds = gcArgs.bounds;
      const col = gcArgs.cell.tableColumn;

      ctx.save();
      try {
        ctx.beginPath();
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.clip();

        //TODO: optimize
        if (gcArgs.cell.isColHeader && col?.semType == C.SEM_TYPES.MONOMER) {
          const stats = this.monomerPositionStats[col.name];
          //TODO: precalc on stats creation
          const sortedStatsOrder = Object.keys(stats).sort((a, b) => {
            if (a == '' || a == '-')
              return -1;
            else if (b == '' || b == '-')
              return +1;
            return 0;
          }).filter((v) => v != 'general');

          this.webLogoBounds[col.name] = CR.drawLogoInBounds(ctx, bounds, stats, sortedStatsOrder, this.df.rowCount,
            this.cp, this.headerSelectedMonomers[col.name]);
          gcArgs.preventDefault();
        }
      } catch (e) {
        console.warn(`PeptidesHeaderLogoError: couldn't render WebLogo for column \`${col!.name}\`. ` +
          `See original error below.`);
        console.warn(e);
      } finally {
        ctx.restore();
      }
    });
  }

  setTooltips(): void {
    this.analysisView.grid.onCellTooltip((cell, x, y) => {
      const col = cell.tableColumn;
      const cellValue = cell.cell.value;
      if (cellValue && col && col.semType === C.SEM_TYPES.MONOMER)
        this.showMonomerTooltip(cellValue, x, y);
      return true;
    });
  }

  showMonomerTooltip(aar: string, x: number, y: number): boolean {
    const tooltipElements: HTMLDivElement[] = [];
    const monomerName = aar.toLowerCase();

    const mw = getMonomerWorksInstance();
    const mol = mw.getCappedRotatedMonomer('PEPTIDE', aar);

    if (mol) {
      tooltipElements.push(ui.div(monomerName));
      const options = {autoCrop: true, autoCropMargin: 0, suppressChiralText: true};
      tooltipElements.push(grok.chem.svgMol(mol, undefined, undefined, options));
    } else
      tooltipElements.push(ui.div(aar));

    ui.tooltip.show(ui.divV(tooltipElements), x, y);

    return mol !== null;
  }

  //TODO: move out to viewer code
  showTooltipAt(aar: string, position: string, x: number, y: number): HTMLDivElement | null {
    const stats = this.monomerPositionStats[position][aar];
    if (!stats?.count)
      return null;

    const activityCol = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    const posCol = this.df.getCol(position);
    const posColCategories = posCol.categories;
    const aarCategoryIndex = posColCategories.indexOf(aar);
    const posColData = posCol.getRawData();
    const mask = DG.BitSet.create(activityCol.length, (i) => posColData[i] === aarCategoryIndex);

    const distributionTable = DG.DataFrame.fromColumns(
      [activityCol, DG.Column.fromBitSet(C.COLUMNS_NAMES.SPLIT_COL, mask)]);
    const labels = getDistributionLegend(`${position} : ${aar}`, 'Other');
    const hist = getActivityDistribution(distributionTable, true);
    const tableMap = getStatsTableMap(stats, {fractionDigits: 2});
    const aggregatedColMap = this.getAggregatedColumnValues({mask: mask, fractionDigits: 2});

    const resultMap = {...tableMap, ...aggregatedColMap};
    const distroStatsElem = getStatsSummary(labels, hist, resultMap, true);

    ui.tooltip.show(distroStatsElem, x, y);

    return distroStatsElem;
  }

  getAggregatedColumnValues(options: {filterDf?: boolean, mask?: DG.BitSet, fractionDigits?: number} = {},
  ): StringDictionary {
    options.filterDf ??= false;

    const filteredDf = options.filterDf && this.df.filter.anyFalse ? this.df.clone(this.df.filter) : this.df;

    const colResults: StringDictionary = {};
    for (const [colName, aggFn] of Object.entries(this.settings.columns!)) {
      const newColName = getAggregatedColName(aggFn, colName);
      const value = getAggregatedValue(filteredDf.getCol(colName), aggFn, options.mask);
      colResults[newColName] = value.toFixed(options.fractionDigits);
    }
    return colResults;
  }

  modifyMonomerPositionSelection(aar: string, position: string, isFilter: boolean): void {
    const tempSelection = isFilter ? this.monomerPositionFilter : this.monomerPositionSelection;
    const tempSelectionAt = tempSelection[position];
    const aarIndex = tempSelectionAt.indexOf(aar);
    if (aarIndex === -1)
      tempSelectionAt.push(aar);
    else
      tempSelectionAt.splice(aarIndex, 1);

    if (isFilter)
      this.monomerPositionFilter = tempSelection;
    else
      this.monomerPositionSelection = tempSelection;
  }

  setBitsetCallback(): void {
    if (this.isBitsetChangedInitialized)
      return;
    const selection = this.df.selection;
    const filter = this.df.filter;
    const clusterCol = this.df.col(this.settings.clustersColumnName!);

    const changeSelectionBitset = (currentBitset: DG.BitSet, posList: type.RawColumn[], clustColCat: string[],
      clustColData: type.RawData, customClust: {[key: string]: BitArray}): void => {
      const getBitAt = (i: number): boolean => {
        for (const posRawCol of posList) {
          if (this.monomerPositionSelection[posRawCol.name].includes(posRawCol.cat![posRawCol.rawData[i]]))
            return true;
        }

        const currentOrigClust = clustColCat[clustColData[i]];
        if (typeof currentOrigClust === undefined)
          return false;

        for (const clust of this.clusterSelection) {
          if (clust === currentOrigClust)
            return true;

          if (Object.hasOwn(customClust, clust) && customClust[clust].getBit(i))
            return true;
        }

        return false;
      };
      currentBitset.init((i) => getBitAt(i), false);
    };

    selection.onChanged.subscribe(() => {
      if (this.isUserChangedSelection)
        return;

      const positionList: type.RawColumn[] = Object.keys(this.monomerPositionSelection).map((pos) => {
        const posCol = this.df.getCol(pos);
        return {name: pos, cat: posCol.categories, rawData: posCol.getRawData()};
      });

      const clustColCat = clusterCol?.categories ?? [];
      const clustColData = clusterCol?.getRawData() ?? new Int32Array(0);
      const customClust: {[key: string]: BitArray} = {};
      const rowCount = this.df.rowCount;
      for (const clust of this.customClusters)
        customClust[clust.name] = BitArray.fromUint32Array(rowCount, clust.getRawData() as Uint32Array);

      changeSelectionBitset(selection, positionList, clustColCat, clustColData, customClust);
    });

    filter.onChanged.subscribe(() => {
      const positionList = Object.keys(this.monomerPositionFilter);
      const invariantMapBitset = DG.BitSet.create(filter.length, (index) => {
        let result = true;
        for (const position of positionList) {
          const aarList = this.monomerPositionFilter[position];
          result &&= aarList.length === 0 || aarList.includes(this.df.get(position, index));
          if (!result)
            return result;
        }
        return result;
      });

      if (!this.isInvariantMapTrigger)
        this.initBitset = filter.clone();

      const temp = invariantMapBitset.and(this.initBitset);
      filter.init((i) => temp.get(i), false);

      this._filterChangedSubject.next();
    });
    this.isBitsetChangedInitialized = true;
  }

  fireBitsetChanged(fireFilterChanged: boolean = false): void {
    this.isUserChangedSelection = false;
    this.df.selection.fireChanged();
    if (fireFilterChanged)
      this.df.filter.fireChanged();
    this.modifyOrCreateSplitCol();
    this.headerSelectedMonomers = calculateSelected(this.df);

    const acc = this.createAccordion();
    if (acc != null) {
      grok.shell.o = acc.root;
      for (const pane of acc.panes)
        pane.expanded = true;
    }
    this.isUserChangedSelection = true;
  }

  postProcessGrids(): void {
    const posCols = this.splitSeqDf.columns.names();
    const sourceGrid = this.analysisView.grid;
    const sourceGridCols = sourceGrid.columns;
    const sourceGridColsLen = sourceGridCols.length;
    const visibleColumns = Object.keys(this.settings.columns || {});
    const sourceGridProps = sourceGrid.props;
    sourceGridProps.allowColSelection = false;
    sourceGridProps.allowEdit = false;
    sourceGridProps.showCurrentRowIndicator = false;
    this.df.temp[C.EMBEDDING_STATUS] = false;
    for (let colIdx = 1; colIdx < sourceGridColsLen; ++colIdx) {
      const gridCol = sourceGridCols.byIndex(colIdx)!;
      const tableColName = gridCol.column!.name;
      gridCol.visible = posCols.includes(tableColName) || (tableColName === C.COLUMNS_NAMES.ACTIVITY_SCALED) ||
        visibleColumns.includes(tableColName);
    }
  }

  closeViewer(viewerType: VIEWER_TYPE): void {
    const viewer = this.findViewer(viewerType);
    viewer?.detach();
    viewer?.close();
  }

  findViewerNode(viewerType: VIEWER_TYPE): DG.DockNode | null {
    for (const node of this.analysisView.dockManager.rootNode.children) {
      if (node.container.containerElement.innerHTML.includes(viewerType))
        return node;
    }
    return null;
  }

  async addDendrogram(): Promise<void> {
    const pi = DG.TaskBarProgressIndicator.create('Calculating distance matrix...');
    try {
      const pepColValues: string[] = this.df.getCol(this.settings.sequenceColumnName!).toList();
      this._dm ??= new DistanceMatrix(await createDistanceMatrixWorker(pepColValues, StringMetricsNames.Levenshtein));
      const leafCol = this.df.col('~leaf-id') ?? this.df.columns.addNewString('~leaf-id').init((i) => i.toString());
      const treeNode = await this.treeHelper.hierarchicalClusteringByDistance(this._dm, 'ward');

      this.df.setTag(treeTAGS.NEWICK, this.treeHelper.toNewick(treeNode));
      const leafOrdering = this.treeHelper.getLeafList(treeNode).map((leaf) => parseInt(leaf.name));
      this.analysisView.grid.setRowOrder(leafOrdering);
      const dendrogramViewer = await this.df.plot.fromType('Dendrogram', {nodeColumnName: leafCol.name}) as DG.JsViewer;

      this.analysisView.dockManager.dock(dendrogramViewer, DG.DOCK_TYPE.LEFT, null, 'Dendrogram', 0.25);
    } catch (e) {
      _package.logger.error(e as string);
    } finally {
      pi.close();
    }
  }

  getSplitColValueAt(index: number, aar: string, position: string, aarLabel: string): string {
    const currentAAR = this.df.get(position, index) as string;
    return currentAAR === aar ? aarLabel : C.CATEGORIES.OTHER;
  }

  modifyOrCreateSplitCol(): void {
    const bs = this.df.selection;
    this.splitCol = this.df.col(C.COLUMNS_NAMES.SPLIT_COL) ??
      this.df.columns.addNewBool(C.COLUMNS_NAMES.SPLIT_COL);
    this.splitCol.init((i) => bs.get(i));
    this.splitCol.compact();
  }

  /** Class initializer */
  init(): void {
    if (this.isInitialized)
      return;
    this.isInitialized = true;

    if (!this.isRibbonSet && this.df.getTag(C.MULTIPLE_VIEWS) != '1') {
      //TODO: don't pass model, pass parameters instead
      const settingsButton = ui.iconFA('wrench', () => getSettingsDialog(this), 'Peptides analysis settings');
      this.analysisView.setRibbonPanels([[settingsButton]], false);
      this.isRibbonSet = true;
      grok.events.onResetFilterRequest.subscribe(() => {
        this.isInvariantMapTrigger = true;
        this.initMonomerPositionFilter({cleanInit: true});
        this.isInvariantMapTrigger = false;
      });
    }

    this.updateGrid();
    this.fireBitsetChanged(true);
    this.analysisView.grid.invalidate();
  }

  findViewer(viewerType: VIEWER_TYPE): DG.Viewer | null {
    return wu(this.analysisView.viewers).find((v) => v.type === viewerType) || null;
  }

  async addLogoSummaryTable(): Promise<void> {
    this.closeViewer(VIEWER_TYPE.MONOMER_POSITION);
    this.closeViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES);
    const logoSummaryTable = await this.df.plot.fromType(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable;
    this.analysisView.dockManager.dock(logoSummaryTable, DG.DOCK_TYPE.RIGHT, null, VIEWER_TYPE.LOGO_SUMMARY_TABLE);
    if (this.settings.showMonomerPosition)
      await this.addMonomerPosition();
    if (this.settings.showMostPotentResidues)
      await this.addMostPotentResidues();
  }

  async addMonomerPosition(): Promise<void> {
    const monomerPosition = await this.df.plot.fromType(VIEWER_TYPE.MONOMER_POSITION) as MonomerPosition;
    const mostPotentResidues = this.findViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES) as MostPotentResiduesViewer | null;
    const dm = this.analysisView.dockManager;
    const [dockType, refNode, ratio] = mostPotentResidues === null ? [DG.DOCK_TYPE.DOWN, null, undefined] :
      [DG.DOCK_TYPE.LEFT, this.findViewerNode(VIEWER_TYPE.MOST_POTENT_RESIDUES), 0.7];
    dm.dock(monomerPosition, dockType, refNode, VIEWER_TYPE.MONOMER_POSITION, ratio);
  }

  async addMostPotentResidues(): Promise<void> {
    const mostPotentResidues =
      await this.df.plot.fromType(VIEWER_TYPE.MOST_POTENT_RESIDUES) as MostPotentResiduesViewer;
    const monomerPosition = this.findViewer(VIEWER_TYPE.MONOMER_POSITION) as MonomerPosition | null;
    const dm = this.analysisView.dockManager;
    const [dockType, refNode, ratio] = monomerPosition === null ? [DG.DOCK_TYPE.DOWN, null, undefined] :
      [DG.DOCK_TYPE.RIGHT, this.findViewerNode(VIEWER_TYPE.MONOMER_POSITION), 0.3];
    dm.dock(mostPotentResidues, dockType, refNode, VIEWER_TYPE.MOST_POTENT_RESIDUES, ratio);
  }

  addNewCluster(clusterName: string): void {
    const newClusterCol = DG.Column.fromBitSet(clusterName, this.getCompoundBitset());
    newClusterCol.setTag(C.TAGS.CUSTOM_CLUSTER, '1');
    this.df.columns.add(newClusterCol);
    this.analysisView.grid.col(newClusterCol.name)!.visible = false;
  }

  createNewView(): void {
    const rowMask = this.getCompoundBitset();
    if (!rowMask.anyTrue)
      return grok.shell.warning('Cannot create a new view, there are no visible selected rows in your dataset');

    const newDf = this.df.clone(rowMask);
    for (const [tag, value] of newDf.tags)
      newDf.setTag(tag, tag == C.TAGS.SETTINGS ? value : '');
    newDf.name = 'Peptides Multiple Views';
    newDf.setTag(C.MULTIPLE_VIEWS, '1');
    newDf.setTag(C.TAGS.UUID, uuid.v4());
    const view = grok.shell.addTableView(newDf);
    view.addViewer('logo-summary-viewer');
  }
}
