import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import { UsageWidget } from './widgets/usage-widget';
import { PackageUsageWidget } from './widgets/package-usage-widget';
import '../css/usage_analysis.css';
import '../css/test_track.css';
import { ViewHandler } from './view-handler';
import { TestTrack } from './test-track/app';
import { ReportsWidget } from "./widgets/reports-widget";
import { ReportingApp } from "./reporting/reporting_app";
import { TestAnalysesManager } from './test-analysis/testAnalysesManager';
import { TestAnalysisApp } from './test-analysis/app';

import { getDate } from './utils';
import dayjs from "dayjs";


export const _package = new DG.Package();


//name: Test Analysis
//tags: app
//meta.url: /tests/analysis
//output: view v
export async function TestAnalysis(): Promise<DG.ViewBase| null > { 
  const handler = new TestAnalysisApp();
  await handler.init();
  return handler.view; 
}

//name: TestsList 
//meta.url: /tests/list
//output: dataframe df
export async function TestsList(): Promise<DG.DataFrame| undefined> { 
  const pacakageTests = await TestAnalysesManager.collectPackageTests();
  const packageTestsListMapped = pacakageTests.map((elem) => {
    return { 'name':  "test-package " + elem.packageName + ": " + elem.test.category + ": " + elem.test.name };
  });
  const manualTest = await TestAnalysesManager.collectManualTestNames();
  const manualTestsListMapped = manualTest.map((elem) => {
    return { 'name':  "test-manual " + elem };
  });
  const resultTestsList = manualTestsListMapped.concat(packageTestsListMapped);
  return DG.DataFrame.fromObjects(resultTestsList);
}

//name: TestsListJoined 
//meta.url: /tests/joinedlist
//output: dataframe df
export async function TestsListJoined(): Promise<DG.DataFrame| undefined> { 
  
  const pacakageTests = await TestAnalysesManager.collectPackageTests();
  const packageTestsListMapped = pacakageTests.map((elem) => {
    return { 'name':  "test-package " + elem.packageName + ": " + elem.test.category + ": " + elem.test.name };
  });
  const manualTest = await TestAnalysesManager.collectManualTestNames();
  const manualTestsListMapped = manualTest.map((elem) => {
    return { 'name':  "test-manual " + elem };
  });
  const resultTestsList = DG.DataFrame.fromObjects(manualTestsListMapped.concat(packageTestsListMapped));

  const builds: DG.DataFrame = await grok.functions.call('UsageAnalysis:Builds'); 
  const id = builds.get('id', 0); 

  const tests = await grok.functions.call('UsageAnalysis:getTestStatusesAcordingDF', { 'buildId': id, 'testslist': resultTestsList });
  return tests;
}


//name: BuildTests
//meta.runOnOpen: false
//meta.runOnInput: false
//input: string build {choices: UsageAnalysis:Builds}
//output: dataframe df
export async function BuildTests(build: any) {
  const builds: DG.DataFrame = await grok.functions.call('UsageAnalysis:Builds');
  let date = dayjs();
  let next = dayjs();
  for (let i = 0; i < builds.rowCount; i++) {
    if (builds.get('text', i) == build) {
      date = builds.get('build', i);
      next = builds.get('next', i);
      break;
    }
  }
  return await grok.functions.call('UsageAnalysis:BuildTestsData', {'dateStart': date, 'dateEnd': next});
}


//name: TestAnalysisReportForCurrentDay
//input: datetime date 
//output: dataframe df
export async function TestAnalysisReportForCurrentDay(date: any) {
  const tests = await TestAnalysesManager.collectPackageTests();
  const testsListMapped = tests.map((elem) => {
    return { 'name':  "test-package " + elem.packageName + ": " + elem.test.category + ": " + elem.test.name };
  });
  const testRuns = await grok.functions.call('UsageAnalysis:getServerStartTestResults', { 'date': getDate(new Date(date)), 'testslist': DG.DataFrame.fromObjects(testsListMapped) });
  return testRuns;
}


