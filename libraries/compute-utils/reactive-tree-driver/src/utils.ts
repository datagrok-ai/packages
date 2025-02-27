import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {Observable, defer, of} from 'rxjs';
import {HandlerBase} from './config/PipelineConfiguration';
import {ActionItem, Advice, ValidationPayload, ValidationResult} from './data/common-types';
import {NodeAddressSegment, NodePathSegment, TreeNode} from './data/BaseTree';
import {StateTreeNode} from './runtime/StateTreeNodes';

export function callHandler<R, P = any>(handler: HandlerBase<P, R>, params: P): Observable<R> {
  if (typeof handler === 'string') {
    return defer(async () => {
      const f = DG.Func.byName(handler);
      const call = f.prepare({params});
      await call.call();
      const res = call.getOutputParamValue() as R;
      return res;
    });
  } else {
    return defer(() => {
      const res = handler(params);
      if (res instanceof Observable || res instanceof Promise)
        return res;
      else
        return of(res);
    });
  }
}

export function mergeValidationResults(...results: (ValidationResult | undefined)[]): ValidationResult {
  const errors = [];
  const warnings = [];
  const notifications = [];

  for (const result of results) {
    if (result) {
      errors.push(...(result.errors ?? []));
      warnings.push(...(result.warnings ?? []));
      notifications.push(...(result.notifications ?? []));
    }
  }
  return {errors, warnings, notifications};
}

export function makeAdvice(description: string, actions?: ActionItem[]) {
  return {description, actions};
}

export function makeValidationResult(payload?: ValidationPayload): ValidationResult {
  const wrapper = (item: string | Advice) => typeof item === 'string' ? makeAdvice(item) : item;
  return {
    errors: payload?.errors?.map((err) => wrapper(err)),
    warnings: payload?.warnings?.map((warn) => wrapper(warn)),
    notifications: payload?.notifications?.map((note) => wrapper(note)),
  };
}

export function pathToUUID(
  rnode: TreeNode<StateTreeNode>,
  path: readonly NodeAddressSegment[] | readonly NodePathSegment[],
): string[] {
  let acc = {node: rnode, uuids: [rnode.getItem().uuid]};

  path.forEach(({idx}) => {
    const nnode = acc.node.getChild({idx});
    const {uuid} = nnode.getItem();

    acc = {node: nnode, uuids: [...acc.uuids, uuid]};
  });
  return acc.uuids;
}

export function indexFromEnd<T>(arr: Readonly<T[]>, offset = 0): T | undefined {
  return arr[arr.length - offset - 1];
}
