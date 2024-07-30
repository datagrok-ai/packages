// Softmax classifier (multinomial logistic regression): https://en.wikipedia.org/wiki/Multinomial_logistic_regression

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_fitSoftmax} from '../wasm/EDAAPI';

const ROWS_EXTRA = 1;
const COLS_EXTRA = 2;
const MIN_COLS_COUNT = 1 + COLS_EXTRA;
const AVGS_NAME = 'Avg-s';
const STDEVS_NAME = 'Stddev-s';
const PRED_NAME = 'predicted';
const DEFAULT_LEARNING_RATE = 1;
const DEFAULT_ITER_COUNT = 100;
const DEFAULT_PENALTY = 0.1;
const DEFAULT_TOLERANCE = 0.001;
const BYTES_PER_MODEL_SIZE = 4;

/** Train data sizes */
type DataSpecification = {
  classesCount: number,
  featuresCount: number,
};

/** Target labels specification */
type TargetLabelsData = {
  oneHot: Array<Uint8Array>,
  weights: Uint32Array,
};

/** Interactivity tresholds */
enum INTERACTIVITY {
  MAX_SAMLPES = 50000,
  MAX_FEATURES = 100,
};

/** Softmax classifier */
export class SoftmaxClassifier {
  /** Check applicability */
  static isApplicable(features: DG.ColumnList, predictColumn: DG.Column): boolean {
    for (const col of features) {
      if (!col.matches('numerical'))
        return false;
    }

    return (predictColumn.type === DG.COLUMN_TYPE.STRING);
  }

  /** Check interactivity */
  static isInteractive(features: DG.ColumnList, predictColumn: DG.Column): boolean {
    return (features.length <= INTERACTIVITY.MAX_FEATURES) &&
      (predictColumn.length <= INTERACTIVITY.MAX_SAMLPES);
  }

  private avgs: Float32Array;
  private stdevs: Float32Array;
  private categories: string[];
  private params: Float32Array[] | undefined = undefined;
  private classesCount = 1;
  private featuresCount = 1;

  constructor(specification?: DataSpecification, packedModel?: Uint8Array) {
    if (specification !== undefined) { // Create empty model
      /** features count */
      const n = specification.featuresCount;

      /** classes count */
      const c = specification.classesCount;

      if (n < 1)
        throw new Error('Incorrect features count');

      if (c < 1)
        throw new Error('Incorrect classes count');

      /** length of arrays */
      const len = n + ROWS_EXTRA;

      // Init model routine
      this.avgs = new Float32Array(len);
      this.stdevs = new Float32Array(len);
      this.categories = new Array<string>(len);
      this.featuresCount = n;
      this.classesCount = c;
    } else if (packedModel !== undefined) { // Get classifier from packed model (bytes)
      try {
        // Extract model's bytes count
        const sizeArr = new Uint32Array(packedModel.buffer, 0, 1);
        const bytesCount = sizeArr[0];

        // Model's bytes
        const modelBytes = new Uint8Array(packedModel.buffer, BYTES_PER_MODEL_SIZE, bytesCount);

        const modelDf = DG.DataFrame.fromByteArray(modelBytes);
        const columns = modelDf.columns;
        const colsCount = columns.length;

        if (colsCount < MIN_COLS_COUNT)
          throw new Error('incorrect columns count');

        this.classesCount = colsCount - COLS_EXTRA;
        this.featuresCount = modelDf.rowCount - ROWS_EXTRA;

        const c = this.classesCount;

        // extract params & categories
        this.params = new Array<Float32Array>(c);
        this.categories = new Array<string>(modelDf.rowCount);

        for (let i = 0; i < c; ++i) {
          const col = columns.byIndex(i);
          this.categories[i] = col.name;

          if (col.type !== DG.COLUMN_TYPE.FLOAT)
            throw new Error(`Incorrect input column type. Expected: float, passed: ${col.type}`);

          this.params[i] = col.getRawData() as Float32Array;
        }

        // extract averages
        const avgsCol = columns.byName(AVGS_NAME);
        if (avgsCol.type !== DG.COLUMN_TYPE.FLOAT)
          throw new Error('incorrect average values column type');
        this.avgs = avgsCol.getRawData() as Float32Array;

        // extract stdevs
        const stdevsCol = columns.byName(STDEVS_NAME);
        if (stdevsCol.type !== DG.COLUMN_TYPE.FLOAT)
          throw new Error('incorrect standard deviations column type');
        this.stdevs = stdevsCol.getRawData() as Float32Array;
      } catch (e) {
        throw new Error(`Failed to load model: ${(e instanceof Error ? e.message : 'the platform issue')}`);
      }
    } else
      throw new Error('Softmax classifier not initialized');
  }; // constructor

