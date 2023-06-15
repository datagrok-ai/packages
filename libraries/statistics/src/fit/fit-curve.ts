/* eslint-disable no-multi-spaces */
import * as DG from 'datagrok-api/dg';
import {Property} from 'datagrok-api/src/entities';
import {TYPE} from 'datagrok-api/src/const';

import {limitedMemoryBFGS} from '../../lbfgs/lbfgs';
//@ts-ignore: no types
import * as jStat from 'jstat';


type Optimizable = {
  getValue: (parameters: number[]) => number,
  getGradient: (parameters: number[], gradient: number[]) => number[],
}

type Likelihood = {
  value: number,
  const: number,
  mult: number
};

type ObjectiveFunction = (targetFunc: (params: number[], x: number) => number,
  data: {x: number[], y: number[]}, params: number[]) => Likelihood;

export enum FitErrorModel {
  Constant,
  Proportional
}

// export type FitParam = {
//   value: number;
//   minBound?: number;
//   maxBound?: number;
// };

export interface IFitFunctionDescription {
  name: string;
  function: string;
  getInitialParameters: string;
  parameterNames: string[];
}

export type FitCurve = {
  fittedCurve: (x: number) => number;
  parameters: number[];
};

export type FitConfidenceIntervals = {
  confidenceTop: (x: number) => number;
  confidenceBottom: (x: number) => number;
};

export type FitStatistics = {
  rSquared?: number,
  auc?: number,
  interceptX: number, // parameters[2]
  interceptY: number, // fittedCurve[parameters[2]]
  slope: number, // parameters[1]
  top: number, // parameters[0]
  bottom: number, // parameters[3]
};

export type FitInvertedFunctions = {
  inverted: (y: number) => number,
  invertedTop: (y: number) => number,
  invertedBottom: (y: number) => number,
};

/**
 *  Datagrok curve fitting
 *
 * - Fitting: computing parameters of the specified function to best fit the data
 *   - Uses BFGS optimization algorithm (multi-threading for performance).
 *     For dose-response curves, we are typically fitting the sigmoid function
 *   - Ability to dynamically register custom fitting functions
 *     - Automatic fit function determination
 *     - Caching of custom fitting functions
 *   - Ability to get fitting performance characteristics (r-squared, classification, etc)
 * - Deep integration with the Datagrok grid
 *   - Either fitting on the fly, or using the supplied function + parameters
 *   - Multiple series in one cell
 *   - Confidence intervals drawing
 *   - Ability to define chart, marker, or fitting options (such as fit function or marker color)
 *     on the column level, with the ability to override it on a grid cell or point level
 *   - Clicking a point in a chart within a grid makes it an outlier -> curve is re-fitted on the fly
 *   - Ability to specify a chart as "reference" so that it is shown on every other chart for comparison
 * - Ability to overlay curves from multiple grid cells (special viewer)
 * - Work with series stored in multiple formats (binary for performance, json for flexibility, etc)
*/

export const FIT_SEM_TYPE = 'fit';
export const FIT_CELL_TYPE = 'fit';
export const TAG_FIT = '.fit';

export const CONFIDENCE_INTERVAL_STROKE_COLOR = 'rgba(255,191,63,0.7)';
export const CONFIDENCE_INTERVAL_FILL_COLOR = 'rgba(255,238,204,0.3)';

export const CURVE_CONFIDENCE_INTERVAL_BOUNDS = {
  TOP: 'top',
  BOTTOM: 'bottom',
};

export type FitMarkerType = 'circle' | 'triangle up' | 'triangle down' | 'cross';

/** A point in the fit series. Only x and y are required. Can override some fields defined in IFitSeriesOptions. */
export interface IFitPoint {
  x: number;
  y: number;
  outlier?: boolean;       // if true, renders as 'x' and gets ignored for curve fitting
  minY?: number;           // when defined, the marker renders as a candlestick with whiskers [minY, maxY]
  maxY?: number;           // when defined, the marker renders as a candlestick with whiskers [minY, maxY]
  marker?: FitMarkerType;  // overrides the marker type defined in IFitSeriesOptions
  color?: string;          // overrides the marker color defined in IFitSeriesOptions
}

