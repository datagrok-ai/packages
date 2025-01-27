/** The OREGO model (see https://archimede.uniba.it/~testset/report/orego.pdf) */
export const orego = {
  name: 'OREGO',
  arg: {name: 't', start: 0, finish: 360, step: 0.01},
  initial: [1, 2, 3],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    // extract function values
    const y1 = y[0];
    const y2 = y[1];
    const y3 = y[2];

    // compute output
    output[0] = 77.27 * (y2 - y1 * y2 + y1 - 0.000008375 * y1 * y1 );
    output[1] = 1 / 77.27 * (-y2 - y1 * y2 + y3);
    output[2] = 0.161 * (y1 - y3);
  },
  tolerance: 1e-8,
  solutionColNames: ['y1', 'y2', 'y3'],
};
