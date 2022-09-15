//(\(*[^:]+:[^,]+\)*)+
// import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {PhylocanvasGL, TreeTypes, Shapes} from '@phylocanvas/phylocanvas.gl';
import {TreeAnalyzer, PhylocanvasTreeNode, getVId} from './utils/tree-stats';
import {Subscription, Unsubscribable} from 'rxjs';


export class TreeBrowser extends DG.JsViewer {
  static treeGridColumnsNameMapping = {
    totalLeaves: {name: 'Leaves', dType: 'int'},
    leavesIntersected: {name: 'Intersected', dType: 'int'},
    totalSubtreeLength: {name: 'Height', dType: 'double'},
  };

  idColumnName: string = 'v id';
  treeSemanticType = 'newick';
  title: string;

  treeDiv: HTMLDivElement;
  phyloTreeViewer: PhylocanvasGL;

  _treeGrid: DG.Grid = null;
  _treeGridSubs: Unsubscribable[] = null;

  cloneIndex: TreeLeaves = {};
  leavesIndex: TreeLeavesMap = {};
  vIdIndex: TreeLeavesMap = {};

  treeAnalyser: TreeAnalyzer;

  private _treeDf: DG.DataFrame = DG.DataFrame.fromCsv(['TREE', 'CLONE'].join(','));
  private _mlbDf: DG.DataFrame = null;

  get treeDf(): DG.DataFrame { return this._treeDf; }

  get mlbDf(): DG.DataFrame { return this._mlbDf; }

  private viewSubs: Subscription[] = [];

  public async setData(treeDf: DG.DataFrame, mlbDf: DG.DataFrame): Promise<void> {
    console.debug('MLB: TreeBrowser.setData()');
    await this.destroyView();
    this._mlbDf = mlbDf;
    this._treeDf = treeDf;
    await this.buildView();
  }

  protected _takeTreeAt(index: number, columnName = 'TREE'): string {
    return this.treeDf.get(columnName, index);
  }

  protected _getCloneIdAt(index: number, columnName = 'CLONE'): string {
    return this.treeDf.get(columnName, index);
  }

  constructor() {
    super();
  }

  /**
   * Maps tree leaf {node id} or {clone id} to a {list of indices} of tree which it is found in.
   * @param {PhylocanvasTreeNode} node Node record.
   * @param {number} treeIndex Index of tree containing the node in trees column.
   * @return {PhylocanvasTreeNode} Modified node.
   */
  private _collectLeavesMapping(node: PhylocanvasTreeNode, treeIndex: number) {
    if (node.isLeaf) {
      console.debug(`MLB: TreeBrowser._collectLeavesMapping( node: ${node.name}, treeIndex: ${treeIndex} )`);
      const id = node.id;
      const cloneId = this._getCloneIdAt(treeIndex);

      if (!this.cloneIndex[cloneId])
        this.cloneIndex[cloneId] = {index: [treeIndex], items: []};

      this.cloneIndex[cloneId].items.push(id);

      if (!this.leavesIndex[id])
        this.leavesIndex[id] = [];

      this.leavesIndex[id].push(treeIndex);
    }
    return node;
  }

  /**
   * Fires when tree grid cell is rendered.
   * @param {DG.GridCellRenderArgs} args Cell arguments.
   */
  private _onTreeGridCellRender(args: DG.GridCellRenderArgs) {
    if (args.cell.isTableCell && args.cell.tableColumn.semType == this.treeSemanticType) {
      const nwk: string = args.cell.cell.value;

      if (TreeAnalyzer.newickRegEx.test(nwk.trim())) {
        //const ctx = args.g.canvas.getContext('webgl').canvas;
        /*const phTree = new PhylocanvasGL(ctx, {
          shape: Shapes.Dot,
          size: ctx.getBoundingClientRect(),
          source: nwk,
          type: TreeTypes.Rectangular,
        });*/
        //args.preventDefault();
      }
    }
  }

  // /**
  //  * Returns filtered rows in MLB grid.
  //  * @return {string[]} Rows is left after filtering.
  //  */
  // private _calcFilteredItems(): string[] {
  //   const filteredIndices = new Set(this.mlbDf.filter.getSelectedIndexes());
  //   const isntFiltered = (x: number) => filteredIndices.has(x);
  //   return Object.keys(this.vIdIndex).filter((_, i) => isntFiltered(i));
  // }

