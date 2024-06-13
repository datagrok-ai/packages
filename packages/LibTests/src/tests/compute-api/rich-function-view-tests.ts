import * as DG from 'datagrok-api/dg';
import {category, test, before, delay} from '@datagrok-libraries/utils/src/test';
import {createRFV, initComputeApi} from '@datagrok-libraries/compute-api';
import {take, filter} from 'rxjs/operators';
import {applyTransformations} from '@datagrok-libraries/utils/src/json-serialization';
import {getFuncCallIO} from '../utils';
import {expectDeepEqual} from '@datagrok-libraries/utils/src/expect';
import fc1 from '../snapshots/fc1.json';
import {InputVariants} from '@datagrok-libraries/compute-utils/function-views/src/rich-function-view';

category('Compute API: RFV Inputs', async () => {
  before(async () => {
    await initComputeApi();
  });

  test('Simple inputs setParamValue', async () => {
    const view = createRFV('Libtests:simpleInputs');
    const inputValues: Record<string, any> = {
      a: 1,
      b: 2.2,
      c: 'test',
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    view.funcCall.setParamValue('a', 1);
    view.funcCall.setParamValue('b', 2.2);
    view.funcCall.setParamValue('c', 'test');
    await view.doRun();
    const expected = {
      'inputs': [
        [
          'a',
          1,
        ],
        [
          'b',
          2.2,
        ],
        [
          'c',
          'test',
        ],
      ],
      'outputs': [
        [
          'aout',
          1,
        ],
        [
          'bout',
          2.2,
        ],
        [
          'cout',
          'test',
        ],
      ],
    };
    expectDeepEqual(getFuncCallIO(view.funcCall), expected, {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), expected, {prefix: 'lastCall'});
    for (const [name, val] of Object.entries(inputValues))
      expectDeepEqual(inputsMap[name].value, val, {prefix: `input ${name}`});

  });

  test('Simple inputs inputs tweak', async () => {
    const view = createRFV('Libtests:simpleInputs');
    const inputValues: Record<string, any> = {
      a: 1,
      b: 2.2,
      c: 'test',
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    for (const [name, input] of Object.entries(inputsMap)) {
      input.value = inputValues[name];
      const element = (input as any).input;
      element.dispatchEvent(new Event('input', {bubbles: true}));
    }
    await delay(300);
    await view.doRun();
    const expected = {
      'inputs': [
        [
          'a',
          1,
        ],
        [
          'b',
          2.2,
        ],
        [
          'c',
          'test',
        ],
      ],
      'outputs': [
        [
          'aout',
          1,
        ],
        [
          'bout',
          2.2,
        ],
        [
          'cout',
          'test',
        ],
      ],
    };
    expectDeepEqual(getFuncCallIO(view.funcCall), expected, {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), expected, {prefix: 'lastCall'});
  });

  test('Simple inputs setParamValue rerun', async () => {
    const view = createRFV('Libtests:simpleInputsDefaultValues');
    const inputValues: Record<string, any> = {
      a: 2,
      b: 3.2,
      c: 'test2',
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });

    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    await view.doRun();
    view.funcCall.setParamValue('a', 2);
    view.funcCall.setParamValue('b', 3.2);
    view.funcCall.setParamValue('c', 'test2');
    await view.doRun();
    const expected = {
      'inputs': [
        [
          'a',
          2,
        ],
        [
          'b',
          3.2,
        ],
        [
          'c',
          'test2',
        ],
      ],
      'outputs': [
        [
          'aout',
          2,
        ],
        [
          'bout',
          3.2,
        ],
        [
          'cout',
          'test2',
        ],
      ],
    };
    expectDeepEqual(getFuncCallIO(view.funcCall), expected, {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), expected, {prefix: 'lastCall'});
    for (const [name, val] of Object.entries(inputValues))
      expectDeepEqual(inputsMap[name].value, val, {prefix: `input ${name}`});
  });

  test('Simple inputs inputs tweak rerun', async () => {
    const view = createRFV('Libtests:simpleInputsDefaultValues');
    const inputValues: Record<string, any> = {
      a: 2,
      b: 3.2,
      c: 'test2',
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    await view.doRun();
    await delay(100);
    for (const [name, input] of Object.entries(inputsMap)) {
      input.value = inputValues[name];
      const element = (input as any).input;
      element.dispatchEvent(new Event('input', {bubbles: true}));
    }
    await delay(300);
    await view.doRun();
    const expected = {
      'inputs': [
        [
          'a',
          2,
        ],
        [
          'b',
          3.2,
        ],
        [
          'c',
          'test2',
        ],
      ],
      'outputs': [
        [
          'aout',
          2,
        ],
        [
          'bout',
          3.2,
        ],
        [
          'cout',
          'test2',
        ],
      ],
    };
    expectDeepEqual(getFuncCallIO(view.funcCall), expected, {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), expected, {prefix: 'lastCall'});
  });

  test('Simple inputs default values', async () => {
    const view = createRFV('Libtests:simpleInputsDefaultValues');
    
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    const expected = {
      'inputs': [
        [
          'a',
          1,
        ],
        [
          'b',
          2.2,
        ],
        [
          'c',
          'test',
        ],
      ],
    };
    expectDeepEqual(getFuncCallIO(view.funcCall).inputs, expected.inputs);
  });

  test('Complex inputs setParamValue', async () => {
    const view = createRFV('Libtests:complexInputs');
    const inputValues: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [1.1, 2.2, 3.3]),
      ]),
      data: JSON.stringify({a: 1, b: 'test'}),
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.funcCallReplaced.pipe(take(1)).toPromise();
    view.funcCall.setParamValue('df', inputValues['df']);
    view.funcCall.setParamValue('data', inputValues['data']);
    await view.doRun();
    expectDeepEqual(getFuncCallIO(view.funcCall), applyTransformations(fc1), {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), applyTransformations(fc1), {prefix: 'lastCall'});
    expectDeepEqual(inputsMap.data.value, inputValues.data, {prefix: 'data'});
  });

  test('Complex inputs inputs tweak', async () => {
    const view = createRFV('Libtests:complexInputs');
    const inputValues: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [1.1, 2.2, 3.3]),
      ]),
      data: JSON.stringify({a: 1, b: 'test'}),
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    inputsMap['data'].value = inputValues['data'];
    // TODO: test df input, not rly used rn
    view.funcCall.setParamValue('df', inputValues['df']);
    await delay(300);
    await view.doRun();
    expectDeepEqual(getFuncCallIO(view.funcCall), applyTransformations(fc1), {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), applyTransformations(fc1), {prefix: 'lastCall'});
    expectDeepEqual(inputsMap.data.value, inputValues.data, {prefix: 'data'});
  });

  test('Complex inputs setParamValue rerun', async () => {
    const view = createRFV('Libtests:complexInputs');
    const inputValuesPre: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [11.1, 12.2, 13.3]),
      ]),
      data: JSON.stringify({a: 2, b: 'pretest'}),
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    view.funcCall.setParamValue('df', inputValuesPre['df']);
    view.funcCall.setParamValue('data', inputValuesPre['data']);
    await view.doRun();
    const inputValues: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [1.1, 2.2, 3.3]),
      ]),
      data: JSON.stringify({a: 1, b: 'test'}),
    };
    view.funcCall.setParamValue('df', inputValues['df']);
    view.funcCall.setParamValue('data', inputValues['data']);
    await view.doRun();
    expectDeepEqual(getFuncCallIO(view.funcCall), applyTransformations(fc1), {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), applyTransformations(fc1), {prefix: 'lastCall'});
    expectDeepEqual(inputsMap.data.value, inputValues.data, {prefix: 'data'});
  });

  test('Complex inputs inputs tweak rerun', async () => {
    const view = createRFV('Libtests:complexInputs');
    const inputValuesPre: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [11.1, 12.2, 13.3]),
      ]),
      data: JSON.stringify({a: 2, b: 'pretest'}),
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(100);
    inputsMap['data'].value = inputValuesPre['data'];
    // TODO: test df input, not rly used rn
    view.funcCall.setParamValue('df', inputValuesPre['df']);
    await delay(300);
    await view.doRun();
    const inputValues: Record<string, any> = {
      df: DG.DataFrame.fromColumns([
        DG.Column.fromList('double', 'col', [1.1, 2.2, 3.3]),
      ]),
      data: JSON.stringify({a: 1, b: 'test'}),
    };
    inputsMap['data'].value = inputValues['data'];
    // TODO: test df input, not rly used rn
    view.funcCall.setParamValue('df', inputValues['df']);
    await delay(300);
    await view.doRun();
    expectDeepEqual(getFuncCallIO(view.funcCall), applyTransformations(fc1), {prefix: 'funcCall'});
    expectDeepEqual(getFuncCallIO(view.lastCall!), applyTransformations(fc1), {prefix: 'lastCall'});
    expectDeepEqual(inputsMap.data.value, inputValues.data, {prefix: 'data'});
  });

});

