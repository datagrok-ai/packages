import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {ADVERSE_EVENTS_VIEW_NAME, AE_RISK_ASSESSMENT_VIEW_NAME, CORRELATIONS_VIEW_NAME,
  DISTRIBUTIONS_VIEW_NAME, LABORATORY_VIEW_NAME, MEDICAL_HISTORY_VIEW_NAME, PATIENT_PROFILE_VIEW_NAME,
  QUESTIONNAIRES_VIEW_NAME, SUMMARY_VIEW_NAME, SURVIVAL_ANALYSIS_VIEW_NAME, TIMELINES_VIEW_NAME,
  TIME_PROFILE_VIEW_NAME, TREE_MAP_VIEW_NAME, VISITS_VIEW_NAME} from '../constants/view-names-constants';
import * as sdtmCols from '../constants/columns-constants';
import {AE_END_DAY_FIELD, AE_START_DAY_FIELD, AE_TERM_FIELD, CON_MED_END_DAY_FIELD, CON_MED_NAME_FIELD,
  CON_MED_START_DAY_FIELD, INV_DRUG_END_DAY_FIELD, INV_DRUG_NAME_FIELD, INV_DRUG_START_DAY_FIELD,
  TRT_ARM_FIELD, VIEWS_CONFIG} from '../views-config';
import {updateDivInnerHTML} from './utils';


export function createErrorsByDomainMap(validationResults: DG.DataFrame): {[key: string]: number} {
  const errorsMapWithCount: {[key: string]: number} = {};
  if (validationResults.rowCount) {
    const validationSummary = validationResults.groupBy(['Domain']).count().aggregate();
    for (let i = 0; i < validationSummary.rowCount; ++i)
      errorsMapWithCount[validationSummary.get('Domain', i)] = validationSummary.get('count', i);
    return errorsMapWithCount;
  }
  return null;
}


export function checkRequiredColumns(df: DG.DataFrame, columns: string[], viwerName: string) {
  const missingCols = columns.filter((it) => !df.columns.names().includes(it));
  if (missingCols.length)
    return `The following columns are required for ${viwerName} viewer: ${columns.join(',')}. Missing ${missingCols.join(',')}`;

  return null;
}

export function checkColumnsAndCreateViewer(df: DG.DataFrame, columns: string[],
  div: HTMLDivElement, createViewer: () => any, viewerName: string) {
  const message = checkRequiredColumns(df, columns, viewerName);
  message ? updateDivInnerHTML(div, ui.info(`${message}`)) : createViewer();
}

export function createValidationErrorsDiv(missingDomains: string[],
  missingColumnsInReqDomains: any, missingColumnsInOptDomains: any) {
  const errorsDiv = ui.divV([], {style: {margin: 'auto', textAlign: 'center'}});
  if (missingDomains.length)
    createMissingDataDiv(errorsDiv, missingDomains, 'Missing domains:');

  createMissingColumnsDiv(missingColumnsInReqDomains, errorsDiv);
  createMissingColumnsDiv(missingColumnsInOptDomains, errorsDiv);
  return errorsDiv;
}


export function createMissingColumnsDiv(domainsWithMissingCols: any, div: HTMLDivElement) {
  Object.keys(domainsWithMissingCols).forEach((domain) => {
    if (domainsWithMissingCols[domain].length)
      createMissingDataDiv(div, domainsWithMissingCols[domain], `Missing columns in ${domain}:`);
  });
}

export function createMissingDataDiv(div: HTMLDivElement, missingDomainsOrCols: string[], header: string) {
  const domainsDiv = ui.div();
  missingDomainsOrCols.forEach((it) => {domainsDiv.append(ui.divText(it));});
  div.append(ui.div([
    ui.h2(header),
    domainsDiv,
  ]));
}

