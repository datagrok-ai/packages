import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {IMonomerLibBase} from '../types';

import {ISeqHandler} from './macromolecule/seq-handler';
import {MolfileWithMap} from '../monomer-works/types';
import {RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';

export type ToAtomicLevelRes = {
  molCol: DG.Column<string> | null,
  warnings: string[],
}

export interface IHelmToMolfileConverter {
  convertToSmiles(helmCol: DG.Column<string>): DG.Column<string>;
  molV3KtoMolV3KOCL(molV3k: string): string;
  getMolV3000ViaOCL(beautifiedMols: (RDMol | null)[], columnName: string): DG.Column<string>;
  convertToRdKitBeautifiedMolfileColumn(
    helmCol: DG.Column<string>, chiralityEngine: boolean, rdKitModule: RDModule, monomerLib: IMonomerLibBase
  ): DG.Column<string>;
  convertToMolfileV3KColumn(helmCol: DG.Column<string>): DG.Column<string>;
  convertToMolfileV3K(helmList: string[]): MolfileWithMap[];
}

export interface ISeqHelper {
  /**
   * @param helmCol {DG.Column<string>} Macromolecules in Helm format
   * @param chiralityEngine {boolean} [true] Use chirality engine for molecule visualization
   * @param highlight {boolean} [true] Generates molHighlightCol of result
   * @param overrideMonomerLib {IMonomerLibBase} [null] Override monomer library for monomers from reactions
   **/
  helmToAtomicLevel(
    helmCol: DG.Column<string>, chiralityEngine?: boolean, highlight?: boolean, overrideMonomerLib?: IMonomerLibBase
  ): Promise<ToAtomicLevelRes>;

  //sync method
  helmToAtomicLevelSingle(
    helm: string, converter: IHelmToMolfileConverter, chiralityEngine?: boolean, beautifyMol?: boolean
  ): MolfileWithMap;

  getSeqHandler(seqCol: DG.Column<string>): ISeqHandler;

  getSeqMonomers(seqCol: DG.Column<string>): string[];

  setUnitsToFastaColumn(sh: ISeqHandler): void;
  setUnitsToSeparatorColumn(sh: ISeqHandler): void;
  setUnitsToHelmColumn(sh: ISeqHandler): void;
  getHelmToMolfileConverter(monomerLib: IMonomerLibBase): Promise<IHelmToMolfileConverter>
}

export async function getSeqHelper(): Promise<ISeqHelper> {
  const packageName = 'Bio';
  const funcList = DG.Func.find({package: packageName, name: `getSeqHelper`});
  if (funcList.length === 0)
    throw new Error(`Package '${packageName}' must be installed for SeqHelper.`);
  const res = (await funcList[0].prepare().call()).getOutputParamValue() as ISeqHelper;
  return res;
}
