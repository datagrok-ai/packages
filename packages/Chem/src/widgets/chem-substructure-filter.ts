/**
 * RDKit-based substructure filters that uses Datagrok's collaborative filtering.
 * 1. On onRowsFiltering event, only FILTER OUT rows that do not satisfy this filter's criteria
 * 2. Call dataFrame.rows.requestFilter when filtering criteria changes.
 * */

import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {FILTER_TYPES, chemSubstructureSearchLibrary} from '../chem-searches';
import {initRdKitService} from '../utils/chem-common-rdkit';
import {Subject, Subscription} from 'rxjs';
import {debounceTime, filter} from 'rxjs/operators';
import wu from 'wu';
import {TaskBarProgressIndicator, chem} from 'datagrok-api/dg';
import {_convertMolNotation} from '../utils/convert-notation-utils';
import {_package, getRdKitModule} from '../package';
import {AVAILABLE_FPS, CHEM_APPLY_FILTER_SYNC, FILTER_SCAFFOLD_TAG, MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT,
  SubstructureSearchType, getSearchProgressEventName, getSearchQueryAndType, getTerminateEventName} from '../constants';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {IColoredScaffold} from '../rendering/rdkit-cell-renderer';
import {Fingerprint} from '../utils/chem-common';
import $ from 'cash-dom';
import {awaitCheck} from '@datagrok-libraries/utils/src/test';

const FILTER_SYNC_EVENT = 'chem-substructure-filter';
const SKETCHER_TYPE_CHANGED = 'chem-sketcher-type-changed';
const PRE_CALCULATED_FP = 'chem-precalculated-fp';
const ALIGN_SYNC_EVENT = 'chem-align-sync';
const HIGHLIGHT_SYNC_EVENT = 'chem-highlight-sync';
let chemFilterid = 0;

const searchTypeHints = {
  [SubstructureSearchType.CONTAINS]: 'search structures which contain sketched pattern as a substructure',
  [SubstructureSearchType.INCLUDED_IN]: 'search structures for which sketched pattern is a superstructure',
  [SubstructureSearchType.NOT_CONTAINS]: 'search structures which DO NOT contain sketched pattern as a substructure',
  [SubstructureSearchType.NOT_INCLUDED_IN]: 'search structures for which sketched pattern is NOT a superstructure',
  [SubstructureSearchType.EXACT_MATCH]: 'search structures which exactly match sketched pattern',
  [SubstructureSearchType.IS_SIMILAR]: 'search structures similar to sketched pattern',
};

interface ISubstructureFilterState {
  bitset?: DG.BitSet;
  molblock?: string;
  colName: string;
  filterId: number;
  tableName: string;
  searchType: SubstructureSearchType;
  simCutOff: number;
  fp: Fingerprint
}

type AlignHighlightSync = {
  align: boolean;
  highlight: boolean;
  colName: string;
  filterId: number;
  tableName: string;
}

export class SubstructureFilter extends DG.Filter {
  // @ts-ignore
  sketcher: DG.chem.Sketcher = new DG.chem.Sketcher();
  bitset: DG.BitSet | null = null;
  loader: HTMLDivElement = ui.loader();
  onSketcherChangedSubs?: Subscription[] = [];
  active: boolean = true;
  syncEvent = false;
  searchTypeSync = false;
  similarityCutOffSync = false;
  fpSync = false;
  alignSync = false;
  highlightSync = false;
  filterId: number;
  tableName: string = '';
  errorDiv = ui.divText(`Too many rows, maximum for substructure search is ${MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT}`,
    'chem-substructure-limit');
  sketcherType = DG.chem.currentSketcherType;
  currentSearches = new Set<string>();
  progressBar: TaskBarProgressIndicator | null = null;
  batchResultObservable: Subscription | null = null;
  terminateEventName: string = '';
  progressEventName: string = '';
  currentMolfile: string = '';
  initListeners = false;
  //searchTypeLink: HTMLButtonElement;
  searchType: SubstructureSearchType = SubstructureSearchType.CONTAINS;
  similarityCutOff = 0.8;
  fp: Fingerprint = Fingerprint.Morgan;
  searchTypes = [SubstructureSearchType.CONTAINS, SubstructureSearchType.INCLUDED_IN,
    SubstructureSearchType.EXACT_MATCH, SubstructureSearchType.IS_SIMILAR,
    SubstructureSearchType.NOT_CONTAINS, SubstructureSearchType.NOT_INCLUDED_IN];
  fpsTypes = AVAILABLE_FPS;
  searchTypeInput: DG.InputBase;
  similarityCutOffInput: DG.InputBase;
  fpInput: DG.InputBase;
  similarityOptionsDiv = ui.divH([], 'chem-filter-similarity-options');
  sketcherDiv = ui.div('', 'chem-filter-sketcher-div');
  emptySketcherDiv = ui.divH([], 'chem-empty-filter');
  optionsIcon: HTMLElement;
  searchTypeChanged = new Subject();
  searchOptionsDiv = ui.div('', 'chem-filter-search-options');
  showOptions = false;
  searchNotCompleted = false;
  recalculateFilter = false;

