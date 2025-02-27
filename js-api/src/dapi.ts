import { DataFrame } from "./dataframe";
import {
  Credentials,
  DataConnection,
  DataJob,
  DataQuery,
  DockerContainer,
  Entity,
  Group,
  Model,
  Notebook,
  Project,
  Script,
  ScriptEnvironment,
  TableInfo,
  User,
  LogEvent,
  LogEventType,
  Package,
  UserSession,
  Property,
  FileInfo, HistoryEntry, ProjectOpenOptions, Func, UserReport, UserReportsRule
} from "./entities";
import { DockerImage } from "./api/grok_shared.api.g";
import {ViewLayout, ViewInfo} from "./views/view";
import {toJs, toDart} from "./wrappers";
import {_propsToDart} from "./utils";
import {FuncCall} from "./functions";
import {IDartApi} from "./api/grok_api.g";
import { StickyMeta } from "./sticky_meta";
import {CsvImportOptions} from "./const";

const api: IDartApi = <any>window;

export class ComponentBuildInfo {
  branch: string = '';
  commit: string = '';
  date: string = '';
  version: string = '';
}

/**
 * Exposes Datagrok's server-side functionality.
 *
 * See examples: {@link https://public.datagrok.ai/js/samples/dapi/projects-list}
 * */
export class Dapi {
  constructor() {
  }

  /** HTTP root for DAPI */
  get root(): string {
    return api.grok_Dapi_Root();
  }

  /** Retrieves entities from server by list of IDs
   *  @returns {Promise<Entity[]>} */
  getEntities(ids: string[]): Promise<Entity[]> {
    return api.grok_Dapi_Entities_GetEntities(ids);
  }

  /** Entities API endpoint
   *  @type {EntitiesDataSource} */
  get entities(): EntitiesDataSource {
    return new EntitiesDataSource(api.grok_Dapi_Entities());
  }

  /** Data Queries API endpoint
   *  @type {HttpDataSource<DataQuery>} */
  get queries(): HttpDataSource<DataQuery> {
    return new HttpDataSource(api.grok_Dapi_Queries(), 'Function');
  }

  get functions(): FuncsDataSource {
    return new FuncsDataSource(api.grok_Dapi_Functions());
  }

  /** Data Connections API endpoint
   *  @type {HttpDataSource<DataConnection>} */
  get connections(): DataConnectionsDataSource {
    return new DataConnectionsDataSource(api.grok_Dapi_Connections());
  }

  /** Credentials API endpoint
   *  @type {CredentialsDataSource} */
  get credentials(): CredentialsDataSource {
    return new CredentialsDataSource(api.grok_Dapi_Credentials());
  }

  /** Data Jobs API endpoint
   *  @type {HttpDataSource<DataJob>} */
  get jobs(): HttpDataSource<DataJob> {
    return new HttpDataSource(api.grok_Dapi_Jobs(), 'Function');
  }

  /** Jupyter Notebooks API endpoint
   *  @type {HttpDataSource<Notebook>} */
  get notebooks(): HttpDataSource<Notebook> {
    return new HttpDataSource(api.grok_Dapi_Notebooks());
  }

  /** Predictive Models API endpoint
   *  @type {HttpDataSource<Model>} */
  get models(): HttpDataSource<Model> {
    return new HttpDataSource(api.grok_Dapi_Models());
  }

  /** Packages API endpoint
   *  @type {HttpDataSource<Package>} */
  get packages(): HttpDataSource<Package> {
    return new HttpDataSource(api.grok_Dapi_Packages());
  }

  /** View Layouts API endpoint
   *  @type {LayoutsDataSource} */
  get layouts(): LayoutsDataSource {
    return new LayoutsDataSource(api.grok_Dapi_Layouts());
  }

  /** View Views API endpoint
   *  @type {LayoutsDataSource} */
  get views(): ViewsDataSource {
    return new ViewsDataSource(api.grok_Dapi_Views());
  }

  /** Data Table Infos API endpoint
   *  @type {TablesDataSource} */
  get tables(): TablesDataSource {
    return new TablesDataSource(api.grok_Dapi_Tables());
  }

  /** Users API endpoint
   *  @type {UsersDataSource} */
  get users(): UsersDataSource {
    return new UsersDataSource(api.grok_Dapi_Users());
  }

  /** Groups API endpoint
   *  @type {GroupsDataSource} */
  get groups(): GroupsDataSource {
    return new GroupsDataSource(api.grok_Dapi_Groups(), 'Group');
  }

  /** Permissions API endpoint
   * @type {PermissionsDataSource} */
  get permissions(): PermissionsDataSource {
    return new PermissionsDataSource();
  }

  /** Scripts API endpoint
   *  @type {HttpDataSource<Script>} */
  get scripts(): HttpDataSource<Script> {
    return new HttpDataSource(api.grok_Dapi_Scripts(), 'Function');
  }

