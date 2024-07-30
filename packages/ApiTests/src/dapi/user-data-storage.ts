import {category, expect, expectObject, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
// import * as DG from 'datagrok-api/dg';

category('Dapi: user data storage', () => {
  test('post and get value', async () => {
    const storageName = 'js-api-storage-name1';
    const key = 'postValueKey';
    const value = 'value';
    await grok.dapi.userDataStorage.postValue(storageName, key, value);
    expect(await grok.dapi.userDataStorage.getValue(storageName, key), value);
  }, {stressTest: true});

  test('post and get map', async () => {
    const storageName = 'js-api-storage-name2';
    const value = {'key': 'value'};
    await grok.dapi.userDataStorage.post(storageName, value);
    const receivedValue = await grok.dapi.userDataStorage.get(storageName);
    expect(JSON.stringify(receivedValue), JSON.stringify(value));
  }, {stressTest: true});

  test('put', async () => {
    const storageName = 'js-api-storage-name3';
    const value1 = {'key1': 'value1'};
    const value2 = {'key2': 'value2'};

    await grok.dapi.userDataStorage.post(storageName, value1);
    await grok.dapi.userDataStorage.post(storageName, value2);
    expectObject(await grok.dapi.userDataStorage.get(storageName), {'key1': 'value1', 'key2': 'value2'});
    await grok.dapi.userDataStorage.put(storageName, value2);
    const receivedValue = await grok.dapi.userDataStorage.get(storageName);
    expectObject(receivedValue, value2);
  }, {stressTest: true});

  test('delete', async () => {
    const storageName = 'js-api-storage-name4';
    const key = 'postValueKey';
    const value = 'value';

    await grok.dapi.userDataStorage.postValue(storageName, key, value);
    await grok.dapi.userDataStorage.remove(storageName, key);

    const receivedValue = await grok.dapi.userDataStorage.getValue(storageName, key);
    expect(receivedValue == undefined);
  }, {stressTest: true});
});
