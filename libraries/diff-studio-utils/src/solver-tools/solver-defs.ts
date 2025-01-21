// Solver definitions

/** Right-hand side of IVP */
type Func = (t: number, y: Float64Array, output: Float64Array) => void;

/** Solver optional settings */
export type SolverOptions = {
  maxIterations: number,
  maxTimeMs: number,
  method: string,
};

/** Initial Value Problem (IVP) type */
export type ODEs = {
  name: string,
  arg: {
    name: string,
    start: number,
    finish: number,
    step: number
  },
  initial: number[] | Float32Array | Float64Array | Int32Array,
  func: Func,
  tolerance: number,
  solutionColNames: string[],
};

/** The abs function */
export const abs = (x: number) => (x > 0) ? x : -x;

/** The max function */
export const max = (x: number, y: number) => (x > y) ? x : y;

/** The max function */
export const min = (x: number, y: number) => (x < y) ? x : y;

/** Routine constants of adaptive step method */
export const SAFETY = 0.9;
export const PSHRNK = -0.25;
export const PSGROW = -0.2;
export const REDUCE_COEF = 0.25;
export const GROW_COEF = 4.0;
export const ERR_CONTR = 1.89e-4;

/** Misc */
export const TINY = 1e-20;
export const EPS = 1.0e-10;

/** Returns derivative with respect to t. */
export function tDerivative(t: number, y: Float64Array, f: Func, eps: number,
  f0Buf: Float64Array, f1Buf: Float64Array, output: Float64Array): void {
  const size = y.length;
  f(t, y, f0Buf);
  f(t + eps, y, f1Buf);

  for (let i = 0; i < size; ++i)
    output[i] = (f1Buf[i] - f0Buf[i]) / eps;
}

/** Returns Jacobian. */
export function jacobian(t: number, y: Float64Array, f: Func, eps: number,
  f0Buf: Float64Array, f1Buf: Float64Array, output: Float64Array): void {
  const size = y.length;
  f(t, y, f0Buf);

  for (let j = 0; j < size; ++j) {
    y[j] += eps;
    f(t, y, f1Buf);

    for (let i = 0; i < size; ++i)
      output[j + i * size] = (f1Buf[i] - f0Buf[i]) / eps;

    y[j] -= eps;
  }
}

/** Error messeges */
export enum ERROR_MSG {
  MRT_FAILS = 'The modified Rosenbrock triple method fails',
  ROS3PRW_FAILS = 'The ROS3PRw method fails',
  ROS34PRW_FAILS = 'The ROS34PRw method fails',
};

/** Callback action */
export class CallbackAction extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

/** Default options of the solver */
export enum DEFAULT_OPTIONS {
  SCRIPTING = '{maxIterations: 1}',
  NO_CHECKS = '{ }',
}
