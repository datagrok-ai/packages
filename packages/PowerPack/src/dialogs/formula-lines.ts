import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {delay} from '@datagrok-libraries/utils/src/test';

/** Formula Line types */
const enum ITEM_TYPE {
  LINE = 'line',
  BAND = 'band',
}

/** Formula Line captions */
const enum ITEM_CAPTION {
  LINE = 'Line',
  BAND = 'Band',
  CONST_LINE = 'Constant line',
  VERT_LINE = 'Line - Vertical',
  HORZ_LINE = 'Line - Horizontal',
  HORZ_BAND = 'Band - Horizontal',
  VERT_BAND = 'Band - Vertical',
}

const enum ITEM_ORIENTATION {
    VERTICAL = 'Vertical',
    HORIZONTAL = 'Horizontal',
    NONE = '',
};

/** Formula Line sources */
const enum ITEM_SOURCE {
  VIEWER = 'Viewer',
  DATAFRAME = 'DataFrame',
}

const enum BTN_CAPTION {
  ADD_NEW = 'Add new',
  CLONE = 'Clone',
  REMOVE = 'Remove',
  HISTORY = 'History',
  EMPTY = 'Empty',
}

export const DEFAULT_OPTIONS: EditorOptions = {
  allowEditDFLines: true,
};

const HISTORY_KEY = 'formula-lines-dialog';
const HISTORY_LENGTH = 12;

/**
 * Returns Formula Line type by its user-friendly [caption].
 * @param {ITEM_CAPTION} caption
 * @return {ITEM_TYPE}
 */
function getItemTypeByCaption(caption: string): string {
  switch (caption) {
    case ITEM_CAPTION.LINE:
    case ITEM_CAPTION.HORZ_LINE:
    case ITEM_CAPTION.VERT_LINE: return ITEM_TYPE.LINE;

    case ITEM_CAPTION.BAND:
    case ITEM_CAPTION.HORZ_BAND:
    case ITEM_CAPTION.VERT_BAND: return ITEM_TYPE.BAND;

    default: throw 'Unknown item caption.';
  }
}

/**
 * Formula Lines Host Helper.
 * Reads, storages and saves Formula Lines to the host (DataFrame and Viewer).
 */
class Host {
  dframeItems?: DG.FormulaLine[];
  viewerItems?: DG.FormulaLine[];

  _dframeHelper?: DG.FormulaLinesHelper;
  _viewerHelper?: DG.FormulaLinesHelper;

  constructor(src: DG.DataFrame | DG.Viewer) {
    if (!src)
      throw 'Source table/viewer not found.';

    if (src instanceof DG.DataFrame) {
      this._dframeHelper = src.meta.formulaLines;
      this.dframeItems = this._dframeHelper.items;
    } else {
      {
        this._viewerHelper = src.meta.formulaLines;
        {
          this.viewerItems = this._viewerHelper.items;
          if (src.dataFrame) {
            this._dframeHelper = src.dataFrame.meta.formulaLines;
            this.dframeItems = this._dframeHelper.items;
          } else
            throw 'Viewer not attached to table.';
        }
      }
    }
  }

  save() {
    if (this._dframeHelper) {
      this._dframeHelper.clear();
      this._dframeHelper.addAll(this.dframeItems!);
    }
    if (this._viewerHelper) {
      this._viewerHelper.clear();
      this._viewerHelper.addAll(this.viewerItems!);
    }
  }
}

/**
 * Table Helper for displaying and navigating Formula Lines list.
 */
class Table {
  items: DG.FormulaLine[];
  get root(): HTMLElement {return this._grid.root;}
  get currentItem(): DG.FormulaLine | null {
    return this._currentItemIdx < 0 ? null : this.items[this._currentItemIdx];
  }

  _grid: DG.Grid;
  _onItemChangedAction: Function;

  get _dataFrame(): DG.DataFrame {return this._grid.dataFrame!;}

  get _currentItemIdx(): number {return this._dataFrame.currentRowIdx;}
  set _currentItemIdx(rowIdx: number) {this._dataFrame.currentRowIdx = rowIdx;}

  /** Used to prevent onValuesChanged event when the grid changes itself */
  _notify: boolean = true;

  /** Creates "Delete" button */
  _deleteBtn(itemIdx: number): HTMLElement {
    const btn = ui.button(ui.iconFA('trash-alt'), () => {
      this.items.splice(itemIdx, 1);
      this._dataFrame.rows.removeAt(itemIdx);
      if (this._currentItemIdx > itemIdx)
        this._currentItemIdx--;
      this._onItemChangedAction(this._currentItemIdx);
    });
    btn.style.textAlign = 'center';
    btn.style.height = '20px';
    return btn;
  }

