/* eslint-disable max-len */
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import * as C from './constants';
import * as type from './types';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import {monomerToShort} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {calculateMonomerPositionStatistics} from './algorithms';
import * as rxjs from 'rxjs';
import {showTooltipAt, TooltipOptions} from './tooltips';
import {MonomerPositionStats, MonomerPositionStatsCache, PositionStats} from './statistics';
import {CLUSTER_TYPE} from '../viewers/logo-summary';
import {MonomerPosition, MostPotentResidues, SARViewer} from '../viewers/sar-viewer';

/**
 * Renders cell selection border.
 * @param canvasContext - Canvas context.
 * @param bounds - Cell bounds.
 */
export function renderCellSelection(canvasContext: CanvasRenderingContext2D, bounds: DG.Rect): void {
  canvasContext.strokeStyle = DG.Color.toHtml(DG.Color.selectedRows);
  canvasContext.lineWidth = 3;
  canvasContext.strokeRect(bounds.x + 1, bounds.y + 1, bounds.width - 1, bounds.height - 1);
}

/**
 * Sets amino acid residue cell renderer to the specified column.
 * @param col - Column to set renderer to.
 * @param alphabet - Sequence alphabet.
 */
export function setMonomerRenderer(col: DG.Column, alphabet: string): void {
  col.semType = C.SEM_TYPES.MONOMER;
  col.setTag(DG.TAGS.CELL_RENDERER, C.SEM_TYPES.MONOMER);
  col.setTag(C.TAGS.ALPHABET, alphabet);
}

/**
 * Renders mutation cliffs cell.
 * @param canvasContext - Canvas context.
 * @param currentMonomer - Current monomer.
 * @param currentPosition - Current position.
 * @param viewer - Viewer that requested rendering.
 * @param bounds - Cell bounds.
 */
export function renderMutationCliffCell(canvasContext: CanvasRenderingContext2D, currentMonomer: string,
  currentPosition: string, viewer: SARViewer, bounds: DG.Rect): void {
  const halfWidth = bounds.width / 2;
  const midX = Math.ceil(bounds.x + 1 + halfWidth);
  const midY = Math.ceil(bounds.y + 1 + bounds.height / 2);
  const maxRadius = 0.9 * halfWidth / 2; // Fill at most 90% of the half of the cell width
  // render most potent residues cells according to the p-value (color) and mean difference (size)
  if (viewer instanceof MostPotentResidues) {
    const positionStats = viewer.monomerPositionStats[currentPosition];
    const pVal = positionStats![currentMonomer]!.pValue;
    const currentMeanDifference = positionStats![currentMonomer]!.meanDifference;

    // Transform p-value to increase intensity for smaller values and decrease for larger values
    const maxPValComplement = 1 - positionStats!.general.maxPValue;
    const minPValComplement = 1 - positionStats!.general.minPValue;
    const pValCentering = Math.min(maxPValComplement, minPValComplement);
    const centeredMaxPValComplement = maxPValComplement - pValCentering;
    const centeredMinPValComplement = minPValComplement - pValCentering;
    const centeredPValLimit = Math.max(centeredMaxPValComplement, centeredMinPValComplement);
    const pValComplement = pVal === null ? 0 : 1 - pVal - pValCentering;

    const x = currentMeanDifference >= 0 ? pValComplement : -pValComplement;
    const coef = DG.Color.toHtml(pVal === null ? DG.Color.lightLightGray :
      DG.Color.scaleColor(x, -centeredPValLimit, centeredPValLimit, 255));


    const maxMeanDifference = Math.max(Math.abs(viewer.monomerPositionStats.general.minMeanDifference),
      viewer.monomerPositionStats.general.maxMeanDifference);
    const rCoef = Math.abs(currentMeanDifference) / maxMeanDifference;

    const radius = Math.floor(maxRadius * rCoef);


    canvasContext.beginPath();
    canvasContext.fillStyle = coef;
    canvasContext.arc(midX - halfWidth / 2, midY, radius < 3 || pVal === null ? 3 : radius, 0, Math.PI * 2, true);
    canvasContext.closePath();
    canvasContext.fill();
  } else if (viewer instanceof MonomerPosition && viewer.mutationCliffs && viewer.cliffStats) {
    const maxCount = viewer.cliffStats.maxCount;
    const minDiff = viewer.cliffStats.minDiff;
    const maxDiff = viewer.cliffStats.maxDiff;
    const stats = viewer.cliffStats?.stats?.get(currentMonomer)?.get(currentPosition);
    if (stats) {
      const count = stats.count;
      const diff = stats.meanDifference;
      const radius = Math.floor(Math.abs((count / Math.max(maxCount, 2))) * maxRadius);
      const diffScalingFactor = Math.max(Math.abs(minDiff), Math.abs(maxDiff));
      const colorCoef = DG.Color.toHtml(diff === null ? DG.Color.lightLightGray :
        DG.Color.scaleColor(diff, -diffScalingFactor, diffScalingFactor, 255));
      canvasContext.beginPath();
      canvasContext.fillStyle = colorCoef;
      canvasContext.arc(midX - halfWidth / 2, midY, radius < 3 || count == 0 ? 3 : radius, 0, Math.PI * 2, true);
      canvasContext.closePath();
      canvasContext.fill();
    }
  }

  canvasContext.textBaseline = 'middle';
  canvasContext.textAlign = 'end';
  canvasContext.fillStyle = '#606060';
  canvasContext.font = '13px Roboto, Roboto Local, sans-serif';
  canvasContext.shadowBlur = 5;
  canvasContext.shadowColor = DG.Color.toHtml(DG.Color.white);
  const uniqueValues = new Set<number>();
  const substitutions = viewer.mutationCliffs?.get(currentMonomer)?.get(currentPosition)?.entries() ?? null;
  if (substitutions !== null) {
    for (const [key, value] of substitutions) {
      uniqueValues.add(key);
      for (const val of value)
        uniqueValues.add(val);
    }
  }
  if (uniqueValues.size !== 0)
    canvasContext.fillText(uniqueValues.size.toString(), midX + halfWidth - 5, midY, halfWidth - 5);


  const monomerSelection = viewer.mutationCliffsSelection[currentPosition];
  if (monomerSelection && monomerSelection.includes(currentMonomer))
    renderCellSelection(canvasContext, bounds);
}

