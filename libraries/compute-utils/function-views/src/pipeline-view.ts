/* eslint-disable valid-jsdoc */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {zipSync, Zippable} from 'fflate';
import {Subject, BehaviorSubject, combineLatest, merge, Observable} from 'rxjs';
import {debounceTime, filter, map, mapTo, startWith, switchMap, tap, withLatestFrom} from 'rxjs/operators';
import $ from 'cash-dom';
import type ExcelJS from 'exceljs';
import {historyUtils} from '../../history-utils';
import {ABILITY_STATE, CARD_VIEW_TYPE, VISIBILITY_STATE, storageName} from '../../shared-utils/consts';
import {RichFunctionView} from './rich-function-view';
import {FunctionView} from './function-view';
import {RunComparisonView} from './run-comparison-view';
import '../css/pipeline-view.css';
import {serialize} from '@datagrok-libraries/utils/src/json-serialization';
import {createPartialCopy, fcToSerializable, getStartedOrNull, isIncomplete} from '../../shared-utils/utils';
import {testPipeline} from '../../shared-utils/function-views-testing';
import {deepCopy} from './shared/utils';

export type StepState = {
  func: DG.Func,
  editor: string,
  view: FunctionView,
  idx: number,
  visibility: BehaviorSubject<VISIBILITY_STATE>,
  ability: BehaviorSubject<ABILITY_STATE>,
  options?: {friendlyName?: string, helpUrl?: string | HTMLElement, customId?: string}
}

type StepConfig = {
  funcName: string,
  friendlyName?: string,
  hiddenOnInit?: VISIBILITY_STATE,
  helpUrl?: string | HTMLElement,
  customId?: string,
}

const getVisibleStepName = (step: StepState) => {
  return step.options?.friendlyName ?? step.func.name;
};

const getStepId = (stepConfig: StepConfig) => stepConfig.customId ?? stepConfig.funcName;

export class PipelineView extends FunctionView {
  public steps = {} as {[stepId: string]: StepState};
  public onStepCompleted = new Subject<DG.FuncCall>();
  public isUpdating = new BehaviorSubject(false);

  private stepTabs!: DG.TabControl;

  // Sets current step of pipeline
  public set currentTabName(name: string) {
    if (this.stepTabs.getPane(name))
      this.stepTabs.currentPane = this.stepTabs.getPane(name);
  }

  /** View instance used by the step with the given id.
   * @param id Step ID. Equals customId property or function's nqName.
   * @returns View instance used in the Pipeline.
   */
  public getStepView<T extends FunctionView = RichFunctionView>(id: string) {
    return this.steps[id]?.view as T;
  }

  public getRunningUpdates(): string[] {
    return [];
  }

  public disableSetters(_state: boolean) {}

  // PipelineView unites several export files into single ZIP file
  protected pipelineViewExportExtensions: () => Record<string, string> = () => {
    return {
      'Archive': 'zip',
      'Single Excel': 'xlsx',
    };
  };

  protected pipelineViewExportFormats = () => {
    return ['Archive', 'Single Excel'];
  };

