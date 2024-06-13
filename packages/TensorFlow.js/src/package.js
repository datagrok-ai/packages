import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import { processFeatures, loadModel } from './utils';
import { prepareAndTrainNN } from './nn';
export let _package = new DG.Package();
//name: trainNN
//description: Train a neural network using TensorFlow.js
//meta.mlname: tfjsNN
//meta.mlrole: train
//input: dataframe df {validators: containsMissingValues}
//input: string predict_column
//input: string activationFunc="relu" {category: Parameters; choices: ["relu", "linear", "elu", "relu6", "selu", "sigmoid", "softplus", "softmax", "tanh", "softplus", "swish", "mish", "hardSigmoid"]} [Activation function to use.]
//input: string hiddenLayersSizes="16,32" {category: Parameters} [Number of units in each hidden layer.]
//input: string initializer="randomUniform" {category: Initializer; choices: ["constant", "glorotNormal", "glorotUniform", "heNormal", "heUniform", "leCunNormal", "leCunUniform", "ones", "orthogonal", "randomNormal", "randomUniform", "truncatedNormal", "varianceScaling", "zeros"]} [Kernel and bias weights initializer method.]
//input: double constantValue=0.5 {category: Initializer} [Constant: The value for each element in the variable.]
//input: double normalMean=0.5 {category: Initializer} [Random & Truancated Normal: Mean of the random values to generate.]
//input: double normalStddev=0.1 {category: Initializer} [Random & Truancated Normal: Standard deviation of the random values to generate.]
//input: double minValue=0.0 {category: Initializer} [Random Uniform: Lower bound of the range of random values to generate.]
//input: double maxValue=1.0 {category: Initializer} [Random Uniform: Upper bound of the range of random values to generate.]
//input: double varianceScale=0.5 {category: Initializer} [Variance Scaling: Scaling factor (positive float).]
//input: string varianceFanningMode="fanIn" {category: Initializer; choices: ["fanIn", "fanOut", "fanAvg"]} [Variance Scaling: Fanning mode for inputs and outputs.]
//input: string varianceDistribution="normal" {category: Initializer; choices: ["normal", "uniform", "truncatedNormal"]} [Variance Scaling: Probabilistic distribution of the values.]
//input: string hiddenRepresentationNormalization="batchNorm" {category: LayersNormalization; choices: ["none", "batchNorm", "layerNorm"]} [Normalization method to use.]
//input: int normalizationAxis=-1 {category: LayersNormalization} [The integer axis that should be normalized (typically the features axis).]
//input: double normalizationMomentum=0.99 {category: LayersNormalization} [Momentum of the moving average.]
//input: double normalizationEpsilon=0.001 {category: LayersNormalization} [Small float added to the variance to avoid dividing by zero.]
//input: bool normalizationCenter=true {category: LayersNormalization} [If true, add offset of beta to normalized tensor. If false, beta is ignored.]
//input: bool normalizationScale=true {category: LayersNormalization} [ If true, multiply by gamma. If false, gamma is not used. When the next layer is linear (also e.g. nn.relu), this can be disabled since the scaling will be done by the next layer.]
//input: double dropoutRate=0.2 {category: Regularization} [Applies dropout to the layers. Float between 0 and 1. Fraction of the input units to drop. Set 0 to disable dropout.]
//input: double l1=0.01 {category: Regularization} [Adds a term to the loss to penalize large weights: loss += sum(l1 * abs(x))]
//input: double l2=0.01 {category: Regularization} [Adds a term to the loss to penalize large weights: loss += sum(l2 * x^2)]
//input: bool kernelRegularization=true {category: Regularization} [Apply regularizer function to the dense kernel weights matrix.]
//input: bool biasRegularization=true {category: Regularization} [Apply regularizer function to the bias vector.]
//input: bool activityRegularization=false {category: Regularization} [Apply regularizer function to the activation.]
//input: string finalActivation="relu" {category: Parameters; choices: ["relu", "linear", "elu", "relu6", "selu", "sigmoid", "softplus", "softmax", "tanh", "softplus", "swish", "mish", "hardSigmoid"]} [Activation function to use for the output layer.]
//input: string optimizer="Adam" {category: Parameters; choices: ['Adadelta', 'Adagrad', 'Adam', 'Adamax', 'Momentum', 'RMSProp', 'SGD']}
//input: double learningRate=0.001 {category: Parameters}
//input: string lossFunc="meanSquaredError" {category: Parameters; choices: ['meanSquaredError', 'meanAbsoluteError', 'meanAbsolutePercentageError', 'meanSquaredLogarithmicError', 'squaredHinge', 'hinge', 'categoricalHinge', 'logcosh', 'categoricalCrossentropy', 'sparseCategoricalCrossentropy', 'binaryCrossentropy', 'kullbackLeiblerDivergence', 'poisson', 'cosineProximity']}
//input: string metrics="MSE" {category: Parameters; choices: ['binaryAccuracy', 'categoricalAccuracy', 'precision', 'categoricalCrossentropy', 'sparseCategoricalCrossentropy', 'MSE', 'MAE', 'MAPE', 'cosine']}
//input: int batchSize=1 {category: Parameters}
//input: int epochs=10 {category: Parameters}
//input: double validationSplit=0.2 {category: Parameters}
//input: int seed=42
//input: string constraint="maxNorm" {choices: ["maxNorm", "minMaxNorm", "nonNeg", "unitNorm"]}
//input: string monitor="val_loss" {category: EarlyStopping}
//input: double minDelta=0.001 {category: EarlyStopping}
//input: int patience=5 {category: EarlyStopping}
//input: string mode="auto" {category: EarlyStopping; choices: ["auto", "min", "max"]}
//input: double baseline=0.5 {category: EarlyStopping}
//output: dynamic model
export async function trainNN(df, predict_column, activationFunc = 'relu', hiddenLayersSizes = '128,128', initializer = 'randomUniform', constantValue = 0.5, normalMean = 0.5, normalStddev = 0.1, minValue = 0.0, maxValue = 1.0, varianceScale = 0.5, varianceFanningMode = "fanIn", varianceDistribution = "normal", hiddenRepresentationNormalization = "batchNorm", normalizationAxis = -1, normalizationMomentum = 0.99, normalizationEpsilon = 0.001, normalizationCenter = true, normalizationScale = true, dropoutRate = 0.2, regularizationL1 = 0.01, regularizationL2 = 0.01, kernelRegularization = true, biasRegularization = true, activityRegularization = false, finalActivation = 'relu', optimizer = 'Adam', learningRate = 0.001, lossFunc = 'meanSquaredError', metrics = 'MSE', batchSize = 1, epochs = 1, validationSplit, seed = 42, constraint, monitor, minDelta, patience, mode, baseline) {
    //TODO: reorganize
    // let columnsObject: object = {};
    // df.columns.toList().forEach((col: DG.Column) => {columnsObject[col.name] = {type: col.type, data: col.toList() } });
    let result = await prepareAndTrainNN(df, predict_column, activationFunc, hiddenLayersSizes, initializer, constantValue, normalMean, normalStddev, minValue, maxValue, varianceScale, varianceFanningMode, varianceDistribution, hiddenRepresentationNormalization, normalizationAxis, normalizationMomentum, normalizationEpsilon, normalizationCenter, normalizationScale, dropoutRate, regularizationL1, regularizationL2, kernelRegularization, biasRegularization, activityRegularization, finalActivation, optimizer, learningRate, lossFunc, metrics, batchSize, epochs, validationSplit, seed, monitor, minDelta, patience, mode, baseline);
    return result;
}
//name: applyNN
//meta.mlname: tfjsNN
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe data_out
export async function applyNN(df, model) {
    let loadedModel = await loadModel(model);
    let testX = processFeatures(df);
    let predictions;
    // if (prediction is not category) {
    predictions = loadedModel.predict(testX).arraySync().flat();
    // } else { // is category
    // predictions = predictions.map((vector) => oneHotToCategory(vector, categoryArray));
    // }
    return DG.DataFrame.fromColumns([DG.Column.fromList(DG.TYPE.FLOAT, "pred", predictions)]);
}

