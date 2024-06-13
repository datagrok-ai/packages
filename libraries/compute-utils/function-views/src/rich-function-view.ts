/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import type ExcelJS from 'exceljs';
import type html2canvas from 'html2canvas';
import wu from 'wu';
import $ from 'cash-dom';
import {Subject, BehaviorSubject, Observable, merge, from, of, combineLatest} from 'rxjs';
import {debounceTime, delay, distinctUntilChanged, filter, groupBy, map, mapTo, mergeMap, skip, startWith, switchMap, tap} from 'rxjs/operators';
import {UiUtils} from '../../shared-components';
import {Validator, ValidationResult, nonNullValidator, isValidationPassed, getErrorMessage, makePendingValidationResult, mergeValidationResults} from '../../shared-utils/validation';
import {getFuncRunLabel, getPropViewers, injectLockStates, inputBaseAdditionalRenderHandler, injectInputBaseValidation, dfToSheet, plotToSheet, scalarsToSheet, isInputBase} from '../../shared-utils/utils';
import {EDIT_STATE_PATH, EXPERIMENTAL_TAG, INPUT_STATE, RESTRICTED_PATH, viewerTypesMapping} from '../../shared-utils/consts';
import {FuncCallInput, FuncCallInputValidated, isFuncCallInputValidated, isInputLockable} from '../../shared-utils/input-wrappers';
import '../css/rich-function-view.css';
import {FunctionView} from './function-view';
import {SensitivityAnalysisView as SensitivityAnalysis} from './sensitivity-analysis-view';
import {FittingView as Optimization} from './fitting-view';
import {HistoryInputBase} from '../../shared-components/src/history-input';
import {deepCopy, getDefaultValue, getObservable, properUpdateIndicator} from './shared/utils';
import {historyUtils} from '../../history-utils';
import {HistoricalRunsList} from '../../shared-components/src/history-list';

const FILE_INPUT_TYPE = 'file';
const VALIDATION_DEBOUNCE_TIME = 250;
const RUN_WAIT_TIME = 500;

export type InputVariants = DG.InputBase | FuncCallInput;

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

