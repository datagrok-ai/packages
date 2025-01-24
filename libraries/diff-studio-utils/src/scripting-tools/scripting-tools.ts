/* eslint-disable max-len */
/* Scripting tools for the Initial Value Problem (IVP) solver:
     - parser of formulas defining IVP;
     - JS-script generator.

   The parser processes IVP formulas given in the declarative form (see README.md).

   JS-script generator creates DATAGROK JavaScript script: annotation & code.
*/

import {CONTROL_TAG, CONTROL_TAG_LEN, CONTROL_EXPR, LOOP, UPDATE, MAX_LINE_CHART,
  SOLVER_OPTIONS_RANGES, TINY, STEP_RATIO} from './constants';

import {ModelError} from './model-error';

// Scripting specific constants
export const CONTROL_SEP = ':';
const COMMA = ',';
const EQUAL_SIGN = '=';
const DIV_SIGN = '/';
const SERVICE = '_';
export const BRACE_OPEN = '{';
export const BRACE_CLOSE = '}';
export const BRACKET_OPEN = '[';
export const BRACKET_CLOSE = ']';
export const ANNOT_SEPAR = ';';
const DEFAULT_TOL = '0.00005';
export const DEFAULT_SOLVER_SETTINGS: string = '{}';
const COMMENT_SEQ = '//';
export const STAGE_COL_NAME = `_Stage`;
const INCEPTION = 'Inception';

/** Elementary math tools */
const MATH_FUNCS = ['pow', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'exp', 'log', 'sinh', 'cosh', 'tanh'];
const POW_IDX = MATH_FUNCS.indexOf('pow');
const MATH_CONSTS = ['PI', 'E'];

/** Default meta */
const defaultMetas = `//meta.runOnOpen: true
//meta.runOnInput: true
//meta.features: {"sens-analysis": true, "fitting": true}`;

/** Numerical input specification */
export type Input = {
  value: number,
  annot: string | null,
};

/** Argument of IVP specification */
type Arg = {
  name: string,
  initial: Input,
  final: Input,
  step: Input,
  updateName: string | undefined,
};

/** Input keys of Arg */
export const ARG_INPUT_KEYS = ['initial', 'final', 'step'];

/** Scripting specific constants */
export enum SCRIPTING {
  ARG_NAME = 'name',
  COUNT = 'count',
  DURATION = 'duration',
};

/** Differential equations specification */
type DifEqs = {
  equations: Map<string, string>,
  solutionNames: string[]
};

/** Loop specification */
type Loop = {
  count: Input,
  updates: string[],
};

/** Update specification */
type Update = {
  name: string,
  durationFormula: string,
  updates: string[],
};

/** Output specification */
type Output = {
  caption: string,
  formula: string | null,
};

/** Initial Value Problem (IVP) specification type */
export type IVP = {
  name: string,
  tags: string | null,
  descr: string | null,
  deqs: DifEqs,
  exprs: Map<string, string> | null,
  arg: Arg,
  inits: Map<string, Input>,
  consts: Map<string, Input> | null,
  params: Map<string, Input> | null,
  tolerance: string,
  usedMathFuncs: number[],
  usedMathConsts: number[],
  loop: Loop | null,
  updates: Update[] | null,
  metas: string[],
  outputs: Map<string, Output> | null,
  solverSettings: string,
  inputsLookup: string | null,
};

/** Help links for model errors */
enum ERROR_LINK {
  MAIN_DOCS = '/help/compute/diff-studio',
  CORE_BLOCKS = `/help/compute/diff-studio#core-blocks`,
  COMPS_SYNTAX = `/help/compute/diff-studio#model-components-and-syntax`,
  LOOP = `/help/compute/diff-studio#cyclic-processes`,
  UPDATE = `/help/compute/diff-studio#multistage-processes`,
  UI_OPTS = `/help/compute/diff-studio#user-interface-options`,
  LOOP_VS_UPDATE = `/help/compute/diff-studio#advanced-features`,
  SOLVER_CONFIG = `/help/compute/diff-studio#solver-configuration`,
  MODEL_PARAMS = `/help/compute/diff-studio#model-parameters`,
};

/** Specific error messages */
enum ERROR_MSG {
  CTRL_EXPR = `Unsupported control expression with the tag **"#"**`,
  ARG = `'The **#argument** block must consist of 3 lines specifying initial and final time, and solution grid step.`,
  LOOP = `The **#loop** block must contain at least one line.`,
  COUNT = 'Incorrect loop count',
  LOOP_VS_UPDATE = `The **#loop** and **'#update'** blocks cannot be used simultaneously.`,
  UPDATE_LINES_COUNT = `The **'#update'** block must contain at least one line.`,
  DURATION = 'Incorrect update duration',
  BRACES = ' Missing one of the braces (**{**, **}**).',
  COLON = `Incorrect position of **":"**.`,
  CASE_INSENS = 'Non-unique name (case-insensitive): use different caption for ',
  MISSING_INIT = `Correct the **#inits** block.`,
  UNDEF_NAME = `Model name missing. Specify the model name in the **#name** block.`,
  UNDEF_DEQS = `Differential equation(s) are required for this model. Add equation(s) under the **#equations** block.`,
  UNDEF_INITS = `Initial conditions are required for this model. Add initial conditions under the **#inits** block.`,
  UNDEF_ARG = `Argument specification is required for this model. Specify an argument, its range, and a grid step in the **#argument** block.`,
  CORRECT_ARG_LIM = `Correct limits in the **#argument** block.`,
  INTERVAL = `Incorrect range for`,
  NEGATIVE_STEP = `Solution grid step must be positive. Correct the **#argument** block.`,
  INCOR_STEP = `Grid step must less than the length of solution interval. Correct the **#argument** block.`,
  MISS_COLON = `Missing **":"**`,
  NAN = `is not a valid number. Correct the line`,
  SERVICE_START = `Variable names must not begin with **"_"**.`,
  REUSE_NAME = 'Variable reuse (case-insensitive): rename ',
  SOLVER = `Incorrect solver options. Correct the **#meta.solver** line.`,
} // ERROR_MSG

/** Datagrok annotations */
enum ANNOT {
  NAME = '//name:',
  DESCR = '//description:',
  TAGS = '//tags:',
  LANG = '//language: javascript',
  DOUBLE_INPUT = '//input: double',
  INT_INPUT = '//input: int',
  OUTPUT = `//output: dataframe df`,
  EDITOR = '//editor: Compute:RichFunctionViewEditor',
  SIDEBAR = '//sidebar: @compute',
  CAPTION = 'caption:',
  ARG_INIT = '{caption: Initial; category: Argument}',
  ARG_FIN = '{caption: Final; category: Argument}',
  ARG_STEP = '{caption: Step; category: Argument}',
  INITS = 'category: Initial values',
  PARAMS = 'category: Parameters',
}

