import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import dayjs from 'dayjs';

import { colors, FAILED, getIcon, getStatusIcon, PASSED, SKIPPED, Status } from './utils';
import { _package } from '../package';

const NEW_TESTING = 'New Testing';

interface TestCase extends Options {
  name: string;
  path: string;
  text: HTMLElement;
  status: Status | null;
  icon: HTMLDivElement;
  reason: HTMLDivElement;
  history: HTMLDivElement;
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
}

export class TestTrack extends DG.ViewBase {
  private static instance: TestTrack;
  tree: DG.TreeViewGroup;
  inited: boolean = false;
  isInitializing: boolean = false;
  testCaseDiv: HTMLDivElement;
  currentNode: DG.TreeViewNode | DG.TreeViewGroup;
  map: { [key: string]: (Category | TestCase) } = {};
  list: Category[] = [];
  expanded: boolean = false;
  version: string = grok.shell.build.client.version;
  uid: string = DG.User.current().id;
  start: string;
  nameDiv: HTMLDivElement = ui.divText('', { id: 'tt-name' });
  testingName: string;
  searchInput: DG.InputBase = ui.input.search('');
  testDescription: Map<string, string> = new Map<string, string>();

  public static getInstance(): TestTrack {
    if (!TestTrack.instance)
      TestTrack.instance = new TestTrack();
    return TestTrack.instance;
  }

  constructor(testingName?: string) {
    super();
    this.name = 'Test Track';
    this.testingName = testingName ?? '';
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

    this.isInitializing = true;
    this.initTreeView().then(() => {
      this.inited = true;
      this.isInitializing = false;
    });
  }


