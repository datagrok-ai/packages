import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {getRdKitModule} from '../../utils/chem-common-rdkit';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';

import {MMP_COLNAME_FROM, MMP_COLNAME_TO, MMP_COL_PAIRNUM,
  MMP_VIEW_NAME, MMP_TAB_TRANSFORMATIONS, MMP_TAB_FRAGMENTS,
  MMP_TAB_CLIFFS, MMP_TAB_GENERATION, MMP_STRUCT_DIFF_FROM_NAME, MMP_STRUCT_DIFF_TO_NAME} from './mmp-constants';
import {MmpRules, MmpInput} from './mmp-constants';
import {getInverseSubstructuresAndAlign, PaletteCodes, getPalette} from './mmp-mol-rendering';
import {getMmpFrags, getMmpRules} from './mmp-fragments';
import {getMmpActivityPairsAndTransforms} from './mmp-pairs-transforms';
import {getMmpTrellisPlot} from './mmp-frag-vs-frag';
import {fillPairInfo, getMmpScatterPlot, runMmpChemSpace} from './mmp-cliffs';
import {getGenerations} from './mmp-generations';

import {debounceTime} from 'rxjs/operators';
import {getSigFigs} from '../../utils/chem-common';
import {drawMoleculeLabels} from '../../rendering/molecule-label';

import {ILineSeries, MouseOverLineEvent, ScatterPlotLinesRenderer}
  from '@datagrok-libraries/utils/src/render-lines-on-sp';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {FormsViewer} from '@datagrok-libraries/utils/src/viewers/forms-viewer';
import {getEmbeddingColsNames} from
  '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import $ from 'cash-dom';

export class MatchedMolecularPairsViewer extends DG.JsViewer {
  static TYPE: string = 'MMP';

  molecules: string | null = null;
  moleculesCol: DG.Column | null = null;
  activities: string[] | null = null;
  activitiesCols: DG.ColumnList | null = null;
  fragmentCutoff: number | null;

  parentTable: DG.DataFrame | null = null;
  parentCol: DG.Column| null = null;
  mmpRules: MmpRules | null = null;
  mmpView: DG.View | null = null;
  enableFilters: boolean = true;
  colorPalette: PaletteCodes | null = null;
  //transformations tab objects
  allPairsGrid: DG.Grid | null = null;
  transformationsMask: DG.BitSet | null = null;
  casesGrid: DG.Grid | null = null;
  pairsMask: DG.BitSet | null = null;
  //cliffs tab objects
  diffs: Array<Float32Array> | null = null;
  linesIdxs: Uint32Array | null = null;
  cutoffMasks: Array<DG.BitSet> | null = null;
  totalCutoffMask: DG.BitSet | null = null;
  linesMask: BitArray | null = null;
  linesRenderer: ScatterPlotLinesRenderer | null = null;
  lines: ILineSeries | null = null;
  linesActivityCorrespondance: Uint32Array | null = null;
  //generations tab objects
  generationsGrid: DG.Grid | null = null;
  //rdkit
  rdkitModule: RDModule | null = null;
  currentTab = '';
  lastSelectedPair: number | null = null;
  propPanelViewer: FormsViewer | null = null;
  sliderInputs: DG.InputBase[] | null = null;
  colorInputs: DG.InputBase[] | null = null;
  activeInputs: DG.InputBase[] | null = null;
  calculatedOnGPU: boolean | null = null;


  constructor() {
    super();

    //properties
    this.molecules = this.string('molecules');
    this.activities = this.stringList('activities');
    this.fragmentCutoff = this.float('fragmentCutoff');
  }

  onTableAttached() {

  }

  onPropertyChanged(property: DG.Property | null): void {
    console.log(property!.name);
    super.onPropertyChanged(property);
    if (property?.name === 'molecules')
      this.moleculesCol = this.dataFrame.col(property!.get(this));
    if (property?.name === 'activities')
      this.activitiesCols = DG.DataFrame.fromColumns(this.dataFrame.columns.byNames(this.activities!)).columns;
    if (this.molecules && this.activities && this.fragmentCutoff) {
      this.render();
      return;
    }
  }

