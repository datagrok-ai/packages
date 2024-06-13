import * as DG from 'datagrok-api/dg';
import cloneDeepWith from 'lodash.clonedeepwith';
import {BehaviorSubject, Observable, Subject} from 'rxjs';

export function getFuncCallIO(fc: DG.FuncCall) {
  return {
    inputs: [...fc.inputs.entries()],
    outputs: [...fc.outputs.entries()],
  };
}

export function removeObservables<T>(config: T): T {
  return cloneDeepWith(config, (val) => {
    if (val instanceof Map) {
      const entries = removeObservables([...val.entries()]);
      return new Map(entries);
    }
    if ((val instanceof Subject) || (val instanceof BehaviorSubject) || (val instanceof Observable))
      return '$observable';
    if (val instanceof Function)
      return 'function';
  });
}

