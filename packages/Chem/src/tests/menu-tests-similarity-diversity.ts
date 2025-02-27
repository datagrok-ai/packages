import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {category, expect, expectFloat, expectArray, test, delay,
  before, after, awaitCheck, testEvent} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import {Fingerprint} from '../utils/chem-common';
import {createTableView, readDataframe, molV2000, molV3000} from './utils';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import {findSimilar, getSimilarities} from '../package';
import {chemDiversitySearch, ChemDiversityViewer} from '../analysis/chem-diversity-viewer';
import {chemSimilaritySearch, ChemSimilarityViewer} from '../analysis/chem-similarity-viewer';
import {tanimotoSimilarity} from '@datagrok-libraries/ml/src/distance-metrics-methods';
import {BitArrayMetrics, BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';


category('top menu similarity/diversity', () => {
  let spgi100: DG.DataFrame;
  let approvedDrugs100: DG.DataFrame;
  let molecules: DG.DataFrame;
  let empty: DG.DataFrame;
  let malformed: DG.DataFrame;

  before(async () => {
    grok.shell.closeAll();
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
    spgi100 = await readDataframe('tests/spgi-100.csv');
    approvedDrugs100 = await readDataframe('tests/approved-drugs-100.csv');
    molecules = grok.data.demo.molecules(100);
    empty = await readDataframe('tests/sar-small_empty_vals.csv');
    await grok.data.detectSemanticTypes(empty);
    malformed = await readDataframe('tests/Test_smiles_malformed.csv');
    await grok.data.detectSemanticTypes(malformed);
  });

  test('findSimilar.chem.smiles', async () => {
    await _testFindSimilar(findSimilar);
  }, {benchmark: true});

  test('findSimilar.chem.molV2000', async () => {
    await _testFindSimilar(findSimilar, molV2000, 'V2000');
  });

  test('findSimilar.chem.molV3000', async () => {
    await _testFindSimilar(findSimilar, molV3000, 'V3000');
  });

  test('getSimilarities.chem.molecules', async () => {
    await _testGetSimilarities(getSimilarities, molecules);
  });

  test('similarity.emptyValues', async () => {
    empty.currentRowIdx = 1;
    const tv = grok.shell.addTableView(empty);
    const viewer: ChemSimilarityViewer = (await tv.dataFrame.plot
      .fromType('Chem Similarity Search')) as ChemSimilarityViewer;
    await testEvent(viewer.renderCompleted, () => {}, () => {}, 5000);
    await awaitCheck(() => viewer.scores != undefined, 'scores haven\'t been returned', 2000);
    try {
      expectArray(viewer.scores!.toList(), [1, 0.6808510422706604, 0.6739130616188049, 0.6521739363670349,
        0.6458333134651184, 0.4821428656578064, 0.4736842215061188, 0.4736842215061188, 0.4655172526836395,
        0.4576271176338196, 0.4545454680919647, 0.44999998807907104]);
    } finally {tv.close();}
  });

  test('similarity.emptyInput', async () => {
    empty.currentRowIdx = 0;
    const tv = grok.shell.addTableView(empty);
    DG.Balloon.closeAll();
    const viewer = await tv.dataFrame.plot.fromType('Chem Similarity Search');
    try {
      await awaitCheck(() => viewer.root.classList.contains('chem-malformed-molecule-error'),
        'error message has not been shown', 2000);
    } finally {
      tv.close();
      DG.Balloon.closeAll();
    }
  });

  test('similarity.malformedData', async () => {
    empty.currentRowIdx = 0;
    const tv = grok.shell.addTableView(malformed);
    DG.Balloon.closeAll();
    const viewer: ChemSimilarityViewer = (await tv.dataFrame.plot
      .fromType('Chem Similarity Search')) as ChemSimilarityViewer;
    await testEvent(viewer.renderCompleted, () => {}, () => {}, 5000);
    try {
      await awaitCheck(() => document.querySelector('.d4-balloon-content')?.children[0].children[0].innerHTML ===
        '2 molecules with indexes 31,41 are possibly malformed and are not included in analysis',
      'cannot find warning balloon', 2000);
      expectArray(viewer.scores!.toList(), [1, 0.4333333373069763, 0.32894736528396606,
        0.2957746386528015, 0.234375, 0.23076923191547394, 0.2222222238779068, 0.2222222238779068,
        0.20253165066242218, 0.2023809552192688, 0.18309858441352844, 0.1818181872367859]);
    } finally {
      tv.close();
      DG.Balloon.closeAll();
    }
  });

  test('similarity.malformedInput', async () => {
    const tv = grok.shell.addTableView(malformed);
    DG.Balloon.closeAll();
    const viewer = await tv.dataFrame.plot.fromType('Chem Similarity Search');
    malformed.currentRowIdx = 30;
    try {
      await awaitCheck(() => viewer.root.classList.contains('chem-malformed-molecule-error'),
        'error message has not been shown', 2000);
    } finally {
      tv.close();
      DG.Balloon.closeAll();
    }
  });

  test('similaritySearchViewerOpen', async () => {
    await _testSimilaritySearchViewerOpen();
  });

  test('similaritySearchFunctionality', async () => {
    await _testSimilaritySearchFunctionality(BitArrayMetricsNames.Tanimoto, Fingerprint.Morgan);
    await _testSimilaritySearchFunctionality(BitArrayMetricsNames.Dice, Fingerprint.Morgan);
    await _testSimilaritySearchFunctionality(BitArrayMetricsNames.Cosine, Fingerprint.Morgan);
  });

  test('testSimilaritySearch.smiles', async () => {
    const df = DG.Test.isInBenchmark ? await readDataframe('tests/smi10K.csv') : molecules;
    await chemSimilaritySearch(df, df.getCol('smiles'), df.get('smiles', 0),
      BitArrayMetricsNames.Tanimoto, 10, 0.01, Fingerprint.Morgan, DG.BitSet.create(df.rowCount).setAll(true));
  }, {benchmark: true});

  test('testDiversitySearch.smiles', async () => {
    const df = DG.Test.isInBenchmark ? await readDataframe('tests/smi10K.csv') : molecules;
    //@ts-ignore
    await chemDiversitySearch(df.getCol('smiles'), tanimotoSimilarity, 10, 'Morgan' as Fingerprint,
      DG.BitSet.create(df.rowCount).setAll(true));
  }, {benchmark: true});

  test('testDiversitySearch.molV2000', async () => {
    //@ts-ignore
    await chemDiversitySearch(spgi100.getCol('Structure'), tanimotoSimilarity, 10, Fingerprint.Morgan as Fingerprint,
      DG.BitSet.create(spgi100.rowCount).setAll(true));
  });

  test('testDiversitySearch.molV3000', async () => {
    //@ts-ignore
    await chemDiversitySearch(approvedDrugs100.getCol('molecule'), tanimotoSimilarity, 10,
      Fingerprint.Morgan as Fingerprint, DG.BitSet.create(approvedDrugs100.rowCount).setAll(true));
  });

  test('diversity.emptyValues', async () => {
    const tv = grok.shell.addTableView(empty);
    const viewer: ChemDiversityViewer = (await tv.dataFrame.plot
      .fromType('Chem Diversity Search')) as ChemDiversityViewer;
    await testEvent(viewer.renderCompleted, () => {}, () => {}, 5000);
    try {
      expect(viewer.renderMolIds.length, 12);
    } finally {tv.close();}
  });

  test('diversity.malformedData', async () => {
    const tv = grok.shell.addTableView(malformed);
    DG.Balloon.closeAll();
    const viewer: ChemDiversityViewer = (await tv.dataFrame.plot
      .fromType('Chem Diversity Search')) as ChemDiversityViewer;
    await testEvent(viewer.renderCompleted, () => {}, () => {}, 5000);
    try {
      expect(viewer.renderMolIds.length, 12);
      await awaitCheck(() => document.querySelector('.d4-balloon-content')?.children[0].children[0].innerHTML ===
        '2 molecules with indexes 31,41 are possibly malformed and are not included in analysis',
      'cannot find warning balloon', 1000);
    } finally {
      tv.close();
      DG.Balloon.closeAll();
    }
  });

  test('diversitySearchViewerOpen', async () => {
    await _testDiversitySearchViewerOpen();
  });

  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
  });
});