/**
 * Renders invariant map cell.
 * @param canvasContext - Canvas context.
 * @param currentMonomer - Current monomer.
 * @param currentPosition - Current position.
 * @param invariantMapSelection - Invariant map selection.
 * @param cellValue - Cell value.
 * @param bounds - Cell bounds.
 * @param color - Cell color.
 */

function setAlpha(color: number, alpha: number): number {
  return (color & 0x00ffffff | (alpha << 24)) >>> 0;
}
export function renderInvariantMapCell(canvasContext: CanvasRenderingContext2D, currentMonomer: string,
  currentPosition: string, invariantMapSelection: type.Selection, cellValue: number, bounds: DG.Rect,
  color: number): void {
  //FIXME: This is a hack, because `color` value sometimes comes incomplete. E.g. we found that here `color` value is
  // 255 and its contrast color would be black, which is not visible on blue (color code) background. The full number
  // is actually 4278190335.
  color = DG.Color.fromHtml(DG.Color.toHtml(setAlpha(color, 255)));
  let renderedValue = cellValue.toFixed(2);
  if (renderedValue.endsWith('.00'))
    renderedValue = cellValue.toFixed(0);
  if (renderedValue.endsWith('0') && renderedValue.includes('.'))
    renderedValue = cellValue.toFixed(1);

  const fontSize = Math.min(13, Math.floor(bounds.width / 40 / renderedValue.length * 6 * 13));

  canvasContext.fillStyle = DG.Color.toHtml(color);
  canvasContext.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  canvasContext.font = `${fontSize}px Roboto, Roboto Local, sans-serif`;
  canvasContext.textAlign = 'center';
  canvasContext.textBaseline = 'middle';
  canvasContext.fillStyle = DG.Color.toHtml(DG.Color.getContrastColor(color));
  canvasContext.fillText(renderedValue, bounds.x + (bounds.width / 2), bounds.y + (bounds.height / 2),
    bounds.width);

  const monomerSelection = invariantMapSelection[currentPosition];
  if (monomerSelection && monomerSelection.includes(currentMonomer))
    renderCellSelection(canvasContext, bounds);
}

