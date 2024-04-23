/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import $ from 'cash-dom';
import '../../style.css';

import {STRAND, STRANDS, STRAND_LABEL} from '../../../model/const';
import {EventBus} from '../../../model/event-bus';
import {StrandType} from '../../../model/types';

export class ColumnInputManager {
  private columnControlsContainer: HTMLDivElement = ui.div([]);

  constructor(private eventBus: EventBus) {
    this.eventBus.tableSelectionChanged$.subscribe(() => this.handleTableChoice());
    this.refreshColumnControls();
  }

  getColumnControlsContainer(): HTMLDivElement {
    return this.columnControlsContainer;
  }

  private get selectedTable(): DG.DataFrame | null {
    return this.eventBus.getTableSelection();
  }

  private handleTableChoice(): void {
    this.refreshColumnControls();
    grok.shell.info(`Table ${this.selectedTable?.name} selection from column input manager`);
  }

  private refreshColumnControls(): void {
    $(this.columnControlsContainer).empty();
    $(this.columnControlsContainer).append(this.constructColumnControls());
  }

  private constructColumnControls(): HTMLElement[] {
    const strandColumnInput = this.createStrandColumnInput();
    const senseStrandColumnInput = strandColumnInput[STRAND.SENSE];
    const antisenseStrandColumnInput = strandColumnInput[STRAND.ANTISENSE];

    const idColumnInput = this.createIdColumnInput();

    return [senseStrandColumnInput, antisenseStrandColumnInput, idColumnInput];
  }

  private createStrandColumnInput(): Record<StrandType, HTMLElement> {
    const columns = this.selectedTable ?
      this.selectedTable.columns.names().sort((a, b) => a.localeCompare(b)) :
      [];
    const strandColumnInput = Object.fromEntries(STRANDS.map((strand) => {
      const input = ui.choiceInput(
        `${STRAND_LABEL[strand]} column`,
        columns[0],
        columns,
        (colName: string) => this.eventBus.selectColumn(strand, colName)
      );
      return [strand, input.root];
    })) as Record<StrandType, HTMLElement>;
    return strandColumnInput;
  }

  private createIdColumnInput(): HTMLElement {
    const columns = this.selectedTable ? this.selectedTable.columns.names() : [];
    const idColumnInput = ui.choiceInput('ID column', columns[0], columns, () => { });
    return idColumnInput.root;
  }
}
