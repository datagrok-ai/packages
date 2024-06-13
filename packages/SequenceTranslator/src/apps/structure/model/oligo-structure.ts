import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {errorToConsole} from '@datagrok-libraries/utils/src/to-console';

import {download} from '../../common/model/helpers';
import {SequenceToMolfileConverter} from './sequence-to-molfile';
import {linkStrandsV3000} from './mol-transformations';
import {ITranslationHelper} from '../../../types';

export type StrandData = {
  strand: string,
  invert: boolean
}

/** Get a molfile for a single strand */
export function getMolfileForStrand(strand: string, invert: boolean, th: ITranslationHelper): string {
  if (strand === '')
    return '';
  const format = th.createFormatDetector(strand).getFormat();
  if (!format)
    return '';
  let molfile = '';
  try {
    molfile = (new SequenceToMolfileConverter(strand, invert, format)).convert();
  } catch (err) {
    const errStr = errorToConsole(err);
    console.error(errStr);
  }
  return molfile;
}

/** Get molfile for single strand or linked strands */
export function getLinkedMolfile(
  ss: StrandData, as: StrandData, as2: StrandData, useChiral: boolean, th: ITranslationHelper
): string {
  const nonEmptyStrands = [ss, as, as2].filter((item) => item.strand !== '');
  if (nonEmptyStrands.length === 1) {
    return getMolfileForStrand(nonEmptyStrands[0].strand, nonEmptyStrands[0].invert, th);
  } else {
    const ssMol = getMolfileForStrand(ss.strand, ss.invert, th);
    const asMol = getMolfileForStrand(as.strand, as.invert, th);
    const as2Mol = getMolfileForStrand(as2.strand, as2.invert, th);

    // select only the non-empty anti-strands
    const antiStrands = [asMol, as2Mol].filter((item) => item !== '');
    const resultingMolfile = linkStrandsV3000({senseStrands: [ssMol], antiStrands: antiStrands}, useChiral);

    return resultingMolfile;
  }
}

/** Save sdf in case ss and as (and optionally as2) strands entered */
export function saveSdf(
  ss: StrandData, as: StrandData, as2: StrandData, useChiral: boolean, oneEntity: boolean,
  th: ITranslationHelper
): void {
  const nonEmptyStrands = [ss.strand, as.strand, as2.strand].filter((item) => item !== '');
  if (
    nonEmptyStrands.length === 0 ||
    nonEmptyStrands.length === 1 && ss.strand === ''
  ) {
    grok.shell.warning('Enter SENSE_STRAND and optionally ANTISENSE_STRAND/AS2 to save SDF');
  } else {
    let result: string;
    if (oneEntity) {
      result = getLinkedMolfile(ss, as, as2, useChiral, th) + '\n$$$$\n';
    } else {
      const ssMol = getMolfileForStrand(ss.strand, ss.invert, th);
      const asMol = getMolfileForStrand(as.strand, as.invert, th);
      const as2Mol = getMolfileForStrand(as2.strand, as2.invert, th);
      result = ssMol + '\n' +
        `> <Sequence>\nSense Strand\n$$$$\n`;
      if (asMol) {
        result += asMol + '\n' +
          `> <Sequence>\nAnti Sense\n$$$$\n`;
      }
      if (as2Mol) {
        result += as2Mol + '\n' +
          `> <Sequence>\nAnti Sense 2\n$$$$\n`;
      }
    }

    // construct date-time in the form yyyy-mm-dd_hh-mm-ss
    const date = new Date();

    function pad(x: number): string {
      return (x >= 10) ? x.toString() : '0' + x.toString();
    }

    const dateString: string = date.getFullYear() + '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) + '_' + pad(date.getHours()) + '-' +
      pad(date.getMinutes()) + '-' + pad(date.getSeconds());

    download(`SequenceTranslator-${dateString}.sdf`, encodeURIComponent(result));
  }
}
