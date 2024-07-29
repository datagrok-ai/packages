/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {expectTable as _expectTable} from '@datagrok-libraries/utils/src/test';

//name: getTable
//input: string name
//input: string path {optional: true}
//output: dataframe result
export async function getTable(name: string, path: string): Promise<DG.DataFrame> {
  const file = (await grok.dapi.files.list(path ? `system:appdata/${path}/` : 'System:DemoFiles/', true, name))[0];
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

//name: getCell [get table cell]
//input: dataframe table
//input: int rowIndex
//input: string columnName
//output: cell x
export function getCell(table: DG.DataFrame, rowIndex: number, columnName: string): DG.Cell {
  return table.cell(rowIndex, columnName);
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

//name: dummyPackageFunctionWithDefaultValue
//input: string a = "test"
//output: int c
export function dummyPackageFunctionWithDefaultValue(a: string) {
  const c = a.length;
  return c;
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
  return {'tableOut': table, 'count': table.rowCount};
}

//name: testStringAsync
//input: int a
//output: int b
export async function testIntAsync(a: number): Promise<number> {
  return new Promise((r) => r(a + 10));
}

//name: CustomStringInput
//input: object params
//output: object input
export function CustomStringInput(params: any) {
  const defaultInput = ui.input.string('Custom input', {value: ''});
  defaultInput.root.style.backgroundColor = 'aqua';
  defaultInput.input.style.backgroundColor = 'aqua';
  return defaultInput;
}
