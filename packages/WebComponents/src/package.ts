/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {InputForm, Viewer, DGBigButton, DGButton} from '@datagrok-libraries/webcomponents/src';

export const _package = new DG.Package();

//tags: autostart
export function registerWebcomponents() {
  console.log('registerWebcomponents');
  customElements.define('dg-viewer', Viewer);
  customElements.define('dg-input-form', InputForm);
  customElements.define('dg-button', DGButton, {extends: 'button'});
  customElements.define('dg-big-button', DGBigButton, {extends: 'button'});
}
