import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import { EChartViewer } from '../echart/echart-viewer';
import { TreeUtils, TreeDataType } from '../../utils/tree-utils';

import * as utils from '../../utils/utils';


/// https://echarts.apache.org/examples/en/editor.html?c=tree-basic
@grok.decorators.viewer({
  name: 'Tree',
  description: 'Creates a tree viewer',
  trellisable: false,
  icon: 'icons/tree-viewer.svg',
})
export class TreeViewer extends EChartViewer {
  layout: layoutType;
  orient: orientation;
  expandAndCollapse: boolean;
  edgeShape: edgeShape;
  symbol: symbolType;
  symbolSize: number;
  hierarchyColumnNames: string[];
  animation: boolean;
  initialTreeDepth: number;
  sizeColumnName: string;
  sizeAggrType: DG.AggregationType;
  symbolSizeRange: [number, number] = [5, 20];
  aggregations: string[] = Object.values(DG.AGG).filter((f) => f !== DG.AGG.KEY && f !== DG.AGG.PIVOT);
  aggregationsStr: string[] = Object.values({...DG.STR_AGG, ...DG.STAT_COUNTS});
  colorColumnName: string;
  colorAggrType: DG.AggregationType;
  selectionColor = DG.Color.toRgb(DG.Color.selectedRows);
  applySizeAggr: boolean = false;
  applyColorAggr: boolean = false;

