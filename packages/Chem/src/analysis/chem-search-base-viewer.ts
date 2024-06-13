import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {CHEM_SIMILARITY_METRICS} from '@datagrok-libraries/ml/src/distance-metrics-methods';
import '../../css/chem.css';
import { Subject, Subscription } from 'rxjs';
import { AVAILABLE_FPS } from '../constants';
import { pickTextColorBasedOnBgColor } from '../utils/ui-utils';

export const SIMILARITY = 'similarity';
export const DIVERSITY = 'diversity';
export const MAX_LIMIT = 50;
export enum RowSourceTypes {
  All = 'All',
  Filtered = 'Filtered',
  Selected = 'Selected',
  FilteredSelected = 'FilteredSelected',
}
export class ChemSearchBaseViewer extends DG.JsViewer {
  isEditedFromSketcher: boolean = false;
  gridSelect: boolean = false;
  name: string = '';
  distanceMetric: string;
  limit: number;
  fingerprint: string;
  metricsProperties = ['distanceMetric', 'fingerprint'];
  fingerprintChoices = AVAILABLE_FPS;
  rowSourceChoices = [RowSourceTypes.All, RowSourceTypes.Filtered, RowSourceTypes.Selected, RowSourceTypes.FilteredSelected];
  sizesMap: {[key: string]: {[key: string]: number}} = {
    'small': {height: 60, width: 120},
    'normal': {height: 100, width: 200},
    'large': {height: 150, width: 300}};
  size: string;
  moleculeColumn?: DG.Column|null;
  moleculeColumnName: string;
  initialized: boolean = false;
  metricsDiv: HTMLElement | null;
  moleculeProperties: string[];
  renderCompleted = new Subject<void>();
  isComputing = false;
  rowSource: string;
  error = '';

  constructor(name: string, col?: DG.Column) {
    super();
    this.fingerprint = this.string('fingerprint', this.fingerprintChoices[0], {choices: this.fingerprintChoices});
    this.limit = this.int('limit', 12, {min: 1, max: MAX_LIMIT});
    this.distanceMetric = this.string('distanceMetric', CHEM_SIMILARITY_METRICS[0], {choices: CHEM_SIMILARITY_METRICS});
    this.size = this.string('size', Object.keys(this.sizesMap)[0], {choices: Object.keys(this.sizesMap)});
    this.rowSource = this.string('rowSource', this.rowSourceChoices[0], {choices: this.rowSourceChoices});
    this.moleculeColumnName = this.string('moleculeColumnName');
    this.name = name;
    this.moleculeProperties = this.columnList('moleculeProperties', [],
      {description: 'Adds selected fields from the grid to similarity search viewer'});
    if (col) {
      this.moleculeColumn = col;
      this.moleculeColumnName = col.name!;
    }
    const header = this.name === DIVERSITY ? `Most diverse structures` : `Most similar structures`;
    this.metricsDiv = ui.divH([ui.divText(header)], 'chem-similarity-header');
  }

  init(): void {
    this.initialized = true;
  }

