/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';
import {filter, take} from 'rxjs/operators';

import {ViewerTestApp as ViewerAppInstance} from './apps/ViewerTestApp';
import {FormTestApp as FormAppInstance} from './apps/FormTestApp';
import {HistoryTestApp as HistoryAppInstance} from './apps/HistoryTestApp';
import {TreeWizardApp as TreeWizardAppInstance} from './apps/TreeWizardApp';
import {RFVApp} from './apps/RFVApp';
import {PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import './tailwind.css';
import {makeAdvice, makeValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/utils';
import {CustomFunctionView} from '@datagrok-libraries/compute-utils/function-views/src/custom-function-view';
import {HistoryApp} from './apps/HistoryApp';
import {Subject} from 'rxjs';

declare global {
  var initialURLHandled: boolean;
}

export const _package = new DG.Package();

//tags: init
export async function init() {
  await DG.Func.byName('WebComponents:init').prepare().call();
}

function setViewHierarchyData(call: DG.FuncCall, view: DG.ViewBase) {
  view.parentCall = call.parentCall;

  if (view.parentCall?.aux?.view)
    view.parentView = view.parentCall.aux.view;

  if (call?.func?.name)
    view.basePath = `/${call.func.name}`;
}

//name: CustomFunctionViewEditor
//tags: editor, vue
//input: funccall call
//output: view result
export async function CustomFunctionViewEditor(call: DG.FuncCall) {
  const view = (await call.call()).getOutputParamValue() as CustomFunctionView;
  setViewHierarchyData(call, view);

  await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
  const updateFCBus = new Subject<DG.FuncCall>();

  const app = Vue.createApp(HistoryApp, {name: view.funcNqName, showHistory: view.showHistory, updateFCBus});

  const sub = updateFCBus.subscribe((fc) => {
    view.linkFunccall(fc);
    view.onAfterLoadRun(fc);
  });

  app.mount(view.historyRoot);

  grok.events.onViewRemoved.pipe(
    filter((closedView) => {
      return closedView === (view as any);
    }),
    take(1),
  ).subscribe(() => {
    sub.unsubscribe();
    app.unmount();
  });

  return view;
}


//name: RichFunctionViewEditor
//tags: editor, vue
//input: funccall call
//output: view result
export async function RichFunctionViewEditor(call: DG.FuncCall) {
  const view = new DG.ViewBase();
  setViewHierarchyData(call, view);

  const app = Vue.createApp(RFVApp, {funcCall: call, view});
  view.root.classList.remove('ui-panel');
  // view.root.classList.add('ui-box');
  view.root.style.overflow = 'hidden';

  app.mount(view.root);

  grok.events.onViewRemoved.pipe(
    filter((closedView) => {
      return closedView === view;
    }),
    take(1),
  ).subscribe(() => {
    app.unmount();
  });

  return view;
}


//name: Tree Wizard Test
//tags: test, vue
//meta.icon: icons/tree-wizard.png
//meta.provider: Compute2:MockProvider2
//editor: Compute2:TreeWizardEditor
export async function TreeWizardTestApp() {}


//name: Tree Wizard Editor
//tags: editor
//input: funccall call
//output: view result
export async function TreeWizardEditor(call: DG.FuncCall) {
  const providerFunc = call?.func?.options?.provider;
  if (!providerFunc)
    throw new Error(`Model ${call?.func?.name} has no provider`);

  const view = new DG.ViewBase();
  setViewHierarchyData(call, view);

  const modelName = call.options?.['title'] ?? call.func?.friendlyName ?? call.func?.name;

  const app = Vue.createApp(TreeWizardAppInstance, {providerFunc, modelName, view});
  view.root.classList.remove('ui-panel');
  view.root.classList.add('ui-box');

  app.mount(view.root);

  grok.events.onViewRemoved.pipe(
    filter((closedView) => {
      return closedView === view;
    }),
    take(1),
  ).subscribe(() => {
    app.unmount();
  });

  return view;
}

//tags: test, vue
export async function ViewerTestApp() {
  const view = new DG.ViewBase();
  const app = Vue.createApp(ViewerAppInstance);
  app.mount(view.root);
  view.name = 'ViewerTestApp';
  grok.shell.addView(view);
}

//tags: test, vue
export async function FormTestApp() {
  const view = new DG.ViewBase();
  const app = Vue.createApp(FormAppInstance);
  app.mount(view.root);
  view.name = 'FormTestApp';
  grok.shell.addView(view);
}

//tags: test, vue
export async function HistoryTestApp() {
  const view = new DG.ViewBase();
  const app = Vue.createApp(HistoryAppInstance);
  view.root.classList.remove('ui-panel');
  app.mount(view.root);
  view.name = 'HistoryTestApp';
  grok.shell.addView(view);
}

//name: MockWrapper1
export async function MockWrapper1() {}

//name: MockProvider1
//input: object params
//output: object result
export async function MockProvider1(params: any) {
  const c: PipelineConfiguration = {
    id: 'pipeline1',
    nqName: 'Compute2:MockWrapper1',
    provider: 'Compute2:MockProvider1',
    version: '1.0',
    type: 'static',
    steps: [
      {
        id: 'step1',
        nqName: 'Compute2:LongScript',
      },
      // {
      //   id: 'step2',
      //   nqName: 'Compute2:LongFailingScript',
      // },
    ],
    links: [{
      id: 'link1',
      from: 'in1:step1/res',
      to: 'out1:step2/a',
    }],
  };
  return c;
}

//name: MockWrapper2
export async function MockWrapper2() {}


//name: MockProvider2
//input: object params
//output: object result
export async function MockProvider2(params: any) {
  const c: PipelineConfiguration = {
    id: 'pipelinePar',
    nqName: 'Compute2:MockWrapper2',
    provider: 'Compute2:MockProvider2',
    version: '1.0',
    type: 'sequential',
    stepTypes: [{
      id: 'cooling',
      nqName: 'Compute2:ObjectCooling2',
      friendlyName: 'cooling',
      actions: [{
        id: 'action1',
        from: 'in:ambTemp',
        to: 'out:initTemp',
        position: 'none',
        handler({controller}) {
          controller.setAll('out', controller.getFirst('in') * 2);
          return;
        },
      },
      {
        id: 'action2',
        from: 'in:ambTemp',
        to: 'out:ambTemp',
        position: 'menu',
        menuCategory: 'Test',
        description: 'My menu action',
        handler({controller}) {
          controller.setAll('out', controller.getFirst('in') * 2);
          return;
        },
      },
      {
        id: 'action3',
        from: 'in:ambTemp',
        to: 'out:ambTemp',
        position: 'buttons',
        menuCategory: 'Test',
        description: 'My view action',
        handler({controller}) {
          controller.setAll('out', controller.getFirst('in') * 2);
          return;
        },
      }],
    }, {
      id: 'stepAdd',
      nqName: 'Compute2:TestAdd2',
      friendlyName: 'add',
    }, {
      id: 'stepMul',
      nqName: 'Compute2:TestMul2',
      friendlyName: 'mul',
    }, {
      id: 'LongScript',
      nqName: 'Compute2:LongScript',
      friendlyName: 'long',
    }, {
      type: 'ref',
      provider: 'Compute2:MockProvider1',
      version: '1.0',
    }],
    initialSteps: [
      {
        id: 'stepAdd',
      }, {
        id: 'stepMul',
      }, {
        id: 'cooling',
      },
    ],
    links: [{
      id: 'selector',
      type: 'selector',
      from: 'in:cooling/ambTemp',
      to: ['out1:cooling/title', 'out2:cooling/description', 'out3:cooling/tags'],
      handler({controller}) {
        const val = controller.getFirst('in');
        controller.setDescriptionItem('out1', `Title ${val}`);
        controller.setDescriptionItem('out2', `Description ${val}`);
        controller.setDescriptionItem('out3', [`tag ${val}`]);
      },
    }, {
      id: 'link1',
      from: 'in1:stepAdd/res',
      to: 'out1:stepMul/a',
      type: 'meta',
      handler({controller}) {
        const addRes = controller.getFirst('in1');
        controller.setViewMeta('out1', {items: addRes > 0? ['0', '1', '2']: ['1', '2', '3']});
      },
    },
    {
      id: 'toMul',
      from: 'from:stepAdd/res',
      to: 'to:stepMul/b',
      defaultRestrictions: {to: 'restricted'},
    },
    {
      id: 'initialTempValidator',
      from: [
        'initTemp:cooling/initTemp',
        'ambTemp:cooling/ambTemp',
      ],
      to: [
        'toInitTemp:cooling/initTemp',
      ],
      actions: 'actions:cooling',
      type: 'validator',
      handler({controller}) {
        const initTemp = controller.getFirst('initTemp');
        const ambTemp = controller.getFirst('ambTemp');

        if (initTemp < ambTemp) {
          const action = controller.getValidationAction('actions', 'action1');

          if (!action) return;

          controller.setValidation('toInitTemp',
            makeValidationResult({errors: [
              makeAdvice(
                `Initial temperature should be more than ambient temperature ${ambTemp}`,
                [{actionName: `Set reasonable initial temperature`, action}],
              ),
            ]}));
        } else
          controller.setValidation('toInitTemp');
      },
    }],
  };
  return c;
}

//name: MockWrapper3
export async function MockWrapper3() {}

//name: TestAdd2
//input: double a
//input: double b
//output: double res
export async function TestAdd2(a: number, b: number) {
  return a + b;
}

//name: TestMul2
//input: double a
//input: double b
//output: double res
export async function TestSub2(a: number, b: number) {
  return a - b;
}

//input: string a {choices: ['0','1']}
//input: double b
//output: double res
export async function TestMul2(a: number, b: number) {
  return Number(a) * b;
}

//input: double a
//input: double b
//output: double res
export async function TestDiv2(a: number, b: number) {
  return a / b;
}

//input: dataframe df
//output: dataframe res
export async function TestDF1(df: DG.DataFrame) {
  return df;
}

class MyView extends CustomFunctionView {
  private aIn?: DG.InputBase;
  private bIn?: DG.InputBase;
  private res?: DG.InputBase;

  constructor() {
    super('Compute2:TestAdd2');
    this.box = true;
  }

  override buildIO() {
    this.aIn = ui.input.float('a', {onValueChanged: (val) => this.funcCall!.inputs.a = val});
    this.bIn = ui.input.float('b', {onValueChanged: (val) => this.funcCall!.inputs.b = val});
    this.res = ui.input.float('res');
    this.res.enabled = false;
    return ui.div([
      this.aIn,
      this.bIn,
      ui.div([ui.bigButton('Run', async () => {
        await this.funcCall!.call();
        await this.saveRun(this.funcCall!);
        this.res!.value = this.funcCall?.outputs.res;
      })]),
      this.res,
    ]);
  }

  override async onAfterLoadRun(loadedRun: DG.FuncCall) {
    console.log(`Loaded run ${loadedRun.id}`);
    this.aIn!.value = this.funcCall!.inputs.a;
    this.bIn!.value = this.funcCall!.inputs.b;
    this.res!.value = this.funcCall?.outputs.res;
  }
}

//name: Custom View (Compute 2 Test)
//tags: demo, test
//editor: Compute2:CustomFunctionViewEditor
//output: view result
export async function TestCustomView() {
  const view = new MyView();
  return view;
}
