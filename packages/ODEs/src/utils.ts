// Utitlities

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

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
