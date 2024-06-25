import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

async function openMoleculeDataset(name: string): Promise<DG.TableView> {
  const table = DG.DataFrame.fromCsv(await grok.dapi.files.readAsText(name));
  grok.shell.windows.showProperties = true;
  return grok.shell.addTableView(table);
}

export async function _demoAdmetox(): Promise<void> {
  const tv = await openMoleculeDataset('System:AppData/Admetox/demo_files/demo_dataset.csv');

  const layoutString = await grok.dapi.files.readAsText('System:AppData/Admetox/demo_files/demo.layout');
  const layout = DG.ViewLayout.fromJson(layoutString);
  tv.loadLayout(layout);
  grok.shell.windows.showContextPanel = false;
}