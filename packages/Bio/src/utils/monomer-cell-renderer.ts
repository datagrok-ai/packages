import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {PolymerType} from '@datagrok-libraries/bio/src/helm/types';
import {ALPHABET, getPaletteByType, monomerToShort} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {MonomerWorks} from '@datagrok-libraries/bio/src/monomer-works/monomer-works';

import * as C from './constants';
import {getMonomerLib} from '../package';

const Tags = new class {
  tooltipHandlerTemp = 'tooltip-handler.Monomer';
}();

const svgMolOptions = {autoCrop: true, autoCropMargin: 0, suppressChiralText: true};

export class MonomerTooltipHandler {
  private readonly gridCol: DG.GridColumn;

  constructor(gridCol: DG.GridColumn) {
    this.gridCol = gridCol;
    this.gridCol.grid.onCellTooltip(this.onCellTooltip.bind(this));
  }

  private onCellTooltip(gridCell: DG.GridCell, x: number, y: number): any {
    if (
      gridCell.grid.dart != this.gridCol.grid.dart || gridCell.gridColumn.dart != this.gridCol.dart ||
      !gridCell.tableColumn || !gridCell.isTableCell
    ) return false;

    const alphabet = gridCell.tableColumn.getTag(bioTAGS.alphabet) as ALPHABET;
    const monomerName = gridCell.cell.value;
    const canvasClientRect = gridCell.grid.canvas.getBoundingClientRect();
    const x1 = gridCell.bounds.right + canvasClientRect.left - 4;
    const y1 = gridCell.bounds.bottom + canvasClientRect.top - 4;

    const monomerLib = getMonomerLib();
    if (!monomerLib) {
      ui.tooltip.show(ui.divText('Monomer library is not available.'), x1, y1);
      return true;
    }

    const mw = new MonomerWorks(monomerLib);
    const polymerType: PolymerType = (alphabet === ALPHABET.DNA || alphabet === ALPHABET.RNA) ? 'RNA' :
      alphabet === ALPHABET.PT ? 'PEPTIDE' : 'PEPTIDE';
    // const biotype: HelmType = [ALPHABET.RNA, ALPHABET.DNA].includes(alphabet) ? HelmTypes.NUCLEOTIDE :
    //   [ALPHABET.PT].includes(alphabet) ? HelmTypes.AA : HelmTypes.AA;

    const monomerMol: string | null = mw.getCappedRotatedMonomer(polymerType, monomerName);
    const nameDiv = ui.div(monomerName);
    const molDiv = !monomerMol ? null :
      grok.chem.svgMol(monomerMol, undefined, undefined, svgMolOptions);

    ui.tooltip.show(ui.divV([nameDiv, ...(molDiv ? [molDiv] : [])]), x1, y1);

    return true; // To prevent default tooltip behaviour
  }

  public static getOrCreate(gridCol: DG.GridColumn): MonomerTooltipHandler {
    let res = gridCol.temp[Tags.tooltipHandlerTemp];
    if (!res)
      res = gridCol.temp[Tags.tooltipHandlerTemp] = new MonomerTooltipHandler(gridCol);
    return res;
  }
}

export class MonomerCellRenderer extends DG.GridCellRenderer {
  get name(): string { return C.SEM_TYPES.MONOMER; }

  get cellType(): string { return C.SEM_TYPES.MONOMER; }

  get defaultHeight(): number { return 15; }

  get defaultWidth(): number { return 40; }

  /**
   * Cell renderer function.
   *
   * @param {CanvasRenderingContext2D} g Canvas rendering context.
   * @param {number} x x coordinate on the canvas.
   * @param {number} y y coordinate on the canvas.
   * @param {number} w width of the cell.
   * @param {number} h height of the cell.
   * @param {DG.GridCell} gridCell Grid cell.
   * @param {DG.GridCellStyle} _cellStyle Cell style.
   */
  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell,
    _cellStyle: DG.GridCellStyle
  ): void {
    if (gridCell.gridRow < 0) return;
    MonomerTooltipHandler.getOrCreate(gridCell.gridColumn);


    g.font = `12px monospace`;
    g.textBaseline = 'middle';
    g.textAlign = 'center';

    const palette = getPaletteByType(gridCell.cell.column.getTag(bioTAGS.alphabet));
    const s: string = gridCell.cell.value;
    if (!s)
      return;
    const color = palette.get(s);

    g.fillStyle = color;
    g.fillText(monomerToShort(s, 6), x + (w / 2), y + (h / 2), w);
  }
}