  public async init() {
    this.subs.push(
      ui.onSizeChanged(this.root).subscribe(this.rootOnSizeChanged.bind(this)));

    await this.buildView();
    // .catch((ex) => {
    //   console.error(`TreeBrowser.init() > buildView() error:\n${ex ? ex.toString() : 'none'}`);
    // });
  }

  /**
   * Makes mapping of {tree node id} taken from column value to {list of indices} which it is found in.
   * @return {TreeLeavesMap} Mapping.
   */
  private _collectMappings(): TreeLeavesMap {
    const mapper: TreeLeavesMap = {};
    if (this.mlbDf) {
      const col = this.mlbDf.col(this.idColumnName);
      for (let i = 0; i < col.length; ++i) {
        const id: string = col.get(i);

        if (!(id in mapper))
          mapper[id] = [];

        mapper[id].push(i);
      }
    }
    return mapper;
  }

  /**
   * Returns filtered rows in MLB grid.
   * @param {DG.DataFrame} mlbDf
   * @param {{}} vIdIndex
   * @return {string[]} Rows is left after filtering.
   */
  private static _calcFilteredItems(mlbDf: DG.DataFrame, vIdIndex: {}): string[] {
    let res: string [] = [];
    if (mlbDf) {
      const filteredIndices = new Set(mlbDf.filter.getSelectedIndexes());
      const isntFiltered = (x: number) => filteredIndices.has(x);
      res = Object.keys(vIdIndex).filter((_, i) => isntFiltered(i));
    }
    return res;
  }

  /**
   * Fires when MLB grid row was filtered.
   * @param {*} args Unused.
   */
  private _onMLBGridRowsFiltered(args: any) {
    const treeDf = this.treeDf;
    const sourceDf = this.mlbDf;
    const selectedVIdIndices = new Set(sourceDf.filter.getSelectedIndexes());

    this.treeAnalyser.items = TreeBrowser._calcFilteredItems(sourceDf, this.vIdIndex);

    // Filtering of the data loaded for an antigen is not required.
    // treeDf.rows.filter((row: DG.Row) => {
    //   const cloneId = this._getCloneIdAt(row.idx);
    //
    //   if (this.cloneIndex[cloneId]) {
    //     const cloneVIds = this.cloneIndex[cloneId].items;
    //
    //     for (const vId of cloneVIds) {
    //       const indices = this.vIdIndex[vId];
    //
    //       if (indices) {
    //         for (const i of indices) {
    //           if (selectedVIdIndices.has(i))
    //             return true;
    //         }
    //       }
    //     }
    //   }
    //   return false;
    // });
    //treeDf.rows.requestFilter
  }

  onTreeGridCellTooltip(cell: DG.GridCell, x: number, y: number) {
    if (cell.isColHeader) {
      const msg = {
        [TreeBrowser.treeGridColumnsNameMapping.totalLeaves.name]: 'Total tree leaves',
        [TreeBrowser.treeGridColumnsNameMapping.leavesIntersected.name]: 'Tree leaves found also in the main taible',
        [TreeBrowser.treeGridColumnsNameMapping.totalSubtreeLength.name]: 'Tree height',
      };
      ui.tooltip.show(msg[cell.tableColumn.name] ?? cell.tableColumn.name, x, y);
      return true;
    }
  }

  private destroyTreeGrid() {
    this._treeGridSubs.forEach((s) => { s.unsubscribe(); });
    this._treeGridSubs = null;
    this._treeGrid = null;
  }

  /**
   * Adds a grid with simple tree statistics.
   * @param {string} treesColumnName Column containing trees in Newick format.
   * @param {string[]} [baseColumnNames=[]] Columns to include into creating grid.
   */
  private buildTreeGrid(treesColumnName: string, baseColumnNames: string[] = []): void {
    const treesColumn = this.treeDf.col(treesColumnName);
    const stats = this.treeAnalyser.analyze(treesColumn.toList());
    const df = DG.DataFrame.fromColumns(baseColumnNames.map((v) => this.treeDf.col(v)));

    for (const k of Object.keys(stats)) {
      const col = TreeBrowser.treeGridColumnsNameMapping[k];
      (df.columns as DG.ColumnList).add(DG.Column.fromList(col.dType, col.name, stats[k]));
    }

    // TODO: fix this ad hoc.
    // df.rows.removeAt(0);

    const treesCol: DG.Column = df.columns.add(treesColumn);
    treesCol.semType = this.treeSemanticType;

    const grid = DG.Viewer.grid(df, {
      rowHeight: 160,
    });

    grid.col('TREE').visible = false;

    this._treeGrid = grid;
    this._treeGridSubs = [];
    this._treeGridSubs.push(grid.onCellRender.subscribe(this._onTreeGridCellRender.bind(this)));
    this._treeGridSubs.push(grid.onCellTooltip(this.onTreeGridCellTooltip.bind(this)));
  }

