import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {_package} from '../utils/constants';

export async function openMoleculeDataset(name: string): Promise<DG.TableView> {
  const table = DG.DataFrame.fromCsv(await grok.dapi.files.readAsText(name));
  grok.shell.windows.showProperties = true;
  return grok.shell.addTableView(table);
}

export function showHelpPanel(info: string) {
  grok.shell.windows.help.visible = true;
  grok.shell.windows.help.showHelp(ui.markdown(info));
  
  grok.shell.windows.context.visible = true;  
  grok.shell.windows.showContextPanel = true;
  grok.shell.windows.showProperties = true;
  grok.shell.windows.help.visible = true;
}

export async function _demoFolding(): Promise<void> {
  await demo('folding', ['Boltz1 protein', 'EsmFold protein']);
  showHelpPanel(HELP_FOLDING);
}

export async function _demoDocking(): Promise<void> {
  await demo('docking', ['Autodock poses', 'DiffDock poses']);
  showHelpPanel(HELP_DOCKING);
}

async function demo(type: "docking" | "folding", columnNames: string[]): Promise<void> {
  const datasetPath = `System:AppData/Docking/demo_files/${type}_demo.csv`;
  const layoutPath = `System:AppData/Docking/demo_files/${type}_demo.layout`;

  const tv: DG.TableView = await openMoleculeDataset(datasetPath);
  const layout = DG.ViewLayout.fromJson(await grok.dapi.files.readAsText(layoutPath));
  tv.loadLayout(layout);

  const { dataFrame } = tv;
  await grok.data.detectSemanticTypes(dataFrame);

  for (let i = 0; i < columnNames.length; i++) {
    const name = columnNames[i];
    const column = dataFrame.getCol(name);
    column.semType = DG.SEMTYPE.MOLECULE3D;
    if (type === 'docking') {
      column.setTag('docking.role', 'ligand');
    }
  }

  dataFrame.currentCell = dataFrame.cell(0, columnNames[0]);
}

// Constants
export const HELP_FOLDING = `# Folding Demo

This demo showcases **EsmFold** and **Boltz-1**, models for predicting biomolecular structures.

To run folding for the entire column:  
  - Select **Bio | Folding | EsmFold** or **Bio | Folding | Boltz-1** from the top menu.  
  - This applies the selected model to all sequences in the column.  
`

export const HELP_DOCKING = `# Docking Demo  

This demo showcases **AutoDock** and **DiffDock**, powerful tools for molecular docking and interaction prediction.   

To run docking for the entire column:  
  - Select **Chem | Docking | AutoDock** or **Chem | Docking | DiffDock** from the top menu.  
  - This will apply the selected tool to all molecules in the chosen column.  

Click on any predicted structure to view details such as binding poses, confidence scores, and other relevant characteristics.`;  
