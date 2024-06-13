import * as DG from 'datagrok-api/dg';

import {DEFAULT_FORMATS} from '../../common/model/const';
import {FormatHandler, getRegExpPattern} from '../../common/model/parsing-validation/format-handler';
import {ITranslationHelper} from '../../../types';
import {PHOSPHATE_SYMBOL, UNKNOWN_SYMBOL} from './const';

const HELM_WRAPPER = {
  LEFT: 'RNA1{',
  RIGHT: '}$$$$',
};

export class FormatConverter {
  constructor(
    private readonly sequence: string,
    private readonly sourceFormat: string,
    private readonly th: ITranslationHelper,
  ) { };

  private formats = new FormatHandler(this.th);

  convertTo(targetFormat: string): string {
    const formats = this.formats.getFormatNames();

    if (this.sourceFormat === DEFAULT_FORMATS.HELM && formats.includes(targetFormat)) {
      return this.helmToFormat(this.sequence, targetFormat);
    } else if (formats.includes(this.sourceFormat) && targetFormat === DEFAULT_FORMATS.HELM) {
      return this.formatToHelm(this.sequence, this.sourceFormat);
    } else if ([this.sourceFormat, targetFormat].every((el) => formats.includes(el))) {
      const helm = this.formatToHelm(this.sequence, this.sourceFormat);
      return this.helmToFormat(helm, targetFormat);
    } else {
      throw new Error(`ST: unsupported translation direction ${this.sourceFormat} -> ${targetFormat}`);
    }
  }

  private helmToFormat(helmSequence: string, targetFormat: string): string {
    const wrapperRegExp = new RegExp(getRegExpPattern(Object.values(HELM_WRAPPER)), 'g');
    let result = helmSequence.replace(wrapperRegExp, '');

    const dict = this.formats.getHelmToFormatDict(targetFormat);
    const helmCodes = this.formats.getTargetFormatHelmCodes(targetFormat);
    const helmRegExp = this.formats.getTargetFormatHelmCodesRegExp(targetFormat);

    result = result.replace(helmRegExp, (match) => {
      return helmCodes.includes(match) ? dict[match] :
        (match === 'p' || match === '.') ? match : '?';
    }).replace(/\?+/g, UNKNOWN_SYMBOL).replace(/p\.|\./g, '');
    result = result.replace(/<empty>/g, '');
    // remove double slash in LCMS codes
    result = result.replace(/\/\//g, '/');
    return result;
  }

  private formatToHelm(sequence: string, sourceFormat: string): string {
    const dict = this.formats.getFormatToHelmDict(sourceFormat);
    const formatCodes = this.formats.getCodesByFormat(sourceFormat);
    const formatRegExp = this.formats.getFormatRegExp(sourceFormat);
    const phosphateRegExp = this.formats.getPhosphateHelmCodesRegExp(sourceFormat);

    let helm = !sequence ? '' : sequence.replace(formatRegExp, (match) => {
      const result = formatCodes.includes(match) ? dict[match] + '.' : '?';
      return result;
    });
    helm = helm.replace(/\?+/g, `${UNKNOWN_SYMBOL}.`);
    helm = helm.slice(0, -1); // strip last dot
    if (helm[helm.length - 1] === PHOSPHATE_SYMBOL)
      helm = helm.slice(0, -1);
    helm = helm.replace(phosphateRegExp, (match, group) => group);
    helm = helm.replace(/<empty>/g, '');
    return `${HELM_WRAPPER.LEFT + helm + HELM_WRAPPER.RIGHT}`;
  }
}