  /** Projects API endpoint
   *  @type {HttpDataSource<Project>} */
  get projects(): ProjectsDataSource {
    return new ProjectsDataSource(api.grok_Dapi_Projects(), 'Project');
  }

  /** Environments API endpoint
   *  @type {HttpDataSource<ScriptEnvironment>} */
  get environments(): HttpDataSource<ScriptEnvironment> {
    return new HttpDataSource(api.grok_Dapi_Environments());
  }

  get docker(): DockerDataSource {
    return new DockerDataSource();
  }

  /**
   * @deprecated The UserDataStorage should not be used. Use {@link UserSettingsStorage} instead
   */
  get userDataStorage(): UserDataStorage {
    return new UserDataStorage();
  }


  /** Users Files management API endpoint
   *  @type {FileSource} */
  get files(): FileSource {
    return new FileSource();
  }

  get reports(): UserReportsDataSource {
    return new UserReportsDataSource(api.grok_Dapi_User_Reports());
  }

  get rules(): HttpDataSource<UserReportsRule> {
    return new UserReportsRulesDataSource(api.grok_Dapi_User_Reports_Rules());
  }

  /** Proxies URL request via Datagrok server with same interface as "fetch".
   * @deprecated
   * @param {string} method
   * @param {string} url
   * @param {Object} headers
   * @param {Object} body
   * @returns `{Promise<Object>}` */
  async proxyFetch(method: string, url: string, headers: Record<string, string>, body: object = {}): Promise<object> {
    headers['Accept'] = 'application/json';
    headers['original-url'] = `${url}`;
    headers['original-method'] = method;
    let params = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    };
    return await fetch('/api/connectors/proxy', params);
  }

  /** Proxies URL request via Datagrok server with same interface as "fetch".
   * @param {String} url
   * @param {Object} params
   * @param {number} maxAge - forces server to send Cache-Control in response with configured max-age directive
   * @returns `{Promise<Object>}` */
  async fetchProxy(url: string, params?: RequestInit, maxAge?: number): Promise<Response> {
    params ??= {};
    params.headers ??= {};
    params.method ??= 'GET';
    // @ts-ignore
    params.headers['original-url'] = `${url}`;
    // @ts-ignore
    params.headers['original-method'] = params.method;
    let proxyUrl = `${this.root}/connectors/proxy`;
    if (params.method == 'GET' || params.method == 'HEAD') {
      if (maxAge) {
        // @ts-ignore
        params.headers['dg-cache-control'] = `max-age=${maxAge}`;
        params.cache = 'default';
      }
      proxyUrl = `${proxyUrl}?url=${encodeURI(url)}`;
    }
    if (params.method !== 'GET')
      params.method = 'POST';
    return fetch(proxyUrl, params);
  }

  /** Administering API endpoint
   *  @type {AdminDataSource} */
  get admin(): AdminDataSource {
    return new AdminDataSource(api.grok_Dapi_Admin());
  }

  /** Logging API endpoint
   *  @type {HttpDataSource<LogEvent>} */
  get log(): HttpDataSource<LogEvent> {
    return new HttpDataSource(api.grok_Dapi_Log());
  }

  /** Logging API endpoint
   *  @type {HttpDataSource<LogEventType>} */
  get logTypes(): HttpDataSource<LogEventType> {
    return new HttpDataSource(api.grok_Dapi_LogTypes());
  }

  stickyMeta = new StickyMeta();
}


/**
 * Common functionality for handling collections of entities stored on the server.
 * Works with Datagrok REST API, allows to get filtered and paginated lists of entities,
 * Can be extended with specific methods. (i.e. {@link UsersDataSource})
 */
export class HttpDataSource<T> {
  dart: any;
  clsName: string;

  /** @constructs HttpDataSource */
  constructor(s: any, clsName?: string | null) {
    this.dart = s;
    this.clsName = clsName ?? '';
  }

  /** Returns all entities that satisfy the filtering criteria (see {@link filter}).
   *  See examples: {@link https://public.datagrok.ai/js/samples/dapi/projects-list}
   *  Smart filter: {@link https://datagrok.ai/help/datagrok/smart-search} */
  list(options: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {}): Promise<T[]> {
    if (options.pageSize !== undefined)
      this.by(options.pageSize);
    if (options.pageNumber !== undefined)
      this.page(options.pageNumber);
    if (options.filter !== undefined)
      this.filter(options.filter);
    if (options.order !== undefined)
      this.order(options.order);
    return api.grok_DataSource_List(this.dart);
  }

  /** Counts entities that satisfy the filtering criteria (see {@link filter}).
   *  See examples: {@link https://public.datagrok.ai/js/samples/dapi/projects-list}
   *  Smart filter: {@link https://datagrok.ai/help/datagrok/smart-search} */
  count(): Promise<number> {
    return api.grok_DataSource_Count(this.dart);
  }

