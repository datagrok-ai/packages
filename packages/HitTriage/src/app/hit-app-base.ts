import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {_package} from '../package';

export class HitAppBase<T> {
  public dataFrame?: DG.DataFrame;
  public template?: T;
  public baseUrl!: string;
  constructor() {
    this.resetBaseUrl();
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
      .filter((name) => name.startsWith(templateKey));
    if (templateCampaigns.length === 0)
      return templateKey + '-1';
    const postFixes = templateCampaigns.map((c) => c.split('-')[1]).filter(Boolean).map((c) => parseInt(c, 10)).sort();
    return templateKey + '-' + ((postFixes[postFixes.length - 1] + 1).toString());
  }

  protected setBaseUrl() {
    const title = document.title;
    if (history.replaceState) {
      const obj = {
        Title: title,
        Url: this.baseUrl,
      };
      history.replaceState(obj, obj.Title, obj.Url);
    }
  }
}
