import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { getFolders } from '../package';

export const TARGET_PATH = 'System:AppData/Chem/reinvent';

export class ReinventBaseEditor {
  ligandInput: DG.InputBase;
  optimizeInput!: DG.ChoiceInput<string>;
  folderIcon: HTMLElement;

  constructor() {
    this.ligandInput = ui.input.molecule('Ligand seed', {value: "OC(CN1CCCC1)NC(CCC1)CC1Cl", tooltipText: 'Starting point for ligand generation'});
    this.optimizeInput = ui.input.choice('Optimize', {
      nullable: false,
      tooltipText: 'Optimization criteria'
    }) as DG.ChoiceInput<string>;
    this.folderIcon = ui.iconFA('folder', () => {
      const dlg = ui.dialog({title:'Manage files'})
        .add(ui.fileBrowser({path: TARGET_PATH}).root)
        .onOK(async () => await this.initOptimizeInput());
      
      dlg.root.addEventListener('dragover', (event) => event.preventDefault());
      dlg.root.addEventListener('drop', (event) => event.preventDefault());
      dlg.show();
    }, 'Manage folders (add/rename/delete)');
    this.folderIcon.style.marginLeft = '10px';
    this.optimizeInput.root.append(this.folderIcon);
    this.initOptimizeInput();
  }
  private async initOptimizeInput(template?: string) {
    const templates = await getFolders();
    this.optimizeInput.items = templates;
    if (template)
      this.optimizeInput.value = template;
  }
  
  public getEditor(): HTMLElement {
    return ui.div([
      this.ligandInput.root,
      this.optimizeInput.root,
    ], { style: { minWidth: '250px' }, classes: 'ui-form' });
  }
  
  public getParams() {
    return {
      ligand: this.ligandInput.value,
      optimize: this.optimizeInput.value
    };
  }
}