/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {invMatrix} from 'diff-studio-utils';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//top-menu: ML | Try DS...
//name: TryDS
export async function TryDS() {
  await invMatrix(new Float64Array([1, 2, 3, 4]));
}