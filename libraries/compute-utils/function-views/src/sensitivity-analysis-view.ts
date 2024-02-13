/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {BehaviorSubject} from 'rxjs';
import {getDfFromRuns, getPropViewers} from './shared/utils';
import {SobolAnalysis} from './variance-based-analysis/sobol-sensitivity-analysis';
import {RandomAnalysis} from './variance-based-analysis/random-sensitivity-analysis';
import {getOutput} from './variance-based-analysis/sa-outputs-routine';
import {getCalledFuncCalls} from './variance-based-analysis/utils';
import {RunComparisonView} from './run-comparison-view';
import {combineLatest} from 'rxjs';
import '../css/sens-analysis.css';
import {CARD_VIEW_TYPE, VIEWER_PATH, viewerTypesMapping} from '../../shared-utils/consts';

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
  BY_COL_VAL = 'By column value',
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

type SensitivityStore = SensitivityNumericStore | SensitivityBoolStore | SensitivityConstStore;

const getSwitchMock = () => ui.div([], 'sa-switch-input');

export class SensitivityAnalysisView {
  generateInputFields = (func: DG.Func) => {
    const analysisInputs = {
      analysisType: {
        input: ui.choiceInput(
          'Method', ANALYSIS_TYPE.RANDOM_ANALYSIS, [ANALYSIS_TYPE.GRID_ANALYSIS, ANALYSIS_TYPE.RANDOM_ANALYSIS, ANALYSIS_TYPE.SOBOL_ANALYSIS],
          (v: ANALYSIS_TYPE) => {
            analysisInputs.analysisType.value.next(v);
            this.updateRunButtonText();
          }),
        value: new BehaviorSubject(ANALYSIS_TYPE.RANDOM_ANALYSIS),
      },
      samplesCount: {
        input: ui.intInput('Samples', 10, (v: number) => {
          analysisInputs.samplesCount.value = v;
          this.updateRunButtonText();
        }),
        value: 10,
      },
    } as AnalysisProps;

    analysisInputs.analysisType.input.root.insertBefore(getSwitchMock(), analysisInputs.analysisType.input.captionLabel);
    analysisInputs.samplesCount.input.root.insertBefore(getSwitchMock(), analysisInputs.samplesCount.input.captionLabel);

    const getInputValue = (input: DG.Property, key: string) => (
      input.options[key] === undefined ? input.defaultValue : Number(input.options[key])
    );

    const getSwitchElement = (defaultValue: boolean, f: (v: boolean) => any, isInput = true) => {
      const input = ui.switchInput(' ', defaultValue, f);
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
      switch (inputProp.propertyType) {
      case DG.TYPE.INT:
      case DG.TYPE.BIG_INT:
      case DG.TYPE.FLOAT:
        const isChangingInputMin = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateRunButtonText();
        });

        const isChangingInputConst = getSwitchElement(false, (v: boolean) => {
          ref.isChanging.next(v);
          this.updateRunButtonText();
        });

        const temp = {
          type: inputProp.propertyType,
          prop: inputProp,
          const: {
            input:
            (() => {
              const inp = ui.intInput(inputProp.caption ?? inputProp.name, inputProp.defaultValue, (v: number) => ref.const.value = v);
              inp.root.insertBefore(isChangingInputConst.root, inp.captionLabel);
              inp.addPostfix(inputProp.options['units']);
              return inp;
            })(),
            value: inputProp.defaultValue,
          },
          min: {
            input:
              (() => {
                const inp = ui.floatInput(`${inputProp.caption ?? inputProp.name} min`, getInputValue(inputProp, 'min'), (v: number) => (ref as SensitivityNumericStore).min.value = v);
                inp.root.insertBefore(isChangingInputMin.root, inp.captionLabel);
                inp.addPostfix(inputProp.options['units']);
                return inp;
              })(),
            value: getInputValue(inputProp, 'min'),
          },
          max: {
            input: (() => {
              const inp = ui.floatInput(`${inputProp.caption ?? inputProp.name} max`, getInputValue(inputProp, 'max'), (v: number) => (ref as SensitivityNumericStore).max.value = v);
              inp.addPostfix(inputProp.options['units']);
              return inp;
            })(),
            value: getInputValue(inputProp, 'max'),
          },
          lvl: {
            input: ui.intInput('Samples', 3, (v: number) => {
              (ref as SensitivityNumericStore).lvl.value = v;
              this.updateRunButtonText();
            }),
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
        });
        ref.isChanging.subscribe((val) => {
          isChangingInputConst.notify = false;
          isChangingInputConst.value = val;
          isChangingInputConst.notify = true;
        });
        combineLatest([
          temp.isChanging, analysisInputs.analysisType.value,
        ]).subscribe(([isChanging, analysisType]) => {
          if (isChanging) {
            ref.constForm.forEach((input) => $(input.root).show());
            ref.saForm.forEach((input) => $(input.root).show());
            simpleSa.forEach((input) => analysisType === ANALYSIS_TYPE.GRID_ANALYSIS ? $(input.root).show(): $(input.root).hide());
          } else {
            ref.constForm.forEach((input) => $(input.root).show());
            ref.saForm.forEach((input) => $(input.root).hide());
          }
        });
        break;

      case DG.TYPE.BOOL:
        const isChangingInputBoolConst = getSwitchElement(false, (v: boolean) => {
          boolRef.isChanging.next(v);
          this.updateRunButtonText();
        });

        const tempBool = {
          type: inputProp.propertyType,
          prop: inputProp,
          const: {
            input: (() => {
              const temp = ui.boolInput(`${inputProp.caption ?? inputProp.name}`, inputProp.defaultValue ?? false, (v: boolean) => boolRef.const.value = v);
              temp.root.insertBefore(isChangingInputBoolConst.root, temp.captionLabel);

              return temp;
            })(),
            value: false,
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
            const temp = ui.input.forProperty(inputProp, undefined, {onValueChanged: (v: DG.InputBase) => tempDefault.value = v.value});
            temp.root.insertBefore(switchMock, temp.captionLabel);

            temp.addPostfix(inputProp.options['units']);

            return temp;
          })(),
          value: inputProp.defaultValue,
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
            const input = outputProp.propertyType === DG.TYPE.DATA_FRAME ?
              ui.choiceInput(outputProp.caption ?? outputProp.name, DF_OPTIONS.LAST_ROW, [DF_OPTIONS.LAST_ROW, DF_OPTIONS.FIRST_ROW, DF_OPTIONS.BY_COL_VAL], (v: DF_OPTIONS) => {
                temp.value.returning = v;

                temp.analysisInputs.forEach((inp) => {
                  inp.root.hidden = (v !== DF_OPTIONS.BY_COL_VAL);
                });
              }):
              ui.input.forProperty(outputProp);

            input.addCaption(outputProp.caption ?? outputProp.name);

            const isInterestInput = supportedOutputTypes.includes(outputProp.propertyType) ?
              getSwitchElement(
                true,
                (v: boolean) => {
                  temp.isInterest.next(v);
                  temp.analysisInputs.forEach((inp) => {
                    inp.root.hidden = (temp.value.returning !== DF_OPTIONS.BY_COL_VAL);
                  });
                  this.updateRunButtonText();
                },
                false,
              ).root: getSwitchMock();
            input.root.insertBefore(isInterestInput, input.captionLabel);

            return input;
          })(),
        analysisInputs:
          outputProp.propertyType === DG.TYPE.DATA_FRAME ? [(() => {
            const input = ui.stringInput('Column', DF_OPTIONS.ALL_COLUMNS, (v: string) => {
              temp.value.colName = v;
            });
            input.root.insertBefore(getSwitchMock(), input.captionLabel);
            input.root.hidden = true;
            return input;
          })(),
          (() => {
            const input = ui.floatInput('Value', 0, (v: number) => {temp.value.colValue = v});
            input.root.insertBefore(getSwitchMock(), input.captionLabel);
            input.root.hidden = true;
            return input;            
          })()
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

  store = this.generateInputFields(this.func);
  comparisonView: DG.TableView;

  static async fromEmpty(
    func: DG.Func,
    options: {
      parentView?: DG.View,
      parentCall?: DG.FuncCall,
    } = {
      parentView: undefined,
      parentCall: undefined,
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
    } = {
      parentView: undefined,
      parentCall: undefined,
      configFunc: undefined,
    },
  ) {
    this.runButton = this.buildRunButton();
    const form = this.buildFormWithBtn();
    this.addTooltips();
    this.comparisonView = baseView;

    const saDock = this.comparisonView.dockManager.dock(
      form,
      DG.DOCK_TYPE.LEFT,
      null,
      `${this.func.name} - Sensitivity Analysis`,
      0.25,
    );
    /*saDock.container.containerElement.style.minWidth = '220px';
    saDock.container.containerElement.style.maxWidth = '390px';*/

    this.comparisonView.grid.columns.byName(RUN_NAME_COL_LABEL)!.visible = false;
  }

  private closeOpenedViewers() {
    for (const v of this.openedViewers)
      v.close();

    this.openedViewers.splice(0);
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

  private updateRunButtonText(): void {
    this.runButton.textContent = `Run (${this.getFuncCallCountAsString()})`;
  }

  private buildFormWithBtn() {
    let prevCategory = 'Misc';
    const form = Object.values(this.store.inputs)
      .reduce((container, inputConfig) => {
        const prop = inputConfig.prop;
        if (prop.category !== prevCategory) {
          container.append(ui.h2(prop.category));
          prevCategory = prop.category;
        }

        container.append(
          ...inputConfig.constForm.map((input) => input.root),
          ...inputConfig.saForm.map((input) => input.root),
        );

        return container;
      }, ui.form([
        this.store.analysisInputs.analysisType.input,
        this.store.analysisInputs.samplesCount.input,
      ], {style: {'overflow-y': 'scroll', 'width': '100%'/*, 'padding-right': '4px'*/}}));

    const outputsTitle = ui.h2('Outputs');
    form.appendChild(outputsTitle);
    prevCategory = 'Misc';

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
      if (this.store.outputs[name].isInterest.value === true) {
        isAnyOutputSelectedAsOfInterest = true;
        break;
      }
    }

    if (!isAnyOutputSelectedAsOfInterest) {
      const firstOutput = this.store.outputs[Object.keys(this.store.outputs)[0]];
      firstOutput.isInterest.next(true);
      // firstOutput.isInterest.input.value = true;
    }

    this.updateRunButtonText();

    const buttons = ui.buttonsInput([this.runButton]);

    form.appendChild(
      buttons,
    );

    ui.tools.handleResize(form, (w: number) => {
      if (w < 320)
        $(form).addClass('ui-form-condensed');
      else
        $(form).removeClass('ui-form-condensed');
    });

    return form;
  }

  private addTooltips(): void {
    // type of analysis
    ui.tooltip.bind(this.store.analysisInputs.analysisType.input.root, () => {
      switch (this.store.analysisInputs.analysisType.value.value) {
      case ANALYSIS_TYPE.GRID_ANALYSIS:
        return 'Grid analysis: the function is evaluated with respect to the selected inputs varying within the specified ranges';
      case ANALYSIS_TYPE.RANDOM_ANALYSIS:
        return 'Monte Carlo simulation: the function is evaluated with respect to random variation of the selected inputs within the specified ranges';
      case ANALYSIS_TYPE.SOBOL_ANALYSIS:
        return 'Variance-based sensitivity analysis: the Sobol\' indices are computed';
      default:
        return 'Unknown method!';
      }
    });

    // run button
    ui.tooltip.bind(this.runButton, () => {
      if (!this.isAnyInputSelected())
        return 'Select mutable input(s) to run sensitivity analysis';

      if (!this.isAnyOutputSelected())
        return 'Select output(s) requiring analysis';

      return `Run sensitivity analysis: the function is evaluated ${this.getFuncCallCount(this.store.analysisInputs, this.store.inputs)} times`;
    });

    // samples count
    ui.tooltip.bind(this.store.analysisInputs.samplesCount.input.root, () => {
      switch (this.store.analysisInputs.analysisType.value.value) {
      case ANALYSIS_TYPE.RANDOM_ANALYSIS:
        return 'Input parameters sets count';
      case ANALYSIS_TYPE.SOBOL_ANALYSIS:
        return 'Sample size for the Sobol\' indices computation';
      default:
        return 'Unknown method!';
      }
    });

    // switchInputs for inputs
    for (const propName of Object.keys(this.store.inputs)) {
      const inpType = this.store.inputs[propName].prop.propertyType;
      if (inpType === DG.TYPE.BOOL || inpType === DG.TYPE.STRING)
        continue;

      const propConfig = this.store.inputs[propName];

      const name = propConfig.prop.caption ?? propConfig.prop.name;

      ui.tooltip.bind(propConfig.const.input.root, 'Input value');
      ui.tooltip.bind((propConfig as SensitivityNumericStore).min.input.root, `Min & Max values of ${name}`);
      ui.tooltip.bind((propConfig as SensitivityNumericStore).max.input.root, `Min & Max values of ${name}`);
      ui.tooltip.bind((propConfig as SensitivityNumericStore).lvl.input.root, `Number of samples along the axis ${name}`);
      //ui.tooltip.bind((propConfig as SensitivityNumericStore).distrib.input.root, 'Type of grid');
    }

    // switchInputs for outputs
    for (const propName of Object.keys(this.store.outputs)) {
      const propConfig = this.store.outputs[propName];

      switch (propConfig.prop.propertyType) {
      case DG.TYPE.DATA_FRAME:
        ui.tooltip.bind(propConfig.input.root, () => {
          if (propConfig.isInterest.value === false)
            return 'Dataframe';
          return 'Specify dataframe part that requires analysis';
        });
        break;
      case DG.TYPE.INT:
      case DG.TYPE.FLOAT:
      case DG.TYPE.BIG_INT:
        ui.tooltip.bind(propConfig.input.root, 'Scalar');
        break;
      default:
        break;
      }
    }
  }

  private isAnyInputSelected(): boolean {
    for (const propName of Object.keys(this.store.inputs)) {
      if (this.store.inputs[propName].isChanging.value === true)
        return true;
    }
    return false;
  }

  private isAnyOutputSelected(): boolean {
    for (const propName of Object.keys(this.store.outputs)) {
      if (this.store.outputs[propName].isInterest.value === true)
        return true;
    }
    return false;
  }

  private canEvaluationBeRun(): boolean {
    return this.isAnyInputSelected() && this.isAnyOutputSelected();
  }

  private buildRunButton(): HTMLButtonElement {
    return ui.bigButton('Run', async () => {
      if (!this.canEvaluationBeRun())
        return;

      switch (this.store.analysisInputs.analysisType.value.value) {
      case ANALYSIS_TYPE.GRID_ANALYSIS:
        this.runGridAnalysis();
        break;
      case ANALYSIS_TYPE.RANDOM_ANALYSIS:
        this.runRandomAnalysis();
        break;
      case ANALYSIS_TYPE.SOBOL_ANALYSIS:
        this.runSobolAnalysis();
        break;
      default:
        break;
      }
    });
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

    const ID_COLUMN_NAME = 'ID';
    funcEvalResults.columns.add(DG.Column.fromStrings(ID_COLUMN_NAME, calledFuncCalls.map((call) => call.id)));

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);

    // add correlation plot    
    const corPlot = this.comparisonView.addViewer(DG.Viewer.correlationPlot(
      funcEvalResults, 
      {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow}
    ));
    this.comparisonView.dockManager.dock(corPlot, 'right', undefined, '', 0.4);
    this.openedViewers.push(corPlot);

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, options.variedInputs.length);

    // add other vizualizations depending on the varied inputs dimension
    if (options.variedInputs.length === 1) {
      const lineChart = this.comparisonView.addViewer(
        DG.Viewer.lineChart(DG.DataFrame.fromColumns(funcEvalResults.columns.byNames(colNamesToShow)), {
          x: colNamesToShow[0],
          markerSize: 1,
          markerType: 'gradient',
          sharex: true,
          multiAxis: true,
          multiAxisLegendPosition: 'RightCenter',
        }));
      this.openedViewers.push(lineChart);
    } else {
      const scatterPlot = this.comparisonView.addViewer(DG.Viewer.scatterPlot( funcEvalResults, {
        x: colNamesToShow[0],
        y: colNamesToShow[1],
        color: nameOfNonFixedOutput,
        size: nameOfNonFixedOutput,
        markerMaxSize: 12,
        jitterSize: 5,
      }));
      this.openedViewers.push(scatterPlot);
    }

    // add barchart with 1-st order Sobol' indices
    const bChartSobol1 = this.comparisonView.addViewer(DG.Viewer.barChart(firstOrderIndeces));
    this.comparisonView.dockManager.dock(bChartSobol1, 'right', undefined, '', 0.2);
    bChartSobol1.setOptions({
      title: firstOrderIndeces.name,
      split: outputNames[0],
      value: nameOfNonFixedOutput,
      valueAggrType: 'avg',
      showTitle: true,
    },);

    // add barchart with total order Sobol' indices
    const bChartSobolT = this.comparisonView.addViewer(DG.Viewer.barChart(totalOrderIndeces,
      {title: totalOrderIndeces.name,
        split: outputNames[0],
        value: nameOfNonFixedOutput,
        valueAggrType: 'avg',
        showTitle: true,
      },
    ));

    this.openedViewers = this.openedViewers.concat([bChartSobol1, bChartSobolT]);

    this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRunId = cell.tableRow?.get(ID_COLUMN_NAME);
      const selectedRun = calledFuncCalls.find((call) => call.id === selectedRunId);

      if (!selectedRun) return;

      const scalarParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
        .filter((param) => DG.TYPES_SCALAR.has(param.property.propertyType));
      const scalarTable = DG.HtmlTable.create(
        scalarParams,
        (scalarVal: DG.FuncCallParam) =>
          [scalarVal.property.caption ?? scalarVal.property.name, selectedRun.outputs[scalarVal.property.name], scalarVal.property.options['units']],
      ).root;

      const dfParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
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

      const overviewPanelConfig = {
        'Output scalars': [scalarTable],
        ...dfPanes,
      };
      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

      this.comparisonView.grid.props.rowHeight = 25;

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

    const ID_COLUMN_NAME = 'ID';
    funcEvalResults.columns.add(DG.Column.fromStrings(ID_COLUMN_NAME, calledFuncCalls.map((call) => call.id)));

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);

    // add correlation plot
    const corPlot = this.comparisonView.addViewer(DG.Viewer.correlationPlot(
      funcEvalResults, 
      {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow}
    ));
    this.comparisonView.dockManager.dock(corPlot, 'right', undefined, '', 0.4);
    this.openedViewers.push(corPlot);
    this.comparisonView.grid.props.rowHeight = 25;

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, options.variedInputs.length);

    // add other vizualizations depending on the varied inputs dimension
    if (options.variedInputs.length === 1) {
      const lineChart = this.comparisonView.addViewer(
        DG.Viewer.lineChart(DG.DataFrame.fromColumns(funcEvalResults.columns.byNames(colNamesToShow)), {
          x: colNamesToShow[0],
          markerSize: 1,
          markerType: 'gradient',
          sharex: true,
          multiAxis: true,
          multiAxisLegendPosition: 'RightCenter',
        }));
      this.openedViewers.push(lineChart);
    } else {
      const scatterPlot = this.comparisonView.addViewer(DG.Viewer.scatterPlot( funcEvalResults, {
        x: colNamesToShow[0],
        y: colNamesToShow[1],
        color: nameOfNonFixedOutput,
        size: nameOfNonFixedOutput,
        markerMaxSize: 12,
        jitterSize: 5,
      }));
      this.openedViewers.push(scatterPlot);
    }

    this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRunId = cell.tableRow?.get(ID_COLUMN_NAME);
      const selectedRun = calledFuncCalls.find((call) => call.id === selectedRunId);

      if (!selectedRun) return;

      const scalarParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
        .filter((param) => DG.TYPES_SCALAR.has(param.property.propertyType));
      const scalarTable = DG.HtmlTable.create(
        scalarParams,
        (scalarVal: DG.FuncCallParam) =>
          [scalarVal.property.caption ?? scalarVal.property.name, selectedRun.outputs[scalarVal.property.name], scalarVal.property.options['units']],
      ).root;

      const dfParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
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

      const overviewPanelConfig = {
        'Output scalars': [scalarTable],
        ...dfPanes,
      };
      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

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

    const ID_COLUMN_NAME = 'ID';
    const inputsOfInterestColumns = [
      DG.Column.fromStrings(ID_COLUMN_NAME, calledFuncCalls.map((call) => call.id)),
      ...variedInputsColumns,
    ];

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

    const colNamesToShow = funcEvalResults.columns.names().filter((name) => name !== ID_COLUMN_NAME);
    
    for (const col of fixedInputsColumns) {
      col.name = funcEvalResults.columns.getUnusedName(`${col.name} (fixed)`);
      funcEvalResults.columns.add(col);
    }

    this.comparisonView.dataFrame = funcEvalResults;
    this.comparisonView.grid.col(ID_COLUMN_NAME)!.visible = false;
    this.comparisonView.grid.onCellClick.subscribe((cell: DG.GridCell) => {
      const selectedRunId = cell.tableRow?.get(ID_COLUMN_NAME);
      const selectedRun = calledFuncCalls.find((call) => call.id === selectedRunId);

      if (!selectedRun) return;

      const scalarParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
        .filter((param) => DG.TYPES_SCALAR.has(param.property.propertyType));
      const scalarTable = DG.HtmlTable.create(
        scalarParams,
        (scalarVal: DG.FuncCallParam) =>
          [scalarVal.property.caption ?? scalarVal.property.name, selectedRun.outputs[scalarVal.property.name], scalarVal.property.options['units']],
      ).root;

      const dfParams = ([...selectedRun.outputParams.values()] as DG.FuncCallParam[])
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

      const overviewPanelConfig = {
        'Output scalars': [scalarTable],
        ...dfPanes,
      };
      const overviewPanel = ui.accordion();
      $(overviewPanel.root).css({'width': '100%'});
      Object.entries(overviewPanelConfig).map((e) => {
        overviewPanel.addPane(e[0], () => ui.divV(e[1]));
      });

      grok.shell.o = overviewPanel.root;
    });

    // hide columns with fixed inputs
    this.comparisonView.grid.columns.setVisible([colNamesToShow[0]]); // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13450
    this.comparisonView.grid.columns.setVisible(colNamesToShow);

    // add correlation plot    
    const corPlot = this.comparisonView.addViewer(DG.Viewer.correlationPlot(
      funcEvalResults, 
      {xColumnNames: colNamesToShow, yColumnNames: colNamesToShow}
    ));
    this.comparisonView.dockManager.dock(corPlot, 'right', undefined, '', 0.4);
    this.openedViewers.push(corPlot);
    this.comparisonView.grid.props.rowHeight = 25;

    const nameOfNonFixedOutput = this.getOutputNameForScatterPlot(colNamesToShow, funcEvalResults, variedInputsColumns.length);

    // add other vizualizations depending on the varied inputs dimension
    switch (variedInputsColumns.length) {
    case 1:
      const lineChart = this.comparisonView.addViewer(
        DG.Viewer.lineChart(DG.DataFrame.fromColumns(funcEvalResults.columns.byNames(colNamesToShow)), {
          x: colNamesToShow[0],
          markerSize: 1,
          markerType: 'gradient',
          sharex: true, multiAxis: true,
          multiAxisLegendPosition: 'RightCenter',
        }));
      this.openedViewers.push(lineChart);
      break;

    case 2:
      const surfacePlot = this.comparisonView.addViewer(DG.VIEWER.SURFACE_PLOT, {
        X: colNamesToShow[0], // here, captials are used due to features of surface plot
        Y: colNamesToShow[1],
        Z: nameOfNonFixedOutput,
      });
      this.openedViewers.push(surfacePlot);
      break;

    default:
      const scatterPlot = this.comparisonView.addViewer(DG.Viewer.scatterPlot(
        funcEvalResults, {
          x: colNamesToShow[0],
          y: colNamesToShow[1],
          color: nameOfNonFixedOutput,
          size: nameOfNonFixedOutput,
          markerMaxSize: 12,
          jitterSize: 5,
        }));
      this.openedViewers.push(scatterPlot);
      break;
    }
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
            rowVal = 1;
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
}