  constructor(items: DG.FormulaLine[], onItemChangedAction: Function) {
    this.items = items;
    this._onItemChangedAction = onItemChangedAction;

    const dataFrame = this.items.length > 0 ?
      DG.DataFrame.fromObjects(this.items)! :
      DG.DataFrame.fromColumns([
        DG.Column.fromList('string', 'title', []),
        DG.Column.fromList('string', 'formula', []),
        DG.Column.fromList('bool', 'visible', []),
      ]);

    /** Column for "trash" buttons */
    dataFrame.columns.addNewString(BTN_CAPTION.REMOVE);

    this._grid = DG.Grid.create(dataFrame);
    this._grid.setOptions({
      showRowHeader: false,
      showCellTooltip: false,
      showColumnTooltip: false,
      showCurrentCellOutline: false,
      showContextMenu: false,
      showEditRow: false,
    });

    this._grid.columns.setVisible(['title', 'formula', 'visible', BTN_CAPTION.REMOVE]);
    this._grid.columns.setOrder(['title', 'formula', 'visible', BTN_CAPTION.REMOVE]);

    this._grid.col('title')!.width = 120;
    this._grid.col('formula')!.width = 220;
    this._grid.col('visible')!.width = 40;

    const deleteBtnCol = this._grid.col(BTN_CAPTION.REMOVE)!;
    deleteBtnCol.width = 35;
    deleteBtnCol.cellType = 'html';

    this._grid.onCellPrepare((cell) => {
      if (cell.isColHeader)
        switch (cell.gridColumn.name) {
          case 'title': cell.customText = 'Title'; break;
          case 'formula': cell.customText = 'Formula'; break;
          case 'visible': cell.customText = 'Show'; break;
          case BTN_CAPTION.REMOVE: cell.style.textColor = 0; break;
        }
      else if (cell.isTableCell && cell.gridColumn.name === BTN_CAPTION.REMOVE)
        cell.style.element = this._deleteBtn(cell.gridRow);
    });

    this._dataFrame.onCurrentRowChanged.subscribe((_) => this._onItemChangedAction(this._currentItemIdx));

    this._dataFrame.onValuesChanged.subscribe((ed) => {
      if (!this._notify)
        return;
      if (ed.args?.indexes && ed.args.indexes.length === 1 && ed.args.indexes[0] !== -1)
        this._currentItemIdx = ed.args.indexes[0];
      const item = this.currentItem!;
      item.title = this._dataFrame.get('title', this._currentItemIdx);
      item.formula = this._dataFrame.get('formula', this._currentItemIdx);
      item.visible = this._dataFrame.get('visible', this._currentItemIdx);
      this._onItemChangedAction(this._currentItemIdx);
    });

    delay(1).then((_) => this.setFirstItemAsCurrent());
  }

  setFirstItemAsCurrent() {
    if (this.items.length > 0) {
      this._currentItemIdx = 0;
      this._onItemChangedAction(0);
    } else
      this._onItemChangedAction(-1);
  }

  update(itemIdx: number) {
    const item = this.items[itemIdx];
    this._notify = false;
    this._dataFrame.set('title', itemIdx, item.title);
    this._dataFrame.set('formula', itemIdx, item.formula);
    this._notify = true;
  }

  add(item: DG.FormulaLine) {
    this.items.unshift(item);
    this._dataFrame.rows.insertAt(0);
    this._notify = false;
    this._dataFrame.set('title', 0, item.title);
    this._dataFrame.set('formula', 0, item.formula);
    this._dataFrame.set('visible', 0, item.visible);
    this._dataFrame.set(BTN_CAPTION.REMOVE, 0, '');
    this._notify = true;
    this._currentItemIdx = 0;
  }
}

interface AxisNames {
  y?: string,
  x?: string
}

interface AxisColumns {
  y: DG.Column,
  x: DG.Column
}

export interface EditorOptions {
  allowEditDFLines: boolean,
  [propertyName: string]: any,
}

/**
 * Preview Helper for Formula Lines.
 * Scatter Plot viewer by default.
 */
class Preview {
  viewer: DG.ScatterPlotViewer | DG.Viewer<DG.ILineChartSettings>;
  dataFrame: DG.DataFrame;
  items: DG.FormulaLine[];

  /** Source Scatter Plot axes */
  _scrAxes?: AxisNames;

  set height(h: number) {this.viewer.root.style.height = `${h}px`;}
  get root(): HTMLElement {return this.viewer.root;}

