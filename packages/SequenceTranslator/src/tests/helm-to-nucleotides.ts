/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {getNucleotidesSequence} from '../translator-app/model/conversion-utils';
import {getJsonData} from '../common/data-loading-utils/json-loader';
import {helmToNucleotides} from './const';
import {_package} from '../package';
import {MonomerLibWrapper} from '../common/monomer-lib/lib-wrapper';

category('HELM to Nucleotides', () => {
  before(async () => {
    await getJsonData();
    await _package.initMonomerLib();
  });

  Object.entries(helmToNucleotides).forEach(([helm, nucleotide], idx) => {
    test(`Sequence ${idx + 1} to nucleotides`, async () => {
      const expected = nucleotide;
      const result = getNucleotidesSequence(helm, MonomerLibWrapper.getInstance());
      expect(result, expected);
    });
  })
});
