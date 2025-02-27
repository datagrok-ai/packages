import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {updateDivInnerHTML} from '../utils/utils';
import $ from 'cash-dom';
import {AEBrowserHelper} from '../helpers/ae-browser-helper';
import {_package} from '../package';
import {AE_BODY_SYSTEM, AE_SEVERITY, CON_MED_DOSE, CON_MED_DOSE_FREQ, CON_MED_DOSE_UNITS, CON_MED_ROUTE,
  DOMAIN, INV_DRUG_DOSE, INV_DRUG_DOSE_FORM, INV_DRUG_DOSE_FREQ, INV_DRUG_DOSE_UNITS,
  INV_DRUG_ROUTE, SUBJECT_ID} from '../constants/columns-constants';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {addDataFromDmDomain, getNullOrValue} from '../data-preparation/utils';
import {AE_END_DAY_FIELD, AE_START_DAY_FIELD, AE_TERM_FIELD, CON_MED_END_DAY_FIELD, CON_MED_NAME_FIELD,
  CON_MED_START_DAY_FIELD, INV_DRUG_END_DAY_FIELD, INV_DRUG_NAME_FIELD, INV_DRUG_START_DAY_FIELD, TRT_ARM_FIELD,
  VIEWS_CONFIG} from '../views-config';
import {TIMELINES_VIEW_NAME} from '../constants/view-names-constants';
import {TIMELINES_VIEWER} from '../constants/constants';
import {studies} from '../clinical-study';

const multichoiceTableDict = {'Adverse events': 'ae', 'Concomitant medication intake': 'cm', 'Drug exposure': 'ex'};

export class TimelinesView extends ClinicalCaseViewBase {
  options = {
    splitByColumnName: 'key',
    startColumnName: 'start',
    endColumnName: 'end',
    colorByColumnName: 'domain',
    eventColumnName: 'event',
    showEventInTooltip: true,
  };

  multichoiceTableOptions: any;
  selectedOptions: any;
  selectedDataframes: any;
  timelinesDiv = ui.box();
  filtersDiv = ui.box();
  resultTables: DG.DataFrame;
  aeBrowserHelper: AEBrowserHelper;
  filterColumns = [];
  filters: any;
  links: any;

