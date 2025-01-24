// Control constants
export const CONTROL_TAG = '#';
export const CONTROL_TAG_LEN = CONTROL_TAG.length;
export const DF_NAME = 'df';
export const MAX_LINE_CHART = 4;

/** Control expressions for the problem specifying */
export enum CONTROL_EXPR {
    NAME = '#name',
    TAGS = '#tags',
    DESCR = '#description',
    DIF_EQ = '#equations',
    EXPR = '#expressions',
    ARG = '#argument',
    INITS = '#inits',
    CONSTS = '#constants',
    PARAMS = '#parameters',
    TOL = '#tolerance',
    LOOP = '#loop',
    UPDATE = '#update',
    RUN_ON_OPEN = '#meta.runOnOpen',
    RUN_ON_INPUT = '#meta.runOnInput',
    OUTPUT = '#output',
    COMMENT = '#comment',
    SOLVER = '#meta.solver',
    INPUTS = '#meta.inputs',
};

/** Loop consts */
export enum LOOP {
  MIN_LINES_COUNT = 1,
  COUNT_IDX = 0,
  COUNT_NAME = '_count',
  MIN_COUNT = 1,
};

/** UPDATE consts */
export enum UPDATE {
  MIN_LINES_COUNT = 1,
  DURATION_IDX = 0,
  DURATION = '_duration',
};

/** Ranges of the solver options */
export const SOLVER_OPTIONS_RANGES = new Map([
  ['maxTime', {min: 1, max: 10000}],
  ['scale', {min: 0.5, max: 1}],
]);

export const TINY = 0.0001;
export const STEP_RATIO = 0.5;
