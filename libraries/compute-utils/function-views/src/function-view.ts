/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Subject, BehaviorSubject, merge} from 'rxjs';
import $ from 'cash-dom';
import dayjs from 'dayjs';
import {historyUtils} from '../../history-utils';
import {UiUtils} from '../../shared-components';
import {CARD_VIEW_TYPE, VIEW_STATE} from '../../shared-utils/consts';
import {createPartialCopy, deepCopy, fcToSerializable, getStartedOrNull, isIncomplete} from '../../shared-utils/utils';
import {HistoryPanel} from '../../shared-components/src/history-panel';
import {RunComparisonView} from './run-comparison-view';
import {delay, distinctUntilChanged, filter, take} from 'rxjs/operators';
import {deserialize, serialize} from '@datagrok-libraries/utils/src/json-serialization';
import {FileInput} from '../../shared-components/src/file-input';
import {testFunctionView} from '../../shared-utils/function-views-testing';
import {getStarted, properUpdateIndicator} from './shared/utils';

// Getting inital URL user entered with
const startUrl = new URL(grok.shell.startUri);

const RunDataJSON = 'Run Data JSON';

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
    //@ts-ignore
    selfBrowserSurface: 'include',
  });
  const recorder = new MediaRecorder(stream);

  const chunks = [] as Blob[];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, {type: chunks[0].type});
    stream.getVideoTracks()[0].stop();

    DG.Utils.download(`Recording ${new Date().toLocaleString('en-us', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})}.mkv`, blob, chunks[0].type);
  };
  recorder.start();
};

export abstract class FunctionView extends DG.ViewBase {
  protected _funcCall?: DG.FuncCall;
  protected _lastCall?: DG.FuncCall;
  protected _type: string = 'function';

  // emitted when after a new FuncCall is linked
  public funcCallReplaced = new Subject<true>();
  public isReady = new BehaviorSubject(false);

  /**
   * Constructs a new view using function with the given {@link func}. An fully-specified name is expected.
   * Search of the function is async, so async {@link init} function is used.
   * All other functions are called only when initialization is over and {@link this.onFuncCallReady} is run.
   * @param initValue Name of DG.Func (either script or package function) or DG.FuncCall to use as view foundation
   * @param options Configuration object for the view.
   */
  constructor(
    protected initValue: string | DG.FuncCall,
    public options: {
      historyEnabled: boolean,
      isTabbed: boolean,
      skipInit?: boolean
    } = {historyEnabled: true, isTabbed: false, skipInit: false},
  ) {
    super();
    this.box = true;
    this.parentCall = grok.functions.getCurrentCall();

    if (initValue instanceof DG.FuncCall)
      this.parentCall = initValue;

    this.parentView = this.parentCall?.parentCall?.aux?.['view'];
    if (this.parentCall?.func?.name)
      this.basePath = `/${this.parentCall.func.name}`;

    if (!options.skipInit)
      this.init();
  }

  /**
   * Runs after an initial FuncCall loading done.
   */
  public async onFuncCallReady() {
    await historyUtils.augmentCallWithFunc(this.funcCall, false);
    if (!this.options.isTabbed) {
      if (!this.name || this.name === 'New view') this.name = this.funcCall.func.friendlyName;
      try {
        if (this.func.package)
          await this.getPackageData();
      } catch (e) {
        console.log(e);
      }
    }

    this.build();
    const runId = this.getStartId();
    if (runId && !this.options.isTabbed) {
      ui.setUpdateIndicator(this.root, true);
      this.loadRun(runId);
      ui.setUpdateIndicator(this.root, false);
      this.setAsLoaded();
    }

    if (this.isHistoryEnabled && this.func) {
      const historySub = this.options.isTabbed ?
        this.isHistorical.subscribe((newValue) => {
          if (!newValue) {
            //@ts-ignore
            this.funcCall.id = null;
          }
        }) :
        this.isHistorical.subscribe((newValue) => {
          if (newValue) {
            this.path = `?id=${this.funcCall.id}`;
            const dateStarted = getStarted(this.funcCall);
            if ((this.name.indexOf(' — ') < 0))
              this.name = `${this.name} — ${this.funcCall.options['title'] ?? dateStarted}`;
            else
              this.name = `${this.name.substring(0, this.name.indexOf(' — '))} — ${this.funcCall.options['title'] ?? dateStarted}`;
          } else {
            this.path = ``;
            // Resetting Funccall's id to flag it as incomplete
            //@ts-ignore
            this.funcCall.id = null;
            this.name = `${this.name.substring(0, (this.name.indexOf(' — ') > 0) ? this.name.indexOf(' — ') : undefined)}`;
          }
        });
      this.subs.push(historySub);
    }
  }

