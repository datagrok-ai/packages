import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {after, awaitCheck, category, delay, expect, test} from '@datagrok-libraries/utils/src/test';
import { createTableView } from './utils';
import { RGroupDecompRes } from '../analysis/r-group-analysis';


category('projects', () => {
  test('r-group-analysis', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runRGroupAnalysis,
      ['smiles', 'Core', 'R1', 'R2', 'R3', 'isMatch'], DG.VIEWER.TRELLIS_PLOT);
  }, {timeout: 60000});

  test('r-group-analysis-sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runRGroupAnalysis,
      ['smiles', 'Core', 'R1', 'R2', 'R3', 'isMatch'], DG.VIEWER.TRELLIS_PLOT, true);
  }, {timeout: 60000});

  test('inchi', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runToInchi, ['smiles', 'inchi'], '');
  });

  test('inchi_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runToInchi, ['smiles', 'inchi'], '', true);
  });

  test('inchi_key', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runToInchiKeys, ['smiles', 'inchi_key'], '');
  });

  test('inchi_key_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runToInchiKeys, ['smiles', 'inchi_key'], '', true);
  });

  test('toxicity_risks', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runAddChemRisksColumns,
      ['smiles', 'Mutagenicity'], '');
  });

  test('toxicity_risks_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runAddChemRisksColumns,
      ['smiles', 'Mutagenicity'], '', true);
  });

  test('properties', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runAddChemPropertiesColumns,
      ['smiles', 'MW'], '');
  });

  test('properties_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runAddChemPropertiesColumns,
      ['smiles', 'MW'], '', true);
  });

  test('curate', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runCurate,
      ['smiles', 'curated_molecule'], '');
  }, {timeout: 50000});

  test('names_to_smiles', async () => {
    await runSaveAndOpenProjectTest('tests/names_to_smiles.csv', runNamesToSmiles,
      ['Name', 'canonical_smiles'], '');
  });

  test('names_to_smiles_sync', async () => {
    await runSaveAndOpenProjectTest('tests/names_to_smiles.csv', runNamesToSmiles,
      ['Name', 'canonical_smiles'], '', true);
  });

  test('convert_notation', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runConvertNotation,
      ['smiles', 'smiles_molblock'], '');
  });

  test('convert_notation_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runConvertNotation,
      ['smiles', 'smiles_molblock'], '', true);
  });

  test('elemental_analysis', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runElementalAnalysis,
      ['smiles', 'C', 'N', 'O', 'Cl', 'Molecule Charge'], DG.VIEWER.RADAR_VIEWER);
    expect(grok.shell.tv.grid.col('elements (smiles)') != null);
  }, {timeout: 50000});

  test('elemental_analysis_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runElementalAnalysis,
      ['smiles', 'C', 'N', 'O', 'Cl', 'Molecule Charge'], DG.VIEWER.RADAR_VIEWER, true);
    expect(grok.shell.tv.grid.col('elements (smiles)') != null);
  }, {timeout: 50000});

  test('structural_alerts', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runStructuralAlerts,
      ['smiles', 'PAINS (smiles)'], '');
  });

  test('structural_alerts_sync', async () => {
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runStructuralAlerts,
      ['smiles', 'PAINS (smiles)'], '', true);
  });

  test('chemical_space', async () => {
    //column '~smiles.Morgan' is not saved to project since it is an object type column
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runChemicalSpace,
      ['smiles', 'Embed_X_1', 'Embed_Y_1', 'Cluster (DBSCAN)'], DG.VIEWER.SCATTER_PLOT);
    //need delay to avoid unhandled exception when calling closeAll()
    await delay(100);
  });

  test('chemical_space_sync', async () => {
    //column '~smiles.Morgan' is not saved to project since it is an object type column
    await runSaveAndOpenProjectTest('tests/sar-small_test.csv', runChemicalSpace,
      ['smiles', 'Embed_X_1', 'Embed_Y_1', 'Cluster (DBSCAN)'], DG.VIEWER.SCATTER_PLOT, true);
    //need delay to avoid unhandled exception when calling closeAll()
    await delay(100);
  });


  test('activity_cliffs', async () => {
    //column '~smiles.Morgan' is not saved to project since it is an object type column
    await runSaveAndOpenProjectTest('activity_cliffs.csv', runActivityCliffs,
      ['chembl_tid', 'smiles', 'Activity', '~smiles.Morgan', 'Embed_X_1', 'Embed_Y_1', 'sali__1'],
      DG.VIEWER.SCATTER_PLOT, false, checkActivityCliffsCustomInit);
    //need delay to avoid unhandled exception when calling closeAll()
    await delay(100);
  });

  test('activity_cliffs_sync', async () => {
    //column '~smiles.Morgan' is not saved to project since it is an object type column
    await runSaveAndOpenProjectTest('activity_cliffs.csv', runActivityCliffs,
      ['chembl_tid', 'smiles', 'Activity', '~smiles.Morgan', 'Embed_X_1', 'Embed_Y_1', 'sali__1'],
      DG.VIEWER.SCATTER_PLOT, true, checkActivityCliffsCustomInit);
    //need delay to avoid unhandled exception when calling closeAll()
    await delay(100);
  }, {timeout: 60000});

  after(async () => {
    grok.shell.closeAll();
  });
});

