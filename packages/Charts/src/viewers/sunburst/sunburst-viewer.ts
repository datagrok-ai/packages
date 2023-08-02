import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {EChartViewer} from '../echart/echart-viewer';
import {TreeUtils, treeDataType} from '../../utils/tree-utils';
import { StringUtils } from '@datagrok-libraries/utils/src/string-utils';
import { delay } from '@datagrok-libraries/utils/src/test';

/// https://echarts.apache.org/examples/en/editor.html?c=tree-basic

/** Represents a sunburst viewer */
@grok.decorators.viewer({
  name: 'Sunburst',
  description: 'Creates a sunburst viewer',
  icon: 'icons/sunburst-viewer.svg',
})

export class SunburstViewer extends EChartViewer {
  hierarchyColumnNames: string[];
  hierarchyLevel: number;

  constructor() {
    super();
    this.initCommonProperties();
    this.initEventListeners();

    this.hierarchyColumnNames = this.addProperty('hierarchyColumnNames', DG.TYPE.COLUMN_LIST);
    this.hierarchyLevel = 3;

    this.option = {
      animation: false,
      series: [
        {
          type: 'sunburst',
          label: {
            rotate: 'radial',
          },
          labelLayout: {
            hideOverlap: 'true',
            align: 'center',
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
      if (!this.dataFrame.filter.get(i))
        return false;
      for (let j = 0; j < path.length; j++) {
        if (this.dataFrame.getCol(this.hierarchyColumnNames[j]).get(i).toString() !== path[j])
          return false;
      }
      return true;
    }, event);
  }

  initEventListeners(): void {
    this.chart.on('click', (params: any) => {
      const selectedSectors: string[] = [];
      const path: string[] = params.data.path.split('|').map((str: string) => str.trim());
      const pathString: string = path.join('|');
      const isSectorSelected = selectedSectors.includes(pathString);
      if (params.event.event.shiftKey || params.event.event.ctrlKey) {
        if (!isSectorSelected) {
          selectedSectors.push(pathString);
          this.handleDataframeSelection(path, params.event.event);
        }
      } else if (params.event.event.shiftKey && params.event.event.ctrlKey) {
        if (isSectorSelected) {
          const index = selectedSectors.indexOf(pathString);
          selectedSectors.splice(index, 1);
          this.handleDataframeSelection(path, params.event.event);
        }
      } else {
        return;
      }
    });
    this.chart.on('mouseover', (params: any) => {
      ui.tooltip.showRowGroup(this.dataFrame, (i) => {
        const { hierarchyColumnNames, dataFrame } = this;
        for (let j = 0; j < hierarchyColumnNames.length; ++j) {
          if (dataFrame.getCol(hierarchyColumnNames[j]).get(i).toString() === params.name) {
            return true;
          }
        }
        return false;
      }, params.event.event.x, params.event.event.y);
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
    };
  }

  onContextMenuHandler(menu: DG.Menu): void {
    menu.item('Reset View', () => {
      this.render();
    });
  }

  onPropertyChanged(p: DG.Property | null, render: boolean = true): void {
    if (p?.name === 'hierarchyColumnNames')
      this.render();
    else
      super.onPropertyChanged(p, render);
  }

  onTableAttached(): void {
    const categoricalColumns = [...this.dataFrame.columns.categorical].sort((col1, col2) =>
      col1.categories.length - col2.categories.length);

    if (categoricalColumns.length < 1)
      return;

    if (this.hierarchyColumnNames == null || this.hierarchyColumnNames.length === 0)
      this.hierarchyColumnNames = categoricalColumns.slice(0, this.hierarchyLevel).map((col) => col.name);
    
    this.subs.push(this.dataFrame.onMetadataChanged.subscribe((_) => {this.render()}));
    this.subs.push(this.onContextMenu.subscribe(this.onContextMenuHandler.bind(this)));
    super.onTableAttached();
  }

  getSeriesData(): treeDataType[] | undefined {
    return TreeUtils.toForest(this.dataFrame, this.hierarchyColumnNames, this.dataFrame.filter);
  }

  async handleStructures(data: treeDataType[] | undefined) {
    for (const entry of data!) {
      const name = entry.name;
      const isSmiles = await grok.functions.call('Chem:isSmiles', {s: name});
      if (isSmiles) {
        const imageContainer = await grok.functions.call('Chem:drawMolecule', {
          'molStr': name, 'w': 70, 'h': 80, 'popupMenu': false
        });
        const image = imageContainer.querySelector(".chem-canvas");
        await delay(5);
        const img = new Image();
        img.src = image.toDataURL('image/png');
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

  render() {
    if (this.hierarchyColumnNames == null || this.hierarchyColumnNames.length === 0)
      return;

    this.handleStructures(this.getSeriesData()).then((data) => {
      this.option.series[0].data = data;
      this.chart.setOption(this.option);
    });
  }

  detach() {
    for (const sub of this.subs)
      sub.unsubscribe();
    super.detach();
  }
  
}
