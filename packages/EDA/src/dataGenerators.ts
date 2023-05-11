// Test data generation tools

/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {checkGeneratorSVMinputs} from './utils';
import {_generateDatasetInWebWorker} from '../wasm/EDAAPI';

const SVM_GEN_FEATURES_INDEX = 0;
const SVM_GEN_LABELS_INDEX = 1;
const SVM_FEATURE_NAME = 'Feature #';
const SVM_LABEL_NAME = 'Label';

// Returns the dataframe "cars"
export function carsDataframe(): DG.DataFrame {
  return DG.DataFrame.fromColumns(
    [
      DG.Column.fromStrings('model', ['alfaromeo', 'audi', 'bmw', 'chevrolet', 'dodge1', 'dodge2', 'honda1', 'honda2', 'isuzu', 'jaguar', 'mazda', 'mercedes', 'mercury', 'mitsubishi', 'nissan1', 'nissan2', 'peugot', 'plymouth', 'porsche', 'saab', 'subaru', 'toyota1', 'toyota2', 'toyota3', 'toyota4', 'volkswagen1', 'volkswagen2', 'volvo1', 'volvo2', 'volvo3']),
      DG.Column.fromInt32Array('diesel', new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1])),
      DG.Column.fromInt32Array('turbo', new Int32Array([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1])),
      DG.Column.fromInt32Array('two.doors', new Int32Array([1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0])),
      DG.Column.fromInt32Array('hatchback', new Int32Array([1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0])),      
      DG.Column.fromFloat32Array('wheel.base', new Float32Array([94.5, 105.80000305175781, 101.19999694824219, 94.5, 93.69999694824219, 93.69999694824219, 93.69999694824219, 96.5, 94.30000305175781, 113, 93.0999984741211, 115.5999984741211, 102.69999694824219, 93.69999694824219, 94.5, 94.5, 93.69999694824219, 114.19999694824219, 89.5, 99.0999984741211, 97.19999694824219, 95.69999694824219, 95.69999694824219, 98.4000015258789, 102.4000015258789, 97.30000305175781, 100.4000015258789, 104.30000305175781, 109.0999984741211, 109.0999984741211])),
      DG.Column.fromFloat32Array('length', new Float32Array([171.1999969482422, 192.6999969482422, 176.8000030517578, 158.8000030517578, 157.3000030517578, 157.3000030517578, 150, 175.39999389648438, 170.6999969482422, 199.60000610351562, 166.8000030517578, 202.60000610351562, 178.39999389648438, 157.3000030517578, 170.1999969482422, 165.3000030517578, 157.3000030517578, 198.89999389648438, 168.89999389648438, 186.60000610351562, 172, 158.6999969482422, 166.3000030517578, 176.1999969482422, 175.60000610351562, 171.6999969482422, 180.1999969482422, 188.8000030517578, 188.8000030517578, 188.8000030517578])),
      DG.Column.fromFloat32Array('width', new Float32Array([65.5, 71.4000015258789, 64.80000305175781, 63.599998474121094, 63.79999923706055, 63.79999923706055, 64, 65.19999694824219, 61.79999923706055, 69.5999984741211, 64.19999694824219, 71.69999694824219, 68, 64.4000015258789, 63.79999923706055, 63.79999923706055, 63.79999923706055, 68.4000015258789, 65, 66.5, 65.4000015258789, 63.599998474121094, 64.4000015258789, 65.5999984741211, 66.5, 65.5, 66.9000015258789, 67.19999694824219, 68.80000305175781, 68.9000015258789])),
      DG.Column.fromFloat32Array('height', new Float32Array([52.400001525878906, 55.70000076293945, 54.29999923706055, 52, 50.79999923706055, 50.599998474121094, 52.599998474121094, 54.099998474121094, 53.5, 52.79999923706055, 54.099998474121094, 56.29999923706055, 54.79999923706055, 50.79999923706055, 53.5, 54.5, 50.599998474121094, 58.70000076293945, 51.599998474121094, 56.099998474121094, 52.5, 54.5, 53, 52, 54.900001525878906, 55.70000076293945, 55.099998474121094, 56.20000076293945, 55.5, 55.5])),
      DG.Column.fromInt32Array('curb.weight', new Int32Array([2823, 2844, 2395, 1909, 2128, 1967, 1956, 2304, 2337, 4066, 1950, 3770, 2910, 1918, 2024, 1951, 1967, 3430, 2800, 2695, 2190, 1985, 2275, 2551, 2480, 2261, 2661, 2912, 3049, 3217])),
      DG.Column.fromInt32Array('eng.size', new Int32Array([152, 136, 108, 90, 98, 90, 92, 110, 111, 258, 91, 183, 140, 92, 97, 97, 90, 152, 194, 121, 108, 92, 110, 146, 110, 97, 136, 141, 141, 145])),
      DG.Column.fromInt32Array('horsepower', new Int32Array([154, 110, 101, 70, 102, 68, 76, 86, 78, 176, 68, 123, 175, 68, 69, 69, 68, 95, 207, 110, 82, 62, 56, 116, 73, 52, 110, 114, 160, 106])),
      DG.Column.fromInt32Array('peak.rpm', new Int32Array([5000, 5500, 5800, 5400, 5500, 5500, 6000, 5800, 4800, 4750, 5000, 4350, 5000, 5500, 5200, 5200, 5500, 4150, 5900, 5250, 4400, 4800, 4500, 4800, 4500, 4800, 5500, 5400, 5300, 4800])),
      DG.Column.fromInt32Array('symbol', new Int32Array([1, 1, 2, 0, 1, 1, 1, 0, 0, 0, 1, -1, 1, 2, 1, 1, 1, 0, 3, 2, 0, 1, 0, 2, -1, 2, 0, -2, -1, -1])),
      DG.Column.fromInt32Array('city.mpg', new Int32Array([19, 19, 23, 38, 24, 31, 30, 27, 24, 15, 31, 22, 19, 37, 31, 31, 31, 25, 17, 21, 28, 35, 34, 24, 30, 37, 19, 23, 19, 26])),
      DG.Column.fromInt32Array('highway.mpg', new Int32Array([26, 25, 29, 43, 30, 38, 34, 33, 29, 19, 38, 25, 24, 41, 37, 37, 38, 25, 25, 28, 33, 39, 36, 30, 33, 46, 24, 28, 25, 27])),
      DG.Column.fromInt32Array('price', new Int32Array([16500, 17710, 16430, 6575, 7957, 6229, 7129, 8845, 6785, 35550, 7395, 31600, 16503, 5389, 7349, 7299, 6229, 13860, 37028, 12170, 7775, 5348, 7898, 9989, 10698, 7775, 13295, 12940, 19045, 22470])),
    ]);
} // carsDataframe

