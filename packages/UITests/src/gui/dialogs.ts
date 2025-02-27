import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import { before, awaitCheck, category, test, delay, expect } from '@datagrok-libraries/utils/src/test';
import {
  isColumnPresent, isViewerPresent, isDialogPresent, returnDialog,
  setDialogInputValue, checkDialog, checkViewer
} from './gui-utils';
import { wait } from 'datagrok-api/ui';


category('GUI: Dialogs', () => {
  let v: DG.TableView;
  let df: DG.DataFrame;
  let demog: DG.DataFrame;

  before(async () => {
    df = grok.data.demo.demog(1000);
  });

  test('anonymize', async () => {
    demog = df.clone();
    v = grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Data').find('Anonymize...').click();
    await awaitCheck(() => checkDialog('Anonymize Data'), 'Dialog is not open', 1000);
    setDialogInputValue('Anonymize Data', 'Number randomization factor', 1);
    const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => !checkDialog('Anonymize Data'), 'dialog was not closed');
  });

  test('aggregateRows', async () => {
    try {
      demog = df.clone();
      v = grok.shell.addTableView(demog);
      await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
      grok.shell.topMenu.find('Data').find('Aggregate Rows...').click();
      await awaitCheck(() => document.querySelector('.grok-pivot') !== null);
      const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
        .find((el) => el.textContent === 'OK') as HTMLElement;
      okButton.click();
      await awaitCheck(() => grok.shell.v.name.toLowerCase() === 'result', 'Aggregation table was not created', 5000);
      grok.shell.v.close();
    } finally {
      grok.shell.windows.showColumns = false;
    }
  });

  test('cluster', async () => {
    grok.shell.windows.simpleMode = true;
    demog = df.clone();
    v = grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    v.ribbonMenu.find('ML').find('Cluster').find('Cluster...').click();
    await awaitCheck(() => checkDialog('Cluster Data'), 'Dialog is not open 1', 1000);
    isDialogPresent('Cluster Data');
    let okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => demog.col('clusters') !== null, 'cannot find clusters column', 3000);
    isColumnPresent(demog.columns, 'clusters');
    v.ribbonMenu.find('ML').find('Cluster').find('Cluster...').click();
    await awaitCheck(() => checkDialog('Cluster Data'), 'Dialog is not open 2', 1000);
    isDialogPresent('Cluster Data');
    returnDialog('Cluster Data')!.input('Show scatter plot').input.click();
    await awaitCheck(() => checkViewer(Array.from(v.viewers), 'Scatter plot'), 'Scatter plot did not appear', 3000);
    isColumnPresent(demog.columns, 'clusters (2)');
    const cancelButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'CANCEL') as HTMLElement;
    cancelButton.click();
    await awaitCheck(() => !checkViewer(Array.from(v.viewers), 'Scatter plot'),
      'Scatter plot still displayed', 1000);
    Array.from(v.viewers).forEach((viewer) => {
      if (viewer.type === 'Scatter plot')
        throw new Error('Scatter Plot did not disappear after clicking on the "Cancel" button');
    });
    if (demog.col('clusters (2)') !== null)
      throw new Error('cluster (2) column did not disappear after clicking on the "Cancel" button');
    v.ribbonMenu.find('ML').find('Cluster').find('Cluster...').click();
    await awaitCheck(() => checkDialog('Cluster Data'), 'Dialog is not open 3', 1000);
    isDialogPresent('Cluster Data');
    setDialogInputValue('Cluster Data', 'Normalize', 'Z-scores'); await delay(100);
    setDialogInputValue('Cluster Data', 'Clusters', 4); await delay(100);
    setDialogInputValue('Cluster Data', 'Metric', 'Manhattan'); await delay(100);
    returnDialog('Cluster Data')!.input('Show scatter plot').input.click();
    await awaitCheck(() => checkViewer(Array.from(v.viewers), 'Scatter plot'),
      'Scatter plot did not appear', 3000);
    okButton = document.getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButton.click();
    await awaitCheck(() => demog.col('clusters (2)') !== null, 'cannot find clusters (2) column', 3000);
    isViewerPresent(Array.from(v.viewers), 'Scatter plot');
    isColumnPresent(demog.columns, 'clusters (2)');
  });

  test('pca', async () => {
    demog = df.clone();
    v = grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('ML').find('Analyze').find('PCA...').click();
    await awaitCheck(() => checkDialog('PCA'), 'Dialog is not open 1', 1000);
    await delay(200);
    let okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => !checkDialog('PCA'), 'PCA dialog didnt close', 10000);
    await awaitCheck(() => (document.querySelector('.d4-balloon-content') as HTMLElement)?.innerText.includes(
      'Failed'), 'cannot find error balloon', 1000);
    grok.shell.topMenu.find('ML').find('Analyze').find('PCA...').click();
    await awaitCheck(() => checkDialog('PCA'), 'Dialog is not open 2', 1000);
    const featuresField: DG.Column[] = [];
    featuresField.push(demog.col('age') as DG.Column);
    featuresField.push(demog.col('height') as DG.Column);
    featuresField.push(demog.col('weight') as DG.Column);
    setDialogInputValue('PCA', 'Features', featuresField);
    returnDialog('PCA')!.input('Features').input.dispatchEvent(new MouseEvent('click'));
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length === 2, 'cannot find Features columns dialog', 1000);
    const okButtonInSelectColumn = returnDialog('Select columns...')?.root
      .getElementsByClassName('ui-btn ui-btn-ok enabled')[0] as HTMLElement;
    okButtonInSelectColumn.click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length === 1, 'error while selectiong features columns', 1000);
    setDialogInputValue('PCA', 'Components', 3);
    await delay(100);
    returnDialog('PCA')!.input('Center').input.click();
    await delay(100);
    returnDialog('PCA')!.input('Center').input.click();
    await delay(100);
    okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length === 0, 'PCA Timeout', 2500);
    isColumnPresent(demog.columns, 'PC1');
    isColumnPresent(demog.columns, 'PC2');
    isColumnPresent(demog.columns, 'PC3');
  });

  test('splitColumn', async () => {
    demog = df.clone();
    v = grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Data').find('Split Column...').click();
    await awaitCheck(() => checkDialog('Text to columns'), 'Dialog is not open', 1000);
    setDialogInputValue('Text to columns', 'Split by', ' ');
    await delay(100);
    setDialogInputValue('Text to columns', 'Prefix', 'TestCol');
    await delay(100);
    const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => demog.col('TestCol1') !== null && demog.col('TestCol2') !== null,
      'Split Column does not work', 5000);
    isColumnPresent(demog.columns, 'TestCol1');
    isColumnPresent(demog.columns, 'TestCol2');
  });

  test('unpivot', async () => {
    demog = df.clone();
    v = grok.shell.addTableView(demog);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Data').find('Unpivot...').click();
    await awaitCheck(() => checkDialog('Unpivot'), 'Dialog is not open', 1000);
    const raceInput = Array.from(document.querySelectorAll('td'))
      .find((el) => el.textContent === 'race')!.parentElement!
      .getElementsByClassName('ui-input-editor')[0] as HTMLInputElement;
    const sexInput = Array.from(document.querySelectorAll('td'))
      .find((el) => el.textContent === 'sex')!.parentElement!
      .getElementsByClassName('ui-input-editor')[0] as HTMLInputElement;
    raceInput.value = 'Copy';
    sexInput.value = 'Merge';
    const okButton = Array.from(document.querySelectorAll('.ui-btn.ui-btn-ok'))
      .find((el) => el.textContent === 'OK') as HTMLElement;
    okButton.click();
    await awaitCheck(() => grok.shell.v.name.toLowerCase().includes('result'), 'result table is not created', 3000);
    expect(grok.shell.t.columns.length, 3);
    expect(grok.shell.t.rowCount, 1000);
    grok.shell.v.close();
  });
}, { owner: 'dkovalyov@datagrok.ai' });
