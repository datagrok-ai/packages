/* eslint-disable max-len */
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {Vector} from '@datagrok-libraries/utils/src/type-declarations';
import {vectorDotProduct, vectorLength} from '@datagrok-libraries/utils/src/vector-operations';

import {
  CandidateSimType,
  CandidateType, ISeqSplitted,
  MonomerFreqs,
  SeqColStats, SeqSplittedBase,
  SplitterFunc
} from './types';
import {ALPHABET, Alphabets, candidateAlphabets, GAP_SYMBOL, GapOriginals, monomerRe, NOTATION} from './consts';
import {SeqPalette} from '../../seq-palettes';
import {AminoacidsPalettes} from '../../aminoacids';
import {NucleotidesPalettes} from '../../nucleotides';
import {UnknownSeqPalettes} from '../../unknown';
import {ISeqHelper} from '../seq-helper';

import {ISeqHandler} from './seq-handler';
import {cleanupHelmSymbol} from '../../helm/utils';

export class StringListSeqSplitted implements ISeqSplitted {
  get length(): number { return this.mList.length; }

  isGap(posIdx: number): boolean {
    return this.getOriginal(posIdx) === this.gapOriginalMonomer;
  }

  /** @param {number} posIdx monomer position 0-based index */
  getCanonical(posIdx: number): string {
    if (this.length <= posIdx)
      throw new Error('Index out of bounds');
    const om = this.mList[posIdx];
    return om !== this.gapOriginalMonomer ? om : GAP_SYMBOL;
  }

  getOriginal(posIdx: number): string {
    if (this.length <= posIdx)
      throw new Error('Index out of bounds');
    return this.mList[posIdx];
  }

  constructor(
    private readonly mList: SeqSplittedBase,
    private readonly gapOriginalMonomer: string
  ) {}
}

export class FastaSimpleSeqSplitted implements ISeqSplitted {
  get length(): number { return this.seqS.length; }

  isGap(posIdx: number): boolean {
    return this.getOriginal(posIdx) === GapOriginals[NOTATION.FASTA];
  }

  getCanonical(posIdx: number): string {
    if (this.length <= posIdx)
      throw new Error('Index out of bounds');
    if (this.isGap(posIdx))
      return GAP_SYMBOL;
    return this.seqS[posIdx];
  }

  getOriginal(posIdx: number): string {
    if (this.length <= posIdx)
      throw new Error('Index out of bounds');
    return this.seqS[posIdx];
  }

  constructor(
    private readonly seqS: string
  ) {}
}

/** Stats of sequences with specified splitter func, returns { freq, sameLength }.
 * @param {DG.Column} seqCol
 * @param {number} minLength
 * @param {SplitterFunc} splitter
 * @return { SeqColStats }, sameLength: boolean } stats of column sequences
 */
export function getStatsForCol(seqCol: DG.Column<string>, minLength: number, splitter: SplitterFunc): SeqColStats {
  const cats = seqCol.categories;
  const splitted: Iterable<ISeqSplitted> = wu.enumerate(seqCol.getRawData())
    .map(([catI, rowIdx]) => splitter(cats[catI]));
  return getStats(splitted, minLength);
}

function getStats(splitted: Iterable<ISeqSplitted>, minLength: number): SeqColStats {
  const freq: { [m: string]: number } = {};
  let sameLength = true;
  let firstLength = null;

  for (const seqSS of splitted) {
    if (firstLength == null)
      firstLength = seqSS.length;
    else if (seqSS.length !== firstLength)
      sameLength = false;

    if (seqSS.length >= minLength) {
      for (let posIdx = 0; posIdx < seqSS.length; ++posIdx) {
        const cm = seqSS.getCanonical(posIdx);
        if (!(cm in freq))
          freq[cm] = 0;
        freq[cm] += 1;
      }
    }
  }
  return {freq: freq, sameLength: sameLength};
}

/** Split sequence for single character monomers, square brackets multichar monomer names or gap symbol.
 * @param seq object with sequence
 * @param getMonomer Source of the {@link seq} string
 * @return {string[]} array of monomers
 */
export const splitterAsFasta: SplitterFunc = (seq: string): ISeqSplitted => {
  const mmList = wu<RegExpMatchArray>(seq.toString().matchAll(monomerRe))
    .map((ma: RegExpMatchArray) => {
      return ma[2] ?? ma[1]; // preserve '-' as gap symbol for compatibility with simpleAsFastaSimple
    }).toArray();

  return new StringListSeqSplitted(mmList, GapOriginals[NOTATION.FASTA]);


  // return new Proxy(splittedList as object, {
  //   get(target: string[], p: string | symbol, receiver: any): any {
  //     const k = 11;
  //   }
  // }) as ISeqSplitted;
};

