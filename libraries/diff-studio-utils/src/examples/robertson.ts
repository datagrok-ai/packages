/** Robertson chemical reaction, updated version (see https://archimede.uniba.it/~testset/problems/rober.php) */
export const robertson = {
  name: 'Robertson',
  arg: {name: 't', start: 0, finish: 10e11, step: 2.5e7},
  initial: [1, 0, 0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = -0.04 * y[0] + 1e4 * y[1] * y[2];
    output[1] = 0.04 * y[0] - 1e4 * y[1] * y[2] - 3e7 * y[1]**2;
    output[2] = 3e7 * y[1]**2;
  },
  tolerance: 1e-7,
  solutionColNames: ['A', 'B', 'C'],
};
