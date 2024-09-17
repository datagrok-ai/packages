import * as DG from 'datagrok-api/dg';
import {category, test, before, delay} from '@datagrok-libraries/utils/src/test';
import {getProcessedConfig} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/config-processing-utils';
import {StateTree} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTree';
import {LinksState} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/LinksState';
import {PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import {TestScheduler} from 'rxjs/testing';
import {expectDeepEqual} from '@datagrok-libraries/utils/src/expect';
import {PipelineStateStatic, StepFunCallSerializedState} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {loadInstanceState} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/funccall-utils';
import { callHandler, makeValidationResult } from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/utils';
import {of} from 'rxjs';
import {FuncCallNode} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';

const config1: PipelineConfiguration = {
  id: 'pipeline1',
  type: 'static',
  steps: [
    {
      id: 'step1',
      nqName: 'LibTests:TestAdd2',
    },
    {
      id: 'step2',
      nqName: 'LibTests:TestMul2',
    },
  ],
  links: [{
    id: 'link1',
    from: 'in1:step1/a',
    to: 'out1:step2/a',
    handler({controller}) {
      controller.setAll('out1', 2, 'restricted');
      return;
    },
  }],
};

category('ComputeUtils: Driver instance additional states', async () => {
  let testScheduler: TestScheduler;

  before(async () => {
    testScheduler = new TestScheduler((actual, expected) => {
      // console.log(actual, expected);
      expectDeepEqual(actual, expected);
    });
  });

  test('Propagate validations info to view state', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'step2',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: 'in1:step1/a',
        to: 'out1:step1/a',
        isValidator: true,
        handler({controller}) {
          controller.setValidation('out1', makeValidationResult({warnings: ['test warn']}));
          return;
        },
      }, {
        id: 'link1',
        from: 'in1:step1/b',
        to: 'out1:step1/b',
        isValidator: true,
        handler({controller}) {
          controller.setValidation('out1', makeValidationResult({warnings: ['another test warn']}));
          return;
        },
      }],
    };
    const pconf = await getProcessedConfig(config);

    testScheduler.run((helpers) => {
      const {cold, expectObservable} = helpers;
      const tree = StateTree.fromPipelineConfig({config: pconf, mockMode: true});
      tree.initAll().subscribe();
      const ls = new LinksState();
      const [link1, link2] = ls.createAutoLinks(tree.nodeTree);
      link1.wire(tree);
      link2.wire(tree);
      const inNode = tree.nodeTree.getNode([{idx: 0}]);
      const validations = tree.getValidations();
      cold('-a').subscribe(() => {
        link1.trigger();
        link2.trigger();
      });
      const a = {};
      const b = {
        'a': {
          'errors': [],
          'warnings': [
            {
              'description': 'test warn',
            },
          ],
          'notifications': [],
        },
      };
      const c = {
        'a': {
          'errors': [],
          'warnings': [
            {
              'description': 'test warn',
            },
          ],
          'notifications': [],
        },
        'b': {
          'errors': [],
          'warnings': [
            {
              'description': 'another test warn',
            },
          ],
          'notifications': [],
        },
      };
      expectObservable(validations[inNode.getItem().uuid], '^ 1000ms !').toBe('a(bc)', {a, b, c});
    });
  });


  test('Propagate consistency info to view state', async () => {
    const pconf = await getProcessedConfig(config1);

    testScheduler.run((helpers) => {
      const {cold, expectObservable} = helpers;
      const tree = StateTree.fromPipelineConfig({config: pconf, mockMode: true});
      tree.initAll().subscribe();
      const ls = new LinksState();
      const [link1] = ls.createAutoLinks(tree.nodeTree);
      link1.wire(tree);
      const outNode = tree.nodeTree.getNode([{idx: 1}]);
      const consistency = tree.getConsistency();
      cold('-a').subscribe(() => {
        link1.trigger();
      });
      cold('--a').subscribe(() => {
        outNode.getItem().getStateStore().editState('a', 3);
      });
      const a = {};
      const b = {};
      const c = {
        'a': {
          'restriction': 'restricted',
          'inconsistent': true,
          'assignedValue': 2,
        },
      };
      expectObservable(consistency[outNode.getItem().uuid], '^ 1000ms !').toBe('abc', {a, b, c});
    });
  });

  test('Propagate funccalls state to view state', async () => {
    const pconf = await getProcessedConfig(config1);

    testScheduler.run((helpers) => {
      const {cold, expectObservable} = helpers;
      const tree = StateTree.fromPipelineConfig({config: pconf, mockMode: true});
      tree.initAll().subscribe();
      const node = tree.nodeTree.getNode([{idx: 0}]);
      const states = tree.getFuncCallStates();
      cold('-a').subscribe(() => {
        const fcnode = node.getItem() as FuncCallNode;
        fcnode.getStateStore().setState('a', 1);
        fcnode.getStateStore().setState('b', 2);
        fcnode.getStateStore().run({'res': 3}, 5).subscribe();
      });
      const a = {
        'isRunning': false,
        'isRunnable': true,
        'isOutputOutdated': true,
      };
      const b = {
        'isRunning': true,
        'isRunnable': true,
        'isOutputOutdated': true,
      };
      const c = {
        'isRunning': true,
        'isRunnable': false,
        'isOutputOutdated': true,
      };
      const d = {
        'isRunning': false,
        'isRunnable': false,
        'isOutputOutdated': true,
      };
      const e = {
        'isRunning': false,
        'isRunnable': true,
        'isOutputOutdated': true,
      };
      const f = {
        'isRunning': false,
        'isRunnable': true,
        'isOutputOutdated': false,
      };
      expectObservable(states[node.getItem().uuid], '^ 1000ms !').toBe('a(bc)-(def)', {a, b, c, d, e, f});
    });
  });

  test('Propagate consistency info to RO view state', async () => {
    const pconf = await getProcessedConfig(config1);

    testScheduler.run((helpers) => {
      const {cold, expectObservable} = helpers;
      const tree = StateTree.fromPipelineConfig({config: pconf, mockMode: true, isReadonly: true});
      tree.initAll().subscribe();
      const ls = new LinksState();
      const [link1] = ls.createAutoLinks(tree.nodeTree);
      link1.wire(tree);
      const outNode = tree.nodeTree.getNode([{idx: 1}]);
      const consistency = tree.getConsistency();
      cold('-a').subscribe(() => {
        link1.trigger();
      });
      cold('--a').subscribe(() => {
        outNode.getItem().getStateStore().editState('a', 3);
      });
      const a = {};
      const b = {
        'a': {
          'restriction': 'restricted',
          'inconsistent': true,
          'assignedValue': 2,
        },
      };
      expectObservable(consistency[outNode.getItem().uuid], '^ 1000ms !').toBe('abb', {a, b});
    });
  });

  test('Restore saved consistency state', async () => {
    const conf = await callHandler<PipelineConfiguration>('LibTests:MockProvider1', {version: '1.0'}).toPromise();
    const pconf = await getProcessedConfig(conf);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.initAll().toPromise();
    const outNode = tree.nodeTree.getNode([{idx: 1}]);
    outNode.getItem().getStateStore().setState('a', 10, 'restricted');
    await tree.save().toPromise();
    const metaCallSaved = tree.metaCall$.value;
    const loadedTree = await StateTree.load(metaCallSaved!.id, pconf, {isReadonly: false}).toPromise();
    await loadedTree.initAll().toPromise();
    const outNodeLoaded = loadedTree.nodeTree.getNode([{idx: 1}]);
    outNodeLoaded.getItem().getStateStore().editState('a', 3);
    const consistency = loadedTree.getConsistency();
    expectDeepEqual(consistency[outNodeLoaded.getItem().uuid]?.value, {
      'a': {
        'restriction': 'restricted',
        'inconsistent': true,
        'assignedValue': 10,
      },
    });
  });

  test('Restore saved outdated state', async () => {
    const conf = await callHandler<PipelineConfiguration>('LibTests:MockProvider1', {version: '1.0'}).toPromise();
    const pconf = await getProcessedConfig(conf);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.initAll().toPromise();
    const node = tree.nodeTree.getNode([{idx: 0}]);
    const fcnode = node.getItem() as FuncCallNode;
    fcnode.getStateStore().setState('a', 1);
    fcnode.getStateStore().setState('b', 2);
    await fcnode.getStateStore().run().toPromise();
    await tree.save().toPromise();
    const metaCallSaved = tree.metaCall$.value;
    const loadedTree = await StateTree.load(metaCallSaved!.id, pconf, {isReadonly: false}).toPromise();
    await loadedTree.initAll().toPromise();
    const nodeLoaded = loadedTree.nodeTree.getNode([{idx: 0}]);
    const states = loadedTree.getFuncCallStates();
    expectDeepEqual(states[nodeLoaded.getItem().uuid]?.value, {
      'isRunning': false,
      'isRunnable': true,
      'isOutputOutdated': false,
    });
  });
});
