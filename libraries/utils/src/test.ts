import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { Observable } from 'rxjs';
import { testData } from './dataframe-utils';
import Timeout = NodeJS.Timeout;
import { changeOptionsSaveLayout, filterAsync, loadLayout, selectFilterChangeCurrent, testViewerInternal } from './test-viewer-utils';

const STANDART_TIMEOUT = 30000;
const BENCHMARK_TIMEOUT = 10800000;

const stdLog = console.log.bind(console);
const stdInfo = console.info.bind(console);
const stdWarn = console.warn.bind(console);
const stdError = console.error.bind(console);

export const tests: {
  [key: string]: Category
} = {};

const autoTestsCatName = 'Auto Tests';
const demoCatName = 'Demo';
const detectorsCatName = 'Detectors';
const coreCatName = 'Core';
const wasRegistered: { [key: string]: boolean } = {};
export let currentCategory: string;

export namespace assure {
  export function notNull(value: any, name?: string) {
    if (value == null)
      throw new Error(`${name == null ? 'Value' : name} not defined`);
  }
}

export interface TestOptions {
  timeout?: number;
  benchmarkWarnTimeout?: number;
  benchmarkTimeout?: number;
  unhandledExceptionTimeout?: number;
  skipReason?: string;
  isAggregated?: boolean;
  benchmark?: boolean;
  stressTest?: boolean;
  owner?: string;
  tags?: string[];
}

export interface CategoryOptions {
  clear?: boolean;
  timeout?: number;
  benchmarks?: boolean;
  stressTests?: boolean;
  owner?: string;
}

export class TestContext {
  stressTest?: boolean;
  catchUnhandled = true;
  report = false;

  constructor(catchUnhandled?: boolean, report?: boolean) {
    if (catchUnhandled !== undefined) this.catchUnhandled = catchUnhandled;
    if (report !== undefined) this.report = report;
  };
}

export class Test {
  test: () => Promise<any>;
  name: string;
  category: string;
  options?: TestOptions;

  constructor(category: string, name: string, test: () => Promise<any>, options?: TestOptions) {
    this.category = category;
    this.name = name;
    options ??= {};
    options.timeout ??= STANDART_TIMEOUT;
    this.options = options;
    this.test = async (): Promise<any> => {
      return new Promise(async (resolve, reject) => {
        let result = '';
        try {
          result = await test();
        } catch (e: any) {
          reject(e);
        }
        resolve(result);
      });
    };
  }
}

export class Category {
  tests?: Test[];
  before?: () => Promise<void>;
  after?: () => Promise<void>;

  beforeStatus?: string;
  afterStatus?: string;
  clear?: boolean;
  timeout?: number;
  benchmarks?: boolean;
  benchmarkTimeout?: number;
  stressTests?: boolean;
  owner?: string;
}

export class TestExecutionOptions {
  category?: string;
  test?: string;
  testContext?: TestContext;
  exclude?: string[];
  verbose?: boolean;
  stressTest?: boolean;
  tags?: string[];
}

export async function testEvent<T>(event: Observable<T>,
  handler: (args: T) => void, trigger: () => void, ms: number = 0, reason: string = `timeout`
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sub = event.subscribe((args: T) => {
      try {
        handler(args);
        resolve('OK');
      } catch (e) {
        reject(e);
      } finally {
        sub.unsubscribe();
        clearTimeout(timeout);
      }
    });
    const timeout = setTimeout(() => {
      sub.unsubscribe();
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(reason);
    }, ms);
    trigger();
  });
}

export async function testEventAsync<T>(event: Observable<T>,
  handler: (args: T) => Promise<void>, trigger: () => void, ms: number = 0, reason: string = `timeout`
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sub = event.subscribe((args: T) => {
      handler(args).then(() => {
        resolve('OK');
      }).catch((e) => {
        reject(e);
      }).finally(() => {
        sub.unsubscribe();
        clearTimeout(timeout);
      });
    });
    const timeout = setTimeout(() => {
      sub.unsubscribe();
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(reason);
    }, ms);
    trigger();
  });
}

