/** the Nelder-Mead optimizer */
import * as DG from 'datagrok-api/dg';
import {Extremum, OptimizationResult, InconsistentTables} from './optimizer-misc';
import {optimizeNM, NelderMeadSettings} from './optimizer-nelder-mead';
import {sampleParams} from './optimizer-sampler';


export function performNelderMeadOptimization(
  objectiveFunc: (x: Float32Array) => {likelihood: number, residuals: number[]},
  paramsBottom: Float32Array,
  paramsTop: Float32Array,
  settings: NelderMeadSettings,
  samplesCount: number = 1,
  initialValues: Float32Array | null = null,
  infiniteFirst: boolean = true,
): OptimizationResult {
  const params = sampleParams(samplesCount, paramsTop, paramsBottom);

  const extremums: Extremum[] = [];
  const warnings: string[] = [];
  const failedInitPoint: Float32Array[] = [];
  let failsCount = 0;
  let failsDF: DG.DataFrame | null = null;
  let i: number;

  for (i = 0; i < samplesCount; ++i) {
    try {
      if (i === 0 && infiniteFirst) {
        const infCasePrms = initialValues === null ? params[i] : initialValues;
        const paramsB = new Float32Array(initialValues!.length).map((_) => -Infinity);
        const paramsT = new Float32Array(initialValues!.length).map((_) => +Infinity);
        extremums.push(optimizeNM(objectiveFunc, infCasePrms, settings, paramsB, paramsT));
      } else
        extremums.push(optimizeNM(objectiveFunc, params[i], settings, paramsBottom, paramsTop));
    } catch (e) {
      if (e instanceof InconsistentTables)
        throw new Error(`Inconsistent dataframes: ${e.message}`);

      ++failsCount;
      warnings.push((e instanceof Error) ? e.message : 'Platform issue');
      failedInitPoint.push(params[i]);
    }
  }

  if (failsCount > 0) {
    const dim = paramsTop.length;
    const raw = new Array<Float32Array>(dim);

    for (let i = 0; i < dim; ++i)
      raw[i] = new Float32Array(failsCount);

    failedInitPoint.forEach((point, idx) => point.forEach((val, jdx) => raw[jdx][idx] = val));
    failsDF = DG.DataFrame.fromColumns(raw.map((arr, idx) => DG.Column.fromFloat32Array(`arg${idx}`, arr)));
    failsDF.columns.add(DG.Column.fromStrings('Issue', warnings));
  }

  return {
    extremums: extremums,
    fails: failsDF,
  };
}
