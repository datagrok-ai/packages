import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';


category('Settings', () => {
  let gss: DG.Settings & any;
  let t: DG.DataFrame;
  // let views: DG.View[];

  before(async () => {
    gss = grok.shell.settings;
    t = grok.data.demo.demog(20);
    // views = [];
  });
  test('Beta Settings', async () => {
    expect(gss.enableBetaViewers, false);
    expect(gss.saveProjectWithViewLayout, false);
    try {
      gss.saveProjectWithViewLayout = true;
      expect(gss.saveProjectWithViewLayout, true);
    } finally {
      gss.saveProjectWithViewLayout = false;
    }
  });

  test('Sync Settings', async () => {
    expect(gss.showCurrentRowInProperties, false);
    expect(gss.showFilteredRowsInProperties, true);
    expect(gss.showSelectedRowsInProperties, true);
    expect(gss.showSelectedColumnsInProperties, true);
    expect(gss.showCurrentColumnInProperties, true);
    try {
      // const v = grok.shell.addTableView(t);
      // views.push(v);
      grok.shell.o = t;
      t.rows.select((row) => row.sex === 'F');
      expect(grok.shell.o instanceof DG.RowGroup, true);
      expect(grok.shell.o.dataFrame.selection.trueCount, t.selection.trueCount);
      gss.showSelectedRowsInProperties = false;
      grok.shell.o = t;
      t.rows.select((row) => row.sex === 'M');
      expect(grok.shell.o instanceof DG.DataFrame, true);
    } finally {
      gss.showSelectedRowsInProperties = true;
    }
  }, {skipReason: 'GROK-11670'});

  test('Windows Settings', async () => {
    expect(gss.showMenu, !grok.shell.windows.simpleMode, 'showMenu');
    expect(gss.showTables, grok.shell.windows.showTables, 'showTables');
    expect(gss.showColumns, grok.shell.windows.showColumns, 'showColumns');
    expect(gss.showProperties, grok.shell.windows.showProperties, 'showProperties');
    expect(gss.showToolbox, grok.shell.windows.showToolbox, 'showToolbox');
    expect(gss.showStatusBar, grok.shell.windows.showStatusBar, 'showStatusBar');
    expect(gss.showVariables, grok.shell.windows.showVariables, 'showVariables');
    expect(gss.showConsole, grok.shell.windows.showConsole, 'showConsole');
    // expect(gss.showHelp, grok.shell.windows.showHelp, 'showHelp');
  });
});
