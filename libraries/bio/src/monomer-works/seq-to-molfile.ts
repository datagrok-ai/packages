import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';

import {ChemTags} from '@datagrok-libraries/chem-meta/src/consts';
import {ALPHABET} from '../utils/macromolecule';
import {
  MolfileWithMap, MolGraph, MonomerMap, MonomerMapValue, MonomerMolGraphMap, SeqToMolfileWorkerData, SeqToMolfileWorkerRes
} from './types';
import {ISeqHelper, ToAtomicLevelRes} from '../utils/seq-helper';
import {getMolColName, hexToPercentRgb} from './utils';
import {IMonomerLib, IMonomerLibBase} from '../types';
import {ISeqMonomer, PolymerType} from '../helm/types';
import {HelmTypes, PolymerTypes} from '../helm/consts';
import {ISubstruct} from '@datagrok-libraries/chem-meta/src/types';


export type SeqToMolfileResult = {
  mols: {
    molfile: string,
    monomers: MonomerMap
  }[],
  warnings: string[]
}

export async function seqToMolFileWorker(seqCol: DG.Column<string>, monomersDict: MonomerMolGraphMap,
  alphabet: ALPHABET, polymerType: PolymerType,
  monomerLib: IMonomerLib, seqHelper: ISeqHelper, rdKitModule: RDModule
): Promise<ToAtomicLevelRes> {
  const srcColLength = seqCol.length;
  const df: DG.DataFrame | undefined = seqCol.dataFrame;
  const threadCount = Math.max(navigator.hardwareConcurrency - 2, 1);
  const workers = new Array(threadCount).fill(null)
    .map(() => new Worker(new URL('./seq-to-molfile-worker', import.meta.url)));
  const chunkSize = srcColLength / threadCount;
  const promises = new Array<Promise<SeqToMolfileWorkerRes>>(threadCount);
  const seqSH = seqHelper.getSeqHandler(seqCol);
  const biotype = polymerType == PolymerTypes.RNA ? HelmTypes.NUCLEOTIDE : HelmTypes.AA;
  const seqList: ISeqMonomer[][] = wu.count(0).take(seqCol.length).map((rowIdx) => {
    const seqSS = seqSH.getSplitted(rowIdx);
    return wu.count(0).take(seqSS.length)
      .map((posIdx) => { return {position: posIdx, symbol: seqSS.getCanonical(posIdx), biotype: biotype} as ISeqMonomer; })
      .toArray();
  }).toArray();
  for (let i = 0; i < threadCount; i++) {
    const worker = workers[i];
    const start = Math.floor(i * chunkSize);
    const end = (i === threadCount - 1) ? srcColLength : Math.floor((i + 1) * chunkSize);
    promises[i] = new Promise<SeqToMolfileWorkerRes>((resolve) => {
      worker.onmessage = (res: { data: SeqToMolfileWorkerRes }): void => {
        resolve(res.data);
      };
    });
    worker.postMessage({seqList, monomersDict, alphabet, polymerType, start, end} as SeqToMolfileWorkerData);
  }

  const molList: MolfileWithMap[] = [];
  const warnings: string[] = [];
  await Promise.all(promises).then((resArray: SeqToMolfileWorkerRes[]) => {
    for (const resItem of resArray) {
      molList.push(...resItem.molfiles);
      warnings.push(...resItem.warnings);
    }
  });

  //const molHlList = molList.map((item: MolfileWithMap) => getMolHighlight(item.monomers.values(), monomerLib));

  setTimeout(() => {
    workers.forEach((worker) => {
      worker.terminate();
    });
  }, 0);
  const molColName = getMolColName(df, seqCol.name);
  const molCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, molColName, seqCol.length)
    .init((rowIdx) => molList[rowIdx]?.molfile);
  molCol.semType = DG.SEMTYPE.MOLECULE;
  molCol.meta.units = DG.UNITS.Molecule.MOLBLOCK;
  molCol.setTag(ChemTags.SEQUENCE_SRC_COL, seqCol.name);

  return {molCol: molCol, warnings: warnings};
}

export function getMolHighlight(monomerMaps: Iterable<MonomerMapValue>, monomerLib: IMonomerLibBase): ISubstruct {
  const hlAtoms: { [key: number]: number[] } = {};
  const hlBonds: { [key: number]: number[] } = {};

  for (const monomerMapValue of monomerMaps) {
    const wem = monomerLib.getWebEditorMonomer(monomerMapValue.biotype, monomerMapValue.symbol)!;
    const mColorStr = wem.backgroundcolor;
    const mColorA = hexToPercentRgb(mColorStr ?? DG.Color.toRgb(DG.Color.mouseOverRows)) ?? [1.0, 0.0, 0.0, 0.7];
    for (const mAtom of monomerMapValue.atoms)
      hlAtoms[mAtom] = mColorA;
    for (const mBond of monomerMapValue.bonds)
      hlBonds[mBond] = mColorA;
  }

  let resSubstruct: ISubstruct = {
    atoms: Object.keys(hlAtoms).map((k) => parseInt(k)),
    bonds: Object.keys(hlBonds).map((k) => parseInt(k)),
    highlightAtomColors: hlAtoms,
    highlightBondColors: hlBonds,
  };

  return resSubstruct;
}
