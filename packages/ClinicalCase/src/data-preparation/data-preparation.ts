import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {ACTIVE_ARM_POSTTFIX, AE_PERCENT, ALT, AST, BILIRUBIN, DOMAINS_WITH_EVENT_START_END_DAYS,
  NEG_LOG10_P_VALUE, ODDS_RATIO, PLACEBO_ARM_POSTTFIX, P_VALUE, RELATIVE_RISK, RISK_DIFFERENCE,
  SE_RD_WITH_SIGN_LEVEL, STANDARD_ERROR_RD} from '../constants/constants';
import {addDataFromDmDomain, dateDifferenceInDays, filterBooleanColumn, filterNulls} from './utils';
import {AE_CAUSALITY, AE_REQ_HOSP, AE_SEQ, AE_SEVERITY, AE_START_DATE, LAB_HI_LIM_N, LAB_LO_LIM_N,
  LAB_RES_N, LAB_TEST, SUBJECT_ID, SUBJ_REF_ENDT, SUBJ_REF_STDT, VISIT_DAY,
  VISIT_NAME, VISIT_START_DATE} from '../constants/columns-constants';
import {studies} from '../clinical-study';
const {jStat} = require('jstat');


export function createMaxValuesDataForHysLaw(dataframe, aggregatedColName, filerValue) {
  let missingDataFlag = false;
  const condition = `${LAB_TEST} = ${filerValue}`;
  let grouped = dataframe.groupBy([SUBJECT_ID, LAB_RES_N, LAB_HI_LIM_N])
    .where(condition)
    .aggregate();
  grouped.columns.addNewFloat(aggregatedColName)
    .init((i) => {
      if (!grouped.col(LAB_RES_N).isNone(i) && !grouped.col(LAB_HI_LIM_N).isNone(i))
        return grouped.get(LAB_RES_N, i) / grouped.get(LAB_HI_LIM_N, i);
      else {
        missingDataFlag = true;
        return 0;
      }
    });
  grouped = grouped.groupBy([SUBJECT_ID])
    .max(aggregatedColName)
    .aggregate();
  grouped.getCol(`max(${aggregatedColName})`).name = aggregatedColName;
  return {df: grouped, missingData: missingDataFlag};
}


export function createHysLawDataframe(lb: DG.DataFrame, dm: DG.DataFrame, altName: string,
  astName: string, blnName: string, trtArm: string) {
  const {df: alt, missingData: missingDataAlt} = createMaxValuesDataForHysLaw(lb, ALT, altName);
  const {df: bln, missingData: missingDataBln} = createMaxValuesDataForHysLaw(lb, BILIRUBIN, blnName);
  const {df: ast, missingData: missingDataAst} = createMaxValuesDataForHysLaw(lb, AST, astName);
  //let ap = createMaxValuesDataForHysLaw(lb, AP, 'Alkaline Phosphatase');

  let joined = grok.data.joinTables(bln, alt, [SUBJECT_ID], [SUBJECT_ID],
    [SUBJECT_ID, BILIRUBIN], [ALT], DG.JOIN_TYPE.LEFT, false);
  joined = grok.data.joinTables(joined, ast, [SUBJECT_ID], [SUBJECT_ID],
    [SUBJECT_ID, ALT, BILIRUBIN], [AST], DG.JOIN_TYPE.LEFT, false);
  //joined = grok.data.joinTables(joined, ap, [ SUBJECT_ID ], [ SUBJECT_ID ],
  // [ SUBJECT_ID, ALT, BILIRUBIN, AST ], [ AP ], DG.JOIN_TYPE.LEFT, false);
  if (dm && dm.col(trtArm))
    joined = addDataFromDmDomain(joined, dm, [SUBJECT_ID, ALT, BILIRUBIN, AST], [trtArm]);

  if (missingDataAlt || missingDataAst || missingDataBln) {
    grok.shell.error(`Some values were missing in ${LAB_RES_N} and/or ${LAB_HI_LIM_N}.
      The results of Hy's law should be reviewed manually.`);
  }

  return joined;
}


