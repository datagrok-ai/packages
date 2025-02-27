import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {
  isFuncCallState,
  isParallelPipelineState,
  isSequentialPipelineState,
  isStaticPipelineState,
  PipelineInstanceRuntimeData,
  PipelineState,
  PipelineStateParallel,
  PipelineStateSequential,
  StepFunCallState,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/config/PipelineInstance';
import {zipSync, Zippable} from 'fflate';
import * as Utils from '@datagrok-libraries/compute-utils/shared-utils/utils';
import {ConsistencyInfo, FuncCallStateInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';

export type NodeWithPath = {
  state: PipelineState,
  pathSegments: number[],
}

function hasSteps(state: PipelineState) {
  return isParallelPipelineState(state) ||
  isSequentialPipelineState(state) ||
  isStaticPipelineState(state);
}

function _findTreeNode(
  steps: PipelineState[],
  pred: (state: PipelineState) => boolean,
  pathSegments: number[] = [],
): NodeWithPath | undefined {
  for (const [idx, stepState] of steps.entries()) {
    const currentPathSegments = [...pathSegments, idx];
    if (pred(stepState))
      return {state: stepState, pathSegments: currentPathSegments};

    if (hasSteps(stepState)) {
      const t = _findTreeNode(stepState.steps, pred, currentPathSegments);
      if (t)
        return t;
    }
  }
};

export function findNodeWithPathByUuid(uuid: string, state: PipelineState): NodeWithPath | undefined {
  return _findTreeNode([state], (state: PipelineState) => state.uuid === uuid);
};

export function findTreeNodeByPath(pathSegments: number[], state: PipelineState): NodeWithPath | undefined {
  const node = pathSegments.slice(1).reduce((acc, segment) => {
    if (acc && hasSteps(acc)) {
      acc = acc.steps[segment];

      return acc;
    }
    return undefined;
  }, state as PipelineState | undefined);

  return node ? {
    state: node,
    pathSegments,
  }: undefined;
};

export function findTreeNodeParrent(uuid: string, state: PipelineState): PipelineState | undefined {
  const notVisitedStates = [state];

  while (notVisitedStates.length > 0) {
    const currentState = notVisitedStates.pop()!;

    if (
      isParallelPipelineState(currentState) ||
        isSequentialPipelineState(currentState) ||
        isStaticPipelineState(currentState)
    ) {
      for (const item of currentState.steps) {
        if (item.uuid == uuid)
          return currentState;
      }
      notVisitedStates.push(...currentState.steps);
    }
  }
};

export function findNextStep(uuid: string, state: PipelineState): NodeWithPath | undefined {
  let prevUuid = '';
  const pred = (state: PipelineState) => {
    if (!isFuncCallState(state))
      return false;
    if (prevUuid === uuid)
      return true;
    prevUuid = state.uuid;
    return false;
  };
  return _findTreeNode([state], pred);
}

export type PipelineWithAdd = PipelineStateSequential<StepFunCallState, PipelineInstanceRuntimeData> |
PipelineStateParallel<StepFunCallState, PipelineInstanceRuntimeData>;

export const hasRunnableSteps = (data: PipelineState): data is PipelineWithAdd =>
  (isParallelPipelineState(data) || isSequentialPipelineState(data)) && !data.isReadonly && data.steps.length > 0;

export const hasAddControls = (data: PipelineState): data is PipelineWithAdd =>
  (isParallelPipelineState(data) || isSequentialPipelineState(data)) && data.stepTypes.length > 0 && !data.isReadonly;

export const couldBeSaved = (data: PipelineState): data is PipelineWithAdd => !isFuncCallState(data) && !!data.provider;

export const hasSubtreeFixableInconsistencies = (
  data: PipelineState,
  callStates: Record<string, FuncCallStateInfo | undefined>,
  consistencyStates: Record<string, Record<string, ConsistencyInfo> | undefined>,
) => {
  return _findTreeNode(
    [data],
    (state: PipelineState) => isFuncCallState(state) ?
      (!state.isReadonly && hasInconsistencies(consistencyStates[state.uuid]) && !callStates[state.uuid]?.pendingDependencies?.length) :
      false,
  );
};

export const hasInconsistencies = (consistencyStates?: Record<string, ConsistencyInfo>) => {
  const firstInconsistency = Object.values(consistencyStates || {}).find(
    (val) => val.inconsistent && (val.restriction === 'disabled' || val.restriction === 'restricted'));
  return !!firstInconsistency;
};

export async function reportStep(treeState?: PipelineState) {
  if (treeState) {
    const zipConfig = {} as Zippable;

    const reportStep = async (state: PipelineState, previousPath: string = '', idx: number = 1) => {
      if (isFuncCallState(state) && state.funcCall) {
        const funccall = state.funcCall;

        const blob = await Utils.richFunctionViewReport(
          'Excel',
          funccall.func,
          funccall,
          Utils.dfToViewerMapping(funccall),
        );

        const validatedFilename = Utils.replaceForWindowsPath(
          `${String(idx).padStart(3, '0')}_${Utils.getFuncCallDefaultFilename(funccall)}`,
        );
        const validatedFilenameWithPath = `${previousPath}/${validatedFilename}`;

        zipConfig[validatedFilenameWithPath] =
                      [new Uint8Array(await blob.arrayBuffer()), {level: 0}];
      }

      if (
        isSequentialPipelineState(state) ||
          isParallelPipelineState(state) ||
          isStaticPipelineState(state)
      ) {
        const nestedPath = `${String(idx).padStart(3, '0')}_${state.friendlyName ?? state.nqName}`;
        let validatedNestedPath = Utils.replaceForWindowsPath(nestedPath);

        if (previousPath.length > 0) validatedNestedPath = `${previousPath}/${validatedNestedPath}`;

        for (const [idx, stepState] of state.steps.entries())
          await reportStep(stepState, validatedNestedPath, idx + 1);
      }
    };

    await reportStep(treeState);

    DG.Utils.download(
      `${treeState.friendlyName ?? treeState.configId}.zip`,
      new Blob([zipSync(zipConfig)]),
    );
  }
}
