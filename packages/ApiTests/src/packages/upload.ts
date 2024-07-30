import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {before, category, expect, test, expectTable} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';

category('Packages', () => {

  let data: Uint8Array;
  let key: string;
  let query: DG.DataQuery;

  let test1: string;
  let test2: string;

  before(async () => {
    data = await _package.files.readAsBytes('package/package.zip');
    test1 = await _package.files.readAsText('package/test1.csv');
    test2 = await _package.files.readAsText('package/test2.csv');
    test1 = test1.replaceAll('${login}', grok.shell.user.login);
    const response = await fetch(`${grok.dapi.root}/users/current/dev_key?getNew=false`,
      {method: 'GET', credentials: 'include'});
    key = await response.json();
    query = await grok.functions.eval('DBTests:PackageTest');
  });

  async function publish(debug: boolean) {
    const uploadResponse = await fetch(`${grok.dapi.root}/packages/dev/${key}/test?debug=${debug}&rebuild=false`,
      {method: 'POST', body: data});
    expect(uploadResponse.status, 200);
  }

  test('Upload', async () => {
    const packages = await (await fetch(`${grok.dapi.root}/packages?text=shortName%2B%253D%2B%2522Test%2522`,
      {method: 'GET', credentials: 'include'})).json();
    for (const p of packages)
      await fetch(`${grok.dapi.root}/packages/${p.id}`, {method: 'DELETE', credentials: 'include'});
    await publish(false);
    await publish(true);
    expectTable(await query.apply(), DG.DataFrame.fromCsv(test1));
    expect((await grok.dapi.scripts.filter('package.name = "Test"').list()).length, 1);
    expect((await grok.dapi.scripts.filter('package.name = "Test"').allPackageVersions().list()).length, 2);
    for (let i = 0; i < 2; i++) {
      await publish(false);
      expectTable(await query.apply(), DG.DataFrame.fromCsv(test2));
      expect((await grok.dapi.scripts.filter('package.name = "Test"').allPackageVersions().list()).length, 1);
    }
  }, {stressTest: true});
});
