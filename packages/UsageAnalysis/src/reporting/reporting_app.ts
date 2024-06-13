import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as interfaces from "datagrok-api/src/interfaces/d4";

export class ReportingApp {
  table?: DG.DataFrame;
  view?: DG.TableView;
  users: { [_: string]: any; } = {};
  parentCall: DG.FuncCall;
  currentFilter?: DG.Viewer<interfaces.IFiltersSettings>;

  constructor(parentCall: DG.FuncCall) {
    this.parentCall = parentCall;
  }

  async init(path?: string): Promise<void> {
    (await grok.dapi.users.list()).forEach((user) => {
      this.users[user.friendlyName] = {
        'avatar': user.picture,
        'name': user.friendlyName,
        'data': user,
      };
    });
    let reportNumber = -1;
    if (path && path !== '/') {
      const segments = path.split('/').filter((s) => s != '');
      if (segments.length === 1) {
        reportNumber = parseInt(segments[0]);
        this.table = await grok.dapi.reports.getReports(reportNumber);
      }
    }
    else
      this.table = await grok.dapi.reports.getReports();
    this.view = DG.TableView.create(this.table!, false);
    this.view.parentCall = this.parentCall;
    this.view.path = '';
    this.view.name = 'Reports';
    this.view.setRibbonPanels([[ui.button('Add rule...', async () => {
      await DG.UserReportsRule.showAddDialog();
    })]]);
    const loader: HTMLElement = ui.loader();
    this.view.root.appendChild(loader);
    await this.showPropertyPanel(this.table!);
    setTimeout(async () => {
      loader.parentElement?.removeChild(loader);
      this.view!._onAdded();
      await this.refresh(this.table!, this.view!.grid);
      if (reportNumber != -1) {
        const reports = await grok.dapi.reports.getReports();
        reports.rows.removeWhere((r) => r.get('number') === reportNumber);
        this.table?.appendMerge(reports);
        this.refreshFilter();
        setTimeout(async () => {
          await this.showPropertyPanel(this.table!);
          const length = this.table!.rowCount;
          for (let i = 0; i < length; i++) {
            if (this.view?.grid.cell('number', i).cell.value == reportNumber) {
              this.view?.grid.scrollToCell('date', i);
              break;
            }
          }
        }, 200);
      }
    }, 300);
  }

