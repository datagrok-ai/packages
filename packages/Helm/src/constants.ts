export const jsonSdfMonomerLibDict = {
  'monomerType': null,
  'smiles': null,
  'name': 'MonomerName',
  'author': null,
  'molfile': 'molecule',
  'naturalAnalog': 'MonomerNaturalAnalogCode',
  'rgroups': 'MonomerCaps',
  'createDate': null,
  'id': null,
  'polymerType': 'MonomerType',
  'symbol': 'MonomerCode'
};

export type WebEditorMonomer = {
  /** symbol */ id: string,
  /** name */ n: string,
  /** natural analog */ na?: string,
  /** polymer type */type: string,
  /** monomer type */ mt: string,
  /** molfile */ m: string,
  /** substituents */ at: { [group: string]: string },
  /** number of substituents */ rs: number
};

export const SMILES = 'smiles';
export const RGROUPS = 'rgroups';
export const MONOMER_SYMBOL = 'symbol';
export const RGROUP_CAP_GROUP_SMILES = 'capGroupSmiles';
export const RGROUP_ALTER_ID = 'alternateId';
export const RGROUP_CAP_GROUP_NAME = 'capGroupName';
export const RGROUP_LABEL = 'label';
export const SDF_MONOMER_NAME = 'MonomerName';

export const enum TAGS {
  cellRendererRenderError = '.cell-renderer.render.error',
}