/** JS-scripting components */
enum SCRIPT {
  CONSTS = '// constants',
  ODE_COM = '// the problem definition',
  ODE = 'let odes = {',
  SOLVER_COM = '// solve the problem',
  SOLVER = `const solver = await grok.functions.eval('DiffStudio:solveEquations');`,
  PREPARE = 'let call = solver.prepare({problem: odes, options: opts});',
  CALL = 'await call.call();',
  OUTPUT = `let df = call.getParamValue('df');`,
  SPACE2 = '  ',
  SPACE4 = '    ',
  SPACE6 = '      ',
  SPACE8 = '        ',
  FUNC_VALS = '// extract function values',
  EVAL_EXPR = '// evaluate expressions',
  COMP_OUT = '// compute output',
  MATH_FUNC_COM = '// used Math-functions',
  MATH_CONST_COM = '// used Math-constants',
  ONE_STAGE_COM = '\n// one stage solution',
  ONE_STAGE_BEGIN = 'let _oneStage = async (',
  ONE_STAGE_END = ') => {',
  ASYNC_OUTPUT = `let df = await _oneStage(`,
  RETURN_OUTPUT = `return call.getParamValue('df');`,
  EMPTY_OUTPUT = `let df = DG.DataFrame.create();`,
  APPEND = `df.append(`,
  SOLUTION_DF_COM = '// solution dataframe',
  LOOP_INTERVAL_COM = '// loop interval',
  LOOP_INTERVAL = `_interval`,
  LAST_IDX = `_lastIdx`,
  UPDATE_COM = '// update ',
  CUSTOM_OUTPUT_COM = '// create custom output',
  CUSTOM_COLUMNS = `let _columns = [`,
  ONE_STAGE = 'await _oneStage(',
  SEGMENT_COM = '// add segment category',
}

/** Limits of the problem specification */
type Block = {
  begin: number,
  end: number
}

/** Get start of the problem skipping note-lines */
function getStartOfProblemDef(lines: string[]): number {
  const linesCount = lines.length;
  let idx = 0;

  while (!lines[idx].startsWith(CONTROL_TAG)) {
    ++idx;

    if (idx === linesCount)
      throw new ModelError(ERROR_MSG.UNDEF_NAME, ERROR_LINK.CORE_BLOCKS);
  }

  return idx;
}

/** Get limits of blocks specifying IVP */
function getBlocks(lines: string[], start: number): Block[] {
  const linesCount = lines.length;
  let beg = start;
  let idx = start + 1;
  const blocks = [] as Block[];

  while (true) {
    if (idx === linesCount) {
      blocks.push({begin: beg, end: idx});
      break;
    }

    if (lines[idx].startsWith(CONTROL_TAG)) {
      blocks.push({begin: beg, end: idx});
      beg = idx;
    }

    ++idx;
  }

  return blocks;
}

/** Concatenate multi-line formulas & expressions */
function concatMultilineFormulas(source: string[]): string[] {
  const res: string[] = [source[0]];

  let idxRes = 0;
  let idxSource = 1;
  const size = source.length;

  while (idxSource < size) {
    const str = source[idxSource];

    if (!str.includes(EQUAL_SIGN))
      res[idxRes] += str;
    else {
      res.push(str);
      ++idxRes;
    }

    ++idxSource;
  }

  return res;
}

/** Get indeces of math functions used in the current text */
function getUsedMathIds(text: string, mathIds: string[]) {
  const res = [] as number[];
  const size = mathIds.length;

  for (let i = 0; i < size; ++i) {
    if (text.includes(`${mathIds[i]}`))
      res.push(i);
  }

  return res;
}

/** Get differential equations */
function getDifEquations(lines: string[]): DifEqs {
  const deqs = new Map<string, string>();
  const names = [] as string[];

  let divIdx = 0;
  let eqIdx = 0;

  for (const line of lines) {
    if (line === undefined)
      throw new ModelError(ERROR_MSG.UNDEF_DEQS, ERROR_LINK.CORE_BLOCKS, CONTROL_EXPR.DIF_EQ);

    divIdx = line.indexOf(DIV_SIGN);
    eqIdx = line.indexOf(EQUAL_SIGN);
    const name = line.slice(line.indexOf('d') + 1, divIdx).replace(/[() ]/g, '');
    names.push(name);
    deqs.set(name, line.slice(eqIdx + 1).trim());
  }

  return {
    equations: deqs,
    solutionNames: names,
  };
}

/** Get expressions of IVP */
function getExpressions(lines: string[]): Map<string, string> {
  const exprs = new Map<string, string>();
  let eqIdx = 0;

  for (const line of lines) {
    if (line === undefined)
      break;

    eqIdx = line.indexOf(EQUAL_SIGN);
    exprs.set(line.slice(0, eqIdx).replaceAll(' ', ''), line.slice(eqIdx + 1).trim());
  }

  return exprs;
}

/** Get input specification */
function getInput(line: string) : Input {
  const str = line.slice(line.indexOf(EQUAL_SIGN) + 1).trim();
  const braceIdx = str.indexOf(BRACE_OPEN);
  let val: number;

  if (braceIdx === -1) { // no annotation
    val = Number(str);

    // Check right-hand side
    if (isNaN(val))
      throw new ModelError(`**${str}** ${ERROR_MSG.NAN}\n **${line}**.`, ERROR_LINK.COMPS_SYNTAX, line);

    return {
      value: val,
      annot: null,
    };
  }

  // There is an annotation
  val = Number(str.slice(0, braceIdx));

  // Check right-hand side
  if (isNaN(val))
    throw new ModelError(`**${str.slice(0, braceIdx)}** ${ERROR_MSG.NAN}: **${line}**`, ERROR_LINK.COMPS_SYNTAX, line);

  return {
    value: val,
    annot: str.slice(braceIdx),
  };
}

/** Get argument (independent variable) of IVP */
function getArg(lines: string[]): Arg {
  if (lines.length !== 4)
    throw new ModelError(ERROR_MSG.ARG, ERROR_LINK.CORE_BLOCKS, CONTROL_EXPR.ARG);

  const sepIdx = lines[0].indexOf(CONTROL_SEP);
  if (sepIdx === -1)
    throw new ModelError(`${ERROR_MSG.MISS_COLON}. Correct the line **${lines[0]}**`, ERROR_LINK.CORE_BLOCKS, lines[0]);

  const commaIdx = lines[0].indexOf(COMMA);

  return {
    name: ((commaIdx > -1) ? lines[0].slice(sepIdx + 1, commaIdx) : lines[0].slice(sepIdx + 1)).trim(),
    initial: getInput(lines[1]),
    final: getInput(lines[2]),
    step: getInput(lines[3]),
    updateName: (commaIdx > -1) ? lines[0].slice(commaIdx + 1).trim() : undefined,
  };
}

