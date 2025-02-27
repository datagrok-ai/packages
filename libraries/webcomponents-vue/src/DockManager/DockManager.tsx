import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import type {IState} from '@datagrok-libraries/dock-spawn-dg/src/interfaces/IState';
// cannot use DockSpawnTsWebcomponent typings in strict mode
type DockSpawnTsWebcomponent = any

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dock-spawn-ts': DockSpawnTsWebcomponent
    }
  }
}

export const DockManager = Vue.defineComponent({
  name: 'DockManager',
  props: {
    activePanelTitle: Object as Vue.PropType<String>,
  },
  slots: Object as Vue.SlotsType<{
    default?: Vue.VNode[],
  }>,
  emits: {
    'panelClosed': (element: HTMLElement) => element,
    'update:activePanelTitle': (newPanel: string | null, prevPanel: string | null) => {},
    'initFinished': () => {},
  },
  methods: {
    //@ts-ignore
    getLayout: (): string | null => {},
    useLayout: async (layout: string) => {},
  },
  setup(props, {slots, emit, expose}) {
    const dockSpawnRef = Vue.ref(null as DockSpawnTsWebcomponent | null);

    const inited = Vue.ref(false);
    Vue.watch(inited, async () => {
      dockSpawnRef.value!.dockManager.getElementCallback = async (state: IState) => {
        let aimSlot = null as null | HTMLElement;

        const slots = dockSpawnRef.value!.shadowRoot!
          .querySelectorAll(`slot`);
        slots.forEach((slot: any) => {
          const content = (slot.assignedElements() as HTMLElement[])
            .find((el) => el.getAttribute('dock-spawn-title') && el.getAttribute('dock-spawn-title') === state.element);
          if (content) aimSlot = slot;
        });

        return {
          element: aimSlot!,
          title: state.element!,
        };
      };
    }, {once: true});

    const getLayout = () => {
      return dockSpawnRef.value?.getLayout() ?? null;
    };

    const useLayout = async (layout: string) => {
      await dockSpawnRef.value?.useLayout(layout);
    };
    expose({
      'getLayout': getLayout,
      'useLayout': useLayout,
    });

    return () => {
      return <dock-spawn-ts
        style={{'width': '100%'}}
        activePanelTitle={props.activePanelTitle}
        onPanelClosed={(ev: {detail: any}) => emit('panelClosed', ev.detail)}
        onActivePanelChanged={(ev: {detail: {newPanel: string | null, prevPanel: string | null}}) => emit('update:activePanelTitle', ev.detail.newPanel, ev.detail.prevPanel)}
        onInitFinished={() => {inited.value = true; emit('initFinished');}}
        ref={dockSpawnRef}
      >
        { slots.default?.() }
      </dock-spawn-ts>;
    };
  },
});
