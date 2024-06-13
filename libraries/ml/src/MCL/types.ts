import {DistanceAggregationMethod} from '../distance-matrix/types';
import {KnownMetrics} from '../typed-metrics';

export type MCLOptions = {
    expandFactor: number,
    maxIterations: number,
    inflateFactor: number,
    multFactor: number,
}

export type SparseMatrixObject = {[_: number]: {[_: number]: number}};

export const MCLMethodName = 'MCL';

export type MCLSerializableOptions = {
    cols: string[];
    metrics: KnownMetrics[];
    weights: number[];
    aggregationMethod: DistanceAggregationMethod;
    preprocessingFuncs: (string | null | undefined)[];
    preprocessingFuncArgs: any[];
    threshold: number;
    maxIterations: number;
    useWebGPU: boolean;
    inflate: number;
}

export const MCL_OPTIONS_TAG = 'MCL_OPTIONS';
