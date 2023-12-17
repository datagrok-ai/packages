import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
// @ts-ignore
import * as svg from 'save-svg-as-png';
import $ from 'cash-dom';

import {isOverhang} from './helpers';
import {axolabsStyleMap} from '../data-loading-utils/json-loader';

export function generateExample(sequenceLength: number, sequenceBasis: string): string {
  const AXOLABS_MAP = axolabsStyleMap;
  const uniqueSymbols = AXOLABS_MAP[sequenceBasis].symbols.join('');
  return uniqueSymbols.repeat(Math.floor(sequenceLength / 4)) + uniqueSymbols.slice(0, sequenceLength % 4);
}

export function findDuplicates(data: Int32Array | Float32Array | Float64Array | Uint32Array): number[] {
  return Array.from(new Set(data)).filter((value) => data.indexOf(value) !== data.lastIndexOf(value));
}

export async function isPatternCreatedByCurrentUser(patternName: string): Promise<boolean> {
  return await grok.dapi.users.current().then((user) => {
    const [firstName, lastName] = getUserName(patternName);
    return (user.firstName !== firstName || user.lastName !== lastName);
  });
}

export function getShortName(patternName: string): string {
  let first = patternName.length + 1;
  for (let i = 0; i < patternName.length; i++) {
    if (patternName[i] === '(') {
      first = i;
      break;
    }
  }
  return patternName.slice(0, first - 1);
}

function getUserName(patternName: string): string[] {
  let first = -1;
  for (let i = 0; i < patternName.length; i++) {
    if (patternName[i] === '(') {
      first = i;
      break;
    }
  }
  return (first === -1) ? ['', ''] : patternName.slice(first + 9, patternName.length - 1).split(' ').slice(1);
}

export function translateSequence(
  sequence: string,
  bases: DG.InputBase[],
  ptoLinkages: DG.InputBase[],
  startModification: DG.InputBase,
  endModification: DG.InputBase,
  firstPtoExist: boolean): string {
  let i: number = -1;
  let mainSequence = sequence.replace(/[AUGC]/g, function(x: string) {
    i++;
    const AXOLABS_MAP = axolabsStyleMap;

    const baseChoices: string[] = Object.keys(AXOLABS_MAP);
    // const defaultBase: string = baseChoices[0];
    const indexOfSymbol = AXOLABS_MAP['RNA']['symbols'].indexOf(x);
    let symbol = AXOLABS_MAP[bases[i].value]['symbols'][indexOfSymbol];
    if (isOverhang(bases[i].value)) {
      if (i < sequence.length / 2 && !isOverhang(bases[i + 1].value))
        symbol = symbol + x + 'f';
      else if (i > sequence.length / 2 && !isOverhang(bases[i - 1].value))
        symbol = x + 'f' + symbol;
    }
    return (ptoLinkages[i].value) ? symbol + 's' : symbol;
  });
  if (mainSequence.slice(0, 5).split('mU').length === 3)
    mainSequence = '(uu)' + mainSequence.slice(4);
  if (mainSequence.slice(mainSequence.length - 7).split('mU').length === 3)
    mainSequence = mainSequence.slice(0, mainSequence.length - 4) + '(uu)';
  return startModification.value + (firstPtoExist ? 's' : '') + mainSequence + endModification.value;
}

export function addColumnWithIds(tableName: string, columnName: string, patternName: string) {
  const nameOfNewColumn = 'ID ' + patternName;
  const columns = grok.shell.table(tableName).columns;
  if (columns.contains(nameOfNewColumn))
    columns.remove(nameOfNewColumn);
  const columnWithIds = columns.byName(columnName);
  return columns.addNewString(nameOfNewColumn).init((i: number) => {
    return (columnWithIds.getString(i) === '') ? '' : columnWithIds.get(i) + '_' + patternName;
  });
}

export function addColumnWithTranslatedSequences(
  tableName: string,
  columnName: string,
  bases: DG.InputBase[],
  ptoLinkages: DG.InputBase[],
  startModification: DG.InputBase,
  endModification: DG.InputBase,
  firstPtoExist: boolean) {
  const nameOfNewColumn = 'Axolabs ' + columnName;
  const columns = grok.shell.table(tableName).columns;
  if (columns.contains(nameOfNewColumn))
    columns.remove(nameOfNewColumn);
  const columnWithInputSequences = columns.byName(columnName);
  return columns.addNewString(nameOfNewColumn).init((i: number) => {
    return columnWithInputSequences.getString(i) === '' ?
      '' :
      translateSequence(columnWithInputSequences.getString(i), bases, ptoLinkages, startModification, endModification,
        firstPtoExist);
  });
}
