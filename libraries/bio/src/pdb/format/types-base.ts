import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {IAtomBase, IAtomCoords, IAtomTer} from './types';

export class LineBase {
  constructor(
    public readonly lineTitle: string,
  ) {}

  static fromStr(line: string): LineBase {
    return new LineBase(
      `${line.slice(1 - 1, 6).trim()}`,
    );
  }

  toStr(): string {
    const res = [
      this.lineTitle.padEnd(6) /* 1-6*/,
    ].join('');
    if (res.length !== 6)
      throw new Error(`Invalid length ${res.length}, expected ${6}`);
    return res;
  }
}

const backboneRanks: { [atomFullName: string]: number } = {'N': 1, 'CA': 2, 'C': 3, 'O': 4};
const atomNameRanks: { [atomName: string]: number } = {
  /* backbone */ '': 0, /**/ 'N': 0,
  'A': 1, 'B': 2, 'G': 3, 'D': 4, 'E': 5, 'Z': 6, 'H': 7,
  /* terminal */ 'X': 1000
};

/** 1-27 */
export class AtomBase extends LineBase implements IAtomBase {
  /**
   * @param number    cols: 7-11  Atom serial number
   * @param name      cols: 13-16
   * @param altLoc    cols: 17    Alternate location indicator
   * @param resName   cols: 18-20
   * @param chain     cols: 22
   * @param resNumber cols: 23-26
   * @param insCode   cols: 27    Insertion code
   */
  constructor(
    l: LineBase,
    public readonly number: number,
    /* Element */ public readonly atomElement: string,
    /* Name of the atom in the residue */ public readonly atomName: string,
    public readonly altLoc: string,
    /* Name of the residue */ public readonly resName: string,
    public readonly chain: string,
    public readonly resNumber: number,
    public readonly insCode: string,
  ) {
    super(l.lineTitle);
  }

  static fromStr(line: string): AtomBase {
    // TODO: Check line start (?)
    return new AtomBase(
      LineBase.fromStr(line.slice(1 - 1, 6)),
      /* number */ parseInt(line.slice(7 - 1, 11)),
      `${line.slice(13 - 1, 14).trim()}`,
      `${line.slice(15 - 1, 16).trim()}`,
      `${line.slice(17 - 1, 17).trim()}`,
      `${line.slice(18 - 1, 20).trim()}`,
      `${line.slice(22 - 1, 22).trim()}`,
      /* resNumber */ parseInt(line.slice(23 - 1, 26)),
      `${line.slice(27 - 1, 27).trim()}`,
    );
  }

  compare(b: AtomBase): number {
    // https://www.cgl.ucsf.edu/chimera/docs/UsersGuide/tutorials/pdbintro.html
    const a = this;
    if (a.chain != b.chain)
      return a.chain.localeCompare(b.chain);
    if (a.resNumber !== b.resNumber)
      return a.resNumber - b.resNumber;
    else {
      const aFullName = `${a.atomElement}${a.atomName}`;
      const bFullName = `${b.atomElement}${b.atomName}`;
      const aBackboneRank = backboneRanks[aFullName] ?? -1;
      const bBackboneRank = backboneRanks[bFullName] ?? -1;
      if (aBackboneRank !== -1 && bBackboneRank !== -1)
        return aBackboneRank - bBackboneRank;
      else if (aBackboneRank !== -1)
        return -1;
      else if (bBackboneRank !== -1)
        return +1;
      else {
        const aElement: string = a.atomElement.replaceAll(/\d+/g, '');
        const bElement: string = b.atomElement.replaceAll(/\d+/g, '');
        const aRemoteness = a.atomName.replaceAll(/\d+/g, '').slice(0, 1);
        const bRemoteness = b.atomName.replaceAll(/\d+/g, '').slice(0, 1);
        const aAtomNameRank = atomNameRanks[aRemoteness];
        const bAtomNameRank = atomNameRanks[bRemoteness];
        if (aAtomNameRank === undefined || bAtomNameRank === undefined) {
          return a.atomName.localeCompare(b.atomName);
        }
        if (aElement !== 'H' && bElement !== 'H') {
          // Both atoms are not hydrogen
          if (aAtomNameRank !== bAtomNameRank)
            return aAtomNameRank - bAtomNameRank;
          else {
            const aAtomNameNum = parseInt(a.atomName.slice(1));
            const bAtomNameNum = parseInt(b.atomName.slice(1));
            if (aAtomNameNum !== bAtomNameNum)
              return aAtomNameNum - bAtomNameNum;
            return a.atomName.localeCompare(b.atomName);
          }
        } else if (a.atomElement !== 'H' && b.atomElement === 'H')
          return -1;
        else if (a.atomElement === 'H' && b.atomElement !== 'H')
          return +1;
        else {
          // Both atoms are hydrogen
          if (aAtomNameRank !== bAtomNameRank)
            return aAtomNameRank - bAtomNameRank;
          else {
            const aAtomNameNum = parseInt(a.atomName.slice(1));
            const bAtomNameNum = parseInt(b.atomName.slice(1));
            return aAtomNameNum - bAtomNameNum;
          }
        }
      }
    }
  }

