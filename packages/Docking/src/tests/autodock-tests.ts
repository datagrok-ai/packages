import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {before, category, expect, test} from '@datagrok-libraries/utils/src/test';
import {getAutoDockService, GridSize, IAutoDockService} from '@datagrok-libraries/bio/src/pdb/auto-dock-service';
import {BiostructureData} from '@datagrok-libraries/bio/src/pdb/types';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';

import {_package} from '../package-test';
import {buildDefaultAutodockGpf} from '../utils/auto-dock-service';
import { fetchWrapper } from '@datagrok-libraries/utils/src/fetch-utils';


category('AutoDock', () => {
  let adSvc: IAutoDockService | null;

  before(async () => {
    try {
      // Initialize the service if not already initialized
      if (!adSvc)
        adSvc = await getAutoDockService();
   
      const dockingContainer = await grok.dapi.docker.dockerContainers.filter('docking').first();
      if (!dockingContainer.status.startsWith('started'))
        await grok.dapi.docker.dockerContainers.run(dockingContainer.id, true); 
    } catch (err: unknown) {
      // Log any errors during initialization
      const [errMsg, errStack] = errInfo(err);
      _package.logger.error(errMsg, undefined, errStack);
    }
  });

  test('clinfo', async () => {
    if (!adSvc) return;

    const clinfoCount = await fetchWrapper(() => adSvc!.checkOpenCl());
    expect(clinfoCount > 0, true, 'OpenCL platform not found.');
  }, {timeout: 50000});

  test('dock ligand', async () => {
    if (!adSvc) return;

    const receptorPdb = await _package.files.readAsText('samples/1bdq-wo-ligands.pdb');
    const ligandPdb = await _package.files.readAsText('samples/1bdq-ligand-0.by-babel.pdb');
    if (receptorPdb === '' && ligandPdb === '')
      throw new Error('Empty test data');

    const receptorData: BiostructureData = {binary: false, ext: 'pdb', data: receptorPdb};
    const ligandData: BiostructureData = {binary: false, ext: 'pdb', data: ligandPdb};
    const npts = new GridSize(20, 20, 20);
    const autodockGpf = buildDefaultAutodockGpf('1bdq', npts);
    const posesDf = await fetchWrapper(() => adSvc!.dockLigand(receptorData, ligandData, autodockGpf, 10));
    expect(posesDf.rowCount, 10);
  }, {timeout: 60000});

  test('dock ligand column', async () => {
    if (!adSvc) return;
    
    const receptorPdb = await _package.files.readAsText('samples/1bdq-wo-ligands.pdb');
    const sdfBytes: Uint8Array = await _package.files.readAsBytes('samples/1bdq-short.sdf');
    const ligandDf: DG.DataFrame = (await grok.functions.call('Chem:importSdf', {bytes: sdfBytes}))[0];
    const ligandCol = ligandDf.getCol('molecule');
    ligandCol.meta.units = 'mol';
    grok.shell.addTableView(DG.DataFrame.fromColumns([ligandCol]));
    if (receptorPdb === '' || !ligandCol)
      throw new Error('Empty test data');

    const receptorData: BiostructureData = {binary: false, ext: 'pdb', data: receptorPdb};
    const npts = new GridSize(20, 20, 20);
    const autodockGpf = buildDefaultAutodockGpf('1bdq', npts);
    const posesDf = await adSvc.dockLigandColumn(receptorData, ligandCol, autodockGpf, 10);
    expect(posesDf.rowCount, 30);
  }, {timeout: 90000});
}, {owner: 'oserhiienko@datagrok.ai'});
