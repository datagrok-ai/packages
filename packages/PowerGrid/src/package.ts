import {_TagsCellRenderer} from './package.g';
import {_MultiChoiceCellRenderer} from './package.g';
import {_ScatterPlotCellRenderer} from './package.g';
import {_HtmlTestCellRenderer} from './package.g';
import {_HyperlinkCellRenderer} from './package.g';
import {_BinaryImageCellRenderer} from './package.g';
import {_ImageCellRenderer} from './package.g';
/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {HtmlTestCellRenderer, TestCellRenderer} from './cell-types/test-cell-renderer';
import {BarCellRenderer} from './cell-types/bar-cell-renderer';

import {SparklineCellRenderer} from './sparklines/sparklines-lines';
import {BarChartCellRenderer} from './sparklines/bar-chart';
import {PieChartCellRenderer} from './sparklines/piechart';
import {RadarChartCellRender} from './sparklines/radar-chart';
import {ScatterPlotCellRenderer} from './sparklines/scatter-plot';
import {names, SparklineType, sparklineTypes} from './sparklines/shared';
import * as PinnedUtils from '@datagrok-libraries/gridext/src/pinned/PinnedUtils';
import {PinnedColumn} from '@datagrok-libraries/gridext/src/pinned/PinnedColumn';
import {FormsViewer} from '@datagrok-libraries/utils/src/viewers/forms-viewer';
import {FormCellRenderer} from './forms/forms';
import { scWebGPUPointHitTest, scWebGPURender } from './webgpu/scatterplot';
import { getGPUDevice } from '@datagrok-libraries/math/src/webGPU/getGPUDevice';

export const _package = new DG.Package();

let gpuDevice: GPUDevice | null = null;
let gpuErrorCounter = 0;

//name: barCellRenderer
//tags: cellRenderer
//meta.gridChart: true
//meta.cellType: bar
//output: grid_cell_renderer result
export function barCellRenderer() {
  return new BarCellRenderer();
}

//name: Sparklines
//tags: cellRenderer
//meta.cellType: sparkline
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function sparklineCellRenderer() {
  return new SparklineCellRenderer();
}

//name: Bar Chart
//tags: cellRenderer
//meta.cellType: barchart
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function barchartCellRenderer() {
  return new BarChartCellRenderer();
}

//name: Pie Chart
//tags: cellRenderer
//meta.cellType: piechart
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function piechartCellRenderer() {
  return new PieChartCellRenderer();
}

//name: Radar
//tags: cellRenderer
//meta.cellType: radar
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function radarCellRenderer() {
  return new RadarChartCellRender();
}

//name: Smart Form
//tags: cellRenderer
//meta.cellType: smartform
//meta.gridChart: true
//meta.virtual: true
//output: grid_cell_renderer result
export function smartFormCellRenderer() {
  return new FormCellRenderer();
}

//description: Adds a sparkline column for the selected columns
//input: list columns { type: numerical }
//meta.action: Sparklines...
export function summarizeColumns(columns: DG.Column[]) {
  const table = columns[0].dataFrame;
  const name = ui.input.string('Name', {value: table.columns.getUnusedName('Summary')});
  const sparklineType = ui.input.choice('Type', {value: SparklineType.Sparkline, items: sparklineTypes});
  const columnsSelector = ui.input.columns('Columns', {value: columns, table: table,
    available: names(table.columns.numerical)});
  const hide = ui.input.bool('Hide', {value: false});
  hide.setTooltip('Hide source columns in the grid');

  function addSummaryColumn() {
    const grid = grok.shell.tv.grid;
    const left = grid.horzScroll.min;
    const columnNames = names(columnsSelector.value);
    const options = {gridColumnName: name.value, cellType: sparklineType.value!};
    const gridCol = grid.columns.add(options);
    gridCol.move(grid.columns.byName(columnNames[0])!.idx);
    gridCol.settings ??= {};
    gridCol.settings[sparklineType.value! as SparklineType] = {columnNames: columnNames};
    if (hide.value) {
      for (const name of columnNames)
        grid.columns.byName(name)!.visible = false;
    }
    grid.horzScroll.scrollTo(left);
    gridCol.scrollIntoView();
    grok.shell.o = gridCol;
  }

  DG.Dialog
    .create({title: 'Add Summary Column'})
    .add(name)
    .add(sparklineType)
    .add(columnsSelector)
    .add(hide)
    .onOK(addSummaryColumn)
    .show();
}


//description: Adds a 'form' column for the selected columns
//input: list columns
//meta.action: Smart form...
export function addFormColumn(columns: DG.Column[]) {
  const table = columns[0].dataFrame;
  const name = ui.input.string('Name', {value: table.columns.getUnusedName('Form')});
  const columnsSelector = ui.input.columns('Columns', {value: columns, table: table});
  const hide = ui.input.bool('Hide', {value: false});
  hide.setTooltip('Hide source columns in the grid');

  function addSummaryColumn() {
    const grid = grok.shell.tv.grid;
    const left = grid.horzScroll.min;
    const columnNames = names(columnsSelector.value);
    const options = {gridColumnName: name.value, cellType: SparklineType.Form};
    const gridCol = grid.columns.add(options);
    gridCol.move(grid.columns.byName(columnNames[0])!.idx);
    gridCol.settings ??= {};
    gridCol.settings[SparklineType.Form] = {columnNames: columnNames};
    if (hide.value) {
      for (const name of columnNames)
        grid.columns.byName(name)!.visible = false;
    }
    grid.horzScroll.scrollTo(left);
    gridCol.scrollIntoView();
    grok.shell.o = gridCol;
  }

  DG.Dialog
    .create({title: 'Add Form'})
    .add(name)
    .add(columnsSelector)
    .add(hide)
    .onOK(addSummaryColumn)
    .show();
}


