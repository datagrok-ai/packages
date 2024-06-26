import { Fingerprint } from "./utils/chem-common";

export const V2000_ATOM_NAME_POS = 30;
export const V2000_ATOM_NAME_LEN = 3;
export const SUBSTRUCT_COL = 'substruct-col';
export const MIN_MOL_IMAGE_SIZE = 5;

/** A list of chemical elements in periodic table order */
export const elementsTable: Array<string> = [
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na',
  'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V',
  'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se',
  'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh',
  'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba',
  'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho',
  'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt',
  'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac',
  'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md',
  'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn',
  'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'];

export enum MOL_FORMAT {
  SMILES = 'smiles',
};

export const EMPTY_MOLECULE_MESSAGE = 'Molecule is empty';
export const SMARTS_MOLECULE_MESSAGE = 'Not applicable for smarts or moleculer fragments';
export const MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT = 1000000000;
export const MAX_MCS_ROW_COUNT = 50000;
export const MESSAGE_MALFORMED = 'MALFORMED_INPUT_VALUE';
const TERMINATE_SEARCH = 'terminate_substructure_search';
const SUBSTRUCTURE_SEARCH_PROGRESS = 'substructure_search_progress';
export const getTerminateEventName =
  (tableName: string, colName: string) => `${TERMINATE_SEARCH}-${tableName}-${colName}`;
export const getSearchProgressEventName =
  (tableName: string, colName: string) => `${SUBSTRUCTURE_SEARCH_PROGRESS}-${tableName}-${colName}`;
export const getSearchQueryAndType = (molecule: string | null, type: string, fp: string, similarity: number) =>
  molecule ? type !== SubstructureSearchType.IS_SIMILAR ? `${molecule}_${type}` : `${molecule}_${type}_${fp}_${similarity}` : '';
export const FILTER_SCAFFOLD_TAG = 'chem-scaffold-filter';
export const ALIGN_BY_SCAFFOLD_TAG = '.chem-scaffold-align';
export const HIGHLIGHT_BY_SCAFFOLD_TAG = '.%chem-scaffold-highlight';
export const SCAFFOLD_COL = 'scaffold-col';
export const PARENT_MOL_COL = 'parent-mol-col';
export const HIGHLIGHT_BY_SCAFFOLD_COL = 'highlight-scaffold-col';
export const REGENERATE_COORDS = 'regenerate-coords';
export const MALFORMED_DATA_WARNING_CLASS = 'malformed-data-warning';
export enum SubstructureSearchType {
  EXACT_MATCH = 'Exact',
  CONTAINS = 'Contains',
  INCLUDED_IN = 'Included in',
  IS_SIMILAR = 'Similar',
  NOT_CONTAINS = 'Not contains',
  NOT_INCLUDED_IN = 'Not included in'
}
export const FILTER_TYPE_TAG = '.filter-type'
export const AVAILABLE_FPS = [Fingerprint.Morgan, Fingerprint.AtomPair, Fingerprint.MACCS,
  Fingerprint.RDKit, Fingerprint.TopologicalTorsion];
export const SCAFFOLD_TREE_HIGHLIGHT = '.chem-scaffold-tree-highlight';
export const CHEM_APPLY_FILTER_SYNC = '.chem-apply-filter-sync';
