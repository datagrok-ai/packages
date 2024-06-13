/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {CodesInfo} from '../data-loader/types';
import {DEFAULT_FORMATS} from '../const';
import {ITranslationHelper} from '../../../../types';
import {GROUP_TYPE, PHOSPHATE_SYMBOL} from '../../../translator/model/const';

const inverseLengthComparator = (a: string, b: string) => b.length - a.length;

export class FormatHandler {
  constructor(
    private readonly th: ITranslationHelper,
  ) {
    this.formats = this.getFormats();
  }

  /** Includes all formats except HELM (the "default" one)  */
  private formats: string[];

  /** All format names except HELM (the "default" one)  */
  getFormatNames(): string[] {
    return this.formats.sort();
  };

  getCodesByFormat(format: string): string[] {
    this.validateFormat(format);

    if (this.isHelm(format))
      throw new Error(`Codes cannot be obtained for HELM`);
    return this.getFormatCodes(format);
  }

  getHelmToFormatDict(format: string): { [key: string]: string } {
    this.validateFormat(format);

    const codesInfoObject = this.th.jsonData.codesToHelmDict[format] as CodesInfo;
    const dict = getHelmToCodeDict(codesInfoObject);
    return dict;
  }

  getFormatToHelmDict(format: string): { [key: string]: string } {
    this.validateFormat(format);

    const codesInfoObject = this.th.jsonData.codesToHelmDict[format] as CodesInfo;
    const dict = Object.assign({}, ...Object.values(codesInfoObject)) as { [code: string]: string };
    return dict;
  }

  /** Get helm codes for the specified format  */
  getTargetFormatHelmCodes(format: string): string[] {
    this.validateFormat(format);

    const dict = this.getHelmToFormatDict(format);
    const helmCodes = Object.keys(dict).sort(inverseLengthComparator);
    return helmCodes;
  }

  getTargetFormatHelmCodesRegExp(format: string): RegExp {
    this.validateFormat(format);

    const helmCodes = this.getTargetFormatHelmCodes(format);
    const helmRegExp = new RegExp(getRegExpPattern(helmCodes) + '|.', 'g');
    return helmRegExp;
  }

  getFormatRegExp(format: string): RegExp {
    this.validateFormat(format);

    if (this.isHelm(format))
      throw new Error(`Helm RegExp can be built for non-HELM target formats`);
    return this.getNonHelmFormatRegExp(format);
  }

  getPhosphateHelmCodesRegExp(format: string): RegExp {
    this.validateFormat(format);

    const codesInfoObject = this.th.jsonData.codesToHelmDict[format] as CodesInfo;
    const phosphateHELMCodes = Array.from(
      new Set(Object.values(codesInfoObject[GROUP_TYPE.LINKAGE]))
    ).sort(inverseLengthComparator);
    const phosphateHELMPattern = getRegExpPattern(phosphateHELMCodes);
    const phosphateRegExp = new RegExp(`${PHOSPHATE_SYMBOL}\.(${phosphateHELMPattern})`, 'g');
    return phosphateRegExp;
  }

  isValidFormat(format: string): boolean {
    return this.formats.includes(format);
  }

  private getFormats(): string[] {
    return Object.keys(this.th.jsonData.codesToHelmDict);
  }

  private validateFormat(format: string) {
    if (!this.isValidFormat(format))
      throw new Error(`Invalid format: ${format}`);
  }

  private isHelm(format: string): boolean {
    return format === DEFAULT_FORMATS.HELM;
  }

  private getFormatCodes(format: string): string[] {
    const dict = this.getFormatToHelmDict(format);
    const formatCodes = Object.keys(dict).sort(inverseLengthComparator);
    return formatCodes;
  }

  private getNonHelmFormatRegExp(format: string): RegExp {
    const formatCodes = this.getCodesByFormat(format);
    // the added group before '|.' is to avoid mismatch inside parenthesis
    const formatRegExp = new RegExp(getRegExpPattern(formatCodes) + '|\\([^()]*\\)|.', 'g');
    return formatRegExp;
  }
}

export function getRegExpPattern(arr: string[]): string {
  const negativeLookBehind = '(?<!\\([^()]*)'; // not '(' followed by non-parenths
  const negativeLookAhead = '(?![^()]*\\))'; // not ')' preceded by non-parenths
  const escaped = arr.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .map((key) => {
      if (!key.includes('(') && !key.includes(')'))
        return `${negativeLookBehind}${key}${negativeLookAhead}`;
      return key;
    });
  const result = escaped.join('|');
  return result;
}

function getHelmToCodeDict(infoObj: CodesInfo) {
  const result: { [key: string]: string | string[] } = {};
  Object.values(infoObj).forEach((obj: { [code: string]: string }) => {
    Object.entries(obj).forEach(([code, helm]) => {
      const key = helm.replace(/\)p/g, ')').replace(/\]p/g, ']');
      if (result[key] === undefined)
        result[key] = [code];
      else
        (result[key] as string[]).push(code);
    });
  });
  Object.entries(result).forEach(([key, value]) => {
    const sorted = (value as string[]).sort(inverseLengthComparator);
    result[key] = sorted[0] as string;
  });
  return result as { [key: string]: string };
}
