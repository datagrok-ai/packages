import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {getSettingsBase, names, SummarySettingsBase, createTooltip, distance, Hit} from './shared';


class it {
  static range = (n: number) => [...Array(n).keys()];
}

function getAxesPointCalculator(cols: DG.Column[], box: DG.Rect) {
  return (col: number, ratio: number) => new DG.Point(
    box.midX + ratio * box.width * Math.cos(2 * Math.PI * col / (cols.length)) / 2,
    box.midY + ratio * box.width * Math.sin(2 * Math.PI * col / (cols.length)) / 2);
}

interface RadarChartSettings extends SummarySettingsBase {
  // radius: number;
}

function getSettings(gc: DG.GridColumn): RadarChartSettings {
  return gc.settings ??= {
    ...getSettingsBase(gc),
    // ...{radius: 10,},
  };
}


function onHit(gridCell: DG.GridCell, e: MouseEvent): Hit {
  const df = gridCell.grid.dataFrame;
  const maxAngleDistance = 0.1;
  const settings = getSettings(gridCell.gridColumn);
  const box = new DG.Rect(gridCell.bounds.x, gridCell.bounds.y, gridCell.bounds.width, gridCell.bounds.height).fitSquare().inflate(-2, -2);
  const cols = df.columns.byNames(settings.columnNames);
  const vectorX = e.offsetX - gridCell.bounds.midX;
  const vectorY = e.offsetY - gridCell.bounds.midY;
  const atan2 = Math.atan2(vectorY, vectorX);
  const angle = atan2 < 0 ? atan2 + 2 * Math.PI : atan2;
  const p = getAxesPointCalculator(cols, box);
  let valueForColumn = (angle) / (2 * Math.PI) * cols.length;
  let activeColumn = Math.floor(valueForColumn + maxAngleDistance);
  // needed to handle the exception when the angle is near 2 * Math.PI
  activeColumn = activeColumn > cols.length - 1 ? 0 : activeColumn;
  valueForColumn = Math.floor(valueForColumn + maxAngleDistance) > cols.length - 1 ? cols.length - valueForColumn : valueForColumn;
  const point = p(activeColumn, 1);
  const mousePoint = new DG.Point(e.offsetX, e.offsetY);
  const center = new DG.Point(gridCell.bounds.midX, gridCell.bounds.midY);
  return {
    activeColumn: activeColumn,
    cols: cols,
    row: gridCell.cell.row.idx,
    isHit: ((distance(center, mousePoint) < distance(center, point)) && (Math.abs(valueForColumn - activeColumn) <= maxAngleDistance)),
  };

}

export class RadarChartCellRender extends DG.GridCellRenderer {
  get name() { return 'radar ts'; }

  get cellType() { return 'radar'; }

  // getPreferredCellSize(col: DG.GridColumn) {
  //   return new Size(80,80);
  // }

  get defaultWidth(): number | null { return 80; }

  get defaultHeight(): number | null { return 80; }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent): void {
    const hitData: Hit = onHit(gridCell, e);
    if (hitData.isHit)
      ui.tooltip.show(ui.divV(createTooltip(hitData.cols, hitData.activeColumn, hitData.row)), e.x + 16, e.y + 16);
    else
      ui.tooltip.hide();
  }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle
  ) {
    const df = gridCell.grid.dataFrame;

    if (w < 20 || h < 10) return;

    const settings = getSettings(gridCell.gridColumn);
    const box = new DG.Rect(x, y, w, h).fitSquare().inflate(-2, -2);
    const row = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames);

    g.strokeStyle = 'lightgray';

    // axes' point calculator
    const p = getAxesPointCalculator(cols, box);

    // points of axes' labels
    for (let i = 0; i < cols.length; i++) {
      if (!cols[i].isNone(row)) {
        const point = p(i, 1);
        DG.Paint.marker(g, DG.MARKER_TYPE.CIRCLE, point.x, point.y, DG.Color.gray, 1);
      }
    }


    const path = it.range(cols.length)
      .map((i) => p(i, !cols[i].isNone(row) ? cols[i].scale(row) : 0));
    g.setFillStyle('#00cdff')
      .polygon(path)
      .fill();

    // axes
    for (let i = 0; i < cols.length; i++)
      g.line(box.midX, box.midY, p(i, 1).x, p(i, 1).y, DG.Color.fromHtml('#b9b9b9'));

    // Grid
    for (let i = 1; i <= 4; i++) {
      g.setStrokeStyle('#dcdcdc')
        .polygon(it.range(cols.length).map((col) => p(col, i / 4)))
        .stroke();
    }
    it.range(cols.length).map(function(i) {
      if (!cols[i].isNone(row)) {
        DG.Paint.marker(g, DG.MARKER_TYPE.CIRCLE, p(i, cols[i].scale(row)).x, p(i, cols[i].scale(row)).y, DG.Color.fromHtml('#1E90FF'), 3);
      }
    });
  }

  renderSettings(gc: DG.GridColumn): Element {
    gc.settings ??= getSettings(gc);
    const settings = gc.settings;

    return ui.inputs([
      ui.columnsInput('Сolumns', gc.grid.dataFrame, (columns) => {
        settings.columnNames = names(columns);
        gc.grid.invalidate();
      }, {
        available: names(gc.grid.dataFrame.columns.numerical),
        checked: settings?.columnNames ?? names(gc.grid.dataFrame.columns.numerical),
      }),
    ]);
  }
}
