import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';
import {DockManager, IconFA, ifOverlapping, RibbonPanel} from '@datagrok-libraries/webcomponents-vue';
import {
  isFuncCallState, isParallelPipelineState,
  isSequentialPipelineState,
  StepFunCallState,
  ViewAction,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {RichFunctionView} from '../RFV/RichFunctionView';
import {TreeNode} from './TreeNode';
import {Draggable, dragContext} from '@he-tree/vue';
import {AugmentedStat} from './types';
import '@he-tree/vue/style/default.css';
import '@he-tree/vue/style/material-design.css';
import {PipelineView} from '../PipelineView/PipelineView';
import {useUrlSearchParams} from '@vueuse/core';
import {Inspector} from '../Inspector/Inspector';
import {
  findNextStep,
  findNodeWithPathByUuid, findTreeNodeByPath,
  findTreeNodeParrent, hasSubtreeFixableInconsistencies,
  reportStep,
} from '../../utils';
import {useReactiveTreeDriver} from '../../composables/use-reactive-tree-driver';
import {take} from 'rxjs/operators';
import {EditDialog} from './EditDialog';
import {DBSchema} from 'idb';
import {useLayoutDb} from '../../composables/use-layout-db';

const DEVELOPERS_GROUP = 'Developers';

type PanelsState = {
  inspectorHidden: boolean,
  treeHidden: boolean,
  layout: string,
};

const STORE_NAME = 'TreeWizardLayouts';

interface TreeWizardSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: PanelsState;
  };
}

