import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {delay} from '@datagrok-libraries/utils/src/test';
import {checkInputColumnUI} from './check-input-column';
import {splitAlignedSequences} from '@datagrok-libraries/bio/src/utils/splitter';
import * as C from './constants';
import {TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {SEM_TYPES} from './constants';


export async function splitToMonomersUI(table: DG.DataFrame, seqCol: DG.Column<string>): Promise<DG.DataFrame> {
  // Delay is required for initial function dialog to close before starting invalidating of molfiles.
  // Otherwise, dialog is freezing
  await delay(10);
  if (!checkInputColumnUI(seqCol, 'Sequence space')) return table;

  const tempDf = splitAlignedSequences(seqCol);
  tempDf.name = 'splitToMonomers';
  const originalDf = seqCol.dataFrame;
  for (const tempCol of tempDf.columns) {
    // TODO: GROK-11212
    // tempCol.setTag(DG.TAGS.CELL_RENDERER, C.SEM_TYPES.MONOMER);
    tempCol.semType = C.SEM_TYPES.MONOMER;
    tempCol.setTag(bioTAGS.alphabet, seqCol.getTag(bioTAGS.alphabet));
  }

  const colNameRe = /(\d+)(?: \((\d+)\))?/;
  const generateNewColName = (srcName: string): string => {
    colNameRe.lastIndex = 0;
    const ma = srcName.match(colNameRe);
    if (!ma) return srcName;
    return `${ma[1]} (${parseInt(ma[2] ?? '0') + 1})`;
  };

  // if (tempDf.columns.length === 0) return;

  for (let tempColI = 0; tempColI < tempDf.columns.length; tempColI++) {
    const tempCol = tempDf.columns.byIndex(tempColI);
    tempCol.semType = SEM_TYPES.MONOMER;
    tempCol.setTag(bioTAGS.alphabet, seqCol.getTag(bioTAGS.alphabet));

    const wdMax = 100;
    let wdCount = 0;
    while (originalDf.columns.byName(tempCol.name) && wdCount < wdMax) {
      tempCol.name = generateNewColName(tempCol.name);
      wdCount++;
    }

    originalDf.columns.add(tempCol);
  }

  // originalDf.join(tempDf, [], [], undefined, undefined, DG.JOIN_TYPE.LEFT, true);
  await grok.data.detectSemanticTypes(originalDf);

  for (let tempColI = 0; tempColI < tempDf.columns.length; tempColI++) {
    const tempCol = tempDf.columns.byIndex(tempColI);
    tempCol.setTag(DG.TAGS.CELL_RENDERER, 'Monomer');
    tempCol.setTag('.use-as-filter', 'false'); // TODO: Use DG.TAGS.
  }

  return originalDf;
}
