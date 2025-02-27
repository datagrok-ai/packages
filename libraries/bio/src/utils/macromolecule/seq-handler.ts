import * as DG from 'datagrok-api/dg';

import {MmDistanceFunctionsNames} from '@datagrok-libraries/ml/src/macromolecule-distance-functions';

import {ISeqSplitted, SeqColStats, SplitterFunc} from './types';
import {ALPHABET, NOTATION} from './consts';
import {HelmType} from '../../helm/types';
import {CellRendererBackBase} from '../cell-renderer-back-base';
import {splitterAsHelm, StringListSeqSplitted} from './utils';

export const SeqTemps = new class {
  /** Column's temp slot name for a SeqHandler object */
  seqHandler = `seq-handler`;
  notationProvider = `seq-handler.notation-provider`;
}();
export type ConvertFunc = (src: string) => string;
export type JoinerFunc = (src: ISeqSplitted) => string;

export class SeqValueBase extends DG.SemanticValue<string> {
  override get value(): string { return this.seqHandler.column.get(this.rowIdx)!; }

  override set value(v: string) { this.seqHandler.column.set(this.rowIdx, v); }

  get helm(): string { return this.seqHandler.getHelm(this.rowIdx); }

  isDna(): boolean { return this.seqHandler.alphabet === ALPHABET.DNA; }

  isRna(): boolean { return this.seqHandler.alphabet === ALPHABET.RNA; }

  isNaturalPeptide(): boolean { return this.seqHandler.alphabet === ALPHABET.PT; }

  isHelm(): boolean { return this.seqHandler.isHelm(); }

  constructor(
    private rowIdx: number,
    private seqHandler: ISeqHandler,
  ) {
    if (seqHandler.column.dataFrame == null)
      throw new Error('Attribute .dataFrame is required for SeqValueBase from cell');
    const tableCell = seqHandler.column.dataFrame.cell(rowIdx, seqHandler.column.name);
    const v = DG.SemanticValue.fromTableCell(tableCell);
    // @ts-ignore
    super(v.dart);
  }

  getSplitted(): ISeqSplitted {
    return this.seqHandler.getSplitted(this.rowIdx);
  }

  getSplittedWithSugarsAndPhosphates(): ISeqSplitted {
    if (!this.isDna() && !this.isRna())
      return this.getSplitted();
    const originalSplit = splitterAsHelm(this.helm);
    const fullArray: string[] = [];
    // heuristic for detecting dna/rna
    const helmNucleotideFullRe = /\(|\)/;

    for (let i = 0; i < originalSplit.length; i++) {
      const m = originalSplit.getOriginal(i);
      const splitM = m.split(helmNucleotideFullRe).filter((el) => !!el);
      if (splitM.length === 3) {
        fullArray.push(splitM[0]);
        fullArray.push(splitM[1]);
        fullArray.push(splitM[2]);
      } else
        fullArray.push(m);
    }

    return new StringListSeqSplitted(fullArray, this.seqHandler.defaultGapOriginal);
  }
}

export interface ISeqHandler {
  get column(): DG.Column<string>;

  get alphabet(): string;
  get notation(): NOTATION;
  get separator(): string | undefined;

  get aligned(): string;
  get units(): string;
  get defaultBiotype(): HelmType;
  get maxLength(): number;
  get length(): number;
  get defaultGapOriginal(): string;
  get stats(): SeqColStats;
  get splitter(): SplitterFunc;
  get joiner(): JoinerFunc;

  get posList(): string[];

  isFasta(): boolean;
  isMsa(): boolean;
  isHelm(): boolean;
  isSeparator(): boolean;

  getSplitted(rowIdx: number, limit?: number): ISeqSplitted;
  getValue(rowIdx: number, options?: any): SeqValueBase;
  getHelm(rowIdx: number): string;

  getAlphabetSize(): number;
  getAlphabetIsMultichar(): boolean;
  getNewColumnFromList(name: string, seqList: string[]): DG.Column<string>;
  convert(tgtNotation: NOTATION, tgtSeparator?: string): DG.Column<string>;
  convertHelmToFastaSeparator(srcSeq: string, tgtNotation: string,
    tgtSeparator?: string, tgtGapOriginal?: string): string;
  getRegion(startIdx: number | null, endIdx: number | null, name: string): DG.Column<string>;
  getJoiner(opts?: { notation: NOTATION, separator?: string }): JoinerFunc;

  getDistanceFunctionName(): MmDistanceFunctionsNames;
  getConverter(tgtUnits: NOTATION, tgtSeparator?: string): ConvertFunc;
  getRendererBack(gridCol: DG.GridColumn | null, tableCol: DG.Column<string>): CellRendererBackBase<string>;
}