/** Get equalities specification */
function getEqualities(lines: string[], begin: number, end: number): Map<string, Input> {
  const source = concatMultilineFormulas(lines.slice(begin, end));
  const eqs = new Map<string, Input>();
  let eqIdx = 0;

  for (const line of source) {
    if (line === undefined)
      break;

    eqIdx = line.indexOf(EQUAL_SIGN);
    eqs.set(line.slice(0, eqIdx).replaceAll(' ', ''), getInput(line));
  }

  return eqs;
}

/** Get loop specification */
function getLoop(lines: string[], begin: number, end: number): Loop {
  if (begin >= end)
    throw new ModelError(ERROR_MSG.LOOP, ERROR_LINK.LOOP, CONTROL_EXPR.LOOP);

  const source = concatMultilineFormulas(lines.slice(begin, end));
  const size = source.length;

  if (size < LOOP.MIN_LINES_COUNT)
    throw new ModelError(ERROR_MSG.LOOP, ERROR_LINK.LOOP, CONTROL_EXPR.LOOP);

  const count = getInput(source[LOOP.COUNT_IDX]);
  if (count.value < LOOP.MIN_COUNT)
    throw new ModelError(`${ERROR_MSG.COUNT}: **${count.value}**.`, ERROR_LINK.LOOP, source[LOOP.COUNT_IDX]);

  return {count: count, updates: source.slice(LOOP.COUNT_IDX + 1)};
}

/** Get update specification */
function getUpdate(lines: string[], begin: number, end: number): Update {
  const colonIdx = lines[begin].indexOf(CONTROL_SEP);
  if (colonIdx === -1) {
    throw new ModelError(
      `${ERROR_MSG.MISS_COLON}. Correct the line: **${lines[begin]}**`,
      ERROR_LINK.UPDATE,
      lines[begin],
    );
  }

  const source = concatMultilineFormulas(lines.slice(begin + 1, end));
  const size = source.length;

  if (size < UPDATE.MIN_LINES_COUNT)
    throw new ModelError(ERROR_MSG.UPDATE_LINES_COUNT, ERROR_LINK.UPDATE, CONTROL_EXPR.UPDATE);

  if (source[UPDATE.DURATION_IDX] == undefined)
    throw new ModelError(ERROR_MSG.UPDATE_LINES_COUNT, ERROR_LINK.UPDATE, CONTROL_EXPR.UPDATE);

  const eqIdx = source[UPDATE.DURATION_IDX].indexOf(EQUAL_SIGN);

  if (eqIdx === -1) {
    throw new ModelError(
      `Missing **${EQUAL_SIGN}**. Correct the line: **${source[UPDATE.DURATION_IDX]}**`,
      ERROR_LINK.UPDATE,
      source[UPDATE.DURATION_IDX],
    );
  }

  return {
    name: lines[begin].slice(colonIdx + 1),
    durationFormula: source[UPDATE.DURATION_IDX].slice(eqIdx + 1).trim(),
    updates: source.slice(UPDATE.DURATION_IDX + 1),
  };
} // getUpdate

/** Get output specification */
function getOutput(lines: string[], begin: number, end: number): Map<string, Output> {
  const res = new Map<string, Output>();

  let line: string;
  let token: string;
  let eqIdx: number;
  let openIdx: number;
  let closeIdx: number;
  let colonIdx: number;

  for (let i = begin; i < end; ++i) {
    line = lines[i].trim();

    if (line.length < 1)
      continue;

    eqIdx = line.indexOf(EQUAL_SIGN);
    openIdx = line.indexOf(BRACE_OPEN);
    closeIdx = line.indexOf(BRACE_CLOSE);
    colonIdx = line.indexOf(CONTROL_SEP);

    // check braces
    if (openIdx * closeIdx <= 0) {
      throw new ModelError(
        `${ERROR_MSG.BRACES} Correct the line **${line}** in the **${CONTROL_EXPR.OUTPUT}** block.`,
        ERROR_LINK.UI_OPTS,
        line,
      );
    }

    // check ":"
    if (openIdx * colonIdx <= 0) {
      throw new ModelError(
        `${ERROR_MSG.COLON} Correct the line **${line}** in the **#output** block.`,
        ERROR_LINK.UI_OPTS,
        line,
      );
    }

    if (eqIdx === -1) {// no formula
      if (openIdx === -1) { // no annotation
        token = line.trim();
        res.set(token, {
          caption: token,
          formula: null,
        });
      } else { // there is an annotation
        token = line.slice(0, openIdx).trim();
        res.set(token, {
          caption: line.slice(colonIdx + 1, closeIdx).trim(),
          formula: null,
        });
      }
    } else // there is a formula
      if (openIdx === -1) { // no annotation
        token = line.slice(0, eqIdx).trim();
        res.set(token, {
          caption: token,
          formula: line.slice(eqIdx + 1),
        });
      } else { // there is an annotation
        token = line.slice(0, eqIdx).trim();
        res.set(token, {
          caption: line.slice(colonIdx + 1, closeIdx),
          formula: line.slice(eqIdx + 1, openIdx),
        });
      }
  } // for i

  return res;
} // getOutput

