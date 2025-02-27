import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {ScaffoldTreeViewer, BitwiseOp, isOrphans} from './scaffold-tree';
import {filter, debounce} from 'rxjs/operators';
import {interval} from 'rxjs';
import { SCAFFOLD_TREE_HIGHLIGHT } from '../constants';

const COLUMN_NAME_CHANGED = 'column-name-changed';

interface IScaffoldFilterState {
  colName: string;
}

export class ScaffoldTreeFilter extends DG.Filter {
  viewer: ScaffoldTreeViewer = new ScaffoldTreeViewer();
  savedTree: string = '';
  colorCodedScaffolds: string = '';

  constructor() {
    super();
    this.root = ui.divV([]);
    this.subs = this.viewer.subs;
    this.subs.push(grok.events.onResetFilterRequest.subscribe((_) => {
      this.viewer.clearFilters();
      if (this.viewer._bitOpInput)
        this.viewer._bitOpInput.value = BitwiseOp.OR;
      this.viewer.clearNotIcon(this.viewer.tree.children);
    }));
  }

  get isFiltering(): boolean {
    return super.isFiltering && this.viewer.tree.items.filter((v) => v.checked).length > 0;
  }

  get filterSummary(): string {
    return ScaffoldTreeViewer.TYPE;
  }

  attach(dataFrame: DG.DataFrame): void {
    super.attach(dataFrame);
    this.column ??= dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE);
    this.columnName ??= this.column?.name;
    this.subs.push(this.dataFrame!.onRowsFiltering
      .pipe(filter((_) => this.column != null && !this.isFiltering))
      .subscribe((_) => {
        this.viewer.setHighlightTag = super.isFiltering;
        const tag = super.isFiltering ? this.viewer.colorCodedScaffolds : [];
        this.viewer.setScaffoldTag(this.column!, tag);
      }),
    );
    this.subs.push(grok.events.onCustomEvent(COLUMN_NAME_CHANGED).subscribe((state: IScaffoldFilterState) => {
      if (state.colName === this.columnName)
        this.createViewer(dataFrame);
    }));
  }

  saveState(): any {
    const state = super.saveState();
    state.savedTree = JSON.stringify(this.viewer.serializeTrees(this.viewer.tree));
    state.colorCodedScaffolds = JSON.stringify(this.viewer.colorCodedScaffolds);
    return state;
  }

  applyState(state: any): void {
    super.applyState(state);
    grok.events.fireCustomEvent(COLUMN_NAME_CHANGED, {
      colName: state.columnName,
    });

    if (state.colorCodedScaffolds)
      this.viewer.setHighlightTag = state.active; //in case applyState is called on disabled filter with existing scaffolds, the highlight is not set
    if (state.savedTree)
      this.viewer.loadTreeStr(state.savedTree);

    if (state.colorCodedScaffolds)
      this.viewer.colorCodedScaffolds = JSON.parse(state.colorCodedScaffolds);
  }

  applyFilter(): void {
    if (!this.dataFrame || !this.viewer.bitset || this.isDetached) return;
    this.viewer.setHighlightTag = true;
    this.viewer.updateFilters(false);
    this.dataFrame.filter.and(this.viewer.bitset);
    this.dataFrame.rows.addFilterState(this.saveState());
  }
  
  detach(): void {
    super.detach();
    this.viewer.clearFilters();
    this.viewer.setScaffoldTag(this.viewer.molCol!, [], true);
  }

  createViewer(dataFrame: DG.DataFrame) {
    this.viewer.allowGenerate = false;
    this.viewer.size = 'large';
    this.viewer.applyFilter = false;
    this.viewer.resizable = true;
    this.viewer.molCol = this.column;
    this.viewer.moleculeColumnName = this.columnName!;
    this.viewer.dataFrame = dataFrame;
    this.root.appendChild(this.viewer.root);
  }
}