  /** Returns the current columns pair of the preview Scatter Plot */
  get axisCols(): AxisColumns {
    let yColName;
    if (this.viewer.type === DG.VIEWER.LINE_CHART) {
      const yCols: string[] = (this.viewer.props as DG.ILineChartSettings).yColumnNames;
      yColName = this.dataFrame.columns.toList().find((col) => col.name != this.viewer.props.xColumnName &&
        yCols.some((n) => col.name.includes(n)))?.name;
    }
    else
      yColName = (this.viewer.props as DG.IScatterPlotSettings).yColumnName;
    return {
      y: this.dataFrame.getCol(yColName!),
      x: this.dataFrame.getCol(this.viewer.props.xColumnName),
    };
  }

  /** Sets the current axes of the preview Scatter Plot by column names */
  set _axes(names: AxisNames) {
    if (names && names.y && this.dataFrame.getCol(names.y))
      this.viewer.setOptions(this.viewer.type === DG.VIEWER.LINE_CHART ? {yColumnNames: [names.y]}: {y: names.y});
    if (names && names.x && this.dataFrame.getCol(names.x))
      this.viewer.setOptions({x: names.x});
  }

  /**
   * Extracts the axes names from the formula. If possible, adjusts the axes
   * of the formula to the axes of the original scatterplot.
   */
  _getItemAxes(item: DG.FormulaLine): AxisNames {
    const itemMeta = DG.FormulaLinesHelper.getMeta(item);
    let [previewY, previewX] = item.orientation === ITEM_ORIENTATION.VERTICAL ?
      [itemMeta.argName, itemMeta.funcName] : [itemMeta.funcName, itemMeta.argName];

    /** If the source axes exist, then we try to set similar axes */
    if (this._scrAxes) {
      [previewY, previewX] = [previewY ?? this._scrAxes.y, previewX ?? this._scrAxes.x];

      if (previewX === this._scrAxes.y || previewY === this._scrAxes.x)
        [previewY, previewX] = [previewX, previewY];

      if (previewX === previewY)
        previewY = this._scrAxes.y;
    }

    return {y: previewY, x: previewX};
  }

  constructor(items: DG.FormulaLine[], src: DG.DataFrame | DG.Viewer, onContextMenu: Function) {
    this.items = items;

    if (src instanceof DG.DataFrame)
      this.dataFrame = src;
    else if (src instanceof DG.Viewer) {
      if (src.getOptions()['type'] === DG.VIEWER.LINE_CHART) {
        this.dataFrame = new DG.DataFrame(new DG.LineChartViewer(src.dart).activeFrame!);
        const yCols: string[] = src.props.yColumnNames;
        const yCol = this.dataFrame.columns.toList()
          .find((col) => col.name != src.props.xColumnName && yCols.some((n) => col.name.includes(n)));
        this._scrAxes = {x: src.props.xColumnName, y: yCol === undefined ? src.props.xColumnName : yCol.name};
      } else if (src.getOptions()['type'] === DG.VIEWER.TRELLIS_PLOT) {
        this.dataFrame = src.dataFrame!;
        const innerLook = src.getOptions()['look'];
        this._scrAxes = {y: innerLook['yColumnName'], x: innerLook['xColumnName']};
      } else {
        this.dataFrame = src.dataFrame!;
        this._scrAxes = {y: src.props.yColumnName, x: src.props.xColumnName};
      }
    } else
      throw 'Host is not DataFrame or Viewer.';

    if (src instanceof DG.Viewer && src.getOptions()['type'] === DG.VIEWER.LINE_CHART)
      this.viewer = DG.Viewer.lineChart(this.dataFrame, {
        yAxisType: src.props.yAxisType,
        xAxisType: src.props.xAxisType,
        invertXAxis: src.props.invertXAxis,
        showDataframeFormulaLines: false,
        showViewerFormulaLines: true,
        showContextMenu: false,
        axesFollowFilter: false,
        axisFont: '11px Arial',
        legendVisibility: DG.VisibilityMode.Never,
        xAxisHeight: 25,
      });
    else {
      this.viewer = DG.Viewer.scatterPlot(this.dataFrame, {
        yAxisType: src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.SCATTER_PLOT ? src.props.yAxisType : 'linear',
        xAxisType: src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.SCATTER_PLOT ? src.props.xAxisType : 'linear',
        invertXAxis: src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.SCATTER_PLOT ? src.props.invertXAxis : false,
        invertYAxis: src instanceof DG.Viewer && src.getOptions()['type'] == DG.VIEWER.SCATTER_PLOT ?
          src.props.invertYAxis : false,
        showDataframeFormulaLines: false,
        showViewerFormulaLines: true,
        showSizeSelector: false,
        showColorSelector: false,
        showContextMenu: false,
        axesFollowFilter: false,
        showMinMaxTickmarks: false,
        showMouseOverPoint: false,
        showCurrentPoint: false,
        zoomAndFilter: 'no action',
        axisFont: '11px Arial',
        legendVisibility: DG.VisibilityMode.Never,
        xAxisHeight: 25,
      });
    }

    /**
     * Creates special context menu for preview Scatter Plot.
     * Before opening the menu, it calculates the world coordinates of the click point.
     */
    this.viewer.root.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      if (this.viewer.type === DG.VIEWER.LINE_CHART)
        return;
      const worldPoint = (this.viewer as DG.ScatterPlotViewer).screenToWorld(event.offsetX, event.offsetY);
      onContextMenu(worldPoint.y, worldPoint.x);
    });
  }

  /**
   * Shows a line with [itemIdx] index on the Scatter Plot.
   * Returns true if the rendering was successful, false otherwise.
   */
  update(itemIdx: number): boolean {
    /** If there are no lines, try to set the axes as in the original Scatter Plot. */
    if (itemIdx < 0 && this._scrAxes)
      this._axes = this._scrAxes;

    try {
      /** Duplicate the original item to display it even if it's hidden */
      const item = this.items[itemIdx];
      const previewItem = Object.assign({}, item);
      previewItem.visible = true;

      /** Trying to show the item */
      this.viewer.meta.formulaLines.clear();
      this.viewer.meta.formulaLines.add(previewItem);
      this._axes = this._getItemAxes(previewItem);
      return true;
    } catch {
      this.viewer.meta.formulaLines.clear();
      return false;
    }
  }
}