  protected pipelineViewExport = async (format: string) => {
    if (!this.stepTabs)
      throw new Error('Set step tabs please for export');

    if (format === 'Archive') {
      const zipConfig = {} as Zippable;

      for (
        const step of Object.values(this.steps)
          .filter((step) => step.visibility.value === VISIBILITY_STATE.VISIBLE)
      ) {
        this.stepTabs.currentPane = this.stepTabs.getPane(getVisibleStepName(step));

        await new Promise((r) => setTimeout(r, 100));
        const stepBlob = await step.view.exportConfig!.export('Excel');

        zipConfig[step.view.exportConfig!.filename('Excel')] =
          [new Uint8Array(await stepBlob.arrayBuffer()), {level: 0}];
      };

      return new Blob([zipSync(zipConfig)]);
    }

    if (format === 'Single Excel') {
      await DG.Utils.loadJsCss(['/js/common/exceljs.min.js']);

      //@ts-ignore
      const loadedExcelJS = window.ExcelJS;

      const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      const exportWorkbook = new loadedExcelJS.Workbook() as ExcelJS.Workbook;

      const generateUniqueName = (wb: ExcelJS.Workbook, initialName: string, step: StepState) => {
        let name = `${getVisibleStepName(step)}>${initialName}`;
        if (name.length > 31)
          name = `${name.slice(0, 31)}`;
        let i = 1;
        while (wb.worksheets.some((sheet) => sheet.name === name)) {
          let truncatedName = `${getVisibleStepName(step)}>${initialName}`;
          if (truncatedName.length > (31 - `-${i}`.length))
            truncatedName = `${initialName.slice(0, 31 - `-${i}`.length)}`;
          name = `${truncatedName}-${i}`;
          i++;
        }
        return name;
      };

      for (
        const step of Object.values(this.steps)
          .filter((step) => step.visibility.value === VISIBILITY_STATE.VISIBLE)
      ) {
        const temp = new loadedExcelJS.Workbook() as ExcelJS.Workbook;
        this.stepTabs.currentPane = this.stepTabs.getPane(getVisibleStepName(step));

        await new Promise((r) => setTimeout(r, 100));
        await temp.xlsx.load(await (await step.view.exportConfig!.export('Excel')).arrayBuffer());
        temp.eachSheet((sheet) => {
          const name = generateUniqueName(exportWorkbook, sheet.name, step);
          const t = exportWorkbook.addWorksheet('New sheet');
          t.model = sheet.model;
          t.name = name;
          sheet.getImages().forEach((image) => {
            //@ts-ignore
            const newImageId = exportWorkbook.addImage(temp.getImage(image.imageId));

            t.addImage(newImageId, image.range);
          });
        });
      };

      return new Blob([await exportWorkbook.xlsx.writeBuffer()], {type: BLOB_TYPE});
    }

    throw new Error('This format is not supported');
  };

  exportConfig = {
    supportedExtensions: this.pipelineViewExportExtensions(),
    supportedFormats: this.pipelineViewExportFormats(),
    export: this.pipelineViewExport,
    filename: this.defaultExportFilename,
  };

  constructor(
    funcName: string,
    protected initialConfig: StepConfig[],
    options: {
      historyEnabled: boolean,
      isTabbed: boolean,
      skipInit?: boolean,
    } = {historyEnabled: true, isTabbed: false, skipInit: false},
  ) {
    super(
      funcName,
      options,
    );
  }

