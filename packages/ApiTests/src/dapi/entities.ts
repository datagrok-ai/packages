import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

//@ts-ignore
import {version} from '../../package.json';
import {after, before, category, expect, test} from '@datagrok-libraries/utils/src/test';

category('Dapi: entities', () => { 
  let group: DG.Group;

  before(async () => {
    group = DG.Group.create('js-api-test-group1');
    group = await grok.dapi.groups.save(group);
    const properties = {
     'myProp': 'value',
    };
    await group.setProperties(properties);
  });

  test('getProperties', async () => {
    const props = await group.getProperties();
    expect(typeof props === 'object', true);
    expect(Object.keys(props).length, 1);
  });

  test('setProperties', async () => {
    await group.setProperties({testProp1: 'prop1', testProp2: 'prop2'});
    expect(Object.keys(await group.getProperties()).length, 3);
  });

  after(async () => {
    await grok.dapi.groups.delete(group);
  });
});

category('Dapi: entities: smart search', () => {
  test('users', async () => {
    expect((await grok.dapi.users.filter('firstName = "admin"').list()).length, 1);
    expect((await grok.dapi.users.filter('status = "active"').list({pageSize: 5})).length, 5);
    expect((await grok.dapi.users.filter('id = "878c42b0-9a50-11e6-c537-6bf8e9ab02ee"').list()).length, 1);
  }, {stressTest: true});

  test('groups', async () => {
    expect((await grok.dapi.groups.filter('develop').list()).length, 1);
    expect((await grok.dapi.groups.filter('friendlyName = "all users"').list()).length, 1);
    expect((await grok.dapi.groups.filter('id = "1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5"').list()).length, 1);
  }, {stressTest: true});

  test('packages', async () => {
    expect((await grok.dapi.packages.filter('name="Api Tests" & author.login="system"').list({pageSize: 3})).length, 3);
    expect((await grok.dapi.packages.filter(`version = "${version}"`).list()).length > 0, true);
  }, {stressTest: true});
});
