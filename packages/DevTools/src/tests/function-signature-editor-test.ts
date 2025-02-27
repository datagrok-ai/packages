import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
// import * as ui from 'datagrok-api/ui';
import { category, before, test, expect, awaitCheck, after, delay } from '@datagrok-libraries/utils/src/test';

category('FSE', () => {
  const script: DG.Script = DG.Script.create(`#name: Template
#description: Calculates number of cells in the table
#language: python
#sample: cars.csv
#input: dataframe table [Data table]
#output: int count [Number of cells in table]

count = table.shape[0] * table.shape[1]`);

  before(async () => {
    grok.shell.windows.simpleMode = false; 
    await delay(1000) 
  });

  test('exist', async () => { 
    let b: boolean;
    for (let i = 0; i < 5; i++) {
      b = true;
      try {
        const v = DG.ScriptView.create(script);
        grok.shell.addView(v);
        await awaitCheck(() => grok.shell.v != null, '', 1000);
        await awaitCheck(() => {
          return !!(grok.shell.v.getRibbonPanels().flat().find(
            (elem) => !!elem.querySelector('.fa-magic'),
          )?.lastChild as HTMLElement);
        }, 'Failed: FSE button does not exist', 1500);
        break;
      } catch (e) {
        b = false;
      }
    }
    if (!b) throw new Error('Failed: FSE button does not exist');
  }, {owner:'ppolovyi@datagrok.ai'});

  test('open', async () => {
    const v = DG.ScriptView.create(script);
    grok.shell.addView(v);
    await awaitCheck(() => grok.shell.v != null, '', 2000);
    let fseButton: HTMLElement;
    await awaitCheck(() => {
      fseButton = grok.shell.v.getRibbonPanels().flat().find(
        (elem) => !!elem.querySelector('.fa-magic'),
      )?.lastChild as HTMLElement;
      return !!fseButton;
    }, 'Failed: FSE button does not exist', 2000);
    fseButton.click();
    await awaitCheck(() => !!grok.shell.v.root.querySelector('[name="PARAMETERS"]'),
      'FSE button did not open view', 2000);
    const currentView = grok.shell.v;
    const allTabsExist =
      !!currentView.root.querySelector('[name="PROPERTIES"]') &&
      !!currentView.root.querySelector('[name="PARAMETERS"]') &&
      !!currentView.root.querySelector('[name="CODE"]') &&
      !!currentView.root.querySelector('[name="UI"]');
    expect(allTabsExist, true);
  }, {owner:'ppolovyi@datagrok.ai'});

  test('close', async () => {
    const v = DG.ScriptView.create(script);
    grok.shell.addView(v);
    await awaitCheck(() => grok.shell.v != null, '', 2000);
    let fseButton: HTMLElement;
    await awaitCheck(() => {
      fseButton = grok.shell.v.getRibbonPanels().flat().find(
        (elem) => !!elem.querySelector('.fa-magic'),
      )?.lastChild as HTMLElement;
      return !!fseButton;
    }, 'Failed: FSE button does not exist', 2000);
    fseButton.click();
    await awaitCheck(() => !!grok.shell.v.root.querySelector('[name="PARAMETERS"]'),
      'FSE button did not open view', 2000);
    const currentView = grok.shell.v;
    let editorButton: HTMLElement;
    await awaitCheck(() => {
      editorButton = grok.shell.v.getRibbonPanels().flat().find(
        (elem) => !!elem.querySelector('.fa-code'),
      )?.lastChild as HTMLElement;
      return !!editorButton;
    }, 'Failed: FSE button does not exist', 2000);
    editorButton.click();
    await awaitCheck(() => !!currentView.root.querySelector('.CodeMirror.cm-s-default'),
      'Code button did not open view', 2000);
  }, {owner:'ppolovyi@datagrok.ai'});

  after(async ()=>{
    grok.shell.closeAll()
  });
});
