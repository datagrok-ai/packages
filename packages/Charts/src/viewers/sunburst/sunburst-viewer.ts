import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import { EChartViewer } from '../echart/echart-viewer';
import { TreeUtils, TreeDataType } from '../../utils/tree-utils';
import * as echarts from 'echarts';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import _ from 'lodash';

/// https://echarts.apache.org/examples/en/editor.html?c=tree-basic

type onClickOptions = 'Select' | 'Filter';
const CATEGORIES_NUMBER = 500;
const ERROR_CLASS = 'd4-viewer-error';
const rowSourceMap: Record<onClickOptions, string> = {
  Select: 'Filtered',
  Filter: 'All'
};

/** Represents a sunburst viewer */
@grok.decorators.viewer({
  name: 'Sunburst',
  description: 'Creates a sunburst viewer',
  icon: 'icons/sunburst-viewer.svg',
})

export class SunburstViewer extends EChartViewer {
  private renderQueue: Promise<void> = Promise.resolve();
  savedOrder: number[] = [];
  columnIndexMap: { [key: string]: number } = {};
  hierarchyColumnNames: string[];
  eligibleHierarchyNames!: string[];
  hierarchyLevel: number;
  onClick: onClickOptions;
  selectedOptions: string[] = ['Selected', 'SelectedOrCurrent', 'FilteredSelected'];
  inheritFromGrid: boolean;
  title: string;

  constructor() {
    super();
    this.initCommonProperties();
    this.initEventListeners();

    this.title = this.string('title', 'Sunburst', {category: 'Description'});
    this.hierarchyColumnNames = this.addProperty('hierarchyColumnNames', DG.TYPE.COLUMN_LIST, null,
      {columnTypeFilter: DG.TYPE.CATEGORICAL});
    this.hierarchyLevel = 3;
    this.onClick = <onClickOptions> this.string('onClick', 'Select', { choices: ['Select', 'Filter']});
    this.inheritFromGrid = this.bool('inheritFromGrid', true, { category: 'Color' });

    this.option = {
      animation: false,
      silent: false,
      series: [
        {
          type: 'sunburst',
          radius: '98%',
          nodeClick: false,
          emphasis: {
            focus: 'series',
          },
          label: {
            rotate: 'radial',
            fontSize: 10,
          },
        },
      ],
    };

    this.onPropertyChanged(null);
  }

