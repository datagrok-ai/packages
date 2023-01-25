import * as DG from 'datagrok-api/dg';

import {IViewer} from './viewers/viewer';

// Data structures for V-Domain regions of antibodies

export enum VdRegionType {
  Unknown = 'unknown',
  FR = 'framework',
  CDR = 'cdr',
}

/** Describes V-DOMAIN (IG and TR) region (of multiple alignment)
 * https://www.imgt.org/IMGTScientificChart/Numbering/IMGTIGVLsuperfamily.html
 */
export class VdRegion {
  type: VdRegionType;
  name: string;
  chain: string;
  order: number;
  positionStartName: string;
  positionEndName: string;

  /**
   * start and position are strings because they correspond to position names as column names in ANARCI output
   * @param {VdRegionType} type  Type of the region
   * @param {string} name  Name of the region
   * @param {string} chain
   * @param {string} order
   * @param {string} positionStartName  Region start position (inclusive)
   * @param {string} positionEndName  Region end position (inclusive)
   */
  constructor(type: VdRegionType, name: string, chain: string, order: number,
    positionStartName: string, positionEndName: string) {
    this.type = type;
    this.name = name;
    this.chain = chain;
    this.order = order;
    this.positionStartName = positionStartName;
    this.positionEndName = positionEndName;
  }
}

/** Interface for VdRegionsViewer from @datagrok/bio to unbind dependency to Bio package */
export interface IVdRegionsViewer extends IViewer {
  init(): Promise<void>;

  setDf(mlbDf: DG.DataFrame, regions: VdRegion[]): Promise<void>;
}