/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {DemoScript} from '@datagrok-libraries/tutorials/src/demo-script';

import {_initEDAAPI} from '../wasm/EDAAPI';
import {computePCA, computePLS} from './EDAtools';
import {renamePCAcolumns, addPLSvisualization, regressionCoefficientsBarChart, 
  scoresScatterPlot, predictedVersusReferenceScatterPlot} from './EDAui';
import {carsDataframe, testDataForBinaryClassification} from './dataGenerators';
import {LINEAR, RBF, POLYNOMIAL, SIGMOID, 
  getTrainedModel, getPrediction, showTrainReport, getPackedModel} from './svm';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: init
export async function init(): Promise<void> {
  await _initEDAAPI();
}

//top-menu: Tools | Data Science | Principal Component Analysis...
//name: PCA
//description: Principal component analysis (PCA).
//input: dataframe table
//input: column_list features
//input: int components = 2
//input: bool center = true
//input: bool scale = true
//output: dataframe result {action:join(table)}
export async function PCA(table: DG.DataFrame, features: DG.ColumnList, components: number,
  center: boolean, scale: boolean): Promise<DG.DataFrame> 
{
  return renamePCAcolumns(await computePCA(table, features, components, center, scale));
}

//top-menu: Tools | Data Science | Multivariate Analysis (PLS)...
//name: Multivariate Analysis (PLS)
//description: Partial least square regression (PLS).
//input: dataframe table
//input: column names
//input: column_list features
//input: column predict
//input: int components = 3
export async function PLS(table: DG.DataFrame, names: DG.Column, features: DG.ColumnList, 
  predict: DG.Column, components: number): Promise<void> 
{
  const plsResults = await computePLS(table, features, predict, components);
  addPLSvisualization(table, names, features, predict, plsResults);
}

//name: MVA demo
//description: Multidimensional data analysis using partial least squares (PLS) regression. It reduces the predictors to a smaller set of uncorrelated components and performs least squares regression on them.
//meta.demoPath: Compute | Multivariate analysis
export async function demoMultivariateAnalysis(): Promise<any>  {
  const demoScript = new DemoScript('Partial least squares regression', 
    'Analysis of multidimensional data.'); 
  
  const cars = carsDataframe();

  const components = 3;
  const names = cars.columns.byName('model');
  const predict = cars.columns.byName('price');
  const features = cars.columns.remove('price').remove('model');
  const plsOutput = await computePLS(cars, features, predict, components);  

  const sourceCars = carsDataframe();
  sourceCars.name = 'Cars';
  let view: any;
  let dialog: any;

  await demoScript
    .step('Data', async () => {
      grok.shell.addTableView(sourceCars);
      view = grok.shell.getTableView(sourceCars.name);
    }, {description: 'Each car has many features - patterns extraction is complicated.', delay: 0})
    .step('Model', async () => {
      dialog = ui.dialog({title:'Multivariate Analysis (PLS)'})
        .add(ui.tableInput('Table', sourceCars))
        .add(ui.columnsInput('Features', cars, features.toList, {available: undefined, checked: features.names()}))
        .add(ui.columnInput('Names', cars, names, undefined))
        .add(ui.columnInput('Predict', cars, predict, undefined))
        .add(ui.intInput('Components', components, undefined))
        .onOK(() => {
          grok.shell.info('Multivariate analysis has been already performed.');
        })
        .show();
    }, {description: 'Predict car price by its other features.', delay: 0})
    .step('Regression coeffcicients', async () => 
      {
        dialog.close();
        view.addViewer(regressionCoefficientsBarChart(features, plsOutput[1]))},
      {description: 'The feature "diesel" affects the price the most.', delay: 0})
    .step('Scores', async () => 
      {view.addViewer(scoresScatterPlot(names, plsOutput[2], plsOutput[3]))}, 
      {description: 'Similarities & dissimilarities: alfaromeo and mercedes are different.', delay: 0})
    .step('Prediction', async () => 
      {view.addViewer(predictedVersusReferenceScatterPlot(names, predict, plsOutput[0]))}, 
      {description: 'Closer to the line means better price prediction.', delay: 0})
    .start();
}

