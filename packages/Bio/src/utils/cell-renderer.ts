import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {_package, getBioLib} from '../package';
import {printLeftOrCentered, DrawStyle} from '@datagrok-libraries/bio/src/utils/cell-renderer';
import * as C from './constants';
import {MonomerPlacer} from '@datagrok-libraries/bio/src/utils/cell-renderer-monomer-placer';
import {
  getPaletteByType,
  getSplitter,
  monomerToShort,
  MonomerToShortFunc,
  NOTATION,
  SplitterFunc,
  TAGS as bioTAGS,
} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import {UnknownSeqPalettes} from '@datagrok-libraries/bio/src/unknown';
import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';
import {Temps as mmcrTemps, Tags as mmcrTags,
  tempTAGS, rendererSettingsChangedState} from '../utils/cell-renderer-consts';

type TempType = { [tagName: string]: any };

const undefinedColor = 'rgb(100,100,100)';
const monomerToShortFunction: MonomerToShortFunc = monomerToShort;

function getUpdatedWidth(grid: DG.Grid | null, g: CanvasRenderingContext2D, x: number, w: number): number {
  return grid ? Math.min(grid.canvas.width - x, w) : g.canvas.width - x;
}

export function processSequence(subParts: string[]): [string[], boolean] {
  const simplified = !subParts.some((amino, index) =>
    amino.length > 1 &&
    index != 0 &&
    index != subParts.length - 1);

  const text: string[] = [];
  const gap = simplified ? '' : ' ';
  subParts.forEach((amino: string, index) => {
    if (index < subParts.length)
      amino += `${amino ? '' : '-'}${gap}`;

    text.push(amino);
  });
  return [text, simplified];
}

export class MacromoleculeSequenceCellRenderer extends DG.GridCellRenderer {
  private padding: number = 5;

  get name(): string { return 'sequence'; }

  get cellType(): string { return 'sequence'; }

  get defaultHeight(): number | null { return 30; }

  get defaultWidth(): number | null { return 230; }

  onClick(gridCell: DG.GridCell, _e: MouseEvent): void {
    const colTemp: TempType = gridCell.cell.column.temp;
    colTemp[tempTAGS.currentWord] = gridCell.cell.value;
    gridCell.grid.invalidate();
  }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    // if (gridCell.cell.column.getTag(bioTAGS.aligned) !== ALIGNMENT.SEQ_MSA)
    //   return;

    const tableCol: DG.Column = gridCell.cell.column;
    //const tableColTemp: TempType = tableCol.temp;
    const seqColTemp: MonomerPlacer = tableCol.temp[tempTAGS.bioSeqCol];
    if (!seqColTemp) return; // Can do nothing without precalculated data

    const gridCellBounds: DG.Rect = gridCell.bounds;
    // const value: any = gridCell.cell.value;
    //
    // const maxLengthWords: number[] = seqColTemp.getCellMonomerLengths(gridCell.tableRowIndex!);
    // const maxLengthWordsSum: number[] = new Array<number>(maxLengthWords.length).fill(0);
    // for (let posI: number = 1; posI < maxLengthWords.length; posI++)
    //   maxLengthWordsSum[posI] = maxLengthWordsSum[posI - 1] + maxLengthWords[posI];
    // const maxIndex = maxLengthWords.length;
    const argsX = e.offsetX - gridCell.gridColumn.left + (gridCell.gridColumn.left - gridCellBounds.x);
    const left: number | null = seqColTemp.getPosition(gridCell.tableRowIndex!, argsX);

