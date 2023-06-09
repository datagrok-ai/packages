import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {_package} from '../package';
import {IBiostructureViewer} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';
import {IViewer} from '@datagrok-libraries/bio/src/viewers/viewer';
import {NglProps} from '@datagrok-libraries/bio/src/viewers/ngl-gl-viewer';
import {Observable} from 'rxjs';

interface INglViewer extends IViewer {
    get onAfterBuildView(): Observable<void>;
    setOptions(options: Partial<NglProps>): void;
}

export abstract class LigandsWithBase {
  constructor(
    private readonly appFuncName: string,
  ) { }

  async init(): Promise<void> {
    const [df, pdb]: [DG.DataFrame, string] = await LigandsWithBase.loadDefaultData();

    this.df = df;
    this.pdb = pdb;
    this.setData();
  }

  static async loadDefaultData(): Promise<[DG.DataFrame, string]> {
    const [df, pdb]: [DG.DataFrame, string] = await Promise.all([
      (async () => {
        const sdfBytes: Uint8Array = await _package.files.readAsBytes('samples/1bdq-ligands.sdf');
        const df: DG.DataFrame = (await grok.functions.call(
          'Chem:importSdf', {bytes: sdfBytes}))[0];
        return df;
      })(),
      (async () => {
        const pdbStr: string = await _package.files.readAsText('samples/1bdq-wo-ligands.pdb');
        return pdbStr;
      })()]);
    return [df, pdb];
  }

  // -- Data --

  protected df?: DG.DataFrame;
  protected pdb: string;

  setData(): void {
    this.viewPromise = this.viewPromise.then(async () => {
      await this.buildView();
    });
  }

  // -- View --

  protected view?: DG.TableView;
  protected viewPromise: Promise<void> = Promise.resolve();

  async buildView(): Promise<void> {
    if (!this.df) throw new Error('df is not set');

    this.view = grok.shell.addTableView(this.df);
    this.view.path = this.view.basePath = `func/${_package.name}.${this.appFuncName}`;

    await this.buildViewViewer();
  }

  abstract buildViewViewer(): Promise<void>;
}

export class LigandsWithNglApp extends LigandsWithBase {
  // -- View --

  override async buildViewViewer(): Promise<void> {
    const viewer: DG.Viewer & INglViewer = (await this.df!.plot.fromType('NGL', {
      pdb: this.pdb,
    })) as DG.Viewer & INglViewer;
    this.view!.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'NGL', 0.35);
  }
}

export class LigandsWithBiostructureApp extends LigandsWithBase {
  // -- View --

  override async buildViewViewer(): Promise<void> {
    const viewer: DG.Viewer & IBiostructureViewer = (await this.df!.plot.fromType('Biostructure', {
      pdb: this.pdb,
      showSelectedRowsLigands: false,
      showCurrentRowLigand: true,
      showMouseOverRowLigand: true,
    })) as DG.Viewer & INglViewer;
    this.view!.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure', 0.35);
  }
}
