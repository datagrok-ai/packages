import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import $ from 'cash-dom';
import {_rdKitModule, drawRdKitMoleculeToOffscreenCanvas} from '../utils/chem-common-rdkit';
import {getMolSafe, getQueryMolSafe} from '../utils/mol-creation_rdkit';
import {chem} from 'datagrok-api/grok';
import {InputBase, SemanticValue, SEMTYPE, toJs, TreeViewGroup, TreeViewNode, UNITS} from 'datagrok-api/dg';
import Sketcher = chem.Sketcher;
import {FILTER_TYPES, chemSubstructureSearchLibrary} from '../chem-searches';
import {_package, getScaffoldTree, isSmarts} from '../package';
import {RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {SCAFFOLD_TREE_HIGHLIGHT } from '../constants';
import { IColoredScaffold, ISubstruct, _addColorsToBondsAndAtoms } from '../rendering/rdkit-cell-renderer';
import { hexToPercentRgb } from '../utils/chem-common';
import { _convertMolNotation } from '../utils/convert-notation-utils';

let attached = false;

export enum BitwiseOp {
  AND = 'AND',
  OR = 'OR'
}

interface INode {
  scaffold?: string;
  child_nodes?: INode[];
  chosenColor?: string;
  parentColor?: string;
  colorOn?: boolean; 
  checked?: boolean; 
  isNot?: boolean;
  expanded?: boolean;
  orphansBitset?: string | null;
}

interface ITreeNode {
  smiles: string;
  autocreated: boolean;
  bitset: DG.BitSet | null;
  bitwiseNot: boolean;
  orphansBitset: DG.BitSet | null;
  init: boolean;
  orphans: boolean;
  labelDiv: HTMLDivElement;
  canvas: Element;
  chosenColor?: string;
  parentColor?: string;
  colorOn?: boolean;
}

interface Size {
  height: number;
  width: number;
}

interface SizesMap {
  [key: string]: Size;
}

interface ScaffoldLayout {
  viewState: string;
  scaffoldJson: string;
}

function value(node: TreeViewNode): ITreeNode {
  return node.value as ITreeNode;
}

function getMol(molString : string) : RDMol | null {
  return getMolSafe(molString, {mergeQueryHs: true, kekulize: true}, _rdKitModule, true).mol;
}

function processUnits(molPBlok : string): string {
  let curPos = 0;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  curPos = molPBlok.indexOf('\n', curPos) + 1;
  const atomCount = parseInt(molPBlok.substring(curPos, curPos + 3));
  const bondCount = parseInt(molPBlok.substring(curPos + 3, curPos + 6));
  curPos = molPBlok.indexOf('\n', curPos) + 1;

  //32 33 34 N O S -> 55-57
  const aromaticAtoms = [];
  for (let atomIdx = 0; atomIdx < atomCount; ++atomIdx) {
    const idxElem = curPos + 31;
    const str = molPBlok.substring(idxElem, idxElem + 3);
    if (str === 'N  ' || str === 'O  ' || str === 'S  ') {
      const idxMark = curPos + 55;
      const strTmp = molPBlok.substring(idxMark +1, idxMark + 2);
      const numTmp = parseInt(strTmp);
      if (numTmp === 1) {
        if (str === 'O  ' || str === 'S  ')
          aromaticAtoms.unshift({elem: str, atomIndex: atomIdx + 1});

        else
          aromaticAtoms.push({elem: str, atomIndex: atomIdx + 1});
      }
    }
    curPos = molPBlok.indexOf('\n', curPos) + 1;
  }

  let curPosAdd = curPos;
  for (let bondIdx =0; bondIdx < bondCount; ++bondIdx) {
    let s = '';
    if ((s = molPBlok.substring(curPosAdd + 8, curPosAdd + 9)) === '4') {
      const endStr = molPBlok.substring(curPosAdd + 9);
      molPBlok = molPBlok.substring(0, curPosAdd + 6) + '  6' + endStr;
    }
    curPosAdd = molPBlok.indexOf('\n', curPosAdd) + 1;
  }
  return molPBlok;
}

function enableNodeExtendArrow(group: TreeViewGroup, enable: boolean): void {
  const c = group.root.getElementsByClassName('d4-tree-view-tri');
  if (c.length > 0)
    (c[0] as HTMLElement).style.visibility = enable ? 'visible' : 'hidden';
}

function enableToolbar(thisViewer: ScaffoldTreeViewer): void {
  const toolbar = thisViewer.root.querySelector('.chem-scaffold-tree-toolbar ') as HTMLElement;
  toolbar.classList.toggle('empty-tree', thisViewer.tree.items.length === 0);
}

function enableColorIcon(colorIcon: HTMLElement, colorIsSet: boolean) {
  colorIcon.classList.toggle('color-is-set', colorIsSet);
}

function disablePaletteIcon(paletteIcon: HTMLElement) {
  paletteIcon.classList.toggle('color-is-not-set', true);
}

function removeElementByMolecule(array: IColoredScaffold[], moleculeToRemove: string) {
  for (let i = array.length - 1; i >= 0; --i) {
    if (array[i].molecule === moleculeToRemove) {
      array.splice(i, 1);
    }
  }
}

function removeElementByColor(array: IColoredScaffold[], colorToRemove: string) {
  for (let i = array.length - 1; i >= 0; --i) {
    if (array[i].color === colorToRemove) {
      array.splice(i, 1);
    }
  }
}

function filterNodesIter(rootGroup: TreeViewGroup, recordCount : number, hitsThresh: number) {
  if (hitsThresh < 0)
    hitsThresh = 0;
  if (hitsThresh > 1)
    hitsThresh = 1;

  if (rootGroup.parent !== null) {
    const trues = value(rootGroup).bitset!.trueCount;
    const ratio = trues / recordCount;
    rootGroup.root.style.display = (trues > 0 && ratio < hitsThresh ? 'none' : '');
  }

  for (let n = 0; n < rootGroup.children.length; ++n) {
    if (isOrphans(rootGroup.children[n]))
      throw new Error('There should not be any orphans');

    filterNodesIter(rootGroup.children[n] as TreeViewGroup, recordCount, hitsThresh);
  }
}

function isNodeFiltered(node: TreeViewNode): boolean {
  return node.root.style.display === 'none';
}

export function isOrphans(node: TreeViewNode): boolean {
  return node.value !== null && value(node).orphans;
}

function buildOrphans(rootGroup: TreeViewGroup) {
  if (rootGroup.parent !== null && rootGroup.children.length > 0) {
    //folder groups don't have children, will skip

    const v = value(rootGroup);
    v.orphansBitset = null;
    const bitsetThis = v.bitset!;
    let bitsetOrphans = bitsetThis.clone();
    let bitsetChildrenTmp = DG.BitSet.create(bitsetThis.length);
    let bitsetChild = null;
    for (let n = 0; n < rootGroup.children.length; ++n) {
      if (isOrphans(rootGroup.children[n]) || isNodeFiltered(rootGroup.children[n]))
        continue;

      bitsetChild = value(rootGroup.children[n]).bitset!;
      bitsetChildrenTmp = bitsetChildrenTmp.or(bitsetChild, false);
    }
    if (bitsetChildrenTmp.trueCount > 0)
      bitsetOrphans = bitsetOrphans.xor(bitsetChildrenTmp, false);
    else
      bitsetOrphans = bitsetChildrenTmp;

    v.orphansBitset = bitsetOrphans;
  }

  for (let n = 0; n < rootGroup.children.length; ++n) {
    if (isOrphans(rootGroup.children[n]) || isNodeFiltered(rootGroup.children[n]))
      continue;

    buildOrphans(rootGroup.children[n] as TreeViewGroup);
  }
}

function fillVisibleNodes(rootGroup: TreeViewGroup, visibleNodes: Array<TreeViewGroup>) : void {
  if (rootGroup.parent !== null) {
    visibleNodes.push(rootGroup);
    if (!rootGroup.expanded) return;
  }

  for (let n = 0; n < rootGroup.children.length; ++n)
    fillVisibleNodes(rootGroup.children[n] as TreeViewGroup, visibleNodes);
}

function updateNodeHitsLabel(group : TreeViewNode, text : string) : void {
  const labelDiv = value(group).labelDiv;
  labelDiv!.innerHTML = text;
}

async function updateAllNodesHits(thisViewer: ScaffoldTreeViewer, onDone : Function | null = null) {
  const items = thisViewer.tree.items;
  if (items.length > 0) {
    await updateNodesHitsImpl(thisViewer, items, 0, items.length - 1);
    thisViewer.filterTree(thisViewer.threshold);
    thisViewer.updateSizes();

    if (onDone !== null)
      onDone();
  }
}

async function updateVisibleNodesHits(thisViewer: ScaffoldTreeViewer) {
  const visibleNodes : Array<TreeViewGroup> = [];
  fillVisibleNodes(thisViewer.tree, visibleNodes);

  const start = Math.floor(thisViewer.tree.root.scrollTop / thisViewer.sizesMap[thisViewer.size].height);
  let end = start + Math.ceil(thisViewer.root.offsetHeight / thisViewer.sizesMap[thisViewer.size].height);
  if (end >= visibleNodes.length)
    end = visibleNodes.length - 1;

  await updateNodesHitsImpl(thisViewer, visibleNodes, start, end);
}

async function updateNodesHitsImpl(thisViewer: ScaffoldTreeViewer, visibleNodes : Array<TreeViewNode>,
  start: number, end: number) {
  for (let n = start; n <= end; ++n) {
    if (thisViewer.cancelled)
      return;

    const group = visibleNodes[n];
    const v = value(group);
    const bitset = thisViewer.molColumn === null ?
      null :
      await handleMalformedStructures(thisViewer.molColumn, v.smiles);

    v.bitset = bitset;
    v.init = true;
    updateNodeHitsLabel(group, bitset!.trueCount.toString());
  }
}

async function _initWorkers(molColumn: DG.Column) : Promise<DG.BitSet> {
  const molStr = molColumn.length === 0 ? '' : molColumn.get(molColumn.length -1);
  const smarts = molStr ? _convertMolNotation(molStr, DG.chem.Notation.Unknown, DG.chem.Notation.Smarts, _rdKitModule) : '';
  return DG.BitSet.fromBytes((await chemSubstructureSearchLibrary(molColumn, molStr, smarts, FILTER_TYPES.scaffold)).buffer.buffer, molColumn.length);
}

let offscreen : OffscreenCanvas | null = null;
let gOffscreen : OffscreenCanvasRenderingContext2D | null = null;


function renderMolecule(molStr: string, width: number, height: number, skipDraw: boolean = false, viewer: ScaffoldTreeViewer | undefined, tooltip: boolean = false, color: string | null = null, substructure: string | null = null): HTMLDivElement {
  const r = window.devicePixelRatio;
  if (offscreen === null || offscreen.width !== Math.floor(width*r) || offscreen.height !== Math.floor(height*r)) {
    offscreen = new OffscreenCanvas(Math.floor(width*r), Math.floor(height*r));
    gOffscreen = offscreen.getContext('2d', {willReadFrequently: true});
  }

  const g = gOffscreen;
  g!.imageSmoothingEnabled = true;
  g!.imageSmoothingQuality = 'high';
  if (skipDraw) {
    g!.font = '18px Roboto, Roboto Local';
    const text = 'Loading...';
    const tm = g!.measureText(text);
    const fontHeight = Math.abs(tm.actualBoundingBoxAscent) + tm.actualBoundingBoxDescent;
    const lineWidth = tm.width;
    g!.fillText(text, Math.floor((width - lineWidth) / 2), Math.floor((height - fontHeight) / 2));
  } else {
    substructure = substructure !== null ? substructure : molStr;
    const mol = getQueryMolSafe(molStr, '', _rdKitModule);
    const substrMol = getQueryMolSafe(substructure, '', _rdKitModule);
    if (mol !== null && substrMol !== null && color !== null) {
      const matchedAtomsAndBonds: ISubstruct[] = JSON.parse(mol.get_substruct_matches(substrMol));
      _addColorsToBondsAndAtoms(matchedAtomsAndBonds[0], color);
      drawRdKitMoleculeToOffscreenCanvas({mol, kekulize: true, isQMol: true, useMolBlockWedging: mol.has_coords() === 2}, offscreen.width, offscreen.height, offscreen, matchedAtomsAndBonds[0] === undefined ? null : matchedAtomsAndBonds[0]);
      mol.delete();
      substrMol.delete();
    } else if (mol !== null && substrMol !== null) {
      drawRdKitMoleculeToOffscreenCanvas({mol, kekulize: true, isQMol: true, useMolBlockWedging: mol.has_coords() === 2}, offscreen.width, offscreen.height, offscreen, null);
      mol.delete();
      substrMol.delete();
    }
  }

  const bitmap : ImageBitmap = offscreen.transferToImageBitmap();
  const moleculeHost = ui.canvas(width, height);
  const resizable = viewer ? viewer.resizable : false;
  
  $(moleculeHost).addClass('chem-canvas');
  moleculeHost.width = (resizable && !tooltip) ? (viewer!.sizesMap['large'].width) * r : width * r;
  moleculeHost.height = (resizable && !tooltip) ? (viewer!.sizesMap['large'].height) * r : height * r;
  moleculeHost.getContext('2d')!.drawImage(bitmap, 0, 0, moleculeHost.width, moleculeHost.height);
  moleculeHost.style.width = '100%';
  moleculeHost.style.height = '';
  return ui.divH([ui.div(moleculeHost, 'mol-host')], 'chem-mol-box');
}

function getMoleculePropertyDiv() : HTMLDivElement | null {
  const c = document.getElementsByClassName('property-grid-item-view-label');
  let name = null;
  for (let n = 0; n< c.length; ++n) {
    name = c[n].getAttribute('name');
    if (name !== null && name === 'prop-view-molecule-column')
      return c[n] as HTMLDivElement;
  }
  return null;
}

function getFlagIcon(group: TreeViewGroup) : HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  const c = molHost.getElementsByClassName('icon-fill');
  return c.length === 0 ? null : c[0] as HTMLElement;
}

