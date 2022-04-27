import * as DG from 'datagrok-api/dg';
import {InputBase, Property, TYPE} from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {GridCell, Point, Rect} from 'datagrok-api/src/grid';
import {Paint} from 'datagrok-api/src/utils';
import {Color} from 'datagrok-api/src/widgets';
import {MARKER_TYPE} from 'datagrok-api/src/const';
import {getSettingsBase, names, SummarySettingsBase} from './shared';


interface SparklineSettings extends SummarySettingsBase {
  normalize: boolean;
}


function getSettings(gc: DG.GridColumn): SparklineSettings {
  return gc.settings ??= {
    ...getSettingsBase(gc),
    ...{normalize: true},
  };
}


export class SparklineCellRenderer extends DG.GridCellRenderer {
  get name() { return 'sparkline'; }

  get cellType() { return 'sparkline_ts'; }

  render(
    g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: GridCell, cellStyle: DG.GridCellStyle
  ) {
    const df = gridCell.grid.dataFrame;

    if (w < 20 || h < 10 || df === void 0) return;

    const settings = getSettings(gridCell.gridColumn);
    const b = new Rect(x, y, w, h).inflate(-2, -2);
    g.strokeStyle = 'lightgrey';
    g.lineWidth = 1;

    const row = gridCell.cell.row.idx;
    const cols = df.columns.byNames(settings.columnNames);
    const gmin = settings.normalize ? 0 : Math.min(...cols.map((c: DG.Column) => c.min));
    const gmax = settings.normalize ? 0 : Math.max(...cols.map((c: DG.Column) => c.max));

    function getPos(col: number, row: number): Point {
      const r: number = settings.normalize ? cols[col].scale(row) : (cols[col].get(row) - gmin) / (gmax - gmin);
      return new Point(
        b.left + b.width * (cols.length == 1 ? 0 : col / (cols.length - 1)),
        (b.top + b.height) - b.height * r);
    }

    g.beginPath();
    let started = false;
    for (let i = 0; i < cols.length; i++) {
      if (!cols[i].isNone(row)) {
        const p = getPos(i, row);

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
        const p = getPos(i, row);
        Paint.marker(g, MARKER_TYPE.CIRCLE, p.x, p.y, Color.blue, 3);
      }
    }
  }

  renderSettings(gridColumn: DG.GridColumn): HTMLElement {
    gridColumn.settings ??= {normalize: true};
    const settings: SparklineSettings = gridColumn.settings;

    const normalizeInput = InputBase.forProperty(Property.js('normalize', TYPE.BOOL), settings);
    normalizeInput.onChanged(() => gridColumn.grid.invalidate());

    return ui.inputs([
      normalizeInput,
      ui.columnsInput('Sparkline columns', gridColumn.grid.dataFrame, (columns) => {
        settings.columnNames = names(columns);
        gridColumn.grid.invalidate();
      }, {
        available: names(gridColumn.grid.dataFrame.columns.numerical),
        checked: settings?.columnNames ?? names(gridColumn.grid.dataFrame.columns.numerical),
      }),
    ]);
  }
}