  public override async init() {
    await this.loadFuncCallById();

    this.initialConfig.forEach((stepConfig, idx) => {
      //@ts-ignore
      this.steps[getStepId(stepConfig)] = {
        idx,
        visibility: new BehaviorSubject(
          stepConfig.hiddenOnInit ?? VISIBILITY_STATE.VISIBLE,
        ),
        ability: new BehaviorSubject<ABILITY_STATE>(
          this.isHistorical.value || (idx === 0) ? ABILITY_STATE.ENABLED : ABILITY_STATE.DISABLED,
        ),
        options: {friendlyName: stepConfig.friendlyName, helpUrl: stepConfig.helpUrl, customId: stepConfig.customId},
      };
    });

    this.subs.push(
      grok.functions.onAfterRunAction.pipe(
        filter((run) => Object.values(this.steps).some(({view}) => (view?.funcCall?.id === run?.id) && !!run)),
      ).subscribe((run) => {
        this.onStepCompleted.next(run);
        if (run.func.options['isMain'] === 'true' ||
          run.func.nqName === this.initialConfig[this.initialConfig.length-1].funcName) this.run();
      }),
    );

    const stepScripts = this.initialConfig.map(async (config) => {
      const stepScript = await grok.functions.eval(config.funcName);
      return {stepScript, stepId: getStepId(config)};
    });
    const scriptsWithStepId = await Promise.all(stepScripts) as {stepScript: DG.Script, stepId: string}[];
    scriptsWithStepId.forEach((scriptWithStepId) => {
      this.steps[scriptWithStepId.stepId].func = scriptWithStepId.stepScript;
    });
    this.root.classList.remove('ui-panel');

    const editorFuncs = {} as {[editor: string]: DG.Func};

    const EDITOR_TAG = 'editor:' as const;
    const NEWLINE = '\n' as const;
    const DEFAULT_EDITOR = 'Compute:PipelineStepEditor';

    const extractEditor = (script: DG.Script) => {
      const scriptCode = script.script;
      const editorTagIndex = scriptCode.indexOf(EDITOR_TAG);
      if (editorTagIndex < 0)
        return DEFAULT_EDITOR;

      const newlineIndex = scriptCode.indexOf(NEWLINE, editorTagIndex);
      const editorFuncName = scriptCode.substring(editorTagIndex + EDITOR_TAG.length, newlineIndex).trim();

      return editorFuncName;
    };

    const editorsLoading = scriptsWithStepId.map(async (scriptWithId) => {
      // TO DO: replace for type guard
      const editorName = (scriptWithId.stepScript.script) ? extractEditor(scriptWithId.stepScript): DEFAULT_EDITOR;
      if (!editorFuncs[editorName])
        editorFuncs[editorName] = await(grok.functions.eval(editorName.split(' ').join('')) as Promise<DG.Func>);
      this.steps[scriptWithId.stepId].editor = editorName;

      return Promise.resolve();
    });

    await Promise.all(editorsLoading);

    const viewsLoading = scriptsWithStepId.map(async (scriptWithId) => {
      const currentStep = this.steps[scriptWithId.stepId];
      const scriptCall: DG.FuncCall = scriptWithId.stepScript.prepare();
      const editorFunc = editorFuncs[currentStep.editor];

      await this.onBeforeStepFuncCallApply(scriptWithId.stepScript.nqName, scriptCall, editorFunc);
      const view = await editorFunc.apply({'call': scriptCall}) as RichFunctionView;

      const backBtn = ui.button('Back', () => {}, 'Go to the previous step');
      $(backBtn).addClass('ui-btn-nav');

      const nextBtn = ui.button('Next', () => {}, 'Go to the next step');
      $(nextBtn).addClass('ui-btn-nav');

      this.syncNavButtons(currentStep, backBtn, nextBtn);

      view.setNavigationButtons([
        backBtn, nextBtn,
      ]);

      this.steps[scriptWithId.stepId].view = view;

      const step = this.steps[scriptWithId.stepId];

      const disableFollowingTabs = () => {
        Object.values(this.steps).forEach((iteratedStep) => {
          if (
            iteratedStep.idx > step.idx &&
              iteratedStep.visibility.value === VISIBILITY_STATE.VISIBLE &&
              iteratedStep.ability.value === ABILITY_STATE.ENABLED
          )
            iteratedStep.ability.next(ABILITY_STATE.DISABLED);
        });
      };

      const paramUpdates$ = step.view.funcCallReplaced.pipe(
        switchMap(() => {
          const params = [...step.view.funcCall.inputParams.values()];
          const observables = params.map((param) => param.onChanged.pipe(mapTo(param)));
          return merge(...observables);
        }),
      );
      const disableSub = paramUpdates$.subscribe(disableFollowingTabs);
      this.subs.push(disableSub);

      const disableMutationSub = paramUpdates$.pipe(
        filter((param) => param.property.propertyType === DG.TYPE.DATA_FRAME && param.value),
        switchMap((param) => (param.value as DG.DataFrame).onDataChanged),
      ).subscribe(disableFollowingTabs);
      this.subs.push(disableMutationSub);

      const enableSub = grok.functions.onAfterRunAction.pipe(
        filter((run) =>
          step.view.funcCall && run &&
          !!run.id && step.view.funcCall.id === run.id,
        ),
        withLatestFrom(step.visibility, step.ability),
        filter(([, visibility, ability]) =>
          !(visibility === VISIBILITY_STATE.HIDDEN || ability === ABILITY_STATE.DISABLED)),
      ).subscribe(() => {
        const findNextDisabledStep = () => {
          if (Object.values(this.steps)
            .find((iteratedStep) =>
              iteratedStep.idx > step.idx &&
              iteratedStep.visibility.value === VISIBILITY_STATE.VISIBLE &&
              iteratedStep.ability.value === ABILITY_STATE.ENABLED))
            return null;

          return Object.values(this.steps)
            .find((iteratedStep) =>
              iteratedStep.idx > step.idx &&
              iteratedStep.visibility.value === VISIBILITY_STATE.VISIBLE &&
              iteratedStep.ability.value === ABILITY_STATE.DISABLED);
        };

        const stepToEnable = findNextDisabledStep();

        stepToEnable?.ability.next(ABILITY_STATE.ENABLED);
      });
      this.subs.push(enableSub);

      await this.onAfterStepFuncCallApply(scriptWithId.stepScript.nqName, scriptCall, view);

      return view;
    });

    const loadedViews = await Promise.all(viewsLoading);
    const plvHistorySub = combineLatest(loadedViews.map((view) => view.isHistorical))
      .subscribe((isHistoricalArr) => {
        if (isHistoricalArr.some((flag, idx) =>
          !flag &&
          Object.values(this.steps).find((step) => step.idx === idx)?.visibility.value === VISIBILITY_STATE.VISIBLE,
        ) && this.isHistorical.value)
          this.isHistorical.next(false);
      });
    this.subs.push(plvHistorySub);

    const blockedSub = this.isUpdating.subscribe((updating) => {
      for (const step of Object.values(this.steps)) {
        // cannot use instanceof
        const view = step.view as RichFunctionView | undefined;
        if (view?.blockRuns)
          view.blockRuns.next(updating);
      }
    });
    this.subs.push(blockedSub);


    await this.onFuncCallReady();

    this.isReady.next(true);

    this.loadHelp().then(() => {
      this.buildRibbonPanels();

      const restoreHelpState = () => {
        const currentStep = this.findCurrentStep();

        if (currentStep && this.helpFiles[currentStep.func.nqName]) {
          this.getHelpState().then((state) => {
            if (state === 'opened')
              this.showHelpWithDelay(currentStep);
          });
        }
      };

      const helpOpenSub = grok.events.onCurrentViewChanged.pipe(
        filter(() => grok.shell.v == this),
      ).subscribe(restoreHelpState);

      restoreHelpState();

      this.subs.push(helpOpenSub);
    });
  }