export const splitterAsFastaSimple: SplitterFunc = (seq: string): ISeqSplitted => {
  return !!seq ? new FastaSimpleSeqSplitted(seq) : new StringListSeqSplitted([], GapOriginals[NOTATION.FASTA]);
};

/** Gets method to split sequence by separator
 * @param separator Monomer separator
 * @param limit
 * @return {SplitterFunc}
 */
export function getSplitterWithSeparator(separator: string, limit: number | undefined = undefined): SplitterFunc {
  return (seq: string) => {
    if (!seq)
      return new StringListSeqSplitted([], GapOriginals[NOTATION.SEPARATOR]);
    else {
      let mmList: string[];
      const mRe = new RegExp(`(?<=^|\\${separator})("-"|'-'|[^\\${separator}]*)(?=\\${separator}|$)`, 'g'); // depends on separator args
      if (limit !== undefined) {
        mRe.lastIndex = 0;
        mmList = wu(seq.matchAll(mRe)).take(limit).map((ea) => ea[0]).toArray();
      } else
        mmList = seq.replaceAll('\"-\"', '').replaceAll('\'-\'', '').split(separator, limit);

      return new StringListSeqSplitted(mmList, GapOriginals[NOTATION.SEPARATOR]);
    }
  };
}

/** Splits Helm string to monomers, but does not replace monomer names to other notation (e.g. for RNA).
 * Only for linear polymers, does not split RNA for ribose and phosphate monomers.
 * @param {string} seq Source string of HELM notation
 * @param {ISeqSource} src Source of the {@link seq} string
 * @return {string[]}
 */
export const splitterAsHelm: SplitterFunc = (seq: any): ISeqSplitted => {
  const helmParts = seq.split('$');
  const spList = helmParts[0].split('|');
  const mList: string[] = wu(spList
    .map((sp: string) => (sp.match(/(?<=\{).+(?=})/)?.[0]?.split('.') ?? [])
      .map((m) => cleanupHelmSymbol(m)))
  )
    .flatten().toArray();

  return new StringListSeqSplitted(mList, GapOriginals[NOTATION.HELM]);
};

/** Func type to shorten a {@link monomerLabel} with length {@link limit} */
export type MonomerToShortFunc = (monomerLabel: string, limit: number) => string;

/** Get splitter method to split sequences to monomers (required for MacromoleculeDifferenceCellRenderer)
 * @param {string} units
 * @param {string} separator
 * @param limit
 * @return {SplitterFunc}
 */
export function getSplitter(units: string, separator: string, limit: number | undefined = undefined): SplitterFunc {
  if (units.toLowerCase().startsWith(NOTATION.FASTA))
    return splitterAsFasta;
  else if (units.toLowerCase().startsWith(NOTATION.SEPARATOR))
    return getSplitterWithSeparator(separator, limit);
  else if (units.toLowerCase().startsWith(NOTATION.HELM))
    return splitterAsHelm;
  else
    throw new Error(`Unexpected units ${units} .`);

  // TODO: Splitter for HELM
}

const longMonomerPartRe: RegExp = /([^\W_]+)/g;

/** Convert long monomer names to short ones */
export function monomerToShort(amino: string, maxLengthOfMonomer: number): string {
  if (amino.length <= maxLengthOfMonomer)
    return amino;
  //const kebabAmino = amino.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $);
  const shortAminoMatch: RegExpMatchArray | null = amino.match(longMonomerPartRe);
  const needAddDots: boolean = amino.length > maxLengthOfMonomer || (shortAminoMatch?.length ?? 0) > 1;
  const shortAmino = shortAminoMatch?.[0] ?? ' ';
  return !needAddDots ? shortAmino : shortAmino.substring(0, maxLengthOfMonomer - 1) + '…';
}

/** */
export function getAlphabet(alphabet: ALPHABET): Set<string> {
  switch (alphabet) {
  case ALPHABET.DNA:
    return Alphabets.fasta.dna;
  case ALPHABET.RNA:
    return Alphabets.fasta.rna;
  case ALPHABET.PT:
    return Alphabets.fasta.peptide;
  default:
    throw new Error(`Unsupported alphabet '${alphabet}'.`);
  }
}

