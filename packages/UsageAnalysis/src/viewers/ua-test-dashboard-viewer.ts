import * as DG from 'datagrok-api/dg';
import { IndexPredicate } from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import { _properties } from '../package';

class Priority {
  static BLOCKER: string = 'BLOCKER';
  static INFO: string = 'INFO';
  static ERROR: string = 'ERROR';
  static RESOLVED: string = 'RESOLVED';

  static codeMapping: { [key: string]: number } = {
    [Priority.BLOCKER]: 3,
    [Priority.ERROR]: 2,
    [Priority.INFO]: 1,
    [Priority.RESOLVED]: 0,
  };

  static getMaxPriority(priorities: string[]): string {
    if (!priorities || priorities.length === 0)
      return '';

    return priorities.reduce((maxPriority, currentPriority) => {
      const maxCode = Priority.codeMapping[maxPriority] || 0;
      const currentCode = Priority.codeMapping[currentPriority] || 0;
      return currentCode > maxCode ? currentPriority : maxPriority;
    });
  }
}

class Verdict {
  priority: string;
  category: string;
  widget: HTMLElement;
  constructor(priority: string, category: string, widget: HTMLElement) {
    this.priority = priority;
    this.widget = widget;
    this.category = category;
  }
}

function getIconForVerdict(priority: string): HTMLElement {
  let icon: HTMLElement | undefined;
  if (priority == Priority.BLOCKER) {
    icon = ui.iconFA('exclamation-triangle', null, 'Is considered a blocker for the release');
    icon.style.color = DG.Color.toRgb(DG.Color.red);
  } else if (priority == Priority.ERROR) {
    icon = ui.iconFA('exclamation-circle', null, 'Errors to fix');
    icon.style.color = DG.Color.toRgb(DG.Color.red);
  } else if (priority == Priority.INFO) {
    icon = ui.iconFA('info-circle', null, 'Good to know, doesn\'t require immediate action');
    icon.style.color = DG.Color.toRgb(DG.Color.blue);
  } if (priority == Priority.RESOLVED) {
    icon = ui.iconFA('info-circle', null, 'Already resolved');
    icon.style.color = DG.Color.toRgb(DG.Color.green);
  }
  return icon!;
}

export class TestDashboardWidget extends DG.JsViewer {
  static isOpen: boolean = false;
  constructor() {
    super();
  }

  tickets: Set<string> = new Set();

  onFrameAttached(dataFrame: DG.DataFrame): void {
    this.root.childNodes.forEach((node, _idx, _parent) => node.remove());
    this.root.appendChild(ui.wait(async () => {
      let tableNames: RegExp[] = [/Benchmark/, /Test.*Track/];
      let promises: Promise<void>[] = tableNames.map((name) => new Promise((resolve, reject) => {
        const checkCondition = () => {
          try {
            if (grok.shell.tables.find((df) => df.name.match(name) != null)) {
              resolve();
            } else {
              setTimeout(checkCondition, 1000);
            }
          } catch (error) {
            reject(error);
          }
        };
        checkCondition();
      }));
      await Promise.all(promises);
      let d = ui.div();
      let verdicts: Verdict[] = [];
      verdicts.push(...this.verdictsOnCorrectness(dataFrame));
      verdicts.push(...this.verdictsOnPerformance());
      verdicts.push(...this.verdictsOnTestTrack());
      verdicts.push(...(await this.unaddressedTests(dataFrame)));
      verdicts.push(...(await this.verdictsForTickets()));
      verdicts.push(...this.getBuildInfos(dataFrame));
      let status = Priority.getMaxPriority(verdicts.map((v) => v.priority));
      if (status == Priority.BLOCKER)
        d.append(ui.h1('Platform is not release-ready ❌❌❌', { style: { color: DG.Color.toRgb(DG.Color.red) } }));
      else
        d.append(ui.h1('Green light! 🚀🚀🚀', { style: { color: DG.Color.toRgb(DG.Color.darkGreen) } }));
      
      verdicts.sort((a, b) => {
        let priorityA = Priority.codeMapping[a.priority];
        let priorityB = Priority.codeMapping[b.priority];
        if (priorityA != priorityB)
          return priorityB - priorityA;
        return a.category == b.category ? 0 :
              (a.category < b.category ? 1 : -1);
      });

      let list: HTMLElement = this.composeResultList(verdicts);
      d.append(list);
      // d.style.maxWidth = '300px';
      return d;
    }));
  }

