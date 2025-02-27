import * as DG from 'datagrok-api/dg';
import * as ExcelJS from 'exceljs';
import wu from 'wu';
import {Plate} from "./plate";
import {DataFrame} from "datagrok-api/dg";

interface ExcelPlatePosition {
  sheet: ExcelJS.Worksheet;
  startRow: number;
  startCol: number;
  rows: number;
  cols: number;
}


/** Finds plate positions in the Excel workbook by iterating over sheets
 * and finding row/column label patterns such as (1-24, A-P). */
export function findPlatePositions(workbook: ExcelJS.Workbook): ExcelPlatePosition[] {
  const results: ExcelPlatePosition[] = [];

  workbook.eachSheet((worksheet) => {
    // Create a grid representation of the worksheet
    const grid: any[][] = [];
    worksheet.eachRow((row, rowIndex) => {
      grid[rowIndex] = [];
      row.eachCell((cell, colIndex) => {
        grid[rowIndex][colIndex] = cell.value;
      });
    });

    // Find numeric column headers (1, 2, 3, ...)
    let headerRow = -1, startCol = -1, numColumns = 0;
    for (let i = 1; i < grid.length; i++) {
      const row = grid[i] || [];
      let numSequence = 0, seqStart = -1;

      for (let j = 1; j < row.length; j++) {
        if (typeof row[j] === 'number' && Number.isInteger(row[j]) && row[j] === numSequence + 1) {
          if (numSequence === 0) seqStart = j;
          numSequence++;
        }
        else if (numSequence > 0)
          break;
      }

      if (numSequence >= 12) { // Minimum 12 columns
        headerRow = i;
        startCol = seqStart;
        numColumns = numSequence;
        break;
      }
    }

    // Find alphabetic row headers (A, B, C, ...)
    let headerCol = -1, startRow = -1, numRows = 0;
    if (headerRow !== -1) {
      for (let j = 1; j < startCol; j++) {
        let letterSequence = 0, seqStart = -1;

        for (let i = headerRow + 1; i < grid.length; i++) {
          if (!grid[i]) continue;
          const val = grid[i][j];

          if (typeof val === 'string' && /^[A-Z]$/.test(val)) {
            const expected = String.fromCharCode('A'.charCodeAt(0) + letterSequence);
            if (val === expected) {
              if (letterSequence === 0) seqStart = i;
              letterSequence++;
            }
            else break;
          }
          else if (letterSequence > 0)
            break;
        }

        if (letterSequence >= 8) { // Minimum 8 rows
          headerCol = j;
          startRow = seqStart;
          numRows = letterSequence;
          break;
        }
      }
    }

    if (headerRow !== -1 && headerCol !== -1) {
      results.push({
        sheet: worksheet,
        startRow: headerRow,
        startCol: headerCol,
        rows: numRows,
        cols: numColumns
      });
    }
  });

  return results;
}


/** Constructs a plate from the specified position in the Excel sheet. */
export function getPlateFromSheet(p: ExcelPlatePosition): Plate {
  const df = DataFrame.create(p.rows);
  for (let col = p.startCol + 1; col <= p.startCol + p.cols; col++) {
    const strings = wu(DG.range(p.rows)).map(i => p.sheet.getCell(p.startRow + i + 1, col).toString()).toArray();
    df.columns.add(DG.Column.fromStrings(`${col - p.startCol + 1}`, strings));
  }
  return Plate.fromTable(df, p.sheet.name);
}