/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {u2} from "@datagrok-libraries/utils/src/u2";
import {MoleculeFieldSearch, getVaults, MoleculeQueryParams, queryMolecules, queryReadoutRows} from "./cdd-vault-api";
import { CDDVaultSearchType } from './constants';
import '../css/cdd-vault.css';
import { SeachEditor } from './search-function-editor';

export const _package = new DG.Package();

//tags: app
//name: CDD Vault
//meta.icon: images/cdd-icon-small.png
//output: view v
//meta.browsePath: Chem
export async function cddVaultApp(): Promise<DG.ViewBase> {

  const appHeader = u2.appHeader({
    iconPath: _package.webRoot + '/images/cdd-icon-big.png',
    learnMoreUrl: 'https://github.com/datagrok-ai/public/blob/master/packages/CddVaultLink/README.md',
    description: '- Integrate with your CDD Vault.\n' +
      '- Analyze assay data.\n' +
      '- Find contextual information on molecules.\n' +
      '- Browse the vault content.\n'
  });

  return DG.View.fromRoot(appHeader);
}

//input: dynamic treeNode
//input: view browseView
export async function cddVaultAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: any) {
  const vaults = await getVaults();
  console.log(vaults);

  for (const vault of vaults.data!) {
    const vaultNode = treeNode.group(vault.name);
    const moleculesNode = vaultNode.item('Molecules');

    moleculesNode.onSelected.subscribe(async (_) => {
      const molecules = await queryMolecules(vault.id, { page_size: 100 });
      console.log(molecules);
      const df = DG.DataFrame.fromObjects(molecules.data!.objects!)!;
      await grok.data.detectSemanticTypes(df);
      const tv = DG.TableView.create(df, false);
      browseView.preview = tv;
      
    });

    const searchNode = vaultNode.item('Search');
    searchNode.onSelected.subscribe(() => {
      const view = DG.View.create();
      const funcEditor = new SeachEditor(vault.id);
      const acc = funcEditor.getEditor();
      const runButton = ui.bigButton('SEARCH', async () => {
        ui.setUpdateIndicator(gridDiv, true);
        const params = funcEditor.getParams();
        //!!!!!!!!!!!!!!!!!!!TODO!!!!!!!!!!!!!! Call function using funcCall
        const df = await cDDVaultSearch2(vault.id, params.structure, params.structure_search_type, params.structure_similarity_threshold,
          params.protocol, params.run);
        ui.empty(gridDiv);
        gridDiv.append(df.plot.grid().root);
        ui.setUpdateIndicator(gridDiv, false);
      });
      const gridDiv = ui.div('', 'cdd-vault-search-res-div');
      runButton.classList.add('cdd-vault-run-search-button');
      view.root.append(ui.divV([
        acc,
        runButton,
        gridDiv
      ]));
      browseView.preview = view;
    });

   // searchNode.onSelected.subscribe(async (_) => {
      // const searchView = DG.View.create();
      // const searchTypesAcc = ui.accordion(`search_${vault.name}`);
      // searchView.append(searchTypesAcc);
      // const searchTypeInput = ui.input.choice('', {
      //   value: CDD_SEARCH_TYPES[0], items: CDD_SEARCH_TYPES, onValueChanged: () => {
      //     searchTypeInput.value === CDDVaultSearchType.SIMILARITY ?
      //       searchOptionsDiv.classList.add('cdd-vault-similarity-search') :
      //       searchOptionsDiv.classList.remove('cdd-vault-similarity-search');
      //   }
      // });

      // const property =
      // {
      //   'name': 'lim',
      //   'type': DG.TYPE.FLOAT,
      //   'showSlider': true,
      //   'min': 0,
      //   'max': 1,
      //   'nullable': false,
      // };
      // const slider = DG.Property.fromOptions(property);
      // const initialCutOff = { lim: 0.8 };
      // const similarityCutOffInput = ui.input.forProperty(slider, initialCutOff);
      // similarityCutOffInput.classList.add('cdd-vault-search-similarity-limit');

      // const searchOptionsDiv = ui.divH([searchTypeInput.root, similarityCutOffInput.root]);

      // const sketcher = new DG.chem.Sketcher(grok.chem.SKETCHER_MODE.EXTERNAL);
      // sketcher.root.classList.add('cdd-vault-search-sketcher-root');

      // const runButton = ui.bigButton('SEARCH', async () => {
      //   const cddMols = await queryMolecules(vaults.data![0].id, { structure: sketcher.getMolFile(), structure_search_type: "substructure"});
      //   ui.empty(resultsGridDiv);
      //   const df = DG.DataFrame.fromObjects(cddMols.data!.objects!)!;
      //   await grok.data.detectSemanticTypes(df);
      //   resultsGridDiv.append(df.plot.grid().root);
      // });
      // runButton.classList.add('cdd-vault-run-search-button');

      // const resultsGridDiv = ui.div();

      // searchTypesAcc.addPane('By Structure', () => ui.divV([
      //   searchOptionsDiv,
      //   ui.div(sketcher.root, 'cdd-vault-search-sketcher-div'),
      //   runButton,
      //   resultsGridDiv        
      // ], 'cdd-vault-search-panel'));


   // });


    vaultNode.group('Protocols');
    vaultNode.group('Plates');
    vaultNode.group('Assays');
  }
}