  async render() {
    $(this.root).empty();
    if (this.dataFrame) {
      const loader = ui.div(ui.loader());
      loader.classList.add('mmpa-loader');
      this.root.appendChild(loader);
      const progressMMP = DG.TaskBarProgressIndicator.create(`Running MMP analysis...`);
      await this.runMMP(
        {table: this.dataFrame,
          molecules: this.moleculesCol!,
          activities: this.activitiesCols!,
          fragmentCutoff: this.fragmentCutoff!,
        });

      $(this.root).empty();
      this.root.appendChild(this.mmpView!.root);
      progressMMP.close();
    }
  }

  private setupTransformationTab(): void {
    this.transformationsMask!.setAll(true);
    this.parentTable!.onCurrentRowChanged.pipe(debounceTime(1000)).subscribe(() => {
      if (this.parentTable!.currentRowIdx !== -1) {
        this.refilterAllPairs(true);
        this.refreshPair(this.rdkitModule!);
      }
    });

    this.refilterAllPairs(true);

    this.allPairsGrid!.table.onCurrentRowChanged.subscribe(() => {
      if (this.allPairsGrid!.table.currentRowIdx !== -1)
        this.refreshPair(this.rdkitModule!);
    });

    this.mmpView!.name = MMP_VIEW_NAME;
    this.mmpView!.box = true;

    this.pairsMask!.setAll(false);
    this.refreshPair(this.rdkitModule!);
  }

  private setupCliffsTab(
    tp: DG.Viewer, sp: DG.Viewer,
    sliderInputs: DG.InputBase[], sliderInputValueDivs: HTMLDivElement[],
    colorInputs: DG.InputBase[], activeInputs: DG.InputBase[],
    linesEditor: ScatterPlotLinesRenderer, linesActivityCorrespondance: Uint32Array): HTMLDivElement {
    const roots: any[] = new Array<any>(sliderInputs.length);
    for (let i = 0; i < sliderInputs.length; i ++) {
      activeInputs[i].onChanged(() => {
        this.refilterCliffs(sliderInputs.map((si) => si.value), activeInputs.map((ai) => ai.value), true);
      });

      sliderInputs[i].onChanged(() => {
        sliderInputValueDivs[i].innerText = sliderInputs[i].value === 0 ? '0' :
          getSigFigs(sliderInputs[i].value, 4).toString();
        this.refilterCliffs(sliderInputs.map((si) => si.value), activeInputs.map((ai) => ai.value), true);
      });

      colorInputs[i].value = this.colorPalette!.hex[i];
      colorInputs[i].onChanged(() => {
        const progressRendering = DG.TaskBarProgressIndicator.create(`Changing colors...`);

        //refresh lines
        for (let i =0; i < colorInputs.length; i++) {
          this.colorPalette!.hex[i] = colorInputs[i].value;
          this.colorPalette!.numerical[i] = DG.Color.fromHtml(colorInputs[i].value);
          this.colorPalette!.rgb[i] = DG.Color.toRgb(this.colorPalette!.numerical[i]);
          this.colorPalette!.rgbCut[i] = this.colorPalette!.rgb[i].replace('rgb(', '').replace(')', '');
        }

        const colors = this.lines!.colors;
        for (let i = 0; i < colors!.length; i++)
          colors![i] = this.colorPalette!.rgbCut[linesActivityCorrespondance[i]];

        const lines: ILineSeries = {
          from: this.lines!.from,
          to: this.lines!.to,
          drawArrows: true,
          opacity: 0.5,
          colors: colors,
          arrowSize: 10,
        };

        this.lines = lines;
        this.linesRenderer!.updateLines(lines);

        //refresh trellis plot
        const schemes = new Array<any>(colorInputs.length);
        for (let i = 0; i < colorInputs.length; i++)
          schemes[i] = [this.colorPalette!.numerical[i]];

        tp.setOptions({'innerViewerLook': {'colorSchemes': schemes}});
        progressRendering.close();
      });
      roots[i] = ui.divH([activeInputs[i].root, colorInputs[i].root, sliderInputs[i].root],
        {style: {paddingRight: '20px', height: '20px'}});
    }
    const sliders = ui.divV(roots, 'css-flex-wrap mmpa-slider-roots');
    sp.root.style.width = '100%';

    const cliffs = ui.divV([sliders, ui.box(sp.root,
      {style: {maxHeight: '100px', paddingRight: '6px'}})], 'css-flex-wrap');

    this.totalCutoffMask!.setAll(true);
    this.linesMask!.setAll(true);

    for (let i = 0; i < sliderInputs.length; i++) {
      this.cutoffMasks![i] = DG.BitSet.create(this.parentTable!.rowCount);
      this.cutoffMasks![i].setAll(true);
    }

    this.linesRenderer = linesEditor;

    this.refilterCliffs(sliderInputs.map((si) => si.value), activeInputs.map((ai) => ai.value), false);

    return ui.box(cliffs);
  }