/** A series consists of points, has a name, and options.
 * If defined, seriesOptions are merged with {@link IFitChartData.seriesOptions} */
export interface IFitSeries extends IFitSeriesOptions {
  points: IFitPoint[];
}

/** Chart options. For fitted curves, this object is stored in the grid column tags and is used by the renderer. */
export interface IFitChartOptions {
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;

  xAxisName?: string;
  yAxisName?: string;

  logX?: boolean;
  logY?: boolean;

  showStatistics?: string[];
}

/** Data for the fit chart. */
export interface IFitChartData {
  chartOptions?: IFitChartOptions;
  seriesOptions?: IFitSeriesOptions;  // Default series options. Individual series can override it.
  series?: IFitSeries[];
}

/** Class that implements {@link IFitChartData} interface */
export class FitChartData implements IFitChartData {
  chartOptions: IFitChartOptions = {};
  seriesOptions: IFitSeriesOptions = {};  // Default series options. Individual series can override it.
  series: IFitSeries[] = [];
}

/** Series options can be either applied globally on a column level, or partially overridden in particular series */
export interface IFitSeriesOptions {
  name?: string;
  fitFunction?: string | IFitFunctionDescription;
  parameters?: number[];         // auto-fitting when not defined
  pointColor?: string;
  fitLineColor?: string;
  confidenceIntervalColor?: string;
  showFitLine?: boolean;
  showPoints?: boolean;
  showCurveConfidenceInterval?: boolean;   // show ribbon
  showIntercept?: boolean;
  showBoxPlot?: boolean;      // if true, multiple values with the same X are rendered as a candlestick
  showConfidenceForX?: number;
  clickToToggle?: boolean;    // If true, clicking on the point toggles its outlier status and causes curve refitting
}


/** Properties that describe {@link FitStatistics}. Useful for editing, initialization, transformations, etc. */
export const statisticsProperties: Property[] = [
  Property.js('rSquared', TYPE.FLOAT, {userEditable: false}),
  Property.js('auc', TYPE.FLOAT, {userEditable: false}),
  Property.js('interceptY', TYPE.FLOAT, {userEditable: false}),
  Property.js('interceptX', TYPE.FLOAT, {userEditable: false}),
  Property.js('slope', TYPE.FLOAT, {userEditable: false}),
  Property.js('top', TYPE.FLOAT, {userEditable: false}),
  Property.js('bottom', TYPE.FLOAT, {userEditable: false}),
];

/** Properties that describe {@link IFitChartOptions}. Useful for editing, initialization, transformations, etc. */
export const fitChartDataProperties: Property[] = [
  // Style and zoom
  Property.js('minX', TYPE.FLOAT, {description: 'Minimum value of the X axis', nullable: true}),
  Property.js('minY', TYPE.FLOAT, {description: 'Minimum value of the Y axis', nullable: true}),
  Property.js('maxX', TYPE.FLOAT, {description: 'Maximum value of the X axis', nullable: true}),
  Property.js('maxY', TYPE.FLOAT, {description: 'Maximum value of the Y axis', nullable: true}),
  Property.js('xAxisName', TYPE.STRING, {description:
    'Label to show on the X axis. If not specified, corresponding data column name is used', nullable: true}),
  Property.js('yAxisName', TYPE.STRING, {description:
    'Label to show on the Y axis. If not specified, corresponding data column name is used', nullable: true}),
  Property.js('logX', TYPE.BOOL, {defaultValue: false}),
  Property.js('logY', TYPE.BOOL, {defaultValue: false}),
  Property.js('showStatistics', TYPE.STRING_LIST, {choices: statisticsProperties.map((frp) => frp.name)}),
];

