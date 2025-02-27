/* eslint-disable valid-jsdoc */
import * as DG from 'datagrok-api/dg';

import {IVP, IVP2WebWorker} from '@datagrok/diff-grok';
import {LOSS} from '../constants';
import {ARG_IDX, DEFAULT_SET_VAL, MIN_TARGET_COLS_COUNT, MIN_WORKERS_COUNT, NO_ERRORS,
  RESULT_CODE, WORKERS_COUNT_DOWNSHIFT} from './defs';
import {sampleParams} from '../optimizer-sampler';
import {getBatches} from './fitting-utils';
import {OptimizationResult, Extremum} from '../optimizer-misc';

/** Return dataframe summarizing fails of fitting */
export function getFailesDf(points: Float32Array[], warnings: string[]): DG.DataFrame | null {
  const failsCount = points.length;

  if (failsCount > 0) {
    const dim = points[0].length;
    const raw = new Array<Float32Array>(dim);

    for (let i = 0; i < dim; ++i)
      raw[i] = new Float32Array(failsCount);

    points.forEach((point, idx) => point.forEach((val, jdx) => raw[jdx][idx] = val));

    const failsDf = DG.DataFrame.fromColumns(raw.map((arr, idx) => DG.Column.fromFloat32Array(`arg${idx}`, arr)));
    failsDf.columns.add(DG.Column.fromStrings('Issue', warnings));

    return failsDf;
  }

  return null;
} // getFailesDf

/** Return fitted params of Diff Studio model using the Nelder-Mead method */
export async function getFittedParams(
  loss: LOSS,
  ivp: IVP,
  ivp2ww: IVP2WebWorker,
  settings: Map<string, number>,
  variedInputNames: string[],
  minVals: Float32Array,
  maxVals: Float32Array,
  fixedInputs: Record<string, number>,
  argColName: string,
  target: DG.DataFrame,
  samplesCount: number): Promise<OptimizationResult> {
  // Extract settings names & values
  const settingNames: string[] = [...settings.keys()];
  const settingVals = settingNames.map((name) => settings.get(name) ?? DEFAULT_SET_VAL);

  // Extract fixed inputs names & vals
  const fixedInputsNames: string[] = Object.keys(fixedInputs);
  const fixedInputsVals: number[] = Object.values(fixedInputs);

  // Extract target data
  const cols = target.columns;
  const colsCount = cols.length;
  const targetRowCount = target.rowCount;

  if (colsCount < MIN_TARGET_COLS_COUNT)
    throw new Error(`Not enough of target columns: ${colsCount}. Minimum: ${MIN_TARGET_COLS_COUNT}`);

  const targetNames = new Array<string>(cols.length);
  targetNames[ARG_IDX] = argColName;

  let idx = ARG_IDX + 1;
  for (const name of cols.names()) {
    if (name !== argColName) {
      targetNames[idx] = name;
      ++idx;
    }
  }

  const scaleVals = new Float64Array(colsCount);
  const targetVals = targetNames.map((name, idx) => {
    const col = cols.byName(name);
    const absMax = Math.max(Math.abs(col.stats.max), Math.abs(col.stats.min));
    scaleVals[idx] = absMax > 0 ? absMax : 1;

    const res = new Float64Array(targetRowCount);
    const raw = col.getRawData();

    for (let i = 0; i < targetRowCount; ++i)
      res[i] = raw[i];

    return res;
  });

  // Extract non-parameters names
  const t0 = `_${ivp.arg.name}0`;
  const t1 = `_${ivp.arg.name}1`;
  const h = `_h`;
  const nonParamNames = [t0, t1, h].concat(ivp.deqs.solutionNames);

  // Generate starting points
  const startingPoints = sampleParams(samplesCount, minVals, maxVals);

  // Create workers
  const nThreads = Math.min(
    Math.max(MIN_WORKERS_COUNT, navigator.hardwareConcurrency - WORKERS_COUNT_DOWNSHIFT),
    samplesCount,
  );
  const workers = new Array(nThreads).fill(null).map((_) => new Worker(new URL('workers/basic.ts', import.meta.url)));

  // Structs for optimization results
  const resultsArray: Extremum[] = [];
  const failedInitPoints: Float32Array[] = [];
  const warnings: string[] = [];
  const pointBatches = getBatches(startingPoints, nThreads);

  // Run optimization
  const promises = workers.map((w, idx) => {
    return new Promise<void>((resolve, reject) => {
      w.postMessage({
        task: {
          settingNames: settingNames,
          settingVals: settingVals,
          loss: loss,
          ivp2ww: ivp2ww,
          nonParamNames: nonParamNames,
          fixedInputsNames: fixedInputsNames,
          fixedInputsVals: fixedInputsVals,
          variedInputNames: variedInputNames,
          variedInpMin: minVals,
          variedInpMax: maxVals,
          targetNames: targetNames,
          targetVals: targetVals,
          scaleVals: scaleVals,
          samplesCount: samplesCount,
        },
        startPoints: pointBatches[idx],
      });

      w.onmessage = (e: any) => {
        w.terminate();
        if (e.data.callResult === RESULT_CODE.SUCCEED) {
          e.data.extremums.forEach((extr: Extremum) => resultsArray.push(extr));
          e.data.fitRes.forEach((res: string, i: number) => {
            if (res !== NO_ERRORS) {
              failedInitPoints.push(pointBatches[idx][i]);
              warnings.push(res);
            }
          });
        } else {
          reject(e.data.msg ?? 'error in webworker fitting');
          return;
        }
        resolve();
      };

      w.onerror = (e) => {
        w.terminate();
        console.error(e);
        reject(e);
      };
    });
  }); // promises

  await Promise.all(promises);

  return {
    extremums: resultsArray,
    fails: getFailesDf(failedInitPoints, warnings),
  };
} // getFittedParams