  /** Returns fist entity that satisfies the filtering criteria (see {@link filter}).
   *  @returns `Promise<object>`  */
  first(): Promise<T> {
    return api.grok_DataSource_First(this.dart);
  }

  /** Returns an entity with the specified id.
   *  Throws an exception if an entity does not exist, or is not accessible in the current context.
   *  Sample: {@link https://public.datagrok.ai/js/samples/data-access/save-and-load-df}
   *  @param {string} id - GUID of the corresponding object
   *  @returns `{Promise<object>}` - entity. */
  find(id: string): Promise<T> {
    return api.grok_DataSource_Find(this.dart, id);
  }

  /** Saves an entity. */
  save(e: Entity): Promise<T> {
    return api.grok_DataSource_Save(this.dart, e.dart);
  }

  /** Deletes an entity. */
  delete(e: Entity): Promise<void> {
    return api.grok_DataSource_Delete(this.dart, e.dart);
  }

  /** Turns off package versions isolation. This DataSource will return all entities in all versions, not only the current one **/
  allPackageVersions(): HttpDataSource<T> {
    this.dart = api.grok_DataSource_AllPackageVersions(this.dart);
    return this;
  }

  by(i: number): HttpDataSource<T> {
    this.dart = api.grok_DataSource_By(this.dart, i);
    return this;
  }

  /** Restricts results to the specified page number. See also {@link nextPage}. */
  page(i: number): HttpDataSource<T> {
    this.dart = api.grok_DataSource_Page(this.dart, i);
    return this;
  }

  /** Returns next page of all entities that satisfy the filtering criteria (see {@link filter}).
   *  Works only if pageSize was set during previous list() call
   *  See examples: {@link https://public.datagrok.ai/js/samples/dapi/projects-list}
   *  @returns {HttpDataSource} */
  nextPage(): HttpDataSource<T> {
    this.dart = api.grok_DataSource_NextPage(this.dart);
    return this;
  }

  /** Applies filter to current request.
   *  Also can be set with {@link list} method "options" parameter
   *  See example: {@link https://public.datagrok.ai/js/samples/dapi/projects-list}
   *  Smart filter: {@link https://datagrok.ai/help/datagrok/smart-search}
   *  @param {string} w
   *  @returns {HttpDataSource} */
  filter(w: string): HttpDataSource<T> {
    this.dart = api.grok_DataSource_WhereSmart(this.dart, w);
    return this;
  }

  /** Instructs data source to return results in the specified order.
   * @param {string} fieldName
   * @param {boolean} desc
   * @returns {HttpDataSource} */
  order(fieldName: string, desc: boolean = false): HttpDataSource<T> {
    this.dart = api.grok_DataSource_Order(this.dart, fieldName, desc);
    return this;
  }

  /** Includes entity in the result
   * @param {string} include
   * @returns {HttpDataSource} */
  include(include: string): HttpDataSource<T> {
    this.dart = api.grok_DataSource_Include(this.dart, _propsToDart(include, this.clsName));
    return this;
  }
}


/**
 * Functionality for handling Users collection from server and working with Users remote endpoint
 * Allows to load current user and list of all Datagrok users with filtering and pagination
 * See example: {@link https://public.datagrok.ai/js/samples/dapi/who-am-i}
 * @extends HttpDataSource
 * */
export class UsersDataSource extends HttpDataSource<User> {
  /** @constructs UsersDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Returns current user
   * @returns {Promise<User>} */
  current(): Promise<User> {
    return toJs(api.grok_UsersDataSource_Current(this.dart));
    //return new Promise((resolve, reject) => api.grok_UsersDataSource_Current(this.dart, (q: any) => resolve(s(q)), (e: any) => reject(e)));
  }

  /** Returns current session
   * @returns {Promise<UserSession>} */
  currentSession(): Promise<UserSession> {
    return api.grok_UsersDataSource_CurrentSession(this.dart);
  }
}

export class AdminDataSource {
  dart: any;
  /** @constructs AdminDataSource*/
  constructor(dart: any) {
    this.dart = dart;
  }

  /** Returns information about the services.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/admin}
   *  @returns {Promise<Map>} */
  getServiceInfos(): Promise<ServiceInfo[]> {
    return api.grok_Dapi_Admin_GetServiceInfos(this.dart);
  }

  /**
   * Sends email
   * @param email - message that will be sent using configured SMTP service
   */
  sendEmail(email: Email): Promise<void> {
    if (email.to.length === 0)
      throw new Error('Recipients list shouldn\'t be empty');
    return api.grok_Dapi_Admin_Send_Email(this.dart, toDart(email));
  }
}

