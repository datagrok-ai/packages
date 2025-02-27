import * as DG from 'datagrok-api/dg';
import {category, test} from '@datagrok-libraries/utils/src/test';
import {PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import {getProcessedConfig, PipelineConfigurationStaticProcessed} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/config-processing-utils';
import {StateTree} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTree';
import {matchLink} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/link-matching';
import {PipelineLinkConfiguration} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineConfiguration';
import {LinkSpecString} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/data/common-types';
import {snapshotCompare} from '../../../test-utils';

category('ComputeUtils: Driver links matching', async () => {
  test('Links match static pipeline', async () => {
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
        from: 'in1:step1/res',
        to: 'out1:step2/a',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfo = matchLink(tree, [], links[0]);
    await snapshotCompare(matchInfo, 'Links match static pipeline');
  });

  test('Links match nested static pipeline', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'pipeline1',
          type: 'static',
          steps: [
            {
              id: 'step1',
              nqName: 'LibTests:TestAdd2',
            },
          ],
        },
        {
          id: 'step2',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: 'in1:pipeline1/step1/res',
        to: 'out1:step2/a',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfo = matchLink(tree, [], links[0]);
    await snapshotCompare(matchInfo, 'Links match nested static pipeline');
  });

  test('Links with multiple io match nested static pipeline', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'pipeline1',
          type: 'static',
          steps: [
            {
              id: 'step1',
              nqName: 'LibTests:TestAdd2',
            },
          ],
        },
        {
          id: 'step2',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: ['in1:pipeline1/step1/res', 'in2:pipeline1/step1/a'],
        to: ['out1:step2/a', 'out2:step2/b'],
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfo = matchLink(tree, [], links[0]);
    await snapshotCompare(matchInfo, 'Links with multiple io match nested static pipeline');
  });

  test('Links matching all parallel pipeline items', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'pipelinePar',
          type: 'parallel',
          stepTypes: [
            {
              id: 'stepAdd',
              nqName: 'LibTests:TestAdd2',
            },
            {
              id: 'stepMul',
              nqName: 'LibTests:TestMul2',
            },
          ],
          initialSteps: [
            {
              id: 'stepAdd',
            },
            {
              id: 'stepMul',
            },
            {
              id: 'stepMul',
            },
            {
              id: 'stepAdd',
            },
          ],
        },
        {
          id: 'step3',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: 'in1:step1/res',
        to: ['out1:pipelinePar/all(stepAdd)/a', 'out2:pipelinePar/all(stepMul)/a'],
      }, {
        id: 'link2',
        from: ['in1:pipelinePar/all(stepAdd)/res', 'in2:pipelinePar/all(stepMul)/res'],
        to: 'out1:step3/a',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links matching all parallel pipeline items');
  });

  test('Links matching multiple ids', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'step1',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'pipelinePar',
          type: 'parallel',
          stepTypes: [
            {
              id: 'stepAdd',
              nqName: 'LibTests:TestAdd2',
            },
            {
              id: 'stepMul',
              nqName: 'LibTests:TestMul2',
            },
          ],
          initialSteps: [
            {
              id: 'stepAdd',
            },
            {
              id: 'stepMul',
            },
            {
              id: 'stepMul',
            },
            {
              id: 'stepAdd',
            },
          ],
        },
        {
          id: 'step3',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: 'in1:step1/res',
        to: ['out1:pipelinePar/all(stepAdd|stepMul)/a'],
      }, {
        id: 'link2',
        from: ['in1:pipelinePar/all(stepAdd|stepMul)/res'],
        to: 'out1:step3/a',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links matching multiple ids');
  });

  test('Links expaning base path', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'sequential',
      stepTypes: [
        {
          id: 'stepAdd',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'stepMul',
          nqName: 'LibTests:TestMul2',
        },
        {
          id: 'stepSub',
          nqName: 'LibTests:TestSub2',
        },
        {
          id: 'stepDiv',
          nqName: 'LibTests:TestDiv2',
        },
      ],
      initialSteps: [
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
      ],
      links: [{
        id: 'link1',
        from: [],
        to: [],
        base: 'base:expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links expaning base path');
  });

  test('Links referencing adjacent to base segment', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'sequential',
      stepTypes: [
        {
          id: 'stepAdd',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'stepMul',
          nqName: 'LibTests:TestMul2',
        },
        {
          id: 'stepSub',
          nqName: 'LibTests:TestSub2',
        },
        {
          id: 'stepDiv',
          nqName: 'LibTests:TestDiv2',
        },
      ],
      initialSteps: [
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
      ],
      links: [{
        id: 'link1',
        from: 'in1:before+(@base,stepAdd)/res',
        to: 'out1:after+(@base,stepSub)/a',
        base: 'base:expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links referencing adjacent to base segment');
  });

  test('Links referencing remote from base path', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'sequential',
      stepTypes: [
        {
          id: 'stepAdd',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'stepMul',
          nqName: 'LibTests:TestMul2',
        },
        {
          id: 'stepSub',
          nqName: 'LibTests:TestSub2',
        },
        {
          id: 'stepDiv',
          nqName: 'LibTests:TestDiv2',
        },
      ],
      initialSteps: [
        {id: 'stepAdd'},
        {id: 'stepSub'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
        {id: 'stepAdd'},
        {id: 'stepSub'},
        {id: 'stepMul'},
        {id: 'stepSub'},
        {id: 'stepDiv'},
      ],
      links: [{
        id: 'link1',
        from: 'in1:before(@base,stepAdd)/res',
        to: 'out1:after(@base,stepDiv)/a',
        base: 'base:expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links referencing remote from base path');
  });

  test('Links referencing all match limits', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'sequential',
      stepTypes: [
        {
          id: 'stepAdd',
          nqName: 'LibTests:TestAdd2',
        },
        {
          id: 'stepMul',
          nqName: 'LibTests:TestMul2',
        },
        {
          id: 'stepSub',
          nqName: 'LibTests:TestSub2',
        },
        {
          id: 'stepDiv',
          nqName: 'LibTests:TestDiv2',
        },
      ],
      initialSteps: [
        {id: 'stepAdd'},
        {id: 'stepSub'},

        {id: 'stepAdd'},
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepDiv'},
        {id: 'stepDiv'},

        {id: 'stepSub'},

        {id: 'stepAdd'},
        {id: 'stepAdd'},
        {id: 'stepMul'},
        {id: 'stepDiv'},
        {id: 'stepDiv'},
      ],
      links: [{
        id: 'link1',
        from: 'in1:before*(@base,stepAdd,stepSub)/res',
        to: 'out1:after*(@base,stepDiv,stepSub)/a',
        base: 'base:expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links referencing all match limits');
  });

  test('Links deep base matching', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [{
        id: 'stepAdd',
        nqName: 'LibTests:TestAdd2',
      }, {
        id: 'pipeline1',
        type: 'sequential',
        stepTypes: [
          {
            id: 'stepAdd',
            nqName: 'LibTests:TestAdd2',
          },
          {
            id: 'stepMul',
            nqName: 'LibTests:TestMul2',
          },
          {
            id: 'stepSub',
            nqName: 'LibTests:TestSub2',
          },
          {
            id: 'stepDiv',
            nqName: 'LibTests:TestDiv2',
          },
          {
            id: 'pipeline1',
            type: 'sequential',
            stepTypes: [
              {
                id: 'stepAdd',
                nqName: 'LibTests:TestAdd2',
              },
              {
                id: 'stepMul',
                nqName: 'LibTests:TestMul2',
              },
              {
                id: 'stepSub',
                nqName: 'LibTests:TestSub2',
              },
              {
                id: 'stepDiv',
                nqName: 'LibTests:TestDiv2',
              },
            ],
            initialSteps: [
              {id: 'stepAdd'},
              {id: 'stepSub'},

              {id: 'stepAdd'},
              {id: 'stepAdd'},
              {id: 'stepMul'},
              {id: 'stepDiv'},
              {id: 'stepDiv'},

              {id: 'stepSub'},

              {id: 'stepAdd'},
              {id: 'stepAdd'},
              {id: 'stepMul'},
              {id: 'stepDiv'},
              {id: 'stepDiv'},
            ],
          },
        ],
        initialSteps: [
          {id: 'stepAdd'},
          {id: 'stepMul'},
          {id: 'pipeline1'},
          {id: 'stepSub'},
          {id: 'stepDiv'},
          {id: 'stepAdd'},
          {id: 'stepMul'},
          {id: 'pipeline1'},
          {id: 'stepSub'},
          {id: 'stepDiv'},
        ],
      }],
      links: [{
        id: 'link1',
        from: [],
        to: [],
        base: 'base:pipeline1/expand(pipeline1)/expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links deep base matching');
  });

  test('Links expanding deep base path', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [{
        id: 'stepAdd',
        nqName: 'LibTests:TestAdd2',
      }, {
        id: 'pipeline1',
        type: 'sequential',
        stepTypes: [
          {
            id: 'stepAdd',
            nqName: 'LibTests:TestAdd2',
          },
          {
            id: 'stepMul',
            nqName: 'LibTests:TestMul2',
          },
          {
            id: 'stepSub',
            nqName: 'LibTests:TestSub2',
          },
          {
            id: 'stepDiv',
            nqName: 'LibTests:TestDiv2',
          },
          {
            id: 'pipeline1',
            type: 'sequential',
            stepTypes: [
              {
                id: 'stepAdd',
                nqName: 'LibTests:TestAdd2',
              },
              {
                id: 'stepMul',
                nqName: 'LibTests:TestMul2',
              },
              {
                id: 'stepSub',
                nqName: 'LibTests:TestSub2',
              },
              {
                id: 'stepDiv',
                nqName: 'LibTests:TestDiv2',
              },
            ],
            initialSteps: [
              {id: 'stepAdd'},
              {id: 'stepSub'},

              {id: 'stepAdd'},
              {id: 'stepAdd'},
              {id: 'stepMul'},
              {id: 'stepDiv'},
              {id: 'stepDiv'},

              {id: 'stepSub'},

              {id: 'stepAdd'},
              {id: 'stepAdd'},
              {id: 'stepMul'},
              {id: 'stepDiv'},
              {id: 'stepDiv'},
            ],
          },
        ],
        initialSteps: [
          {id: 'stepAdd'},
          {id: 'stepMul'},
          {id: 'pipeline1'},
          {id: 'stepSub'},
          {id: 'stepDiv'},
          {id: 'stepAdd'},
          {id: 'stepMul'},
          {id: 'pipeline1'},
          {id: 'stepSub'},
          {id: 'stepDiv'},
        ],
      }],
      links: [{
        id: 'link1',
        from: 'in1:pipeline1/same(@base,pipeline1)/before*(@base,stepAdd,stepSub)/res',
        to: 'out1:pipeline1/same(@base,pipeline1)/after*(@base,stepDiv,stepSub)/a',
        base: 'base:pipeline1/expand(pipeline1)/expand(stepMul)',
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links expanding deep base path');
  });

  test('Links not matching', async () => {
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
        {
          id: 'step3',
          nqName: 'LibTests:TestDiv2',
        },
      ],
      links: [{
        id: 'link1',
        from: 'in1:step1/res',
        to: 'out1:step2/a',
        not: 'not:step3',
      }],
    };

    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links not matching');
  });

  test('Links optional matching', async () => {
    const config: PipelineConfiguration = {
      id: 'pipeline1',
      type: 'static',
      steps: [
        {
          id: 'pipelinePar',
          type: 'parallel',
          stepTypes: [
            {
              id: 'stepAdd',
              nqName: 'LibTests:TestAdd2',
            },
            {
              id: 'stepMul',
              nqName: 'LibTests:TestMul2',
            },
          ],
          initialSteps: [
            {
              id: 'stepAdd',
            },
          ],
        },
        {
          id: 'step3',
          nqName: 'LibTests:TestMul2',
        },
      ],
      links: [{
        id: 'link1',
        from: ['in1:pipelinePar/stepAdd/res', 'in2(optional):pipelinePar/stepMul/res'],
        to: ['out1:step3/a'],
        handler({controller}) {
          controller.setAll('out', 1);
        }
      }],
    };
    const pconf = await getProcessedConfig(config);
    const tree = StateTree.fromPipelineConfig({config: pconf});
    await tree.init().toPromise();
    const links = (tree.nodeTree.root.getItem().config as PipelineConfigurationStaticProcessed).links!;
    const matchInfos = links.map((link) => matchLink(tree, [], link));
    await snapshotCompare(matchInfos, 'Links optional matching');
  });

});