export function createFilteredFloatValuesDataframe(df: DG.DataFrame & any, condition: string, groupCols: string[],
  newFloatCol: string, colToTransform: string) {
  const filteredData = df.groupBy(groupCols)
    .where(condition)
    .aggregate();
  filteredData.columns.addNewFloat(newFloatCol).init((i) => parseFloat(filteredData.get(colToTransform, i)));
  return filteredData;
}

export function createFilteredDataframe(df: DG.DataFrame & any, condition: string, groupCols: string[],
  newFloatCol: string, colToTransform: string) {
  const filteredData = df.groupBy(groupCols)
    .where(condition)
    .aggregate();
  filteredData.columns.addNewFloat(newFloatCol).init((i) => parseFloat(filteredData.get(colToTransform, i)));
  return filteredData;
}


export function createBaselineEndpointDataframe(df: DG.DataFrame,
  dm: DG.DataFrame,
  columnToExtractFromDm: string[],
  testCol: string,
  resCol: string,
  additionalCols: string[],
  value: string,
  blVisit: string,
  epVisit: string,
  visitCol: string,
  blNumColumn: string,
  epNumColumn = null) {
  const condition = `${testCol} = ${value} and ${visitCol} IN`;
  const filteredDataBaseline = createFilteredDataframe(df, `${condition} (${blVisit})`,
    [SUBJECT_ID, resCol, visitCol, testCol].concat(additionalCols), blNumColumn, resCol);
  let finalDf;
  let columnsToEXtract = [];
  if (epVisit) {
    const filteredDataEndpoint = createFilteredDataframe(df, `${condition} (${epVisit})`,
      [SUBJECT_ID, resCol, visitCol, testCol].concat(additionalCols), epNumColumn, resCol);
    finalDf = grok.data.joinTables(filteredDataBaseline, filteredDataEndpoint,
      [SUBJECT_ID], [SUBJECT_ID], [SUBJECT_ID, blNumColumn, testCol].concat(additionalCols), [epNumColumn],
      DG.JOIN_TYPE.LEFT, false);
    columnsToEXtract = [SUBJECT_ID, blNumColumn, epNumColumn, testCol].concat(additionalCols);
  } else {
    finalDf = filteredDataBaseline;
    columnsToEXtract = [SUBJECT_ID, blNumColumn, testCol].concat(additionalCols);
  }
  if (dm && columnToExtractFromDm.every((it) => dm.columns.names().includes(it)))
    finalDf = addDataFromDmDomain(finalDf, dm, columnsToEXtract, columnToExtractFromDm);

  return finalDf;
}


export function createLabValuesByVisitDataframe(lb: DG.DataFrame, dm: DG.DataFrame,
  labValue: string,
  treatmentArmCol: string,
  treatmentArm: string,
  labValueNumCol: string,
  visitCol: string) {
  const condition = `${LAB_TEST} = ${labValue}`;
  let filtered = createFilteredDataframe(lb, condition, [SUBJECT_ID, LAB_RES_N, visitCol], labValueNumCol, LAB_RES_N);
  if (dm && dm.col(treatmentArmCol)) {
    filtered = addDataFromDmDomain(filtered, dm, filtered.columns.names(), [treatmentArmCol]);
    filtered.rows.filter((row) => row.visitdy !== DG.INT_NULL && row[treatmentArmCol] === treatmentArm);
  } else
    filtered.rows.filter((row) => row.visitdy !== DG.INT_NULL);

  return filtered;
}


export function createUniqueCountDataframe(df: DG.DataFrame, groupCol: string[],
  uniqueCountCol: string, renameCol: string) {
  const grouped = df.groupBy(groupCol)
    .uniqueCount(uniqueCountCol)
    .aggregate();
  grouped.getCol(`unique(${uniqueCountCol})`).name = renameCol;
  return grouped;
}


