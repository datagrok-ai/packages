// Custom UI for Exploratory data analysis (EDA) tools

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

// Rename PCA columns
export function renamePCAcolumns(pcaTable: DG.DataFrame): DG.DataFrame {  
  for (const col of pcaTable.columns.toList()) 
    col.name = '_PCA' + col.name;

  return pcaTable;
}

// Predicted vs Reference scatter plot
export function predictedVersusReferenceScatterPlot(reference: DG.Column, prediction: DG.Column): DG.Viewer {  
  prediction.name = reference.name + '(predicted)';
 
  let dfReferencePrediction = DG.DataFrame.fromColumns([reference, prediction]);
  dfReferencePrediction.name = 'Reference vs. Predicted';
   
  return DG.Viewer.scatterPlot(dfReferencePrediction, 
    { title: dfReferencePrediction.name,
      x: reference.name,
      y: prediction.name,
      showRegressionLine: true,
      markerType: 'circle'
     });  
}

// Regression Coefficients Bar Chart
export function regressionCoefficientsBarChart(features: DG.ColumnList, regressionCoeffs: DG.Column): DG.Viewer {    regressionCoeffs.name = 'regression coefficient';
 
  let namesOfPredictors = [];
  for (const col of features)
    namesOfPredictors.push(col.name); 
  
  let predictorNamesColumn = DG.Column.fromStrings('feature', namesOfPredictors);  
 
  let dfRegrCoefs = DG.DataFrame.fromColumns([predictorNamesColumn, regressionCoeffs]);
  dfRegrCoefs.name = 'Regression Coefficients';

  return DG.Viewer.barChart(dfRegrCoefs, 
    {title: dfRegrCoefs.name, split: 'feature', 
     value: 'regression coefficient', valueAggrType: 'avg'}); 
}

// Scores Scatter Plot
export function scoresScatterPlot(xScores: Array<DG.Column>, yScores: Array<DG.Column>): DG.Viewer {
  
  let scoresColumns = [];

  for (let i = 0; i < xScores.length; i++) {
    xScores[i].name = `x.score.t${i+1}`;
    scoresColumns.push(xScores[i]);
  } 
  
  for (let i = 0; i < yScores.length; i++) {
    yScores[i].name = `y.score.u${i+1}`;
    scoresColumns.push(yScores[i]);
  }  
 
  let scores = DG.DataFrame.fromColumns(scoresColumns);
  scores.name = 'Scores';
  //grok.shell.addTableView(scores);
 
  return DG.Viewer.scatterPlot(scores, 
    { title: scores.name,
      x: xScores[0].name,
      y: yScores[0].name,      
      markerType: 'circle'
     });
}

// Loading Scatter Plot
export function loadingScatterPlot(features: DG.ColumnList, xLoadings: Array<DG.Column>): DG.Viewer {
  let loadingCols = [];
 
  let loadingLabels = [];
  for (let col of features)
    loadingLabels.push(col.name);
 
  loadingCols.push(DG.Column.fromStrings('labels', loadingLabels)); 
  
  for (let i = 0; i < xLoadings.length; i++) {
    xLoadings[i].name = `x.loading.p${i+1}`;
    loadingCols.push(xLoadings[i]);
  }
 
  let dfLoadings = DG.DataFrame.fromColumns(loadingCols);
  dfLoadings.name = 'Loadings';
   
  return DG.Viewer.scatterPlot(dfLoadings, 
    { title: dfLoadings.name,
      x: xLoadings[0].name,
      y: xLoadings[xLoadings.length - 1].name,      
      markerType: 'circle',
      labels: 'labels'
     });
}

// Add PLS visualization
export function addPLSvisualization(table: DG.DataFrame, features: DG.ColumnList, predict: DG.Column, plsOutput: any): void {

  let view = grok.shell.getTableView(table.name);
 
  // 1. Predicted vs Reference scatter plot
  view.addViewer(predictedVersusReferenceScatterPlot(predict, plsOutput[0]));
  
  // 2. Regression Coefficients Bar Chart
  view.addViewer(regressionCoefficientsBarChart(features, plsOutput[1])); 
 
  // 3. Scores Scatter Plot
  view.addViewer(scoresScatterPlot(plsOutput[2], plsOutput[3]));
 
  // 4. Loading Scatter Plot
  view.addViewer(loadingScatterPlot(features, plsOutput[4]));  
}
