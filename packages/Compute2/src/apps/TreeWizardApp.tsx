import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Vue from 'vue';
import '@he-tree/vue/style/default.css';
import '@he-tree/vue/style/material-design.css';
import { TreeWizard } from '../components/TreeWizard/TreeWizard';

export const TreeWizardApp = Vue.defineComponent({
  name: 'TreeWizardApp',
  props: {
    providerFunc: {type: String, required: true},
  },
  setup(props) {
    return () => (
      <TreeWizard providerFunc={props.providerFunc}/>
    )
  },
});
