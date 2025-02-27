import * as grok from 'datagrok-api/grok';
// import * as DG from 'datagrok-api/dg';

import { category, delay, test, awaitCheck, before } from '@datagrok-libraries/utils/src/test';
import { getHTMLElementbyInnerText } from './gui-utils';
import { checkDialog } from './gui-utils';

category('GUI: Grid', () => {
  before(async () => {
    grok.shell.windows.showProperties = true;
  });

  test('grid.dataSearch', async () => {
    const demog = grok.data.demo.demog(100);
    const v = grok.shell.addTableView(demog);
    await awaitCheck(() => grok.shell.v == v);
    const searchTab = getHTMLElementbyInnerText('d4-accordion-pane-header', 'Search');
    if (!searchTab?.classList.contains('expanded'))
      searchTab!.click();

    let searchInput: HTMLInputElement | undefined;
    let input;
    for (let i = 0; i < document.getElementsByClassName('ui-input-editor').length; i++) {
      input = document.getElementsByClassName('ui-input-editor')[i] as HTMLInputElement;
      if (input.placeholder == 'Search') {
        searchInput = input;
        break;
      }
    }
    await awaitCheck(() => searchInput != undefined, 'cannot find search input', 1000);
    searchInput!.value = 'other';
    await delay(100);
    searchInput!.dispatchEvent(new Event('input'));

    const searchOptionsBtn = document.getElementsByClassName('d4-flex-row d4-flew-nowrap d4-search')[0]
      .getElementsByClassName('grok-icon grok-font-icon-menu')[0] as HTMLElement;
    searchOptionsBtn.click();
    await awaitCheck(() => getHTMLElementbyInnerText('d4-menu-item-label', 'Filter matching') != undefined,
      'cannot find Filter matching option', 1000);

    const filterMatchingAction = getHTMLElementbyInnerText('d4-menu-item-label', 'Filter matching');
    filterMatchingAction!.click();
    await awaitCheck(() => demog.filter.trueCount == 8, 'error in Filter matching', 2000);
  });

  test('grid.deleteRows', async () => {
    const demog = grok.data.demo.demog(100);
    const v = grok.shell.addTableView(demog);
    await awaitCheck(() => grok.shell.v == v);
    grok.shell.topMenu.find('Select').find('Random...').click();
    await awaitCheck(() => checkDialog('Select Random Rows'));

    const input25 = Array.from(document.querySelectorAll('.d4-link-label'))
      .find((el) => el.textContent === '25%') as HTMLElement;
    input25!.click();
    await awaitCheck(() => demog.selection.trueCount == 25);
    const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await delay(200);

    const removeRowsBtn = document.getElementsByClassName('svg-remove-selected-rows')[0] as HTMLElement;
    removeRowsBtn.click();
    await awaitCheck(() => demog.rowCount == 75, 'rows are not deleted', 2000);
  });

  test('grid.deleteCols', async () => {
    await delay(5000);
    const demog = grok.data.demo.demog(10);
    demog.currentCell = demog.cell(0, 'disease');
    grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 2000);
    grok.shell.o = demog.getCol('disease');

    await awaitCheck(() => Array.from(document.querySelectorAll('.d4-accordion-title'))
      .find((el) => el.textContent == 'disease') !== undefined, 'cannot load column context panel', 3000);

    const actionsSectionOnPP = Array.from(document.getElementsByClassName('grok-entity-prop-panel')[0]
      .querySelectorAll('.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Actions') as HTMLElement;
    if (Array.from(actionsSectionOnPP.classList).find((el) => el == 'expanded') == undefined)
      actionsSectionOnPP.click();

    await awaitCheck(() => Array.from(actionsSectionOnPP.classList)
      .find((el) => el == 'expanded') !== undefined);

    const removeLinkAction = Array.from(document.querySelectorAll('.d4-link-action'))
      .find((el) => el.textContent === 'Remove') as HTMLElement;
    removeLinkAction!.click();
    await awaitCheck(() => demog.columns.byName('disease') == null, 'disease column was not deleted', 2000);
  });

  test('grid.filters', async () => {
    const demog = grok.data.demo.demog(100);
    grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 2000);

    await awaitCheck(() => grok.shell.topMenu.find('Select') != null, 'cannot find Select in top menu', 1000);
    grok.shell.topMenu.find('Select').find('Random...').click();
    await awaitCheck(() => checkDialog('Select Random Rows'), 'cannot find dialog', 1500);

    await awaitCheck(() => Array.from(document.querySelectorAll('.d4-accordion-title'))
      .find((el) => el.textContent === 'subj') !== undefined, 'cannot load context panel', 3000);

    const input25 = Array.from(document.querySelectorAll('.d4-link-label'))
      .find((el) => el.textContent === '25%') as HTMLElement;
    input25!.click();
    await awaitCheck(() => demog.selection.trueCount == 25);

    const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await delay(100);

    const cp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitCheck(() => Array.from(cp.querySelectorAll('.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Actions') !== undefined, 'cannot find Actions on context panel', 3000);
    const actionsSectionOnPP = Array.from(cp.querySelectorAll('.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Actions') as HTMLElement;
    if (!actionsSectionOnPP?.classList.contains('expanded'))
      actionsSectionOnPP.click();
    await delay(100);
    const filterLinkAction = Array.from(document.querySelectorAll('.d4-link-action'))
      .find((el) => el.textContent === 'Filter Rows') as HTMLElement;

    filterLinkAction!.click();
    await awaitCheck(() => demog.filter.trueCount == 25, 'Error in filtering', 1000);
  });
}, {owner: 'dkovalyov@datagrok.ai'});
