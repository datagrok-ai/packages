import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_package} from '../package';
import * as NGL from 'NGL';
import {NglGlServiceBase, NglGlTask} from '@datagrok-libraries/bio/src/viewers/ngl-gl-viewer';


export class NglGlService implements NglGlServiceBase {
  readonly nglDiv: HTMLDivElement;
  private readonly ngl: any;

  hostDn?: DG.DockNode;

  private readonly _queue: { key?: keyof any, task: NglGlTask }[];
  private readonly _queueDict: { [key: keyof any]: NglGlTask };
  /** The flag allows {@link _processQueue}() on add item to the queue with {@link render}() */
  private _busy: boolean = false;

  constructor() {
    this.nglDiv = ui.div([], 'd4-ngl-viewer');

    this.ngl = new NGL.Stage(this.nglDiv);
    this.ngl.viewer.signals.rendered.add(this.onNglRendered.bind(this));

    this._queue = [];
    this._queueDict = {};
  }

  render(task: NglGlTask, key?: keyof any): void {
    //_package.logger.debug('NglGlService.render() start ' + `name: ${name}`);

    if (key !== undefined) {
      if (key in this._queueDict) {
        // remove outdated task from the queue
        const oldTaskI = this._queue.findIndex((item) => item.key === key);
        this._queue.splice(oldTaskI, 1);
      }
      this._queueDict[key] = task;
    }

    this._queue.push({key, task});

    if (!this._busy) {
      this._busy = true;

      const hostDiv = ui.div([this.nglDiv]);
      this.hostDn = grok.shell.tv.dockManager.dock(hostDiv, DG.DOCK_TYPE.RIGHT,
        null, 'NglGlService', 0.00);
      _package.logger.debug('NglGlService dock()');

      // TODO: Use requestAnimationFrame()
      window.setTimeout(async () => { await this._processQueue(); }, 0 /* next event cycle */);
    }
    //_package.logger.debug('NglGlService.render() end ' + `name: ${name}`);
  }

  private async _processQueue() {
    const {key, task} = this._queue.shift()!;
    if (key) delete this._queueDict[key];

    const r = window.devicePixelRatio;

    // TODO: Convert string to Blob once converting PDB string column to Blob
    const stringBlob = new Blob([task.props.pdb], {type: 'text/plain'});

    // TODO: Use canvas size switching 0/1 px to required
    this.nglDiv.style.width = `${Math.floor(task.props.width) / r}px`;
    this.nglDiv.style.height = `${Math.floor(task.props.height) / r}px`;

    this.ngl.removeAllComponents();
    await this.ngl.loadFile(stringBlob, {ext: 'pdb'});
    await this.ngl.compList[0].addRepresentation('cartoon');
    await this.ngl.compList[0].autoView();

    const canvas = this.nglDiv.querySelector('canvas')!;
    canvas.width = Math.floor(task.props.width);
    canvas.height = Math.floor(task.props.height);

    this.task = task;
    this.key = key;
    this.emptyPaintingSize = undefined;

    await this.ngl.handleResize();
  }

  private emptyPaintingSize?: number = undefined;
  private task?: NglGlTask = undefined;
  private key?: keyof any = undefined;

  private async onNglRendered(): Promise<void> {
    if (this.task === undefined) return;

    _package.logger.debug('NglGlService onAfterRenderHandler() ' + `key = ${JSON.stringify(this.key)}`);
    let taskCompleted: boolean = false;

    //TODO: Use canvas size switching 0/1 px to required to detect rendering completed
    //TODO: HTMLCanvas.toBlob()
    if (this.emptyPaintingSize === undefined) {
      this.emptyPaintingSize = this.ngl.viewer.renderer.domElement.toDataURL('image/png').length;
    } else {
      const currentPaintingSize = this.ngl.viewer.renderer.domElement.toDataURL('image/png').length;
      if (currentPaintingSize > this.emptyPaintingSize * 2) {
        _package.logger.debug('NglGlService taskCompleted ' + `key = ${JSON.stringify(this.key)}`);
        taskCompleted = true;
      }
    }

    taskCompleted = true;

    if (taskCompleted) {
      const canvas = this.ngl.viewer.renderer.domElement;
      await this.task.onAfterRender(canvas);
      this.task = undefined;
      this.key = undefined;
      this.emptyPaintingSize = undefined;

      if (this._queue.length > 0) {
        // Schedule processQueue the next item only afterRender has asynchronously completed for the previous one
        window.setTimeout(async () => { await this._processQueue(); }, 0 /* next event cycle */);
      } else {
        // release flag allowing _processQueue on add queue item
        this._busy = false;

        try {
          grok.shell.tv.dockManager.close(this.hostDn!);
        } catch (err) {}
        delete this.hostDn;
        _package.logger.debug('NglGlService undock()');
      }
    }
  }

  public renderOnGridCell(
    gCtx: CanvasRenderingContext2D, bd: DG.Rect, gCell: DG.GridCell, canvas: CanvasImageSource,
  ): void {
    gCtx.save();
    try {
      // Correction for vert scrolling happened between task and render, calculate bd.y directly
      bd.y = (gCell.gridRow - Math.floor(gCell.grid.vertScroll.min)) * gCell.grid.props.rowHeight +
        gCell.grid.colHeaderHeight;

      // Correction for horz scrolling happened between task and render, calculate bd.x directly
      let left: number = 0;
      for (let colI = 0; colI < gCell.gridColumn.idx; colI++) {
        const col: DG.GridColumn = gCell.grid.columns.byIndex(colI)!;
        left += col.visible ? col.width : 0;
      }
      bd.x = left - gCell.grid.horzScroll.min;

      gCtx.beginPath();
      gCtx.rect(bd.x + 1, bd.y + 1, bd.width - 2, bd.height - 2);
      gCtx.clip();

      // gCtx.fillStyle = '#E0E0FF';
      // gCtx.fillRect(bd.x + 1, bd.y + 1, bd.width - 2, bd.height - 2);

      const cw = 'width' in canvas && (
        canvas.width instanceof SVGAnimatedLength ? canvas.width.baseVal.value : canvas.width as number);
      const ch = 'height' in canvas && (
        canvas.height instanceof SVGAnimatedLength ? canvas.height.baseVal.value : canvas.height as number);
      if (!cw || !ch) throw new Error('NglGlService.renderOnGridCell() canvas size is not available');
      gCtx.transform(bd.width / cw, 0, 0, bd.height / ch, bd.x, bd.y);

      gCtx.drawImage(canvas, 0 + 1, 0 + 1);
    } finally {
      gCtx.restore();
    }
  }
}