//name: Databases | CDD Vault
//input: string mol {semType: Molecule}
//tags: panel
//output: widget result
export function molColumnPropertyPanel(molecule: string): DG.Widget {
  return DG.Widget.fromRoot(ui.wait(async () => {
    const vaults = await getVaults();
    const vaultId = vaults.data![0].id;
    const cddMols = await queryMolecules(vaultId, { structure: molecule, structure_search_type: "exact"});

    if (!cddMols.data?.objects?.length)
      return ui.divText('Not found');

    return ui.tableFromMap(cddMols.data.objects[0]);
  }))
}

//name: CDDVaultSearchEditor
//tags: editor
//input: funccall call
export async function CDDVaultSearchEditor(call: DG.FuncCall): Promise<void> {
  const vaults = await getVaults();
  const vaultId = vaults.data![0].id;
  const funcEditor = new SeachEditor(vaultId);
  const dialog = ui.dialog({title: 'CDD search'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
    });
  //dialog.history(() => ({editorSettings: funcEditor.getStringInput()}), (x: any) => funcEditor.applyStringInput(x['editorSettings']));
  dialog.show();
}

//name: CDD Vault search 2
//input: int vaultId {nullable: true}
//input: string structure {category: Structure; nullable: true; semType: Molecule} [SMILES; cxsmiles or mol string]
//input: string structure_search_type {category: Structure; nullable: true; choices: ["exact", "similarity", "substructure"]} [SMILES, cxsmiles or mol string]
//input: double structure_similarity_threshold {category: Structure; nullable: true} [A number between 0 and 1]
//input: int protocol {category: Protocol; nullable: true} [Protocol id]
//input: int run {category: Protocol; nullable: true} [Specific run id]
//output: dataframe df
//editor: Cddvaultlink:CDDVaultSearchEditor
export async function cDDVaultSearch2(vaultId?: number, structure?: string, structure_search_type?: CDDVaultSearchType,
  structure_similarity_threshold?: number, protocol?: number, run?: number): Promise<DG.DataFrame> {
  if (!vaultId) {
    const vaults = await getVaults();
    vaultId = vaults.data![0].id;
  }
  //collecting molecule ids according to protocol query params
  const molIds: number[] = [];
  if (protocol) {
    const readoutRowsRes = (await queryReadoutRows(vaultId, {protocols: protocol.toString(), runs: run?.toString(), page_size: 1000})).data?.objects;
    if (readoutRowsRes) {
      for (const readoutRow of readoutRowsRes)
        if (!molIds.includes(readoutRow.molecule))
          molIds.push(readoutRow.molecule)
    }      
  }
  const molQueryParams: MoleculeQueryParams = !structure ? {molecules: molIds.join(',')} :
    {structure: structure, structure_search_type: structure_search_type, structure_similarity_threshold: structure_similarity_threshold};

  molQueryParams.page_size = 1000;
  const cddMols = await queryMolecules(vaultId, molQueryParams);
  if (cddMols.data?.objects && cddMols.data?.objects.length) {
    //in case we had both protocol and structure conditions - combine them together
    const molsRes = protocol && structure ? cddMols.data!.objects!.filter((it) => molIds.includes(it.id)) : cddMols.data?.objects;
    const df = DG.DataFrame.fromObjects(molsRes)!;
    await grok.data.detectSemanticTypes(df);
    return df;
  }
  return DG.DataFrame.create();
}


