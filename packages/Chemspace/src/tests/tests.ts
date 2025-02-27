import * as grok from 'datagrok-api/grok';
import {test, category, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {app, pricesPanel, samplesPanel} from '../package';

category('Chemspace', () => {
  const mol = 'Oc1ccccc1';

  test('Prices panel', async () => {
    const widget = await grok.functions.call('Chemspace:pricesPanel', {'id': 'CSSS00102643788'});
    await awaitCheck(() => widget.root.getElementsByClassName('chemspace-prices-grid').length > 0,
      'prices panel hasn\'t been created', 30000);
  });

  test('Samples panel', async () => {
    const widget = await grok.functions.call('Chemspace:samplesPanel', {'smiles': mol});
    const similarPaneHeader = widget.root.querySelector('[name="div-section--Similar"]') as HTMLElement;
    similarPaneHeader.click();
    const similarPane = widget.root.querySelector('[d4-title="Similar"]') as HTMLElement;
    await awaitCheck(() => similarPane.getElementsByClassName('chem-mol-box').length === 9,
      `Expected 9 similar molecules, got ${similarPane.getElementsByClassName('chem-mol-box').length}`, 30000);
    const subPaneHeader = widget.root.querySelector('[name="div-section--Substructure"]') as HTMLElement;
    subPaneHeader.click();
    const subPane = widget.root.querySelector('[d4-title="Substructure"]') as HTMLElement;
    await awaitCheck(() => subPane.getElementsByClassName('chem-mol-box').length === 10,
      `Expected 9 molecules with substructure, got ${subPane.getElementsByClassName('chem-mol-box').length}`, 30000);

  }, { timeout: 60000});

  test('App', async () => {
    await grok.functions.call('Chemspace:App');
    await awaitCheck(() => grok.shell.tv.dataFrame.rowCount === 10,
    `Search hasn't been completed`, 30000);
  });
});
