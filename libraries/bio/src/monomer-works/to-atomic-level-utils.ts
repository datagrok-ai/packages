import {monomerWorksConsts as C} from './consts';
import {getMolGraph, LoopConstants, LoopVariables, MolfileWithMap, MolGraph, MonomerMap, MonomerMolGraphMap} from './types';
import {HELM_FIELDS, HELM_CORE_FIELDS, HELM_POLYMER_TYPE, HELM_MONOMER_TYPE,} from '../utils/const';
import {ALPHABET, GAP_SYMBOL} from '../utils/macromolecule/consts';
import {IMonomerLibBase, Monomer} from '../types';
import {ISeqMonomer, PolymerType} from '../helm/types';
import {helmTypeToPolymerType} from './monomer-works';


/** Get a mapping of peptide symbols to HELM monomer library objects with selected fields.
 * @param {IMonomerLib} monomerLib - Monomer library
 * @param {HELM_POLYMER_TYPE} polymerType - Polymer type
 * @param {ALPHABET} alphabet - Alphabet of the column
 * @return {Map<string, any>} - Mapping of peptide symbols to HELM monomer library objects with selected fields*/
export function getFormattedMonomerLib(
  monomerLib: IMonomerLibBase, polymerType: PolymerType, alphabet: ALPHABET
): Map<string, any> {
  const map = new Map<string, any>();
  for (const monomerSymbol of monomerLib.getMonomerSymbolsByType(polymerType)) {
    const it: Monomer = monomerLib.getMonomer(polymerType, monomerSymbol)!;
    if (
      polymerType === HELM_POLYMER_TYPE.RNA &&
      (it[HELM_FIELDS.MONOMER_TYPE] === HELM_MONOMER_TYPE.BRANCH ||
        alphabet === ALPHABET.DNA && it[HELM_FIELDS.SYMBOL] === C.DEOXYRIBOSE.symbol ||
        alphabet === ALPHABET.RNA && it[HELM_FIELDS.SYMBOL] === C.RIBOSE.symbol ||
        it[HELM_FIELDS.SYMBOL] === C.PHOSPHATE.symbol) ||
      polymerType === HELM_POLYMER_TYPE.PEPTIDE &&
      it[HELM_FIELDS.MONOMER_TYPE] !== HELM_MONOMER_TYPE.BRANCH
    ) {
      const monomerObject: { [key: string]: any } = {};
      HELM_CORE_FIELDS.forEach((field) => {
        //@ts-ignore
        monomerObject[field] = it[field];
      });
      map.set(it[HELM_FIELDS.SYMBOL], monomerObject);
    }
  }
  return map;
}

/** Translate a sequence of monomer symbols into Molfile V3000
 * @param {string[]} monomerSeq - Sequence of monomer symbols (canonical)
 * @param {Map<string, MolGraph>} monomersDict - Mapping of monomer symbols to MolGraph objects
 * @param {ALPHABET} alphabet - Alphabet of the column
 * @param {PolymerType} polymerType - Polymer type
 * @return {string} - Molfile V3000*/
