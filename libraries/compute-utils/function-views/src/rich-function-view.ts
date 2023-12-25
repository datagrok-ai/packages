/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import wu from 'wu';
import $ from 'cash-dom';
import {Subject, BehaviorSubject, Observable, merge, from, of, combineLatest} from 'rxjs';
import {debounceTime, delay, filter, groupBy, map, mapTo, mergeMap, skip, startWith, switchMap, tap} from 'rxjs/operators';
import {UiUtils} from '../../shared-components';
import {Validator, ValidationResult, nonNullValidator, isValidationPassed, getErrorMessage, makePendingValidationResult, mergeValidationResults} from '../../shared-utils/validation';
import {getFuncRunLabel, boundImportFunction, getPropViewers, injectLockStates, inputBaseAdditionalRenderHandler, injectInputBaseValidation, dfToSheet, plotToSheet, scalarsToSheet, isInputBase} from '../../shared-utils/utils';
import {EDIT_STATE_PATH, EXPERIMENTAL_TAG, INPUT_STATE, RESTRICTED_PATH, viewerTypesMapping} from '../../shared-utils/consts';
import {FuncCallInput, FuncCallInputValidated, SubscriptionLike, isFuncCallInputValidated, isInputLockable} from '../../shared-utils/input-wrappers';
import '../css/rich-function-view.css';
import {FunctionView} from './function-view';
import {SensitivityAnalysisView as SensitivityAnalysis} from './sensitivity-analysis-view';
import {HistoryInputBase} from '../../shared-components/src/history-input';

const FILE_INPUT_TYPE = 'file';
const VALIDATION_DEBOUNCE_TIME = 250;
const RUN_WAIT_TIME = 500;

export type InputVariants = DG.InputBase | FuncCallInput;

function getObservable<T>(onInput: (f: Function) => SubscriptionLike): Observable<T> {
  return new Observable((observer: any) => {
    const sub = onInput((val: T) => {
      observer.next(val);
    });
    return () => sub.unsubscribe();
  });
}

export interface AfterInputRenderPayload {
  prop: DG.Property;
  input: InputVariants;
}

export interface AfterOutputRenderPayload {
  prop: DG.Property;
  output: DG.Viewer;
}

enum SYNC_FIELD {
  INPUTS = 'inputs',
  OUTPUTS = 'outputs'
}

type SyncFields = SYNC_FIELD.INPUTS | SYNC_FIELD.OUTPUTS;
const syncParams = {
  [SYNC_FIELD.INPUTS]: 'inputParams',
  [SYNC_FIELD.OUTPUTS]: 'outputParams',
} as const;

interface ValidationRequestPayload {
  field?: string,
  isRevalidation: boolean,
  isNewOutput?: boolean,
  context?: any,
}

/**
 * Class for handling Compute models (see https://github.com/datagrok-ai/public/blob/master/help/compute/compute.md)
 *
 * It provides the following functionality out-of-the-box, where each section could be customized:
 * - a structured way to represent input and output parameters: {@link parameters}
 * - generic way to generate UI for inputs, outputs, and interactivity (running the model, etc)
 *   - persisting historical results to the db (via {@link parameters})
 * - export (to Excel and PDF): {@link export}
 * - easy loading of historical runs
 * - routing
 * - entering the real, measured (as opposed to predicted) values manually
 * - notifications for changing inputs, completion of computations, etc: {@link onInputChanged}
 * */
export class RichFunctionView extends FunctionView {
  private validationRequests = new Subject<ValidationRequestPayload>();
  private validationUpdates = new Subject<null>();
  private runRequests = new Subject<null>();

  // stores the running state
  private isRunning = new BehaviorSubject(false);

  // stores simulation or upload mode flag
  private isUploadMode = new BehaviorSubject<boolean>(false);

  private inputsOverride: Record<string, FuncCallInput | FuncCallInputValidated> = {};
  private inputsMap: Record<string, FuncCallInput | FuncCallInputValidated> = {};

  // validators
  private validators: Record<string, Validator> = {};
  private validationState: Record<string, ValidationResult | undefined> = {};

  public pendingValidations = this.validationUpdates.pipe(
    startWith(null),
    map(() => this.validationState),
  );

  static fromFuncCall(
    funcCall: DG.FuncCall,
    options: {historyEnabled: boolean, isTabbed: boolean} =
    {historyEnabled: true, isTabbed: false},
  ) {
    return new this(funcCall, options);
  }

  constructor(
    initValue: string | DG.FuncCall,
    public options: {historyEnabled: boolean, isTabbed: boolean} =
    {historyEnabled: true, isTabbed: false},
  ) {
    super(initValue, options);
  }

  protected async onFuncCallReady() {
    await this.loadInputsOverrides();
    await this.loadInputsValidators();
    await super.onFuncCallReady();
    this.basePath = `scripts/${this.funcCall.func.id}/view`;


    const fcReplacedSub = this.funcCallReplaced.subscribe(() => this.validationRequests.next({isRevalidation: false}));
    this.subs.push(fcReplacedSub);

    const validationSub = this.validationRequests.pipe(
      groupBy((payload) => payload.field),
      mergeMap((fieldValidations$) => {
        return fieldValidations$.pipe(
          tap((payload) => this.setValidationPending(payload.field)),
          switchMap((payload) => {
            const controller = new AbortController();
            const signal = controller.signal;
            let done = false;
            const obs$ = new Observable<Record<string, ValidationResult | undefined>>((observer) => {
              const sub = from(this.runValidation({...payload}, signal)).subscribe((val) => {
                done = true;
                observer.next(val);
              });
              return () => {
                if (!done)
                  controller.abort();
                sub.unsubscribe();
              };
            });
            return obs$.pipe(
              tap((results) => {
                this.setValidationResults(results);
                this.runRevalidations(payload, results);
                this.validationUpdates.next(null);
              }),
              mapTo(payload),
            );
          }));
      }),
    ).subscribe((payload) => {
      if (payload.field && this.runningOnInput && this.isRunnable())
        this.doRun();
    });
    this.subs.push(validationSub);

    // waiting for debounce and validation after enter is pressed
    const runSub = combineLatest([
      this.runRequests.pipe(
        switchMap(() => of(false).pipe(
          delay(RUN_WAIT_TIME),
          startWith(true),
        ))),
      this.validationUpdates.pipe(debounceTime(0)),
    ]).pipe(
      filter(([needToRun]) => needToRun && this.isRunnable()),
    ).subscribe(() => this.doRun());
    this.subs.push(runSub);

    // always run validations on start
    const controller = new AbortController();
    const results = await this.runValidation({isRevalidation: false}, controller.signal);
    this.setValidationResults(results);
    this.runRevalidations({isRevalidation: false}, results);
    this.validationUpdates.next(null);

    if (this.runningOnStart && this.isRunnable())
      await this.doRun();
  }

  protected prevOpenedTab = null as DG.TabPane | null;
  /**
   * Saving previously opened tab
   * @param runFunc
   */
  public override onBeforeRun(): Promise<void> {
    if (this.outputsTabsElem.currentPane)
      this.prevOpenedTab = Object.keys(this.categoryToDfParamMap.inputs).includes(this.outputsTabsElem.currentPane.name) ? null: this.outputsTabsElem.currentPane;

    return Promise.resolve();
  }

