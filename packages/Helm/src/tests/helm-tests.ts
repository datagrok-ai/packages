import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, delay, expect, test, expectArray} from '@datagrok-libraries/utils/src/test';
//import {findMonomers, helmToFasta, helmToPeptide, helmToRNA, initHelm} from '../package';
import {parseHelm} from '../utils';

import {_package} from '../package-test';

category('Helm', () => {
  //These tests require webservice that is not present on test stand
  // test('helmToFasta', async () => {
  //   expect(await helmToFasta('RNA1{R(U)P.R(T)P.R(G)P.R(C)P.R(A)}$$$$'), '>RNA1UTGCA');
  //   expect(await helmToFasta('RNA1{P.R(U).P.R(T)}$$$$'), '>RNA1UT');
  //   expect(await helmToFasta('PEPTIDE1{A.G}$$$$V2.0'), '>PEPTIDE1AG');
  // });
  //
  // test('helmToRNA', async () => {
  //   expect(await helmToRNA('RNA1{R(U)P.R(T)P.R(G)P.R(C)P.R(A)}$$$$'), 'UTGCA');
  //   expect(await helmToRNA('RNA1{P.R(U).P.R(T)}$$$$'), 'UT');
  //   // eslint-disable-next-line max-len
  //   expect(
  // await helmToRNA('RNA1{R(U)P.R(T)P}|RNA2{P.R(A)P.R(A)}$RNA1,RNA2,2:pair-6:pair|RNA1,RNA2,5:pair-3:pair$$$'), 'UT AA'
  //   );
  // });
  //
  // test('helmToPeptide', async () => {
  //   expect(await helmToPeptide('PEPTIDE1{A.G}$$$$V2.0'), 'AG');
  //   expect(await helmToPeptide('PEPTIDE1{L.V.A}|PEPTIDE2{L.V.A}$$$$'), 'LVA LVA');
  //   // eslint-disable-next-line max-len
  //   expect(await helmToPeptide('PEPTIDE1{A.R.C.A.A.K.T.C.D.A}$PEPTIDE1,PEPTIDE1,8:R3-3:R3$$$'), 'ARCAAKTCDA');
  // });

  // detectMacromolecule is a function of Bio package
  // test('detectMacromolecule', async () => {
  //   const file = await _package.files.readAsText('tests/test.csv');
  //   const df = DG.DataFrame.fromCsv(file);
  //   const col = df.columns.byName('HELM string');
  //   await grok.data.detectSemanticTypes(df);
  //   expect(col.semType, DG.SEMTYPE.MACROMOLECULE);
  // });

  // semType and units tags are detecting by Bio package function detectMacromolecule
  // test('detectHelm', async () => {
  //   const file = await _package.files.readAsText('tests/test.csv');
  //   const df = DG.DataFrame.fromCsv(file);
  //   const col = df.columns.byName('HELM string');
  //   await grok.data.detectSemanticTypes(df);
  //   expect(col.tags[DG.TAGS.UNITS], 'HELM');
  // });

  const complexMonomers = [
    // tests parsing of complex monomer in square brackets like [L-hArg(Et,Et)]
    'PEPTIDE1{[L-hArg(Et,Et)].E.F.G}|PEPTIDE2{C.E}$PEPTIDE1,PEPTIDE2,2:R3-1:R1$$$V2.0',
    // tests parsing of complex monomer and one as a side chain as well
    'PEPTIDE1{[L-hArg(Et,Et)]([L-hArg(Et,Et)]).E.F.G}$$$$',
    // tests parsing of complex monomer and one as a side chain as well
    'RNA1{[dhp]([m1A])p.r(T)p.r(T)p.r(G)p}$$$$V2.0',
    // tests complex monomer as side chain
    'RNA1{r([mo6pur])p.r(T)p.r(T)p.r(G)p}$$$$V2.0',
    // test complex monomer, side chain and linker
    'RNA1{[afhna]([mo6pur])[36SS].r(T)p}$$$$V2.0'
  ];

  const complexMonomersExpected = [
    ['L-hArg(Et,Et)', 'E', 'F', 'G', 'C', 'E'],
    ['L-hArg(Et,Et)', 'L-hArg(Et,Et)', 'E', 'F', 'G'],
    ['dhp', 'm1A', 'p', 'r', 'T', 'p', 'r', 'T', 'p', 'r', 'G', 'p'],
    ['r', 'mo6pur', 'p', 'r', 'T', 'p', 'r', 'T', 'p', 'r', 'G', 'p'],
    ['afhna', 'mo6pur', '36SS', 'r', 'T', 'p']
  ];

  const complexTestNames = [
    'comples-monomer', 'complex-monomer+side-chain', 'complex-monomer+side-chain-RNA',
    'complex-side-chain', 'complex+side-chain+linker'
  ];

  test('parseHelm', async () => {
    const expectedResults = [
      ['meI', 'hHis', 'Aca', 'N', 'T', 'dK', 'Thr_PO3H2', 'D-Tyr_Et', 'Aze', 'dV', 'E', 'Phe_4Me'],
      ['A', 'C', 'T', 'G', 'W', 'E', 'Q'],
      ['R', 'U', 'P', 'T', 'A'],
      ['A', '*', 'G', 'C']
    ];
    const helmStrings = [
      'PEPTIDE1{meI.hHis.Aca.N.T.dK.Thr_PO3H2.Aca.D-Tyr_Et.Aze.dV.E.N.dV.Phe_4Me}$$$',
      // eslint-disable-next-line max-len
      'PEPTIDE1{A.C.T.G.C.T.W.G.T.W.E.C.W.C.Q.W}|PEPTIDE2{A.C.T.G.C.T.W.G.T.W.E.Q}$PEPTIDE1,PEPTIDE1,5:R3-14:R3|PEPTIDE2,PEPTIDE1,2:R3-12:R3$$$',
      'RNA1{R(U)P.R(T)P}|RNA2{P.R(A)P.R(A)}$RNA1,RNA2,2:pair-6:pair|RNA1,RNA2,5:pair-3:pair$$$',
      'PEPTIDE1{A.*.G.C}$$$$V2.0'
    ];
    for (let idx = 0; idx < helmStrings.length; ++idx) {
      const monomerSet = new Set(parseHelm(helmStrings[idx]));
      const monomerArray = Array.from(monomerSet);
      expect(JSON.stringify(monomerArray), JSON.stringify(expectedResults[idx]));
    }
  });
  complexMonomers.forEach((helm, i) => {
    test(complexTestNames[i], async () => {
      const monomersArray = parseHelm(helm);
      monomersArray.sort();
      const expected = complexMonomersExpected[i];
      expected.sort();
      expectArray(monomersArray, expected);
    });
  });
});
