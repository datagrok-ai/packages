/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';

import {HELM_FIELDS, HELM_POLYMER_TYPE, HELM_RGROUP_FIELDS} from '../utils/const';
import {ALPHABET, NOTATION} from '../utils/macromolecule/consts';
import {IMonomerLib, IMonomerLibBase, Monomer} from '../types';
import {getFormattedMonomerLib, keepPrecision} from './to-atomic-level-utils';
import {seqToMolFileWorker} from './seq-to-molfile';
import {Atoms, Bonds, hasMolGraph, ITypedArray, LibMonomerKey, MolGraph,
  MonomerMetadata, MonomerMolGraphMap, NumberWrapper, Point, setMolGraph} from './types';
import {ISeqHelper, ToAtomicLevelRes} from '../utils/seq-helper';
import {errInfo} from '../utils/err-info';
import {alphabetToPolymerType} from './utils';
import {HelmType, ISeqMonomer, PolymerType} from '../helm/types';
import {monomerWorksConsts as C} from './consts';

// todo: verify that all functions have return types

/** Convert Macromolecule column into Molecule column storing molfile V3000 with the help of a monomer library
 * @param {DG.DataFrame} df - DataFrame containing the column to be converted
 * @param {DG.Column} seqCol - Column containing the macromolecule sequence
 * @param {IMonomerLib} monomerLib - Monomer library
 */
export async function _toAtomicLevel(
  df: DG.DataFrame, seqCol: DG.Column<string>,
  monomerLib: IMonomerLib, seqHelper: ISeqHelper, rdKitModule: RDModule
): Promise<ToAtomicLevelRes> {
  if (seqCol.semType !== DG.SEMTYPE.MACROMOLECULE) {
    const msg: string = `Only the ${DG.SEMTYPE.MACROMOLECULE} columns can be converted to atomic level, ` +
      `the chosen column has semType '${seqCol.semType}'`;
    return {molCol: null, warnings: [msg]};
  }

  let srcCol: DG.Column<string> = seqCol;
  const seqUh = seqHelper.getSeqHandler(seqCol);

  // convert 'helm' to 'separator' units
  if (seqUh.notation !== NOTATION.SEPARATOR) {
    srcCol = seqUh.convert(NOTATION.SEPARATOR, '.');
    srcCol.name = seqCol.name; // Replace converted col name 'separator(<original>)' to '<original>';
  }

  let polymerType: PolymerType;
  let alphabet: ALPHABET;
  try {
    const srcSh = seqHelper.getSeqHandler(srcCol);
    alphabet = srcSh.alphabet as ALPHABET;
    polymerType = alphabetToPolymerType(alphabet);
  } catch (err: any) {
    const [errMsg, _errStack] = errInfo(err);
    return {molCol: null, warnings: [errMsg]};
  }

  const monomerSequencesArray: ISeqMonomer[][] = getMonomerSequencesArray(srcCol, seqHelper);
  const monomersDict = getMonomersDictFromLib(monomerSequencesArray, polymerType, alphabet, monomerLib, rdKitModule);
  const srcColLength = srcCol.length;

  const res = await seqToMolFileWorker(
    srcCol, monomersDict, alphabet, polymerType, monomerLib, seqHelper, rdKitModule);
  if (res.warnings.length > 0.05 * srcColLength)
    grok.shell.warning(`Molfile conversion resulted in ${res.warnings.length} errors`);

  return res;
}

/** Get jagged array of monomer symbols for the dataframe
 * @param {DG.Column} macroMolCol - Column with macro-molecules
 * @return {string[]} - Jagged array of monomer symbols for the dataframe */
export function getMonomerSequencesArray(macroMolCol: DG.Column<string>, seqHelper: ISeqHelper): ISeqMonomer[][] {
  const rowCount = macroMolCol.length;
  const result: ISeqMonomer[][] = new Array(rowCount);

  // split the string into monomers
  const sh = seqHelper.getSeqHandler(macroMolCol);

  let containsEmptyValues = false;
  const biotype: HelmType = sh.defaultBiotype;

  for (let rowIdx = 0; rowIdx < rowCount; ++rowIdx) {
    const seqSS = sh.getSplitted(rowIdx);
    containsEmptyValues ||= seqSS.length === 0;
    result[rowIdx] = wu.count(0).take(seqSS.length).filter((posIdx) => !seqSS.isGap(posIdx))
      .map((posIdx) => {
        return {position: posIdx, biotype: biotype, symbol: seqSS.getCanonical(posIdx)} as ISeqMonomer;
      }).toArray();
  }

  if (containsEmptyValues)
    grok.shell.warning(`Some values in the "${macroMolCol.name}" column are empty`);

  return result;
}


/** Get a mapping of monomer symbols to MolGraph objects. Notice, the
 * transformation from molfile V2000 to V3000 takes place,
 * with the help of async function call from Chem (RdKit module)
 * @param {string[]} monomerSequencesArray - Jagged array of monomer symbols for the dataframe
 * @param {IMonomerLib} monomerLib - Monomer library
 * @param {PolymerType} polymerType - Polymer type
 * @param {ALPHABET} alphabet - Alphabet
 * @return {Map<string, MolGraph>} - Mapping of monomer symbols to MolGraph objects*/
export function getMonomersDictFromLib(
  monomerSequencesArray: ISeqMonomer[][], polymerType: PolymerType, alphabet: ALPHABET,
  monomerLib: IMonomerLibBase, rdKitModule: RDModule
): MonomerMolGraphMap {
  // todo: exception - no gaps, no empty string monomers
  const formattedMonomerLib = getFormattedMonomerLib(monomerLib, polymerType, alphabet);
  const monomersDict: MonomerMolGraphMap = {};

  const pointerToBranchAngle: NumberWrapper = {
    value: null
  };

  // this must NOT be placed after translating monomer sequences
  // because adding branch monomers for nucleobases relies on these data
  if (polymerType === HELM_POLYMER_TYPE.RNA) {
    const symbols = (alphabet === ALPHABET.RNA) ?
      [C.RIBOSE, C.PHOSPHATE] : [C.DEOXYRIBOSE, C.PHOSPHATE];
    for (const sym of symbols)
      addMonomerToDict(monomersDict, sym.symbol, formattedMonomerLib, rdKitModule, polymerType, pointerToBranchAngle);
  }

  for (let rowI = 0; rowI < monomerSequencesArray.length; ++rowI) {
    const monomerSeq: ISeqMonomer[] = monomerSequencesArray[rowI];
    for (const seqMonomer of monomerSeq) {
      const sym = seqMonomer.symbol;
      if (sym === '') continue; // Skip gap/empty monomer for MSA
      try {
        if (polymerType === HELM_POLYMER_TYPE.RNA && sym.split(/\(|\)/).filter((e) => !!e).length === 3) {
          // special case for nucleobases
          const nsym = sym.split(/\(|\)/)[1];
          addMonomerToDict(monomersDict, nsym, formattedMonomerLib,
            rdKitModule, polymerType, pointerToBranchAngle);
          if (monomersDict[polymerType]?.[nsym])
            monomersDict[polymerType][sym] = monomersDict[polymerType][nsym];
        } else {
          addMonomerToDict(monomersDict, sym, formattedMonomerLib,
            rdKitModule, polymerType, pointerToBranchAngle);
        }
      } catch (err: any) {
        const errTxt = err instanceof Error ? err.message : err.toString();
        const errStack = err instanceof Error ? err.stack : undefined;
        console.error(`bio lib: getMonomersDictFromLib() sym='${sym}', error:\n${errTxt}\n${errStack}`);
        const errMsg = `Can't get monomer '${sym}' from library: ${errTxt}`; // Text for Datagrok error baloon
        throw new Error(errMsg);
      }
    }
  }

  return monomersDict;
}

