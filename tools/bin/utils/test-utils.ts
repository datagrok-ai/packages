import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import * as utils from '../utils/utils';
import { PuppeteerNode } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { spaceToCamelCase } from '../utils/utils';
import puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import * as color from '../utils/color-utils';
import Papa from 'papaparse';
 
const fetch = require('node-fetch');

const grokDir = path.join(os.homedir(), '.grok');
const confPath = path.join(grokDir, 'config.yaml');
const testCollectionTimeout = 100000;

export const defaultLaunchParameters: utils.Indexable = {
  args: [
    '--disable-dev-shm-usage',
    '--disable-features=site-per-process',
    '--window-size=1920,1080'
  ],
  ignoreHTTPSErrors: true,
  headless: 'new',
  protocolTimeout: 0,
};

export async function getToken(url: string, key: string) {
  const response = await fetch(`${url}/users/login/dev/${key}`, { method: 'POST' });
  const json = await response.json();
  if (json.isSuccess == true)
    return json.token;
  else
    throw new Error('Unable to login to server. Check your dev key');
}

export async function getWebUrl(url: string, token: string) {
  const response = await fetch(`${url}/admin/plugins/admin/settings`, { headers: { Authorization: token } });
  const json = await response.json();
  return json.settings.webRoot;
}

export function getDevKey(hostKey: string): { url: string, key: string } {
  const config = yaml.load(fs.readFileSync(confPath, 'utf8')) as utils.Config;
  let host = hostKey == '' ? config.default : hostKey;
  host = host.trim();
  const urls = utils.mapURL(config);
  let key = '';
  let url = '';
  try {
    let url = new URL(host).href;
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (url in urls) key = config['servers'][urls[url]]['key'];
  } catch (error) {
    if (config['servers'][host] == null)
      throw new Error(`Unknown server alias. Please add it to ${confPath}`);
    url = config['servers'][host]['url'];
    key = config['servers'][host]['key'];
  }
  return { url, key };
}

export async function getBrowserPage(puppeteer: PuppeteerNode, params: {} = defaultLaunchParameters): Promise<{ browser: Browser, page: Page }> {
  let url: string = process.env.HOST ?? '';
  const cfg = getDevKey(url);
  url = cfg.url;

  const key = cfg.key;
  const token = await getToken(url, key);
  url = await getWebUrl(url, token);
  console.log(`Using web root: ${url}`);
  
  const browser = await puppeteer.launch(params);

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });
  page.setDefaultNavigationTimeout(0);
  await page.goto(`${url}/oauth/`);
  await page.setCookie({ name: 'auth', value: token });
  await page.evaluate((token: string) => {
    window.localStorage.setItem('auth', token);
  }, token);
  await page.goto(url);
  try {
    //    await page.waitForSelector('.grok-preloader', { timeout: 1800000 });
    await page.waitForFunction(() => document.querySelector('.grok-preloader') == null, { timeout: 3600000 });
  } catch (error) {
    throw error;
  }
  return { browser, page };
}

