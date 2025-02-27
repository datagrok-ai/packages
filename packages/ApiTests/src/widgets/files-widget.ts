import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {before, category, expect, test, awaitCheck} from '@datagrok-libraries/utils/src/test';


category('Widgets', () => {
  let testConnection: DG.DataConnection;
  let packageDataConnection: DG.DataConnection;
  const labelSelector = '.d4-tree-view-tri.d4-tree-view-tri-expanded + i + .d4-tree-view-group-label';

  before(async () => {
    testConnection = await grok.dapi.connections.filter('shortName = "Home"').first();
    packageDataConnection = await grok.dapi.connections.filter('shortName = "AppData"').first();
  });

  test('Files', async () => {
    const fw = DG.FilesWidget.create();
    expect(fw instanceof DG.FilesWidget, true, 'fw');
    expect(fw.root instanceof HTMLElement, true, 'fw.root');
    expect(fw.root.classList.contains('d4-tree-view-root'), true, 'fw.root.classList');
    expect(ui.fileBrowser() instanceof DG.FilesWidget, true, 'fw.fileBrowser()');

    if (testConnection) {
      const testFW = ui.fileBrowser({path: testConnection.nqName});
      grok.shell.newView('', [testFW.root]);
      await awaitCheck(()=> !testFW.root.querySelector('.grok-loader') &&
        testFW.root.querySelector('div.d4-tree-view-tri-expanded[name="tree-expander-My-files"]') !== null, 'Home timeout', 30000);
    
      const label = $(testFW.root).find(labelSelector)[0];
      expect(label != null, true, 'label');
      expect(label!.textContent, testConnection.friendlyName, 'label!.textContent');
    }
    
    if (packageDataConnection) {
      const packageName = 'ApiTests';
      const packageDir = 'datasets';
      const testFW = ui.fileBrowser({path: `${packageDataConnection.nqName}/${packageName}/${packageDir}`});
      grok.shell.newView('', [testFW.root]);
      await awaitCheck(()=> !testFW.root.querySelector('.grok-loader') &&
        testFW.root.querySelector(`div[name="tree-App-Data---${packageName}---${packageDir}"]`) !== null, 'AppData timeout', 30000);
      
      const labels = $(testFW.root).find(labelSelector);
      expect(labels[0] != null, true, 'labels[0]');
      expect(labels[0]!.textContent, packageDataConnection.friendlyName, 'labels[0]!.textContent');
      expect(labels[1] != null, true, 'labels[1]');
      expect(labels[1]!.textContent, packageName, 'labels[1]!.textContent');
    }
  }, {timeout: 100000, owner: 'dkovalyov@datagrok.ai'});
});
