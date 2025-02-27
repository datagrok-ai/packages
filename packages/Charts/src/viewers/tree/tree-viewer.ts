import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import { EChartViewer } from '../echart/echart-viewer';
import { TreeUtils, TreeDataType } from '../../utils/tree-utils';

import * as utils from '../../utils/utils';
import * as echarts from 'echarts';

type onClickOptions = 'Select' | 'Filter';
const rowSourceMap: Record<onClickOptions, string> = {
  Select: 'Filtered',
  Filter: 'All'
};
const aggregationMap = new Map<string, string[]>([
  // Aggregation for numeric columns: int, bigint, float, qnum
  ['int', Object.values(DG.AGG)],
  ['bigint', Object.values(DG.AGG)],
  ['float', Object.values(DG.AGG)],
  ['qnum', Object.values(DG.AGG)],

  // Aggregation for string columns
  ['string', [
    ...Object.values(DG.STR_AGG),
    ...Object.values(DG.STAT_COUNTS)
  ]],

  // Aggregation for datetime columns
  ['datetime', [
    ...Object.values(DG.STAT_COUNTS), 
    DG.AGG.MIN, 
    DG.AGG.MAX, 
    DG.AGG.AVG
  ]],

  // Aggregation for virtual columns
  ['virtual', [
    DG.AGG.TOTAL_COUNT, 
    DG.AGG.MISSING_VALUE_COUNT
  ]]
]);
const CATEGORIES_NUMBER = 500;
/// https://echarts.apache.org/examples/en/editor.html?c=tree-basic
@grok.decorators.viewer({
  name: 'Tree',
  description: 'Creates a tree viewer',
  trellisable: false,
  icon: 'icons/tree-viewer.svg',
})
export class TreeViewer extends EChartViewer {
  private renderQueue: Promise<void> = Promise.resolve();
  layout: layoutType;
  orient: orientation;
  initialTreeDepth: number;
  symbolSizeRange: [number, number] = [5, 20];
  symbol: symbolType;
  symbolSize: number;
  fontSize: number;
  showCounts: boolean;
  sizeColumnName: string = '';
  sizeAggrType: DG.AggregationType = 'avg';
  colorColumnName: string = '';
  colorAggrType: DG.AggregationType = 'avg';
  hierarchyColumnNames: string[];
  eligibleHierarchyNames!: string[];
  aggregations: string[] = [
    ...new Set([
      ...Object.values(DG.AGG),
      ...Object.values(DG.STR_AGG),
      ...Object.values(DG.STAT_COUNTS)
    ].filter((f) => f !== DG.AGG.KEY && f !== DG.AGG.PIVOT))
  ];  
  selectionColor = DG.Color.toRgb(DG.Color.selectedRows);
  applySizeAggr: boolean = false;
  applyColorAggr: boolean = false;
  onClick: onClickOptions;
  includeNulls: boolean;
  labelRotate: number;
  selectedRowsColor: number;
  mouseOverLineColor: number;
  showMouseOverLine: boolean;
  
