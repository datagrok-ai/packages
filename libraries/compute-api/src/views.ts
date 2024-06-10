/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import type {
  PipelineView as PipelineViewType,
  RichFunctionView as RichFunctionViewType,
  CompositionPipeline as CompositionPipelineType,
  PipelineCompositionConfiguration as PipelineCompositionConfigurationType,
  PipelineConfiguration as PipelineConfigurationType,
} from '@datagrok-libraries/compute-utils';

export type PipelineView = PipelineViewType;
export type RichFunctionView = RichFunctionViewType;
export type CompositionPipeline = CompositionPipelineType;
export type PipelineCompositionConfiguration = PipelineCompositionConfigurationType;
export type PipelineConfiguration = PipelineConfigurationType;

export function composeCompositionPipeline(
  ...args: Parameters<typeof CompositionPipelineType.compose>
) {
  //@ts-ignore
  return window.compute.CompositionPipeline.compose(...args);
}

export function createCompositionPipeline(
  ...args: ConstructorParameters<typeof CompositionPipelineType>
): CompositionPipelineType {
  //@ts-ignore
  return new window.compute.CompositionPipeline(...args);
};


export function createPipeline(
  ...args: ConstructorParameters<typeof PipelineViewType>
): PipelineViewType {
  //@ts-ignore
  return new window.compute.Pipeline(...args);
};

export function createRFV(
  ...args: ConstructorParameters<typeof RichFunctionViewType>
): RichFunctionViewType {
  //@ts-ignore
  return new window.compute.RFV(...args);
};
