/**
 * RDKit-based molecule cell renderer.
 * */

import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import * as DG from 'datagrok-api/dg';
import {
  ALIGN_BY_SCAFFOLD_TAG, FILTER_SCAFFOLD_TAG, HIGHLIGHT_BY_SCAFFOLD_COL,
  HIGHLIGHT_BY_SCAFFOLD_TAG, MIN_MOL_IMAGE_SIZE, PARENT_MOL_COL,
  REGENERATE_COORDS, SCAFFOLD_COL, SCAFFOLD_TREE_HIGHLIGHT, SUBSTRUCT_COL,
} from '../constants';
import {hexToPercentRgb} from '../utils/chem-common';
import {_rdKitModule, drawErrorCross, drawRdKitMoleculeToOffscreenCanvas} from '../utils/chem-common-rdkit';
import {IMolContext, getMolSafe} from '../utils/mol-creation_rdkit';
import {MolfileHandler} from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler';

export interface ISubstruct {
  atoms?: number[],
  bonds?: number[],
  highlightAtomColors?: {[key: number]: number[] | null},
  highlightBondColors?: {[key: number]: number[] | null}
}

interface IMolRenderingInfo {
  //mol: RDMol | null; // null when molString is invalid?
  molCtx: IMolContext;
  substruct: ISubstruct;
  molString: string;
}

export interface IColoredScaffold {
  molecule: string,
  color?: string,
  priority?: number,
  isSuperstructure?: string,
  align?: boolean,
  highlight?: boolean
}

export interface IHighlightTagInfo {
  scaffolds?: IColoredScaffold[],
  alighByFirstSubtruct: boolean,
}

export const NO_SCAFFOLD_COLOR = 'none';

export function _addColorsToBondsAndAtoms(mainSubstr: ISubstruct, color?: string, tempSubstr?: ISubstruct): void {
  const colorArr = color ? hexToPercentRgb(color) : [1.0, 0.7, 0.7, 1.0];
  const substrToTakeAtomsFrom = tempSubstr ?? mainSubstr;
  if (substrToTakeAtomsFrom) {
    if (substrToTakeAtomsFrom.atoms) {
      for (let j = 0; j < substrToTakeAtomsFrom.atoms.length; j++) {
        mainSubstr.highlightAtomColors ??= {};
        mainSubstr.highlightAtomColors[substrToTakeAtomsFrom.atoms[j]] = colorArr;
      };
    }
    if (substrToTakeAtomsFrom.bonds) {
      for (let j = 0; j < substrToTakeAtomsFrom.bonds.length; j++) {
        mainSubstr.highlightBondColors ??= {};
        mainSubstr.highlightBondColors[substrToTakeAtomsFrom.bonds[j]] = colorArr;
      };
    }
  }
}

export class GridCellRendererProxy extends DG.GridCellRenderer {
  renderer: DG.GridCellRenderer;
  _cellType: string;

  constructor(renderer: DG.GridCellRenderer, cellType: string) {
    super();
    this.renderer = renderer;
    this._cellType = cellType;
  }

  get defaultWidth(): number | null {return this.renderer.defaultWidth;}
  get defaultHeight(): number | null {return this.renderer.defaultHeight;}

  get name(): string {return this.renderer.name;}
  get cellType(): string {return this._cellType;}

  render(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    this.renderer.render(g, x, y, w, h, gridCell, cellStyle);
  }

  renderInternal(
    g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    this.renderer.renderInternal(g, x, y, w, h, gridCell, cellStyle);
  }
}

export class RDKitCellRenderer extends DG.GridCellRenderer {
  readonly WHITE_MOLBLOCK_SUFFIX = `
  0  0  0  0  0  0  0  0  0  0999 V2000
M  END
`;
  rdKitModule: RDModule;
  canvasCounter: number;
  molCache: DG.LruCache<String, IMolRenderingInfo> = new DG.LruCache<String, IMolRenderingInfo>();
  rendersCache: DG.LruCache<String, ImageData> = new DG.LruCache<String, ImageData>();
  sortedScaffoldsCache: DG.LruCache<String, IColoredScaffold[]> = new DG.LruCache<String, IColoredScaffold[]>();
  canvasReused: OffscreenCanvas;

