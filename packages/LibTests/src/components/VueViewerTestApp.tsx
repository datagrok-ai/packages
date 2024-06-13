/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Viewer} from '@datagrok-libraries/webcomponents-vue/src';
import {defineComponent, shallowRef, ref} from 'vue';
import {from, useSubscription} from '@vueuse/rxjs';

export const VueViewerTestApp = defineComponent({
  name: 'VueViewerTestApp',
  mounted() {
    console.log('VueViewerTestApp mounted');
  },
  unmounted() {
    console.log('VueViewerTestApp unmounted');
  },
  setup() {
    const df = shallowRef<DG.DataFrame | undefined>(undefined);
    const type = ref<string | undefined>(undefined);
    const viewer = shallowRef<DG.Viewer | undefined>(undefined);

    let i = 0;
    const datasets = [grok.data.demo.demog(), grok.data.demo.doseResponse(), grok.data.demo.geo()];
    const changeData = () => {
      df.value = datasets[i];
      i++;
      i%=datasets.length;
    };
    let j = 0;
    const types = ['Grid', 'Histogram', 'Line chart', 'Scatter plot'];
    const changeType = () => {
      type.value = types[j];
      j++;
      j%=types.length;
    };
    useSubscription(from(viewer).subscribe((v) => console.log('viewer', v)));
    return () => (
      <div style={{width: '100%', height: '100%'}}>
        <button onClick={changeData}>change data</button>
        <button onClick={changeType}>change type</button>
        <Viewer type={type.value} dataFrame={df.value} onViewerChanged={(v) => viewer.value = v}></Viewer>
      </div>
    );
  },
});
