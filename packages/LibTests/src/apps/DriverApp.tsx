import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import {zipSync, Zippable} from 'fflate';
import {BigButton, ComboPopup, DockManager, IconFA, RibbonPanel} from '@datagrok-libraries/webcomponents-vue';
import {Driver} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/Driver';
import {useSubscription} from '@vueuse/rxjs';
import {
  isFuncCallState, isParallelPipelineState, 
  isSequentialPipelineState, isStaticPipelineState, PipelineState,
  StepFunCallState,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {RichFunctionView} from '../components/RFV/RichFunctionView';
import {TreeNode} from '../components/TreeWizard/TreeNode';
import {Draggable} from '@he-tree/vue';
import {AugmentedStat} from '../components/TreeWizard/types';
import {dragContext} from '@he-tree/vue';
import '@he-tree/vue/style/default.css';
import '@he-tree/vue/style/material-design.css';
import * as Utils from '@datagrok-libraries/compute-utils/shared-utils/utils';
import {FuncCallStateInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';
import {BehaviorSubject} from 'rxjs';

const findTreeNode = (uuid: string, state: PipelineState): PipelineState | undefined => {
  let foundState = undefined as PipelineState | undefined;
  const notVisitedStates = [state];
  
  while (notVisitedStates.length > 0 && !foundState) {
    const currentState = notVisitedStates.pop()!;
    if (
      isParallelPipelineState(currentState) ||
      isSequentialPipelineState(currentState) || 
      isStaticPipelineState(currentState)
    ) 
      notVisitedStates.push(...currentState.steps);
    else {
      if (currentState.uuid === uuid) 
        foundState = currentState;
    }
  }

  return foundState;
};

export const DriverApp = Vue.defineComponent({
  name: 'DriverApp',
  setup() {
    const driver = new Driver();
    const isLocked = Vue.ref(false);
    const treeState = Vue.shallowRef<PipelineState | undefined>(undefined);
    const callsInfo = Vue
      .shallowRef<Record<string, BehaviorSubject<FuncCallStateInfo | undefined>> | undefined>(undefined);
    const chosenStepUuid = Vue.ref<string | undefined>(undefined);

    const chosenStepState = Vue.computed(() => {
      if (!chosenStepUuid.value || !treeState.value) return null;

      return findTreeNode(chosenStepUuid.value, treeState.value);
    });

    const treeInstance = Vue.ref(null as InstanceType<typeof Draggable> | null);

    const isVisibleRfv = Vue.ref(true);

    let oldClosed = [] as string[];

    useSubscription((driver.currentState$).subscribe((s) => {
      if (treeInstance.value) {
        //@ts-ignore
        const oldStats = treeInstance.value!.statsFlat as AugmentedStat[];
        oldClosed = oldStats.reduce((acc, stat) => {
          if (!stat.open) 
            acc.push(stat.data.uuid); 
          return acc;
        }, [] as string[]);
      }
      treeState.value = s;
    }));

    useSubscription((driver.currentCallsState$).subscribe((s) => callsInfo.value = s));

    const restoreOpenedNodes = (stat: AugmentedStat) => {
      if (oldClosed.includes(stat.data.uuid)) 
        stat.open = false;
      return stat;
    };

    useSubscription((driver.globalROLocked$).subscribe((l) => isLocked.value = l));
    Vue.onUnmounted(() => {
      driver.close();
      console.log('VuewDriverTestApp driver closed');
    });

    const initPipeline = (provider: string) => {
      driver.sendCommand({event: 'initPipeline', provider});
    };

    const runStep = async (uuid: string) => {
      driver.sendCommand({event: 'runStep', uuid});
    };

    const addStep = (parentUuid: string, itemId: string, position: number) => {
      driver.sendCommand({event: 'addDynamicItem', parentUuid, itemId, position});
    };

    const removeStep = (uuid: string) => {
      driver.sendCommand({event: 'removeDynamicItem', uuid});
    };

    const moveStep = (uuid: string, position: number) => {
      driver.sendCommand({event: 'moveDynamicItem', uuid, position});
    };

    Vue.watch(isLocked, (newVal) => {
      if (!treeInstance.value) return;

      ui.setUpdateIndicator(treeInstance.value.$el, newVal);
    });

    const treeHidden = Vue.ref(false);
    const rfvRef = Vue.ref(null as InstanceType<typeof RichFunctionView> | null);

    const handlePanelClose = (el: HTMLElement) => {
      if (el === rfvRef.value?.$el) isVisibleRfv.value = false;
      if (el === treeInstance.value?.$el) treeHidden.value = true;
    };

    return () => (
      <div class='w-full h-full'>
        <RibbonPanel>
          <BigButton onClick={() => initPipeline('LibTests:MockProvider3')}>Init Pipeline</BigButton>
          <IconFA 
            name='folder-tree'
            tooltip={treeHidden.value ? 'Show tree': 'Hide tree'}
            onClick={() => treeHidden.value = !treeHidden.value } 
          />
          {treeState.value && <IconFA 
            name='arrow-to-bottom'
            onClick={async () => {
              if (treeState.value) {
                const zipConfig = {} as Zippable;

                const exportStep = async (previousPath: string, state: PipelineState) => {
                  if (isFuncCallState(state) && state.funcCall) {
                    const funccall = state.funcCall;

                    const blob = await Utils.richFunctionViewExport(
                      'Excel',
                      funccall.func,
                      funccall,
                      Utils.dfToViewerMapping(funccall),
                    );

                    zipConfig[`${previousPath}/${Utils.getFuncCallDefaultFilename(funccall)}`] =
                      [new Uint8Array(await blob.arrayBuffer()), {level: 0}];
                  }

                  if (
                    isSequentialPipelineState(state) || 
                    isParallelPipelineState(state) || 
                    isStaticPipelineState(state)
                  ) {
                    const nestedPath = previousPath.length > 0 ? 
                      `${previousPath}/${state.friendlyName ?? state.nqName}`: 
                      `${state.friendlyName ?? state.nqName}`;
                    for (const stepState of state.steps) 
                      await exportStep(nestedPath, stepState);
                  }
                }; 
                
                await exportStep('', treeState.value);

                DG.Utils.download('All steps.zip', new Blob([zipSync(zipConfig)]));
              }
            }}
          /> }
        </RibbonPanel>
        <DockManager class='block h-full' onPanelClosed={handlePanelClose}>
          { treeState.value && !treeHidden.value ? <Draggable 
            class="ui-div mtl-tree p-2"
            {...{title: 'Steps'}}
            rootDroppable={false}
            treeLine
            childrenKey='steps'
            nodeKey={(stat: AugmentedStat) => stat.data.uuid}
            statHandler={restoreOpenedNodes}

            ref={treeInstance} 
            modelValue={[treeState.value]} 
        
            eachDraggable={(stat: AugmentedStat) =>
              (stat.parent && 
                (isParallelPipelineState(stat.parent.data) || isSequentialPipelineState(stat.parent.data))
              ) ?? false
            }
            eachDroppable={(stat: AugmentedStat) => 
              (isParallelPipelineState(stat.data) || isSequentialPipelineState(stat.data))}
            onAfter-drop={() => {
              const draggedStep = dragContext.startInfo.dragNode as AugmentedStat;
              moveStep(draggedStep.data.uuid, dragContext.targetInfo.indexBeforeDrop);
            }}
          > 
            { 
              ({stat}: {stat: AugmentedStat}) =>  
                (
                  <TreeNode 
                    stat={stat}
                    style={{'background-color': stat.data.uuid === chosenStepUuid.value ? '#f2f2f5' : null}}
                    isDraggable={treeInstance.value?.isDraggable(stat)}
                    isDroppable={treeInstance.value?.isDroppable(stat)}
                    isDeletable={!!stat.parent && isParallelPipelineState(stat.parent.data)}
                    onAddNode={({itemId, position}) => {
                      addStep(stat.data.uuid, itemId, position);
                    }}
                    onRemoveNode={() => removeStep(stat.data.uuid)}
                    onClick={() => {
                      if (isFuncCallState(stat.data) && stat.data.funcCall) 
                        chosenStepUuid.value = stat.data.uuid;
                      else 
                        isVisibleRfv.value = false;
                    }}
                    onToggleNode={() => stat.open = !stat.open}
                  />
                )
            }
          </Draggable>: null }
          
          {
            isVisibleRfv.value && chosenStepState.value && 
            isFuncCallState(chosenStepState.value) && chosenStepState.value.funcCall &&
            <RichFunctionView 
              class='overflow-hidden'
              funcCall={chosenStepState.value.funcCall}
              key={ `${callsInfo.value?.[chosenStepUuid.value!]?.value?.isOutputOutdated}` }
              onUpdate:funcCall={(call) => (chosenStepState.value as StepFunCallState).funcCall = call}
              onRunClicked={() => runStep(chosenStepState.value!.uuid)}
              {...{title: 'Step review'}}
              dock-spawn-dock-type='right'
              dock-spawn-dock-ratio={0.8}
              ref={rfvRef}
            /> 
          }
        </DockManager>
      </div>
    );
  },
});
