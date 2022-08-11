/**
 * @jest-environment jsdom
 */

import * as utils from './test-node';
import puppeteer from 'puppeteer';

const P_START_TIMEOUT: number = 3600000;
let browser: puppeteer.Browser;
let page: puppeteer.Page;

beforeAll(async () => {
  const out = await utils.getBrowserPage(puppeteer);
  browser = out.browser;
  page = out.page;
}, P_START_TIMEOUT);

afterAll(async () => {
  await browser?.close();
});

expect.extend({
  checkOutput(received, expected, context) {
    if (received === expected) {
      return {
        message: () => context,
        pass: true
      };
    } else {
      return {
        message: () => context,
        pass: false
      };
    }
  }
});

it('TEST', async () => {
  const targetPackage:string = process.env.TARGET_PACKAGE ?? 'Bio';
  console.log(`Testing ${targetPackage} package`);

  const r = await page.evaluate((targetPackage):Promise<object> => {
    return new Promise<object>((resolve, reject) => {
      (<any>window).grok.functions.eval(targetPackage + ':test()').then((df: any) => {
        const cStatus = df.columns.byName('success');
        const cMessage = df.columns.byName('result');
        const cCat = df.columns.byName('category');
        const cName = df.columns.byName('name');
        let failed = false;
        let passReport = '';
        let failReport = '';
        for (let i = 0; i < df.rowCount; i++) {
          if (cStatus.get(i)) {
            passReport += `Test result : Success : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
          } else {
            failed = true;
            failReport += `Test result : Failed : ${targetPackage}.${cCat.get(i)}.${cName.get(i)} : ${cMessage.get(i)}\n`;
          }
        }
        resolve({failReport, passReport, failed});
      }).catch((e: any) => reject(e));
    });
  }, targetPackage);
  // @ts-ignore
  console.log(r.passReport);
  // @ts-ignore
  expect(r.failed).checkOutput(false, r.failReport);
}, 3600000);
