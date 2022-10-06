import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {newickToDf} from '../utils';
import {Shapes} from '@phylocanvas/phylocanvas.gl';
import {PhylocanvasGlViewer, TreeTypesNames} from '../viewers/phylocanvas-gl-viewer';
import {DOCK_TYPE} from 'datagrok-api/dg';
import {Unsubscribable} from 'rxjs';


export class PhylocanvasGlViewerApp {

  private tv!: DG.TableView;

  // private ptv!: DG.Viewer; // PhyloTreeViewer

  treeHost!: HTMLDivElement | null;
  treeViewer!: PhylocanvasGlViewer | null; // PhylocanvasGL
  treeDn!: DG.DockNode | null;

  _df!: DG.DataFrame;

  get df() { return this._df; }

  constructor() {

  }

  async init(): Promise<void> {

    await this.loadData();
  }

  async loadData(): Promise<void> {
    const treeData: string = await grok.dapi.files.readAsText('System:AppData/PhyloTreeViewer/data/tree95.nwk');

    const df: DG.DataFrame = newickToDf(treeData, 'tree95');

    await this.setData(df);
  }

  async setData(df: DG.DataFrame): Promise<void> {
    await this.destroyView();

    this._df = df;

    await this.buildView();
  }

  //#region -- View --

  viewSubs: Unsubscribable[] = [];

  async destroyView(): Promise<void> {
    this.viewSubs.forEach((sub) => sub.unsubscribe());
    this.viewSubs = [];

    if (this.treeViewer) {
      this.treeViewer.close();
      this.treeViewer.removeFromView();
      this.treeViewer = null;
    }

    if (this.treeHost) {
      this.treeHost.remove();
      this.treeHost = null;
    }

    if (this.treeDn) {
      this.treeDn.detachFromParent();
      this.treeDn = null;
    }

  }

  async buildView(): Promise<void> {
    if (!this.tv) {
      // filter for leafs only, to align tree with grid
      const leafCol: DG.Column = this.df.getCol('leaf');
      this.df.filter.init((rowI: number) => { return leafCol.get(rowI); });

      this.tv = grok.shell.addTableView(this.df, DOCK_TYPE.FILL);
      this.tv.path = 'apps/PhyloTreeViewer/PhylocanvasGlViewer';

      this.viewSubs.push(this.tv.grid.onRowsResized.subscribe((args) => {
        if (!this.treeHost || !this.treeViewer) return;

        const cw: number = this.treeHost.clientWidth;
        const ch: number = this.treeHost.clientHeight;

        this.treeViewer.root.style.width = `${cw}px`;
        this.treeViewer.root.style.height = `${ch}px`;
      }));
    }

    // if (!this.treeHost) {
    //   this.treeHost = ui.div();
    // }
    //
    // if (!this.treeDn) {
    //   this.treeDn = this.tv.dockManager.dock(this.treeHost, DOCK_TYPE.LEFT);
    // }

    if (!this.treeViewer) {
      // TableView.addViewer() returns JsViewer (no access to viewer's attributes)
      // DataFrame.plot.fromType() return viewers type object (with attributes)
      this.treeViewer = (await this.df.plot.fromType('PhylocanvasGl', {
        alignLabels: true,
        showLabels: true,
        showLeafLabels: true,
        padding: 0,
        treeToCanvasRatio: 1,
      })) as PhylocanvasGlViewer;
      this.treeDn = this.tv.dockManager.dock(this.treeViewer, DOCK_TYPE.LEFT);
      let k = 11;
      //this.treeViewerDn = this.tv.dockManager.dock(this.treeViewer, DOCK_TYPE.LEFT);
    }
  }

  //#endregion -- View --
}