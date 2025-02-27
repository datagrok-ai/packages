/* eslint-disable max-len */
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import * as utils from '../utils/utils';
import * as color from '../utils/color-utils';
import * as Papa from 'papaparse';
import * as testUtils from '../utils/test-utils';
import { BrowserOptions, loadTestsList, runBrowser, ResultObject, saveCsvResults, printBrowsersResult, mergeBrowsersResults, Test, OrganizedTests as OrganizedTest, timeout, addColumnToCsv } from '../utils/test-utils';
import { setAlphabeticalOrder } from '../utils/order-functions';

const testInvocationTimeout = 3600000;

const availableCommandOptions = ['host', 'package', 'csv', 'gui', 'catchUnhandled', 'platform', 'core',
  'report', 'skip-build', 'skip-publish', 'path', 'record', 'verbose', 'benchmark', 'category', 'test', 'stress-test', 'link', 'tag', 'ci-cd', 'debug'];

const curDir = process.cwd();
const grokDir = path.join(os.homedir(), '.grok');
const confPath = path.join(grokDir, 'config.yaml');
const consoleLogOutputDir = path.join(curDir, 'test-console-output.log');
const csvReportDir = path.join(curDir, 'test-report.csv');

export async function test(args: TestArgs): Promise<boolean> {
  const config = yaml.load(fs.readFileSync(confPath, { encoding: 'utf-8' })) as utils.Config;

  isArgsValid(args);
  utils.setHost(args.host, config);

  let packageJsonData = undefined;
  if (!args.package)
    packageJsonData = JSON.parse(fs.readFileSync(path.join(curDir, 'package.json'), { encoding: 'utf-8' }))
  let packageName = args.package ? utils.kebabToCamelCase(args.package) : utils.kebabToCamelCase(utils.removeScope(packageJsonData.name));
  let packagesDir = path.basename(curDir) === "packages" ? curDir : path.dirname(curDir);

  console.log('Environment variable `TARGET_PACKAGE` is set to', packageName);

  if (args.platform && packageName !== 'ApiTests')
    color.warn('--platform flag can only be used in the ApiTests package');
  // if (args.core && packageName !== 'DevTools')
  //   color.warn('--core flag can only be used in the DevTools package');


  if (!args.package) {
    await testUtils.loadPackages(packagesDir,
      packageName,
      args.host,
      args['skip-publish'],
      args['skip-build'], args.link);
  }

  process.env.TARGET_PACKAGE = packageName;
  let res = await runTesting(args);
  if (args.csv)
    saveCsvResults([res.csv], csvReportDir);
  printBrowsersResult(res, args.verbose)
  if (res.failed) {
    if (res.verboseFailed === 'Package not found')
      testUtils.exitWithCode(0);
    testUtils.exitWithCode(1);
  }
  else
    testUtils.exitWithCode(0);
  return true;
}

function isArgsValid(args: TestArgs): boolean {
  const options = Object.keys(args).slice(1);
  if (args['_'].length > 1 || options.length > availableCommandOptions.length || (options.length > 0 &&
    !options.every((op) => availableCommandOptions.includes(op))))
    return false;
  return true;
}