  private getTabs(tp: DG.Viewer, sliderInputs: DG.InputBase[], activeInputs: DG.InputBase[],
    cliffs: HTMLDivElement): DG.TabControl {
    const tabs = ui.tabControl(null, false);

    const addToWorkspaceButton = (table: DG.DataFrame, name: string, className: string) => {
      const button = ui.iconFA('arrow-square-down', () => {
        const clonedTable = table.clone();
        clonedTable.name = name;
        grok.shell.addTableView(clonedTable);
      }, 'Add table to workspace');
      button.classList.add(className);
      return button;
    };

    tabs.addPane(MMP_TAB_TRANSFORMATIONS, () => {
      const createGridDiv = (name: string, grid: DG.Grid) => {
        const header = ui.h1(name, 'chem-mmpa-transformation-tab-header');
        grid.root.prepend(header);
        return ui.splitV([
          ui.box(
            ui.divH([header, addToWorkspaceButton(grid.dataFrame, name, 'chem-mmpa-add-to-workspace-button')]),
            {style: {maxHeight: '30px'}},
          ),
          grid.root,
        ]);
      };

      return ui.splitV([
        createGridDiv('Fragments', this.allPairsGrid!),
        createGridDiv('Pairs', this.casesGrid!),
      ], {}, true);
    });
    tabs.addPane(MMP_TAB_FRAGMENTS, () => {
      return tp.root;
    });
    tabs.addPane(MMP_TAB_CLIFFS, () => {
      return cliffs;
    });
    const genTab = tabs.addPane(MMP_TAB_GENERATION, () => {
      return this.generationsGrid!.root;
    });
    genTab.header.append(addToWorkspaceButton(this.generationsGrid!.dataFrame,
      'Generation', 'chem-mmpa-add-generation-to-workspace-button'));

    tabs.onTabChanged.subscribe(() => {
      this.currentTab = tabs.currentPane.name;
      if (tabs.currentPane.name == MMP_TAB_TRANSFORMATIONS) {
        this.enableFilters = true;
        this.refilterAllPairs(false);
      } else if (tabs.currentPane.name == MMP_TAB_FRAGMENTS) {
        this.refreshFilterAllPairs();
        this.enableFilters = false;
      } else if (tabs.currentPane.name == MMP_TAB_CLIFFS) {
        this.refilterCliffs(sliderInputs.map((si) => si.value), activeInputs.map((ai) => ai.value), false);
        if (this.lastSelectedPair) {
          grok.shell.o = fillPairInfo(this.lastSelectedPair, this.linesIdxs!,
            this.linesActivityCorrespondance![this.lastSelectedPair],
            this.casesGrid!.dataFrame, this.diffs!, this.parentTable!, this.rdkitModule!);
        }
      }
    });

    const decript1 = 'Shows all fragmental substitutions for a given molecule';
    const decript2 = 'Analysis of fragments versus explored value';
    const decript3 = 'Cliffs analysis';

    tabs.getPane(MMP_TAB_TRANSFORMATIONS).header.onmouseover =
      (ev): void => ui.tooltip.show(decript1, ev.clientX, ev.clientY + 5);
    tabs.getPane(MMP_TAB_FRAGMENTS).header.onmouseover =
      (ev): void => ui.tooltip.show(decript2, ev.clientX, ev.clientY + 5);
    tabs.getPane(MMP_TAB_CLIFFS).header.onmouseover =
      (ev): void => ui.tooltip.show(decript3, ev.clientX, ev.clientY + 5);

    return tabs;
  }

