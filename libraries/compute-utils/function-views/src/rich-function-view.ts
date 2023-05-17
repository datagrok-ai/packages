/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import wu from 'wu';
import $ from 'cash-dom';
import {Subject, BehaviorSubject} from 'rxjs';
import {UiUtils} from '../../shared-components';
import {FunctionView} from './function-view';
import '../css/rich-function-view.css';
import {FileInput} from '../../shared-components/src/file-input';
import {startWith} from 'rxjs/operators';
import {DIRECTION, EXPERIMENTAL_TAG, VIEWER_PATH, viewerTypesMapping} from './shared/consts';
import {boundImportFunction, getDataFrame, getPropViewers} from './shared/utils';

const FILE_INPUT_TYPE = 'file';

export interface AfterInputRenderPayload {
  prop: DG.Property;
  input: DG.InputBase | FileInput;
}

export interface AfterOutputRenderPayload {
  prop: DG.Property;
  output: DG.Viewer;
}

export class RichFunctionView extends FunctionView {
  // emitted when runButton disability should be checked
  private checkDisability = new Subject();

  // stores the running state
  private isRunning = false;

  // stores simulation or upload mode flag
  private isUploadMode = new BehaviorSubject<boolean>(false);

  private controllsDiv?: HTMLElement;

  static fromFuncCall(
    funcCall: DG.FuncCall,
    options: {historyEnabled: boolean, isTabbed: boolean} =
    {historyEnabled: true, isTabbed: false},
  ) {
    return new this(funcCall, options);
  }

  constructor(
    initValue: string | DG.FuncCall,
    public options: { historyEnabled: boolean, isTabbed: boolean} =
    {historyEnabled: true, isTabbed: false},
  ) {
    super(initValue, options);
  }

  protected async onFuncCallReady() {
    await super.onFuncCallReady();
    this.basePath = `scripts/${this.funcCall.func.id}/view`;

    if (this.runningOnStart) await this.doRun();
  }

  /**
   * Showing UI after completion of function call.
   * @param runFunc
   */
  public override onAfterRun(runFunc: DG.FuncCall): Promise<void> {
    const firstOutputTab = this.outputsTabsElem.panes.find((tab) => tab.name !== 'Input');
    if (firstOutputTab) this.outputsTabsElem.currentPane = firstOutputTab;

    return Promise.resolve();
  }

  // scripting api events
  public beforeInputPropertyRender = new Subject<DG.Property>();
  public afterInputPropertyRender = new Subject<AfterInputRenderPayload>();
  public beforeRenderControlls = new Subject<true>();
  public afterOutputPropertyRender = new Subject<AfterOutputRenderPayload>();
  public afterOutputSacalarTableRender = new Subject<HTMLElement>();

  /*
   * Will work only if called synchronously inside
   * beforeRenderControlls subscriber.
   * TODO: remove this limitation
   */
  public replaceControlls(div: HTMLElement) {
    this.controllsDiv = div;
  }

  public getRunButton(name = 'Run') {
    const runButton = ui.bigButton(name, async () => await this.doRun());
    const disabilitySub = this.checkDisability.subscribe(() => {
      const isValid = this.isRunnable();
      runButton.disabled = !isValid;
    });
    this.subs.push(disabilitySub);
    return runButton;
  }

  /**
   * RichFunctionView has adavanced automatic UI builder. It takes {@link this.funcCall} as a base and constructs flexible view.
   * This view is updated automatically when {@link this.funcCallReplaced} is emitted or any of input/output param changes.
   * @returns HTMLElement attached to the root of the view
   */
  public buildIO(): HTMLElement {
    const inputBlock = this.buildInputBlock();

    ui.tools.handleResize(inputBlock, (width) => {
      if (width < 350) {
        $(this.formTabsElem.getPane('Output').content).addClass('ui-form-condensed');
        $(this.formTabsElem.getPane('Input').content).addClass('ui-form-condensed');
      } else {
        $(this.formTabsElem.getPane('Output').content).removeClass('ui-form-condensed');
        $(this.formTabsElem.getPane('Input').content).removeClass('ui-form-condensed');
      }
    });

    const outputBlock = this.buildOutputBlock();
    outputBlock.style.height = '100%';
    outputBlock.style.width = '100%';
    this.outputsTabsElem.root.style.display = 'none';

    if (!!this.outputsTabsElem.getPane('Input')) {
      this.outputsTabsElem.panes.forEach((tab) => {
        tab.header.style.display = 'none';
      });
    }

    const out = ui.splitH([inputBlock, ui.panel([outputBlock], {style: {'padding-top': '0px'}})], null, true);
    out.style.padding = '0 12px';

    inputBlock.style.maxWidth = '450px';

    return out;
  }

