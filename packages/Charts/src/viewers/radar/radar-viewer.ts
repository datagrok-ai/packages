import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';

import * as echarts from 'echarts';
import {option} from './constants';
import {StringUtils} from '@datagrok-libraries/utils/src/string-utils';

type MinimalIndicator = '1' | '5' | '10' | '25';
type MaximumIndicator = '75' | '90' | '95' | '99';

// Based on this example: https://echarts.apache.org/examples/en/editor.html?c=radar
@grok.decorators.viewer({
  name: 'Radar',
  description: 'Creates a radar viewer',
  icon: 'icons/radar-viewer.svg',
})
export class RadarViewer extends DG.JsViewer {
  get type(): string {return 'RadarViewer';}

  chart: echarts.ECharts;
  min: MinimalIndicator;
  max: MaximumIndicator;
  showCurrentRow: boolean;
  showTooltip: boolean;
  showAllRows: boolean;
  showMin: boolean;
  showMax: boolean;
  showValues: boolean;
  backgroundMinColor: number;
  backgroundMaxColor: number;
  valuesColumnNames: string[];
  columns: DG.Column[] = [];

  constructor() {
    super();
    this.min = <MinimalIndicator> this.string('min', '5', { choices: ['1', '5', '10', '25'],
      description: 'Minimum percentile value (indicated as dark blue area)' });
    this.max = <MaximumIndicator> this.string('max', '95', { choices: ['75', '90', '95', '99'],
      description: 'Maximum percentile value (indicated as light blue area)' });
    this.showCurrentRow = this.bool('showCurrentRow', false);
    this.showTooltip = this.bool('showTooltip', true);
    this.showAllRows = this.bool('showAllRows', false);
    this.backgroundMinColor = this.int('backgroundMinColor', 0xFFB0D7FF);
    this.backgroundMaxColor = this.int('backgroundMaxColor', 0xFFBCE2F5);
    this.showMin = this.bool('showMin', true);
    this.showMax = this.bool('showMax', true);
    this.showValues = this.bool('showValues', true);
    this.valuesColumnNames = this.addProperty('valuesColumnNames', DG.TYPE.COLUMN_LIST);

    const chartDiv = ui.div([], { style: { position: 'absolute', left: '0', right: '0', top: '0', bottom: '0'}} );
    this.root.appendChild(chartDiv);
    this.chart = echarts.init(chartDiv);
    this.subs.push(ui.onSizeChanged(chartDiv).subscribe((_) => this.chart.resize()));
  }

  init() {
    option.radar.indicator = [];
    const columnNames: string[] = [];
    for (const column of this.dataFrame.columns.numerical)
      columnNames.push(column.name);

    this.columns = this.columns.length > 0  ? this.columns : this.getColumns();
    for (const c of this.columns) {
      let minimalVal = c.min < 0 ? c.min + c.min * 0.1 : c.min;
      option.radar.indicator.push({name: c.name, max: c.max, min: minimalVal});
    }
    this.updateMin();
    this.updateMax();
    this.updateRow();

    this.chart.on('mouseover', (params: any) => {
      if (params.componentType === 'series') {
        if (params.seriesIndex === 2) {
          const divs: HTMLElement[] = [];
          for (let i = 0; i < this.columns.length; ++i)
            divs[i] = ui.divText(`${this.columns[i].name} : ${params.data.value[i]}`);

          ui.tooltip.show(ui.div(divs), params.event.event.x, params.event.event.y);
        }
      }
    });
    this.chart.on('mouseout', () => ui.tooltip.hide());
    this.helpUrl = 'https://raw.githubusercontent.com/datagrok-ai/public/master/help/visualize/viewers/radar-viewer.md';
  }

  initChartEventListeners() {
    this.dataFrame.onRowsFiltered.subscribe((_) => {
      this.checkConditions();
      this.render();
    });
  }

  onTableAttached() {
    this.init();
    this.initChartEventListeners();
    this.valuesColumnNames = Array.from(this.dataFrame.columns.numerical)
    .filter((c: DG.Column) => c.type !== DG.TYPE.DATE_TIME && c.type !== DG.TYPE.BIG_INT)
    .map((c: DG.Column) => c.name);
    this.subs.push(this.dataFrame.selection.onChanged.subscribe((_) => this.render()));
    this.subs.push(this.dataFrame.filter.onChanged.subscribe((_) => this.render()));
    this.subs.push(this.dataFrame.onCurrentRowChanged.subscribe((_) => {
      this.updateRow();
      this.chart.setOption(option);
    }));
    this.subs.push(this.dataFrame.onColumnsRemoved.subscribe((_) => {
      this.init();
      this.chart.setOption(option);
    }));
    this.render();
  }

