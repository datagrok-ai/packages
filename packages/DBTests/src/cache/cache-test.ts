import {after, before, category, delay, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import dayjs from 'dayjs';
import {getDataQueryTime} from '../benchmarks/benchmark';

category('Client cache', () => {
  before(async () => {
    await grok.functions.clientCache.start();
  });

  test('Scalars cache test', async () => {
    await grok.functions.clientCache.clear();
    await basicCacheTest('PostgresqlScalarCacheTestClient', 2);
  });

  test('TestNormal table cache test', async () => {
    await grok.functions.clientCache.clear();
    await basicCacheTest('PostgresqlTestCacheTableNormalClient', 3);
  });

  after(async () => {
    await grok.functions.clientCache.clear();
  });
});

category('Server cache', () => {
  const testConnections: String[] = ['PostgreSQLDBTests', 'PostgreSQLDBTestsCached'];

  before(async () => {
    await cleanCache(testConnections);
  });

  test('Scalars cache test', async () => await basicCacheTest('PostgresqlScalarCacheTest', 2));

  test('TestNormal table cache test', async () => await basicCacheTest('PostgresqlTestCacheTableNormal', 1.2), {timeout: 120000});

  test('Connection cache test', async () => await basicCacheTest('PostgresqlCachedConnTest', 2), {timeout: 120000});

  test('Connection cache invalidation test', async () => {
    await invalidationCacheTest('TestConnCache');
  }, {timeout: 120000});

  test('Query cache invalidation test', async () => {
    await invalidationCacheTest('PostgresqlCacheInvalidateQueryTest');
  });

  test('Scalars cache invalidation test', async () => {
    await invalidationCacheTest('PostgresqlScalarCacheInvalidationTest');
  }, {timeout: 120000});

  test('Cached conn DataFrame id diff', async () => {
    const connection = await grok.dapi.connections.filter(`name="${testConnections[1]}"`).first();
    const funcCall = await connection.query('test', 'SELECT * FROM MOCK_DATA').prepare().call();
    const firstId = funcCall.outputs['result'].id;
    const funcCall1 = await connection.query('test', 'SELECT * FROM MOCK_DATA').prepare().call();
    const secondId = funcCall1.outputs['result'].id;
    expect(firstId !== secondId, true, 'Ids are the same');
  });

  after(async () => {
    await cleanCache(testConnections);
  });
});

async function invalidationCacheTest(dataQuery: string): Promise<void> {
  const func: DG.Func = await grok.functions.eval('Dbtests:' + dataQuery);
  const start = Date.now();
  const funcCall1 = await func.prepare().call();
  const firstExecutionTime = Date.now() - start;
  await delay(500);
  funcCall1.started = dayjs().subtract(5, 'day');
  await grok.dapi.functions.calls.save(funcCall1);
  await delay(500);
  const secondExecutionTime = await getDataQueryTime(dataQuery);
  const isEqual: boolean = (secondExecutionTime <= firstExecutionTime + firstExecutionTime * 0.5) &&
        (secondExecutionTime >= firstExecutionTime - firstExecutionTime * 0.5);
  // eslint-disable-next-line max-len
  expect(isEqual, true, `The second execution time ${secondExecutionTime} ms is not approximately equals to the first execution time ${firstExecutionTime} ms`);
}

async function basicCacheTest(query: string, times: number): Promise<void> {
  const firstExecutionTime = await getDataQueryTime(query);
  await delay(1000);
  const secondExecutionTime = await getDataQueryTime(query);
  // eslint-disable-next-line max-len
  expect(firstExecutionTime > secondExecutionTime * times, true, `The first execution time ${firstExecutionTime} ms is no more than twice the second execution time ${secondExecutionTime} ms for ${query}`);
}

async function cleanCache(connections: String[]): Promise<void> {
  for (const conn of connections) {
    await grok.functions.call('DropConnectionCache',
      {connection: await grok.dapi.connections.filter(`name="${conn}"`).first()});
  }
}