  private rootOnSizeChanged(args: any): void {
    console.debug('MLB: TreeBrowser.rootOnSizeChanged()');
    this.calcSize();
  }

  calcSize(): void {
    // this.treeDiv.innerText = `${this.root.clientWidth} x ${this.root.clientHeight}`;
    const cw: number = this.root.clientWidth;
    const ch: number = this.root.clientHeight;
    console.debug(`MLB: TreeBrowser.calcSize( ${cw.toString()} x ${ch.toString()} )`);

    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (this.treeDiv) {
      this.treeDiv.style.width = `${width}px`;
      this.treeDiv.style.height = `${height}px`;

      this.phyloTreeViewer.setProps({size: this.treeDiv.getBoundingClientRect()});
    }
  }

  private async destroyView() {
    this.phyloTreeViewer.destroy();
    this.treeDiv.remove();

    this.destroyTreeGrid();

    this.cloneIndex = {};
    this.leavesIndex = {};
    this.vIdIndex = {};

    this.treeAnalyser = null;

    this.viewSubs.forEach((s: Subscription) => { s.unsubscribe(); });
  }

  private async buildView() {
    this.vIdIndex = this._collectMappings();
    const itemsToFind = TreeBrowser._calcFilteredItems(this.mlbDf, this.vIdIndex);

    this.treeAnalyser = new TreeAnalyzer(itemsToFind);
    this.treeAnalyser.addNodeInspector(this._collectLeavesMapping.bind(this));

    // Rebuild treeGrid is required because of this.treeAnalyser.analyze() call required
    this.buildTreeGrid('TREE', ['CLONE']);


    //const color: string = `#bbff${Math.ceil(128 + Math.random() * 127).toString(16)}`;
    this.treeDiv = ui.div([], {
      style: {
        //backgroundColor: color,
        width: '100px',
        height: '100px',
      }
    });
    this.root.appendChild(this.treeDiv);
    // const treeNode = mlbView.dockManager.dock(treeDiv, DG.DOCK_TYPE.DOWN);

    // mlbView.dockManager.dock(this.treeGrid, DG.DOCK_TYPE.RIGHT, treeNode);
    let treeTxt: string = '();';
    if (this.treeDf.rowCount > 0) {
      this.treeDf.currentRowIdx = 0;
      treeTxt = this._takeTreeAt(this.treeDf.currentRowIdx);
    }

    this.phyloTreeViewer = new PhylocanvasGL(this.treeDiv, {
      interactive: true,
      showLabels: true,
      showLeafLabels: true,
      shape: Shapes.Dot,
      fontFamily: 'Roboto',
      fontSize: 13,
      nodeSize: 1,
      size: this.treeDiv.getBoundingClientRect(),
      source: treeTxt,
      type: TreeTypes.Rectangular,
    });
    this.calcSize();

    this.phyloTreeViewer.selectNode = this.selectNode.bind(this);

    this.viewSubs.push(
      this.treeDf.onCurrentRowChanged.subscribe(this._onTreeGridCurrentRowChanged.bind(this)));

    if (this.mlbDf) {
      this.viewSubs.push(
        this.mlbDf.onCurrentRowChanged.subscribe(this._onMLBGridCurrentRowChanged.bind(this)));
      this.viewSubs.push(
        this.mlbDf.onRowsFiltered.subscribe(this._onMLBGridRowsFiltered.bind(this)));
      this._matchMappings();
    }
  }

  public override async onTableAttached() {
    console.debug(`MLB: TreeBrowser.onTableAttached( dataFrame = ${!this.dataFrame ? 'null' : 'value'} )`);
    await this.init();
  }

