import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {BiostructureData} from './types';
import {DockerContainerStatus} from '../utils/docker';

export enum AutoDockErrorLevel { Info, Warning, Error};

export class AutoDockError extends Error {
  constructor(
    public readonly level: AutoDockErrorLevel,
    message: string
  ) {
    super(message);
  }
}

export class AutoDock {
  static error(message: string): AutoDockError {
    return new AutoDockError(AutoDockErrorLevel.Error, message);
  }

  static warning(message: string): AutoDockError {
    return new AutoDockError(AutoDockErrorLevel.Warning, message);
  }

  static info(message: string): AutoDockError {
    return new AutoDockError(AutoDockErrorLevel.Info, message);
  }
}

/** Number of grid points. Each must be an event integer number.  */
export class GridSize {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {
    if (x % 2 !== 0) throw AutoDock.error('Grid number x must be even.');
    if (y % 2 !== 0) throw AutoDock.error('Grid number y must be even.');
    if (z % 2 !== 0) throw AutoDock.error('Grid number z must be even.');
  }
}

export type AutoDockRunResult = {
  posesDf: DG.DataFrame
};

export interface IAutoDockService {
  get ready(): boolean;

  awaitStatus(targetStatus: DockerContainerStatus, timeout?: number): Promise<void>;

  checkOpenCl(): Promise<number>;

  /**
   * @param receptor  PDB string of target (receptor) structure
   * @param ligand    PDB or mol structure of the ligand to be docked
   * @param npts      Grid
   */
  dockLigand(receptor: BiostructureData, ligand: BiostructureData, autodockGpf: string, poseCount?: number,
    posColName?: string
  ): Promise<DG.DataFrame>;

  dockLigandColumn(receptor: BiostructureData, ligandCol: DG.Column<string>, autodockGpf: string, poseCount?: number,
    posColName?: string
  ): Promise<DG.DataFrame>;

  terminate(): Promise<void>;
}

export async function getAutoDockService(): Promise<IAutoDockService> {
  const packageName: string = 'Docking';
  const funcName: string = 'getAutoDockService';
  const funcList = DG.Func.find({package: packageName, name: funcName});
  if (funcList.length === 0)
    throw new Error(`Package '${packageName}' must be installed for AutoDock service.`);
  const res: IAutoDockService = (await funcList[0].prepare().call()).getOutputParamValue();
  return res;
}
