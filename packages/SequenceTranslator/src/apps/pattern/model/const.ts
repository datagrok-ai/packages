import {StrandType} from './types';

export const enum STRAND {
  SENSE = 'SS',
  ANTISENSE = 'AS',
};
export const STRANDS = [STRAND.SENSE, STRAND.ANTISENSE] as const;
export const STRAND_LABEL: Record<StrandType, string> = {
  [STRAND.SENSE]: 'Sense strand',
  [STRAND.ANTISENSE]: 'Anti sense',
};

export const enum STRAND_END {
  LEFT,
  RIGHT,
};

export const STRAND_ENDS = [STRAND_END.LEFT, STRAND_END.RIGHT] as const;

export const enum TERMINUS {
  FIVE_PRIME = '5\'',
  THREE_PRIME = '3\'',
};
export const TERMINI = [TERMINUS.THREE_PRIME, TERMINUS.FIVE_PRIME] as const;

export const STRAND_TO_END_TERMINUS_MAP = {
  [STRAND.SENSE]: {
    [STRAND_END.LEFT]: TERMINUS.THREE_PRIME,
    [STRAND_END.RIGHT]: TERMINUS.FIVE_PRIME
  },
  [STRAND.ANTISENSE]: {
    [STRAND_END.LEFT]: TERMINUS.FIVE_PRIME,
    [STRAND_END.RIGHT]: TERMINUS.THREE_PRIME
  }
} as const;

export const MAX_SEQUENCE_LENGTH = 34;

export const STORAGE_NAME: string = 'OligoToolkit';
export const EXAMPLE_MIN_WIDTH: string = '400px';

export const OTHER_USERS = 'Other users';

export namespace GRAPH_SETTINGS_KEYS {
  export const IS_ANTISENSE_STRAND_INCLUDED = 'isAntisenseStrandIncluded';
  export const NUCLEOTIDE_SEQUENCES = 'nucleotideSequences';
  export const PHOSPHOROTHIOATE_LINKAGE_FLAGS = 'phosphorothioateLinkageFlags';
  export const STRAND_TERMINUS_MODIFICATIONS = 'strandTerminusModifications';
  export const MODIFICATION_LABELS_VISIBLE = 'modificationLabelsVisible';
}

export namespace LEGEND_SETTINGS_KEYS {
  export const PATTERN_NAME = 'patternName';
  export const PATTERN_COMMENT = 'patternComment';
  export const NUCLEOTIDES_WITH_NUMERIC_LABELS = 'nucleotidesWithNumericLabels';
  export const NUCLEOTIDES_WITH_MODIFICATION_LABELS = 'nucleotidesWithModificationLabels';
}

export namespace PATTERN_RECORD_KEYS {
  export const PATTERN_CONFIG = 'patternConfig';
  export const AUTHOR_ID = 'authorID';
  export const DATE = 'date';
}

export namespace DATE_KEYS {
  export const CREATE = 'create';
  export const MODIFY = 'modify';
}

export const GRAPH_SETTINGS_KEY_LIST = [
  GRAPH_SETTINGS_KEYS.IS_ANTISENSE_STRAND_INCLUDED,
  GRAPH_SETTINGS_KEYS.NUCLEOTIDE_SEQUENCES,
  GRAPH_SETTINGS_KEYS.PHOSPHOROTHIOATE_LINKAGE_FLAGS,
  GRAPH_SETTINGS_KEYS.STRAND_TERMINUS_MODIFICATIONS
];

export const LEGEND_SETTINGS_KEY_LIST = [
  LEGEND_SETTINGS_KEYS.PATTERN_NAME,
  LEGEND_SETTINGS_KEYS.PATTERN_COMMENT,
  LEGEND_SETTINGS_KEYS.NUCLEOTIDES_WITH_NUMERIC_LABELS
];

export const EXAMPLE_PATTERN_CONFIG =
{
  'patternConfig': {
    'patternName': '<default example>',
    'isAntisenseStrandIncluded': true,
    'nucleotideSequences': {
      'SS': [
        'GNA', 'UNA', 'A', 'LNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA',
        'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA'
      ],
      'AS': [
        'GNA', 'UNA', 'A', 'LNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA',
        'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA', 'RNA'
      ]
    },
    'phosphorothioateLinkageFlags': {
      'SS': [
        true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true
      ],
      'AS': [
        true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true
      ]
    },
    'strandTerminusModifications': {
      'SS': {
        '3\'': '',
        '5\'': ''
      },
      'AS': {
        '3\'': '',
        '5\'': ''
      }
    },
    'patternComment': '',
    'nucleotidesWithNumericLabels': [
      'RNA', 'GNA', 'UNA', 'A', 'LNA'
    ],
    'nucleotidesWithModificationLabels': []
  },
  'authorID': ''
};

export const DEFAULT_DATE = '2024-01-01T18:00:00.000Z';
