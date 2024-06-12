import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { BiostructureData } from '@datagrok-libraries/bio/src/pdb/types';
import { getPdbHelper, IPdbHelper } from '@datagrok-libraries/bio/src/pdb/pdb-helper';
import { errInfo } from '@datagrok-libraries/bio/src/utils/err-info';
import { _package, CACHED_ADCP, POSE_COL } from '../utils/constants';

export type AdcpDataType = {
  ligandDf: DG.DataFrame,
  ligandMolColName: string,
  receptor: BiostructureData,
  target: string,
  searches: number,
  evaluations: number
}

export type AdcpDataRequest = {
  ligand: string;
  receptor: string;
  ligand_format: string;
  receptor_format: string;
  target: string;
  searches: number;
  evaluations: number;
}

export type AdcpResultType = {
  csv_output: string;
  pose: string;
  error?: string;
};

export class AdcpApp {
  private readonly appFuncName: string;
  private readonly poseColName: string = 'pose';
  private data!: AdcpDataType;

  constructor(appFuncName: string = 'adcpApp') {
    this.appFuncName = appFuncName;
  }

  async init(data: AdcpDataType): Promise<DG.DataFrame | undefined> {
    this.data = data;
    if (!!data) {
      return await this.getAdcpResults();
    }
  }

  /** Handles {@link runBtn} click */
  async getAdcpResults(): Promise<DG.DataFrame | undefined> {
    const pi = DG.TaskBarProgressIndicator.create('ADCP running...');
    try {
      const ligandCol = this.data.ligandDf.getCol(this.data.ligandMolColName);
      const result = await this.runAdcp(this.data.receptor, ligandCol, this.data.target, this.data.searches, this.data.evaluations, this.poseColName, pi);
      const posesAllDf = result?.posesAllDf;
      const errorValues = result?.errorValues;
      if (posesAllDf !== undefined) {
        errorValues?.forEach(({index, value}) => {
          posesAllDf.rows.insertAt(index, 1);
          const poseCol = posesAllDf.columns.byName(POSE_COL);
          if (poseCol === undefined)
            posesAllDf.columns.addNewString(POSE_COL);
          
          posesAllDf.set(POSE_COL, index, value);
        });
        //@ts-ignore
        CACHED_ADCP.K.push(this.data);
        //@ts-ignore
        CACHED_ADCP.V.push(posesAllDf);
        return posesAllDf;
      }
    } catch (err: any) {
      const [errMsg, errStack] = errInfo(err);
      grok.shell.error(errMsg);
      _package.logger.error(errMsg, undefined, errStack);
    } finally {
      pi.close();
    }
  }

  private async getContainer() {
    const adcpContainer = await grok.dapi.docker.dockerContainers.filter('adcp').first();
    if (adcpContainer.status !== 'started' && adcpContainer.status !== 'checking') {
      await grok.dapi.docker.dockerContainers.run(adcpContainer.id, true);
    }
    return adcpContainer;
  }

  private async createAdcpRequest(data: AdcpDataRequest, containerId: string): Promise<AdcpResultType> {
    const params: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

    const response = await grok.dapi.docker.dockerContainers.fetchProxy(containerId, 'adcp/dock', params);
    if (response.status !== 200) {
      throw new Error(response.statusText);
    }

    return await response.json();
  }

  private async runAdcp(
    receptorData: BiostructureData, ligandCol: DG.Column<string>, target: string, searches: number, evaluations: number, poseColName: string, pi: DG.ProgressIndicator
  ): Promise<{ posesAllDf?: DG.DataFrame, errorValues: { index: number, value: string }[] }> {
    const container = await this.getContainer();
    const pdbHelper: IPdbHelper = await getPdbHelper();
    let posesAllDf: DG.DataFrame = DG.DataFrame.create();
    const errorValues: { index: number, value: string }[] = [];

    const ligandRowCount = ligandCol.length;
    for (let lRowI = 0; lRowI < ligandRowCount; ++lRowI) {
      const ligandMol = ligandCol.semType === DG.SEMTYPE.MOLECULE 
        ? await grok.functions.call('Chem:convertMolNotation', {
            molecule: ligandCol.get(lRowI),
            sourceNotation: 'unknown',
            targetNotation: 'v3Kmolblock'
          })
        : ligandCol.get(lRowI);
      
      //const ligandPdb = await pdbHelper.molToPdb(ligandMol!);

      const data: AdcpDataRequest = {
        ligand: ligandMol,
        receptor: receptorData.data as string,
        ligand_format: 'pdbqt',
        receptor_format: receptorData.ext,
        target,
        searches,
        evaluations
      };

      const result = await this.createAdcpRequest(data, container.id);
      const error = result.error;
      if (error !== undefined) {
        errorValues[errorValues.length] = {index: lRowI, value: error};
        continue;
      }

      const resultDf = DG.DataFrame.fromCsv(result.csv_output);
      resultDf.rows.removeWhereIdx(idx => idx > 0);
      
      const pose = result.pose;
      const poseCol = DG.Column.fromList('string', poseColName, [pose]);

      const posesDf = resultDf;
      posesDf.columns.insert(poseCol, 0);

      if (posesAllDf === undefined) {
        posesAllDf = posesDf;
      } else {
        posesAllDf.append(posesDf, true);
      }

      pi.update(100 * lRowI / ligandRowCount, 'ADCP running...');
    }

    return { posesAllDf, errorValues };
  }
}