  constructor(rdKitModule: RDModule) {
    super();
    this.rdKitModule = rdKitModule;
    this.canvasCounter = 0;
    this.canvasReused = new OffscreenCanvas(this.defaultWidth, this.defaultHeight);
    this.molCache.onItemEvicted = function(obj: {[_ : string]: any}) {
      obj.mol?.delete();
    };
  }

  ensureCanvasSize(w: number, h: number) : OffscreenCanvas {
    if (this.canvasReused.width < w || this.canvasReused.height < h)
      this.canvasReused = new OffscreenCanvas(Math.max(this.defaultWidth, w), Math.max(this.defaultHeight, h));
    return this.canvasReused;
  }

  get name(): string {return 'RDKit cell renderer';}
  get cellType(): DG.SemType {return DG.SEMTYPE.MOLECULE;}
  get defaultWidth(): number {return 200;}
  get defaultHeight(): number {return 100;}

  getDefaultSize(): {width: number, height: number} {
    return {width: this.defaultWidth, height: this.defaultHeight};
  }

  _fetchMolGetOrCreate(molString: string, scaffolds: IColoredScaffold[], molRegenerateCoords: boolean,
    details: object = {}, alignByFirstSubstr: boolean): IMolRenderingInfo {
    let molCtx: IMolContext;
    let mol = null;
    let substruct: ISubstruct = {};
    if ((details as any).isSubstructure) {
      const mappedDummiesAreRGroups = (details as any).mappedDummiesAreRGroups || false;
      if (molString.includes(' H ') || molString.includes('V3000')) {
        molCtx = getMolSafe(molString, {mergeQueryHs: true, mappedDummiesAreRGroups}, _rdKitModule);
        mol = molCtx.mol;
      } else {
        try {
          mol = this.rdKitModule.get_qmol(molString);
          mol.convert_to_aromatic_form();
        } catch (e) {
          if (mol) {
            mol.delete();
            mol = null;
          }
        }
        molCtx = {mol: mol, kekulize: false, isQMol: true, useMolBlockWedging: false};
      }
    } else {
      molCtx = getMolSafe(molString, details, _rdKitModule);
      mol = molCtx.mol;
    }

    if (mol !== null) {
      try {
        let molHasOwnCoords = (mol.has_coords() > 0);
        let molHasRebuiltCoords = false;
        const scaffoldIsMolBlock = scaffolds.length && alignByFirstSubstr ? DG.chem.isMolBlock(scaffolds[0].molecule) : null;
        const alignedByFirstSubstr = scaffoldIsMolBlock && alignByFirstSubstr;
        const {haveReferenceSmarts, parentMolScaffoldMolString} = (details as any);
        if (alignedByFirstSubstr) {
          const rdKitScaffoldMolCtx = this._fetchMol(scaffolds[0].molecule,
            parentMolScaffoldMolString ? [{molecule: parentMolScaffoldMolString}] : [],
            molRegenerateCoords, false, {mergeQueryHs: true, isSubstructure: !parentMolScaffoldMolString}, false).molCtx;
          const rdKitScaffoldMol = rdKitScaffoldMolCtx.mol;
          if (rdKitScaffoldMol) {
            rdKitScaffoldMol.normalize_depiction(0);
            if (molHasOwnCoords)
              mol.normalize_depiction(0);
            else if (!haveReferenceSmarts) {
              //need the following 4 rows for smiles with highlights to be rendered in adequate coordinates
              mol.set_new_coords();
              mol.normalize_depiction(1);
              mol.straighten_depiction(false);
              molHasRebuiltCoords = true;
            }
            let substructString = '';
            let useCoordGen = (details as any).useCoordGen;
            useCoordGen = (typeof useCoordGen === 'boolean' ? useCoordGen : true);
            const alignOpts = {
              useCoordGen,
              allowRGroups: true,
              acceptFailure: false,
              alignOnly: molHasOwnCoords || molHasRebuiltCoords,
            };
            let referenceSmarts;
            if (haveReferenceSmarts) {
              try {
                referenceSmarts = mol.get_smiles();
              } catch {
                // do nothing
              }
            }
            if (referenceSmarts)
              (alignOpts as any).referenceSmarts = referenceSmarts;

            try {
              substructString = !scaffolds[0].isSuperstructure ?
                mol.generate_aligned_coords(rdKitScaffoldMol, JSON.stringify(alignOpts)) :
                mol.get_substruct_match(mol!);
            } catch {
              // exceptions should not be thrown anymore by RDKit, but let's play safe
            }
            if (substructString === '') {
              substruct = {};
              if (molHasOwnCoords)
                mol.straighten_depiction(true);
            } else {
              if (scaffolds[0].color !== NO_SCAFFOLD_COLOR) {
                substruct = JSON.parse(substructString);
                if (!substruct.atoms)
                  substruct.atoms = [];
                if (!substruct.bonds)
                  substruct.bonds = [];
                _addColorsToBondsAndAtoms(substruct, scaffolds[0].color);
              }
            }
          }
        }
        for (let i = alignedByFirstSubstr ? 1 : 0; i < scaffolds.length; i++) {
          if (scaffolds[i].color !== NO_SCAFFOLD_COLOR) {
            const substructMol = this._fetchMol(scaffolds[i].molecule, [], molRegenerateCoords, false,
              {mergeQueryHs: true, isSubstructure: true}, false).molCtx.mol;
            if (substructMol) {
              const matchedAtomsAndBonds: ISubstruct[] = JSON.parse(mol!.get_substruct_matches(substructMol!));
              if (matchedAtomsAndBonds.length) {
                for (let j = 0; j < matchedAtomsAndBonds.length; j++) {
                  if (!substruct.atoms)
                    substruct.atoms = [];
                  if (!substruct.bonds)
                    substruct.bonds = [];
                  this._addAtomsOrBonds(matchedAtomsAndBonds[j].atoms!, substruct.atoms!);
                  this._addAtomsOrBonds(matchedAtomsAndBonds[j].bonds!, substruct.bonds!);
                  _addColorsToBondsAndAtoms(substruct, scaffolds[i].color, matchedAtomsAndBonds[j]);
                };
              }
            }
          }
        }
        molCtx.useMolBlockWedging = molHasOwnCoords;
        if (mol.has_coords() === 0 || molRegenerateCoords || hasNonZeroZCoords(molString, mol.get_num_atoms())) {
          mol.set_new_coords(molRegenerateCoords);
          mol.normalize_depiction(1);
          mol.straighten_depiction();
          molHasOwnCoords = false;
        }
        if (!scaffoldIsMolBlock) {
          mol.normalize_depiction(molHasOwnCoords ? 0 : 1);
          mol.straighten_depiction(molHasOwnCoords);
        } else if (!molHasOwnCoords)
          mol.normalize_depiction(0);
      } catch (e) {
        console.error(
          'In _fetchMolGetOrCreate: RDKit crashed, possibly a malformed molString molecule: `' + molString + '`');
        if (mol !== null) {
          mol.delete();
          molCtx.mol = null;
        }
      }
    }

    return {
      molCtx: molCtx,
      substruct: substruct,
      molString: molString,
    };
  }

