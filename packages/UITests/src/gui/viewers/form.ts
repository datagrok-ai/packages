import {after, before, category, delay, expect,
  expectArray, test, awaitCheck} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {isViewerPresent} from '../gui-utils';


category('Viewers: Form', () => {
  let tv: DG.TableView;
  let demog: DG.DataFrame;

  before(async () => {
    demog = grok.data.demo.demog(1000);
  });

  test('form.visual', async () => {
    tv = grok.shell.addTableView(demog);
    const formIcon = document.getElementsByClassName('svg-form')[0] as HTMLElement;
    formIcon.click();
    await awaitCheck(() => document.querySelector('.d4-form') !== null, 'cannot find form', 3000);
    isViewerPresent(Array.from(tv.viewers), 'Form');
    const form = document.querySelector('[name=viewer-Form]') as HTMLElement;
    const left = form.getElementsByClassName('grok-icon fal fa-chevron-left')[0] as HTMLElement; 
    const right = form.getElementsByClassName('grok-icon fal fa-chevron-right')[0] as HTMLElement;
    const select = form.getElementsByClassName('grok-icon fal fa-square')[0] as HTMLElement;
    const edit = form.getElementsByClassName('grok-icon fal fa-edit')[0] as HTMLElement;
    const design = form.getElementsByClassName('grok-icon fal fa-object-ungroup')[0] as HTMLElement; 
    for (let i = 0; i < 10; i++) {
      right.click();
      if (i % 2 === 0) select.click();
    }
    for (let i = 0; i < 13; i++) left.click();
    const selected = tv.dataFrame.selection.getSelectedIndexes().length;
    expect(selected, 5);
    edit.click();
    Array.from(form.getElementsByClassName('d4-host-element-panel')).forEach((el, i) => {
      if (i % 2 !== 0 && i < 10)
      //@ts-ignore
        el.firstChild.value = 1;
      const event = new Event('input', {
        bubbles: true,
        cancelable: true,
      });
      el.firstChild?.dispatchEvent(event);
    });
    const arr = Array.from(tv.dataFrame.currentRow.cells).map((c) => c.value).slice(0, 5);
    expectArray(arr, [1, '1', '1', 1, '1']);
    design.click();
    const protpertiesBtn = document.getElementsByClassName('panel-titlebar disable-selection panel-titlebar-tabhost')[0]
      .getElementsByClassName('grok-icon grok-font-icon-settings')[0] as HTMLElement;
    protpertiesBtn.click();
    await awaitCheck(() => document.querySelector('.property-grid-item-editor-checkbox') !== null,
      'cannot find context panel', 3000);
    const checkboxes = Array.from(document.querySelectorAll('.property-grid-item-editor-checkbox'));
    for (const cb of checkboxes) {
      (cb as HTMLElement).click();
      await delay(10);
    }
  });

  test('form.api', async () => {
    tv = grok.shell.addTableView(demog);
    debugger
    const form = tv.form({
      title: 'SuperTitle',
      description: 'SuperDescription',
    });
    await awaitCheck(() => document.querySelector('.d4-form') !== null, 'cannot find form', 3000);
    if (form.props.title != 'SuperTitle')
      throw new Error('title has not been set');
    if (form.props.description != 'SuperDescription')
      throw new Error('description has not been set');
    const titleElemList = Array.from(document.querySelectorAll('#elementContent .panel-titlebar .panel-titlebar-text')) as HTMLElement[];
    const descElem = document.querySelector('#elementContent .d4-viewer-description p') as HTMLElement;
    if (titleElemList.every((e)=> e.innerText != 'SuperTitle'))
      throw new Error('title property has not been set');
    if (descElem.innerHTML != 'SuperDescription')
      throw new Error('description property has not been set');
  });

  test('form.serialization', async () => {
    tv = grok.shell.addTableView(demog);
    tv.form();
    await awaitCheck(() => document.querySelector('.d4-form') !== null, 'cannot find form', 3000);
    const layout = tv.saveLayout();
    tv.resetLayout();
    tv.loadLayout(layout);
    await awaitCheck(() => document.querySelector('.d4-form') !== null, 'cannot find form', 3000);
    isViewerPresent(Array.from(tv.viewers), 'Form');    
  });

  after(async () => {
    tv?.close();
    grok.shell.closeTable(demog);
  }); 
}, { owner: 'dkovalyov@datagrok.ai' });
