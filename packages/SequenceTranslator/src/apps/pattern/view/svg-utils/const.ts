import {NUCLEOTIDES} from '../../../common/model/const';
import {AXOLABS_STYLE_MAP as styleMap} from '../../../common/data-loader/json-loader';
import {SVGElementFactory} from './svg-element-factory';
import {isOverhangNucleotide} from '../../model/helpers';
import { STRAND, STRANDS, TERMINUS, TERMINI } from '../../model/const';
import {PatternConfiguration, StrandType, TerminalType} from '../../model/types';


export const enum STRAND_END {
  LEFT,
  RIGHT,
};

export const STRAND_ENDS = [STRAND_END.LEFT, STRAND_END.RIGHT] as const;

export const enum LUMINANCE_COEFFICIENTS {
  RED = 0.299,
  GREEN = 0.587,
  BLUE = 0.114,
  THRESHOLD = 186,
};

export const enum TEXT_COLOR {
  DARK = '#333333',
  LIGHT = '#ffffff',
};

export const enum SVG_CIRCLE_SIZES {
  NUCLEOBASE_RADIUS = 15,
  NUCLEOBASE_DIAMETER = 2 * NUCLEOBASE_RADIUS,
  LEGEND_RADIUS = 6,
  LINKAGE_STAR_RADIUS = 5,
};

export const enum SVG_TEXT_FONT_SIZES {
  NUCLEOBASE = 17,
  COMMENT = 14,
};

export const enum SVG_ELEMENT_COLORS {
  LINKAGE_STAR = 'red',
  TEXT = 'var(--grey-6)',
  TITLE_TEXT = 'black',
  MODIFICATION_TEXT = 'red'
};

export const STRAND_END_LABEL_TEXT = {
  [STRAND_END.LEFT]: {
    [STRAND.SENSE]: `${STRAND.SENSE}: ${TERMINUS.FIVE_PRIME}`,
    [STRAND.ANTISENSE]: `${STRAND.ANTISENSE}: ${TERMINUS.THREE_PRIME}`,
  },
  [STRAND_END.RIGHT]: {
    [STRAND.SENSE]: `${TERMINUS.THREE_PRIME}`,
    [STRAND.ANTISENSE]: `${TERMINUS.FIVE_PRIME}`,
  }
} as const;

export const NUMERIC_LABEL_POSITION_OFFSET = {
  ONE_DIGIT: -5,
  TWO_DIGIT: -10,
} as const;

export const DEFAULT_FONT_FAMILY = 'Arial';

export const Y_POSITIONS_FOR_STRAND_ELEMENTS = {
  [STRAND.SENSE]: {
    NUMERIC_LABEL: 2 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
    NUCLEOBASE_CIRCLE: 3.5 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
    NUCLEOBASE_LABEL: 4 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
  },
  [STRAND.ANTISENSE]: {
    NUMERIC_LABEL: 8.5 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
    NUCLEOBASE_CIRCLE: 6.5 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
    NUCLEOBASE_LABEL: 7 * SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS,
  }
};

export const STRAND_TO_END_TERMINUS = {
  [STRAND.SENSE]: {
    [STRAND_END.LEFT]: TERMINUS.THREE_PRIME,
    [STRAND_END.RIGHT]: TERMINUS.FIVE_PRIME
  },
  [STRAND.ANTISENSE]: {
    [STRAND_END.LEFT]: TERMINUS.FIVE_PRIME,
    [STRAND_END.RIGHT]: TERMINUS.THREE_PRIME
  }
} as const;