  private helpFiles = {} as Record<string, string>;
  private async loadHelp() {
    return Promise.all(Object.values(this.steps).map(async (step) => {
      const helpUrl: string | undefined = step.options?.helpUrl ?? step.func.options['help'];
      if (helpUrl) {
        const currentPackagePath = `System:AppData/${this.func.package.name}/${helpUrl}`;
        const file = (await grok.dapi.files.exists(currentPackagePath)) ?
          await grok.dapi.files.readAsText(currentPackagePath):
          await step.view.getContextHelp();
        if (file) this.helpFiles[step.options?.customId ?? step.func.nqName] = file;
      }
    }));
  }

  private syncNavButtons(currentStep: StepState, backBtn: HTMLButtonElement, nextBtn: HTMLButtonElement) {
    let nextStep: StepState | undefined;
    let prevStep: StepState | undefined;
    nextBtn.addEventListener('click', () => {
      if (nextStep)
        this.currentTabName = getVisibleStepName(nextStep);
    });
    backBtn.addEventListener('click', () => {
      if (prevStep)
        this.currentTabName = getVisibleStepName(prevStep);
    });
    const sub = this.getPipelineStateChanges().pipe(startWith(true), debounceTime(0)).subscribe(() => {
      nextStep = this.getNextStep(currentStep);
      prevStep = this.getPreviousStep(currentStep);
      if (nextStep) {
        $(nextBtn).show();
        if (nextStep.ability.value === ABILITY_STATE.DISABLED)
          $(nextBtn).addClass('d4-disabled');
        if (nextStep.ability.value === ABILITY_STATE.ENABLED)
          $(nextBtn).removeClass('d4-disabled');
      } else
        $(nextBtn).hide();

      if (prevStep) {
        $(backBtn).show();
        if (prevStep.ability.value === ABILITY_STATE.DISABLED)
          $(backBtn).addClass('d4-disabled');
        if (prevStep.ability.value === ABILITY_STATE.ENABLED)
          $(backBtn).removeClass('d4-disabled');
      } else
        $(backBtn).hide();
    });
    this.subs.push(sub);
  }

