import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {GridSize, IAutoDockService} from '@datagrok-libraries/bio/src/pdb/auto-dock-service';
import {BiostructureData} from '@datagrok-libraries/bio/src/pdb/types';
import {getPdbHelper, IPdbHelper} from '@datagrok-libraries/bio/src/pdb/pdb-helper';
import {DockerContainerStatus, awaitStatus} from '@datagrok-libraries/bio/src/utils/docker';
import {Molecule3DUnitsHandler} from '@datagrok-libraries/bio/src/molecule-3d/molecule-3d-units-handler';
import {MoleculeUnitsHandler} from '@datagrok-libraries/bio/src/molecule/molecule-units-handler';

import {_package} from './constants';
import { getAutoDockService } from '../package';

namespace Forms {
  export type dockLigand = {
    /** PDB string of the receptor target structure */ receptor: string,
    /** */ receptor_format: string,
    /** PDB string of the ligand structure */ ligand: string, /* TODO: BiostructureDataJson support */
    /** */ ligand_format: string,
    /** */ autodock_gpf: string,
    /** */ pose_count: number,
  }
  export type dockLigandRes = {
    /** pdbqt */ poses: string;
  }

  export type dockLigandList = {
    receptor: string,
    receptor_format: string,
    ligand: string[],
    ligand_format: string,
    autodock_gpf: string,
    pose_count: number,
  }
  export type dockLigandListRes = {
    /** pdbqt */ ligand_results: { [ligandIdx: number]: string; }
  }

  export type LigandResults = {
    error?: string;
    poses?: string;
  }

}

export function buildDefaultAutodockGpf(receptorName: string, npts: GridSize): string {
  const res: string = `
npts ${npts.x} ${npts.y} ${npts.y}      # num.grid points in xyz
gridfld ${receptorName}.maps.fld                    # grid_data_file
spacing 0.375                                       # spacing(A)
receptor_types A C Fe N NA OA SA                    # receptor atom types
ligand_types A C N F NA OA HD SA                    # ligand atom types
receptor ${receptorName}.pdbqt                      # macromolecule 
gridcenter auto                                     # xyz-coordinates or auto
smooth 0.5                                          # store minimum energy w/in rad(A)
map ${receptorName}.A.map                           # atom-specific affinity map
map ${receptorName}.C.map                           # atom-specific affinity map
map ${receptorName}.N.map                           # atom-specific affinity map
map ${receptorName}.F.map                           # atom-specific affinity map
map ${receptorName}.NA.map                          # atom-specific affinity map
map ${receptorName}.OA.map                          # atom-specific affinity map
map ${receptorName}.HD.map                          # atom-specific affinity map
map ${receptorName}.SA.map                          # atom-specific affinity map
elecmap ${receptorName}.e.map                       # electrostatic potential map
dsolvmap ${receptorName}.d.map                      # desolvation potential map
dielectric -0.1465                                  # <0, AD4 distance-dep.diel;>0, constant
`.split('\n').filter((s) => !!s).join('\n');
  return res;
}

export class AutoDockService implements IAutoDockService {
  private readonly dcName: string;
  private dc!: DG.DockerContainer;
  private ph!: IPdbHelper;

  constructor() {
    this.dcName = `${_package.name.toLowerCase()}-autodock`;
  }

  async init(): Promise<void> {
    [this.dc, this.ph] = await Promise.all([
      // returns docker container with status not actual soon
      grok.dapi.docker.dockerContainers.filter(this.dcName).first(),
      getPdbHelper()
    ]);
    if (!this.dc)
      throw new Error(`AutoDock docker container not found '${this.dcName}'.`);
  }

  get ready(): boolean {
    return this.dc.status === 'started' || this.dc.status === 'checking';
  }

  async awaitStatus(targetStatus: DockerContainerStatus, timeout: number = 30000): Promise<void> {
    return awaitStatus(this.dc.id, targetStatus, timeout, _package.logger);
  }

