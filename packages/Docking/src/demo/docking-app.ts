import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {BaseViewApp} from '@datagrok-libraries/tutorials/src/demo-base-view';
import { IAutoDockService } from '@datagrok-libraries/bio/src/pdb/auto-dock-service';

import { getAutoDockService, getAutodockSingle, runDocking } from '../package';

export class DockingViewApp extends BaseViewApp {
  constructor(parentCall: DG.FuncCall) {
    super(parentCall);

    this.formGenerator = this.generateCustomForm;
    this.uploadCachedData = this.loadCachedAutodockData.bind(this);
    this.abort = this.terminateProcess;
    this.sketcherValue = {'(5~{S})-5-(1~{H}-indol-2-yl)pyrrolidin-2-one': 'c1ccc2c(c1)cc([nH]2)[C@@H]3CCC(=O)N3'};
    this.addTabControl = false;
    this.tableName = 'Docking';
  }

  private async generateCustomForm(): Promise<HTMLElement | null> {
    const smilesCell = this.tableView!.grid.cell('smiles', 0);
    const semValue = DG.SemanticValue.fromGridCell(smilesCell);

    const molstarWidget = await runDocking(semValue, 'kras', 10);
    this.applyFullSizeStyles(molstarWidget?.root?.firstElementChild as HTMLElement);

    if (molstarWidget)
      return molstarWidget.root;
    return null;
  }

  private async loadCachedAutodockData(): Promise<HTMLElement> {
    const datasetPath = 'System:AppData/Docking/demo_files/demo_app_sample.csv';
    const csvText = await grok.dapi.files.readAsText(datasetPath);
    const sampleData = DG.DataFrame.fromCsv(csvText);

    const poseColumn = sampleData.getCol('pose');
    poseColumn.semType = DG.SEMTYPE.MOLECULE3D;
    poseColumn.setTag(DG.TAGS.UNITS, 'pdb');

    this.tableView!.dataFrame = sampleData;
    await grok.data.detectSemanticTypes(sampleData);
    this.tableView!.grid.invalidate();

    const dockingWidget = await this.createDockingWidget(sampleData.cell(0, 'pose'), sampleData);
    return dockingWidget!;
  }

  private async createDockingWidget(cell: DG.Cell, dataFrame: DG.DataFrame): Promise<HTMLElement | null> {
    const semValue = DG.SemanticValue.fromTableCell(cell);
    const widget = (await getAutodockSingle(semValue, false, dataFrame));

    if (widget) {
      this.applyFullSizeStyles(widget.root.firstElementChild as HTMLElement);
      return widget.root;
    }
    return null;
  }

  private applyFullSizeStyles(element: HTMLElement | null): void {
    if (!element) return;

    element.style.width = '100%';
    element.style.height = '100%';
  }

  private async terminateProcess() {
    const svc: IAutoDockService = await getAutoDockService();
    await svc.terminate();
  }
}
