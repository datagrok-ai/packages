import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';
import {DockManager, IconFA, MarkDown, RibbonMenu, tooltip} from '@datagrok-libraries/webcomponents-vue';
import * as Utils from '@datagrok-libraries/compute-utils/shared-utils/utils';
import {History} from '../History/History';
import {hasAddControls, PipelineWithAdd} from '../../utils';
import {isParallelPipelineState, isSequentialPipelineState, PipelineState, ViewAction} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {computedAsync} from '@vueuse/core';


export const PipelineView = Vue.defineComponent({
  name: 'PipelineView',
  props: {
    funcCall: {
      type: Object as Vue.PropType<DG.FuncCall | undefined>,
      required: true,
    },
    state: {
      type: Object as Vue.PropType<PipelineState>,
      required: true,
    },
    isRoot: {
      type: Boolean,
      required: true,
    },
    uuid: {
      type: String,
    },
    menuActions: {
      type: Object as Vue.PropType<Record<string, ViewAction[]>>,
    },
    buttonActions: {
      type: Object as Vue.PropType<ViewAction[]>,
    },
    view: {
      type: DG.ViewBase,
      required: true,
    },
  },
  emits: {
    'update:funcCall': (call: DG.FuncCall) => call,
    'proceedClicked': () => {},
    'actionRequested': (actionUuid: string) => actionUuid,
    'addNode': ({itemId, position}:{itemId: string, position: number}) => ({itemId, position}),
  },
  setup(props, {emit}) {
    const historyHidden = Vue.ref(true);
    const helpHidden = Vue.ref(true);
    const functionsHidden = Vue.ref(true);
    const historyRef = Vue.shallowRef(null as InstanceType<typeof History> | null);
    const helpRef = Vue.shallowRef(null as InstanceType<typeof MarkDown> | null);
    const functionsRef = Vue.shallowRef(null as HTMLElement | null);
    const state = Vue.computed(() => props.state);
    const menuActions = Vue.computed(() => props.menuActions);
    const buttonActions = Vue.computed(() => props.buttonActions);
    const menuIconStyle = {width: '15px', display: 'inline-block', textAlign: 'center'};
    const currentView = Vue.shallowRef(props.view);

    const hoveredFunc = Vue.shallowRef(null as DG.Func | null);

    const helpText = computedAsync(async () => {
      if (!hoveredFunc.value) return null;

      return Utils.getContextHelp(hoveredFunc.value);
    }, null);

    const handlePanelClose = async (el: HTMLElement) => {
      if (el === historyRef.value?.$el) historyHidden.value = true;
      if (el === helpRef.value?.$el) helpHidden.value = true;
    };

    const hasInnerStep = Vue.computed(() =>
      (isParallelPipelineState(state.value) || isSequentialPipelineState(state.value)) &&
      state.value.steps.length > 0,
    );

    const cardsClasses = 'grok-app-card grok-gallery-grid-item-wrapper pr-4';

    return () => (
      <div class='w-full h-full flex'>
        <DockManager
          onPanelClosed={handlePanelClose}
          key={props.uuid}
        >
          { (!historyHidden.value && props.funcCall) &&
            <History
              func={props.funcCall.func}
              showActions
              showBatchActions
              isHistory
              onRunChosen={(chosenCall) => emit('update:funcCall', chosenCall)}
              dock-spawn-dock-type='right'
              dock-spawn-dock-ratio={0.7}
              dock-spawn-title='History'
              dock-spawn-panel-icon='history'
              ref={historyRef}
              class='overflow-scroll h-full'
            /> }
          { hasAddControls(state.value) && !functionsHidden.value && <div
            class={'grok-gallery-grid'}
            dock-spawn-title='Steps to add'
            dock-spawn-dock-type='right'
            dock-spawn-dock-ratio={0.7}
            ref={functionsRef}
          >
            { state.value.stepTypes
              .map((stepType, idx) => {
                const func = stepType.nqName ? DG.Func.byName(stepType.nqName): null;
                const language = func instanceof DG.Script ? func.language: 'javascript';
                const iconBackground = `background-image: url("/images/entities/${language}.png"); padding-right: 3px;`;

                return <div
                  class='p-2 border-solid border border-[#dbdcdf] m-4 hover:bg-[#F2F2F5]'
                  style={{width: '208px'}}
                  onMouseover={() => hoveredFunc.value = func}
                  onMouseleave={() => hoveredFunc.value = null}
                >
                  <div class='flex flex-col'>
                    <div class='flex flex-row justify-between'>
                      <div class='flex flex-row items-center'>
                        { func ?
                          <i style={iconBackground} class={'grok-icon image-icon'}></i>:
                          <IconFA style={{'padding-right': '3px'}} name='folder-tree' />
                        }
                        <div>
                          <span class='text-[#2083d5]'> {stepType.friendlyName ?? stepType.configId} </span>
                        </div>
                      </div>
                      <div class='flex flex-row'>
                        { func?.options.help && <IconFA
                          class='d4-ribbon-item'
                          name='question-circle'
                          tooltip={helpText.value}
                          style={{'padding-left': '5px'}}
                        />
                        }
                        <IconFA
                          class='d4-ribbon-item'
                          name='plus'
                          tooltip='Add step to the tree'
                          onClick={() => {
                            const data = state.value as PipelineWithAdd;
                            emit('addNode', {
                              itemId: data.stepTypes[idx].configId,
                              position: data.steps.length,
                            });
                          }}
                          style={{'padding-left': '5px'}}
                        />
                      </div>
                    </div>
                    { func && <label class='description'> {func.description} </label> }
                  </div>
                </div>;
              })
            }
          </div>
          }
          { menuActions.value && Object.entries(menuActions.value).map(([category, actions]) =>
            <RibbonMenu groupName={category} view={currentView.value}>
              {
                actions.map((action) => Vue.withDirectives(
                  <span onClick={() => emit('actionRequested', action.uuid)}>
                    <div> { action.icon && <IconFA name={action.icon} style={menuIconStyle}/> } { action.friendlyName ?? action.uuid } </div>
                  </span>, [[tooltip, action.description]]))
              }
            </RibbonMenu>)
          }
          <div
            dock-spawn-hide-close-button
            dock-spawn-dock-type='fill'
            dock-spawn-title='Actions'
            {...{mode: 'Card'}}
            class={'p-2'}
            style={{overflow: 'auto'}}
          >
            <div
              style={{minWidth: '200px'}}
            >
              <span>
              This is a sequence of steps. You may:
              </span>

              <div class={'grok-gallery-grid'}>
                { props.funcCall &&
                  <div
                    class={cardsClasses}
                    onClick={() => historyHidden.value = false}
                  >
                    <IconFA name='history' class={'d4-picture'} />
                    <div> Load completed run </div>
                  </div> }
                { buttonActions.value?.map((action) => Vue.withDirectives(
                  <div
                    class={cardsClasses}
                    onClick={() => emit('actionRequested', action.uuid)}
                  >
                    <IconFA name={action.icon ?? 'circle'} class={'d4-picture'} />
                    <div> { action.friendlyName ?? action.uuid } </div>
                  </div>, [[tooltip, action.description]]))
                }
              </div>

              { hasAddControls(state.value) && <div
                class={cardsClasses}
                onClick={() => functionsHidden.value = false}
              >
                <IconFA name='plus' class={'d4-picture'} />
                <div> Choose a step to add </div>
              </div> }
              { hasInnerStep.value && <div
                class={cardsClasses}
                onClick={() => emit('proceedClicked')}
              >
                <IconFA name='plane-departure' class={'d4-picture'} />
                <div> Proceed to the sequence's first step </div>
              </div> }
            </div>
          </div>
        </DockManager>
      </div>
    );
  },
});
