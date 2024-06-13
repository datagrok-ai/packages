import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {DEFAULT_FORMATS} from '../apps/common/model/const';
import {ITranslationHelper} from '../types';

export class OligoToolkitTestPackage extends DG.Package {
  async getTranslationHelper(): Promise<ITranslationHelper> {
    return (await grok.functions.call(`${this.name}:getTranslationHelper`)) as ITranslationHelper;
  }
}

export function getHelm(strand: string, format: string, th: ITranslationHelper): string {
  return th.createFormatConverter(strand, format).convertTo(DEFAULT_FORMATS.HELM);
}

export function getFormat(helm: string, format: string, th: ITranslationHelper): string {
  return th.createFormatConverter(helm, DEFAULT_FORMATS.HELM).convertTo(format);
}
