import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {AE_BROWSER_VIEW_NAME, TIMELINES_VIEW_NAME} from '../constants/view-names-constants';
import * as sdtmCols from '../constants/columns-constants';
import {AE_END_DAY_FIELD, AE_START_DAY_FIELD, AE_TERM_FIELD, VIEWS_CONFIG} from '../views-config';
import {AEBrowserHelper} from '../helpers/ae-browser-helper';
import {ValidationHelper} from '../helpers/validation-helper';
import {c} from '../package';
import {createValidationErrorsDiv} from './views-validation-utils';
import {updateDivInnerHTML} from './utils';
import {studies} from '../clinical-study';
import {ClinCaseTableView} from './types';

export function createAEBrowserHelper(studyId: string): any {
  const aeBrowserDf = studies[studyId].domains.ae.clone();
  const aeBrowserHelper = new AEBrowserHelper(aeBrowserDf, studyId);
  const timelinesView = grok.shell.view(TIMELINES_VIEW_NAME) as any;
  if (timelinesView)
    timelinesView.aeBrowserHelper = aeBrowserHelper;

  aeBrowserDf.onCurrentRowChanged.subscribe(() => {
    aeBrowserHelper.currentSubjId = aeBrowserDf.get(sdtmCols.SUBJECT_ID, aeBrowserDf.currentRowIdx);
    aeBrowserHelper.currentAeDay = aeBrowserDf
      .get(VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_START_DAY_FIELD], aeBrowserDf.currentRowIdx);
    aeBrowserHelper.propertyPanel();
  });
  return {helper: aeBrowserHelper, df: aeBrowserDf};
}

export function addView(view: DG.ViewBase): DG.ViewBase {
  view.box = true;
  view.parentCall = c;
  view.path = '/' + view.name;
  grok.shell.addView(view);
  return view;
}

export function createClinCaseTableView(studyId: string, viewName: string): ClinCaseTableView {
  const tableView = createTableView(
    studyId,
    TABLE_VIEWS[viewName].domainsAndColsToCheck,
    viewName,
    TABLE_VIEWS[viewName].helpUrl,
    TABLE_VIEWS[viewName].createViewHelper,
    TABLE_VIEWS[viewName].paramsForHelper,
  );
  return {view: tableView.view, helper: tableView.helper};
}

export function createTableView(
  studyId: string,
  domainsAndColsToCheck: any,
  viewName: string,
  helpUrl: string,
  createViewHelper: (studyId: string, params: any) => any,
  paramsForHelper?: any) {
  let tableView: DG.TableView | DG.View;
  let viewHelper;
  const validator = new ValidationHelper(domainsAndColsToCheck, studyId);
  if (validator.validate()) {
    const {helper, df} = createViewHelper(studyId, paramsForHelper);
    tableView = DG.TableView.create(df, false);
    viewHelper = helper;
  } else {
    tableView = DG.View.create();
    updateDivInnerHTML(tableView.root, createValidationErrorsDiv(validator.missingDomains,
      validator.missingColumnsInReqDomains, validator.missingColumnsInOptDomains));
  }
  tableView.name = viewName;
  if (helpUrl)
    tableView.helpUrl = helpUrl;

  return {helper: viewHelper, view: tableView};
}

export const TABLE_VIEWS = {
  [AE_BROWSER_VIEW_NAME]: {
    domainsAndColsToCheck: {
      'req_domains': {
        'ae': {
          'req': [
            VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_TERM_FIELD],
            VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_START_DAY_FIELD],
            VIEWS_CONFIG[AE_BROWSER_VIEW_NAME][AE_END_DAY_FIELD],
          ],
        },
      },
    },
    helpUrl: 'https://raw.githubusercontent.com/datagrok-ai/public/master/packages/ClinicalCase/views_help/ae_browser.md',
    createViewHelper: createAEBrowserHelper,
  },
};
