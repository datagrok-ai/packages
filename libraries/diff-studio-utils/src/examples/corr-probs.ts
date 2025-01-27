// Problems with known exact solution (for testing correctness)

import {ODEs} from '../solver-tools/solver-defs';

/** Non-stiff 1D test problem: equation (see [1], p. 736) */
const nonStiff1D: ODEs = {
  name: 'non-stiff 1D',
  arg: {name: 't', start: 0, finish: 4, step: 0.01},
  initial: [2],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = 4 * Math.exp(0.8 * t) - 0.5 * y[0];
  },
  tolerance: 0.00001,
  solutionColNames: ['y'],
};

/** Non-stiff 1D test problem: exact solution (see [1], p. 736) */
const exactNonStiff1D = (t: number) => {
  return new Float64Array([
    (Math.exp(0.8 * t) - Math.exp(-0.5 * t)) * 4 / 1.3 + 2 * Math.exp(-0.5 * t),
  ]);
};

/** Non-stiff 2D test problem: equation */
const nonStiff2D: ODEs = {
  name: 'non-stiff 2D',
  arg: {name: 't', start: 0, finish: 4, step: 0.01},
  initial: [1, 1],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = y[0] + y[1];
    output[1] = y[1] - y[0];
  },
  tolerance: 0.000000001,
  solutionColNames: ['x', 'y'],
};

/** Non-stiff 2D test problem: exact solution */
const exactNonStiff2D = (t: number) => {
  return new Float64Array([
    Math.exp(t) * (Math.cos(t) + Math.sin(t)),
    Math.exp(t) * (Math.cos(t) - Math.sin(t)),
  ]);
};

/** Non-stiff 3D test problem: equations */
const nonStiff3D: ODEs = {
  name: 'non-stiff 3D',
  arg: {name: 't', start: 0, finish: 2, step: 0.001},
  initial: [0.3, -0.8, 0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = 5 * y[0] + 2 * y[1] + Math.sin(t);
    output[1] = -4 * y[0] - y[1] + Math.exp(2 * t);
    output[2] = 5 * t**4 - 3 * t**2 + 2 * t;
  },
  tolerance: 0.00000001,
  solutionColNames: ['x', 'y', 'z'],
};

/** Non-stiff 3D test problem: exact solution */
const exactNonStiff3D = (t: number) => {
  const e1 = Math.exp(t);
  const e2 = Math.exp(2 * t);
  const e3 = Math.exp(3 * t);
  const c = Math.cos(t);
  const s = Math.sin(t);

  return new Float64Array([
    e1 + e3 + 0.1 * (3 * c - s) - 2 * e2,
    -2 * e1 - e3 - 0.2 * (2 * s + 4 * c) + 3 * e2,
    t**5 - t**3 + t**2,
  ]);
};

/** Stiff 1D test problem: equation (see [1], p. 767) */
const stiff1D: ODEs = {
  name: 'stiff 1D',
  arg: {name: 't', start: 0, finish: 4, step: 0.01},
  initial: [0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -1000 * y[0] + 3000 - 2000 * Math.exp(-t);
  },
  tolerance: 0.0000005,
  solutionColNames: ['y'],
};

/** Stiff 1D test problem: exact solution (see [1], p. 767) */
const exactStiff1D = (t: number) => {
  return new Float64Array([
    3 - 0.998 * Math.exp(-1000 * t) - 2.002 * Math.exp(-t),
  ]);
};

/** Stiff 2D test problem: equations (see [1], p. 770) */
const stiff2D: ODEs = {
  name: 'stiff 2D',
  arg: {name: 't', start: 0, finish: 4, step: 0.01},
  initial: [52.29, 83.82],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -5 * y[0] + 3 * y[1];
    output[1] = 100 * y[0] - 301 * y[1];
  },
  tolerance: 0.0000005,
  solutionColNames: ['x', 'y'],
};

/** Stiff 2D test problem: exact solution (see [1], p. 770) */
const exactStiff2D = (t: number) => {
  return new Float64Array([
    52.96 * Math.exp(-3.9899 * t) - 0.67 * Math.exp(-302.0101 * t),
    17.83 * Math.exp(-3.9899 * t) + 65.99 * Math.exp(-302.0101 * t),
  ]);
};

/** Stiff 3D test problem: equations */
const stiff3D: ODEs = {
  name: 'stiff 3D',
  arg: {name: 't', start: 0, finish: 4, step: 0.01},
  initial: [2, 1, 0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -100 * y[0] + 100 * y[1] + y[2];
    output[1] = y[2];
    output[2] = -y[1];
  },
  tolerance: 0.00000001,
  solutionColNames: ['x', 'y', 'z'],
};

/** Stiff 3D test problem: exact solution */
const exactStiff3D = (t: number) => {
  return new Float64Array([
    Math.exp(-100 * t) + Math.cos(t),
    Math.cos(t),
    -Math.sin(t),
  ]);
};

/** Correctness problem */
export type CorrProblem = {
    odes: ODEs,
    exact: (t: number) => Float64Array,
  };

/** Problems for testing correctness */
export const corrProbs = [
  {odes: nonStiff1D, exact: exactNonStiff1D},
  {odes: nonStiff2D, exact: exactNonStiff2D},
  {odes: nonStiff3D, exact: exactNonStiff3D},
  {odes: stiff1D, exact: exactStiff1D},
  {odes: stiff2D, exact: exactStiff2D},
  {odes: stiff3D, exact: exactStiff3D},
];
