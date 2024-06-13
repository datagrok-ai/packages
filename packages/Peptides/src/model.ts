import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {
  monomerToShort,
  NOTATION,
  pickUpPalette,
  TAGS as bioTAGS,
} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {calculateScores, SCORE} from '@datagrok-libraries/bio/src/utils/macromolecule/scoring';
import {Options} from '@datagrok-libraries/utils/src/type-declarations';
import {DistanceMatrix} from '@datagrok-libraries/ml/src/distance-matrix';
import {BitArrayMetrics} from '@datagrok-libraries/ml/src/typed-metrics';
import {TAGS as _treeTAGS} from '@datagrok-libraries/bio/src/trees';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {SeqHandler} from '@datagrok-libraries/bio/src/utils/seq-handler';
import wu from 'wu';
import * as rxjs from 'rxjs';
import $ from 'cash-dom';

import * as C from './utils/constants';
import {COLUMN_NAME, COLUMNS_NAMES} from './utils/constants';
import * as type from './utils/types';
import {PeptidesSettings} from './utils/types';
import {
  areParametersEqual,
  calculateSelected,
  getSelectionBitset,
  highlightMonomerPosition,
  initSelection,
  modifySelection,
  mutationCliffsToMaskInfo,
  scaleActivity,
} from './utils/misc';
import {ISARViewer, MonomerPosition, MostPotentResidues, SARViewer} from './viewers/sar-viewer';
import * as CR from './utils/cell-renderer';
import {mutationCliffsWidget} from './widgets/mutation-cliffs';
import {getDistributionWidget, PeptideViewer} from './widgets/distribution';
import {CLUSTER_TYPE, ILogoSummaryTable, LogoSummaryTable, LST_PROPERTIES} from './viewers/logo-summary';
import {getSettingsDialog} from './widgets/settings';
import {_package} from './package';
import {calculateMonomerPositionStatistics} from './utils/algorithms';
import {getSelectionWidget} from './widgets/selection';

import {MmDistanceFunctionsNames}
  from '@datagrok-libraries/ml/src/macromolecule-distance-functions';
import {ITSNEOptions, IUMAPOptions}
  from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/multi-column-dim-reducer';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {showMonomerTooltip} from './utils/tooltips';
import {AggregationColumns, MonomerPositionStats} from './utils/statistics';
import {splitAlignedSequences} from '@datagrok-libraries/bio/src/utils/splitter';
import {getDbscanWorker} from '@datagrok-libraries/math';
import {markovCluster} from '@datagrok-libraries/ml/src/MCL/clustering-view';
import {DistanceAggregationMethods} from '@datagrok-libraries/ml/src/distance-matrix/types';
import {ClusterMaxActivityViewer, IClusterMaxActivity} from './viewers/cluster-max-activity-viewer';
import {MCL_OPTIONS_TAG, MCLSerializableOptions} from '@datagrok-libraries/ml/src/MCL';

export enum VIEWER_TYPE {
  MONOMER_POSITION = 'Monomer-Position',
  MOST_POTENT_RESIDUES = 'Most Potent Residues',
  LOGO_SUMMARY_TABLE = 'Logo Summary Table',
  DENDROGRAM = 'Dendrogram',
  CLUSTER_MAX_ACTIVITY = 'Active peptide selection',
}

export type CachedWebLogoTooltip = { bar: string, tooltip: HTMLDivElement | null };

/**
 * Peptides model class
 * Controls analysis settings and initialization, collaborative filtering and property panel.
 */
export class PeptidesModel {
  // Tag for storing model instance in DataFrame temp
  static modelName = 'peptidesModel';

  // Prevents firing bitset changed event if not initialized
  isBitsetChangedInitialized = false;
  // Prevents overriding user selection
  isUserChangedSelection = true;

  df: DG.DataFrame;
  _dm: DistanceMatrix | null = null;
  // Prevents redundant intialization
  isInitialized = false;
  // Prevents duplicating ribbon
  isRibbonSet = false;
  // Cached stats for WebLogo selection for efficient rendering
  webLogoSelectedMonomers: type.SelectionStats = {};
  // WebLogo bounds used for interactivity (e.g. tooltips, selection)
  webLogoBounds: CR.WebLogoBounds = {};
  // Cached WebLogo tooltip. Because tooltip is requested for each mouse movement, it is cached unless mouse entered
  // bounds of other monomer in WebLogo
  cachedWebLogoTooltip: CachedWebLogoTooltip = {bar: '', tooltip: null};
  // Prevents from redundant grid processing
  _layoutEventInitialized = false;
  // Stores subscriptions to remove after analysis is closed
  subs: rxjs.Subscription[] = [];
  // Prevents from redundant unhilight operation
  isHighlighting: boolean = false;
  // Fires bitset changed to properly render selection in scroller bar
  controlFire: boolean = false;
  // Indicates the source of accordion construction
  accordionSource: VIEWER_TYPE | null = null;
  // sequence space viewer
  _sequenceSpaceViewer: DG.ScatterPlotViewer | null = null;
  //MCL viewer
  _mclViewer: DG.ScatterPlotViewer | null = null;
  /**
   * @param {DG.DataFrame}dataFrame - DataFrame to use for analysis
   */
  private constructor(dataFrame: DG.DataFrame) {
    this.df = dataFrame;
  }

  // Monomer-Position statistics cache
  _monomerPositionStats: MonomerPositionStats | null = null;

  /**
   * @return {MonomerPositionStats} - Monomer-Position statistics
   */
  get monomerPositionStats(): MonomerPositionStats | null {
    if (this._monomerPositionStats !== null)
      return this._monomerPositionStats;


    const scaledActivityColumn = this.getScaledActivityColumn();
    if (this.positionColumns === null || scaledActivityColumn === null)
      return null;


    this._monomerPositionStats ??= calculateMonomerPositionStatistics(scaledActivityColumn,
      this.df.filter, this.positionColumns);
    return this._monomerPositionStats;
  }

  // Analysis Table View
  _analysisView?: DG.TableView;

  /**
   * @return {DG.TableView}- Analysis table view
   */
  get analysisView(): DG.TableView {
    if (this._analysisView === undefined) {
      this._analysisView = wu(grok.shell.tableViews).find(({dataFrame}) => dataFrame?.getTag(DG.TAGS.ID) === this.id);
      if (typeof this._analysisView === 'undefined')
        this._analysisView = grok.shell.addTableView(this.df);
    }

    if (this.df.getTag(C.TAGS.MULTIPLE_VIEWS) !== '1' && !this._layoutEventInitialized)
      grok.shell.v = this._analysisView;


    this._analysisView.grid.invalidate();
    return this._analysisView;
  }

  // Peptides analysis settings
  _settings: type.PeptidesSettings | null = null;
  _sequenceSpaceCols: string[] = [];
  _mclCols: string[] = [];

  /**
   * @return {type.PeptidesSettings}- Peptides analysis settings
   */
  get settings(): type.PeptidesSettings | null {
    const settingsStr = this.df.getTag(C.TAGS.SETTINGS);
    if (settingsStr == null)
      return null;


    this._settings ??= JSON.parse(settingsStr);
    return this._settings!;
  }

