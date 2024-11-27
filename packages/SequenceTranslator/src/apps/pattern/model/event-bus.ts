/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import * as rxjs from 'rxjs';
import {debounceTime, throttleTime, map, skip, switchMap} from 'rxjs/operators';

import {
  GRAPH_SETTINGS_KEYS as G, LEGEND_SETTINGS_KEYS as L, MAX_SEQUENCE_LENGTH, PATTERN_RECORD_KEYS as R, STRAND, STRANDS, TERMINI, TERMINUS
} from './const';
import {DataManager} from './data-manager';
import {
  NucleotideSequences, PatternConfigRecord, PatternConfiguration,
  PhosphorothioateLinkageFlags, StrandTerminusModifications, StrandType
} from './types';
import {
  getMostFrequentNucleotide, getUniqueNucleotides, getUniqueNucleotidesWithNumericLabels, StrandEditingUtils
} from './utils';

import _ from 'lodash';

/** Manager of all events in the application, *the* central state manager.
 * Use for communication between app's components to avoid tight coupling. */
export class EventBus {
  private _patternAuthorSelection$: rxjs.BehaviorSubject<string>;

  private _patternName$: rxjs.BehaviorSubject<string>;

  private _isAntisenseStrandActive$: rxjs.BehaviorSubject<boolean>;

  private _nucleotideSequences$: rxjs.BehaviorSubject<NucleotideSequences>;
  private _phosphorothioateLinkageFlags: rxjs.BehaviorSubject<PhosphorothioateLinkageFlags>;
  private _terminalModifications: rxjs.BehaviorSubject<StrandTerminusModifications>;
  private _comment$: rxjs.BehaviorSubject<string>;
  private _modificationsWithNumericLabels$: rxjs.BehaviorSubject<string[]>;
  private _nucleotidesWithModificationLabels$: rxjs.BehaviorSubject<string[]>;
  private _sequenceBase$: rxjs.BehaviorSubject<string>;

  private _patternListUpdated$ = new rxjs.Subject<void>();

  private _patternLoadRequested$ = new rxjs.Subject<string>();
  private _patternLoaded$ = new rxjs.Subject<string>();
  private _uniqueNucleotides$ = new rxjs.BehaviorSubject<string[]>([]);

  private _patternDeletionRequested$ = new rxjs.Subject<string>();
  private _tableSelection$ = new rxjs.BehaviorSubject<DG.DataFrame | null>(null);

  private _svgSaveRequested$ = new rxjs.Subject<void>();
  private _loadPatternInNewTabRequested$ = new rxjs.Subject<string>();
  private _urlStateUpdated$ = new rxjs.Subject<string>();

  private _patternHasUnsavedChanges$ = new rxjs.BehaviorSubject<boolean>(false);
  private _lastLoadedPatternConfig: rxjs.BehaviorSubject<PatternConfiguration >;

  private _selectedStrandColumn = new rxjs.BehaviorSubject<{[strand: string]: string | null} | null>(null);
  private _selectedIdColumn = new rxjs.BehaviorSubject<string | null>(null);

  constructor(
    private dataManager: DataManager,
    initialPaternConfigRecord: PatternConfigRecord
  ) {
    this.initializeAuthorSelection(initialPaternConfigRecord);
    this.initializePatternState(initialPaternConfigRecord);
    this._lastLoadedPatternConfig = new rxjs.BehaviorSubject(
      _.cloneDeep(this.getPatternConfig())
    );
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    this._nucleotideSequences$.subscribe(() => {
      this.updateUniqueNucleotides();
      this.updateSequenceBase();
    });

    this._isAntisenseStrandActive$.subscribe((isActive) => {
      if (isActive)
        return;

      TERMINI.forEach((terminus) => {
        this.updateTerminusModification(STRAND.ANTISENSE, terminus, '');
      });
    });

    this.patternStateChanged$.pipe(
      debounceTime(20)
    ).subscribe(() => {
      const lastLoadedConfig = this._lastLoadedPatternConfig.getValue();
      const currentConfig = this.getPatternConfig();
      const hasUnsavedChanges = !_.isEqual(currentConfig, lastLoadedConfig);
      this._patternHasUnsavedChanges$.next(hasUnsavedChanges);
    });
  }

  private updateUniqueNucleotides(): void {
    const sequences = this._nucleotideSequences$.getValue();
    const uniqueNucleotides = getUniqueNucleotides(sequences, this.isAntisenseStrandActive());
    this._uniqueNucleotides$.next(uniqueNucleotides);
  }

