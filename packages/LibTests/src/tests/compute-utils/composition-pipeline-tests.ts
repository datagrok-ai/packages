import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {serialize, applyTransformations} from '@datagrok-libraries/utils/src/json-serialization';
import {category, test, before, delay} from '@datagrok-libraries/utils/src/test';
import {expectDeepEqual} from '@datagrok-libraries/utils/src/expect';
import {CompositionPipeline, PipelineCompositionConfiguration, PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import simpleConfData from '../snapshots/simple-conf-data.json';
import complexConfData from '../snapshots/complex-conf-data.json';
import twoConfsSimple from '../snapshots/2-confs-simple.json';
import threeConfsSimple from '../snapshots/3-confs-simple.json';
import threeConfsSimpleNested from '../snapshots/3-confs-simple-nested.json';
import twoConfs from '../snapshots/2-confs.json';
import threeConfs from '../snapshots/3-confs.json';
import threeConfsNested from '../snapshots/3-confs-nested.json';
import threeConfsRemove from '../snapshots/3-confs-remove-items.json';
import threeConfsRemoveNested from '../snapshots/3-confs-remove-nested-items.json';
import threeConfsAdd from '../snapshots/3-confs-add-items.json';
import threeConfsAddNested from '../snapshots/3-confs-add-nested-items.json';
import twoConfsSteps from '../snapshots/2-confs-steps.json';
import {removeObservables} from '../utils';

const IS_UPDATE = false;
const ADD_VIEW = false;

function pickPipelineConfData(obj: any): any {
  const res = {};
  Object.assign(res, ...['config', 'ioInfo', 'nodes', 'links', 'nestedPipelineConfig', 'hooks', 'steps'].map((key) => ({[key]: obj[key]})));
  return IS_UPDATE ? new Blob([serialize(removeObservables(res))], {type: 'application/json'}) : removeObservables(res);
}

category('ComputeUtils: CompositionPipeline single config', async () => {
  before(async () => {});

  test('Simple config', async () => {
    const config: PipelineConfiguration = {
      id: 'testPipeline',
      nqName: 'LibTests:MockWrapper',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:AddMock',
        },
        {
          id: 'step2',
          nqName: 'LibTests:MulMock',
        },
      ],
      links: [{
        id: 'link1',
        from: ['step1', 'a'],
        to: ['step2', 'a'],
      }],
    };
    const pipeline = new CompositionPipeline(config);
    const view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('simple-conf-data.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(simpleConfData));

  });

  test('Complex Config', async () => {
    const config: PipelineConfiguration = {
      id: 'testPipeline',
      nqName: 'LibTests:MockWrapper',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:AddMock',
          states: [{id: 'state11'}, {id: 'state12'}],
          actions: [{
            id: 'action1',
            friendlyName: 'action1',
            from: [['step1', 'state11'], ['step1', 'state12']],
            to: ['step2', 'state21'],
            handler: 'LibTests:MockHandler1',
            position: 'buttons',
          }],
        },
        {
          id: 'step2',
          nqName: 'LibTests:MulMock',
          states: [{id: 'state21'}, {id: 'state22'}],
          popups: [{
            id: 'popup1',
            friendlyName: 'popup1',
            nqName: 'LibTests:TestFn1',
            position: 'buttons',
          }],
        },
      ],
      hooks: {
        beforeFuncCallReady: [
          {
            id: 'hook1',
            handler: 'LibTests:MockHook1',
            from: ['step1', 'a'],
            to: ['step1', 'b'],
          },
        ],
      },
      states: [{id: 'state1'}, {id: 'state2'}],
      links: [
        {
          id: 'link1',
          from: ['step2', 'a'],
          to: ['step2', 'popup1', 'a'],
        },
        {
          id: 'link2',
          from: ['step2', 'b'],
          to: ['step2', 'popup1', 'b'],
        },
      ],
    };
    const pipeline = new CompositionPipeline(config);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('complex-conf-data.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(complexConfData));

  });
});

