import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {DIM_RED_PREPROCESSING_FUNCTION_TAG, SUPPORTED_DISTANCE_FUNCTIONS_TAG,
  SUPPORTED_SEMTYPES_TAG, SUPPORTED_TYPES_TAG, SUPPORTED_UNITS_TAG} from './consts';
import {IDBScanOptions} from '@datagrok-libraries/math';
import {Options} from '@datagrok-libraries/utils/src/type-declarations';
import {TSNEOptions, UMAPOptions} from '../multi-column-dimensionality-reduction/multi-column-dim-reduction-editor';
import {IDimReductionParam, ITSNEOptions, IUMAPOptions}
  from '../multi-column-dimensionality-reduction/multi-column-dim-reducer';
import {DimReductionMethods} from '../multi-column-dimensionality-reduction/types';
import {MCLMethodName} from '../MCL';

export const SEQ_COL_NAMES = {
  [DG.SEMTYPE.MOLECULE]: 'Molecules',
  [DG.SEMTYPE.MACROMOLECULE]: 'Sequences'
};

export type PreprocessFunctionReturnType = {
    entries: any[],
    options?: {[_: string]: any}
};

export type DimReductionEditorOptions = {
    semtype?: string,
    type?: string,
    units?: string,
    enableMCL?: boolean,
}

export type DimReductionParams = {
    table: DG.DataFrame,
    col: DG.Column,
    methodName: string,
    preprocessingFunction: DG.Func,
    similarityMetric: string,
    plotEmbeddings?: boolean,
    clusterEmbeddings?: boolean,
    options: (IUMAPOptions | ITSNEOptions) & Partial<IDBScanOptions> & {preprocessingFuncArgs?: Options} & Options
};

export class DBScanOptions {
    epsilon: IDimReductionParam = {
      uiName: 'Epsilon', value: 0.01, tooltip: 'Minimum distance between cluster points', min: 0, max: 2, step: 0.005};
    minPts: IDimReductionParam = {
      uiName: 'Minimum points', value: 4, tooltip: 'Minimum number of points in cluster', min: 1, max: 1000, step: 1};

    constructor() {};
}
export class DimReductionBaseEditor {
    editorSettings: DimReductionEditorOptions = {};
    tableInput: DG.InputBase<DG.DataFrame | null>;
    colInput!: DG.InputBase<DG.Column | null>;
    preprocessingFunctionInput: DG.InputBase<string | null>;
    plotEmbeddingsInput = ui.boolInput('Plot embeddings', true);
    clusterEmbeddingsInput = ui.boolInput('Cluster embeddings', true);
    preprocessingFunctionInputRoot: HTMLElement | null = null;
    colInputRoot!: HTMLElement;
    methods: DimReductionMethods[] = [DimReductionMethods.UMAP, DimReductionMethods.T_SNE];
    methodInput: DG.ChoiceInput<string | null>;
    methodSettingsIcon: HTMLElement;
    dbScanSettingsIcon: HTMLElement;
    preprocessingFuncSettingsIcon: HTMLElement;
    columnFunctionsMap: {[key: string]: string[]} = {};
    supportedFunctions: {[name: string]: {
        func: DG.Func,
        semTypes: string[],
        types: string[],
        units: string[],
        distanceFunctions: string[]
    }} = {};
    availableMetrics: string[] = [];
    similarityMetricInputRoot!: HTMLElement;
    methodSettingsDiv = ui.inputs([]);
    dbScanSettingsDiv = ui.inputs([]);
    preprocessingFuncSettingsDiv = ui.inputs([]);
    preprocessingFunctionSettings: Options = {};
    methodsParams: {[key: string]: UMAPOptions | TSNEOptions} = {
      [DimReductionMethods.UMAP]: new UMAPOptions(),
      [DimReductionMethods.T_SNE]: new TSNEOptions()
    };
    dbScanParams = new DBScanOptions();
    similarityMetricInput!: DG.InputBase<string | null>;
    get algorithmOptions(): (IUMAPOptions | ITSNEOptions) & Options {
      const algorithmParams: UMAPOptions | TSNEOptions = this.methodsParams[this.methodInput.value!];
      const options: any = {};
      Object.keys(algorithmParams).forEach((key: string) => {
        if ((algorithmParams as any)[key].value != null)
          options[key] = (algorithmParams as any)[key].value;
      });
      return options;
    }

