import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import $ from 'cash-dom';


export class WordCloudViewer extends DG.JsViewer {
  strColumnName: string;
  shape: string;
  minTextSize: number;
  minRotationDegree: number;
  maxRotationDegree: number;
  roationStep: number;
  gridSize: number;
  drawOutOfBound: boolean;
  fontFamily: string;
  bold: boolean;
  strColumns: DG.Column[];
  initialized: boolean;
  chart: any; //echarts.EChartsType
  maxTextSize: any;

  constructor() {
    super();

    this.strColumnName = this.string('columnColumnName');

    this.shape = this.string('shape', 'circle', {
      choices: ['circle', 'diamond', 'triangle-forward', 'triangle', 'pentagon', 'star'],
    });

    this.minTextSize = this.int('minTextSize', 14);
    this.maxTextSize = this.int('maxTextSize', 100);

    this.minRotationDegree = this.int('minRotationDegree', -30);
    this.maxRotationDegree = this.int('maxRotationDegree', 30);
    this.roationStep = this.int('rotationStep', 5);

    this.gridSize = this.int('gridSize', 8);

    this.drawOutOfBound = this.bool('drawOutOfBound', true);

    this.fontFamily = this.string('fontFamily', 'sans-serif', { choices: ['sans-serif', 'serif', 'monospace'] });

    this.bold = this.bool('bold', true);

    this.strColumns = [];
    this.initialized = false;
  }

  init() {
    this.initialized = true;
  }

  testColumns() {
    return (this.strColumns.length >= 1);
  }

  onTableAttached() {
    this.init();

    const columns = this.dataFrame.columns.toList();
    this.strColumns = columns.filter((col) => col.type === DG.TYPE.STRING);

    if (this.testColumns()) {
      this.strColumnName = this.strColumns.reduce((prev, curr) =>
        prev.categories.length < curr.categories.length ? prev : curr).name;
    }


    this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50).subscribe((_) => this.render()));
    this.subs.push(DG.debounce(this.dataFrame.filter.onChanged, 50).subscribe((_) => this.render()));
    this.subs.push(DG.debounce(ui.onSizeChanged(this.root), 50).subscribe((_) => this.render()));

    this.render();
  }

  onPropertyChanged(property: DG.Property) {
    super.onPropertyChanged(property);
    if (this.initialized && this.testColumns()) {
      if (property.name === 'columnColumnName')
        this.strColumnName = property.get(this);

      this.render();
    }
  }

  detach() {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  render() {
    if (!this.testColumns()) {
      this.root.innerText = 'Not enough data to produce the result.';
      return;
    }

    $(this.root).empty();

    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = this.root.parentElement!.clientWidth - margin.left - margin.right;
    const height = this.root.parentElement!.clientHeight - margin.top - margin.bottom;
    const strColumn = this.dataFrame.getCol(this.strColumnName);
    const words = strColumn.categories;
    const data: echarts.SeriesOption[] = [];
    const table = this.dataFrame;

    words.forEach((w) => data.push(<echarts.SeriesOption>{
      name: w,
      value: strColumn.toList().filter((row) => row === w).length,
      textStyle: {
        color: DG.Color.toHtml(DG.Color.getCategoryColor(strColumn, w)),
      },
    }));

    if (this.chart !== undefined)
      this.chart.dispose();

    this.chart = echarts.init(this.root);

    this.chart.setOption({
      width: width + margin.left + margin.right,
      height: height + margin.top + margin.bottom,
      series: [{
        type: 'wordCloud',
        shape: this.shape,
        left: 'center',
        top: 'center',
        width: `${width}`,
        height: `${height}`,
        right: null,
        bottom: null,
        sizeRange: [this.minTextSize, this.maxTextSize],
        gridSize: this.gridSize,
        rotationRange: [this.minRotationDegree, this.maxRotationDegree],
        rotationStep: this.roationStep,
        drawOutOfBound: this.drawOutOfBound,
        textStyle: {
          fontFamily: this.fontFamily,
          fontWeight: this.bold ? 'bold' : 'normal',
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            shadowBlur: 10,
            shadowColor: '#333',
          },
        },
        data: data,
      }],
    });

    this.chart
      .on('mouseover', (d: echarts.SeriesOption) => ui.tooltip.showRowGroup(table, (i) => {
        console.log(d);
        return d.name === strColumn.get(i);
      }, 10, 10))
      .on('mouseout', () => ui.tooltip.hide())
      .on('mousedown', (d: echarts.SeriesOption) => {
        table.selection.handleClick((i) => {
          return d.name === strColumn.get(i);
        }, d);
      });
  }
}
