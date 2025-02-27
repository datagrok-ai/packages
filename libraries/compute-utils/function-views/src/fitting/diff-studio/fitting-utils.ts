/* eslint-disable valid-jsdoc */
import {IVP, IVP2WebWorker, solveIvp} from '@datagrok/diff-grok';
import {optimizeNM} from '../optimizer-nelder-mead';
import {ARG_COL_IDX, ARG_INP_COUNT, NelderMeadInput} from './defs';
import {Extremum} from '../optimizer-misc';
import {LOSS} from '../constants';

/** Return true if in-worker fitting is applicable */
export function isWorkerApplicable(ivp: IVP | undefined, ivpWW: IVP2WebWorker | undefined): boolean {
  if ((ivp === undefined) || (ivpWW === undefined))
    return false;

  return (ivp.loop === null) && (ivp.updates === null) && (ivp.outputs === null);
}

/** Returns indices corresponding to the closest items */
function getIndices(targetArg: Float64Array, modelArg: Float64Array): Uint32Array {
  const modelCount = modelArg.length;
  const elemsCount = Math.min(targetArg.length, modelCount);
  const indices = new Uint32Array(elemsCount);
  let idxModel = 0;
  let difPrev = 0;
  let difCur = 0;

  for (let idxExp = 0; idxExp < elemsCount; ++idxExp) {
    while (true) {
      difPrev = Math.abs(modelArg[idxModel] - targetArg[idxExp]);
      ++idxModel;

      if (idxModel < modelCount) {
        difCur = Math.abs(modelArg[idxModel] - targetArg[idxExp]);

        if (difCur > difPrev) {
          --idxModel;
          break;
        } else
          difPrev = difCur;
      } else {
        --idxModel;
        break;
      }
    }

    indices[idxExp] = idxModel;
  }

  return indices;
}; // getIndices

/** Maximum absolute deviation */
export function mad(targetArg: Float64Array, targetFuncs: Float64Array[], scaleVals: Float64Array,
  modelArg: Float64Array, modelFuncs: Float64Array[]): number {
  let res = 0;
  const dim = scaleVals.length;
  let localMax = 0;

  const indices = getIndices(targetArg, modelArg);
  const argsCount = indices.length;

  for (let i = 0; i < dim; ++i) {
    localMax = 0;

    for (let k = 0; k < argsCount; ++k)
      localMax = Math.max(localMax, Math.abs(targetFuncs[i][k] - modelFuncs[i][indices[k]]));

    res = Math.max(res, localMax / scaleVals[i]);
  }

  return res;
} // mad

/** Root mean square error */
export function rmse(targetArg: Float64Array, targetFuncs: Float64Array[], scaleVals: Float64Array,
  modelArg: Float64Array, modelFuncs: Float64Array[]): number {
  let res = 0;
  const dim = scaleVals.length;
  let scale = 0;
  let sum = 0;

  const indices = getIndices(targetArg, modelArg);
  const argsCount = indices.length;

  for (let i = 0; i < dim; ++i) {
    scale = scaleVals[i];
    sum = 0;

    for (let k = 0; k < argsCount; ++k)
      sum += ((targetFuncs[i][k] - modelFuncs[i][indices[k]]) / scale)**2;

    res += sum;
  }

  return Math.sqrt(res);
} // rmse

/** Return points splitted into batches */
export function getBatches(points: Float32Array[], batchesCount: number): Float32Array[][] {
  const batches = new Array<Float32Array[]>(batchesCount);
  const samplesCount = points.length;
  const chunkSize = Math.floor(samplesCount / batchesCount);
  let remainder = samplesCount % batchesCount;

  let start = 0;
  for (let i = 0; i < batchesCount; i++) {
    const extra = remainder > 0 ? 1 : 0;
    batches[i] = points.slice(start, start + chunkSize + extra);
    start += chunkSize + extra;
    --remainder;
  }

  return batches;
} // getBatches

/** Perform Neldel-Mead optimization */
export async function fit(task: NelderMeadInput, start: Float32Array): Promise<Extremum> {
  const ivp = task.ivp2ww;
  const inputSize = ARG_INP_COUNT + ivp.deqsCount + ivp.paramNames.length;
  const ivpInputVals = new Float64Array(inputSize);
  const ivpInputNames = task.nonParamNames.concat(ivp.paramNames);
  const funcNames = task.nonParamNames.slice(ARG_INP_COUNT - 1);

  let idx = 0;
  let cur = 0;

  for (const name of ivpInputNames) {
    cur = task.fixedInputsNames.indexOf(name);
    if (cur > -1)
      ivpInputVals[idx] = task.fixedInputsVals[cur];
    else {
      cur = task.variedInputNames.indexOf(name);
      ivpInputVals[idx] = start[cur];
    }
    ++idx;
  }

  const inpIndex = task.variedInputNames.map((name) => ivpInputNames.indexOf(name));

  const outIndex = task.targetNames.slice(1).map((name) => {
    const idx = funcNames.indexOf(name);

    if (idx < 0)
      throw new Error(`Inconsistent target dataframe: no ${name} column in the model's output.`);

    return idx;
  });

  const dim = start.length;
  const targetArgVals = task.targetVals[0];
  const targetFuncVals = task.targetVals.slice(1);
  const scaleVals = task.scaleVals.slice(1);

  const metric = (task.loss == LOSS.MAD) ? mad : rmse;

  let solution: Float64Array[];

  const costFunc = async (x: Float32Array): Promise<number> => {
    for (let i = 0; i < dim; ++i)
      ivpInputVals[inpIndex[i]] = x[i];

    solution = solveIvp(ivp, ivpInputVals);

    return metric(
      targetArgVals,
      targetFuncVals,
      scaleVals,
      solution[ARG_COL_IDX],
      outIndex.map((idx) => solution[idx]),
    );
  };

  const vec = new Float32Array(dim);

  for (let i = 0; i < dim; ++i)
    vec[i] = task.variedInpMin[i] + Math.random() * (task.variedInpMax[i] - task.variedInpMin[i]);

  costFunc(vec);

  const settings = new Map<string, number>(task.settingNames.map((name, idx) => [name, task.settingVals[idx]]));

  const res = await optimizeNM(costFunc, start, settings, task.variedInpMin, task.variedInpMax);

  return res;
} // fit
