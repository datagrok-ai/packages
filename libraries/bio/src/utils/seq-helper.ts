import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const SUBSTRUCT_COL = 'substruct-col';

export interface ISubstruct {
  atoms?: number[],
  bonds?: number[],
  highlightAtomColors?: { [key: number]: number[] | null },
  highlightBondColors?: { [key: number]: number[] | null }
}

export type ToAtomicLevelResType = {
  molCol: DG.Column<string>;
  molHighlightCol: DG.Column<object>;
}

export interface ISeqHelper {
  /**
   * @param helmCol {DG.Column<string>} Macromolecules in Helm format
   * @param chiralityEngine {boolean} [true] Use chirality engine for molecule visualization
   * @param highlight {boolean} [true] Generates molHighlightCol of result
   **/
  helmToAtomicLevel(
    helmCol: DG.Column<string>, chiralityEngine?: boolean, highlight?: boolean
  ): Promise<ToAtomicLevelResType>;
}

export async function getSeqHelper(): Promise<ISeqHelper> {
  const packageName = 'Bio';
  const funcList = DG.Func.find({package: packageName, name: `getSeqHelper`});
  if (funcList.length === 0)
    throw new Error(`Package '${packageName}' must be installed for SeqHelper.`);
  const res = (await funcList[0].prepare().call()).getOutputParamValue() as ISeqHelper;
  return res;
}
