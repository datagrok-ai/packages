// Exploratory data analysis (EDA) tools

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {TSNE} from '@keckelt/tsne';

import {_principalComponentAnalysisInWebWorker,
  _partialLeastSquareRegressionInWebWorker} from '../wasm/EDAAPI';

import {checkWasmDimensionReducerInputs, checkUMAPinputs, checkTSNEinputs, getRowsOfNumericalColumnns} from './utils';

// Principal components analysis (PCA)
export async function computePCA(table: DG.DataFrame, features: DG.ColumnList, components: number,
  center: boolean, scale: boolean): Promise<DG.DataFrame> 
{
  checkWasmDimensionReducerInputs(features, components);

  const centerNum = center ? 1 : 0;
  const scaleNum = scale ? 1 : 0;

  let _output: any;
  let _promise = _principalComponentAnalysisInWebWorker(table, features, components, centerNum, scaleNum);

  await _promise.then(
    _result => { _output = _result; },
    _error => {  throw new Error (`Error: ${_error}`); }
  );

  return _output;  
} 

// Partial least square regression (PLS)
export async function computePLS(table: DG.DataFrame, features: DG.ColumnList, predict: DG.Column, components: number): Promise<any> 
{
  // Inputs are checked in the same manner as in PCA, since the same computations are applied.
  checkWasmDimensionReducerInputs(features, components);

  let _output: any;
  let _promise = _partialLeastSquareRegressionInWebWorker(table, features, predict, components);

  await _promise.then(
    _result => { _output = _result; },    
    _error => {  throw new Error (`Error: ${_error}`); }
  );

  return _output;
}

// Uniform Manifold Approximation and Projection (UMAP)
export async function computeUMAP(features: DG.ColumnList, components: number, epochs: number,
  neighbors: number, minDist: number, spread: number): Promise<DG.DataFrame> 
{
  // check inputs
  checkUMAPinputs(features, components, epochs, neighbors, minDist, spread);  

  // get row-by-row data
  const data = getRowsOfNumericalColumnns(features);

  let workerOutput: any;

  // UMAP in webworker
  let promise = new Promise((resolve, reject) => {
    const worker = new Worker(new URL('workers/umap-worker.ts', import.meta.url));
    
    worker.postMessage({
      data: data, 
      options: {
        nComponents: components,
        nEpochs: epochs,
        nNeighbors: neighbors,
        minDist: minDist,
        spread: spread
    }});

    worker.onmessage = function(e) {
      worker.terminate();
      resolve(e.data.embeddings);    
  }}); 
  
  await promise.then(
    result => { workerOutput = result; },
    error => { throw new Error ('applying UMAP fails.'); }
  );

  const embeddings = workerOutput as any[][];
  const rowCount = embeddings.length;
  const range = [...Array(components).keys()];

  // Create output

  // columns data
  const umapColumnsData = range.map(_ => new Float32Array(rowCount));  

  // perform transponation
  for (let i = 0; i < rowCount; ++i)
    for (let j = 0; j < components; ++j)
      umapColumnsData[j][i] = embeddings[i][j];

  return DG.DataFrame.fromColumns(range.map(i => 
    DG.Column.fromFloat32Array('UMAP' + i.toString(), umapColumnsData[i])
  ));
} // computeUMAP

// t-distributed stochastic neighbor embedding (t-SNE)
export async function computeTSNE(features: DG.ColumnList, components: number, 
  learningRate: number, perplexity: number, iterations: number): Promise<DG.DataFrame> 
{
  // check inputs
  checkTSNEinputs(features, components, learningRate, perplexity, iterations);

  // get row-by-row data
  const data = getRowsOfNumericalColumnns(features);

  let workerOutput: any;

  // t-SNE in webworker
  let promise = new Promise((resolve, reject) => {
    const worker = new Worker(new URL('workers/tsne-worker.ts', import.meta.url));
    
    worker.postMessage({
      data: data, 
      options: {
        learningRate: learningRate,
        perplexity: perplexity,
        components: components,
        iterations: iterations
    }});

    worker.onmessage = function(e) {
      worker.terminate();
      resolve(e.data.embeddings);    
  }}); 
  
  await promise.then(
    result => { workerOutput = result; },
    error => { throw new Error ('applying t-SNE fails.'); }
  );

  const embeddings = workerOutput as any[];

  const rowCount = embeddings.length;
  const range = [...Array(components).keys()];

  // Create output

  // columns data
  const umapColumnsData = range.map(_ => new Float32Array(rowCount));  

  // perform transponation
  for (let i = 0; i < rowCount; ++i)
    for (let j = 0; j < components; ++j)
      umapColumnsData[j][i] = embeddings[i][j];

  return DG.DataFrame.fromColumns(range.map(i => 
    DG.Column.fromFloat32Array('tSNE' + i.toString(), umapColumnsData[i])
  ));
} // computeTSNE