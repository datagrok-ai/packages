/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import type {
  ComputationView as ComputationViewType,
  RichFunctionView as RichFunctionViewType,
  PipelineView as PipelineViewType,
  CustomFunctionView as CustomFunctionViewType,
} from '@datagrok-libraries/compute-utils';

export type ComputationView = ComputationViewType;
export type RichFunctionView = RichFunctionViewType;
export type PipelineView = PipelineViewType;
export type CustomFunctionView = CustomFunctionViewType;

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

export function createCFV(
  ...args: ConstructorParameters<typeof CustomFunctionViewType>
): CustomFunctionViewType {
  return new window.compute.CFV(...args);
};
