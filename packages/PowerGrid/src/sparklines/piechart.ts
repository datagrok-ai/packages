import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {GridCell, GridColumn, Rect} from 'datagrok-api/src/grid';
import {getSettingsBase, names, SummarySettingsBase} from './shared';


interface PieChartSettings extends SummarySettingsBase {
  radius: number;
}

function getSettings(gc: DG.GridColumn): PieChartSettings {
  return gc.settings ??= {
    ...getSettingsBase(gc),
    ...{radius: 40},
  };
}

export class PieChartCellRenderer extends DG.GridCellRenderer {
  get name() { return 'pie ts'; }

  get cellType() { return 'piechart_ts'; }

  // getPreferredCellSize(col: DG.GridColumn) {
  //   return new Size(80,80);
  // }

  get defaultWidth(): number | null { return 80; }

  get defaultHeight(): number | null { return 80; }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: GridCell, cellStyle: DG.GridCellStyle
  ) {
    const df = gridCell.grid.dataFrame;

    if (w < 5 || h < 5 || df === void 0) return;

    const settings = getSettings(gridCell.gridColumn);
    const row: number = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames);
    const box = new Rect(x, y, w, h).fitSquare().inflate(-2, -2);

    for (let i = 0; i < cols.length; i++) {
      if (cols[i].isNone(row))
        continue;

      const r = cols[i].scale(row) * box.width / 2;
      g.beginPath();
      g.moveTo(box.midX, box.midY);
      g.arc(box.midX, box.midY, r,
        2 * Math.PI * i / cols.length, 2 * Math.PI * (i + 1) / cols.length);
      g.closePath();

      g.fillStyle = DG.Color.toRgb(DG.Color.getCategoricalColor(i));
      g.fill();
    }
  }

  renderSettings(gc: GridColumn): Element {
    gc.settings ??= getSettings(gc);
    const settings = gc.settings;

    return ui.inputs([
      ui.columnsInput('Radar columns', gc.grid.dataFrame, (columns) => {
        settings.columnNames = names(columns);
        gc.grid.invalidate();
      }, {
        available: names(gc.grid.dataFrame.columns.numerical),
        checked: settings?.columnNames ?? names(gc.grid.dataFrame.columns.numerical),
      }),
    ]);
  }
}
