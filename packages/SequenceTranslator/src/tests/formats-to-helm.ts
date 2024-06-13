import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {getFormat, getHelm} from './utils';
import {ITranslationHelper} from '../types';

import {_package} from '../package-test';
import {formatsToHelm} from './const';

category('Formats to HELM', () => {
  let th: ITranslationHelper;

  before(async () => {
    th = await _package.getTranslationHelper();
  });

  for (const format of Object.keys(formatsToHelm)) {
    for (const [strand, helm] of Object.entries(formatsToHelm[format])) {
      test(`${format} to HELM`, async () => {
        const expected = helm;
        const result = getHelm(strand, format, th);
        expect(result, expected);
      });
    }
  }
});

category('HELM to Formats', () => {
  let th: ITranslationHelper;

  before(async () => {
    th = await _package.getTranslationHelper();
  });

  for (const format of Object.keys(formatsToHelm)) {
    for (const [strand, helm] of Object.entries(formatsToHelm[format])) {
      test(`${format} to HELM`, async () => {
        const expected = strand;
        const result = getFormat(helm, format, th);
        expect(result, expected);
      });
    }
  }
});
