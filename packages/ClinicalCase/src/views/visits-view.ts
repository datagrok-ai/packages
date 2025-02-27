import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {updateDivInnerHTML} from '../utils/utils';
import {createPivotedDataframe, getVisitNamesAndDays, addDataFromDmDomain} from '../data-preparation/utils';
import {LAB_RES_N, LAB_TEST, SUBJECT_ID, VISIT_DAY, VISIT_NAME, VISIT_START_DATE,
  VS_RES_N, VS_TEST} from '../constants/columns-constants';
import {PatientVisit} from '../model/patient-visit';
import {StudyVisit} from '../model/study-visit';
import {_package} from '../package';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {AE_START_DAY_FIELD, AE_TERM_FIELD, CON_MED_NAME_FIELD, CON_MED_START_DAY_FIELD,
  INV_DRUG_NAME_FIELD, TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {VISITS_VIEW_NAME} from '../constants/view-names-constants';
import {DOMAINS_COLOR_PALETTE} from '../constants/constants';
import {studies} from '../clinical-study';

export class VisitsView extends ClinicalCaseViewBase {
  sv: DG.DataFrame;
  pivotedSv: DG.DataFrame;
  sortedVisitNamesAndDays: any;
  sortedVisitNames: any;
  patientVisit = new PatientVisit();
  studyVisit = new StudyVisit();
  totalVisits = {};
  proceduresAtVisit: any;
  eventsSinceLastVisit: any;
  subjSet = new Set();
  existingDomains: string[];
  selectedDomain: string;
  selectedDomains: string[];
  heatMap: DG.Viewer;
  visitsGrid: DG.Grid;
  div = ui.box();
  ribbonDiv = ui.div();
  gridRibbonDiv: any;
  heatMapdomainChoices: any;
  selectedDomainsDiv = ui.div();
  switchGrid: any;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/visits.md`;
  }

  createView(): void {
    this.proceduresAtVisit = this.getProceduresAtVisitDict();
    this.eventsSinceLastVisit = this.eventsSinceLastVisitCols();
    this.existingDomains = Object.keys(this.proceduresAtVisit)
      .concat(Object.keys(this.eventsSinceLastVisit))
      .filter((it) => studies[this.studyId].domains[it] !== null);
    this.assignColorsToDomains();
    this.sortedVisitNamesAndDays = getVisitNamesAndDays(studies[this.studyId].domains.sv, VISIT_NAME, VISIT_DAY, true);
    this.sortedVisitNames = this.sortedVisitNamesAndDays.map((it) => it.name);

    this.switchGrid = this.createSwitchGridInput();
    this.createHeatMapRibbon();
    this.createGridRibbon();
    updateDivInnerHTML(this.ribbonDiv, this.gridRibbonDiv);

    this.updateGridAndHeatMap();

    this.root.className = 'grok-view ui-box';
    this.root.append(this.div);

    this.setRibbonPanels(
      [[this.switchGrid.root], [this.ribbonDiv], [this.visitsConfig()]],
    );
  }

  private updateGridAndHeatMap() {
    this.createPivotedSv();
    this.createTotalVisits();
    this.visitsGrid = this.pivotedSv.plot.grid();
    this.renderVisitCell();
    this.styleVisitsGrid();
    this.heatMap = DG.Viewer.fromType(DG.VIEWER.HEAT_MAP, this.createHeatMapDf(), {
      'colorCoding': 'All',
    });
    this.switchGrid.value = true;
    updateDivInnerHTML(this.div, this.visitsGrid.root);
  }

  private createPivotedSv() {
    this.sv = studies[this.studyId].domains.sv.clone();
    this.pivotedSv = createPivotedDataframe(this.sv, [SUBJECT_ID], VISIT_NAME, VISIT_START_DATE, []);
    this.pivotedSv.columns.names().forEach((col) => {
      if (this.pivotedSv.getCol(col).name !== VISIT_START_DATE)
        this.pivotedSv.getCol(col).meta.format = 'yyyy-MM-dd';

      this.pivotedSv.getCol(col).name = col.replace(` first(${VISIT_START_DATE})`, '');
    });
    this.pivotedSv = addDataFromDmDomain(this.pivotedSv, studies[this.studyId].domains.dm,
      this.pivotedSv.columns.names(), [VIEWS_CONFIG[this.name][TRT_ARM_FIELD]]);
    this.pivotedSv = this.pivotedSv
      .clone(null, [SUBJECT_ID, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]].concat(this.sortedVisitNames));
    this.pivotedSv.onCurrentCellChanged.subscribe(() => {
      setTimeout(() => {
        this.createVisitPropertyPanel(this.pivotedSv);
      }, 100);
    });
    grok.data.linkTables(studies[this.studyId].domains.dm, this.pivotedSv,
      [SUBJECT_ID], [SUBJECT_ID],
      [DG.SYNC_TYPE.FILTER_TO_FILTER]);
  }

  private eventsSinceLastVisitCols() {
    const eventsSinceLastVisit = {'ae': {column: VIEWS_CONFIG[this.name][AE_START_DAY_FIELD]},
      'cm': {column: VIEWS_CONFIG[this.name][CON_MED_START_DAY_FIELD]}};
    const filtered = Object.assign({}, ...Object.entries(eventsSinceLastVisit)
      .filter(([k, v]) => studies[this.studyId].domains[k] &&
        studies[this.studyId].domains[k].col(v.column)).map(([k, v]) => ({[k]: v})),
    );
    return filtered;
  }

  private visitsConfig() {
    const visitsConfig = ui.iconFA('cog', () => {
      const div = ui.div();
      const visitsDf = DG.DataFrame.create();
      visitsDf.columns.addNewString('Name');
      visitsDf.columns.addNewInt('Day');
      visitsDf.columns.addNewString('Action');
      this.sortedVisitNamesAndDays.forEach((visit) => {
        visitsDf.rows.addNew([visit.name, visit.day, ''], false);
      });
      const grid = visitsDf.plot.grid();
      grid.setOptions({allowRowSelection: false, extendLastColumn: true});
      const col = grid.columns.byName('Action');
      col.cellType = 'html';

      grid.onCellPrepare(function(gc) {
        if (gc.isTableCell && gc.tableColumn.name === 'Action') {
          const eventElement = ui.icons.delete(() => {}, 'Delete');
          gc.style.element = ui.button(eventElement, () => {
            gc.grid.dataFrame.rows.removeAt(gc.gridRow);
            const scrollTo = gc.grid.dataFrame.rowCount === gc.gridRow ? gc.gridRow - 1 : gc.gridRow;
            grid.scrollToCell('Action', scrollTo);
          });
          gc.style.element.style.paddingBottom = '7px';
          gc.style.element.style.paddingLeft = '15px';
        }
      });

      const addButton = ui.button(ui.icons.add(() => { }), () => {
        visitsDf.rows.addNew();
      });
      div.append(ui.div(grid.root));
      div.append(addButton);
      ui.dialog({title: 'Visits'})
        .add(div)
        .onOK(() => {
          this.totalVisits = {};
          this.sortedVisitNamesAndDays = getVisitNamesAndDays(visitsDf, 'Name', 'Day', true);
          this.sortedVisitNames = this.sortedVisitNamesAndDays.map((it) => it.name);
          this.updateGridAndHeatMap();
        })
        .show();
    });
    return visitsConfig;
  }

  private getProceduresAtVisitDict() {
    return {'lb': {column: LAB_TEST},
      'ex': {column: VIEWS_CONFIG[VISITS_VIEW_NAME][INV_DRUG_NAME_FIELD]}, 'vs': {column: VS_TEST}};
  }

  private assignColorsToDomains() {
    this.existingDomains.forEach((domain) => {
      this.proceduresAtVisit[domain] ?
        this.proceduresAtVisit[domain]['color'] = DG.Color.toRgb(DOMAINS_COLOR_PALETTE[domain]) :
        this.eventsSinceLastVisit[domain]['color'] = DG.Color.toRgb(DOMAINS_COLOR_PALETTE[domain]);
    });
  }

  private createSwitchGridInput() {
    const switchGrid = ui.input.toggle('Grid', {value: true});
    switchGrid.onChanged.subscribe((value) => {
      if (value) {
        updateDivInnerHTML(this.div, this.visitsGrid.root);
        updateDivInnerHTML(this.ribbonDiv, this.gridRibbonDiv);
      } else {
        updateDivInnerHTML(this.div, this.heatMap.root);
        updateDivInnerHTML(this.ribbonDiv, this.heatMapdomainChoices.root);
      }
    });
    return switchGrid;
  }

  private createHeatMapRibbon() {
    this.selectedDomain = this.existingDomains[0];

    const domainChoices = ui.input.choice('Domain', {value: this.selectedDomain, items: this.existingDomains});
    domainChoices.onChanged.subscribe((value) => {
      this.selectedDomain = value;
      this.heatMap.dataFrame = this.createHeatMapDf();
    });
    this.heatMapdomainChoices = domainChoices;
  }

  private createGridRibbon() {
    this.selectedDomains = this.existingDomains;
    this.selectedDomainsDiv.addEventListener('click', (event) => {
      //@ts-ignore
      const domainsMultiChoices = ui.input.multiChoice('', {value: this.selectedDomains, items: this.existingDomains});
      ui.dialog({title: 'Select domains'})
        .add(ui.div([domainsMultiChoices]))
        .onOK(() => {
          this.selectedDomains = domainsMultiChoices.value;
          updateDivInnerHTML(this.selectedDomainsDiv, this.createSelectedDomainsDiv());
          this.visitsGrid.invalidate();
        })
      //@ts-ignore
        .show();
      event.stopPropagation();
    });

    this.gridRibbonDiv = ui.divH([
      this.selectedDomainsDiv,
    ]);
    updateDivInnerHTML(this.selectedDomainsDiv, this.createSelectedDomainsDiv());
  }


  private createSelectedDomainsDiv() {
    const selectedDomainsDiv = ui.divH([]);
    this.selectedDomains.forEach((it) => {
      const domainName = ui.divText(`${it} `);
      domainName.style.color = this.proceduresAtVisit[it] ?
        this.proceduresAtVisit[it].color : this.eventsSinceLastVisit[it].color;
      domainName.style.paddingRight = '7px';
      //   domainName.style.paddingTop = '10px';
      selectedDomainsDiv.append(domainName);
    });
    return selectedDomainsDiv;
  }


  private createHeatMapDf() {
    let df = DG.DataFrame.create();
    typeof (studies[this.studyId].domains.dm.get(SUBJECT_ID, 0)) === 'number' ?
      df.columns.addNewInt(SUBJECT_ID) : df.columns.addNewString(SUBJECT_ID);
    this.pivotedSv.columns.names().forEach((col) => {
      if (col !== SUBJECT_ID && col !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD])
        df.columns.addNewInt(col);
    });
    Array.from(this.subjSet).forEach((id) => {
      df.rows.addNew();
      df.set(SUBJECT_ID, df.rowCount - 1, id);
      Object.keys(this.totalVisits).forEach((key) => {
        df.set(key, df.rowCount - 1, this.totalVisits[key][id].eventsCount[this.selectedDomain]);
      });
    });
    df = addDataFromDmDomain(df, studies[this.studyId].domains.dm, df.columns.names()
      .filter((it) => it !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD]), [VIEWS_CONFIG[this.name][TRT_ARM_FIELD]]);
    df = df.clone(null, [SUBJECT_ID, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]].concat(this.sortedVisitNames));
    this.setColorPaletteForHeatMap(df);
    df.onCurrentCellChanged.subscribe(() => {
      setTimeout(() => {
        this.createVisitPropertyPanel(df);
      }, 100);
    });
    grok.data.linkTables(studies[this.studyId].domains.dm, df,
      [SUBJECT_ID], [SUBJECT_ID],
      [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    return df;
  }

  private setColorPaletteForHeatMap(df: DG.DataFrame) {
    df.columns.names().forEach((col) => {
      if (col !== SUBJECT_ID && col !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD])
        df.col(col).meta.colors.setLinear([DG.Color.white, DG.Color.blue]);
    });
  }

  private async createVisitPropertyPanel(df: DG.DataFrame) {
    if (df.currentCol.name !== SUBJECT_ID && df.currentCol.name !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD]) {
      if (df.currentRowIdx === -1) {
        const {current: currentVisit, previous: previousVisit} = this.getCurrentAndPreviousVisits(df.currentCol.name);
        this.studyVisit.updateStudyVisit(studies[this.studyId].domains, currentVisit.day,
          currentVisit.name, previousVisit ? previousVisit.day : null);
        grok.shell.o = await this.studyVisitPanel();
      } else {
        const subjId = df.get(SUBJECT_ID, df.currentRowIdx);
        const currentPatientVisit = this.totalVisits[df.currentCol.name][subjId];
        currentPatientVisit.updateSubjectVisitDomains(studies[this.studyId].domains);
        grok.shell.o = await this.patientVisitPanel(currentPatientVisit);
      }
    }
  }

  getCurrentAndPreviousVisits(colName: string) {
    const visit = this.sortedVisitNamesAndDays.filter((it) => it.name === colName)[0];
    const visitIdx = this.sortedVisitNamesAndDays.findIndex((it) => it.name === colName);
    const previousVisit = visitIdx > 0 ? this.sortedVisitNamesAndDays[visitIdx - 1] : null;
    return {current: visit, previous: previousVisit};
  }

  createTotalVisits() {
    const countDfs = this.datasetsWithNumberProceduresAtVisit();
    this.createInitialTotalVisits();
    this.updateProceduresAtVisitCount(countDfs);
    this.updateEventsSinceLastVisitCount();
  }

  private datasetsWithNumberProceduresAtVisit() {
    const countDfs = {};
    Object.keys(this.proceduresAtVisit).forEach((domain) => {
      if (studies[this.studyId].domains[domain] && [SUBJECT_ID, VISIT_NAME,
        this.proceduresAtVisit[domain].column]
        .every((it) => studies[this.studyId].domains[domain].columns.names().includes(it))) {
        countDfs[domain] = studies[this.studyId].domains[domain]
          .groupBy([SUBJECT_ID, VISIT_NAME])
          .count(this.proceduresAtVisit[domain].column)
          .aggregate();
      }
    });
    return countDfs;
  }

  private createInitialTotalVisits() {
    this.pivotedSv.columns.names().forEach((colName) => {
      if (colName !== SUBJECT_ID && colName !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD]) {
        const {current: currentVisit, previous: previousVisit} = this.getCurrentAndPreviousVisits(colName);
        this.totalVisits[colName] = {};

        this.pivotedSv.getCol(SUBJECT_ID).categories.forEach((subjId) => {
          this.totalVisits[colName][subjId] = new PatientVisit();
          this.totalVisits[colName][subjId].updateSubjectVisit(subjId,
            currentVisit.day, currentVisit.name, previousVisit ? previousVisit.day : null);
        });
      }
    });
  }

  private updateProceduresAtVisitCount(countDfs: any) {
    Object.keys(countDfs).forEach((domain) => {
      for (let i = 0; i < countDfs[domain].rowCount; i++) {
        const visitName = countDfs[domain].get(VISIT_NAME, i);
        if (!this.sortedVisitNames.includes(visitName))
          continue;

        const subjId = countDfs[domain].get(SUBJECT_ID, i);
        this.subjSet.add(subjId);
        this.totalVisits[visitName][subjId].eventsCount[domain] =
          countDfs[domain].get(this.proceduresAtVisit[domain].column, i);
      }
    });
  }

  private updateEventsSinceLastVisitCount() {
    Object.keys(this.eventsSinceLastVisit).forEach((domain) => {
      if (studies[this.studyId].domains[domain]) {
        for (let i = 0; i < studies[this.studyId].domains[domain].rowCount; i++) {
          if (!studies[this.studyId].domains[domain].col(this.eventsSinceLastVisit[domain].column).isNone(i)) {
            const startDay = studies[this.studyId].domains[domain].get(this.eventsSinceLastVisit[domain].column, i);
            const subjId = studies[this.studyId].domains[domain].get(SUBJECT_ID, i);
            this.subjSet.add(subjId);
            for (let z = 0; z < this.sortedVisitNamesAndDays.length - 1; z++) {
              if (startDay > this.sortedVisitNamesAndDays[z].day &&
                startDay <= this.sortedVisitNamesAndDays[z + 1].day) {
                const visitName = this.sortedVisitNamesAndDays[z + 1].name;
                if (this.totalVisits[visitName][subjId].eventsCount[domain])
                  this.totalVisits[visitName][subjId].eventsCount[domain] += 1;
                else
                  this.totalVisits[visitName][subjId].eventsCount[domain] = 1;

                break;
              }
            }
          }
        }
      }
    });
  }

  private renderVisitCell() {
    this.visitsGrid.onCellRender.subscribe((args) => {
      const gc = args.cell;
      if (gc.isTableCell && gc.gridColumn.name !== SUBJECT_ID &&
        gc.gridColumn.name !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD]) {
        const patientVisit = this.totalVisits[gc.gridColumn.name][this.visitsGrid.dataFrame
          .get(SUBJECT_ID, gc.tableRowIndex)];
        const delta = 30;
        let x = args.bounds.x + 10;
        const y = args.bounds.y + 15;
        this.selectedDomains.forEach((item) => {
          if (patientVisit.eventsCount[item]) {
            args.g.fillStyle = this.proceduresAtVisit[item] ?
              this.proceduresAtVisit[item].color : this.eventsSinceLastVisit[item].color;
            args.g.fillText(patientVisit.eventsCount[item], x, y);
          } else {
            args.g.fillStyle = 'rgba(128, 128, 128, 0.1)';
            args.g.fillText('0', x, y);
          }
          x += delta;
        });
        args.preventDefault();
      }
    });
  }

  private styleVisitsGrid() {
    const columnsToStyle = this.visitsGrid.dataFrame.columns.names()
      .filter((it) => it !== SUBJECT_ID && it !== VIEWS_CONFIG[this.name][TRT_ARM_FIELD]);
    for (const colName of columnsToStyle)
      this.visitsGrid.col(colName)!.width = 150;
  }

  async studyVisitPanel() {
    const panelDiv = ui.div();
    const acc = this.createAccWithTitle('Study visit panel', `${this.studyVisit.name}`);

    acc.addPane(`Summary`, () => {
      return ui.tableFromMap({
        'Visit day': this.studyVisit.day,
        'Total patients': this.studyVisit.totalPatients,
        'Min visit date': this.studyVisit.minVisitDate.toLocaleDateString(),
        'Max visit dae': this.studyVisit.maxVisitDate.toLocaleDateString(),
      });
    });

    const getRowNumber = (df) => {
      return df ? df.rowCount === 1 && df.getCol(SUBJECT_ID).isNone(0) ? 0 : df.rowCount : 0;
    };

    if (this.studyVisit.exAtVisit &&
        this.studyVisit.exAtVisit.columns.names().includes(this.studyVisit.extrtWithDoseColName)) {
      acc.addPane('Drug exposure', () => {
        if (!getRowNumber(this.studyVisit.exAtVisit))
          return ui.divText('No records found');

        return DG.Viewer.fromType(DG.VIEWER.PIE_CHART, this.studyVisit.exAtVisit, {
          category: this.studyVisit.extrtWithDoseColName,
        }).root;
      });
    }

    const createPane = (name, rowNum, df, splitCol) => {
      acc.addCountPane(`${name}`, () => getPaneContent(df, splitCol, rowNum), () => rowNum);
      const panel = acc.getPane(`${name}`);
      //@ts-ignore
      $(panel.root).css('display', 'flex');
      //@ts-ignore
      $(panel.root).css('opacity', '1');
    };

    const getPaneContent = (df, splitCol, rowNum) => {
      if (!rowNum)
        return ui.divText('No records found');
      else {
        return df.plot.bar({
          split: splitCol,
          style: 'dashboard',
          legendVisibility: 'Never',
        }).root;
      }
    };

    const createSinceLastVisitPane = (df, col, paneName) => {
      if (df) {
        const aeRowNum = getRowNumber(df);
        createPane(paneName, aeRowNum, df, col);
      }
    };

    createSinceLastVisitPane(this.studyVisit.aeSincePreviusVisit,
      VIEWS_CONFIG[this.name][AE_TERM_FIELD], 'AEs since last visit');
    createSinceLastVisitPane(this.studyVisit.conmedSincePreviusVisit,
      VIEWS_CONFIG[this.name][CON_MED_NAME_FIELD], 'CONMEDs since last visit');

    const createDistributionPane = (name, df, catCol, valCol) => {
      acc.addPane(name, () => {
        if (!getRowNumber(df))
          return ui.divText('No records found');

        const categoriesAcc = ui.accordion();
        df.getCol(catCol).categories.forEach((cat) => {
          categoriesAcc.addPane(`${cat}`, () => {
            const valueDf = df.groupBy(df.columns.names())
              .where(`${catCol} = ${cat}`)
              .aggregate();
            const plot = DG.Viewer.boxPlot(valueDf, {
              value: `${valCol}`,
              categoryColumnNames: [`${catCol}`],
              labelOrientation: DG.TextOrientation.Horz,
              showCategorySelector: false,
              showValueSelector: false,
            });
            return plot.root;
          });
        });
        return categoriesAcc.root;
      });
    };
    if (this.studyVisit.lbAtVisit && [LAB_TEST, LAB_RES_N]
      .every((it) => this.studyVisit.lbAtVisit.columns.names().includes(it)))
      createDistributionPane('Laboratory', this.studyVisit.lbAtVisit, LAB_TEST, LAB_RES_N);

    if (this.studyVisit.vsAtVisit && [VS_TEST, VS_RES_N]
      .every((it) => this.studyVisit.vsAtVisit.columns.names().includes(it)))
      createDistributionPane('Vital signs', this.studyVisit.vsAtVisit, VS_TEST, VS_RES_N);


    panelDiv.append(acc.root);

    return panelDiv;
  }

  async patientVisitPanel(patientVisit: PatientVisit) {
    const panelDiv = ui.div();
    const acc = this.createAccWithTitle('Patient visit panel', `${patientVisit.currentSubjId}`);

    const getPaneContent = (it, rowNum) => {
      if (it) {
        if (!rowNum)
          return ui.divText('No records found');
        else {
          const grid = patientVisit[it].plot.grid();
          if (rowNum < 7)
            grid.root.style.maxHeight = rowNum < 4 ? '100px' : '150px';

          grid.root.style.width = '250px';
          return ui.div(grid.root);
        }
      }
    };

    const createPane = (it, name, rowNum) => {
      acc.addCountPane(`${name}`, () => getPaneContent(it, rowNum), () => rowNum);
      const panel = acc.getPane(`${name}`);
      //@ts-ignore
      $(panel.root).css('display', 'flex');
      //@ts-ignore
      $(panel.root).css('opacity', '1');
    };


    const createAccordion = () => {
      Object.keys(patientVisit.domainsNamesDict).forEach((key) => {
        const domain = patientVisit.domainsNamesDict[key];
        if (patientVisit[domain]) {
          const rowNum =
                        patientVisit[domain].rowCount === 1 && patientVisit[domain].getCol(SUBJECT_ID).isNone(0) ?
                          0 : patientVisit[domain].rowCount;
          createPane(domain, key, rowNum);
        }
      });
    };

    createAccordion();

    panelDiv.append(acc.root);

    return panelDiv;
  }
}
