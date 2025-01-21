// Solver of initial value problem

import {ODEs, SolverOptions} from './solver-tools/solver-defs';
import {mrt} from './solver-tools/mrt-method';
import {ros3prw} from './solver-tools/ros3prw-method';
import {ros34prw} from './solver-tools/ros34prw-method';
import {getCallback} from './solver-tools/callbacks/callback-tools';
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
