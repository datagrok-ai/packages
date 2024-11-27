import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {STRAND, STRANDS, TERMINI, TERMINUS} from './const';
import {EventBus} from './event-bus';
import {_package} from '../../../package';
import {JsonData} from '../../common/model/data-loader/json-loader';

export function bulkTranslate(eventBus: EventBus): void {
  const df = eventBus.getTableSelection();
  if (!df) {
    grok.shell.warning('Please select a table');
    return;
  }
  const strandInputData = STRANDS.filter(
    (strand) => !(strand === STRAND.ANTISENSE && !eventBus.isAntisenseStrandActive())
  ).map((strand) => {
    return {
      strand,
      column: eventBus.getSelectedStrandColumn(strand)
    };
  })
    .filter((el) => el.column);

  if (strandInputData.length === 0) {
    grok.shell.warning('Select a sense strand column');
    return;
  }

  const idColumnName = eventBus.getSelectedIdColumn();
  if (!idColumnName) throw new Error('No ID column selected');

  const idColumn = df.getCol(idColumnName);

  const strandColData = strandInputData.map((el) => {
    return {strand: el.strand, column: df.getCol(el.column!)};
  });

  if (!areStrandColsValid(strandColData, eventBus)) {
    grok.shell.warning(`Some strands in the table input do not match pattern length`);
    return;
  }

  strandColData.forEach((strandColData) => {
    const inputCol = strandColData.column;
    const strand = strandColData.strand;
    const modifications = eventBus.getNucleotideSequences()[strand];
    const terminals = eventBus.getTerminalModifications()[strand];
    const ptoFlags = eventBus.getPhosphorothioateLinkageFlags()[strand];

    const outputColName = `${eventBus.getPatternName()}(${inputCol.name})`;
    df.columns.addNewString(outputColName).init((i) => {
      const input = inputCol.get(i);
      return applyPatternToRawSequence(
        input, modifications, ptoFlags, terminals
      );
    });
  });
}

function areStrandColsValid(strandColumns: {strand: STRAND, column: DG.Column<string>}[], eventBus: EventBus) {
  const nucleotides = eventBus.getNucleotideSequences();
  return strandColumns.every((el) => {
    const patternLength = nucleotides[el.strand].length;
    return el.column.toList().every((input) => input.length === patternLength);
  });
}


export function applyPatternToRawSequence(
  rawNucleotideSequence: string,
  modifications: string[],
  ptoFlags: boolean[],
  terminalModifications: Record<TERMINUS, string>,
): string {
  const rawNucleotides = rawNucleotideSequence.split('');

  const modifiedNucleotides = rawNucleotides.map((nucleotide, i) => {
    const modifiedNucleotide = getModifiedNucleotide(nucleotide, modifications[i], _package.jsonData);
    return modifiedNucleotide;
  });

  const modificationsWithPTOLinkages = getModificationsWithPTOLinkages(
    modifiedNucleotides, ptoFlags, terminalModifications
  );

  return modificationsWithPTOLinkages.join('');
}

function getModifiedNucleotide(nucleotide: string, modification: string, jsonData: JsonData): string {
  const format = Object.keys(jsonData.patternAppData)[0];
  const substitution = jsonData.patternAppData[format][modification].substitution;
  return nucleotide.replace(/([AGCTU])/, substitution);
}

function getPhosphorothioateLinkageSymbol(): string {
  return 'ps';
}

export function getModificationsWithPTOLinkages(
  modifiedNucleotides: string[],
  ptoFlags: boolean[],
  terminalModifications: Record<TERMINUS, string>
): string[] {
  const modificationsWithPTOLinkages = new Array<string>(
    modifiedNucleotides.length + ptoFlags.filter((flag) => flag).length + TERMINI.length
  );

  const ptoLinkage = getPhosphorothioateLinkageSymbol();

  modificationsWithPTOLinkages[0] = terminalModifications[TERMINUS.FIVE_PRIME];
  modificationsWithPTOLinkages[modificationsWithPTOLinkages.length - 1] = terminalModifications[TERMINUS.THREE_PRIME];

  let idxShift = 1;

  if (ptoFlags[0]) {
    modificationsWithPTOLinkages[idxShift] = ptoLinkage;
    idxShift++;
  }

  modifiedNucleotides.forEach((nucleotide, i) => {
    modificationsWithPTOLinkages[i + idxShift] = nucleotide;
    if (ptoFlags[i + 1]) {
      modificationsWithPTOLinkages[i + idxShift + 1] = ptoLinkage;
      idxShift++;
    }
  });

  return modificationsWithPTOLinkages;
}
