/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import wu from 'wu';
import {LRUCache} from 'lru-cache';

import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {ChemTags} from '@datagrok-libraries/chem-meta/src/consts';
import {addSubstructProvider, getMonomerHover, ISubstruct, setMonomerHover} from '@datagrok-libraries/chem-meta/src/types';

import {IMonomerLibBase} from '../types/index';
import {ISeqMonomer} from '../helm/types';
import {PolymerTypes} from '../helm/consts';
import {ALPHABET} from '../utils/macromolecule';
import {getMonomersDictFromLib} from './to-atomic-level';
import {monomerSeqToMolfile} from './to-atomic-level-utils';
import {MonomerHoverLink} from './utils';
import {getMolHighlight} from './seq-to-molfile';
import {MonomerMap} from './types';
import {IHelmToMolfileConverter, ISeqHelper} from '../utils/seq-helper';

export const MonomerHoverLinksTemp = 'MonomerHoverLinks';

export function addMonomerHoverLink(seqColTemp: any, resLink: MonomerHoverLink) {
  let mhhList = seqColTemp[MonomerHoverLinksTemp];
  if (!mhhList)
    mhhList = seqColTemp[MonomerHoverLinksTemp] = [];
  mhhList.push(resLink);
  seqColTemp[MonomerHoverLinksTemp] = mhhList;
}

/**
 * Builds a monomer hover link between sequence and molecule columns
 * throughPOM specifies if the sequence is translated through seqhelper using POM (default is false)
 */