  public buildInputBlock(): HTMLElement {
    const inputFormDiv = this.renderInputForm();
    const outputFormDiv = this.renderOutputForm();

    this.formTabsElem = ui.tabControl({
      'Input': inputFormDiv,
      'Output': outputFormDiv,
    });

    $(this.formTabsElem.root).removeClass('ui-box');
    $(this.formTabsElem.root).css('flex-grow', 0);

    $(this.formTabsElem.getPane('Output').header).hide();
    $(this.formTabsElem.getPane('Input').header).hide();

    this.controllsDiv = undefined;
    this.beforeRenderControlls.next(true);
    if (!this.controllsDiv) {
      const runButton = this.getRunButton();
      const runButtonWrapper = ui.div([runButton]);
      const saveButton = ui.bigButton('Save', () => this.saveExperimentalRun(this.funcCall), 'Save uploaded data');
      $(saveButton).hide();

      this.isUploadMode.subscribe((newValue) => {
        if (newValue) {
          $(saveButton).show();
          $(runButton).hide();
        } else {
          $(saveButton).hide();
          $(runButton).show();
        }

        this.buildRibbonPanels();
      });

      ui.tooltip.bind(runButtonWrapper, () => runButton.disabled ? (this.isRunning ? 'Computations are in progress' : 'Some inputs are invalid') : '');
      this.controllsDiv = ui.buttonsInput([
        saveButton,
        runButtonWrapper as any,
      ]);
      $(this.controllsDiv.children.item(1)).css('gap', '0px');
      this.controllsDiv.style.position = 'sticky';
    }

    const controlsWrapper = ui.div(this.controllsDiv, 'ui-form');
    $(controlsWrapper).css('padding', '0px');

    return ui.divV([
      this.formTabsElem.root,
      ...this.runningOnInput ? []: [controlsWrapper],
    ], 'ui-box');
  }

  buildRibbonPanels(): HTMLElement[][] {
    super.buildRibbonPanels();

    const play = ui.iconFA('play', async () => await this.doRun(), 'Run computations');
    play.classList.add('fas');

    const save = ui.iconFA('save', async () => {
      if (this.isUploadMode.value) {
        await this.saveExperimentalRun(this.funcCall);
        return;
      }

      if (this.lastCall)
        await this.saveRun(this.lastCall);
      else
        grok.shell.warning('Function was not called. Call it before saving');
    }, this.isUploadMode.value ? 'Save uploaded data': 'Save the last run');

    const toggleUploadMode = ui.iconFA('arrow-to-top', async () => {
      this.isUploadMode.next(!this.isUploadMode.value);

      if (boundImportFunction(this.func)) {
        const func = await grok.functions.eval(boundImportFunction(this.func)!) as DG.Func;
        func.prepare().edit();
        return;
      }

      toggleUploadMode.classList.toggle('d4-current');
      if (this.isUploadMode.value) {
        $(this.formTabsElem.getPane('Input').header).show();
        $(this.formTabsElem.getPane('Output').header).show();
      } else {
        this.formTabsElem.currentPane = this.formTabsElem.getPane('Input');
        $(this.formTabsElem.getPane('Input').header).hide();
        $(this.formTabsElem.getPane('Output').header).hide();
      }
    }, 'Upload experimental data');
    toggleUploadMode.classList.add(
      'd4-toggle-button',
      ...this.isUploadMode.value ? ['d4-current']: [],
    );

    const newRibbonPanels = [
      ...this.getRibbonPanels(),
      [
        ...this.runningOnInput || this.options.isTabbed ? []: [play],
        ...(this.hasUploadMode && this.isUploadMode.value) ? [save] : [],
        ...this.hasUploadMode ? [toggleUploadMode]: [],
      ],
    ];

    this.setRibbonPanels(newRibbonPanels);
    return newRibbonPanels;
  }