/**
 * Renders logo summary table cell.
 * @param canvasContext - Canvas context.
 * @param cellValue - Cell value.
 * @param clusterSelection - Cluster selection.
 * @param bounds - Cell bounds.
 */
export function renderLogoSummaryCell(canvasContext: CanvasRenderingContext2D, cellValue: string,
  clusterSelection: type.Selection, bounds: DG.Rect): void {
  canvasContext.font = '13px Roboto, Roboto Local, sans-serif';
  canvasContext.textAlign = 'center';
  canvasContext.textBaseline = 'middle';
  canvasContext.fillStyle = '#000';
  canvasContext.fillText(cellValue.toString(), bounds.x + (bounds.width / 2), bounds.y + (bounds.height / 2),
    bounds.width);

  if (clusterSelection[CLUSTER_TYPE.CUSTOM].includes(cellValue) ||
    clusterSelection[CLUSTER_TYPE.ORIGINAL].includes(cellValue))
    renderCellSelection(canvasContext, bounds);
}

/**
 * Renders WebLogo in a cell.
 * @param ctx - Canvas context.
 * @param bounds - Cell bounds.
 * @param stats - Position statistics.
 * @param position - Position name.
 * @param sortedOrder - Monomers order to render.
 * @param rowCount - Total dataframe rows count.
 * @param cp - Color palette.
 * @param [monomerSelectionStats] - Monomer selection statistics.
 * @param [drawOptions] - Drawing options.
 * @return - WebLogo monomer bounds.
 */
export function drawLogoInBounds(ctx: CanvasRenderingContext2D, bounds: DG.Rect, stats: PositionStats, position: string,
  sortedOrder: string[], rowCount: number, cp: SeqPalette, monomerSelectionStats: {
    [monomer: string]: number
  } = {},
  drawOptions: type.DrawOptions = {}): { [monomer: string]: DG.Rect } {
  const pr = window.devicePixelRatio;
  drawOptions.symbolStyle ??= '16px Roboto, Roboto Local, sans-serif';
  drawOptions.upperLetterHeight ??= 12.2;
  drawOptions.upperLetterAscent ??= 0.25;
  drawOptions.marginVertical ??= 1;
  drawOptions.marginHorizontal ??= 1;
  drawOptions.selectionWidth ??= 2;
  drawOptions.textHeight ??= 13;
  drawOptions.headerStyle ??= `bold ${drawOptions.textHeight * pr}px Roboto, Roboto Local, sans-serif`;

  const totalSpace = (sortedOrder.length - 1) * drawOptions.upperLetterAscent; // Total space between letters
  let currentY = (bounds.y + drawOptions.marginVertical) * pr;
  const barHeight = (bounds.height - 2 * drawOptions.marginVertical - totalSpace - 1.25 * drawOptions.textHeight) * pr;

  const xSelection = (bounds.x + drawOptions.marginHorizontal) * pr;
  const selectionWidth = Math.max(drawOptions.selectionWidth * pr, 0.05 * bounds.width * pr);
  const leftShift = drawOptions.marginHorizontal * 2 + drawOptions.selectionWidth;
  const barWidth = (bounds.width - (leftShift + drawOptions.marginHorizontal)) * pr;
  const xStart = (bounds.x + leftShift) * pr;

  const monomerBounds: { [monomer: string]: DG.Rect } = {};
  for (const monomer of sortedOrder) {
    const monomerHeight = barHeight * (stats[monomer]!.count / rowCount);
    const selectionHeight = barHeight * ((monomerSelectionStats[monomer] ?? 0) / rowCount);
    monomerBounds[monomer] = new DG.Rect(xStart / pr, currentY / pr, barWidth / pr, monomerHeight / pr);

    ctx.resetTransform();
    if (monomer !== '-' && monomer !== '') {
      const monomerTxt = monomerToShort(monomer, 5);
      const mTm: TextMetrics = ctx.measureText(monomerTxt);

      if (selectionHeight > 0) {
        // Filling selection
        ctx.lineWidth = selectionWidth;
        ctx.line(xSelection, currentY, xSelection, currentY + selectionHeight, DG.Color.rowSelection);
      }

      ctx.fillStyle = cp.get(monomer) ?? cp.get('other');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = drawOptions.symbolStyle;
      // Hacks to scale uppercase characters to target rectangle
      const widthTransform = barWidth / mTm.width;
      const heightTransform = monomerHeight / drawOptions.upperLetterHeight;
      ctx.setTransform(widthTransform, 0, 0, heightTransform, xStart, currentY);
      ctx.fillText(monomerTxt, 0, 0, mTm.width);
    }
    currentY += monomerHeight + drawOptions.upperLetterAscent * pr;
  }

  // Drawing column header
  ctx.resetTransform();
  ctx.fillStyle = DG.Color.toHtml(DG.Color.black);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = drawOptions.headerStyle;
  ctx.fillText(position, (bounds.x + bounds.width / 2) * pr, (bounds.y + bounds.height - drawOptions.textHeight) * pr);

  return monomerBounds;
}

