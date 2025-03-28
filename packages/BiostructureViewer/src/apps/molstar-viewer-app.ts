import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {BiostructureProps} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';
import {PROPS as msPROPS} from '../viewers/molstar-viewer/molstar-viewer';

import {_package} from '../package';

export class MolstarViewerApp {
  private readonly appFuncName: string;

  constructor(appFuncName: string) {
    this.appFuncName = appFuncName;
  }

  async init(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    // TODO: Call platform file read function
    const sdfBytes: Uint8Array = await _package.files.readAsBytes('samples/mol1K.sdf');
    const df: DG.DataFrame = (await grok.functions.call(
      'Chem:importSdf', {bytes: sdfBytes}))[0];

    await this.setData(df);
  }

  // -- Data --

  private df?: DG.DataFrame;

  async setData(df: DG.DataFrame): Promise<void> {
    this.df = df;

    await this.buildView();
  }

  // -- View --

  private view?: DG.TableView;

  async buildView(): Promise<void> {
    if (!this.df) throw new Error('df is not set');

    this.view = grok.shell.addTableView(this.df);
    this.view.path = this.view.basePath = `func/${_package.name}.${this.appFuncName}`;

    const pdbStr: string = await _package.files.readAsText('samples/protease.pdb');

    const viewer: DG.Viewer<BiostructureProps> = (await this.view.dataFrame.plot.fromType('Biostructure', {
      [msPROPS.pdb]: pdbStr,
    }));
    this.view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Molstar', 0.4);
  }
}
