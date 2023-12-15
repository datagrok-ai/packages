import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import '@datagrok-libraries/bio/src/types/ngl'; // To enable import from the NGL module declared in bio lib
import {runTests, tests} from '@datagrok-libraries/utils/src/test';

import './tests/autodock-tests';

export let _package = new DG.Package();
export {tests};

//name: test
//output: dataframe result
export async function test(): Promise<DG.DataFrame> {
  let data = await runTests();
  return DG.DataFrame.fromObjects(data)!;
}
