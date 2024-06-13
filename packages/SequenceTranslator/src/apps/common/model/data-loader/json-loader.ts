/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  PATTERN_APP_DATA_FILENAME, CODES_TO_HELM_DICT_FILENAME,
  CODES_TO_SYMBOLS_FILENAME, MONOMERS_WITH_PHOSPHATE_FILENAME
} from './const';
import {PatternAppData, CodeToSymbol, FormatToHELMDict} from './types';

export class JsonData {
  constructor(
    public readonly patternAppData: PatternAppData,
    public readonly codesToHelmDict: FormatToHELMDict,
    public readonly codesToSymbolsDict: CodeToSymbol,
    public readonly monomersWithPhosphate: { [key: string]: string[] }
  ) {};
}

export async function loadJsonData(monomersPath: string): Promise<JsonData> {
  const data = await Promise.all(
    [
      PATTERN_APP_DATA_FILENAME, CODES_TO_HELM_DICT_FILENAME,
      CODES_TO_SYMBOLS_FILENAME, MONOMERS_WITH_PHOSPHATE_FILENAME
    ].map((fileName) => loadAndParseJson(monomersPath, fileName))
  );
  return new JsonData(data[0], data[1], data[2], data[3]);
}

async function loadAndParseJson(path: string, fileName: string): Promise<any> {
  const filePath = path.endsWith('/') ? `${path}${fileName}` : `${path}/${fileName}`;
  try {
    const content = await grok.dapi.files.readAsText(filePath);
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading json from '${filePath}':`, err);
  }
}