  /**
   * @param {type.PartialPeptidesSettings} s - Peptides analysis settings
   */
  set settings(s: type.PartialPeptidesSettings) {
    const newSettingsEntries = Object.entries(s) as ([keyof type.PeptidesSettings, never])[];
    // Holds updated settings categories
    const oldSeqSpaceOptions: Partial<type.SequenceSpaceParams> =
      Object.assign({}, this.settings?.sequenceSpaceParams ?? {});
    const updateVars: Set<string> = new Set();
    for (const [key, value] of newSettingsEntries) {
      this.settings![key] = value;
      switch (key) {
      case 'activityColumnName':
      case 'activityScaling':
        updateVars.add('activity');
        updateVars.add('stats');
        break;
      case 'showDendrogram':
        updateVars.add('dendrogram');
        break;
      case 'showClusterMaxActivity':
        updateVars.add('clusterMaxActivity');
        break;
      case 'showSequenceSpace':
        updateVars.add('showSequenceSpace');
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
      case 'columns':
        updateVars.add('columns');
        break;
      case 'sequenceSpaceParams':
        updateVars.add('sequenceSpaceParams');
        break;
      case 'mclSettings':
        updateVars.add('mclSettings');
        break;
      }
    }
    // Write updated settings
    this.df.setTag('settings', JSON.stringify(this._settings));
    if (!this.isInitialized)
      return;

    if (updateVars.has('sequenceSpaceParams')) {
      const newSeqSpaceOptions = this.settings!.sequenceSpaceParams!;
      if (!Object.entries(newSeqSpaceOptions).some(([key, value]) =>
        oldSeqSpaceOptions[key as keyof type.SequenceSpaceParams] !== value && key !== 'epsilon' &&
          key !== 'minPts' && key !== 'clusterEmbeddings')) {
        updateVars.delete('sequenceSpaceParams');
        if (this.settings!.sequenceSpaceParams.clusterEmbeddings)
          updateVars.add('clusterParams');
      }
    }
    if (updateVars.has('sequenceSpaceParams'))
      updateVars.delete('clusterParams');

    // Apply new settings
    for (const variable of updateVars) {
      switch (variable) {
      case 'activity':
        this.createScaledCol();
        break;
      case 'stats':
        this.webLogoSelection = initSelection(this.positionColumns!);
        this.webLogoBounds = {};
        this.cachedWebLogoTooltip = {
          bar: '',
          tooltip: null,
        };
        // Invalidate monomer-position statistics. The next time it gets accessed with getter, it will be recalculated
        this._monomerPositionStats = null;
        break;
      case 'dendrogram':
        this.settings!.showDendrogram ? this.addDendrogram() : this.closeViewer(VIEWER_TYPE.DENDROGRAM);
        break;
      case 'clusterMaxActivity':
        this.settings!.showClusterMaxActivity ? this.addClusterMaxActivityViewer() :
          this.closeViewer(VIEWER_TYPE.CLUSTER_MAX_ACTIVITY);
        break;
      case 'logoSummaryTable':
        this.settings!.showLogoSummaryTable ? this.addLogoSummaryTable() :
          this.closeViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE);
        break;
      case 'monomerPosition':
        this.settings!.showMonomerPosition ? this.addMonomerPosition() :
          this.closeViewer(VIEWER_TYPE.MONOMER_POSITION);
        break;
      case 'mostPotentResidues':
        this.settings!.showMostPotentResidues ? this.addMostPotentResidues() :
          this.closeViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES);
        break;
      case 'columns':
        const lst = this.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable;
        lst._viewerGrid = null;
        lst._logoSummaryTable = null;
        lst.render();
        const mpr = this.findViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES) as LogoSummaryTable;
        mpr._viewerGrid = null;
        mpr.render();
        break;
      case 'sequenceSpaceParams':
      case 'showSequenceSpace':
        if (this.settings!.showSequenceSpace)
          this.addSequenceSpace({clusterEmbeddings: this.settings!.sequenceSpaceParams?.clusterEmbeddings});
        break;
      case 'clusterParams':
        this.clusterEmbeddings();
        break;
      case 'mclSettings':
        this.addMCLClusters();
        break;
      }
    }
  }

  // Current Monomer-Position selection that came from WebLogo in header
  _webLogoSelection: type.Selection | null = null;

  /**
   * @return {type.Selection} - Current Monomer-Position selection that came from WebLogo in header
   */
  get webLogoSelection(): type.Selection {
    const tagSelection = this.df.getTag(`${C.SUFFIXES.WL}${C.TAGS.INVARIANT_MAP_SELECTION}`);
    this._webLogoSelection ??= tagSelection === null && this.positionColumns !== null ?
      initSelection(this.positionColumns) : JSON.parse(tagSelection ?? `{}`);
    return this._webLogoSelection!;
  }

  /**
   * @param {type.Selection} selection - Current Monomer-Position selection that came from WebLogo in header
   */
  set webLogoSelection(selection: type.Selection) {
    this._webLogoSelection = selection;
    this.df.setTag(`${C.SUFFIXES.WL}${C.TAGS.INVARIANT_MAP_SELECTION}`, JSON.stringify(selection));
    this.fireBitsetChanged(null);
    this.analysisView.grid.invalidate();
  }

  /**
   * @return {DG.Column} - Array of columns that represent monomers at specific position in sequences
   */
  get positionColumns(): DG.Column<string>[] | null {
    const positionColumns = wu(this.df.columns.byTags({[C.TAGS.POSITION_COL]: `${true}`})).toArray();
    if (positionColumns.length === 0)
      return null;


    return positionColumns;
  }

  /**
   * @return {string} - DataFrame ID
   */
  get id(): string {
    return this.df.getTag(DG.TAGS.ID)!;
  }

  /**
   * @return {string} - Sequence alphabet
   */
  get alphabet(): string {
    const col = this.df.getCol(this.settings!.sequenceColumnName);
    return col.getTag(bioTAGS.alphabet);
  }

  /**
   * Creates an instance of PeptidesModel or returns existing if present
   * @param {DG.DataFrame} dataFrame - DataFrame to use for analysis
   * @return {PeptidesModel} - PeptidesModel instance
   */
  static getInstance(dataFrame: DG.DataFrame): PeptidesModel {
    if (dataFrame.columns.contains(C.COLUMNS_NAMES.ACTIVITY_SCALED) &&
      !dataFrame.columns.contains(C.COLUMNS_NAMES.ACTIVITY))
      dataFrame.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED).name = C.COLUMNS_NAMES.ACTIVITY;


    dataFrame.temp[PeptidesModel.modelName] ??= new PeptidesModel(dataFrame);
    return dataFrame.temp[PeptidesModel.modelName] as PeptidesModel;
  }

  /**
   * Modifies WebLogo selection. If shift and ctrl keys are both pressed, it removes WebLogo from
   * selection. If only shift key is pressed, it adds WebLogo to selection. If only ctrl key is pressed, it
   * changes WebLogo presence in selection. If none of the keys is pressed, it sets the WebLogo as the
   * only selected one.
   * @param {type.SelectionItem} monomerPosition - cluster to modify selection with.
   * @param {type.SelectionOptions} options - selection options.
   * @param {boolean} notify - flag indicating if bitset changed event should fire.
   */
  modifyWebLogoSelection(monomerPosition: type.SelectionItem, options: type.SelectionOptions = {
    shiftPressed: false,
    ctrlPressed: false,
  }, notify: boolean = true): void {
    if (notify)
      this.webLogoSelection = modifySelection(this.webLogoSelection, monomerPosition, options);
    else
      this._webLogoSelection = modifySelection(this.webLogoSelection, monomerPosition, options);
  }

  /**
   * @return {DG.BitSet} - Bitset of visible selection
   */
  getVisibleSelection(): DG.BitSet {
    return this.df.selection.clone().and(this.df.filter);
  }

  /**
   * @return {DG.Accordion | null} - Accordion with analysis info based on current selection
   */
  createAccordion(): DG.Accordion | null {
    const trueModel: PeptidesModel | undefined = grok.shell.t?.temp[PeptidesModel.modelName];
    if (!trueModel)
      return null;


    const acc = ui.accordion('Peptides analysis panel');
    acc.root.style.width = '100%';
    const filterAndSelectionBs = trueModel.getVisibleSelection();
    const filteredTitlePart = trueModel.df.filter.anyFalse ? ` among ${trueModel.df.filter.trueCount} filtered` :
      '';
    const getSelectionString = (selection: type.Selection): string => {
      const selectedMonomerPositions: string[] = [];
      for (const [pos, monomerList] of Object.entries(selection)) {
        for (const monomer of monomerList)
          selectedMonomerPositions.push(`${pos}:${monomer}`);
      }
      return selectedMonomerPositions.join(', ');
    };

    // Logo Summary Table viewer selection overview
    const trueLSTViewer = trueModel.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null;
    const selectionDescription: HTMLElement[] = [];
    const selectedClusters: string = (trueLSTViewer === null ? [] :
      trueLSTViewer.clusterSelection[CLUSTER_TYPE.ORIGINAL].concat(trueLSTViewer.clusterSelection[CLUSTER_TYPE.CUSTOM]))
      .join(', ');
    if (selectedClusters.length !== 0) {
      selectionDescription.push(ui.h1('Logo summary table selection'));
      selectionDescription.push(ui.divText(`Selected clusters: ${selectedClusters}`));
    }

    // Monomer-Position viewer selection overview
    const trueMPViewer = trueModel.findViewer(VIEWER_TYPE.MONOMER_POSITION) as MonomerPosition | null;
    const selectedMonomerPositions = getSelectionString(trueMPViewer?.invariantMapSelection ?? {});
    const selectedMutationCliffs = getSelectionString(trueMPViewer?.mutationCliffsSelection ?? {});
    if (selectedMonomerPositions.length !== 0 || selectedMutationCliffs.length !== 0)
      selectionDescription.push(ui.h1('Monomer-Position viewer selection'));


    if (selectedMonomerPositions.length !== 0)
      selectionDescription.push(ui.divText(`Selected monomer-positions: ${selectedMonomerPositions}`));


    if (selectedMutationCliffs.length !== 0)
      selectionDescription.push(ui.divText(`Selected mutation cliffs pairs: ${selectedMutationCliffs}`));


    // Most Potent Residues viewer selection overview
    const trueMPRViewer = trueModel.findViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES) as MostPotentResidues | null;
    const selectedMPRMonomerPositions = getSelectionString(trueMPRViewer?.mutationCliffsSelection ?? {});
    if (selectedMPRMonomerPositions.length !== 0) {
      selectionDescription.push(ui.h1('Most Potent Residues viewer selection'));
      selectionDescription.push(ui.divText(`Selected monomer-positions: ${selectedMPRMonomerPositions}`));
    }

    // WebLogo selection overview
    const selectedMonomers = getSelectionString(trueModel.webLogoSelection);
    if (selectedMonomers.length !== 0) {
      selectionDescription.push(ui.h1('WebLogo selection'));
      selectionDescription.push(ui.divText(`Selected monomers: ${selectedMonomers}`));
    }

    const descritionsHost = ui.div(ui.divV(selectionDescription));
    acc.addTitle(ui.divV([
      ui.h1(`${filterAndSelectionBs.trueCount} selected rows${filteredTitlePart}`),
      descritionsHost,
    ], 'css-gap-small'));

    if (filterAndSelectionBs.anyTrue) {
      acc.addPane('Actions', () => {
        try {
          const newView = ui.label('New view');
          $(newView).addClass('d4-link-action');
          newView.onclick = (): string => trueModel.createNewView();
          newView.onmouseover = (ev): void =>
            ui.tooltip.show('Creates a new view from current selection', ev.clientX + 5, ev.clientY + 5);
          if (trueLSTViewer === null)
            return ui.divV([newView]);


          const newCluster = ui.label('New cluster');
          $(newCluster).addClass('d4-link-action');
          newCluster.onclick = (): void => {
            if (trueLSTViewer === null)
              throw new Error('Logo summary table viewer is not found');


            trueLSTViewer.clusterFromSelection();
          };
          newCluster.onmouseover = (ev): void =>
            ui.tooltip.show('Creates a new cluster from selection', ev.clientX + 5, ev.clientY + 5);

          const removeCluster = ui.label('Remove cluster');
          $(removeCluster).addClass('d4-link-action');
          removeCluster.onclick = (): void => {
            const lstViewer = trueModel.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null;
            if (lstViewer === null)
              throw new Error('Logo summary table viewer is not found');


            lstViewer.removeCluster();
          };
          removeCluster.onmouseover = (ev): void =>
            ui.tooltip.show('Removes currently selected custom cluster', ev.clientX + 5, ev.clientY + 5);
          removeCluster.style.visibility = trueLSTViewer.clusterSelection[CLUSTER_TYPE.CUSTOM].length === 0 ? 'hidden' :
            'visible';

          return ui.divV([newView, newCluster, removeCluster]);
        } catch (e) {
          const errorDiv = ui.divText('Error in Actions');
          ui.tooltip.bind(errorDiv, String(e));
          return errorDiv;
        }
      }, true);
    }

    // Get the source of the bitset change and find viewers that share the same parameters as source
    let requestSource: SARViewer | LogoSummaryTable | PeptidesSettings | null = trueModel.settings;
    const viewers: (PeptideViewer | PeptidesSettings | null)[] = [trueMPViewer, trueMPRViewer, trueLSTViewer]
      .filter((v) => {
        if (v === null)
          return false;


        if (v.type !== this.accordionSource)
          return true;


        requestSource = v;
        return false;
      });

    if (requestSource === null)
      throw new Error('PeptidesError: Model is the source of accordion but is not initialized');


    if (requestSource !== trueModel.settings)
      viewers.push(trueModel.settings);


    const notEmpty = (v: PeptideViewer | PeptidesSettings | null): v is PeptideViewer | PeptidesSettings =>
      v !== null && areParametersEqual(requestSource!, v) && (v !== trueModel.settings || trueModel.isInitialized);
    const panelDataSources = viewers.filter(notEmpty);
    panelDataSources.push(requestSource);
    const combinedBitset: DG.BitSet | null = DG.BitSet.create(trueModel.df.rowCount);
    for (const panelDataSource of panelDataSources) {
      const bitset =
        (panelDataSource === this.settings) ? getSelectionBitset(this.webLogoSelection, this.monomerPositionStats!) :
          (panelDataSource instanceof LogoSummaryTable) ?
            getSelectionBitset(panelDataSource.clusterSelection, panelDataSource.clusterStats) :
            (panelDataSource instanceof SARViewer) ?
              getSelectionBitset(panelDataSource.mutationCliffsSelection,
                mutationCliffsToMaskInfo(panelDataSource.mutationCliffs ?? new Map(), trueModel.df.rowCount)) :
              null;
      if (bitset !== null)
        combinedBitset.or(bitset);


      if (panelDataSource instanceof MonomerPosition) {
        const invariantMapSelectionBitset = getSelectionBitset(panelDataSource.invariantMapSelection,
          panelDataSource.monomerPositionStats);
        if (invariantMapSelectionBitset !== null)
          combinedBitset.or(invariantMapSelectionBitset);
      }
    }

    const sarViewer = requestSource as any as SARViewer | LogoSummaryTable;
    if (requestSource !== trueModel.settings && !(sarViewer instanceof LogoSummaryTable) &&
      sarViewer.mutationCliffs != null) {
      // MC and Selection are left
      acc.addPane('Mutation Cliffs pairs', () => mutationCliffsWidget(trueModel.df, {
        mutationCliffs: sarViewer.mutationCliffs!,
        mutationCliffsSelection: sarViewer.mutationCliffsSelection,
        gridColumns: trueModel.analysisView.grid.columns,
        sequenceColumnName: sarViewer.sequenceColumnName,
        positionColumns: sarViewer.positionColumns,
        activityCol: sarViewer.getScaledActivityColumn(),
      }).root, true);
    }
    const isModelSource = requestSource === trueModel.settings;
    const totalMonomerPositionSelection = isModelSource ? this.webLogoSelection :
      (requestSource instanceof MonomerPosition) ? requestSource.invariantMapSelection : {};
    const clusterSelection = (requestSource instanceof LogoSummaryTable) ? requestSource.clusterSelection :
      trueLSTViewer?.clusterSelection ?? {};
    acc.addPane('Distribution', () => {
      try {
        return getDistributionWidget(trueModel.df, {
          peptideSelection: combinedBitset,
          columns: isModelSource ? trueModel.settings!.columns ?? {} :
            (requestSource as PeptideViewer).getAggregationColumns(),
          activityCol: isModelSource ? trueModel.getScaledActivityColumn()! :
            (requestSource as PeptideViewer).getScaledActivityColumn(),
          monomerPositionSelection: totalMonomerPositionSelection,
          clusterSelection: clusterSelection,
          clusterColName: trueLSTViewer?.clustersColumnName,
        });
      } catch (e) {
        const errorDiv = ui.divText('Error in Distribution');
        ui.tooltip.bind(errorDiv, String(e));
        return errorDiv;
      }
    }, true);
    const areObjectsEqual = (o1?: AggregationColumns | null, o2?: AggregationColumns | null): boolean => {
      if (o1 == null || o2 == null)
        return false;


      for (const [key, value] of Object.entries(o1)) {
        if (value !== o2[key])
          return false;
      }
      return true;
    };
    acc.addPane('Selection', () => {
      try {
        return getSelectionWidget(trueModel.df, {
          positionColumns: isModelSource ? trueModel.positionColumns! :
            (requestSource as SARViewer | LogoSummaryTable).positionColumns,
          columns: isModelSource ? trueModel.settings!.columns ?? {} :
            (requestSource as SARViewer | LogoSummaryTable).getAggregationColumns(),
          activityColumn: isModelSource ? trueModel.getScaledActivityColumn()! :
            (requestSource as SARViewer | LogoSummaryTable).getScaledActivityColumn(),
          gridColumns: trueModel.analysisView.grid.columns,
          colorPalette: pickUpPalette(trueModel.df.getCol(isModelSource ? trueModel.settings!.sequenceColumnName :
            (requestSource as SARViewer | LogoSummaryTable).sequenceColumnName)),
          tableSelection: trueModel.getCombinedSelection(),
          isAnalysis: trueModel.settings !== null && (isModelSource ||
        areObjectsEqual(trueModel.settings.columns, (requestSource as PeptideViewer).getAggregationColumns())),
        });
      } catch (e) {
        const errorDiv = ui.divText('Error in Selection');
        ui.tooltip.bind(errorDiv, String(e));
        return errorDiv;
      }
    }, true);
    return acc;
  }

  /**
   * @param {boolean} isFiltered - Whether to return filtered activity column
   * @return {DG.Column<number> | null} -  Scaled activity column
   */
  getScaledActivityColumn(isFiltered: boolean = false): DG.Column<number> | null {
    const scaledActivityColumn = this.df.col(C.COLUMNS_NAMES.ACTIVITY);
    if (isFiltered && scaledActivityColumn !== null) {
      return DG.DataFrame.fromColumns([scaledActivityColumn]).clone(this.df.filter)
        .getCol(scaledActivityColumn.name) as DG.Column<number>;
    }
    return scaledActivityColumn as DG.Column<number> | null;
  }

  /**
   * Sets grid properties such as column semtypes, visibility, order, width, renderers and tooltips
   */
  updateGrid(): void {
    this.joinDataFrames();
    this.createScaledCol();
    this.webLogoBounds = {};

    const cellRendererOptions: CR.WebLogoCellRendererOptions = {
      selectionCallback: (monomerPosition: type.SelectionItem, options: type.SelectionOptions): void =>
        this.modifyWebLogoSelection(monomerPosition, options),
      unhighlightCallback: (): void => this.unhighlight(),
      colorPalette: () => pickUpPalette(this.df.getCol(this.settings!.sequenceColumnName)),
      webLogoBounds: () => this.webLogoBounds,
      cachedWebLogoTooltip: () => this.cachedWebLogoTooltip,
      highlightCallback: (mp: type.SelectionItem, df: DG.DataFrame, mpStats: MonomerPositionStats): void =>
        highlightMonomerPosition(mp, df, mpStats),
      isSelectionTable: false,
      headerSelectedMonomers: () => this.webLogoSelectedMonomers,
    };
    if (this.monomerPositionStats === null || this.positionColumns === null)
      throw new Error('PeptidesError: Could not updage grid: monomerPositionStats or positionColumns are null');


    CR.setWebLogoRenderer(this.analysisView.grid, this.monomerPositionStats, this.positionColumns,
      this.getScaledActivityColumn()!, cellRendererOptions);
    if (!this._layoutEventInitialized) {
      grok.events.onViewLayoutApplied.subscribe((layout) => {
        if (layout.view.id === this.analysisView.id)
          this.updateGrid();
      });
      this._layoutEventInitialized = true;
    }

    this.setTooltips();
    this.setBitsetCallback();
    this.setGridProperties();
  }

  /**
   * Splits sequences and adds position columns to this.df.
   */
  joinDataFrames(): void {
    // append splitSeqDf columns to source table and make sure columns are not added more than once
    const name = this.df.name;
    const cols = this.df.columns;
    const splitSeqDf = splitAlignedSequences(this.df.getCol(this.settings!.sequenceColumnName));
    const positionColumns = splitSeqDf.columns.names();
    for (const colName of positionColumns) {
      let col = this.df.col(colName);
      const newCol = splitSeqDf.getCol(colName);
      if (col !== null)
        cols.remove(colName);


      const newColCat = newCol.categories;
      const newColData = newCol.getRawData();
      col = cols.addNew(newCol.name, newCol.type).init((i) => newColCat[newColData[i]]);
      col.setTag(C.TAGS.ANALYSIS_COL, `${true}`);
      col.setTag(C.TAGS.POSITION_COL, `${true}`);
      CR.setMonomerRenderer(col, this.alphabet);
    }
    this.df.name = name;
  }

  /**
   * Creates scaled activity column
   */
  createScaledCol(): void {
    const sourceGrid = this.analysisView.grid;
    const scaledCol = scaleActivity(this.df.getCol(this.settings!.activityColumnName),
      this.settings!.activityScaling);
    //TODO: make another func
    this.df.columns.replace(COLUMNS_NAMES.ACTIVITY, scaledCol);

    sourceGrid.columns.setOrder([scaledCol.name]);
  }

  /**
   * Resets rows highlighting
   */
  unhighlight(): void {
    if (!this.isHighlighting)
      return;


    this.df.rows.highlight(null);
    this.isHighlighting = false;
  }

  /**
   * Sets tooltips to analysis grid
   */
  setTooltips(): void {
    this.analysisView.grid.onCellTooltip((cell, x, y) => {
      if (cell.isColHeader && cell.tableColumn?.semType === C.SEM_TYPES.MONOMER)
        return true;


      if (!(cell.isTableCell && cell.tableColumn?.semType === C.SEM_TYPES.MONOMER))
        return false;


      showMonomerTooltip(cell.cell.value, x, y);
      return true;
    });
  }

  /**
   * Builds total analysis selection that comes from viewers and components
   * @return {DG.BitSet} - Total analysis selection
   */
  getCombinedSelection(): DG.BitSet {
    const combinedSelection = new BitArray(this.df.rowCount, false);
    // Invariant map selection
    const addInvariantMapSelection = (selection: type.Selection, stats: MonomerPositionStats | null): void => {
      for (const [position, monomerList] of Object.entries(selection)) {
        for (const monomer of monomerList) {
          const positionStats = stats?.[position];
          if (typeof positionStats === 'undefined')
            continue;


          const monomerPositionStats = positionStats[monomer];
          if (typeof monomerPositionStats === 'undefined')
            continue;


          combinedSelection.or(monomerPositionStats.mask);
        }
      }
    };

    addInvariantMapSelection(this.webLogoSelection, this.monomerPositionStats);
    const mpViewer = this.findViewer(VIEWER_TYPE.MONOMER_POSITION) as MonomerPosition | null;
    addInvariantMapSelection(mpViewer?.invariantMapSelection ?? {}, mpViewer?.monomerPositionStats ?? null);

    // Mutation cliffs selection
    const addMutationCliffsSelection = (selection: type.Selection, mc: type.MutationCliffs | null): void => {
      for (const [position, monomerList] of Object.entries(selection)) {
        for (const monomer of monomerList) {
          const substitutions = mc?.get(monomer)?.get(position) ?? null;
          if (substitutions === null)
            continue;


          for (const [key, value] of substitutions.entries()) {
            combinedSelection.setTrue(key);
            for (const v of value)
              combinedSelection.setTrue(v);
          }
        }
      }
    };
    addMutationCliffsSelection(mpViewer?.mutationCliffsSelection ?? {}, mpViewer?.mutationCliffs ?? null);

    const mprViewer = this.findViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES) as MostPotentResidues | null;
    addMutationCliffsSelection(mprViewer?.mutationCliffsSelection ?? {}, mprViewer?.mutationCliffs ?? null);

    // Cluster selection
    const lstViewer = this.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null;
    for (const clustType of Object.keys(lstViewer?.clusterSelection ?? {})) {
      for (const clust of lstViewer!.clusterSelection[clustType] ?? []) {
        const clusterStats = lstViewer!.clusterStats[clustType as CLUSTER_TYPE][clust];
        combinedSelection.or(clusterStats.mask);
      }
    }

    return DG.BitSet.fromBytes(combinedSelection.buffer.buffer, combinedSelection.length);
  }


  /**
   * Sets selection and filter changed callbacks
   */
  setBitsetCallback(): void {
    if (this.isBitsetChangedInitialized)
      return;


    const selection = this.df.selection;
    const filter = this.df.filter;

    const showAccordion = (): void => {
      try {
        const acc = this.createAccordion();
        if (acc === null)
          return;


        grok.shell.o = acc.root;
      } catch (e) {
        console.error(e);
      }
    };

    selection.onChanged.subscribe(() => {
      if (this.controlFire) {
        this.controlFire = false;
        return;
      }
      try {
        if (!this.isUserChangedSelection)
          selection.copyFrom(this.getCombinedSelection(), false);
      } catch (e) {
        _package.logger.debug('Peptides: Error on selection changed');
        _package.logger.debug(e as string);
      } finally {
        showAccordion();
      }
    });

    filter.onChanged.subscribe(() => {
      try {
        if (this.controlFire) {
          this.controlFire = false;
          return;
        }
        const lstViewer = this.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null;
        if (lstViewer !== null && typeof lstViewer.model !== 'undefined') {
          lstViewer._logoSummaryTable = lstViewer.createLogoSummaryTable() ?? lstViewer._logoSummaryTable;
          lstViewer._viewerGrid = lstViewer.createLogoSummaryTableGrid() ?? lstViewer._viewerGrid;
          lstViewer.render();
        }
      } catch (e) {
        _package.logger.debug('Peptides: Error on filter changed');
        _package.logger.debug(e as string);
      } finally {
        showAccordion();
      }
    });

    this.isBitsetChangedInitialized = true;
  }

  /**
   * Fires bitset changed event and rebuilds accordion in context panel
   * @param {VIEWER_TYPE | null} source - Source of bitset changed event
   * @param {boolean} fireFilterChanged - Whether to fire filter changed event
   */
  fireBitsetChanged(source: VIEWER_TYPE | null, fireFilterChanged: boolean = false): void {
    this.accordionSource = source;
    if (!this.isBitsetChangedInitialized)
      this.setBitsetCallback();


    this.isUserChangedSelection = false;
    this.df.selection.fireChanged();
    if (fireFilterChanged)
      this.df.filter.fireChanged();


    // Fire bitset changed event again to update UI
    this.controlFire = true;
    this.df.selection.fireChanged();
    if (fireFilterChanged)
      this.df.filter.fireChanged();


    this.isUserChangedSelection = true;
    this.webLogoSelectedMonomers = calculateSelected(this.df);
  }

  /**
   * Sets grid properties such
   * @param {DG.IGridSettings} props - Grid properties
   */
  // @ts-ignore TODO: fix after api update
  setGridProperties(props?: DG.IGridSettings): void {
    const sourceGrid = this.analysisView.grid;
    const sourceGridProps = sourceGrid.props;
    sourceGridProps.allowColSelection = props?.allowColSelection ?? false;
    sourceGridProps.allowEdit = props?.allowEdit ?? false;
    sourceGridProps.showReadOnlyNotifications = props?.showReadOnlyNotifications ?? false;
    sourceGridProps.showCurrentRowIndicator = props?.showCurrentRowIndicator ?? false;
    const positionCols = this.positionColumns;
    if (positionCols === null)
      throw new Error('PeptidesError: Could not set grid properties: positionColumns are null');


    let maxWidth = 10;
    const canvasContext = sourceGrid.canvas.getContext('2d');
    if (canvasContext === null)
      throw new Error('PeptidesError: Could not set grid properties: canvas context is null');


    for (const positionCol of positionCols) {
      // Longest category
      const maxCategory = monomerToShort(positionCol.categories.reduce((a, b) => a.length > b.length ? a : b), 6);
      // Measure text width of longest category
      const width = Math.ceil(canvasContext.measureText(maxCategory).width);
      maxWidth = Math.max(maxWidth, width);
    }

    const posCols = positionCols.map((col) => col.name);
    for (let colIdx = 1; colIdx < this.analysisView.grid.columns.length; ++colIdx) {
      const gridCol = this.analysisView.grid.columns.byIndex(colIdx);
      if (gridCol === null)
        throw new Error(`PeptidesError: Could not get analysis view: grid column with index '${colIdx}' is null`);
      else if (gridCol.column === null) {
        throw new Error(`PeptidesError: Could not get analysis view: grid column with index '${colIdx}' has null ` +
          `column`);
      }
      gridCol.visible = posCols.includes(gridCol.column.name) || (gridCol.column.name === C.COLUMNS_NAMES.ACTIVITY);
    }

    setTimeout(() => {
      for (const positionCol of positionCols) {
        const gridCol = sourceGrid.col(positionCol.name);
        if (gridCol === null)
          throw new Error(`PeptidesError: Could not set column width: grid column '${positionCol.name}' is null`);


        gridCol.width = maxWidth + 15;
      }
    }, 100);
  }

  /**
   * Closes peptides viewer
   * @param {VIEWER_TYPE} viewerType - Viewer type to close
   */
  closeViewer(viewerType: VIEWER_TYPE): void {
    const viewer = this.findViewer(viewerType);
    viewer?.detach();
    viewer?.close();
  }

  /**
   * Finds viewer node in the analysis view
   * @param {VIEWER_TYPE} viewerType - Viewer type to find
   * @return {DG.DockNode | null} - Viewer node or null if not found
   */
  findViewerNode(viewerType: VIEWER_TYPE): DG.DockNode | null {
    for (const node of this.analysisView.dockManager.rootNode.children) {
      if (node.container.containerElement.innerHTML.includes(viewerType))
        return node;
    }
    return null;
  }

  /**
   * Adds Dendrogram viewer to the analysis view
   * @return {Promise<void>}
   */
  async addDendrogram(): Promise<void> {
    const pi = DG.TaskBarProgressIndicator.create('Calculating distance matrix...');
    try {
      // const pepColValues: string[] = this.df.getCol(this.settings!.sequenceColumnName).toList();
      // this._dm ??=
      //new DistanceMatrix(await createDistanceMatrixWorker(pepColValues, StringMetricsNames.Levenshtein));
      // const leafCol = this.df.col('~leaf-id') ?? this.df.columns.addNewString('~leaf-id').init((i) => i.toString());
      // const treeHelper: ITreeHelper = getTreeHelperInstance();
      // // treeHelper.
      // const treeNode = await treeHelper.hierarchicalClusteringByDistance(this._dm, 'ward');

      // this.df.setTag(treeTAGS.NEWICK, treeHelper.toNewick(treeNode));
      // const leafOrdering = treeHelper.getLeafList(treeNode).map((leaf) => parseInt(leaf.name));
      // this.analysisView.grid.setRowOrder(leafOrdering);
      // const dendrogramViewer =
      //await this.df.plot.fromType('Dendrogram', {nodeColumnName: leafCol.name}) as DG.JsViewer;

      // this.analysisView.dockManager.dock(dendrogramViewer, DG.DOCK_TYPE.LEFT, null, 'Dendrogram', 0.25);
      const dFunc = DG.Func.find({package: 'Dendrogram', name: 'hierarchicalClustering'})[0];
      if (!dFunc || dFunc.inputs.length !== 4)
        throw new Error('Correct dendrogram function is not found');
      await dFunc.apply({
        df: this.df, colNameList: [this.settings!.sequenceColumnName],
        distance: 'euclidean', linkage: 'complete',
      });
    } catch (e) {
      _package.logger.error(e as string);
    } finally {
      pi.close();
    }
  }

  /**
   * Analysis initializer
   * @param {PeptidesSettings} settings - Analysis settings
   */
  init(settings: type.PeptidesSettings): void {
    if (this.isInitialized)
      return;


    this.settings = settings;
    this.isInitialized = true;

    if (!this.isRibbonSet && this.df.getTag(C.TAGS.MULTIPLE_VIEWS) !== '1') {
      //TODO: don't pass model, pass parameters instead
      const settingsButton = ui.iconFA('wrench', () => getSettingsDialog(this), 'Peptides analysis settings');
      this.analysisView.setRibbonPanels([[settingsButton]], false);
      this.isRibbonSet = true;
      this.updateGrid();
    }

    this.subs.push(grok.events.onAccordionConstructed.subscribe((acc) => {
      if (!(grok.shell.o instanceof DG.SemanticValue || (grok.shell.o instanceof DG.Column &&
        this.df.columns.toList().includes(grok.shell.o))))
        return;


      const actionsPane = acc.getPane('Actions');
      const actionsHost = $(actionsPane.root).find('.d4-flex-col');
      const calculateIdentity = ui.label('Calculate identity');
      calculateIdentity.classList.add('d4-link-action');
      ui.tooltip.bind(calculateIdentity,
        'Adds a column with fractions of matching monomers against sequence in the current row');
      calculateIdentity.onclick = (): void => {
        const seqCol = this.df.getCol(this.settings!.sequenceColumnName);
        calculateScores(this.df, seqCol, seqCol.get(this.df.currentRowIdx), SCORE.IDENTITY)
          .then((col: DG.Column<number>) => col.setTag(C.TAGS.IDENTITY_TEMPLATE, seqCol.get(this.df.currentRowIdx)))
          .catch((e) => _package.logger.debug(e));
      };
      actionsHost.append(ui.span([calculateIdentity], 'd4-markdown-row'));

      const calculateSimilarity = ui.label('Calculate similarity');
      calculateSimilarity.classList.add('d4-link-action');
      ui.tooltip.bind(calculateSimilarity,
        'Adds a column with sequence similarity scores against sequence in the current row');
      calculateSimilarity.onclick = (): void => {
        const seqCol = this.df.getCol(this.settings!.sequenceColumnName);
        calculateScores(this.df, seqCol, seqCol.get(this.df.currentRowIdx), SCORE.SIMILARITY)
          .then((col: DG.Column<number>) => col.setTag(C.TAGS.SIMILARITY_TEMPLATE, seqCol.get(this.df.currentRowIdx)))
          .catch((e) => _package.logger.debug(e));
      };
      actionsHost.append(ui.span([calculateSimilarity], 'd4-markdown-row'));
    }));

    this.subs.push(grok.events.onViewRemoved.subscribe((view) => {
      if (view.id === this.analysisView.id)
        this.subs.forEach((v) => v.unsubscribe());


      grok.log.debug(`Peptides: view ${view.name} removed`);
    }));
    //@ts-ignore
    this.subs.push(grok.events.onTableRemoved.subscribe((table: DG.DataFrame) => {
      if (table.id === this.df.id)
        this.subs.forEach((v) => v.unsubscribe());


      grok.log.debug(`Peptides: table ${table.name} removed`);
    }));
    this.subs.push(grok.events.onProjectClosed.subscribe((project: DG.Project) => {
      if (project.id === grok.shell.project.id)
        this.subs.forEach((v) => v.unsubscribe());


      grok.log.debug(`Peptides: project ${project.name} closed`);
    }));

    this.fireBitsetChanged(null, true);

    this.analysisView.grid.invalidate();
  }

  /**
   * Finds viewer by type
   * @param {VIEWER_TYPE} viewerType - Viewer type to find
   * @return {DG.Viewer | null} - Viewer or null if not found
   */
  findViewer(viewerType: VIEWER_TYPE): DG.Viewer | null {
    return wu(this.analysisView.viewers).find((v) => v.type === viewerType) || null;
  }

  /**
   * Adds Logo Summary Table viewer to the analysis view
   * @param {ILogoSummaryTable} [viewerProperties] - Viewer properties
   */
  async addLogoSummaryTable(viewerProperties?: ILogoSummaryTable): Promise<void> {
    viewerProperties ??= {
      sequenceColumnName: this.settings!.sequenceColumnName,
      clustersColumnName: wu(this.df.columns.categorical).next().value,
      activityColumnName: this.settings!.activityColumnName,
      activityScaling: this.settings!.activityScaling,
    };
    const logoSummaryTable = await this.df.plot
      .fromType(VIEWER_TYPE.LOGO_SUMMARY_TABLE, viewerProperties) as LogoSummaryTable;
    this.analysisView.dockManager.dock(logoSummaryTable, DG.DOCK_TYPE.RIGHT, null, VIEWER_TYPE.LOGO_SUMMARY_TABLE);

    logoSummaryTable.viewerGrid.invalidate();
  }

  async addClusterMaxActivityViewer(viewerProperties?: IClusterMaxActivity): Promise<void> {
    const potentialClusterCol = this._mclCols?.find((colName) => colName.toLowerCase().startsWith('cluster (mcl)')) ??
      (this.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null)?.clustersColumnName ??
      this._sequenceSpaceCols?.find((colName) => colName.toLowerCase().startsWith('cluster'));
    viewerProperties ??= {
      activityColumnName: this.settings!.activityColumnName,
      clusterColumnName: potentialClusterCol ?? wu(this.df.columns.categorical).next().value?.name,
      activityTarget: C.ACTIVITY_TARGET.HIGH,
      connectivityColumnName: this._mclCols.find((colName) => colName.toLowerCase().startsWith('connectivity')),
      clusterSizeThreshold: 20,
      activityThreshold: 1000,
    };
    const _clusterMaxActivity = await this.df.plot
      .fromType(VIEWER_TYPE.CLUSTER_MAX_ACTIVITY, viewerProperties) as ClusterMaxActivityViewer;
    const lstNode = this.findViewerNode(VIEWER_TYPE.LOGO_SUMMARY_TABLE) ?? null;
    this.analysisView.dockManager.dock(_clusterMaxActivity, lstNode ? DG.DOCK_TYPE.DOWN: DG.DOCK_TYPE.RIGHT,
      lstNode, VIEWER_TYPE.CLUSTER_MAX_ACTIVITY);
  }

  /**
   * Adds Monomer-Position viewer to the analysis view
   * @param {ISARViewer} [viewerProperties] - Viewer properties
   */
  async addMonomerPosition(viewerProperties?: ISARViewer): Promise<void> {
    viewerProperties ??= {
      maxMutations: 1,
      activityScaling: this.settings!.activityScaling,
      activityColumnName: this.settings!.activityColumnName,
      sequenceColumnName: this.settings!.sequenceColumnName,
      minActivityDelta: 0,
      activityTarget: C.ACTIVITY_TARGET.HIGH,
    };
    const monomerPosition = await this.df.plot
      .fromType(VIEWER_TYPE.MONOMER_POSITION, viewerProperties) as MonomerPosition;
    const mostPotentResidues = this.findViewer(VIEWER_TYPE.MOST_POTENT_RESIDUES) as MostPotentResidues | null;
    const dm = this.analysisView.dockManager;
    const [dockType, refNode, ratio] = mostPotentResidues === null ? [DG.DOCK_TYPE.DOWN, null, undefined] :
      [DG.DOCK_TYPE.LEFT, this.findViewerNode(VIEWER_TYPE.MOST_POTENT_RESIDUES), 0.7];
    dm.dock(monomerPosition, dockType, refNode, VIEWER_TYPE.MONOMER_POSITION, ratio);
  }

  /**
   * Adds Most Potent Residues viewer to the analysis view
   * @param {ISARViewer}[viewerProperties] - Viewer properties
   */
  async addMostPotentResidues(viewerProperties?: ISARViewer): Promise<void> {
    viewerProperties ??= {
      activityScaling: this.settings!.activityScaling,
      activityColumnName: this.settings!.activityColumnName,
      sequenceColumnName: this.settings!.sequenceColumnName,
      minActivityDelta: 0,
      maxMutations: 1,
      activityTarget: C.ACTIVITY_TARGET.HIGH,
    };
    const mostPotentResidues =
      await this.df.plot.fromType(VIEWER_TYPE.MOST_POTENT_RESIDUES, viewerProperties) as MostPotentResidues;
    const monomerPosition = this.findViewer(VIEWER_TYPE.MONOMER_POSITION) as MonomerPosition | null;
    const dm = this.analysisView.dockManager;
    const [dockType, refNode, ratio] = monomerPosition === null ? [DG.DOCK_TYPE.DOWN, null, undefined] :
      [DG.DOCK_TYPE.RIGHT, this.findViewerNode(VIEWER_TYPE.MONOMER_POSITION), 0.3];
    dm.dock(mostPotentResidues, dockType, refNode, VIEWER_TYPE.MOST_POTENT_RESIDUES, ratio);
  }

  /**
   * Creates new view from analysis dataframe selection, and adds LogoSummaryTable to it
   * @return {string} - New view id
   */
  createNewView(): string {
    const rowMask = this.getVisibleSelection();
    const newDf = this.df.clone(rowMask);
    for (const [tag, value] of newDf.tags)
      newDf.setTag(tag, tag === C.TAGS.SETTINGS ? value : '');


    newDf.name = 'Peptides Multiple Views';
    newDf.setTag(C.TAGS.MULTIPLE_VIEWS, '1');

    const view = grok.shell.addTableView(newDf);
    const lstViewer = this.findViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE) as LogoSummaryTable | null;
    if (lstViewer != null) {
      view.addViewer(VIEWER_TYPE.LOGO_SUMMARY_TABLE, {
        [`${LST_PROPERTIES.SEQUENCE}${COLUMN_NAME}`]: lstViewer.sequenceColumnName,
        [`${LST_PROPERTIES.ACTIVITY}${COLUMN_NAME}`]: lstViewer.activityColumnName,
        [LST_PROPERTIES.ACTIVITY_SCALING]: lstViewer.activityScaling,
        [LST_PROPERTIES.WEB_LOGO_MODE]: lstViewer.webLogoMode,
        [LST_PROPERTIES.MEMBERS_RATIO_THRESHOLD]: lstViewer.membersRatioThreshold,
        [`${LST_PROPERTIES.CLUSTERS}${COLUMN_NAME}`]: lstViewer.clustersColumnName,
      });
    }

    return newDf.getTag(DG.TAGS.ID)!;
  }

  private async clusterEmbeddings(): Promise<void> {
    if (!this._sequenceSpaceCols || this._sequenceSpaceCols.length === 0) {
      grok.shell.warning('Embeddings columns are not initialized');
      return;
    }
    const embeddingColNames = this._sequenceSpaceCols.filter((colName) => colName.toLowerCase().startsWith('embed_'));
    if (embeddingColNames.length !== 2) {
      grok.shell.warning(`Found ${embeddingColNames.length} embeddings columns, expected 2`);
      return;
    }
    const oldClusterCol = this._sequenceSpaceCols.filter((colName) => colName.toLowerCase().startsWith('cluster'));
    if (oldClusterCol.length > 0)
      this.df.columns.remove(oldClusterCol[0]);
    const embed1 = this.df.getCol(embeddingColNames[0]).getRawData() as Float32Array;
    const embed2 = this.df.getCol(embeddingColNames[1]).getRawData() as Float32Array;
    const epsilon = this.settings!.sequenceSpaceParams!.epsilon ?? 0.01;
    const minPts = this.settings!.sequenceSpaceParams!.minPts ?? 4;
    const clusterRes = await getDbscanWorker(embed1, embed2, epsilon, minPts);
    const newClusterName = this.df.columns.getUnusedName('Cluster (DBSCAN)');
    const clusterCol = this.df.columns.addNewString(newClusterName);
    clusterCol.init((i) => clusterRes[i].toString());
    if (this._sequenceSpaceViewer !== null)
      this._sequenceSpaceViewer.props.colorColumnName = clusterCol.name;

    this._sequenceSpaceCols = [embeddingColNames[0], embeddingColNames[1], clusterCol.name];
    const gridCol = this.analysisView.grid.col(clusterCol.name);
    gridCol && (gridCol.visible = false);
  }

  async addMCLClusters(): Promise<void> {
    if (this._mclViewer !== null) {
      try {
        this._mclViewer?.detach();
        this._mclViewer?.close();
      } catch (_) {}
    }
    if (this._mclCols.length !== 0)
      this._mclCols.forEach((col) => this.df.columns.remove(col));
    this._mclCols = [];
    const seqCol = this.df.getCol(this.settings!.sequenceColumnName!);
    this.settings!.mclSettings ??= new type.MCLSettings();
    const mclParams = this.settings?.mclSettings;
    let counter = 0;
    const addedColCount = 5; // embedx, embedy, cluster, cluster size and connectivity count
    const columnAddedSub = this.df.onColumnsAdded.subscribe((colArgs: DG.ColumnsArgs) => {
      for (const col of colArgs.columns) {
        if ((col.name.toLowerCase().startsWith('embed') ||
        col.name.toLowerCase().startsWith('cluster') ||
        col.name.toLowerCase().startsWith('connectivity')) && col.name.toLowerCase().includes('mcl')) {
          const gridCol = this.analysisView.grid.col(col.name);
          if (gridCol == null || this._mclCols.includes(col.name))
            continue;

          gridCol.visible = false;
          this._mclCols.push(col.name);
          counter++;
        }
      }
      if (counter === addedColCount)
        columnAddedSub.unsubscribe();
    });
    const mclAdditionSub = grok.events.onViewerAdded.subscribe((info) => {
      try {
        const v = info.args.viewer as DG.ScatterPlotViewer;
        if (v.type === DG.VIEWER.SCATTER_PLOT) {
          if (this._sequenceSpaceViewer && this.analysisView.dockManager.findNode(this._sequenceSpaceViewer.root)) {
            const rootNode = this.analysisView.dockManager.findNode(this._sequenceSpaceViewer.root);
            setTimeout(() => {
              this.analysisView.dockManager.dock(v, DG.DOCK_TYPE.FILL, rootNode);
            });
          }
          mclAdditionSub.unsubscribe();
        }
      } catch (e) {
        console.error(e);
      }
    });

    const bioPreprocessingFunc = DG.Func.find({package: 'Bio', name: 'macromoleculePreprocessingFunction'})[0];
    const mclViewer = await markovCluster(
      this.df, [seqCol], [mclParams!.distanceF], [1],
      DistanceAggregationMethods.MANHATTAN, [bioPreprocessingFunc], [{
        gapOpen: mclParams!.gapOpen, gapExtend: mclParams!.gapExtend,
        fingerprintType: mclParams!.fingerprintType,
      }], mclParams!.threshold, mclParams!.maxIterations, false/** TODO, add webgpu controll */, mclParams!.inflation,
    );
    mclAdditionSub.unsubscribe();
    if (mclViewer?.sc) {
      const serializedOptions: string = JSON.stringify({
        cols: [seqCol].map((col) => col.name),
        metrics: [mclParams!.distanceF],
        weights: [1],
        aggregationMethod: DistanceAggregationMethods.MANHATTAN,
        preprocessingFuncs: [bioPreprocessingFunc].map((func) => func?.name ?? null),
        preprocessingFuncArgs: [{
          gapOpen: mclParams!.gapOpen, gapExtend: mclParams!.gapExtend,
          fingerprintType: mclParams!.fingerprintType,
        }],
        threshold: mclParams!.threshold,
        maxIterations: mclParams!.maxIterations,
        useWebGPU: false,
        inflate: mclParams!.inflation,
      } satisfies MCLSerializableOptions);
      this.df.setTag(MCL_OPTIONS_TAG, serializedOptions);


      //@ts-ignore
      mclViewer.sc.props['initializationFunction'] = 'EDA:MCLInitializationFunction';
      this._mclViewer = mclViewer?.sc ?? null;
    }
  }

  /**
   * Adds Sequence Space viewer to the analysis view
   */
  async addSequenceSpace(settings: {clusterEmbeddings?: boolean, clusterCol?: DG.Column | null} = {}): Promise<void> {
    if (this._sequenceSpaceViewer !== null) {
      try {
        this._sequenceSpaceViewer?.detach();
        this._sequenceSpaceViewer?.close();
      } catch (_) {}
    }
    if (this._sequenceSpaceCols.length !== 0)
      this._sequenceSpaceCols.forEach((col) => this.df.columns.remove(col));
    this._sequenceSpaceCols = [];
    let seqCol = this.df.getCol(this.settings!.sequenceColumnName!);
    const sh = SeqHandler.forColumn(seqCol);
    const isHelm = sh.isHelm();
    if (isHelm) {
      try {
        grok.shell.warning('Column is in HELM notation. Sequences space will linearize sequences from position 0 ' +
          'prior to analysis');
        const linearCol = sh.convert(NOTATION.SEPARATOR, '/');
        const newName = this.df.columns.getUnusedName(`Separator(${seqCol.name})`);
        linearCol.name = newName;
        this.df.columns.add(linearCol, true);
        this.analysisView.grid.col(newName)!.visible = false;
        seqCol = linearCol;
      } catch (e) {
        grok.shell.error('Error on converting HELM notation to linear notation');
        grok.shell.error(e as string);
        return;
      }
    }
    const clusterEmbeddings = !settings.clusterCol && !!settings.clusterEmbeddings;
    const seqSpaceSettings = this.settings?.sequenceSpaceParams ??
      new type.SequenceSpaceParams(clusterEmbeddings);
    seqSpaceSettings.clusterEmbeddings = clusterEmbeddings;
    const seqSpaceParams: {
      table: DG.DataFrame,
      molecules: DG.Column,
      methodName: DimReductionMethods,
      similarityMetric: BitArrayMetrics | MmDistanceFunctionsNames,
      plotEmbeddings: boolean,
      sparseMatrixThreshold?: number,
      clusterEmbeddings?: boolean,
      options?: (IUMAPOptions | ITSNEOptions) & Options
    } =
      {
        table: this.df,
        molecules: seqCol,
        methodName: DimReductionMethods.UMAP,
        similarityMetric: seqSpaceSettings.distanceF,
        plotEmbeddings: true,
        options: {'bypassLargeDataWarning': true, 'dbScanEpsilon': seqSpaceSettings.epsilon,
          'dbScanMinPts': seqSpaceSettings.minPts, 'randomSeed': '1',
          'preprocessingFuncArgs': {
            gapOpen: seqSpaceSettings.gapOpen, gapExtend: seqSpaceSettings.gapExtend,
            fingerprintType: seqSpaceSettings.fingerprintType,
          },
        },
        clusterEmbeddings: seqSpaceSettings.clusterEmbeddings,
      };

    // Use counter to unsubscribe when 2 columns are hidden
    let counter = 0;
    const addedColCount = seqSpaceSettings.clusterEmbeddings ? 3 : 2;
    const columnAddedSub = this.df.onColumnsAdded.subscribe((colArgs: DG.ColumnsArgs) => {
      for (const col of colArgs.columns) {
        if (col.name.toLowerCase().startsWith('embed_') ||
        ( seqSpaceSettings.clusterEmbeddings && col.name.toLowerCase().startsWith('cluster'))) {
          const gridCol = this.analysisView.grid.col(col.name);
          if (gridCol == null || this._sequenceSpaceCols.includes(col.name))
            continue;

          gridCol.visible = false;
          this._sequenceSpaceCols.push(col.name);
          counter++;
        }
      }
      if (counter === addedColCount)
        columnAddedSub.unsubscribe();
    });

    const seqSpaceAdditionSub = grok.events.onViewerAdded.subscribe((info) => {
      try {
        const v = info.args.viewer as DG.ScatterPlotViewer;
        if (v.type === DG.VIEWER.SCATTER_PLOT) {
          if (this._mclViewer && this.analysisView.dockManager.findNode(this._mclViewer.root)) {
            const rootNode = this.analysisView.dockManager.findNode(this._mclViewer.root);
            setTimeout(() => {
              this.analysisView.dockManager.dock(v, DG.DOCK_TYPE.FILL, rootNode);
            });
          }
          seqSpaceAdditionSub.unsubscribe();
        }
      } catch (e) {
        console.error(e);
      }
    });
    const seqSpaceViewer: DG.ScatterPlotViewer | undefined =
      await grok.functions.call('Bio:sequenceSpaceTopMenu', seqSpaceParams);
    seqSpaceAdditionSub.unsubscribe();
    if (!(seqSpaceViewer instanceof DG.ScatterPlotViewer))
      return;


    if (!seqSpaceSettings.clusterEmbeddings && !settings.clusterCol) { // color by activity if no clusters
      seqSpaceViewer.props.colorColumnName = this.getScaledActivityColumn()!.name;
    }
    seqSpaceViewer.props.showXSelector = false;
    seqSpaceViewer.props.showYSelector = false;
    if (settings.clusterCol)
      seqSpaceViewer.props.colorColumnName = settings.clusterCol.name;
    this._sequenceSpaceViewer = seqSpaceViewer;
    seqSpaceViewer.onContextMenu.subscribe((menu) => {
      try {
        menu.item('Modify Sequence space parameters', () => {
          getSettingsDialog(this);
        });
      } catch (e) {
      }
    });
  }
}
