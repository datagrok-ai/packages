import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {BuiltInTrajectoryFormat, BuiltInTrajectoryFormats} from 'molstar/lib/mol-plugin-state/formats/trajectory';
import {BuildInShapeFormat} from 'molstar/lib/mol-plugin-state/formats/shape';
import {BuildInVolumeFormat} from 'molstar/lib/mol-plugin-state/formats/volume';
import {BuildInStructureFormat} from 'molstar/lib/mol-plugin-state/formats/structure';

import {BiostructureProps, BiostructurePropsDefault} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';

export const defaults: BiostructureProps = BiostructurePropsDefault;

/** const BuiltInTrajectoryFormat = "mmcif" | "cifCore" | "pdb" | "pdbqt" | "gro" | "xyz" | "mol" | "sdf" | "mol2" */
export const molecule3dFileExtensions: {
  [ext: string]: {
    binary: boolean,
  }
} = {
  /* Not supported either Molstar or NGL
  'mtl': {binary: true},
  /**/

  /* Not supported with Molstar, but supported with NGL
  'mmtf': {binary: true},
  'pqr': { binary: true},
  'cns': {binary: true},
  'obj': { binary: true},
  /**/

  // 'nc', 'md', 'dcd', 'xtc', 'mrc' unsupported ????

  // BuiltInTrajectoryFormats
  'mmcif': {binary: false},
  'cifCore': {binary: false},
  'pdb': {binary: false},
  'pdbqt': {binary: false},
  'gro': {binary: false},
  'xyz': {binary: false},
  'mol': {binary: false},
  'sdf': {binary: false},
  'mol2': {binary: false},

  // extra
  'cif': {binary: false},
  'bcif': {binary: true},
  'ply': {binary: false},
  'ccp4': {binary: true},
  'cub': {binary: false},
  'cube': {binary: false},
  'prmtop': {binary: false},
  'psf': {binary: false},
  'ent': {binary: false},
  'dx': {binary: false},
  'top': {binary: false},
  'sd': {binary: false},

  'mcif': {binary: true}, //??
  'dsn6': {binary: true},
  'brix': {binary: true},
  'dscif': {binary: true}, //??
  'dcd': {binary: true},
  'xtc': {binary: true},
  'mrc': {binary: true},
};
