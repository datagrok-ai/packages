import {category, test, expect, before, testEvent, delay, expectArray, awaitCheck} from '@datagrok-libraries/utils/src/test';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {SubstructureFilter} from '../widgets/chem-substructure-filter';
import {readDataframe} from './utils';
import {_package} from '../package-test';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import { chemSimilaritySearch } from '../analysis/chem-similarity-viewer';
import { BitArrayMetrics } from '@datagrok-libraries/ml/src/typed-metrics';
import { Fingerprint } from '../utils/chem-common';
import { SubstructureSearchType } from '../constants';
import { sketchersWarmUp } from './sketcher-tests';

const expectedResults: {[key: string]: any} = {
  'oneColumn': [737141248, 593097, 3256025153, 4],
  'malformed': [3029331455, 16127],
  'empty': [524214],
};

const molblock1 = `
Actelion Java MolfileCreator 1.0

  7  7  0  0  0  0  0  0  0  0999 V2000
   12.9197  -11.7188   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   12.9197  -13.2187   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.2188  -13.9688   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   15.5178  -13.2187   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   15.5178  -11.7188   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.2188  -10.9688   -0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.2188   -9.4687   -0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  2  3  1  0  0  0  0
  3  4  2  0  0  0  0
  4  5  1  0  0  0  0
  5  6  2  0  0  0  0
  6  1  1  0  0  0  0
  6  7  1  0  0  0  0
M  END
`;

const molblock2 = `
Actelion Java MolfileCreator 1.0

 23 25  0  0  0  0  0  0  0  0999 V2000
    8.2116  -11.0868    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    9.0566  -12.3261    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   10.5524  -12.2140    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   11.3974  -13.4534    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   12.8932  -13.3413    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   13.6432  -14.6403    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   12.7982  -15.8797    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   15.1264  -14.8639    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   16.2259  -13.8436    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   16.1138  -12.3478    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.8745  -11.5028    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   15.2083  -10.0404    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.1088   -9.0202    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   14.4425   -7.5578    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
   12.6754   -9.4623    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   12.3416  -10.9247    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   13.4412  -11.9450    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   17.4129  -11.5978    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   18.7119  -12.3478    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   20.0109  -11.5978    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   20.0109  -10.0978    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   18.7119   -9.3478    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   17.4129  -10.0978    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
  6  7  2  0  0  0  0
  6  8  1  0  0  0  0
  8  9  1  0  0  0  0
  9 10  2  0  0  0  0
 10 11  1  0  0  0  0
 11 12  2  0  0  0  0
 12 13  1  0  0  0  0
 13 14  1  0  0  0  0
 13 15  2  0  0  0  0
 15 16  1  0  0  0  0
 16 17  2  0  0  0  0
 10 18  1  0  0  0  0
 18 19  1  0  0  0  0
 19 20  1  0  0  0  0
 20 21  1  0  0  0  0
 21 22  1  0  0  0  0
 22 23  1  0  0  0  0
 17  5  1  0  0  0  0
 17 11  1  0  0  0  0
 23 18  1  0  0  0  0
M  END
`;

const molFileForCloneTest2 = `
MJ201900                      

  6  6  0  0  0  0  0  0  0  0999 V2000
   -0.1786    0.8920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    0.4795    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930   -0.3455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.1786   -0.7580    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358   -0.3455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    0.4795    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  2  3  1  0  0  0  0
  3  4  2  0  0  0  0
  4  5  1  0  0  0  0
  5  6  2  0  0  0  0
  6  1  1  0  0  0  0
M  END
`;

const molFileForCloneTest1 = `
MJ201900                      

  6  6  0  0  0  0  0  0  0  0999 V2000
   -0.6919    0.4455    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.4064    0.0330    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.4064   -0.7920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6919   -1.2044    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0225   -0.7920    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0225    0.0330    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  6  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
M  END
`;