  // -- Methods --
  async checkOpenCl(): Promise<number> {
    const path = '/check_opencl';
    const params: RequestInit = {
      method: 'GET',
    };
    const adRes = (await this.fetchAndCheck(path, params));
    const clinfoSuccess: boolean = adRes['success'];
    if (!clinfoSuccess)
      throw new Error(adRes['error']);

    const clinfoOut: string = adRes['output'];
    const clinfoOutMa = clinfoOut.match(/Number of platforms\s+(\d+)/);
    if (!clinfoOutMa)
      throw new Error('Unexpected clinfo output');
    const clinfoCount = parseInt(clinfoOutMa[1]);
    return clinfoCount;
  }

  async terminate(): Promise<void> {
    const params: RequestInit = {
      method: 'POST'
    };

    const path = `/autodock/kill_process`;
    await this.fetchAndCheck(path, params);
  }

  async dockLigand(receptor: BiostructureData, ligand: BiostructureData,
    autodockGpf: string, poseCount: number = 30, poseColName: string = 'poses', debug: boolean = false
  ): Promise<DG.DataFrame> {
    const form: Forms.dockLigand = {
      receptor: receptor.data as string,
      receptor_format: receptor.ext,
      ligand: ligand.data as string,
      ligand_format: ligand.ext,
      autodock_gpf: autodockGpf,
      pose_count: poseCount,
    };
    const params: RequestInit = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(form),
    };

    const path = `/autodock/dock_ligand`;
    // const adResStr = (await grok.dapi.docker.dockerContainers.request(this.dc.id, path, params))!;
    // const adRes: Forms.runRes = JSON.parse(adResStr) as Forms.runRes;
    // TODO: Use the new dockerContainers API
    const adRes = (await this.fetchAndCheck(path, params)) as Forms.dockLigandRes;
    const result = adRes as unknown as Forms.LigandResults;
    const poses = result.poses;

    // const modelList: string[] = wu(adRes.poses.matchAll(/MODEL.*?ENDMDL/gs/* lazy, not greedy */))
    //   .map((ma) => ma[0]).toArray();
    // const posesCol = DG.Column.fromStrings(poseColName ?? 'pdbqt_model', modelList);
    // // posesCol.semType = DG.SEMTYPE.MOLECULE3D;
    // // posesCol.meta.units = 'pdbqt';
    // const posesDf = DG.DataFrame.fromColumns([posesCol]);

