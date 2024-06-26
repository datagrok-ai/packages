import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';


import {after, before, category, delay, expect, test, expectArray, timeout} from '@datagrok-libraries/utils/src/test';
import {HelmType, Mol, OrgType} from '@datagrok-libraries/bio/src/helm/types';
import {JSDraw2HelmModule} from '../types';
import {getMonomerLibHelper, IMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';
import {
  getUserLibSettings, setUserLibSettings, setUserLibSettingsForTests
} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';

declare const org: OrgType;
declare const JSDraw2: JSDraw2HelmModule;

type TestTgtType = { atomCount: number, bondCount: number };

category('parseHelm', () => {
  const testData: { [testName: string]: { src: string, tgt: TestTgtType } } = {
    'PT': {
      src: 'PEPTIDE1{[L-hArg(Et,Et)].E.F.G}|PEPTIDE2{C.E}$PEPTIDE1,PEPTIDE2,2:R3-1:R1$$$V2.0',
      tgt: {atomCount: 6, bondCount: 5}
    },
    'RNA': {
      src: 'RNA1{[dhp]([m1A])p.r(T)p.r(T)p.r(G)p}$$$$V2.0',
      tgt: {atomCount: 12, bondCount: 11}
    }
  };

  let libHelper: IMonomerLibHelper;
  /** Backup actual user's monomer libraries settings */
  let userLibSettings: UserLibSettings;

  before(async () => {
    libHelper = await getMonomerLibHelper();

    await timeout(async () => { userLibSettings = await getUserLibSettings(); }, 5000,
      'get user lib settings for backup');

    // parseHelm is dependent on monomers RGroups available, test requires default monomer library
    await setUserLibSettingsForTests();
    await timeout(async () => { await libHelper.awaitLoaded(); }, 5000,
      'await monomerLib to be loaded');
    await libHelper.loadLibraries(true);
  });

  after(async () => {
    await setUserLibSettings(userLibSettings);
    await libHelper.loadLibraries(true);
  });

  for (const [testName, {src, tgt}] of Object.entries(testData)) {
    test(`Editor-${testName}`, async () => {
      _testParseHelmWithEditor(src, tgt);
    });
  }

  for (const [testName, {src, tgt}] of Object.entries(testData)) {
    test(`woDOM-${testName}`, async () => {
      _testParseHelmWithoutDOM(src, tgt);
    });
  }
});

function _testParseHelmWithEditor(src: string, tgt: TestTgtType): void {
  const io = org.helm.webeditor.IO;

  const editorHost = ui.div();
  const editor = new JSDraw2.Editor(editorHost, {viewonly: true});

  const plugin = new org.helm.webeditor.Plugin(editor);
  const origin = new JSDraw2.Point(0, 0);
  io.parseHelm(plugin, src, origin, null);

  const m: Mol<HelmType> = plugin.jsd.m;
  expect(m.atoms.length, tgt.atomCount);
  expect(m.bonds.length, tgt.bondCount);
}

function _testParseHelmWithoutDOM(src: string, tgt: TestTgtType): void {
  const io = org.helm.webeditor.IO;

  const molHandler = new JSDraw2.MolHandler();

  const plugin = new org.helm.webeditor.Plugin(molHandler);
  const origin = new JSDraw2.Point(0, 0);
  io.parseHelm(plugin, src, origin, null);

  const m: Mol<HelmType> = plugin.jsd.m;
  expect(m.atoms.length, tgt.atomCount);
  expect(m.bonds.length, tgt.bondCount);
}