category('substructure filters', async () => {
  before(async () => {
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
    const funcs = DG.Func.find({tags: ['moleculeSketcher']});
    await sketchersWarmUp(funcs);
  });

  test('filterBy2Columns', async () => {
    const df = await readDataframe('tests/smiles_2_columns.csv');
    await grok.data.detectSemanticTypes(df);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter1 = await createFilter('smiles1', df, sketcherDialogs);
    const filter2 = await createFilter('smiles2', df, sketcherDialogs);
    const molfile1 = `
      MJ201900                      

  5  5  0  0  0  0  0  0  0  0999 V2000
   -0.1785   -0.1946    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    0.2178    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    1.0428    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    1.0428    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    0.2178    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  5  1  0  0  0  0
  2  3  2  0  0  0  0
  3  4  1  0  0  0  0
  4  5  2  0  0  0  0
M  END`;
    const molfile2 = `
      MJ201900                      

  5  5  0  0  0  0  0  0  0  0999 V2000
   -0.1785   -0.1946    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    0.2178    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8930    1.0428    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    1.0428    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5358    0.2178    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  2  3  2  0  0  0  0
  3  4  1  0  0  0  0
  4  5  2  0  0  0  0
  1  2  1  0  0  0  0
  1  5  1  0  0  0  0
M  END
`;

    filter1.sketcher.setMolFile(molfile1);
    filter2.sketcher.setMolFile(molfile2);
    await awaitCheck(() => df.filter.trueCount === 2 && df.filter.get(4) && df.filter.get(5) && !df.filter.get(0),
      'df hasn\'t been filtered', 7000);
    await delay(1000); //to close progress bar
    sketcherDialogs.forEach((it) => it.close());
    filter1.detach();
    filter2.detach();
  });

  test('filterByOneColumn', async () => {
    await testOneColumn('tests/spgi-100.csv', 'Structure', 'c1ccccc1',
      'terminate_substructure_search-tests/spgi-100-Structure', 'oneColumn', 32);
  });

  test('malformed_filterByOneColumn', async () => {
    await testOneColumn('tests/Test_smiles_malformed.csv', 'canonical_smiles', 'c1ccccc1',
      'terminate_substructure_search-tests/Test_smiles_malformed-canonical_smiles', 'malformed', 36);
  });

  test('empty_filterByOneColumn', async () => {
    await testOneColumn('tests/sar-small_empty_vals.csv', 'smiles', 'C1CCCCC1',
      'terminate_substructure_search-tests/sar-small_empty_vals-smiles', 'empty', 16);
  });

  test('terminateOneSearchByAnother', async () => {
    const df = await readDataframe('tests/smi10K.csv');
    await grok.data.detectSemanticTypes(df);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter = await createFilter('smiles', df, sketcherDialogs);
    const substr1 = 'C1CCCCC1';
    const substr2 = 'CC1CCCCC1';

    //starting filtering by 1st structure
    filter.sketcher.setSmiles(substr1);
    await delay(500);
    //terminating filtering by 1st structure
    await awaitCheck(() => df.filter.trueCount !== df.rowCount, 'filtering by 1st structure hasn\'t been started', 60000);
    filter.sketcher.setSmiles(substr2);
    //finishing filtering by 2nd structure
    await awaitCheck(() => df.filter.trueCount === 286, 'filtering by 1st structure hasn\'t been started', 60000);

    await delay(500); //for closing the progress bar
    sketcherDialogs.forEach((it) => it.close());
    filter.detach();
    await delay(500); //for progressBar to be closed and finish detach
  }, {timeout: 60000});

  test('filteringMultipleDfs', async () => {
    const df1 = await readDataframe('tests/smi10K.csv');
    const df2 = await readDataframe('tests/smi10K.csv');
    df2.name = 'tests/smi10K (2)';
    await grok.data.detectSemanticTypes(df1);
    await grok.data.detectSemanticTypes(df2);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter1 = await createFilter('smiles', df1, sketcherDialogs);
    const filter2 = await createFilter('smiles', df2, sketcherDialogs);

    const substr1 = 'C1CCCCC1';
    const substr2 = 'CC1CCCCC1';

    //starting filtering by 1st structure
    filter1.sketcher.setSmiles(substr1);
    await delay(500);
    //opening 2nd filter, sketching a molecule and waiting for filters to complete search
    filter2.sketcher.setSmiles(substr2);
    await awaitCheck(() => df1.filter.trueCount === 462, 'df1 hasn\'t been filtered', 20000);
    await awaitCheck(() => df2.filter.trueCount === 286, 'df2 hasn\'t been filtered', 20000);
    await delay(500); //for closing the progress bar
    sketcherDialogs.forEach((it) => it.close());
    filter1.detach();
    filter2.detach();
    await delay(500); //for progressBar to be closed and finish detach
  }, {timeout: 60000});

  test('multipleDfsWithTerminatedSearch', async () => {
    DG.chem.currentSketcherType = 'OpenChemLib';
    const df1 = await readDataframe('tests/smi10K.csv');
    const df2 = await readDataframe('tests/smi10K.csv');
    df2.name = 'tests/smi10K (2)';
    await grok.data.detectSemanticTypes(df1);
    await grok.data.detectSemanticTypes(df2);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter1 = await createFilter('smiles', df1, sketcherDialogs);
    const filter2 = await createFilter('smiles', df2, sketcherDialogs);
    const substr1 = 'C1CCCCC1';
    const substr2 = 'c1ccccc1';
    const substr3 = 'CC1CCCCC1';

    //starting filtering by 1st structure
    filter1.sketcher.setSmiles(substr1);
    await awaitCheck(() => df1.filter.trueCount !== 10001 , 'filtering of df1 didn\'t start', 30000);
    //setting 1st structure to the 2nd filter
    filter2.sketcher.setSmiles(substr2);
    //setting 2nd structure to the 2nd filter
    filter2.sketcher.setSmiles(substr3);
    //waiting for 2nd filter to complete
    await awaitCheck(() => df1.filter.trueCount === 462 , 'df1 hasn\'t been filtered correctly', 30000);
    await awaitCheck(() => df2.filter.trueCount === 286 , 'df2 hasn\'t been filtered correctly', 30000);

    sketcherDialogs.forEach((it) => it.close());
    filter1.detach();
    filter2.detach();
    await delay(500); //for progressBar to be closed and finish detach
  }, {timeout: 60000});

  test('similaritySearchAfterTerminatedSearch', async () => { //#2533 (https://github.com/datagrok-ai/public/issues/2533)
    const df = await readDataframe('tests/smi10K.csv');
    await grok.data.detectSemanticTypes(df);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter = await createFilter('smiles', df, sketcherDialogs);
    const substr1 = 'C1CCCCC1';
    const substr2 = DG.WHITE_MOLBLOCK;

    //start filtering by 1st structure
    filter.sketcher.setSmiles(substr1);
    //waiting for first filtering results
    await awaitCheck(() => df.filter.trueCount !== df.rowCount, 'filtering hasn\'t been started', 10000);
    //terminate filtering
    filter.sketcher.setMolFile(substr2);
    //finish filtering
    await awaitCheck(() => df.filter.trueCount === df.rowCount, 'filter hasn\'t been reset', 10000);
    const simResults = await chemSimilaritySearch(df, df.col('smiles')!, df.get('smiles', 0),
      'Tanimoto' as BitArrayMetrics, 12, 0.01, 'Morgan' as Fingerprint, DG.BitSet.create(df.rowCount).setAll(true));
    expect(simResults?.get('indexes', 0), 0);
    expect(simResults?.get('indexes', 5), 4002);
    expect(simResults?.get('indexes', 11), 731);
    sketcherDialogs.forEach((it) => it.close());
    filter.detach();
    await delay(500); //for progressBar to be closed and finish detach
  });

  test('filterOptionsSynchronization', async () => { //#2512 (https://github.com/datagrok-ai/public/issues/2512)
    const df = await readDataframe('tests/spgi-100.csv');
    await grok.data.detectSemanticTypes(df);
    const sketcherDialogs: DG.Dialog[] = [];

    const filter1 = await createFilter('Structure', df, sketcherDialogs);
    const filter2 = await createFilter('Structure', df, sketcherDialogs);
    const substr = 'C1CCCCC1';
    const terminateFlag = 'terminate_substructure_search-tests/spgi-100-Structure';

    //filter by structure and wait for results
    filter1.sketcher.setSmiles(substr);
    await testEvent(grok.events.onCustomEvent(terminateFlag), (_) => {
      expect(df.filter.trueCount, 5);
    }, () => {}, 3000);
    await delay(500);
    //check that filter structure is synchronized in second filter
    expect(filter2.sketcher.getSmiles(), 'C1CCCCC1', 'structure is not synchronized between filters');
    //change filtering options in second filter and wait for results
    filter2.searchTypeInput.value = SubstructureSearchType.NOT_CONTAINS;
    await delay(500);
    expect(df.filter.trueCount, 95);
    //check that filter options are synchronized
    expect(filter1.searchType, SubstructureSearchType.NOT_CONTAINS, 'filter options not synchronized between filters');
    sketcherDialogs.forEach((it) => it.close());
    filter1.detach();
    filter2.detach();
    await delay(500); //for progressBar to be closed and finish detach
  });

  test('properSearchFinish', async () => { //#2400 (https://github.com/datagrok-ai/public/issues/2400)
    const df = await readDataframe('tests/spgi-100.csv');
    await grok.data.detectSemanticTypes(df);
    const sketcherDialogs: DG.Dialog[] = [];

    DG.chem.currentSketcherType = 'Ketcher';
    const filter1 = await createFilter('Structure', df, sketcherDialogs, 30000);

    //filter by structure and wait for results
    filter1.sketcher.setSmiles('C1CCCCC1');
    await awaitCheck(() => df.filter.trueCount === 5, 'df hasn\'t been filtered', 3000);

    //check that search is finished and loader is disabled
    expect(filter1.calculating, false, 'search hasn\'t been finished properly, loader is active');
    sketcherDialogs.forEach((it) => it.close());
    filter1.detach();
    await delay(500); //for progressBar to be closed and finish detach
    DG.chem.currentSketcherType = 'OpenChemLib';
  });

  test('detachingFilters', async () => { //check that in case multiple filters are applied to the same column (like when cloning the view), we can detach one, but the df will stay filtered
    const df = await readDataframe('tests/spgi-100.csv');
    await grok.data.detectSemanticTypes(df);
    grok.shell.addTableView(df);
    const sketcherDialogs: DG.Dialog[] = [];

    DG.chem.currentSketcherType = 'OpenChemLib';
    const filter1 = await createFilter('Structure', df, sketcherDialogs, 10000);
    const filter2 = await createFilter('Structure', df, sketcherDialogs, 10000);

    //filter by structure and wait for results
    filter1.sketcher.setSmiles('C1CCCCC1');
    await awaitCheck(() => df.filter.trueCount === 5, 'df hasn\'t been filtered 1', 5000);
    await awaitCheck(() => filter2.bitset?.trueCount === 5, 'filters haven\'t been synchronized 1', 5000);
    await delay(500); //for closing the progress bar
    //filter1 is active filter, detaching filter2 and check that df is still filtered
    filter2.detach();
    await delay(500); //waiting for detach to complete
    expect(df.filter.trueCount, 5, 'filter has been reset 1');

    const filter3 = await createFilter('Structure', df, sketcherDialogs, 10000);
    //filter by structure and wait for results
    filter1.sketcher.setSmiles('c1ccccc1');
    await awaitCheck(() => df.filter.trueCount === 32, 'df hasn\'t been filtered 2', 5000);
    await awaitCheck(() => filter3.bitset?.trueCount === 32, 'filters haven\'t been synchronized 2', 5000);
    await delay(500); //for closing the progress bar
    //filter1 is active filter, detaching active filter and check that df is still filtered
    filter1.detach();
    await delay(1000); //waiting for detach to complete
    expect(df.filter.trueCount, 32, 'filter has been reset 2');

    const filter4 = await createFilter('Structure', df, sketcherDialogs, 10000);

    //detaching active filter3 while bitset hasn't yet been synchronized with filter4
    filter3.detach();
    await delay(1000); //waiting for detach to complete
    expect(df.filter.trueCount, 32, 'filter has been reset 3');

    filter4.detach();
    await delay(1000); //waiting for detach to complete
    sketcherDialogs.forEach((it) => it.close());
  });

  test('runMultipleUseASFilter', async () => { //#2628 (https://github.com/datagrok-ai/public/issues/2628)
    const df = await readDataframe('tests/sar-small_test.csv');
    await grok.data.detectSemanticTypes(df);
    const tv = grok.shell.addTableView(df);

    //filtering by 1st structure and wait for results
    tv.getFiltersGroup({ createDefaultFilters: false }).updateOrAdd({
      type: DG.FILTER_TYPE.SUBSTRUCTURE,
      column: 'smiles',
      columnName: 'smiles',
      molBlock: molblock1,
    }, false);
    await awaitCheck(() => df.filter.trueCount === 4, 'df hasn\'t been filtered by 1st structure', 3000);

    //filtering by 2nd structure and wait for results
    tv.getFiltersGroup({ createDefaultFilters: false }).updateOrAdd({
      type: DG.FILTER_TYPE.SUBSTRUCTURE,
      column: 'smiles',
      columnName: 'smiles',
      molBlock: molblock2,
    }, false);
    await awaitCheck(() => df.filter.trueCount === 3, 'df hasn\'t been filtered by 2nd structure', 15000);

    DG.chem.currentSketcherType = 'OpenChemLib';
  });

});


