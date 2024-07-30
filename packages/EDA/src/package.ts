/* eslint-disable camelcase */
/* eslint-disable max-len */
/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_initEDAAPI} from '../wasm/EDAAPI';
import {computePCA} from './eda-tools';
import {addPrefixToEachColumnName, addOneWayAnovaVizualization} from './eda-ui';
import {LINEAR, RBF, POLYNOMIAL, SIGMOID,
  getTrainedModel, getPrediction, isApplicableSVM, isInteractiveSVM, showTrainReport, getPackedModel} from './svm';

import {PLS_ANALYSIS} from './pls/pls-constants';
import {runMVA, runDemoMVA, getPlsAnalysis, PlsOutput} from './pls/pls-tools';

import {oneWayAnova} from './stat-tools';
import {getDbscanWorker} from '@datagrok-libraries/math';

import {DistanceAggregationMethod, DistanceAggregationMethods} from '@datagrok-libraries/ml/src/distance-matrix/types';
import {MultiColumnDimReductionEditor} from
  '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/multi-column-dim-reduction-editor';
import {multiColReduceDimensionality} from
  '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import {KnownMetrics} from '@datagrok-libraries/ml/src/typed-metrics';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';

import {runKNNImputer} from './missing-values-imputation/ui';
import {MCLEditor} from '@datagrok-libraries/ml/src/MCL/mcl-editor';
import {markovCluster} from '@datagrok-libraries/ml/src/MCL/clustering-view';
import {MCL_OPTIONS_TAG, MCLSerializableOptions} from '@datagrok-libraries/ml/src/MCL';

import {getLinearRegressionParams, getPredictionByLinearRegression} from './regression';
import {SoftmaxClassifier} from './softmax-classifier';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: init
export async function init(): Promise<void> {
  await _initEDAAPI();
}

//top-menu: ML | Cluster | DBSCAN...
//name: DBSCAN
//description: Density-based spatial clustering of applications with noise (DBSCAN)
//input: dataframe df
//input: column xCol {type: numerical}
//input: column yCol {type: numerical}
//input: double epsilon = 0.02 {caption: Epsilon} [The maximum distance between two samples for them to be considered as in the same neighborhood.]
//input: int minPts = 4 {caption: Minimum points} [The number of samples (or total weight) in a neighborhood for a point to be considered as a core point.]
//output: column cluster
export async function dbScan(df: DG.DataFrame, xCol: DG.Column, yCol: DG.Column, epsilon: number, minPts: number) {
  const x = xCol.getRawData() as Float32Array;
  const y = yCol.getRawData() as Float32Array;
  const res = await getDbscanWorker(x, y, epsilon, minPts);
  const clusterColName = df.columns.getUnusedName('Cluster (DBSCAN)');
  const cluster = DG.Column.fromInt32Array(clusterColName, res);
  df.columns.add(cluster);
  return cluster;
}

//top-menu: ML | Analyze | PCA...
//name: PCA
//description: Principal component analysis (PCA)
//input: dataframe table
//input: column_list features {type: numerical}
//input: int components = 2 {caption: Components} [Number of components.]
//input: bool center = false [Indicating whether the variables should be shifted to be zero centered.]
//input: bool scale = false [Indicating whether the variables should be scaled to have unit variance.]
export async function PCA(table: DG.DataFrame, features: DG.ColumnList, components: number, center: boolean, scale: boolean): Promise<void> {
  const pcaTable = await computePCA(table, features, components, center, scale);
  addPrefixToEachColumnName('PC', pcaTable.columns);

  if (table.id === null) // table is loaded from a local file
    grok.shell.addTableView(pcaTable);
  else {
    const cols = table.columns;

    for (const col of pcaTable.columns) {
      col.name = cols.getUnusedName(col.name);
      cols.add(col);
    }
  }
}

