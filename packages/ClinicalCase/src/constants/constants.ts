import * as DG from "datagrok-api/dg";
import * as views from "./view-names-constants";

export const ALT = 'ALT';
export const AST = 'AST';
export const BILIRUBIN = 'BLN';
export const AP = 'AP';
export const colorsForSurvivalChart = ['red', 'green', 'blue', 'yellow'];
export const SURVIVAL_ANALYSIS_GUIDE = `1. Select dataset parameters and click 'Create dataset'.
2. Filter data if needed.
3. Go to 'Survival Chart' tab to see Kaplan-Meier curve. You can modify the survival chart parameters - confidence interval and strata.
4. Go to 'Covariates' tab to perform covariates analysis. Check one or more covariates to see graphs.
`
export const SEVERITY_COLOR_DICT = {
        'MILD': 'var(--green-2)', 
        'MODERATE': 'var(--orange-2)', 
        'SEVERE': 'var(--red-3)', 
        'U': 'var(--grey-3)', 
        'UNK': 'var(--grey-3)', 
        'Unknown': 'var(--grey-3)'}

export const CLINICAL_TRIAL_GOV_FIELDS = {
        'NCTId': 'NCT ID',
        'Condition': 'Condition',
        'BriefTitle': 'Brief Title',
        'OrgFullName': 'Organization',
        'Phase': 'Phase',
        'StartDate': 'Start Date',
        'CompletionDate':'Completion Date',
        'BriefSummary': 'Brief Summary'
}

export const ACTIVE_ARM_POSTTFIX = 'ACTIVE';
export const PLACEBO_ARM_POSTTFIX = 'PLACEBO';
export const RELATIVE_RISK = 'RR';
export const RISK_DIFFERENCE = 'RD';
export const ODDS_RATIO = 'OR';
export const P_VALUE = 'p-value';
export const NEG_LOG10_P_VALUE = '-log10(p-value)';
export const AE_PERCENT = 'AE_PERCENT';
export const STANDARD_ERROR_RD = 'SE_RD';
export const SE_RD_WITH_SIGN_LEVEL = 'SE_RD_SIGN_LEVEL';
export const DOMAINS_COLOR_PALETTE = {
        'ae': DG.Color.red, 
        'vs': DG.Color.green, 
        'lb': DG.Color.blue,
        'cm': DG.Color.orange,
        'ex': DG.Color.purple
};
export const DOMAINS_WITH_EVENT_START_END_DAYS = ['ae', 'cm', 'ex'];
export const TIMELINES_VIEWER = 'Timelines';

export const StudyJsonName = 'study.json';
export const demoStudyId = 'CDISCPILOT01';

export const domainsToValidate = ['dm', 'ae'];