  /** Return packed softmax classifier */
  public toBytes(): Uint8Array {
    if (this.params === undefined)
      throw new Error('Non-trained model');

    const c = this.classesCount;
    const columns = new Array<DG.Column>(c + COLS_EXTRA);

    // params columns
    for (let i = 0; i < c; ++i)
      columns[i] = DG.Column.fromFloat32Array(this.categories[i], this.params[i]);

    // averages
    columns[c] = DG.Column.fromFloat32Array(AVGS_NAME, this.avgs);

    // stdevs
    columns[c + 1] = DG.Column.fromFloat32Array(STDEVS_NAME, this.stdevs);

    const modelDf = DG.DataFrame.fromColumns(columns);

    const modelBytes = modelDf.toByteArray();
    const bytesCount = modelBytes.length;

    // Packed model bytes, including bytes count
    const packedModel = new Uint8Array(bytesCount + BYTES_PER_MODEL_SIZE);

    // 4 bytes for storing model's bytes count
    const sizeArr = new Uint32Array(packedModel.buffer, 0, 1);
    sizeArr[0] = bytesCount;

    // Store model's bytes
    packedModel.set(modelBytes, BYTES_PER_MODEL_SIZE);

    return packedModel;
  } // toBytes

  /** Train classifier */
  public async fit(features: DG.ColumnList, target: DG.Column, rate: number = DEFAULT_LEARNING_RATE,
    iterations: number = DEFAULT_ITER_COUNT, penalty: number = DEFAULT_PENALTY, tolerance: number = DEFAULT_TOLERANCE) {
    if (features.length !== this.featuresCount)
      throw new Error('Training failes - incorrect features count');

    if ((rate <= 0) || (iterations < 1) || (penalty <= 0) || (tolerance <= 0))
      throw new Error('Training failes - incorrect fitting hyperparameters');

    // Extract statistics & categories
    this.extractStats(features);
    const rowsCount = target.length;
    const classesCount = target.categories.length;
    const cats = target.categories;
    for (let i = 0; i < classesCount; ++i)
      this.categories[i] = cats[i];

    try {
      // call wasm-computations
      const paramCols = _fitSoftmax(
        features,
        DG.Column.fromFloat32Array('avgs', this.avgs, this.featuresCount),
        DG.Column.fromFloat32Array('stdevs', this.stdevs, this.featuresCount),
        DG.Column.fromInt32Array('targets', target.getRawData() as Int32Array, rowsCount),
        classesCount,
        iterations, rate, penalty, tolerance,
        this.featuresCount + 1, classesCount,
      ).columns as DG.ColumnList;

      this.params = new Array<Float32Array>(classesCount);
      for (let i = 0; i < classesCount; ++i)
        this.params[i] = paramCols.byIndex(i).getRawData() as Float32Array;
    } catch (error) {
      try { // call fitting TS-computations (if wasm failed)
        this.params = await this.fitSoftmaxParams(
          features,
          target,
          iterations,
          rate,
          penalty,
          tolerance,
        ) as Float32Array[];
      } catch (error) {
        throw new Error('Training failes');
      }
    }

    if (this.params === undefined)
      throw new Error('Training failes');
  }; // fit

  /** Extract features' stats */
  private extractStats(features: DG.ColumnList): void {
    let j = 0;

    for (const col of features) {
      if ((col.type !== DG.COLUMN_TYPE.INT) && (col.type !== DG.COLUMN_TYPE.FLOAT))
        throw new Error('Training failes - incorrect features type');

      this.avgs[j] = col.stats.avg;
      this.stdevs[j] = col.stats.stdev;

      ++j;
    }
  } // extractStats

