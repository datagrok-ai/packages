/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { getModelsSingle, performChemicalPropertyPredictions, addSparklines, runAdmetica } from './utils/admetica-utils';
import { properties } from './utils/admetica-utils';
import { AdmeticaBaseEditor } from './utils/admetica-editor';
import { _demoAdmetica } from './demo/demo-admetica';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//name: Biology | Admetica
//tags: panel, chem, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export async function admeticaWidget(semValue: DG.SemanticValue): Promise<DG.Widget<any>> {
  const smiles = await grok.functions.call('Chem:convertMolNotation',
    {molecule: semValue.value, sourceNotation: DG.chem.Notation.Unknown, targetNotation: DG.chem.Notation.Smiles});

  return await getModelsSingle(smiles, semValue);
}

//name: getModels
//input: string property
//output: list<string> result
export function getModels(property: string): string[] {
  return properties[property].models
    .filter((model: any) => !model.skip)
    .map((model: any) => model.name);;
}

//name: AdmeticaHT
//tags: HitTriageFunction
//input: dataframe table
//input: column molecules {semType: Molecule}
//input: list<string> absorption {choices: Admetica:getModels('Absorption'); nullable: true}
//input: list<string> distribution {choices: Admetica:getModels('Distribution'); nullable: true}
//input: list<string> metabolism {choices: Admetica:getModels('Metabolism'); nullable: true}
//input: list<string> excretion {choices: Admetica:getModels('Excretion'); nullable: true}
export async function admeticaHT(
  table: DG.DataFrame, molecules: DG.Column, absorption: string[], distribution: string[], metabolism: string[], excretion: string[], addProbabilities: boolean
  ): Promise<void> {
    const resultString: string = [...absorption, ...distribution, ...metabolism, ...excretion].join(',');
    await performChemicalPropertyPredictions(molecules, table, resultString);
}

//name: AdmeticaEditor
//tags: editor
//input: funccall call
export function admeticaEditor(call: DG.FuncCall): void {
  const funcEditor = new AdmeticaBaseEditor();
  ui.dialog({title: 'Admetica'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
      call.func.prepare({
        table: params.table,
        molecules: params.col,
        template: params.templateContent,
        models: params.models,
        addPiechart: params.addPiechart,
        addForm: params.addForm
      }).call(true);
    }).show();
}

//top-menu: Chem | Admetica | Сalculate...
//name: AdmeticaMenu
//input: dataframe table [Input data table]
//input: column molecules {type:categorical; semType: Molecule}
//input: string template
//input: list<string> models
//input: bool addPiechart
//input: bool addForm
//editor: Admetica: AdmeticaEditor
export async function admeticaMenu(
  table: DG.DataFrame, molecules: DG.Column, template: string, models: string[],
  addPiechart: boolean, addForm: boolean, properties: string
): Promise<void> {
  await performChemicalPropertyPredictions(molecules, table, models.join(','), template, addPiechart, addForm);
}

//name: Demo Admetica
//meta.demoPath: Cheminformatics | Admetica
export async function demoAdmetica(): Promise<void> {
  await _demoAdmetica();
}


//name: addAdmeProperty
//input: string molecule {semType: Molecule}
//input: string prop {choices:["Caco2", "Solubility", "Lipophilicity", "PPBR", "VDss"]}
//output: string propValue
export async function addAdmeProp(molecule: string, prop: string): Promise<any> {
  const csvString = await runAdmetica(`smiles\n${molecule}`, prop, 'false');
  return DG.DataFrame.fromCsv(csvString!).get(prop, 0);
}