/** Properties that describe {@link IFitSeriesOptions}. Useful for editing, initialization, transformations, etc. */
export const fitSeriesProperties: Property[] = [
  Property.js('name', TYPE.STRING),
  Property.js('fitFunction', TYPE.STRING,
    {category: 'Fitting', choices: ['sigmoid', 'linear'], defaultValue: 'sigmoid'}),
  Property.js('pointColor', TYPE.STRING,
    {category: 'Rendering', defaultValue: DG.Color.toHtml(DG.Color.scatterPlotMarker), nullable: true}),
  Property.js('fitLineColor', TYPE.STRING,
    {category: 'Rendering', defaultValue: DG.Color.toHtml(DG.Color.scatterPlotMarker), nullable: true}),
  Property.js('clickToToggle', TYPE.BOOL, {category: 'Fitting', description:
    'If true, clicking on the point toggles its outlier status and causes curve refitting', nullable: true, defaultValue: false}),
  Property.js('autoFit', TYPE.BOOL,
    {category: 'Fitting', description: 'Perform fitting on-the-fly', defaultValue: true}),
  Property.js('showFitLine', TYPE.BOOL,
    {category: 'Fitting', description: 'Whether the fit line should be rendered', defaultValue: true}),
  Property.js('showPoints', TYPE.BOOL,
    {category: 'Fitting', description: 'Whether points should be rendered', defaultValue: true}),
  Property.js('showBoxPlot', TYPE.BOOL,
    {category: 'Fitting', description: 'Whether candlesticks should be rendered', defaultValue: true}),
];

export const FIT_FUNCTION_SIGMOID = 'sigmoid';
export const FIT_FUNCTION_LINEAR = 'linear';

export const FIT_STATS_RSQUARED = 'rSquared';
export const FIT_STATS_AUC = 'auc';


export abstract class FitFunction {
  abstract get name(): string;
  abstract get parameterNames(): string[];
  abstract y(params: number[], x: number): number;
  abstract getInitialParameters(x: number[], y: number[]): number[];
}

export class LinearFunction extends FitFunction {
  get name(): string {
    return FIT_FUNCTION_LINEAR;
  }

  get parameterNames(): string[] {
    return ['Slope', 'Intercept'];
  }

  y(params: number[], x: number): number {
    throw new Error('Not implemented');
  }

  getInitialParameters(x: number[], y: number[]): number[] {
    throw new Error('Not implemented');
  }
}

export class SigmoidFunction extends FitFunction {
  get name(): string {
    return FIT_FUNCTION_SIGMOID;
  }

  get parameterNames(): string[] {
    return ['Top', 'Bottom', 'Slope', 'IC50'];
  }

  y(params: number[], x: number): number {
    return sigmoid(params, x);
  }

  getInitialParameters(x: number[], y: number[]): number[] {
    const dataBounds = DG.Rect.fromXYArrays(x, y);
    const medY = (dataBounds.bottom - dataBounds.top) / 2 + dataBounds.top;
    let maxYInterval = dataBounds.bottom - dataBounds.top;
    let nearestXIndex = 0;
    for (let i = 0; i < x.length; i++) {
      const currentInterval = Math.abs(y[i] - medY);
      if (currentInterval < maxYInterval) {
        maxYInterval = currentInterval;
        nearestXIndex = i;
      }
    }
    const xAtMedY = x[nearestXIndex];
    const slope = y[0] > y[y.length - 1] ? 1.2 : -1.2;

    // params are: [max, tan, IC50, min]
    return [dataBounds.bottom, slope, xAtMedY, dataBounds.top];
  }
}

export class JsFunction extends FitFunction {
  private _name: string;
  private _parameterNames: string[];

  constructor(name: string, yFunc: (params: number[], x: number) => number,
    getInitParamsFunc: (x: number[], y: number[]) => number[], parameterNames: string[]) {
    super();

    this._name = name;
    this._parameterNames = parameterNames;

    this.y = yFunc;
    this.getInitialParameters = getInitParamsFunc;
  }

  get name(): string {
    return this._name;
  }

  get parameterNames(): string[] {
    return this._parameterNames;
  }