/**
 * Represents message that can be sent over the network using the configured SMTP service
 */
export interface Email {
  /**
   * Message subject
   */
  subject: string,
  /**
   * List of recipients
   */
  to: string [],
  /**
   * Use to specify plaintext body
   */
  text?: string,
  /**
   * Use to specify HTML body
   */
  html?: string,
  /**
   * Use to send copies of an email to additional recipients
   */
  bcc?: string [],
}

export interface ServiceInfo {
  name: string,
  description: string,
  enabled: boolean,
  key: string,
  time: string,
  status: 'Running' | 'Failed' | 'Stopped',
  type: 'Service' | 'Plugin',
}

/**
 * Functionality for handling groups collection from server
 * Allows to manage {@link Group}
 * @extends HttpDataSource
 * */
export class GroupsDataSource extends HttpDataSource<Group> {
  /** @constructs CredentialsDataSource*/
  constructor(s: any, clsName: string) {
    super(s, clsName);
    this.include('members');
    this.include('memberships');
  }

  /** Creates a new group
   *  @param {String}  name
   *  @returns {Promise<Group>} - Group. */
  createNew(name: string): Promise<Group> {
    let g = new Group(api.grok_Group(name));
    return this.save(g);
  }

  /** Returns group user
   *  @param {Group} group
   *  @returns {Promise<Group>} - Group. */
  getUser(group: Group): Promise<Group> {
    return api.grok_Dapi_Get_GroupUser(group.dart);
  }

  /** Adds a member to the group
   * @param {Group} g
   * @param {Group} m
   * @returns {Promise} */
  async addMember(g: Group, m: Group): Promise<void> {
    g = await this.find(g.id);
    g.addMember(m);
    await this.saveRelations(g);
  }

  /** Adds an admin member to the group
   * @param {Group} g
   * @param {Group} m
   * @returns {Promise} */
  async addAdminMember(g: Group, m: Group): Promise<void> {
    g = await this.find(g.id);
    g.addAdminMember(m);
    await this.saveRelations(g);
  }

  /** Removes a member from the group
   * @param {Group} g
   * @param {Group} m
   * @returns {Promise} */
  async removeMember(g: Group, m: Group): Promise<void> {
    g = await this.find(g.id);
    g.removeMember(m);
    await this.saveRelations(g);
  }

  /** Adds the group to another one
   * @param {Group} g
   * @param {Group} parent
   * @returns {Promise} */
  async includeTo(g: Group, parent: Group): Promise<void> {
    g = await this.find(g.id);
    g.includeTo(parent);
    await this.saveRelations(g);
  }


  /** Adds the group to another one as admin
   * @param {Group} g
   * @param {Group} parent
   * @returns {Promise} */
  async includeAdminTo(g: Group, parent: Group): Promise<void> {
    g = await this.find(g.id);
    g.includeAdminTo(parent);
    await this.saveRelations(g);
  }

  /** Removes a membership from the group
   * @param {Group} g
   * @param {Group} parent
   * @returns {Promise} */
  async excludeFrom(g: Group, parent: Group): Promise<void> {
    g = await this.find(g.id);
    g.excludeFrom(parent);
    await this.saveRelations(g);
  }

  /** Saves a group with relations
   *  @param {Group} e
   *  @returns {Promise<Group>} - Group. */
  saveRelations(e: Group): Promise<Group> {
    return api.grok_GroupsDataSource_Save(this.dart, e.dart);
  }

  /** Looking for groups with similar name */
  async getGroupsLookup(name: string): Promise<Group[]> {
    return toJs(await api.grok_Dapi_Get_GroupsLookup(name));
  }
}


/**
 * Functionality for handling entities collection from server
 * Allows to manage {@link Entity}
 * @extends HttpDataSource
 * */
export class EntitiesDataSource extends HttpDataSource<Entity> {
  /** @constructs CredentialsDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Allows to set properties for entities
   * @param {Map[]} props
   * @returns {Promise} */
  saveProperties(props: Map<Property, any>): Promise<void> {
    return api.grok_EntitiesDataSource_SaveProperties(this.dart, props);
  }

  /** Returns entity properties
   * @param {Entity} entity
   * @returns {Promise<Map>} props */
  getProperties(entity: Entity): Promise<Map<Property, any>> {
    return api.grok_EntitiesDataSource_GetProperties(this.dart, entity.dart);
  }

  /** Deletes entity properties
   * @param {Map[]} props
   * @returns {Promise} */
  deleteProperties(props: Map<Property, any>): Promise<void> {
    return api.grok_EntitiesDataSource_DeleteProperties(this.dart, props);
  }
}

/**
 * Functionality for handling connections collection from server and working with credentials remote endpoint
 * Allows to manage {@link DataConnection}
 * See also: {@link https://datagrok.ai/help/govern/security}
 * @extends HttpDataSource
 * */
