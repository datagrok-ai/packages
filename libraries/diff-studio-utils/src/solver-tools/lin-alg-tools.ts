// LU-decomposition tools

/** Compute LU-decomposition of matrix */
export function luDecomp(A: Float64Array, L: Float64Array, U: Float64Array, n: number) {
  L.fill(0);
  U.fill(0);

  for (let i = 0; i < n; ++i)
    L[i * n + i] = 1;

  let sumU = 0;
  let sumL = 0;
  let k = 0;
  let j = 0;
  let p = 0;
  let i =0;

  for (k = 0; k < n; ++k) {
    for (j = k; j < n; ++j) {
      sumU = 0;

      for (p = 0; p < k; ++p)
        sumU += L[k * n + p] * U[p * n + j];

      U[k * n + j] = A[k * n +j] - sumU;
    }

    for (i = k + 1; i < n; ++i) {
      sumL = 0;

      for (p = 0; p < k; ++p)
        sumL += L[i * n + p] * U[p * n + k];

      L[i * n + k] = (A[i * n + k] - sumL) / U[k * n + k];
    }
  }
} // luDecomp

/** Solve the system Ax = b using pre-computed LU-decomposition */
export function luSolve(L: Float64Array, U: Float64Array, b: Float64Array, y: Float64Array,
  x: Float64Array, n: number) {
  let sumLy = 0;

  for (let i = 0; i < n; ++i) {
    sumLy = 0;

    for (let j = 0; j < i; ++j)
      sumLy += L[i * n + j] * y[j];

    y[i] = (b[i] - sumLy) / L[i * n + i];
  }

  let sumUx = 0;

  for (let i = n - 1; i > -1; --i) {
    sumUx = 0;

    for (let j = i + 1; j < n; ++j)
      sumUx += U[i * n + j] * x[j];

    x[i] = (y[i] - sumUx) / U[i * n + i];
  }
} // luSolve

/** Solve Ax = b for 1D & 2D cases */
export function solve1d2d(A: Float64Array, b: Float64Array, x: Float64Array) {
  if (x.length === 1) {
    x[0] = b[0] / A[0];
    return;
  }

  const delta = A[0] * A[3] - A[1] * A[2];
  x[0] = (b[0] * A[3] - b[1] * A[1]) / delta;
  x[1] = (A[0] * b[1] - A[2] * b[0]) / delta;
}
