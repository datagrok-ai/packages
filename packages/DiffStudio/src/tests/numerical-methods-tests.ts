// Tests of numerical methods
import {_package} from '../package-test';
import {category, expect, test} from '@datagrok-libraries/utils/src/test';
import {mrt, ros3prw, ros34prw, CorrProblem, ODEs, corrProbs, perfProbs} from '@datagrok/diff-studio-tools';

/** Return numerical solution error: maximum absolute deviation between approximate & exact solutions */
function getError(method: (odes: ODEs) => Float64Array[], corProb: CorrProblem): number {
  let error = 0;

  // Get numerical solution
  const approxSolution = method(corProb.odes);

  const exact = corProb.exact;

  const arg = approxSolution[0];

  const pointsCount = arg.length;
  const funcsCount = approxSolution.length - 1;

  // Compute error
  for (let i = 0; i < pointsCount; ++i) {
    const exactSolution = exact(arg[i]);

    for (let j = 0; j < funcsCount; ++j)
      error = Math.max(error, Math.abs(exactSolution[j] - approxSolution[j + 1][i]));
  }

  return error;
}

const TIMEOUT = 4000;
const TINY = 0.1;
const MIN_ROWS = 1000;

const methods = new Map([
  ['MRT', mrt],
  ['ROS3PRw', ros3prw],
  ['ROS34PRw', ros34prw],
]);

// Correctness tests
category('Correctness', () => {
  methods.forEach((method, name) => {
    corrProbs.forEach((problem) => test(`Method: ${name}, problem: ${problem.odes.name}`, async () => {
      const error = getError(method, problem);
      console.log(`Method: ${name}, problem: ${problem.odes.name}, ERROR: ${error}`);
      expect(
        error < TINY,
        true,
        `The ${name} method failed to solve "${problem.odes.name}", too big error: ${error}; expected: < ${TINY}`,
      );
    }, {timeout: TIMEOUT}));
  });
}); // Correctness

// Performance tests
category('Performance', () => {
  methods.forEach((method, methodName) => {
    perfProbs.forEach((odes) => {
      test(`Method: ${methodName}, problem: ${odes.name}`, async () => {
        const rows = method(odes)[0].length;
        expect(
          rows > MIN_ROWS,
          true,
          `The ${name} method failed, solution DF rows: ${rows}`,
        );
      }, {benchmark: true});
    });
  });
}); // Performance
