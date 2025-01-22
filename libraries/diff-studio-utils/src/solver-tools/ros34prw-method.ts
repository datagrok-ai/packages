/* The ROS34PRw method implementation

   References:
     [1] https://doi.org/10.1016/j.cam.2015.03.010 */

import {ODEs, max, abs, SAFETY, PSHRNK, PSGROW, REDUCE_COEF, GROW_COEF,
  ERR_CONTR, TINY, EPS, tDerivative, jacobian, ERROR_MSG} from './solver-defs';
import {Callback} from './callbacks/callback-base';
import {luDecomp, luSolve, solve1d2d} from './lin-alg-tools';

// The method specific constants (see Table 3 [1]):
const GAMMA = 0.435866521508459;

const GAMMA_21 = -1.3075995645253771;
const GAMMA_21_SCALED = GAMMA_21 / GAMMA;
const GAMMA_2 = GAMMA_21 + GAMMA;

const GAMMA_31 = -0.7098857586097217;
const GAMMA_31_SCALED = GAMMA_31 / GAMMA;
const GAMMA_32 = -0.55996735960277766;
const GAMMA_32_SCALED = GAMMA_32 / GAMMA;
const GAMMA_3 = GAMMA_31 + GAMMA_32 + GAMMA;

const GAMMA_41 = -0.15550856807552085;
const GAMMA_41_SCALED = GAMMA_41 / GAMMA;
const GAMMA_42 = -0.95388516575112225;
const GAMMA_42_SCALED = GAMMA_42 / GAMMA;
const GAMMA_43 = 0.67352721231818413;
const GAMMA_43_SCALED = GAMMA_43 / GAMMA;
const GAMMA_4 = GAMMA_41 + GAMMA_42 + GAMMA_43 + GAMMA;

const ALPHA_21 = 1.3075995645253771;
const ALPHA_2 = ALPHA_21;

const B_1 = 0.34449143192447917;
const B_2 = -0.45388516575112231;
const B_3 = 0.67352721231818413;
const B_4 = 0.435866521508459;

const B_HAT_1 = 0.5;
const B_HAT_2 = -0.25738812086522078;
const B_HAT_3 = 0.43542008724775044;
const B_HAT_4 = 0.32196803361747034;

const R_1 = B_1 - B_HAT_1;
const R_2 = B_2 - B_HAT_2;
const R_3 = B_3 - B_HAT_3;
const R_4 = B_4 - B_HAT_4;