//name: Usage Analysis
//tags: app
//meta.url: /
//input: string path {isOptional: true; meta.url: true}
//input: string date {isOptional: true}
//input: string groups {isOptional: true}
//input: string packages {isOptional: true}
//input: map params {isOptional: true}
//output: view v
export async function usageAnalysisApp(path?: string, date?: string, groups?: string, packages?: string): Promise<DG.ViewBase | null> {
  const handler = new ViewHandler();
  await handler.init(date, groups, packages, path);
  return handler.view;
}

//name: Test Track
//tags: app
//meta.url: /tests/manager
//input: string path {isOptional: true; meta.url: true}
//input: map params {isOptional: true}
export function testTrackApp(): void {
  if (!grok.shell.dockManager.findNode(TestTrack.getInstance().root))
    TestTrack.getInstance().init();
}

//name: Reports
//tags: app
//meta.url: /reports
//input: string path {isOptional: true; meta.url: true}
//input: map params {isOptional: true}
//output: view v
export async function reportsApp(path?: string): Promise<DG.ViewBase> {
  const parent = grok.functions.getCurrentCall();
  const app = new ReportingApp(parent);
  await app.init(path);
  return app.view!;
}

//input: dynamic treeNode
//input: view browseView
export async function reportsAppTreeBrowser(treeNode: DG.TreeViewGroup, browseView: DG.BrowseView) {
  await treeNode.group('Reports', null, false).loadSources(grok.dapi.reports.by(10));
  await treeNode.group('Rules', null, false).loadSources(grok.dapi.rules.include('actions,actions.assignee').by(10));
}

//output: widget result
//tags: dashboard
//test: usageWidget()
export function usageWidget(): DG.Widget {
  return new UsageWidget();
}

//output: widget result
//tags: dashboard
//test: reportsWidget()
export async function reportsWidget(): Promise<DG.Widget | null> {
  const userGroup = await grok.dapi.groups.find(DG.User.current().group.id);
  if (userGroup.memberships.some((g) => g.friendlyName = 'Developers'))
    return new ReportsWidget();
  return null;
}

//name: packageUsageWidget
//input: object package
//output: widget result
export function packageUsageWidget(pack: DG.Package): DG.Widget {
  return new PackageUsageWidget(pack);
}

//tags: autostart
export function describeCurrentObj(): void {
  grok.events.onAccordionConstructed.subscribe((acc: DG.Accordion) => {
    const ent = acc.context;
    if (ent != null && ent.constructor.name === 'Package') {
      const pane = acc.addPane('Usage', () => ui.wait(async () => {
        let widget: HTMLElement;
        try {
          widget = packageUsageWidget(ent).root;
        } catch (e) {
          widget = ui.divText('Error on loading', { style: { color: 'var(--failure)' } });
        }
        return widget;
      }));
      const UAlink = ui.link('', async () => {
        grok.shell.v.path = `/apps/UsageAnalysis/Packages?date=this%20week&users=${(await grok.dapi.groups.getGroupsLookup('All users'))[0].id}&packages=${ent.name}`;
        grok.functions.eval('UsageAnalysis:usageAnalysisApp()');
      }, 'Open Usage Analysis');
      UAlink.style.marginLeft = '3px';
      const header = pane.root.querySelector('.d4-accordion-pane-header') as HTMLElement;
      header.appendChild(UAlink);
    }
  });
}

//name: Create JIRA ticket
//description: Creates JIRA ticket using current error log
//tags: panel, widgets
//input: string msg {semType: ErrorMessage}
//output: widget result
//condition: true
export function createJiraTicket(msg: string): DG.Widget {
  const root = ui.div();

  const summary = ui.stringInput('Summary', '');
  const description = ui.stringInput('Description', msg);

  const button = ui.bigButton('CREATE', () => {
    grok.data.query('Vnerozin:JiraCreateIssue', {
      'createRequest': JSON.stringify({
        'fields': {
          'project': {
            'key': 'GROK',
          },
          'summary': summary.value,
          'description': description.value,
          'issuetype': {
            'name': 'Bug',
          },
        },
      }),
      'updateHistory': false,
    }).then((t) => {
      grok.shell.info('Created');
    });
  });
  button.style.marginTop = '12px';

  root.appendChild(ui.inputs([summary, description]));
  root.appendChild(button);

  return new DG.Widget(root);
}
