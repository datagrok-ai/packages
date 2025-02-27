import {studies} from '../clinical-study';


export class ValidationHelper {
  domainsAndColumnsToCheck: {};
  missingColumnsInReqDomains;
  missingColumnsInOptDomains;
  missingDomains;
  filterChanged = false;
  studyId;

  constructor(domainsAndColumnsToCheck, studyId: string) {
    this.studyId = studyId;
    this.domainsAndColumnsToCheck = domainsAndColumnsToCheck;
    this.missingColumnsInReqDomains = {};
    this.missingColumnsInOptDomains = {};
    this.missingDomains = [];
  }

  private checkMissingDomains(requiredDomainsAndCols: any) {
    const reqDomains = requiredDomainsAndCols['req_domains'] ? Object.keys(requiredDomainsAndCols['req_domains']) : [];
    const optDomains = requiredDomainsAndCols['opt_domains'] ? Object.keys(requiredDomainsAndCols['opt_domains']) : [];
    const missingReqDomains = reqDomains.filter((it) => studies[this.studyId].domains[it] === null);
    const missingOptDomains = optDomains.some((it) => studies[this.studyId].domains[it] !== null) ? [] : optDomains;
    const presentOptDomains = optDomains.filter((it) => studies[this.studyId].domains[it] !== null);
    this.missingDomains = missingReqDomains.concat(missingOptDomains);
    const requiredColumns = {};
    reqDomains.forEach((domain) => {
      requiredColumns[domain] = requiredDomainsAndCols['req_domains'][domain];
    });
    optDomains.forEach((domain) => {
      requiredColumns[domain] = requiredDomainsAndCols['opt_domains'][domain];
    });
    if (!this.missingDomains.length) {
      reqDomains.forEach((it) => {
        this.missingColumnsInReqDomains[it] = this.checkMissingColumns(it, requiredColumns);
      });
      presentOptDomains.forEach((it) => {
        this.missingColumnsInOptDomains[it] = this.checkMissingColumns(it, requiredColumns);
      });
    } else {
      reqDomains.forEach((it) => {
        this.missingColumnsInReqDomains[it] = this.checkMissingColumns(it, requiredColumns);
      });
      optDomains.forEach((it) => {
        this.missingColumnsInOptDomains[it] = this.checkMissingColumns(it, requiredColumns);
      });
    }
  }


  private checkMissingColumns(domain: string, requiredDomainsAndCols: any) {
    const domainColumns = studies[this.studyId].domains[domain] ?
      studies[this.studyId].domains[domain].columns.names() : [];
    const reqCols = requiredDomainsAndCols[domain]['req'] ?? [];
    //at least one of optional columns should exist in domain
    const optCols = requiredDomainsAndCols[domain]['opt'] ?? [];
    const missingReqColumns = reqCols.filter((it) => !domainColumns.includes(it));
    const missingOptColumns = optCols.some((it) => studies[this.studyId].domains[it] !== null) ? [] :
      optCols.filter((it) => !domainColumns.includes(it));
    const missingColumns = missingReqColumns.concat(missingOptColumns);
    return missingColumns;
  }


  validate() {
    if (!this.domainsAndColumnsToCheck)
      return true;

    this.checkMissingDomains(this.domainsAndColumnsToCheck);
    const missingReq = Object.keys(this.missingColumnsInReqDomains).length &&
        Object.keys(this.missingColumnsInReqDomains).some((it) => this.missingColumnsInReqDomains[it].length);
    const missingOpt = Object.keys(this.missingColumnsInOptDomains).length &&
        Object.keys(this.missingColumnsInOptDomains).every((it) => this.missingColumnsInOptDomains[it].length);
    return !this.missingDomains.length && !missingReq && !missingOpt;
  }
}
