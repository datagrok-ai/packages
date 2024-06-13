import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';

import {getHelm} from './utils';

import {_package} from '../package-test';
import {ITranslationHelper} from '../types';

category('files', () => {
  let th: ITranslationHelper;

  before(async () => {
    th = await _package.getTranslationHelper();
  });

  test('list', async () => {
    /** [subTest, success, format, src, res, tgt, error, stack ] */
    let successCol: DG.Column<boolean>;
    const resDf = DG.DataFrame.fromColumns([
      DG.Column.string('subTest'),
      successCol = DG.Column.bool('success'),
      DG.Column.string('format'),
      DG.Column.string('src'),
      DG.Column.string('res'),
      DG.Column.string('tgt'),
      DG.Column.string('error'),
      DG.Column.string('stack'),
    ]);

    const fiList = await _package.files.list('tests', true, '.csv');
    for (const fi of fiList) {
      const testDf = DG.DataFrame.fromCsv(await fi.readAsString());
      const srcCol = testDf.columns.byIndex(0);
      const format = srcCol.name;
      const tgtCol = testDf.columns.byIndex(1);
      const testDfRowCount = testDf.rowCount;
      for (let rowIdx = 0; rowIdx < testDfRowCount; ++rowIdx) {
        const row = resDf.rows.addNew();
        row['subTest'] = `${fi.name}, row: ${rowIdx}`;
        try {
          const src = srcCol.get(rowIdx);
          const tgt = tgtCol.get(rowIdx);
          row['format'] = format;
          row['src'] = src;
          row['tgt'] = tgt;
          const res = row['res'] = getHelm(src, format, th);
          expect(res, tgt);
          row['success'] = true;
        } catch (err) {
          const [errMsg, errStack] = errInfo(err);
          row['error'] = errMsg;
          row['stack'] = errStack;
          row['success'] = false;
        }
      }
    }

    if (resDf.rowCount == 0) {
      const emptyRow = resDf.rows.addNew(
        ['empty', true, '', '']);
    }

    const failedTestIdx = successCol.toList().findIndex((s) => s != true);
    if (failedTestIdx != -1) {
      const fRow = resDf.rows.get(failedTestIdx);
      throw new Error(`Subtest '${fRow['subTest']}' failed: ${fRow['error']}`);
    }

    return resDf;
  }, {skipReason: 'Can not create test in async manner based on files in Shares.'});
});
