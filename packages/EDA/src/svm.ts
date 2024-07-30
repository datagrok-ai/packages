/* Support vector machine (SVM) tools.
   It's developed for applying in combination with DATAGROK predictive tools.

   Training & predicting are provided by wasm-computations.

   Least square support vector machine (LS-SVM) is implemented:
     [1] Suykens, J., Vandewalle, J. "Least Squares Support Vector Machine Classifiers",
       Neural Processing Letters 9, 293-300 (1999). https://doi.org/10.1023/A:1018628609742
*/
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_trainAndAnalyzeLSSVMInWebWorker, _predictByLSSVMInWebWorker} from '../wasm/EDAAPI';

// 1. CONSTANTS

// kernel types
export const LINEAR = 0;
export const POLYNOMIAL = 1;
export const RBF = 2;
export const SIGMOID = 3;

// output-related
const CONFUSION_MATR_SIZE = 4;
const NORMALIZED_DATA_INDEX = 0;
const MEANS_INDEX = 1;
const STD_DEVS_INDEX = 2;
const MODEL_PARAMS_INDEX = 3;
const MODEL_WEIGHTS_INDEX = 4;
const PREDICTED_LABELS_INDEX = 5;
const CORRECTNESS_INDEX = 6;
const CONFUSION_MATRIX_INDEX = 7;
const TRUE_POSITIVE_INDEX = 0;
const FALSE_NEGATIVE_INDEX = 1;
const FALSE_POSITIVE_INDEX = 2;
const TRUE_NEGATIVE_INDEX = 3;

// kernel parameters indeces
const RBF_SIGMA_INDEX = 0;
const POLYNOMIAL_C_INDEX = 0;
const POLYNOMIAL_D_INDEX = 1;
const SIGMOID_KAPPA_INDEX = 0;
const SIGMOID_THETA_INDEX = 1;

// hyperparameters limits
const GAMMA_INFIMUM_LIMIT = 0;
const RBF_SIGMA_INFIMUM_LIMIT = 0;
const POLYNOMIAL_C_INFIMUM_LIMIT = 0;
const POLYNOMIAL_D_INFIMUM_LIMIT = 0;

// error messages
const WRONG_GAMMA_MESSAGE = 'gamma must be strictly positive.';
const WRONG_RBF_SIGMA_MESSAGE = 'sigma must be strictly positive.';
const WRONG_POLYNOMIAL_C_MESSAGE = 'c must be strictly positive.';
const WRONG_POLYNOMIAL_D_MESSAGE = 'd must be strictly positive.';
const WRONG_KERNEL_MESSAGE = 'incorrect kernel.';
const WRONG_LABELS_MESSAGE = 'labels must be strings of two categories.';

// names
const LABELS = 'Labels';
const PREDICTED = 'predicted';
const CORRECTNESS = 'correctness';
const CONFUSION_MATRIX_NAME = 'Confusion matrix';
const MEAN = 'mean';
const STD_DEV = 'std dev';
const MODEL_PARAMS_NAME = 'alpha';
const MODEL_WEIGHTS_NAME = 'weight';
const GAMMA = 'Gamma';
const KERNEL = 'Kernel';
const KERNEL_PARAMS = 'Kernel params';
const KERNEL_PARAM_1 = 'Kernel parameter 1';
const KERNEL_PARAM_2 = 'Kernel parameter 2';
const FEATURES_COUNT_NAME = 'Features count';
const TRAIN_SAMPLES_COUNT_NAME = 'Train samples count';
const TRAIN_ERROR = 'Train error, %';
const KERNEL_TYPE_TO_NAME_MAP = ['linear', 'polynomial', 'RBF', 'sigmoid'];
const SENSITIVITY = 'Sensitivity';
const SPECIFICITY = 'Specificity';
const BALANCED_ACCURACY = 'Balanced accuracy';
const POSITIVE_PREDICTIVE_VALUE = 'Positive predicitve value';
const NEGATIVE_PREDICTIVE_VALUE = 'Negative predicitve value';
const PREDICTION = 'prediction';

// Pack/unpack constants
const BYTES = 4;
const INTS_COUNT = 3;
const KER_PARAMS_COUNT = 2;
const MODEL_KERNEL_INDEX = 0;
const SAMPLES_COUNT_INDEX = 1;
const FEATURES_COUNT_INDEX = 2;

