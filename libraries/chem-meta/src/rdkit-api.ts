export interface RDModule {
  version(): string;
  prefer_coordgen(prefer: boolean): void;
  use_legacy_stereo_perception(value: boolean): boolean;
  allow_non_tetrahedral_chirality(value: boolean): boolean;
  get_inchikey_for_inchi(input: string): string;
  get_mol(molString: string, options?: string): RDMol;
  get_mol_from_uint8array(pkl: Uint8Array): RDMol;
  get_mol_copy(other: RDMol): RDMol;
  get_qmol(molString: string): RDMol;
  get_rxn(reactionString: string, options?: string): RDReaction;
  get_mcs_as_mol(mols: MolList, details?: string): RDMol;
  get_mcs_as_smarts(mols: MolList, details?: string): string;
  set_log_tee(logName: string): RDLog;
  set_log_capture(logName: string): RDLog;
  get_rgd(core: RDMol, options: string): RGroupDecomp;
  MolList: MolListConstructor;
  RGroupDecomp: RGroupDecompConstructor;
  SubstructLibrary: RDSubstructLibraryConstructor;
  link(a: RDMol, b: RDMol): RDMol;
}

export interface RGroupDecomp {
  add(mol: RDMol): number;
  process(): boolean;
  get_rgroups_as_columns(): {[colName: string]: MolList};
  get_rgroups_as_rows(): {[rowNum: string]: MolList};
  delete(): void;
}

interface RGroupDecompConstructor {
  new(core: RDMol, details: string): RGroupDecomp;
  new(cores: MolList, details: string, manyCores: boolean): RGroupDecomp;
}

export interface RDMol {
  is_qmol: boolean;

  is_valid(): boolean;
  has_coords(): number;

  get_smiles(): string;
  get_cxsmiles(): string;
  get_smarts(): string;
  get_cxsmarts(): string;
  get_molblock(details?: string): string;
  get_v3Kmolblock(details?: string): string;
  get_as_uint8array(): Uint8Array;
  get_inchi(): string;
  get_json(): string;
  get_svg(width?: number, height?: number): string;
  get_svg_with_highlights(details: string): string;

  draw_to_canvas_with_offset(
    canvas: HTMLCanvasElement, offsetX: number, offsetY: number, width: number, height: number): string;
  draw_to_canvas(canvas: HTMLCanvasElement, width: number, height: number): string;
  draw_to_canvas_with_highlights(canvas: HTMLCanvasElement, details: string): string;
  generate_aligned_coords(template: RDMol, details?: string): string;
  get_morgan_fp_as_uint8array(details?: string): Uint8Array;
  get_pattern_fp(details?: string): string;
  get_pattern_fp_as_uint8array(details?: string): Uint8Array;
  get_topological_torsion_fp_as_uint8array(details?: string): Uint8Array;
  get_rdkit_fp_as_uint8array(details?: string): Uint8Array;
  get_atom_pair_fp_as_uint8array(details?: string): Uint8Array;
  get_maccs_fp_as_uint8array(): Uint8Array;
  get_frags(details?: string): {
    molIterator: MolList,
    mappings: {
      frags: Array<number>,
      fragsMolAtomMapping: Array<Array<number>>,
    },
  };
  get_mmpa_frags(minCuts: number, maxCuts: number, maxCutsBonds: number): {cores: MolList, sidechains: MolList};
  get_avalon_fp_as_uint8array(details?: string): Uint8Array;

  get_substruct_match(qmol: RDMol) : string;
  get_substruct_matches(qmol: RDMol): string;
  get_descriptors(): string;
  get_morgan_fp(details?: string): string;
  get_pattern_fp(details?: string): string;
  get_topological_torsion_fp(details?: string): string;
  get_rdkit_fp(details?: string): string;
  get_atom_pair_fp(details?: string): string;
  get_maccs_fp(): string;
  get_avalon_fp(details?: string): string;

  get_stereo_tags(): string;
  get_aromatic_form(): string;
  convert_to_aromatic_form(): void;
  get_kekule_form(): string;
  convert_to_kekule_form(): void;
  get_new_coords(useCoordGen?: boolean): string;
  set_new_coords(useCoordGen?: boolean): boolean;
  has_prop(key: string): boolean;
  get_prop_list(includePrivate?: boolean, includeComputed?: boolean): Array<string>;
  set_prop(key: string, value: string, computed?: boolean): boolean;
  get_prop(key: string): string;
  clear_prop(key: string): boolean;

  condense_abbreviations(maxCoverage?: number, useLinkers?: boolean): string;
  condense_abbreviations_from_defs(definitions: string, maxCoverage: number, areLinkers: boolean): string;

  add_hs(): string;
  add_hs_in_place(): boolean;
  remove_hs(): string;
  remove_hs_in_place(): boolean;

  normalize_depiction(canonicalize?: number, scaleFactor?: number): number;
  straighten_depiction(minimizeRotation?: boolean): void;
  get_num_atoms(heavyOnly?: boolean): number;
  get_num_bonds(): number;
  get_copy(): RDMol;

  /** Reclaims the memory used for that molecule. */
  delete(): void;
}

export interface MolList {
  append(mol: RDMol): number;
  insert(i: number, mol: RDMol): number;
  at(i: number): RDMol;
  pop(i: number): RDMol;
  next(): RDMol;
  reset(): void;
  at_end(): boolean;
  size(): number;
  delete(): void;
}

interface MolListConstructor {
  new(): MolList;
}

export interface RDReaction {
  draw_to_canvas_with_offset(): string;
  draw_to_canvas(canvas: HTMLCanvasElement, width: number, height: number): string;
  draw_to_canvas_with_highlights(canvas: HTMLCanvasElement, details: string): string;
  is_valid(): boolean;
  get_svg(width?: number, height?: number): string;
  get_svg_with_highlights(options: string): string;

   /** Reclaims the memory used for that molecule. */
   delete(): void;
}

export interface RDSubstructLibrary {
  add_mol(mol: RDMol): number;
  add_smiles(smiles: string): number;
  add_trusted_smiles(smiles: string): number;
  get_trusted_smiles(i: number): string;
  add_trusted_smiles_and_pattern_fp(smiles: string, patternFp: Uint8Array): number;
  get_pattern_fp_as_uint8array(i: number): Uint8Array;
  get_matches_as_uint32array(qmol: RDMol, useChirality?: boolean, numThreads?: number, maxResults?: number): Uint32Array;
  get_mol(i: number): RDMol;
  link(a: RDMol, b: RDMol): RDMol;
  get_matches(qmol: RDMol, useChirality?: boolean, numThreads?: number, maxResults?: number): string;
  count_matches(qmol: RDMol, useChirality?: boolean, numThreads?: number): number;
  size(): number;
  delete(): void;
}

interface RDSubstructLibraryConstructor {
  new(bits?: number): RDSubstructLibrary;
}

export interface RDLog {
  get_buffer(): string;
  clear_buffer(): void;
  delete(): void;
}

