import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

// Inputs correctness check tools

//Limitation constants
const COMP_MIN = 1;
const SAMPLES_COUNT_MIN = 1;
const FEATURES_COUNT_MIN = 1;
const PERCENTAGE_MIN = 0;
const PERCENTAGE_MAX = 100;
const MAX_ELEMENTS_COUNT = 100000000;
export const NIPALS_PREFER_COLS_COUNT = 900;

const TINY = 0.000001;

// Error messages
const COMP_POSITVE_MES = 'components must be positive.';
const COMP_EXCESS = 'components must not be greater than features count.';
const INCORERRECT_MIN_MAX_MES = 'min must be less than max.';
const INCORERRECT_FEATURES_MES = 'features must be positive.';
const INCORERRECT_SAMPLES_MES = 'samples must be positive.';
const INCORERRECT_PERCENTAGE_MES = 'violators percentage must be from the range from 0 to 100.';
const DATAFRAME_IS_TOO_BIG_MES = 'dataframe is too big.';
const UNSUPPORTED_COLUMN_TYPE_MES = 'unsupported column type: ';
const INCORRECT_MIN_DIST_MES = 'min distance must be positive.';
const INCORRECT_SPREAD_MES = 'spread must be positive.';
const INCORRECT_EPOCH_MES = 'number of epoch must be at least 1.';
const INCORRECT_NEIBORS_MES = 'number of neighbors must be at least 2 and not greater than samples count.';
const INCORRECT_ITERATIONS_MES = 'number of iterations must be at least 1.';
const INCORRECT_LEARNING_RATE_MES = 'learning rate must be positive.';
const INCORRECT_PERPLEXITY_MES = 'perplexity must be at least 2 and not greater than samples count.';
const INCORRECT_STEPS_MES = 'steps must be non-negative.';
const INCORRECT_CYCLES_MES = 'cycles must be positive.';
const INCORRECT_CUTOFF_MES = 'cutoff must be non-negative.';

/** Check column type */
export function checkColumnType(col: DG.Column): void {
  if ((col.type != DG.COLUMN_TYPE.FLOAT) && (col.type != DG.COLUMN_TYPE.INT))
    throw new Error(UNSUPPORTED_COLUMN_TYPE_MES + col.type);
}

/** Check missing values */
export function checkMissingVals(col: DG.Column): void {
  if (col.stats.missingValueCount > 0 )
    throw new Error(`The column '${col.name}' has missing values.`);
}

// Check dimension reducer inputs
export function checkDimensionReducerInputs(features: DG.ColumnList, components: number): void {
  if (components < COMP_MIN)
    throw new Error(COMP_POSITVE_MES);

  if (components > features.length)
    throw new Error(COMP_EXCESS);

  for (const col of features) {
    checkColumnType(col);
    checkMissingVals(col);
  }
}

// Check UMAP inputs
export function checkUMAPinputs(features: DG.ColumnList, components: number, epochs: number,
  neighbors: number, minDist: number, spread: number): void {
  // General dim reducer checks
  checkDimensionReducerInputs(features, components);

  // Check data total size
  if (features.length * features.byIndex(0).length > MAX_ELEMENTS_COUNT)
    throw new Error(DATAFRAME_IS_TOO_BIG_MES);

  // UMAP specific checks

  if (minDist <= 0)
    throw new Error(INCORRECT_MIN_DIST_MES);

  if (spread <= 0)
    throw new Error(INCORRECT_SPREAD_MES);

  if (epochs < 1)
    throw new Error(INCORRECT_EPOCH_MES);

  if ((neighbors < 2) || (neighbors > features.byIndex(0).length))
    throw new Error(INCORRECT_NEIBORS_MES);
}

// Check t-SNE inputs
export function checkTSNEinputs(features: DG.ColumnList, components: number,
  learningRate: number, perplexity: number, iterations: number): void {
  // General dim reducer checks
  checkDimensionReducerInputs(features, components);

  // Check data total size
  if (features.length * features.byIndex(0).length > MAX_ELEMENTS_COUNT)
    throw new Error(DATAFRAME_IS_TOO_BIG_MES);

  // t-SNE specific checks

  if (learningRate < 0)
    throw new Error(INCORRECT_LEARNING_RATE_MES);

  if (iterations < 1)
    throw new Error(INCORRECT_ITERATIONS_MES);

  if ((perplexity < 2) || (perplexity > features.byIndex(0).length))
    throw new Error(INCORRECT_PERPLEXITY_MES);
}

// Check SPE inputs
export function checkSPEinputs(features: DG.ColumnList, dimension: number,
  steps: number, cycles: number, cutoff: number, lambda: number): void {
  // General dim reducer checks
  checkDimensionReducerInputs(features, dimension);

  // Check data total size
  if (features.length * features.byIndex(0).length > MAX_ELEMENTS_COUNT)
    throw new Error(DATAFRAME_IS_TOO_BIG_MES);

  // SPE specific checks

  if (steps < 0)
    throw new Error(INCORRECT_STEPS_MES);

  if (cycles <= 0)
    throw new Error(INCORRECT_CYCLES_MES);

  if (cutoff < 0)
    throw new Error(INCORRECT_CUTOFF_MES);

  if (lambda <= 0)
    throw new Error(INCORRECT_LEARNING_RATE_MES);
}

