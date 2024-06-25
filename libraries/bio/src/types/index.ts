import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {Observable} from 'rxjs';

import {IWebEditorMonomer, MonomerType, PolymerType} from '../helm/types';
import {
  HELM_REQUIRED_FIELD as REQ,
  HELM_RGROUP_FIELDS as RGP, HELM_OPTIONAL_FIELDS as OPT, HELM_POLYMER_TYPE,
} from '../utils/const';
import {ALPHABET} from '../utils/macromolecule';

export type RGroup = {
  [RGP.CAP_GROUP_SMILES]: string,
  [RGP.ALTERNATE_ID]: string,
  [RGP.CAP_GROUP_NAME]: string,
  [RGP.LABEL]: string,
}

/** https://github.com/PistoiaHELM/HELMMonomerSets/blob/master/HELMmonomerSchema.json */
export type Monomer = {
  [REQ.SYMBOL]: string,
  [REQ.NAME]: string,
  [REQ.MOLFILE]: string,
  [REQ.AUTHOR]: string,
  [REQ.ID]: number,
  [REQ.RGROUPS]: RGroup[],
  [REQ.SMILES]: string,
  [REQ.POLYMER_TYPE]: PolymerType,
  [REQ.MONOMER_TYPE]: MonomerType,
  [REQ.CREATE_DATE]: string | null,
  [OPT.NATURAL_ANALOG]?: string,
  [OPT.META]?: { [property: string]: any },

  lib?: IMonomerLib,
  wem?: IWebEditorMonomer,
};

export type MonomerLibSummaryType = { [polymerType: string]: number };

export interface IMonomerLib {
  get source(): string | undefined;
  get error(): string | undefined;

  /* Gets library monomer for sequence monomer */
  getMonomer(polymerType: PolymerType | null, monomerSymbol: string): Monomer | null;
  addMissingMonomer(polymerType: PolymerType, monomerSymbol: string): Monomer;
  getMonomerMolsByPolymerType(polymerType: PolymerType): { [monomerSymbol: string]: string } | null;
  getMonomerSymbolsByRGroup(rGroupNumber: number, polymerType: PolymerType, element?: string): string[];
  getMonomerSymbolsByType(polymerType: PolymerType): string[];
  getPolymerTypes(): PolymerType[];
  update(lib: IMonomerLib): void;
  get onChanged(): Observable<any>;

  /** Summary string with lib monomer count by type
   * @deprecated Keep for backward compatibility */
  getSummary(): string;

  /** Summary with lib monomer count by type */
  getSummaryObj(): MonomerLibSummaryType;

  /** Gets dataframe with columns 'polymerType', 'count'. */
  getSummaryDf(): DG.DataFrame;

  getTooltip(polymerType: PolymerType, monomerSymbol: string): HTMLElement;
}

export const alphabetPolymerTypes = {
  [ALPHABET.DNA]: HELM_POLYMER_TYPE.RNA,
  [ALPHABET.RNA]: HELM_POLYMER_TYPE.RNA,
  [ALPHABET.PT]: HELM_POLYMER_TYPE.PEPTIDE,
  [ALPHABET.UN]: HELM_POLYMER_TYPE.PEPTIDE,
};