  _addAtomsOrBonds(fromAtomsOrBonds: number[], toAtomsOrBonds: number[]): void {
    for (let j = 0; j < fromAtomsOrBonds.length; j++) {
      if (!toAtomsOrBonds?.includes(fromAtomsOrBonds[j]))
        toAtomsOrBonds?.push(fromAtomsOrBonds[j]);
    };
  }

  _fetchMol(molString: string, scaffolds: IColoredScaffold[], molRegenerateCoords: boolean,
    scaffoldRegenerateCoords: boolean, details: object = {}, alignByFirstSubstructure: boolean): IMolRenderingInfo {
    const name = molString + ' || ' + JSON.stringify(scaffolds) + ' || ' +
      molRegenerateCoords + ' || ' + scaffoldRegenerateCoords + ' || ' +
      ((details as any).isSubstructure || false).toString() +
      ((details as any).haveReferenceSmarts || false).toString();
    return this.molCache.getOrCreate(name, (_: any) =>
      this._fetchMolGetOrCreate(molString, scaffolds, molRegenerateCoords, details, alignByFirstSubstructure));
  }

  _rendererGetOrCreate(
    width: number, height: number, molString: string, scaffolds: IColoredScaffold[],
    molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean,
    alignByFirstSubstructure: boolean, details: object = {}, substructureObj?: ISubstruct): ImageData {
    const fetchMolObj: IMolRenderingInfo =
      this._fetchMol(molString, scaffolds, molRegenerateCoords,
        scaffoldRegenerateCoords, details, alignByFirstSubstructure);
    const rdKitMolCtx = fetchMolObj.molCtx;
    const rdKitMol = rdKitMolCtx.mol;//fetchMolObj.mol;
    const substruct = fetchMolObj.substruct;
    //merge row highlight data with substruct object from fetchMolObj
    const newSubstruct: ISubstruct = {};
    if (substructureObj && scaffolds.length) {
      const newAtoms = substruct.atoms ? substruct.atoms.concat(substructureObj.atoms ?? []) : substructureObj.atoms ?? [];
      const newAtomsUnique = newAtoms.filter((item, pos) => newAtoms.indexOf(item) === pos);
      const newBonds = substruct.bonds ? substruct.bonds.concat(substructureObj.bonds ?? []) : substructureObj.bonds ?? [];
      const newBondsUnique = newBonds.filter((item, pos) => newBonds.indexOf(item) === pos);
      if (substruct.highlightAtomColors) {
        if (substructureObj.highlightAtomColors) {
          for (const key in substruct.highlightAtomColors)
            substructureObj.highlightAtomColors[key] = substruct.highlightAtomColors[key];
        }
      }
      if (substruct.highlightBondColors) {
        if (substructureObj.highlightBondColors) {
          for (const key in substruct.highlightBondColors)
            substructureObj.highlightBondColors[key] = substruct.highlightBondColors[key];
        }
      }
      newSubstruct.atoms = newAtomsUnique;
      newSubstruct.bonds = newBondsUnique;
      newSubstruct.highlightAtomColors = substructureObj.highlightAtomColors;
      newSubstruct.highlightBondColors = substructureObj.highlightBondColors;
    }

    const canvas = this.ensureCanvasSize(width, height);//new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
    this.canvasCounter++;
    if (rdKitMol != null) {
      drawRdKitMoleculeToOffscreenCanvas(rdKitMolCtx, width, height, canvas,
        scaffolds.length ? substructureObj ? newSubstruct : substruct : substructureObj ?? null);
    } else {
      // draw a crossed rectangle
      ctx.clearRect(0, 0, width, height);
      drawErrorCross(ctx, width, height);
    }

    return ctx.getImageData(0, 0, !Math.floor(width) ? 1 : width, !Math.floor(height) ? 1 : height);
  }

