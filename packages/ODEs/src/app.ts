// UI for solving differential equations

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
import {HINT, TITLE, LINK, HOT_KEY, ERROR_MSG, INFO,
  WARNING, MISC, demoInfo, INPUT_TYPE, PATH, UI_TIME} from './ui-constants';
import {getIVP, getScriptLines, getScriptParams, IVP, Input, SCRIPTING,
  BRACE_OPEN, BRACE_CLOSE, BRACKET_OPEN, BRACKET_CLOSE, ANNOT_SEPAR,
  CONTROL_SEP, STAGE_COL_NAME, ARG_INPUT_KEYS, DEFAULT_SOLVER_SETTINGS} from './scripting-tools';
import {CallbackAction, DEFAULT_OPTIONS} from './solver-tools/solver-defs';

import './css/app-styles.css';

/** State of IVP code editor */
enum EDITOR_STATE {
  EMPTY = 'empty',
  BASIC_TEMPLATE = 'template',
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
};

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
]);

/** Models & templates */
const MODELS: string[] = [EDITOR_STATE.BASIC_TEMPLATE,
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
];

/** Control expressions completion utilite */
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
function getLineChartOptions(colNames: string[]): Partial<DG.ILineChartLookSettings> {
  const count = colNames.length;
  return {
    xColumnName: colNames[0],
    yColumnNames: (count > 1) ? colNames.slice(1).filter((name) => name !== STAGE_COL_NAME) : [colNames[0]],
    showTitle: true,
    multiAxis: count > MAX_LINE_CHART,
    // @ts-ignore
    multiAxisLegendPosition: 'RightTop',
    segmentColumnName: colNames.includes(STAGE_COL_NAME) ? STAGE_COL_NAME: undefined,
    showAggrSelectors: false,
  };
}

/**  String-to-value */
const strToVal = (s: string) => {
  const num = Number(s);
  return !isNaN(num) ? num : s === 'true' ? true : s === 'false' ? false : s;
};

/** Solver of differential equations */
export class DiffStudio {
  /** Run Diff Studio application */
  public async runSolverApp(content?: string): Promise<DG.ViewBase> {
    this.createEditorView(content, true);
    this.solverView.setRibbonPanels([
      [this.openIcon, this.saveIcon],
      [this.exportButton, this.sensAnIcon, this.fittingIcon],
      [this.helpIcon],
    ]);
    this.toChangePath = true;

    setTimeout(async () => {
    // routing
      if (content)
        await this.runSolving(false);
      // dfdf
      else {
        const modelIdx = this.startingPath.indexOf(PATH.MODEL);
        const paramsIdx = this.startingPath.indexOf(PATH.PARAM);

        if (modelIdx > -1) {
          const model = this.startingPath.slice(modelIdx + PATH.MODEL.length, (paramsIdx > -1) ? paramsIdx : undefined);

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
            await this.setState(EDITOR_STATE.BASIC_TEMPLATE);
        } else
          await this.setState(EDITOR_STATE.BASIC_TEMPLATE);
      }
    },
    UI_TIME.APP_RUN_SOLVING);

    return this.solverView;
  } // runSolverApp

  /** Run Diff Studio demo application */
  public async runSolverDemoApp(): Promise<void> {
    this.createEditorView(DEMO_TEMPLATE, true);
    this.solverView.setRibbonPanels([
      [this.openIcon, this.saveIcon],
      [this.exportButton, this.sensAnIcon, this.fittingIcon],
      [this.helpIcon],
    ]);
    this.toChangePath = false;
    const helpMD = ui.markdown(demoInfo);
    helpMD.classList.add('diff-studio-demo-app-div-md');
    const divHelp = ui.div([helpMD], 'diff-studio-demo-app-div-help');
    this.solverView.dockManager.dock(divHelp, DG.DOCK_TYPE.RIGHT, undefined, undefined, 0.3);
    await this.runSolving(false);
    // dfdf
  } // runSolverDemoApp

