import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {NodeCuttedType, NodeType} from './index';


export interface ITreeHelper {
  /** Generates data frame with row per node, parent relation, distance, annotation
   * @param {string} newick                Newick format data
   * @param {string} name                  Result data frame name
   * @param {string} nodePrefix            Prefix for nodes with auto generated name   *
   * @param {bool}   emptyParentRootSkip   Skip row with root node and empty parent (for Network Diagram)
   */
  newickToDf(newick: string, name: string, nodePrefix?: string, emptyParentRootSkip?: boolean): DG.DataFrame;

  toNewick(node: NodeType | null): string;

  getLeafList<TNode extends NodeType>(node: TNode): TNode[];

  getNodeList<TNode extends NodeType>(node: TNode): TNode[];

  /** Filters tree by leaves (by set).
   * An internal node will be eliminated only if all its subs (children/leaves) are filtered out by {link @leaves}.
   */
  filterTreeByLeaves(node: NodeType, leaves: { [name: string]: any }): NodeType | null;

  /** Collects nodes by leaves (by set).
   * Node will be returned only if all its subs (children/leaves) are present in {@link leaves}.
   */
  getNodesByLeaves<TNode extends NodeType>(node: TNode, leaves: { [name: string]: any }): TNode[];

  treeCutAsLeaves(node: NodeType, cutHeight: number, currentHeight?: number): NodeType[];

  treeCutAsTree(node: NodeType, cutHeight: number, keepShorts?: boolean, currentHeight?: number): NodeType | null;

  /** Reorder the grid's rows according to the leaves' order in the tree.
   * @param {string|null} leafColName Column name for leaf name in newick, null - use row index
   */
  setGridOrder(tree: NodeType, grid: DG.Grid, leafColName: string | null): [NodeType, string[]];

  markClusters(tree: NodeCuttedType,
    dataDf: DG.DataFrame, leafColName: string | null, clusterColName: string, na?: any): void;

  /**
   * @param {string|null} leafColName Column name for leaf name in newick, null - use row index
   */
  buildClusters(tree: NodeCuttedType,
    clusterDf: DG.DataFrame, clusterColName: string, leafColName: string | null): void;

  /** Modifies the tree ({@link node}) cutting at {@link cutHeight} creating extra nodes.
   * @param {string|null} leafColName Column name for leaf name in newick, null - use row index
   */
  cutTreeToGrid(node: NodeType, cutHeight: number, dataDf: DG.DataFrame,
    leafColName: string, clusterColName: string, na?: any): void;

  /** Generate tree structures with {@link size} nodes number (counting internal).*/
  generateTree(size: number): NodeType;
}

export async function getTreeHelper(): Promise<ITreeHelper> {
  const funcList = DG.Func.find({package: 'Dendrogram', name: 'getTreeHelper'});
  if (funcList.length === 0)
    throw new Error('Package "PhyloTreeViewer"" must be installed for TreeHelper.');

  const res: ITreeHelper = (await funcList[0].prepare().call()).getOutputParamValue() as ITreeHelper;
  return res;
}
