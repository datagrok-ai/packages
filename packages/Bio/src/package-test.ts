import * as DG from 'datagrok-api/dg';

import {runTests, tests} from '@datagrok-libraries/utils/src/test';

import './tests/WebLogo-test';
import './tests/Palettes-test';
import './tests/detectors-test';
import './tests/msa-tests';
import './tests/sequence-space-test';
import './tests/activity-cliffs-tests';
import './tests/splitters-test';
import './tests/renderers-test';
import './tests/convert-test';
import './tests/fasta-handler-test';
import './tests/fasta-export-tests';
import './tests/WebLogo-positions-test';
import './tests/checkInputColumn-tests';
import './tests/similarity-diversity-tests';

export const _package = new DG.Package();
export {tests};

/** For the 'test' function argument names are fixed as 'category' and 'test' because of way it is called. */
//name: test
//input: string category {optional: true}
//input: string test {optional: true}
//output: dataframe result
export async function test(category: string, test: string): Promise<DG.DataFrame> {
  const data = await runTests({category, test});
  return DG.DataFrame.fromObjects(data)!;
}