  _fetchRender(
    width: number, height: number, molString: string, scaffolds: IColoredScaffold[],
    molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean,
    alignByFirstSubstructure: boolean, details: object = {}, substructureObj?: ISubstruct): ImageData {
    const name = width + ' || ' + height + ' || ' +
      molString + ' || ' + JSON.stringify(scaffolds) + ' || ' +
      molRegenerateCoords + ' || ' + scaffoldRegenerateCoords + ' || ' +
      ((details as any).haveReferenceSmarts || false).toString() + ' || ' + JSON.stringify(substructureObj); ;

    return this.rendersCache.getOrCreate(name, (_: any) => this._rendererGetOrCreate(width, height,
      molString, scaffolds, molRegenerateCoords, scaffoldRegenerateCoords,
      alignByFirstSubstructure, details, substructureObj));
  }

  _drawMolecule(x: number, y: number, w: number, h: number, onscreenCanvas: HTMLCanvasElement,
    molString: string, scaffolds: IColoredScaffold[],
    molRegenerateCoords: boolean, scaffoldRegenerateCoords: boolean, cellStyle: DG.GridCellStyle,
    alignByFirstSubstructure: boolean, details: object = {}, substructureObj?: ISubstruct): void {
    const vertical = cellStyle !== undefined && cellStyle !== null ? cellStyle.textVertical : false;

    if (vertical) {
      h += w;
      w = h - w;
      h -= w;
    }
    if (Math.floor(w) < MIN_MOL_IMAGE_SIZE || Math.floor(h) < MIN_MOL_IMAGE_SIZE)
      return;

    const imageData = this._fetchRender(w, h, molString, scaffolds,
      molRegenerateCoords, scaffoldRegenerateCoords,
      alignByFirstSubstructure, details, substructureObj);

    if (vertical) {
      const ctx = onscreenCanvas.getContext('2d', {willReadFrequently: true})!;
      ctx.save();
      const scl = ctx.getTransform();
      ctx.resetTransform();
      ctx.translate(x + h, y);
      ctx.rotate(Math.PI / 2);
      if (scl.m11 < 1 || scl.m22 < 1)
        ctx.scale(scl.m11, scl.m22);
      const f = new OffscreenCanvas(imageData.width, imageData.height)!;
      f.getContext('2d')?.putImageData(imageData, 0, 0);
      ctx.drawImage(f, 0, 0);
      ctx.restore();
    } else {
      //const image = offscreenCanvas.getContext('2d')!.getImageData(0, 0, w, h);
      onscreenCanvas.getContext('2d', {willReadFrequently: true})!.putImageData(imageData, x, y);
    }
  }

