import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import {_package} from '../package';
import {
  CdrMapType,
  DataLoader,
  FilterPropertiesType,
  JsonType,
  MutcodesDataType,
  NumsType,
  ObsPtmType,
  PtmMapType,
  catchToLog,
} from './data-loader';


export class DataLoaderFiles extends DataLoader {
  private _pName: string = 'MolecularLiabilityBrowser';

  private _files = {
    filterProps: 'properties.json',
    mutcodes: 'mutcodes.json',
    ptm_map: 'ptm_map.json',
    cdr_map: 'cdr_map.json',
    ptm_in_cdr: 'ptm_in_cdr.d42',
    h_out: 'h_out.csv',
    l_out: 'l_out.csv',
    mlb: 'mlb.csv',
    tree: 'tree.csv',
    example: 'example.json',
    examplePDB: 'examplePDB.json',
    exampleOptm: 'exampleOptm.json',
    realNums: 'exampleNums.json',
  };
  private _vids: string[];
  private _vidsObsPtm: string[];
  private _filterProperties: FilterPropertiesType;
  private _mutcodes: MutcodesDataType;
  private _ptmMap: PtmMapType;
  private _cdrMap: CdrMapType;
  private _refDf: DG.DataFrame;
  private _realNums: any;

  get vids(): string[] { return this._vids; }

  get vidsObsPtm(): string[] { return this._vidsObsPtm; }

  get filterProperties(): FilterPropertiesType { return this._filterProperties; }

  get mutcodes(): MutcodesDataType { return this._mutcodes; }

  get ptmMap(): PtmMapType { return this._ptmMap; }

  get cdrMap(): CdrMapType { return this._cdrMap; }

  get refDf(): DG.DataFrame { return this._refDf; }

  get realNums(): NumsType { return this._realNums; }

  async init() {
    const t1 = Date.now();
    // Check files disabled while too much time consuming
    // await this.check_files(this._files);
    const t2 = Date.now();

    await Promise.all([
      new Promise((resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
        this._vids = ['VR000000008', 'VR000000043', 'VR000000044'];
        resolve(true);
      }),
      new Promise((resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
        this._vidsObsPtm = ['VR000000044'];
        resolve(true);
      }),
      _package.files.readAsText(this._files.filterProps).then(
        (v) => this._filterProperties = JSON.parse(v)
      ),
      _package.files.readAsText(this._files.mutcodes).then(
        (v) => this._mutcodes = JSON.parse(v)
      ),
      _package.files.readAsText(this._files.ptm_map).then(
        (v) => this._ptmMap = JSON.parse(v)
      ),
      _package.files.readAsText(this._files.cdr_map).then(
        (v) => this._cdrMap = JSON.parse(v)
      ),
      _package.files.readBinaryDataFrames(this._files.ptm_in_cdr).then(
        (dfList) => this._refDf = dfList[0]
      ),
      _package.files.readAsText(this._files.realNums).then(
        (v) => this._realNums = JSON.parse(v)
      )]);
    const t3 = Date.now();

    console.debug(`DataLoaderFiles check_files ${((t2 - t1) / 1000).toString()} s`);
    console.debug(`DataLoaderFiles preload_data ${((t3 - t2) / 1000).toString()} s`);
  }

  async listAntigens(): Promise<DG.DataFrame> {
    return catchToLog<Promise<DG.DataFrame>>('MLB database access error: ', async () => {
      const df: DG.DataFrame = await grok.functions.call(`${this._pName}:listAntigens`);
      return df;
    });
  }

  async getMlbByAntigen(antigen: string): Promise<DG.DataFrame> {
    const df: DG.DataFrame = await grok.functions.call(`${this._pName}:getMlbByAntigen`, {antigen: antigen});
    return df;
  }

  async getTreeByAntigen(antigen: string): Promise<DG.DataFrame> {
    const df: DG.DataFrame = await grok.functions.call(`${this._pName}:getTreeByAntigen`, {antigen: antigen});
    return df;
  }

  async getAnarci(scheme: string, chain: string, antigen: string): Promise<DG.DataFrame> {
    // There is a problem with using underscore symbols in query names.
    const scheme2: string = scheme.charAt(0).toUpperCase() + scheme.slice(1);
    const chain2: string = chain.charAt(0).toUpperCase() + chain.slice(1);
    const df: DG.DataFrame = await grok.functions.call(
      `${this._pName}:getAnarci${scheme2}${chain2}`, {antigen: antigen});
    return df;
  }

  async loadHChainDf(): Promise<DG.DataFrame> {
    return DG.DataFrame.fromCsv(await _package.files.readAsText(this._files.h_out));
  }

  async loadLChainDf(): Promise<DG.DataFrame> {
    return DG.DataFrame.fromCsv(await _package.files.readAsText(this._files.l_out));
  }

  async loadMlbDf(): Promise<DG.DataFrame> {
    const df: DG.DataFrame = DG.DataFrame.fromCsv(await _package.files.readAsText(this._files.mlb));

    // 'ngl' column have been removed from query 2022-04
    df.columns.remove('ngl');

    // Convert 'antigen ncbi id' to string as it is a column with lists of ids
    // TODO: Convert column type does not work as expected
    /* Examples: text -> loaded -> converted
       "3592,51561,3593" -> 3592515613593 -> "3592515613593.00"
       "952" -> 952 -> "952.00"
       "3553,3590,335,4045,105805883,102116898,3543,27132,100423062,389812,10892,9080,5284,3904,8740"
         -> Infinity -> "Infinity"
     */
    // df.changeColumnType('antigen_ncbi_id', DG.COLUMN_TYPE.STRING);

    return df;
  }

  async loadTreeDf(): Promise<DG.DataFrame> {
    return DG.DataFrame.fromCsv(await _package.files.readAsText(this._files.tree));
  }

  private async loadFileJson(path: string): Promise<Object> {
    return _package.files.readAsText(path)
      .then((data: string) => JSON.parse(data));
  }

  async loadJson(vid: string): Promise<JsonType> {
    // Always return example data due TwinPViewer inability to work with null data
    // if (!this.vids.includes(vid))
    //   return null;

    return (await this.loadFileJson(this._files.example)) as JsonType;
  }

  /** Load PDB structure data
   * @param {string} vid Molecule id
   */
  async loadPdb(vid: string): Promise<string> {
    // Always return example data due TwinPViewer inability to work with null data
    // if (!this.vids.includes(vid))
    //   return null;

    // TODO: Check for only allowed vid of example
    return (await this.loadFileJson(this._files.examplePDB))['pdb'];
  }

  async loadRealNums(vid: string): Promise<NumsType> {
    return (await this.loadFileJson(this._files.realNums)) as NumsType;
  }

  async loadObsPtm(vid: string): Promise<ObsPtmType> {
    if (!this.vidsObsPtm.includes(vid))
      return null;

    return (await this.loadFileJson(this._files.exampleOptm))['ptm_observed'] as ObsPtmType;
  }
}