  private getPreviousStep(currentStep: StepState) {
    return Object.values(this.steps)
      .slice().reverse()
      .find((step) =>
        step.idx < currentStep.idx &&
        step.visibility.value === VISIBILITY_STATE.VISIBLE,
      );
  }

  private getNextStep(currentStep: StepState) {
    return Object.values(this.steps)
      .find((step) =>
        step.idx > currentStep.idx &&
        step.visibility.value === VISIBILITY_STATE.VISIBLE,
      );
  }

  private getPipelineStateChanges() {
    const observables = Object.values(this.steps).flatMap((step) => [step.ability, step.visibility]);
    return merge(...observables).pipe(mapTo(true));
  }

  public override async onComparisonLaunch(funcCalls: DG.FuncCall[]) {
    const parentCall = grok.shell.v.parentCall;

    const childFuncCalls = await Promise.all(
      funcCalls.map((funcCall) => historyUtils.loadChildRuns(funcCall.id)),
    );

    // Main child function should habe `meta.isMain: true` tag or the last function is used
    const fullMainChildFuncCalls = await Promise.all(childFuncCalls
      .map(
        (res) => res.childRuns.find(
          (childRun) => childRun.func.options['isMain'] === 'true',
        ) ??
        res.childRuns.find(
          (childRun) => childRun.func.nqName ===
            this.initialConfig[this.initialConfig.length - 1].funcName,
        )!,
      )
      .map((mainChildRun) => historyUtils.loadRun(mainChildRun.id)));

    const cardView = [...grok.shell.views].find((view) => view.type === CARD_VIEW_TYPE);
    const v = await RunComparisonView.fromComparedRuns(fullMainChildFuncCalls, fullMainChildFuncCalls[0].func, {
      parentView: cardView,
      parentCall,
    });
    grok.shell.addView(v);
  }

  protected async onBeforeStepFuncCallApply(nqName: string, scriptCall: DG.FuncCall, editorFunc: DG.Func) {
  }

  protected async onAfterStepFuncCallApply(nqName: string, scriptCall: DG.FuncCall, view: FunctionView) {
  }

