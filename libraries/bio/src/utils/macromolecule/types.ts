import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ALPHABET} from './consts';
import {UnitsHandler} from '../units-handler';

export type SeqColStats = { freq: MonomerFreqs, sameLength: boolean }
export type SplitterFunc = (seq: string) => string[];
export type MonomerFreqs = { [m: string]: number };

/** Alphabet candidate type */
export class CandidateType {
  name: string;
  alphabet: Set<string>;
  cutoff: number;

  constructor(name: string, alphabet: Set<string>, cutoff: number) {
    this.name = name;
    this.alphabet = alphabet;
    this.cutoff = cutoff;
  }
}

/** Alphabet candidate similarity type */
export class CandidateSimType extends CandidateType {
  freq: MonomerFreqs;
  /** Cos, max = 1, min = 0 */
  similarity: number;

  constructor(candidate: CandidateType, freq: MonomerFreqs, similarity: number) {
    super(candidate.name, candidate.alphabet, candidate.cutoff);
    this.freq = freq;
    this.similarity = similarity;
  }
}
