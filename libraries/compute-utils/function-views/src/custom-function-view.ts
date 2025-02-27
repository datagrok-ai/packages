import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject} from 'rxjs';
import {deepCopy} from '../../shared-utils/utils';
import {historyUtils} from '../../history-utils';

declare global {
  var initialURLHandled: boolean;
}

export abstract class CustomFunctionView extends DG.ViewBase {
  public showHistory = new BehaviorSubject(false);
  public isReady = new BehaviorSubject(false);

  public historyRoot = ui.div('', {style: {height: '100%', width: '100%'}});

  public funcCall?: DG.FuncCall;

  constructor(public funcNqName: string) {
    super();
    this.box = true;
    this.init();
  }

  // mandatory
  public abstract buildIO(): HTMLElement; // returns view content
  public abstract onAfterLoadRun(funcCall: DG.FuncCall): Promise<void>; // replacing funccall

  // optional hooks
  public async onBeforeSaveRun(callToSave: DG.FuncCall) { }
  public async onAfterSaveRun(savedCall: DG.FuncCall) { }

  exportConfig: {
    export: ((format: string) => Promise<Blob>);
    filename: ((format: string) => string);
    supportedFormats: string[];
    supportedExtensions: Record<string, string>;
  } | null = null;

  getMocks: ({mockName: string, action: () => Promise<void>}[]) | null = null;

  getTemplates: ({name: string, action: () => Promise<void>}[]) | null = null;

  getHelp: (() => Promise<void>) | null = null;

  reportBug: (() => Promise<void>) | null = null;

  requestFeature: (() => Promise<void>) | null = null;

  public async init() {
    const startId = this.getStartId();
    if (startId) {
      this.setAsLoaded();
      const pulledRun = await historyUtils.loadRun(startId);
      this.linkFunccall(pulledRun);
      await this.onFuncCallReady();
      await this.onAfterLoadRun(pulledRun);
    } else {
      const func = DG.Func.byName(this.funcNqName);
      this.linkFunccall(func.prepare({}));
      await this.onFuncCallReady();
    }
    this.isReady.next(true);
  }

  public linkFunccall(funcCall: DG.FuncCall) {
    this.funcCall = funcCall;
    this.path = funcCall.author ? `?id=${funcCall.id}` : '?';
    const modelName = funcCall?.func?.friendlyName ?? funcCall?.func?.name;
    this.name = modelName;
  }

  public async onFuncCallReady() {
    await this.getPackageData();
    this.build();
  }

  public async saveRun(callToSave: DG.FuncCall): Promise<DG.FuncCall> {
    const callCopy = deepCopy(callToSave);
    await this.onBeforeSaveRun(callCopy);

    if (callCopy.id) callCopy.newId();

    const savedCall = await historyUtils.saveRun(callCopy);
    const loadedCall = await historyUtils.loadRun(savedCall.id);

    this.linkFunccall(loadedCall);

    await this.onAfterSaveRun(savedCall);
    return savedCall;
  }

  public async loadRun(funcCallId: string): Promise<DG.FuncCall> {
    const pulledRun = await historyUtils.loadRun(funcCallId);

    this.linkFunccall(pulledRun);

    await this.onAfterLoadRun(pulledRun);
    return pulledRun;
  }

  public build(): void {
    ui.empty(this.root);
    const rootItem = ui.div([
      this.buildIO(),
      this.historyRoot,
    ], {style: {width: '100%', height: '100%', display: 'flex'}});
    this.root.appendChild(rootItem);

    this.buildRibbonMenu();
    this.buildRibbonPanels();
  }

  public buildRibbonPanels(): HTMLElement[][] {
    const historyButton = ui.iconFA('history', () => this.showHistory.next(!this.showHistory.value));
    const saveButton = ui.iconFA('save', () => this.funcCall ? this.saveRun(this.funcCall) : undefined);
    const exportBtn = ui.comboPopup(
      ui.iconFA('arrow-to-bottom'),
      this.getFormats(),
      this.exportRun.bind(this),
    );
    const newRibbonPanels: HTMLElement[][] = [[historyButton, saveButton, ...(this.hasExport() ? [exportBtn] : [] )]];
    this.setRibbonPanels(newRibbonPanels);
    return newRibbonPanels;
  }

  public buildRibbonMenu() {
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

    if (this.hasExport()) {
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
  }

  public async exportRun(format: string) {
    DG.Utils.download(this.exportConfig!.filename(format), await this.exportConfig!.export(format));
  }

  private getFormats() {
    return (this.exportConfig?.supportedFormats ?? []);
  }

  private hasExport() {
    return this.exportConfig && this.exportConfig.supportedFormats.length > 0;
  }

  private async getPackageData() {
    const pack = this.func?.package;
    if (!pack)
      return;

    const reportBugUrl = (await pack?.getProperties() as any)?.REPORT_BUG_URL;
    if (reportBugUrl && !this.reportBug)
      this.reportBug = async () => {window.open(reportBugUrl, '_blank');};

    const reqFeatureUrl = (await pack?.getProperties() as any)?.REQUEST_FEATURE_URL;
    if (reqFeatureUrl && !this.requestFeature)
      this.requestFeature = async () => {window.open(reqFeatureUrl, '_blank');};
  }

  private getStartId(): string | null {
    const startUrl = new URL(grok.shell.startUri);
    return !globalThis.initialURLHandled ? startUrl.searchParams.get('id'): null;
  }

  private setAsLoaded(): void {
    globalThis.initialURLHandled = true;
  }

  get func() {
    return this.funcCall?.func;
  }
}