  private async initTreeView(): Promise<void> {

    let searchInvoked = false

    //searchInput 
    this.searchInput.onChanged(() => {
      // this._searchItem(); 
      if (this.searchInput.value.length > 0) {
        this.searchTreeItems(this.searchInput.value);
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
    const nameP: string | Promise<string> = this.testingName || grok.functions.call('UsageAnalysis:TestingName',
      { id: `${this.version}_${this.start}_${this.uid}` });
    const history: DG.DataFrame = await grok.functions.call('UsageAnalysis:TestTrack',
      { version: this.version, uid: this.uid, start: this.start });

    grok.dapi.users.find(this.uid).then((user) => {
      for (const row of history.rows) {
        const path = row.get('path');
        const status: Status = row.get('status');
        const reason: string = row.get('reason');
        const icon = status ? ui.div(getStatusIcon(status)) : ui.div();
        this.map[path] = {
          name: '', path, text: ui.markdown(''), status, history: ui.divH([], 'tt-history'),
          icon: icon, reason: ui.div(this.getReason(reason), 'tt-reason')
        };
        const map: StatusInfo = {
          'User': user,
          'Date': row.get('date'),
          'Version': this.version,
        };
        if (reason)
          map['Reason'] = this.getReason(reason);
        ui.tooltip.bind(icon, () => ui.tableFromMap(map));
      }
    });
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
        '_blank')?.focus();
    }, 'Test Track folder');
    gh.classList.add('tt-ribbon-button');
    const report = ui.button(getIcon('tasks', { style: 'fas' }), () => {
      const list: { name: string, category: string, status: Status | null, reason: string }[] = [];
      Object.values(this.map).forEach((el) => {
        if ('children' in el) return;
        list.push({ name: el.name, category: el.path.replace(/:\s[^:]+$/, ''), status: el.status, reason: el.reason.innerText });
      });
      const df = DG.DataFrame.fromObjects(list)!;
      df.getCol('status').colors.setCategorical(colors);
      const tv = grok.shell.addTableView(df);
      tv.grid.sort(['category', 'name']);
      tv.name = 'Report';
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
    const refresh = ui.button(getIcon('sync-alt', { style: 'fas' }), () => this.refresh(), 'Refresh');
    refresh.classList.add('tt-ribbon-button');
    ec.classList.add('tt-ribbon-button');
    const start = ui.button(getIcon('plus', { style: 'fas' }), () => this.showStartNewTestingDialog(), 'Start new testing');
    start.classList.add('tt-ribbon-button');
    this.testingName = (await nameP) ?? NEW_TESTING;
    this.nameDiv.innerText = this.testingName;
    this.nameDiv.oncontextmenu = (e) => {
      this.showEditTestingNameDialog();
      e.preventDefault();
    };
    const ribbon = ui.divH([gh, report, ec, refresh, start, this.nameDiv]);
    ribbon.style.flexGrow = '0';

    // Test case div
    const edit = ui.button(getIcon('edit'), () => this.editTestCase(this.currentNode), 'Edit test case');
    edit.id = 'tt-edit-button';
    edit.disabled = true;
    this.tree.onSelectedNodeChanged.subscribe((node) => {
      if (this.currentNode.constructor === DG.TreeViewNode)
        this.currentNode.value.history.style.display = 'none';
      this.currentNode = node;
      this.testCaseDiv.innerHTML = '';
      if ('children' in node.value) {
        edit.disabled = true;
        return;
      }
      this.testCaseDiv.append(node.value.text);
      edit.disabled = false;
      node.value.history.style.display = 'flex';
      if (node.value.history.classList.contains('processed')) return;
      node.value.history.classList.add('processed');
      grok.functions.call('UsageAnalysis:LastStatuses', { path: node.value.path }).then(async (df: DG.DataFrame) => {
        if (!df.rowCount) return;
        const first = df.row(0);
        if (first.get('version') === this.version && first.get('uid') === this.uid && first.get('start') === this.start)
          df.rows.removeAt(0);
        else if (df.rowCount === 4)
          df.rows.removeAt(3);
        const n = Math.min(df.rowCount, 3 - node.value.history.children.length);
        for (const row of df.rows) {
          if (row.idx === n) break;
          const icon = getStatusIcon(row.get('status'));
          node.value.history.append(icon);
          const user = await grok.dapi.users.find(row.get('uid'));
          const map: StatusInfo = {
            'User': user,
            'Date': row.get('date'),
            'Version': row.get('version'),
          };
          const reason = row.get('reason');
          if (reason)
            map['Reason'] = this.getReason(reason);
          ui.tooltip.bind(icon, () => ui.tableFromMap(map));
        }
      });
    });

    // UI
    this.append(ui.div(this.searchInput.root));
    this.append(ui.div([this.testCaseDiv, edit], { id: 'tt-test-case-div-outer' }));
    this.append(ribbon);
    this.append(this.tree.root);
    this.root.style.padding = '0';
    grok.shell.dockManager.dock(this.root, DG.DOCK_TYPE.LEFT, null, this.name, 0.3);

    this.isInitializing = false;
  }

  private closeTreeCategories() {
    const categoriesLists = this.tree.root.getElementsByClassName('d4-tree-view-group-host');
    const categoriesTitles = this.tree.root.getElementsByClassName('d4-tree-view-tri');
    const dom = this.tree.root.getElementsByClassName('d4-tree-view-node');

    for (let i = 0; i < dom.length; i++) {
      const item = dom[i] as HTMLElement;
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
      var result =regExpToSearch.test(stringToCheck.toLocaleLowerCase()) ;
      if(description){
        result = result || regExpToSearch.test(description.toLocaleLowerCase())
      }
      return result ;
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
    const parent = this.map[pathL.slice(0, -1).join(': ') + ' C'] as Category;
    const [textS, jsonS] = (await _package.files.readAsText(file)).split('\r\n---\r\n', 2);
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
        icon: ui.div(), reason: ui.div('', 'tt-reason')
      };
    }
    if (jsonS)
      el = { ...JSON.parse(jsonS), ...el };
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
      return;
    }
    const group = parent.getOrCreateGroup(obj.name, obj, false);
    group.captionLabel.after(group.value.icon);
    for (const child of obj.children)
      this.initTreeGroupRecursive(child, group);
  }

