import * as DG from 'datagrok-api/dg';
import {ILineSeries} from '@datagrok-libraries/utils/src/render-lines-on-sp';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {MmpRules, MmpInput} from './mmp-constants';
import {SUBSTRUCT_COL} from '../../constants';
import {MMP_COLNAME_FROM, MMP_COLNAME_TO, MMP_COLNAME_PAIRS, MMP_COL_PAIRNUM, MMP_COL_PAIRNUM_FROM,
  MMP_COL_PAIRNUM_TO, MMP_COLNAME_MEANDIFF, MMP_COLNAME_DIFF, MMP_STRUCT_DIFF_FROM_NAME, MMP_STRUCT_DIFF_TO_NAME,
  MMP_COLOR,
  columnsDescriptions} from './mmp-constants';
import {PaletteCodes} from './mmp-mol-rendering';
import {createColWithDescription} from './mmp-generations';

function calculateActivityDiffs(mmpInput: MmpInput,
  mmpRules: MmpRules, variates: number, allCasesNumber: number) :
  { maxActs: number [],
    fromFrag: string[],
    toFrag: string[],
    occasions: Int32Array,
    meanDiffs: Float32Array[],
    molFrom: string[],
    molTo: string[],
    pairNum: Int32Array,
    molNumFrom: Int32Array,
    molNumTo: Int32Array,
    pairsFromSmiles: string[],
    pairsToSmiles: string[],
    ruleNum: Int32Array,
    diffs: Float32Array[],
    activityPairsIdxs: BitArray[]
  } {
  const maxActs = new Array<number>(variates);
  for (let i = 0; i < variates; i++)
    maxActs[i] = 0;
  const fromFrag = new Array<string>(mmpRules.rules.length);
  const toFrag = new Array<string>(mmpRules.rules.length);
  const occasions = new Int32Array(mmpRules.rules.length);
  const meanDiffs = new Array<Float32Array>(variates);
  for (let i = 0; i < variates; i++)
    meanDiffs[i] = new Float32Array(mmpRules.rules.length);

  const molFrom = new Array<string>(allCasesNumber);
  const molTo = new Array<string>(allCasesNumber);
  const pairNum = new Int32Array(allCasesNumber);
  const molNumFrom = new Int32Array(allCasesNumber);
  const molNumTo = new Int32Array(allCasesNumber);
  const diffs = new Array<Float32Array>(variates);
  for (let i = 0; i < variates; i++)
    diffs[i] = new Float32Array(allCasesNumber);

  const pairsFromSmiles = new Array<string>(allCasesNumber);
  const pairsToSmiles = new Array<string>(allCasesNumber);
  const ruleNum = new Int32Array(allCasesNumber);

  const activityPairsIdxs = new Array<BitArray>(variates);
  for (let i = 0; i < variates; i++)
    activityPairsIdxs[i] = new BitArray(allCasesNumber);

  let pairIdx = 0;
  for (let i = 0; i < mmpRules.rules.length; i++) {
    fromFrag[i] = mmpRules.smilesFrags[mmpRules.rules[i].smilesRule1];
    toFrag[i] = mmpRules.smilesFrags[mmpRules.rules[i].smilesRule2];
    occasions[i] = mmpRules.rules[i].pairs.length;

    const mean = new Float32Array(variates);
    for (let j = 0; j < occasions[i]; j++) {
      const idx1 = mmpRules.rules[i].pairs[j].firstStructure;
      const idx2 = mmpRules.rules[i].pairs[j].secondStructure;

      molFrom[pairIdx] = mmpInput.molecules.get(idx1);
      molTo[pairIdx] = mmpInput.molecules.get(idx2);

      for (let k = 0; k < variates; k++) {
        //TODO: make more efficient
        const col = mmpInput.activities.byIndex(k);
        const diff = col.get(idx2) - col.get(idx1);
        diffs[k][pairIdx] = diff;
        if (diff > 0) {
          if (diff > maxActs[k])
            maxActs[k] = diff;
          activityPairsIdxs[k].setBit(pairIdx, true, false);
        }

        mean[k] += diff;
      }

      molNumFrom[pairIdx] = idx1;
      molNumTo[pairIdx] = idx2;
      pairNum[pairIdx] = pairIdx;
      pairsFromSmiles[pairIdx] = mmpRules.smilesFrags[mmpRules.rules[i].smilesRule1];
      pairsToSmiles[pairIdx] = mmpRules.smilesFrags[mmpRules.rules[i].smilesRule2];
      ruleNum[pairIdx] = i;

      pairIdx++;
    }

    for (let k = 0; k < variates; k++) {
      mean[k] /= occasions[i];
      meanDiffs[k][i] = mean[k];
    }
  }

  return {maxActs, fromFrag, toFrag, occasions, meanDiffs, molFrom, molTo,
    pairNum, molNumFrom, molNumTo, pairsFromSmiles, pairsToSmiles, ruleNum, diffs, activityPairsIdxs};
}