  // Main element of the output block. Stores all the tabs for the output and input
  private outputsTabsElem = ui.tabControl();
  // Main element of the input block. Stores the forms for inputs and outputs
  private formTabsElem = ui.tabControl();

  public buildOutputBlock(): HTMLElement {
    this.outputsTabsElem.root.style.width = '100%';

    this.tabsLabels.forEach((tabLabel) => {
      const tabDfProps = this.categoryToParamMap[tabLabel].filter((p) => p.propertyType === DG.TYPE.DATA_FRAME);
      const tabScalarProps = this.categoryToParamMap[tabLabel].filter((p) => p.propertyType !== DG.TYPE.DATA_FRAME);

      const parsedTabDfProps = tabDfProps.map((dfProp) => getPropViewers(dfProp).config);

      const dfBlocks = tabDfProps.reduce((acc, dfProp, dfIndex) => {
        const promisedViewers: Promise<DG.Viewer>[] = parsedTabDfProps[dfIndex].map(async (viewerDesc: {[key: string]: string | boolean}) => {
          const initialValue: DG.DataFrame = this.funcCall.outputs[dfProp.name]?.value ?? this.funcCall.inputParams[dfProp.name]?.value ?? grok.data.demo.demog(1);

          const viewerType = viewerDesc['type'] as string;
          const viewer = Object.values(viewerTypesMapping).includes(viewerType) ? DG.Viewer.fromType(viewerType, initialValue): await initialValue.plot.fromType(viewerType) as DG.Viewer;
          viewer.setOptions(viewerDesc);

          if (this.dfToViewerMapping[dfProp.name]) this.dfToViewerMapping[dfProp.name].push(viewer); else this.dfToViewerMapping[dfProp.name] = [viewer];

          this.afterOutputPropertyRender.next({prop: dfProp, output: viewer});

          return viewer;
        });

        const reactiveViewers = promisedViewers.map((promisedViewer) => promisedViewer.then((loadedViewer) => {
          const subscribeOnFcChanges = () => {
            const currentParam: DG.FuncCallParam = this.funcCall.outputParams[dfProp.name] ?? this.funcCall.inputParams[dfProp.name];

            const paramSub = currentParam.onChanged.subscribe(async () => {
              $(this.outputsTabsElem.root).show();
              $(this.outputsTabsElem.getPane(tabLabel).header).show();

              if (Object.values(viewerTypesMapping).includes(loadedViewer.type))
                loadedViewer.dataFrame = currentParam.value;
              else {
                // User-defined viewers (e.g. OutliersSelectionViewer) could created only asynchronously
                const newViewer = await currentParam.value.plot.fromType(loadedViewer.type) as DG.Viewer;
                loadedViewer.root.replaceWith(newViewer.root);
                loadedViewer = newViewer;
              }
              this.afterOutputPropertyRender.next({prop: dfProp, output: loadedViewer});
            });

            this.subs.push(paramSub);
          };

          subscribeOnFcChanges();
          this.subs.push(
            this.funcCallReplaced.subscribe(subscribeOnFcChanges),
          );

          return loadedViewer;
        }));

        const dfBlockTitle: string = dfProp.options['caption'] ?? dfProp.name;

        if (tabLabel === 'Input') {
          const subscribeOnFcChanges = () => {
            const currentParam: DG.FuncCallParam = this.funcCall!.outputParams[dfProp.name] ?? this.funcCall!.inputParams[dfProp.name];

            const paramSub = currentParam.onChanged.subscribe(() => {
              $(this.outputsTabsElem.root).show();
              $(this.outputsTabsElem.getPane('Input').header).show();
            });

            this.subs.push(paramSub);
          };

          subscribeOnFcChanges();
          this.subs.push(
            this.funcCallReplaced.subscribe(subscribeOnFcChanges),
          );
        }

        const wrappedViewers = reactiveViewers.map((promisedViewer, viewerIndex) => {
          const blockWidth: string | boolean | undefined = parsedTabDfProps[dfIndex][viewerIndex]['block'];
          const viewerRoot = ui.wait(async () => (await promisedViewer).root);
          $(viewerRoot).css({
            'min-height': '300px',
            'flex-grow': '1',
          });

          return ui.divV([
            ...viewerIndex === 0 ? [ui.h2(dfBlockTitle)] : [ui.h2(' ', {style: {'white-space': 'pre'}})],
            viewerRoot,
          ], {style: {...blockWidth ? {
            'width': `${blockWidth}%`,
            'max-width': `${blockWidth}%`,
          } : {
            'flex-grow': '1',
          }}});
        });

        acc.append(...wrappedViewers);

        return acc;
      }, ui.divH([], {'style': {'flex-wrap': 'wrap', 'flex-grow': '1'}}));

      const generateScalarsTable = () => {
        const table = DG.HtmlTable.create(
          tabScalarProps,
          (scalarProp: DG.Property) =>
            [scalarProp.caption ?? scalarProp.name, this.funcCall.outputs[scalarProp.name], scalarProp.options['units']],
        ).root;
        $(table).css({
          'max-width': '400px',
        });
        this.afterOutputSacalarTableRender.next(table);
        return table;
      };

      let scalarsTable = generateScalarsTable();

      tabScalarProps.forEach((tabScalarProp) => {
        const subscribeOnFcChanges = () => {
          const paramSub = (this.funcCall!.outputParams[tabScalarProp.name] as DG.FuncCallParam).onChanged.subscribe(() => {
            const newScalarsTable = generateScalarsTable();
            scalarsTable.replaceWith(newScalarsTable);
            scalarsTable = newScalarsTable;
          });

          this.subs.push(paramSub);
        };

        subscribeOnFcChanges();
        this.subs.push(
          this.funcCallReplaced.subscribe(subscribeOnFcChanges),
        );
      });

      this.outputsTabsElem.addPane(tabLabel, () => {
        return ui.divV([...tabDfProps.length ? [dfBlocks]: [], ...tabScalarProps.length ? [ui.h2('Scalar values'), scalarsTable]: []]);
      });
    });

    const outputBlock = ui.box();
    outputBlock.append(this.outputsTabsElem.root);

    return outputBlock;
  }