export function monomerSeqToMolfile(
  monomerSeq: ISeqMonomer[], monomersDict: MonomerMolGraphMap,
  alphabet: ALPHABET, polymerType: PolymerType
): MolfileWithMap {
  if (monomerSeq.length === 0) {
    // throw new Error('monomerSeq is empty');
    return MolfileWithMap.createEmpty();
  }

  // define atom and bond counts, taking into account the bond type
  const getAtomAndBondCounts = getResultingAtomBondCounts;
  const {atomCount, bondCount} = getAtomAndBondCounts(monomerSeq, monomersDict, alphabet, polymerType);

  // create arrays to store lines of the resulting molfile
  const molfileAtomBlock = new Array<string>(atomCount);
  const molfileBondBlock = new Array<string>(bondCount);

  let addMonomerToMolblock: (monomer: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables, LC: LoopConstants) => void;

  let sugar = null;
  let phosphate = null;

  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    addMonomerToMolblock = addAminoAcidToMolblock;
  } else { // nucleotides
    addMonomerToMolblock = addNucleotideToMolblock;
    sugar = (alphabet === ALPHABET.DNA) ? getMolGraph(monomersDict, C.DEOXYRIBOSE) : getMolGraph(monomersDict, C.RIBOSE);
    phosphate = getMolGraph(monomersDict, C.PHOSPHATE);
  }
  const v: LoopVariables = {
    i: 0,
    nodeShift: 0,
    bondShift: 0,
    backbonePositionShift: new Array<number>(2).fill(0),
    branchPositionShift: new Array<number>(2).fill(0),
    backboneAttachNode: 0,
    branchAttachNode: 0,
    flipFactor: 1,
  };

  const LC: LoopConstants = {
    sugar: sugar!,
    phosphate: phosphate!,
    seqLength: monomerSeq.length,
    atomCount: atomCount,
    bondCount: bondCount,
  };

  const monomers: MonomerMap = new MonomerMap();
  const steabsCollection: number [] = [];
  let nAtoms = 0;

  for (v.i = 0; v.i < LC.seqLength; ++v.i) {
    const seqMonomer = monomerSeq[v.i];
    if (seqMonomer.symbol === GAP_SYMBOL) continue;
    const monomer = getMolGraph(monomersDict, {symbol: seqMonomer.symbol, polymerType: helmTypeToPolymerType(seqMonomer.biotype)})!;

    const mAtomFirst = v.nodeShift;
    const mBondFirst = v.bondShift;
    addMonomerToMolblock(monomer, molfileAtomBlock, molfileBondBlock, v, LC);
    //adding stereo atoms to array for further STEABS block generation
    monomer.stereoAtoms?.forEach((i) => steabsCollection.push(i + nAtoms));
    nAtoms += monomer.atoms.x.length;

    const mAtomCount = v.nodeShift - mAtomFirst;
    const mAtomList: number[] = new Array<number>(mAtomCount);
    for (let maI = 0; maI < mAtomCount; ++maI) mAtomList[maI] = mAtomFirst + maI;

    const mBondCount = v.bondShift - mBondFirst;
    const mBondList: number[] = new Array<number>(mBondCount);
    for (let mbI = 0; mbI < mBondCount; ++mbI) mBondList[mbI] = mBondFirst + mbI;

    monomers.set(v.i, {
      biotype: seqMonomer.biotype,
      symbol: seqMonomer.symbol,
      atoms: mAtomList, bonds: mBondList
    });
  }

  capResultingMolblock(molfileAtomBlock, molfileBondBlock, v, LC);

  const molfileCountsLine = C.V3K_BEGIN_COUNTS_LINE + atomCount + ' ' + bondCount + C.V3K_COUNTS_LINE_ENDING;

  // todo: possible optimization may be achieved by replacing .join('') with +=
  // since counterintuitively joining an array into a new string is reportedly
  // slower than using += as below

  let result = '';
  result += C.V3K_HEADER_FIRST_LINE;
  result += C.V3K_HEADER_SECOND_LINE;
  result += C.V3K_BEGIN_CTAB_BLOCK;
  result += molfileCountsLine;
  result += C.V3K_BEGIN_ATOM_BLOCK;
  result += molfileAtomBlock.join('');
  result += C.V3K_END_ATOM_BLOCK;
  result += C.V3K_BEGIN_BOND_BLOCK;
  result += molfileBondBlock.join('');
  result += C.V3K_END_BOND_BLOCK;
  if (steabsCollection.length > 0)
    result += getCollectionBlock(steabsCollection);
  result += C.V3K_END_CTAB_BLOCK;
  result += C.V3K_END;

  // return molfileParts.join('');
  return {molfile: result, monomers: monomers};
}


