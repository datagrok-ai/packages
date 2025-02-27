import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {AE_CAUSALITY, AE_REQ_HOSP, AE_SEQ, AE_SEVERITY, AGE, DEATH_DATE, RACE, SEX,
  SUBJECT_ID, SUBJ_REF_ENDT} from '../constants/columns-constants';
import {SURVIVAL_ANALYSIS_GUIDE} from '../constants/constants';
import {createSurvivalData} from '../data-preparation/data-preparation';
import {dataframeContentToRow} from '../data-preparation/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {_package} from '../package';
import {SURVIVAL_ANALYSIS_VIEW_NAME} from '../constants/view-names-constants';
import {AE_START_DAY_FIELD, TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {updateDivInnerHTML} from '../utils/utils';
import {studies} from '../clinical-study';

const MIN_STRATA_VAL_COUNT = 5;
export class SurvivalAnalysisView extends ClinicalCaseViewBase {
  tabControl: DG.TabControl;
  survivalPlotDiv = ui.box();
  covariatesPlotDiv = ui.box();
  survivalGridDivCreate = ui.box();
  survivalFilterDiv = ui.box(ui.divText('Create dataset',
    {style: {color: 'var(--grey-3)', marginTop: '30px', alignItems: 'center'}}));
  strataChoicesDiv = ui.div();
  plotCovariatesChoicesDiv = ui.div();
  parametersPanel = ui.div();
  strataChoices: DG.InputBase;
  plotCovariatesChoices: HTMLDivElement;
  endpointChoices: DG.InputBase;
  covariatesChoices: DG.InputBase;
  confIntChoices: DG.InputBase;
  createSurvivalDataframe: HTMLButtonElement;
  survivalColumns = [];
  confIntervals = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99];
  survivalOptions = [''];
  covariatesOptions: any;
  endpointOptions = {'RETAIN IN STUDY': SUBJ_REF_ENDT};
  confInterval = 0.7;
  strata = '';
  endpoint = '';
  covariates = [];
  survivalDataframe: DG.DataFrame;
  plotCovariates = [];
  filterChanged = false;
  colsRequiredForEndpoints: any;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/survival_analysis.md`;
  }

  createView(): void {
    this.colsRequiredForEndpoints = this.getColsRequiredForEndpoints();
    this.updateEndpointOptions();
    this.covariatesOptions = [AGE, SEX, RACE, VIEWS_CONFIG[SURVIVAL_ANALYSIS_VIEW_NAME][TRT_ARM_FIELD]]
      .filter((it) => studies[this.studyId].domains.dm.columns.names().includes(it));
    this.endpoint = Object.keys(this.endpointOptions)[0];
    this.endpointChoices = ui.input.choice('Endpoint',
      {value: Object.keys(this.endpointOptions)[0], items: Object.keys(this.endpointOptions)});
    this.endpointChoices.onChanged.subscribe((value) => {
      this.endpoint = value;
    });

    this.covariatesChoices = ui.input.multiChoice('Covariates', {value: null, items: this.covariatesOptions});
    this.covariatesChoices.onChanged.subscribe((value) => {
      this.covariates = value;
    });

    this.confIntChoices = ui.input.choice('Confidence', {value: this.confIntervals[0], items: this.confIntervals});
    this.confIntChoices.onChanged.subscribe((value) => {
      this.confInterval = value;
      this.updateSurvivalPlot();
    });

    this.updateStrataChoices();
    this.updatePlotCovariatesChoices();

    this.createSurvivalDataframe = ui.bigButton('Create dataset', () => {
      this.createDataset();
    });

    const guide = ui.info(SURVIVAL_ANALYSIS_GUIDE, 'Survival Analysis Quick Guide', false);

    this.tabControl = ui.tabControl(null, false);
    this.tabControl.addPane('Dataset', () =>
      ui.splitV([
        ui.splitH([
          ui.box(ui.div([
            ui.div([
              this.endpointChoices,
              this.covariatesChoices,
              ui.buttonsInput([this.createSurvivalDataframe]),
            ], {classes: 'ui-form'}),
          ]), {style: {maxWidth: '300px'}}),
          ui.splitV([this.survivalFilterDiv, this.survivalGridDivCreate]),
        ]),
      ]));

    this.tabControl.addPane('Survival Chart', () => ui.splitV([
      ui.splitH([
        ui.box(ui.panel([
          ui.div([
            this.confIntChoices,
            this.strataChoicesDiv,
          ], {classes: 'ui-form'}),
        ]), {style: {maxWidth: '300px'}}),
        this.survivalPlotDiv,
      ]),
    ]));
    this.tabControl.getPane('Survival Chart').header.addEventListener('click', () => {
      this.updateChartsAfterFiltering();
    });

    this.tabControl.addPane('Covariates', () => ui.splitV([
      ui.box(
        //@ts-ignore
        this.plotCovariatesChoicesDiv,
        {style: {maxHeight: '50px'}}),
      this.covariatesPlotDiv,
    ]));
    this.tabControl.getPane('Covariates').header.addEventListener('click', () => {
      this.updateChartsAfterFiltering();
    });
    this.root.className = 'grok-view ui-box';
    this.setRibbonPanels([
      [
        ui.icons.info(() => {
          updateDivInnerHTML(guide, ui.info(SURVIVAL_ANALYSIS_GUIDE, 'Survival Analysis Quick Guide', false));
        }),
      ],
    ]);

    this.root.append(ui.splitV([
      guide,
      this.tabControl.root,
    ]));
    //@ts-ignore
    guide.parentNode.style.flexGrow = '0';
    //@ts-ignore
    guide.parentNode.classList = 'ui-div';
  }

  updateGlobalFilter(): void {
    this.tabControl.currentPane = this.tabControl.getPane('Dataset');
    this.createDataset();
  }

  private createDataset() {
    this.refreshDataframe();
    this.survivalDataframe.onFilterChanged.subscribe((_) => {
      this.filterChanged = true;
    });
  }

  private updateEndpointOptions() {
    Object.keys(this.colsRequiredForEndpoints).forEach((key) => {
      let missingCols = false;
      const domains = Object.keys(this.colsRequiredForEndpoints[key]);
      domains.forEach((dom) => {
        this.colsRequiredForEndpoints[key][dom].map((it) => {
          if (!studies[this.studyId].domains[dom] || !studies[this.studyId].domains[dom].columns.names().includes(it))
            missingCols = true;
        });
        if (!missingCols) {
          const domain = Object.keys(this.colsRequiredForEndpoints[key])[0];
          this.endpointOptions[key] = this.colsRequiredForEndpoints[key][domain][0];
        }
      });
    });
  }

  private updateSurvivalPlot() {
    ui.setUpdateIndicator(this.survivalPlotDiv, true);
    const strataFilter = DG.BitSet.create(this.survivalDataframe.rowCount).setAll(true);
    if (this.strata) {
      const stratasCount = this.survivalDataframe.clone(this.survivalDataframe.filter)
        .groupBy([this.strata]).count('status').aggregate();
      const stratasToFilterOut = [];
      const stratasToAnalyse = [];
      for (let i = 0; i < stratasCount.rowCount; i++) {
        if (stratasCount.get('status', i) < MIN_STRATA_VAL_COUNT)
          stratasToFilterOut.push(`${stratasCount.get(this.strata, i)}`);
        else
          stratasToAnalyse.push(`${stratasCount.get(this.strata, i)}`);
      }
      if (stratasToFilterOut.length > 0) {
        strataFilter.setAll(false);
        grok.shell.warning(`The following categories were excluded from analysis: 
          ${stratasToFilterOut.join(',')} due to insufficient amount of data (< ${MIN_STRATA_VAL_COUNT} events)`);
        const savedFilter = DG.BitSet.create(this.survivalDataframe.rowCount).copyFrom(this.survivalDataframe.filter);
        for (const strata of stratasToAnalyse) {
          //we collect colaborative filters this way (using stratasToAnalyse) since conditions
          // like this: "RACE not in ("AFRICAN OR AMERICAN")" throws error since condition breaks on 'OR' word
          this.survivalDataframe.rows.match({[this.strata]: strata}).filter();
          strataFilter.or(this.survivalDataframe.filter);
        }
        this.survivalDataframe.filter.copyFrom(savedFilter);
      }
    }
    grok.functions.call(
      'Clinicalcase:survivalPlot', {
        'survivalDf': this.survivalDataframe.clone(strataFilter.and(this.survivalDataframe.filter)),
        'inputStrata': this.strata,
        'confInt': this.confInterval.toString(),
      }).then((result) => {
      ui.setUpdateIndicator(this.survivalPlotDiv, false);
      //@ts-ignore
      updateDivInnerHTML(this.survivalPlotDiv, ui.image(`data:image/png;base64,${result['plot']}`));
      console.warn(dataframeContentToRow(result['diagnostics']));
    });
  }

  private updateCovariatesPlot() {
    ui.setUpdateIndicator(this.covariatesPlotDiv, true);
    grok.functions.call(
      'Clinicalcase:covariates', {
        'covariatesDf': this.survivalDataframe.clone(this.survivalDataframe.filter),
        'coVariates': this.plotCovariates.join(' + '),
      }).then((result) => {
      ui.setUpdateIndicator(this.covariatesPlotDiv, false);
      //@ts-ignore
      const img = ui.image(`data:image/png;base64,${result['plot']}`);
      img.style.backgroundSize = '100% 100%';
      updateDivInnerHTML(this.covariatesPlotDiv, img);
      console.warn(dataframeContentToRow(result['diagnostics']));
    });
  }

  private getFilters() {
    return DG.Viewer.fromType('Filters', this.survivalDataframe, {
      'columnNames': this.survivalColumns.filter((it) => it !== 'time' && it !== 'status' && it !== SUBJECT_ID),
      'showContextMenu': false,
    }).root;
  }

  private updateStrataChoices() {
    this.strataChoices = ui.input.choice('Strata', {value: this.survivalOptions[0], items: this.survivalOptions});
    this.strataChoices.onChanged.subscribe((value) => {
      this.strata = value;
      this.updateSurvivalPlot();
    });
  }

  private updatePlotCovariatesChoices() {
    this.plotCovariatesChoices = ui.divH([], {style: {marginLeft: '20px'}});
    this.covariates.forEach((it) => {
      const covariateCheckbox = ui.input.bool(`${it}`, {value: false});
      this.plotCovariatesChoices.append(covariateCheckbox.root);
      covariateCheckbox.onChanged.subscribe((value) => {
        value ?
          this.plotCovariates.push(covariateCheckbox.caption) :
          this.plotCovariates = this.plotCovariates.filter((it) => it!== covariateCheckbox.caption);
        this.updateCovariatesPlot();
      });
    });
    /*     this.plotCovariatesChoices = ui.input.multiChoice(' ', {value: null, items: this.survivalColumns
    .filter(it => it !== 'time' && it !== 'status' && it !== SUBJECT_ID)});
    this.plotCovariatesChoices.onChanged.subscribe((value) => {
      this.plotCovariates = value;
      this.updateCovariatesPlot();
    }); */
  }

  private refreshDataframe() {
    this.survivalDataframe = createSurvivalData(
      studies[this.studyId].domains.dm.clone(studies[this.studyId].domains.dm.filter),
      studies[this.studyId].domains.ae ?? null, this.endpoint, this.endpointOptions[this.endpoint], this.covariates);
    this.survivalColumns = this.survivalDataframe.columns.names();
    this.survivalOptions = [''].concat(this.survivalColumns
      .filter((it) => it !== 'time' && it !== 'status' && it !== SUBJECT_ID));
    this.strata = '';
    this.plotCovariates = [];
    this.updateStrataChoices();
    this.updatePlotCovariatesChoices();
    updateDivInnerHTML(this.strataChoicesDiv, this.strataChoices.root);
    updateDivInnerHTML(this.plotCovariatesChoicesDiv, this.plotCovariatesChoices);
    updateDivInnerHTML(this.survivalGridDivCreate, this.survivalDataframe.plot.grid().root);
    updateDivInnerHTML(this.survivalFilterDiv, this.getFilters());
    this.updateSurvivalPlot();
  }

  private updateChartsAfterFiltering() {
    if (this.filterChanged) {
      updateDivInnerHTML(this.covariatesPlotDiv, '');
      updateDivInnerHTML(this.survivalPlotDiv, '');
      this.updateSurvivalPlot();
      if (this.plotCovariates.length)
        this.updateCovariatesPlot();

      this.filterChanged = false;
    }
  }

  private getColsRequiredForEndpoints() {
    return {
      'SAE': {'ae': [VIEWS_CONFIG[SURVIVAL_ANALYSIS_VIEW_NAME][AE_START_DAY_FIELD], SUBJECT_ID, AE_SEVERITY, AE_SEQ]},
      'DEATH': {'dm': [DEATH_DATE]},
      'HOSPITALIZATION': {'ae': [VIEWS_CONFIG[SURVIVAL_ANALYSIS_VIEW_NAME][AE_START_DAY_FIELD], SUBJECT_ID,
        AE_REQ_HOSP, AE_SEVERITY, AE_SEQ]},
      'DRUG RELATED AE': {'ae': [VIEWS_CONFIG[SURVIVAL_ANALYSIS_VIEW_NAME][AE_START_DAY_FIELD], SUBJECT_ID,
        AE_CAUSALITY, AE_SEVERITY, AE_SEQ]},
    };
  }
}