  private getStartId(): string | undefined {
    // To prevent loading same ID on opening different package,
    // we should check if we have already loaded run by this ID

    //@ts-ignore
    return (!grok.shell.getVar('isLoaded')) ? startUrl.searchParams.get('id'): undefined;
  }

  private setAsLoaded(): string | undefined {
    // @ts-ignore
    return grok.shell.setVar('isLoaded', true);
  }

  /**
   * Get current function call of the view
   * @returns The actual funccall associated with the view
   * @stability Stable
   */
  public get funcCall(): DG.FuncCall {
    return this._funcCall!;
  }

  /**
   * Get Func of the view
   * @returns The actual func associated with the view
   * @stability Stable
   */
  get func() {
    return this.funcCall?.func;
  }

  /**
   * Get data of last call of associated function
   * @returns The actual func associated with the view
   * @stability Stable
   */
  get lastCall() {
    return this._lastCall;
  }

  /**
   * Set data of last call of associated function
   * @stability Stable
   */
  set lastCall(lastCall: DG.FuncCall | undefined) {
    this._lastCall = lastCall;
  }

  /**
   * View type
   * @stability Stable
   */
  public get type(): string {
    return this._type;
  }

  /** Export options. Could be overriden partially, using default implementation of each option.
   * @stability Stable
   */
  exportConfig: {
    /** Override to provide custom export logic.
     * There is no default implementation, since, in general, export is dependent on the UI.
     *
     * @returns Blob with data to be exported into the file.
     * @stability Stable
     */
    export: ((format: string) => Promise<Blob>);

    /** Filename for exported files. Override for custom filenames.
     * Default implementation is {@link defaultExportFilename}
     * @param format Format name to be exported
     * @returns The actual filename to be used for the generated file.
     * @stability Stable
     */
    filename: ((format: string) => string);

    /** Override to provide custom list of supported export formats.
     * Default implementation is {@link defaultSupportedExportFormats}
     * These formats are available under the "Export" popup on the ribbon panel.
     * @returns The array of formats available for the export.
     * @stability Stable
     */
    supportedFormats: string[];

    /** Override to provide custom file extensions for exported formats.
     * Default implementation is {@link defaultSupportedExportExtensions}
     * These extensions are used in filenames {@link exportFilename}.
     * @returns The mapping between supported export formats and their extensions.
     * @stability Stable
     */
    supportedExtensions: Record<string, string>;
  } | null = null;

  /** Override to customize getting mocks
   * @stability Stable
   */
  getMocks: ({mockName: string, action: () => Promise<void>}[]) | null = null;

  /** Override to customize getting templates
   * @stability Stable
   */
  getTemplates: ({name: string, action: () => Promise<void>}[]) | null = null;

  /** Override to customize getting help feature. Called when "Help" is clicked.
   * @stability Stable
   */
  getHelp: (() => Promise<void>) | null = null;

  /** Override to customize bug reporting feature. Called when "Report a bug" is clicked.
   * @stability Stable
   */
  reportBug: (() => Promise<void>) | null = null;

  /** Override to customize feature request feature. Called when "Request a feature" is clicked.
   * @stability Stable
   */
  requestFeature: (() => Promise<void>) | null = null;

