import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {category, before, after, expect, test, delay, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {setDialogInputValue, isColumnPresent} from './gui-utils';


category('UI info panel', () => {
  let v: DG.TableView;
  let smiles: DG.DataFrame;

  before(async () => {
    grok.shell.closeAll();
    grok.shell.windows.showProperties = true;
  });


  test('gasteiger', async () => {
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
    if (!gpc?.classList.contains('expanded')) gpc?.click();
    await awaitCheck(() => pp.querySelector('.grok-scripting-image-container-info-panel') !== null,
      'Gasteiger charges script output was not rendered in the panel', 10000);
    const pecilIcon = document.getElementsByClassName('grok-icon fal fa-pencil')[0] as HTMLElement;
    pecilIcon?.click();
    const contours = document
      .getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-gasteiger_partial_charges')[0]
      .getElementsByClassName('ui-input-editor')[0] as HTMLInputElement;
    contours.value = '15';
    const applyBtn = document
      .getElementsByClassName('d4-accordion-pane-content ui-div d4-pane-gasteiger_partial_charges')[0]
      .getElementsByClassName('ui-btn ui-btn-ok')[0] as HTMLElement;
    applyBtn?.click();
    await delay(50);
    gpc?.click();
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('identifiers', async () => {
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
    if (!ih?.classList.contains('expanded')) ih?.click();
    await awaitCheck(() => (ih.nextSibling as HTMLElement)
      .querySelector('table') !== null, 'cannot load Identifiers', 15000);
    const it = ih.nextSibling as HTMLElement;
    for (const i of ['SCHEMBL5536145', '18722989', 'CHEMBL2262190']) {
      expect(Array.from(it.querySelectorAll('.ui-link.d4-link-external'))
        .find((el) => el.textContent === i) !== undefined, true);
    }
    ih?.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('structure2D', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Structure', 3000);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    const s2d = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === '2D Structure') as HTMLElement;
    if (!s2d.classList.contains('expanded')) s2d?.click();
    await awaitCheck(() => (s2d.nextSibling as HTMLElement).querySelector('.chem-canvas') !== null,
      'canvas with structure was not rendered in the panel', 3000);
    s2d?.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('structure3D', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Structure', 3000);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, '3D Structure', 3000);
    const s3d = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === '3D Structure') as HTMLElement;
    if (!s3d?.classList.contains('expanded')) s3d?.click();
    await awaitCheck(() => (s3d.nextSibling as HTMLElement).querySelector('canvas') !== null,
      'canvas with structure was not rendered in the panel', 10000);
    s3d?.click(); await delay(100);
    v?.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('properties', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Properties', 10000);
    const p = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Properties') as HTMLElement;
    if (!p?.classList.contains('expanded')) p?.click();
    await awaitCheck(() => (p.nextSibling as HTMLElement).querySelector('table') !== null,
      'table with properties was not rendered in the panel', 3000);
    p?.click(); await delay(100);
    v?.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('toxicity', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Toxicity', 10000);
    const t = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Toxicity') as HTMLElement;
    if (!t?.classList.contains('expanded')) t?.click();
    await awaitCheck(() => (t.nextSibling as HTMLElement).querySelector('table') !== null,
      'table with toxicity was not rendered in the panel', 3000);
    t?.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('drug likeness', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Drug Likeness', 3000);
    const dl = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Drug Likeness') as HTMLElement;
    if (!dl?.classList?.contains('expanded')) dl?.click();
    await awaitCheck(() => (dl.nextSibling as HTMLElement).querySelectorAll('.d4-flex-col.ui-div').length === 50,
      'number of displayed canvases with molecules does not match the expected', 10000);
    dl?.click(); await delay(10);
    v?.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('structural alerts', async () => {
    smiles = grok.data.demo.molecules();
    grok.shell.o = ui.div();
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology');
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    await delay(1000);
    smiles.currentCell = smiles.cell(2, 'smiles');
    await delay(1000);
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Structural Alerts', 3000);
    const sa = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Structural Alerts') as HTMLElement;
    if (!sa?.classList.contains('expanded')) sa?.click();
    await awaitCheck(() => {
      return (sa?.nextSibling as HTMLElement).querySelectorAll('.chem-canvas').length === 10;
    },
      'number of displayed canvases with molecules does not match the expected', 10000);
    sa?.click(); await delay(10);
    v?.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('descriptors', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Chemistry');
    (document.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Descriptors', 3000);
    const desc = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Descriptors') as HTMLElement;
    if (!desc?.classList.contains('expanded')) desc?.click();
    await awaitCheck(() => (desc.nextSibling as HTMLElement).querySelector('table') !== null,
      'descriptors table hasn\'t been created', 20000);
    desc?.click(); await delay(100);
  }, {stressTest: true});

  after(async () => {
    grok.shell.closeAll();
  });
});

async function awaitPanel(pp: HTMLElement, name: string, ms: number = 5000): Promise<void> {
  await awaitCheck(() => {
    return Array.from(pp?.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === name) !== undefined;
  }, `cannot find ${name} property`, ms);
}
