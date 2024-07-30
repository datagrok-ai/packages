// The following code is generated automatically.
// JavaScript API for call wasm-functions from the module EDA

// Imports for call wasm runtime-system: in the main stream and in webworkers
import {callWasm} from '../wasm/callWasm';
import {getCppInput, getResult} from '../wasm/callWasmForWebWorker';

export async function _initEDAAPI() {
  await initEDA();
}

export function _principalComponentAnalysis(table, columns, componentsCount, centerNum, scaleNum) {
  return callWasm(EDA, 'principalComponentAnalysis', [columns, componentsCount, centerNum, scaleNum]);
}

export async function _principalComponentAnalysisInWebWorker(table, columns, componentsCount, centerNum, scaleNum) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/principalComponentAnalysisWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['principalComponentAnalysis'].arguments,[columns, componentsCount, centerNum, scaleNum]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['principalComponentAnalysis'], e.data));
    }
  });
}

export function _error(df, col1, col2) {
  return callWasm(EDA, 'error', [col1, col2]);
}

export async function _errorInWebWorker(df, col1, col2) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/errorWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['error'].arguments,[col1, col2]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['error'], e.data));
    }
  });
}

export function _partialLeastSquareRegression(table, features, predict, componentsCount) {
  return callWasm(EDA, 'partialLeastSquareRegression', [features, predict, componentsCount]);
}

export async function _partialLeastSquareRegressionInWebWorker(table, features, predict, componentsCount) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/partialLeastSquareRegressionWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['partialLeastSquareRegression'].arguments,[features, predict, componentsCount]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['partialLeastSquareRegression'], e.data));
    }
  });
}

export function _generateDataset(kernel, kernelParams, samplesCount, featuresCount, min, max, violatorsPercentage) {
  return callWasm(EDA, 'generateDataset', [kernel, kernelParams, samplesCount, featuresCount, min, max, violatorsPercentage]);
}

export async function _generateDatasetInWebWorker(kernel, kernelParams, samplesCount, featuresCount, min, max, violatorsPercentage) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/generateDatasetWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['generateDataset'].arguments,[kernel, kernelParams, samplesCount, featuresCount, min, max, violatorsPercentage]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['generateDataset'], e.data));
    }
  });
}

export function _normalizeDataset(data) {
  return callWasm(EDA, 'normalizeDataset', [data]);
}

export async function _normalizeDatasetInWebWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/normalizeDatasetWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['normalizeDataset'].arguments,[data]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['normalizeDataset'], e.data));
    }
  });
}

export function _trainLSSVM(gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, dataset, labels) {
  return callWasm(EDA, 'trainLSSVM', [gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, dataset, labels]);
}

export async function _trainLSSVMInWebWorker(gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, dataset, labels) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/trainLSSVMWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['trainLSSVM'].arguments,[gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, dataset, labels]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['trainLSSVM'], e.data));
    }
  });
}

export function _predictByLSSVM(kernel, kernelParams, normalizedData, labels, means, stdDevs, modelParams, precomputedWeights, targetData) {
  return callWasm(EDA, 'predictByLSSVM', [kernel, kernelParams, normalizedData, labels, means, stdDevs, modelParams, precomputedWeights, targetData]);
}

export async function _predictByLSSVMInWebWorker(kernel, kernelParams, normalizedData, labels, means, stdDevs, modelParams, precomputedWeights, targetData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/predictByLSSVMWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['predictByLSSVM'].arguments,[kernel, kernelParams, normalizedData, labels, means, stdDevs, modelParams, precomputedWeights, targetData]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['predictByLSSVM'], e.data));
    }
  });
}

export function _trainAndAnalyzeLSSVM(gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, confusionMatrixElementsCount, dataset, labels) {
  return callWasm(EDA, 'trainAndAnalyzeLSSVM', [gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, confusionMatrixElementsCount, dataset, labels]);
}

export async function _trainAndAnalyzeLSSVMInWebWorker(gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, confusionMatrixElementsCount, dataset, labels) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/trainAndAnalyzeLSSVMWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['trainAndAnalyzeLSSVM'].arguments,[gamma, kernel, kernelParams, modelParamsCount, precomputedWeightsCount, confusionMatrixElementsCount, dataset, labels]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['trainAndAnalyzeLSSVM'], e.data));
    }
  });
}

export function _fitLinearRegressionParamsWithDataNormalizing(features, featureAvgs, featureStdDevs, targets, targetsAvg, targetsStdDev, paramsCount) {
  return callWasm(EDA, 'fitLinearRegressionParamsWithDataNormalizing', [features, featureAvgs, featureStdDevs, targets, targetsAvg, targetsStdDev, paramsCount]);
}

export async function _fitLinearRegressionParamsWithDataNormalizingInWebWorker(features, featureAvgs, featureStdDevs, targets, targetsAvg, targetsStdDev, paramsCount) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/fitLinearRegressionParamsWithDataNormalizingWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['fitLinearRegressionParamsWithDataNormalizing'].arguments,[features, featureAvgs, featureStdDevs, targets, targetsAvg, targetsStdDev, paramsCount]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['fitLinearRegressionParamsWithDataNormalizing'], e.data));
    }
  });
}

export function _fitLinearRegressionParams(features, targets, paramsCount) {
  return callWasm(EDA, 'fitLinearRegressionParams', [features, targets, paramsCount]);
}

export async function _fitLinearRegressionParamsInWebWorker(features, targets, paramsCount) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/fitLinearRegressionParamsWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['fitLinearRegressionParams'].arguments,[features, targets, paramsCount]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['fitLinearRegressionParams'], e.data));
    }
  });
}

export function _fitSoftmax(features, featureAvgs, featureStdDevs, targets, classesCount, iterCount, learningRate, penalty, tolerance, paramsRows, paramsCols) {
  return callWasm(EDA, 'fitSoftmax', [features, featureAvgs, featureStdDevs, targets, classesCount, iterCount, learningRate, penalty, tolerance, paramsRows, paramsCols]);
}

export async function _fitSoftmaxInWebWorker(features, featureAvgs, featureStdDevs, targets, classesCount, iterCount, learningRate, penalty, tolerance, paramsRows, paramsCols) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../wasm/workers/fitSoftmaxWorker.js', import.meta.url));
    worker.postMessage(getCppInput(EDA['fitSoftmax'].arguments,[features, featureAvgs, featureStdDevs, targets, classesCount, iterCount, learningRate, penalty, tolerance, paramsRows, paramsCols]));
    worker.onmessage = function(e) {
      worker.terminate();
      resolve(getResult(EDA['fitSoftmax'], e.data));
    }
  });
}

