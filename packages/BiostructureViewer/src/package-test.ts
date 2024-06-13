import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import '@datagrok-libraries/bio/src/types/ngl'; // To enable import from the NGL module declared in bio lib
import {runTests, tests, TestContext} from '@datagrok-libraries/utils/src/test';


import './tests/pdb-helper-tests';
import './tests/pdb-tests';
import './tests/ngl-gl-service-tests';
import './tests/pdb-grid-cell-renderer-tests';
import './tests/molstar-preview-tests';
import './tests/molstar-viewer-tests';
// import './tests/viewers';
import './tests/pdbqt-tests';
import './tests/data-provider-tests';
import './tests/context-menu-tests';


// This _package object is for tests only.
// Call package functions to test code calling package.ts/_package object.
export const _package = new DG.Package();
export {tests};

/*
Entry point 'test' is required in webpack.config.js

entry: {
  test: {
    filename: 'package-test.js',
    library: {type: 'var', name: `${packageName}_test`},
    import: './src/package-test.ts',
  },
  package: './src/package.ts',
}
*/


//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//input: object testContext {optional: true}
//output: dataframe result
export async function test(category: string, test: string, testContext: TestContext): Promise<DG.DataFrame> {
  const data = await runTests({category, test, testContext});
  return DG.DataFrame.fromObjects(data)!;
}