  toStr(): string {
    const res = [
      super.toStr() /* 1-6 */,
      (this.number > 0 ? this.number.toFixed(0) : '').padStart(5) /* 7-11 */, ' ' /* 12 */,
      this.atomElement.padStart(2) /* 13-14 */,
      this.atomName.padEnd(2) /* 15-16*/,
      this.altLoc.padEnd(1) /* 17 */,
      this.resName.padStart(3) /* 18-20 */, ' ' /* 21 */,
      this.chain.padEnd(1).slice(0, 1) /* 22 */,
      (this.resNumber >= 0 ? this.resNumber.toFixed(0) : '').padStart(4) /* 23-26 */,
      this.insCode.padEnd(1).slice(0, 1) /* 27 */,
    ].join('');
    if (res.length !== 27)
      throw new Error(`Invalid length ${res.length}, expected 27`);
    return res;
  }
}

/** 1-66 */
export class AtomCoordsBase extends AtomBase implements IAtomCoords {
  /**
   *
   * cols: 28-30 SPACE
   * @param x         cols: 31-38, f:8.3
   * @param y         cols: 39-46, f:8.3
   * @param z         cols: 47-54, f:8.3
   * @param occupancy cols: 55-60, f:6.2, vdW (occupancy?)
   * @param bFactor   cols: 61-66, f:6.2, Elec (temperature-/B-factor?)
   */
  constructor(
    a: AtomBase,
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
    public readonly occupancy: number,
    public readonly bFactor: number,
  ) {
    super(a, a.number, a.atomElement, a.atomName, a.altLoc, a.resName, a.chain, a.resNumber, a.insCode);
  }

  static fromStr(line: string): AtomCoordsBase {
    if (!(line.startsWith('ATOM  ') || line.startsWith('HETATM')))
      throw new Error('');
    return new AtomCoordsBase(
      AtomBase.fromStr(line.slice(1 - 1, 27)),
      /* x */ parseFloat(line.slice(31 - 1, 38)),
      /* y */ parseFloat(line.slice(39 - 1, 46)),
      /* z */ parseFloat(line.slice(47 - 1, 54)),
      /* occupancy */parseFloat(line.slice(55 - 1, 60)),
      /* bFactor*/ parseFloat(line.slice(61 - 1, 66)),
    );
  }

  isValid(): boolean {
    return this.number.toFixed(0).length <= 5 &&
      this.atomElement.length <= 2 &&
      this.atomName.length <= 2 &&
      this.altLoc.length == 1 &&
      this.resName.length <= 3 &&
      this.chain.length == 1 &&
      this.resNumber.toFixed(0).length <= 4 &&
      this.insCode.length == 1 &&
      this.x.toFixed(3).length <= 8 &&
      this.y.toFixed(3).length <= 8 &&
      this.z.toFixed(3).length <= 8 &&
      this.occupancy.toFixed(2).length <= 6 &&
      this.bFactor.toFixed(2).length <= 6;
  }

  toStr(): string {
    const res = [
      super.toStr() /* 1 - 27 */, '   ' /* 28-30 */,
      this.x.toFixed(3).padStart(8) /* 31-38 */,
      this.y.toFixed(3).padStart(8) /* 39-46 */,
      this.z.toFixed(3).padStart(8) /* 47-54 */,
      this.occupancy.toFixed(2).padStart(6) /* 55-60 */,
      this.bFactor.toFixed(2).padStart(6) /* 61-66 */,
    ].join('');
    if (res.length !== 66)
      throw new Error(`ATOM base line of invalid length ${res.length} != 66.`);
    return res;
  }
}

export class AtomTerBase extends AtomBase implements IAtomTer {}
