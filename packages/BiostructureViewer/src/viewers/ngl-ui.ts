import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import * as ngl from 'NGL';
import {Unsubscribable} from 'rxjs';
import {awaitNgl} from './ngl-viewer-utils';

export async function viewNglUI(fileContent: string): Promise<void> {
  const view = grok.shell.newView('NGL');
  const host = ui.div([], 'd4-ngl-viewer');
  const stage = new ngl.Stage(host);
  await awaitNgl(stage, `viewNglUI()`);
  const blob = new Blob([fileContent], {type: 'application/octet-binary'});
  await stage.loadFile(blob, {defaultRepresentation: true});
  handleResize(host, stage);
  const subs: Unsubscribable[] = [];
  subs.push(grok.events.onViewRemoved.subscribe((evtView) => {
    if (evtView.id === view.id) {
      stage.dispose();
      for (const sub of subs) sub.unsubscribe();
    }
  }));
}

/**
 * @param {any} file
 * @return {DG.View}
 */
export function previewNglUI(file: DG.FileInfo): { view: DG.View, loadingPromise: Promise<void> } {
  const view = DG.View.create();
  const host = ui.div([], 'd4-ngl-viewer');
  const stage = new ngl.Stage(host);
  // await awaitNgl(stage); // previewNglUI is not async

  const loadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      const data = await file.readAsBytes();
      const blob = new Blob([data], {type: 'application/octet-binary'});
      await stage.loadFile(blob, {defaultRepresentation: true, ext: file.extension});
    } catch (err: any) {
      reject(err);
    }
  });

  handleResize(host, stage);
  view.append(host);
  const subs: Unsubscribable[] = [];
  subs.push(grok.events.onViewRemoved.subscribe((evtView) => {
    if (evtView.id === view.id) {
      stage.dispose();
      for (const sub of subs) sub.unsubscribe();
    }
  }));
  return {view, loadingPromise};
}

export function nglWidgetUI(pdbId: string): DG.Widget {
  const host = ui.div([], {classes: 'd4-ngl-viewer', style: {width: '100%'}});
  const stage = new ngl.Stage(host);
  // await awaitNgl(stage); // nglWidgetUI is not async

  //const pdbIdPath: string = `rcsb://${pdbId}`;
  // Link `rcsb://${pdbId}` causes CORS error
  // Using PDB format due to an NGL Viewer issue rendering certain mmCIF/CIF files  
  // Reference: https://github.com/nglviewer/ngl/issues/999  
  const pdbIdPath: string = `https://files.rcsb.org/download/${pdbId}.pdb`;

  stage.loadFile(pdbIdPath, {defaultRepresentation: true})
    .then(() => {
      stage.compList[0].autoView();
      handleResize(host, stage);
    })
    .catch((reason) => {
      grok.shell.warning(`Can\'t load structure for PDB ID '${pdbId}' error: ${reason}`);
    });
  return DG.Widget.fromRoot(host);
}

function handleResize(host: HTMLDivElement, stage: ngl.Stage) {
  const canvas = stage.viewer.renderer.domElement;

  function resize() {
    canvas!.width = Math.floor(canvas!.clientWidth * window.devicePixelRatio);
    canvas!.height = Math.floor(canvas!.clientHeight * window.devicePixelRatio);
    stage.handleResize();
  }

  ui.onSizeChanged(host).subscribe((_) => resize());
  resize();
}
