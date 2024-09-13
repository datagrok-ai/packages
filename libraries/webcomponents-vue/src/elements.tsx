import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import type {DGBigButtonT, DGButtonT, DGComboPopupT, DGIconFAT, DGSplitH, DGToggleInputT} from '@datagrok-libraries/webcomponents';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-button': DGButtonT,
      'dg-big-button': DGBigButtonT,
      'dg-split-h': DGSplitH,
      'dg-icon-fa': DGIconFAT,
      'dg-toggle-input': DGToggleInputT
      'dg-combo-popup': DGComboPopupT
    }
  }
}

export const Button = Vue.defineComponent({
  name: 'Button',
  emits: ['click'],
  setup(_props, {slots, attrs, emit}) {
    return () => (<button v-bind={attrs} onClick={(p) => emit('click', p)} is="dg-button">{slots.default ? slots.default() : ''}</button>);
  },
});

export const BigButton = Vue.defineComponent({
  name: 'BigButton',
  emits: ['click'],
  setup(_props, {slots, attrs, emit}) {
    return () => (<button v-bind={attrs} onClick={(p) => emit('click', p)} is="dg-big-button">{slots.default ? slots.default() : ''}</button>);
  },
});


export const SplitH = Vue.defineComponent({
  name: 'SplitH',
  props: {
    resize: Boolean,
  },
  setup(props, {slots, attrs, emit}) {
    return () =>{
      return (<dg-split-h
        resize={props.resize}
        v-bind={attrs}
        style={{height: '100%', width: '100%'}}
      >
        {slots.default ? slots.default() : []}
      </dg-split-h>);
    };
  },
});

export const IconFA = Vue.defineComponent({
  name: 'IconFA',
  props: {
    name: String,
    cursor: {
      type: String,
      default: 'pointer',
    },
    animation: {
      type: Object as Vue.PropType<'spin' | 'pulse' | null>,
      default: null,
    },
    tooltip: {
      type: String as Vue.PropType<string | null>,
      default: null,
    },
    faStyle: {
      type: String as Vue.PropType<'fal' | 'fas' | 'far' | 'fad'>,
      default: 'fal'
    }
  },
  emits: [
    'click',
  ],
  setup(props, {emit}) {
    return () => {
      return (<dg-icon-fa
        name={props.name}
        cursor={props.cursor}
        animation={props.animation}
        tooltip={props.tooltip}
        faStyle={props.faStyle}
        onClick={(e: Event) => emit('click', e)}
      >
      </dg-icon-fa>);
    };
  },
});

export const ToggleInput = Vue.defineComponent({
  name: 'IconFA',
  props: {
    caption: {
      type: String,
      required: true,
    },
    value: {
      type: Boolean,
      default: false,
    },
    nullable: {
      type: Boolean,
      default: false,
    },
    tooltip: {
      type: String,
    }
  },
  emits: {
    'update:value': (value: boolean) => value,
  },
  setup(props, {emit, attrs}) {
    return () => <dg-toggle-input 
      caption={props.caption}
      value={props.value}
      nullable={props.nullable}
      tooltip={props.tooltip}
      onValueChanged={(event: any) => emit('update:value', event.detail)}
    />
  }
})

export const ComboPopup = Vue.defineComponent({
  name: 'ComboPopup',
  props: {
    caption: { 
      type: Object as Vue.PropType<String | HTMLElement>,
      required: true,
    },
    items: {
      type: Array<String>,
      default: []
    }
  },
  emits: {
    'selected': (value: {item: string, itemIdx: number}) => value,
  },
  setup(props, { emit }){
    return () => <dg-combo-popup 
      caption={props.caption}
      items={props.items}
      onSelected={(e: any) => emit('selected', e.detail)}
    />
  }
})
