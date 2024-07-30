import {category, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

category('Benchmarks', () => {
  test('Sequential select 1', async () => {
    const count = DG.Test.isInBenchmark ? 100 : 25;
    return await benchmarkQuery('SimpleSelect', count);
  }, {timeout: 120000, benchmark: true, stressTest: true});

  test('Parallel select 1', async () => {
    const count = DG.Test.isInBenchmark ? 200 : 30;
    const calls = [];
    for (let i = 0; i < count; i++)
      calls.push(getDataQueryTime('SimpleSelect'));
    const times: number[] = [];
    const results = await Promise.allSettled(calls);
    results.forEach((result) => {
      if (result.status == 'fulfilled')
        times.push(result.value);
    });
    return getTestResult(times, count);
  }, {benchmark: true});

  test('Performance: TestNormal', async () => {
    const count = DG.Test.isInBenchmark ? 5 : 1;
    return await benchmarkQuery('PostgresqlTableNormal', count);
  }, {timeout: 120000, benchmark: true, stressTest: true});

  test('Performance: TestWide', async () => {
    const count = DG.Test.isInBenchmark ? 5 : 1;
    return await benchmarkQuery('PostgresqlTableWide', count);
  }, {timeout: 120000, benchmark: true, stressTest: true});

  test('Performance: TestWide client cached', async () => {
    const count = DG.Test.isInBenchmark ? 5 : 2;
    return await benchmarkQuery('PostgresqlTableWideCachedClient', count);
  }, {benchmark: true});

  test('Performance: TestWide server cached', async () => {
    const count = DG.Test.isInBenchmark ? 5 : 2;
    return await benchmarkQuery('PostgresqlTableWideCachedServer', count);
  }, {timeout: 120000, benchmark: true});

  test('Performance: TestLong', async () => {
    return `Execution time: ${await getDataQueryTime('PostgresqlTableLong')}`;
  }, {timeout: 120000, benchmark: true, stressTest: true});

  test('Compression int', async () => {
    const compressionOnTime = await getDataQueryTime('PostgresqlCompressionIntOn');
    const compressionOffTime = await getDataQueryTime('PostgresqlCompressionIntOff');
    expect(compressionOnTime < compressionOffTime * 2, true);
  }, {skipReason: 'Feature of compression in development', benchmark: true});
});

function getTestResult(times: number[], expectedCount: number): object {
  const totalTime = times.reduce((acc, currentValue) => acc + currentValue, 0);
  return {
    'Total execution time of all calls, ms': totalTime,
    'Percentage of success': Math.round((times.length / expectedCount) * 100),
    'Average execution time, ms': totalTime / times.length,
    'Max execution time, ms': Math.max(...times),
    'Min execution time, ms': Math.min(...times),
  };
}

async function benchmarkQuery(query: string, count: number): Promise<object> {
  const times = [];
  for (let i = 0; i < count; i++)
    times.push(await getDataQueryTime(query));
  if (count >= 2) {
    times.shift();
    count--;
  }
  return getTestResult(times, count);
}

export async function getDataQueryTime(dataQueryName: string): Promise<number> {
  const startTime = Date.now();
  await grok.functions.call('Dbtests:' + dataQueryName);
  return Date.now() - startTime;
}
