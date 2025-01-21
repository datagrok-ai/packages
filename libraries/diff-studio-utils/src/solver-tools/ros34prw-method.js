"use strict";
/* The ROS34PRw method implementation

   References:
     [1] https://doi.org/10.1016/j.cam.2015.03.010 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ros34prw = void 0;
var solver_defs_1 = require("./solver-defs");
var lin_alg_tools_1 = require("./lin-alg-tools");
// The method specific constants (see Table 3 [1]):
var GAMMA = 0.435866521508459;
var GAMMA_21 = -1.3075995645253771;
var GAMMA_21_SCALED = GAMMA_21 / GAMMA;
var GAMMA_2 = GAMMA_21 + GAMMA;
var GAMMA_31 = -0.7098857586097217;
var GAMMA_31_SCALED = GAMMA_31 / GAMMA;
var GAMMA_32 = -0.55996735960277766;
var GAMMA_32_SCALED = GAMMA_32 / GAMMA;
var GAMMA_3 = GAMMA_31 + GAMMA_32 + GAMMA;
var GAMMA_41 = -0.15550856807552085;
var GAMMA_41_SCALED = GAMMA_41 / GAMMA;
var GAMMA_42 = -0.95388516575112225;
var GAMMA_42_SCALED = GAMMA_42 / GAMMA;
var GAMMA_43 = 0.67352721231818413;
var GAMMA_43_SCALED = GAMMA_43 / GAMMA;
var GAMMA_4 = GAMMA_41 + GAMMA_42 + GAMMA_43 + GAMMA;
var ALPHA_21 = 1.3075995645253771;
var ALPHA_2 = ALPHA_21;
/* REMARK. Expressions with ALPHAs are simplified */
/*const ALPHA_31 = 0.5;
const ALPHA_32 = 0.5;
const ALPHA_3 = ALPHA_31 + ALPHA_32;
const ALPHA_41 = 0.5;
const ALPHA_42 = 0.5;
const ALPHA_43 = 0;
const ALPHA_4 = ALPHA_41 + ALPHA_42;*/
var B_1 = 0.34449143192447917;
var B_2 = -0.45388516575112231;
var B_3 = 0.67352721231818413;
var B_4 = 0.435866521508459;
var B_HAT_1 = 0.5;
var B_HAT_2 = -0.25738812086522078;
var B_HAT_3 = 0.43542008724775044;
var B_HAT_4 = 0.32196803361747034;
var R_1 = B_1 - B_HAT_1;
var R_2 = B_2 - B_HAT_2;
var R_3 = B_3 - B_HAT_3;
var R_4 = B_4 - B_HAT_4;
/** Solve initial value problem using the ROS34PRw method [5]. */
function ros34prw(odes, callback) {
    /** right-hand side of the IVP solved */
    var f = odes.func;
    // operating variables
    var t0 = odes.arg.start;
    var t1 = odes.arg.finish;
    var h = odes.arg.step;
    var hDataframe = h;
    var tolerance = odes.tolerance;
    /** number of solution dataframe rows */
    var rowCount = Math.trunc((t1 - t0) / h) + 1;
    /** dimension of the problem */
    var dim = odes.initial.length;
    var dimSquared = dim * dim;
    /** independent variable values */
    var tArr = new Float64Array(rowCount);
    /** arrays of solution values */
    var yArrs = Array(dim);
    for (var i = 0; i < dim; ++i)
        yArrs[i] = new Float64Array(rowCount);
    // method routine
    var timeDataframe = t0 + hDataframe;
    var t = t0;
    var tPrev = t0;
    var flag = true;
    var index = 1;
    var errmax = 0;
    var hTemp = 0;
    var tNew = 0;
    var hNext = 0.0;
    // 0 BUFFERS & TEMP STRUCTURES
    /** identity matrix */
    var I = new Float64Array(dim * dim);
    // compute identity matrix
    for (var i = 0; i < dim; ++i) {
        for (var j = 0; j < dim; ++j)
            I[j + i * dim] = (i === j) ? 1 : 0;
    }
    var y = new Float64Array(odes.initial);
    var yPrev = new Float64Array(odes.initial);
    var dydt = new Float64Array(dim);
    var yScale = new Float64Array(dim);
    var yTemp = new Float64Array(dim);
    var yErr = new Float64Array(dim);
    var W = new Float64Array(dimSquared);
    var k1 = new Float64Array(dim);
    var k2 = new Float64Array(dim);
    var k3 = new Float64Array(dim);
    var k4 = new Float64Array(dim);
    var HT = new Float64Array(dim);
    var f0Buf = new Float64Array(dim);
    var f1Buf = new Float64Array(dim);
    var hByGamma = 0;
    var fBuf = new Float64Array(dim);
    var kBuf = new Float64Array(dim);
    var L = new Float64Array(dimSquared);
    var U = new Float64Array(dimSquared);
    var luBuf = new Float64Array(dim);
    var bBuf = new Float64Array(dim);
    var toUseLU = dim > 2;
    // 1. SOLUTION AT THE POINT t0
    tArr[0] = t0;
    for (var i = 0; i < dim; ++i)
        yArrs[i][0] = y[i];
    // 2. COMPUTE NUMERICAL SOLUTION FOR THE POINTS FROM THE INTERVAL (t0, t1)
    while (flag) {
        // compute derivative
        f(t, y, dydt);
        // check whether to go on computations
        if (callback)
            callback.onIterationStart();
        // compute scale vector
        for (var i = 0; i < dim; ++i)
            yScale[i] = (0, solver_defs_1.abs)(y[i]) + h * (0, solver_defs_1.abs)(dydt[i]) + solver_defs_1.TINY;
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
            (0, solver_defs_1.jacobian)(t, y, f, solver_defs_1.EPS, f0Buf, f1Buf, W);
            (0, solver_defs_1.tDerivative)(t, y, f, solver_defs_1.EPS, f0Buf, f1Buf, HT);
            // 2) W & LU-decomposition
            for (var i = 0; i < dimSquared; ++i)
                W[i] = I[i] - hByGamma * W[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luDecomp)(W, L, U, dim);
            // 3) Scale dF/dt: HT = j * T
            for (var i = 0; i < dim; ++i)
                HT[i] *= h;
            // 4) F1 = F(t, y)  <-- Fbuf
            f(t, y, fBuf);
            // 5) k1 = W_inv * (F1 + gamma * HT)
            for (var i = 0; i < dim; ++i)
                bBuf[i] = fBuf[i] + GAMMA * HT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, bBuf, luBuf, k1, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, bBuf, k1);
            // 6) F2 = F(t + alpha2 * h, y + alpha21 * k1)   <-- Fbuf
            for (var i = 0; i < dim; ++i)
                kBuf[i] = y[i] + ALPHA_21 * h * k1[i];
            f(t + ALPHA_2 * h, kBuf, fBuf);
            // 7) kBuf = gamma21 / gamma * k1
            for (var i = 0; i < dim; ++i)
                kBuf[i] = GAMMA_21_SCALED * k1[i];
            // 8) k2 = W_inv * [Fbuf + kBuf + gamma2 * HT] - kBuf
            for (var i = 0; i < dim; ++i)
                bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_2 * HT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, bBuf, luBuf, k2, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, bBuf, k2);
            for (var i = 0; i < dim; ++i)
                k2[i] -= kBuf[i];
            // 9) F3 = F(t + alpha3 * h, y + h * (alpha31 * k1 + alpha32 * k2))  <-- Fbuf
            for (var i = 0; i < dim; ++i)
                kBuf[i] = y[i] + h * 0.5 * (k1[i] + k2[i]);
            f(t + h, kBuf, fBuf);
            // 10) kBuf = gamma31 / gamma * k1 + gamma32 / gamma * k2
            for (var i = 0; i < dim; ++i)
                kBuf[i] = GAMMA_31_SCALED * k1[i] + GAMMA_32_SCALED * k2[i];
            // 11) k3 = W_inv * (F3 + kBuf + gamma3 * HT) - kBuf
            for (var i = 0; i < dim; ++i)
                bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_3 * HT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, bBuf, luBuf, k3, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, bBuf, k3);
            for (var i = 0; i < dim; ++i)
                k3[i] -= kBuf[i];
            // 12) F4 = F(t + alpha4 * h, y + h * (alpha41 * k1 + alpha42 * k2 + alpha43 * k3))  <-- Fbuf
            for (var i = 0; i < dim; ++i)
                kBuf[i] = y[i] + h * 0.5 * (k1[i] + k2[i]);
            f(t + h, kBuf, fBuf);
            // 13) kBuf = gamma41 / gamma * k1 + gamma42 / gamma * k2 + gamma43 / gamma * k3
            for (var i = 0; i < dim; ++i)
                kBuf[i] = GAMMA_41_SCALED * k1[i] + GAMMA_42_SCALED * k2[i] + GAMMA_43_SCALED * k3[i];
            // 14) k4 = W_inv * (F4 + kBuf + gamma4 * HT) - kBuf
            for (var i = 0; i < dim; ++i)
                bBuf[i] = fBuf[i] + kBuf[i] + GAMMA_4 * HT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, bBuf, luBuf, k4, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, bBuf, k4);
            for (var i = 0; i < dim; ++i)
                k4[i] -= kBuf[i];
            // 15) yNext = y + h * (b1 * k1 + b2 * k2 + b3 * k3  + b4 * k4)   <-- yTemp
            for (var i = 0; i < dim; ++i)
                yTemp[i] = y[i] + h * (B_1 * k1[i] + B_2 * k2[i] + B_3 * k3[i] + B_4 * k4[i]);
            // 16) yErr = h * (r1 * k1 + r2 * k2 + r3 * k3 + r4 * k4)
            for (var i = 0; i < dim; ++i)
                yErr[i] = h * (R_1 * k1[i] + R_2 * k2[i] + R_3 * k3[i] + R_4 * k4[i]);
            // estimating error
            errmax = 0;
            for (var i = 0; i < dim; ++i)
                errmax = (0, solver_defs_1.max)(errmax, (0, solver_defs_1.abs)(yErr[i] / yScale[i]));
            errmax /= tolerance;
            // processing the error obtained
            if (errmax > 1) {
                hTemp = solver_defs_1.SAFETY * h * Math.pow(errmax, solver_defs_1.PSHRNK);
                h = (0, solver_defs_1.max)(hTemp, solver_defs_1.REDUCE_COEF * h);
                tNew = t + h;
                if (tNew == t)
                    throw new Error(solver_defs_1.ERROR_MSG.ROS34PRW_FAILS);
            }
            else {
                if (errmax > solver_defs_1.ERR_CONTR)
                    hNext = solver_defs_1.SAFETY * h * Math.pow(errmax, solver_defs_1.PSGROW);
                else
                    hNext = solver_defs_1.GROW_COEF * h;
                t = t + h;
                for (var i = 0; i < dim; ++i)
                    y[i] = yTemp[i];
                break;
            }
        } // while (true)
        // compute lineraly interpolated results and store them in dataframe
        while (timeDataframe < t) {
            var cLeft = (t - timeDataframe) / (t - tPrev);
            var cRight = 1.0 - cLeft;
            tArr[index] = timeDataframe;
            for (var j = 0; j < dim; ++j)
                yArrs[j][index] = cRight * y[j] + cLeft * yPrev[j];
            timeDataframe += hDataframe;
            ++index;
        }
        h = hNext;
        tPrev = t;
        for (var i = 0; i < dim; ++i)
            yPrev[i] = y[i];
    } // while (flag)
    // perform final callback actions
    if (callback)
        callback.onComputationsCompleted();
    // 3. solution at the point t1
    tArr[rowCount - 1] = t1;
    for (var i = 0; i < dim; ++i)
        yArrs[i][rowCount - 1] = y[i];
    return [tArr].concat(yArrs);
} // ros34prw
exports.ros34prw = ros34prw;
