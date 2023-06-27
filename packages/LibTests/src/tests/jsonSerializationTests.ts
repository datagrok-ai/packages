import * as DG from 'datagrok-api/dg';
import {category, test, } from '@datagrok-libraries/utils/src/test';
import {expectDeepEqual} from '@datagrok-libraries/utils/src/expect';
import {serialize, deserialize} from '@datagrok-libraries/utils/src/json-serialization';

category('jsonSerialization', async () => {
  test('serialize/deserialize works', async () => {
    const initial = { a: DG.DataFrame.fromColumns([
      DG.Column.fromList('string', 'a', ['a', 'b']),
      DG.Column.fromList('double', 'b', [1.0, 2.2]),
    ])};
    const results = deserialize(serialize(initial));
    expectDeepEqual(results, initial);
  });
});
