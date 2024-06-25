import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { Model, Subgroup, Template, TEMPLATES_FOLDER } from './constants';
import { createConditionalInput, createInputForProperty, createLinearInput } from './admetox-utils';
import { ColumnInputOptions } from '@datagrok-libraries/utils/src/type-declarations';

export class AdmeticaBaseEditor {
  tableInput: DG.InputBase<DG.DataFrame | null>;
  colInput!: DG.InputBase<DG.Column | null>;
  colInputRoot: HTMLElement;
  templatesInput: DG.ChoiceInput<string>; 
  addPiechartInput = ui.input.bool('Add piechart', {value: true});
  modelsSettingsDiv = ui.inputs([]);
  modelsSettingsIcon: HTMLElement;
  expanded: boolean = false;
  tree: DG.TreeViewGroup = ui.tree();

  constructor() {
    this.tableInput = ui.input.table('Table', {onValueChanged: () => this.onTableInputChanged()});
    this.colInput = ui.input.column('Molecules', {
      table: grok.shell.tv.dataFrame,
      filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE,
      value: grok.shell.tv.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE)!
    });
    this.colInputRoot = this.colInput.root;
    this.templatesInput = ui.input.choice('Template', {onValueChanged: async () =>  {
      if(settingsOpened)
        await this.createModelsSettingsDiv(this.modelsSettingsDiv);
    }});
    this.modelsSettingsIcon = ui.icons.settings(async () => {
      settingsOpened = !settingsOpened;
      if (settingsOpened)
        await this.createModelsSettingsDiv(this.modelsSettingsDiv);
      else
        ui.empty(this.modelsSettingsDiv);
    }, 'Modify template parameters');
    this.templatesInput.root.prepend(this.modelsSettingsIcon);
    let settingsOpened = false;
    this.initTemplates();
  }
  
  private async initTemplates() {
    const templates = await this.getTemplates();
    this.templatesInput.items = templates;
    this.templatesInput.value = templates[0];
  }
  
  private async getTemplates(): Promise<string[]> {
    const files = await grok.dapi.files.list(TEMPLATES_FOLDER);
    return files.map((file) => file.fileName.split('.')[0]);
  }
  
  private async getPropertiesFromTemplate() {
    const fileName = `${this.templatesInput.value}.json`;
    const propertiesJson = await grok.dapi.files.readAsText(`${TEMPLATES_FOLDER}/${fileName}`);
    return JSON.parse(propertiesJson);
  }
  
  private async createModelsSettingsDiv(paramsForm: HTMLElement): Promise<HTMLElement> {
    const properties = await this.getPropertiesFromTemplate();
    ui.empty(paramsForm);
    const treeControl = this.createTreeControl(properties);
    paramsForm.appendChild(treeControl);
    return paramsForm;
  }
  
  private createInputsForCategories(group: Subgroup, inputs: HTMLElement): void{
    ui.empty(inputs);
    inputs.classList.add('admetox-input-form');
    inputs.appendChild(ui.divText(group.name, 'admetox-descriptor-name'));
    inputs.appendChild(ui.input.textArea('', {size: {width: 100, height: 150}, value: group.description}).root);
  }
  
  private createInputsForModels(model: Model, inputs: HTMLElement): void {
    ui.empty(inputs);
    inputs.classList.add('admetox-input-form');
    inputs.appendChild(ui.divText(model.name, 'admetox-descriptor-name'));
    model.properties.forEach(p => {
      const input = createInputForProperty(p);
      if (input) inputs.appendChild(input);
    });
    
    const coloring = model.coloring;
    if (coloring.type === 'Conditional')
      inputs.appendChild(createConditionalInput(coloring, model));
    else if (coloring.type === 'Linear')
      inputs.appendChild(createLinearInput(coloring));
  }
  
  private createTreeGroup(template: Template): void {
    template.subgroup.forEach((subgroup: Subgroup) => {
      const groupNode = this.tree.group(subgroup.name);
      groupNode.expanded = !this.expanded;
      this.expanded = true;
      groupNode.enableCheckBox(false);
      
      subgroup.models.forEach((model: Model) => {
        const modelNode = groupNode.item(model.name);
        modelNode.checked = false;
        modelNode.enableCheckBox(false);
      });
    });
  }
  
  private getModel(template: Template, nodeName: string): Model | null {
    const model = template.subgroup
      .flatMap(subgroup => subgroup.models)
      .find(model => nodeName === model.name);
    if (model) return model;
    return null;
  }
  
  private createTreeControl(template: Template): HTMLDivElement {
    this.createTreeGroup(template);
    this.tree.root.classList.add('admetox-tree');
    const inputs = ui.divV([]);
    
    this.tree.onSelectedNodeChanged.subscribe((node: DG.TreeViewNode) => {
      const subgroup = template.subgroup.find(subgroup => subgroup.name === node.text);
      const model = this.getModel(template, node.text)
      if (subgroup)
        this.createInputsForCategories(subgroup, inputs);
      else if (model)
        this.createInputsForModels(model, inputs);
    });
    
    this.tree.onNodeMouseEnter.subscribe((node: DG.TreeViewNode) => {
      const model = this.getModel(template, node.text);
      if (!model) return;
      node.root.onmouseenter = (e) => ui.tooltip.show(model.units, e.x, e.y);
      node.root.onmouseleave = (e) => ui.tooltip.hide();
    });
    
    const tabContent = ui.divH([this.tree.root, inputs]);
    tabContent.classList.add('admetox-tab-content');
    return tabContent;
  }
  
  public getEditor(): HTMLElement {
    return ui.div([
      this.tableInput,
      this.colInputRoot,
      this.templatesInput,
      this.modelsSettingsDiv,
      this.addPiechartInput.root,
    ], { style: { minWidth: '450px' }, classes: 'ui-form' });
  }
  
  public getParams() {
    return {
      table: this.tableInput.value!,
      col: this.colInput ? this.colInput.value! : null,
      templatesName: this.templatesInput.value,
      models: this.tree?.items.filter((item) => item.checked).map((item) => item.text),
      addPiechart: this.addPiechartInput.value
    };
  }
  
  onTableInputChanged(): void {
    this.colInput = ui.input.column('Molecule', {
      table: this.tableInput.value!,
      value: this.tableInput.value!.columns.bySemType(DG.SEMTYPE.MOLECULE)!,
      filter: (col: DG.Column) => col.semType === DG.SEMTYPE.MOLECULE
    });
    ui.empty(this.colInputRoot);
    Array.from(this.colInput.root.children).forEach((it) => this.colInputRoot.append(it));
  }
}