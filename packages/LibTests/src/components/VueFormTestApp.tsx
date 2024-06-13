/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {InputForm} from '@datagrok-libraries/webcomponents-vue/src';
import {defineComponent, shallowRef, ref, onMounted} from 'vue';

export const VueFormTestApp = defineComponent({
  name: 'VueFormTestApp',
  mounted() {
    console.log('VueFormTestApp mounted');
  },
  unmounted() {
    console.log('VueFormTestApp unmounted');
  },
  setup() {
    const fc = shallowRef<DG.FuncCall | undefined>(undefined);
    let func: DG.Func | undefined;

    onMounted(async () => {
      func = await grok.functions.eval('LibTests:simpleInputs');
    });

    const logFuncCall = () => {
      console.log(Object.entries(fc.value?.inputs ?? {}));
    };

    const changeFuncCall = () => {
      if (!func)
        return;
      const nfc = func.prepare({
        a: 1,
        b: 2,
        c: 3,
      });
      fc.value = nfc;
    };

    const removeFuncCall = () => {
      fc.value = undefined;
    };

    return () => (
      <div style={{width: '100%', height: '100%'}}>
        <button onClick={logFuncCall}>log funccall inputs</button>
        <button onClick={changeFuncCall}>change funcall</button>
        <button onClick={removeFuncCall}>remove funcall</button>
        <InputForm funcCall={fc.value}></InputForm>
      </div>
    );
  },
});
