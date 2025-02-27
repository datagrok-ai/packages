/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {BehaviorSubject} from 'rxjs';
import {getDefaultValue, getPropViewers} from './shared/utils';
import {SobolAnalysis} from './variance-based-analysis/sobol-sensitivity-analysis';
import {RandomAnalysis} from './variance-based-analysis/random-sensitivity-analysis';
import {getOutput} from './variance-based-analysis/sa-outputs-routine';
import {getCalledFuncCalls} from './variance-based-analysis/utils';
import {RunComparisonView} from './run-comparison-view';
import {combineLatest} from 'rxjs';
import '../css/sens-analysis.css';
import {CARD_VIEW_TYPE} from '../../shared-utils/consts';
import {DOCK_RATIO, ROW_HEIGHT, STARTING_HELP} from './variance-based-analysis/constants';
import {getLookupChoiceInput} from './shared/lookup-tools';
import {getCategoryWidget} from './fitting/fitting-utils';

const RUN_NAME_COL_LABEL = 'Run name' as const;
const supportedInputTypes = [DG.TYPE.INT, DG.TYPE.BIG_INT, DG.TYPE.FLOAT, DG.TYPE.BOOL, DG.TYPE.DATA_FRAME];
const supportedOutputTypes = [DG.TYPE.INT, DG.TYPE.BIG_INT, DG.TYPE.FLOAT, DG.TYPE.BOOL, DG.TYPE.DATA_FRAME];

enum ANALYSIS_TYPE {
  GRID_ANALYSIS = 'Grid',
  RANDOM_ANALYSIS = 'Monte Carlo',
  SOBOL_ANALYSIS = 'Sobol',
}

enum DF_OPTIONS {
  LAST_ROW = 'Last row',
  FIRST_ROW = 'First row',
  ALL_COLUMNS = '',
  BY_COL_VAL = 'By value in column',
}

type AnalysisProps = {
  analysisType: InputWithValue<BehaviorSubject<ANALYSIS_TYPE>>,
  samplesCount: InputWithValue,
}

type InputWithValue<T = number> = {input: DG.InputBase, value: T};

type InputValues = {
  isChanging: BehaviorSubject<boolean>,
  const: InputWithValue<boolean | number | string>,
  constForm: DG.InputBase[],
  saForm: DG.InputBase[],
}

type SensitivityNumericStore = {
  prop: DG.Property,
  type: DG.TYPE.INT | DG.TYPE.BIG_INT | DG.TYPE.FLOAT,
  min: InputWithValue,
  max: InputWithValue,
  lvl: InputWithValue,
} & InputValues;

type SensitivityBoolStore = {
  prop: DG.Property,
  type: DG.TYPE.BOOL,
  lvl: number,
} & InputValues;

type SensitivityConstStore = {
  prop: DG.Property,
  type: Exclude<DG.TYPE, DG.TYPE.INT | DG.TYPE.BIG_INT | DG.TYPE.FLOAT | DG.TYPE.BOOL | DG.TYPE.STRING>,
  lvl: 1,
} & InputValues;