export function runWithTimeout(timeout: number, f: () => any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Timeout exceeded: ${timeout} ms`)), timeout);
    try {
      const resolveValue = await f();
      clearTimeout(timeoutId);
      resolve(resolveValue);
    } catch (e) {
      reject(e);
    }
  });
}

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

export function exitWithCode(code: number): void {
  console.log(`Exiting with code ${code}`);
  process.exit(code);
}

export const recorderConfig = {
  followNewTab: true,
  fps: 25,
  ffmpeg_Path: null,
  videoFrame: {
    width: 1280,
    height: 630,
  },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 1000,
  autopad: {
    color: 'black',
  },
  // aspectRatio: '16:9',
};

export async function loadPackages(packagesDir: string, packagesToLoad?: string, host?: string, skipPublish?: boolean, skipBuild?: boolean, linkPackage?: boolean, release?: boolean): Promise<string[]> {
  let packagesToRun = new Map<string, boolean>();
  let hostString = host === undefined ? `` : `${host}`;
  if (packagesToLoad !== "all") {
    for (let pacakgeName of (packagesToLoad ?? "").split(' ')) {
      if ((pacakgeName ?? '').length !== 0)
        packagesToRun.set(spaceToCamelCase(pacakgeName).toLocaleLowerCase(), false);
    }
  }

  for (let dirName of fs.readdirSync(packagesDir)) {
    let packageDir = path.join(packagesDir, dirName);
    if (!fs.lstatSync(packageDir).isFile()) {

      try {
        const packageJsonData = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), { encoding: 'utf-8' }));
        const packageFriendlyName = packagesToRun.get(spaceToCamelCase(packageJsonData["friendlyName"] ?? packageJsonData["name"].split("/")[1] ?? packageJsonData["name"] ?? '').toLocaleLowerCase() ?? "") ?? packagesToRun.get(dirName);
      
        if (utils.isPackageDir(packageDir) && (packageFriendlyName !== undefined || packagesToLoad === "all")) {
          try {
            process.stdout.write(`Building and publishing ${dirName}...`);
            if (skipPublish != true) {
              await utils.runScript(`npm install`, packageDir);
              if (linkPackage)
                await utils.runScript(`grok link`, packageDir);
              if (skipBuild != true)
                await utils.runScript(`npm run build`, packageDir);
              await utils.runScript(`grok publish ${hostString}${release ? ' --release' : ''}`, packageDir);
            }
            packagesToRun.set(dirName, true);
            process.stdout.write(` success!\n`);
          }
          catch (e: any) {
            process.stdout.write(` fail!\n`);
          }
        }
      }
      catch (e: any) {
        if (utils.isPackageDir(packageDir) && (packagesToRun.get(spaceToCamelCase(dirName).toLocaleLowerCase()) !== undefined || packagesToLoad === "all"))
          console.log(`Couldn't read package.json  ${dirName}`);
      }
    }
  }
  console.log();
  return Array.from(packagesToRun)
    .filter(([key, value]) => value === true)
    .map(([key]) => key);;
}

export async function loadTestsList(packages: string[], core: boolean = false): Promise<Test[]> {
  var packageTestsData = await timeout(async () => {
    const params = Object.assign({}, defaultLaunchParameters);
    // params['headless'] = false;
    const out = await getBrowserPage(puppeteer, params);
    const browser: Browser = out.browser;
    const page: Page = out.page;
    const r = await page.evaluate((packages, coreTests): Promise<LoadedPackageData[] | {failReport: string}> => {
      return new Promise<LoadedPackageData[] | {failReport: string}>((resolve, reject) => {
        const promises: any[] = [];
        try {
          packages.map((packageName: string) => {
            const p = (<any>window).DG.Func.find({ package: packageName, name: 'test' })[0]?.package;
            if (p) {
              try {
                promises.push(p.getTests(coreTests).catch((e: any) => {
                  console.error('something else went wrong with collecting package tests')
                  console.error(e?.message)
                })
                  .then((ts: any) => ({ packageName: packageName, tests: ts })))
              } catch (e: any) {
                console.error('something went wrong while adding test collection promise');
                console.error(e.message);
              }
            }
          });

        } catch (err) {
          console.error("Error during evaluation in browser context:", err);
          reject();
        }
        Promise.all(promises)
          .then((results: any[]) => {
            resolve(results);
          }).catch((e: any) => {
            const stack = ((<any>window).DG.Logger.translateStackTrace(e.stack)).then(() => {
              resolve({
                failReport: `${e.message}\n${stack}`
              });
            });
          });
      });
    }, packages, core);
    if (browser != null) {
      await browser.close();
    }

    return r;
  }, testCollectionTimeout);
  let testsList: Test[] = [];

  for (let testPackage of packageTestsData) {
    for (const key in testPackage.tests) {
      if (testPackage.tests.hasOwnProperty(key)) {
        for (let testValue of testPackage.tests[key].tests) {
          testValue.packageName = testPackage.packageName;
          testsList.push(testValue);
        }
      }
    }
  }
  return testsList;
}