/** Adds MolGraph object for 'sym' to the monomers dict when necessary
 * @param {Map<string, MolGraph>} monomersDict - Monomers dictionary
 * @param {string} sym - Monomer symbol
 * @param {Map<string, any>} formattedMonomerLib - Formatted monomer library
 * @param {any} moduleRdkit - RDKit module
 * @param {PolymerType} polymerType - Polymer type
 * @param {NumberWrapper} pointerToBranchAngle - Pointer to branch angle*/
function addMonomerToDict(
  monomersDict: MonomerMolGraphMap, sym: string,
  formattedMonomerLib: Map<string, any>, moduleRdkit: any,
  polymerType: PolymerType, pointerToBranchAngle: NumberWrapper
): void {
  const symKey: LibMonomerKey = {polymerType, symbol: sym};
  if (!hasMolGraph(monomersDict, symKey)) {
    const monomerData: MolGraph | null =
      getMolGraph(sym, formattedMonomerLib, moduleRdkit, polymerType, pointerToBranchAngle);
    if (monomerData)
      setMolGraph(monomersDict, symKey, monomerData);
    else {
      // todo: handle exception
      throw new Error(`Monomer with symbol '${sym}' is absent the monomer library`);
    }
  }
}

/** Construct the MolGraph object for specified monomerSymbol: the associated
 * graph is adjusted in XY plane and filled with default R-groups
 * @param {string} monomerSymbol - Monomer symbol
 * @param {Map<string, any>} formattedMonomerLib - Formatted monomer library
 * @param {any} moduleRdkit - RDKit module
 * @param {PolymerType} polymerType - Polymer type
 * @param {NumberWrapper} pointerToBranchAngle - Pointer to branch angle
 * @return {MolGraph | null} - MolGraph object or null if monomerSymbol is absent in the library*/
function getMolGraph(
  monomerSymbol: string, formattedMonomerLib: Map<string, any>,
  moduleRdkit: any, polymerType: PolymerType,
  pointerToBranchAngle: NumberWrapper
): MolGraph | null {
  if (!formattedMonomerLib.has(monomerSymbol))
    return null;
  else {
    const libObject = formattedMonomerLib.get(monomerSymbol);
    const capGroups = parseCapGroups(libObject[HELM_FIELDS.RGROUPS]);
    const capGroupIdxMap = parseCapGroupIdxMap(libObject[HELM_FIELDS.MOLFILE]);
    //in case molfile is molV2000 need to convert it to molV3000
    const molfileV3K = libObject[HELM_FIELDS.MOLFILE].includes('V3000') ? libObject[HELM_FIELDS.MOLFILE] :
      convertMolfileToV3K(removeRGroupLines(libObject[HELM_FIELDS.MOLFILE]), moduleRdkit);
    const counts = parseAtomAndBondCounts(molfileV3K);

    const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
    const bonds = parseBondBlock(molfileV3K, counts.bondCount);
    const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);
    const steabs = getAbsStereocenters(molfileV3K);

    const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta, stereoAtoms: steabs};

    if (polymerType === HELM_POLYMER_TYPE.PEPTIDE)
      adjustPeptideMonomerGraph(monomerGraph);
    else { // nucleotides
      if (monomerSymbol === C.RIBOSE.symbol || monomerSymbol === C.DEOXYRIBOSE.symbol)
        adjustSugarMonomerGraph(monomerGraph, pointerToBranchAngle);
      else if (monomerSymbol === C.PHOSPHATE.symbol)
        adjustPhosphateMonomerGraph(monomerGraph);
      else
        adjustBaseMonomerGraph(monomerGraph, pointerToBranchAngle);
    }

    setShiftsAndTerminalNodes(polymerType, monomerGraph, monomerSymbol);
    // todo: restore after debugging
    removeHydrogen(monomerGraph);

    removeRgroupKwargs(monomerGraph);

    return monomerGraph;
  }
}

function getAbsStereocenters(molfileV3K: string): number[] {
  let collection: number[] = [];
  let indexCollection = molfileV3K.indexOf('M  V30 MDLV30/STEABS ATOMS=('); // V3000 index for collections

  while (indexCollection !== -1) {
    indexCollection += 28;
    const collectionEnd = molfileV3K.indexOf(')', indexCollection);
    //using slice(1) because first digit in brackets is a number of stereo atoms
    collection = collection.concat(molfileV3K.substring(indexCollection, collectionEnd).split(' ')
      .slice(1).map((it) => parseInt(it)));
    indexCollection = collectionEnd;
    indexCollection = molfileV3K.indexOf('M  V30 MDLV30/STEABS ATOMS=(', indexCollection);
  }
  return collection;
}

function setShiftsAndTerminalNodes(
  polymerType: PolymerType, monomerGraph: MolGraph, monomerSymbol: string
): void {
  // remove the 'rightmost' chain-extending r-group node in the backbone
  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    setShifts(monomerGraph, polymerType);
    removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
  } else { // nucleotides
    if (monomerSymbol === C.RIBOSE.symbol || monomerSymbol === C.DEOXYRIBOSE.symbol) {
      // remove R2
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
      // set terminalNode2 (oxygen) as new R2
      monomerGraph.meta.rNodes[1] = monomerGraph.meta.terminalNodes[1];
      setTerminalNodes(monomerGraph.bonds, monomerGraph.meta); // set terminal nodes anew
      setShifts(monomerGraph, polymerType);
      // remove 'new' R2 (oxygen)
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
      // remove R1
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[0]);
      // remove the branching r-group
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[2]);
    } else if (monomerSymbol === C.PHOSPHATE.symbol) {
      monomerGraph.meta.terminalNodes[0] = monomerGraph.meta.rNodes[0];
      shiftCoordinates(
        monomerGraph,
        -monomerGraph.atoms.x[monomerGraph.meta.terminalNodes[0] - 1],
        -monomerGraph.atoms.y[monomerGraph.meta.terminalNodes[0] - 1]
      );
      setShifts(monomerGraph, polymerType);
      removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[1]);
    } else { // nucleobases
      // removeNodeAndBonds(monomerGraph, monomerGraph.meta.rNodes[0]);
    }
  }
}