export type WebLogoCellRendererOptions = {
  isSelectionTable?: boolean,
  headerSelectedMonomers?: () => type.SelectionStats,
  webLogoBounds: () => WebLogoBounds,
  cachedWebLogoTooltip: () => type.CachedWebLogoTooltip,
  colorPalette: () => SeqPalette,
  unhighlightCallback?: () => void,
  highlightCallback?: (mp: type.SelectionItem, dataFrame: DG.DataFrame, stats: MonomerPositionStats) => void,
  selectionCallback?: (monomerPosition: type.SelectionItem, options: type.SelectionOptions) => void,
};
export type WebLogoBounds = { [position: string]: { [monomer: string]: DG.Rect } };

/**
 * Sets WebLogo renderer.
 * @param grid - Grid to set renderer to.
 * @param monomerPositionStats - Monomer position statistics.
 * @param positionColumns - Position columns.
 * @param activityCol - Activity column.
 * @param options - Cell renderer options.
 * @param tooltipOptions - Tooltip options.
 */
export function setWebLogoRenderer(grid: DG.Grid, monomerPositionStats: MonomerPositionStats,
  positionColumns: DG.Column<string>[], activityCol: DG.Column<number>, options: WebLogoCellRendererOptions,
  tooltipOptions: TooltipOptions = {
    x: 0, y: 0, mpStats: {} as MonomerPositionStats,
    monomerPosition: {} as type.SelectionItem,
  }): void {
  options.isSelectionTable ??= false;
  if (Object.keys(tooltipOptions.mpStats).length == 0)
    tooltipOptions.mpStats = monomerPositionStats;


  if (options.isSelectionTable && (!options.webLogoBounds || !options.cachedWebLogoTooltip)) {
    throw new Error('Peptides: Cannot set WebLogo renderer for selection table without `headerSelectedMonomers`, ' +
      '`webLogoBounds` and `cachedWebLogoTooltip` options.');
  }

  const df = grid.dataFrame;
  grid.setOptions({'colHeaderHeight': 130});
  const headerRenderer = (gcArgs: DG.GridCellRenderArgs): void => {
    const ctx = gcArgs.g;
    const bounds = gcArgs.bounds;
    const col = gcArgs.cell.tableColumn;

    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();

      //TODO: optimize
      if (gcArgs.cell.isColHeader && col?.semType === C.SEM_TYPES.MONOMER) {
        const isDfFiltered = df.filter.anyFalse;
        let stats: PositionStats | undefined;
        if (isDfFiltered) {
          const cache: MonomerPositionStatsCache = df.temp[C.TAGS.M_P_STATS_CACHE] ?? {};
          const colCache = cache?.[col.name];
          const dfFilterBuffer = df.filter.getBuffer();
          if (cache && colCache && colCache.filter.length === dfFilterBuffer.length &&
            colCache.filter.every((v, i) => v === dfFilterBuffer[i]))
            stats = colCache.stats[col.name];
          else {
            const fullStats = calculateMonomerPositionStatistics(activityCol, df.filter, positionColumns, {
              isFiltered: true,
              columns: [col.name],
            });
            stats = fullStats[col.name];
            cache[col.name] = {filter: df.filter.getBuffer(), stats: fullStats, selection: df.selection.getBuffer()};
          }
          df.temp[C.TAGS.M_P_STATS_CACHE] = cache;
        } else if (options.isSelectionTable) {
          stats = calculateMonomerPositionStatistics(activityCol, df.filter, positionColumns, {
            isFiltered: true,
            columns: [col.name],
          })[col.name];
        } else
          stats = monomerPositionStats[col.name];


        if (!stats)
          return;


        //TODO: precalc on stats creation
        const sortedStatsOrder = Object.keys(stats).sort((a, b) => {
          if (a === '' || a === '-')
            return +1;
          else if (b === '' || b === '-')
            return -1;


          return 0;
        }).filter((v) => v !== 'general');

        options.webLogoBounds()![col.name] = drawLogoInBounds(ctx, bounds, stats, col.name,
          sortedStatsOrder, df.filter.trueCount, options.colorPalette(),
          options.headerSelectedMonomers ? options.headerSelectedMonomers()[col.name] : {});
        gcArgs.preventDefault();
      }
    } catch (e) {
      console.warn(`PeptidesHeaderLogoError: couldn't render WebLogo for column \`${col!.name}\`. ` +
        `See original error below.`);
      console.warn(e);
    } finally {
      ctx.restore();
    }
  };
  grid.onCellRender.subscribe((gcArgs) => headerRenderer(gcArgs));

  const eventAction = (ev: MouseEvent): void => {
    const cell = grid.hitTest(ev.offsetX, ev.offsetY);
    if (cell?.isColHeader && cell.tableColumn?.semType === C.SEM_TYPES.MONOMER) {
      const monomerPosition = findWebLogoMonomerPosition(cell, ev, (options.webLogoBounds()));
      if (monomerPosition === null) {
        if (!options.isSelectionTable && options.unhighlightCallback != null)
          options.unhighlightCallback();


        return;
      }
      tooltipOptions.monomerPosition = monomerPosition;
      requestWebLogoAction(ev, monomerPosition, df, activityCol, options, tooltipOptions);
      if (!options.isSelectionTable && options.highlightCallback != null)
        options.highlightCallback(monomerPosition, df, monomerPositionStats);
    }
  };

  // The following events makes the barchart interactive
  rxjs.fromEvent<MouseEvent>(grid.overlay, 'mousemove').subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
  rxjs.fromEvent<MouseEvent>(grid.overlay, 'click').subscribe((mouseMove: MouseEvent) => eventAction(mouseMove));
}