  constructor() {
    super();

    this.initCommonProperties();
    this.animation = this.bool('animation', true);
    this.layout = <layoutType> this.string('layout', 'orthogonal', { choices: ['orthogonal', 'radial'] });
    this.orient = <orientation> this.string('orient', 'LR', { choices: ['LR', 'RL', 'TB', 'BT'] });
    this.expandAndCollapse = this.bool('expandAndCollapse', true);
    this.initialTreeDepth = this.int('initialTreeDepth', 3, { min: -1, max: 5 });
    this.edgeShape = <edgeShape> this.string('edgeShape', 'curve', { choices: ['curve', 'polyline'] });
    this.symbol = <symbolType> this.string('symbol', 'emptyCircle', { choices: [
      'circle', 'emptyCircle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'none',
    ] });
    this.symbolSize = this.int('symbolSize', 7);
    this.sizeColumnName = this.string('sizeColumnName');
    this.sizeAggrType = <DG.AggregationType> this.string('sizeAggrType', DG.AGG.AVG, { choices: this.aggregations });
    this.colorColumnName = this.string('colorColumnName');
    this.colorAggrType = <DG.AggregationType> this.string('colorAggrType', DG.AGG.AVG, { choices: this.aggregations });
    this.hierarchyColumnNames = this.addProperty('hierarchyColumnNames', DG.TYPE.COLUMN_LIST);

    this.option = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
      },
      series: [
        {
          type: 'tree',

          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 9,
          },

          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left',
            },
          },
        },
      ],
    };
    this.animationDuration = 750;

    this.onPropertyChanged(null);
  }

  initChartEventListeners() {
    this.chart.on('click', (params: {[key: string]: any}) => this.dataFrame.selection.handleClick((i) => {
      if (params.componentType !== 'series')
        return false;
      if (params.data.path === null)
        return true;
      else {
        const categories: string[] = params.data.path.split(' | ');
        let isMatch = true;
        categories.forEach((category, idx) => {
          const col = this.dataFrame.col(this.hierarchyColumnNames[idx]);
          isMatch = isMatch && category === (col!.type === DG.COLUMN_TYPE.BOOL ? col!.get(i).toString() : col!.get(i));
        });
        return isMatch;
      }
    }, params.event!.event, true));
  }

  onPropertyChanged(p: DG.Property | null, render: boolean = true) {
    if (p?.name === 'edgeShape') {
      this.getProperty('layout')?.set(this, 'orthogonal');
      this.option.series[0].layout = 'orthogonal';
      this.option.series[0].label.rotate = 0;
      this.chart.clear();
    }
    if (p?.name === 'layout') {
      const layout: layoutType = p.get(this);
      this.option.series[0].layout = layout;
      if (layout === 'orthogonal')
        this.option.series[0].label.rotate = 0;
      else {
        this.option.series[0].label.rotate = null;
        const es = this.getProperty('edgeShape');
        if (es?.get(this) !== 'curve') {
          es?.set(this, 'curve');
          this.option.series[0].edgeShape = 'curve';
        }
      }
      this.render();
      return;
    }
    if (p?.name === 'table') {
      this.updateTable();
      this.onTableAttached();
      this.render();
    }
    if (p?.name === 'hierarchyColumnNames' || p?.name === 'sizeColumnName' ||
        p?.name === 'sizeAggrType' || p?.name === 'colorColumnName' || p?.name === 'colorAggrType') {
      if (p?.name === 'hierarchyColumnNames')
        this.chart.clear();
      if (p?.name === 'colorColumnName' || p?.name === 'colorAggrType')
        this.applyColorAggr = this.shouldApplyAggregation(this.colorColumnName, this.colorAggrType);
      if (p?.name === 'sizeColumnName' || p?.name === 'sizeAggrType')
        this.applySizeAggr = this.shouldApplyAggregation(this.sizeColumnName, this.sizeAggrType);
      this.render();
    } else
      super.onPropertyChanged(p, render);
  }

  shouldApplyAggregation(columnName: string, aggrType: string): boolean {
    const numericalColumns = this.dataFrame.columns.byName(columnName);
    const isColumnNumerical = numericalColumns ? numericalColumns.matches('numerical') : false;
    const isAggregationApplicable = this.aggregationsStr.includes(aggrType);
    return isColumnNumerical || (!isColumnNumerical && isAggregationApplicable);
  }

  _testColumns() {
    return this.dataFrame.columns.length >= 1;
  }

  onTableAttached() {
    const categoricalColumns = [...this.dataFrame.columns.categorical].sort((col1, col2) =>
      col1.categories.length - col2.categories.length);

    if (categoricalColumns.length < 1)
      return;

    this.filter = this.dataFrame.filter;
    this.hierarchyColumnNames = categoricalColumns.slice(0, 3).map((col) => col.name);
    this.sizeColumnName = '';
    this.colorColumnName = '';

    super.onTableAttached();
    this.subs.push(this.dataFrame.onColumnsRemoved.subscribe((data) => {
      const columnNamesToRemove = data.columns.map((column: DG.Column) => column.name);
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((columnName) => !columnNamesToRemove.includes(columnName));
      this.render();
    }));
    this.initChartEventListeners();
    this.helpUrl = 'https://datagrok.ai/help/visualize/viewers/tree';
  }

  colorCodeTree(data: TreeDataType): void {
    const min = data['color-meta']['min'];
    const max = data['color-meta']['max'];
    const setItemStyle = (data: TreeDataType) => {
      const nodeColor = DG.Color.toRgb(DG.Color.scaleColor(data.color, min, max));
      data.itemStyle = data.itemStyle ?? {};
      data.itemStyle.color = data.itemStyle.color === this.selectionColor ? this.selectionColor : nodeColor;
      if (data.children)
        data.children.forEach((child) => setItemStyle(child));
    };
    setItemStyle(data);
  }

  getSeriesData() {
    const aggregations = [];

    if (this.sizeColumnName && this.applySizeAggr)
      aggregations.push({ type: <DG.AggregationType> this.sizeAggrType,
        columnName: this.sizeColumnName, propertyName: 'size' });

    if (this.colorColumnName && this.applyColorAggr)
      aggregations.push({ type: <DG.AggregationType> this.colorAggrType,
        columnName: this.colorColumnName, propertyName: 'color' });

    return [TreeUtils.toTree(this.dataFrame, this.hierarchyColumnNames, this.filter, null, aggregations)];
  }

  render() {
    if (this.hierarchyColumnNames?.some((colName) => !this.dataFrame.columns.names().includes(colName)))
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((value) => this.dataFrame.columns.names().includes(value));
    if (this.hierarchyColumnNames == null || this.hierarchyColumnNames.length === 0)
      return;

    this.option.series[0].data = this.getSeriesData();

    this.option.series[0]['symbolSize'] = this.sizeColumnName && this.applySizeAggr ?
      (value: number, params: {[key: string]: any}) => utils.data.mapToRange(
        params.data.size, this.option.series[0].data[0]['size-meta']['min'],
        this.option.series[0].data[0]['size-meta']['max'], ...this.symbolSizeRange) : this.symbolSize;
    if (this.colorColumnName && this.applyColorAggr)
      this.colorCodeTree(this.option.series[0].data[0]);

    this.chart.setOption(this.option);
  }
}

type layoutType = 'orthogonal' | 'radial';
type orientation = 'LR' | 'RL' | 'TB' | 'BT';
type edgeShape = 'curve' | 'polyline';
type symbolType = 'circle' | 'emptyCircle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