  get calculating(): boolean {return this.loader.style.display == 'initial';}
  set calculating(value: boolean) {this.loader.style.display = value ? 'initial' : 'none';}

  get filterSummary(): string {
    return this.getFilterSummary(this.currentMolfile);
  }

  get isFiltering(): boolean {
    const molFile = this.sketcher?.getMolFile();
    return super.isFiltering && (!!molFile && !chem.Sketcher.isEmptyMolfile(molFile));
  }

  get isReadyToApplyFilter(): boolean {
    return this.bitset != null;
  }

  constructor() {
    super();
    initRdKitService(); // No await
    this.filterId = chemFilterid++;
    this.root = ui.divV([]);
    this.calculating = false;

    this.searchTypeInput = ui.input.choice('', {value: this.searchType, items: this.searchTypes, onValueChanged: () => {
      this.onSearchTypeChanged();
    }});
    ui.tooltip.bind(this.searchTypeInput.input, () => {
      return searchTypeHints[this.searchTypeInput.value as SubstructureSearchType];
    });
    this.searchTypeInput.root.classList.add('chem-filter-search-type');

    this.fpInput = ui.input.choice('FP', {value: this.fp, items: this.fpsTypes, onValueChanged: (value) => {
      this.fp = value;
      !this.fpSync ? this.searchTypeChanged.next() : this.fpSync = false;
    }});
    this.fpInput.input.classList.add('chem-filter-fp-editor');
    this.fpInput.captionLabel.classList.add('chem-filter-fp-label');

    const property =
    {
      'name': 'lim',
      'type': DG.TYPE.FLOAT,
      'showSlider': true,
      'min': 0,
      'max': 1,
      'nullable': false,
    };
    const slider = DG.Property.fromOptions(property);
    const initialCutOff = {lim: 0.8};
    this.similarityCutOffInput = ui.input.forProperty(slider, initialCutOff);
    this.similarityCutOffInput.input.classList.add('chem-filter-sim-cutoff-editor');
    this.similarityCutOffInput.captionLabel.classList.add('chem-filter-sim-cutoff-label');
    this.similarityCutOffInput.onChanged.subscribe((value) => {
      this.similarityCutOff = value;
      !this.similarityCutOffSync ? this.searchTypeChanged.next() : this.similarityCutOffSync = false;
    });

    ui.tooltip.bind((this.similarityCutOffInput.root.getElementsByClassName('ui-input-slider')[0] as HTMLElement)!, 'Similarity cutoff');


    this.optionsIcon = ui.icons.settings(() => {
      this.showOptions = !this.showOptions;
      this.renderShowOptionsDiv();
    });
    $(this.optionsIcon).addClass('chem-search-options-icon');

    this.sketcher.isSubstructureFilter = true;

    this.sketcherDiv.append(this.sketcher.root);
    this.emptySketcherDiv.append(this.searchTypeInput.root);
    this.emptySketcherDiv.append(this.sketcherDiv);
    this.similarityOptionsDiv.append(this.fpInput.root);
    this.similarityOptionsDiv.append(this.similarityCutOffInput.root);
    this.root.appendChild(this.searchOptionsDiv);
    this.root.appendChild(this.emptySketcherDiv);
    this.root.appendChild(this.loader);
    this.root.classList.add('chem-filter');
  }

  get _debounceTime(): number {
    if (this.column == null)
      return 1000;
    const length = this.column.length;
    const minLength = 500;
    const maxLength = 10000;
    const msecMax = 1000;
    if (length < minLength) return 0;
    if (length > maxLength) return msecMax;
    return Math.floor(msecMax * ((length - minLength) / (maxLength - minLength)));
  }

