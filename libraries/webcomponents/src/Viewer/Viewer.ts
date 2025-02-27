/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Subject, BehaviorSubject, from, merge, of, combineLatest, Observable, identity, EMPTY} from 'rxjs';
import {
  distinctUntilChanged, filter, switchMap, takeUntil, withLatestFrom, map,
} from 'rxjs/operators';

export class Viewer<T = any> extends HTMLElement {
  private dfSetted$ = new BehaviorSubject<DG.DataFrame | undefined>(undefined);
  private typeSetted$ = new BehaviorSubject<string | undefined>(undefined);
  private _options: Record<string, string | boolean> = {};

  private viewer$ = new BehaviorSubject<DG.Viewer<T> | undefined>(undefined);

  // TODO
  private destroyed$ = new Subject<boolean>();

  constructor() {
    super();

    const latestViewer$ = this.viewer$.pipe(distinctUntilChanged());

    const latestType$ = merge(
      latestViewer$.pipe(map((viewer) => viewer?.type)),
      this.typeSetted$,
    ).pipe(distinctUntilChanged());

    const latestDf$ = merge(
      latestViewer$.pipe(map((viewer) => viewer?.dataFrame)),
      this.getViewerEventObservable('d4-data-frame-changed').pipe(map((ev) => ev.data.args.newValue as DG.DataFrame)),
      this.dfSetted$,
    ).pipe(distinctUntilChanged());

    const latestParams$ = combineLatest([
      latestType$,
      latestDf$,
    ] as const);

    latestParams$.pipe(
      takeUntil(this.destroyed$),
    ).subscribe(([type, df]) => {
      if (type !== this.typeSetted$.value)
        this.dispatchEvent(new CustomEvent('viewer-type-changed', {detail: type}));
      if (df !== this.dfSetted$.value)
        this.dispatchEvent(new CustomEvent('viewer-data-frame-changed', {detail: type}));
    });

    const settedParams$ = combineLatest([
      this.typeSetted$,
      this.dfSetted$,
    ] as const);

    settedParams$.pipe(
      switchMap(([type, df]) => {
        if (type && df) {
          if (this.viewer?.type !== type || !this.viewer)
            return from(this.createViewer(type, df));
          else
            return EMPTY;
        } else
          return of(undefined);
      }),
      takeUntil(this.destroyed$),
    ).subscribe((viewer) => {
      this.changeAttachedViewer(viewer as DG.Viewer<T>);
    });

    this.dfSetted$.pipe(
      withLatestFrom(this.viewer$),
      takeUntil(this.destroyed$),
    ).subscribe(([df, viewer]) => {
      if (viewer && df && viewer.dataFrame !== df)
        viewer.dataFrame = df;
    });

    this.viewer$.pipe(
      distinctUntilChanged(),
      takeUntil(this.destroyed$),
    ).subscribe((viewer) => {
      this.dispatchEvent(new CustomEvent('viewer-changed', {detail: viewer}));
    });
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  get viewer() {
    return this.viewer$.value;
  }

  get dataFrame() {
    return this.viewer$.value?.dataFrame ?? this.dfSetted$.value;
  }

  set dataFrame(df: DG.DataFrame | undefined) {
    this.dfSetted$.next(df);
  }

  get type() {
    return this.viewer$.value?.type ?? this.typeSetted$.value;
  }

  set type(type: string | undefined) {
    this.typeSetted$.next(type);
  }

  set options(options: Record<string, string | boolean>) {
    this._options = options;
    this.viewer?.setOptions(options);
  }

  public getViewerEventObservable<P = any>(eventType?: string): Observable<P> {
    return this.viewer$.pipe(
      switchMap((viewer) => viewer ? viewer.onEvent().pipe(
        eventType ? filter((ev) => ev.type === eventType) : identity,
      ) : of()),
      filter((x) => x),
    );
  }

  private async createViewer(type: string, df: DG.DataFrame) {
    const viewer = await df.plot.fromType(type) as DG.Viewer<T>;
    viewer.setOptions(this._options);
    return viewer;
  }

  private changeAttachedViewer(viewer?: DG.Viewer<T>) {
    ui.empty(this);
    this.viewer$.next(viewer);
    if (viewer)
      this.appendChild(viewer.root);
  }
}

export interface ViewerT extends Viewer {};