/** Solve initial value problem using the ROS34PRw method [1]
 * @param odes initial value problem for ordinary differential equations
 * @param callback computations control callback
 * @returns solution of the problem
*/
export function ros34prw(odes: ODEs, callback?: Callback): Float64Array[] {
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
  let flag = true;
  let index = 1;
  let errmax = 0;
  let hTemp = 0;
  let tNew = 0;
  let hNext = 0.0;

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

  const k1 = new Float64Array(dim);
  const k2 = new Float64Array(dim);
  const k3 = new Float64Array(dim);
  const k4 = new Float64Array(dim);
  const HT = new Float64Array(dim);

  const f0Buf = new Float64Array(dim);
  const f1Buf = new Float64Array(dim);

  let hByGamma = 0;
  const fBuf = new Float64Array(dim);
  const kBuf = new Float64Array(dim);

  const L = new Float64Array(dimSquared);
  const U = new Float64Array(dimSquared);
  const luBuf = new Float64Array(dim);
  const bBuf = new Float64Array(dim);
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

    // call of adaptive step the ROS3Pw [1] method
    // computation of solution (y), time (t) and next step (hNext)
    while (true) {
      hByGamma = h * GAMMA;

      // one stage of the ROS3Pw method

      // 1) Jacobian & dF/dt matrices
      jacobian(t, y, f, EPS, f0Buf, f1Buf, W);
      tDerivative(t, y, f, EPS, f0Buf, f1Buf, HT);

      // 2) W & LU-decomposition
      for (let i = 0; i < dimSquared; ++i)
        W[i] = I[i] - hByGamma * W[i];

      if (toUseLU)
        luDecomp(W, L, U, dim);

      // 3) Scale dF/dt: HT = j * T
      for (let i = 0; i < dim; ++i)
        HT[i] *= h;

      // 4) F1 = F(t, y)  <-- Fbuf
      f(t, y, fBuf);

      // 5) k1 = W_inv * (F1 + gamma * HT)
      for (let i = 0; i < dim; ++i)
        bBuf[i] = fBuf[i] + GAMMA * HT[i];

      if (toUseLU)
        luSolve(L, U, bBuf, luBuf, k1, dim);
      else
        solve1d2d(W, bBuf, k1);

      // 6) F2 = F(t + alpha2 * h, y + alpha21 * k1)   <-- Fbuf
      for (let i = 0; i < dim; ++i)
        kBuf[i] = y[i] + ALPHA_21 * h * k1[i];

      f(t + ALPHA_2 * h, kBuf, fBuf);

      // 7) kBuf = gamma21 / gamma * k1
      for (let i = 0; i < dim; ++i)
        kBuf[i] = GAMMA_21_SCALED * k1[i];

      // 8) k2 = W_inv * [Fbuf + kBuf + gamma2 * HT] - kBuf
      for (let i = 0; i < dim; ++i)
        bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_2 * HT[i];

      if (toUseLU)
        luSolve(L, U, bBuf, luBuf, k2, dim);
      else
        solve1d2d(W, bBuf, k2);

      for (let i = 0; i < dim; ++i)
        k2[i] -= kBuf[i];

      // 9) F3 = F(t + alpha3 * h, y + h * (alpha31 * k1 + alpha32 * k2))  <-- Fbuf
      for (let i = 0; i < dim; ++i)
        kBuf[i] = y[i] + h * 0.5 * (k1[i] + k2[i]);

      f(t + h, kBuf, fBuf);

      // 10) kBuf = gamma31 / gamma * k1 + gamma32 / gamma * k2
      for (let i = 0; i < dim; ++i)
        kBuf[i] = GAMMA_31_SCALED * k1[i] + GAMMA_32_SCALED * k2[i];

      // 11) k3 = W_inv * (F3 + kBuf + gamma3 * HT) - kBuf
      for (let i = 0; i < dim; ++i)
        bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_3 * HT[i];

      if (toUseLU)
        luSolve(L, U, bBuf, luBuf, k3, dim);
      else
        solve1d2d(W, bBuf, k3);

      for (let i = 0; i < dim; ++i)
        k3[i] -= kBuf[i];

      // 12) F4 = F(t + alpha4 * h, y + h * (alpha41 * k1 + alpha42 * k2 + alpha43 * k3))  <-- Fbuf
      for (let i = 0; i < dim; ++i)
        kBuf[i] = y[i] + h * 0.5 * (k1[i] + k2[i]);

      f(t + h, kBuf, fBuf);

      // 13) kBuf = gamma41 / gamma * k1 + gamma42 / gamma * k2 + gamma43 / gamma * k3
      for (let i = 0; i < dim; ++i)
        kBuf[i] = GAMMA_41_SCALED * k1[i] + GAMMA_42_SCALED * k2[i] + GAMMA_43_SCALED * k3[i];

      // 14) k4 = W_inv * (F4 + kBuf + gamma4 * HT) - kBuf
      for (let i = 0; i < dim; ++i)
        bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_4 * HT[i];

      if (toUseLU)
        luSolve(L, U, bBuf, luBuf, k4, dim);
      else
        solve1d2d(W, bBuf, k4);

      for (let i = 0; i < dim; ++i)
        k4[i] -= kBuf[i];

      // 15) yNext = y + h * (b1 * k1 + b2 * k2 + b3 * k3  + b4 * k4)   <-- yTemp
      for (let i = 0; i < dim; ++i)
        yTemp[i] = y[i] + h * (B_1 * k1[i] + B_2 * k2[i] + B_3 * k3[i] + B_4 * k4[i]);

      // 16) yErr = h * (r1 * k1 + r2 * k2 + r3 * k3 + r4 * k4)
      for (let i = 0; i < dim; ++i)
        yErr[i] = h * (R_1 * k1[i] + R_2 * k2[i] + R_3 * k3[i] + R_4 * k4[i]);

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
          throw new Error(ERROR_MSG.ROS34PRW_FAILS);
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
} // ros34prw
