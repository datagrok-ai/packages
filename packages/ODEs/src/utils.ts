// Utitlities

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {MISC, PATH, ERROR_MSG, INPUTS_DF, LOOKUP_DF_FAIL} from './ui-constants';
import {CONTROL_EXPR} from './constants';

const ERR_POSTFIX = `${LOOKUP_DF_FAIL.COMMAND} in ${CONTROL_EXPR.INPUTS}'-line`;

/** Return max absolute deviation between the corresponding float values of 2 dataframes */
export function error(df1: DG.DataFrame, df2: DG.DataFrame): number {
  let mad = 0;

  const cols1 = df1.columns.toList();
  const cols2 = df2.columns.toList();

  const rowCount = df1.rowCount;

  if (rowCount !== df2.rowCount)
    throw new Error('Dataframes have non-equal rows counts');

  const colCount = cols1.length;

  if (colCount !== cols2.length)
    throw new Error('Dataframes have non-equal columns counts');

  for (let i = 1; i < colCount; ++i) { // we skip the argument column
    const c1 = cols1[i];
    const c2 = cols2[i];

    if ((c1.type !== DG.COLUMN_TYPE.FLOAT) || (c2.type !== DG.COLUMN_TYPE.FLOAT))
      continue;

    const a1 = c1.getRawData();
    const a2 = c2.getRawData();

    for (let j = 0; j < rowCount; ++j)
      mad = Math.max(mad, Math.abs(a1[j] - a2[j]));
  }

  return mad;
} // error

/** Return unused IVP-file name */
export function unusedFileName(name: string, files: string[]): string {
  if (!files.includes(`${name}.${MISC.IVP_EXT}`))
    return name;

  let num = 1;

  while (files.includes(`${name}(${num}).${MISC.IVP_EXT}`))
    ++num;

  return `${name}(${num})`;
}

/** Return dataframe with the specified number of last rows */
export function getTableFromLastRows(df: DG.DataFrame, maxRows: number): DG.DataFrame {
  if (df.rowCount <= maxRows)
    return df;

  const cols: DG.Column[] = [];

  for (const col of df.columns)
    cols.push(DG.Column.fromList(col.type, col.name, col.toList().slice(-maxRows)));

  return DG.DataFrame.fromColumns(cols);
}

/** Load dataframe using the command */
async function loadTable(command: string): Promise<DG.DataFrame | null> {
  const funcCall = grok.functions.parse(command);

  if (!(funcCall instanceof DG.FuncCall)) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}, ${LOOKUP_DF_FAIL.FUNCTION}, ${ERR_POSTFIX}`);
    return null;
  }

  const calledFuncCall = await funcCall.call();
  const output = calledFuncCall.getOutputParamValue();

  if (!(output instanceof DG.DataFrame)) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}, ${LOOKUP_DF_FAIL.NO_DF}, ${ERR_POSTFIX}`);
    return null;
  }

  return output;
}

/** Check correctness of lookup table */
function isLookupTableCorrect(table: DG.DataFrame | null): boolean {
  if (table === null)
    return false;

  const cols = table.columns;

  // check rows count
  if (table.rowCount < INPUTS_DF.MIN_ROWS_COUNT) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}${LOOKUP_DF_FAIL.INCORRECT}${LOOKUP_DF_FAIL.ROWS}`);
    return false;
  }

  // check nulls & numerical cols
  let numColsCount = 0;

  for (const col of cols) {
    if (col.stats.missingValueCount > 0) {
      grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}${LOOKUP_DF_FAIL.INCORRECT}${LOOKUP_DF_FAIL.NULLS}`);
      return false;
    }

    if (col.isNumerical)
      ++numColsCount;
  }

  if (numColsCount === 0) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}${LOOKUP_DF_FAIL.INCORRECT}${LOOKUP_DF_FAIL.NUMS}`);
    return false;
  }

  // check column with names of inputs
  if (cols.byIndex(INPUTS_DF.INP_NAMES_IDX).type !== DG.COLUMN_TYPE.STRING) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD}${LOOKUP_DF_FAIL.INCORRECT}${LOOKUP_DF_FAIL.CHOICES}`);
    return false;
  }

  return true;
} // isLookupTableCorrect

/** Return table with inputs */
export async function getInputsTable(command: string): Promise<DG.DataFrame | null> {
  try {
    const table = await loadTable(command);

    if (isLookupTableCorrect(table))
      return table;
  } catch (err) {
    grok.shell.warning(`${LOOKUP_DF_FAIL.LOAD} ${(err instanceof Error) ? err.message : LOOKUP_DF_FAIL.PLATFORM}`);
  }

  return null;
}
