import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export function makeModel(provider: string): Promise<DG.FuncCall> {
  return window.compute.makeModel(provider);
}
