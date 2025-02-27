import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {expect} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import {searchSubstructure} from '../package';

export async function loadFileAsText(name: string): Promise<string> {
  return await _package.files.readAsText(name);
}

export async function loadFileAsBytes(name: string): Promise<Uint8Array> {
  return await _package.files.readAsBytes(name);
}

export async function dfFromColWithOneCategory(colName: string, value: string, length: number): Promise<DG.DataFrame> {
  const col = DG.Column.fromType(DG.COLUMN_TYPE.STRING, colName, length);
  col.init((_) => value);
  return DG.DataFrame.fromColumns([col]);
}
export async function createTableView(tableName: string): Promise<DG.TableView> {
  const df = await readDataframe(tableName);
  df.name = tableName.replace('.csv', '');
  await grok.data.detectSemanticTypes(df);
  const view = grok.shell.addTableView(df);
  return view;
}

export async function readDataframe(tableName: string): Promise<DG.DataFrame> {
  const df = await grok.dapi.files.readCsv(`System:AppData/Chem/${tableName}`);
  df.name = tableName.replace('.csv', '');
  return df;
}

export async function _testSearchSubstructure(df: DG.DataFrame, colName: string,
  pattern: string, trueIndices: number[]): Promise<void> {
  const col = df.columns.byName(colName);
  const bitSet: DG.BitSet = (await searchSubstructure(col, pattern, '')).get(0);
  expect(bitSet !== null, true);
  checkBitSetIndices(bitSet, trueIndices);
}

export function checkBitSetIndices(bitSet: DG.BitSet, trueIndices: number[]) {
  const bitsetString = bitSet.toBinaryString();
  const bitsetArray = [...bitsetString];
  for (let k = 0; k < trueIndices.length; ++k) {
    expect(bitsetArray[trueIndices[k]] === '1', true);
    bitsetArray[trueIndices[k]] = '0';
  }
  for (let i = 0; i < bitsetArray.length; ++i)
    expect(bitsetArray[i] === '0', true);
}

export async function _testSearchSubstructureSARSmall(): Promise<void> {
  const file = await loadFileAsText('sar-small.csv');

  const df = DG.DataFrame.fromCsv(file);
  const col = df.columns.byIndex(0);
  const bitset: DG.BitSet = (await searchSubstructure(col, 'O=C1CN=C(C2CCCCC2)c2ccccc2N1', '')).get(0);
  const countDataframe = col.length;
  const countResult = bitset.trueCount;
  expect(countDataframe, 200);
  expect(countResult, 90);
}

export async function _testSearchSubstructureAllParameters(foo: any): Promise<void> {
  await foo({});
  await foo();
}

export async function ensureContainersRunning() {
  const [chempropContainer, chemContainer] = await Promise.all([
    grok.dapi.docker.dockerContainers.filter('chemprop').first(),
    grok.dapi.docker.dockerContainers.filter('name = "chem-chem"').first()
  ]);

  _package.logger.debug(`*************** chempropContainer ${chempropContainer.status}`);
  _package.logger.debug(`*************** chemContainer ${chemContainer.status}`);

  await Promise.all([
    !(chemContainer.status.startsWith('started') || chemContainer.status.startsWith('checking')) 
      ? grok.dapi.docker.dockerContainers.run(chemContainer.id, true) 
      : Promise.resolve(),

    !(chempropContainer.status.startsWith('started') || chempropContainer.status.startsWith('checking'))
      ? grok.dapi.docker.dockerContainers.run(chempropContainer.id, true) 
      : Promise.resolve()
  ]);
}

export const malformedMolblock = `
Accelrys05311914342D 1   1.00000     0.00000     0

 22 26  0     0  0            999 V2000
    0.4617   -1.1749    0.0000 C   0  0  0  0  0  0           0  0  0
    0.4617    0.0063    0.0000 C   0  0  0  0  0  0           0  0  0
   -0.5668   -1.7639    0.0000 C   0  0  0  0  0  0           0  0  0
   -1.5729   -1.1749    0.0000 C   0  0  0  0  0  0           0  0  0
   -0.5668    0.5986    0.0000 O   0  0  0  0  0  0           0  0  0
   -1.5729    0.0063    0.0000 C   0  0  0  0  0  0           0  0  0
   -2.5886   -1.7639    0.0000 C   0  0  0  0  0  0           0  0  0
    1.4774    0.5986    0.0000 C   0  0  0  0  0  0           0  0  0
   -2.5886    0.5986    0.0000 C   0  0  0  0  0  0           0  0  0
   -3.6075   -1.1749    0.0000 C   0  0  0  0  0  0           0  0  0
    1.4774    1.7799    0.0000 C   0  0  0  0  0  0           0  0  0
    2.4803    2.3721    0.0000 C   0  0  0  0  0  0           0  0  0
   -0.5668   -2.9484    0.0000 O   0  0  0  0  0  0           0  0  0
   -3.6075    0.0063    0.0000 C   0  0  0  0  0  0           0  0  0
    3.5279    1.7799    0.0000 C   0  0  0  0  0  0           0  0  0
    2.5059    0.0063    0.0000 C   0  0  0  0  0  0           0  0  0
    1.4774   -1.7639    0.0000 O   0  0  0  0  0  0           0  0  0
    3.5279    0.5986    0.0000 C   0  0  0  0  0  0           0  0  0
   -2.5886   -2.9484    0.0000 O   0  0  0  0  0  0           0  0  0
    2.4803    3.4101    0.0000 O   0  0  0  0  0  0           0  0  0
   -4.6328    0.5986    0.0000 O   0  0  0  0  0  0           0  0  0
    4.5691    2.3721    0.0000 O   0  0  0  0  0  0           0  0  0
  2  1  2  0     0  0
  2  3  2  0     0  0
  2  4  2  0     0  0
  3  1  1  0     0  0
  4  3  1  0     0  0
  5  2  1  0     0  0
  6  5  1  0     0  0
  7  4  1  0     0  0
  8  2  1  0     0  0
  9  6  1  0     0  0
 10  7  2  0     0  0
 11  8  2  0     0  0
 12 11  1  0     0  0
 13  3  2  0     0  0
 14  9  2  0     0  0
 15 18  1  0     0  0
 16  8  1  0     0  0
 17  1  1  0     0  0
 18 16  2  0     0  0
 19  7  1  0     0  0
 20 12  1  0     0  0
 21 14  1  0     0  0
 22 15  1  0     0  0
  6  4  2  0     0  0
 15 12  2  0     0  0
 14 10  1  0     0  0
M  END
`