export function addLogsToFile(filePath: string, stringToSave: string) {
  fs.appendFileSync(filePath, `${stringToSave}`);
}

export function printBrowsersResult(browserResult: ResultObject, verbose: boolean = false) {
  if (verbose) {
    if ((browserResult.passedAmount ?? 0) > 0 && (browserResult.verbosePassed ?? []).length > 0) {
      console.log("Passed: ");
      console.log(browserResult.verbosePassed);
    }
    if ((browserResult.skippedAmount ?? 0) > 0 && (browserResult.verboseSkipped ?? []).length > 0) {
      console.log("Skipped: ");
      console.log(browserResult.verboseSkipped);
    }
  }

  if ((browserResult.failedAmount ?? 0) > 0 && (browserResult.verboseFailed ?? []).length > 0) {
    console.log("Failed: ");
    console.log(browserResult.verboseFailed);
  }
  console.log("Passed amount:  " + browserResult?.passedAmount);
  console.log("Skipped amount: " + browserResult?.skippedAmount);
  console.log("Failed amount:  " + browserResult?.failedAmount);

  if (browserResult.failed) {
    if (browserResult.verboseFailed === 'Package not found')
      color.fail('Tests not found');
    else
      color.fail('Tests failed.');
  } else {
    color.success('Tests passed.');
  }
}

export function saveCsvResults(stringToSave: string[], csvReportDir: string) {
  const modifiedStrings = stringToSave.map((str, index) => {
    if (index === 0) return str;
    return str.split('\n').slice(1).join('\n');
  });

  fs.writeFileSync(csvReportDir, modifiedStrings.join('\n'), 'utf8');
  color.info('Saved `test-report.csv`\n');
}

export async function runBrowser(testExecutionData: OrganizedTests[], browserOptions: BrowserOptions, browsersId: number, testInvocationTimeout: number = 3600000): Promise<ResultObject> {
  return await timeout(async () => {
    const params = Object.assign({}, defaultLaunchParameters);
    if (browserOptions.gui)
      params['headless'] = false;
    const out = await getBrowserPage(puppeteer, params);
    const browser: Browser = out.browser;
    const page: Page = out.page;
    const recorder = new PuppeteerScreenRecorder(page, recorderConfig);

    const currentBrowserNum = browsersId;
    const logsDir = `./test-console-output-${currentBrowserNum}.log`;
    const recordDir = `./test-record-${currentBrowserNum}.mp4`;

    if (browserOptions.record) {
      await recorder.start(recordDir);
      await page.exposeFunction("addLogsToFile", addLogsToFile);

      fs.writeFileSync(logsDir, ``);
      page.on('console', (msg) => { addLogsToFile(logsDir, `CONSOLE LOG ENTRY: ${msg.text()}\n`); });
      page.on('pageerror', (error) => { addLogsToFile(logsDir, `CONSOLE LOG ERROR: ${error.message}\n`); });
      page.on('response', (response) => {
        addLogsToFile(logsDir, `CONSOLE LOG REQUEST: ${response.status()}, ${response.url()}\n`);
      });
    }
    let testingResults = await page.evaluate((testData, options): Promise<ResultObject> => {
      if (options.benchmark)
        (<any>window).DG.Test.isInBenchmark = true;
      if (options.reproduce)
        (<any>window).DG.Test.isReproducing = true;
      if (options.ciCd)
        (<any>window).DG.Test.isCiCd = true;
      if (options.debug)
        (<any>window).DG.Test.isInDebug = true;

      return new Promise<any>((resolve, reject) => {
        (<any>window).DG.Utils.executeTests(testData, options.stopOnTimeout)
          .then((results: any) => {
            resolve(results);
          })
          .catch((e: any) => {
            resolve({
              failed: true,
              verbosePassed: "",
              verboseSkipped: "",
              verboseFailed: "Tests execution failed",
              passedAmount: 0,
              skippedAmount: 0,
              failedAmount: 1,
              csv: "",
              df: undefined
            })
          });
      })
    }, testExecutionData, browserOptions);

    if (browserOptions.record) {
      await recorder.stop();
    }

    if (browser != null) {
      await browser.close();
    }
    return testingResults;
  }, testInvocationTimeout);
}

