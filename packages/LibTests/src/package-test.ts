import * as DG from 'datagrok-api/dg';
import {TestContext, runTests, tests, initAutoTests as initTests} from '@datagrok-libraries/utils/src/test';

import './tests/utils/expect-tests';
import './tests/utils/json-serialization-tests';
import './tests/compute-utils/reactive-tree-driver/config-processing';
import './tests/compute-utils/reactive-tree-driver/instance-init';
import './tests/compute-utils/reactive-tree-driver/instance-persistence';
import './tests/compute-utils/reactive-tree-driver/instance-mutations';
import './tests/compute-utils/reactive-tree-driver/instance-readonly';
import './tests/compute-utils/reactive-tree-driver/links-matching';
import './tests/compute-utils/reactive-tree-driver/links-reactivity';
import './tests/compute-utils/reactive-tree-driver/instance-additional';
import './tests/compute-utils/reactive-tree-driver/funcall-wrappers';
import './tests/compute-utils/reactive-tree-driver/instance-bridge';
import './tests/compute-utils/reactive-tree-driver/links-additional-states-propagation';
import './tests/compute-utils/reactive-tree-driver/step-deps-tracking';
import './tests/compute-utils/reactive-tree-driver/obsolete-meta';
import './tests/compute-utils/reactive-tree-driver/oninit-hook';
import './tests/compute-utils/reactive-tree-driver/links-workflow';
import './tests/compute-utils/reactive-tree-driver/sequence-run';
import './tests/compute-utils/reactive-tree-driver/links-retention';

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

//name: initAutoTests
export async function initAutoTests() {
  await initTests(_package, _package.getModule('package-test.js'));
}
