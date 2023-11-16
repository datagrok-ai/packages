import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {runTests, tests, TestContext, test as _test, category} from '@datagrok-libraries/utils/src/test';
import './connections/queries-test';
import './sync/data-sync-test';
import './benchmarks/benchmark';
import './cache/cache-test';

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

//name: testConnections
//output: dataframe result
export async function testConnections(): Promise<DG.DataFrame> {
  const connections: string[] = ['PostgreSQLDBTests', 'SnowflakeDBTests', 'MSSQLDBTests', 'OracleDBTests'];
  const tables: string[] = ['Long', 'Normal', 'Wide', 'Tiny'];
  const fetchSizes: string[] = ['big', 'dynamic', 'low'];

  // const queriesFriendlyNames: string[] = ['PostgresNormal', 'PostgresLong', 'PostgresWide'];
  const l = connections.length * tables.length * fetchSizes.length;

  const df = DG.DataFrame.fromColumns([DG.Column.string('type', l), DG.Column.string('fetch', l),
    DG.Column.string('db', l), DG.Column.int('TTFR', l), DG.Column.int('TTC', l)]);

  let startTime: number;
  let ttfr: number;

  let callCheck: (value: DG.FuncCall) => boolean;
  let ttfrSet = false;
  // @ts-ignore
  grok.functions.onParamsUpdated.pipe(filter((c) => callCheck(c) && !ttfrSet)).subscribe(() => {
    ttfr = Date.now() - startTime;
    df.columns.byName('TTFR').set(row, ttfr);
    ttfrSet = true;
  });

  let row = 0;
  for (const con of connections) {
    for (const table of tables) {
      for (const fetchSize of fetchSizes) {
        if (table == 'Long' && fetchSize == 'low')
          continue;

        const connection = await grok.dapi.connections.filter(`name = "${con}"`).first();
        ttfrSet = false;

        df.columns.byName('type').set(row, table);
        df.columns.byName('fetch').set(row, fetchSize);
        df.columns.byName('db').set(row, con);

        callCheck = (c: DG.FuncCall) => c.aux.get('fetchSize') == fetchSize &&
            // @ts-ignore
            (c.func as DG.DataQuery).connection.name == con;

        const preTable = con.startsWith('Snowflake') ? 'TEST.' : '';

        let sql;

        if (table == 'Tiny') {
          if (con.startsWith('Oracle'))
            sql = `select * from Test_Long WHERE ROWNUM = 1`;
          else if (con.startsWith('MS'))
            sql = `select TOP 1 * from Test_Long`;
          else
            sql = 'select 1';
        } else
          sql = `select * from ${preTable}Test_${table}`;

        const query = `--fetchSize: ${fetchSize}\n${sql}\n--end`;

        startTime = Date.now();

        console.log('executing' + query);
        const q = connection.query('adhoc', sql);
        const call = q.prepare();
        // @ts-ignore
        call.setAuxValue('fetchSize', fetchSize);
        await call.call();
        // await grok.data.db.query(connection.id, query);
        console.log('executed');

        df.columns.byName('TTC').set(row, Date.now() - startTime);

        row++;
      }
    }
  }
  grok.shell.addTableView(df);
  return df;
}

const skip = ['Redshift', 'Athena'];

//tags: init
export async function initTests() {
  const connections = await grok.dapi.connections.list();
  for (const c of connections) {
    const cat = c.dart.dataSource ?? c.dart.z;
    category(('Providers:' + cat), () => {
      _test(c.friendlyName, async () => {
        const res = await c.test();
        if (res !== 'ok')
          throw new Error(res);
      }, skip.includes(cat) ? {skipReason: 'SKIP'} : undefined);
    }, {timeout: 5000});
  }
}
