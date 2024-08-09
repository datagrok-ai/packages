import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {getAvailableMonomers, getAvailableMonomerMols} from './utils';
import {RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';

export const PT_CHEM_EXAMPLE = `


 22 24  0  0  0  0  0  0  0  0999 V2000
    0.3128   -0.7509    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.3128    0.0740    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4054   -1.1623    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.1081   -0.7509    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4054    0.4877    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -1.1081    0.0740    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.8175   -1.1623    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0222    0.4877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.8175    0.4877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.5292   -0.7509    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0222    1.3127    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.7227    1.7263    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.4054   -1.9896    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -2.5292    0.0740    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.4544    1.3127    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.7406    0.0740    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0222   -1.1623    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    2.4544    0.4877    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.8175   -1.9896    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
   -3.2453    0.4877    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    3.1670    1.7285    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    1.7149    2.5513    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
  2  1  2  0  0  0  0
  3  1  1  0  0  0  0
  4  3  1  0  0  0  0
  5  2  1  0  0  0  0
  6  5  1  0  0  0  0
  7  4  1  0  0  0  0
  8  2  1  0  0  0  0
  9  6  1  0  0  0  0
 10  7  2  0  0  0  0
 11  8  2  0  0  0  0
 12 11  1  0  0  0  0
 13  3  2  0  0  0  0
 14  9  2  0  0  0  0
 15 18  1  0  0  0  0
 16  8  1  0  0  0  0
 17  1  1  0  0  0  0
 18 16  2  0  0  0  0
 19  7  1  0  0  0  0
 20 14  1  0  0  0  0
  6  4  2  0  0  0  0
 15 12  2  0  0  0  0
 14 10  1  0  0  0  0
 15 21  1  0  0  0  0
 12 22  1  0  0  0  0
M  RGP  1  22   1
M  END`;

//works with mol V3000
export async function getGroupsNumber(molBlock: string): Promise<number> {
  const rdkitModule: RDModule = await grok.functions.call('Chem:getRdKitModule');
  const molScaffold: RDMol = rdkitModule.get_mol(molBlock);
  const mV3000 = molScaffold.get_v3Kmolblock();
  molScaffold?.delete(); 

  const count = (mV3000.match(/RGROUPS/g) || []).length;

  return count;
}

export async function getEnumerationChem(molString: string, screenLibraries: string[]):
  Promise<string[]> {

  const aaa =   'monomer_lib_01_peptides_2024_06_05.json';
  const monomersByLib = await Promise.all(screenLibraries.map((sl) => getAvailableMonomers(aaa)));
  const monomerMolsByLib = await Promise.all(screenLibraries.map((sl) => getAvailableMonomerMols(aaa)));
  const enumerationsNums = monomersByLib.map((ml) => ml.length);
  const totalNumber = enumerationsNums.reduce((accumulator, currentValue) => accumulator * currentValue);
  const enumerations = new Array<string>(totalNumber);

  // const variableMonomers = await getAvailableMonomers(screenLibrary);
  // const variableMols = await getAvailableMonomerMols(screenLibrary);
  // const enumerations = new Array<string>(variableMonomers.length);

  const counters = new Array<Number>(enumerationsNums.length, 0);
 // const current 

	const rdkitModule: RDModule = await grok.functions.call('Chem:getRdKitModule');
  const molScaffold: RDMol = rdkitModule.get_mol(molString);
  const smiScaffold = molScaffold.get_smiles();
  molScaffold.delete();

  const smilesSubsts = new Array<Array<string>>(2);
  smilesSubsts[0] = new Array<string>(monomersByLib[0].length);
  smilesSubsts[1] = new Array<string>(monomersByLib[1].length);

  for (let i = 0; i < monomersByLib[0].length; i++) {
    const name = monomersByLib[0][i];
    const molBlock = monomerMolsByLib[0][name];
    const molSubst: RDMol = rdkitModule.get_mol(molBlock);
    smilesSubsts[0][i] = molSubst.get_smiles();
    molSubst.delete();
  }

  for (let i = 0; i < monomersByLib[1].length; i++) {
    const name = monomersByLib[1][i];
    const molBlock = monomerMolsByLib[1][name];
    const molSubst: RDMol = rdkitModule.get_mol(molBlock);
    smilesSubsts[1][i] = molSubst.get_smiles();
    molSubst.delete();
  }

  for (let i = 0; i < monomersByLib[0].length; i++) {
    for (let j = 0; j < monomersByLib[1].length; j++) {
      //let molRes: RDMol | null = null;
      try {
        //TODO: use RDKit linking function when exposed
        const smiResRaw1 = `${smiScaffold}.${smilesSubsts[0][i]}`.replaceAll('[1*]C', 'C([1*])').replaceAll('[1*]c', 'c([1*])').replaceAll('[1*]O', 'O([1*])').replaceAll('[1*]N', 'N([1*])');
        const smiResRaw2 = `${smiScaffold}.${smilesSubsts[1][i]}`.replaceAll('[1*]C', 'C([1*])').replaceAll('[1*]c', 'c([1*])').replaceAll('[1*]O', 'O([1*])').replaceAll('[1*]N', 'N([1*])');
      
        const smiRes1 = `${smiResRaw1}`.replaceAll('([1*])', '9').replaceAll('[1*]', '9');
        const smiRes2 = `${smiResRaw2}`.replaceAll('([1*])', '9').replaceAll('[1*]', '9');
        // molRes = rdkitModule.get_mol(smiRes, JSON.stringify({mappedDummiesAreRGroups: true}))
        // let molV3 = molRes.get_v3Kmolblock();

        const mol1 = rdkitModule.get_mol(smiScaffold, JSON.stringify({mappedDummiesAreRGroups: true}));
        const mol2 = rdkitModule.get_mol(smiRes1, JSON.stringify({mappedDummiesAreRGroups: true}));
        const mol3 = rdkitModule.get_mol(smiRes2, JSON.stringify({mappedDummiesAreRGroups: true}));

        const resss = rdkitModule.link(mol1, mol2);
        const ress2 = rdkitModule.link(resss, mol3);

        const mb = ress2.get_v3Kmolblock();
        mol1?.delete();
        mol2?.delete();
        resss?.delete();
        ress2?.delete();

        enumerations[i] = mb;
      } 
      catch(err:any) {
        enumerations[i] = '';
      }
      finally {
        //molRes?.delete();
      }
    }
  }
  

  return enumerations;
}