export async function _testFindSimilar(findSimilarFunction: (...args: any) => Promise<DG.DataFrame | null>,
  molecule: string = 'O=C1CN=C(C2CCCCC2)C2:C:C:C:C:C:2N1', notation?: string) {
  let dfInput: DG.DataFrame;
  if (notation)
    dfInput = await readDataframe(notation === 'V2000' ? 'tests/spgi-100.csv' : 'tests/approved-drugs-100.csv');
  else if (DG.Test.isInBenchmark) dfInput = await readDataframe('tests/smi10K.csv');
  else dfInput = await readDataframe('sar-small.csv');
  await grok.data.detectSemanticTypes(dfInput);
  const colInput = dfInput.columns.bySemType(DG.SEMTYPE.MOLECULE)!;
  const numRowsOriginal = dfInput.rowCount;
  const dfResult: DG.DataFrame = // shouldn't be null
    (await findSimilarFunction(colInput, molecule))!;
  const numRows = dfResult.rowCount;
  const columnNames = [
    dfResult.columns.byIndex(0).name,
    dfResult.columns.byIndex(1).name,
    dfResult.columns.byIndex(2).name,
  ];
  const arr: any[] = [];
  for (let i = 0; i < 5; ++i) {
    const molecule: string = dfResult.columns.byIndex(0).get(i);
    const score: number = dfResult.columns.byIndex(1).get(i);
    const index: number = dfResult.columns.byIndex(2).get(i);
    arr[i] = {molecule, score, index};
  }
  expectArray([numRows, columnNames[0], columnNames[1], columnNames[2]],
    [numRowsOriginal, 'molecule', 'score', 'index']);
  if (DG.Test.isInBenchmark) {
    expectArray(arr.slice(0, 5).map((v) => v.molecule),
      ['O=C1C2CCCCC2Nc3ccccc13', 'O=C1NC2(CCCCC2)Cc3ccccc13', 'O=C(CN1C(=O)c2ccccc2C1=O)NC3CCCCC3',
        'Cc1cc2C(=NCC(=O)Nc2s1)c3cccs3', 'Nc1nnc(S)n1N=C2C(=O)Nc3ccccc23']);
    expectArray(arr.slice(0, 5).map((v) => v.score),
      [0.3777777850627899, 0.2857142984867096, 0.2830188572406769, 0.27586206793785095, 0.27272728085517883]);
    expectArray(arr.slice(0, 5).map((v) => v.index),
      [9520, 122, 1223, 8597, 6648]);
    return;
  }
  switch (notation) {
  case 'V2000':
    expectArray(arr.slice(0, 5).map((v) => v.molecule),
      [colInput.get(82), colInput.get(58), colInput.get(51), colInput.get(59), colInput.get(93)]);
    expectArray(arr.slice(0, 5).map((v) => v.score),
      [0.16867469251155853, 0.14814814925193787, 0.14444445073604584, 0.14102564752101898, 0.13953489065170288]);
    expectArray(arr.slice(0, 5).map((v) => v.index),
      [82, 58, 51, 59, 93]);
    break;
  case 'V3000':
    expectArray(arr.slice(0, 5).map((v) => v.molecule),
      [colInput.get(0), colInput.get(71), colInput.get(43), colInput.get(87), colInput.get(89)]);
    expectArray(arr.slice(0, 5).map((v) => v.score),
      [1, 0.13725490868091583, 0.12903225421905518, 0.12820513546466827, 0.12820513546466827]);
    expectArray(arr.slice(0, 5).map((v) => v.index),
      [0, 71, 43, 87, 89]);
    break;
  default:
    expectArray(arr.slice(0, 5).map((v) => v.molecule),
      ['O=C1CN=C(c2ccccc2N1)C3CCCCC3', 'O=C1CN=C(c2cc(I)ccc2N1)C3CCCCC3', 'O=C1CN=C(c2cc(Cl)ccc2N1)C3CCCCC3',
        'O=C1CN=C(c2cc(F)ccc2N1)C3CCCCC3', 'O=C1CN=C(c2cc(Br)ccc2N1)C3CCCCC3']);
    expectArray(arr.slice(0, 5).map((v) => v.score),
      [1, 0.6904761791229248, 0.6744186282157898, 0.6744186282157898, 0.6744186282157898]);
    expectArray(arr.slice(0, 5).map((v) => v.index),
      [0, 30, 5, 20, 25]);
    break;
  }
}