/**
 * Get monomer metadata object
 * @param {Atoms} atoms - Atoms object
 * @param {Bonds} bonds - Bonds object
 * @param {string[]} capGroups - Cap groups
 * @param {Map<number, number>} capGroupIdxMap - Cap group index map
 * @return {MonomerMetadata}*/
function getMonomerMetadata(atoms: Atoms, bonds: Bonds, capGroups?: string[], capGroupIdxMap?: Map<number, number>
): MonomerMetadata {
  const meta: MonomerMetadata = {
    backboneShift: null,
    branchShift: null,
    terminalNodes: [],
    rNodes: [],
  };

  substituteCapGroups(atoms, capGroups!, capGroupIdxMap!);
  setRNodes(capGroupIdxMap!, meta);

  setTerminalNodes(bonds, meta);
  return meta;
}

/** Parse element symbols for R-groups from the HELM monomer library R-group field
 * @param {any[]} rGroupObjList - R-group object list
 * @return {Map<number, number>} - Cap group index map*/
export function parseCapGroups(rGroupObjList: any[]): string[] {
  // specifically for HELMCoreLibrary
  // considered only monoatomic rgroups
  // supposing that elements in rGroupObjList are sorted w.r.t. the rgroups idx
  const capGroupsArray: string[] = [];
  for (const obj of rGroupObjList) {
    let capGroup: string = obj[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES];

    // in some cases the smiles field is written with uppercase
    if (!capGroup)
      capGroup = obj[HELM_RGROUP_FIELDS.CAP_GROUP_SMILES_UPPERCASE];
    capGroup = capGroup.replace(/(\[|\]|\*|:|\d)/g, '');
    capGroupsArray.push(capGroup);
  }
  return capGroupsArray;
}


/** Substitute the cap group elements instead of R#
 * @param {Atoms} atoms - Atoms object
 * @param {string[]} capGroups - Cap groups
 * @param {Map<number, number>} capGroupIdxMap - Cap group index map*/
function substituteCapGroups(
  atoms: Atoms, capGroups: string[], capGroupIdxMap: Map<number, number>
): void {
  for (const [node, capIdx] of capGroupIdxMap)
    atoms.atomTypes[node - 1] = capGroups[capIdx - 1]; // -1 because molfile indexing starts from 1
}

function setRNodes(capGroupIdxMap: Map<number, number>, meta: MonomerMetadata): void {
  meta.rNodes = Array.from(capGroupIdxMap.keys());
  for (let i = 0; i < meta.rNodes.length; i++) {
    for (const j of [1, 2]) { // 1 and 2 by def. correspond to 'left/rightmost' r-nodes
      // swap the values if necessary, so that the "leftmost" r-node is at 0,
      // and the 'rightmost', at 1
      if (capGroupIdxMap.get(meta.rNodes[i]) === j) {
        const tmp = meta.rNodes[j - 1];
        meta.rNodes[j - 1] = meta.rNodes[i];
        meta.rNodes[i] = tmp;
      }
    }
  }
}

function setTerminalNodes(bonds: Bonds, meta: MonomerMetadata): void {
  const rNodes = meta.rNodes;
  meta.terminalNodes = new Array<number>(rNodes.length).fill(0);
  const terminalNodes = meta.terminalNodes;
  const atomPairs = bonds.atomPairs;
  let i = 0;
  let j = 0;
  while ((i < atomPairs.length) && j < terminalNodes.length) {
    // rNodes array is sorted so that its 0th and 1st elements (if both
    // present) correspond to the chain extending (i.e. not branching) r-groups
    for (let k = 0; k < terminalNodes.length; ++k) {
      for (let l = 0; l < 2; ++l) {
        if (atomPairs[i][l] === rNodes[k]) {
          terminalNodes[k] = atomPairs[i][(l + 1) % 2];
          if (rNodes.length > 2) {
          }
          ++j;
        }
      }
    }
    ++i;
  }
}

/** Sets shifts in 'meta' attribute of MolGraph
 * @param {MolGraph} molGraph - MolGraph object
 * @param {PolymerType} polymerType - Polymer type*/
function setShifts(molGraph: MolGraph, polymerType: PolymerType): void {
  if (molGraph.meta.rNodes.length > 1) {
    molGraph.meta.backboneShift = getShiftBetweenNodes(
      molGraph, molGraph.meta.rNodes[1] - 1,
      molGraph.meta.terminalNodes[0] - 1
    );
  }

  if (polymerType === HELM_POLYMER_TYPE.RNA && molGraph.meta.rNodes.length > 2) {
    molGraph.meta.branchShift = getShiftBetweenNodes(
      molGraph, molGraph.meta.rNodes[2] - 1,
      molGraph.meta.terminalNodes[0] - 1
    );
  }
}

/** Returns the pair [xShift, yShift] for specified node indices
 * @param {MolGraph} molGraph - MolGraph object
 * @param {number} rightNodeIdx - Right node index
 * @param {number} leftNodeIdx - Left node index
 * @return {number[]} - Shift between nodes*/
function getShiftBetweenNodes(
  molGraph: MolGraph, rightNodeIdx: number, leftNodeIdx: number
): number[] {
  return [
    keepPrecision(molGraph.atoms.x[rightNodeIdx] - molGraph.atoms.x[leftNodeIdx]),
    keepPrecision(molGraph.atoms.y[rightNodeIdx] - molGraph.atoms.y[leftNodeIdx]),
  ];
}


/** Helper function necessary to build a correct V3000 molfile out of V2000 with
 * specified r-groups
 * @param {string} molfileV2K - V2000 molfile
 * @return {string} - V2000 molfile without R-group lines*/
function removeRGroupLines(molfileV2K: string): string {
  let begin = molfileV2K.indexOf(C.V2K_A_LINE, 0);
  if (begin === -1)
    begin = molfileV2K.indexOf(C.V2K_RGP_LINE);
  const end = molfileV2K.indexOf(C.V3K_END, begin);
  return molfileV2K.substring(0, begin) + molfileV2K.substring(end);
}

