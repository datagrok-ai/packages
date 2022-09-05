import * as DG from "datagrok-api/dg";
import {runTests, tests} from '@datagrok-libraries/utils/src/test';
import './tests/timelines-test';

export let _package = new DG.Package();
export {tests};

//name: test
//output: dataframe result
export async function test(): Promise<DG.DataFrame> {
  let data = await runTests();
  return DG.DataFrame.fromObjects(data)!;
}
