import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {monomerToShort} from './macromolecule/utils';
import {ILogger} from './logger';

const undefinedColor = 'rgb(100,100,100)';
const grayColor = '#808080';
const blackColor = 'rgb(0,0,0)';
const monomerToShortFunction: (amino: string, maxLengthOfMonomer: number) => string = monomerToShort;

export enum TAGS {
  maxMonomerLength = '.mm.cellRenderer.maxMonomerLength',
}

export enum DrawStyle {
  MSA = 'MSA',
  classic = 'classic',
}

export const PrintOptionsDefaults = new class {
  /** Color of text to print */ color: string = undefinedColor;
  /** */ pivot: number = 0;
  /** Is left aligned */ left: boolean = false;
  /** Transparency rate where 1.0 is fully transparent */ transparencyRate: number = 1.0;
  /** Monomer's separator, if specified */ separator: string = '';
  /** Is checker if element last or not */ last: boolean = false;
  /** MSA - for aligned, classic - for other seq */ drawStyle: DrawStyle = DrawStyle.classic;
  /** Max word lengths per position (index of list) */ maxWord: number[] = [];
  /** Word index we currently draw */ wordIdx: number = 0;
  /**  */ gridCell: DG.GridCell | null = null;
  /** Reference sequence for diff mode */ referenceSequence: string[] | null = null;
  /** Max length of a monomer */ maxLengthOfMonomer: number | null = null;
  /** Map of monomers' text sizes */ monomerTextSizeMap: { [key: string]: TextMetrics } = {};
  /** */ logger?: ILogger = undefined;
}();

export type PrintOptions = typeof PrintOptionsDefaults;

/** A function that prints a string aligned to left or centered.
 * @param {CanvasRenderingContext2D} g Canvas rendering context
 * @param {string} s Text to print
 * @param {number} x x coordinate
 * @param {number} y y coordinate
 * @param {number} w Width
 * @param {number} h Height
 * @param {PrintOptions} options
 * @return {number} x coordinate to start printing at.*/
export function printLeftOrCentered(g: CanvasRenderingContext2D,
  s: string, x: number, y: number, w: number, h: number, options: Partial<PrintOptions>
): number {
  const opts = Object.assign(Object.assign({}, PrintOptionsDefaults), options);

  const logPrefix: string = `Bio: printLeftOrCentered()`;
  options.logger?.debug(`${logPrefix}, start`);
  g.textAlign = 'start';
  let colorPart = s.substring(0);
  let grayPart = opts.last ? '' : opts.separator;
  if (opts.drawStyle === DrawStyle.MSA) grayPart = '';
  let colorCode = true;
  let compareWithCurrent = true;
  let highlightDifference = 'difference';
  if ((opts.gridCell != null) && (opts.gridCell.cell.column != null)) {
    colorCode = opts.gridCell.cell.column.temp['color-code'] ?? true;
    compareWithCurrent = opts.gridCell.cell.column.temp['compare-with-current'] ?? true;
    highlightDifference = opts.gridCell.cell.column.temp['highlight-difference'] ?? 'difference';
  }

  if (opts.referenceSequence) {
    const currentMonomerCanonical = opts.referenceSequence[opts.wordIdx];
    if (compareWithCurrent && (opts.referenceSequence.length > 0) && (highlightDifference === 'difference'))
      opts.transparencyRate = (colorPart == currentMonomerCanonical) ? 0.3 : opts.transparencyRate;
    if (compareWithCurrent && (opts.referenceSequence.length > 0) && (highlightDifference === 'equal'))
      opts.transparencyRate = (colorPart != currentMonomerCanonical) ? 0.3 : opts.transparencyRate;
  }
  if (opts.maxLengthOfMonomer != null)
    colorPart = monomerToShortFunction(colorPart, opts.maxLengthOfMonomer);

  const fullText = colorPart + grayPart;
  opts.monomerTextSizeMap[fullText] ??= g.measureText(fullText);
  let textSize: any = opts.monomerTextSizeMap[fullText];
  opts.monomerTextSizeMap[colorPart] ??= g.measureText(colorPart);
  let maxColorTextSize = opts.monomerTextSizeMap[colorPart].width;
  const dy = h / 2 - (textSize.fontBoundingBoxAscent + textSize.fontBoundingBoxDescent) / 2 + 1;

  opts.monomerTextSizeMap[grayPart] ??= g.measureText(grayPart);
  const grayPartSize = opts.monomerTextSizeMap[grayPart].width;
  textSize = textSize.width;
  if (opts.drawStyle === DrawStyle.MSA) {
    maxColorTextSize = opts.maxWord[opts.wordIdx];
    textSize = opts.maxWord[opts.wordIdx];
  }

  /** Draw color part at {@link dx1}, and gray part at {@link dx2}. */
  function draw(dx1: number, dx2: number): void {
    const drawColor = colorCode ? opts.color : blackColor;
    g.fillStyle = drawColor;
    g.globalAlpha = opts.transparencyRate;
    if (opts.drawStyle === DrawStyle.classic) {
      g.fillText(colorPart, x + dx1, y + dy);
      g.fillStyle = grayColor;
      g.fillText(grayPart, x + dx2, y + dy);
    }
    if (opts.drawStyle === DrawStyle.MSA)
      g.fillText(colorPart, x + dx1, y + dy);
  }

  const placeX: number = (opts.maxWord[opts.wordIdx] ?? 0) - (opts.maxWord[0] ?? 0);
  if (opts.left || textSize > w) {
    draw(placeX, placeX + maxColorTextSize);
    return x + placeX + maxColorTextSize + grayPartSize;
  } else {
    const dx = (w - textSize) / 2;
    draw(dx, dx + maxColorTextSize);
    return x + placeX + dx + maxColorTextSize;
  }
}
