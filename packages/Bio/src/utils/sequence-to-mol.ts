import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_toAtomicLevel} from '@datagrok-libraries/bio/src/monomer-works/to-atomic-level';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {getSeqHelper, ISeqHelper, ToAtomicLevelRes} from '@datagrok-libraries/bio/src/utils/seq-helper';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {ChemTags, ChemTemps} from '@datagrok-libraries/chem-meta/src/consts';
import {buildMonomerHoverLink} from '@datagrok-libraries/bio/src/monomer-works/monomer-hover';

import {checkInputColumn, checkInputColumnUI} from './check-input-column';
import {getMolColName} from '@datagrok-libraries/bio/src/monomer-works/utils';

export async function sequenceToMolfile(
  df: DG.DataFrame, macroMolecule: DG.Column, nonlinear: boolean, highlight: boolean,
  monomerLib: IMonomerLib, seqHelper: ISeqHelper, rdKitModule: RDModule
): Promise<ToAtomicLevelRes> {
  let res: ToAtomicLevelRes;
  if (nonlinear) {
    const seqHelper = await getSeqHelper();
    const seqSh = seqHelper.getSeqHandler(macroMolecule);

    let helmCol: DG.Column<string>;
    let seqColName!: string;
    if (seqSh.isHelm())
      helmCol = macroMolecule;
    else {
      seqColName = macroMolecule.name;
      macroMolecule.name = `__${seqColName}`;
      helmCol = seqSh.convert(NOTATION.HELM);
      helmCol.name = seqColName;
      df.columns.add(helmCol, false);
    }
    try {
      res = await seqHelper.helmToAtomicLevel(helmCol, true, true, monomerLib);
    } finally {
      if (helmCol !== macroMolecule) {
        df.columns.remove(helmCol.name);
        macroMolecule.name = seqColName;
      }
    }
  } else { // linear
    if (!checkInputColumn(macroMolecule, 'To Atomic Level', seqHelper)[0])
      return {molCol: null, warnings: ['Column is not suitable']};

    res = await _toAtomicLevel(df, macroMolecule, monomerLib, seqHelper, rdKitModule);
  }

  if (res.molCol) {
    const molColName = getMolColName(df, macroMolecule.name);
    res.molCol.name = molColName;
    df.columns.add(res.molCol, true);

    await buildMonomerHoverLink(macroMolecule, res.molCol, monomerLib, seqHelper, rdKitModule, nonlinear);
    res.molCol.setTag(ChemTags.SEQUENCE_SRC_HL_MONOMERS, String(highlight));
    await grok.data.detectSemanticTypes(df);
  }
  return res;
}
