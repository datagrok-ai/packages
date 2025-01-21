/** Utils for testing correctness of solvers.

   References
   [1] Steven Chapra, Raymond Canale - Numerical Methods for Engineers-McGraw Hill (2020)
*/

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ODEs} from '../solver-tools/solver-defs';

enum NAMES {
  T = 't',
  X = 'x',
  Y = 'y',
  Z = 'z',
};

type CorrectnessProblem = {
  odes: ODEs,
  exact: (t: number) => Float64Array,
};

/** Non-stiff 1D test problem: equation (see [1], p. 736) */
const nonStiff1D = {
  name: 'non-stiff 1D',
  arg: {name: NAMES.T, start: 0, finish: 4, step: 0.01},
  initial: [2],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = 4 * Math.exp(0.8 * t) - 0.5 * y[0];
  },
  tolerance: 0.00001,
  solutionColNames: [NAMES.Y],
};

/** Non-stiff 1D test problem: exact solution (see [1], p. 736) */
const exactNonStiff1D = (t: number) => {
  return new Float64Array([
    (Math.exp(0.8 * t) - Math.exp(-0.5 * t)) * 4 / 1.3 + 2 * Math.exp(-0.5 * t),
  ]);
};

/** Non-stiff 2D test problem: equation */
const nonStiff2D = {
  name: 'non-stiff 2D',
  arg: {name: NAMES.T, start: 0, finish: 4, step: 0.01},
  initial: [1, 1],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = y[0] + y[1];
    output[1] = y[1] - y[0];
  },
  tolerance: 0.0000001,
  solutionColNames: [NAMES.X, NAMES.Y],
};

/** Non-stiff 2D test problem: exact solution */
const exactNonStiff2D = (t: number) => {
  return new Float64Array([
    Math.exp(t) * (Math.cos(t) + Math.sin(t)),
    Math.exp(t) * (Math.cos(t) - Math.sin(t)),
  ]);
};

/** Stiff 1D test problem: equation (see [1], p. 767) */
const stiff1D = {
  name: 'stiff 1D',
  arg: {name: NAMES.T, start: 0, finish: 4, step: 0.01},
  initial: [0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -1000 * y[0] + 3000 - 2000 * Math.exp(-t);
  },
  tolerance: 0.0000005,
  solutionColNames: [NAMES.Y],
};

/** Stiff 1D test problem: exact solution (see [1], p. 767) */
const exactStiff1D = (t: number) => {
  return new Float64Array([
    3 - 0.998 * Math.exp(-1000 * t) - 2.002 * Math.exp(-t),
  ]);
};

/** Stiff 2D test problem: equations (see [1], p. 770) */
const stiff2D = {
  name: 'stiff 2D',
  arg: {name: NAMES.T, start: 0, finish: 4, step: 0.01},
  initial: [52.29, 83.82],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -5 * y[0] + 3 * y[1];
    output[1] = 100 * y[0] - 301 * y[1];
  },
  tolerance: 0.0000005,
  solutionColNames: [NAMES.X, NAMES.Y],
};

/** Stiff 2D test problem: exact solution (see [1], p. 770) */
const exactStiff2D = (t: number) => {
  return new Float64Array([
    52.96 * Math.exp(-3.9899 * t) - 0.67 * Math.exp(-302.0101 * t),
    17.83 * Math.exp(-3.9899 * t) + 65.99 * Math.exp(-302.0101 * t),
  ]);
};

/** Stiff 3D test problem: equations */
const stiff3D = {
  name: 'stiff 3D',
  arg: {name: NAMES.T, start: 0, finish: 4, step: 0.01},
  initial: [2, 1, 0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -100 * y[0] + 100 * y[1] + y[2];
    output[1] = y[2];
    output[2] = -y[1];
  },
  tolerance: 0.00000001,
  solutionColNames: [NAMES.X, NAMES.Y, NAMES.Z],
};

/** Stiff 3D test problem: exact solution */
const exactStiff3D = (t: number) => {
  return new Float64Array([
    Math.exp(-100 * t) + Math.cos(t),
    Math.cos(t),
    -Math.sin(t),
  ]);
};

/** A set of problems for correctness testing */
export const correctnessProblems = [
  {odes: nonStiff1D, exact: exactNonStiff1D},
  {odes: nonStiff2D, exact: exactNonStiff2D},
  {odes: stiff1D, exact: exactStiff1D},
  {odes: stiff2D, exact: exactStiff2D},
  {odes: stiff3D, exact: exactStiff3D},
];

/** Return numerical solution error: maximum absolute deviation between approximate & exact solutions */
export function getError(method: (odes: ODEs) => DG.DataFrame, corProb: CorrectnessProblem): number {
  let error = 0;

  // Get numerical solution
  const approxSolution = method(corProb.odes);
  const exact = corProb.exact;
  const rows = approxSolution.rowCount;
  const cols = approxSolution.columns;
  const funcColsCount = cols.length - 1;
  const arg = cols.byIndex(0).getRawData();
  const funcsRaw = new Array<Float64Array>(funcColsCount);

  for (let i = 0; i < funcColsCount; ++i)
    funcsRaw[i] = cols.byIndex(i + 1).getRawData() as Float64Array;

  // Compute error
  for (let i = 0; i < rows; ++i) {
    const exactSolution = exact(arg[i]);

    for (let j = 0; j < funcColsCount; ++j) {
      error = Math.max(error, Math.abs(exactSolution[j] - funcsRaw[j][i]));
      if (Math.abs(exactSolution[j] - funcsRaw[j][i]) > 0.1) {
        console.log(arg[i]);
        console.log(exactSolution);
        console.log(funcsRaw[0][i], funcsRaw[0][i]);
      }
    }
  }

  return error;
}
