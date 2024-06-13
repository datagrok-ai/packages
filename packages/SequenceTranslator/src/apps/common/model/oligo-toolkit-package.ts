import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {getMonomerLibHelper, IMonomerLibHelper} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {IMonomerLib, Monomer} from '@datagrok-libraries/bio/src/types';

import {APP_NAME} from '../view/const';
import {DEFAULT_LIB_FILENAME, FALLBACK_LIB_PATH} from './data-loader/const';
import {tryCatch} from './helpers';
import {ITranslationHelper} from '../../../types';
import {SequenceValidator} from './parsing-validation/sequence-validator';
import {JsonData, loadJsonData} from './data-loader/json-loader';
import {MonomerLibWrapper} from './monomer-lib/lib-wrapper';
import {_package} from '../../../package';
import {FormatConverter} from '../../translator/model/format-converter';
import {FormatDetector} from './parsing-validation/format-detector';
import {highlightInvalidSubsequence} from '../view/components/colored-input/input-painters';

export class OligoToolkitPackage extends DG.Package implements ITranslationHelper {
  private _monomerLib?: IMonomerLib;
  get monomerLib(): IMonomerLib {
    if (!this._monomerLib)
      throw new Error('Monomer lib not loaded');
    return this._monomerLib!;
  }

  private _jsonData: JsonData;
  get jsonData(): JsonData {
    if (!this._jsonData)
      throw new Error('Json data not loaded');
    return this._jsonData;
  }

  private _monomerLibWrapper: MonomerLibWrapper;
  get monomerLibWrapper(): MonomerLibWrapper {
    if (!this._monomerLibWrapper)
      throw new Error('Monomer lib wrapper not loaded');
    return this._monomerLibWrapper;
  }

  constructor() {
    super();
  }

  private initPromise?: Promise<void>;

  async initLibData(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const packageSettings = await this.getSettings();
        let monomersPath: string = packageSettings['MonomersPath'];
        if (!monomersPath || !(await grok.dapi.files.exists(monomersPath))) {
          _package.logger.warning(`Monomers path '${monomersPath}' not found. ` +
            `Fallback to monomers sample path '${FALLBACK_LIB_PATH}'.`);
          monomersPath = FALLBACK_LIB_PATH;
        }
        [this._jsonData, this._monomerLib] = await Promise.all([
          loadJsonData(monomersPath),
          loadMonomerLib(monomersPath)
        ]);
        this._monomerLibWrapper = new MonomerLibWrapper(this.monomerLib, this.jsonData);
      })();
    }
    return this.initPromise;
  }

  async getTranslationHelper(): Promise<ITranslationHelper> {
    return (await grok.functions.call(`${this.name}:getTranslationHelper`)) as ITranslationHelper;
  }

  createSequenceValidator(sequence: string): SequenceValidator {
    return new SequenceValidator(sequence, this);
  }

  createFormatConverter(sequence: string, sourceFormat: string): FormatConverter {
    return new FormatConverter(sequence, sourceFormat, this);
  }

  createFormatDetector(sequence: string): FormatDetector {
    return new FormatDetector(sequence, this);
  }

  highlightInvalidSubsequence = (input: string): HTMLSpanElement[] => {
    return highlightInvalidSubsequence(input, this);
  };
}

async function loadMonomerLib(monomersPath: string): Promise<IMonomerLib> {
  const pi: DG.TaskBarProgressIndicator = DG.TaskBarProgressIndicator.create(
    `Initializing ${APP_NAME.COMBINED} monomer library ...`);
  try {
    const libHelper = await getMonomerLibHelper();
    const res = await libHelper.readLibrary(monomersPath, DEFAULT_LIB_FILENAME);
    return res;
  } finally { pi.close(); }
}
