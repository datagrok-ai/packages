import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as utils from './utils';

export class TreeUtils {

  static async toTree(dataFrame: DG.DataFrame, splitByColumnNames: string[], rowMask: DG.BitSet,
    visitNode: ((arg0: TreeDataType) => void) | null = null, aggregations:
      AggregationInfo[] = [], linkSelection: boolean = true, selection?: boolean, inherit?: boolean,
      includeNulls?: boolean, markSelected: boolean = true): Promise<TreeDataType> {
    const data: TreeDataType = {
      name: 'All',
      collapsed: false,
      value: 0,
      path: null,
      label: {},
      children: [],
    };

    const builder = dataFrame
      .groupBy(splitByColumnNames)
      .count()
      .whereRowMask(rowMask);

    for (const aggregation of aggregations) {
      data[aggregation.propertyName] = utils.data.aggToStat(dataFrame, aggregation.columnName, aggregation.type);
      data[`${aggregation.propertyName}-meta`] = {};
      builder.add(aggregation.type, aggregation.columnName, aggregation.propertyName);
    }

    let aggregated = builder.aggregate();
    if (!includeNulls) {
      const colList: DG.Column[] = aggregated.columns.toList().filter((col) => splitByColumnNames.includes(col.name));
      const filter = DG.BitSet.create(aggregated.rowCount, (rowI: number) => {
        return colList.every((col) => !col.isNone(rowI));
      });
      aggregated = aggregated.clone(filter);
    }

    if (linkSelection) {
      grok.data.linkTables(dataFrame, aggregated, splitByColumnNames,
        splitByColumnNames, [DG.SYNC_TYPE.SELECTION_TO_SELECTION], true);
    }

    const countCol = aggregated.columns.byName('count');
    const columns = aggregated.columns.byNames(splitByColumnNames);
    const propNames = aggregations.map((a) => a.propertyName);
    const aggrColumns = aggregated.columns.byNames(propNames);
    const parentNodes: (TreeDataType | null)[] = columns.map((_) => null);

    const selectedPaths: string[] = [];
    const selectedNodeStyle = { color: DG.Color.toRgb(DG.Color.selectedRows) };

    const markSelectedNodes = (node: TreeDataType): boolean => {
      if (selectedPaths.includes(node.path!)) {
        node.itemStyle = selectedNodeStyle;
        node.lineStyle = selectedNodeStyle;
        return true;
      }
      if (node.children && node.children.length > 0) {
        let parentSelected = true;
        for (const child of node.children)
          parentSelected = markSelectedNodes(child) && parentSelected;

        if (parentSelected) {
          node.itemStyle = selectedNodeStyle;
          node.lineStyle = selectedNodeStyle;
          return true;
        }
      }
      return false;
    };

    function aggregateParentNodes(): void {
      const paths: {[key: string]: {[key: string]: number}} = {};
      for (let i = 1; i < columns.length; i++) {
        const builder = dataFrame
          .groupBy(splitByColumnNames.slice(0, -i))
          .whereRowMask(rowMask);
        for (const aggregation of aggregations)
          builder.add(aggregation.type, aggregation.columnName, aggregation.propertyName);
        const df = builder.aggregate();
        const rowCount = df.rowCount;
        for (let i = 0; i < rowCount; i++) {
          let path = '';
          const props: {[key: string]: number} = {};
          for (const column of df.columns) {
            if (propNames.includes(column.name))
              props[column.name] = column.get(i);
            else
              path = (path ? path + ' ||| ' : '') + column.getString(i);
          }
          paths[path] = props;
        }
      }

      function updatePropMeta(node: TreeDataType) {
        for (const prop of propNames) {
          if (!node.path) {
            data[`${prop}-meta`] = { min: Infinity, max: -Infinity };
            continue;
          }
          if (paths[node.path])
            node[prop] = node[prop] ?? paths[node.path][prop];
          if (!data[`${prop}-meta`])
            continue;
          
          const value = node[prop];
          if (!value) continue;
          data[`${prop}-meta`].min = Math.min(data[`${prop}-meta`].min, value);
          data[`${prop}-meta`].max = Math.max(data[`${prop}-meta`].max, value);
        }
        node.children?.forEach(updatePropMeta);
      }

      updatePropMeta(data);
    };

    for (let i = 0; i < aggregated.rowCount; i++) {
      const idx = i === 0 ? 0 : columns.findIndex((col) => col.get(i) !== col.get(i - 1));
      if (idx === -1)
        continue;
      const value = countCol.get(i);
      const aggrValues = aggrColumns.reduce((obj, col) =>
        (obj[col.name] = col.get(i), obj), <{ [key: string]: number }>{});

      if (aggregated.selection.get(i) && !selection)
        selectedPaths.push(columns.map((col) => col.getString(i)).join(' ||| '));

      for (let colIdx = idx; colIdx < columns.length; colIdx++) {
        const value = columns[colIdx].get(i);
        const parentNode = colIdx === 0 ? data : parentNodes[colIdx - 1];
        const name = value == null ? ' ' : value.toString();
        /**
         * ' ||| ' is used as a temporary separator because a single '|' fails 
         * to handle certain edge cases in the tree viewer.
         */
        const node: TreeDataType = {
          semType: columns[colIdx].semType,
          name: name,
          collapsed: false,
          path: parentNode?.path == null ? name : parentNode.path + ' ||| ' + name,
          value: 0,
        };

        if (value === '') {
          node.itemStyle = {
            color: '#c7c7c7'
          }
        }

        const colorCodingType = columns[colIdx].meta.colors.getType();
        if (colorCodingType !== DG.COLOR_CODING_TYPE.OFF && colorCodingType !== null && inherit) {
          node.itemStyle = {
            color: DG.Color.toHtml(columns[colIdx].meta.colors.getColor(i)),
          };
        }

        if (colIdx === columns.length - 1)
          propNames.forEach((prop) => node[prop] = aggrValues[prop]);

        parentNodes[colIdx] = node;

        if (!parentNode!.children)
          parentNode!.children = [];
        parentNode!.children.push(node);
        if (visitNode !== null)
          visitNode(node);
      }

      for (let i = 0; i < parentNodes.length; i++)
        parentNodes[i]!.value += value;
      data.value += value;
    }

    if (aggregations.length > 0)
      aggregateParentNodes();

    if (markSelected) markSelectedNodes(data);

    return data;
  }