  private updateSequenceBase(): void {
    const nucleotideSequences = this._nucleotideSequences$.getValue();
    const mostFrequentNucleotide = getMostFrequentNucleotide(nucleotideSequences);
    this._sequenceBase$.next(mostFrequentNucleotide);
  }

  get nucleotideSequencesChanged$(): rxjs.Observable<NucleotideSequences> {
    return this._nucleotideSequences$.asObservable();
  }

  private initializeAuthorSelection(
    initialConfigRecord: PatternConfigRecord
  ) {
    const patternAuthorId = initialConfigRecord[R.AUTHOR_ID];
    if (this.dataManager.isCurrentUserId(patternAuthorId))
      this._patternAuthorSelection$ = new rxjs.BehaviorSubject(this.dataManager.getCurrentUserAuthorshipCategory());
    else
      this._patternAuthorSelection$ = new rxjs.BehaviorSubject(this.dataManager.getOtherUsersAuthorshipCategory());
  }

  private initializePatternState(
    initialConfigRecord: PatternConfigRecord
  ) {
    const initialPattern = initialConfigRecord[R.PATTERN_CONFIG];
    this._patternName$ = new rxjs.BehaviorSubject(initialPattern[L.PATTERN_NAME]);
    this._isAntisenseStrandActive$ = new rxjs.BehaviorSubject(
      initialPattern[G.IS_ANTISENSE_STRAND_INCLUDED]
    );
    this._nucleotideSequences$ = new rxjs.BehaviorSubject(
      initialPattern[G.NUCLEOTIDE_SEQUENCES]
    );
    this._phosphorothioateLinkageFlags = new rxjs.BehaviorSubject(
      initialPattern[G.PHOSPHOROTHIOATE_LINKAGE_FLAGS]
    );
    this._terminalModifications = new rxjs.BehaviorSubject(
      initialPattern[G.STRAND_TERMINUS_MODIFICATIONS]
    );
    this._comment$ = new rxjs.BehaviorSubject(
      initialPattern[L.PATTERN_COMMENT]
    );
    this._modificationsWithNumericLabels$ = new rxjs.BehaviorSubject(
      initialPattern[L.NUCLEOTIDES_WITH_NUMERIC_LABELS]
    );
    this._nucleotidesWithModificationLabels$ = new rxjs.BehaviorSubject(
      initialPattern[L.NUCLEOTIDES_WITH_MODIFICATION_LABELS]
    );
    this._sequenceBase$ = new rxjs.BehaviorSubject(
      getMostFrequentNucleotide(initialPattern[G.NUCLEOTIDE_SEQUENCES])
    );
  }

  getPatternName(): string {
    return this._patternName$.getValue();
  }

  updatePatternName(patternName: string) {
    this._patternName$.next(patternName);
  }

  get antisenseStrandToggled$(): rxjs.Observable<boolean> {
    return this._isAntisenseStrandActive$.asObservable();
  }

  isAntisenseStrandActive(): boolean {
    return this._isAntisenseStrandActive$.getValue();
  }

  toggleAntisenseStrand(isActive: boolean) {
    // if (!isActive) {
    //   this.updateNucleotideSequences(this.getNucleotideSequences());
    // }
    // else
    //   this.updateStrandLength(STRAND.ANTISENSE, this.getNucleotideSequences()[STRAND.ANTISENSE].length);
    this._isAntisenseStrandActive$.next(isActive);
    this.updateNucleotideSequences(this.getNucleotideSequences());
  }

  toggleNumericLabels(hide: boolean, nucleotide: string) {
    const labelledNucleotides = this.getModificationsWithNumericLabels();
    const newArray = !hide ? labelledNucleotides.concat(nucleotide) :
      labelledNucleotides.filter((n) => n !== nucleotide);
    this.updateModificationsWithNumericLabels(newArray);
  }

  toggleModificationLables(hide: boolean, nucleotide: string) {
    const labelledNucleotides = this.getNucleotidesWithModificationLabels();
    const newArray = !hide ? labelledNucleotides.concat(nucleotide) :
      labelledNucleotides.filter((n) => n !== nucleotide);
    this._nucleotidesWithModificationLabels$.next(newArray);
  }

  getNucleotideSequences(): NucleotideSequences {
    return this._nucleotideSequences$.getValue();
  }

  updateNucleotideSequences(nucleotideSequences: NucleotideSequences) {
    this._nucleotideSequences$.next(nucleotideSequences);
  }