  /** Override to customize "about" info obtaining feature. Called when "About" is clicked.
   * Default implementation finds {@link this.funcCall}'s package and shows it's properties.
   * @stability Stable
   */
  getAbout: (() => Promise<string| undefined>) | null = null;

  /**
   * Finds {@link this.funcCall}'s package and retrieves it's data.
   * @stability Stable
   */
  private async getPackageData() {
    const pack = this.func.package;
    if (!pack)
      return;

    const reportBugUrl = (await pack?.getProperties() as any)?.REPORT_BUG_URL;
    if (reportBugUrl && !this.reportBug)
      this.reportBug = async () => {window.open(reportBugUrl, '_blank');};

    const reqFeatureUrl = (await pack?.getProperties() as any)?.REQUEST_FEATURE_URL;
    if (reqFeatureUrl && !this.requestFeature)
      this.requestFeature = async () => {window.open(reqFeatureUrl, '_blank');};

    const aboutString = `${pack.friendlyName}.\nLast updated on ${dayjs(pack.updatedOn).format('YYYY MMM D, HH:mm')}`;
    if (!this.getAbout)
      this.getAbout = async () => aboutString;
  }

  /**
   * Links FuncCall to the view. In addition, sets "path" and "name" properties to corresponding ones.
   * After linking, emits {@link this.funcCallReplaced} event.
   * @param funcCall The actual funccall to be associated with the view
   * @stability Stable
   */
  public linkFunccall(funcCall: DG.FuncCall) {
    this._funcCall = funcCall;
    this.funcCallReplaced.next(true);
  }

  /**
   * Method loads corresponding FuncCall from DB if "id" param is provided in URL.
   * @stability Stable
   */
  public async loadFuncCallById() {
    if (this.initValue instanceof DG.FuncCall) {
      // next tick is needed to run funcCallReplaced before building UI
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.linkFunccall(this.initValue);
      return;
    }

    ui.setUpdateIndicator(this.root, true);

    const runId = this.getStartId();
    if (runId && !this.options.isTabbed)
      this.linkFunccall(await historyUtils.loadRun(runId));
    else {
      const func: DG.Func = await grok.functions.eval(this.initValue);
      this.linkFunccall(func.prepare({}));
    }

    ui.setUpdateIndicator(this.root, false);
  }

  /**
   * Method for any async logic that could not be placed in the constructor directly.
   * It is only called in the constructor, but not awaited.
   * A soon as {@link this.funcCall} is set, {@link this.onFuncCallReady} is run.
   * @stability Stable
   */
  public async init() {
    await this.loadFuncCallById();
    await this.onFuncCallReady();
    this.isReady.next(true);
  }

  /**
   * Override to create a fully custom UI including ribbon menus and panels
   * @stability Stable
   */
  public build(): void {
    ui.empty(this.root);
    this.root.appendChild(this.buildIO());

    if (this.options.historyEnabled && this.isHistoryEnabled) this.buildHistoryBlock();
    this.buildRibbonMenu();
    this.buildRibbonPanels();
  }

  /**
   * Override to create a custom input-output block.
   * @returns The HTMLElement with whole UI excluding ribbon menus and panels
   * @stability Stable
   */
  public abstract buildIO(): HTMLElement;

  /**
   * Override to change behavior on runs comparison
   * @param fullFuncCalls FuncCalls to be compared
   */
  public async onComparisonLaunch(fullFuncCalls: DG.FuncCall[]) {
    const comparator = this.comparatorFunc;
    if (comparator) {
      const comparatorFunc: DG.Func = await grok.functions.eval(comparator);
      const comparatorCall = await comparatorFunc.prepare(
        {params: {'comparedRuns': fullFuncCalls}},
      ).call();
      const customView = comparatorCall.outputs.comparisonView;
      grok.shell.addView(customView);

      return;
    }

    const parentCall = grok.shell.v.parentCall;
    const cardView = [...grok.shell.views].find((view) => view.type === CARD_VIEW_TYPE);
    const defaultView = await RunComparisonView.fromComparedRuns(fullFuncCalls, this.func, {
      parentView: cardView,
      parentCall,
    });

    grok.shell.addView(defaultView);
    defaultView.defaultCustomize();

    const compareCustomizer = this.compareCustomizer;
    if (compareCustomizer) {
      const compareCustomizerFunc: DG.Func = await grok.functions.eval(compareCustomizer);
      await compareCustomizerFunc.prepare(
        {params: {'defaultView': defaultView}},
      ).call();

      return;
    }
  }

