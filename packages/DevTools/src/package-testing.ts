import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { delay, Test, TestContext, initAutoTests, awaitCheck } from '@datagrok-libraries/utils/src/test';
import { initComputeApi } from "@datagrok-libraries/compute-api";
import { c } from './package';
import '../css/styles.css';

interface ITestManagerUI {
  testsTree: DG.TreeViewNode;
  runButton: HTMLButtonElement;
  runAllButton: HTMLButtonElement;
  debugButton: DG.InputBase<boolean>;
  benchmarkButton: DG.InputBase<boolean>;
  runSkippedButton: DG.InputBase<boolean>;
  ribbonPanelDiv: HTMLDivElement;
}

interface IPackageTests {
  name: string;
  friendlyName: string;
  categories: { [index: string]: ICategory } | null;
  totalTests: number | null;
  resultDiv: HTMLElement;
  check: boolean;
}

interface ICategory {
  name: string,
  fullName: string,
  tests: IPackageTest[],
  subcategories: { [index: string]: ICategory },
  packageName: string,
  subCatsNames: string[],
  resultDiv: HTMLElement,
  expand: boolean,
  totalTests: number,
}

interface IPackageTest {
  test: Test,
  packageName: string,
  resultDiv: HTMLElement,
  func: DG.Func | null
}

interface ITestFromUrl {
  packName: string,
  catName: string,
  testName: string
}

export function addView(view: DG.ViewBase): DG.ViewBase {
  view.box = true;
  view.parentCall = c;
  grok.shell.addView(view);
  return view;
}

// eslint-disable-next-line no-unused-vars
enum NODE_TYPE {
  // eslint-disable-next-line no-unused-vars
  PACKAGE = 'Package',
  // eslint-disable-next-line no-unused-vars
  CATEGORY = 'Category',
  // eslint-disable-next-line no-unused-vars
  TEST = 'TEST'
}

const APP_PREFIX: string = `/TestManager/`;
const LAST_SUCCESS = 'last success';
const LAST_FAILURE = 'last failure';

export class TestManager extends DG.ViewBase {
  packagesTests: IPackageTests[] = [];
  testsResultsDf: DG.DataFrame;
  testFunctions: any[];
  testManagerView: DG.View;
  selectedNode: DG.TreeViewGroup | DG.TreeViewNode;
  nodeDict: { [id: string]: any } = {};
  runSkippedMode = false;
  tree: DG.TreeViewGroup;
  ribbonPanelDiv = undefined;
  dockLeft?: boolean;
  detailsTable: HTMLTableElement | undefined;
  searchInput: DG.InputBase = ui.input.search('');
  packagePromises: Map<string, Promise<any>> = new Map<string, Promise<any>>();
  packNodes: any[][] = [];
  isSearchIniting = false;
  timeoutNumber: number | undefined;
  verboseCheckBox: DG.InputBase = ui.input.bool("verbose");

  constructor(name: string, dockLeft?: boolean) {
    super({});
    this.name = name;
    this.dockLeft = dockLeft;
  }

