import * as DG from 'datagrok-api/dg';
import {COL_NAMES, GENERATED_COL_NAMES, SEQUENCE_TYPES} from './constants';
import {differenceOfTwoArrays, download} from '../helpers';
import * as grok from 'datagrok-api/grok';
import {SYNTHESIZERS} from '../const';
import {SequenceToMolfileConverter} from '../sequence-to-structure-utils/sequence-to-molfile';
import {RegistrationSequenceParser} from './sequence-parser';
import {linkStrandsV3000} from '../sequence-to-structure-utils/mol-transformations';

export async function sdfSaveTable(table: DG.DataFrame, onError: (rowI: number, err: any) => void) {
  if (GENERATED_COL_NAMES.some((colName) => !table.columns.contains(colName))) {
    const absentColNames = differenceOfTwoArrays(GENERATED_COL_NAMES, table.columns.names()).join(`', '`);
    grok.shell.warning(`File saved without columns '${absentColNames}'`);
  }

  const sequenceCol = table.getCol(COL_NAMES.SEQUENCE);
  const typeCol = table.getCol(COL_NAMES.TYPE);

  let resultStr = '';
  const rowCount = table.rowCount;
  for (let i = 0; i < rowCount; i++) {
    try {
      let rowStr = '';
      const parser = new RegistrationSequenceParser();
      const format = SYNTHESIZERS.GCRS; //getFormat(sequenceCol.get(i))!;
      if (typeCol.get(i) === SEQUENCE_TYPES.SENSE_STRAND) {
        const molfile = (new SequenceToMolfileConverter(sequenceCol.get(i), false, format)).convert();
        rowStr += `${molfile}\n> <Sequence>\nSense Strand\n\n`;
      } else if (typeCol.get(i) === SEQUENCE_TYPES.ANTISENSE_STRAND) {
        const molfile = (new SequenceToMolfileConverter(sequenceCol.get(i), true, format).convert());
        rowStr += `${molfile}\n> <Sequence>\nAnti Sense\n\n`;
      } else if (typeCol.get(i) === SEQUENCE_TYPES.DUPLEX) {
        const obj = parser.getDuplexStrands(sequenceCol.get(i));
        const asMolfile = (new SequenceToMolfileConverter(obj.as, true, format)).convert();
        const as = `${asMolfile}\n> <Sequence>\nAnti Sense\n\n`;
        const ssMolfile = (new SequenceToMolfileConverter(obj.ss, false, format)).convert();
        const ss = `${ssMolfile}\n> <Sequence>\nSense Strand\n\n`;
        rowStr += `${linkStrandsV3000({senseStrands: [ss], antiStrands: [as]}, true)}\n\n`;
      } else if ([SEQUENCE_TYPES.TRIPLEX, SEQUENCE_TYPES.DIMER].includes(typeCol.get(i))) {
        const obj = parser.getDimerStrands(sequenceCol.get(i));
        const as1Molfile = (new SequenceToMolfileConverter(obj.as1, true, format)).convert();
        const as1 = `${as1Molfile}\n> <Sequence>\nAnti Sense\n\n`;

        const as2Molfile = (new SequenceToMolfileConverter(obj.as2, true, format)).convert();
        const as2 = `${as2Molfile}\n> <Sequence>\nAnti Sense\n\n`;

        const ssMolfile = (new SequenceToMolfileConverter(obj.ss, false, format)).convert();
        const ss = `${ssMolfile}\n> <Sequence>\nSense Strand\n\n`;

        rowStr += `${linkStrandsV3000({senseStrands: [ss], antiStrands: [as1, as2]}, true)}\n\n`;
      }

      for (const col of table.columns) {
        if (col.name !== COL_NAMES.SEQUENCE)
          rowStr += `> <${col.name}>\n${col.get(i)}\n\n`;
      }

      rowStr += '$$$$\n';

      resultStr += rowStr;
    } catch (err: any) {
      onError(i, err);
    }
  }

  download(`${table.name}.sdf`, encodeURIComponent(resultStr));
}
