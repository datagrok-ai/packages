import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {category, before, after, expect, test, delay, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {isColumnPresent, returnDialog, setDialogInputValue} from './gui-utils';
import {ensureContainersRunning, readDataframe} from './utils';
import {ScaffoldTreeViewer} from '../widgets/scaffold-tree';

category('UI top menu', () => {
  let v: DG.TableView;
  let smiles: DG.DataFrame;

  before(async () => {
    grok.shell.closeAll();
    grok.shell.windows.showProperties = true;
    await ensureContainersRunning();
  });

  test('similarity search', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Similarity Search...').click();
    await awaitCheck(() => document.querySelector('.d4-chem-similarity-search') !== null,
      'cannot load Similarity Search viewer', 2000);
    const similarityViewer = Array.from(v.viewers)[1];
    await awaitCheck(() => similarityViewer.root.querySelectorAll('.chem-canvas').length === 12,
      'molecules number inside Similarity viewer is different than expected', 3000);
    similarityViewer.props.distanceMetric = 'Dice';
    similarityViewer.props.limit = 5;
    await awaitCheck(() => similarityViewer.root.querySelectorAll('.chem-canvas').length === 5,
      'molecules number inside Similarity viewer is different than expected after change "Limit" property', 3000);
    const similarityLable = similarityViewer.root.getElementsByClassName('chem-similarity-prop-value')[1] as HTMLElement;
    if (similarityLable.innerText != '0.22')
      throw new Error('Expected Similarity Lable for 2nd molecule does not match the "Dice" metric');
    const closeBtn = document.getElementsByClassName('panel-titlebar disable-selection panel-titlebar-tabhost')[0]
      ?.getElementsByClassName('grok-icon grok-font-icon-close')[0] as HTMLElement;
    closeBtn?.click();
    await awaitCheck(() => Array.from(v.viewers).length === 1, 'SimilaritySearch viewer was not closed', 1000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('diversity search', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Diversity Search...').click();
    await awaitCheck(() => document.querySelector('.d4-chem-diversity-search') !== null,
      'cannot load Diversity Search viewer', 2000);
    const dsvRoot = document.querySelector('.d4-chem-diversity-search') as HTMLElement;
    await awaitCheck(() => dsvRoot.querySelectorAll('.chem-canvas').length === 12, 'molecules number != 12', 3000);
    const dsv = Array.from(v.viewers)[1];
    dsv.setOptions({
      distanceMetric: 'Dice',
      size: 'normal',
    });
      dsv!.props.limit = 5;
      await awaitCheck(() => dsvRoot.querySelectorAll('.chem-canvas').length === 5, 'molecules number != 5', 3000);
      v.close();
      grok.shell.o = ui.div();
  });

  test('mutate', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Transform').find('Mutate...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot find Mutate dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0];
    await awaitCheck(() => dialog.inputs.length === 4, 'cannot load Mutate dialog', 1000);
    expect(dialog.input('Molecule').stringValue, 'CN1C(CC(O)C1=O)C1=CN=CC=C1');
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    const okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.name === 'mutations', 'cannot find mutations table', 20000);
    await delay(10);
    grok.shell.v.close();
    grok.shell.closeTable(grok.shell.t);
    v.close();
    grok.shell.o = ui.div();
  });

  test('curate', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    //await delay(50);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Transform').find('Curate...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open curate dialog', 2000);
    const dialog = returnDialog('Curate');
    await awaitCheck(() => dialog?.input('Kekulization') !== undefined, 'cannot open curate dialog', 2000);
    setDialogInputValue('Curate', 'Kekulization', true);
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    const okButton = dialog!.root.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => smiles.columns.names().includes('curated_molecule'), 'curated molecule hasn\'t been added', 10000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('map identifiers', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);


    await callDialog();
    setDialogInputValue('Chem Map Identifiers', 'To Source', 'inchi');
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    let okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.columns.contains('inchi'), 'cannot find inchi column', 15000);

    const chemblPackInstalled = DG.Func.find({package: 'ChemblApi', name: 'getCompoundsIds'}).length;
    if (chemblPackInstalled) {
      await callDialog();
      setDialogInputValue('Chem Map Identifiers', 'To Source', 'mcule');
      await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
      okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
      okButton!.click();
      await awaitCheck(() => grok.shell.t.columns.contains('mcule'), 'cannot find mcule column', 15000);

      await callDialog();
      setDialogInputValue('Chem Map Identifiers', 'To Source', 'chembl');
      await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
      okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
      okButton!.click();
      await awaitCheck(() => grok.shell.t.columns.contains('chembl'), 'cannot find chembl column', 15000);

      await callDialog();
      setDialogInputValue('Chem Map Identifiers', 'To Source', 'pubchem');
      await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
      okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
      okButton!.click();
      await awaitCheck(() => grok.shell.t.columns.contains('pubchem'), 'cannot find pubchem column', 15000);
    }
    v.close();
    grok.shell.o = ui.div();

    async function callDialog() {
      grok.shell.topMenu.find('Chem').group('Calculate').find('Map Identifiers...').click();
      await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot find Chem Map Identifiers dialog', 1000);
    }
  }, {timeout: 60000});

  test('substructure search', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Substructure Search...').click();
    await awaitCheck(() => document.querySelector('.grok-sketcher ') !== null, 'cannot open sketcher', 2000);
    v.close();
    grok.shell.o = ui.div();
  }, {skipReason: 'GROK-14121'});

  test('to inchi', async () => {
    await testGroup('Calculate', 'To InchI...', 'inchi', 'To InchI');
  }, {stressTest: true});

  test('to inchi keys', async () => {
    await testGroup('Calculate', 'To InchI Keys...', 'inchi_key', 'To InchI Keys');
  }, {stressTest: true});

  test('descriptors', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Calculate').find('Descriptors...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open descriptors dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    const lipinski = Array.from(dialog.querySelectorAll('.d4-tree-view-group-label'))
      .find((el) => el.textContent === 'Lipinski')!.previousSibling as HTMLElement;
    lipinski.click();
    await awaitCheck(() => {
      const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled');
      return okButton && okButton.length > 0;
    }, 'element columns haven\'t been added', 5000);
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => smiles.columns.length === 27, `expected 25 descriptors, got ${smiles.columns.length - 2}`, 3000);
    isColumnPresent(smiles.columns, 'FractionCSP3');
    isColumnPresent(smiles.columns, 'NumAromaticCarbocycles');
    isColumnPresent(smiles.columns, 'NumHAcceptors');
    isColumnPresent(smiles.columns, 'NumHeteroatoms');
    isColumnPresent(smiles.columns, 'NumRotatableBonds');
    isColumnPresent(smiles.columns, 'RingCount');
    v.close();
    grok.shell.o = ui.div();
  }, {stressTest: true});

  test('toxicity risks', async () => {
    await testGroup('Calculate', 'Toxicity Risks...', 'Mutagenicity', 'Toxicity risks');
  }, {stressTest: true});

  test('properties', async () => {
    await testGroup('Calculate', 'Properties...', 'MW', 'Chemical Properties');
  });

  test('rgroups', async () => {
    smiles = await readDataframe('tests/sar-small_test.csv');
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Analyze').find('R-Groups Analysis...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open rgroups dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    const mcsButton = dialog.getElementsByClassName('chem-mcs-button')[0] as HTMLElement;
    mcsButton?.click();
    await delay(2000);
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => smiles.columns.names().filter((cname) => !cname.startsWith('~')).length === 6,
      'rgroup columns haven\'t been added', 30000);
    await awaitCheck(() => {
      for (let v of grok.shell.tv.viewers) {
        if (v.type === DG.VIEWER.TRELLIS_PLOT)
          return true;
      }
      return false;
    }, 'trellis plot hasn\'t been added', 5000);
    await delay(2000);
    v.close();
    await delay(1000);
    grok.shell.o = ui.div();
  });

  test('structural alerts', async () => {
    await testGroup('Analyze', 'Structural Alerts...', 'PAINS (smiles)', 'Structural Alerts');
  });

  test('chem space', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Analyze').find('Chemical Space...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open chemical space dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => {
      if (smiles.columns.names().includes('Embed_X_1') && smiles.columns.names().includes('Embed_Y_1')) {
        const xCol = smiles.col('Embed_X_1');
        return new Array(xCol!.length).fill(0).every((ixt, idx) => !xCol?.isNone(idx));
      }
      return false;
    }, 'embedding columns haven\'t been added', 10000);
    await awaitCheck(() => {
      for (let v of grok.shell.tv.viewers) {
        if (v.type === DG.VIEWER.SCATTER_PLOT)
          return true;
      }
      return false;
    }, 'scatter plot hasn\'t been added', 5000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('activity cliffs', async () => {
    smiles = await readDataframe('tests/activity_cliffs_test.csv');
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Analyze').find('Activity Cliffs...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open activity cliffs dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    await awaitCheck(() => document.getElementsByClassName('ui-btn ui-btn-ok enabled').length > 0, 'cannot find dialog OK button', 1000);
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() =>
      smiles.columns.names().includes('Embed_X_1') &&
      smiles.columns.names().includes('Embed_Y_1') &&
      smiles.columns.names().includes('sali__1'),
    'embedding and sali columns haven\'t been added', 10000);
    await awaitCheck(() => {
      for (let v of grok.shell.tv.viewers) {
        if (v.type === DG.VIEWER.SCATTER_PLOT)
          return true;
      }
      return false;
    }, 'scatter plot hasn\'t been added', 5000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('elemental analysis', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Analyze').find('Elemental Analysis...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open elemental analysis dialog', 2000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    await awaitCheck(() => {
      const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled');
      return okButton && okButton.length > 0;
    }, 'element columns haven\'t been added', 5000);
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => smiles.columns.length === 11, 'element columns haven\'t been added', 5000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('scaffold tree', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Analyze').find('Scaffold Tree').click();
    await awaitCheck(() => Array.from(v.viewers).filter((it) => it.type === ScaffoldTreeViewer.TYPE).length > 0,
      'cannot create viewer', 3000);
    const generateLink = document.querySelector('.chem-scaffold-tree-generate-hint') as HTMLElement;
    if (generateLink)
      generateLink.click();
    const stviewer = Array.from(v.viewers).filter((it) => it.type === ScaffoldTreeViewer.TYPE)[0];
    await awaitCheck(() => stviewer.root.getElementsByClassName('d4-tree-view-group-host')[0].children.length > 0,
      'scaffold tree has not been generated', 250000);
    await delay(2000); //need to scaffold to finish generation
    v.close();
    grok.shell.o = ui.div();
  }, {timeout: 300000});

  after(async () => {
    grok.shell.closeAll();
  });
});


async function testGroup(groupName: string, funcName: string, colName: string, dlgName: string) {
  console.log(`testGroup, dlgName: ${dlgName}`);
  const smiles = grok.data.demo.molecules(20);
  const v = grok.shell.addTableView(smiles);
  await grok.data.detectSemanticTypes(smiles);
  await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
  grok.shell.topMenu.find('Chem').group(groupName).find(funcName).click();
  await getDlgAndClickOK(`cannot load ${funcName} dialog`, dlgName);
  await awaitCheck(() => v.dataFrame.columns.names().includes(colName), `${colName} column has not been added`, 10000);
  v.close();
  grok.shell.o = ui.div();
}


async function getDlgAndClickOK(error: string, header: string) {
  const dlg = () => {
    return Array.from(document.getElementsByClassName('d4-dialog'))
      .filter((dlg) => dlg.getElementsByClassName('d4-dialog-header')[0]
        .children[0].textContent?.toLocaleLowerCase() === header.toLocaleLowerCase());
  };
  await awaitCheck(() => {
    return dlg().length > 0;
  }, error, 5000);
  await delay(1000);
  Array.from(dlg()[0].getElementsByTagName('span')).find((el) => el.textContent === 'OK')?.click();
}