/**
 * Handles WebLogoAction action.
 * @param ev - Mouse event.
 * @param monomerPosition - Monomer-position object.
 * @param df - Dataframe with WebLogo in header.
 * @param activityCol - Activity column.
 * @param options - WebLogo cell renderer options.
 * @param tooltipOptions - Tooltip options.
 */
function requestWebLogoAction(ev: MouseEvent, monomerPosition: type.SelectionItem, df: DG.DataFrame,
  activityCol: DG.Column<number>, options: WebLogoCellRendererOptions, tooltipOptions: TooltipOptions): void {
  if (ev.type === 'click' && !options.isSelectionTable && options.selectionCallback != null)
    options.selectionCallback(monomerPosition, {shiftPressed: ev.shiftKey, ctrlPressed: ev.ctrlKey});
  else {
    const bar = `${monomerPosition.positionOrClusterType} = ${monomerPosition.monomerOrCluster}`;
    if (options.cachedWebLogoTooltip()!.bar === bar)
      ui.tooltip.show(options.cachedWebLogoTooltip()!.tooltip!, ev.clientX, ev.clientY);
    else {
      options.cachedWebLogoTooltip()!.bar = bar;
      tooltipOptions.x = ev.clientX;
      tooltipOptions.y = ev.clientY;
      tooltipOptions.monomerPosition = monomerPosition;
      options.cachedWebLogoTooltip()!.tooltip = showTooltipAt(df, activityCol, [], tooltipOptions);
    }
  }
}

