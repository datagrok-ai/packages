// import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {Observable, Subject} from 'rxjs';
import {IMonomerLib, Monomer} from '@datagrok-libraries/bio/src/types/index';
import {
  createJsonMonomerLibFromSdf,
  IMonomerLibHelper,
} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {HELM_REQUIRED_FIELDS as REQ, HELM_OPTIONAL_FIELDS as OPT} from '@datagrok-libraries/bio/src/utils/const';
import {_package} from '../package';

const _HELM_REQUIRED_FIELDS_ARRAY = [
  REQ.SYMBOL, REQ.NAME, REQ.MOLFILE, REQ.AUTHOR, REQ.ID,
  REQ.RGROUPS, REQ.SMILES, REQ.POLYMER_TYPE, REQ.MONOMER_TYPE, REQ.CREATE_DATE,
] as const;

const _HELM_OPTIONAL_FIELDS_ARRAY = [OPT.NATURAL_ANALOG, OPT.META] as const;
// -- Monomer libraries --
export const LIB_STORAGE_NAME = 'Libraries';
export const LIB_PATH = 'System:AppData/Bio/libraries/';
export const LIB_DEFAULT: { [fileName: string]: string } = {'HELMCoreLibrary.json': 'HELMCoreLibrary.json'};

/** Type for user settings of monomer library set to use. */
export type LibSettings = {
  exclude: string[],
}

export async function getLibFileNameList(): Promise<string[]> {
  // list files recursively because permissions are available for folders only
  const res: string[] = await Promise.all((await grok.dapi.files.list(LIB_PATH, true, ''))
    .map(async (it) => {
      // Get relative path (to LIB_PATH)
      return it.fullPath.substring(LIB_PATH.length);
    }));
  return res;
}

export async function getUserLibSettings(): Promise<LibSettings> {
  const resStr: string = await grok.dapi.userDataStorage.getValue(LIB_STORAGE_NAME, 'Settings', true);
  const res: LibSettings = resStr ? JSON.parse(resStr) : {exclude: []};

  // Fix empty object returned in case there is no settings stored for user
  res.exclude = res.exclude instanceof Array ? res.exclude : [];

  return res;
}

export async function setUserLibSetting(value: LibSettings): Promise<void> {
  await grok.dapi.userDataStorage.postValue(LIB_STORAGE_NAME, 'Settings', JSON.stringify(value), true);
}

export class MonomerLib implements IMonomerLib {
  public readonly error: string | undefined;

  private _monomers: { [polymerType: string]: { [monomerSymbol: string]: Monomer } } = {};
  private _onChanged = new Subject<any>();

  constructor(monomers: { [polymerType: string]: { [monomerSymbol: string]: Monomer } }, error?: string) {
    this._monomers = monomers;
    this.error = error;
  }

  getMonomer(polymerType: string, monomerSymbol: string): Monomer | null {
    if (polymerType in this._monomers! && monomerSymbol in this._monomers![polymerType])
      return this._monomers![polymerType][monomerSymbol];
    else
      return null;
  }

  getPolymerTypes(): string[] {
    return Object.keys(this._monomers);
  }

  getMonomerMolsByPolymerType(polymerType: string): { [monomerSymbol: string]: string } {
    const res: { [monomerSymbol: string]: string } = {};

    Object.keys(this._monomers[polymerType]).forEach((monomerSymbol) => {
      res[monomerSymbol] = this._monomers[polymerType][monomerSymbol].molfile;
    });

    return res;
  }

  getMonomerSymbolsByType(polymerType: string): string[] {
    return Object.keys(this._monomers[polymerType]);
  }

  get onChanged(): Observable<any> {
    return this._onChanged;
  }

  private _updateInt(lib: IMonomerLib): void {
    const typesNew = lib.getPolymerTypes();
    const types = this.getPolymerTypes();

    typesNew.forEach((type) => {
      //could possibly rewrite -> TODO: check duplicated monomer symbol

      if (!types.includes(type))
        this._monomers![type] = {};

      const monomers = lib.getMonomerSymbolsByType(type);
      monomers.forEach((monomerSymbol) => {
        this._monomers[type][monomerSymbol] = lib.getMonomer(type, monomerSymbol)!;
      });
    });
  }

  public update(lib: IMonomerLib): void {
    this._updateInt(lib);
    this._onChanged.next();
  }

