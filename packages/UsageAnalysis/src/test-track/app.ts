import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import dayjs from 'dayjs';

import { colors, CRITICALFAIL, MINORFAIL, BLOCKFAIL, getIcon, getStatusIcon, PASSED, SKIPPED, Status, errorSeverityLevels, errorSeverityLevelJiraNames, TicketPriorityLevel as ticketPriorityLevel } from './utils';
import { _package } from '../package';
import { testViewer } from '@datagrok-libraries/utils/src/test';
import { Subscription } from 'rxjs';
import { testSchema } from '../test-analysis/sticky-meta-initialization';

const NEW_TESTING = 'New Testing';
const BATCHNAME_STORAGE_KEY = 'Datagrok/UsageAnalysis/TestTrack/BatchName';

interface TestCase extends Options {
  name: string;
  path: string;
  text: HTMLElement;
  status: Status | null;
  icon: HTMLDivElement;
  history: HTMLDivElement;
  reason: HTMLDivElement;
  fullReason?: string;
  datasets: string[];
  projects: string[];
  layouts: string[];
}

interface Category extends Options {
  name: string;
  children: (TestCase | Category)[];
  status: Status | null;
  icon: HTMLElement;
}

interface Options {
  order?: number;
}

interface StatusInfo {
  'User': DG.User;
  'Date': any;
  'Version': string;
  'Reason'?: HTMLElement;
  'Batch'?: string;
}

export class TestTrack extends DG.ViewBase {
  private static instance: TestTrack;
  tree: DG.TreeViewGroup;
  inited: boolean = false;
  isInitializing: boolean = false;
  testCaseDiv: HTMLDivElement;
  currentNode: DG.TreeViewNode | DG.TreeViewGroup;
  map: { [key: string]: (Category | TestCase) } = {};
  nodes: { [key: string]: (DG.TreeViewNode<any>) } = {};

  jiraBaseUrl = 'https://reddata.atlassian.net/browse/';
  gitHubBaseUrl = 'https://github.com/datagrok-ai/public/issues/';
  list: Category[] = [];
  expanded: boolean = false;
  version: string = grok.shell.build.client.version;
  uid: string = DG.User.current().id;
  start: string;
  nameDiv: HTMLDivElement = ui.divH([], { id: 'tt-name' });
  testingName: string;
  searchInput: DG.InputBase = ui.input.search('');

  testDescription: Map<string, string> = new Map<string, string>();
  dataSetsToOpen: string[] = [];
  projectsToOpen: string[] = [];
  testingNames: string[] = [];

  pauseReportSync: HTMLButtonElement | undefined;
  runReportSync: HTMLButtonElement | undefined;
  isReporting: boolean = false;
  onRemoveSubForCollabTestingSync?: any;
  onRemoveSubForReportiingSync?: any;
  tableViewReport?: DG.TableView | null = null;

  reportSelection: Subscription | null = null;
  testTrackSelection: Subscription | null = null;
  edit: HTMLButtonElement | null = null;
  loadBtn: HTMLButtonElement | null = null;
  addTestingButton: HTMLButtonElement | null = null;
  testingNameSelector: DG.ChoiceInput<string | null> | null = null;


  isReportSyncActive: boolean = false;
  public static getInstance(): TestTrack {
    if (!TestTrack.instance)
      TestTrack.instance = new TestTrack();
    return TestTrack.instance;
  }

  constructor(testingName?: string) {
    super();
    this.name = 'Test Track';
    this.testingName = testingName ?? localStorage.getItem(BATCHNAME_STORAGE_KEY) ?? '';
    this.root.classList.add('test-track');
    this.path = '/TestTrack';
    this.tree = ui.tree();
    this.tree.root.id = 'tt-tree';
    this.testCaseDiv = ui.div();
    this.testCaseDiv.id = 'tt-test-case-div';
    this.currentNode = this.tree;

    let start = localStorage.getItem('TTState');
    if (start === null) {
      start = Date.now().toString();
      localStorage.setItem('TTState', start);
      grok.log.usage(`${this.version}_${start}_${this.uid}`,
        { name: NEW_TESTING, version: this.version, uid: this.uid, start: start }, `tt-new-testing`);
    }
    this.start = start;
  }

  init() {
    if (this.isInitializing)
      return;

    if (this.inited) {
      grok.shell.dockManager.dock(this.root, DG.DOCK_TYPE.LEFT, null, this.name, 0.3);
      return;
    }

    let progressBar = DG.TaskBarProgressIndicator.create('Opening Test');
    this.isInitializing = true;
    this.initTreeView().then(() => {
      this.inited = true;
      this.isInitializing = false;

      this.addCollabTestingSync();
      this.addReporterSync();
      progressBar.close();
    });

  }

  public reopen() {
    if (!this.onRemoveSubForCollabTestingSync) {
      this.addCollabTestingSync()
    }
    if (!this.onRemoveSubForReportiingSync) {
      this.addReporterSync();
      if (this.pauseReportSync)
        this.pauseReportSync.style.display = 'none';
      if (this.runReportSync)
        this.runReportSync!.style.display = 'block';

      this.isReporting = false;
    }
  }

  private addReporterSync() {
    this.isReportSyncActive = true;
    this.onRemoveSubForReportiingSync = grok.shell.dockManager.onClosed.subscribe((v) => {
      if (v === this.root)
        this.isReportSyncActive = false;
      if (this.onRemoveSubForReportiingSync)
        this.onRemoveSubForReportiingSync.unsubscribe();

      this.onRemoveSubForReportiingSync = undefined
    });
  }

  private addCollabTestingSync() {
    const updateBatchInterval = setInterval(() => {
      this.updateBatchData();
    }, 10000)
    this.onRemoveSubForCollabTestingSync = grok.shell.dockManager.onClosed.subscribe((v) => {
      if (v === this.root) {
        clearInterval(updateBatchInterval);
        if (this.onRemoveSubForCollabTestingSync)
          this.onRemoveSubForCollabTestingSync.unsubscribe();

        this.onRemoveSubForCollabTestingSync = undefined
      }
    });
  }


