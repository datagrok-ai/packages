/* eslint-disable max-len */
import {HELM_MONOMER_TYPE, HELM_POLYMER_TYPE} from '@datagrok-libraries/bio/src/utils/const';
import {cleanupHelmSymbol} from '@datagrok-libraries/bio/src/helm/utils';

import {Bond} from './types';

/** Wrapper over simple polymer substring of HELM, like RNA1{d(A)p}  */
export class SimplePolymer {
  private isNucleotideSequence = false;
  constructor(private simplePolymer: string) {
    this.polymerType = this.getPolymerType();
    this.isNucleotideSequence = this.polymerType === HELM_POLYMER_TYPE.RNA;
    this.idx = this.getIdx();
    const {monomers, monomerTypes} = this.getMonomerSymbolsAndTypes();
    this.monomers = monomers;
    this.monomerTypes = monomerTypes;
  }

  readonly polymerType: string;
  readonly monomers: string[];
  private idx: number;
  private monomerTypes: HELM_MONOMER_TYPE[];

  /** Simple polymer id in the form 'polymer type' + 'index'  */
  get id(): string {
    return this.polymerType + this.idx.toString();
  }

  private getPolymerType(): string {
    const regex = new RegExp(
      `(${HELM_POLYMER_TYPE.PEPTIDE}|${HELM_POLYMER_TYPE.RNA})[0-9]+{`
    );
    const match = this.simplePolymer.match(regex);
    if (!match)
      throw new Error(`Unsupported polymer type in ${this.simplePolymer}`);
    const polymerType = match[1];
    return polymerType;
  }

  private getIdx(): number {
    const regex = new RegExp(`${this.polymerType}([0-9]+){`);
    const match = this.simplePolymer.match(regex);
    if (!match)
      throw new Error(`Cannot parse simple polymer id from ${this.simplePolymer}`);
    const id = parseInt(match[1]);
    return id;
  }

  private getMonomerSymbolsAndTypes(): { monomers: string[], monomerTypes: HELM_MONOMER_TYPE[] } {
    const helmWrapperRegex = new RegExp(`${this.polymerType}${this.idx}{|}`, 'g');
    const monomerGroups = this.simplePolymer.replace(helmWrapperRegex, '').split('.');
    const monomerList: string[] = [];
    const monomerTypeList: HELM_MONOMER_TYPE[] = [];
    monomerGroups.forEach((monomerGroup) => {
      if (!this.isNucleotideSequence) {
        // const splitted = monomerGroup.split(/\(|\)/).map((el) => el.replace(/[\[\]]/g, ''));
        // monomerList.push(...splitted);
        // WARNING: only the groups of the form r(A)p, as in RNA, are supported

        monomerList.push(cleanupHelmSymbol(monomerGroup));
        // const monomerTypes = splitted.map(
        //   (_, idx) => (idx % 2 === 0) ? HELM_MONOMER_TYPE.BACKBONE : HELM_MONOMER_TYPE.BRANCH
        // );

        // monomerTypeList.push(...monomerTypes);
        monomerTypeList.push(HELM_MONOMER_TYPE.BACKBONE);
      } else {
        const splitted = monomerGroup.split(/\(|\)/).filter((el) => !!el).map((el) => cleanupHelmSymbol(el));
        monomerList.push(...splitted);
        splitted.forEach((_, i) => monomerTypeList.push(i % 3 === 1 ? HELM_MONOMER_TYPE.BRANCH : HELM_MONOMER_TYPE.BACKBONE));
      }
    });
    return {monomers: monomerList, monomerTypes: monomerTypeList};
  }

  /** Get list of pairs for bonded monomers, monomers indexed locally
   * (within the simple polymer)  */
  getBondData(): Bond[][] {
    const result: Bond[][] = [];
    const backboneMonomerIndices = this.monomerTypes.map((type, idx) => {
      if (type === HELM_MONOMER_TYPE.BACKBONE)
        return idx;
    }
    ).filter((idx) => idx !== undefined) as number[];
    const branchMonomerIndices = this.monomerTypes.map((type, idx) => {
      if (type === HELM_MONOMER_TYPE.BRANCH)
        return idx;
    }
    ).filter((idx) => idx !== undefined) as number[];
    for (let i = 0; i < backboneMonomerIndices.length - 1; i++) {
      const backboneIdx = backboneMonomerIndices[i];
      const nextBackboneIdx = backboneMonomerIndices[i + 1];
      result.push([{monomerIdx: backboneIdx, rGroupId: 2}, {monomerIdx: nextBackboneIdx, rGroupId: 1}]);
    }
    for (let i = 0; i < branchMonomerIndices.length; i++) {
      const branchIdx = branchMonomerIndices[i];
      const backboneIdx = branchIdx - 1;
      result.push([{monomerIdx: backboneIdx, rGroupId: 3}, {monomerIdx: branchIdx, rGroupId: 1}]);
    }
    return result;
  }
}

