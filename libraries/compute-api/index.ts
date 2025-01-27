/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

type ConstructorTypeOf<T> = new (...args:any[]) => T;

declare global {
  interface Window {
    compute: {
      makeValidationResult2: typeof makeValidationResult2,
      makeAdvice2: typeof makeAdvice2,
      mergeValidationResults2: typeof mergeValidationResults2,

      makeModel: typeof makeModel,
    },
  }
}

import {
  makeValidationResult2, makeAdvice2, mergeValidationResults2,
} from './src/validation2';
export {
  makeValidationResult2, makeAdvice2, mergeValidationResults2,
};

import {
  makeModel,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver';
export {
  makeModel,
};

export type {
  PipelineConfiguration, IRuntimeLinkController, IRuntimeMetaController,
  IRuntimeValidatorController, IRuntimePipelineMutationController,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/index';

export async function initComputeApi() {
  const initFunc = DG.Func.find({package: 'Compute', name: 'init'})[0];
  if (initFunc)
    await initFunc.prepare().call();
}