  async init(): Promise<void> {
    let pathSegments = window.location.pathname.split('/');
    let pathInputParameter = new URLSearchParams(window.location.search);;
    console.log(pathInputParameter);
    pathSegments = pathSegments.map((it) => it ? it.replace(/%20/g, ' ') : undefined);
    const TMState = localStorage.getItem('TMState');
    if (pathSegments.length <= 4 && TMState) {
      pathSegments = TMState.split('/');
      pathSegments = pathSegments.map((it) => it ? it.replace(/%20/g, ' ') : undefined);
    }

    // we need to init Compute package here, before loading any of
    // compute model packages, since theirs top level might implicitly
    // depend on Compute provided globals
    try {
      await initComputeApi();
    } catch (e) {
      console.error(e);
    }

    let searchInvoked = false
    this.searchInput.onChanged.subscribe(async (value) => {
      if (value.length > 0) {
        this.searchEvent();
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

    this.testFunctions = await this.collectPackages();
    this.testManagerView = DG.View.create();
    const testFromUrl = pathSegments.length > 4 ?
      {
        packName: pathSegments[4], catName: pathSegments.slice(5, -1).join(': '),
        testName: pathSegments[pathSegments.length - 1]
      } : null;
    const testUIElements: ITestManagerUI = await this.createTestManagerUI(testFromUrl);
    this.testManagerView.name = this.name;
    addView(this.testManagerView);
    this.testManagerView.path = APP_PREFIX;
    this.testManagerView.temp['ignoreCloseAll'] = true;
    this.ribbonPanelDiv = testUIElements.ribbonPanelDiv;
    this.testManagerView.append(ui.div(this.searchInput.root, { style: { maxHeight: '30px', minHeight: '30px' } }));
    this.testManagerView.append(testUIElements.ribbonPanelDiv);
    this.testManagerView.append(testUIElements.testsTree.root);
    if (this.dockLeft)
      grok.shell.dockManager.dock(this.testManagerView.root, DG.DOCK_TYPE.LEFT, null, this.name, 0.25);
    if (pathInputParameter.has("run") && pathInputParameter.get("run") == 'true')
      this.runTestsForSelectedNode();
  }

  async collectPackages(packageName?: string): Promise<any[]> {
    let testFunctions = DG.Func.find({ name: 'Test', meta: { file: 'package-test.js' } });
    testFunctions = testFunctions.sort((a, b) => a.package.friendlyName.localeCompare(b.package.friendlyName));
    if (packageName) testFunctions = testFunctions.filter((f: DG.Func) => f.package.name === packageName);
    return testFunctions;
  }

  async collectPackageTests(packageNode: DG.TreeViewGroup, f: any, testFromUrl?: ITestFromUrl): Promise<void> {
    var resultPromise: Promise<void>;

    if (!this.packagePromises.has(f.package.name))
      this.packagePromises[f.package.name] = new Promise<void>(async (resolve) => {
        const selectedPackage = this.packagesTests.find((pt) => pt.name === f.package.name);
        if (this.testFunctions.filter((it) => it.package.name === f.package.name).length !== 0 &&
          selectedPackage.categories === null && selectedPackage.check === false) {
          selectedPackage.check = true;
          await f.package.load({ file: f.options.file });
          const testModule = f.package.getModule(f.options.file);
          if (!testModule)
            console.error(`Error getting tests from '${f.package.name}/${f.options.file}' module.`);
          const allPackageTests = await f.package.getTests(true);
          const packageTestsFinal: { [cat: string]: ICategory } = {};
          if (allPackageTests) {
            Object.keys(allPackageTests).forEach((cat) => {
              const isAllTestsEnabledBenchmarkMode = allPackageTests[cat].benchmarks;
              const tests: IPackageTest[] = allPackageTests[cat].tests.map((t) => {
                if (t.options.isEnabledBenchmarkMode === undefined) {
                  if (!t.options)
                    t.options = {}
                  t.options.isEnabledBenchmarkMode = isAllTestsEnabledBenchmarkMode || false;
                }
                const result = { test: t, packageName: f.package.name };
                return result;
              });
              const subcats = cat.split(':');
              let subcatsFromUrl = [];
              if (testFromUrl && testFromUrl.catName)
                subcatsFromUrl = testFromUrl.catName.split(':');
              let previousCat = packageTestsFinal;
              for (let i = 0; i < subcats.length; i++) {
                if (!previousCat[subcats[i]]) {
                  previousCat[subcats[i]] = {
                    tests: [],
                    subcategories: {},
                    packageName: f.package.name,
                    name: subcats[i],
                    fullName: subcats.slice(0, i + 1).join(':'),
                    subCatsNames: [cat],
                    resultDiv: null,
                    expand: subcats[i] === subcatsFromUrl[i],
                    totalTests: 0,
                  };
                } else
                  previousCat[subcats[i]].subCatsNames.push(cat);
                if (i === subcats.length - 1) {
                  previousCat[subcats[i]].tests = previousCat[subcats[i]].tests ?
                    previousCat[subcats[i]].tests.concat(tests) : tests;
                } else
                  previousCat = previousCat[subcats[i]].subcategories;
              }
            });
            let testsNumInPack = 0;
            Object.keys(packageTestsFinal)
              .sort((a, b) => a.localeCompare(b))
              .forEach((cat) => {
                testsNumInPack += this.addCategoryRecursive(packageNode, packageTestsFinal[cat], testFromUrl);
              });
            selectedPackage.categories = packageTestsFinal;
            selectedPackage.totalTests = testsNumInPack;
          }
        }
        resolve();
      });

    await this.packagePromises[f.package.name];

    return resultPromise;
  }

  addCategoryRecursive(node: DG.TreeViewGroup, category: ICategory, testFromUrl?: ITestFromUrl): number {
    const testPassed = ui.div();
    category.resultDiv = testPassed;
    const subnode = node.group(category.name, null, category.expand);
    subnode.root.children[0].appendChild(testPassed);
    this.setRunTestsMenuAndLabelClick(subnode, category, NODE_TYPE.CATEGORY);
    if (testFromUrl && testFromUrl.catName === category.fullName)
      this.selectedNode = subnode;

    const subcats = Object.keys(category.subcategories).sort((a, b) => a.localeCompare(b));
    if (subcats.length > 0) {
      subcats.forEach((subcat) => {
        category.totalTests += this.addCategoryRecursive(subnode, category.subcategories[subcat], testFromUrl);
      });
    }
    category.tests.forEach((t) => {
      const testPassed = ui.div();
      const itemDiv = ui.divH([
        ui.divText(t.test.name),
        testPassed,
      ]);
      const item = subnode.item(itemDiv);
      t.resultDiv = testPassed;
      this.setRunTestsMenuAndLabelClick(item, t, NODE_TYPE.TEST);
      ui.tooltip.bind(item.root,
        () => this.getTestsInfoGrid({ package: t.packageName, category: t.test.category, name: t.test.name },
          NODE_TYPE.TEST, true)?.info);
      if (testFromUrl && testFromUrl.catName === category.fullName && testFromUrl.testName === t.test.name)
        this.selectedNode = item;
    });
    category.totalTests += category.tests.length;
    return category.totalTests;
  }

  async createTestManagerUI(testFromUrl: ITestFromUrl): Promise<ITestManagerUI> {
    this.tree = ui.tree();
    this.tree.root.classList.add('test-manager');
    this.tree.onSelectedNodeChanged.subscribe((res) => {
      this.selectedNode = res;
    });
    this.tree.root.style.width = '100%';
    this.tree.root.onkeyup = (e) => {
      if (e.key === 'Enter')
        this.runTestsForSelectedNode();
    };
    for (const pack of this.testFunctions) {
      const testPassed = ui.div();
      this.packagesTests.push({
        name: pack.package.name,
        friendlyName: pack.package.friendlyName,
        categories: null,
        totalTests: null,
        resultDiv: testPassed,
        check: false,
      });
      const packNode = this.tree.group(pack.package.friendlyName,
        null, testFromUrl && pack.package.name === testFromUrl.packName);
      this.setRunTestsMenuAndLabelClick(packNode, pack, NODE_TYPE.PACKAGE);
      if (testFromUrl && testFromUrl.packName === pack.package.name) {
        this.selectedNode = packNode;
        await this.collectPackageTests(packNode, pack, testFromUrl);
      }
      packNode.root.children[0].appendChild(testPassed);
      packNode.onNodeExpanding.subscribe(() => {

        if (this.isSearchIniting && !this.packagePromises.has(packNode.text)) {
          return
        }
        packNode.root.children[0].appendChild(ui.loader());
        this.collectPackageTests(packNode, pack).then((_) => packNode.root.children[0].lastChild.remove());
      });
      this.packNodes.push([pack, packNode]);
    }

    const { runAll, run, debug, benchmark, runSkipped } = this.createButtons();
    const { runAll: runAll1, run: run1, debug: debug1,
      benchmark: benchmark1, runSkipped: runSkipped1 } = this.createButtons();

    const ribbonPanelDiv = ui.divH([runAll1, run1, debug1.root, benchmark1.root, runSkipped1.root],
      {
        style: {
          minHeight: '50px', maxHeight: '50px', alignItems: 'Center',
          borderBottom: '1px solid var(--grey-1)', paddingLeft: '5px'
        }
      });
    ribbonPanelDiv.classList.add('test');

    return {
      runAllButton: runAll, runButton: run, testsTree: this.tree,
      debugButton: debug, benchmarkButton: benchmark, runSkippedButton: runSkipped, ribbonPanelDiv: ribbonPanelDiv
    };
  }

  createButtons(): {
    runAll: HTMLButtonElement,
    run: HTMLButtonElement,
    debug: DG.InputBase<boolean>,
    benchmark: DG.InputBase<boolean>,
    runSkipped: DG.InputBase<boolean>
  } {
    const runTestsButton = ui.button('Run', async () => {
      this.runTestsForSelectedNode();
    }, 'Run selected');

    const runAllButton = ui.bigButton('Run All', async () => {
      const nodes = this.tree.items;
      for (const node of nodes) {
        this.selectedNode = node;
        await this.runTestsForSelectedNode();
      }
    });
    runTestsButton.classList.add('ui-btn-outline');

    const debugButton = ui.input.bool('Debug', { value: DG.Test.isInDebug, onValueChanged: () => { DG.Test.isInDebug = debugButton.value; } });
    debugButton.classList.add('tm-button');

    const benchmarkButton = ui.input.bool('Benchmark', {
      onValueChanged: (value) => {
        DG.Test.isInBenchmark = value;
      }
    });
    benchmarkButton.classList.add('tm-button');

    const runSkippedButton = ui.input.bool('Run skipped', {
      value: this.runSkippedMode,
      onValueChanged: () => { this.runSkippedMode = !this.runSkippedMode; }
    });
    runSkippedButton.classList.add('tm-button');

    return {
      runAll: runAllButton, run: runTestsButton, debug: debugButton,
      benchmark: benchmarkButton, runSkipped: runSkippedButton
    };
  }

  async runTestsForSelectedNode(): Promise<void> {
    if (this.selectedNode) {
      const id = this.selectedNode.root.id;
      await this.runAllTests(this.selectedNode, this.nodeDict[id].tests, this.nodeDict[id].nodeType);
    }
  }

  setRunTestsMenuAndLabelClick(node: DG.TreeViewGroup | DG.TreeViewNode, tests: any, nodeType: NODE_TYPE): void {
    node.captionLabel.oncontextmenu = (e) => {
      const menu = DG.Menu.popup()
        .item('Run', async () => {
          this.runAllTests(node, tests, nodeType);
        })
        .item('Copy', async () => {
          navigator.clipboard.writeText(node.captionLabel.innerText.trim());
        })
        .item('Copy URL', async () => {
          navigator.clipboard.writeText(encodeURI(`${window.location
            .origin}/apps/DevTools${this.getPath(tests, nodeType)}`));
        })
        .item('Copy URL(running)', async () => {
          navigator.clipboard.writeText(encodeURI(`${window.location
            .origin}/apps/DevTools${this.getPath(tests, nodeType)}?run=true`));
        });
      if (nodeType === NODE_TYPE.TEST) {
        menu.item('Run force', async () => {
          this.runAllTests(node, tests, nodeType, true);
        }, 1);
      }
      menu.show();
      e.preventDefault();
      e.stopPropagation();
    };
    node.captionLabel.onclick = () => {
      grok.shell.o = this.getTestsInfoPanel(node, tests, nodeType);
    };
    if (nodeType === NODE_TYPE.TEST) {
      node.captionLabel.ondblclick = async () => {
        this.runAllTests(node, tests, nodeType);
      };
    }
    node.root.id = Object.keys(this.nodeDict).length.toString();
    this.nodeDict[Object.keys(this.nodeDict).length] = { tests: tests, nodeType: nodeType };
  }

  updateTestResultsIcon(resultDiv: HTMLElement, success?: boolean, skipped?: boolean): void {
    if (success === undefined)
      resultDiv.innerHTML = '';
    else
      this.updateIcon(success, resultDiv, skipped);
  }

  testInProgress(resultDiv: HTMLElement, running: boolean): void {
    const icon = ui.iconFA('spinner-third');
    icon.classList.add('fa-spin');
    icon.style.marginLeft = '2px';
    icon.style.marginTop = '0px';
    if (running) {
      resultDiv.innerHTML = '';
      resultDiv.appendChild(icon);
    } else
      resultDiv.innerHTML = '';
  }

  updateIcon(passed: boolean, iconDiv: Element, skipped: boolean): void {
    let icon: HTMLElement;
    if (skipped) icon = ui.iconFA('forward');
    else icon = passed ? ui.iconFA('check') : ui.iconFA('times');
    icon.style.fontWeight = '500';
    icon.style.paddingLeft = '2px';
    icon.style.marginTop = '2px';
    if (skipped) icon.style.color = 'var(--orange-2)';
    else icon.style.color = passed ? 'var(--green-2)' : 'var(--red-3)';
    iconDiv.innerHTML = '';
    iconDiv.appendChild(icon);
  }

  updateIconUnhandled(category: ICategory): void {
    let icon;
    const subcats = Object.keys(category.subcategories).sort((a, b) => a.localeCompare(b));
    if (subcats.length > 0) for (const subcat of subcats) this.updateIconUnhandled(category.subcategories[subcat]);
    for (const t of category.tests) {
      icon = t.resultDiv.firstChild;
      if (icon === null || icon.className.includes('times')) return;
      icon.style.color = 'var(--orange-2)';
    }
    icon = category.resultDiv.firstChild;
    if (icon === null || icon.className.includes('times')) return;
    icon.style.color = 'var(--orange-2)';
  }

  async runTest(t: IPackageTest, force?: boolean): Promise<boolean> {
    let runSkipped = false;
    if (DG.Test.isInBenchmark && !t.test.options?.benchmark) {
      t.test.options.skipReason = "Test can not be runned in benchmark mode";

      this.updateTestResultsIcon(t.resultDiv, true, true);
      return;
    }
    const skipReason = t.test.options?.skipReason;
    if ((force || this.runSkippedMode) && skipReason) {
      t.test.options.skipReason = undefined;
      runSkipped = true;
    }
    this.testInProgress(t.resultDiv, true);
    const res: DG.DataFrame = await grok.functions.call(
      `${t.packageName}:test`, {
      'category': t.test.category,
      'test': t.test.name,
      'testContext': new TestContext(false),
    });
    if (res.getCol('result').type !== 'string')
      res.changeColumnType('result', 'string');
    const testSucceeded = res.get('success', 0);
    if (runSkipped) t.test.options.skipReason = skipReason;
    if (!this.testsResultsDf) {
      this.testsResultsDf = res;
      this.testsResultsDf.changeColumnType('logs', DG.COLUMN_TYPE.STRING);
      this.addPackageInfo(this.testsResultsDf, t.packageName);
    } else {
      if (res.col('package') == null || this.verboseCheckBox.value)
        this.addPackageInfo(res, t.packageName);
      if (!this.verboseCheckBox.value)
        this.removeTestRow(t.packageName, t.test.category, t.test.name);
      res.changeColumnType('logs', DG.COLUMN_TYPE.STRING);
      this.testsResultsDf = this.testsResultsDf.append(res);
    }
    this.updateTestResultsIcon(t.resultDiv, testSucceeded, skipReason && !runSkipped);
    return testSucceeded;
  }

  getPath(tests: any, nodeType: NODE_TYPE): string {
    let path: string;
    switch (nodeType) {
      case NODE_TYPE.PACKAGE:
        path = `${APP_PREFIX}${tests.package.name}`;
        break;
      case NODE_TYPE.CATEGORY:
        path = `${APP_PREFIX}${tests.packageName}/${tests.fullName}`;
        break;
      case NODE_TYPE.TEST:
        path = `${APP_PREFIX}${tests.packageName}/${tests.test.category}/${tests.test.name}`;
        break;
    }
    return path;
  }

  async runAllTests(node: DG.TreeViewGroup | DG.TreeViewNode, tests: any,
    nodeType: NODE_TYPE, force?: boolean): Promise<void> {
    this.testManagerView.path = this.getPath(tests, nodeType);
    let catsValuesSorted: ICategory[];
    localStorage.setItem('TMState', this.testManagerView.path);
    switch (nodeType) {
      case NODE_TYPE.PACKAGE: {
        const progressBar = DG.TaskBarProgressIndicator.create(tests.package.name);
        let testsSucceded = true;
        const packageTests = this.packagesTests.find((pt) => pt.name === tests.package.name);
        this.testInProgress(packageTests.resultDiv, true);
        await this.collectPackageTests(node as DG.TreeViewGroup, tests);
        await awaitCheck(() => packageTests.categories !== null, 'cannot load package categories', 5000);
        const cats = packageTests.categories;
        catsValuesSorted = Object.keys(cats).sort((a, b) => a.localeCompare(b)).map((cat) => cats[cat]);
        let completedTestsNum = 0;
        for (const cat of catsValuesSorted) {
          this.testInProgress(packageTests.resultDiv, true);
          const res = await this.runTestsRecursive(cat, progressBar,
            packageTests.totalTests, completedTestsNum, tests.package.name);
          completedTestsNum = res.completedTests;
          if (!res.catRes)
            testsSucceded = false;
        }
        this.updateTestResultsIcon(packageTests.resultDiv, testsSucceded);
        progressBar.close();
        break;
      }
      case NODE_TYPE.CATEGORY: {
        const progressBar = DG.TaskBarProgressIndicator.create(`${tests.packageName}/${tests.fullName}`);
        await this.runTestsRecursive(tests, progressBar, tests.totalTests, 0, `${tests.packageName}/${tests.fullName}`);
        progressBar.close();
        break;
      }
      case NODE_TYPE.TEST: {
        await this.runTest(tests, force);
        break;
      }
    }
    await delay(1000);
    const unhandled = await grok.shell.lastError;
    if (unhandled) {
      grok.shell.error(`Unhandled exception: ${unhandled}`);
      switch (nodeType) {
        case NODE_TYPE.PACKAGE:
          catsValuesSorted.forEach((cat) => this.updateIconUnhandled(cat));
          break;
        case NODE_TYPE.CATEGORY:
          this.updateIconUnhandled(tests);
          break;
        case NODE_TYPE.TEST:
          if (tests.resultDiv.innerHTML === '') return;
          (tests.resultDiv.firstChild as HTMLElement).style.color = 'var(--orange-2)';
          break;
      }
    }
    setTimeout(async () => {
      const unhandled = await grok.shell.lastError;
      grok.shell.o = this.getTestsInfoPanel(node, tests, nodeType, unhandled);
      //grok.shell.clearLastError();
    }, 30);
  }

  async runTestsRecursive(
    category: ICategory,
    progressBar: DG.TaskBarProgressIndicator,
    totalNumTests: number,
    completedTestsNum: number,
    progressInfo: string): Promise<any> {
    let testsSucceded = true;
    this.testInProgress(category.resultDiv, true);
    const subcats = Object.keys(category.subcategories).sort((a, b) => a.localeCompare(b));
    if (subcats.length > 0) {
      for (const subcat of subcats) {
        this.testInProgress(category.subcategories[subcat].resultDiv, true);
        const res = await this.runTestsRecursive(
          category.subcategories[subcat], progressBar, totalNumTests, completedTestsNum, progressInfo);
        if (!res.catRes)
          testsSucceded = false;
        completedTestsNum = res.completedTests;
      }
    }
    for (const t of category.tests) {
      const res = await this.runTest(t);
      if (!res)
        testsSucceded = false;
      completedTestsNum += 1;
      const percent = Math.floor(completedTestsNum / totalNumTests * 100);
      progressBar.update(percent, `${progressInfo}: ${percent}% completed`);
    }
    this.updateTestResultsIcon(category.resultDiv, testsSucceded);
    return { completedTests: completedTestsNum, catRes: testsSucceded };
  }

  addPackageInfo(df: DG.DataFrame, pack: string): void {
    df.columns.addNewString('package').init(() => pack);
  }

  removeTestRow(pack: string, cat: string, test: string): void {
    for (let i = 0; i < this.testsResultsDf.rowCount; i++) {
      if (this.testsResultsDf.get('package', i) === pack &&
        this.testsResultsDf.get('category', i) === cat && this.testsResultsDf.get('name', i) === test) {
        this.testsResultsDf.rows.removeAt(i);
        return;
      }
    }
  }

  getTestsInfoPanel(node: DG.TreeViewGroup | DG.TreeViewNode, tests: any,
    nodeType: NODE_TYPE, unhandled?: string): HTMLElement {
    const acc = ui.accordion('test manager results');
    acc.root.style.width = '100%';
    const accIcon = ui.element('i');
    accIcon.className = 'grok-icon svg-icon svg-view-layout';
    acc.addTitle(ui.span([accIcon, ui.label(`Tests details`)]));
    const isAggrTest = nodeType === NODE_TYPE.TEST && (tests as IPackageTest).test.options.isAggregated;
    const obj = this.getTestsInfoGrid(this.resultsGridFilterCondition(tests, nodeType),
      nodeType, false, unhandled, isAggrTest);
    const grid = obj.info;
    const resultPanel = ui.divV([this.verboseCheckBox, grid]);
    const testInfo = obj.testInfo;
    acc.addPane('Details', () => ui.div(this.testDetails(node, tests, nodeType), { style: { userSelect: 'text' } }), true);
    const res = acc.addPane('Results', () => ui.div(resultPanel, { style: { width: '100%' } }), true);
    res.root.oncontextmenu = (e) => {
      DG.Menu.popup()
        .item('Print to the console', () => console.error(grid.innerText))
        .show();
      e.preventDefault();
    };
    if (testInfo && testInfo.rowCount === 1 && !testInfo.col('name').isNone(0) && testInfo.col('logs')) {
      const logs: string = testInfo.get('logs', 0);
      acc.addPane('Logs', () => ui.divText(logs), logs !== '');
    }
    acc.addPane('History', () => ui.waitBox(async () => {
      let query: string;
      let params: object;
      let b1: string | boolean = true;
      let b2: string | boolean = false;
      let col: string = 'success';
      switch (nodeType) {
        case NODE_TYPE.PACKAGE:
          query = 'PackageHistory';
          params = { packageName: tests.package.name };
          break;
        case NODE_TYPE.CATEGORY:
          query = 'CategoryHistory';
          params = { packageName: tests.packageName, category: tests.fullName };
          break;
        case NODE_TYPE.TEST:
          query = 'TestHistory';
          params = { packageName: tests.packageName, category: tests.test.category, test: tests.test.name };
          b1 = 'passed';
          b2 = 'failed';
          col = 'status';
          break;
      }
      const history: DG.DataFrame = await grok.data.query(`DevTools:${query}`, params);
      const arr = history.col(col).toList();
      let ind = arr.indexOf(b1);
      this.detailsTable.rows[Object.keys(params).length].cells[1]
        .innerHTML = ind === -1 ? '' : history.get('date', ind);
      ind = arr.indexOf(b2);
      this.detailsTable.rows[Object.keys(params).length + 1].cells[1]
        .innerHTML = ind === -1 ? '' : history.get('date', ind);
      return history.plot.grid().root;
    }), true);
    return acc.root;
  };

  resultsGridFilterCondition(tests: any, nodeType: NODE_TYPE): { package: string, category?: string, name?: string } {
    switch (nodeType) {
      case NODE_TYPE.PACKAGE:
        return { package: tests.package.name };
      case NODE_TYPE.CATEGORY:
        return { package: tests.packageName, category: tests.fullName };
      case NODE_TYPE.TEST:
        return { package: tests.packageName, category: tests.test.category, name: tests.test.name };
    }
  }

  testDetails(node: DG.TreeViewGroup | DG.TreeViewNode, tests: any, nodeType: NODE_TYPE): HTMLDivElement {
    const detailsMap = nodeType === NODE_TYPE.PACKAGE ? { package: tests.package.name } :
      nodeType === NODE_TYPE.CATEGORY ? { package: tests.packageName, category: tests.fullName } :
        { package: tests.packageName, category: tests.test.category, test: tests.test.name };
    detailsMap[LAST_SUCCESS] = ui.loader();
    detailsMap[LAST_FAILURE] = ui.loader();
    const detailsTable = ui.tableFromMap(detailsMap);
    this.detailsTable = detailsTable;
    const runButton = ui.bigButton('RUN', async () => {
      this.runAllTests(node, tests, nodeType);
    });
    runButton.style.cssText = 'width: fit-content; padding: 0 20px';
    return ui.divV([
      detailsTable,
      runButton,
    ]);
  }

  getTestsInfoGrid(condition: object, nodeType: NODE_TYPE, isTooltip?: boolean,
    unhandled?: string, isAggrTest?: boolean): { info: HTMLDivElement, testInfo: DG.DataFrame } {
    let info = ui.divText('No tests have been run');
    let testInfo: DG.DataFrame;
    if (this.testsResultsDf) {
      testInfo = this.testsResultsDf
        .groupBy(this.testsResultsDf.columns.names())
        .where(condition)
        .aggregate();
      const results = testInfo.getCol('success').toList();
      const skipped = testInfo.getCol('skipped').toList().filter((b) => b).length;
      if (unhandled) {
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + "." + currentDate.getMilliseconds().toString().padStart(3, "0");
        testInfo.rows.addNew([formattedDate, false, 'unhandled', 0, false, '', '', testInfo.get('package', 0), '']);
      }
      if (testInfo.rowCount === 1 && testInfo.col('name').isNone(0))
        return { info, testInfo };
      if (testInfo.rowCount === 1 && !testInfo.col('name').isNone(0)) {
        const cat = testInfo.get('category', 0);
        if (isAggrTest) {
          const grid = DG.DataFrame.fromCsv(testInfo.get('result', 0)).plot.grid().root;
          grid.style.width = 'inherit';
          grid.style.maxWidth = null;
          info = ui.div(grid, { style: { width: '100%' } });
          return { info, testInfo };
        }
        const time = testInfo.get('ms', 0);
        const result = testInfo.get('result', 0);
        const resColor = testInfo.get('success', 0) ? 'var(--green-2)' : 'var(--red-3)';
        info = ui.divV([
          ui.divText(result, {
            style: {
              color: testInfo.get('skipped', 0) ?
                'var(--orange-2)' : resColor, userSelect: 'text'
            }
          }),
          ui.divText(`Time, ms: ${time}`),
        ]);
        if (nodeType !== NODE_TYPE.TEST)
          info.appendChild(ui.divText(`Test: ${testInfo.get('name', 0)}`));
        if (nodeType === NODE_TYPE.PACKAGE)
          info.appendChild(ui.divText(`Category: ${cat}`));
      }
      else {
        if (!isTooltip) {
          const resStr = ui.div();
          resStr.innerHTML = `<span>${results.filter((b) => b).length - skipped} passed</span>\
          <span>${results.filter((b) => !b).length} failed</span> <span>${skipped} skipped</span>`;
          const res = ui.divH([resStr, ui.button('Add to workspace', () => {
            grok.shell.addTableView(testInfo);
          })]);
          res.classList.add('dt-res-string');
          info = ui.divV([res, testInfo.plot.grid().root]);
        } else return null;
      }
    }
    return { info, testInfo };
  };

  private closeTreeCategories() {
    const categoriesLists = this.tree.root.getElementsByClassName('d4-tree-view-group-host');
    const categoriesTitles = Array.from(this.tree.root.getElementsByClassName('d4-tree-view-tri'));
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

  private searchEvent() {
    if (!this.isSearchIniting) {
      if (this.testFunctions.length === this.packagePromises.values.length) {
        this.searchTreeItems(this.searchInput.value);
      }
      else {
        this.isSearchIniting = true;
        this.loadAllPackages().then(() => {
          this.searchTreeItems(this.searchInput.value);
          this.isSearchIniting = false;
        });
      }
    }
  }

  private async loadAllPackages(): Promise<void> {
    for (const packNode of this.packNodes) {
      packNode[1].root.children[0].appendChild(ui.loader());
    }

    for (const packNode of this.packNodes) {
      await this.collectPackageTests(packNode[1], packNode[0]);
      packNode[1].root.children[0].lastChild.remove();
      if (this.searchInput.value.length > 0) {
        this.searchTreeItems(this.searchInput.value);
      }
    }
  }

  private async searchTreeItems(stringToSearch: string) {
    const dom = this.tree.root.getElementsByClassName('d4-tree-view-node');
    const regExpToSearch = new RegExp(stringToSearch.toLowerCase());
    const listToShow: HTMLElement[] = [];

    function isFitsSearchString(stringToCheck: string): boolean {
      return regExpToSearch.test(stringToCheck.toLocaleLowerCase());
    }

    for (let i = 0; i < dom.length; i++) {
      const item = dom[i] as HTMLElement;
      const foundFunc = isFitsSearchString(item.textContent?.toString() || '');
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
}
