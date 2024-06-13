import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export interface IAtomBase {
  get number(): number;
  get atomElement(): string;
  get atomName(): string;
  get altLoc(): string;
  get resName(): string;
  get chain(): string;
  get resNumber(): number;
  get insCode(): string;

  compare(b: IAtomBase): any;
  toStr(): string;
}

export interface IAtomTer extends IAtomBase {}

export interface IAtomCoords extends IAtomBase {
  get x(): number;
  get y(): number;
  get z(): number;
  get occupancy(): number;
  get bFactor(): number;
}

// -- PDB --

export interface IPdbAtomBase extends IAtomBase {
}

export interface IPdbAtomCoords extends IPdbAtomBase, IAtomCoords {}

export interface IPdbAtomTer extends IPdbAtomBase, IAtomTer {}

// -- Pdbqt --

export interface IPdbqtAtomBase extends IAtomBase {
  toPdb(): IPdbAtomBase;
}

export interface IPdbqtAtomCoords extends IPdbqtAtomBase, IAtomCoords {
  toPdb(): IPdbAtomCoords;
}

export interface IPdbqtAtomTer extends IPdbqtAtomBase, IAtomTer {
  toPdb(): IPdbAtomTer;
}
