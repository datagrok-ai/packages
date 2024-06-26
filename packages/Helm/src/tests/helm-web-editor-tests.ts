import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {after, before, category, delay, expect, test, expectArray} from '@datagrok-libraries/utils/src/test';
import {getMonomerLibHelper, IMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';
import {
  getUserLibSettings, setUserLibSettings, setUserLibSettingsForTests
} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';
import {IHelmHelper, getHelmHelper} from '@datagrok-libraries/bio/src/helm/helm-helper';

category('helm-web-editor', async () => {
  let monomerLibHelper: IMonomerLibHelper;
  let userLibSettings: UserLibSettings;

  let hh: IHelmHelper;

  before(async () => {
    monomerLibHelper = await getMonomerLibHelper();
    userLibSettings = await getUserLibSettings();
    await setUserLibSettingsForTests();
    await monomerLibHelper.awaitLoaded();
    await monomerLibHelper.loadLibraries(true);

    hh = await getHelmHelper();
  });

  after(async () => {
    await setUserLibSettings(userLibSettings);
    await monomerLibHelper.loadLibraries(true);
  });

  test('helm-web-editor', async () => {
    const editor = hh.createHelmWebEditor();
  });

  test('web-editor-app', async () => {
    const helmStr: string = 'PEPTIDE1{I.H.A.N.T.Thr_PO3H2.Aca.D-Tyr_Et}$$$$';

    const appHost = ui.div([],
      {style: {width: '700px', height: '432px'}});
    const app = hh.createWebEditorApp(appHost, helmStr);

    const dlg = ui.dialog().add(appHost).show();
    try {

    } finally {
      dlg.close();
    }
  });
});
