// Regression tools

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_fitLinearRegressionParamsWithDataNormalizing} from '../wasm/EDAAPI';
import {getPlsAnalysis} from './pls/pls-tools';

// Linear regression computations limits
const FATURES_COUNT_LIMIT = 1000;
const SAMPLES_COUNT_LIMIT = 1000000;

// Default PLS components count
const PLS_COMPONENTS_COUNT = 10;

// Wasm computations specific constants (see https://eigen.tuxfamily.org/dox/classEigen_1_1LDLT.html)
const BYTES_PER_VALUE = 4; // wasm computations operates 4-byte floats
const MEMORY_SCALE = 2; // due to the features of the Eigen lib decomposition
const BUFFERS_COUNT = 1; // due to the features of the Eigen lib decomposition
const WASM_MEMORY = 268435456; // wasm buffer size specified in '../scripts/module.json'

/** Compute coefficients of linear regression */
export async function getLinearRegressionParams(features: DG.ColumnList, targets: DG.Column): Promise<Float32Array> {
  const featuresCount = features.length;
  const samplesCount = targets.length;

  const yAvg = targets.stats.avg;
  const yStdev = targets.stats.stdev;

  const params = new Float32Array(featuresCount + 1).fill(0);
  params[featuresCount] = yAvg;

  // The trivial case
  if ((yStdev === 0) || (samplesCount === 1))
    return params;

  try {
    // Analyze inputs sizes
    const inputsAnalysis = getInputsAnalysis(featuresCount, samplesCount);

    if (inputsAnalysis.toApplyPLS) {
      // Apply the PLS method
      const paramsByPLS = await getLinearRegressionParamsUsingPLS(features, targets, inputsAnalysis.components);

      let tmpSum = 0;

      // Compute bias (due to the centering feature of PLS)
      for (let i = 0; i < featuresCount; ++i) {
        params[i] = paramsByPLS[i];
        tmpSum += paramsByPLS[i] * features.byIndex(i).stats.avg;
      }

      params[featuresCount] -= tmpSum;

      return params;
    }

    // Non-constant columns data
    const nonConstFeatureColsIndeces: number[] = [];
    const nonConstFeatureCols: DG.Column[] = [];
    const nonConstFeatureAvgs = new Float32Array(featuresCount);
    const nonConstFeatureStdevs = new Float32Array(featuresCount);

    let idx = 0;
    let nonConstFeaturesCount = 0;

    // Extract non-constant columns data
    for (const col of features) {
      const stats = col.stats;

      if (stats.stdev > 0) {
        nonConstFeatureColsIndeces.push(idx);
        nonConstFeatureCols.push(col);
        nonConstFeatureAvgs[nonConstFeaturesCount] = stats.avg;
        nonConstFeatureStdevs[nonConstFeaturesCount] = stats.stdev;
        ++nonConstFeaturesCount;
      }

      ++idx;
    }

    // The trivial case
    if (nonConstFeaturesCount === 0)
      return params;

    // Compute parameters of linear regression
    const tempParams = _fitLinearRegressionParamsWithDataNormalizing(
      DG.DataFrame.fromColumns(nonConstFeatureCols).columns,
      DG.Column.fromFloat32Array('xAvgs', nonConstFeatureAvgs, nonConstFeaturesCount),
      DG.Column.fromFloat32Array('xStdevs', nonConstFeatureStdevs, nonConstFeaturesCount),
      targets,
      yAvg,
      yStdev,
      nonConstFeaturesCount + 1,
    ).getRawData();

    // Extract params taking into account non-constant columns
    for (let i = 0; i < nonConstFeaturesCount; ++i)
      params[nonConstFeatureColsIndeces[i]] = tempParams[i];

    params[featuresCount] = tempParams[nonConstFeaturesCount];
  } catch (e) {
    grok.shell.error(`Fitted the trivial model: ${e instanceof Error ? e.message : 'due to the platform issue'}`);
  }

  return params;
} // computeLinRegressionCoefs