    get dbScanOptions(): IDBScanOptions {
      return {
        dbScanEpsilon: this.dbScanParams.epsilon.value ?? 0.01,
        dbScanMinPts: this.dbScanParams.minPts.value ?? 4
      };
    }

    constructor(editorSettings: DimReductionEditorOptions = {}) {
      this.editorSettings = editorSettings;
      if (this.editorSettings.enableMCL)
        this.methods.push(MCLMethodName as any);

      const preporcessingFuncs = DG.Func.find({tags: [DIM_RED_PREPROCESSING_FUNCTION_TAG]});
      // map that contains all preprocessing functions and their metadata
      preporcessingFuncs.forEach((f) => {
        const semTypes: string = f.options.get(SUPPORTED_SEMTYPES_TAG) ?? '';
        const name = f.friendlyName ?? f.name;
        const types: string = f.options.get(SUPPORTED_TYPES_TAG) ?? '';
        const units: string = f.options.get(SUPPORTED_UNITS_TAG) ?? '';
        const distanceFunctions: string = f.options.get(SUPPORTED_DISTANCE_FUNCTIONS_TAG) ?? '';
        if (this.editorSettings.semtype && !semTypes.includes(this.editorSettings.semtype))
          return;
        if (this.editorSettings.type && !types.includes(this.editorSettings.type))
          return;
        if (this.editorSettings.units && !units.includes(this.editorSettings.units))
          return;

        this.supportedFunctions[name] = {
          func: f,
          semTypes: semTypes ? semTypes.split(',') : [],
          types: types ? types.split(',') : [],
          units: units ? units.split(',') : [],
          distanceFunctions: distanceFunctions ? distanceFunctions.split(',') : [],
        };
      });

      this.tableInput = ui.tableInput('Table', grok.shell.tv.dataFrame, grok.shell.tables, () => {
        this.onTableInputChanged();
      });
      this.onTableInputChanged();

      this.regenerateColInput();
      this.onColumnInputChanged();
      let settingsOpened = false;
      let dbScanSettingsOpened = false;
      this.methodInput = ui.choiceInput('Method', DimReductionMethods.UMAP,
        this.methods, () => {
          if (settingsOpened)
            this.createAlgorithmSettingsDiv(this.methodSettingsDiv, this.methodsParams[this.methodInput.value!]);
        });
      this.methodSettingsIcon = ui.icons.settings(()=> {
        settingsOpened = !settingsOpened;
        if (!settingsOpened)
          ui.empty(this.methodSettingsDiv);
        else
          this.createAlgorithmSettingsDiv(this.methodSettingsDiv, this.methodsParams[this.methodInput.value!]);
      }, 'Modify methods parameters');
      this.dbScanSettingsIcon = ui.icons.settings(()=> {
        dbScanSettingsOpened = !dbScanSettingsOpened;
        if (!dbScanSettingsOpened)
          ui.empty(this.dbScanSettingsDiv);
        else
          this.createAlgorithmSettingsDiv(this.dbScanSettingsDiv, this.dbScanParams);
      }, 'Modify clustering parameters');
      this.clusterEmbeddingsInput.classList.add('ml-dim-reduction-settings-input');
      this.clusterEmbeddingsInput.root.prepend(this.dbScanSettingsIcon);
      this.methodInput.root.classList.add('ml-dim-reduction-settings-input');
      this.methodInput.root.prepend(this.methodSettingsIcon);
      this.methodSettingsDiv = ui.inputs([]);
      const functions = this.columnFunctionsMap[this.colInput.value!.name];

      this.preprocessingFunctionInput = ui.choiceInput('Encoding function',
        functions[0], functions, () => {
          this.onPreprocessingFunctionChanged();
        });
      let flagPfi = false;
      if (!this.preprocessingFunctionInputRoot) {
        this.preprocessingFunctionInputRoot = this.preprocessingFunctionInput.root;
        flagPfi = true;
      }
      if (!flagPfi) {
        ui.empty(this.preprocessingFunctionInputRoot);
        Array.from(this.preprocessingFunctionInput.root.children)
          .forEach((child) => this.preprocessingFunctionInputRoot!.append(child));
      }
      this.preprocessingFunctionInputRoot.classList.add('ml-dim-reduction-settings-input');
      let preprocessingSettingsOpened = false;
      this.preprocessingFuncSettingsIcon = ui.icons.settings(async ()=> {
        if (!preprocessingSettingsOpened) {
          await this.createPreprocessingFuncParamsDiv(
            this.preprocessingFuncSettingsDiv, this.supportedFunctions[this.preprocessingFunctionInput.value!].func);
        } else { ui.empty(this.preprocessingFuncSettingsDiv); }
        preprocessingSettingsOpened = !preprocessingSettingsOpened;
      }, 'Modify encoding function parameters');
      this.preprocessingFunctionInputRoot.prepend(this.preprocessingFuncSettingsIcon);

      this.similarityMetricInput = ui.choiceInput('Similarity', '', [], null);
      this.similarityMetricInput.nullable = false;
      if (!this.similarityMetricInputRoot)
        this.similarityMetricInputRoot = this.similarityMetricInput.root;
      this.onPreprocessingFunctionChanged();
    }