/** Get initial value problem specification given in the text */
export function getIVP(text: string): IVP {
  // The current Initial Value Problem (IVP) specification
  let name: string;
  let tags: string | null = null;
  let descr: string | null = null;
  let deqs: DifEqs;
  let exprs: Map<string, string> | null = null;
  let arg: Arg;
  let inits: Map<string, Input>;
  let consts: Map<string, Input> | null = null;
  let params: Map<string, Input> | null = null;
  let tolerance = DEFAULT_TOL;
  let loop: Loop | null = null;
  const updates = [] as Update[];
  const metas = [] as string[];
  let outputs: Map<string, Output> | null = null;
  let solverSettings = DEFAULT_SOLVER_SETTINGS;
  let inputsLookup: string | null = null;

  // 0. Split text into lines & remove comments
  const lines = text.replaceAll('\t', ' ').split('\n')
    .map((s) => {
      const idx = s.indexOf(COMMENT_SEQ);
      return s.slice(0, (idx >= 0) ? idx : undefined).trimStart();
    })
    .filter((s) => s !== '');

  // 1. Skip first lines without the control tag
  const start = getStartOfProblemDef(lines);

  // 2. Get blocks limits
  const blocks = getBlocks(lines, start);

  // 3. Process blocks
  for (const block of blocks) {
    const firstLine = lines[block.begin];

    if (firstLine.startsWith(CONTROL_EXPR.NAME)) { // the 'name' block
      name = firstLine.slice(firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.TAGS)) { // the 'tags' block
      tags = firstLine.slice(firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.DESCR)) { // the 'description' block
      descr = firstLine.slice(firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.DIF_EQ)) { // the 'differential equations' block
      deqs = getDifEquations(concatMultilineFormulas(lines.slice(block.begin + 1, block.end)));
    } else if (firstLine.startsWith(CONTROL_EXPR.EXPR)) { // the 'expressions' block
      exprs = getExpressions(concatMultilineFormulas(lines.slice(block.begin + 1, block.end)));
    } else if (firstLine.startsWith(CONTROL_EXPR.ARG)) { // the 'argument' block
      arg = getArg(concatMultilineFormulas(lines.slice(block.begin, block.end)));
    } else if (firstLine.startsWith(CONTROL_EXPR.INITS)) { // the 'initial values' block
      inits = getEqualities(lines, block.begin + 1, block.end);
    } else if (firstLine.startsWith(CONTROL_EXPR.CONSTS)) { // the 'constants' block
      consts = getEqualities(lines, block.begin + 1, block.end);
    } else if (firstLine.startsWith(CONTROL_EXPR.PARAMS)) { // the 'parameters' block
      params = getEqualities(lines, block.begin + 1, block.end);
    } else if (firstLine.startsWith(CONTROL_EXPR.TOL)) { // the 'tolerance' block
      tolerance = firstLine.slice( firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.SOLVER)) { // the 'solver settings' block
      solverSettings = firstLine.slice(firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.LOOP)) { // the 'loop' block
      loop = getLoop(lines, block.begin + 1, block.end);
    } else if (firstLine.startsWith(CONTROL_EXPR.UPDATE)) { // the 'update' block
      updates.push(getUpdate(lines, block.begin, block.end));
    } else if (firstLine.startsWith(CONTROL_EXPR.OUTPUT)) { // the 'output' block
      outputs = getOutput(lines, block.begin + 1, block.end);
    } else if (firstLine.startsWith(CONTROL_EXPR.INPUTS)) { // the 'inputs' block
      inputsLookup = firstLine.slice(firstLine.indexOf(CONTROL_SEP) + 1).trim();
    } else if (firstLine.startsWith(CONTROL_EXPR.COMMENT)) { // the 'comment' block
      // just skip it
    } else
      metas.push(firstLine.slice(CONTROL_TAG_LEN));
  } // for

  // check loop- & update-features: just one is supported
  if ( (loop !== null) && (updates.length > 0))
    throw new ModelError(ERROR_MSG.LOOP_VS_UPDATE, ERROR_LINK.LOOP_VS_UPDATE, CONTROL_EXPR.LOOP);

  // obtained model
  const ivp = {
    name: name!,
    tags: tags,
    descr: descr,
    deqs: deqs!,
    exprs: exprs,
    arg: arg!,
    inits: inits!,
    consts: consts,
    params: params,
    tolerance: tolerance,
    usedMathFuncs: getUsedMathIds(text, MATH_FUNCS),
    usedMathConsts: getUsedMathIds(text, MATH_CONSTS),
    loop: loop,
    updates: (updates.length === 0) ? null : updates,
    metas: metas,
    outputs: outputs,
    solverSettings: solverSettings,
    inputsLookup: inputsLookup,
  };

  checkCorrectness(ivp);

  return ivp;
} // getIVP

/** Return input specification, required for annotation generating */
function getInputSpec(inp: Input): string {
  if (inp.annot)
    return `${inp.value} ${inp.annot}`;

  return `${inp.value}`;
}

/** Return annotation line specifying viewers */
function getViewersLine(ivp: IVP): string {
  const outputColsCount = (ivp.outputs) ? ivp.outputs.size : ivp.inits.size;
  const multiAxis = (outputColsCount > MAX_LINE_CHART - 1) ? 'true' : 'false';

  const segments = (ivp.updates) ? ` segmentColumnName: "${STAGE_COL_NAME}",` : '';

  // eslint-disable-next-line max-len
  return `viewer: Line chart(block: 100, multiAxis: "${multiAxis}",${segments} multiAxisLegendPosition: "RightCenter", autoLayout: "false", showAggrSelectors: "false") | Grid(block: 100)`;
}

/** Generate annotation lines */
function getAnnot(ivp: IVP, toAddViewers = true, toAddEditor = false): string[] {
  const res = [] as string[];

  // the 'name' line
  res.push(`${ANNOT.NAME} ${ivp.name}`);

  // the 'tags' line
  if (ivp.tags)
    res.push(`${ANNOT.TAGS} ${ivp.tags}`);

  // the 'description' line
  if (ivp.descr)
    res.push(`${ANNOT.DESCR} ${ivp.descr}`);

  // the 'language' line
  res.push(ANNOT.LANG);

  // the 'loop' lines
  if (ivp.loop)
    res.push(`${ANNOT.INT_INPUT} ${LOOP.COUNT_NAME} = ${getInputSpec(ivp.loop.count)}`);

  // argument lines
  const arg = ivp.arg;
  const t0 = `_${arg.name}0`;
  const t1 = `_${arg.name}1`;
  const h = `_h`;
  res.push(`${ANNOT.DOUBLE_INPUT} ${t0} = ${getInputSpec(arg.initial)}`);
  res.push(`${ANNOT.DOUBLE_INPUT} ${t1} = ${getInputSpec(arg.final)}`);
  res.push(`${ANNOT.DOUBLE_INPUT} ${h} = ${getInputSpec(arg.step)}`);

  // initial values lines
  ivp.inits.forEach((val, key) => res.push(`${ANNOT.DOUBLE_INPUT} ${key} = ${getInputSpec(val)}`));

  // parameters lines
  if (ivp.params !== null)
    ivp.params.forEach((val, key) => res.push(`${ANNOT.DOUBLE_INPUT} ${key} = ${getInputSpec(val)}`));

  // the 'output' line
  if (toAddViewers)
    res.push(`${ANNOT.OUTPUT} {${ANNOT.CAPTION} ${ivp.name}; ${getViewersLine(ivp)}}`);
  else
    res.push(`${ANNOT.OUTPUT} {${ANNOT.CAPTION} ${ivp.name}`);

  // the 'editor' line
  if (toAddEditor) {
    res.push(ANNOT.EDITOR);
    res.push(ANNOT.SIDEBAR);
  }

  if (ivp.metas.length >0)
    ivp.metas.forEach((line) => res.push(`//${line}`));
  else
    res.push(defaultMetas);

  return res;
} // getAnnot

/** Returns math functions arguments string */
function getMathArg(funcIdx: number): string {
  return (funcIdx > POW_IDX) ? '(x)' : '(x, y)';
}

