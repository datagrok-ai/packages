import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject, of, combineLatest, Observable, defer, Subject, merge, EMPTY} from 'rxjs';
import {switchMap, map, takeUntil, finalize, mapTo, skip, distinctUntilChanged, withLatestFrom, filter, catchError, tap} from 'rxjs/operators';
import {IFuncCallAdapter, IRunnableWrapper, IStateStore} from './FuncCallAdapters';
import {RestrictionType, ValidationResult} from '../data/common-types';
import {FuncCallIODescription} from '../config/config-processing-utils';

export interface RestrictionState {
  type: RestrictionType,
  assignedValue: any,
}

export interface IRestrictionStore {
  setRestriction<T = any>(name: string, value: T | undefined, restrictionType?: RestrictionType): void;
  setToConsistent(name: string): void;
  removeRestriction(name: string): void;
}

export interface BridgePreInitData {
  initialValues: Record<string, any>,
  initialRestrictions: Record<string, RestrictionState | undefined>,
}

export interface BridgeInitData {
  adapter: IFuncCallAdapter,
  restrictions: Record<string, RestrictionState | undefined>,
  runError?: string,
  isOutputOutdated: boolean,
  initValues: boolean,
}

interface InstanceData {
  adapter: IFuncCallAdapter,
  isNew: boolean
}

export class FuncCallInstancesBridge implements IStateStore, IRestrictionStore, IRunnableWrapper {
  public instance$ = new BehaviorSubject<InstanceData | undefined>(undefined);

  public isRunning$ = new BehaviorSubject(false);
  public isRunable$ = new BehaviorSubject(false);
  public isOutputOutdated$ = new BehaviorSubject(true);
  public runError$ = new BehaviorSubject<string | undefined>(undefined);

  public validations$ = new BehaviorSubject<Record<string, Record<string, ValidationResult | undefined>>>({});
  public meta$ = new BehaviorSubject<Record<string, BehaviorSubject<any | undefined>>>({});

  public inputRestrictions$ = new BehaviorSubject<Record<string, RestrictionState | undefined>>({});
  public inputRestrictionsUpdates$ = new Subject<[string, RestrictionState | undefined]>();

  public initialValues: Record<string, any> = {};

  public outdatedChanged$ = new BehaviorSubject(true);
  private closed$ = new Subject<true>();
  private initialData?: BridgePreInitData;

  constructor(private io: FuncCallIODescription[], public readonly isReadonly: boolean) {}

  get id() {
    return this.instance$.value?.adapter?.id;
  }

  setPreInitialData(data: BridgePreInitData) {
    this.initialData = data;
    this.initialValues = data.initialValues;
    this.inputRestrictions$.next(data.initialRestrictions);
  }

  init(data: BridgeInitData) {
    if (this.instance$.value)
      throw new Error(`Double funcCall bridge instance init`);
    if (data.initValues) {
      for (const [key, val] of Object.entries(this.initialValues)) {
        if (data.restrictions[key]?.assignedValue == null)
          data.adapter.setState(key, val);
      }
      for (const [key, val] of Object.entries(data.restrictions)) {
        if (val?.assignedValue != null)
          data.adapter.setState(key, val.assignedValue);
      }
    }
    this.inputRestrictions$.next({...this.inputRestrictions$.value, ...data.restrictions});
    this.instance$.next({adapter: data.adapter, isNew: true});
    this.runError$.next(data.runError);
    this.outdatedChanged$.next(data.isOutputOutdated);

    this.setupStateWatcher();
  }

  change(adapter: IFuncCallAdapter, isNew = false) {
    this.instance$.next({adapter, isNew});
  }

  getInstance() {
    return this.instance$.value?.adapter;
  }