  /** Return file preview view */
  public async getFilePreview(file: DG.FileInfo, path: string): Promise<DG.View> {
    const browseView = grok.shell.view(TITLE.BROWSE);
    const equations = await file.readAsString();
    this.createEditorView(equations, false);
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
    let isSaveBtnAdded = false;

    const ribbonPnls = browseView!.getRibbonPanels();
    ribbonPnls.push([this.sensAnIcon, this.fittingIcon]);
    browseView!.setRibbonPanels(ribbonPnls);

    const addSaveBtnToRibbon = () => {
      ribbonPnls.push([saveBtn]);
      browseView!.setRibbonPanels(ribbonPnls);
      isSaveBtnAdded = true;
    };

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

    this.editorView!.dom.addEventListener('keydown', async (e) => {
      if (!isSaveBtnAdded)
        addSaveBtnToRibbon();

      saveBtn.hidden = false;
    });

    this.toRunWhenFormCreated = true;

    setTimeout(() => this.runSolving(true), UI_TIME.PREVIEW_RUN_SOLVING);

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
  private secondsLimit = UI_TIME.SOLV_DEFAULT_TIME_SEC;
  private modelPane: DG.TabPane;
  private runPane: DG.TabPane;
  private editorView: EditorView | undefined;
  private openMenu: DG.Menu;
  private openIcon: HTMLElement;
  private saveIcon: HTMLElement;
  private helpIcon: HTMLElement;
  private exportButton: HTMLButtonElement;
  private sensAnIcon: HTMLElement;
  private fittingIcon: HTMLElement;
  private performanceDlg: DG.Dialog | null = null;

  private inputsByCategories = new Map<string, DG.InputBase[]>();

  constructor(toAddTableView: boolean = true) {
    this.solverView = toAddTableView ?
      grok.shell.addTableView(this.solutionTable) :
      DG.TableView.create(this.solutionTable, false);

    this.solverView.helpUrl = LINK.DIF_STUDIO_REL;
    this.solverView.name = MISC.VIEW_DEFAULT_NAME;
    this.modelPane = this.tabControl.addPane(TITLE.MODEL, () => {
      setTimeout(() => {
        this.modelDiv.style.height = '100%';
        if (this.editorView)
          this.editorView!.dom.style.height = '100%';
      }, 10);
      return this.modelDiv;
    });
    this.runPane = this.tabControl.addPane(TITLE.IPUTS, () => this.inputsPanel);

    this.tabControl.onTabChanged.subscribe(async (_) => {
      if ((this.tabControl.currentPane === this.runPane) && this.toChangeInputs)
        await this.runSolving(true);
    });

    const dockTabCtrl = () => {
      const node = this.solverView.dockManager.dock(this.tabControl.root, DG.DOCK_TYPE.LEFT);
      if (node.container.dart.elementTitle)
        node.container.dart.elementTitle.hidden = true;
    };

    if (!toAddTableView)
      setTimeout(dockTabCtrl, UI_TIME.PREVIEW_DOCK_EDITOR);
    else
      dockTabCtrl();

    this.openMenu = DG.Menu.popup()
      .item(TITLE.FROM_FILE, async () => await this.overwrite(), undefined, {description: HINT.LOAD})
      .group(TITLE.TEMPL)
      .item(TITLE.BASIC, async () =>
        await this.overwrite(EDITOR_STATE.BASIC_TEMPLATE), undefined, {description: HINT.BASIC},
      )
      .item(TITLE.ADV, async () =>
        await this.overwrite(EDITOR_STATE.ADVANCED_TEMPLATE), undefined, {description: HINT.ADV},
      )
      .item(TITLE.EXT, async () =>
        await this.overwrite(EDITOR_STATE.EXTENDED_TEMPLATE), undefined, {description: HINT.EXT})
      .endGroup()
      .group(TITLE.CASES)
      .item(TITLE.CHEM, async () => await this.overwrite(EDITOR_STATE.CHEM_REACT), undefined, {description: HINT.CHEM})
      .item(TITLE.ROB, async () => await this.overwrite(EDITOR_STATE.ROBERT), undefined, {description: HINT.ROB})
      .item(TITLE.FERM, async () => await this.overwrite(EDITOR_STATE.FERM), undefined, {description: HINT.FERM})
      .item(TITLE.PK, async () => await this.overwrite(EDITOR_STATE.PK), undefined, {description: HINT.PK})
      .item(TITLE.PKPD, async () => await this.overwrite(EDITOR_STATE.PKPD), undefined, {description: HINT.PKPD})
      .item(TITLE.ACID, async () => await this.overwrite(EDITOR_STATE.ACID_PROD), undefined, {description: HINT.ACID})
      .item(TITLE.NIM, async () => await this.overwrite(EDITOR_STATE.NIMOTUZUMAB), undefined, {description: HINT.NIM})
      .item(TITLE.BIO, async () => await this.overwrite(EDITOR_STATE.BIOREACTOR), undefined, {description: HINT.BIO})
      .endGroup();

    this.openIcon = ui.iconFA('folder-open', () => this.openMenu.show(), HINT.OPEN);
    this.saveIcon = ui.iconFA('save', async () => {await this.saveFn();}, HINT.SAVE_LOC);
    this.helpIcon = ui.iconFA('question', () => {window.open(LINK.DIF_STUDIO, '_blank');}, HINT.HELP);
    this.exportButton = ui.bigButton(TITLE.TO_JS, async () => {await this.exportToJS();}, HINT.TO_JS);
    this.sensAnIcon = ui.iconFA('analytics', async () => {await this.runSensitivityAnalysis();}, HINT.SENS_AN);
    this.fittingIcon = ui.iconFA('chart-line', async () => {await this.runFitting();}, HINT.FITTING);
  }; // constructor

  /** Create model editor */
  private createEditorView(content?: string, toAddContextMenu?: boolean): void {
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
        this.setCallWidgetsVisibility(true);
      } else {
        e.stopImmediatePropagation();
        e.preventDefault();

        if ( this.toChangeInputs )
          await this.runSolving(true);
        else
          this.tabControl.currentPane = this.runPane;
      }
    });

    this.editorView.dom.classList.add('diff-studio-eqs-editor');

    if (toAddContextMenu) {
      this.editorView.dom.addEventListener<'contextmenu'>('contextmenu', (event) => {
        event.preventDefault();
        DG.Menu.popup()
          .item(TITLE.LOAD, async () => await this.overwrite(), undefined, {description: HINT.LOAD})
          .item(TITLE.SAVE_DOTS, this.saveFn, undefined, {description: HINT.SAVE_LOC})
          .separator()
          .group(TITLE.TEMPL)
          .item(TITLE.BASIC, async () =>
            await this.overwrite(EDITOR_STATE.BASIC_TEMPLATE), undefined, {description: HINT.BASIC},
          )
          .item(TITLE.ADV, async () =>
            await this.overwrite(EDITOR_STATE.ADVANCED_TEMPLATE), undefined, {description: HINT.ADV},
          )
          .item(TITLE.EXT, async () =>
            await this.overwrite(EDITOR_STATE.EXTENDED_TEMPLATE), undefined, {description: HINT.EXT},
          )
          .endGroup()
          .group(TITLE.CASES)
          .item(TITLE.CHEM, async () =>
            await this.overwrite(EDITOR_STATE.CHEM_REACT), undefined, {description: HINT.CHEM},
          )
          .item(TITLE.ROB, async () => await this.overwrite(EDITOR_STATE.ROBERT), undefined, {description: HINT.ROB})
          .item(TITLE.FERM, async () => await this.overwrite(EDITOR_STATE.FERM), undefined, {description: HINT.FERM})
          .item(TITLE.PK, async () => await this.overwrite(EDITOR_STATE.PK), undefined, {description: HINT.PK})
          .item(TITLE.PKPD, async () => await this.overwrite(EDITOR_STATE.PKPD), undefined, {description: HINT.PKPD})
          .item(TITLE.ACID, async () =>
            await this.overwrite(EDITOR_STATE.ACID_PROD), undefined, {description: HINT.ACID},
          )
          .item(TITLE.NIM, async () =>
            await this.overwrite(EDITOR_STATE.NIMOTUZUMAB), undefined, {description: HINT.NIM},
          )
          .item(TITLE.BIO, async () =>
            await this.overwrite(EDITOR_STATE.BIOREACTOR), undefined, {description: HINT.BIO},
          )
          .endGroup()
          .separator()
          .item(TITLE.CLEAR, async () => await this.overwrite(EDITOR_STATE.EMPTY), undefined, {description: HINT.CLEAR})
          .show();
      });
    }
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

  /** Save the current IVP to file */
  private async saveFn(): Promise<void> {
    const link = document.createElement('a');
    const file = new Blob([this.editorView!.state.doc.toString()], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = MISC.FILE_DEFAULT_NAME;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /** Set IVP code editor state */
  private async setState(state: EDITOR_STATE,
    toClearStartingInputs: boolean = true, text?: string | undefined): Promise<void> {
    this.toChangeSolutionViewerProps = true;
    this.isModelChanged = false;
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
    if (state === EDITOR_STATE.FROM_FILE)
      this.solverMainPath = PATH.CUSTOM;
    else
      this.solverMainPath = `${PATH.MODEL}${state}`;

    switch (state) {
    case EDITOR_STATE.EMPTY:
      this.clearSolution();
      break;

    case EDITOR_STATE.BASIC_TEMPLATE:
    case EDITOR_STATE.ADVANCED_TEMPLATE:
    case EDITOR_STATE.EXTENDED_TEMPLATE:
      await this.runSolving(false);
      // dfdf
      break;

    default:
      await this.runSolving(true);
      break;
    }
  }; // setState

  /** Overwrite the editor content */
  private async overwrite(state?: EDITOR_STATE): Promise<void> {
    if (this.toShowWarning && this.isModelChanged) {
      const boolInput = ui.boolInput(WARNING.CHECK, true, () => this.toShowWarning = !this.toShowWarning);
      const dlg = ui.dialog({title: WARNING.TITLE, helpUrl: LINK.DIF_STUDIO_REL});
      this.solverView.append(dlg);

      dlg.add(ui.label(WARNING.MES))
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
      this.clearSolution();
      grok.shell.error(`${ERROR_MSG.EXPORT_TO_SCRIPT_FAILS}:
      ${err instanceof Error ? err.message : ERROR_MSG.SCRIPTING_ISSUE}`);
    }
  }; // exportToJS

  /** Solve IVP */
  private async solve(ivp: IVP, inputsPath: string): Promise<void> {
    const customSettings = (ivp.solverSettings !== DEFAULT_SOLVER_SETTINGS);

    try {
      if (this.toChangePath)
        this.solverView.path = `${this.solverMainPath}${PATH.PARAM}${inputsPath}`;

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
      this.solverView.dataFrame = call.outputs[DF_NAME];
      this.solverView.name = this.solutionTable.name;

      if (ivp.updates) {
        this.solverView.grid.columns.setVisible([this.solutionTable.columns.names()[0]]);
        this.solverView.grid.columns.setVisible(this.solutionTable.columns.names()
          .filter((name) => name !== STAGE_COL_NAME));
      }

      if (!this.solutionViewer) {
        this.solutionViewer = DG.Viewer.lineChart(this.solutionTable,
          getLineChartOptions(this.solutionTable.columns.names()));
        this.viewerDockNode = grok.shell.dockManager.dock(
          this.solutionViewer,
          DG.DOCK_TYPE.TOP,
          this.solverView.dockManager.
            findNode(this.solverView.grid.root),
        );
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

      this.isSolvingSuccess = true;
      this.runPane.header.hidden = false;
    } catch (error) {
      if (error instanceof CallbackAction) {
        this.isSolvingSuccess = true;
        this.runPane.header.hidden = false;

        if (this.toShowPerformanceDlg && !customSettings) {
          ivp.solverSettings = DEFAULT_SOLVER_SETTINGS;
          this.showPerformanceDlg(ivp, inputsPath);
        } else
          grok.shell.warning(error.message);
      } else {
        this.clearSolution();
        this.isSolvingSuccess = false;
        grok.shell.error(error instanceof Error ? error.message : ERROR_MSG.SCRIPTING_ISSUE);
      }
    }
  }; // solve

  /** Run solving the current IVP */
  private async runSolving(toShowInputsForm: boolean): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.getInputsForm(ivp);
      this.setCallWidgetsVisibility(this.isSolvingSuccess);

      if (this.isSolvingSuccess) {
        this.toChangeInputs = false;
        this.tabControl.currentPane = this.runPane;

        if (this.prevInputsNode !== null)
          this.inputsPanel.removeChild(this.prevInputsNode);

        const form = ui.form([]);

        if (this.inputsByCategories.size === 1)
          this.inputsByCategories.get(TITLE.MISC)!.forEach((input) => form.append(input.root));
        else {
          this.inputsByCategories.forEach((inputs, category) => {
            if (category !== TITLE.MISC) {
              form.append(ui.h2(category));
              inputs.forEach((inp) => {
                form.append(inp.root);
              });
            }
          });

          if (this.inputsByCategories.get(TITLE.MISC)!.length > 0) {
            form.append(ui.h2(TITLE.MISC));
              this.inputsByCategories.get(TITLE.MISC)!.forEach((inp) => {
                form.append(inp.root);
              });
          }
        }

        this.prevInputsNode = this.inputsPanel.appendChild(form);

        if (!toShowInputsForm)
          setTimeout(() => this.tabControl.currentPane = this.modelPane, 5);
      } else
        this.tabControl.currentPane = this.modelPane;
    } catch (error) {
      if (error instanceof CallbackAction)
        grok.shell.warning(error.message);
      else {
        this.clearSolution();
        grok.shell.error(error instanceof Error ? error.message : ERROR_MSG.SCRIPTING_ISSUE);
      }
    }
  }; // runSolving

  /** Show/hide model call widgets */
  private setCallWidgetsVisibility(toShow: boolean): void {
    this.runPane.header.hidden = !toShow;
    this.exportButton.disabled = !toShow;
    this.sensAnIcon.hidden = !toShow;
    this.fittingIcon.hidden = !toShow;
  }

  /** Clear solution table & viewer */
  private clearSolution() {
    this.solutionTable = DG.DataFrame.create();
    this.solverView.dataFrame = this.solutionTable;
    this.setCallWidgetsVisibility(false);

    if (this.prevInputsNode !== null)
      this.inputsPanel.removeChild(this.prevInputsNode);
    this.prevInputsNode = null;
    this.tabControl.currentPane = this.modelPane;

    if (this.solutionViewer && this.viewerDockNode) {
      grok.shell.dockManager.close(this.viewerDockNode);
      this.solutionViewer = null;
      this.solverView.path = PATH.EMPTY;
    }
  } // clearSolution

  /** Return form with model inputs */
  private async getInputsForm(ivp: IVP): Promise<void> {
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
          if (posClose === -1)
            throw new Error(`${ERROR_MSG.MISSING_CLOSING_BRACKET}, see '${name}' in ${modelBlock}-block`);

          descr = annot.slice(posOpen + 1, posClose);

          annot = annot.slice(0, posOpen);
        }

        posOpen = annot.indexOf(BRACE_OPEN);
        posClose = annot.indexOf(BRACE_CLOSE);

        if (posOpen >= posClose)
          throw new Error(`${ERROR_MSG.INCORRECT_BRACES_USE}, see '${name}' in ${modelBlock}-block`);

        let pos: number;
        let key: string;
        let val;

        annot.slice(posOpen + 1, posClose).split(ANNOT_SEPAR).forEach((str) => {
          pos = str.indexOf(CONTROL_SEP);

          if (pos === -1)
            throw new Error(`${ERROR_MSG.MISSING_COLON}, see '${name}' in ${modelBlock}-block`);

          key = str.slice(0, pos).trim();
          val = str.slice(pos + 1).trim();

          // @ts-ignore
          options[key] = strToVal(val);
        });

        options.description = descr ?? '';
        options.name = options.caption ?? options.name;
        options.caption = options.name;
      }

      if (this.startingInputs) {
        options.defaultValue = this.startingInputs
          .get(options.name!.replace(' ', '').toLowerCase()) ?? options.defaultValue;
        modelInput.value = options.defaultValue;
      }

      return options;
    }; // getOptions

    const inputsByCategories = new Map<string, DG.InputBase[]>();
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
      input.onChanged(async () => {
        if (input.value !== null) {
          //@ts-ignore
          ivp.arg[key].value = input.value;
          await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
    }

    // Inputs for initial values
    ivp.inits.forEach((val, key) => {
      options = getOptions(key, val, CONTROL_EXPR.INITS);
      const input = ui.input.forProperty(DG.Property.fromOptions(options));
      input.onChanged(async () => {
        if (input.value !== null) {
        ivp.inits.get(key)!.value = input.value;
        await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
    });

    // Inputs for parameters
    if (ivp.params !== null) {
      ivp.params.forEach((val, key) => {
        options = getOptions(key, val, CONTROL_EXPR.PARAMS);
        const input = ui.input.forProperty(DG.Property.fromOptions(options));
        input.onChanged(async () => {
          if (input.value !== null) {
            ivp.params!.get(key)!.value = input.value;
            await this.solve(ivp, getInputsPath());
          }
        });

        categorizeInput(options, input);
      });
    }

    // Inputs for loop
    if (ivp.loop !== null) {
      options = getOptions(SCRIPTING.COUNT, ivp.loop.count, CONTROL_EXPR.LOOP);
      options.inputType = INPUT_TYPE.INT; // since it's an integer
      options.type = DG.TYPE.INT; // since it's an integer
      const input = ui.input.forProperty(DG.Property.fromOptions(options));
      input.onChanged(async () => {
        if (input.value !== null) {
          ivp.loop!.count.value = input.value;
          await this.solve(ivp, getInputsPath());
        }
      });

      categorizeInput(options, input);
    }

    if (this.toRunWhenFormCreated)
      await this.solve(ivp, getInputsPath());

    this.inputsByCategories = inputsByCategories;
  } // getInputsUI

  /** Run sensitivity analysis */
  private async runSensitivityAnalysis(): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.tryToSolve(ivp);
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      const script = DG.Script.create(scriptText);
      //@ts-ignore
      await SensitivityAnalysisView.fromEmpty(script);
    } catch (err) {
      this.clearSolution();
      grok.shell.error(`${ERROR_MSG.SENS_AN_FAILS}:
      ${(err instanceof Error) ? err.message : ERROR_MSG.SCRIPTING_ISSUE}`);
    }
  }

  /** Run fitting */
  private async runFitting(): Promise<void> {
    try {
      const ivp = getIVP(this.editorView!.state.doc.toString());
      await this.tryToSolve(ivp);
      const scriptText = getScriptLines(ivp, true, true).join('\n');
      const script = DG.Script.create(scriptText);
      //@ts-ignore
      await FittingView.fromEmpty(script);
    } catch (err) {
      this.clearSolution();
      grok.shell.error(`${ERROR_MSG.SENS_AN_FAILS}:
        ${(err instanceof Error) ? err.message : ERROR_MSG.SCRIPTING_ISSUE}`);
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
    } catch (err) {
      if (!(err instanceof CallbackAction))
        throw new Error((err instanceof Error) ? err.message : ERROR_MSG.SCRIPTING_ISSUE);
    }
  }

  /** Close previousely opened performance dialog */
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
    maxTimeInput.onInput(() => {
      if (maxTimeInput.value >= UI_TIME.SOLV_TIME_MIN_SEC)
        this.secondsLimit = maxTimeInput.value;
      else maxTimeInput.value = this.secondsLimit;
    });

    this.performanceDlg.add(ui.label(`Max time exceeded (${this.secondsLimit} sec.). ${WARNING.CONTINUE}`))
      .onCancel(() => this.performanceDlg.close())
      .onOK(async () => {
        ivp.solverSettings = DEFAULT_SOLVER_SETTINGS;
        this.performanceDlg.close();
        setTimeout(async () => await this.solve(ivp, inputsPath), 20);
        ;
      })
      .show();

    this.performanceDlg.add(ui.form([maxTimeInput]));
    ui.tooltip.bind(this.performanceDlg.getButton('OK'), HINT.CONTINUE);
    ui.tooltip.bind(this.performanceDlg.getButton('CANCEL'), HINT.ABORT);

    return this.performanceDlg;
  }
};