/** V2000 to V3000 converter
 * @param {string} molfileV2K - V2000 molfile
 * @param {any} moduleRdkit - RDKit module
 * @return {string} - V3000 molfile*/
export function convertMolfileToV3K(molfileV2K: string, moduleRdkit: any): string {
  // The standard Chem converter is not used here because it relies on creation of moduleRdkit on each iteration
  const molObj = moduleRdkit.get_mol(molfileV2K);
  const molfileV3K = molObj.get_v3Kmolblock();
  molObj.delete();
  return molfileV3K;
}

/** Parse V3000 bond block and construct the Bonds object
 * @param {string} molfileV3K - V3000 molfile
 * @param {number} bondCount - Number of bonds
 * @return {Bonds} - Bonds object*/
export function parseBondBlock(molfileV3K: string, bondCount: number): Bonds {
  const bondTypes: Uint32Array = new Uint32Array(bondCount);
  const atomPairs: number[][] = new Array(bondCount);
  const bondConfiguration = new Map<number, number>();
  const kwargs = new Map<number, string>();

  let begin = molfileV3K.indexOf(C.V3K_BEGIN_BOND_BLOCK);
  begin = molfileV3K.indexOf('\n', begin);
  let end = begin;
  for (let i = 0; i < bondCount; ++i) {
    // parse bond type and atom pair
    const parsedValues: number[] = new Array(3);
    begin = molfileV3K.indexOf(C.V3K_BEGIN_DATA_LINE, end) + C.V3K_IDX_SHIFT;
    end = molfileV3K.indexOf(' ', begin);
    for (let k = 0; k < 3; ++k) {
      begin = end + 1;
      end = Math.min(molfileV3K.indexOf('\n', begin), molfileV3K.indexOf(' ', begin));
      parsedValues[k] = parseInt(molfileV3K.slice(begin, end));
    }
    bondTypes[i] = parsedValues[0];
    atomPairs[i] = parsedValues.slice(1);

    // parse keyword arguments
    const endOfLine = molfileV3K.indexOf('\n', begin);
    let lineRemainder = molfileV3K.slice(end, endOfLine);
    let beginCfg = lineRemainder.indexOf(C.V3K_BOND_CONFIG);
    if (beginCfg !== -1) {
      beginCfg = lineRemainder.indexOf('=', beginCfg) + 1;
      let endCfg = lineRemainder.indexOf(' ', beginCfg);
      if (endCfg === -1)
        endCfg = lineRemainder.length;
      const bondConfig = parseInt(lineRemainder.slice(beginCfg, endCfg));
      bondConfiguration.set(i, bondConfig);
      const removedSubstring = C.V3K_BOND_CONFIG + bondConfig.toString();
      lineRemainder = lineRemainder.replace(removedSubstring, '');
    }
    if (!lineRemainder)
      kwargs.set(i, lineRemainder);
  }

  return {
    bondTypes: bondTypes,
    atomPairs: atomPairs,
    bondConfiguration: bondConfiguration,
    kwargs: kwargs,
  };
}

/** Constructs mapping of r-group nodes to default capGroups, all numeration starting from 1.
 * According to https://pubs.acs.org/doi/10.1021/ci3001925, R1 and R2 are the chain extending attachment points,
 * while R3 is the branching attachment point.
 * @param {string} molfile - V2000 or V3000 molfile
 * @return {Map<number, number>} - Map of r-group nodes to default capGroups*/
export function parseCapGroupIdxMap(molfile: string): Map<number, number> {
  const isMolV3K = molfile.includes('V3000');
  return isMolV3K ? parseCapGroupIdxMapV3K(molfile) : parseCapGroupIdxMapV2K(molfile);
}

export function parseCapGroupIdxMapV2K(molfileV2K: string): Map<number, number> {
  const capGroupIdxMap = new Map<number, number>();

  // parse A-lines (RNA)
  let begin = molfileV2K.indexOf(C.V2K_A_LINE, 0);
  let end = begin;
  while (begin !== -1) {
    // parse the rNode to which the cap group is attached
    end = molfileV2K.indexOf('\n', begin);
    const rNode = parseInt(molfileV2K.substring(begin, end).replace(/^A\s+/, ''));

    // parse the capGroup index
    begin = molfileV2K.indexOf('R', end);
    end = molfileV2K.indexOf('\n', begin);
    const capGroup = parseInt(molfileV2K.substring(begin, end).replace(/^R/, ''));
    capGroupIdxMap.set(rNode, capGroup);

    begin = molfileV2K.indexOf(C.V2K_A_LINE, end);
  }

  // parse RGP lines (may be more than one in RNA monomers)
  begin = molfileV2K.indexOf(C.V2K_RGP_LINE, 0);
  end = molfileV2K.indexOf('\n', begin);
  while (begin !== -1) {
    begin += C.V2K_RGP_SHIFT;
    end = molfileV2K.indexOf('\n', begin);
    const rgpStringParsed = molfileV2K.substring(begin, end)
      .replaceAll(/\s+/g, ' ')
      .split(' ');
    const rgpIndicesArray = rgpStringParsed.map((el) => parseInt(el))
      .slice(1); // slice from 1 because the 1st value is the number of pairs in the line
    for (let i = 0; i < rgpIndicesArray.length; i += 2) {
      // there may be conflicting cap group definitions, like 3-O-Methylribose (2,5 connectivity) in HELMCoreLibrary
      if (capGroupIdxMap.has(rgpIndicesArray[i]) && capGroupIdxMap.get(rgpIndicesArray[i]) !== rgpIndicesArray[i + 1])
        throw new Error(`r-group index ${rgpIndicesArray[i]} has already been added with a different value`);
      else
        capGroupIdxMap.set(rgpIndicesArray[i], rgpIndicesArray[i + 1]);
    }
    begin = molfileV2K.indexOf(C.V2K_RGP_LINE, end);
  }
  return capGroupIdxMap;
}