  _initScaffoldString(colTemp: any, tagName: string): IColoredScaffold[] {
    const scaffoldString = colTemp ? colTemp[tagName] : null;
    if (scaffoldString?.endsWith(this.WHITE_MOLBLOCK_SUFFIX)) {
      if (colTemp[tagName])
        delete colTemp[tagName];
      return [];
    }
    return scaffoldString ? [{molecule: scaffoldString}] : [];
  }

  _initScaffoldArray(col: any, tagName: string, isTempCol?: boolean): IColoredScaffold[] {
    const scaffoldArrStr = !isTempCol ? col.getTag(tagName) : col ? col[tagName] : null;
    const getSortedScaffolds = (): IColoredScaffold[] => {
      let scaffoldArr: IColoredScaffold[] = JSON.parse(scaffoldArrStr);
      if (scaffoldArr.length > 0 && !scaffoldArr[0].hasOwnProperty('molecule'))
        scaffoldArr = scaffoldArr.reduce((acc: any, obj: any) => acc.concat(Object.values(obj)[0]), []);

      const scaffoldArrSorted = scaffoldArr.sort((a: any, b: any) => {
        const getNumAtoms = (molecule: string) => {
          if (molecule && !DG.chem.Sketcher.isEmptyMolfile(molecule)) {
            const mol = this._fetchMol(molecule, [], false, false, {}, false).molCtx.mol;
            if (mol)
              return mol.get_num_atoms();
            return 0;
          }
          return 0;
        };
        a.priority = a.priority ?? 1;
        b.priority = b.priority ?? 1;

        if (a.priority !== b.priority)
          return b.priority - a.priority;


        return getNumAtoms(a.molecule) - getNumAtoms(b.molecule);
      });
      return scaffoldArrSorted;
    };
    if (scaffoldArrStr) {
      const sortedScaffolds = this.sortedScaffoldsCache
        .getOrCreate(scaffoldArrStr, () => getSortedScaffolds());
      return sortedScaffolds;
    }
    return [];
  }

