import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  App, Editor, HelmType, IHelmWebEditor
} from '@datagrok-libraries/bio/src/helm/types';

import {JSDraw2HelmModule, OrgHelmModule, ScilModule} from './types';

declare const scil: ScilModule;
declare const JSDraw2: JSDraw2HelmModule;
declare const org: OrgHelmModule;

export class HelmWebEditor implements IHelmWebEditor {
  editor: Editor<HelmType>;
  host: HTMLDivElement;

  w = 200;
  h = 100;

  constructor() {
    this.host = ui.div([], {style: {width: `${this.w}px`, height: `${this.h}px`}});
    this.editor = new JSDraw2.Editor(this.host, {width: this.w, height: this.h, viewonly: true});
  }

  resizeEditor(w: number, h: number) {
    this.editor.setSize(w, h);
  }
}

export function buildWebEditorApp(view: HTMLDivElement): App {
  org.helm.webeditor.MolViewer.molscale = 0.8;
  const app = new org.helm.webeditor.App(view, {
    showabout: false,
    mexfontsize: '90%',
    mexrnapinontab: true,
    topmargin: 20,
    mexmonomerstab: true,
    sequenceviewonly: false,
    mexfavoritefirst: true,
    mexfilter: true
  });
  const sizes = app.calculateSizes();
  app.canvas.resize(sizes.rightwidth - 100, sizes.topheight - 210);
  let s = {width: sizes.rightwidth - 100 + 'px', height: sizes.bottomheight + 'px'};
  scil.apply(app.sequence.style, s);
  scil.apply(app.notation.style, s);
  s = {width: sizes.rightwidth + 'px', height: (sizes.bottomheight + app.toolbarheight) + 'px'};
  scil.apply(app.properties.parent.style, s);
  app.structureview.resize(sizes.rightwidth, sizes.bottomheight + app.toolbarheight);
  app.mex.resize(sizes.topheight - 80);

  return app;
}
