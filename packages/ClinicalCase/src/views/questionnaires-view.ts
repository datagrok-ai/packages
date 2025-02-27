import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {studies} from '../clinical-study';
import {addDataFromDmDomain} from '../data-preparation/utils';
import {ETHNIC, QS_CATEGORY, QS_RES, QS_RES_N, QS_SUB_CATEGORY, QS_TEST,
  RACE, SEX, SUBJECT_ID, VISIT_NUM} from '../constants/columns-constants';
import {updateDivInnerHTML} from '../utils/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {tTest} from '@datagrok-libraries/statistics/src/tests';
import {getPearsonChiCriterionPValue} from '../stats/pearson-chi-criteria';
const {jStat} = require('jstat');


export class QuestionnaiesView extends ClinicalCaseViewBase {
  qsCategories = [];
  qsSubCategories = [];
  qsWithDm: DG.DataFrame;
  subCategoriesDiv = ui.div();
  categoriesChoice: DG.InputBase;
  subCategoriesChoice: DG.InputBase;
  selectedCategory = '';
  selectedSubCategory = '';
  questionsDiv = ui.box();
  questions = [];
  questionsDf: DG.DataFrame;
  openedQuestionsDfs = {};
  graphTypes = ['histogram', 'linechart'];
  graphTypesDiv = ui.div();
  graphTypesChoice: DG.InputBase;
  selectedGraphType: string;
  splitByChoice: DG.InputBase;
  splitBy: string[];
  selectedSplitBy = '';
  graphCellWidth = 100;
  graphCellHeight = 70;
  selectedQuestionSummary = {};
  selectedQuestionDf: DG.DataFrame;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
  }

  createView(): void {
    this.splitBy = [SEX, RACE, ETHNIC, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]]
      .filter((it) => studies[this.studyId].domains.dm.columns.names().includes(it)) as string[];
    this.selectedSplitBy = this.splitBy.length ? this.splitBy[0] : '';
    this.qsWithDm = addDataFromDmDomain(studies[this.studyId].domains.qs, studies[this.studyId].domains.dm,
      studies[this.studyId].domains.qs.columns.names(), this.splitBy);
    this.qsCategories = this.qsWithDm.col(QS_CATEGORY).categories;
    this.selectedCategory = this.qsCategories[0];
    this.selectedGraphType = this.graphTypes[0];
    this.updateSubCategoriesChoice();
    this.updateQuestionGrid();

    this.categoriesChoice = ui.input.choice('Category', {value: this.selectedCategory, items: this.qsCategories});
    this.categoriesChoice.onChanged.subscribe((value) => {
      this.selectedCategory = value;
      this.updateSubCategoriesChoice();
      this.updateQuestionGrid();
    });
    this.categoriesChoice.input.style.width = '100px';

    this.graphTypesChoice = ui.input.choice('Graph type', {value: this.selectedGraphType, items: this.graphTypes});
    this.graphTypesChoice.onChanged.subscribe((value) => {
      this.selectedGraphType = value;
      this.updateQuestionGrid();
    });
    this.categoriesChoice.input.style.width = '100px';

    this.splitByChoice = ui.input.choice('Split By', {value: this.selectedSplitBy, items: this.splitBy});
    this.splitByChoice.onChanged.subscribe((value) => {
      this.selectedSplitBy = value;
      this.updateQuestionGrid();
    });
    this.splitByChoice.input.style.width = '100px';

    this.setRibbonPanels(
      [[this.categoriesChoice.root], [this.subCategoriesDiv], [this.splitByChoice.root]],
    );

    this.root.className = 'grok-view ui-box';
    this.root.append(this.questionsDiv);

    grok.data.linkTables(studies[this.studyId].domains.dm, this.qsWithDm,
      [SUBJECT_ID], [SUBJECT_ID],
      [DG.SYNC_TYPE.FILTER_TO_FILTER]);
  }

  updateGlobalFilter(): void {
    this.updateQuestionGrid();
  }

  private updateSubCategories() {
    this.qsSubCategories = this.qsWithDm
      .groupBy([QS_CATEGORY, QS_SUB_CATEGORY])
      .where({[QS_CATEGORY]: `${this.selectedCategory}`})
      .aggregate()
      .col(QS_SUB_CATEGORY)
      .categories;
  }

  private updateSubCategoriesChoice() {
    this.updateSubCategories();
    this.selectedSubCategory = this.qsSubCategories[0];
    this.subCategoriesChoice =
      ui.input.choice('Sub Category', {value: this.selectedSubCategory, items: this.qsSubCategories});
    this.subCategoriesChoice.onChanged.subscribe((value) => {
      this.selectedSubCategory = value;
      this.updateQuestionGrid();
    });
    this.subCategoriesChoice.input.style.width = '150px';
    updateDivInnerHTML(this.subCategoriesDiv, this.subCategoriesChoice.root);
  }


  private updateQuestionGrid() {
    this.updateQuestions();
    updateDivInnerHTML(this.questionsDiv, this.createQuestionsDfGrid().root);
  }

  private createQuestionsDfGrid() {
    const df = DG.DataFrame.create(this.questions.length);
    df.columns.addNewString('Question').init((i) => this.questions[i]);
    df.columns.addNewString('Graphs');
    const visitNums = this.questionsDf.col(VISIT_NUM).categories;
    visitNums.forEach((it) => {
      df.columns.addNewFloat(`${it}`).init((i) => {
        const question = df.get('Question', i);
        const questionVisitNumDf = this.questionsDf
          .groupBy(this.questionsDf.columns.names())
          .where({[QS_TEST]: `${question}`, [VISIT_NUM]: `${it}`})
          .aggregate();
        const pValue = this.getPValue(questionVisitNumDf);
        return pValue;
      });
      df.col(`${it}`).meta.colors.setConditional({'0-0.05': '#00FF00'});
    });
    this.subscribeToGridCurrentRow(df);
    const grid = df.plot.grid();
    grid.setOptions({'rowHeight': this.graphCellHeight});
    const col = grid.columns.byName('Graphs');
    col.cellType = 'html';
    col.width = this.graphCellWidth;
    const self = this;
    grid.onCellPrepare(function(gc) {
      if (gc.isTableCell) {
        if (gc.gridColumn.name === 'Graphs') {
          const question = gc.grid.dataFrame.get('Question', gc.tableRowIndex);
          const eventElement = self.createQuestionCharts(question, true);
          gc.style.element = eventElement;
        }
      }
    });
    return grid;
  }

  private subscribeToGridCurrentRow(df: DG.DataFrame) {
    df.onCurrentRowChanged.subscribe(() => {
      this.selectedQuestionDf = this.createQuestionDf(df.get('Question', df.currentRowIdx));
      this.setPropertyPanel();
    });
  }

  getPValue(df: DG.DataFrame) {
    if (!this.isCategorical(df)) {
      const valuesByCat = df.groupBy([this.selectedSplitBy]).getGroups();
      const dataForAnova = [];
      Object.values(valuesByCat).forEach((cat) => {
        const catResults = cat.getCol(QS_RES_N).getRawData();
        dataForAnova.push(Array.from(catResults));
      });
      const pValue = dataForAnova.length === 2 ?
        tTest(dataForAnova[0], dataForAnova[1])['p-value'] : jStat.anovaftest(...dataForAnova);
      return pValue;
    } else {
      const pValue = getPearsonChiCriterionPValue(df, QS_RES, this.selectedSplitBy);
      return pValue;
    }
  }

  private updateQuestions() {
    this.openedQuestionsDfs = {};
    this.questionsDf = this.qsWithDm.clone(this.qsWithDm.filter)
      .groupBy(this.qsWithDm.columns.names())
      .where({[QS_CATEGORY]: `${this.selectedCategory}`, [QS_SUB_CATEGORY]: `${this.selectedSubCategory}`})
      .aggregate();
    this.questions = this.questionsDf
      .col(QS_TEST)
      .categories;
  }

  private getQuestionSummary(df: DG.DataFrame) {
    const summaryDict = {};
    summaryDict['Total subjects'] = df.col(SUBJECT_ID).categories.length;
    if (!this.isCategorical(df)) {
      summaryDict['Min value'] = df.getCol(QS_RES_N).stats['min'];
      summaryDict['Max value'] = df.getCol(QS_RES_N).stats['max'];
    }
    return summaryDict;
  }

  private createQuestionCharts(question: string, isGrid?: boolean) {
    const df = this.createQuestionDf(question);
    this.openedQuestionsDfs[question] = df;
    const chart = this.isCategorical(df) ?
      isGrid ? this.createSplitByBarcharts(df, false, 'Never', true) :
        this.createSplitByBarcharts(df, true, 'Auto', true) :
      isGrid ? this.createLineChart(df, false, 'Never', 'None', 'med') :
        this.createLineChart(df, true, 'Auto', 'Med | Q1, Q3', '');
    return ui.div(chart, {style: {display: 'flex'}});
  }

  private createQuestionDf(question: string) {
    return this.questionsDf
      .groupBy(this.questionsDf.columns.names())
      .where({[QS_TEST]: `${question}`})
      .aggregate();
  }

  private createHistogram(questionDf: DG.DataFrame, showParameter: boolean, legend: string) {
    const histogram = DG.Viewer.fromType(DG.VIEWER.BAR_CHART, questionDf, {
      split: VISIT_NUM,
      barSortType: 'by category',
      barSortOrder: 'asc',
      stack: QS_RES,
      legendVisibility: legend,
      showValueAxis: showParameter,
      showValueAxisLine: showParameter,
      showValueSelector: showParameter,
      showCategoryValues: showParameter,
      showCategorySelector: showParameter,
      showStackSelector: showParameter,
    }).root;
    if (!showParameter)
      this.applyCellSizeToGraph(histogram);

    return histogram;
  }

  private createLineChart(questionDf: DG.DataFrame, showParameter: boolean, legend: string,
    whiskers: string, aggr: string) {
    const linechart = DG.Viewer.fromType(DG.VIEWER.LINE_CHART, questionDf, {
      splitColumnName: this.selectedSplitBy,
      xColumnName: VISIT_NUM,
      yColumnNames: [QS_RES_N],
      whiskersType: whiskers,
      aggrType: aggr,
      markerSize: 1,
      legendVisibility: legend,
      showXAxis: showParameter,
      showYAxis: showParameter,
      showXSelector: showParameter,
      showYSelectors: showParameter,
      showAggrSelectors: showParameter,
      showSplitSelector: showParameter,
    });
    if (!showParameter)
      this.applyCellSizeToGraph(linechart.root);

    return linechart.root;
  }

  private createBoxPlot(questionDf: DG.DataFrame) {
    const boxplot = DG.Viewer.fromType(DG.VIEWER.BOX_PLOT, questionDf, {
      category: this.selectedSplitBy,
      value: QS_RES_N,
      labelOrientation: 'Horz',
      markerColor: this.selectedSplitBy,
      showCategorySelector: false,
      showValueSelector: false,
    }).root;
    return boxplot;
  }

  private createBoxPlotsByStudyNum(questionDf: DG.DataFrame, acc: DG.Accordion) {
    const splittedDf = questionDf.groupBy([VISIT_NUM]).getGroups();
    Object.keys(splittedDf).forEach((visit) => {
      const divWithVisit = ui.divV([
        this.createBoxPlot(splittedDf[visit]),
        ui.divText(`${visit}`),
      ]);
      acc.addPane(visit, () => divWithVisit);
    });
  }


  private isCategorical(df: DG.DataFrame) {
    return df.col(QS_RES_N).isNone(0);
  }

  private applyCellSizeToGraph(graph: HTMLElement) {
    graph.style.height = `${this.graphCellHeight}px`;
    graph.style.width = `${this.graphCellWidth}px`;
  }

  private createSplitByBarcharts(df: DG.DataFrame, showParameter: boolean, legend: string,
    horizontal: boolean, acc?: DG.Accordion) {
    const style = {style: {width: '100%', height: '100%'}};
    const splittedDiv = horizontal ? ui.splitH([], style) : ui.splitV([], style);
    const splittedDf = df.groupBy([this.selectedSplitBy]).getGroups();
    Object.keys(splittedDf).forEach((cat) => {
      const divWithCategory = showParameter ? ui.divV([
        this.createHistogram(splittedDf[cat], showParameter, legend),
        ui.divText(`${cat}`),
      ]) : this.createHistogram(splittedDf[cat], showParameter, legend);
      splittedDiv.append(divWithCategory);
    });
    return splittedDiv;
  }

  private setPropertyPanel() {
    const propPanel = async () => {
      grok.shell.o = await this.propertyPanel();
    };
    propPanel();
  }


  override async propertyPanel() {
    const acc = this.createAccWithTitle(this.name);

    acc.addPane('Summary', () => ui.tableFromMap(this.getQuestionSummary(this.selectedQuestionDf)), true);

    const createChartsPane = () => {
      const chartsAcc = ui.accordion();
      if (!this.isCategorical(this.selectedQuestionDf)) {
        chartsAcc.addPane('Linechart', () =>
          this.createLineChart(this.selectedQuestionDf, true, 'Auto', 'Med | Q1, Q3', ''));
        this.createBoxPlotsByStudyNum(this.selectedQuestionDf, chartsAcc);
      } else
        this.createSplitByBarcharts(this.selectedQuestionDf, true, 'Auto', false);

      return chartsAcc.root;
    };

    acc.addPane('Charts', () => createChartsPane(), true);

    return acc.root;
  }
}
