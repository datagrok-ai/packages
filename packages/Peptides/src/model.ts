import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {splitAlignedSequences} from '@datagrok-libraries/bio/src/utils/splitter';

import wu from 'wu';
import * as rxjs from 'rxjs';

import * as C from './utils/constants';
import * as type from './utils/types';
import {calculateSelected, extractMonomerInfo, scaleActivity, wrapDistroAndStatsDefault} from './utils/misc';
import {MonomerPosition, MostPotentResiduesViewer} from './viewers/sar-viewer';
import * as CR from './utils/cell-renderer';
import {mutationCliffsWidget} from './widgets/mutation-cliffs';
import {getDistributionAndStats, getDistributionWidget} from './widgets/distribution';
import {getStats, Stats} from './utils/statistics';
import {LogoSummary} from './viewers/logo-summary';
import {getSettingsDialog} from './widgets/settings';
import {getMonomerWorks} from './package';
import {findMutations} from './utils/algorithms';
import {IMonomerLib, MonomerWorks, pickUpPalette, SeqPalette, TAGS as bioTAGS} from '@datagrok-libraries/bio';
import {DataFrame} from 'datagrok-api/dg';

export type SummaryStats = {
  minCount: number, maxCount: number,
  minMeanDifference: number, maxMeanDifference: number,
  minPValue: number, maxPValue: number,
  minRatio: number, maxRatio: number,
};
export type PositionStats = {[monomer: string]: Stats} & {general: SummaryStats};
export type MonomerPositionStats = {[position: string]: PositionStats} & {general: SummaryStats};

export class PeptidesModel {
  static modelName = 'peptidesModel';

  settingsSubject: rxjs.Subject<type.PeptidesSettings> = new rxjs.Subject();
  _mutatinCliffsSelectionSubject: rxjs.Subject<undefined> = new rxjs.Subject();

  _isUpdating: boolean = false;
  isBitsetChangedInitialized = false;
  isCellChanging = false;

  df: DG.DataFrame;
  splitCol!: DG.Column<boolean>;
  edf: DG.DataFrame | null = null;
  _monomerPositionStats?: MonomerPositionStats;
  _clusterStats?: Stats[];
  _mutationCliffsSelection!: type.PositionToAARList;
  _invariantMapSelection!: type.PositionToAARList;
  _logoSummarySelection!: number[];
  _substitutionsInfo?: type.SubstitutionsInfo;
  isInitialized = false;
  _analysisView?: DG.TableView;

  isPeptideSpaceChangingBitset = false;
  isChangingEdfBitset = false;

  monomerMap: { [key: string]: { molfile: string, fullName: string } } = {};
  monomerLib: IMonomerLib | null = null; // To get monomers from lib(s)
  monomerWorks: MonomerWorks | null = null; // To get processed monomers

  _settings!: type.PeptidesSettings;
  isRibbonSet = false;

  _cp?: SeqPalette;
  initBitset: DG.BitSet;
  isInvariantMapTrigger: boolean = false;
  headerSelectedMonomers: type.MonomerSelectionStats = {};
  webLogoBounds: {[positon: string]: {[monomer: string]: DG.Rect}} = {};
  cachedWebLogoTooltip: {bar: string; tooltip: HTMLDivElement | null;} = {bar: '', tooltip: null};
  _monomerPositionDf?: DG.DataFrame;
  _alphabet?: string;
  _mostPotentResiduesDf?: DG.DataFrame;
  _matrixDf?: DG.DataFrame;
  _splitSeqDf?: DG.DataFrame;

  private constructor(dataFrame: DG.DataFrame) {
    this.df = dataFrame;
    this.initBitset = this.df.filter.clone();
  }

  static getInstance(dataFrame: DG.DataFrame): PeptidesModel {
    dataFrame.temp[PeptidesModel.modelName] ??= new PeptidesModel(dataFrame);
    (dataFrame.temp[PeptidesModel.modelName] as PeptidesModel).init();
    return dataFrame.temp[PeptidesModel.modelName] as PeptidesModel;
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
    const col = this.settings.sequenceColumnName ? this.df.getCol(this.settings.sequenceColumnName) :
      this.df.columns.bySemType(DG.SEMTYPE.MACROMOLECULE)!;
    return col.getTag(bioTAGS.alphabet);
  }