export function parseCapGroupIdxMapV3K(molfileV3K: string): Map<number, number> {
  const capGroupIdxMap = new Map<number, number>();
  const regex = /M  V30 (\d+) R#.+RGROUPS=\((\d+) (\d+)\).*/gm;
  let res;
  while ((res = regex.exec(molfileV3K)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (res.index === regex.lastIndex)
      regex.lastIndex++;

    // index 1 matches array is the atom number, index 3 is R group number
    capGroupIdxMap.set(parseInt(res[1]), parseInt(res[3]));
  }

  return capGroupIdxMap;
}

export function parseAtomAndBondCounts(molfileV3K: string): { atomCount: number, bondCount: number } {
  molfileV3K = molfileV3K.replaceAll('\r', ''); // to handle old and new sdf standards

  // parse atom count
  let begin = molfileV3K.indexOf(C.V3K_BEGIN_COUNTS_LINE) + C.V3K_COUNTS_SHIFT;
  let end = molfileV3K.indexOf(' ', begin + 1);
  const numOfAtoms = parseInt(molfileV3K.substring(begin, end));

  // parse bond count
  begin = end + 1;
  end = molfileV3K.indexOf(' ', begin + 1);
  const numOfBonds = parseInt(molfileV3K.substring(begin, end));

  return {atomCount: numOfAtoms, bondCount: numOfBonds};
}

/** Parse V3000 atom block and return Atoms object. NOTICE: only atomTypes, x, y
 * and kwargs fields are set in the return value, with other fields dummy initialized.
 * @param {string} molfileV3K - V3000 molfile
 * @param {number} atomCount - number of atoms in the molecule
 * @return {Atoms} - Atoms object */
function parseAtomBlock(molfileV3K: string, atomCount: number): Atoms {
  const atomTypes: string[] = new Array(atomCount);
  const x: Float32Array = new Float32Array(atomCount);
  const y: Float32Array = new Float32Array(atomCount);
  const kwargs: string[] = new Array(atomCount);

  let begin = molfileV3K.indexOf(C.V3K_BEGIN_ATOM_BLOCK); // V3000 atoms block
  begin = molfileV3K.indexOf('\n', begin);
  let end = begin;

  for (let i = 0; i < atomCount; i++) {
    begin = molfileV3K.indexOf(C.V3K_BEGIN_DATA_LINE, begin) + C.V3K_IDX_SHIFT;
    end = molfileV3K.indexOf(' ', begin); // skip the idx row

    // parse atom type
    begin = end + 1;
    end = molfileV3K.indexOf(' ', begin);
    atomTypes[i] = molfileV3K.substring(begin, end);

    // parse X and Y coordinates of the atom
    const coordinate: number[] = new Array(2);
    for (let k = 0; k < 2; ++k) {
      begin = end + 1;
      end = molfileV3K.indexOf(' ', begin);
      coordinate[k] = parseFloat(molfileV3K.substring(begin, end));
    }
    x[i] = coordinate[0];
    y[i] = coordinate[1];

    // parse the remaining possible keyword arguments
    begin = end;
    end = molfileV3K.indexOf('\n', begin) + 1;
    kwargs[i] = molfileV3K.slice(begin, end);

    begin = end;
  }

  return {
    atomTypes: atomTypes,
    x: x,
    y: y,
    kwargs: kwargs,
  };
}

/** Remove hydrogen nodes
 * @param {MolGraph} monomerGraph - monomer graph*/
function removeHydrogen(monomerGraph: MolGraph): void {
  let i = 0;
  while (i < monomerGraph.atoms.atomTypes.length) {
    if (monomerGraph.atoms.atomTypes[i] === C.HYDROGEN) {
      removeNodeAndBonds(monomerGraph, i + 1); // i + 1 because molfile node indexing starts from 1
      --i;
      // monomerGraph.atoms.atomTypes[i] = 'Li';
    }
    ++i;
  }
}

/** After processing and removing r-groups, the KWARGS property might still contain RGROUPS lines.
 * this needs to be removed
 * @param {MolGraph} monomerGraph - monomer graph*/
function removeRgroupKwargs(monomerGraph: MolGraph): void {
  const molv3kRGroupKwargLine = ' RGROUPS=(1 1)';
  for (let i = 0; i < (monomerGraph.atoms.kwargs?.length ?? 0); i++) {
    const kwarg = monomerGraph.atoms.kwargs[i];
    if (kwarg && kwarg.includes(molv3kRGroupKwargLine))
      monomerGraph.atoms.kwargs[i] = kwarg.replace(molv3kRGroupKwargLine, ''); // remove the line
  }
}

/** Remove node 'removedNode' and the associated bonds. Notice, numeration of
 * nodes in molfiles starts from 1, not 0
 * @param {MolGraph} monomerGraph - monomer graph
 * @param {number} removedNode - node to be removed*/
function removeNodeAndBonds(monomerGraph: MolGraph, removedNode?: number): void {
  if (typeof removedNode !== 'undefined') {
    const removedNodeIdx = removedNode - 1;
    const atoms = monomerGraph.atoms;
    const bonds = monomerGraph.bonds;
    const meta = monomerGraph.meta;

    // remove the node from atoms
    atoms.atomTypes.splice(removedNodeIdx, 1);
    atoms.x = spliceTypedArray<Float32Array>(Float32Array, atoms.x, removedNodeIdx, 1);
    atoms.y = spliceTypedArray<Float32Array>(Float32Array, atoms.y, removedNodeIdx, 1);
    atoms.kwargs.splice(removedNodeIdx, 1);

    // update the values of terminal and r-group nodes if necessary
    for (let i = 0; i < meta.terminalNodes.length; ++i) {
      if (meta.terminalNodes[i] > removedNode)
        --meta.terminalNodes[i];
      else if (meta.terminalNodes[i] === removedNode)
        meta.terminalNodes[i] = -1; // sentinel to mark the value as removed
    }
    for (let i = 0; i < meta.rNodes.length; ++i) {
      if (meta.rNodes[i] > removedNode)
        --meta.rNodes[i];
      else if (meta.rNodes[i] === removedNode)
        meta.rNodes[i] = -1; // sentinel to mark the value as removed
    }

    // update indices of atoms in bonds
    let i = 0;
    while (i < bonds.atomPairs.length) {
      const firstAtom = bonds.atomPairs[i][0];
      const secondAtom = bonds.atomPairs[i][1];
      if (firstAtom === removedNode || secondAtom === removedNode) {
        bonds.atomPairs.splice(i, 1);
        bonds.bondTypes = spliceTypedArray<Uint32Array>(Uint32Array, bonds.bondTypes, i, 1);
        if (bonds.bondConfiguration.has(i))
          bonds.bondConfiguration.delete(i);
        if (bonds.kwargs.has(i))
          bonds.kwargs.delete(i);
        --i;
      } else {
        bonds.atomPairs[i][0] = (firstAtom > removedNode) ? firstAtom - 1 : firstAtom;
        bonds.atomPairs[i][1] = (secondAtom > removedNode) ? secondAtom - 1 : secondAtom;
      }
      ++i;
    }

    // update bondConfiguration and kwargs keys
    let keys = Array.from(bonds.bondConfiguration.keys());
    keys.forEach((key) => {
      if (bonds.bondConfiguration.has(key) && key > removedNodeIdx) {
        const value = bonds.bondConfiguration.get(key)!;
        bonds.bondConfiguration.delete(key);
        bonds.bondConfiguration.set(key - 1, value);
      }
    });
    keys = Array.from(bonds.kwargs.keys());
    keys.forEach((key) => {
      if (bonds.kwargs.has(key) && key > removedNodeIdx) {
        const value = bonds.kwargs.get(key)!;
        bonds.kwargs.delete(key);
        bonds.kwargs.set(key - 1, value);
      }
    });
  }
}

// todo: rewrite the following two functions using templates,
function spliceTypedArray<T extends ITypedArray>(
  TConstructor: { new(length: number): T; }, typedArray: T, start: number, count: number
) {
  const result = new TConstructor(typedArray.length - count);
  let i = 0;
  let k = 0;
  while (i < typedArray.length) {
    if (i === start)
      i += count;
    result[k] = typedArray[i];
    ++k;
    ++i;
  }
  return result;
}


/** Adjust the peptide MolGraph to default/standardized position
 * @param {MolGraph} monomer - monomer graph*/
function adjustPeptideMonomerGraph(monomer: MolGraph): void {
  const centeredNode = monomer.meta.terminalNodes[0] - 1; // node indexing in molfiles starts from 1
  const rotatedNode = monomer.meta.rNodes[0] - 1;
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  // place nodeOne at origin
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // angle is measured between OY and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);

  // rotate the centered graph, so that 'nodeTwo' ends up on the positive ray of OY
  rotateCenteredGraph(monomer.atoms, -angle);

  if (x[monomer.meta.rNodes[1] - 1] < 0)
    flipMonomerAroundOY(monomer);

  const doubleBondedOxygen = findDoubleBondedCarbonylOxygen(monomer);
  if (doubleBondedOxygen != null) {
    // flip carboxyl and R if necessary
    flipCarboxylAndRadical(monomer, doubleBondedOxygen);

    // flip hydroxyl group with double-bound O inside carboxyl group if necessary
    flipHydroxilGroup(monomer, doubleBondedOxygen);
  }
}

function adjustPhosphateMonomerGraph(monomer: MolGraph): void {
  //need to rotate phosphate so that O-P-O is on OX axis, this is not always possible, but we can always
  // make sure both O's are on the OX axis

  const centeredNode = monomer.meta.rNodes[1] - 1; // Oxigen 1
  const rotatedNode = monomer.meta.rNodes[0] - 1; // Oxygen
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  // place nodeOne at origin
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // angle is measured between OY and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);

  // rotate the centered graph so that O-P-O is on OX
  rotateCenteredGraph(monomer.atoms, Math.PI / 2 - angle);
}

function adjustSugarMonomerGraph(monomer: MolGraph, pointerToBranchAngle: NumberWrapper): void {
  // eslint-disable-next-line max-len
  // sugars connect with R1 to previous nucleotide phosphate, R3 to the nucleobase and R2 to the next nucleotide phosphate
  // need to adjust the graph so that R1 is looking left, R2 is looking right and R3 is looking up
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  let centeredNode = monomer.meta.terminalNodes[0] - 1;
  const rotatedNode = monomer.meta.rNodes[1] - 1;

  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);
  // check if the sugar needs to be flipped around (mirrored)
  // orient sugar with R3 pointing up
  const r3Angle = findAngleWithOY(x[monomer.meta.rNodes[2] - 1], y[monomer.meta.rNodes[2] - 1]);
  rotateCenteredGraph(monomer.atoms, -r3Angle);
  // console.log(x[monomer.meta.rNodes[0] - 1], x[monomer.meta.rNodes[1] - 1]);
  // if r1 is to the right of r2, flip the sugar around OY
  if (x[monomer.meta.rNodes[0] - 1] > x[monomer.meta.rNodes[1] - 1])
    flipMonomerAroundOY(monomer);

  // angle is measured between OX and the rotated node
  const angle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);
  // rotate the centered graph so that the rotated node in on OX
  rotateCenteredGraph(monomer.atoms, 3 * Math.PI / 2 - angle);

  pointerToBranchAngle.value = getAngleBetweenSugarBranchAndOY(monomer);
  centeredNode = monomer.meta.terminalNodes[0] - 1;
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);
}

