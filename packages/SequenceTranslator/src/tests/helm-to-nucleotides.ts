import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {getNucleotidesSequence} from '../apps/translator/model/conversion-utils';
import {ITranslationHelper} from '../types';

import {_package} from '../package-test';
import {helmToNucleotides} from './const';


category('HELM to Nucleotides', () => {
  let th: ITranslationHelper;

  before(async () => {
    th = await _package.getTranslationHelper();
  });

  Object.entries(helmToNucleotides).forEach(([helm, nucleotide], idx) => {
    test(`Sequence ${idx + 1} to nucleotides`, async () => {
      const expected = nucleotide;
      const result = getNucleotidesSequence(helm, th.monomerLibWrapper);
      expect(result, expected);
    });
  });
});
