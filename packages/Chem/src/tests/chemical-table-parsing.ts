import {category, expectArray, test, before} from '@datagrok-libraries/utils/src/test';

import {loadFileAsText} from './utils';
import {MolfileHandler} from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler';

type TestedData = {
  X: number[],
  Y: number[],
  Z: number[],
  ATOM_TYPES: string[],
  BONDED_ATOMS: number[][],
}

const OUTPUT: TestedData = {
  X: [-4.0300, -2.5342, -1.7842, -2.6292, -0.3009, 0.7986, 0.6865, 1.9856, 3.2846, 4.5837, 4.5837, 3.2846, 1.9856,
    -0.5528, -0.2190, -1.3186, -2.7520, -3.0858, -1.9862],
  Y: [-1.5401, -1.4280, -2.7270, -3.9664, -2.9506, -1.9303, -0.4345, 0.3155, -0.4345, 0.3155, 1.8155, 2.5655,
    1.8155, 0.4104, 1.8728, 2.8931, 2.4510, 0.9886, -0.0317, 
  ],
  Z: new Array<number>(19).fill(0),
  ATOM_TYPES: ['C', 'N', 'C', 'O', 'C', 'N', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'],
  BONDED_ATOMS: [
    [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [7, 14],
    [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 2], [13, 8], [19, 14], 
  ],
};

category('chemical table parsing', async () => {
  let molfileV2K: string;
  let molfileV3K: string;
  let molfileHandler: MolfileHandler;

  before(async () => {
    molfileV2K = await loadFileAsText('tests/molfileV2000.mol');
    molfileV3K = await loadFileAsText('tests/molfileV3000.mol');
    molfileHandler = new MolfileHandler(molfileV2K);
  });

  function getRoundedNumberArray(floatArray: Float32Array): number[] {
    return Array.from(floatArray)
      .map((item: number) => Math.round(item * 10000) / 10000);
  }

  function _testCoordinates(molfile: string, expectedData: TestedData): void {
    molfileHandler.init(molfile);
    const expected = [expectedData.X, expectedData.Y, expectedData.Z];
    const obtained = [
      getRoundedNumberArray(molfileHandler.x),
      getRoundedNumberArray(molfileHandler.y),      
      getRoundedNumberArray(molfileHandler.z),
    ];
    expectArray(expected, obtained);
  }

  function _testAtomTypes(molfile: string, expectedData: TestedData): void {
    molfileHandler.init(molfile);
    expectArray(expectedData.ATOM_TYPES, molfileHandler.atomTypes);
  }

  function _testBondedAtoms(molfile: string, expectedData: TestedData): void {
    molfileHandler.init(molfile);
    const obtained = molfileHandler.pairsOfBondedAtoms.map(
      (item: Uint16Array) => Array.from(item),
    );
    console.log('obtained:', obtained);
    expectArray(expectedData.BONDED_ATOMS, obtained);
  }

  test('parse coordinates V2K', async () => {
    _testCoordinates(molfileV2K, OUTPUT);
  });

  test('parse atom types V2K', async () => {
    _testAtomTypes(molfileV2K, OUTPUT);
  });

  test('parse bonded atoms V2K', async () => {
    _testBondedAtoms(molfileV2K, OUTPUT);
  });

  test('parse coordinates V3K', async () => {
    _testCoordinates(molfileV3K, OUTPUT);
  });

  test('parse atom types V3K', async () => {
    _testAtomTypes(molfileV3K, OUTPUT);
  });

  test('parse bonded atoms V3K', async () => {
    _testBondedAtoms(molfileV3K, OUTPUT);
  });
});
