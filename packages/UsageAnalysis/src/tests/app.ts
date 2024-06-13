import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import { before, after, category, test, expect, awaitCheck } from '@datagrok-libraries/utils/src/test';


category('App', () => {
  const tabs = ['Overview', 'Packages', 'Functions', 'Events', 'Log', 'Tests'];
  const num = [4, 4, 5, 4, 3, 5];
  let view: DG.MultiView;

  before(async () => {
    view = await grok.functions.eval('UsageAnalysis:usageAnalysisApp()');
    grok.shell.addView(view);
  });

  test('open', async () => {
    expect(grok.shell.v.name === 'Usage Analysis', true, 'cannot find Usage Analysis view');
  });

  for (let i = 0; i < 6; i++) {
    test(tabs[i], async () => {
      view.tabs.currentPane = view.tabs.getPane(tabs[i]);
      let err: any = undefined;
      let s = ['Log'].includes(tabs[i]) ? '.grok-wait + .d4-grid canvas' : 'canvas';
      try {
        await awaitCheck(() => view.root.querySelectorAll(s).length === num[i], '', 10000);
      } catch (e) {
        err = 'Tab failed to load in 10 seconds';
      }
      await awaitCheck(() => view.root.querySelectorAll(s).length === num[i],
        `expected ${num[i]}, got ${document.querySelectorAll(s).length}`, 45000);
      if (err)
        throw new Error(err);
    });
  }

  after(async () => {
    grok.shell.closeAll();
    DG.Balloon.closeAll();
    grok.shell.windows.showContextPanel = true;
  });
}, { clear: false, timeout: 60000 });
