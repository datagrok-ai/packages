import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {WebLogo} from '@datagrok-libraries/bio/src/viewers/web-logo';

import '../styles.css';
import * as C from '../utils/constants';
import {PeptidesModel} from '../model';
import $ from 'cash-dom';
import {scaleActivity} from '../utils/misc';

/** Peptide analysis widget.
 *
 * @param {DG.DataFrame} currentDf Working table
 * @param {DG.Column} col Aligned sequence column
 * @return {Promise<DG.Widget>} Widget containing peptide analysis */
export async function analyzePeptidesWidget(currentDf: DG.DataFrame, col: DG.Column): Promise<DG.Widget> {
  if (!col.tags['aligned']?.includes('MSA') && col.tags[DG.TAGS.UNITS].toLowerCase() != 'helm')
    return new DG.Widget(ui.divText('Peptides analysis only works with aligned sequences'));

  let funcs = DG.Func.find({package: 'Bio', name: 'webLogoViewer'});
  if (funcs.length == 0)
    return new DG.Widget(ui.label('Bio package is missing or out of date. Please install the latest version.'));

  funcs = DG.Func.find({package: 'Helm', name: 'getMonomerLib'});
  if (funcs.length == 0)
    return new DG.Widget(ui.label('Helm package is missing or out of date. Please install the latest version.'));

  let tempCol = null;
  let scaledDf: DG.DataFrame;
  let newScaledColName: string;

  for (const column of currentDf.columns.numerical)
    tempCol = column.type === DG.TYPE.FLOAT ? column : null;

  const defaultColumn: DG.Column<number> | null = currentDf.col('activity') || currentDf.col('IC50') || tempCol;
  const histogramHost = ui.div([], {id: 'pep-hist-host'});

  const activityScalingMethod = ui.choiceInput(
    'Scaling', 'none', ['none', 'lg', '-lg'],
    async (currentMethod: string): Promise<void> => {
      const currentActivityCol = activityColumnChoice.value?.name;

      [scaledDf, newScaledColName] = scaleActivity(currentMethod, currentDf, currentActivityCol, true);

      const hist = scaledDf.plot.histogram({
        filteringEnabled: false,
        valueColumnName: C.COLUMNS_NAMES.ACTIVITY_SCALED,
        legendVisibility: 'Never',
        showXAxis: true,
        showColumnSelector: false,
        showRangeSlider: false,
        showBinSelector: false,
      });
      histogramHost.lastChild?.remove();
      histogramHost.appendChild(hist.root);
    });
  activityScalingMethod.setTooltip('Function to apply for each value in activity column');

  const activityScalingMethodState = (_: any): void => {
    activityScalingMethod.enabled = (activityColumnChoice.value ?? false) &&
      DG.Stats.fromColumn(activityColumnChoice.value!, currentDf.filter).min > 0;
    activityScalingMethod.fireChanged();
  };
  const activityColumnChoice = ui.columnInput('Activity', currentDf, defaultColumn, activityScalingMethodState);
  const clustersColumnChoice = ui.columnInput('Clusters', currentDf, null);
  activityColumnChoice.fireChanged();
  activityScalingMethod.fireChanged();

  const inputsList = [activityColumnChoice, activityScalingMethod, clustersColumnChoice];

  const startBtn = ui.button('Launch SAR', async () => {
    await startAnalysis(
      activityColumnChoice.value, col, clustersColumnChoice.value, currentDf, scaledDf, newScaledColName);
  });
  startBtn.style.alignSelf = 'center';

  const viewer = await currentDf.plot.fromType('WebLogo') as WebLogo;
  viewer.root.style.setProperty('height', '130px');
  const logoHost = ui.div();
  $(logoHost).empty().append(viewer.root);

  return new DG.Widget(
    ui.divV([
      logoHost,
      ui.splitH([
        ui.splitV([ui.inputs(inputsList), startBtn]),
        histogramHost,
      ], {style: {height: '215px'}}),
    ]),
  );
}

export async function startAnalysis(
  activityColumn: DG.Column<number> | null, alignedSeqCol: DG.Column<string>, clustersColumn: DG.Column | null,
  currentDf: DG.DataFrame, scaledDf: DG.DataFrame, newScaledColName: string): Promise<PeptidesModel | null> {
  const progress = DG.TaskBarProgressIndicator.create('Loading SAR...');
  let model = null;
  if (activityColumn?.type === DG.TYPE.FLOAT) {
    const activityColumnName: string = activityColumn.name;
    const cloneColList = [alignedSeqCol.name, activityColumnName];
    if (clustersColumn)
      cloneColList.push(clustersColumn.name);

    //prepare new DF
    const newDf = currentDf.clone(currentDf.filter, cloneColList);
    const activityCol = newDf.getCol(activityColumnName);
    activityCol.name = C.COLUMNS_NAMES.ACTIVITY;
    activityCol.semType = C.SEM_TYPES.ACTIVITY;
    newDf.getCol(alignedSeqCol.name).name = C.COLUMNS_NAMES.ALIGNED_SEQUENCE;
    const activityScaledCol = scaledDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    activityScaledCol.semType = C.SEM_TYPES.ACTIVITY_SCALED;
    newDf.columns.add(activityScaledCol);
    newDf.name = 'Peptides analysis';
    newDf.tags[C.COLUMNS_NAMES.ACTIVITY_SCALED] = newScaledColName;
    if (clustersColumn) {
      newDf.getCol(clustersColumn.name).name = C.COLUMNS_NAMES.CLUSTERS;
      newDf.tags[C.TAGS.CLUSTERS] = C.COLUMNS_NAMES.CLUSTERS;
    }
    // newDf.tags[C.PEPTIDES_ANALYSIS] = 'true';

    let monomerType = 'HELM_AA';
    if (alignedSeqCol.getTag(DG.TAGS.UNITS).toLowerCase() == 'helm') {
      const sampleSeq = alignedSeqCol.get(0)!;
      monomerType = sampleSeq.startsWith('PEPTIDE') ? 'HELM_AA' : 'HELM_BASE';
    } else {
      const alphabet = alignedSeqCol.tags[C.TAGS.ALPHABET];
      monomerType = alphabet == 'DNA' || alphabet == 'RNA' ? 'HELM_BASE' : 'HELM_AA';
    }

    newDf.setTag('monomerType', monomerType);

    model = await PeptidesModel.getInstance(newDf);
  } else
    grok.shell.error('The activity column must be of floating point number type!');
  progress.close();
  return model;
}
