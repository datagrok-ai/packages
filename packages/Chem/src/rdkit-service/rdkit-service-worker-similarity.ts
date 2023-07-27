import {MAX_MOL_CACHE_SIZE, RdKitServiceWorkerBase} from './rdkit-service-worker-base';
import {defaultMorganFpLength, defaultMorganFpRadius, Fingerprint} from '../utils/chem-common';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {getMolSafe, IMolContext} from '../utils/mol-creation_rdkit';

export interface IFpResult{
  fps: Array<Uint8Array | null>;
  smiles: Array<string | null> | null;
}

export class RdKitServiceWorkerSimilarity extends RdKitServiceWorkerBase {
  readonly _fpLength: number = defaultMorganFpLength;
  readonly _fpRadius: number = defaultMorganFpRadius;
  private addedCahceCounter = 0;
  constructor(module: RDModule, webRoot: string) {
    super(module, webRoot);
  }

  /**
   * Calculates fingerprints either on pre-created array of RDMols or creating RDMOls on the fly.
   * If you want to use pre-created array of RDMols you should first create it by using initMoleculesStructures
   * web-worker method.
   *
   * @param {Fingerprint} fingerprintType Type of Fingerprint
   * @param {string[]} molecules List of molecule strings to calculate fingerprints on. If passed, fps mols are created on the fly
   * @param {boolean} getCanonicalSmiles If passed canonical smiles are also calculated and returned
   * In case it is passed to function RDMols will be created on the fly.
   */

  getFingerprints(fingerprintType: Fingerprint, molecules?: string[], getCanonicalSmiles?: boolean): IFpResult {
    if (!molecules)
      return {fps: [], smiles: null};
    const fpLength = molecules.length;
    const fps = new Array<Uint8Array | null>(fpLength).fill(null);
    const morganFpParams = fingerprintType === Fingerprint.Morgan ?
      JSON.stringify({radius: this._fpRadius, nBits: this._fpLength}) : null;
    const canonicalSmilesArr = getCanonicalSmiles ? new Array<string | null>(fpLength).fill(null) : null;
    for (let i = 0; i < fpLength; ++i) {
      const item = molecules[i];
      if (!item && item === '')
        continue;
      let rdMol = this._molsCache?.get(molecules[i]);
      if (!rdMol) {
        const mol: IMolContext = getMolSafe(item, {}, this._rdKitModule);
        rdMol = mol?.mol;
        if (rdMol)
          rdMol.is_qmol = mol?.isQMol;
      }
      if (rdMol) {
        try {
          if (canonicalSmilesArr)
            canonicalSmilesArr[i] = rdMol.get_smiles();
          switch (fingerprintType) {
          case Fingerprint.Pattern:
            try {
              fps[i] = rdMol.get_pattern_fp_as_uint8array();
            } catch {
              //do nothing, fp is already null
            }
            break;
          case Fingerprint.Morgan:
            try {
              if (!rdMol.is_qmol)
                fps[i] = rdMol.get_morgan_fp_as_uint8array(morganFpParams!);
            } catch (error) {
              //do nothing, fp is already null
            }
            break;
          default:
            rdMol?.delete();
            throw Error('Unknown fingerprint type: ' + fingerprintType);
          }
          if (this.addedCahceCounter < MAX_MOL_CACHE_SIZE) {
              this._molsCache?.set(rdMol.get_smiles(), rdMol!);
              this.addedCahceCounter++; //need this additional counter (instead of i) not to consider empty molecules
          }
        } catch {
          // nothing to do, fp is already null
        } finally {
          if (this.addedCahceCounter >= MAX_MOL_CACHE_SIZE){ //do not delete mol in case it is in cache
            rdMol?.delete();
          }
        }
      }
    }
    return {fps: fps, smiles: canonicalSmilesArr};
  }
}
