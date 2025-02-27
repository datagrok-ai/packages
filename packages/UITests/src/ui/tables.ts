import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {checkHTMLElement} from './utils';
import {before, after, awaitCheck, category, test, delay} from '@datagrok-libraries/utils/src/test';

category('UI: Tables', () => {
  let v: DG.View;
  const df = grok.data.demo.demog(100);

  const arr = [
    {key: 'First', value: true},
    {key: 'Second', value: false},
    {key: 'Third', value: false},
  ];

  const table = ui.table(arr, (item, idx) => [item.key, item.value]);
  const tableFromMap = ui.tableFromMap(arr);
  const HTMLTable = DG.HtmlTable.create(arr, (item: any, idx: any) => [item.key, item.value]);

  before(async () => {
    v = grok.shell.newView('');
    grok.shell.windows.showProperties = true;
  });

  test('table.root', async () => {
    checkHTMLElement('Table', table, v, 'table');
  });

  test('tableFromMap.root', async () => {
    checkHTMLElement('tableFromMap', tableFromMap, v, 'table');
  });

  test('HTMLTable.root', async () => {
    checkHTMLElement('HTMLTable', HTMLTable.root, v, 'table');
  });

  test('normalize (min-max)', async () => {
    await normalize();
  });

  test('normalize (z-scores)', async () => {
    await normalize(true);
  });

  after(async () => {
    grok.shell.closeAll();
  });

  async function normalize(changeMethod: boolean = false) {
    const ageDF = DG.DataFrame.fromColumns([df.getCol('age')]);
    const tv = grok.shell.addTableView(ageDF);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.o = ageDF.col('age');
    try {
      const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
      await awaitCheck(() => {
        if (pp.querySelector('.ui-label') !== null)
          return (pp.querySelector('.ui-label') as HTMLElement).innerText === 'age';
        return false;
      }, 'cannot load context panel of age column', 5000);
      const actions = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
        .find((el) => el.textContent === 'Actions') as HTMLElement;
      if (!actions.classList.contains('expanded')) await actions.click();
      const normalize = Array.from(pp.querySelectorAll('.d4-link-action'))
        .find((el) => el.textContent === 'Normalize...') as HTMLElement;
      normalize.click();
      await delay(100);
      await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0);
      const dialog = DG.Dialog.getOpenDialogs()[0];
      if (changeMethod) {
        const method = dialog.inputs[2];
        method.value = method.property.choices[1];
      }
      await delay(100);
      (dialog.root.querySelector('.ui-btn.ui-btn-ok.enabled') as HTMLElement).click();
      await awaitCheck(() => ageDF.getCol('age').get(3) === (changeMethod ? 0.6055613160133362 : 0.7254902124404907),
        'normalize does not work properly', 1000);
    } finally {
      tv.close();
      grok.shell.closeTable(ageDF);
    }
  }
}, {clear: false});