// Check wasm dimension reducer inputs
export function checkWasmDimensionReducerInputs(features: DG.ColumnList, components: number): void {
  // General dim reducer checks
  checkDimensionReducerInputs(features, components);

  // Check data total size
  if (features.length * features.byIndex(0).length > MAX_ELEMENTS_COUNT)
    throw new Error(DATAFRAME_IS_TOO_BIG_MES);
}

// Check inputs of data for SVM testing generator
export function checkGeneratorSVMinputs(samplesCount: number, featuresCount: number,
  min: number, max: number, violatorsPercentage: number): void {
  if (min >= max)
    throw new Error(INCORERRECT_MIN_MAX_MES);

  if (featuresCount < FEATURES_COUNT_MIN)
    throw new Error(INCORERRECT_FEATURES_MES);

  if (samplesCount < SAMPLES_COUNT_MIN)
    throw new Error(INCORERRECT_SAMPLES_MES);

  if ((violatorsPercentage < PERCENTAGE_MIN) || (violatorsPercentage > PERCENTAGE_MAX))
    throw new Error(INCORERRECT_PERCENTAGE_MES);
}

// Returns rows of column data
export function getRowsOfNumericalColumnns(columnList: DG.ColumnList): any[][] {
  const columns = columnList.toList();
  const rowCount = columns[0].length;
  const colCount = columns.length;

  const output = [] as any[][];

  for (let i = 0; i < rowCount; ++i)
    output.push(Array(colCount));

  for (let j = 0; j < colCount; ++j) {
    const col = columns[j];

    checkColumnType(col);

    const array = col.getRawData();

    for (let i = 0; i < rowCount; ++i)
      output[i][j] = array[i];
  }

  return output;
}

/** Return centered data */
function centerDf(df: DG.DataFrame): DG.DataFrame {
  const rowCount = df.rowCount;

  for (const col of df.columns) {
    if (col.isNumerical) {
      const avg = col.stats.avg;

      if (Math.abs(avg) > TINY) {
        const raw = col.getRawData();

        for (let i = 0; i < rowCount; ++i)
          raw[i] -= avg;
      }
    }
  }
  return df;
}

/** Return scaled & centered data */
function centerScaleDf(df: DG.DataFrame): DG.DataFrame {
  const rowCount = df.rowCount;

  for (const col of df.columns) {
    if (col.isNumerical) {
      const stdev = col.stats.stdev;
      const avg = col.stats.avg;
      const raw = col.getRawData();

      if (stdev > 0) {
        for (let i = 0; i < rowCount; ++i)
          raw[i] = (raw[i] - avg) / stdev;
      } else {
        for (let i = 0; i < rowCount; ++i)
          raw[i] -= avg;
      }
    }
  }
  return df;
}

/** Return scaled data */
function scaleDf(df: DG.DataFrame): DG.DataFrame {
  const rowCount = df.rowCount;

  for (const col of df.columns) {
    if (col.isNumerical) {
      const stdev = col.stats.stdev;

      if (Math.abs(stdev - 1) > TINY && (stdev > 0)) {
        const raw = col.getRawData();

        for (let i = 0; i < rowCount; ++i)
          raw[i] /= stdev;
      }
    }
  }
  return df;
}

/** Return standardized dataframe */
export function centerScaleDataFrame(df: DG.DataFrame, toCenter: boolean, toScale: boolean): DG.DataFrame {
  if (toCenter) {
    if (toScale)
      return centerScaleDf(df);
    else
      return centerDf(df);
  }

  if (toScale)
    return scaleDf(df);

  return df;
}

/** Return table of columns with non-zero variance */
export function extractNonConstantColsDf(features: DG.ColumnList): DG.DataFrame {
  const cols: DG.Column[]= [];

  for (const col of features) {
    if ((col.stats.stdev > 0) && (col.stats.missingValueCount < 1))
      cols.push(col);
  }

  return DG.DataFrame.fromColumns(cols);
}

/** Describe viewers and return the Done button */
export function describeElements(roots: HTMLElement[], description: string[], position: string[]): HTMLButtonElement {
  if (roots.length !== description.length)
    throw new Error('Non-equal size of viewer roots and descriptions');

  let idx = 0;
  let closeIcn: HTMLElement;
  let msg: HTMLDivElement;
  let popup: HTMLDivElement;

  const nextBtn = ui.button('next', () => {
    popup.remove();
    ++idx;
    step();
  }, 'Go to the next viewer');

  const prevBtn = ui.button('prev', () => {
    idx -= 1;    
    popup.remove();
    step();
  }, 'Go to the previous viewer');

  const doneBtn = ui.button('done', () => popup.remove(), 'Go to the next step');

  const btnsDiv = ui.divH([prevBtn, nextBtn, doneBtn]);
 btnsDiv.style.marginLeft = 'auto';
 btnsDiv.style.marginRight = '0px';

  const step = () => {
    if (idx < roots.length) {
      msg = ui.divV([ui.markdown(description[idx]), btnsDiv]);
      popup = ui.hints.addHint(roots[idx], msg, position[idx] as ui.hints.POSITION);
      doneBtn.hidden = (idx < roots.length - 1);
      nextBtn.hidden = (idx === roots.length - 1);
      prevBtn.hidden = (idx < 1);
      
      closeIcn = popup.querySelector('i') as HTMLElement;
      closeIcn.onclick = () => doneBtn.click();
    }
  };

  step();

  return doneBtn;
}