/** Calculate similarity in current sequence and alphabet.
 * @param {MonomerFreqs} freq
 * @param {Set<string>} alphabet
 * @param {string} gapSymbol
 * @return {number} Cosine similarity
 */
export function getAlphabetSimilarity(freq: MonomerFreqs, alphabet: Set<string>, gapSymbol: string = '-'): number {
  const keys = new Set<string>([...new Set(Object.keys(freq)), ...alphabet]);
  keys.delete(gapSymbol);

  const freqA: number[] = [];
  const alphabetA: number[] = [];
  for (const m of keys) {
    freqA.push(m in freq ? freq[m] : 0);
    alphabetA.push(alphabet.has(m) ? 1 : 0);
  }
  /* There were a few ideas: chi-squared, pearson correlation (variance?), scalar product */
  const freqV: Vector = new Vector(freqA);
  const alphabetV: Vector = new Vector(alphabetA);
  return vectorDotProduct(freqV, alphabetV) / (vectorLength(freqV) * vectorLength(alphabetV));
}

/** From detectMacromolecule */
export function detectAlphabet(freq: MonomerFreqs, candidates: CandidateType[], gapSymbol: string = '-') {
  const candidatesSims: CandidateSimType[] = candidates.map((c) => {
    const sim = getAlphabetSimilarity(freq, c.alphabet, gapSymbol);
    return new CandidateSimType(c, freq, sim);
  });

  let alphabetName: string;
  const maxSim = Math.max(...candidatesSims.map(
    (cs) => cs.similarity > cs.cutoff ? cs.similarity : -1));
  if (maxSim > 0) {
    const sim = candidatesSims.find((cs) => cs.similarity === maxSim)!;
    alphabetName = sim.name;
  } else
    alphabetName = ALPHABET.UN;
  return alphabetName;
}

export function detectHelmAlphabet(freq: MonomerFreqs, candidates: CandidateType[], gapSymbol: string = '-') {
  // helm can contain DNA/RNA and other monomers. need to check that
  const mons = Object.keys(freq);
  const helmNucleotideFullRe = /\(|\)/;
  // heuristic for detecting dna/rna
  const hasBranching = mons.filter((m) => m.split(helmNucleotideFullRe).filter((p) => !!p).length === 3).length > mons.length * 0.8;
  const correctedFreqs = hasBranching ? Object.entries(freq)
    .reduce((acc, [m, f]) => {
      const split = m.split(helmNucleotideFullRe);
      const actualMonomer = split[1]; // the inside part is the actual monomer (for example r(A)p)
      if (actualMonomer)
        acc[actualMonomer] = f; return acc;
    },
      {} as Record<string, number>) : freq;
  return detectAlphabet(correctedFreqs, candidates, gapSymbol);
}

/** Selects a suitable palette based on column data
 * @param {DG.Column} seqCol Column to look for a palette
 * @param {number}  minLength minimum length of sequence to detect palette (empty strings are allowed)
 * @return {SeqPalette} Palette corresponding to the alphabet of the sequences in the column
 */
export function pickUpPalette(seqCol: DG.Column, seqHelper: ISeqHelper, minLength: number = 5): SeqPalette {
  let alphabet: string;
  if (seqCol.semType == DG.SEMTYPE.MACROMOLECULE) {
    const sh: ISeqHandler = seqHelper.getSeqHandler(seqCol);
    alphabet = sh.alphabet;
  } else {
    const stats: SeqColStats = getStatsForCol(seqCol, minLength, splitterAsFasta);
    alphabet = detectAlphabet(stats.freq, candidateAlphabets);
  }

  const res = getPaletteByType(alphabet);
  return res;
}

export function getPaletteByType(paletteType: string): SeqPalette {
  switch (paletteType) {
  case ALPHABET.PT:
    return AminoacidsPalettes.GrokGroups;
  case ALPHABET.DNA:
  case ALPHABET.RNA:
    return NucleotidesPalettes.Chromatogram;
    // other
  default:
    return UnknownSeqPalettes.Color;
  }
}

export function pickUpSeqCol(df: DG.DataFrame): DG.Column<string> | null {
  const semTypeColList = df.columns.bySemTypeAll(DG.SEMTYPE.MACROMOLECULE);
  let resCol: DG.Column | null = semTypeColList.find((col) => {
    const units = col.meta.units;
    return units ? units.indexOf('MSA') !== -1 : false;
  }) ?? null;
  if (!resCol && semTypeColList.length > 0)
    resCol = semTypeColList[0];
  return resCol;
}
