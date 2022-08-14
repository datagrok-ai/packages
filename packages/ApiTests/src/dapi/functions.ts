import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {category, test, expect} from '@datagrok-libraries/utils/src/test';

const GDF = grok.dapi.functions;

category('Dapi: functions.calls', async () => {
  const xValue = 1.5;

  test('save', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();

    const savedFuncCall = await GDF.calls.save(funcCall);
    expect(savedFuncCall.inputs['x'], funcCall.inputs['x']);
  });

  test('list', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();

    await GDF.calls.save(funcCall);
    const loadedFuncCalls = await GDF.calls.filter(`func.id="${funcCall.func.id}"`).list();
    expect(loadedFuncCalls.some((loadedCall) => loadedCall.id === funcCall.id), true);
  });

  test('load', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();

    await GDF.calls.save(funcCall);
    const loadedFuncCall = await GDF.calls.find(funcCall.id);
    expect(loadedFuncCall.inputs['x'], xValue);
  });


  test('delete', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    expect((await GDF.calls.filter(`func.id="${funcCall.func.id}"`).list()).includes(funcCall), false);
    await GDF.calls.delete(funcCall);
    expect((await GDF.calls.filter(`func.id="${funcCall.func.id}"`).list()).includes(funcCall), false);
  });
});
