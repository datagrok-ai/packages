import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import * as ngl from 'NGL';
import {Unsubscribable} from 'rxjs';
import {SignalBinding} from 'signals';

import {NglGlAux, NglGlProps, NglGlServiceBase} from '@datagrok-libraries/bio/src/viewers/ngl-gl-service';
import {RenderTask} from '@datagrok-libraries/bio/src/utils/cell-renderer-async-base';

import {awaitNgl} from '../viewers/ngl-viewer-utils';

import {_package} from '../package';

// const TASK_TIMEOUT: number = 2000;
// const NGL_ERROR_LIMIT: number = 3;
// const NGL_TRY_LIMIT: number = 3;

export class NglGlDocService extends NglGlServiceBase {
  private nglDiv: HTMLDivElement;

  private ngl: ngl.Stage | null = null;

  private readonly hostDiv: HTMLDivElement;

  constructor() {
    super(_package.logger);

    this.hostDiv = ui.box();
    // this.hostDiv.style.display = 'none'; // Disables drawing at all
    this.hostDiv.style.position = 'absolute';
    this.hostDiv.style.left = '0px';
    this.hostDiv.style.right = '0px';
    this.hostDiv.style.width = '0px';
    this.hostDiv.style.height = '0px';
    this.hostDiv.style.visibility = 'hidden';
    document.body.appendChild(this.hostDiv);

    // window.setInterval(() => { this._sweepQueue(); }, 200);
  }

  public async reset(): Promise<void> {
    if (!this.ngl) return;
    this.ngl.dispose();
    this.ngl = null;
    $(this.nglDiv).empty();
    this.nglDiv.remove();
    await super.reset();
  }

  protected override async requestRender(
    key: any, task: RenderTask<NglGlProps, NglGlAux>, renderHandler: () => void,
  ): Promise<[Unsubscribable, number, () => void]> {
    const logPrefix = `${this.toLog()}.requestRender()`;
    this.logger.debug(`${logPrefix}, ` + `key: ${key?.toString()}`);
    const dpr = window.devicePixelRatio;

    // TODO: Convert string to Blob once converting PDB string column to Blob
    const stringBlob = new Blob([task.props.pdb], {type: 'text/plain'});

    // TODO: Use canvas size switching 0/1 px to required

    // if (key === 1) throw new Error('NglGlDocService: Test error');

    if (this.errorCount > this.errorLimit) {
      this.logger.warning(`${logPrefix}, ` + 'recreate ngl.Stage, ' +
        `nglTimeoutCount = ${this.errorCount} > ${this.errorLimit}`);
      await this.reset();
    }
    if (!this.ngl) {
      // re-create ngl div and stage
      this.hostDiv.appendChild(this.nglDiv = ui.div([], 'd4-ngl-viewer'));
      this.ngl = new ngl.Stage(this.nglDiv);
      await awaitNgl(this.ngl, logPrefix); // await NGL is ready
    } else {
      //
      this.ngl.removeAllComponents();
    }

    const lST = window.performance.now();
    this.nglDiv.style.width = `${Math.floor(task.props.width) / dpr}px`;
    this.nglDiv.style.height = `${Math.floor(task.props.height) / dpr}px`;
    this.ngl.viewer.setSize(task.props.width / dpr, task.props.height / dpr);
    const canvas = this.ngl.viewer.renderer.domElement;
    canvas.width = Math.floor(task.props.width);
    canvas.height = Math.floor(task.props.height);

    await this.ngl.loadFile(stringBlob, {ext: 'pdb', defaultRepresentation: true});
    const comp = this.ngl.compList[0];
    let reprType: ngl.StructureRepresentationType = 'cartoon';
    if (comp.type === 'structure' && comp.object.atomCount < 500)
      reprType = 'ball+stick';
    const re = comp.addRepresentation(reprType, undefined);
    comp.autoView();
    // await delay(200); /* Sometimes compList[0] is undefined, without any other error */
    if (!comp) throw new Error('no component added');
    const lET = window.performance.now();

    const echST = window.performance.now();
    const emptyCanvasHash = DG.StringUtils.hashCode(canvas.toDataURL());
    if (emptyCanvasHash === undefined)
      this.logger.warning(`${logPrefix}, emptyCanvasHash undefined at calc`);
    const echET = window.performance.now();

    const rST = window.performance.now();
    const renderHandlerInt = (...params: any): void => {
      const rET: number = window.performance.now();
      this.logger.warning(`${logPrefix}.renderHandlerInt(), ` +
        `key: ${key?.toString()}, ` +
        `load: ${lET - lST} ms,\n    ` + `emptyCanvasHashET: ${echET - echST} ms, ` + `renderET: ${rET - rST} ms, ` +
        `emptyCanvasHash: ${emptyCanvasHash}, ` + `params: ${JSON.stringify(params)}, `);
      renderHandler();
    };
    const nglRenderedSub: Unsubscribable = new class {
      constructor(private readonly sb: SignalBinding<any>) {}

      unsubscribe(): void { this.sb.detach(); }
    }(this.ngl.viewer.signals.rendered.add(renderHandlerInt, this));
    const trigger = () => {
      // this.ngl.viewer.requestRender();
      this.ngl!.viewer.render(false);
    };
    if (emptyCanvasHash === undefined)
      console.warn(`${logPrefix}, emptyCanvasHash undefined at the end`);
    // trigger rendering after returning nglRenderBinding and emptyCanvasHash
    return [nglRenderedSub, emptyCanvasHash, trigger];
  }

  protected override onRendered(
    key: keyof any | undefined, task: RenderTask<NglGlProps, NglGlAux>, emptyCanvasHash: number
  ): boolean {
    const logPrefix = `${this.toLog()}.onRendered( key = ${key?.toString()} )`;
    if (emptyCanvasHash === undefined)
      this.logger.warning(`${logPrefix}, emptyCanvasHash undefined`);
    this.logger.debug(`${logPrefix}, start`);
    const canvas = this.ngl!.viewer.renderer.domElement;
    const canvasHash = DG.StringUtils.hashCode(canvas.toDataURL());
    if (canvasHash == emptyCanvasHash) { // render is not ready yet
      this.logger.debug(`${logPrefix}, empty canvas`);
      return false;
    }
    this.logger.debug(`${logPrefix}, end, ` + `emptyCanvasHash = ${emptyCanvasHash}, canvasHash = ${canvasHash}`);

    task.onAfterRender(canvas);
    return true;
  }
}