//name: Generate linear separable dataset
//description: Generates linear separble dataset for testing binary classificators.
//input: string name = 'Data' {caption: name; category: Dataset}
//input: int samplesCount = 1000 {caption: samples; category: Size}
//input: int featuresCount = 2 {caption: features; category: Size}
//input: double min = -39 {caption: min; category: Range}
//input: double max = 173 {caption: max; category: Range}
//input: double violatorsPercentage = 5 {caption: violators; units: %; category: Dataset}
//output: dataframe df
export async function testDataLinearSeparable(name: string, samplesCount: number, featuresCount: number, 
  min: number, max: number, violatorsPercentage: number): Promise<DG.DataFrame> 
{
  return await testDataForBinaryClassification(LINEAR, [0, 0], name, samplesCount, featuresCount,
    min, max, violatorsPercentage);
}

//name: Generate linear non-separable dataset
//description: Generates linear non-separble dataset for testing binary classificators.
//input: string name = 'Data' {caption: name; category: Dataset}
//input: double sigma = 90  {caption: sigma; category: Hyperparameters} [RBF-kernel paramater]
//input: int samplesCount = 1000 {caption: samples; category: Size}
//input: int featuresCount = 2 {caption: features; category: Size}
//input: double min = -39 {caption: min; category: Range}
//input: double max = 173 {caption: max; category: Range}
//input: double violatorsPercentage = 5 {caption: violators; units: %; category: Dataset}
//output: dataframe df
export async function testDataLinearNonSeparable(name: string, sigma: number, samplesCount: number, 
  featuresCount: number, min: number, max: number, violatorsPercentage: number): Promise<DG.DataFrame> 
{
  return await testDataForBinaryClassification(RBF, [sigma, 0], name, samplesCount, featuresCount,
    min, max, violatorsPercentage);
}

//name: trainLinearKernelSVM
//meta.mlname: linear kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: string predict_column
//input: double gamma = 1.0 {category: Hyperparameters}
//input: bool toShowReport = false {caption: to show report; category: Report}
//output: dynamic model
export async function trainLinearKernelSVM(df: DG.DataFrame, predict_column: string, 
  gamma: number, toShowReport: boolean): Promise<any> 
{    
  const trainedModel = await getTrainedModel({gamma: gamma, kernel: LINEAR}, df, predict_column);   

  if (toShowReport)
    showTrainReport(df, trainedModel);

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

//name: trainRBFkernelSVM
//meta.mlname: RBF-kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: string predict_column
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double sigma = 1.5 {category: Hyperparameters}
//input: bool toShowReport = false {caption: to show report; category: Report}
//output: dynamic model
export async function trainRBFkernelSVM(df: DG.DataFrame, predict_column: string, 
  gamma: number, sigma: number, toShowReport: boolean): Promise<any> 
{  
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: RBF, sigma: sigma}, 
    df, predict_column);   

  if (toShowReport)
    showTrainReport(df, trainedModel);

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

//name: trainPolynomialKernelSVM
//meta.mlname: polynomial kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: string predict_column
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double c = 1 {category: Hyperparameters}
//input: double d = 2 {category: Hyperparameters}
//input: bool toShowReport = false {caption: to show report; category: Report}
//output: dynamic model
export async function trainPolynomialKernelSVM(df: DG.DataFrame, predict_column: string, 
  gamma: number, c: number, d: number, toShowReport: boolean): Promise<any> 
{  
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: POLYNOMIAL, cParam: c, dParam: d}, 
    df, predict_column);   

  if (toShowReport)
    showTrainReport(df, trainedModel);

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

//name: trainSigmoidKernelSVM
//meta.mlname: sigmoid kernel LS-SVM
//meta.mlrole: train
//input: dataframe df
//input: string predict_column
//input: double gamma = 1.0 {category: Hyperparameters}
//input: double kappa = 1 {category: Hyperparameters}
//input: double theta = 1 {category: Hyperparameters}
//input: bool toShowReport = false {caption: to show report; category: Report}
//output: dynamic model
export async function trainSigmoidKernelSVM(df: DG.DataFrame, predict_column: string, 
  gamma: number, kappa: number, theta: number, toShowReport: boolean): Promise<any> 
{  
  const trainedModel = await getTrainedModel(
    {gamma: gamma, kernel: SIGMOID, kappa: kappa, theta: theta}, 
    df, predict_column);   

  if (toShowReport)
    showTrainReport(df, trainedModel);

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
