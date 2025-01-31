import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import {openDB, DBSchema} from 'idb';
import {
  Viewer, InputForm,
  BigButton, IconFA,
  RibbonPanel, DockManager, MarkDown,
  ComboPopup,
  RibbonMenu,
  ifOverlapping,
  tooltip,
  Button,
} from '@datagrok-libraries/webcomponents-vue';
import './RichFunctionView.css';
import * as Utils from '@datagrok-libraries/compute-utils/shared-utils/utils';
import {History} from '../History/History';
import {computedAsync, useUrlSearchParams} from '@vueuse/core';
import {ConsistencyInfo, FuncCallStateInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';
import {FittingView} from '@datagrok-libraries/compute-utils/function-views/src/fitting-view';
import {SensitivityAnalysisView} from '@datagrok-libraries/compute-utils';
import {ScalarsPanel} from './ScalarsPanel';
import {BehaviorSubject} from 'rxjs';
import {ViewersHook} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineConfiguration';
import {ValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/data/common-types';
import {useViewersHook} from '../../composables/use-viewers-hook';
import {ViewAction} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {useLayoutDb} from '../../composables/use-layout-db';

type PanelsState = {
  historyHidden: boolean,
  helpHidden: boolean,
  formHidden: boolean,
  visibleTabLabels: string[],
  layout: string,
};

const dfBlockTitle = (dfProp: DG.Property, viewer: Record<string, string | boolean>) => viewer.title ?? dfProp.options['caption'] ?? dfProp.name ?? ' ';

type TabContent = Map<string,
  {type: 'dataframe', dfProp: DG.Property, config: Record<string, string | boolean> } |
  {type: 'scalars', scalarProps: DG.Property[]}
>;

const tabToProperties = (func: DG.Func) => {
  const map = {
    inputs: new Map() as TabContent,
    outputs: new Map() as TabContent,
  };

  const processDf = (dfProp: DG.Property, isOutput: boolean) => {
    const dfViewers = Utils.getPropViewers(dfProp).config;
    if (dfViewers.length === 0) return;

    dfViewers.forEach((dfViewer) => {
      const dfNameWithViewer = `${dfBlockTitle(dfProp, dfViewer)} / ${dfViewer['type']}`;

      const tabLabel = dfProp.category === 'Misc' ?
        dfNameWithViewer: `${dfProp.category}: ${dfNameWithViewer}`;

      if (isOutput)
        map.outputs.set(tabLabel, {type: 'dataframe', dfProp: dfProp, config: dfViewer});
      else
        map.inputs.set(tabLabel, {type: 'dataframe', dfProp: dfProp, config: dfViewer});
    });
    return;
  };

  func.inputs
    .forEach((inputProp) => {
      if (inputProp.propertyType === DG.TYPE.DATA_FRAME) processDf(inputProp, false);
    });

  func.outputs
    .forEach((outputProp) => {
      if (outputProp.propertyType === DG.TYPE.DATA_FRAME) {
        processDf(outputProp, true);
        return;
      }

      const category = outputProp.category === 'Misc' ? 'Output': outputProp.category;

      const categoryProps = map.outputs.get(category);
      if (categoryProps && categoryProps.type === 'scalars')
        categoryProps.scalarProps.push(outputProp);
      else
        map.outputs.set(category, {type: 'scalars', scalarProps: [outputProp]});
    });

  return map;
};

const LAYOUT_DB_NAME = 'ComputeDB';
const STORE_NAME = 'RFV2Layouts';

interface ComputeSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: PanelsState;
  };
}

