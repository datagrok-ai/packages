// UI for solving initial value problem for ordinary differential equations

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {basicSetup, EditorView} from 'codemirror';
import {EditorState} from '@codemirror/state';
import {python} from '@codemirror/lang-python';
import {autocompletion} from '@codemirror/autocomplete';
import {SensitivityAnalysisView} from '@datagrok-libraries/compute-utils/function-views/src/sensitivity-analysis-view';
import {FittingView} from '@datagrok-libraries/compute-utils/function-views/src/fitting-view';

import {DF_NAME, CONTROL_EXPR, MAX_LINE_CHART} from './constants';
import {TEMPLATES, DEMO_TEMPLATE} from './templates';
import {USE_CASES} from './use-cases';

import {HINT, TITLE, LINK, HOT_KEY, ERROR_MSG, INFO, DOCK_RATIO, TEMPLATE_TITLES, EXAMPLE_TITLES,
  WARNING, MISC, demoInfo, INPUT_TYPE, PATH, UI_TIME, MODEL_HINT, MAX_RECENT_COUNT,
  modelImageLink, CUSTOM_MODEL_IMAGE_LINK, INPUTS_DF, MAX_FACET_GRAPHS_COUNT} from './ui-constants';

import {getIVP, getScriptLines, getScriptParams, IVP, Input, SCRIPTING,
  BRACE_OPEN, BRACE_CLOSE, BRACKET_OPEN, BRACKET_CLOSE, ANNOT_SEPAR,
  CONTROL_SEP, STAGE_COL_NAME, ARG_INPUT_KEYS, DEFAULT_SOLVER_SETTINGS} from './scripting-tools';

import {CallbackAction, DEFAULT_OPTIONS} from './solver-tools';

import {unusedFileName, getTableFromLastRows, getInputsTable, getLookupsInfo, hasNaN, getCategoryWidget,
  getReducedTable, closeWindows, getRecentModelsTable, getMyModelFiles, getEquationsFromFile,
  getMaxGraphsInFacetGridRow, removeTitle,
  noModels} from './utils';

import {ModelError, showModelErrorHint, getIsNotDefined, getUnexpected, getNullOutput} from './error-utils';

import '../css/app-styles.css';

import {_package} from './package';

const COLORS = DG.Color.categoricalPalette;
const COLORS_COUNT = COLORS.length;

/** State of IVP code editor */
enum EDITOR_STATE {
  EMPTY = 'empty',
  BASIC_TEMPLATE = 'basic',
  ADVANCED_TEMPLATE = 'advanced',
  FROM_FILE = 'from-file',
  EXTENDED_TEMPLATE = 'extended',
  CHEM_REACT = 'chem-react',
  ROBERT = 'robertson',
  FERM = 'fermentation',
  PK = 'pk',
  PKPD = 'pk-pd',
  ACID_PROD = 'ga-production',
  NIMOTUZUMAB = 'nimotuzumab',
  BIOREACTOR = 'bioreactor',
  POLLUTION = 'pollution',
};

/** Return path corresponding to state */
function stateToPath(state: EDITOR_STATE): string {
  switch (state) {
  case EDITOR_STATE.FROM_FILE:
    return PATH.CUSTOM;

  case EDITOR_STATE.EMPTY:
    return '';

  case EDITOR_STATE.BASIC_TEMPLATE:
  case EDITOR_STATE.ADVANCED_TEMPLATE:
  case EDITOR_STATE.EXTENDED_TEMPLATE:
    return `/${TITLE.TEMPL}/${state}`;

  default:
    return `/${TITLE.LIBRARY}/${state}`;
  }
}

/** State-to-template/use-case map */
const MODEL_BY_STATE = new Map<EDITOR_STATE, TEMPLATES | USE_CASES>([
  [EDITOR_STATE.BASIC_TEMPLATE, TEMPLATES.BASIC],
  [EDITOR_STATE.ADVANCED_TEMPLATE, TEMPLATES.ADVANCED],
  [EDITOR_STATE.EXTENDED_TEMPLATE, TEMPLATES.EXTENDED],
  [EDITOR_STATE.CHEM_REACT, USE_CASES.CHEM_REACT],
  [EDITOR_STATE.ROBERT, USE_CASES.ROBERTSON],
  [EDITOR_STATE.FERM, USE_CASES.FERMENTATION],
  [EDITOR_STATE.PK, USE_CASES.PK],
  [EDITOR_STATE.PKPD, USE_CASES.PK_PD],
  [EDITOR_STATE.ACID_PROD, USE_CASES.ACID_PROD],
  [EDITOR_STATE.NIMOTUZUMAB, USE_CASES.NIMOTUZUMAB],
  [EDITOR_STATE.BIOREACTOR, USE_CASES.BIOREACTOR],
  [EDITOR_STATE.POLLUTION, USE_CASES.POLLUTION],
]);

/** Model title-to-editor state map */
const STATE_BY_TITLE = new Map<TITLE, EDITOR_STATE>([
  [TITLE.BASIC, EDITOR_STATE.BASIC_TEMPLATE],
  [TITLE.ADV, EDITOR_STATE.ADVANCED_TEMPLATE],
  [TITLE.EXT, EDITOR_STATE.EXTENDED_TEMPLATE],
  [TITLE.CHEM, EDITOR_STATE.CHEM_REACT],
  [TITLE.ROB, EDITOR_STATE.ROBERT],
  [TITLE.FERM, EDITOR_STATE.FERM],
  [TITLE.PK, EDITOR_STATE.PK],
  [TITLE.PKPD, EDITOR_STATE.PKPD],
  [TITLE.ACID, EDITOR_STATE.ACID_PROD],
  [TITLE.NIM, EDITOR_STATE.NIMOTUZUMAB],
  [TITLE.BIO, EDITOR_STATE.BIOREACTOR],
  [TITLE.POLL, EDITOR_STATE.POLLUTION],
]);

/** Model state-to-title map */
const TITLE_BY_STATE = new Map();
STATE_BY_TITLE.forEach((val, key) => TITLE_BY_STATE.set(val, key));

/** Models & templates */
const MODELS: string[] = [
  EDITOR_STATE.BASIC_TEMPLATE,
  EDITOR_STATE.ADVANCED_TEMPLATE,
  EDITOR_STATE.EXTENDED_TEMPLATE,
  EDITOR_STATE.CHEM_REACT,
  EDITOR_STATE.ROBERT,
  EDITOR_STATE.FERM,
  EDITOR_STATE.PK,
  EDITOR_STATE.PKPD,
  EDITOR_STATE.ACID_PROD,
  EDITOR_STATE.NIMOTUZUMAB,
  EDITOR_STATE.BIOREACTOR,
  EDITOR_STATE.POLLUTION,
];

/** Return help link with respect to IVP editor state */
function getLink(state: EDITOR_STATE): string {
  switch (state) {
  case EDITOR_STATE.CHEM_REACT:
    return LINK.CHEM_REACT;

  case EDITOR_STATE.ROBERT:
    return LINK.ROBERTSON;

  case EDITOR_STATE.FERM:
    return LINK.FERMENTATION;

  case EDITOR_STATE.PK:
    return LINK.PK;

  case EDITOR_STATE.PKPD:
    return LINK.PKPD;

  case EDITOR_STATE.ACID_PROD:
    return LINK.GA_PRODUCTION;

  case EDITOR_STATE.NIMOTUZUMAB:
    return LINK.NIMOTUZUMAB;

  case EDITOR_STATE.BIOREACTOR:
    return LINK.BIOREACTOR;

  case EDITOR_STATE.POLLUTION:
    return LINK.POLLUTION;

  case EDITOR_STATE.EXTENDED_TEMPLATE:
    return LINK.INTERFACE;

  default:
    return LINK.DIF_STUDIO_REL;
  }
} // getLink

/** Completions of control expressions */
const completions = [
  {label: `${CONTROL_EXPR.NAME}: `, type: 'keyword', info: INFO.NAME},
  {label: `${CONTROL_EXPR.TAGS}: `, type: 'keyword', info: INFO.TAGS},
  {label: `${CONTROL_EXPR.DESCR}: `, type: 'keyword', info: INFO.DESCR},
  {label: `${CONTROL_EXPR.DIF_EQ}:\n  `, type: 'keyword', info: INFO.DIF_EQ},
  {label: `${CONTROL_EXPR.EXPR}:\n  `, type: 'keyword', info: INFO.EXPR},
  {label: `${CONTROL_EXPR.ARG}: `, type: 'keyword', info: INFO.ARG},
  {label: `${CONTROL_EXPR.INITS}:\n  `, type: 'keyword', info: INFO.INITS},
  {label: `${CONTROL_EXPR.PARAMS}:\n  `, type: 'keyword', info: INFO.PARAMS},
  {label: `${CONTROL_EXPR.CONSTS}:\n  `, type: 'keyword', info: INFO.CONSTS},
  {label: `${CONTROL_EXPR.TOL}: `, type: 'keyword', info: INFO.TOL},
  {label: `${CONTROL_EXPR.SOLVER}: `, type: 'keyword', info: INFO.SOLVER},
  {label: `${CONTROL_EXPR.LOOP}:\n  `, type: 'keyword', info: INFO.LOOP},
  {label: `${CONTROL_EXPR.UPDATE}:  `, type: 'keyword', info: INFO.UPDATE},
  {label: `${CONTROL_EXPR.OUTPUT}:\n  `, type: 'keyword', info: INFO.OUTPUT},
  {label: `${CONTROL_EXPR.COMMENT}: `, type: 'keyword', info: INFO.COMMENT},
  {label: `${CONTROL_EXPR.INPUTS}: `, type: 'keyword', info: INFO.INPUS},
];

