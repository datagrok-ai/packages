import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {category, before, after, expect, test, delay, awaitCheck} from '@datagrok-libraries/utils/src/test';

const identifiers: {[key: string]: string} = {
  'Smiles': 'CN1CCC(Oc2ccc(C(F)(F)F)cc2)CC1',
  'Inchi': 'InChI=1S/C13H16F3NO/c1-17-8-6-12(7-9-17)18-11-4-2-10(3-5-11)13(14,15)16/h2-5,12H,6-9H2,1H3',
  'Inchi key': 'LYQFNMXUTCIRCY-UHFFFAOYSA-N'};


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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const cp = await awaitPanel(pp, 'Chemistry');
    await delay(200);
    (cp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const sp = await awaitPanel(pp, 'Structure');
    (sp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Identifiers', 2000);
    const ih = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Identifiers') as HTMLElement;
    await delay(200);
    if (!ih?.classList.contains('expanded')) ih?.click();
    await awaitCheck(() => (ih.nextSibling as HTMLElement)
      .querySelector('table') !== null, 'cannot load Identifiers', 15000);
    const it = ih.nextSibling as HTMLElement;
    //re-wrote using for loops instead of Array.from and filter since getting OOM when trying to debug in chrome with breakpoints
    const rowsElAr = it.querySelectorAll('tr');
    for (const key of Object.keys(identifiers)) {
      let found = false;
      innerLoop:
      for (let i = 0; i < rowsElAr.length; i++) {
        const label = (rowsElAr[i].children[0].children[0] as HTMLElement).innerText;
        const value = (rowsElAr[i].children[1].children[0] as HTMLElement).innerText;
        if (label === key && value === identifiers[key]) {
          found = true;
          break innerLoop;
        }
      }
      expect(found, true, `${key} identifier not found`);
    }
    const chemblPackInstalled = DG.Func.find({package: 'ChemblApi', name: 'getCompoundsIds'}).length;
    if (chemblPackInstalled) {
      const links = it.querySelectorAll('.ui-link');
      for (const i of ['SCHEMBL5536145', '18722989', 'CHEMBL2262190']) {
        let found = false;
        innerLoop:
        for (let j = 0; j < links.length; j++) {
          if (links[j].textContent === i) {
            found = true;
            break innerLoop;
          }
        }
        expect(found, true, `${i} identifier not found`);
      }
    }
    const pubChemPackInstalled = DG.Func.find({package: 'PubchemApi', name: 'GetIupacName'}).length;
    if (pubChemPackInstalled) {
      await awaitCheck(()=> {
        const divs = Array.from(it.querySelectorAll('div'))
          .filter((it) => (it as HTMLElement).innerText === '1-methyl-4-[4-(trifluoromethyl)phenoxy]piperidine');
        return divs.length > 0;
      }, 'Incorrect name', 3000);
    }
    ih?.click(); await delay(10);
    v.close();
    (document.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    grok.shell.o = ui.div();
  });

  test('structure2D', async () => {
    smiles = grok.data.demo.molecules(20);
    v = grok.shell.addTableView(smiles);
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const sp = await awaitPanel(pp, 'Structure', 3000);
    (sp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const sp = await awaitPanel(pp, 'Structure', 3000);
    (sp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const cp = await awaitPanel(pp, 'Chemistry');
    (cp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const bp = await awaitPanel(pp, 'Biology');
    (bp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const bp = await awaitPanel(pp, 'Biology');
    (bp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
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
    await grok.data.detectSemanticTypes(smiles);
    smiles.currentCell = smiles.cell(2, 'smiles');
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const bp = await awaitPanel(pp, 'Biology');
    (bp.querySelector('.fa-chevron-square-up') as HTMLElement)?.click();
    await delay(1000);
    (bp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Structural Alerts', 3000);
    const sa = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Structural Alerts') as HTMLElement;
    if (!sa?.classList.contains('expanded')) sa?.click();
    await delay(100);
    await delay(1000);
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
    await grok.data.detectSemanticTypes(smiles);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    const cp = await awaitPanel(pp, 'Chemistry');
    (cp.querySelector('.fa-chevron-square-down') as HTMLElement)?.click();
    await awaitPanel(pp, 'Descriptors', 3000);
    const desc = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Descriptors') as HTMLElement;
    if (!desc?.classList.contains('expanded')) desc?.click();
    await awaitCheck(() => (desc.nextSibling as HTMLElement).querySelector('table') !== null,
      'descriptors table hasn\'t been created', 20000);
    desc?.click(); await delay(100);
  });

  after(async () => {
    grok.shell.closeAll();
  });
});

async function awaitPanel(pp: HTMLElement, name: string, ms: number = 5000): Promise<Element> {
  await awaitCheck(() => {
    return Array.from(pp?.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === name) !== undefined;
  }, `cannot find ${name} property`, ms);
  return Array.from(pp!.querySelectorAll('div.d4-accordion-pane-header')).find((el: any) => el.textContent === name)!;
}
