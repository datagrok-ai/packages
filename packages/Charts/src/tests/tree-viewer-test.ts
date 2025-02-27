import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {after, before, category, expect, expectArray, test} from '@datagrok-libraries/utils/src/test';
import {getOptions} from './utils';
import { Subscription } from 'rxjs';


category('TreeViewer', () => {
  const TYPE = 'Tree';
  let df: DG.DataFrame;
  let tv: DG.TableView;
  const subs: Subscription[] = [];

  before(async () => {
    df = grok.data.demo.demog(20);
    tv = grok.shell.addTableView(df);
  });

  test('Creation', async () => {
    const viewer = DG.Viewer.fromType(TYPE, df);
    expect(viewer instanceof DG.JsViewer, true);
    expect(viewer.type, TYPE);
    expect(viewer.table.id, df.id);
  });

  test('Standard properties', async () => {
    const viewer = DG.Viewer.fromType(TYPE, df);
    const standardOptions = {
      rowSource: 'Filtered',
      filter: '',
      layout: 'orthogonal',
      orient: 'LR',
      initialTreeDepth: 3,
      symbol: 'emptyCircle',
      symbolSize: 7,
      fontSize: 12,
      labelRotate: 45,
      showCounts: false,
      mouseOverLineColor: 7102046,
      selectedRowsColor: 16747520,
      showMouseOverLine: false,
      sizeColumnName: '',
      sizeAggrType: DG.AGG.AVG,
      colorColumnName: '',
      colorAggrType: DG.AGG.AVG,
      hierarchyColumnNames: ['control', 'sex', 'disease'],
      onClick:'Select',
      includeNulls: true
    };
    expect(JSON.stringify(standardOptions), JSON.stringify(await getOptions(viewer)));
  });

  test('Changed properties', async () => {
    const changedViewer = DG.Viewer.fromType(TYPE, df, {
      symbolSize: 5,
      sizeColumnName: 'age',
      colorColumnName: 'weight',
      hierarchyColumnNames: ['disease', 'sex'],
    });

    const options = await getOptions(changedViewer);
    expect(options.symbolSize, 5);
    expect(options.sizeColumnName, 'age');
    expect(options.colorColumnName, 'weight');
    expectArray(options.hierarchyColumnNames, ['disease', 'sex']);
  });

  after(async () => {
    subs.forEach((sub) => sub.unsubscribe());
    tv.close();
    grok.shell.closeTable(df);
  });
});