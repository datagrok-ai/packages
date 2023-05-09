import BitArray from "@datagrok-libraries/utils/src/bit-array";
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

export function malformedDataWarning(fingerprintCol: (BitArray | null)[], column: DG.Column): number[] {
  const malformedData: number[] = [];
  for (let i = 0; i < fingerprintCol.length; i++) {
    if (!fingerprintCol[i] && !column.isNone(i))
      malformedData.push(i);
  }
  if (malformedData.length) {
    const malformedIdxsForError = malformedData.length < 10 ? malformedData.map((i) => i + 1).join(',') :
      `${malformedData.slice(0, 9).map((i) => i + 1)}...`
    const message = `${malformedData.length} molecules with indexes ${malformedIdxsForError} are possibly malformed and are not included in analysis`;
    const selectRowsButton = ui.button('Select', () => {
      for (const i of malformedData)
        column.dataFrame.selection.set(i!, true);
    })
    grok.shell.warning(ui.div([ui.divText(message), selectRowsButton]));
  }
  return malformedData as number[];
}

export function setEmptyBitArraysForMalformed(fingerprintCol: (BitArray | null)[]): void {
  for (let i = 0; i < fingerprintCol.length; i++) {
    if (!fingerprintCol[i])
      fingerprintCol[i] = BitArray.fromBytes(new Uint8Array());
  }
}