export class DataConnectionsDataSource extends HttpDataSource<DataConnection> {
  /** @constructs DataConnectionsDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Saves the Connections */
  async save(e: DataConnection, options?: {saveCredentials?: boolean}): Promise<DataConnection> {
    options ??= {};
    options.saveCredentials ??= true;
    return toJs(await api.grok_DataConnectionsDataSource_Save(this.dart, e.dart, options!.saveCredentials));
  }

  /** Creates connection to the subdirectory of connection */
  async shareFolder(e: DataConnection, path: string): Promise<DataConnection> {
    return toJs(await api.grok_DataConnectionsDataSource_SubDir(this.dart, e.dart, path));
  }

  async getSchemas(e: DataConnection): Promise<string[]> {
    return toJs(await api.grok_DataConnectionsDataSource_Get_Schemas(this.dart, e.dart));
  }

  async getSchema(e: DataConnection, schemaName: string | null = null): Promise<TableInfo[]> {
    return toJs(await api.grok_DataConnectionsDataSource_Get_Schema(this.dart, e.dart, schemaName ?? null));
  }

  async getUniqueColumnsNames(c: DataConnection, schema: string, table: string): Promise<string[]> {
    return toJs(await api.grok_DataConnectionsDataSource_Get_Unique_Columns(this.dart, c.dart, schema, table));
  }
}

/**
 * Functionality for handling functions collection from server
 * Allows managing {@link Func}
 * @extends HttpDataSource
 * */
export class FuncsDataSource extends HttpDataSource<Func> {
  /** @constructs DataConnectionsDataSource*/
  constructor(s: any) {
    super(s);
  }

  public get calls() {
    return new HttpDataSource<FuncCall>(api.grok_Dapi_Function_Calls());
  }

}

/**
 * Functionality for handling credentials collection from server and working with credentials remote endpoint
 * Allows to manage {@link Credentials}
 * See also: {@link https://datagrok.ai/help/govern/security}
 * @extends HttpDataSource
 * */
export class CredentialsDataSource extends HttpDataSource<Credentials> {
  /** @constructs CredentialsDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Returns credentials for entity
   * @param {Entity} e
   * @returns {Promise<Credentials>} */
  forEntity(e: Entity): Promise<Credentials> {
    return api.grok_CredentialsDataSource_ForEntity(this.dart, e.dart);
  }

  /** Saves a credentials.
   * Note, that in order to work correct, credentials should be connected
   * to other entity that owns them. So the best way to modify Credentials is load by {@link forEntity}, change
   * {@link Credentials.parameters} and after that call this method.
   */
  save(c: Credentials): Promise<Credentials> {
    return api.grok_CredentialsDataSource_Save(this.dart, c.dart);
  }
}

/**
 * Functionality for handling layouts collection from server
 * Allows to manage {@link ViewLayout}
 * @extends HttpDataSource
 * */
export class LayoutsDataSource extends HttpDataSource<ViewLayout> {
  /** @constructs LayoutsDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Returns layouts that applicable to the table
   * @param {DataFrame} t
   * @returns {Promise<ViewLayout[]>} */
  getApplicable(t: DataFrame): Promise<ViewLayout[]> {
    return api.grok_LayoutsDataSource_Applicable(this.dart, t.dart);
  }
}

/**
 * Functionality for handling views information from server
 * Allows to manage {@link ViewInfo}
 * @extends HttpDataSource
 * */
export class ViewsDataSource extends HttpDataSource<ViewInfo> {
  /** @constructs ViewInfoDataSource*/
  constructor(s: any) {
    super(s);
  }
}

export class PermissionsDataSource {
  constructor() {
  };

  /** Gets all the permissions granted on entity
   * @param {Entity} e
   * @returns {Promise<Map>} permissions
   * */
  // { [key:string]:number; }
  async get(e: Entity): Promise<Map<string, Group[]>> {
    let data = await api.grok_Dapi_Get_Permissions(e.dart);
    data.view = toJs(data.view);
    data.edit = toJs(data.edit);
    return data;
  }

  /** Checks if current user has permission {permission} for entity {e}
   * @param {Entity} e Entity to check permission for
   * @param {'Edit' | 'View' | 'Share' | 'Delete'} permission Permission type
   * @returns {boolean} Result */
  check(e: Entity, permission: 'Edit' | 'View' | 'Share' | 'Delete'): Promise<boolean> {
    return api.grok_Dapi_Check_Permissions(e.dart, permission);
  }

  /** Grants permission on entity to the group
   * @param {Entity} e
   * @param {Group} g
   * @param {boolean} edit allow to edit entity
   * @returns {Promise}
   * */
  grant(e: Entity, g: Group, edit: boolean): Promise<any> {
    return api.grok_Dapi_Set_Permission(e.dart, g.dart, edit);
  }