export async function mergeBrowsersResults(browsersResults: ResultObject[]): Promise<ResultObject> {

  let mergedResult: ResultObject = {
    failed: browsersResults[0].failed,
    verbosePassed: browsersResults[0].verbosePassed,
    verboseSkipped: browsersResults[0].verboseSkipped,
    verboseFailed: browsersResults[0].verboseFailed,
    passedAmount: browsersResults[0].passedAmount,
    skippedAmount: browsersResults[0].skippedAmount,
    failedAmount: browsersResults[0].failedAmount,
    csv: browsersResults[0].csv
  }

  for (let browsersResult of browsersResults) {
    if (mergedResult.csv === browsersResult.csv)
      continue;

    mergedResult.failed = mergedResult.failed || browsersResult.failed;
    mergedResult.verbosePassed = `${mergedResult.verbosePassed.trim()}\n${browsersResult.verbosePassed.trim()}`;
    mergedResult.verboseFailed = `${mergedResult.verboseFailed.trim()}\n${browsersResult.verboseFailed.trim()}`;
    mergedResult.verboseSkipped = `${mergedResult.verboseSkipped.trim()}\n${browsersResult.verboseSkipped.trim()}`;

    mergedResult.passedAmount += browsersResult.passedAmount;
    mergedResult.failedAmount += browsersResult.failedAmount;
    mergedResult.skippedAmount += browsersResult.skippedAmount;

    const resultToMerdge1 = mergedResult.csv.trim().split('\n');
    const resultToMerdge2 = browsersResult.csv.trim().split('\n');

    const header = resultToMerdge1[0];
    mergedResult.csv = [
      header,
      ...resultToMerdge1.slice(1),
      ...resultToMerdge2.slice(1)
    ].join('\n');
  }
  return mergedResult;
}

export interface BrowserOptions {
  path?: string, catchUnhandled?: boolean, core?: boolean,
  report?: boolean, record?: boolean, verbose?: boolean, benchmark?: boolean, platform?: boolean, category?: string, test?: string,
  stressTest?: boolean, gui?: boolean, stopOnTimeout?: boolean, reproduce?: boolean, ciCd?: boolean, debug?:boolean
}

export type ResultObject = {
  failed: boolean,
  verbosePassed: string,
  verboseSkipped: string,
  verboseFailed: string,
  passedAmount: number,
  skippedAmount: number,
  failedAmount: number,
  csv: string
};

export class TestContext {
  catchUnhandled = true;
  report = false;

  constructor(catchUnhandled?: boolean, report?: boolean) {
    if (catchUnhandled !== undefined) this.catchUnhandled = catchUnhandled;
    if (report !== undefined) this.report = report;
  };
}

export type LoadedTest = {
  category: string,
  name: string,
}
export type LoadedPackageData = {
  packageName: string,
  tests: { [key: string]: LoadedTest }
}

export type Test = {
  category: string,
  name: string,
  packageName: string,
  options: {
    tags: string[],
    stressTest : boolean,
    benchmark : boolean
  }
}

export type OrganizedTests = {
  package: string,
  params: {
    category: string,
    test: string,
    options: {
      catchUnhandled: boolean | undefined,
      report: boolean | undefined
    }
  }
}

export async function addColumnToCsv(csv: string, columnName: string, defaultValue: string | number | boolean): Promise<string> {
  let result = csv;
  Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const dataWithDefaultColumn = results.data.map((row: any) => {
        row[columnName] = defaultValue;
        return row;
      });

      result = Papa.unparse(dataWithDefaultColumn, {
        header: true
      });
    }
  });
  return result;
}