  static async toForestAsync(dataFrame: DG.DataFrame, splitByColumnNames: string[], rowMask: DG.BitSet, selection: boolean = false, inherit: boolean = false) {
    const tree = await TreeUtils.toTree(dataFrame, splitByColumnNames, rowMask, (node) => node.value = 0, [], false, selection, inherit);
    return tree.children;
  }

  static toForest(dataFrame: DG.DataFrame, splitByColumnNames: string[], rowMask: DG.BitSet, selection: boolean = false, inherit: boolean = false) {
    return TreeUtils.toForestAsync(dataFrame, splitByColumnNames, rowMask, selection, inherit);
  }

  static async getMoleculeImage(name: string, width: number, height: number): Promise<HTMLCanvasElement> {
    const image: HTMLCanvasElement = ui.canvas();
    image.width = width;
    image.height = height;
    await grok.chem.canvasMol(0, 0, image.width, image.height, image, name);
    return image;
  }

  static mapRowsToObjects(dataFrame: DG.DataFrame, columnNames: string[],
    objectKeys: string[] | null = null): {[key: string]: any}[] {
    const columns = dataFrame.columns.byNames(columnNames);
    if (objectKeys === null)
      objectKeys = columnNames;

    const result = [];
    const rowIndexes = dataFrame.filter.getSelectedIndexes();
    for (let i = 0; i < rowIndexes.length; i++) {
      const object: {[key: string]: any} = {};
      for (let j = 0; j < columns.length; j++)
        object[objectKeys[j]] = columns[j].get(rowIndexes[i]);
      result.push(object);
    }
    return result;
  }

  /**
   * @param {String[]} columnNames
   * @param {String} path - pipe-separated values
   */
  static pathToPattern(columnNames: string[], path: string): {[key: string]: string} {
    const values = path.split(' ||| ');
    const pattern: {[key: string]: string} = {};
    for (let i = 0; i < columnNames.length; i++)
      pattern[columnNames[i]] = values[i];
    return pattern;
  }
}

export type TreeDataType = { name: string, collapsed: boolean, value: number, semType?: null | string, path?: null | string, label?: {}, children?: TreeDataType[],
  itemStyle?: { color?: string }, [prop: string]: any };
export type AggregationInfo = { type: DG.AggregationType, columnName: string, propertyName: string };
