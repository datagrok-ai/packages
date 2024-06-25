/// this file was generated automatically from grok_shared classes declarations
import { toDart } from "../wrappers";
let api = <any>window;

export class DataSourceType {
  static Access = 'Access';

  static Athena = 'Athena';

  static BigQuery = 'BigQuery';

  static Cassandra = 'Cassandra';

  static DB2 = 'DB2';

  static Excel = 'Excel';

  static Firebird = 'Firebird';

  static HBase = 'HBase';

  static Hive = 'Hive';

  static Hive2 = 'Hive2';

  static MariaDB = 'MariaDB';

  static MlFlow = 'MlFlow';

  static MongoDB = 'MongoDB';

  static MsSql = 'MS SQL';

  static MySql = 'MySQL';

  static Neo4j = 'Neo4j';

  static Odata = 'ODATA';

  static Odbc = 'ODBC';

  static Oracle = 'Oracle';

  static PostgresDart = 'PostgresDart';

  static Postgres = 'Postgres';

  static Redshift = 'Redshift';

  static SQLite = 'SQLite';

  static Socrata = 'Socrata';

  static Sparql = 'Sparql';

  static Teradata = 'Teradata';

  static Twitter = 'Twitter';

  static Vertica = 'Vertica';

  static Web = 'Web';

  static AzureBlob = 'Azure Blob';

  static Dropbox = 'Dropbox';

  static GitHub = 'GitHub';

  static Ftp = 'FTP';

  static GoogleCloud = 'GoogleCloud';

  static S3 = 'S3';

  static SharePoint = 'SharePoint';

  static Http = 'HTTP';

  static Files = 'Files';

  static Sftp = 'SFTP';

  static AWSSM = 'AWS';

  static CoreWeave = 'CoreWeave';

  static get fileDataSources(): Array<string> { return api.grok_DataSourceType_Get_fileDataSources(); };

  static get systemDataSources(): Array<string> { return api.grok_DataSourceType_Get_systemDataSources(); };

}
import {Entity} from '../entities'

export class DockerImage extends Entity {
  constructor(dart: any) { super(dart); };

  static fromJson(map: {[index: string]: any}): DockerImage { return new DockerImage(api.grok_DockerImage_fromJson(toDart(map)))};
  static STATUS_READY = 'ready';

  static STATUS_ERROR = 'error';

  static STATUS_BUILDING = 'building';

  static STATUS_PENDING_BUILD = 'pending build';

  static dbTableName = 'dockerfiles';

  get description(): string { return api.grok_DockerImage_Get_description(this.dart); };
  set description(x: string) {api.grok_DockerImage_Set_description(this.dart, toDart(x)); }
  get dockerfile(): string { return api.grok_DockerImage_Get_dockerfile(this.dart); };
  set dockerfile(x: string) {api.grok_DockerImage_Set_dockerfile(this.dart, toDart(x)); }
  get status(): string { return api.grok_DockerImage_Get_status(this.dart); };
  set status(x: string) {api.grok_DockerImage_Set_status(this.dart, toDart(x)); }
  get dockerName(): string { return api.grok_DockerImage_Get_dockerName(this.dart); };
  set dockerName(x: string) {api.grok_DockerImage_Set_dockerName(this.dart, toDart(x)); }
  get version(): string { return api.grok_DockerImage_Get_version(this.dart); };
  set version(x: string) {api.grok_DockerImage_Set_version(this.dart, toDart(x)); }
  get dockerfilePath(): string { return api.grok_DockerImage_Get_dockerfilePath(this.dart); };
  set dockerfilePath(x: string) {api.grok_DockerImage_Set_dockerfilePath(this.dart, toDart(x)); }
  get updatedBy(): string { return api.grok_DockerImage_Get_updatedBy(this.dart); };
  set updatedBy(x: string) {api.grok_DockerImage_Set_updatedBy(this.dart, toDart(x)); }
  get logs(): string { return api.grok_DockerImage_Get_logs(this.dart); };
  set logs(x: string) {api.grok_DockerImage_Set_logs(this.dart, toDart(x)); }
  get completed(): boolean { return api.grok_DockerImage_Get_completed(this.dart); };

  get iconStatus(): string { return api.grok_DockerImage_Get_iconStatus(this.dart); };

  get dockerFullName(): string { return api.grok_DockerImage_Get_dockerFullName(this.dart); };

}
