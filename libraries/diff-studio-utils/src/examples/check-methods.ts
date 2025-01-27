// A script for checking performance

import {ODEs, corrProbs, CorrProblem, mrt, ros3prw, ros34prw, perfProbs} from '../../index';

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

const methods = new Map([
  ['MRT', mrt],
  ['ROS3PRw', ros3prw],
  ['ROS34PRw', ros34prw],
]);

console.log('Performance:\n');

methods.forEach((method, name) => {
  console.log('  ', name);

  perfProbs.forEach((odes) => {
    const start = Date.now();
    method(odes);
    const finish = Date.now();
    console.log(`     ${odes.name}: ${finish - start} ms.`);
  });

  console.log();
});

console.log('Correctness (maximum absolute deviation):\n');

methods.forEach((method, name) => {
  console.log('  ', name);

  corrProbs.forEach((problem) => {
    const error = getError(method, problem);
    console.log(`     ${problem.odes.name}: ${error}`);
  });

  console.log();
});
