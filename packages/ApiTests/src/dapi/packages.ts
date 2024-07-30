import {category, expect, test, expectExceptionAsync} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
// import * as DG from 'datagrok-api/dg';
import {_package} from '../package-test';

category('Dapi: packages', () => {
  test('list', async () => {
    const list = (await grok.dapi.packages.list());
    expect(list.some((pack) => pack.name === 'ApiTests'), true);
  }, {stressTest: true});

  test('find', async () => {
    const apiTestsPackage = await grok.dapi.packages.find(_package.id);
    expect(apiTestsPackage.updatedOn?.toString(), _package.updatedOn?.toString());
    await expectExceptionAsync(() => grok.dapi.packages.find('00000').then());
  }, {stressTest: true});

  test('webRoot content', async () => {
    const apiTestsPackage = await grok.dapi.packages.find(_package.id);
    expect(apiTestsPackage.webRoot, _package.webRoot);
  }, {skipReason: 'GROK-11670'});

  test('readCsv error', async () => {
    await expectExceptionAsync(() => _package.files.readCsv('datasets/noFile.csv').then());
  }, {skipReason: 'GROK-13716'});
});