    const seqMonList: string[] = seqColTemp.getSeqMonList(gridCell.tableRowIndex!);
    if (left !== null && left < seqMonList.length) {
      const monomerSymbol: string = seqMonList[left];
      const tooltipElements: HTMLElement[] = [ui.div(monomerSymbol)];
      if (seqColTemp._monomerStructureMap[monomerSymbol]) {
        tooltipElements.push(seqColTemp._monomerStructureMap[monomerSymbol]);
      } else {
        const monomer = seqColTemp.getMonomer(monomerSymbol);
        if (monomer) {
          const options = {autoCrop: true, autoCropMargin: 0, suppressChiralText: true};
          const monomerSVG = grok.chem.svgMol(monomer.smiles, undefined, undefined, options);
          tooltipElements.push(monomerSVG);
          seqColTemp._monomerStructureMap[monomerSymbol] = monomerSVG;
        }
      }
      ui.tooltip.show(ui.divV(tooltipElements), e.x + 16, e.y + 16);
    } else {
      ui.tooltip.hide();
    }
  }

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
   * @memberof AlignedSequenceCellRenderer
   */
  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell,
    _cellStyle: DG.GridCellStyle
  ): void {
    let gapLength = 0;
    const msaGapLength = 8;
    let maxLengthOfMonomer = 999; // in case of long monomer representation, do not limit max length

    // TODO: Store temp data to GridColumn
    // Now the renderer requires data frame table Column underlying GridColumn
    const grid = gridCell.grid;
    const tableCol: DG.Column = gridCell.cell.column;
    const tableColTemp: TempType = tableCol.temp;

    // Cell renderer settings
    const tempMonomerWidth: string | null = tableColTemp[tempTAGS.monomerWidth];
    const monomerWidth: string = (tempMonomerWidth != null) ? tempMonomerWidth : 'short';
    if (monomerWidth === 'short')
      maxLengthOfMonomer = tableColTemp[mmcrTemps.maxMonomerLength] ?? _package.properties.maxMonomerLength;


    let seqColTemp: MonomerPlacer = tableCol.temp[tempTAGS.bioSeqCol];
    if (!seqColTemp) {
      seqColTemp = new MonomerPlacer(grid, tableCol,
        () => {
          const uh = UnitsHandler.getOrCreate(tableCol);
          return {
            unitsHandler: uh,
            monomerCharWidth: 7, separatorWidth: !uh.isMsa() ? gapLength : msaGapLength,
            monomerToShort: monomerToShortFunction, monomerLengthLimit: maxLengthOfMonomer,
            monomerLib: getBioLib()
          };
        });
    }

    if (tableCol.tags[mmcrTags.RendererSettingsChanged] === rendererSettingsChangedState.true) {
      gapLength = tableColTemp[mmcrTemps.gapLength] as number ?? gapLength;
      // this event means that the mm renderer settings have changed, particularly monomer representation and max width.
      seqColTemp.setMonomerLengthLimit(maxLengthOfMonomer);
      seqColTemp.setSeparatorWidth(seqColTemp.isMsa() ? msaGapLength : gapLength);
      tableCol.setTag(mmcrTags.RendererSettingsChanged, rendererSettingsChangedState.false);
    }

    const [maxLengthWords, maxLengthWordsSum]: [number[], number[]] =
      seqColTemp.getCellMonomerLengths(gridCell.tableRowIndex!);
    const _maxIndex = maxLengthWords.length;

    // Store updated seqColTemp to the col temp
    if (seqColTemp.updated) tableColTemp[tempTAGS.bioSeqCol] = seqColTemp;

    g.save();
    try {
      const grid = gridCell.gridRow !== -1 ? gridCell.grid : null;
      const value: any = gridCell.cell.value;
      const paletteType = tableCol.getTag(bioTAGS.alphabet);
      const minDistanceRenderer = 50;
      w = getUpdatedWidth(grid, g, x, w);
      g.beginPath();
      g.rect(x + this.padding, y + this.padding, w - this.padding - 1, h - this.padding * 2);
      g.clip();
      g.font = '12px monospace';
      g.textBaseline = 'top';

      //TODO: can this be replaced/merged with splitSequence?
      const units = tableCol.getTag(DG.TAGS.UNITS);
      const aligned: string = tableCol.getTag(bioTAGS.aligned);

      const palette = getPaletteByType(paletteType);

      const separator = tableCol.getTag(bioTAGS.separator) ?? '';
      const splitLimit = w / 5;
      const splitterFunc: SplitterFunc = getSplitter(units, separator, splitLimit);

      const tempReferenceSequence: string | null = tableColTemp[tempTAGS.referenceSequence];
      const tempCurrentWord: string | null = tableColTemp[tempTAGS.currentWord];
      const referenceSequence: string[] = splitterFunc(
        ((tempReferenceSequence != null) && (tempReferenceSequence != '')) ?
          tempReferenceSequence : tempCurrentWord ?? '');

      // let maxLengthWords: { [pos: number]: number } = {};
      // if (tableCol.getTag(rndrTAGS.calculatedCellRender) !== splitLimit.toString()) {
      //   let sampleCount = 0;
      //   while (sampleCount < Math.min(tableCol.length, 100)) {
      //     const rowIdx: number = sampleCount;
      //     const column = tableCol.get(rowIdx);
      //     const subParts: string[] = splitterFunc(column);
      //     for (const [index, amino] of subParts.entries()) {
      //       const textSize = monomerToShortFunction(amino, maxLengthOfMonomer).length * 7 + gapRenderer;
      //       if (textSize > (maxLengthWords[index] ?? 0))
      //         maxLengthWords[index] = textSize;
      //       if (index > maxIndex) maxIndex = index;
      //     }
      //     sampleCount += 1;
      //   }
      //   const minLength = 3 * 7;
      //   for (let i = 0; i <= maxIndex; i++) {
      //     if (maxLengthWords[i] < minLength) maxLengthWords[i] = minLength;
      //     const maxLengthWordSum: { [pos: number]: number } = {};
      //     maxLengthWordSum[0] = maxLengthWords[0];
      //     for (let i = 1; i <= maxIndex; i++) maxLengthWordSum[i] = maxLengthWordSum[i - 1] + maxLengthWords[i];
      //     colTemp[tempTAGS.bioSumMaxLengthWords] = maxLengthWordSum;
      //     colTemp[tempTAGS.bioMaxIndex] = maxIndex;
      //     colTemp[tempTAGS.bioMaxLengthWords] = maxLengthWords;
      //     tableCol.setTag(rndrTAGS.calculatedCellRender, splitLimit.toString());
      //   }
      // } else {
      //   maxLengthWords = colTemp[tempTAGS.bioMaxLengthWords];
      // }

      const subParts: string[] = splitterFunc(value);
      /* let x1 = x; */
      let color = undefinedColor;
      let drawStyle = DrawStyle.classic;

      if (aligned && aligned.includes('MSA') && units == NOTATION.SEPARATOR)
        drawStyle = DrawStyle.MSA;

      for (const [index, amino] of subParts.entries()) {
        color = palette.get(amino);
        g.fillStyle = undefinedColor;
        const last = index === subParts.length - 1;
        /*x1 = */
        printLeftOrCentered(x + this.padding, y, w, h,
          g, amino, color, 0, true, 1.0, separator, last, drawStyle,
          maxLengthWordsSum, index, gridCell, referenceSequence, maxLengthOfMonomer, seqColTemp._monomerLengthMap);
        if (minDistanceRenderer > w) break;
      }
    } catch (err: any) {
      const errMsg: string = err instanceof Error ? err.message : !!err ? err.toString() : 'Error \'undefined\'';
      _package.logger.error(`Bio: MacromoleculeSequenceCellRenderer.render() error: ${errMsg}`);
      //throw err; // Do not throw to prevent disabling renderer
    } finally {
      g.restore();
    }
  }
}


