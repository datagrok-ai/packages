import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {EChartViewer} from '../echart/echart-viewer';
import {TreeUtils, TreeDataType} from '../../utils/tree-utils';
import { delay } from '@datagrok-libraries/utils/src/test';

/// https://echarts.apache.org/examples/en/editor.html?c=tree-basic

type onClickOptions = 'Select' | 'Filter';

/** Represents a sunburst viewer */
@grok.decorators.viewer({
  name: 'Sunburst',
  description: 'Creates a sunburst viewer',
  icon: 'icons/sunburst-viewer.svg',
})

export class SunburstViewer extends EChartViewer {
  hierarchyColumnNames: string[];
  hierarchyLevel: number;
  onClick: onClickOptions;
  selectedOptions: string[] = ['Selected', 'SelectedOrCurrent', 'FilteredSelected'];
  inheritFromGrid: boolean;

  constructor() {
    super();
    this.initCommonProperties();
    this.initEventListeners();

    this.hierarchyColumnNames = this.addProperty('hierarchyColumnNames', DG.TYPE.COLUMN_LIST);
    this.hierarchyLevel = 3;
    this.onClick = <onClickOptions> this.string('onClick', 'Select', { choices: ['Select', 'Filter'] });
    this.inheritFromGrid = this.bool('inheritFromGrid', true, {category: 'Color'});

    this.option = {
      animation: false,
      series: [
        {
          type: 'sunburst',
          nodeClick: false,
          label: {
            rotate: 'radial',
            fontSize: 10,
          }
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
    this.dataFrame.selection.handleClick((i) => {
      if (!this.filter.get(i))
        return false;
      for (let j = 0; j < path.length; j++) {
        if (this.dataFrame.getCol(this.hierarchyColumnNames[j]).get(i).toString() !== path[j])
          return false;
      }
      return true;
    }, event);
  }

  handleDataframeFiltering(path: string[], dataFrame: DG.DataFrame) {
    const filterFunction = this.buildFilterFunction(path);
    dataFrame.rows.filter(filterFunction);
  }
  
  buildFilterFunction(path: string[]): (row: any) => boolean {
    return (row) => {
      for (let i = 0; i < path.length; ++i) {
        const columnType = this.dataFrame.getCol(this.hierarchyColumnNames[i]).type;
        const columnValue = row.get(this.hierarchyColumnNames[i]);
        const formattedValue = columnType !== 'string' ? columnValue.toString() : columnValue;
        const expectedValue = path[i];
        if (formattedValue !== expectedValue)
          return false;
      }
      return true;
    };
  }

  removeFiltering() {
    if (this.dataFrame.filter.trueCount !== this.dataFrame.rowCount) {
      this.dataFrame.filter.setAll(true);
    }
  }

  initEventListeners(): void {
    this.chart.on('click', (params: any) => {
      const selectedSectors: string[] = [];
      if (!params.data.path)
        return;
      const path: string[] = params.treePathInfo.slice(1).map((obj: any) => obj.name);
      const pathString: string = path.join('|');
      if (this.onClick === 'Filter') {
        this.handleDataframeFiltering(path, this.dataFrame);
        return;
      }
      const isSectorSelected = selectedSectors.includes(pathString);
      if (params.event.event.shiftKey || params.event.event.ctrlKey || params.event.event.metaKey) {
        if (!isSectorSelected) {
          selectedSectors.push(pathString);
          this.handleDataframeSelection(path, params.event.event);
        }
      } else if ((params.event.event.shiftKey && params.event.event.ctrlKey) || 
                (params.event.event.shiftKey && params.event.event.metaKey)) {
        if (isSectorSelected) {
          const index = selectedSectors.indexOf(pathString);
          selectedSectors.splice(index, 1);
          this.handleDataframeSelection(path, params.event.event);
        }
      } else {
        this.handleDataframeSelection(path, params.event.event);
      }
    });
    this.chart.on('mouseover', async (params: any) => {
      const path = params.treePathInfo.slice(1).map((obj: any) => obj.name);
      const bitset = this.filter;
      const matchDf = this.dataFrame.clone();
      matchDf.rows.removeWhere(row => bitset && !bitset.get(row.idx));

      this.handleDataframeFiltering(path, matchDf);
      const matchCount = matchDf.filter.trueCount;
      ui.tooltip.showRowGroup(this.dataFrame, (i) => {
        const { hierarchyColumnNames, dataFrame } = this;
        for (let j = 0; j < hierarchyColumnNames.length; ++j) {
          const column = dataFrame.getCol(hierarchyColumnNames[j]);
          const format = column.getTag(DG.TAGS.FORMAT);
          if (format) {
            const number = format.indexOf('.');
            const len = format.length - number - 1;
            if ((column.get(i)).toFixed(len) === params.name)
              return true;
          }
          if (column.get(i).toString() === params.name) {
            return true;
          }
        }
        return false;
      }, params.event.event.x, params.event.event.y);
      const {isSmiles, image} = await this.checkAndCreateMoleculeImage(params.name);
      if (isSmiles && params.data.semType === 'Molecule') {
        ui.tooltip.root.innerText = `${matchCount}`;
        ui.tooltip.root.appendChild(image!);
      } else {
        ui.tooltip.root.innerText = `${matchCount}\n${params.name}`;  
      }
    });      
    this.chart.on('mouseout', () => ui.tooltip.hide());
    this.chart.getDom().ondblclick = (event: MouseEvent) => {
      const canvas = this.chart.getDom().querySelector('canvas');
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      const scaleY = canvas!.height / rect.height;
      const clickX = (event.clientX - rect.left) * scaleX;
      const clickY = (event.clientY - rect.top) * scaleY;
      if (this.isCanvasEmpty(canvas!.getContext('2d'), clickX, clickY)) {
        this.render();
      }
      this.removeFiltering();
    };
  }

  onContextMenuHandler(menu: DG.Menu): void {
    menu.item('Reset View', () => {
      this.render();
      this.removeFiltering();
    });
  }

  onPropertyChanged(p: DG.Property | null, render: boolean = true): void {
    if (p?.name === 'hierarchyColumnNames' || p?.name === 'inheritFromGrid')
      this.render();
    if (p?.name === 'table') {
      this.updateTable();
      this.onTableAttached(true);
    }
    else
      super.onPropertyChanged(p, render);
  }

  onTableAttached(propertyChanged?: boolean): void {
    let categoricalColumns = [...this.dataFrame.columns.categorical].sort((col1, col2) =>
      col1.categories.length - col2.categories.length);
    categoricalColumns = categoricalColumns.filter((col: DG.Column) => col.stats.missingValueCount != col.length && !col.name.startsWith('~'));

    if (categoricalColumns.length < 1)
      return;

    this.hierarchyColumnNames = categoricalColumns.slice(0, this.hierarchyLevel).map((col) => col.name);

    this.subs.push(this.dataFrame.onMetadataChanged.subscribe((_) => {this.render()}));
    this.subs.push(this.onContextMenu.subscribe(this.onContextMenuHandler.bind(this)));
    this.subs.push(this.dataFrame.onColumnsRemoved.subscribe((data) => {
      const columnNamesToRemove = data.columns.map((column: DG.Column) => column.name);
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((columnName) => !columnNamesToRemove.includes(columnName));
      this.render();
    }));
    this.addSelectionOrDataSubs();
    this.render();
  }

  getSeriesData(): TreeDataType[] | undefined {
    const rowSource = this.selectedOptions.includes(this.rowSource!);
    return TreeUtils.toForest(this.dataFrame, this.hierarchyColumnNames, this.filter, rowSource, this.inheritFromGrid);
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
    const {width, height} = this.calculateRingDimensions(r0, r, startAngle, endAngle);

    const averageCharWidth = 5;
    const averageCharHeight = 10;
    const maxWidthCharacters = Math.floor(width / averageCharWidth);
    const maxHeightCharacters = Math.floor(height / averageCharHeight);
    const maxLength = maxWidthCharacters;

    const name = params.name;
    const lines = name.split(' ');
    let result = '';
    let remainingHeight = maxHeightCharacters;

    for (let line of lines) {
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
    let width = outerRadius - innerRadius;
    let height = Math.abs(endAngle - startAngle) * outerRadius;
    return { height, width };
  }

  async checkAndCreateMoleculeImage(name: string): Promise<{ isSmiles: boolean, image: HTMLCanvasElement | null }> {
    const isSmiles = await grok.functions.call('Chem:isSmiles', {s: name});
    let image: HTMLCanvasElement | null = null;
    if (isSmiles) {
      const imageContainer = await grok.functions.call('Chem:drawMolecule', {
        'molStr': name, 'w': 70, 'h': 80, 'popupMenu': false
      });
      image = imageContainer.querySelector(".chem-canvas");
    }
    return {isSmiles, image};
  }

  async handleStructures(data: TreeDataType[] | undefined) {
    for (const entry of data!) {
      const name = entry.name;
      const { isSmiles, image } = await this.checkAndCreateMoleculeImage(name);
      if (isSmiles && entry.semType === 'Molecule') {
        await delay(5);
        const img = new Image();
        img.src = image!.toDataURL('image/png');
        entry.label = {
          show: true,
          formatter: '{b}',
          color: 'rgba(0,0,0,0)',
          height: '80',
          width: '70',
          backgroundColor: {
            image: img.src,
          },
        }
      } 
      if (entry.children) {
        await this.handleStructures(entry.children);
      }
    }
    return data;
  }

  _testColumns() {
    return this.dataFrame.columns.length >= 1;
  }

  render() {
    if (this.hierarchyColumnNames?.some((colName) => !this.dataFrame.columns.names().includes(colName)))
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((value) => this.dataFrame.columns.names().includes(value));
    if (this.hierarchyColumnNames == null || this.hierarchyColumnNames.length === 0)
      return;

    this.handleStructures(this.getSeriesData()).then((data) => {
      this.option.series[0].data = data;
      this.option.series[0].label.formatter = (params: any) => this.formatLabel(params);
      this.chart.setOption(this.option);
    });
  }

  detach() {
    for (const sub of this.subs)
      sub.unsubscribe();
    super.detach();
  }
  
}