export function test(name: string, test: () => Promise<any>, options?: TestOptions): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  if (tests[currentCategory].tests == undefined)
    tests[currentCategory].tests = [];
  tests[currentCategory].tests!.push(new Test(currentCategory, name, test, options));
}

/* Tests two objects for equality, throws an exception if they are not equal. */
export function expect(actual: any, expected: any = true, error?: string): void {
  if (error)
    error = `${error}, `;
  else error = '';
  if (actual !== expected)
    throw new Error(`${error}Expected "${expected}", got "${actual}"`);
}

export function expectFloat(actual: number, expected: number, tolerance = 0.001, error?: string): void {
  if ((actual === Number.POSITIVE_INFINITY && expected === Number.POSITIVE_INFINITY) ||
    (actual === Number.NEGATIVE_INFINITY && expected === Number.NEGATIVE_INFINITY) ||
    (actual === Number.NaN && expected === Number.NaN) || (isNaN(actual) && isNaN(expected)))
    return;
  const areEqual = Math.abs(actual - expected) < tolerance;
  expect(areEqual, true, `${error ?? ''} (tolerance = ${tolerance})`);
  if (!areEqual)
    throw new Error(`Expected ${expected}, got ${actual} (tolerance = ${tolerance})`);
}

export function expectTable(actual: DG.DataFrame, expected: DG.DataFrame, error?: string): void {
  const expectedRowCount = expected.rowCount;
  const actualRowCount = actual.rowCount;
  expect(actualRowCount, expectedRowCount, `${error ?? ''}, row count`);

  for (const column of expected.columns) {
    const actualColumn = actual.columns.byName(column.name);
    if (actualColumn == null)
      throw new Error(`Column ${column.name} not found`);
    if (actualColumn.type != column.type)
      throw new Error(`Column ${column.name} type expected ${column.type} got ${actualColumn.type}`);
    for (let i = 0; i < expectedRowCount; i++) {
      const value = column.get(i);
      const actualValue = actualColumn.get(i);
      if (column.type == DG.TYPE.FLOAT)
        expectFloat(actualValue, value, 0.0001, error);
      else if (column.type == DG.TYPE.DATE_TIME)
        expect(actualValue.isSame(value), true, error);
      else
        expect(actualValue, value, error);
    }
  }
}

export function expectObject(actual: { [key: string]: any }, expected: { [key: string]: any }) {
  for (const [expectedKey, expectedValue] of Object.entries(expected)) {
    if (!actual.hasOwnProperty(expectedKey))
      throw new Error(`Expected property "${expectedKey}" not found`);

    const actualValue = actual[expectedKey];
    if (actualValue instanceof Array && expectedValue instanceof Array)
      expectArray(actualValue, expectedValue);
    else if (actualValue instanceof Object && expectedValue instanceof Object)
      expectObject(actualValue, expectedValue);
    else if (Number.isFinite(actualValue) && Number.isFinite(expectedValue))
      expectFloat(actualValue, expectedValue);
    else if (actualValue != expectedValue)
      throw new Error(`Expected (${expectedValue}) for key '${expectedKey}', got (${actualValue})`);
  }
}

export function expectArray(actual: ArrayLike<any>, expected: ArrayLike<any>) {
  const actualLength = actual.length;
  const expectedLength = expected.length;

  if (actualLength != expectedLength) {
    throw new Error(`Arrays are of different length: actual array length is ${actualLength} ` +
      `and expected array length is ${expectedLength}`);
  }

  for (let i = 0; i < actualLength; i++) {
    if (actual[i] instanceof Array && expected[i] instanceof Array)
      expectArray(actual[i], expected[i]);
    else if (actual[i] instanceof Object && expected[i] instanceof Object)
      expectObject(actual[i], expected[i]);
    else if (actual[i] != expected[i])
      throw new Error(`Expected ${expected[i]} at position ${i}, got ${actual[i]}`);
  }
}

/* Defines a test suite. */
export function category(category: string, tests_: () => void, options?: CategoryOptions): void {
  currentCategory = category;
  tests_();
  if (tests[currentCategory]) {
    tests[currentCategory].clear = options?.clear ?? true;
    tests[currentCategory].timeout = options?.timeout;
    tests[currentCategory].benchmarks = options?.benchmarks;
    tests[currentCategory].stressTests = options?.stressTests;
    tests[currentCategory].owner = options?.owner;
  }
}