  refresh(table: DG.DataFrame, grid: DG.Grid) {
    grid.sort(['is_resolved', 'last_occurrence', 'errors_count'], [true, false, false]);
    table.getCol('number').setTag('friendlyName', '#');
    table.getCol('errors_count').setTag('friendlyName', 'errors');
    table.getCol('last_occurrence').setTag('friendlyName', 'last');
    table.getCol('first_occurrence').setTag('friendlyName', 'first');
    table.getCol('description').semType = 'Text';
    table.getCol('error_stack_trace').semType = 'Text';
    this.applyStyle(grid);
    grid.onCellPrepare(async (gc) => {
      if ((gc.gridColumn.name === 'reporter' || gc.gridColumn.name === 'assignee') && gc.cell.value) {
        const user = this.users[gc.cell.value];
        const icon = DG.ObjectHandler.forEntity(user.data)?.renderIcon(user.data.dart);
        if (icon) {
          icon.style.top = 'calc(50% - 8px)';
          icon.style.left = 'calc(50% - 8px)';
          gc.style.element = ui.tooltip.bind(icon, () => {
            return DG.ObjectHandler.forEntity(user.data)?.renderTooltip(user.data.dart)!;
          });
        }
      }
      if (gc.gridColumn.name === 'jira' && gc.cell.value) {
        const link = ui.link((gc.cell.value as string).replace('GROK-', ''), `https://reddata.atlassian.net/jira/software/c/projects/GROK/issues/${gc.cell.value}`);
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(link.href, '_blank');
        });
        link.style.position = 'absolute';
        link.style.top = 'calc(50% - 8px)';
        link.style.left = '3px';
        gc.style.element = ui.tooltip.bind(link, () => 'Link to JIRA ticket');
      }
    });
    const isAcknowledged = this.table!.getCol('is_resolved');
    grid.onCellRender.subscribe((gc) => {
      if (isAcknowledged.get(gc.cell.tableRowIndex ?? gc.cell.gridRow))
        gc.cell.style.textColor = 0xFFB8BAC0;
    });

    table.getCol('labels').setTag(DG.Tags.MultiValueSeparator, ',');
    table.onCurrentRowChanged.subscribe(async (_: any) => await this.showPropertyPanel(table));
    table.onValuesChanged.subscribe(async () => {
      grid.sort(['is_resolved', 'last_occurrence', 'errors_count'], [true, false, false]);
      // this._scroll(grid);
    });
    grok.events.onEvent('d4-report-changed').subscribe((r: DG.UserReport) => {
      const idCol = table.getCol('id');
      const length = idCol.length;
      for (let i = 0; i < length; i++) {
        if (idCol.get(i) === r.id) {
          table.cell(i, 'is_resolved').value = r.isResolved;
          table.cell(i, 'jira').value = r.jiraTicket;
          table.cell(i, 'assignee').value = r.assignee?.friendlyName;
          table.fireValuesChanged();
        }
      }
    });

    grok.events.onEvent('d4-report-deleted').subscribe((id: string) => {
      table.rows.removeWhere((r) => r.get('id') === id);
      if (table.rowCount > 0) {
        table.currentRowIdx = 0;
      }
    });

    grok.events.onEvent('d4-report-batch-changed').subscribe((data: {[_:string]: any}) => {
      const affectedIds = new Set(data['affected']);
      const fields = data['fields'];
      const idCol = table.getCol('id');
      const length = idCol.length;
      for (let i = 0; i < length; i++) {
        if (affectedIds.has(idCol.get(i))) {
          table.cell(i, 'is_resolved').value = fields['is_resolved'];
          table.cell(i, 'assignee').value = fields['assignee'];
          if (fields['label'])
            table.cell(i, 'labels').value =  `${table.cell(i, 'labels').value},${fields['label']}`;
        }
      }
      table.fireValuesChanged();
    });
    this.refreshFilter();
  }

  refreshFilter() {
    this.currentFilter?.close();
    this.currentFilter = DG.Viewer.filters(this.table!, {
      columnNames: ['date', 'labels', 'description', 'error_stack_trace', 'assignee', 'reporter'],
    });
    this.view?.addViewer(this.currentFilter);
  }

  applyStyle(viewer: DG.Grid) {
    viewer.columns.setOrder(['date', 'auto', 'number', 'errors_count', 'reporter', 'assignee', 'description', 'jira', 'labels', 'error_stack_trace', 'id', 'last_occurrence', 'first_occurrence']);
    viewer.col('reporter')!.width = 25;
    viewer.col('reporter')!.cellType = 'html';
    viewer.col('assignee')!.width = 25;
    viewer.col('assignee')!.cellType = 'html';

    viewer.col('jira')!.cellType = 'html';
    viewer.col('jira')!.width = 35;

    viewer.col('id')!.visible = false;
    viewer.col('error_stack_trace_hash')!.visible = false;
    viewer.col('is_resolved')!.visible = false;

    viewer.col('date')!.format = 'yyyy-MM-dd';
    viewer.col('date')!.width = 80;

    viewer.col('last_occurrence')!.format = 'yyyy-MM-dd';
    viewer.col('last_occurrence')!.width = 80;

    viewer.col('first_occurrence')!.format = 'yyyy-MM-dd';
    viewer.col('first_occurrence')!.width = 80;

    viewer.col('number')!.width = 35;
    viewer.col('errors_count')!.width = 40;

    viewer.col('description')!.width = 200;
    viewer.col('error_stack_trace')!.width = 200;
  }

  async showPropertyPanel(table: DG.DataFrame):Promise<void> {
    const currentRow = table.currentRowIdx;
    if (currentRow === -1) return;
    const reportId = table.getCol('id').get(currentRow);
    if (!reportId) return;
    this.updatePath(table.getCol('number').get(currentRow));
    const report = await grok.dapi.reports.find(reportId);
    if (report)
      grok.shell.setCurrentObject(DG.ObjectHandler.forEntity(report)!.renderProperties(report.dart), false);
  }

  updatePath(reportNumber: number): void {
    const segments = window.location.href.split('/');
    const last = segments[segments.length - 1];
    if (last === 'reports')
      segments.push(reportNumber.toString());
    else {
      if (/^-?\d+$/.test(last))
        segments[segments.length - 1] = reportNumber.toString();
      else
        return;
    }

    window.history.pushState(
      null, 'Report ${detailedLog.reportNumber}', segments.join('/'));
  }
}
