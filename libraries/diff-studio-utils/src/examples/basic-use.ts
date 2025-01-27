/** Example. Solve the following initial value problem

      dx / dt = x + y - t
      dy / dt = x * y + t
      x(0) = 1
      y(0) = -1

    on [0, 2] with the step 0.01.
 */

import {ODEs, mrt} from '../../index';

// Declare the problem
const task: ODEs = {
  name: 'Example', // name of your model
  arg: {
    name: 't', // name of the argument
    start: 0, // initial value of the argument
    finish: 2, // final value of the argument
    step: 0.01, // solution grid step
  },
  initial: [1, -1], // initial values
  func: (t: number, y: Float64Array, output: Float64Array) => { // right-hand side of the system
    output[0] = y[0] + y[1] - t; // 1-st equation
    output[1] = y[0] * y[1] + t; // 2-nd equation
  },
  tolerance: 1e-7, // tolerance
  solutionColNames: ['x', 'y'], // names of solution functions
};

try {
  // Solve the problem
  const solution = mrt(task);

  // Output results
  console.log(task.arg.name, '    ', task.solutionColNames[0], '  ', task.solutionColNames[1]);

  const length = solution[0].length;

  for (let i = 0; i < length; ++i)
    console.log(solution[0][i], '    ', solution[1][i], '  ', solution[2][i]);
} catch (err) {
  console.log('Solver failed: ', err instanceof Error ? err.message : 'Unknown problem!');
}
