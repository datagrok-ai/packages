/* eslint-disable max-len */
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import * as utils from '../utils/utils';
import * as testUtils from '../utils/test-utils';
import { setRandomOrder, setAlphabeticalOrder, setPackageRandomOrder, setPackageAlphabeticalOrder, setTestToBrowserOrder } from '../utils/order-functions';
import { BrowserOptions, loadTestsList, saveCsvResults, printBrowsersResult, runBrowser, ResultObject, Test, OrganizedTests, addColumnToCsv } from '../utils/test-utils';
import * as Papa from 'papaparse';

enum order {
  random = 0,
  alphabetical = 1,
  packageRandom = 2,
  packageAlphabetical = 3,
  testToBrowser = 4,
}

function getEnumOrder(orderStr: string): order {
  switch (orderStr.toLowerCase().replaceAll("-", "")) {
    case "random":
    case "shuffle":
      return order.random;
      break;
    case "alphabetical":
    case "atoz":
      return order.alphabetical;
      break;
    case "packagerandom":
    case "packageshuffle":
      return order.packageRandom;
      break;
    case "packagealphabetical":
    case "packageatoz":
      return order.packageAlphabetical;
      break;
    case "testtobrowser":
      return order.testToBrowser;
      break;
  }
  return order.random;
}

const curDir = process.cwd();
const grokDir = path.join(os.homedir(), '.grok');
const confPath = path.join(grokDir, 'config.yaml');
const csvReportDir = path.join(curDir, 'test-report.csv');

const testInvocationTimeout = 7200000;

const orderingFunctions: Map<order, (tests: Test[], browsersAmount: number, testRepeats: number) => Test[][]> = new Map<order, (tests: Test[], browsersAmount: number, testRepeats: number) => Test[][]>([
  [order.random, setRandomOrder],
  [order.alphabetical, setAlphabeticalOrder],
  [order.packageRandom, setPackageRandomOrder],
  [order.packageAlphabetical, setPackageAlphabeticalOrder],
  [order.testToBrowser, setTestToBrowserOrder]
]);
let browsersStarted: number = 0;

export async function testAll(args: TestArgs): Promise<boolean> {
  const config = yaml.load(fs.readFileSync(confPath, { encoding: 'utf-8' })) as utils.Config;

  utils.setHost(args.host, config);
  let packagesToRun = await testUtils.loadPackages(curDir, args.packages, args.host, args['skip-publish'], args['skip-build']);

  let testsObj = await loadTestsList(packagesToRun, args.core);
  let filteredTests: Test[] = await filterTests(testsObj, (args.tags ?? "").split(" "), args['stress-test'], args.benchmark);
  let browsersOrder = await setBrowsersOrder(filteredTests, getEnumOrder(args.order ?? ''), args['browsers-count'], args.testRepeat);

  let testsResults = await runTests(browsersOrder, {
    benchmark: args.benchmark ?? false,
    stressTest: args['stress-test'] ?? false,
    catchUnhandled: args.catchUnhandled ?? false,
    gui: args.gui ?? false,
    record: args.record ?? false,
    report: args.report ?? false,
    verbose: args.verbose ?? false,
    debug: args['debug'] ?? false
  });

  let i = 0;
  for (let result of testsResults) {
    console.log(`\nBrowser #${i++} `)
    printBrowsersResult(result, args.verbose);
  }

  if (args.csv) {
    saveCsvResults(testsResults.map(result => result.csv), csvReportDir);
  }

  return !(testsResults.map((test) => test.failed)).some(failStatus => failStatus === true);
}

async function filterTests(tests: Test[], tags: string[], stressTest: boolean = false, benchmark: boolean = false): Promise<Test[]> {
  let filteredTests: Test[] = [];
  let stressTestValue: boolean = tags.includes("stress-test") || stressTest;
  let benchmarkValue: boolean = benchmark;

  tags = tags.filter(tag => tag !== "stress-test" && tag != "")

  for (let test of tests) {
    if (benchmarkValue && test.options?.benchmark !== true)
      continue;
    if (stressTestValue && test.options?.stressTest !== true && !test.options?.tags?.includes("stressTest"))
      continue;

    const hasMatchingTags = tags.some(tag => test.options?.tags?.includes(tag));

    if (hasMatchingTags || tags?.length === 0)
      filteredTests.push(test);
  }

  return filteredTests;
}

async function setBrowsersOrder(tests: Test[], invocationOrder: order = 0, countOfBrowsers: number = 1, testRepeats: number = 1): Promise<Test[][]> {
  let resultOrder: Test[][] = [];

  let orderingFunction = orderingFunctions.get(invocationOrder);
  if (orderingFunction !== undefined)
    resultOrder = orderingFunction(tests, countOfBrowsers, testRepeats);
  else
    throw new Error("Cannot find ordering function");
  return resultOrder;
}

async function runTests(browsersOrder: Test[][], browserOptions: BrowserOptions): Promise<ResultObject[]> {
  let browsersCommands: OrganizedTests[][] = [];

  for (let browserOrder of browsersOrder)
    browsersCommands.push(browserOrder.map(testObj => ({
      package: testObj.packageName,
      params: {
        category: testObj.category,
        test: testObj.name,
        options: {
          catchUnhandled: browserOptions.catchUnhandled,
          report: browserOptions.report
        }
      }
    })))

  let browsersPromises: Promise<ResultObject>[] = [];

  for (let browserCommands of browsersCommands) {
    browsersPromises.push(runBrowser(browserCommands, browserOptions, browsersStarted++, testInvocationTimeout));
  }
  let resultObjects = await Promise.all(browsersPromises);
  for (let i = 0; i < resultObjects.length; i++) {
    resultObjects[i].csv = await addColumnToCsv(resultObjects[i].csv, "browser", i);
    resultObjects[i].csv = await addColumnToCsv(resultObjects[i].csv, "stress_test", browserOptions.stressTest ?? false);
    resultObjects[i].csv = await addColumnToCsv(resultObjects[i].csv, "benchmark", browserOptions.benchmark ?? false);
  }
  return resultObjects;
}

interface TestArgs {
  _: string[];

  host?: string;
  'link-package'?: boolean;
  'skip-build'?: boolean;
  'skip-publish'?: boolean;

  catchUnhandled?: boolean,
  core?: boolean,
  csv?: boolean;
  gui?: boolean;
  'debug'?: boolean,
  record?: boolean;
  report?: boolean;
  verbose?: boolean;

  benchmark?: boolean;
  order?: string;
  packages?: string;
  'stress-test'?: boolean;
  tags?: string;
  testRepeat?: number;
  'browsers-count'?: number;
}
