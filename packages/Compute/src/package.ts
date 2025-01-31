/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {filter, take} from 'rxjs/operators';
import {OutliersSelectionViewer} from './outliers-selection/outliers-selection-viewer';
import {
  ComputationView as ComputationViewInst,
  RichFunctionView as RichFunctionViewInst,
  PipelineView as PipelineViewInst,
  CustomFunctionView as CustomFunctionViewInst,
  UiUtils,
} from '@datagrok-libraries/compute-utils';
import {
  ValidationInfo,
  makeAdvice as makeAdviceInst,
  makeValidationResult as makeValidationResultInst,
  makeRevalidation as makeRevalidationInst,
  mergeValidationResults as mergeValidationResultsInst,
} from '@datagrok-libraries/compute-utils/shared-utils/validation';
export {
  makeValidationResult as makeValidationResult2,
  makeAdvice as makeAdvice2,
  mergeValidationResults as mergeValidationResults2,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/utils';
import {ModelCatalogView, ModelHandler} from '@datagrok-libraries/compute-utils/model-catalog';
import {
  testPipeline as testPipelineInst,
} from '@datagrok-libraries/compute-utils/shared-utils/function-views-testing';

let initCompleted: boolean = false;
export const _package = new DG.Package();

//name: openModelFromFuncall
//input: funccall funccall
export function openModelFromFuncall(funccall: DG.FuncCall) {
  ModelHandler.openModelFromFunccall(funccall);
}

//name: OutliersSelectionViewer
//description: Creates an outliers selection viewer
//tags: viewer
//output: viewer result
export function OutliersSelection() {
  return new OutliersSelectionViewer();
}

//name: RichFunctionViewEditor
//tags: editor
//input: funccall call
//output: view result
export function RichFunctionViewEditor(call: DG.FuncCall) {
  return RichFunctionViewInst.fromFuncCall(call, {historyEnabled: true, isTabbed: false});
}

//name: PipelineStepEditor
//tags: editor
//input: funccall call
//output: view result
export function PipelineStepEditor(call: DG.FuncCall) {
  return RichFunctionViewInst.fromFuncCall(call, {historyEnabled: false, isTabbed: true});
}

//name: renderRestPanel
//input: func func
//output: widget panel
export async function renderRestPanel(func: DG.Func): Promise<DG.Widget> {
  const params: object = {};
  func.inputs.forEach((i) => (<any>params)[i.name] = null);
  const curl = `
curl --location --request POST '${(<any>grok.settings).apiUrl}/v1/func/${func.nqName}/run' \\
--header 'Authorization: ${getCookie('auth')}' \\
--header 'Content-Type: application/json' \\
--data-raw '${JSON.stringify(params)}'`;
  const js = `
var myHeaders = new Headers();
myHeaders.append("Authorization", "${getCookie('auth')}");
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify(${JSON.stringify(params)});

var requestOptions = {
  method: 'POST',
  headers: myHeaders,
  body: raw,
  redirect: 'follow'
};

fetch("${(<any>grok.settings).apiUrl}/v1/func/${func.nqName}/run", requestOptions)
  .then(response => response.text())
  .then(result => console.log(result))
  .catch(error => console.log('error', error));`;
  const tabs = ui.tabControl({'CURL': ui.div([ui.divText(curl)]), 'JS': ui.div([ui.divText(js)])});
  return DG.Widget.fromRoot(tabs.root);
}

function getCookie(name: string): string | undefined {
  const matches = document.cookie.match(new RegExp(
    '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)',
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

//name: CustomDataUploader
//input: func func
//output: object uploadedCalls
export async function CustomDataUploader(func: DG.Func) {
  await new Promise((r) => setTimeout(r, 1000));

  const dummyFunccall = await func.prepare({
    'ambTemp': 22,
    'initTemp': 100,
    'desiredTemp': 30,
    'area': 0.06,
    'heatCap': 4200,
    'heatTransferCoeff': 8.3,
    'simTime': 21600,
  }).call();

  return [dummyFunccall];
}

//name: CustomUploader
//input: object params
//output: widget uploadWidget
//output: funccall uploadFuncCall
export async function CustomUploader(params: {func: DG.Func}) {
  const uploadFunc = await grok.functions.eval('Compute:CustomDataUploader') as DG.Func;
  const uploadFuncCall = uploadFunc.prepare({func: params.func});
  const uploadBtn = ui.bigButton('Click me to get mock calls', () => uploadFuncCall.call());

  const dummyWidget = DG.Widget.fromRoot(ui.panel([ui.divV([
    ui.label('This part of dialog comes from my custom data uploader'),
    ui.divH([uploadBtn], {style: {justifyContent: 'center'}}),
  ])]));

  const setLoadingSub = grok.functions.onBeforeRunAction.pipe(
    filter((call) => call.id === uploadFuncCall.id),
  ).subscribe(() => {
    ui.setUpdateIndicator(uploadBtn, true);
  });

  const unsetLoadingSub = grok.functions.onAfterRunAction.pipe(
    filter((call) => call.id === uploadFuncCall.id),
  ).subscribe(() => {
    ui.setUpdateIndicator(uploadBtn, false);
  });

  dummyWidget.subs.push(setLoadingSub, unsetLoadingSub);

  return {uploadWidget: dummyWidget, uploadFuncCall};
}

//name: CustomCustomizer
//input: object params
export function CustomCustomizer(params: {defaultView: DG.TableView}) {
  const comparisonView = params.defaultView;
  comparisonView.scatterPlot({
    'xColumnName': 'Initial temperature',
    'yColumnName': 'Time to cool',
  });
}

//tags: init
export function init() {
  if (initCompleted)
    return;

  if (!(DG.ObjectHandler.list().find((handler) => handler.type === 'Model')))
    DG.ObjectHandler.register(new ModelHandler());


  grok.events.onAccordionConstructed.subscribe((acc: DG.Accordion) => {
    const ent = acc.context;
    if (ent == null)
      return;
    if (ent.type != 'script')
      return;
    const restPane = acc.getPane('REST');
    if (!restPane)
      acc.addPane('REST', () => ui.wait(async () => (await renderRestPanel(ent)).root));
  });

  initCompleted = true;
}

let startUriLoaded = false;

//name: Model Catalog
//tags: app
//output: view v
//meta.browsePath: Compute
export function modelCatalog() {
  // Separately process direct link access
  const startOptionalPart = grok.shell.startUri.indexOf('?');
  const startPathSegments = grok.shell.startUri
    .substring('https://'.length, startOptionalPart > 0 ? startOptionalPart: undefined)
    .split('/');

  if (!startUriLoaded && startPathSegments.includes('Compute')) {
    const view = ModelCatalogView.findOrCreateCatalogView('Model Catalog', 'modelCatalog', _package);

    grok.shell.addView(view);
    startUriLoaded = true;

    if (startPathSegments.length > 3) {
      grok.dapi.functions.filter(`shortName = "${startPathSegments[3]}" and #model`).list().then((lst) => {
        if (lst.length == 1)
          ModelHandler.openModel(lst[0]);
      });
    }

    return;
  }

  const optionalPart = window.location.href.indexOf('?');
  const pathSegments = window.location.href
    .substring('https://'.length, optionalPart > 0 ? optionalPart: undefined)
    .split('/');

  if (pathSegments.includes('browse')) {
    const view = ModelCatalogView.findModelCatalogView('modelCatalog');

    // If there is existing view, then switch on it
    if (view)
      grok.shell.v = view;


    // Always return new with no subscribtions to show in Browse tree
    const newView = ModelCatalogView.createModelCatalogView('Model Catalog', 'modelCatalog', _package);
    return newView;
  }

  // Separately process double-clicking on Model Catalog card
  if (pathSegments.includes('apps')) {
    const view = ModelCatalogView.findModelCatalogView('modelCatalog');

    // If there is existing view, then switch on it
    if (view)
      grok.shell.v = view;
    else {
      const newView = ModelCatalogView.createModelCatalogView('Model Catalog', 'modelCatalog', _package);
      grok.shell.addView(newView);
    }
  }
}


//name: SimTimeValidator
//input: object params
//output: object validator
export function SimTimeValidator(params: any) {
  const {reasonableMin, reasonableMax} = params;
  return (val: number) => {
    return makeValidationResultInst({
      warnings: val < reasonableMin || val > reasonableMax ? [`Minimum reasonable time is ${reasonableMin}. Maximum reasonable time is ${reasonableMax}`]: undefined,
      errors: val < 0 ? [`Time should be strictly positive`]: undefined,
    });
  };
}

//name: DesiredTempValidator
//input: object params
//output: object validator
export function DesiredTempValidator(params: any) {
  return (val: number, info: ValidationInfo) => {
    const ambTemp = info.funcCall.inputs['ambTemp'];
    const initTemp = info.funcCall.inputs['initTemp'];
    return makeValidationResultInst({
      errors: [
        ...(val < ambTemp) ? [makeAdviceInst(`Desired temperature cannot be less than ambient temperature (${ambTemp}). \n`, [
          {actionName: 'Set desired equal to ambient', action: () => info.funcCall.inputs['desiredTemp'] = ambTemp},
        ])]: [],
        ...(val > initTemp) ? [`Desired temperature cannot be higher than initial temperature (${initTemp})`]: [],
      ],
    });
  };
}

//name: InitialTempValidator
//input: object params
//output: object validator
export function InitialTempValidator(params: any) {
  return (val: number, info: ValidationInfo) => {
    const ambTemp = info.funcCall.inputs['ambTemp'];
    return makeValidationResultInst({
      errors: [
        ...(val < ambTemp) ? [`Initial temperature cannot be less than ambient temperature (${ambTemp}).`]: [],
      ],
    });
  };
}

//name: AmbTempValidator
//input: object params
//output: object validator
export function AmbTempValidator(params: any) {
  return (val: number, info: ValidationInfo) => {
    const initTemp = info.funcCall.inputs['initTemp'];
    return makeValidationResultInst({
      errors: [
        ...(val > initTemp) ? [`Ambient temperature cannot be higher than initial temperature (${initTemp})`]: [],
      ],
    });
  };
}

//name: HeatCapValidator
//input: object params
//output: object validator
export function HeatCapValidator(params: any) {
  return (val: number, info: ValidationInfo) => {
    return makeValidationResultInst({
      errors: [
        ...val <= 0 ? ['Heat capacity must be greater than zero.']: [],
      ],
      notifications: [
        makeAdviceInst(`Heat capacity is only dependent on the object material.`, [
          {actionName: 'Google it', action: () => {window.open(`http://google.com`);}},
        ]),
      ],
    });
  };
}

//name: CustomStringInput
//input: object params
//output: object input
export function CustomStringInput(params: any) {
  const defaultInput = ui.input.string('Custom input', {value: ''});
  defaultInput.root.style.backgroundColor = 'aqua';
  defaultInput.input.style.backgroundColor = 'aqua';
  return defaultInput;
}

//name: ObjectCoolingSelector
//input: object params
//output: object input
export function ObjectCoolingSelector(params: any) {
  return UiUtils.historyInputJSON(
    'Previous run',
    'ObjectCooling',
  );
}

//input: dynamic treeNode
//input: view browseView
export async function modelCatalogTreeBrowser(treeNode: DG.TreeViewGroup, browseView: DG.BrowseView) {
  const NO_CATEGORY = 'Uncategorized' as const;

  const modelSource = grok.dapi.functions.filter('(#model)');
  const modelList = await modelSource.list();
  const departments = modelList.reduce((acc, model) => {
    if (model.options.department)
      acc.add(model.options.department);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  const hlProcesses = modelList.reduce((acc, model) => {
    if (model.options.HL_process)
      acc.add(model.options.HL_process);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  const processes = modelList.reduce((acc, model) => {
    if (model.options.process)
      acc.add(model.options.process);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  for (const department of departments) {
    const serverDep = (department !== NO_CATEGORY ? department: undefined);
    const hasModelsDep = modelList.find((model) =>
      model.options.department === serverDep,
    );

    if (!hasModelsDep) continue;

    const depNode = treeNode.getOrCreateGroup(department, null, false);
    for (const hlProcess of hlProcesses) {
      const serverHlProcess = (hlProcess !== NO_CATEGORY ? hlProcess: undefined);
      const hasModelsHl = modelList.find((model) =>
        model.options.department === serverDep &&
        model.options.HL_process === serverHlProcess,
      );

      if (!hasModelsHl) continue;

      const hlNode = hlProcess !== NO_CATEGORY ? depNode.getOrCreateGroup(hlProcess, null, false): depNode;
      for (const process of processes) {
        const serverProcess = (process !== NO_CATEGORY ? process: undefined);
        const hasModels = modelList.find((model) =>
          model.options.department === serverDep &&
          model.options.HL_process === serverHlProcess &&
          model.options.process === serverProcess,
        );

        if (!hasModels) continue;

        const processNode = process !== NO_CATEGORY ? hlNode.getOrCreateGroup(process, null, false): hlNode;
        processNode.onNodeExpanding.pipe(take(1)).subscribe(() => {
          const modelRule = `(#model)`;
          const depRules = department === NO_CATEGORY ? `(options.department = null)`: `(options.department in ("${department}"))`;
          const hlProcessRules = hlProcess === NO_CATEGORY ? `(options.HL_process = null)`: `(options.HL_process in ("${hlProcess}"))`;
          const processRules = process === NO_CATEGORY ? `(options.process = null)`: `(options.process in ("${process}"))`;
          const filteringRules = `(${[modelRule, depRules, hlProcessRules, processRules].join(' and ')})`;
          processNode.loadSources(grok.dapi.functions.filter(filteringRules));
        });
      }
    }
  }
}

//// Compute-utils API section

export const testPipeline = testPipelineInst;
export const CompView = ComputationViewInst;
export const RFV = RichFunctionViewInst;
export const CFV = CustomFunctionViewInst;
export const Pipeline = PipelineViewInst;
export const makeValidationResult = makeValidationResultInst;
export const makeAdvice = makeAdviceInst;
export const makeRevalidation = makeRevalidationInst;
export const mergeValidationResults = mergeValidationResultsInst;
export const fileInput = UiUtils.fileInput;
export const historyInput = UiUtils.historyInput;
export const historyInputJSON = UiUtils.historyInputJSON;
export const historyPanel = UiUtils.historyPanel;
