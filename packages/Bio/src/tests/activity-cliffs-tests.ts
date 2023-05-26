import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, test} from '@datagrok-libraries/utils/src/test';

import {readDataframe} from './utils';
import {_testActivityCliffsOpen} from './activity-cliffs-utils';
import { DimReductionMethods } from '@datagrok-libraries/ml/src/reduce-dimensionality';


category('activityCliffs', async () => {
  let actCliffsTableView: DG.TableView;
  let actCliffsDf: DG.DataFrame;
  let actCliffsTableViewWithEmptyRows: DG.TableView;
  let actCliffsDfWithEmptyRows: DG.DataFrame;

  let viewList: DG.ViewBase[] = [];
  let dfList: DG.DataFrame[] = [];

  before(async () => {
    viewList = [];
    dfList = [];
  });

  after(async () => {
    // for (const df of dfList) grok.shell.closeTable(df);
    // for (const view of viewList) view.close();
  });

  test('activityCliffsOpens', async () => {
    actCliffsDf = await readDataframe('tests/sample_MSA_data.csv');
    dfList.push(actCliffsDf);
    actCliffsTableView = grok.shell.addTableView(actCliffsDf);
    viewList.push(actCliffsTableView);

    await _testActivityCliffsOpen(actCliffsDf, 57, DimReductionMethods.UMAP, 'MSA');
  }, {skipReason: 'GROK-12774'});

  test('activityCliffsWithEmptyRows', async () => {
    actCliffsDfWithEmptyRows = await readDataframe('tests/sample_MSA_data_empty_vals.csv');
    dfList.push(actCliffsDfWithEmptyRows);
    actCliffsTableViewWithEmptyRows = grok.shell.addTableView(actCliffsDfWithEmptyRows);
    viewList.push(actCliffsTableViewWithEmptyRows);

    await _testActivityCliffsOpen(actCliffsDfWithEmptyRows, 57, DimReductionMethods.UMAP, 'MSA');
  }, {skipReason: 'GROK-12774'});
});