export const RichFunctionView = Vue.defineComponent({
  name: 'RichFunctionView',
  props: {
    funcCall: {
      type: Object as Vue.PropType<DG.FuncCall>,
      required: true,
    },
    uuid: {
      type: String,
    },
    callState: {
      type: Object as Vue.PropType<FuncCallStateInfo>,
    },
    callMeta: {
      type: Object as Vue.PropType<Record<string, BehaviorSubject<any>>>,
    },
    validationStates: {
      type: Object as Vue.PropType<Record<string, ValidationResult>>,
    },
    consistencyStates: {
      type: Object as Vue.PropType<Record<string, ConsistencyInfo>>,
    },
    menuActions: {
      type: Object as Vue.PropType<Record<string, ViewAction[]>>,
    },
    buttonActions: {
      type: Object as Vue.PropType<ViewAction[]>,
    },
    isTreeLocked: {
      type: Boolean,
      default: false,
    },
    isReadonly: {
      type: Boolean,
    },
    historyEnabled: {
      type: Boolean,
      default: false,
    },
    viewersHook: {
      type: Function as Vue.PropType<ViewersHook>,
    },
    showStepNavigation: {
      type: Boolean,
    },
  },
  emits: {
    'update:funcCall': (call: DG.FuncCall) => call,
    'runClicked': () => {},
    'nextClicked': () => {},
    'actionRequested': (actionUuid: string) => actionUuid,
    'consistencyReset': (ioName: string) => ioName,
  },
  methods: {
    savePersonalState: () => {},
    loadPersonalLayout: () => {},
  },
  setup(props, {emit, expose}) {
    const {layoutDatabase} = useLayoutDb<ComputeSchema>(LAYOUT_DB_NAME, STORE_NAME);

    const currentCall = Vue.computed(() => props.funcCall);

    const tabToPropertiesMap = Vue.computed(() => tabToProperties(currentCall.value.func));

    const tabLabels = Vue.computed(() => {
      return [
        ...tabToPropertiesMap.value.inputs.keys(),
        ...tabToPropertiesMap.value.outputs.keys(),
      ];
    });

    const run = async () => {
      emit('runClicked');
    };

    const next = async () => {
      emit('nextClicked');
    };

    const formHidden = Vue.ref(false);
    const historyHidden = Vue.ref(true);
    const helpHidden = Vue.ref(true);

    const hasContextHelp = Vue.computed(() => Utils.hasContextHelp(currentCall.value.func));

    const historyRef = Vue.shallowRef(null as InstanceType<typeof History> | null);
    const helpRef = Vue.shallowRef(null as InstanceType<typeof MarkDown> | null);
    const formRef = Vue.shallowRef(null as HTMLElement | null);
    const dockRef = Vue.shallowRef(null as InstanceType<typeof DockManager> | null);
    const handlePanelClose = async (el: HTMLElement) => {
      if (el === historyRef.value?.$el) historyHidden.value = true;
      if (el === helpRef.value?.$el) helpHidden.value = true;
      if (el === formRef.value) formHidden.value = true;

      const tabIdx = visibleTabLabels.value.findIndex((label) => label === el.getAttribute('dock-spawn-title'));
      if (tabIdx >= 0) {
        visibleTabLabels.value.splice(tabIdx, 1);
        visibleTabLabels.value = [...visibleTabLabels.value];
      }
    };

    const personalPanelsStorage = (call: DG.FuncCall) => `${call.func.nqName}_personal_state`;
    const defaultPanelsStorage = (call: DG.FuncCall) => `${call.func.nqName}_default_state`;

    const getCurrentState = () => {
      const layout = dockRef?.value?.getLayout();
      if (!layout) return null;

      return {
        historyHidden: historyHidden.value,
        helpHidden: helpHidden.value,
        formHidden: formHidden.value,
        visibleTabLabels: visibleTabLabels.value,
        layout,
      };
    };

    const getSavedPersonalState = async (call: DG.FuncCall): Promise<PanelsState | null> => {
      const item = await layoutDatabase.value?.get(STORE_NAME, personalPanelsStorage(call));

      return item ?? null;
    };

    const getSavedDefaultState = async (call: DG.FuncCall): Promise<PanelsState | null> => {
      const item = await layoutDatabase.value?.get(STORE_NAME, defaultPanelsStorage(call));

      return item ?? null;
    };

    const saveDefaultState = (call: DG.FuncCall = currentCall.value) => {
      if (!dockInited.value) return;

      const state = getCurrentState();
      if (state) layoutDatabase.value?.put(STORE_NAME, state, defaultPanelsStorage(call));
    };

    const savePersonalState = (call: DG.FuncCall = currentCall.value) => {
      if (!dockInited.value) return;

      const state = getCurrentState();
      if (state) layoutDatabase.value?.put(STORE_NAME, state, personalPanelsStorage(call));
    };

    const removeSavedPersonalState = async () => {
      layoutDatabase.value?.delete(STORE_NAME, personalPanelsStorage(currentCall.value));

      await loadDefaultLayout();
    };

    let intelligentLayout = true;

    const layoutLoaded = Vue.ref(false);

    const loadPersonalLayout = async () => {
      const personalState = await getSavedPersonalState(currentCall.value);

      if (!personalState)
        layoutLoaded.value = true;

      if (!dockRef.value || !personalState || !dockInited.value) return;

      intelligentLayout = false;

      historyHidden.value = personalState.historyHidden;
      helpHidden.value = personalState.helpHidden;
      formHidden.value = personalState.formHidden;
      visibleTabLabels.value = personalState.visibleTabLabels;

      await Vue.nextTick();

      await dockRef.value.useLayout(personalState.layout);

      intelligentLayout = true;
      layoutLoaded.value = true;
    };

    const loadDefaultLayout = async () => {
      const defaultState = await getSavedDefaultState(currentCall.value);
      if (!dockRef.value || !defaultState || !dockInited.value) return;

      intelligentLayout = false;

      historyHidden.value = defaultState.historyHidden;
      helpHidden.value = defaultState.helpHidden;
      formHidden.value = defaultState.formHidden;
      visibleTabLabels.value = defaultState.visibleTabLabels;

      await Vue.nextTick();

      await dockRef.value.useLayout(defaultState.layout);

      intelligentLayout = true;
    };

    expose({
      savePersonalState,
      loadPersonalLayout,
    });

    const dockInited = Vue.ref(false);

    const visibleTabLabels = Vue.shallowRef([] as string[]);

    const helpText = Vue.ref(null as null | string);

    Vue.watch(currentCall, async (_, oldCall) => {
      Utils.getContextHelp(currentCall.value.func).then((loadedHelp) => {
        helpText.value = loadedHelp ?? null;
      });

      if (oldCall) savePersonalState(oldCall);
      visibleTabLabels.value = [...tabLabels.value];
    }, {immediate: true});

    const triggerSaveDefault = Vue.ref(false);
    Vue.watch(triggerSaveDefault, async () => {
      saveDefaultState();
      await loadPersonalLayout();
    }, {flush: 'post'});

    const handleDockInit = async () => {
      layoutLoaded.value = false;
      dockInited.value = true;
      triggerSaveDefault.value = !triggerSaveDefault.value;
    };

    Vue.onBeforeUnmount(() => {
      savePersonalState(currentCall.value);
    });

    const {setViewerRef} = useViewersHook(
      Vue.toRef(props, 'viewersHook'),
      Vue.toRef(props, 'callMeta'),
      currentCall,
    );

    const callMeta = Vue.computed(() => props.callMeta);

    const isOutputOutdated = Vue.computed(() => props.callState?.isOutputOutdated);
    const isRunning = Vue.computed(() => props.callState?.isRunning);
    const isRunnable = Vue.computed(() => props.callState?.isRunnable);

    const validationState = Vue.computed(() => props.validationStates);

    const currentFunc = Vue.computed(() => currentCall.value.func);

    const features = Vue.computed(() => Utils.getFeatures(currentFunc.value));
    const isSAenabled = Vue.computed(() => Utils.getFeature(features.value, 'sens-analysis', false));
    const isReportEnabled = Vue.computed(() => Utils.getFeature(features.value, 'export', true));
    const isFittingEnabled = Vue.computed(() => Utils.getFeature(features.value, 'fitting', false));
    const menuActions = Vue.computed(() => props.menuActions);
    const buttonActions = Vue.computed(() => props.buttonActions);

    const menuIconStyle = {width: '15px', display: 'inline-block', textAlign: 'center'};

    const viewerTabLabels = Vue.computed(() =>
      [
        ...currentCall.value.inputParams.values(),
        ...currentCall.value.outputParams.values(),
      ].filter((param) => param.property.propertyType === DG.TYPE.DATA_FRAME));

    return () => {
      let lastCardLabel = null as string | null;
      let scalarCardCount = 0;

      const getElementToDock = () => {
        return intelligentLayout && lastCardLabel &&
        visibleTabLabels.value.includes(lastCardLabel) &&
        scalarCardCount < 3 ? lastCardLabel: null;
      };

      const getDockRatio = () => {
        if (!intelligentLayout) return null;

        return lastCardLabel && scalarCardCount < 3 ? 0.5: 0.15;
      };

      const getDockStrategy = (categoryProps: DG.Property[]) => {
        if (!intelligentLayout) return 'fill';

        if (viewerTabLabels.value.length === 0) return null;

        if (categoryProps.length > 3 || scalarCardCount > 3) return 'fill';

        if (!lastCardLabel) return 'down';

        return scalarCardCount < 3 ? 'right': 'down';
      };

      const getDf = (name: string) => {
        const val = currentCall.value.inputs[name] ?? currentCall.value.outputs[name];
        return val ? Vue.markRaw(val) : val;
      }

      return (
        <div class='w-full h-full flex'>
          <RibbonMenu groupName='Panels'>
            <span
              onClick={() => formHidden.value = !formHidden.value}
              class={'flex justify-between w-full'}
            >
              <div> <IconFA name='sign-in' style={menuIconStyle}/> Show inputs </div>
              { !formHidden.value && <IconFA name='check'/>}
            </span>
            <span
              onClick={() => visibleTabLabels.value = [...tabLabels.value]}
              class={'flex justify-between'}
            >
              <div> <IconFA name='sign-out'
                style={menuIconStyle}/> Show output tabs </div>
              { visibleTabLabels.value.length === tabLabels.value.length && <IconFA name='check'/>}
            </span>
            { hasContextHelp.value && <span
              onClick={() => helpHidden.value = !helpHidden.value}
              class={'flex justify-between'}
            >
              <div> <IconFA name='question' style={menuIconStyle}/> Show help </div>
              { !helpHidden.value && <IconFA name='check'/>}
            </span> }
            { props.historyEnabled && <span
              onClick={() => historyHidden.value = !historyHidden.value}
              class={'flex justify-between'}
            >
              <div> <IconFA name='history' style={menuIconStyle}/> Show history </div>
              { !historyHidden.value && <IconFA name='check'/>}
            </span> }
            <span onClick={removeSavedPersonalState}>
              <IconFA name='eraser' style={{'padding-right': '3px'}}/>
              <span> Reset layout </span>
            </span>
          </RibbonMenu>
          { menuActions.value && Object.entries(menuActions.value).map(([category, actions]) =>
            <RibbonMenu groupName={category}>
              {
                actions.map((action) => Vue.withDirectives(<span onClick={() => emit('actionRequested', action.uuid)}>
                  <div> { action.icon && <IconFA name={action.icon} style={menuIconStyle}/> } { action.friendlyName ?? action.uuid } </div>
                </span>, [[tooltip, action.description]]))
              }
            </RibbonMenu>)
          }
          <RibbonPanel>
            { isReportEnabled.value && !isOutputOutdated.value && <ComboPopup
              caption={ui.iconFA('arrow-to-bottom')}
              items={['Excel']}
              onSelected={({item: format}) => {
                Utils.richFunctionViewReport(
                  format,
                  currentCall.value.func,
                  currentCall.value,
                  Utils.dfToViewerMapping(currentCall.value),
                ).then((blob) =>
                  DG.Utils.download(`${currentCall.value.func.nqName} -
                  ${Utils.getStartedOrNull(currentCall.value) ?? 'Not completed'}.xlsx`, blob));
              }}
              tooltip='Generate a report for the current step'
            />}
            { isSAenabled.value && <IconFA
              name='analytics'
              onClick={() => SensitivityAnalysisView.fromEmpty(currentFunc.value)}
              tooltip='Run sensitivity analysis'
            />}
            { isFittingEnabled.value && <IconFA
              name='chart-line'
              onClick={() => FittingView.fromEmpty(currentFunc.value)}
              tooltip='Fit inputs'
            />}
            { hasContextHelp.value && <IconFA
              name='question'
              tooltip={ helpHidden.value ? 'Open help panel' : 'Close help panel' }
              onClick={() => helpHidden.value = !helpHidden.value}
              style={{'background-color': !helpHidden.value ? 'var(--grey-1)': null}}
            /> }
            { props.historyEnabled && <IconFA
              name='history'
              tooltip='Open history panel'
              onClick={() => historyHidden.value = !historyHidden.value}
              style={{'background-color': !historyHidden.value ? 'var(--grey-1)': null}}
            /> }
          </RibbonPanel>
          <DockManager
            key={props.uuid}
            onPanelClosed={handlePanelClose}
            onInitFinished={handleDockInit}
            ref={dockRef}
            class={{ 'pseudo_hidden': !layoutLoaded.value }}
          >
            { !historyHidden.value &&
              <History
                func={currentCall.value.func}
                showActions
                showBatchActions
                isHistory
                onRunChosen={(chosenCall) => emit('update:funcCall', chosenCall)}
                dock-spawn-dock-type='right'
                dock-spawn-dock-ratio={0.2}
                dock-spawn-title='History'
                dock-spawn-panel-icon='history'
                ref={historyRef}
                class='overflow-scroll h-full'
              /> }

            { !formHidden.value &&
              <div
                class='flex flex-col p-2 overflow-scroll h-full'
                dock-spawn-dock-type='left'
                dock-spawn-dock-ratio={0.2}
                dock-spawn-title='Inputs'
                dock-spawn-panel-icon='sign-in-alt'
                ref={formRef}
              >
                {
                  Vue.withDirectives(<InputForm
                    funcCall={currentCall.value}
                    callMeta={callMeta.value}
                    validationStates={validationState.value}
                    consistencyStates={props.consistencyStates}
                    onActionRequested={(actionUuid) => emit('actionRequested', actionUuid)}
                    onConsistencyReset={(ioName) => emit('consistencyReset', ioName)}
                    isReadonly={props.isReadonly}
                  />, [[ifOverlapping, isRunning.value, 'Recalculating...']])
                }
                <div class='flex sticky bottom-0 justify-end'>
                  {
                    buttonActions.value?.map((action) => Vue.withDirectives(
                      <Button onClick={() => emit('actionRequested', action.uuid)}>
                        { action.icon && <IconFA name={action.icon} /> }
                        { action.friendlyName ?? action.uuid }
                      </Button>
                      , [[tooltip, action.description]]))
                  }
                  {
                    <BigButton
                      isDisabled={!isRunnable.value || isRunning.value || props.isTreeLocked || props.isReadonly}
                      onClick={run}
                    >
                      { isOutputOutdated.value ? 'Run':'Rerun' }
                    </BigButton>
                  }
                  {
                    props.showStepNavigation && !isOutputOutdated.value &&
                      <BigButton
                        onClick={next}
                      >
                        Next
                      </BigButton>
                  }
                </div>
              </div> }

            {
              visibleTabLabels.value
                .map((tabLabel) => ({tabLabel, tabContent: tabToPropertiesMap.value.inputs.get(tabLabel) ??
                tabToPropertiesMap.value.outputs.get(tabLabel)!, isInput: !!tabToPropertiesMap.value.inputs.has(tabLabel)}))
                .map(({tabLabel, tabContent, isInput}) => {
                  if (tabContent.type === 'dataframe') {
                    const options = tabContent.config;
                    const dfProp = tabContent.dfProp;
                    return <div
                      class='flex flex-col pl-2 h-full w-full'
                      dock-spawn-title={tabLabel}
                      dock-spawn-panel-icon={isInput ? 'sign-in-alt': 'sign-out-alt'}
                    >
                      {
                        Vue.withDirectives(<Viewer
                          type={options['type'] as string}
                          options={options}
                          dataFrame={getDf(dfProp.name)}
                          class='w-full'
                          onViewerChanged={(v) => setViewerRef(v, dfProp.name, options['type'] as string)}
                        />, [[ifOverlapping, isRunning.value, 'Recalculating...']])
                      }
                    </div>;
                  }

                  if (tabContent.type === 'scalars') {
                    const categoryProps = tabContent.scalarProps;

                    const panel = <ScalarsPanel
                      class='h-full overflow-scroll'
                      categoryScalars={categoryProps}
                      funcCall={currentCall.value}
                      dock-spawn-panel-icon='sign-out-alt'
                      dock-spawn-title={tabLabel}
                      dock-spawn-dock-to={getElementToDock()}
                      dock-spawn-dock-type={getDockStrategy(categoryProps)}
                      dock-spawn-dock-ratio={getDockRatio()}
                    />;

                    if (categoryProps.length < 3) {
                      scalarCardCount += categoryProps.length;
                      lastCardLabel = tabLabel;
                    }

                    return Vue.withDirectives(panel, [[ifOverlapping, isRunning.value, 'Recalculating...']]);
                  }
                })
            }
            { !helpHidden.value && helpText.value ?
              <MarkDown
                markdown={helpText.value}
                dock-spawn-title='Help'
                dock-spawn-dock-type='right'
                dock-spawn-dock-ratio={0.15}
                ref={helpRef}
              /> : null
            }
          </DockManager>
        </div>
      );
    };
  },
});