  protected async onSaveClick() {
    await this.saveRun(this.funcCall);
  }

  protected historyBlock = null as null | HistoryPanel;
  /**
   * Override to create a custom historical runs control.
   * @returns The HTMLElement with history block UI
   * @stability Stable
   */
  public buildHistoryBlock(): HTMLElement {
    const newHistoryBlock = UiUtils.historyPanel(this.func!);
    let wasHistoryBlockOpened = false;

    this.subs.push(
      newHistoryBlock.onCompactModeChanged.subscribe((newValue) => {
        const historyPanel = grok.shell.dockManager.findNode(this.historyRoot);
        if (historyPanel) {
          grok.shell.dockManager.close(historyPanel);

          if (newValue)
            grok.shell.dockManager.dock(this.historyRoot, 'right', null, 'History', 0.3);
          else
            grok.shell.dockManager.dock(this.historyRoot, 'down', null, 'History', 0.3);
        }
      }),
      newHistoryBlock.onRunChosen.subscribe(async (id) => {
        ui.setUpdateIndicator(this.root, true);
        await this.loadRun(id);
        ui.setUpdateIndicator(this.root, false);
      }),
      newHistoryBlock.onComparison.subscribe(async (ids) => {
        properUpdateIndicator(newHistoryBlock.root, true);
        const fullFuncCalls = await Promise.all(ids.map((funcCallId) => historyUtils.loadRun(funcCallId)));
        await this.onComparisonLaunch(fullFuncCalls);
        properUpdateIndicator(newHistoryBlock.root, false);
      }),
      newHistoryBlock.afterRunEdited.subscribe((editedCall) => {
        if (editedCall.id === this.funcCall.id && editedCall.options['title']) {
          this.path = `?id=${this.funcCall.id}`;
          const dateStarted = getStarted(editedCall);
          if ((this.name.indexOf(' — ') < 0))
            this.name = `${this.name} — ${editedCall.options['title'] ?? dateStarted}`;
          else
            this.name = `${this.name.substring(0, this.name.indexOf(' — '))} — ${editedCall.options['title'] ?? dateStarted}`;
        }
      }),
      grok.events.onViewRemoving.subscribe((event) => {
        const closedView = event.args.view as DG.ViewBase;
        if (closedView == this) {
          const historyPanel = grok.shell.dockManager.findNode(this.historyRoot);
          if (historyPanel) {
            grok.shell.dockManager.close(historyPanel);
            wasHistoryBlockOpened = true;
          } else
            wasHistoryBlockOpened = false;
        }
      }),
      grok.events.onCurrentViewChanged.subscribe(() => {
        if (grok.shell.v == this) {
          if (wasHistoryBlockOpened) {
            if (this.historyBlock?.compactMode)
              grok.shell.dockManager.dock(this.historyRoot, 'right', null, 'History', 0.3);
            else
              grok.shell.dockManager.dock(this.historyRoot, 'down', null, 'History', 0.3);
          }
        } else {
          const historyPanel = grok.shell.dockManager.findNode(this.historyRoot);
          if (historyPanel) {
            grok.shell.dockManager.close(historyPanel);
            wasHistoryBlockOpened = true;
          } else
            wasHistoryBlockOpened = false;
        }
      }),
    );

    ui.empty(this.historyRoot);
    this.historyRoot.style.removeProperty('justify-content');
    this.historyRoot.append(newHistoryBlock.root);
    this.historyBlock = newHistoryBlock;
    return newHistoryBlock.root;
  }