/**
 * Editor Helper for Formula Lines (form with corresponding inputs).
 */
class Editor {
  items: DG.FormulaLine[];
  get root(): HTMLElement {return this._form;}

  _form: HTMLElement;
  _dataFrame: DG.DataFrame;
  _onItemChangedAction: Function;

  /** The title must be accessible from other inputs, because it may depend on the formula */
  _ibTitle?: DG.InputBase;
  _setTitleIfEmpty(oldFormula: string, newFormula: string) {
    if ((oldFormula === (this._ibTitle!.input as HTMLInputElement).placeholder) || newFormula === this._ibTitle!.value)
      this._ibTitle!.value = newFormula;
  }

  constructor(items: DG.FormulaLine[], dataFrame: DG.DataFrame, onItemChangedAction: Function) {
    this._form = ui.form([]);
    this.items = items;
    this._dataFrame = dataFrame;
    this._onItemChangedAction = onItemChangedAction;
  }

  /** Creates and fills editor for given Formula Line */
  update(itemIdx: number) {
    const newForm = this._createForm(itemIdx);
    this._form.replaceWith(newForm);
    this._form = newForm;
  }

  _createForm(itemIdx: number): HTMLElement {
    const item = itemIdx >= 0 ? this.items[itemIdx] : {type: ITEM_TYPE.BAND};
    let caption = ITEM_CAPTION.BAND;
    let [itemY, itemX, expression] = ['', '', ''];

    if (itemIdx >= 0 && item.type != ITEM_TYPE.BAND) {
      const itemMeta = DG.FormulaLinesHelper.getMeta(item);
      [itemY, itemX, expression] = [itemMeta.funcName!, itemMeta.argName!, itemMeta.expression!];
      caption = itemX ? ITEM_CAPTION.LINE : ITEM_CAPTION.CONST_LINE;
    }

    const mainPane = ui.div([], {classes: 'ui-form', style: {marginLeft: '-20px', overflowX: 'auto'}});
    const formatPane = ui.div([], {classes: 'ui-form', style: {marginLeft: '-20px', overflowX: 'auto'}});
    const tooltipPane = ui.div([], {classes: 'ui-form', style: {marginLeft: '-20px', overflowX: 'auto'}});

    if (itemIdx >= 0) {
      /** Preparing the "Main" panel */
      mainPane.append(caption === ITEM_CAPTION.CONST_LINE ?
        this._inputConstant(itemIdx, itemY, expression) :
        this._inputFormula(itemIdx));
      if (caption === ITEM_CAPTION.BAND)
        mainPane.append(this._inputColumn2(itemIdx));

      /** Preparing the "Format" panel */
      formatPane.append(this._inputColor(itemIdx));
      formatPane.append(this._inputOpacity(itemIdx));
      if (caption != ITEM_CAPTION.BAND)
        formatPane.append(this._inputStyle(itemIdx));
      formatPane.append(this._inputRange(itemIdx));
      formatPane.append(this._inputArrange(itemIdx));

      /** Preparing the "Tooltip" panel */
      tooltipPane.append(this._inputTitle(itemIdx));
      tooltipPane.append(this._inputShowLabels(itemIdx));
      tooltipPane.append(this._inputShowDescriptionInTooltip(itemIdx));
      tooltipPane.append(this._inputDescription(itemIdx));
    }

    /** Creating the accordion */
    const combinedPanels = ui.accordion();
    combinedPanels.addPane(itemIdx >= 0 ? caption : ITEM_CAPTION.LINE, () => mainPane, true);
    combinedPanels.addPane('Format', () => formatPane, true);
    combinedPanels.addPane('Tooltip', () => tooltipPane, true);

    return ui.div([combinedPanels.root]);
  }