  /**
   * Showing UI after completion of function call.
   * @param runFunc
   */
  public override onAfterRun(): Promise<void> {
    this.showOutputTabsElem();
    this.outputsTabsElem.panes.forEach((tab) => {
      $(tab.header).show();
    });

    if (this.prevOpenedTab) {
      this.outputsTabsElem.currentPane = this.prevOpenedTab;
      return Promise.resolve();
    }

    const firstOutputTab = this.outputsTabsElem.panes
      .find((tab) => Object.keys(this.categoryToDfParamMap.outputs).includes(tab.name));
    if (firstOutputTab) this.outputsTabsElem.currentPane = firstOutputTab;

    return Promise.resolve();
  }

  // scripting api events
  // regular and experimental inputs
  public beforeInputPropertyRender = new Subject<DG.Property>();
  public afterInputPropertyRender = new Subject<AfterInputRenderPayload>();
  public afterOutputPropertyRender = new Subject<AfterOutputRenderPayload>();
  // output scalars table
  public afterOutputSacalarTableRender = new Subject<HTMLElement>();

  public getRunButton(name = 'Run') {
    const runButton = ui.bigButton(getFuncRunLabel(this.func) ?? name, async () => await this.doRun());
    const validationSub = this.validationUpdates.pipe().subscribe(() => {
      const isValid = this.isRunnable();
      runButton.disabled = !isValid;
    });
    this.subs.push(validationSub);

    return runButton;
  }

  public async loadInputsOverrides() {
    const inputParams = [...this.funcCall.inputParams.values()];
    await Promise.all(inputParams.map(async (param) => {
      if (param.property.options.input) {
        const func: DG.Func = await grok.functions.eval(param.property.options.input);
        const call = func.prepare({params: JSON.parse(param.property.options.inputOptions || '{}')});
        await call.call();
        this.inputsOverride[param.name] = call.outputs.input;
      }
    }));
  }

  public async loadInputsValidators() {
    const inputParams = [...this.funcCall.inputParams.values()];
    await Promise.all(inputParams.map(async (param) => {
      if (param.property.options.validator) {
        const func: DG.Func = await grok.functions.eval(param.property.options.validator);
        const call = func.prepare({params: JSON.parse(param.property.options.validatorOptions || '{}')});
        await call.call();
        this.validators[param.name] = call.outputs.validator;
      }
    }));
  }

  private keepOutput() {
    return this.func?.options['keepOutput'] === 'true';
  }

  private getSaveButton(name = 'Save') {
    const saveButton = ui.bigButton(name, async () => await this.saveExperimentalRun(this.funcCall), 'Save uploaded data');

    const uploadSub = this.isUploadMode.subscribe((newValue) => {
      this.buildRibbonPanels();
      if (this.runningOnInput) return;

      if (newValue)
        $(saveButton).show();
      else
        $(saveButton).hide();
    });
    this.subs.push(uploadSub);

    if (!this.runningOnInput || this.options.isTabbed) $(saveButton).hide();

    return saveButton;
  }

  private getStandardButtons(): HTMLElement[] {
    const runButton = this.getRunButton();
    const runButtonWrapper = ui.div([runButton]);
    ui.tooltip.bind(
      runButtonWrapper,
      () => runButton.disabled ? (this.isRunning.value ? 'Computations are in progress' : this.getValidationMessage()) : '');
    const saveButton = this.getSaveButton();

    if (this.runningOnInput) $(runButtonWrapper).hide();

    return [saveButton, runButtonWrapper];
  }

  /**
   * Override to change additional buttons placed between navigation and run buttons.
   */
  protected additionalBtns = ui.divH([]) as HTMLElement;
  /**
   * Changes additional buttons to provided ones.
   * @param additionalBtns Array of HTML elements to place instead of the existing additional buttons.
   */
  public setAdditionalButtons(additionalBtns: HTMLElement[]) {
    const additionalBtnsContainer = ui.divH(additionalBtns);
    this.additionalBtns.replaceWith(additionalBtnsContainer);
    this.additionalBtns = additionalBtnsContainer;
  }

  /**
   * Override to change navigation buttons placed next to the additional buttons.
   */
  protected navBtns = ui.divH([]) as HTMLElement;
  /**
   * Changes navigation buttons to provided ones.
   * @param navBtns Array of HTML elements to place instead of the existing navigation buttons.
   */
  public setNavigationButtons(navBtns: HTMLElement[]) {
    const navBtnsContainer = ui.divH(navBtns);
    this.navBtns.replaceWith(navBtnsContainer);
    this.navBtns = navBtnsContainer;
  }

  /**
   * RichFunctionView has advanced automatic UI builder. It takes {@link this.funcCall} as a base and constructs flexible view.
   * This view is updated automatically when {@link this.funcCallReplaced} is emitted or any of input/output param changes.
   * @returns HTMLElement attached to the root of the view
   */
  public buildIO(): HTMLElement {
    const {inputBlock, inputForm, outputForm, controlsWrapper} = this.buildInputBlock();
    const inputElements = ([
      ...Array.from(inputForm.childNodes).filter((node) => $(node).css('display') !== 'none'),
      ...this.isUploadMode.value ? [Array.from(outputForm.childNodes)]: [],
    ]);

    ui.tools.handleResize(inputBlock, () => {
      //if (inputElements.some((child) => $(child).width() < 150) ||
      if ($(inputBlock).width() < 350) {
        $(inputForm).addClass('ui-form-condensed');
        $(outputForm).addClass('ui-form-condensed');
        $(controlsWrapper).addClass('ui-form-condensed');
        inputElements.forEach((elem) => $(elem).css('min-width', '100px'));
      } else {
        $(inputForm).removeClass('ui-form-condensed');
        $(outputForm).removeClass('ui-form-condensed');
        $(controlsWrapper).removeClass('ui-form-condensed');
        inputElements.forEach((elem) => $(elem).css('min-width', '100%'));
      }
    });

    const outputBlock = this.buildOutputBlock();
    outputBlock.style.height = '100%';
    outputBlock.style.width = '100%';
    $(this.outputsTabsElem.root).hide();

    if (Object.keys(this.categoryToDfParamMap.inputs).length > 0) {
      this.outputsTabsElem.panes.forEach((tab) => {
        $(tab.header).hide();
      });
    }

    const out = ui.splitH([inputBlock, ui.panel([outputBlock], {style: {'padding-top': '0px'}})], null, true);
    out.style.padding = '0 12px';

    inputBlock.style.maxWidth = '360px';

    return out;
  }

