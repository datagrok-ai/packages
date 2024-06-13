import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {defineComponent} from 'vue';
import type {InputFormT} from '@datagrok-libraries/webcomponents/src';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-input-form': InputFormT
    }
  }
}

export const InputForm = defineComponent({
  name: 'InputForm',
  props: {
    funcCall: DG.FuncCall,
  },
  emits: {
    formChanged: (a: DG.Form) => a,
  },
  setup(props, {emit}) {
    const formChangedCb = (event: any) => {
      emit('formChanged', event.detail);
    };
    return () => {
      const form = <dg-input-form funcCall={props.funcCall} onFormChanged={formChangedCb}></dg-input-form>;
      return (
        <keep-alive>
          { form }
        </keep-alive>
      );
    };
  },
});
