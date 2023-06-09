import * as fl from 'fastest-levenshtein';
import {jaroWinkler} from 'jaro-winkler-typescript';
import {DistanceMetric} from '@datagrok-libraries/utils/src/type-declarations';
import {
  asymmetricDistance,
  braunBlanquetDistance,
  cosineDistance,
  diceDistance,
  euclideanDistance,
  hammingDistance,
  kulczynskiDistance,
  mcConnaugheyDistance,
  rogotGoldbergDistance,
  russelDistance,
  sokalDistance,
  tanimotoDistance,
  numericDistance,
} from '../distance-metrics-methods';

import {calculateEuclideanDistance} from '@datagrok-libraries/utils/src/vector-operations';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {Vector, StringDictionary} from '@datagrok-libraries/utils/src/type-declarations';
import {mmDistanceFunctions, MmDistanceFunctionsNames} from '../macromolecule-distance-functions';
import {DistanceMetricsSubjects, BitArrayMetricsNames,
  StringMetricsNames, VectorMetricsNames, NumberMetricsNames} from './consts';


export const vectorDistanceMetricsMethods: { [name: string]: (x: Vector, y: Vector) => number } = {
  [VectorMetricsNames.Euclidean]: calculateEuclideanDistance,
};

export const stringDistanceMetricsMethods: { [name: string]: (x: string, y: string) => number } = {
  [StringMetricsNames.Levenshtein]: fl.distance,
  [StringMetricsNames.JaroWinkler]: jaroWinkler,
  [StringMetricsNames.Manhattan]: manhattanDistance,
};

export const bitArrayDistanceMetricsMethods: { [name: string]: (x: BitArray, y: BitArray) => number } = {
  [BitArrayMetricsNames.Tanimoto]: tanimotoDistance,
  [BitArrayMetricsNames.Dice]: diceDistance,
  [BitArrayMetricsNames.Asymmetric]: asymmetricDistance,
  [BitArrayMetricsNames.BraunBlanquet]: braunBlanquetDistance,
  [BitArrayMetricsNames.Cosine]: cosineDistance,
  [BitArrayMetricsNames.Kulczynski]: kulczynskiDistance,
  [BitArrayMetricsNames.McConnaughey]: mcConnaugheyDistance,
  [BitArrayMetricsNames.RogotGoldberg]: rogotGoldbergDistance,
  [BitArrayMetricsNames.Russel]: russelDistance,
  [BitArrayMetricsNames.Sokal]: sokalDistance,
  [BitArrayMetricsNames.Hamming]: hammingDistance,
  [BitArrayMetricsNames.Euclidean]: euclideanDistance,
};

export const numberDistanceMetricsMethods: { [name: string]: (x: number, y: number) => number } = {
  [NumberMetricsNames.NumericDistance]: numericDistance,
};

export const AvailableMetrics = {
  [DistanceMetricsSubjects.Vector]: {
    [VectorMetricsNames.Euclidean]: vectorDistanceMetricsMethods[VectorMetricsNames.Euclidean],
  },
  [DistanceMetricsSubjects.String]: {
    [StringMetricsNames.Levenshtein]: stringDistanceMetricsMethods[StringMetricsNames.Levenshtein],
    [StringMetricsNames.JaroWinkler]: stringDistanceMetricsMethods[StringMetricsNames.JaroWinkler],
    [StringMetricsNames.Manhattan]: stringDistanceMetricsMethods[StringMetricsNames.Manhattan],
  },
  [DistanceMetricsSubjects.BitArray]: {
    [BitArrayMetricsNames.Tanimoto]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Tanimoto],
    [BitArrayMetricsNames.Dice]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Dice],
    [BitArrayMetricsNames.Asymmetric]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Asymmetric],
    [BitArrayMetricsNames.BraunBlanquet]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.BraunBlanquet],
    [BitArrayMetricsNames.Cosine]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Cosine],
    [BitArrayMetricsNames.Kulczynski]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Kulczynski],
    [BitArrayMetricsNames.McConnaughey]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.McConnaughey],
    [BitArrayMetricsNames.RogotGoldberg]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.RogotGoldberg],
    [BitArrayMetricsNames.Russel]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Russel],
    [BitArrayMetricsNames.Sokal]: bitArrayDistanceMetricsMethods[BitArrayMetricsNames.Sokal],
  },
  [DistanceMetricsSubjects.MacroMolecule]: { // optional args needed for macromolecule functions which initialize them
    [MmDistanceFunctionsNames.HAMMING]: mmDistanceFunctions[MmDistanceFunctionsNames.HAMMING],
    [MmDistanceFunctionsNames.LEVENSHTEIN]: mmDistanceFunctions[MmDistanceFunctionsNames.LEVENSHTEIN],
    [MmDistanceFunctionsNames.NEEDLEMANN_WUNSCH]: mmDistanceFunctions[MmDistanceFunctionsNames.NEEDLEMANN_WUNSCH],
  },
  [DistanceMetricsSubjects.Number]: {
    [NumberMetricsNames.NumericDistance]: numberDistanceMetricsMethods[NumberMetricsNames.NumericDistance],
  }
};