  private updateReportsPrefix() {
    if (this.currentNode.value && !('children' in this.currentNode.value) && this.isReporting) {
      const currentDateTime: Date = new Date();
      DG.Logger.autoReportOptions = { 'test_case': this.currentNode.value.path, 'selection_time': currentDateTime.toISOString() };
    }
    else
      this.resetReportsOptions();
  }

  private resetReportsOptions() {
    DG.Logger.autoReportOptions = {};
  }

  private async initTreeView(): Promise<void> {

    let searchInvoked = false

    //searchInput
    this.searchInput.onChanged.subscribe((value) => {
      // this._searchItem();
      if (value.length > 0) {
        this.searchTreeItems(value);
        searchInvoked = true;
      }
      else if (searchInvoked) {
        this.closeTreeCategories();
        searchInvoked = false;
      }
    });

    this.searchInput.input.onkeyup = (event) => {
      if (event.key === 'Escape')
        this.searchInput.fireChanged();
    };

    // Generate tree
    const filesP = _package.files.list('Test Track', true);
    const namePFromDb: string = (await grok.functions.call('UsageAnalysis:TestingName',
      { uid: this.uid, version: this.version, start: this.start })) || NEW_TESTING;
    const nameP: string = this.testingName || namePFromDb;
    const history: DG.DataFrame = await grok.functions.call('UsageAnalysis:TestTrack',
      { batchName: `${nameP}` });


    for (const row of history.rows) {
      const path = (row.get('test') || '').replace('Unknown: ', '').replace('Test Track: ', '');
      if (path.length === 0)
        continue;

      let status: Status = row.get('status');
      let severity = row.get('severityLevel');
      if (severity !== null && severity !== '') {
        status = severity;
      }
      const reason: string = row.get('reason');
      const user = await grok.dapi.users.find(row.get('uid'));
      const icon = status ? ui.div(getStatusIcon(status)) : ui.div();

      let reasonList;
      if (this.hasAnyLink(reason || '')) {
        const listLink = ui.link('list', '');
        listLink.classList.add('no-after');
        listLink.addEventListener("click", (e: Event) => {
          e.preventDefault();
          this.openReasonLink(reason || '');
        });
        reasonList = (listLink);
      }
      else {
        reasonList = ui.label('list');
      }

      this.map[path] = {
        name: '', path, text: ui.markdown(''), status, history: ui.divH([], 'tt-history'),
        icon: icon, reason: ui.div((reason.includes("\n") ? reasonList : ui.div(this.getReason(reason ?? ''))), 'tt-reason'), fullReason: reason, datasets: [], projects: [], layouts: [],
      };
      const map: StatusInfo = {
        'User': user,
        'Date': row.get('date'),
        'Version': this.version,
        'Batch': nameP.toString()
      };
      if (reason)
        map['Reason'] = ui.div(this.getReason(reason ?? ''));
      ui.tooltip.bind(icon, () => ui.tableFromMap(map));
    }

    const files = await filesP;
    const p: Promise<void>[] = [];
    for (const file of files) {
      if (file.isDirectory)
        this.processDir(file);
      else
        p.push(this.processFile(file));
    }
    await Promise.all(p);
    this.list.forEach((c) => this.sortCategoryRecursive(c));
    this.list.forEach((obj) => this.initTreeGroupRecursive(obj, this.tree));
    this.tree.children.forEach((c) => this.updateGroupStatusRecursiveDown(c as DG.TreeViewGroup));
    this.setContextMenu();
    for (let item of this.tree.items)
      this.testDescription.set(item.value.name, item.value.text?.textContent || '');
    // Ribbon
    const gh = ui.button(getIcon('github', { style: 'fab' }), () => {
      window.open('https://github.com/datagrok-ai/public/tree/master/packages/UsageAnalysis/files/Test Track',
        '_blank');
      window.focus();
    }, 'Test Track folder');
    gh.classList.add('tt-ribbon-button');
    this.loadBtn = ui.button(getIcon('star-of-life', { style: 'fas' }), async () => {
      for (let dataset of this.dataSetsToOpen || []) {
        try {
          const df = (await (grok.functions.eval(`OpenServerFile("${dataset}")`)))[0];
          grok.shell.addTableView(df);
        }
        catch (e) {
          grok.shell.error("Could not find dataset: " + dataset);
        }
      }

      for (let project of this.projectsToOpen || []) {
        try {
          const p = await grok.dapi.projects.find(project);
          p.open();
        }
        catch (e) {
          grok.shell.error("Could not find project: " + project);
        }
      }
    }, 'Open test data');
    this.loadBtn.classList.add('disabled');
    this.loadBtn.classList.add('tt-ribbon-button');
    const report = ui.button(getIcon('tasks', { style: 'fas' }), () => {
      const list: { name: string, category: string, status: Status | null, reason: string }[] = [];
      Object.values(this.map).forEach((el) => {
        if (el && 'children' in el) return;
        list.push({ name: el.name, category: el.path.replace(/:\s[^:]+$/, ''), status: el.status ?? null, reason: el.fullReason || '' });
      });
      const df = DG.DataFrame.fromObjects(list)!;
      df.getCol('status').meta.colors.setCategorical(colors);
      df.getCol('reason').semType = "text";
      if (this.tableViewReport !== null)
        this.tableViewReport?.close();
      this.tableViewReport = grok.shell.addTableView(df);
      this.tableViewReport.grid.sort(['category', 'name']);
      this.tableViewReport.name = 'Report';
      this.addOnReportSubscription();

      if (this.currentNode !== this.tree && this.currentNode?.value?.path !== null)
        this.UpdateReportAccordingTestTrackSelection(this.currentNode);
    }, 'Generate report');
    report.classList.add('tt-ribbon-button');
    const ec = ui.button(getIcon('sort', { style: 'fas' }), () => {
      this.expanded = !this.expanded;
      this.tree.items.forEach((n: DG.TreeViewGroup | DG.TreeViewNode) => {
        if (n.constructor === DG.TreeViewGroup)
          n.expanded = this.expanded;
      });
    }, 'Expand/collapse');
    ec.classList.add('tt-ribbon-button');
    const refresh = ui.button(getIcon('sync-alt', { style: 'fas' }), async () => await this.refresh(), 'Refresh');
    refresh.classList.add('tt-ribbon-button');
    ec.classList.add('tt-ribbon-button');
    this.testingName = (await nameP) ?? NEW_TESTING;

    let testDF = await grok.functions.call('UsageAnalysis:TestingNames');
    for (const row of testDF.rows) {
      let batch = row['batchName'];
      if (batch !== '')
        this.testingNames.push(batch);
    }


    if (!this.testingNames.includes(this.testingName))
      this.testingNames.push(this.testingName);

    this.addTestingButton = ui.button(getIcon('plus', { style: 'fas' }), async () => { await this.showAddNewTestingDialog() });
    this.testingNameSelector = ui.input.choice('', {
      items: this.testingNames, value: this.testingName, nullable: false, onValueChanged: (e) => {
        this.testingName = e;
        this.refresh();
        localStorage.setItem(BATCHNAME_STORAGE_KEY, this.testingName);
      }
    });

    this.nameDiv.append(this.addTestingButton);
    this.nameDiv.append(this.testingNameSelector.root);
    this.nameDiv.classList.add('tt-ribbon-name-button');
    // this.nameDiv.onclick = async () => {
    //   this.showStartNewTestingDialog();
    // };
    this.pauseReportSync = ui.button(getIcon('pause', { style: 'fas' }), () => {
      this.runReportSync!.style.display = 'block';
      this.pauseReportSync!.style.display = 'none';
      this.isReporting = false;
      this.resetReportsOptions();
    }, "Reports synchronization is running");
    this.runReportSync = ui.button(getIcon('play', { style: 'fas' }), () => {
      this.runReportSync!.style.display = 'none';
      this.pauseReportSync!.style.display = 'block';
      this.isReporting = true;
      this.updateReportsPrefix();
    }, "Reports synchronization is paused");
    this.pauseReportSync.classList.add('tt-ribbon-button');
    this.runReportSync.classList.add('tt-ribbon-button');

    this.pauseReportSync.style.display = 'none';
    this.isReporting = false;

    const ribbon = ui.divH([gh, report, ec, refresh, this.loadBtn, this.pauseReportSync, this.runReportSync, this.nameDiv]);
    ribbon.style.flexGrow = '0';

    // Test case div
    this.edit = ui.button(getIcon('edit'), () => this.editTestCase(this.currentNode), 'Edit test case');
    this.edit.id = 'tt-edit-button';
    this.edit.disabled = true;
    this.addOnTestTrackCaseSubscription();
    // UI
    this.append(ui.div(this.searchInput.root));
    this.append(ui.div([this.testCaseDiv, this.edit], { id: 'tt-test-case-div-outer' }));
    this.append(ribbon);
    this.append(this.tree.root);
    this.root.style.padding = '0';
    grok.shell.dockManager.dock(this.root, DG.DOCK_TYPE.LEFT, null, this.name, 0.3);

    this.isInitializing = false;
  }

