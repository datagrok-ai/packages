import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {
  getSettingsBase,
  SparklineType,
  SummarySettingsBase,
  Hit,
  distance,
  createTooltip,
  isSummarySettingsBase,
  SummaryColumnColoringType,
  createBaseInputs,
  getRenderColor,
  NormalizationType,
  getScaledNumber,
  getSparklinesContextPanel,
} from './shared';

const minDistance = 5;

// interface for getPos function data
interface getPosConstants {
  b: DG.Rect;
  settings: SparklineSettings;
  cols: DG.Column[];
}

function getPos(col: number, row: number, constants: getPosConstants): DG.Point {
  const b = constants.b;
  const settings = constants.settings;
  const cols = constants.cols;
  const r: number = getScaledNumber(cols, row, cols[col], {normalization: settings.normalization, zeroScale: settings.zeroScale});

  return new DG.Point(
    b.left + b.width * (cols.length == 1 ? 0 : col / (cols.length - 1)),
    (b.top + b.height) - b.height * r);
}

interface SparklineSettings extends SummarySettingsBase {
  zeroScale?: boolean;
}

function getSettings(gc: DG.GridColumn): SparklineSettings {
  const settings: SparklineSettings = isSummarySettingsBase(gc.settings) ? gc.settings :
    gc.settings[SparklineType.Sparkline] ??= getSettingsBase(gc, SparklineType.Sparkline);

  //@ts-ignore: convert old format to new - backwards compatibility
  if (settings.globalScale !== undefined && settings.globalScale !== null)
    //@ts-ignore
    settings.normalization = settings.globalScale ? NormalizationType.Global : NormalizationType.Column;

  settings.normalization ??= NormalizationType.Column;
  settings.colorCode ??= SummaryColumnColoringType.Bins;
  settings.zeroScale ??= false;
  return settings;
}

function onHit(gridCell: DG.GridCell, e: MouseEvent): Hit {
  const df = gridCell.grid.dataFrame;

  if (gridCell.bounds.width < 20 || gridCell.bounds.height < 10 || df === void 0) {
    return {
      isHit: false,
      row: -1,
      cols: [],
      activeColumn: -1
    };
  }

  const row = gridCell.cell.row.idx;
  const settings = getSettings(gridCell.gridColumn);
  const b = new DG.Rect(gridCell.bounds.x, gridCell.bounds.y, gridCell.bounds.width,
    gridCell.bounds.height).inflate(-3, -2);

  const cols = df.columns.byNames(settings.columnNames);
  const getPosConstants: getPosConstants = {
    b: b,
    settings: settings,
    cols: cols
  };

  const mousePoint = new DG.Point(e.offsetX, e.offsetY);
  const activeColumn = Math.floor((mousePoint.x - b.left + Math.sqrt(minDistance)) /
    b.width * (cols.length - 1 > 0 ? cols.length - 1 : 1));
  if (activeColumn >= cols.length || activeColumn === -1) {
    return {
      isHit: false,
      row: -1,
      cols: [],
      activeColumn: -1
    };
  }

  const activePoint = getPos(activeColumn, row, getPosConstants);
  return {
    isHit: distance(activePoint, mousePoint) < minDistance,
    activeColumn: activeColumn,
    row: row,
    cols: cols,
  };
}

export class SparklineCellRenderer extends DG.GridCellRenderer {
  get name() { return SparklineType.Sparkline; }

  get cellType() { return SparklineType.Sparkline; }

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

    const settings = getSettings(gridCell.gridColumn);
    const b = new DG.Rect(x, y, w, h).inflate(-4, -4);
    g.strokeStyle = 'lightgrey';
    g.lineWidth = 1;

    const row = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames).filter((c) => c != null);

    const getPosConstants: getPosConstants = {
      b: b,
      settings: settings,
      cols: cols
    };

    g.beginPath();
    let started = false;
    for (let i = 0; i < cols.length; i++) {
      if (!cols[i].isNone(row)) {
        const p = getPos(i, row, getPosConstants);

        if (!started) {
          g.moveTo(p.x, p.y);
          started = true;
        } else {
          g.lineTo(p.x, p.y);
        }
      }
    }
    g.stroke();

    for (let i = 0; i < cols.length; i++) {
      if (!cols[i].isNone(row)) {
        const p = getPos(i, row, getPosConstants);
        DG.Paint.marker(g, DG.MARKER_TYPE.CIRCLE, p.x, p.y, getRenderColor(settings, DG.Color.blue,
          {column: cols[i], colIdx: i, rowIdx: row}), 3);
      }
    }
  }

  renderSettings(gridColumn: DG.GridColumn): HTMLElement {
    const settings: SparklineSettings = isSummarySettingsBase(gridColumn.settings) ? gridColumn.settings :
      gridColumn.settings[SparklineType.Sparkline] ??= getSettings(gridColumn);
    return ui.inputs([...createBaseInputs(gridColumn, settings), ui.input.bool('Zero Scale', {
      value: settings.zeroScale,
      onValueChanged: (value) => {
        settings.zeroScale = value;
        gridColumn.grid.invalidate();
      },
      tooltipText: 'Scale the sparkline to start at zero'
    })]);
  }

  hasContextValue(gridCell: DG.GridCell): boolean { return true; }
  async getContextValue (gridCell: DG.GridCell): Promise<any> {
    return getSparklinesContextPanel(gridCell, getSettings(gridCell.gridColumn).columnNames);
  }
}