export type RangeDescription = {
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

type SensitivityStore = SensitivityNumericStore | SensitivityBoolStore | SensitivityConstStore;

const getSwitchMock = () => ui.div([], 'sa-switch-input');

export class SensitivityAnalysisView {
  generateInputFields = (func: DG.Func) => {
    const analysisInputs = {
      analysisType: {
        input: ui.input.choice(
          'Method', {
            value: ANALYSIS_TYPE.RANDOM_ANALYSIS,
            items: [ANALYSIS_TYPE.RANDOM_ANALYSIS, ANALYSIS_TYPE.SOBOL_ANALYSIS, ANALYSIS_TYPE.GRID_ANALYSIS],
            onValueChanged: (value) => {
              analysisInputs.analysisType.value.next(value);
              this.updateRunWidgetsState();
              this.setAnalysisInputTooltip();
              this.store.analysisInputs.samplesCount.input.setTooltip(this.samplesCountTooltip());
            }}),
        value: new BehaviorSubject(ANALYSIS_TYPE.RANDOM_ANALYSIS),
      },
      samplesCount: {
        input: ui.input.int('Samples', {value: 10, onValueChanged: (value) => {
          analysisInputs.samplesCount.value = value;
          this.updateRunWidgetsState();
        }}),
        value: 10,
      },
    } as AnalysisProps;

    analysisInputs.analysisType.input.root.insertBefore(getSwitchMock(), analysisInputs.analysisType.input.captionLabel);
    analysisInputs.samplesCount.input.root.insertBefore(getSwitchMock(), analysisInputs.samplesCount.input.captionLabel);

    const getInputValue = (input: DG.Property, key: keyof RangeDescription) => {
      const range = this.options.ranges?.[input.name];
      if (range?.[key] != undefined)
        return range[key];
      return input.options[key] === undefined ? getDefaultValue(input) : Number(input.options[key]);
    }

    const getInputDefaultValue = (input: DG.Property) => {
      const range = this.options.ranges?.[input.name];
      if (range?.default != undefined)
        return range.default;
      return getDefaultValue(input);
    }

    const getSwitchElement = (defaultValue: boolean, f: (v: boolean) => any, isInput = true) => {
      const input = ui.input.toggle(' ', {value: defaultValue, onValueChanged: (value) => f(value)});
      $(input.root).addClass('sa-switch-input');
      $(input.captionLabel).hide();

      ui.tooltip.bind(input.root, () => {
        if (isInput) {
          return (input.value) ?
            'Switch to mark input as immutable': 'Switch to mark input as mutable';
        } else {
          return !input.value ?
            'Switch to mark output as requiring analysis' :
            'Switch to mark output as not requiring analysis';
        }
      });

      return input;
    };

    const inputs = func.inputs.reduce((acc, inputProp) => {
      const defaultValue = getInputValue(inputProp, 'default');

      switch (inputProp.propertyType) {
      case DG.TYPE.INT:
      case DG.TYPE.BIG_INT:
      case DG.TYPE.FLOAT:
        const isChangingInputMin = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateRunWidgetsState();
        });

        const isChangingInputConst = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateRunWidgetsState();
        });

        const temp = {
          type: inputProp.propertyType,
          prop: inputProp,
          const: {
            input:
            (() => {
              const inp = ui.input.float(inputProp.caption ?? inputProp.name, {
                value: getInputDefaultValue(inputProp),
                onValueChanged: (value) => ref.const.value = value,
              });
              inp.root.insertBefore(isChangingInputConst.root, inp.captionLabel);
              inp.addPostfix(inputProp.options['units']);
              return inp;
            })(),
            value: getInputDefaultValue(inputProp),
          },
          min: {
            input:
              (() => {
                const inp = ui.input.float(`${inputProp.caption ?? inputProp.name} min`, {
                  value: getInputValue(inputProp, 'min'),
                  onValueChanged: (value) => (ref as SensitivityNumericStore).min.value = value,
                });
                inp.root.insertBefore(isChangingInputMin.root, inp.captionLabel);
                inp.addPostfix(inputProp.options['units']);
                return inp;
              })(),
            value: getInputValue(inputProp, 'min'),
          },
          max: {
            input: (() => {
              const inp = ui.input.float(`${inputProp.caption ?? inputProp.name} max`,
                {
                  value: getInputValue(inputProp, 'max'),
                  onValueChanged: (value) => (ref as SensitivityNumericStore).max.value = value,
                });
              inp.addPostfix(inputProp.options['units']);
              return inp;
            })(),
            value: getInputValue(inputProp, 'max'),
          },
          lvl: {
            input: ui.input.int('Samples', {value: 3, onValueChanged: (value) => {
              (ref as SensitivityNumericStore).lvl.value = value;
              this.updateRunWidgetsState();
            }}),
            value: 3,
          },
          isChanging: new BehaviorSubject<boolean>(false),
        };

        [temp.max.input, temp.lvl.input].forEach((input) => {
          input.root.insertBefore(getSwitchMock(), input.captionLabel);
          $(input.root).removeProp('display');
        });

        const simpleSa = [temp.lvl.input];
        acc[inputProp.name] = {
          ...temp,
          constForm: [temp.const.input],
          saForm: [
            temp.min.input,
            temp.max.input,
            ...simpleSa,
          ],
        } as SensitivityNumericStore;

        const ref = acc[inputProp.name] as SensitivityNumericStore;
        ref.isChanging.subscribe((val) => {
          isChangingInputMin.notify = false;
          isChangingInputMin.value = val;
          isChangingInputMin.notify = true;

          isChangingInputConst.notify = false;
          isChangingInputConst.value = val;
          isChangingInputConst.notify = true;
        });
        combineLatest([
          temp.isChanging, analysisInputs.analysisType.value,
        ]).subscribe(([isChanging, analysisType]) => {
          if (isChanging) {
            ref.constForm.forEach((input) => $(input.root).hide());
            ref.saForm.forEach((input) => $(input.root).css('display', 'flex'));
            simpleSa.forEach((input) => analysisType === ANALYSIS_TYPE.GRID_ANALYSIS ? $(input.root).css('display', 'flex'): $(input.root).hide());
          } else {
            ref.constForm.forEach((input) => $(input.root).css('display', 'flex'));
            ref.saForm.forEach((input) => $(input.root).hide());
          }
        });
        break;

      case DG.TYPE.BOOL:
        const isChangingInputBoolConst = getSwitchElement(false, (v: boolean) => {
          boolRef.isChanging.next(v);
          this.updateRunWidgetsState();
        });

        const tempBool = {
          type: inputProp.propertyType,
          prop: inputProp,
          const: {
            input: (() => {
              const temp = ui.input.bool(`${inputProp.caption ?? inputProp.name}`,
                {
                  value: getInputDefaultValue(inputProp) ?? false,
                  onValueChanged: (value) => boolRef.const.value = value,
                });
              temp.root.insertBefore(isChangingInputBoolConst.root, temp.captionLabel);

              return temp;
            })(),
            value: defaultValue,
          } as InputWithValue<boolean>,
          isChanging: new BehaviorSubject<boolean>(false),
          lvl: 1,
        };

        acc[inputProp.name] = {
          ...tempBool,
          constForm: [tempBool.const.input],
          saForm: [],
        } as SensitivityBoolStore;
        const boolRef = acc[inputProp.name] as SensitivityBoolStore;
        boolRef.isChanging.subscribe((v) => {
          boolRef.lvl = v ? 2: 1;
        });
        break;
      default:
        const switchMock = getSwitchMock();

        const tempDefault = {
          input: (() => {
            const temp = ui.input.forProperty(inputProp, undefined, {onValueChanged: (value) => tempDefault.value = value});
            temp.root.insertBefore(switchMock, temp.captionLabel);

            temp.addPostfix(inputProp.options['units']);

            return temp;
          })(),
          value: getInputDefaultValue(inputProp),
        };
        acc[inputProp.name] = {
          const: tempDefault,
          constForm: [tempDefault.input],
          saForm: [] as DG.InputBase[],
          type: inputProp.propertyType,
          prop: inputProp,
          isChanging: new BehaviorSubject(false),
        } as SensitivityConstStore;
      }

      return acc;
    }, {} as Record<string, SensitivityStore>);

    const outputs = func.outputs.reduce((acc, outputProp) => {
      const temp = {
        prop: outputProp,
        input:
          (() => {
            const caption = outputProp.caption ?? outputProp.name;
            let input: DG.InputBase;

            if (outputProp.propertyType === DG.TYPE.DATA_FRAME) {
              input = ui.input.choice(
                caption,
                {
                  value: DF_OPTIONS.LAST_ROW,
                  items: [DF_OPTIONS.LAST_ROW, DF_OPTIONS.FIRST_ROW, DF_OPTIONS.BY_COL_VAL],
                  onValueChanged: (value) => {
                    temp.value.returning = value;
                    temp.analysisInputs.forEach((inp) => {
                      inp.root.hidden = (value !== DF_OPTIONS.BY_COL_VAL);
                    });

                    input.setTooltip(this.getOutputTooltip(caption, value));
                  },
                });

              input.setTooltip(this.getOutputTooltip(caption, DF_OPTIONS.LAST_ROW));
            } else {
              input = ui.input.forProperty(outputProp);
              input.setTooltip('Scalar');
            }

            input.addCaption(caption);

            const isInterestInput = supportedOutputTypes.includes(outputProp.propertyType) ?
              getSwitchElement(
                true,
                (v: boolean) => {
                  temp.isInterest.next(v);
                  temp.analysisInputs.forEach((inp) => {
                    inp.root.hidden = (temp.value.returning !== DF_OPTIONS.BY_COL_VAL);
                  });
                  this.updateRunWidgetsState();

                  if (outputProp.propertyType === DG.TYPE.DATA_FRAME)
                    input.setTooltip(v ? this.getOutputTooltip(caption, DF_OPTIONS.LAST_ROW) : 'Dataframe');
                },
                false,
              ).root: getSwitchMock();
            input.root.insertBefore(isInterestInput, input.captionLabel);

            return input;
          })(),
        analysisInputs:
          outputProp.propertyType === DG.TYPE.DATA_FRAME ? [(() => {
            const input = ui.input.string('Column', {value: DF_OPTIONS.ALL_COLUMNS, onValueChanged: (value) => {
              temp.value.colName = value;
            }});
            input.root.insertBefore(getSwitchMock(), input.captionLabel);
            input.root.hidden = true;
            input.setTooltip(`Name of column of the '${outputProp.caption ?? outputProp.name}' dataframe`);
            return input;
          })(),
          (() => {
            const input = ui.input.float('Value', {value: 0, onValueChanged: (value) => {temp.value.colValue = value;}});
            input.root.insertBefore(getSwitchMock(), input.captionLabel);
            input.root.hidden = true;
            input.setTooltip(`Value specifying the '${outputProp.caption ?? outputProp.name}' dataframe row`);
            return input;
          })(),
          ]: [],

        value: {
          returning: DF_OPTIONS.LAST_ROW,
          colName: DF_OPTIONS.ALL_COLUMNS as string,
          colValue: 0,
        },
        isInterest: new BehaviorSubject<boolean>(true),
      };
      $(temp.input.input).css('visibility', 'hidden');

      if (temp.prop.propertyType === DG.TYPE.DATA_FRAME) {
        temp.isInterest.subscribe((isInterest) => {
          temp.analysisInputs.forEach((input) => isInterest ? $(input.root).show() : $(input.root).hide());
          $(temp.input.input).css('visibility', isInterest ? 'visible': 'hidden');
        });
      }

      acc[outputProp.name] = temp;

      return acc;
    }, {} as Record<string, {
      prop: DG.Property,
      input: DG.InputBase,
      analysisInputs: DG.InputBase[],
      value: {
        returning: DF_OPTIONS,
        colName: string,
        colValue: number,
      }
      isInterest: BehaviorSubject<boolean>
    }>);

    return {analysisInputs, inputs, outputs};
  };

  private openedViewers = [] as DG.Viewer[];
  private runButton: HTMLButtonElement;
  private runIcon: HTMLElement;
  private helpIcon: HTMLElement;
  private tableDockNode: DG.DockNode | undefined;
  private helpMdNode: DG.DockNode | undefined;
  private gridSubscription: any = null;

  store = this.generateInputFields(this.func);
  comparisonView!: DG.TableView;

  static async fromEmpty(
    func: DG.Func,
    options: {
      parentView?: DG.View,
      parentCall?: DG.FuncCall,
      inputsLookup?: string,
      ranges?: Record<string, RangeDescription>,
    } = {
      parentView: undefined,
      parentCall: undefined,
      inputsLookup: undefined,
      ranges: undefined,
    },
  ) {
    const cardView = [...grok.shell.views].find((view) => view.type === CARD_VIEW_TYPE);

    const v = await RunComparisonView.fromComparedRuns([], func,
      {
        parentView: cardView,
        parentCall: options.parentCall,
      });
    grok.shell.addView(v);

    new this(
      func,
      v,
      options,
    );
  }

  constructor(
    public func: DG.Func,
    baseView: DG.TableView,
    public options: {
      parentView?: DG.View,
      parentCall?: DG.FuncCall,
      configFunc?: undefined,
      inputsLookup?: string,
      ranges?: Record<string, RangeDescription>,
    } = {
      parentView: undefined,
      parentCall: undefined,
      configFunc: undefined,
      inputsLookup: undefined,
      ranges: undefined,
    },
  ) {
    this.runButton = ui.bigButton('Run', async () => await this.runAnalysis());

    this.runIcon = ui.iconFA('play', async () => await this.runAnalysis());
    this.runIcon.style.color = 'var(--green-2)';
    this.runIcon.classList.add('fas');

    this.helpIcon = ui.iconFA('question', () => {
      window.open('https://datagrok.ai/help/compute/function-analysis#sensitivity-analysis', '_blank');
    }, 'Open help in a new tab');

    this.buildFormWithBtn(options.inputsLookup).then((form) => {
      this.runButton.disabled = !this.canEvaluationBeRun();
      this.runIcon.hidden = this.runButton.disabled;
      this.addTooltips();
      this.comparisonView = baseView;

      this.comparisonView.dockManager.dock(
        form,
        DG.DOCK_TYPE.LEFT,
        null,
        `${this.func.name} - Sensitivity Analysis`,
        0.25,
      );

      this.comparisonView.grid.columns.byName(RUN_NAME_COL_LABEL)!.visible = false;

      const rbnPanels = this.comparisonView.getRibbonPanels();
      rbnPanels.push([this.helpIcon, this.runIcon]);
      this.comparisonView.setRibbonPanels(rbnPanels);

      this.comparisonView.helpUrl = '/help/function-analysis.md#sensitivity-analysis';
      this.tableDockNode = this.comparisonView.dockManager.findNode(this.comparisonView.grid.root);
      const helpMD = ui.markdown(STARTING_HELP);
      helpMD.style.padding = '10px';
      helpMD.style.overflow = 'auto';
      this.helpMdNode = this.comparisonView.dockManager.dock(helpMD, DG.DOCK_TYPE.FILL, this.tableDockNode, 'About');
    });
  }

  private closeOpenedViewers() {
    for (const v of this.openedViewers)
      v.close();

    this.openedViewers.splice(0);

    if (this.helpMdNode) {
      this.helpMdNode.detachFromParent();
      this.helpMdNode.container.destroy();
      this.helpMdNode = undefined;
    }

    if (this.gridSubscription) {
      this.gridSubscription.unsubscribe();
      this.gridSubscription = null;
    }
  }

  private getFuncCallCount(analysisInputs: AnalysisProps, inputs: Record<string, SensitivityStore>): number {
    let variedInputsCount = 0;

    switch (analysisInputs.analysisType.value.value) {
    case ANALYSIS_TYPE.GRID_ANALYSIS:
      let product = 1;

      const hasLvlInput = (input: SensitivityStore): input is SensitivityNumericStore => {
        return input.type === DG.TYPE.INT || input.type === DG.TYPE.BIG_INT || input.type === DG.TYPE.FLOAT;
      };

      for (const input of Object.values(inputs)) {
        if (input.isChanging.value) {
          product *= hasLvlInput(input) ? input.lvl.value : input.lvl;
          ++variedInputsCount;
        }
      }

      if (variedInputsCount === 0)
        return 0;

      return product;

    case ANALYSIS_TYPE.RANDOM_ANALYSIS:
      return analysisInputs.samplesCount.value;

    case ANALYSIS_TYPE.SOBOL_ANALYSIS:
      for (const name of Object.keys(inputs)) {
        if (inputs[name].isChanging.value)
          ++variedInputsCount;
      }

      if (variedInputsCount === 0)
        return 0;

      return (variedInputsCount + 2) * analysisInputs.samplesCount.value;

    default:
      return 0;
    }
  }

  private getFuncCallCountAsString(): string {
    if (!this.canEvaluationBeRun())
      return '0';

    const funcCallCount = this.getFuncCallCount(this.store.analysisInputs, this.store.inputs);

    if (funcCallCount < 1000)
      return String(funcCallCount);

    if (funcCallCount < 1000000)
      return String(Math.ceil(funcCallCount / 10) / 100) + 'k';

    if (funcCallCount < 1000000000)
      return String(Math.ceil(funcCallCount / 10000) / 100) + 'm';

    return String(Math.ceil(funcCallCount / 10000000) / 100) + 'b';
  }

  private updateRunWidgetsState(): void {
    this.runButton.textContent = `Run (${this.getFuncCallCountAsString()})`;
    this.runButton.disabled = !this.canEvaluationBeRun();
    this.runIcon.hidden = this.runButton.disabled;
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

  private async buildFormWithBtn(inputsLookup?: string) {
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
    const form = ui.div([
      this.store.analysisInputs.analysisType.input,
      this.store.analysisInputs.samplesCount.input,
    ], {style: {overflowY: 'scroll', width: '100%'}});

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
          form.append(getCategoryWidget('Misc', miscRoots!));
          form.append(...miscRoots!);
        }
      }
    } else
      form.append(...inputsByCategories.get('Misc')!);

    $(form).addClass('ui-form');

    const outputsTitle = ui.h2('Outputs');
    form.appendChild(outputsTitle);
    let prevCategory = 'Misc';

    const outputForm = Object.values(this.store.outputs)
      .reduce((container, outputConfig) => {
        const prop = outputConfig.prop;
        if (prop.category !== prevCategory) {
          container.append(ui.h2(prop.category));
          prevCategory = prop.category;
        }

        container.append(
          outputConfig.input.root,
          ...outputConfig.analysisInputs.map((input) => input.root),
        );

        return container;
      }, form);

    this.store.analysisInputs.analysisType.value.subscribe((analysisType) => {
      if (analysisType === ANALYSIS_TYPE.GRID_ANALYSIS)
        $(this.store.analysisInputs.samplesCount.input.root).hide();
      else {
        $(outputsTitle).show();
        $(outputForm).show();
        $(this.store.analysisInputs.samplesCount.input.root).show();
      }
    });

    // make at least one output of interest
    let isAnyOutputSelectedAsOfInterest = false;

    for (const name of Object.keys(this.store.outputs)) {
      if (this.store.outputs[name].isInterest.value) {
        isAnyOutputSelectedAsOfInterest = true;
        break;
      }
    }

    if (!isAnyOutputSelectedAsOfInterest) {
      const firstOutput = this.store.outputs[Object.keys(this.store.outputs)[0]];
      firstOutput.isInterest.next(true);
      // firstOutput.isInterest.input.value = true;
    }

    this.updateRunWidgetsState();

    const buttons = ui.buttonsInput([this.runButton]);

    form.appendChild(
      buttons,
    );

    $(form).css({
      'padding-left': '12px',
      'overflow-y': 'scroll',
      'padding-right': '4px',
    });
    return form;
  }

  private setAnalysisInputTooltip(): void {
    let msg: string;

    switch (this.store.analysisInputs.analysisType.value.value) {
    case ANALYSIS_TYPE.GRID_ANALYSIS:
      msg = 'Grid analysis: the function is evaluated with respect to the selected inputs varying within the specified ranges';
      break;
    case ANALYSIS_TYPE.RANDOM_ANALYSIS:
      msg = 'Monte Carlo simulation: the function is evaluated with respect to random variation of the selected inputs within the specified ranges';
      break;
    case ANALYSIS_TYPE.SOBOL_ANALYSIS:
      msg = 'Variance-based sensitivity analysis: the Sobol\' indices are computed';
      break;
    default:
      msg = 'Unknown method!';
      break;
    }

    this.store.analysisInputs.analysisType.input.setTooltip(msg);
  }

  private getOutputTooltip(name: string, opt: DF_OPTIONS): string {
    switch (opt) {
    case DF_OPTIONS.FIRST_ROW:
      return `To analyze first row of the '${name}' dataframe`;

    case DF_OPTIONS.LAST_ROW:
      return `To analyze last row of the '${name}' dataframe`;

    case DF_OPTIONS.BY_COL_VAL:
      return `To analyze "${name}"'s row defined by custom value in column`;

    default:
      return '';
    }
  }

  private samplesCountTooltip(): string {
    switch (this.store.analysisInputs.analysisType.value.value) {
    case ANALYSIS_TYPE.RANDOM_ANALYSIS:
      return 'Input sets count';
    case ANALYSIS_TYPE.SOBOL_ANALYSIS:
      return 'Sample size for the Sobol\' indices computation';
    default:
      return 'Unknown method!';
    }
  }

  private addTooltips(): void {
    // type of analysis
    this.setAnalysisInputTooltip();

    // run button
    ui.tooltip.bind(this.runButton, () =>
      `Run sensitivity analysis: the function is evaluated ${this.getFuncCallCount(this.store.analysisInputs, this.store.inputs)} times`,
    );

    // run icon
    ui.tooltip.bind(this.runIcon, () =>
      `Run sensitivity analysis: the function is evaluated ${this.getFuncCallCount(this.store.analysisInputs, this.store.inputs)} times`,
    );

    // samples count
    this.store.analysisInputs.samplesCount.input.setTooltip(this.samplesCountTooltip());

    // switchInputs for inputs
    for (const propName of Object.keys(this.store.inputs)) {
      const inpType = this.store.inputs[propName].prop.propertyType;
      if (inpType === DG.TYPE.BOOL || inpType === DG.TYPE.STRING)
        continue;

      const propConfig = this.store.inputs[propName];
      const name = propConfig.prop.caption ?? propConfig.prop.name;
      propConfig.const.input.setTooltip(`'${name}' value`);
      (propConfig as SensitivityNumericStore).min.input.setTooltip(`Min value of '${name}'`);
      (propConfig as SensitivityNumericStore).max.input.setTooltip(`Max value of '${name}'`);
      (propConfig as SensitivityNumericStore).lvl.input.setTooltip(`Number of samples along the axis '${name}'`);
    }
  }

  private isAnyInputSelected(): boolean {
    for (const propName of Object.keys(this.store.inputs)) {
      if (this.store.inputs[propName].isChanging.value)
        return true;
    }
    return false;
  }

  private isAnyOutputSelected(): boolean {
    for (const propName of Object.keys(this.store.outputs)) {
      if (this.store.outputs[propName].isInterest.value)
        return true;
    }
    return false;
  }

  private canEvaluationBeRun(): boolean {
    return this.isAnyInputSelected() && this.isAnyOutputSelected();
  }

  private async runAnalysis(): Promise<void> {
    if (!this.canEvaluationBeRun())
      return;

    switch (this.store.analysisInputs.analysisType.value.value) {
    case ANALYSIS_TYPE.GRID_ANALYSIS:
      await this.runGridAnalysis();
      break;
    case ANALYSIS_TYPE.RANDOM_ANALYSIS:
      await this.runRandomAnalysis();
      break;
    case ANALYSIS_TYPE.SOBOL_ANALYSIS:
      await this.runSobolAnalysis();
      break;
    default:
      break;
    }
  }

  private getFixedInputColumns(rowCount: number): DG.Column[] {
    return Object.values(this.store.inputs).filter((input) => {
      if (!supportedInputTypes.includes(input.type))
        return true;
      return !input.isChanging.value;
    }).map((input) => {
      return DG.Column.fromList(
        input.type as unknown as DG.COLUMN_TYPE,
        input.prop.caption ?? input.prop.name,
        Array(rowCount).fill(input.const.value),
      );
    });
  }

  private async runSobolAnalysis() {
    const options = {
      func: this.func,
      fixedInputs: this.getFixedInputs().map((propName) => ({
        name: propName,
        value: this.store.inputs[propName].const.value,
      })),
      variedInputs: this.getVariedInputs().map((propName) => {
        const propConfig = this.store.inputs[propName] as SensitivityNumericStore;

        return {
          prop: propConfig.prop,
          min: propConfig.min.value,
          max: propConfig.max.value,
        };
      }),
      samplesCount: this.store.analysisInputs.samplesCount.value || 1,
    };

    const outputsOfInterest = this.getOutputsOfInterest();

    const analysis = new SobolAnalysis(options.func, options.fixedInputs, options.variedInputs, outputsOfInterest, options.samplesCount);
    const analysisResults = await analysis.perform();
    this.closeOpenedViewers();
    const funcEvalResults = analysisResults.funcEvalResults;
    const calledFuncCalls = analysisResults.funcCalls;
    const firstOrderIndeces = analysisResults.firstOrderSobolIndices;
    const totalOrderIndeces = analysisResults.totalOrderSobolIndices;
    const outputNames = firstOrderIndeces.columns.names();
    this.comparisonView.dataFrame = funcEvalResults;
    const colNamesToShow = funcEvalResults.columns.names();
    const fixedInputs = this.getFixedInputColumns(funcEvalResults.rowCount);

    // add columns with fixed inputs & mark them as fixed
    for (const col of fixedInputs) {
      col.name = funcEvalResults.columns.getUnusedName(`${col.name} (fixed)`);
      funcEvalResults.columns.add(col);
    }

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);
    this.comparisonView.grid.props.rowHeight = ROW_HEIGHT;

    // add correlation plot
    const corPlot = DG.Viewer.correlationPlot(funcEvalResults, {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow});
    const corPlotDockNode = this.comparisonView.dockManager.dock(corPlot, DG.DOCK_TYPE.LEFT, this.tableDockNode, '', DOCK_RATIO.COR_PLOT);
    this.openedViewers.push(corPlot);

    // add PC plot
    const pcPlot = DG.Viewer.pcPlot(funcEvalResults, {columnNames: colNamesToShow});
    this.comparisonView.dockManager.dock(pcPlot, DG.DOCK_TYPE.DOWN, corPlotDockNode, '', DOCK_RATIO.PC_PLOT);
    this.openedViewers.push(pcPlot);

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, options.variedInputs.length);

    // other vizualizations depending on the varied inputs dimension
    const graphViewer = (options.variedInputs.length === 1) ?
      DG.Viewer.lineChart(funcEvalResults, this.getLineChartOpt(colNamesToShow)) :
      DG.Viewer.scatterPlot(funcEvalResults, this.getScatterOpt(colNamesToShow, nameOfNonFixedOutput));

    this.openedViewers.push(graphViewer);
    this.comparisonView.dockManager.dock(graphViewer, DG.DOCK_TYPE.DOWN, this.tableDockNode, '', DOCK_RATIO.GRAPH);

    // add barchart with 1-st order Sobol' indices
    const bChartSobol1 = DG.Viewer.barChart(firstOrderIndeces, this.getBarChartOpt(firstOrderIndeces.name, outputNames[0], nameOfNonFixedOutput));
    const barDockNode = this.comparisonView.dockManager.dock(bChartSobol1, DG.DOCK_TYPE.RIGHT, undefined, '', DOCK_RATIO.BAR_CHART);

    // add barchart with total order Sobol' indices
    const bChartSobolT = DG.Viewer.barChart(totalOrderIndeces, this.getBarChartOpt(totalOrderIndeces.name, outputNames[0], nameOfNonFixedOutput));
    this.comparisonView.dockManager.dock(bChartSobolT, DG.DOCK_TYPE.DOWN, barDockNode);

    this.openedViewers = this.openedViewers.concat([bChartSobol1, bChartSobolT]);

    this.gridSubscription = this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRun = calledFuncCalls[cell.tableRowIndex ?? 0];

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
      let paneToExpandIdx: number;

      if (scalarParams.length > 0) {
        paneToExpandIdx = 1;
        overviewPanelConfig = {
          'Output scalars': [scalarTable],
          ...dfPanes,
        };
      } else {
        paneToExpandIdx = 0;
        overviewPanelConfig = {
          ...dfPanes,
        };
      }

      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

      overviewPanel.panes[paneToExpandIdx].expanded = true;

      grok.shell.o = overviewPanel.root;
    });
  }

  private getFixedInputs() {
    return Object.keys(this.store.inputs).filter((propName) => {
      if (supportedInputTypes.includes(this.store.inputs[propName].type))
        return !this.store.inputs[propName].isChanging.value;

      return true;
    });
  }

  private getVariedInputs() {
    return Object.keys(this.store.inputs).filter((propName) => {
      if (supportedInputTypes.includes(this.store.inputs[propName].type))
        return this.store.inputs[propName].isChanging.value;

      return false;
    });
  }

  private async runRandomAnalysis() {
    const options = {
      func: this.func,
      fixedInputs: this.getFixedInputs().map((propName) => ({
        name: propName,
        value: this.store.inputs[propName].const.value,
      })),
      variedInputs: this.getVariedInputs().map((propName) => {
        const propConfig = this.store.inputs[propName] as SensitivityNumericStore;

        return {
          prop: propConfig.prop,
          min: propConfig.min.value,
          max: propConfig.max.value,
        };
      }),
      samplesCount: this.store.analysisInputs.samplesCount.value || 1,
    };

    const outputsOfInterest = this.getOutputsOfInterest();
    const analysis = new RandomAnalysis(options.func, options.fixedInputs, options.variedInputs, outputsOfInterest, options.samplesCount);
    const analysiResults = await analysis.perform();
    const funcEvalResults = analysiResults.funcEvalResults;
    const calledFuncCalls = analysiResults.funcCalls;

    this.closeOpenedViewers();
    this.comparisonView.dataFrame = funcEvalResults;
    const colNamesToShow = funcEvalResults.columns.names();
    const fixedInputs = this.getFixedInputColumns(funcEvalResults.rowCount);

    // add columns with fixed inputs & mark them as fixed
    for (const col of fixedInputs) {
      col.name = funcEvalResults.columns.getUnusedName(`${col.name} (fixed)`);
      funcEvalResults.columns.add(col);
    }

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);
    this.comparisonView.grid.props.rowHeight = ROW_HEIGHT;

    // add correlation plot
    const corPlot = DG.Viewer.correlationPlot(funcEvalResults, {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow});
    const corPlotDockNode = this.comparisonView.dockManager.dock(corPlot, DG.DOCK_TYPE.LEFT, this.tableDockNode, '', DOCK_RATIO.COR_PLOT);
    this.openedViewers.push(corPlot);

    // add PC plot
    const pcPlot = DG.Viewer.pcPlot(funcEvalResults, {columnNames: colNamesToShow});
    this.comparisonView.dockManager.dock(pcPlot, DG.DOCK_TYPE.DOWN, corPlotDockNode, '', DOCK_RATIO.PC_PLOT);
    this.openedViewers.push(pcPlot);

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, options.variedInputs.length);

    // other vizualizations depending on the varied inputs dimension
    const graphViewer = (options.variedInputs.length === 1) ?
      DG.Viewer.lineChart(funcEvalResults, this.getLineChartOpt(colNamesToShow)) :
      DG.Viewer.scatterPlot(funcEvalResults, this.getScatterOpt(colNamesToShow, nameOfNonFixedOutput));

    this.openedViewers.push(graphViewer);
    this.comparisonView.dockManager.dock(graphViewer, DG.DOCK_TYPE.DOWN, this.tableDockNode, '', DOCK_RATIO.GRAPH);

    this.gridSubscription = this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRun = calledFuncCalls[cell.tableRowIndex ?? 0];

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
      let paneToExpandIdx: number;

      if (scalarParams.length > 0) {
        paneToExpandIdx = 1;
        overviewPanelConfig = {
          'Output scalars': [scalarTable],
          ...dfPanes,
        };
      } else {
        paneToExpandIdx = 0;
        overviewPanelConfig = {
          ...dfPanes,
        };
      }

      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

      overviewPanel.panes[paneToExpandIdx].expanded = true;

      grok.shell.o = overviewPanel.root;
    });
  }

  private async runGridAnalysis() {
    const paramValues = Object.keys(this.store.inputs).reduce((acc, propName) => {
      switch (this.store.inputs[propName].type) {
      case DG.TYPE.INT:
      case DG.TYPE.BIG_INT:
        const numPropConfig = this.store.inputs[propName] as SensitivityNumericStore;
        const intStep = (numPropConfig.max.value - numPropConfig.min.value) / (numPropConfig.lvl.value - 1);
        acc[propName] = numPropConfig.isChanging.value ?
          Array.from({length: numPropConfig.lvl.value}, (_, i) => Math.round(numPropConfig.min.value + i*intStep)) :
          [numPropConfig.const.value];
        break;
      case DG.TYPE.FLOAT:
        const floatPropConfig = this.store.inputs[propName] as SensitivityNumericStore;
        const floatStep = (floatPropConfig.max.value - floatPropConfig.min.value) / (floatPropConfig.lvl.value - 1);
        acc[propName] = floatPropConfig.isChanging.value ?
          Array.from({length: floatPropConfig.lvl.value}, (_, i) => floatPropConfig.min.value + i*floatStep) :
          [floatPropConfig.const.value];
        break;
      case DG.TYPE.BOOL:
        const boolPropConfig = this.store.inputs[propName] as SensitivityBoolStore;
        acc[propName] = boolPropConfig.isChanging.value ?
          [boolPropConfig.const.value, !boolPropConfig.const.value]:
          [boolPropConfig.const.value];
        break;
      default:
        const constPropConfig = this.store.inputs[propName] as SensitivityConstStore;
        acc[propName] = [constPropConfig.const.value];
      }

      return acc;
    }, {} as Record<string, any[]>);

    let runParams = Object.values(paramValues)[0].map((item) => [item]) as any[][];
    for (let i = 1; i < Object.values(paramValues).length; i++) {
      const values = Object.values(paramValues)[i];

      const newRunParams = [] as any[][];
      for (const accVal of runParams) {
        for (const val of values)
          newRunParams.push([...accVal, val]);
      }

      runParams = newRunParams;
    }

    const funccalls = runParams.map((runParams) => this.func.prepare(
      this.func.inputs
        .map((input, idx) => ({name: input.name, idx}))
        .reduce((acc, {name, idx}) => {
          acc[name] = runParams[idx];
          return acc;
        }, {} as Record<string, any>),
    ));

    const calledFuncCalls = await getCalledFuncCalls(funccalls);

    this.closeOpenedViewers();

    const variedInputsColumns = [] as DG.Column[];
    const rowCount = calledFuncCalls.length;
    const fixedInputsColumns = this.getFixedInputColumns(rowCount);

    for (const inputName of Object.keys(this.store.inputs)) {
      const input = this.store.inputs[inputName];
      const prop = input.prop;

      if (input.isChanging.value) {
        variedInputsColumns.push(DG.Column.fromType(
          prop.propertyType as unknown as DG.COLUMN_TYPE,
          prop.caption ?? prop.name,
          rowCount,
        ));
      }
    }

    const inputsOfInterestColumns = [...variedInputsColumns];

    const len = inputsOfInterestColumns.length;
    const funcEvalResults = DG.DataFrame.fromColumns([inputsOfInterestColumns[0]]);

    for (let i = 1; i < len; ++i) {
      inputsOfInterestColumns[i].name = funcEvalResults.columns.getUnusedName(inputsOfInterestColumns[i].name);
      funcEvalResults.columns.add(inputsOfInterestColumns[i]);
    }

    for (let row = 0; row < rowCount; ++row) {
      for (const inputName of Object.keys(this.store.inputs)) {
        const input = this.store.inputs[inputName];
        const prop = input.prop;

        if (input.isChanging.value)
          funcEvalResults.set(prop.caption ?? prop.name, row, calledFuncCalls[row].inputs[inputName]);
      }
    }

    const outputsOfInterest = this.getOutputsOfInterest();
    const outputsOfInterestColumns = getOutput(calledFuncCalls, outputsOfInterest).columns;

    for (const outCol of outputsOfInterestColumns) {
      inputsOfInterestColumns.forEach((inCol) => {
        if (inCol.name === outCol.name) {
          inCol.name = `${inCol.name} (input)`;
          outCol.name = `${outCol.name} (output)`;
        }
      });

      outCol.name = funcEvalResults.columns.getUnusedName(outCol.name);

      funcEvalResults.columns.add(outCol);
    }

    const colNamesToShow = funcEvalResults.columns.names();

    for (const col of fixedInputsColumns) {
      col.name = funcEvalResults.columns.getUnusedName(`${col.name} (fixed)`);
      funcEvalResults.columns.add(col);
    }

    this.comparisonView.dataFrame = funcEvalResults;

    this.gridSubscription = this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRun = calledFuncCalls[cell.tableRowIndex ?? 0];

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
      let paneToExpandIdx: number;

      if (scalarParams.length > 0) {
        paneToExpandIdx = 1;
        overviewPanelConfig = {
          'Output scalars': [scalarTable],
          ...dfPanes,
        };
      } else {
        paneToExpandIdx = 0;
        overviewPanelConfig = {
          ...dfPanes,
        };
      }

      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

      overviewPanel.panes[paneToExpandIdx].expanded = true;

      grok.shell.o = overviewPanel.root;
    });

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);

    this.comparisonView.grid.props.rowHeight = ROW_HEIGHT;

    // add correlation plot
    const corPlot = DG.Viewer.correlationPlot(funcEvalResults, {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow});
    const corPlotDockNode = this.comparisonView.dockManager.dock(corPlot, DG.DOCK_TYPE.LEFT, this.tableDockNode, '', DOCK_RATIO.COR_PLOT);
    this.openedViewers.push(corPlot);

    // add PC plot
    const pcPlot = DG.Viewer.pcPlot(funcEvalResults, {columnNames: colNamesToShow});
    this.comparisonView.dockManager.dock(pcPlot, DG.DOCK_TYPE.DOWN, corPlotDockNode, '', DOCK_RATIO.PC_PLOT);
    this.openedViewers.push(pcPlot);

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, variedInputsColumns.length);

    // other vizualizations depending on the varied inputs dimension
    const graphViewer = (variedInputsColumns.length === 1) ?
      DG.Viewer.lineChart(funcEvalResults, this.getLineChartOpt(colNamesToShow)) :
      DG.Viewer.scatterPlot(funcEvalResults, this.getScatterOpt(colNamesToShow, nameOfNonFixedOutput));

    this.openedViewers.push(graphViewer);
    this.comparisonView.dockManager.dock(graphViewer, DG.DOCK_TYPE.DOWN, this.tableDockNode, '', DOCK_RATIO.GRAPH);
  }

  private getOutputNameForScatterPlot(names: string[], table: DG.DataFrame, start: number): string {
    for (let i = start; i < names.length; ++i) {
      const min = table.col(names[i])?.min ?? 0;
      const max = table.col(names[i])?.max ?? 0;

      if (min < max)
        return names[i];
    }

    return names[start];
  }

  private getOutputsOfInterest() {
    const outputsOfInterest = [];

    for (const outputName of Object.keys(this.store.outputs)) {
      const output = this.store.outputs[outputName];

      if (output.isInterest.value) {
        let rowVal: number | null;

        switch (output.value.returning) {
        case DF_OPTIONS.LAST_ROW:
          rowVal = -1;
          break;
        case DF_OPTIONS.FIRST_ROW:
          rowVal = 0;
          break;

        default:
          rowVal = null;
        }

        outputsOfInterest.push({
          prop: output.prop,
          value: {
            row: rowVal,
            colName: output.value.colName,
            colValue: output.value.colValue,
          }});
      }
    }

    return outputsOfInterest;
  }

  private getScatterOpt(colNamesToShow: string[], nameOfNonFixedOutput: string): Partial<DG.IScatterPlotSettings> {
    return {
      xColumnName: colNamesToShow[0],
      yColumnName: colNamesToShow[1],
      colorColumnName: nameOfNonFixedOutput,
      sizeColumnName: nameOfNonFixedOutput,
      markerMaxSize: 12,
      jitterSize: 5,
    };
  }

  private getLineChartOpt(colNamesToShow: string[]): Partial<DG.ILineChartSettings> {
    return {
      xColumnName: colNamesToShow[0],
      yColumnNames: colNamesToShow.slice(1, Math.min(colNamesToShow.length, 8)),
      markerSize: 1,
      markerType: DG.MARKER_TYPE.GRADIENT,
      multiAxis: true,
    };
  }

  private getBarChartOpt(descr: string, split: string, value: string): Partial<DG.IBarChartSettings> {
    return {
      description: descr,
      splitColumnName: split,
      valueColumnName: value,
      valueAggrType: DG.AGG.AVG,
      showTitle: false,
      showCategorySelector: false,
      showStackSelector: false,
      showValueAxis: false,
    };
  }
}
