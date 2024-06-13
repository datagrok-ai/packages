/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';

import {
  EXAMPLE_PATTERN_CONFIG,
  GRAPH_SETTINGS_KEY_LIST as GKL, LEGEND_SETTINGS_KEYS as L, OTHER_USERS, PATTERN_RECORD_KEYS as R, STORAGE_NAME
} from './const';
import {
  PatternConfigRecord, PatternConfiguration, PatternExistsError, PatternNameExistsError, RawPatternRecords
} from './types';

import objectHash from 'object-hash';
import {EventBus} from './event-bus';
import {ITranslationHelper} from '../../../types';
import {_package} from '../../../package';

export class DataManager {
  private currentUserName: string;
  private currentUserId: string;
  private otherUsersPatternNameToHash = new Map<string, string>();
  private currentUserPatternNameToHash = new Map<string, string>();

  // WARNING: init logic encapsulated
  private constructor(
    private readonly th: ITranslationHelper
  ) { }

  static async getInstance(): Promise<DataManager> {
    const th = await _package.getTranslationHelper();
    const instance = new DataManager(th);

    instance.currentUserName = await instance.fetchCurrentUserName();
    instance.currentUserId = await instance.fetchCurrentUserId();

    const patternRecords = await instance.fetchPatterns();
    await instance.initializePatternMaps(patternRecords);

    return instance;
  }

