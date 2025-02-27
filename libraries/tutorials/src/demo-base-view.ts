import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {UiUtils} from "@datagrok-libraries/compute-utils";
import '../css/demo.css';
import { Subscription } from 'rxjs';

interface ISplash {
  close: () => void;
  el: HTMLElement;
}

export abstract class BaseViewApp {
  parentCall: DG.FuncCall;
  tableView?: DG.TableView;
  container: HTMLElement = ui.divH([], { classes: 'demo-app-container' });
  formContainer: HTMLElement = ui.box(null, { classes: 'demo-content-container', style: { height: '100%' } });
  modeContainer: HTMLElement = ui.box(null, { classes: 'demo-mode-container', style: { height: '100%' } });
  sketcherDiv: HTMLElement = ui.div([], { classes: 'demo-content-container', style: { border: 'none' } });
  sketcherInstance: grok.chem.Sketcher = new grok.chem.Sketcher();
  sketcher?: HTMLElement;
  browseView: DG.BrowseView = grok.shell.view(DG.View.BROWSE) as DG.BrowseView;

  filePath: string = '';
  addTabControl: boolean = true;
  formGenerator?: (dataFrame: DG.DataFrame) => Promise<HTMLElement | null>;
  setFunction?: () => Promise<void>;
  abort?: () => Promise<void>;
  uploadCachedData?: () => Promise<HTMLElement>;
  sketched: number = 0;
  mode: string = 'sketch';
  tableName: string = 'Admetica';

  sketcherValue: { [k: string]: string } = { 'aspirin': 'CC(Oc1ccccc1C(O)=O)=O' };
  runningProcesses: (() => Promise<void>)[] = [];
  subs: Subscription[] = [];