  /**
   * Looks for {@link supportedExportFormats} members and creates ribbon panel
   * @returns The HTMLElements of ribbonPanels
   * @stability Stable
   */
  buildRibbonPanels(): HTMLElement[][] {
    const historyButton = ui.iconFA('history', () => {
      if (!grok.shell.dockManager.findNode(this.historyRoot)) {
        if (this.historyBlock?.compactMode)
          grok.shell.dockManager.dock(this.historyRoot, 'right', null, 'History', 0.3);
        else
          grok.shell.dockManager.dock(this.historyRoot, 'down', null, 'History', 0.3);

        this.historyRoot.parentElement!.classList.add('ui-box');
        this.historyRoot.classList.add('ui-box');
      }
    });

    const saveBtn = ui.iconFA('save', async () => {
      await this.onSaveClick();
    }, 'Save current state');

    const exportBtn = ui.comboPopup(
      ui.iconFA('arrow-to-bottom'),
      this.getFormats(),
      this.exportRun.bind(this),
    );

    const editBtn = ui.iconFA('edit', () => {
      if (!this.historyBlock || !this.lastCall) return;

      this.historyBlock.showEditDialog(this.historyBlock.history.get(this.funcCall.id)!);
    }, 'Edit this run metadata');

    const historicalSub = this.isHistorical.subscribe((newValue) => {
      if (newValue) {
        ui.setDisplay(exportBtn, !isIncomplete(this.funcCall));
        ui.setDisplay(editBtn, true);
      } else {
        $(exportBtn).hide();
        $(editBtn).hide();
      }
    });
    this.subs.push(historicalSub);

    ui.tooltip.bind(exportBtn, () => {
      if (this.consistencyState.value === 'inconsistent' && this.mandatoryConsistent)
        return 'Current run is inconsistent. Export feature is disabled.';
      else
        return null;
    });

    if (!this.options.isTabbed && this.mandatoryConsistent) {
      const consistencySub = this.consistencyState
        .pipe(distinctUntilChanged())
        .subscribe((newValue) => {
          if (newValue === 'inconsistent') {
            $(exportBtn).addClass('d4-disabled');
            $(exportBtn.lastChild).css('color', 'unset');
          } else {
            $(exportBtn).removeClass('d4-disabled');
            $(exportBtn.lastChild).removeProp('color');
          }
        });
      this.subs.push(consistencySub);
    }

    const newRibbonPanels: HTMLElement[][] =
      [[
        ...!this.options.isTabbed && this.isHistoryEnabled && this.options.historyEnabled ? [
          historyButton,
        ]: [],
        ...!this.options.isTabbed && this.isHistoryEnabled ? [saveBtn] : [],
        ...!this.options.isTabbed && this.isExportEnabled && this.exportConfig && this.exportConfig.supportedFormats.length > 0 ? [
          exportBtn,
        ]: [],
        ...!this.options.isTabbed ? [editBtn]: [],
      ]];

    this.setRibbonPanels(newRibbonPanels);
    return newRibbonPanels;
  }