const getNoDataStub = () => ui.divText('[No data to display]', {style: {
  'text-align': 'center',
  'align-content': 'center',
  'width': '100%',
  'height': '100%',
}});

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

  private externalValidatorsUpdates = new Subject<string>();
  private externalValidatorsState: Record<string, ValidationResult | undefined> = {};

  public pendingValidations = this.validationUpdates.pipe(
    startWith(null),
    map(() => this.validationState),
  );

  private _isOutputOutdated = new BehaviorSubject<boolean>(true);
  public isOutputOutdated = this._isOutputOutdated.pipe(distinctUntilChanged());

  public blockRuns = new BehaviorSubject(false);

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

  public async onFuncCallReady() {
    await this.loadInputsOverrides();
    await this.loadInputsValidators();
    await super.onFuncCallReady();

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

    const externalValidationSub = this.externalValidatorsUpdates.subscribe((name) => {
      this.updateInputValidationReuslts(name);
    });

    this.subs.push(externalValidationSub);

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

    const lastInputs = (!this.options.isTabbed) ? (await this.loadLastInputs()): null;

    if (lastInputs) {
      grok.shell.info(ui.div([
        ui.divText('Do you want to load last inputs?'),
        ui.divH([
          ui.bigButton('Load', () => {
            for (const [key, value] of Object.entries(lastInputs)) {
              const input = this.getInput(key);
              input.notify = false;
              input.value = value;
              input.notify = true;
            }

            grok.shell.info(ui.divText('Change the loaded inputs to run computations'));
          }),
        ]),
      ]));
    } else {
      // run validations on start
      const controller = new AbortController();
      const results = await this.runValidation({isRevalidation: false}, controller.signal);
      this.setValidationResults(results);
      this.runRevalidations({isRevalidation: false}, results);
      this.validationUpdates.next(null);

      if (this.runningOnStart && this.isRunnable())
        await this.doRun();
    }
  }

  protected prevOpenedTab = null as DG.TabPane | null;
  /**
   * Saving previously opened tab
   * @param runFunc
   */
  public override onBeforeRun(): Promise<void> {
    if (this.tabsElem.currentPane)
      this.prevOpenedTab = this.inputTabsLabels.includes(this.tabsElem.currentPane.name) ? null: this.tabsElem.currentPane;

    return Promise.resolve();
  }

  /**
   * Showing UI after completion of function call.
   * @param runFunc
   */
  public override onAfterRun(): Promise<void> {
    this.showOutput();
    this.tabsElem.panes.forEach((tab) => {
      $(tab.header).show();
    });

    if (this.prevOpenedTab) {
      this.tabsElem.currentPane = this.prevOpenedTab;
      return Promise.resolve();
    }

    const firstOutputTab = this.tabsElem.panes
      .find((tab) => this.outputTabsLabels.includes(tab.name));
    if (firstOutputTab) this.tabsElem.currentPane = firstOutputTab;

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
    const validationSub = merge(this.validationUpdates, this.externalValidatorsUpdates, this.isRunning, this.blockRuns).subscribe(() => {
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
      if (param.property.options.validatorFunc) {
        const func: DG.Func = await grok.functions.eval(param.property.options.validatorFunc);
        const call = func.prepare({params: JSON.parse(param.property.options.validatorFuncOptions || '{}')});
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

      if (newValue)
        $(saveButton).show();
      else
        $(saveButton).hide();
    });
    this.subs.push(uploadSub);

    return saveButton;
  }

  private getStandardButtons(): HTMLElement[] {
    const runButton = this.getRunButton() as HTMLButtonElement;
    const runButtonWrapper = ui.div([runButton]);
    ui.tooltip.bind(
      runButtonWrapper,
      () => runButton.disabled ? (this.isRunning.value ? 'Computations are in progress' : this.getValidationMessage()) : '');
    const saveButton = this.getSaveButton();

    return [
      ...this.isHistoryEnabled && !this.options.isTabbed ? [saveButton]:[],
      ...!this.runningOnInput ? [runButtonWrapper]: [],
    ];
  }

  private formButtons = ui.div();
  private buildFormButtons() {
    const standardButtons = this.getStandardButtons();

    const newFormButtons = ui.buttonsInput();
    $(newFormButtons.firstChild).css({'display': 'none'});
    newFormButtons.lastChild?.replaceWith(ui.div([
      ...this.navBtns,
      ...this.additionalBtns,
      ...standardButtons,
    ], 'ui-input-editor'));
    $(newFormButtons).addClass('rfv-buttons');
    $(newFormButtons).css({'max-width': '100%'});

    this.formButtons.replaceWith(newFormButtons);
    this.formButtons = newFormButtons;

    return newFormButtons;
  }

  /**
   * Override to change additional buttons placed between navigation and run buttons.
   */
  protected additionalBtns = [] as HTMLElement[];
  /**
   * Changes additional buttons to provided ones.
   * @param additionalBtns Array of HTML elements to place instead of the existing additional buttons.
   */
  public setAdditionalButtons(additionalBtns: HTMLElement[]) {
    this.additionalBtns = additionalBtns;

    this.buildFormButtons();
  }

  /**
   * Override to change navigation buttons placed next to the additional buttons.
   */
  protected navBtns = [] as HTMLElement[];
  /**
   * Changes navigation buttons to provided ones.
   * @param navBtns Array of HTML elements to place instead of the existing navigation buttons.
   */
  public setNavigationButtons(navBtns: HTMLElement[]) {
    this.navBtns = navBtns;
  }

  /**
   * RichFunctionView has advanced automatic UI builder. It takes {@link this.funcCall} as a base and constructs flexible view.
   * This view is updated automatically when {@link this.funcCallReplaced} is emitted or any of input/output param changes.
   * @returns HTMLElement attached to the root of the view
   */
  public buildIO(): HTMLElement {
    const {inputBlock, inputForm, outputForm, controlsWrapper} = this.buildInputBlock();
    const inputElements = ([
      ...Array.from(inputForm.childNodes),
      ...this.isUploadMode.value ? [Array.from(outputForm.childNodes)]: [],
    ]);

    ui.tools.handleResize(inputBlock, () => {
      if ($(inputBlock).width() < 300) {
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

    this.hideOutput();

    const out = ui.splitH([inputBlock, ui.panel([outputBlock], {style: {'padding-top': '0px'}})], null, true);
    out.style.padding = '0 12px';

    inputBlock.style.maxWidth = '360px';

    return out;
  }

  public buildInputBlock() {
    const inputFormDiv = this.renderInputForm();
    const outputFormDiv = this.renderOutputForm();
    this.buildFormButtons();

    const controlsForm = ui.div(this.formButtons, 'ui-form ui-form-wide');
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
      ...this.hasUploadMode && !this.uploadFunc ? [
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

  private async processCustomDataUpload() {
    const getCompareDialog = () => {
      const compareDialog = DG.Dialog.create({'title': 'Select to compare'});

      const historyRuns = new HistoricalRunsList(simulatedFunccalls.length > 0 ?
        simulatedFunccalls:
        [...this.historyBlock!.history.values()],
      {
        fallbackText: 'No historical runs found',
        showActions: !(simulatedFunccalls.length > 0),
        showBatchActions: !(simulatedFunccalls.length > 0),
      });
      const uploadedRuns = new HistoricalRunsList(uploadedFunccalls,
        {
          fallbackText: 'No runs uploaded',
          showActions: false,
          showBatchActions: false,
        });

      compareDialog.add(ui.divV([
        ui.divV([
          ui.label('Uploaded runs'),
          ui.element('div', 'splitbar-horizontal'),
          uploadedRuns.root,
        ], {style: {'height': '50%', 'overflow-y': 'hidden'}}),
        ui.divV([
          ui.label(simulatedFunccalls.length > 0 ? 'Simulated': 'History', {style: {'padding': '0px 10px 0px 9px'}}),
          ui.element('div', 'splitbar-horizontal'),
          historyRuns.root,
        ], {style: {'height': '50%', 'overflow-y': 'hidden'}}),
      ], {style: {'justify-content': 'space-between', 'gap': '10px', 'overflow-y': 'scroll', 'height': '100%'}}));

      $(compareDialog.root.querySelector('.d4-dialog-contents')).removeClass('ui-form');

      const compareSelected = 'Compare selected' as const;

      if (simulatedFunccalls.length === 0) {
        compareDialog
          .addButton(compareSelected, async () => {
            const fullHistoryRuns = await Promise.all([...historyRuns.selected].map((funcCall) => historyUtils.loadRun(funcCall.id)));
            this.onComparisonLaunch([...fullHistoryRuns, ...uploadedRuns.selected.values()]);

            compareDialog.close();
          });
      } else {
        compareDialog
          .addButton(compareSelected, async () => {
            this.onComparisonLaunch([...historyRuns.selected.values(), ...uploadedRuns.selected.values()]);

            compareDialog.close();
          });
      }
      compareDialog.getButton(compareSelected).disabled = true;
      this.subs.push(
        merge(historyRuns.onSelectedChanged, uploadedRuns.onSelectedChanged).subscribe(() => {
          if (historyRuns.selected.size + uploadedRuns.selected.size > 1)
            compareDialog.getButton(compareSelected).disabled = false;
          else
            compareDialog.getButton(compareSelected).disabled = true;
        }),
      );

      if (this.isHistorical.value) {
        compareDialog
          .addButton(compareWithCurrent, async () => {
            this.onComparisonLaunch([this.funcCall, ...uploadedRuns.selected.values()]);

            compareDialog.close();
          });
      }

      $(compareDialog.getButton('CANCEL')).hide();

      return compareDialog;
    };

    const func = await grok.functions.eval(this.uploadFunc!) as DG.Func;
    const funcCall = await func.prepare({params: {'func': this.func}}).call();
    const uploadWidget = funcCall.outputs.uploadWidget;
    const uploadFuncCall = funcCall.outputs.uploadFuncCall as DG.FuncCall;
    let uploadedFunccalls = [] as DG.FuncCall[];
    let simulatedFunccalls = [] as DG.FuncCall[];

    const uploadDialog = DG.Dialog.create({'title': 'Upload'});
    $(uploadDialog.root.querySelector('.d4-dialog-contents')).removeClass('ui-form');
    const reviewDialog = DG.Dialog.create({'title': 'Review uploaded runs'});
    $(reviewDialog.root.querySelector('.d4-dialog-contents')).removeClass('ui-form');

    const saveToHistory = 'Save to history' as const;
    const simulateInputs = 'Simulate w/ same inputs' as const;
    const compareWithHistory = 'Compare w/ history' as const;
    const compareWithCurrent = 'Compare w/ current' as const;

    uploadDialog.add(uploadWidget.root);

    uploadDialog.addButton(saveToHistory, async () => {
      properUpdateIndicator(uploadDialog.root, true);

      uploadedFunccalls.forEach((call) => {
        if (call.options['immutable_tags'])
          call.options['immutable_tags'].push(EXPERIMENTAL_TAG);
        else
          call.options['immutable_tags'] = [EXPERIMENTAL_TAG];
      });

      return Promise.all(uploadedFunccalls.map(async (call) => {
        const valid = await this.getValidExpRun(call);

        return historyUtils.saveRun(valid);
      })).then((savedRuns) => {
        // SaveRun returns a funccall without an author
        return Promise.all(savedRuns.map((savedRun) => {
          return historyUtils.loadRun(savedRun.id);
        }));
      }).then((loadedRuns) =>{
        loadedRuns.forEach((run) => this.historyBlock!.addRun(run));
      }).catch((e) => {
        grok.shell.error(e);
      }).finally(() => {
        properUpdateIndicator(uploadDialog.root, false);

        uploadDialog.close();

        const uploadedRuns = new HistoricalRunsList(uploadedFunccalls, {
          fallbackText: 'No runs uploaded',
          showActions: true,
          showBatchActions: true,
        });

        reviewDialog.add(uploadedRuns);

        reviewDialog.show({modal: true, fullScreen: true});
      });
    });
    uploadDialog.addButton('Next', () => {
      uploadDialog.close();

      uploadedFunccalls.forEach((call) => {
        if (call.options['immutable_tags'])
          call.options['immutable_tags'].push(EXPERIMENTAL_TAG);
        else
          call.options['immutable_tags'] = [EXPERIMENTAL_TAG];
      });

      const uploadedRuns = new HistoricalRunsList(uploadedFunccalls, {
        fallbackText: 'No runs uploaded',
        showActions: true,
        showBatchActions: true,
      });

      reviewDialog.add(uploadedRuns.root);

      reviewDialog.show({modal: true, fullScreen: true});
    });
    $(uploadDialog.getButton('CANCEL')).hide();
    uploadDialog.getButton(saveToHistory).disabled = true;
    uploadDialog.getButton('Next').disabled = true;
    $(reviewDialog.getButton('CANCEL')).hide();

    reviewDialog.addButton(simulateInputs, () => {
      properUpdateIndicator(uploadDialog.root, true);
      Promise.all(uploadedFunccalls.map((call) => {
        const simulatingCall = this.func.prepare(deepCopy(call).inputs);
        return simulatingCall.call();
      })).then((calls)=> {
        simulatedFunccalls = calls;

        reviewDialog.close();

        getCompareDialog().show({modal: true, fullScreen: true});
      }).catch((e) => {
        grok.shell.error(e);
      }).finally(() => {
        properUpdateIndicator(uploadDialog.root, false);
      });
    });

    reviewDialog.addButton(compareWithHistory, () => {
      reviewDialog.close();

      getCompareDialog().show({modal: true, fullScreen: true});
    });

    const uploadSub = grok.functions.onAfterRunAction.pipe(
      filter((fc) => fc.id === uploadFuncCall.id),
    ).subscribe(() => {
      uploadedFunccalls = uploadFuncCall.outputs.uploadedCalls;

      uploadDialog.getButton(saveToHistory).disabled = false;
      uploadDialog.getButton('Next').disabled = false;
    });

    const closingSub = uploadDialog.onClose.subscribe(() => {
      this.isUploadMode.next(false);
    });

    uploadDialog.subs.push(closingSub, uploadSub);

    uploadDialog.show({modal: true, center: true, resizable: true});
  }

  protected override async onSaveClick(): Promise<void> {
    if (this.isUploadMode.value) {
      await this.saveExperimentalRun(this.funcCall);
      return;
    }

    await this.saveRun(this.funcCall);
  }

  buildRibbonPanels(): HTMLElement[][] {
    super.buildRibbonPanels();

    const play = ui.iconFA('play', async () => await this.doRun(), 'Run computations');
    play.classList.add('fas');

    const toggleUploadMode = ui.iconFA('arrow-to-top', async () => {
      if (this.uploadFunc) {
        await this.processCustomDataUpload();
        return;
      }

      this.isUploadMode.next(!this.isUploadMode.value);

      toggleUploadMode.classList.toggle('d4-current');
    }, 'Upload experimental data');
    toggleUploadMode.classList.add(
      'd4-toggle-button',
      ...this.isUploadMode.value ? ['d4-current']: [],
    );

    const sensitivityAnalysis = ui.iconFA('analytics', async () => await this.onSALaunch(), 'Run sensitivity analysis');

    const fitting = ui.iconFA('chart-line', async () => await this.onFittingLaunch(), 'Fit inputs');

    const contextHelpIcon = ui.iconFA('info', async () => {
      if (this.hasContextHelp) {
        grok.shell.windows.help.visible = true;
        // Workaround to deal with help panel bug
        await new Promise((resolve) => setTimeout(resolve, 100));
        grok.shell.windows.help.showHelp(ui.markdown((await this.getContextHelp())!));
      }
    });

    const newRibbonPanels = [[
      ...super.buildRibbonPanels().flat(),
      ...this.runningOnInput || this.options.isTabbed ? []: [play],
      ...this.hasUploadMode ? [toggleUploadMode]: [],
      ...this.isSaEnabled ? [sensitivityAnalysis]: [],
      ...this.isFittingEnabled ? [fitting]: [],
      ...this.hasContextHelp ? [contextHelpIcon]: [],
    ]];

    this.setRibbonPanels(newRibbonPanels);
    return newRibbonPanels;
  }

  // Main element of the output block. Stores all the tabs for the output and input
  private tabsElem = ui.tabControl();

  private showOutput() {
    ui.setDisplay(this.tabsElem.root, true);
    this._isOutputOutdated.next(false);
  }

  public buildOutputBlock(): HTMLElement {
    this.tabsElem.root.style.width = '100%';

    this.tabsLabels.forEach((tabLabel) => {
      const [tabParams, isInputTab] = this.categoryToDfParamMap.outputs[tabLabel] ? [this.categoryToDfParamMap.outputs[tabLabel], false] : [this.categoryToDfParamMap.inputs[tabLabel], true];

      const tabDfProps = tabParams.filter((p) => p.propertyType === DG.TYPE.DATA_FRAME || p.propertyType === DG.TYPE.GRAPHICS);
      const tabScalarProps = tabParams.filter((p) => p.propertyType !== DG.TYPE.DATA_FRAME && p.propertyType !== DG.TYPE.GRAPHICS);

      const parsedTabDfProps = tabDfProps.map((dfProp) => getPropViewers(dfProp).config);

      let prevDfBlockTitle = '';
      const dfBlocks = tabDfProps.reduce((acc, dfProp, dfIndex) => {
        this.dfToViewerMapping[dfProp.name] = [];

        const promisedViewers: Promise<{viewer: DG.Viewer, stub: HTMLElement}>[] = parsedTabDfProps[dfIndex].map(async (viewerDesc: {[key: string]: string | boolean}, _) => {
          const initialValue: DG.DataFrame =
            this.funcCall.outputs[dfProp.name]?.value ??
            this.funcCall.inputParams[dfProp.name]?.value ??
            grok.data.demo.demog(0);

          const viewerType = viewerDesc['type'] as string;
          const viewer = Object.values(viewerTypesMapping).includes(viewerType) ? DG.Viewer.fromType(viewerType, initialValue): await initialValue.plot.fromType(viewerType) as DG.Viewer;
          viewer.setOptions(viewerDesc);

          this.dfToViewerMapping[dfProp.name].push(viewer);
          this.afterOutputPropertyRender.next({prop: dfProp, output: viewer});

          const stub = getNoDataStub();
          // Workaround since viewers cannot work with null values instead of DF
          if (initialValue.rowCount === 0 && initialValue.name === 'demog 0') {
            ui.setDisplay(viewer.root, false);
            ui.setDisplay(stub, true);
          }

          return {viewer, stub};
        });

        const reactiveViewers = promisedViewers.map((promisedViewer, viewerIdx) => promisedViewer.then(({viewer: loadedViewer, stub}) => {
          const updateViewerSource = async () => {
            const currentParam =
              this.funcCall.outputParams[dfProp.name] ??
              this.funcCall.inputParams[dfProp.name];

            if (currentParam.value) {
              ui.setDisplay(loadedViewer.root, true);
              ui.setDisplay(stub, false);
              if (Object.values(viewerTypesMapping).includes(loadedViewer.type))
                loadedViewer.dataFrame = currentParam.value;
              else {
                // User-defined viewers (e.g. OutliersSelectionViewer) could created only asynchronously
                const newViewer = await currentParam.value.plot.fromType(loadedViewer.type) as DG.Viewer;
                loadedViewer.root.replaceWith(newViewer.root);
                loadedViewer = newViewer;
              }
              // Workaround for https://reddata.atlassian.net/browse/GROK-13884
              if (Object.keys(parsedTabDfProps[dfIndex][viewerIdx]).includes('color')) loadedViewer.setOptions({'color': parsedTabDfProps[dfIndex][viewerIdx]['color']});
              this.afterOutputPropertyRender.next({prop: dfProp, output: loadedViewer});
            } else {
              ui.setDisplay(loadedViewer.root, false);
              ui.setDisplay(stub, true);
            }
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

          return {loadedViewer, stub};
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
            this.showOutput();
            this.inputTabsLabels.forEach((inputTabName) => {
              $(this.tabsElem.getPane(inputTabName).header).show();
            });
          });
          this.subs.push(inputTabSub);
        }

        const wrappedViewers = reactiveViewers.map((promisedViewer, viewerIndex) => {
          const blockWidth: string | boolean | undefined = parsedTabDfProps[dfIndex][viewerIndex]['block'];
          const viewerWithStubRoot = ui.wait(async () => {
            const viewerWithStub = await promisedViewer;
            $(viewerWithStub.loadedViewer.root).css({
              'height': '100%',
              'width': '100%',
            });
            return ui.divV(
              [
                viewerWithStub.loadedViewer.root,
                viewerWithStub.stub,
              ],
              {style: {width: '100%'}},
            );
          });
          $(viewerWithStubRoot).css({
            'min-height': '300px',
            'flex-grow': '1',
          });

          return ui.divV([
            ui.h2(viewerIndex === 0 ? dfBlockTitle: ' ', {style: {'white-space': 'pre'}}),
            viewerWithStubRoot,
          ], {style: {...blockWidth ? {
            'width': `${blockWidth}%`,
            'max-width': `${blockWidth}%`,
            'max-height': '100%',
          } : {
            'flex-grow': '1',
          }}});
        });

        if (dfProp.propertyType === DG.TYPE.GRAPHICS) {
          const blockWidth = dfProp.options.block;
          const graphics = getNoDataStub();
          graphics.classList.add('grok-scripting-image-container');
          const graphicsWrapper = ui.divV([
            ui.h2(dfBlockTitle, {style: {'white-space': 'pre'}}),
            graphics,
          ], {style: {...blockWidth ? {
            'width': `${blockWidth}%`,
            'max-width': `${blockWidth}%`,
            'max-height': '100%',
          } : {
            'flex-grow': '1',
          }}});

          const updateGraphics = () => {
            const currentParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];

            if (currentParam.value) {
              graphics.style.backgroundImage = `url("data:image/png;base64,${currentParam.value}")`;
              graphics.textContent = '';
            } else {
              graphics.style.removeProperty('background-image');
              graphics.textContent = '[No data to display]';
            }
          };

          const paramSub = this.funcCallReplaced.pipe(
            startWith(null),
            switchMap(() => {
              const currentParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];
              return currentParam.onChanged.pipe(startWith(null));
            }),
            skip(1),
          ).subscribe(updateGraphics);
          this.subs.push(paramSub);
          acc.append(graphicsWrapper);
        }

        acc.append(...wrappedViewers);

        return acc;
      }, ui.divH([], {'style': {'flex-wrap': 'wrap', 'flex-grow': '1', 'max-height': '100%'}}));

      const generateScalarsTable = () => {
        const table = DG.HtmlTable.create(
          tabScalarProps,
          (scalarProp: DG.Property) => {
            const precision = scalarProp.options.precision;

            const scalarValue = precision && scalarProp.propertyType === DG.TYPE.FLOAT && this.funcCall.outputs[scalarProp.name] ?
              this.funcCall.outputs[scalarProp.name].toPrecision(precision):
              this.funcCall.outputs[scalarProp.name];

            const units = scalarProp.options['units'] ? ` [${scalarProp.options['units']}]`: ``;

            return [
              `${scalarProp.caption ?? scalarProp.name}${units}`,
              scalarValue ?? '[No value]',
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
        $(this.tabsElem.getPane(tabLabel).header).show();
      });
      this.subs.push(tableSub);

      this.tabsElem.addPane(tabLabel, () => {
        return ui.divV([
          ...tabDfProps.length ? [dfBlocks]: [],
          ...tabScalarProps.length ? [scalarsTable]: [],
        ]);
      });
    });

    const outputBlock = ui.box();
    outputBlock.append(this.tabsElem.root);

    return outputBlock;
  }

  public async onAfterLoadRun(loadedRun: DG.FuncCall) {
    this.showOutput();
  }

  // Stores mapping between DF and its' viewers
  private dfToViewerMapping: {[key: string]: DG.Viewer[]} = {};

  protected get tabsLabels() {
    return [
      ...this.inputTabsLabels,
      ...this.outputTabsLabels,
    ];
  }

  protected get outputTabsLabels() {
    return Object.keys(this.categoryToDfParamMap.outputs);
  }

  protected get inputTabsLabels() {
    return Object.keys(this.categoryToDfParamMap.inputs);
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

  private get inputsStorage() {
    return `RFV_LastInputs_${this.funcCall.func.name}`;
  };

  private async saveLastInputs() {
    try {
      const lastInputs = await wu(this.funcCall.inputParams.values()).reduce(async (acc, inputParam) => {
        const valueToSave = (inputParam.property.propertyType !== DG.TYPE.DATA_FRAME) ?
          this.funcCall.inputs[inputParam.name]:
          await grok.dapi.tables.uploadDataFrame(this.funcCall.inputs[inputParam.name]);

        return {
          ...(await acc),
          [inputParam.name]: JSON.stringify(valueToSave),
        };
      }, Promise.resolve({} as Record<string, any>));

      return await grok.dapi.userDataStorage.put(this.inputsStorage, lastInputs);
    } catch (e: any) {
      grok.shell.error(e.toString());
    }
  }

  private async loadLastInputs() {
    try {
      const valuesFromStorage = await grok.dapi.userDataStorage.get(this.inputsStorage);

      if (Object.keys(valuesFromStorage).length === 0) return null;

      const lastInputs = await wu(this.funcCall.inputParams.values()).reduce(async (acc, inputParam) => {
        const valueToLoad = (inputParam.property.propertyType !== DG.TYPE.DATA_FRAME) ?
          JSON.parse(valuesFromStorage[inputParam.name]):
          await grok.dapi.tables.getTable(JSON.parse(valuesFromStorage[inputParam.name]));

        return {
          ...(await acc),
          [inputParam.name]: valueToLoad,
        };
      }, Promise.resolve({} as Record<string, any>));

      return lastInputs;
    } catch (e: any) {
      grok.shell.error(e.toString());
    }
  }

  private async deleteLastInputs() {
    try {
      return await grok.dapi.userDataStorage.put(this.inputsStorage, {});
    } catch (e: any) {
      grok.shell.error(e.toString());
    }
  }

  public async doRun(): Promise<void> {
    this.isRunning.next(true);
    try {
      if (!this.options.isTabbed) await this.saveLastInputs();
      await this.run();
      if (!this.options.isTabbed) await this.deleteLastInputs();
    } catch (e: any) {
      grok.shell.error(e.toString());
      console.log(e);
    } finally {
      this.isRunning.next(false);
      this.validationRequests.next({isRevalidation: false, isNewOutput: true});
    }
  }

  public setExternalValidationResults(inputName: string, results: ValidationResult) {
    this.externalValidatorsState[inputName] = results;
    this.externalValidatorsUpdates.next(inputName);
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

  public getParamChanges<T = any>(name: string): Observable<T | null> {
    const ptype = this.funcCall['inputParams'][name] ? 'inputParams' : 'outputParams';
    return this.funcCallReplaced.pipe(
      startWith(null),
      filter(() => !!this.funcCall),
      switchMap(() => this.funcCall[ptype][name].onChanged.pipe(startWith(null))),
      map(() => this.funcCall[ptype][name].value as T),
    );
  }

  public getParamValue<T = any>(name: string): T | null {
    const ptype = this.funcCall?.['inputParams'][name] ? 'inputParams' : 'outputParams';
    return this.funcCall?.[ptype][name].value;
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

  private async onFittingLaunch(): Promise<void> {
    await Optimization.fromEmpty(this.func);
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
          if (!this.runningOnInput)
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
        funcCallInput.chosenRun ? extractValue(key): getDefaultValue(this.funcCall.inputParams[input].property),
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
      return ui.choiceInput(prop.caption ?? prop.name, getDefaultValue(prop), JSON.parse(prop.options.choices));

    switch (prop.propertyType as any) {
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

    const generateTooltip = () => {
      const desc = `${param.property.description ?? param.property.caption ?? param.property.name}.`;

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
    };
    ui.tooltip.bind(t.captionLabel, generateTooltip);
    ui.tooltip.bind(t.input, generateTooltip);
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
      const newValue = this.funcCall[field][name] ?? getDefaultValue(newParam.property) ?? null;
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
        this.isHistorical.next(false);

        this.hideOutput();
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
    if (this.isRunning.value || this.blockRuns.value)
      return false;

    return this.isValid();
  }

  public isValid() {
    for (const [_, v] of Object.entries(this.validationState)) {
      if (!isValidationPassed(v))
        return false;
    }
    for (const [_, v] of Object.entries(this.externalValidatorsState)) {
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
      this.updateInputValidationReuslts(inputName);
    }
  }

  private updateInputValidationReuslts(inputName: string) {
    const results = mergeValidationResults(this.validationState[inputName], this.externalValidatorsState[inputName]);
    const input = this.inputsMap[inputName];
    if (isFuncCallInputValidated(input))
      input.setValidation(results);
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

  private async getValidExpRun(expFuncCall: DG.FuncCall) {
    // Dirty hack to set readonly 'started' field
    const tempCall = await(await grok.functions.eval('Sin')).prepare({x: 1}).call();
    expFuncCall.dart.r2 = tempCall.dart.r2;

    const immutableTags = expFuncCall.options['immutable_tags'] || [];
    expFuncCall.options['immutable_tags'] = immutableTags.includes(EXPERIMENTAL_TAG) ? immutableTags: [...immutableTags, EXPERIMENTAL_TAG];

    expFuncCall.newId();

    return expFuncCall;
  }

  private async saveExperimentalRun(expFuncCall: DG.FuncCall) {
    const validExpRun = await this.getValidExpRun(expFuncCall);
    await this.saveRun(validExpRun);
  }

  private hideOutput() {
    this._isOutputOutdated.next(true);
    if (this.keepOutput())
      return;

    this.outputTabsLabels.forEach((label) => $(this.tabsElem.getPane(label)?.header).hide());

    const firstInputTab = this.tabsElem.panes
      .find((tab) => this.inputTabsLabels.includes(tab.name));
    if (firstInputTab)
      this.tabsElem.currentPane = firstInputTab;
    else
      $(this.tabsElem.root).hide();
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

        await DG.Utils.loadJsCss(['/js/common/exceljs.min.js']);
        //@ts-ignore
        const loadedExcelJS = window.ExcelJS as ExcelJS;
        const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const exportWorkbook = new loadedExcelJS.Workbook() as ExcelJS.Workbook;

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
            caption: scalarInput.options['caption'] ?? scalarInput.name,
            value: lastCall.inputs[scalarInput.name] ?? '',
            units: scalarInput.options['units'] ?? '',
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
            caption: scalarOutput.options['caption'] ?? scalarOutput.name,
            value: lastCall.outputs[scalarOutput.name] ?? '',
            units: scalarOutput.options['units'] ?? '',
          })));
        }

        const tabControl = this.tabsElem;

        for (const tabLabel of this.inputTabsLabels) {
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

        for (const tabLabel of this.outputTabsLabels) {
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

      const tabControl = this.tabsElem;

      await DG.Utils.loadJsCss(['/js/common/html2canvas.min.js']);
      //@ts-ignore
      const loadedHtml2canvas: typeof html2canvas = window.html2canvas;

      for (const tabLabel of this.tabsLabels.filter((label) => this.inputTabsLabels.includes(label))) {
        for (const inputProp of this.categoryToDfParamMap.inputs[tabLabel].filter((prop) => isDataFrame(prop))) {
          const nonGridViewers = this.dfToViewerMapping[inputProp.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID && viewer.type !== DG.VIEWER.STATISTICS)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          if (nonGridViewers.length === 0) continue;

          tabControl.currentPane = tabControl.getPane(tabLabel);
          await new Promise((r) => setTimeout(r, 100));

          for (const [i, viewer] of nonGridViewers.entries()) {
            const dataUrl = (await loadedHtml2canvas(viewer.root, {logging: false})).toDataURL();

            if (!jsonText[inputProp.name]) jsonText[inputProp.name] = {};

            jsonText[inputProp.name][i] = {dataUrl, width: viewer.root.clientWidth, height: viewer.root.clientHeight};
          }
        }
      }

      for (const tabLabel of this.tabsLabels.filter((label) => this.outputTabsLabels.includes(label))) {
        for (const outputProp of this.categoryToDfParamMap.outputs[tabLabel].filter((prop) => isDataFrame(prop))) {
          const nonGridViewers = this.dfToViewerMapping[outputProp.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID && viewer.type !== DG.VIEWER.STATISTICS)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          if (nonGridViewers.length === 0) continue;

          tabControl.currentPane = tabControl.getPane(tabLabel);
          await new Promise((r) => setTimeout(r, 100));

          for (const [i, viewer] of nonGridViewers.entries()) {
            const dataUrl = (await loadedHtml2canvas(viewer.root, {logging: false})).toDataURL();

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
