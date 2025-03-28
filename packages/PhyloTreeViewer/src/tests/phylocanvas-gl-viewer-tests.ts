import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_package} from '../package-test';
import {after, before, category, test, expect, expectArray, expectObject} from '@datagrok-libraries/utils/src/test';
import {IPhylocanvasGlViewer} from '@datagrok-libraries/bio/src/viewers/phylocanvas-gl-viewer';
import {getTreeHelper, ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';

category('phylocanvasGlViewer', () => {
  let viewList: DG.ViewBase[];
  let dfList: DG.DataFrame[];
  let currentView: DG.ViewBase;
  let treeHelper: ITreeHelper;

  before(async () => {
    viewList = [];
    dfList = [];
    currentView = grok.shell.v;
    treeHelper = await getTreeHelper();
  });

  after(async () => {
    viewList.forEach((v) => { v.close(); });
    dfList.forEach((df) => { grok.shell.closeTable(df); });
    if (!!currentView) grok.shell.v = currentView;
  });

  test('open', async () => {
    await _testOpen();
  });

  async function _testOpen() {
    const newickStr = await _package.files.readAsText(`data/tree95.nwk`);
    const treeDf: DG.DataFrame = treeHelper.newickToDf(newickStr, 'tree95');

    const tv = grok.shell.addTableView(treeDf, DG.DOCK_TYPE.FILL);

    const viewer: IPhylocanvasGlViewer = (await treeDf.plot.fromType('PhylocanvasGl', {
      interactive: true,
      alignLabels: true,
      showLabels: true,
      showLeafLabels: true,
      padding: 0,
      treeToCanvasRatio: 1,
    })) as unknown as IPhylocanvasGlViewer;

    const viewerOnAfterRenderPromise = new Promise<void>((resolve, reject) => {
      try {
        viewer.onAfterRender.subscribe(({gl}) => {
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
    const treeDn = tv.dockManager.dock(viewer as unknown as DG.Viewer, DG.DOCK_TYPE.LEFT);
    await viewerOnAfterRenderPromise;
    let k = 11;
  }
});
