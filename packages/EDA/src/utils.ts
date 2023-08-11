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

// Error messages
const COMP_POSITVE_MES = 'components must be positive.';
const COMP_EXCESS = 'components must not be greater than feautures count.';
const INCORERRECT_MIN_MAX_MES = 'min must be less than max.';
const INCORERRECT_FEATURES_MES = 'features must be positive.';
const INCORERRECT_SAMPLES_MES = 'samples must be positive.';
const INCORERRECT_PERCENTAGE_MES = 'violators percentage must be from the range from 0 to 100.';
const DATAFRAME_IS_TOO_BIG_MES = 'dataframe is too big.';
const UNSUPPORTED_COLUMN_TYPE_MES = 'unsupported column type: ';
const INCORRECT_MIN_DIST_MES = 'min distance must be positive.';
const INCORRECT_SPREAD_MES = 'spread must be positive.';
const INCORRECT_EPOCH_MES = 'number of epoch must be at least 1.';
const INCORRECT_NEIBORS_MES = 'number of neibors must be at least 2 and not greater than samples count.';
const INCORRECT_ITERATIONS_MES = 'number of iterations must be at least 1.';
const INCORRECT_LEARNING_RATE_MES = 'learning rate must be positive.';
const INCORRECT_PERPLEXITY_MES = 'perplexity must be at least 2 and not greater than samples count.';

// Check column type
export function checkColumnType(col: DG.Column): void {
  if ((col.type != DG.COLUMN_TYPE.FLOAT) && (col.type != DG.COLUMN_TYPE.INT))
    throw new Error(UNSUPPORTED_COLUMN_TYPE_MES + col.type);
}

// Check dimension reducer inputs
export function checkDimensionReducerInputs(features: DG.ColumnList, components: number): void {
  if (components < COMP_MIN)
    throw new Error(COMP_POSITVE_MES);

  if (components > features.length)
    throw new Error(COMP_EXCESS);

  for (const col of features)
    checkColumnType(col);
}

// Check UMAP inputs
export function checkUMAPinputs(features: DG.ColumnList, components: number, epochs: number,
  neighbors: number, minDist: number, spread: number): void 
{
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
  learningRate: number, perplexity: number, iterations: number): void 
{
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
  min: number, max: number, violatorsPercentage: number): void 
{
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
