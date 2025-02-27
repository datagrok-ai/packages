import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {AE_END_DATE, AE_SEVERITY, AE_START_DATE, AGE, RACE, SEX, SUBJECT_ID} from '../constants/columns-constants';
import * as ui from 'datagrok-api/ui';
import {dictToString, getNullOrValue} from '../data-preparation/utils';
import {getSubjectDmData} from '../data-preparation/data-preparation';
import {SEVERITY_COLOR_DICT} from '../constants/constants';
import {updateDivInnerHTML} from '../utils/utils';
import {AE_END_DAY_FIELD, AE_START_DAY_FIELD, AE_TERM_FIELD, TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {AE_BROWSER_VIEW_NAME} from '../constants/view-names-constants';
import {studies} from '../clinical-study';

export class AEBrowserHelper {
  domains = ['ae', 'ex', 'cm'];
  dyDomains = ['vs', 'lb'];
  domainsWithoutVisitDays = ['mh'];
  domainsToExclude = ['dm', 'tv', 'sv'];
  additionalDomains = [];
  selectedAdditionalDomains = [];
  aeToSelect: DG.DataFrame;
  daysPriorAe = 5;
  currentSubjId = '';
  currentAeDay: number;
  name = AE_BROWSER_VIEW_NAME;
  filterChanged = false;
  studyId: string;

  constructor(dataFrame: DG.DataFrame, studyId: string) {
    const presentDomains = [];
    this.studyId = studyId;
    this.aeToSelect = dataFrame;
    studies[studyId].domains.all().forEach((it) => {
      if (it.name && !this.domainsToExclude.includes(it.name)) {
        this[it.name] = studies[studyId].domains[it.name].clone();
        presentDomains.push(it.name);
        if (!this.domains.includes(it.name))
          this.additionalDomains.push(it.name);
      }
    });
    this.domains = this.domains.filter((it) => presentDomains.includes(it));
    if (studies[studyId].domains.dm) {
      grok.data.linkTables(studies[studyId].domains.dm, this.aeToSelect,
        [SUBJECT_ID], [SUBJECT_ID],
        [DG.SYNC_TYPE.FILTER_TO_FILTER]);
    }
  }

  updateDomains() {
    this.domains.concat(this.selectedAdditionalDomains).forEach((domain) => {
      if (!this.currentSubjId)
        return;
      const condition = this.domainsWithoutVisitDays.includes(domain) ?
        `${SUBJECT_ID} = ${this.currentSubjId}` :
        this.dyDomains.includes(domain) ?
          studies[this.studyId].domains[domain].col(`${domain.toUpperCase()}DY`) ?
            `${SUBJECT_ID} = ${this.currentSubjId} and ${domain.toUpperCase()}DY < ${this.currentAeDay} and ${domain.toUpperCase()}DY > ${this.currentAeDay - this.daysPriorAe}` :
            null :
          [`${domain.toUpperCase()}STDY`, `${domain.toUpperCase()}ENDY`].every((it) => studies[this.studyId].domains[domain].col(it) !== null) ?
            `${SUBJECT_ID} = ${this.currentSubjId} and ${domain.toUpperCase()}STDY < ${this.currentAeDay} and ${domain.toUpperCase()}ENDY > ${this.currentAeDay - this.daysPriorAe}` :
            null;
      if (condition) {
        this[domain] = studies[this.studyId].domains[domain]
          .clone()
          .groupBy(studies[this.studyId].domains[domain].columns.names())
          .where(`${condition}`)
          .aggregate();
      } else
        this[domain] = null;
    });
  }

  async propertyPanel() {
    this.updateDomains();
    grok.shell.o = await this.aeBrowserPanel();
  }

  async aeBrowserPanel() {
    const panelDiv = ui.div();
    const accae = ui.accordion(`${this.name} panel`);
    const accIcon = ui.element('i');
    accIcon.className = 'grok-icon svg-icon svg-view-layout';

    if (this.aeToSelect.currentRowIdx !== -1) {
      const subjId = this.aeToSelect.get(SUBJECT_ID, this.aeToSelect.currentRowIdx);
      const title = ui.tooltip.bind(ui.label(subjId),
        dictToString(getSubjectDmData(subjId, [AGE, SEX, RACE, VIEWS_CONFIG[this.name][TRT_ARM_FIELD]], this.studyId)));
      const description = ui.divH([
        ui.divText(String(this.aeToSelect.get(VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_TERM_FIELD],
          this.aeToSelect.currentRowIdx).toLowerCase()))]);

      if (this.aeToSelect.columns.names().includes(AE_SEVERITY)) {
        const severity = this.aeToSelect.get(AE_SEVERITY, this.aeToSelect.currentRowIdx);
        const severityStyle = {
          style: {
            color: `${SEVERITY_COLOR_DICT[severity.toUpperCase()]}`,
            marginRight: '5px',
            fontWeight: 'bold',
          },
        };
        description.prepend(ui.divText(severity, severityStyle));
      }

      accae.addTitle(ui.span([accIcon, title]));

      const getAeDate = (col) => {
        this.aeToSelect.col(col) ?
          getNullOrValue(this.aeToSelect, AE_START_DATE, this.aeToSelect.currentRowIdx) : 'null';
      };

      const startEndDays = ui.tooltip.bind(
        ui.label(`${getNullOrValue(this.aeToSelect, VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_START_DAY_FIELD],
          this.aeToSelect.currentRowIdx)} - ${getNullOrValue(this.aeToSelect,
          VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_END_DAY_FIELD], this.aeToSelect.currentRowIdx)}`),
        `${getAeDate(AE_START_DATE)} - ${getAeDate(AE_END_DATE)}`);


      const daysInput = ui.input.int('Prior AE', {value: this.daysPriorAe});
      daysInput.onChanged.subscribe((value) => {
        this.daysPriorAe = value;
        this.updateDomains();
        updateAccordion();
      });
      startEndDays.innerHTML = 'Days ' + startEndDays.innerHTML;
      startEndDays.style.marginTop = '5px';
      //@ts-ignore
      accae.header = ui.div([
        description,
        startEndDays,
        //@ts-ignore
        ui.divH([ui.divText('Days prior AE'), daysInput.input], {style: {alignItems: 'center', gap: '5px'}}),
      ]);

      const getPaneContent = (it, rowNum) => {
        if (it) {
          if (!rowNum)
            return ui.divText('No records found');
          else {
            const grid = this[it].plot.grid();
            if (rowNum < 7)
              grid.root.style.maxHeight = rowNum < 4 ? '100px' : '150px';

            grid.root.style.width = '250px';
            return ui.div(grid.root);
          }
        }
      };

      const createPane = (it, rowNum) => {
        accae.addCountPane(`${it}`, () => getPaneContent(it, rowNum), () => rowNum);
        const panel = accae.getPane(`${it}`);
        //@ts-ignore
        $(panel.root).css('display', 'flex');
        //@ts-ignore
        $(panel.root).css('opacity', '1');
      };

      const updateAccordion = () => {
        const totalDomains = this.domains.concat(this.selectedAdditionalDomains);
        const panesToRemove = accae.panes.filter((it) => !totalDomains.includes(it.name));
        panesToRemove.forEach((it) => accae.removePane(it));
        totalDomains.forEach((it) => {
          if (this[it]) {
            const rowNum = this[it].rowCount === 1 && this[it].getCol(SUBJECT_ID).isNone(0) ? 0 : this[it].rowCount;
            const pane = accae.getPane(`${it}`);
            if (pane) {
              //@ts-ignore
              updateDivInnerHTML(pane.root.lastChild, getPaneContent(it, rowNum));
              //@ts-ignore
              pane.root.firstChild.lastChild.innerText = rowNum;
            } else
              createPane(it, rowNum);
          }
        });
      };

      const createAccordion = () => {
        this.domains.concat(this.selectedAdditionalDomains).forEach((it) => {
          if (this[it]) {
            const rowNum = this[it].rowCount === 1 && this[it].getCol(SUBJECT_ID).isNone(0) ? 0 : this[it].rowCount;
            createPane(it, rowNum);
          }
        });
      };

      const addButton = ui.button(ui.icons.add(() => { }), () => {
        const domainsMultiChoices = ui.input.multiChoice('', {
          value: this.selectedAdditionalDomains, items: this.additionalDomains,
        });
        ui.dialog({title: 'Select domains'})
          .add(ui.div([domainsMultiChoices]))
          .onOK(() => {
            this.selectedAdditionalDomains = domainsMultiChoices.value;
            this.updateDomains();
            updateAccordion();
          })
        //@ts-ignore
          .show({centerAt: addButton});
      });
      createAccordion();

      panelDiv.append(accae.root);
      panelDiv.append(addButton);

      return panelDiv;
    }
    return accae.root;
  }
}