//name: DBSCAN clustering
//tags: dim-red-postprocessing-function
//meta.defaultPostProcessingFunction: true
//input: column col1
//input: column col2
//input: double epsilon = 0.01 {default: 0.01}[Minimum distance between two points to be considered as in the same neighborhood.]
//input: int minimumPoints = 5 {default: 5}[Minimum number of points to form a dense region.]
export async function dbscanPostProcessingFunction(col1: DG.Column, col2: DG.Column, epsilon: number, minimumPoints: number) {
  const df = col1.dataFrame;
  if (df === null)
    return;
  const resCol = await dbScan(df, col1, col2, epsilon, minimumPoints);
  df.changeColumnType(resCol, 'string');
  const colNames = [col1.name, col2.name];
  const tv = grok.shell.tableView(df.name);
  if (!tv)
    return;
  // find the correct scatterPlotViewer and set the colorColumnName
  for (const v of tv.viewers) {
    if (v instanceof DG.ScatterPlotViewer && colNames.includes(v.props.xColumnName) && colNames.includes(v.props.yColumnName)) {
      v.props.colorColumnName = resCol.name;
      return;
    }
  }
}

//name: None (number)
//tags: dim-red-preprocessing-function
//meta.supportedTypes: int,float,double,qnum
//meta.supportedDistanceFunctions: Difference
//input: column col
//input: string _metric {optional: true}
//output: object result
export function numberPreprocessingFunction(col: DG.Column, _metric: string) {
  const range = col.stats.max - col.stats.min;
  const entries = col.toList();
  return {entries, options: {range}};
}

//name: None (string)
//tags: dim-red-preprocessing-function
//meta.supportedTypes: string
//meta.supportedDistanceFunctions: One-Hot,Levenshtein,Hamming
//input: column col
//input: string _metric {optional: true}
//output: object result
export function stringPreprocessingFunction(col: DG.Column, _metric: string) {
  const entries = col.toList();
  return {entries, options: {}};
}

//top-menu: ML | Reduce Dimensionality...
//name: Multi Column Dimensionality Reduction
export async function reduceDimensionality(): Promise<void> {
  const editor = new MultiColumnDimReductionEditor();
  const dialog = ui.dialog('Dimensionality reduction')
    .add(editor.getEditor())
    .onOK(async () => {
      const params = editor.getParams();
      if (params.columns.length === 0)
        return;
      await multiColReduceDimensionality(params.table, params.columns, params.methodName as DimReductionMethods,
      params.distanceMetrics as KnownMetrics[],
      params.weights, params.preprocessingFunctions, params.aggreaggregationMethod as DistanceAggregationMethods,
      !!params.plotEmbeddings, !!params.clusterEmbeddings, params.options, {
        fastRowCount: 10000,
      }, params.postProcessingFunction, params.postProcessingFunctionArgs);
    }).show();
  dialog.helpUrl = 'https://datagrok.ai/help/explore/dim-reduction.md';
  const validate = () => {
    const cols = editor.columnsInput.value;
    const okButton = dialog.getButton('OK');
    if (!okButton)
      return;
    const isDisabled = !cols || cols.length === 0;
    if (isDisabled)
      okButton.classList.add('disabled');
    else
      okButton.classList.remove('disabled');
  };
  editor.onColumnsChanged.subscribe(() => {
    try {
      validate();
    } catch (e) {
      console.error(e);
    }
  });
  validate();
}

//name: GetMCLEditor
//tags: editor
//input: funccall call
export function GetMCLEditor(call: DG.FuncCall): void {
  try {
    const funcEditor = new MCLEditor();
    ui.dialog('Markov clustering')
      .add(funcEditor.getEditor())
      .onOK(async () => {
        const params = funcEditor.params;
        return call.func.prepare({
          df: params.table, cols: params.columns, metrics: params.distanceMetrics,
          weights: params.weights, aggregationMethod: params.aggreaggregationMethod, preprocessingFuncs: params.preprocessingFunctions,
          preprocessingFuncArgs: params.preprocessingFuncArgs, threshold: params.threshold, maxIterations: params.maxIterations,
          useWebGPU: params.useWebGPU, inflate: params.inflateFactor,
        }).call(true);
      }).show();
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : err.toString();
    const errStack = err instanceof Error ? err.stack : undefined;
    grok.shell.error(`Get region editor error: ${errMsg}`);
    _package.logger.error(errMsg, undefined, errStack);
  }
}