  /** Creates textarea for item formula */
  _inputFormula(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibFormula = ui.input.textArea('', {value: item.formula ?? '',
      onValueChanged: (value) => {
        const oldFormula = item.formula!;
        item.formula = value;
        const resultOk = this._onItemChangedAction(itemIdx);
        elFormula.classList.toggle('d4-forced-invalid', !resultOk);
        this._setTitleIfEmpty(oldFormula, item.formula);
      }});

    const elFormula = ibFormula.input as HTMLInputElement;
    elFormula.placeholder = 'Formula';
    //elFormula.setAttribute('style', 'width: 360px; height: 60px; margin-right: -6px;');
    elFormula.setAttribute('style', 'height: 60px;');

    ui.tools.initFormulaAccelerators(ibFormula, this._dataFrame);

    return ibFormula.root;
  }

  /** Creates color picker for item color */
  _inputColor(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibColor = ui.input.color('Color', {value: item.color ?? '#000000',
      onValueChanged: (value) => {
        item.color = value;
        this._onItemChangedAction(itemIdx);
      }});

    const elColor = ibColor.input as HTMLInputElement;
    elColor.placeholder = '#000000';
    // elColor.setAttribute('style', 'width: 204px; max-width: none;');

    return ui.divH([ibColor.root]);
  }

  /** Creates range slider for item opacity */
  _inputOpacity(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const elOpacity = ui.element('input');
    elOpacity.type = 'range';
    elOpacity.min = 0;
    elOpacity.max = 100;
    elOpacity.value = item.opacity ?? 100;
    elOpacity.addEventListener('input', () => {
      item.opacity = parseInt(elOpacity.value);
      this._onItemChangedAction(itemIdx);
    });
    // elOpacity.setAttribute('style', 'width: 204px; margin-top: 6px; margin-left: 0px;');
    elOpacity.setAttribute('style', 'margin-top: 6px; width: 100%;');

    const label = ui.label('Opacity', 'ui-label ui-input-label');

    return ui.divH([ui.div([label, elOpacity], 'ui-input-root')]);
  }

  /** Creates combobox for item line style and text input for item width */
  _inputStyle(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibStyle = ui.input.choice('Style', {value: item.style ?? 'solid',
      items: ['solid', 'dotted', 'dashed', 'longdash', 'dotdash'], onValueChanged: (value) => {
        item.style = value;
        this._onItemChangedAction(itemIdx);
      }});

    const elStyle = ibStyle.input as HTMLInputElement;
    //elStyle.style.width = '135px';

    const ibWidth = ui.input.int('', {value: item.width ?? 1,
      onValueChanged: (value) => {
        item.width = value;
        this._onItemChangedAction(itemIdx);
      }});
    ibWidth.addPostfix('px');

    const elWidth = ibWidth.input as HTMLInputElement;
    elWidth.placeholder = '1';
    elWidth.setAttribute('style', 'width: 61px; padding-right: 24px;');

    // const unit = ui.divText('px', {style: {marginTop: '10px', marginLeft: '-24px', zIndex: '1000'} });

    return ui.divH([ibStyle.root, ibWidth.root]);
  }

  /** Creates text inputs for min-max values of item */
  _inputRange(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibMin = ui.input.string('Range', {value: `${item.min ?? ''}`,
      onValueChanged: (value) => {
        item.min = value.length === 0 ? undefined : Number(value);
        this._onItemChangedAction(itemIdx);
      }});

    const elMin = ibMin.input as HTMLInputElement;
    elMin.placeholder = 'min';
    elMin.setAttribute('style', 'width: 98px;');

    const ibMax = ui.input.string('', {value: `${item.max ?? ''}`,
      onValueChanged: (value) => {
        item.max = value.length === 0 ? undefined : Number(value);
        this._onItemChangedAction(itemIdx);
      }});

    const elMax = ibMax.input as HTMLInputElement;
    elMax.placeholder = 'max';
    elMax.setAttribute('style', 'width: 98px;');

    return ui.divH([ibMin.root, ibMax.root]);
  }