  private addOnTestTrackCaseSubscription() {
    this.testTrackSelection = this.tree.onSelectedNodeChanged.subscribe((node) => {
      if (node === null) {
        this.loadBtn?.classList.add('disabled');
        return;
      }
      if (!node.value)
        node = this.tree;

      this.dataSetsToOpen = node?.value?.datasets || [];
      this.projectsToOpen = node?.value?.projects || [];

      if (this.loadBtn && this.dataSetsToOpen.length === 0 && this.projectsToOpen.length === 0)
        this.loadBtn?.classList.add('disabled');
      else
        this.loadBtn?.classList.remove('disabled');

      if (this.currentNode.constructor === DG.TreeViewNode)
        this.currentNode.value.history.style.display = 'none';
      this.currentNode = node;
      this.testCaseDiv.innerHTML = '';
      this.updateReportsPrefix();
      if (node?.value && 'children' in node.value) {
        this.edit!.disabled = true;
        return;
      }

      if (node === this.tree)
        return;

      this.reportSelection?.unsubscribe();
      this.UpdateReportAccordingTestTrackSelection(node);
      this.addOnReportSubscription()

      this.testCaseDiv.append(node.value.text);
      this.edit!.disabled = false;
      node.value.history.style.display = 'flex';
      if (node.value.history.classList.contains('processed')) return;
      node.value.history.classList.add('processed');
      grok.functions.call('UsageAnalysis:LastStatuses', { path: node.value.path, batchToExclude: this.testingName }).then(async (df: DG.DataFrame) => {
        if (!df.rowCount) return;
        const first = df.row(0);
        if (first.get('version') === this.version && first.get('uid') === this.uid && first.get('start') === this.start)
          df.rows.removeAt(0);
        else if (df.rowCount === 20)
          df.rows.removeAt(4);
        const n = Math.min(df.rowCount, 5 - node.value.history.children.length);
        for (const row of df.rows) {
          if (row.idx === n) break;
          let status = row.get('status');
          let severity = row.get('severityLevel');
          if (severity !== null && severity !== '') {
            status = severity;
          }
          const icon = getStatusIcon(status);
          node.value.history.append(icon);
          const user = await grok.dapi.users.find(row.get('uid'));
          const map: StatusInfo = {
            'User': user,
            'Date': row.get('date'),
            'Version': row.get('version'),
            'Batch': row.get('batchName').toString()
          };
          const reason = row.get('reason');
          if (reason)
            map['Reason'] = this.getReason(reason);
          ui.tooltip.bind(icon, () => ui.tableFromMap(map));
        }
      });
    });
  }