category('UI: Tables: Link', () => {
  let DF1: DG.DataFrame;
  let DF2: DG.DataFrame;

  before(async () => {
    DF1 = grok.data.demo.demog(10);
    DF2 = grok.data.demo.demog(20);
  });

  test('row to filter', async () => {
    const [df1, df2] = await setLinkType('row to filter');
    for (let i = 0; i < 10; i++) {
      df1.currentRowIdx = i;
      await expect(df2.filter.trueCount, 1, 'row ' + (i + 1));
    }
    await delay(100);
  });

  test('row to row', async () => {
    const [df1, df2] = await setLinkType('row to row');
    for (let i = 0; i < 10; i++) {
      df1.currentRowIdx = i;
      await expect(df2.currentRowIdx, i, 'row ' + (i + 1));
    }
    await delay(100);
  });

  test('row to selection', async () => {
    const [df1, df2] = await setLinkType('row to selection');
    for (let i = 0; i < 10; i++) {
      df1.currentRowIdx = i;
      await expect(df2.selection.trueCount, 1, 'row ' + (i + 1));
    }
    await delay(100);
  });

  test('filter to filter', async () => {
    const [df1, df2] = await setLinkType('filter to filter');
    const arr = [6, 2, 1, 1];
    const races = ['Caucasian', 'Asian', 'Black', 'Other'];
    const race = df1.getCol('race');
    for (let i = 0; i < 4; i++) {
      const r = races[i];
      df1.filter.init((j) => race.get(j) === r);
      await expect(df2.filter.trueCount, arr[i], r);
    }
    await delay(100);
  });

  test('filter to selection', async () => {
    const [df1, df2] = await setLinkType('filter to selection');
    const arr = [6, 2, 1, 1];
    const races = ['Caucasian', 'Asian', 'Black', 'Other'];
    const race = df1.getCol('race');
    for (let i = 0; i < 4; i++) {
      const r = races[i];
      df1.filter.init((j) => race.get(j) === r);
      await expect(df2.selection.trueCount, arr[i], r);
    }
    await delay(100);
  });

  test('mouse-over to filter', async () => {
    const [df1, df2] = await setLinkType('mouse-over to filter');
    for (let i = 0; i < 10; i++) {
      df1.mouseOverRowIdx = i;
      await expect(df2.filter.trueCount, 1, 'row ' + (i + 1));
    }
    await delay(100);
  });

  test('mouse-over to selection', async () => {
    const [df1, df2] = await setLinkType('mouse-over to selection');
    for (let i = 0; i < 10; i++) {
      df1.mouseOverRowIdx = i;
      await expect(df2.selection.trueCount, 1, 'row ' + (i + 1));
    }
    await delay(100);
  });

  test('selection to filter', async () => {
    const [df1, df2] = await setLinkType('selection to filter');
    const arr = [6, 2, 1, 1];
    const races = ['Caucasian', 'Asian', 'Black', 'Other'];
    const race = df1.getCol('race');
    for (let i = 0; i < 4; i++) {
      const r = races[i];
      df1.selection.init((j) => race.get(j) === r);
      await expect(df2.filter.trueCount, arr[i], r);
    }
    await delay(100);
  });

  test('selection to selection', async () => {
    const [df1, df2] = await setLinkType('selection to selection');
    const arr = [6, 2, 1, 1];
    const races = ['Caucasian', 'Asian', 'Black', 'Other'];
    const race = df1.getCol('race');
    for (let i = 0; i < 4; i++) {
      const r = races[i];
      df1.selection.init((j) => race.get(j) === r);
      await expect(df2.selection.trueCount, arr[i], r);
    }
    await delay(100);
  });

  async function setLinkType(linkType: string): Promise<DG.DataFrame[]> {
    const df1 = DF1.clone();
    const df2 = DF2.clone();
    grok.shell.addTableView(df1);
    grok.shell.addTableView(df2);
    grok.shell.topMenu.find('Data').find('Link Tables...').click();
    let dialog: DG.Dialog | undefined;
    await awaitCheck(() => {
      dialog = returnDialog('Link Tables');
      return !!dialog;
    }, 'Dialog is not open', 1000);
    setDialogInputValue(dialog!, 'Link Type', linkType);
    await delay(50);
    const link = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok.ui-btn-raised'))
      .find((el) => (el as HTMLElement).innerText === 'LINK') as HTMLElement;
    link.click();
    return [df1, df2];
  }
}, { owner: 'aparamonov@datagrok.ai' });

function returnDialog(dialogTitle: string): DG.Dialog | undefined {
  const dialogs = DG.Dialog.getOpenDialogs();
  for (const d of dialogs) {
    if (d.title === dialogTitle && d.inputs.length !== 0)
      return d;
  }
}

function setDialogInputValue(dialog: DG.Dialog, inputName: string, value: any): void {
  dialog.input(inputName).value = value;
}

async function expect(actual: any, expected: any = true, error?: string): Promise<void> {
  if (error)
    error = `${error}, `;
  else error = '';
  if (actual !== expected) {
    await delay(100);
    throw new Error(`${error}Expected "${expected}", got "${actual}"`);
  }
}
