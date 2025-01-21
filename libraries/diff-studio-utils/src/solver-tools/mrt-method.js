"use strict";
/* The modified Rosenbrock triple method (MTR).

   References:
   [1] https://doi.org/10.1137/S1064827594276424
   [2] https://doi.org/10.1016/S0898-1221(00)00175-9
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mrt = void 0;
var solver_defs_1 = require("./solver-defs");
var lin_alg_tools_1 = require("./lin-alg-tools");
// Quantities used in Rosenbrock method (see [1], [2] for more details)
var D = 1.0 - Math.sqrt(2.0) / 2.0;
var E32 = 6.0 + Math.sqrt(2.0);
/** Solve initial value problem the modified Rosenbrock triple (MRT) method [1, 2] */
function mrt(odes, callback) {
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
    var hNext = 0.0;
    var flag = true;
    var index = 1;
    var errmax = 0;
    var hTemp = 0;
    var tNew = 0;
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
    var f0 = new Float64Array(dim);
    var k1 = new Float64Array(dim);
    var f1 = new Float64Array(dim);
    var k2 = new Float64Array(dim);
    var f2 = new Float64Array(dim);
    var k3 = new Float64Array(dim);
    var yDer = new Float64Array(dim);
    var hdT = new Float64Array(dim);
    var f0Buf = new Float64Array(dim);
    var f1Buf = new Float64Array(dim);
    var hd = 0;
    var hDivNum = 0;
    var L = new Float64Array(dimSquared);
    var U = new Float64Array(dimSquared);
    var luBuf = new Float64Array(dim);
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
        // call of adaptive step modified Rosenbrok triple method
        // computation of solution (y), time (t) and next step (hNext)
        while (true) {
            // one stage of the modified Rosenbrok triple approach
            // hdT = h * d * T(t, y, EPS);
            (0, solver_defs_1.tDerivative)(t, y, f, solver_defs_1.EPS, f0Buf, f1Buf, hdT);
            hd = h * D;
            for (var i = 0; i < dim; ++i)
                hdT[i] *= hd;
            // The main computations
            // f0 = f(t, y);
            f(t, y, f0);
            // W = I - h * d * J(t, y, EPS);
            (0, solver_defs_1.jacobian)(t, y, f, solver_defs_1.EPS, f0Buf, f1Buf, W);
            for (var i = 0; i < dimSquared; ++i)
                W[i] = I[i] - hd * W[i];
            // compute LU-decomposition
            if (toUseLU)
                (0, lin_alg_tools_1.luDecomp)(W, L, U, dim);
            // compute k1: solve the system W * k1 = f0 + hdT
            for (var i = 0; i < dim; ++i)
                f0Buf[i] = f0[i] + hdT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, f0Buf, luBuf, k1, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, f0Buf, k1);
            hDivNum = 0.5 * h;
            // yDer = y + 0.5 * h * k1;
            for (var i = 0; i < dim; ++i)
                yDer[i] = y[i] + hDivNum * k1[i];
            // f1 = f(t + 0.5 * h, yDer);
            f(t + hDivNum, yDer, f1);
            // compute k2: solve the system W * (k2 - k1) = f1 - k1
            for (var i = 0; i < dim; ++i)
                f1Buf[i] = f1[i] - k1[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, f1Buf, luBuf, k2, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, f1Buf, k2);
            for (var i = 0; i < dim; ++i)
                k2[i] = k2[i] + k1[i];
            // yOut = y + k2 * h; <--> yTemp
            for (var i = 0; i < dim; ++i)
                yTemp[i] = y[i] + h * k2[i];
            // f2 = f(t + h, yOut);
            f(t + h, yTemp, f2);
            // compute k3: solve the system W * k3 = f2 - e32 * (k2 - f1) - 2.0 * (k1 - f0) + hdT
            for (var i = 0; i < dim; ++i)
                f1Buf[i] = f2[i] - E32 * (k2[i] - f1[i]) - 2.0 * (k1[i] - f0[i]) + hdT[i];
            if (toUseLU)
                (0, lin_alg_tools_1.luSolve)(L, U, f1Buf, luBuf, k3, dim);
            else
                (0, lin_alg_tools_1.solve1d2d)(W, f1Buf, k3);
            // yErr = (k1 - 2.0 * k2 + k3) * h / 6;
            hDivNum = h / 6;
            for (var i = 0; i < dim; ++i)
                yErr[i] = (k1[i] - 2.0 * k2[i] + k3[i]) * hDivNum;
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
                    throw new Error(solver_defs_1.ERROR_MSG.MRT_FAILS);
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
} // MTR
exports.mrt = mrt;