  //if nucleotideIdx is passed - adding or removing nucleotide in the exact position
  updateStrandLength(strand: StrandType, newStrandLength: number, nucleotideIdx?: number): void {
    const originalNucleotides = this.getNucleotideSequences()[strand];
    if (originalNucleotides.length === newStrandLength) return;

    const originalPTOFlags = this.getPhosphorothioateLinkageFlags()[strand];

    if (newStrandLength === 0) {
      this.setNewStrandData([], [], strand);
      return;
    }

    if (originalNucleotides.length > newStrandLength) {
      const {nucleotides, ptoFlags} = StrandEditingUtils.getTruncatedStrandData(
        originalNucleotides, originalPTOFlags, newStrandLength, nucleotideIdx
      );
      this.setNewStrandData(nucleotides, ptoFlags, strand);
      return;
    }

    const sequenceBase = this.getSequenceBase();
    const {nucleotides, ptoFlags} = StrandEditingUtils.getExtendedStrandData(
      originalNucleotides, originalPTOFlags, newStrandLength, sequenceBase, nucleotideIdx
    );
    this.setNewStrandData(nucleotides, ptoFlags, strand);
  }

  private setNewStrandData(
    newNucleotides: string[],
    newPTOFlags: boolean[],
    strand: StrandType
  ): void {
    this.updateNucleotideSequences({
      ...this.getNucleotideSequences(),
      [strand]: newNucleotides
    });
    this.updatePhosphorothioateLinkageFlags({
      ...this.getPhosphorothioateLinkageFlags(),
      [strand]: newPTOFlags
    });
  }

  getPhosphorothioateLinkageFlags(): PhosphorothioateLinkageFlags {
    return this._phosphorothioateLinkageFlags.getValue();
  }

  updatePhosphorothioateLinkageFlags(phosphorothioateLinkageFlags: PhosphorothioateLinkageFlags) {
    this._phosphorothioateLinkageFlags.next(phosphorothioateLinkageFlags);
  }

  get phosphorothioateLingeFlagsChanged$(): rxjs.Observable<PhosphorothioateLinkageFlags> {
    return this._phosphorothioateLinkageFlags.asObservable();
  }

  getTerminalModifications(): StrandTerminusModifications {
    return this._terminalModifications.getValue();
  }

  updateTerminalModifications(terminalModifications: StrandTerminusModifications) {
    this._terminalModifications.next(terminalModifications);
  }

  updateTerminusModification(strand: StrandType, terminus: TERMINUS, modification: string) {
    const terminalModifications = this.getTerminalModifications();
    terminalModifications[strand][terminus] = modification;
    this.updateTerminalModifications(terminalModifications);
  }

  terminalModificationsUpdated$(): rxjs.Observable<StrandTerminusModifications> {
    return this._terminalModifications.asObservable();
  }

  getComment(): string {
    return this._comment$.getValue();
  }

  updateComment(comment: string) {
    this._comment$.next(comment);
  }

  getModificationsWithNumericLabels(): string[] {
    return this._modificationsWithNumericLabels$.getValue();
  }

  getNucleotidesWithModificationLabels(): string[] {
    return this._nucleotidesWithModificationLabels$.getValue();
  }


  updateModificationsWithNumericLabels(modificationsWithNumericLabels: string[]) {
    const newValue = getUniqueNucleotidesWithNumericLabels(modificationsWithNumericLabels);
    this._modificationsWithNumericLabels$.next(newValue);
  }

  get nucleotidesModificationLabelsChanged$(): rxjs.Observable<string[]> {
    return this._nucleotidesWithModificationLabels$.asObservable();
  }

  setAllModificationLabels(flag: boolean) {
    const newValue = flag ? getUniqueNucleotides(this._nucleotideSequences$.getValue(), this.isAntisenseStrandActive()) : [];
    this._nucleotidesWithModificationLabels$.next(newValue);
  }

  get patternLoadRequested$(): rxjs.Observable<string> {
    return this._patternLoadRequested$.asObservable();
  }

  requestPatternLoad(patternHash: string) {
    this._patternLoadRequested$.next(patternHash);
  }

  get patternListUpdated$(): rxjs.Observable<void> {
    return this._patternListUpdated$.asObservable();
  }

  updatePatternList() {
    this._patternListUpdated$.next();
  }

  get tableSelectionChanged$(): rxjs.Observable<DG.DataFrame | null> {
    return this._tableSelection$.asObservable();
  }

  selectTable(table: DG.DataFrame | null) {
    this._tableSelection$.next(table);
  }

  getTableSelection(): DG.DataFrame | null {
    return this._tableSelection$.getValue();
  }

  requestPatternDeletion(patternName: string) {
    this._patternDeletionRequested$.next(patternName);
  }

  get patternDeletionRequested$(): rxjs.Observable<string> {
    return this._patternDeletionRequested$.asObservable();
  }

