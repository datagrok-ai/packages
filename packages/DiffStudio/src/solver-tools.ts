// Solver of initial value problem

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ODEs, SolverOptions, mrt, ros3prw, ros34prw} from '@datagrok/diff-studio-tools';
import {getCallback} from './callbacks/callback-tools';
import {METHOD} from './ui-constants';

// Solver definitions

/** Error messages */
export enum ERROR_MSG {
  MRT_FAILS = 'The modified Rosenbrock triple method fails',
  ROS3PRW_FAILS = 'The ROS3PRw method fails',
  ROS34PRW_FAILS = 'The ROS34PRw method fails',
};

/** Callback action */
export class CallbackAction extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

/** Default options of the solver */
export enum DEFAULT_OPTIONS {
  SCRIPTING = '{maxIterations: 1}',
  NO_CHECKS = '{ }',
}

/** Return solution as a dataframe */
function getSolutionDF(odes: ODEs, solutionArrs: Float64Array[]): DG.DataFrame {
  const names = [odes.arg.name].concat(odes.solutionColNames);
  const df = DG.DataFrame.fromColumns(names.map((name, idx) => DG.Column.fromFloat64Array(name, solutionArrs[idx])));
  df.name = odes.name;

  return df;
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