  /** Retrun normalized features */
  private normalized(features: DG.ColumnList): Array<Float32Array> {
    const m = features.byIndex(0).length;

    const X = new Array<Float32Array>(m);

    for (let i = 0; i < m; ++i)
      X[i] = new Float32Array(this.featuresCount);

    let j = 0;
    for (const col of features) {
      if ((col.type !== DG.COLUMN_TYPE.INT) && (col.type !== DG.COLUMN_TYPE.FLOAT))
        throw new Error('Training failes - incorrect features type');

      const raw = col.getRawData();
      const avg = this.avgs[j];
      const stdev = this.stdevs[j];

      if (stdev > 0) {
        for (let i = 0; i < m; ++i)
          X[i][j] = (raw[i] - avg) / stdev;
      } else {
        for (let i = 0; i < m; ++i)
          X[i][j] = 0;
      }

      ++j;
    }

    return X;
  } // normalized

  /** Retrun normalized & transposed features */
  private transposed(features: DG.ColumnList): Array<Float32Array> {
    const m = features.byIndex(0).length;
    const n = this.featuresCount;

    const X = new Array<Float32Array>(n);

    for (let i = 0; i < n; ++i)
      X[i] = new Float32Array(m);

    let j = 0;
    for (const col of features) {
      if ((col.type !== DG.COLUMN_TYPE.INT) && (col.type !== DG.COLUMN_TYPE.FLOAT))
        throw new Error('Training failes - incorrect features type');

      const raw = col.getRawData();
      const avg = this.avgs[j];
      const stdev = this.stdevs[j];

      if (stdev > 0) {
        for (let i = 0; i < m; ++i)
          X[j][i] = (raw[i] - avg) / stdev;
      } else {
        for (let i = 0; i < m; ++i)
          X[j][i] = 0;
      }

      ++j;
    }

    return X;
  } // transposed

  /** Return one-hot vectors and classes weights */
  private preprocessedTargets(target: DG.Column): TargetLabelsData {
    if (target.type !== DG.COLUMN_TYPE.STRING)
      throw new Error('Training failes - incorrect target type');

    const c = this.classesCount;
    const m = target.length;
    const raw = target.getRawData();

    const Y = new Array<Uint8Array>(m);
    const weights = new Uint32Array(c).fill(0);

    for (let i = 0; i < m; ++i)
      Y[i] = new Uint8Array(c).fill(0);

    for (let i = 0; i < m; ++i) {
      Y[i][raw[i]] = 1;
      ++weights[raw[i]];
    }

    return {
      oneHot: Y,
      weights: weights,
    };
  } // getOneHot

  /** Return prediction column */
  public predict(features: DG.ColumnList): DG.Column {
    if (this.params === undefined)
      throw new Error('Non-trained model');

    if (features.length !== this.featuresCount)
      throw new Error('Predcition fails: incorrect features count');

    // Normalize features
    const X = this.normalized(features);

    // Routine items
    const m = X.length;
    const n = this.featuresCount;
    const c = this.classesCount;
    let xBuf: Float32Array;
    let wBuf: Float32Array;
    const Z = new Float32Array(c);
    let sum: number;
    let max: number;
    let argMax: number;
    const predClass = new Array<string>(m);

    // get prediction for each sample
    for (let j = 0; j < m; ++j) {
      xBuf = X[j];
      sum = 0;

      for (let i = 0; i < c; ++i) {
        wBuf = this.params[i];
        sum = wBuf[n];

        for (let k = 0; k < n; ++k)
          sum += wBuf[k] * xBuf[k];

        Z[i] = Math.exp(sum);
      }

      max = Z[0];
      argMax = 0;

      for (let k = 1; k < c; ++k) {
        if (max < Z[k]) {
          max = Z[k];
          argMax = k;
        }
      }

      predClass[j] = this.categories[argMax];
    }

    return DG.Column.fromStrings(PRED_NAME, predClass);
  }

  /** Fit params in the webworker */
  private async fitSoftmaxParams(features: DG.ColumnList, target: DG.Column,
    iterations: number, rate: number, penalty: number, tolerance: number) {
    const targetData = this.preprocessedTargets(target);

    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./workers/softmax-worker.ts', import.meta.url));
      worker.postMessage({
        features: this.normalized(features),
        transposed: this.transposed(features),
        oneHot: targetData.oneHot,
        classesWeights: targetData.weights,
        targetRaw: target.getRawData(),
        iterations: iterations,
        rate: rate,
        penalty: penalty,
        tolerance: tolerance,
      });
      worker.onmessage = function(e) {
        worker.terminate();
        resolve(e.data.params);
        console.log(`Loss: ${e.data.loss}`);
      };
    });
  }
}; // SoftmaxClassifier