category('Compute API: RFV Validation', async () => {
  before(async () => {
    await initComputeApi();
  });

  test('Validate on start', async () => {
    const view = createRFV('Libtests:validationTest');
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(1500);
    const results = view.getValidationState();
    expectDeepEqual(
      results,
      {
        'a': {
          'errors': [
            {
              'description': 'Missing value',
            },
            {
              'description': 'Out of range [1, 10] value: null',
            },
          ],
          'warnings': [],
          'notifications': [],
          'revalidate': [],
          'context': {},
        },
        'b': {
          'errors': [
            {
              'description': 'Missing value',
            },
            {
              'description': 'Out of range [20, 100] value: null',
            },
          ],
          'warnings': [],
          'notifications': [],
          'revalidate': [],
          'context': {},
        },
        'x': {
          'errors': [],
          'warnings': [
            {
              'description': 'Try non-null value',
            },
          ],
          'notifications': [],
          'revalidate': [],
          'context': {},
        },
      },
    );
  });

  test('Validate on input', async () => {
    const view = createRFV('Libtests:validationTest');
    const inputValues: Record<string, any> = {
      a: 2.3,
      b: 3.2,
      x: -1,
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(1500);
    for (const [name, input] of Object.entries(inputsMap)) {
      input.value = inputValues[name];
      const element = (input as any).input;
      element.dispatchEvent(new Event('input', {bubbles: true}));
    }
    await delay(400);

    const results = view.getValidationState();
    expectDeepEqual(
      results,
      {
        'b': {
          'errors': [
            {
              'description': 'Out of range [20, 100] value: 3.2',
            },
          ],
        },
      },
    );
  });

  test('Revalidation sequence', async () => {
    const view = createRFV('Libtests:globalValidationTest');
    const inputValues: Record<string, any> = {
      a: 30,
      b: 40,
      c: 50,
    };
    const inputsMap: Record<string, InputVariants> = {};
    view.afterInputPropertyRender.subscribe(({prop, input}) => {
      inputsMap[prop.name] = input;
    });
    await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
    await delay(1500);
    for (const [name, input] of Object.entries(inputsMap)) {
      input.value = inputValues[name];
      const element = (input as any).input;
      element.dispatchEvent(new Event('input', {bubbles: true}));
    }
    await delay(500);
    const results = view.getValidationState();
    expectDeepEqual(
      results,
      {
        'a': {
          'revalidate': [
            'b',
            'c',
          ],
          'context': {
            'isOk': false,
          },
          'warnings': [
            {
              'description': 'Try lowering a value',
            },
          ],
        },
        'b': {
          'warnings': [
            {
              'description': 'Try lowering a value as well',
            },
          ],
        },
        'c': {
          'warnings': [
            {
              'description': 'Try lowering a value as well',
            },
          ],
        },
      },
    );
  });

});
