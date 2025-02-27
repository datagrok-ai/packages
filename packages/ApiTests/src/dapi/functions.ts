import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {category, test, expect, expectTable} from '@datagrok-libraries/utils/src/test';

category('Dapi: functions calls', async () => {
  const xValue = 1.5;

  test('clone DFs', async () => {
    const funcWithDf: DG.Func = await grok.functions.eval('ApiTests:dummyDataFrameFunction');
    const funcCall = await funcWithDf.prepare({'table': grok.data.demo.demog(30)}).call();
    const clonedFunccall = funcCall.clone();
    expectTable(funcCall.inputs['table'], clonedFunccall.inputs['table'].dataFrame);
    expectTable(funcCall.outputs['tableOut'], clonedFunccall.outputs['tableOut'].dataFrame);
  });

  test('save', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    const savedFuncCall = await grok.dapi.functions.calls.save(funcCall);
    expect(savedFuncCall.inputs['x'], funcCall.inputs['x']);
  }, {stressTest: true});

  test('save & get author', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    const savedFuncCall = await grok.dapi.functions.calls.include('session.user').save(funcCall);
    expect(savedFuncCall.author, grok.shell.user);
  }, {skipReason: 'GROK-15119'});

  test('save with DF', async () => {
    const funcWithDf: DG.Func = await grok.functions.eval('ApiTests:dummyDataFrameFunction');
    const inputTable: DG.DataFrame = grok.data.demo.demog(30);
    await grok.dapi.tables.uploadDataFrame(inputTable); // save input df before calling function

    const funcCall = await funcWithDf.prepare({'table': inputTable}).call();
    await grok.dapi.tables.uploadDataFrame(funcCall.outputs['tableOut']); // save output df separately

    const savedFuncCall = await grok.dapi.functions.calls.save(funcCall); // save call after that
    const loadedFuncCall = await grok.dapi.functions.calls.find(savedFuncCall.id);

    const loadedInputTableId = loadedFuncCall.inputs['table'];
    const loadedOutputTableId = loadedFuncCall.outputs['tableOut'];

    expectTable(funcCall.inputs['table'], await grok.dapi.tables.getTable(loadedInputTableId));
    expectTable(funcCall.outputs['tableOut'], await grok.dapi.tables.getTable(loadedOutputTableId));
  }, {stressTest: true});

  test('save with fileInfo', async () => {
    const func = await grok.functions.eval('ApiTests:FileFuncTest');
    const fileInfo = DG.FileInfo.fromString('test', 'Hello world!');
    await grok.dapi.files.write(fileInfo); // save fileInfo data, id will be added to fileInfo
    let funcCall = await func.prepare({'test': fileInfo});
    funcCall = await grok.dapi.functions.calls.save(funcCall);

    const savedCall = await grok.dapi.functions.calls.find(funcCall.id);
    const savedParam = savedCall.inputParams['test'];
    expect(savedParam.property.propertyType, DG.TYPE.FILE);
    expect(savedParam.value /* id of fileInfo */, fileInfo.id /* id is added during grok.dapi.files.write */);
    expect(await grok.dapi.files.readAsText(savedParam.value)/* read by id */, 'Hello world!');
  }, {stressTest: true});

  test('save options', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    funcCall.options['testName'] = 'testValue';
    const savedFuncCall = await grok.dapi.functions.calls.save(funcCall);
    expect(savedFuncCall.options['testName'], 'testValue');
  }, {stressTest: true});

  test('load package function call', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    // expect no-throw
    await grok.dapi.functions.calls.find(funcCall.id);
  });

  test('load script call', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    // expect no-throw
    await grok.dapi.functions.calls.find(funcCall.id);
  });

  test('load script call author', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall = await grok.dapi.functions.calls.include('session.user').find(funcCall.id);
    expect(loadedCall.author.id, grok.shell.user.id);
  });

  test('load package function author', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall = await grok.dapi.functions.calls.include('session.user').find(funcCall.id);
    expect(loadedCall.author.id, grok.shell.user.id);
  });

  test('load package function with func and package', async () => {
    const packFunc = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedCall = await grok.dapi.functions.calls.include('func.package').find(funcCall.id);
    expect(loadedCall.func.package.name, 'ApiTests');
  });

  test('load script with func and package', async () => {
    const packFunc = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedCall = await grok.dapi.functions.calls.include('func.package').find(funcCall.id);
    expect(loadedCall.func.package.name, 'ApiTests');
  });

  test('load script call inputs & outputs', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall = await grok.dapi.functions.calls.find(funcCall.id);
    expect(loadedCall.inputs['a'], 1);
    expect(loadedCall.inputs['b'], 2);
    expect(loadedCall.outputs['c'], 3);
  });

  test('load package function call inputs & outputs', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall = await grok.dapi.functions.calls.find(funcCall.id);
    expect(loadedCall.inputs['a'], 1);
    expect(loadedCall.inputs['b'], 2);
    expect(loadedCall.outputs['c'], 3);
  });

  test('load package funccall with func\'s valid nqName', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedWithFunc = await grok.dapi.functions.calls.include('func').find(funcCall.id);

    expect(loadedWithFunc.func.nqName, 'ApiTests:dummyPackageFunction');
  });

  test('load script funccall with func\'s valid nqName', async () => {
    const scriptFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await scriptFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedWithFunc = await grok.dapi.functions.calls.include('func').find(funcCall.id);

    expect(loadedWithFunc.func.nqName, 'ApiTests:DummyPackageScript');
  });

  test('list package funccall with func\'s valid nqName', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedWithFuncs = await grok.dapi.functions.calls
      .filter(`func.name="dummyPackageFunction"`)
      .include('func')
      .list({pageSize: 10});

    expect(loadedWithFuncs[0].func.nqName, 'ApiTests:dummyPackageFunction');
  });

  test('list script funccall with func\'s valid nqName', async () => {
    const scriptFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await scriptFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedWithFuncs = await grok.dapi.functions.calls
      .filter(`func.name="dummyPackageScript"`)
      .include('func')
      .list({pageSize: 10});

    expect(loadedWithFuncs[0].func.nqName, 'ApiTests:DummyPackageScript');
  });

  test('list', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedFuncCalls = await grok.dapi.functions.calls.filter(`id="${funcCall.id}"`).list({pageSize: 5});
    expect(loadedFuncCalls.some((loadedCall) => loadedCall.id === funcCall.id), true);
  });

  test('list script calls with author', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCalls =
      await grok.dapi.functions.calls.filter(`id = "${funcCall.id}" and session.user.id="${grok.shell.user.id}"`).include('session.user').first();
    expect(loadedCalls.author.id, grok.shell.user.id);
  });

  test('list package function with params script', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall =
      await grok.dapi.functions.calls.filter(`id = "${funcCall.id}" and session.user.id="${grok.shell.user.id}" and func.name="dummyPackageScript"`).include('session.user, func.params').first();
    expect(loadedCall.func.inputs[0].name, 'a');
  });

  test('list package functions with author', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCalls =
      await grok.dapi.functions.calls.filter(`id = "${funcCall.id}" and session.user.id="${grok.shell.user.id}"`).include('session.user').first();
    expect(loadedCalls.author.id, grok.shell.user.id);
  });

  test('list package function with params func', async () => {
    const packFunc: DG.Func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const funcCall = await packFunc.prepare({a: 1, b: 2}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);

    const loadedCall =
      await grok.dapi.functions.calls.filter(`id = "${funcCall.id}" and session.user.id="${grok.shell.user.id}"`).include('session.user, func.params').first();
    expect(loadedCall.func.inputs[0].name, 'a');
  });

  test('list package script funccalls with package', async () => {
    const loadedCalls = await grok.dapi.functions.calls
      .allPackageVersions()
      .include('func,func.package').filter(`func.name="dummyPackageScript"`).list({pageSize: 5});

    expect(loadedCalls[0].func.package.toString().includes('ApiTests'), true);
  });

  test('list package function funccalls with package', async () => {
    const loadedCalls = await grok.dapi.functions.calls
      .allPackageVersions()
      .include('func,func.package').filter(`func.name="dummyPackageFunction"`).list({pageSize: 5});

    expect(loadedCalls[0].func.package.toString().includes('ApiTests'), true);
  });

  test('filter script funcCalls by nqName', async () => {
    // expect no-throw
    await grok.dapi.functions.calls
      .allPackageVersions()
      .include('func,func.package').filter(`func.nqName="ApiTests:dummyPackageScript"`).list({pageSize: 5});
  }, {skipReason: 'GROK-16229'});

  test('filter package function funcCalls by nqName', async () => {
    // expect no-throw
    await grok.dapi.functions.calls
      .allPackageVersions()
      .include('func,func.package').filter(`func.nqName="ApiTests:dummyPackageFunction"`).list({pageSize: 5});
  }, {skipReason: 'GROK-16229'});

  test('find', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedFuncCall = await grok.dapi.functions.calls.find(funcCall.id);
    expect(loadedFuncCall.inputs['x'], xValue);
  });

  test('find options', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    funcCall.options['testName'] = 'testValue';
    await grok.dapi.functions.calls.save(funcCall);
    const loadedFuncCall = await grok.dapi.functions.calls.include('options').find(funcCall.id);
    expect(loadedFuncCall.options['testName'], 'testValue');
  });

  test('find func with params', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    const loadedFuncCall = await grok.dapi.functions.calls.include('func.params').find(funcCall.id);
    expect(loadedFuncCall.func.inputs[0].name, 'x');
  });

  test('delete', async () => {
    const func: DG.Func = await grok.functions.eval('Sin');
    const funcCall = await func.prepare({x: xValue}).call();
    funcCall.newId();
    await grok.dapi.functions.calls.save(funcCall);
    expect(await grok.dapi.functions.calls.find(funcCall.id) !== undefined, true, 'funcCall was not saved');
    await grok.dapi.functions.calls.delete(funcCall);
    expect(await grok.dapi.functions.calls.find(funcCall.id) === undefined, true, 'funcCall was not deleted');
  });
}, {owner: 'aparamonov@datagrok.ai'});

