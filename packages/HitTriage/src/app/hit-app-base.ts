import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {_package} from '../package';
import {AppName, ComputeFunctions, HitDesignCampaign, HitTriageCampaign} from './types';
import {funcTypeNames, HitTriageComputeFunctionTag} from './consts';
import {checkEditPermissions} from './utils';

export abstract class HitAppBase<T> {
  public dataFrame?: DG.DataFrame;
  public template?: T;
  public baseUrl!: string;
  public computeFunctions: ComputeFunctions;
  protected isJoining = false;
  protected hasEditPermission = false;
  private _appName: AppName;
  public get appName(): AppName {return this._appName;}
  public static molFileExtReaders: { ext: string; handlerFunc: DG.Func }[] = ['sdf', 'mol', 'smi', 'mol2']
    .map((ext) => {
      const handlerFunc =
      DG.Func.find({tags: ['file-handler']})
        .find((f) => f?.options?.ext && typeof f.options.ext === 'string' && f.options.ext.split(',').includes(ext));
      return {ext, handlerFunc: handlerFunc as DG.Func};
    })
    .filter((it) => it.handlerFunc);

  // public layouts: Promise<DG.ViewLayout[]>;
  constructor(public parentCall: DG.FuncCall, appN: AppName) {
    this._appName = appN;
    const funcs = DG.Func.find({tags: [HitTriageComputeFunctionTag]});
    const functions = funcs.filter((f) => f.type === funcTypeNames.function);
    const scripts = funcs.filter((f) => f.type === funcTypeNames.script) as DG.Script[];
    const queries = funcs.filter((f) => f.type === funcTypeNames.query) as DG.DataQuery[];
    this.resetBaseUrl();
    this.computeFunctions = {functions, scripts, queries};

    // this.layouts = new Promise<DG.ViewLayout[]>(async (resolve) => {
    //   // we need all layouts, as applicable ones might not be enaugh
    //   const layouts = await grok.dapi.layouts.list();
    //   resolve(layouts);
    // });
  }

  protected async setCanEdit(campaign: HitTriageCampaign | HitDesignCampaign) {
    if (!campaign.authorUserId || !campaign.permissions) {
      this.hasEditPermission = true; // if there is no author, then it is a new campaign
      return;
    }
    this.hasEditPermission = await checkEditPermissions(campaign.authorUserId, campaign.permissions);
  }

  public resetBaseUrl() {
    const href = window.location.href;
    const urlObj = new URL(href);
    this.baseUrl = urlObj.origin + urlObj.pathname;
  }

  protected getFilterType(colName: string): DG.FILTER_TYPE {
    const col = this.dataFrame!.col(colName);
    if (col?.semType === DG.SEMTYPE.MOLECULE)
      return DG.FILTER_TYPE.SUBSTRUCTURE;
    if (col?.type === DG.COLUMN_TYPE.BOOL)
      return DG.FILTER_TYPE.BOOL_COLUMNS;
    if (col?.type === DG.COLUMN_TYPE.STRING)
      return DG.FILTER_TYPE.CATEGORICAL;
    return DG.FILTER_TYPE.HISTOGRAM;
  }

  public download(df: DG.DataFrame, name: string, onlyFiltered = false): void {
    const element = document.createElement('a');
    const result = DG.DataFrame.fromColumns(df.columns.toList().filter((c) => !c.name.startsWith('~')))
      .toCsv({filteredRowsOnly: onlyFiltered});
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result));
    element.setAttribute('download', name + '.csv');
    element.click();
  }

  public async getNewCampaignName(folderName: string, templateKey: string) {
    const templateCampaigns = (await _package.files.list(folderName))
      .map((file) => file.name)
      .filter((name) => name.startsWith(`${templateKey}-`) && !!parseInt(name.substring(templateKey.length + 1)));
    if (templateCampaigns.length === 0)
      return templateKey + '-1';
    const postFixes = templateCampaigns
      .map((c) => c.substring(templateKey.length + 1))
      .filter(Boolean).map((c) => parseInt(c, 10))
      .sort((a, b) => a - b);// sort in ascending order
    return templateKey + '-' + ((postFixes[postFixes.length - 1] + 1).toString());
  }

  public setBaseUrl() {
    const title = document.title;
    if (history.replaceState) {
      const obj = {
        Title: title,
        Url: this.baseUrl,
      };
      history.replaceState(obj, obj.Title, obj.Url);
    }
  }

  /// creates a union of two dataframes based on a molecule column and adds to second dataframe
  protected unionDataframes(df1: DG.DataFrame, df2: DG.DataFrame, molColName1: string, molColName2: string) {
    const prevCol1Name = molColName1;
    df1.col(molColName1)!.name = molColName2;
    molColName1 = molColName2;
    const df1MolCol: string[] | undefined = df1.col(molColName1)?.toList()?.filter((it) => !!it)
      .map((it) => DG.chem.convert(it, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles));
    const df2MolCol: string[] | undefined = df2.col(molColName2)?.toList()?.filter((it) => !!it)
      .map((it) => DG.chem.convert(it, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles));
    if (!df1MolCol || !df2MolCol)
      throw new Error('Molecule column not found');
    const df2MolMap = new Map<string, number>();
    df2MolCol.forEach((it, i) => df2MolMap.set(it, i));
    this.isJoining = true;
    try {
    // first check that all columns are there
      const addedColNames: string[] = [];
      for (const col of df1.columns) {
        if (!df2.columns.contains(col.name)) {
          const addedCol = df2.columns.addNew(col.name, col.type);
          if (col.semType)
            addedCol.semType = col.semType;
          addedColNames.push(col.name);
        }
      }
      for (let i = 0; i < df1MolCol.length; i++) {
        if (!df2MolMap.has(df1MolCol[i])) {
          df2.rows.addNew(null, true);
          for (const col of df1.columns) {
            const value = col.get(i);
            df2.col(col.name)!.set(df2.rowCount - 1, value, false);
          }
        } else if (addedColNames.length > 0) {
          const row = df2MolMap.get(df1MolCol[i])!;
          for (const colName of addedColNames) {
            const value = df1.col(colName)!.get(i);
            df2.col(colName)!.set(row, value, false);
          }
        }
      }
    } finally {
      setTimeout(() => {
        this.isJoining = false;
      }, 500);
      df1.col(molColName1)!.name = prevCol1Name;
    }
    return df2;
  }
}