  public override buildIO() {
    const tabs = Object.values(this.steps)
      .reduce((prev, step) => ({
        ...prev,
        [getVisibleStepName(step)]: step.view.root,
      }), {} as Record<string, HTMLElement>);

    const pipelineTabs = ui.tabControl(tabs);

    const consistencySubs = Object.values(this.steps)
      .map((step) => {
        const consistencyStateIcon = ui.iconFA('exclamation-circle', null, 'This step has inconsistent inputs');
        $(consistencyStateIcon).css({
          'color': 'var(--orange-2)',
          'margin-left': '3px',
          'padding-top': '1px',
        });
        pipelineTabs.getPane(getVisibleStepName(step)).header.appendChild(consistencyStateIcon);

        return step.view.consistencyState.subscribe((state) => {
          if (state === 'consistent') $(consistencyStateIcon).hide();
          if (state === 'inconsistent') $(consistencyStateIcon).show();
        });
      });
    this.subs.push(...consistencySubs);

    const consistencyStates = Object.values(this.steps).map((step) => step.view.consistencyState);
    const plvConsistencySub =
      merge(...consistencyStates)
        .subscribe(() => {
          if (consistencyStates.map((state) => state.value).some((v) => v === 'inconsistent'))
            this.consistencyState.next('inconsistent');
          else
            this.consistencyState.next('consistent');
        });

    this.subs.push(plvConsistencySub);

    const tabsLine = pipelineTabs.panes[0].header.parentElement!;
    tabsLine.classList.add('d4-ribbon', 'pipeline-view');
    tabsLine.classList.remove('d4-tab-header-stripe');
    tabsLine.firstChild!.remove();
    for (let i = 0; i < pipelineTabs.panes.length; i++) {
      pipelineTabs.panes[i].header.classList.add('d4-ribbon-name');
      pipelineTabs.panes[i].header.classList.remove('d4-tab-header');
    }
    pipelineTabs.panes[0].header.style.marginLeft = '12px';

    pipelineTabs.root.style.height = '100%';
    pipelineTabs.root.style.width = '100%';

    this.stepTabs = pipelineTabs;

    this.initialConfig.forEach((stepConfig) => {
      const stepId = getStepId(stepConfig);
      this.subs.push(
        this.steps[stepId].visibility.subscribe((newValue) => {
          if (newValue === VISIBILITY_STATE.VISIBLE) {
            $(this.stepTabs.getPane(
              getVisibleStepName(this.steps[stepId]),
            ).header).css('display', 'inherit');
          }

          if (newValue === VISIBILITY_STATE.HIDDEN) {
            $(this.stepTabs.getPane(
              getVisibleStepName(this.steps[stepId]),
            ).header).hide();
          }
        }),
      );
    });

    Object.values(this.steps).forEach((step) => {
      this.subs.push(
        step.ability.subscribe((newState) => {
          if (newState === ABILITY_STATE.ENABLED)
            $(this.stepTabs.getPane(getVisibleStepName(step)).header).removeClass('d4-disabled');
          if (newState === ABILITY_STATE.DISABLED)
            $(this.stepTabs.getPane(getVisibleStepName(step)).header).addClass('d4-disabled');
        }),
      );
    });

    this.hideSteps(
      ...this.initialConfig
        .filter((config) => config.hiddenOnInit === VISIBILITY_STATE.HIDDEN)
        .map((config) => config.funcName),
    );

    return pipelineTabs.root;
  }

  private async showHelpWithDelay(currentStep: StepState) {
    grok.shell.windows.help.visible = true;
    // Workaround to deal with help panel bug
    await new Promise((resolve) => setTimeout(resolve, 100));
    grok.shell.windows.help.showHelp(ui.markdown(this.helpFiles[currentStep.func.nqName]));
  }

  private findCurrentStep() {
    return Object.values(this.steps)
      .find((step) => getVisibleStepName(step) === this.stepTabs.currentPane.name);
  }

  public override buildHistoryBlock(): HTMLElement {
    const hb = super.buildHistoryBlock();

    const deletionSub = this.historyBlock!.afterRunDeleted.subscribe(async (deletedCall) => {
      const childRuns = await grok.dapi.functions.calls.allPackageVersions()
        .filter(`options.parentCallId="${deletedCall.id}"`).list();

      childRuns.map(async (childRun) => historyUtils.deleteRun(childRun));
    });
    this.subs.push(deletionSub);

    return hb;
  }

  private async getHelpState(): Promise<'closed' | 'opened'> {
    const storedValue = await grok.dapi.userDataStorage.getValue(storageName, `${this.func.name}_help_state`);
    return storedValue === 'closed' ? 'closed' : 'opened';
  }

  private async saveHelpState(state: 'closed' | 'opened') {
    return grok.dapi.userDataStorage.postValue(storageName, `${this.func.name}_help_state`, state);
  }