function getCollectionBlock(collection: number[]): string {
  //one row in STEABS block can be no longer than 80 symbols
  //maxSymbols = 80 symbols minus ' -\n' (4 symbols)
  const maxSymbols = 76;
  const rowsArray = [];

  let newCollectionRow = `M  V30 MDLV30/STEABS ATOMS=(${collection.length}`;
  for (let i = 0; i < collection.length; i++) {
    const updatedRow = `${newCollectionRow} ${collection[i]}`;
    if (updatedRow.length > maxSymbols) {
      rowsArray.push(`${newCollectionRow} -\n`);
      newCollectionRow = `M  V30 ${collection[i]}`;
    } else
      newCollectionRow = updatedRow;
    //in case last atom was added - close the block
    if (i === collection.length - 1)
      rowsArray.push(`${newCollectionRow})\n`);
  }
  return `M  V30 BEGIN COLLECTION\n${rowsArray.join('')}M  V30 END COLLECTION\n`;
}

/** Cap the resulting (after sewing up all the monomers) molfile with 'O'
 * @param {string[]} molfileAtomBlock - Array of lines of the resulting molfile atom block
 * @param {string[]} molfileBondBlock - Array of lines of the resulting molfile bond block
 * @param {LoopVariables} v - Loop variables
 * @param {LoopConstants} LC - Loop constants*/
function capResultingMolblock(
  molfileAtomBlock: string[], molfileBondBlock: string[],
  v: LoopVariables, LC: LoopConstants
): void {
  // add terminal oxygen
  const atomIdx = v.nodeShift + 1;
  molfileAtomBlock[LC.atomCount] = C.V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
    C.OXYGEN + ' ' + keepPrecision(v.backbonePositionShift[0]) + ' ' +
    v.flipFactor * keepPrecision(v.backbonePositionShift[1]) + ' ' + '0.000000 0' + '\n';

  // add terminal bond
  const firstAtom = v.backboneAttachNode;
  const secondAtom = atomIdx;
  molfileBondBlock[LC.bondCount] = C.V3K_BEGIN_DATA_LINE + v.bondShift + ' ' +
    1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
}

function addAminoAcidToMolblock(monomer: MolGraph, molfileAtomBlock: string[],
  molfileBondBlock: string[], v: LoopVariables
): void {
  v.flipFactor = (-1) ** (v.i % 2); // to flip every even monomer over OX
  addBackboneMonomerToMolblock(monomer, molfileAtomBlock, molfileBondBlock, v);
}

function addBackboneMonomerToMolblock(
  monomer: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables
): void {
  // todo: remove these comments to the docstrings of the corr. functions
  // construnct the lines of V3K molfile atom block
  fillAtomLines(monomer, molfileAtomBlock, v);

  // construct the lines of V3K molfile bond block
  fillBondLines(monomer, molfileBondBlock, v);

  // peptide bond
  fillChainExtendingBond(monomer, molfileBondBlock, v);

  // update branch variables if necessary
  if (monomer.meta.branchShift !== null && monomer.meta.terminalNodes.length > 2)
    updateBranchVariables(monomer, v);

  // update loop variables
  updateChainExtendingVariables(monomer, v);
}

function addNucleotideToMolblock(
  nucleobase: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables, LC: LoopConstants
): void {
  // construnct the lines of V3K molfile atom block corresponding to phosphate
  // and sugar
  if (v.i === 0) {
    addBackboneMonomerToMolblock(LC.sugar!, molfileAtomBlock, molfileBondBlock, v);
  } else {
    for (const monomer of [LC.phosphate, LC.sugar])
      addBackboneMonomerToMolblock(monomer!, molfileAtomBlock, molfileBondBlock, v);
  }

  addBranchMonomerToMolblock(nucleobase, molfileAtomBlock, molfileBondBlock, v);
}

function addBranchMonomerToMolblock(
  monomer: MolGraph, molfileAtomBlock: string[], molfileBondBlock: string[], v: LoopVariables
): void {
  fillBranchAtomLines(monomer, molfileAtomBlock, v);
  fillBondLines(monomer, molfileBondBlock, v);
  fillBackboneToBranchBond(monomer, molfileBondBlock, v);

  // C-N bond
  const bondIdx = v.bondShift;
  const firstAtom = v.branchAttachNode;
  const secondAtom = monomer.meta.terminalNodes[0] + v.nodeShift;
  molfileBondBlock[bondIdx - 1] = C.V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
    1 + ' ' + firstAtom + ' ' + secondAtom + '\n';

  // update loop variables
  v.bondShift += monomer.bonds.atomPairs.length + 1;
  v.nodeShift += monomer.atoms.atomTypes.length;
}