export class MacromoleculeDifferenceCellRenderer extends DG.GridCellRenderer {
  get name(): string { return 'MacromoleculeDifferenceCR'; }

  get cellType(): string { return C.SEM_TYPES.MACROMOLECULE_DIFFERENCE; }

  get defaultHeight(): number { return 30; }

  get defaultWidth(): number { return 230; }

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
   * @memberof AlignedSequenceDifferenceCellRenderer
   */
  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, gridCell: DG.GridCell,
    _cellStyle: DG.GridCellStyle): void {
    const grid = gridCell.grid;
    const cell = gridCell.cell;
    const s: string = cell.value ?? '';
    const separator = gridCell.tableColumn!.tags[bioTAGS.separator];
    const units: string = gridCell.tableColumn!.tags[DG.TAGS.UNITS];
    w = getUpdatedWidth(grid, g, x, w);
    //TODO: can this be replaced/merged with splitSequence?
    const [s1, s2] = s.split('#');
    const splitter = getSplitter(units, separator);
    const subParts1 = splitter(s1);
    const subParts2 = splitter(s2);
    drawMoleculeDifferenceOnCanvas(g, x, y, w, h, subParts1, subParts2, units);
  }
}

export function drawMoleculeDifferenceOnCanvas(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  subParts1: string [],
  subParts2: string [],
  units: string,
  fullStringLength?: boolean,
  molDifferences?: { [key: number]: HTMLCanvasElement },
): void {
  if (subParts1.length !== subParts2.length) {
    const sequences: IComparedSequences = fillShorterSequence(subParts1, subParts2);
    subParts1 = sequences.subParts1;
    subParts2 = sequences.subParts2;
  }
  const textSize1 = g.measureText(processSequence(subParts1).join(''));
  const textSize2 = g.measureText(processSequence(subParts2).join(''));
  const textWidth = Math.max(textSize1.width, textSize2.width);
  if (fullStringLength) {
    w = textWidth + subParts1.length * 4;
    g.canvas.width = textWidth + subParts1.length * 4;
  }
  let updatedX = Math.max(x, x + (w - (textWidth + subParts1.length * 4)) / 2) + 5;
  // 28 is the height of the two substitutions on top of each other + space
  const updatedY = Math.max(y, y + (h - 28) / 2);

  g.save();
  g.beginPath();
  g.rect(x, y, fullStringLength ? textWidth + subParts1.length * 4 : w, h);
  g.clip();
  g.font = '12px monospace';
  g.textBaseline = 'top';

  let palette: SeqPalette = UnknownSeqPalettes.Color;
  if (units != 'HELM')
    palette = getPaletteByType(units.substring(units.length - 2));

  const vShift = 7;
  for (let i = 0; i < subParts1.length; i++) {
    const amino1 = subParts1[i];
    const amino2 = subParts2[i];
    const color1 = palette.get(amino1);

    if (amino1 != amino2) {
      const color2 = palette.get(amino2);
      const subX0 = printLeftOrCentered(updatedX, updatedY - vShift, w, h, g, amino1, color1, 0, true);
      const subX1 = printLeftOrCentered(updatedX, updatedY + vShift, w, h, g, amino2, color2, 0, true);
      updatedX = Math.max(subX1, subX0);
      if (molDifferences)
        molDifferences[i] = createDifferenceCanvas(amino1, amino2, color1, color2, updatedY, vShift, h);
    } else { updatedX = printLeftOrCentered(updatedX, updatedY, w, h, g, amino1, color1, 0, true, 0.5); }
    updatedX += 4;
  }
  g.restore();
}