export function getRequiredColumnsByView() {
  // req - all coulmns must be present, opt - at least one of the columns must be present
  // req_domains - all domains must be present, opt_domains - at least one of domains must be present
  return {
    [SUMMARY_VIEW_NAME]: {
      'req_domains': {
        'dm': {
          'req': [
            sdtmCols.STUDY_ID,
            sdtmCols.SUBJECT_ID,
          ],
        },
      },
    },
    [TIMELINES_VIEW_NAME]: {
      'opt_domains': {
        'ae': {
          'req': [
            sdtmCols.DOMAIN,
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_START_DAY_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_END_DAY_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][AE_TERM_FIELD],
          ],
        },
        'cm': {
          'req': [
            sdtmCols.DOMAIN,
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_NAME_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_START_DAY_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][CON_MED_END_DAY_FIELD],
          ],
        },
        'ex': {
          'req': [
            sdtmCols.DOMAIN,
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_NAME_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
            VIEWS_CONFIG[TIMELINES_VIEW_NAME][INV_DRUG_END_DAY_FIELD],
          ],
        },
      },
    },
    [PATIENT_PROFILE_VIEW_NAME]: {
      'req_domains': {
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
        },
      },
      'opt_domains': {
        'lb': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.LAB_DAY,
            sdtmCols.LAB_TEST,
            sdtmCols.LAB_RES_N,
            sdtmCols.LAB_LO_LIM_N,
            sdtmCols.LAB_HI_LIM_N,
          ],
        },
        'ae': {
          'req': [
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_TERM_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][AE_END_DAY_FIELD],
          ],
        },
        'ex': {
          'req': [
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_NAME_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][INV_DRUG_END_DAY_FIELD],
          ],
        },
        'cm': {
          'req': [
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_NAME_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_START_DAY_FIELD],
            VIEWS_CONFIG[PATIENT_PROFILE_VIEW_NAME][CON_MED_END_DAY_FIELD],
          ],
        },
      },
    },
    [ADVERSE_EVENTS_VIEW_NAME]: {
      'req_domains': {
        'ae': {
          'req': [
          ],
        },
      },
    },
    [LABORATORY_VIEW_NAME]: {
      'req_domains': {
        'lb': {
          'req': [
          ],
        },
      },
    },
    [AE_RISK_ASSESSMENT_VIEW_NAME]: {
      'req_domains': {
        'ae': {
          'req': [
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[AE_RISK_ASSESSMENT_VIEW_NAME][AE_TERM_FIELD],
          ],
        },
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
            VIEWS_CONFIG[AE_RISK_ASSESSMENT_VIEW_NAME][TRT_ARM_FIELD],
          ],
        },
      },
    },
    [SURVIVAL_ANALYSIS_VIEW_NAME]: {
      'req_domains': {
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.SUBJ_REF_STDT,
            sdtmCols.SUBJ_REF_ENDT,
          ],
        },
      },
    },
    [DISTRIBUTIONS_VIEW_NAME]: {
      'req_domains': {
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
          'opt': [
            sdtmCols.ETHNIC,
            sdtmCols.SEX,
            sdtmCols.RACE,
            VIEWS_CONFIG[DISTRIBUTIONS_VIEW_NAME][TRT_ARM_FIELD],
          ],
        },
      },
      'opt_domains': {
        'lb': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.VISIT_DAY,
            sdtmCols.VISIT_NAME,
            sdtmCols.LAB_RES_N,
            sdtmCols.LAB_TEST,
          ],
        },
        'vs': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.VISIT_DAY,
            sdtmCols.VISIT_NAME,
            sdtmCols.VS_RES_N,
            sdtmCols.VS_TEST,
          ],
        },
      },
    },
    [CORRELATIONS_VIEW_NAME]: {
      'opt_domains': {
        'lb': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.LAB_TEST,
            sdtmCols.VISIT_NAME,
            sdtmCols.LAB_RES_N,
          ],
        },
        'vs': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.VS_TEST,
            sdtmCols.VISIT_NAME,
            sdtmCols.VS_RES_N,
          ],
        },
      },
    },
    [TIME_PROFILE_VIEW_NAME]: {
      'opt_domains': {
        'lb': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.LAB_TEST,
            sdtmCols.VISIT_NAME,
            sdtmCols.VISIT_DAY,
            sdtmCols.LAB_RES_N,
          ],
        },
        'vs': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.VS_TEST,
            sdtmCols.VISIT_NAME,
            sdtmCols.VISIT_DAY,
            sdtmCols.VS_RES_N,
          ],
        },
      },
    },
    [TREE_MAP_VIEW_NAME]: {
      'req_domains': {
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
          'opt': [
            sdtmCols.ETHNIC,
            sdtmCols.SEX,
            sdtmCols.RACE,
            VIEWS_CONFIG[TREE_MAP_VIEW_NAME][TRT_ARM_FIELD],
          ],
        },
        'ae': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
        },

      },
    },
    [MEDICAL_HISTORY_VIEW_NAME]: {
      'req_domains': {
        'mh': {
          'req': [
          ],
        },

      },
    },
    [VISITS_VIEW_NAME]: {
      'req_domains': {
        'sv': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.VISIT_START_DATE,
            sdtmCols.VISIT_DAY,
            sdtmCols.VISIT_NAME,
          ],
        },
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
        },
      },
    },
    [QUESTIONNAIRES_VIEW_NAME]: {
      'req_domains': {
        'qs': {
          'req': [
            sdtmCols.SUBJECT_ID,
            sdtmCols.QS_CATEGORY,
            sdtmCols.QS_SUB_CATEGORY,
            sdtmCols.QS_TEST,
            sdtmCols.QS_RES,
          ],
        },
        'dm': {
          'req': [
            sdtmCols.SUBJECT_ID,
          ],
          'opt': [
            sdtmCols.ETHNIC,
            sdtmCols.SEX,
            sdtmCols.RACE,
            VIEWS_CONFIG[QUESTIONNAIRES_VIEW_NAME][TRT_ARM_FIELD],
          ],
        },
      },
    },
  };
}
