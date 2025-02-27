import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';
import {v4 as uuidv4} from 'uuid';

export const RibbonPanel = Vue.defineComponent({
  name: 'RibbonPanel',
  props: {
    view: {
      type: DG.ViewBase,
      required: true,
    },
  },
  slots: Object as Vue.SlotsType<{
    default?: any,
  }>,
  setup(props, {slots}) {
    const elements = Vue.reactive(new Map<number, HTMLElement>);
    const currentView = Vue.computed(() => Vue.markRaw(props.view));
    const uuid = uuidv4();

    const isInstanceManagedPanel = (panel: HTMLElement[]) => {
      return panel.some((ribbonItem) => (ribbonItem.children[0] as any)?.RibbonPanelUUID === uuid);
    };

    const filterEmptyPanels = (panels: HTMLElement[][]) => {
      return panels.filter((panel) => panel.some((ribbonItem) => (ribbonItem.children?.length)));
    };

    Vue.watch(elements, () => {
      // Workaround for ui.comboPopup elements. It doesn't work if it is not a direct child of '.d4-ribbon-item'
      elements.forEach((elem) => {
        const content = ((elem.firstChild?.nodeType !== Node.TEXT_NODE) ? elem.firstChild: elem.firstChild.nextSibling) as HTMLElement | null;

        if (content && content.tagName.toLowerCase().includes('dg-combo-popup')) {
          content.classList.add('d4-ribbon-item');
          elem.parentElement?.classList.remove('d4-ribbon-item');
        }
      });

      const panels = currentView.value.getRibbonPanels();
      const existingPanelIdx = panels.findIndex(isInstanceManagedPanel);
      const panel = [...elements.values()];

      // Nothing to add/remove
      if (existingPanelIdx < 0 && panel.length == 0) {
        currentView.value.setRibbonPanels(filterEmptyPanels(panels));
        return;
      }

      if (existingPanelIdx >= 0 && panel.length == 0) // Remove panel
        panels.splice(existingPanelIdx, 1);
      else if (existingPanelIdx >= 0) // Replace panel
        panels.splice(existingPanelIdx, 1, panel);
      else // Add new panel
        panels.push(panel);

      currentView.value.setRibbonPanels(filterEmptyPanels(panels));
    });

    const addElement = (el: Element | null | any, idx: number) => {
      const content = el;
      if (content) {
        (content).RibbonPanelUUID = uuid;
        elements.set(idx, content);
      } else
        elements.delete(idx);
    };

    Vue.onUnmounted(async () => {
      const notInstanceManagedPanels = currentView.value
        .getRibbonPanels()
        .filter((panel) => !isInstanceManagedPanel(panel));

      await Vue.nextTick();
      if (!currentView.value.closing)
        currentView.value.setRibbonPanels(filterEmptyPanels(notInstanceManagedPanels));
    });

    return () =>
      slots.default?.().filter((slot: any) => slot.type !== Symbol.for('v-cmt')).map((slot: any, idx: number) =>
        <div slot-idx={`${idx}`} ref={(el) => addElement(el, idx)}> { slot } </div>,
      );
  },
});
