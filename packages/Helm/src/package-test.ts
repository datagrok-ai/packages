import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

// Do not import anything from JsDrawLite or HelmWebEditor, only to the main Helm package
// import {JSDraw2ModuleType} from '@datagrok/js-draw-lite/src/types/jsdraw2';
// import {HelmType, OrgHelmModuleType} from '@datagrok/helm-web-editor/src/types/org-helm';

import {runTests, tests, TestContext} from '@datagrok-libraries/utils/src/test';

import './tests/helm-tests';
import './tests/findMonomers-tests';
import './tests/helm-service-tests';
import './tests/renderers-tests';
import './tests/get-molfiles-tests';
import './tests/properties-widget-tests';
import './tests/get-all-parts-tests';
import './tests/get-monomer-tests';
import './tests/parse-helm-tests';
import './tests/helm-web-editor-tests';

export const _package = new DG.Package();
export {tests};


//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//input: object testContext {optional: true}
//output: dataframe result
export async function test(category: string, test: string, testContext: TestContext): Promise<DG.DataFrame> {
  // verbose: true - for tests returning dataframe
  const data = await runTests({category, test, testContext, verbose: true});
  return DG.DataFrame.fromObjects(data)!;
}
