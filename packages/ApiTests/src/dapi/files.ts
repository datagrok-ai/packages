import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, expect, expectTable, test} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';

category('Dapi: files', () => {
  const filePrefix = 'System:AppData/ApiTests/';
  const testTextFileName = 'js-api-testTextFile';
  const testTextFilePath = filePrefix + testTextFileName;

  before(async () => {
    await grok.dapi.files.writeAsText(testTextFilePath, 'testString');
  });

  test('exists', async () => {
    if (!await grok.dapi.files.exists(testTextFilePath))
      throw new Error('File doesn\'t exist');
  }, {stressTest: true});

  test('write/read text', async () => {
    const filePath = filePrefix + 'Dapi. files - write, read text.txt';
    const fileText = 'testString';

    try {
      await grok.dapi.files.writeAsText(filePath, fileText);
      if (fileText !== await grok.dapi.files.readAsText(filePath))
        throw new Error('Сontent is wrong');
    } finally {
      await grok.dapi.files.delete(filePath);
    }
  }, {stressTest: true});

  test('write/read blob', async () => {
    const filePath = filePrefix + 'Dapi. files - write, read blob.txt';
    const content = [0, 1, 2, 3];

    try {
      await grok.dapi.files.write(filePath, content);
      if (content.toString() !== (await grok.dapi.files.readAsBytes(filePath)).toString())
        throw new Error('Сontent is wrong');
    } finally {
      await grok.dapi.files.delete(filePath);
    }
  }, {stressTest: true});

  test('search', async () => {
    if ((await grok.dapi.files.list(filePrefix, false, testTextFileName)).length !== 1)
      throw new Error('Can\'t find the file');
  }, {stressTest: true});

  test('package files', async () => {
    const files = await _package.files.list('datasets', false, 'csv');
    expect(files.length > 0, true);
    files.every((f) => expect(f.extension, 'csv'));
  }, {stressTest: true});

  // test('move', async () => {
  //     let fileName = 'move.txt';
  //     let filePath = filePrefix + fileName;
  //     let newFilePrefix = 'texts';
  //
  //     await grok.dapi.files.writeAsText(filePath, 'testString');
  //     await grok.dapi.files.move([filePath], newFilePrefix);
  //
  //     if(await grok.dapi.files.exists(filePath))
  //         throw "Old file exists";
  //
  //     if(!await grok.dapi.files.exists(filePrefix + newFilePrefix + '/' + fileName))
  //         throw "New file doesn't exist";
  //
  //     await grok.dapi.files.delete(filePath);
  // });

  test('delete', async () => {
    const filePath = filePrefix + 'Dapi. files - delete.txt';

    try {
      await grok.dapi.files.writeAsText(filePath, 'testString');
      await grok.dapi.files.delete(filePath);

      if (await grok.dapi.files.exists(filePath))
        throw new Error('File exists');
    } finally {
      if (await grok.dapi.files.exists(filePath))
        await grok.dapi.files.delete(filePath);
    }
  }, {stressTest: true});

  test('readBinaryDataFrames', async () => {
    const dfList = await _package.files.readBinaryDataFrames('datasets/country-languages.d42');
    expect(dfList.length, 1);
    expect(dfList[0] instanceof DG.DataFrame, true);
  }, {stressTest: true});

  test('writeBinaryDataFrames', async () => {
    const df = grok.data.demo.demog(10);
    const filePath = `${filePrefix}writeBinaryDataFrames.d42`;
    //@ts-ignore
    await _package.files.writeBinaryDataFrames(filePath, [df]);
    const dfList = await _package.files.readBinaryDataFrames(filePath);
    expect(dfList.length, 1, `Saved ${dfList.length} dataframes instead of 1`);
    expectTable(dfList[0], df, 'Saved dataframe has wrong data');
    await grok.dapi.files.delete(filePath);
  }, {skipReason: 'GROK-11670'});

  test('readAsText', async () => {
    const files = await _package.files.list('datasets', true, 'demog.csv');
    const res = await _package.files.readAsText(files[0]);
    expect(!!res);
  }, {stressTest: true});

  after(async () => {
    await grok.dapi.files.delete(testTextFilePath);
  });
});

category('Dapi: files: formats', () => {
  const extensions = ['csv', 'd42', 'json', 'tar', 'tar.gz', 'tsv', 'txt', 'xlsx', 'xml', 'zip', 'kmz', 'kml'];

  for (const ext of extensions) {
    test(ext, async () => {
      grok.data.files.openTable('System:AppData/ApiTests/datasets/formats/cars.' + ext).then((df) => {
        expect(df.rowCount, 10, 'wrong rows number');
        expect(df.columns.length, 10, 'wrong columns number');
      });
    }, ['kmz', 'kml'].includes(ext) ? {skipReason: 'GROK-13263'} : undefined);
  }
});
