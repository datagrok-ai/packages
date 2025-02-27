import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject, Observable, Subject, EMPTY, of, from, combineLatest} from 'rxjs';
import {isFuncCallSerializedState, PipelineState} from './config/PipelineInstance';
import {AddDynamicItem, InitPipeline, LoadDynamicItem, LoadPipeline, MoveDynamicItem, RemoveDynamicItem, ResetToConsistent, RunAction, RunSequence, RunStep, SaveDynamicItem, SavePipeline, UpdateFuncCall, ViewConfigCommands} from './view/ViewCommunication';
import {pairwise, takeUntil, concatMap, catchError, switchMap, map, mapTo, startWith, withLatestFrom, tap, distinctUntilChanged, filter} from 'rxjs/operators';
import {StateTree} from './runtime/StateTree';
import {loadInstanceState} from './runtime/funccall-utils';
import {callHandler} from './utils';
import {PipelineConfiguration} from './config/PipelineConfiguration';
import {getProcessedConfig, PipelineConfigurationProcessed} from './config/config-processing-utils';
import {ConsistencyInfo, FuncCallStateInfo, MetaCallInfo} from './runtime/StateTreeNodes';
import {ValidationResult} from './data/common-types';
import {DriverLogger} from './data/Logger';
import {LinksData} from './runtime/LinksState';

export class Driver {
  public currentMetaCallData$ = new BehaviorSubject<MetaCallInfo>({});
  public hasNotSavedEdits$ = new BehaviorSubject<boolean>(false);
  public currentState$ = new BehaviorSubject<PipelineState | undefined>(undefined);
  public currentCallsState$ = new BehaviorSubject<Record<string, BehaviorSubject<FuncCallStateInfo | undefined>>>({});
  public currentValidations$ = new BehaviorSubject<Record<string, BehaviorSubject<Record<string, ValidationResult>>>>({});
  public currentConsistency$ = new BehaviorSubject<Record<string, BehaviorSubject<Record<string, ConsistencyInfo>>>>({});
  public currentMeta$ = new BehaviorSubject<Record<string, BehaviorSubject<Record<string, BehaviorSubject<any>>>>>({});
  public currentConfig$ = new BehaviorSubject<PipelineConfigurationProcessed | undefined>(undefined);
  public nodesDescriptions$ = new BehaviorSubject<Record<string, Observable<Record<string, string | string[]> | undefined>>>({});
  public currentLinks$ = new BehaviorSubject<LinksData[]>([]);

  public globalROLocked$ = new BehaviorSubject(false);
  public treeMutationsLocked$ = new BehaviorSubject(false);

  private states$ = new BehaviorSubject<StateTree | undefined>(undefined);
  private commands$ = new Subject<ViewConfigCommands>();
  private closed$ = new Subject<true>();
  private wasEdited$ = new BehaviorSubject<boolean>(false);

  public logger = new DriverLogger();