  attach(dataFrame: DG.DataFrame): void {
    if (dataFrame.rowCount > MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT) {
      ui.tools.waitForElementInDom(this.sketcher.root).then(() => {
        this.sketcher.root.children[0].classList.add('chem-hide-filter');
        this.sketcher.root.append(this.errorDiv);
        return;
      });
    };
    //this fix is required for Marvin JS sync between filter panel and hamburger menu
    ui.tools.waitForElementInDom(this.sketcher.root).then(async () => {
      let inplaceSketcher = !this.root.closest('.d4-filter');
      try {
        if (!inplaceSketcher)
          await awaitCheck(() => this.sketcher._mode === DG.chem.SKETCHER_MODE.EXTERNAL, '', 1500);
      } catch (e) {
        inplaceSketcher = true;
      }
      if (inplaceSketcher) {
        this.refresh();
        this.root.append(this.sketcher.root);
        this.searchOptionsDiv.append(this.searchTypeInput.root);
        this.sketcher.filterOptions.classList.add('grok-chem-filter-options');
        this.root.append(this.sketcher.filterOptions);
      } else
        this.updateFilterUiOnSketcherChanged(this.currentMolfile);
    });
    super.attach(dataFrame);
    this.column ??= dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE);
    this.columnName ??= this.column?.name ?? '';
    this.tableName = dataFrame.name ?? '';
    this.onSketcherChangedSubs?.forEach((it) => it.unsubscribe());


    // hide the scaffold when user deactivates the filter
    this.subs.push(this.dataFrame!.onRowsFiltering
      .pipe(filter((_) => this.column != null && !this.isFiltering))
      .subscribe((_: any) => {
        delete this.column!.temp[FILTER_SCAFFOLD_TAG];
        //in case filter filter is disabled during active search, we finish current search
        if (this.batchResultObservable && !this.batchResultObservable?.closed) {
          this.searchNotCompleted = true; //need this variable to allow continue search when enabling filter again
          this.terminatePreviousSearch();
          const smarts = _convertMolNotation(this.currentMolfile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smarts, getRdKitModule());
          this.finishSearch(getSearchQueryAndType(smarts, this.searchType, this.fp, this.similarityCutOff));
        }
      }));

    this.subs.push(grok.events.onResetFilterRequest.subscribe((_) => {
      this.sketcher.setMolFile(DG.WHITE_MOLBLOCK);
      this.searchTypeInput.value = SubstructureSearchType.CONTAINS;
    }));
    this.subs.push(grok.events.onCustomEvent(FILTER_SYNC_EVENT).subscribe((state: ISubstructureFilterState) => {
      if (state.colName === this.columnName && this.tableName == state.tableName && this.filterId !== state.filterId) {
        /* setting syncEvent to true if base sketcher is initialized or sketcher is in inplace mode and we are setting new molecule.
        If base sketcher is initialized, it will fire onChange event */
        _package.logger.debug(`********** sync event sent by filter ${state.filterId} to ${this.filterId}`);
        if (this.currentSearches.size > 0)
          grok.events.fireCustomEvent(this.terminateEventName, this.currentSearches.values().next().value);
        const updateMolecule = this.currentMolfile != state.molblock!;
        _package.logger.debug(`update molecule: ${updateMolecule}, filterId: ${this.filterId}`);
        if ((this.sketcher.sketcher?.isInitialized || this.sketcher._mode == DG.chem.SKETCHER_MODE.INPLACE) && updateMolecule) {
          this.syncEvent = true;
          _package.logger.debug(`set sync to true syncEvent: ${this.syncEvent}, filter id${this.filterId}`);
        }
        this.currentMolfile = state.molblock!;
        this.bitset = state.bitset!;
        _package.logger.debug(`in sync event , true count: ${this.bitset?.trueCount}, syncEvent: ${this.syncEvent}, filter id${this.filterId}`);
        if (this.searchTypeInput.value !== state.searchType) {
          this.searchTypeSync = true;
          this.searchTypeInput.value = state.searchType;
        }
        if (this.similarityCutOffInput.value !== state.simCutOff) {
          this.similarityCutOffSync = true;
          this.similarityCutOffInput.value = state.simCutOff;
        }
        if (this.fpInput.value !== state.fp) {
          this.fpSync = true;
          this.fpInput.value = state.fp;
        }
        const molblock = !state.molblock ? DG.WHITE_MOLBLOCK : state.molblock;
        if (updateMolecule) {
          //call setMolFile only in case new molecule differs from previous one
          _package.logger.debug(`setting new molecule in sync event , syncEvent: ${this.syncEvent}, filter id${this.filterId}`);
          this.sketcher.setMolFile(molblock);
        }
        this.updateFilterUiOnSketcherChanged(molblock);
      }
    }));
    this.subs.push(grok.events.onCustomEvent(SKETCHER_TYPE_CHANGED).subscribe((state: ISubstructureFilterState) => {
      if (state.colName === this.columnName && this.tableName == state.tableName && this.filterId !== state.filterId) {
        if (this.sketcher.sketcher?.isInitialized) {
          if (DG.chem.currentSketcherType !== this.sketcherType &&
            this.sketcher._mode !== DG.chem.SKETCHER_MODE.EXTERNAL) {
            this.sketcherType = DG.chem.currentSketcherType;
            this.sketcher.sketcherType = DG.chem.currentSketcherType;
          }
        }
      }
    }));