export function addColumnWithDrugPlusDosage(df: DG.DataFrame, drugCol: string, dosageCol: string,
  unitsCol: string, newCol: string) {
  df.columns.addNewString(newCol)
    .init((i) => `${df.col(drugCol) ? df.get(drugCol, i).toString() : ''} ${df.col(dosageCol) ?
      df.get(dosageCol, i).toString() : ''}${df.col(unitsCol) ? df.get(unitsCol, i).toString() : ''}`);
  return df;
}

export function createSurvivalData(dmDf: DG.DataFrame, aeDf: DG.DataFrame,
  endpoint: string, SDTMendpoint: string, covariates: string[]) {
  let dm = dmDf.clone();
  filterNulls(dm, SUBJ_REF_ENDT); // according to SDTMIG v3.3 RFENDTC is null for screen failures or unassigned subjects
  if (SDTMendpoint === AE_START_DATE) {
    const ae = aeDf.clone();
    if (endpoint == 'HOSPITALIZATION')
      filterBooleanColumn(ae, AE_REQ_HOSP, false);

    const condition = endpoint == 'DRUG RELATED AE' ? `${AE_CAUSALITY} in (PROBABLE, POSSIBLE, RELATED, UNLIKELY RELATED, POSSIBLY RELATED, RELATED)` : `${AE_SEVERITY} = SEVERE`;
    const aeGrouped = ae.groupBy([SUBJECT_ID]).
      min(AE_SEQ).
      where(condition).
      aggregate();
    const aeJoined = grok.data.joinTables(ae, aeGrouped, [SUBJECT_ID, AE_SEQ],
      [SUBJECT_ID, `min(${AE_SEQ})`], [SUBJECT_ID, AE_START_DATE], [`min(${AE_SEQ})`], DG.JOIN_TYPE.LEFT, false);
    filterNulls(aeJoined, `min(${AE_SEQ})`);
    dm = grok.data.joinTables(dm, aeJoined, [SUBJECT_ID], [SUBJECT_ID], dm.columns.names(),
      [AE_START_DATE], DG.JOIN_TYPE.LEFT, false);
  }
  dm.columns.addNewInt('time')
    .init((i) => getSurvivalTime(dm.columns.byName(SDTMendpoint),
      dm.columns.byName(SUBJ_REF_STDT), dm.columns.byName(SUBJ_REF_ENDT), i));
  dm.columns.addNewInt('status')
    .init((i) => getSurvivalStatus(dm.columns.byName(SDTMendpoint), i));
  return dm.groupBy([SUBJECT_ID, 'time', 'status'].concat(covariates)).aggregate();
}

export function getSurvivalTime(eventColumn: DG.Column, startColumn: DG.Column, endColumn: DG.Column, i: number) {
  if (eventColumn.isNone(i))
    return dateDifferenceInDays(startColumn.get(i).toString(), endColumn.get(i).toString());
  else
    return dateDifferenceInDays(startColumn.get(i).toString(), eventColumn.get(i).toString());
}

export function getSurvivalStatus(eventColumn: DG.Column, i: number) {
  return eventColumn.isNone(i) ? 0 : 1;
}

