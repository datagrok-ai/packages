import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {
  createBaseInputs, getRenderColor,
  getSettingsBase,
  isSummarySettingsBase,
  SparklineType,
  SummaryColumnColoringType,
  SummarySettingsBase
} from '../sparklines/shared';
import {GridCellElement, LabelElement, Scene} from './scene';

type ColumnNamesVisibility = 'Auto' | 'Always' | 'Never';

const markers: string[] = [
  DG.MARKER_TYPE.CIRCLE,
  DG.MARKER_TYPE.SQUARE,
  DG.MARKER_TYPE.ASTERISK,
  DG.MARKER_TYPE.DIAMOND,
  DG.MARKER_TYPE.TRIANGLE_LEFT,
  DG.MARKER_TYPE.TRIANGLE_RIGHT,
  DG.MARKER_TYPE.TRIANGLE_TOP,
  DG.MARKER_TYPE.TRIANGLE_BOTTOM,
  DG.MARKER_TYPE.CIRCLE_BORDER,
  DG.MARKER_TYPE.SQUARE_BORDER,
];

interface FormSettings extends SummarySettingsBase {
  showColumnNames: ColumnNamesVisibility;
}

function getSettings(gc: DG.GridColumn): FormSettings {
  gc.settings ??= {};
  const settings: FormSettings = isSummarySettingsBase(gc.settings) ? gc.settings :
    gc.settings[SparklineType.Form] ??= getSettingsBase(gc, SparklineType.Form);
  settings.colorCode ??= SummaryColumnColoringType.Off;
  return settings;
}

let scene: Scene;

/** Returns approximate length in characters of the longest value in the column. */
function getMaxValueWidth(column: DG.Column): number {
  if (column.type == DG.TYPE.INT)
    return column.max.toString().length;
  else if (column.type == DG.TYPE.FLOAT || column.type == DG.TYPE.QNUM)
    return 50;
  else if (column.type == DG.TYPE.STRING) {
    const values = column.categories;
    if (values.length < 50)
      return Math.min(...values.map((v) => v.length));
    return 100;
  }
  return 100;
}


export class FormCellRenderer extends DG.GridCellRenderer {
  get name() { return SparklineType.Form; }

  get cellType() { return SparklineType.Form; }

  getDefaultSize(gridColumn: DG.GridColumn): { width?: number | null; height?: number | null; } {
    return {
      width: 200,
      height: getSettings(gridColumn).columnNames.length * 20
    };
  }