// misc
const INIT_VALUE = 0; // any number can be used
const LS_SVM_ADD_CONST = 1; // see [1] for more details

// 2. TOOLS

// Check LS-SVM learning hyperparameters
function checkHyperparameters(hyperparameters: any): void {
  // check gamma
  if (hyperparameters.gamma <= GAMMA_INFIMUM_LIMIT)
    throw new Error(WRONG_GAMMA_MESSAGE);

  // check kernel & its parameters
  switch (hyperparameters.kernel) {
  case LINEAR: // the case of linear kernel
    return;

  case RBF: // the case of RBF kernel
    if (hyperparameters.sigma <= RBF_SIGMA_INFIMUM_LIMIT)
      throw new Error(WRONG_RBF_SIGMA_MESSAGE);
    return;

  case POLYNOMIAL: // the case of polynomial kernel
    // check c
    if (hyperparameters.cParam <= POLYNOMIAL_C_INFIMUM_LIMIT)
      throw new Error(WRONG_POLYNOMIAL_C_MESSAGE);
      // check d
    if (hyperparameters.dParam <= POLYNOMIAL_D_INFIMUM_LIMIT)
      throw new Error(WRONG_POLYNOMIAL_D_MESSAGE);
    return;

  case SIGMOID: // the case of polynomial kernel
    return;

  default: // incorrect kernel
    throw new Error(WRONG_KERNEL_MESSAGE);
  } // switch
} // checkHyperparameters

// Returnes labels predicted by the model specified
async function predict(model: any, dataset: DG.ColumnList): Promise<DG.Column> {
  let _output: any;

  const _promise = _predictByLSSVMInWebWorker(model.kernelType, model.kernelParams,
    model.normalizedTrainData.columns, model.trainLabels, model.means, model.stdDevs,
    model.modelParams, model.modelWeights, dataset);

  await _promise.then(
    (_result) => {_output = _result;},
    (_error) => {throw new Error(`Error: ${_error}`);},
  );

  return _output;
} // predict

// Evaluate accuracy of the model
function evaluateAccuracy(model: any): void {
  const data = model.confusionMatrix.getRawData();

  // here, the classic notation is used (see https://en.wikipedia.org/wiki/Sensitivity_and_specificity)

  const TP = data[TRUE_POSITIVE_INDEX]; // true positive
  const TN = data[TRUE_NEGATIVE_INDEX]; // true negative
  const FP = data[FALSE_POSITIVE_INDEX]; // false positive
  const FN = data[FALSE_NEGATIVE_INDEX]; // false negative

  const P = TP + FN; // positive
  const N = FP + TN; // negative

  const TPR = TP / P; // true positive rate
  const TNR = TN / N; // true negative rate

  const PPV = TP / (TP + FP); // positive predicitve value
  const NPV = TN / (TN + FN); // negative predicitve value

  const ACC = (TP + TN) / (P + N); // accuracy
  const BA = (TPR + TNR) / 2; // balanced accuracy

  model.sensitivity = TPR;
  model.specificity = TNR;
  model.balancedAccuracy = BA;
  model.positivePredicitveValue = PPV;
  model.negativePredicitveValue = NPV;
  model.trainError = (1 - ACC) * 100; // train error, %
} // evaluateAccuracy

