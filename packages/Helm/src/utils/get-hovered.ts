import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {HelmType, PolymerType, Atom, Mol, ISeqMonomer, HelmMol, HelmAtom} from '@datagrok-libraries/bio/src/helm/types';

import {helmTypeToPolymerType} from '@datagrok-libraries/bio/src/monomer-works/monomer-works';

import {HelmTypes} from '@datagrok-libraries/bio/src/helm/consts';
import {GAP_SYMBOL, GapOriginals, NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {SeqValueBase} from '@datagrok-libraries/bio/src/utils/macromolecule/seq-handler';

export function getHoveredMonomerFromEditorMol(
  argsX: number, argsY: number, mol: HelmMol, cellHeight?: number
): HelmAtom | null {
  /** @return {[number, number]} [atom, distance] */
  function getNearest(excluded: (number | undefined)[]): [number | undefined, number | undefined] {
    let atom: number | undefined = undefined;
    let distance: number | undefined = undefined;
    for (let atomI = 0; atomI < mol.atoms.length; ++atomI) {
      if (!excluded.includes(atomI)) {
        const aX: number = mol.atoms[atomI].p.x;
        const aY: number = mol.atoms[atomI].p.y;
        const distanceToAtomI: number = Math.sqrt((argsX - aX) ** 2 + (argsY - aY) ** 2);
        if (distance === undefined || distance > distanceToAtomI) {
          atom = atomI;
          distance = distanceToAtomI;
        }
      }
    }
    return [atom, distance];
  }

  const [firstAtomI, firstDistance] = getNearest([]);
  const [secondAtomI, secondDistance] = getNearest([firstAtomI]);

  let resAtom: HelmAtom | null = null;
  if (firstAtomI !== undefined && firstDistance !== undefined) {
    const firstAtom = mol.atoms[firstAtomI];
    if (secondAtomI !== undefined && secondDistance !== undefined) {
      if (firstDistance < secondDistance * 0.45)
        resAtom = firstAtom;
    } else {
      if (cellHeight && firstDistance < 0.35 * cellHeight)
        resAtom = firstAtom;
    }
  }
  return resAtom;
}

export function getSeqMonomerFromHelmAtom(seqValue: SeqValueBase, atom: HelmAtom): ISeqMonomer {
  const pos: number = atom.bio!.continuousId - 1;
  let canonicalSymbol = atom.elem;
  try { // for DNA/RNA, we might add phosphates and sugars
    if (!seqValue.isDna() && !seqValue.isRna())
      canonicalSymbol = seqValue.getSplitted().getCanonical(pos);
    else
      canonicalSymbol = seqValue.getSplittedWithSugarsAndPhosphates().getCanonical(pos);
  } catch (_) {}
  // const canonicalSymbol = atom.elem === GapOriginals[NOTATION.HELM] ? GAP_SYMBOL : atom.elem;
  return {position: atom.bio!.continuousId - 1, symbol: canonicalSymbol, biotype: atom.bio!.type};
}

/** Linear
 * @deprecated
 */
function getSeqMonomerFromHelm(pos: number, symbol: string, helmPrefix: string): ISeqMonomer {
  let resSeqMonomer: ISeqMonomer | undefined = undefined;
  const polymerTypeList: PolymerType[] = ['RNA', 'PEPTIDE', 'CHEM', 'BLOB', 'G'];
  for (const polymerType of polymerTypeList) {
    if (helmPrefix.startsWith(polymerType)) {
      let helmType: HelmType = HelmTypes.AA;
      if (polymerType == 'RNA')
        helmType = HelmTypes.NUCLEOTIDE;
      else if (polymerType == 'PEPTIDE')
        helmType = HelmTypes.AA;
      else if (polymerType == 'CHEM')
        helmType = HelmTypes.CHEM;
      resSeqMonomer = {position: pos, symbol: symbol, biotype: helmType};
    }
  }
  if (!resSeqMonomer)
    throw new Error(`Monomer not found for symbol = '${symbol}' and helmPrefix = '${helmPrefix}'.`);
  return resSeqMonomer;
}