function getNotIcon(group: TreeViewGroup) : HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  let c = molHost.getElementsByClassName('fa-equals');//'fa-not-equal');
  if (c.length === 0)
    c = molHost.getElementsByClassName('fa-not-equal');

  return c.length === 0 ? null : c[0] as HTMLElement;
}

function getColorIcon(group: TreeViewGroup): HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  let c = molHost.getElementsByClassName('fa-circle');
  return c.length === 0 ? null : c[0] as HTMLElement;
}

function getPaletteIcon(group: TreeViewGroup): HTMLElement | null {
  const molHost: HTMLElement = group.captionLabel;
  let c = molHost.getElementsByClassName('fa-palette');
  return c.length === 0 ? null : c[0] as HTMLElement;
}

function isNotBitOperation(group: TreeViewGroup) : boolean {
  const isNot = (group.value as ITreeNode).bitwiseNot;
  return isNot;
}

async function handleMalformedStructures(molColumn: DG.Column, smiles: string): Promise<DG.BitSet> {
  let bitset;
  try {
    const smarts = _convertMolNotation(smiles, DG.chem.Notation.Unknown, DG.chem.Notation.Smarts, _rdKitModule);
    bitset = DG.BitSet.fromBytes((await chemSubstructureSearchLibrary(molColumn, smiles, smarts, FILTER_TYPES.scaffold)).buffer.buffer, molColumn.length);
  } catch (e) {
    console.log(e);
    bitset = DG.BitSet.create(molColumn.length).setAll(false);
  }
  return bitset;
}

const GENERATE_ERROR_MSG = 'Generating tree failed...Please check the dataset';
const NO_MOL_COL_ERROR_MSG = 'There is no molecule column available';

export class ScaffoldTreeViewer extends DG.JsViewer {
  static TYPE: string = 'Scaffold Tree';

  tree: DG.TreeViewGroup;
  bitset: DG.BitSet | null = null;
  wrapper: SketcherDialogWrapper | null = null;
  molCol: DG.Column | null = null;
  molColumns: Array<DG.Column[]> = [];
  colorCodedScaffolds: IColoredScaffold[] = [];
  checkedScaffolds: IColoredScaffold[] = [];
  scaffoldLayouts: ScaffoldLayout[] = [];
  paletteColors: string[] = [];
  molColumnIdx: number = -1;
  tableIdx: number = -1;
  threshold: number;
  bitOperation: string;
  ringCutoff: number = 10;
  dischargeAndDeradicalize: boolean = false;
  cancelled: boolean = false;
  treeBuildCount: number = -1;
  checkBoxesUpdateInProgress: boolean = false;
  treeEncodeUpdateInProgress: boolean = false;
  dataFrameSwitchgInProgress: boolean = false;
  addOrphanFolders: boolean = true;
  resizable: boolean = false;
  smartsExist: boolean = false;
  current?: DG.TreeViewNode;

  _generateLink?: HTMLElement;
  _message?: HTMLElement | null = null;
  _iconAdd: HTMLElement | null = null;
  _iconDelete: HTMLElement | null = null;
  _bitOpInput: InputBase | null = null;
  skipAutoGenerate: boolean = false;
  workersInit: boolean = false;
  progressBar: DG.TaskBarProgressIndicator | null = null;
  MoleculeColumn: string;
  molColPropObserver: MutationObserver | null = null;
  Table: string;
  treeEncode: string;
  sizesMap: SizesMap = {
    'small': {height: 100, width: 180},
    'normal': {height: 110, width: 240},
    'large': {height: 120, width: 300},
  };
  size: string;
  allowGenerate: boolean;
  applyFilter: boolean = true;

  constructor() {
    super();

    this.tree = ui.tree();
    // this.tree.root.classList.add('d4-tree-view-lines');

    this.size = this.string('size', Object.keys(this.sizesMap)[2], {choices: Object.keys(this.sizesMap)});
    this.tree.root.classList.add('scaffold-tree-viewer');
    this.tree.root.classList.add(`scaffold-tree-${this.size}`);
    this.helpUrl = '/help/visualize/viewers/scaffold-tree.md';

    const dataFrames = grok.shell.tables;
    for (let n = 0; n < dataFrames.length; ++n) {
      const molCols = dataFrames[n].columns.bySemTypeAll(DG.SEMTYPE.MOLECULE);
      if (molCols.length > 0)
        this.molColumns.push(molCols);
    }

    const tableNames = new Array(this.molColumns.length);
    for (let n = 0; n < tableNames.length; ++n)
      tableNames[n] = this.molColumns[n][0].dataFrame.name;

    this.Table = this.addProperty('Table', DG.TYPE.DATA_FRAME, grok.shell.tv.dataFrame.name, {editor: 'table', category: 'Data'});

    this.tableIdx = tableNames.length > 0 ? tableNames.indexOf(this.Table) : -1;

    let molColNames  = [];
    if (this.molColumns.length > 0)
      molColNames = new Array(this.molColumns[this.tableIdx].length);

    for (let n = 0; n < molColNames.length; ++n)
      molColNames[n] = this.molColumns[this.tableIdx][n].name;

    if (this.molColumns.length > 0) {
      this.molColumnIdx = this.molColumns[this.tableIdx].length > 0 ? 0 : -1; 
    }

    this.MoleculeColumn = this.string('MoleculeColumn', molColNames.length === 0 ? null : molColNames[0], {
      choices: molColNames,
      category: 'Data',
      userEditable: this.molColumns.length > 0,
    });

    this.threshold = this.float('threshold', 0, {
      min: 0,
      max: 20,
      description: 'Hide scaffolds that match less then the specified percentage of molecules',
    });

    this.bitOperation = this.string('bitOperation', BitwiseOp.OR, {
      choices: Object.values(BitwiseOp),
      category: 'Misc',
      description: 'AND: all selected substructures match\n OR: any selected substructures match',
    });

    this.ringCutoff = this.int('ringCutoff', 10, {
      category: 'Scaffold Generation',
      description: 'Ignore molecules with # rings > N',
    });

    this.dischargeAndDeradicalize = this.bool('dischargeAndDeradicalize', false, {
      category: 'Scaffold Generation',
      description: 'Remove charges and radicals from scaffolds',
    });

    this.treeEncode = this.string('treeEncode', '[]', {userEditable: false});
    this.allowGenerate = this.bool('allowGenerate');
    this.molColPropObserver = this.registerPropertySelectListener(document.body);
    this.paletteColors = DG.Color.categoricalPalette.map(DG.Color.toHtml);
    this._initMenu();
  }

