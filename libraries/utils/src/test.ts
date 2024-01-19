import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {Observable} from 'rxjs';
import {testData} from './dataframe-utils';
import Timeout = NodeJS.Timeout;

const STANDART_TIMEOUT = 30000;
const BENCHMARK_TIMEOUT = 10800000;

const stdLog = console.log.bind(console);
const stdInfo = console.info.bind(console);
const stdWarn = console.warn.bind(console);
const stdError = console.error.bind(console);

export const tests: {
  [key: string]: {
    tests?: Test[], before?: () => Promise<void>, after?: () => Promise<void>,
    beforeStatus?: string, afterStatus?: string, clear?: boolean, timeout?: number
  }
} = {};

const autoTestsCatName = 'Auto Tests';
const demoCatName = 'Demo';
const detectorsCatName = 'Detectors';
const coreCatName = 'Core';
const wasRegistered: {[key: string]: boolean} = {};
export let currentCategory: string;

export namespace assure {
  export function notNull(value: any, name?: string) {
    if (value == null)
      throw new Error(`${name == null ? 'Value' : name} not defined`);
  }
}

export interface TestOptions {
  timeout?: number;
  unhandledExceptionTimeout?: number;
  skipReason?: string;
  isAggregated?: boolean;
}

export interface CategoryOptions {
  clear?: boolean;
  timeout?: number;
}

export class TestContext {
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
      }
      // Do not clearTimeout or event sub if handler fails
      sub.unsubscribe();
      clearTimeout(timeout);
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
      Object.keys(moduleTests).find((c) => c.startsWith(autoTestsCatName))) {
    wasRegistered[packageId] = true;
    return;
  }
  if (package_.name === 'DevTools' || (!!module && module._package.name === 'DevTools')) {
    moduleTests[coreCatName] = {tests: [], clear: true};
    const testFunctions: DG.Func[] = DG.Func.find({tags: ['dartTest']});
    for (const f of testFunctions) {
      moduleTests[coreCatName].tests.push(new Test(coreCatName, f.name,
        async () => await f.apply(), {isAggregated: f.outputs.length > 0, timeout: 300000}));
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
        const map: {skip?: string, wait?: number, cat?: string, timeout?: number} = {};
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
        }, {skipReason: map.skip, timeout: map.timeout});
        if (map.cat) {
          const cat: string = autoTestsCatName + ': ' + map.cat;
          test.category = cat;
          if (moduleTests[cat] === undefined)
            moduleTests[cat] = {tests: [], clear: true};
          moduleTests[cat].tests.push(test);
        } else {
          moduleAutoTests.push(test);
        }
      }
    }
    if (demo) {
      const wait = f.options['demoWait'] ? parseInt(f.options['demoWait']) : undefined;
      const test = new Test(demoCatName, f.friendlyName, async () => {
        grok.shell.lastError = '';
        await f.apply();
        await delay(wait ? wait : 2000);
        if (grok.shell.lastError)
          throw new Error(grok.shell.lastError);
      }, {skipReason: f.options['demoSkip']});
      moduleDemo.push(test);
    }
    if (f.hasTag('semTypeDetector')) {
      const test = new Test(detectorsCatName, f.friendlyName, async () => {
        const arr = [];
        for (const col of testData.clone().columns) {
          const res = await f.apply([col]);
          arr.push(res || col.semType);
        }
        expect(arr.filter((i) => i).length, 1);
      }, {skipReason: f.options['skipTest']});
      moduleDetectors.push(test);
    }
  }
  wasRegistered[packageId] = true;
  if (moduleAutoTests.length)
    moduleTests[autoTestsCatName] = {tests: moduleAutoTests, clear: true};
  if (moduleDemo.length)
    moduleTests[demoCatName] = {tests: moduleDemo, clear: true};
  if (moduleDetectors.length)
    moduleTests[detectorsCatName] = {tests: moduleDetectors, clear: false};
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