/**
 * Finds monomer-position pair in a grid cell with WebLogo render.
 * @param cell - Grid cell to look for monomer-position pair.
 * @param ev - Mouse event.
 * @param webLogoBounds - Monomer bounds in WebLogo position.
 * @return - Monomer-position pair.
 */
function findWebLogoMonomerPosition(cell: DG.GridCell, ev: MouseEvent, webLogoBounds: WebLogoBounds,
): type.SelectionItem | null {
  const barCoords = webLogoBounds[cell.tableColumn!.name];
  if (!barCoords)
    return null;
  for (const [monomer, coords] of Object.entries(barCoords)) {
    const isIntersectingX = ev.offsetX >= coords.x && ev.offsetX <= coords.x + coords.width;
    const isIntersectingY = ev.offsetY >= coords.y && ev.offsetY <= coords.y + coords.height;
    if (isIntersectingX && isIntersectingY)
      return {monomerOrCluster: monomer, positionOrClusterType: cell.tableColumn!.name};
  }

  return null;
}


/**
 * Renderer for LST pie chart cell
 *
 */

export class LSTPieChartRenderer extends DG.GridCellRenderer {
  get name(): string {return 'LST Pie Chart';}

  get cellType(): string {return 'lst-pie-chart';}

  get defaultWidth(): number | null {return 80;}

  get defaultHeight(): number | null {return 80;}

  colorCacheKey = 'lst-pie-chart-color-cache'; // key for temp storage of category number cache
  categoryNumberCache(col: DG.Column): {[_: string]: number} {
    if (!col.temp[this.colorCacheKey])
      col.temp[this.colorCacheKey] = {};
    return col.temp[this.colorCacheKey] as {[_: string]: number};
  };

  HoverTempKey = 'lst-pie-chart-hovered-sector'; // key for temp storage of hovered sector
  hoverSeparator = ',,,,,'; // separator for hovered sector

  getPrevHoveredSector(col: DG.Column): string | null {
    return col.temp[this.HoverTempKey] as string;
  }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    const prev = this.getPrevHoveredSector(gridCell.cell.column);
    const beforeReturn = (): void => {
      gridCell.cell.column.temp[this.HoverTempKey] = null;
      ui.tooltip.hide();

      if (prev !== null)
        gridCell.grid.invalidate();
    };

    const value = gridCell.cell.value;
    if (!value) {
      beforeReturn();
      return;
    }
    const vectorX = e.offsetX - gridCell.bounds.midX;
    const vectorY = e.offsetY - gridCell.bounds.midY;
    const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    const atan2 = Math.atan2(vectorY, vectorX);
    const angle = atan2 < 0 ? atan2 + 2 * Math.PI : atan2;
    if (distance > Math.min(gridCell.bounds.width, gridCell.bounds.height) / 2 - 2) {
      beforeReturn();
      return;
    }

    let JSONData: {[_: string]: number};
    try {
      JSONData = JSON.parse(value);
    } catch (e) {
      beforeReturn();
      return;
    }

    const angles = new Float64Array(Object.keys(JSONData).length + 1);
    const totalCount = Object.values(JSONData).reduce((a, b) => a + b, 0);
    angles[Object.keys(JSONData).length] = Math.PI * 2;
    let angleAccum = 0;
    let i = 0;
    for (const val of Object.values(JSONData)) {
      angles[i++] = angleAccum;
      const angleAdd = 2 * Math.PI * val / totalCount;
      angleAccum += angleAdd;
    }