  y(params: number[], x: number): number {
    throw new Error('Not implemented');
  }

  getInitialParameters(x: number[], y: number[]): number[] {
    throw new Error('Not implemented');
  }
}

export const fitFunctions: {[index: string]: FitFunction} = {
  'linear': new LinearFunction(),
  'sigmoid': new SigmoidFunction(),
};

export interface IFitOptions {
  errorModel: FitErrorModel;
  confidenceLevel: number;
  statistics: boolean;
}


function createObjectiveFunction(errorModel: FitErrorModel): ObjectiveFunction {
  let of: ObjectiveFunction;

  switch (errorModel) {
  case FitErrorModel.Constant:
    of = objectiveNormalConstant;
    break;
  case FitErrorModel.Proportional:
    of = objectiveNormalProportional;
    break;
  default:
    of = objectiveNormalConstant;
    break;
  }

  return of;
}

function createOptimizable(data: {x: number[], y: number[]}, curveFunction: (params: number[], x: number) => number,
  of: ObjectiveFunction): Optimizable {
  const fixed: number[] = [];

  const optimizable = {
    getValue: (parameters: number[]) => {
      return of(curveFunction, data, parameters).value;
    },
    getGradient: (parameters: number[], gradient: number[]) => {
      for (let i = 0; i < parameters.length; i++)
        gradient[i] = fixed.includes(i) ? 0 : getObjectiveDerivative(of, curveFunction, data, parameters, i);

      return gradient;
    },
  };

  return optimizable;
}

export function getOrCreateFitFunction(seriesFitFunc: string | IFitFunctionDescription): FitFunction {
  if (typeof seriesFitFunc === 'string')
    return fitFunctions[seriesFitFunc];
  else if (!fitFunctions[seriesFitFunc.name]) {
    const name = seriesFitFunc.name;
    const paramNames = seriesFitFunc.parameterNames;
    const fitFunctionParts = seriesFitFunc.function.split('=>').map((elem) => elem.trim());
    const getInitParamsParts = seriesFitFunc.getInitialParameters.split('=>').map((elem) => elem.trim());
    const fitFunction = new Function(fitFunctionParts[0].slice(1, fitFunctionParts[0].length - 1),
      `return ${fitFunctionParts[1]}`);
    const getInitParamsFunc = new Function(getInitParamsParts[0].slice(1, getInitParamsParts[0].length - 1),
      `return ${getInitParamsParts[1]}`);
    const fitFunc = new JsFunction(name, (fitFunction as (params: number[], x: number) => number),
      (getInitParamsFunc as (x: number[], y: number[]) => number[]), paramNames);
    fitFunctions[name] = fitFunc;
  }

  return fitFunctions[seriesFitFunc.name];
}

export function fitData(data: {x: number[], y: number[]}, fitFunction: FitFunction, errorModel: FitErrorModel):
  FitCurve {
  const curveFunction = fitFunction.y;
  const paramValues = fitFunction.getInitialParameters(data.x, data.y);

  const of = createObjectiveFunction(errorModel);
  const optimizable = createOptimizable(data, curveFunction, of);

  // const fixed: number[] = [];
  let overLimits = true;

  while (overLimits) {
    limitedMemoryBFGS(optimizable, paramValues);
    limitedMemoryBFGS(optimizable, paramValues);

    overLimits = false;
    // for (let i = 0; i < paramValues.length; i++) {
    //   if (params[i]?.maxBound !== undefined && paramValues[i] > params[i].maxBound!) {
    //     overLimits = true;
    //     fixed.push(i);
    //     paramValues[i] = params[i].maxBound!;
    //     break;
    //   }
    //   if (params[i]?.minBound !== undefined && paramValues[i] < params[i].minBound!) {
    //     overLimits = true;
    //     fixed.push(i);
    //     paramValues[i] = params[i].minBound!;
    //     break;
    //   }
    // }
  }

  const fittedCurve = getFittedCurve(curveFunction, paramValues);

  return {
    fittedCurve: fittedCurve,
    parameters: paramValues,
  };
}