  /** Creates combobox for item position (z-index) */
  _inputArrange(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibArrange = ui.input.choice('Arrange', {
      value: item.zIndex && item.zIndex > 0 ? 'above markers' : 'below markers', items: ['above markers', 'below markers'],
      onValueChanged: (value) => {
        item.zIndex = value === 'above markers' ? 100 : -100;
        this._onItemChangedAction(itemIdx);
      }});

    const elArrange = ibArrange.input as HTMLInputElement;
    elArrange.setAttribute('style', 'width: 204px; max-width: none;');

    return ui.divH([ibArrange.root]);
  }

  /** Creates text input for item title */
  _inputTitle(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    function formTitleValue(value: string) {
      if (value === '' || value === item.formula) {
        elTitle.placeholder = item.formula!;
        elTitle.value = '';
        return item.formula!;
      }
      elTitle.placeholder = '';
      return value;
    }

    this._ibTitle = ui.input.string('Title', {value: item.title ?? '',
      onValueChanged: (value) => {
        item.title = formTitleValue(value);
        this._onItemChangedAction(itemIdx);
      }});

    const elTitle = this._ibTitle.input as HTMLInputElement;
    elTitle.setAttribute('style', 'width: 204px; max-width: none;');
    formTitleValue(elTitle.value);

    return ui.divH([this._ibTitle.root]);
  }

  /** Creates show on plot bool */
  _inputShowLabels(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const iShowLabels = ui.input.bool('Show on plot', {value: item.showOnPlot ?? true,
      onValueChanged: (value) => {
        item.showOnPlot = value;
        this._onItemChangedAction(itemIdx);
      }});


    return iShowLabels.root;
  }

  /** Creates show on plot bool */
  _inputShowDescriptionInTooltip(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const iShowLabels = ui.input.bool('Show on tooltip', {value: item.showOnTooltip ?? true,
      onValueChanged: (value) => {
        item.showOnTooltip = value;
        this._onItemChangedAction(itemIdx);
      }});


    return iShowLabels.root;
  }

  /** Creates textarea for item description */
  _inputDescription(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    const ibDescription = ui.input.textArea('Description', {value: item.description ?? '',
      onValueChanged: (value) => {
        item.description = value;
        this._onItemChangedAction(itemIdx);
      }});

    const elDescription = ibDescription.input as HTMLInputElement;
    elDescription.setAttribute('style',
      'height: 40px; font-family: inherit; font-size: inherit;');
    // 'width: 194px; height: 40px; padding-left: 6px; margin-right: -8px; font-family: inherit; font-size: inherit;');

    return ibDescription.root;
  }

  /** Creates column input for band second column */
  _inputColumn2(itemIdx: number): HTMLElement {
    const item = this.items[itemIdx];

    //@ts-ignore
    const ibColumn2 = ui.input.column('Adjacent column', {table: this._dataFrame, value: item.column2 ? this._dataFrame.col(item.column2) : null,
      onValueChanged: (value) => {
        item.column2 = value.name;
        this._onItemChangedAction(itemIdx);
      }});

    const elColumn2 = ibColumn2.input as HTMLInputElement;
    //elColumn2.setAttribute('style', 'width: 204px; max-width: none;');

    return ui.divH([ibColumn2.root]);
  }

  /** Creates column input and text input for constant item */
  _inputConstant(itemIdx: number, colName: string, value: string): HTMLElement {
    const item = this.items[itemIdx];

    //@ts-ignore
    const ibColumn = ui.input.column('Column', {table: this._dataFrame, value: colName ? this._dataFrame.col(colName) : null,
      onValueChanged: (value) => {
        const oldFormula = item.formula!;
        item.formula = '${' + value + '} = ' + ibValue.value;
        this._onItemChangedAction(itemIdx);
        this._setTitleIfEmpty(oldFormula, item.formula);
      }});

    const elColumn = ibColumn.input as HTMLInputElement;
    //elColumn.setAttribute('style', 'width: 204px; max-width: none; margin-right: -10px;');

    const ibValue = ui.input.string('Value', {value: value, onValueChanged: (value) => {
      const oldFormula = item.formula!;
      item.formula = '${' + ibColumn.value + '} = ' + value;
      this._onItemChangedAction(itemIdx);
      this._setTitleIfEmpty(oldFormula, item.formula);
    }});
    ibValue.nullable = false;

    const elValue = ibValue.input as HTMLInputElement;
    //elValue.setAttribute('style', 'width: 204px; max-width: none; margin-right: -10px;');

    return ui.div([ibColumn.root, ibValue.root], 'ui-form');
  }
}

/**
 * Helper that implements the logic of creating a Formula Line item of a given type.
 */