  /**
   * Looks for
   * {@link getMocks}, {@link getTemplates}, {@link getHelp}, {@link reportBug}, {@link requestFeature}, {@link getAbout}, {@link exportConfig}
   * members and creates "Model" menu
   * @stability Stable
   */
  buildRibbonMenu() {
    this.ribbonMenu.clear();

    if (!this.exportConfig && !this.reportBug && !this.requestFeature && !this.getHelp && !this.getMocks && !this.getTemplates) return;

    const ribbonMenu = this.ribbonMenu.group('Model');

    if (this.getMocks && this.getMocks.length > 0) {
      if (this.getMocks.length === 1)
        ribbonMenu.item('Input data mock', this.getMocks[0].action);
      else {
        const dataGroup = ribbonMenu.group('Input data mocks');
        this.getMocks.forEach((val) => {
          dataGroup.item(val.mockName, val.action);
        });
        ribbonMenu.endGroup();
      }
    }

    if (this.getTemplates && this.getTemplates.length > 0) {
      if (this.getTemplates.length === 1)
        ribbonMenu.item('Input data template', this.getTemplates[0].action);
      else {
        const dataGroup = ribbonMenu.group('Input data templates');
        this.getTemplates.forEach((val) => {
          dataGroup.item(val.name, val.action);
        });
        ribbonMenu.endGroup();
      }
    }

    if (this.isExportEnabled && this.exportConfig && this.exportConfig.supportedFormats.length > 0) {
      ribbonMenu
        .group('Export')
        .items(this.getFormats(), this.exportRun.bind(this))
        .endGroup();
    }

    if (this.reportBug)
      ribbonMenu.item('Report a bug', () => this.reportBug!());

    if (this.requestFeature)
      ribbonMenu.item('Request a feature', () => this.requestFeature!());

    if (this.getHelp)
      ribbonMenu.item('Help', () => this.getHelp!());

    const testingGroup = ribbonMenu.group('Test runner');
    testingGroup.item('Execute Test JSON', () => this.importRunJsonDialog());
    testingGroup.item('Update Test JSON', () => this.importRunJsonDialog(true));
    ribbonMenu.endGroup();

    ribbonMenu.item('Record the screen', startRecording);

    if (this.getAbout) {
      ribbonMenu.item('About', async () => {
        const about = await this.getAbout!();
        if (about) {
          const dialog = ui.dialog('Current version');
          about.split('\n').forEach((line) => dialog.add(ui.label(line)));
          dialog.onOK(() => {});
          dialog.getButton('CANCEL').style.display = 'none';
          dialog.show({center: true});
        }
      });
    }
  }

  public async exportRun(format: string) {
    if (format === RunDataJSON) {
      const data = await this.exportRunJson();
      if (data)
        DG.Utils.download(this.defaultExportFilename('', 'json'), data);
      return;
    }
    DG.Utils.download(this.exportConfig!.filename(format), await this.exportConfig!.export(format));
  }

  private getFormats() {
    return [...(this.exportConfig?.supportedFormats ?? []), RunDataJSON];
  }

  /**
   * Called before saving the FUncCall results to the historical results, returns the saved call. See also {@link saveRun}.
   * @param callToSave FuncCall object to save
   * @returns Saved FuncCall
   * @stability Stable
   */
  public async onBeforeSaveRun(callToSave: DG.FuncCall) { }

  /**
   * Saves the computation results to the historical results, returns the saved call. See also {@link saveRun}.
   * @param savedCall FuncCall object to save
   * @returns Saved FuncCall
   * @stability Stable
   */
  public async onAfterSaveRun(savedCall: DG.FuncCall) { }

  /**
   * Saves the computation results to the historical results, returns the saved call. See also {@link loadRun}.
   * @param callToSave FuncCall object to save
   * @returns Saved FuncCall
   * @stability Stable
   */
  public async saveRun(callToSave: DG.FuncCall): Promise<DG.FuncCall> {
    let callCopy = deepCopy(callToSave);
    await this.onBeforeSaveRun(callCopy);

    if (isIncomplete(callToSave)) {
      // Used to reset 'started' field
      callCopy = await createPartialCopy(callToSave);
    }
    if (callCopy.id) callCopy.newId();

    const savedCall = await historyUtils.saveRun(callCopy);
    const loadedCall = await historyUtils.loadRun(savedCall.id);

    if (this.options.historyEnabled && this.isHistoryEnabled && this.historyBlock)
      this.historyBlock.addRun(loadedCall);
    this.linkFunccall(loadedCall);

    this.isHistorical.next(true);

    await this.onAfterSaveRun(savedCall);
    return savedCall;
  }

  /**
   * Called before deleting the computation results from history, returns its id. See also {@link loadRun}.
   * @param callToDelete FuncCall object to be deleted
   * @stability Stable
   */
  public async onBeforeDeleteRun(callToDelete: DG.FuncCall) { }

