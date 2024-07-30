import {awaitCheck, category, expect, test} from "@datagrok-libraries/utils/src/test";
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

category('data sync', () => {
  test('grok connect streaming and data sync', async () => {
    const func: DG.Func = await grok.functions.eval('DbTests:PostgresqlTableWide');
    await func.prepare().call(false, undefined, {processed: false});
    await awaitCheck(() => grok.shell.tv?.table?.name === 'PostgresqlTableWide', 'Query first batch timeout', 30000);
    grok.shell.closeTable(grok.shell.tv!.table!);
    grok.shell.tv?.close();
  }, {stressTest: true});
});