export async function runTests(options?:
  {category?: string, test?: string, testContext?: TestContext}, exclude?: string[]) {
  const package_ = grok.functions.getCurrentCall()?.func?.package;
  await initAutoTests(package_);
  const results: { category?: string, name?: string, success: boolean,
                   result: string, ms: number, skipped: boolean }[] = [];
  console.log(`Running tests`);
  options ??= {};
  options!.testContext ??= new TestContext();
  grok.shell.lastError = '';
  const categories = [];
  const logs = redefineConsole();
  for (const [key, value] of Object.entries(tests)) {
    if ((!!options?.category && !key.toLowerCase().startsWith(options?.category.toLowerCase())) ||
      exclude?.some((c) => key.startsWith(c)))
      continue;
    stdLog(`Started ${key} category`);
    categories.push(key);
    const skipped = value.tests?.every((t) => t.options?.skipReason);
    try {
      if (value.before && !skipped)
        await value.before();
    } catch (x: any) {
      value.beforeStatus = getResult(x);
    }
    const t = value.tests ?? [];
    const res = [];
    if (value.clear) {
      for (let i = 0; i < t.length; i++) {
        res.push(await execTest(t[i], options?.test, logs, value.timeout, package_.name));
        grok.shell.closeAll();
        DG.Balloon.closeAll();
      }
    } else {
      for (let i = 0; i < t.length; i++)
        res.push(await execTest(t[i], options?.test, logs, value.timeout, package_.name));
    }
    const data = res.filter((d) => d.result != 'skipped');
    try {
      if (value.after && !skipped)
        await value.after();
    } catch (x: any) {
      value.afterStatus = getResult(x);
    }
    // Clear after category
    // grok.shell.closeAll();
    // DG.Balloon.closeAll();
    if (value.afterStatus)
      data.push({category: key, name: 'after', result: value.afterStatus, success: false, ms: 0, skipped: false});
    if (value.beforeStatus)
      data.push({category: key, name: 'before', result: value.beforeStatus, success: false, ms: 0, skipped: false});
    results.push(...data);
  }
  resetConsole();
  if (options.testContext.catchUnhandled) {
    await delay(1000);
    if (grok.shell.lastError.length > 0) {
      results.push({
        category: 'Unhandled exceptions',
        name: 'exceptions',
        result: grok.shell.lastError, success: false, ms: 0, skipped: false
      });
    }
  }
  if (!options.test && results.length) {
    const successful = results.filter((r) => r.success).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.success);
    const packageName = package_.name;
    for (const cat of categories) {
      const res = results.filter((r) => r.category === cat);
      const failed_ = res.filter((r) => !r.success).length;
      const params = {success: failed_ === 0,
        passed: res.filter((r) => r.success).length,
        skipped: res.filter((r) => r.skipped).length,
        failed: failed_,
        type: 'package', packageName, category: cat};
      grok.log.usage(`${packageName}: ${cat}`,
        params, `category-package ${packageName}: ${cat}`);
    }
    if (!options.category) {
      const params = {success: failed.length === 0, passed: successful, skipped, failed: failed.length,
        type: 'package', packageName};
      grok.log.usage(packageName, params, `package-package ${packageName}`);
    }
    if (options.testContext.report) {
      const logger = new DG.Logger();
      const description = 'Package @package tested: @successful successful, @skipped skipped, @failed failed tests';
      const params = {
        successful: successful,
        skipped: skipped,
        failed: failed.length,
        package: package_
      };
      for (const r of failed) Object.assign(params, {[`${r.category} | ${r.name}`]: r.result});
      logger.log(description, params, 'package-tested');
    }
  }
  return results;
}

function getResult(x: any) {
  return `${x.toString()}\n${x.stack ? DG.Logger.translateStackTrace(x.stack) : ''}`;
}

async function execTest(t: Test, predicate: string | undefined, logs: any[],
  categoryTimeout?: number, packageName?: string) {
  logs.length = 0;
  let r: {category?: string, name?: string, success: boolean, result: any, ms: number, skipped: boolean, logs?: string};
  let type: string = 'package';
  const filter = predicate != undefined && (t.name.toLowerCase() !== predicate.toLowerCase());
  const skip = t.options?.skipReason || filter;
  const skipReason = filter ? 'skipped' : t.options?.skipReason;
  if (!skip)
    stdLog(`Started ${t.category} ${t.name}`);
  const start = Date.now();
  try {
    if (skip) {
      r = {success: true, result: skipReason!, ms: 0, skipped: true};
    } else {
      let timeout_ = t.options?.timeout === STANDART_TIMEOUT &&
        categoryTimeout ? categoryTimeout : t.options?.timeout!;
      timeout_ = DG.Test.isInBenchmark && timeout_ === STANDART_TIMEOUT ? BENCHMARK_TIMEOUT : timeout_;
      r = {success: true, result: await timeout(t.test, timeout_) ?? 'OK', ms: 0, skipped: false};
    }
  } catch (x: any) {
    r = {success: false, result: getResult(x), ms: 0, skipped: false};
  }
  if (t.options?.isAggregated && r.result.constructor === DG.DataFrame) {
    const col = r.result.col('success');
    r.result = r.result.toCsv();
    type = 'core';
    if (col)
      r.success = col.stats.sum === col.length;
  }
  r.logs = logs.join('\n');
  r.ms = Date.now() - start;
  if (!skip)
    stdLog(`Finished ${t.category} ${t.name} for ${r.ms} ms`);
  r.category = t.category;
  r.name = t.name;
  if (!filter) {
    let params = {'success': r.success, 'result': r.result, 'ms': r.ms, 'skipped': r.skipped,
      'type': type, packageName, 'category': t.category, 'test': t.name, 'logs': r.logs};
    if (r.result.constructor == Object) {
      const res = Object.keys(r.result).reduce((acc, k) => ({...acc, ['result.' + k]: r.result[k]}), {});
      params = {...params, ...res};
    }
    grok.log.usage(`${packageName}: ${t.category}: ${t.name}`,
      params, `test-${type} ${packageName}: ${t.category}: ${t.name}`);
  }
  return r;
}

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