  /**
   * Called after deleting the computation results from history, returns its id. See also {@link loadRun}.
   * @param deletedCall deleted FuncCall value
   * @stability Stable
   */
  public async onAfterDeleteRun(deletedCall: DG.FuncCall) { }

  /**
   * Deletes the computation results from history, returns its id. See also {@link loadRun}.
   * @param callToDelete FuncCall object to delete
   * @returns ID of deleted historical run
   * @stability Stable
   */

  public async deleteRun(callToDelete: DG.FuncCall): Promise<string> {
    await this.onBeforeDeleteRun(callToDelete);
    await historyUtils.deleteRun(callToDelete);
    await this.onAfterDeleteRun(callToDelete);
    return callToDelete.id;
  }

  /**
   * Called before fetching the historical run data in {@link loadRun}.
   * @stability Stable
   */
  public async onBeforeLoadRun() {}

  /**
   * Called after fetching the historical run data in {@link loadRun}.
   * @param funcCall FuncCall fetched from server during {@link loadRun}
   * @stability Stable
   */
  public async onAfterLoadRun(funcCall: DG.FuncCall) {}

  /**
   * Loads the specified historical run. See also {@link saveRun}.
   * @param funcCallId ID of FuncCall to look for. Get it using {@see funcCall.id} field
   * @returns FuncCall augemented with inputs' and outputs' values
   * @stability Stable
   */

  public async loadRun(funcCallId: string): Promise<DG.FuncCall> {
    await this.onBeforeLoadRun();
    const pulledRun = await historyUtils.loadRun(funcCallId);
    this.lastCall = deepCopy(pulledRun);
    this.linkFunccall(pulledRun);
    this.isHistorical.next(true);
    await this.onAfterLoadRun(pulledRun);
    return pulledRun;
  }

  /**
   * Called before actual computations are made {@link run}.
   * @param funcToCall FuncCall object to be called {@see DG.FuncCall.call()}
   * @stability Stable
   */
  public async onBeforeRun(funcToCall: DG.FuncCall) {}

  /**
   * Called after actual computations are made {@link run}.
   * @param runFunc FuncCall object after call method {@see DG.FuncCall.call()}
   * @stability Stable
   */
  public async onAfterRun(runFunc: DG.FuncCall) {}

  /**
   * Called to perform actual computations.
   * @stability Stable
   */
  public async run(): Promise<void> {
    if (!this.funcCall) throw new Error('The correspoding function is not specified');

    await this.onBeforeRun(this.funcCall);
    const pi = DG.TaskBarProgressIndicator.create('Calculating...');
    try {
      this.funcCall.newId();
      await this.funcCall.call(); // CAUTION: mutates the funcCall field

      await this.onAfterRun(this.funcCall);

      this.lastCall = deepCopy(this.funcCall);
      // If a view is incapuslated into a tab (e.g. in PipelineView),
      // there is no need to save run till an entire pipeline is over.
      if (!(this.options.isTabbed || this.runningOnInput) && this.isHistoryEnabled)
        await this.saveRun(this.funcCall);
    } catch (err: any) {
      grok.shell.error(err.toString());
    } finally {
      pi.close();
    }
  }

  public async exportRunJson() {
    if (this._lastCall) {
      const data = await fcToSerializable(this._lastCall, this);
      return serialize(data, 0);
    }
  }

  public async importRunJsonDialog(isUpdate = false) {
    const fileInput = new FileInput('JSON file', null, null, 'application/json');
    const showParams = {modal: true, fullScreen: true, width: 500, height: 200, center: true};
    const confirmed = await new Promise((resolve, _reject) => {
      ui.dialog({title: 'Import Run JSON'})
        .add(ui.div([
          ui.inputs([
            fileInput,
          ]),
        ]))
        .onOK(() => resolve(true))
        .onCancel(() => resolve(false))
        .show(showParams);
    });
    if (!confirmed || !fileInput.value)
      return;

    const spec = deserialize(await fileInput.value.text());
    if (!isUpdate)
      await this.executeTest(spec);
    else {
      await this.executeTest(spec, true);
      // TODO: fix isHistorical in pipeline, not to emit before setting lastCall
      await this.isHistorical.pipe(filter((x) => x), take(1), delay(0)).toPromise();
      await this.exportRun(RunDataJSON);
    }
  }

