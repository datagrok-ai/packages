/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {getAxolabsTab} from '../axolabs-tab/axolabs-tab';

export class AxolabsTabUI {
  constructor() {
    this._htmlDivElement = getAxolabsTab();
  }

  private _htmlDivElement;

  get htmlDivElement() { return this._htmlDivElement; }
}
