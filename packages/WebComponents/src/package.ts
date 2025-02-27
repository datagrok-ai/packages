/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {
  InputForm, Viewer, DGBigButton,
  DGButton, DGIconFA,
  DGToggleInput, DGComboPopup, DGMarkdown,
} from '@datagrok-libraries/webcomponents';
import {DockSpawnTsWebcomponent} from '@datagrok-libraries/dock-spawn-dg/lib';

export const _package = new DG.Package();

let inited = false;

//tags: init
export async function init() {
  if (inited) return;

  customElements.define('dg-viewer', Viewer);
  customElements.define('dg-input-form', InputForm);
  customElements.define('dg-button', DGButton, {extends: 'button'});
  customElements.define('dg-big-button', DGBigButton, {extends: 'button'});
  customElements.define('dg-icon-fa', DGIconFA);
  customElements.define('dg-toggle-input', DGToggleInput);
  customElements.define('dg-combo-popup', DGComboPopup);
  customElements.define('dock-spawn-ts', DockSpawnTsWebcomponent);
  customElements.define('dg-markdown', DGMarkdown);
  inited = true;

  await Promise.all([
    customElements.whenDefined('dg-viewer'),
    customElements.whenDefined('dg-input-form'),
    customElements.whenDefined('dg-button'),
    customElements.whenDefined('dg-big-button'),
    customElements.whenDefined('dg-icon-fa'),
    customElements.whenDefined('dg-toggle-input'),
    customElements.whenDefined('dg-combo-popup'),
    customElements.whenDefined('dock-spawn-ts'),
    customElements.whenDefined('dg-markdown'),
  ]);

  console.log('webcomponents registered');
}
