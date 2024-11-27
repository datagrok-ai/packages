import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import {NucleotideSequences} from './types';
import { STRAND } from './const';


export function isOverhangNucleotide(nucleotide: string): boolean {
  return nucleotide.endsWith('(o)');
}


export function getUniqueNucleotides(sequences: NucleotideSequences, isAsActive: boolean): string[] {
  let totalNucleotides: string[] = [];
  for (const key of Object.keys(sequences)) {
    if (key === STRAND.ANTISENSE && !isAsActive)
      continue;
    totalNucleotides = totalNucleotides.concat(sequences[key as STRAND])
  }
  return getUniqueSortedStrings(totalNucleotides);
}


export function getUniqueNucleotidesWithNumericLabels(
  modificationsWithNumericLabels: string[]
): string[] {
  const uniqueLabelledNucleotides = getUniqueSortedStrings(modificationsWithNumericLabels);

  return uniqueLabelledNucleotides.filter((nucleotide) => !isOverhangNucleotide(nucleotide));
}


export function getMostFrequentNucleotide(sequences: NucleotideSequences): string {
  const nucleotideToFrequencyMap = Object.values(sequences).flat().reduce((acc, nucleotide) => {
    acc[nucleotide] = (acc[nucleotide] || 0) + 1;
    return acc;
  }, {} as {[key: string]: number});

  const mostFrequentNucleotide = Object.entries(nucleotideToFrequencyMap)
    .reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];

  return mostFrequentNucleotide;
}

// export function addColumnWithIds(tableName: string, columnName: string, patternName: string) {
//   const nameOfNewColumn = 'ID ' + patternName;
//   const columns = grok.shell.table(tableName).columns;
//   if (columns.contains(nameOfNewColumn))
//     columns.remove(nameOfNewColumn);
//   const columnWithIds = columns.byName(columnName);
//   return columns.addNewString(nameOfNewColumn).init((i: number) => {
//     return (columnWithIds.getString(i) === '') ? '' : columnWithIds.get(i) + '_' + patternName;
//   });
// }

// export function addColumnWithTranslatedSequences(
//   tableName: string,
//   columnName: string,
//   bases: DG.InputBase[],
//   ptoLinkages: DG.InputBase[],
//   startModification: DG.InputBase,
//   endModification: DG.InputBase,
//   firstPtoExist: boolean) {
//   const nameOfNewColumn = 'Axolabs ' + columnName;
//   const columns = grok.shell.table(tableName).columns;
//   if (columns.contains(nameOfNewColumn))
//     columns.remove(nameOfNewColumn);
//   const columnWithInputSequences = columns.byName(columnName);
//   return columns.addNewString(nameOfNewColumn).init((i: number) => {
//     return columnWithInputSequences.getString(i) === '' ?
//       '' :
//       translateSequence(columnWithInputSequences.getString(i), bases, ptoLinkages, startModification, endModification,
//         firstPtoExist);
//   });
// }

export namespace StrandEditingUtils {
  export function getTruncatedStrandData(
    originalNucleotides: string[],
    originalPTOFlags: boolean[],
    newStrandLength: number,
    nucleotideIdx?: number
  ): {nucleotides: string[], ptoFlags: boolean[]} {
    //un case nucleotideIdx === 0, we also have to enter if
    if (nucleotideIdx != undefined) {
      const nucleotides = originalNucleotides.slice(0);
      nucleotides.splice(nucleotideIdx, 1);
      const ptoFlags = originalPTOFlags.slice(0);
      ptoFlags.splice(nucleotideIdx, 1);      
      return {nucleotides, ptoFlags};
    } 
    return {
      nucleotides: originalNucleotides.slice(0, newStrandLength),
      ptoFlags: originalPTOFlags.slice(0, newStrandLength + 1)
    }
  }

  export function getExtendedStrandData(
    originalNucleotides: string[],
    originalPTOFlags: boolean[],
    newStrandLength: number,
    sequenceBase: string,
    nucleotideIdx?: number
  ): {nucleotides: string[], ptoFlags: boolean[]} {
    if (nucleotideIdx != undefined) {
      const nucleotides = originalNucleotides.slice(0);
      nucleotides.splice(nucleotideIdx + 1, 0, sequenceBase);
      const ptoFlags = originalPTOFlags.slice(0);
      ptoFlags.splice(nucleotideIdx + 1, 0, true);      
      return {nucleotides, ptoFlags};
    }

    const appendedNucleotidesLength = newStrandLength - originalNucleotides.length;
    const nucleotides = originalNucleotides.concat(
      new Array(newStrandLength - originalNucleotides.length).fill(sequenceBase)
    );

    const appendedFlagsLength = (originalNucleotides.length === 0) ? newStrandLength + 1 : appendedNucleotidesLength;
    const ptoFlags = originalPTOFlags.concat(
      new Array(appendedFlagsLength).fill(true)
    );

    return {nucleotides, ptoFlags};
  }
}

function getUniqueSortedStrings(array: string[]): string[] {
  const uniqueStrings = Array.from(new Set(array));
  const sorted = Array.from(uniqueStrings).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return sorted;
}
