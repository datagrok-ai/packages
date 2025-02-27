import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
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

const languages = ['Python', 'R', 'Julia', 'NodeJS', 'Octave', 'Grok', 'JavaScript'];
const serverSideLanguages = ['Python', 'R', 'Julia', 'NodeJS', 'Octave'];

const TEST_DATAFRAME_1 = grok.data.demo.demog(10000);
const TEST_DATAFRAME_2 = DG.DataFrame.fromCsv('x,y\n1,2\n3,4\n5,6');

for (const lang of languages) {
  if (lang === 'Julia')
    continue;
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
    }, {stressTest: serverSideLanguages.includes(lang), timeout: 120000 /* long timeout for first test, because of kernel start */});

    test('Long string', async () => {
      const str = randomString(500000, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
      const int = 2;
      const double = 0.3;
      const bool = true;
      const result = await grok.functions.call(`CVMTests:${lang}Simple`,
        {'integer_input': int, 'double_input': double, 'bool_input': bool, 'string_input': str});
      expectObject(result, {'integer_output': int, 'double_output': double,
        'bool_output': bool, 'string_output': str});
    }, {timeout: 120000, stressTest: serverSideLanguages.includes(lang), skipReason: lang === 'Octave' || lang === 'Julia' ? 'Skip for later fix' : undefined});

    test('Datetime input/output', async () => {
      const currentTime = dayjs();
      const result = await grok.functions.call(`CVMTests:${lang}Date`,
        {'input_datetime': currentTime});
      if (lang === 'Octave' || lang === 'R')
        expect(currentTime.add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'), result.format('YYYY-MM-DDTHH:mm:ss'));
      else
        expect(result.valueOf(), currentTime.add(1, 'day').valueOf());
    }, {stressTest: serverSideLanguages.includes(lang)});

    test('Dataframe input/output', async () => {
      function getSample(): DG.DataFrame {
        return DG.DataFrame.fromCsv(`id,date,name\nid1,${Date.now()},datagrok`)
      }
      const sample1 = getSample();
      const sample2 = getSample();
      const sample3 = getSample();
      const result = await grok.functions.call(`CVMTests:${lang}Dataframe`,
        {'df': sample1, 'dfNumerical': sample2, 'dfCategorical': sample3});
      expectTable(result['resultDf'], sample1);
      expectTable(result['resultNumerical'], sample2);
      expectTable(result['resultCategorical'], sample3);
    }, {stressTest: serverSideLanguages.includes(lang), timeout: 90000});

    test('Map type input/output', async () => {
      const result = await grok.functions.call(`CVMTests:${lang}Map`,
        {'input_map': {'hello': 'world'}, 'unique_key': 'my_key'});
      expectObject(result, {'hello': 'world', 'my_key': 'Datagrok'});
    }, {skipReason: lang === 'R' || lang === 'Grok' ? 'GROK-12452' : undefined, stressTest: true});

    if (!['NodeJS', 'JavaScript', 'Grok'].includes(lang)) {
      test('Graphics output, Column input', async () => {
        const result = await grok.functions.call(`CVMTests:${lang}Graphics`,
          {'df': TEST_DATAFRAME_2, 'xName': 'x', 'yName': 'y'});
        expect(!result || result.length === 0, false);
      }, {stressTest: serverSideLanguages.includes(lang)});
    }
    if (!['NodeJS', 'JavaScript', 'Grok', 'Octave'].includes(lang)) {
      test('DataFrame int column correctness', async () => {
        const result = await grok.functions.call(`CVMTests:${lang}IntColumn`);
        if (lang !== 'R') {
          expect((result['resultInBound'] as DG.DataFrame).getCol('col1').type === DG.COLUMN_TYPE.INT, true);
          expect((result['resultOutBound'] as DG.DataFrame).getCol('col1').type === DG.COLUMN_TYPE.BIG_INT, true);
        }
        else {
          // R returns float columns. They can be easily converted to int
          expect((result['resultInBound'] as DG.DataFrame).getCol('col1').type === DG.COLUMN_TYPE.FLOAT, true);
          expect((result['resultOutBound'] as DG.DataFrame).getCol('col1').type === DG.COLUMN_TYPE.FLOAT, true);
        }
      }, {timeout: 60000});

      test('Empty dataframe', async () => {
        const result: DG.DataFrame = await grok.functions.call(`CVMTests:${lang}EmptyDataFrame`);
        expect(result.rowCount, 0);
      });
    }

    if (!['JavaScript', 'Grok'].includes(lang)) {
      test('File and blob input/output', async () => {
        const fileStringData = 'Hello world!';
        const fileBinaryData: Uint8Array = new TextEncoder().encode(fileStringData);
        const result = await grok.functions.call(`CVMTests:${lang}FileBlobInputOutput`,
            {'fileInput': DG.FileInfo.fromString('test.txt', fileStringData),
              'blobInput': DG.FileInfo.fromBytes('test.bin', fileBinaryData)});
        expect(isEqualBytes(fileBinaryData, (result['fileOutput'] as DG.FileInfo).data), true);
        expect(isEqualBytes(fileBinaryData, (result['blobOutput'] as DG.FileInfo).data), true);
      }, {stressTest: serverSideLanguages.includes(lang), timeout: 90000});
    }

    test('Column list', async () => {
      const df = DG.DataFrame.fromCsv(`id,date,name\nid1,${Date.now()},datagrok`);
      const result = await grok.functions.call(`CVMTests:${lang}ColumnList`,
        {'df': df, 'cols': ['id', 'date', 'name']});
      df.columns.remove('id');
      expectTable(result, df);
    }, {stressTest: serverSideLanguages.includes(lang)});

    test('Calculated column test', async () => {
      const df = DG.DataFrame.fromCsv('x,y\n1,2\n3,4\n5,6');
      const column = await df.columns.addNewCalculated('new', `CVMTests:${lang}CalcColumn(\${x} + \${y})`);
      expect(df.columns.contains(column.name), true);
      expect(column.get(0), 6);
    }, {stressTest: serverSideLanguages.includes(lang), skipReason: lang === 'Grok' ? 'Doesn\'t support vectorization' : undefined});

    test('File input', async () => {
      const files = await grok.dapi.files.list('System:AppData/CvmTests/', false, 'cars.csv');
      const result = await grok.functions.call(`CVMTests:${lang}LinesCount`,
        {'file': files[0], 'header': true, 'separator': ',', 'dec': '.'});
      const expected = ['Python', 'Octave'].includes(lang) ? 31 : 30;
      expect(result, expected);
    }, {stressTest: serverSideLanguages.includes(lang)});

    test('Escaping', async () => {
      const testStrings = ['\t\n\t\tsdfdsf\t', ' sdfds \\\'\"""', ' \n ', '\'\""\'', '\n and \\n',
        String.raw`CO\C1=C(C(=C(C=C1)/C=N\N=C(N)N)Cl)OC`, '"', '\'', '\n', '\t', '\\', '\\n', '\\r', '\\t'];
      for (let i = 0; i < testStrings.length; i++) {
        const result = await grok.functions.call(`CVMTests:${lang}Echo`,
          {'string_input': testStrings[i]});
        expect(testStrings[i], result);
      }
    });

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

  category(`Benchmarks: Scripts: ${lang} scripts`, () => {
    test('Calculated column performance', async () => {
      const rows = DG.Test.isInBenchmark ? 10000 : 100;
      const df = grok.data.demo.demog(rows);
      await df.columns.addNewCalculated('new', `CVMTests:${lang}CalcColumn(\${age})`);
    }, {timeout: 60000, benchmark: true, stressTest: serverSideLanguages.includes(lang), skipReason: lang === 'Grok' ? 'Doesn\'t support vectorization' : undefined});

    test(`Dataframe performance test sequentially`, async () => {
      const iterations = DG.Test.isInBenchmark ? ['JavaScript', 'Grok'].includes(lang) ? 500 : 10 : 3;
      const results = [];
      for (let i = 0; i < iterations; i++) {
        results.push(await getScriptTime(`CVMTests:${lang}SingleDf`,
          {'df': TEST_DATAFRAME_1}));
      }
      const sum = results.reduce((p, c) => p + c, 0);
      return DG.toDart({'Average time': sum / results.length,
        'Min time': Math.min(...results), 'Max time': Math.max(...results)});
    }, {timeout: 240000, benchmark: true, stressTest: serverSideLanguages.includes(lang)});

    test('Dataframe performance test parallel', async () => {
      const iterations = DG.Test.isInBenchmark ? lang === 'NodeJS' ? 5 : 10 : 3;
      const calls = [];

      for (let i = 0; i < iterations; i++)
        calls.push(getScriptTime(`CVMTests:${lang}SingleDf`, {'df': grok.data.demo.demog(10000)}));

      const results = await Promise.all(calls);
      const sum = results.reduce((p, c) => p + c, 0);
      return DG.toDart({'Average time': sum / results.length,
        'Min time': Math.min(...results), 'Max time': Math.max(...results)});
    }, {timeout: 180000, benchmark: true});
  });
}

category('Stdout', () => {
  test('Console printing', async () => {
    await grok.functions.call('CVMTests:OctaveStdout', {'df': grok.data.demo.demog(1000)});
  }, {timeout: 90000});
});

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
  }, {timeout: 60000});

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
    return DG.toDart({'Average time': sum / results.length,
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

function randomString(length: number, chars: string) {
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
  return result;
}

function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
  if (bytes1.length !== bytes2.length)
    return false;

  for (let i = 0; i < bytes1.length; i++)
    if (bytes1[i] !== bytes2[i])
      return false;

  return true;
}