  replaceSequenceBase(newNucleobase: string) {
    const oldNucleotideSequences = this._nucleotideSequences$.getValue();
    const newNucleotideSequences = {} as NucleotideSequences;
    STRANDS.forEach((strand) => {
      newNucleotideSequences[strand] = oldNucleotideSequences[strand].map(() => newNucleobase);
    });
    this._nucleotideSequences$.next(newNucleotideSequences);

    //update modification labels
    const labelledMOdifications = this.getNucleotidesWithModificationLabels();
    if (labelledMOdifications.length) {
      this._nucleotidesWithModificationLabels$.next([newNucleobase]);
    }

    const labelledNucleotides = this._modificationsWithNumericLabels$.getValue();
    if (!labelledNucleotides.includes(newNucleobase))
      this.updateModificationsWithNumericLabels(labelledNucleotides.concat(newNucleobase));
  }

  get patternStateChanged$(): rxjs.Observable<void> {
    const observable = rxjs.merge(
      this._patternName$.pipe(debounceTime(300), map(() => {})),
      this._isAntisenseStrandActive$,
      this._nucleotideSequences$,
      this._phosphorothioateLinkageFlags,
      this._terminalModifications,
      this._comment$.pipe(debounceTime(300)),
      this._modificationsWithNumericLabels$,
      this._nucleotidesWithModificationLabels$,
    ) as rxjs.Observable<void>;

    return observable;
  }

  getSequenceBase(): string {
    return this._sequenceBase$.getValue();
  }

  uniqueNucleotidesChanged$(): rxjs.Observable<string[]> {
    // WARNING: switchMap is necessary to preserve order of events
    const observable = this.patternStateChanged$.pipe(
      switchMap(() => this._uniqueNucleotides$)
    );

    return observable;
  }

  getUniqueNucleotides(): string[] {
    return this._uniqueNucleotides$.getValue();
  }

  get svgSaveRequested$(): rxjs.Observable<void> {
    return this._svgSaveRequested$.asObservable();
  }

  requestSvgSave() {
    this._svgSaveRequested$.next();
  }

  setAllPTOLinkages(value: boolean) {
    const flags = this.getPhosphorothioateLinkageFlags();
    STRANDS.forEach((strand) => {
      flags[strand] = flags[strand].map(() => value);
    });
    this.updatePhosphorothioateLinkageFlags(flags);
  }

  setPatternConfig(patternConfiguration: PatternConfiguration) {
    this._patternName$.next(patternConfiguration[L.PATTERN_NAME]);
    this._isAntisenseStrandActive$.next(patternConfiguration[G.IS_ANTISENSE_STRAND_INCLUDED]);
    this._nucleotideSequences$.next(patternConfiguration[G.NUCLEOTIDE_SEQUENCES]);
    this._phosphorothioateLinkageFlags.next(patternConfiguration[G.PHOSPHOROTHIOATE_LINKAGE_FLAGS]);
    this._terminalModifications.next(patternConfiguration[G.STRAND_TERMINUS_MODIFICATIONS]);
    this._comment$.next(patternConfiguration[L.PATTERN_COMMENT]);
    this._modificationsWithNumericLabels$.next(patternConfiguration[L.NUCLEOTIDES_WITH_NUMERIC_LABELS]);
    this._nucleotidesWithModificationLabels$.next(patternConfiguration[L.NUCLEOTIDES_WITH_MODIFICATION_LABELS]);
  }

  setLastLoadedPatternConfig(patternConfiguration: PatternConfiguration) {
    this._lastLoadedPatternConfig.next(
      _.cloneDeep(patternConfiguration)
    );
  }

  getPatternConfig(): PatternConfiguration {
    return {
      [L.PATTERN_NAME]: this.getPatternName(),
      [G.IS_ANTISENSE_STRAND_INCLUDED]: this.isAntisenseStrandActive(),
      [G.NUCLEOTIDE_SEQUENCES]: this.getNucleotideSequences(),
      [G.PHOSPHOROTHIOATE_LINKAGE_FLAGS]: this.getPhosphorothioateLinkageFlags(),
      [G.STRAND_TERMINUS_MODIFICATIONS]: this.getTerminalModifications(),
      [L.PATTERN_COMMENT]: this.getComment(),
      [L.NUCLEOTIDES_WITH_NUMERIC_LABELS]: this.getModificationsWithNumericLabels(),
      [L.NUCLEOTIDES_WITH_MODIFICATION_LABELS]: this.getNucleotidesWithModificationLabels(),
    };
  }

