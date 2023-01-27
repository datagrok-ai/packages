import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {filter} from "rxjs/operators";

export class DemoView extends DG.ViewBase {
  tree: DG.TreeViewGroup = ui.tree();

  constructor() {
    super();

    this._initToolbox();
    this._initContent();
  }

  _initContent() {
    this.root.appendChild(ui.divText('Select a demo from the toolbox on the right'));
  }

  _initToolbox() {
    for (let f of DG.Func.find({meta: {'demoPath': null}})) {
      let pathOption = f.options[DG.FUNC_OPTIONS.DEMO_PATH];
      let path = pathOption.split('|').map((s) => s.trim());
      let folder = this.tree.getOrCreateGroup(path.slice(0, path.length - 1).join(' | '));
      let item = folder.item(path[path.length - 1]);
      item.root.onmousedown = (_) => {
        grok.shell.closeAll();
        f.apply().then((_) => { });
      };
    }

    this.toolbox = this.tree.root;
  }
}