/** Return custom output lines: no expressions */
function getCustomOutputLinesNoExpressions(name: string,
  outputs: Map<string, Output>, toAddUpdateCol: boolean): string[] {
  const res = [''];

  res.push(SCRIPT.CUSTOM_OUTPUT_COM);
  res.push(SCRIPT.CUSTOM_COLUMNS);

  outputs.forEach((val, key) => {
    if (!val.formula)
      res.push(`${SCRIPT.SPACE2}df.col('${key}'),`);
  });

  if (toAddUpdateCol)
    res.push(`${SCRIPT.SPACE2}df.col('${STAGE_COL_NAME}'),`);

  res.push('];');

  outputs.forEach((val, key) => {
    if (!val.formula)
      res.push(`df.col('${key}').name = '${val.caption}';`);
  });

  res.push(`df = DG.DataFrame.fromColumns(_columns);`);
  res.push(`df.name = '${name}';`);
  return res;
} // getCustomOutputLinesNoExpressions

/** Return custom output lines: with expressions */
function getCustomOutputLinesWithExpressions(ivp: IVP): string[] {
  const res = [''];

  res.push(SCRIPT.CUSTOM_OUTPUT_COM);

  // 1. Solution raw data
  res.push(`const ${ivp.arg.name}RawData = df.col('${ivp.arg.name}').getRawData();`);
  res.push(`let ${ivp.arg.name};`);
  res.push(`const len = df.rowCount;\n`);

  ivp.inits.forEach((val, key) => {
    res.push(`const ${key}RawData = df.col('${key}').getRawData();`);
  });

  res.push('');

  // 2. Expressions raw data & variables
  ivp.exprs!.forEach((val, key) => {
    if (ivp.outputs!.has(key))
      res.push(`const ${key}RawData = new Float64Array(len);`);

    res.push(`let ${key};`);
  });

  res.push('');

  // 3. Computations
  res.push('for (let i = 0; i < len; ++i) {');
  res.push(`${SCRIPT.SPACE2}${ivp.arg.name} = ${ivp.arg.name}RawData[i];`);

  ivp.inits.forEach((val, key) => {
    res.push(`${SCRIPT.SPACE2}${key} = ${key}RawData[i];`);
  });

  ivp.exprs!.forEach((val, key) => {
    res.push(`${SCRIPT.SPACE2}${key} = ${val};`);

    if (ivp.outputs!.has(key))
      res.push(`${SCRIPT.SPACE2}${key}RawData[i] = ${key};`);
  });

  res.push('}\n');

  // 4. Form output
  res.push(`df = DG.DataFrame.fromColumns([`);
  ivp.outputs!.forEach((val, key) => {
    if (!val.formula)
      res.push(`${SCRIPT.SPACE2}DG.Column.fromFloat64Array('${val.caption}', ${key}RawData.slice(0, len)),`);
  });

  if (ivp.updates !== null)
    res.push(`${SCRIPT.SPACE2}df.col('${STAGE_COL_NAME}'),`);

  res.push(']);');
  res.push(`df.name = '${ivp.name}';`);

  return res;
} // getCustomOutputLinesWithExpressions

/** Return custom output lines */
function getCustomOutputLines(ivp: IVP): string[] {
  if (ivp.exprs !== null) {
    for (const key of ivp.exprs.keys()) {
      if (ivp.outputs?.has(key))
        return getCustomOutputLinesWithExpressions(ivp);
    }
  }

  return getCustomOutputLinesNoExpressions(ivp.name, ivp.outputs!, (ivp.updates !== null));
} // getCustomOutputLinesWithExpressions

/** Return main body of JS-script: basic variant */
function getScriptMainBodyBasic(ivp: IVP): string[] {
  const res = [] as string[];

  // 1. Constants lines
  if (ivp.consts !== null) {
    res.push('');
    res.push(SCRIPT.CONSTS);
    ivp.consts.forEach((val, key) => res.push(`const ${key} = ${val.value};`));
  }

  // 2. The problem definition lines
  res.push('');
  res.push(SCRIPT.ODE_COM);
  res.push(SCRIPT.ODE);
  res.push(`${SCRIPT.SPACE4}name: '${ivp.name}',`);

  // 2.1) argument
  const t = ivp.arg.name;
  const t0 = `_${t}0`;
  const t1 = `_${t}1`;
  const h = `_h`;
  res.push(`${SCRIPT.SPACE4}arg: {name: '${t}', start: ${t0}, finish: ${t1}, step: ${h}},`);

  const names = ivp.deqs.solutionNames;

  // 2.2) initial values
  res.push(`${SCRIPT.SPACE4}initial: [${names.join(', ')}],`);

  // 2.3) the right-hand side of the problem
  res.push(`${SCRIPT.SPACE4}func: (${t}, _y, _output) => {`);

  res.push(`${SCRIPT.SPACE6}${SCRIPT.FUNC_VALS}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE6}const ${name} = _y[${idx}];`));

  if (ivp.exprs !== null) {
    res.push(`\n${SCRIPT.SPACE6}${SCRIPT.EVAL_EXPR}`);
    ivp.exprs.forEach((val, key) => res.push(`${SCRIPT.SPACE6}const ${key} = ${val};`));
  }

  res.push(`\n${SCRIPT.SPACE6}${SCRIPT.COMP_OUT}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE6}_output[${idx}] = ${ivp.deqs.equations.get(name)};`));

  res.push(`${SCRIPT.SPACE4}},`);

  // 2.4) final lines of the problem specification
  res.push(`${SCRIPT.SPACE4}tolerance: ${ivp.tolerance},`);
  //res.push(`${SCRIPT.SPACE6}solverOptions: ${ivp.solverSettings.replaceAll(ANNOT_SEPAR, COMMA)},`);
  res.push(`${SCRIPT.SPACE4}solutionColNames: [${names.map((key) => `'${key}'`).join(', ')}]`);
  res.push('};');

  // 2.5) solver options
  res.push('');
  res.push(`let opts = ${ivp.solverSettings.replaceAll(';', ',')};`);

  // 3. Math functions
  if (ivp.usedMathFuncs.length > 0) {
    res.push('');
    res.push(SCRIPT.MATH_FUNC_COM);
    ivp.usedMathFuncs.forEach((i) =>
      res.push(`const ${MATH_FUNCS[i]} = ${getMathArg(i)} => Math.${MATH_FUNCS[i]}${getMathArg(i)};`,
      ));
  }

  // 4. Math constants
  if (ivp.usedMathConsts.length > 0) {
    res.push('');
    res.push(SCRIPT.MATH_CONST_COM);
    ivp.usedMathConsts.forEach((i) => res.push(`const ${MATH_CONSTS[i]} = Math.${MATH_CONSTS[i]};`));
  }

  // 5. The 'call solver' lines
  res.push('');
  res.push(SCRIPT.SOLVER_COM);
  res.push(SCRIPT.SOLVER);
  res.push(SCRIPT.PREPARE);
  res.push(SCRIPT.CALL);
  res.push(SCRIPT.OUTPUT);

  return res;
} // getScriptMainBodyBasic