  get substitutionsInfo(): type.SubstitutionsInfo {
    if (this._substitutionsInfo)
      return this._substitutionsInfo;

    const scaledActivityCol: DG.Column<number> = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    //TODO: set categories ordering the same to share compare indexes instead of strings
    const monomerColumns: type.RawColumn[] = this.df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER).map(extractMonomerInfo);
    this._substitutionsInfo = findMutations(scaledActivityCol.getRawData(), monomerColumns, this.settings);
    return this._substitutionsInfo;
  }
  set substitutionsInfo(si: type.SubstitutionsInfo) {
    this._substitutionsInfo = si;
  }

  get clusterStats(): Stats[] {
    this._clusterStats ??= this.calculateClusterStatistics();
    return this._clusterStats;
  }
  set clusterStats(clusterStats: Stats[]) {
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
    const shell = grok.shell;
    if (this.df.getTag('newAnalysis') !== '1') {
      this._analysisView = wu(shell.tableViews)
        .find(({dataFrame}) => dataFrame.tags[C.PEPTIDES_ANALYSIS] === '1' && dataFrame.name == this.df.name)!;
      grok.shell.v = this._analysisView;
    }

    this._analysisView ??= shell.addTableView(this.df);
    this.df.setTag('newAnalysis', '');
    return this._analysisView;
  }

  get onMutationCliffsSelectionChanged(): rxjs.Observable<undefined> {
    return this._mutatinCliffsSelectionSubject.asObservable();
  }

  get onSettingsChanged(): rxjs.Observable<type.PeptidesSettings> {
    return this.settingsSubject.asObservable();
  }

  get mutationCliffsSelection(): type.PositionToAARList {
    this._mutationCliffsSelection ??= JSON.parse(this.df.tags[C.TAGS.SELECTION] || '{}');
    return this._mutationCliffsSelection;
  }

  set mutationCliffsSelection(selection: type.PositionToAARList) {
    this._mutationCliffsSelection = selection;
    this.df.tags[C.TAGS.SELECTION] = JSON.stringify(selection);
    this.fireBitsetChanged();
    this._mutatinCliffsSelectionSubject.next();
    this.analysisView.grid.invalidate();
  }

  get invariantMapSelection(): type.PositionToAARList {
    this._invariantMapSelection ??= JSON.parse(this.df.tags[C.TAGS.FILTER] || '{}');
    return this._invariantMapSelection;
  }

  set invariantMapSelection(selection: type.PositionToAARList) {
    this._invariantMapSelection = selection;
    this.df.tags[C.TAGS.FILTER] = JSON.stringify(selection);
    this.isInvariantMapTrigger = true;
    this.df.filter.fireChanged();
    this.isInvariantMapTrigger = false;
    this.analysisView.grid.invalidate();
  }

  get logoSummarySelection(): number[] {
    this._logoSummarySelection ??= JSON.parse(this.df.tags[C.TAGS.CLUSTER_SELECTION] || '[]');
    return this._logoSummarySelection;
  }

  set logoSummarySelection(selection: number[]) {
    this._logoSummarySelection = selection;
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

  get isInvariantMap(): boolean {
    return this.df.getTag('isInvariantMap') === '1';
  }

  set isInvariantMap(x: boolean) {
    this.df.setTag('isInvariantMap', x ? '1' : '0');
  }

  get isMutationCliffSelectionEmpty(): boolean {
    for (const aarList of Object.values(this.mutationCliffsSelection)) {
      if (aarList.length !== 0)
        return false;
    }
    return true;
  }

  get isLogoSummarySelectionEmpty(): boolean {
    return this.logoSummarySelection.length === 0;
  }

  get customClusters(): Iterable<DG.Column<boolean>> {
    const query: {[key: string]: string} = {};
    query[C.TAGS.CUSTOM_CLUSTER] = '1';
    return this.df.columns.byTags(query);
  }

  get settings(): type.PeptidesSettings {
    this._settings ??= JSON.parse(this.df.getTag('settings') || '{}');
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
      // case 'columns':
      //   updateVars.add('grid');
      //   break;
      case 'maxMutations':
      case 'minActivityDelta':
        updateVars.add('mutationCliffs');
        break;
      }
    }
    this.df.setTag('settings', JSON.stringify(this._settings));
    // this.updateDefault();
    for (const variable of updateVars) {
      switch (variable) {
      case 'activity':
        this.createScaledCol();
        break;
      case 'mutationCliffs':
        const scaledActivityCol: DG.Column<number> = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
        //TODO: set categories ordering the same to share compare indexes instead of strings
        const monomerColumns: type.RawColumn[] = this.df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER).map(extractMonomerInfo);
        this.substitutionsInfo = findMutations(scaledActivityCol.getRawData(), monomerColumns, this.settings);
        break;
      case 'stats':
        this.monomerPositionStats = this.calculateMonomerPositionStatistics();
        this.monomerPositionDf = this.createMonomerPositionDf();
        this.mostPotentResiduesDf = this.createMostPotentResiduesDf();
        this.clusterStats = this.calculateClusterStatistics();
        break;
      case 'grid':
        this.updateGrid();
        break;
      }
    }

    //TODO: handle settings change
    this.settingsSubject.next(this.settings);
  }

  createMonomerPositionDf(): DG.DataFrame {
    const positions = this.splitSeqDf.columns.names();
    const matrixDf = this.matrixDf
      .groupBy([C.COLUMNS_NAMES.MONOMER])
      // .pivot(C.COLUMNS_NAMES.POSITION)
      // .add('values')
      // .add('first', C.COLUMNS_NAMES.MEAN_DIFFERENCE, '')
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

  createAccordion(): DG.Accordion {
    const acc = ui.accordion();
    acc.root.style.width = '100%';
    acc.addTitle(ui.h1(`${this.df.selection.trueCount} selected rows`));
    acc.addPane('Mutation Cliff pairs', () => mutationCliffsWidget(this.df, this).root);
    acc.addPane('Distribution', () => getDistributionWidget(this.df, this).root);

    return acc;
  }

  updateDefault(): void {
    if (!this._isUpdating || !this.isInitialized) {
      this._isUpdating = true;
      this.updateGrid();

      this.analysisView.grid.invalidate();
      this._isUpdating = false;
    }
  }

  updateGrid(): void {
    this.joinDataFrames();

    this.sortSourceGrid();

    this.createScaledCol();

    this.initSelections();

    this.setWebLogoInteraction();
    this.webLogoBounds = {};

    this.setCellRenderers();

    this.setTooltips();

    this.setBitsetCallback();

    this.postProcessGrids();
  }

  initSelections(): void {
    const tempInvariantMapSelection: type.PositionToAARList = this.invariantMapSelection;
    const mutationCliffsSelection: type.PositionToAARList = this.mutationCliffsSelection;
    const positionColumns = this.splitSeqDf.columns.names();
    for (const pos of positionColumns) {
      tempInvariantMapSelection[pos] ??= [];
      mutationCliffsSelection[pos] ??= [];
    }
    this.invariantMapSelection = tempInvariantMapSelection;
    this.mutationCliffsSelection = mutationCliffsSelection;
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
    const monomerPositionObject = {general: {}} as MonomerPositionStats & {general: SummaryStats};
    const activityColData = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED).getRawData();
    const sourceDfLen = activityColData.length;

    for (const posCol of positionColumns) {
      const posColData = posCol.getRawData();
      const currentMonomerSet = posCol.categories;
      const currentPositionObject = {general: {}} as PositionStats & {general: SummaryStats};

      for (const [categoryIndex, monomer] of currentMonomerSet.entries()) {
        if (monomer == '')
          continue;

        const mask: boolean[] = new Array(sourceDfLen);
        let trueCount = 0;
        for (let j = 0; j < sourceDfLen; ++j) {
          mask[j] = posColData[j] == categoryIndex;

          if (mask[j])
            ++trueCount;
        }

        const maskInfo = {
          trueCount: trueCount,
          falseCount: sourceDfLen - trueCount,
          mask: mask,
        };

        const stats = getStats(activityColData, maskInfo);
        currentPositionObject[monomer] = stats;

        this.getSummaryStats(currentPositionObject.general, stats);
      }
      monomerPositionObject[posCol.name] = currentPositionObject;
      this.getSummaryStats(monomerPositionObject.general, null, currentPositionObject.general);
    }
    return monomerPositionObject;
  }

  getSummaryStats(generalObj: SummaryStats, stats: Stats | null = null, summaryStats: SummaryStats | null = null): void {
    if (stats == null && summaryStats == null)
      throw new Error(`MonomerPositionStatsError: either stats or summaryStats must be present`);

    const possibleMaxCount = stats?.count ?? summaryStats!.maxCount;
    generalObj.maxCount ??= possibleMaxCount;
    if (generalObj.maxCount < possibleMaxCount)
      generalObj.maxCount = possibleMaxCount;

    const possibleMinCount = stats?.count ?? summaryStats!.minCount;
    generalObj.minCount ??= possibleMinCount;
    if (generalObj.minCount > possibleMinCount)
      generalObj.minCount = possibleMinCount;

    const possibleMaxMeanDifference = stats?.meanDifference ?? summaryStats!.maxMeanDifference;
    generalObj.maxMeanDifference ??= possibleMaxMeanDifference;
    if (generalObj.maxMeanDifference < possibleMaxMeanDifference)
      generalObj.maxMeanDifference = possibleMaxMeanDifference;

    const possibleMinMeanDifference = stats?.meanDifference ?? summaryStats!.minMeanDifference;
    generalObj.minMeanDifference ??= possibleMinMeanDifference;
    if (generalObj.minMeanDifference > possibleMinMeanDifference)
      generalObj.minMeanDifference = possibleMinMeanDifference;

    const possibleMaxPValue = stats?.pValue ?? summaryStats!.maxPValue;
    generalObj.maxPValue ??= possibleMaxPValue;
    if (generalObj.maxPValue < possibleMaxPValue)
      generalObj.maxPValue = possibleMaxPValue;

    const possibleMinPValue = stats?.pValue ?? summaryStats!.minPValue;
    generalObj.minPValue ??= possibleMinPValue;
    if (generalObj.minPValue > possibleMinPValue)
      generalObj.minPValue = possibleMinPValue;

    const possibleMaxRatio = stats?.ratio ?? summaryStats!.maxRatio;
    generalObj.maxRatio ??= possibleMaxRatio;
    if (generalObj.maxRatio < possibleMaxRatio)
      generalObj.maxRatio = possibleMaxRatio;

    const possibleMinRatio = stats?.ratio ?? summaryStats!.minRatio;
    generalObj.minRatio ??= possibleMinRatio;
    if (generalObj.minRatio > possibleMinRatio)
      generalObj.minRatio = possibleMinRatio;
  }

  calculateClusterStatistics(): Stats[] {
    const originalClustersCol = this.df.getCol(this.settings.clustersColumnName!);
    const originalClustersColData = originalClustersCol.getRawData();
    const originalClustersColCategories = originalClustersCol.categories;

    const customClustersColumnsList = wu(this.customClusters).toArray();

    const activityColData: type.RawData = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED).getRawData();
    const activityColLen = activityColData.length;

    const resultStats: Stats[] = new Array(originalClustersColCategories.length + customClustersColumnsList.length);

    for (let clusterIdx = 0; clusterIdx < resultStats.length; ++clusterIdx) {
      const customClusterIdx = clusterIdx - originalClustersColCategories.length;
      const customClusterColData = customClustersColumnsList[customClusterIdx]?.toList();
      const isAcitvityIdxValid = customClusterIdx < 0 ?
        (i: number) => clusterIdx == originalClustersColData[i] :
        (i: number) => customClusterColData[i];

      const mask = new Array(activityColLen);
      let trueCount = 0;
      for (let maskIdx = 0; maskIdx < activityColLen; ++maskIdx) {
        mask[maskIdx] = isAcitvityIdxValid(maskIdx);

        if (mask[maskIdx])
          ++trueCount;
      }

      const maskInfo = {
        trueCount: trueCount,
        falseCount: activityColLen - trueCount,
        mask: mask,
      };

      const stats = getStats(activityColData, maskInfo);
      resultStats[clusterIdx] = stats;
    }

    return resultStats;
  }

  createMostPotentResiduesDf(): DG.DataFrame {
    const monomerPositionStatsEntries = Object.entries(this.monomerPositionStats) as [string, PositionStats][];
    const mprDf = DG.DataFrame.create(monomerPositionStatsEntries.length - 1); // Subtract 'general' entry from mp-stats
    const mprDfCols = mprDf.columns;
    const posCol = mprDfCols.addNewString(C.COLUMNS_NAMES.POSITION);
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

      posCol.set(i, position);
      monomerCol.set(i, maxEntry![0]);
      mdCol.set(i, maxEntry![1].meanDifference);
      pValCol.set(i, maxEntry![1].pValue);
      countCol.set(i, maxEntry![1].count);
      ratioCol.set(i, maxEntry![1].ratio);
      ++i;
    }
    return mprDf;
  }

  modifyClusterSelection(cluster: number): void {
    const tempSelection = this.logoSummarySelection;
    const idx = tempSelection.indexOf(cluster);
    if (idx !== -1)
      tempSelection.splice(idx, 1);
    else
      tempSelection.push(cluster);

    this.logoSummarySelection = tempSelection;
  }

  initClusterSelection(cluster: number): void {
    this.logoSummarySelection = [cluster];
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

  requestBarchartAction(ev: MouseEvent, barPart: { position: string, monomer: string } | null): void {
    if (!barPart)
      return;
    const monomer = barPart.monomer;
    const position = barPart.position;
    if (ev.type === 'click') {
      ev.shiftKey ? this.modifyMonomerPositionSelection(monomer, position, false) :
        this.initMonomerPositionSelection(monomer, position, false);
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

          this.webLogoBounds[col.name] =
            CR.drawLogoInBounds(ctx, bounds, stats, sortedStatsOrder, this.df.rowCount, this.cp, this.headerSelectedMonomers[col.name]);
          gcArgs.preventDefault();
        }
      } catch (e) {
        console.warn(`PeptidesHeaderLogoError: couldn't render WebLogo for column \`${col!.name}\`. See original error below.`);
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

  showMonomerTooltip(aar: string, x: number, y: number): void {
    const tooltipElements: HTMLDivElement[] = [];
    const monomerName = aar.toLowerCase();

    const mw = getMonomerWorks();
    const mol = mw?.getCappedRotatedMonomer('PEPTIDE', aar);

    if (mol) {
      tooltipElements.push(ui.div(monomerName));
      const options = {autoCrop: true, autoCropMargin: 0, suppressChiralText: true};
      tooltipElements.push(grok.chem.svgMol(mol, undefined, undefined, options));
    } else
      tooltipElements.push(ui.div(aar));

    ui.tooltip.show(ui.divV(tooltipElements), x, y);
  }

  //TODO: move out to viewer code
  showTooltipAt(aar: string, position: string, x: number, y: number): HTMLDivElement | null {
    const stats = this.monomerPositionStats[position][aar];
    if (!stats?.count)
      return null;

    const activityCol = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    //TODO: use bitset instead of splitCol
    const splitCol = DG.Column.bool(C.COLUMNS_NAMES.SPLIT_COL, activityCol.length);
    const currentPosCol = this.df.getCol(position);
    const indexes: number[] = [];
    splitCol.init((i) => {
      const sameMonomer = currentPosCol.get(i) == aar;
      if (sameMonomer)
        indexes.push(i);

      return sameMonomer;
    });
    const colResults: {[colName: string]: number} = {};
    for (const [col, agg] of Object.entries(this.settings.columns || {})) {
      const currentCol = this.df.getCol(col);
      const currentColData = currentCol.getRawData();
      const tempCol = DG.Column.float('', indexes.length);
      tempCol.init((i) => currentColData[indexes[i]]);
      colResults[`${agg}(${col})`] = tempCol.stats[agg as keyof DG.Stats] as number;
    }

    const distributionTable = DG.DataFrame.fromColumns([activityCol, splitCol]);
    const das = getDistributionAndStats(distributionTable, stats, `${position} : ${aar}`, 'Other', true);
    const resultMap: {[key: string]: any} = {...das.tableMap, ...colResults};
    const distroStatsElem = wrapDistroAndStatsDefault(das.labels, das.histRoot, resultMap);

    ui.tooltip.show(distroStatsElem, x, y);

    return distroStatsElem;
  }

  showTooltipCluster(cluster: number, x: number, y: number, clusterName: string): HTMLDivElement | null {
    const stats = this.clusterStats[cluster];
    const activityCol = this.df.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    //TODO: use bitset instead of splitCol
    const clusterCol = this.df.getCol(this.settings.clustersColumnName!);
    const clusterColData = clusterCol.getRawData();
    let splitCol = DG.Column.bool(C.COLUMNS_NAMES.SPLIT_COL, activityCol.length);
    splitCol.init((i) => clusterColData[i] == cluster);
    if (splitCol.max == 0)
      splitCol = this.df.getCol(clusterName);
    const distDf = DG.DataFrame.fromColumns([activityCol, splitCol]);

    if (!stats.count)
      return null;

    const das = getDistributionAndStats(distDf, stats, `Cluster: ${clusterName}`, 'Other', true, splitCol.name);
    const tooltip = wrapDistroAndStatsDefault(das.labels, das.histRoot, das.tableMap, true);

    ui.tooltip.show(tooltip, x, y);

    return tooltip;
  }

  modifyMonomerPositionSelection(aar: string, position: string, isInvariantMapSelection: boolean): void {
    const tempSelection = isInvariantMapSelection ? this.invariantMapSelection : this.mutationCliffsSelection;
    const tempSelectionAt = tempSelection[position];
    const aarIndex = tempSelectionAt.indexOf(aar);
    if (aarIndex === -1)
      tempSelectionAt.push(aar);
    else
      tempSelectionAt.splice(aarIndex, 1);

    if (isInvariantMapSelection)
      this.invariantMapSelection = tempSelection;
    else
      this.mutationCliffsSelection = tempSelection;
  }

  initMonomerPositionSelection(aar: string, position: string, isInvariantMapSelection: boolean): void {
    const tempSelection = isInvariantMapSelection ? this.invariantMapSelection : this.mutationCliffsSelection;
    for (const key of Object.keys(tempSelection))
      tempSelection[key] = [];
    tempSelection[position] = [aar];

    if (isInvariantMapSelection)
      this.invariantMapSelection = tempSelection;
    else
      this.mutationCliffsSelection = tempSelection;
  }

  setBitsetCallback(): void {
    if (this.isBitsetChangedInitialized)
      return;
    const selection = this.df.selection;
    const filter = this.df.filter;
    const clusterCol = this.df.col(this.settings.clustersColumnName!);

    const changeSelectionBitset = (currentBitset: DG.BitSet): void => {
      const clusterColData = clusterCol?.getRawData();

      const edfSelection = this.edf?.selection;
      if (this.isPeptideSpaceChangingBitset) {
        if (edfSelection == null)
          return;

        currentBitset.init((i) => edfSelection.get(i) || false, false);
        return;
      }

      const updateEdfSelection = (): void => {
        this.isChangingEdfBitset = true;
        edfSelection?.copyFrom(currentBitset);
        this.isChangingEdfBitset = false;
      };

      const positionList = Object.keys(this.mutationCliffsSelection);

      //TODO: move out
      const getBitAt = (i: number): boolean => {
        for (const position of positionList) {
          const positionCol: DG.Column<string> = this.df.getCol(position);
          if (this.mutationCliffsSelection[position].includes(positionCol.get(i)!))
            return true;
        }
        if (clusterColData && this.logoSummarySelection.includes(clusterColData[i]))
          return true;
        return false;
      };
      currentBitset.init((i) => getBitAt(i), false);

      updateEdfSelection();
    };

    selection.onChanged.subscribe(() => changeSelectionBitset(selection));

    filter.onChanged.subscribe(() => {
      const positionList = Object.keys(this.invariantMapSelection);
      const invariantMapBitset = DG.BitSet.create(filter.length, (index) => {
        let result = true;
        for (const position of positionList) {
          const aarList = this.invariantMapSelection[position];
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
    });
    this.isBitsetChangedInitialized = true;
  }

  fireBitsetChanged(isPeptideSpaceSource: boolean = false): void {
    this.isPeptideSpaceChangingBitset = isPeptideSpaceSource;
    this.df.selection.fireChanged();
    this.modifyOrCreateSplitCol();
    this.headerSelectedMonomers = calculateSelected(this.df);
    const acc = this.createAccordion();
    grok.shell.o = acc.root;
    for (const pane of acc.panes)
      pane.expanded = true;
    this.isPeptideSpaceChangingBitset = false;
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
    sourceGridProps.allowRowResizing = false;
    sourceGridProps.showCurrentRowIndicator = false;
    this.df.temp[C.EMBEDDING_STATUS] = false;
    for (let colIdx = 1; colIdx < sourceGridColsLen; ++colIdx) {
      const gridCol = sourceGridCols.byIndex(colIdx)!;
      const tableColName = gridCol.column!.name;
      gridCol.visible = posCols.includes(tableColName) || (tableColName === C.COLUMNS_NAMES.ACTIVITY_SCALED) ||
        visibleColumns.includes(tableColName);
      gridCol.width = 60;
    }
    setTimeout(() => {
      sourceGridProps.rowHeight = 20;
    }, 500);
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

    if (!this.isRibbonSet && this.df.getTag('setRibbon') != '0') {
      //TODO: don't pass model, pass parameters instead
      const settingsButton = ui.bigButton('Settings', () => getSettingsDialog(this), 'Peptides analysis settings');
      const newViewName = ui.stringInput('', 'New peptides view');
      const newViewButton = ui.bigButton('New view', async () => {
        const tv = wu(grok.shell.tableViews).find(({dataFrame}) => dataFrame.name == newViewName.stringValue);
        if (tv)
          return grok.shell.warning('View with this name already exists!');
        await this.createNewView(newViewName.stringValue);
      },
      'Creates a new view from current selection');
      this.analysisView.setRibbonPanels([[settingsButton], [newViewName.root, newViewButton]], false);
      this.isRibbonSet = true;
    }

    this.df.tags[C.PEPTIDES_ANALYSIS] = '1';

    this.updateDefault();

    this.analysisView.grid.invalidate();
  }

  async addViewers(): Promise<void> {
    const dockManager = this.analysisView.dockManager;
    const dfPlt = this.df.plot;

    const mutationCliffsViewer = await dfPlt.fromType('peptide-sar-viewer') as MonomerPosition;
    const mostPotentResiduesViewer = await dfPlt.fromType('peptide-sar-viewer-vertical') as MostPotentResiduesViewer;
    if (this.settings.clustersColumnName)
      await this.addLogoSummaryTableViewer();

    const mcNode = dockManager.dock(mutationCliffsViewer, DG.DOCK_TYPE.DOWN, null, mutationCliffsViewer.name);

    dockManager.dock(mostPotentResiduesViewer, DG.DOCK_TYPE.RIGHT, mcNode, mostPotentResiduesViewer.name, 0.3);
  }

  async addLogoSummaryTableViewer(): Promise<void> {
    const logoSummary = await this.df.plot.fromType('logo-summary-viewer') as LogoSummary;
    this.analysisView.dockManager.dock(logoSummary, DG.DOCK_TYPE.RIGHT, null, 'Logo Summary Table');
  }

  addNewCluster(clusterName: string): void {
    const newClusterCol = DG.Column.fromBitSet(clusterName, this.df.selection);
    newClusterCol.setTag(C.TAGS.CUSTOM_CLUSTER, '1');
    this.df.columns.add(newClusterCol);
    this.analysisView.grid.col(newClusterCol.name)!.visible = false;
  }

  async createNewView(dfName: string): Promise<void> {
    const rowMask = this.df.selection.clone().and(this.df.filter);
    const newDf = this.df.clone(rowMask);
    for (const [tag, value] of newDf.tags)
      newDf.setTag(tag, tag == C.TAGS.SETTINGS ? value : '');
    newDf.name = dfName;
    newDf.setTag('setRibbon', '0');
    const view = grok.shell.addTableView(newDf);
    view.addViewer('logo-summary-viewer');
    grok.shell.v = view;
  }
}