category('ComputeUtils: CompositionPipeline composition config', async () => {
  const sconfig1: PipelineConfiguration = {
    id: 'testPipeline1',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:AddMock',
      },
      {
        id: 'step2',
        nqName: 'LibTests:MulMock',
      },
    ],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],
  };
  const sconfig2: PipelineConfiguration = {
    id: 'testPipeline2',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestFn1',
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestFn2',
      },
    ],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],

  };

  const sconfig3: PipelineConfiguration = {
    id: 'testPipeline3',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestFn1',
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestFn2',
      },
    ],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],

  };

  const conf1: PipelineConfiguration = {
    id: 'testPipeline1',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestFn1',
        states: [{id: 'state11'}, {id: 'state12'}],
        actions: [{
          id: 'action1',
          friendlyName: 'action1',
          from: [['step1', 'a'], ['step1', 'b']],
          to: ['step2', 'b'],
          handler: 'LibTests:MockHandler1',
          position: 'buttons',
        }],
        popups: [{
          id: 'popup1',
          friendlyName: 'popup1',
          nqName: 'LibTests:MockPopup1',
          position: 'buttons',
          states: [{id: 'state111'}, {id: 'state112'}],
          actions: [{
            id: 'action11',
            friendlyName: 'action11',
            from: [['step1', 'popup1', 'a'], ['step1', 'popup1', 'b']],
            to: ['step2', 'b'],
            handler: 'LibTests:MockHandler1',
            position: 'buttons',
          }],
        }],
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestFn2',
      },
    ],
    states: [{id: 'state1'}, {id: 'state2'}],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],
    hooks: {
      beforeFuncCallReady: [
        {
          id: 'hook1',
          handler: 'LibTests:MockHook1',
          from: ['step2', 'a'],
          to: ['step2', 'b'],
        },
      ],
    },
  };

  const conf2: PipelineConfiguration = {
    id: 'testPipeline2',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestFn3',
        states: [{id: 'state11'}, {id: 'state12'}],
        actions: [{
          id: 'action1',
          friendlyName: 'action1',
          from: [['step1', 'a'], ['step1', 'b']],
          to: ['step2', 'b'],
          handler: 'LibTests:MockHandler1',
          position: 'buttons',
        }],
        popups: [{
          id: 'popup1',
          friendlyName: 'popup1',
          nqName: 'LibTests:MockPopup1',
          position: 'buttons',
          states: [{id: 'state111'}, {id: 'state112'}],
          actions: [{
            id: 'action11',
            friendlyName: 'action11',
            from: [['step1', 'popup1', 'a'], ['step1', 'popup1', 'b']],
            to: ['step2', 'b'],
            handler: 'LibTests:MockHandler1',
            position: 'buttons',
          }],
        }],
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestFn4',
      },
    ],
    states: [{id: 'state1'}, {id: 'state2'}],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],
    hooks: {
      beforeFuncCallReady: [
        {
          id: 'hook1',
          handler: 'LibTests:MockHook1',
          from: ['step2', 'a'],
          to: ['step2', 'b'],
        },
      ],
    },
  };

  const conf3: PipelineConfiguration = {
    id: 'testPipeline3',
    nqName: 'LibTests:MockWrapper',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestFn5',
        states: [{id: 'state11'}, {id: 'state12'}],
        actions: [{
          id: 'action1',
          friendlyName: 'action1',
          from: [['step1', 'a'], ['step1', 'b']],
          to: ['step2', 'b'],
          handler: 'LibTests:MockHandler1',
          position: 'buttons',
        }],
        popups: [{
          id: 'popup1',
          friendlyName: 'popup1',
          nqName: 'LibTests:MockPopup1',
          position: 'buttons',
          states: [{id: 'state111'}, {id: 'state112'}],
          actions: [{
            id: 'action11',
            friendlyName: 'action11',
            from: [['step1', 'popup1', 'a'], ['step1', 'popup1', 'b']],
            to: ['step2', 'b'],
            handler: 'LibTests:MockHandler1',
            position: 'buttons',
          }],
        }],
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestFn6',
      },
    ],
    states: [{id: 'state1'}, {id: 'state2'}],
    links: [{
      id: 'link1',
      from: ['step1', 'a'],
      to: ['step2', 'a'],
    }],
    hooks: {
      beforeFuncCallReady: [
        {
          id: 'hook1',
          handler: 'LibTests:MockHook1',
          from: ['step2', 'a'],
          to: ['step2', 'b'],
        },
      ],
    },
  };

  test('2 configs simple', async () => {
    const composedConfig = CompositionPipeline.compose(sconfig2, [sconfig1]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('2-confs-simple.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(twoConfsSimple));

  });

  test('3 configs simple configs', async () => {
    const composedConfig = CompositionPipeline.compose(sconfig3, [sconfig1, sconfig2]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-simple.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsSimple));

  });

  test('3 configs simple nested composition', async () => {
    const composedConfig = CompositionPipeline.compose(sconfig3, [CompositionPipeline.compose(sconfig2, [sconfig1])]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-simple-nested.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsSimpleNested));

  });

  test('2 configs', async () => {
    const composedConfig = CompositionPipeline.compose(conf2, [conf1]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('2-confs.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(twoConfs));

  });

  test('3 configs', async () => {
    const composedConfig = CompositionPipeline.compose(conf3, [conf1, conf2]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfs));

  });

  test('3 configs nested composition', async () => {
    const composedConfig = CompositionPipeline.compose(conf3, [CompositionPipeline.compose(conf2, [conf1])]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-nested.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsNested));

  });

  test('3 configs remove items', async () => {
    const cconf: PipelineCompositionConfiguration = {
      ...conf3,
      itemsToRemove: [
        ['testPipeline1', 'step1', 'popup1', 'action11'],
        ['testPipeline1', 'step2'],
        ['testPipeline2', 'step1', 'popup1'],
        ['testPipeline2', 'link1'],
      ],
    };
    const composedConfig = CompositionPipeline.compose(cconf, [conf1, conf2]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-remove-items.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsRemove));

  });

  test('3 configs nested remove items', async () => {
    const cconf: PipelineCompositionConfiguration = {
      ...conf3,
      itemsToRemove: [
        ['testPipeline2', 'testPipeline1', 'step1', 'popup1', 'action11'],
        ['testPipeline2', 'testPipeline1', 'step2'],
        ['testPipeline2', 'step1', 'popup1'],
        ['testPipeline2', 'link1'],
      ],
    };
    const composedConfig = CompositionPipeline.compose(cconf, [CompositionPipeline.compose(conf2, [conf1])]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-remove-nested-items.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsRemoveNested));

  });

  test('3 configs add items', async () => {
    const cconf: PipelineCompositionConfiguration = {
      ...conf3,
      actionsToAdd: [
        [{
          id: 'addedAction1',
          friendlyName: 'addedAction1',
          handler: 'LibTests:MockHandler2',
          position: 'buttons',
        }, ['step2']],
        [{
          id: 'addedAction2',
          friendlyName: 'addedAction2',
          handler: 'LibTests:MockHandler2',
          position: 'buttons',
        }, ['testPipeline2', 'step2', 'addedPopup1']],
      ],
      popupsToAdd: [
        [{
          id: 'addedPopup1',
          friendlyName: 'addedPopup1',
          nqName: 'LibTests:MockPopup2',
          position: 'buttons',
        }, ['testPipeline2', 'step2']],
      ],
    };
    const composedConfig = CompositionPipeline.compose(cconf, [conf1, conf2]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-add-items.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsAdd));

  });

  test('3 configs nested add items', async () => {
    const cconf3: PipelineCompositionConfiguration = {
      ...conf3,
      actionsToAdd: [
        [{
          id: 'addedAction1',
          friendlyName: 'addedAction1',
          handler: 'LibTests:MockHandler2',
          position: 'buttons',
        }, ['step2']],
        [{
          id: 'addedAction2',
          friendlyName: 'addedAction2',
          handler: 'LibTests:MockHandler2',
          position: 'buttons',
        }, ['testPipeline2', 'testPipeline1', 'step2', 'addedPopup1']],
      ],
    };
    const cconf2: PipelineCompositionConfiguration = {
      ...conf2,
      popupsToAdd: [
        [{
          id: 'addedPopup1',
          friendlyName: 'addedPopup2',
          nqName: 'LibTests:MockPopup2',
          position: 'buttons',
        }, ['testPipeline1', 'step2']],
      ],
    };
    const composedConfig = CompositionPipeline.compose(cconf3, [CompositionPipeline.compose(cconf2, [conf1])]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('3-confs-add-nested-items.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(threeConfsAddNested));

  });

  test('2 configs step config', async () => {
    const pconf: PipelineCompositionConfiguration = {
      ...sconfig2,
      nestedPipelinesConfig: {
        'testPipeline1': {
          insertBeforeStep: 'step2',
        },
      },
    };
    const composedConfig = CompositionPipeline.compose(pconf, [sconfig1]);
    const pipeline = new CompositionPipeline(composedConfig);
    const _view = pipeline.makePipelineView();
    if (ADD_VIEW)
      grok.shell.addView(_view);
    await pipeline.init();
    const actual = pickPipelineConfData(pipeline);
    if (IS_UPDATE)
      DG.Utils.download('2-confs-steps.json', actual);
    else
      expectDeepEqual(actual, applyTransformations(twoConfsSteps));

  });
});

