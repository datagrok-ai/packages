import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {category, test, before, after, awaitCheck, delay, expect} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import {createTableView, readDataframe} from './utils';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import {ScaffoldTreeViewer, updateVisibleNodes, value} from '../widgets/scaffold-tree';

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
    const df = DG.Test.isInBenchmark ? await readDataframe('smiles.csv') :
      await readDataframe('tests/sar-small_test.csv');
    if (!DG.Test.isInBenchmark) //leave only first 5 rows for scaffold tree analysis
      df.rows.removeAt(5, df.rowCount - 5);
    await grok.data.detectSemanticTypes(df);
    const tv = grok.shell.addTableView(df);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    tv.addViewer(ScaffoldTreeViewer.TYPE);
    await awaitCheck(() => Array.from(tv.viewers).filter((it) => it.type === ScaffoldTreeViewer.TYPE).length > 0,
      'cannot create viewer', 3000);
    const generateLink = document.querySelector('.chem-scaffold-tree-generate-hint') as HTMLElement;
    if (generateLink)
      generateLink.click();
    const stviewer = Array.from(tv.viewers).filter((it) => it.type === ScaffoldTreeViewer.TYPE)[0] as ScaffoldTreeViewer;
    await awaitCheck(() => stviewer.root.getElementsByClassName('d4-tree-view-group-host')[0].children.length > 0,
      'scaffold tree has not been generated', DG.Test.isInBenchmark ? 3600000 : 180000);
    await delay(2000); //need to scaffold to finish generation
    tv.close();
  }, {timeout: 190000, benchmark: true, stressTest: true, benchmarkTimeout: 300000});

  test('parent node contains H atom', async () => {
    const tv = await createTableView('mol1K.csv');
    await grok.data.detectSemanticTypes(tv.dataFrame);
    const scaffoldTree = new ScaffoldTreeViewer();
    const table = tv.dataFrame;
    await delay(1000);
    
    scaffoldTree.dataFrame = table;
    scaffoldTree.molCol = table.columns.bySemType(DG.SEMTYPE.MOLECULE);
    tv.dockManager.dock(scaffoldTree.root);
    await delay(1000);
  
    const molStr = 'Nc1ccccc1';
    const rootGroup = await scaffoldTree.createGroup(molStr, scaffoldTree.tree);
    const childGroup = await scaffoldTree.createGroup(molStr, rootGroup!);
    
    const pencilIcon = childGroup?.root.getElementsByClassName('fa-pencil')[0] as HTMLElement;
    pencilIcon.click();
  
    const dialog = Array.from(document.querySelectorAll('.d4-dialog')).find(dialog => 
      dialog.querySelector('.d4-dialog-title')?.textContent?.trim() === 'Edit Scaffold...'
    );
    
    const label = dialog?.querySelector('.ui-label') as HTMLElement;
    const warningExists = label?.textContent?.trim() === 'The edited molecule is not a superstructure of its parent';
    const isRedLabel = label?.style.color === 'red';
  
    expect(warningExists, false);
    expect(isRedLabel, false);
  });

  test('edit invalid structure', async () => {
    const tv = await createTableView('mol1K.csv');
    await grok.data.detectSemanticTypes(tv.dataFrame);
    const scaffoldTree = new ScaffoldTreeViewer();
    const table = tv.dataFrame;
  
    scaffoldTree.dataFrame = table;
    scaffoldTree.molCol = table.columns.bySemType(DG.SEMTYPE.MOLECULE);
    tv.dockManager.dock(scaffoldTree.root);
  
    // Add valid structure and validate
    const molStr = 'c1ccccc1';
    const rootGroup = await scaffoldTree.createGroup(molStr, scaffoldTree.tree);
    await updateVisibleNodes(scaffoldTree);
    rootGroup?.checkBox?.click();
    expect(table.filter.trueCount, 928);
  
    // Edit to invalid structure
    const invalidSmiles = 'CC(C)(C)(C)(C)c1ccccc1';
    await editStructure(scaffoldTree, rootGroup!, invalidSmiles);
    await scaffoldTree.updateFilters();
    expect(table.filter.trueCount, 0);
  
    // Revert to valid structure
    await editStructure(scaffoldTree, rootGroup!, molStr);
    await scaffoldTree.updateFilters();
    expect(table.filter.trueCount, 928);
  }, {skipReason: 'GROK-16714'});
  
  async function editStructure(scaffoldTree: ScaffoldTreeViewer, group: DG.TreeViewGroup, smiles: string) {
    await scaffoldTree.openEditSketcher(group);
    scaffoldTree.wrapper?.sketcher.setSmiles(smiles);
    const saveButton = scaffoldTree.wrapper?.dialog.root.querySelector('button[name="button-Save"]') as HTMLElement;
    const valueGroup = value(group);
    valueGroup.smiles = smiles;
    saveButton.click();
    await updateVisibleNodes(scaffoldTree);
  }
  
  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
  });
});