function createLines(variates: number, activityPairsIdxs: BitArray[],
  molNumFrom: Int32Array, molNumTo: Int32Array, palette: PaletteCodes) : {
    linesIdxs: Uint32Array,
    lines: ILineSeries,
    linesActivityCorrespondance: Uint32Array
  } {
  let allCount = 0;
  for (let i = 0; i < variates; i++)
    allCount += activityPairsIdxs[i].trueCount();

  const pointsFrom = new Uint32Array(allCount);
  const pointsTo = new Uint32Array(allCount);
  const linesIdxs = new Uint32Array(allCount);
  const colors = new Array<string>(allCount);
  const linesActivityCorrespondance = new Uint32Array(allCount);

  let pairsCounter = 0;
  for (let j = 0; j < variates; j++) {
    for (let i = -1; (i = activityPairsIdxs[j].findNext(i)) !== -1;) {
      pointsFrom[pairsCounter] = molNumFrom[i];
      pointsTo[pairsCounter] = molNumTo[i];
      linesIdxs[pairsCounter] = i;
      colors[pairsCounter] = palette.rgbCut[j];
      linesActivityCorrespondance[pairsCounter] = j;
      pairsCounter++;
    }
  }

  const lines: ILineSeries = {
    from: pointsFrom,
    to: pointsTo,
    drawArrows: true,
    colors: colors,
    arrowSize: 10,
    width: 0.5,
  };

  return {linesIdxs, lines, linesActivityCorrespondance};
}

function getAllPairsGrid(variates: number, fromFrag: string[], toFrag: string[],
  occasions: Int32Array, activities: DG.ColumnList, meanDiffs: Float32Array[]) : [string[], DG.Grid] {
  const fromCol = createColWithDescription('string', MMP_COLNAME_FROM, fromFrag);
  const toCol = createColWithDescription('string', MMP_COLNAME_TO, toFrag);
  const occasionsCol = DG.Column.fromInt32Array(MMP_COLNAME_PAIRS, occasions);
  occasionsCol.setTag('description', columnsDescriptions[MMP_COLNAME_PAIRS]);
  fromCol.semType = DG.SEMTYPE.MOLECULE;
  toCol.semType = DG.SEMTYPE.MOLECULE;
  occasionsCol.semType = DG.TYPE.INT;

  const allPairsCols = [fromCol, toCol, occasionsCol];
  const activityMeanNames = Array<string>(variates);
  for (let i = 0; i < variates; i++) {
    const name = MMP_COLNAME_MEANDIFF + ' ' + activities.byIndex(i).name;
    activityMeanNames[i] = name;
    allPairsCols.push(DG.Column.fromFloat32Array(name, meanDiffs[i]));
  }

  //TODO: make compatible with trellis
  const colorsPal = new Int32Array(fromCol.length);
  for (let i = 0; i < fromCol.length; i++)
    colorsPal[i] = i < fromCol.length ? 0 : 1;

  const colorCol = DG.Column.fromInt32Array(MMP_COLOR, colorsPal);
  allPairsCols.push(colorCol);

  const dfAllPairs = DG.DataFrame.fromColumns(allPairsCols);
  const grid = dfAllPairs.plot.grid();
  grid.col(MMP_COLOR)!.visible = false;
  return [activityMeanNames, grid];
}

