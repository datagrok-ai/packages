 /** Kintetic constants for the E5 model */
 enum E5 {
    K1 = 7.89e-10,
    K2 = 1.13e9,
    K3 = 1.1e7,
    K4 = 1.13e3,
  };

/** The E5 model (chemical pyrolysis: https://archimede.uniba.it/~testset/report/e5.pdf) */
export const e5 = {
  name: 'E5',
  arg: {name: 't', start: 0, finish: 1e13, step: 2.5e8},
  initial: [0.00176, 0, 0, 0],
  func: (t: number, y: Float64Array, output: Float64Array) => {
    // extract function values
    const y1 = y[0];
    const y2 = y[1];
    const y3 = y[2];
    const y4 = y[3];

    // compute output
    output[0] = -E5.K1 * y1 - E5.K3 * y1 * y3;
    output[1] = E5.K1 * y1 - E5.K2 * y2 * y3;
    output[2] = E5.K1 * y1 - E5.K2 * y2 * y3 - E5.K3 * y1 * y3 + E5.K4 * y4;
    output[3] = E5.K3 * y1 * y3 - E5.K4 * y4;
  },
  tolerance: 1e-6,
  solutionColNames: ['y1', 'y2', 'y3', 'y4'],
};