  public buildInputBlock() {
    const inputFormDiv = this.renderInputForm();
    const outputFormDiv = this.renderOutputForm();
    const standardButtons = this.getStandardButtons();

    const controllsDiv = ui.buttonsInput([
      this.navBtns as any,
      ui.divH([
        this.additionalBtns,
        ...standardButtons,
      ], {style: {'gap': '5px'}}),
    ]);
    $(controllsDiv).addClass('rfv-buttons');

    const controlsForm = ui.div(controllsDiv, 'ui-form ui-form-wide');
    $(controlsForm).css({
      'padding-left': '0px',
      'padding-bottom': '0px',
      'padding-right': '6px',
      'max-width': '100%',
      'min-height': '50px',
    });

    const experimentalDataSwitch = ui.switchInput('', this.isUploadMode.value, (v: boolean) => this.isUploadMode.next(v));
    const uploadSub = this.isUploadMode.subscribe((newValue) => {
      experimentalDataSwitch.notify = false;
      experimentalDataSwitch.value = newValue,
      experimentalDataSwitch.notify = true;
      if (newValue)
        $(outputFormDiv).show();
      else
        $(outputFormDiv).hide();
    });
    this.subs.push(uploadSub);

    const form = ui.divV([
      inputFormDiv,
      ...this.hasUploadMode ? [
        ui.divH([ui.h2('Experimental data'), experimentalDataSwitch.root], {style: {'flex-grow': '0'}}),
        outputFormDiv,
      ]: [],
      controlsForm,
    ], 'ui-box rfv-form');

    return {
      inputBlock: form,
      inputForm: inputFormDiv,
      outputForm: outputFormDiv,
      controlsWrapper: controlsForm,
    };
  }

  buildRibbonPanels(): HTMLElement[][] {
    super.buildRibbonPanels();

    const play = ui.iconFA('play', async () => await this.doRun(), 'Run computations');
    play.classList.add('fas');

    const save = ui.iconFA('save', async () => {
      if (this.isUploadMode.value) {
        await this.saveExperimentalRun(this.funcCall);
        return;
      }

      if (this.lastCall)
        await this.saveRun(this.lastCall);
      else
        grok.shell.warning('Function was not called. Call it before saving');
    }, this.isUploadMode.value ? 'Save uploaded data': 'Save the last run');

    const toggleUploadMode = ui.iconFA('arrow-to-top', async () => {
      this.isUploadMode.next(!this.isUploadMode.value);

      if (boundImportFunction(this.func)) {
        const func = await grok.functions.eval(boundImportFunction(this.func)!) as DG.Func;
        func.prepare().edit();
        return;
      }

      toggleUploadMode.classList.toggle('d4-current');
    }, 'Upload experimental data');
    toggleUploadMode.classList.add(
      'd4-toggle-button',
      ...this.isUploadMode.value ? ['d4-current']: [],
    );

    const sensitivityAnalysis = ui.iconFA('analytics', async () => await this.onSALaunch(), 'Run sensitivity analysis');

    const newRibbonPanels = [
      ...this.getRibbonPanels(),
      [
        ...this.runningOnInput || this.options.isTabbed ? []: [play],
        ...((this.hasUploadMode && this.isUploadMode.value) || this.runningOnInput) ? [save] : [],
        ...this.hasUploadMode ? [toggleUploadMode]: [],
        sensitivityAnalysis,
      ],
    ];

    this.setRibbonPanels(newRibbonPanels);
    return newRibbonPanels;
  }

  // Main element of the output block. Stores all the tabs for the output and input
  private outputsTabsElem = ui.tabControl();

  private showOutputTabsElem() {
    $(this.outputsTabsElem.root).show();
    $(this.outputsTabsElem.root).css('display', 'flex');
  }

  public buildOutputBlock(): HTMLElement {
    this.outputsTabsElem.root.style.width = '100%';

    this.tabsLabels.forEach((tabLabel) => {
      const [tabParams, isInputTab] = this.categoryToDfParamMap.outputs[tabLabel] ? [this.categoryToDfParamMap.outputs[tabLabel], false] : [this.categoryToDfParamMap.inputs[tabLabel], true];

      const tabDfProps = tabParams.filter((p) => p.propertyType === DG.TYPE.DATA_FRAME);
      const tabScalarProps = tabParams.filter((p) => p.propertyType !== DG.TYPE.DATA_FRAME);

      const parsedTabDfProps = tabDfProps.map((dfProp) => getPropViewers(dfProp).config);

      let prevDfBlockTitle = '';
      const dfBlocks = tabDfProps.reduce((acc, dfProp, dfIndex) => {
        this.dfToViewerMapping[dfProp.name] = [];

        const promisedViewers: Promise<DG.Viewer>[] = parsedTabDfProps[dfIndex].map(async (viewerDesc: {[key: string]: string | boolean}, _) => {
          const initialValue: DG.DataFrame = this.funcCall.outputs[dfProp.name]?.value ?? this.funcCall.inputParams[dfProp.name]?.value ?? grok.data.demo.demog(1);

          const viewerType = viewerDesc['type'] as string;
          const viewer = Object.values(viewerTypesMapping).includes(viewerType) ? DG.Viewer.fromType(viewerType, initialValue): await initialValue.plot.fromType(viewerType) as DG.Viewer;
          viewer.setOptions(viewerDesc);

          this.dfToViewerMapping[dfProp.name].push(viewer);
          this.afterOutputPropertyRender.next({prop: dfProp, output: viewer});

          return viewer;
        });

        const reactiveViewers = promisedViewers.map((promisedViewer, viewerIdx) => promisedViewer.then((loadedViewer) => {
          const updateViewerSource = async () => {
            const currentParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];

            this.showOutputTabsElem();

            // Filters: workaround for https://reddata.atlassian.net/browse/GROK-14270
            if (Object.values(viewerTypesMapping).includes(loadedViewer.type) && loadedViewer.type !== DG.VIEWER.FILTERS) {
              loadedViewer.dataFrame = currentParam.value;
              loadedViewer.setOptions(parsedTabDfProps[dfIndex][viewerIdx]);
            } else {
              // User-defined viewers (e.g. OutliersSelectionViewer) could created only asynchronously
              const newViewer = await currentParam.value.plot.fromType(loadedViewer.type) as DG.Viewer;
              newViewer.setOptions(parsedTabDfProps[dfIndex][viewerIdx]);
              loadedViewer.root.replaceWith(newViewer.root);
              loadedViewer = newViewer;
            }
            this.afterOutputPropertyRender.next({prop: dfProp, output: loadedViewer});
          };

          const paramSub = this.funcCallReplaced.pipe(
            startWith(null),
            switchMap(() => {
              const currentParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];
              return currentParam.onChanged.pipe(startWith(null));
            }),
            skip(1),
          ).subscribe(updateViewerSource);
          this.subs.push(paramSub);

          return loadedViewer;
        }));

        const dfBlockTitle: string = (prevDfBlockTitle !== (dfProp.options['caption'] ?? dfProp.name)) ? dfProp.options['caption'] ?? dfProp.name: ' ';
        prevDfBlockTitle = dfBlockTitle;

        if (isInputTab) {
          const inputTabSub = this.funcCallReplaced.pipe(
            switchMap(() => {
              const currentParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];
              return currentParam.onChanged;
            }),
          ).subscribe(() => {
            this.showOutputTabsElem();
            Object.keys(this.categoryToDfParamMap.inputs).forEach((inputTabName) => {
              $(this.outputsTabsElem.getPane(inputTabName).header).show();
            });
          });
          this.subs.push(inputTabSub);
        }

        const wrappedViewers = reactiveViewers.map((promisedViewer, viewerIndex) => {
          const blockWidth: string | boolean | undefined = parsedTabDfProps[dfIndex][viewerIndex]['block'];
          const viewerRoot = ui.wait(async () => (await promisedViewer).root);
          $(viewerRoot).css({
            'min-height': '300px',
            'flex-grow': '1',
          });

          return ui.divV([
            ui.h2(viewerIndex === 0 ? dfBlockTitle: ' ', {style: {'white-space': 'pre'}}),
            viewerRoot,
          ], {style: {...blockWidth ? {
            'width': `${blockWidth}%`,
            'max-width': `${blockWidth}%`,
            'max-height': '100%',
          } : {
            'flex-grow': '1',
          }}});
        });

        acc.append(...wrappedViewers);

        return acc;
      }, ui.divH([], {'style': {'flex-wrap': 'wrap', 'flex-grow': '1', 'max-height': '100%'}}));

