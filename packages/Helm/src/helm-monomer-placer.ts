import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {HelmType, Mol, PolymerType} from '@datagrok-libraries/bio/src/helm/types';

import {CellRendererBackBase} from '@datagrok-libraries/bio/src/utils/cell-renderer-back-base';

import {getParts, parseHelm} from './utils';

import {_package, getMonomerLib} from './package';

export interface ISeqMonomer {
  polymerType: PolymerType;
  symbol: string;
}

export class HelmMonomerPlacer extends CellRendererBackBase<string> {
  private _allPartsList: (string[] | null)[];
  private _lengthsList: (number[] | null)[];
  private _editorMolList: (Mol<HelmType> | null)[];

  public monomerCharWidth: number = 7;
  public leftPadding: number = 5;
  public monomerTextSizeMap: { [p: string]: TextMetrics } = {};

  public constructor(
    gridCol: DG.GridColumn | null,
    tableCol: DG.Column<string>
  ) {
    super(gridCol, tableCol, _package.logger);
  }

  protected override reset(): void {
    this._allPartsList = new Array<string[] | null>(this.tableCol.length).fill(null);
    this._lengthsList = new Array<number[] | null>(this.tableCol.length).fill(null);
    this._editorMolList = new Array<Mol<HelmType> | null>(this.tableCol.length).fill(null);
  }

  /** Skips cell for the fallback rendering */
  public skipCell(rowIdx: number): void {
    this._allPartsList[rowIdx] = [];
    this._lengthsList[rowIdx] = [];
  }

  /** @param rowIdx Row index of the table {@link DG.DataFrame}, HelmMonomerPlacer is {@link DG.Column} based */
  public getCellAllPartsLengths(rowIdx: number): [string[], number[], number[]] {
    const [allParts, lengths] = this.getCellMonomerLengthsForSeq(rowIdx);

    const sumLengths: number[] = new Array<number>(lengths.length + 1);
    sumLengths[0] = this.leftPadding; // padding
    for (let pos: number = 1; pos < sumLengths.length; pos++)
      sumLengths[pos] = sumLengths[pos - 1] + lengths[pos - 1];
    return [allParts, lengths, sumLengths];
  }

  private getCellMonomerLengthsForSeq(rowIdx: number): [string[], number[]] {
    let allParts: string[] | null = this._allPartsList![rowIdx];
    if (allParts === null) {
      const seq = this.tableCol.get(rowIdx);
      allParts = this._allPartsList![rowIdx] = getAllParts(seq);
    }

    let lengths: number[] | null = this._lengthsList![rowIdx];
    if (lengths === null) {
      lengths = this._lengthsList![rowIdx] = new Array<number>(allParts.length);
      for (const [part, partI] of wu.enumerate(allParts)) {
        const partWidth: number = part.length * this.monomerCharWidth;
        lengths[partI] = partWidth;
      }
    }

    return [allParts, lengths];
  }

  // -- Handle events --

  private monomerLibOnChanged(_value: any): void {
    this.reset();
    this.invalidateGrid();
  }

  public setEditorMol(tableRowIndex: number, editorMol: Mol<HelmType>) {
    this._editorMolList![tableRowIndex] = editorMol.clone(false);
  }

  public getEditorMol(tableRowIndex: number): Mol<HelmType> | null {
    return this._editorMolList![tableRowIndex];
  }
}

export function getAllParts(seq: string | null): string[] {
  const monomerList: string[] = !!seq ? parseHelm(seq) : [];
  return !!seq ? getParts(monomerList, seq) : [];
}
