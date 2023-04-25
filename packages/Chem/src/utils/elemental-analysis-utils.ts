import * as DG from 'datagrok-api/dg';
import { V2000_ATOM_NAME_LEN, V2000_ATOM_NAME_POS } from '../constants';
import { convertMolNotation } from '../package';
import * as OCL from 'openchemlib/full';
import { MALFORMED_MOL_V2000 } from './convert-notation-utils';
import { getMolSafe } from './mol-creation_rdkit';
import { _rdKitModule } from './chem-common-rdkit';

/** Gets map of chem elements to list with counts of atoms in rows */
export function getAtomsColumn(molCol: DG.Column): [Map<string, Int32Array>, number[]] {
    let elements: Map<string, Int32Array> = new Map();
    const invalid: number[] = new Array<number>(molCol.length);
    let smiles = molCol.getTag(DG.TAGS.UNITS) === DG.UNITS.Molecule.SMILES;
    let v3Kmolblock = molCol.get(0).includes('V3000');
    elements.set('Molecule Charge', new Int32Array(molCol.length));
    for (let rowI = 0; rowI < molCol.length; rowI++) {
      let el: string = molCol.get(rowI);
      if (smiles) {
        el = convertMolNotation(el, DG.UNITS.Molecule.SMILES, DG.UNITS.Molecule.MOLBLOCK);
        el === MALFORMED_MOL_V2000 ? invalid[rowI] = rowI : el;
      }
      else if (v3Kmolblock) {
        el = convertMolNotation(el, DG.UNITS.Molecule.V3K_MOLBLOCK, DG.UNITS.Molecule.MOLBLOCK);
        el === MALFORMED_MOL_V2000 ? invalid[rowI] = rowI : el;
      } 
      else {
        let mol = getMolSafe(el, {}, _rdKitModule).mol;
        if (mol) {
          el = mol.get_molblock();
        } else {
          invalid[rowI] = rowI;
          continue;
        }
      }
      let curPos = 0;
      curPos = el.indexOf('\n', curPos) + 1;
      curPos = el.indexOf('\n', curPos) + 1;
      curPos = el.indexOf('\n', curPos) + 1;

      const atomCounts = parseInt(el.substring(curPos, curPos + 3));
      let oclMolecule = OCL.Molecule.fromMolfile(el);
      let moleculeCharge = 0;
  
      for (let atomRowI = 0; atomRowI < atomCounts; atomRowI++) {
        moleculeCharge += oclMolecule.getAtomCharge(atomRowI);
        curPos = el.indexOf('\n', curPos) + 1;
        const elName: string = el
          .substring(curPos + V2000_ATOM_NAME_POS, curPos + V2000_ATOM_NAME_POS + V2000_ATOM_NAME_LEN)
          .trim();
  
        if (!elements.has(elName))
          elements.set(elName, new Int32Array(molCol.length));
          
        ++elements.get(elName)![rowI];
      } 
      elements.get('Molecule Charge')![rowI] = moleculeCharge;
    }
    return [elements, invalid];
  }

/** Check that packages are installed */
export function checkPackage(packageName: string, functionName: string) : boolean {
  const funcList: DG.Func[] = DG.Func.find({package: packageName, name: functionName});
  console.debug(`${packageName}: ${functionName} funcList.length = ${funcList.length}`);
  return funcList.length === 1 ? true : false;
}