  constructor(private mockMode = false) {
    this.commands$.pipe(
      withLatestFrom(this.states$),
      concatMap(([msg, state]) => this.executeCommand(msg, state)),
      catchError((error) => {
        console.error(error);
        grok.shell.error(error?.message);
        return EMPTY;
      }),
      takeUntil(this.closed$),
    ).subscribe();

    this.states$.pipe(
      pairwise(),
      takeUntil(this.closed$),
    ).subscribe(([oldval]) => {
      if (oldval)
        oldval.close();
    });

    const stateUpdates$ = this.states$.pipe(
      switchMap((state) => state ?
        state.makeStateRequests$.pipe(startWith(null), mapTo(state)) :
        of(undefined)));

    stateUpdates$.pipe(
      switchMap((state) => state ? state.getIOMutations() : EMPTY),
      takeUntil(this.closed$),
    ).subscribe(() => this.wasEdited$.next(true));

    combineLatest([this.globalROLocked$, this.treeMutationsLocked$, this.wasEdited$]).pipe(
      filter(([roLock, mutationLock]) => !roLock && !mutationLock),
      map(([, , wasEdited]) => wasEdited),
    ).subscribe(this.hasNotSavedEdits$);

    stateUpdates$.pipe(
      map((state) => state ? state.toState() : undefined),
      takeUntil(this.closed$),
    ).subscribe(this.currentState$);

    stateUpdates$.pipe(
      map((state) => state ? state.getConsistency() : {}),
      takeUntil(this.closed$),
    ).subscribe(this.currentConsistency$);

    stateUpdates$.pipe(
      map((state) => state ? state.getMeta() : {}),
      takeUntil(this.closed$),
    ).subscribe(this.currentMeta$);

    stateUpdates$.pipe(
      map((state) => state ? state.getValidations() : {}),
      takeUntil(this.closed$),
    ).subscribe(this.currentValidations$);

    stateUpdates$.pipe(
      map((state) => state ? state.getFuncCallStates() : {}),
      takeUntil(this.closed$),
    ).subscribe(this.currentCallsState$);

    stateUpdates$.pipe(
      map((state) => state ? state.linksState.getLinksInfo() : []),
      takeUntil(this.closed$),
    ).subscribe(this.currentLinks$);

    stateUpdates$.pipe(
      map((state) => state ? state.getNodesDescriptions() : {}),
      takeUntil(this.closed$),
    ).subscribe(this.nodesDescriptions$);

    stateUpdates$.pipe(
      map((state) => state ? state.config : undefined),
      takeUntil(this.closed$),
    ).subscribe(this.currentConfig$);

    stateUpdates$.pipe(
      switchMap((state) => state ? state.globalROLocked$ : of(false)),
      distinctUntilChanged(),
      takeUntil(this.closed$),
    ).subscribe(this.globalROLocked$);

    stateUpdates$.pipe(
      switchMap((state) => state ? state.treeMutationsLocked$ : of(false)),
      distinctUntilChanged(),
      takeUntil(this.closed$),
    ).subscribe(this.treeMutationsLocked$);
  }

  public sendCommand(msg: ViewConfigCommands) {
    this.commands$.next(msg);
  }

  public close() {
    this.closed$.next(true);
    this.states$.value?.close();
    this.currentState$.next(undefined);
  }

  private executeCommand(msg: ViewConfigCommands, state?: StateTree): Observable<any> {
    switch (msg.event) {
    case 'addDynamicItem':
      return this.addDynamicItem(msg, state);
    case 'loadDynamicItem':
      return this.loadDynamicItem(msg, state);
    case 'saveDynamicItem':
      return this.saveDynamicItem(msg, state);
    case 'removeDynamicItem':
      return this.removeDynamicItem(msg, state);
    case 'moveDynamicItem':
      return this.moveDynamicItem(msg, state);
    case 'runStep':
      return this.runStep(msg, state);
    case 'runAction':
      return this.runAction(msg, state);
    case 'runSequence':
      return this.runSequence(msg, state);
    case 'savePipeline':
      return this.savePipeline(msg, state);
    case 'resetToConsistent':
      return this.resetToConsistent(msg, state);
    case 'loadPipeline':
      return this.loadPipeline(msg);
    case 'initPipeline':
      return this.initPipeline(msg);
    case 'updateFuncCall':
      return this.updateFuncCall(msg, state);
    }
    throw new Error(`Unknow tree driver command ${(msg as any).event}`);
  }

  private addDynamicItem(msg: AddDynamicItem, state?: StateTree) {
    this.checkState(msg, state);
    return state.addSubTree(msg.parentUuid, msg.itemId, msg.position).pipe(
      tap(() => this.wasEdited$.next(true)),
    );
  }

  private loadDynamicItem(msg: LoadDynamicItem, state?: StateTree) {
    this.checkState(msg, state);
    return state.loadSubTree(msg.parentUuid, msg.dbId, msg.itemId, msg.position, !!msg.readonly, !!msg.isReplace).pipe(
      tap(() => this.wasEdited$.next(true)),
    );
  }

  private saveDynamicItem(msg: SaveDynamicItem, state?: StateTree) {
    this.checkState(msg, state);
    const {title, description, tags} = msg;
    return state.save(msg.uuid, {title, description, tags});
  }

  private removeDynamicItem(msg: RemoveDynamicItem, state?: StateTree) {
    this.checkState(msg, state);
    return state.removeSubtree(msg.uuid).pipe(
      tap(() => this.wasEdited$.next(true)),
    );
  }

