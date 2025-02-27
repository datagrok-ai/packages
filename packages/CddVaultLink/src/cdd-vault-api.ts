import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

//TODO: properly handle
const apiKey = '';

interface ApiResponse<T> {
  count?: number;
  offset?: number;
  page_size?: number;
  objects?: T[];
  data?: T;
  message?: string;
  error?: string;
}

interface Vault {
  name: string;
  id: number;
}

interface Project {
  name: string;
  id: number;
}

interface Collection {
  name: string;
  id: number;
}

interface DataSet {
  name: string;
  id: number;
}


interface Batch {
  id: number;
  class: 'batch';
  created_at: string;
  modified_at: string;
  name?: string;
  molecule_batch_identifier?: string;
  owner: string;
  projects: Project[];
  salt_name?: string;
  solvent_of_crystallization_name?: string;
  formula_weight?: number;
  batch_fields?: Record<string, any>;
  stoichiometry?: {
    core_count: number;
    salt_count: number;
    solvent_of_crystallization_count: number;
  };
}

interface Molecule {
  id: number;
  class: 'molecule';
  name: string;
  synonyms: string[];
  cdd_registry_number?: number;
  projects: Project[];
  collections?: Collection[];
  owner: string;
  created_at: string;
  modified_at: string;
  smiles?: string;
  cxsmiles?: string;
  inchi?: string;
  inchi_key?: string;
  iupac_name?: string;
  molfile?: string;
  molecular_weight?: number;
  log_p?: number;
  log_d?: number;
  log_s?: number;
  num_h_bond_donors?: number;
  num_h_bond_acceptors?: number;
  num_rule_of_5_violations?: number;
  formula?: string;
  isotope_formula?: string;
  dot_disconnected_formula?: string;
  p_k_a?: number;
  p_k_a_type?: string;
  exact_mass?: number;
  heavy_atom_count?: number;
  composition?: string;
  isotope_composition?: string;
  topological_polar_surface_area?: number;
  num_rotatable_bonds?: number;
  cns_mpo_score?: number;
  fsp3?: number;
  batches: Batch[];
  udfs?: Record<string, any>;
  molecule_fields?: Record<string, any>;
}

interface MoleculesQueryResult {
  count?: number;
  offset?: number;
  page_size?: number;
  objects?: Molecule[];
}

interface ProtocolQueryResult {
  count?: number;
  offset?: number;
  page_size?: number;
  objects?: Protocol[];
}

interface ReadoutRowsQueryResult {
  count?: number;
  offset?: number;
  page_size?: number;
  objects?: ReadoutRow[];
}

export type  MoleculeQueryParams = {
  molecules?: string; // Comma separated list of ids
  names?: string; // Comma separated list of names/synonyms
  async?: boolean;
  no_structures?: boolean;
  include_original_structures?: boolean;
  only_ids?: boolean;
  only_batch_ids?: boolean;
  created_before?: string; // ISO 8601 date
  created_after?: string;
  modified_before?: string;
  modified_after?: string;
  batch_created_before?: string;
  batch_created_after?: string;
  batch_field_before_name?: string;
  batch_field_before_date?: string;
  batch_field_after_name?: string;
  batch_field_after_date?: string;
  offset?: number;
  page_size?: number;
  projects?: string; // Comma separated list of project ids
  data_sets?: string; // Comma separated list of dataset ids
  structure?: string; // SMILES, cxsmiles or mol string
  structure_search_type?: 'exact' | 'similarity' | 'substructure';
  structure_similarity_threshold?: number;
  inchikey?: string;
  molecule_fields?: string[];
  batch_fields?: string[];
  fields_search?: MoleculeFieldSearch[];
}

export type MoleculeFieldSearch = {
  name: string;
  text_value?: string;
  float_value?: number;
  date_value?: string;
}

interface MoleculeCreateParams {
  class?: 'molecule';
  smiles?: string;
  cxsmiles?: string;
  molfile?: string;
  structure?: string;
  name: string;
  description?: string;
  synonyms?: string[];
  udfs?: Record<string, any>;
  projects: (number | string)[];
  collections?: (number | string)[];
  duplicate_resolution?: 'new' | 'prompt';
}