  getState<T = any>(id: string): T | undefined {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance)
      return currentInstance.getState<T>(id);
  }

  getStateChanges<T = any>(id: string, includeDataFrameMutations = false): Observable<T | undefined> {
    return this.instance$.pipe(
      switchMap((data, idx) => {
        if (data) {
          const changes$ = data.adapter.getStateChanges(id, includeDataFrameMutations);
          if (!data.isNew && idx > 0)
            return changes$.pipe(skip(1));
          return changes$;
        }
        return of(undefined);
      }),
    );
  }

  setState<T = any>(id: string, val: T | undefined, restrictionType: RestrictionType = 'restricted') {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance == null)
      throw new Error(`Attempting to set an empty FuncCallInstancesBridge`);
    const assignedValue = val instanceof DG.DataFrame ? val.clone() : val;
    const restrictionPayload = restrictionType === 'none' ? undefined : {assignedValue, type: restrictionType};
    this.inputRestrictions$.next({
      ...this.inputRestrictions$.value,
      [id]: restrictionPayload,
    });
    if (!this.isReadonly)
      currentInstance.setState(id, val, restrictionType);
    else
      this.inputRestrictionsUpdates$.next([id, restrictionPayload] as const);
  }

  editState<T = any>(id: string, val: T | undefined) {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance == null)
      throw new Error(`Attempting to set an empty FuncCallInstancesBridge`);
    currentInstance.editState(id, val);
  }

  removeRestriction(id: string): void {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance == null)
      throw new Error(`Attempting to set an empty FuncCallInstancesBridge`);
    const currentRestriction = this.inputRestrictions$.value?.[id];
    if (currentRestriction == null)
      return;
    const defaultRestriction = this.initialData?.initialRestrictions[id];
    this.inputRestrictions$.next({
      ...this.inputRestrictions$.value,
      [id]: defaultRestriction,
    });
    this.inputRestrictionsUpdates$.next([id, defaultRestriction] as const);
  }

  setRestriction<T = any>(id: string, val: T | undefined, restrictionType: RestrictionType = 'none') {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance == null)
      throw new Error(`Attempting to set restriction on an empty FuncCallInstancesBridge`);
    const assignedValue = val instanceof DG.DataFrame ? val.clone() : val;
    const restrictionPayload = restrictionType === 'none' ? undefined : {assignedValue, type: restrictionType};
    this.inputRestrictions$.next({
      ...this.inputRestrictions$.value,
      [id]: restrictionPayload,
    });
    this.inputRestrictionsUpdates$.next([id, restrictionPayload] as const);
  }

  setToConsistent(id: string) {
    const currentInstance = this.instance$.value?.adapter;
    if (currentInstance == null)
      throw new Error(`Attempting to set an empty FuncCallInstancesBridge`);
    const currentRestriction = this.inputRestrictions$.value?.[id];
    if (!this.isReadonly && currentRestriction) {
      const consistentVal = currentRestriction.assignedValue instanceof DG.DataFrame ?
        currentRestriction.assignedValue.clone() :
        currentRestriction.assignedValue;
      currentInstance.setState(id, consistentVal, currentRestriction.type);
    }
  }

  setValidation(id: string, validatorId: string, validation: ValidationResult | undefined) {
    const allValidations = this.validations$.value;
    const validatorResults = allValidations[validatorId] ?? {};
    this.validations$.next({
      ...allValidations,
      [validatorId]: {...validatorResults, [id]: validation},
    });
  }

  setMeta(id: string, meta: any | undefined) {
    const allMeta = this.meta$.value;
    allMeta[id].next(meta);
  }

  run(mockResults?: Record<string, any>, mockDelay?: number) {
    return defer(() => {
      const currentInstance = this.instance$.value?.adapter;
      if (!currentInstance)
        throw new Error(`Attempting to run an empty FuncCallInstancesBridge`);
      if (this.isRunning$.value)
        throw new Error(`Attempting to run a running FuncCallInstancesBridge`);
      if (!this.isRunable$.value)
        throw new Error(`Attempting to run FuncCallInstancesBridge with validation errors`);
      this.isRunning$.next(true);
      return currentInstance.run(mockResults, mockDelay).pipe(
        tap(() => {
          if (this.runError$.value)
            this.runError$.next(undefined);
          this.outdatedChanged$.next(false);
        }),
        catchError((e) => {
          this.runError$.next(String(e));
          this.outdatedChanged$.next(true);
          console.error(e);
          grok.shell.error(e);
          return EMPTY;
        }),
        finalize(() => {
          this.isRunning$.next(false);
        }),
      );
    });
  }

  overrideToConsistent() {
    return defer(() => {
      for (const [name, restriction] of Object.entries(this.inputRestrictions$.value ?? {})) {
        if (restriction && (restriction.type === 'restricted' || restriction.type === 'disabled') )
          this.setState(name, restriction.assignedValue, restriction.type);
      }
      return of(undefined);
    });
  }

  public getIOEditsFlag(filteredInputs?: FuncCallIODescription[]) {
    const inputs = filteredInputs ?? this.io;
    const inputsChanges = inputs.map(
      (item) => this.getStateChanges(item.id, true).pipe(skip(1)));
    return merge(...inputsChanges).pipe(
      mapTo(true),
      takeUntil(this.closed$),
    );
  }

  getStateNames() {
    return this.io.map((item) => item.id);
  }

  close() {
    this.closed$.next(true);
  }

  private setupStateWatcher() {
    this.instance$.pipe(
      switchMap((instance) => {
        if (instance == null)
          return of(false);
        return combineLatest([
          this.isRunning$,
          this.validations$.pipe(map((validations) => this.isRunnable(validations))),
        ]).pipe(map(([isRunning, isValid]) => !isRunning && isValid));
      }),
      distinctUntilChanged(),
      takeUntil(this.closed$),
    ).subscribe(this.isRunable$);

    const inputs = this.io.filter((item) => item.direction === 'input');
    (this.getIOEditsFlag(inputs)).subscribe(this.outdatedChanged$);

    this.outdatedChanged$.pipe(
      withLatestFrom(this.isOutputOutdated$),
      filter(([next, current]) => next !== current),
      map(([next]) => next),
      takeUntil(this.closed$),
    ).subscribe(this.isOutputOutdated$);

    this.instance$.pipe(
      map((instance) => {
        if (instance == null)
          return {};
        const res: Record<string, BehaviorSubject<any | undefined>> = {};
        for (const item of this.io)
          res[item.id] = new BehaviorSubject<any>(undefined);

        return res;
      }),
      takeUntil(this.closed$),
    ).subscribe(this.meta$);
  }

  private isRunnable(
    validations: Record<string, Record<string, ValidationResult | undefined>>,
  ) {
    for (const validatorResults of Object.values(validations)) {
      for (const res of Object.values(validatorResults)) {
        if (res?.errors?.length)
          return false;
      }
    }
    return true;
  }
}