//name: CDD Vault search
//input: int vaultId {nullable: true}
//input: string molecules {category: General; nullable: true} [Comma separated list of ids] 
//input: string names {category: General; nullable: true} [Comma separated list of names/synonyms]
//input: bool include_original_structures {category: General; nullable: true} [If true, include the original user defined structure for each molecule]
//input: bool only_ids {category: General; nullable: true} [If true, only the Molecule IDs are returned, allowing for a smaller and faster response]
//input: bool only_batch_ids {category: General; nullable: true} [If true, the full Molecule details are still returned but the Batch-level information is left out of the JSON results. (Only the IDs of the Batches belonging to the Molecules are still included.)]
//input: string created_before {category: General; nullable: true} [ISO 8601 date] 
//input: string created_after {category: General; nullable: true} [ISO 8601 date] 
//input: string modified_before {category: General; nullable: true} [ISO 8601 date] 
//input: string modified_after {category: General; nullable: true} [ISO 8601 date]
//input: string batch_created_before {category: Batch fields; nullable: true} [ISO 8601 date. A molecule with any batch that has a creation date on or before the parameter will be included] 
//input: string batch_created_after {category: Batch fields; nullable: true} [ISO 8601 date. A molecule with any batch that has a creation date on or after the parameter will be included] 
//input: string batch_field_before_name {category: Batch fields; nullable: true} [Specifes a user-defined batch field for batch_field_before_date] 
//input: string batch_field_before_date {category: Batch fields; nullable: true} [ISO 8601 date. A molecule with any batch that has a batch_field_before_name value date on or before the parameter will be included] 
//input: string batch_field_after_name {category: Batch fields; nullable: true} [Specifes a user-defined batch field for batch_field_after_date] 
//input: string batch_field_after_date {category: Batch fields; nullable: true} [ISO 8601 date. A molecule with any batch that has a batch_field_after_name value date on or after the parameter will be included] 
//input: string projects {category: Projects; nullable: true} [Comma separated list of project ids]
//input: string data_sets {category: Datasets; nullable: true} [Comma separated list of dataset ids] 
//input: string structure {category: Structure; nullable: true; semType: Molecule} [SMILES; cxsmiles or mol string]
//input: string structure_search_type {category: Structure; nullable: true; choices: ["exact", "similarity", "substructure"]} [SMILES, cxsmiles or mol string]
//input: double structure_similarity_threshold {category: Structure; nullable: true} [A number between 0 and 1]
//input: string inchikey {category: Structure; nullable: true} [Use this parameter instead of the "structure" and "structure_search_type" parameters]
//input: list<string> molecule_fields {category: Filelds; nullable: true} [Use this parameter to limit the number of Molecule UDF Fields to return]
//input: list<string> batch_fields {category: Filelds; nullable: true} [Use this parameter to limit the number of Batch UDF Fields to return]
//input: list<string> fields_search {category: Molecules filelds search; nullable: true} [This parameter is used for searching across the custom user-defined Molecule fields created by your Vault Administrator]
//output: dataframe df
export async function cDDVaultSearch(vaultId: number, molecules: string, names: string, include_original_structures: boolean,
  only_ids: boolean, only_batch_ids: boolean, created_before: string, created_after: string, modified_before: string,
  modified_after: string, batch_created_before: string, batch_created_after: string, batch_field_before_name: string,
  batch_field_before_date: string, batch_field_after_name: string, batch_field_after_date: string, projects: string, data_sets: string,
  structure: string, structure_search_type: CDDVaultSearchType, structure_similarity_threshold: number, inchikey: string, 
  molecule_fields: string[], batch_fields: string[], fields_search: string[]
): Promise<DG.DataFrame> {
  if (!vaultId) {
    const vaults = await getVaults();
    vaultId = vaults.data![0].id;
  }
  const params: MoleculeQueryParams = {};
  if (molecules)
    params.molecules = molecules;
  if (names)
    params.names = names;
  params.include_original_structures = include_original_structures;
  params.only_ids = only_ids;
  params.only_batch_ids = only_batch_ids;
  if (created_before)
    params.created_before = created_before;
  if(created_after)
    params.created_after = created_after;
  if (modified_before)
    params.modified_before = modified_before;
  if(modified_after)
    params.modified_after = modified_after;
  if(batch_created_before)
    params.batch_created_before = batch_created_before;
  if (batch_created_after)
    params.batch_created_after = batch_created_after;
  if (batch_field_before_name)
    params.batch_field_before_name = batch_field_before_name;
  if (batch_field_before_date)
    params.batch_field_before_date = batch_field_before_date;
  if (batch_field_after_name)
    params.batch_field_after_name = batch_field_after_name;
  if (batch_field_after_date)
    params.batch_field_after_date = batch_field_after_date;
  if (projects)
    params.projects = projects;
  if (data_sets)
    params.data_sets = data_sets;
  if (structure)
    params.structure = structure;
  if (structure_search_type)
    params.structure_search_type = structure_search_type;
  if (structure_similarity_threshold)
    params.structure_similarity_threshold = structure_similarity_threshold;
  if (inchikey)
    params.inchikey = inchikey;
  if (molecule_fields)
    params.molecule_fields = molecule_fields;
  if (batch_fields)
    params.batch_fields = batch_fields;
  if (fields_search) {
    const fieldsValues: MoleculeFieldSearch[] = [];
    for (const val of fields_search) {
      const fieldParamJson = JSON.parse(val) as MoleculeFieldSearch;
      fieldsValues.push(fieldParamJson);
    }
    params.fields_search = fieldsValues;
  }


  const cddMols = await queryMolecules(vaultId, params);
  const df = DG.DataFrame.fromObjects(cddMols.data!.objects!)!;
  if (params.fields_search) {
    for (const moleculeUDF of params.fields_search) {
      const colType = moleculeUDF.text_value ? DG.TYPE.STRING : moleculeUDF.float_value ? DG.TYPE.FLOAT : moleculeUDF.date_value ? DG.TYPE.DATE_TIME : null;
      if (colType) {
        const col = DG.Column.fromType(colType,  moleculeUDF.name, df.rowCount).init((i) => cddMols.data!.objects![i].molecule_fields![moleculeUDF.name]);
        df.columns.add(col);
      }
    }
  }
  await grok.data.detectSemanticTypes(df);
  return df;
}