    private getColInput() {
      const firstSupportedColumn = this.tableInput.value?.columns.toList()
        .find((col) => !!this.columnFunctionsMap[col.name]) ?? null;
      const input = ui.columnInput('Column', this.tableInput.value!, firstSupportedColumn,
        () => this.onColumnInputChanged(), {filter: (col: DG.Column) => !!this.columnFunctionsMap[col.name]});
      if (!this.colInputRoot)
        this.colInputRoot = input.root;
      return input;
    }

    private regenerateColInput() {
      let flag = false;
      if (this.colInputRoot) {
        flag = true;
        ui.empty(this.colInputRoot);
      }
      this.colInput = this.getColInput();
      if (flag)
        Array.from(this.colInput.root.children).forEach((child) => this.colInputRoot.append(child));
      this.onColumnInputChanged();
    }

    onTableInputChanged() {
      const value = this.tableInput.value;
      if (!value)
        return;
      this.columnFunctionsMap = {};
      const columns = value.columns.toList();
      columns.forEach((col) => {
        Object.keys(this.supportedFunctions).forEach((funcName) => {
          const semTypes = this.supportedFunctions[funcName].semTypes;
          const types = this.supportedFunctions[funcName].types;
          const units = this.supportedFunctions[funcName].units;
          const semTypeSupported = !semTypes.length || (col.semType && semTypes.includes(col.semType));
          const typeSuported = !types.length || types.includes(col.type);
          const unitsSupported = !units.length ||
            (col.getTag(DG.TAGS.UNITS) && units.includes(col.getTag(DG.TAGS.UNITS)));
          if (semTypeSupported && typeSuported && unitsSupported) {
            if (!this.columnFunctionsMap[col.name])
              this.columnFunctionsMap[col.name] = [];
            this.columnFunctionsMap[col.name].push(funcName);
          }
        });
      });
      this.regenerateColInput();
    }

    private onColumnInputChanged() {
      const col = this.colInput.value;
      if (!col)
        return;
      const supportedPreprocessingFunctions = this.columnFunctionsMap[col.name];
      this.preprocessingFunctionInput = ui.choiceInput('Preprocessing function',
        supportedPreprocessingFunctions[0], supportedPreprocessingFunctions, () => {
          this.onPreprocessingFunctionChanged();
        });
      let flag = false;
      if (!this.preprocessingFunctionInputRoot) {
        this.preprocessingFunctionInputRoot = this.preprocessingFunctionInput.root;
        flag = true;
      }
      if (!flag) {
        ui.empty(this.preprocessingFunctionInputRoot);
        Array.from(this.preprocessingFunctionInput.root.children)
          .forEach((child) => this.preprocessingFunctionInputRoot!.append(child));
      }
      this.onPreprocessingFunctionChanged();
    }