  static makeScene(gridCell: DG.GridCell, b?: DG.Rect): Scene {
    const g = gridCell.grid.canvas.getContext('2d')!;
    const df = gridCell.grid.dataFrame;
    const settings: FormSettings = getSettings(gridCell.gridColumn);
    const row = gridCell.cell.row.idx;
    let cols = df.columns.byNames(settings.columnNames).filter((c) => c != null);
    b ??= gridCell.bounds.inflate(-2, -2);
    const scene = new Scene(b);

    // molecules first
    const molCols = cols.filter((c) => c.semType == DG.SEMTYPE.MOLECULE);
    for (let i = 0; i < molCols.length; i++) {
      if (molCols[i] != null && b.width > 30 && b.height > 20) {
        const r = b.width / b.height > 1.5 ? b.getLeftScaled(0.5) : b.getTopScaled(0.5);
        b = b.width / b.height > 1.5 ? b.getRightScaled(0.5) : b.getBottomScaled(0.5);
        const cell = gridCell.grid.cell(molCols[i].name, gridCell.gridRow);
        scene.elements.push(new GridCellElement(r, cell));
      }
    }
    cols = cols.filter((c) => c.semType !== DG.SEMTYPE.MOLECULE);

    const maxNameWidth = Math.min(200, Math.max(...cols.map((c) => g.measureText(c.name).width)));
    const maxValueWidth = Math.min(100, Math.max(...cols.map((c) => getMaxValueWidth(c) * 8)));
    const showColumnNames = settings.showColumnNames == 'Always' ||
      (settings.showColumnNames ?? 'Auto') == 'Auto' && maxNameWidth + maxValueWidth + 10 < b.width;
    const columnNamesWidth = showColumnNames ? maxNameWidth + 10 : 0;
    const colHeight = Math.min(20, b.height / cols.length);

    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const cell = gridCell.grid.cell(col.name, gridCell.gridRow);
      cell.style.backColor = gridCell.grid.props.backColor;
      cell.style.textColor = getRenderColor(settings, gridCell.grid.props.cellTextColor, {column: col, colIdx: i, rowIdx: row});
      const minColHeight = 8;
      const fontSize = colHeight < 20 * 0.7 ? 10 + 3 * ((colHeight - 8) / 6) : 13;
      const font = `${fontSize.toFixed(1)}px Roboto, Roboto Local`;

      if (b.height < cols.length * 20 * 0.4) {
        // render in one row
        const r = b.getLeftPart(cols.length, i);
        const e = new GridCellElement(r, cell);
        scene.elements.push(e);
      }
      else {
        // render in a column
        const r = new DG.Rect(b.x, b.y + i * colHeight, b.width, colHeight);
        if (showColumnNames) {
          scene.elements.push(new LabelElement(r.getLeft(columnNamesWidth), col.name, {
            horzAlign: 'right',
            color: 'lightgrey',
            font: font
          }));
        }

        const leftMargin = r.width >= 20 ? 5 : 0;
        cell.style.marker = markers[i % markers.length];
        cell.style.horzAlign = 'left';
        cell.style.marginLeft = 0;
        cell.style.font = font;

        scene.elements.push(new GridCellElement(r.cutLeft(columnNamesWidth + leftMargin), cell));
      }
    }

    return scene;
  }

  render(g: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle) {
    const scene = FormCellRenderer.makeScene(gridCell);
    scene.render(g);
  }

  makeBestScene(gridCell: DG.GridCell): Scene {
    const height = getSettings(gridCell.gridColumn).columnNames
      .map((name) => gridCell.tableColumn?.semType === DG.SEMTYPE.MOLECULE ? 150 : 20)
      //.map(name => gridCell.grid.cell(name, gridCell.gridRow).renderer.getDefaultSize(gridCell.gridColumn).height)
      .reduce((sum, height) => sum! + height!, 0)!;
    return FormCellRenderer
      .makeScene(gridCell, new DG.Rect(0, 0, 200, height));
  }

  onMouseEnter(gridCell: DG.GridCell, e: MouseEvent): void {
    scene = FormCellRenderer.makeScene(gridCell);
    if (scene.elements.every((e) => e.bounds.width < 25 && e.bounds.height < 25)) {
      setTimeout(() => ui.tooltip.show(this.makeBestScene(gridCell).toCanvas(),
        gridCell.documentBounds.right, gridCell.documentBounds.top), 200);
    }
  }

  onMouseMove(gridCell: DG.GridCell, e: MouseEvent) {
    const el = scene.hitTest(e.x, e.y);
    if (el?.style?.tooltip)
      setTimeout(() => ui.tooltip.show(el.style!.tooltip!, el.bounds.right + 10, el.bounds.top));

    //super.onMouseMove(gridCell, e);
  }

  onMouseDown(gridCell: DG.GridCell, e: MouseEvent): void {
    grok.shell.o = this.makeBestScene(gridCell).toCanvas();
  }

  renderSettings(gc: DG.GridColumn): Element {
    const settings: FormSettings = isSummarySettingsBase(gc.settings) ? gc.settings :
      gc.settings[SparklineType.Form] ??= getSettings(gc);

    return ui.inputs([
      ...createBaseInputs(gc, settings, true),
      ui.input.choice('Show column names', {value: settings.showColumnNames ?? 'Auto', items: ['Auto', 'Always', 'Never'],
        onValueChanged: (value) => {
          settings.showColumnNames = value as ColumnNamesVisibility;
          gc.grid.invalidate();
        }})
    ]);
  }
}

