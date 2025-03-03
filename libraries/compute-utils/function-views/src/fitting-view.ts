/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {BehaviorSubject, Subject} from 'rxjs';
import {RunComparisonView} from './run-comparison-view';
import {combineLatest} from 'rxjs';
import {take, filter} from 'rxjs/operators';
import '../css/sens-analysis.css';
import {CARD_VIEW_TYPE} from '../../shared-utils/consts';
import {getDefaultValue, getPropViewers} from './shared/utils';
import {STARTING_HELP, TITLE, GRID_SIZE, METHOD, methodTooltip, LOSS, lossTooltip, FITTING_UI,
  DIFF_STUDIO_OUTPUT_IDX} from './fitting/constants';
import {getIndeces} from './fitting/fitting-utils';
import {performNelderMeadOptimization} from './fitting/optimizer';

import {nelderMeadSettingsVals, nelderMeadCaptions} from './fitting/optimizer-nelder-mead';
import {getErrors, getCategoryWidget} from './fitting/fitting-utils';
import {OptimizationResult, Extremum, distance} from './fitting/optimizer-misc';
import {getLookupChoiceInput} from './shared/lookup-tools';

import {IVP, IVP2WebWorker, PipelineCreator} from '@datagrok/diff-grok';
import {getFittedParams} from './fitting/diff-studio/nelder-mead';

const RUN_NAME_COL_LABEL = 'Run name' as const;
const supportedOutputTypes = [DG.TYPE.INT, DG.TYPE.BIG_INT, DG.TYPE.FLOAT, DG.TYPE.DATA_FRAME];
type OutputTarget = number | DG.DataFrame | null;

type InputWithValue<T = number> = {input: DG.InputBase, value: T};

type InputValues = {
  isChanging: BehaviorSubject<boolean>,
  const: InputWithValue<boolean | number | string | DG.DataFrame>,
  constForm: DG.InputBase[],
  saForm: DG.InputBase[],
}

type FittingNumericStore = {
  prop: DG.Property,
  type: DG.TYPE.INT | DG.TYPE.BIG_INT | DG.TYPE.FLOAT,
  min: InputWithValue,
  max: InputWithValue,
} & InputValues;

type FittingBoolStore = {
  prop: DG.Property,
  type: DG.TYPE.BOOL,
} & InputValues;

type FittingConstStore = {
  prop: DG.Property,
  type: Exclude<DG.TYPE, DG.TYPE.INT | DG.TYPE.BIG_INT | DG.TYPE.FLOAT | DG.TYPE.BOOL | DG.TYPE.STRING>,
} & InputValues;

/** Goodness of fit (GoF) viewer */
type GoFViewer = {
  caption: string,
  root: HTMLElement,
};

