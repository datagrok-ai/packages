/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {PipelineConfiguration} from '@datagrok-libraries/compute-utils';
import type {ViewerT, InputFormT} from '@datagrok-libraries/webcomponents';

export const _package = new DG.Package();

//tags: init
export async function init() {
  await DG.Func.byName('WebComponents:init').prepare().call();
}

//
// Validators manual testing
//


//tags: test
export async function TestViewerComponent() {
  const view = new DG.ViewBase();
  const viewerComponent = document.createElement('dg-viewer') as ViewerT;

  const setSrcBtn1 = ui.button('Set source demog', () => {
    viewerComponent.dataFrame = grok.data.demo.demog();
  });
  const setSrcBtn2 = ui.button('Set source doseResponse', () => {
    viewerComponent.dataFrame = grok.data.demo.doseResponse();
  });

  const remSrcBtn = ui.button('Remove source', () => {
    viewerComponent.dataFrame = undefined;
  });

  const setViewerTypeBtn1 = ui.button('Line chart', () => {
    viewerComponent.type = 'Line chart';
  });
  const setViewerTypeBtn2 = ui.button('Grid', () => {
    viewerComponent.type = 'Grid';
  });

  const setViewerTypeBtn3 = ui.button('Remove type', () => {
    viewerComponent.type = undefined;
  });

  view.root.insertAdjacentElement('beforeend', setSrcBtn1);
  view.root.insertAdjacentElement('beforeend', setSrcBtn2);
  view.root.insertAdjacentElement('beforeend', remSrcBtn);
  view.root.insertAdjacentElement('beforeend', setViewerTypeBtn1);
  view.root.insertAdjacentElement('beforeend', setViewerTypeBtn2);
  view.root.insertAdjacentElement('beforeend', setViewerTypeBtn3);
  view.root.insertAdjacentElement('beforeend', viewerComponent);

  grok.shell.addView(view);
}

//tags: test
export async function TestFromComponent() {
  const func: DG.Func = await grok.functions.eval('LibTests:simpleInputs');
  const fc1 = func.prepare({
    a: 1,
    b: 2,
    c: 3,
  });
  const formComponent = document.createElement('dg-input-form') as InputFormT;
  formComponent.funcCall = fc1;

  const view = new DG.ViewBase();

  const replaceFnBtn = ui.button('Replace funcall', () => {
    const fc2 = func.prepare({
      a: 1,
      b: 2,
      c: 3,
    });
    formComponent.funcCall = fc2;
  });

  const showFormFcInputsBtn = ui.button('Log funcall inputs', () => {
    console.log(Object.entries(formComponent.funcCall!.inputs));
  });

  view.root.insertAdjacentElement('beforeend', showFormFcInputsBtn);
  view.root.insertAdjacentElement('beforeend', replaceFnBtn);
  view.root.insertAdjacentElement('beforeend', formComponent);
  grok.shell.addView(view);
}

//tags: test
export async function TestElements() {
  const bnt = document.createElement('button', {is: 'dg-button'});
  bnt.textContent = 'Click me';
  const bigBtn = document.createElement('button', {is: 'dg-big-button'});
  bigBtn.textContent = 'Click me';
  const view = new DG.ViewBase();
  view.root.insertAdjacentElement('beforeend', bnt);
  view.root.insertAdjacentElement('beforeend', bigBtn);
  grok.shell.addView(view);
}

// pipeline driver testing

//input: double a
//input: double b
//output: double res
export async function TestAdd2(a: number, b: number) {
  return a + b;
}

//input: double a
//input: double b
//output: double res
export async function TestSub2(a: number, b: number) {
  return a - b;
}

