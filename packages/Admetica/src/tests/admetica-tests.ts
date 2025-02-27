import {awaitCheck, before, category, delay, expect, expectArray, test} from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { runAdmetica, performChemicalPropertyPredictions, getQueryParams, properties, setProperties, healthCheck } from '../utils/admetica-utils';
import { fetchWrapper } from '@datagrok-libraries/utils/src/fetch-utils';

category('Admetica', () => {
  let v: DG.TableView;
  let molecules: DG.DataFrame;
  let smilesColumn: DG.Column;
  let admeticaContainer: DG.DockerContainer | null;
    
  before(async () => {
    grok.shell.closeAll();
    grok.shell.windows.showProperties = false;
  
    admeticaContainer = await grok.dapi.docker.dockerContainers.filter('admetica').first();
    await Promise.all([
      (async () => {
        if (!admeticaContainer.status.startsWith('started')) {
          await grok.dapi.docker.dockerContainers.run(admeticaContainer.id, true);
        }
      })(),
      setProperties(),
      delay(1000)
    ]);
  });  

  test('Container. Post request', async () => {
    const smiles = `smiles
    O=C1Nc2ccccc2C(C2CCCCC2)=NC1`;
    const distributionResults = await fetchWrapper(() => runAdmetica(smiles, 'PPBR,VDss', 'false'));
    expect(distributionResults != null, true);
  }, {timeout: 25000});

  test('Calculate dialog. UI', async () => {
    molecules = grok.data.demo.molecules(100);
    v = grok.shell.addTableView(molecules);
    await grok.data.detectSemanticTypes(molecules);
    await delay(5000);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'cannot load table', 3000);
    grok.shell.topMenu.find('Chem').group('Admetica').find('Сalculate...').click();
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length > 0, 'cannot open Admetica dialog', 2000);
    const admeticaDialog = returnDialog('Admetica')?.root;
    await awaitCheck(() => admeticaDialog!.querySelectorAll('.d4-tree-view-group-host > .d4-tree-view-group').length === 5,
      'properties number inside Admetica dialog is different than expected', 5000);
    const smilesColumn = admeticaDialog!.querySelector('.d4-column-selector-column') as HTMLElement;
    await awaitCheck(() => smilesColumn!.innerText === 'smiles',
      'column inside Admetica dialog is different than expected', 5000);
    const models = properties.subgroup
      .flatMap((subgroup: any) => subgroup.models
      .map((model: any) => model.name));
    expectArray(Array.from(admeticaDialog!.querySelectorAll('.d4-tree-view-item-label')).map((item) => item.innerHTML), models);
    v.close();
    grok.shell.o = ui.div();
  });

  test('Calculate dialog. Added properties', async () => {
    molecules = grok.data.demo.molecules(5);
    v = grok.shell.addTableView(molecules);
    await delay(1000);
    smilesColumn = molecules.columns.bySemType(DG.SEMTYPE.MOLECULE)!;
    const newTableColumn = 'Caco2';
    await performChemicalPropertyPredictions(smilesColumn, v.dataFrame, newTableColumn);
    await delay(2000);
    expect(molecules.columns.names().includes(newTableColumn), true, `${newTableColumn} column has not been added`);
    expect(parseFloat(molecules.col(newTableColumn)!.get(0).toFixed(2)), -4.62, `Calculated value for ${newTableColumn} is incorrect`);
    expect(molecules.col(newTableColumn)!.getTag('.color-coding-type'), DG.COLOR_CODING_TYPE.LINEAR, `Expected ${DG.COLOR_CODING_TYPE.LINEAR} color coding type, but got a different value`);
    expect(molecules.col(newTableColumn)!.getTag('.color-coding-linear'), '[4292224808,4281114668]', 'Expected another linear color values');
  }, {timeout: 100000});

  test('Calculate. For single cell', async () => {
    const molecules = grok.data.demo.molecules(20);
    const v = grok.shell.addTableView(molecules);
    await awaitCheck(() => document.querySelector('canvas') !== null, 'Table failed to load', 3000);
    
    grok.shell.windows.showProperties = true;
  
    const table = v.dataFrame;
    table.currentCell = table.cell(0, 'smiles');
    await delay(3000);
  
    const pp = document.querySelector('.grok-prop-panel') as HTMLElement;
    await awaitPanel(pp, 'Biology', 6000);
  
    const expandPanel = async (panelTitle: string, timeout = 3000) => {
      const panel = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
        .find((el) => el.textContent === panelTitle) as HTMLElement;
  
      if (!panel) throw new Error(`Panel "${panelTitle}" not found`);
      
      if (!panel.classList.contains('expanded')) {
        panel.click();
        await awaitCheck(() => panel.classList.contains('expanded'), `Failed to expand "${panelTitle}"`, timeout);
      }
    };
  
    await expandPanel('Biology');
    await expandPanel('Admetica');
    await expandPanel('Distribution');
  
    const admePanel = Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === 'Admetica') as HTMLElement;
      
    const propertiesTable = admePanel?.parentElement?.querySelector('.d4-table.d4-item-table.d4-info-table') as HTMLElement;
    await awaitCheck(() => propertiesTable?.innerText.trim() !== '', 'Properties weren’t calculated', 8000);
  }, { timeout: 100000 });  

  test('Calculate.Benchmark column', async () => {
    const runAdmeticaBenchmark = async (moleculesCount: number) => {
      const molecules = grok.data.demo.molecules(moleculesCount);
      molecules.columns.remove('logD');
      const args = [molecules.toCsv(), await getQueryParams(), 'false'];
      return await runOnce(runAdmetica, ...args);
    };
    await DG.timeAsync('Admetica column', async () => await runAdmeticaBenchmark(5000));
  }, {timeout: 10000000000, benchmark: true });

  test('Calculate.Benchmark cell', async () => {
    const smiles = `smiles
    O=C1Nc2ccccc2C(C2CCCCC2)=NC1`;
    const distributionSubgroup = properties.subgroup.find((subgroup: any) => subgroup.name === "Distribution");
    const distributionModels = distributionSubgroup ? distributionSubgroup.models.map((model: any) => model.name) : [];
    const args = [smiles, distributionModels, 'false'];
    await DG.timeAsync('Admetica cell', async () => await runOnce(runAdmetica, ...args));
  }, {timeout: 1000000, benchmark: true});
});
  
async function runOnce(func: (...args: string[]) => Promise<string | null>, ...args: string[]) {
  return await func(...args);
}

async function awaitPanel(pp: HTMLElement, name: string, ms: number = 5000): Promise<void> {
  await awaitCheck(() => {
    return Array.from(pp.querySelectorAll('div.d4-accordion-pane-header'))
      .find((el) => el.textContent === name) !== undefined;
  }, `cannot find ${name} property`, ms);
}

export function returnDialog(dialogTitle: string): DG.Dialog | undefined {
  let dialog: DG.Dialog | undefined;
  for (let i = 0; i < DG.Dialog.getOpenDialogs().length; i++) {
    if (DG.Dialog.getOpenDialogs()[i].title == dialogTitle) {
      dialog = DG.Dialog.getOpenDialogs()[i];
      return dialog;
    }
  }
}