interface IComparedSequences {
  subParts1: string[];
  subParts2: string[];
}

function createDifferenceCanvas(
  amino1: string,
  amino2: string,
  color1: string,
  color2: string,
  y: number,
  shift: number,
  h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = '12px monospace';
  const width1 = context.measureText(processSequence([amino1]).join('')).width;
  const width2 = context.measureText(processSequence([amino2]).join('')).width;
  const width = Math.max(width1, width2);
  canvas.height = h;
  canvas.width = width + 4;
  context.font = '12px monospace';
  context.textBaseline = 'top';
  printLeftOrCentered(0, y - shift, width, h, context, amino1, color1, 0, true);
  printLeftOrCentered(0, y + shift, width, h, context, amino2, color2, 0, true);
  return canvas;
}

function fillShorterSequence(subParts1: string[], subParts2: string[]): IComparedSequences {
  let numIdenticalStart = 0;
  let numIdenticalEnd = 0;
  const longerSeq = subParts1.length > subParts2.length ? subParts1 : subParts2;
  const shorterSeq = subParts1.length > subParts2.length ? subParts2 : subParts1;

  for (let i = 0; i < shorterSeq.length; i++) {
    if (longerSeq[i] === shorterSeq[i])
      numIdenticalStart++;
  }

  const lengthDiff = longerSeq.length - shorterSeq.length;
  for (let i = longerSeq.length - 1; i > lengthDiff; i--) {
    if (longerSeq[i] === shorterSeq[i - lengthDiff])
      numIdenticalEnd++;
  }

  const emptyMonomersArray = new Array<string>(Math.abs(subParts1.length - subParts2.length)).fill('');

  function concatWithEmptyVals(subparts: string[]): string[] {
    return numIdenticalStart > numIdenticalEnd ?
      subparts.concat(emptyMonomersArray) : emptyMonomersArray.concat(subparts);
  }

  subParts1.length > subParts2.length ?
    subParts2 = concatWithEmptyVals(subParts2) : subParts1 = concatWithEmptyVals(subParts1);
  return {subParts1: subParts1, subParts2: subParts2};
}
