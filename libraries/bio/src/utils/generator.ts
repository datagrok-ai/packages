import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {ALPHABET, getAlphabet, NOTATION, TAGS} from './macromolecule';
import {GapOriginals, SeqHandler} from './seq-handler';
import {StringListSeqSplitted} from './macromolecule/utils';
import {IMonomerLib} from '../types/index';
import {PolymerTypes} from '../helm/consts';

export function generateManySequences(): DG.Column[] {
  const columns: DG.Column[] = [];
  columns.push(DG.Column.fromList('string', 'MSA',
    new Array(10 ** 6).fill(
      'meI/hHis/Aca/N/T/dE/Thr_PO3H2/Aca/D-Tyr_Et/Tyr_ab-dehydroMe/dV/E/N/D-Orn/D-aThr//Phe_4Me')),
  );
  columns.push(DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'Activity', new Array(10 ** 6).fill(5.30751)));
  return columns;
}

/** Generates the column 'MSA' with sequences length of order 10^6 and the 'Activity' float column. */
export function generateLongSequence(length: number = 10 ** 5): DG.Column[] {
  const longSequence =
    `meI/hHis/Aca/N//dE/Thr_PO3H2/Aca/D-Tyr_Et/Tyr_ab-dehydroMe`.repeat(Math.ceil(length / 10)).slice(0, -1);
  const msaCol = DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'MSA', new Array(10 ** 2).fill(longSequence));
  msaCol.semType = DG.SEMTYPE.MACROMOLECULE;
  msaCol.setTag(DG.TAGS.UNITS, NOTATION.SEPARATOR);
  msaCol.setTag(TAGS.separator, '/');
  msaCol.setTag(TAGS.alphabet, ALPHABET.UN);
  msaCol.setTag(TAGS.alphabetIsMultichar, 'true');

  const columns: DG.Column[] = [];
  columns.push(msaCol);
  columns.push(DG.Column.fromList(DG.COLUMN_TYPE.FLOAT, 'Activity', new Array(10 ** 2).fill(7.30751)));
  return columns;
}

export function generateLongSequence2(
  notation: NOTATION = NOTATION.SEPARATOR, alphabet: ALPHABET = ALPHABET.PT,
  separator: string | undefined = (notation === NOTATION.SEPARATOR ? '-' : undefined),
  monomerLib: IMonomerLib | undefined = undefined,
  colName: string = 'seq', rowCount: number = 100, seqLength: number = 10 ** 6
): DG.Column {
  const alphabetSet: string[] = alphabet === ALPHABET.UN ?
    monomerLib?.getMonomerSymbolsByType(PolymerTypes.PEPTIDE) ?? [] : Array.from(getAlphabet(alphabet));
  const alphabetSize = alphabetSet.length;

  const col = DG.Column.fromType(DG.COLUMN_TYPE.STRING, colName, rowCount);
  col.semType = DG.SEMTYPE.MACROMOLECULE;
  col.setTag(DG.TAGS.UNITS, notation);
  col.setTag(TAGS.alphabet, alphabet);
  if (notation == NOTATION.SEPARATOR) col.setTag(TAGS.separator, separator!);

  const sh = SeqHandler.forColumn(col);
  for (let rowI = 0; rowI < rowCount; rowI++) {
    const seqMList: string[] = wu.count(0).take(seqLength)
      .map((i) => { return alphabetSet[Math.floor(Math.random() * alphabetSize)]; })
      .toArray();
    const seq = sh.joiner(new StringListSeqSplitted(seqMList, GapOriginals[notation]));
    col.set(rowI, seq);
  }

  return col;
}