  public override buildRibbonPanels(): HTMLElement[][] {
    const infoIcon = ui.iconFA('info', async () => {
      const currentStep = this.findCurrentStep();

      if (currentStep && this.helpFiles[currentStep.func.nqName]) {
        await this.showHelpWithDelay(currentStep);
        this.saveHelpState('opened');
      }
    });

    const updateInfoIconAndRibbons = () => {
      const currentStep = this.findCurrentStep();

      const newRibbonPanels = [
        [
          ...super.buildRibbonPanels().flat(),
          ...currentStep && this.steps[
            currentStep.options?.customId ?? currentStep.func.nqName
          ].options?.helpUrl ? [infoIcon]: [],
        ],
        ...currentStep ? currentStep.view.buildRibbonPanels(): [],
      ];

      this.setRibbonPanels(newRibbonPanels);

      if (currentStep && this.helpFiles[currentStep.func.nqName]) {
        if (grok.shell.windows.help.visible)
          this.showHelpWithDelay(currentStep);
      }

      return newRibbonPanels;
    };

    if (!this.isReady.value) {
      const tabSub = this.stepTabs.onTabChanged.subscribe(updateInfoIconAndRibbons);
      const helpSub = grok.events.onEvent('grok-panels-changed')
        .pipe(filter(() => grok.shell.v === this))
        .subscribe(async () => {
          const savedState = await this.getHelpState();
          if (grok.shell.windows.help.visible && savedState === 'closed') {
            this.saveHelpState('opened');
            return;
          }

          if (!grok.shell.windows.help.visible && savedState === 'opened') {
            const info = ui.iconFA('info');
            $(info).css('margin', '0px 3px');
            grok.shell.info(ui.span([
              `You can open help panel by clicking the`,
              info,
              `button on the ribbon menu`,
            ]));

            this.saveHelpState('closed');
            return;
          }
        });
      this.subs.push(tabSub, helpSub);
    }

    const newRibbonPanels = updateInfoIconAndRibbons();

    return newRibbonPanels;
  }

  public override async saveRun(callToSave: DG.FuncCall): Promise<DG.FuncCall> {
    let callCopy = deepCopy(callToSave);
    await this.onBeforeSaveRun(callCopy);

    if (isIncomplete(callToSave)) {
      // Used to reset 'started' field
      callCopy = await createPartialCopy(callToSave);
    }
    if (callCopy.id) callCopy.newId();

    const stepsSaving = Object.values(this.steps)
      .filter((step) => step.visibility.value === VISIBILITY_STATE.VISIBLE)
      .map(async (step) => {
        const scriptCall = step.view.funcCall;

        scriptCall.options['parentCallId'] = callCopy.id;
        if (step.options?.customId) scriptCall.options['customId'] = step.options?.customId;

        await step.view.saveRun(scriptCall);

        return Promise.resolve();
      });

    await Promise.all(stepsSaving);

    if (callCopy.options['title'])
      callCopy.options['title'] = `${callCopy.options['title']} (copy)`;

    const savedCall = await historyUtils.saveRun(callCopy);
    const loadedCall = await historyUtils.loadRun(savedCall.id);

    if (this.options.historyEnabled && this.isHistoryEnabled && this.historyBlock)
      this.historyBlock.addRun(await historyUtils.loadRun(savedCall.id));

    this.linkFunccall(loadedCall);

    this.isHistorical.next(true);

    await this.onAfterSaveRun(callCopy);

    return savedCall;
  }

