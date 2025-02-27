import { category, expect, expectArray, test } from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

const demog = grok.data.demo.demog();

category('Shell', () => {
  test('addTableView', async () => {
    const v = grok.shell.addTableView(demog);
    expect(grok.shell.v, v);
    expect(grok.shell.v instanceof DG.TableView, true);
    expect((grok.shell.v as DG.TableView).dataFrame, demog);
    expect(grok.shell.t, v.dataFrame);
    v.close();
    expect(grok.shell.v != v, true);
    expect(grok.shell.table(demog.name), demog);
    grok.shell.closeTable(v.dataFrame);
  });

  test('addView', async () => {
    let view = DG.View.create();
    const v = grok.shell.addView(view);
    //@ts-ignore
    expect(grok.shell.v?.id, v.id);
    v.close();
    //@ts-ignore
    expect(grok.shell.v?.id != view.id, true);
  });

  test('tables', async () => {
    grok.shell.closeAll();
    const t = grok.shell.addTable(grok.data.demo.demog(10));
    const t2 = grok.shell.addTable(grok.data.demo.demog(100));
    const t3 = grok.shell.addTable(grok.data.demo.demog(1000));
    expectArray(grok.shell.tables.map(e => e.name), [t.name, t2.name, t3.name]);
    grok.shell.closeTable(t);
    expect(grok.shell.tables.length, 2)
  });

  test('closeTable', async () => {
    grok.shell.closeAll();
    const t = grok.shell.addTableView(demog);
    grok.shell.closeTable(t.dataFrame);
    expect(grok.shell.tables.length, 0)
  });

  test('tableByName', async () => {
    grok.shell.closeAll();
    const t = grok.shell.addTableView(demog);
    expect(grok.shell.tableByName(demog.name), t.dataFrame)
  });

  test('dockManager', async () => {
    grok.shell.closeAll();
    let v = ui.div([ui.span(["dock manager test"])], { classes: "dockManagerTest" });
    let docked = grok.shell.dockManager.dock(v);
    expect(grok.shell.dockManager.documentContainer !== undefined, true);
    expect(document.querySelector(".dockManagerTest"), v);
    grok.shell.dockManager.close(docked);
    expect(document.querySelector(".dockManagerTest"), null);
  });

  test('closeAll', async () => {
    grok.shell.addTableView(demog);
    grok.shell.addTable(grok.data.demo.demog(10));
    grok.shell.closeAll();
    expect(grok.shell.v === null, true);
    expect(grok.shell.tv === null, true);
    expect(grok.shell.t === null, true);
    expect(document.querySelector(".dockManagerTest"), null);
  });
  
  test('getSetVar', async () => {
    let x  = { test: 'test1' };
    //@ts-ignore
    grok.shell.setVar('a', 'b');
    //@ts-ignore
    grok.shell.setVar('b', 2);
    grok.shell.setVar('c', x);
    expect('b', grok.shell.getVar('a'));
    expect(2, grok.shell.getVar('b'));
    //@ts-ignore
    expect(x?.test, grok.shell.getVar('c')?.test);
  });
  
  test('clearDirtyFlag', async () => {
    grok.shell.addTableView(grok.data.demo.demog(1000))
    await DG.delay(1000);
    expect(grok.shell.project.isDirty, true); 
    grok.shell.clearDirtyFlag();
    expect(grok.shell.project.isDirty, false);
  });
  
  test('sideBar', async () => {
    grok.shell.sidebar.addPane('testSideBarElement', ()=>ui.div());
    let pane = document.querySelector('[name="testSideBarElement"]');
    expect(pane !== null, true);
    grok.shell.sidebar.clear();    
    pane = document.querySelector('[name="testSideBarElement"]');
    expect(pane === null, true);
  });
}, { owner: 'aparamonov@datagrok.ai' });