  constructor(parentCall: DG.FuncCall) {
    this.parentCall = parentCall;

    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `, styleSheet.cssRules.length);

    this.container.appendChild(this.modeContainer);
    this.container.appendChild(this.formContainer);
  }

  async init(): Promise<void> {
    const [name, smiles] = Object.entries(this.sketcherValue)[0]
    this.sketcherInstance.setMolecule(smiles);
    this.sketcherInstance.onChanged.subscribe(async () => {
      const smiles: string = this.sketcherInstance.getSmiles();
      await this.onChanged(smiles);
    });
    this.sketcherInstance.molInput.value = name;
    this.sketcher = this.sketcherInstance.root;
    this.sketcherDiv.appendChild(this.sketcher);
  
    if (this.addTabControl) {
      const modeTabs: DG.TabControl = ui.tabControl();
      modeTabs.onTabChanged.subscribe((tab: DG.TabPane) => this.handleModeChange(tab));
      modeTabs.addPane('Sketch', () => this.createSketchPane());
      modeTabs.addPane('File', () => this.fileInputPane());
      this.modeContainer.appendChild(modeTabs.root);
    } else {
      this.mode = 'sketch';
      this.modeContainer.appendChild(this.createSketchPane());
    }

    this.prepareTableView();
    this.addSubs();
  }
  
  private async handleModeChange(tab: DG.TabPane): Promise<void> {
    this.mode = tab.header.innerText.split(' ')[0].toLowerCase();
    this.clearTable();
    this.clearForm();
  
    if (this.mode === 'sketch')
      this.activateSketchMode();
    else
      this.activateFileMode();
  }
  
  private activateSketchMode(): void {
    this.formContainer.style.visibility = 'visible';
    this.formContainer.style.position = 'relative';
    
    if (this.tableView?.grid) {
      this.tableView.grid.root.style.visibility = 'hidden';
      this.tableView.dockManager.dock(this.container, DG.DOCK_TYPE.TOP, null, '', 0.99);
    }

    this.sketcherInstance.onChanged.next();
  }
  
  private createSketchPane(): HTMLElement {
    this.mode = 'sketch';
    this.formContainer.style.visibility = 'visible';
    this.formContainer.style.position = 'relative';
    
    if (this.tableView?.grid) {
      this.tableView.grid.root.style.visibility = 'hidden';
      this.tableView.dockManager.dock(this.container, DG.DOCK_TYPE.TOP, null, '', 0.99);
    }
  
    return this.sketcherDiv;
  }
  
  private fileInputPane(): HTMLElement {
    this.mode = 'file';
    this.formContainer.style.visibility = 'hidden';
    this.formContainer.style.position = 'absolute';
    return this.createFileInputPane();
  }


  private prepareTableView() {
    const table = DG.DataFrame.create(1);
    this.tableView = DG.TableView.create(table, false);
    this.tableView.parentCall = this.parentCall;
    this.tableView.dataFrame.name = this.tableName;
    
    setTimeout(async () => {
      this.tableView!._onAdded();
      this.tableView!.grid.root.style.visibility = 'hidden';
      await this.refresh(table, this.container, 0.99);
      const inBrowseView = grok.shell.v.type === DG.VIEW_TYPE.BROWSE;
      if (inBrowseView)
        (grok.shell.view(DG.VIEW_TYPE.BROWSE) as DG.BrowseView).preview = this.tableView!;
    }, 300);
  }

  private clearTable() {
    if (this.tableView) {
      this.tableView.dataFrame = DG.DataFrame.create(1);
      this.tableView.dataFrame.name = this.tableName;
    }
  }

  private clearForm() {
    this.formContainer.innerHTML = '';
  }

  private async onChanged(smiles: string) {
    if (!smiles) {
      this.clearForm();
      return;
    }

    if (this.abort && this.runningProcesses.length > 0) {
      await this.abort();
      this.runningProcesses = [];
    }

    const newProcessAbort = this.addNewProcess(smiles);
    this.runningProcesses.push(newProcessAbort);
    
    try {
      await newProcessAbort();
    } finally {
      this.runningProcesses = this.runningProcesses.filter(proc => proc !== newProcessAbort);
    }
  }

  private addNewProcess(smiles: string): () => Promise<void> {
    return async () => {
      this.clearTable();
      const col = this.tableView?.dataFrame.columns.getOrCreate('smiles', 'string');
      if (!col) return;
      col!.semType = DG.SEMTYPE.MOLECULE;
      this.tableView?.dataFrame.set('smiles', 0, smiles);
      await grok.data.detectSemanticTypes(this.tableView!.dataFrame);

      const splashScreen = this.buildSplash(this.formContainer, 'Calculating...');
      try {
        if (this.uploadCachedData && this.sketched === 0) {
          this.clearForm();
          this.formContainer.appendChild(await this.uploadCachedData());
        } else if (this.formGenerator) {
          const form = await this.formGenerator(this.tableView!.dataFrame);
          if (form) {
            this.clearForm();
            this.formContainer.appendChild(form);
          }
        } else {
          console.warn('No form generator provided.');
        }
      } finally {
        splashScreen.close();
      }

      this.sketched += 1;
      this.tableView?.grid.invalidate();
    };
  }

  private createFileInputPane() {
    const fileInputEditor = this.initializeFileInputEditor();
    this.removeLabels(fileInputEditor.root);
    this.styleInputEditor(fileInputEditor.root);
    this.setupDragAndDrop(fileInputEditor.root);
    this.removeOptionsIcon(fileInputEditor.root);
    fileInputEditor.root.classList.add('demo-file-input');
    return ui.divV([fileInputEditor], { classes: 'demo-file-input-container' });
  }
  
  private initializeFileInputEditor() {
    const fileInputEditor = UiUtils.fileInput('', null, async (file: File) => {
      await this.processFile(file);
    }, null);
    fileInputEditor.stringValue = 'Drag and drop a CSV file here, or click to select a file.';
    return fileInputEditor;
  }
  
  private removeLabels(root: HTMLElement): void {
    const labelSelectors = '.ui-label, .ui-input-label';
    const labels = root.querySelectorAll<HTMLElement>(labelSelectors);
    labels.forEach(label => label.remove());
  }
  
  private styleInputEditor(root: HTMLElement): void {
    const inputEditor = root.querySelector<HTMLElement>('.ui-input-editor');
    if (!inputEditor) return;

    Object.assign(inputEditor.style, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      color: '#007bff',
      fontSize: '14px',
      cursor: 'pointer',
      textAlign: 'center',
      borderBottom: 'none',
    });
  }
  
  private setupDragAndDrop(root: HTMLElement): void {
    const inputEditor = root.querySelector<HTMLElement>('.ui-input-editor');
    if (!inputEditor) return;

    const highlightColor = '#e0f7fa';
    const defaultColor = '#ffffff';
    inputEditor.style.border = '1px dashed #007bff';

    const setHighlightedStyle = () => inputEditor.style.backgroundColor = highlightColor;
    const resetStyle = () => inputEditor.style.backgroundColor = defaultColor;

    inputEditor.addEventListener('dragenter', setHighlightedStyle);
    inputEditor.addEventListener('dragover', (event) => {
      event.preventDefault();
      setHighlightedStyle();
    });

    inputEditor.addEventListener('dragleave', resetStyle);
    inputEditor.addEventListener('drop', (event) => {
      event.preventDefault();
      resetStyle();
    });
  }

  private removeOptionsIcon(root: HTMLElement): void {
    const optionsIcon = root.querySelector<HTMLElement>('.ui-input-options .grok-icon.fal.fa-cloud-upload');
    optionsIcon?.remove();
  }  

  private async activateFileMode(): Promise<void> {
    this.formContainer.style.visibility = 'hidden';
    this.formContainer.style.position = 'absolute';
  
    if (this.tableView?.grid) {
      this.tableView.grid.root.style.visibility = 'visible';
      this.tableView.dockManager.dock(this.container, DG.DOCK_TYPE.TOP, null, '', 0.2);
  
      const df = await openMoleculeDataset(this.filePath);
      await grok.data.detectSemanticTypes(df);
      this.tableView!.dataFrame = df;
      this.tableView!.dataFrame.name = this.tableName;
      await this.processFileData();
    }
  }
  
  private async processFile(file: File) {
    if (!file) return;

    const extension = file.name.split('.').pop()!;
    if (!['csv'].includes(extension)) {
      grok.shell.info(`The file extension ${extension} is not supported!`);
      return;
    }

    const csvData = await file.text();
    const table = DG.DataFrame.fromCsv(csvData);
    await grok.data.detectSemanticTypes(table);
    this.tableView!.dataFrame = table;
    this.tableView!.dataFrame.name = this.tableName;
  
    const splashScreen = this.buildSplash(this.tableView!.grid.root, 'Calculating...');
    try {
      if (this.setFunction) {
        await this.setFunction();
      } else {
        console.warn('No form generator provided.');
      }
    } finally {
      splashScreen.close();
    }
    splashScreen.close();
  
    await this.processFileData();
  }
  
  protected async processFileData(): Promise<void> {}

  private refresh(table: DG.DataFrame, modeContainer: HTMLElement, ratio: number) {
    if (table.rowCount > 0)
      this.tableView?.dockManager.dock(modeContainer, DG.DOCK_TYPE.TOP, null, '', ratio);
  }
  
  private buildSplash(root: HTMLElement, description: string): ISplash {
    const indicator = ui.loader();
    const panel = ui.divV([indicator, ui.p(description)], { classes: 'demo-splash-panel' });
    const loaderEl = ui.div([panel], { classes: 'demo-splash-container' });
    root.append(loaderEl);
    return { el: loaderEl, close: () => loaderEl.remove() };
  }

  private addSubs() {
    const root = this.tableView?.root;
    if (!root) return;
  
    this.subs.push(
      ui.onSizeChanged(root).subscribe(() => {
        this.container.style.width = `${root.clientWidth}px`;
  
        const d4 = root.querySelector('.d4-root') as HTMLElement | null;
        const splitter = root.querySelector('.splitter-container-column') as HTMLElement | null;
  
        if (d4) d4.style.width = '100%';
        if (splitter) splitter.style.width = '100%';
      })
    );

    this.subs.push(grok.events.onViewRemoved.subscribe((view) => {
      if (view.id === this.tableView?.id)
        this.subs.forEach((v) => v.unsubscribe());
    }));
  } 
}

async function openMoleculeDataset(name: string): Promise<DG.DataFrame> {
  const table = DG.DataFrame.fromCsv(await grok.dapi.files.readAsText(name));
  return table;
}