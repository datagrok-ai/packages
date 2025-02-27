import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {BaseViewApp} from '@datagrok-libraries/tutorials/src/demo-base-view';

import { addColorCoding, addSparklines, createDynamicForm, getQueryParams, performChemicalPropertyPredictions, properties, setProperties, updateColumnProperties } from './admetica-utils';
import { Model, Subgroup } from './constants';
import '../css/admetica.css';

export class AdmeticaViewApp extends BaseViewApp {
  constructor(parentCall: DG.FuncCall) {
    super(parentCall);

    this.formGenerator = this.customFormGenerator;
    this.setFunction = () => this.performAdmetica();
    this.browseView.path = 'browse/apps/Admetica';
    this.filePath = 'System:AppData/Admetica/demo_files/mol1K-demo-app.csv';
    this.tableName = 'Admetica';
  }

  protected async processFileData(): Promise<void> {
    await grok.data.detectSemanticTypes(this.tableView!.dataFrame);
    const models = properties.subgroup.flatMap((subg: Subgroup) => subg.models).map((model: Model) => model);
    const queryParams = models.map((model: Model) => model.name);
    const molColName = this.tableView!.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE)!.name;
    const molIdx = this.tableView!.dataFrame.columns.names().findIndex(c => c === molColName);
    let i = molIdx + 2;
    
    await addColorCoding(this.tableView!.dataFrame, queryParams);
    await addSparklines(this.tableView!.dataFrame, queryParams, i, 'ADMET');
    i += 1;
    await setProperties();

    for (const model of models)
      updateColumnProperties(this.tableView?.grid.col(model.name)!, model);
  
    const uniqueSubgroupNames: string[] = Array.from(
      new Set(properties.subgroup.map((subg: any) => subg.name))
    );
    
    for (const subgroupName of uniqueSubgroupNames) {
      const subgroupModels = properties.subgroup
        .filter((subg: any) => subg.name === subgroupName)
        .flatMap((subg: any) => subg.models.map((model: any) => model.name));
  
      await addSparklines(this.tableView!.dataFrame, subgroupModels, i, subgroupName);
      i += 1;
    }
  
    this.tableView!.grid.scrollToCell(molColName, 0);
  }

  private async customFormGenerator(): Promise<HTMLElement> {
    const models = await getQueryParams();

    await performChemicalPropertyPredictions(
      this.tableView!.dataFrame.getCol('smiles'),
      this.tableView!.dataFrame,
      models,
      undefined,
      false,
      false,
      true
    );

    const molIdx = this.tableView?.dataFrame.columns.names().indexOf('smiles');
    await addSparklines(this.tableView!.dataFrame, models.split(','), molIdx! + 1);
    
    const form = createDynamicForm(this.tableView!.dataFrame, models.split(','), 'smiles', false);
    return form.root;
  }

  private async performAdmetica() {
    const models = await getQueryParams();
    await performChemicalPropertyPredictions(
      this.tableView!.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE)!,
      this.tableView!.dataFrame,
      models,
      undefined,
      false,
      false,
      true
    );
  }
}