export async function buildMonomerHoverLink(
  seqCol: DG.Column<string>, molCol: DG.Column<string>,
  monomerLib: IMonomerLibBase, seqHelper: ISeqHelper, rdKitModule: RDModule, throughPOM: boolean = false
): Promise<MonomerHoverLink> {
  const seqSH = seqHelper.getSeqHandler(seqCol);
  const isNucleotide = (seqSH.alphabet == ALPHABET.RNA || seqSH.alphabet == ALPHABET.DNA);
  const isNucleotideHelmSequence = seqSH.isHelm() && isNucleotide;
  // if the conversion goes through polymer object model, it is aware that DNA/RNA need sugars and phosphates, therefore, for fasta
  // of length 15, it will return 45 monomers. so we need to handle this case separately
  const isNucleotideNonHelmSequence = !seqSH.isHelm() && isNucleotide;

  const getSeqMonomerCorrectedPosition = (pos?: number) => {
    if (pos == undefined) return null;
    // if its dna or rna, we need to correct position as it will contain sugar and phosphate
    // toAtomicLevel returns 15 monomers for 15 nucleotides (r(n)p is one monmer), while helm converter returns 45
    if (isNucleotideHelmSequence)
      return throughPOM ? pos : Math.floor(pos / 3);
    if (isNucleotideNonHelmSequence)
      return throughPOM ? pos * 3 + 1 : pos;
    return pos;
  };

  const helmToMolfileConverter: IHelmToMolfileConverter | null = throughPOM ? await seqHelper.getHelmToMolfileConverter(monomerLib) : null;
  function buildMonomerMap(seqCol: DG.Column<string>, tableRowIdx: number): MonomerMap {
    const seqSH = seqHelper.getSeqHandler(seqCol);
    if (!throughPOM) {
      const seqSS = seqSH.getSplitted(tableRowIdx);
      const biotype = seqSH.defaultBiotype;
      const seqMList: ISeqMonomer[] = wu.count(0).take(seqSS.length)
        .map((posIdx) => { return {position: posIdx, symbol: seqSS.getCanonical(posIdx), biotype: biotype} as ISeqMonomer; })
        .toArray();

      const alphabet = seqSH.alphabet as ALPHABET;
      const polymerType = alphabet == ALPHABET.RNA || alphabet == ALPHABET.DNA ? PolymerTypes.RNA : PolymerTypes.PEPTIDE;
      const monomersDict = getMonomersDictFromLib([seqMList], polymerType, alphabet, monomerLib, rdKitModule);
      // Call seq-to-molfile worker core directly
      const molWM = monomerSeqToMolfile(seqMList, monomersDict, alphabet, polymerType);
      return molWM.monomers;
    } else {
      const helm = seqSH.getHelm(tableRowIdx);
      const molWM = seqHelper.helmToAtomicLevelSingle(helm, helmToMolfileConverter!, false, false); // skip mol beautification step. not needed.
      return molWM.monomers;
    }
  }

  const monomerMapLruCache = new LRUCache<string, MonomerMap>({max: 100});

  function getMonomerMap(seqCol: DG.Column<string>, tableRowIdx: number): MonomerMap | null {
    const seq = seqCol.get(tableRowIdx);
    if (seq == null) return null;

    let resMonomerMap = monomerMapLruCache.get(seq);
    if (!resMonomerMap)
      monomerMapLruCache.set(seq, resMonomerMap = buildMonomerMap(seqCol, tableRowIdx));

    return resMonomerMap;
  }

  const resLink: MonomerHoverLink = {
    targetCol: molCol,
    handler: (seqGridCell: DG.GridCell, seqMonomer: ISeqMonomer | null, targetGridCol: DG.GridColumn): boolean => {
      const grid = targetGridCol.grid;
      const tableRowIdx = seqGridCell.tableRowIndex!;
      const gridRowIdx = seqGridCell.gridRow;
      const targetGridCell = grid.cell(targetGridCol.name, gridRowIdx);
      const prev = getMonomerHover();
      if (!prev || (prev && (prev.dataFrameId != seqCol.dataFrame.id || prev.gridRowIdx != gridRowIdx ||
        prev.seqColName != seqCol.name || prev.seqPosition != seqMonomer?.position))
      ) {
        if (prev) {
          setMonomerHover(null);
          //prev.gridCell.grid?.invalidate();
          prev.gridCell.render();
        }
        if (!seqMonomer) {
          setMonomerHover(null);
          return true;
        }
        setMonomerHover({
          gridCell: targetGridCell,
          dataFrameId: seqCol.dataFrame.id,
          gridRowIdx: gridRowIdx,
          seqColName: seqCol.name,
          seqPosition: getSeqMonomerCorrectedPosition(seqMonomer?.position) ?? -1,
          getSubstruct: (): ISubstruct | undefined => { // Gets monomer highlight
            if (!seqMonomer || seqMonomer.symbol === '*')
              return undefined;

            const molMonomerMap = getMonomerMap(seqCol, tableRowIdx);
            if (!molMonomerMap)
              return undefined;

            const monomerMap = molMonomerMap.get(getSeqMonomerCorrectedPosition(seqMonomer?.position)!); // single monomer
            if (!monomerMap) return {atoms: [], bonds: [], highlightAtomColors: [], highlightBondColors: []};

            const res: ISubstruct = getMolHighlight([monomerMap], monomerLib);
            return res;
          }
        });

        // TODO: Invalidate targetGridCell
        //grid.invalidate();
        targetGridCell.render();
      }

      return true;
    },
    /* ISubstructProvider.*/getSubstruct: (tableRowIdx: number | null,): ISubstruct | undefined => { // Gets whole molecule highlight
      if (molCol.getTag(ChemTags.SEQUENCE_SRC_HL_MONOMERS) != 'true') return undefined;
      if (tableRowIdx == null) return undefined;
      const seq = seqCol.get(tableRowIdx);
      if (!seq) return undefined;

      const molMonomerMap = getMonomerMap(seqCol, tableRowIdx);
      if (!molMonomerMap) return undefined;
      const res: ISubstruct = getMolHighlight(molMonomerMap.values(), monomerLib);
      return res;
    }
  };

  addMonomerHoverLink(seqCol.temp, resLink);
  addSubstructProvider(molCol.temp, resLink);

  return resLink;
}

export function execMonomerHoverLinks(
  seqGridCell: DG.GridCell, seqMonomer: ISeqMonomer | null
): void {
  try {
    const seqCol = seqGridCell.tableColumn;
    if (!seqCol) return;

    const mhlList = getMonomerHoverLinks(seqCol);
    for (let mhlI = mhlList.length - 1; mhlI >= 0; --mhlI) {
      const mhl = mhlList[mhlI];
      const molGridCol = seqGridCell.grid.col(mhl.targetCol.name);
      if (molGridCol) {
        const handlerRes = mhl.handler(seqGridCell, seqMonomer, molGridCol);
        if (!handlerRes)
          break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export function getMonomerHoverLinks(seqCol: DG.Column<string>): MonomerHoverLink[] {
  return seqCol.temp[MonomerHoverLinksTemp] ?? [];
}