category('ComputeUtils: CompositionPipeline reactivity', async () => {
  test('simple link', async () => {
    const pipeline = new CompositionPipeline({
      id: 'testPipeline',
      nqName: 'LibTests:TestWrapper1',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:AddMock',
        },
        {
          id: 'step2',
          nqName: 'LibTests:MulMock',
        },
      ],
      links: [{
        id: 'link1',
        from: ['step1', 'res'],
        to: ['step2', 'a'],
      }],
    });
    const view = pipeline.makePipelineView();
    await pipeline.init();
    const rfv1 = view.getStepView('testPipeline/step1');
    rfv1.setInput('a', 2);
    rfv1.setInput('b', 3);
    await delay(300);
    await rfv1.run();
    await delay(300);
    const rfv2 = view.getStepView('testPipeline/step2');
    rfv2.setInput('b', 4);
    await delay(300);
    await rfv2.run();
    await delay(300);
    const a = rfv2.getParamValue('a');
    const res = rfv2.getParamValue('res');
    expectDeepEqual(a, 5);
    expectDeepEqual(res, 20);
  });

  test('links to composed', async () => {
    const conf1: PipelineCompositionConfiguration = {
      id: 'testPipeline1',
      nqName: 'LibTests:TestWrapper2',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:AddMock',
        },
        {
          id: 'step2',
          nqName: 'LibTests:MulMock',
        },
      ],
      links: [{
        id: 'link1',
        from: ['step1', 'res'],
        to: ['step2', 'a'],
      }, {
        id: 'link2',
        from: ['step2', 'res'],
        to: ['testPipeline2', 'step1', 'a'],
      }],
    };
    const conf2 = {
      id: 'testPipeline2',
      nqName: 'LibTests:TestWrapper3',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:TestFn1',
        },
      ],
    };
    const pipeline = new CompositionPipeline(CompositionPipeline.compose(conf1, [conf2]));
    const view = pipeline.makePipelineView();
    await pipeline.init();

    const rfv1 = view.getStepView('testPipeline1/step1');
    rfv1.setInput('a', 1);
    rfv1.setInput('b', 2);
    await delay(300);
    await rfv1.run();
    await delay(300);

    const rfv2 = view.getStepView('testPipeline1/step2');
    rfv2.setInput('b', 4);
    await delay(300);
    await rfv2.run();
    await delay(300);
    const a = rfv2.getParamValue('a');
    expectDeepEqual(a, 3);

    const rfv3 = view.getStepView('testPipeline1/testPipeline2/step1');
    rfv3.setInput('b', 1);
    rfv3.setInput('c', 2);
    await delay(300);
    await rfv3.run();
    await delay(300);

    const res = rfv3.getParamValue('res');
    expectDeepEqual(res, 15);
  });

  test('links between composed', async () => {
    const conf1: PipelineCompositionConfiguration = {
      id: 'testPipeline1',
      nqName: 'LibTests:TestWrapper4',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:AddMock',
        },
        {
          id: 'step2',
          nqName: 'LibTests:MulMock',
        },
      ],
      links: [{
        id: 'link1',
        from: ['step1', 'res'],
        to: ['step2', 'a'],
      }],
    };
    const conf2 = {
      id: 'testPipeline2',
      nqName: 'LibTests:TestWrapper5',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:TestFn1',
        },
      ],
      links: [{
        id: 'link1',
        from: ['step1', 'res'],
        to: ['testPipeline1', 'step1', 'a'],
      }],
    };
    const pipeline = new CompositionPipeline(CompositionPipeline.compose(conf2, [conf1]));
    const view = pipeline.makePipelineView();
    await pipeline.init();

    const rfv1 = view.getStepView('testPipeline2/step1');
    rfv1.setInput('a', 1);
    rfv1.setInput('b', 2);
    rfv1.setInput('c', 3);
    await delay(300);
    await rfv1.run();
    await delay(300);

    const rfv2 = view.getStepView('testPipeline2/testPipeline1/step1');
    rfv2.setInput('b', 4);
    await delay(300);
    await rfv2.run();
    await delay(300);
    const a = rfv2.getParamValue('a');
    expectDeepEqual(a, 6);

    const rfv3 = view.getStepView('testPipeline2/testPipeline1/step2');
    rfv3.setInput('b', 5);
    await delay(300);
    await rfv3.run();
    await delay(300);
    const res = rfv3.getParamValue('res');
    expectDeepEqual(res, 50);

  });

});
