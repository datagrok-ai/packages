import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import wu from 'wu';

import {HelmType, Mol} from '@datagrok-libraries/bio/src/helm/types';
import {
  CellRendererBackAsyncBase, RenderServiceBase
} from '@datagrok-libraries/bio/src/utils/cell-renderer-async-base';
import {HelmAux, HelmProps} from '@datagrok-libraries/bio/src/viewers/helm-service';

import {ISeqMonomer} from '../helm-monomer-placer';
import {getHoveredMonomerFromEditorMol} from './get-hovered';
import {_getHelmService} from '../package-utils';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {ILogger} from '@datagrok-libraries/bio/src/utils/logger';
import {getGridCellRendererBack} from '@datagrok-libraries/bio/src/utils/cell-renderer-back-base';

import {_package, getMonomerLib} from '../package';

class WrapLogger implements ILogger {
  constructor(
    private readonly base: ILogger
  ) {}

  error(message: any, params?: object | undefined, stackTrace?: string | undefined): void {
    this.base.error(message, params, stackTrace);
  }

  warning(message: string, params?: object | undefined): void {
    this.base.warning(message, params);
  }

  info(message: string, params?: object | undefined): void {
    // this.base.info(message, params);
  }

  debug(message: string, params?: object | undefined): void {
    // this.base.debug(message, params);
  }
}

export class HelmGridCellRendererBack extends CellRendererBackAsyncBase<HelmProps, HelmAux> {
  private _auxList: (HelmAux | null)[];

  constructor(
    gridCol: DG.GridColumn | null,
    tableCol: DG.Column<string>,
  ) {
    super(gridCol, tableCol, new WrapLogger(_package.logger) /* _package.logger */, true);

    const monomerLib = getMonomerLib();
    if (!monomerLib)
      throw new Error('Helm package is not initialized yet.');
    this.subs.push(monomerLib.onChanged.subscribe(() => {
      this.reset();
    }));
  }

  protected override reset(): void {
    super.reset();
    this._auxList = new Array<HelmAux | null>(this.tableCol.length).fill(null);
    if (this.gridCol && this.gridCol.dart) this.gridCol.grid?.invalidate();
  }

  protected override getRenderService(): RenderServiceBase<HelmProps, HelmAux> {
    return _getHelmService();
  }

  protected override getRenderTaskProps(
    gridCell: DG.GridCell, backColor: number, width: number, height: number,
  ): HelmProps {
    return new HelmProps(gridCell.cell.value, backColor, width, height);
  }

  protected override storeAux(gridCell: DG.GridCell, aux: HelmAux): void {
    if (gridCell.tableRowIndex !== null)
      this._auxList[gridCell.tableRowIndex] = aux;
  }