//colList: list of columns which have been added to dataframe by analysis
//viewerType: viewer which has been created by analysis
async function runSaveAndOpenProjectTest(tableName: string, analysisFunc: (tv: DG.TableView) => Promise<void>,
colList: string[], viewerType: string, dataSync?: boolean,
additionalChecks?: (tv: DG.TableView) => Promise<void>) {
  let tv;
  if (dataSync) {
    await DG.Func.find({ name: 'OpenFile'})[0].prepare({
      fullPath: `System:AppData/Chem/${tableName}`
    }).call(undefined, undefined, { processed: false });
    tv = grok.shell.tv;
  } else
    tv = await createTableView(tableName);
  await delay(100);
  await analysisFunc(tv);
  await delay(10);
  await saveAndOpenProject(tv, dataSync);
  await delay(10);
  await dataFrameContainsColumns(colList);
  if (viewerType)
    await checkViewerAdded(viewerType);
  if (additionalChecks)
    await additionalChecks(tv);
}

async function runActivityCliffs(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'activityCliffs' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    activities: tv.dataFrame.col('Activity'),
    similarity: 80,
    methodName: 'UMAP',
    similarityMetric: 'Tanimoto',
    preprocessingFunction: undefined,
  }).call(undefined, undefined, { processed: false });
  //need for scatter plot to render
  await delay(10);
}

async function runChemicalSpace(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'chemSpaceTopMenu' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    methodName: 'UMAP',
    similarityMetric: 'Tanimoto',
    plotEmbeddings: true,
    options: undefined,
    preprocessingFunction: undefined,
    clusterEmbeddings: true
  }).call(undefined, undefined, { processed: false });
  //need for scatter plot to render
  await delay(10);
}

async function runStructuralAlerts(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'runStructuralAlerts' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    pains: true,
    bms: false,
    sureChembl: false,
    mlsmr: false,
    dandee: false,
    inpharmatica: false,
    lint: false,
    glaxo: false
  }).call(undefined, undefined, { processed: false });
}

async function runElementalAnalysis(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'elementalAnalysis' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    radarViewer: true,
    radarGrid: true
  }).call(undefined, undefined, { processed: false });
}

async function runConvertNotation(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'convertNotation' })[0].prepare({
    data: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    targetNotation: 'molblock',
    overwrite: false,
    join: true
  }).call(undefined, undefined, { processed: false });
}

async function runNamesToSmiles(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'namesToSmiles' })[0].prepare({
    data: tv.dataFrame,
    names: tv.dataFrame.col('Name'),
  }).call(undefined, undefined, { processed: false });
}

async function runCurate(tv: DG.TableView): Promise<void> {
  const df = await grok.functions.call(`Chem:Curate`, {
    data: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    kekulization: true,
    normalization: false,
    reionization: false,
    neutralization: false,
    tautomerization: false,
    mainFragment: false,
  });
  tv.dataFrame.columns.add(df.col('curated_molecule'));
}