function adjustBaseMonomerGraph(monomer: MolGraph, pointerToBranchAngle: NumberWrapper): void {
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;

  const centeredNode = monomer.meta.terminalNodes[0] - 1; // node indexing in molfiles starts from 1
  const rotatedNode = monomer.meta.rNodes[0] - 1;

  // center graph at centeredNode
  shiftCoordinates(monomer, -x[centeredNode], -y[centeredNode]);

  // rotate so that the branch bond is aligned with that in sugar
  const baseBranchToOYAngle = findAngleWithOY(x[rotatedNode], y[rotatedNode]);
  const sugarBranchToOYAngle = pointerToBranchAngle.value;
  if (sugarBranchToOYAngle) {
    rotateCenteredGraph(monomer.atoms,
      Math.PI - baseBranchToOYAngle + sugarBranchToOYAngle);
  } else
    throw new Error('The value of sugarBranchToOYAngle is null');

  // scale graph in case its size does not fit the scale of phosphate and sugar
  // todo: consider extending to other monomer types
  const p1 = {
    x: x[monomer.meta.rNodes[0] - 1],
    y: y[monomer.meta.rNodes[0] - 1],
  };
  const p2 = {
    x: x[monomer.meta.terminalNodes[0] - 1],
    y: y[monomer.meta.terminalNodes[0] - 1],
  };
  const bondLength = getEuclideanDistance(p1, p2);
  if (bondLength != 1) {
    for (let i = 0; i < x.length; ++i) {
      x[i] = keepPrecision(x[i] / bondLength);
      y[i] = keepPrecision(y[i] / bondLength);
    }
  }
}

