import { before, category, expect, test } from '@datagrok-libraries/utils/src/test';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
// import * as DG from 'datagrok-api/dg';

category('Dapi: layouts', () => {

  test('get applicable', async () => {
    const layouts = await grok.dapi.layouts.getApplicable(grok.data.demo.demog(10));
    expect(layouts.length >= 0, true, 'error in Dapi: layouts - get applicable');
  }, { stressTest: true, owner: 'aparamonov@datagrok.ai' });

  test('filter', async () => {
    const layout = (await grok.dapi.layouts.getApplicable(grok.data.demo.demog(10)))[0];
    const layouts = (await grok.dapi.layouts.filter(`friendlyName = "${layout.friendlyName}"`).list());
    expect(layouts.length >= 0, true);
  }, { owner: 'aparamonov@datagrok.ai' });

  test('viewLayout', async () => {
    DG.ViewLayout
  })
});
