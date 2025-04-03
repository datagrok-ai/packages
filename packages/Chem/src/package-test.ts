import * as DG from 'datagrok-api/dg';
import {runTests, TestContext, tests, initAutoTests as initTests} from '@datagrok-libraries/utils/src/test';

// import './tests/calculate';
// import './tests/menu-tests-chem-space';
// import './tests/menu-tests-cliffs';
// import './tests/menu-tests-similarity-diversity';
// import './tests/menu-tests-rgroups';
// import './tests/menu-tests-script-based';

// import './tests/col-panel-tests';
import './tests/cell-panel-tests';

// import './tests/substructure-search-tests';
// import './tests/rendering-tests';
// import './tests/rendering-scatter-plot-tooltip-tests';
// import './tests/sketcher-tests';

// import './tests/detector-tests';
// import './tests/api-based-tests';
// import './tests/notation-converter-tests';
// import './tests/screening-tools';

// import './tests/save-as-sdf-tests';
// import './tests/substructure-filter-tests';

// import './tests/mol2-importer-tests';
// import './tests/chemical-table-parsing';
// import './tests/is-smarts-tests';
// import './tests/fingerprints';
// import './tests/scaffold-tree-tests';
import './tests/projects-tests';
// import './tests/clone-layout-tests';
// import './tests/mmpa-tests';
// import './tests/chemprop-tests';
// import './tests/vector-funcs-tests';

// import './tests/viewers';

export const _package = new DG.Package();
export {tests};

//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//input: object testContext {optional: true}
//input: bool stressTest {optional: true}
//output: dataframe result
export async function test(category: string, test: string, testContext: TestContext, stressTest?: boolean): Promise<DG.DataFrame> {
  const data = await runTests({category, test, testContext, stressTest});
  return DG.DataFrame.fromObjects(data)!;
}

//name: initAutoTests
export async function initAutoTests() {
  await initTests(_package, _package.getModule('package-test.js'));
}
