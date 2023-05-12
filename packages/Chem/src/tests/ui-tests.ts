import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {category, before, after, expect, test, delay, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {setDialogInputValue, isColumnPresent} from './gui-utils';


category('UI', () => {
  let v: DG.TableView;
  let smiles: DG.DataFrame;

  before(async () => {
    grok.shell.closeAll();
    grok.shell.windows.showProperties = true; 
  });

  test('similarity search', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Similarity Search...').click();
    await awaitCheck(() => document.querySelector('.d4-chem-similarity-search') !== null, 'cannot load Similarity Search viewer', 2000);
    const similarityViewer = Array.from(v.viewers)[1];
    await awaitCheck(() => similarityViewer.root.querySelectorAll('.chem-canvas').length === 10,
      'molecules number inside Similarity viewer is different than expected', 3000);
    similarityViewer.props.distanceMetric = 'Dice';
    similarityViewer.props.limit = 5;
    await awaitCheck(() => similarityViewer.root.querySelectorAll('.chem-canvas').length === 5,
      'molecules number inside Similarity viewer is different than expected after change "Limit" property', 3000);
    const similarityLable = similarityViewer.root.getElementsByClassName('similarity-prop-value')[1] as HTMLElement;
    if (similarityLable.innerText != '0.22')
      throw 'Expected Similarity Lable for 2nd molecule does not match the "Dice" metric';
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
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Diversity Search...').click();
    await awaitCheck(() => document.querySelector('.d4-chem-diversity-search') !== null, 'cannot load Diversity Search viewer', 2000);
    const dsvRoot = document.querySelector('.d4-chem-diversity-search') as HTMLElement;
    await awaitCheck(() => dsvRoot.querySelectorAll('.chem-canvas').length === 10, 'molecules number != 10', 3000);
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

  test('info panel: gasteiger', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    await delay(200);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Gasteiger Partial Charges');
    const gpc = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Gasteiger Partial Charges') as HTMLElement;
    if (!gpc.classList.contains('expanded')) gpc.click();
    await awaitCheck(() => pp.querySelector('.grok-scripting-image-container-info-panel') !== null,
      'Gasteiger charges script output was not rendered in the panel', 10000);
    const pecilIcon = document.getElementsByClassName('grok-icon fal fa-pencil')[0] as HTMLElement;
    pecilIcon?.click();
    const contours = document.getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-gasteiger_partial_charges')[0]
      .getElementsByClassName('ui-input-editor')[0] as HTMLInputElement;
    contours.value = '15';
    const applyBtn = document.getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-gasteiger_partial_charges')[0]
      .getElementsByClassName('ui-btn ui-btn-ok')[0] as HTMLElement;
    applyBtn?.click();
    await delay(50);
    gpc.click();
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: identifiers', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Structure');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Identifiers', 2000);
    const ih = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Identifiers') as HTMLElement;
    await delay(200);
    if (!ih.classList.contains('expanded')) ih.click();
    await awaitCheck(() => (ih.nextSibling as HTMLElement).querySelector('table') !== null, 'cannot load Identifiers', 15000);
    const it = ih.nextSibling as HTMLElement;
    for (const i of ['SCHEMBL5536145', '18722989', 'CHEMBL2262190']) {
      expect(Array.from(it.querySelectorAll('.ui-link.d4-link-external'))
        .find((el) => el.textContent === i) !== undefined, true);
    }
    ih.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: structure2D', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Structure', 3000);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    const s2d = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === '2D Structure') as HTMLElement;
    if (!s2d.classList.contains('expanded')) s2d.click();
    await awaitCheck(() => (s2d.nextSibling as HTMLElement).querySelector('.chem-canvas') !== null,
      'canvas with structure was not rendered in the panel', 3000);
    s2d.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: structure3D', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Structure', 3000);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, '3D Structure', 3000);
    const s3d = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === '3D Structure') as HTMLElement;
    if (!s3d.classList.contains('expanded')) s3d.click();
    await awaitCheck(() => (s3d.nextSibling as HTMLElement).querySelector('canvas') !== null,
      'canvas with structure was not rendered in the panel', 10000);
    s3d.click(); await delay(100);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: properties', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Properties');
    const p = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Properties') as HTMLElement;
    if (!p.classList.contains('expanded')) p.click();
    await awaitCheck(() => (p.nextSibling as HTMLElement).querySelector('table') !== null,
      'table with properties was not rendered in the panel', 3000);
    p.click(); await delay(100);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: toxicity', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Toxicity', 3000);
    const t = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Toxicity') as HTMLElement;
    if (!t.classList.contains('expanded')) t.click();
    await awaitCheck(() => (t.nextSibling as HTMLElement).querySelector('table') !== null,
      'table with toxicity was not rendered in the panel', 3000);
    t.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: drug likeness', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Drug Likeness', 3000);
    const dl = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Drug Likeness') as HTMLElement;
    if (!dl.classList.contains('expanded')) dl.click();
    await awaitCheck(() => (dl.nextSibling as HTMLElement).querySelectorAll('.d4-flex-col.ui-div').length === 50,
      'number of displayed canvases with molecules does not match the expected', 5000);
    dl.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('info panel: structural alerts', async () => {
    smiles = grok.data.demo.molecules();
    grok.shell.o = ui.div();
    v = grok.shell.addTableView(smiles);
    smiles.currentCell = smiles.cell(2, 'smiles');
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    await delay(200);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Structural Alerts', 3000);
    const sa = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Structural Alerts') as HTMLElement;
    if (!sa.classList.contains('expanded')) sa.click();
    await awaitCheck(() => (sa.nextSibling as HTMLElement).querySelectorAll('.d4-flex-col.ui-div').length === 10,
      'number of displayed canvases with molecules does not match the expected', 10000);
    sa.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  }, {skipReason: 'GROK-12226'});

  test('chem inputs', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Transform').find('Mutate...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot find Mutate dialog', 1000);
    const dialog = DG.Dialog.getOpenDialogs()[0];
    expect(dialog.input('Molecule').stringValue, 'CN1C(CC(O)C1=O)C1=CN=CC=C1');
    const okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.name === 'mutations', 'cannot find mutations table', 10000);
    await delay(10);
    grok.shell.v.close();
    grok.shell.closeTable(grok.shell.t);
    v.close();
    grok.shell.o = ui.div();
  });

  test('map identifiers', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    const smilesCol = smiles.columns.byName('smiles');
    grok.shell.o = smilesCol;
    await awaitCheck(() => {
      return Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
        .find((el) => el.textContent === 'Details') !== undefined;
    }, 'cannot load Smiles column properties', 10000);
    const actions = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Actions') as HTMLElement;
    if (!actions.classList.contains('expanded')) await actions.click();
    await callDialog();
    setDialogInputValue('Chem Map Identifiers', 'To Source', 'inchi');
    let okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.columns.contains('inchi'), 'cannot find inchi column', 10000);

    await callDialog();
    setDialogInputValue('Chem Map Identifiers', 'To Source', 'mcule');
    okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.columns.contains('mcule'), 'cannot find mcule column', 10000);

    await callDialog();
    setDialogInputValue('Chem Map Identifiers', 'To Source', 'chembl');
    okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.columns.contains('chembl'), 'cannot find chembl column', 10000);

    await callDialog();
    setDialogInputValue('Chem Map Identifiers', 'To Source', 'pubchem');
    okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton!.click();
    await awaitCheck(() => grok.shell.t.columns.contains('pubchem'), 'cannot find pubchem column', 10000);
    v.close();
    grok.shell.o = ui.div();

    async function callDialog() {
      const mi = Array.from(pp.querySelectorAll('.d4-link-action'))
        .find((el) => el.textContent === 'Chem | Map Identifiers...') as HTMLElement;
      mi.click();
      await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot find Chem Map Identifiers dialog', 1000);
    }
  }, {skipReason: 'GROK-12226'});

  test('descriptors', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    const smilesCol = smiles.columns.byName('smiles');
    grok.shell.o = smilesCol;
    await awaitCheck(() => {
      return Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
        .find((el) => el.textContent === 'Details') !== undefined;
    }, 'cannot load Smiles column properties', 5000);
    const actions = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Actions') as HTMLElement;
    if (!actions.classList.contains('expanded')) await actions.click();
    const descriptors = Array.from(pp.querySelectorAll('.d4-link-action'))
      .find((el) => el.textContent === 'Chem | Descriptors...') as HTMLElement;
    descriptors.click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot find Descriptors dialog', 1000);
    const dialog = DG.Dialog.getOpenDialogs()[0].root;
    const lipinski = Array.from(dialog.querySelectorAll('.d4-tree-view-group-label'))
      .find((el) => el.textContent === 'Lipinski')!.previousSibling as HTMLElement;
    lipinski.click();
    const okButton = dialog.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton?.click();
    await awaitCheck(() => smiles.columns.length === 20, 'columns length != 20', 3000);
    isColumnPresent(smiles.columns, 'FractionCSP3');
    isColumnPresent(smiles.columns, 'NumAromaticCarbocycles');
    isColumnPresent(smiles.columns, 'NumHAcceptors');
    isColumnPresent(smiles.columns, 'NumHeteroatoms');
    isColumnPresent(smiles.columns, 'NumRotatableBonds');
    isColumnPresent(smiles.columns, 'RingCount');
    v.close();
    grok.shell.o = ui.div();
  }, {skipReason: 'GROK-12226'});

  test('fingerprints', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    grok.shell.o = smiles.columns.byName('smiles');
    await awaitCheck(() => {
      return findAccordionPanelElement(pp, 'Actions') !== undefined;
    }, 'cannot load Smiles column properties', 5000);
    expandAccordionPane(pp, 'Actions');
    (Array.from(pp.querySelectorAll('.d4-link-action'))
      .find((el) => el.textContent === 'Chem | Fingerprints...') as HTMLElement).click();
    await getDlgAndClickOK('cannot load Fingerprints dialog');
    await delay(1000);
    expect(smiles.columns.names().includes('Fingerprints'), true, `Fingerprints column has not been added`);
  }, {skipReason: 'GROK-13025'});

  test('substructure search', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Search').find('Substructure Search...').click();
    await awaitCheck(() => document.querySelector('.grok-sketcher ') !== null, 'cannot open sketcher', 2000);
    v.close();
    grok.shell.o = ui.div();
  });

  test('to inchi', async () => {
    await testCalculateGroup('To InchI...', 'inchi');
  });

  test('to inchi keys', async () => {
    await testCalculateGroup('To InchI Keys...', 'inchi_key');
  });

  after(async () => {
    grok.shell.closeAll();
  });
});

