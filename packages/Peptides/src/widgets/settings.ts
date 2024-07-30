/* eslint-disable max-len */
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import * as type from '../utils/types';
import * as C from '../utils/constants';
import {PeptidesModel, VIEWER_TYPE} from '../model';

import $ from 'cash-dom';
import wu from 'wu';
import {getTreeHelperInstance} from '../package';
import {
  MmDistanceFunctionsNames,
  MmDistanceFunctionsNames as distFNames,
} from '@datagrok-libraries/ml/src/macromolecule-distance-functions';

type PaneInputs = { [paneName: string]: DG.InputBase[] };
type SettingsElements = { dialog: DG.Dialog, accordion: DG.Accordion, inputs: PaneInputs };

export enum SETTINGS_PANES {
  GENERAL = 'General',
  VIEWERS = 'Viewers',
  COLUMNS = 'Columns',
  SEQUENCE_SPACE = 'Sequence space',
  MCL = 'MCL',
}

export enum GENERAL_INPUTS {
  ACTIVITY = 'Activity',
  ACTIVITY_SCALING = 'Activity scaling',
}

export enum VIEWERS_INPUTS {
  DENDROGRAM = VIEWER_TYPE.DENDROGRAM,
}

export enum COLUMNS_INPUTS {
  IS_INCLUDED = '',
  AGGREGATION = 'Aggregation',
}
export enum SEQUENCE_SPACE_INPUTS {
  DISTANCE_FUNCTION = 'Distance Function',
  GAP_OPEN = 'Gap Open Penalty',
  GAP_EXTEND = 'Gap Extend Penalty',
  CLUSTER_EMBEDDINGS = 'Cluster Embeddings',
  EPSILON = 'Epsilon',
  MIN_PTS = 'Minimum Points',
  FINGERPRINT_TYPE = 'Fingerprint Type',
}

export enum MCL_INPUTS {
  DISTANCE_FUNCTION = 'Distance Function',
  GAP_OPEN = 'Gap Open Penalty',
  GAP_EXTEND = 'Gap Extend Penalty',
  FINGERPRINT_TYPE = 'Fingerprint Type',
  THRESHOLD = 'Similarity Threshold',
  INFLATION = 'Inflation Factor',
  MAX_ITERATIONS = 'Max Iterations',
}


export const PANES_INPUTS = {
  [SETTINGS_PANES.GENERAL]: GENERAL_INPUTS,
  [SETTINGS_PANES.VIEWERS]: VIEWERS_INPUTS,
  [SETTINGS_PANES.COLUMNS]: COLUMNS_INPUTS,
  [SETTINGS_PANES.SEQUENCE_SPACE]: SEQUENCE_SPACE_INPUTS,
  [SETTINGS_PANES.MCL]: MCL_INPUTS,
};

/**
 * Creates settings dialog for peptides analysis.
 * @param model - Peptides analysis model.
 * @return - Settings dialog elements.
 */