export function getFittedCurve(curveFunction: (params: number[], x: number) => number, paramValues: number[]):
 (x: number) => number {
  const fittedCurve = (x: number) => {
    return curveFunction(paramValues, x);
  };

  return fittedCurve;
}

export function getCurveConfidenceIntervals(data: {x: number[], y: number[]}, paramValues: number[],
  curveFunction: (params: number[], x: number) => number, confidenceLevel: number = 0.05, errorModel: FitErrorModel):
  FitConfidenceIntervals {
  const of = createObjectiveFunction(errorModel);

  const error = errorModel === FitErrorModel.Proportional ?
    of(curveFunction, data, paramValues).mult :
    of(curveFunction, data, paramValues).const;

  const studentQ = jStat.studentt.inv(1 - confidenceLevel / 2, data.x.length - paramValues.length);

  const top = (x: number) =>{
    const value = curveFunction(paramValues, x);
    if (errorModel === FitErrorModel.Constant)
      return value + studentQ * error / Math.sqrt(data.x.length);
    else
      return value + studentQ * (Math.abs(value) * error / Math.sqrt(data.x.length));
  };

  const bottom = (x: number) => {
    const value = curveFunction(paramValues, x);
    if (errorModel === FitErrorModel.Constant)
      return value - studentQ * error / Math.sqrt(data.x.length);
    else
      return value - studentQ * (Math.abs(value) * error / Math.sqrt(data.x.length));
  };

  return {confidenceTop: top, confidenceBottom: bottom};
}

export function getStatistics(data: {x: number[], y: number[]}, paramValues: number[],
  curveFunction: (params: number[], x: number) => number, statistics: boolean = true): FitStatistics {
  const fittedCurve = getFittedCurve(curveFunction, paramValues);

  return {
    rSquared: statistics ? getDetCoeff(fittedCurve, data) : undefined,
    auc: statistics ? getAuc(fittedCurve, data) : undefined,
    interceptX: paramValues[2],
    interceptY: fittedCurve(paramValues[2]),
    slope: paramValues[1],
    top: paramValues[0],
    bottom: paramValues[3],
  };
}

export function getInvertedFunctions(data: {x: number[], y: number[]}, paramValues: number[],
  confidenceLevel: number = 0.05, statistics: boolean = true): FitInvertedFunctions | null {
  const studentQ = jStat.studentt.inv(1 - confidenceLevel / 2, data.x.length - paramValues.length);

  let inv: (y: number) => number = (y: number) => {
    return 0;
  };
  let invTop: (y: number) => number = (y: number) => {
    return 0;
  };
  let invBottom: (y: number) => number = (y: number) => {
    return 0;
  };

  if (statistics) {
    inv = (y: number) => {
      //should check if more than bottom and less than top
      return paramValues[2] / Math.pow((paramValues[0] - y) / (y - paramValues[3]), 1 / paramValues[1]);
    };

    const error = getInvError(inv, data);

    invTop = (y: number) => {
      const value = inv(y);
      return value + studentQ * error / Math.sqrt(data.y.length);
    };

    invBottom = (y: number) => {
      const value = inv(y);
      return value - studentQ * error / Math.sqrt(data.y.length);
    };

    return {
      inverted: inv,
      invertedTop: invTop,
      invertedBottom: invBottom,
    };
  }

  return null;
}

export function sigmoid(params: number[], x: number): number {
  const A = params[0];
  const B = params[1];
  const C = params[2];
  const D = params[3];
  const res = D + (A - D) / (1 + Math.pow(10, (x - C) * B));
  return res;
}

export function getAuc(fittedCurve: (x: number) => number, data: {x: number[], y: number[]}): number {
  let auc = 0;

  const min = Math.min(...data.x);
  const max = Math.max(...data.x);
  const integrationStep = (max - min) / 1000;

  for (let x = min; x < max; x+= integrationStep)
    auc += integrationStep * fittedCurve(x);

  return auc;
}

