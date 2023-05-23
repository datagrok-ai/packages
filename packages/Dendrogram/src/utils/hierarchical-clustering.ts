import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {injectTreeForGridUI2} from '../viewers/inject-tree-for-grid2';
import {DistanceMetric, isLeaf, LinkageMethod, NodeType} from '@datagrok-libraries/bio/src/trees';
import {TreeHelper} from './tree-helper';
import {getClusterMatrixWorker} from '../wasm/clustering-worker-creator';
import {ITreeHelper} from '@datagrok-libraries/bio/src/trees/tree-helper';
import {attachLoaderDivToGrid} from '.';

// Custom UI Dialog for Hierarchical Clustering
export async function hierarchicalClusteringDialog(): Promise<void> {
  let currentTableView = grok.shell.tv.table;
  let currentSelectedColNames: string[] = [];

  const availableColNames = (table: DG.DataFrame): string[] => {
    return table.columns.toList()
      .filter(
        (col) => col.type === DG.TYPE.FLOAT || col.type === DG.TYPE.INT || col.semType === DG.SEMTYPE.MACROMOLECULE
      ).map((col) => col.name);
  };

  const onColNamesChange = (columns: DG.Column<any>[]) => {
    currentSelectedColNames = columns.map((c) => c.name);
  };

  const onTableInputChanged = (table: DG.DataFrame) => {
    const newColInput = ui.columnsInput('Features', table, onColNamesChange, {available: availableColNames(table)});
    ui.empty(columnsInputDiv);
    columnsInputDiv.appendChild(newColInput.root);
    currentTableView = table;
    currentSelectedColNames = [];
  };

  const tableInput = ui.tableInput('Table', currentTableView, grok.shell.tables, onTableInputChanged);
  const columnsInput = ui.columnsInput('Features', currentTableView!,
    onColNamesChange,
    {available: availableColNames(currentTableView!)});
  const columnsInputDiv = ui.div([columnsInput]);

  const distanceInput = ui.choiceInput('Distance', DistanceMetric.Euclidean, Object.values(DistanceMetric));
  const linkageInput = ui.choiceInput('Linkage', LinkageMethod.Ward, Object.values(LinkageMethod));

  const verticalDiv = ui.divV([
    tableInput.root,
    columnsInputDiv,
    distanceInput.root,
    linkageInput.root
  ]);

  ui.dialog('Hierarchical Clustering')
    .add(verticalDiv)
    .show()
    .onOK(async () => {
      const pi = DG.TaskBarProgressIndicator.create('Creating dendrogram ...');
      try {
        await hierarchicalClusteringUI(currentTableView!, currentSelectedColNames,
        distanceInput.value!, linkageInput.value!);
      } finally {
        pi.close();
      }
    });
}

// Cretes and injects dendrogram to the grid
export async function hierarchicalClusteringUI(
  df: DG.DataFrame,
  colNameList: string[],
  distance: DistanceMetric = DistanceMetric.Euclidean,
  linkage: string,
  neighborWidth: number = 300
): Promise<void> {
  const linkageCode = Object.values(LinkageMethod).findIndex((method) => method === linkage);

  const colNameSet: Set<string> = new Set(colNameList);
  const [filteredDf, filteredIndexList]: [DG.DataFrame, Int32Array] =
    hierarchicalClusteringFilterDfForNulls(df, colNameSet);
  const th: ITreeHelper = new TreeHelper();

  let tv: DG.TableView = grok.shell.getTableView(df.name);
  if (filteredDf.rowCount != df.rowCount) {
    grok.shell.warning('Hierarchical clustering analysis on data filtered out for nulls.');
    tv = grok.shell.addTableView(filteredDf);
  };

  const loaderNB = attachLoaderDivToGrid(tv.grid, neighborWidth);

  // TODO: Filter rows with nulls in selected columns
  const preparedDf = DG.DataFrame.fromColumns(
    filteredDf.columns.toList()
      .filter((col) => colNameSet.has(col.name))
      .map((col) => {
        let res: DG.Column;
        switch (col.type) {
        case DG.COLUMN_TYPE.DATE_TIME:
          // column of type 'datetime' getRawData() returns Float64Array
          const colData: Float64Array = col.getRawData() as Float64Array;
          res = DG.Column.float(col.name, col.length).init((rowI) => {
            return !col.isNone(rowI) ? colData[rowI] : null;
          });
          break;
        default:
          res = col;
        }
        return res;
      }));

  try {
    const distanceMatrix = await th.calcDistanceMatrix(preparedDf,
      preparedDf.columns.toList().map((col) => col.name),
      distance);

    const clusterMatrixWorker = getClusterMatrixWorker(
       distanceMatrix!.data, preparedDf.rowCount, linkageCode
    );
    const clusterMatrix = await clusterMatrixWorker;

    // const hcPromise = hierarchicalClusteringByDistanceExec(distanceMatrix!, linkage);
    // Replace rows indexes with filtered
    // newickStr returned with row indexes after filtering, so we need reversed dict { [fltIdx: number]: number}
    const fltRowIndexes: { [fltIdx: number]: number } = {};
    const fltRowCount: number = filteredDf.rowCount;
    for (let fltRowIdx: number = 0; fltRowIdx < fltRowCount; fltRowIdx++)
      fltRowIndexes[fltRowIdx] = filteredIndexList[fltRowIdx];

    const newickRoot: NodeType = th.parseClusterMatrix(clusterMatrix);
    // Fix branch_length for root node as required for hierarchical clustering result
    newickRoot.branch_length = 0;
    (function replaceNodeName(node: NodeType, fltRowIndexes: { [fltIdx: number]: number }) {
      if (!isLeaf(node)) {
        for (const childNode of node.children!)
          replaceNodeName(childNode, fltRowIndexes);
      }
    })(newickRoot, fltRowIndexes);

    // empty clusterDf to stub injectTreeForGridUI2
    // const clusterDf = DG.DataFrame.fromColumns([
    //   DG.Column.fromList(DG.COLUMN_TYPE.STRING, 'cluster', [])]);
    loaderNB.close();
    injectTreeForGridUI2(tv.grid, newickRoot, undefined, neighborWidth);

    tv.grid.invalidate();
  } catch (err) {
    console.error(err);
    tv.grid.invalidate();
    loaderNB.close();
  }
}

export function hierarchicalClusteringFilterDfForNulls(
  df: DG.DataFrame, colNameSet: Set<string>
): [DG.DataFrame, Int32Array] {
  // filteredNullsDf to open new table view
  const colList: DG.Column[] = df.columns.toList().filter((col) => colNameSet.has(col.name));
  const filter: DG.BitSet = DG.BitSet.create(df.rowCount, (rowI: number) => {
    // TODO: Check nulls in columns of colNameList
    return colList.every((col) => !col.isNone(rowI));
  });
  const filteredDf: DG.DataFrame = df.clone(filter);
  const filteredIndexList: Int32Array = filter.getSelectedIndexes();
  return [filteredDf, filteredIndexList];
}