  /**
   * Overrided to use {@link loadChildRuns} during run load.
   * This implementation takes "parentCallId" and looks for the funcCalls with options.parentCallId = parentCallId.
   * Each child run is related to the particular pipeline step.
   * @param funcCallId ID of the parent FuncCall
   * @returns Parent FuncCall
   */
  public async loadRun(funcCallId: string): Promise<DG.FuncCall> {
    const {parentRun: pulledParentRun, childRuns: pulledChildRuns} = await historyUtils.loadChildRuns(funcCallId);

    const stepIdxBeforeLoad = Object.values(this.steps)
      .filter((step) => step.visibility.value === VISIBILITY_STATE.VISIBLE)
      .findIndex((step) => getVisibleStepName(step) === this.stepTabs.currentPane.name);

    await this.onBeforeLoadRun();

    for (const step of Object.values(this.steps)) {
      const corrChildRuns = pulledChildRuns.filter((pulledChildRun) =>
        pulledChildRun.func.nqName === step.func.nqName);

      if (corrChildRuns.length === 0) {
        step.visibility.next(VISIBILITY_STATE.HIDDEN);
        step.ability.next(ABILITY_STATE.DISABLED);
      }

      if (corrChildRuns.length === 1) {
        await step.view.loadRun(corrChildRuns[0].id);
        step.visibility.next(VISIBILITY_STATE.VISIBLE);
        if (!isIncomplete(corrChildRuns[0]))
          step.ability.next(ABILITY_STATE.ENABLED);
        else
          step.ability.next(ABILITY_STATE.DISABLED);
      }

      if (corrChildRuns.length > 1) {
        const foundByCustomId = corrChildRuns.find((run) => run.options['customId'] === step.options?.customId)!;
        await step.view.loadRun(foundByCustomId.id);
        step.visibility.next(VISIBILITY_STATE.VISIBLE);
        if (!isIncomplete(foundByCustomId))
          step.ability.next(ABILITY_STATE.ENABLED);
        else
          step.ability.next(ABILITY_STATE.DISABLED);
      }
    };

    const firstDisabledStep = Object.values(this.steps)
      .find((step) => step.ability.value === ABILITY_STATE.DISABLED &&
      step.visibility.value === VISIBILITY_STATE.VISIBLE);
    const stepToEnable = firstDisabledStep ?? Object.values(this.steps)[0];

    stepToEnable.ability.next(ABILITY_STATE.ENABLED);

    if (firstDisabledStep) {
      let stepToDisable = this.getNextStep(firstDisabledStep);
      while (stepToDisable) {
        stepToDisable.ability.next(ABILITY_STATE.DISABLED);
        stepToDisable = this.getNextStep(stepToDisable);
      }
    }

    this.lastCall = pulledParentRun;
    this.linkFunccall(pulledParentRun);
    this.isHistorical.next(true);

    const stepToShow = Object.values(this.steps)
      .filter((step) => step.visibility.value == VISIBILITY_STATE.VISIBLE).at(stepIdxBeforeLoad);

    if (stepToShow && stepToShow.ability.value === ABILITY_STATE.ENABLED)
      this.currentTabName = getVisibleStepName(stepToShow);
    else
      this.currentTabName = getVisibleStepName(stepToEnable);


    await this.onAfterLoadRun(pulledParentRun);

    return pulledParentRun;
  }

  public async hideSteps(...stepIds: string[]) {
    stepIds.forEach((stepId) => {
      this.steps[stepId].visibility.next(VISIBILITY_STATE.HIDDEN);
    });
  }

  public async showSteps(...stepIds: string[]) {
    stepIds.forEach((stepId) => {
      this.steps[stepId].visibility.next(VISIBILITY_STATE.VISIBLE);
    });
  }

  public override async exportRunJson() {
    if (this._lastCall) {
      const res: any = {
        isPipeline: true,
      };
      for (const [stepId, step] of Object.entries(this.steps)) {
        const lastCall = step.view.lastCall;
        if (lastCall)
          res[stepId] = await fcToSerializable(lastCall, step.view);
      }
      const data = serialize(res, 0);
      return data;
    }
  }

  public override async executeTest(spec: any, updateMode = false) {
    await testPipeline(spec, this, {updateMode, interactive: true});
  }

  public getStepViewRuns<T extends FunctionView>(name: string): Observable<T> {
    return this.onStepCompleted.pipe(
      filter((funcCall) => funcCall.func.nqName === name),
      map(() => this.getStepView<T>(name)),
    );
  }
}
