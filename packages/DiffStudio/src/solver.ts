// Solver of initial value problem

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ODEs, SolverOptions, mrt, ros3prw, ros34prw} from '@datagrok-libraries/diff-studio-tools';
import {getCallback} from './solver-tools/callbacks/callback-tools';
import {METHOD} from './ui-constants';

/** Return solution as a dataframe */
function getSolutionDF(odes: ODEs, solutionArrs: Float64Array[]): DG.DataFrame {
  const names = [odes.arg.name].concat(odes.solutionColNames);

  return DG.DataFrame.fromColumns(names.map((name, idx) => DG.Column.fromFloat64Array(name, solutionArrs[idx])));
}

/** Default solver of initial value problem. */
export function solveDefault(odes: ODEs): DG.DataFrame {
  return getSolutionDF(odes, ros34prw(odes));
};

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

  return getSolutionDF(odes, method(odes, callback));
}