function getCasesGrid(variates: number, molFrom: string[], molTo: string[], pairNum: Int32Array,
  molNumFrom: Int32Array, molNumTo: Int32Array, pairsFromSmiles: string[],
  pairsToSmiles: string[], ruleNum: Int32Array, activities: DG.ColumnList, diffs: Float32Array[]) : DG.Grid {
  const pairsFromCol = createColWithDescription('string', MMP_COLNAME_FROM, molFrom);
  const pairsToCol = createColWithDescription('string', MMP_COLNAME_TO, molTo);
  const structureDiffFromCol = DG.Column.fromType('object', MMP_STRUCT_DIFF_FROM_NAME, molFrom.length);
  const structureDiffToCol = DG.Column.fromType('object', MMP_STRUCT_DIFF_TO_NAME, molFrom.length);
  const pairNumberCol = DG.Column.fromInt32Array(MMP_COL_PAIRNUM, pairNum);
  const pairNumberFromCol = DG.Column.fromInt32Array(MMP_COL_PAIRNUM_FROM, molNumFrom);
  const pairNumberToCol = DG.Column.fromInt32Array(MMP_COL_PAIRNUM_TO, molNumTo);

  const pairsFromSmilesCol = DG.Column.fromStrings('~smi1', pairsFromSmiles);
  const pairsToSmilesCol = DG.Column.fromStrings('~smi2', pairsToSmiles);
  const ruleNumCol = DG.Column.fromInt32Array('~ruleNum', ruleNum);

  pairsFromSmilesCol.semType = DG.SEMTYPE.MOLECULE;
  pairsToSmilesCol.semType = DG.SEMTYPE.MOLECULE;
  pairsFromCol.semType = DG.SEMTYPE.MOLECULE;
  pairsToCol.semType = DG.SEMTYPE.MOLECULE;
  pairsFromCol.temp[SUBSTRUCT_COL] = MMP_STRUCT_DIFF_FROM_NAME;
  pairsToCol.temp[SUBSTRUCT_COL] = MMP_STRUCT_DIFF_TO_NAME;

  const allTransformationsCols = [pairsFromCol, pairsToCol,
    structureDiffFromCol, structureDiffToCol,
    pairNumberCol, pairNumberFromCol, pairNumberToCol,
    pairsFromSmilesCol, pairsToSmilesCol, ruleNumCol];

  for (let i = 0; i < variates; i++) {
    const name = MMP_COLNAME_DIFF + ' ' + activities.byIndex(i).name;
    allTransformationsCols.push(DG.Column.fromFloat32Array(name, diffs[i]));
  }

  const pairedTransformations = DG.DataFrame.fromColumns(allTransformationsCols);
  return pairedTransformations.plot.grid();
}

export function getMmpActivityPairsAndTransforms(mmpInput: MmpInput, mmpRules: MmpRules,
  allCasesNumber: number, palette: PaletteCodes): {
  maxActs: number[],
  diffs: Array<Float32Array>,
  meanDiffs: Array<Float32Array>,
  activityMeanNames: Array<string>,
  linesIdxs: Uint32Array,
  allPairsGrid: DG.Grid,
  casesGrid: DG.Grid,
  lines: ILineSeries,
  linesActivityCorrespondance: Uint32Array
} {
  const variates = mmpInput.activities.length;
  const activityDiffs = calculateActivityDiffs(mmpInput, mmpRules, variates, allCasesNumber);

  const [activityMeanNames, allPairsGrid] = getAllPairsGrid(variates, activityDiffs.fromFrag, activityDiffs.toFrag,
    activityDiffs.occasions, mmpInput.activities, activityDiffs.meanDiffs);

  const casesGrid = getCasesGrid(variates, activityDiffs.molFrom, activityDiffs.molTo, activityDiffs.pairNum,
    activityDiffs.molNumFrom, activityDiffs.molNumTo, activityDiffs.pairsFromSmiles,
    activityDiffs.pairsToSmiles, activityDiffs.ruleNum, mmpInput.activities, activityDiffs.diffs);

  const lines =
    createLines(variates, activityDiffs.activityPairsIdxs, activityDiffs.molNumFrom, activityDiffs.molNumTo, palette);

  return {maxActs: activityDiffs.maxActs, diffs: activityDiffs.diffs, meanDiffs: activityDiffs.meanDiffs,
    activityMeanNames, linesIdxs: lines.linesIdxs, allPairsGrid, casesGrid,
    lines: lines.lines, linesActivityCorrespondance: lines.linesActivityCorrespondance};
}
