import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import type {ValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/data/common-types';
import type {InputFormT} from '@datagrok-libraries/webcomponents';
import type {ConsistencyInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';
import {injectInputBaseStatus, isInputInjected} from './utils';
import {BehaviorSubject, merge} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {useExtractedObservable} from '@vueuse/rxjs';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-input-form': InputFormT
    }
  }
}

export const InputForm = Vue.defineComponent({
  name: 'InputForm',
  props: {
    funcCall: {
      type: Object as Vue.PropType<DG.FuncCall>,
      required: true,
    },
    skipInit: {
      type: Boolean,
      default: true,
    },
    validationStates: {
      type: Object as Vue.PropType<Record<string, ValidationResult>>,
    },
    consistencyStates: {
      type: Object as Vue.PropType<Record<string, ConsistencyInfo>>,
    },
    callMeta: {
      type: Object as Vue.PropType<Record<string, BehaviorSubject<any>>>,
    },
    isReadonly: {
      type: Boolean,
    },
  },
  emits: {
    formReplaced: (a: DG.InputForm | undefined) => a,
    inputChanged: (a: DG.EventData<DG.InputArgs>) => a,
    validationChanged: (a: boolean) => a,
    actionRequested: (actionUuid: string) => actionUuid,
    consistencyReset: (ioName: string) => ioName,
  },
  setup(props, {emit}) {
    const currentCall = Vue.computed(() => Vue.markRaw(props.funcCall));
    const validationStates = Vue.computed(() => props.validationStates);
    const consistencyStates = Vue.computed(() => props.consistencyStates);
    const isReadonly = Vue.computed(() => props.isReadonly);
    const skipInit = Vue.computed(() => props.skipInit);

    const states = Vue.reactive({
      meta: {} as Record<string, any>,
    });

    useExtractedObservable(() => props.callMeta, (meta) => {
      states.meta = {};
      const entries = Object.entries(meta).map(([name, state$]) => state$.pipe(map((s) => [name, s] as const)));
      return merge(...entries).pipe(
        tap(([k, val]) => {
          states.meta[k] = Object.freeze(val);
        }),
      );
    });

    const currentForm = Vue.shallowRef(undefined as undefined | DG.InputForm);

    Vue.watchEffect(() => {
      if (!currentForm.value) return;

      [...currentCall.value.inputParams.values()]
        .filter((param) => (currentForm.value!.getInput(param.property.name)))
        .forEach((param) => {
          const input = currentForm.value!.getInput(param.property.name);
          const validationState = validationStates.value?.[param.property.name];
          const consistencyState = consistencyStates.value?.[param.property.name];

          if (!isInputInjected(input))
            injectInputBaseStatus(emit, param.property.name, input);

          (input as any).setStatus({
            validation: validationState,
            consistency: consistencyState,
          });

          input.enabled = !isReadonly.value && consistencyState?.restriction !== 'disabled';
        });
    });

    Vue.watch([currentForm, states.meta], ([form, meta]) => {
      if (!form) return;

      [...currentCall.value.inputParams.values()]
        .filter((param) => (form!.getInput(param.property.name)))
        .forEach((param) => {
          const input = form!.getInput(param.property.name);
          const paramItems = meta[param.property.name]?.['items'];
          if (paramItems && input.inputType === DG.InputType.Choice)
            (input as DG.ChoiceInput<any>).items = paramItems;
          const rangeMeta = meta[param.property.name]?.['range'];
          if (rangeMeta && (input.inputType === DG.InputType.Float || input.inputType === DG.InputType.Int)) {
            // TODO: FormApi
            console.log(rangeMeta);
          }
        });
    });

    const formReplacedCb = async (event: {detail?: DG.InputForm}) => {
      emit('formReplaced', event.detail);
      currentForm.value = event.detail;
    };

    return () =>
      <dg-input-form
        skipInit={skipInit.value}
        funcCall={currentCall.value}
        onFormReplaced={formReplacedCb}
        onInputChanged={(ev: CustomEvent<DG.EventData<DG.InputArgs>>) => emit('inputChanged', ev.detail)}
        onValidationChanged={(ev: CustomEvent<boolean>) => emit('validationChanged', ev.detail)}>
      </dg-input-form>;
  },
});