export async function _testGetSimilarities(getSimilaritiesFunction: (...args: any) => Promise<any>, df: DG.DataFrame) {
  let scores = (await getSimilaritiesFunction(df.columns.byName('smiles'),
    'O=C1CN=C(C2CCCCC2)C2:C:C:C:C:C:2N1'))! as any;
  if (scores instanceof DG.DataFrame)
    scores = scores.columns.byIndex(0);

  expectFloat(scores.get(0), 0.1034);
  expectFloat(scores.get(1), 0.07407);
  expectFloat(scores.get(2), 0.11111);
  expectFloat(scores.get(3), 0.11111);
  expectFloat(scores.get(4), 0.07042);
  expectFloat(scores.get(5), 0.06349);
}

async function _testSimilaritySearchViewerOpen() {
  const molecules = await createTableView('tests/sar-small_test.csv');
  const similaritySearchviewer: ChemSimilarityViewer = (await molecules.dataFrame.plot
    .fromType('Chem Similarity Search')) as ChemSimilarityViewer;
  await testEvent(similaritySearchviewer.renderCompleted, () => {}, () => {}, 5000);
  expect(similaritySearchviewer.fingerprint, Fingerprint.Morgan);
  expect(similaritySearchviewer.distanceMetric, BitArrayMetricsNames.Tanimoto);
  expect(similaritySearchviewer.scores!.get(0), 1);
  expect(similaritySearchviewer.idxs!.get(0), 0);
  expect(similaritySearchviewer.molCol!.get(0), 'O=C1CN=C(c2ccccc2N1)C3CCCCC3');
  await testEvent(similaritySearchviewer.renderCompleted, () => {}, () => { molecules.dataFrame.currentRowIdx = 1 }, 5000);
  expect(similaritySearchviewer.curIdx, 1);
  expect(similaritySearchviewer.molCol!.get(0), 'CN1C(=O)CN=C(c2ccccc12)C3CCCCC3');
  molecules.close();
}