  render(g: any, x: number, y: number, w: number, h: number,
    gridCell: DG.GridCell, cellStyle: DG.GridCellStyle): void {
    const molString = gridCell.cell.value;
    if (molString == null || molString === '')
      return;

    const r = window.devicePixelRatio;
    x = r * x; y = r * y;
    w = r * w; h = r * h;

    // value-based drawing (coming from HtmlCellRenderer.renderValue)
    if (gridCell.cell.column == null) {
      this._drawMolecule(x, y, w, h, g.canvas, molString, [], false, false, cellStyle, false);
      return;
    }

    const colTemp = gridCell.cell.column.temp;
    const highlightInfo = this.getHighlightTagInfo(colTemp, gridCell);

    // TODO: make both filtering scaffold and single highlight scaffold appear

    if (highlightInfo.scaffolds && highlightInfo.alighByFirstSubtruct) {
      this._drawMolecule(x, y, w, h, g.canvas,
        molString, highlightInfo.scaffolds, false, false, cellStyle, highlightInfo.alighByFirstSubtruct);
    } else
      this.highlightByScaffoldCol(g, x, y, w, h, gridCell, cellStyle, colTemp, molString, highlightInfo.scaffolds);
  }

  getHighlightTagInfo(colTemp: any, gridCell: DG.GridCell): IHighlightTagInfo {
    const filter = this._initScaffoldArray(colTemp, FILTER_SCAFFOLD_TAG, true); //expected molBlock
    const align = this._initScaffoldString(colTemp, ALIGN_BY_SCAFFOLD_TAG);
    const highlight = this._initScaffoldArray(gridCell.cell.column, HIGHLIGHT_BY_SCAFFOLD_TAG);
    const scaffoldTreeHighlight = this._initScaffoldArray(gridCell.cell.column, SCAFFOLD_TREE_HIGHLIGHT);
    const alignByStructure = !!(filter.length && filter[0].align || align.length);
    const scaffolds = filter.concat(align).concat(scaffoldTreeHighlight).concat(highlight);
    return {scaffolds: scaffolds?.length ? scaffolds : undefined, alighByFirstSubtruct: alignByStructure};
  }

