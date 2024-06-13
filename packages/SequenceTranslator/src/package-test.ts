import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {runTests, tests, TestContext} from '@datagrok-libraries/utils/src/test';

import './tests/formats-to-helm';
import './tests/helm-to-nucleotides';
import './tests/formats-support';
import './tests/files-tests';

import {OligoToolkitTestPackage} from './tests/utils';

export const _package = new OligoToolkitTestPackage();
export {tests};

//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//input: object testContext {optional: true}
//output: dataframe result
export async function test(category: string, test: string, testContext: TestContext): Promise<DG.DataFrame> {
  const data = await runTests({category, test, testContext, verbose: true});
  return DG.DataFrame.fromObjects(data)!;
}