  /** Revokes permission on entity from the group
   * @param {Entity} e
   * @param {Group} g
   * @returns {Promise}
   * */
  revoke(g: Group, e: Entity): Promise<any> {
    return api.grok_Dapi_Delete_Permission(e.dart, g.dart);
  }
}

/**
 * @deprecated The UserDataStorage should not be used. Use {@link UserSettingsStorage} instead
 * Functionality for working with remote Users Data Storage
 * Remote storage allows to save key-value pairs on the Datagrok server for further use
 * */
export class UserDataStorage {
  constructor() {
  }

  /** Saves a single value to Users Data Storage
   * @param {string} name Storage name
   * @param {string} key
   * @param {string} value
   * @param {boolean} currentUser Value should be available only for current user. If false, shared storage is used.
   * @returns {Promise}*/
  postValue(name: string, key: string, value: string, currentUser: boolean = true): Promise<void> {
    return api.grok_Dapi_UserDataStorage_PostValue(name, key, value, currentUser);
  }

  /** Saves a map to Users Data Storage, will be appended to existing data
   * @param {string} name Storage name
   * @param {Map} data
   * @param {boolean} currentUser Value should be available only for current user. If false, shared storage is used.
   * @returns {Promise}*/
  post(name: string, data: any, currentUser: boolean = true): Promise<void> {
    return api.grok_Dapi_UserDataStorage_Post(name, data, currentUser);
  }

  /** Saves a map to Users Data Storage, will replace existing data
   * @param {string} name Storage name
   * @param {Map} data
   * @param {boolean} currentUser Value should be available only for current user. If false, shared storage is used.
   * @returns {Promise}*/
  put(name: string, data: any, currentUser: boolean = true): Promise<void> {
    return api.grok_Dapi_UserDataStorage_Put(name, data, currentUser);
  }

  /** Retrieves a map from Users Data Storage
   * @param {string} name - Storage name
   * @param {boolean} currentUser - get a value from a current user storage. If false, shared storage is used.
   * @returns {Promise<Map>} */
  get(name: string, currentUser: boolean = true): Promise<any> {
    return api.grok_Dapi_UserDataStorage_Get(name, currentUser);
  }

  /** Retrieves a single value from Users Data Storage
   * @param {string} name Storage name
   * @param {string} key Value key
   * @param {boolean} currentUser get a value from a current user storage. If false, shared storage is used.
   * @returns {Promise<string>} */
  getValue(name: string, key: string, currentUser: boolean = true): Promise<string> {
    return api.grok_Dapi_UserDataStorage_GetValue(name, key, currentUser);
  }

  /** Removes a single value from Users Data Storage
   * @param {string} name Storage name
   * @param {string} key Value key
   * @param {boolean} currentUser get a value from a current user storage. If false, shared storage is used.
   * @returns {Promise} */
  remove(name: string, key: string, currentUser: boolean = true): Promise<void> {
    return api.grok_Dapi_UserDataStorage_Delete(name, key, currentUser);
  }
}


/**
 * Functionality for working with remote projects
 * @extends HttpDataSource
 * */
export class ProjectsDataSource extends HttpDataSource<Project> {
  /** @constructs TablesDataSource*/
  constructor(s: any, clsName: string) {
    super(s, clsName);
    this.include('children');
  }

  /** Gets recent projects datasource
   * @returns {HttpDataSource<Project>} */
  get recent(): HttpDataSource<Project> {
     return new HttpDataSource<Project>(api.grok_Dapi_RecentProjects());
  }

  /** Opens the specified project. */
  open(name: string, options?: ProjectOpenOptions): Promise<Project> {
    return this
      .filter(name)
      .first()
      .then(p => {
        if (p)
          return p.open(options);
        return Promise.reject(`Project ${name} not found`);
      });
  }

  /** Saves the Project */
  save(e: Entity, options?: {saveRelations?: boolean}): Promise<Project> {
    options ??= {};
    options.saveRelations ??= true;
    return toJs(api.grok_ProjectsDataSource_Save(this.dart, e.dart, options!.saveRelations));
  }

}

/**
 * Functionality for working with remote tables
 * @extends HttpDataSource
 * */
export class TablesDataSource extends HttpDataSource<TableInfo> {
  /** @constructs TablesDataSource*/
  constructor(s: any) {
    super(s);
  }

  /** Saves a dataframe remotely.
   * Sample: {@link https://public.datagrok.ai/js/samples/data-access/save-and-load-df}
   * @param {DataFrame} dataFrame
   * @returns {Promise<string>} */
  uploadDataFrame(dataFrame: DataFrame): Promise<string> {
    return api.grok_Dapi_TablesDataSource_UploadDataFrame(this.dart, dataFrame.dart);
  }

