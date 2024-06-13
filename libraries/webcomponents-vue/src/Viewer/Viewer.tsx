import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {defineComponent} from 'vue';
import type {ViewerT} from '@datagrok-libraries/webcomponents/src';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dg-viewer': ViewerT
    }
  }
}

export const Viewer = defineComponent({
  name: 'Viewer',
  props: {
    type: String,
    dataFrame: DG.DataFrame,
    viewer: DG.Viewer,
  },
  emits: {
    viewerChanged: (a: DG.Viewer<any>) => a,
  },
  setup(props, {emit}) {
    const viewerChangedCb = (event: any) => {
      emit('viewerChanged', event.detail);
    };
    return () => {
      const viewer = <dg-viewer
        type={props.type} dataFrame={props.dataFrame} viewer={props.viewer} onViewerChanged={viewerChangedCb}>
      </dg-viewer>;
      return (
        <keep-alive>
          { viewer }
        </keep-alive>
      );
    };
  },
});
