import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {Observable} from 'rxjs';
import {IRuntimeLinkController, IRuntimeMetaController, IRuntimePipelineMutationController, INameSelectorController, IRuntimeValidatorController, IFuncallActionController} from '../RuntimeControllers';
import {ItemId, NqName, RestrictionType, LinkSpecString} from '../data/common-types';
import {PipelineState, StepParallelInitialConfig, StepSequentialInitialConfig} from './PipelineInstance';

//
// Pipeline public configuration
//

export type StateItem = {
  id: ItemId;
  type?: string;
}

export type LoadedPipelineToplevelNode = {
  id: string,
  nqName: string,
}

export type PipelineSelfRef = {
  type: 'selfRef',
  selfRef: string,
  id: string,
}

// handlers

export type LoadedPipeline = (PipelineConfigurationStaticInitial | PipelineConfigurationParallelInitial | PipelineConfigurationSequentialInitial) & LoadedPipelineToplevelNode;

export type IRuntimeController = IRuntimeLinkController | IRuntimeValidatorController;
export type HandlerBase<P, R> = ((params: P) => Promise<R> | Observable<R> | R) | NqName;
export type Handler = HandlerBase<{ controller: IRuntimeLinkController }, void>;
export type Validator = HandlerBase<{ controller: IRuntimeValidatorController }, void>;
export type MetaHandler = HandlerBase<{ controller: IRuntimeMetaController }, void>;
export type MutationHandler = HandlerBase<{ controller: IRuntimePipelineMutationController }, void>;
export type SelectorHandler = HandlerBase<{ controller: INameSelectorController }, void>;
export type FunccallActionHandler = HandlerBase<{ controller: IFuncallActionController }, void>;
export type PipelineProvider = HandlerBase<{ version?: string }, LoadedPipeline>;
// TODO: utils and utils typings
export type PipelineExport = HandlerBase<{ utils: any, state: PipelineState }, void>;

export type ViewersHook = (ioName: string, type: string, viewer?: DG.Viewer, meta?: any) => void;


// link-like

export type PipelineLinkConfigurationBase<P> = {
  id: ItemId;
  from: P;
  to: P;
  not?: P;
  base?: P,
  actions?: P;
  dataFrameMutations?: boolean | string[];
  defaultRestrictions?: Record<string, RestrictionType> | RestrictionType;
  nodePriority?: number;
}

export type PipelineHandlerConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type?: 'data',
  actions?: undefined;
  handler?: Handler;
};

export type PipelineValidatorConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type: 'validator'
  handler: Validator;
};

export type PipelineMetaConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type: 'meta'
  actions?: undefined;
  handler: MetaHandler;
};

export type PipelineHookConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type?: 'data',
  base?: undefined,
  actions?: undefined;
  handler: Handler;
};

export type PipelineSelectorConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type: 'selector',
  actions?: undefined;
  handler: SelectorHandler;
};

export type PipelineLinkConfiguration<P> = PipelineHandlerConfiguration<P> | PipelineValidatorConfiguration<P> | PipelineMetaConfiguration<P> | PipelineHookConfiguration<P> | PipelineSelectorConfiguration<P>;

export type ActionInfo = {
  position: ActionPositions;
  friendlyName?: string;
  description?: string;
  menuCategory?: string;
  confirmationMessage?: string;
  icon?: string;
};

export type DataActionConfiguraion<P> = PipelineLinkConfigurationBase<P> & {
  type?: 'data',
  handler: Handler;
} & ActionInfo;

export type PipelineMutationConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type: 'pipeline',
  handler: MutationHandler;
} & ActionInfo;

export type FuncCallActionConfiguration<P> = PipelineLinkConfigurationBase<P> & {
  type: 'funccall',
  handler: FunccallActionHandler;
} & ActionInfo;

const actionPositions = ['buttons', 'menu', 'none'] as const;
export type ActionPositions = typeof actionPositions[number];

// static steps config
export type PipelineStepConfiguration<P, S> = {
  id: ItemId;
  nqName: NqName;
  friendlyName?: string;
  io?: S;
  actions?: (DataActionConfiguraion<P> | FuncCallActionConfiguration<P>)[];
  initialValues?: Record<string, any>;
  inputRestrictions?: Record<string, RestrictionType>;
  viewersHook?: ViewersHook;
};

export interface CustomExport {
  format: string,
  name: string,
  handler: PipelineExport,
}

export type PipelineConfigurationBase<P> = {
  id: ItemId;
  nqName?: NqName;
  provider?: NqName;
  approversGroup?: string;
  version?: string;
  friendlyName?: string;
  onInit?: PipelineHookConfiguration<P>;
  customExports?: CustomExport[],
  actions?: (DataActionConfiguraion<P> | PipelineMutationConfiguration<P> | FuncCallActionConfiguration<P>)[];
  states?: StateItem[];
};

// fixed pipeline

export type PipelineStaticItem<P, S, R> =
PipelineStepConfiguration<P, S> | AbstractPipelineConfiguration<P, S, R> | R;

export type AbstractPipelineStaticConfiguration<P, S, R> = {
  links?: PipelineLinkConfiguration<P>[];
  steps: PipelineStaticItem<P, S, R>[];
  type: 'static';
} & PipelineConfigurationBase<P>;

// parallel pipeline

export type ParallelItemContext = {
  disableUIAdding?: boolean;
  disableUIRemoving?: boolean;
  disableUIDragging?: boolean;
};

export type PipelineParallelItem<P, S, R> = ((PipelineStepConfiguration<P, S> | AbstractPipelineConfiguration<P, S, R> | R) & ParallelItemContext);

export type AbstractPipelineParallelConfiguration<P, S, R> = {
  initialSteps?: StepParallelInitialConfig[];
  stepTypes: PipelineParallelItem<P, S, R>[];
  links?: PipelineLinkConfiguration<P>[];
  type: 'parallel';
} & PipelineConfigurationBase<P>;

// sequential pipeline

export type SequentialItemContext = {
  disableUIAdding?: boolean;
  disableUIRemoving?: boolean;
  disableUIDragging?: boolean;
};

export type PipelineSequentialItem<P, S, R> = ((PipelineStepConfiguration<P, S> | AbstractPipelineConfiguration<P, S, R> | R) & SequentialItemContext);

export type AbstractPipelineSequentialConfiguration<P, S, R> = {
  initialSteps?: StepSequentialInitialConfig[];
  stepTypes: PipelineSequentialItem<P, S, R>[];
  links?: PipelineLinkConfiguration<P>[];
  type: 'sequential';
} & PipelineConfigurationBase<P>;

// pipeline config

export type AbstractPipelineConfiguration<P, S, R> =
AbstractPipelineStaticConfiguration<P, S, R> |
AbstractPipelineParallelConfiguration<P, S, R> |
AbstractPipelineSequentialConfiguration<P, S, R>;

export type PipelineRefInitial = {
  version?: string;
  provider: PipelineProvider | NqName;
  type: 'ref';
}

export type PipelineConfigurationStaticInitial = AbstractPipelineStaticConfiguration<LinkSpecString, never, PipelineRefInitial>;
export type PipelineConfigurationParallelInitial = AbstractPipelineParallelConfiguration<LinkSpecString, never, PipelineRefInitial>;
export type PipelineConfigurationSequentialInitial = AbstractPipelineSequentialConfiguration<LinkSpecString, never, PipelineRefInitial>;

export type PipelineConfigurationInitial = PipelineConfigurationStaticInitial | PipelineConfigurationParallelInitial | PipelineConfigurationSequentialInitial | PipelineRefInitial;

export type PipelineConfiguration = PipelineConfigurationInitial;
