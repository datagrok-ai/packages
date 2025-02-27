import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {validationRulesList, _package} from '../package';
import {pinnacleRuleIdColumnName, validationResultRuleIdColumn} from '../sdtm-validation/constants';
import {createRulesDataFrame} from '../sdtm-validation/validation-utils';
import {getUniqueValues} from '../data-preparation/utils';
import {ClinicalCaseViewBase} from '../model/ClinicalCaseViewBase';
import {studies} from '../clinical-study';

export class ValidationView extends ClinicalCaseViewBase {
  resultsDataframe: DG.DataFrame;
  rulesDataframe: DG.DataFrame;
  resultsGrid: DG.Grid;
  rulesGrid: DG.Grid;
  domains: any;

  constructor(name: string, studyId: string) {
    super(name, studyId);
    this.name = name;
    this.helpUrl = `${_package.webRoot}/views_help/validation.md`;
  }

  createView(): void {
    this.resultsDataframe = studies[this.studyId].validationResults;
    this.domains = studies[this.studyId].domains;

    const uniqueViolatedRuleIds = Array.from(getUniqueValues(studies[this.studyId].validationResults,
      validationResultRuleIdColumn));
    this.rulesDataframe = this.getViolatedRulesDataframe(validationRulesList, uniqueViolatedRuleIds);

    this.rulesGrid = this.rulesDataframe.plot.grid();

    grok.data.linkTables(this.rulesDataframe, this.resultsDataframe,
      [`${pinnacleRuleIdColumnName}`], [`${validationResultRuleIdColumn}`],
      [DG.SYNC_TYPE.CURRENT_ROW_TO_SELECTION]);

    this.generateUI();
    this.rulesDataframe.currentRowIdx = 0;
  }

  private generateUI() {
    const viewerTitle = {style: {
      'color': 'var(--grey-6)',
      'margin': '12px 0px 6px 12px',
      'font-size': '16px',
      'justify-content': 'center',
    }};


    const violatedRules = DG.Viewer.grid(this.rulesDataframe);
    violatedRules.root.prepend();

    const tabs = ui.tabControl(this.createErrorsTabControl());
    console.log(tabs);

    this.root.className = 'grok-view ui-box';
    this.root.appendChild(
      ui.splitV([
        ui.box(ui.divText('Violated rules', viewerTitle), {style: {maxHeight: '45px'}}),
        violatedRules.root,
        //this.resultsDataframe.plot.grid().root,
        ui.box(ui.divText('Errors', viewerTitle), {style: {maxHeight: '45px'}}),
        tabs.root,
      ]),
    );
  }

  private createErrorsTabControl() {
    const tabControl = {};
    Object.keys(studies[this.studyId].errorsByDomain).forEach((key) => {
      const domainDataframe = this.domains[key].clone();
      this.addRowNumberColumn(domainDataframe, key);
      tabControl[`${key.toUpperCase()} (${studies[this.studyId].errorsByDomain[key]})`] =
        DG.Viewer.grid(domainDataframe).root;
      grok.data.linkTables(this.resultsDataframe, domainDataframe,
        [`Row number`, 'Domain'], [`Row number`, 'Domain lower case'],
        [DG.SYNC_TYPE.SELECTION_TO_FILTER]);
    });
    return tabControl;
  }


  private addRowNumberColumn(dataframe: DG.DataFrame, domain: string) {
    if (!dataframe.columns.contains('Row number'))
      dataframe.columns.addNewInt('Row number').init((i) => i);

    if (!dataframe.columns.contains('Domain lower case'))
      dataframe.columns.addNewString('Domain lower case').init((i) => domain);
  }


  private getViolatedRulesDataframe(rules: DG.DataFrame, uniqueViolatedRuleIds: any) {
    const res = createRulesDataFrame();
    const column = rules.getCol(pinnacleRuleIdColumnName);
    const rowCount = rules.rowCount;
    for (let i = 0; i < rowCount; i++) {
      if (uniqueViolatedRuleIds.includes(column.get(i))) {
        const array = [];
        for (const col of rules.columns)
          array.push(col.get(i));
        res.rows.addNew(array);
      }
    }
    return res;
  }
}