/** Return function for JS-script */
function getScriptFunc(ivp: IVP, funcParamsNames: string): string[] {
  const res = [] as string[];

  // 0. Function declaration
  res.push(SCRIPT.ONE_STAGE_COM);
  res.push(`${SCRIPT.ONE_STAGE_BEGIN}${funcParamsNames}${SCRIPT.ONE_STAGE_END}`);

  // 1. Constants lines
  if (ivp.consts !== null) {
    res.push('');
    res.push(SCRIPT.SPACE2 + SCRIPT.CONSTS);
    ivp.consts.forEach((val, key) => res.push(`${SCRIPT.SPACE2}const ${key} = ${val.value};`));
  }

  // 2. The problem definition lines
  res.push(SCRIPT.SPACE2 + SCRIPT.ODE_COM);
  res.push(SCRIPT.SPACE2 + SCRIPT.ODE);
  res.push(`${SCRIPT.SPACE6}name: '${ivp.name}',`);

  // 2.1) argument
  const t = ivp.arg.name;
  const t0 = `_${t}0`;
  const t1 = `_${t}1`;
  const h = `_h`;
  res.push(`${SCRIPT.SPACE6}arg: {name: '${t}', start: ${t0}, finish: ${t1}, step: ${h}},`);

  const names = ivp.deqs.solutionNames;

  // 2.2) initial values
  res.push(`${SCRIPT.SPACE6}initial: [${names.join(', ')}],`);

  // 2.3) the right-hand side of the problem
  res.push(`${SCRIPT.SPACE6}func: (${t}, _y, _output) => {`);

  res.push(`${SCRIPT.SPACE8}${SCRIPT.FUNC_VALS}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE8}const ${name} = _y[${idx}];`));

  if (ivp.exprs !== null) {
    res.push(`\n${SCRIPT.SPACE8}${SCRIPT.EVAL_EXPR}`);
    ivp.exprs.forEach((val, key) => res.push(`${SCRIPT.SPACE8}const ${key} = ${val};`));
  }

  res.push(`\n${SCRIPT.SPACE8}${SCRIPT.COMP_OUT}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE8}_output[${idx}] = ${ivp.deqs.equations.get(name)};`));

  res.push(`${SCRIPT.SPACE6}},`);

  // 2.4) final lines of the problem specification
  res.push(`${SCRIPT.SPACE6}tolerance: ${ivp.tolerance},`);
  //res.push(`${SCRIPT.SPACE6}solverOptions: ${ivp.solverSettings.replaceAll(ANNOT_SEPAR, COMMA)},`);
  res.push(`${SCRIPT.SPACE6}solutionColNames: [${names.map((key) => `'${key}'`).join(', ')}]`);
  res.push(`${SCRIPT.SPACE2}};`);

  // 2.5) solver options
  res.push('');
  res.push(`${SCRIPT.SPACE2}let opts = ${ivp.solverSettings.replaceAll(';', ',')};`);

  // 3. Math functions
  if (ivp.usedMathFuncs.length > 0) {
    res.push('');
    res.push(SCRIPT.SPACE2 + SCRIPT.MATH_FUNC_COM);
    // eslint-disable-next-line max-len
    ivp.usedMathFuncs.forEach((i) => res.push(`${SCRIPT.SPACE2}const ${MATH_FUNCS[i]} = ${getMathArg(i)} => Math.${MATH_FUNCS[i]}${getMathArg(i)};`));
  }

  // 4. Math constants
  if (ivp.usedMathConsts.length > 0) {
    res.push('');
    res.push(SCRIPT.SPACE2 + SCRIPT.MATH_CONST_COM);
    ivp.usedMathConsts.forEach((i) => res.push(`${SCRIPT.SPACE2}const ${MATH_CONSTS[i]} = Math.${MATH_CONSTS[i]};`));
  }

  // 5. The 'call solver' lines
  res.push('');
  res.push(SCRIPT.SPACE2 + SCRIPT.SOLVER_COM);
  res.push(SCRIPT.SPACE2 + SCRIPT.SOLVER);
  res.push(SCRIPT.SPACE2 + SCRIPT.PREPARE);
  res.push(SCRIPT.SPACE2 + SCRIPT.CALL);
  res.push(SCRIPT.SPACE2 + SCRIPT.RETURN_OUTPUT);

  // 6. Close the function
  res.push('};');

  return res;
} // getScriptFunc

/** Return main body of JS-script: loop case */
function getScriptMainBodyLoopCase(ivp: IVP): string[] {
  const funcParamsNames = getFuncParamsNames(ivp);
  const res = getScriptFunc(ivp, funcParamsNames);
  res.push('');
  //res.push(`${SCRIPT.ASYNC_OUTPUT}${funcParamsNames});`);

  res.push(SCRIPT.SOLUTION_DF_COM);
  const dfNames = getSolutionDfColsNames(ivp);

  res.push(`let df = DG.DataFrame.fromColumns([`);
  dfNames.forEach((name) => res.push(`${SCRIPT.SPACE2}DG.Column.fromFloat64Array('${name}', []),`));
  res.push(`]);`);
  res.push(`df.name = '${ivp.name}';`);
  res.push('');

  res.push(SCRIPT.LOOP_INTERVAL_COM);
  res.push(`const ${SCRIPT.LOOP_INTERVAL} = _${ivp.arg.name}1 - _${ivp.arg.name}0;`);
  res.push('');
  res.push(`let ${SCRIPT.LAST_IDX} = 0;\n`);

  res.push(SCRIPT.SOLVER_COM);
  res.push(`for (let _idx = 0; _idx < ${LOOP.COUNT_NAME}; ++_idx) {`);
  ivp.loop!.updates.forEach((upd) => res.push(`${SCRIPT.SPACE2}${upd};`));
  res.push(`${SCRIPT.SPACE2}${SCRIPT.APPEND}${SCRIPT.ONE_STAGE}${funcParamsNames}), true);`);
  res.push(`${SCRIPT.SPACE2}_${ivp.arg.name}0 = _${ivp.arg.name}1;`);
  res.push(`${SCRIPT.SPACE2}_${ivp.arg.name}1 += ${SCRIPT.LOOP_INTERVAL};`);
  res.push(`${SCRIPT.SPACE2}${SCRIPT.LAST_IDX} = df.rowCount - 1;`);

  dfNames.forEach((name, idx) => {
    if (idx !== 0)
      res.push(`${SCRIPT.SPACE2}${name} = df.get('${name}', ${SCRIPT.LAST_IDX});`);
  });

  // eslint-disable-next-line max-len
  res.push(`${SCRIPT.SPACE2}df.set('${ivp.arg.name}', ${SCRIPT.LAST_IDX}, _${ivp.arg.name}0 - Math.min(_h * ${STEP_RATIO}, ${TINY}));`);

  res.push('};');

  return res;
} // getScriptMainBodyLoopCase