  verdictsOnCorrectness(df: DG.DataFrame): Verdict[] {
    let verdicts: Verdict[] = [];
    if (df.col('jira') != null)
      this.jiraTickets(df.col('jira')!);
    if (df.col('ignore?') != null)
      verdicts.push(...this.ignoredTests(df));
    verdicts.push(...this.majorPackages(df));
    return verdicts;
  }
  verdictsOnPerformance(): Verdict[] {
    let verdicts: Verdict[] = [];
    let df = grok.shell.tables.find((df) => df.name.match(/Benchmark/));
    if (df == null)
      return verdicts;
    verdicts.push(...this.performanceDowngrades(df));
    return verdicts;
  }
  verdictsOnTestTrack(): Verdict[] {
    let verdicts: Verdict[] = [];
    let df = grok.shell.tables.find((df) => df.name.match(/Test.*Track/));
    if (df == null)
      return verdicts;
    for (let col of df.columns) {
      if (col.name.startsWith('ticket'))
        this.jiraTickets(col);
    }
    verdicts.push(...this.testTrackDowngrades(df));
    return verdicts;
  }
  jiraTickets(jiraCol: DG.Column<string>): Verdict[] {
    try {
      for (var i = 0; i < jiraCol.length; i++)
        if ((jiraCol.getString(i)?.length ?? 0) > 0)
          jiraCol.getString(i).split(',').forEach((ticket, _) => {
            let match = ticket.match(/GROK\-\d+/);
            if (match != null && match[0] != undefined)
              this.tickets.add(match[0]);
          });
      return [];
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to check jira tickets']),
        ui.span([x])
      ]))];
    }
  }
  majorPackages(df: DG.DataFrame): Verdict[] {
    try {
      let packageList = ['datlas', 'ddt', 'ddtx', 'dinq', 'ApiTests', 'ApiSamples', 'Bio', 'Chem', 'DevTools'];
      let testColumn: DG.Column = df.col('test')!;
      let failingColumn: DG.Column<boolean> = df.col('needs_attention')!;
      let brokenPackages: Map<string, string[]> = new Map();
      for (var i = 0; i < packageList.length; i++)
        for (var row = 0; row < testColumn.length; row++)
          if (testColumn.getString(row)?.startsWith(packageList[i]))
            if (failingColumn.get(row)) {
              if (!brokenPackages.has(packageList[i]))
                brokenPackages.set(packageList[i], []);
              brokenPackages.get(packageList[i])!.push(testColumn.getString(row).slice(packageList[i].length));
            }

      let verdicts: Verdict[] = [];
      for (const packageName of brokenPackages.keys()) {
        let widget: DG.Widget = DG.Widget.fromRoot(ui.span(['package ' + packageName + ' has broken tests']));
        widget.root.onclick = (ev: MouseEvent) => {
          df.filter.init((row) => testColumn.getString(row)?.startsWith(packageName));
          df.selection.init((row) => testColumn.getString(row)?.startsWith(packageName) && (failingColumn.get(row) ?? false));
          grok.shell.tv.grid.sort(['needs_attention'], [false]);
        };
        ui.tooltip.bind(widget.root, 'Click to filter');
        verdicts.push(new Verdict(Priority.BLOCKER, 'Critical package failure', widget.root));
      }
      return verdicts;
    } catch (x) {
      return [new Verdict(Priority.BLOCKER, 'Unhandled exception', ui.div([
        ui.span(['Failed to verify major packages']),
        ui.span([x])
      ]))];
    }
  }
  getBuildInfos(df: DG.DataFrame): Verdict[] {
    try {
      let builds = Array.from(df.columns.toList().filter((col) => col.name.endsWith('date')).map((col) => col.name.split(' ')[0]));
      builds.sort((a, b) => parseInt(a) - parseInt(b));
      let res = ui.table(builds, (build, idx) => {
          console.log(build);
          console.log(df.col(build + ' instance')?.categories[0] ?? 'unknown');
          console.log(df.col(build + ' commit')?.categories[0] ?? 'unknown');
          let date = null;
          for (var i = 0; i < df.rowCount; i++) {
            let curDate = df.get(build + ' build_date', i);
            if (curDate != undefined) {
              date = curDate;
              break;
            }
          }
          return [ui.span([build]),
            ui.tableFromMap({'Instance': df.col(build + ' instance')?.categories[0] ?? 'unknown',
                             'Commit': df.col(build + ' commit')?.categories[0] ?? 'unknown',
                             'Build date': date ?? 'unknown'})
          ];
        }
      );
      return [new Verdict(Priority.INFO, 'Builds info', res)];
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to get build infos']),
        ui.span([x])
      ]))];
    }
  }
  async unaddressedTests(df: DG.DataFrame): Promise<Verdict[]> {
    try {
      let verdicts: Verdict[] = [];
      let failingColumn: DG.Column<boolean> = df.col('needs_attention')!;
      let jiraCol = df.col('jira')!;
      let testColumn: DG.Column = df.col('test')!;
      let ownerColumn: DG.Column = df.col('owner')!;

      let unaddressedTests: { [owner: string]: string[] } = {};
      let predicate: IndexPredicate = (row) => {
        return failingColumn.get(row)! && (!jiraCol.getString(row) || jiraCol.getString(row).trim() === '');
      };

      for (let i = 0; i < df.rowCount; i++) {
        if (predicate(i)) {
          let owner = ownerColumn.getString(i) || 'unknown';
          if (!unaddressedTests[owner])
            unaddressedTests[owner] = [];
          unaddressedTests[owner].push(testColumn.getString(i));
        }
      }

      if (Object.keys(unaddressedTests).length > 0) {
        let summary = ui.div([ui.span(['Owners with failing tests:\n'])]);
        for (const [owner, tests] of Object.entries(unaddressedTests)) {
          const login: string = owner.match(/\w+@datagrok.ai/) ? owner.match(/\w+@datagrok.ai/)?.[0].split('@')[0]! : owner
          let userIcon : HTMLElement | undefined;
          if (login == null) {
            userIcon = ui.span([owner]);
          } else {
            const user = await grok.dapi.users.filter(`login="${login}"`).first();
            if (user == undefined)
              userIcon = ui.span([login]);
            else
              userIcon = ui.render(user.toMarkup());
          }
          let widget: DG.Widget = DG.Widget.fromRoot(ui.div([userIcon, ui.span([`: ${tests.length} tests`])]));
          widget.root.onclick = (ev: MouseEvent) => {
            df.filter.init((row) => ownerColumn.getString(row)?.includes(login));
            df.selection.init((row) => ownerColumn.getString(row)?.includes(login) && (failingColumn.get(row) ?? false));
          };
          ui.tooltip.bind(widget.root, 'Click to filter');
          summary.appendChild(widget.root);
        }
        verdicts.push(new Verdict(Priority.INFO, 'Responsible for tests', ui.div([
          ui.span([summary]),
          // ui.button('Copy to Clipboard', () => {
          //   let slackMessage = '';
          //   for (const [owner, tests] of Object.entries(unaddressedTests)) {
          //     const slackOwner = owner.match(/\w+@datagrok.ai/) ? '@' + owner.match(/\w+@datagrok.ai/)?.[0].split('@')[0] : owner;
          //     slackMessage += `${slackOwner}: ` + tests.length + '\n\n';
          //   }
      
          //   navigator.clipboard.writeText(slackMessage).then(() => {
          //     grok.shell.info('Summary copied to clipboard');
          //   });
          // })
        ])));
      }
      return verdicts;
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to gather unaddressed tests']),
        ui.span([x])
      ]))];
    }
  }
  ignoredTests(df: DG.DataFrame): Verdict[] {
    let verdicts: Verdict[] = [];
    let testColumn: DG.Column = df.col('test')!;
    let ignoreColumn: DG.Column = df.col('ignore?')!;
    let ignoreReasonColumn: DG.Column = df.col('ignoreReason')!;
    let ignoreVersionColumn: DG.Column = df.col('ignoreReason')!;
    let widgets: DG.Widget[] = [];
    for (var i = 0; i < df.rowCount; i++) {
      if (ignoreColumn.get(i)) {
        widgets.push(DG.Widget.fromRoot(ui.span([testColumn.getString(i), ': ', ignoreReasonColumn.getString(i)])));
      }
    }
    for (var i = 0; i < widgets.length; i++)
      verdicts.push(new Verdict(Priority.INFO, `Ignored tests - ${widgets.length} items`, widgets[i].root));
    return verdicts;
  }
  performanceDowngrades(df: DG.DataFrame): Verdict[] {
    try {
      let verdicts: Verdict[] = [];
      for (let i = 0; i < df.rowCount; i++) {
        if (df.col('has_suspicious')!.get(i)) {
          let lastDuration: number = df.col('1 avg(duration)')!.get(i) ?? 0;
          let minDuration: number = df.col('min')!.get(i) ?? 0;
          let maxDuration: number = df.col('max')!.get(i) ?? 0;
          if (lastDuration - minDuration > maxDuration - lastDuration)
            verdicts.push(new Verdict(Priority.ERROR, 'Performance downgrade', ui.span([df.col('test')!.getString(i) + ` is down ${(maxDuration / minDuration - 1) * 100}% in performance`])));
        }
      }
      return verdicts;
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to gather performance downgrades']),
        ui.span([x])
      ]))];
    }
  }
  
  testTrackDowngrades(df: DG.DataFrame): Verdict[] {
    try {
      let verdicts: Verdict[] = [];
      let widgets: DG.Widget[] = [];
      for (let i = 0; i < df.rowCount; i++) {
        if ((df.col('1')?.getString(i) ?? 'passed') != 'passed') {
          widgets.push(DG.Widget.fromRoot(ui.span([df.col('test')!.getString(i) + ` is failed`])));
        }
      }
      for (let i = 0; i < widgets.length; i++)
        verdicts.push(new Verdict(Priority.ERROR, `Test Track failures - ${widgets.length} items`, widgets[i].root));

      return verdicts;
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to gather test track downgrades']),
        ui.span([x])
      ]))];
    }
  }

  async loadManualTickets(): Promise<void> {
    let tickets: DG.DataFrame = await grok.functions.call('ManualTicketFetch');
    for (var i = 0; i < tickets.rowCount; i++) {
      const ticket = tickets.col('name')?.getString(i);
      if (ticket != null)
        this.tickets.add(ticket);
    }
  }

  async verdictsForTickets(): Promise<Verdict[]> {
    try {
      await this.loadManualTickets();

      let verdicts: Verdict[] = [];
      const priorityRows: Map<string, number[]> = new Map([
        [Priority.BLOCKER, []],
        [Priority.ERROR, []],
        [Priority.INFO, []],
        [Priority.RESOLVED, []]
      ]);

      let tickets: string[] = [];
      this.tickets.forEach((ticket, _v, _t) => {
        let match = ticket.match(/GROK\-\d+/);
        if (match != null && match[0] != undefined)
          tickets.push(match[0]);
      });
    
      let jiraCol: DG.Column<string> = DG.Column.fromStrings('jira', [...tickets]);
      let severityCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'priority:name'
      });
      let statusCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'status:name'
      });
      let issueTypeCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'issuetype:name'
      });
      let summaryCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'summary'
      });
      let assigneeCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'assignee:displayName'
      });
      let fixVersionsCol: DG.Column<string> = await grok.functions.call('JiraConnect:getJiraField', {
        ticketColumn: jiraCol,
        field: 'fixVersions:0:name'
      });
      for (var i = 0; i < jiraCol.length; i++) {
        let priority: string = Priority.INFO;
        if (statusCol.getString(i) == 'Done' || statusCol.getString(i) == 'Won\'t fix')
          priority = Priority.RESOLVED;
        else if (severityCol.getString(i).startsWith('Blocker'))
          priority = Priority.BLOCKER;
        else if (issueTypeCol.getString(i) == 'Bug') {
          if (severityCol.getString(i).startsWith('Low') || !(fixVersionsCol.getString(i).startsWith(_properties['Platform version'])))
            priority = Priority.INFO;
          else
            priority = Priority.ERROR;
        }
        priorityRows.get(priority)?.push(i);
      }

      for (const [priority, rowIndices] of priorityRows) {
        if (rowIndices.length > 0) {
            const filteredColumns = [
                jiraCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                summaryCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                fixVersionsCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                statusCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                severityCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                issueTypeCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx))),
                assigneeCol.clone(DG.BitSet.create(jiraCol.length, (idx) => rowIndices.includes(idx)))
            ];
    
            const grid = DG.Grid.create(DG.DataFrame.fromColumns(filteredColumns));
            grid.sort(['jira'], [true]);
            await grok.data.detectSemanticTypes(grid.dataFrame);
            verdicts.push(new Verdict(
                priority,
                `JIRA tickets [${priority}] - ${rowIndices.length} items`,
                grid.root
            ));
        }
      }
      return verdicts;
    } catch (x) {
      return [new Verdict(Priority.ERROR, 'Unhandled exception', ui.div([
        ui.span(['Failed to gather jira tickets info']),
        ui.span([x])
      ]))];
    }
  }

  composeResultList(verdicts: Verdict[]): HTMLElement {
    let res: DG.Accordion = ui.accordion('');
    let lastAccordion: HTMLDivElement | null;
    for (var i = 0; i < verdicts.length; i++) {
      if (i == 0 || verdicts[i - 1].priority != verdicts[i].priority || verdicts[i - 1].category != verdicts[i].category) {
        let accordionToShow = ui.div([]);
        let pane = res.addPane(verdicts[i].category, () => accordionToShow);
        let icon = getIconForVerdict(verdicts[i].priority);
        icon.style.marginRight = '4px';
        pane.root.firstChild!.insertBefore(icon, pane.root.firstChild!.firstChild!);
        lastAccordion = accordionToShow;
      }
      lastAccordion!.appendChild(ui.div([verdicts[i].widget]));
    }
    res.addPane('Actions', () => ui.actionLink('Watch a jira ticket', () => {
      let dialog = ui.dialog('Watch ticket');
      let ticketInput = ui.input.textArea('name');
      dialog.add(ticketInput.root);
      dialog.onOK(async () => {
        let match = ticketInput.value.match(/GROK\-\d+/);
        if (match != null && match[0] != undefined)
          await grok.functions.call('ManualTicketCreation', {'name': match[0]});
        else
          (new DG.Balloon()).warning('Cpuldn\'t recognize a ticket name in ' + ticketInput.value);
      });
      dialog.show();
    }));
    return res.root;
  }

  close(): void {
    TestDashboardWidget.isOpen = false;
    super.close();
  }
}