/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {category, expectArray, test} from '@datagrok-libraries/utils/src/test';
import {FastaFileHandler} from '@datagrok-libraries/bio/src/utils/fasta-handler';
import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';


category('fastaFileHandler', () => {
  const fastaNormalFormatting = `>description:1
MDYKETLLMPKTDFPMRGGLPNKEPQIQEKW

>description:2
MIEVFLFGIVLGLIPITLAGLFVTAYLQYRRGDQLDL

>description:3
MMELVLKTIIGPIVVGVVLRIVDKWLNKDK

>description:4
MDRTDEVSNHTHDKPTLTWFEEIFEEYHSPFHN
`;

  const fastaExtraSpaces = `>description:1
     MDYKETLLMPKTDFPMRGGLPNKEPQIQEKW

>description:2
MI  EVF  LFGIVLGLI  PITLAGLFVTAY        LQYRRGDQLDL

>description:3
M      MELVLKTI      IGPI    VVGVVLR      IVDKWLNKDK

>description:4
MDR    TDEVSNHTHDKP        TLTWFEEIFEEYHSPFHN
    `;

  const fastaExtraNewlines = `>description:1

MDYKETLLMPKTDFPMRGGLPNKEPQIQEKW

>description:2
MIEVF
LFGIVLGLI
PITLAGLFVTA
YLQYRRGDQLDL

>description:3
M
ME

LVLKTIIG

PIVVGVVLRI
VDKWLNKDK


>description:4

MDRT

DEVSNHTHDKP

TLTWFEEIFEE



YHSPFHN
`;
  // a "broken" fasta file
  // const fastaBroken = `
    
  //   >description:1
// MDYKETLLM
// PKTDFPMRGGLPN
// KEPQIQEKW



  //     >description:2
// MIEVFL    FGIVLGLIPI     TLAGLFVTAYLQYRRGDQLDL

// >description:3

// M
  // MELVLKTIIGP
 // IVVGVVLR
// IVDKWLNKD

// K

  // >description:4
  //       MDRTDEV

  //   SNHTHDKP
// TLTWFEEI
// FEE

// YHSPFHN


  //       `;

  const descriptionsArray = [
    'description:1', 'description:2', 'description:3', 'description:4',
  ];
  const descriptionCol = DG.Column.fromStrings('description', descriptionsArray);

  const sequencesArray = [
    'MDYKETLLMPKTDFPMRGGLPNKEPQIQEKW',
    'MIEVFLFGIVLGLIPITLAGLFVTAYLQYRRGDQLDL',
    'MMELVLKTIIGPIVVGVVLRIVDKWLNKDK',
    'MDRTDEVSNHTHDKPTLTWFEEIFEEYHSPFHN',
  ];
  const sequencesCol = DG.Column.fromStrings('sequence', sequencesArray);
  sequencesCol.semType = DG.SEMTYPE.MACROMOLECULE;
  UnitsHandler.setUnitsToFastaColumn(sequencesCol);

  const fastaDf = DG.DataFrame.fromColumns([descriptionCol, sequencesCol]);

  function _testColumnsParser(inputFasta: string) {
    const ffh = new FastaFileHandler(inputFasta);
    const parsedDescriptionsArray = ffh.descriptionsArray;
    const parsedSequencesArray = ffh.sequencesArray;
    expectArray(
      [parsedDescriptionsArray, parsedSequencesArray],
      [descriptionsArray, sequencesArray]
    );
  }

  // test parser
  test('testNormalFormatting', async () => {
    _testColumnsParser(fastaNormalFormatting);
  });
  test('testExtraSpaces', async () => {
    _testColumnsParser(fastaExtraSpaces);
  });
  test('testExtraNewlines', async () => {
    _testColumnsParser(fastaExtraNewlines);
  });
});
