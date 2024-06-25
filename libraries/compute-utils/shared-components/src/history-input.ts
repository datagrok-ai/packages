/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject, EMPTY, Observable, Subject, from} from 'rxjs';
import {catchError, filter, finalize, shareReplay, switchMap, take, tap} from 'rxjs/operators';
import $ from 'cash-dom';
import {historyUtils} from '../../history-utils';
import '../css/history-input.css';
import {HistoricalRunsList} from './history-list';
import {extractStringValue, getMainParams, isIncomplete} from '../../shared-utils/utils';
import {getStarted} from '../../function-views/src/shared/utils';

class DatabaseService {
  static getHistoryRuns(funcName: string): Observable<DG.FuncCall[]> {
    return from((async () => {
      const res = await historyUtils.pullRunsByName(
        funcName, [
          {author: grok.shell.user},
          // EXPLAIN WHY FUNC.PARAMS
        ],
        {order: 'started'},
        ['func.params', 'session.user', 'options'],
        true,
      );
      return res;
    })());
  }
}

export const PICK_COLUMN_NAME = 'Pick' as const;
export const ID_COLUMN_NAME = 'ID' as const;

export abstract class HistoryInputBase<T = DG.FuncCall> extends DG.InputBase<T | null> {
  /**
   * Emitted when parictular historical run is chosen
   * @deprecated. Use {@link onInput} or {@link onChanged} instead
   * */
  public onHistoricalRunChosen = new BehaviorSubject<DG.FuncCall | null>(null);

  // Toggle to force historical runs udpate
  public experimentRunsUpdate = new Subject<boolean>();

  private store = {
    experimentRuns: new Observable<DG.FuncCall[]>(),
    isExperimentRunsLoading: new Subject<boolean>(),
    experimentRunData: new BehaviorSubject<string>(''),
  };
  private _historyList = new HistoricalRunsList([],
    {
      fallbackText: 'No runs are found in history',
      showActions: false,
      showBatchActions: false,
      isHistory: false,
      visibleProps: this.options?.mainProps,
      propFuncs: this.options?.propFuncs,
    });
  private _historyDialog = this.getHistoryDialog();

  private _visibleInput = ui.input.string(this.label, {value: ''});
  private _visibleIcon = ui.iconFA('search', () => this.showSelectionDialog());
  private _chosenRun: DG.FuncCall | null = null;
  private _chosenRunId: string | null = null;

  constructor(
    // Label placed before next to the input
    private label: string,
    // Function to look history for
    private _funcName: string,
    private options?: {
      // FuncCall props (inputs, outputs, options) to be visible. By default, all input params will be visible.
      // You may add outputs and/or options.
      mainProps?: string[],
      // Custom mapping between prop name and it's extraction logic
      propFuncs?: Record<string, (currentRun: DG.FuncCall) => string>,
      // Custom logic for input's stringValue. By default, mainParams will be used to generate string value
      stringValueFunc?: (currentRun: DG.FuncCall) => string,
    },
  ) {
    const primaryInput = ui.input.string(label, {value: ''});
    super(primaryInput.dart);

    this._visibleInput = primaryInput;
    this._visibleInput.readOnly = true;
    this._visibleInput.input.addEventListener('click', () => this.showSelectionDialog());
    this._visibleInput.addOptions(this._visibleIcon);

    this.store.experimentRuns = this.experimentRunsUpdate.pipe(
      tap(() => this.toggleLoaderExpRuns(true)),
      switchMap(() => DatabaseService.getHistoryRuns(this._funcName).pipe(
        catchError((e) => {
          console.error(e);
          return EMPTY;
        }),
        finalize(() => this.toggleLoaderExpRuns(false)),
      )),
      shareReplay(1),
    );

    this.store.experimentRuns.subscribe((newRuns) => {
      this._historyList.updateRuns(newRuns.filter((run) => !isIncomplete(run)));
    });

    this.store.isExperimentRunsLoading.subscribe((newValue) => {
      ui.setUpdateIndicator(this._visibleInput.root, newValue);
      ui.setUpdateIndicator(this._historyList.root, newValue);
    });

    this.experimentRunsUpdate.next();
  }

  private setCurrentRow() {
    if (this.getValue())
      this._historyList.chosen = this.getValue();
    else if (this.chosenRunId)
      this._historyList.chosenById = this.chosenRunId;
  }