  private addOnReportSubscription() {
    if (this.tableViewReport !== null) {
      this.reportSelection = this.tableViewReport?.dataFrame.onCurrentRowChanged.subscribe((e: Event) => {
        this.testTrackSelection?.unsubscribe();
        let selected = this.tableViewReport?.dataFrame?.currentRowIdx;
        if (selected !== undefined)
          this.UpdateTestTrackAccordingReportSelection(`${this.tableViewReport?.dataFrame?.rows?.get(selected)['category']}: ${this.tableViewReport?.dataFrame?.rows?.get(selected)['name']}` || '');
        this.addOnTestTrackCaseSubscription();
      }) || null;
    }
  }

  private UpdateReportAccordingTestTrackSelection(node: any) {
    if (this.tableViewReport !== null) {
      this.tableViewReport?.dataFrame?.selection?.setAll(false);
      let foundRows = Array.from(this.tableViewReport?.dataFrame?.rows?.where((row: any) => `${this.tableViewReport?.dataFrame?.get('category', row)}: ${this.tableViewReport?.dataFrame?.get('name', row)}` === node.value.path) || '');
      if (foundRows.length === 1)
        this.tableViewReport!.dataFrame.currentRowIdx = foundRows[0];
    }
  }

  private UpdateTestTrackAccordingReportSelection(path: string) {
    this.tree.currentItem = this.nodes[path];
  }

  private closeTreeCategories() {
    const categoriesLists = this.tree.root.getElementsByClassName('d4-tree-view-group-host');
    const categoriesTitles = this.tree.root.getElementsByClassName('d4-tree-view-tri');
    const dom = this.tree.root.getElementsByClassName('d4-tree-view-node');

    for (let i = 0; i < dom.length; i++) {
      const item = dom[i] as HTMLElement;
      if (item)
        item.classList.remove('hidden');
    }
    for (const title of categoriesTitles)
      title.classList.remove('d4-tree-view-tri-expanded');
    for (let i = 0; i < categoriesLists.length; i++) {
      let element = categoriesLists[i] as HTMLElement;
      if (!element.parentElement?.classList.contains('d4-tree-view-root'))
        element.style.display = 'none';
    }
  }

  private searchTreeItems(stringToSearch: string) {
    const dom = this.tree.root.getElementsByClassName('d4-tree-view-node');
    const regExpToSearch = new RegExp(stringToSearch.toLowerCase());
    const listToShow: HTMLElement[] = [];

    function isFitsSearchString(stringToCheck: string, description?: string): boolean {
      var result = regExpToSearch.test(stringToCheck.toLocaleLowerCase());
      if (description) {
        result = result || regExpToSearch.test(description.toLocaleLowerCase())
      }
      return result;
    }
    for (let i = 0; i < dom.length; i++) {
      const item = dom[i] as HTMLElement;
      const foundFunc = isFitsSearchString(item.textContent?.toString() || '', (this.testDescription.get(item.textContent?.toString() || '') || '').toLocaleLowerCase());
      if (foundFunc) {
        listToShow[listToShow.length] = (item);
        item.classList.remove('hidden');
      }
      else
        item.classList.add('hidden');
    }

    for (const itemToShow of listToShow) {
      let itemHierarchy: HTMLElement = itemToShow;
      while (!itemHierarchy.classList.contains('d4-tree-view-root')) {
        if (itemHierarchy.classList.contains('d4-tree-view-group')) {
          let categoryToUpdate = itemHierarchy.getElementsByClassName('d4-tree-view-tri')[0];
          if (categoryToUpdate) {
            categoryToUpdate.classList.add('d4-tree-view-tri-expanded');
            categoryToUpdate.parentElement?.classList.remove('hidden');
          }
        }

        if (itemHierarchy.style.display === 'none')
          itemHierarchy.style.display = 'block';

        if (itemHierarchy.classList.contains('hidden'))
          itemHierarchy.classList.remove('hidden');

        itemHierarchy = itemHierarchy.parentElement!;
      }

    }
  }

  processDir(dir: DG.FileInfo): void {
    const el: Category = { name: dir.name, children: [], status: null, icon: ui.div() };
    const pathL = dir.path.split('/').slice(2);
    if (pathL.length > 1) {
      const parent = this.map[pathL.slice(0, -1).join(': ') + ' C'] as Category;
      parent.children.push(el);
    } else
      this.list.push(el);
    this.map[pathL.join(': ') + ' C'] = el;
  }

  async processFile(file: DG.FileInfo): Promise<void> {
    const pathL = file.path.replace(/\.[^.]+$/, '').split('/').slice(2);
    if (pathL.length < 2)
      grok.shell.error('Root test case');
    const parent = this.map[pathL.slice(0, -1).join(': ') + ' C'] as Category
    const [textS, jsonS] = (await _package.files.readAsText(file)).split('---', 3);
    const text = ui.markdown(textS);
    const path = pathL.join(': ');
    const name = file.name.replace(/\.[^.]+$/, '');
    const elOld: TestCase | undefined = this.map[path] as TestCase;
    let el: TestCase;
    if (elOld)
      el = { ...elOld, name, text };
    else {
      el = {
        name, path, text, status: null, history: ui.divH([], 'tt-history'),
        icon: ui.div(), reason: ui.div('', 'tt-reason'), datasets: [], projects: [], layouts: [],
      };
    }
    if (jsonS)
      el = { ...el, ...JSON.parse(jsonS) };
    parent.children.push(el);
    this.map[path] = el;
  }