export const MetricToDataType: StringDictionary = Object.keys(AvailableMetrics)
  .reduce((ret: StringDictionary, key) => {
    for (const val of Object.keys(AvailableMetrics[key as AvailableDataTypes]))
      ret[val as AvailableDataTypes] = key;

    return ret;
  }, {});

export type AvailableDataTypes = keyof typeof AvailableMetrics;
export type VectorMetrics = keyof typeof AvailableMetrics[DistanceMetricsSubjects.Vector];
export type StringMetrics = keyof typeof AvailableMetrics[DistanceMetricsSubjects.String];
export type BitArrayMetrics = keyof typeof AvailableMetrics[DistanceMetricsSubjects.BitArray];
export type KnownMetrics = StringMetrics | BitArrayMetrics | VectorMetrics |
  MmDistanceFunctionsNames | NumberMetricsNames;

export type ValidTypes =
  { data: string[], metric: StringMetrics | MmDistanceFunctionsNames } |
  { data: Vector[], metric: VectorMetrics } |
  { data: BitArray[], metric: BitArrayMetrics } |
  { data: number[], metric: NumberMetricsNames };

export function isStringMetric(name: KnownMetrics) {
  return MetricToDataType[name] == 'String';
}

export function isBitArrayMetric(name: KnownMetrics) {
  return MetricToDataType[name] == 'BitArray';
}

export function isVectorMetric(name: KnownMetrics) {
  return MetricToDataType[name] == 'Vector';
}

export function isMacroMoleculeMetric(name: KnownMetrics) {
  return MetricToDataType[name] == DistanceMetricsSubjects.MacroMolecule.toString();
}

/** Manhattan distance between two sequences (match - 0, mismatch - 1) normalized for length. */
export function manhattanDistance(s1: string, s2: string): number {
  if (s1.length !== s2.length) {
    return 1;
  } else {
    let dist: number = 0;
    for (let i = 1; i < s1.length; i++)
      dist += s1[i] == s2[i] ? 0 : 1;
    return dist / s1.length;
  }
}

/** Unified class implementing different string measures. */
export class Measure {
  protected method: KnownMetrics;
  protected dataType: AvailableDataTypes;

  /**
   * Creates an instance of Measure with .
   * @param {string} method Method to calculate distance between strings.
   * @memberof Measurer
   */
  constructor(method: KnownMetrics) {
    this.method = method;
    this.dataType = MetricToDataType[method] as AvailableDataTypes;
  }

  /**
   * Returns custom string distance function specified.
   * @param {opts} opts Options for the measure. used for macromolecule distances
   * @return {DistanceMetric} Callback of the measure chosen.
   * @memberof Measurer
   */
  public getMeasure(opts?: any): DistanceMetric {
    const dict: { [key: string]:
      {[key2: string]: DistanceMetric | ((opts: any) => DistanceMetric)}
    } = AvailableMetrics;
    if (!dict.hasOwnProperty(this.dataType) || !dict[this.dataType].hasOwnProperty(this.method))
      throw new Error(`Unknown measure ${this.method} for data type ${this.dataType}`);
    return isMacroMoleculeMetric(this.method) ?
      (dict[this.dataType][this.method] as ((opts: any) => DistanceMetric))(opts) :
      dict[this.dataType][this.method] as DistanceMetric;
  }

  /**
   * Returns custom string distance by the given data type.
   * @param {AvailableDataTypes} dataType Metric's data type
   * @return {string[]} Metric names which expects the given data type
   * @memberof Measurer
   */
  public static getMetricByDataType(dataType: AvailableDataTypes): string[] {
    return Object.keys(AvailableMetrics[dataType]);
  }

  /** Returns metric names available.
   * @memberof Measurer
   */
  static get availableMeasures(): string[] {
    return Object.keys(AvailableMetrics);
  }
}
