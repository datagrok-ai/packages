import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {createAERiskAssessmentDataframe} from '../data-preparation/data-preparation';
import {updateDivInnerHTML} from '../utils/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {AE_PERCENT, NEG_LOG10_P_VALUE, RISK_DIFFERENCE, SE_RD_WITH_SIGN_LEVEL} from '../constants/constants';
import {AE_TERM_FIELD, TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {SUBJECT_ID} from '../constants/columns-constants';
import {studies} from '../clinical-study';

export class AERiskAssessmentView extends ClinicalCaseViewBase {
  aeDf: DG.DataFrame;
  riskAssessmentDfPopPanelDiv = ui.div();
  riskAssessmentDataframe: DG.DataFrame;
  volcanoPlotXAxis = '';
  volcanoPlotYAxis = NEG_LOG10_P_VALUE;
  volcanoPlotMarkerSize = '';
  placeboArm: string[];
  activeArm: string[];
  treatmentArmOptions: string[];
  riskAssessmentDiv = ui.box(null, {style: {width: '100%'}});
  initialGuide: any;
  sizeOptions = {'AE percent': AE_PERCENT};
  volcanoPlot: any;
  pValueLimit = 0.05;
  incorrectTreatmentArms = false;


  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
  }

  createView(): void {
    this.aeDf = studies[this.studyId].domains.ae.clone();
    this.activeArm = [];
    this.placeboArm = [];
    this.volcanoPlotXAxis = RISK_DIFFERENCE;
    this.volcanoPlotMarkerSize = Object.values(this.sizeOptions)[0];
    this.treatmentArmOptions = studies[this.studyId].domains.dm.col(VIEWS_CONFIG[this.name][TRT_ARM_FIELD]).categories;
    this.initialGuide = ui.info('Please select values for treatment/placebo arms in a context panel', '', false);
    updateDivInnerHTML(this.riskAssessmentDiv, this.initialGuide);
    this.root.append(this.riskAssessmentDiv);
    grok.data.linkTables(studies[this.studyId].domains.dm, this.aeDf,
      [SUBJECT_ID], [SUBJECT_ID],
      [DG.SYNC_TYPE.FILTER_TO_FILTER]);
  }

  updateGlobalFilter(): void {
    this.updateRiskAssessmentDataframe();
    this.updateVolcanoPlot();
  }

  createVolcanoPlotDiv() {
    if (this.placeboArm.length && this.activeArm.length && !this.incorrectTreatmentArms) {
      this.updateRiskAssessmentDataframe();
      this.updateVolcanoPlot();
    } else {
      this.riskAssessmentDataframe = null;
      updateDivInnerHTML(this.riskAssessmentDiv, this.initialGuide);
    }
  }

  updateRiskAssessmentDataframe() {
    this.riskAssessmentDataframe = createAERiskAssessmentDataframe(this.aeDf.clone(this.aeDf.filter),
      studies[this.studyId].domains.dm.clone(), VIEWS_CONFIG[this.name][TRT_ARM_FIELD],
      VIEWS_CONFIG[this.name][AE_TERM_FIELD], this.placeboArm, this.activeArm, this.pValueLimit);
    this.riskAssessmentDataframe
      .col(this.volcanoPlotXAxis).meta.colors.setConditional({'-100-0': '#0000FF', '0-100': '#FF0000'});
    this.updateRiskAssessmentDfOnPropPanel();
  }

  updateVolcanoPlot() {
    this.volcanoPlot = this.riskAssessmentDataframe.plot.scatter({
      x: this.volcanoPlotXAxis,
      y: this.volcanoPlotYAxis,
      color: this.volcanoPlotXAxis,
      showViewerFormulaLines: true,
      size: this.volcanoPlotMarkerSize,
      rowTooltip: `${VIEWS_CONFIG[this.name][AE_TERM_FIELD]}_ACTIVE\n${RISK_DIFFERENCE}\n${NEG_LOG10_P_VALUE}\n${AE_PERCENT}`,
    });

    const lines: DG.FormulaLine[] = [];

    for (let i = 0; i < this.riskAssessmentDataframe.rowCount; i++)
      this.confIntFormulaLine(i, lines);


    this.volcanoPlot.meta.formulaLines.addAll(lines);

    this.volcanoPlot.meta.formulaLines.addLine({
      formula: `\${${this.volcanoPlotYAxis}} = ${-Math.log10(this.pValueLimit)}`,
      color: '#00ff00',
      width: 0.5,
      showOnPlot: false,
    });

    this.volcanoPlot.meta.formulaLines.addLine({
      formula: `\${${this.volcanoPlotXAxis}} = 0`,
      color: '#00ff00',
      width: 0.5,
      showOnPlot: false,
    });

    updateDivInnerHTML(this.riskAssessmentDiv, ui.splitV([this.volcanoPlot.root]));
  }

  updateRiskAssessmentDfOnPropPanel() {
    updateDivInnerHTML(this.riskAssessmentDfPopPanelDiv,
      this.riskAssessmentDataframe ? this.riskAssessmentDataframe.plot.grid().root : '');
  }

  override async propertyPanel() {
    const acc = this.createAccWithTitle(this.name);

    const treatmentArmPane = (arm, armToCheck, name) => {
      acc.addPane(name, () => {
        //@ts-ignore
        const armChoices = ui.input.multiChoice('', {value: this[arm], items: this.treatmentArmOptions});
        armChoices.onChanged.subscribe((value) => {
          if (this[armToCheck].filter((it) => value.includes(it)).length) {
            grok.shell.error(`Some products are selected for both treatment arms.
              One product can be selected only for one treatment arm.`);
            this.incorrectTreatmentArms = true;
          } else {
            this.incorrectTreatmentArms = false; ;
          }
          this[arm] = value;
          this.createVolcanoPlotDiv();
        });
        return armChoices.root;
      });
    };

    treatmentArmPane('placeboArm', 'activeArm', `Placebo arm`);
    treatmentArmPane('activeArm', 'placeboArm', `Active arm`);

    acc.addPane(`AE risk dataframe`, () => {
      return this.riskAssessmentDfPopPanelDiv;
    });

    acc.addPane('Parameters', () => {
      const pValue = ui.input.string('Significance level', {value: this.pValueLimit.toString()});
      pValue.onChanged.subscribe((value) => {
        this.pValueLimit = parseFloat(value);
        if (!isNaN(this.pValueLimit)) {
          this.updateRiskAssessmentDataframe();
          this.updateVolcanoPlot();
        }
      });
      const sizeChoices = ui.input.choice('Marker size', {value: Object.keys(this.sizeOptions)[0],
        items: Object.keys(this.sizeOptions)});
      sizeChoices.onChanged.subscribe((value) => {
        this.volcanoPlotMarkerSize = this.sizeOptions[value];
        this.volcanoPlot.setOptions({size: this.volcanoPlotMarkerSize});
      });
      return ui.inputs([
        sizeChoices,
        pValue,
      ]);
    });
    return acc.root;
  }

  private confIntFormulaLine(i: number, lines: DG.FormulaLine[]) {
    const yCenter = this.riskAssessmentDataframe.get(this.volcanoPlotYAxis, i);
    const xCenter = this.riskAssessmentDataframe.get(this.volcanoPlotXAxis, i);
    const confInt = this.riskAssessmentDataframe.get(SE_RD_WITH_SIGN_LEVEL, i);
    const xMin = xCenter - confInt / 2;
    const xMax = xCenter + confInt / 2;
    const color = xCenter > 0 ? '#ff0000' : '#0000ff';
    this.setConfIntLineOptions(lines, `\${${this.volcanoPlotYAxis}} = ${yCenter}+\${${this.volcanoPlotXAxis}}*0`,
      color, 0.5, xMax, xMin);
    // this.setConfIntLineOptions(lines, `\${${this.volcanoPlotXAxis}} = ${xMin}+\${${this.volcanoPlotYAxis}}*0`, color, 0.5, yCenter + 0.01, yCenter - 0.01);
    // this.setConfIntLineOptions(lines, `\${${this.volcanoPlotXAxis}} = ${xMax}+\${${this.volcanoPlotYAxis}}*0`, color, 0.5, yCenter + 0.01, yCenter - 0.01);
  }

  private setConfIntLineOptions(lines: DG.FormulaLine[], formula: string,
    color: string, width: number, max: number, min: number) {
    const line: DG.FormulaLine = {type: 'line', formula: formula, color: color,
      width: width, min: min, max: max, showOnPlot: false};
    lines.push(line);
  }
}
