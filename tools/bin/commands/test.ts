/* eslint-disable max-len */
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import yaml from 'js-yaml';
import * as utils from '../utils/utils';
import * as color from '../utils/color-utils';
import * as testUtils from '../utils/test-utils';


export function test(args: TestArgs): boolean {
  const options = Object.keys(args).slice(1);
  const commandOptions = ['host', 'package', 'csv', 'gui', 'catchUnhandled', 'platform', 'core',
    'report', 'skip-build', 'skip-publish', 'path', 'record', 'verbose', 'benchmark', 'category', 'test'];
  const nArgs = args['_'].length;
  const curDir = process.cwd();
  const grokDir = path.join(os.homedir(), '.grok');
  const confPath = path.join(grokDir, 'config.yaml');

  if (nArgs > 1 || options.length > commandOptions.length || (options.length > 0 &&
    !options.every((op) => commandOptions.includes(op))))
    return false;

  if (!fs.existsSync(confPath)) {
    color.error(`File \`${confPath}\` not found. Run \`grok config\` to set up the config file`);
    return false;
  }

  const config = yaml.load(fs.readFileSync(confPath, { encoding: 'utf-8' })) as utils.Config;

  if (args.host) {
    if (args.host in config.servers) {
      process.env.HOST = args.host;
      console.log('Environment variable `HOST` is set to', args.host);
    } else {
      color.error(`Unknown server alias. Please add it to ${confPath}`);
      return false;
    }
  } else if (config.default) {
    process.env.HOST = config.default;
    console.log('Environment variable `HOST` is set to', config.default);
  }

  let categoryToCheck: string | undefined = undefined;
  if (args.category) {
    categoryToCheck = args.category.toString();
  }

  let testToCheck: string | undefined = undefined;
  if (args.category && args.test) {
    testToCheck = args.test.toString();
  }

  if (args.package) {
    process.env.TARGET_PACKAGE = utils.kebabToCamelCase(args.package);
  } else {
    if (!utils.isPackageDir(curDir)) {
      color.error('File `package.json` not found. Run the command from the package directory or specify plugin using \'--package\' option');
      return false;
    } else {
      const packageData = JSON.parse(fs.readFileSync(path.join(curDir, 'package.json'), { encoding: 'utf-8' }));
      if (packageData.name) {
        process.env.TARGET_PACKAGE = utils.kebabToCamelCase(utils.removeScope(packageData.name));
      } else {
        color.error('Invalid package name. Set the `name` field in `package.json`');
        return false;
      }
    }
  }

  console.log('Environment variable `TARGET_PACKAGE` is set to', process.env.TARGET_PACKAGE);


  if (args.platform && process.env.TARGET_PACKAGE !== 'ApiTests') {
    color.error('--platform flag can only be used in the ApiTests package');
    return false;
  }

  if (args.core && process.env.TARGET_PACKAGE !== 'DevTools') {
    color.error('--core flag can only be used in the DevTools package');
    return false;
  }

  if (args['skip-publish'] || args.package) {
    test()
  } else {
    if (args['skip-build']) {
      publish(test);
    } else {
      build(() => publish(test));
    }
  }

  function build(callback: Function): void {
    exec('npm run build', (err, stdout, stderr) => {
      color.info(`Building package...`);
      if (err) {
        console.log(stdout);
        throw err;
      } else {
        console.log(stdout);
        color.warn(stderr);
      }
      callback();
    });
  }

  function publish(callback: Function): void {
    exec(`grok publish ${process.platform === 'win32' ? '%HOST%' : '${HOST}'}`, (err, stdout, stderr) => {
      color.info(`Publishing package "${process.env.TARGET_PACKAGE}" to ${process.env.HOST}...`);
      if (err)
        throw err;
      else {
        console.log(stdout);
        color.warn(stderr);
      }
      callback();
    });
  }

  function test(): void {
    color.info('Starting tests...');
    const P_START_TIMEOUT: number = 900000;
    let browser: Browser;
    let page: Page;
    let recorder: PuppeteerScreenRecorder;
    type resultObject = {
      failReport: string, skipReport: string, passReport: string,
      failed: boolean, csv?: string, countReport: { skip: number, pass: number }
    };

    function init(time: number): Promise<void> {
      const params = Object.assign({}, testUtils.defaultLaunchParameters);
      if (args.gui)
        params['headless'] = false;
      return testUtils.timeout(async () => {
        try {
          const out = await testUtils.getBrowserPage(puppeteer, params);
          browser = out.browser;
          page = out.page;
          recorder = new PuppeteerScreenRecorder(page, testUtils.recorderConfig);
        } catch (e) {
          throw e;
        }
      }, time);
    }

    function runTest(timeout: number, options: {
      path?: string, catchUnhandled?: boolean, core?: boolean,
      report?: boolean, record?: boolean, verbose?: boolean, benchmark?: boolean, platform?: boolean, category?:string, test?:string
    } = {}): Promise<resultObject> {
      return testUtils.timeout(async () => {
        const consoleLogOutputDir = './test-console-output.log';
        function addLogsToFile(msg: any) {
          fs.appendFileSync(consoleLogOutputDir, `${msg}`);
        }
        await page.exposeFunction("addLogsToFile", addLogsToFile);

        if (options.record) {
          fs.writeFileSync(consoleLogOutputDir, ``);
          await recorder.start('./test-record.mp4');
          page.on('console', (msg) => { addLogsToFile(`CONSOLE LOG ENTRY: ${msg.text()}\n`); });
          page.on('pageerror', (error) => {
            addLogsToFile(`CONSOLE LOG ERROR: ${error.message}\n`);
          });
          page.on('response', (response) => {
            addLogsToFile(`CONSOLE LOG REQUEST: ${response.status()}, ${response.url()}\n`);
          });
        }
        const targetPackage: string = process.env.TARGET_PACKAGE ?? '#{PACKAGE_NAMESPACE}';
        console.log(`Testing ${targetPackage} package...\n`);
        const r: resultObject = await page.evaluate((targetPackage, options, testContext): Promise<resultObject> => {
          if (options.benchmark)
            (<any>window).DG.Test.isInBenchmark = true;
          return new Promise<resultObject>((resolve, reject) => {
            const params: {
              category?: string,
              test?: string,
              testContext: testUtils.TestContext,
              skipCore?: boolean,
              verbose?: boolean
            } = {
              testContext: testContext,
              category: options.category,
              test: options.test
            };
            if (options.path) {
              const split = options.path.split(' -- ');
              params.category = split[0];
              params.test = split[1];
            }

            if (targetPackage === 'DevTools') {
              params.skipCore = options.core ? false : true;
              params.verbose = options.verbose === true;
            }
            (<any>window).grok.functions.call(`${targetPackage}:${options.platform ? 'testPlatform' : 'test'}`, params).then((df: any) => {
              let failed = false;
              let skipReport = '';
              let passReport = '';
              let failReport = '';
              const countReport = { skip: 0, pass: 0 };

              if (df == null) {
                failed = true;
                failReport = `Fail reason: No package tests found${options.path ? ' for path "' + options.path + '"' : ''}`;
                resolve({ failReport, skipReport, passReport, failed, countReport });
                return;
              }

              const cStatus = df.columns.byName('success');
              const cSkipped = df.columns.byName('skipped');
              const cMessage = df.columns.byName('result');
              const cCat = df.columns.byName('category');
              const cName = df.columns.byName('name');
              const cTime = df.columns.byName('ms');
              for (let i = 0; i < df.rowCount; i++) {
                if (cStatus.get(i)) {
                  if (cSkipped.get(i)) {
                    skipReport += `Test result : Skipped : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                    countReport.skip += 1;
                  } else {
                    passReport += `Test result : Success : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                    countReport.pass += 1;
                  }
                } else {
                  failed = true;
                  failReport += `Test result : Failed : ${cTime.get(i)} : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
                }
              }
              if (!options.verbose)
                df.rows.removeWhere((r: any) => r.get('success'));
              const csv = df.toCsv();
              resolve({ failReport, skipReport, passReport, failed, csv, countReport });
            }).catch((e: any) => {
              const stack = ((<any>window).DG.Logger.translateStackTrace(e.stack)).then(() => {
                resolve({
                  failReport: `${e.message}\n${stack}`,
                  skipReport: '',
                  passReport: '',
                  failed: true,
                  csv: '',
                  countReport: { skip: 0, pass: 0 }
                });
              });
            });
          });
        }, targetPackage, options, new testUtils.TestContext(options.catchUnhandled, options.report));

        if (options.record) {
          await recorder.stop();
        }
        return r;
      }, timeout);
    }

    (async () => {
      try {
        await init(P_START_TIMEOUT);
        color.success('Initialization completed.');
      } catch (e) {
        color.error('Initialization failed.');
        throw e;
      }

      const r = await runTest(7200000, {
        path: args.path, verbose: args.verbose, platform: args.platform,
        catchUnhandled: args.catchUnhandled, report: args.report, record: args.record, benchmark: args.benchmark,
        core: args.core, category: categoryToCheck, test: testToCheck
      });

      if (r.csv && args.csv) {
        fs.writeFileSync(path.join(curDir, 'test-report.csv'), r.csv, 'utf8');
        color.info('Saved `test-report.csv`\n');
      }

      if (r.passReport && args.verbose)
        console.log(r.passReport);
      else
        console.log('Passed tests: ' + r.countReport.pass);

      if (r.skipReport && args.verbose)
        console.log(r.skipReport);
      else
        console.log('Skipped tests: ' + r.countReport.skip);

      if (r.failed) {
        console.log(r.failReport);
        color.fail('Tests failed.');
        testUtils.exitWithCode(1);
      } else {
        color.success('Tests passed.');
        testUtils.exitWithCode(0);
      }

      //@ts-ignore
      if (browser != null)
        await browser.close();
    })();
  }

  return true;
}

interface TestArgs {
  _: string[],
  category?: any,
  test?: any,
  path?: string,
  host?: string,
  package?: string,
  csv?: boolean,
  gui?: boolean,
  catchUnhandled?: boolean,
  report?: boolean,
  record?: boolean,
  'skip-build'?: boolean,
  'skip-publish'?: boolean,
  verbose?: boolean,
  benchmark?: boolean,
  platform?: boolean,
  core?: boolean
}
