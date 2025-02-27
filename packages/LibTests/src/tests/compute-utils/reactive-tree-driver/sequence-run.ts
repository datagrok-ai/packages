import * as DG from 'datagrok-api/dg';
import {category, test, before} from '@datagrok-libraries/utils/src/test';
import {getProcessedConfig} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/config-processing-utils';
import {StateTree} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTree';
import {LinksState} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/LinksState';
import {PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import {TestScheduler} from 'rxjs/testing';
import {expectDeepEqual} from '@datagrok-libraries/utils/src/expect';
import {of, Subject} from 'rxjs';
import {debounceTime, filter, take} from 'rxjs/operators';
import {FuncCallInstancesBridge} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/FuncCallInstancesBridge';
import {makeValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/utils';
import {FuncCallNode} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';

const config: PipelineConfiguration = {
  id: 'pipeline1',
  type: 'static',
  steps: [
    {
      id: 'step1',
      nqName: 'LibTests:TestAdd2',
    },
    {
      id: 'pipeline2',
      type: 'static',
      steps: [
        {
          id: 'step2',
          nqName: 'LibTests:TestSub2',
        },
        {
          id: 'step3',
          nqName: 'LibTests:TestMul2',
        },
      ],
    },
    {
      id: 'step4',
      nqName: 'LibTests:TestDiv2',
    },
  ],
  links: [
    {
      id: 'link1',
      from: 'from:step1/res',
      to: 'to:pipeline2/step2/a',
      defaultRestrictions: {
        to: 'restricted',
      },
    },
    {
      id: 'link2',
      from: 'from:pipeline2/step2/res',
      to: 'to:pipeline2/step3/a',
      defaultRestrictions: {
        to: 'restricted',
      },
    },
    {
      id: 'link3',
      from: 'from:pipeline2/step3/res',
      to: 'to:step4/a',
      defaultRestrictions: {
        to: 'restricted',
      },
    },
  ],
};

async function waitForMutations(tree: StateTree) {
  await tree.treeMutationsLocked$.pipe(
    debounceTime(0),
    filter((x) => !x),
    take(1),
  ).toPromise();
}

category('ComputeUtils: Driver run steps sequence', async () => {
  test('Should run ready sequence', async () => {
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf, defaultValidators: true});
    await tree.init().toPromise();
    const node1 = tree.nodeTree.getNode([{idx: 0}]);
    const fcnode1 = node1.getItem() as FuncCallNode;
    const node2 = tree.nodeTree.getNode([{idx: 1}, {idx: 0}]);
    const fcnode2 = node2.getItem() as FuncCallNode;
    const node3 = tree.nodeTree.getNode([{idx: 1}, {idx: 1}]);
    const fcnode3 = node3.getItem() as FuncCallNode;
    const node4 = tree.nodeTree.getNode([{idx: 2}]);
    const fcnode4 = node4.getItem() as FuncCallNode;
    fcnode1.getStateStore().setState('a', 1);
    fcnode1.getStateStore().setState('b', 2);
    fcnode2.getStateStore().setState('b', 1);
    fcnode3.getStateStore().setState('b', 3);
    fcnode4.getStateStore().setState('b', 2);
    await waitForMutations(tree);
    await tree.runSequence(tree.nodeTree.root.getItem().uuid).toPromise();
    await waitForMutations(tree);
    expectDeepEqual(fcnode4.getStateStore().getState('res'), 3);
  });

  test('Should stop on not ready steps', async () => {
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf, defaultValidators: true});
    await tree.init().toPromise();
    const node1 = tree.nodeTree.getNode([{idx: 0}]);
    const fcnode1 = node1.getItem() as FuncCallNode;
    const node2 = tree.nodeTree.getNode([{idx: 1}, {idx: 0}]);
    const fcnode2 = node2.getItem() as FuncCallNode;
    const node3 = tree.nodeTree.getNode([{idx: 1}, {idx: 1}]);
    const fcnode3 = node3.getItem() as FuncCallNode;
    const node4 = tree.nodeTree.getNode([{idx: 2}]);
    const fcnode4 = node4.getItem() as FuncCallNode;
    fcnode1.getStateStore().setState('a', 1);
    fcnode1.getStateStore().setState('b', 2);
    fcnode2.getStateStore().setState('b', 1);
    fcnode3.getStateStore().setState('b', 3);
    await waitForMutations(tree);
    await tree.runSequence(tree.nodeTree.root.getItem().uuid).toPromise();
    await waitForMutations(tree);
    expectDeepEqual(fcnode3.getStateStore().getState('res'), 6);
    expectDeepEqual(fcnode4.getStateStore().getState('res'), null);
  });

  test('Should skip runned steps', async () => {
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf, defaultValidators: true});
    await tree.init().toPromise();
    const node1 = tree.nodeTree.getNode([{idx: 0}]);
    const fcnode1 = node1.getItem() as FuncCallNode;
    const node2 = tree.nodeTree.getNode([{idx: 1}, {idx: 0}]);
    const fcnode2 = node2.getItem() as FuncCallNode;
    const node3 = tree.nodeTree.getNode([{idx: 1}, {idx: 1}]);
    const fcnode3 = node3.getItem() as FuncCallNode;
    const node4 = tree.nodeTree.getNode([{idx: 2}]);
    const fcnode4 = node4.getItem() as FuncCallNode;
    fcnode1.getStateStore().setState('a', 1);
    fcnode1.getStateStore().setState('b', 2);
    fcnode2.getStateStore().setState('a', 10);
    fcnode2.getStateStore().setState('b', 1);
    fcnode3.getStateStore().setState('b', 3);
    fcnode4.getStateStore().setState('b', 2);
    await waitForMutations(tree);
    await fcnode2.getStateStore().run().toPromise();
    await waitForMutations(tree);
    await tree.runSequence(tree.nodeTree.root.getItem().uuid).toPromise();
    await waitForMutations(tree);
    expectDeepEqual(fcnode4.getStateStore().getState('res'), 13.5);
  });

  test('Should rerun steps with consistent data', async () => {
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf, defaultValidators: true});
    await tree.init().toPromise();
    const node1 = tree.nodeTree.getNode([{idx: 0}]);
    const fcnode1 = node1.getItem() as FuncCallNode;
    const node2 = tree.nodeTree.getNode([{idx: 1}, {idx: 0}]);
    const fcnode2 = node2.getItem() as FuncCallNode;
    const node3 = tree.nodeTree.getNode([{idx: 1}, {idx: 1}]);
    const fcnode3 = node3.getItem() as FuncCallNode;
    const node4 = tree.nodeTree.getNode([{idx: 2}]);
    const fcnode4 = node4.getItem() as FuncCallNode;
    fcnode1.getStateStore().setState('a', 1);
    fcnode1.getStateStore().setState('b', 2);
    fcnode2.getStateStore().setState('a', 10);
    fcnode2.getStateStore().setState('b', 1);
    fcnode3.getStateStore().setState('b', 3);
    fcnode4.getStateStore().setState('b', 2);
    await waitForMutations(tree);
    await fcnode2.getStateStore().run().toPromise();
    await waitForMutations(tree);
    await tree.runSequence(tree.nodeTree.root.getItem().uuid, true).toPromise();
    await waitForMutations(tree);
    expectDeepEqual(fcnode4.getStateStore().getState('res'), 3);
  });
});
