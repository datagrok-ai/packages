import * as DG from 'datagrok-api/dg';
import { DockingPackage } from '../package-utils';

export const _package = new DockingPackage();
export const TARGET_PATH = 'System:AppData/Docking/targets';
export const CACHED_RESULTS: DG.LruCache<string, DG.DataFrame> = new DG.LruCache<string, DG.DataFrame>();
export let BINDING_ENERGY_COL = 'binding energy';
export let BINDING_ENERGY_COL_UNUSED = '';
export let POSE_COL = 'pose';
export let POSE_COL_UNUSED = '';
export const ERROR_COL_NAME = 'error';
export const ERROR_MESSAGE = 'Error log';

export function setPose(value: string) {
  POSE_COL_UNUSED = value;
}

export function setAffinity(value: string) {
  BINDING_ENERGY_COL_UNUSED = value;
}

export const AUTODOCK_PROPERTY_DESCRIPTIONS: {[colName: string]: string} = {
  'intermolecular (1)': 'Final Intermolecular Energy',
  'electrostatic': 'Electrostatic Energy',
  'ligand fixed': 'Moving Ligand-Fixed Receptor',
  'ligand moving': 'Moving Ligand-Moving Receptor',
  'total internal (2)': 'Final Total Internal Energy',
  'torsional free (3)': 'Torsional Free Energy',
  'unbound systems (4)': 'Unbound System\s Energy' 
}

export const BOLTZ_CONFIG_PATH = 'System:AppData/Docking/boltz';

export const BOLTZ_PROPERTY_DESCRIPTIONS: { [colName: string]: string } = {
  'confidence_score': 'Aggregated score used to sort the predictions, corresponds to 0.8 * complex_plddt + 0.2 * iptm (ptm for single chains)',
  'ptm': 'Predicted TM score for the complex',
  'iptm': 'Predicted TM score when aggregating at the interfaces',
  'ligand_iptm': 'ipTM but only aggregating at protein-ligand interfaces',
  'protein_iptm': 'ipTM but only aggregating at protein-protein interfaces',
  'complex_plddt': 'Average pLDDT score for the complex',
  'complex_iplddt': 'Average pLDDT score when upweighting interface tokens',
  'complex_pde': 'Average PDE score for the complex',
  'complex_ipde': 'Average PDE score when aggregating at interfaces ',
  'chains_ptm': 'Predicted (interface) TM score between each pair of chains',
  'pair_chains_iptm': '# Predicted (interface) TM score between each pair of chains'
};
  
type SequenceModification = {
  position: number;  // Index of the residue, starting from 1
   ccd: string;       // CCD code of the modified residue
};
  
type ProteinEntity = {
  id: string | string[];  // Chain ID or multiple Chain IDs for identical entities
  sequence: string;       // Sequence (only for protein, dna, rna)
  msa?: string;            // MSA Path (only for protein)
  modifications?: SequenceModification[];  // List of modifications
};
  
type LigandEntity = {
  id: string | string[];  // Chain ID or multiple Chain IDs for identical entities
  smiles: string;         // SMILES (only for ligands)
  ccd: string;            // CCD (only for ligands)
};
  
type SequenceEntity = {
  protein?: ProteinEntity;  // Protein entity with sequence and msa
  ligand?: LigandEntity;    // Ligand entity with smiles and ccd
};
  
export type Config = {
  version: number;
  sequences: SequenceEntity[];  // Array of sequence entities, each with an entity type
  constraints?: Constraint[];   // Optional constraints (can be empty)
};
  
type Constraint = {
  bond?: {
    atom1: [string, number, string];  // [CHAIN_ID, RES_IDX, ATOM_NAME]
    atom2: [string, number, string];  // [CHAIN_ID, RES_IDX, ATOM_NAME]
  };
  pocket?: {
    binder: string;                    // CHAIN_ID for the binder
    contacts: [string, number][];      // List of [CHAIN_ID, RES_IDX] for contacts
  };
};

export interface BoltzResponse {
  success: boolean;
  error: string | null;
  result: string | null;
}