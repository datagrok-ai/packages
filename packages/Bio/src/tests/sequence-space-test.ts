import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {category, test} from '@datagrok-libraries/utils/src/test';
import {readDataframe} from './utils';
import {_testSequenceSpaceReturnsResult} from './sequence-space-utils';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/reduce-dimensionality';

category('sequenceSpace', async () => {
  let testFastaDf: DG.DataFrame;
  let testFastaTableView: DG.TableView;
  let testHelmWithEmptyRows: DG.DataFrame;
  let testHelmWithEmptyRowsTableView: DG.TableView;

  test('sequenceSpaceOpens', async () => {
    testFastaDf = await readDataframe(
      DG.Test.isInBenchmark ? 'test/peptides_motif-with-random_10000.csv' : 'tests/100_3_clustests.csv',
    );
    testFastaTableView = grok.shell.addTableView(testFastaDf);
    await _testSequenceSpaceReturnsResult(testFastaDf, DimReductionMethods.UMAP, 'sequence');
    grok.shell.closeTable(testFastaDf);
    testFastaTableView.close();
  });

  test('sequenceSpaceWithEmptyRows', async () => {
    testHelmWithEmptyRows = await readDataframe('tests/100_3_clustests_empty_vals.csv');
    testHelmWithEmptyRowsTableView = grok.shell.addTableView(testHelmWithEmptyRows);
    await _testSequenceSpaceReturnsResult(testHelmWithEmptyRows, DimReductionMethods.UMAP, 'sequence');
    grok.shell.closeTable(testHelmWithEmptyRows);
    testHelmWithEmptyRowsTableView.close();
  });
});