  highlightByScaffoldCol(g: any, x: number, y: number, w: number, h: number, gridCell: DG.GridCell,
    cellStyle: DG.GridCellStyle, colTemp: any, molString: string, highlightScaffolds?: IColoredScaffold[]): void {
    let molRegenerateCoords = colTemp && colTemp[REGENERATE_COORDS] === 'true';
    let scaffoldRegenerateCoords = false;
    const df = gridCell.cell.dataFrame;
    let rowScaffoldCol = null;
    let haveParentMol = false;
    let parentMolScaffoldMolString;

    // if given, take the 'scaffold-col' col
    if (colTemp) {
      let rowScaffoldColName = colTemp[SCAFFOLD_COL];
      if (!rowScaffoldColName) {
        rowScaffoldColName = colTemp[PARENT_MOL_COL];
        haveParentMol = !!rowScaffoldColName;
      }
      if (rowScaffoldColName) {
        const rowScaffoldColProbe = df.columns.byName(rowScaffoldColName);
        if (rowScaffoldColProbe !== null) {
          const scaffoldColTemp = rowScaffoldColProbe.temp;
          if (haveParentMol) {
            const parentMolScaffoldColName = scaffoldColTemp[SCAFFOLD_COL];
            if (parentMolScaffoldColName) {
              const idx = gridCell.tableRowIndex; // TODO: supposed to be != null?
              parentMolScaffoldMolString = df.get(parentMolScaffoldColName, idx!);
            }
          }
          scaffoldRegenerateCoords = scaffoldColTemp && scaffoldColTemp[REGENERATE_COORDS] === 'true';
          molRegenerateCoords = scaffoldRegenerateCoords;
          rowScaffoldCol = rowScaffoldColProbe;
        }
      }
    }

    const idx = gridCell.tableRowIndex; // TODO: supposed to be != null?

    //check for column with per-row ISubstruct objects for highlight
    let substructObj: ISubstruct | undefined = undefined;
    if (colTemp[SUBSTRUCT_COL]) {
      const rawSubstructCol = df.columns.byName(colTemp[SUBSTRUCT_COL]);
      if (rawSubstructCol)
        substructObj = rawSubstructCol.get(idx!);
    }

    if (rowScaffoldCol == null || rowScaffoldCol.name === gridCell.cell.column.name) {
      this._drawMolecule(x, y, w, h, g.canvas, molString, highlightScaffolds ?? [],
        molRegenerateCoords, false, cellStyle, false, {}, substructObj);
    } else {
      // drawing with a per-row scaffold
      const scaffoldMolString = df.get(rowScaffoldCol.name, idx!);
      const highlightScaffold = colTemp && colTemp[HIGHLIGHT_BY_SCAFFOLD_COL] === 'true';
      const details = (haveParentMol ? {
        mappedDummiesAreRGroups: true,
        useCoordGen: false,
        haveReferenceSmarts: true,
        parentMolScaffoldMolString,
      } : {});
      const scaffoldFromColumn: IColoredScaffold[] = highlightScaffold ? [{molecule: scaffoldMolString}] :
        [{molecule: scaffoldMolString, color: NO_SCAFFOLD_COLOR}];
      const totalScaffolds = highlightScaffolds ? scaffoldFromColumn.concat(highlightScaffolds) : scaffoldFromColumn;
      this._drawMolecule(x, y, w, h, g.canvas,
        molString, totalScaffolds, molRegenerateCoords, scaffoldRegenerateCoords, cellStyle, true, details, substructObj);
    }
  }
}

function hasNonZeroZCoords(molfile: string, numAtoms: number): boolean {
  const moveCursorToIdx = (steps: number, symbol: string) => {
    for (let i = 0; i < steps; i++)
      dataBeginIdx = molfile.indexOf(symbol, dataBeginIdx) + 1;
  };
  let dataBeginIdx = 0;
  const headerLinesNum = 4;
  //jump to atoms block
  moveCursorToIdx(headerLinesNum, '\n');
  if (MolfileHandler.isMolfileV2K(molfile)) {
    const zCoordShift = 20;
    const coordDigitsNum = 10;
    for (let i = 0; i < numAtoms; i++) {
      if (parseFloat(molfile.substring(dataBeginIdx + zCoordShift, dataBeginIdx + zCoordShift + coordDigitsNum)))
        return true;
      //go to next row
      dataBeginIdx = molfile.indexOf('\n', dataBeginIdx) + 1;
    }
  } else if (MolfileHandler.isMolfileV3K(molfile)) {
    //jump to atoms block
    const atomCountsLinesNum = 3;
    moveCursorToIdx(atomCountsLinesNum, '\n');
    for (let i = 0; i < numAtoms; i++) {
      //go to z coordinate start
      moveCursorToIdx(7, ' ');
      //get z coordinate end
      const zCoordEnd = molfile.indexOf(' ', dataBeginIdx);
      if (parseFloat(molfile.substring(dataBeginIdx, zCoordEnd)))
        return true;
      //go to next row
      dataBeginIdx = molfile.indexOf('\n', dataBeginIdx) + 1;
    }
  }
  return false;
}
