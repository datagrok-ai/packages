import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { DimReductionMethods, IDimReductionParam, ITSNEOptions, IUMAPOptions, TSNEOptions, UMAPOptions } from '../reduce-dimensionality';
import { SEQ_SPACE_SIMILARITY_METRICS } from '../distance-metrics-methods';
import { BitArrayMetricsNames } from '../typed-metrics/consts';
import { ColumnInputOptions } from '@datagrok-libraries/utils/src/type-declarations';

export const SEQ_COL_NAMES = {
    [DG.SEMTYPE.MOLECULE]: 'Molecules',
    [DG.SEMTYPE.MACROMOLECULE]: 'Sequences'
}

export class SequenceSpaceBaseFuncEditor {
    tableInput: DG.InputBase;
    molColInput: DG.InputBase;
    molColInputRoot: HTMLElement;
    methodInput: DG.InputBase;
    methodSettingsIcon: HTMLElement;
    methodSettingsDiv = ui.inputs([]);
    methodsParams: {[key: string]: UMAPOptions | TSNEOptions} = {
      [DimReductionMethods.UMAP]: new UMAPOptions(),
      [DimReductionMethods.T_SNE]: new TSNEOptions()
    };
    similarityMetricInput: DG.InputBase;
  
    get algorithmOptions(): IUMAPOptions | ITSNEOptions {
      const algorithmParams: UMAPOptions | TSNEOptions = this.methodsParams[this.methodInput.value!];
      const options: any = {};
      Object.keys(algorithmParams).forEach((key: string) => {
        if ((algorithmParams as any)[key].value != null) 
          options[key] = (algorithmParams as any)[key].value;
      });
      return options;
    }
  
    constructor(semtype: DG.SemType){
      this.tableInput = ui.tableInput('Table', grok.shell.tv.dataFrame, undefined, () => {
        this.onTableInputChanged(semtype);
      });
      //TODO: remove when the new version of datagrok-api is available
      //@ts-ignore
      this.molColInput = ui.columnInput(SEQ_COL_NAMES[semtype], this.tableInput.value!, this.tableInput.value!.columns.bySemType(semtype), null, {filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE} as ColumnInputOptions);
      this.molColInputRoot = this.molColInput.root;
      this.methodInput = ui.choiceInput('Method', DimReductionMethods.UMAP, [DimReductionMethods.UMAP, DimReductionMethods.T_SNE], () => {
        if(settingsOpened) {
            this.createAlgorithmSettingsDiv(this.methodSettingsDiv, this.methodsParams[this.methodInput.value!]);
        }
      });
  
      this.methodSettingsIcon = ui.icons.settings(()=> {
        settingsOpened = !settingsOpened;
        if (!settingsOpened)
          ui.empty(this.methodSettingsDiv);
        else 
          this.createAlgorithmSettingsDiv(this.methodSettingsDiv, this.methodsParams[this.methodInput.value!]);
      }, 'Modify methods parameters');
      this.methodInput.root.classList.add('ml-dim-reduction-settings-input');
      this.methodInput.root.prepend(this.methodSettingsIcon);
      this.methodSettingsDiv = ui.inputs([]);
      let settingsOpened = false;

      this.similarityMetricInput = ui.choiceInput('Similarity', BitArrayMetricsNames.Tanimoto, SEQ_SPACE_SIMILARITY_METRICS);
    }
  
    createAlgorithmSettingsDiv(paramsForm: HTMLDivElement, params: UMAPOptions | TSNEOptions): HTMLElement {
      ui.empty(paramsForm);
      Object.keys(params).forEach((it: any) => {
        const param: IDimReductionParam = (params as any)[it];
        const input = ui.floatInput(param.uiName, param.value, () => {
          param.value = input.value;
        });
        ui.tooltip.bind(input.root, param.tooltip);
        paramsForm.append(input.root);
      });
      return paramsForm;
    }

    onTableInputChanged(semtype: DG.SemType) {
        this.molColInput = ui.columnInput(SEQ_COL_NAMES[semtype], this.tableInput.value!, this.tableInput.value!.columns.bySemType(semtype));
        ui.empty(this.molColInputRoot);
        Array.from(this.molColInput.root.children).forEach((it) => this.molColInputRoot.append(it));
    }
  }
