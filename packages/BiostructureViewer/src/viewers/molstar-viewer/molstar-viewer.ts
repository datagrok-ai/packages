import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

// import {Viewer as rcsbViewer, ViewerProps as rcsbViewerProps} from '@rcsb/rcsb-molstar/src/viewer';
import {Viewer as RcsbViewer, ViewerProps as RcsbViewerProps} from '@rcsb/rcsb-molstar/build/src/viewer';

import $ from 'cash-dom';
import wu from 'wu';
import {Observable, Subject, Unsubscribable} from 'rxjs';

import {PluginContext} from 'molstar/lib/mol-plugin/context';
import {PluginLayoutControlsDisplay, PluginLayoutStateProps} from 'molstar/lib/mol-plugin/layout';
import {StructureComponentRef} from 'molstar/lib/mol-plugin-state/manager/structure/hierarchy-state';
import {BuiltInTrajectoryFormat, TrajectoryFormatProvider} from 'molstar/lib/mol-plugin-state/formats/trajectory';
import {PluginCommands} from 'molstar/lib/mol-plugin/commands';
import {to_mmCIF} from 'molstar/lib/mol-model/structure/export/mmcif';
import {utf8ByteCount, utf8Write} from 'molstar/lib/mol-io/common/utf8';
import { zip } from 'molstar/lib/mol-util/zip/zip';
import { SyncRuntimeContext } from 'molstar/lib/mol-task/execution/synchronous';
import { AssetManager } from 'molstar/lib/mol-util/assets';

import {testEvent} from '@datagrok-libraries/utils/src/test';
import {
  BiostructureData, BiostructureDataJson, BiostructureDataProviderFunc
} from '@datagrok-libraries/bio/src/pdb/types';
import {
  IBiostructureViewer,
  PluginLayoutControlsDisplayType,
  RegionStateOptionsType,
  SimpleRegionStateOptionsType,
} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';
import {TAGS as pdbTAGS} from '@datagrok-libraries/bio/src/pdb/index';
import {Molecule3DUnits} from '@datagrok-libraries/bio/src/molecule-3d/molecule-3d-units-handler';
import {IMolecule3DBrowser, Molecule3DData} from '@datagrok-libraries/bio/src/viewers/molecule3d';
import {PromiseSyncer} from '@datagrok-libraries/bio/src/utils/syncer';
import {ILogger} from '@datagrok-libraries/bio/src/utils/logger';
import {getDataProviderList} from '@datagrok-libraries/bio/src/utils/data-provider';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';

import {addLigandOnStage, buildSplash, LigandData, parseAndVisualsData, removeVisualsData} from './molstar-viewer-open';
import {defaults, molecule3dFileExtensions} from './consts';
import {createRcsbViewer, disposeRcsbViewer} from './utils';

import {_package} from '../../package';
import { convertWasm } from '../../conversion/wasm/converterWasm';
import { StateObjectRef } from 'molstar/lib/mol-state';
import { createStructureRepresentationParams } from 'molstar/lib/mol-plugin-state/helpers/structure-representation-params';
import { StructureRepresentationRegistry } from 'molstar/lib/mol-repr/structure/registry';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { StateElements } from 'molstar/lib/examples/proteopedia-wrapper/helpers';

// TODO: find out which extensions are needed.
/*const Extensions = {
    'cellpack': PluginSpec.Behavior(CellPack),
    'dnatco-confal-pyramids': PluginSpec.Behavior(DnatcoConfalPyramids),
    'pdbe-structure-quality-report': PluginSpec.Behavior(PDBeStructureQualityReport),
    'rcsb-assembly-symmetry': PluginSpec.Behavior(RCSBAssemblySymmetry),
    'rcsb-validation-report': PluginSpec.Behavior(RCSBValidationReport),
    'anvil-membrane-orientation': PluginSpec.Behavior(ANVILMembraneOrientation),
    'g3d': PluginSpec.Behavior(G3DFormat),
    'model-export': PluginSpec.Behavior(ModelExport),
    'mp4-export': PluginSpec.Behavior(Mp4Export),
    'geo-export': PluginSpec.Behavior(GeometryExport),
    'ma-quality-assessment': PluginSpec.Behavior(MAQualityAssessment),
};*/

const enum PROPS_CATS {
  DATA = 'Data',
  STYLE = 'Style',
  LAYOUT = 'Layout',
  CONTROLS = 'Controls',
  BEHAVIOUR = 'Behaviour',
}

export enum PROPS {
  // -- Data --
  dataJson = 'dataJson',
  pdb = 'pdb',
  pdbTag = 'pdbTag',
  ligandColumnName = 'ligandColumnName',
  // pdbProvider = 'pdbProvider',
  // emdbProvider = 'emdbProvider',
  biostructureIdColumnName = 'biostructureIdColumnName',
  /** DG.Func nqName */
  biostructureDataProvider = 'biostructureDataProvider',
  ligandValue = 'ligandValue',

  // -- Style --
  representation = 'representation',

  // --Layout --
  layoutIsExpanded = 'layoutIsExpanded',
  layoutShowControls = 'layoutShowControls',
  layoutRegionStateLeft = 'layoutRegionStateLeft',
  layoutRegionStateTop = 'layoutRegionStateTop',
  layoutRegionStateRight = 'layoutRegionStateRight',
  layoutRegionStateBottom = 'layoutRegionStateBottom',
  layoutControlsDisplay = 'layoutControlsDisplay',

  layoutShowRemoteState = 'layoutShowRemoteState',
  layoutShowSequence = 'layoutShowSequence',
  layoutShowLog = 'layoutShowLog',
  layoutShowLeftPanel = 'layoutShowLeftPanel',
  collapseLeftPanel = 'collapseLeftPanel',
  collapseRightPanel = 'collapseRightPanel',
  viewportShowExpand = 'viewportShowExpand',
  viewportShowControls = 'viewportShowControls',

