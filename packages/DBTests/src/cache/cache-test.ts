import {after, before, category, delay, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import {DataQuery} from 'datagrok-api/dg';
import dayjs from 'dayjs';
import {getCallTime} from '../benchmarks/benchmark';

category('Cache', () => {
  const testConnections: String[] = ['PostgreSQLDBTests', 'PostgreSQLDBTestsCached'];

  before(async () => {
    await cleanCache(testConnections);
  });

  test('Scalars cache test', async () => await basicCacheTest('PostgresqlScalarCacheTest'));

  test('TestWide table cache test', async () => await basicCacheTest('PostgresqlTestCacheTableWide'));

  test('TestNormal table cache test', async () => await basicCacheTest('PostgresqlTestCacheTableNormal'));

  test('Connection cache test', async () => await basicCacheTest('PostgresqlCachedConnTest'), {timeout: 120000});

  test('Connection cache invalidation test', async () => {
    const connection = await grok.dapi.connections.filter(`name="${testConnections[1]}"`).first();
    await invalidationCacheTest(connection.query('test1', 'SELECT *, pg_sleep(0.1) FROM MOCK_DATA;'), 2);
  }, {timeout: 120000});

  test('Query cache invalidation test', async () => {
    const dataQuery = await grok.dapi.queries.filter(`friendlyName="PostgresqlCacheInvalidateQueryTest"`).first();
    await invalidationCacheTest(dataQuery, 2);
  });

  test('Scalars cache invalidation test', async () => {
    const dataQuery = await grok.dapi.queries
      .filter(`friendlyName="PostgresqlScalarCacheInvalidationTest"`).first();
    await invalidationCacheTest(dataQuery, 2);
  });

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

async function invalidationCacheTest(dataQuery: DataQuery, days: number): Promise<void> {
  const start = Date.now();
  const funcCall1 = await dataQuery.prepare().call();
  const firstExecutionTime = Date.now() - start;
  funcCall1.started = dayjs().subtract(days, 'day');
  await grok.dapi.functions.calls.save(funcCall1);
  await delay(300);
  const secondExecutionTime = await getCallTime(dataQuery.prepare());
  const isEqual: boolean = (secondExecutionTime <= firstExecutionTime + firstExecutionTime * 0.5) &&
        (secondExecutionTime >= firstExecutionTime - firstExecutionTime * 0.5);
  expect(isEqual, true,
    `The second execution time ${secondExecutionTime} ms
        is not approximately equals to the first execution time ${firstExecutionTime} ms`);
}

async function basicCacheTest(query: String): Promise<void> {
  const dataQuery = await grok.dapi.queries.filter(`friendlyName="${query}"`).first();
  const funcCall1 = dataQuery.prepare();
  const firstExecutionTime = await getCallTime(funcCall1);
  await delay(100);
  const funcCall2 = dataQuery.prepare();
  const secondExecutionTime = await getCallTime(funcCall2);
  expect(firstExecutionTime > secondExecutionTime * 2, true,
    `The first execution time ${firstExecutionTime} ms
        is no more than twice the second execution time ${secondExecutionTime} ms for ${query}`);
}

async function cleanCache(connections: String[]): Promise<void> {
  for (const conn of connections) {
    await grok.functions.call('DropConnectionCache',
      {connection: await grok.dapi.connections.filter(`name="${conn}"`).first()});
  }
}
