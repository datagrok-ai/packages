import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {DEFAULT_FORMATS} from '../apps/common/model/const';
import {getTranslatedSequences} from '../apps/translator/model/conversion-utils';
import {ITranslationHelper} from '../types';

import {_package} from '../package-test';
import {formatsToHelm} from './const';


function getTranslationObject(sequence: string, format: string, th: ITranslationHelper): { [format: string]: string } {
  const indexOfInvalidChar = th.createSequenceValidator(sequence).getInvalidCodeIndex(format);
  return getTranslatedSequences(sequence, indexOfInvalidChar, format, th);
}

const inputs = {
  [DEFAULT_FORMATS.AXOLABS]: 'Afcgacsu',
  [DEFAULT_FORMATS.HELM]: 'RNA1{[fR](A)p.[25r](C)p.[25r](G)p.[25r](A)p.[25r](C)[sp].[25r](U)}$$$$'
};

category('Formats support', () => {
  let th: ITranslationHelper;

  before(async () => {
    th = await _package.getTranslationHelper();
  });

  Object.entries(inputs).forEach(([format, sequence]) => {
    test(`All formats for ${format}`, async () => {
      const output = getTranslationObject(sequence, format, th);
      const result = Object.keys(output).length;
      // +1 due to nucleotides
      const expected = Object.keys(formatsToHelm).length + 1;
      expect(true, expected <= result);
    });
  });
});
