import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {Observable, Subject, Unsubscribable} from 'rxjs';

import {testEvent} from '@datagrok-libraries/utils/src/test';

import {ILogger} from './logger';
import {IRenderer} from '../types/renderer';

export type GridCellRendererTemp<TBack> = {
  rendererBack: TBack;
}

export function getGridCellColTemp<TValue, TBack extends CellRendererBackBase<TValue>>(
  gridCell: DG.GridCell
): [DG.GridColumn | null, DG.Column<TValue>, GridCellRendererTemp<TBack>] {
  let temp: GridCellRendererTemp<TBack> | null = null;
  let gridCol: DG.GridColumn | null = null;
  try {
    gridCol = gridCell.dart ? gridCell.gridColumn : null;
    temp = gridCol ? gridCol.temp as GridCellRendererTemp<TBack> : null;
  } catch { [gridCol, temp] = [null, null]; }

  const tableCol: DG.Column<TValue> = gridCell.cell.column;
  temp = temp ?? (tableCol ? tableCol.temp : null);

  if (!temp)
    throw new Error(`Grid cell renderer back store (GridColumn or Column) not found.`);
  return [gridCol, tableCol, temp];
}

//@formatter:off
export abstract class CellRendererBackStub {
  abstract render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void;
  onKeyDown(gridCell: DG.GridCell, e: KeyboardEvent): void {}
  onKeyPress(gridCell: DG.GridCell, e: KeyboardEvent): void {}
  onMouseEnter(gridCell: DG.GridCell, e: MouseEvent): void {}
  onMouseLeave(gridCell: DG.GridCell, e: MouseEvent): void {}
  onMouseDown(gridCell: DG.GridCell, e: MouseEvent): void {}
  onMouseUp(gridCell: DG.GridCell, e: MouseEvent): void {}
  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {}
  onClick(gridCell: DG.GridCell, e: MouseEvent): void {}
  onDoubleClick(gridCell: DG.GridCell, e: MouseEvent): void {}
}
//@formatter:on

export abstract class CellRendererBackBase<TValue> extends CellRendererBackStub implements IRenderer {
  protected subs: Unsubscribable[] = [];
  protected dirty: boolean = true;
  protected destroyed: boolean = false;

  /** Overriding care to trigger {@link onRendered} event. */
  protected constructor(
    /** Not null if rendered on a grid */
    protected readonly gridCol: DG.GridColumn | null,
    protected readonly tableCol: DG.Column<TValue>,
    public readonly logger: ILogger,
  ) {
    super();
    if (this.tableCol && this.tableCol.dataFrame) {
      this.subs.push(this.tableCol.dataFrame.onDataChanged.subscribe(() => {
        this.dirty = true;
      }));

      this.subs.push(this.tableCol.dataFrame.onColumnsRemoved.subscribe((_) => {
        try {
          // this way we can check if the column is still in the dataframe
          if (!this.destroyed && this.tableCol && !this.tableCol.dataFrame)
            this.destroy();
        } catch (err) { this.logger.error(err); }
      }));
    }

    if (this.tableCol) {
      this.subs.push(grok.events.onTableRemoved.subscribe((eventData) => {
        try {
          const eventDf: DG.DataFrame = eventData.args.dataFrame;
          if (this.tableCol?.dataFrame.id === eventDf.id && !this.destroyed)
            this.destroy();
        } catch (err) { this.logger.error(err); }
      }));
    }

    if (this.gridCol) {
      this.subs.push(grok.events.onViewRemoving.subscribe((eventData) => {
        try {
          const eventView = eventData.args.view;
          if (
            this.gridCol?.dart &&
            this.gridCol.grid && this.gridCol?.grid?.dart &&
            this.gridCol?.grid?.view?.id === eventView.id && !this.destroyed
          ) this.destroy();
        } catch (err: any) { this.logger.error(err); }
      }));
    }
  }

  private static viewerCounter: number = -1;
  protected readonly viewerId: number = ++CellRendererBackBase.viewerCounter;

  protected toLog(): string {
    return `${this.constructor.name}<${this.viewerId}>`;
  }

  protected destroy(): void {
    for (const sub of this.subs)
      sub.unsubscribe();
    this.destroyed = true;
  }

  protected invalidateGrid(): void {
    if (this.gridCol && this.gridCol.dart) this.gridCol.grid?.invalidate();
  }

  protected reset(): void {
    this.dirty = false;
  }

  // -- IRenderer --

  public errors: Error[] = [];

  protected _onRendered: Subject<void> = new Subject<void>();

  get onRendered(): Observable<void> { return this._onRendered; }

  invalidate(caller?: string): void {
    this.invalidateGrid();
  }

  async awaitRendered(
    timeout: number = 10000, reason: string = `${timeout} timeout`
  ): Promise<void> {
    const logPrefix = `${this.toLog()}.awaitRendered()`;
    this.logger.debug(`${logPrefix}, start, testEvent before`);
    await testEvent(this._onRendered, () => {}, () => {
      this.invalidate();
    }, timeout, `${logPrefix}, ${reason}`);

    // Rethrow stored syncer error (for test purposes)
    if (this.errors.length > 0) {
      const err = this.errors[0];
      this.errors = [];
      throw err;
    }
    this.logger.debug(`${logPrefix}, end`);
  }
}