// Returns trained LS-SVM model.
async function trainAndAnalyzeModel(hyperparameters: any, dataset: DG.ColumnList,
  labels: DG.Column): Promise<any> {
  // check correctness of hyperparameter gamma
  checkHyperparameters(hyperparameters);

  // create default kernel params array
  const kernelParamsArray = [INIT_VALUE, INIT_VALUE];

  // fill kernelParams
  switch (hyperparameters.kernel) {
  case LINEAR: // no kernel parameters in the case of linear kernel
    break;

  case RBF: // sigma parameter in the case of RBF-kernel
    kernelParamsArray[RBF_SIGMA_INDEX] = hyperparameters.sigma;
    break;

  case POLYNOMIAL: // sigma parameter in the case of polynomial kernel
    kernelParamsArray[POLYNOMIAL_C_INDEX] = hyperparameters.cParam;
    kernelParamsArray[POLYNOMIAL_D_INDEX] = hyperparameters.dParam;
    break;

  case SIGMOID: // sigma parameter in the case of sigmoid kernel
    kernelParamsArray[SIGMOID_KAPPA_INDEX] = hyperparameters.kappa;
    kernelParamsArray[SIGMOID_THETA_INDEX] = hyperparameters.theta;
    break;

  default: // incorrect kernel
    throw new Error(WRONG_KERNEL_MESSAGE);
  };

  // create kernel params column
  const kernelParams = DG.Column.fromList('double', KERNEL_PARAMS, kernelParamsArray);

  // compute size of model params & precomputed weigths
  const trainCols = dataset.toList();
  const modelParamsCount = trainCols[0].length + LS_SVM_ADD_CONST;
  const precomputedWeightsCount = trainCols.length + LS_SVM_ADD_CONST;
  const confusionMatrixElementsCount = CONFUSION_MATR_SIZE;

  // call webassembly training function

  let output: any;
  const _promise = _trainAndAnalyzeLSSVMInWebWorker(hyperparameters.gamma, hyperparameters.kernel,
    kernelParams, modelParamsCount, precomputedWeightsCount, confusionMatrixElementsCount,
    dataset, labels);

  await _promise.then(
    (_result) => {output = _result;},
    (_error) => {throw new Error(`Error: ${_error}`);},
  );

  // rename output columns
  output[MEANS_INDEX].name = MEAN;
  output[STD_DEVS_INDEX].name = STD_DEV;
  output[MODEL_PARAMS_INDEX].name = MODEL_PARAMS_NAME;
  output[MODEL_WEIGHTS_INDEX].name = MODEL_WEIGHTS_NAME;

  output[PREDICTED_LABELS_INDEX].name = PREDICTED;
  output[CORRECTNESS_INDEX].name = CORRECTNESS;
  output[CONFUSION_MATRIX_INDEX].name = CONFUSION_MATRIX_NAME;

  // complete model
  const model = {
    trainGamma: hyperparameters.gamma,
    kernelType: hyperparameters.kernel,
    kernelParams: kernelParams,
    trainLabels: labels,
    normalizedTrainData: DG.DataFrame.fromColumns(output[NORMALIZED_DATA_INDEX]),
    means: output[MEANS_INDEX],
    stdDevs: output[STD_DEVS_INDEX],
    modelParams: output[MODEL_PARAMS_INDEX],
    modelWeights: output[MODEL_WEIGHTS_INDEX],
    predictedLabels: output[PREDICTED_LABELS_INDEX],
    correctness: output[CORRECTNESS_INDEX],
    confusionMatrix: output[CONFUSION_MATRIX_INDEX],
    trainError: undefined,
    featuresCount: trainCols.length,
    trainSamplesCount: trainCols[0].length,
  };

  evaluateAccuracy(model);

  return model;
} // trainAndAnalyzeModel

// Wrapper for combining the function "trainAndAnalyzeModel" with Datagrok predicitve tools
export async function getTrainedModel(hyperparameters: any, df: DG.DataFrame, labels: DG.Column): Promise<any> {
  const columns = df.columns;

  if (labels.categories.length != 2)
    throw new Error(WRONG_LABELS_MESSAGE);
  const labelNumeric : DG.Column = DG.Column.float(labels.name, labels.length);
  for (let i = 0; i < labels.length; i++)
    labelNumeric.set(i, labels.get(i) == labels.categories[0] ? -1.0 : 1.0, false);

  const model = await trainAndAnalyzeModel(hyperparameters, columns, labelNumeric);
  model.realLabels = labels;
  return model;
}

// Returns dataframe with short info about model
function getModelInfo(model: any): DG.DataFrame {
  const kernelParams = model.kernelParams.getRawData();

  return DG.DataFrame.fromColumns([
    DG.Column.fromList('double', GAMMA, [model.trainGamma]),
    DG.Column.fromStrings(KERNEL, [KERNEL_TYPE_TO_NAME_MAP[model.kernelType]]),
    DG.Column.fromList('double', KERNEL_PARAM_1, [kernelParams[0]]),
    DG.Column.fromList('double', KERNEL_PARAM_2, [kernelParams[1]]),
    DG.Column.fromList('double', FEATURES_COUNT_NAME, [model.featuresCount]),
    DG.Column.fromList('double', TRAIN_SAMPLES_COUNT_NAME, [model.trainSamplesCount]),
    DG.Column.fromList('double', TRAIN_ERROR, [model.trainError]),
    DG.Column.fromList('double', BALANCED_ACCURACY, [model.balancedAccuracy]),
    DG.Column.fromList('double', SENSITIVITY, [model.sensitivity]),
    DG.Column.fromList('double', SPECIFICITY, [model.specificity]),
    DG.Column.fromList('double', POSITIVE_PREDICTIVE_VALUE, [model.positivePredicitveValue]),
    DG.Column.fromList('double', NEGATIVE_PREDICTIVE_VALUE, [model.negativePredicitveValue]),
  ]);
}

