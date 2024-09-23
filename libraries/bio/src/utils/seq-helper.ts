import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {MonomerHoverLink} from '../monomer-works/utils';

export const SUBSTRUCT_COL = 'substruct-col';

export type ToAtomicLevelRes = {
  mol: {
    col: DG.Column<string>,
    highlightCol: DG.Column<object>,
    monomerHoverLink: MonomerHoverLink,
  } | null,
  warnings: string[],
}

export interface ISeqHelper {
  /**
   * @param helmCol {DG.Column<string>} Macromolecules in Helm format
   * @param chiralityEngine {boolean} [true] Use chirality engine for molecule visualization
   * @param highlight {boolean} [true] Generates molHighlightCol of result
   **/
  helmToAtomicLevel(
    helmCol: DG.Column<string>, chiralityEngine?: boolean, highlight?: boolean
  ): Promise<ToAtomicLevelRes>;
}

export async function getSeqHelper(): Promise<ISeqHelper> {
  const packageName = 'Bio';
  const funcList = DG.Func.find({package: packageName, name: `getSeqHelper`});
  if (funcList.length === 0)
    throw new Error(`Package '${packageName}' must be installed for SeqHelper.`);
  const res = (await funcList[0].prepare().call()).getOutputParamValue() as ISeqHelper;
  return res;
}
