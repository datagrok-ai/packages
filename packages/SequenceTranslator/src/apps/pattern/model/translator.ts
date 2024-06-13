import * as grok from 'datagrok-api/grok';
import {STRAND, STRANDS, TERMINI, TERMINUS} from './const';
import {EventBus} from './event-bus';
import {ITranslationHelper} from '../../../types';
import {_package} from '../../../package';
import {JsonData} from '../../common/model/data-loader/json-loader';

export function bulkTranslate(eventBus: EventBus): void {
  const df = eventBus.getTableSelection();
  if (!df) {
    grok.shell.warning('Please select a table');
    return;
  }
  const strandColNames = STRANDS.filter(
    (strand) => !(strand === STRAND.ANTISENSE && !eventBus.isAntisenseStrandActive())
  ).map((strand) => eventBus.getSelectedStrandColumn(strand))
    .filter((colName) => colName) as string[];

  if (strandColNames.length === 0) {
    grok.shell.warning('Please column for sense strand');
    return;
  }

  const idColumnName = eventBus.getSelectedIdColumn();
  if (!idColumnName) throw new Error('No ID column selected');

  const idColumn = df.getCol(idColumnName);

  const strandCols = strandColNames.map((colName) => df.getCol(colName));
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

function getModificationsWithPTOLinkages(
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