    private onPreprocessingFunctionChanged() {
      ui.empty(this.preprocessingFuncSettingsDiv);
      this.preprocessingFunctionSettings = {};
      const fName = this.preprocessingFunctionInput.value!;
      const distanceFs = this.supportedFunctions[fName].distanceFunctions;
      this.availableMetrics = [...distanceFs];
      this.similarityMetricInput = ui.choiceInput('Similarity', this.availableMetrics[0], this.availableMetrics, null);
      this.similarityMetricInput.nullable = false;
      if (!this.similarityMetricInputRoot)
        this.similarityMetricInputRoot = this.similarityMetricInput.root;

      ui.empty(this.similarityMetricInputRoot);
      Array.from(this.similarityMetricInput.root.children)
        .forEach((child) => this.similarityMetricInputRoot.append(child));
      if (this.preprocessingFuncSettingsIcon) {
        if (this.supportedFunctions[fName].func.inputs.length < 3)
          this.preprocessingFuncSettingsIcon.style.display = 'none';
        else
          this.preprocessingFuncSettingsIcon.style.display = 'flex';
      }
    }

    private createAlgorithmSettingsDiv(
      paramsForm: HTMLElement, params: UMAPOptions | TSNEOptions | DBScanOptions): HTMLElement {
      ui.empty(paramsForm);
      Object.keys(params).forEach((it: any) => {
        const param: IDimReductionParam | IDimReductionParam<string> | IDimReductionParam<boolean> =
          (params as any)[it];

        const input = param.type === 'string' ?
          ui.stringInput(param.uiName, param.value ?? '', () => {
            param.value = (input as DG.InputBase<string>).value;
          }) : param.type === 'boolean' ?
            ui.boolInput(param.uiName, param.value ?? false, () => {
              param.value = (input as DG.InputBase<boolean>).value;
            }) :
            ui.floatInput(param.uiName, param.value as any, () => {
              param.value = input.value;
            });
        paramsForm.append(input.root);
        if (param.disable) {
          input.enabled = false;
          ui.tooltip.bind(input.input ?? input.root, param.disableTooltip ?? '');
        } else { ui.tooltip.bind(input.input ?? input.root, param.tooltip); }
      });
      return paramsForm;
    }

    private async createPreprocessingFuncParamsDiv(paramsForm: HTMLElement, func: DG.Func): Promise<HTMLElement> {
      ui.empty(paramsForm);
      if (func.inputs.length < 3)
        return ui.div();
      const fc = func.prepare();
      const inputs = await fc.buildEditor(ui.div());
      for (let i = 2; i < func.inputs.length; i++) {
        const fInput = func.inputs[i];
        if (this.preprocessingFunctionSettings[fInput.name] || fc.inputParams[func.inputs[i].name].value ||
           fInput.defaultValue) {
          this.preprocessingFunctionSettings[fInput.name] =
            this.preprocessingFunctionSettings[fInput.name] ?? fc.inputParams[fInput.name].value ?? fInput.defaultValue;
        }
        const input = inputs.find((inp) => inp.property.name === fInput.name);
        if (!input)
          continue;
        if (this.preprocessingFunctionSettings[fInput.name] !== null &&
          this.preprocessingFunctionSettings[fInput.name] !== undefined)
          input.value = this.preprocessingFunctionSettings[fInput.name];
        input.onChanged(() => { this.preprocessingFunctionSettings[fInput.name] = input.value; });
        paramsForm.append(input.root);
      }
      return paramsForm;
    }

    public getEditor(): HTMLElement {
      return ui.div([
        this.tableInput,
        this.colInputRoot,
        this.preprocessingFunctionInputRoot,
        this.preprocessingFuncSettingsDiv,
        this.methodInput,
        this.methodSettingsDiv,
        this.similarityMetricInputRoot,
        this.plotEmbeddingsInput,
        this.clusterEmbeddingsInput,
        this.dbScanSettingsDiv
      ], {style: {minWidth: '420px'}, classes: 'ui-form dim-reduction-dialog-form'});
    }

    public getParams(): DimReductionParams {
      return {
        table: this.tableInput.value!,
        col: this.colInput.value!,
        methodName: this.methodInput.value!,
        preprocessingFunction: this.supportedFunctions[this.preprocessingFunctionInput.value!].func,
        similarityMetric: this.similarityMetricInput.value!,
        plotEmbeddings: this.plotEmbeddingsInput.value!,
        clusterEmbeddings: this.clusterEmbeddingsInput.value!,
        options: {...this.algorithmOptions, ...this.dbScanOptions,
          preprocessingFuncArgs: (this.preprocessingFunctionSettings ?? {})}
      };
    }
}