  public async onAfterLoadRun(loadedRun: DG.FuncCall) {
    wu(this.funcCall.outputParams.values() as DG.FuncCallParam[]).forEach((out) => {
      this.funcCall.setParamValue(out.name, loadedRun.outputs[out.name]);
    });

    wu(this.funcCall.inputParams.values() as DG.FuncCallParam[]).forEach((inp) => {
      this.funcCall.setParamValue(inp.name, loadedRun.inputs[inp.name]);
    });

    this.outputsTabsElem.root.style.removeProperty('display');
    this.outputsTabsElem.panes.forEach((tab) => {
      tab.header.style.removeProperty('display');
    });
  }

  // Stores mapping between DF and its' viewers
  private dfToViewerMapping: {[key: string]: DG.Viewer[]} = {};

  protected get isInputPanelRequired() {
    return this.func?.inputs.some((p) => p.propertyType == DG.TYPE.DATA_FRAME && p.options['viewer'] != null) || false;
  }

  protected get tabsLabels() {
    return Object.keys(this.categoryToParamMap);
  }

  protected get categoryToParamMap() {
    const map = {} as Record<string, DG.Property[]>;

    if (this.isInputPanelRequired) {
      this.func!.inputs.
        filter((p) => p.propertyType == DG.TYPE.DATA_FRAME && p.options['viewer'] != null).
        forEach((p) => map['Input'] ? map['Input'].push(p): map['Input'] = [p]);
    }

    this.func!.outputs.forEach((p) => {
      const category = p.category === 'Misc' ? 'Output': p.category;

      if (map[category])
        map[category].push(p);
      else
        map[category] = [p];
    });

    return map;
  }

  private async doRun(): Promise<void> {
    this.isRunning = true;
    this.checkDisability.next();
    try {
      await this.run();
    } catch (e: any) {
      grok.shell.error(e);
    } finally {
      this.isRunning = false;
      this.checkDisability.next();
    }
  }

