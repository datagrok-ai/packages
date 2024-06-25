import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {IMonomerLib} from '../types';
import {HelmType, PolymerType} from '../helm/types';
import {HelmTypes, PolymerTypes} from '../helm/consts';

/** Hypothetical interface to convert mol block notation.
 * It should be placed in the chem-meta package, and have an implementation in the Chem package.
 * So dependency of MonomerWorks on molfile conversion operation becomes explicit.
 */
export interface IMolfileConverter {
  convertV2000toV3000(src: string): string;

  convertV3000toV2000(src: string): string;
}

export class MonomerWorks {
  private monomerLib: IMonomerLib;

  //private molfileConverter: IMolfileConverter;

  constructor(monomerLib: IMonomerLib/*, molfileConverter: IMolfileConverter*/) {
    this.monomerLib = monomerLib;
    //this.molfileConverter = molfileConverter;
  }

  //types according to Monomer possible
  public getCappedRotatedMonomer(monomerType: PolymerType, monomerName: string): string | null {
    // TODO: Check type of monomerType arg
    const monomer = this.monomerLib.getMonomer(monomerType, monomerName);
    if (monomer)
      return monomer.molfile; //TODO cap

    return null;
  }
}

export function helmTypeToPolymerType(helmType: HelmType): PolymerType {
  let polymerType: PolymerType | undefined = undefined;
  switch (helmType) {
  case HelmTypes.BASE:
  case HelmTypes.SUGAR: // r - ribose, d - deoxyribose
  case HelmTypes.LINKER: // p - phosphate
  case HelmTypes.NUCLEOTIDE:
    // @ts-ignore
  case 'nucleotide':
    polymerType = PolymerTypes.RNA;
    break;
  case HelmTypes.AA:
    polymerType = PolymerTypes.PEPTIDE;
    break;
  case HelmTypes.CHEM:
    polymerType = PolymerTypes.CHEM;
    break;
  case HelmTypes.BLOB:
    polymerType = PolymerTypes.BLOB;
    break;
  default:
    polymerType = PolymerTypes.PEPTIDE;
    console.warn(`Unexpected HelmType '${helmType}'`);
  }
  return polymerType;
}