  getCurrentUserPatternNames(): string[] {
    return Array.from(this.currentUserPatternNameToHash.keys())
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  getOtherUsersPatternNames(): string[] {
    return Array.from(this.otherUsersPatternNameToHash.keys())
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  getCurrentUserName(): string {
    return this.currentUserName;
  }

  private validatePatternNameUniqueness(patternName: string): void {
    if (this.currentUserPatternNameToHash.has(patternName))
      throw new PatternNameExistsError(`Pattern with name ${patternName} already exists`);
  }

  private validatePatternUniqueness(hash: string): void {
    const existingHashes = Array.from(this.currentUserPatternNameToHash.values())
      .concat(Array.from(this.otherUsersPatternNameToHash.values()));

    if (existingHashes.includes(hash))
      throw new PatternExistsError(hash);
  }

  getPatternHash(patternName: string, isCurrentUserPattern: boolean): string {
    const patternHash = isCurrentUserPattern ?
      this.currentUserPatternNameToHash.get(patternName) :
      this.otherUsersPatternNameToHash.get(patternName);

    if (patternHash === undefined)
      throw new Error(`Pattern with name ${patternName} not found`);

    return patternHash;
  }

  async getPatternRecord(hash: string): Promise<PatternConfigRecord | null> {
    if (hash === null || hash === '')
      return null;
    try {
      const patternConfig = await grok.dapi.userDataStorage.getValue(STORAGE_NAME, hash, false);
      const config = JSON.parse(patternConfig) as PatternConfigRecord;
      return config;
    } catch {
      return null;
    }
  }

  async getPatternConfig(hash: string | null): Promise<PatternConfiguration | null> {
    if (hash === '' || hash === null)
      return null;
    const record = await this.getPatternRecord(hash);
    const config = record === null ? null : record[R.PATTERN_CONFIG] as PatternConfiguration;
    return config;
  }

  getDefaultPatternRecord(): PatternConfigRecord {
    const record = EXAMPLE_PATTERN_CONFIG as PatternConfigRecord;
    record[R.AUTHOR_ID] = this.currentUserId;
    return record;
  }

  getDefaultPatternConfig(): PatternConfiguration {
    return EXAMPLE_PATTERN_CONFIG[R.PATTERN_CONFIG] as PatternConfiguration;
  }

  private getAuthorCategoryByHash(hash: string): string {
    if (this.isCurrentUserPattern(hash))
      return this.getCurrentUserAuthorshipCategory();
    else if (this.isOtherUserPattern(hash))
      return this.getOtherUsersAuthorshipCategory();
    else
      throw new Error(`Pattern with hash ${hash} not found`);
  }

  private isCurrentUserPattern(hash: string): boolean {
    return Array.from(this.currentUserPatternNameToHash.values()).includes(hash);
  }

  private isOtherUserPattern(hash: string): boolean {
    return Array.from(this.otherUsersPatternNameToHash.values()).includes(hash);
  }

  getPatternNameByHash(hash: string): string {
    const maps = [this.currentUserPatternNameToHash, this.otherUsersPatternNameToHash];
    for (const map of maps) {
      for (const [patternName, patternHash] of map.entries()) {
        if (patternHash === hash)
          return patternName;
      }
    }
    throw new Error(`Pattern with hash ${hash} not found`);
  }

  private getHashOfPatternToBeLoadedAfterDeletion(): string {
    const nameOfPatternToBeLoaded = this.getCurrentUserPatternNames()[0];
    if (!nameOfPatternToBeLoaded)
      throw new Error('Cannot load pattern after deletion, as there are no patterns left');
    const hash = this.currentUserPatternNameToHash.get(nameOfPatternToBeLoaded);
    if (hash === undefined)
      throw new Error(`Pattern with name ${nameOfPatternToBeLoaded} not found`);
    return hash;
  }

  private async getRecordFromPattern(patternConfig: PatternConfiguration): Promise<string> {
    const record = {
      [R.PATTERN_CONFIG]: patternConfig,
      [R.AUTHOR_ID]: await grok.dapi.users.current().then((u) => u.id),
    };
    const stringifiedRecord = JSON.stringify(record);
    return stringifiedRecord;
  }

  private getHash(patternConfig: PatternConfiguration): string {
    // WARNING: hash is computed over the graph settings only, as the ones defining the pattern's identity
    const graphSettings = GKL.reduce((acc, key) => {
      acc[key] = patternConfig[key as keyof PatternConfiguration];
      return acc;
    }, {} as any);
    return objectHash.sha1(graphSettings);
  }

  async savePatternToUserStorage(
    eventBus: EventBus
  ): Promise<void> {
    const patternConfig = eventBus.getPatternConfig();
    try {
      const hash = this.getHash(patternConfig);
      this.validatePatternUniqueness(hash);

      const patternName = patternConfig[L.PATTERN_NAME];
      this.validatePatternNameUniqueness(patternName);

      const record = await this.getRecordFromPattern(patternConfig);
      await grok.dapi.userDataStorage.postValue(STORAGE_NAME, hash, record, false);
      this.currentUserPatternNameToHash.set(patternName, hash);

      eventBus.selectAuthor(this.getCurrentUserAuthorshipCategory());

      eventBus.updatePatternList();
    } catch (e) {
      if (e instanceof PatternNameExistsError || e instanceof PatternExistsError)
        throw e;
      else
        console.error('Error while saving pattern to user storage', e);
    }
  }

  async overwritePatternInUserStorage(
    eventBus: EventBus
  ): Promise<void> {
    const patternConfig = eventBus.getPatternConfig();
    const hash = this.getHash(patternConfig);
    const patternName = patternConfig[L.PATTERN_NAME];
    const record = await this.getRecordFromPattern(patternConfig);
    await grok.dapi.userDataStorage.postValue(STORAGE_NAME, hash, record, false);
    this.currentUserPatternNameToHash.set(patternName, hash);
    // eventBus.selectUser(this.getCurrentUserAuthorshipCategory());
    eventBus.updatePatternList();
  }

  async deletePattern(
    patternName: string,
    eventBus: EventBus
  ): Promise<void> {
    const hash = this.currentUserPatternNameToHash.get(patternName);
    if (patternName === this.getDefaultPatternName()) {
      grok.shell.warning(`Cannot delete default pattern`);
      return;
    }
    if (hash === undefined)
      throw new Error(`Pattern with name ${patternName} not found`);
    await grok.dapi.userDataStorage.remove(STORAGE_NAME, hash, false);
    this.currentUserPatternNameToHash.delete(patternName);
    eventBus.updatePatternList();

    const hashOfPatternToBeLoaded = this.getHashOfPatternToBeLoadedAfterDeletion();
    eventBus.requestPatternLoad(hashOfPatternToBeLoaded);
  }

  fetchDefaultNucleobase(): string {
    return this.fetchAvailableNucleotideBases()[0];
  }

  fetchAvailableNucleotideBases(): string[] {
    const format = Object.keys(this.th.jsonData.patternAppData)[0];
    const nucleotideBases: string[] = Object.keys(this.th.jsonData.patternAppData[format]);
    return nucleotideBases;
  }


  private async fetchCurrentUserName(): Promise<string> {
    return (await grok.dapi.users.current()).friendlyName;
  }

  private async fetchCurrentUserId(): Promise<string> {
    return (await grok.dapi.users.current()).id;
  }

  private async fetchPatterns() {
    const patternsRecord = await grok.dapi.userDataStorage.get(STORAGE_NAME, false) as RawPatternRecords;
    return patternsRecord;
  }

  private async initializePatternMaps(patternRecords: RawPatternRecords) {
    if (!this.currentUserId)
      throw new Error('Current user ID is not set');

    const userIdsToUserNames = new Map<string, string>();

    for (const [patternHash, stringifiedRecord] of Object.entries(patternRecords))
      await this.extractDataFromRecordToMaps(patternHash, stringifiedRecord, userIdsToUserNames);

    this.setDefaultPattern();
  }

  private setDefaultPattern(): void {
    const defaultPatternConfig = EXAMPLE_PATTERN_CONFIG[R.PATTERN_CONFIG] as PatternConfiguration;
    this.currentUserPatternNameToHash.set(defaultPatternConfig[L.PATTERN_NAME], '');
  }

  private async extractDataFromRecordToMaps(
    patternHash: string,
    stringifiedRecord: string,
    userIdsToUserNames: Map<string, string>
  ) {
    const record = JSON.parse(stringifiedRecord);
    const patternConfig = record[R.PATTERN_CONFIG] as PatternConfiguration;
    const patternName = patternConfig.patternName;
    const authorID = record[R.AUTHOR_ID];
    if (this.isCurrentUserId(authorID)) {
      this.currentUserPatternNameToHash.set(patternName, patternHash);
    } else {
      if (!userIdsToUserNames.has(authorID)) {
        const userFriendlyName = (await grok.dapi.users.find(authorID)).friendlyName;
        userIdsToUserNames.set(authorID, userFriendlyName);
      }
      const fullPatternName = patternName + ` (created by ${userIdsToUserNames.get(authorID)})`;
      this.otherUsersPatternNameToHash.set(fullPatternName, patternHash);
    }
  }

  getDefaultPatternName(): string {
    return EXAMPLE_PATTERN_CONFIG[R.PATTERN_CONFIG][L.PATTERN_NAME];
  }

  getCurrentUserAuthorshipCategory(): string {
    return this.currentUserName + ' (me)';
  }

  getOtherUsersAuthorshipCategory(): string {
    return OTHER_USERS;
  }

  isCurrentUserId(userId: string): boolean {
    return userId === this.currentUserId;
  }
}
