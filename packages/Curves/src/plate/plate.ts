import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import wu from 'wu';
import {assure, excelToNum, firstWhere, numToExcel, parseExcelPosition} from "./utils";
import type ExcelJS from 'exceljs';
import {findPlatePositions, getPlateFromSheet} from "./excel-plates";
import { FitSeries } from '@datagrok-libraries/statistics/src/fit/new-fit-API';


/** Represents a well in the experimental plate */
export interface PlateWell {
  row: number;
  col: number;
  volume?: number;
  concentration?: number;
  [key: string]: any;
}


interface IPlateCsvImportOptions {
  rowColumn?: string;
  colColumn?: string;
  positionColumn?: string;
  volumeColumn?: string;
  concentrationColumn?: string;
  field?: string;   // used as a field name when a 12x8 table is passed; if not passed, defaults to 'value'
}


interface IPlateWellFilter {
  includeEmpty?: boolean;
  match?: {[key: string]: any};
  exclude?: {[key: string]: any};
}


interface ISeriesData {
  x: number[];
  y: number[];
}

// export class PlateLayer<TData> {
//   plate: Plate;
//   data: Float64Array ArrayLike<number> DG.Column<TData>;
//   role: 'concentration' | 'volume';
//
//   /** Array of non-empty values */
//   values(filter?: IPlateWellFilter): Array<any> {
//     const col = this.data.columns.byName(data.name);
//     assure(col != null, `Field does not exist: ${field}`);
//
//     const result = [];
//     for (let i = 0; i < this.rows * this.cols; i++)
//       if ((filter?.includeEmpty ?? false) || !col.isNone(i))
//         result.push(col.isNone(i) ? null : col.get(i));
//
//     return result;
//   }
// }

/** Represents experimental plate (typically 96-, 384-, or 1536-well assay plates) */
export class Plate {
  data: DG.DataFrame;
  //layers: PlateLayer[];
  rows: number = 8;
  cols: number = 12;

  constructor(rows: number, cols: number) {
    this.data = DG.DataFrame.create(rows * cols);
    this.rows = rows;
    this.cols = cols;
  }

  _idx(row: number, col: number): number {
    return row * this.cols + col;
  }

  //well(row: number, col: number): PlateWell { return new PlateWell(); }

  static fromTable(table: DG.DataFrame, field?: string): Plate {
    const rows = table.rowCount;
    // remove row letters
    function containsRowLetters(c: DG.Column): boolean {
      return c.type == DG.TYPE.STRING && wu(DG.range(rows)).every((i) => numToExcel(i) == c.get(i).toUpperCase());
    }

    const dataColumns = wu(table.columns).filter((c) => !containsRowLetters(c)).toArray();
    const cols = dataColumns.length;
    const plate = new Plate(rows, cols);

    const nonEmptyCols = dataColumns.filter((c) => c.stats.missingValueCount != rows);
    const toString = (nonEmptyCols.length > 0 && nonEmptyCols.findIndex((c) => c.type != nonEmptyCols[0].type) != -1);
    const type = toString
      ? DG.TYPE.STRING
      : firstWhere(dataColumns, c => c.stats.missingValueCount != rows)?.type ?? DG.TYPE.STRING;

    const dataColumn = plate.data.columns.addNew(table.name ?? field, type);

    for (let colIdx = 0; colIdx < dataColumns.length; colIdx ++)
      if (dataColumns[colIdx].stats.missingValueCount != rows)
        for (let i = 0; i < rows; i++)
          dataColumn.set(plate._idx(i, colIdx), type != DG.TYPE.STRING ? dataColumns[colIdx].get(i) : dataColumns[colIdx].getString(i), false);

    return plate;
  }

  static async fromCsvTableFile(csvPath: string, field: string, options?: DG.CsvImportOptions): Promise<Plate> {
    return this.fromTable(await grok.dapi.files.readCsv(csvPath, options), field);
  }

  static fromCsvTable(csv: string, field: string, options?: DG.CsvImportOptions): Plate {
    return this.fromTable(DG.DataFrame.fromCsv(csv, options), field);
  }

  static fromCsv(csv: string, options?: IPlateCsvImportOptions): Plate {
    const df = DG.DataFrame.fromCsv(csv);

    // TODO: tall format?
    // if (df.columns.contains('pos'))
    //   return new Plate(0, 0);

    return this.fromTable(df, options?.field ?? 'value');
  }

  /** Merges the attributes from {@link plates} into one plate. */
  static fromPlates(plates: Plate[]) {
    assure(plates.length > 0, 'Array is empty.');
    assure(plates.every(p => p.rows == plates[0].rows && p.cols == plates[0].cols), 'Plate dimensions differ.');

    return plates.reduce((p1, p2) => p1 ? p1.merge(p2) : p2.clone());
  }

  /** Constructs the plates from the specified Excel file.
   * Plate positions are detected automatically. */
  static async fromExcel(excelPath: string): Promise<Plate> {
    await DG.Utils.loadJsCss(['/js/common/exceljs.min.js']);

    //@ts-ignore
    const loadedExcelJS = window.ExcelJS as ExcelJS;
    const workbook = new loadedExcelJS.Workbook() as ExcelJS.Workbook;
    const content = await grok.dapi.files.readAsBytes(excelPath);
    const wb= await workbook.xlsx.load(content);

    const platePositions = findPlatePositions(wb);
    if (platePositions.length == 0) throw 'Plates not found in "${excelPath}"';
    const p0 = platePositions[0];
    if (!platePositions.every((pc) => pc.rows == p0.rows || pc.cols == p0.cols))
      throw `Plate sizes differ in "${excelPath}"`;

    return Plate.fromPlates(platePositions.map(p => getPlateFromSheet(p)));
  }