export const TreeWizard = Vue.defineComponent({
  name: 'TreeWizard',
  props: {
    providerFunc: {
      type: String,
      required: true,
    },
    modelName: {
      type: String,
      required: true,
    },
    view: {
      type: DG.ViewBase,
      required: true,
    },
  },
  setup(props) {
    const {layoutDatabase} = useLayoutDb<TreeWizardSchema>();

    Vue.onBeforeUnmount(() => {
      savePersonalState(providerFunc.value);
    });

    const {
      treeMutationsLocked,
      isGlobalLocked,
      treeState,
      currentMetaCallData,
      hasNotSavedEdits,
      states,
      logs,
      config,
      links,
      //
      loadPipeline,
      loadAndReplaceNestedPipeline,
      savePipeline,
      saveDynamicItem,
      runStep,
      runSequence,
      consistencyReset,
      runAction,
      addStep,
      removeStep,
      moveStep,
      changeFuncCall
    } = useReactiveTreeDriver(Vue.toRef(props, 'providerFunc'));

    const runActionWithConfirmation = (uuid: string) => {
      const calledAction = chosenStepState.value?.actions?.find((action) => action.uuid === uuid);
      const confirmationMessage = calledAction?.confirmationMessage;
      if (confirmationMessage) {
        ui.dialog(`Action confirmation`)
          .add(ui.markdown(confirmationMessage))
          .onOK(() => runAction(uuid))
          .show({center: true, modal: true});
      } else
        runAction(uuid);
    };

    const runSubtreeWithConfirm = (startUuid: string, rerunWithConsistent?: boolean) => {
      ui.dialog(`Rerun confirmation`)
        .add(ui.markdown(`Do you want to update input values to consistent ones and rerun substeps? You will lose inconsistent values.`))
        .onOK(() => runSequence(startUuid, rerunWithConsistent))
        .show({center: true, modal: true});
    };

    const chosenStepUuid = Vue.ref<string | undefined>();

    const goNextStep = () => {
      if (chosenStepUuid.value == null || treeState.value == null)
        return;
      const nextData = findNextStep(chosenStepUuid.value, treeState.value);
      if (nextData)
        chosenStepUuid.value = nextData.state.uuid;
    };

    const currentView = Vue.computed(() => Vue.markRaw(props.view));

    const setViewName = (name: string = '') => {
      if (props.view)
        props.view.name = name;
    };

    const setViewPath = (path: string = '') => {
      if (props.view)
        props.view.path = path;
    };

    const searchParams = useUrlSearchParams<{id?: string, currentStep?: string}>('history');

    Vue.watch(searchParams, (params) => {
      const paramsRaw = [];
      if (params.currentStep)
        paramsRaw.push(`currentStep=${params.currentStep.replace(' ', '+')}`);
      if (params.id)
        paramsRaw.push(`id=${params.id}`);
      setViewPath(paramsRaw.length ? `?${paramsRaw.join('&')}`: '?');
    });

    const isLoading = Vue.ref(false);

    const handleActivePanelChanged = async (newPanel: string | null, prevPanel: string | null) => {
      if (prevPanel === 'Steps') return;

      if (prevPanel === 'Step review')
        rfvRef.value?.savePersonalState();

      if (newPanel === 'Step review') {
        isLoading.value = true;
        await Vue.nextTick();
        setTimeout(() => {
          rfvRef.value?.loadPersonalLayout();
          isLoading.value = false;
        }, 50);
      }
    };

    const dockInited = Vue.ref(false);
    const triggerSaveDefault = Vue.ref(false);
    Vue.watch(triggerSaveDefault, async () => {
      await saveDefaultState();
      await loadPersonalLayout();
    }, {flush: 'post'});

    const handleDockInit = async () => {
      dockInited.value = true;
      triggerSaveDefault.value = !triggerSaveDefault.value;
    };

    const dockRef = Vue.shallowRef(null as InstanceType<typeof DockManager> | null);

    const personalPanelsStorage = (func: DG.Func) => `${func.nqName}_personal_state`;
    const defaultPanelsStorage = (func: DG.Func) => `${func.nqName}_default_state`;

    const getCurrentState = () => {
      const layout = dockRef?.value?.getLayout();
      if (!layout) return null;

      return {
        inspectorHidden: inspectorHidden.value,
        treeHidden: treeHidden.value,
        layout,
      };
    };

    const getSavedPersonalState = async (func: DG.Func): Promise<PanelsState | null> => {
      const item = await layoutDatabase.value?.get(STORE_NAME, personalPanelsStorage(func));

      return item ?? null;
    };

    const getSavedDefaultState = async (func: DG.Func): Promise<PanelsState | null> => {
      const item = await layoutDatabase.value?.get(STORE_NAME, defaultPanelsStorage(func));

      return item ?? null;
    };

    const providerFunc = Vue.computed(() => DG.Func.byName(props.providerFunc));

    const saveDefaultState = async (func: DG.Func = providerFunc.value) => {
      if (!dockInited.value) return;

      const state = getCurrentState();
      if (state) await layoutDatabase.value?.put(STORE_NAME, state, defaultPanelsStorage(func));
    };

    const savePersonalState = async (func: DG.Func = providerFunc.value) => {
      if (!dockInited.value) return;

      const state = getCurrentState();
      if (state) await layoutDatabase.value?.put(STORE_NAME, state, personalPanelsStorage(func));
    };

    const removeSavedPersonalState = async () => {
      await layoutDatabase.value?.delete(STORE_NAME, personalPanelsStorage(providerFunc.value));

      await loadDefaultLayout();
    };

    const loadPersonalLayout = async () => {
      const personalState = await getSavedPersonalState(providerFunc.value);
      if (!dockRef.value || !personalState || !dockInited.value) return;

      inspectorHidden.value = personalState.inspectorHidden;
      treeHidden.value = personalState.treeHidden;

      await Vue.nextTick();

      await dockRef.value.useLayout(personalState.layout);
    };

    const loadDefaultLayout = async () => {
      const defaultState = await getSavedDefaultState(providerFunc.value);
      if (!dockRef.value || !defaultState || !dockInited.value) return;

      inspectorHidden.value = defaultState.inspectorHidden;
      treeHidden.value = defaultState.treeHidden;

      await Vue.nextTick();

      await dockRef.value.useLayout(defaultState.layout);
    };

    const modelName = Vue.computed(() => props.modelName);
    Vue.watch([currentMetaCallData, hasNotSavedEdits], ([metadata, hasNotSavedEdits]) => {
      if (!metadata || hasNotSavedEdits) {
        searchParams.id = undefined;
        setViewName(modelName.value);
        return;
      }

      const {id, title, started} = metadata;
      if (id) searchParams.id = id;
      if (title) setViewName(`${modelName.value} - ${title}`);
      else if (started) setViewName(`${modelName.value} - ${started}`);
      else setViewName(modelName.value);
    });

    let pendingStepPath: string | null = null;

    Vue.watch(treeState, (treeState) => {
      if (!treeState)
        return;

      if (pendingStepPath) {
        const nodeWithPath = findTreeNodeByPath(
          pendingStepPath.split(' ').map((pathSegment) => Number.parseInt(pathSegment)),
          treeState,
        );
        pendingStepPath = null;
        if (nodeWithPath?.state) {
          chosenStepUuid.value = nodeWithPath.state.uuid;
          if (isFuncCallState(nodeWithPath.state)) rfvHidden.value = false;
          if (!isFuncCallState(nodeWithPath.state)) pipelineViewHidden.value = false;
        }
        return;
      }

      if (globalThis.initialURLHandled)
        return;

      // Getting inital URL user entered with
      const startUrl = new URL(grok.shell.startUri);
      const loadingId = startUrl.searchParams.get('id');
      if (loadingId) {
        globalThis.initialURLHandled = true;
        pendingStepPath = startUrl.searchParams.get('currentStep');
        loadPipeline(loadingId);
      }
    }, {immediate: true});

    const chosenStep = Vue.computed(() => {
      if (!treeState.value)
        return null;

      return chosenStepUuid.value ? findNodeWithPathByUuid(chosenStepUuid.value, treeState.value) : undefined;
    });

    const chosenStepState = Vue.computed(() => chosenStep.value?.state);

    Vue.watch(chosenStep, (newStep) => {
      if (newStep)
        searchParams.currentStep = newStep.pathSegments.join(' ');
      else
        searchParams.currentStep = undefined;
    }, {immediate: true});

    const isRootChoosen = Vue.computed(() => {
      return (!!chosenStepState.value?.uuid) && chosenStepState.value?.uuid === treeState.value?.uuid;
    });

    const menuActions = Vue.computed(() => {
      return chosenStepState.value?.actions?.reduce((acc, action) => {
        const menuCategory = action.menuCategory ?? 'Actions';
        if (action.position === 'menu') {
          if (acc[menuCategory])
            acc[menuCategory].push(action);
          else
            acc[menuCategory] = [action];
        }
        return acc;
      }, {} as Record<string, ViewAction[]>);
    });

    const buttonActions = Vue.computed(() => {
      return chosenStepState.value?.actions?.reduce((acc, action) => {
        if (action.position === 'buttons')
          acc.push(action);

        return acc;
      }, [] as ViewAction[]);
    });


    const treeInstance = Vue.ref(null as InstanceType<typeof Draggable> | null);

    let oldClosed = new Set<string>();

    Vue.watch(treeState, (_nextState, oldState) => {
      if (oldState && treeInstance.value) {
        const oldStats = treeInstance.value.statsFlat as AugmentedStat[];
        oldClosed = oldStats.reduce((acc, stat) => {
          if (!stat.open)
            acc.add(stat.data.uuid);
          return acc;
        }, new Set<string>());
      }
    }, {immediate: true});

    const restoreOpenedNodes = (stat: AugmentedStat) => {
      if (oldClosed.has(stat.data.uuid))
        stat.open = false;
      return stat;
    };

    const isTreeReportable = Vue.computed(() => {
      return Object.values(states.calls)
        .map((state) => state?.isOutputOutdated)
        .every((isOutdated) => isOutdated === false);
    });

    const treeHidden = Vue.ref(false);
    const inspectorHidden = Vue.ref(true);
    const rfvHidden = Vue.ref(true);
    const pipelineViewHidden = Vue.ref(true);
    const inspectorInstance = Vue.ref(null as InstanceType<typeof Inspector> | null);
    const rfvRef = Vue.ref(null as InstanceType<typeof RichFunctionView> | null);
    const pipelineViewRef = Vue.ref(null as InstanceType<typeof PipelineView> | null);

    const handlePanelClose = (el: HTMLElement) => {
      if (el === treeInstance.value?.$el) treeHidden.value = true;
      if (el === inspectorInstance.value?.$el) inspectorHidden.value = true;
      if (el === rfvRef.value?.$el) rfvHidden.value = true;
      if (el === pipelineViewRef.value?.$el) pipelineViewHidden.value = true;
    };

    const isEachDraggable = (stat: AugmentedStat) => {
      return (stat.parent && !stat.parent.data.isReadonly &&
        (isParallelPipelineState(stat.parent.data) || isSequentialPipelineState(stat.parent.data))
      ) ?? false;
    };

    const isEachDroppable = (stat: AugmentedStat) => {
      const draggedStep = dragContext?.startInfo?.dragNode as AugmentedStat | undefined;
      return (isParallelPipelineState(stat.data) || isSequentialPipelineState(stat.data)) &&
        (!draggedStep || stat.data.uuid === draggedStep.parent?.data.uuid);
    };

    const onAfterDrop = () => {
      const draggedStep = dragContext.startInfo?.dragNode as AugmentedStat | undefined;
      if (draggedStep) {
        const oldIndex = dragContext.startInfo.indexBeforeDrop;
        const newIndex = dragContext.startInfo.indexBeforeDrop < dragContext.targetInfo.indexBeforeDrop ?
          dragContext.targetInfo.indexBeforeDrop - 1:
          dragContext.targetInfo.indexBeforeDrop;
        if (oldIndex !== newIndex)
          moveStep(draggedStep.data.uuid, newIndex);
      }
    };

    const isDeletable = (stat: AugmentedStat) => {
      return !!stat.parent && !stat.parent.data.isReadonly &&
        (isParallelPipelineState(stat.parent.data) || isSequentialPipelineState(stat.parent.data));
    };

    const isUserDeveloper = Vue.ref(false);
    Vue.onMounted(async () => {
      // Workaround till JS API is not ready: https://reddata.atlassian.net/browse/GROK-14159
      const userGroups = (await(await fetch(`${window.location.origin}/api/groups/all_parents`)).json() as DG.Group[]);

      if (userGroups.find((group) => group.friendlyName === DEVELOPERS_GROUP))
        isUserDeveloper.value = true;
    });

    const saveSubTreeState = (uuid: string) => {
      const chosenStepDesc = states.descriptions[uuid];
      const dialog = new EditDialog({
        title: typeof(chosenStepDesc?.title) === 'string' ? chosenStepDesc?.title : '',
        description: typeof(chosenStepDesc?.description) === 'string' ? chosenStepDesc?.description : '',
        tags: Array.isArray(chosenStepDesc?.tags) ? chosenStepDesc?.tags : [],
      });
      dialog.onMetadataEdit.pipe(take(1)).subscribe((editOptions) => {
        saveDynamicItem(chosenStepUuid.value!, editOptions);
      });

      dialog.show({center: true, width: 500});
    };

    const saveEntireModelState = () => {
      if (!treeState.value) return;

      const rootDesc = states.descriptions[treeState.value.uuid];
      const dialog = new EditDialog({...rootDesc, ...currentMetaCallData.value});
      dialog.onMetadataEdit.pipe(take(1)).subscribe((editOptions) => {
        savePipeline(editOptions);
      });

      dialog.show({center: true, width: 500});
    };

    const onPipelineProceed = () => {
      if (chosenStepState.value && !isFuncCallState(chosenStepState.value)) {
        if (isFuncCallState(chosenStepState.value.steps[0])) rfvHidden.value = false;
        if (!isFuncCallState(chosenStepState.value.steps[0])) pipelineViewHidden.value = false;
        chosenStepUuid.value = chosenStepState.value.steps[0].uuid;
      }
    };

    const onPipelineFuncCallUpdate = (newCall: DG.FuncCall) => {
      if (isRootChoosen.value)
        loadPipeline(newCall.id);
      else if (chosenStepState.value && chosenStepUuid.value && treeState.value && !isFuncCallState(chosenStepState.value)) {
        const parent = findTreeNodeParrent(chosenStepUuid.value, treeState.value);
        if (parent && !isFuncCallState(parent)) {
          const position = parent.steps.findIndex((step) => step.uuid === chosenStepUuid.value);
          loadAndReplaceNestedPipeline(parent.uuid, newCall.id, chosenStepState.value.configId, position);
        }
      }
    };

    const onFuncCallChange = (call: DG.FuncCall) => {
      if (chosenStepUuid.value)
        changeFuncCall(chosenStepUuid.value, call)
    }

    const isTreeReady = Vue.computed(() => treeState.value && !treeMutationsLocked.value && !isGlobalLocked.value);

    return () => (
      Vue.withDirectives(<div class='w-full h-full'>
        <RibbonPanel view={currentView.value}>
          <IconFA
            name='folder-tree'
            tooltip={treeHidden.value ? 'Show tree': 'Hide tree'}
            onClick={() => treeHidden.value = !treeHidden.value }
          />
          { isUserDeveloper.value && <IconFA
            name='bug'
            tooltip={inspectorHidden.value ? 'Show inspector': 'Hide inspector'}
            onClick={() => inspectorHidden.value = !inspectorHidden.value }
          /> }
          {isTreeReady.value &&
            treeState.value &&
            (hasSubtreeFixableInconsistencies(treeState.value, states.calls, states.consistency) ?
              <IconFA
                name='sync'
                tooltip={'Rerun tree with consistent values'}
                style={{'padding-right': '3px'}}
                onClick={() => runSubtreeWithConfirm(treeState.value!.uuid, true)}
              />:
              <IconFA
                name='forward'
                tooltip={'Run ready steps'}
                style={{'padding-right': '3px'}}
                onClick={() => runSequence(treeState.value!.uuid, false)}
              />
            )}
          {isTreeReady.value && <IconFA
            name='save'
            tooltip={'Save current state of model'}
            style={{'padding-right': '3px'}}
            onClick={saveEntireModelState}
          /> }
          {isTreeReady.value && isTreeReportable.value && <IconFA
            name='arrow-to-bottom'
            tooltip='Report all steps'
            onClick={async () => reportStep(treeState.value) }
          /> }
        </RibbonPanel>
        {treeState.value &&
        <DockManager class='block h-full'
          ref={dockRef}
          onInitFinished={handleDockInit}
          onPanelClosed={handlePanelClose}
          onUpdate:activePanelTitle={handleActivePanelChanged}
        >
          { !inspectorHidden.value &&
            <Inspector
              treeState={treeState.value}
              config={config.value}
              logs={logs.value}
              links={links.value}
              ref={inspectorInstance}
              dock-spawn-title='Inspector'
              class='h-full overflow-scroll'
              dock-spawn-dock-type='right'
              dock-spawn-dock-ratio='0.2'
            ></Inspector>
          }
          {
            treeState.value && !treeHidden.value ?
              Vue.withDirectives(<Draggable
                class="ui-div mtl-tree p-2 overflow-scroll h-full"
                style={{paddingLeft: '25px'}}

                dock-spawn-title='Steps'
                dock-spawn-panel-icon='folder-tree'
                dock-spawn-dock-type='left'
                dock-spawn-dock-ratio={0.2}
                dock-spawn-z-index={51}

                rootDroppable={false}
                treeLine
                childrenKey='steps'
                nodeKey={(stat: AugmentedStat) => stat.data.uuid}
                statHandler={restoreOpenedNodes}

                ref={treeInstance}
                modelValue={[treeState.value]}

                eachDraggable={isEachDraggable}
                eachDroppable={isEachDroppable}
                onAfter-drop={onAfterDrop}
                onClick:node={(stat) => {
                  chosenStepUuid.value = stat.data.uuid;

                  if (isFuncCallState(stat.data)) rfvHidden.value = false;
                  if (!isFuncCallState(stat.data)) pipelineViewHidden.value = false;
                }}
                onClose:node={(stat) => oldClosed.add(stat.data.uuid)}
                onOpen:node={(stat) => oldClosed.delete(stat.data.uuid)}
              >
                {
                  ({stat}: {stat: AugmentedStat}) =>
                    (
                      <TreeNode
                        stat={stat}
                        callState={states.calls[stat.data.uuid]}
                        validationStates={states.validations[stat.data.uuid]}
                        consistencyStates={states.consistency[stat.data.uuid]}
                        descriptions={states.descriptions[stat.data.uuid]}
                        style={{
                          'background-color': stat.data.uuid === chosenStepUuid.value ? '#f2f2f5' : null,
                        }}
                        isDraggable={treeInstance.value?.isDraggable(stat)}
                        isDroppable={treeInstance.value?.isDroppable(stat)}
                        isDeletable={isDeletable(stat)}
                        isReadonly={stat.data.isReadonly}
                        hasInconsistentSubsteps={!!hasSubtreeFixableInconsistencies(stat.data, states.calls, states.consistency)}
                        onAddNode={({itemId, position}) => addStep(stat.data.uuid, itemId, position)}
                        onRemoveNode={() => removeStep(stat.data.uuid)}
                        onToggleNode={() => stat.open = !stat.open}
                        onRunSubtree={(startUuid, rerunWithConsistent) => runSubtreeWithConfirm(startUuid, rerunWithConsistent)}
                        onRunStep={(uuid) => runStep(uuid)}
                        onSaveStep={(uuid) => saveSubTreeState(uuid)}
                      />
                    )
                }
              </Draggable>, [[ifOverlapping, treeMutationsLocked.value, 'Locked...']]): null
          }
          {
            !rfvHidden.value && chosenStepState.value &&
            isFuncCallState(chosenStepState.value) && chosenStepState.value.funcCall &&
              <RichFunctionView
                class={{'overflow-hidden': true, 'pseudo_hidden': isLoading.value}}
                funcCall={chosenStepState.value.funcCall!}
                uuid={chosenStepUuid.value!}
                callState={chosenStepUuid.value ? states.calls[chosenStepUuid.value] : undefined}
                callMeta={chosenStepUuid.value ? states.meta[chosenStepUuid.value] : undefined}
                viewersHook={chosenStepState.value.viewersHook}
                validationStates={states.validations[chosenStepState.value.uuid]}
                consistencyStates={states.consistency[chosenStepState.value.uuid]}
                menuActions={menuActions.value}
                buttonActions={buttonActions.value}
                isReadonly={chosenStepState.value.isReadonly}
                isTreeLocked={treeMutationsLocked.value}
                showStepNavigation={true}
                skipInit={true}
                onUpdate:funcCall={onFuncCallChange}
                onRunClicked={() => runStep(chosenStepState.value!.uuid)}
                onNextClicked={goNextStep}
                onActionRequested={runActionWithConfirmation}
                onConsistencyReset={(ioName) => consistencyReset(chosenStepUuid.value!, ioName)}
                dock-spawn-title='Step review'
                ref={rfvRef}
                view={currentView.value}
              />
          }
          {
            !pipelineViewHidden.value && chosenStepState.value && !isFuncCallState(chosenStepState.value) &&
            <PipelineView
              funcCall={chosenStepState.value.provider ? DG.Func.byName(chosenStepState.value.nqName!).prepare() : undefined}
              state={chosenStepState.value}
              uuid={chosenStepUuid.value!}
              isRoot={isRootChoosen.value}
              menuActions={menuActions.value}
              buttonActions={buttonActions.value}
              onActionRequested={runActionWithConfirmation}
              dock-spawn-title='Step sequence review'
              onProceedClicked={onPipelineProceed}
              onUpdate:funcCall={onPipelineFuncCallUpdate}
              onAddNode={({itemId, position}) => {
                addStep(chosenStepState.value!.uuid, itemId, position);
              }}
              ref={pipelineViewRef}
              view={currentView.value}
            />
          }
        </DockManager> }
      </div>, [[ifOverlapping, isGlobalLocked.value]])
    );
  },
});
