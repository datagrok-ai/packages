import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {category, test, before, expect, delay} from '@datagrok-libraries/utils/src/test';
import {previewMolstarUI} from '../viewers/molstar-viewer/utils';

import {_package} from '../package-test';

const validFileNames = ['1bdq.pdb', '1bdq.sdf', 'dc.mol2',
  '4tkx.mmcif', 'example.xyz', 'grofile.gro', 'pdbqt.pdbqt'];

const demoFilesPreviewList: string[] = [
  /* Not supported either Molstar or NGL
  '1crn.mtl', 'ala3.dcd', 'DPDP.nc', 'gpcr.xtc',
  /**/

  /* Not supported with Molstar, but supported with NGL
  '1blu.mmtf', '1crn.obj', '1crn_apbs.pqr', '3pqr.pqr', '3pqr.cns', 'DPDP.prmtop', 'gpcr.top',
   */

  /* Support is disable because of too common purpose file extenseion
  '3pqr_validation.xml',
  /**/

  // Supported with Molstar
  '1blu.pdb', '1crn.gro', '1crn.pdb', '1crn.ply',
  '1lee.ccp4', '2vts-docking.sdf', '2vts-protein.pdb', '3ek3-2fofc.cub',
  '3PQR.cif', '3str-2fofc.brix', '3str-2fofc.dsn6',
  'adrenalin.mol2', 'ala3.pdb', 'bromobenzene.pdb', 'd1h4vb1.ent', 'd1nj1a1.ent',
  'DPDP.pdb', 'esp.dx', 'esp.mol', 'ligands.sd',
  'popc.gro'];
const demoFilesPath: string = 'bio/ngl-formats';

category('MolstarPreview', () => {
  validFileNames.forEach((fn) => {
    test(`open-${fn.substring(fn.indexOf('.'), fn.length)}`, async () => {
      const folderName: string = `System:AppData/${_package.name}/samples`;
      const file = (
        await grok.dapi.files.list(folderName, false, fn))[0];

      const {view, loadingPromise} = previewMolstarUI(file);
      grok.shell.newView('Molstar Preview', [view]);
      await loadingPromise;
    });
  });

  // tests that opening csv through molstar causes exception. visually, error balloon should appear
  test('negative-openCsvFile', async () => {
    let noException = true;
    const folderName: string = `System:AppData/${_package.name}/samples`;
    const file = (await grok.dapi.files.list(folderName, false, 'dock.csv'))[0];

    try {
      const {view, loadingPromise} = previewMolstarUI(file);
      grok.shell.newView('Molstar Preview', [view]);
      await loadingPromise;
    } catch (e) {
      noException = false;
    }
    expect(noException, false);
  });

  category('MolstarPreview: DemoFiles', () => {
    let demoFilesNqName: string | undefined;

    before(async () => {
      const fileConnList = await grok.dapi.connections.include('params,entityTags')
        .filter('friendlyName="Demo Files"')
        .list();

      if (fileConnList.length > 0) demoFilesNqName = fileConnList[0].nqName; // break without an error
    });

    for (const fn of demoFilesPreviewList) {
      test(fn, async () => {
        if (!demoFilesNqName) return;

        const fiPath: string = `${demoFilesNqName}/${demoFilesPath}`;
        const fiList: DG.FileInfo[] = await grok.dapi.files.list(fiPath, false, fn);
        if (fiList.length === 0) throw new Error(`File not found '${fiPath}/${fn}'.`);

        const {view, loadingPromise} = previewMolstarUI(fiList[0]);
        grok.shell.newView(`Molstar Preview: `, [view]);
        // grok.shell.addView(view); // ???
        await loadingPromise;
        await delay(100);
      }, {timeout: 15000 /* loading file */});
    }
  });
});