  detach(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  async onTableAttached(): Promise<void> {
    this.init();
    if (this.dataFrame) {
      this.subs.push(DG.debounce(this.dataFrame.onRowsRemoved, 50).subscribe(async (_: any) => await this.render()));
      const compute = this.name !== DIVERSITY;
      this.subs.push(DG.debounce(this.dataFrame.onCurrentRowChanged, 50)
        .subscribe(async (_: any) => {
          if (this.isEditedFromSketcher && !this.gridSelect)
            this.isEditedFromSketcher = false;
          await this.render(compute);
        }));
      this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50)
        .subscribe(async (_: any) => 
          await this.render(this.rowSource === RowSourceTypes.Selected || this.rowSource === RowSourceTypes.FilteredSelected)));
      this.subs.push(DG.debounce((this.dataFrame.onFilterChanged), 50)
        .subscribe(async (_: any) => 
          await this.render(this.rowSource === RowSourceTypes.Filtered || this.rowSource === RowSourceTypes.FilteredSelected)));
      this.subs.push(DG.debounce(ui.onSizeChanged(this.root), 50)
        .subscribe(async (_: any) => await this.render(false)));
      this.subs.push(DG.debounce((this.dataFrame.onMetadataChanged), 50)
        .subscribe(async (_: any) => await this.render(false)));
      this.moleculeColumn = this.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE);
      this.moleculeColumnName = this.moleculeColumn?.name ?? '';
    }
    await this.render(true);
  }


  onPropertyChanged(property: DG.Property): void {
    super.onPropertyChanged(property);
    if (!this.initialized)
      return;
    if (this.metricsProperties.includes(property.name))
      this.updateMetricsLink(this, {});
    if (property.name === 'moleculeColumnName') {
      const col = this.dataFrame.col(property.get(this));
      this.moleculeColumn = col;
    }
    if (property.name === 'limit' && property.get(this) > MAX_LIMIT )
      this.limit = MAX_LIMIT;
    if (property.name === 'moleculeProperties') {
      this.render(false);
      return;
    }
    this.render();
  }

  updateMetricsLink(object: any, options: {[key: string]: string}): void {
    const metricsButton = ui.link(` ${this.distanceMetric}, ${this.fingerprint}`, () => {
      if (!grok.shell.windows.showProperties)
        grok.shell.windows.showProperties = true;
      grok.shell.o = object;
    }, 'Distance metric and fingerprint', '');
    Object.keys(options).forEach((it: any) => metricsButton.style[it] = options[it]);
    if (this.metricsDiv!.children.length > 1)
      this.metricsDiv!.removeChild(this.metricsDiv!.children[1]);
    this.metricsDiv!.appendChild(metricsButton);
  }

  async render(computeData = true): Promise<void> {
    try {
      await this.renderInternal(computeData);
    } finally {
      if (this.isComputing) {
        this.isComputing = false;
        this.renderCompleted.next();
      }
    }
  }

  async renderInternal(compute = true) {

  }

  beforeRender() {
    return this.initialized && this.dataFrame;
  }

  createMoleculePropertiesDiv(idx: number, refMolecule: boolean, similarity?: number): HTMLDivElement {
    const propsDict: {[key: string]: any} = {};
    if (!grok.shell.tv)
      return ui.div();
    const grid = grok.shell.tv.grid;
    if (similarity) {
      if (refMolecule)
        propsDict['Reference'] = {val: ''};
      else
        propsDict[SIMILARITY] = {val: similarity};
    }
    for (const col of this.moleculeProperties) {
      propsDict[col] = {val: this.moleculeColumn!.dataFrame.col(col)!.getString(idx)};
      const colorCoding = this.moleculeColumn!.dataFrame.col(col)!.tags[DG.TAGS.COLOR_CODING_TYPE];
      if (colorCoding && colorCoding !== DG.COLOR_CODING_TYPE.OFF) {
        propsDict[col].color = grid.cell(col, idx).color;
        propsDict[col].isTextColorCoded = grid.col(col)?.isTextColorCoded;
      }
    }
    //const item = ui.divH([], 'similarity-prop-item');
    const div = ui.divV([], {style: {marginTop: '5px'}});
    for (const key of Object.keys(propsDict)) {
      const labelName = key === SIMILARITY ? '' : key;
      const label = ui.divText(`${labelName}`, 'chem-similarity-prop-label');
      const value = ui.divText(`${propsDict[key].val}`, 'chem-similarity-prop-value');
      ui.tooltip.bind(value, key);
      if (propsDict[key].color) {
        const color = DG.Color.toHtml(propsDict[key].color);
        if (!propsDict[key].isTextColorCoded) {
          value.style.backgroundColor = color,
          value.style.color = DG.Color.toHtml(DG.Color.getContrastColor(propsDict[key].color));
        } else
          value.style.color = color;
      }
      const item = ui.divH([
        label,
        value,
      ], 'chem-similarity-prop-item');
      div.append(item);
    }
    return div;
  }

  getPropsColumnsNames(): string[] {
    let fingerprintTag = '';
    for (const t of this.moleculeColumn!.tags.keys()) {
      if (t.endsWith('.Column')) {
        fingerprintTag = t;
        break;
      }
    }
    return this.moleculeColumn!.dataFrame.columns.names()
      .filter((name) => name !== this.moleculeColumn!.getTag(fingerprintTag) && name !== this.moleculeColumn!.name);
  }

  closeWithError(error: string, progressBar?: DG.TaskBarProgressIndicator) {
    this.error = error;
    this.clearResults();
    this.root.append(ui.divText(this.error));
    this.root.classList.add(`chem-malformed-molecule-error`);
    progressBar?.close();
  }

  clearResults() {
    if (this.root.hasChildNodes())
      this.root.removeChild(this.root.childNodes[0]);
  }

  getRowSourceIndexes(): DG.BitSet {
    const bitset = DG.BitSet.create(this.dataFrame.rowCount);
    switch(this.rowSource) {
      case RowSourceTypes.All:
        bitset.setAll(true);
        break;
      case RowSourceTypes.Filtered:
        bitset.copyFrom(this.dataFrame.filter);
        break;
      case RowSourceTypes.Selected:
        bitset.copyFrom(this.dataFrame.selection);
        break;
      case RowSourceTypes.FilteredSelected:
        const filterCopy = DG.BitSet.create(this.dataFrame.rowCount).copyFrom(this.dataFrame.filter);
        bitset.copyFrom(filterCopy.and(this.dataFrame.selection));
        break;
      default:
        break;
    }
    return bitset;
  }
}
