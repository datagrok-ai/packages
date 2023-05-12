/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {TestViewerForProperties} from './viewers/test-viewer-for-properties';
import {TestCustomFilter} from './viewers/test-custom-filter';
import {expectTable as _expectTable} from '@datagrok-libraries/utils/src/test';


// -- Viewers --

//name: TestViewerForProperties
//description: Viewer to test properties and others
//tags: viewer, panel
//output: viewer result
export function testViewerForProperties() {
  return new TestViewerForProperties();
}

// -- Filters --

//name: testCustomFilter
//description: Test custom filter
//tags: filter
//output: filter result
export function testCustomFilter(): DG.Filter {
  const flt: TestCustomFilter = new TestCustomFilter();
  return flt;
}

//name: getTable
//input: string name
//input: string path {optional: true}
//output: dataframe result
export async function getTable(name: string, path: string): Promise<DG.DataFrame> {
  const file = (await grok.dapi.files.list(path ? `system:appdata/${path}/` : 'Demo:Files/', true, name))[0];
  const str = await file.readAsString();
  const result = DG.DataFrame.fromCsv(str);
  return result;
}

//name: getColumn
//input: dataframe table
//input: string columnName
//output: column col
export function getColumn(table: DG.DataFrame, columnName: string): DG.Column {
  const col = table.getCol(columnName);
  return col;
}

//name: getDT [get demo table]
//input: int rows {optional: true}
//input: string name {optional: true}
//output: dataframe df
export function getDT(rows: number = 20, name: any = 'demog'): DG.DataFrame {
  const df = grok.data.demo.getDemoTable(name, rows);
  return df;
}

//name: expectTable
//shortName: expectTable
//input: dataframe actual
//input: dataframe expected
//output: bool result
export function expectTable(actual: DG.DataFrame, expected: DG.DataFrame): boolean {
  _expectTable(actual, expected);
  return true;
}

//name: dummyPackageFunction
//input: int a
//input: int b
//output: int c
export function dummyPackageFunction(a: number, b: number) {
  const c = a + b;
  return c;
}

//name: dummyDataFrameFunction
//input: dataframe table [Data table]
//output: int count 
//output: dataframe tableOut
export function dummyDataFrameFunction(table: DG.DataFrame) {
  const count = table.rowCount;
  const tableOut = table;
  return {tableOut, count};
}
