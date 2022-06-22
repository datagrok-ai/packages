import * as DG from 'datagrok-api/dg';

import {runTests, tests} from '@datagrok-libraries/utils/src/test';

import './tests/WebLogo.test';

export const _packageTest = new DG.Package();
export {tests};

//name: test
//input: string category {optional: true}
//input: string t {optional: true}
//output: dataframe result
//top-menu: Tools | Dev | JS API Tests
export async function test(category: string, t: string): Promise<DG.DataFrame> {
  const data = await runTests({category, test: t});
  return DG.DataFrame.fromObjects(data)!;
}