interface ReadoutRowsQueryParameters {
  async?: boolean; // If true, do an asynchronous export
  only_ids?: boolean; // If true, only the Readout Row IDs are returned
  created_before?: string; // Date in format YYYY-MM-DDThh:mm:ss±hh:mm
  created_after?: string; // Date in format YYYY-MM-DDThh:mm:ss±hh:mm
  modified_before?: string; // Date in format YYYY-MM-DDThh:mm:ss±hh:mm
  modified_after?: string; // Date in format YYYY-MM-DDThh:mm:ss±hh:mm
  protocols?: string; // Comma-separated list of protocol IDs
  plates?: string; // Comma-separated list of plate IDs
  molecules?: string; // Comma-separated list of molecule IDs
  batches?: string; // Comma-separated list of batch IDs
  runs_before?: string; // Date in format YYYY-MM-DD
  runs_after?: string; // Date in format YYYY-MM-DD
  runs?: string; // Comma-separated list of run IDs
  offset?: number; // Index of the first object to return (default: 0)
  page_size?: number; // Maximum number of objects to return (default: 50, max: 1000)
  type?: "detail_row" | "batch_run_aggregate_row" | "batch_protocol_aggregate_row" | "molecule_protocol_aggregate_row"; // Type of readout rows to return
  include_control_state?: boolean; // If true, control wells are identified as positive or negative control wells
  data_sets?: string; // Comma-separated list of public dataset IDs
}

export interface Protocol {
  id: number;
  class: string;
  created_at: string;
  modified_at: string;
  name: string;
  data_set: DataSet;
  readout_definitions: ReadoutDefinition[];
  calculations: Calculation[];
  runs: Run[];
  projects: Project[];
  owner: string;
  protocol_statistics: ProtocolStatistic[];
  category: string;
  description: string;
  protocol_fields: Record<string, any>;
}

interface ReadoutDefinition {
  id: number;
  class: string;
  created_at: string;
  modified_at: string;
  name: string;
  unit_label?: string;
  data_type: string;
  precision_type?: string;
  precision_number?: number;
  description?: string;
  protocol_condition: boolean;
  aggregation?: string;
  calculation?: number;
}

interface Calculation {
  id: number;
  class: string;
  created_at: string;
  modified_at: string;
  inputs: {
      input_readout_definitions: number[];
  };
  outputs: {
      output_readout_definition: number;
  };
  formula: string;
  aggregate_readouts_by: string;
}

interface Run {
  id: number;
  class: string;
  created_at: string;
  modified_at: string;
  run_date: string;
  person: string;
  place: string;
  conditions: string;
  source_files: any[]; // Replace `any` with a more specific type if known
  attached_files: any[]; // Replace `any` with a more specific type if known
  project: Project;
}

interface ProtocolStatistic {
  protocol: Protocol;
  readout_definition: ReadoutDefinition;
  statistics: Statistic[];
}

interface Statistic {
  name: string;
  count: number;
  average: number | null;
  standard_deviation: number | null;
}

interface Readout {
  value: number;
  outlier: boolean;
  modifier?: string; // Optional, as it only appears in some readouts
}

interface ReadoutRow {
  id: number;
  class: string;
  created_at: string;
  modified_at: string;
  type: string;
  protocol: number;
  molecule: number;
  batch: number;
  run: number;
  readouts: {
      [key: string]: Readout; // Dynamic keys for readouts
  };
}


async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const headers: any = {
      'X-CDD-Token': apiKey,
      'Accept': 'application/json',
    };
    if (method === 'POST')
      headers['Content-Type'] = 'application/json';

    const response = await grok.dapi.fetchProxy(`https://app.collaborativedrug.com${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/** Get all available vaults */
export async function getVaults(): Promise<ApiResponse<Vault[]>> {
  return request('GET', '/api/v1/vaults');
}

/** Get a single molecule by ID */
export async function getMolecule(vaultId: number, moleculeId: number): Promise<ApiResponse<Molecule>> {
  return request<Molecule>('GET', `/api/v1/vaults/${vaultId}/molecules/${moleculeId}`);
}

/** Get list of available protocols */
export async function getProtocols(vaultId: number): Promise<ApiResponse<ProtocolQueryResult>> {
  return request('GET', `/api/v1/vaults/${vaultId}/protocols`);
}

/**
 * Query molecules with various parameters
 */
export async function queryMolecules(vaultId: number, params: MoleculeQueryParams): Promise<ApiResponse<MoleculesQueryResult>> {
  // For environments that don't support JSON in GET requests, use POST with /query endpoint
  return request<MoleculesQueryResult>('POST', `/api/v1/vaults/${vaultId}/molecules/query`, params);
}

/**
 * ReadoutRows without or with various parameters
 */
export async function queryReadoutRows(vaultId: number, params: ReadoutRowsQueryParameters): Promise<ApiResponse<ReadoutRowsQueryResult>> {
  
  let paramsStr = '';
  const paramNames = Object.keys(params);
  for (let i = 0; i < paramNames.length; i++) {
    const paramVal = (params as any)[paramNames[i]];
    if(paramVal) {
      paramsStr += paramsStr === '' ? `?${paramNames[i]}=${paramVal}` : `&${paramNames[i]}=${paramVal}`;
    }
  }
  return request<ReadoutRowsQueryResult>('GET', `/api/v1/vaults/${vaultId}/readout_rows${paramsStr}`);
}