  setContextMenu(): void {
    this.tree.onNodeContextMenu.subscribe((data: any) => {
      const node = data.args.item;
      if (node.constructor === DG.TreeViewGroup) return;
      (data.args.menu as DG.Menu)
        .group('Status').items(['Passed', 'Failed', 'Skipped'],
          (i) => {
            const status = i.toLowerCase() as Status;
            if (node.value.status === status) return;
            data.args.menu.dart.childMenuContainer?.remove();
            data.args.menu.dart.cx?.remove();
            if (status === PASSED)
              this.changeNodeStatus(node, status);
            else
              this.showNodeDialog(node, status);
          },
          { radioGroup: 'Status', isChecked: (i) => i.toLowerCase() === (node.value.status ?? 'empty') })
        .endGroup()
        .item('Edit', () => this.editTestCase(node));
    });
  }

  editTestCase(node: DG.TreeViewNode): void {
    window.open(`https://github.com/datagrok-ai/public/edit/master/packages/UsageAnalysis/files/Test Track/${node.value.path.replaceAll(': ', '/')}.md`, '_blank')?.focus();
  }

  updateGroupStatus(group: DG.TreeViewGroup): void {
    group.value.icon.innerHTML = '';
    const statuses = group.value.children.map((el: TestCase | Category) => el.status);
    if (statuses.includes(null)) {
      group.value.status = null;
      return;
    }
    const status = statuses.includes(FAILED) ? FAILED : statuses.includes(SKIPPED) ? SKIPPED : PASSED;
    group.value.status = status;
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
  showNodeDialog(node: DG.TreeViewNode, status: typeof FAILED | typeof SKIPPED, edit: boolean = false): void {
    const name = `${edit ? 'Edit' : 'Specify'} ${status === FAILED ? 'ticket' : 'skip reason'}`;
    const dialog = ui.dialog(name);
    dialog.root.classList.add('tt-dialog', 'tt-reason-dialog');
    const value = edit ? node.value.reason?.innerText : '';
    const stringInput = ui.stringInput(status === FAILED ? 'Key' : 'Reason', value, () => { });
    stringInput.nullable = false;
    const textInput = ui.textInput(status === FAILED ? 'Keys' : 'Reasons', value, () => { });
    textInput.nullable = false;
    let input = stringInput;
    const tabControl = ui.tabControl({
      'String': stringInput.root,
      'List': textInput.root,
    });
    if (value.includes('\n')) {
      tabControl.currentPane = tabControl.getPane('List');
      input = textInput;
    }
    dialog.root.addEventListener('keydown', (e) => {
      if (e.key == 'Enter' && tabControl.currentPane.name === 'List')
        e.stopImmediatePropagation();
    });
    tabControl.root.style.width = 'unset';
    tabControl.header.style.marginBottom = '15px';
    tabControl.onTabChanged.subscribe((tab: DG.TabPane) => input = tab.name === 'String' ? stringInput : textInput);
    dialog.add(tabControl.root);
    dialog.onOK(() => edit ? this.changeNodeReason(node, input.value, status) : this.changeNodeStatus(node, status, input.value));
    dialog.show({ resizable: true });
    dialog.initDefaultHistory();
  }

  changeNodeStatus(node: DG.TreeViewNode, status: Status, reason?: string): void {
    const value = node.value;
    if (value.status) {
      const oldIcon = getStatusIcon(value.status);
      if (value.history.children.length === 3)
        value.history.children[2].remove();
      value.history.prepend(oldIcon);
    }
    value.status = status;
    value.icon.innerHTML = '';
    value.reason.innerHTML = '';
    const icon = getStatusIcon(status);
    value.icon.append(icon);
    if (status === FAILED || status === SKIPPED)
      value.reason.append(this.getReason(reason!));
    const params = {
      success: status === PASSED, result: reason ?? '', skipped: status === SKIPPED, type: 'manual',
      category: value.path.replace(/:\s[^:]+$/, ''), test: node.text, version: this.version, uid: this.uid, start: this.start
    };
    grok.shell.reportTest('manual', params);
    this.updateGroupStatusRecursiveUp(node.parent as DG.TreeViewGroup);

    grok.dapi.users.find(params['uid']).then((user) => {
      const map: StatusInfo = {
        'User': user,
        'Date': dayjs(),
        'Version': params['version'],
      };

      if (value.reason)
        map['Reason'] = value.reason;
      ui.tooltip.bind(icon, () => ui.tableFromMap(map));
    });
  }

  changeNodeReason(node: DG.TreeViewNode, reason: string, status: Status): void {
    if (status !== node.value.status) {
      grok.shell.warning('Test case status was changed');
      return;
    }
    if (reason === node.value.reason.innerText) return;
    node.value.reason.innerHTML = '';
    node.value.reason.append(this.getReason(reason));
    const params = {
      success: status === PASSED, result: reason, skipped: status === SKIPPED, type: 'manual',
      category: node.value.path.replace(/:\s[^:]+$/, ''), test: node.text, version: this.version, uid: this.uid, start: this.start
    };

    grok.shell.reportTest('manual', params);
  }

  showStartNewTestingDialog(): void {
    const dialog = ui.dialog('Start new testing');
    dialog.root.classList.add('tt-dialog');
    const input = ui.stringInput('Name', NEW_TESTING);
    input.nullable = false;
    dialog.add(ui.divText('Enter name of the new testing:'));
    dialog.add(input);
    dialog.onOK(() => {
      const start = Date.now().toString();
      this.testingName = input.value;
      localStorage.setItem('TTState', start);
      grok.log.usage(`${this.version}_${start}_${this.uid}`,
        { name: this.testingName, version: this.version, uid: this.uid, start: this.start }, `tt-new-testing`);
      this.refresh();
    });
    dialog.show();
  }

  showEditTestingNameDialog(): void {
    const dialog = ui.dialog('Edit testing name');
    dialog.root.classList.add('tt-dialog');
    const input = ui.stringInput('Name', this.testingName);
    dialog.add(input);
    dialog.onOK(() => {
      this.testingName = input.value;
      this.nameDiv.innerText = this.testingName;
      grok.log.usage(`${this.version}_${this.start}_${this.uid}`,
        { name: this.testingName, version: this.version, uid: this.uid, start: this.start }, `tt-new-testing`);
    });
    dialog.show();
  }

  refresh(): void {
    const oldRoot = this.root;
    ui.setUpdateIndicator(oldRoot);
    TestTrack.instance = new TestTrack(this.testingName);
    TestTrack.getInstance().init();
    grok.shell.dockManager.close(oldRoot);
  }

  getReason(reason: string): HTMLElement {
    if (reason.includes('\n')) {
      const el = ui.divText(reason, 'tt-link tt-link-list');
      el.setAttribute('data-label', 'LIST');
      ui.tooltip.bind(el, () => ui.list(reason.split('\n')));
      return el;
    }
    const jira = reason.match(/GROK-\d{1,6}\b/);
    if (jira) return this.getReasonLink(reason, 'https://reddata.atlassian.net/browse/' + jira[0], jira[0]);
    const gh1 = reason.match(/#(\d{3,5})\b/);
    if (gh1) return this.getReasonLink(reason, 'https://github.com/datagrok-ai/public/issues/' + gh1[1], gh1[0]);
    const gh2 = reason.match(/https:\/\/github\.com\/datagrok-ai\/public\/issues\/(\d{3,5})/);
    if (gh2) return this.getReasonLink(reason, reason, `#${gh2[1]}`);
    const slack = reason.includes('datagrok.slack.com');
    if (slack) return this.getReasonLink(reason, reason, 'SLACK');
    const el = ui.label(reason);
    ui.tooltip.bind(el, () => reason);
    return el;
  }

  getReasonLink(reason: string, target: string, label: string): HTMLAnchorElement {
    const link = ui.link(reason, target, reason, 'tt-link');
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
}