/** Control expressions completion utility */
function contrCompletions(context: any) {
  const before = context.matchBefore(/[#]\w*/);

  if (!context.explicit && !before) return null;
  return {
    from: before ? before.from : context.pos,
    options: completions,
    validFor: /^\w*$/,
  };
}

/** Return options of line chart */
function getLineChartOptions(colNames: string[]): Partial<DG.ILineChartSettings> {
  const count = colNames.length;
  return {
    xColumnName: colNames[0],
    yColumnNames: (count > 1) ? colNames.slice(1).filter((name) => name !== STAGE_COL_NAME) : [colNames[0]],
    showTitle: true,
    multiAxis: count > MAX_LINE_CHART,
    multiAxisLegendPosition: DG.FlexExtendedPosition.RightTop,
    segmentColumnName: colNames.includes(STAGE_COL_NAME) ? STAGE_COL_NAME: undefined,
    showAggrSelectors: false,
  };
}

/**  String-to-value */
const strToVal = (s: string) => {
  const num = Number(s);
  return !isNaN(num) ? num : s === 'true' ? true : s === 'false' ? false : s;
};

/** Browse properties */
type Browsing = {
  treeNode: DG.TreeViewGroup,
  browseView: DG.BrowseView,
};

/** Last called model specification */
type LastModel = {
  info: string,
  isCustom: boolean,
};

/** Solver of differential equations */
export class DiffStudio {
  /** Run Diff Studio application */
  public async runSolverApp(content?: string, state?: EDITOR_STATE, path?: string): Promise<DG.ViewBase> {
    closeWindows();
    this.createEditorView(content);

    const panels = [
      [this.openComboMenu, this.addNewWgt],
      [this.refreshWgt, this.exportToJsWgt, this.helpIcon, this.fittingWgt, this.sensAnWgt],
      [this.saveBtn, this.downLoadIcon, this.appStateInputWgt],
    ];

    this.solverView.setRibbonPanels(panels);
    this.updateRibbonWgts();

    this.toChangePath = true;

    setTimeout(async () => {
    // routing
      if (content) {
        this.fromFileHandler = true;

        if (path) {
          this.isRecentRun = true;
          this.solverMainPath = path;
        } else
          this.solverMainPath = `${PATH.APPS_DS}${PATH.CUSTOM}`;
        await this.runSolving();
      } else if (state) {
        this.inBrowseRun = true;
        await this.setState(state);
      } else {
        const modelIdx = this.startingPath.lastIndexOf('/') + 1;
        const paramsIdx = this.startingPath.indexOf(PATH.PARAM);

        if (paramsIdx > -1) {
          const model = this.startingPath.slice(modelIdx, (paramsIdx > -1) ? paramsIdx : undefined);

          if (MODELS.includes(model)) {
            this.startingInputs = new Map<string, number>();

            if (modelIdx < paramsIdx) {
              try {
                this.startingPath.slice(paramsIdx + PATH.PARAM.length).split(PATH.AND).forEach((equality) => {
                  const eqIdx = equality.indexOf(PATH.EQ);
                  this.startingInputs?.set(equality.slice(0, eqIdx).toLowerCase(), Number(equality.slice(eqIdx + 1)));
                });
              } catch (error) {
                this.startingInputs = null;
              }
            }

            await this.setState(model as EDITOR_STATE, false);
          } else
            await this.runLastCalledModel();
        } else {
          const folderName = this.startingPath.slice(modelIdx);
          const node = this.appTree.items.find((node) => node.text === folderName);

          if (node !== undefined) {
            setTimeout(() => node.root.click(), UI_TIME.SWITCH_TO_FOLDER);
            return DG.View.create();
          } else
            await this.runLastCalledModel();
        }
      }
    },
    UI_TIME.APP_RUN_SOLVING);

    return this.solverView;
  } // runSolverApp

  /** Run Diff Studio demo application */
  public async runSolverDemoApp(): Promise<void> {
    this.createEditorView(DEMO_TEMPLATE);
    closeWindows();

    this.solverView.setRibbonPanels([
      [this.openComboMenu, this.addNewWgt],
      [this.refreshWgt, this.exportToJsWgt, this.openHelpInNewTabIcon, this.fittingWgt, this.sensAnWgt],
      [this.saveBtn, this.downLoadIcon, this.appStateInputWgt],
    ]);
    this.updateRibbonWgts();

    this.toChangePath = false;
    const helpMD = ui.markdown(demoInfo);
    helpMD.classList.add('diff-studio-demo-app-div-md');
    const divHelp = ui.div([helpMD], 'diff-studio-demo-app-div-help');
    grok.shell.windows.help.showHelp(divHelp);
    grok.shell.windows.context.visible = true;
    grok.shell.windows.showContextPanel = false;
    grok.shell.windows.showProperties = false;
    grok.shell.windows.help.visible = true;
    await this.runSolving();
  } // runSolverDemoApp

  /** Return file preview view */
  public async getFilePreview(file: DG.FileInfo, path: string): Promise<DG.View> {
    closeWindows();
    const equations = await file.readAsString();
    await this.saveModelToRecent(file.fullPath, true);
    this.createEditorView(equations);
    this.toChangePath = true;
    this.solverView.setRibbonPanels([]);

    const saveBtn = ui.button(TITLE.SAVE, async () => {
      const source = new DG.FileSource();

      try {
        await source.writeAsText(file.fullPath, this.editorView!.state.doc.toString());
      } catch (error) {
        grok.shell.error(ERROR_MSG.FAILED_TO_SAVE);
      }

      saveBtn.hidden = true;
    }, HINT.SAVE);
    this.solverView.append(saveBtn);
    saveBtn.hidden = true;

    const ribbonPnls = this.browseView!.getRibbonPanels();
    ribbonPnls.push([this.openComboMenu, this.addNewWgt]);
    ribbonPnls.push([this.refreshWgt, this.exportToJsWgt, this.helpIcon, this.fittingWgt, this.sensAnWgt]);
    ribbonPnls.push([this.downLoadIcon, this.appStateInputWgt, saveBtn]);
    this.browseView!.setRibbonPanels(ribbonPnls);

    this.updateRibbonWgts();

    // routing
    const paramsIdx = path.indexOf(PATH.PARAM);
    if (paramsIdx > -1) {
      try {
        this.startingInputs = new Map<string, number>();
        path.slice(paramsIdx + PATH.PARAM.length).split(PATH.AND).forEach((equality) => {
          const eqIdx = equality.indexOf(PATH.EQ);
          this.startingInputs!.set(equality.slice(0, eqIdx).toLowerCase(), Number(equality.slice(eqIdx + 1)));
        });
      } catch (error) {
        this.startingInputs = null;
      }
    }

    this.editorView!.dom.addEventListener('keydown', async (e) => saveBtn.hidden = false);

    this.toRunWhenFormCreated = true;

    setTimeout(() => {
      const node = this.solverView.dockManager.dock(
        this.tabControl.root,
        DG.DOCK_TYPE.LEFT,
        null,
        undefined,
        DOCK_RATIO,
      );

      if (node.container.dart.elementTitle)
        node.container.dart.elementTitle.hidden = true;

      this.runSolving();
    }, UI_TIME.PREVIEW_RUN_SOLVING);

    return this.solverView;
  } // getFilePreview

  static isStartingUriProcessed: boolean = false;

  private solutionTable = DG.DataFrame.create();
  private startingPath = window.location.href;
  private startingInputs: Map<string, number> | null = null;
  private solverView: DG.TableView;
  private solverMainPath: string = PATH.CUSTOM;
  private solutionViewer: DG.Viewer | null = null;
  private viewerDockNode: DG.DockNode | null = null;
  private toChangeSolutionViewerProps = false;
  private modelDiv = ui.divV([]);
  private inputsPanel = ui.panel([]);
  private prevInputsNode: Node | null = null;
  private tabControl: DG.TabControl = ui.tabControl();
  private editorState: EDITOR_STATE = EDITOR_STATE.BASIC_TEMPLATE;
  private toShowWarning = true;
  private isModelChanged = false;
  private toChangeInputs = false;
  private isSolvingSuccess = false;
  private toChangePath = false;
  private toRunWhenFormCreated = true;
  private toCheckPerformance = true;
  private toShowPerformanceDlg = true;
  private isStartingRun = true;
  private secondsLimit = UI_TIME.SOLV_DEFAULT_TIME_SEC;
  private editPane: DG.TabPane;
  private solvePane: DG.TabPane;
  private editorView: EditorView | undefined;
  private performanceDlg: DG.Dialog | null = null;
  private inBrowseRun = false;
  private fromFileHandler = false;
  private appTree: DG.TreeViewGroup | null = null;
  private recentFolder: DG.TreeViewGroup | null = null;
  private browseView: DG.BrowseView | null = null;
  private isRecentRun = false;

  private inputsByCategories = new Map<string, DG.InputBase[]>();
  private toPreventSolving = false;
  private inputByName: Map<string, DG.InputBase> | null = null;
  private topCategory: string | null = null;

  private toSwitchToModelTab: boolean = true;

  private isEditState = false;

  private openComboMenu = this.getOpenComboMenu();
  private addNewWgt = this.getAddNewWgt();
  private appStateInputWgt = this.getAppStateInput();
  private saveBtn = this.getSaveBtn();
  private downLoadIcon = this.getDownLoadIcon();
  private helpIcon = this.getHelpIcon();
  private openHelpInNewTabIcon = this.getHelpInNewTabIcon();
  private exportToJsWgt = this.getExportToJsWgt();
  private refreshWgt = this.getRefreshWgt();
  private sensAnWgt = this.getSensAnWgt();
  private fittingWgt = this.getFitWgt();

  private facetGridDiv: HTMLDivElement | null = null;
  private facetGridNode: DG.DockNode | null = null;
  private facetPlots: DG.Viewer[] = [];

  constructor(toAddTableView: boolean = true, toDockTabCtrl: boolean = true, isFilePreview: boolean = false,
    browsing?: Browsing) {
    this.solverView = toAddTableView ?
      grok.shell.addTableView(this.solutionTable) :
      DG.TableView.create(this.solutionTable, false);

    this.solverView.helpUrl = LINK.DIF_STUDIO_REL;
    this.solverView.name = MISC.VIEW_DEFAULT_NAME;
    this.solvePane = this.tabControl.addPane(TITLE.SOLVE, () => this.inputsPanel);
    this.editPane = this.tabControl.addPane(TITLE.EDIT, () => {
      setTimeout(() => {
        this.modelDiv.style.height = '100%';
        if (this.editorView)
          this.editorView!.dom.style.height = '100%';
      }, 10);
      return this.modelDiv;
    });
    this.tabControl.header.hidden = true;

    this.tabControl.onTabChanged.subscribe(async (_) => {
      if ((this.tabControl.currentPane === this.solvePane) && this.toChangeInputs)
        await this.runSolving();
    });

    const dockTabCtrl = () => {
      const node = this.solverView.dockManager.dock(
        this.tabControl.root,
        DG.DOCK_TYPE.LEFT,
        null,
        undefined,
        DOCK_RATIO,
      );

      if (node.container.dart.elementTitle)
        node.container.dart.elementTitle.hidden = true;
    };

    if (toDockTabCtrl && !isFilePreview) {
      if (!toAddTableView)
        setTimeout(dockTabCtrl, UI_TIME.DOCK_EDITOR_TIMEOUT);
      else
        dockTabCtrl();
    }

    this.createTree(browsing);

    this.solverView.ribbonMenu = DG.Menu.create();

    //this.prepareClosingEvent();
  }; // constructor

  /** Update ribbon panel widgets */
  private updateRibbonWgts() {
    this.sensAnWgt.hidden = this.isEditState;
    this.fittingWgt.hidden = this.isEditState;
    this.refreshWgt.hidden = !this.isEditState;
    this.exportToJsWgt.hidden = !this.isEditState;
    this.helpIcon.hidden = !this.isEditState;
    this.openHelpInNewTabIcon.hidden = !this.isEditState;
  }

  /** Return the save model button */
  private getSaveBtn(): HTMLButtonElement {
    const btn = ui.bigButton(TITLE.SAVE, async () => await this.saveToMyFiles(), HINT.SAVE_MY);
    btn.disabled = true;
    return btn;
  }

  /** Return the download model widget */
  private getDownLoadIcon(): HTMLElement {
    const icon = ui.iconFA('arrow-to-bottom', async () => await this.saveToLocalFile(), HINT.SAVE_LOC);
    icon.classList.add('diff-studio-ribbon-download');

    return icon;
  }

  /** Return the run fitting widget */
  private getFitWgt(): HTMLElement {
    const span = ui.span(['Fit']);
    span.classList.add('diff-studio-ribbon-text');
    const icn = ui.iconImage('Fit', `${_package.webRoot}files/icons/diff-studio-icon-chart-dots.svg`);
    icn.classList.add('diff-studio-svg-icon');

    const wgt = ui.divH([icn, span]);
    wgt.onclick = async () => await this.runFitting();
    ui.tooltip.bind(wgt, 'Fit parameters. Opens a separate view');

    return wgt;
  }

  /** Return the run sensitivity analysis widget */
  private getSensAnWgt(): HTMLElement {
    const span = ui.span(['Sensitivity']);
    span.classList.add('diff-studio-ribbon-text');

    const icn = ui.iconImage('Fit', `${_package.webRoot}files/icons/diff-studio-icon-chart-sensitivity.svg`);
    icn.classList.add('diff-studio-svg-icon');

    icn.classList.add('diff-studio-ribbon-sa-icon');
    const wgt = ui.divH([icn, span]);
    wgt.onclick = async () => await this.runSensitivityAnalysis();
    ui.tooltip.bind(wgt, 'Run sensitivity analysis. Opens a separate view');

    return wgt;
  }
  /** Return the app state control widget */
  private getAppStateInput(): HTMLElement {
    const input = ui.input.toggle('', {value: this.isEditState});

    const span = ui.span([TITLE.EDIT]);
    span.classList.add('diff-studio-ribbon-text');

    const wgt = ui.divH([input.root, span]);

    ui.tooltip.bind(wgt, this.isEditState ? 'Finish editing' : 'Edit equations');

    wgt.onclick = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();

      this.isEditState = !this.isEditState;
      input.value = this.isEditState;
      ui.tooltip.bind(wgt, this.isEditState ? 'Finish editing' : 'Edit equations');
      this.tabControl.currentPane = this.isEditState ? this.editPane : this.solvePane;
      this.updateRibbonWgts();
      this.updateRefreshWidget(this.isModelChanged);
    };

    return wgt;
  }

  /** Return the open model in a new view widget */
  private getAddNewWgt(): HTMLElement {
    const span = ui.span(['New']);
    span.classList.add('diff-studio-ribbon-text');
    const wgt = ui.divH([ui.iconFA('plus'), span]);
    wgt.onclick = async () => {
      const solver = new DiffStudio();
      await solver.runSolverApp(this.editorView!.state.doc.toString());
    };
    ui.tooltip.bind(wgt, 'Open a copy of the current model in a new view');

    return wgt;
  }

  /** Return the open help widget */
  private getHelpIcon(): HTMLElement {
    const icon = ui.icons.help(() => {
      grok.shell.windows.showHelp = true;
      this.tabControl.currentPane.content.click();
    });
    icon.classList.add('diff-studio-help-icon');

    return icon;
  }

  /** Return a widget for opening help in a new window */
  private getHelpInNewTabIcon(): HTMLElement {
    const icon = ui.icons.help(() => window.open(LINK.DIF_STUDIO, '_blank'), HINT.HELP);
    icon.classList.add('diff-studio-help-icon');

    return icon;
  }

  /** Return the export to JavaScript widget */
  private getExportToJsWgt(): HTMLElement {
    const wgt = ui.span(['</>']);
    wgt.classList.add('d4-ribbon-name');
    wgt.classList.add();
    wgt.style.minWidth = '20px';
    wgt.style.marginLeft = '7px';
    wgt.style.marginRight = '14px';
    wgt.onclick = async () => await this.exportToJS();
    ui.tooltip.bind(wgt, HINT.TO_JS);

    return wgt;
  }

  /** Return the refresh solution widget */
  private getRefreshWgt(): HTMLElement {
    const span = ui.span(['Refresh']);
    span.classList.add('diff-studio-ribbon-text');
    span.style.color = this.isModelChanged ? '#40607F' : 'var(--grey-3)';

    const icn = ui.iconFA('sync');
    icn.style.color = this.isModelChanged ? '#40607F' : 'var(--grey-3)';

    const wgt = ui.divH([icn, span]);
    wgt.onclick = async () => {
      if (this.isModelChanged) {
        await this.runSolving();
        this.updateRefreshWidget(this.isModelChanged);
      }
    };

    ui.tooltip.bind(wgt, 'Apply changes (F5)');

    return wgt;
  }

  /** Return widget color */
  private getColor(enabled: boolean) {
    return enabled ? '#40607F' : 'var(--grey-3)';
  }

  /** Update state of the refresh solution widget */
  private updateRefreshWidget(enabled: boolean) {
    const ch = this.refreshWgt.children;
    const color = this.getColor(enabled);
    (ch.item(0) as HTMLElement).style.color = color;
    (ch.item(1) as HTMLElement).style.color = color;
  }

  /** Update state of the export to JavaScript widget */
  private updateExportToJsWidget(enabled: boolean) {
    const color = this.getColor(enabled);
    this.exportToJsWgt.style.color = color;
  }

  /** Create model editor */
  private createEditorView(content?: string): void {
    this.editorView = new EditorView({
      doc: content ?? TEMPLATES.BASIC,
      extensions: [basicSetup, python(), autocompletion({override: [contrCompletions]})],
      parent: this.modelDiv,
    });

    this.editorView.dom.addEventListener('keydown', async (e) => {
      if (e.key !== HOT_KEY.RUN) {
        this.isModelChanged = true;
        this.toChangeInputs = true;
        this.solverView.path = PATH.CUSTOM;
        this.solverMainPath = PATH.CUSTOM;
        this.startingInputs = null;
        this.solverView.helpUrl = LINK.DIF_STUDIO_REL;
        this.isSolvingSuccess = false;
        this.toRunWhenFormCreated = true;
        this.toChangeSolutionViewerProps = true;
        this.toSwitchToModelTab = true;
        this.saveBtn.disabled = false;
        this.updateRefreshWidget(true);
        this.updateExportToJsWidget(true);
      } else {
        e.stopImmediatePropagation();
        e.preventDefault();

        await this.runSolving();
      }
    });

    this.editorView.dom.classList.add('diff-studio-eqs-editor');
  } // createEditorView

  /** Load IVP from file */
  private async loadFn(): Promise<void> {
    let text = '';
    const dlg = ui.dialog('Open a file');
    const fileInp = document.createElement('input');
    fileInp.type = 'file';
    fileInp.onchange = () => {
      //@ts-ignore
      const [file] = document.querySelector('input[type=file]').files;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        text = reader.result as string;
        this.setState(EDITOR_STATE.FROM_FILE, true, text);
        dlg.close();
      }, false);

      if (file)
        reader.readAsText(file);
    };

    dlg.add(fileInp);
    fileInp.click();
  }; // loadFn

  /** Save the current IVP to local file */
  private async saveToLocalFile(): Promise<void> {
    const link = document.createElement('a');
    const file = new Blob([this.editorView!.state.doc.toString()], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = MISC.FILE_DEFAULT_NAME;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /** Save the current IVP to My files */
  private async saveToMyFiles(): Promise<void> {
    const modelCode = this.editorView!.state.doc.toString();
    const modelName = getIVP(modelCode).name.replaceAll(' ', '-');
    const login = grok.shell.user.project.name;
    const folder = login.charAt(0).toUpperCase() + login.slice(1) + ':Home/';
    const files = await grok.dapi.files.list(folder);

    // get model file names in from the user's folder
    const existingNames = files.filter((file) => file.extension === MISC.MODEL_FILE_EXT).map((file) => file.name);

    let fileName = unusedFileName(modelName, existingNames);
    const nameInput = ui.input.string(TITLE.NAME, {
      value: fileName,
      nullable: false,
      onValueChanged: () => {
        if (nameInput.value !== null) {
          fileName = nameInput.value.replaceAll(' ', '-');
          dlg.getButton(TITLE.SAVE).disabled = false;
        } else
          dlg.getButton(TITLE.SAVE).disabled = true;
      },
    });

    const save = async () => {
      const path = `${folder}${fileName}.${MISC.MODEL_FILE_EXT}`;

      try {
        await grok.dapi.files.writeAsText(path, modelCode);
        await this.saveModelToRecent(path, true);
        grok.shell.info(`Model saved to ${path}`);
      } catch (error) {
        grok.shell.error(`Failed to save model: ${error instanceof Error ? error.message : 'platform issue'}`);
      }

      dlg.close();
    };

    const dlg = ui.dialog({title: TITLE.SAVE_TO_MY_FILES, helpUrl: LINK.LOAD_SAVE})
      .add(nameInput)
      .addButton(TITLE.SAVE, async () => {
        if (!existingNames.includes(`${fileName}.${MISC.MODEL_FILE_EXT}`))
          await save();
        else {
          ui.dialog({title: WARNING.TITLE})
            .add(ui.label(WARNING.OVERWRITE_FILE))
            .onOK(async () => await save())
            .show();
        }

        this.saveBtn.disabled = true;
      }, undefined, HINT.SAVE_MY)
      .show();
  }; // saveToMyFiles

  /** Set IVP code editor state */
  private async setState(state: EDITOR_STATE,
    toClearStartingInputs: boolean = true, text?: string | undefined): Promise<void> {
    this.toChangeSolutionViewerProps = true;
    this.isModelChanged = false;
    this.saveBtn.disabled = true;
    this.editorState = state;
    this.solutionTable = DG.DataFrame.create();
    this.solverView.dataFrame = this.solutionTable;
    this.solverView.helpUrl = getLink(state);

    if (toClearStartingInputs)
      this.startingInputs = null;

    const newState = EditorState.create({
      doc: text ?? MODEL_BY_STATE.get(state) as string,
      extensions: [basicSetup, python(), autocompletion({override: [contrCompletions]})],
    });

    this.editorView!.setState(newState);

    // set path
    this.solverMainPath = `${(this.fromFileHandler) ? PATH.APPS_DS : ''}${stateToPath(state)}`;

    // save model to recent

    switch (state) {
    case EDITOR_STATE.EMPTY:
      this.clearSolution();
      break;

    case EDITOR_STATE.FROM_FILE:
      await this.runSolving();
      break;

    case EDITOR_STATE.BASIC_TEMPLATE:
      await this.runSolving();
      break;

    case EDITOR_STATE.ADVANCED_TEMPLATE:
    case EDITOR_STATE.EXTENDED_TEMPLATE:
      await this.saveModelToRecent(state, false);
      await this.runSolving();
      break;

    default:
      await this.saveModelToRecent(state, false);
      await this.runSolving();
      break;
    }

    this.isStartingRun = false;
  }; // setState

  /** Overwrite the editor content */
  private async overwrite(state?: EDITOR_STATE): Promise<void> {
    if (this.toShowWarning && this.isModelChanged) {
      const boolInput = ui.input.bool(
        WARNING.CHECK, {
          value: true,
          onValueChanged: () => this.toShowWarning = !this.toShowWarning,
        },
      );
      const dlg = ui.dialog({title: WARNING.TITLE, helpUrl: LINK.DIF_STUDIO_REL});
      this.solverView.append(dlg);

      dlg.add(ui.label(WARNING.OVERWRITE_MODEL))
        .add(boolInput.root)
        .onCancel(() => dlg.close())
        .onOK(async () => {
          if (state === undefined)
            await this.loadFn();
          else
            this.setState(state ?? EDITOR_STATE.EMPTY);
        })
        .show();
    } else if (state === undefined)
      await this.loadFn();
    else
      this.setState(state ?? EDITOR_STATE.EMPTY);
  }; // overwrite

  /** Get JS-script for solving the current IVP */
  private async exportToJS(): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.tryToSolve(ivp);
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      const script = DG.Script.create(scriptText);
      const sView = DG.ScriptView.create(script);
      grok.shell.addView(sView);
    } catch (err) {
      this.processError(err);
    }
  }; // exportToJS

  /** Solve IVP */
  private async solve(ivp: IVP, inputsPath: string): Promise<void> {
    if (this.toPreventSolving)
      return;

    const customSettings = (ivp.solverSettings !== DEFAULT_SOLVER_SETTINGS);

    try {
      if (this.toChangePath) {
        this.solverView.path = `${this.solverMainPath}${PATH.PARAM}${inputsPath}`;

        if (this.inBrowseRun)
          this.browseView.path = `/${PATH.BROWSE}${PATH.APPS_DS}${this.solverView.path}`;

        if (this.isRecentRun)
          this.browseView.path = this.solverView.path;
      }

      const start = ivp.arg.initial.value;
      const finish = ivp.arg.final.value;
      const step = ivp.arg.step.value;

      if (start >= finish)
        return;

      if ((step <= 0) || (step > finish - start))
        return;

      if (this.toCheckPerformance && !customSettings)
        ivp.solverSettings = `{maxTimeMs: ${this.secondsLimit * 1000}}`;

      const scriptText = getScriptLines(ivp).join('\n');
      const script = DG.Script.create(scriptText);
      const params = getScriptParams(ivp);
      const call = script.prepare(params);

      await call.call();

      if (!customSettings)
        ivp.solverSettings = DEFAULT_SOLVER_SETTINGS;

      if (this.solutionViewer) {
        const options = this.solutionViewer.getOptions().look;

        if (Object.keys(options).includes('segmentColumnName')) {
          this.solutionViewer.setOptions({
            segmentColumnName: '',
          });
        }
      }

      this.solutionTable = call.outputs[DF_NAME];

      if (hasNaN(this.solutionTable)) {
        grok.shell.warning(ERROR_MSG.NANS_OBTAINED);
        this.solutionTable = getReducedTable(this.solutionTable);
      }

      this.solverView.dataFrame = this.solutionTable;
      this.solverView.name = this.solutionTable.name;

      if (ivp.updates) {
        this.solverView.grid.columns.setVisible([this.solutionTable.columns.names()[0]]);
        this.solverView.grid.columns.setVisible(this.solutionTable.columns.names()
          .filter((name) => name !== STAGE_COL_NAME));
      }

      // Update the main graph
      if (!this.solutionViewer) {
        this.solutionViewer = DG.Viewer.lineChart(this.solutionTable,
          getLineChartOptions(this.solutionTable.columns.names()));

        this.viewerDockNode = grok.shell.dockManager.dock(
          this.solutionViewer,
          DG.DOCK_TYPE.TOP,
          this.solverView.dockManager.findNode(this.solverView.grid.root),
          TITLE.MULTI_AXIS,
        );

        removeTitle(this.viewerDockNode);
      } else {
        this.solutionViewer.dataFrame = this.solutionTable;

        if (ivp.updates) {
          this.solutionViewer.setOptions({
            segmentColumnName: STAGE_COL_NAME,
          });
        }

        if (this.toChangeSolutionViewerProps) {
          this.solutionViewer.setOptions(getLineChartOptions(this.solutionTable.columns.names()));
          this.toChangeSolutionViewerProps = false;
        }
      }

      // Update the facet grid plot
      if (this.solutionTable.columns.length > MAX_LINE_CHART) {
        if (!this.facetGridDiv && this.solutionViewer) {
          this.facetGridDiv = this.getFacetPlot();

          setTimeout( () => {
            this.facetGridNode = grok.shell.dockManager.dock(
              this.facetGridDiv,
              DG.DOCK_TYPE.FILL,
              this.viewerDockNode,
              TITLE.FACET,
            );

            removeTitle(this.facetGridNode);
          }, UI_TIME.FACET_DOCKING);
        } else
          this.facetPlots.forEach((plot) => plot.dataFrame = this.solutionTable);
      } else
        this.removeFacetGrid();

      this.isSolvingSuccess = true;
      this.solvePane.header.hidden = false;
      this.toSwitchToModelTab = false;
    } catch (error) {
      if (error instanceof CallbackAction) {
        this.isSolvingSuccess = true;
        this.solvePane.header.hidden = false;

        if (this.toShowPerformanceDlg && !customSettings) {
          ivp.solverSettings = DEFAULT_SOLVER_SETTINGS;
          this.showPerformanceDlg(ivp, inputsPath);
        } else
          grok.shell.warning(error.message);
      } else {
        this.clearSolution();
        this.isSolvingSuccess = false;

        if (error instanceof Error) {
          if (error.message.includes(MISC.IS_NOT_DEF))
            throw getIsNotDefined(error.message);
          else if (error.message.includes(MISC.UNEXPECTED))
            throw getUnexpected(error.message);
          else if (error.message.includes(MISC.PROP_OF_NULL))
            throw getNullOutput();
          else
            grok.shell.error(error.message);
        } else
          grok.shell.error(ERROR_MSG.SCRIPTING_ISSUE);
      }
    }
  }; // solve

  /** Return inputs form */
  private getInputsForm() {
    const form = ui.form([]);
    const miscInputs = this.inputsByCategories.get(TITLE.MISC);

    if (this.inputsByCategories.size === 1)
      miscInputs.forEach((input) => form.append(input.root));
    else {
      if (this.topCategory !== null) {
        form.append(ui.h2(this.topCategory));

        this.inputsByCategories.get(this.topCategory).forEach((inp) => {form.append(inp.root);});
      }

      this.inputsByCategories.forEach((inputs, category) => {
        if ((category !== TITLE.MISC) && (category !== this.topCategory)) {
          form.append(getCategoryWidget(category, inputs));
          inputs.forEach((inp) => {form.append(inp.root);});
        }
      });

      if ((miscInputs.length > 0) && (this.topCategory !== TITLE.MISC)) {
        form.append(getCategoryWidget(TITLE.MISC, miscInputs));
        miscInputs.forEach((inp) => {form.append(inp.root);});
      }
    }

    form.style.overflowY = 'hidden';

    return form;
  } // getInputsForm

  /** Run solving the current IVP */
  private async runSolving(): Promise<void> {
    this.isModelChanged = false;

    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      this.removeFacetGrid();
      await this.generateInputs(ivp);

      if (this.isSolvingSuccess) {
        this.toChangeInputs = false;
        this.tabControl.currentPane = this.solvePane;

        if (this.prevInputsNode !== null)
          this.inputsPanel.removeChild(this.prevInputsNode);

        const form = this.getInputsForm();
        this.prevInputsNode = this.inputsPanel.appendChild(form);

        if (this.isEditState)
          setTimeout(() => this.tabControl.currentPane = this.editPane, 5);
      }
    } catch (error) {
      if (error instanceof CallbackAction)
        grok.shell.warning(error.message);
      else
        this.processError(error);
    }
  }; // runSolving

  /** Clear solution table & viewer */
  private clearSolution() {
    this.solutionTable = DG.DataFrame.create();
    this.solverView.dataFrame = this.solutionTable;
    //this.setCallWidgetsVisibility(false);

    if (this.toSwitchToModelTab) {
      //this.tabControl.currentPane = this.editPane;

      if (this.prevInputsNode !== null)
        this.inputsPanel.removeChild(this.prevInputsNode);
      this.prevInputsNode = null;
    }

    if (this.solutionViewer && this.viewerDockNode) {
      this.removeFacetGrid();
      grok.shell.dockManager.close(this.viewerDockNode);
      this.solutionViewer = null;
      this.solverView.path = PATH.EMPTY;
    }
  } // clearSolution

  /** Generate model inputs */
  private async generateInputs(ivp: IVP): Promise<void> {
    /** Return options with respect to the model input specification */
    const getOptions = (name: string, modelInput: Input, modelBlock: string) => {
      const options: DG.PropertyOptions = {
        name: name,
        defaultValue: modelInput.value,
        type: DG.TYPE.FLOAT,
        inputType: INPUT_TYPE.FLOAT,
      };

      if (modelInput.annot !== null) {
        let annot = modelInput.annot;
        let descr: string | undefined = undefined;

        let posOpen = annot.indexOf(BRACKET_OPEN);
        let posClose = annot.indexOf(BRACKET_CLOSE);

        if (posOpen !== -1) {
          if (posClose === -1) {
            throw new ModelError(
              `${ERROR_MSG.MISSING_CLOSING_BRACKET}. Correct annotation in the **${modelBlock}** block.`,
              LINK.INTERFACE,
              annot,
            );
          }

          descr = annot.slice(posOpen + 1, posClose);

          annot = annot.slice(0, posOpen);
        }

        posOpen = annot.indexOf(BRACE_OPEN);
        posClose = annot.indexOf(BRACE_CLOSE);

        if (posOpen >= posClose) {
          throw new ModelError(
            `${ERROR_MSG.INCORRECT_BRACES_USE}. Correct annotation in the ***${modelBlock}** block.`,
            LINK.INTERFACE,
            annot,
          );
        }

        let pos: number;
        let key: string;
        let val;

        annot.slice(posOpen + 1, posClose).split(ANNOT_SEPAR).forEach((str) => {
          pos = str.indexOf(CONTROL_SEP);

          if (pos === -1) {
            throw new ModelError(
              `${ERROR_MSG.MISSING_COLON}. Correct annotation in the **${modelBlock}** block.`,
              LINK.INTERFACE,
              annot,
            );
          }

          key = str.slice(0, pos).trim();
          val = str.slice(pos + 1).trim();

          // @ts-ignore
          options[key !== 'caption' ? key : 'friendlyName'] = strToVal(val);
        });

        options.description = descr ?? '';
        options.name = options.friendlyName ?? options.name;
        options.friendlyName = options.name;
      }

      if (this.startingInputs) {
        options.defaultValue = this.startingInputs
          .get(options.name!.replace(' ', '').toLowerCase()) ?? options.defaultValue;
        modelInput.value = options.defaultValue;
      }

      return options;
    }; // getOptions

    const inputsByCategories = new Map<string, DG.InputBase[]>();
    const toSaveInputs = ivp.inputsLookup !== null;
    this.topCategory = null;
    this.inputByName = toSaveInputs ? new Map<string, DG.InputBase>() : null;
    inputsByCategories.set(TITLE.MISC, []);
    let options: DG.PropertyOptions;

    /** Pull input to appropriate category & add tooltip */
    const categorizeInput = (options: DG.PropertyOptions, input: DG.InputBase) => {
      const category = options.category;

      if (category === undefined)
        inputsByCategories.get(TITLE.MISC)?.push(input);
      else if (inputsByCategories.has(category))
        inputsByCategories.get(category)!.push(input);
      else
        inputsByCategories.set(category, [input]);

      input.setTooltip(options.description!);
    };

    /** Save input */
    const saveInput = (name: string, input: DG.InputBase) => {
      if (toSaveInputs)
        this.inputByName.set(name, input);
    };

    /** Return line with inputs names & values */
    const getInputsPath = () => {
      let line = '';

      inputsByCategories.forEach((inputs, cat) => {
        if (cat !== TITLE.MISC)
          inputs.forEach((input) => {line += `${PATH.AND}${input.caption.replace(' ', '')}${PATH.EQ}${input.value}`;});
      });

      inputsByCategories.get(TITLE.MISC)!.forEach((input) => {
        line += `${PATH.AND}${input.caption.replace(' ', '')}${PATH.EQ}${input.value}`;
      });

      return line.slice(1); // we ignore 1-st '&'
    };

    // Inputs for argument
    for (const key of ARG_INPUT_KEYS) {
      //@ts-ignore
      options = getOptions(key, ivp.arg[key], CONTROL_EXPR.ARG);
      const input = ui.input.forProperty(DG.Property.fromOptions(options));

      //@ts-ignore
      input.onChanged.subscribe(async (value) => {
        if (value !== null) {
          //@ts-ignore
          ivp.arg[key].value = value;
          await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
      saveInput(key, input);
    }

    // Inputs for initial values
    ivp.inits.forEach((val, key) => {
      options = getOptions(key, val, CONTROL_EXPR.INITS);
      const input = ui.input.forProperty(DG.Property.fromOptions(options));

      //@ts-ignore
      input.onChanged.subscribe(async (value) => {
        if (value !== null) {
        ivp.inits.get(key)!.value = value;
        await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
      saveInput(key, input);
    });

    // Inputs for parameters
    if (ivp.params !== null) {
      ivp.params.forEach((val, key) => {
        options = getOptions(key, val, CONTROL_EXPR.PARAMS);
        const input = ui.input.forProperty(DG.Property.fromOptions(options));

        //@ts-ignore
        input.onChanged.subscribe(async (value) => {
          if (value !== null) {
            ivp.params!.get(key)!.value = value;
            await this.solve(ivp, getInputsPath());
          }
        });

        categorizeInput(options, input);
        saveInput(key, input);
      });
    }

    // Inputs for loop
    if (ivp.loop !== null) {
      options = getOptions(SCRIPTING.COUNT, ivp.loop.count, CONTROL_EXPR.LOOP);
      options.inputType = INPUT_TYPE.INT; // since it's an integer
      options.type = DG.TYPE.INT; // since it's an integer
      const input = ui.input.forProperty(DG.Property.fromOptions(options));

      //@ts-ignore
      input.onChanged.subscribe(async (value) => {
        if (value !== null) {
          ivp.loop!.count.value = value;
          await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
      saveInput(SCRIPTING.COUNT, input);
    }

    if (this.toRunWhenFormCreated)
      await this.solve(ivp, getInputsPath());

    this.inputsByCategories = inputsByCategories;

    if (toSaveInputs)
      await this.setLookupChoiceInput(ivp.inputsLookup);
  } // getInputsUI

  /** Set behavior of the values lookup input */
  private async setLookupChoiceInput(inputsLookup: string) {
    const lookupInfo = getLookupsInfo(inputsLookup);

    if (lookupInfo === null)
      return;

    const inputsDf = await getInputsTable(lookupInfo.choices);
    //const inputsDf = await getInputsTable('OpenFile("System:AppData/DiffStudio/examples/bioreactor-inputs.csv")');

    if (inputsDf === null)
      return;

    const cols = inputsDf.columns;
    const rowCount = inputsDf.rowCount;

    const inpSetsNames = cols.byIndex(INPUTS_DF.INPUT_SETS_COL_IDX).toList();
    const choices = [MISC.DEFAULT as string].concat(inpSetsNames);

    const defaultInputs = new Map<string, number>();
    let firstInput: DG.InputBase | null = null;

    this.inputByName.forEach((input, name) => {
      if (firstInput === null)
        firstInput = input;

      defaultInputs.set(name, input.value);
    });

    const tableInputs = new Map<string, Map<string, number>>(); // set <-> {(input <-> value)}
    const colsRaw = new Map<string, Int32Array | Uint32Array | Float32Array | Float64Array>();

    for (const col of cols) {
      if (col.isNumerical)
        colsRaw.set(col.name, col.getRawData());
    }

    for (let row = 0; row < rowCount; ++row) {
      const inputs = new Map<string, number>();
      colsRaw.forEach((arr, name) => inputs.set(name, arr[row]));
      tableInputs.set(inpSetsNames[row], inputs);
    }

    // create input for lookup table use
    const lookupChoiceInput = ui.input.choice<string>(lookupInfo.caption, {
      items: choices,
      nullable: false,
      value: choices[0],
      tooltipText: lookupInfo.tooltip,
      onValueChanged: (value) => {
        this.toPreventSolving = true;

        if (value === MISC.DEFAULT)
          this.inputByName.forEach((input, name) => input.value = defaultInputs.get(name));
        else {
          const colInputs = tableInputs.get(value);
          this.inputByName.forEach((input, name) => input.value = colInputs.get(name) ?? input.value);
        }

        this.toPreventSolving = false;
        firstInput.value = firstInput.value;
      },
    });

    this.topCategory = lookupInfo.category;
    const catorizedInputs = this.inputsByCategories.get(lookupInfo.category);

    if (catorizedInputs !== undefined)
      this.inputsByCategories.set(lookupInfo.category, [lookupChoiceInput as DG.InputBase].concat(catorizedInputs));
    else
      this.inputsByCategories.set(lookupInfo.category, [lookupChoiceInput]);
  } // setLookupChoiceInput

  /** Run sensitivity analysis */
  private async runSensitivityAnalysis(): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.tryToSolve(ivp);
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      const script = DG.Script.create(scriptText);
      await SensitivityAnalysisView.fromEmpty(script, {
        inputsLookup: ivp.inputsLookup !== null ? ivp.inputsLookup : undefined,
      });
    } catch (err) {
      this.processError(err);
    }
  }

  /** Run fitting */
  private async runFitting(): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.tryToSolve(ivp);
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      const script = DG.Script.create(scriptText);
      await FittingView.fromEmpty(script, {
        inputsLookup: ivp.inputsLookup !== null ? ivp.inputsLookup : undefined,
        ivp: ivp,
      });
    } catch (err) {
      this.processError(err);
    }
  }

  /** Try to solve IVP */
  private async tryToSolve(ivp: IVP): Promise<void> {
    const optionsBuf = ivp.solverSettings;
    ivp.solverSettings = DEFAULT_OPTIONS.SCRIPTING;

    try {
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      ivp.solverSettings = optionsBuf;
      const script = DG.Script.create(scriptText);

      // try to call computations - correctness check
      const params = getScriptParams(ivp);
      const call = script.prepare(params);
      await call.call();
    } catch (error) {
      if (!(error instanceof CallbackAction)) {
        this.clearSolution();
        this.isSolvingSuccess = false;

        if (error instanceof Error) {
          if (error.message.includes(MISC.IS_NOT_DEF))
            throw getIsNotDefined(error.message);
          else if (error.message.includes(MISC.UNEXPECTED))
            throw getUnexpected(error.message);
          else
            grok.shell.error(error.message);
        } else
          grok.shell.error(ERROR_MSG.SCRIPTING_ISSUE);
      }
    }
  }

  /** Close previously opened performance dialog */
  private closePerformanceDlg(): void {
    this.performanceDlg?.close();
    this.performanceDlg = null;
  }

  /** Show performance dialog */
  private showPerformanceDlg(ivp: IVP, inputsPath: string): DG.Dialog {
    this.closePerformanceDlg();
    this.performanceDlg = ui.dialog({title: WARNING.TITLE, helpUrl: LINK.DIF_STUDIO_REL});
    this.solverView.append(this.performanceDlg);

    const opts = {
      name: WARNING.TIME_LIM,
      defaultValue: this.secondsLimit,
      inputType: INPUT_TYPE.INT,
      min: UI_TIME.SOLV_TIME_MIN_SEC,
      description: HINT.MAX_TIME,
      showPlusMinus: true,
      units: WARNING.UNITS,
    };
    const maxTimeInput = ui.input.forProperty(DG.Property.fromOptions(opts));

    //@ts-ignore
    maxTimeInput.onInput.subscribe(() => {
      if (maxTimeInput.value >= UI_TIME.SOLV_TIME_MIN_SEC)
        this.secondsLimit = maxTimeInput.value;
      else maxTimeInput.value = this.secondsLimit;
    });

    this.performanceDlg.add(ui.label(`Max time exceeded (${this.secondsLimit} sec.). ${WARNING.CONTINUE}`))
      .onCancel(() => this.performanceDlg!.close())
      .onOK(async () => {
        ivp.solverSettings = DEFAULT_SOLVER_SETTINGS;
        this.performanceDlg!.close();
        setTimeout(async () => await this.solve(ivp, inputsPath), 20);
        ;
      })
      .show();

    this.performanceDlg.add(ui.form([maxTimeInput]));
    ui.tooltip.bind(this.performanceDlg.getButton('OK'), HINT.CONTINUE);
    ui.tooltip.bind(this.performanceDlg.getButton('CANCEL'), HINT.ABORT);

    return this.performanceDlg;
  } // showPerformanceDlg

  /** Browse tree */
  private async createTree(browsing?: Browsing) {
    if (browsing) {
      this.browseView = browsing.browseView;
      this.appTree = browsing.treeNode;
    } else {
      if (grok.shell.view(TITLE.BROWSE) === undefined)
        grok.shell.v = DG.View.createByType('browse');

      this.browseView = grok.shell.view(TITLE.BROWSE) as DG.BrowseView;

      const appsGroup = this.browseView.mainTree.getOrCreateGroup(TITLE.APPS, null, false);

      const computeGroup = appsGroup.getOrCreateGroup(TITLE.COMP, null, false);
      this.appTree = computeGroup.getOrCreateGroup(TITLE.DIF_ST);
    }

    if (this.appTree.items.length > 0)
      this.recentFolder = this.appTree.getOrCreateGroup(TITLE.RECENT, null, false);
    else {
      const templatesFolder = this.getFolderWithBultInModels(TEMPLATE_TITLES, TITLE.TEMPL);
      const examplesFolder = this.getFolderWithBultInModels(EXAMPLE_TITLES, TITLE.LIBRARY);

      const putModelsToFolder = (models: TITLE[], folder: DG.TreeViewGroup) => {
        models.forEach((name) => this.putBuiltInModelToFolder(name, folder));
      };

      putModelsToFolder(TEMPLATE_TITLES, templatesFolder);
      putModelsToFolder(EXAMPLE_TITLES, examplesFolder);

      this.recentFolder = this.getFolderWithRecentModels();

      // Add recent models to the Recent folder
      try {
        const folder = `${grok.shell.user.project.name}:Home/`;
        const files = await grok.dapi.files.list(folder);
        const names = files.map((file) => file.name);

        if (names.includes(PATH.RECENT)) {
          const dfs = await grok.dapi.files.readBinaryDataFrames(`${folder}${PATH.RECENT}`);
          const recentDf = dfs[0];
          const size = recentDf.rowCount;
          const infoCol = recentDf.col(TITLE.INFO);
          const isCustomCol = recentDf.col(TITLE.IS_CUST);

          if ((infoCol === null) || (isCustomCol === null))
            throw new Error('corrupted data file');

          for (let i = 0; i < size; ++i) {
            if (isCustomCol.get(i))
              await this.putCustomModelToRecents(infoCol.get(i));
            else
              this.putBuiltInModelToFolder(infoCol.get(i), this.recentFolder);
          }
        }
      } catch (err) {
        grok.shell.warning(`Failed to open recents: ${(err instanceof Error) ? err.message : 'platfrom issue'}`);
      };
    }
  } // createTree

  /** Add template/example model to browse tree folder */
  private putBuiltInModelToFolder(name: TITLE, folder: DG.TreeViewGroup): void {
    const item = folder.item(name);
    ui.tooltip.bind(item.root, MODEL_HINT.get(name) ?? '');

    item.onSelected.subscribe(async () => {
      const panelRoot = this.appTree.rootNode.root.parentElement!;
      const treeNodeY = panelRoot.scrollTop!;

      const solver = new DiffStudio(false);
      this.browseView.preview = await solver.runSolverApp(
        undefined,
        STATE_BY_TITLE.get(name) ?? EDITOR_STATE.BASIC_TEMPLATE,
      ) as DG.View;

      setTimeout(() => {
        panelRoot.scrollTo(0, treeNodeY);
        item.root.focus();
      }, UI_TIME.BROWSING);
    });
  }

  /** Add model from ivp-file to browse tree folder */
  private async putCustomModelToRecents(path: string) {
    try {
      const exist = await grok.dapi.files.exists(path);
      const idx = path.lastIndexOf('/');
      const name = path.slice(idx + 1, path.length);
      const item = this.recentFolder.item(name);
      ui.tooltip.bind(item.root, path);

      const folderPath = path.slice(0, idx + 1);
      let file: DG.FileInfo;

      if (exist) {
        const fileList = await grok.dapi.files.list(folderPath);
        file = fileList.find((file) => file.nqName === path);
      }

      item.onSelected.subscribe(async () => {
        const panelRoot = this.appTree.rootNode.root.parentElement!;
        const treeNodeY = panelRoot.scrollTop!;

        if (exist) {
          const equations = await file.readAsString();

          const solver = new DiffStudio(false);
          this.browseView.preview = await solver.runSolverApp(
            equations,
            undefined,
            `files/${file.fullPath.replace(':', '.').toLowerCase()}`,
          ) as DG.View;

          await this.saveModelToRecent(path, true);
        } else
          grok.shell.warning(`File not found: ${path}`);

        setTimeout(async () => {
          panelRoot.scrollTo(0, treeNodeY);
          item.root.focus();
        }, UI_TIME.BROWSING);
      });

      item.root.addEventListener('dblclick', async (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();

        if (exist) {
          const equations = await file.readAsString();
          const solver = new DiffStudio();
          await solver.runSolverApp(equations);
        } else
          grok.shell.warning(`File not found: ${path}`);
      });
    } catch (e) {
      grok.shell.warning(`Failed to add ivp-file to recents: ${(e instanceof Error) ? e.message : 'platfrom issue'}`);
    }
  } // putCustomModelToRecents

  /** Save model to recent models file */
  private async saveModelToRecent(modelSpecification: string, isCustom: boolean) {
    const folder = `${grok.shell.user.project.name}:Home/`;
    const files = await grok.dapi.files.list(folder);
    const names = files.map((file) => file.name);
    const info = isCustom ? modelSpecification : TITLE_BY_STATE.get(modelSpecification);

    try {
      if (names.includes(PATH.RECENT)) { // a file with reccent models exists
        const dfs = await grok.dapi.files.readBinaryDataFrames(`${folder}${PATH.RECENT}`);
        const recentDf = dfs[0];

        const recentInfo = recentDf.col(TITLE.INFO).toList() as string[];
        const recentIsCust = recentDf.col(TITLE.IS_CUST).toList() as boolean[];

        const newIsCust: boolean[] = [];
        const newInfo: string[] = [];
        const items = this.recentFolder.items;
        let removed = false;

        recentInfo.forEach((val, idx) => {
          if (val !== info) {
            newIsCust.push(recentIsCust[idx]);
            newInfo.push(val);
          } else {
            items[idx]?.remove();
            removed = true;
          }
        });

        if (!removed && items.length >= MAX_RECENT_COUNT)
          items[0]?.remove();

        newInfo.push(info);
        newIsCust.push(isCustom);

        await grok.dapi.files.writeBinaryDataFrames(`${folder}${PATH.RECENT}`, [
          getTableFromLastRows(DG.DataFrame.fromColumns([
            DG.Column.fromStrings(TITLE.INFO, newInfo),
            DG.Column.fromList(DG.COLUMN_TYPE.BOOL, TITLE.IS_CUST, newIsCust),
          ]), MAX_RECENT_COUNT),
        ]);

        if (isCustom)
          this.putCustomModelToRecents(info);
        else
          this.putBuiltInModelToFolder(info, this.recentFolder);
      } else { // a file with reccent models doesn't exist
        await grok.dapi.files.writeBinaryDataFrames(`${folder}${PATH.RECENT}`, [
          DG.DataFrame.fromColumns([
            DG.Column.fromStrings(TITLE.INFO, [info]),
            DG.Column.fromList(DG.COLUMN_TYPE.BOOL, TITLE.IS_CUST, [isCustom]),
          ]),
        ]);
      }
    } catch (err) {
      grok.shell.warning(`Failed to save recent models: ${(err instanceof Error) ? err.message : 'platfrom issue'}`);
    }
  } // saveModelToRecent

  /** Return view with model cards */
  private getBuiltInModelsCardsView(models: TITLE[]): DG.View {
    const view = DG.View.create();
    const root = ui.div([]);

    for (const name of models)
      root.append(this.getCardWithBuiltInModel(name));

    root.classList.add('grok-gallery-grid');
    view.root.append(root);

    return view;
  } // getBuiltInModelsCardsView

  /** Return folder with built-in models (examples/templates) */
  private getFolderWithBultInModels(models: TITLE[], title: string): DG.TreeViewGroup {
    const folder = this.appTree.getOrCreateGroup(title, null, false);
    folder.onSelected.subscribe(() => {
      this.browseView.preview = this.getBuiltInModelsCardsView(models);
      this.browseView.path = `browse/apps/DiffStudio/${title}`;
    });

    return folder;
  }

  /** Return folder with recent models */
  private getFolderWithRecentModels(): DG.TreeViewGroup {
    const folder = this.appTree.getOrCreateGroup(TITLE.RECENT, null, false);

    folder.onSelected.subscribe(async () => {
      const view = DG.View.create();
      this.browseView.path = `browse/apps/DiffStudio/${TITLE.RECENT}`;

      try {
        const folder = `${grok.shell.user.project.name}:Home/`;
        const files = await grok.dapi.files.list(folder);
        const names = files.map((file) => file.name);

        if (names.includes(PATH.RECENT)) {
          const root = ui.div([]);

          const dfs = await grok.dapi.files.readBinaryDataFrames(`${folder}${PATH.RECENT}`);
          const recentDf = dfs[0];
          const size = recentDf.rowCount;
          const infoCol = recentDf.col(TITLE.INFO);
          const isCustomCol = recentDf.col(TITLE.IS_CUST);

          if ((infoCol === null) || (isCustomCol === null))
            throw new Error('corrupted data file');

          for (let i = 0; i < size; ++i) {
            if (isCustomCol.get(i))
              root.append(await this.getCardWithCustomModel(infoCol.get(i)));
            else
              root.append(this.getCardWithBuiltInModel(infoCol.get(i)));
          }

          root.classList.add('grok-gallery-grid');
          view.root.append(root);
        } else
          view.append(ui.h2('No recent models'));

        this.browseView.preview = view;
      } catch (err) {
        grok.shell.warning(`Failed to open recents: ${(err instanceof Error) ? err.message : 'platfrom issue'}`);
      };
    });

    return folder;
  } // getFolderWithRecentModels

  /** Return card with model */
  private getCard(title: string, text: string, imgPath: string): HTMLDivElement {
    const defaultLink = `${_package.webRoot}${CUSTOM_MODEL_IMAGE_LINK}`;

    const img = ui.div([ui.wait(async () => {
      const imgRoot = ui.div('', 'img');
      imgRoot.className = 'diff-studio-ui-image';
      await fetch(`${_package.webRoot}${imgPath}`)
        .then((response) => {
          if (response.ok)
            return Promise.resolve(response.url);
          else if (response.status === 404)
            return Promise.reject(defaultLink);
        })
        .then((data) => imgRoot.style.backgroundImage = `url(${data})`)
        .catch((data) => imgRoot.style.backgroundImage = `url(${data})`);
      return imgRoot;
    }),
    ]);

    const card = ui.card(ui.divV([
      img,
      ui.div([title], 'diff-studio-card-title'),
      ui.div([text], 'diff-studio-card-description'),
    ], 'diff-studio-app-card'));

    return card;
  } // getCard

  /** Return card with built-in model*/
  private getCardWithBuiltInModel(name: TITLE): HTMLDivElement {
    const card = this.getCard(name, MODEL_HINT.get(name) ?? '', modelImageLink.get(name));

    card.onclick = async () => {
      const solver = new DiffStudio(false);
      this.browseView.preview = await solver.runSolverApp(
        undefined,
        STATE_BY_TITLE.get(name) ?? EDITOR_STATE.BASIC_TEMPLATE,
      ) as DG.View;
    };

    ui.tooltip.bind(card, HINT.CLICK_RUN);

    return card;
  } // getCardWithBuiltInModel

  /** Return card with custom model*/
  private async getCardWithCustomModel(path: string): Promise<HTMLDivElement> {
    try {
      const exist = await grok.dapi.files.exists(path);
      const idx = path.lastIndexOf('/');
      const name = path.slice(idx + 1, path.length);

      const card = this.getCard(name, 'Custom model', CUSTOM_MODEL_IMAGE_LINK);
      ui.tooltip.bind(card, () => ui.divV([
        ui.divText(path),
        ui.divText(HINT.CLICK_RUN),
      ]));

      const folderPath = path.slice(0, idx + 1);
      let file: DG.FileInfo;

      if (exist) {
        const fileList = await grok.dapi.files.list(folderPath);
        file = fileList.find((file) => file.nqName === path);
      }

      card.onclick = async () => {
        if (exist) {
          const equations = await file.readAsString();

          const solver = new DiffStudio(false);
          this.browseView.preview = await solver.runSolverApp(
            equations,
            undefined,
            `files/${file.fullPath.replace(':', '.').toLowerCase()}`,
          ) as DG.View;

          await this.saveModelToRecent(path, true);
        } else
          grok.shell.warning(`File not found: ${path}`);
      };

      return card;
    } catch (e) {
      grok.shell.warning(`Failed to add ivp-file to recents: ${(e instanceof Error) ? e.message : 'platfrom issue'}`);
    }
  } // getCardWithBuiltInModel

  /** Return last called model */
  private async getLastCalledModel(): Promise<LastModel> {
    const lastModel: LastModel = {info: TITLE.BASIC, isCustom: false};

    try {
      const folder = `${grok.shell.user.project.name}:Home/`;
      const files = await grok.dapi.files.list(folder);
      const names = files.map((file) => file.name);

      if (names.includes(PATH.RECENT)) {
        const dfs = await grok.dapi.files.readBinaryDataFrames(`${folder}${PATH.RECENT}`);
        const recentDf = dfs[0];
        const size = recentDf.rowCount;
        const infoCol = recentDf.col(TITLE.INFO);
        const isCustomCol = recentDf.col(TITLE.IS_CUST);

        if ((infoCol !== null) && (isCustomCol !== null)) {
          lastModel.info = infoCol.get(size - 1);
          lastModel.isCustom = isCustomCol.get(size - 1);
        }
      }
    } catch (err) {};

    return lastModel;
  }

  /** Return the Open model combo menu */
  private getOpenComboMenu(): HTMLElement {
    const menu = ui.div(ui.iconFA('folder-open', () => {}, HINT.OPEN));
    menu.classList.add('d4-combo-popup');
    menu.classList.add('diff-studio-ribbon-widget');
    ui.tooltip.bind(menu, HINT.OPEN);
    menu.onclick = async () => (await this.getOpenModelMenu()).show();

    return menu;
  }

  /** Return open menu */
  private async getOpenModelMenu(): Promise<DG.Menu> {
    const menu = DG.Menu.popup();
    menu.item(TITLE.IMPORT, async () => await this.overwrite(), undefined, {description: HINT.LOAD}).separator();

    await this.appendMenuWithMyModels(menu);
    await this.appendMenuWithRecentModels(menu);
    menu.separator();

    menu.group(TITLE.TEMPL)
      .item(TITLE.BASIC, async () =>
        await this.overwrite(EDITOR_STATE.BASIC_TEMPLATE), undefined, {description: HINT.BASIC},
      )
      .item(TITLE.ADV, async () =>
        await this.overwrite(EDITOR_STATE.ADVANCED_TEMPLATE), undefined, {description: HINT.ADV},
      )
      .item(TITLE.EXT, async () =>
        await this.overwrite(EDITOR_STATE.EXTENDED_TEMPLATE), undefined, {description: HINT.EXT})
      .endGroup()
      .group(TITLE.LIBRARY)
      .item(TITLE.CHEM, async () => await this.overwrite(EDITOR_STATE.CHEM_REACT), undefined, {description: HINT.CHEM})
      .item(TITLE.ROB, async () => await this.overwrite(EDITOR_STATE.ROBERT), undefined, {description: HINT.ROB})
      .item(TITLE.FERM, async () => await this.overwrite(EDITOR_STATE.FERM), undefined, {description: HINT.FERM})
      .item(TITLE.PK, async () => await this.overwrite(EDITOR_STATE.PK), undefined, {description: HINT.PK})
      .item(TITLE.PKPD, async () => await this.overwrite(EDITOR_STATE.PKPD), undefined, {description: HINT.PKPD})
      .item(TITLE.ACID, async () => await this.overwrite(EDITOR_STATE.ACID_PROD), undefined, {description: HINT.ACID})
      .item(TITLE.NIM, async () => await this.overwrite(EDITOR_STATE.NIMOTUZUMAB), undefined, {description: HINT.NIM})
      .item(TITLE.BIO, async () => await this.overwrite(EDITOR_STATE.BIOREACTOR), undefined, {description: HINT.BIO})
      .item(TITLE.POLL, async () => await this.overwrite(EDITOR_STATE.POLLUTION), undefined, {description: HINT.POLL})
      .endGroup();

    return menu;
  } // getOpenMenu

  /** Append menu with my and recent models */
  private async appendMenuWithRecentModels(menu: DG.Menu) {
    const submenu = menu.group(TITLE.RECENT);

    try {
      const recentDf = await getRecentModelsTable();
      const size = recentDf.rowCount;
      const infoCol = recentDf.col(TITLE.INFO);
      const isCustomCol = recentDf.col(TITLE.IS_CUST);

      if ((infoCol === null) || (isCustomCol === null))
        throw new Error('corrupted data file');

      for (let i = 0; i < size; ++i) {
        const name = infoCol.get(i);

        if (isCustomCol.get(i))
          await this.appendMenuWithCustomModel(submenu, name);
        else
          this.appendMenuWithBuiltInModel(submenu, name);
      }

      if (size < 1)
        submenu.item(TITLE.NO_MODELS, noModels, null, {description: HINT.NO_MODELS});
    } catch (err) {
      submenu.item(TITLE.NO_MODELS, noModels, null, {description: HINT.NO_MODELS});
    };

    submenu.endGroup();
  } // appendMenuWithRecentModels

  /** Append menu with built-in model model */
  private appendMenuWithBuiltInModel(menu: DG.Menu, name: TITLE) {
    menu.item(name, async () => {
      const solver = new DiffStudio();
      await solver.runSolverApp(
        undefined,
        STATE_BY_TITLE.get(name) ?? EDITOR_STATE.BASIC_TEMPLATE,
      ) as DG.View;
    }, null, {description: MODEL_HINT.get(name) ?? ''});
  }

  /** Append menu with custom model */
  private async appendMenuWithCustomModel(menu: DG.Menu, path: TITLE) {
    try {
      if (await grok.dapi.files.exists(path)) {
        const idx = path.lastIndexOf('/');
        const name = path.slice(idx + 1, path.length);
        const folderPath = path.slice(0, idx + 1);
        const fileList = await grok.dapi.files.list(folderPath);
        const file = fileList.find((file) => file.nqName === path);

        menu.item(name, async () => {
          try {
            const equations = await file.readAsString();
            await this.setState(EDITOR_STATE.FROM_FILE, true, equations);
            await this.saveModelToRecent(path, true);
          } catch (err) {
            grok.shell.warning(`File not found: ${path}`);
          }
        }, null, {description: path});
      }
    } catch (e) {
      grok.shell.warning(`Failed to add ivp-file to recents: ${(e instanceof Error) ? e.message : 'platfrom issue'}`);
    }
  } // appendMenuWithCustomModel

  /** Append menu with models from user's files */
  private async appendMenuWithMyModels(menu: DG.Menu) {
    const submenu = menu.group(TITLE.MY_MODELS);

    try {
      const myModelFiles = await getMyModelFiles();
      if (myModelFiles.length < 1)
        submenu.item(TITLE.NO_MODELS, noModels, null, {description: HINT.NO_MODELS});
      else
        myModelFiles.forEach(async (file) => await this.appendMenuWithCustomModel(submenu, file.fullPath as TITLE));
    } catch (err) {
      submenu.item(TITLE.NO_MODELS, noModels, null, {description: HINT.NO_MODELS});
    };

    submenu.endGroup();
  }

  /** Run last called model */
  private async runLastCalledModel() {
    const lastModel = await this.getLastCalledModel();

    if (lastModel.isCustom) {
      const equations = await getEquationsFromFile(lastModel.info);

      if (equations !== null) {
        const newState = EditorState.create({
          doc: equations,
          extensions: [basicSetup, python(), autocompletion({override: [contrCompletions]})],
        });

        this.editorView!.setState(newState);
        this.solverMainPath = PATH.CUSTOM;
        await this.runSolving();
      } else
        await this.setState(EDITOR_STATE.BASIC_TEMPLATE);
    } else
      await this.setState(STATE_BY_TITLE.get(lastModel.info as TITLE) ?? EDITOR_STATE.BASIC_TEMPLATE);
  }

  /** Show model error */
  private showModelError(err: ModelError) {
    if (!this.isEditState) {
      setTimeout(() => {
        this.appStateInputWgt.click();
        showModelErrorHint(err, this.tabControl);
      }, UI_TIME.WGT_CLICK);
    } else
      showModelErrorHint(err, this.tabControl);
  }

  /** Process error */
  private processError(error: any) {
    this.clearSolution();
    if (error instanceof ModelError)
      this.showModelError(error);
    else
      grok.shell.error(error instanceof Error ? error.message : ERROR_MSG.SCRIPTING_ISSUE);

    this.isModelChanged = false;
    this.updateRefreshWidget(false);
    this.updateExportToJsWidget(false);
  }

  /** Remove FacetGrid visualization */
  private removeFacetGrid() {
    if (this.facetGridNode && this.facetGridDiv) {
      grok.shell.dockManager.close(this.facetGridNode);
      this.facetGridDiv = null;
    }
  }

  /** Return div with facet grid plot */
  private getFacetPlot(): HTMLDivElement {
    const cols = this.solutionTable.columns;
    const colNames = cols.names();

    const toShowSegments = colNames.includes(STAGE_COL_NAME);

    const colsCount= cols.length - (toShowSegments ? 1 : 0);
    const colsToShowCount = Math.min(MAX_FACET_GRAPHS_COUNT, colsCount - 1);
    const maxInRow = getMaxGraphsInFacetGridRow(colsToShowCount);

    const facetColumnPlots = new Array<DG.Viewer[]>(maxInRow);

    this.facetPlots = [];

    for (let i = 0; i < maxInRow; ++i)
      facetColumnPlots[i] = [];

    let idx = 0;
    let color = 0;

    for (let i = 1; i <= colsToShowCount; ++i) {
      color = COLORS[(i - 1) % COLORS_COUNT];

      const plot = DG.Viewer.lineChart(this.solutionTable, {
        xColumnName: colNames[0],
        yColumnNames: [colNames[i]],
        autoLayout: false,
        showXAxis: true,
        showYAxis: true,
        showXSelector: false,
        showSplitSelector: false,
        lineWidth: 2,
        segmentColumnName: toShowSegments ? STAGE_COL_NAME : undefined,
        lineColoringType: 'Custom',
        lineColor: color,
        markerColor: color,

      });

      this.facetPlots.push(plot);

      facetColumnPlots[idx].push(plot);

      ++idx;

      if (idx === maxInRow)
        idx = 0;
    }

    facetColumnPlots.forEach((col) => col[col.length - 1].setOptions({showXSelector: true}));

    const rowsCount = facetColumnPlots[0].length;

    const col2Roots = (col: DG.Viewer[]) => {
      const roots = col.map((plot) => plot.root);
      if (col.length < rowsCount)
        roots.push(ui.div(''));

      return roots;
    };

    const splitCols = facetColumnPlots.map((col) => ui.splitV(col2Roots(col)));
    const facet = ui.splitH(splitCols);

    return facet;
  } // getFacetPlot
};
