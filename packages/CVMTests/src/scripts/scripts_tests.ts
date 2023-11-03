import * as grok from 'datagrok-api/grok';
import {
  category,
  test,
  expect,
  expectObject,
  expectTable,
  before,
  after,
} from '@datagrok-libraries/utils/src/test';
import dayjs from 'dayjs';
import {DataFrame, toDart} from 'datagrok-api/dg';

const langs = ['Python', 'R', 'Julia', 'NodeJS', 'Octave', 'Grok', 'JavaScript'];

const TEST_DATAFRAME_1 = grok.data.demo.demog(10000);
const TEST_DATAFRAME_2 = DataFrame.fromCsv('x,y\n1,2\n3,4\n5,6');

for (const lang of langs) {
  category(`Scripts: ${lang} scripts`, () => {
    test('int, double, bool, string input/output', async () => {
      const int = 2;
      const double = 0.3;
      const bool = true;
      const str = 'Datagrok';
      const result = await grok.functions.call(`CVMTests:${lang}Simple`,
        {'integer_input': int, 'double_input': double, 'bool_input': bool, 'string_input': str});
      expectObject(result, {'integer_output': int, 'double_output': double,
        'bool_output': bool, 'string_output': str});
    });

    test('Datetime input/output', async () => {
      const currentTime = dayjs();
      const result = await grok.functions.call(`CVMTests:${lang}Date`,
        {'input_datetime': currentTime});
      if (lang == 'Octave')
        expect(currentTime.add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'), result.format('YYYY-MM-DDTHH:mm:ss'));
      else
        expect(result.valueOf(), currentTime.add(1, 'day').valueOf());
    });

    test('Dataframe input/output', async () => {
      const df = DataFrame.fromCsv(`id,date,name\nid1,${Date.now()},datagrok`);
      const result = await grok.functions.call(`CVMTests:${lang}Dataframe`,
        {'df': df, 'dfNumerical': df, 'dfCategorical': df});
      expectTable(result['resultDf'], df);
      expectTable(result['resultNumerical'], df);
      expectTable(result['resultCategorical'], df);
    });

    test(`Dataframe performance test 15 consequently`, async () => {
      const results = [];
      for (let i = 0; i < 15; i++) {
        results.push(await getScriptTime(`CVMTests:${lang}SingleDf`,
          {'df': TEST_DATAFRAME_1}));
      }
      const sum = results.reduce((p, c) => p + c, 0);
      return toDart({'Average time': sum / results.length,
        'Min time': Math.min(...results), 'Max time': Math.max(...results)});
    }, {timeout: 120000, skipReason: ['Octave', 'NodeJS', 'Julia'].includes(lang) ? 'GROK-13876' : undefined});

    test('Dataframe performance test 15 parallel', async () => {
      const calls = [];
      for (let i = 0; i < 15; i++) {
        calls.push(getScriptTime(`CVMTests:${lang}SingleDf`,
          {'df': TEST_DATAFRAME_1}));
      }
      const results = await Promise.all(calls);
      const sum = results.reduce((p, c) => p + c, 0);
      return toDart({'Average time': sum / results.length,
        'Min time': Math.min(...results), 'Max time': Math.max(...results)});
    }, {timeout: 120000, skipReason: ['Octave', 'NodeJS', 'Julia'].includes(lang) ? 'GROK-13876' : undefined});

    test('Map type input/output', async () => {
      const result = await grok.functions.call(`CVMTests:${lang}Map`,
        {'input_map': {'hello': 'world'}, 'unique_key': 'my_key'});
      expectObject(result, {'hello': 'world', 'my_key': 'Datagrok'});
    }, {skipReason: lang === 'R' || lang === 'Grok' ? 'GROK-12452' : undefined});

    if (!['NodeJS', 'JavaScript', 'Grok'].includes(lang)) {
      test('Graphics output, Column input', async () => {
        const result = await grok.functions.call(`CVMTests:${lang}Graphics`,
          {'df': TEST_DATAFRAME_2, 'xName': 'x', 'yName': 'y'});
        expect(!result || result.length === 0, false);
      });
    }

    test('Column list', async () => {
      const df = DataFrame.fromCsv(`id,date,name\nid1,${Date.now()},datagrok`);
      const result = await grok.functions.call(`CVMTests:${lang}ColumnList`,
        {'df': df, 'cols': ['id', 'date', 'name']});
      df.columns.remove('id');
      expectTable(result, df);
    });

    test('Calculated column test', async () => {
      const df = DataFrame.fromCsv('x,y\n1,2\n3,4\n5,6');
      const column = await df.columns.addNewCalculated('new', `CVMTests:${lang}CalcColumn(\${x} + \${y})`);
      expect(df.columns.contains(column.name), true);
      expect(column.get(0), 6);
    });

    test('Calculated column performance', async () => {
      const df = grok.data.demo.demog(10000);
      const start = Date.now();
      await df.columns.addNewCalculated('new', `CVMTests:${lang}CalcColumn(\${age})`);
      return `Execution time: ${Date.now() - start}`;
    }, {timeout: 120000});

    test('File input', async () => {
      const files = await grok.dapi.files.list('System:AppData/CvmTests/', false, 'cars.csv');
      const result = await grok.functions.call(`CVMTests:${lang}LinesCount`,
        {'file': files[0], 'header': true, 'separator': ',', 'dec': '.'});
      const expected = ['Python', 'Octave'].includes(lang) ? 31 : 30;
      expect(result, expected);
    });

    test('Escaping', async () => {
      const testStrings = ['\t\n\t\tsdfdsf\t', ' sdfds \\\'\"""', ' \n ', '\'\""\'', '\n and \\n',
        String.raw`CO\C1=C(C(=C(C=C1)/C=N\N=C(N)N)Cl)OC`, '"', '\'', '\n', '\t', '\\', '\\n', '\\r', '\\t'];
      for (let i = 0; i < testStrings.length; i++) {
        const result = await grok.functions.call(`CVMTests:${lang}Echo`,
          {'string_input': testStrings[i]});
        expect(testStrings[i], result);
      }
    }, {skipReason: 'GROK-14156'});

    if (lang === 'Python') {
      test('Environment string', async () => {
        const result = await grok.functions.call('CVMTests:PythonAnchorsCount',
          {'html': '  <ul>\n' +
                            '      <li><a href="https://example.com">Website</a></li>\n' +
                            '  <li><a href="mailto:m.bluth@example.com">Email</a></li>\n' +
                            '  <li><a href="tel:+123456789">Phone</a></li>\n' +
                            '  </ul>'});
        expect(result, 3);
      }, {timeout: 120000});

      test('File type input and environment yaml', async () => {
        const files = await grok.dapi.files.list('System:AppData/CvmTests/images', false, 'silver.jpg');
        const result = await grok.functions.call('CVMTests:ImagePixelCount',
          {'fileInput': files[0]});
        expect(49090022, result);
      }, {timeout: 120000});
    }
  });
}

category('Scripts: Client cache test', () => {
  before(async () => {
    await grok.functions.clientCache.start();
  });

  test('Scalars: correctness of serialization', async () => {
    await grok.functions.clientCache.clear();
    const int = Math.floor(Math.random() * (10 - 1 + 1)) + 1;
    const double = Math.random();
    const bool = double > 0.5;
    const str = `Datagrok${int}`;
    expect(await grok.functions.clientCache.getRecordCount(), 0);
    const result1 = await grok.functions.call(`CVMTests:PythonSimpleCached`,
      {'integer_input': int, 'double_input': double, 'bool_input': bool, 'string_input': str});
    expect(await grok.functions.clientCache.getRecordCount(), 1); //Added to cache
    const result2 = await grok.functions.call(`CVMTests:PythonSimpleCached`,
      {'integer_input': int, 'double_input': double, 'bool_input': bool, 'string_input': str});
    expectObject(result1, result2);
  });

  test('Dataframe, graphic output cache', async () => {
    await grok.functions.clientCache.clear();
    expect(await grok.functions.clientCache.getRecordCount(), 0);
    const result1 = await grok.functions.call(`CVMTests:PythonDataframeGraphicsCached`,
      {'df': TEST_DATAFRAME_2});
    expect(await grok.functions.clientCache.getRecordCount(), 1);
    const result2 = await grok.functions.call(`CVMTests:PythonDataframeGraphicsCached`,
      {'df': TEST_DATAFRAME_2});
    expectTable(result1['resultDf'], result2['resultDf']);
    expect(result1['scatter'], result2['scatter']);
  });

  test(`Dataframe performance test 15 consequently cached`, async () => {
    await grok.functions.clientCache.clear();
    await grok.functions.call('CVMTests:PythonSingleDfCached',
      {'df': TEST_DATAFRAME_1});// adds to cache
    expect(await grok.functions.clientCache.getRecordCount(), 1);
    const results = [];
    for (let i = 0; i < 15; i++) {
      results.push(await getScriptTime(`CVMTests:PythonSingleDfCached`,
        {'df': TEST_DATAFRAME_1}));
    }
    const sum = results.reduce((p, c) => p + c, 0);
    return toDart({'Average time': sum / results.length,
      'Min time': Math.min(...results), 'Max time': Math.max(...results)});
  }, {timeout: 120000});

  test('Exceptions: shouldn\'t be cached', async () => {
    await grok.functions.clientCache.clear();
    try {
      await grok.functions.call('CVMTests:PythonException',
        {'df': TEST_DATAFRAME_1});
    } catch (e) {}
    expect(await grok.functions.clientCache.getRecordCount(), 0);
  });

  after(async () => await grok.functions.clientCache.clear());
});

export async function getScriptTime(name: string, params: object = {}): Promise<number> {
  const start = Date.now();
  await grok.functions.call(name, params);
  return Date.now() - start;
}
