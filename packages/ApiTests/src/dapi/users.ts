import {category, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
// import * as DG from 'datagrok-api/dg';

category('Dapi: users', () => {
  test('current', async () => {
    await grok.dapi.users.current();
  }, {stressTest: true});

  test('current session', async () => {
    await grok.dapi.users.currentSession();
  }, {stressTest: true});
});
