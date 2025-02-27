import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {ClinRow, studies} from '../clinical-study';
import {createBaselineEndpointDataframe, createHysLawDataframe,
  createLabValuesByVisitDataframe} from '../data-preparation/data-preparation';
import {ALT, BILIRUBIN} from '../constants/constants';
import {createBaselineEndpointScatterPlot, createHysLawScatterPlot} from '../custom-scatter-plots/custom-scatter-plots';
import {updateDivInnerHTML} from '../utils/utils';
import {_package} from '../package';
import {getUniqueValues} from '../data-preparation/utils';
import {LAB_HI_LIM_N, LAB_LO_LIM_N, LAB_TEST, VISIT_DAY, VISIT_NAME,
  SUBJECT_ID, LAB_RES_N} from '../constants/columns-constants';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {checkColumnsAndCreateViewer} from '../utils/views-validation-utils';

export class LaboratoryView extends ClinicalCaseViewBase {
  hysLawDiv = ui.box();
  baselineEndpointDiv = ui.box();
  distributionDiv = ui.box();
  uniqueLabValues: any;
  uniqueVisits: any;
  uniqueTreatmentArms: any;
  selectedALT = '';
  selectedAST = '';
  selectedBLN = '';
  selectedLabBlEp = '';
  selectedBl = '';
  selectedEp = '';
  selectedLabDistr = '';
  selectedArm = '';
  hysLawScatterPlot: DG.ScatterPlotViewer;
  baselineEndpointPlot: DG.ScatterPlotViewer;
  distributionPlot: DG.Viewer;
  dm: DG.DataFrame;
  lb: DG.DataFrame;
  selectedTab: string;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/laboratory.md`;
  }

  createView(): void {
    this.lb = studies[this.studyId].domains.lb.clone();
    if (studies[this.studyId].domains.dm)
      this.dm = studies[this.studyId].domains.dm.clone();


    this.uniqueLabValues = this.lb.col(LAB_TEST) ? Array.from(getUniqueValues(this.lb, LAB_TEST)) : [];
    this.uniqueVisits = this.lb.col(VISIT_NAME) ? Array.from(getUniqueValues(this.lb, VISIT_NAME)) : [];
    this.uniqueTreatmentArms = this.dm && this.dm.col(VIEWS_CONFIG[this.name][TRT_ARM_FIELD]) ?
      Array.from(getUniqueValues(this.dm, VIEWS_CONFIG[this.name][TRT_ARM_FIELD])) : [];
    this.selectedLabBlEp = this.uniqueLabValues.length ? this.uniqueLabValues[0] : null;
    this.selectedBl = this.uniqueVisits.length ? this.uniqueVisits[0] : null;
    this.selectedEp = this.uniqueVisits.length ? this.uniqueVisits[1] : null;
    this.selectedLabDistr = this.uniqueLabValues.length ? this.uniqueLabValues[0] : null;
    this.selectedArm = this.uniqueTreatmentArms.length ? this.uniqueTreatmentArms[0] : null;

    const grid = this.lb.plot.grid();
    this.lb.onCurrentRowChanged.subscribe((_) => {
      grok.shell.o = new ClinRow(this.lb.currentRow);
    });

    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, this.lb,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }

    this.root.className = 'grok-view ui-box';

    const tabControl = ui.tabControl(null, false);

    const hysLawGuide = ui.info('Please select values for ALT/AST and Bilirubin in a context panel', '', false);

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.lb,
      [SUBJECT_ID, LAB_RES_N, LAB_HI_LIM_N, LAB_TEST],
      this.hysLawDiv, () => {
        updateDivInnerHTML(this.hysLawDiv, hysLawGuide);
      },
      'Hy\'s Law');

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.lb,
      [SUBJECT_ID, LAB_TEST, LAB_RES_N, VISIT_NAME, LAB_LO_LIM_N, LAB_HI_LIM_N],
      this.baselineEndpointDiv, () => {
        this.updateBaselineEndpointPlot();
      },
      'Baseline endpoint');

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.lb,
      [SUBJECT_ID, LAB_TEST, LAB_RES_N, VISIT_DAY],
      this.distributionDiv, () => {
        this.updateDistributionPlot();
      },
      'Laboratory distribution');

    tabControl.addPane('Hy\'s law', () => this.hysLawDiv);

    tabControl.addPane('Baseline endpoint', () => this.baselineEndpointDiv);

    tabControl.addPane('Laboratory distribution', () => this.distributionDiv);

    tabControl.addPane('Results', () => grid.root);

    this.root.appendChild(
      tabControl.root,
    );
  }

  updateHysLawScatterPlot() {
    if (this.selectedALT && this.selectedAST && this.selectedBLN) {
      this.createHysLawScatterPlot();
      updateDivInnerHTML(this.hysLawDiv, this.hysLawScatterPlot.root);
    }
  }

  private createHysLawScatterPlot() {
    const hysLawDataframe = createHysLawDataframe(this.lb, this.dm, this.selectedALT,
      this.selectedAST, this.selectedBLN, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, hysLawDataframe,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
    this.hysLawScatterPlot = createHysLawScatterPlot(hysLawDataframe, ALT,
      BILIRUBIN, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
  }

  updateBaselineEndpointPlot() {
    const visitCol = VISIT_NAME;
    const blNumCol = `${this.selectedLabBlEp}_BL`;
    const epNumCol = `${this.selectedLabBlEp}_EP`;
    const baselineEndpointDataframe = createBaselineEndpointDataframe(this.lb, this.dm,
      [VIEWS_CONFIG[this.name][TRT_ARM_FIELD]], LAB_TEST, LAB_RES_N,
      [LAB_LO_LIM_N, LAB_HI_LIM_N], this.selectedLabBlEp, this.selectedBl,
      this.selectedEp, visitCol, blNumCol, epNumCol);
    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, baselineEndpointDataframe,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
    if (!baselineEndpointDataframe.rowCount) {
      updateDivInnerHTML(this.baselineEndpointDiv,
        ui.info(`No data found for ${this.selectedLabBlEp} and selected visits`));
      return;
    }
    this.baselineEndpointPlot = createBaselineEndpointScatterPlot(baselineEndpointDataframe, blNumCol,
      epNumCol, VIEWS_CONFIG[this.name][TRT_ARM_FIELD],
      baselineEndpointDataframe.get(LAB_LO_LIM_N, 0), baselineEndpointDataframe.get(LAB_HI_LIM_N, 0));
    updateDivInnerHTML(this.baselineEndpointDiv, this.baselineEndpointPlot.root);
  }

  updateDistributionPlot() {
    const labValue = this.selectedLabDistr;
    const labValueNumColumn = `${labValue} values`;
    const disributionDataframe = createLabValuesByVisitDataframe(this.lb, this.dm, labValue,
      VIEWS_CONFIG[this.name][TRT_ARM_FIELD], this.selectedArm, labValueNumColumn, VISIT_DAY);
    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, disributionDataframe,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
    this.distributionPlot = DG.Viewer.boxPlot(disributionDataframe, {
      categoryColumnNames: [VISIT_DAY],
      value: labValueNumColumn,
    });
    this.distributionPlot.setOptions({category: VISIT_DAY});
    updateDivInnerHTML(this.distributionDiv, this.distributionPlot.root);
  }

  override async propertyPanel() {
    const panelDiv = ui.div();
    const acclab = this.createAccWithTitle(this.name);

    const altChoices = ui.input.choice('ALT', {value: this.selectedALT, items: this.uniqueLabValues});
    altChoices.onChanged.subscribe((value) => {
      this.selectedALT = value;
      this.updateHysLawScatterPlot();
    });
    //@ts-ignore
    altChoices.input.style.width = '150px';

    const astChoices = ui.input.choice('AST', {value: this.selectedAST, items: this.uniqueLabValues});
    astChoices.onChanged.subscribe((value) => {
      this.selectedAST = value;
      this.updateHysLawScatterPlot();
    });
    //@ts-ignore
    astChoices.input.style.width = '150px';

    const blnChoices = ui.input.choice('BLN', {value: this.selectedBLN, items: this.uniqueLabValues});
    blnChoices.onChanged.subscribe((value) => {
      this.selectedBLN = value;
      this.updateHysLawScatterPlot();
    });
    //@ts-ignore
    blnChoices.input.style.width = '150px';
    acclab.addPane('Hy\'s law', () => ui.divV([altChoices.root, astChoices.root, blnChoices.root]), true);

    const labValueChoices = ui.input.choice('Value', {value: this.selectedLabBlEp, items: this.uniqueLabValues});
    const blVisitChoices = ui.input.choice('BL', {value: this.selectedBl, items: this.uniqueVisits});
    const epVisitChoices = ui.input.choice('EP', {value: this.selectedEp, items: this.uniqueVisits});
    labValueChoices.onChanged.subscribe((value) => {
      this.selectedLabBlEp = value;
      this.updateBaselineEndpointPlot();
    });
    blVisitChoices.onChanged.subscribe((value) => {
      this.selectedBl = value;
      this.updateBaselineEndpointPlot();
    });
    epVisitChoices.onChanged.subscribe((value) => {
      this.selectedEp = value;
      this.updateBaselineEndpointPlot();
    });
    //@ts-ignore
    labValueChoices.input.style.width = '150px';
    acclab.addPane('Baseline endpoint',
      () => ui.divV([labValueChoices.root, blVisitChoices.root, epVisitChoices.root]), true);


    const distrChoices = ui.input.choice('Value', {value: this.selectedLabDistr, items: this.uniqueLabValues});
    const treatmentArmsChoices = ui.input.choice('Treatment arm',
      {value: this.selectedArm, items: this.uniqueTreatmentArms});
    distrChoices.onChanged.subscribe((value) => {
      this.selectedLabDistr = value;
      this.updateDistributionPlot();
    });
    treatmentArmsChoices.onChanged.subscribe((value) => {
      this.selectedArm = value;
      this.updateDistributionPlot();
    });
    //@ts-ignore
    distrChoices.input.style.width = '150px';
    acclab.addPane('Laboratory distribution', () => ui.divV([distrChoices.root, treatmentArmsChoices.root]), true);
    panelDiv.append(acclab.root);
    return panelDiv;
  }
}