async function timeout(func: () => Promise<any>, testTimeout: number): Promise<any> {
  let timeout: Timeout | null = null;
  const t1: number = window.performance.now();
  const timeoutPromise = new Promise<any>((_, reject) => {
    //@ts-ignore
    timeout = setTimeout(() => {
      const t2: number = window.performance.now();
      //console.debug(`utils: timeout(), timeout, ET: ${t2 - t1} ms`);
      // eslint-disable-next-line prefer-promise-reject-errors
      reject('EXECUTION TIMEOUT');
    }, testTimeout);
  });
  try {
    return await Promise.race([
      (async () => {
        await func();
        const t2: number = window.performance.now();
        //console.debug(`utils: timeout(), func() end, ET: ${t2 - t1} ms`);
      })(),
      timeoutPromise/* timeoutPromise can reject but never resolve */]);
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
export async function testViewer(v: string, df: DG.DataFrame,
  options?: {detectSemanticTypes?: boolean, readOnly?: boolean, arbitraryDfTest?: boolean}): Promise<void> {
  if (options?.detectSemanticTypes) await grok.data.detectSemanticTypes(df);
  let tv = grok.shell.addTableView(df);
  const viewerName = `[name=viewer-${v.replace(/\s+/g, '-')} i]`;
  const selector = `${viewerName} canvas,${viewerName} svg,${viewerName} img,
    ${viewerName} input,${viewerName} h1,${viewerName} a,${viewerName} .d4-viewer-error`;
  const res = [];
  try {
    let viewer = tv.addViewer(v);
    await awaitCheck(() => document.querySelector(selector) !== null,
      'cannot load viewer', 3000);
    const tag = document.querySelector(selector)?.tagName;
    res.push(Array.from(tv.viewers).length);
    if (!options?.readOnly) {
      Array.from(df.row(0).cells).forEach((c:any) => c.value = null);
      const num = df.rowCount < 20 ? Math.floor(df.rowCount / 2) : 10;
      df.rows.select((row: DG.Row) => row.idx >= 0 && row.idx < num);
      await delay(50);
      for (let i = num; i < num * 2; i++) df.filter.set(i, false);
      await delay(50);
      df.currentRowIdx = 1;
      const df1 = df.clone();
      df.columns.names().slice(0, Math.ceil(df.columns.length / 2)).forEach((c: any) => df.columns.remove(c));
      await delay(100);
      tv.dataFrame = df1;
    }
    let optns: { [p: string]: any };
    try {
      optns = viewer.getOptions(true).look;
    } catch (err: any) {
      throw new Error(`Viewer's .getOptions() error.`, {cause: err});
    }
    let props: DG.Property[];
    try {
      props = viewer.getProperties();
    } catch (err: any) {
      throw new Error(`Viewer's .getProperties() error.`, {cause: err});
    }
    const newProps: Record<string, string | boolean> = {};
    Object.keys(optns).filter((k) => typeof optns[k] === 'boolean').forEach((k) => newProps[k] = !optns[k]);
    props.filter((p: DG.Property) => p.choices !== null)
      .forEach((p: DG.Property) => newProps[p.name] = p.choices.find((c: any) => c !== optns[p.name])!);
    viewer.setOptions(newProps);
    await delay(300);
    const layout = tv.saveLayout();
    const oldProps = viewer.getOptions().look;
    tv.resetLayout();
    res.push(Array.from(tv.viewers).length);
    tv.loadLayout(layout);
    const selector1 = `${viewerName} ${tag}`;
    await awaitCheck(() => document.querySelector(selector1) !== null,
      'cannot load viewer from layout', 3000);
    res.push(Array.from(tv.viewers).length);
    viewer = Array.from(tv.viewers).find((v: any) => v.type !== 'Grid')!;
    expectArray(res, [2, 1, 2]);
    expect(JSON.stringify(viewer.getOptions().look), JSON.stringify(oldProps));
    if (options?.arbitraryDfTest !== false) {
      grok.shell.closeAll();
      await delay(100);
      tv = grok.shell.addTableView(catDF);
      try {
        viewer = tv.addViewer(v);
      } catch (e) {
        grok.shell.closeAll();
        DG.Balloon.closeAll();
        return;
      }
      await awaitCheck(() => document.querySelector(selector) !== null,
        'cannot load viewer on arbitrary dataset', 3000);
    }
  } finally {
    // closeAll() is handling by common test workflow
    // grok.shell.closeAll();
    // DG.Balloon.closeAll();
  }
}