  /** Loads a dataframe by id.
   * Sample: {@link https://public.datagrok.ai/js/samples/data-access/save-and-load-df}
   * @param {string} id - dataframe id
   * @returns {Promise<DataFrame>} */
  getTable(id: string): Promise<DataFrame> {
    return api.grok_Dapi_TablesDataSource_GetTable(this.dart, id);
  }
}

export class DockerDataSource {
  /**DockerImages API endpoint
   * @type {HttpDataSource<DockerImage>} */
  get dockerImages(): DockerImagesDataSource {
    return new DockerImagesDataSource(api.grok_Dapi_DockerImages());
  }

  /**Dockerfiles API endpoint
   * @type {HttpDataSource<DockerImage>} */
  get dockerContainers(): DockerContainersDataSource {
    return new DockerContainersDataSource(api.grok_Dapi_DockerContainers());
  }

  getServiceLogs(serviceName: string, limit: number): Promise<string> {
    return api.grok_Dapi_DockersDataSource_GetServiceLogs(serviceName, limit);
  }

  getAvailableServices(): Promise<string[]> {
    return api.grok_Dapi_DockersDataSource_GetAvailableServices();
  }
}

/** Functionality to work with Docker images. See also {@link DockerContainersDataSource}.
 * @extends HttpDataSource */
export class DockerImagesDataSource extends HttpDataSource<DockerImage> {

  constructor(s: any) {
    super(s);
  }

  /**
   * Rebuilds Docker image.
   * @param imageId - ID of the {@link DockerImage} to rebuild.
   * @returns {Promise<void>} - promise that resolves with void or throws Exception if something went wrong.
   */
  rebuild(imageId: string): Promise<void> {
    return api.grok_Dapi_DockerImagesDataSource_Rebuild(this.dart, imageId);
  }
}

/** Functionality to work with Docker containers.
 * See help: {@link https://datagrok.ai/help/develop/how-to/docker_containers}.
 * @extends HttpDataSource */
export class DockerContainersDataSource extends HttpDataSource<DockerContainer> {
  constructor(s: any) {
    super(s);
  }

  /**
   * Runs container.
   * @param containerId - ID of the {@link DockerContainer} to be run.
   * @param awaitStart - if [true] promise will not be resolved until the container is started,
   * otherwise, it doesn't wait for start and resolves immediately after the container is queued for start.
   * @returns {Promise<void>} - promise that resolves with void or throws Exception if something went wrong.
   */
  run(containerId: string, awaitStart: boolean = false): Promise<void> {
    return api.grok_Dapi_DockerContainersDataSource_Run(this.dart, containerId, awaitStart);
  }

  /**
   * Stops container.
   * @param containerId - ID of the {@link DockerContainer} to be stopped.
   * @param awaitStop - if [true] promise will not be resolved until the container is stopped,
   * otherwise, it doesn't wait for a stop and resolves immediately after the container is queued for a stop.
   * @returns {Promise<void>} or throws Exception if something went wrong.
   */
  stop(containerId: string, awaitStop: boolean = false): Promise<void> {
    return api.grok_Dapi_DockerContainersDataSource_Stop(this.dart, containerId, awaitStop);
  }

  /**
   * Proxies URL requests to docker containers via Datagrok server with the same interface as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). Returns response
   * from the containers as it is. If an error occurs on the server side returns a response with "application/json"
   * Content-Type and JSON body with field "datagrok-error" that describes the cause. If container status is incorrect
   * for performing requests returns a response with a 400 status code. If something goes wrong in the server workflow,
   * it returns a response with a 500 status code. Any other cases are the result of direct requests to the container itself.
   * @param containerId - ID of the {@link DockerContainer} to which the http request should be sent.
   * @param path - URI without scheme and authority component.
   * @param params - parameters of the request.
   * @returns {Promise<Response>} - promise that resolves with [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response).
   */
  async fetchProxy(containerId: string, path: string, params?: RequestInit): Promise<Response> {
    params ??= {};
    params.method ??= 'GET';
    params.credentials = 'include';
    if (!path.startsWith('/')) path = `/${path}`;
    return fetch(`${api.grok_Dapi_Root()}/docker/containers/proxy/${containerId}${path}`, params);
  }

  /**
   * @deprecated The method will be removed soon. Use {@link fetchProxy}.
   */
  request(id: string, path: string, params: ResponseInit): Promise<string | null> {
    return api.grok_Dapi_DockerContainersDataSource_ProxyRequest(this.dart, id, path, params);
  }

  /**
   * Returns container's logs or throws Exception with the cause.
   * @param containerId - ID of the {@link DockerContainer} whose logs is to be obtained.
   * @param limit - maximum line count of logs.
   * @returns string - container logs or null if there are no logs.
   */
  getContainerLogs(containerId: string, limit: number = 10000): Promise<string | null> {
    return api.grok_Dapi_DockerContainersDataSource_GetContainerLogs(this.dart, containerId, limit);
  }
}

