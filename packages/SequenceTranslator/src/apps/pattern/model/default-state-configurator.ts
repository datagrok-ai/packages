import {STRANDS, TERMINI, DEFAULT_PHOSPHOROTHIOATE} from './const';
import {TerminalType, NucleotideSequences, StrandType, PhosphorothioateLinkageFlags, StrandTerminusModifications} from './types';
import {DEFAULT_PATTERN_CONFIG as DEFAULT} from './const';
import {AXOLABS_STYLE_MAP} from '../../common/data-loader/json-loader';

export class DefaultStateConfigurator {
  constructor() { }

  getPatternName(): string { return DEFAULT.PATTERN_NAME; }

  getAntiSenseStrandVisibilityFlag(): boolean { return DEFAULT.IS_ANTISENSE_STRAND_VISIBLE; }

  getNucleotideSequences(): NucleotideSequences {
    const nucleotideSequences = {} as NucleotideSequences;
    const defaultNucleobase = this.fetchDefaultNucleobase();
    STRANDS.forEach((strand) => {
      nucleotideSequences[strand] = new Array(DEFAULT.SEQUENCE_LENGTH).fill(defaultNucleobase);
    });

    return nucleotideSequences;
  }

  fetchDefaultNucleobase(): string {
    return this.fetchAvailableNucleotideBases()[0];
  }
  
  fetchAvailableNucleotideBases(): string[] {
    const nucleotideBases: string[] = Object.keys(AXOLABS_STYLE_MAP);
    return nucleotideBases;
  }

  getPhosphorothioateLinkageFlags(): PhosphorothioateLinkageFlags {
    const phosphorothioateLinkageFlags = {} as PhosphorothioateLinkageFlags;
    STRANDS.forEach((strand) => {
      phosphorothioateLinkageFlags[strand] = new Array(DEFAULT.SEQUENCE_LENGTH).fill(DEFAULT.PHOSPHOROTHIOATE);
    });

    return phosphorothioateLinkageFlags;
  }
  
  getTerminusModifications(): StrandTerminusModifications {
    const terminusModifications = {} as StrandTerminusModifications;
    STRANDS.forEach((strand) => {
      terminusModifications[strand] = {} as Record<TerminalType, string>;
      TERMINI.forEach((terminus) => {
        terminusModifications[strand][terminus] = DEFAULT.TERMINUS_MODIFICATION;
      });
    });

    return terminusModifications;
  }

  getComment(): string { return DEFAULT.COMMENT; }
  
  getModificationsWithNumericLabels(): string[] { return DEFAULT.MODIFICATIONS_WITH_NUMERIC_LABELS; }
}