class CreationControl {
  popupMenu: Function;        // Opens a popup menu with predefined new Formula Line item types
  _getCols: Function;         // Used to create constant lines passing through the mouse click point on the Scatter Plot
  _getCurrentItem: Function;  // Used to create clone

  /** Items for History menu group */
  _historyItems: DG.FormulaLine[];           // Stores session history
  _justCreatedItems: DG.FormulaLine[] = [];  // Stores history of the currently open dialog

  _loadHistory(): DG.FormulaLine[] {return localStorage[HISTORY_KEY] ? JSON.parse(localStorage[HISTORY_KEY]) : [];}

  saveHistory() {
    /** Remove duplicates from just created items (formula comparison) */
    this._justCreatedItems = this._justCreatedItems.filter((val, ind, arr) =>
      arr.findIndex((t) => (t.formula === val.formula) ) === ind);

    /** Remove identical older items from history */
    this._historyItems = this._historyItems.filter((arr) =>
      !this._justCreatedItems.find((val) => (val.formula === arr.formula)));

    const newHistoryItems = this._justCreatedItems.concat(this._historyItems);
    newHistoryItems.splice(HISTORY_LENGTH);

    localStorage[HISTORY_KEY] = JSON.stringify(newHistoryItems);
  }

  /** Creates a button and binds an item creation menu to it */
  get button(): HTMLElement {
    const btn = ui.bigButton(BTN_CAPTION.ADD_NEW, this.popupMenu);
    return ui.div([btn], {style: {width: '100%', textAlign: 'right'}});
  }

  constructor(getCols: Function, getCurrentItem: Function, onItemCreatedAction: Function) {
    this._getCols = getCols;
    this._getCurrentItem = getCurrentItem;
    this._historyItems = this._loadHistory();

    this.popupMenu = (valY?: number, valX?: number) => {
      const onClickAction = (itemCaption: string) => {
        const cols: AxisColumns = this._getCols();
        const colY = cols.y;
        const colX = cols.x;
        let item: DG.FormulaLine = {};

        /** Fill the item with the necessary data */
        switch (itemCaption) {
          case ITEM_CAPTION.LINE:
            item.formula = '${' + colY.name + '} = ${' + colX.name + '}';
            break;

          case ITEM_CAPTION.VERT_LINE:
            const vertVal = (valX ?? colX.stats.q2).toFixed(1);
            item.orientation = ITEM_ORIENTATION.VERTICAL;
            item.formula = '${' + colX.name + '} = ' + vertVal;
            break;

          case ITEM_CAPTION.HORZ_LINE:
            const horzVal = (valY ?? colY.stats.q2).toFixed(1);
            item.orientation = ITEM_ORIENTATION.HORIZONTAL;
            item.formula = '${' + colY.name + '} = ' + horzVal;
            break;

          case ITEM_CAPTION.VERT_BAND:
            const left = colX.stats.q1.toFixed(1);
            const right = colX.stats.q3.toFixed(1);
            item.formula = '${' + colX.name + '} in(' + left + ', ' + right + ')';
            item.orientation = ITEM_ORIENTATION.VERTICAL;
            item.column2 = colY.name;
            break;

          case ITEM_CAPTION.HORZ_BAND:
            const bottom = colY.stats.q1.toFixed(1);
            const top = colY.stats.q3.toFixed(1);
            item.formula = '${' + colY.name + '} in(' + bottom + ', ' + top + ')';
            item.orientation = ITEM_ORIENTATION.HORIZONTAL;
            item.column2 = colX.name;
            break;

          case BTN_CAPTION.CLONE:
            item = this._getCurrentItem();
            break;
        }

        item.type ??= getItemTypeByCaption(itemCaption);
        item = DG.FormulaLinesHelper.setDefaults(item);

        this._justCreatedItems.unshift(item);

        /** Update the Table, Preview and Editor states */
        onItemCreatedAction(item);
      };

      /** Construct popup menu */
      const menu = DG.Menu.popup().items([
        ITEM_CAPTION.LINE,
        ITEM_CAPTION.VERT_LINE,
        ITEM_CAPTION.HORZ_LINE,
        ITEM_CAPTION.VERT_BAND,
        ITEM_CAPTION.HORZ_BAND,
      ], onClickAction);

      /** Add separator only if other menu items exist */
      if (this._getCurrentItem() || this._historyItems.length > 0)
        menu.separator();

      /**
       * Add "Clone" menu if the current table line exists.
       * TODO: The best option is to make the menu item enabled/disabled. But there is no such API yet.
       */
      if (this._getCurrentItem())
        menu.items([BTN_CAPTION.CLONE], onClickAction);

      /**
       * Add "History" menu group.
       * TODO: The best option is to make the menu item enabled/disabled. But there is no such API yet.
       */
      if (this._historyItems.length > 0) {
        const historyGroup = menu.group(BTN_CAPTION.HISTORY);
        this._historyItems.forEach((item) => {
          historyGroup.item(item.formula!, () => {
            const newItem = Object.assign({}, item);
            this._justCreatedItems.unshift(newItem);
            onItemCreatedAction(newItem);
          });
        });
        historyGroup.endGroup();
      }

      menu.show();
    };
  }
}