async function runAddChemPropertiesColumns(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'addChemPropertiesColumns' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    MW: true,
    HBA: false,
    HBD: false,
    logP: false,
    logS: false,
    PSA: false,
    rotatableBonds: false,
    stereoCenters: false,
    moleculeCharge: false,
  }).call(undefined, undefined, { processed: false });
}

async function runToInchiKeys(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'addInchisKeysTopMenu' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
  }).call(undefined, undefined, { processed: false });
}

async function runToInchi(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'addInchisTopMenu' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
  }).call(undefined, undefined, { processed: false });
}

async function runAddChemRisksColumns(tv: DG.TableView): Promise<void> {
  await DG.Func.find({ package: 'Chem', name: 'addChemRisksColumns' })[0].prepare({
    table: tv.dataFrame,
    molecules: tv.dataFrame.col('smiles'),
    mutagenicity: true,
    tumorigenicity: false,
    irritatingEffects: false,
    reproductiveEffects: false,
  }).call(undefined, undefined, { processed: false });
}

async function runRGroupAnalysis(tv: DG.TableView): Promise<void> {
  const funcCall = await DG.Func.find({ package: 'Chem', name: 'rGroupDecomposition' })[0].prepare({
    df: tv.dataFrame,
    molColName: 'smiles',
    core: '[#8]=[#6]1-[#6]-[#7]=[#6](-[#6])-[#6]2:[#6](-[#7]-1):[#6]:[#6]:[#6]:[#6]:2',
    rGroupName: 'R',
    rGroupMatchingStrategy: 'Greedy',
    onlyMatchAtRGroups: false
  }).call(undefined, undefined, { processed: false });
  const res: RGroupDecompRes = funcCall.getOutputParamValue();
  tv.trellisPlot({
    xColumnNames: [res.xAxisColName],
    yColumnNames: [res.yAxisColName],
  });
}

async function saveAndOpenProject(tv: DG.TableView, dataSync?: boolean): Promise<void> {
  let project = DG.Project.create();
  let tableInfo = tv.dataFrame.getTableInfo();
  if (dataSync) {
    //@ts-ignore
    tableInfo.tags['.data-sync'] = 'sync';
    //@ts-ignore
    tableInfo.tags['.script'] = grok.shell.tv.dataFrame.getTag('.script');  
  }
  let layoutInfo = tv.getInfo();
  project.addChild(tableInfo);
  project.addChild(layoutInfo);
  await grok.dapi.tables.uploadDataFrame(tv.dataFrame);
  await grok.dapi.tables.save(tableInfo);
  await grok.dapi.views.save(layoutInfo);
  await grok.dapi.projects.save(project);
  const projId = project.id;
  grok.shell.closeAll();
  const p = await grok.dapi.projects.find(projId);
  await p.open();
}

async function dataFrameContainsColumns(colArr: string[]): Promise<void> {
  let col = '';
  const getError = () => `${col} hasn't been added to dataframe`; 
  await awaitCheck(() => {
    if (!grok.shell.tv.dataFrame)
      return false;
    for (const colName of colArr) {
      if (!grok.shell.tv.dataFrame.col(colName)) {
        col = colName;
        return false;
      }
    }
    return true;
  }, getError(), 5000);
}

async function checkViewerAdded(viewerType: string): Promise<void> {
  await awaitCheck(() => {
    for (let v of grok.shell.tv.viewers) {
      if (v.type === viewerType)
        return true;
    }
    return false;
  }, `${viewerType} hasn\'t been added`, 5000);
}

export async function checkActivityCliffsCustomInit(): Promise<void> {
  await awaitCheck(() => {
    const links = document.getElementsByClassName('scatter_plot_link');
    return links.length === 2 && (links[0] as HTMLElement).innerText.toLowerCase() === `15 cliffs`
  }, 'Initialization function hasn\'t been applied on scatter plot', 5000);
}