    let hitCategory = -1;
    for (let i = 0; i < angles.length - 1; i++) {
      if (angle >= angles[i] && angle < angles[i + 1]) {
        hitCategory = i;
        break;
      }
    }
    if (hitCategory === -1) {
      beforeReturn();
      return;
    }
    const hitCategoryName = Object.keys(JSONData)[hitCategory];
    const hitCategoryValue = JSONData[hitCategoryName];
    const percentage = (hitCategoryValue / totalCount * 100).toFixed(2);
    ui.tooltip.show(ui.h1(`${hitCategoryName}: ${hitCategoryValue} (${percentage}%)`), e.x + 16, e.y +
      16);
    const hoverTemp = gridCell.cell.rowIndex.toString() + this.hoverSeparator + hitCategoryName;
    gridCell.cell.column.temp[this.HoverTempKey] = hoverTemp;
    if (prev !== hoverTemp)
      gridCell.grid.invalidate();
  }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, _cellStyle: DG.GridCellStyle,
  ): void {
    const df = gridCell.cell.dataFrame;
    const box = new DG.Rect(x, y, w, h).fitSquare().inflate(-2, -2);
    if (w < 5 || h < 5 || !df) return;
    const value = gridCell.cell.value;
    g.clearRect(x, y, w, h);
    if (!value) return;

    let JSONData: {[_: string]: number};
    try {
      JSONData = JSON.parse(value);
    } catch (e) {
      return;
    }

    const totalCount = Object.values(JSONData).reduce((a, b) => a + b, 0);

    let angleAccum = 0;

    const alphas = Object.fromEntries(Object.keys(JSONData).map((key) => [key, 255]));

    const hoverTemp = gridCell.cell.column.temp[this.HoverTempKey] as string;
    if (hoverTemp && hoverTemp.split(this.hoverSeparator).length === 2) {
      const [rowIdx, category] = hoverTemp.split(this.hoverSeparator);
      if (rowIdx === gridCell.cell.rowIndex.toString()) {
        for (const [key, _] of Object.entries(JSONData))
          alphas[key] = 100;
        alphas[category] = 255;
      }
    }

    const radius = Math.min(w, h) / 2.2;

    for (const [key, val] of Object.entries(JSONData)) {
      const angle = 2 * Math.PI * val / totalCount;
      g.beginPath();
      g.moveTo(box.midX, box.midY);
      g.arc(box.midX, box.midY, radius, angleAccum, angleAccum + angle);
      angleAccum += angle;
      const colorCache = this.categoryNumberCache(gridCell.cell.column);
      if (!colorCache[key]) {
        colorCache[key] = Object.keys(colorCache).length; // cache category number keys, so that colors are consistent
        gridCell.cell.column.temp[this.colorCacheKey] = colorCache;
      }
      g.fillStyle = DG.Color.toHtml(
        DG.Color.setAlpha(DG.Color.getCategoricalColor(colorCache[key]), alphas[key]),
      );
      g.fill();
      g.strokeStyle = DG.Color.toRgb(DG.Color.lightGray);
      g.stroke();


      // text rendering
      const text = key;
      // g.font = '10px Arial'; // Adjust font size and family as needed
      g.fillStyle = DG.Color.toRgb(DG.Color.white);
      g.font = '9px Arial';
      const textWidth = g.measureText(text).width;

      const middleAngle = angleAccum - (angle / 2);

      // get the best position for the text
      for (let textRadiusMult = 0.8; textRadiusMult >= 0.4; textRadiusMult -= 0.05) {
        const textRadius = radius * textRadiusMult;
        const textX = box.midX + Math.cos(middleAngle) * textRadius;
        const textY = box.midY + Math.sin(middleAngle) * textRadius;

        // perform pseudo hit test to check if text fits in the pie slice
        const leftPart = textX - textWidth / 2 - 2;
        const rightPart = textX + textWidth / 2 + 2;

        const isTextInside = [[leftPart, textY], [rightPart, textY]]
          .every((point) => {
            const d = Math.sqrt((point[0] - box.midX) ** 2 + (point[1] - box.midY) ** 2);
            const at = Math.atan2(point[1] - box.midY, point[0] - box.midX);
            const a = at < 0 ? at + 2 * Math.PI : at;
            return d < radius - 2 && a > angleAccum - angle && a < angleAccum;
          });

        if (isTextInside) {
          g.fillText(text, textX, textY);
          break;
        }
      }
    }
  }
}