//input: double a
//input: double b
//output: double res
export async function TestMul2(a: number, b: number) {
  return a * b;
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

//input: double a
//input: double b
//output: double res
export async function TestAdd2Error(a: number, b: number) {
  if (a < 0 || b < 0)
    throw new Error('Test error');
  return a + b;
}

//input: double a
//input: double b
//input: double c
//input: double d
//input: double e
//output: double res
export async function TestMultiarg5(a: number, b: number, c: number, d: number, e: number) {
  return a + b + c + d + e;
}

//name: MockWrapper1
export async function MockWrapper1() {}

//input: object params
//output: object result
export async function MockProvider1(params: any) {
  const c: PipelineConfiguration = {
    id: 'pipeline1',
    nqName: 'LibTests:MockWrapper1',
    provider: 'LibTests:MockProvider1',
    version: '1.0',
    type: 'static',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestAdd2',
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestMul2',
      },
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

//input: object params
//output: object result
export async function MockProvider2(params: any) {
  const c: PipelineConfiguration = {
    id: 'pipelinePar',
    nqName: 'LibTests:MockWrapper2',
    provider: 'LibTests:MockProvider2',
    version: '1.0',
    type: 'parallel',
    stepTypes: [{
      id: 'stepAdd',
      nqName: 'LibTests:TestAdd2',
      friendlyName: 'add',
    }, {
      id: 'stepMul',
      nqName: 'LibTests:TestMul2',
      friendlyName: 'mul',
    }, {
      type: 'ref',
      provider: 'LibTests:MockProvider1',
      version: '1.0',
    }],
    initialSteps: [
      {
        id: 'stepAdd',
      }, {
        id: 'pipeline1',
      },
    ],
  };
  return c;
}

//name: MockWrapper3
export async function MockWrapper3() {}

//input: object params
//output: object result
export async function MockProvider3(params: any) {
  const c: PipelineConfiguration = {
    id: 'pipelinePar',
    nqName: 'LibTests:MockWrapper3',
    provider: 'LibTests:MockProvider3',
    version: '1.0',
    type: 'parallel',
    stepTypes: [{
      type: 'ref',
      provider: 'LibTests:MockProvider2',
      version: '1.0',
    }],
    initialSteps: [
      {
        id: 'pipelinePar',
      },
    ],
  };
  return c;
}

//name: MockWrapper4
export async function MockWrapper4() {}

//input: object params
//output: object result
export async function MockProvider4(params: any) {
  const config2: PipelineConfiguration = {
    id: 'pipeline1',
    type: 'static',
    nqName: 'LibTests:MockWrapper4',
    provider: 'LibTests:MockProvider4',
    version: '1.0',
    steps: [
      {
        id: 'step1',
        nqName: 'LibTests:TestAdd2Error',
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestMul2',
      },
    ],
    links: [{
      id: 'link1',
      from: 'in1:step1/a',
      to: 'out1:step2/a',
      handler({controller}) {
        controller.setAll('out1', 2, 'restricted');
        return;
      },
    }],
  };
  return config2;
}

//name: MockWrapper5
export async function MockWrapper5() {}

//input: object params
//output: object result
export async function MockProvider5(params: any) {
  const config2: PipelineConfiguration = {
    id: 'pipeline1',
    type: 'sequential',
    nqName: 'LibTests:MockWrapper5',
    provider: 'LibTests:MockProvider5',
    version: '1.0',
    approversGroup: 'MockGroup',
    stepTypes: [
      {
        id: 'step1',
        nqName: 'LibTests:TestAdd2Error',
        disableUIAdding: true,
        disableUIDragging: true,
        disableUIRemoving: true,
      },
      {
        id: 'step2',
        nqName: 'LibTests:TestMul2',
      },
      {
        id: 'pipeline2',
        type: 'static',
        disableUIDragging: true,
        disableUIRemoving: true,
        disableUIAdding: true,
        steps: [
          {
            id: 'step3',
            nqName: 'LibTests:TestSub2',

          },
          {
            id: 'step4',
            nqName: 'LibTests:TestDiv2',
          },
        ],
      },
    ],
    initialSteps: [{
      id: 'step1',
    }, {
      id: 'step2',
    }, {
      id: 'pipeline2',
    }],
    links: [{
      id: 'link1',
      from: 'in1:step1/a',
      to: 'out1:step2/a',
      handler({controller}) {
        controller.setAll('out1', 2, 'restricted');
        return;
      },
    }],
  };
  return config2;
}