  private clickedPath: string | null = null;
  private hoveredPath: string | null = null;
  private selectedPaths: string[] | null = null;
  private moleculeRenderQueue: Promise<void> = Promise.resolve();
  constructor() {
    super();

    this.layout = <layoutType> this.string('layout', 'orthogonal', { choices: ['orthogonal', 'radial'], category: 'Style'});
    this.orient = <orientation> this.string('orient', 'LR', { choices: ['LR', 'RL', 'TB', 'BT'], category: 'Style' });
    this.initialTreeDepth = this.int('initialTreeDepth', 3, { min: 0, max: 5, category: 'Style'});
    this.symbol = <symbolType> this.string('symbol', 'emptyCircle', { choices: [
      'circle', 'emptyCircle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'none',
    ], category: 'Style' });
    this.symbolSize = this.int('symbolSize', 7, {category: 'Style', description: 'Used unless an aggregation function is specified'});
    this.fontSize = this.int('fontSize', 12, {category: 'Style', max: 30});
    this.labelRotate = this.int('labelRotate', 45, {category: 'Style', max: 360});
    this.showCounts = this.bool('showCounts', false, {category: 'Style'});
    this.mouseOverLineColor = this.int('mouseOverLineColor', 0x6C5E5E, {category: 'Style'});
    this.selectedRowsColor = this.int('selectedRowsColor', 0xFF8C00, {category: 'Style'});

    this.showMouseOverLine = this.bool('showMouseOverLine', false, {category: 'Selection'});

    this.sizeColumnName = this.string('sizeColumnName', '', {category: 'Size'});
    this.sizeAggrType = <DG.AggregationType> this.string('sizeAggrType', DG.AGG.AVG, { choices: this.aggregations, category: 'Size' });
    
    this.colorColumnName = this.string('colorColumnName', '', {category: 'Color'});
    this.colorAggrType = <DG.AggregationType> this.string('colorAggrType', DG.AGG.AVG, { choices: this.aggregations, category: 'Color' });

    this.hierarchyColumnNames = this.addProperty('hierarchyColumnNames', DG.TYPE.COLUMN_LIST, null, {category: 'Data', columnTypeFilter: DG.TYPE.CATEGORICAL});
    this.onClick = <onClickOptions> this.string('onClick', 'Select', { choices: ['Select', 'Filter']});
    this.includeNulls = this.bool('includeNulls', true, {category: 'Value'});

    this.option = {
      series: [
        {
          type: 'tree',
          roam: true,
          initialTreeDepth: this.initialTreeDepth,
          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            rotate: this.labelRotate,
            fontSize: this.fontSize,
          },

          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left',
              rotate: this.labelRotate,
              fontSize: this.fontSize,
            },
          },
        },
      ],
    };

    this.onPropertyChanged(null);
  }

  handleDataframeSelection(path: string[], event: any) {
    this.dataFrame.selection.handleClick((index: number) => {
      if (!this.filter.get(index) && this.rowSource !== 'Selected')
        return false;

      return path.every((segment, j) => {
        const columnValue = this.dataFrame.getCol(this.eligibleHierarchyNames[j]).get(index);
        return (columnValue !== null && columnValue.toString() === segment) || (columnValue == null && segment === ' ');
      });
    }, event.event);
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
        const formattedValue = columnValue !== null ?
          (column.type !== DG.TYPE.STRING ? columnValue.toString() : columnValue) : '';
        return formattedValue === expectedValue;
      });
    };
  }

  initChartEventListeners() {
    let selectedSectors: string[] = [];
  
    const handleChartClick = (path: string[], event: any) => {
      const pathString = path.join('|');
      const isSectorSelected = selectedSectors.includes(pathString);
  
      if (this.onClick === 'Filter') {
        this.handleDataframeFiltering(path, this.dataFrame);
        return;
      }

      const isMultiSelect = event.event.shiftKey || event.event.ctrlKey || event.event.metaKey;
      if (isMultiSelect) {
        if (isSectorSelected) {
          selectedSectors = selectedSectors.filter((sector) => sector !== pathString);
        } else {
          selectedSectors.push(pathString);
        }
      }
  
      this.handleDataframeSelection(path, event);
    };
  
    const showTooltip = async (params: any) => {
      const ancestors = params.treeAncestors
        .filter((item: any) => item.name)
        .map((item: any) => item.name);
    
      const div = ui.divH([]);
      let firstAncestor = true;
    
      for (let i = 0; i < ancestors.length; i++) {
        const ancestor = ancestors[i];
        const isStructure = this.dataFrame.col(this.hierarchyColumnNames[i - 1])?.semType === DG.SEMTYPE.MOLECULE;
        if (isStructure) {
          const image = await TreeUtils.getMoleculeImage(ancestor, 150, 100);
          if (image) {
            const { width, height } = image;
            const pixels = image.getContext('2d')!.getImageData(0, 0, width, height).data;
            if (pixels.some((_, i) => i % 4 === 3 && pixels[i] !== 0)) {
              div.appendChild(image);
            }
          }
        } else {
          if (!firstAncestor) {
            div.append(ui.divText('.'));
          }
          div.append(ui.divText(ancestor));
          firstAncestor = false;
        }
      }
      const resultDiv = ui.divV([div, ui.divText(params.value, { style: { fontWeight: 'bold' } })]);
      const {x, y} = params.event.event;
      if (x && y)
        ui.tooltip.show(resultDiv, x, y);
    };    
  
    const handleZrClick = (params: any) => {
      const targetPath = this.getTargetPath(params);

      if (targetPath) {
        handleChartClick(targetPath.split(' ||| '), params);
        this.handleTreeClick(targetPath, this.selectedRowsColor);
        this.clickedPath = targetPath;
      }
    };

    const handleZrHover = (params: any) => {
      if (!this.showMouseOverLine) return;
      const targetPath = this.getTargetPath(params);

      if (targetPath && targetPath !== this.clickedPath) {
        this.hoveredPath = targetPath;
        this.paintBranchByPath(targetPath, this.mouseOverLineColor);
      }
    };

    const handleZrMouseOut = () => {
      if (this.hoveredPath) {
        this.cleanTree([this.hoveredPath]);
        this.hoveredPath = null;

        if (this.clickedPath)
          this.paintBranchByPath(this.clickedPath);
      }
    };
  
    this.chart.on('mouseover', showTooltip);
    this.chart.on('mouseout', () => ui.tooltip.hide());
    this.chart.on('click', (params: any) => {
      if (params.componentType === 'series')
        params.data.collapsed = !params.data.collapsed;
    });
    this.chart.getZr().on('click', handleZrClick);
    this.chart.getZr().on('mouseover', handleZrHover);
    this.chart.getZr().on('mouseout', handleZrMouseOut);
  }

  private getTargetPath(params: any): string | undefined {
    if (!params.target) return;
  
    //@ts-ignore
    const sortedChildren = params.target.parent._children.sort((a, b) => a.id - b.id);
    const targetIndex = sortedChildren.findIndex((child: { id: number }) => child && child.id === params.target.id);
    const nextElement = sortedChildren[targetIndex - 1];
  
    if (!nextElement) return;
  
    //@ts-ignore
    const seriesModel = this.chart.getModel().getSeriesByIndex(0);
    const itemGraphics = seriesModel.getData()._graphicEls.slice(1);
    const itemIds = seriesModel.getData()._idList.slice(1);
  
    const idx = itemGraphics.findIndex((item: any) => item && nextElement && item.id === nextElement.id);
    let name = itemIds[idx];
    if (name === "") name = " ";
  
    if (name) {
      const seriesData = this.chart.getOption()?.series?.[0]?.data ?? [];
      const targetPath = this.findByPathOccurrenceUsingStrings(seriesData, name);
      return targetPath;
    }
  
    return undefined;
  }  

  findByPathOccurrenceUsingStrings(arr: any[], targetOccurrence: string): string | undefined {
    const pathOccurrences: string[] = [];
  
    const flattenTree = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.path !== null) pathOccurrences.push(node.path === "" ? " " : node.path);
        if (node.children?.length) flattenTree(node.children);
      }
    };
  
    flattenTree(arr);
  
    const occurrenceRegex = /^(.*?)(?:__ec__(\d+))?$/s;
    const match = targetOccurrence.match(occurrenceRegex);
  
    if (!match) return undefined;
  
    let [_, basePath, occurrenceStr] = match;
    if (basePath === "") basePath = " ";
    const targetIndex = occurrenceStr ? parseInt(occurrenceStr, 10) : 1;
    let currentCount = 0;
  
    for (const path of pathOccurrences) {
      if (path.endsWith(basePath)) {
        currentCount++;
        if (currentCount === targetIndex) return path;
      }
    }
    return undefined;
  }

  handleTreeClick(pathString: string, color?: number): void {
    this.cleanTree([this.clickedPath!]);
    this.paintBranchByPath(pathString, color);
  }
  
  paintBranchByPath(paths: string | string[], color: number | null = null, selection: SelectionData | null = null): void {
    const hoverStyle = {
      lineStyle: { color: DG.Color.toHtml(color ?? this.selectedRowsColor) },
      itemStyle: { color: DG.Color.toHtml(color ?? this.selectedRowsColor) },
    };

    const pathsArray = Array.isArray(paths) ? paths : [paths];
  
    const updatedData = this.buildSeriesConfig(pathsArray, hoverStyle, null, selection);
    if (updatedData) {
      const updatedOption = {
        ...this.chart.getOption(),
        series: [
          {
            ...this.chart.getOption()?.series![0],
            data: [updatedData],
          },
        ],
      };

      this.chart.setOption(updatedOption, false, true);
    }
  }  

  cleanTree(path: string[]): void {
    const originalTree = this.chart!.getOption()?.series?.[0]?.data?.[0];
    if (!originalTree) return;

    const hoverStyle = {
      lineStyle: {},
      itemStyle: {},
    };

    const updatedTree = this.buildSeriesConfig(path, hoverStyle, originalTree);
    const updatedOption = {
      ...this.chart!.getOption(),
      series: [{ ...this.chart!.getOption()?.series?.[0], data: [updatedTree] }],
    };

    //@ts-ignore
    this.chart.setOption(updatedOption, false, true);
  }
  
  buildSeriesConfig(paths: string[], hoverStyle: any, option: any | null = null, selection: SelectionData | null = null): any {
    const originalTree = option ?? this.chart!.getOption()?.series?.[0]?.data?.[0];
    if (!originalTree) return undefined;
    const cloneTree = echarts.util.clone(originalTree);
    
    const applyHoverStyle = (node: any) => {
      if (node.path !== null) {
        const nodePath = `All ||| ${node.path}`;
        const pathsSet = new Set(paths.map((path) => `All ||| ${path}`));
        const nodePathParts = nodePath.split('|||').map((p: string) => p.trim());
        
        const isMatch = Array.from(pathsSet).some((path) => {
          const pathParts = path.split('|||').map((p: string) => p.trim());
          return (
            nodePathParts.every((part, index) => pathParts[index] === part) ||
            pathParts.every((part, index) => nodePathParts[index] === part)
          );          
        });

        if (isMatch) {
          if (selection) {
            const countsMatch = selection[node.path] === node.value;
            hoverStyle = { ...hoverStyle, lineStyle: { ...hoverStyle.lineStyle, type: countsMatch ? null : 'dashed' } };
          }
          Object.assign(node, hoverStyle);
        }
      }
      if (node.children) node.children.forEach(applyHoverStyle);
    };
    
    applyHoverStyle(cloneTree);
    return cloneTree;
  }

  setChartOption() {
    const chartOption = this.chart.getOption();
    if (chartOption && chartOption.series && chartOption.series[0]) {
      this.option = chartOption;
    }
  }  

  onPropertyChanged(p: DG.Property | null, render: boolean = true) {
    if (!p) return;
  
    this.setChartOption();

    const { name } = p;

    switch (name) {
      case 'layout':
        const layout: layoutType = p.get(this);
        this.option.series[0].layout = layout;
  
        if (layout === 'orthogonal') {
          this.option.series[0].label.rotate = this.labelRotate;
        } else {
          delete this.option.series[0].label.rotate;
        }
        this.render();
        return;
  
      case 'table':
        this.updateTable();
        this.onTableAttached();
        this.render(false);
        break;
  
      case 'onClick':
        this.rowSource = rowSourceMap[this.onClick as onClickOptions] || this.rowSource;
        break;
  
      case 'hierarchyColumnNames':
        this.chart.clear();
        this.render(false);
        break;
  
      case 'colorColumnName':
      case 'colorAggrType':
        this.applyColorAggr = this.shouldApplyAggregation(this.colorColumnName, this.colorAggrType);
        this.render();
        break;
  
      case 'sizeColumnName':
      case 'sizeAggrType':
        this.applySizeAggr = this.shouldApplyAggregation(this.sizeColumnName, this.sizeAggrType);
        this.render();
        break;
  
      case 'fontSize':
        this.option.series[0].label.fontSize = p.get(this);
        this.option.series[0].leaves.label.fontSize = p.get(this);
        this.render();
        break;
  
      case 'orient':
      case 'labelRotate':
        if (name === 'orient') this.option.series[0].orient = p.get(this);
        this.updateOrient();
        this.render();
        break;  
  
      case 'initialTreeDepth':
        this.option.series[0].initialTreeDepth = p.get(this);
        this.render(false);

      case 'symbolSize':
        this.option.series[0].symbolSize = p.get(this);
        this.render();
        break;

      case 'showCounts':
      case 'includeNulls':
        this.render();
        break;

      case 'showMouseOverLine':
      case 'mouseOverLineColor':
        break;

      case 'selectedRowsColor':
        if (this.clickedPath)
          this.paintBranchByPath(this.clickedPath, this.selectedRowsColor);
        if (this.selectedPaths)
          this.handleSelectionChange(true);
        break;
  
      default:
        super.onPropertyChanged(p, render);
        break;
    }
  }  

  updateOrient() {
    const defaultLabelOptions = (position: string, align: string, rotate: number) => ({
      position,
      verticalAlign: 'middle',
      align,
      rotate,
      fontSize: this.fontSize,
    });
  
    const orientations = {
      LR: {
        label: defaultLabelOptions('left', 'right', this.labelRotate),
        leavesLabel: defaultLabelOptions('right', 'left', this.labelRotate),
      },
      RL: {
        label: defaultLabelOptions('right', 'left', this.labelRotate),
        leavesLabel: defaultLabelOptions('left', 'right', this.labelRotate),
      },
      BT: {
        label: defaultLabelOptions('bottom', 'right', this.labelRotate),
        leavesLabel: defaultLabelOptions('top', 'left', this.labelRotate),
      },
      TB: {
        label: defaultLabelOptions('top', 'right', -this.labelRotate),
        leavesLabel: defaultLabelOptions('bottom', 'left', -this.labelRotate),
      },
    };
  
    const { label, leavesLabel } = orientations[this.orient] || {};
    if (label && leavesLabel) {
      this.option.series[0].label = label;
      this.option.series[0].leaves.label = leavesLabel;
    }
  }    

  shouldApplyAggregation(columnName: string, aggrType: string): boolean {
    const column = this.dataFrame.col(columnName);
    if (!column) return false;
    return aggregationMap.get(column.type)?.includes(aggrType)!;
  }

  _testColumns() {
    return this.dataFrame.columns.length >= 1;
  }

  addParentPaths(data: SelectionData): SelectionData {
    const result: SelectionData = { ...data };
  
    for (const path in data) {
      const count = data[path];
      const parts = path.split(" ||| ");

      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join(" ||| ");
        result[parentPath] = (result[parentPath] || 0) + count;
      }
    }
  
    return result;
  }

  addSubs() {
    if (!this.dataFrame) return;
    this.subs.push(this.dataFrame.onColumnsRemoved.subscribe((data) => {
      const columnNamesToRemove = data.columns.map((column: DG.Column) => column.name);
      this.hierarchyColumnNames = this.hierarchyColumnNames.filter((columnName) => !columnNamesToRemove.includes(columnName));
      this.setChartOption();
      this.render();
    }));
    this.subs.push(ui.onSizeChanged(this.root).subscribe((_) => {
      requestAnimationFrame(() => this.chart?.resize());
    }));
    this.subs.push(grok.events.onResetFilterRequest.subscribe(() => this.handleReset()));
    this.subs.push(this.dataFrame.selection.onChanged.subscribe(() => {
      this.handleSelectionChange();
    }));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape")
        this.handleReset();
    });
  }

  handleReset(): void {
    if (this.clickedPath) {
      this.cleanTree([this.clickedPath]);
      this.clickedPath = null;
    }
  }

  handleSelectionChange(changedProp: boolean = false): void {
    this.setChartOption();
    
    if (this.selectedPaths && !changedProp) {
      this.cleanTree(this.selectedPaths!);
    }
  
    const treeData = this.getSelectionData();
    const dict = this.addParentPaths(treeData);
    this.selectedPaths = Object.keys(treeData);
    this.paintBranchByPath(Object.keys(treeData), null, dict);
  }

  getSelectionData(): SelectionData {
    const selectionBuilder = this.dataFrame
      .groupBy(this.eligibleHierarchyNames)
      .count()
      .whereRowMask(this.dataFrame.selection);
    const selectionAggregated = selectionBuilder.aggregate();
    
    const treeData: SelectionData = {};
    for (let i = 0; i < selectionAggregated.rowCount; ++i) {
      const path = selectionAggregated.columns.byNames(this.eligibleHierarchyNames)
        .map((col) => col.getString(i))
        .join(' ||| ');
      treeData[path] = selectionAggregated.columns.byName('count').get(i);
    }
    return treeData;
  }

  onTableAttached() {
    const categoricalColumns = [...this.dataFrame.columns.categorical].sort((col1, col2) =>
      col1.categories.length - col2.categories.length || col1.name.localeCompare(col2.name)
    );    

    if (categoricalColumns.length < 1)
      return;
    
    this.hierarchyColumnNames = categoricalColumns.slice(0, 3).map((col) => col.name);
    this.sizeColumnName = '';
    this.colorColumnName = '';

    super.onTableAttached();
    this.addSubs();
    this.initChartEventListeners();
    this.helpUrl = 'https://datagrok.ai/help/visualize/viewers/tree';
  }

  colorCodeTree(data: TreeDataType): void {
    const min = data['color-meta']['min'];
    const max = data['color-meta']['max'];
    const setItemStyle = (data: TreeDataType) => {
      const safeMin = isFinite(min) && !isNaN(min) ? min : 0;
      const safeMax = isFinite(max) && !isNaN(max) ? max : 0;

      const nodeColor = DG.Color.toRgb(DG.Color.scaleColor(data.color, safeMin, safeMax));
      data.itemStyle = data.itemStyle ?? {};
      data.itemStyle.color = data.itemStyle.color === this.selectionColor ? this.selectionColor : nodeColor;
      if (data.children)
        data.children.forEach((child) => setItemStyle(child));
    };
    setItemStyle(data);
  }

  async getSeriesData() {
    const aggregations = [];

    if (this.sizeColumnName && this.applySizeAggr)
      aggregations.push({ type: <DG.AggregationType> this.sizeAggrType,
        columnName: this.sizeColumnName, propertyName: 'size' });

    if (this.colorColumnName && this.applyColorAggr)
      aggregations.push({ type: <DG.AggregationType> this.colorAggrType,
        columnName: this.colorColumnName, propertyName: 'color' });
    return [await TreeUtils.toTree(this.dataFrame, this.eligibleHierarchyNames, this.filter, null, aggregations, true, undefined, undefined, this.includeNulls, false)];
  }

  async renderMolecule(params: any, width: number, height: number) {
    const image = await TreeUtils.getMoleculeImage(params.name, width, height);
    const img = new Image();
    img.src = image!.toDataURL('image/png');
    params.data.label = {
      show: true,
      fontSize: 0,
      formatter: '{b}',
      color: 'rgba(0,0,0,0)',
      height: height.toString(),
      width: width.toString(),
      backgroundColor: {
        image: img.src,
      },
    }
  }

  async renderMoleculeQueued(params: any, width: number, height: number) {
    this.moleculeRenderQueue = this.moleculeRenderQueue.then(() => 
      this.renderMolecule(params, width, height)
    );
    await this.moleculeRenderQueue;
  }

  formatLabel(params: any) {
    if (params.data.semType === 'Molecule') {
      //@ts-ignore
      const ItemAreaInfoArray = this.chart.getModel().getSeriesByIndex(0).getData()._itemLayouts.slice(1);
      const getCurrentItemIndex = params.dataIndex - 1;
      const ItemLayoutInfo = ItemAreaInfoArray.find((item: any, index: number) => getCurrentItemIndex === index);
      
      const { x, y } = ItemLayoutInfo;
      const isVerticalOrientation = this.isVerticalOrientation();
      
      const sortedItems = [...ItemAreaInfoArray]
        .filter((item: any) => item && (item.x !== undefined && item.y !== undefined))
        .sort((a: any, b: any) => isVerticalOrientation ? a.y - b.y : a.x - b.x);
        
      let positions: number[];
      let distances: number[];
      
      if (isVerticalOrientation) {
        positions = sortedItems.map((item: any) => item.y);
        distances = positions.slice(1).map((y: number, index: number) => y - positions[index]);
      } else {
        positions = sortedItems.map((item: any) => item.x);
        distances = positions.slice(1).map((x: number, index: number) => x - positions[index]);
      }
      
      const averageDistance = distances.length ? distances.reduce((acc, val) => acc + val, 0) / distances.length : 0;
      const chartSize = isVerticalOrientation ? this.chart.getHeight() : this.chart.getWidth();
      const tolerance = Math.max(20, Math.min(averageDistance, chartSize * 0.05));
      
      const sortedPositions = [...new Set(positions)];
      const nodesAtLevel = sortedItems.filter((item: any) => Math.abs(isVerticalOrientation ? item.y - y : item.x - x) <= tolerance);
      
      const index = sortedPositions.indexOf(isVerticalOrientation ? y : x);
      const availableSpace = (index === 0)
        ? (sortedPositions[1] - sortedPositions[0])
        : (index === sortedPositions.length - 1)
        ? (chartSize - sortedPositions[index])
        : (sortedPositions[index + 1] - sortedPositions[index - 1]) / 2;
        
      const labelHeight = Math.floor(chartSize / nodesAtLevel.length);
      const minImageWidth = 70;
      const minImageHeight = 80;

      if (availableSpace >= minImageWidth && labelHeight >= minImageHeight) {
        const scaleByWidth = availableSpace / minImageWidth;
        const scaleByHeight = labelHeight / minImageHeight;
        const scale = Math.min(scaleByWidth, scaleByHeight);

        const renderWidth = Math.max(minImageWidth, minImageWidth * scale);
        const renderHeight = Math.max(minImageHeight, minImageHeight * scale);

        this.renderMoleculeQueued(params, renderWidth, renderHeight);
        return ' ';
      }
      return ' ';
    }
    let labelText = this.showCounts ? `${params.name}: ${params.value}` : `${params.name}`;
    return labelText;
  }

  isVerticalOrientation() {
    return this.orient === 'BT' || this.orient === 'TB';
  }

  syncCollapsedValues(newData: any, existingData: any) {
    const pathMap = new Map<string, any>();

    (function traverse(node: any) {
        if (!node) return;
        if (node.path !== null) pathMap.set(node.path, node);
        node.children?.forEach(traverse);
    })(existingData[0]);

    (function update(node: any) {
        if (node.path !== null && pathMap.has(node.path)) {
            node.collapsed = pathMap.get(node.path).collapsed;
        }
        node.children?.forEach(update);
    })(newData[0]);
  }

  updateCollapsedState(data: TreeDataType[]) {
    const { initialTreeDepth } = this;
  
    const traverse = (node: TreeDataType, depth: number) => {
      node.collapsed = depth > initialTreeDepth;
      node.children?.length && node.children.forEach(child => traverse(child, depth + 1));
    };
  
    data.forEach(rootNode => traverse(rootNode, 1));
  }  

  detach() {
    for (const sub of this.subs)
      sub.unsubscribe();
    super.detach();
  }

  render(preserveCollapsed: boolean = true): void {
    this.renderQueue = this.renderQueue
      .then(() => this._render(preserveCollapsed));
  }

  async _render(preserveCollapsed: boolean = true) {
    if (!this.dataFrame)
      return;

    if (this.filter.trueCount >= CATEGORIES_NUMBER) {
      this.eligibleHierarchyNames = this.hierarchyColumnNames.filter(
        (name) => this.dataFrame.getCol(name).categories.length <= CATEGORIES_NUMBER,
      );
    } else {
      this.eligibleHierarchyNames = this.hierarchyColumnNames;
    }

    if (this.eligibleHierarchyNames == null || this.eligibleHierarchyNames.length === 0)
      return;

    const data = await this.getSeriesData();
    this.updateCollapsedState(data);
    const existingData = this.option.series[0].data || [];
    
    if (preserveCollapsed)
      this.syncCollapsedValues(data, existingData);

    Object.assign(this.option.series[0], {
      data
    });

    this.option.series[0]['symbolSize'] = this.sizeColumnName && this.applySizeAggr ?
      (value: number, params: {[key: string]: any}) => utils.data.mapToRange(
        params.data.size, this.option.series[0].data[0]['size-meta']['min'],
        this.option.series[0].data[0]['size-meta']['max'], ...this.symbolSizeRange) : this.symbolSize;
    if (this.colorColumnName && this.applyColorAggr)
      this.colorCodeTree(this.option.series[0].data[0]);

    if (this.chart) {
      this.chart.clear();
      this.chart.dispose();
      this.detach();
      this.chart = null;
    }
    
    this.chart = echarts.init(this.root);
    this.initChartEventListeners();
    this.addSubs();

    this.option.series[0].label.formatter = (params: any) => this.formatLabel(params);
    this.chart.setOption(this.option, false, true);

    if (this.clickedPath)
      this.paintBranchByPath(this.clickedPath, this.selectedRowsColor);
    if (this.selectedPaths)
      this.handleSelectionChange(true);
  }
}

type layoutType = 'orthogonal' | 'radial';
type orientation = 'LR' | 'RL' | 'TB' | 'BT';
type symbolType = 'circle' | 'emptyCircle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
type SelectionData = {
  [path: string]: number;
};