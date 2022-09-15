import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import Dexie from 'dexie';
import {keys} from 'ts-transformer-keys';


export interface ICached {

}

export interface IListVersion {
  list_id: number;
  name: string;
  version: string;
}

export interface IDbVersion extends IListVersion {

}

export interface IScheme extends ICached {
  scheme_id: number;
  scheme: string;
}

export interface ICdr extends ICached {
  cdr_id: string;
  cdr: string;
}

export interface IAntigen extends ICached {
  id: number;
  antigen: string;
  antigen_ncbi_id: string;
  antigen_gene_symbol: string;
}

export interface IVid extends ICached {
  v_id: string;
}

export interface IVidObsPtm extends ICached {
  v_id: string;
}

export interface IObject extends ICached {
  id?: number;
  key: string;
  value: any;
}

export class MlbDatabase extends Dexie {
  private readonly serverListVersionDf!: DG.DataFrame;

  get enabled(): boolean { return !!this.serverListVersionDf;}

  list_version!: Dexie.Table<IListVersion, number>;

  scheme!: Dexie.Table<IScheme, number>;
  cdr!: Dexie.Table<ICdr, number>;
  antigen!: Dexie.Table<IAntigen, number>;
  vid!: Dexie.Table<IVid, string>;
  vidObsPtm!: Dexie.Table<IVidObsPtm, string>;

  object!: Dexie.Table<IObject, number>;

  constructor(serverListVersionDf: DG.DataFrame) {
    super('MlbDatabase');
    this.serverListVersionDf = serverListVersionDf;
    if (this.enabled) {
      this.version(1).stores({
        list_version: 'list_id, name, version',
        scheme: 'scheme_id, scheme',
        cdr: 'cdr_id, cdr',
        antigen: 'id, antigen, antigen_ncbi_id, antigen_gene_symbol',
        vid: 'v_id',
        vidObsPtm: 'v_id',

        object: '++id, key, value',
      });
    }
  }

  async getObject<Type>(key: string, getServerObject: () => Promise<Type>): Promise<Type> {
    const dbVersion: IDbVersion = this.enabled ? this.getServerVersion(key) : null;

    // read version of cached list if cache is enabled
    const cacheVersion = this.enabled ? (await this.list_version.where({'name': key}).first())?.version : null;

    if (!this.enabled || cacheVersion != dbVersion.version) {
      const serverObj: Type = await getServerObject();

      if (this.enabled) {
        await this.object.put({key: key, value: serverObj});
        await this.list_version.put(dbVersion, dbVersion.list_id);
      }

      return serverObj;
    } else {
      const cacheObj: IObject = await this.object.where({key: key}).first();
      return cacheObj.value;
    }
  }

  // /** Get object from cache if exists with appropriate version.
  //  * @param {string} listName
  //  * @param {() => Promise<DG.DataFrame>} loadDf
  //  * @param {(db_row: DG.Row) => TCached} rowToCache
  //  * @param {obj: TCached[]) => TData} fromCache
  //  * @param {(df: DG.DataFrame) => TData} fromDf
  //  * @return {Promise<TData>}
  //  * */
  async getData<TCached extends ICached, TData>(
    listName: string,
    loadDf: () => Promise<DG.DataFrame>,
    rowToCache: (db_row: DG.Row) => TCached,
    fromCache: (obj: TCached[]) => TData,
    fromDf: (df: DG.DataFrame) => TData
  ): Promise<TData> {
    // const fields: string[] = keys<TCached>();
    const dbVersion: IDbVersion = this.enabled ? this.getServerVersion(listName) : null;

    // read version of cached list
    const cacheVersion = this.enabled ? (await this.list_version.where({'name': listName}).first())?.version : null;

    if (!this.enabled || cacheVersion !== dbVersion.version) {
      // Fill cache from database
      const dbDf: DG.DataFrame = await loadDf();

      if (this.enabled) {
        this[listName].clear();
        this[listName].bulkAdd([...Array(dbDf.rowCount).keys()]
          .map((rowI) => dbDf.row(rowI))
          .map(rowToCache));

        this.list_version.put(dbVersion, dbVersion.list_id);
      }

      return fromDf(dbDf);
    } else {
      const resList: TCached[] = await this[listName].toArray();
      return fromCache(resList);
    }
  }

  getServerVersion(name: string): IDbVersion {
    const df: DG.DataFrame = this.serverListVersionDf.rows.match({name: name}).toDataFrame();
    if (df.rowCount == 0)
      throw new Error(`Name '${name}' not found in server side versions.`);
    return Object.assign({},
      ...(['list_id', 'name', 'version'].map((fn) => ({[fn]: df.get(fn, 0)}))));
  }
}
