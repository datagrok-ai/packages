import * as DG from 'datagrok-api/dg';
import {category, test, before} from '@datagrok-libraries/utils/src/test';
import {defaulCheckersSeq, expectDeepEqual} from '@datagrok-libraries/utils/src/expect';

// TODO: move to the lib later?
function throwTester(fn: Function, expectedMessage?: any) {
  let err: any;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  if (!expectedMessage && !err)
    return;

  if (err?.message === expectedMessage)
    return;

  throw new Error(`Expected error message ${expectedMessage}, got ${err?.message}`);
}

category('Utils: expectDeepEqual', async () => {
  before(async () => {
  });

  test('null equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(null, undefined);
      });
  });

  test('boolean equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(true, true);
      } );
  });

  test('boolean non-equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(true, false);
      }, 'Expected false, got true');
  });


  test('string equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual('asdf', 'asdf');
      });
  });

  test('string non-equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual('asdf', 'fdsa');
      }, 'Expected fdsa, got asdf');
  });

  test('interger equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(1, 1);
      });
  });

  test('interger non-equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(1, 2);
      }, 'Expected 2, got 1');
  });

  test('float equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(1.1, 1.1);
      });
  });

  test('float non-equal values', async () => {
    throwTester(
      () => {
        expectDeepEqual(1.1, 2.1);
      }, 'Expected 2.1, got 1.1 (tolerance = 0.001)');
  });

  test('float equality tolerance', async () => {
    throwTester(
      () => {
        expectDeepEqual(1.09, 1.01, {floatTolerance: 0.1});
      });
  });

  test('non-equal different types', async () => {
    throwTester(
      () => {
        expectDeepEqual('asdf', 1);
      }, 'Type mismatch or no checker defined: expected 1, got asdf');
  });

  test('global prefix', async () => {
    throwTester(
      () => {
        expectDeepEqual('asdf', 1, {prefix: 'My Prefix'});
      }, 'My Prefix: Type mismatch or no checker defined: expected 1, got asdf');
  });

  test('map equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 2]]));
      },
    );
  });

  test('map deel equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Map([['a', {a: 1}], ['b', {b: 2}]]), new Map([['a', {a: 1}], ['b', {b: 2}]]));
      },
    );
  });

  test('map different size', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Map([['a', 1], ['b', 2], ['c', 3]]), new Map([['a', 1], ['b', 2]]));
      }, 'Maps are of different size: actual map size is 3 and expected map size is 2',
    );
  });

  test('map deep non-equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Map([['a', {a: 1}], ['b', {b: 2}]]), new Map([['a', {a: 1}], ['b', {b: 3}]]));
      }, `['b'].['b']: Expected 3, got 2`,
    );
  });

  test('set equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]));
      },
    );
  });

  test('set different size', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Set([1, 2, 3, 4]), new Set([1, 2, 3]));
      }, 'Sets are of different size: actual set size is 4 and expected set size is 3',
    );
  });

  test('set non-equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(new Set([1, 2, 4]), new Set([1, 2, 3]));
      }, `['3']: Expected true, got false`,
    );
  });

  test('array equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(['asdf', 1.09, null], ['asdf', 1.01, null], {floatTolerance: 0.1});
      });
  });

  test('array different lenght', async () => {
    throwTester(
      () => {
        expectDeepEqual(['asdf', 1.09, null, null], ['asdf', 1.01, null], {floatTolerance: 0.1});
      }, 'Arrays are of different length: actual array length is 4 and expected array length is 3');
  });

  test('array different content', async () => {
    throwTester(
      () => {
        expectDeepEqual(['asdf', 1.09, null], ['fdsa', 2.01, true], {floatTolerance: 0.1});
      },
      `['0']: Expected fdsa, got asdf\n` +
        `['1']: Expected 2.01, got 1.09 (tolerance = 0.1)\n` +
        `['2']: Type mismatch or no checker defined: expected true, got null`);
  });

  test('array different content limit error report', async () => {
    throwTester(
      () => {
        expectDeepEqual(['asdf', 1.09, null], ['fdsa', 2.01, true], {floatTolerance: 0.1, maxErrorsReport: 1});
      },
      `['0']: Expected fdsa, got asdf`);
  });

  test('array nested equal', async () => {
    throwTester(
      () => {
        expectDeepEqual(
          [['asdf', 1.09], [null, 1], undefined],
          [['asdf', 1.01], [null, 1], undefined],
          {floatTolerance: 0.1});
      });
  });

  test('array nested different', async () => {
    throwTester(
      () => {
        expectDeepEqual(
          [['asdf', 1.09], [null, true], undefined],
          [['asdf', 2.01], [null, true], 0],
          {floatTolerance: 0.1});
      },
      `['0'].['1']: Expected 2.01, got 1.09 (tolerance = 0.1)\n` +
        `['2']: Type mismatch or no checker defined: expected 0, got undefined`);
  });

  test('object equal', async () => {
    const o1 = {a: 1.01, b: true, c: null, d: 'asdf'};
    const o2 = {a: 1.09, b: true, c: null, d: 'asdf'};
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      });
  });

  test('object non-equal', async () => {
    const o1 = {a: 1.01, b: false, c: null, d: 'asdf'};
    const o2 = {a: 2.01, b: true, c: true, d: 'fdsa'};
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      },
      `['a']: Expected 2.01, got 1.01 (tolerance = 0.1)\n` +
        `['b']: Expected true, got false\n` +
        `['c']: Type mismatch or no checker defined: expected true, got null\n` +
        `['d']: Expected fdsa, got asdf`);
  });

  test('object nested equal', async () => {
    const o1 = {a: {a: 1.01, b: true, c: null}, d: 'asdf', f: [{a: 1.1}, {b: 2}]};
    const o2 = {a: {a: 1.09, b: true, c: null}, d: 'asdf', f: [{a: 1.1}, {b: 2}]};
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      });
  });

  test('object nested non-equal', async () => {
    const o1 = {a: {a: 1.01, b: true, c: null}, d: 'asdf', f: [{a: 1.1}, {b: 2}]};
    const o2 = {a: {a: 1.09, b: true, c: 1}, d: 'asdf', f: [{a: 1.1}, {b: 4}]};
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      },
      `['a'].['c']: Type mismatch or no checker defined: expected 1, got null\n` +
        `['f'].['1'].['b']: Expected 4, got 2`);
  });

  test('dataframe equal', async () => {
    const c1 = [true, false];
    const c2 = [1, 2];
    const c3 = ['asdf', 'fdsa'];
    const c4 = [1.01, 1.09];
    const c4a = [1.09, 1.01];
    const df1 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c1', c1),
      DG.Column.fromList('int', 'c2', c2),
      DG.Column.fromList('string', 'c3', c3),
      DG.Column.fromList('double', 'c4', c4),
    ]);
    const df2 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c1', c1),
      DG.Column.fromList('int', 'c2', c2),
      DG.Column.fromList('string', 'c3', c3),
      DG.Column.fromList('double', 'c4', c4a),
    ]);
    throwTester(
      () => {
        expectDeepEqual(df1, df2, {floatTolerance: 0.1});
      });
  });

  test('dataframe different row count', async () => {
    const df1 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c1', [true, true, true]),
    ]);
    const df2 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c1', [true, true]),
    ]);
    throwTester(
      () => {
        expectDeepEqual(df1, df2);
      }, `Dataframes has different row count: actual row count is 3 and expected row count is 2`);
  });

  test('dataframe column names different', async () => {
    const df1 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c1', [true, true]),
    ]);
    const df2 = DG.DataFrame.fromColumns([
      DG.Column.fromList('bool', 'c2', [true, true]),
    ]);
    throwTester(
      () => {
        expectDeepEqual(df1, df2);
      }, `Column c2 not found`);
  });

  test('complex nested structures equal', async () => {
    const c1 = [{a: 1, b: [1.1]}, {a: 2, b: [2.1]}];
    const df1 = DG.DataFrame.fromColumns([
      DG.Column.fromList('object', 'c1', [...c1]),
    ]);
    const df2 = DG.DataFrame.fromColumns([
      DG.Column.fromList('object', 'c1', [...c1]),
    ]);
    const o1 = {
      a: 1.01,
      b: df1,
    };
    const o2 = {
      a: 1.09,
      b: df2,
    };
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      });
  });

  test('complex nested structures non-equal', async () => {
    const c1 = [{a: 1, b: [1.1]}, {a: 2, b: [2.1]}];
    const c2 = [{a: 1, b: [2.1]}, {a: 2, b: [3.1]}];
    const df1 = DG.DataFrame.fromColumns([
      DG.Column.fromList('object', 'c1', [...c1]),
    ]);
    const df2 = DG.DataFrame.fromColumns([
      DG.Column.fromList('object', 'c1', [...c2]),
    ]);
    const o1 = {
      a: 1.01,
      b: df1,
    };
    const o2 = {
      a: 1.09,
      b: df2,
    };
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {floatTolerance: 0.1});
      },
      `['b'].['c1'].['0'].['b'].['0']: Expected 2.1, got 1.1 (tolerance = 0.1)\n` +
        `['b'].['c1'].['1'].['b'].['0']: Expected 3.1, got 2.1 (tolerance = 0.1)`);
  });

  test('custom checker', async () => {
    const o1 = {};
    const o2 = {};
    const predicate = () => true;
    const checker = () => {throw new Error('custom checker error');};
    throwTester(
      () => {
        expectDeepEqual(o1, o2, {checkersSeq: [{name: 'custom', predicate, checker}, ...defaulCheckersSeq]});
      },
      'custom checker error',
    );
  });
});