  setPhosphorothioateLinkageFlag(strand: StrandType, index: number, newValue: boolean) {
    const flags = this.getPhosphorothioateLinkageFlags();
    flags[strand][index] = newValue;
    this.updatePhosphorothioateLinkageFlags(flags);
  }

  setNucleotide(strand: StrandType, index: number, value: string, hideModificationLabel?: boolean) {
    const sequences = this.getNucleotideSequences();
    sequences[strand][index] = value;

    //update modification labels
    const labelledNucleotides = this.getNucleotidesWithModificationLabels();
    if (labelledNucleotides.length && !labelledNucleotides.includes(value)) {
      this._nucleotidesWithModificationLabels$.next(labelledNucleotides.concat(value))
    }
    //update numeric labels
    const labelledModifications = this.getModificationsWithNumericLabels();
    this.updateModificationsWithNumericLabels(labelledModifications.concat(value));
    this.updateNucleotideSequences(sequences);
  }

  addNucleotide(strand: StrandType, index: number) {
    const sequences = this.getNucleotideSequences();
    if (sequences[strand].length === MAX_SEQUENCE_LENGTH) {
      grok.shell.warning(`Sequence length must be less than ${MAX_SEQUENCE_LENGTH + 1}`);
      return;
    }
    const labelledModifications = this.getModificationsWithNumericLabels();
    this.updateModificationsWithNumericLabels(labelledModifications.concat(this.getSequenceBase()));
    this.updateStrandLength(strand, sequences[strand].length + 1, index);
  }

  removeNucleotide(strand: StrandType, index: number) {
    const sequences = this.getNucleotideSequences();
    if (sequences[strand].length === 1) {
      grok.shell.warning(`Sequence length must be greater than 0`);
      return;
    }
    const labelledModifications = this.getModificationsWithNumericLabels();
    this.updateModificationsWithNumericLabels(labelledModifications);
    this.updateStrandLength(strand, sequences[strand].length - 1, index);
  }

  get strandsUpdated$(): rxjs.Observable<void> {
    return rxjs.merge(
      this._isAntisenseStrandActive$.asObservable().pipe(map(() => {})),
      this._nucleotideSequences$.asObservable().pipe(map(() => {})),
      this._patternLoaded$.asObservable().pipe(map(() => {}))
    ).pipe(
      debounceTime(10)
    ) as rxjs.Observable<void>;
  }

  get strandsLinkagesAndTerminalsUpdated$(): rxjs.Observable<void> {
    return rxjs.merge(
      this.strandsUpdated$,
      this._phosphorothioateLinkageFlags.asObservable().pipe(map(() => {})),
      this._terminalModifications.asObservable().pipe(map(() => {}))
    );
  }

  updateControlsUponPatternLoaded(patternHash: string) {
    this._patternLoaded$.next(patternHash);
  }

  get patternLoaded$(): rxjs.Observable<string> {
    return this._patternLoaded$.asObservable();
  }

  get userSelection$(): rxjs.Observable<string> {
    return this._patternAuthorSelection$.asObservable().pipe(skip(1));
  }

  selectAuthor(username: string) {
    if (typeof username !== 'string')
      throw new Error('Selected user must be defined');
    this._patternAuthorSelection$.next(username);
  }

  getSelectedAuthor(): string {
    return this._patternAuthorSelection$.getValue();
  }

  get loadPatternInNewTabRequested$(): rxjs.Observable<string> {
    return this._loadPatternInNewTabRequested$.asObservable();
  }

  requestLoadPatternInNewTab(patternHash: string) {
    this._loadPatternInNewTabRequested$.next(patternHash);
  }

  updateUrlState(patternHash: string) {
    this._urlStateUpdated$.next(patternHash);
  }

  get urlStateUpdated$(): rxjs.Observable<string> {
    return this._urlStateUpdated$.asObservable();
  }

  get patternHasUnsavedChanges$(): rxjs.Observable<boolean> {
    return this._patternHasUnsavedChanges$.asObservable();
  }

  selectStrandColumn(strand: StrandType, colName: string | null) {
    this._selectedStrandColumn.next({...this._selectedStrandColumn.getValue(), [strand]: colName});
  }

  getSelectedStrandColumn(strand: StrandType): string | null {
    const value = this._selectedStrandColumn.getValue();
    return value ? value[strand] : null;
  }

  selectIdColumn(colName: string) {
    this._selectedIdColumn.next(colName);
  }

  getSelectedIdColumn(): string | null {
    return this._selectedIdColumn.getValue();
  }

  get updateSvgContainer$(): rxjs.Observable<void> {
    return this.patternStateChanged$.pipe(
      debounceTime(100)
    );
  }
}