// Generate dataset for testing binary classifiers
export async function testDataForBinaryClassification(kernel: number, kernelParams: Array<number>, 
  name: string, samplesCount: number, featuresCount: number, min: number, 
  max: number, violatorsPercentage: number): Promise<DG.DataFrame> {

  // check inputs
  checkGeneratorSVMinputs(samplesCount, featuresCount, min, max, violatorsPercentage);
  
  // kernel params column
  const kernelParamsCol = DG.Column.fromList('double', 'kernelParams', kernelParams);
  
  // CALL WASM-COMPUTATIONS  
  let _output: any;
  let _promise = _generateDatasetInWebWorker(kernel, kernelParamsCol, 
    samplesCount, featuresCount, min, max, violatorsPercentage);

  await _promise.then(
    _result => { _output = _result; },
    _error => {  throw new Error (`Error: ${_error}`); }
  );
  
  // Rename labels column
  _output[SVM_GEN_LABELS_INDEX].name = SVM_LABEL_NAME;
  
  // Rename feature columns
  for (const col of _output[SVM_GEN_FEATURES_INDEX])
    col.name = SVM_FEATURE_NAME + col.name;

  // Create dataframe
  const df = DG.DataFrame.fromColumns(_output[SVM_GEN_FEATURES_INDEX]);
  df.name = name;  
  df.columns.add(_output[SVM_GEN_LABELS_INDEX]);

  return df;
} // testDataForMachineLearning
