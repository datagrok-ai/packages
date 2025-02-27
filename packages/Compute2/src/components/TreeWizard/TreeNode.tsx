import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import {AugmentedStat, Status} from './types';
import {ComboPopup, IconFA} from '@datagrok-libraries/webcomponents-vue';
import {OpenIcon} from '@he-tree/vue';
import {useElementHover} from '@vueuse/core';
import {ConsistencyInfo, FuncCallStateInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';
import {ValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/data/common-types';
import {couldBeSaved, hasAddControls, PipelineWithAdd, hasInconsistencies} from '../../utils';
import {isFuncCallState} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';

const statusToIcon: Record<Status, string> = {
  ['next']: 'arrow-right',
  ['next warn']: 'arrow-right',
  ['next error']: 'arrow-right',
  [`pending`]: 'circle',
  [`pending executed`]: 'dot-circle',
  ['running']: 'hourglass-half',
  ['succeeded']: 'check-circle',
  ['succeeded info']: 'check-circle',
  ['succeeded warn']: 'dot-circle',
  ['succeeded inconsistent']: 'dot-circle',
  ['failed']: 'times-circle',
};

const statusToColor: Record<Status, string> = {
  ['next']: 'green',
  ['next warn']: 'orange',
  ['next error']: 'black',
  [`pending`]: 'gray',
  [`pending executed`]: 'gray',
  ['running']: 'blue',
  ['succeeded']: 'green',
  ['succeeded info']: 'blue',
  ['succeeded warn']: 'orange',
  ['succeeded inconsistent']: 'red',
  ['failed']: 'red',
};

const statusToTooltip: Record<Status, string> = {
  [`next`]: `This step is avaliable to run`,
  [`next warn`]: `This step is avaliable to run, but has warnings`,
  [`next error`]: `This step has validation errors`,
  ['pending']: 'This step has pending dependencies',
  ['pending executed']: 'This step has changed dependencies',
  ['running']: 'This step is running',
  ['succeeded']: 'This step is succeeded',
  ['succeeded info']: 'This step is succeeded with changes',
  ['succeeded warn']: 'This step is succeeded, but has warnings',
  ['succeeded inconsistent']: 'This step is succeeded, but has inconsistent inputs',
  ['failed']: 'Run failed',
};

const statesToStatus = (
  callState: FuncCallStateInfo,
  validationsState?: Record<string, ValidationResult>,
  consistencyStates?: Record<string, ConsistencyInfo>,
): Status => {
  if (callState.isRunning) return 'running';
  if (callState.runError)
    return 'failed';
  if (callState.pendingDependencies?.length)
    return callState.isOutputOutdated ? 'pending' : 'pending executed';
  if (!callState.isOutputOutdated) {
    if (hasInconsistencies(consistencyStates))
      return 'succeeded inconsistent';
    if (hasWarnings(validationsState) || hasErrors(validationsState))
      return 'succeeded warn';
    if (hasChanges(consistencyStates))
      return 'succeeded info';
    return 'succeeded';
  }
  if (hasErrors(validationsState))
    return 'next error';
  if (hasWarnings(validationsState) || hasInconsistencies(consistencyStates))
    return 'next warn';

  return 'next';
};

const getToolTip = (status: Status, isReadonly: boolean) => {
  if (!isReadonly || status !== 'next') return statusToTooltip[status];
  return 'This step is locked';
};

const hasWarnings = (validationsState?: Record<string, ValidationResult>) => {
  const firstWarning = Object.values(validationsState || {}).find((val) => val.warnings?.length);
  return firstWarning;
};

const hasChanges = (consistencyStates?: Record<string, ConsistencyInfo>) => {
  const firstInconsistency = Object.values(consistencyStates || {}).find(
    (val) => val.inconsistent && (val.restriction === 'info'));
  return firstInconsistency;
};

const hasErrors = (validationsState?: Record<string, ValidationResult>) => {
  const firstError = Object.values(validationsState || {}).find((val) => val.errors?.length);
  return firstError;
};

export const TreeNode = Vue.defineComponent({
  props: {
    stat: {
      type: Object as Vue.PropType<AugmentedStat>,
      required: true,
    },
    callState: {
      type: Object as Vue.PropType<FuncCallStateInfo>,
    },
    validationStates: {
      type: Object as Vue.PropType<Record<string, ValidationResult>>,
    },
    consistencyStates: {
      type: Object as Vue.PropType<Record<string, ConsistencyInfo>>,
    },
    descriptions: {
      type: Object as Vue.PropType<Record<string, string | string[]>>,
    },
    isDraggable: {
      type: Boolean,
    },
    isDroppable: {
      type: Boolean,
    },
    isDeletable: {
      type: Boolean,
    },
    isReadonly: {
      type: Boolean,
    },
    hasInconsistentSubsteps: {
      type: Boolean,
    },
  },
  emits: {
    addNode: ({itemId, position}:{itemId: string, position: number}) => ({itemId, position}),
    removeNode: () => {},
    toggleNode: () => {},
    runSubtree: (startUuid: string, rerunWithConsistent?: boolean) => {},
    runStep: (uuid: string) => {},
    saveStep: (uuid: string) => {},
  },
  setup(props, {emit}) {
    const openIcon = () => <OpenIcon
      open={props.stat.open}
      class="mtl-mr"
      //@ts-ignore
      onClick={(e) => {emit('toggleNode'); e.stopPropagation();}}
    />;

    const isRoot = Vue.computed(() => !props.stat.parent);

    const progressIcon = (status: Status, isReadOnly: boolean) => {
      return <IconFA
        name={isReadOnly ? 'lock' : statusToIcon[status]}
        animation={status === `running` ? 'spin': null}
        tooltip={getToolTip(status, isReadOnly) ?? null}
        style={{
          color: statusToColor[status],
          alignSelf: 'center',
          left: '-20px',
          position: 'absolute',
        }}
      />;
    };

    const nodeLabel = (state: AugmentedStat) =>
      state.data.friendlyName ?? state.data.configId;

    const treeNodeRef = Vue.ref(null as null | HTMLElement);
    const isHovered = useElementHover(treeNodeRef);
    const isRunnable = Vue.computed(() => props.callState?.isRunnable);

    const status = Vue.computed(() => {
      if (props.callState)
        return statesToStatus(props.callState, props.validationStates, props.consistencyStates);
    });

    return () => (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '30px',
          alignItems: 'center',
          borderBottom: '1px solid var(--steel-2)',
        }}
        ref={treeNodeRef}
      >
        { status.value && progressIcon(status.value, props.isReadonly) }
        { props.stat.children.length ? openIcon() : null }
        <span class="mtl-ml text-nowrap text-ellipsis overflow-hidden">{ props.descriptions?.title ?? nodeLabel(props.stat) }</span>
        {
          <div class='flex items-center px-2 w-fit justify-end ml-auto'>
            { ...isHovered.value ? [
              ...couldBeSaved(props.stat.data) && !isRoot.value ? [<IconFA
                name='save'
                tooltip={'Save this subtree'}
                style={{'padding-right': '3px'}}
                onClick={() => emit('saveStep', props.stat.data.uuid)}
                class='d4-ribbon-item'
              />]: [],
              ...hasAddControls(props.stat.data) ? [<ComboPopup
                caption={ui.iconFA('plus')}
                items={props.stat.data.stepTypes
                  .map((stepType) => stepType.friendlyName || stepType.nqName || stepType.configId)
                }
                onSelected={({itemIdx}) => {
                  const data = props.stat.data as PipelineWithAdd;
                  emit('addNode', {
                    itemId: data.stepTypes[itemIdx].configId,
                    position: data.steps.length,
                  });
                  isHovered.value = false;
                }}
                class='d4-ribbon-item'
              />]: [],
              ...props.isDraggable ? [<IconFA
                name='grip-vertical'
                cursor='grab'
                class='d4-ribbon-item'
              />]: [],
              ...props.isDeletable ? [<IconFA
                name='times'
                onClick={(e: Event) => {emit('removeNode'); e.stopPropagation();}}
                class='d4-ribbon-item'
              />]: [],
            ]: [] }
            { props.hasInconsistentSubsteps && !isFuncCallState(props.stat.data) && <IconFA
              name='sync'
              class='d4-ribbon-item'
              tooltip='Rerun substeps with consistent values'
              animation={props.callState?.isRunning ? 'spin': null}
              onClick={() => {
                emit('runSubtree', props.stat.data.uuid, true);
              }}
            /> }
            {
              isRunnable.value && !props.isReadonly &&
                hasInconsistencies(props.consistencyStates) && !(props.callState?.pendingDependencies?.length) &&
                <IconFA
                  name='sync'
                  tooltip={'Rerun this step with consistent inputs'}
                  style={{'padding-right': '3px'}}
                  onClick={(e) => {
                    emit('runSubtree', props.stat.data.uuid, true);
                    e.stopPropagation();
                  }}
                  class='d4-ribbon-item'
                />
            }
            {
              status.value === 'next' && !props.isReadonly && <IconFA
                name='play'
                tooltip={'Run this step'}
                style={{'padding-right': '3px'}}
                onClick={(e) => {emit('runStep', props.stat.data.uuid); e.stopPropagation();}}
                class='d4-ribbon-item'
              />
            }
          </div> }
      </div>
    );
  },
});