    const posesDf: DG.DataFrame = poses 
      ? this.ph.parsePdbqt(adRes.poses, poseColName) 
      : DG.DataFrame.fromJson(JSON.stringify(result));
    return posesDf;
  }

  async dockLigandColumn(receptor: BiostructureData, ligandCol: DG.Column<string>,
    autodockGpf: string, poseCount: number = 30, poseColName: string = 'poses', debug: boolean = false
  ): Promise<DG.DataFrame> {
    //if (receptor.binary || receptor.ext !== 'pdb')
      //throw new Error(`Unsupported receptor ext '${receptor.ext}' or binary, must be 'pdb' string.`);

    let ligandPdbCol: DG.Column<string>;
    switch (ligandCol.semType) {
      case DG.SEMTYPE.MOLECULE: {
        const uh = MoleculeUnitsHandler.getOrCreate(ligandCol);
        ligandPdbCol = await uh.getAsPdb(this.ph);
        break;
      }
      case DG.SEMTYPE.MOLECULE3D: {
        const uh = Molecule3DUnitsHandler.getOrCreate(ligandCol);
        ligandPdbCol = await uh.getAsPdb(this.ph);
        break;
      }
      default:
        throw new Error(`Unsupported ligand column semantic type, ` +
          `must be '${DG.SEMTYPE.MOLECULE}' or '${DG.SEMTYPE.MOLECULE3D}'.`);
    }

    const form: Forms.dockLigandList = {
      receptor: receptor.data as string,
      receptor_format: receptor.ext,
      ligand: ligandPdbCol.toList() as string[],
      ligand_format: 'pdb',
      autodock_gpf: autodockGpf,
      pose_count: poseCount,
    };

    const path = '/autodock/dock_ligand_list';
    const params: RequestInit = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(form),
    };
    const adRes = await this.fetchAndCheck(path, params) as Forms.dockLigandListRes;

    let posesAllDf: DG.DataFrame | undefined = undefined;
    for (const [ligandIdx, ligandPoses] of Object.entries(adRes.ligand_results)) {
      const ligand = ligandPoses as unknown as Forms.LigandResults;
      const poses = ligand['poses'];
      const posesDf: DG.DataFrame | undefined = poses ? this.ph.parsePdbqt(poses, poseColName) : undefined;

      if (posesAllDf === undefined) {
        posesAllDf = posesDf;
      } else {
        posesAllDf.append(posesDf!, true);
      }
    }

    return posesAllDf!;
  }

  private async fetchAndCheck(path: string, params: RequestInit): Promise<any> {
    // @ts-ignore
    const adResponse: Response = await grok.dapi.docker.dockerContainers.fetchProxy(this.dc.id, path, params);
    if (adResponse.status !== 200) {
      const errMsg = adResponse.statusText;
      // const errMsg = (await adResponse.json())['datagrok-error'];
      // throw new Error(errMsg);
    }
    const adRes = (await adResponse.json()) as Forms.dockLigandRes;
    if ('datagrok-error' in adRes) {
      const errVal = adRes['datagrok-error'];
      const errMsg = errVal ? errVal.toString() : 'Unknown error';
      throw new Error(errMsg);
    }
    return adRes;
  }

  static async getSvc(): Promise<IAutoDockService> {
    const svc: AutoDockService = new AutoDockService();
    await svc.init();
    return svc;
  }
}

export async function _runAutodock(
  receptor: DG.FileInfo, ligand: DG.FileInfo, npts: GridSize
): Promise<DG.DataFrame | null> {
  const svc: IAutoDockService = new AutoDockService();
  if (!svc.ready) {
    grok.shell.warning('Autodock container not started yet.');
    return null;
  }

  const receptorStr = await receptor.readAsString();
  const receptorData: BiostructureData = {binary: false, ext: receptor.extension, data: await receptor.readAsString()};
  const ligandData: BiostructureData = {binary: false, ext: ligand.extension, data: await ligand.readAsString()};
  const autodockGpf = buildDefaultAutodockGpf(receptor.fileName, npts);
  return await svc.dockLigand(receptorData, ligandData, autodockGpf);
}

export async function _runAutodock2(molCol: DG.Column<string>, receptor: BiostructureData): Promise<void> {
  // const receptorPdb: string = await receptorFi.readAsString();

  let resDf: DG.DataFrame | undefined = undefined;

  const adSvc = await getAutoDockService();
  await adSvc.awaitStatus('started', 30000);
  const ph = await getPdbHelper();
  for (let lRowI = 0; lRowI < molCol.length; ++lRowI) {
    const t1 = window.performance.now();
    try {
      const ligandMol = molCol.get(lRowI);
      const ligandPdb = await ph.molToPdb(ligandMol!);
      const ligandData: BiostructureData = {binary: false, data: ligandPdb, ext: 'pdb'};
      const autodockGpf = buildDefaultAutodockGpf(receptor.options!.name!, new GridSize(40, 40, 40));

      const posesDf = await adSvc.dockLigand(receptor, ligandData, autodockGpf, 10);

      if (resDf === undefined)
        resDf = posesDf.clone(DG.BitSet.create(posesDf.rowCount, (_i) => false));

      resDf!.append(posesDf, true);
    } finally {
      const t2 = window.performance.now();
      _package.logger.debug('_runAutodock2(), ' + `ligand: ${lRowI}, ` + `ET: ${t2 - t2} ms, `);
    }
  }

  if (resDf !== undefined)
    DG.Utils.download('models.csv', resDf.toCsv());
  else
    window.alert('Empty result');
}