//top-menu: ML | Cluster | MCL...
//name: MCL
//description: Markov clustering (MCL) is an unsupervised clustering algorithm for graphs based on simulation of stochastic flow.
//input: dataframe df
//input: list<column> cols
//input: list<string> metrics
//input: list<double> weights
//input: string aggregationMethod
//input: list<func> preprocessingFuncs
//input: object preprocessingFuncArgs
//input: int threshold = 80
//input: int maxIterations = 10
//input: bool useWebGPU = false
//input: double inflate = 2
//editor: EDA: GetMCLEditor
export async function MCL(df: DG.DataFrame, cols: DG.Column[], metrics: KnownMetrics[],
  weights: number[], aggregationMethod: DistanceAggregationMethod, preprocessingFuncs: (DG.Func | null | undefined)[],
  preprocessingFuncArgs: any[], threshold: number = 80, maxIterations: number = 10, useWebGPU: boolean = false, inflate: number = 0,
): Promise< DG.ScatterPlotViewer | undefined> {
  const tv = grok.shell.tableView(df.name) ?? grok.shell.addTableView(df);
  const serializedOptions: string = JSON.stringify({
    cols: cols.map((col) => col.name),
    metrics: metrics,
    weights: weights,
    aggregationMethod: aggregationMethod,
    preprocessingFuncs: preprocessingFuncs.map((func) => func?.name ?? null),
    preprocessingFuncArgs: preprocessingFuncArgs,
    threshold: threshold,
    maxIterations: maxIterations,
    useWebGPU: useWebGPU,
    inflate: inflate,
  } satisfies MCLSerializableOptions);
  df.setTag(MCL_OPTIONS_TAG, serializedOptions);

  const sc = tv.addViewer(DG.VIEWER.SCATTER_PLOT, {title: 'MCL', initializationFunction: 'EDA:MCLInitializationFunction'}) as DG.ScatterPlotViewer;
  return sc;
}

//name: MCLInitializationFunction
//input: viewer sc
export async function MCLInitializationFunction(sc: DG.ScatterPlotViewer) {
  const df = sc.dataFrame;
  if (df === null)
    throw new Error('Data frame of the scatter plot is null');
  const mclTag = df.getTag(MCL_OPTIONS_TAG);
  if (!mclTag)
    throw new Error('MCL options tag on the dataFrame is not found');
  const options: MCLSerializableOptions = JSON.parse(mclTag);
  const cols = options.cols.map((colName) => df.columns.byName(colName));
  const preprocessingFuncs = options.preprocessingFuncs.map((funcName) => funcName ? DG.Func.byName(funcName) : null);
  const res = await markovCluster(df, cols, options.metrics, options.weights,
    options.aggregationMethod, preprocessingFuncs, options.preprocessingFuncArgs, options.threshold,
    options.maxIterations, options.useWebGPU, options.inflate, sc);
  return res?.sc;
}

//name: PLS
//description: Compute partial least squares (PLS) regression analysis components: prediction, regression coefficients, T- & U-scores, X-loadings.
//input: dataframe table
//input: column_list features {type: numerical}
//input: column predict {type: numerical}
//input: int components = 3
//input: column names {type: string}
//output: object plsResults
export async function PLS(table: DG.DataFrame, features: DG.ColumnList, predict: DG.Column, components: number, names: DG.Column): Promise<PlsOutput> {
  return await getPlsAnalysis({
    table: table,
    features: features,
    predict: predict,
    components: components,
    names: names,
  });
}

//top-menu: ML | Analyze | PLS...
//name: topMenuPLS
//description: Compute partial least squares (PLS) regression components. They maximally summarize the variation of the predictors while maximizing correlation with the response variable.
export async function topMenuPLS(): Promise<void> {
  await runMVA(PLS_ANALYSIS.COMPUTE_COMPONENTS);
}

//top-menu: ML | Analyze | Multivariate Analysis...
//name: multivariateAnalysis
//description: Multidimensional data analysis using partial least squares (PLS) regression.
export async function MVA(): Promise<void> {
  await runMVA(PLS_ANALYSIS.PERFORM_MVA);
}

//name: MVA demo
//description: Multidimensional data analysis using partial least squares (PLS) regression. It identifies latent factors and constructs a linear model based on them.
//meta.demoPath: Compute | Multivariate analysis
export async function demoMultivariateAnalysis(): Promise<any> {
  runDemoMVA();
}

//name: trainLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: double gamma = 1.0 {category: Hyperparameters}
//output: dynamic model
export async function trainLinearKernelSVM(df: DG.DataFrame, predictColumn: DG.Column,
  gamma: number): Promise<any> {
  const trainedModel = await getTrainedModel({gamma: gamma, kernel: LINEAR}, df, predictColumn);
  return getPackedModel(trainedModel);
}

