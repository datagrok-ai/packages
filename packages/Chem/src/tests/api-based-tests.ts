import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {_testFindSimilar, _testGetSimilarities} from './menu-tests-similarity-diversity';
import {testCsv, testSubstructure} from './substructure-search-tests';
import { ensureContainersRunning, readDataframe } from './utils';

category('server features', () => {

  before(async () => {
    await ensureContainersRunning();
  });
  
  test('descriptors', async () => {
    const tree = await grok.chem.descriptorsTree();
    expect(tree !== undefined, true);
    const df = DG.Test.isInBenchmark ? await readDataframe('tests/smi10K.csv') :
      DG.DataFrame.fromCsv(testCsv);
    const t: DG.DataFrame = await grok.chem.descriptors(df, 'smiles',
      ['MolWt', 'NumAromaticCarbocycles', 'NumHAcceptors', 'NumHeteroatoms', 'NumRotatableBonds', 'RingCount']);

    expect(t.columns.contains('MolWt'), true);
    expect(t.columns.contains('NumAromaticCarbocycles'), true);
    expect(t.columns.contains('NumHAcceptors'), true);
    expect(t.columns.contains('NumHeteroatoms'), true);
    expect(t.columns.contains('NumRotatableBonds'), true);
    expect(t.columns.contains('RingCount'), true);
  }, {benchmark: true, stressTest: true});

  test('sketcher', async () => {
    const result: HTMLElement = grok.chem.sketcher(()=>{}, 'CCCCN1C(=O)CN=C(c2ccccc12)C3CCCCC3');
    expect(result !== null, true);
  });
});


category('chem exported', () => {
  test('findSimilar.api.sar-small', async () => {
    await _testFindSimilar(grok.chem.findSimilar);
  });

  test('getSimilarities.api.molecules', async () => {
    await _testGetSimilarities(grok.chem.getSimilarities, grok.data.demo.molecules(100));
  });

  test('substructureSearch_awaitAll', async () => {
    const df = DG.DataFrame.fromCsv(testCsv);
    const trueIndices = [0, 2];
    const bitset: DG.BitSet = await grok.chem.searchSubstructure(df.col('smiles')!, testSubstructure);
    const bitsetString = bitset.toBinaryString();
    const bitsetArray = [...bitsetString];
    for (let k = 0; k < trueIndices.length; k++) {
      expect(bitsetArray[trueIndices[k]] === '1', true);
      bitsetArray[trueIndices[k]] = '0';
    }
  });

  test('mcs', async () => {
    // const df = DG.DataFrame.fromCsv(testCsv);
    // const mcs = await grok.chem.mcs(df, 'smiles');
    // expect(mcs, 'C:CCC1:C:C:C:C:C:1');
  });
});
