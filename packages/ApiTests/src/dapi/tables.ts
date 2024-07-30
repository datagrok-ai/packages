import {category, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

category('Dapi: tables', () => {
  test('create and upload table', async () => {
    const df = DG.DataFrame.fromColumns([DG.Column.fromStrings('col', ['1', '2', '3'])]);
    df.name = 'dataframe';
    const id = await grok.dapi.tables.uploadDataFrame(df);
    await grok.dapi.tables.getTable(id);
  }, {stressTest: true});
});