/* Defines a function to be executed before the tests in this category are executed. */
export function before(before: () => Promise<void>): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  tests[currentCategory].before = before;
}

/* Defines a function to be executed after the tests in this category are executed. */
export function after(after: () => Promise<void>): void {
  if (tests[currentCategory] == undefined)
    tests[currentCategory] = {};
  tests[currentCategory].after = after;
}

function addNamespace(s: string, f: DG.Func): string {
  return s.replace(new RegExp(f.name, 'gi'), f.nqName);
}

export async function initAutoTests(package_: DG.Package, module?: any) {
  const packageId = package_.id;
  if (wasRegistered[packageId]) return;
  const moduleTests = module ? module.tests : tests;
  if (moduleTests[autoTestsCatName] !== undefined ||
    moduleTests[demoCatName] !== undefined ||
    Object.keys(moduleTests).find((c) => c.startsWith(autoTestsCatName) || c.startsWith(coreCatName))) {
    wasRegistered[packageId] = true;
    return;
  }
  if (package_.name === 'DevTools' || (!!module && module._package.name === 'DevTools')) {
    for (const f of (<any>window).dartTests) {
      const arr = f.name.split(/\s*\|\s*!/g);
      let name = arr.pop() ?? f.name;
      let cat = arr.length ? coreCatName + ': ' + arr.join(': ') : coreCatName;
      let fullName: string[] = name.split(' | ');
      name = fullName[fullName.length - 1];
      fullName.unshift(cat);
      fullName.pop();
      cat = fullName.join(': ');
      if (moduleTests[cat] === undefined)
        moduleTests[cat] = { tests: [], clear: true };
      moduleTests[cat].tests.push(new Test(cat, name, f.test, { isAggregated: false, timeout: f.options?.timeout ?? STANDART_TIMEOUT, skipReason: f.options?.skipReason, owner: f.options?.owner }));
    }
  }
  const moduleAutoTests = [];
  const moduleDemo = [];
  const moduleDetectors = [];
  const packFunctions = await grok.dapi.functions.filter(`package.id = "${packageId}"`).list();
  const reg = new RegExp(/skip:\s*([^,\s]+)|wait:\s*(\d+)|cat:\s*([^,\s]+)|timeout:\s*(\d+)/g);
  for (const f of packFunctions) {
    const tests = f.options['test'];
    const demo = f.options['demoPath'];
    if ((tests && Array.isArray(tests) && tests.length)) {
      for (let i = 0; i < tests.length; i++) {
        const res = (tests[i] as string).matchAll(reg);
        const map: { skip?: string, wait?: number, cat?: string, timeout?: number, benchmarkTimeout?: number } = {};
        Array.from(res).forEach((arr) => {
          if (arr[0].startsWith('skip')) map['skip'] = arr[1];
          else if (arr[0].startsWith('wait')) map['wait'] = parseInt(arr[2]);
          else if (arr[0].startsWith('cat')) map['cat'] = arr[3];
          else if (arr[0].startsWith('timeout')) map['timeout'] = parseInt(arr[4]);
        });
        const test = new Test(autoTestsCatName, tests.length === 1 ? f.name : `${f.name} ${i + 1}`, async () => {
          const res = await grok.functions.eval(addNamespace(tests[i], f));
          if (map.wait) await delay(map.wait);
          // eslint-disable-next-line no-throw-literal
          if (typeof res === 'boolean' && !res) throw `Failed: ${tests[i]}, expected true, got ${res}`;
        }, { skipReason: map.skip, timeout: DG.Test.isInBenchmark ? map.benchmarkTimeout ?? BENCHMARK_TIMEOUT : map.timeout ?? STANDART_TIMEOUT });
        if (map.cat) {
          const cat: string = autoTestsCatName + ': ' + map.cat;
          test.category = cat;
          if (moduleTests[cat] === undefined)
            moduleTests[cat] = { tests: [], clear: true };
          moduleTests[cat].tests.push(test);
        } else
          moduleAutoTests.push(test);
      }
    }
    if (demo) {
      const wait = f.options['demoWait'] ? parseInt(f.options['demoWait']) : undefined;
      const test = new Test(demoCatName, f.friendlyName, async () => {
        grok.shell.isInDemo = true;
        if (grok.shell.view(DG.View.BROWSE) === undefined)
          grok.shell.v = DG.View.createByType(DG.View.BROWSE);
        await delay(300);
        grok.shell.clearLastError();
        await f.apply();
        await delay(wait ? wait : 2000);
        const unhandled = await grok.shell.lastError;
        if (unhandled)
          throw new Error(unhandled);
        grok.shell.isInDemo = false;
      }, { skipReason: f.options['demoSkip'] });
      moduleDemo.push(test);
    }
    if (f.hasTag('semTypeDetector')) {
      let detectorsTestData = testData;
      if (f.options['testData']) {
        detectorsTestData = await grok.data.files.openTable(`System:AppData/${package_.nqName}/${f.options['testData']}`);
      }

      const test = new Test(detectorsCatName, f.friendlyName, async () => {
        const arr = [];
        console.log(`System:AppData/${package_.nqName}/${f.options['testData']}`);

        for (const col of detectorsTestData.clone().columns) {
          const res = await f.apply([col]);
          arr.push(res || col.semType);
        }
        const resArr = arr.filter((i) => i);
        expect(resArr.length, 1);

        if (f.options['testDataColumnName'])
          expect(resArr[0], f.options['testDataColumnName']);

      }, { skipReason: f.options['skipTest'] });
      moduleDetectors.push(test);
    }
  }
  wasRegistered[packageId] = true;
  if (moduleAutoTests.length > 0)
    moduleTests[autoTestsCatName] = { tests: moduleAutoTests, clear: true };
  if (moduleDemo.length > 0)
    moduleTests[demoCatName] = { tests: moduleDemo, clear: true };
  if (moduleDetectors.length > 0)
    moduleTests[detectorsCatName] = { tests: moduleDetectors, clear: false };
}

