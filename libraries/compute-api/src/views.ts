/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import type {
  ComputationView as ComputationViewType,
  RichFunctionView as RichFunctionViewType,
  PipelineView as PipelineViewType,
  CompositionPipeline as CompositionPipelineType,
  PipelineCompositionConfiguration as PipelineCompositionConfigurationType,
  PipelineConfiguration as PipelineConfigurationType,
} from '@datagrok-libraries/compute-utils';

export type ComputationView = ComputationViewType;
export type RichFunctionView = RichFunctionViewType;
export type PipelineView = PipelineViewType;
export type CompositionPipeline = CompositionPipelineType;
export type PipelineCompositionConfiguration = PipelineCompositionConfigurationType;
export type PipelineConfiguration = PipelineConfigurationType;

declare global {
  interface Window {
    compute: any
  }
}

export function createCompView(
  ...args: ConstructorParameters<typeof ComputationViewType>
): ComputationViewType {
  return new window.compute.CompView(...args);
};

export function createRFV(
  ...args: ConstructorParameters<typeof RichFunctionViewType>
): RichFunctionViewType {
  return new window.compute.RFV(...args);
};

export function createPipeline(
  ...args: ConstructorParameters<typeof PipelineViewType>
): PipelineViewType {
  return new window.compute.Pipeline(...args);
};

export function createCompositionPipeline(
  ...args: ConstructorParameters<typeof CompositionPipelineType>
): CompositionPipelineType {
  return new window.compute.CompositionPipeline(...args);
};

export function composeCompositionPipeline(
  ...args: Parameters<typeof CompositionPipelineType.compose>
) {
  return window.compute.CompositionPipeline.compose(...args);
}
