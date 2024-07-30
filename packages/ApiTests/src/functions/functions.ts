import './date-functions';
import './math-functions';
import './text-functions';
import './logical-functions';
import './conversion-functions';
import './stats-functions';
import {category, test, expect, expectExceptionAsync} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

category('Functions: General', () => {
  test('eval', async () => {
    const dfList: DG.DataFrame[] = await grok.functions
      .eval('OpenServerFile("System:AppData/ApiTests/datasets/demog.csv")');
    expect(dfList[0].columns instanceof DG.ColumnList, true);
  }, {stressTest: true});

  test('call', async () => {
    const dfList: DG.DataFrame[] = await grok.functions
      .call('OpenServerFile', {'fullPath': 'System:AppData/ApiTests/datasets/demog.csv'});
    expect(dfList[0].columns instanceof DG.ColumnList, true);
  });
  
  test('def param', async () => {
    await grok.functions.call('AddNewColumn', {table: grok.data.demo.demog(), expression: 'test', name: 'test'});
  });

  // GROK-13478
  test('call params', async () => {
    expect(await grok.functions.call('sin', {y: 0.5}), null, '{y: 0.5}');
    expect(await grok.functions.call('sin', {x: 0.5}), 0.479425538604203, '{x: 0.5}');
    expect(await grok.functions.call('sin', {X: 0.5}), 0.479425538604203, '{X: 0.5}');
    await expectExceptionAsync(() => grok.functions.call('qqqqqq'));
  });

  test('query params', async () => {
    // expect(await grok.data.query('ApiTests:dummyPackageQuery', {y: 0.5}), null, '{y: 0.5}');
    expect((await grok.data.query('ApiTests:dummyPackageQuery', {x: 0.5})).get('res', 0), 0.5, '{x: 0.5}');
    expect((await grok.data.query('ApiTests:dummyPackageQuery', {X: 0.5})).get('res', 0), 0.5, '{X: 0.5}');
    await expectExceptionAsync(() => grok.data.query('ApiTests:qqqqqq'));
  });

  test(`script's package load`, async () => {
    const sin: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    expect(sin.package.nqName, 'ApiTests');
  }, {skipReason: 'GROK-15178'});

  test(`package func's package load`, async () => {
    const sin: DG.Func = await grok.functions.eval('ApiTests:dummyDataFrameFunction');
    expect(sin.package.nqName, 'ApiTests');
  }, {skipReason: 'GROK-15178'});

  test(`core package load`, async () => {
    const sin: DG.Func = await grok.functions.eval('Sin');
    expect(sin.package.nqName, 'core');
  }, {skipReason: 'GROK-15178'});
});
