import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import {category, test, expect, expectFloat, before, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {assessDruglikeness, drugLikenessWidget} from '../widgets/drug-likeness';
import {getIdentifiersSingle} from '../widgets/identifiers';
// import {getPanelElements, molfileWidget} from '../widgets/molfile';
import {propertiesWidget} from '../widgets/properties';
import {getStructuralAlerts, structuralAlertsWidget} from '../widgets/structural-alerts';
import {getRisks, toxicityWidget} from '../widgets/toxicity';
// import {SubstructureFilter} from '../widgets/chem-substructure-filter';
import * as utils from './utils';
// import $ from 'cash-dom';
import {_package} from '../package-test';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import * as CONST from './const';
import {structure2dWidget} from '../widgets/structure2d';
import {structure3dWidget} from '../widgets/structure3d';
import {ensureContainersRunning, molV2000, molV3000} from './utils';
import {EMPTY_MOLECULE_MESSAGE} from '../constants';
import {checkPackage} from '../utils/elemental-analysis-utils';

const identifiers: {[key: string]: string} = {
  'Smiles': 'CC(C)Cc1ccc(C(C)C(=O)N2CCCC2C(=O)OCCO)cc1',
  'Inchi': 'InChI=1S/C20H29NO4/c1-14(2)13-16-6-8-17(9-7-16)15(3)19(23)21-10-4-5-18(21)20(24)25-12-11-22/h6-9,14-15,18,22H,4-5,10-13H2,1-3H3',
  'Inchi key': 'UEEWWZTXTMHYOK-UHFFFAOYSA-N'};

const additionalIdentifiers: {[key: string]: string} = {
  'Chembl': 'CHEMBL2262183', 'PubChem': '76330284', 'bindingdb': '50487960',
};

category('cell panel', async () => {
  const molStr = 'CC(C)Cc1ccc(cc1)C(C)C(=O)N2CCCC2C(=O)OCCO';
  const molFormats = [CONST.SMILES, CONST.MOL2000, CONST.MOL3000, CONST.SMARTS, CONST.EMPTY];
  const molFormats_: {[key: string]: string} = {smiles: CONST.SMILES, molV2000: CONST.MOL2000,
    molV3000: CONST.MOL3000, smarts: CONST.SMARTS, empty: CONST.EMPTY};

  before(async () => {
    if (!chemCommonRdKit.moduleInitialized) {
      chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
      await chemCommonRdKit.initRdKitModuleLocal();
    }
    await ensureContainersRunning();
  });

  test('drug-likeness', async () => {
    const dl = assessDruglikeness(molStr);
    const expectedDescription = await utils.loadFileAsText('tests/drug-likeness.json');

    expectFloat(dl[0], 7.210692227408717);
    expect(JSON.stringify(dl[1]), expectedDescription);

    for (const mol of molFormats)
      drugLikenessWidget(DG.SemanticValue.fromValueType(mol, DG.SEMTYPE.MOLECULE));
  });

  test('identifiers', async () => {
    const res: any = await getIdentifiersSingle(molStr);
    console.log(res);
    for (const key of Object.keys(identifiers))
      expect(res[key], identifiers[key]);
    if (checkPackage('ChemblApi', 'getCompoundsIds')) {
      Object.keys(additionalIdentifiers).forEach((it) => {
        expect(res[it].innerText, additionalIdentifiers[it]);
      });
    }
    if (checkPackage('PubchemApi', 'GetIupacName'))
      expect(Object.keys(res).includes('Name'), true);
  });

  test('properties', async () => {
    //commented out since the return type has changed - see if we still need it
    //const propertiesMap = getPropertiesMap(molStr);
    //const expectedPropertiesMap = await utils.loadFileAsText('tests/properties.json');
    //expect(JSON.stringify(propertiesMap), expectedPropertiesMap);

    for (const mol of molFormats)
      propertiesWidget(DG.SemanticValue.fromValueType(mol, DG.SEMTYPE.MOLECULE));
  });

  test('structural-alerts', async () => {
    const structuralAlerts = await getStructuralAlerts(molStr);
    const expectedStructuralAlerts = [1029, 1229];
    expect(structuralAlerts.length, expectedStructuralAlerts.length);
    for (const expectedSA of expectedStructuralAlerts)
      expect(structuralAlerts.includes(expectedSA), true);

    for (const mol of molFormats)
      await structuralAlertsWidget(mol);
  });

  for (const k of Object.keys(molFormats_)) {
    test('structure2d-widget.' + k, async () => {
      structure2dWidget(molFormats_[k]);
    });
  }

  //TODO: Check if image is returned; Visual test required
  test('structure3d-widget', async () => {
    for (const mol of molFormats)
      await structure3dWidget(mol);
  });


  test('toxicity', async () => {
    const risks = getRisks(molStr);
    const expectedRisks = {
      'Mutagenicity': 'None',
      'Tumorigenicity': 'None',
      'Irritating effects': 'Low',
      'Reproductive effects': 'High',
    };
    expect(JSON.stringify(risks), JSON.stringify(expectedRisks));

    for (const mol of molFormats)
      toxicityWidget(DG.SemanticValue.fromValueType(mol, DG.SEMTYPE.MOLECULE));
  });


  //TODO: fix, Test smiles, mol2000, mol3000;
  // test('substructure-filter-panel', async () => {
  //   const df = DG.DataFrame.fromColumns([grok.data.demo.molecules(1000).columns.byIndex(0)]);
  //   const view = grok.shell.addTableView(df);
  //   view.filters();
  //   await delay(100);
  //   (document.getElementsByClassName(
  //     'panel-titlebar disable-selection panel-titlebar-tabhost')[0].childNodes[0] as HTMLElement).click();
  //   await delay(100);
  //   const menuItem = document.getElementsByClassName(
  //     'd4-menu-item-container d4-vert-menu d4-menu-popup')[0].childNodes[3];
  //   menuItem.dispatchEvent(new MouseEvent('mouseenter')); await delay(100);
  //   menuItem.dispatchEvent(new MouseEvent('mousemove')); await delay(100);
  //   const submenuItem = menuItem.childNodes[0].childNodes[0].childNodes[1];
  //   submenuItem.dispatchEvent(new MouseEvent('mouseenter')); await delay(100);
  //   submenuItem.dispatchEvent(new MouseEvent('mousedown')); await delay(100);
  //   // https://developer.chrome.com/docs/devtools/console/utilities/#getEventListeners-function
  //   const dialogContents = document.getElementsByClassName('d4-dialog-contents')[0];
  //   const allButton = dialogContents.childNodes[2].childNodes[1].childNodes[0];
  //   (allButton as HTMLElement).click();
  //   const dialogFooter = document.getElementsByClassName('d4-dialog-footer')[0];
  //   const okButton = dialogFooter.childNodes[0].childNodes[0];
  //   (okButton as HTMLElement).click(); await delay(100);
  //   const smilesInput = document.getElementsByClassName('grok-sketcher-input ui-div')[0].childNodes[0];
  //   (smilesInput as HTMLInputElement).value = 'c1ccccc1'; await delay(100);
  //   smilesInput.dispatchEvent(new Event('focus')); await delay(100);
  //   // Only this combination of parameters worked:
  //   // https://tutorial.eyehunts.com/js/how-to-press-enter-key-programmatically-in-javascript-example-code/
  //   smilesInput.dispatchEvent(new KeyboardEvent('keydown', {
  //     altKey: false, bubbles: true, cancelable: true,
  //     charCode: 0, code: 'Enter', composed: true, ctrlKey: false,
  //     detail: 0, isComposing: false, key: 'Enter', keyCode: 13, location: 0,
  //     metaKey: false, repeat: false, shiftKey: false}));
  //   await delay(100);
  //   expect(df.filter.trueCount, 700);
  // });

  test('gasteiger-partial-charges.smiles', async () => {
    const parameters = {mol: molStr, contours: 10};
    await grok.functions.call('Chem:ChemistryGasteigerPartialCharges', parameters);
  }, {stressTest: true});

  test('gasteiger-partial-charges.molV2000', async () => {
    const parameters = {mol: molV2000, contours: 10};
    await grok.functions.call('Chem:ChemistryGasteigerPartialCharges', parameters);
  }, {stressTest: true});

  test('gasteiger-partial-charges.molV3000', async () => {
    const parameters = {mol: molV3000, contours: 10};
    await grok.functions.call('Chem:ChemistryGasteigerPartialCharges', parameters);
  }, {stressTest: true});

  //TODO: Compare the calculated values
  test('chem-descriptors', async () => {
    for (const mol of molFormats) {
      const widget: DG.Widget = await grok.functions.call('Chem:descriptorsWidget', {smiles: mol});
      if (mol === CONST.EMPTY) {
        await awaitCheck(() => widget.root.innerText === EMPTY_MOLECULE_MESSAGE,
          `empty data handled incorrectly`, 5000);
      } else {
        await awaitCheck(() => widget.root.querySelector('table') !== null,
          `descriptors table hasn\'t been created for ${mol}`, 55000);
      }
    }
  }, {timeout: 60000, stressTest: true});
});