/**
 * A Dialog window with Formula Lines list, preview and editor.
 */
export class FormulaLinesDialog {
  dialog: DG.Dialog = ui.dialog({
    title: 'Formula Lines',
    helpUrl: '/help/develop/how-to/show-formula-lines.md',
  });
  host: Host;
  preview: Preview;
  editor: Editor;
  viewerTable?: Table;
  dframeTable?: Table;
  creationControl: CreationControl;
  tabs: DG.TabControl;
  options: EditorOptions;

  /** Returns the Table corresponding to the current tab in the tab control */
  get _currentTable(): Table {
    return this.tabs.currentPane.name === ITEM_SOURCE.VIEWER ? this.viewerTable! : this.dframeTable!;
  }

  /** Initializes all parameters and opens the Dialog window */
  constructor(src: DG.DataFrame | DG.Viewer, options: EditorOptions = DEFAULT_OPTIONS) {
    /** Init Helpers */
    this.options = options;
    this.host = this._initHost(src);
    this.creationControl = this._initCreationControl();
    this.preview = this._initPreview(src);
    this.editor = this._initEditor();
    this.tabs = this._initTabs();

    /** Init Dialog layout */
    const layout = ui.div([
      ui.block([this.tabs.root, this.preview.root], {style: {width: '55%', paddingRight: '20px'}}),
      ui.block([this.editor.root], {style: {width: '45%'}}),
    ]);

    this.dialog
      .add(layout)
      .onOK(this._onOKAction.bind(this))
      .show({resizable: true, width: 850, height: 660});
  }

  _initHost(src: DG.DataFrame | DG.Viewer): Host {
    return new Host(src);
  }

  _initPreview(src: DG.DataFrame | DG.Viewer): Preview {
    const preview = new Preview(this.host.viewerItems! ?? this.host.dframeItems!, src, this.creationControl.popupMenu);
    preview.height = 310;
    return preview;
  }

  _initCreationControl(): CreationControl {
    return new CreationControl(
      () => this.preview.axisCols,
      () => this._currentTable.currentItem,
      (item: DG.FormulaLine) => this._onItemCreatedAction(item));
  }

  _initEditor(): Editor {
    return new Editor(this.host.viewerItems! ?? this.host.dframeItems!, this.preview.dataFrame,
      (itemIdx: number): boolean => {
        this._currentTable.update(itemIdx);
        return this.preview.update(itemIdx);
      });
  }

  _initTabs(): DG.TabControl {
    const tabs = DG.TabControl.create();
    tabs.root.style.height = '230px';

    /** Init Viewer Table (in the first tab) */
    if (this.host.viewerItems) {
      tabs.addPane(ITEM_SOURCE.VIEWER, () => {
        this.viewerTable = this._initTable(this.host.viewerItems!);
        return this.viewerTable.root;
      });
    }

    /** Init DataFrame Table (in the second tab) */
    if (this.options.allowEditDFLines && this.host.dframeItems) {
      tabs.addPane(ITEM_SOURCE.DATAFRAME, () => {
        this.dframeTable = this._initTable(this.host.dframeItems!);
        return this.dframeTable.root;
      });
    }
    // Overrides the standard component logic that hides the header containing only one tab
    tabs.header.style.removeProperty('display');


    /** Display "Add new" button */
    tabs.header.append(this.creationControl.button);

    /** Change data source when switching tabs */
    tabs.onTabChanged.subscribe((_) => {
      this.editor.items = this._currentTable.items;
      this.preview.items = this._currentTable.items;
      this._currentTable.setFirstItemAsCurrent();
    });

    return tabs;
  }

  _initTable(items: DG.FormulaLine[]): Table {
    return new Table(items,
      (itemIdx: number): boolean => {
        this.editor.update(itemIdx);
        return this.preview.update(itemIdx);
      });
  }

  _onOKAction() {
    this.host.save();
    this.creationControl.saveHistory();
  }

  _onItemCreatedAction(item: DG.FormulaLine) {
    this._currentTable.add(item);
    this.editor.update(0);
    this.preview.update(0);
  }
}