/** Return prediction of linear regression model */
export function getPredictionByLinearRegression(features: DG.ColumnList, params: Float32Array): DG.Column {
  const featuresCount = features.length;
  if (featuresCount !== params.length - 1)
    throw new Error('Incorrect parameters count');

  const col = features.byIndex(0);
  const samplesCount = col.length;
  const prediction = new Float32Array(samplesCount);

  let rawData = col.getRawData();
  const bias = params[featuresCount];
  let weight = params[0];

  for (let i = 0; i < samplesCount; ++i)
    prediction[i] = bias + weight * rawData[i];

  for (let j = 1; j < featuresCount; ++j) {
    rawData = features.byIndex(j).getRawData();
    weight = params[j];

    for (let i = 0; i < samplesCount; ++i)
      prediction[i] += weight * rawData[i];
  }

  return DG.Column.fromFloat32Array(
    features.getUnusedName('prediction'),
    prediction,
    samplesCount,
  );
} // getPredictionByLinearRegression

/** Generate test dataset */
export function getTestDatasetForLinearRegression(rowCount: number, colCount: number,
  featuresScale: number, featuresBias: number, paramsScale: number, paramsBias: number): DG.DataFrame {
  const df = grok.data.demo.randomWalk(rowCount, colCount + 1);
  const cols = df.columns;
  const noiseCol = cols.byIndex(colCount);
  noiseCol.name = 'y (noisy)';
  const yNoisy = noiseCol.getRawData();
  const y = new Float32Array(rowCount).fill(paramsBias);

  let idx = 0;
  let scale = 0;
  let bias = 0;
  let weight = 0;

  for (const col of cols) {
    col.name = `x${idx}`;
    scale = Math.random() * featuresScale;
    bias = Math.random() * featuresBias;
    const arr = col.getRawData();
    weight = Math.random() * paramsScale;

    for (let j = 0; j < rowCount; ++j) {
      arr[j] = scale * arr[j] + bias;
      y[j] += arr[j] * weight;
    }

    ++idx;

    if (idx === colCount)
      break;
  }

  scale = Math.random() * featuresScale;
  bias = Math.random() * featuresBias;

  for (let j = 0; j < rowCount; ++j)
    yNoisy[j] = scale * yNoisy[j] + y[j];

  cols.add(DG.Column.fromFloat32Array('y', y, rowCount));

  return df;
} // getTestDatasetForLinearRegression

/** Reteurn linear regression params using the PLS method */
async function getLinearRegressionParamsUsingPLS(features: DG.ColumnList,
  targets: DG.Column, components: number): Promise<Float32Array> {
  const plsAnalysis = await getPlsAnalysis({
    table: DG.DataFrame.fromColumns([targets]),
    features: features,
    predict: targets,
    components: components,
    names: null,
  });

  return plsAnalysis.regressionCoefficients.getRawData() as Float32Array;
}

/** Check wasm-buffer overflow */
const wasmBufferOverflow = (featuresCount: number, samplesCount: number) => {
  return MEMORY_SCALE * BYTES_PER_VALUE * samplesCount * (featuresCount + BUFFERS_COUNT) >= WASM_MEMORY;
};

/** Check whether to apply the PLS method & how many components to use */
const getInputsAnalysis = (featuresCount: number, samplesCount: number) => {
  if (wasmBufferOverflow(featuresCount, samplesCount) || (featuresCount >= FATURES_COUNT_LIMIT)) {
    return {
      toApplyPLS: true,
      components: PLS_COMPONENTS_COUNT,
    };
  }

  if (samplesCount >= SAMPLES_COUNT_LIMIT) {
    return {
      toApplyPLS: true,
      components: Math.min(PLS_COMPONENTS_COUNT, featuresCount),
    };
  }

  if (samplesCount <= featuresCount) {
    return {
      toApplyPLS: true,
      components: Math.min(PLS_COMPONENTS_COUNT, samplesCount),
    };
  }

  return {
    toApplyPLS: false,
    components: PLS_COMPONENTS_COUNT,
  };
}; // getInputsAnalysis
