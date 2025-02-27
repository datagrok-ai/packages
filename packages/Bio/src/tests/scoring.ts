import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {category, test, expectFloat, before, after, expect} from '@datagrok-libraries/utils/src/test';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {IMonomerLibHelper, getMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';

import {
  getUserLibSettings, setUserLibSettings
} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';

category('Scoring', () => {
  /* eslint-disable max-len */
  const sequence = 'sequence';
  const expectedSimilarity = 'expected_similarity';
  const expectedIdentity = 'expected_identity';
  /* eslint-disable max-len */
  const table = DG.DataFrame.fromCsv(`${sequence},${expectedSimilarity},${expectedIdentity}
PEPTIDE1{Aca.Orn.gGlu.Pqa.D-His_1Bn.dH.hHis.4Abz.D-Tic.D-Dap.Y.Iva.meS.F.P.F.D-1Nal}$$$$,1.0,1.0
PEPTIDE1{Iva.Gly_allyl.gGlu.Pqa.D-Dip.dH.hHis.4Abz.D-aHyp.D-Dap.Y.Iva.I.Tyr_26diMe.P.Asu.meC}$$$$,0.691,0.53
PEPTIDE1{[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal].[1Nal]}$$$$V2.0,0.37,0.0`
  );
  const seqCol: DG.Column<string> = table.getCol(sequence);
  seqCol.meta.units = NOTATION.HELM;
  seqCol.semType = DG.SEMTYPE.MACROMOLECULE;
  const reference = seqCol.get(0)!;
  const shortReference = 'PEPTIDE1{Iva.Gly_allyl.gGlu.Pqa.D-Dip.dH.hHis.4Abz.D-aHyp.D-Dap.Y.Iva}$$$$';
  const longReference = 'PEPTIDE1{Iva.Gly_allyl.gGlu.Pqa.D-Dip.dH.hHis.4Abz.D-aHyp.D-Dap.Y.Iva.I.Tyr_26diMe.P.Asu.meC.I.Tyr_26diMe.P.Asu.meC}$$$$';
  /* eslint-enable max-len */

  let monomerLibHelper: IMonomerLibHelper;
  /** Backup actual user's monomer libraries settings */
  let userLibSettings: UserLibSettings;

  before(async () => {
    monomerLibHelper = await getMonomerLibHelper();
    userLibSettings = await getUserLibSettings();

    await monomerLibHelper.loadMonomerLibForTests(); // load default libraries
  });

  after(async () => {
    // UserDataStorage.put() replaces existing data
    await setUserLibSettings(userLibSettings);
    await monomerLibHelper.loadMonomerLib(true); // load user settings libraries
  });

  test('Identity', async () => {
    const scoresCol = await grok.functions.call('Bio:sequenceIdentityScoring',
      {table: table, macromolecule: seqCol, reference: reference}) as DG.Column<number>;
    for (let i = 0; i < scoresCol.length; i++) {
      const resScore = scoresCol.get(i)!;
      const tgtScore = table.get(expectedIdentity, i);
      expectFloat(resScore, tgtScore, 0.01,
        `Wrong identity score for sequence at position ${i}`);
    }
  });

  test('Identity-shortReference', async () => {
    const scoresCol = await grok.functions.call('Bio:sequenceIdentityScoring',
      {table: table, macromolecule: seqCol, reference: shortReference}) as DG.Column<number>;
    expect(wu.count(0).take(scoresCol.length).map((rowI) => scoresCol.get(rowI))
      .every((v) => v != null && !isNaN(v)), true);
  });

  test('Identity-longReference', async () => {
    const scoresCol = await grok.functions.call('Bio:sequenceIdentityScoring',
      {table: table, macromolecule: seqCol, reference: longReference}) as DG.Column<number>;
    expect(wu.count(0).take(scoresCol.length).map((rowI) => scoresCol.get(rowI))
      .every((v) => v != null && !isNaN(v)), true);
  });

  test('Similarity', async () => {
    const scoresCol = await grok.functions.call('Bio:sequenceSimilarityScoring',
      {table: table, macromolecule: seqCol, reference: reference}) as DG.Column<number>;
    for (let i = 0; i < scoresCol.length; i++) {
      const resScore = scoresCol.get(i)!;
      const tgtScore = table.get(expectedSimilarity, i);
      expectFloat(resScore, tgtScore, 0.01,
        `Wrong similarity score for sequence at position ${i}`);
    }
  });
});