  public updateLibs(libList: IMonomerLib[], reload: boolean = false): void {
    if (reload) this._monomers = {};
    for (const lib of libList) if (!lib.error) this._updateInt(lib);
    this._onChanged.next();
  }

  public clear(): void {
    this._monomers = {};
    this._onChanged.next();
  }
}

export class MonomerLibHelper implements IMonomerLibHelper {
  private readonly _monomerLib: MonomerLib = new MonomerLib({});

  /** Protect constructor to prevent multiple instantiation. */
  protected constructor() {}

  /** Singleton monomer library
   * @return {MonomerLibHelper} MonomerLibHelper instance
   */
  getBioLib(): IMonomerLib {
    return this._monomerLib;
  }

  /** Allows syncing with managing settings/loading libraries */
  public loadLibrariesPromise: Promise<void> = Promise.resolve();

  /** Loads libraries based on settings in user storage {@link LIB_STORAGE_NAME}
   * @param {boolean} reload Clean {@link monomerLib} before load libraries [false]
   */
  async loadLibraries(reload: boolean = false): Promise<void> {
    return this.loadLibrariesPromise = this.loadLibrariesPromise.then(async () => {
      // This function is not allowed to throw any exception,
      // because it will prevent further handling monomer library settings
      // through blocking this.loadLibrariesPromise
      try {
        const [libFileNameList, settings]: [string[], LibSettings] = await Promise.all([
          getLibFileNameList(),
          getUserLibSettings(),
        ]);
        const libs: IMonomerLib[] = await Promise.all(libFileNameList
          .filter((libFileName) => !settings.exclude.includes(libFileName))
          .map((libFileName) => {
            //TODO handle whether files are in place
            return this.readLibrary(LIB_PATH, libFileName).catch((err: any) => {
              const errMsg: string = `Loading monomers from '${libFileName}' error: ` +
                `${err instanceof Error ? err.message : err.toString()}`;
              return new MonomerLib({}, errMsg);
            });
          }));
        this._monomerLib.updateLibs(libs, reload);
      } catch (err: any) {
        const errMsg: string = 'Loading monomer libraries error: ' +
          `${err instanceof Error ? err.message : err.toString()}`;
        grok.shell.warning(errMsg);

        const errStack = err instanceof Error ? err.stack : undefined;
        _package.logger.error(errMsg, undefined, errStack);
      }
    });
  }

  /** Reads library from file shares, handles .json and .sdf
   * @param {string} path Path to library file
   * @param {string} fileName Name of library file
   * @return {Promise<IMonomerLib>} Promise of IMonomerLib
   */
  async readLibrary(path: string, fileName: string): Promise<IMonomerLib> {
    let rawLibData: any[] = [];
    let file;
    let dfSdf;
    const fileSource = new DG.FileSource(path);
    if (fileName.endsWith('.sdf')) {
      const funcList: DG.Func[] = DG.Func.find({package: 'Chem', name: 'importSdf'});
      if (funcList.length === 1) {
        file = await fileSource.readAsBytes(fileName);
        dfSdf = await grok.functions.call('Chem:importSdf', {bytes: file});
        rawLibData = createJsonMonomerLibFromSdf(dfSdf[0]);
      } else {
        grok.shell.warning('Chem package is not installed');
      }
    } else {
      const file = await fileSource.readAsText(fileName);
      rawLibData = JSON.parse(file);
    }

    const monomers: { [polymerType: string]: { [monomerSymbol: string]: Monomer } } = {};
    const polymerTypes: string[] = [];
    rawLibData.forEach((monomer) => {
      if (!polymerTypes.includes(monomer[REQ.POLYMER_TYPE])) {
        monomers[monomer[REQ.POLYMER_TYPE]] = {};
        polymerTypes.push(monomer[REQ.POLYMER_TYPE]);
      }
      monomers[monomer[REQ.POLYMER_TYPE]][monomer[REQ.SYMBOL]] = monomer as Monomer;
    });

    return new MonomerLib(monomers);
  }

  // -- Instance singleton --
  private static _instance: MonomerLibHelper | null = null;

  public static get instance(): MonomerLibHelper {
    if (!MonomerLibHelper._instance) MonomerLibHelper._instance = new MonomerLibHelper();
    return MonomerLibHelper._instance;
  }
}