      const generateScalarsTable = () => {
        const table = DG.HtmlTable.create(
          tabScalarProps,
          (scalarProp: DG.Property) => {
            const precision = scalarProp.options.precision;

            return [
              scalarProp.caption ?? scalarProp.name,
              precision && scalarProp.propertyType === DG.TYPE.FLOAT && this.funcCall.outputs[scalarProp.name]?
                this.funcCall.outputs[scalarProp.name].toPrecision(precision) : this.funcCall.outputs[scalarProp.name],
              scalarProp.options['units'],
            ];
          },
        ).root;
        $(table).addClass('rfv-scalar-table');
        this.afterOutputSacalarTableRender.next(table);
        return table;
      };

      let scalarsTable = generateScalarsTable();

      const tableSub = merge(this.funcCallReplaced, this.isRunning.pipe(filter((x) => x === false), skip(1))).subscribe(() => {
        const newScalarsTable = generateScalarsTable();
        scalarsTable.replaceWith(newScalarsTable);
        scalarsTable = newScalarsTable;
        $(this.outputsTabsElem.getPane(tabLabel).header).show();
      });
      this.subs.push(tableSub);

      this.outputsTabsElem.addPane(tabLabel, () => {
        return ui.divV([...tabDfProps.length ? [dfBlocks]: [], ...tabScalarProps.length ? [scalarsTable]: []]);
      });
    });

    const outputBlock = ui.box();
    outputBlock.append(this.outputsTabsElem.root);

    return outputBlock;
  }

  public async onAfterLoadRun(loadedRun: DG.FuncCall) {
    this.showOutputTabsElem();
    this.outputsTabsElem.panes.forEach((tab) => {
      $(tab.header).show();
    });
  }

  // Stores mapping between DF and its' viewers
  private dfToViewerMapping: {[key: string]: DG.Viewer[]} = {};

  protected get tabsLabels() {
    return [
      ...Object.keys(this.categoryToDfParamMap.inputs),
      ...Object.keys(this.categoryToDfParamMap.outputs),
    ];
  }

  protected get categoryToDfParamMap() {
    const map = {
      inputs: {} as Record<string, DG.Property[]>,
      outputs: {} as Record<string, DG.Property[]>,
    };

    this.func.inputs
      .filter((inputProp) =>
        inputProp.propertyType === DG.TYPE.DATA_FRAME &&
        getPropViewers(inputProp).config.length !== 0,
      )
      .forEach((p) => {
        const category = p.category === 'Misc' ? 'Input': p.category;

        if (map.inputs[category])
          map.inputs[category].push(p);
        else
          map.inputs[category] = [p];
      });

    this.func.outputs
      .forEach((p) => {
        const category = p.category === 'Misc' ? 'Output': p.category;

        if (p.propertyType === DG.TYPE.DATA_FRAME &&
          getPropViewers(p).config.length === 0) return;

        if (map.outputs[category])
          map.outputs[category].push(p);
        else
          map.outputs[category] = [p];
      });

    return map;
  }

  public async doRun(): Promise<void> {
    this.isRunning.next(true);
    try {
      await this.run();
    } catch (e: any) {
      grok.shell.error(e.toString());
      console.log(e);
    } finally {
      this.isRunning.next(false);
      this.validationRequests.next({isRevalidation: false, isNewOutput: true});
    }
  }

  private saveInputLockState(paramName: string, value: any, state?: INPUT_STATE) {
    if (state === 'restricted') {
      this.funcCall.options[RESTRICTED_PATH] = {
        ...this.funcCall.options[RESTRICTED_PATH],
        [paramName]: value,
      };
    }

    if (state) {
      this.funcCall.options[EDIT_STATE_PATH] = {
        ...this.funcCall.options[EDIT_STATE_PATH],
        [paramName]: state,
      };
    }

    this.updateConsistencyState();
  }

  private getInputLockState(paramName: string): INPUT_STATE | undefined {
    return this.funcCall.options[EDIT_STATE_PATH]?.[paramName];
  }

  private updateConsistencyState() {
    const isInconsistent = Object.values(this.funcCall.options[EDIT_STATE_PATH]).some((inputState) => inputState === 'inconsistent');

    this.consistencyState.next(isInconsistent ? 'inconsistent': 'consistent');
  }

  public getInput(name: string) {
    return this.inputsMap[name];
  }

  public setInput(name: string, value: any, state?: 'disabled' | 'restricted' | 'user input') {
    const input = this.getInput(name);
    if (!input)
      throw new Error(`No input named ${name}`);

    if (
      this.funcCall.inputParams[name].property.propertyType === DG.TYPE.DATA_FRAME &&
      state === 'restricted'
    )
      throw new Error(`Param ${name} is dataframe. Restricted state is not supported for them.`);

    if (!state)
      state = (this.funcCall.inputParams[name].property.propertyType === DG.TYPE.DATA_FRAME) ? 'disabled': 'restricted';

    this.funcCall.inputs[name] = value;
    this.setInputLockState(input, name, value, state);
  }

  private setInputLockState(input: FuncCallInput, paramName: string, value: any, state?: INPUT_STATE) {
    // if the state is undefined, it is common input with no special state.
    // thus, no need to save it.
    if (state)
      this.saveInputLockState(paramName, value, state);

    if (!isInputLockable(input)) return;

    if (state === 'disabled')
      input.setDisabled();

    if (state === 'restricted')
      input.setRestricted();

    if (state === 'restricted unlocked')
      input.setRestrictedUnlocked();

    if (state === 'inconsistent')
      input.setInconsistent();

    if (state === 'user input')
      input.setUserInput();
  }

  private getRestrictedValue(paramName: string) {
    return this.funcCall.options[RESTRICTED_PATH]?.[paramName];
  }

  private renderOutputForm(): HTMLElement {
    return this.renderIOForm(SYNC_FIELD.OUTPUTS);
  }

  private async onSALaunch(): Promise<void> {
    await SensitivityAnalysis.fromEmpty(this.func);
  }

  private renderInputForm(): HTMLElement {
    return this.renderIOForm(SYNC_FIELD.INPUTS);
  }

  private renderIOForm(field: SyncFields) {
    const inputs = ui.divH([], 'ui-form ui-form-wide');
    $(inputs).css({
      'flex-wrap': 'wrap',
      'flex-grow': '0',
      'padding-right': '12px',
      'padding-top': '0px',
      'padding-left': '0px',
      'max-width': '100%',
      'gap': '4px',
    });

    let prevCategory = 'Misc';
    const params = this.funcCall[syncParams[field]].values();
    wu(params)
      .filter((val) => !!val)
      .forEach((val) => {
        const prop = val.property;
        this.beforeInputPropertyRender.next(prop);
        const input = this.getInputForVal(val);
        if (!input) {
          prevCategory = prop.category;
          return;
        }
        this.inputsMap[val.property.name] = input;
        if (field === SYNC_FIELD.INPUTS) {
          this.syncInput(val, input, field);
          this.checkForMapping(val, input);
          this.disableInputsOnRun(val.property.name, input);
          this.bindOnHotkey(input);
        }

        this.renderCategory(inputs, val.property.category, prevCategory);
        this.renderInput(inputs, val, input);
        this.afterInputPropertyRender.next({prop, input: input});
        prevCategory = prop.category;
      });

    Object.keys(this.foldedCategoryInputs)
      .forEach((key) =>
        this.foldedCategoryInputs[key].forEach((t) => $(t.input.root).hide()),
      );

    inputs.classList.remove('ui-panel');

    return inputs;
  }

  focusedInput = null as HTMLElement | null;

  private saveFocusedElement(t: HTMLElement) {
    this.focusedInput = t;
  }

  private restoreFocusedElement() {
    this.focusedInput?.focus();
  }

  private disableInputsOnRun(paramName: string, t: InputVariants) {
    const disableOnRunSub = this.isRunning.subscribe((isRunning) => {
      if (this.getInputLockState(paramName) !== 'user input' && this.getInputLockState(paramName)) return;

      if (isRunning) {
        if (isInputBase(t) && $(t.input).is(':focus')) this.saveFocusedElement(t.input);
        t.enabled = false;
      } else {
        t.enabled = true;
        if (isInputBase(t)) this.restoreFocusedElement();
      }
    });
    this.subs.push(disableOnRunSub);
  }

  private checkForMapping(val: DG.FuncCallParam, funcCallInput: InputVariants) {
    const isHistoryInputBase = (input: InputVariants): input is HistoryInputBase => funcCallInput.hasOwnProperty('_chosenRun');

    if (!isHistoryInputBase(funcCallInput)) return;

    const mappingJson = val.property.options.funccallMapping;
    if (!mappingJson) return;

    const mapping = JSON.parse(mappingJson) as Record<string, string>;
    const paramSub = this.funcCallReplaced.pipe(
      startWith(true),
      switchMap(() => {
        const currentParam = this.funcCall.inputParams[val.property.name];
        return currentParam.onChanged;
      }),
    ).subscribe(() => {
      const extractValue = (key: string) => funcCallInput.chosenRun?.inputs[key] ?? funcCallInput.chosenRun?.outputs[key] ?? funcCallInput.chosenRun?.options[key] ?? null;
      Object.entries(mapping).forEach(([input, key]) => this.setInput(
        input,
        funcCallInput.chosenRun ? extractValue(key): this.funcCall.inputParams[input].property.defaultValue,
        funcCallInput.chosenRun ? 'restricted': 'user input',
      ));
    });
    this.subs.push(paramSub);
  }

  private getInputForVal(val: DG.FuncCallParam): InputVariants | null {
    const prop = val.property;
    if (this.inputsOverride[val.property.name])
      return this.inputsOverride[val.property.name];

    if (prop.propertyType === DG.TYPE.STRING && prop.options.choices && !prop.options.propagateChoice)
      return ui.choiceInput(prop.caption ?? prop.name, prop.defaultValue, JSON.parse(prop.options.choices));

    switch (prop.propertyType as any) {
    case DG.TYPE.DATA_FRAME:
      return ui.tableInput(prop.caption ?? prop.name, null, grok.shell.tables);
    case FILE_INPUT_TYPE:
      return UiUtils.fileInput(prop.caption ?? prop.name, null, null, null);
    case DG.TYPE.FLOAT:
      const floatInput = ui.input.forProperty(prop);
      const format = prop.options.format;
      if (format) floatInput.format = format;
      return floatInput;
    default:
      return ui.input.forProperty(prop);
    }
  }

  private bindOnHotkey(t: InputVariants) {
    if (isInputBase(t)) {
      t.input.onkeydown = async (ev) => {
        if (ev.key == 'Enter') this.runRequests.next();
      };
    }
  }

  private get foldedCategories(): string[] {
    return JSON.parse(this.func.options['foldedCategories'] ?? '[]');
  }

  private foldedCategoryInputs = {} as Record<string, {paramName: string, input: InputVariants}[]>;

  private getCategoryWarningIcon(category: string) {
    const warningIcon = ui.iconFA('exclamation-circle', null, 'This category has inconsistent inputs');
    $(warningIcon).css({'color': `var(--orange-2)`, 'padding-left': '5px'}).hide();

    const sub = this.funcCallReplaced.subscribe(() => {
      if (this.foldedCategoryInputs[category].some((e) =>
        this.getInputLockState(e.paramName) === 'inconsistent' &&
        e.input.value !== this.getRestrictedValue(e.paramName),
      ))
        $(warningIcon).show();
      else
        $(warningIcon).hide();
    });
    this.subs.push(sub);
    return warningIcon;
  }

  private renderCategory(inputsDiv: HTMLDivElement, currentCategory: string, prevCategory: string) {
    if (currentCategory === prevCategory) return;

    if (this.foldedCategories.includes(currentCategory)) {
      const warningIcon = this.getCategoryWarningIcon(currentCategory);

      const chevronToOpen = ui.iconFA('chevron-right', () => {
        $(chevronToClose).show();
        $(chevronToOpen).hide();
        $(warningIcon).hide();
        (this.foldedCategoryInputs[currentCategory] ?? []).forEach((t) => $(t.input.root).css({'display': ''}));
      }, 'Open category');
      $(chevronToOpen).css('padding-right', '5px');
      const chevronToClose = ui.iconFA('chevron-down', () => {
        $(chevronToClose).hide();
        $(chevronToOpen).show();
        if (this.foldedCategoryInputs[currentCategory].some((e) => this.getInputLockState(e.paramName) === 'inconsistent'))
          $(warningIcon).show();
        else
          $(warningIcon).hide();

        (this.foldedCategoryInputs[currentCategory] ?? []).forEach((t) => $(t.input.root).hide());
      }, 'Close category');
      $(chevronToClose).css('padding-right', '5px');

      //@ts-ignore
      inputsDiv.append(ui.h2([chevronToOpen, chevronToClose, ui.h2(currentCategory, {style: {'display': 'inline'}}), warningIcon], {style: {'width': '100%'}}));
      $(chevronToClose).hide();
    } else
      inputsDiv.append(ui.h2(currentCategory, {style: {'width': '100%'}}));
  }

  private renderInput(inputsDiv: HTMLDivElement, val: DG.FuncCallParam, t: InputVariants) {
    const prop = val.property;

    if (this.foldedCategories.includes(prop.category))
      this.foldedCategoryInputs[prop.category] = [...(this.foldedCategoryInputs[prop.category] ?? []), {paramName: val.property.name, input: t}];

    this.injectLockIcons(val, t);
    injectLockStates(t);

    if (isInputBase(t)) {
      inputBaseAdditionalRenderHandler(val, t);
      this.bindTooltips(val, t);
      injectInputBaseValidation(t);
    }

    inputsDiv.append(t.root);
  }

  private bindTooltips(param: DG.FuncCallParam, t: DG.InputBase) {
    const paramName = param.property.name;

    ui.tooltip.bind(t.root, () => {
      const desc = param.property.description ? `${param.property.description}.`: null;

      const getExplanation = () => {
        if (this.getInputLockState(paramName) === 'disabled') return `Input is disabled to prevent inconsistency.`;
        if (this.getInputLockState(paramName) === 'inconsistent') return `The entered value is inconsistent to the computed value.`;
        if (this.getInputLockState(paramName) === 'restricted') return `The value is dependent and computed automatically. Click to edit`;

        return null;
      };
      const exp = getExplanation();

      return desc || exp ?
        ui.divV([
          ...desc ? [ui.divText(desc)]: [],
          ...exp ? [ui.divText(exp)]: [],
        ], {style: {'max-width': '300px'}}) : null;
    });
  }

  private injectLockIcons(param: DG.FuncCallParam, t: FuncCallInput) {
    const paramName = param.property.name;

    t.root.addEventListener('click', () => {
      if (this.getInputLockState(paramName) === 'restricted')
        this.setInputLockState(t, param.name, param.value, 'restricted unlocked');
    });

    const lockIcon = ui.iconFA('lock');
    $(lockIcon).addClass('rfv-icon-lock');
    $(lockIcon).css({color: `var(--grey-2)`});

    const unlockIcon = ui.iconFA('lock-open');
    $(unlockIcon).addClass('rfv-icon-unlock');
    $(unlockIcon).css({color: `var(--grey-2)`});

    const resetIcon = ui.iconFA('undo', (e: MouseEvent) => {
      this.setInput(param.name, this.getRestrictedValue(paramName), 'restricted');
      e.stopPropagation();
    }, 'Reset value to computed value');
    $(resetIcon).addClass('rfv-icon-undo');
    $(resetIcon).css({color: `var(--blue-2)`});

    const warningIcon = ui.iconFA('exclamation-circle', null);
    ui.tooltip.bind(warningIcon, () => `Current value is incosistent. Computed value was ${DG.TYPES_SCALAR.has(param.property.propertyType) ? this.getRestrictedValue(paramName): 'different'}`);
    $(warningIcon).addClass('rfv-icon-warning');
    $(warningIcon).css({color: `var(--orange-2)`});

    function defaultPlaceLockStateIcons(
      lockIcon: HTMLElement,
      unlockIcon: HTMLElement,
      resetIcon: HTMLElement,
      warningIcon: HTMLElement,
    ) {
      // If custom input is not DG.InputBase instance then do nothing
      if (!isInputBase(t)) return;

      t.addOptions(lockIcon);
      t.addOptions(unlockIcon);
      t.addOptions(resetIcon);
      t.addOptions(warningIcon);
    }

    const tAny = (t as any);
    // if no custom place for lock state icons is provided then use default placing
    if (!tAny.placeLockStateIcons)
      tAny.placeLockStateIcons = defaultPlaceLockStateIcons;
    tAny.placeLockStateIcons(lockIcon, unlockIcon, resetIcon, warningIcon);
  }

  private syncInput(val: DG.FuncCallParam, t: InputVariants, field: SyncFields) {
    const name = val.name;

    let stopUIUpdates = false;

    const sub1 = this.funcCallReplaced.pipe(startWith(true)).subscribe(() => {
      const newParam = this.funcCall[syncParams[field]][name];
      const newValue = this.funcCall[field][name] ?? newParam.property.defaultValue ?? null;
      t.notify = false;
      t.value = newValue;
      t.notify = true;
      this.funcCall[field][name] = newValue;
      this.setInputLockState(t, name, newValue, this.getInputLockState(name));
    });
    this.subs.push(sub1);

    const sub2 = this.funcCallReplaced.pipe(
      startWith(true),
      switchMap(() => {
        const newParam = this.funcCall[syncParams[field]][name];
        return newParam.onChanged.pipe(mapTo(newParam));
      }),
    ).subscribe((newParam) => {
      const newValue = this.funcCall[field][newParam.name];
      // don't update UI if an update is triggered by UI
      if (!stopUIUpdates) {
        t.notify = false;
        t.value = newValue;
        t.notify = true;
      }
      if (field === SYNC_FIELD.INPUTS) {
        this.hideOutdatedOutput();
        this.validationRequests.next({field: newParam.name, isRevalidation: false});

        const currentState = this.getInputLockState(newParam.name);
        if (currentState === 'restricted unlocked' || currentState === 'inconsistent') {
          this.setInputLockState(t, newParam.name, newValue,
            newValue === this.getRestrictedValue(newParam.name) ? 'restricted unlocked' : 'inconsistent',
          );
        }
      }
    });
    this.subs.push(sub2);

    // handling mutations of dataframes
    const sub3 = this.funcCallReplaced.pipe(
      startWith(true),
      switchMap(() => {
        const newParam = this.funcCall[syncParams[field]][name];
        return newParam.onChanged.pipe(mapTo(newParam), startWith(newParam));
      }),
      filter((param) => param.property.propertyType === DG.TYPE.DATA_FRAME && param.value),
      switchMap<DG.FuncCallParam, Observable<DG.FuncCallParam>>(
        (param) => param.value.onDataChanged.pipe(mapTo(param)),
      ),
    ).subscribe((param) => {
      this.validationRequests.next({field: param.name, isRevalidation: false});
    });
    this.subs.push(sub3);

    const sub4 = getObservable(t.onInput.bind(t)).pipe(debounceTime(VALIDATION_DEBOUNCE_TIME)).subscribe(() => {
      if (this.isHistorical.value)
        this.isHistorical.next(false);
      try {
        stopUIUpdates = true;
        this.funcCall[field][val.name] = t.value;
      } finally {
        stopUIUpdates = false;
      }
    });
    this.subs.push(sub4);
  }

  public isRunnable() {
    if (this.isRunning.value)
      return false;

    return this.isValid();
  }

  public isValid() {
    for (const [_, v] of Object.entries(this.validationState)) {
      if (!isValidationPassed(v))
        return false;
    }
    return true;
  }

  public getValidationState() {
    return this.validationState;
  }

  public getValidationMessage() {
    const msgs: string[] = [];
    for (const [name, v] of Object.entries(this.validationState)) {
      if (!isValidationPassed(v))
        msgs.push(`${name}: ${getErrorMessage(v)}`);
    }
    return msgs.join('\n');
  }

  private async runValidation(payload: ValidationRequestPayload, signal: AbortSignal) {
    const inputName = payload.field;
    const inputNames = this.getValidatedNames(inputName);

    const validationItems = await Promise.all(inputNames.map(async (name) => {
      const v = this.funcCall.inputs[name];
      // not allowing null anywhere
      const standardMsgs = await nonNullValidator(v, {
        param: name,
        funcCall: this._funcCall!,
        lastCall: this.lastCall,
        signal,
        isNewOutput: !!payload.isNewOutput,
        isRevalidation: payload.isRevalidation,
        view: this,
      });
      let customMsgs;
      const customValidator = this.validators[name];
      if (customValidator) {
        customMsgs = await customValidator(v, {
          param: name,
          funcCall: this._funcCall!,
          lastCall: this.lastCall,
          signal,
          isNewOutput: !!payload.isNewOutput,
          isRevalidation: payload.isRevalidation,
          context: payload.context,
          view: this,
        });
      }
      return [name, mergeValidationResults(
        ...this.funcCall.inputParams[name].property.options.nullable ? []: [standardMsgs],
        customMsgs),
      ] as const;
    }));
    return Object.fromEntries(validationItems);
  }

  private setValidationPending(inputName?: string) {
    const inputNames = this.getValidatedNames(inputName);
    for (const name of inputNames) {
      this.validationState[name] = makePendingValidationResult();
      const input = this.inputsMap[name];
      if (isFuncCallInputValidated(input))
        input.setValidation(makePendingValidationResult());
    }
    this.validationUpdates.next(null);
  }

  private setValidationResults(results: Record<string, ValidationResult | undefined>) {
    for (const [inputName, validationMessages] of Object.entries(results)) {
      this.validationState[inputName] = validationMessages;
      const input = this.inputsMap[inputName];
      if (isFuncCallInputValidated(input))
        input.setValidation(validationMessages);
    }
  }

  private runRevalidations(payload: ValidationRequestPayload, results: Record<string, ValidationResult | undefined>) {
    // allow only 1 level of revalidations
    if (payload.isRevalidation)
      return;
    for (const [, result] of Object.entries(results)) {
      if (result?.revalidate) {
        for (const field of result.revalidate)
          this.validationRequests.next({field, context: result.context, isRevalidation: true});
      }
    }
  }

  private getValidatedNames(inputName?: string): string[] {
    return (inputName ? [inputName]: [...this.funcCall.inputs.keys()]);
  }

  private async saveExperimentalRun(expFuncCall: DG.FuncCall) {
    // Dirty hack to set readonly 'started' field
    const tempCall = await(await grok.functions.eval('Sin')).prepare({x: 1}).call();
    expFuncCall.dart.r2 = tempCall.dart.r2;

    const tags = expFuncCall.options['tags'] || [];
    expFuncCall.options['tags'] = tags.includes(EXPERIMENTAL_TAG) ? tags: [...tags, EXPERIMENTAL_TAG];

    expFuncCall.newId();

    await this.saveRun(expFuncCall);
  }

  private hideOutdatedOutput() {
    if (this.keepOutput())
      return;
    this.outputsTabsElem.panes
      .filter((tab) => Object.keys(this.categoryToDfParamMap.outputs).includes(tab.name))
      .forEach((tab) => $(tab.header).hide());

    const firstInputTab = this.outputsTabsElem.panes
      .find((tab) => Object.keys(this.categoryToDfParamMap.inputs).includes(tab.name));
    if (firstInputTab)
      this.outputsTabsElem.currentPane = firstInputTab;
    else
      $(this.outputsTabsElem.root).hide();
  }

  private sheetNamesCache = {} as Record<string, string>;

  private getSheetName(initialName: string, wb: ExcelJS.Workbook) {
    if (this.sheetNamesCache[initialName]) return this.sheetNamesCache[initialName];

    let name = `${initialName}`;
    if (name.length > 31)
      name = `${name.slice(0, 31)}`;
    let i = 1;
    while (wb.worksheets.some((sheet) => sheet.name === name)) {
      let truncatedName = `${initialName}`;
      if (truncatedName.length > (31 - `-${i}`.length))
        truncatedName = `${initialName.slice(0, 31 - `-${i}`.length)}`;
      name = `${truncatedName}-${i}`;
      i++;
    }

    this.sheetNamesCache[initialName] = name;

    return name;
  };

  /**
   * RichFunctionView know everything about its UI, so it exports not only data, but also viewer screenshots.
   * This function iterates over all of the tabs and sequentally exports all dataframes, their viewers and scalars.
   * @param format format needed to export. See {@link this.defaultSupportedExportFormats} for available formats.
   * @returns Promise<Blob> with data ready for download
   */
  protected richFunctionExport = async (format: string) => {
    if (format === 'Excel') {
      try {
        const lastCall = this.lastCall;

        if (!lastCall) throw new Error(`Function was not called`);

        if (!this.exportConfig!.supportedFormats.includes(format)) throw new Error(`Format "${format}" is not supported.`);

        if (!this.func) throw new Error('The correspoding function is not specified');

        const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const exportWorkbook = new ExcelJS.Workbook();

        const isScalarType = (type: DG.TYPE) => (DG.TYPES_SCALAR.has(type));

        const isDataFrame = (prop: DG.Property) => (prop.propertyType === DG.TYPE.DATA_FRAME);

        const dfInputs = this.func.inputs.filter((input) => isDataFrame(input));
        const scalarInputs = this.func.inputs.filter((input) => isScalarType(input.propertyType));
        const dfOutputs = this.func.outputs.filter((output) => isDataFrame(output));
        const scalarOutputs = this.func.outputs.filter((output) => isScalarType(output.propertyType));

        dfInputs.forEach((dfInput) => {
          const visibleTitle = dfInput.options.caption || dfInput.name;
          const currentDfSheet =
        exportWorkbook.worksheets.find((ws) => ws.name === this.getSheetName(visibleTitle, exportWorkbook)) ??
        exportWorkbook.addWorksheet(this.getSheetName(visibleTitle, exportWorkbook));

          const currentDf = lastCall.inputs[dfInput.name];
          dfToSheet(currentDfSheet, currentDf);
        });

        if (scalarInputs.length) {
          const inputScalarsSheet = exportWorkbook.addWorksheet('Input scalars');
          scalarsToSheet(inputScalarsSheet, scalarInputs.map((scalarInput) => ({
            caption: scalarInput.options['caption'] || scalarInput.name,
            value: lastCall.inputs[scalarInput.name],
            units: scalarInput.options['units'] || '',
          })));
        }

        dfOutputs.forEach((dfOutput) => {
          const visibleTitle = dfOutput.options.caption || dfOutput.name;
          const currentDfSheet =
        exportWorkbook.worksheets.find((ws) => ws.name === this.getSheetName(visibleTitle, exportWorkbook)) ??
        exportWorkbook.addWorksheet(this.getSheetName(visibleTitle, exportWorkbook));

          const currentDf = lastCall.outputs[dfOutput.name];
          dfToSheet(currentDfSheet, currentDf);
        });


        if (scalarOutputs.length) {
          const outputScalarsSheet = exportWorkbook.addWorksheet('Output scalars');
          scalarsToSheet(outputScalarsSheet, scalarOutputs.map((scalarOutput) => ({
            caption: scalarOutput.options['caption'] || scalarOutput.name,
            value: lastCall.outputs[scalarOutput.name],
            units: scalarOutput.options['units'] || '',
          })));
        }

        const tabControl = this.outputsTabsElem;

        for (const tabLabel of this.tabsLabels.filter((label) => Object.keys(this.categoryToDfParamMap.inputs).includes(label))) {
          for (const inputProp of this.categoryToDfParamMap.inputs[tabLabel].filter((prop) => isDataFrame(prop))) {
            const nonGridViewers = this.dfToViewerMapping[inputProp.name]
              .filter((viewer) => viewer.type !== DG.VIEWER.GRID)
              .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

            if (nonGridViewers.length === 0) continue;

            tabControl.currentPane = tabControl.getPane(tabLabel);
            await new Promise((r) => setTimeout(r, 100));

            const visibleTitle = inputProp.options.caption || inputProp.name;
            const currentDf = lastCall.inputs[inputProp.name];

            for (const [index, viewer] of nonGridViewers.entries()) {
              await plotToSheet(
                exportWorkbook,
                exportWorkbook.getWorksheet(this.getSheetName(visibleTitle, exportWorkbook))!,
                viewer.root,
                currentDf.columns.length + 2,
                (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
              );
            };
          }
        }

        for (const tabLabel of this.tabsLabels.filter((label) => Object.keys(this.categoryToDfParamMap.outputs).includes(label))) {
          for (const outputProp of this.categoryToDfParamMap.outputs[tabLabel].filter((prop) => isDataFrame(prop))) {
            const nonGridViewers = this.dfToViewerMapping[outputProp.name]
              .filter((viewer) => viewer.type !== DG.VIEWER.GRID)
              .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

            if (nonGridViewers.length === 0) continue;

            tabControl.currentPane = tabControl.getPane(tabLabel);
            await new Promise((r) => setTimeout(r, 100));

            const visibleTitle = outputProp.options.caption || outputProp.name;
            const currentDf = lastCall.outputs[outputProp.name];

            for (const [index, viewer] of nonGridViewers.entries()) {
              if (viewer.type === DG.VIEWER.STATISTICS) {
                const length = currentDf.columns.length;
                const stats = DG.DataFrame.fromColumns([
                  DG.Column.string('Name', length).init((i: number) => currentDf.columns.byIndex(i).name),
                  DG.Column.int('Values', length).init((i: number) => currentDf.columns.byIndex(i).stats.valueCount),
                  DG.Column.int('Nulls', length).init((i: number) => currentDf.columns.byIndex(i).stats.missingValueCount),
                  DG.Column.float('Min', length).init((i: number) => currentDf.columns.byIndex(i).stats.min),
                  DG.Column.float('Max', length).init((i: number) => currentDf.columns.byIndex(i).stats.max),
                  DG.Column.float('Avg', length).init((i: number) => currentDf.columns.byIndex(i).stats.avg),
                  DG.Column.float('Stdev', length).init((i: number) => currentDf.columns.byIndex(i).stats.stdev),
                ]);
                dfToSheet(
                  exportWorkbook.getWorksheet(this.getSheetName(visibleTitle, exportWorkbook))!,
                  stats,
                  currentDf.columns.length + 2,
                  (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
                );
              } else {
                await plotToSheet(
                  exportWorkbook,
                  exportWorkbook.getWorksheet(this.getSheetName(visibleTitle, exportWorkbook))!,
                  viewer.root,
                  currentDf.columns.length + 2,
                  (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
                );
              }
            }
          }
        }

        const buffer = await exportWorkbook.xlsx.writeBuffer();

        return new Blob([buffer], {type: BLOB_TYPE});
      } catch (e) {
        console.log(e);
      }
    }

    if (format === 'DataUrl images') {
      const jsonText = {} as Record<string, Record<number, {dataUrl: string, width: number, height: number}>>;

      const isDataFrame = (prop: DG.Property) => (prop.propertyType === DG.TYPE.DATA_FRAME);

      const tabControl = this.outputsTabsElem;

      for (const tabLabel of this.tabsLabels.filter((label) => Object.keys(this.categoryToDfParamMap.inputs).includes(label))) {
        for (const inputProp of this.categoryToDfParamMap.inputs[tabLabel].filter((prop) => isDataFrame(prop))) {
          const nonGridViewers = this.dfToViewerMapping[inputProp.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID && viewer.type !== DG.VIEWER.STATISTICS)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          if (nonGridViewers.length === 0) continue;

          tabControl.currentPane = tabControl.getPane(tabLabel);
          await new Promise((r) => setTimeout(r, 100));

          for (const [i, viewer] of nonGridViewers.entries()) {
            const dataUrl = (await html2canvas(viewer.root, {logging: false})).toDataURL();

            if (!jsonText[inputProp.name]) jsonText[inputProp.name] = {};

            jsonText[inputProp.name][i] = {dataUrl, width: viewer.root.clientWidth, height: viewer.root.clientHeight};
          }
        }
      }

      for (const tabLabel of this.tabsLabels.filter((label) => Object.keys(this.categoryToDfParamMap.outputs).includes(label))) {
        for (const outputProp of this.categoryToDfParamMap.outputs[tabLabel].filter((prop) => isDataFrame(prop))) {
          const nonGridViewers = this.dfToViewerMapping[outputProp.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID && viewer.type !== DG.VIEWER.STATISTICS)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          if (nonGridViewers.length === 0) continue;

          tabControl.currentPane = tabControl.getPane(tabLabel);
          await new Promise((r) => setTimeout(r, 100));

          for (const [i, viewer] of nonGridViewers.entries()) {
            const dataUrl = (await html2canvas(viewer.root, {logging: false})).toDataURL();

            if (!jsonText[outputProp.name]) jsonText[outputProp.name] = {};

            jsonText[outputProp.name][i] = {dataUrl, width: viewer.root.clientWidth, height: viewer.root.clientHeight};
          }
        };
      }
      return new Blob([JSON.stringify(jsonText)], {type: 'text/plain'});
    }

    throw new Error('Format is not supported');
  };

  richFunctionViewSupportedFormats() {
    return ['Excel', 'DataUrl images'];
  }

  richFunctionViewExportExtensions() {
    return {
      'Excel': 'xlsx',
      'DataUrl images': 'txt',
    };
  }

  exportConfig = {
    supportedExtensions: this.richFunctionViewExportExtensions(),
    supportedFormats: this.richFunctionViewSupportedFormats(),
    export: this.richFunctionExport,
    filename: this.defaultExportFilename,
  };
}