export class UserReportsDataSource extends HttpDataSource<UserReport> {
  constructor(s: any) {
    super(s);
  }


  getReports(num?: number): Promise<DataFrame> {
    return api.grok_Reports_Get(num);
  }
}

export class UserReportsRulesDataSource extends HttpDataSource<UserReportsRule> {
  constructor(s: any) {
    super(s);
  }
}

export class FileSource {
  private readonly root: string;
  constructor(root: string = '') {
    this.root = root;
  };

  /** Checks if a file exists.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @returns {Promise<Boolean>} */
  exists(file: FileInfo | string): Promise<boolean> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_Exists(file);
  }

  private setRoot(file: FileInfo | string): string {
    if (typeof (file) == 'string') {
      file = `${this.root}${this.root != '' ? '/' : ''}${file}`;
      return <string>file;
    } else {
      return file.fullPath;
    }
  }

  /** Deletes a file.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @returns {Promise} */
  delete(file: FileInfo | string): Promise<void> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_Delete(file);
  }

  /** Moves a file.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo[] | string[]} files
   * @param {string} newPath
   * @returns {Promise} */
  move(files: FileInfo[] | string[], newPath: string): Promise<void> {
    for (let i = 0; i < files.length; i++)
      files[i] = this.setRoot(files[i]);
    newPath = this.setRoot(newPath);

    return api.grok_Dapi_UserFiles_Move(files, newPath);
  }

  /** Renames a file.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param { FileInfo | string} file
   * @param {string} newName
   * @returns {Promise} */
  rename(file: FileInfo | string, newName: string): Promise<void> {
    file = this.setRoot(file);
    newName = this.setRoot(newName);

    return api.grok_Dapi_UserFiles_Rename(file, newName);
  }

  /** Lists files according to a search pattern.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file - folder
   * @param {boolean} recursive - whether to search in folders recursively
   * @param {string} searchPattern - search pattern, such as part of a filename or extension, e.g., "filename-prefix" and "csv"
   * @returns {Promise<FileInfo[]>} */
  async list(file: FileInfo | string, recursive: boolean = false, searchPattern: string | null = null): Promise<FileInfo[]> {
    file = this.setRoot(file);
    return toJs(await api.grok_Dapi_UserFiles_List(file, recursive, searchPattern, this.root));
  }

  /** Reads a file as string.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @returns {Promise<String>} */
  readAsText(file: FileInfo | string): Promise<string> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_ReadAsText(file);
  }

  /** Reads CSV as DataFrame.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @param {CsvImportOptions} options
   * @returns {Promise<DataFrame>} */
  async readCsv(file: FileInfo | string, options?: CsvImportOptions): Promise<DataFrame> {
    return DataFrame.fromCsv(await this.readAsText(file), options);
  }

  /** Reads a file as bytes.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @returns {Promise<Uint8Array>} */
  readAsBytes(file: FileInfo | string): Promise<Uint8Array> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_ReadAsBytes(file);
  }

  /** Reads a d42 file as a list of dataframes.
   * @param {FileInfo | string} file
   * @returns {Promise<DataFrame[]>} */
  async readBinaryDataFrames(file: FileInfo | string): Promise<DataFrame[]> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_ReadBinaryDataFrames(file);
  }

  /** Writes a list of dataframes as a d42 file.
   * @param {FileInfo | string} file
   * @param {DataFrame[]} dataFrames */
  async writeBinaryDataFrames(file: FileInfo | string, dataFrames: DataFrame[]): Promise<void> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_WriteBinaryDataFrames(file, dataFrames.map((df) => df.dart));
  }

  /** Creates directory
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file*/
  async createDirectory(file: FileInfo | string): Promise<void> {
    file = this.setRoot(file);
    return api.grok_Dapi_UserFiles_CreateDirectory(file);
  }

  /** Writes a file.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @param {Array<number>} blob
   * @returns {Promise} */
  write(file: FileInfo | string, blob?: number[]): Promise<void> {
    if (!blob && ((file instanceof FileInfo && !file.data) || typeof file === 'string'))
      throw new Error('blob parameter should be presented');
    return api.grok_Dapi_UserFiles_Write(toDart(file), blob ?? (file as FileInfo).data);
  }

  /** Writes a text file.
   * Sample: {@link https://public.datagrok.ai/js/samples/dapi/files}
   * @param {FileInfo | string} file
   * @param {string} data
   * @returns {Promise} */
  writeAsText(file: FileInfo | string, data: string): Promise<void> {
    file = this.setRoot(file);

    return api.grok_Dapi_UserFiles_WriteAsText(file, data);
  }
}
