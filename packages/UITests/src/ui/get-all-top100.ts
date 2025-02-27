import {after, before, category, test, awaitCheck, delay} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';


category('Connections', () => {
  let schema: DG.ViewBase;
  let table: HTMLElement;
  let northwind: DG.TreeViewGroup;

  before(async () => {
    const browseButton = document.querySelector('.d4-tab-header[name="Browse"]') as HTMLElement;
    browseButton.click();
    await delay(100);
    const browseView = grok.shell.view(DG.View.BROWSE) as DG.BrowseView;
    browseView.mainTree.expanded = true;
    const databases: DG.TreeViewGroup | undefined = browseView.mainTree.children.find((c) => c.text === 'Databases') as DG.TreeViewGroup;
    databases.expanded = true;
    if (!databases)
      throw new Error('Databases group was not found');
    const postgres: DG.TreeViewGroup | undefined = databases.children.find((c) => c.text === 'Postgres') as DG.TreeViewGroup;
    if (!postgres)
      throw new Error('Postgres data source was not found');
    postgres.expanded = true;
    debugger
    await delay(5000);
    northwind = postgres.children.find((c) => c.text === 'Datagrok') as DG.TreeViewGroup;
    if (!northwind)
      throw new Error('Datagrok was not found');
  });

  test('getAll', async () => {
    await browseSchema();
    table.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    await awaitCheck(() => document.querySelector('.d4-menu-popup') !== null, 'cannot find context menu', 2000);
    const getAll = Array.from(document.querySelectorAll('.d4-menu-item-label'))
      .find((el) => (el as HTMLElement).innerText.includes('Get All')) as HTMLElement;
    getAll.click();
    await awaitCheck(() => document.querySelector('canvas') !== null, 'Get All does not work', 5000);
    grok.shell.v.close();
    schema.close();
  });

  test('getTop100', async () => {
    await browseSchema();
    table.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    await awaitCheck(() => document.querySelector('.d4-menu-popup') !== null, 'cannot find context menu', 2000);
    const getTop100 = Array.from(document.querySelectorAll('.d4-menu-item-label'))
      .find((el) => (el as HTMLElement).innerText.includes('Get Top 100')) as HTMLElement;
    getTop100.click();
    await awaitCheck(() => document.querySelector('canvas') !== null, 'Get Top 100 does not work', 5000);
    grok.shell.v.close();
    schema.close();
  });

  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
  });

  async function browseSchema() {
    northwind.root.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    await awaitCheck(() => document.querySelector('.d4-menu-popup') !== null, 'cannot find context menu');
    const bs = Array.from(document.querySelectorAll('.d4-menu-item-label'))
      .find((el) => (el as HTMLElement).innerText.includes('Browse schema')) as HTMLElement;
    bs.click();
    await awaitCheck(() => document.querySelector('.d4-sketch-item') !== null, 'cannot find table', 10000);
    table = document.querySelector('.d4-sketch-item') as HTMLElement;
    schema = grok.shell.v;
  }
}, {clear: false});