async function awaitPanel(pp: HTMLElement, name: string, ms: number = 5000): Promise<void> {
  await awaitCheck(() => {
    return Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === name) !== undefined;
  }, `cannot find ${name} property`, ms);
}

async function testCalculateGroup(funcName: string, colName: string) {
  const smiles = grok.data.demo.molecules(20);
  const v = grok.shell.addTableView(smiles);
  await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
  grok.shell.topMenu.find('Chem').group('Calculate').find(funcName).click();
  await getDlgAndClickOK(`cannot load ${funcName} dialog`);
  await awaitCheck(() => v.dataFrame.columns.names().includes(colName), `${colName} column has not been added`, 10000);
  v.close();
  grok.shell.o = ui.div();
}

function findAccordionPanelElement(propPanel: HTMLElement, elName: string): HTMLElement {
  return Array.from(propPanel.querySelectorAll('div.d4-accordion-pane-header'))
    .find((el) => el.textContent === 'Actions') as HTMLElement;
}

async function expandAccordionPane(propPanel: HTMLElement, elName: string) {
  const pane = findAccordionPanelElement(propPanel, elName);
  if (!pane.classList.contains('expanded')) 
    await pane.click();
}

async function getDlgAndClickOK(error: string) {
  await awaitCheck(() => {
    return document.querySelector('.d4-dialog') !== null;
  }, error, 5000);
  await delay(1000);
  Array.from(document.querySelector('.d4-dialog')!.getElementsByTagName('span'))
    .find((el) => el.textContent === 'OK')?.click();
}