  private renderOutputForm(): HTMLElement {
    const outputs = ui.divV([], 'ui-form');
    let prevCategory = 'Misc';
    wu(this.funcCall.outputParams.values() as DG.FuncCallParam[])
      .filter((val) => !!val)
      .forEach((val) => {
        const prop = val.property;

        if (prop.propertyType.toString() === FILE_INPUT_TYPE) {
          const t = UiUtils.fileInput(prop.caption ?? prop.name, null, (file: File) => {
            this.funcCall.outputs[prop.name] = file;
          });
          if (prop.category !== prevCategory)
            outputs.append(ui.h2(prop.category));

          outputs.append(t.root);
        } else {
          const t = prop.propertyType === DG.TYPE.DATA_FRAME ?
            ui.tableInput(prop.caption ?? prop.name, null, grok.shell.tables):
            ui.input.forProperty(prop);

          // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13004
          t.captionLabel.firstChild!.replaceWith(ui.span([prop.caption ?? prop.name]));
          // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13005
          if (prop.options['units']) t.addPostfix(prop.options['units']);

          // Should be onInput. DEALING WITH BUG:
          t.onChanged(() => {
            this.funcCall.outputs[val.name] = t.value;
            if (t.value === null) setTimeout(() => t.input.classList.add('d4-invalid'), 100); else t.input.classList.remove('d4-invalid');
          });

          if (prop.category !== prevCategory)
            outputs.append(ui.h2(prop.category));

          outputs.append(t.root);
        }
        prevCategory = prop.category;
      });

    outputs.classList.remove('ui-panel');
    outputs.style.paddingTop = '0px';
    outputs.style.paddingLeft = '0px';

    return outputs;
  }

  private renderInputForm(): HTMLElement {
    const inputs = ui.divV([], 'ui-form');
    let prevCategory = 'Misc';
    wu(this.funcCall.inputParams.values() as DG.FuncCallParam[])
      .filter((val) => !!val)
      .forEach((val) => {
        const prop = val.property;
        this.beforeInputPropertyRender.next(prop);
        if (prop.propertyType.toString() === FILE_INPUT_TYPE) {
          const t = UiUtils.fileInput(prop.caption ?? prop.name, null, (file: File) => {
            this.funcCall.inputs[prop.name] = file;
            this.checkDisability.next();
          });
          if (prop.category !== prevCategory)
            inputs.append(ui.h2(prop.category));

          inputs.append(t.root);
          this.afterInputPropertyRender.next({prop, input: t});
        } else {
          const t = prop.propertyType === DG.TYPE.DATA_FRAME ?
            ui.tableInput(prop.caption ?? prop.name, null, grok.shell.tables):
            ui.input.forProperty(prop);

          t.input.onkeydown = async (ev) => {
            if (ev.key == 'Enter')
              await this.doRun();
          };

          // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13004
          t.captionLabel.firstChild!.replaceWith(ui.span([prop.caption ?? prop.name]));
          // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13005
          if (prop.options['units']) t.addPostfix(prop.options['units']);

          this.syncFuncCallReplaced(t, val);
          this.syncOnInput(t, val);
          this.syncValOnChanged(t, val);

          if (this.runningOnInput)
            this.runOnInput(t, val);

          if (prop.category !== prevCategory)
            inputs.append(ui.h2(prop.category));

          inputs.append(t.root);
          this.afterInputPropertyRender.next({prop, input: t});
        }
        prevCategory = prop.category;
      });
    this.controllsDiv = undefined;
    this.beforeRenderControlls.next(true);
    if (!this.controllsDiv) {
      const runButton = this.getRunButton();
      const buttonWrapper = ui.div([runButton]);
      ui.tooltip.bind(buttonWrapper, () => runButton.disabled ? (this.isRunning ? 'Computations are in progress' : 'Some inputs are invalid') : '');
      this.controllsDiv = ui.buttonsInput([buttonWrapper as any]);
    };

    inputs.classList.remove('ui-panel');
    inputs.style.paddingTop = '0px';
    inputs.style.paddingLeft = '0px';
    this.checkDisability.next();

    return inputs;
  }

  private syncFuncCallReplaced(t: DG.InputBase<any>, val: DG.FuncCallParam) {
    const prop = val.property;
    const sub = this.funcCallReplaced.pipe(startWith(true)).subscribe(() => {
      const newValue = this.funcCall!.inputs[val.name] ?? prop.defaultValue ?? null;
      if (val.property.propertyType === DG.TYPE.DATA_FRAME)
        this.dfInputRecreate(t, val, newValue);
      else {
        t.value = newValue;
        this.funcCall!.inputs[val.name] = newValue;
      }
    });
    this.subs.push(sub);
  }