export function createAERiskAssessmentDataframe(ae: DG.DataFrame, dm: DG.DataFrame, trtArmCol: string, aeTermCol:
  string, placeboArm: string[], activeArm: string[], signLevel: number) {
  const TRTARM = 'TREATMENT_ARM';
  const TOTALSUBJ = 'TOTALSUBJ';
  const TOTALSUBJ_WITH_AE = 'TOTALSUBJ_WITH_AE';
  const PERCENT = 'PERCENT';

  dm.columns.addNewString(TRTARM).init((i) => {
    if (placeboArm.includes(dm.get(trtArmCol, i)))
      return placeboArm.join(',');

    if (activeArm.includes(dm.get(trtArmCol, i)))
      return activeArm.join(',');

    return dm.get(trtArmCol, i);
  });

  const subjArm = createUniqueCountDataframe(dm, [TRTARM], SUBJECT_ID, TOTALSUBJ);

  const numberSubjPlaceboArm = subjArm.groupBy(subjArm.columns.names())
    .where({[TRTARM]: `${placeboArm.join(',')}`})
    .aggregate()
    .get(TOTALSUBJ, 0);
  const numberSubjActiveArm = subjArm.groupBy(subjArm.columns.names())
    .where({[TRTARM]: `${activeArm.join(',')}`})
    .aggregate()
    .get(TOTALSUBJ, 0);
  const totalSubj = numberSubjPlaceboArm + numberSubjActiveArm;

  const joinedAeEX = grok.data.joinTables(ae, dm, [SUBJECT_ID], [SUBJECT_ID],
    [SUBJECT_ID, aeTermCol], [TRTARM], DG.JOIN_TYPE.LEFT, false);
  const subjAE = createUniqueCountDataframe(joinedAeEX, [aeTermCol, TRTARM], SUBJECT_ID, TOTALSUBJ_WITH_AE);

  const subjTotalAndWithAE = grok.data.joinTables(subjAE, subjArm, [TRTARM], [TRTARM],
    [aeTermCol, TRTARM, TOTALSUBJ_WITH_AE], [TOTALSUBJ], DG.JOIN_TYPE.LEFT, false);

  subjTotalAndWithAE.columns.addNewFloat(PERCENT)
    .init((i) => parseFloat(subjTotalAndWithAE.get(TOTALSUBJ_WITH_AE, i)) /
    parseFloat(subjTotalAndWithAE.get(TOTALSUBJ, i)));

  const aeRiskRatioPlacebo = subjTotalAndWithAE.groupBy([aeTermCol, TRTARM, TOTALSUBJ_WITH_AE, TOTALSUBJ, PERCENT])
    .where({[TRTARM]: `${placeboArm.join(',')}`})
    .aggregate();
  aeRiskRatioPlacebo.name = `${placeboArm.join(',')}`;

  const aeRiskRatioActive = subjTotalAndWithAE.groupBy([aeTermCol, TRTARM, TOTALSUBJ_WITH_AE, TOTALSUBJ, PERCENT])
    .where({[TRTARM]: `${activeArm.join(',')}`})
    .aggregate();
  aeRiskRatioActive.name = `${activeArm.join(',')}`;

  const renameCols = (df: DG.DataFrame, columnNames: string[], arm: string) => {
    columnNames.forEach((it) => {
      df.getCol(it).name = `${it}_${arm}`;
    });
  };

  renameCols(aeRiskRatioPlacebo, [TRTARM, TOTALSUBJ_WITH_AE, TOTALSUBJ, PERCENT], PLACEBO_ARM_POSTTFIX);
  renameCols(aeRiskRatioActive, [TRTARM, TOTALSUBJ_WITH_AE, TOTALSUBJ, PERCENT], ACTIVE_ARM_POSTTFIX);

  let joinedFinal = grok.data.joinTables(aeRiskRatioActive, aeRiskRatioPlacebo, [aeTermCol], [aeTermCol],
    [aeTermCol, `${TRTARM}_${ACTIVE_ARM_POSTTFIX}`, `${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`,
      `${TOTALSUBJ}_${ACTIVE_ARM_POSTTFIX}`, `${PERCENT}_${ACTIVE_ARM_POSTTFIX}`],
    [aeTermCol, `${TRTARM}_${PLACEBO_ARM_POSTTFIX}`, `${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`,
      `${TOTALSUBJ}_${PLACEBO_ARM_POSTTFIX}`, `${PERCENT}_${PLACEBO_ARM_POSTTFIX}`],
    DG.JOIN_TYPE.OUTER, false);


  const aeTermActCol = joinedFinal.col(`${activeArm.join(',')}.${aeTermCol}`);
  joinedFinal.col(aeTermActCol ? `${activeArm.join(',')}.${aeTermCol}` : aeTermCol).name =
    `${aeTermCol}_${ACTIVE_ARM_POSTTFIX}`;
  const aeTermPlaceboCol = joinedFinal.col(`${placeboArm.join(',')}.${aeTermCol}`);
  joinedFinal.col(aeTermPlaceboCol ? `${placeboArm.join(',')}.${aeTermCol}`: aeTermCol).name =
    `${aeTermCol}_${PLACEBO_ARM_POSTTFIX}`;


  const removeNulls = (rowCount, colToCheck, colWithWalue, percentCol, totalSubjWithAECol) => {
    for (let i = 0; i < rowCount; i++) {
      if (colToCheck.isNone(i)) {
        const value = colWithWalue.get(i);
        colToCheck.set(i, value, false);
        percentCol.set(i, 0, false);
        totalSubjWithAECol.set(i, 0, false);
      }
    }
  };

  removeNulls(joinedFinal.rowCount,
    joinedFinal.col(`${aeTermCol}_${ACTIVE_ARM_POSTTFIX}`),
    joinedFinal.col(`${aeTermCol}_${PLACEBO_ARM_POSTTFIX}`),
    joinedFinal.col(`${PERCENT}_${ACTIVE_ARM_POSTTFIX}`),
    joinedFinal.col(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`));

  removeNulls(joinedFinal.rowCount,
    joinedFinal.col(`${aeTermCol}_${PLACEBO_ARM_POSTTFIX}`),
    joinedFinal.col(`${aeTermCol}_${ACTIVE_ARM_POSTTFIX}`),
    joinedFinal.col(`${PERCENT}_${PLACEBO_ARM_POSTTFIX}`),
    joinedFinal.col(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`));

  joinedFinal.columns.addNewFloat(RELATIVE_RISK)
    .init((i) => (joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`, i) * numberSubjPlaceboArm) /
    (joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`, i) * numberSubjActiveArm));

  joinedFinal.columns.addNewFloat(RISK_DIFFERENCE)
    .init((i) => joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`, i) /
    numberSubjActiveArm - joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`, i) / numberSubjPlaceboArm);

  joinedFinal.columns.addNewFloat(ODDS_RATIO).init((i) => {
    const TE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`, i);
    const PE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`, i);
    return (TE * (numberSubjPlaceboArm - PE)) / (PE * (numberSubjActiveArm - TE));
  });

  joinedFinal.columns.addNewFloat('Z').init((i) => {
    const TE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`, i);
    const TN = numberSubjActiveArm - TE;
    const PE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`, i);
    const PN = numberSubjPlaceboArm - PE;
    const N = totalSubj;
    const Z = (Math.pow(TE - (numberSubjActiveArm * (TE + PE)) / N, 2) * Math.pow(N, 2) * (N - 1)) /
      (numberSubjActiveArm * numberSubjPlaceboArm * (TE + PE) * (TN + PN));
    return Z;
  });

  joinedFinal.columns.addNewFloat(P_VALUE).init((i) => {
    const Z = joinedFinal.get('Z', i);
    const f = jStat.chisquare.cdf(Z, 1);
    return 1 - f < f ? 1 - f : f;
  });

  joinedFinal.columns.addNewFloat(NEG_LOG10_P_VALUE).init((i) => (-Math.log10(joinedFinal.get(P_VALUE, i))));

  joinedFinal.columns.addNewFloat(STANDARD_ERROR_RD).init((i) => {
    const TE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${ACTIVE_ARM_POSTTFIX}`, i);
    const TN = numberSubjActiveArm - TE;
    const PE = joinedFinal.get(`${TOTALSUBJ_WITH_AE}_${PLACEBO_ARM_POSTTFIX}`, i);
    const PN = numberSubjPlaceboArm - PE;
    const SE = Math.sqrt((TE * TN / Math.pow(numberSubjActiveArm, 3) + PE * PN / Math.pow(numberSubjPlaceboArm, 3)));
    return SE;
  });

  joinedFinal.columns.addNewFloat(SE_RD_WITH_SIGN_LEVEL).init((i) => {
    const SE = joinedFinal.get(STANDARD_ERROR_RD, i);
    const quantile = jStat.normal.inv(1 - signLevel / 2, 0, 1);
    return 2 * quantile * SE;
  });

  const aePercent = ae.groupBy([aeTermCol]).count().aggregate();
  const totalAeEvents = ae.rowCount;
  aePercent.columns.addNewFloat(AE_PERCENT).init((i) => {
    return aePercent.get(`count`, i) / totalAeEvents;
  });
  aePercent.columns.remove(`count`);

  joinedFinal = grok.data.joinTables(joinedFinal, aePercent, [`${aeTermCol}_${ACTIVE_ARM_POSTTFIX}`],
    [aeTermCol], joinedFinal.columns.names(), [AE_PERCENT], DG.JOIN_TYPE.LEFT, false);

  return joinedFinal;
}


export function dynamicComparedToBaseline(
  dataframe: DG.DataFrame,
  testCol: string,
  resCol: string,
  baselineVisitNum: string,
  blVisitColumn: string,
  newColName: string,
  renameNewCol: boolean) {
  const dfName = dataframe.name;
  const grouped = dataframe.groupBy([SUBJECT_ID, testCol, resCol])
    .where(`${blVisitColumn} = ${baselineVisitNum}`)
    .aggregate();
  grouped.getCol(resCol).name = `BL_${resCol}`;
  dataframe.join(grouped,
    [SUBJECT_ID, testCol], [SUBJECT_ID, testCol],
    dataframe.columns.names(), [`BL_${resCol}`], DG.JOIN_TYPE.LEFT, true);
  dataframe.columns.addNewFloat(newColName)
    .init((i) => {
      if (dataframe.getCol(resCol).isNone(i) || dataframe.getCol(`BL_${resCol}`).isNone(i))
        return null;
      else
        return (dataframe.get(resCol, i) - dataframe.get(`BL_${resCol}`, i)) / dataframe.get(`BL_${resCol}`, i);
    });
  if (renameNewCol) {
    dataframe.columns.remove(resCol);
    dataframe.getCol(newColName).name = resCol;
  }
  dataframe.name = dfName;
}

export function labDynamicComparedToMinMax(dataframe, newColName: string) {
  const dfName = dataframe.name;
  const groupedMax = dataframe.groupBy([LAB_TEST])
    .max(LAB_RES_N)
    .aggregate();
  const groupedMin = dataframe.groupBy([LAB_TEST])
    .min(LAB_RES_N)
    .aggregate();
  dataframe.join(groupedMax, [LAB_TEST], [LAB_TEST], dataframe.columns.names(),
    [`max(${LAB_RES_N})`], DG.JOIN_TYPE.LEFT, true)
    .join(groupedMin, [LAB_TEST], [LAB_TEST], dataframe.columns.names(),
      [`min(${LAB_RES_N})`], DG.JOIN_TYPE.LEFT, true);
  dataframe.columns.addNewFloat(newColName)
    .init((i) =>
      (dataframe.get(LAB_RES_N, i) - dataframe.get(`min(${LAB_RES_N})`, i)) /
      (dataframe.get(`max(${LAB_RES_N})`, i) - dataframe.get(`min(${LAB_RES_N})`, i)));
  dataframe.name = dfName;
}


export function labDynamicRelatedToRef(df: DG.DataFrame, newColName: string) {
  df.columns.addNewFloat(newColName)
    .init((i) => {
      const val = df.get(LAB_RES_N, i);
      const min = df.get(LAB_LO_LIM_N, i);
      const max = df.get(LAB_HI_LIM_N, i);
      if (!val || !min || !max)
        return null;
      else
        return val >= max ? val / max : val <= min ? 0 - min / val : ((val - min) / (max - min) - 0.5) * 2;
    });
}


export function cumulativeEnrollemntByDay(df: DG.DataFrame, dateCol: string, subjIDCol: string, cumCol: string) {
  const subjsPerDay = df.groupBy([dateCol]).uniqueCount(subjIDCol).aggregate();
  const refStartCol = subjsPerDay.col(dateCol);
  for (let i = 0, rowCount = subjsPerDay.rowCount; i < rowCount; i++) {
    if (refStartCol.isNone(i))
      subjsPerDay.rows.removeAt(i);
  }
  subjsPerDay.columns.addNewInt(cumCol)
    .init((i) => {
      if (i > 0)
        return subjsPerDay.get(cumCol, i - 1) + subjsPerDay.get(`unique(${subjIDCol})`, i);

      return subjsPerDay.get(`unique(${subjIDCol})`, i);
    });
  subjsPerDay.columns.remove(`unique(${subjIDCol})`);
  return subjsPerDay;
}

export function getSubjectDmData(subjId: string, columnsToReturn: string[], studyId: string) {
  if (studies[studyId].domains.dm) {
    const dmData = studies[studyId].domains.dm
      .groupBy(studies[studyId].domains.dm.columns.names())
      .where(`${SUBJECT_ID} = ${subjId}`)
      .aggregate();
    const dmDict = {};
    columnsToReturn.forEach((it) => {
      if (dmData.columns.names().includes(it))
        dmDict[it] = dmData.get(it, 0);
    });
    return dmDict;
  }
  return {};
}


export function createEventStartEndDaysCol(studyId: string) {
  if (studies[studyId].domains.sv != null) {
    if (studies[studyId].domains.sv.col(VISIT_START_DATE) &&
      studies[studyId].domains.sv.col(VISIT_DAY) && studies[studyId].domains.sv.col(SUBJECT_ID)) {
      const baselineDates = getSubjectBaselineDates(studyId);
      DOMAINS_WITH_EVENT_START_END_DAYS.forEach((domain) => {
        if (studies[studyId].domains[domain]) {
          addCalculatedStudyDayColumn(domain, 'ST', baselineDates, studyId);
          addCalculatedStudyDayColumn(domain, 'EN', baselineDates, studyId);
        };
      });
    };
  };
}

export function addVisitDayFromTvDomain(studyId: string) {
  if (studies[studyId].domains.tv != null && studies[studyId].domains.tv.col(VISIT_DAY)) {
    const visitNamesAndDays = studies[studyId].domains.tv.groupBy([VISIT_NAME, VISIT_DAY]).aggregate();
    studies[studyId].domains.all().forEach((domain) => {
      if (domain.name !== 'tv' && domain.col(VISIT_NAME) && !domain.col(VISIT_DAY)) {
        const tableName = domain.name;
        grok.data.joinTables(domain, visitNamesAndDays, [VISIT_NAME],
          [VISIT_NAME], domain.columns.names(), [VISIT_DAY], DG.JOIN_TYPE.LEFT, true);
        domain.name = tableName;
      }
    });
  };
}

export function addCalculatedStudyDayColumn(domain: string, prefix: string,
  baselineDates: DG.DataFrame, studyId: string) {
  if (studies[studyId].domains[domain].col(`${domain.toUpperCase()}${prefix}DTC`)) {
    grok.data.joinTables(studies[studyId].domains[domain],
      baselineDates, [SUBJECT_ID], [SUBJECT_ID], studies[studyId].domains[domain].columns.names(),
      [VISIT_START_DATE], DG.JOIN_TYPE.LEFT, true);
    studies[studyId].domains[domain].columns.addNewInt(`${domain.toUpperCase()}${prefix}DY_CALCULATED`).init((i) => {
      const baselineDate = studies[studyId].domains[domain].get(VISIT_START_DATE, i); ;
      const startDate = studies[studyId].domains[domain].get(`${domain.toUpperCase()}${prefix}DTC`, i);
      let dateDiff = dateDifferenceInDays(baselineDate, startDate);
      if (dateDiff >= 0)
        dateDiff += 1;

      return dateDiff;
    });
    studies[studyId].domains[domain].columns.remove(VISIT_START_DATE);
    studies[studyId].domains[domain].name = domain;
  };
}

export function getSubjectBaselineDates(studyId: string) {
  const subjBaselineDates = studies[studyId].domains.sv.groupBy([SUBJECT_ID, VISIT_START_DATE, VISIT_DAY])
    .where(`${VISIT_DAY} = 1`)
    .aggregate();
  return subjBaselineDates;
}

