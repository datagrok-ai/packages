import {multiColWebGPUSparseMatrix} from '@datagrok-libraries/math/src/webGPU/sparse-matrix/webGPU-sparse-matrix';
import {SparseMatrixResult, SparseMatrixService} from '../distance-matrix/sparse-matrix-service';
import {DistanceAggregationMethod} from '../distance-matrix/types';
import {KnownMetrics} from '../typed-metrics';
import {MCLSparseReducer} from './marcov-cluster';

onmessage = async (event) => {
  const {data, threshold, weights, aggregationMethod, distanceFnArgs, distanceFns, maxIterations, useWebGPU}:
   {data: any[][], threshold: number,
    weights: number[], aggregationMethod: DistanceAggregationMethod,
    distanceFns: KnownMetrics[], distanceFnArgs: any[], maxIterations: number, useWebGPU?: boolean} = event.data;

  console.time('sparse matrix');
  let sparse: SparseMatrixResult | null = null;
  if (useWebGPU) {
    try {
      sparse = await multiColWebGPUSparseMatrix(
        data, threshold / 100, distanceFns as any, aggregationMethod as any, weights, distanceFnArgs);
    } catch (e) {
      console.error(e);
    }
  }
  if (!sparse) { // falsback to CPU
    if (useWebGPU)
      console.error('WEBGPU sparse matrix calculation failed, falling back to CPU implementation');

    sparse = await new SparseMatrixService()
      .calcMultiColumn(data, distanceFns, threshold / 100, distanceFnArgs, weights, aggregationMethod);
  }
  console.timeEnd('sparse matrix');

  //const res = await new MCLSparseReducer({maxIterations: maxIterations ?? 5}).transform(sparse, data[0].length);
  const reducer = new MCLSparseReducer({maxIterations: maxIterations ?? 5});
  console.time('MCL');
  let res: any = null;
  if (useWebGPU) {
    try {
      res = await reducer.transformWebGPU(sparse, data[0].length);
    } catch (e) {
      console.error('webGPU MCL failed, falling back to CPU implementation');
      console.error(e);
    }
  }
  if (!res)
    res = await reducer.transform(sparse, data[0].length);
  console.timeEnd('MCL');

  postMessage({res});
};
