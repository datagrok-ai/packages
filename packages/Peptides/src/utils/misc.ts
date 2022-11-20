import * as DG from 'datagrok-api/dg';
import * as C from './constants';
import * as type from './types';

import {AminoacidsPalettes} from '@datagrok-libraries/bio/src/aminoacids';
import {NucleotidesPalettes} from '@datagrok-libraries/bio/src/nucleotides';
import {UnknownSeqPalettes} from '@datagrok-libraries/bio/src/unknown';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';

export function getTypedArrayConstructor(
  maxNum: number): Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor {
  return maxNum < 256 ? Uint8Array :
    maxNum < 65536 ? Uint16Array :
      Uint32Array;
}

export function getSeparator(col: DG.Column<string>): string {
  return col.getTag(C.TAGS.SEPARATOR) ?? '';
}

export function scaleActivity(activityCol: DG.Column<number>, scaling: string = 'none'): DG.Column<number> {
  let formula = (x: number): number => x;
  let newColName = 'activity';
  switch (scaling) {
  case 'none':
    break;
  case 'lg':
    formula = (x: number): number => Math.log10(x);
    newColName = `Log10(${newColName})`;
    break;
  case '-lg':
    formula = (x: number): number => -Math.log10(x);
    newColName = `-Log10(${newColName})`;
    break;
  default:
    throw new Error(`ScalingError: method \`${scaling}\` is not available.`);
  }
  const scaledCol = DG.Column.float(C.COLUMNS_NAMES.ACTIVITY_SCALED, activityCol.length).init((i) => {
    const val = activityCol.get(i);
    return val ? formula(val) : val;
  });
  scaledCol.semType = C.SEM_TYPES.ACTIVITY_SCALED;
  scaledCol.setTag('gridName', newColName);

  return scaledCol;
}

export function calculateSelected(df: DG.DataFrame): type.MonomerSelectionStats {
  const monomerColumns: DG.Column<string>[] = df.columns.bySemTypeAll(C.SEM_TYPES.MONOMER);
  const selectedObj: type.MonomerSelectionStats = {};
  for (const idx of df.selection.getSelectedIndexes()) {
    for (const col of monomerColumns) {
      const monomer = col.get(idx);
      if (!monomer)
        continue;
      
      selectedObj[col.name] ??= {};
      selectedObj[col.name][monomer] ??= 0;
      selectedObj[col.name][monomer] += 1;
    }
  }

  return selectedObj;
}

export function isGridCellInvalid(gc: DG.GridCell | null): boolean {
  return !gc || !gc.cell.value || !gc.tableColumn || gc.tableRowIndex == null || gc.tableRowIndex == -1 ||
    gc.cell.value == DG.INT_NULL || gc.cell.value == DG.FLOAT_NULL;
}