  private syncValOnChanged(t: DG.InputBase<any>, val: DG.FuncCallParam) {
    const sub = val.onChanged.subscribe(() => {
      const newValue = this.funcCall!.inputs[val.name];
      if (val.property.propertyType === DG.TYPE.DATA_FRAME)
        this.dfInputRecreate(t, val, newValue);
        // there is no notify for DG.FuncCallParam, so we need to
        // check if the value is not the same for floats, otherwise we
        // will overwrite a user input with a lower precicsion decimal
        // representation
      else if (((typeof newValue === 'number') && Math.abs(t.value - newValue) > 0.0001) || typeof newValue !== 'number') {
        t.notify = false;
        t.value = newValue;
        t.notify = true;
      }
      this.checkDisability.next();
    });

    this.subs.push(sub);
  }

  private isRunnable() {
    return (wu(this.funcCall!.inputs.values()).every((v) => v !== null && v !== undefined)) && !this.isRunning;
  }

  private async saveExperimentalRun(expFuncCall: DG.FuncCall) {
    // Dirty hack to set readonly 'started' field
    const tempCall = await(await grok.functions.eval('Sin')).prepare({x: 1}).call();
    expFuncCall.dart.r2 = tempCall.dart.r2;

    let tagsRef = expFuncCall.options['tags'];
    tagsRef = tagsRef ? tagsRef.push(EXPERIMENTAL_TAG) : [EXPERIMENTAL_TAG];
    expFuncCall.options['tags'] = tagsRef;

    await this.saveRun(expFuncCall);
  }

  // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-12223
  private dfInputRecreate(t: DG.InputBase<any>, val: DG.FuncCallParam, newValue: DG.DataFrame) {
    const prop = val.property;
    const newTableInput = ui.tableInput(prop.caption ?? prop.name, newValue, [...grok.shell.tables, newValue]);
    t.root.replaceWith(newTableInput.root);
    t = newTableInput;
    this.syncOnInput(t, val);
    if (this.runningOnInput)
      this.runOnDgInput(t, val);
    this.afterInputPropertyRender.next({prop, input: t});
  }

  private syncOnInput(t: DG.InputBase<any>, val: DG.FuncCallParam) {
    t.onInput(() => {
      this.funcCall!.inputs[val.name] = t.value;
      if (t.value === null) setTimeout(() => t.input.classList.add('d4-invalid'), 100); else t.input.classList.remove('d4-invalid');
      this.checkDisability.next();
    });
  }

  private runOnInput(t: DG.InputBase, val: DG.FuncCallParam) {
    t.onInput(async () => {
      if (this.isRunnable())
        await this.doRun();
    });
  }

  private runOnDgInput(t: DG.InputBase<DG.DataFrame>, val: DG.FuncCallParam) {
    t.onInput(async () => await this.doRun());

    // DataFrame inputs have internal mutability, so we need check for it
    const ref = t.value as DG.DataFrame | null;
    if (ref) {
      const sub = ref.onDataChanged.subscribe(async () => {
        if (this.isRunnable())
          await this.doRun();
      });
      this.subs.push(sub);
    }
  }