function redefineConsole(): any[] {
  const logs: any[] = [];
  console.log = (...args) => {
    logs.push(...args);
    stdLog(...args);
  };
  console.info = (...args) => {
    logs.push(...args);
    stdInfo(...args);
  };
  console.warn = (...args) => {
    logs.push(...args);
    stdWarn(...args);
  };
  console.error = (...args) => {
    logs.push(...args);
    stdError(...args);
  };
  return logs;
}

function resetConsole(): void {
  console.log = stdLog;
  console.info = stdInfo;
  console.warn = stdWarn;
  console.error = stdError;
}

export async function runTests(options?: TestExecutionOptions) {
  const package_ = grok.functions.getCurrentCall()?.func?.package;
  const packageOwner = ((package_?.packageOwner ?? '').match(new RegExp('[^<]*<([^>]*)>')) ?? ['', ''])[1];
  await initAutoTests(package_);
  const results: {
    category?: string, name?: string, success: boolean,
    result: string, ms: number, skipped: boolean, logs?: string, owner?: string
  }[] = [];
  console.log(`Running tests`);
  options ??= {};
  options!.testContext ??= new TestContext();
  grok.shell.clearLastError();
  const logs = redefineConsole();

  await invokeTests(tests, options);

  for (let r of results) {
    r.result = r.result.toString().replace(/"/g, '\'');
    if (r.logs != undefined)
      r.logs = r.logs!.toString().replace(/"/g, '\'');
  }
  return results;

  async function InvokeCategoryMethod(method: (() => Promise<void>) | undefined, category: string): Promise<string | undefined> {
    var invokationResult = undefined;
    try {
      if (method !== undefined) {
        await timeout(async () => {
          await method();
        }, 100000, `before ${category}: timeout error`);
      }
    } catch (x: any) {
      invokationResult = await getResult(x);
    }
    return invokationResult
  }

  async function invokeTestsInCategory(category: Category, options: TestExecutionOptions): Promise<any[]> {
    let t = category.tests ?? [];
    const res = [];
    if (category.clear) {
      for (let i = 0; i < t.length; i++) {
        if (t[i].options) {
          if (t[i].options?.benchmark === undefined) {
            if (!t[i].options)
              t[i].options = {}
            t[i].options!.benchmark = category.benchmarks ?? false;
          }
        }
        let test = t[i];
        if (test?.options) {
          test.options.owner = t[i].options?.owner ?? category?.owner ?? packageOwner ?? '';
        }
        if (DG.Test.isInDebug)
          debugger;
        let testRun = await execTest(test, options?.test, logs, DG.Test.isInBenchmark ? t[i].options?.benchmarkTimeout ?? BENCHMARK_TIMEOUT : t[i].options?.timeout ?? STANDART_TIMEOUT, package_.name, options.verbose);
        if (testRun)
          res.push(testRun);
        grok.shell.closeAll();
        DG.Balloon.closeAll();
      }
    } else {
      for (let i = 0; i < t.length; i++) {
        let test = t[i];
        if (test?.options) {
          test.options.owner = t[i].options?.owner ?? category?.owner ?? packageOwner ?? '';
        }
        if (DG.Test.isInDebug)
          debugger;
        let testRun = await execTest(test, options?.test, logs, DG.Test.isInBenchmark ? t[i].options?.benchmarkTimeout ?? BENCHMARK_TIMEOUT : t[i].options?.timeout, package_.name, options.verbose);
        if (testRun)
          res.push(testRun);
      }
    }
    return res;
  }

  async function invokeTests(categoriesToInvoke: { [key: string]: Category }, options: TestExecutionOptions) {
    try {
      for (const [key, value] of Object.entries(categoriesToInvoke)) {
        if ((!!options?.category && !key.toLowerCase().startsWith(options?.category.toLowerCase())) ||
          options.exclude?.some((c) => key.startsWith(c)))
          continue;

        stdLog(`Started ${key} category`);
        const skipped = value.tests?.every((t) => t.options?.skipReason);
        if (!skipped)
          value.beforeStatus = await InvokeCategoryMethod(value.before, options.category ?? '');

        let t = value.tests ?? [];

        if (options.stressTest) {
          t = t.filter((e) => e.options?.stressTest);
          t = shuffle(t);
        }

        if ((options.tags?.length ?? 0) > 0) {
          t = t.filter((e) =>
            e.options?.tags?.some(tag => (options?.tags ?? []).includes(tag))
          );
        }

        let res: any[];
        if (value.beforeStatus) {
          res = Array.from(t.map((testElem) => {
            return { date: new Date().toISOString(), logs: '', category: key, name: testElem.name, result: 'before() failed', success: false, ms: 0, skipped: false };
          }));
          res.forEach(async (test) => reportTest('package', test));
        } else
          res = await invokeTestsInCategory(value, options);
        const data = res.filter((d) => d.result != 'skipped');

        if (!skipped)
          value.afterStatus = await InvokeCategoryMethod(value.after, options.category ?? '');

        // Clear after category
        // grok.shell.closeAll();
        // DG.Balloon.closeAll();
        if (value.afterStatus)
          data.push({ date: new Date().toISOString(), logs: '', category: key, name: 'after', result: value.afterStatus, success: false, ms: 0, skipped: false });
        if (value.beforeStatus)
          data.push({ date: new Date().toISOString(), logs: '', category: key, name: 'before', result: value.beforeStatus, success: false, ms: 0, skipped: false });
        results.push(...data);
      }
    } finally {
      resetConsole();
    }
    if (options.testContext!.catchUnhandled && (!DG.Test.isInBenchmark)) {
      await delay(1000);
      const error = await grok.shell.lastError;
      const params = {
        logs: '',
        date: new Date().toISOString(),
        category: 'Unhandled exceptions',
        name: 'Exception',
        result: error ?? '', success: !error, ms: 0, skipped: false,
        'flaking': DG.Test.isReproducing && !error,
        owner: packageOwner ?? ''
      };
      results.push(params);
      (<any>params).package = package_.name;
      await reportTest('package', params);
    }
  }
}

async function reportTest(type: string, params: any): Promise<void> {
  if ((<any>grok.shell).reportTest != null)
    await (<any>grok.shell).reportTest(type, params);
  else {
    await fetch(`${grok.dapi.root}/log/tests/${type}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(params)
    });
  }
}

async function getResult(x: any): Promise<string> {
  return `${x.toString()}\n${x.stack ? (await DG.Logger.translateStackTrace(x.stack)) : ''}`;
}

async function execTest(t: Test, predicate: string | undefined, logs: any[],
  testTimeout?: number, packageName?: string, verbose?: boolean): Promise<any> {
  logs.length = 0;
  let r: { date: string, category?: string, name?: string, success: boolean, result: any, ms: number, skipped: boolean, logs?: string, owner?: string };
  let type: string = 'package';
  const filter = predicate != undefined && (t.name.toLowerCase() !== predicate.toLowerCase());
  let skip = t.options?.skipReason || filter;
  let skipReason = filter ? 'skipped' : t.options?.skipReason;

  if (DG.Test.isInBenchmark && !t.options?.benchmark) {
    stdLog(`SKIPPED: ${t.category} ${t.name} doesnt available in benchmark mode`);
    return undefined;
  }

  if (!skip)
    stdLog(`Started ${t.category} ${t.name}`);
  const start = Date.now();
  const startDate = new Date(start).toISOString();
  try {
    if (skip)
      r = { date: startDate, success: true, result: skipReason!, ms: 0, skipped: true };
    else {
      let timeout_ = testTimeout ?? STANDART_TIMEOUT;
      r = { date: startDate, success: true, result: await timeout(t.test, timeout_) ?? 'OK', ms: 0, skipped: false };
    }
  } catch (x: any) {
    stdError(x);
    r = { date: startDate, success: false, result: await getResult(x), ms: 0, skipped: false };
  }
  if (t.options?.isAggregated && r.result.constructor === DG.DataFrame) {
    const col = r.result.col('success');
    if (col)
      r.success = col.stats.sum === col.length;
    if (!verbose) {
      const df = r.result;
      df.columns.remove('stack');
      df.rows.removeWhere((r) => r.get('success'));
      r.result = df;
    }
    r.result = r.result.toCsv();
  }
  r.logs = logs.join('\n');
  r.ms = Date.now() - start;
  if (!skip)
    stdLog(`Finished ${t.category} ${t.name} for ${r.ms} ms`);
  r.category = t.category;
  r.name = t.name;
  r.owner = t.options?.owner ?? '';
  if (!filter) {
    let params = {
      'success': r.success, 'result': r.result, 'ms': r.ms, 'date': r.date,
      'skipped': r.skipped, 'package': packageName, 'category': t.category, 'name': t.name, 'logs': r.logs, 'owner': r.owner,
      'flaking': DG.Test.isReproducing && r.success,
      'timeoutWarning': DG.Test.isInBenchmark && (t.options?.benchmarkWarnTimeout && r.ms > t.options?.benchmarkWarnTimeout)
    };
    if (r.result.constructor == Object) {
      const res = Object.keys(r.result).reduce((acc, k) => ({ ...acc, ['result.' + k]: r.result[k] }), {});
      params = { ...params, ...res };
    }

    if (params.result instanceof DG.DataFrame)
      params.result = JSON.stringify(params.result?.toJson()) || '';

    await reportTest(type, params);
  }
  return r;
}

export function shuffle(array: any[]): any[] {
  const newArr = array.slice();
  newArr.sort(() => Math.random() - 0.5);
  return newArr;
};

/* Waits [ms] milliseconds */
export async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function awaitCheck(checkHandler: () => boolean,
  error: string = 'Timeout exceeded', wait: number = 500, interval: number = 50): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(error));
    }, wait);
    // @ts-ignore
    const intervalId: Timeout = setInterval(() => {
      if (checkHandler()) {
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
}

// Returns test execution result or an error in case of timeout
export async function timeout(func: () => Promise<any>, testTimeout: number, timeoutReason: string = 'EXECUTION TIMEOUT'): Promise<any> {
  let timeout: any = null;
  const timeoutPromise = new Promise<any>((_, reject) => {
    timeout = setTimeout(() => {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(timeoutReason);
    }, testTimeout);
  });
  try {
    return await Promise.race([func(), timeoutPromise]);
  } finally {
    if (timeout)
      clearTimeout(timeout);
  }
}

export function isDialogPresent(dialogTitle: string): boolean {
  const dialogs = DG.Dialog.getOpenDialogs();
  for (let i = 0; i < dialogs.length; i++) {
    if (dialogs[i].title == dialogTitle)
      return true;
  }
  return false;
}

/** Expects an asynchronous {@link action} to throw an exception. Use {@link check} to perform
 * deeper inspection of the exception if necessary.
 * @param  {function(): Promise<void>} action
 * @param  {function(any): boolean} check
 * @return {Promise<void>}
 */
export async function expectExceptionAsync(action: () => Promise<void>,
  check?: (exception: any) => boolean): Promise<void> {
  let caught: boolean = false;
  let checked: boolean = false;
  try {
    await action();
  } catch (e) {
    caught = true;
    checked = !check || check(e);
  } finally {
    if (!caught)
      throw new Error('An exception is expected but not thrown');
    if (!checked)
      throw new Error('An expected exception is thrown, but it does not satisfy the condition');
  }
}

const catDF = DG.DataFrame.fromColumns([DG.Column.fromStrings('col', ['val1', 'val2', 'val3'])]);

/**
 * Universal test for viewers. It search viewers in DOM by tags: canvas, svg, img, input, h1, a
 * @param  {string} v Viewer name
 * @param  {DG.DataFrame} df Dataframe to use. Should have at least 3 rows
 * @param  {boolean} options.detectSemanticTypes Specify whether to detect semantic types or not
 * @param  {boolean} options.readOnly If set to true, the dataframe will not be modified during the test
 * @param  {boolean} options.arbitraryDfTest If set to false, test on arbitrary dataframe
 * (one categorical column) will not be performed
 * @param  {object} options List of options (optional)
 * @return {Promise<void>} The test is considered successful if it completes without errors
 */
export async function testViewer(v: string, df: DG.DataFrame, options?: {
  detectSemanticTypes?: boolean, readOnly?: boolean, arbitraryDfTest?: boolean,
  packageName?: string, awaitViewer?: (viewer: DG.Viewer) => Promise<void>
}): Promise<void> {
  const packageName = options?.packageName ?? '';
  if (options?.detectSemanticTypes)
    await grok.data.detectSemanticTypes(df);
  const tv = grok.shell.addTableView(df);

  try {
    //1. Open, do nothing and close
    await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded);
    //in case viewer with async rendering - wait for render to complete
    if (options?.awaitViewer)
      await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, undefined, options!.awaitViewer);

    //2. Open viewer, run selection, filter, etc. and close
    if (!options?.readOnly) {
      await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, selectFilterChangeCurrent);
      if (options?.awaitViewer)
        await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, selectFilterChangeCurrent, options!.awaitViewer);
    }

    //2. Open viewer, change options, save layout and close
    let propsAndLayout: { layout: any, savedProps: any } | null = null;
    propsAndLayout = await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, changeOptionsSaveLayout);
    if (options?.awaitViewer)
      propsAndLayout = await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded,
        changeOptionsSaveLayout, options!.awaitViewer)

    //3. Load layout
    await testViewerInternal(tv, v, packageName, grok.events.onViewLayoutApplied, loadLayout, undefined, propsAndLayout?.layout,
      { savedProps: propsAndLayout?.savedProps });
    if (options?.awaitViewer)
      await testViewerInternal(tv, v, packageName, grok.events.onViewLayoutApplied, loadLayout, options!.awaitViewer,
        propsAndLayout?.layout, { savedProps: propsAndLayout?.savedProps });

    //4. Open viewer on arbitary dataset
    if (options?.arbitraryDfTest !== false) {
      tv.dataFrame = catDF;
      await delay(50);
      await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded);
      if (options?.awaitViewer)
        await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, undefined, options!.awaitViewer);
    }

    //5. Call postponed filtering
    await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, filterAsync);
    if (options?.awaitViewer)
      await testViewerInternal(tv, v, packageName, grok.events.onViewerAdded, filterAsync, options!.awaitViewer);

  } finally {
    // closeAll() is handling by common test workflow
    // grok.shell.closeAll();
    // DG.Balloon.closeAll();
  }
}
