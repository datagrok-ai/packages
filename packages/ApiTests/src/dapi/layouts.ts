import {category, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
// import * as DG from 'datagrok-api/dg';

category('Dapi: layouts', () => {
  test('get applicable', async () => {
    grok.dapi.layouts.getApplicable(grok.data.demo.demog(10))
      .then((res) => expect(res.length >= 0, true, 'error in Dapi: layouts - get applicable'));
  }, {stressTest: true});
});