  registerPropertySelectListener(parent: HTMLElement) : MutationObserver {
    const thisViewer = this;
    const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        if (mutation.type == 'childList') {
          for (let n = 0; n < mutation.addedNodes.length; ++n) {
            const node : any = mutation.addedNodes[n];
            if (node.className === 'property-grid-item-editor-spinner') {
              const c = (node.parentElement as HTMLElement).children;
              for (let i = 0; i < c.length; ++i) {
                if (c[n].className === 'property-grid-item-view-label' &&
                    c[n].getAttribute('name') === 'prop-view-molecule-column') {
                  const select : HTMLSelectElement = node;
                  while (select.firstChild != null)
                    select.removeChild(select.firstChild);


                  let option: HTMLOptionElement | null = null;
                  for (let i = 0; i < thisViewer.molColumns[thisViewer.tableIdx].length; ++i) {
                    option = document.createElement('OPTION') as HTMLOptionElement;
                    option.value = thisViewer.molColumns[thisViewer.tableIdx][i].name;
                    option.label = thisViewer.molColumns[thisViewer.tableIdx][i].name;
                    option.selected = i === thisViewer.molColumnIdx;
                    select.appendChild(option);
                  }
                  return;
                }
              }
            }
          }
        }
      }
    });
    observer.observe(parent, {childList: true, subtree: true});
    return observer;
  }


  get treeRoot(): DG.TreeViewGroup {return this.tree;}

  get message(): string {
    return this._message?.innerHTML as string;
  }

  set message(msg: string | null) {
    if (this._message === undefined || this._message === null)
      return;

    this._message.style.visibility = msg === null ? 'hidden' : 'visible';
    this._message.innerHTML = msg ?? '';
  }

  _initMenu(): void {
    this.root.oncontextmenu = (e) => {
      DG.Menu.popup()
        .item('Save tree', () => this.saveTree())
        .item('Load tree', () => this.loadTree())
        .show();
      e.preventDefault();
    };
  }

  /** Saves sketched tree to disk (under Downloads) */
  saveTree(): void {
    const s = JSON.stringify(this.serializeTrees(this.tree));
    const dialog = ui.dialog({title: 'Enter file name'});
    dialog
      .add(ui.stringInput('Name', 'scaffold-tree'))
      .onOK(() => {
        DG.Utils.download(`${dialog.inputs[0].stringValue}.tree`, s);
        dialog.close();
      })
      .show();
  }

  /** Loads previously saved tree. See also {@link saveTree} */
  loadTree(): void {
    DG.Utils.openFile({
      accept: '.tree',
      open: async (file) => {
        await this.loadTreeStr(await file.text());
        this.treeEncode = await file.text();
      },
    });
  }

  expandAndCollapse(): void {
    const firstState = this.tree.items.length > 0 ? !(this.tree.items[0] as DG.TreeViewGroup).expanded : false;
    this.tree.items.map((item) => {
      if (item instanceof DG.TreeViewGroup) {
        item.expanded = firstState;
      }
    });
  }

  async generateTree() {
    if (this.molColumn === null)
      return;

    if (this.skipAutoGenerate) {
      this.skipAutoGenerate = false;
      return;
    }
    ++this.treeBuildCount;
    this.cancelled = false;
    this.message = null;
    this.clear();
    let currentCancelled = false;

    //this.root.style.visibility = 'hidden';
    ui.setUpdateIndicator(this.root, true);
    this.progressBar = DG.TaskBarProgressIndicator.create('Generating Scaffold Tree...');
    this.progressBar.update(0, 'Installing ScaffoldGraph..: 0% completed');

    const c = this.root.getElementsByClassName('d4-update-shadow');
    if (c.length > 0) {
      const eProgress = c[0];
      const eCancel : HTMLAnchorElement = ui.link('Cancel', () => {
        this.cancelled = true;
        currentCancelled = true;
        eCancel.innerHTML = 'Cancelling... Please Wait...';
        eCancel.style.pointerEvents = 'none';
        eCancel.style.color = 'gray';
        eCancel.style.opacity = '90%';

        ui.setUpdateIndicator(this.root, false);
        this.progressBar!.update(100, 'Build Cancelled');
        this.progressBar!.close();
        this.progressBar = null;
      }, 'Cancel Tree build', 'chem-scaffold-tree-cancel-hint');
      eProgress.appendChild(eCancel);
    }

    if (currentCancelled)
      return;

    if (!this.workersInit) {
      await _initWorkers(this.molColumn);
      this.workersInit = true;
    }

    if (currentCancelled)
      return;

    this.progressBar!.update(30, 'Generating tree..: 30% completed');
    const maxMolCount = 750;

    let length = this.molColumn.length;
    let step = 1;
    if (this.molColumn.length > maxMolCount) {
      step = Math.floor(this.molColumn.length / maxMolCount);
      if (step === 0) step = 1;
      length = maxMolCount;
    }

    let molStr = null;
    let mTmp = null;
    const ar = new Array(length);
    for (let n = 0, m = 0; n < length; ++n, m += step) {
      molStr = this.molColumn.get(m);
      if (molStr.includes('V3000')) {
        mTmp = null;
        try {
          mTmp = _rdKitModule.get_mol(molStr);
        } catch (e) {
          try {
            mTmp = _rdKitModule.get_qmol(molStr);
          } catch (e) {
            ar[n] = molStr;
          }
        }
        if (mTmp !== null) {
          ar[n] = mTmp.get_smiles();
          mTmp.delete();
        }
        continue;
      } else ar[n] = molStr;
    }

    if (currentCancelled)
      return;

    const molCol: DG.Column = DG.Column.fromStrings('smiles', ar);
    molCol.semType = DG.SEMTYPE.MOLECULE;
    molCol.setTag(DG.TAGS.UNITS, this.molColumn.getTag(DG.TAGS.UNITS));
    const dataFrame = DG.DataFrame.fromColumns([molCol]);

    if (currentCancelled)
      return;

    this.finishGenerateTree(dataFrame);
  }

  async finishGenerateTree(dataFrame: DG.DataFrame) : Promise<void> {
    const runNum = this.treeBuildCount;

    let jsonStr = null;
    try {
      jsonStr = await getScaffoldTree(dataFrame, this.ringCutoff, this.dischargeAndDeradicalize);
    } catch (e: any) {
      _package.logger.error(e.toString());
      ui.setUpdateIndicator(this.root, false);
      this.progressBar!.update(50, 'Build failed');
      this.progressBar!.close();
      this.message = 'Tree build failed...Please ensure that python package ScaffoldGraph is installed';
      return;
    }

    if (this.treeBuildCount > runNum || this.cancelled)
      return;

    if (jsonStr != null)
      await this.loadTreeStr(jsonStr);

    if (this.cancelled) {
      this.clear();
      ui.setUpdateIndicator(this.root, false);
      this.progressBar!.update(100, 'Build Cancelled');
      this.progressBar!.close();
      this.progressBar = null;
      return;
    }

    //this.root.style.visibility = 'visible';
    this.treeEncodeUpdateInProgress = true;
    this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    this.treeEncodeUpdateInProgress = false;

    this.progressBar!.close();
    this.progressBar = null;
  }

  async loadTreeStr(jsonStr: string) {
    this.clear();
    const json = JSON.parse(jsonStr);
    if (json.length > 0 && (json.includes(BitwiseOp.AND) || json.includes(BitwiseOp.OR))) {
      this._bitOpInput!.value = json[json.length - 1];
      json.pop();
    }

    if (this.progressBar !== null)
      this.progressBar.update(50, 'Initializing Tree..: 50% completed');

    const thisViewer = this;
    thisViewer.deserializeTrees(json, this.tree, (molStr: string, rootGroup: TreeViewGroup, chosenColor: string | null, parentColor: string | null, colorOn: boolean | null, checked: boolean, isNot: boolean, expanded: boolean, orphansBitset: DG.BitSet) => {
      return thisViewer.createGroup(molStr, rootGroup, false, chosenColor, parentColor, colorOn, checked, isNot, expanded, orphansBitset);
    });

    this.appendOrphanFolders(this.tree);

    await updateVisibleNodesHits(this); //first visible N nodes
    ui.setUpdateIndicator(this.root, false);
    if (this.progressBar !== null)
      this.progressBar!.update(100, 'Tree is ready');

    this.updateSizes();
    this.updateUI();

    this.updateFilters();
    this.updateTag();
  }

  get molColumn(): DG.Column | null {
    return this.molCol !== null ?
      this.molCol :
      (this.molColumns.length === 0 ? null : this.molColumns[this.tableIdx][this.molColumnIdx]);
  }

  private openEditSketcher(group: TreeViewGroup) {
    if (this.wrapper !== null) {
      this.wrapper.node = group;
      return;
    }

    const thisViewer = this;
    this.wrapper = SketcherDialogWrapper.create('Edit Scaffold...', 'Save', group,
      async (molStrSketcher: string, node: TreeViewGroup, errorMsg: string | null) => {
        ui.empty(node.captionLabel);
        let molHost: HTMLDivElement;
        const groupValue = value(group);
        const chosenColor = groupValue.chosenColor;
        const parentColor = groupValue.parentColor;
        const finalColor = chosenColor && groupValue.colorOn ? chosenColor : parentColor;

        if (finalColor) {
          const substructure = chosenColor ? molStrSketcher : this.getParentSmilesIterative(group);
          molHost = renderMolecule(molStrSketcher, this.sizesMap[this.size].width, this.sizesMap[this.size].height, undefined, thisViewer, false, finalColor, substructure);
          removeElementByMolecule(this.colorCodedScaffolds, groupValue.smiles);
          removeElementByMolecule(this.checkedScaffolds, groupValue.smiles);
          this.colorCodedScaffolds[this.colorCodedScaffolds.length] = {molecule: substructure, color: finalColor};
          if (group.children)
            thisViewer.setColorToChildren(group.children, finalColor!, molStrSketcher);
        } else {
          molHost = renderMolecule(molStrSketcher, this.sizesMap[this.size].width, this.sizesMap[this.size].height, undefined, thisViewer);
        }
        groupValue.smiles = molStrSketcher;
        molHost.onclick = (e) => this.makeNodeActiveAndFilter(group);
        this.addIcons(molHost, group, undefined, molStrSketcher);
        node.captionLabel.appendChild(molHost);
        const iconRoot = getFlagIcon(node);
        const valid = errorMsg === null;
        const color = valid ? 'lightgreen !important' : 'hotpink !important';

      iconRoot!.style.cssText = iconRoot!.style.cssText += ('color: ' + color);

      const autocreated = value(node).autocreated;
      if (autocreated !== undefined && autocreated)
        iconRoot!.style.visibility = 'visible';

      if (!valid)
        iconRoot!.setAttribute('tooltip', errorMsg);

      if (finalColor)
        this.makeColorIconActive(group, finalColor!);
      
      thisViewer.updateSizes();
      thisViewer.updateUI();
      thisViewer.updateFilters();
      thisViewer.updateTag();
      thisViewer.treeEncodeUpdateInProgress = true;
      thisViewer.treeEncode = JSON.stringify(thisViewer.serializeTrees(thisViewer.tree));
      thisViewer.treeEncodeUpdateInProgress = false;
      thisViewer.wrapper?.close();
      thisViewer.wrapper = null;
      }, (smilesSketcher: string, node: TreeViewGroup) => {
        if (node.parent === null)
          return null;

        let success = true;
        if (toJs(node.parent).value !== null) {
          const smilesParent = (toJs(node.parent).value as ITreeNode).smiles;
          success = ScaffoldTreeViewer.validateNodes(smilesSketcher, smilesParent);
          if (!success)
            return SketcherDialogWrapper.validationMessage(false, true);
        }
        const children = node.items;
        for (let n = 0; n < children.length; ++n) {
          if (isOrphans(children[n]))
            continue;
          success = ScaffoldTreeViewer.validateNodes((children[n].value as ITreeNode).smiles, smilesSketcher);
          if (!success)
            return SketcherDialogWrapper.validationMessage(false, false);
        }
        return null;
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, async (strMolSketch: string) => {
      });

    this.wrapper.show();
  }

  openAddSketcher(group: TreeViewGroup) {
    const v = value(group);
    const molStr = v === null ? '' : v.smiles;
    if (this.wrapper !== null) {
      this.wrapper.node = group;
      return;
    }

    ++this.treeBuildCount;
    this.cancelled = false;
    const thisViewer = this;
    this.wrapper = SketcherDialogWrapper.create('Add new scaffold...', 'Add', group,
      async (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => {
        const child = thisViewer.createGroup(molStrSketcher, parent);
        if (child !== null) {
          enableNodeExtendArrow(child, false);
          enableNodeExtendArrow(parent, true);
          this.setTooltipForElement(child.checkBox!, 'Select to filter');
        }

        if (child !== null && parent.value !== null) {
          const parentValue = value(parent);
          const childValue = value(child);

          let substructure: string;
          if (parentValue.chosenColor) {
            substructure = value(parent).smiles;
          } else if (parentValue.parentColor) {
            substructure = this.getParentSmilesIterative(parent);
          } else {
            substructure = molStrSketcher;
          }

          const color = parentValue.chosenColor && parentValue.colorOn
            ? parentValue.chosenColor
            : parentValue.parentColor;

          thisViewer.highlightCanvas(child, color!, substructure);
        
          if (color) {
            thisViewer.makeColorIconActive(child, color);
            childValue.parentColor = color;
          }
        }
        
        //orphans
        //buildOrphans(thisViewer.tree);
        //thisViewer.clearOrphanFolders(thisViewer.tree);
        //thisViewer.appendOrphanFolders(thisViewer.tree);
        thisViewer.updateSizes();
        thisViewer.updateUI();
        thisViewer.updateFilters();
        thisViewer.wrapper?.close();
        thisViewer.wrapper = null;
        thisViewer.treeEncodeUpdateInProgress = true;
        thisViewer.treeEncode = JSON.stringify(thisViewer.serializeTrees(thisViewer.tree));
        thisViewer.treeEncodeUpdateInProgress = false;
      }, (smilesSketcher: string, nodeSketcher: TreeViewGroup) => {
        const success = nodeSketcher === thisViewer.tree || ScaffoldTreeViewer.validateNodes(smilesSketcher, molStr);
        return success ? null : SketcherDialogWrapper.validationMessage(false, true);
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, () => {
        if (thisViewer.wrapper != null) {
          thisViewer.clearFilters();
          thisViewer.wrapper?.close();
          thisViewer.wrapper = null;
        }
      }, async (strMolSketch: string) => {
      });
    this.wrapper.show();
  }

  removeColorCoding(node: TreeViewGroup) {
    const processGroup = (group: DG.TreeViewGroup) => {
      const groupValue = value(group);
      const smiles = (groupValue.chosenColor && groupValue.colorOn) 
        ? groupValue.smiles 
        : this.getParentSmilesIterative(group);
  
      removeElementByMolecule(this.colorCodedScaffolds, smiles);
      removeElementByMolecule(this.checkedScaffolds, groupValue.smiles);
  
      if (group.children && !isOrphans(group)) {
        group.children.map((childGroup) => processGroup(childGroup as DG.TreeViewGroup));
      }
    };
  
    processGroup(node);
  }
  

  removeNode(node: TreeViewGroup) {
    const dialog = ui.dialog({title: 'Remove scaffold'});
    dialog
      .add(ui.divText('This cannot be undone. Are you sure?'))
      .addButton('Yes', () => {
        if (this.wrapper !== null && this.wrapper.node === node ) {
          this.wrapper.close();
          this.wrapper = null;
        }
    
        node.remove();
        //orphans
        this.filterTree(this.threshold);
        this.updateUI();
        this.updateSizes();
        this.removeColorCoding(node);
        this.updateTag();
        this.updateFilters();
        this.treeEncodeUpdateInProgress = true;
        this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
        this.treeEncodeUpdateInProgress = false;
        dialog.close();
      })
      .show();
  }

  clear() {
    this.clearFilters();
    while (this.tree.children.length > 0)
      this.tree.children[0].remove();


    this.treeEncodeUpdateInProgress = true;
    this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    this.treeEncodeUpdateInProgress = false;

    this.colorCodedScaffolds = [];
    this.molColumn!.setTag(SCAFFOLD_TREE_HIGHLIGHT, JSON.stringify(this.colorCodedScaffolds));

    this.updateUI();
  }

  clearFilters(changeBitwise: boolean = true): void {
    const checkedNodes = this.tree.items.filter((v) => v.checked);

    if (this.bitset === null && checkedNodes.length === 0)
      return;

    this.bitset = null;
    if (this.molColumn !== null) {
      removeElementByColor(this.colorCodedScaffolds, '');
      this.molColumn.setTag(SCAFFOLD_TREE_HIGHLIGHT, JSON.stringify(this.colorCodedScaffolds));
    }

    this.checkBoxesUpdateInProgress = true;
    for (let n = 0; n < checkedNodes.length; ++n)
      checkedNodes[n].checked = false;
    this.checkBoxesUpdateInProgress = false;

    if (changeBitwise)
      this._bitOpInput!.value = BitwiseOp.OR;
    this.clearNotIcon(this.tree.children);
    
    this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  resetFilters(): void {
    if (this.molColumn === null)
      return;

    if (this.bitset === null)
      this.bitset = DG.BitSet.create(this.molColumn.length);

    this.molColumn.setTag(SCAFFOLD_TREE_HIGHLIGHT, JSON.stringify(this.colorCodedScaffolds));
    this.bitset!.setAll(false, false);
    this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  selectTableRows(group: TreeViewGroup, flag: boolean): void {
    const bitset = value(group).bitset!;
    if (flag)
      this.molColumn?.dataFrame.selection.or(bitset);
    else
      this.molColumn?.dataFrame.selection.andNot(bitset);
  }

  updateFilters(triggerRequestFilter = true): void {
    if (this.molColumn === null)
      return;

    const checkedNodes = this.tree.items.filter((v) => v.checked);
    if (checkedNodes.length === 0) {
      this.clearFilters(false);
      return;
    }

    if (this.bitset === null)
      this.bitset = DG.BitSet.create(this.molColumn.length);

    this.bitset.setAll(this.bitOperation === BitwiseOp.AND, false);

    let tmpBitset = DG.BitSet.create(this.molColumn.length);

    let isNot = false;
    
    this.checkedScaffolds = [];
    removeElementByColor(this.colorCodedScaffolds, '');
    for (let n = 0; n < checkedNodes.length; ++n) { //going through all checked nodes, perform filtering and highlight
      const nodeBitset = value(checkedNodes[n]).bitset;
      const molStr = value(checkedNodes[n]).smiles;
      if (molStr !== undefined) {
        let molArom;
        const node = value(checkedNodes[n]);
        const isChosenColorOn = node.chosenColor && node.colorOn;
        const isParentColorOn = node.parentColor && !node.colorOn;
        try {
          molArom = _rdKitModule.get_qmol(processUnits(molStr));
          if (isChosenColorOn) {
            removeElementByMolecule(this.colorCodedScaffolds, molStr);
            this.colorCodedScaffolds[this.colorCodedScaffolds.length] = {
              molecule: molStr,
              color: node.chosenColor
            };
          } else {
            this.checkedScaffolds[this.checkedScaffolds.length] = {
              molecule:  molStr,
              color: ''
            };
          }
          if (isParentColorOn) {
            this.colorCodedScaffolds[this.colorCodedScaffolds.length] = {
              molecule: this.getParentSmilesIterative(checkedNodes[n]),
              color: node.parentColor
            };
          }
        } catch (e) {
        } finally {
          molArom?.delete();
        }
      }
      
      if (nodeBitset === null)
        continue;

      tmpBitset = tmpBitset.copyFrom(nodeBitset, false);
      isNot = value(checkedNodes[n]).bitwiseNot;
      if (isNot)
        tmpBitset = tmpBitset.invert(false);

      this.bitset = this.bitOperation === BitwiseOp.AND ? this.bitset.and(tmpBitset) : this.bitset.or(tmpBitset);
    }
    this.updateTag();
    if (triggerRequestFilter)
      this.dataFrame.rows.requestFilter();
    this.updateUI();
  }

  highlightCanvas(group: DG.TreeViewGroup, color: string | null, smiles: string | null = null) {
    const canvas = group.root.querySelectorAll('.chem-canvas')[0];
    const molHostDiv = renderMolecule(
      value(group).smiles, this.sizesMap[this.size].width, this.sizesMap[this.size].height, undefined, this, false, color, smiles
    );
    molHostDiv.onclick = (e) => this.makeNodeActiveAndFilter(group);
    const coloredCanvas = molHostDiv.querySelectorAll('.chem-canvas')[0];
    canvas.replaceWith(coloredCanvas);
  }

  makeColorIconActive(group: DG.TreeViewGroup, color: string | null) {
    const colorIcon = getColorIcon(group);
    const paletteIcon = getPaletteIcon(group);
    colorIcon!.classList.remove('fal');
    colorIcon!.classList.add('fas');
    colorIcon!.style.cssText += ('color: ' + color + ' !important');
    paletteIcon!.classList.remove('color-is-not-set');
    enableColorIcon(colorIcon!, true);
  }

  makeColorIconInactive(group: DG.TreeViewGroup) {
    const paletteIcon = getPaletteIcon(group);
    const colorIcon = getColorIcon(group);
    colorIcon!.classList.remove('fas');
    colorIcon!.classList.add('fal');
    enableColorIcon(colorIcon!, false);
    disablePaletteIcon(paletteIcon!);
  }

  getParentSmilesIterative(group: DG.TreeViewGroup | DG.TreeViewNode): any {
    if (!group)
      return null;

    const stack = [];
    stack[stack.length] = group;

    while (stack.length > 0) {
      const currentNode = stack.pop();
      if (!currentNode)
        continue;

      const parentNode = toJs(currentNode.parent);
      if (!parentNode || parentNode.value === null)
        continue;

      const childParentColor = value(currentNode).parentColor;
      const parentTreeNode = parentNode.value as ITreeNode;

      if (parentTreeNode.chosenColor === childParentColor)
        return parentTreeNode.smiles; 
      stack[stack.length] = parentNode;
    }
    return null;
  }

  setColorToChildren(tree: DG.TreeViewNode[], chosenColor: string | null, smiles: string) {
    for (const group of tree) {
      if (group instanceof DG.TreeViewGroup && !isOrphans(group)) {
        const groupValue = value(group);
        const parent = toJs(group.parent).value as ITreeNode;

        const parentColor = parent.chosenColor && parent.colorOn
            ? parent.chosenColor
            : parent.parentColor;

        groupValue.parentColor = parentColor;
        
        if (parentColor === chosenColor && (!groupValue.chosenColor || (!groupValue.colorOn && groupValue.chosenColor))) {
          this.makeColorIconActive(group, chosenColor);
          this.highlightCanvas(group, chosenColor, smiles);
        }
  
        if (group.children)
          this.setColorToChildren(group.children, chosenColor, smiles);
      }
    }
  }

  removeColorFromChildren(tree: DG.TreeViewNode[], chosenColor: string, smiles: string) {
    for (const group of tree) {
      if (group instanceof DG.TreeViewGroup && !isOrphans(group)) {
        const groupValue = value(group);
        const parent = toJs(group.parent).value as ITreeNode;
        const isParentColorOn = parent.chosenColor && parent.colorOn;

        groupValue.parentColor = isParentColorOn ? parent.chosenColor : parent.parentColor;
        const smilesFinal = isParentColorOn ? parent.smiles : smiles;

        if (groupValue.chosenColor && groupValue.colorOn) {
          return;
        } else {
          const color = groupValue.parentColor!;
          if (color)
            this.makeColorIconActive(group, color);
          else
            this.makeColorIconInactive(group);
          this.highlightCanvas(group, color, smilesFinal);
        }

        if (group.children)
          this.removeColorFromChildren(group.children, chosenColor, smiles);
      }
    }
  }

  setColorToHighlight(group: TreeViewGroup, chosenColor: string, colorOn: boolean): void {
    const smiles = (group.value as ITreeNode).smiles;
    const colorIcon = getColorIcon(group);
    
    if (colorOn)
      this.setHighlightAndColor(group, smiles, chosenColor);
    else
      this.resetHighlightAndColor(group, colorIcon!, smiles, chosenColor);
  }

  resetHighlightAndColor(group: TreeViewGroup, colorIcon: HTMLElement, smiles: string, chosenColor: string) {
    const groupValue = value(group);
    const color = groupValue.parentColor ?? null;
    colorIcon!.style.cssText += ('color: ' + color + ' !important');
    const substr = this.getParentSmilesIterative(group);

    if (group.checked)
      this.updateFilters();
    else
      removeElementByMolecule(this.checkedScaffolds, smiles);

    if (groupValue.parentColor && !groupValue.colorOn && !groupValue.chosenColor)
      removeElementByMolecule(this.colorCodedScaffolds, substr);
    else
      removeElementByMolecule(this.colorCodedScaffolds, smiles);
   
    if ((!groupValue.parentColor && !groupValue.chosenColor) || (!groupValue.parentColor) || (!groupValue.chosenColor)) {
      this.makeColorIconInactive(group);
      delete groupValue.chosenColor;
    }
    else
      this.makeColorIconActive(group, color!);

    this.highlightCanvas(group, color!, substr);

    this.updateTag();
    this.removeColorFromChildren(group.children, chosenColor, substr);
  }

  setHighlightAndColor(group: TreeViewGroup, smiles: string, chosenColor: string): void {
    this.makeColorIconActive(group, chosenColor);
    this.highlightCanvas(group, chosenColor, smiles);

    if (this.colorCodedScaffolds.length > 0) {
      removeElementByMolecule(this.colorCodedScaffolds, smiles);
      removeElementByMolecule(this.checkedScaffolds, smiles);
    }
    this.colorCodedScaffolds[this.colorCodedScaffolds.length] = { molecule: smiles, color: chosenColor };
    this.updateTag();
    this.setColorToChildren(group.children, chosenColor, smiles);
  }

  updateTag() {
    let updatedTag: string;
    const colorCodedString = JSON.stringify(this.colorCodedScaffolds);
    const checkedNodes = this.tree.items.filter((v) => v.checked);
    this.checkedScaffolds = checkedNodes.length > 0 ? this.checkedScaffolds : [];
    const checkedString = JSON.stringify(this.checkedScaffolds);
    if (this.colorCodedScaffolds.length > 0 && this.checkedScaffolds.length > 0) {
      updatedTag = checkedString.slice(0, -1) + ',' + colorCodedString.slice(1);
    } else if (this.colorCodedScaffolds.length > 0) {
      updatedTag = colorCodedString;
    } else {
      updatedTag = checkedString;
    }  
    this.molColumn!.setTag(SCAFFOLD_TREE_HIGHLIGHT, updatedTag);
  }
  
  setNotBitOperation(group: TreeViewGroup, isNot: boolean) : void {
    if ((group.value as ITreeNode).bitwiseNot === isNot)
      return;

    (group.value as ITreeNode).bitwiseNot = isNot;
    this.updateFilters();

    // update ui
    const notIcon = getNotIcon(group);
    const color = isNot ? 'red !important' : 'var(--blue-1) !important';
    notIcon!.style.cssText += ('color: ' + color);

    if (isNot) {
      notIcon!.classList.remove('fa-equals');//'fal');
      notIcon!.classList.add('fa-not-equal');//'fas');//, 'icon-fill');
      notIcon!.style.visibility = 'visible';
    } else {
      notIcon!.classList.remove('fa-not-equal');//'fas');
      notIcon!.classList.add('fa-equals');//'fal');//, 'icon-fill');
      notIcon!.style.removeProperty('visibility');
    }
    this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
  }

  updateColorIcon(colorIcon: HTMLElement, chosenColor: string) {
    colorIcon.classList.add('fal');
    colorIcon.classList.add('scaffold-tree-circle');
    colorIcon.classList.add('color-icon');
    colorIcon!.style.cssText += ('color: ' + chosenColor + ' !important');
  }

  addIcons(molHost: HTMLDivElement, group: TreeViewGroup, label?: string, molStrSketcher?: string): void {
    const thisViewer = this;
    const groupValue = group.value as ITreeNode;
    const notIcon = ui.iconFA('equals',
      () => thisViewer.setNotBitOperation(group, !(group.value as ITreeNode).bitwiseNot));
    
    notIcon.onmouseenter = (e) => {
      const text = groupValue.bitwiseNot 
        ? 'Show structures containing this scaffold' 
        : 'Exclude structures containing this scaffold';
      ui.tooltip.show(text, e.clientX, e.clientY);
    }

    notIcon.onmouseleave = (e) => ui.tooltip.hide();

    let chosenColor = this.paletteColors[0];
    const first = this.paletteColors.shift();
    this.paletteColors[this.paletteColors.length] = first!;
    
    const paletteIcon = ui.iconFA('palette');

    //@ts-ignore
    const colorPicker = ui.colorPicker(DG.Color.fromHtml(chosenColor), (color: number) => {
      groupValue.colorOn = true;
      chosenColor = DG.Color.toHtml(color);
      this.updateColorIcon(colorIcon, chosenColor);
      groupValue.chosenColor = chosenColor;
      this.setColorToHighlight(group, chosenColor, true);
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    }, paletteIcon);

    paletteIcon.classList.add('palette-icon');
    disablePaletteIcon(paletteIcon);
    paletteIcon.onclick = (e) => {
      colorPicker.stringValue = (groupValue.chosenColor ?? groupValue.parentColor) ?? chosenColor;
      e.stopImmediatePropagation()
    };
    paletteIcon.onmousedown = (e) => e.stopImmediatePropagation();

    const colorIcon = ui.iconFA('circle', async () => {
      groupValue.colorOn = !groupValue.colorOn;
      if (!groupValue.chosenColor)
        groupValue.chosenColor = chosenColor;
      chosenColor = groupValue.chosenColor!;
      this.setColorToHighlight(group, chosenColor, groupValue.colorOn);
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    }, 'Assigns color to the scaffold');
    this.updateColorIcon(colorIcon, chosenColor);

    colorIcon.onclick = (e) => {
      e.stopImmediatePropagation()
    };
    colorIcon.ondblclick = (e) => e.stopImmediatePropagation();
    colorIcon.onmousedown = (e) => e.stopImmediatePropagation();
    notIcon.onclick = (e) => e.stopImmediatePropagation();
    notIcon.onmousedown = (e) => e.stopImmediatePropagation();

    const zoomIcon = ui.iconFA('search-plus');
    zoomIcon.onclick = (e) => e.stopImmediatePropagation();
    zoomIcon.onmousedown = (e) => e.stopImmediatePropagation();
    zoomIcon.onmouseenter = (e) => ui.tooltip.show(renderMolecule(value(group).smiles, 300, 200, undefined, thisViewer, true), e.clientX, e.clientY);
    zoomIcon.onmouseleave = (e) => ui.tooltip.hide();

    const iconsDivLeft = ui.divV([notIcon, colorIcon, paletteIcon, zoomIcon], 'chem-mol-box-info-buttons');

    const iconsDiv = ui.divV([
      ui.iconFA('plus', () => this.openAddSketcher(group), 'Add new scaffold'),
      ui.iconFA('trash-alt', () => this.removeNode(group), 'Remove scaffold'),
      ui.iconFA('pencil', () => this.openEditSketcher(group), 'Edit scaffold'),
      ui.divText(''),
      ui.iconFA('check-square', () => this.selectTableRows(group, true), 'Select rows'),
      ui.iconFA('square', () => this.selectTableRows(group, false), 'Deselect rows'),
    ], 'chem-mol-box-info-buttons');
    iconsDiv.onclick = (e) => e.stopImmediatePropagation();
    iconsDiv.onmousedown = (e) => e.stopImmediatePropagation();

    const flagIcon = ui.iconFA('circle', () => this.openEditSketcher(group), 'The scaffold was edited');
    flagIcon.style.fontSize = '8px';
    //flagIcon.style.color = 'hotpink !important';
    flagIcon.style.visibility = 'hidden';
    flagIcon.classList.remove('fal');
    flagIcon.classList.add('fas', 'icon-fill');
    flagIcon.onmouseenter = (e) => {
      const c = document.getElementsByClassName('d4-tooltip');
      if (c.length > 0) {
        const text = flagIcon.getAttribute('tooltip');
        if (text !== null && text !== undefined)
          c[0].setAttribute('data', text);
      }
    };

    const labelDiv = label ? ui.divText(label) : ui.div(ui.loader(), { style: { 'margin-left': '-50px' } });
    const iconsInfo = ui.divH([flagIcon, labelDiv]);
    
    if (!label) {
      handleMalformedStructures(thisViewer.molColumn!, molStrSketcher!).then((bitset: DG.BitSet) => {
        const newLabelDiv = ui.divText(bitset.trueCount.toString());
        iconsInfo.replaceChildren(ui.divH([flagIcon, newLabelDiv]));
        value(group).smiles = molStrSketcher!;
        value(group).bitset = bitset;
        value(group).labelDiv = newLabelDiv;
        this.updateFilters();
        this.filterTree(this.threshold);
      });
    }
    
    value(group).labelDiv = labelDiv;


    const c = molHost.getElementsByTagName('CANVAS');
    if (c.length > 0)
      value(group).canvas = c[0];

    iconsInfo.onclick = (e) => e.stopImmediatePropagation();
    iconsInfo.onmousedown = (e) => e.stopImmediatePropagation();
    molHost.children[0].appendChild(ui.divV([iconsInfo, iconsDiv], 'chem-mol-box-info'));
    molHost.children[0].insertBefore(ui.divV([iconsDivLeft], 'chem-mol-box-info'), c[0]);
  }

  private createGroup(molStr: string, rootGroup: TreeViewGroup, skipDraw: boolean = false, chosenColor: string | null = null, parentColor: string | null = null, colorOn: boolean | null = null , checked: boolean = false, isNot: boolean = false, expanded: boolean = true, orphansBitset: DG.BitSet | null = null) : TreeViewGroup | null {
    if (this.molColumn === null)
      return null;

    const thisViewer = this;
    const bitset = DG.BitSet.create(this.molColumn.length);
    const color = (chosenColor && colorOn === true) ? chosenColor : parentColor;
    const molHost = renderMolecule(molStr, this.sizesMap[this.size].width, this.sizesMap[this.size].height, skipDraw, thisViewer, false, color);
    const group = rootGroup.group(molHost, {smiles: molStr, bitset: bitset, orphansBitset: orphansBitset, bitwiseNot: false});
    this.addIcons(molHost, group, undefined, molStr);
    this.setNotBitOperation(group, isNot);

    if (colorOn)
      value(group).colorOn = colorOn;
    else
      value(group).colorOn = false;

    group.enableCheckBox(checked);
    group.autoCheckChildren = false;
    group.expanded = expanded;

    group.onNodeCheckBoxToggled.subscribe((node: TreeViewNode) => {
      if (!thisViewer.checkBoxesUpdateInProgress && node.value !== null)
        thisViewer.updateFilters();
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    });

    if (color) {
      this.makeColorIconActive(group, color);
      if (chosenColor)
        value(group).chosenColor = chosenColor; 
      if (parentColor)
        value(group).parentColor = parentColor;
      if (color === parentColor && !colorOn) {
        molStr = this.getParentSmilesIterative(group);
        this.highlightCanvas(group, color, molStr);
      }
      this.colorCodedScaffolds[this.colorCodedScaffolds.length] = {molecule: molStr, color: color};
    }

    molHost.onclick = (e) => this.makeNodeActiveAndFilter(group);
    return group;
  }

  createOrphansGroup(rootGroup: TreeViewGroup, label: string) : DG.TreeViewGroup {
    const divFolder = ui.iconFA('folder');
    divFolder.style.fontSize = '66px';
    divFolder.style.marginLeft = '140px';
    divFolder.style.marginTop = '55px';
    divFolder.style.cssText += 'color: hsla(0, 0%, 0%, 0) !important';
    divFolder.classList.remove('fal');
    divFolder.classList.add('fas', 'icon-fill');
    divFolder.onclick = (e) => {
      this.makeNodeActiveAndFilter(group);
    }

    const labelDiv = ui.divText(label);
    const iconsDiv = ui.divV([
      ui.iconFA('trash-alt', () => {
        const dialog = ui.dialog({title: 'Remove orphans card'});
        dialog
        .add(ui.divText('This cannot be undone. Are you sure?'))
        .addButton('Yes', () => {
          this.clearOrphanFolders(group);
          dialog.close();
        })
        .show();
      }, 'Remove orphans card'),
      ui.divText(''),
      ui.iconFA('check-square', () => this.selectTableRows(group, true), 'Select rows'),
      ui.iconFA('square', () => this.selectTableRows(group, false), 'Deselect rows'),
    ], 'chem-mol-box-info-buttons');

    const folder = ui.divH([ui.div(ui.div(divFolder), 'mol-host')], 'chem-mol-box')
    folder.children[0].append(ui.divV([labelDiv, iconsDiv], 'chem-mol-box-info'));

    const group = rootGroup.group(folder, {orphans: true});
    if (group.children.length === 0)
      enableNodeExtendArrow(group, false);

    group.enableCheckBox(false);
    group.autoCheckChildren = false;
    const thisViewer = this;
    group.onNodeCheckBoxToggled.subscribe((node: TreeViewNode) => {
      if (!thisViewer.checkBoxesUpdateInProgress && node.value !== null)
        thisViewer.updateFilters();
    });

    value(group).labelDiv = labelDiv;

    return group;
  }


  clearOrphanFolders(rootGroup: TreeViewGroup) {
    if (isOrphans(rootGroup)) {
      rootGroup.remove();
      this.updateFilters();
      return;
    }

    for (let n = 0; n < rootGroup.children.length; ++n)
      this.clearOrphanFolders(rootGroup.children[n] as TreeViewGroup);
  }

  appendOrphanFolders(rootGroup: TreeViewGroup) {
    if (isNodeFiltered(rootGroup))
      return;

    if (rootGroup.parent) {
      for (let n = 0; n < rootGroup.children.length; ++n) {
        if (value(rootGroup.children[n]).orphans)
          rootGroup.children[n].remove();
      }
      const bitsetOrphans = value(rootGroup).orphansBitset;
      if (bitsetOrphans !== null && bitsetOrphans !== undefined && bitsetOrphans.trueCount > 0) {
        const group = this.createOrphansGroup(rootGroup, bitsetOrphans.trueCount.toString());
        value(group).bitset = bitsetOrphans;
      }
    }

    for (let n = 0; n < rootGroup.children.length; ++n)
      this.appendOrphanFolders(rootGroup.children[n] as TreeViewGroup);
  }

  filterTree(hitsThresh: number) : void {
    this.clearOrphanFolders(this.tree);
    filterNodesIter(this.tree, this.molColumn!.length, hitsThresh / 100);
    if (this.addOrphanFolders) {
      buildOrphans(this.tree);
      this.appendOrphanFolders(this.tree);
    }
    this.updateSizes();
  }

  changeCanvasSize(molString: any): void {
    const { chosenColor, colorOn, parentColor, smiles, group } = molString;
    const color = chosenColor && colorOn ? chosenColor : parentColor;
    const substr = chosenColor && colorOn ? smiles : this.getParentSmilesIterative(group);
    
    this.highlightCanvas(group, color, substr);
  }

  makeNodeActiveAndFilter(node: DG.TreeViewNode) {
    this.checkBoxesUpdateInProgress = true;
    this.selectGroup(node);
    this.checkBoxesUpdateInProgress = false;
    this.resetFilters();
    this.updateFilters();
  }

  onPropertyChanged(p: DG.Property): void {
    if (p.name === 'Table') {
      for (let n = 0; n < this.molColumns.length; ++n) {
        if (this.molColumns[n][0].dataFrame.name === this.Table) {
          if (this.tableIdx === n)
            return;

          this.tableIdx = n;
          break;
        }
      }
      this.dataFrameSwitchgInProgress = true;
      this.clear();

      this.molColumnIdx = this.molColumns[this.tableIdx].length > 0 ? 0 : -1;
      this.MoleculeColumn = this.molColumns[this.tableIdx][this.molColumnIdx].name;
      this.dataFrameSwitchgInProgress = false;

      const div = getMoleculePropertyDiv();
      if (div !== null)
        div.innerHTML = this.MoleculeColumn;

      setTimeout(() => this.generateTree(), 1000);
    } else if (p.name === 'MoleculeColumn') {
      for (let n = 0; n < this.molColumns[this.tableIdx].length; ++n) {
        if (this.molColumns[this.tableIdx][n].name === this.MoleculeColumn) {
          if (this.molColumnIdx === n)
            return;

          this.molColumnIdx = n;
          break;
        }
      }
      this.clear();
      //this.molColumn = this.dataFrame.columns.byName(this.MoleculeColumn);
    } else if (p.name === 'treeEncode') {
      if (this.treeEncodeUpdateInProgress)
        return;

      this.skipAutoGenerate = true;
      this.loadTreeStr(this.treeEncode);
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    } else if (p.name === 'threshold') {
      this.filterTree(this.threshold);
    } else if (p.name === 'bitOperation') {
      this.updateFilters();
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
      this._bitOpInput!.value = this.bitOperation;
    } else if (p.name === 'size') {
      const canvases = this.tree.root.querySelectorAll('.chem-canvas');
      const molStrings = this.tree.items
      .filter((item) => !isOrphans(item))
      .map((item) => ({
        group: item,
        smiles: item.value.smiles,
        parentColor: item.value.parentColor,
        chosenColor: item.value.chosenColor,
        colorOn: item.value.colorOn,
      }));
      
      for (let i = 0; i < canvases.length; ++i)
        this.changeCanvasSize(molStrings[i]);
      this.updateSizes();
      this.updateUI();
    } else if (p.name === 'allowGenerate') {
      this._generateLink!.style.visibility = !this.allowGenerate ? 'hidden' : 'visible';
      if (this.allowGenerate === true)
        setTimeout(() => this.generateTree(), 1000);
    }
  }

  clearNotIcon(tree: DG.TreeViewNode[]) {
    tree.map((group) => {
      const castedGroup = group as DG.TreeViewGroup;
      if (!isOrphans(castedGroup)) {
        this.setNotBitOperation(castedGroup, false);
        if (castedGroup.children)
          this.clearNotIcon(castedGroup.children)
      }
    });
  }

  onFrameAttached(dataFrame: DG.DataFrame): void {
    ui.empty(this.root);

    if (this.dataFrameSwitchgInProgress) {
      this.dataFrameSwitchgInProgress = true;
      return;
    }

    if (this.molColumnIdx >= 0 && this.MoleculeColumn == null)
      this.MoleculeColumn = this.molColumns[this.tableIdx][this.molColumnIdx].name;

    const thisViewer = this;
    this.tree.root.onscroll = async (e) => await updateVisibleNodesHits(thisViewer);
    this.tree.onNodeContextMenu.subscribe((args: any) => {
      const menu: DG.Menu = args.args.menu;
      const node: TreeViewGroup = args.args.item;
      const orphans = node.value === null || value(node).orphans;
      if (orphans)
        return;

      if (attached)
        menu.clear();

      menu
        .item('Add New...', () => thisViewer.openAddSketcher(node))
        .item('Edit...', () => this.openEditSketcher(node))
        .item('Remove', () => this.removeNode(node));
    });

    this.tree.onChildNodeExpandedChanged.subscribe((group: DG.TreeViewGroup) => {
      const isFolder = value(group).orphans;
      if (isFolder) {
        const className = group.expanded ?
          'grok-icon fa-folder fas icon-fill' : 'grok-icon fa-folder-open fas icon-fill';
        const c = group.root.getElementsByClassName(className);
        if (c.length > 0) {
          let cl = null;
          for (let n = 0; n < c.length && c[n].classList !== undefined; ++n) {
            cl = c[n].classList;
            cl.remove(group.expanded ? 'fa-folder' : 'fa-folder-open');
            cl.add(group.expanded ? 'fa-folder-open' : 'fa-folder');
          }
        }
      }
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    });

    this.tree.root.onkeyup = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (this.current) {
          this.makeNodeActiveAndFilter(this.current);
        }
      }
    }

    this.tree.onSelectedNodeChanged.subscribe((node: DG.TreeViewNode) => {
      this.current = node;
    });

    this.tree.onNodeMouseEnter.subscribe((node: DG.TreeViewNode) => {
      if (node.value === null)
        return;

      const bitset = value(node).bitset!;
      const rows: DG.RowList = dataFrame.rows;
      rows.highlight((idx: number) => bitset.get(idx));
    });

    this.tree.onNodeMouseLeave.subscribe((node: DG.TreeViewNode) => {
      dataFrame.rows.highlight(null);
    });

    if (this.applyFilter) {
      this.subs.push(dataFrame.onRowsFiltering.subscribe(() => {
        if (thisViewer.bitset != null)
          dataFrame.filter.and(thisViewer.bitset);
      }));
    }

    this.subs.push(grok.events.onTooltipShown.subscribe((args) => {
      const tooltip = args.args.element;
      const text = tooltip.getAttribute('data');
      tooltip.removeAttribute('data');
      if (text !== null && text !== undefined)
        tooltip.innerHTML = text;
    }));

    this.subs.push(grok.events.onResetFilterRequest.subscribe((_) => {
      this.clearFilters();
      this.clearNotIcon(this.tree.children);
    }));

    this.subs.push(this.dataFrame.onRowsRemoved.subscribe(async (_) => {
      await updateAllNodesHits(thisViewer);
    }))

    this.render();

    if (this.allowGenerate)
      setTimeout(() => this.generateTree(), 1000);
    attached = true;
  }

  detach(): void {
    this.cancelled = true;

    if (this.wrapper !== null) {
      this.wrapper.close();
      this.wrapper = null;
    }

    if (this.progressBar !== null) {
      this.progressBar.close();
      this.progressBar = null;
    }

    this.molColPropObserver!.disconnect();
    this.molColPropObserver = null;

    this.clearFilters();
    this.molColumn?.setTag(SCAFFOLD_TREE_HIGHLIGHT, '');
    super.detach();
  }

  selectGroup(group: DG.TreeViewNode) : void {
    const items = this.tree.items;
    for (let n = 0; n < items.length; ++n)
      items[n].checked = false;
    group.checked = true;
  }

  updateSizes() {
    const lastElement = this.tree.root.classList[this.tree.root.classList.length - 1];
    this.tree.root.classList.remove(lastElement);
    this.tree.root.classList.add(`scaffold-tree-${this.size}`);
  }

  updateUI() {
    if (this.molColumn === null) {
      this._generateLink!.style.pointerEvents = 'none';
      this._generateLink!.style.color = 'lightgrey';
      this.message = NO_MOL_COL_ERROR_MSG;
      (this._iconAdd! as any).inert = true;
      this._iconAdd!.style.color = 'grey';
      return;
    }

    const itemCount = this.tree.items.length;
    this._iconDelete!.style.display = itemCount > 0 ? 'flex' : 'none';
    this._generateLink!.style.visibility = (itemCount > 0 || !this.allowGenerate) ? 'hidden' : 'visible';
    this._message!.style.visibility = (itemCount > 0 || !this.allowGenerate) ? 'hidden' : 'visible';

    const c = this.root.getElementsByClassName('grok-icon fal fa-filter grok-icon-filter');
    if (c.length > 0)
      (c[0] as HTMLElement).style.visibility = this.bitset === null ? 'hidden' : 'visible';
    enableToolbar(this);
  }

  render() {
    const thisViewer = this;
    this._bitOpInput = ui.choiceInput('', BitwiseOp.OR, Object.values(BitwiseOp), (op: BitwiseOp) => {
      thisViewer.bitOperation = op;
      thisViewer.updateFilters();
      this.treeEncode = JSON.stringify(this.serializeTrees(this.tree));
    });
    this._bitOpInput.setTooltip('AND: all selected substructures match \n\r OR: any selected substructures match');
    this._bitOpInput.root.style.marginLeft = '20px';
    const iconHost = ui.box(ui.divH([
      this._iconAdd = ui.iconFA('plus', () => thisViewer.openAddSketcher(thisViewer.tree), 'Add new root structure'),
      ui.iconFA('filter', () => thisViewer.clearFilters(), 'Clear filter'),
      ui.iconFA('folder-open', () => this.loadTree(), 'Open saved tree'),
      ui.iconFA('arrow-to-bottom', () => this.saveTree(), 'Save this tree to disk'),
      ui.iconFA('sort', () => this.expandAndCollapse(), 'Expand / collapse all'),
      ui.divText(' '),
      this._iconDelete = ui.iconFA('trash-alt',
        () => {
          const dialog = ui.dialog({title: 'Delete Tree'});
          dialog
            .add(ui.divText('This cannot be undone. Are you sure?'))
            .addButton('Yes', () => {
              thisViewer.cancelled = true;
              thisViewer.clear();
              dialog.close();
            })
            .show();
        }, 'Drop all trees'),
      ui.divText(' '),
      this._bitOpInput.root,
    ], 'chem-scaffold-tree-scrollbar'), 'chem-scaffold-tree-toolbar');
    this.root.appendChild(ui.splitV([iconHost, this.tree.root]));
    enableToolbar(thisViewer);

    this._message = ui.divText('', 'chem-scaffold-tree-generate-message-hint');
    this.root.appendChild(this._message);

    this._generateLink = ui.link('Generate',
      async () => await thisViewer.generateTree(),
      'Generates scaffold tree',
      'chem-scaffold-tree-generate-hint');
    this.root.appendChild(this._generateLink);
    this.updateSizes();
    this.updateUI();
  }

  static validateNodes(childSmiles: string, parentSmiles: string): boolean {
    const parentMol = getMol(parentSmiles);
    const parentCld = getMol(childSmiles);
    if (parentMol === null || parentCld === null)
      return false;

    const match: string = parentCld.get_substruct_match(parentMol);
    parentMol.delete();
    parentCld.delete();
    return match.length > 2;
  }

  serializeTrees(treeRoot: TreeViewGroup): Array<any> {
    const json: Array<any> = [];
    for (let n = 0; n < treeRoot.children.length; ++n)
      json[n] = this.serializeTree(treeRoot.children[n] as TreeViewGroup);
    if (json.length > 0)
      json.push(this.bitOperation);
    return json;
  }

  serializeTree(rootGroup: TreeViewGroup): INode {
    const jsonNode: INode = {};
    const rootGroupValue = value(rootGroup);
    if (rootGroupValue) {
      jsonNode.scaffold = rootGroupValue.smiles;
      jsonNode.checked = rootGroup.checked;
      jsonNode.isNot = isNotBitOperation(rootGroup);
      jsonNode.expanded = rootGroup.expanded;
      if (rootGroupValue.chosenColor)
        jsonNode.chosenColor = rootGroupValue.chosenColor;
      if (rootGroupValue.parentColor)
        jsonNode.parentColor = rootGroupValue.parentColor;
      if (rootGroupValue.colorOn)
        jsonNode.colorOn = rootGroupValue.colorOn;
      if (rootGroupValue.orphansBitset) {
        jsonNode.orphansBitset = rootGroupValue.orphansBitset.toBinaryString();
      }
    }
    jsonNode.child_nodes = new Array(rootGroup.children.length);

    for (let i = 0; i < rootGroup.children.length; ++i) 
      jsonNode.child_nodes[i] = this.serializeTree(rootGroup.children[i] as TreeViewGroup);

    return jsonNode;
  }

  deserializeTrees(json: INode[], treeRoot: TreeViewGroup, createGroup: Function) : number {
    let countNodes = 0;
    for (let n = 0; n < json.length; ++n) {
      countNodes += this
        .deserializeTree(json[n], treeRoot, (molStr: string, rootGroup: TreeViewGroup, chosenColor: string | null, parentColor: string | null, colorOn: boolean | null, checked: boolean, isNot: boolean, expanded: boolean, orphansBitset: DG.BitSet | null, countNodes: number) => {
          return createGroup(molStr, rootGroup, chosenColor, parentColor, colorOn, checked, isNot, expanded, orphansBitset, countNodes);
        }, 0);
    }
    return countNodes;
  }

  setTooltipForElement(element: HTMLElement, text: string) {
    element.onmouseenter = (e) => ui.tooltip.show(text, e.clientX, e.clientY);
    element.onmouseleave = (e) => ui.tooltip.hide();
  }

  deserializeTree(json: INode, rootGroup: TreeViewGroup, createGroup: Function, countNodes: number, parent?: string) : number {
    const molStr = json.scaffold;
    const chosenColor = json.chosenColor;
    const parentColor = json.parentColor;
    const colorOn = json.colorOn;
    const checked = json.checked;
    const isNot = json.isNot;
    const expanded = json.expanded;
    let orphansBitset = null;
    if (json.orphansBitset) {
      orphansBitset = DG.BitSet.fromString(json.orphansBitset);
    }

    if (molStr === null || molStr === undefined) {
      return countNodes;
    }

    const group: TreeViewGroup = createGroup(molStr, rootGroup, chosenColor, parentColor, colorOn, checked, isNot, expanded, orphansBitset, countNodes);
    if (group === null)
      return countNodes;

    if (json.child_nodes === undefined)
      json.child_nodes = [];

    this.setTooltipForElement(group.checkBox!, 'Select to filter');
    value(group).autocreated = true;

    for (let n = 0; n < json.child_nodes.length; ++n)
      countNodes += this.deserializeTree(json.child_nodes[n], group, createGroup, countNodes, parent);

    ++countNodes;
    if (group.children.length === 0)
      enableNodeExtendArrow(group, false);

    return countNodes;
  }
}

class SketcherDialogWrapper {
  readonly dialog: DG.Dialog;
  readonly sketcher: Sketcher;
  success: boolean;
  group: DG.TreeViewGroup;
  isMolBlock: boolean;
  activeElement : HTMLElement | null = null;

  constructor(title: string, actionName: string, group: DG.TreeViewGroup,
    action: (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => void,
    validate: (smilesSketcher: string, nodeSketcher: TreeViewGroup) => string | null,
    onCancel: () => void, onClose: () => void, onStrucChanged: (strMolSketch: string) => void) {
    this.success = true;
    this.dialog = ui.dialog({title: title});
    this.group = group;
    const v = value(this.group);
    const molStr = v === null ? '' : v.smiles;
    this.isMolBlock = DG.chem.isMolBlock(molStr);

    const thisWrapper = this;

    const validLabel = ui.label(SketcherDialogWrapper.validationMessage(true, true));
    validLabel.style.height = '30px';
    validLabel.style.color = SketcherDialogWrapper.validationColor(true);

    this.sketcher = new DG.chem.Sketcher();
    this.isMolBlock ? this.sketcher.setMolFile(molStr) : this.sketcher.setSmiles(molStr);

    const molStrTmp = thisWrapper.sketcher.getMolFile();
    let errorMsg = validate(molStrTmp, thisWrapper.node);
    let valid = errorMsg === null;//validate(molStrTmp, thisWrapper.node);
    validLabel.style.color = SketcherDialogWrapper.validationColor(valid);
    validLabel.innerText = errorMsg ?? '';

    this.sketcher.onChanged.subscribe(() => {
      const molStr = this.normalizeMolStr(thisWrapper.sketcher.getMolFile());

      errorMsg = validate(molStr, thisWrapper.node);
      valid = errorMsg === null;
      validLabel.style.color = SketcherDialogWrapper.validationColor(valid);
      validLabel.innerText = errorMsg ?? '';

      if (onStrucChanged !== null)
        onStrucChanged(molStr);
    });

    this.dialog.add(this.sketcher);
    this.dialog.add(validLabel);
    this.dialog.addButton('Reset', () => {
      thisWrapper.isMolBlock ? thisWrapper.sketcher.setMolFile(molStr) : thisWrapper.sketcher.setSmiles(molStr);
    });
    this.dialog.addButton(actionName, () => {
      const molStr = this.normalizeMolStr(thisWrapper.sketcher.getMolFile());
      action(molStr, thisWrapper.node, errorMsg);
    });

    if (onCancel != null)
      this.dialog.onCancel(onCancel);

    if (onClose != null)
      this.dialog.onCancel(onClose);
  }

  normalizeMolStr(molStr: string): string {
    let mol;
    try {
      mol = _rdKitModule.get_mol(molStr);
      if (mol.has_coords() === 2) {
        mol.normalize_depiction(0);
        molStr = mol.get_molblock();
      }
    } catch {
      // do nothing
    } finally {
      if (mol) {
        mol.delete();
      }
    }
    return molStr;
  }

  set node(node: DG.TreeViewGroup) {
    this.group = node;
    const v = value(node);
    const molStr = v === null ? '' : v.smiles;
    this.isMolBlock = DG.chem.isMolBlock(molStr);
    this.isMolBlock ? this.sketcher.setMolFile(molStr) : this.sketcher.setSmiles(molStr);
  }

  get node() {
    return this.group;
  }

  show(): void {
    this.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement as HTMLElement : null;
    this.dialog?.show();
  }

  close(): void {
    this.activeElement!.style!.display = 'none';
    this.dialog?.close();
    const thisWrapper = this;
    setTimeout(() => thisWrapper.activeElement!.style!.display = '', 2);
  }

  static create(title: string, actionName: string, group: DG.TreeViewGroup,
    action: (molStrSketcher: string, parent: TreeViewGroup, errorMsg: string | null) => void,
    validate: (smilesSketcher: string, nodeSketcher: TreeViewGroup) => string | null,
    onCancel: () => void, onClose: () => void, onStrucChanged: (strMolSketch: string) => void): SketcherDialogWrapper {
    return new SketcherDialogWrapper(title, actionName, group, action, validate, onCancel, onClose, onStrucChanged);
  }

  static validationMessage(success: boolean, parentCheck: boolean): string {
    if (success)
      return '';

    return parentCheck ? 'The edited molecule is not a superstructure of its parent' :
      'The edited molecule is not a substructure of its children';
  }

  static validationColor(success: boolean): string {
    return success ? SketcherDialogWrapper.SUCCESS_MSG_COLOR : SketcherDialogWrapper.FAILURE_MSG_COLOR;
  }

  static SUCCESS_MSG_COLOR = 'green';
  static FAILURE_MSG_COLOR = 'red';
}
