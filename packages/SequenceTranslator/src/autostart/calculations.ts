import * as DG from 'datagrok-api/dg';
import {sortByStringLengthInDescendingOrder} from '../helpers';
import {MODIFICATIONS} from '../structures-works/map';

export function saltMass(saltNames: string[], molWeightCol: DG.Column, equivalentsCol: DG.Column, i: number, saltCol: DG.Column) {
  const saltRowIndex = saltNames.indexOf(saltCol.get(i));
  return (saltRowIndex == -1 || molWeightCol.get(saltRowIndex) == DG.FLOAT_NULL || equivalentsCol.get(i) == DG.INT_NULL) ?
    DG.FLOAT_NULL :
    molWeightCol.get(saltRowIndex) * equivalentsCol.get(i);
}

export function saltMolWeigth(saltNamesList: string[], saltCol: DG.Column, molWeightCol: DG.Column, i: number) {
  const saltRowIndex = saltNamesList.indexOf(saltCol.get(i));
  return (saltRowIndex == -1) ? DG.FLOAT_NULL : molWeightCol.get(saltRowIndex);
}

export function batchMolWeight(compoundMolWeightCol: DG.Column, saltMassCol: DG.Column, i: number) {
  return (compoundMolWeightCol.getString(i) == '' || saltMassCol.getString(i) == '') ?
    DG.FLOAT_NULL :
    compoundMolWeightCol.get(i) + saltMassCol.get(i);
}

export function molecularWeight(sequence: string, weightsObj: {[index: string]: number}): number {
  const codes = sortByStringLengthInDescendingOrder(Object.keys(weightsObj)).concat(Object.keys(MODIFICATIONS));
  let weight = 0;
  let i = 0;
  while (i < sequence.length) {
    const matchedCode = codes.find((s) => s == sequence.slice(i, i + s.length))!;
    weight += weightsObj[sequence.slice(i, i + matchedCode.length)];
    i += matchedCode.length;
  }
  return weight - 61.97;
}