function updateChainExtendingVariables(monomer: MolGraph, v: LoopVariables): void {
  v.backboneAttachNode = v.nodeShift + monomer.meta.terminalNodes[1];
  v.bondShift += monomer.bonds.atomPairs.length + 1;

  v.nodeShift += monomer.atoms.atomTypes.length;
  v.backbonePositionShift[0] += monomer.meta.backboneShift?.[0] ?? 0; // todo: non-null check
  v.backbonePositionShift[1] += v.flipFactor * (monomer.meta.backboneShift?.[1] ?? 0);
}

function updateBranchVariables(monomer: MolGraph, v: LoopVariables): void {
  v.branchAttachNode = v.nodeShift + monomer.meta.terminalNodes[2];
  for (let i = 0; i < 2; ++i)
    v.branchPositionShift[i] = v.backbonePositionShift[i] + monomer.meta.branchShift![i];
}

function fillAtomLines(monomer: MolGraph, molfileAtomBlock: string[], v: LoopVariables): void {
  for (let j = 0; j < monomer.atoms.atomTypes.length; ++j) {
    const atomIdx = v.nodeShift + j + 1;
    molfileAtomBlock[v.nodeShift + j] = C.V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
      monomer.atoms.atomTypes[j] + ' ' +
      keepPrecision(v.backbonePositionShift[0] + monomer.atoms.x[j]) + ' ' +
      keepPrecision(v.backbonePositionShift[1] + v.flipFactor * monomer.atoms.y[j]) +
      ' ' + monomer.atoms.kwargs[j];
  }
}

// todo: remove as quickfix
function fillBranchAtomLines(monomer: MolGraph, molfileAtomBlock: string[], v: LoopVariables): void {
  for (let j = 0; j < monomer.atoms.atomTypes.length; ++j) {
    const atomIdx = v.nodeShift + j + 1;
    molfileAtomBlock[v.nodeShift + j] = C.V3K_BEGIN_DATA_LINE + atomIdx + ' ' +
      monomer.atoms.atomTypes[j] + ' ' +
      keepPrecision(v.branchPositionShift[0] + monomer.atoms.x[j]) + ' ' +
      keepPrecision(v.branchPositionShift[1] + v.flipFactor * monomer.atoms.y[j]) +
      ' ' + monomer.atoms.kwargs[j];
  }
}

function fillBondLines(monomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  // construct the lines of V3K molfile bond block
  for (let j = 0; j < monomer.bonds.atomPairs.length; ++j) {
    const bondIdx = v.bondShift + j + 1;
    const firstAtom = monomer.bonds.atomPairs[j][0] + v.nodeShift;
    const secondAtom = monomer.bonds.atomPairs[j][1] + v.nodeShift;
    let bondCfg = '';
    if (monomer.bonds.bondConfiguration.has(j)) {
      // flip orientation when necessary
      let orientation = monomer.bonds.bondConfiguration.get(j);
      if (v.flipFactor < 0)
        orientation = (orientation === 1) ? 3 : 1;
      bondCfg = ' CFG=' + orientation;
    }
    const kwargs = monomer.bonds.kwargs.has(j) ?
      ' ' + monomer.bonds.kwargs.get(j) : '';
    molfileBondBlock[v.bondShift + j] = C.V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
      monomer.bonds.bondTypes[j] + ' ' +
      firstAtom + ' ' + secondAtom + bondCfg + kwargs + '\n';
  }
}

function fillChainExtendingBond(monomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  if (v.backboneAttachNode !== 0) {
    const bondIdx = v.bondShift;
    const firstAtom = v.backboneAttachNode;
    const secondAtom = monomer.meta.terminalNodes[0] + v.nodeShift;
    molfileBondBlock[v.bondShift - 1] = C.V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
      1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
  }
}