// Show training report
export function showTrainReport(df: DG.DataFrame, packedModel: any): HTMLElement {
  const model = getUnpackedModel(packedModel);
  return DG.Viewer.form(model.modelInfo, {showNavigation: false}).root;
} // showTrainReport

// Returns trained model packed into UInt8Array
export function getPackedModel(model: any): any {
  // get principal data
  const dataCols = model.normalizedTrainData.columns;
  const samplesCount = model.trainSamplesCount;
  const featuresCount = model.featuresCount;
  const realLabelsBuffer = DG.DataFrame.fromColumns([model.realLabels]).toByteArray();
  const realLabelsSize = BYTES + realLabelsBuffer.length + 4 - realLabelsBuffer.length % 4;
  const modelInfoBuffer = getModelInfo(model).toByteArray();
  const modelInfoSize = BYTES + modelInfoBuffer.length + 4 - modelInfoBuffer.length % 4;

  /*let bufferSize = BYTES * (7 + featuresCount * samplesCount
    + 3 * featuresCount + 2 * samplesCount);*/

  // compute size of packed model
  const bufferSize = BYTES * (INTS_COUNT + KER_PARAMS_COUNT +
    samplesCount + featuresCount + featuresCount + samplesCount + LS_SVM_ADD_CONST +
    featuresCount + LS_SVM_ADD_CONST + featuresCount * samplesCount) + realLabelsSize + modelInfoSize;

  // packed model
  const result = new Uint8Array(bufferSize);
  const buffer = result.buffer;
  let offset = 0;

  // pack kernel type and sizes
  let ints = new Int32Array(buffer, offset, INTS_COUNT);
  ints[MODEL_KERNEL_INDEX] = model.kernelType;
  ints[SAMPLES_COUNT_INDEX] = samplesCount;
  ints[FEATURES_COUNT_INDEX] = featuresCount;
  offset += INTS_COUNT * BYTES;

  // pack kernel parameters
  let floats = new Float32Array(buffer, offset, KER_PARAMS_COUNT);
  floats.set(model.kernelParams.getRawData());
  offset += KER_PARAMS_COUNT * BYTES;

  // pack pack labels of training data
  floats = new Float32Array(buffer, offset, samplesCount);
  floats.set(model.trainLabels.getRawData());
  offset += samplesCount * BYTES;

  // pack mean values of training data
  floats = new Float32Array(buffer, offset, featuresCount);
  floats.set(model.means.getRawData());
  offset += featuresCount * BYTES;

  // pack standard deviations of training data
  floats = new Float32Array(buffer, offset, featuresCount);
  floats.set(model.stdDevs.getRawData());
  offset += featuresCount * BYTES;

  // pack model paramters
  floats = new Float32Array(buffer, offset, samplesCount + LS_SVM_ADD_CONST);
  floats.set(model.modelParams.getRawData());
  offset += (samplesCount + LS_SVM_ADD_CONST) * BYTES;

  // pack model's precomputed weights
  floats = new Float32Array(buffer, offset, featuresCount + LS_SVM_ADD_CONST);
  floats.set(model.modelWeights.getRawData());
  offset += (featuresCount + LS_SVM_ADD_CONST) * BYTES;

  // pack training dataset
  for (const col of dataCols) {
    floats = new Float32Array(buffer, offset, featuresCount);
    floats.set(col.getRawData());
    offset += featuresCount * BYTES;
  }

  // pack labels of training data
  ints = new Int32Array(buffer, offset, 1);
  ints[0] = realLabelsBuffer.length;
  result.set(realLabelsBuffer, offset + BYTES);
  offset += realLabelsSize;

  // pack model info
  ints = new Int32Array(buffer, offset, 1);
  ints[0] = modelInfoBuffer.length;
  result.set(modelInfoBuffer, offset + BYTES);
  offset += modelInfoSize;

  return result;
} // getPackedModel