async function createFilter(colName: string, df: DG.DataFrame, sketcherDialogs: DG.Dialog[], waitForSketcherMs?: number):
  Promise<SubstructureFilter> {
  const filter = new SubstructureFilter();
  filter.attach(df);
  filter.applyState({columnName: colName});
  sketcherDialogs.push(ui.dialog().add(filter.root).show());
  await ui.tools.waitForElementInDom(filter.sketcher.root);
  filter.column = df.col(colName);
  filter.columnName = colName;
  filter.tableName = df.name;
  await awaitCheck(() => filter.sketcher.sketcher?.isInitialized === true, 'sketcher hasn\'t been initialized', waitForSketcherMs ?? 5000);
  return filter;
}

async function testOneColumn(dfName: string, colName: string, substructure: string, terminateFlag: string,
  expectedKey: string, expectedTrueCount: number) {
  const df = await readDataframe(dfName);
  await grok.data.detectSemanticTypes(df);
  const sketcherDialogs: DG.Dialog[] = [];

  const filter = await createFilter(colName, df, sketcherDialogs);

  filter.sketcher.setSmiles(substructure);
  await awaitCheck(() => df.filter.trueCount === expectedTrueCount, 'df hasn\'t been filtered', 10000);
  expectArray(df.filter.getBuffer(), expectedResults[expectedKey]);
  sketcherDialogs.forEach((it) => it.close());
  filter.detach();
  await delay(1000); //for progressBar to be closed and finish detach
}