/** Return main body of JS-script: update case */
function getScriptMainBodyUpdateCase(ivp: IVP): string[] {
  const funcParamsNames = getFuncParamsNames(ivp);
  const res = getScriptFunc(ivp, funcParamsNames);

  res.push('');

  res.push(SCRIPT.SOLUTION_DF_COM);
  const dfNames = getSolutionDfColsNames(ivp);

  res.push(`${SCRIPT.ASYNC_OUTPUT}${funcParamsNames});`);

  res.push('');

  res.push(SCRIPT.SEGMENT_COM);
  // eslint-disable-next-line max-len
  res.push(`df.columns.add(DG.Column.fromList('string', '${STAGE_COL_NAME}', new Array(df.rowCount).fill('${ivp.arg.updateName ?? INCEPTION}')));`);

  res.push('');
  res.push(`let ${SCRIPT.LAST_IDX} = 0;`);

  ivp.updates!.forEach((upd, idx) => {
    res.push('');
    res.push(`${SCRIPT.UPDATE_COM} ${idx + 1}`);
    res.push(`const ${UPDATE.DURATION}${idx + 1} = ${upd.durationFormula};`);
    res.push(`${SCRIPT.LAST_IDX} = df.rowCount - 1;`);

    // eslint-disable-next-line max-len
    res.push(`df.set('${ivp.arg.name}', ${SCRIPT.LAST_IDX}, _${ivp.arg.name}1 - Math.min(_h * ${STEP_RATIO}, ${TINY}));`);

    dfNames.forEach((name, idx) => {
      if (idx !== 0)
        res.push(`${name} = df.get('${name}', ${SCRIPT.LAST_IDX});`);
    });

    upd.updates.forEach((upd) => res.push(`${upd};`));

    res.push(`_${ivp.arg.name}0 = _${ivp.arg.name}1;`);
    res.push(`_${ivp.arg.name}1 += ${UPDATE.DURATION}${idx + 1};`);

    res.push(`const _DF${idx + 1} = ${SCRIPT.ONE_STAGE}${funcParamsNames});`);
    // eslint-disable-next-line max-len
    res.push(`_DF${idx + 1}.columns.add(DG.Column.fromList('string', '${STAGE_COL_NAME}', new Array(_DF${idx + 1}.rowCount).fill('${upd.name}')));`);
    res.push(`${SCRIPT.APPEND}_DF${idx + 1}, true);`);
  });

  return res;
} // getScriptMainBodyUpdateCase

/** Return main body of JS-script */
function getScriptMainBody(ivp: IVP): string[] {
  if (ivp.loop)
    return getScriptMainBodyLoopCase(ivp);

  if (ivp.updates)
    return getScriptMainBodyUpdateCase(ivp);

  return getScriptMainBodyBasic(ivp);
}

/** Return JS-script lines */
export function getScriptLines(ivp: IVP, toAddViewers = true, toAddEditor = false): string[] {
  const res = getAnnot(ivp, toAddViewers, toAddEditor).concat(getScriptMainBody(ivp));

  if (ivp.outputs)
    return res.concat(getCustomOutputLines(ivp));

  return res;
}

/** Return parameters of JS-script */
export function getScriptParams(ivp: IVP): Record<string, number> {
  const res = {} as Record<string, number>;

  if (ivp.loop)
    res[LOOP.COUNT_NAME] = ivp.loop.count.value;

  const arg = ivp.arg;

  res[`_${arg.name}0`] = arg.initial.value;
  res[`_${arg.name}1`] = arg.final.value;
  res[`_h`] = arg.step.value;

  ivp.inits.forEach((val, key) => res[key] = val.value);

  if (ivp.params)
    ivp.params.forEach((val, key) => res[key] = val.value);

  return res;
}

/** Return func parameters names string */
function getFuncParamsNames(ivp: IVP): string {
  const names = [] as string [];

  const arg = ivp.arg.name;

  names.push(`_${arg}0`);
  names.push(`_${arg}1`);
  names.push(`_h`);

  ivp.inits.forEach((val, key) => names.push(key));

  if (ivp.params)
    ivp.params.forEach((val, key) => names.push(key));

  return names.join(', ');
}

/** Return solution dataframe columns names*/
function getSolutionDfColsNames(ivp: IVP): string[] {
  const res = [] as string[];

  res.push(ivp.arg.name);

  ivp.inits.forEach((val, key) => res.push(key));

  return res;
}

/** Check solver settings */
function checkSolverSettings(line: string): void {
  const settings = new Map<string, string>();

  const openBraceIdx = line.indexOf(BRACE_OPEN);
  const closeBraceIdx = line.indexOf(BRACE_CLOSE);
  let sepIdx: number;

  if ((openBraceIdx < 0 )|| (closeBraceIdx < 0))
    throw new ModelError(`${ERROR_MSG.BRACES}. Correct the line **${line}**.`, ERROR_LINK.SOLVER_CONFIG, line);

  for (const item of line.slice(openBraceIdx + 1, closeBraceIdx).split(ANNOT_SEPAR)) {
    sepIdx = item.indexOf(CONTROL_SEP);

    if (sepIdx > 1)
      settings.set(item.slice(0, sepIdx).trim(), item.slice(sepIdx + 1).trim());
  }

  SOLVER_OPTIONS_RANGES.forEach((range, opt) => {
    if (settings.has(opt)) {
      const val = Number(settings.get(opt));

      if ((val < range.min) || (val > range.max)) {
        throw new ModelError(
          `${ERROR_MSG.SOLVER}: **${opt}** must be in the range **${range.min}..${range.max}**.`,
          ERROR_LINK.SOLVER_CONFIG,
          line,
        );
      }
    }
  });
} // checkSolverSettings