  /**
   * Matches node ids from initial table found within trees.
   * Adds an auxiliary column containing clone ids of matched trees.
   * @param {string} [columnName='clones'] Auxiliary column name.
   */
  private _matchMappings(columnName = 'clones') {
    // Adding columns after tableView breaks display (no columns show)
    // const mlbDf = this.mlbDf;
    // let col: DG.Column<string> = mlbDf.columns.byName(columnName) as DG.Column<string> ||
    //   mlbDf.columns.addNewString(columnName);
    const col: DG.Column<string> = this.mlbDf.col('clones');

    for (const [vId, indices] of Object.entries(this.vIdIndex)) {
      if (this.leavesIndex[vId]) {
        for (const i of indices) {
          const values: string = col.get(i);
          const unique = new Set(values ? values.split('|').filter((v) => v.length > 0) : []);

          for (const v of this.leavesIndex[vId]) {
            const cloneId = this._getCloneIdAt(v);
            unique.add(cloneId);
          }

          col.set(i, Array.from(unique.values()).join('|'));
        }
      }
    }
  }

  /**
   * Finds and selects tree node chosen.
   * @param {*} node Node to consider.
   */
  selectNode(node: any) {
    if (node) {
      if (node.label) {
        const nodeVId: string = getVId(node.id);
        const df = this.mlbDf;
        const col: DG.Column = df.getCol(this.idColumnName);

        df.selection.init((i) => (col.get(i) as string).includes(nodeVId));

        if (df.selection.trueCount > 0)
          df.currentRowIdx = df.selection.getSelectedIndexes()[0];
      }
    } else {
    }
  }

  /**
   * Selects a tree from the given index in the table.
   * @param {number} index Index to take tree from.
   * @param {string} [node] Node id to select.
   */
  selectTree(index: number, node?: string) {
    const cloneId = this._getCloneIdAt(index);
    const treeItems = this.cloneIndex[cloneId].items;

    this.treeDf.currentRowIdx = index;
    const treeTxt: string = this._takeTreeAt(index);
    const treeClosePos: number = treeTxt.substring(0, treeTxt.length - 2).lastIndexOf(')');
    const treeTxtClean = treeTxt.substring(1, treeClosePos + 1) + ';';
    this.phyloTreeViewer.setProps({source: treeTxtClean});

    /**
     * Modifies node styles to mark intersected node ids.
     * @return {any}
     */
    const _modifyNodeStyles = function() {
      let styles = {};

      for (const item of treeItems) {
        const style = {};

        const nodeVId = getVId(item);
        if (nodeVId in this.vIdIndex) {
          const color = this.treeAnalyser.getItemsAsSet().has(item) ? '#0000ff' : '#ff0000';
          style[item] = {
            fillColour: color,
            // label: nodeVId,
          };
        } else {
          style[item] = {shape: Shapes.Dot};
        }
        styles = {...styles, ...style};
      }
      return styles;
    }.bind(this);

    this.phyloTreeViewer.setProps({styles: _modifyNodeStyles(), selectedIds: node ? [node] : []});
  }

  /**
   * Fires when tree grid row is changed.
   * @param {*} args Callback arguments.
   */
  private _onTreeGridCurrentRowChanged(args: any) {
    const currentRowIdx = this.treeDf.currentRowIdx;
    const cloneId = this._getCloneIdAt(currentRowIdx);

    if (cloneId in this.cloneIndex) {
      const treeIndex: number = this.cloneIndex[cloneId]['index'][0];
      this.selectTree(treeIndex);
    }
  }

  /**
   * Fires when MLB grid row is changed.
   * @param {*} args Callback arguments.
   */
  private _onMLBGridCurrentRowChanged(args: any) {
    const df = this.mlbDf;
    const currentRowIdx = df.currentRowIdx;
    const currentCloneListStr: string = df.get('clones', currentRowIdx);
    if (!currentCloneListStr || currentCloneListStr.length == 0)
      return;

    const currentCloneList = currentCloneListStr.split('|');
    const currentCloneId = this.treeDf.get('CLONE', this.treeDf.currentRowIdx);
    const currentCloneIdStr = currentCloneId.toString();
    const cloneId = currentCloneList.includes(currentCloneIdStr) ? currentCloneId : currentCloneList[0];

    if (cloneId in this.cloneIndex) {
      const index = this.cloneIndex[cloneId]['index'][0];

      this.treeDf.currentRowIdx = index;
      this.selectTree(index, df.get(this.idColumnName, currentRowIdx));
    }
  }
}

interface TreeMap {
  index: number[];
  items: string[];
}

type TreeLeaves = { [key: string]: TreeMap };
type TreeLeavesMap = { [key: string]: number[] };
