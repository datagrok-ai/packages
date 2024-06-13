import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {defineComponent} from 'vue';
import type {DGBigButtonT, DGButtonT} from '@datagrok-libraries/webcomponents/src';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-button': DGButtonT,
      'dg-big-button': DGBigButtonT,
    }
  }
}

export const Button = defineComponent({
  name: 'Button',
  emits: ['click'],
  setup(_props, {slots, attrs, emit}) {
    return () => (<button v-bind={attrs} onClick={(p) => emit('click', p)} is="dg-button">{slots.default ? slots.default() : ''}</button>);
  },
});

export const BigButton = defineComponent({
  name: 'BigButton',
  emits: ['click'],
  setup(_props, {slots, attrs, emit}) {
    return () => (<button v-bind={attrs} onClick={(p) => emit('click', p)} is="dg-big-button">{slots.default ? slots.default() : ''}</button>);
  },
});
