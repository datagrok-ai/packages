import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {addDataFromDmDomain, createPivotedDataframeAvg,
  getUniqueValues, getVisitNamesAndDays} from '../data-preparation/utils';
import {ETHNIC, LAB_RES_N, LAB_TEST, VISIT_DAY, VISIT_NAME, RACE, SEX,
  SUBJECT_ID, VS_TEST, VS_RES_N} from '../constants/columns-constants';
import {dynamicComparedToBaseline} from '../data-preparation/data-preparation';
import {updateDivInnerHTML} from '../utils/utils';
import {_package} from '../package';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {TIME_PROFILE_VIEW_NAME} from '../constants/view-names-constants';
import {studies} from '../clinical-study';


export class TimeProfileView extends ClinicalCaseViewBase {
  blVisitChoices: DG.InputBase;
  epVisitChoices: DG.InputBase;
  labChoices: DG.InputBase;
  blVisitDiv = ui.div();
  epVisitDiv = ui.div();
  labChoicesDiv = ui.div();
  laboratoryDataFrame: DG.DataFrame;
  relativeChangeFromBlDataFrame: DG.DataFrame;
  uniqueLabValues: any;
  uniqueVisits: any;
  splitBy: any;
  types = ['Values', 'Changes'];
  domains = ['vs', 'lb'];
  domainFields = {'lb': {'test': LAB_TEST, 'res': LAB_RES_N}, 'vs': {'test': VS_TEST, 'res': VS_RES_N}};
  selectedLabValue: string;
  selectedType: string;
  bl: string;
  ep: string;
  visitNamesAndDays: any [];
  linechart: any;
  selectedDomain: string;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/time_profile.md`;
  }

  createView(): void {
    this.splitBy = [VIEWS_CONFIG[TIME_PROFILE_VIEW_NAME][TRT_ARM_FIELD], SEX, RACE, ETHNIC]
      .filter((it) => studies[this.studyId].domains.dm &&
      studies[this.studyId].domains.dm.columns.names().includes(it));
    this.domains = this.domains.filter((it) =>
      studies[this.studyId].domains[it] !== null && !this.optDomainsWithMissingCols.includes(it));
    this.selectedDomain = this.domains[0];
    this.uniqueLabValues = Array.from(getUniqueValues(studies[this.studyId].domains[this.selectedDomain],
      this.domainFields[this.selectedDomain]['test']));
    this.uniqueVisits = Array.from(getUniqueValues(studies[this.studyId].domains[this.selectedDomain], VISIT_NAME));
    this.selectedLabValue = this.uniqueLabValues[0] as string;
    this.selectedType = this.types[0];
    this.visitNamesAndDays = getVisitNamesAndDays(studies[this.studyId].domains[this.selectedDomain],
      VISIT_NAME, VISIT_DAY);
    this.bl = this.visitNamesAndDays[0].name;
    this.ep = this.visitNamesAndDays[this.visitNamesAndDays.length-1].name;
    this.createLaboratoryDataframe();

    const domainChoices = ui.input.choice('', {value: this.selectedDomain, items: this.domains});
    domainChoices.onChanged.subscribe((value) => {
      this.selectedDomain = value;
      this.uniqueLabValues = Array.from(getUniqueValues(studies[this.studyId].domains[this.selectedDomain],
        this.domainFields[this.selectedDomain]['test']));
      this.uniqueVisits = Array.from(getUniqueValues(studies[this.studyId].domains[this.selectedDomain], VISIT_NAME));
      this.selectedLabValue = this.uniqueLabValues[0] as string;
      this.visitNamesAndDays = getVisitNamesAndDays(studies[this.studyId].domains[this.selectedDomain],
        VISIT_NAME, VISIT_DAY);
      if (this.visitNamesAndDays.findIndex((it) => it.name === this.bl) === -1)
        this.bl = this.visitNamesAndDays[0].name;

      if (this.visitNamesAndDays.findIndex((it) => it.name === this.ep) === -1)
        this.ep = this.visitNamesAndDays[this.visitNamesAndDays.length-1].name;

      this.createDropdownLists();
      this.updateTimeProfile();
    });

    const typeChoices = ui.input.choice('', {value: this.selectedType, items: this.types});
    typeChoices.onChanged.subscribe((value) => {
      this.selectedType = value;
      this.updateTimeProfile();
    });

    this.createDropdownLists();

    this.root.className = 'grok-view ui-box';
    this.linechart = DG.Viewer.lineChart(this.laboratoryDataFrame, {
      splitColumnName: this.splitBy.length ? this.splitBy[0] : '',
      xColumnName: VISIT_DAY,
      yColumnNames: [`${this.selectedLabValue} avg(${this.domainFields[this.selectedDomain]['res']})`],
      whiskersType: 'Med | Q1, Q3',
    });
    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, this.linechart.dataFrame,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }

    this.root.append(this.linechart.root);
    this.setRibbonPanels([
      [
        ui.span(['Plot ']),
        domainChoices.root,
        this.labChoicesDiv,
        typeChoices.root,
        ui.span([' from ']),
        this.blVisitDiv,
        ui.span([' to ']),
        this.epVisitDiv,
      ],
    ]);
  }

  private updateTimeProfile() {
    switch (this.selectedType) {
    case 'Values': {
      this.createLaboratoryDataframe();
      this.linechart.dataFrame = this.laboratoryDataFrame;
      this.linechart.setOptions({
        yColumnNames: [`${this.selectedLabValue} avg(${this.domainFields[this.selectedDomain]['res']})`],
      });
      break;
    }
    case 'Changes': {
      this.createrelativeChangeFromBlDataframe();
      this.linechart.dataFrame = this.relativeChangeFromBlDataFrame;
      this.linechart.setOptions({
        yColumnNames: [`${this.selectedLabValue} avg(${this.domainFields[this.selectedDomain]['res']})`],
      });
      break;
    }
    default: {
      break;
    }
    }
    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, this.linechart.dataFrame,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
  }

  private createDropdownLists() {
    this.createValuesChoices();
    this.createBlChoices();
    this.createEpChoices();
  }

  private createValuesChoices() {
    this.labChoices = ui.input.choice('', {value: this.selectedLabValue, items: this.uniqueLabValues});
    this.labChoices.onChanged.subscribe((value) => {
      this.selectedLabValue = value;
      this.updateTimeProfile();
    });
    //@ts-ignore
    this.labChoices.input.style.width = '150px';
    updateDivInnerHTML(this.labChoicesDiv, this.labChoices.root);
  }

  private createBlChoices() {
    this.blVisitChoices = ui.input.choice('', {value: this.bl, items: this.uniqueVisits});
    this.blVisitChoices.onChanged.subscribe((value) => {
      this.bl = value;
      this.updateTimeProfile();
    });
    //@ts-ignore
    this.blVisitChoices.input.style.width = '150px';
    updateDivInnerHTML(this.blVisitDiv, this.blVisitChoices.root);
  }

  private createEpChoices() {
    this.epVisitChoices = ui.input.choice('', {value: this.ep, items: this.uniqueVisits});
    this.epVisitChoices.onChanged.subscribe((value) => {
      this.ep = value;
      this.updateTimeProfile();
    });
    //@ts-ignore
    this.epVisitChoices.input.style.width = '150px';
    updateDivInnerHTML(this.epVisitDiv, this.epVisitChoices.root);
  }

  private createLaboratoryDataframe() {
    let df = this.filterDataFrameByDays(studies[this.studyId].domains[this.selectedDomain].clone());
    if (this.splitBy.length) {
      df = addDataFromDmDomain(df, studies[this.studyId].domains.dm,
        [SUBJECT_ID, VISIT_DAY, VISIT_NAME].concat(Object.values(this.domainFields[this.selectedDomain])),
        this.splitBy);
    }

    this.laboratoryDataFrame = createPivotedDataframeAvg(df, [SUBJECT_ID, VISIT_DAY],
      this.domainFields[this.selectedDomain]['test'], this.domainFields[this.selectedDomain]['res'], this.splitBy);
  }

  private createrelativeChangeFromBlDataframe() {
    let df = this.filterDataFrameByDays(studies[this.studyId].domains[this.selectedDomain].clone());
    dynamicComparedToBaseline(df, this.domainFields[this.selectedDomain]['test'],
      this.domainFields[this.selectedDomain]['res'], this.bl, VISIT_NAME, 'LAB_DYNAMIC_BL', true);
    if (this.splitBy.length) {
      df = addDataFromDmDomain(df, studies[this.studyId].domains.dm, [SUBJECT_ID, VISIT_DAY, VISIT_NAME,
        this.domainFields[this.selectedDomain]['test'], this.domainFields[this.selectedDomain]['res']], this.splitBy);
    }

    this.relativeChangeFromBlDataFrame = createPivotedDataframeAvg(df, [SUBJECT_ID, VISIT_DAY],
      this.domainFields[this.selectedDomain]['test'], this.domainFields[this.selectedDomain]['res'], this.splitBy);
  }


  private filterDataFrameByDays(df: DG.DataFrame) {
    const blDay = this.visitNamesAndDays.find((it) => it.name === this.bl).day;
    const epDay = this.visitNamesAndDays.find((it) => it.name === this.ep).day;
    const filteredDf = df.groupBy(df.columns.names())
      .where(`${VISIT_DAY} >= ${blDay} and ${VISIT_DAY} <= ${epDay} and ${this.domainFields[this.selectedDomain]['test']} = ${this.selectedLabValue}`)
      .aggregate();
    return filteredDf;
  }
}