export const molV2000 = `
Accelrys05311914342D 1   1.00000     0.00000     0

 18 19  0     0  0            999 V2000
    2.9291   -5.8667    0.0000 C   0  0  2  0  0  0           0  0  0
    3.7541   -5.8667    0.0000 C   0  0  2  0  0  0           0  0  0
    4.0109   -5.0826    0.0000 O   0  0  0  0  0  0           0  0  0
    3.3416   -4.5958    0.0000 C   0  0  2  0  0  0           0  0  0
    2.6766   -5.0826    0.0000 C   0  0  0  0  0  0           0  0  0
    3.3404   -3.7708    0.0000 N   0  0  3  0  0  0           0  0  0
    4.2383   -6.5347    0.0000 O   0  0  0  0  0  0           0  0  0
    2.4433   -6.5335    0.0000 N   0  0  0  0  0  0           0  0  0
    1.6229   -6.4464    0.0000 N   0  3  0  0  0  0           0  0  0
    5.0589   -6.4494    0.0000 C   0  0  0  0  0  0           0  0  0
    0.7983   -6.3826    0.0000 N   0  5  0  0  0  0           0  0  0
    4.0576   -3.3612    0.0000 C   0  0  0  0  0  0           0  0  0
    4.0583   -2.5398    0.0000 C   0  0  0  0  0  0           0  0  0
    3.3451   -2.1245    0.0000 C   0  0  0  0  0  0           0  0  0
    2.6294   -2.5369    0.0000 N   0  0  0  0  0  0           0  0  0
    2.6270   -3.3645    0.0000 C   0  0  0  0  0  0           0  0  0
    3.3469   -1.2995    0.0000 O   0  0  0  0  0  0           0  0  0
    1.9131   -3.7781    0.0000 O   0  0  0  0  0  0           0  0  0
  8  9  2  0     0  0
  4  5  1  0     0  0
  7 10  1  0     0  0
  5  1  1  0     0  0
  9 11  2  0     0  0
  6 12  1  0     0  0
  1  2  1  0     0  0
  4  6  1  6     0  0
  2  7  1  6     0  0
  2  3  1  0     0  0
  6 16  1  0     0  0
 12 13  2  0     0  0
 13 14  1  0     0  0
 14 15  1  0     0  0
 15 16  1  0     0  0
  1  8  1  1     0  0
 14 17  2  0     0  0
  3  4  1  0     0  0
 16 18  2  0     0  0
M  CHG  2   9   1  11  -1
M  END`;

export const molV3000 = `Azaguanine-8
Actelion Java MolfileCreator 2.0

  0  0  0  0  0  0              0 V3000
M  V30 BEGIN CTAB
M  V30 COUNTS 11 12 0 0 0
M  V30 BEGIN ATOM
M  V30 1 O 0.0 0.0 0.0 0
M  V30 2 C -0.0119 -1.5014 0.0 0
M  V30 3 N -1.3227 -2.2522 0.0 0
M  V30 4 C 1.275 -2.2522 0.0 0
M  V30 5 C -1.3346 -3.7418 0.0 0
M  V30 6 N 2.705 -1.7755 0.0 0
M  V30 7 C 1.2631 -3.7418 0.0 0
M  V30 8 N -0.0476 -4.4806 0.0 0
M  V30 9 N -2.6812 -4.4806 0.0 0
M  V30 10 N 3.5749 -2.9791 0.0 0
M  V30 11 N 2.6931 -4.1946 0.0 0
M  V30 END ATOM
M  V30 BEGIN BOND
M  V30 1 2 1 2
M  V30 2 1 2 3
M  V30 3 1 2 4
M  V30 4 1 3 5
M  V30 5 1 4 6
M  V30 6 2 4 7
M  V30 7 2 5 8
M  V30 8 1 5 9
M  V30 9 2 6 10
M  V30 10 1 7 11
M  V30 11 1 7 8
M  V30 12 1 10 11
M  V30 END BOND
M  V30 END CTAB
M  END`;
