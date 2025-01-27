/** Van der Pol oscillator (see https://archimede.uniba.it/~testset/problems/vdpol.php) */
export const vdpol = {
  name: 'van der Pol',
  arg: {name: 't', start: 0, finish: 2000, step: 0.1},
  initial: [-1, 1],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    output[0] = y[1];
    output[1] = -y[0] + 1000 * (1 - y[0] * y[0]) * y[1];
  },
  tolerance: 1e-12,
  solutionColNames: ['x1', 'x2'],
};