  private fillAll(mmpInput: MmpInput, palette: PaletteCodes,
    rules: MmpRules, diffs: Array<Float32Array>,
    linesIdxs: Uint32Array, allPairsGrid: DG.Grid, casesGrid: DG.Grid, generationsGrid: DG.Grid,
    tp: DG.Viewer, sp: DG.Viewer,
    sliderInputs: DG.InputBase[], sliderInputValueDivs: HTMLDivElement[],
    colorInputs: DG.InputBase[], activeInputs: DG.InputBase[],
    linesEditor: ScatterPlotLinesRenderer, lines: ILineSeries, linesActivityCorrespondance: Uint32Array,
    rdkitModule: RDModule, gpuUsed: boolean) {
    this.rdkitModule = rdkitModule;

    this.parentTable = mmpInput.table;
    this.parentCol = mmpInput.molecules;
    this.colorPalette = palette;
    this.mmpRules = rules;

    this.diffs = diffs;
    this.allPairsGrid = allPairsGrid;
    this.casesGrid = casesGrid;
    this.generationsGrid = generationsGrid;
    this.lines = lines;
    this.linesActivityCorrespondance = linesActivityCorrespondance;
    this.linesIdxs = linesIdxs;
    this.calculatedOnGPU = gpuUsed;

    //transformations tab setup
    this.transformationsMask = DG.BitSet.create(this.allPairsGrid.dataFrame.rowCount);
    this.pairsMask = DG.BitSet.create(this.casesGrid.dataFrame.rowCount);
    this.mmpView = DG.View.create();
    this.setupTransformationTab();

    //Cliffs tab setup
    this.sliderInputs = sliderInputs;
    this.colorInputs = colorInputs;
    this.activeInputs = activeInputs;
    this.cutoffMasks = new Array<DG.BitSet>(sliderInputs.length);
    this.totalCutoffMask = DG.BitSet.create(this.parentTable.rowCount);
    this.linesMask = new BitArray(linesIdxs.length);
    const cliffs = this.setupCliffsTab(tp, sp,
      sliderInputs, sliderInputValueDivs, colorInputs, activeInputs,
      linesEditor, linesActivityCorrespondance);

    //tabs
    const tabs = this.getTabs(tp, sliderInputs, activeInputs, cliffs);

    this.linesRenderer!.lineClicked.subscribe((event: MouseOverLineEvent) => {
      this.linesRenderer!.currentLineId = event.id;
      if (event.id !== -1) {
        grok.shell.o = fillPairInfo(event.id, linesIdxs, linesActivityCorrespondance[event.id],
          casesGrid.dataFrame, diffs, mmpInput.table, rdkitModule, this.propPanelViewer!);
        this.lastSelectedPair = event.id;
      }
    });

    this.mmpView.append(tabs);

    const propertiesColumnsNames = this.parentTable.columns.names()
      .filter((name) => name !== this.parentCol!.name && !name.startsWith('~'));
    this.propPanelViewer = new FormsViewer();
    this.propPanelViewer.dataframe = this.parentTable;
    this.propPanelViewer.columns = propertiesColumnsNames;
  }

