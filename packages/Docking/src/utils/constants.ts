import * as DG from 'datagrok-api/dg';
import { DockingPackage } from '../package-utils';
import { AutoDockDataType } from '../apps/auto-dock-app';
import { AdcpDataType } from '../apps/adcp-app';

export const _package = new DockingPackage();
export const TARGET_PATH = 'System:AppData/Docking/targets';
export const CACHED_DOCKING: DG.LruCache<AutoDockDataType, DG.DataFrame> = new DG.LruCache<AutoDockDataType, DG.DataFrame>();
export const CACHED_ADCP: DG.LruCache<AdcpDataType, DG.DataFrame> = new DG.LruCache<AdcpDataType, DG.DataFrame>();
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

export const PROPERTY_DESCRIPTIONS: {[colName: string]: string} = {
    'intermolecular (1)': 'Final Intermolecular Energy',
    'electrostatic': 'Electrostatic Energy',
    'ligand fixed': 'Moving Ligand-Fixed Receptor',
    'ligand moving': 'Moving Ligand-Moving Receptor',
    'total internal (2)': 'Final Total Internal Energy',
    'torsional free (3)': 'Torsional Free Energy',
    'unbound systems (4)': 'Unbound System\s Energy' 
}

export const ADCP_PROPERTY_DESCRIPTIONS: {[colName: string]: string} = {
    'mode': 'Docking mode number.',
    'binding energy': 'Binding affinity (kcal/mol).',
    'reference function': 'Reference value or function.',
    'cluster size': 'Cluster size of the pose.',
    'rmsd': 'RMSD from reference.',
    'energy': 'Pose energy.',
    'best run': 'Best docking run number.'
};