  /** Generates [count] increasing integer numbers, starting with 0. */
  get wells(): IterableIterator<PlateWell> {
    const self = this; // Capture this context
    return (function* () {
      for (let row = 0; row < self.rows; row++) {
        for (let col = 0; col < self.cols; col++) {
          const well: PlateWell = {
            row: row,
            col: col,
          };
          for (const field of self.data.columns) {
            if (!field.isNone(self._idx(row, col))) {
              well[field.name] = field.get(self._idx(row, col));
            }
          }
          yield well;
        }
      }
    })();
  }

  /** Returns the specified field value at the specified positions (0-based).
   * The following examples all return volume for the C4 well:
   * - plate.get('volume', 2, 3)
   * - plate.get('volume', 'C4')
   * */
  get(field: string, rowIdxOrPos: number | string, colIdx?: number): any {
    assure(this.data.columns.byName(field) != null, `Field does not exist: ${field}`);
    if (typeof rowIdxOrPos === 'number' && !colIdx)
      throw 'Column not defined';

    const [row, col] = (typeof rowIdxOrPos === 'string') ? parseExcelPosition(rowIdxOrPos) : [rowIdxOrPos, colIdx!];
    return this.data.columns.byName(field).get(this._idx(row, col));
  }

  /** Changes all numerical values to the results of the specified normalization function */
  normalize(field: string, f: (value: number) => number) {
    const col = this.data.getCol(field);
    for (let i = 0; i < this.rows * this.cols; i++)
      if (!col.isNone(i))
        col.set(i, f(col.get(i)), false);
  }

  matches(i: number, filter: IPlateWellFilter): boolean {
    const cols = this.data.columns;
    // we allow both any and array of any things in matches object, so we need to convert it to array to have one api
    const arMatches = filter.match ? Object.entries(filter.match).reduce((acc, [key, value]) => {acc[key] = Array.isArray(value) ? value : [value]; return acc;}, {} as Record<string, any[]>) : null;
    const arExclude = filter.exclude ? Object.entries(filter.exclude).reduce((acc, [key, value]) => {acc[key] = Array.isArray(value) ? value : [value]; return acc;}, {} as Record<string, any[]>) : null;
    return !filter || (!arMatches && !arExclude) ||
        (
        Object.keys(arMatches ?? {}).filter((m) => cols.contains(m)).every((key) => arMatches![key].some((m) => this.data.columns.byName(key).get(i) === m)) &&
        Object.keys(arExclude ?? {}).filter((m) => cols.contains(m)).every((key) => arExclude![key].every((e) => this.data.columns.byName(key).get(i) !== e)));
  }

  count(filter?: IPlateWellFilter): number {
    if (!filter)
      return this.rows * this.cols;
    let c = 0;
    for (let i = 0; i < this.rows * this.cols; i++)
      if (this.matches(i, filter))
        c++;
    return c;
  }

  /** Array of non-empty values */
  values(fields: string[], filter?: IPlateWellFilter): Array<Record<string, any>> {
    const cols = fields.map((f) => this.data.columns.byName(f));
    assure(cols.every((c) => c != null), `Field does not exist: ${fields.find((_, i) => cols[i] == null)}`);
    const colsObj: Record<string, DG.Column> = {};
    for (let i = 0; i < fields.length; i++)
      colsObj[fields[i]] = cols[i];
    const result: Record<string, any>[]  = [];
    for (let i = 0; i < this.rows * this.cols; i++)
      if (((filter?.includeEmpty ?? false) || cols.every((col) => !col.isNone(i))) && (!filter || this.matches(i, filter)))
        result.push(fields.reduce((acc, f) => { acc[f] = colsObj[f].isNone(i) ? null : colsObj[f].get(i); return acc; }, {} as Record<string, any>));
    return result;
  }

  fieldValues(field: string, filter?: IPlateWellFilter): Array<any> {
    return this.values([field], filter).map((v) => v[field]);

  }

  doseResponseSeries(options?: IPlateWellFilter & { concentration?: string; value?: string, groupBy?: string}): Record<string, FitSeries> {
    const valueOptions = {includeEmpty: options?.includeEmpty ?? false, exclude: options?.exclude ?? {'role': ['High Control', 'Low Control']}}
    const concKey = options?.concentration ?? 'concentration';
    const valueKey = options?.value ?? 'value';
    const values = this.values([concKey, valueKey, ...(options?.groupBy ? [options.groupBy] : [])], valueOptions);

    const series: Record<string, ISeriesData> = {};
    for (const v of values) {
      const group = options?.groupBy ? v[options.groupBy] : '0';
      if (!series[group])
        series[group] = {x: [], y: []};
      series[group].x.push(v[concKey]);
      series[group].y.push(v[valueKey]);
    }

    return Object.fromEntries(Object.entries(series).map(([k, v]) => [k, new FitSeries(v.x.map((_, i) => ({x: v.x[i], y: v.y[i]})))]));
  }

  /** Adds data from the other plate to this plate. Typically, you would apply plate layout */
  merge(plate: Plate) {
    for (const col of plate.data.columns) {
      this.data.columns.add(col.clone());
    }
    return this;
  }

  /** Deep cloning */
  clone(): Plate {
    const cloned = new Plate(this.rows, this.cols);
    cloned.data = this.data.clone();
    return cloned;
  }

  print() {
    for (const fieldCol of this.data.columns) {
      console.log();
      console.log(fieldCol.name);
      console.log(wu(DG.range(this.cols + 1)).map((col) => col == 0 ? '' : `${col}`).toArray().join('\t'));
      for (let row = 0; row < this.rows; row++) {
        console.log(numToExcel(row) + '\t' +
          wu(DG.range(this.cols)).map((col) => fieldCol.getString(this._idx(row, col))).toArray().join(',\t'));
      }
    }
  }
}