  sortCategoryRecursive(cat: Category): void {
    if (!cat.children.length) return;
    const cats = cat.children.filter((c) => 'children' in c) as Category[];
    cat.children.sort((a, b) => {
      if ('children' in a && !('children' in b)) return -1;
      if ('children' in b && !('children' in a)) return 1;
      if (a.order === undefined && b.order === undefined)
        return a.name.localeCompare(b.name);
      if (a.order === undefined) return 1;
      if (b.order === undefined) return -1;
      if (a.order === b.order)
        return a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase());
      return a.order > b.order ? 1 : -1;
    });
    cats.forEach((c) => this.sortCategoryRecursive(c));
  }


  initTreeGroupRecursive(obj: Category | TestCase, parent: DG.TreeViewGroup): void {
    if ('text' in obj) {
      const node = parent.item(obj.name, obj);
      node.value.reason.oncontextmenu = (e: PointerEvent) => {
        this.showNodeDialog(node, node.value.status, true);
        e.stopImmediatePropagation();
        e.preventDefault();
      };
      node.captionLabel.after(node.value.reason);
      node.captionLabel.after(node.value.history);
      node.captionLabel.after(node.value.icon);

      this.nodes[obj.path] = node;
      return;
    }

    const group = parent.getOrCreateGroup(obj.name, obj, false);
    group.captionLabel.after(group.value.icon);
    for (const child of obj.children)
      this.initTreeGroupRecursive(child, group);
  }

  private setStatus(node: any, data: any, statusName: string) {
    const status = statusName.toLowerCase() as Status;
    if (node?.value?.status === status) return;
    data.args.menu.clear();
    data.args.menu.root.remove();
    if (status === PASSED)
      this.changeNodeStatus(node, status);
    else
      this.showNodeDialog(node, status);
  }

  setContextMenu(): void {
    this.tree.onNodeContextMenu.subscribe((data: any) => {
      const node = data?.args?.item;
      if (!node || node?.constructor === DG.TreeViewGroup || !data.args.menu) return;
      (data.args.menu as DG.Menu)
        .group('Status')
        .item('Passed', () => {
          const status = 'passed'.toLowerCase() as Status;
          this.setStatus(node, data, status);
        }, 1, { isEnabled: () => { return node.value.status === PASSED ? 'This test case alredy has this status' : null; } })
        .item('Failed', () => {
          const status = 'failed'.toLowerCase() as Status;
          this.setStatus(node, data, status);
        }, 2, { isEnabled: () => { return errorSeverityLevels.includes(node.value.status) ? 'This test case alredy has this status' : null; } })
        .item('Skipped', () => {
          const status = 'skipped'.toLowerCase() as Status;
          this.setStatus(node, data, status);
        }, 3, { isEnabled: () => { return node.value.status === SKIPPED ? 'This test case alredy has this status' : null; } })
        .endGroup()
        .item('Edit', () => this.editTestCase(node))
        .item('Edit Reason', () => {
          this.showNodeDialog(node, data.args.item.value.status, true);
        }, null, {
          isEnabled: () => {
            return (data.args.item.value.status ? (data.args.item.value.status.toLocaleLowerCase() === PASSED ? 'Status passed' : null) : 'No Status To Change');
          }
        });
    });
  }

  editTestCase(node: DG.TreeViewNode): void {
    window.open(`https://github.com/datagrok-ai/public/edit/master/packages/UsageAnalysis/files/Test Track/${node.value.path.replaceAll(': ', '/')}.md`, '_blank')?.focus();
  }

  updateGroupStatus(group: DG.TreeViewGroup): void {
    group.value.icon.innerHTML = '';
    const statuses = group.value.children.map((el: TestCase | Category) => el.status);
    let status: typeof PASSED | typeof MINORFAIL | typeof CRITICALFAIL | typeof BLOCKFAIL | typeof SKIPPED = statuses.includes(BLOCKFAIL) ? BLOCKFAIL : statuses.includes(CRITICALFAIL) ? CRITICALFAIL : statuses.includes(MINORFAIL) ? MINORFAIL : statuses.includes(SKIPPED) ? SKIPPED : PASSED;

    group.value.status = status;
    if (status === PASSED && statuses.some((e: any) => e == undefined)) {
      group.value.status = null;
      return
    }
    const icon = getStatusIcon(status);
    group.value.icon.append(icon);
  }

  updateGroupStatusRecursiveUp(group: DG.TreeViewGroup): void {
    if (group === this.tree) return;
    this.updateGroupStatus(group);
    this.updateGroupStatusRecursiveUp(group.parent as DG.TreeViewGroup);
  }

  updateGroupStatusRecursiveDown(group: DG.TreeViewGroup): void {
    group.children.forEach((c) => {
      if (c.constructor === DG.TreeViewGroup)
        this.updateGroupStatusRecursiveDown(c);
    });
    this.updateGroupStatus(group);
  }

  // To Do: fix styles
  showNodeDialog(node: DG.TreeViewNode, status: typeof CRITICALFAIL | typeof MINORFAIL | typeof BLOCKFAIL | typeof SKIPPED, edit: boolean = false): void {
    const name = `${edit ? 'Edit' : 'Specify'} ${errorSeverityLevels.includes(status) ? 'ticket' : 'skip reason'}`;
    const dialog = ui.dialog(name);
    dialog.root.classList.add('tt-dialog', 'tt-reason-dialog');
    const value = edit ? (node.value.fullReason) || '' : '';

    const ticketSummary = ui.input.string('Summary');
    const ticketDescription = ui.input.textArea('Description');
    const createTicketBtn = ui.button('Create Ticket', () => {
      createTicketBtn.disabled = true;
      let errorLabel = 'CriticalError';
      if (errorTypeSelector.value === BLOCKFAIL)
        errorLabel = 'Blocker'
      if (errorTypeSelector.value === MINORFAIL)
        errorLabel = 'MinorError'
      console.log(ticketPriorityLevel[errorTypeSelector.value]);
      console.log(errorTypeSelector.value);
      grok.functions.call('UsageAnalysis:JiraCreateIssue', {
        'createRequest': JSON.stringify({
          'fields': {
            'project': {
              'key': 'GROK',
            },
            'summary': (ticketSummary?.value || '').toString(),
            'description': `Test Track\n Test Case: ${node.value.path.replace(/:\s[^:]+$/, '')} \n${(ticketDescription?.value ?? '').toString()}`,
            'issuetype': {
              'name': 'Bug',
            },
            'labels': [
              'TestTrack',
              errorSeverityLevelJiraNames[errorTypeSelector.value],
              this.version
            ],
            'priority': {
              'name': ticketPriorityLevel[errorTypeSelector.value]
            },
            'customfield_10439': this.testingName
          },
        }),
        'updateHistory': false,
      }).then((t) => {
        var ticketResult = JSON.parse(t.stringResult)
        console.log(t);
        window.open(this.jiraBaseUrl + ticketResult.key, "_blank");
        ticketSummary.value = '';
        ticketDescription.value = '';
        if (textInput.value.length > 0)
          textInput.value = `${textInput.value}\n`;
        textInput.value = `${textInput.value}${ticketResult.key}`;
        createTicketBtn.disabled = false;
      });
    })

    createTicketBtn.disabled = true;
    const errorTypeSelector = ui.input.choice('Severity', {
      value: '', items: ['', ...errorSeverityLevels], nullable: false, onValueChanged: (e) => {
        createTicketBtn.disabled = ticketSummary.value.length === 0 || errorTypeSelector.value == '';
      }
    });

    const textInput = ui.input.textArea(errorSeverityLevels.includes(status) ? 'Tickets' : 'Reasons', { value: value, nullable: false });
    textInput.classList.add('ui-input-reason');
    ticketSummary.onChanged.subscribe((value) => {
      createTicketBtn.disabled = value.length === 0 || errorTypeSelector.value == '';
    })

    const createTicketButtonTooltip = ui.tooltip.bind(createTicketBtn, 'Ensure that you selected severity level and wrote ticket summary.')

    createTicketBtn.classList.add('create-ticket-button');
    const jiraTicketsTab = ui.divH([ui.divV([ticketSummary, ticketDescription]), createTicketBtn]);

    errorTypeSelector.addValidator((value) => {
      if (value == '')
        return 'Can\'t be null';
      return null;
    });

    if (errorSeverityLevels.includes(status)) {
      errorTypeSelector.onChanged.subscribe((value) => {
        if (value !== null)
          status = value;
      });
      dialog.add(errorTypeSelector);
    }
    dialog.root.addEventListener('keydown', (e) => {
      if (e.key == 'Enter' && document.activeElement?.nodeName === 'TEXTAREA')
        e.stopImmediatePropagation();
    });
    dialog.add(textInput);
    dialog.onOK(() => {
      edit ? this.changeNodeReason(node, status, textInput.value) : this.changeNodeStatus(node, status, textInput.value);
    });
    if (errorSeverityLevels.includes(status)) {
      const accordion = ui.accordion();
      accordion.addPane('Jira Tickets', () => jiraTicketsTab)
      dialog.add(accordion);
    }

    dialog.show({ resizable: false });
    dialog.initDefaultHistory();

    const okButton = dialog.root.getElementsByClassName("d4-dialog-footer")[0].getElementsByClassName('ui-btn-ok')[0];
  }

  reportJiraTickets(reason: string, oldReason: string, params: any) {
    const newTickets: string[] = (reason ?? '').match(/GROK-\d{1,6}/g) || [];
    const oldTickets: string[] = oldReason.match(/GROK-\d{1,6}/g) || [];
    const combinedTickets = new Set([...newTickets, ...oldTickets]);
    const finalTickets = newTickets.some((ticket) => oldTickets.includes(ticket)) ||
                         newTickets.every((ticket) => oldTickets.includes(ticket))
                                   ? newTickets : Array.from(combinedTickets);
    let nameColumn = DG.Column.fromStrings('name', ['Test Track: ' + params.category + ': ' + params.name]);
    nameColumn.semType = 'autotest';
    grok.dapi.stickyMeta.getAllValues(testSchema, nameColumn).then((df) => {
      let tickets: string = df.col('tickets')?.get(0) ?? '';
      const ticketSet = new Set(tickets.split(','));
      for (const ticket of ticketSet) {
        if (!finalTickets.includes(ticket)) {
          if (!combinedTickets.has(ticket))
            finalTickets.push(ticket);
        }
      }
      const ticketsToSave = Array.from(new Set(finalTickets.filter((ticket: string) => ticket !== '')));
      grok.dapi.stickyMeta.setAllValues(testSchema, nameColumn, 
        DG.DataFrame.fromColumns([DG.Column.fromStrings('tickets', [ticketsToSave.join(',')])]));
    });
  }

  changeNodeStatus(node: DG.TreeViewNode, status: Status, reason?: string, uid: string = this.uid, reportData: Boolean = true): void {
    if(!node)
      return;
    const value = node?.value;
    if (value.status) {
      if (value.history.children.length === 5)
        value.history.children[4].remove();
    }
    value.status = status;
    value.icon.innerHTML = '';
    const oldReason: string = value.reason?.innerText ?? '';
    value.reason.innerHTML = '';
    const icon = getStatusIcon(status);
    value.icon.append(icon);
    let severityLevel = null;
    if (errorSeverityLevels.includes(status) || status === SKIPPED) {
      if (!reason!.includes('\n'))
        value.reason.append(this.getReason(reason!));
      else if ((reason || '').length > 0) {
        if (this.hasAnyLink(reason || '')) {
          const listLink = ui.link('list', '');
          listLink.classList.add('no-after');
          listLink.addEventListener("click", (e: Event) => {
            e.preventDefault();
            this.openReasonLink(reason || '');
          });
          value.reason.append(listLink);
        }
        else {
          if (!reason!.includes('\n'))
            node.value.reason.append(this.getReason(reason!));
          else
            node.value.reason.append(ui.label('list'));
          if (status !== SKIPPED)
            severityLevel = status;
        }
      }
      if (status !== SKIPPED)
        severityLevel = status;
    }
    value.fullReason = reason?.trim();
    const params = {
      success: status === PASSED, result: reason ?? '', skipped: status === SKIPPED, type: 'manual',
      package: 'Test Track',
      category: value.path.replace(/:\s[^:]+$/, ''), name: node.text, version: this.version, uid: uid, start: this.start, ms: 0, batchName: this.testingName,
      severityLevel: errorSeverityLevels.includes(status) ? status : null
    };
    if (reportData) {
      grok.shell.reportTest('manual', params);
      this.reportJiraTickets(reason ?? '', oldReason, params);
    }
    this.updateGroupStatusRecursiveUp(node.parent as DG.TreeViewGroup);
    let reasonTooltipValue = ui.div(this.getReason(reason ?? ''));
    grok.dapi.users.find(params['uid']).then((user) => {
      const map: StatusInfo = {
        'User': user,
        'Date': dayjs(),
        'Version': params['version'],
        'Batch': this.testingName
      };

      map['Reason'] = reasonTooltipValue;
      ui.tooltip.bind(icon, () => ui.tableFromMap(map));
    });
    this.updateReportData(node);
  }

  changeNodeReason(node: DG.TreeViewNode, status: Status, reason: string, uid: string = this.uid, reportData: Boolean = true): void {
    if (status !== node?.value?.status) {
      this.changeNodeStatus(node, status, reason, uid, reportData);
      return;
    }
    const oldReason: string = node?.value?.reason?.innerText ?? '';
    if (reason === oldReason) return;
    node.value.reason.innerHTML = '';
    let severityLevel = null;
    if (errorSeverityLevels.includes(status) || status === SKIPPED) {
      if (!reason!.includes('\n'))
        node.value.reason.append(this.getReason(reason!));
      else
        node.value.reason.append(ui.label('list'));
      if (status !== SKIPPED)
        severityLevel = status;
    }
    node.value.fullReason = reason;
    const params = {
      success: status === PASSED, result: reason, skipped: status === SKIPPED, type: 'manual',
      package: 'Test Track',
      category: node.value.path.replace(/:\s[^:]+$/, ''), name: node.text, version: this.version, uid: this.uid, start: this.start, ms: 0, batchName: this.testingName,
      severityLevel: errorSeverityLevels.includes(status) ? status : null
    };

    let reasonTooltipValue = ui.div(this.getReason(reason ?? ''));
    grok.dapi.users.find(params['uid']).then((user) => {
      const map: StatusInfo = {
        'User': user,
        'Date': dayjs(),
        'Version': params['version'],
        'Batch': this.testingName
      };

      map['Reason'] = reasonTooltipValue;
      ui.tooltip.bind(node.value.icon, () => ui.tableFromMap(map));
    });
    if (reportData) {
      grok.shell.reportTest('manual', params);
      this.reportJiraTickets(reason ?? '', oldReason, params);
    }
    this.updateReportData(node);
  }
  async showAddNewTestingDialog(): Promise<void> {
    const dialog = ui.dialog('Select testing');
    const newNameInput = ui.input.string('Name', { value: NEW_TESTING });

    dialog.add(newNameInput);
    newNameInput.addValidator((e: string) => {
      if (this.testingNames.includes(`${newNameInput.value}`)) {
        return `${e} is already exists`;
      }
      return null;
    });

    dialog.onOK(async () => {
      let testingToOpen: string | undefined | null = newNameInput.value;

      if (testingToOpen) {
        const start = Date.now().toString();
        this.testingName = testingToOpen;

        if (this.testingNames.length >= 5)
          this.testingNames.pop();
        this.testingNames = [this.testingName, ...this.testingNames];
        if (this.testingNameSelector) {
          this.testingNameSelector.items = this.testingNames;
          this.testingNameSelector.value = this.testingName;
        }
        localStorage.setItem('TTState', start);
        await this.refresh();
      }
      else {
        grok.shell.error('Testing Name is not valid');
      }
      localStorage.setItem(BATCHNAME_STORAGE_KEY, this.testingName);
    });

    dialog.show();
    const okButton = dialog.root.getElementsByClassName("d4-dialog-footer")[0].getElementsByClassName('ui-btn-ok')[0];
  }

  async showStartNewTestingDialog(): Promise<void> {
    const dialog = ui.dialog('Select testing');
    const newNameInput = ui.input.string('Name', { value: NEW_TESTING });
    const check = ui.input.bool('New testing:');
    const testingNames = (await grok.functions.call('UsageAnalysis:TestingNames'));

    const allTestingNames: string[] = [];
    const testingToOpen: string[] = [];
    const testingToOpenLimit = 5;
    let i = 0;
    for (const row of testingNames.rows) {
      let batch = row['batchName'];
      if (batch[0] === '"' && batch[batch.length - 1] === '"')
        batch = batch.substring(1, batch.length - 1)
      allTestingNames.push(batch);
      if (batch === '')
        continue;
      if (i < testingToOpenLimit)
        testingToOpen.push(batch);
      i++;
    }

    newNameInput.addValidator((e: string) => {
      if (allTestingNames.includes(`${newNameInput.value}`)) {
        if (!check.value)
          return null
        return `${e} is already exists`;
      }
      return null;
    });

    const versionSelector = ui.input.choice('Available tests:', { value: testingToOpen[0], items: testingToOpen.map((e) => e.toString()), nullable: false });
    if (testingToOpen.length === 0)
      versionSelector.nullable = true;
    check.onChanged.subscribe((value) => {
      versionSelector.enabled = !value;
      newNameInput.enabled = value;
    });
    newNameInput.enabled = false;
    dialog.add(check);
    dialog.add(versionSelector);
    dialog.add(newNameInput);
    dialog.onOK(async () => {
      let testingToOpen: string | undefined | null = undefined;

      if (check.value) {
        if (allTestingNames.indexOf(`${newNameInput.value}`) === -1) {
          testingToOpen = newNameInput.value;
        }
      }
      else {
        if (versionSelector.value !== '') {
          testingToOpen = versionSelector.value;
        }
      }

      if (testingToOpen && testingNames !== null) {
        const start = Date.now().toString();
        this.testingName = testingToOpen;
        localStorage.setItem('TTState', start);
        await this.refresh();
      }
      else {
        grok.shell.error('Testing Name is not valid');
      }
      localStorage.setItem(BATCHNAME_STORAGE_KEY, this.testingName);
    });
    dialog.show();
    const okButton = dialog.root.getElementsByClassName("d4-dialog-footer")[0].getElementsByClassName('ui-btn-ok')[0];
  }

  showEditTestingNameDialog(): void {
    const dialog = ui.dialog('Edit testing name');
    dialog.root.classList.add('tt-dialog');
    const input = ui.input.string('Name', { value: this.testingName });
    dialog.add(input);
    dialog.onOK(() => {
      this.testingName = input.value;
      this.nameDiv.innerText = this.testingName;
      grok.log.usage(`${this.version}_${this.start}_${this.uid}`,
        { name: this.testingName, version: this.version, uid: this.uid, start: this.start }, `tt-new-testing`);
    });
    dialog.show();
  }

  reload(): void {
    const oldRoot = this.root;
    ui.setUpdateIndicator(oldRoot);
    TestTrack.instance = new TestTrack(this.testingName);
    TestTrack.getInstance().init();
    grok.shell.dockManager.close(oldRoot);
  }

  async refresh() {
    // this.nameDiv.innerText = this.testingName;
    for (let node of this.tree.items) {
      node.value.status = undefined;
      node.value.icon.innerHTML = '';
      if (node?.value?.fullReason) {
        node.value.fullReason = undefined;
        node.value.reason.innerHTML = '';
      }
      if (node?.value?.history) {
        for (let i = node.value.history.length - 1; i >= 0; i--) {
          node.value.history[i].remove(node.value.history[i].firstChild);
        }

      }
    }
    await this.updateBatchData();
  }

  getReason(reason: string): HTMLElement {
    const result = ui.label('');
    for (let str of reason.split('\n')) {
      const jira = str.match(/GROK-\d{1,6}\b/);
      const gh1 = str.match(/#(\d{3,5})\b/);
      const gh2 = str.match(/https:\/\/github\.com\/datagrok-ai\/public\/issues\/(\d{3,5})/);
      const slack = str.includes('datagrok.slack.com');
      if (jira) result.append(this.getReasonLink(str, this.jiraBaseUrl + jira[0], jira[0]));
      else if (gh1) result.append(this.getReasonLink(str, this.gitHubBaseUrl + gh1[1], gh1[0]));
      else if (gh2) result.append(this.getReasonLink(str, str, `#${gh2[1]}`));
      else if (slack) result.append(this.getReasonLink(str, str, 'SLACK'));
      else result.innerText = str;
    }
    result.style.lineHeight = '4px ';
    return result;
  }

  hasAnyLink(reason: string): boolean {
    const jira = reason.match(/GROK-\d{1,6}\b/);
    const gh1 = reason.match(/#(\d{3,5})\b/);
    const gh2 = reason.match(/https:\/\/github\.com\/datagrok-ai\/public\/issues\/(\d{3,5})/);
    const slack = reason.includes('datagrok.slack.com');
    return (jira || gh1 || gh2 || slack) ? true : false
  }

  openReasonLink(reason: string) {
    let hasLink = false;
    for (let str of reason.split('\n')) {
      const jira = str.match(/GROK-\d{1,6}\b/);
      const gh1 = str.match(/#(\d{3,5})\b/);
      const gh2 = str.match(/https:\/\/github\.com\/datagrok-ai\/public\/issues\/(\d{3,5})/);
      const slack = str.includes('datagrok.slack.com');
      let linkToOpen: string = "";
      if (jira) {
        linkToOpen = this.jiraBaseUrl + jira[0];
      }
      else if (gh1) {
        linkToOpen = this.gitHubBaseUrl + gh1[1];
      }
      else if (gh2) {
        linkToOpen = str;
      }
      else if (slack) {
        linkToOpen = str;
      }
      if (linkToOpen.length > 0) {
        window.open(linkToOpen);
        window.focus();
        hasLink = true;
      }
    }
  }

  getReasonLink(reason: string, target: string, label: string): HTMLAnchorElement {
    const link = ui.link(`${reason}\n`, target, reason, 'tt-link');
    link.setAttribute('data-label', label);
    return link;
  }

  setContextPanelPreview(el: HTMLAnchorElement): void {
    el.onclick = (e) => {
      if (!e.ctrlKey) return;
      const ifrm = document.createElement('iframe');
      ifrm.setAttribute('src', el.href);
      ifrm.style.width = '100%';
      ifrm.style.height = '100%';
      ifrm.style.border = 'none';
      grok.shell.o = ifrm;
      e.preventDefault();
    };
  }

  private isTestCase(instance: any): instance is TestCase {
    return (instance as TestCase) !== undefined;
  }

  private async updateBatchData() {
    if (!this.testingName)
      return;
    const history: DG.DataFrame = await grok.functions.call('UsageAnalysis:TestTrack', { batchName: `${this.testingName}` });

    for (const row of history.rows) {
      
      const reason: string = row.get('reason').trim();
      const uid: string = row.get('uid');

      let status = row.get('status');
      let severity = row.get('severityLevel');
      if (severity !== null && severity !== '') {
        status = severity;
      }

      const path = (row.get('test') || '').replace('Unknown: ', '').replace('Test Track: ', '');
      if (path.length === 0)
        continue;

      if (this.map[path] && this.isTestCase(this.map[path])) {
        const caseValue: TestCase = this.map[path] as TestCase;

        const node = this.nodes[path];

        if (caseValue.status !== status ||
          caseValue.fullReason !== reason) {
          if (caseValue.status === row.status) {
            this.changeNodeReason(node, status, reason, uid, false);
          }
          else {
            this.changeNodeStatus(node, status, reason, uid, false);
          }
        }
      }
    }
  }

  private updateReportData(node: DG.TreeViewNode) {
    if (this.tableViewReport !== null) {
      this.tableViewReport?.dataFrame?.selection?.setAll(false);
      let foundRows = Array.from(this.tableViewReport?.dataFrame?.rows?.where((row: any) => `${this.tableViewReport?.dataFrame?.get('category', row)}: ${this.tableViewReport?.dataFrame?.get('name', row)}` === node.value.path) || '');
      if (foundRows.length === 1) {
        this.tableViewReport?.dataFrame?.set('status', foundRows[0], node.value.status || '')
        this.tableViewReport?.dataFrame?.set('reason', foundRows[0], node.value.fullReason || '')
      }
    }
  }
}
