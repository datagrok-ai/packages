import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {_package, sequenceSpaceTopMenu} from '../package';
import {reduceDimensinalityWithNormalization} from '@datagrok-libraries/ml/src/sequence-space';
import {StringMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {delay} from '@datagrok-libraries/utils/src/test';

enum EMBED_COL_NAMES {
  X = 'Embed_X',
  Y = 'Embed_Y'
}

export async function demoSequenceSpace(
  view: DG.TableView, df: DG.DataFrame, colName: string, method: string
): Promise<DG.ScatterPlotViewer> {
  let resSpaceViewer: DG.ScatterPlotViewer;
  if (true) {
    // Custom sequence space implementation for closer resembling of hierarchical clustering results.
    const embedColNameList = Object.values(EMBED_COL_NAMES);
    // ensure embed columns exist
    for (let embedI: number = 0; embedI < embedColNameList.length; embedI++) {
      const embedColName: string = embedColNameList[embedI];
      const embedCol: DG.Column | null = df.col(embedColName);
      if (!embedCol) {
        // Notification is required to reflect added data frame Embed_<X> columns to grid columns
        // MolecularLiabilityBrowser.setView() corrects grid columns' names with .replace('_', ' ');
        const notify: boolean = embedI == embedColNameList.length - 1; // notify on adding last Embed_<X> column
        df.columns.add(DG.Column.float(embedColName, df.rowCount), notify);
      }
    }

    if (df.rowCount >= 1) {
      const seqCol: DG.Column<string> = df.getCol(colName);
      const seqList = seqCol.toList();

      const t1: number = Date.now();
      _package.logger.debug('Bio: demoBio01aUI(), calc reduceDimensionality start...');
      const redDimRes = await reduceDimensinalityWithNormalization( // TODO: Rename method typo
        seqList, method, StringMetricsNames.Levenshtein, {});
      const t2: number = Date.now();
      _package.logger.debug('Bio: demoBio01aUI(), calc reduceDimensionality ' +
        `ET: ${((t2 - t1) / 1000)} s`);

      for (let embedI: number = 0; embedI < embedColNameList.length; embedI++) {
        const embedColName: string = embedColNameList[embedI];
        const embedCol: DG.Column = df.getCol(embedColName);
        const embedColData: Float32Array = redDimRes.embedding[embedI];
        // TODO: User DG.Column.setRawData()
        // embedCol.setRawData(embedColData);
        embedCol.init((rowI) => { return embedColData[rowI]; });
      }

      const t3: number = Date.now();
      _package.logger.debug('MLB: MlbVrSpaceBrowser.buildView(), postprocess reduceDimensionality ' +
        `ET: ${((t3 - t2) / 1000)} s`);
    }
    resSpaceViewer = (await df.plot.fromType(DG.VIEWER.SCATTER_PLOT, {
      'xColumnName': EMBED_COL_NAMES.X,
      'yColumnName': EMBED_COL_NAMES.Y,
      'lassoTool': true,
    })) as DG.ScatterPlotViewer;
  } else {
    resSpaceViewer = (await sequenceSpaceTopMenu(df, df.getCol(colName),
      'UMAP', StringMetricsNames.Levenshtein, true)) as DG.ScatterPlotViewer;
  }
  view.dockManager.dock(resSpaceViewer!, DG.DOCK_TYPE.RIGHT, null, 'Sequence Space', 0.35);
  return resSpaceViewer;
}

export function handleError(err: any): void {
  const errMsg: string = err instanceof Error ? err.message : err.toString();
  const stack: string | undefined = err instanceof Error ? err.stack : undefined;
  grok.shell.error(errMsg);
  _package.logger.error(err.message, undefined, stack);
}