  // -- Controls --
  showWelcomeToast = 'showWelcomeToast',
  showImportControls = 'showImportControls',
  // -- Behaviour --
  showSelectedRowsLigands = 'showSelectedRowsLigands',
  showCurrentRowLigand = 'showCurrentRowLigand',
  showMouseOverRowLigand = 'showMouseOverRowLigand',
  zoom = 'zoom',
}

const pdbDefault: string = '';

export type LigandMapItem = {
  rowIdx: number,
  structureRefs: Array<string> | null
};
export type LigandMap = {
  selected: LigandMapItem[],
  current: LigandMapItem | null,
  hovered: LigandMapItem | null,
};

export const DebounceIntervals = {
  setData: 20,
  currentRow: 20,
  ligands: 20,
};

export type LigandValueData = {
  value: string,
  semType: string,
  units: string,
}

export class MolstarViewer extends DG.JsViewer implements IBiostructureViewer, IMolecule3DBrowser {
  private viewed: boolean = false;

  // -- Data --
  dataJson: string;
  pdb: string;
  pdbTag: string;

  /** Column name */
  biostructureIdColumnName: string | null;
  /** DG.Func nqName */
  biostructureDataProvider: string | null;

  [PROPS.ligandColumnName]: string;
  // [PROPS.pdbProvider]: string;
  // [PROPS.emdbProvider]: string;
  [PROPS.ligandValue]: string;

  // --Style --
  [PROPS.representation]: string;

  // -- Layout --
  [PROPS.layoutIsExpanded]: boolean;
  [PROPS.layoutShowControls]: boolean;
  [PROPS.layoutRegionStateLeft]: RegionStateOptionsType;
  [PROPS.layoutRegionStateTop]: SimpleRegionStateOptionsType;
  [PROPS.layoutRegionStateRight]: SimpleRegionStateOptionsType;
  [PROPS.layoutRegionStateBottom]: SimpleRegionStateOptionsType;
  [PROPS.layoutControlsDisplay]: string;

  [PROPS.layoutShowRemoteState]: boolean;
  [PROPS.layoutShowSequence]: boolean;
  [PROPS.layoutShowLog]: boolean;
  [PROPS.layoutShowLeftPanel]: boolean;
  [PROPS.collapseLeftPanel]: boolean;
  [PROPS.collapseRightPanel]: boolean;
  [PROPS.viewportShowExpand]: boolean;
  [PROPS.viewportShowControls]: boolean;

  // -- Controls --
  [PROPS.showWelcomeToast]: boolean;
  [PROPS.showImportControls]: boolean;

  // -- Behaviour --
  [PROPS.showSelectedRowsLigands]: boolean;
  [PROPS.showCurrentRowLigand]: boolean;
  [PROPS.showMouseOverRowLigand]: boolean;
  // propsEngine = new class {
  //
  // }(this);
  [PROPS.zoom]: boolean;

