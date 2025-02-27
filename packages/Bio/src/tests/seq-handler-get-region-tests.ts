/* eslint-disable max-lines-per-function */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, expectArray, test} from '@datagrok-libraries/utils/src/test';
import {ISeqHelper, getSeqHelper} from '@datagrok-libraries/bio/src/utils/seq-helper';
import {ALPHABET, NOTATION, TAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';

category('SeqHandler: getRegion', () => {
  let seqHelper: ISeqHelper;

  before(async () => {
    seqHelper = await getSeqHelper();
  });

  const data: {
    [testName: string]: {
      srcCsv: string,
      startIdx: number | null,
      endIdx: number | null,
      tgtCsv: string,
      units: NOTATION,
      alphabet: ALPHABET | null, /* alphabet is not applicable for units 'helm' */

      positionNames?: { tag: string | null, start: string | null, end: string | null }
    }
  } = {
    'fastaDna': {
      srcCsv: `seq
ATTCGT
ACTGCTC
ATTCCGTA`,
      startIdx: 2,
      endIdx: 4,
      tgtCsv: `seq
TCG
TGC
TCC`,
      units: NOTATION.FASTA,
      alphabet: ALPHABET.DNA,

      positionNames: {tag: 'a, b, c, d, e, f, g, h', start: 'c', end: 'e'},
    },
    'separatorPt': {
      srcCsv: `seq
M-D-Y-K-E-T-L
M-I-E-V-F-L-F-G-I
M-M-`,
      startIdx: 5,
      endIdx: null,
      tgtCsv: `seq
T-L--
L-F-G-I
---`,
      units: NOTATION.SEPARATOR,
      alphabet: ALPHABET.PT,

      positionNames: {tag: '1, 1A, 1B, 2, 3, 4, 4A, 4A, 4C', start: '4', end: null},
    },
    'helm': {
      srcCsv: `seq
PEPTIDE1{[meI].[hHis].[Aca].N.T.[dE].[Thr_PO3H2].[Aca].[D-Tyr_Et].[Tyr_ab-dehydroMe].[dV].E.N.[D-Orn]}$$$$
PEPTIDE1{[meI].[hHis].[Aca].[Cys_SEt].T.[dK].[Thr_PO3H2].[Aca].[Tyr_PO3H2].[D-Chg].[dV].[Phe_ab-dehydro]}$$$$
PEPTIDE1{[Lys_Boc].[hHis].[Aca].[Cys_SEt].T}$$$$`,
      startIdx: 3,
      endIdx: 6,
      tgtCsv: `seq
PEPTIDE1{N.T.[dE].[Thr_PO3H2]}$$$$
PEPTIDE1{[Cys_SEt].T.[dK].[Thr_PO3H2]}$$$$
PEPTIDE1{[Cys_SEt].T.*.*}$$$$`,
      units: NOTATION.HELM,
      alphabet: ALPHABET.UN,

      positionNames: {tag: null, start: '4', end: '7'}
    }
  };

  for (const [testName, testData] of Object.entries(data)) {
    test(`${testName}-idx`, async () => {
      const srcDf = DG.DataFrame.fromCsv(testData.srcCsv);
      const srcSeqCol = srcDf.getCol('seq');

      const semType: string | null = await grok.functions.call('Bio:detectMacromolecule', {col: srcSeqCol});
      if (semType) srcSeqCol.semType = semType;

      const srcSh = seqHelper.getSeqHandler(srcSeqCol);
      const resSeqCol = srcSh.getRegion(testData.startIdx, testData.endIdx, 'regSeq');

      const tgtDf = DG.DataFrame.fromCsv(testData.tgtCsv);
      const tgtSeqCol = tgtDf.getCol('seq');

      expect(srcSeqCol.meta.units, testData.units);
      expect(resSeqCol.meta.units, testData.units);
      expect(srcSeqCol.getTag(TAGS.alphabet), testData.alphabet);
      expect(resSeqCol.getTag(TAGS.alphabet), testData.alphabet);
      expectArray(resSeqCol.toList(), tgtSeqCol.toList());
    });

    if (testData.positionNames) {
      test(`${testName}-positionNames`, async () => {
        const srcDf = DG.DataFrame.fromCsv(testData.srcCsv);
        const srcSeqCol = srcDf.getCol('seq');
        if (testData.positionNames!.tag)
          srcSeqCol.setTag(TAGS.positionNames, testData.positionNames!.tag);

        const semType: string | null = await grok.functions.call('Bio:detectMacromolecule', {col: srcSeqCol});
        if (semType) srcSeqCol.semType = semType;

        const resSeqCol = await grok.functions.call('Bio:getRegion',
          {sequence: srcSeqCol, start: testData.positionNames!.start, end: testData.positionNames!.end});

        const tgtDf = DG.DataFrame.fromCsv(testData.tgtCsv);
        const tgtSeqCol = tgtDf.getCol('seq');

        expect(srcSeqCol.meta.units, testData.units);
        expect(resSeqCol.meta.units, testData.units);
        expect(srcSeqCol.getTag(TAGS.alphabet), testData.alphabet);
        expect(resSeqCol.getTag(TAGS.alphabet), testData.alphabet);
        expectArray(resSeqCol.toList(), tgtSeqCol.toList());
      });
    }
  }
});