//name: applyLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export async function applyLinearKernelSVM(df: DG.DataFrame, model: any): Promise<DG.DataFrame> {
  return await getPrediction(df, model);
}

//name: isApplicableLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isApplicableLinearKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isApplicableSVM(df, predictColumn);
}

//name: isInteractiveLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isInteractiveLinearKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isInteractiveSVM(df, predictColumn);
}

//name: visualizeLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: visualize
//input: dataframe df
//input: column targetColumn
//input: column predictColumn
//input: dynamic model
//output: dynamic widget
export async function visualizeLinearKernelSVM(df: DG.DataFrame, targetColumn: DG.Column, predictColumn: DG.Column, model: any): Promise<any> {
  return showTrainReport(df, model);
}


//name: trainRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double sigma = 1.5 {category: Hyperparameters}
//output: dynamic model
export async function trainRBFkernelSVM(df: DG.DataFrame, predictColumn: DG.Column,
  gamma: number, sigma: number): Promise<any> {
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: RBF, sigma: sigma},
    df, predictColumn);

  return getPackedModel(trainedModel);
}

//name: applyRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export async function applyRBFkernelSVM(df: DG.DataFrame, model: any): Promise<DG.DataFrame> {
  return await getPrediction(df, model);
}

//name: isApplicableRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isApplicableRBFkernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isApplicableSVM(df, predictColumn);
}

//name: isInteractiveRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isInteractiveRBFkernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isInteractiveSVM(df, predictColumn);
}


//name: visualizeRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: visualize
//input: dataframe df
//input: column targetColumn
//input: column predictColumn
//input: dynamic model
//output: dynamic widget
export async function visualizeRBFkernelSVM(df: DG.DataFrame, targetColumn: DG.Column, predictColumn: DG.Column, model: any): Promise<any> {
  return showTrainReport(df, model);
}

//name: trainPolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double c = 1 {category: Hyperparameters}
//input: double d = 2 {category: Hyperparameters}
//output: dynamic model
export async function trainPolynomialKernelSVM(df: DG.DataFrame, predictColumn: DG.Column,
  gamma: number, c: number, d: number): Promise<any> {
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: POLYNOMIAL, cParam: c, dParam: d},
    df, predictColumn);

  return getPackedModel(trainedModel);
} // trainPolynomialKernelSVM

//name: applyPolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export async function applyPolynomialKernelSVM(df: DG.DataFrame, model: any): Promise<DG.DataFrame> {
  return await getPrediction(df, model);
}

//name: isApplicablePolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isApplicablePolynomialKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isApplicableSVM(df, predictColumn);
}

//name: isInteractivePolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isInteractivePolynomialKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isInteractiveSVM(df, predictColumn);
}

//name: visualizePolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: visualize
//input: dataframe df
//input: column targetColumn
//input: column predictColumn
//input: dynamic model
//output: dynamic widget
export async function visualizePolynomialKernelSVM(df: DG.DataFrame, targetColumn: DG.Column, predictColumn: DG.Column, model: any): Promise<any> {
  return showTrainReport(df, model);
}

//name: trainSigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double kappa = 1 {category: Hyperparameters}
//input: double theta = 1 {category: Hyperparameters}
//output: dynamic model
export async function trainSigmoidKernelSVM(df: DG.DataFrame, predictColumn: DG.Column,
  gamma: number, kappa: number, theta: number): Promise<any> {
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: SIGMOID, kappa: kappa, theta: theta},
    df, predictColumn);

  return getPackedModel(trainedModel);
} // trainSigmoidKernelSVM

//name: applySigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export async function applySigmoidKernelSVM(df: DG.DataFrame, model: any): Promise<DG.DataFrame> {
  return await getPrediction(df, model);
}

//name: isApplicableSigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isApplicableSigmoidKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isApplicableSVM(df, predictColumn);
}

//name: isInteractiveSigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isInteractiveSigmoidKernelSVM(df: DG.DataFrame, predictColumn: DG.Column): Promise<boolean> {
  return isInteractiveSVM(df, predictColumn);
}

//name: visualizeSigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: visualize
//input: dataframe df
//input: column targetColumn
//input: column predictColumn
//input: dynamic model
//output: dynamic widget
export async function visualizeSigmoidKernelSVM(df: DG.DataFrame, targetColumn: DG.Column, predictColumn: DG.Column, model: any): Promise<any> {
  return showTrainReport(df, model);
}