  constructor() {
    super();

    this.helpUrl = '/help/visualize/viewers/biostructure';

    // -- Data --
    this.dataJson = this.string(PROPS.dataJson, defaults.dataJson, {
      category: PROPS_CATS.DATA, userEditable: false,
      description: 'JSON encoded object of BiostructureData type with data value Base64 encoded data',
    });
    this.pdb = this.string(PROPS.pdb, pdbDefault,
      {category: PROPS_CATS.DATA, userEditable: false});
    this.pdbTag = this.string(PROPS.pdbTag, defaults.pdbTag,
      {category: PROPS_CATS.DATA, choices: []});

    this.biostructureIdColumnName = this.string(PROPS.biostructureIdColumnName, defaults.biostructureIdColumnName,
      {category: PROPS_CATS.DATA});
    this.biostructureDataProvider = this.string(PROPS.biostructureDataProvider, defaults.biostructureDataProvider,
      {category: PROPS_CATS.DATA, /* fill choices in setData() */});
    
    this.ligandColumnName = this.string(PROPS.ligandColumnName, defaults.ligandColumnName,
      {category: PROPS_CATS.DATA, semType: DG.SEMTYPE.MOLECULE});
    // this.pdbProvider = this.string(PROPS.pdbProvider, defaults.pdbProvider,
    //   {category: PROPS_CATS.DATA});
    // this.emdbProvider = this.string(PROPS.emdbProvider, defaults.emdbProvider,
    //   {category: PROPS_CATS.DATA});
    this.ligandValue = this.string(PROPS.ligandValue, null, {category: PROPS_CATS.DATA, userEditable: false});

    // -- Layout --
    this.layoutIsExpanded = this.bool(PROPS.layoutIsExpanded, defaults.layoutIsExpanded,
      {category: PROPS_CATS.LAYOUT});
    this.layoutShowControls = this.bool(PROPS.layoutShowControls, defaults.layoutShowControls,
      {category: PROPS_CATS.LAYOUT});
    this.layoutRegionStateLeft = this.string(PROPS.layoutRegionStateLeft, defaults.layoutRegionStateLeft,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(RegionStateOptionsType)}) as RegionStateOptionsType;
    this.layoutRegionStateTop = this.string(PROPS.layoutRegionStateTop, defaults.layoutRegionStateTop,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(SimpleRegionStateOptionsType)},
    ) as SimpleRegionStateOptionsType;
    this.layoutRegionStateRight = this.string(PROPS.layoutRegionStateRight, defaults.layoutRegionStateRight,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(SimpleRegionStateOptionsType)},
    ) as SimpleRegionStateOptionsType;
    this.layoutRegionStateBottom = this.string(PROPS.layoutRegionStateBottom, defaults.layoutRegionStateBottom,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(SimpleRegionStateOptionsType)},
    ) as SimpleRegionStateOptionsType;
    this.layoutControlsDisplay = this.string(PROPS.layoutControlsDisplay, defaults.layoutControlsDisplay,
      {category: PROPS_CATS.LAYOUT, choices: Object.values(PluginLayoutControlsDisplayType)});

    this.layoutShowRemoteState = this.bool(PROPS.layoutShowRemoteState, defaults.layoutShowRemoteState,
      {category: PROPS_CATS.LAYOUT});
    this.layoutShowSequence = this.bool(PROPS.layoutShowSequence, defaults.layoutShowSequence,
      {category: PROPS_CATS.LAYOUT});
    this.layoutShowLog = this.bool(PROPS.layoutShowLog, defaults.layoutShowLog,
      {category: PROPS_CATS.LAYOUT});
    this.layoutShowLeftPanel = this.bool(PROPS.layoutShowLeftPanel, defaults.layoutShowLeftPanel,
      {category: PROPS_CATS.LAYOUT});
    this.collapseLeftPanel = this.bool(PROPS.collapseLeftPanel, defaults.collapseLeftPanel,
      {category: PROPS_CATS.LAYOUT});
    this.collapseRightPanel = this.bool(PROPS.collapseRightPanel, defaults.collapseRightPanel,
      {category: PROPS_CATS.LAYOUT});
    this.viewportShowExpand = this.bool(PROPS.viewportShowExpand, defaults.viewportShowExpand,
      {category: PROPS_CATS.LAYOUT});
    this.viewportShowControls = this.bool(PROPS.viewportShowControls, defaults.viewportShowControls,
      {category: PROPS_CATS.LAYOUT});

    // -- Controls --
    this.showWelcomeToast = this.bool(PROPS.showWelcomeToast, defaults.showWelcomeToast,
      {category: PROPS_CATS.CONTROLS});
    this.showImportControls = this.bool(PROPS.showImportControls, defaults.showImportControls,
      {category: PROPS_CATS.CONTROLS});

    // -- Behaviour --
    this.showSelectedRowsLigands = this.bool(PROPS.showSelectedRowsLigands, false,
      {category: PROPS_CATS.BEHAVIOUR});
    this.showCurrentRowLigand = this.bool(PROPS.showCurrentRowLigand, true,
      {category: PROPS_CATS.BEHAVIOUR});
    this.showMouseOverRowLigand = this.bool(PROPS.showMouseOverRowLigand, true,
      {category: PROPS_CATS.BEHAVIOUR});

    // -- Style --
    this.representation = this.string(PROPS.representation, defaults.representation,
      {category: PROPS_CATS.STYLE, choices: Object.keys(StructureRepresentationRegistry.BuiltIn)});

    // --
    this.zoom = this.bool(PROPS.zoom, false, {userEditable: false});
    this.root.style.textAlign = 'center';

    this.logger = _package.logger;
    this.viewSyncer = new PromiseSyncer(this.logger);

    this.setDataRequest = new Subject<void>();
    this.subs.push(DG.debounce(this.setDataRequest, DebounceIntervals.setData)
      .subscribe(() => { this.onSetDataRequestDebounced(); }));
    this.viewSubs.push(this.onContextMenu.subscribe(this.onContextMenuHandler.bind(this)));
    this._initButtonExpand();
    this._initMenu();
  }

  private static viewerCounter: number = -1;
  private readonly viewerId: number = ++MolstarViewer.viewerCounter;

  private _initButtonExpand() {
    const button = $('.msp-btn.msp-btn-icon.msp-btn-link-toggle-off');
    button.on('click',  () => this.root.requestFullscreen());
  }

  private async _initProps() {
    if (!this.dataFrame || this.dataJson) return;

    // -- Pdb or Pdb Id --
    if (!this.biostructureIdColumnName) {
      const pdbCol = this.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE3D) || this.dataFrame.columns.bySemType(DG.SEMTYPE.PDB_ID);
      if (pdbCol) {
        this.biostructureIdColumnName = pdbCol.name;

        if (pdbCol.semType === DG.SEMTYPE.PDB_ID) {
          const funcs = await getDataProviderList(DG.SEMTYPE.MOLECULE3D);
          this.biostructureDataProvider = funcs[0]?.nqName;
        }
      }
    }

    // -- Ligand --
    if (!this.ligandColumnName) {
      const molCol = this.dataFrame.columns.bySemType(DG.SEMTYPE.MOLECULE);
      if (molCol)
        this.ligandColumnName = molCol.name;
    }
  }

  private viewerToLog(): string { return `MolstarViewer<${this.viewerId}>`; }

  override onPropertyChanged(property: DG.Property | null): void {
    const logIndent: number = 0;
    const callLog: string = `onPropertyChanged( '${property?.name}' )`;
    const logPrefix: string = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);
    super.onPropertyChanged(property);

    if (!property) {
      this.logger.debug(`${logPrefix}, property is null`);
      return;
    }

    // const setPropsLayout = (props: Partial<RcsbViewerProps>) => {
    //   Object.assign(this.viewerLayoutState, props);
    //   if (this.viewer) {
    //     const viewerPlugin: PluginContext = this.viewer.getPlugin();
    //     viewerPlugin.layout.setProps();
    //
    //     // for (const propName in props) {
    //     //   const propValue: any = (props as { [propName: string]: any })[propName];
    //     //   this.viewer.customState[propName] = propValue;
    //     // }
    //   }
    // };
    const applyProperty = async (_propName: string, _value: any) => {
      this.logger.debug(`${logPrefix}.applyProperty(), start`);

      if (!this.viewer) throw new Error('viewer does not exists');

      const plugin: PluginContext = this.viewer.plugin;
      const state: Partial<PluginLayoutStateProps> = {};
      switch (property.name) {
        case PROPS.layoutShowLog: {
          // PluginCommands.Layout.Update(plugin, );
          const _k = 11;
          break;
        }
        case PROPS.layoutShowControls: {
          state.showControls = this.layoutShowControls;
          break;
        }
        case PROPS.layoutIsExpanded: {
          state.isExpanded = this.layoutIsExpanded;
          break;
        }
        case PROPS.layoutRegionStateLeft:
        case PROPS.layoutRegionStateTop:
        case PROPS.layoutRegionStateRight:
        case PROPS.layoutRegionStateBottom: {
          state.regionState = {
            left: this.layoutRegionStateLeft,
            top: this.layoutRegionStateTop,
            right: this.layoutRegionStateRight,
            bottom: this.layoutRegionStateBottom,
          };
          break;
        }
        case PROPS.layoutControlsDisplay: {
          state.controlsDisplay = this.layoutControlsDisplay as PluginLayoutControlsDisplay;
          break;
        }
        // case PROPS.viewportShowExpand: {
        //   await PluginCommands.State.ToggleExpanded(plugin,
        //     {state: {isExpanded: this.viewportShowExpand}})
        //   break;
        // }
      }
      //eslint-disable-next-line new-cap
      await PluginCommands.Layout.Update(plugin, {state: state});
      this.logger.debug(`${logPrefix}.applyProperty(), end`);
    };

    // Type checks
    switch (property.name) {
      case PROPS.dataJson: {
        if (typeof this.dataJson !== 'string')
          throw new Error(`Property '${property.name}' value is of invalid type '${typeof this.dataJson}'.`);
        break;
      }
    }

    switch (property.name) {
      case PROPS.biostructureDataProvider: {
        // reset for setData
        this.biostructureDataProviderFunc = null;
        break;
      }
      case PROPS.pdb:
      case PROPS.dataJson: {
        // reset for setData
        this.dataEff = null;
        break;
      }

      case PROPS.representation: {
        const checkAndUpdate = () => {
          if (!this.setDataInProgress && this.viewer)
            this.updateView(this.representation);
          else
            requestAnimationFrame(checkAndUpdate);
        };
        checkAndUpdate();
        break;
      }
      
      case PROPS.showImportControls:
        break;
      case PROPS.layoutIsExpanded:
        this.viewerProps[PROPS.layoutIsExpanded] = this.layoutIsExpanded;
        break;
      case PROPS.showSelectedRowsLigands:
      case PROPS.showCurrentRowLigand:
      case PROPS.showMouseOverRowLigand:
        this.onRebuildViewLigandsRequest.next();
        break;
    }

    const propName: string = property.name;
    const propValue: any = this.props.get(propName);
    this.viewSyncer.sync(logPrefix, async () => {
      if (this.viewer)
        await applyProperty(propName, propValue);
    });

    switch (property.name) {
      case PROPS.dataJson:
      case PROPS.pdb:
      case PROPS.pdbTag:
      case PROPS.biostructureDataProvider:
      case PROPS.biostructureIdColumnName:
      case PROPS.ligandValue:
      case PROPS.ligandColumnName: {
        this.setData(logIndent + 1, callLog);
        break;
      }
    }
    this.logger.debug(`${logPrefix}, end`);
  }

  // effective PDB value (to plot)
  /** {@link IBiostructureViewer.dataEff} */
  public dataEff: BiostructureData | null = null;
  private dataEffStructureRefs: string[] | null = null;

  private biostructureDataProviderList: DG.Func[] = [];
  private biostructureDataProviderFunc: DG.Func | null = null;

  override onTableAttached(): void {
    const logIndent: number = 0;
    const callLog = 'onTableAttached()';
    const logPrefix: string = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    const superOnTableAttached = super.onTableAttached.bind(this);

    // -- Props editors --
    const dfTagNameList = wu<string>(this.dataFrame.tags.keys())
      .filter((tagName: string) => tagName.startsWith('.')).toArray();
    this.props.getProperty(PROPS.pdbTag).choices = ['', ...dfTagNameList];

    // Update biostructureDataProviderList in queue before setData, sync handles error also
    // TODO: Optimize
    this.viewSyncer.sync(logPrefix, async () => {
      this.biostructureDataProviderList = await getDataProviderList(DG.SEMTYPE.MOLECULE3D);
      this.props.getProperty(PROPS.biostructureDataProvider).choices =
        ['', ...this.biostructureDataProviderList.map((f) => f.nqName)];
    });
    this._initProps();

    //this.subs.push(this.onContextMenu.subscribe(this.onContextMenuHandler.bind(this)));

    superOnTableAttached();
    this.setData(logIndent + 1, callLog);
    ui.tools.waitForElementInDom(this.root).then(() => this.initializeResizeHandling());
    this.logger.debug(`${logPrefix}, end`);
  }
  
  initializeResizeHandling(): void {
    const dialogPanel = this.root.closest('.dialog-floating') as HTMLElement;
    const accPanel = this.root.closest('.d4-accordion-pane-content') as HTMLElement;
    const resizeTarget = dialogPanel || accPanel;
    
    if (!resizeTarget) return;
    
    const setDimensions = (element: HTMLElement | null, width: number, height: number) => {
      if (element) {
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
      }
    };
    
    const resizeCanvasAndViewer = (width: number, height: number) => {
      const canvas = this.viewer?.plugin.canvas3dContext?.canvas;
      setDimensions(this.viewerDiv!, width, height);
      if (canvas)
        setDimensions(canvas, width, height);
      this.viewer?.plugin.canvas3d?.handleResize();
      this.viewer?.plugin.handleResize();
    };
    
    this.subs.push(ui.onSizeChanged(resizeTarget).subscribe(() => {
      const width = resizeTarget.clientWidth;
      const height = resizeTarget.clientHeight;

      if (dialogPanel) {
        setDimensions(this.root, width, height);
        resizeCanvasAndViewer(width, height);

        const waitParentEl = this.root.parentElement;
        if (waitParentEl?.classList.contains('grok-wait'))
          setDimensions(waitParentEl, width, height);
      }

      if (accPanel)
        resizeCanvasAndViewer(width, height);
    }))
  }

  override detach(): void {
    const logIndent: number = 0;
    const callLog: string = `detach()`;
    const logPrefix: string = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    const superDetach = super.detach.bind(this);
    this.viewSyncer.sync(logPrefix, async () => { // detach
      if (this.setDataInProgress) return; // check setDataInProgress synced
      if (this.viewed) {
        await this.destroyView(true, logIndent + 1, callLog);
        this.viewed = false;
      }
      superDetach();
    });
    this.logger.debug(`${logPrefix}, end`);
  }

  _initMenu(): void {
    this.root.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const menu = DG.Menu.popup();
      this.onContextMenuHandler(menu);
      menu.show();
    };
  }

  onContextMenuHandler(menu: DG.Menu): void {
    menu
      .group('Download')
      .item('As CIF', async () => await this.writeToFormat('cif'))
      .item('As PDB', async () => await this.writeToFormat('pdb'));
  }

  async writeToFormat(format: 'cif' | 'pdb') {
    const fileName = 'file';
    const { structures } = this.viewer!.plugin.managers.structure.hierarchy.current;
    const _s = structures[0];
    const s = _s.transform?.cell.obj?.data ?? _s.cell.obj?.data;
    const cif = to_mmCIF(fileName, s!) as string;
    
    if (format === 'cif')
      DG.Utils.download(`${fileName}.cif`, cif);
    else if (format === 'pdb') {
      const pdb = await convertWasm(cif);
      DG.Utils.download(`${fileName}.pdb`, pdb);
    }
  }
  
  async _exportHierarchy(plugin: PluginContext, options?: { format?: 'cif' }) {
    const format = options?.format ?? 'cif';
    const { structures } = plugin.managers.structure.hierarchy.current;
    const files: [name: string, data: string | Uint8Array][] = [];
    const entryMap = new Map<string, number>();
    for (const _s of structures) {
      const s = _s.transform?.cell.obj?.data ?? _s.cell.obj?.data;
      if (!s) continue;
      const name = s.model.entryId || 'unnamed';

      const fileName = entryMap.has(name)
        ? `${name}_${entryMap.get(name)! + 1}.${format}`
        : `${name}.${format}`;
      entryMap.set(name, (entryMap.get(name) ?? 0) + 1);

      if (s.elementCount > 100000)
        await new Promise(res => setTimeout(res, 50));

      try {
        files.push([fileName, to_mmCIF(name, s)]);
      } catch (e) {
        this.logger.error(e);
      }
    }
    
    var blob;
    if (files.length === 1)
      blob = new Blob([files[0][1]]), files[0][0];
    else if (files.length > 1) {
      const zipData: Record<string, Uint8Array> = {};
      for (const [fn, data] of files) {
        if (data instanceof Uint8Array)
          zipData[fn] = data;
        else {
          const bytes = new Uint8Array(utf8ByteCount(data));
          utf8Write(bytes, 0, data);
          zipData[fn] = bytes;
        }
      }
      const assetManager = new AssetManager();
      const ctx = { runtime: SyncRuntimeContext, assetManager };
      const buffer = await zip(ctx.runtime, zipData);
      blob = new Blob([new Uint8Array(buffer, 0, buffer.byteLength)]);
    }
    return await blob?.text();
  }

  // -- Data --

  private _setDataCallCounter = -1;

  private setDataRequest: Subject<void>;

  setData(logIndent: number, caller: string): void {
    const callLog = `setData( <- ${caller})`;
    this.logger.debug(`${margin(logIndent)}${this.viewerToLog()}.${callLog}`);
    this.setDataRequest.next();
  }

  onSetDataRequestDebounced(): void {
    const logIndent: number = 0;
    const callId = ++this._setDataCallCounter;
    const callLog = `onSetDataRequestDebounced( callId = ${callId} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    this.viewSyncer.sync(logPrefix, async () => { // setData
      if (!this.setDataInProgress) this.setDataInProgress = true; else return; // check setDataInProgress synced
      try {
        if (this.viewed) {
          await this.destroyView(false, 1, callLog);
          this.viewed = false;
        }

        // -- PDB data --
        this.dataEff = null;
        let pdbTagName: string = pdbTAGS.PDB;
        let pdb: string | null = null;
        if (this.pdbTag) pdbTagName = this.pdbTag;
        if (this.dataFrame && this.dataFrame.tags.has(pdbTagName)) pdb = this.dataFrame.getTag(pdbTagName);
        if (this.pdb) pdb = this.pdb;
        if (pdb && pdb != pdbDefault)
          this.dataEff = {binary: false, ext: 'pdb', data: pdb!};
        if (this.dataJson && this.dataJson !== BiostructureDataJson.empty) {
          this.dataEff = BiostructureDataJson.toData(this.dataJson);
        }
        if (this.biostructureDataProvider) {
          if (!this.biostructureDataProviderFunc) {
            this.biostructureDataProviderFunc = this.biostructureDataProviderList
              .find((f) => f.nqName === this.biostructureDataProvider) ?? null;
          }
        }

        if (!this.viewed) {
          await this.buildView(1, callLog);
          this.viewed = true;
        }
      } finally {
        this.setDataInProgress = false;
      }
    });
    this.logger.debug(`${logPrefix}, end`);
  }

  // -- View --

  private readonly logger: ILogger;
  private readonly viewSyncer: PromiseSyncer;
  private setDataInProgress: boolean = false;

  private viewerDiv?: HTMLDivElement;
  private viewer?: RcsbViewer;

  /** Container to store prop values while {@link viewer} is not created yet */
  private viewerProps: Partial<RcsbViewerProps> = {
    [PROPS.layoutShowControls]: false,
    [PROPS.showWelcomeToast]: false,
  };

  private splashDiv?: HTMLDivElement;
  private viewSubs: Unsubscribable[] = [];
  private onRebuildViewLigandsRequest: Subject<void> = new Subject<void>();

  private async destroyView(free: boolean, logIndent: number, caller: string): Promise<void> {
    const callLog: string = `destroyView( <- ${caller} )`;
    const logPrefix: string = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start `);

    for (const sub of this.viewSubs) sub.unsubscribe();
    this.viewSubs = [];

    if (this.splashDiv) {
      $(this.splashDiv).empty();
      this.splashDiv.remove();
      delete this.splashDiv;
    }

    if (this.dataFrame && this.ligandColumnName)
      await this.destroyViewLigands(logIndent + 1, callLog);

    if (free /* detach */) {
      if (this.viewerDiv) {
        // Clear viewer
        // await this.viewer.clear();
        await disposeRcsbViewer(this.viewer!, this.viewerDiv);
        delete this.viewer;
        this.viewerDiv.remove();
        delete this.viewerDiv;
      }
    } else {
      if (this.dataEffStructureRefs && this.viewer?.plugin)
        await removeVisualsData(this.viewer!.plugin, this.dataEffStructureRefs, callLog);
    }
    this.logger.debug(`${logPrefix}, end `);
  }

  private async buildView(logIndent: number, caller: string): Promise<void> {
    const callLog: string = `buildView( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}}`;
    this.logger.debug(`${logPrefix}, start `);

    if (!this.dataEff && (!this.dataFrame || !this.biostructureDataProvider && !this.biostructureIdColumnName))
      await this.buildViewWithoutData(logIndent + 1, callLog);
    else
      await this.buildViewWithData(logIndent + 1, callLog);

    this.logger.debug(`${logPrefix}, end `);
  }

  /** Gets structure for the current row from the data provider and displays it. */
  private async rebuildViewCurrentRow(
    oldStructureRefs: string[] | null, newCurrentRowIdx: number, logIndent: number, caller: string
  ): Promise<[BiostructureData, string[]]> {
    const callLog = `rebuildViewCurrentRow( <- ${caller}, currentRowIdx = ${newCurrentRowIdx} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;

    if (!this.viewer)
      this.logger.warning(`${logPrefix}, no viewer`);

    const col = this.dataFrame.getCol(this.biostructureIdColumnName!);
    const id = col.get(newCurrentRowIdx);
    const splash = buildSplash(this.root, `Loading data of '${id}'.`);
    try {
      // while loading the next, the previous structure is covered by splash
      const dataString = col.semType === DG.SEMTYPE.MOLECULE3D
        ? BiostructureDataJson.fromData({ binary: false, data: id, ext: 'pdb' })
        : await (async () => {
          const fetchData = await this.biostructureDataProviderFunc!.prepare({ id }).call();
          return fetchData.getOutputParamValue() as string;
        })();
      
      const dataEff = BiostructureDataJson.toData(dataString);
      const plugin = this.viewer!.plugin;
      await this.destroyViewLigands(0, callLog);
      await removeVisualsData(plugin, oldStructureRefs, callLog);
      const newStructureRefs: string[] = await parseAndVisualsData(plugin, dataEff, callLog);
      await this.buildViewLigands(0, callLog);
      return [dataEff, newStructureRefs];
    } finally {
      splash.close();
    }
  }

  private async buildViewWithData(logIndent: number, caller: string): Promise<void> {
    const callLog: string = `buildViewWithData( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    // Fill in viewer
    if (!this.viewerDiv) {
      this.viewerDiv = ui.div([], {
        classes: 'd4-molstar-viewer',
        style: {width: '100%', height: '100%'},
      });
      this.root.style.overflow = 'hidden'; /* Prevent blinking viewer size changed */
      this.root.appendChild(this.viewerDiv);
      this.viewSubs.push(ui.onSizeChanged(this.root).subscribe(
        this.rootOnSizeChanged.bind(this)));

      const props: Partial<RcsbViewerProps> = {};

      Object.assign(props, this.viewerProps);
      // this.viewer = new RcsbViewer(this.viewerDiv, props);
      this.viewer = await createRcsbViewer(this.viewerDiv, props);
    }
    if (!this.viewer) throw new Error(`The 'viewer' is not created.`);

    const plugin = this.viewer.plugin;
    this.viewSubs.push(plugin.commands.subscribe(PluginCommands.Layout.Update, () => {

    }));

    const isPdbColumn = this.biostructureIdColumnName
      ? this.dataFrame.getCol(this.biostructureIdColumnName).semType === DG.SEMTYPE.MOLECULE3D
      : false;
      
    const hasValidDataProvider = this.biostructureDataProviderFunc && !isPdbColumn;
    if (this.dataFrame && (hasValidDataProvider || isPdbColumn)) {
      this.viewSubs.push(DG.debounce(this.dataFrame.onCurrentRowChanged, DebounceIntervals.currentRow).subscribe(
        this.dataFrameOnCurrentRowChangedDebounced.bind(this)));
      [this.dataEff, this.dataEffStructureRefs] = await this.rebuildViewCurrentRow(
        null, this.dataFrame.currentRowIdx, logIndent + 1, callLog);
    } else if (this.dataEff) {
      // display a structure of this.dataEff
      this.dataEffStructureRefs = await parseAndVisualsData(plugin, this.dataEff, callLog);
    }

    if (this.dataEff) {
      if (!(this.dataEff.ext in molecule3dFileExtensions))
        throw new Error(`Unsupported file extension '${this.dataEff.ext}'.`);

      if (this.dataFrame && this.ligandColumnName) {
        this.viewSubs.push(this.dataFrame.onSelectionChanged.subscribe(
          this.dataFrameOnSelectionChanged.bind(this)));
        this.viewSubs.push(this.dataFrame.onCurrentRowChanged.subscribe(
          this.dataFrameOnCurrentRowChanged.bind(this)));
        this.viewSubs.push(this.dataFrame.onMouseOverRowChanged.subscribe(
          this.dataFrameOnMouseOverRowChanged.bind(this)));
        this.viewSubs.push(DG.debounce(this.onRebuildViewLigandsRequest, DebounceIntervals.ligands).subscribe(
          this.onRebuildViewLigandsDebounced.bind(this)));
        await this.buildViewLigands(logIndent, callLog);
      }
    }

    this.logger.debug(`${logPrefix}, end`);
  }

  private async buildViewWithoutData(logIndent: number, caller: string) {
    const callLog: string = `buildViewWithoutData( <- ${caller} )`;
    const logPrefix: string = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    if (this.viewerDiv) {
      await disposeRcsbViewer(this.viewer!, this.viewerDiv);
      delete this.viewer;
      this.viewerDiv.remove();
      delete this.viewerDiv;
    }

    const dataFileProp = DG.Property.fromOptions({name: 'dataFile', caption: 'Data file', type: 'file'});
    const dataFileInput = DG.InputBase.forProperty(dataFileProp);
    dataFileInput.captionLabel.innerText = 'Data file';
    this.viewSubs.push(dataFileInput.onChanged.subscribe(async () => {
      const dataFi: DG.FileInfo = dataFileInput.value;
      const dataA: Uint8Array = dataFi.data ? dataFi.data /* User's file*/ : await dataFi.readAsBytes()/* Shares */;
      const data: BiostructureData = {binary: true, ext: dataFi.extension, data: dataA};
      this.setOptions({
        [PROPS.dataJson]: BiostructureDataJson.fromData(data),
      });
      // openBtn.disabled = !(dataFi && (dataFi.data || dataFi.url));
    }));
    this.splashDiv = ui.div(
      ui.divV([dataFileInput]/*, openBtn*/),
      {classes: 'bsv-viewer-splash'} /* splash */);
    this.root.appendChild(this.splashDiv);
    this.logger.debug(`${logPrefix}, end`);
  }

  private async updateView(type: any) {
    const entries = this.viewer!.plugin.managers.structure.selection.entries;
    const state = this.viewer!.plugin.state;
    entries.forEach(async ({ selection }, ref) => {
      const cell = StateObjectRef.resolveAndCheck(state!.data, ref);
      if (cell) {
        const components = this.viewer!.plugin.build().to(cell)
        const repr = createStructureRepresentationParams(this.viewer!.plugin, void 0, {
          type: type
        });
        components.applyOrUpdate(StateElements.SequenceVisual, StateTransforms.Representation.StructureRepresentation3D, repr);
        await components.commit();
      }
    });
  }  

  private calcSize(logIndent: number, caller: string): void {
    const callLog = `calcSize( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    const cw: number = this.root.clientWidth;
    const ch: number = this.root.clientHeight;

    if (this.viewerDiv && this.viewer) {
      this.viewerDiv.style.width = `${cw}px`;
      this.viewerDiv.style.height = `${ch}px`;
      this.viewer.handleResize();
    }

    if (this.splashDiv) {
      this.splashDiv.style.width = `${cw}px`;
      this.splashDiv.style.height = `${ch}px`;
      this.splashDiv.style.lineHeight = `${ch}px`;
    }
    this.logger.debug(`${logPrefix}, end`);
  }

  // -- Handle events --

  private rootOnSizeChanged(_value: any): void {
    const logIndent: number = 0;
    const callLog = `rootOnSizeChanged()`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);
    this.calcSize(logIndent + 1, callLog);
    this.logger.debug(`${logPrefix}, end`);
  }

  private dataFrameOnCurrentRowChangedDebounced(_value: any): void {
    const logIndent: number = 0;
    const oldStructureRefs: string[] | null = this.dataEffStructureRefs;
    const newCurrentRowIdx = this.dataFrame.currentRowIdx;
    const callLog = `dataFrameOnCurrentRowChangedDebounced( newCurrentRowIdx = ${newCurrentRowIdx} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.viewSyncer.sync(logPrefix, async () => {
      [this.dataEff, this.dataEffStructureRefs] = await this.rebuildViewCurrentRow(
        oldStructureRefs, newCurrentRowIdx, 0, callLog);
    });
  }

  private dataFrameOnSelectionChanged(_value: any): void {
    this.logger.debug(`${this.viewerToLog()}.dataFrameOnSelectionChanged() `);
    this.onRebuildViewLigandsRequest.next();
  }

  private dataFrameOnCurrentRowChanged(_value: any): void {
    this.logger.debug(`${this.viewerToLog()}.dataFrameOnCurrentRowChanged() `);
    this.onRebuildViewLigandsRequest.next();
  }

  private dataFrameOnMouseOverRowChanged(_value: any): void {
    this.logger.debug(`${this.viewerToLog()}.dataFrameOnMouseOverRowChanged() `);
    this.onRebuildViewLigandsRequest.next();
  }

  private onRebuildViewLigandsDebounced(): void {
    const callLog = `onRebuildViewLigandsDebounced()`;
    this.logger.debug(`${this.viewerToLog()}.${callLog} `);
    this.rebuildViewLigands(0, callLog);
  }

  // -- Ligands routines --

  public ligands: LigandMap = {selected: [], current: null, hovered: null};

  /** Unify get mol* component key/ref, not static for performance
   * @param {StructureComponentRef} comp
   * @return {string | null} */
  getCompKey(comp: StructureComponentRef): string | null {
    return comp.cell.sourceRef ?? null; // comp.version
  }

  private getLigandStr(rowIdx: number): LigandData {
    if (!this.dataFrame || !this.ligandColumnName)
      throw new Error(`${this.viewerToLog()}.getLigandStr(), no dataFrame or ligandColumnName`);

    const ligandCol: DG.Column = this.dataFrame.getCol(this.ligandColumnName);
    const ligandObject: LigandValueData = this.ligandValue ? JSON.parse(this.ligandValue) : {};
    const ligandUnits: string = ligandObject.units ?? ligandCol.meta.units;
    const ligandCellValue: string = ligandObject.value ?? ligandCol.get(rowIdx);
    const ligandSemType: string = ligandObject.semType ?? ligandCol.semType;
    let ligandValue: string;
    let ligandFormat: BuiltInTrajectoryFormat | TrajectoryFormatProvider;
    switch (ligandSemType) {
      case DG.SEMTYPE.MOLECULE: {
        switch (ligandUnits) {
          default: {
            ligandFormat = 'sdf';
            ligandValue = ligandCellValue + '$$$$';
          }
        }
        break;
      }

      case DG.SEMTYPE.MOLECULE3D: {
        switch (ligandUnits) {
          case Molecule3DUnits.pdb: {
            ligandFormat = 'pdb';
            ligandValue = ligandCellValue;
            break;
          }
          case Molecule3DUnits.pdbqt: {
            ligandFormat = 'pdbqt';
            ligandValue = ligandCellValue;
            break;
          }
          default:
            throw new Error(`Unsupported units '${ligandUnits}' of '${DG.SEMTYPE.MOLECULE3D}' ligand.`);
        }
        break;
      }

      default:
        throw new Error(`Unsupported ligand semantic type '${ligandSemType}'.`);
    }
    // const ligandBlob: Blob = new Blob([ligandStr], {type: 'text/plain'});
    // return ligandBlob;
    return {data: ligandValue, format: ligandFormat, rowIdx: rowIdx};
  }

  private rebuildViewLigands(logIndent: number, caller: string): void {
    const callLog = `rebuildViewLigands( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.viewSyncer.sync(`${logPrefix}`, async () => {
      await this.destroyViewLigands(0, callLog);
      await this.buildViewLigands(0, callLog);
    });
  }

  private async destroyViewLigands(logIndent: number, caller: string): Promise<void> {
    const callLog = `destroyViewLigands( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start`);

    if (!this.viewer) throw new Error('The viewer is not created'); // return; // There is not PDB data
    if (!this.ligandColumnName) return;

    const allLigands: LigandMapItem[] = [
      ...this.ligands.selected,
      ...(this.ligands.current ? [this.ligands.current] : []),
      ...(this.ligands.hovered ? [this.ligands.hovered] : []),
    ];

    for (const ligand of allLigands) {
      if (!ligand.structureRefs) continue;
      await removeVisualsData(this.viewer!.plugin, ligand.structureRefs, callLog);
    }
    for (const ligand of allLigands) ligand.structureRefs = null; // unbind with this.stage.compList

    this.logger.debug(`${logPrefix}, end`);
  }

  /** Builds up ligands on the stage view with postponed sync */
  private async buildViewLigands(logIndent: number, caller: string): Promise<void> {
    const callLog = `buildViewLigands( <- ${caller} )`;
    const logPrefix = `${margin(logIndent)}${this.viewerToLog()}.${callLog}`;
    this.logger.debug(`${logPrefix}, start `);

    if (!this.viewer) throw new Error('The mol* viewer is not created'); // return; // There is not PDB data
    if (!this.dataFrame || !this.ligandColumnName) return;

    const newLigands: LigandMap = {selected: [], current: null, hovered: null};
    newLigands.selected = !this.showSelectedRowsLigands ? [] :
      wu(this.dataFrame.selection.getSelectedIndexes())
        .take(25)
        .map((selRowIdx) => { return {rowIdx: selRowIdx, structureRefs: null}; })
        .toArray();
    newLigands.current = !this.showCurrentRowLigand ? null :
      this.dataFrame.currentRowIdx >= 0 ? {rowIdx: this.dataFrame.currentRowIdx, structureRefs: null} : null;
    newLigands.hovered = !this.showMouseOverRowLigand ? null :
      this.dataFrame.mouseOverRowIdx >= 0 ? {rowIdx: this.dataFrame.mouseOverRowIdx, structureRefs: null} : null;

    const plugin = this.viewer!.plugin;
    const ligandTaskList: (() => Promise<void>)[] = [];

    const selCount = newLigands.selected.length;
    for (const [selectedLigand, selI] of wu.enumerate(newLigands.selected)) {
      const color =
        this.showCurrentRowLigand || this.showMouseOverRowLigand ?
          (selCount > 1 ? DG.Color.selectedRows : null) :
          (selCount > 1 ? DG.Color.scaleColor(selI, 0, selCount, 0.5) : null);

      const selectedLigandData = this.getLigandStr(selectedLigand.rowIdx);
      ligandTaskList.push(async () => {
        selectedLigand.structureRefs = await addLigandOnStage(plugin, selectedLigandData, color, this.zoom);
      });
    }
    if (newLigands.current) {
      const color = this.showSelectedRowsLigands ? DG.Color.currentRow : null;

      const currentLigandData = this.getLigandStr(newLigands.current.rowIdx);
      const currentLigand = newLigands.current;
      ligandTaskList.push(async () => {
        currentLigand.structureRefs = await addLigandOnStage(plugin, currentLigandData, color, this.zoom);
      });
    }
    if (newLigands.hovered) {
      // TODO: color hovered ligand
      const color =
        this.showSelectedRowsLigands || this.showCurrentRowLigand ?
          DG.Color.mouseOverRows : null;
      const hoveredLigandData = this.getLigandStr(newLigands.hovered.rowIdx);
      const hoveredLigand = newLigands.hovered;
      ligandTaskList.push(async () => {
        hoveredLigand.structureRefs = await addLigandOnStage(plugin, hoveredLigandData, color, this.zoom);
      });
    }
    this.logger.debug(`${logPrefix},\nnewLigands = ${JSON.stringify(newLigands)}`);

    // Because of the async nature of loading structures to .viewer, the .dataFrame property can be changed (to null).
    // So collect data from the .dataFrame synchronously and then add ligands to the .viewer with postponed sync.
    await Promise.all(ligandTaskList.map(async (task) => task())).then(() => {
      this.ligands = newLigands;
    });

    this.logger.debug(`${logPrefix}, end`);
  }

  // -- IRenderer--

  private _onRendered: Subject<void> = new Subject<void>();

  get onRendered(): Observable<void> { return this._onRendered; }

  invalidate(caller?: string): void {
    const logPrefix = `${this.viewerToLog()}.invalidate(${caller ? ` <- ${caller} ` : ''})`;
    this.logger.debug(`${logPrefix}, ` + '---> put to syncer');
    // Put the event trigger in the tail of the synced calls queue.
    this.viewSyncer.sync(logPrefix, async () => {
      // update view / render
      this.logger.debug(`${logPrefix}, ` + '---> triggered _onRendered');
      this._onRendered.next();
    });
  }

  async awaitRendered(timeout: number = 10000): Promise<void> {
    const callLog = `awaitRendered( ${timeout} )`;
    const logPrefix = `${this.viewerToLog()}.${callLog}`;
    await testEvent(this._onRendered, (args) => {
      this.logger.debug(`${logPrefix}, ` + '_onRendered event caught');
    }, () => {
      this.invalidate(callLog);
    }, timeout);

    // Rethrow stored syncer error (for test purposes)
    const viewErrors = this.viewSyncer.resetErrors();
    if (viewErrors.length > 0) throw viewErrors[0];
  }

  // -- IMolecule3DBrowser --

  showStructure(data: Molecule3DData) {
    throw new Error('Not implemented');
  }
}

/** margin indent */
function margin(indent: number): string {
  return '  '.repeat(indent);
}