category('Dapi: functions', async () => {
  test('Load package function with package', async () => {
    const func = await grok.functions.eval('ApiTests:dummyPackageFunction');
    const loadedFunc = await grok.dapi.functions.include('package').find(func!.id);

    expect(loadedFunc.package.name, 'ApiTests');
  });

  test('Load script function with package', async () => {
    const func = await grok.functions.eval('ApiTests:dummyPackageScript');
    const loadedFunc = await grok.dapi.functions.include('package').find(func!.id);

    expect(loadedFunc.package.name, 'ApiTests');
  });

  test('Filter functions by nqName (script)', async () => {
    const loadedFuncCalls = await grok.dapi.functions.filter(`nqName="ApiTests:dummyPackageFunction"`).list({pageSize: 5});
    expect(loadedFuncCalls.length, 1);
  }, {skipReason: 'GROK-15175'});

  test('Filter functions by nqName (package function)', async () => {
    const loadedFuncCalls = await grok.dapi.functions.filter(`nqName="ApiTests:dummyPackageScript"`).list({pageSize: 5});
    expect(loadedFuncCalls.length, 1);
  }, {skipReason: 'GROK-15175'});

  test('Call query', async () => {
    const queryList: DG.DataQuery[] = await grok.dapi.queries.filter('name = "dummyPackageQuery" and package.name = "ApiTests"').list();
    expect(queryList.length, 1);
    const query: DG.DataQuery = queryList[0];
    expect(query.inputs.length, 1);
    const call = query.prepare({'x': 0.5});
    const res = (await call.call()).getOutputParamValue();
    expect(res.get('res', 0), 0.5);
  });

  test('save with NaN', async () => {
    const func = await grok.functions.eval('ApiTests:TestNaNOutput');
    const fc = func.prepare({a: 1});
    fc.newId();
    await fc.call();
    await grok.dapi.functions.calls.allPackageVersions().save(fc);
    await grok.dapi.functions.calls.allPackageVersions()
      .include('session.user,func.package, inputs, outputs').find(fc.id);
  });
}, {owner: 'aparamonov@datagrok.ai'});
