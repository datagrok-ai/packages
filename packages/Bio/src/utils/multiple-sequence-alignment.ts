/* Do not change these import lines to match external modules in webpack configuration */
import * as DG from 'datagrok-api/dg';

import {FastaFileHandler} from '@datagrok-libraries/bio/src/utils/fasta-handler';
import {ALIGNMENT, TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';
//@ts-ignore: there are no types for this library
import Aioli from '@biowasm/aioli';

import {AlignedSequenceEncoder} from '@datagrok-libraries/bio/src/sequence-encoder';
const fastaInputFilename = 'input.fa';
const fastaOutputFilename = 'result.fasta';

/**
 * Converts array of sequences into simple fasta string.
 *
 * @param {string[]} sequences Input list of sequences.
 * @return {string} Fasta-formatted string.
 */
function _stringsToFasta(sequences: string[]): string {
  return sequences.reduce((a, v, i) => a + `>sample${i + 1}\n${v}\n`, '');
}

/**
 * Runs Aioli environment with kalign tool.
 *
 * @param {DG.Column} srcCol Column with sequences.
 * @param {boolean} isAligned Whether the column is aligned.
 * @param {string | undefined} unUsedName
 * @param {DG.Column | null} clustersCol Column with clusters.
 * @return {Promise<DG.Column>} Aligned sequences.
 */
export async function runKalign(srcCol: DG.Column<string>, isAligned: boolean = false, unUsedName: string = '',
  clustersCol: DG.Column | null = null): Promise<DG.Column> {
  let sequences: string[] = srcCol.toList();

  if (isAligned)
    sequences = sequences.map((v: string) => AlignedSequenceEncoder.clean(v).replace(/\-/g, ''));

  const sequencesLength = srcCol.length;
  clustersCol ??= DG.Column.string('Clusters', sequencesLength).init('0');
  if (clustersCol.type != DG.COLUMN_TYPE.STRING)
    clustersCol = clustersCol.convertTo(DG.TYPE.STRING);
  clustersCol.compact();

  //TODO: use fixed-size inner arrays, but first need to expose the method to get each category count
  const clustersColCategories = clustersCol.categories;
  const clustersColData = clustersCol.getRawData();
  const fastaSequences: string[][] = new Array(clustersColCategories.length);
  const clusterIndexes: number[][] = new Array(clustersColCategories.length);
  for (let rowIdx = 0; rowIdx < sequencesLength; ++rowIdx) {
    const clusterCategoryIdx = clustersColData[rowIdx];
    (fastaSequences[clusterCategoryIdx] ??= []).push(sequences[rowIdx]);
    (clusterIndexes[clusterCategoryIdx] ??= []).push(rowIdx);
  }

  const CLI = await new Aioli([
    'base/1.0.0',
    {tool: 'kalign', version: '3.3.1', reinit: true}
  ]);
  const tgtCol = DG.Column.string(unUsedName, sequencesLength);

  for (let clusterIdx = 0; clusterIdx < clustersColCategories.length; ++clusterIdx) {
    const clusterSequences = fastaSequences[clusterIdx];
    const fasta = _stringsToFasta(clusterSequences);

    await CLI.fs.writeFile(fastaInputFilename, fasta);
    const output = await CLI.exec(`kalign ${fastaInputFilename} -f fasta -o ${fastaOutputFilename}`);
    console.warn(output);

    const buf = await CLI.cat(fastaOutputFilename);
    if (!buf)
      throw new Error(`kalign output no result`);

    const ffh = new FastaFileHandler(buf);
    const aligned = ffh.sequencesArray; // array of sequences extracted from FASTA
    const clusterRowIds = clusterIndexes[clusterIdx];
    for (let clusterRowIdIdx = 0; clusterRowIdIdx < aligned.length; ++clusterRowIdIdx)
      tgtCol.set(clusterRowIds[clusterRowIdIdx], aligned[clusterRowIdIdx]);
  }

  // units
  const srcUnits = srcCol.getTag(DG.TAGS.UNITS);
  //aligned
  const tgtAligned = ALIGNMENT.SEQ_MSA;
  //alphabet
  const srcAlphabet = srcCol.getTag(bioTAGS.alphabet);

  tgtCol.setTag(DG.TAGS.UNITS, srcUnits);
  tgtCol.setTag(bioTAGS.aligned, tgtAligned);
  tgtCol.setTag(bioTAGS.alphabet, srcAlphabet);
  tgtCol.semType = DG.SEMTYPE.MACROMOLECULE;
  return tgtCol;
}

export async function testMSAEnoughMemory(col: DG.Column<string>): Promise<void> {
  const sequencesCount = col.length;
  const delta = sequencesCount / 100;

  for (let i = delta; i < sequencesCount; i += delta) {
    try {
      await runKalign(DG.Column.fromStrings(col.name, col.toList().slice(0, Math.round(i))));
      console.log(`runKalign succeeded on ${i}`);
    } catch (error) {
      console.log(`runKalign failed on ${i} with '${error}'`);
    }
  }
}
