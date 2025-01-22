/* The modified Rosenbrock triple method (MTR).

   References:
   [1] https://doi.org/10.1137/S1064827594276424
   [2] https://doi.org/10.1016/S0898-1221(00)00175-9
*/

import {ODEs, max, abs, SAFETY, PSHRNK, PSGROW, REDUCE_COEF, GROW_COEF,
  ERR_CONTR, TINY, EPS, tDerivative, jacobian, ERROR_MSG} from './solver-defs';
import {Callback} from './callbacks/callback-base';
import {luDecomp, luSolve, solve1d2d} from './lin-alg-tools';

// Quantities used in Rosenbrock method (see [1], [2] for more details)
const D = 1.0 - Math.sqrt(2.0) / 2.0;
const E32 = 6.0 + Math.sqrt(2.0);

/** Solve initial value problem the modified Rosenbrock triple (MRT) method [1, 2]
 * @param odes initial value problem for ordinary differential equations
 * @param callback computations control callback
 * @returns solution of the problem
*/
export function mrt(odes: ODEs, callback?: Callback): Float64Array[] {
  /** right-hand side of the IVP solved */
  const f = odes.func;

  // operating variables
  const t0 = odes.arg.start;
  const t1 = odes.arg.finish;
  let h = odes.arg.step;
  const hDataframe = h;
  const tolerance = odes.tolerance;

  /** number of solution dataframe rows */
  const rowCount = Math.trunc((t1 - t0) / h) + 1;

  /** dimension of the problem */
  const dim = odes.initial.length;
  const dimSquared = dim * dim;

  /** independent variable values */
  const tArr = new Float64Array(rowCount);

  /** arrays of solution values */
  const yArrs = Array<Float64Array>(dim);

  for (let i = 0; i < dim; ++i)
    yArrs[i] = new Float64Array(rowCount);

  // method routine
  let timeDataframe = t0 + hDataframe;
  let t = t0;
  let tPrev = t0;
  let hNext = 0.0;
  let flag = true;
  let index = 1;
  let errmax = 0;
  let hTemp = 0;
  let tNew = 0;

  // 0 BUFFERS & TEMP STRUCTURES

  /** identity matrix */
  const I = new Float64Array(dim * dim);

  // compute identity matrix
  for (let i = 0; i < dim; ++i) {
    for (let j = 0; j < dim; ++j)
      I[j + i * dim] = (i === j) ? 1 : 0;
  }

  const y = new Float64Array(odes.initial);
  const yPrev = new Float64Array(odes.initial);
  const dydt = new Float64Array(dim);
  const yScale = new Float64Array(dim);
  const yTemp = new Float64Array(dim);
  const yErr = new Float64Array(dim);

  const W = new Float64Array(dimSquared);

  const f0 = new Float64Array(dim);
  const k1 = new Float64Array(dim);
  const f1 = new Float64Array(dim);
  const k2 = new Float64Array(dim);
  const f2 = new Float64Array(dim);
  const k3 = new Float64Array(dim);
  const yDer = new Float64Array(dim);
  const hdT = new Float64Array(dim);

  const f0Buf = new Float64Array(dim);
  const f1Buf = new Float64Array(dim);
  let hd = 0;
  let hDivNum = 0;

  const L = new Float64Array(dimSquared);
  const U = new Float64Array(dimSquared);
  const luBuf = new Float64Array(dim);
  const toUseLU = dim > 2;

  // 1. SOLUTION AT THE POINT t0
  tArr[0] = t0;
  for (let i = 0; i < dim; ++i)
    yArrs[i][0] = y[i];

  // 2. COMPUTE NUMERICAL SOLUTION FOR THE POINTS FROM THE INTERVAL (t0, t1)
  while (flag) {
    // compute derivative
    f(t, y, dydt);

    // check whether to go on computations
    if (callback)
      callback.onIterationStart();

    // compute scale vector
    for (let i = 0; i < dim; ++i)
      yScale[i] = abs(y[i]) + h * abs(dydt[i]) + TINY;

    // check end point
    if (t + h > t1) {
      h = t1 - t;
      flag = false;
    }

    // call of adaptive step modified Rosenbrok triple method
    // computation of solution (y), time (t) and next step (hNext)
    while (true) {
      // one stage of the modified Rosenbrok triple approach
      // hdT = h * d * T(t, y, EPS);
      tDerivative(t, y, f, EPS, f0Buf, f1Buf, hdT);
      hd = h * D;
      for (let i = 0; i < dim; ++i)
        hdT[i] *= hd;

      // The main computations

      // f0 = f(t, y);
      f(t, y, f0);

      // W = I - h * d * J(t, y, EPS);
      jacobian(t, y, f, EPS, f0Buf, f1Buf, W);
      for (let i = 0; i < dimSquared; ++i)
        W[i] = I[i] - hd * W[i];

      // compute LU-decomposition
      if (toUseLU)
        luDecomp(W, L, U, dim);

      // compute k1: solve the system W * k1 = f0 + hdT
      for (let i = 0; i < dim; ++i)
        f0Buf[i] = f0[i] + hdT[i];

      if (toUseLU)
        luSolve(L, U, f0Buf, luBuf, k1, dim);
      else
        solve1d2d(W, f0Buf, k1);

      hDivNum = 0.5 * h;

      // yDer = y + 0.5 * h * k1;
      for (let i = 0; i < dim; ++i)
        yDer[i] = y[i] + hDivNum * k1[i];

      // f1 = f(t + 0.5 * h, yDer);
      f(t + hDivNum, yDer, f1);

      // compute k2: solve the system W * (k2 - k1) = f1 - k1
      for (let i = 0; i < dim; ++i)
        f1Buf[i] = f1[i] - k1[i];

      if (toUseLU)
        luSolve(L, U, f1Buf, luBuf, k2, dim);
      else
        solve1d2d(W, f1Buf, k2);

      for (let i = 0; i < dim; ++i)
        k2[i] = k2[i] + k1[i];

      // yOut = y + k2 * h; <--> yTemp
      for (let i = 0; i < dim; ++i)
        yTemp[i] = y[i] + h * k2[i];

      // f2 = f(t + h, yOut);
      f(t + h, yTemp, f2);

      // compute k3: solve the system W * k3 = f2 - e32 * (k2 - f1) - 2.0 * (k1 - f0) + hdT
      for (let i = 0; i < dim; ++i)
        f1Buf[i] = f2[i] - E32 * (k2[i] - f1[i]) - 2.0 * (k1[i] - f0[i]) + hdT[i];

      if (toUseLU)
        luSolve(L, U, f1Buf, luBuf, k3, dim);
      else
        solve1d2d(W, f1Buf, k3);

      // yErr = (k1 - 2.0 * k2 + k3) * h / 6;
      hDivNum = h / 6;

      for (let i = 0; i < dim; ++i)
        yErr[i] = (k1[i] - 2.0 * k2[i] + k3[i]) * hDivNum;

      // estimating error
      errmax = 0;
      for (let i = 0; i < dim; ++i)
        errmax = max(errmax, abs(yErr[i] / yScale[i]));
      errmax /= tolerance;

      // processing the error obtained
      if (errmax > 1) {
        hTemp = SAFETY * h * errmax**PSHRNK;
        h = max(hTemp, REDUCE_COEF * h);
        tNew = t + h;
        if (tNew == t)
          throw new Error(ERROR_MSG.MRT_FAILS);
      } else {
        if (errmax > ERR_CONTR)
          hNext = SAFETY * h * errmax**PSGROW;
        else
          hNext = GROW_COEF * h;
        t = t + h;

        for (let i = 0; i < dim; ++i)
          y[i] = yTemp[i];

        break;
      }
    } // while (true)

    // compute lineraly interpolated results and store them in dataframe
    while (timeDataframe < t) {
      const cLeft = (t - timeDataframe) / (t - tPrev);
      const cRight = 1.0 - cLeft;

      tArr[index] = timeDataframe;

      for (let j = 0; j < dim; ++j)
        yArrs[j][index] = cRight * y[j] + cLeft * yPrev[j];

      timeDataframe += hDataframe;
      ++index;
    }

    h = hNext;
    tPrev = t;

    for (let i = 0; i < dim; ++i)
      yPrev[i] = y[i];
  } // while (flag)

  // perform final callback actions
  if (callback)
    callback.onComputationsCompleted();

  // 3. solution at the point t1
  tArr[rowCount - 1] = t1;

  for (let i = 0; i < dim; ++i)
    yArrs[i][rowCount - 1] = y[i];

  return [tArr].concat(yArrs);
} // MTR
