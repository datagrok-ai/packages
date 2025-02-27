import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';

import * as echarts from 'echarts';
import 'echarts-wordcloud';

import $ from 'cash-dom';


const MAX_UNIQUE_CATEGORIES_NUMBER = 500;
const ERROR_CLASS = 'd4-viewer-error';

@grok.decorators.viewer({
  name: 'Word cloud',
  description: 'Creates a word cloud viewer',
  icon: 'icons/wordcloud-viewer.svg',
  toolbox: true,
})
export class WordCloudViewer extends DG.JsViewer {
  strColumnName: string;
  shape: string;
  minTextSize: number;
  maxTextSize: any;
  minRotationDegree: number;
  maxRotationDegree: number;
  rotationStep: number;
  gridSize: number;
  drawOutOfBound: boolean;
  fontFamily: string;
  bold: boolean;
  strColumns: DG.Column[];
  initialized: boolean;
  chart: any; //echarts.EChartsType

  constructor() {
    super();

    this.strColumnName = this.string('columnColumnName', '', { columnTypeFilter: DG.COLUMN_TYPE.STRING });

    this.shape = this.string('shape', 'circle', {
      choices: ['circle', 'diamond', 'triangle-forward', 'triangle', 'pentagon', 'star'],
    });

    this.minTextSize = this.int('minTextSize', 14);
    this.maxTextSize = this.int('maxTextSize', 100);

    this.minRotationDegree = this.int('minRotationDegree', -30);
    this.maxRotationDegree = this.int('maxRotationDegree', 30);
    this.rotationStep = this.int('rotationStep', 5, { min: 1 });

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

  _testColumns() {
    const columns = this.dataFrame.columns.toList();
    const strCols = columns.filter((col) => col.type === DG.TYPE.STRING);
    return strCols.length >= 1;
  }

  onTableAttached() {
    this.subs.push(DG.debounce(this.dataFrame.filter.onChanged, 50).subscribe((_) => this.render()));
    this.subs.push(DG.debounce(ui.onSizeChanged(this.root), 50).subscribe((_) => this.render()));

    this.init();

    const columns = this.dataFrame.columns.toList();
    this.strColumns = columns.filter((col) => col.type === DG.TYPE.STRING);

    if (this._testColumns())
      this.strColumnName = this.strColumns.filter((col) => col.categories.length <= MAX_UNIQUE_CATEGORIES_NUMBER && col.categories.length > 1)[0]?.name ?? '';

    this.render();
  }

  onPropertyChanged(property: DG.Property) {
    super.onPropertyChanged(property);
    if (this.initialized && this._testColumns()) {
      if (property.name === 'columnColumnName')
        this.strColumnName = property.get(this);

      this.render();
    }
  }

  detach() {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  _showMessage(msg: string, className: string) {
    const errorDiv = ui.divText(msg, className);
    errorDiv.style.textAlign = 'center';
    this.root.appendChild(errorDiv);
  }

  render() {
    if (!this._testColumns()) {
      this._showMessage('Not enough data to produce the result.', ERROR_CLASS);
      return;
    }
    if (!this.strColumnName || this.dataFrame.getCol(this.strColumnName).categories.length > MAX_UNIQUE_CATEGORIES_NUMBER) {
      this._showMessage('The Word cloud viewer requires categorical column with 500 or fewer unique categories', ERROR_CLASS);
      return;
    }

    $(this.root).empty();

    if (this.strColumnName === null || this.strColumnName === '')
      return;

    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = this.root.parentElement!.clientWidth - margin.left - margin.right;
    const height = this.root.parentElement!.clientHeight - margin.top - margin.bottom;
    const strColumn = this.dataFrame.getCol(this.strColumnName);
    const words = strColumn.categories;
    const data: any = []; //echarts.SeriesOption[] = [];
    const table = this.dataFrame;

    words.forEach((w) => data.push({
      name: w,
      value: strColumn.toList().filter((row) => row === w).length,
      textStyle: {
        color: DG.Color.toHtml(DG.Color.getCategoryColor(strColumn, w)),
      },
    }));

    if (this.chart !== undefined)
      this.chart.dispose();

    this.chart = echarts.init(<HTMLDivElement | HTMLCanvasElement> this.root);

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
        rotationStep: this.rotationStep,
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
      .on('mouseover', (d: any) => ui.tooltip.showRowGroup(table, (i) => {
        return d.name === strColumn.get(i);
      }, d.event.event.x + 10, d.event.event.y + 10))
      .on('mouseout', () => ui.tooltip.hide())
      .on('mousedown', (d: any) => {
        table.selection.handleClick((i) => {
          return d.name === strColumn.get(i);
        //@ts-ignore
        }, d);
      });
  }
}