  protected async executeTest(spec: any, updateMode = false) {
    await testFunctionView(spec, this, {updateMode, interactive: true});
  }

  public isHistorical = new BehaviorSubject<boolean>(false);

  protected historyRoot: HTMLDivElement = ui.div();

  public consistencyState = new BehaviorSubject<VIEW_STATE>('consistent');

  /**
    * Default export filename generation method.
    * It automatically replaces all symbols unsupported by Windows filesystem.
    * @param format A format listed in {@link defaultSupportedExportFormats}.
    * @param extOverride Overrides extension defined in {@link defaultSupportedExportExtensions}.
    * @stability Stable
   */
  public defaultExportFilename = (format: string, extOverride?: string) => {
    return `${this.name} - ${new Date().toLocaleString('en-US').replaceAll(/:|\//g, '-')}.${extOverride ?? this.exportConfig!.supportedExtensions[format]}`;
  };

  public defaultSupportedExportExtensions: () => Record<string, string> = () => {
    return {
      'Excel': 'xlsx',
    };
  };

  public defaultSupportedExportFormats = () => {
    return ['Excel'];
  };

  protected get compareCustomizer(): string | null {
    return this.func.options['compareCustomizer'] ?? null;
  }

  protected get comparatorFunc(): string | null {
    return this.func.options['comparatorFunc'] ?? null;
  }

  protected get uploadFunc(): string | null {
    return this.func.options['uploadFunc'] ?? null;
  }

  protected get runningOnInput() {
    return this.func.options['runOnInput'] === 'true';
  }

  protected get runningOnStart() {
    return this.func.options['runOnOpen'] === 'true';
  }

  protected get mainParams(): string[] | null {
    return this.func.options['mainParams'] ? JSON.parse(this.func.options['mainParams']): null;
  }

  protected get mandatoryConsistent() {
    return this.parentCall?.func.options['mandatoryConsistent'] === 'true';
  }

  protected get hasContextHelp() {
    const readmePath = this.func.options['help'] as string | undefined;

    return !!readmePath;
  }

  private helpCache = null as string | null;

  public async getContextHelp() {
    const helpPath = this.func.options['help'];

    if (!helpPath) return null;

    if (this.helpCache) return this.helpCache;

    const packagePath = `System:AppData/${helpPath}`;
    if (await grok.dapi.files.exists(packagePath)) {
      const readme = await grok.dapi.files.readAsText(packagePath);
      this.helpCache = readme;
      return readme;
    }

    const homePath = `${grok.shell.user.name}.home/${helpPath}`;
    if (await grok.dapi.files.exists(homePath)) {
      const readme = await grok.dapi.files.readAsText(homePath);
      this.helpCache = readme;
      return readme;
    }

    return null;
  }

  protected get features(): Record<string, boolean> | string[] {
    return JSON.parse(this.func.options['features'] ?? '{}');
  }

  private getFeature(featureName: string, defaultValue: boolean) {
    if (this.features instanceof Array)
      return this.features.includes(featureName);

    if (this.features instanceof Object)
      return this.features[featureName] ?? defaultValue;

    return defaultValue;
  }

  protected get isExportEnabled() {
    return this.getFeature('export', true);
  }

  protected get isHistoryEnabled() {
    return this.getFeature('history', true);
  }

  protected get isSaEnabled() {
    return this.getFeature('sens-analysis', false);
  }

  protected get hasUploadMode() {
    return this.getFeature('upload', false);
  }

  protected get isFittingEnabled() {
    return this.getFeature('fitting', false);
  }
}