async function runTesting(args: TestArgs): Promise<ResultObject> {
  color.info('Loading tests...');
  const loadedTests = await loadTestsList([process.env.TARGET_PACKAGE ?? ''], args.core);
  let testsObj: testUtils.Test[] = [];
  if (args['stress-test'] || args.benchmark) {
    for (let element of loadedTests) {
      if ((args.benchmark && !element.options.benchmark) || (args['stress-test'] && !element.options.stressTest))
        continue;
      testsObj.push(element);
    }
  }
  else
    testsObj = loadedTests

  const parsed: Test[][] = (setAlphabeticalOrder(testsObj, 1, 1));
  if (parsed.length == 0)
    return {
      failed: true,
      verbosePassed: 'Package not found',
      verboseSkipped: 'Package not found',
      verboseFailed: 'Package not found',
      passedAmount: 0,
      skippedAmount: 0,
      failedAmount: 0,
      csv: ''
    };
  let organized: OrganizedTest[] = parsed[0].map(testObj => ({
    package: testObj.packageName,
    params: {
      category: testObj.category,
      test: testObj.name,
      options: {
        catchUnhandled: args.catchUnhandled,
        report: args.report
      }
    }
  }));
  let filtered: OrganizedTest[] = [];
  let categoryRegex = new RegExp(`${args.category?.replaceAll(' ', '')}.*`)
  if (args.category) {
    for (let element of organized) {
      if ((categoryRegex.test(element.params.category.replaceAll(' ', '')))) {
        if (element.params.test === args.test || !args.test)
          filtered.push(element);
      }
    }
    organized = filtered;
  }
  if (args.verbose) {
    console.log(organized);
    console.log(`Tests total: ${organized.length}`);
  }
  color.info('Starting tests...');
  let testsResults: ResultObject[] = [];
  let r: ResultObject;
  let browserId = 1;
  await timeout(async () => {
    do {
      r = await runBrowser(organized, {
        benchmark: args.benchmark ?? false,
        stressTest: args['stress-test'] ?? false,
        catchUnhandled: args.catchUnhandled ?? false,
        gui: args.gui ?? false,
        record: args.record ?? false,
        report: args.report ?? false,
        verbose: args.verbose ?? false,
        ciCd: args['ci-cd'] ?? false,
        stopOnTimeout: true,
        debug: args['debug'] ?? false
      }, browserId, testInvocationTimeout);
      let testsLeft: OrganizedTest[] = [];
      let testsToReproduce: OrganizedTest[] = [];
      for (let testData of organized) {
        if (!r.verbosePassed.includes(`${testData.params.category}: ${testData.params.test}`) &&
          !r.verboseSkipped.includes(`${testData.params.category}: ${testData.params.test}`) &&
          !r.verboseFailed.includes(`${testData.params.category}: ${testData.params.test}`) &&
          !new RegExp(`${testData.params.category.trim()}[^\\n]*: (before|after)`).test(r.verboseFailed))
          testsLeft.push(testData);
        if (r.verboseFailed.includes(`${testData.params.category}: ${testData.params.test} :  Error:`)) {
          testsToReproduce.push(testData);
        }
      }
      if (testsToReproduce.length > 0) {
        let reproduced = await reproducedTest(args, testsToReproduce);
        for (let test of testsToReproduce) {
          let reproducedTest = reproduced.get(test);
          if (reproducedTest && !reproducedTest.failed)
            r = await updateResultsByReproduced(r, reproducedTest, test)
        }
      }
      r.csv = await addColumnToCsv(r.csv, "stress_test", args['stress-test'] ?? false);
      r.csv = await addColumnToCsv(r.csv, "benchmark", args.benchmark ?? false);
      testsResults.push(r);
      organized = testsLeft;
      browserId++;
      if (r.verboseFailed === 'Tests execution failed')
        break;
    }
    while (r.failed);
  }, testInvocationTimeout)
  return await mergeBrowsersResults(testsResults);
}

async function reproducedTest(args: TestArgs, testsToReproduce: OrganizedTest[]): Promise<Map<OrganizedTest, ResultObject>> {
  const res: Map<OrganizedTest, ResultObject> = new Map<OrganizedTest, ResultObject>();
  for (let test of testsToReproduce) {
    let r = await runBrowser([test], {
      benchmark: args.benchmark ?? false,
      catchUnhandled: false,
      gui: false,
      record: false,
      report: false,
      verbose: false,
      stopOnTimeout: true,
      reproduce: true,
      ciCd: args['ci-cd'] ?? false
    }, 0, testInvocationTimeout);
    if (test.params.category && test.params.test)
      res.set(test, r);
  }
  return res;
}

async function updateResultsByReproduced(curentResult: ResultObject, reproducedResult: ResultObject, testsParams: OrganizedTest): Promise<ResultObject> {
  const table2Dict: Record<string, Record<string, string>> = {};
  let table1 = readCSVResultData(curentResult.csv);
  let table2 = readCSVResultData(reproducedResult.csv);
  const flakingMap: Record<string, string> = {};
  table2.rows.forEach(row => {
    const key = `${row['category']},${row['name']}`;
    flakingMap[key] = row['flaking'];
  });

  table1.rows.forEach(row => {
    const key = `${row['category']},${row['name']}`;
    if (key in flakingMap) {
      row['flaking'] = flakingMap[key];
    }
  });

  curentResult.csv = Papa.unparse(table1.rows, { columns: table1.headers });;
  curentResult.verboseFailed = curentResult.verboseFailed.replaceAll(`${testsParams.params.category}: ${testsParams.params.test} :  Error:`, `${testsParams.params.category}: ${testsParams.params.test} : Flaking Error:`)
  return curentResult;
}

function readCSVResultData(data: string): { headers: string[], rows: Record<string, string>[] } {
  const parsed = Papa.parse(data, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`Error parsing CSV file: ${parsed.errors[0].message}`);
  }
  return { headers: parsed.meta.fields || [], rows: parsed.data as Record<string, string>[] };
}

interface TestArgs {
  _: string[],
  category?: string,
  test?: string,
  host?: string,
  package?: string,
  csv?: boolean,
  gui?: boolean,
  'debug'?: boolean,
  catchUnhandled?: boolean,
  report?: boolean,
  record?: boolean,
  'skip-build'?: boolean,
  'skip-publish'?: boolean,
  link?: boolean,
  verbose?: boolean,
  benchmark?: boolean,
  platform?: boolean,
  core?: boolean,
  'stress-test'?: boolean,
  'ci-cd'?: boolean
} 