export function getSettingsDialog(model: PeptidesModel): SettingsElements {
  if (model.settings == null)
    grok.log.error('PeptidesError: Settings are not initialized');

  const accordion = ui.accordion();
  const settings = model.settings;
  const currentScaling = settings?.activityScaling ?? C.SCALING_METHODS.NONE;
  const currentColumns = settings?.columns ?? {};

  const result: type.PartialPeptidesSettings = {};
  const inputs: PaneInputs = {};
  const seqSpaceParams = settings?.sequenceSpaceParams ?? new type.SequenceSpaceParams();
  const mclParams = settings?.mclSettings ?? new type.MCLSettings();
  // General pane options
  const activityCol = ui.input.column(GENERAL_INPUTS.ACTIVITY, {table: model.df,
    value: model.df.getCol(model.settings!.activityColumnName!), onValueChanged: () => result.activityColumnName = activityCol.value!.name,
    filter: (col: DG.Column) => (col.type === DG.TYPE.FLOAT || col.type === DG.TYPE.INT) &&
      col.name !== C.COLUMNS_NAMES.ACTIVITY && col.stats.missingValueCount === 0});
  activityCol.setTooltip('Numeric activity column');
  const activityScaling =
    ui.input.choice(GENERAL_INPUTS.ACTIVITY_SCALING, {value: currentScaling, items: Object.values(C.SCALING_METHODS),
      onValueChanged: () => result.activityScaling = activityScaling.value as C.SCALING_METHODS}) as DG.InputBase<C.SCALING_METHODS>;
  activityScaling.setTooltip('Activity column transformation method');

  accordion.addPane(SETTINGS_PANES.GENERAL, () => ui.inputs([activityCol, activityScaling]), true);
  inputs[SETTINGS_PANES.GENERAL] = [activityCol, activityScaling];

  // Viewers pane options
  /* FIXME: combinations of adding and deleting viewers are not working properly
  const isMPEnabled = wu(model.analysisView.viewers).some((v) => v.type === VIEWER_TYPE.MONOMER_POSITION);
  const monomerPosition = ui.input.bool(VIEWER_TYPE.MONOMER_POSITION, {value: isMPEnabled ?? false,
    onValueChanged: () => result.showMostPotentResidues = monomerPosition.value!});
  const isMPREnabled = wu(model.analysisView.viewers).some((v) => v.type === VIEWER_TYPE.MOST_POTENT_RESIDUES);
  const mostPotentResidues = ui.input.bool(VIEWER_TYPE.MOST_POTENT_RESIDUES, {value: isMPREnabled ?? false,
    onValueChanged: () => result.showMonomerPosition = mostPotentResidues.value!});
  const isLSTEnabled = wu(model.analysisView.viewers).some((v) => v.type === VIEWER_TYPE.LOGO_SUMMARY_TABLE);
  const logoSummaryTable = ui.input.bool(VIEWER_TYPE.LOGO_SUMMARY_TABLE, {value: isLSTEnabled ?? false,
    onValueChanged: () => result.showLogoSummaryTable = logoSummaryTable.value!});
  logoSummaryTable.enabled = typeof settings.clustersColumnName !== 'undefined';
  */
  const isDendrogramEnabled = wu(model.analysisView.viewers).some((v) => v.type === VIEWER_TYPE.DENDROGRAM);
  const dendrogram = ui.input.bool(VIEWER_TYPE.DENDROGRAM, {value: isDendrogramEnabled ?? false,
    onValueChanged: () => result.showDendrogram = dendrogram.value}) as DG.InputBase<boolean>;
  const clusterMaxActivity = ui.input.bool(VIEWER_TYPE.CLUSTER_MAX_ACTIVITY, {value: !!settings?.showClusterMaxActivity,
    onValueChanged: () => {result.showClusterMaxActivity = clusterMaxActivity.value ?? undefined;}});
  const showSeqSpace = ui.input.bool('Sequence space', {value: !!settings?.showSequenceSpace,
    onValueChanged: () => {
      result.showSequenceSpace = showSeqSpace.value ?? undefined;
      if (showSeqSpace.value) {
        seqSpacePane.root.style.display = 'flex';
        if (!settings?.showSequenceSpace)
          result.sequenceSpaceParams = seqSpaceParams;
      } else {
        seqSpacePane.root.style.display = 'none';
        delete result.sequenceSpaceParams;
      }
      if (result.showSequenceSpace === settings?.showSequenceSpace)
        delete result.showSequenceSpace;
    }});
  clusterMaxActivity.setTooltip('Show cluster max activity viewer');
  dendrogram.setTooltip('Show dendrogram viewer');
  dendrogram.enabled = getTreeHelperInstance() !== null;

  accordion.addPane(SETTINGS_PANES.VIEWERS, () => ui.inputs([dendrogram, showSeqSpace, clusterMaxActivity]), true);
  inputs[SETTINGS_PANES.VIEWERS] = [dendrogram, showSeqSpace, clusterMaxActivity];

  // Columns to include pane options
  const inputsRows: HTMLElement[] = [];
  const includedColumnsInputs: DG.InputBase[] = [];
  for (const col of model.df.columns.numerical) {
    const colName = col.name;
    if (colName === settings!.activityColumnName || colName === C.COLUMNS_NAMES.ACTIVITY)
      continue;


    const isIncludedInput = ui.input.bool(COLUMNS_INPUTS.IS_INCLUDED, {value: typeof (currentColumns)[colName] !== 'undefined',
      onValueChanged: () => {
        result.columns ??= {};
        if (isIncludedInput.value)
          result.columns[colName] = aggregationInput.value;
        else {
          delete result.columns[colName];
          if (Object.keys(result.columns).length === Object.keys(currentColumns).length)
            delete result.columns;
        }
      }}) as DG.InputBase<boolean>;
    isIncludedInput.setTooltip('Include aggregated column value in tooltips, Logo Summary Table and ' +
      'Distribution panel');

    const aggregationInput = ui.input.choice(COLUMNS_INPUTS.AGGREGATION, {value: (currentColumns)[colName] ?? DG.AGG.AVG,
      items: Object.values(DG.STATS), onValueChanged: () => {
        result.columns ??= {};
        if (isIncludedInput.value)
          result.columns[colName] = aggregationInput.value;
        else {
          delete result.columns[col.name];
          if (Object.keys(result.columns).length === Object.keys(currentColumns).length)
            delete result.columns;
        }
      }}) as DG.InputBase<DG.AggregationType>;
    aggregationInput.setTooltip('Aggregation method');
    $(aggregationInput.root).find('label').css('width', 'auto');
    const inputsRow = ui.inputsRow(col.name, [isIncludedInput, aggregationInput]);
    includedColumnsInputs.push(...[isIncludedInput, aggregationInput]);
    $(inputsRow).find('div.ui-div').css('display', 'inline-flex');
    inputsRows.push(inputsRow);
  }
  if (inputsRows.length !== 0) {
    accordion.addPane(SETTINGS_PANES.COLUMNS, () => ui.divV(inputsRows), false);
    inputs[SETTINGS_PANES.COLUMNS] = includedColumnsInputs;
  }

  // Sequence space pane options
  const modifiedSeqSpaceParams: Partial<type.SequenceSpaceParams> = {};
  function onSeqSpaceParamsChange(fieldName: keyof type.SequenceSpaceParams, value: any): void {
    correctSeqSpaceInputs();
    if (value === null || value === undefined || value === '')
      return;
    modifiedSeqSpaceParams[fieldName] = value;
    let isAllSame = true;
    for (const [key, val] of Object.entries(modifiedSeqSpaceParams)) {
      if (val !== seqSpaceParams[key as keyof type.SequenceSpaceParams]) {
        isAllSame = false;
        break;
      }
    }
    if (isAllSame)
      delete result.sequenceSpaceParams;
    else
      result.sequenceSpaceParams = {...seqSpaceParams, ...modifiedSeqSpaceParams};
  }

  function toggleInputs(nwInputs: DG.InputBase[], condition: boolean): void {
    nwInputs.forEach((input) => {
      if (condition)
        input.root.style.display = 'flex';
      else
        input.root.style.display = 'none';
    });
  }
  // SEQ SPACE INPUTS
  const distanceFunctionInput: DG.ChoiceInput<MmDistanceFunctionsNames> = ui.input.choice(SEQUENCE_SPACE_INPUTS.DISTANCE_FUNCTION,
    {value: seqSpaceParams.distanceF, items: [distFNames.NEEDLEMANN_WUNSCH, distFNames.HAMMING, distFNames.LEVENSHTEIN, distFNames.MONOMER_CHEMICAL_DISTANCE],
      onValueChanged: () => onSeqSpaceParamsChange('distanceF', distanceFunctionInput.value)}) as DG.ChoiceInput<MmDistanceFunctionsNames>;
  distanceFunctionInput.setTooltip('Distance function for sequences');
  const gapOpenInput = ui.input.float(SEQUENCE_SPACE_INPUTS.GAP_OPEN, {value: seqSpaceParams.gapOpen,
    onValueChanged: () => onSeqSpaceParamsChange('gapOpen', gapOpenInput.value)});
  const gapExtendInput = ui.input.float(SEQUENCE_SPACE_INPUTS.GAP_EXTEND, {value: seqSpaceParams.gapExtend,
    onValueChanged: () => onSeqSpaceParamsChange('gapExtend', gapExtendInput.value)});
  const clusterEmbeddingsInput =
    ui.input.bool(SEQUENCE_SPACE_INPUTS.CLUSTER_EMBEDDINGS, {value: seqSpaceParams.clusterEmbeddings ?? false,
      onValueChanged: () => onSeqSpaceParamsChange('clusterEmbeddings', clusterEmbeddingsInput.value)});
  clusterEmbeddingsInput.setTooltip('Cluster embeddings using DBSCAN algorithm');
  const epsilonInput = ui.input.float(SEQUENCE_SPACE_INPUTS.EPSILON, {value: seqSpaceParams.epsilon,
    onValueChanged: () => onSeqSpaceParamsChange('epsilon', epsilonInput.value)});
  epsilonInput.setTooltip(
    'Epsilon parameter for DBSCAN. Minimum distance between two points to be considered as a cluster');
  const minPtsInput = ui.input.int(SEQUENCE_SPACE_INPUTS.MIN_PTS, {value: seqSpaceParams.minPts,
    onValueChanged: () => onSeqSpaceParamsChange('minPts', minPtsInput.value)});
  minPtsInput.setTooltip('Minimum number of points in a cluster');
  const fingerprintTypesInput: DG.ChoiceInput<string> = ui.input.choice(SEQUENCE_SPACE_INPUTS.FINGERPRINT_TYPE, {value: seqSpaceParams.fingerprintType,
    items: ['Morgan', 'RDKit', 'Pattern', 'AtomPair', 'MACCS', 'TopologicalTorsion'],
    onValueChanged: () => onSeqSpaceParamsChange('fingerprintType', fingerprintTypesInput.value)}) as DG.ChoiceInput<string>;
  function correctSeqSpaceInputs(): void {
    toggleInputs([gapOpenInput, gapExtendInput], distanceFunctionInput.value === distFNames.NEEDLEMANN_WUNSCH);
    toggleInputs([epsilonInput, minPtsInput], clusterEmbeddingsInput.value === true);
    toggleInputs([fingerprintTypesInput],
      distanceFunctionInput.value === distFNames.MONOMER_CHEMICAL_DISTANCE ||
      distanceFunctionInput.value === distFNames.NEEDLEMANN_WUNSCH);
  }
  correctSeqSpaceInputs();
  // END OF SEQ SPACE INPUTS

  //MCL INPUTS

  const modifiedMCLParams: Partial<type.MCLSettings> = {};
  function onMCLParamsChange(fieldName: keyof type.MCLSettings, value: any): void {
    correctMCLInputs();
    //correctSeqSpaceInputs();
    if (value === null || value === undefined || value === '')
      return;
    modifiedMCLParams[fieldName] = value;
    let isAllSame = true;
    for (const [key, val] of Object.entries(modifiedMCLParams)) {
      if (val !== mclParams[key as keyof type.MCLSettings]) {
        isAllSame = false;
        break;
      }
    }
    if (isAllSame)
      delete result.mclSettings;
    else
      result.mclSettings = {...mclParams, ...modifiedMCLParams};
  }

  function correctMCLInputs(): void {
    toggleInputs([mclGapOpenInput, mclGapExtendInput], mclDistanceFunctionInput.value === distFNames.NEEDLEMANN_WUNSCH);
    toggleInputs([mclFingerprintTypesInput],
      mclDistanceFunctionInput.value === distFNames.MONOMER_CHEMICAL_DISTANCE ||
      mclDistanceFunctionInput.value === distFNames.NEEDLEMANN_WUNSCH);
  }

  const mclDistanceFunctionInput: DG.ChoiceInput<MmDistanceFunctionsNames> = ui.input.choice(MCL_INPUTS.DISTANCE_FUNCTION,
    {value: mclParams.distanceF, items: [distFNames.NEEDLEMANN_WUNSCH, distFNames.MONOMER_CHEMICAL_DISTANCE, distFNames.HAMMING, distFNames.LEVENSHTEIN],
      onValueChanged: () => onMCLParamsChange('distanceF', mclDistanceFunctionInput.value)}) as DG.ChoiceInput<MmDistanceFunctionsNames>;
  const mclGapOpenInput = ui.input.float(MCL_INPUTS.GAP_OPEN, {value: mclParams.gapOpen,
    onValueChanged: () => onMCLParamsChange('gapOpen', mclGapOpenInput.value)});
  const mclGapExtendInput = ui.input.float(MCL_INPUTS.GAP_EXTEND, {value: mclParams.gapExtend,
    onValueChanged: () => onMCLParamsChange('gapExtend', mclGapExtendInput.value)});
  const mclFingerprintTypesInput: DG.ChoiceInput<string> = ui.input.choice(MCL_INPUTS.FINGERPRINT_TYPE, {value: mclParams.fingerprintType,
    items: ['Morgan', 'RDKit', 'Pattern', 'AtomPair', 'MACCS', 'TopologicalTorsion'],
    onValueChanged: () => onMCLParamsChange('fingerprintType', mclFingerprintTypesInput.value)}) as DG.ChoiceInput<string>;
  const mclThresholdInput = ui.input.int(MCL_INPUTS.THRESHOLD, {value: mclParams.threshold ?? 80,
    onValueChanged: () => onMCLParamsChange('threshold', mclThresholdInput.value)});
  const mclMaxIterationsInput = ui.input.int(MCL_INPUTS.MAX_ITERATIONS, {value: mclParams.maxIterations ?? 5,
    onValueChanged: () => onMCLParamsChange('maxIterations', mclMaxIterationsInput.value)});
  const mclInflationInput = ui.input.float(MCL_INPUTS.INFLATION, {value: mclParams.inflation ?? 1.4,
    onValueChanged: () => {onMCLParamsChange('inflation', mclInflationInput.value);}});
  correctMCLInputs();

  const mclInputs = [mclThresholdInput, mclDistanceFunctionInput, mclFingerprintTypesInput,
    mclGapOpenInput, mclGapExtendInput, mclInflationInput, mclMaxIterationsInput];

  accordion.addPane(SETTINGS_PANES.MCL, () => ui.inputs(mclInputs), true);
  inputs[SETTINGS_PANES.MCL] = mclInputs;
  // END OF MCL INPUTS

  const seqSpaceInputs = [distanceFunctionInput, fingerprintTypesInput, gapOpenInput,
    gapExtendInput, clusterEmbeddingsInput, epsilonInput, minPtsInput];
  const seqSpacePane = accordion.addPane(SETTINGS_PANES.SEQUENCE_SPACE, () => ui.inputs(seqSpaceInputs), true);
  inputs[SETTINGS_PANES.SEQUENCE_SPACE] = seqSpaceInputs;
  showSeqSpace.fireChanged();
  const dialog = ui.dialog('Peptides settings').add(accordion);
  dialog.root.style.width = '400px';
  dialog.onOK(() => {
    model.settings = result;
  });
  dialog.show();

  return {dialog, accordion, inputs};
}