  /**
   * RichFunctionView know everything about its UI, so it exports not only data, but also viewer screenshots.
   * This function iterates over all of the tabs and sequentally exports all dataframes, their viewers and scalars.
   * @param format format needed to export. See {@link this.defaultSupportedExportFormats} for available formats.
   * @returns Promise<Blob> with data ready for download
   */
  protected defaultExport = async (format: string) => {
    const lastCall = this.lastCall;

    if (!lastCall) throw new Error(`Function was not called`);

    if (!this.exportConfig!.supportedFormats.includes(format)) throw new Error(`Format "${format}" is not supported.`);

    if (!this.func) throw new Error('The correspoding function is not specified');

    const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const exportWorkbook = new ExcelJS.Workbook();

    const isScalarType = (type: DG.TYPE) => (DG.TYPES_SCALAR.has(type));

    const isDataFrame = (type: DG.TYPE) => (type === DG.TYPE.DATA_FRAME);

    const dfInputs = this.func.inputs.filter((input) => isDataFrame(input.propertyType));
    const scalarInputs = this.func.inputs.filter((input) => isScalarType(input.propertyType));
    const dfOutputs = this.func.outputs.filter((output) => isDataFrame(output.propertyType));
    const scalarOutputs = this.func.outputs.filter((output) => isScalarType(output.propertyType));

    const inputParams = [...lastCall.inputParams.values()] as DG.FuncCallParam[];
    const outputParams = [...lastCall.outputParams.values()] as DG.FuncCallParam[];

    dfInputs.forEach((dfInput) => {
      const visibleTitle = dfInput.options.caption || dfInput.name;
      const currentDfSheet = exportWorkbook.addWorksheet(getSheetName(visibleTitle, DIRECTION.INPUT));

      const currentDf = getDataFrame(lastCall, dfInput.name, DIRECTION.INPUT);
      dfToSheet(currentDfSheet, currentDf);
    });

    if (scalarInputs.length) {
      const inputScalarsSheet = exportWorkbook.addWorksheet('Input scalars');
      scalarsToSheet(inputScalarsSheet, scalarInputs.map((scalarInput) => ({
        caption: scalarInput.options['caption'] || scalarInput.name,
        value: lastCall.inputs[scalarInput.name],
        units: scalarInput.options['units'] || '',
      })));
    }

    dfOutputs.forEach((dfOutput) => {
      const visibleTitle = dfOutput.options.caption || dfOutput.name;
      const currentDfSheet = exportWorkbook.addWorksheet(getSheetName(visibleTitle, DIRECTION.OUTPUT));

      const currentDf = getDataFrame(lastCall, dfOutput.name, DIRECTION.OUTPUT);
      dfToSheet(currentDfSheet, currentDf);
    });


    if (scalarOutputs.length) {
      const outputScalarsSheet = exportWorkbook.addWorksheet('Output scalars');
      scalarsToSheet(outputScalarsSheet, scalarOutputs.map((scalarOutput) => ({
        caption: scalarOutput.options['caption'] || scalarOutput.name,
        value: lastCall.outputs[scalarOutput.name],
        units: scalarOutput.options['units'] || '',
      })));
    }

    const tabControl = this.outputsTabsElem;
    for (const tabLabel of this.tabsLabels) {
      tabControl.currentPane = tabControl.getPane(tabLabel);
      await new Promise((r) => setTimeout(r, 100));
      if (tabLabel === 'Input') {
        for (const inputParam of inputParams.filter((inputParam) => inputParam.property.propertyType === DG.TYPE.DATA_FRAME)) {
          const nonGridViewers = this.dfToViewerMapping[inputParam.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          const dfInput = dfInputs.find((input) => input.name === inputParam.name)!;
          const visibleTitle = dfInput!.options.caption || inputParam.name;
          const currentDf = getDataFrame(lastCall, dfInput.name, DIRECTION.INPUT);

          for (const [index, viewer] of nonGridViewers.entries()) {
            await plotToSheet(
              exportWorkbook,
              exportWorkbook.getWorksheet(getSheetName(visibleTitle, DIRECTION.INPUT)),
              viewer.root,
              currentDf.columns.length + 2,
              (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
            );
          };
        }
      } else {
        for (const outputParam of outputParams.filter(
          (outputParam) => outputParam.property.propertyType === DG.TYPE.DATA_FRAME &&
          (
            (tabLabel === 'Output' && outputParam.property.category === 'Misc' || outputParam.property.category === 'Output') ||
            (tabLabel !== 'Output' && outputParam.property.category === tabLabel)
          ),
        )) {
          const nonGridViewers = this.dfToViewerMapping[outputParam.property.name]
            .filter((viewer) => viewer.type !== DG.VIEWER.GRID)
            .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer.type));

          const dfOutput = dfOutputs.find((output) => output.name === outputParam.property.name)!;
          const visibleTitle = dfOutput.options.caption || outputParam.property.name;
          const currentDf = getDataFrame(lastCall, dfOutput.name, DIRECTION.OUTPUT);

          for (const [index, viewer] of nonGridViewers.entries()) {
            if (viewer.type === DG.VIEWER.STATISTICS) {
              const length = currentDf.columns.length;
              const stats = DG.DataFrame.fromColumns([
                DG.Column.string('Name', length).init((i: number) => currentDf.columns.byIndex(i).name),
                DG.Column.int('Values', length).init((i: number) => currentDf.columns.byIndex(i).stats.valueCount),
                DG.Column.int('Nulls', length).init((i: number) => currentDf.columns.byIndex(i).stats.missingValueCount),
                DG.Column.float('Min', length).init((i: number) => currentDf.columns.byIndex(i).stats.min),
                DG.Column.float('Max', length).init((i: number) => currentDf.columns.byIndex(i).stats.max),
                DG.Column.float('Avg', length).init((i: number) => currentDf.columns.byIndex(i).stats.avg),
                DG.Column.float('Stdev', length).init((i: number) => currentDf.columns.byIndex(i).stats.stdev),
              ]);
              dfToSheet(
                exportWorkbook.getWorksheet(getSheetName(visibleTitle, DIRECTION.OUTPUT)),
                stats,
                currentDf.columns.length + 2,
                (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
              );
            } else {
              await plotToSheet(
                exportWorkbook,
                exportWorkbook.getWorksheet(getSheetName(visibleTitle, DIRECTION.OUTPUT)),
                viewer.root,
                currentDf.columns.length + 2,
                (index > 0) ? Math.ceil(nonGridViewers[index-1].root.clientHeight / 20) + 1 : 0,
              );
            }
          }
        };
      }
    };
    const buffer = await exportWorkbook.xlsx.writeBuffer();

    return new Blob([buffer], {type: BLOB_TYPE});
  };

  exportConfig = {
    supportedExtensions: this.defaultSupportedExportExtensions(),
    supportedFormats: this.defaultSupportedExportFormats(),
    export: this.defaultExport,
    filename: this.defaultExportFilename,
  };
}

const getSheetName = (name: string, direction: DIRECTION) => {
  const idealName = `${direction} - ${name}`;
  return (idealName.length > 31) ? name.substring(0, 32) : idealName;
};

const scalarsToSheet = (sheet: ExcelJS.Worksheet, scalars: { caption: string, value: string, units: string }[]) => {
  sheet.addRow(['Parameter', 'Value', 'Units']).font = {bold: true};
  scalars.forEach((scalar) => {
    sheet.addRow([scalar.caption, scalar.value, scalar.units]);
  });

  sheet.getColumn(1).width = Math.max(
    ...scalars.map((scalar) => scalar.caption.toString().length), 'Parameter'.length,
  ) * 1.2;
  sheet.getColumn(2).width = Math.max(...scalars.map((scalar) => scalar.value.toString().length), 'Value'.length) * 1.2;
  sheet.getColumn(3).width = Math.max(...scalars.map((scalar) => scalar.units.toString().length), 'Units'.length) * 1.2;
};

const dfToSheet = (sheet: ExcelJS.Worksheet, df: DG.DataFrame, column: number = 0, row: number = 0) => {
  for (let i= 0; i < df.columns.names().length; i++) {
    sheet.getCell(1 + row, 1 + i + column).value = df.columns.byIndex(i).name;
    sheet.getColumn(1 + i + column).width = Math.max(
      ...df.columns.byIndex(i).categories.map((category) => category.toString().length),
      df.columns.byIndex(i).name.length,
    ) * 1.2;
  }
  for (let dfColumn = 0; dfColumn < df.columns.length; dfColumn++) {
    for (let i = 0; i < df.rowCount; i++)
      sheet.getCell(i + 2 + row, 1 + column+dfColumn).value = df.columns.byIndex(dfColumn).get(i);
  }
};

const plotToSheet = async (exportWb: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, plot: HTMLElement, columnForImage: number, rowForImage: number = 0) => {
  const canvas = await html2canvas(plot as HTMLElement, {logging: false});
  const dataUrl = canvas.toDataURL('image/png');

  const imageId = exportWb.addImage({
    base64: dataUrl,
    extension: 'png',
  });
  sheet.addImage(imageId, {
    tl: {col: columnForImage, row: rowForImage},
    ext: {width: canvas.width, height: canvas.height},
  });
};