  public override onPropertyChanged(property: DG.Property): void {
    super.onPropertyChanged(property);
    switch (property.name) {
    case 'min':
      if (this.showMin === true)
        this.updateMin();
      break;
    case 'max':
      if (this.showMax === true)
        this.updateMax();

      break;
    case 'showMin':
      if (this.showMin != true)
        this.clearData([0]);
      else
        this.updateMin();

      break;
    case 'showMax':
      if (this.showMax != true)
        this.clearData([1]);
      else
        this.updateMax();

      break;
    case 'showCurrentRow':
      if (this.showCurrentRow === true)
        this.clearData([0, 1]);
      else {
        this.clearData([2]);
        this.checkConditions();
      }
      break;
    case 'showAllRows':
      if (this.showAllRows === true) {
        option.legend.show = false;
        this.clearData([0, 1, 2]);
        const data = option.series[2].data;
        for (let i = 0; i < this.dataFrame.rowCount; i++) {
          data.push({
            name: `row ${i}`,
            value: this.columns.map((c) => c.get(i)),
          });
        }
      } else {
        option.legend.show = true;
        this.clearData([2]);
        this.checkConditions();
      }
      break;
    case 'showTooltip':
      if (this.showTooltip === false)
        option['silent'] = true;
      else
        option['silent'] = false;

      break;
    case 'backgroundMinColor':
      if (this.showMin === true)
        this.updateMin();

      break;
    case 'backgroundMaxColor':
      if (this.showMax === true)
        this.updateMax();

      break;
    case 'showValues':
      if (this.showValues === false) {
        option.series[2].data = [];
        option.series[2].data.push({
          value: this.columns.map((c) => {
            const value = Number(c.get(this.dataFrame.currentRowIdx));
            return value != -2147483648 ? value : 0}),
          name: `row ${this.dataFrame.currentRowIdx + 1}`,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: 'rgba(66, 135, 204, 0.8)',
          },
          label: {
            show: false,
          },
          symbolSize: 6,
          itemStyle: {
            color: 'rgba(66, 135, 204, 0.8)',
          },
        });
      } else
        this.checkConditions();

      break;
    case 'valuesColumnNames':
      this.init();
      break;
    }
    this.render();
  }

  checkConditions() {
    if (this.showMin === true)
      this.updateMin();
    if (this.showMax === true)
      this.updateMax();
    this.updateRow();
  }

  updateMin() {
    option.series[0].data[0] = {
      value: this.getQuantile(this.columns, this.getOptions(true).look.min / 100),
      name: `${this.getOptions(true).look.min}th percentile`,
      areaStyle: {
        color: DG.Color.toHtml(this.backgroundMinColor),
        opacity: 0.4,
      },
      lineStyle: {
        opacity: 0,
      },
      symbolSize: 0,
    };
    option.color[0] = DG.Color.toHtml(this.backgroundMinColor);
  }

  updateMax() {
    option.series[1].data[0] = {
      value: this.getQuantile(this.columns, this.getOptions(true).look.max / 100),
      name: `${this.getOptions(true).look.max}th percentile`,
      areaStyle: {
        color: DG.Color.toHtml(this.backgroundMaxColor),
        opacity: 0.4,
      },
      lineStyle: {
        opacity: 0,
      },
      symbolSize: 0,
    };
    option.color[1] = DG.Color.toHtml(this.backgroundMaxColor);
  }

  updateRow() {
    option.series[2].data[0] = {
      value: this.columns.map((c) => {
        const value = Number(c.get(this.dataFrame.currentRowIdx));
        return value != -2147483648 ? value : 0;
      }),
      name: `row ${this.dataFrame.currentRowIdx + 1}`,
      lineStyle: {
        width: 2,
        type: 'dashed',
        color: 'rgba(66, 135, 204, 0.8)',
      },
      symbolSize: 6,
      itemStyle: {
        color: 'rgba(66, 135, 204, 0.8)',
      },
      label: {
        show: true,
        formatter: function(params: any) {
          return StringUtils.formatNumber(params.value) as string;
        },
      },
    };
  }

  clearData(indexes: number[]) {
    for (let i = 0; i < indexes.length; ++i)
      option.series[indexes[i]].data = [];
  }

  getColumns() : DG.Column<any>[] {
    let columns: DG.Column<any>[] = [];
    let numericalColumns: DG.Column<any>[] = Array.from(this.dataFrame.columns.numerical);
    if (this.valuesColumnNames?.length > 0) {
      let selectedColumns = this.dataFrame.columns.byNames(this.valuesColumnNames);
      for (let i = 0; i < selectedColumns.length; ++i) 
        if (numericalColumns.includes(selectedColumns[i])) 
          columns.push(selectedColumns[i]);
    } else {
      columns = numericalColumns.slice(0, 20);
    }
    for (let i = 0; i < columns.length; ++i)
      if (columns[i].type === DG.TYPE.DATE_TIME) 
        columns.splice(i, 1);
    return columns;
  }

  render() {
    this.chart.setOption(option);
  }

  /* Going to be replaced with perc in stats */
  getQuantile(columns: DG.Column<any>[], percent: number) {
    const result = [];
    for (const c of columns) {
      const sortedValues = Array.from(c.values()).filter(value => {
        if (typeof value === 'bigint') {
          return value !== BigInt('-2147483648');
        }
        return value !== -2147483648;
      }).sort((a, b) => Number(a) - Number(b));               
      const idx = Math.floor(percent * (sortedValues.length - 1));
      let value = sortedValues[idx]; 
      result.push(Number(value));
    }
    return result;
  }
}