    this.subs.push(grok.events.onCustomEvent(ALIGN_SYNC_EVENT).subscribe((state: AlignHighlightSync) => {
      if (state.colName === this.columnName && this.tableName == state.tableName && this.filterId !== state.filterId) {
        this.alignSync = true;
        setTimeout(() => this.sketcher.align = state.align, 0);
      }
    }));

    this.subs.push(grok.events.onCustomEvent(HIGHLIGHT_SYNC_EVENT).subscribe((state: AlignHighlightSync) => {
      if (state.colName === this.columnName && this.tableName == state.tableName && this.filterId !== state.filterId) {
        this.highlightSync = true;
        setTimeout(() => this.sketcher.highlight = state.highlight, 0);
      }
    }));

    if (this.column !== null && !this.column.temp[PRE_CALCULATED_FP]) {
      _package.logger.debug(`********pre-calculating fp, filter: ${this.filterId}`);
      this.column!.temp[PRE_CALCULATED_FP] = this.filterId;
      this.currentSearches.add('');
      chemSubstructureSearchLibrary(this.column!, '', '', FILTER_TYPES.substructure, false, false)
        .then((_) => { }); // Precalculating fingerprints in case they were not precalculated before
    }

    const onChangedEvent: any = this.sketcher.onChanged;
    //onChangedEvent = onChangedEvent.pipe(debounceTime(this._debounceTime));
    this.onSketcherChangedSubs?.push(onChangedEvent.subscribe(async (_: any) => {
      _package.logger.debug(`in filter onChangedEvent, sync event: ${this.syncEvent} , ${this.filterId}`);
      this.syncEvent === true ? this.syncEvent = false : await this._onSketchChanged();
    }));
    this.onSketcherChangedSubs?.push(this.sketcher.onAlignedChanged.subscribe(async (_: any) => {
      this.alignSync === true ? this.alignSync = false : this.setFilterScaffoldTagAndFireSync(true);
    }));
    this.onSketcherChangedSubs?.push(this.sketcher.onHighlightChanged.subscribe(async (_: any) => {
      this.highlightSync === true ? this.highlightSync = false : this.setFilterScaffoldTagAndFireSync();
    }));
    this.onSketcherChangedSubs?.push(this.searchTypeChanged.subscribe(async (_: any) => {
      await this._onSketchChanged();
    }));
  }

  refresh() {
    if (!this.sketcher.sketcherTypeChanged)
      this.sketcher.sketcher?.refresh();
    else {
      //to update molfile in hamburger menu filter in case sketcher type was changed via filter panel while hamburger menu was closed
      ui.tools.waitForElementInDom(this.sketcher.root).then(() => {
        if (this.sketcher.getMolFile() !== this.currentMolfile)
          this.sketcher.setMolFile(this.currentMolfile);
      });
    }
  }

  detach() {
    //in case detaching active filter -> send sync event to other filters and reset active filter id
    if (this.column!.temp[CHEM_APPLY_FILTER_SYNC] && this.column!.temp[CHEM_APPLY_FILTER_SYNC].filterId === this.filterId) {
      this.column!.temp[CHEM_APPLY_FILTER_SYNC] = {filterId: -1};
      grok.events.fireCustomEvent(FILTER_SYNC_EVENT, {
        bitset: this.bitset,
        molblock: this.currentMolfile, colName: this.columnName, filterId: this.filterId,
        tableName: this.tableName, searchType: this.searchType, simCutOff: this.similarityCutOff, fp: this.fp,
      });
    };
    //terminating search (in case the search was active at the moment of detach)
    _package.logger.debug(`************finish search in detach ${this.filterId}`);
    this.terminatePreviousSearch();
    const smarts = _convertMolNotation(this.currentMolfile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smarts, getRdKitModule());
    this.finishSearch(getSearchQueryAndType(smarts, this.searchType, this.fp, this.similarityCutOff));
    if (this.column?.temp[FILTER_SCAFFOLD_TAG])
      this.column.temp[FILTER_SCAFFOLD_TAG] = null;
    super.detach(); //super.detach() leads to automatic call of requestFilter -> applyFilter
    this.onSketcherChangedSubs?.forEach((it) => it.unsubscribe());
  }

  setFilterScaffoldTagAndFireSync(align?: boolean) {
    this.setFilterScaffoldTag();
    grok.events.fireCustomEvent(align ? ALIGN_SYNC_EVENT : HIGHLIGHT_SYNC_EVENT, {colName: this.columnName,
      filterId: this.filterId, tableName: this.tableName, align: this.sketcher.align, highlight: this.sketcher.highlight});
  }

  setFilterScaffoldTag() {
    this.column!.temp[FILTER_SCAFFOLD_TAG] = JSON.stringify([{
      molecule: this.currentMolfile,
      isSuperstructure: this.searchType === SubstructureSearchType.INCLUDED_IN,
      align: this.sketcher.align,
      color: this.sketcher.highlight ? undefined : '#00000000',
    }]);
    grok.shell.tv?.grid?.invalidate();
  }

  applyFilter(): void {
    _package.logger.debug(`*************entered apply filter, filter id${this.filterId}`);
    this.active = true;
    //we apply filter bitset only from one active filtering fiter, other filters are just synchronizing
    const activeFilterId = this.column!.temp[CHEM_APPLY_FILTER_SYNC] ? this.column!.temp[CHEM_APPLY_FILTER_SYNC].filterId : -1;
    if (activeFilterId !== this.filterId) {
      if (activeFilterId === -1)
        this.column!.temp[CHEM_APPLY_FILTER_SYNC] = {filterId: this.filterId, summary: this.getFilterSummary(this.currentMolfile)};
      else {
        _package.logger.debug(`return from apply filter , true count: ${this.bitset?.trueCount}, filter id${this.filterId}`);
        return;
      }
    }
    // in case dataframe has been changed (rows added/removed) while filter was disabled
    // or applyState with molfile was called on inactive filter -> need to recalculate results
    if ((this.bitset && this.dataFrame?.filter.length !== this.bitset.length) || this.recalculateFilter) {
      this.recalculateFilter = true;
      this._onSketchChanged();
      return;
    }
    _package.logger.debug(`in apply filter , true count: ${this.bitset?.trueCount}, filter id${this.filterId}`);
    if (this.dataFrame && this.bitset && !this.isDetached) {
      this.dataFrame.filter.and(this.bitset);
      this.dataFrame.rows.addFilterState(this.saveState());
      this.setFilterScaffoldTag();
      // if filter was disabled during active search and then enabled -> need to recalculate results
      if (this.searchNotCompleted)
        this._onSketchChanged();
    }
  }

  /** Override to save filter state. */
  saveState(): any {
    const state = super.saveState();
    state.type = 'Chem:substructureFilter';
    state.molBlock = this.currentMolfile;
    state.searchType = this.searchType;
    state.simCutOff = this.similarityCutOff;
    state.fp = this.fp;
    _package.logger.debug(`saving state: ${state.molBlock}, filter id: ${this.filterId}`);
    return state;
  }

  /** Override to load filter state. */
  applyState(state: any): void {
    super.applyState(state);
    _package.logger.debug(`applying state: ${state.molBlock}, filter id: ${this.filterId}`);

    if (!this.initListeners) {
      this.initListeners = true;
      this.terminateEventName = getTerminateEventName(this.tableName, this.columnName!);
      this.progressEventName = getSearchProgressEventName(this.tableName, this.columnName!);

      this.subs.push(grok.events.onCustomEvent(this.terminateEventName).subscribe((queryMol: string) => {
        _package.logger.debug(`in ${this.terminateEventName} handler, querymol: ${queryMol}, ${this.filterId}`);
        this.finishSearch(queryMol);
      }));
    }
    this.active = state.active ?? true;
    if (state.molBlock && state.molBlock !== this.currentMolfile) {
      this.currentMolfile = state.molBlock;
      this.sketcher.setMolFile(state.molBlock);
      this.updateFilterUiOnSketcherChanged(this.currentMolfile);
    }
    if (state.searchType && state.searchType !== this.searchType)
      this.searchTypeInput.value = state.searchType;
    if (state.simCutOff && state.simCutOff !== this.similarityCutOff)
      this.similarityCutOffInput.value = state.simCutOff;
    if (state.fp && state.fp !== this.fp)
      this.fpInput.value = state.fp;

    const that = this;
    /* columnIsFilteringByStructure variable is required to handle the following:
    there are cloned views, and column is filtered by some structure. And then we apply layout with empty substructure
    for this column. So in spite molblock is empty, we need to reset filter for this column, so need to run
    _onSketchChanged().
    */
    const columnIsFilteringByStructure = this.column?.temp[FILTER_SCAFFOLD_TAG] ?
      (JSON.parse(this.column?.temp[FILTER_SCAFFOLD_TAG]) as IColoredScaffold[])[0].molecule : '';
    if (state.molBlock || (columnIsFilteringByStructure && columnIsFilteringByStructure !== state.molBlock)) {
      _package.logger.debug(`******in applyState, calling sketcher change for filter: ${this.filterId}`);
      setTimeout(function() {that._onSketchChanged();}, 1000);
    }
  }
  /**
   * Performs the actual filtering
   * When the results are ready, triggers `rows.requestFilter`, which in turn triggers `applyFilter`
   * that would simply apply the bitset synchronously.
   */
  async _onSketchChanged(): Promise<void> {
    const newMolFile = this.sketcher.getMolFile();
    _package.logger.debug(`newMolfile ${newMolFile} , ${this.filterId}`);
    const newSmarts = _convertMolNotation(newMolFile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smarts, getRdKitModule());
    _package.logger.debug(`newSmarts ${newSmarts}, ${this.filterId}`);
    if (this.currentMolfile !== newMolFile)
      this.updateFilterUiOnSketcherChanged(newMolFile);
    grok.events.fireCustomEvent(SKETCHER_TYPE_CHANGED, {colName: this.columnName,
      filterId: this.filterId, tableName: this.tableName});
    if (!this.isFiltering) {
      _package.logger.debug(`not filtering ${newSmarts}, ${this.filterId}`);
      this.currentMolfile = newMolFile;
      if (!this.active)
        this.recalculateFilter = true; //in case applyState was called on disabled filter -> need to recalculate results
      else
        this.column!.temp[CHEM_APPLY_FILTER_SYNC] = {filterId: this.filterId, summary: this.getFilterSummary('')}; //sketcher was cleared -> current sketcher becomes the active one
      this.bitset = !this.active ? DG.BitSet.create(this.column!.length) : null; //TODO
      if (this.column?.temp[FILTER_SCAFFOLD_TAG])
        delete this.column.temp[FILTER_SCAFFOLD_TAG];
      this.terminatePreviousSearch();
      this.finishSearch(getSearchQueryAndType(newSmarts, this.searchType, this.fp, this.similarityCutOff));
      if (this.column!.temp[CHEM_APPLY_FILTER_SYNC] && this.column!.temp[CHEM_APPLY_FILTER_SYNC].filterId === this.filterId) {
        grok.events.fireCustomEvent(FILTER_SYNC_EVENT, {bitset: this.bitset,
          molblock: this.currentMolfile, colName: this.columnName, filterId: this.filterId,
          tableName: this.tableName, searchType: this.searchType, simCutOff: this.similarityCutOff, fp: this.fp});
      }
      this.dataFrame?.rows.requestFilter();
    } else if ((wu(this.dataFrame!.rows.filters)
      .has(`${this.columnName}: ${this.getFilterSummary(newMolFile)}`) || this.isFilteringBySameStructure(newMolFile)) &&
      !this.recalculateFilter && !this.searchNotCompleted) {
      // some other filter is already filtering for the exact same thing
      // value to pass into has() is created similarly to filterSummary property
      _package.logger.debug(`already filter by the same structure ${this.getFilterSummary(newMolFile)} , ${this.filterId}`);
      return;
    } else {
      this.recalculateFilter = false;
      this.column!.temp[CHEM_APPLY_FILTER_SYNC] = {filterId: this.filterId, summary: this.getFilterSummary(newMolFile)};
      this.searchNotCompleted = false;
      this.terminatePreviousSearch();
      this.currentMolfile = newMolFile;
      this.currentSearches.add(getSearchQueryAndType(newSmarts, this.searchType, this.fp, this.similarityCutOff));
      this.calculating = true;
      this.progressBar ??= DG.TaskBarProgressIndicator.create(`Starting substructure search...`);
      _package.logger.debug(`starting filter by ${this.currentMolfile}, ${this.filterId}`);
      try {
        grok.events.fireCustomEvent(FILTER_SYNC_EVENT, {bitset: this.bitset,
          molblock: this.currentMolfile, colName: this.columnName, filterId: this.filterId,
          tableName: this.tableName, searchType: this.searchType, simCutOff: this.similarityCutOff, fp: this.fp});
        const bitArray = await this.getFilterBitset();
        this.bitset = DG.BitSet.fromBytes(bitArray.buffer.buffer, this.column!.length);
        this.batchResultObservable?.unsubscribe();
        this.batchResultObservable = grok.events.onCustomEvent(this.progressEventName).subscribe((progress: number) => {
          _package.logger.debug(`progress: ${progress}, molfile: ${this.currentMolfile}, ${this.filterId}`);
          this.bitset = DG.BitSet.fromBytes(bitArray.buffer.buffer, this.column!.length);
          this.dataFrame?.rows.requestFilter();
          this.progressBar?.update(progress, `${progress?.toFixed(2)}% of search completed`);
        });
      } catch {
        this.finishSearch(getSearchQueryAndType(newSmarts, this.searchType, this.fp, this.similarityCutOff));
      }
    }
  }

  async getFilterBitset(): Promise<BitArray> {
    const smarts = _convertMolNotation(this.currentMolfile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smarts, getRdKitModule());
    return await chemSubstructureSearchLibrary(this.column!, this.currentMolfile, smarts!, FILTER_TYPES.substructure, false, false,
      this.searchType, this.similarityCutOff, this.fp);
  }

  isFilteringBySameStructure(molecule: string): boolean {
    return this.column!.temp[CHEM_APPLY_FILTER_SYNC] && this.column!.temp[CHEM_APPLY_FILTER_SYNC].summary === this.getFilterSummary(molecule);
  }

  updateExternalSketcher() {
    if (this.sketcher._mode === DG.chem.SKETCHER_MODE.EXTERNAL)
      this.sketcher.updateExtSketcherContent(); //updating image in minimized sketcher panel
  }

  updateFilterUiOnSketcherChanged(newMolFile: string) {
    if (this.sketcher._mode !== DG.chem.SKETCHER_MODE.INPLACE) {
      if (!!newMolFile && !chem.Sketcher.isEmptyMolfile(newMolFile)) {
        this.removeChildIfExists(this.root, this.emptySketcherDiv, 'empty-filter');
        this.root.appendChild(this.sketcherDiv);
        if (this.searchType === SubstructureSearchType.CONTAINS) {
          this.sketcher.root.appendChild(this.optionsIcon);
          this.renderShowOptionsDiv();
        } else {
          this.root.prepend(this.searchOptionsDiv);
          this.searchOptionsDiv.append(this.searchTypeInput.root);
          if (this.searchType === SubstructureSearchType.IS_SIMILAR)
            this.searchOptionsDiv.append(this.similarityOptionsDiv);
          else
            this.removeChildIfExists(this.searchOptionsDiv, this.similarityOptionsDiv, 'chem-filter-similarity-options');
        }
      } else {
        this.emptySketcherDiv.append(this.searchTypeInput.root);
        this.emptySketcherDiv.append(this.sketcherDiv);
        this.root.append(this.emptySketcherDiv);
        this.removeChildIfExists(this.sketcher.root, this.optionsIcon, 'chem-search-options-icon');
        if (this.searchType !== SubstructureSearchType.IS_SIMILAR)
          this.removeChildIfExists(this.searchOptionsDiv, this.similarityOptionsDiv, 'chem-filter-similarity-options');
      }
    }
    this.updateExternalSketcher();
  }

  removeChildIfExists(parent: HTMLElement, child: HTMLElement, className: string) {
    if (parent.getElementsByClassName(className).length)
      parent.removeChild(child);
  }

  onSearchTypeChanged() {
    this.searchType = this.searchTypeInput.value;
    if (this.searchType !== SubstructureSearchType.CONTAINS)
      this.removeChildIfExists(this.sketcher.root, this.optionsIcon, 'chem-search-options-icon');
    else {
      if (!chem.Sketcher.isEmptyMolfile(this.sketcher.getMolFile()) && this.sketcher._mode !== DG.chem.SKETCHER_MODE.INPLACE)
        this.sketcher.root.appendChild(this.optionsIcon);
    }
    if (this.searchType === SubstructureSearchType.IS_SIMILAR) {
      this.searchOptionsDiv.append(this.searchTypeInput.root);
      this.searchOptionsDiv.append(this.similarityOptionsDiv);
    } else
      this.removeChildIfExists(this.searchOptionsDiv, this.similarityOptionsDiv, 'chem-filter-similarity-options');
    !this.searchTypeSync ? this.searchTypeChanged.next() : this.searchTypeSync = false;
  }

  renderShowOptionsDiv() {
    if (this.showOptions) {
      this.root.prepend(this.searchOptionsDiv);
      this.searchOptionsDiv.append(this.searchTypeInput.root);
    } else {
      this.removeChildIfExists(this.emptySketcherDiv, this.searchTypeInput.root, 'chem-filter-search-type');
      this.removeChildIfExists(this.root, this.searchOptionsDiv, 'chem-filter-search-options');
    }
  }

  terminatePreviousSearch() {
    if (this.currentSearches.size > 0)
      grok.events.fireCustomEvent(this.terminateEventName, this.currentSearches.values().next().value);
  }

  finishSearch(queryMolAndType: string) {
    _package.logger.debug(`in finishSearch ${this.currentSearches} , ${this.filterId}`);
    const finish = () => {
      _package.logger.debug(`in finish function ${queryMolAndType}, ${this.filterId}`);
      if (this.currentSearches.size === 0) {
        if (this.column!.temp[CHEM_APPLY_FILTER_SYNC] && this.column!.temp[CHEM_APPLY_FILTER_SYNC].filterId === this.filterId) {
          grok.events.fireCustomEvent(FILTER_SYNC_EVENT, { //synchronize the results with other substructure filters on the same column
            bitset: this.bitset,
            molblock: this.currentMolfile, colName: this.columnName, filterId: this.filterId,
            tableName: this.tableName, searchType: this.searchType, simCutOff: this.similarityCutOff, fp: this.fp,
          });
        }
        this.calculating = false;
        this.progressBar?.close();
        this.progressBar = null;
        this.batchResultObservable?.unsubscribe();
        _package.logger.debug(`Unsubscribed from batchResultObservable  Filter ${this.filterId}`);
      }
    };
    if (this.currentSearches.has(queryMolAndType)) {
      _package.logger.debug(`in finishSearch first if ${queryMolAndType}, ${this.filterId}`);
      this.currentSearches.delete(queryMolAndType);
      finish();
    }
    if (queryMolAndType == null && this.currentSearches.size === 1) {
      _package.logger.debug(`in finishSearch second if ${queryMolAndType}, ${this.filterId}`);
      const v = this.currentSearches.values().next().value;
      if (v != null)
        this.currentSearches.delete(v);
      finish();
    }
  }

  getFilterSummary(molfile: string): string {
    const smarts = _convertMolNotation(molfile, DG.chem.Notation.MolBlock, DG.chem.Notation.Smarts,
      getRdKitModule());
    return this.searchType === SubstructureSearchType.IS_SIMILAR ?
      `${smarts}_${this.searchType}_${this.similarityCutOff}_${this.fp}` : `${smarts}_${this.searchType}`;
  }
}
