/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {FuncCallInput} from '@datagrok-libraries/compute-utils/shared-utils/input-wrappers';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';
import equal from 'deep-equal';
import {
  PipelineConfiguration,
  ValidationInfo, makeAdvice, makeRevalidation, makeValidationResult,
} from '@datagrok-libraries/compute-utils';
import type {ViewerT, InputFormT} from '@datagrok-libraries/webcomponents';

export const _package = new DG.Package();

//tags: init
export async function init() {
  await DG.Func.byName('WebComponents:init').prepare().call();
}

//
// Validators manual testing
//

class InputMock implements FuncCallInput {
  _value = new BehaviorSubject<any>(null);
  notify = true;
  enabled = true;
  root = ui.div('', {style: {width: '100%'}});
  // fake input
  input = ui.input.toggle('test', {value: true});

  constructor() {
    this.root.append(this.input.root);
  }

  set value(v: any) {
    const nv = v ? JSON.parse(v) : '';
    this._value.next(nv);
  }

  get value() {
    if (!this._value.value)
      return '';

    return JSON.stringify(this._value.value);
  }

  onInput(fn: Function) {
    return this._value.pipe(distinctUntilChanged(equal)).subscribe(() => {
      if (this.notify)
        fn(this.value);
    });
  }
}

//name: CustomInputMock
//input: object params
//output: object input
export async function CustomInputMock(params: any): Promise<FuncCallInput> {
  console.log(params);
  return new InputMock();
}

//name: RangeValidatorFactory
//input: object params
//output: object validator
export function RangeValidatorFactory(params: any) {
  const {min, max} = params;
  return (val: number) => {
    if (val < min || val > max)
      return makeValidationResult({errors: [`Out of range [${min}, ${max}] value: ${val}`]});
  };
}

//name: AsyncValidatorDemoFactory
//input: object params
//output: object validator
export function AsyncValidatorDemoFactory(params: any) {
  return async (val: number) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (val === 0)
      return makeValidationResult({warnings: [`Try non-null value`]});
  };
}

//name: GlobalValidatorDemoFactory
//input: object params
//output: object validator
export function GlobalValidatorDemoFactory(params: any) {
  const {max} = params;
  return async (_val: number, info: ValidationInfo) => {
    if (info.isRevalidation) {
      if (info.context?.isOk)
        return makeValidationResult();
      return makeValidationResult({warnings: [`Try lowering a value as well`]});
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const {a, b, c} = info.funcCall.inputs;
    const s = a + b + c;
    const isOk = s <= max;
    const valRes = isOk ? makeValidationResult() : makeValidationResult({warnings: [`Try lowering a value`]});
    const fields = ['a', 'b', 'c'].filter((p) => p !== info.param);
    return makeRevalidation(fields, {isOk}, valRes);
  };
}

//name: ValidatorActionsDemoFactory
//input: object params
//output: object validator
export function ValidatorActionsDemoFactory(params: any) {
  return async (_val: number, info: ValidationInfo) => {
    const notifications = [makeAdvice('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', [
      {actionName: 'First action', action: () => grok.shell.info('First action')},
      {actionName: 'Another action', action: () => {
        ui.dialog({title: 'Another action'}).show({center: true, fullScreen: true});
      }},
    ])];
    if (info.lastCall && info.funcCall.inputs.x !== info.lastCall.inputs.x) {
      const delta = info.funcCall.inputs.x - info.lastCall.inputs.x;
      const warnings = [makeAdvice(`Param delta change ${delta}`)];
      return makeValidationResult({warnings, notifications});
    }
    return makeValidationResult({notifications});
  };
}

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