export type RangeDescription = {
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

export type TargetDescription = {
  default?: any;
  argumentCol?: string;
}

type FittingInputsStore = FittingNumericStore | FittingBoolStore | FittingConstStore;

export type DiffGrok = {
  ivp: IVP,
  ivpWW: IVP2WebWorker,
  pipelineCreator: PipelineCreator,
};

const getSwitchMock = () => ui.div([], 'sa-switch-input');

const isValidForFitting = (prop: DG.Property) => ((prop.propertyType === DG.TYPE.INT) || (prop.propertyType === DG.TYPE.FLOAT) || (prop.propertyType === DG.TYPE.DATA_FRAME));

export class FittingView {
  generateInputFields = (func: DG.Func) => {
    const getInputValue = (input: DG.Property, key: keyof RangeDescription) => {
      const range = this.options.ranges?.[input.name];
      if (range?.[key] != undefined)
        return range[key];
      return input.options[key] === undefined ? getDefaultValue(input) : Number(input.options[key]);
    };

    const getSwitchElement = (defaultValue: boolean, f: (v: boolean) => any, isInput: boolean = true) => {
      const input = ui.input.toggle(' ', {value: defaultValue, onValueChanged: (value) => f(value)});
      $(input.root).addClass('sa-switch-input');
      $(input.captionLabel).hide();

      ui.tooltip.bind(input.root, () => {
        if (isInput) {
          return (input.value) ?
            `Switch OFF fitting the input` :
            `Switch ON fitting the input`;
        } else {
          return !input.value ?
            `Mark the output as a target` :
            `Mark the output as not a target`;
        }
      });

      return input;
    };

    const inputs = func.inputs.reduce((acc, inputProp) => {
      const defaultValue = getInputValue(inputProp, 'default');

      if (inputProp.propertyType === DG.TYPE.FLOAT) {
        const isChangingInputMin = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateApplicabilityState();
        });

        const isChangingInputConst = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateApplicabilityState();
        });

        const caption = inputProp.caption ?? inputProp.name;

        const temp = {
          type: inputProp.propertyType,
          prop: inputProp,
          const: {
            input:
            (() => {
              const inp = ui.input.float(caption, {value: defaultValue, onValueChanged: (value) => {
                ref.const.value = value;
                this.updateApplicabilityState();
              }});
              inp.root.insertBefore(isChangingInputConst.root, inp.captionLabel);
              inp.addPostfix(inputProp.options['units']);
              inp.setTooltip(`Value of '${caption}'`);
              inp.nullable = false;
              return inp;
            })(),
            value: defaultValue,
          },
          min: {
            input:
              (() => {
                const inp = ui.input.float(`${caption} (min)`, {value: getInputValue(inputProp, 'min'), onValueChanged: (value) => {
                  (ref as FittingNumericStore).min.value = value;
                  this.updateApplicabilityState();
                }});
                inp.addValidator((s:string) => (Number(s) > temp.max.value) ? 'Greater than max': null);
                inp.root.insertBefore(isChangingInputMin.root, inp.captionLabel);
                inp.addPostfix(inputProp.options['units']);
                inp.setTooltip(`Min value '${caption}'`);
                inp.nullable = false;
                return inp;
              })(),
            value: getInputValue(inputProp, 'min'),
          },
          max: {
            input: (() => {
              const inp = ui.input.float(`${caption} (max)`, {value: getInputValue(inputProp, 'max'), onValueChanged: (value) => {
                (ref as FittingNumericStore).max.value = value;
                this.updateApplicabilityState();
              }});
              inp.addValidator((s:string) => (Number(s) < temp.min.value) ? 'Smaller than min': null);
              inp.addPostfix(inputProp.options['units']);
              inp.setTooltip(`Max value of '${caption}'`);
              inp.nullable = false;
              return inp;
            })(),
            value: getInputValue(inputProp, 'max'),
          },
          isChanging: new BehaviorSubject<boolean>(false),
        };

        [temp.max.input].forEach((input) => {
          input.root.insertBefore(getSwitchMock(), input.captionLabel);
          $(input.root).removeProp('display');
        });

        acc[inputProp.name] = {
          ...temp,
          constForm: [temp.const.input],
          saForm: [
            temp.min.input,
            temp.max.input,
          ],
        } as FittingNumericStore;

        const ref = acc[inputProp.name] as FittingNumericStore;
        ref.isChanging.subscribe((val) => {
          isChangingInputMin.notify = false;
          isChangingInputMin.value = val;
          isChangingInputMin.notify = true;

          isChangingInputConst.notify = false;
          isChangingInputConst.value = val;
          isChangingInputConst.notify = true;
        });
        combineLatest([
          temp.isChanging,
        ]).subscribe(([isChanging]) => {
          if (isChanging) {
            ref.constForm.forEach((input) => $(input.root).hide());
            ref.saForm.forEach((input) => $(input.root).css('display', 'flex'));
          } else {
            ref.constForm.forEach((input) => $(input.root).css('display', 'flex'));
            ref.saForm.forEach((input) => $(input.root).hide());
          }
        });
      } else {
        const switchMock = getSwitchMock();

        const tempDefault = {
          input: (() => {
            const temp = ui.input.forProperty(inputProp);
            temp.caption = inputProp.caption ?? inputProp.name;
            temp.onInput.subscribe(() => {
              tempDefault.value = temp.value;
              this.updateApplicabilityState();
            });
            temp.root.insertBefore(switchMock, temp.captionLabel);
            temp.addPostfix(inputProp.options['units']);
            temp.nullable = false;

            return temp;
          })(),
          value: defaultValue,
        };
        tempDefault.input.value = defaultValue;
        acc[inputProp.name] = {
          const: tempDefault,
          constForm: [tempDefault.input],
          saForm: [] as DG.InputBase[],
          type: inputProp.propertyType,
          prop: inputProp,
          isChanging: new BehaviorSubject(false),
        } as FittingConstStore;
      }

      return acc;
    }, {} as Record<string, FittingInputsStore>);

    const outputs = func.outputs.filter((prop) => supportedOutputTypes.includes(prop.propertyType))
      .reduce((acc, outputProp) => {
        const temp = {
          prop: outputProp,
          input:
          (() => {
            const caption = outputProp.caption ?? outputProp.name;
            const input = ui.input.forProperty(outputProp);
            input.addCaption(caption);
            input.value = 0;
            input.setTooltip(this.toSetSwitched ?
              'Target value' :
              (outputProp.propertyType === DG.TYPE.DATA_FRAME) ? 'Output dataframe' : 'Output scalar');
            input.input.hidden = !this.toSetSwitched;
            input.nullable = false;
            ui.tooltip.bind(input.captionLabel, (outputProp.propertyType === DG.TYPE.DATA_FRAME) ? 'Output dataframe' : 'Output scalar');

            if (this.options.targets?.[outputProp.name]?.default != null)
              setTimeout(() => input.value = this.options.targets?.[outputProp.name]?.default, 0);

            input.onChanged.subscribe((value) => {
              temp.target = input.value; // fixing the bug https://reddata.atlassian.net/browse/GROK-16642

              if (outputProp.propertyType === DG.TYPE.DATA_FRAME) {
                if (temp.target) {
                  const colNames: string[] = [];

                  for (const col of (input.value as DG.DataFrame).columns) {
                    if (col.type === DG.COLUMN_TYPE.FLOAT || col.type === DG.COLUMN_TYPE.INT)
                      colNames.push(col.name);
                  }

                  temp.colNameInput.items = colNames;
                  temp.colNameInput.value = this.options.targets?.[outputProp.name]?.argumentCol ?? colNames[0];
                } else {
                  temp.colNameInput.items = [null];
                  temp.colNameInput.value = null;
                }
              }

              this.updateApplicabilityState();
            });


            if (outputProp.propertyType === DG.TYPE.DATA_FRAME)
              (input.root.lastElementChild as HTMLDivElement).hidden = !this.toSetSwitched;

            const isInterestInput = getSwitchElement(
              this.toSetSwitched,
              (v: boolean) => {
                temp.isInterest.next(v);
                this.updateApplicabilityState();
                input.input.hidden = !v;
                input.setTooltip(v ? 'Target value' :
                  (outputProp.propertyType === DG.TYPE.DATA_FRAME) ? 'Output dataframe' : 'Output scalar');
                if (outputProp.propertyType === DG.TYPE.DATA_FRAME) {
                  (input.root.lastElementChild as HTMLDivElement).hidden = !v;
                  temp.colNameInput.root.hidden = !v;
                }
              },
              false,
            ).root;
            input.root.insertBefore(isInterestInput, input.captionLabel);

            return input;
          })(),
          colNameInput: (() => {
            const input = ui.input.choice<string|null>('argument', {value: null, items: [null], onValueChanged: (value) => {temp.colName = value!;}});
            input.setTooltip('Column with argument values');
            input.root.insertBefore(getSwitchMock(), input.captionLabel);
            input.root.hidden = outputProp.propertyType !== DG.TYPE.DATA_FRAME || !this.toSetSwitched;
            this.toSetSwitched = false;
            input.nullable = false;

            return input;
          })(),
          isInterest: new BehaviorSubject<boolean>(this.toSetSwitched),
          target: (outputProp.propertyType !== DG.TYPE.DATA_FRAME) ? 0 : null,
          colName: '',
        };

        acc[outputProp.name] = temp;

        return acc;
      }, {} as Record<string, {
      prop: DG.Property,
      input: DG.InputBase,
      isInterest: BehaviorSubject<boolean>,
      target: OutputTarget,
      colName: string,
      colNameInput: DG.InputBase,
    }>);

    return {inputs, outputs};
  };

  private readyToRun = false;
  private isFittingRunning = false;

  private runIcon = ui.iconFA('play', async () => {
    if (this.readyToRun) {
      this.isFittingRunning = true;
      this.updateApplicabilityState();
      this.updateRunIconDisabledTooltip('In progress...');

      await this.runOptimization();

      this.isFittingRunning = false;
      this.updateApplicabilityState();
    }
  });

  private acceptIcon = ui.iconFA('ballot-check', async () => {
    const choiceItems = Array.from({length: this.currentFuncCalls.length}, (_, i) => i + 1);
    let chosenItem = -1;
    const input = ui.input.choice('Select fitting', {items: choiceItems, onValueChanged: (x) => chosenItem = x});
    const confirmed = await new Promise((resolve, _reject) => {
      ui.dialog({title: 'Accept fitting'})
        .add(ui.div([input]))
        .onOK(() => resolve(true))
        .onCancel(() => resolve(false))
        .show({modal: true, fullScreen: true, width: 600, height: 200, center: true});
    });
    if (!confirmed || chosenItem < 0)
      return;

    this.acceptIcon.remove();
    const chosenCall = this.currentFuncCalls[chosenItem-1];
    this.isFittingAccepted = true;
    this.acceptedFitting$.next(chosenCall);
  });

  private helpIcon = ui.iconFA('question', () => {
    window.open('https://datagrok.ai/help/compute/function-analysis#parameter-optimization', '_blank');
  }, 'Open help in a new tab');

  private showFailsBtn = ui.button('Issues', () => {
    switch (this.method) {
    case METHOD.NELDER_MEAD:
      this.showNelderMeadFails();
      break;

    default:
      throw new Error(`Not implemented the '${this.method}' method`);
    }
  }, 'Show issues');

  private gridClickSubscription: any = null;
  private gridCellChangeSubscription: any = null;

  private failsDF: DG.DataFrame | null = null;

  private toSetSwitched = true;

  private samplesCount = FITTING_UI.SAMPLES;
  private samplesCountInput = ui.input.forProperty(DG.Property.fromOptions({
    name: TITLE.SAMPLES,
    inputType: 'Int',
    defaultValue: this.samplesCount,
    min: 1,
    max: 1000,
  }));
  private loss = LOSS.RMSE;
  private lossInput = ui.input.choice(TITLE.LOSS_LOW, {value: this.loss, items: [LOSS.MAD, LOSS.RMSE], onValueChanged: (value) => {
    this.loss = value;
    this.lossInput.setTooltip(lossTooltip.get(this.loss)!);
  }});
  private similarity = FITTING_UI.SIMILARITY_DEFAULT;
  private similarityInput = ui.input.forProperty(DG.Property.fromOptions({
    name: TITLE.SIMILARITY,
    inputType: 'Float',
    defaultValue: this.similarity,
    min: 0,
  }));

  // Auxiliary dock nodes with results
  private helpDN: DG.DockNode | undefined = undefined;

  private method = METHOD.NELDER_MEAD;
  private methodInput = ui.input.choice(TITLE.METHOD, {value: this.method, items: [METHOD.NELDER_MEAD], onValueChanged: (value) => {
    this.method = value;
    this.showHideSettingInputs();
    this.methodInput.setTooltip(methodTooltip.get(this.method)!);
  }});

  // The Nelder-Mead method settings
  private nelderMeadSettings = new Map<string, number>();

  // Gradient descent settings
  private gradDescentSettings = {
    iterCount: 10,
    learningRate: 0.0001,
  };

  private settingsInputs = new Map<METHOD, DG.InputBase[]>();

  store = this.generateInputFields(this.func);
  comparisonView!: DG.TableView;

  private fittingSettingsIcon = ui.iconFA('cog', () => {
    const prevState = this.fittingSettingsDiv.hidden;
    this.fittingSettingsDiv.hidden = !prevState;
  }, 'Modify fitting settings');

  private fittingSettingsDiv = ui.divV([]);

  private diffGrok: DiffGrok | undefined = undefined;

  private currentFuncCalls: DG.FuncCall[] = [];
  private isFittingAccepted = false;
  public acceptedFitting$ = new Subject<DG.FuncCall | null>();

  static async fromEmpty(
    func: DG.Func,
    options: {
      parentView?: DG.View,
      parentCall?: DG.FuncCall,
      inputsLookup?: string,
      ranges?: Record<string, RangeDescription>,
      targets?: Record<string, TargetDescription>,
      acceptMode?: boolean,
      diffGrok?: DiffGrok,
    } = {
      parentView: undefined,
      parentCall: undefined,
      inputsLookup: undefined,
      ranges: undefined,
      targets: undefined,
      acceptMode: false,
      diffGrok: undefined,
    },
  ) {
    const cardView = [...grok.shell.views].find((view) => view.type === CARD_VIEW_TYPE);

    const v = await RunComparisonView.fromComparedRuns([], func,
      {
        parentView: cardView,
        parentCall: options.parentCall,
      });
    grok.shell.addView(v);

    return new this(
      func,
      v,
      options,
    );
  }

  private constructor(
    public func: DG.Func,
    baseView: RunComparisonView,
    public options: {
      parentView?: DG.View,
      parentCall?: DG.FuncCall,
      configFunc?: undefined,
      inputsLookup?: string,
      ranges?: Record<string, RangeDescription>,
      targets?: Record<string, TargetDescription>,
      acceptMode?: boolean,
      diffGrok?: DiffGrok,
    } = {
      parentView: undefined,
      parentCall: undefined,
      configFunc: undefined,
      inputsLookup: undefined,
      ranges: undefined,
      targets: undefined,
      acceptMode: false,
      diffGrok: undefined,
    },
  ) {
    if (!this.isOptimizationApplicable(func)) {
      grok.shell.warning('Fitting is not applicable: the function has no scalar outputs.');
      baseView.close();
      return;
    }

    grok.events.onViewRemoved.pipe(filter((v) => v.id === baseView.id), take(1)).subscribe(() => {
      if (options.acceptMode && !this.isFittingAccepted) {
        this.acceptedFitting$.next(null);
        this.isFittingAccepted = true;
      }
    });

    this.buildForm(options.inputsLookup).then((form) => {
      this.comparisonView = baseView;

      this.comparisonView.dockManager.dock(
        form,
        DG.DOCK_TYPE.LEFT,
        null,
        `${this.func.name} - Fitting`,
        0.25,
      );

      this.comparisonView.grid.columns.byName(RUN_NAME_COL_LABEL)!.visible = false;

      nelderMeadSettingsVals.forEach((vals, key) => this.nelderMeadSettings.set(key, vals.default));

      const rbnPanels = this.comparisonView.getRibbonPanels();
      rbnPanels.push([this.helpIcon, this.runIcon, ...(this.options.acceptMode ? [this.acceptIcon] : [])]);
      this.comparisonView.setRibbonPanels(rbnPanels);
      this.fittingSettingsDiv.hidden = true;

      this.comparisonView.name = this.comparisonView.name.replace('comparison', 'fitting');
      this.comparisonView.helpUrl = '/help/compute/function-analysis#parameter-optimization';
      const helpMD = ui.markdown(STARTING_HELP);
      helpMD.style.padding = '10px';
      helpMD.style.overflow = 'auto';
      this.helpDN = this.comparisonView.dockManager.dock(
        helpMD,
        DG.DOCK_TYPE.FILL,
        this.comparisonView.dockManager.findNode(this.comparisonView.grid.root),
        'About',
      );
      this.methodInput.setTooltip(methodTooltip.get(this.method)!);
      ui.tooltip.bind(this.methodInput.captionLabel, 'Method for minimizing the loss function');
      this.lossInput.setTooltip(lossTooltip.get(this.loss)!);
      ui.tooltip.bind(this.lossInput.captionLabel, 'Loss function type');

      this.showFailsBtn.style.padding = '0px';

      this.samplesCountInput.addCaption(TITLE.SAMPLES);
      this.samplesCountInput.onChanged.subscribe((value) => {
        this.samplesCount = value;
        this.updateApplicabilityState();
      });
      this.samplesCountInput.setTooltip('Number of points to be found');

      this.similarityInput.onChanged.subscribe((value) => {
        this.similarity = value;
        this.updateApplicabilityState();
      });
      this.similarityInput.addCaption(TITLE.SIMILARITY);
      this.similarityInput.setTooltip('The higher the value, the fewer points will be found');
      ui.tooltip.bind(this.similarityInput.captionLabel, `Max scaled deviation between similar fitted points`);

      this.updateRunIconStyle();
      this.updateRunIconDisabledTooltip('Select inputs for fitting');
      this.runIcon.classList.add('fas');
    });

    this.diffGrok = options.diffGrok;
  } // constructor

  /** Check fiiting applicability to the function */
  private isOptimizationApplicable(func: DG.Func): boolean {
    for (const output of func.outputs) {
      if (isValidForFitting(output))
        return true;
    }

    return false;
  } // isOptimizationApplicable

  /** Generate UI for the Nelder-Mead method settings */
  private generateNelderMeadSettingsInputs(): void {
    const inputs: DG.InputBase[] = [];

    nelderMeadSettingsVals.forEach((vals, key) => {
      const inp = ui.input.forProperty(DG.Property.fromOptions({
        name: nelderMeadCaptions.get(key),
        inputType: (key !== 'maxIter') ? 'Float' : 'Int',
        defaultValue: vals.default,
        min: vals.min,
        max: vals.max,
      }));

      inp.addCaption(nelderMeadCaptions.get(key)!);
      inp.nullable = false;

      inp.onChanged.subscribe((value) => {
        this.nelderMeadSettings.set(key, value);
        this.updateApplicabilityState();
      });

      inputs.push(inp);
    });

    this.settingsInputs.set(METHOD.NELDER_MEAD, inputs);
  } // generateNelderMeadSettingsInputs

  /** Check correctness of the Nelder-Mead settings */
  private areNelderMeadSettingsCorrect(): boolean {
    for (const [key, val] of this.nelderMeadSettings) {
      if ((val === null) || (val === undefined) || (val > nelderMeadSettingsVals.get(key)!.max) || (val < nelderMeadSettingsVals.get(key)!.min)) {
        this.updateRunIconDisabledTooltip(`Invalid "${key}": check method settings`);
        return false;
      }
    }

    return true;
  }

  /** Generate UI for the gradient descent method */
  private generateGradDescentSettingsInputs(): void {
    const iterInp = ui.input.forProperty(DG.Property.fromOptions({
      name: 'iterations',
      inputType: 'Int',
      defaultValue: this.gradDescentSettings.iterCount,
      min: 1,
      max: 10000,
    }));
    iterInp.onChanged.subscribe((value) => this.gradDescentSettings.iterCount = value);

    const learningRateInp = ui.input.forProperty(DG.Property.fromOptions({
      name: 'Learning rate',
      inputType: 'Float',
      defaultValue: this.gradDescentSettings.learningRate,
      min: 1e-6,
      max: 1000,
    }));
    learningRateInp.onChanged.subscribe((value) => this.gradDescentSettings.learningRate = value);

    this.settingsInputs.set(METHOD.GRAD_DESC, [iterInp, learningRateInp]);
  } // generateGradDescentSettingsInputs

  /** Check correctness of the gradient descent settings */
  private areGradDescentSettingsCorrect(): boolean {
    return false;
  }

  /** Check correctness of the method settings */
  private areMethodSettingsCorrect(): boolean {
    switch (this.method) {
    case METHOD.NELDER_MEAD:
      return this.areNelderMeadSettingsCorrect();

    case METHOD.GRAD_DESC:
      return this.areGradDescentSettingsCorrect();

    default:
      return true;
    }
  } // areMethodSettingsCorrect

  /** Create UI for each method */
  private generateSettingInputs(): void {
    this.generateNelderMeadSettingsInputs();
    this.generateGradDescentSettingsInputs();
  }

  /** Show settings UI of the current method */
  private showHideSettingInputs(): void {
    this.settingsInputs.forEach((inputsArray, method) => inputsArray.forEach((input) => input.root.hidden = method !== this.method));
  }

  private async getLookupElement(inputsLookup?: string) {
    if (inputsLookup === undefined)
      return null;

    const constIputs = new Map<string, DG.InputBase>();
    Object.keys(this.store.inputs).forEach((name) => constIputs.set(name, this.store.inputs[name].constForm[0]));

    const lookupElement = await getLookupChoiceInput(inputsLookup, constIputs);

    if (lookupElement !== null)
      lookupElement.input.root.insertBefore(getSwitchMock(), lookupElement.input.captionLabel);

    return lookupElement;
  }

  /** Build form with inputs */
  private async buildForm(inputsLookup?: string) {
    //1. Inputs of the function
    const fitHeader = ui.h1(TITLE.FIT);
    ui.tooltip.bind(fitHeader, 'Select inputs to be fitted');

    // inputs grouped by categories
    const inputsByCategories = new Map<string, HTMLElement[]>([['Misc', []]]);

    // group inputs by categories
    Object.values(this.store.inputs).forEach((inputConfig) => {
      const category = inputConfig.prop.category;
      const roots = [...inputConfig.constForm.map((input) => input.root), ...inputConfig.saForm.map((input) => input.root)];

      if (inputsByCategories.has(category))
        inputsByCategories.get(category)!.push(...roots);
      else
        inputsByCategories.set(category, roots);
    });

    // the main form
    const form = ui.div([fitHeader], {style: {overflowY: 'scroll', width: '100%'}});

    const lookupElement = await this.getLookupElement(inputsLookup);
    let topCategory: string | null = null;

    if (lookupElement !== null) {
      const inputs = inputsByCategories.get(lookupElement.category);
      topCategory = lookupElement.category;

      if (inputs !== undefined)
        inputsByCategories.set(topCategory, [lookupElement.input.root].concat(inputs));
      else
        inputsByCategories.set(topCategory, [lookupElement.input.root]);
    }

    // add inputs to the main form (grouped by categories)
    if (inputsByCategories.size > 1) {
      if (topCategory !== null) {
        const roots = inputsByCategories.get(topCategory);
        form.append(getCategoryWidget(topCategory, roots!));
        form.append(...roots!);
      }

      inputsByCategories.forEach((roots, category) => {
        if ((category !== 'Misc') && (category !== topCategory)) {
          form.append(getCategoryWidget(category, roots));
          form.append(...roots);
        }
      });

      if (topCategory !== 'Misc') {
        const miscRoots = inputsByCategories.get('Misc');

        if (miscRoots!.length > 0) {
          const roots = inputsByCategories.get('Misc')!;
          form.append(getCategoryWidget('Misc', roots));
          form.append(...roots);
        }
      }
    } else
      form.append(...inputsByCategories.get('Misc')!);

    // 2. Outputs of the function
    const toGetHeader = ui.h1(TITLE.TARGET);
    ui.tooltip.bind(toGetHeader, 'Select target outputs');
    form.appendChild(toGetHeader);
    let prevCategory = 'Misc';

    Object.values(this.store.outputs)
      .reduce((container, outputConfig) => {
        const prop = outputConfig.prop;
        if (prop.category !== prevCategory) {
          container.append(ui.h3(prop.category));
          prevCategory = prop.category;
        }

        container.append(outputConfig.input.root);
        container.append(outputConfig.colNameInput.root);

        return container;
      }, form);

    // 3. Make one output of interest
    let isAnyOutputSelectedAsOfInterest = false;

    for (const name of Object.keys(this.store.outputs)) {
      if (this.store.outputs[name].isInterest.value === true) {
        isAnyOutputSelectedAsOfInterest = true;
        break;
      }
    }

    if (!isAnyOutputSelectedAsOfInterest) {
      const firstOutput = this.store.outputs[Object.keys(this.store.outputs)[0]];
      firstOutput.isInterest.next(true);
    }

    // 4. Method & settings block
    const usingHeader = ui.h1('Using');
    ui.tooltip.bind(usingHeader, 'Specify fitting method');
    form.appendChild(usingHeader);
    this.methodInput.root.insertBefore(this.fittingSettingsIcon, this.methodInput.captionLabel);
    this.fittingSettingsIcon.style.minWidth = '50px';
    form.appendChild(this.methodInput.root);

    const settingsHeader = ui.h2('with settings');
    ui.tooltip.bind(settingsHeader, () => `Settings of the ${this.method} method`);
    this.fittingSettingsDiv.appendChild(settingsHeader);
    this.generateSettingInputs();
    this.showHideSettingInputs();
    form.appendChild(this.fittingSettingsDiv);
    this.settingsInputs.forEach((array) => array.forEach((input) => {
      input.root.insertBefore(getSwitchMock(), input.captionLabel);
      this.fittingSettingsDiv.append(input.root);
    }));

    // Add general settings
    [this.lossInput, this.samplesCountInput, this.similarityInput].forEach((inp) => {
      inp.root.insertBefore(getSwitchMock(), inp.captionLabel);
      inp.nullable = false;
      form.appendChild(inp.root);
    });

    $(form).addClass('ui-form');

    this.updateApplicabilityState();

    $(form).css({
      'padding-left': '12px',
      'overflow-y': 'scroll',
      'padding-right': '4px',
    });
    return form;
  } // buildForm

  /** Update run icon tooltip: disabled case */
  private updateRunIconDisabledTooltip(msg: string): void {
    ui.tooltip.bind(this.runIcon, () => {
      const label = ui.label(msg);
      label.style.color = '#FF0000';
      return label;
    });
  } // updateRunIconDisabledTooltip

  /** Check applicability of fitting */
  private updateApplicabilityState(): void {
    this.readyToRun = this.canFittingBeRun() && (!this.isFittingRunning);
    this.updateRunIconStyle();
  } // updateApplicabilityState

  private updateRunIconStyle(): void {
    if (this.readyToRun) {
      this.runIcon.style.color = 'var(--green-2)';
      ui.tooltip.bind(this.runIcon, 'Run fitting');
    } else
      this.runIcon.style.color = 'var(--grey-3)';
  } // updateRunIconStyle

  /** Check inputs */
  private areInputsReady(): boolean {
    let isAnySelected = false;
    let areSelectedFilled = true;
    let cur: boolean;

    for (const propName of Object.keys(this.store.inputs)) {
      const input = this.store.inputs[propName];
      const caption = input.prop.caption ?? input.prop.name;

      if (input.isChanging.value === true) {
        isAnySelected = true;
        const minInp = (input as FittingNumericStore).min.input;
        const maxInp = (input as FittingNumericStore).max.input;
        const min = minInp.value;
        const max = maxInp.value;

        cur = (min !== null) && (min !== undefined) && (max !== undefined) && (max !== undefined);

        if (cur) {
          if (min > max) {
            cur = false;
            this.updateRunIconDisabledTooltip(`Invalid min & max of "${caption}"`);
            minInp.input.classList.add('d4-invalid');
            maxInp.input.classList.add('d4-invalid');
          } else {
            minInp.input.classList.remove('d4-invalid');
            maxInp.input.classList.remove('d4-invalid');
          }
        } else
          this.updateRunIconDisabledTooltip(`Incomplete "${caption}"`);

        areSelectedFilled = areSelectedFilled && cur;
      } else {
        const val = input.const.input.value;
        cur = (val !== null) && (val !== undefined);

        if (!cur)
          this.updateRunIconDisabledTooltip(`Incomplete "${caption}"`);

        areSelectedFilled = areSelectedFilled && cur;
      }
    }

    if (!isAnySelected)
      this.updateRunIconDisabledTooltip(`No parameters for fitting selected`);

    return isAnySelected && areSelectedFilled;
  } // areInputsReady

  /** Check outputs */
  private areOutputsReady(): boolean {
    let isAnySelected = false;
    let areSelectedFilled = true;
    let cur: boolean;

    for (const propName of Object.keys(this.store.outputs)) {
      const output = this.store.outputs[propName];

      if (output.isInterest.value === true) {
        isAnySelected = true;
        const val = output.input.value;
        cur = (val !== null) && (val !== undefined);

        if (output.prop.propertyType === DG.TYPE.DATA_FRAME)
          cur = cur && (output.colNameInput.value !== null) && (output.colName !== '');

        if (!cur)
          this.updateRunIconDisabledTooltip(`Incomplete the "${output.input.caption}" target`);

        areSelectedFilled = areSelectedFilled && cur;
      }
    }

    if (!isAnySelected)
      this.updateRunIconDisabledTooltip(`No targets selected`);

    return isAnySelected && areSelectedFilled;
  } // areOutputsReady

  /** Check samples count */
  private isSamplesCountValid(): boolean {
    if (this.samplesCount > 0)
      return true;

    this.updateRunIconDisabledTooltip(`Invalid "${TITLE.SAMPLES}"`);
    return false;
  } // isSamplesCountValid

  /** Check similarity */
  private isSimilarityValid(): boolean {
    if (this.similarity >= FITTING_UI.SIMILARITY_MIN)
      return true;

    this.updateRunIconDisabledTooltip(`Invalid "${TITLE.SIMILARITY}"`);
    return false;
  } // isSamplesCountValid

  /** Check inputs/outputs/settings */
  private canFittingBeRun(): boolean {
    return this.areInputsReady() && this.areOutputsReady() &&
      this.isSamplesCountValid() && this.areMethodSettingsCorrect() && this.isSimilarityValid();
  }

  /** Return names of the fixed inputs */
  private getFixedInputs() {
    return Object.keys(this.store.inputs).filter((propName) => !this.store.inputs[propName].isChanging.value);
  }

  /** Return names of the fitted inputs */
  private getFittedInputs() {
    return Object.keys(this.store.inputs)
      .filter((propName) => (this.store.inputs[propName].type === DG.TYPE.FLOAT) && this.store.inputs[propName].isChanging.value);
  }

  /** Perform optimization */
  private async runOptimization(): Promise<void> {
    try {
    // check applicability
      if (!this.canFittingBeRun())
        return;

      if (this.samplesCount < 1)
        return;

      if (this.similarity < FITTING_UI.SIMILARITY_MIN)
        return;

      this.failsDF = null;

      // inputs of the source function
      const inputs: any = {};

      // add fixed inputs
      const fixedInputs = this.getFixedInputs();
      fixedInputs.forEach((name) => inputs[name] = this.store.inputs[name].const.value);

      // get varied inputs, optimization is performed with respect to them
      const variedInputs = this.getFittedInputs();
      const dim = variedInputs.length;

      // varied inputs specification
      const variedInputNames: string[] = [];
      const minVals = new Float32Array(dim);
      const maxVals = new Float32Array(dim);
      const variedInputsCaptions = new Array<string>(dim);

      // set varied inputs specification
      variedInputs.forEach((name, idx) => {
        const propConfig = this.store.inputs[name] as FittingNumericStore;
        minVals[idx] = propConfig.min.value ?? 0;
        maxVals[idx] = propConfig.max.value ?? 0;
        variedInputNames.push(name);
        variedInputsCaptions[idx] = propConfig.prop.caption ?? propConfig.prop.name;
      });

      // get selected output
      const outputsOfInterest = this.getOutputsOfInterest();
      const outputsCount = outputsOfInterest.length;
      if (outputsCount < 1) {
        grok.shell.error('No output is selected for optimization.');
        return;
      }

      const toShowTableName = outputsOfInterest.map((item) => item.prop.propertyType).filter((type) => type === DG.TYPE.DATA_FRAME).length > 1;

      /** Get call funcCall with the specified inputs */
      const getCalledFuncCall = async (x: Float32Array): Promise<DG.FuncCall> => {
        x.forEach((val, idx) => inputs[variedInputNames[idx]] = val);
        const funcCall = this.func.prepare(inputs);
        return await funcCall.call();
      };

      /** Root mean sqaure error (RMSE) cost function */
      const rmseCostFunc = async (x: Float32Array): Promise<number> => {
        x.forEach((val, idx) => inputs[variedInputNames[idx]] = val);
        const funcCall = this.func.prepare(inputs);
        const calledFuncCall = await funcCall.call();

        let sumOfSquaredErrors = 0;
        let outputsCount = 0;
        let cur = 0;

        outputsOfInterest.forEach((output) => {
          if (output.prop.propertyType !== DG.TYPE.DATA_FRAME) {
            cur = output.target as number;
            sumOfSquaredErrors += ((cur - calledFuncCall.getParamValue(output.prop.name)) / (cur !== 0 ? cur : 1)) ** 2;
            ++outputsCount;
          } else {
            getErrors(output.colName, output.target as DG.DataFrame, calledFuncCall.getParamValue(output.prop.name), true)
              .forEach((err) => {
                sumOfSquaredErrors += err ** 2;
                ++outputsCount;
              });
          }
        });

        return Math.sqrt(sumOfSquaredErrors / outputsCount);
      };

      /** Maximum absolute deviation (MAD) cost function */
      const madCostFunc = async (x: Float32Array): Promise<number> => {
        x.forEach((val, idx) => inputs[variedInputNames[idx]] = val);
        const funcCall = this.func.prepare(inputs);
        const calledFuncCall = await funcCall.call();

        let mad = 0;

        outputsOfInterest.forEach((output) => {
          if (output.prop.propertyType !== DG.TYPE.DATA_FRAME)
            mad = Math.max(mad, Math.abs(output.target as number - calledFuncCall.getParamValue(output.prop.name)));
          else {
            getErrors(output.colName, output.target as DG.DataFrame, calledFuncCall.getParamValue(output.prop.name), false)
              .forEach((err) => mad = Math.max(mad, Math.abs(err)));
          }
        });

        return mad;
      };

      let costFunc;
      let costTooltip;

      if (this.loss === LOSS.MAD) {
        costFunc = madCostFunc;
        costTooltip = 'maximum absolute devation';
      } else {
        costFunc = rmseCostFunc;
        costTooltip = 'root mean square error';
      }

      let optResult: OptimizationResult;

      // Perform optimization
      if (this.method === METHOD.NELDER_MEAD) {
        if (this.diffGrok !== undefined) {
          optResult = await getFittedParams(
            this.loss,
            this.diffGrok.ivp,
            this.diffGrok.ivpWW,
            this.diffGrok.pipelineCreator,
            this.nelderMeadSettings,
            variedInputNames,
            minVals,
            maxVals,
            inputs,
            outputsOfInterest[DIFF_STUDIO_OUTPUT_IDX].colName,
            outputsOfInterest[DIFF_STUDIO_OUTPUT_IDX].target as DG.DataFrame,
            this.samplesCount,
          );
        } else
          optResult = await performNelderMeadOptimization(costFunc, minVals, maxVals, this.nelderMeadSettings, this.samplesCount);
      } else
        throw new Error(`Not implemented the '${this.method}' method`);

      const allExtremums = optResult.extremums;
      const allExtrCount = allExtremums.length;

      // Process fails
      if (allExtrCount < this.samplesCount) {
        this.failsDF = optResult.fails;
        const cols = this.failsDF!.columns;

        variedInputsCaptions.forEach((cap, idx) => cols.byIndex(idx).name = cols.getUnusedName(cap));

        fixedInputs.forEach((name) => {
          const inp = this.store.inputs[name];

          if (inp.prop.propertyType === DG.TYPE.DATA_FRAME)
            return;

          cols.add(DG.Column.fromList(
            inp.prop.propertyType as unknown as DG.COLUMN_TYPE,
            cols.getUnusedName(inp.prop.caption ?? inp.prop.name),
            new Array(this.failsDF?.rowCount).fill(inp.const.value),
          ));
        });
      }

      const extremums: Extremum[] = [];
      const dist = this.similarity;

      allExtremums.forEach((extr) => {
        let toPush = true;

        extremums.forEach((cur) => toPush &&= (distance(cur.point, extr.point, minVals, maxVals) > dist));

        if (toPush)
          extremums.push(extr);
      });

      const rowCount = extremums.length;

      // Show info/warning reporting results
      if (allExtrCount < this.samplesCount) {
        if (allExtrCount < 1) {
          grok.shell.warning(ui.divV([
            ui.label(`Failed to find ${this.samplesCount} point${this.samplesCount > 1 ? 's' : ''}`),
            ui.div([this.showFailsBtn]),
          ]));

          return;
        } else {
          grok.shell.info(ui.divV([
            ui.label(`Found ${rowCount} point${rowCount > 1 ? 's' : ''}`),
            ui.div([this.showFailsBtn]),
          ]));
        }
      } else
        grok.shell.info(`Found ${rowCount} point${rowCount > 1 ? 's' : ''}`);

      this.clearPrev();
      extremums.sort((a: Extremum, b: Extremum) => a.cost - b.cost);

      const lossVals = new Float32Array(rowCount);
      const grid = this.comparisonView.grid;
      const gofViewers = new Array<Map<string, HTMLElement>>(rowCount);
      const calledFuncCalls = new Array<DG.FuncCall>(rowCount);
      const lossFuncGraphRoots = new Array<HTMLElement>(rowCount);
      const tooltips = new Map([[TITLE.LOSS as string, `The final loss obtained: ${costTooltip}`]]);
      let toAddGofCols = true;
      const outputColNames: string[] = [];

      this.currentFuncCalls = calledFuncCalls;

      extremums.forEach(async (extr, idx) => {
        lossVals[idx] = extr.cost;
        const lossRoot = this.getLossGraph(extr);
        lossFuncGraphRoots[idx] = lossRoot;

        const gofElems = new Map<string, HTMLElement>();
        const calledFuncCall = await getCalledFuncCall(extr.point);
        calledFuncCalls[idx] = calledFuncCall;
        outputsOfInterest.forEach((output) => {
          const gofs = this.getOutputGof(output.prop, output.target, calledFuncCall, output.colName, toShowTableName);
          gofs.forEach((item) => gofElems.set(item.caption, item.root));
        });
        gofViewers[idx] = gofElems;

        if (toAddGofCols) {
          gofElems.forEach((_, name) => {
            tooltips.set(name, 'Goodness of fit');
            this.comparisonView.table?.columns.addNew(name, DG.COLUMN_TYPE.STRING);
            const gridCol = this.comparisonView.grid.columns.byName(name);
            gridCol!.cellType = 'html';
            gridCol!.width = GRID_SIZE.GOF_VIEWER_WIDTH;
            outputColNames.push(name);
          });
          toAddGofCols = false;
        }
      });

      // Add fitting results to the table: iteration & loss
      const reportTable = DG.DataFrame.fromColumns([DG.Column.fromFloat32Array(TITLE.LOSS, lossVals)]);
      this.comparisonView.dataFrame = reportTable;
      const reportColumns = reportTable.columns;

      // Add fitting results to the table: fitted parameters
      variedInputsCaptions.forEach((cap, idx, arr) => {
        cap = reportColumns.getUnusedName(cap);
        arr[idx] = cap;
        const raw = new Float32Array(rowCount);

        for (let j = 0; j < rowCount; ++j)
          raw[j] = extremums[j].point[idx];

        reportColumns.add(DG.Column.fromFloat32Array(cap, raw));
        tooltips.set(cap, `Obtained values of '${cap}'`);
      });

      // Set properties of the grid
      grid.props.rowHeight = GRID_SIZE.ROW_HEIGHT;
      grid.props.showAddNewRowIcon = false;
      grid.props.allowEdit = false;

      // Add linecharts of loss function
      const lossGraphColName = reportColumns.getUnusedName(`${this.loss} by iterations`);
      tooltips.set(lossGraphColName, `Minimizing ${costTooltip}`);
      reportColumns.addNew(lossGraphColName, DG.COLUMN_TYPE.STRING);
      const lossFuncGraphGridCol = grid.columns.byName(lossGraphColName);
      lossFuncGraphGridCol!.cellType = 'html';
      lossFuncGraphGridCol!.width = GRID_SIZE.LOSS_GRAPH_WIDTH;

      // Add viewers to the grid
      let toReorderCols = true;

      grid.onCellPrepare(async (gc: DG.GridCell) => {
        if (toReorderCols) {
          grid.columns.setOrder(reportColumns.names().filter((name) => name !== lossGraphColName).concat([lossGraphColName]));
          toReorderCols = false;
        }

        if (gc.isColHeader || gc.isRowHeader) return;

        if (gc.isTableCell && gc.gridColumn.name === lossGraphColName && gc.cell.value !== null)
          gc.style.element = lossFuncGraphRoots[gc.gridRow];

        outputColNames.forEach((name) => {
          if (gc.isTableCell && gc.gridColumn.name === name && gc.cell.value !== null && gofViewers[gc.gridRow] !== undefined)
            gc.style.element = gofViewers[gc.gridRow].get(name) ?? ui.label('');
        });
      });

      // Set loss-column format & sort by loss-vals
      grid.columns.byName(TITLE.LOSS)!.format = 'scientific';
      grid.columns.byName(TITLE.LOSS)!.width = GRID_SIZE.LOSS_COL_WIDTH;

      // Add tooltips
      grid.onCellTooltip(function(cell, x, y) {
        if (cell.isColHeader) {
          const cellCol = cell.tableColumn;
          if (cellCol) {
            const name = cell.tableColumn.name;
            const msg = tooltips.get(name);
            ui.tooltip.show(msg ?? '', x, y);
            return true;
          }
        }
      });

      // Set current row with min loss
      reportTable.currentCell = reportTable.cell(0, TITLE.LOSS);

      // Add grid cell effects: show funccall outputs in the context panel
      const cellEffect = async (cell: DG.GridCell) => {
        if ((cell === null) || (cell === undefined))
          return;

        const row = cell.tableRowIndex ?? 0;
        const selectedRun = calledFuncCalls[row];

        const scalarParams = ([...selectedRun.outputParams.values()])
          .filter((param) => DG.TYPES_SCALAR.has(param.property.propertyType));
        const scalarTable = DG.HtmlTable.create(
          scalarParams,
          (scalarVal: DG.FuncCallParam) =>
            [scalarVal.property.caption ?? scalarVal.property.name, selectedRun.outputs[scalarVal.property.name], scalarVal.property.options['units']],
        ).root;

        const dfParams = ([...selectedRun.outputParams.values()])
          .filter((param) => param.property.propertyType === DG.TYPE.DATA_FRAME);
        const dfPanes = dfParams.reduce((acc, param) => {
          const configs = getPropViewers(param.property).config;

          const dfValue = selectedRun.outputs[param.name];
          const paneName = param.property.caption ?? param.property.name;
          configs.map((config) => {
            const viewerType = config['type'] as string;
            const viewer = DG.Viewer.fromType(viewerType, dfValue);
            viewer.setOptions(config);
            $(viewer.root).css({'width': '100%'});
            if (acc[paneName])
              acc[paneName].push(viewer.root);
            else acc[paneName] = [viewer.root];
          });

          return acc;
        }, {} as {[name: string]: HTMLElement[]});

        let overviewPanelConfig: Object;

        if (scalarParams.length > 0) {
          overviewPanelConfig = {
            'Output scalars': [scalarTable],
            ...dfPanes,
          };
        } else {
          overviewPanelConfig = {
            ...dfPanes,
          };
        }

        const overviewPanel = ui.accordion();
        $(overviewPanel.root).css({'width': '100%'});
        Object.entries(overviewPanelConfig).map((e) => {
          overviewPanel.addPane(e[0], () => ui.divV(e[1]));
        });

        const paneToExpandIdx = overviewPanel.panes.length - 1;

        if (paneToExpandIdx < 0)
          throw new Error('Function has no outputs');

        overviewPanel.panes[overviewPanel.panes.length - 1].expanded = true;

        grok.shell.o = overviewPanel.root;
      };

      this.gridClickSubscription = grid.onCellClick.subscribe(cellEffect);
      this.gridCellChangeSubscription = grid.onCurrentCellChanged.subscribe(cellEffect);
    } catch (error) {
      grok.shell.error(error instanceof Error ? error.message : 'The platform issue');
    }
  } // runOptimization

  /** Get outputs selected as target */
  private getOutputsOfInterest() {
    const outputsOfInterest = [];

    for (const outputName of Object.keys(this.store.outputs)) {
      const output = this.store.outputs[outputName];

      if (output.isInterest.value)
        outputsOfInterest.push(output);
    }

    return outputsOfInterest;
  } // getOutputsOfInterest

  /** Return loss function line chart root  */
  private getLossGraph(extr: Extremum): HTMLElement {
    return DG.Viewer.lineChart(
      DG.DataFrame.fromColumns([
        DG.Column.fromList(DG.COLUMN_TYPE.INT, TITLE.ITER, [...Array(extr.iterCount).keys()].map((i) => i + 1)),
        DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, TITLE.LOSS, extr.iterCosts.slice(0, extr.iterCount))]),
      {
        showYAxis: true,
        showXAxis: true,
        showXSelector: true,
        showYSelectors: true,
        lineColoringType: 'custom',
        lineColor: 15274000,
        markerColor: 15274000,
      }).root;
  } // getLossGraph

  /** Return output goodness of fit (GOF) viewer root */
  private getOutputGof(prop: DG.Property, target: OutputTarget, call: DG.FuncCall, argColName: string, toShowDfCaption: boolean): GoFViewer[] {
    const type = prop.propertyType;
    const name = prop.name;
    const caption = prop.caption ?? name;

    // Provide an approprate viewer for each output
    switch (type) {
    // bar chart for each scalar
    case DG.TYPE.FLOAT:
    case DG.TYPE.INT:
    case DG.TYPE.BIG_INT:
      return [{
        caption: caption,
        root: DG.Viewer.barChart(
          DG.DataFrame.fromColumns([
            DG.Column.fromStrings(caption, ['obtained', 'target']),
            DG.Column.fromList(type as unknown as DG.COLUMN_TYPE, TITLE.VALUE, [call.getParamValue(name), target]),
          ]),
          {
            valueColumnName: TITLE.VALUE,
            splitColumnName: caption,
            valueAggrType: DG.AGG.AVG,
            showValueSelector: false,
            showCategorySelector: false,
            showStackSelector: false,
            showEmptyBars: true,
          },
        ).root,
      }];

    // a set of linecharts comparing columns of output dataframe to their targets
    case DG.TYPE.DATA_FRAME:
      const result: GoFViewer[] = [];
      const simDf = call.getParamValue(name) as DG.DataFrame;
      const expDf = target as DG.DataFrame;
      const simArgCol = simDf.col(argColName);
      const expArgCol = expDf.col(argColName);

      const configs = getPropViewers(prop).config;

      if ((simArgCol === null) || (expArgCol === null))
        throw new Error('Creating viewer fails: incorrect argument column name');

      const simArgRaw = simArgCol.getRawData();
      const indeces = getIndeces(expArgCol, simArgCol);
      const rowCount = indeces.length;
      const argVals = Array<number>(rowCount);
      indeces.forEach((val, idx) => argVals[idx] = simArgRaw[val]);

      // Line chart segments features
      let segmentCol: DG.Column<DG.COLUMN_TYPE.STRING> | null = null;

      configs.filter((conf) => conf['type'] as string === DG.VIEWER.LINE_CHART)
        .forEach((conf) => {
          const segmentColName = conf['segmentColumnName'];

          if (segmentColName) {
            const segmData = Array<string>(rowCount);
            indeces.forEach((val, idx) => segmData[idx] = simDf.col(segmentColName as string)!.get(val));
            segmentCol = DG.Column.fromStrings(segmentColName as string, segmData);
          }
        });

      let rawBuf: Uint32Array | Float32Array | Int32Array | Float64Array;
      let col: DG.Column | null;

      // add viewers for each non-argument column of the target dataframe
      expDf.columns.names().forEach((name) => {
        if (name !== argColName) {
          col = simDf.col(name);

          if (col === null)
            throw new Error(`Creating viewer fails: no '${name}' column in the output dataframe`);

          rawBuf = col.getRawData();
          const simVals = Array<number>(rowCount);
          indeces.forEach((val, idx) => simVals[idx] = rawBuf[val]);

          col = expDf.col(name);

          if (col === null)
            throw new Error(`Creating viewer fails: no '${name}' column in the target dataframe`);

          rawBuf = col.getRawData();
          const expVals = Array<number>(rowCount);
          indeces.forEach((_, idx) => expVals[idx] = rawBuf[idx]);
          const options: Partial<DG.ILineChartSettings> = {
            multiAxis: true,
            yGlobalScale: true,
          };
          const df = DG.DataFrame.fromColumns([
            expArgCol,
            DG.Column.fromList(col.type, TITLE.OBTAINED, simVals),
            DG.Column.fromList(col.type, TITLE.TARGET, expVals),
          ]);

          if (segmentCol) {
            df.columns.add(segmentCol);
            options.segmentColumnName = segmentCol.name;
          }

          result.push({
            caption: toShowDfCaption ? `${caption}: [${name}]` : `[${name}]`,
            root: DG.Viewer.lineChart(df, options).root,
          });
        }
      });

      return result;

    default:
      throw new Error('Unsupported output type');
    }
  } // getOutputGof

  /** Clear previous results: close dock nodes and unsubscribe from events */
  private clearPrev(): void {
    if (this.helpDN !== undefined) {
      this.comparisonView.dockManager.close(this.helpDN);
      this.helpDN = undefined;
    }

    if (this.gridClickSubscription) {
      this.gridClickSubscription.unsubscribe();
      this.gridClickSubscription = null;
    }

    if (this.gridCellChangeSubscription) {
      this.gridCellChangeSubscription.unsubscribe();
      this.gridCellChangeSubscription = null;
    }
  } // clearPrev

  /** Show fails of the Nelder-Mead fails */
  private showNelderMeadFails(): void {
    if (this.failsDF === null)
      return;

    // show fails info: inputs, issue message
    const view = grok.shell.addTableView(this.failsDF);

    // add method's settings
    view.addViewer(DG.Viewer.form(DG.DataFrame.fromColumns(
      Object.entries(this.nelderMeadSettings).map((e) => DG.Column.fromFloat32Array(nelderMeadCaptions.get(e[0]) ?? e[0], new Float32Array([e[1]]))),
    )), {description: 'The Nelder-Mead method settings', showNavigation: false});

    // create tooltips
    const count = this.getFittedInputs().length;
    const tooltips = new Map<string, string>();
    this.failsDF.columns.names().forEach((name, idx) => {
      if (idx < count)
        tooltips.set(name, `Initial value of "${name}" used in the Nelder-Mead method`);
      else if (idx > count)
        tooltips.set(name, `Value of "${name}" (fixed input)`);
      else
        tooltips.set(name, 'Error message raised');
    });

    // add tooltips
    view.grid.onCellTooltip(function(cell, x, y) {
      if (cell.isColHeader) {
        const cellCol = cell.tableColumn;
        if (cellCol) {
          const name = cell.tableColumn.name;
          const msg = tooltips.get(name);
          ui.tooltip.show(msg ?? '', x, y);
          return true;
        }
      }
    });
  } // showNelderMeadFails
}