async function _testSimilaritySearchFunctionality(distanceMetric: BitArrayMetrics, fingerprint: string) {
  const molecules = await readDataframe('tests/sar-small_test.csv');
  const moleculeColumn = molecules.col('smiles');
  const similarityDf = await chemSimilaritySearch(molecules, moleculeColumn!, moleculeColumn!.get(0),
    distanceMetric, 10, 0.01, fingerprint as Fingerprint, DG.BitSet.create(molecules.rowCount).setAll(true));
    //@ts-ignore
  const testResults = testSimilarityResults[`${distanceMetric}/${fingerprint}`];
  for (let i = 0; i < testResults.length; i++) {
    console.log(testResults);
    Object.keys(testResults[i]).forEach((it) => expect(similarityDf!.get(it, i), testResults[i][it]));
  }
}

async function _testDiversitySearchViewerOpen() {
  const molecules = await createTableView('tests/sar-small_test.csv');
  const diversitySearchviewer: ChemDiversityViewer = (await molecules.dataFrame.plot
    .fromType('Chem Diversity Search')) as ChemDiversityViewer;
  await testEvent(diversitySearchviewer.renderCompleted, () => {}, () => {}, 5000);
  expect(diversitySearchviewer.fingerprint, Fingerprint.Morgan);
  expect(diversitySearchviewer.distanceMetric, BitArrayMetricsNames.Tanimoto);
  expect(diversitySearchviewer.initialized, true);
  expect(diversitySearchviewer.renderMolIds.length > 0, true);
  molecules.close();
}

const testSimilarityResults = {
  'Tanimoto/Morgan': [
    {smiles: 'O=C1CN=C(c2ccccc2N1)C3CCCCC3', indexes: 0, score: 1},
    {smiles: 'CN(C)c1ccc2NC(=O)CN=C(c2c1)C3CCCCC3', indexes: 14, score: 0.644444465637207}],
  'Dice/Morgan': [
    {smiles: 'O=C1CN=C(c2ccccc2N1)C3CCCCC3', indexes: 0, score: 1},
    {smiles: 'CN(C)c1ccc2NC(=O)CN=C(c2c1)C3CCCCC3', indexes: 14, score: 0.7837837934494019}],
  'Cosine/Morgan': [
    {smiles: 'O=C1CN=C(c2ccccc2N1)C3CCCCC3', indexes: 0, score: 1},
    {smiles: 'CN(C)c1ccc2NC(=O)CN=C(c2c1)C3CCCCC3', indexes: 14, score: 0.7863729000091553}],
  'Euclidean/Morgan': [
    {smiles: 'O=C1CN=C(c2ccccc2N1)C3CCCCC3', indexes: 0, score: 1},
    {smiles: 'CN(C)c1ccc2NC(=O)CN=C(c2c1)C3CCCCC3', indexes: 14, score: 0.20000000298023224}],
  'Hamming/Morgan': [
    {smiles: 'O=C1CN=C(c2ccccc2N1)C3CCCCC3', indexes: 0, score: 1},
    {smiles: 'CN(C)c1ccc2NC(=O)CN=C(c2c1)C3CCCCC3', indexes: 14, score: 0.05882352963089943}],
};
