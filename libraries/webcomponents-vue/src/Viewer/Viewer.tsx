import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';

import type {ViewerT} from '@datagrok-libraries/webcomponents';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-viewer': ViewerT
    }
  }
}

export const Viewer = Vue.defineComponent({
  name: 'Viewer',
  props: {
    type: String,
    dataFrame: DG.DataFrame,
    options: Object as Vue.PropType<Record<string, string | boolean | string[]>>,
  },
  emits: {
    viewerChanged: (v: DG.Viewer<any> | undefined) => v,
  },
  setup(props, {emit}) {
    const currentDf = Vue.computed(() => props.dataFrame ? Vue.markRaw(props.dataFrame) : undefined);
    const viewerChangedCb = (event: any) => {
      emit('viewerChanged', event.detail);
    };
    return () => <Vue.KeepAlive>
      <dg-viewer
        type={props.type}
        options={props.options}
        dataFrame={currentDf.value}
        onViewerChanged={viewerChangedCb}
        style={{display: 'block', flexGrow: '1'}}
      >
      </dg-viewer>
    </Vue.KeepAlive>;
  },
});