export function getDetCoeff(fittedCurve: (x: number) => number, data: {x: number[], y: number[]}): number {
  let ssRes = 0;
  let ssTot = 0;

  const yMean = jStat.mean(data.y);

  for (let i = 0; i < data.x.length; i++) {
    ssRes += Math.pow(data.y[i] - fittedCurve(data.x[i]), 2);
    ssTot += Math.pow(data.y[i] - yMean, 2);
  }

  return 1 - ssRes / ssTot;
}

function getInvError(targetFunc: (y: number) => number, data: {y: number[], x: number[]}): number {
  let sigma = 0;
  let sigmaSq = 0;

  const residuesSquares = new Float32Array(data.y.length);
  for (let i = 0; i < data.y.length; i++) {
    const obs = data.x[i];
    const pred = targetFunc(data.y[i]);
    residuesSquares[i] = Math.pow(obs - pred, 2);
  }

  for (let i = 0; i < residuesSquares.length; i++)
    sigmaSq += residuesSquares[i];

  sigmaSq /= residuesSquares.length;
  sigma = Math.sqrt(sigmaSq);

  return sigma;
}

function getObjectiveDerivative(of: ObjectiveFunction, curveFunction: (params: number[], x: number) => number,
  data: {x: number[], y: number[]}, params: number[], selectedParam: number): number {
  const step = (params[selectedParam] * 0.0001) === 0 ? 0.001 : (params[selectedParam] * 0.0001);
  const paramsTop: number[] = [];
  const paramsBottom: number[] = [];
  for (let i = 0; i < params.length; i++) {
    if (i === selectedParam) {
      paramsTop.push(params[i] + step);
      paramsBottom.push(params[i] - step);
    } else {
      paramsTop.push(params[i]);
      paramsBottom.push(params[i]);
    }
  }
  const drvTop = of(curveFunction, data, paramsTop).value;
  const drvBottom = of(curveFunction, data, paramsBottom).value;

  return (drvTop - drvBottom) / (2 * step);
}

function objectiveNormalConstant(targetFunc: (params: number[], x: number) => number,
  data: {y: number[], x: number[]}, params: number[]): Likelihood {
  //assure observed and args same length
  const pi = Math.PI;
  let sigma = 0;
  let sigmaSq = 0;
  let likelihood = 0;

  const residuesSquares = new Float32Array(data.x.length);
  for (let i = 0; i < data.x.length; i++) {
    const obs = data.y[i];
    const pred = targetFunc(params, data.x[i]);
    residuesSquares[i] = Math.pow(obs - pred, 2);
  }

  for (let i = 0; i < residuesSquares.length; i++)
    sigmaSq += residuesSquares[i];

  sigmaSq /= residuesSquares.length;
  sigma = Math.sqrt(sigmaSq);

  for (let i = 0; i < residuesSquares.length; i++)
    likelihood += residuesSquares[i] / sigmaSq + Math.log(2 * pi * sigmaSq);

  return {value: -likelihood, const: sigma, mult: 0};
}

function objectiveNormalProportional(targetFunc: (params: number[], x: number) => number,
  data: {y: number[], x: number[]}, params: number[]): Likelihood {
  //assure observed and args same length
  const pi = Math.PI;
  let sigma = 0;
  let sigmaSq = 0;
  let likelihood = 0;

  const residuesSquares = new Float32Array(data.x.length);
  for (let i = 0; i < data.x.length; i++) {
    const obs = data.y[i];
    const pred = targetFunc(params, data.x[i]);
    residuesSquares[i] = Math.pow(obs - pred, 2);
  }

  for (let i = 0; i < residuesSquares.length; i++)
    sigmaSq += residuesSquares[i];

  sigmaSq /= residuesSquares.length;
  sigma = Math.sqrt(sigmaSq);

  for (let i = 0; i < residuesSquares.length; i++)
    likelihood += residuesSquares[i] / sigmaSq + Math.log(2 * pi * sigmaSq);

  return {value: -likelihood, const: sigma, mult: 0};
}