//name: isApplicableNN
//meta.mlname: tfjsNN
//meta.mlrole: isApplicable
//input: dataframe df
//input: string predict_column
//output: bool result
export async function isApplicableNN(df, predict_column) {
    return df.columns.byName(predict_column).matches('numerical');
}


//name: visualizeNN
//meta.mlname: tfjsNN
//meta.mlrole: visualize
//input: dataframe df
//input: string predict_column
//input: string target_column
//input: dynamic model
//output: dynamic widget
export async function visualizeNN(df, predict_column, target_column, model) {
    let loadedModel = await loadModel(model);
    let weights = loadedModel.getNamedWeights();
    const offset = 50;
    const width = 1000;
    const height = 400;
    let canvas = ui.canvas(1000, 400);
    canvas.style.width = '600px';
    
    const g = canvas.getContext("2d");
    let blockWidth = (width - 2 * offset) / (loadedModel.layers.length + 1);

    var drawLayer = function (tensor, layerIdx) {
        let blockHeight = (height - 2 * offset) / tensor.shape[1];
        for (var j = 0; j < tensor.shape[1]; j++) {
            DG.Paint.marker(g, DG.MARKER_TYPE.CIRCLE,
                offset + layerIdx * blockWidth + blockWidth / 2, offset + j * blockHeight + blockHeight / 2,
                '#000000', 5);        
        }
    };
    var drawWeights = function (layer, layerIdx) {
        if (layer.kernel !== undefined) {
            let curBlockHeight = (height - 2 * offset) / layer.kernel.shape[0];
            let nxtBlockHeight = (height - 2 * offset) / layer.kernel.shape[1];
            var curWeights = weights.find((w, _index, _obj) => w.name === layer.kernel.originalName).tensor.arraySync();
            for (var j = 0; j < layer.kernel.shape[0]; j++) {
                for (var k = 0; k < layer.kernel.shape[1]; k++) {
                    var intensity = curWeights[j][k];
                    g.strokeStyle = `rgba(0, 0, 0, ${Math.abs(intensity)})`;
                    g.beginPath();
                    g.moveTo(offset + layerIdx * blockWidth + blockWidth / 2, offset + curBlockHeight * j + curBlockHeight / 2);
                    g.lineTo(offset + (layerIdx + 1) * blockWidth + blockWidth / 2, offset + nxtBlockHeight * k + nxtBlockHeight / 2);
                    g.stroke();
                }
            }
        } else {
            g.beginPath();
            let curBlockHeight = (height - 2 * offset) / layer.input.shape[1];
            for (var j = 0; j < layer.input.shape[1]; j++) {
                g.strokeStyle = `rgb(0, 0, 0)`;
                g.moveTo(offset + layerIdx * blockWidth + blockWidth / 2, offset + curBlockHeight * j + curBlockHeight / 2);
                g.lineTo(offset + (layerIdx + 1) * blockWidth + blockWidth / 2, offset + curBlockHeight * j + curBlockHeight / 2);
            }
            g.stroke();
        }
    };
    for (var i = 0; i < loadedModel.layers.length; i++) {
        let layer = loadedModel.layers[i];
        drawLayer(layer.input, i);
        drawWeights(layer, i);
    }
    drawLayer(loadedModel.layers[loadedModel.layers.length - 1].output, loadedModel.layers.length);
    return canvas;
}
