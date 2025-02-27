import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {category, test, before, after, awaitCheck} from '@datagrok-libraries/utils/src/test';
import {_package} from '../package-test';
import * as chemCommonRdKit from '../utils/chem-common-rdkit';
import { ensureContainersRunning } from './utils';

category('vector functions', () => {


    before(async () => {
        grok.shell.closeAll();
        if (!chemCommonRdKit.moduleInitialized) {
            chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
            await chemCommonRdKit.initRdKitModuleLocal();
        }
        await ensureContainersRunning();
    });

    test('getMorganFingerprints', async () => {
        await testVectorFunc('Chem:getMorganFingerprints(${smiles})', 'fp', [0, 9],
            [30, 22], (val) => (val as DG.BitSet).trueCount);
    });

    test('chemDescriptor', async () => {
        await testVectorFunc('Chem:chemDescriptor(${smiles}, \'MolWt\')', 'MolWt', [0, 9],
            [259.27099609375, 192.01600646972656]);
    });

    test('getInchis', async () => {
        await testVectorFunc('Chem:getInchis(${smiles})', 'Inchi', [0, 9],
            ['InChI=1S/C13H16F3NO/c1-17-8-6-12(7-9-17)18-11-4-2-10(3-5-11)13(14,15)16/h2-5,12H,6-9H2,1H3',
                'InChI=1S/C4H6BrN3O/c5-4-3(1-6)2-7-8(4)9/h2,9H,1,6H2']);
    });

    test('getInchiKeys', async () => {
        await testVectorFunc('Chem:getInchiKeys(${smiles})', 'InchiKey', [0, 9],
            ['LYQFNMXUTCIRCY-UHFFFAOYSA-N', 'OCYMDCZUBPZMRQ-UHFFFAOYSA-N']);
    });

    test('runStructuralAlert', async () => {
        await testVectorFunc('Chem:runStructuralAlert(${smiles}, \'Dundee\')', 'Dundee', [0, 2], [false, true]);
    });

    test('getInchiKeys', async () => {
        await testVectorFunc('Chem:getInchiKeys(${smiles})', 'InchiKey', [0, 9],
            ['LYQFNMXUTCIRCY-UHFFFAOYSA-N', 'OCYMDCZUBPZMRQ-UHFFFAOYSA-N']);
    });

    test('convertMoleculeNotation', async () => {
        await testVectorFunc('Chem:convertMoleculeNotation(${smiles}, \'molblock\')', 'molblock', [0], [mol1]);
    });

    test('getMolProperty', async () => {
        await testVectorFunc('Chem:getMolProperty(${smiles}, \'LogP\')', 'LogP', [0, 9],
            [2.939000129699707, -0.6422999501228333]);
    });

    after(async () => {
        grok.shell.closeAll();
        DG.Balloon.closeAll();
    });
});

export async function testVectorFunc(formula: string, colName: string, idxsToCheck: number[],
    expectedVals: any[], checkFunc?: (val: any) => any) {
    const  df = grok.data.demo.molecules(10);
    df.columns.addNewCalculated(colName, formula, 'auto');
    await awaitCheck(() => df.columns.names().includes(colName), `${colName} column hasn't been added`, 3000);
    for (let i = 0; i < idxsToCheck.length; i++) {
        const val = df.get(colName, idxsToCheck[i]);
        await awaitCheck(() => checkFunc ? checkFunc(val) : val === expectedVals[i],
            `Column ${colName}, idx ${idxsToCheck[i]}, expected: ${expectedVals[i]}, got: ${val}`, 1000);
    }
}

const mol1 = `
     RDKit          2D

 18 19  0  0  0  0  0  0  0  0999 V2000
    3.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.5000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.7500   -1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.7500   -1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.5000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.7500    1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.7500    1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -3.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -3.7500    1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -3.0000    2.5981    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -3.7500    3.8971    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -5.2500    3.8971    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -6.0000    2.5981    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -5.2500    1.2990    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -6.0000    5.1962    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -6.7500    6.4952    0.0000 F   0  0  0  0  0  0  0  0  0  0  0  0
   -4.7010    5.9462    0.0000 F   0  0  0  0  0  0  0  0  0  0  0  0
   -7.2990    4.4462    0.0000 F   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  2  3  1  0
  3  4  1  0
  4  5  1  0
  5  6  1  0
  6  7  1  0
  5  8  1  0
  8  9  1  0
  9 10  2  0
 10 11  1  0
 11 12  2  0
 12 13  1  0
 13 14  2  0
 12 15  1  0
 15 16  1  0
 15 17  1  0
 15 18  1  0
  7  2  1  0
 14  9  1  0
M  END
`
