import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BigButton, Button} from '@datagrok-libraries/webcomponents-vue/src';
import {defineComponent} from 'vue';

export const VueElementsTestApp = defineComponent({
  name: 'VueElementsTestApp',
  setup() {
    return () => (
      <keep-alive>
        <div style={{width: '100%', height: '100%'}}>
          <button onClick={() => grok.shell.info('Button clicked')} is='dg-button'>click me</button>
          <button onClick={() => grok.shell.info('Big Button clicked')} is='dg-big-button'>click me</button>
          <Button onClick={() => grok.shell.info('Button clicked')}>click me</Button>
          <BigButton onClick={() => grok.shell.info('Big Button clicked')}>click me</BigButton>
        </div>
      </keep-alive>
    );
  },
});