  isCanvasEmpty(ctx: any, x: any, y: any) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return pixel[3] === 0;
  }

  handleDataframeSelection(path: string[], event: any) {
    this.dataFrame.selection.handleClick((index: number) => {
      if (!this.filter.get(index) && this.rowSource !== 'Selected')
        return false;

      return path.every((segment, j) => {
        const columnValue = this.dataFrame.getCol(this.eligibleHierarchyNames[j]).get(index);
        return (columnValue && columnValue.toString() === segment) || (!columnValue && segment === '');
      });
    }, event);
  }

  handleDataframeFiltering(path: string[], dataFrame: DG.DataFrame) {
    const filterFunction = this.buildFilterFunction(path);
    dataFrame.rows.filter(filterFunction);
  }

  buildFilterFunction(path: string[]): (row: any) => boolean {
    return (row) => {
      return path.every((expectedValue, i) => {
        const column = this.dataFrame.getCol(this.eligibleHierarchyNames[i]);
        const columnValue = row.get(this.eligibleHierarchyNames[i]);
        const formattedValue = columnValue ?
          (column.type !== DG.TYPE.STRING ? columnValue.toString() : columnValue) : '';
        return formattedValue === expectedValue;
      });
    };
  }

  private isRowMatch(rowIndex: number, targetName: string): boolean {
    const { eligibleHierarchyNames, dataFrame } = this;
    return eligibleHierarchyNames.some((colName, index) => {
      const column = dataFrame.getCol(colName);
      const value = column.getString(rowIndex);
      return value === targetName;
    });
  }

  initEventListeners(): void {
    if (!this.chart) return;

    let selectedSectors: string[] = [];
    const handleChartClick = (params: any) => {
      const path = params.treePathInfo.slice(1).map((obj: any) => obj.name);
      const pathString = path.join('|');
      const isSectorSelected = selectedSectors.includes(pathString);
      if (this.onClick === 'Filter') {
        this.handleDataframeFiltering(path, this.dataFrame);
        return;
      }

      const event = params.event.event;
      const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
      const isMultiDeselect = (event.shiftKey && event.ctrlKey) || (event.shiftKey && event.metaKey);
      if (isMultiSelect && !isSectorSelected)
        selectedSectors.push(pathString);
      else if (isMultiDeselect && isSectorSelected)
        selectedSectors = selectedSectors.filter((sector) => sector !== pathString);
      this.handleDataframeSelection(path, event);
    };

    const handleChartMouseover = async (params: any) => {
      const path = params.treePathInfo.slice(1).map((obj: any) => obj.name);
      const bitset = this.filter;

      const matchDf = this.dataFrame.clone();
      matchDf.rows.removeWhere((row) => bitset && !bitset.get(row.idx));

      this.handleDataframeFiltering(path, matchDf);
      const matchCount = matchDf.filter.trueCount;

      const tooltipX = params.event.event.x + 10;
      const tooltipY = params.event.event.y;
      const tooltipText = `${matchCount}\n${params.name}`;

      ui.tooltip.showRowGroup(this.dataFrame, (i) => this.isRowMatch(i, params.name), tooltipX, tooltipY);
      if (params.data.semType === DG.SEMTYPE.MOLECULE) {
        const image = await TreeUtils.getMoleculeImage(params.name);
        const { width, height } = image;

        if (width && height) {
          const pixels = image!.getContext('2d')!.getImageData(0, 0, width, height).data;

          if (pixels.some((_, i) => i % 4 === 3 && pixels[i] !== 0)) {
            ui.tooltip.root.appendChild(image);
            return;
          }
        }
      }

      ui.tooltip.root.innerText = tooltipText;
    };

    const handleCanvasDblClick = (event: MouseEvent) => {
      const canvas = this.chart?.getDom().querySelector('canvas');
      if (!canvas) return;

      const { left, top, width, height } = canvas.getBoundingClientRect();
      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;
      const clickX = (event.clientX - left) * scaleX;
      const clickY = (event.clientY - top) * scaleY;

      if (this.isCanvasEmpty(canvas.getContext('2d'), clickX, clickY)) {
        this.render();
        this.dataFrame.filter.setAll(true);
      }
    };

    this.chart.on('click', handleChartClick);
    this.chart.on('mouseout', () => ui.tooltip.hide());
    this.chart.getDom().ondblclick = handleCanvasDblClick;

    this.subs.push(ui.onSizeChanged(this.root).subscribe((_) => {
      requestAnimationFrame(() => this.chart?.resize());
    }));

    fromEvent(this.chart, 'mouseover')
      .pipe(debounceTime(100))
      .subscribe((params: any) => handleChartMouseover(params));
  }

  onContextMenuHandler(menu: DG.Menu): void {
    menu.item('Reset View', () => {
      this.render();
      this.dataFrame.filter.setAll(true);
    });
  }

  onPropertyChanged(p: DG.Property | null, render: boolean = true): void {
    if (p?.name === 'hierarchyColumnNames' || p?.name === 'inheritFromGrid')
      this.render();
    if (p?.name === 'table') {
      this.updateTable();
      this.onTableAttached(true);
    }
    if (p?.name === 'onClick')
      this.rowSource = rowSourceMap[this.onClick as onClickOptions] || this.rowSource;
    else
      super.onPropertyChanged(p, render);
  }

  addSubs() {
    if (this.dataFrame === null)
      return;
    this.subs.push(this.dataFrame.onMetadataChanged.subscribe((_) => this.render()));
    this.subs.push(grok.events.onEvent('d4-grid-color-coding-changed').subscribe(() => this.render()));
    this.subs.push(grok.events.onEvent('d4-drag-drop').subscribe((args) => {
      const newOrder: number[] = Array.from(args.dart.dragObject.grid._order);
      if (this.savedOrder && _.isEqual(this.savedOrder, newOrder)) return;

      const {rowIndex, value} = args.args.dragObject.cell;

      if (this.hierarchyColumnNames.includes(value) && !this.columnIndexMap[value])
        this.columnIndexMap[value] = rowIndex;

      this.savedOrder = newOrder;
      const reordered = this.savedOrder.map(index => {
        for (const [column, colIndex] of Object.entries(this.columnIndexMap)) {
          if (colIndex === index)
            return column;
        }
        return null;
      }).filter((columnName): columnName is string => columnName !== null);
      this.render(reordered);      
    }));
    this.subs.push(this.onContextMenu.subscribe(this.onContextMenuHandler.bind(this)));
    this.subs.push(this.dataFrame.onColumnsRemoved.subscribe((data) => {
      const columnNamesToRemove = data.columns.map((column: DG.Column) => column.name);
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((columnName) =>
        !columnNamesToRemove.includes(columnName));
      this.render();
    }));
    this.addSelectionOrDataSubs();
  }

  onTableAttached(propertyChanged?: boolean): void {
    let categoricalColumns = [...this.dataFrame.columns.categorical].sort((col1, col2) =>
      col1.categories.length - col2.categories.length);
    categoricalColumns = categoricalColumns.filter((col: DG.Column) => col.stats.missingValueCount != col.length &&
      !col.name.startsWith('~'));

    if (categoricalColumns.length < 1)
      return;

    this.hierarchyColumnNames = categoricalColumns.slice(0, this.hierarchyLevel).map((col) => col.name);
    this.hierarchyColumnNames.forEach((column, index) => {
      this.columnIndexMap[column] = index;
    });

    this.addSubs();
    this.render();
  }

  _showMessage(msg: string, className: string) {
    const errorDiv = ui.divText(msg, className);
    errorDiv.style.textAlign = 'center';
    this.root.appendChild(errorDiv);
  }

  _removeMessage(className: string) {
    const divTextElement = this.root.getElementsByClassName(className)[0];
    if (divTextElement)
      this.root.removeChild(divTextElement);
  }

  async getSeriesData(): Promise<TreeDataType[] | undefined> {
    const rowSource = this.selectedOptions.includes(this.rowSource!);
    return await TreeUtils.toForest(this.dataFrame, this.eligibleHierarchyNames, this.filter,
      rowSource, this.inheritFromGrid);
  }

  formatLabel(params: any) {
    //@ts-ignore
    const ItemAreaInfoArray = this.chart.getModel().getSeriesByIndex(0).getData()._itemLayouts.slice(1);
    const getCurrentItemIndex = params.dataIndex - 1;
    const ItemLayoutInfo = ItemAreaInfoArray.find((item: any, index: number) => {
      if (getCurrentItemIndex === index)
        return item;
    });
    const r = ItemLayoutInfo.r;
    const r0 = ItemLayoutInfo.r0;
    const startAngle = ItemLayoutInfo.startAngle;
    const endAngle = ItemLayoutInfo.endAngle;
    const { width, height } = this.calculateRingDimensions(r0, r, startAngle, endAngle);

    const averageCharWidth = 5;
    const averageCharHeight = 10;
    const maxWidthCharacters = Math.floor(width / averageCharWidth);
    const maxHeightCharacters = Math.floor(height / averageCharHeight);
    const maxLength = maxWidthCharacters;

    const name = params.name;
    const lines = name.split(' ');
    let result = '';
    let remainingHeight = maxHeightCharacters;

    for (const line of lines) {
      if (line.length > maxLength || remainingHeight <= 0) {
        result = '';
        break;
      }
      if (result.length > 0) {
        result += '\n';
        remainingHeight--;
      }
      result += line;
      if (result.length >= maxLength || remainingHeight <= 0)
        break;
    }

    if (result.length < name.length)
      result += '...';

    const resultWidth = result.length * averageCharWidth;
    const resultHeight = result.split('\n').length * averageCharHeight;
    if (resultWidth > width || resultHeight > height)
      result = '...';

    return result;
  }

  calculateRingDimensions(innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
    const width = outerRadius - innerRadius;
    const height = Math.abs(endAngle - startAngle) * outerRadius;
    return { height, width };
  }

  render(orderedHierarchyNames?: string[]): void {
    if (this.dataFrame)
      this.renderQueue = this.renderQueue.then(() => this._render(orderedHierarchyNames));
  }

  async _render(orderedHierarchyNames?: string[]) {
    this.eligibleHierarchyNames = (orderedHierarchyNames ?? this.hierarchyColumnNames).filter(
      (name) => this.dataFrame.getCol(name).categories.length <= CATEGORIES_NUMBER,
    );

    if (!this.eligibleHierarchyNames.length) {
      this._showMessage('The Sunburst viewer requires at least one categorical column with fewer than 500 unique categories', ERROR_CLASS);
      return;
    }

    this._removeMessage(ERROR_CLASS);

    const data = await this.getSeriesData();

    // Reinitialize the chart (needed in order to prevent memory leak)
    if (this.chart) {
      this.chart.clear();
      this.chart.dispose();
      this.detach();
      this.chart = null;
    }

    this.chart = echarts.init(this.root);
    this.initEventListeners();
    this.addSubs();

    Object.assign(this.option.series[0], {
      data,
      label: { formatter: (params: any) => this.formatLabel(params) },
    });
    this.chart.setOption(this.option, false, true);
  }

  detach() {
    for (const sub of this.subs)
      sub.unsubscribe();
    super.detach();
  }
}
