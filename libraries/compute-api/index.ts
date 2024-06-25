/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {testPipeline} from './src/utils';
export {testPipeline};

import * as UiUtils from './src/ui-utils';
export {UiUtils};

import {
  makeValidationResult, makeAdvice, makeRevalidation,
  ValidationInfo,
} from './src/validation';
export {
  makeValidationResult, makeAdvice, makeRevalidation,
  ValidationInfo,
};

import {
  ComputationView, RichFunctionView, PipelineView, CompositionPipeline,
  createCompView, createRFV, createPipeline, createCompositionPipeline, composeCompositionPipeline,
  PipelineCompositionConfiguration, PipelineConfiguration,
} from './src/views';
export {
  ComputationView, RichFunctionView, PipelineView, CompositionPipeline,
  createCompView, createRFV, createPipeline, createCompositionPipeline, composeCompositionPipeline,
  PipelineCompositionConfiguration, PipelineConfiguration,
};

export async function initComputeApi() {
  const initFunc = DG.Func.find({package: 'Compute', name: 'init'})[0];
  await initFunc.prepare().call();
}
