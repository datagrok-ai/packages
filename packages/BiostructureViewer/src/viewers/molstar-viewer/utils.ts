import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import {Subject, Unsubscribable} from 'rxjs';

import {Viewer as RcsbViewer, ViewerProps as RcsbViewerProps} from '@rcsb/rcsb-molstar/build/src/viewer';
import {BuiltInTrajectoryFormat, BuiltInTrajectoryFormats} from 'molstar/lib/mol-plugin-state/formats/trajectory';
import {BiostructureData} from '@datagrok-libraries/bio/src/pdb/types';
import {
  BiostructureProps,
  PluginLayoutControlsDisplayType, SimpleRegionStateOptionsType,
} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';

import {Color as msColor} from 'molstar/lib/mol-util/color';
import {BuildInStructureFormat} from 'molstar/lib/mol-plugin-state/formats/structure';
import {BuildInShapeFormat} from 'molstar/lib/mol-plugin-state/formats/shape';
import {BuildInVolumeFormat} from 'molstar/lib/mol-plugin-state/formats/volume';

import {defaults, molecule3dFileExtensions} from './consts';
import {parseAndVisualsData} from './molstar-viewer-open';
import {PluginCommands} from 'molstar/lib/mol-plugin/commands';
import {PluginLayoutControlsDisplay, PluginLayoutStateProps} from 'molstar/lib/mol-plugin/layout';
import {delay, testEvent} from '@datagrok-libraries/utils/src/test';
import {_package} from '../../package';

/** Creates viewer, ensures to complete creation awaiting first render */
export async function createRcsbViewer(
  host: HTMLElement, props: Partial<RcsbViewerProps>, callLogPrefix: string = '',
): Promise<RcsbViewer> {
  let viewer: RcsbViewer;
  const onEvent = new Subject<void>();
  let eventSub: Unsubscribable;
  const t1 = window.performance.now();
  await testEvent(onEvent,
    () => {
      eventSub.unsubscribe();
      const t2 = window.performance.now();
      _package.logger.debug(`${callLogPrefix}, creating Mol* await ${t2 - t1} ms.`);
    },
    () => {
      viewer = new RcsbViewer(host, props);
      // @ts-ignore
      eventSub = viewer.plugin.canvas3dInit.subscribe((value) => {
        if (value)
          onEvent.next();
      });
    });
  return viewer!;
}

export async function disposeRcsbViewer(viewer: RcsbViewer, container: HTMLElement): Promise<void> {
  await viewer.clear(); // alternative free
  viewer.plugin.dispose();
  await delay(2000);
  $(container).empty();
}

export async function initViewer(viewName: string = 'Mol*'): Promise<RcsbViewer> {
  const view = grok.shell.newView(viewName);
  const viewerContainer = view.root;
  const viewer = await createRcsbViewer(view.root, castProps(defaults), `initViewer()`);

  const subs: Unsubscribable[] = [];
  subs.push(grok.events.onViewRemoved.subscribe((evtView) => {
    if (evtView.id === view.id) {
      for (const sub of subs) sub.unsubscribe();
      disposeRcsbViewer(viewer, viewerContainer).then(() => {});
    }
  }));

  return viewer;
}

/**
 * Creates an instance of Mol* viewer.
 *
 * @param {string} pdbId ID of an entity in PDB.
 */
export async function byId(pdbId: string) {
  await initViewer()
    .then((v: RcsbViewer) => {
      v.loadPdbId(pdbId);
    });
  //v.handleResize();
}

/**
 * Creates an instance of Mol* viewer.
 *
 * @param {string} data Data in PDB
 */
