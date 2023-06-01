import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {category, test, before, after, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import {readDataframe} from './utils';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import { ScaffoldTreeViewer } from '../widgets/scaffold-tree';


category('scaffold tree', () => {

  before(async () => {
    grok.shell.closeAll();
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
  });

  // check that scaffold viewer openes without errors
  test('scaffoldTreeViewerOpens', async () => {
    const df = DG.Test.isInBenchmark ? await grok.data.files.openTable("Demo:Files/chem/smiles_50K.zip") :
        await readDataframe('tests/sar-small_test.csv');
    const tv = grok.shell.addTableView(df);
    const stviewer = tv.addViewer(ScaffoldTreeViewer.TYPE);
    await awaitCheck(() => stviewer.root.getElementsByClassName('d4-tree-view-group-host')[0].children.length > 0,
        'scaffold tree has not been generated', DG.Test.isInBenchmark ? 3600000 : 60000);

  });

  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
  });
});