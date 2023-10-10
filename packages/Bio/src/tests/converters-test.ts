import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {category, expect, expectArray, test} from '@datagrok-libraries/utils/src/test';

import {ConverterFunc} from './types';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';

// import {mmSemType} from '../const';
// import {importFasta} from '../package';

category('converters', () => {
  enum Samples {
    fastaPt = 'fastaPt',
    separatorPt = 'separatorPt',
    helmPt = 'helmPt',

    fastaDna = 'fastaDna',
    separatorDna = 'separatorDna',
    helmDna = 'helmDna',

    fastaRna = 'fastaRna',
    separatorRna = 'separatorRna',
    helmRna = 'helmRna',

    fastaGaps = 'fastaGaps',
    separatorGaps = 'separatorGaps',
    helmGaps = 'helmGaps',

    fastaUn = 'fastaUn',
    separatorUn = 'separatorUn',
    helmUn = 'helmUn',

    helmLoneDeoxyribose = 'helmLoneDeoxyribose',
    helmLoneRibose = 'helmLoneRibose',
    helmLonePhosphorus = 'helmLonePhosphorus',
    fastaLoneDeoxyribose = 'fastaLoneDeoxyribose',
    fastaLoneRibose = 'fastaLoneRibose',
    fastaLonePhosphorus = 'fastaLonePhosphorus',
  }

  const _csvTxts: { [key: string]: string } = {
    fastaPt: `seq
FWPHEY
YNRQWYV
MKPSEYV`,
    separatorPt: `seq
F-W-P-H-E-Y
Y-N-R-Q-W-Y-V
M-K-P-S-E-Y-V`,
    helmPt: `seq
PEPTIDE1{F.W.P.H.E.Y}$$$$
PEPTIDE1{Y.N.R.Q.W.Y.V}$$$$
PEPTIDE1{M.K.P.S.E.Y.V}$$$$`,
    fastaDna: `seq
ACGTC
CAGTGT
TTCAAC`,
    separatorDna: `seq
A/C/G/T/C
C/A/G/T/G/T
T/T/C/A/A/C`,
    helmDna: `seq
RNA1{d(A)p.d(C)p.d(G)p.d(T)p.d(C)p}$$$$
RNA1{d(C)p.d(A)p.d(G)p.d(T)p.d(G)p.d(T)p}$$$$
RNA1{d(T)p.d(T)p.d(C)p.d(A)p.d(A)p.d(C)p}$$$$`,
    fastaRna: `seq
ACGUC
CAGUGU
UUCAAC`,
    separatorRna: `seq
A*C*G*U*C
C*A*G*U*G*U
U*U*C*A*A*C`,
    helmRna: `seq
RNA1{r(A)p.r(C)p.r(G)p.r(U)p.r(C)p}$$$$
RNA1{r(C)p.r(A)p.r(G)p.r(U)p.r(G)p.r(U)p}$$$$
RNA1{r(U)p.r(U)p.r(C)p.r(A)p.r(A)p.r(C)p}$$$$`,
    fastaGaps: `seq
FW-PH-EYY
FYNRQWYV-
FKP-Q-SEYV`,
    separatorGaps: `seq
F/W//P/H//E/Y/Y
F/Y/N/R/Q/W/Y/V/
F/K/P//Q//S/E/Y/V`,
    helmGaps: `seq
PEPTIDE1{F.W.*.P.H.*.E.Y.Y}$$$$
PEPTIDE1{F.Y.N.R.Q.W.Y.V.*}$$$$
PEPTIDE1{F.K.P.*.Q.*.S.E.Y.V}$$$$`,

    fastaUn: `seq
[meI][hHis][Aca]NT[dE][Thr_PO3H2][Aca]D
[meI][hHis][Aca][Cys_SEt]T[dK][Thr_PO3H2][Aca][Tyr_PO3H2]
[Lys_Boc][hHis][Aca][Cys_SEt]T[dK][Thr_PO3H2][Aca][Tyr_PO3H2]`,
    separatorUn: `seq
meI-hHis-Aca-N-T-dE-Thr_PO3H2-Aca-D
meI-hHis-Aca-Cys_SEt-T-dK-Thr_PO3H2-Aca-Tyr_PO3H2
Lys_Boc-hHis-Aca-Cys_SEt-T-dK-Thr_PO3H2-Aca-Tyr_PO3H2`,
    helmUn: `seq
PEPTIDE1{meI.hHis.Aca.N.T.dE.Thr_PO3H2.Aca.D}$$$$
PEPTIDE1{meI.hHis.Aca.Cys_SEt.T.dK.Thr_PO3H2.Aca.Tyr_PO3H2}$$$$
PEPTIDE1{Lys_Boc.hHis.Aca.Cys_SEt.T.dK.Thr_PO3H2.Aca.Tyr_PO3H2}$$$$`,
    helmLoneDeoxyribose: `seq
RNA1{d(A).d(C).d(G).d(T).d(C)}$$$$
RNA1{d(C).d(A).d(G).d(T).d(G).d(T)p}$$$$
RNA1{d(T).d(T).d(C).d(A).d(A).d(C)p}$$$$`,
    helmLoneRibose: `seq
RNA1{r(A).r(C).r(G).r(U).r(C)}$$$$
RNA1{r(C).r(A).r(G).r(U).r(G).r(U)p}$$$$
RNA1{r(U).r(U).r(C).r(A).r(A).r(C)p}$$$$`,
    helmLonePhosphorus: `seq
RNA1{p.p.r(A)p.r(C)p.r(G)p.r(U)p.r(C)p}$$$$
RNA1{p.p.r(C)p.r(A)p.p.r(G)p.r(U)p.r(G)p.r(U)p}$$$$
RNA1{p.r(U)p.r(U)p.r(C)p.r(A)p.r(A)p.r(C)p.p.p}$$$$`,
  };

  /** Also detects semantic types
   * @param {string} key
   * @return {Promise<DG.DataFrame>}
   */
  async function readCsv(key: string): Promise<DG.DataFrame> {
    // Always recreate test data frame from CSV for reproducible detector behavior in tests.
    const csv: string = _csvTxts[key];
    const df: DG.DataFrame = DG.DataFrame.fromCsv(csv);
    await grok.data.detectSemanticTypes(df);
    return df;
  }

  function converter(tgtNotation: NOTATION, tgtSeparator?: string): ConverterFunc {
    if (tgtNotation === NOTATION.SEPARATOR && !tgtSeparator)
      throw new Error(`Argument 'separator' is mandatory for target notation '${tgtNotation.toString()}'.`);

    return function(srcCol: DG.Column): DG.Column {
      const converterUH = UnitsHandler.getOrCreate(srcCol);
      const resCol = converterUH.convert(tgtNotation, tgtSeparator);
      expect(resCol.getTag(DG.TAGS.UNITS), tgtNotation);
      return resCol;
    };
  }

  async function _testConvert(srcKey: Samples, colConverter: ConverterFunc, tgtKey: Samples) {
    const srcDf: DG.DataFrame = await readCsv(srcKey);
    const srcCol: DG.Column = srcDf.getCol('seq');

    // conversion results
    const resCol: DG.Column = colConverter(srcCol);

    // The correct reference data to compare conversion results with.
    const tgtDf: DG.DataFrame = await readCsv(tgtKey);
    const tgtCol: DG.Column = tgtDf.getCol('seq');

    expectArray(resCol.toList(), tgtCol.toList());
    const _uh: UnitsHandler = UnitsHandler.getOrCreate(resCol);
  }

  // FASTA tests
  // fasta -> separator
  test('testFastaPtToSeparator', async () => {
    await _testConvert(Samples.fastaPt, converter(NOTATION.SEPARATOR, '-'), Samples.separatorPt);
  });
  test('testFastaDnaToSeparator', async () => {
    await _testConvert(Samples.fastaDna, converter(NOTATION.SEPARATOR, '/'), Samples.separatorDna);
  });
  test('testFastaRnaToSeparator', async () => {
    await _testConvert(Samples.fastaRna, converter(NOTATION.SEPARATOR, '*'), Samples.separatorRna);
  });
  test('testFastaGapsToSeparator', async () => {
    await _testConvert(Samples.fastaGaps, converter(NOTATION.SEPARATOR, '/'), Samples.separatorGaps);
  });
  test('testFastaUnToSeparator', async () => {
    await _testConvert(Samples.fastaUn, converter(NOTATION.SEPARATOR, '-'), Samples.separatorUn);
  });

  // fasta -> helm
  test('testFastaPtToHelm', async () => {
    await _testConvert(Samples.fastaPt, converter(NOTATION.HELM), Samples.helmPt);
  });
  test('testFastaDnaToHelm', async () => {
    await _testConvert(Samples.fastaDna, converter(NOTATION.HELM), Samples.helmDna);
  });
  test('testFastaRnaToHelm', async () => {
    await _testConvert(Samples.fastaRna, converter(NOTATION.HELM), Samples.helmRna);
  });
  test('testFastaGapsToHelm', async () => {
    await _testConvert(Samples.fastaGaps, converter(NOTATION.HELM), Samples.helmGaps);
  });
  // TODO: testFastaUnToHelm
  // test('testFastaUnToHelm', async () => {
  //   await _testConvert(Samples.fastaUn, converter(NOTATION.HELM), Samples.helmUn);
  // });


  // SEPARATOR tests
  // separator -> fasta
  test('testSeparatorPtToFasta', async () => {
    await _testConvert(Samples.separatorPt, converter(NOTATION.FASTA), Samples.fastaPt);
  });
  test('testSeparatorDnaToFasta', async () => {
    await _testConvert(Samples.separatorDna, converter(NOTATION.FASTA), Samples.fastaDna);
  });
  test('testSeparatorRnaToFasta', async () => {
    await _testConvert(Samples.separatorRna, converter(NOTATION.FASTA), Samples.fastaRna);
  });
  test('testSeparatorGapsToFasta', async () => {
    await _testConvert(Samples.separatorGaps, converter(NOTATION.FASTA), Samples.fastaGaps);
  });
  test('testSeparatorUnToFasta', async () => {
    await _testConvert(Samples.separatorUn, converter(NOTATION.FASTA), Samples.fastaUn);
  });

  // separator -> helm
  test('testSeparatorPtToHelm', async () => {
    await _testConvert(Samples.separatorPt, converter(NOTATION.HELM), Samples.helmPt);
  });
  test('testSeparatorDnaToHelm', async () => {
    await _testConvert(Samples.separatorDna, converter(NOTATION.HELM), Samples.helmDna);
  });
  test('testSeparatorRnaToHelm', async () => {
    await _testConvert(Samples.separatorRna, converter(NOTATION.HELM), Samples.helmRna);
  });
  test('testSeparatorGapsToHelm', async () => {
    await _testConvert(Samples.separatorGaps, converter(NOTATION.HELM), Samples.helmGaps);
  });
  // TODO: testSeparatorUnToHelm
  // test('testSeparatorUnToHelm', async () => {
  //   await _testConvert(Samples.separatorUn, converter(NOTATION.HELM), Samples.helmUn);
  // });


  // HELM tests
  // helm -> fasta
  test('testHelmDnaToFasta', async () => {
    await _testConvert(Samples.helmDna, converter(NOTATION.FASTA), Samples.fastaDna);
  });
  test('testHelmRnaToFasta', async () => {
    await _testConvert(Samples.helmRna, converter(NOTATION.FASTA), Samples.fastaRna);
  });
  test('testHelmPtToFasta', async () => {
    await _testConvert(Samples.helmPt, converter(NOTATION.FASTA), Samples.fastaPt);
  });
  test('testHelmUnToFasta', async () => {
    await _testConvert(Samples.helmUn, converter(NOTATION.FASTA), Samples.fastaUn);
  });

  // helm -> separator
  test('testHelmDnaToSeparator', async () => {
    await _testConvert(Samples.helmDna, converter(NOTATION.SEPARATOR, '/'), Samples.separatorDna);
  });
  test('testHelmRnaToSeparator', async () => {
    await _testConvert(Samples.helmRna, converter(NOTATION.SEPARATOR, '*'), Samples.separatorRna);
  });
  test('testHelmPtToSeparator', async () => {
    await _testConvert(Samples.helmPt, converter(NOTATION.SEPARATOR, '-'), Samples.separatorPt);
  });
  test('testHelmUnToSeparator', async () => {
    await _testConvert(Samples.helmUn, converter(NOTATION.SEPARATOR, '-'), Samples.separatorUn);
  });

  // helm miscellaneous
  test('testHelmLoneRibose', async () => {
    await _testConvert(Samples.helmLoneRibose, converter(NOTATION.FASTA), Samples.fastaRna);
  });
  test('testHelmLoneDeoxyribose', async () => {
    await _testConvert(Samples.helmLoneDeoxyribose, converter(NOTATION.SEPARATOR, '/'), Samples.separatorDna);
  });
  test('testHelmLonePhosphorus', async () => {
    await _testConvert(Samples.helmLonePhosphorus, converter(NOTATION.FASTA), Samples.fastaRna);
  });
});