  public showSelectionDialog() {
    // Not a bug: Closing the dialog kills all the viewers inside of the dialog.
    // So we should re-render all viewers inside of the dialog.
    this.renderGridAndFilters();

    (this._historyDialog.getButton('OK') as HTMLButtonElement).disabled = (this._historyList.selected.size !== 1);

    this._historyDialog.show({
      modal: true,
      fullScreen: true,
      center: true,
      width: window.innerWidth - 50,
      height: window.innerHeight - 50,
    });
  }

  public renderGridAndFilters() {
    const newHistoryList = new HistoricalRunsList(
      [...this._historyList.runs.values()], {
        ...this.options,
        visibleProps: this.options?.mainProps,
        propFuncs: this.options?.propFuncs,
      });
    this._historyList.root.replaceWith(newHistoryList.root);
    this._historyList = newHistoryList;

    this._historyList.onChosen.subscribe((chosen) => {
      (this._historyDialog.getButton('OK') as HTMLButtonElement).disabled = !chosen;
    });

    this._historyList.onRunsDfChanged.pipe(filter((newDf) => newDf.rowCount > 0), take(1)).subscribe((newDf) => {
      this.setCurrentRow();
    });
  }

  private getHistoryDialog() {
    const historyDialog = ui.dialog();
    $(historyDialog.root.querySelector('.d4-dialog-contents')).removeClass('ui-form');

    historyDialog.onOK(async () => {
      const chosen = this._historyList.chosen;
      if (chosen) {
        // If DFs loading was skipped when the list was loaded, then we should load it now
        this.setValue(chosen);
      }

      this.fireInput();
    });
    historyDialog.addButton('Refresh', () => {
      this.experimentRunsUpdate.next();
    }, 2, 'Reload list of runs');
    historyDialog.addButton('Discard', () => {
      this.setValue(null);
      this.fireInput();

      historyDialog.close();
    }, 1, 'Discard the previous choice');
    $(historyDialog.getButton('CANCEL')).hide();

    historyDialog.add(this._historyList.root);

    return historyDialog;
  }

  protected setValue(val: DG.FuncCall | null) {
    this._chosenRun = val;
    this._chosenRunId = this._chosenRun?.id ?? null;
    this.onHistoricalRunChosen.next(val);
    if (val) {
      this.stringValue = this.options?.stringValueFunc ?
        this.options?.stringValueFunc(val):
        [
          `${getStarted(val)} \\ ${val.author.name}`,
          (this.options?.mainProps ?? getMainParams(val.func) ?? [])
            .map((param) => extractStringValue(val, param)).join(' \\ '),
        ].join(' \\ ');
    } else
      this.stringValue = 'No run chosen';

    if (!this.notify) return;

    this.fireChanged();
  }

  protected getValue() {
    return this._chosenRun;
  }

  get chosenRun() {
    return this._chosenRun;
  }

  get chosenRunId() {
    return this._chosenRunId;
  }

  set chosenRunId(id: string | null) {
    this._chosenRunId = id;
  }

  // HTML root of component
  get root() {
    return this._visibleInput.root;
  }

  set stringValue(val: string) {
    this._visibleInput.value = val;
    this._visibleInput.setTooltip(this._visibleInput.value);
  }

  get stringValue() {
    return this._visibleInput.value;
  }

  get iconRoot() {
    return this._visibleIcon;
  }

  public toggleLoaderExpRuns(newState: boolean) {
    this.store.isExperimentRunsLoading.next(newState);
  }
}

export class HistoryInput extends HistoryInputBase {
  set value(val: DG.FuncCall | null) {
    this.setValue(val);
  }

  get value() {
    return this.getValue();
  }
}

export class HistoryInputJSON extends HistoryInputBase<string | null> {
  get value() {
    const funccall = this.getValue();
    if (funccall) {
      return JSON.stringify({
        visualValue: this.stringValue,
        // BUG HERE: if GUID is present in the string, DB fails to save it
        id: funccall.id.split('-'),
      });
    } else
      return null;
  }

  set value(jsonVal: string | null) {
    this.setValue(null);
    this.stringValue = jsonVal ? JSON.parse(jsonVal).visualValue: 'No run is chosen';
    // Recovering initial GUID here
    this.chosenRunId = jsonVal ? JSON.parse(jsonVal).id.join('-'): '';
  }
}
