import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {cumulativeEnrollemntByDay} from '../data-preparation/data-preparation';
import {CLINICAL_TRIAL_GOV_FIELDS} from '../constants/constants';
import {CLIN_TRIAL_GOV_SEARCH, HttpService} from '../services/http.service';
import {_package} from '../package';
import {AGE, RACE, SEX, SUBJECT_ID, SUBJ_REF_STDT} from '../constants/columns-constants';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import $ from 'cash-dom';
import {checkDateFormat} from '../data-preparation/utils';
import {updateDivInnerHTML} from '../utils/utils';
import {TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {checkColumnsAndCreateViewer} from '../utils/views-validation-utils';
import {studies} from '../clinical-study';


export class StudySummaryView extends ClinicalCaseViewBase {
  validationView: DG.ViewBase;
  errorsByDomain: any;
  errorsByDomainWithLinks: any;
  studyId: string;
  httpService = new HttpService();
  enrollmentChart = ui.box();
  armChart = ui.box();
  sexChart = ui.box();
  raceChart = ui.box();
  ageChart = ui.box();
  viewerTitle = {
    style: {
      'color': 'var(--grey-6)',
      'margin': '12px 0px 6px 12px',
      'font-size': '16px',
    },
  };
  test: any;
  validationErrorLinkHandler;

  constructor(name: string, studyId: string, errorLinkHandler?: () => void) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/summary.md`;
    this.path = '/summary';
    if (errorLinkHandler)
      this.validationErrorLinkHandler = errorLinkHandler;
  }

  createView() {
    this.errorsByDomain = studies[this.studyId].errorsByDomain;
    this.errorsByDomainWithLinks = this.createErrorsMapWithLinks();
    this.buildView();
  }

  async buildView() {
    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [SUBJ_REF_STDT],
      this.enrollmentChart,
      async () => {await this.createCumulativeEnrollmentChart(this.viewerTitle);},
      'Cumulative enrollment');

    const summary = ui.tableFromMap({
      'subjects': studies[this.studyId].subjectsCount,
      'sites': studies[this.studyId].sitesCount,
    });


    const errorsSummary = this.errorsByDomainWithLinks ?
      ui.tableFromMap(this.errorsByDomainWithLinks) :
      ui.divText('No errors found', {style: {marginTop: '8px', marginLeft: '5px'}});

    const summaryStyle = {
      style: {
        'color': 'var(--grey-6)',
        'margin-top': '8px',
        'margin-left': '5px',
        'font-size': '16px',
      },
    };

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [VIEWS_CONFIG[this.name][TRT_ARM_FIELD]],
      this.armChart, () => {
        const arm = DG.Viewer.barChart(studies[this.studyId].domains.dm,
          {split: VIEWS_CONFIG[this.name][TRT_ARM_FIELD], //@ts-ignore
            style: 'dashboard', barColor: DG.Color.lightBlue});
        arm.root.prepend(ui.divText('Treatment arm', this.viewerTitle));
        updateDivInnerHTML(this.armChart, arm.root);
      },
      'Treatment arm');

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [SEX],
      this.sexChart, () => {//@ts-ignore
        const sex = DG.Viewer.barChart(studies[this.studyId].domains.dm, {split: SEX, style: 'dashboard'});
        sex.root.prepend(ui.divText('Sex', this.viewerTitle));
        updateDivInnerHTML(this.sexChart, sex.root);
      },
      'Sex');

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [RACE],
      this.raceChart, () => {//@ts-ignore
        const race = DG.Viewer.barChart(studies[this.studyId].domains.dm, {split: RACE, style: 'dashboard'});
        race.root.prepend(ui.divText('Race', this.viewerTitle));
        updateDivInnerHTML(this.raceChart, race.root);
      },
      'Race');

    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [AGE],
      this.ageChart, () => { //@ts-ignore
        const age = DG.Viewer.histogram(studies[this.studyId].domains.dm, {value: AGE, style: 'dashboard'});
        age.root.prepend(ui.divText('Age', this.viewerTitle));
        updateDivInnerHTML(this.ageChart, age.root);
      },
      'Age');

    this.root.className = 'grok-view ui-box';
    this.root.append(ui.splitV([
      ui.splitH([
        ui.panel([
          ui.divText(`${this.studyId} summary`, summaryStyle),
          summary,
        ]),
        ui.panel([
          ui.divText('Errors', summaryStyle),
          errorsSummary,
        ]),
      ], {style: {maxHeight: '105px'}}),
      this.enrollmentChart,
      ui.splitH([
        this.armChart,
        this.sexChart,
        this.raceChart,
        this.ageChart,
      ]),
    ]));
  }

  private async createCumulativeEnrollmentChart(viewerTitle: any) {
    const dateCol = SUBJ_REF_STDT;
    const cumulativeCol = 'CUMULATIVE_ENROLLMENT';
    const incorrectDates = checkDateFormat(studies[this.studyId].domains.dm.getCol(dateCol),
      studies[this.studyId].domains.dm.rowCount);
    if (incorrectDates.length) {
      const subjArray = incorrectDates.map((it) => studies[this.studyId].domains.dm.get(SUBJECT_ID, it));
      const formatErrorMessage = ui.info(`Subjects #${subjArray.join(',')} have incorrect format of ${SUBJ_REF_STDT}`);
      updateDivInnerHTML(this.enrollmentChart, formatErrorMessage);
    } else {
      const subjsPerDay =
        cumulativeEnrollemntByDay(studies[this.studyId].domains.dm
          .clone(studies[this.studyId].domains.dm.filter), dateCol, SUBJECT_ID, cumulativeCol);
      const refStartCol = subjsPerDay.col(dateCol);
      const lc = DG.Viewer.lineChart(subjsPerDay);
      lc.setOptions({x: `${dateCol}`, yColumnNames: [cumulativeCol]});
      if (refStartCol.type != DG.TYPE.DATE_TIME) {
        await subjsPerDay.columns.addNewCalculated(`~${dateCol}`, `Date(\${${dateCol}}, 1, 1)`);
        lc.setOptions({x: `~${dateCol}`, yColumnNames: [cumulativeCol]});
      } else
        lc.setOptions({x: `${dateCol}`, yColumnNames: [cumulativeCol]});

      updateDivInnerHTML(this.enrollmentChart, lc.root);
      lc.root.prepend(ui.divText('Enrollment by day', viewerTitle));
    }
  }

  private createErrorsMapWithLinks(): {[key: string]: HTMLAnchorElement} {
    const errorsByDomain = studies[this.studyId].errorsByDomain;
    if (errorsByDomain) {
      const errorsByDomainWithLinks: {[key: string]: HTMLAnchorElement} = {};
      Object.keys(errorsByDomain).forEach((domain) => {
        const link = ui.link(errorsByDomain[domain].toString(), {}, '', {id: domain});
        link.addEventListener('click', (event) => {
          if (this.validationErrorLinkHandler)
            this.validationErrorLinkHandler();
          else
            grok.shell.v = this.validationView;
          event.stopPropagation();
        });
        errorsByDomainWithLinks[domain] = link;
      });
      return errorsByDomainWithLinks;
    }
    return null;
  }

  override async propertyPanel() {
    const httpService = new HttpService();
    // const clinTrialsGovInfo: {[key: string]: string | HTMLAnchorElement} =
    //   await httpService.getStudyData('R01NS050536', Object.keys(CLINICAL_TRIAL_GOV_FIELDS));
    const clinTrialsGovInfo: {[key: string]: string | HTMLAnchorElement} =
      await httpService.getStudyData(this.studyId, Object.keys(CLINICAL_TRIAL_GOV_FIELDS));

    const acc = this.createAccWithTitle(this.studyId);

    if (clinTrialsGovInfo) {
      const studyLink = `${CLIN_TRIAL_GOV_SEARCH}${clinTrialsGovInfo[CLINICAL_TRIAL_GOV_FIELDS.NCTId]}`;
      clinTrialsGovInfo[`Study link`] = ui.link('Go to study page', () => {window.open(studyLink, '_blank').focus();});

      const acctable = ui.tableFromMap(clinTrialsGovInfo);
      acc.addPane('General', () => {
        $(acctable).find('tr').css('vertical-align', 'top');
        $(acctable).find('td').css('padding-bottom', '10px');
        $(acctable).find('.d4-entity-list>span').css('margin', '0px');
        return acctable;
      }, true);
    } else {
      acc.addPane('General', () => {
        return ui.divText('Study not found on clinicaltrials.gov');
      }, true);
    }
    return acc.root;
  }

  updateGlobalFilter(): void {
    checkColumnsAndCreateViewer(
      studies[this.studyId].domains.dm,
      [SUBJ_REF_STDT],
      this.enrollmentChart,
      async () => {await this.createCumulativeEnrollmentChart(this.viewerTitle);},
      'Cumulative enrollment');
  }
}
