import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {
  getSettingsBase,
  SparklineType,
  SummarySettingsBase,
  createTooltip,
  Hit,
  isSummarySettingsBase,
  SummaryColumnColoringType,
  createBaseInputs,
  getRenderColor,
  NormalizationType,
  getScaledNumber,
  getSparklinesContextPanel,
} from './shared';

const minH = 0.05;

interface BarChartSettings extends SummarySettingsBase { }

function getSettings(gc: DG.GridColumn): BarChartSettings {
  const settings: BarChartSettings = isSummarySettingsBase(gc.settings) ? gc.settings :
    gc.settings[SparklineType.BarChart] ??= getSettingsBase(gc, SparklineType.BarChart);
  //@ts-ignore: convert old format to new - backwards compatibility
  if (settings.globalScale !== undefined && settings.globalScale !== null)
    //@ts-ignore
    settings.normalization = settings.globalScale ? NormalizationType.Global : NormalizationType.Column;
  settings.normalization ??= NormalizationType.Column;
  settings.colorCode ??= SummaryColumnColoringType.Bins;
  return settings;
}

function onHit(gridCell: DG.GridCell, e: MouseEvent): Hit {
  const settings = getSettings(gridCell.gridColumn);
  const df = gridCell.grid.dataFrame;
  const cols = df.columns.byNames(settings.columnNames);
  const row = gridCell.cell.row.idx;
  const b = new DG.Rect(gridCell.bounds.x, gridCell.bounds.y, gridCell.bounds.width, gridCell.bounds.height)
    .inflate(-2, -2);
  const width = b.width / cols.length;
  const activeColumn = Math.floor((e.offsetX - b.left) / width);
  const answer: Hit = {
    isHit: false,
    activeColumn: activeColumn,
    row: row,
    cols: cols,
  };
  if ((activeColumn >= cols.length) || (activeColumn < 0))
    return answer;
  const scaled = getScaledNumber(cols, row, cols[activeColumn], {normalization: settings.normalization});
  const bb = b
    .getLeftPart(cols.length, activeColumn)
    .getBottomScaled(scaled > minH ? scaled : minH)
    .inflateRel(0.9, 1);
  answer.isHit = (e.offsetY >= bb.top);
  return answer;
}


export class BarChartCellRenderer extends DG.GridCellRenderer {
  get name() { return 'bar ts'; }

  get cellType() { return SparklineType.BarChart; }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    const hitData = onHit(gridCell, e);
    if (hitData.isHit)
      ui.tooltip.show(createTooltip(hitData.cols, hitData.activeColumn, hitData.row), e.x + 16, e.y + 16);
    else
      ui.tooltip.hide();
  }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ) {
    const df = gridCell.grid.dataFrame;

    if (w < 20 || h < 10 || df === void 0) return;

    const settings: BarChartSettings = getSettings(gridCell.gridColumn);
    const b = new DG.Rect(x, y, w, h).inflate(-2, -2);
    const row = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames);
    g.strokeStyle = DG.Color.toRgb(DG.Color.lightGray);

    for (let i = 0; i < cols.length; i++) {
      const currentCol = cols[i];
      if (!currentCol.isNone(row)) {
        g.setFillStyle(DG.Color.toRgb(getRenderColor(settings, DG.Color.fromHtml('#8080ff'),{column: currentCol, colIdx: i, rowIdx: row})));
        const scaled = getScaledNumber(cols, row, currentCol, {normalization: settings.normalization});
        const bb = b
          .getLeftPart(cols.length, i)
          .getBottomScaled(scaled > minH ? scaled : minH)
          .inflateRel(0.9, 1);
        g.fillRect(bb.left, bb.top, bb.width, bb.height);
        if (settings.colorCode === SummaryColumnColoringType.Values)
          g.strokeRect(bb.left, bb.top, bb.width, bb.height);
      }
    }
  }

  renderSettings(gc: DG.GridColumn): Element {
    const settings: BarChartSettings = isSummarySettingsBase(gc.settings) ? gc.settings :
      gc.settings[SparklineType.BarChart] ??= getSettings(gc);
    return ui.inputs(createBaseInputs(gc, settings));
  }

  hasContextValue(gridCell: DG.GridCell): boolean { return true; }
  async getContextValue (gridCell: DG.GridCell): Promise<any> {
    return getSparklinesContextPanel(gridCell, getSettings(gridCell.gridColumn).columnNames);
  }
}