  async runMMP(mmpInput: MmpInput) {
    //console.profile('MMP');
    //rdkit module
    const module = getRdKitModule();
    const moleculesArray = mmpInput.molecules.toList();

    //initial calculations
    const fragsOut = await getMmpFrags(moleculesArray);
    const [mmpRules, allCasesNumber, gpu] = await getMmpRules(fragsOut, mmpInput.fragmentCutoff);
    const palette = getPalette(mmpInput.activities.length);

    //Transformations tab
    const {maxActs, diffs, meanDiffs, activityMeanNames,
      linesIdxs, allPairsGrid, casesGrid, lines, linesActivityCorrespondance} =
      getMmpActivityPairsAndTransforms(mmpInput, mmpRules, allCasesNumber, palette);

    //Fragments tab
    const tp = getMmpTrellisPlot(allPairsGrid, activityMeanNames, palette);

    const embedColsNames = getEmbeddingColsNames(mmpInput.table).map((it) => `~${it}`);
    //Cliffs tab
    const [sp, sliderInputs, sliderInputValueDivs, colorInputs, activeInputs] =
      getMmpScatterPlot(mmpInput, maxActs, embedColsNames);
    drawMoleculeLabels(mmpInput.table, mmpInput.molecules, sp as DG.ScatterPlotViewer, 20, 7, 100, 110);

    //running internal chemspace
    const linesEditor = runMmpChemSpace(mmpInput, sp, lines, linesIdxs, linesActivityCorrespondance,
      casesGrid.dataFrame, diffs, module, embedColsNames);

    const generationsGrid: DG.Grid =
      await getGenerations(mmpInput, moleculesArray, fragsOut, meanDiffs, allPairsGrid, activityMeanNames);
    //console.profileEnd('MMP');

    this.fillAll(mmpInput, palette, mmpRules, diffs, linesIdxs,
      allPairsGrid, casesGrid, generationsGrid, tp, sp, sliderInputs, sliderInputValueDivs,
      colorInputs, activeInputs, linesEditor, lines, linesActivityCorrespondance, module, gpu);
  }

  findSpecificRule(diffFromSubstrCol: DG.Column): [idxPairs: number, cases: number[]] {
    const idxParent = this.parentTable!.currentRowIdx;
    let idxPairs = -1;
    const cases: number[] = [];
    const idx = this.allPairsGrid!.table.currentRowIdx;
    if (idx !== -1) {
      const ruleSmi1 = this.allPairsGrid!.table.getCol(MMP_COLNAME_FROM).get(idx);
      const ruleSmi2 = this.allPairsGrid!.table.getCol(MMP_COLNAME_TO).get(idx);
      const ruleSmiNum1 = this.mmpRules!.smilesFrags.indexOf(ruleSmi1);
      const ruleSmiNum2 = this.mmpRules!.smilesFrags.indexOf(ruleSmi2);

      let counter = 0;

      for (let i = 0; i < this.mmpRules!.rules.length; i++) {
        const first = this.mmpRules!.rules[i].smilesRule1;
        const second = this.mmpRules!.rules[i].smilesRule2;
        for (let j = 0; j < this.mmpRules!.rules[i].pairs.length; j++) {
          if (ruleSmiNum1 == first && ruleSmiNum2 == second) {
            this.pairsMask!.set(counter, true, false);
            if (diffFromSubstrCol.get(counter) === null)
              cases.push(counter);
            if (this.mmpRules!.rules[i].pairs[j].firstStructure == idxParent)
              idxPairs = counter;
          }
          counter++;
        }
      }
    }
    return [idxPairs, cases];
  }

  async recoverHighlights(
    cases: number[], diffFrom : DG.Column, diffTo: DG.Column,
    diffFromSubstrCol: DG.Column, diffToSubstrCol: DG.Column, rdkitModule: RDModule) : Promise<void> {
    const pairsFrom = Array<string>(cases.length);
    const pairsTo = Array<string>(cases.length);
    for (let i = 0; i < cases.length; i++) {
      pairsFrom[i] = diffFrom.get(cases[i]);
      pairsTo[i] = diffTo.get(cases[i]);
    }
    const {inverse1, inverse2, fromAligned, toAligned} =
      await getInverseSubstructuresAndAlign(pairsFrom, pairsTo, rdkitModule);
    for (let i = 0; i < cases.length; i++) {
      diffFrom.set(cases[i], fromAligned[i]);
      diffTo.set(cases[i], toAligned[i]);
      diffFromSubstrCol.set(cases[i], inverse1[i]);
      diffToSubstrCol.set(cases[i], inverse2[i]);
    }
  }