function getEuclideanDistance(p1: Point, p2: Point): number {
  return keepPrecision(Math.sqrt(
    (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
  ));
}

/** Flip carboxyl group with the radical in a peptide monomer in case the
 * carboxyl group is in the lower half-plane
 * @param {MolGraph}monomer - peptide monomer
 * @param {number}doubleBondedOxygen - index of the double-bonded oxygen atom*/
function flipCarboxylAndRadical(monomer: MolGraph, doubleBondedOxygen: number): void {
  // verify that the carboxyl group is in the lower half-plane
  if (monomer.atoms.y[monomer.meta.rNodes[1] - 1] < 0 &&
    monomer.atoms.y[doubleBondedOxygen - 1] < 0) {
    flipMonomerAroundOX(monomer);

    rotateCenteredGraph(monomer.atoms,
      -findAngleWithOX(
        monomer.atoms.x[monomer.meta.terminalNodes[1] - 1],
        monomer.atoms.y[monomer.meta.terminalNodes[1] - 1]
      )
    );
  }
}


/** Finds angle between OY and the ray joining origin with (x, y)
 * @param {number}x
 * @param {number}y
 * @return {number} angle in radians*/
function findAngleWithOY(x: number, y: number): number {
  let angle;
  if (x === 0)
    angle = y > 0 ? 0 : Math.PI;
  else if (y === 0)
    angle = x > 0 ? -Math.PI / 2 : Math.PI / 2;
  else {
    const tan = y / x;
    const atan = Math.atan(tan);
    angle = (x < 0) ? Math.PI / 2 + atan : -Math.PI / 2 + atan;
  }
  return angle;
}

/** Finds angle between OX and the ray joining origin with (x, y)
 * @param {number}x
 * @param {number}y
 * @return {number} angle in radians
 */
function findAngleWithOX(x: number, y: number): number {
  return findAngleWithOY(x, y) + Math.PI / 2;
}

/**  Rotate the graph around the origin by 'angle'
 * @param {Atoms}atoms - atoms of the graph
 * @param {number}angle - angle in radians*/
function rotateCenteredGraph(atoms: Atoms, angle: number): void {
  if (angle !== 0) {
    const x = atoms.x;
    const y = atoms.y;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < x.length; ++i) {
      const tmp = x[i];
      x[i] = keepPrecision(tmp * cos - y[i] * sin);
      y[i] = keepPrecision(tmp * sin + y[i] * cos);
    }
  }
}

/** Flip monomer graph around OX axis preserving stereometry
 * @param {MolGraph}monomer - monomer graph*/
function flipMonomerAroundOX(monomer: MolGraph): void {
  flipMolGraph(monomer, true);
}

/** Flip monomer graph around OY axis preserving stereometry
 * @param {MolGraph}monomer - monomer graph*/
function flipMonomerAroundOY(monomer: MolGraph): void {
  flipMolGraph(monomer, false);
}

/** Flip graph around a specified axis: 'true' corresponds to OX, 'false' to OY
 * @param {MolGraph}molGraph - graph to flip
 * @param {boolean}axis - axis to flip around*/
function flipMolGraph(molGraph: MolGraph, axis: boolean): void {
  if (axis) { // flipping around OX
    const y = molGraph.atoms.y;
    for (let i = 0; i < y.length; i++)
      y[i] = -y[i];
  } else { // flipping around OY
    const x = molGraph.atoms.x;
    for (let i = 0; i < x.length; i++)
      x[i] = -x[i];
  }

  // preserve the stereometry
  const orientation = molGraph.bonds.bondConfiguration;
  for (const [key, value] of orientation) {
    const newValue = value === 1 ? 3 : 1;
    orientation.set(key, newValue);
  }
}

function getAngleBetweenSugarBranchAndOY(molGraph: MolGraph): number {
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  const rNode = molGraph.meta.rNodes[2] - 1;
  const terminalNode = molGraph.meta.terminalNodes[2] - 1;

  const xShift = x[rNode] - x[terminalNode];
  const yShift = y[rNode] - y[terminalNode];

  return Math.atan2(xShift, yShift); // notice the fliped order of arguments
}

/** Flips double-bonded 'O' in carbonyl group with 'OH' in order for the monomers
 * to have standard representation simplifying their concatenation. The
 * monomer must already be adjusted with adjustPeptideMonomerGraph in order for this function to be implemented
 * @param {MolGraph}monomer - peptide monomer
 * @param {number}doubleBondedOxygen - index of the double-bonded oxygen atom*/
function flipHydroxilGroup(monomer: MolGraph, doubleBondedOxygen: number): void {
  const x = monomer.atoms.x;
  // -1 below because indexing of nodes in molfiles starts from 1, unlike arrays
  if (x[monomer.meta.rNodes[1] - 1] > x[doubleBondedOxygen - 1])
    swapNodes(monomer, doubleBondedOxygen, monomer.meta.rNodes[1]);
}

/** Determine the number of node (starting from 1) corresponding to the
 * double-bonded oxygen of the carbonyl group
 * @param {MolGraph}monomer - peptide monomer
 * @return {number} index of the double-bonded oxygen atom*/
function findDoubleBondedCarbonylOxygen(monomer: MolGraph): number | null {
  const bondsMap = constructBondsMap(monomer);
  let doubleBondedOxygen = 0;
  const sentinel = monomer.atoms.atomTypes.length;
  let i = 0;
  if (monomer.meta.terminalNodes.length < 2)
    return null;
  // iterate over the nodes bonded to the carbon and find the double one
  while (doubleBondedOxygen === 0) {
    const node = bondsMap.get(monomer.meta.terminalNodes[1])![i];
    if (monomer.atoms.atomTypes[node - 1] === C.OXYGEN && node !== monomer.meta.rNodes[1])
      doubleBondedOxygen = node;
    i++;
    if (i > sentinel) {
      // throw new Error(`Search for double-bonded Oxygen in ${monomer} has exceeded the limit of ${sentinel}`);
      return null;
    }
  }
  return doubleBondedOxygen;
}

/** Swap the Cartesian coordinates of the two specified nodes in MolGraph
 * @param {MolGraph}monomer - monomer graph
 * @param {number}nodeOne - index of the first node
 * @param {number}nodeTwo - index of the second node*/
function swapNodes(monomer: MolGraph, nodeOne: number, nodeTwo: number): void {
  const nodeOneIdx = nodeOne - 1;
  const nodeTwoIdx = nodeTwo - 1;
  const x = monomer.atoms.x;
  const y = monomer.atoms.y;
  const tmpX = x[nodeOneIdx];
  const tmpY = y[nodeOneIdx];
  x[nodeOneIdx] = x[nodeTwoIdx];
  y[nodeOneIdx] = y[nodeTwoIdx];
  x[nodeTwoIdx] = tmpX;
  y[nodeTwoIdx] = tmpY;
}

/** Maps a node to the list of nodes bound to it
 * @param {MolGraph}monomer - monomer graph
 * @return {Map<number, Array<number>>} map of nodes to the list of nodes bound to them*/
function constructBondsMap(monomer: MolGraph): Map<number, Array<number>> {
  const map = new Map<number, Array<number>>();
  for (const atomPairs of monomer.bonds.atomPairs) {
    for (let i = 0; i < 2; i++) {
      const key = atomPairs[i];
      const value = atomPairs[(i + 1) % 2];
      if (map.has(key))
        map.get(key)?.push(value);
      else
        map.set(key, new Array<number>(1).fill(value));
    }
  }
  return map;
}