  /** Renders cell from image data (cache), returns true to update the cell by service.
   * @param gridCellBounds {DG.Rect} Grid cell bounds
   */
  protected override renderCellImageData(
    gridCtx: CanvasRenderingContext2D, gridCellBounds: DG.Rect, gridCell: DG.GridCell, cellImageData: ImageData,
  ): boolean {
    const dpr = window.devicePixelRatio;
    if (gridCell.tableRowIndex === null) return false;
    const aux = this._auxList[gridCell.tableRowIndex];
    if (!aux) return true;

    // Draw cell image data to scale it with drawImage() while transform()
    const cellCanvas = ui.canvas(cellImageData.width, cellImageData.height);
    const cellCtx = cellCanvas.getContext('2d')!;
    cellCtx.putImageData(cellImageData, 0, 0);

    // Get bbox canvas
    const bBoxImageData = cellCtx.getImageData(aux.bBox.x, aux.bBox.y, aux.bBox.width, aux.bBox.height);
    const bBoxCanvas = ui.canvas(aux.bBox.width, aux.bBox.height);
    const bBoxCtx = bBoxCanvas.getContext('2d')!;
    bBoxCtx.putImageData(bBoxImageData, 0, 0);

    const fitCanvasWidth = gridCellBounds.width * dpr - 2;
    const fitCanvasHeight = gridCellBounds.height * dpr - 2;

    const bBoxRatio = Math.max(aux.bBox.width / aux.cBox.width, aux.bBox.height / aux.cBox.height);
    const bBoxFullWidth = aux.bBox.width / bBoxRatio;
    const bBoxFullHeight = aux.bBox.height / bBoxRatio;

    const fitScale = Math.min(fitCanvasWidth / bBoxFullWidth, fitCanvasHeight / bBoxFullHeight);

    // Relative shift of bbox center to cbox center
    const bBoxShiftHR = (aux.bBox.left + aux.bBox.width / 2 - aux.cBox.width / 2) / aux.cBox.width;
    const bBoxShiftVR = (aux.bBox.top + aux.bBox.height / 2 - aux.cBox.height / 2) / aux.cBox.height;

    const bBoxFitLeft = fitCanvasWidth / 2 - bBoxCanvas.width * fitScale * (1 - 2 * bBoxShiftHR) / 2;
    const bBoxFitTop = fitCanvasHeight / 2 - bBoxCanvas.height * fitScale * (1 - 2 * bBoxShiftVR) / 2;

    const fitCanvas = ui.canvas(fitCanvasWidth, fitCanvasHeight);
    const fitCtx = fitCanvas.getContext('2d')!;
    // fitCtx.fillStyle = '#FFFFA0';
    // fitCtx.fillRect(0, 0, fitCanvasWidth, fitCanvasHeight);
    fitCtx.transform(fitScale, 0, 0, fitScale, bBoxFitLeft, bBoxFitTop);
    fitCtx.drawImage(bBoxCanvas, 0, 0); // draw with scale transform

    const fitCanvasData = fitCtx.getImageData(0, 0, fitCanvasWidth, fitCanvasHeight);
    this.renderOnGrid(gridCtx, gridCellBounds, gridCell, fitCanvasData);
    return true; // request rendering
  }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    if (gridCell.tableRowIndex === null) return;
    const aux = this._auxList[gridCell.tableRowIndex];
    if (!aux) return;

    const logPrefix = `${this.toLog()}.onMouseMove()`;
    const dpr = window.devicePixelRatio;

    /** {@link gridCell}.bounds */ const gcb = gridCell.bounds;
    const argsX = (e.offsetX - gcb.x) * dpr;
    const argsY = (e.offsetY - gcb.y) * dpr;

    const editorMol: Mol<HelmType> | null = aux.mol;
    if (!editorMol) {
      this.logger.warning(`${logPrefix}, editorMol of the cell not found.`);
      return; // The gridCell is not rendered yet
    }
    const seqMonomer: ISeqMonomer | null = getHoveredMonomerFromEditorMol(argsX, argsY, gridCell, editorMol);

    if (seqMonomer) {
      const monomerLib = getMonomerLib();
      const tooltipEl = monomerLib ? monomerLib.getTooltip(seqMonomer.polymerType, seqMonomer.symbol) :
        ui.divText('Monomer library is not available');
      ui.tooltip.show(tooltipEl, e.x + 16, e.y + 16);
    } else {
      // Tooltip for missing monomers
      ui.tooltip.hide();
    }
  }

  // -- Handle events --
  private monomerLibOnChanged(_value: any): void {
    this.reset();
    this.invalidateGrid();
  }

  static getOrCreate(gridCell: DG.GridCell): HelmGridCellRendererBack {
    const [gridCol, tableCol, temp] =
      getGridCellRendererBack<string, HelmGridCellRendererBack>(gridCell);

    let res: HelmGridCellRendererBack = temp['rendererBack'];
    if (!res) res = temp['rendererBack'] = new HelmGridCellRendererBack(gridCol, tableCol);
    return res;
  }
}

export class HelmGridCellRenderer extends DG.GridCellRenderer {
  get name() { return 'helm'; }

  get cellType() { return 'helm'; }

  get defaultWidth(): number | null { return 400; }

  get defaultHeight(): number | null { return 100; }

  override onMouseMove(gridCell: DG.GridCell, e: MouseEvent) {
    const logPrefix = `Helm: HelmGridCellRenderer.onMouseMove()`;
    try {
      HelmGridCellRendererBack.getOrCreate(gridCell).onMouseMove(gridCell, e);
    } catch (err: any) {
      const [errMsg, errStack] = errInfo(err);
      _package.logger.error(errMsg, undefined, errStack);
    } finally {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  override render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ): void {
    HelmGridCellRendererBack.getOrCreate(gridCell).render(g, x, y, w, h, gridCell, cellStyle);
  }
}
