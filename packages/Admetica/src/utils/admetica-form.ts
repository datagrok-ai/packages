import * as ui from 'datagrok-api/ui';

import { tablePieChartIndexMap } from './admetica-utils';

export class FormStateGenerator {
  table: string;
  categories: { [s: string]: string[] };
  molColName: string;
  addPiechart: boolean = true;
  maxHeight: number;

  constructor(table: string, categories: { [s: string]: string[] }, molColName: string, addPiechart: boolean, maxHeight: number = 600) {
    this.table = table;
    this.categories = categories;
    this.molColName = molColName;
    this.addPiechart = addPiechart;
    this.maxHeight = maxHeight;
  }

  private createElementState(table: string, left: number, top: number, width: number, column: string) {
    return [
      {
        "left": left + width,
        "top": top,
        "width": 100,
        "height": 20,
        "type": "field",
        "viewerSettings": {
          "table": table,
          "column": column,
          "format": null
        }
      },
      {
        "left": left,
        "top": top,
        "width": width,
        "height": 20,
        "type": "html",
        "viewerSettings": {
          "markup": "<input type=\"text\" class=\"d4-sketch-column-name ui-input-editor\">",
          "table": table,
          "column": column,
          "input-value": column
        }
      }
    ];
  }

  private getTextWidth(text: string) {
    const canvas = ui.canvas();
    const context = canvas.getContext('2d');
    context!.font = '13px Roboto, sans-serif';
    const width = context!.measureText(text).width;

    return width + 26;
  }

  private createCategoryHeader(left: number, top: number, categoryName: string) {
    return {
      "left": left,
      "top": top,
      "width": 280,
      "height": 20,
      "type": "html",
      "viewerSettings": {
        "markup": "<input type=\"text\" class=\"d4-sketch-column-name ui-input-editor\">",
        "input-value": `                         ${categoryName}`,
        "backgroundColor": 4293717745,
        "textColor": 4278190080
      }
    };
  }

  generateFormState(containerWidth?: number) {
    const elementStates = [];
    const leftOffset = 10;
    const colWidth = 275;
    const headerHeight = 30;
    const rowHeight = 30;
    const columnGap = 70;

    let currentTopOffset = 180;
    let currentLeftOffset = leftOffset;
    let currentColsNumber = 1;
    let piechartIndex = tablePieChartIndexMap.get(this.table);

    elementStates.push(
      {
        "left": 3,
        "top": 21,
        "width": 183,
        "height": 139,
        "type": "field",
        "viewerSettings": {
          "table": this.table,
          "column": this.molColName,
          "format": null
        }
      }
    );

    if (this.addPiechart)
      elementStates.push({
        "left": 154,
        "top": 22,
        "width": 209,
        "height": 140,
        "type": "sparkline-cell",
        "viewerSettings": {
          "table": this.table,
          "column": piechartIndex === 0 ? "piechart" : `piechart (${piechartIndex})`
        }
      });

    const allColumns = Object.values(this.categories).flat();
    const longestColumnName = allColumns.reduce((longest, columnName) => columnName.length > longest.length ? columnName : longest, '');
    const textWidth = this.getTextWidth(longestColumnName);

    for (const [category, columns] of Object.entries(this.categories)) {
      const categoryHeight = headerHeight + columns.length * rowHeight;

      if (currentTopOffset + categoryHeight > this.maxHeight) {
        currentColsNumber += 1;
        if (containerWidth) {
          const exceedsContainerWidth = colWidth * currentColsNumber - leftOffset > containerWidth;
          if (!exceedsContainerWidth) {
            currentLeftOffset += colWidth + columnGap;
            currentTopOffset = 30;
          } else {
            currentColsNumber -= 1;
          }
        }
      }

      const header = this.createCategoryHeader(currentLeftOffset, currentTopOffset, category);
      elementStates.push(header);
      currentTopOffset += headerHeight;

      columns.forEach((column: string, index: number) => {
        const elementState = 
          this.createElementState(this.table, currentLeftOffset, currentTopOffset + index * rowHeight, textWidth, column);
        elementStates.push(...elementState);
      });

      currentTopOffset += columns.length * rowHeight + 10;
    }

    return {
      "#type": "SketchState",
      "elementStates": elementStates,
      "table": this.table,
      "formDesigned": true
    };
  }

  static createCategoryModelMapping(properties: any, updatedModelNames: string[]) {
    const categoryModelMapping: { [key: string]: string[] } = {};

    properties.subgroup.forEach((subgroup: { name: string; models: { name: string }[]; }) => {
      const categoryName = subgroup.name;

      const modelNames = updatedModelNames
        .filter(name => subgroup.models.some(model => name.includes(model.name)));

      if (modelNames.length > 0) {
        categoryModelMapping[categoryName] = modelNames;
      }
    });

    return categoryModelMapping;
  }
}