export async function byData(data: string, name: string = 'Mol*', format: BuiltInTrajectoryFormat = 'pdb') {
  await initViewer(name)
    .then(async (viewer: RcsbViewer) => {
      // detecting format by data content
      let binary: boolean = false;
      if (data.includes('mmcif_pdbx.dic')) {
        format = 'mmcif';
        binary = false;
      }

      const state: Partial<PluginLayoutStateProps> = {
        // showControls: false,
        // isExpanded: false,
        // regionState: {
        //   left: SimpleRegionStateOptionsType.FULL,
        //   top: SimpleRegionStateOptionsType.FULL,
        //   right: SimpleRegionStateOptionsType.FULL,
        //   bottom: SimpleRegionStateOptionsType.FULL,
        // },
        controlsDisplay: PluginLayoutControlsDisplayType.LANDSCAPE,
      };
      await viewer.loadStructureFromData(data, format, binary);
      const plugin = viewer.plugin;
      // eslint-disable-next-line new-cap
      await PluginCommands.Layout.Update(plugin, {state: state});
    });
  //v.handleResize();
}

export async function viewMolstarUI(content: string, name?: string, format?: BuiltInTrajectoryFormat): Promise<void> {
  await byData(content, name, format);
}

/** Creates view with Molstar viewer to preview Biostructure (PDB)
 * returns the view immediately, but the viewer is created asynchronously and promise
 * for that is returned separately which resolves once the viewer is initialized.
 */
export function previewMolstarUI(file: DG.FileInfo): { view: DG.View, loadingPromise: Promise<void> } {
  const builtinFormats = BuiltInTrajectoryFormats.map((obj) => obj[0]) as string[];

  function isSupportedFormat(fi: DG.FileInfo) {
    return fi.extension in molecule3dFileExtensions;
  }

  if (!isSupportedFormat(file)) {
    grok.shell.error(`Unsupported format: ${file.extension}`);
    throw new Error(`Unsupported format: ${file.extension}`);
  }

  const view = DG.View.create({name: 'Molstar preview'});
  let viewer: RcsbViewer;
  const subs: Unsubscribable[] = [];
  subs.push(ui.onSizeChanged(view.root).subscribe((value: any) => {
    if (!viewer) return;
    viewer.handleResize();
  }));
  subs.push(grok.events.onViewRemoved.subscribe((evtView) => {
    const fallbackPreviewCheck = evtView.root.children[0].children[0].classList.contains('msp-plugin');
    if (evtView.id === view.id || fallbackPreviewCheck) {
      for (const sub of subs) sub.unsubscribe();
      disposeRcsbViewer(viewer, view.root).then(() => { });
    }
  }));

  const loadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      viewer = await createRcsbViewer(view.root, castProps(defaults), 'previewMolstarUI()');
      const {binary} = molecule3dFileExtensions[file.extension];
      const dataValue: string | Uint8Array = binary ? await file.readAsBytes() : await file.readAsString();
      const data: BiostructureData = {binary: binary, ext: file.extension, data: dataValue, options: {name: file.name}};
      await parseAndVisualsData(viewer.plugin, data);
      resolve();
    } catch (err: any) {
      reject(err);
    }
  });

  return {view, loadingPromise};
}

function castProps(src: BiostructureProps): Partial<RcsbViewerProps> {
  const res: Partial<RcsbViewerProps> = {
    showImportControls: src.showImportControls,
    showWelcomeToast: src.showWelcomeToast,
    layoutIsExpanded: src.layoutIsExpanded,
    layoutShowLog: src.layoutShowLog,
    layoutControlsDisplay: src.layoutControlsDisplay,
    layoutShowControls: src.layoutShowControls,
    layoutShowSequence: src.layoutShowSequence,
    backgroundColor: src.backgroundColor as msColor,
    detachedFromSierra: src.detachedFromSierra,
    showExportControls: src.showExportControls,
    showMembraneOrientationPreset: src.showMembraneOrientationPreset,
    showSessionControls: src.showSessionControls,
    showStructureSourceControls: src.showStructureSourceControls,
    viewportShowExpand: src.viewportShowExpand,
    showSuperpositionControls: src.showSuperpositionControls,
    viewportShowSelectionMode: src.viewportShowSelectionMode,
    volumeStreamingServer: src.volumeStreamingServer,
    modelUrlProviders: [],
    extensions: [],
  };
  return res;
}
