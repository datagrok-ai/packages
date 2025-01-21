"use strict";
// LU-decomposition tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.solve1d2d = exports.luSolve = exports.luDecomp = void 0;
/** Compute LU-decomposition of matrix */
function luDecomp(A, L, U, n) {
    L.fill(0);
    U.fill(0);
    for (var i_1 = 0; i_1 < n; ++i_1)
        L[i_1 * n + i_1] = 1;
    var sumU = 0;
    var sumL = 0;
    var k = 0;
    var j = 0;
    var p = 0;
    var i = 0;
    for (k = 0; k < n; ++k) {
        for (j = k; j < n; ++j) {
            sumU = 0;
            for (p = 0; p < k; ++p)
                sumU += L[k * n + p] * U[p * n + j];
            U[k * n + j] = A[k * n + j] - sumU;
        }
        for (i = k + 1; i < n; ++i) {
            sumL = 0;
            for (p = 0; p < k; ++p)
                sumL += L[i * n + p] * U[p * n + k];
            L[i * n + k] = (A[i * n + k] - sumL) / U[k * n + k];
        }
    }
} // luDecomp
exports.luDecomp = luDecomp;
/** Solve the system Ax = b using pre-computed LU-decomposition */
function luSolve(L, U, b, y, x, n) {
    var sumLy = 0;
    for (var i = 0; i < n; ++i) {
        sumLy = 0;
        for (var j = 0; j < i; ++j)
            sumLy += L[i * n + j] * y[j];
        y[i] = (b[i] - sumLy) / L[i * n + i];
    }
    var sumUx = 0;
    for (var i = n - 1; i > -1; --i) {
        sumUx = 0;
        for (var j = i + 1; j < n; ++j)
            sumUx += U[i * n + j] * x[j];
        x[i] = (y[i] - sumUx) / U[i * n + i];
    }
} // luSolve
exports.luSolve = luSolve;
/** Solve Ax = b for 1D & 2D cases */
function solve1d2d(A, b, x) {
    if (x.length === 1) {
        x[0] = b[0] / A[0];
        return;
    }
    var delta = A[0] * A[3] - A[1] * A[2];
    x[0] = (b[0] * A[3] - b[1] * A[1]) / delta;
    x[1] = (A[0] * b[1] - A[2] * b[0]) / delta;
}
exports.solve1d2d = solve1d2d;
