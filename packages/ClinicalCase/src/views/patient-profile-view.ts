import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {INV_DRUG_DOSE, INV_DRUG_DOSE_UNITS, LAB_DAY, LAB_HI_LIM_N, LAB_LO_LIM_N, LAB_RES_N,
  LAB_TEST, SUBJECT_ID, VISIT_DAY, VISIT_NAME} from '../constants/columns-constants';
import {addColumnWithDrugPlusDosage, dynamicComparedToBaseline,
  labDynamicComparedToMinMax, labDynamicRelatedToRef} from '../data-preparation/data-preparation';
import {getUniqueValues, getVisitNamesAndDays} from '../data-preparation/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {_package} from '../package';
import {PATIENT_PROFILE_VIEW_NAME} from '../constants/view-names-constants';
import {AE_END_DAY_FIELD, AE_START_DAY_FIELD, AE_TERM_FIELD, CON_MED_END_DAY_FIELD, CON_MED_NAME_FIELD,
  CON_MED_START_DAY_FIELD, INV_DRUG_END_DAY_FIELD, INV_DRUG_NAME_FIELD, INV_DRUG_START_DAY_FIELD,
  VIEWS_CONFIG} from '../views-config';
import { } from '../utils/utils';
import {studies} from '../clinical-study';


export class PatientProfileView extends ClinicalCaseViewBase {
  options: any;

  optionsLbAeAxCm = {
    series: [],
  };

  tableNamesAndFields: any;

