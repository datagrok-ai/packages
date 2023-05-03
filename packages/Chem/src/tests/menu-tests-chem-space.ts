import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {_package} from '../package-test';
import {readDataframe} from './utils';
import {before, after, expect, category, test, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {chemSpace} from '../analysis/chem-space';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import {getSimilaritiesMarix, getSimilaritiesMarixFromDistances} from '../utils/similarity-utils';
import {chemSpaceTopMenu} from '../package';
import {ISequenceSpaceParams} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';

const {jStat} = require('jstat');


category('top menu chem space', async () => {
  let smallDf: DG.DataFrame;
  let spgi100: DG.DataFrame;
  let approvedDrugs100: DG.DataFrame;

  before(async () => {
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
    smallDf = await readDataframe('tests/sar-small_test.csv');
    spgi100 = await readDataframe('tests/spgi-100.csv');
    approvedDrugs100 = await readDataframe('tests/approved-drugs-100.csv');
  });

  test('chemSpaceOpens.smiles', async () => {
    if (DG.Test.isInBenchmark) await _testChemSpaceReturnsResult(await readDataframe('smiles.csv'), 'canonical_smiles');
    else await _testChemSpaceReturnsResult(smallDf, 'smiles');
  });

  test('chemSpaceOpens.molV2000', async () => {
    await _testChemSpaceReturnsResult(spgi100, 'Structure');
  });

  test('chemSpaceOpens.molV3000', async () => {
    await _testChemSpaceReturnsResult(approvedDrugs100, 'molecule');
  });

  test('chemSpace.emptyValues', async () => {
    const sarSmallEmptyRows = await readDataframe('tests/sar-small_empty_vals.csv');
    await _testChemSpaceReturnsResult(sarSmallEmptyRows, 'smiles');
  });

  test('chemSpace.malformedData', async () => {
    const testSmilesMalformed = await readDataframe('tests/Test_smiles_malformed.csv');
    DG.Balloon.closeAll();
    await _testChemSpaceReturnsResult(testSmilesMalformed, 'canonical_smiles');
    try {
      await awaitCheck(() => (document.querySelector('.d4-balloon-content') as HTMLElement)?.innerText.includes(
        '2 molecules with indexes 3,10 are possibly malformed and are not included in analysis'), 'cannot find warning balloon', 1000);
    } finally {DG.Balloon.closeAll();}
  });

  test('TSNE', async () => {
    await _testDimensionalityReducer(smallDf.col('smiles')!, 't-SNE');
  }, {skipReason: '#1384'});

  test('UMAP', async () => {
    await _testDimensionalityReducer(smallDf.col('smiles')!, 'UMAP');
  }, {skipReason: 'GROK-12227'});

  test('SPE', async () => {
    await _testDimensionalityReducer(smallDf.col('smiles')!, 'SPE');
  });

  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
  });
});

async function _testChemSpaceReturnsResult(df: DG.DataFrame, col: string) {
  await grok.data.detectSemanticTypes(df);
  const tv = grok.shell.addTableView(df);
  try {
    const sp = await chemSpaceTopMenu(df, df.getCol(col), 'UMAP', 'Tanimoto', true, {});
    expect(sp != null, true);
  } finally {tv.close();}
}

async function _testDimensionalityReducer(col: DG.Column, algorithm: string) {
  const chemSpaceParams: ISequenceSpaceParams = {
    seqCol: col,
    methodName: algorithm,
    similarityMetric: 'Tanimoto',
    embedAxesNames: ['Embed_X', 'Embed_Y'],
  };
  const {distance, coordinates} = await chemSpace(chemSpaceParams);

  const dfSmiles = DG.DataFrame.fromColumns([DG.Column.fromList('string', 'smiles', col.toList())]);
  const dim = col.length;
  const simArr: DG.Column[] = Array(dim - 1);

  if (!distance)
    await getSimilaritiesMarix(dim, col, dfSmiles, 'smiles', simArr);
  else
    getSimilaritiesMarixFromDistances(dim, distance, simArr);

  const nearestAndFarestNeighbours: IDistanceToPoint[][] = findNNearestAndFarestNeighbours(coordinates, col.length, 'Embed_X', 'Embed_Y');
  // const similaririesWithDistances = DG.DataFrame.create();
  const similaritiesArray: number[] = [];
  const distancesArray: number[] = [];
  /*     similaririesWithDistances.columns.addNewInt('mol1');
      similaririesWithDistances.columns.addNewInt('mol2');
      similaririesWithDistances.columns.addNewFloat('distance');
      similaririesWithDistances.columns.addNewFloat('similarity'); */
  nearestAndFarestNeighbours.forEach((molecule, index) => {
    molecule.forEach((molPair) => {
      const arrayInd = index > molPair.idx ? molPair.idx : index;
      const row = index < molPair.idx ? molPair.idx : index;
      const sim = simArr[arrayInd].get(row - arrayInd - 1);
      //   similaririesWithDistances.rows.addNew([index, molPair.idx, molPair.distance, sim]);
      similaritiesArray.push(sim);
      distancesArray.push(molPair.distance);
    });
  });
  //  grok.shell.addTableView(similaririesWithDistances);
  const corrCoef = jStat.corrcoeff(similaritiesArray, distancesArray);
  expect(corrCoef <= -0.5, true);
}

interface IDistanceToPoint {
  idx: number;
  distance: number;
}

function findNNearestAndFarestNeighbours(coordinates: DG.ColumnList, nItems: number, xColName: string, yColName: string, n?: number) {
  const matrix: IDistanceToPoint[][] = [];
  const df = DG.DataFrame.create(nItems);
  for (const col of coordinates)
    df.columns.add(col);

  for (let i = 0; i < nItems; ++i) {
    const distances: IDistanceToPoint[] = [];
    for (let j = i + 1; j < nItems; ++j) {
      const x1 = df.col(xColName)!.get(i);
      const y1 = df.col(yColName)!.get(i);
      const x2 = df.col(xColName)!.get(j);
      const y2 = df.col(yColName)!.get(j);
      const d: number = euclideanDistance(x1, y1, x2, y2);
      /*       if (d === NaN) {
                console.log(x1, '***',y1, '***',x2, '***',y2)
            } */
      distances.push({idx: j, distance: d});
    }
    if (n) {
      distances.sort((a, b) => a.distance - b.distance);
      matrix.push(distances.slice(0, n).concat(distances.slice(-5)));
    } else
      matrix.push(distances);
  }
  return matrix;
}


function euclideanDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}
