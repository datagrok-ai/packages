import {category, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';


category('Dapi: fetch', () => {
  test('post', async () => {
    const url = 'https://jsonplaceholder.typicode.com/posts';
    const data = {name: 'username', password: 'password'};

    const res = await grok.dapi.fetchProxy(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    });

    if (!res.ok)
      throw new Error('Post failed');
  }, {stressTest: true});

  test('get', async () => {
    const url = 'https://dev.datagrok.ai/demo/demog.csv';

    const res = await grok.dapi.fetchProxy(url);
    const resText = await res.text();

    if (resText.length == 0)
      throw new Error('Response text is empty');

    DG.DataFrame.fromCsv(resText);
  }, {stressTest: true});
});
