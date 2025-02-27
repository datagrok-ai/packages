import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { _package } from '../package';

export let testSchema: DG.Schema;

export async function initTestStickyMeta() {
  let schemas: DG.Schema[] = await grok.dapi.stickyMeta.getSchemas();
  let schema: DG.Schema | undefined = schemas.filter((schema) => schema.name == 'Autotests').at(0);
  if (schema !== undefined) {
    // TODO: add migration if new fields were added
    testSchema = schema;
    return;
  }
  testSchema = await grok.dapi.stickyMeta.createSchema('Autotests', [{
      name: 'autotest', matchBy: 'semtype=autotest'
  }], [{
    name: 'tickets', type: DG.TYPE.STRING,  
  }, {
    name: 'ignore?', type: DG.TYPE.BOOL, 
  }, {
    name: 'ignoreReason', type: DG.TYPE.STRING,
  }, {
    name: 'lastResolved', type: DG.TYPE.DATE_TIME,
  }
  ]);
}