/** Check IVP correctness */
function checkCorrectness(ivp: IVP): void {
  // 0. Check basic elements
  if (ivp.name === undefined)
    throw new ModelError(ERROR_MSG.UNDEF_NAME, ERROR_LINK.CORE_BLOCKS);

  if ((ivp.deqs === undefined) || (ivp.deqs.equations.size === 0))
    throw new ModelError(ERROR_MSG.UNDEF_DEQS, ERROR_LINK.CORE_BLOCKS);

  if ((ivp.inits === undefined) || (ivp.inits.size === 0))
    throw new ModelError(ERROR_MSG.UNDEF_INITS, ERROR_LINK.CORE_BLOCKS);

  if (ivp.arg === undefined)
    throw new ModelError(ERROR_MSG.UNDEF_ARG, ERROR_LINK.CORE_BLOCKS);

  // 1. Check initial values
  ivp.deqs.equations.forEach((ignore, name) => {
    if (!ivp.inits.has(name)) {
      throw new ModelError(
        `Initial value for **${name}** is missing. ${ERROR_MSG.MISSING_INIT}`,
        ERROR_LINK.CORE_BLOCKS,
        CONTROL_EXPR.INITS,
      );
    }
  });

  // 2. Check names of output columns
  const usedNames = [] as string[];
  let lowCase: string;

  if (ivp.outputs !== null) {
    ivp.outputs.forEach((val) => {
      lowCase = val.caption.toLowerCase();

      if (usedNames.includes(lowCase))
        throw new ModelError(`${ERROR_MSG.CASE_INSENS}**${val.caption}**.`, ERROR_LINK.UI_OPTS, CONTROL_EXPR.OUTPUT);
      else
        usedNames.push(lowCase);
    });
  } else {
    const usedNames = [ivp.arg.name];

    ivp.deqs.solutionNames.forEach((name) => {
      lowCase = name.toLowerCase();

      if (usedNames.includes(lowCase))
        throw new ModelError(`${ERROR_MSG.CASE_INSENS}**${name}**.`, ERROR_LINK.UI_OPTS);
      else
        usedNames.push(lowCase);
    });
  }

  // 3. Check argument
  if (ivp.arg.initial.value >= ivp.arg.final.value) {
    throw new ModelError(
      `${ERROR_MSG.INTERVAL} **${ivp.arg.name}**. ${ERROR_MSG.CORRECT_ARG_LIM}`,
      ERROR_LINK.CORE_BLOCKS,
      CONTROL_EXPR.ARG,
    );
  }

  if (ivp.arg.step.value <= 0) {
    throw new ModelError(
      `${ERROR_MSG.NEGATIVE_STEP}`,
      ERROR_LINK.CORE_BLOCKS);
  }

  if (ivp.arg.step.value > ivp.arg.final.value - ivp.arg.initial.value)
    throw new ModelError(ERROR_MSG.INCOR_STEP, ERROR_LINK.CORE_BLOCKS);

  // 4. Check script inputs, due to https://reddata.atlassian.net/browse/GROK-15152
  const scriptInputs = [] as string[];
  let current: string;

  // 4.1) initial values
  ivp.inits.forEach((_, key) => {
    if (key[0] === SERVICE) {
      throw new ModelError(
        `${ERROR_MSG.SERVICE_START} Correct **"${key}"** in the **#inits** block.`,
        ERROR_LINK.CORE_BLOCKS,
      );
    }

    current = key.toLocaleLowerCase();

    if (scriptInputs.includes(current)) {
      throw new ModelError(
        `${ERROR_MSG.REUSE_NAME} **"${key}"** in the **#inits** block.`,
        ERROR_LINK.CORE_BLOCKS,
      );
    }

    scriptInputs.push(current);
  });

  // 4.2) parameters
  if (ivp.params !== null) {
    ivp.params.forEach((_, key) => {
      if (key[0] === SERVICE) {
        throw new ModelError(
          `${ERROR_MSG.SERVICE_START}: correct **"${key}"** in the **${CONTROL_EXPR.PARAMS}** block.`,
          ERROR_LINK.MODEL_PARAMS,
        );
      }

      current = key.toLocaleLowerCase();

      if (scriptInputs.includes(current)) {
        throw new ModelError(
          `${ERROR_MSG.REUSE_NAME} **"${key}"** in the **${CONTROL_EXPR.PARAMS}** block.`,
          ERROR_LINK.MODEL_PARAMS,
        );
      }

      scriptInputs.push(current);
    });
  }

  // 5. Check solver settings
  checkSolverSettings(ivp.solverSettings);
} // checkCorrectness

/** */
export function getJScode(ivp: IVP): string[] {
  const res = [] as string[];

  // 1. Math functions
  if (ivp.usedMathFuncs.length > 0) {
    res.push(SCRIPT.MATH_FUNC_COM);
    ivp.usedMathFuncs.forEach((i) =>
      res.push(`const ${MATH_FUNCS[i]} = ${getMathArg(i)} => Math.${MATH_FUNCS[i]}${getMathArg(i)};`,
      ));
  }

  // 2. Math constants
  if (ivp.usedMathConsts.length > 0) {
    res.push('');
    res.push(SCRIPT.MATH_CONST_COM);
    ivp.usedMathConsts.forEach((i) => res.push(`const ${MATH_CONSTS[i]} = Math.${MATH_CONSTS[i]};`));
  }

  // 1. Constants lines
  if (ivp.consts !== null) {
    res.push('');
    res.push(SCRIPT.CONSTS);
    ivp.consts.forEach((val, key) => res.push(`const ${key} = ${val.value};`));
  }

  // 2. The problem definition lines
  res.push('');
  res.push(SCRIPT.ODE_COM);
  res.push(`const odes = {`);
  res.push(`${SCRIPT.SPACE4}name: '${ivp.name}',`);

  // 2.1) argument
  const t = ivp.arg.name;
  const t0 = `_${t}0`;
  const t1 = `_${t}1`;
  const h = `_h`;
  res.push(`${SCRIPT.SPACE4}arg: {name: '${t}', start: ${t0}, finish: ${t1}, step: ${h}},`);

  const names = ivp.deqs.solutionNames;

  // 2.2) initial values
  res.push(`${SCRIPT.SPACE4}initial: [${names.join(', ')}],`);

  // 2.3) the right-hand side of the problem
  res.push(`${SCRIPT.SPACE4}func: (${t}, _y, _output) => {`);

  res.push(`${SCRIPT.SPACE6}${SCRIPT.FUNC_VALS}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE6}const ${name} = _y[${idx}];`));

  if (ivp.exprs !== null) {
    res.push(`\n${SCRIPT.SPACE6}${SCRIPT.EVAL_EXPR}`);
    ivp.exprs.forEach((val, key) => res.push(`${SCRIPT.SPACE6}const ${key} = ${val};`));
  }

  res.push(`\n${SCRIPT.SPACE6}${SCRIPT.COMP_OUT}`);
  names.forEach((name, idx) => res.push(`${SCRIPT.SPACE6}_output[${idx}] = ${ivp.deqs.equations.get(name)};`));

  res.push(`${SCRIPT.SPACE4}},`);

  // 2.4) final lines of the problem specification
  res.push(`${SCRIPT.SPACE4}tolerance: ${ivp.tolerance},`);
  //res.push(`${SCRIPT.SPACE6}solverOptions: ${ivp.solverSettings.replaceAll(ANNOT_SEPAR, COMMA)},`);
  res.push(`${SCRIPT.SPACE4}solutionColNames: [${names.map((key) => `'${key}'`).join(', ')}]`);
  res.push('};');

  return res;
} // getJScode
