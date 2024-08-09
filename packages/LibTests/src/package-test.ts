import * as DG from 'datagrok-api/dg';
import {TestContext, runTests, tests} from '@datagrok-libraries/utils/src/test';

import './tests/compute-api/rich-function-view-tests';
import './tests/utils/expect-tests';
import './tests/utils/json-serialization-tests';
import './tests/compute-utils/rich-function-view-tests';
import './tests/compute-utils/reactive-tree-driver/config-processing';
import './tests/compute-utils/reactive-tree-driver/instance-init';
import './tests/compute-utils/reactive-tree-driver/instance-persistence';

export const _package = new DG.Package();
export {tests};

//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//input: object testContext {optional: true}
//output: dataframe result
export async function test(category: string, test: string, testContext: TestContext): Promise<DG.DataFrame> {
  const data = await runTests({category, test, testContext});
  return DG.DataFrame.fromObjects(data)!;
}