  /**
  * Prepares all the entities to show for selected pair.
  * @param {RDModule} rdkitModule RDkit module instance
  */
  async refreshPair(rdkitModule: RDModule) : Promise<void> {
    const progressBarPairs = DG.TaskBarProgressIndicator.create(`Refreshing pairs...`);

    this.pairsMask!.setAll(false);
    const diffFromSubstrCol = this.casesGrid!.dataFrame.getCol(MMP_STRUCT_DIFF_FROM_NAME);
    const diffToSubstrCol = this.casesGrid!.dataFrame.getCol(MMP_STRUCT_DIFF_TO_NAME);
    const diffFrom = this.casesGrid!.dataFrame.getCol(MMP_COLNAME_FROM);
    const diffTo = this.casesGrid!.dataFrame.getCol(MMP_COLNAME_TO);

    const [idxPairs, cases] = this.findSpecificRule(diffFromSubstrCol);
    await this.recoverHighlights(cases, diffFrom, diffTo, diffFromSubstrCol, diffToSubstrCol, rdkitModule);

    this.casesGrid!.dataFrame.filter.copyFrom(this.pairsMask!);

    this.casesGrid!.setOptions({
      pinnedRowColumnNames: [],
      pinnedRowValues: [],
    });
    if (idxPairs >= 0) {
      this.casesGrid!.setOptions({
        pinnedRowValues: [idxPairs.toString()],
        pinnedRowColumnNames: [MMP_COL_PAIRNUM],
      });
    }

    progressBarPairs.close();
  }

  refreshFilterAllPairs() {
    const consistsBitSet: DG.BitSet = DG.BitSet.create(this.allPairsGrid!.dataFrame.rowCount);
    consistsBitSet.setAll(true);
    this.allPairsGrid!.dataFrame.filter.copyFrom(consistsBitSet);
  }

  /**
  * Gets visible all pairs according to selected molecule in the table.
  * @param {boolean} rowChanged flag if row was changed
  */
  refilterAllPairs(rowChanged: boolean) {
    let idxTrue = -1;
    if (rowChanged) {
      const idx = this.parentTable!.currentRowIdx;
      this.transformationsMask!.setAll(false);

      for (let i = 0; i < this.mmpRules!.rules.length; i++) {
        for (let j = 0; j < this.mmpRules!.rules[i].pairs.length; j++) {
          const fs = this.mmpRules!.rules[i].pairs[j].firstStructure;
          if (idx == fs) {
            if (idxTrue == -1)
              idxTrue = i;
            this.transformationsMask!.set(i, true, false);
            break;
          }
        }
      }
    }

    if (this.enableFilters) {
      this.allPairsGrid!.dataFrame.filter.copyFrom(this.transformationsMask!);
      this.allPairsGrid!.invalidate();
      if (rowChanged)
        this.allPairsGrid!.table.currentRowIdx = idxTrue;
    }
  }

  /**
  * Makes the dataset filtering according to user specified cutoffs and 'isActive' checkbox for each activity.
  * @param {number[]} cutoffs for each activity the corresponding cuttof is specified by user
  * @param {boolean} refilter flag if calculation is required before filtering
  */
  refilterCliffs(cutoffs: number[], isActiveVar: boolean[], refilter: boolean) {
    if (refilter) {
      for (let i = 0; i < this.cutoffMasks!.length; i ++)
        this.cutoffMasks![i].setAll(false);

      this.totalCutoffMask!.setAll(false);
      this.linesMask!.setAll(false);

      //setting activity associated masks
      for (let i = 0; i < this.lines!.from.length; i++) {
        const activityNumber = this.linesActivityCorrespondance![i];
        const line = this.linesIdxs![i];
        //if 'isActive' checkbox for variable is unset
        //setting line to invisible and continue, otherwise look at cutoff
        if (!isActiveVar[activityNumber]) {
          this.linesMask!.setBit(i, false, false);
          continue;
        }
        if (this.diffs![activityNumber][line] >= cutoffs[activityNumber]) {
          this.cutoffMasks![activityNumber].set(this.lines!.from[i], true, false);
          this.cutoffMasks![activityNumber].set(this.lines!.to[i], true, false);
          this.linesMask!.setBit(i, true, false);
        }
      }

      //setting resulting masks
      //TODO: refine
      for (let j = 0; j < this.totalCutoffMask!.length; j++) {
        let res = false;
        for (let i = 0; i < this.cutoffMasks!.length; i++)
          res = res || this.cutoffMasks![i].get(j);
        this.totalCutoffMask!.set(j, res, false);
      }
    }

    this.parentTable!.filter.copyFrom(this.totalCutoffMask!);
    this.linesRenderer!.linesVisibility = this.linesMask!;
  }
}