  private moveDynamicItem(msg: MoveDynamicItem, state?: StateTree) {
    this.checkState(msg, state);
    return state.moveSubtree(msg.uuid, msg.position).pipe(
      tap(() => this.wasEdited$.next(true)),
    );
  }

  private runStep(msg: RunStep, state?: StateTree) {
    this.checkState(msg, state);
    return state.runStep(msg.uuid, msg.mockResults, msg.mockDelay);
  }

  private runAction(msg: RunAction, state?: StateTree) {
    this.checkState(msg, state);
    return state.runAction(msg.uuid, msg.additionalParams);
  }

  private runSequence(msg: RunSequence, state?: StateTree) {
    this.checkState(msg, state);
    return state.runSequence(msg.startUuid, msg.rerunWithConsistent, msg.includeNonNested);
  }

  private resetToConsistent(msg: ResetToConsistent, state?: StateTree) {
    this.checkState(msg, state);
    return state.resetToConsistent(msg.stepUuid, msg.ioName);
  }

  private savePipeline(msg: SavePipeline, state?: StateTree) {
    this.checkState(msg, state);
    const {title, description, isFavorite, tags} = msg;
    return state.save(undefined, {title, description, isFavorite, tags}).pipe(
      tap((call) => this.currentMetaCallData$.next({
        id: call?.id,
        title: call?.options.title,
        isFavorite,
        description: call?.options.description,
        tags: call?.options.tags,
      })),
      tap(() => this.wasEdited$.next(false)),
    );
  }

  private loadPipeline(msg: LoadPipeline) {
    return from(loadInstanceState(msg.funcCallId)).pipe(
      concatMap(([stateLoaded, metaCall, isFavorite]) => {
        if (isFuncCallSerializedState(stateLoaded))
          throw new Error(`Wrong pipeline config in wrapper FuncCall ${msg.funcCallId}`);
        if (!stateLoaded.provider)
          throw new Error(`Pipeline config in wrapper FuncCall ${msg.funcCallId} missing provider`);
        if (msg.config)
          return of([stateLoaded, msg.config] as const);
        return callHandler<PipelineConfiguration>(stateLoaded.provider, {version: stateLoaded.version}).pipe(
          concatMap((conf) => from(getProcessedConfig(conf))),
          map((config) => [stateLoaded, config, metaCall, isFavorite] as const),
        );
      }),
      map(([state, config, metaCall, isFavorite]) =>
        [StateTree.fromInstanceState({
          state,
          config,
          isReadonly: !!msg.readonly,
          defaultValidators: true,
          mockMode: this.mockMode,
          logger: this.logger,
        }), metaCall, isFavorite] as const),
      concatMap(([state, metaCall, isFavorite]) => state.init().pipe(mapTo([state, metaCall, isFavorite] as const))),
      tap(([state, metaCall, isFavorite]) => {
        this.states$.next(state);
        this.currentMetaCallData$.next({
          id: metaCall?.id,
          title: metaCall?.options.title,
          description: metaCall?.options.description,
          isFavorite,
          tags: metaCall?.options.tags,
        });
        this.wasEdited$.next(false);
      }),
    );
  }

  private initPipeline(msg: InitPipeline) {
    return callHandler<PipelineConfiguration>(msg.provider, {version: msg.version}).pipe(
      concatMap((conf) => from(getProcessedConfig(conf))),
      map((config) => StateTree.fromPipelineConfig({
        config,
        isReadonly: false,
        defaultValidators: true,
        mockMode: this.mockMode,
        logger: this.logger,
      })),
      concatMap((state) => state.init()),
      tap((state) => {
        this.states$.next(state);
        this.currentMetaCallData$.next({});
        this.wasEdited$.next(true);
      }),
    );
  }

  private updateFuncCall(msg: UpdateFuncCall, state?: StateTree) {
    this.checkState(msg, state);
    return state.updateFuncCall(msg.stepUuid, msg.funcCall);
  }

  private checkState(msg: ViewConfigCommands, state?: StateTree): asserts state is StateTree {
    if (!state)
      throw new Error(`Command ${msg.event} requires state tree`);
  }
}
