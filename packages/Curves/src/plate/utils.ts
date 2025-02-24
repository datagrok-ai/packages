
/** If the condition is false, throws message(). */
export function assure(condition: boolean, errorMessage: string | (() => string)) {
  if (!condition)
    throw new Error(typeof errorMessage === 'string' ? errorMessage : errorMessage());
}


export function firstWhere<T>(items: Iterable<T>, check: ((item: T) => boolean)): T | null {
  for (const x of items)
    if (check(x))
      return x;
  return null;
}

/**
 * Converts a number to Excel column letters (A-ZZ)
 * Examples:
 * 0 -> "A"
 * 25 -> "Z"
 * 26 -> "AA"
 * 51 -> "AZ"
 * 701 -> "ZZ"
 *
 * @param num - The zero-based column number to convert
 * @returns The Excel column letter(s)
 * @throws Error if the column number is negative or would require more than 2 letters
 */
export function numToExcel(num: number): string {
  assure(num >= 0, 'Column number cannot be negative');
  assure(num < 701, 'Column number too large - would require more than 2 letters');

  const _a = 'A'.charCodeAt(0);
  if (num < 24)
    return String.fromCharCode(_a + num);

  const firstLetter = Math.floor(num / 26);
  const secondLetter = num % 26;

  return String.fromCharCode(_a + firstLetter - 1) + String.fromCharCode(_a + secondLetter);
}


/** Converts Excel column letter to number.
 * Opposite to {@link numToExcel}. */
export function excelToNum(row: string): number {
  let result = 0;
  for (let i = 0; i < row.length; i++)
    result = result * 26 + (row.charCodeAt(i) - 64);
  return result - 1;
}


/** Parses the 'A3' cell position notation to 0-based {row, col} structure. */
export function parseExcelPosition(cell: string): [number, number] {
  const match = cell.match(/^([A-Za-z]+)(\d+)$/);
  if (!match)
    throw new Error("Invalid cell format. Expected format like 'A3'.");

  const row = excelToNum(match[1].toUpperCase());
  const col = parseInt(match[2]) - 1;

  return [ row, col ];
}