  tables = {};
  multiplotLbAeExCm: any;
  missingDomainsAndCols = {};
  visitNamesAndDays: any [];
  uniqueLabVisits: any;
  bl: string;
  selectedPatientId: any;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/patient_profile.md`;
  }

  createView(): void {
    this.tableNamesAndFields = this.getTableNamesAndFields();
    this.options = this.getOptions();
    const patientIds = Array.from(getUniqueValues(studies[this.studyId].domains.dm, SUBJECT_ID));
    this.selectedPatientId = patientIds[0];
    const patienIdBoxPlot = ui.input.choice('', {value: this.selectedPatientId, items: patientIds});
    patienIdBoxPlot.onChanged.subscribe((value) => {
      this.selectedPatientId = value;
      this.updateMultiplot();
    });
    const labBaselineSelect = this.createLabBaselineVisitSelect();
    this.updateTablesToAttach(this.selectedPatientId);

    (Object.values(this.tables) as any[])[0].plot.fromType('MultiPlot', {
      paramOptions: JSON.stringify(this.optionsLbAeAxCm),
    }).then((v: any) => {
      this.multiplotLbAeExCm = v;
      this.attachTablesToMultiplot(this.multiplotLbAeExCm, this.optionsLbAeAxCm, ['lb', 'ae', 'ex', 'cm']);
      const labScatter = this.getSeriesIndexByName('Lab Values');
      if (labScatter !== -1) {
        this.multiplotLbAeExCm.updatePlotByCategory(0,
          this.optionsLbAeAxCm.series[labScatter].multiEdit.selectedValues,
          false);
      } //to clear scattr plot after creation
      ;
      this.setRibbonPanels([
        [
          ui.iconFA('chevron-left', () => {
            //@ts-ignore
            let current = patienIdBoxPlot.input.selectedIndex;
            if (current != 0) {
              current--;
              //@ts-ignore
              patienIdBoxPlot.value = patienIdBoxPlot.input.options[current].value;
              //@ts-ignore
              patienIdBoxPlot.input.selectedIndex = current;
              patienIdBoxPlot.fireChanged();
            }
          }),
        ],
        [
          patienIdBoxPlot.root,
        ],
        [
          ui.iconFA('chevron-right', () => {
            //@ts-ignore
            let current = patienIdBoxPlot.input.selectedIndex;
            //@ts-ignore
            const length = patienIdBoxPlot.input.length;
            if (current != length) {
              current++;
              //@ts-ignore
              patienIdBoxPlot.value = patienIdBoxPlot.input.options[current].value;
              //@ts-ignore
              patienIdBoxPlot.input.selectedIndex = current;
              patienIdBoxPlot.fireChanged();
            }
          }),
        ],
        [
          labBaselineSelect,
        ],
      ]);
      this.root.className = 'grok-view ui-box';
      this.root.appendChild(this.multiplotLbAeExCm.root);
      if (Object.keys(this.missingDomainsAndCols).length)
        this.createMissingChartsInfo();
    });
  }

  private createLabBaselineVisitSelect() {
    if (studies[this.studyId].domains.lb && [VISIT_DAY, VISIT_NAME]
      .every((it) => studies[this.studyId].domains.lb.col(it) !== null)) {
      this.visitNamesAndDays = getVisitNamesAndDays(studies[this.studyId].domains.lb, VISIT_NAME, VISIT_DAY);
      this.bl = this.visitNamesAndDays[0].name;
      this.uniqueLabVisits = Array.from(getUniqueValues(studies[this.studyId].domains.lb, VISIT_NAME));
      const blVisitChoices = ui.input.choice('Baseline', {value: this.bl, items: this.uniqueLabVisits});
      blVisitChoices.onChanged.subscribe((value) => {
        this.bl = value;
        this.updateMultiplot();
      });
      return blVisitChoices.root;
    }
  }

  private updateMultiplot() {
    this.updateTablesToAttach(this.selectedPatientId);
    this.attachTablesToMultiplot(this.multiplotLbAeExCm, this.optionsLbAeAxCm, ['lb', 'ae', 'ex', 'cm']);
    const labLine = this.getSeriesIndexByName('Lab Values Line Chart');
    if (labLine !== -1) {
      this.multiplotLbAeExCm.setAdditionalParams(labLine,
        this.optionsLbAeAxCm.series[labLine].comboEdit
          .additionalParams[this.optionsLbAeAxCm.series[labLine].comboEdit.selectedValue]);
      const updateTitle = this.optionsLbAeAxCm.series[labLine].multiEdit.selectedValues.length ? true : false;
      this.multiplotLbAeExCm.updatePlotByCategory(labLine,
        this.optionsLbAeAxCm.series[labLine].multiEdit.selectedValues, updateTitle);
      this.multiplotLbAeExCm.updatePlotByYAxis(labLine,
        this.optionsLbAeAxCm.series[labLine].comboEdit
          .values[this.optionsLbAeAxCm.series[labLine].comboEdit.selectedValue]);
    }
    const labScatter = this.getSeriesIndexByName('Lab Values');
    if (labScatter !== -1) {
      this.multiplotLbAeExCm.updatePlotByCategory(0,
        this.optionsLbAeAxCm.series[labScatter].multiEdit.selectedValues, false);
    };
  }

  private attachTablesToMultiplot(plot: any, options: any, tableNames: string[]) {
    const tablesToAttach = {};
    tableNames.forEach((name) => {
      tablesToAttach[`patient_${name}`] = this.tables[name];
    });
    plot.tables = tablesToAttach;
    plot.options = options;
    plot.onTableAttached();
  }


  private updateTablesToAttach(myId: any) {
    Object.keys(this.tableNamesAndFields).forEach((name) => {
      if (studies[this.studyId].domains[name] && !this.optDomainsWithMissingCols.includes(name)) {
        this.tables[name] = studies[this.studyId].domains[name].clone()
          .groupBy(studies[this.studyId].domains[name].columns.names())
          .where(`${SUBJECT_ID} = ${myId}`)
          .aggregate();
        this.tables[name].name = `patient_${name}`;
      }
    });
    this.optionsLbAeAxCm['xAxisMinMax'] = this.extractMinAndMaxValuesForXAxis();
    this.createSeries();
    if (this.getSeriesIndexByName('Drug Exposure') !== -1) {
      addColumnWithDrugPlusDosage(this.tables['ex'],
        VIEWS_CONFIG[this.name][INV_DRUG_NAME_FIELD], INV_DRUG_DOSE, INV_DRUG_DOSE_UNITS, 'EXTRT_WITH_DOSE');
    }

    if (this.getSeriesIndexByName('Lab Values Line Chart') !== -1) {
      dynamicComparedToBaseline(this.tables['lb'], LAB_TEST, LAB_RES_N,
        this.visitNamesAndDays.filter((it) => it.name === this.bl)[0].day, VISIT_DAY, 'LAB_DYNAMIC_BL', false);
      labDynamicComparedToMinMax(this.tables['lb'], 'LAB_DYNAMIC_MIN_MAX');
      labDynamicRelatedToRef(this.tables['lb'], 'LAB_DYNAMIC_REF');
    }
  }

  private extractMinAndMaxValuesForXAxis() {
    let min = null;
    let max = null;
    Object.keys(this.tables).forEach((tableName) => {
      const table = this.tables[tableName];
      const minColName = this.tableNamesAndFields[tableName]['start'];
      const maxColName = this.tableNamesAndFields[tableName]['end'] ?? this.tableNamesAndFields[tableName]['start'];
      const newMin = table.getCol(minColName).stats['min'];
      min = min !== null || newMin > min ? min : newMin;
      const newMax = table.getCol(maxColName).stats['max'];
      max = max !== null || newMax < max ? max : newMax;
    });
    return {minX: min, maxX: max};
  }

  private createSeries() {
    this.optionsLbAeAxCm.series = [];
    this.options.forEach((it) => {
      if (this.tables[it.domain] && it.req_cols.every((col) => this.tables[it.domain].columns.names().includes(col)))
        this.optionsLbAeAxCm.series.push(it.opts);
      else
        this.missingDomainsAndCols[it.opts.title] = `${it.domain} with ${it.req_cols.join(', ')}`;
    });
  }

  private createMissingChartsInfo() {
    let str = 'Load the following domains to create additional charts: \n';
    Object.keys(this.missingDomainsAndCols).forEach((title) => {
      str += `\"${title}\": ${this.missingDomainsAndCols[title]}\n`;
    });
    grok.shell.info(str);
  }

  private getSeriesIndexByName(name: string) {
    return this.optionsLbAeAxCm.series.findIndex((it) => it.title === name);
  }

  private getTableNamesAndFields() {
    return {
      'lb': {'start': LAB_DAY},
      'ae': {'start': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_START_DAY_FIELD],
        'end': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_END_DAY_FIELD]},
      'ex': {'start': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
        'end': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_END_DAY_FIELD]},
      'cm': {'start': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_START_DAY_FIELD],
        'end': VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_END_DAY_FIELD]},
    };
  }

  private getOptions() {
    return [
      {
        req_cols: [SUBJECT_ID, LAB_DAY, LAB_TEST, LAB_RES_N, LAB_LO_LIM_N, LAB_HI_LIM_N],
        domain: 'lb',
        opts: {
          tableName: 'patient_lb',
          title: 'Lab Values',
          type: 'scatter',
          x: LAB_DAY,
          y: LAB_TEST,
          // extraFields is an array to load into echart data arrays
          // all fields later combined into one array [x, y, extraFields]
          // user can address fields by index, for instance index 3 means field "LBORNRLO"
          extraFields: [LAB_RES_N, LAB_LO_LIM_N, LAB_HI_LIM_N],
          yType: 'category', // can be 'value' or 'category'
          statusChart: {
            valueField: 2, // index of field with test value
            splitByColumnName: LAB_RES_N, // column to get categories
            categories: [''], // fixed categories
            minField: 3, // min and max normal value
            maxField: 4, // will be displayed with default color, otherwises "red"
            alertColor: 'red',
          },
          markerShape: 'circle',
          height: '1flex', // height can be '30px', '20%', '3flex'
          show: 1,
          yLabelWidth: 50,
          yLabelOverflow: 'truncate',
          multiEdit: {
            options: studies[this.studyId].domains.lb ?
              Array.from(getUniqueValues(studies[this.studyId].domains.lb, LAB_TEST)) : [],
            selectedValues: [],
            editValue: 'category',
            updateTitle: false,
          },
        },
      },
      {
        req_cols: [SUBJECT_ID, LAB_DAY, LAB_TEST, LAB_RES_N, LAB_LO_LIM_N, LAB_HI_LIM_N, VISIT_NAME, VISIT_DAY],
        domain: 'lb',
        opts: {
          tableName: 'patient_lb',
          title: 'Lab Values Line Chart',
          type: 'line',
          multiLineFieldIndex: 2, //index of field by which to split multiple graphs
          x: LAB_DAY,
          y: 'LAB_DYNAMIC_BL',
          extraFields: [LAB_TEST, LAB_RES_N, LAB_LO_LIM_N, LAB_HI_LIM_N,
            `BL_${LAB_RES_N}`, `min(${LAB_RES_N})`, `max(${LAB_RES_N})`],
          splitByColumnName: LAB_TEST, // get categories from this column
          categories: [''], // fixed categories
          maxLimit: 1, // max number of linecharts
          yType: 'category',
          markerShape: 'square',
          height: '1flex',
          show: 1,
          yLabelWidth: 50,
          yLabelOverflow: 'truncate',
          multiEdit: {
            options: studies[this.studyId].domains.lb ?
              Array.from(getUniqueValues(studies[this.studyId].domains.lb, LAB_TEST)) : [],
            selectedValues: [],
            editValue: 'category',
            updateTitle: false,
          },
          comboEdit: {
            options: ['From BL', 'Min/Max', 'Related to ref'],
            selectedValue: 'From BL',
            editValue: 'y',
            editName: 'Type',
            values: {'From BL': 'LAB_DYNAMIC_BL', 'Min/Max': 'LAB_DYNAMIC_MIN_MAX',
              'Related to ref': 'LAB_DYNAMIC_REF'},
            additionalParams: {
              'Related to ref': {
                markLine: {
                  lineStyle: {
                    color: '#333',
                  },
                  data: [
                    {
                      name: 'lower lim',
                      yAxis: -1,
                      label: {
                        formatter: '{b}',
                        position: 'start',
                      },
                    },
                    {
                      name: 'upper lim',
                      yAxis: 1,
                      label: {
                        formatter: '{b}',
                        position: 'start',
                      },
                    },
                  ],
                },
                min: -1.5,
                max: 1.5,
              },
            },
          },
          showLegend: true,
        },
      },
      {
        req_cols: [SUBJECT_ID, VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_TERM_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_START_DAY_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_END_DAY_FIELD]],
        domain: 'ae',
        opts: {
          tableName: 'patient_ae',
          title: 'Adverse Events',
          type: 'timeLine',
          y: VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_TERM_FIELD], // category column
          x: [VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_END_DAY_FIELD]], // [startTime, endTime]
          yType: 'category',
          color: 'red', // color of marker
          markerShape: 'circle',
          height: '2flex',
          show: 1,
          yLabelWidth: 50,
          yLabelOverflow: 'truncate',
        },
      },
      {
        req_cols: [SUBJECT_ID, VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_NAME_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_END_DAY_FIELD]],
        domain: 'ex',
        opts: {
          tableName: 'patient_ex',
          title: 'Drug Exposure',
          type: 'timeLine',
          y: 'EXTRT_WITH_DOSE',
          x: [VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_END_DAY_FIELD]],
          yType: 'category',
          color: 'red',
          markerShape: 'circle',
          height: '2flex',
          show: 1,
          yLabelWidth: 50,
          yLabelOverflow: 'truncate',
        },
      },
      {
        req_cols: [SUBJECT_ID, VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_NAME_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_START_DAY_FIELD],
          VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_END_DAY_FIELD]],
        domain: 'cm',
        opts: {
          tableName: 'patient_cm',
          title: 'Concomitant Medication',
          type: 'timeLine',
          y: VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_NAME_FIELD],
          x: [VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_END_DAY_FIELD]],
          yType: 'category',
          color: 'red',
          markerShape: 'circle',
          height: '2flex',
          show: 1,
          yLabelWidth: 50,
          yLabelOverflow: 'truncate',
        },
      },
    ];
  }
}
