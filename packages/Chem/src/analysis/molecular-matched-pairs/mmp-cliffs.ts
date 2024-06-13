import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {ISubstruct} from '../../rendering/rdkit-cell-renderer';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {drawMoleculeToCanvas} from '../../utils/chem-common-rdkit';
import {getSigFigs} from '../../utils/chem-common';
import {FormsViewer} from '@datagrok-libraries/utils/src/viewers/forms-viewer';
import {ILineSeries, MouseOverLineEvent, ScatterPlotCurrentLineStyle, ScatterPlotLinesRenderer}
  from '@datagrok-libraries/utils/src/render-lines-on-sp';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {BitArrayMetrics, BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {chemSpace} from '../chem-space';
import {debounceTime} from 'rxjs/operators';
import {getInverseSubstructuresAndAlign} from './mmp-mol-rendering';
import {MMP_COLNAME_FROM, MMP_COLNAME_TO, MMP_COL_PAIRNUM_FROM, MMP_COL_PAIRNUM_TO,
  MMP_STRUCT_DIFF_FROM_NAME, MMP_STRUCT_DIFF_TO_NAME} from './mmp-constants';
import {MmpInput} from './mmp-constants';
import $ from 'cash-dom';

export function getMmpScatterPlot(
  mmpInput: MmpInput, maxActs: number[], axesColsNames: string[]) :
[sp: DG.Viewer, sliderInputs: DG.InputBase[], sliderInputValueDivs: HTMLDivElement[], colorInputs: DG.InputBase[],
  activeInputs: DG.InputBase[]] {
  mmpInput.table.columns.addNewFloat(axesColsNames[0]);
  mmpInput.table.columns.addNewFloat(axesColsNames[1]);
  const sp = DG.Viewer.scatterPlot(mmpInput.table, {
    x: axesColsNames[0],
    y: axesColsNames[1],
    zoomAndFilter: 'no action',
    //color: activities.name,
    showXSelector: false,
    showYSelector: false,
    markerDefaultSize: 7,
  });

  const sliderInputs = new Array<DG.InputBase>(maxActs.length);
  const sliderInputValueDivs = new Array<HTMLDivElement>(maxActs.length);
  const colorInputs = new Array<DG.InputBase>(maxActs.length);
  const activeInputs = new Array<DG.InputBase>(maxActs.length);

  for (let i = 0; i < maxActs.length; i ++) {
    const actName = mmpInput.activities.byIndex(i).name;
    const sliderInput = ui.sliderInput(mmpInput.activities.byIndex(i).name, 0, 0, maxActs[i]);
    const sliderInputValueDiv = ui.divText(sliderInput.stringValue, 'ui-input-description');
    sliderInput.addOptions(sliderInputValueDiv);
    sliderInput.root.classList.add('mmpa-slider-input');
    ui.tooltip.bind(sliderInput.captionLabel, `Select the cutoff by ${actName} difference`);
    ui.tooltip.bind(sliderInput.input, `${actName} value cutoff`);
    sliderInputs[i] = sliderInput;
    sliderInputValueDivs[i] = sliderInputValueDiv;
    const colorInput = ui.colorInput('', '#FF0000');
    colorInput.root.classList.add('mmpa-color-input');
    colorInputs[i] = colorInput;
    const activeInput = ui.boolInput('', true);
    activeInput.classList.add('mmpa-bool-input');
    activeInputs[i] = activeInput;
  }

  return [sp, sliderInputs, sliderInputValueDivs, colorInputs, activeInputs];
}

function drawMolPair(molecules: string[], indexes: number[], substruct: (ISubstruct | null)[], div: HTMLDivElement,
  parentTable: DG.DataFrame, tooltip?: boolean) {
  ui.empty(div);
  const hosts = ui.divH([]);
  if (!tooltip)
    hosts.classList.add('chem-mmpa-context-pane-mol-div');
  const canvasWidth = 170;
  const canvasHeight = 75;
  for (let i = 0; i < 2; i++) {
    const imageHost = ui.canvas(canvasWidth, canvasHeight);
    imageHost.onclick = () => {parentTable.currentRowIdx = indexes[i];};
    drawMoleculeToCanvas(0, 0, canvasWidth, canvasHeight, imageHost, molecules[i], '', undefined, substruct[i]);
    hosts.append(imageHost);
  }
  div.append(hosts);
};

export function fillPairInfo(line: number, linesIdxs: Uint32Array, activityNum: number, pairsDf: DG.DataFrame,
  diffs: Array<Float32Array>, parentTable: DG.DataFrame,
  rdkitModule: RDModule, propPanelViewer?: FormsViewer):
  HTMLDivElement {
  const div = ui.divV([]);
  $(div).css({'width': '100%', 'height': '100%'});
  const moleculesDiv = ui.divH([]);
  div.append(moleculesDiv);
  const pairIdx = linesIdxs[line];
  const subsrtFrom = pairsDf.get(MMP_STRUCT_DIFF_FROM_NAME, pairIdx);
  const subsrtTo = pairsDf.get(MMP_STRUCT_DIFF_TO_NAME, pairIdx);
  const moleculeFrom = pairsDf.get(MMP_COLNAME_FROM, pairIdx);
  const moleculeTo = pairsDf.get(MMP_COLNAME_TO, pairIdx);
  const fromIdx = pairsDf.get(MMP_COL_PAIRNUM_FROM, pairIdx);
  const toIdx = pairsDf.get(MMP_COL_PAIRNUM_TO, pairIdx);
  if (propPanelViewer) {
    const props = getMoleculesPropertiesDiv(propPanelViewer, [fromIdx, toIdx]);
    div.append(props);
  } else {
    const diff = ui.tableFromMap({'Diff': getSigFigs(diffs[activityNum][pairIdx], 4)});
    diff.style.maxWidth = '150px';
    div.append(diff);
  }
  if (subsrtFrom || subsrtTo) {
    drawMolPair([moleculeFrom, moleculeTo], [fromIdx, toIdx],
      [subsrtFrom, subsrtTo], moleculesDiv, parentTable, !propPanelViewer);
  } else {
    moleculesDiv.append(ui.divText(`Loading...`));
    getInverseSubstructuresAndAlign([moleculeFrom], [moleculeTo], rdkitModule).then((res) => {
      const {inverse1, inverse2, fromAligned, toAligned} = res;
      pairsDf.set(MMP_STRUCT_DIFF_FROM_NAME, pairIdx, inverse1[0]);
      pairsDf.set(MMP_STRUCT_DIFF_TO_NAME, pairIdx, inverse2[0]);
      pairsDf.set(MMP_COLNAME_FROM, pairIdx, fromAligned[0]);
      pairsDf.set(MMP_COLNAME_TO, pairIdx, toAligned[0]);
      drawMolPair([fromAligned[0], toAligned[0]], [fromIdx, toIdx],
        [inverse1[0], inverse2[0]], moleculesDiv, parentTable, !!propPanelViewer);
    });
  }
  return div;
};

function getMoleculesPropertiesDiv(propPanelViewer: FormsViewer, idxs: number[]): HTMLElement {
  propPanelViewer.fixedRowNumbers = idxs;
  propPanelViewer.root.classList.add('chem-mmpa-forms-viewer');

  return ui.div(propPanelViewer.root, {style: {height: '100%'}});
}

export function runMmpChemSpace(mmpInput: MmpInput, sp: DG.Viewer, lines: ILineSeries,
  linesIdxs: Uint32Array, linesActivityCorrespondance: Uint32Array, pairsDf: DG.DataFrame, diffs: Array<Float32Array>,
  rdkitModule: RDModule, embedColsNames: string[]): ScatterPlotLinesRenderer {
  const chemSpaceParams = {
    seqCol: mmpInput.molecules,
    methodName: DimReductionMethods.UMAP,
    similarityMetric: BitArrayMetricsNames.Tanimoto as BitArrayMetrics,
    embedAxesNames: embedColsNames,
    options: {useWebGPU: true},
  };

  const spEditor = new ScatterPlotLinesRenderer(sp as DG.ScatterPlotViewer,
    embedColsNames[0], embedColsNames[1], lines, ScatterPlotCurrentLineStyle.bold);


  spEditor.lineHover.pipe(debounceTime(500)).subscribe((event: MouseOverLineEvent) => {
    ui.tooltip.show(
      fillPairInfo(event.id, linesIdxs, linesActivityCorrespondance[event.id],
        pairsDf, diffs, mmpInput.table, rdkitModule),
      event.x, event.y);
  });

  const progressBarSpace = DG.TaskBarProgressIndicator.create(`Running Chemical space...`);
  chemSpace(chemSpaceParams).then((res) => {
    const embeddings = res.coordinates;
    for (const col of embeddings)
      mmpInput.table.columns.replace(col.name, col);
    progressBarSpace.close();
  });

  return spEditor;
}