/** Shift molGraph in the XOY plane
 * @param {MolGraph}molGraph - graph to shift
 * @param {number}xShift - shift along X axis
 * @param {number}yShift - shift along Y axis*/
function shiftCoordinates(molGraph: MolGraph, xShift: number, yShift?: number): void {
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  for (let i = 0; i < x.length; ++i) {
    x[i] = keepPrecision(x[i] + xShift);
    if (typeof yShift !== 'undefined')
      y[i] = keepPrecision(y[i] + yShift);
  }
}


export function convertMolGraphToMolfileV3K(molGraph: MolGraph): string {
  // counts line
  const atomType = molGraph.atoms.atomTypes;
  const x = molGraph.atoms.x;
  const y = molGraph.atoms.y;
  const atomKwargs = molGraph.atoms.kwargs;
  const bondType = molGraph.bonds.bondTypes;
  const atomPair = molGraph.bonds.atomPairs;
  const bondKwargs = molGraph.bonds.kwargs;
  const bondConfig = molGraph.bonds.bondConfiguration;
  const atomCount = atomType.length;
  const bondCount = molGraph.bonds.bondTypes.length;

  // todo rewrite using constants
  const molfileCountsLine = C.V3K_BEGIN_COUNTS_LINE + atomCount + ' ' + bondCount + C.V3K_COUNTS_LINE_ENDING;

  // atom block
  let molfileAtomBlock = '';
  for (let i = 0; i < atomCount; ++i) {
    const atomIdx = i + 1;
    const coordinate = [x[i].toString(), y[i].toString()];

    // format coordinates so that they have 6 digits after decimal point
    // for (let k = 0; k < 2; ++k) {
    //   const formatted = coordinate[k].toString().split('.');
    //   if (formatted.length === 1)
    //     formatted.push('0');
    //   formatted[1] = formatted[1].padEnd(V3K_ATOM_COORDINATE_PRECISION, '0');
    //   coordinate[k] = formatted.join('.');
    // }

    const atomLine = C.V3K_BEGIN_DATA_LINE + atomIdx + ' ' + atomType[i] + ' ' +
      coordinate[0] + ' ' + coordinate[1] + ' ' + atomKwargs[i];
    molfileAtomBlock += atomLine;
  }

  // bond block
  let molfileBondBlock = '';
  for (let i = 0; i < bondCount; ++i) {
    const bondIdx = i + 1;
    const firstAtom = atomPair[i][0];
    const secondAtom = atomPair[i][1];
    const kwargs = bondKwargs.has(i) ? ' ' + bondKwargs.get(i) : '';
    const bondCfg = bondConfig.has(i) ? ' CFG=' + bondConfig.get(i) : '';
    const bondLine = C.V3K_BEGIN_DATA_LINE + bondIdx + ' ' + bondType[i] + ' ' +
      firstAtom + ' ' + secondAtom + bondCfg + kwargs + '\n';
    molfileBondBlock += bondLine;
  }

  const molfileParts = [
    C.V3K_HEADER_FIRST_LINE,
    C.V3K_HEADER_SECOND_LINE,
    C.V3K_BEGIN_CTAB_BLOCK,
    molfileCountsLine,
    C.V3K_BEGIN_ATOM_BLOCK,
    molfileAtomBlock,
    C.V3K_END_ATOM_BLOCK,
    C.V3K_BEGIN_BOND_BLOCK,
    molfileBondBlock,
    C.V3K_END_BOND_BLOCK,
    C.V3K_END_CTAB_BLOCK,
    C.V3K_END,
  ];
  const resultingMolfile = molfileParts.join('');
  // console.log(resultingMolfile);

  return resultingMolfile;
}

export async function getSymbolToCappedMolfileMap(monomersLibList: any[]): Promise<Map<string, string> | undefined> {
  if (DG.Func.find({package: 'Chem', name: 'getRdKitModule'}).length === 0) {
    grok.shell.warning('Transformation to atomic level requires package "Chem" installed.');
    return;
  }

  const symbolToCappedMolfileMap = new Map<string, string>();
  const moduleRdkit = await grok.functions.call('Chem:getRdKitModule');

  for (const monomerLibObject of monomersLibList) {
    const monomerSymbol = monomerLibObject[HELM_FIELDS.SYMBOL];
    const capGroups = parseCapGroups(monomerLibObject[HELM_FIELDS.RGROUPS]);
    const capGroupIdxMap = parseCapGroupIdxMap(monomerLibObject[HELM_FIELDS.MOLFILE]);

    const molfileV3K = monomerLibObject[HELM_FIELDS.MOLFILE].includes('V3000') ? monomerLibObject[HELM_FIELDS.MOLFILE] :
      convertMolfileToV3K(removeRGroupLines(monomerLibObject[HELM_FIELDS.MOLFILE]), moduleRdkit);
    const counts = parseAtomAndBondCounts(molfileV3K);

    const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
    const bonds = parseBondBlock(molfileV3K, counts.bondCount);
    const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);

    const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta};

    removeHydrogen(monomerGraph);

    const molfile = convertMolGraphToMolfileV3K(monomerGraph);
    symbolToCappedMolfileMap.set(monomerSymbol, molfile);
  }
  return symbolToCappedMolfileMap;
}

/** Get the V3K molfile corresponding to the capped Monomer (default cap groups)
 * @param {Monomer} monomer
 * @return {string} V3K molfile*/
export function capPeptideMonomer(monomer: Monomer): string {
  const funcList: DG.Func[] = DG.Func.find({package: 'Chem', name: 'getRdKitModule'});
  const moduleRdkit = funcList[0].apply();

  const capGroups = parseCapGroups(monomer[HELM_FIELDS.RGROUPS]);
  const capGroupIdxMap = parseCapGroupIdxMap(monomer[HELM_FIELDS.MOLFILE]);
  const molfileV3K = monomer[HELM_FIELDS.MOLFILE].includes('V3000') ? monomer[HELM_FIELDS.MOLFILE] :
    convertMolfileToV3K(removeRGroupLines(monomer[HELM_FIELDS.MOLFILE]), moduleRdkit);
  const counts = parseAtomAndBondCounts(molfileV3K);

  const atoms = parseAtomBlock(molfileV3K, counts.atomCount);
  const bonds = parseBondBlock(molfileV3K, counts.bondCount);
  const meta = getMonomerMetadata(atoms, bonds, capGroups, capGroupIdxMap);

  const monomerGraph: MolGraph = {atoms: atoms, bonds: bonds, meta: meta};

  adjustPeptideMonomerGraph(monomerGraph);

  const molfile = convertMolGraphToMolfileV3K(monomerGraph);
  return molfile;
}
