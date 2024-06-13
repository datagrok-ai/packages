import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {JsonData} from './apps/common/model/data-loader/json-loader';
import {MonomerLibWrapper} from './apps/common/model/monomer-lib/lib-wrapper';
import {SequenceValidator} from './apps/common/model/parsing-validation/sequence-validator';
import {FormatConverter} from './apps/translator/model/format-converter';
import {FormatDetector} from './apps/common/model/parsing-validation/format-detector';

export interface ITranslationHelper {
  get jsonData(): JsonData;
  get monomerLibWrapper(): MonomerLibWrapper;
  createSequenceValidator(sequence: string): SequenceValidator;
  createFormatConverter(sequence: string, sourceFormat: string): FormatConverter;
  createFormatDetector(sequence: string): FormatDetector;
  highlightInvalidSubsequence: (sequence: string) => HTMLSpanElement[];
}
