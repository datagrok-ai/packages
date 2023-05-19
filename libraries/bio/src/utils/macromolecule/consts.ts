import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {UnitsHandler} from '../units-handler';
import {CandidateType} from './types';

/** enum type to simplify setting "user-friendly" notation if necessary */
export const enum NOTATION {
  FASTA = 'fasta',
  SEPARATOR = 'separator',
  HELM = 'helm',
}

export const enum ALIGNMENT {
  SEQ_MSA = 'SEQ.MSA',
  SEQ = 'SEQ',
}

export const enum ALPHABET {
  DNA = 'DNA',
  RNA = 'RNA',
  PT = 'PT',
  /** Unknown */
  UN = 'UN',
}

export const enum TAGS {
  aligned = 'aligned',
  alphabet = 'alphabet',
  alphabetSize = '.alphabetSize',
  alphabetIsMultichar = '.alphabetIsMultichar',
  separator = 'separator',
  isHelmCompatible = '.isHelmCompatible',
}

export const monomerRe: RegExp = /\[(\w+)\]|(\w)|(-)/g;

export const Alphabets = new class {
  fasta = {
    peptide: new Set<string>([
      'G', 'L', 'Y', 'S', 'E', 'Q', 'D', 'N', 'F', 'A',
      'K', 'R', 'H', 'C', 'V', 'P', 'W', 'I', 'M', 'T',
    ]),
    dna: new Set<string>(['A', 'C', 'G', 'T']),
    rna: new Set<string>(['A', 'C', 'G', 'U']),
  };
}();

export const candidateAlphabets: CandidateType[] = [
  new CandidateType(ALPHABET.PT, Alphabets.fasta.peptide, 0.50),
  new CandidateType(ALPHABET.DNA, Alphabets.fasta.dna, 0.55),
  new CandidateType(ALPHABET.RNA, Alphabets.fasta.rna, 0.55),
];