  constructor(name, studyId) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/timelines.md`;
    //@ts-ignore
    this.basePath = '/timelines';
  }

  createView(): void {
    this.links = this.getLinks();
    const existingTables = studies[this.studyId].domains.all()
      .filter((it) => !this.optDomainsWithMissingCols.includes(it.name))
      .map((it) => it.name);
    this.filters = this.getFilterFields();
    Object.keys(this.filters)
      .forEach((domain) => this.filterColumns = this.filterColumns.concat(Object.keys(this.filters[domain])));
    this.multichoiceTableOptions = {};
    this.multichoiceTableOptions = Object.fromEntries(Object.entries(multichoiceTableDict)
      .filter(([k, v]) => existingTables.includes(v)));
    this.selectedOptions = [Object.keys(this.multichoiceTableOptions)[0]];
    this.selectedDataframes = [Object.values(this.multichoiceTableOptions)[0]];
    const multiChoiceOptions = ui.input.multiChoice('', {value: [this.selectedOptions[0]] as any,
      items: Object.keys(this.multichoiceTableOptions)});
    multiChoiceOptions.onChanged.subscribe((value) => {
      this.selectedOptions = value;
      this.updateSelectedDataframes(this.selectedOptions);
      this.updateTimelinesPlot();
      this.subscribeToSelection();
    });

    const customTitle = {
      style: {
        'color': 'var(--grey-6)',
        'margin-top': '8px',
        'font-size': '16px',
      },
    };

    const viewerTitle = {
      style: {
        'color': 'var(--grey-6)',
        'margin': '12px 0px 6px 12px',
        'font-size': '16px',
      },
    };

    this.root.className = 'grok-view ui-box';
    this.append(ui.splitH([
      ui.splitV([
        ui.box(ui.panel([
          ui.divText('Events', customTitle),
          multiChoiceOptions.root,
        ]), {style: {maxHeight: '130px'}}),
        ui.box(
          ui.divText('Filters', viewerTitle), {style: {maxHeight: '40px'}}),
        this.filtersDiv,
      ], {style: {maxWidth: '250px'}}),
      this.timelinesDiv,
    ]));

    this.updateTimelinesPlot();
    this.subscribeToSelection();

    if (studies[this.studyId].domains.dm) {
      grok.data.linkTables(studies[this.studyId].domains.dm, this.resultTables,
        [SUBJECT_ID], ['key'],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
  }

  private subscribeToSelection() {
    const setPropPanel = async () => {
      const panel = await this.propertyPanel();
      if (panel)
        grok.shell.o = panel;
    };
    this.resultTables.onSelectionChanged.subscribe(() => {
      setPropPanel();
    });
  }

  private prepare(domain: DG.DataFrame) {
    const info = this.links[domain.name];
    const df = studies[this.studyId].domains[domain.name];
    const t = df.clone(null, Object.keys(info).map((e) => info[e]));
    const filterCols = Object.keys(this.filters[domain.name])
      .filter((it) => df.columns.names().includes(this.filters[domain.name][it]));
    filterCols.forEach((key) => {t.columns.addNewString(key).init((i) => df.get(this.filters[domain.name][key], i));});
    t.columns.addNew('domain', DG.TYPE.STRING).init(domain.name.toLocaleLowerCase());
    t.columns.addNewFloat('rowNum').init((i) => i);
    for (const name in info)
      t.col(info[name]).name = name;
    return t;
  }

  private updateTimelinesTables() {
    this.resultTables = null;
    for (const dt of studies[this.studyId].domains.all().filter((t) => this.selectedDataframes.includes(t.name))) {
      const t = this.prepare(dt);
      if (this.resultTables == null)
        this.resultTables = t;
      else
        this.resultTables.append(t, true);
    }
  }

  private updateTimelinesPlot() {
    this.updateTimelinesTables();
    if (this.resultTables) {
      this.resultTables.plot.fromType(TIMELINES_VIEWER).then((v: any) => {
        try {
          $(v.root).css('position', 'relative');
          v.root.style.visibility = 'hidden';
          this.updateTimelinesDivs(v.root, this.getFilters());
          setTimeout(() => {
            v.setOptions(this.options);
            v.root.style.visibility = 'visible';
          }, 100);
        } catch (e) {
          _package.logger.debug(e.message ?? e);
        }
      });
    } else
      this.updateTimelinesDivs('', '');
  }

  private updateSelectedDataframes(options: string[]) {
    this.selectedDataframes = [];
    options.forEach((item) => {
      this.selectedDataframes.push(this.multichoiceTableOptions[item]);
    });
  }

  private getFilters() {
    const chart = DG.Viewer.fromType('Filters', this.resultTables, {
      'columnNames': this.filterColumns,
      'showContextMenu': true,
    }).root;
    chart.style.overflowY = 'scroll';
    return chart;
  }

  private updateTimelinesDivs(timelinesContent: any, filtersContent: any) {
    updateDivInnerHTML(this.timelinesDiv, timelinesContent);
    updateDivInnerHTML(this.filtersDiv, filtersContent);
  }


  override async propertyPanel() {
    const selectedInd = this.resultTables.selection.getSelectedIndexes();
    //in case no events are selected on timelines plot and ae domain is checked - show most frequent AEs
    if (!selectedInd.length) {
      if (this.selectedDataframes.includes('ae')) {
        const aeWithArm = addDataFromDmDomain(this.resultTables.clone(), studies[this.studyId].domains.dm,
          this.resultTables.columns.names(), [VIEWS_CONFIG[this.name][TRT_ARM_FIELD]], 'key');
        const aeNumberByArm = aeWithArm.groupBy([VIEWS_CONFIG[this.name][TRT_ARM_FIELD]])
          .where(`${DOMAIN} = ae`).count().aggregate();
        const subjNumberByArm = studies[this.studyId].domains.dm.groupBy([VIEWS_CONFIG[this.name][TRT_ARM_FIELD]])
          .uniqueCount(SUBJECT_ID).aggregate();
        const aeNumByArmDict = {};
        for (let i = 0; i < aeNumberByArm.rowCount; i++) {
          aeNumByArmDict[aeNumberByArm.get(VIEWS_CONFIG[this.name][TRT_ARM_FIELD], i)] = aeNumberByArm.get('count', i) /
            subjNumberByArm.
              groupBy([VIEWS_CONFIG[this.name][TRT_ARM_FIELD], `unique(${SUBJECT_ID})`])
              .where({[VIEWS_CONFIG[this.name][TRT_ARM_FIELD]]:
                `${aeNumberByArm.get(VIEWS_CONFIG[this.name][TRT_ARM_FIELD], i)}`})
              .aggregate()
              .get(`unique(${SUBJECT_ID})`, 0);
        }

        const aeTop5Dict = {};
        const aeTop5 = aeWithArm.groupBy([VIEWS_CONFIG[this.name][TRT_ARM_FIELD], 'event'])
          .where(`${DOMAIN} = ae`).count().aggregate();
        const order = aeTop5.getSortedOrder([VIEWS_CONFIG[this.name][TRT_ARM_FIELD], 'event'] as any);
        order.forEach((item) => {
          const arm = aeTop5.get(VIEWS_CONFIG[this.name][TRT_ARM_FIELD], item);
          if (Object.keys(aeTop5Dict).includes(arm) && aeTop5Dict[arm].length < 5)
            aeTop5Dict[arm].push(aeTop5.get('event', item));
          else
            aeTop5Dict[arm] = [aeTop5.get('event', item)];
        });

        Object.keys(aeTop5Dict).forEach((key) => {
          aeTop5Dict[key] = aeTop5Dict[key].join(', ');
        });

        const acc = this.createAccWithTitle(this.name);
        const avarageae = ui.tableFromMap(aeNumByArmDict);
        const mostae = ui.tableFromMap(aeTop5Dict);

        acc.addPane('Average AE per patient', () => {
          $(avarageae).find('tr').css('vertical-align', 'top');
          $(avarageae).find('td').css('padding-bottom', '10px');
          $(avarageae).find('.d4-entity-list>span').css('margin', '0px');
          return avarageae;
        }, true);

        acc.addPane('Frequent AEs', () => {
          $(mostae).find('tr').css('vertical-align', 'top');
          $(mostae).find('td').css('padding-bottom', '10px');
          $(mostae).find('.d4-entity-list>span').css('margin', '0px');
          return mostae;
        });
        return acc.root;
      }
    } else {
      const eventArray = [];
      const eventIndexesArray = [];

      const domainAdditionalFields = {
        ae: {fields: [AE_SEVERITY], pos: 'before'},
        cm: {fields: [CON_MED_DOSE, CON_MED_DOSE_UNITS, CON_MED_DOSE_FREQ, CON_MED_ROUTE], pos: 'after'},
        ex: {fields: [INV_DRUG_DOSE, INV_DRUG_DOSE_UNITS, INV_DRUG_DOSE_FORM,
          INV_DRUG_DOSE_FREQ, INV_DRUG_ROUTE], pos: 'after'},
      };

      const switchToAEBrowserPanel = (aeRowNum) => {
        if (this.aeBrowserHelper.aeToSelect.currentRowIdx === aeRowNum) {
          this.aeBrowserHelper.propertyPanel();
          return null;
        } else {
          //@ts-ignore
          this.aeBrowserHelper.aeToSelect.currentRowIdx = aeRowNum;
        }
      };

      if (selectedInd.length === 1 && this.resultTables.get('domain', selectedInd[0]) === 'ae') {
        const aeRowNum = this.resultTables.get('rowNum', selectedInd[0]);
        switchToAEBrowserPanel(aeRowNum);
      } else {
        selectedInd.forEach((item) => {
          const domain = this.resultTables.get('domain', item);
          const addDomainInfo = domainAdditionalFields[domain];
          let addInfoString = '';
          const index = this.resultTables.get('rowNum', item);
          addDomainInfo.fields.forEach((it) => {
            if (studies[this.studyId].domains[domain].columns.names().includes(it))
              addInfoString += `${studies[this.studyId].domains[domain].get(it, index)} `;
          });
          const eventName = String(getNullOrValue(this.resultTables, 'event', item)).toLowerCase();
          const fullEventName =
            addDomainInfo.pos === 'before' ? `${addInfoString}${eventName}` : `${eventName} ${addInfoString}`;
          const eventStart = getNullOrValue(this.resultTables, 'start', item);
          const eventEnd = getNullOrValue(this.resultTables, 'end', item);
          eventArray.push({
            Domain: domain,
            Event: fullEventName,
            Days: `${eventStart} - ${eventEnd}`,
          });
          eventIndexesArray.push(index);
        });

        const acc2 = this.createAccWithTitle(`${this.name} patient`, `${this.resultTables.get('key', selectedInd[0])}`);

        const eventTable = DG.DataFrame.fromObjects(eventArray);
        const eventGrid = eventTable.plot.grid();
        eventGrid.columns.byName('domain').width = 55;
        const col = eventGrid.columns.byName('event');
        col.width = 170;
        col.cellType = 'html';

        eventGrid.onCellPrepare(function(gc) {
          if (gc.isTableCell && eventTable.get('Domain', gc.gridRow) === 'ae' && gc.gridColumn.name === 'Event') {
            const eventElement = ui.link(gc.cell.value, {}, '', {id: `${eventIndexesArray[gc.gridRow]}`});
            eventElement.addEventListener('click', (event) => {
              switchToAEBrowserPanel(parseInt(eventElement.id));
              event.stopPropagation();
            });
            gc.style.element = ui.div(eventElement, {style: {whiteSpace: 'nowrap'}});
          } else
            gc.style.element = ui.divText(gc.cell.value, {style: {whiteSpace: 'nowrap'}});

          gc.style.element.style.paddingTop = '7px';
          gc.style.element.style.paddingLeft = '7px';
          ui.tooltip.bind(gc.style.element, gc.cell.value);
        });

        acc2.addPane('Events', () => {
          return ui.div(eventGrid.root);
        });
        const accPane =
          acc2.getPane('Events').root.getElementsByClassName('d4-accordion-pane-content')[0] as HTMLElement;
        accPane.style.margin = '0px';
        accPane.style.paddingLeft = '0px';

        return acc2.root;
      }
    }
  }

  private getFilterFields() {
    return {
      ae: {'AE severity': AE_SEVERITY, 'AE body system': AE_BODY_SYSTEM},
      cm: {'Concomitant medication': VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_NAME_FIELD]},
      ex: {'Treatment arm': VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_NAME_FIELD]},
    };
  }

  private getLinks() {
    return {
      ae: {
        key: SUBJECT_ID,
        start: VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_START_DAY_FIELD],
        end: VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_END_DAY_FIELD],
        event: VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_TERM_FIELD],
      },
      cm: {
        key: SUBJECT_ID,
        start: VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_START_DAY_FIELD],
        end: VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_END_DAY_FIELD],
        event: VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_NAME_FIELD],
      },
      ex: {
        key: SUBJECT_ID,
        start: VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
        end: VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_END_DAY_FIELD],
        event: VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_NAME_FIELD],
      },
    };
  }
}
