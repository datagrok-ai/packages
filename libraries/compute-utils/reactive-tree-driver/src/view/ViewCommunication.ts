import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {PipelineConfigurationProcessed} from '../config/config-processing-utils';
import {ItemId, NqName} from '../data/common-types';

// view config update requests

export interface AddDynamicItem {
  event: 'addDynamicItem';
  parentUuid: string;
  itemId: ItemId;
  position: number;
}

export interface LoadDynamicItem {
  event: 'loadDynamicItem';
  parentUuid: string;
  dbId: string;
  itemId: ItemId;
  position: number;
  readonly?: boolean;
  isReplace?: boolean;
}

export type ItemMetadata = {
  title?: string,
  description?: string,
  isFavorite?: boolean,
  tags?: string[],
}

export interface SaveDynamicItem extends ItemMetadata {
  event: 'saveDynamicItem';
  uuid: string;
}

export interface RemoveDynamicItem {
  event: 'removeDynamicItem';
  uuid: string;
}

export interface MoveDynamicItem {
  event: 'moveDynamicItem';
  uuid: string;
  position: number;
}

export interface RunStep {
  event: 'runStep';
  uuid: string;
  mockResults?: Record<string, any>;
  mockDelay?: number;
}

export interface RunAction {
  event: 'runAction';
  uuid: string;
  additionalParams?: Record<string, any>;
}

export interface RunSequence {
  event: 'runSequence';
  startUuid: string;
  rerunWithConsistent?: boolean;
  includeNonNested?: boolean;
}

export interface SavePipeline extends ItemMetadata {
  event: 'savePipeline';
}

export interface LoadPipeline {
  event: 'loadPipeline';
  funcCallId: string;
  config?: PipelineConfigurationProcessed;
  readonly?: boolean;
}

export interface InitPipeline {
  event: 'initPipeline';
  provider: NqName;
  version?: number;
}

export interface ResetToConsistent {
  event: 'resetToConsistent',
  stepUuid: string;
  ioName: string;
}

export interface UpdateFuncCall {
  event: 'updateFuncCall',
  stepUuid: string;
  funcCall: DG.FuncCall,
}

export type ViewConfigCommands = AddDynamicItem | LoadDynamicItem | SaveDynamicItem | RemoveDynamicItem | MoveDynamicItem | RunStep | RunAction | RunSequence | SavePipeline | LoadPipeline | InitPipeline | ResetToConsistent | UpdateFuncCall;