//name: testUnitsKgCellRenderer
//tags: cellRenderer
//meta.cellType: testUnitsKg
//meta.columnTags: foo=bar,units=kg
//output: grid_cell_renderer result
export function testUnitsKgCellRenderer() {
  return new TestCellRenderer();
}

//name: testUnitsTonCellRenderer
//tags: cellRenderer
//meta.cellType: testUnitsTon
//meta.columnTags: foo=bar,units=ton
//output: grid_cell_renderer result
export function testUnitsTonCellRenderer() {
  return new HtmlTestCellRenderer();
}

//name: addPinnedColumn
//input: object gridCol
//output: object result
export function addPinnedColumn(gridCol: DG.GridColumn) : PinnedColumn {
  return PinnedUtils.addPinnedColumn(gridCol);
}

//name: demoTestUnitsCellRenderer
export function demoTestUnitsCellRenderer() {
  const col1 = DG.Column.fromStrings('kg', ['a', 'b']).setTag('foo', 'bar');
  col1.meta.units = 'kg';
  col1.semType = 'test';
  const col2 = DG.Column.fromStrings('ton', ['a', 'b']).setTag('foo', 'bar');
  col2.semType = 'test';
  col2.meta.units = 'ton';
  const t = DG.DataFrame.fromColumns([col1, col2]);

  grok.shell.addTableView(t);
  grok.shell.info('Different renderers even though semantic types are the same');
}

//tags: autostart
export async function _autoPowerGrid() {
  PinnedUtils.registerPinnedColumns();
  DG.GridCellRenderer.register(new ScatterPlotCellRenderer());
  gpuDevice = await getGPUDevice();
}

//name: Forms
//description: Forms viewer
//tags: viewer
//meta.icon: files/icons/formviewer.svg
//meta.viewerPosition: bottom
//output: viewer result
export function formsViewer() {
  return new FormsViewer();
}


//name: Content
//description: Image content
//tags: panel, powergrid, widgets
//input: string imageUrl { semType: ImageUrl }
//output: widget result
export function imgContent(imageUrl: string): DG.Widget {
  const image = new Image();
  image.src = imageUrl;
  return imageUrl !== null ? new DG.Widget(image) : new DG.Widget(ui.divText('No image available'));
}


//name: demoCellTypes
export function demoCellTypes() {
  const t = grok.data.demo.demog(100);
  const dis = t.col('disease')!;
  dis.set(0, 'Anxiety, Glaucoma');
  dis.set(1, 'Hepatitis A, Glaucoma');
  dis.meta.choices = ['Anxiety', 'Hepatitis A', 'Glaucoma'];
  dis.setTag(DG.TAGS.CELL_RENDERER, 'MultiChoice');

  const site = t.col('site')!;
  site.set(0, 'Buffalo, Orlando');
  site.set(1, 'Buffalo, Los Angeles');
  site.setTag(DG.TAGS.CELL_RENDERER, 'Tags');

  grok.shell.addTableView(t);
}

//tags: scWebGPURender
//input: dynamic sc
//input: bool show
export async function _scWebGPURender(sc: DG.ScatterPlotViewer, show: boolean) {
  try {
    await scWebGPURender(sc, show);
  } catch (error) {
    gpuErrorCounter++;
  }  
}

//tags: scWebGPUPointHitTest
//input: dynamic sc
//input: dynamic pt
//output: int result
export async function _scWebGPUPointHitTest(sc: DG.ScatterPlotViewer, pt: DG.Point) {
  let result = -1;
  try {
    result = await scWebGPUPointHitTest(sc, pt);  
  } catch (error) {
    gpuErrorCounter++;
    throw error;
  }
  
  return result;
}

//tags: isWebGPUAvailable
//output: bool result
export function isWebGPUAvailable(sc: DG.ScatterPlotViewer) {
  return gpuDevice != null && !gpuErrorCounter;
}

//tags: isWebGPURenderValid
//input: dynamic sc
//output: bool result
export function isWebGPURenderValid(sc: DG.ScatterPlotViewer) {
  return sc.props.zoomAndFilter != 'pack and zoom by filter' 
    && !sc.props.markersColumnName
    && !sc.props.xWhiskerMinColumnName && !sc.props.xWhiskerMaxColumnName && !sc.props.xWhiskerRangeColumnName
    && !sc.props.yWhiskerMinColumnName && !sc.props.yWhiskerMaxColumnName && !sc.props.yWhiskerRangeColumnName;
}

export {_ImageCellRenderer};
export {_BinaryImageCellRenderer};
export {_HyperlinkCellRenderer};
export {_HtmlTestCellRenderer};
export {_ScatterPlotCellRenderer};
export {_MultiChoiceCellRenderer};
export {_TagsCellRenderer};