// Returns unpacked model
function getUnpackedModel(packedModel: any): any {
  const modelBytes = packedModel.buffer;
  let offset = 0;

  // extract kernel type and sizes
  const header = new Int32Array(modelBytes, offset, INTS_COUNT);
  offset += INTS_COUNT * BYTES;
  const samplesCount = header[SAMPLES_COUNT_INDEX];
  const featuresCount = header[FEATURES_COUNT_INDEX];
  // extract parameters of kernel
  const kernelParams = DG.Column.fromFloat32Array(KERNEL_PARAMS,
    new Float32Array(modelBytes, offset, KER_PARAMS_COUNT));
  offset += KER_PARAMS_COUNT * BYTES;

  // extract training labels
  const trainLabels = DG.Column.fromFloat32Array(LABELS,
    new Float32Array(modelBytes, offset, samplesCount));
  offset += samplesCount * BYTES;

  // extract mean values of training data
  const means = DG.Column.fromFloat32Array( MEAN,
    new Float32Array(modelBytes, offset, featuresCount));
  offset += featuresCount * BYTES;

  // extract standard deviations of training data
  const stdDevs = DG.Column.fromFloat32Array( STD_DEV,
    new Float32Array(modelBytes, offset, featuresCount));
  offset += featuresCount * BYTES;

  // extract parameters of model
  const modelParams = DG.Column.fromFloat32Array( MODEL_PARAMS_NAME,
    new Float32Array(modelBytes, offset, samplesCount + LS_SVM_ADD_CONST));
  offset += (samplesCount + LS_SVM_ADD_CONST) * BYTES;

  // extract model's precomputed weights
  const modelWeights = DG.Column.fromFloat32Array( MODEL_WEIGHTS_NAME,
    new Float32Array(modelBytes, offset, featuresCount + LS_SVM_ADD_CONST));
  offset += (featuresCount + LS_SVM_ADD_CONST) * BYTES;

  // extract training data columns
  const dataCols = [];

  for (let i = 0; i < samplesCount; i++) {
    dataCols.push( DG.Column.fromFloat32Array( i.toString(),
      new Float32Array(modelBytes, offset, featuresCount)) );
    offset += featuresCount * BYTES;
  }

  const normalizedTrainData = DG.DataFrame.fromColumns(dataCols);

  // extract real training labels
  const labelsCount = new Int32Array(modelBytes, offset, 1)[0];
  const labelsBytesCount = labelsCount + 4 - labelsCount % 4;
  offset += BYTES;
  const realLabels = DG.DataFrame.fromByteArray(new Uint8Array(modelBytes, offset, labelsCount)).columns.byIndex(0);
  offset += labelsBytesCount;

  // extract model info
  const modelInfoSize = new Int32Array(modelBytes, offset, 1)[0];
  const modelInfoBytesSize = modelInfoSize + 4 - modelInfoSize % 4;
  offset += BYTES;
  const modelInfo = DG.DataFrame.fromByteArray(new Uint8Array(modelBytes, offset, modelInfoSize));
  offset += modelInfoBytesSize;

  const model = {kernelType: header[MODEL_KERNEL_INDEX],
    kernelParams: kernelParams,
    trainLabels: trainLabels,
    realLabels: realLabels,
    means: means,
    stdDevs: stdDevs,
    modelParams: modelParams,
    modelWeights: modelWeights,
    normalizedTrainData: normalizedTrainData,
    modelInfo: modelInfo,
  };

  return model;
} // getUnpackedModel

// Wrapper for combining the function "predict" with Datagrok predicitve tools
export async function getPrediction(df: DG.DataFrame, packedModel: any): Promise<DG.DataFrame> {
  const model = getUnpackedModel(new Uint8Array(packedModel));
  const resNumeric = await predict(model, df.columns);
  const res = DG.Column.string(PREDICTION, resNumeric.length);
  const categories = model.realLabels.categories;
  for (let i = 0; i < res.length; i++)
    res.set(i, resNumeric.get(i) == -1 ? categories[0] : categories[1]);


  return DG.DataFrame.fromColumns([res]);
} // getPrediction


export function isApplicableSVM(df: DG.DataFrame, labels: DG.Column): boolean {
  const columns = df.columns;
  if (!labels.matches('categorical') || labels.categories.length > 2)
    return false;
  let res: boolean = true;
  for (let i = 0; i < columns.length; i++)
    res = res && (columns.byIndex(i).matches('numerical'));
  return res;
}

export function isInteractiveSVM(df: DG.DataFrame, labels: DG.Column): boolean {
  return df.rowCount <= 1000;
}
