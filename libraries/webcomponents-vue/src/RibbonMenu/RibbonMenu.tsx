import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

export const RibbonMenu = Vue.defineComponent({
  name: 'RibbonMenu',
  props: {
    groupName: {
      type: String,
      required: true,
    },
    view: {
      type: DG.ViewBase,
      required: true,
    },
  },
  slots: Object as Vue.SlotsType<{
    default?: Vue.VNode[],
  }>,
  setup(props, {slots}) {
    const elements = Vue.reactive(new Map<number, HTMLElement>);

    const currentView = Vue.computed(() => Vue.markRaw(props.view));

    Vue.watch(elements, () => {
      const elementsArray = [...elements.values()];
      currentView.value.ribbonMenu
        .group(props.groupName)
        .clear();

      currentView.value.ribbonMenu
        .group(props.groupName).items(elementsArray, () => {});
    }, {flush: 'post'});

    const addElement = (el: Element | null | any, idx: number) => {
      const content = el;
      if (content)
        elements.set(idx, content);
    };

    Vue.onUnmounted(() => {
      currentView.value.ribbonMenu
        .group(props.groupName)
        .clear();

      currentView.value.ribbonMenu.remove(props.groupName);
    });

    Vue.onBeforeUpdate(() => {
      elements.clear();
    });

    return () =>
      slots.default?.()
        .filter((slot) => slot.type !== Symbol.for('v-cmt'))
        .flatMap((slot) => slot.type === Symbol.for('v-fgt') ? slot.children: slot)
        .map((slot, idx) =>
          <div slot-idx={`${idx}`} style={{width: '100%'}} ref={(el) => addElement(el, idx)}> { slot } </div>,
        );
  },
});
