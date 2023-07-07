import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
//import * as ui from 'datagrok-api/ui';

import {category, test, testViewer} from '@datagrok-libraries/utils/src/test';
import {readDataframe} from './utils';


category('viewers', () => {
  const viewers = DG.Func.find({package: 'Bio', tags: ['viewer']}).map((f) => f.friendlyName);
  for (const v of viewers) {
    test(v, async () => {
      const df = await readDataframe('data/sample_FASTA_DNA.csv');
      await testViewer(v, df, {detectSemanticTypes: true});
    }, v === 'Sequence Similarity Search' ? {skipReason: 'GROK-13162'} : undefined);
  }
});