//top-menu: ML | Analyze | ANOVA...
//name: ANOVA
//description: One-way analysis of variances (ANOVA) determines whether the examined factor has a significant impact on the studied feature.
//input: dataframe table
//input: column factor {type: categorical}
//input: column feature {type: numerical}
//input: double significance = 0.05 [The significance level is a value from the interval (0, 1) specifying the criterion used for rejecting the null hypothesis.]
//input: bool validate = false [Indicates whether the normality of distribution and an eqaulity of varainces should be checked.]
export function anova(table: DG.DataFrame, factor: DG.Column, feature: DG.Column, significance: number, validate: boolean) {
  const res = oneWayAnova(factor, feature, significance, validate);
  addOneWayAnovaVizualization(table, factor, feature, res);
}

//top-menu: ML | Missing Values Imputation ...
//name: KNN impute
//desription: Missing values imputation using the k-nearest neighbors method
export function kNNImputation() {
  runKNNImputer();
}

//name: KNN imputation for a table
//desription: Missing values imputation using the k-nearest neighbors method for a given table
//input: dataframe table
export async function kNNImputationForTable(table: DG.DataFrame) {
  await runKNNImputer(table);
}

//name: trainLinearRegression
//meta.mlname: Linear Regression
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//output: dynamic model
export async function trainLinearRegression(df: DG.DataFrame, predictColumn: DG.Column): Promise<Uint8Array> {
  const features = df.columns;
  const params = await getLinearRegressionParams(features, predictColumn);

  return new Uint8Array(params.buffer);
}

//name: applyLinearRegression
//meta.mlname: Linear Regression
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export function applyLinearRegression(df: DG.DataFrame, model: any): DG.DataFrame {
  const features = df.columns;
  const params = new Float32Array((model as Uint8Array).buffer);
  return DG.DataFrame.fromColumns([getPredictionByLinearRegression(features, params)]);
}

//name: isApplicableLinearRegression
//meta.mlname: Linear Regression
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export function isApplicableLinearRegression(df: DG.DataFrame, predictColumn: DG.Column): boolean {
  for (const col of df.columns) {
    if (!col.matches('numerical'))
      return false;
  }

  return predictColumn.matches('numerical');
}

//name: isInteractiveLinearRegression
//meta.mlname: Linear Regression
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export function isInteractiveLinearRegression(df: DG.DataFrame, predictColumn: DG.Column): boolean {
  return df.rowCount <= 100000;
}

//name: trainSoftmax
//meta.mlname: Softmax
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: double rate = 1.0 {category: Hyperparameters; min: 0.001; max: 20} [Learning rate]
//input: int iterations = 100 {category: Hyperparameters; min: 1; max: 10000; step: 10} [Fitting iterations count]
//input: double penalty = 0.1 {category: Hyperparameters; min: 0.0001; max: 1} [Regularization rate]
//input: double tolerance = 0.001 {category: Hyperparameters; min: 0.00001; max: 0.1} [Fitting tolerance]
//output: dynamic model
export async function trainSoftmax(df: DG.DataFrame, predictColumn: DG.Column, rate: number,
  iterations: number, penalty: number, tolerance: number): Promise<Uint8Array> {
  const features = df.columns;

  const model = new SoftmaxClassifier({
    classesCount: predictColumn.categories.length,
    featuresCount: features.length,
  });

  await model.fit(features, predictColumn, rate, iterations, penalty, tolerance);

  return model.toBytes();
}

//name: applySoftmax
//meta.mlname: Softmax
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe table
export function applySoftmax(df: DG.DataFrame, model: any): DG.DataFrame {
  const features = df.columns;
  const unpackedModel = new SoftmaxClassifier(undefined, model);

  return DG.DataFrame.fromColumns([unpackedModel.predict(features)]);
}

//name: isApplicableSoftmax
//meta.mlname: Softmax
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export function isApplicableSoftmax(df: DG.DataFrame, predictColumn: DG.Column): boolean {
  return SoftmaxClassifier.isApplicable(df.columns, predictColumn);
}

//name: isInteractiveSoftmax
//meta.mlname: Softmax
//meta.mlrole: isInteractive
//input: dataframe df
//input: column predictColumn
//output: bool result
export function isInteractiveSoftmax(df: DG.DataFrame, predictColumn: DG.Column): boolean {
  return SoftmaxClassifier.isInteractive(df.columns, predictColumn);
}