// todo: remove
function fillBackboneToBranchBond(branchMonomer: MolGraph, molfileBondBlock: string[], v: LoopVariables): void {
  const bondIdx = v.bondShift;
  const firstAtom = v.branchAttachNode;
  const secondAtom = branchMonomer.meta.terminalNodes[0] + v.nodeShift;
  molfileBondBlock[bondIdx - 1] = C.V3K_BEGIN_DATA_LINE + bondIdx + ' ' +
    1 + ' ' + firstAtom + ' ' + secondAtom + '\n';
}

/** Compute the atom/bond counts for the resulting molfile, depending on the
 * type of polymer (peptide/nucleotide)
 * @param {string[]}monomerSeq - the sequence of monomers
 * @param {Map<string, MolGraph>}monomersDict - the dictionary of monomers
 * @param {ALPHABET}alphabet - the alphabet of the monomers
 * @param {HELM_POLYMER_TYPE}polymerType - the type of polymer
 * @return {{atomCount: number, bondCount: number}} - the atom/bond counts*/
function getResultingAtomBondCounts(
  monomerSeq: ISeqMonomer[], monomersDict: MonomerMolGraphMap,
  alphabet: ALPHABET, polymerType: PolymerType
): { atomCount: number, bondCount: number } {
  let atomCount = 0;
  let bondCount = 0;

  let monomerCount: number = 0;
  // sum up all the atoms/nodes provided by the sequence
  for (const seqMonomer of monomerSeq) {
    if (seqMonomer.symbol === GAP_SYMBOL) continue; // Skip for gap/empty monomer in MSA
    if (seqMonomer.symbol == '*')
      throw new Error(`Gap canonical symbol is '', not '*`);
    const monomer = getMolGraph(monomersDict, {symbol: seqMonomer.symbol, polymerType: helmTypeToPolymerType(seqMonomer.biotype)})!;
    atomCount += monomer.atoms.x.length;
    bondCount += monomer.bonds.bondTypes.length;
    monomerCount++;
  }

  // add extra values depending on the polymer type
  if (polymerType === HELM_POLYMER_TYPE.PEPTIDE) {
    // add the rightmost/terminating cap group 'OH' (i.e. 'O')
    atomCount += 1;
    // add chain-extending bonds (C-NH per each monomer pair and terminal C-OH)
    bondCount += monomerCount;
  } else { // nucleotides
    const sugar = (alphabet === ALPHABET.DNA) ?
      getMolGraph(monomersDict, C.DEOXYRIBOSE)! : getMolGraph(monomersDict, C.RIBOSE)!;
    const phosphate = getMolGraph(monomersDict, C.PHOSPHATE)!;

    // add phosphate per each pair of nucleobase symbols
    atomCount += (monomerSeq.length - 1) * phosphate.atoms.x.length;

    // add sugar per each nucleobase symbol
    atomCount += monomerSeq.length * sugar.atoms.x.length;

    // add the leftmost cap group 'OH' (i.e. 'O')
    atomCount += 1;

    // add bonds from phosphate monomers
    bondCount += (monomerSeq.length - 1) * phosphate.bonds.bondTypes.length;

    // add bonds from sugar monomers
    bondCount += monomerSeq.length * sugar.bonds.bondTypes.length;

    // exclude the first chain-extending bond O-P (absent, no 'leftmost' phosphate)
    bondCount -= 1;

    // add chain-extending and branch bonds (O-P, C-O and C-N per each nucleotide)
    bondCount += monomerSeq.length * 3;
  }

  return {atomCount, bondCount};
}

/** Keep precision upon floating point operations over atom coordinates
 * @param {number}x - the floating point number
 * @return {number} - the floating point number with the same precision
 */
export function keepPrecision(x: number): number {
  return Math.round(C.PRECISION_FACTOR * x) / C.PRECISION_FACTOR;
}

