import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {TYPE} from "datagrok-api/dg";
import {div} from "datagrok-api/ui";
import {safeLog, tableFromRow } from './utils';

const colorScheme = [DG.Color.white, DG.Color.gray];
const dimensions = new Map([
  [96, {rows: 8, cols: 12}],
  [384, {rows: 16, cols: 24}],
  [1536, {rows: 32, cols: 48}],
]);

export class PlateWidget extends DG.Widget {

  _plateData: DG.DataFrame = DG.DataFrame.create();
  _colorColumn?: DG.Column<number>;
  grid: DG.Grid = DG.Viewer.heatMap(this._plateData);
  _posToRow: Map<String, number> = new Map();
  rows = 0;
  cols = 0;
  colorColumnName: string = '';

  constructor() {
    super(ui.div([], 'curves-plate-widget'));
    this.root.appendChild(this.grid.root);

    this.subs.push(this.grid.onAfterDrawContent.subscribe(() => {
      this.grid.root.querySelectorAll('.d4-range-selector').forEach((el) => (el as HTMLElement).style.display = 'none');
    }));

    this.grid.onCellRender.subscribe((args) => this.renderCell(args));
  }

  static detailedView(table: DG.DataFrame): PlateWidget {
    const pw = new PlateWidget();
    pw.grid.root.style.width = '100%';
    pw.plateData = table;
    const colorSelector = ui.input.column('Color by', {
      table: table,
      value: pw._colorColumn,
      onValueChanged: (v) => { pw._colorColumn = v; pw.grid.invalidate(); }
    });

    const detailsDiv = div();
    pw.grid.onCurrentCellChanged.subscribe((gc) => {
      ui.empty(detailsDiv);
      const row = pw.dataRow(gc);
      if (row)
        detailsDiv.appendChild(ui.tableFromMap(tableFromRow(pw.plateData.rows.get(row))));
    });

    pw.root.prepend(colorSelector.root);
    pw.root.append(detailsDiv);

    return pw;
  }

  get plateData() { return this._plateData; }
  set plateData(t: DG.DataFrame) {
    this._plateData = t;
    this._colorColumn = t.columns.firstWhere((col) => col.name == 'activity' && col.type == TYPE.FLOAT)
      ?? t.columns.firstWhere((col) => col.name == 'activity' && col.type == TYPE.FLOAT)
      ?? t.columns.firstWhere((col) => col.name != 'row' && col.name != 'col' && col.type == TYPE.FLOAT)
      ?? t.columns.firstWhere((col) => col.type == TYPE.FLOAT)
      ?? t.columns.byIndex(0);

    let rowCol: DG.Column<number> = this._plateData.col('row')!;
    let colCol: DG.Column<number> = this._plateData.col('col')!;
    this.rows = rowCol?.stats?.max ?? dimensions.get(t.rowCount)?.rows;
    this.cols = colCol?.stats?.max ?? dimensions.get(t.rowCount)?.cols;

    if (this.rows == null || this.cols == null)
      throw 'Row/col columns not found, and dataframe length is not of the recognized sizes (92, 384, 1526)';

    for (let i = 0; i < this._plateData.rowCount; i++)
      if (rowCol && colCol)
        this._posToRow.set(`${rowCol.get(i)}:${colCol.get(i)}`, i);
      else
        this._posToRow.set(`${Math.floor(i / this.cols)}:${i % this.cols + 1}`, i);

    // row header + all columns
    this.grid.dataFrame = DG.DataFrame.create(this.rows);
    this.grid.columns.clear();
    for (let i = 0; i <= this.cols; i++)
      this.grid.columns.add({gridColumnName: i.toString(), cellType: 'string'});

    this.grid.invalidate();
  }

  dataRow(gc: DG.GridCell): number | undefined {
    // we do not increment gridColumn index by 1 because there is a row number column with index 0 which we do not count
    // so data columns start with 1 anyway
    return this._posToRow.get(`${gc.gridRow}:${gc.gridColumn.idx}`);
  }

  renderCell(args:DG.GridCellRenderArgs) {
    const gc = args.cell;
    args.g.fillStyle = 'grey'; //(args.cell.isColHeader ? 'red' : (args.cell.isRowHeader ? 'green' : 'blue'));
    args.g.strokeStyle = 'grey';
    let g = args.g;
    let x = args.bounds.x, y = args.bounds.y, w = args.bounds.width, h = args.bounds.height;
    const dataRow  = this.dataRow(gc);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${Math.ceil(Math.min(...[16, w - 1, h - 1]))}px  Roboto, Roboto Local`;
    const isColoredByConc = this._colorColumn?.name?.toLowerCase()?.includes('conc');
    // column header
    if (gc.isColHeader && gc.gridColumn.idx > 0)
      g.fillText('' + gc.gridColumn.idx, x + w / 2, y + h / 2);
    // row header
    else if (gc.gridColumn.idx == 0 && gc.gridRow >= 0)
      g.fillText(String.fromCharCode(65 + gc.gridRow), x + w / 2, y + h / 2);
    else if (h > 0 && dataRow != null) {
      g.beginPath();
      const r = Math.min(h / 2, w / 2) * 0.8;
      g.ellipse(x + w / 2, y + h / 2, r, r, 0, 0, 2 * Math.PI);
      if (this._colorColumn) {
        if (this._colorColumn.isCategorical && this._colorColumn.meta.colors.getType() !== DG.COLOR_CODING_TYPE.CATEGORICAL)
          this._colorColumn.meta.colors.setCategorical();
        const color = this._colorColumn.isNone(dataRow) ? DG.Color.white : this._colorColumn.isNumerical
          ? this.getColor(dataRow, isColoredByConc)
          : this._colorColumn.meta.colors.getColor(dataRow);
        g.fillStyle = DG.Color.toHtml(color);
        g.fill();
      }

      g.stroke();
    }
    args.preventDefault();
  }

  getColor(dataRow: number, isLog?: boolean) {
    const val = this._colorColumn!.get(dataRow)!;
    const reducedVal = isLog ? safeLog((val - this._colorColumn!.min) * 1e9) : val;
    const min = (isLog ? safeLog(Math.max(this._colorColumn!.min, 1)) : this._colorColumn!.min);
    const max = isLog ? safeLog((this._colorColumn!.max - this._colorColumn!.min) * 1e9) : this._colorColumn!.max;
    return DG.Color.scaleColor(reducedVal, min, max, undefined, colorScheme);
  }
}