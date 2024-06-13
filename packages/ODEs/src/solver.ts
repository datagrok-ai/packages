// Solver of initial value problem

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ODEs, SolverOptions} from './solver-tools/solver-defs';
import {mrt} from './solver-tools/mrt-method';
import {ros3prw} from './solver-tools/ros3prw-method';
import {ros34prw} from './solver-tools/ros34prw-method';
import {getCallback} from './solver-tools/callbacks/callback-tools';
import {error} from './utils';
import {METHOD} from './ui-constants';

/** Default solver of initial value problem. */
export const solveDefault = (odes: ODEs): DG.DataFrame => ros34prw(odes);

/** Return method specified by options */
const getMethod = (options?: Partial<SolverOptions>) => {
  if (options === undefined)
    return ros34prw;

  switch (options.method) {
  case METHOD.MRT:
    return mrt;

  case METHOD.ROS3PRw:
    return ros3prw;

  case METHOD.ROS34PRw:
    return ros34prw;

  default:
    return ros34prw;
  }
};

/** Customizable solver of initial value problem. */
export function solveIVP(odes: ODEs, options?: Partial<SolverOptions>): DG.DataFrame {
  const callback = getCallback(options);
  const method = getMethod(options);

  return method(odes, callback);
}

/** Solve initial value problem and check performance of the Rosenbrok methods: MRT, ROS3PRw & ROS34PRw.

    REMARK. The methods MRT & ROS3PRw may require much time for stiff problems. */
export function checkPerformance(odes: ODEs): DG.DataFrame {
  let start = 0;
  let sum = 0;
  const runsCount = 10;

  console.log(odes.name);

  const dfMrt = mrt(odes);
  const dfRos3prw = ros3prw(odes);
  const dfRos34prw = ros34prw(odes);

  console.log('Deviation:');
  const d1 = error(dfMrt, dfRos3prw);
  const d2 = error(dfMrt, dfRos34prw);
  const d3 = error(dfRos3prw, dfRos34prw);

  console.log(`  MRT vs ROS3PRw: ${d1}`);
  console.log(`  MRT vs ROS34PRw: ${d2}`);
  console.log(`  ROS3PRw vs ROS34PRw: ${d3}`);
  console.log(`  MAX: ${Math.max(d1, d2, d3)}`);

  console.log('TIME');

  for (let i = 0; i < runsCount; ++i) {
    start = performance.now();
    mrt(odes);
    sum += performance.now() - start;
  }
  console.log(`  MRT: ${sum / runsCount} ms.`);

  sum = 0;
  for (let i = 0; i < runsCount; ++i) {
    start = performance.now();
    ros3prw(odes);
    sum += performance.now() - start;
  }
  console.log(`  ROS3PRw: ${sum / runsCount} ms.`);

  sum = 0;
  for (let i = 0; i < runsCount; ++i) {
    start = performance.now();
    ros34prw(odes);
    sum += performance.now() - start;
  }
  console.log(`  ROS34PRw: ${sum / runsCount} ms.`);

  console.log('==============================================================================');

  return dfRos34prw;
};
