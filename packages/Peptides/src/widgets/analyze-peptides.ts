import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import '../styles.css';
import * as C from '../utils/constants';
import {getSeparator} from '../utils/misc';
import {PeptidesModel} from '../model';
import {_package} from '../package';

/** Peptide analysis widget.
 *
 * @param {DG.DataFrame} currentDf Working table
 * @param {DG.Column} col Aligned sequence column
 * @return {Promise<DG.Widget>} Widget containing peptide analysis */
export async function analyzePeptidesWidget(currentDf: DG.DataFrame, col: DG.Column): Promise<DG.Widget> {
  let tempCol = null;
  let scaledDf: DG.DataFrame;
  let newScaledColName: string;
  const separator = getSeparator(col);
  col.tags[C.TAGS.SEPARATOR] ??= separator;

  for (const column of currentDf.columns.numerical)
    tempCol = column.type === DG.TYPE.FLOAT ? column : null;

  const defaultColumn: DG.Column<number> | null = currentDf.col('activity') || currentDf.col('IC50') || tempCol;
  const histogramHost = ui.div([], {id: 'pep-hist-host'});

  const activityScalingMethod = ui.choiceInput(
    'Scaling', 'none', ['none', 'lg', '-lg'],
    async (currentMethod: string): Promise<void> => {
      const currentActivityCol = activityColumnChoice.value?.name;

      [scaledDf, newScaledColName] = await PeptidesModel.scaleActivity(
        currentMethod, currentDf, currentActivityCol, true);

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
  activityColumnChoice.fireChanged();
  activityScalingMethod.fireChanged();

  const inputsList = [activityColumnChoice, activityScalingMethod];

  const startBtn = ui.button('Launch SAR', async () => {
    await startAnalysis(activityColumnChoice.value, col, currentDf, scaledDf, newScaledColName);
  });
  startBtn.style.alignSelf = 'center';

  const viewer = await currentDf.plot.fromType('WebLogo');
  viewer.root.style.setProperty('height', '130px');

  return new DG.Widget(
    ui.divV([
      viewer.root,
      ui.splitH([
        ui.splitV([ui.inputs(inputsList), startBtn]),
        histogramHost,
      ], {style: {height: 'unset'}}),
    ]),
  );
}

export async function startAnalysis(
  activityColumn: DG.Column<number> | null, alignedSeqCol: DG.Column<string>, currentDf: DG.DataFrame,
  scaledDf: DG.DataFrame, newScaledColName: string, dgPackage?: DG.Package): Promise<PeptidesModel | null> {
  const progress = DG.TaskBarProgressIndicator.create('Loading SAR...');
  let model = null;
  if (activityColumn?.type === DG.TYPE.FLOAT) {
    const activityColumnName: string = activityColumn.name;

    //prepare new DF
    const newDf = currentDf.clone(currentDf.filter, [alignedSeqCol.name, activityColumnName]);
    const activityCol = newDf.getCol(activityColumnName);
    activityCol.name = C.COLUMNS_NAMES.ACTIVITY;
    activityCol.semType = C.SEM_TYPES.ACTIVITY;
    newDf.getCol(alignedSeqCol.name).name = C.COLUMNS_NAMES.ALIGNED_SEQUENCE;
    const activityScaledCol = scaledDf.getCol(C.COLUMNS_NAMES.ACTIVITY_SCALED);
    activityScaledCol.semType = C.SEM_TYPES.ACTIVITY_SCALED;
    newDf.columns.add(activityScaledCol);
    newDf.name = 'Peptides analysis';
    newDf.tags[C.COLUMNS_NAMES.ACTIVITY_SCALED] = newScaledColName;
    // newDf.tags[C.PEPTIDES_ANALYSIS] = 'true';

    model = await PeptidesModel.getInstance(newDf, dgPackage ?? _package);
  } else
    grok.shell.error('The activity column must be of floating point number type!');
  progress.close();
  return model;
}
