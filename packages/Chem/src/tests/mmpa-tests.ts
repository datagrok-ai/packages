import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';

import {awaitCheck, before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {createTableView} from './utils';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import {_package} from '../package-test';
import {MatchedMolecularPairsViewer} from '../analysis/molecular-matched-pairs/mmp-viewer/mmp-viewer';
import { SHOW_FRAGS_MODE } from '../analysis/molecular-matched-pairs/mmp-viewer/mmp-constants';

const pairsFromMolblock = `
     RDKit          2D

 13 14  0  0  0  0  0  0  0  0999 V2000
    0.4546    1.4171    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.9545    2.2831    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4546    3.1491    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5454    3.1491    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0455    4.0151    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
   -1.0455    2.2831    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5454    1.4171    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0455    0.5511    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5454   -0.3149    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4546   -0.3149    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.9545    0.5511    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.9545    0.5511    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.4546   -0.3149    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0
  2  3  1  0
  3  4  2  0
  4  5  1  0
  4  6  1  0
  6  7  2  0
  7  8  1  0
  8  9  2  0
  9 10  1  0
 10 11  2  0
 11 12  1  0
 12 13  1  0
 11  1  1  0
  7  1  1  0
M  END
`;

const pairsToMolblock = `
     RDKit          2D

 14 15  0  0  0  0  0  0  0  0999 V2000
    0.4546    1.4172    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.9545    2.2832    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4546    3.1492    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5454    3.1492    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0455    4.0152    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
   -1.0453    2.2832    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5454    1.4172    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.0454    0.5512    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5455   -0.3150    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4545   -0.3150    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.9544    0.5512    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.9544    0.5512    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.4545   -0.3148    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    3.4545   -0.3148    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0
  2  3  1  0
  3  4  2  0
  4  5  1  0
  4  6  1  0
  6  7  2  0
  7  8  1  0
  8  9  2  0
  9 10  1  0
 10 11  2  0
 11 12  1  0
 12 13  1  0
 13 14  1  0
 11  1  1  0
  7  1  1  0
M  END
`;

const randomValsToCheck: {[key: string]: {[key: string]: {idxs: number[], values: any[]}}} = {
  'Transformations_Fragments': {
    'From': {idxs: [1, 29, 37], values: ["CC(Br)[*:1]", "C[*:1]", "O[*:1]"]},
    'To': {idxs: [5, 9, 37], values: ["CC(C)C[*:1]", "CC(C)[*:1]", "O[*:1]"]},
    'Count': {idxs: [0, 28, 39], values: [1, 2, 3]},
    '\u0394 Activity':
      {idxs: [0, 11, 30], values: [-12.23, -4.64, 6.85]},
    '\u0394 Permeability':
      {idxs: [0, 11, 30], values: [-14.59, -7.56, 8.35]},
    '\u0394 Toxicity':
      {idxs: [0, 11, 30], values: [-2.79, -0.65, 0.86]},
  },
  'Transformations_Pairs': {
    'From': {idxs: [0, 30, 50], values: [
      "CC(Br)C1C(=O)Oc2ccccc2C1O",
      "CCCc1cc(=O)c2c(O)c(O)c(O)cc2o1",
      "O=C1Oc2ccccc2C(O)C1CO",
    ]},
    'To': {idxs: [0, 30, 50], values: [
      "CC(Br)C1C(=O)Oc2ccccc2C1O",
      "CCCc1cc(=O)c2c(O)c(O)c(O)cc2o1",
      "O=C1Oc2ccccc2C(O)C1CO",
    ]},
    '\u0394 Activity':
      {idxs: [0, 30, 50], values: [-12.23, 1.78, 10.31]},
    '\u0394 Permeability':
      {idxs: [0, 30, 50], values: [-14.59, 1.23, 12.71]},
    '\u0394 Toxicity': {idxs: [0, 30, 50], values: [-3.19, 0.29, 1.68]},
  },
  'Generation': {
    'Structure': {idxs: [0, 70, 113], values: [
      'CCc1ccnc2cc(Cl)ccc12',
      'O=C1Oc2ccccc2C(O)C1Cc1ccc(O)cc1O',
      'OCc1ccnc2cc(Cl)ccc12',
    ]},
    'Original activity': {idxs: [0, 70, 113], values: [48.67, 5.89, -2.46]},
    'Activity': {idxs: [0, 38, 76], values: ['Activity', 'Permeability', 'Toxicity']},
    'Core': {idxs: [0, 70, 113],
      values: ['Clc1ccc2c(C[*:1])ccnc2c1', 'O=C1Oc2ccccc2C([*:1])C1Cc1ccc(O)cc1O', 'Clc1ccc2c(C[*:1])ccnc2c1']},
    'From': {idxs: [0, 70, 107], values: ['C[*:1]', 'O[*:1]', 'O=C(O)[*:1]']},
    'To': {idxs: [0, 70, 113], values: ['O=C(O)[*:1]', 'CC(C)[*:1]', 'CC[*:1]']},
    'New activity': {idxs: [0, 70, 113], values: [58.98, 13.53, 0.33]},
    'New molecule': {idxs: [0, 70, 113],
      values: ['O=C(O)Cc1ccnc2cc(Cl)ccc12', 'CC(C)C1c2ccccc2OC(=O)C1Cc1ccc(O)cc1O', 'CCCc1ccnc2cc(Cl)ccc12']},
  },
};


category('mmpa', () => {
  before(async () => {
    grok.shell.closeAll();
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
  });

  test('mmpaOpens', async () => {
    const tv = await createTableView('demo_files/matched_molecular_pairs.csv');
    let mmp: MatchedMolecularPairsViewer = (grok.shell.v as DG.TableView)
      .addViewer('Matched Molecular Pairs Analysis') as MatchedMolecularPairsViewer;
    mmp.setOptions({
      molecules: 'smiles',
      activities: tv.dataFrame.clone().columns.remove('smiles').names(),
      fragmentCutoff: 0.4});
    //wait for MMPA viewer to be created
    await awaitCheck(() => {
      let mmpCreated = false;
      for (const v of tv.viewers) {
        if (v.type === 'Matched Molecular Pairs Analysis') {
          mmp = v as MatchedMolecularPairsViewer;
          mmpCreated = true;
        }
      }
      return mmpCreated;
    }, 'MMPA hasn\'t been initialized', 3000);
    //ensure MMPA opened
    await awaitCheck(() => document.getElementsByClassName('chem-mmpa-transformation-tab-header').length > 0,
      'MMPA hasn\'t been started', 3000);
    //ensure fragments and pairs grids have been created
    await awaitCheck(() => document.getElementsByClassName('d4-grid').length === 3,
      'Fragments and Pairs grids haven\'t been created', 3000);
    expect(mmp.mmpa!.rules.rules.length, 40, `Incorrect rules`);
    expect(mmp.mmpa!.rules!.smilesFrags.length, 14, `Incorrect smilesFrags`);
  });

  test('transformationsTab', async () => {
    const tv = await createTableView('demo_files/matched_molecular_pairs.csv');
    let mmp: MatchedMolecularPairsViewer = (grok.shell.v as DG.TableView)
      .addViewer('Matched Molecular Pairs Analysis') as MatchedMolecularPairsViewer;
    mmp.setOptions({
      molecules: 'smiles',
      activities: tv.dataFrame.clone().columns.remove('smiles').names(),
      fragmentCutoff: 0.4});
    //wait for MMPA viewer to be created
    await awaitCheck(() => {
      let mmpCreated = false;
      for (const v of tv.viewers) {
        if (v.type === 'Matched Molecular Pairs Analysis') {
          mmp = v as MatchedMolecularPairsViewer;
          mmpCreated = true;
        }
      }
      return mmpCreated;
    }, 'MMPA hasn\'t been initialized', 3000);

    //check Fragments Grid
    await awaitCheck(() => mmp.pairedGrids?.fpGrid?.dataFrame != null, 'All pairs grid hasn\'t been created', 3000);
    const fragsDf = mmp.pairedGrids!.fpGrid.dataFrame;
    await awaitCheck(() => fragsDf.rowCount === 40 && fragsDf.columns.length === 7, 'Incorrect fragments grid', 3000);
    checkRandomValues(fragsDf, 'Transformations_Fragments', true);

    //check Pairs Grid
    await awaitCheck(() => mmp.pairedGrids?.mmpGridTrans?.dataFrame != null, 'mmpGrid hasn\'t been created', 3000);
    const pairsDf = mmp.pairedGrids!.mmpGridTrans.dataFrame;
    await awaitCheck(() => pairsDf.rowCount === 54 && pairsDf.columns.length === 13, 'Incorrect pairs grid', 3000);
    checkRandomValues(mmp.pairedGrids!.mmpGridTrans.dataFrame, 'Transformations_Pairs', true);

    //changing fragment
    mmp.pairedGrids!.fpGrid.dataFrame.currentRowIdx = 2;
    await awaitCheck(() => pairsDf.filter.trueCount === 2 && pairsDf.filter.get(6) && pairsDf.filter.get(7),
      'Pairs haven\'t been changed after fragment change', 3000);

    mmp.showFragmentsChoice!.value = SHOW_FRAGS_MODE.Current;
    //changing target molecule
    tv.dataFrame.currentRowIdx = 4;
    await awaitCheck(() => fragsDf.filter.trueCount === 3 &&
        fragsDf.filter.get(3) && fragsDf.filter.get(4) && fragsDf.filter.get(7) &&
        pairsDf.filter.trueCount === 2 && pairsDf.filter.get(8) && pairsDf.filter.get(9),
    'Pairs haven\'t been changed after fragment change', 3000);
  });

  test('cliffsTab', async () => {
    const tv = await createTableView('demo_files/matched_molecular_pairs.csv');
    let mmp: MatchedMolecularPairsViewer = (grok.shell.v as DG.TableView)
      .addViewer('Matched Molecular Pairs Analysis') as MatchedMolecularPairsViewer;
    mmp.setOptions({
      molecules: 'smiles',
      activities: tv.dataFrame.clone().columns.remove('smiles').names(),
      fragmentCutoff: 0.4});
    //wait for MMPA viewer to be created
    await awaitCheck(() => {
      let mmpCreated = false;
      for (const v of tv.viewers) {
        if (v.type === 'Matched Molecular Pairs Analysis') {
          mmp = v as MatchedMolecularPairsViewer;
          mmpCreated = true;
        }
      }
      return mmpCreated;
    }, 'MMPA hasn\'t been initialized', 3000);
    //open cliffs tab
    await awaitCheck(() => mmp.root.querySelector('[name=\'Cliffs\']') != null,
      'Cliffs tab hasn\'t been created', 10000);
    const cliffsTabHeader = mmp.root.querySelector('[name=\'Cliffs\']') as HTMLElement;
    cliffsTabHeader.click();
    //ensure embeddings columns have been created for cliffs tab
    await awaitCheck(() => tv.dataFrame.columns.names().includes('~Embed_X_1') &&
     tv.dataFrame.columns.names().includes('~Embed_Y_1'), 'Embeddings haven\'t been created', 3000);
    //ensure embeddings columns have been calculated
    await awaitCheck(() => tv.dataFrame.col('~Embed_X_1')!.stats.missingValueCount === 0 &&
     tv.dataFrame.col('~Embed_Y_1')!.stats.missingValueCount === 0, 'Embeddings haven\'t been calculated', 10000);
    //check created lines
    await awaitCheck(() => mmp.lines?.from.length === 81 && mmp.lines?.to.length === 81 &&
    mmp.linesIdxs!.length === 81, 'Incorrect lines number', 3000);
    await awaitCheck(() => mmp.linesMask?.allTrue == false, 'Incorrect initial lines mask');
    checkRandomArrayVals(mmp.lines?.from, [0, 10, 30, 50, 70], [30, 6, 37, 23, 9], 'mmp.lines.from');
    checkRandomArrayVals(mmp.lines?.to, [0, 10, 30, 50, 70], [0, 28, 0, 27, 23], 'mmp.lines.to');
    checkRandomArrayVals(mmp.linesIdxs,
      [0, 10, 30, 50, 80], [mmp.calculatedOnGPU ? 0 : 3, 22, 8, 47, 52], 'mmp.linesIdxs');
    checkRandomArrayVals(mmp.lines?.colors,
      [0, 30, 80], ['31,119,180', '255,187,120', '44,160,44'], 'mmp.lines.colors');
    checkRandomArrayVals(mmp.linesActivityCorrespondance, [0, 27, 55], [0, 1, 2], 'mmp.linesActivityCorrespondance');

    expect(mmp.mmpFilters?.activitySliderInputs?.length, 3, 'mmp cliffs filters haven\'t been created');
    //changing sliders inputs values
    mmp.mmpFilters!.activitySliderInputs![0].value = 11.87;
    mmp.mmpFilters!.activitySliderInputs![1].value = 14.15;
    mmp.mmpFilters!.activitySliderInputs![2].value = 1.627;
    await awaitCheck(() => !!mmp.linesMask && DG.BitSet.fromBytes(mmp.linesMask.buffer.buffer, 81).trueCount === 7,
      'Incorrect lines mask after slider input changed', 3000);

    //switch of one of activities
    mmp.mmpFilters!.activityActiveInputs[2].value = false;
    await awaitCheck(() => !!mmp.linesMask && DG.BitSet.fromBytes(mmp.linesMask!.buffer.buffer, 81).trueCount === 2,
      'Incorrect lines mask after checkboxes values changed', 3000);
  });

  test('generationTab', async () => {
    const tv = await createTableView('demo_files/matched_molecular_pairs.csv');
    let mmp: MatchedMolecularPairsViewer = (grok.shell.v as DG.TableView)
      .addViewer('Matched Molecular Pairs Analysis') as MatchedMolecularPairsViewer;
    mmp.setOptions({
      molecules: 'smiles',
      activities: tv.dataFrame.clone().columns.remove('smiles').names(),
      fragmentCutoff: 0.4});
    //wait for MMPA viewer to be created
    await awaitCheck(() => {
      let mmpCreated = false;
      for (const v of tv.viewers) {
        if (v.type === 'Matched Molecular Pairs Analysis') {
          mmp = v as MatchedMolecularPairsViewer;
          mmpCreated = true;
        }
      }
      return mmpCreated;
    }, 'MMPA hasn\'t been initialized', 3000);
    await awaitCheck(() => mmp.root.querySelector('[name=\'Generation\']') != null,
      'Generation tab hasn\'t been created', 10000);
    const genTabHeader = mmp.root.querySelector('[name=\'Generation\']') as HTMLElement;
    genTabHeader.click();
    await awaitCheck(() => mmp.generationsGrid?.dataFrame != null, 'Generation grid hasn\'t been created', 10000);
    const genDf = mmp.generationsGrid!.dataFrame;
    await awaitCheck(() => genDf.rowCount === 114, 'Incorrect row count');
    checkRandomValues(genDf, 'Generation');
    //check that 'Prediction' column has been calculated
    await awaitCheck(() =>
      genDf.columns.names().includes('Prediction'), '\'Prediction\' column hasn\'t been created', 10000);

    const isExpected = () => {
      const predicted = genDf.col('Prediction')!.toList().filter((it) => it).length;
      // we get different results on cpu and gpu for predictions
      return predicted === 91 || (mmp.calculatedOnGPU && predicted === 92);
    };
    expect(isExpected(), true, 'Incorrect data in \'Prediction\' column');
  });
});


function checkRandomValues(df: DG.DataFrame, dfName: string, sort?: boolean) {
  Object.keys(randomValsToCheck[dfName]).forEach((key: string) => {
    const idxs = randomValsToCheck[dfName][key].idxs;
    const vals = randomValsToCheck[dfName][key].values;
    const col = df.col(key)?.toList();
    if (sort)
      typeof col![0] === 'number' ? col?.sort((a, b) => a - b) : col?.sort();
    idxs.forEach((it, idx) => {
      const val = typeof col![it] === 'number' ?
        Math.round(col![it]*100)/100 : col![it];
      expect(val, vals[idx], `incorrect data in ${key} column, row ${it}`);
    });
  });
}

function checkRandomArrayVals(array: any, idxs: number[], vals: (number | string)[], name: string) {
  expect(array != undefined, true, 'array of values is not defined');
  idxs.forEach((it: number, idx: number) => expect(array[it], vals[idx], `Incorrect value in ${name}, idx: ${it}`));
}
