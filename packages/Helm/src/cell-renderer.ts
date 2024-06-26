import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {HelmType, Mol} from '@datagrok-libraries/bio/src/helm/types';

import {printLeftOrCentered} from '@datagrok-libraries/bio/src/utils/cell-renderer';
import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';
import {getGridCellRendererBack} from '@datagrok-libraries/bio/src/utils/cell-renderer-back-base';

import {findMonomers, parseHelm, removeGapsFromHelm} from './utils';
import {HelmMonomerPlacer, ISeqMonomer} from './helm-monomer-placer';
import {getHoveredMonomerFallback, getHoveredMonomerFromEditorMol} from './utils/get-hovered';
import {JSDraw2HelmModule} from './types';

import {getMonomerLib} from './package';

declare const JSDraw2: JSDraw2HelmModule;

const enum tempTAGS {
  helmSumMaxLengthWords = 'helm-sum-maxLengthWords',
  helmMaxLengthWords = 'helm-maxLengthWords',

  helmPlacer = 'bio-helmPlacer',
}

/** Helm cell renderer in case of no missed monomer draws with JSDraw2.Editor (webeditor),
 * in case of missed monomers presented, draws linear sequences aligned in width per monomer.
 */
export class HelmCellRenderer extends DG.GridCellRenderer {
  get name() { return 'helm'; }

  get cellType() { return 'helm'; }

  get defaultWidth(): number | null { return 400; }

  get defaultHeight(): number | null { return 100; }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    try {
      const [_gridCol, tableCol, temp] =
        getGridCellRendererBack<string, HelmMonomerPlacer>(gridCell);
      const helmPlacer = temp['rendererBack'];
      /* Can not do anything without tableColumn */
      if (!tableCol) return;

      /** {@link gridCell}.bounds */ const gcb = gridCell.bounds;
      const argsX = e.offsetX - gcb.x;
      const argsY = e.offsetY - gcb.y;

      const editorMol: Mol<HelmType> | null = helmPlacer.getEditorMol(gridCell.tableRowIndex!);
      let seqMonomer: ISeqMonomer | null;
      let missedMonomers: Set<string> = new Set<string>(); // of .size = 0
      if (editorMol)
        seqMonomer = getHoveredMonomerFromEditorMol(argsX, argsY, gridCell, editorMol);
      else {
        const seq: string = !gridCell.cell.value ? '' : removeGapsFromHelm(gridCell.cell.value as string);
        const monomerList = parseHelm(seq);
        missedMonomers = findMonomers(monomerList);
        const parsedMonomers = new Set<string>(monomerList);
        seqMonomer = getHoveredMonomerFallback(argsX, argsY, gridCell, helmPlacer);
        if (seqMonomer && !parsedMonomers.has(seqMonomer.symbol)) seqMonomer = null;
        if (seqMonomer) {
          const textSize = helmPlacer.monomerTextSizeMap[seqMonomer.symbol];
          if (textSize) {
            const textBaseLine = gcb.height / 2 -
              (textSize.fontBoundingBoxAscent + textSize.fontBoundingBoxDescent) / 2 + 1;
            const textTop = textBaseLine - textSize.fontBoundingBoxAscent;
            const textBottom = textBaseLine + textSize.fontBoundingBoxDescent;
            if (argsY < textTop || textBottom < argsY) seqMonomer = null;
          }
        }
      }

      if (seqMonomer) {
        if (!missedMonomers.has(seqMonomer.symbol)) {
          const tooltipElements: HTMLElement[] = [ui.div(seqMonomer.symbol)];
          const monomerLib = getMonomerLib();
          const monomerDiv = monomerLib ? monomerLib.getTooltip(seqMonomer.polymerType, seqMonomer.symbol) :
            ui.divText('Monomer library is not available.');
          tooltipElements.push(monomerDiv);
          ui.tooltip.show(ui.divV(tooltipElements), e.x + 16, e.y + 16);
        } else {
          ui.tooltip.show(ui.divV([
            ui.divText(`Monomer '${seqMonomer.symbol}' not found.`),
            ui.divText('Open the Context Panel, then expand Manage Libraries'),
          ]), e.x + 16, e.y + 16);
        }
      } else if (missedMonomers.size == 0) {
        ui.tooltip.hide();
        return;
      } else { // seqMonomer == null && missedMonomers.size > 0
        const mmStrList = wu(missedMonomers.keys()).toArray().sort()
          .filter((_, i) => i < 3);
        const missedMonomersStr = mmStrList.join(', ') + (missedMonomers.size > 3 ? ', ...' : '');
        ui.tooltip.show(ui.divV([ui.divText('Monomers missed in monomer libraries:'),
          ui.divText(missedMonomersStr)
        ]), e.x + 16, e.y + 16);
      }
    } catch (err: any) {
      const errMsg: string = errorToConsole(err);
      console.error('Helm: HelmCellRenderer.onMouseMove() error:\n' + errMsg);
    } finally {
      e.preventDefault();
      e.stopPropagation();
    }
  }


  render(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ) {
    g.save();
    try {
      const [gridCol, tableCol, temp] =
        getGridCellRendererBack<string, HelmMonomerPlacer>(gridCell);
      /* Can not do anything without tableColumn containing temp */
      if (!tableCol) return;
      let helmPlacer = temp['rendererBack'];
      if (!helmPlacer) helmPlacer = temp['rendererBack'] = new HelmMonomerPlacer(gridCol, tableCol);

      const grid = gridCell.gridRow !== -1 ? gridCell.grid : undefined;
      const missedColor = 'red';
      const monomerColor: string = '#404040';
      const frameColor: string = '#C0C0C0';

      const seq: string = !gridCell.cell.value ? '' : removeGapsFromHelm(gridCell.cell.value);
      const monomerList = parseHelm(seq);
      const monomers: Set<string> = new Set<string>(monomerList);
      const missedMonomers: Set<string> = findMonomers(monomerList);

      if (missedMonomers.size == 0) {
        // Recreate host to avoid hanging in window.dojox.gfx.svg.Text.prototype.getTextWidth
        const host = gridCell.element = ui.div([],
          {style: {width: `${w - 2}px`, height: `${h - 2}px`, margin: `${1}px`, backgroundColor: '#FFE0E0'}});
        host.setAttribute('dataformat', 'helm');
        host.setAttribute('data', seq /* gaps skipped */);
        // if grid has neighbour to the left, then shift host to the left
        if (host.parentElement && (gridCell.grid?.canvas?.offsetLeft ?? 0) > 0) {
          host.parentElement.style.left =
            `${(gridCell.grid?.canvas?.offsetLeft ?? 0) + host.parentElement.offsetLeft}px`;
        }

        // Recreate editor to avoid hanging in window.dojox.gfx.svg.Text.prototype.getTextWidth
        const editor = new JSDraw2.Editor(host,
          {width: w, height: h, skin: 'w8', viewonly: true});
        helmPlacer.setEditorMol(gridCell.tableRowIndex!, editor.m);

        helmPlacer.skipCell(gridCell.tableRowIndex!);
        return;
      }

      if (missedMonomers.size > 0)
        throw new Error('Unexpected missed monomers');
    } finally {
      g.restore();
    }
  }
}
