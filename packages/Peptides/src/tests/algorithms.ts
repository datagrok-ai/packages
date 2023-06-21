import * as DG from 'datagrok-api/dg';

import {category, test, expect, before} from '@datagrok-libraries/utils/src/test';

import {_package} from '../package-test';
import {findMutations} from '../utils/algorithms';
import * as type from '../utils/types';
import {extractColInfo} from '../utils/misc';

category('Algorithms', () => {
  let activityCol: type.RawData;
  let monomerColumns: type.RawColumn[];
  let settings: type.PeptidesSettings;
  let targetCol: type.RawColumn;

  before(async () => {
    activityCol = DG.Column.fromList('int', 'test', [1, 2, 5]).getRawData();
    monomerColumns = [
      DG.Column.fromList('string', '1', 'AAA'.split('')),
      DG.Column.fromList('string', '2', 'BCC'.split('')),
      DG.Column.fromList('string', '3', 'CCD'.split('')),
    ].map((col) => ({
      name: col.name,
      rawData: col.getRawData(),
      cat: col.categories,
    }));
    targetCol = extractColInfo(DG.Column.fromList('string', 'target', ['1', '2', '2']));
    settings = {maxMutations: 1, minActivityDelta: 2};
  });

  test('MutationCliffs', async () => {
    // Check every pair
    let mutationCliffsInfo: type.MutationCliffs = findMutations(activityCol, monomerColumns, settings);
    expect(mutationCliffsInfo.has('C'), true, `MutationCliffsInfo should have key 'C'`);
    expect(mutationCliffsInfo.has('D'), true, `MutationCliffsInfo should have key 'D'`);
    expect(mutationCliffsInfo.has('A'), false, `MutationCliffsInfo should not have key 'A'`);

    const c = mutationCliffsInfo.get('C')!;
    const d = mutationCliffsInfo.get('D')!;
    expect(c.has('3'), true, `MutationCliffsInfo['C'] should have key '3'`);
    expect(d.has('3'), true, `MutationCliffsInfo['D'] should have key '3'`);

    const c3 = c.get('3')!;
    const d3 = d.get('3')!;
    expect(c3.has(1), true, `MutationCliffsInfo['C']['3'] should have key 1`);
    expect(d3.has(2), true, `MutationCliffsInfo['D']['3'] should have key 2`);

    const c31 = c3.get(1)!;
    const d32 = d3.get(2)!;
    expect(c31[0], 2, `MutationCliffsInfo['C']['3'][1] should have value 2`);
    expect(d32[0], 1, `MutationCliffsInfo['D']['3'][2] should have value 1`);

    // Check with target
    mutationCliffsInfo = findMutations(activityCol, monomerColumns, settings, {targetCol, currentTarget: '1'});
    expect(mutationCliffsInfo.size, 0, `MutationCliffsInfo should be empty for target '1'`);
  });

  test('MutationCliffs - Benchmark 5k', async () => {
    const df = (await _package.files.readBinaryDataFrames('tests/aligned_5k.d42'))[0];
    const activityCol: type.RawData = df.getCol('Activity').getRawData();
    const monomerCols: type.RawColumn[] = [];
    for (let i = 1; i < 16; ++i) {
      const col = df.getCol(i.toString());
      monomerCols.push({name: col.name, rawData: col.getRawData(), cat: col.categories});
    }
    DG.time('MutationCliffs', () => findMutations(activityCol, monomerCols));
  }, {skipReason: 'Benchmark'});
});
