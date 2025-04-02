/* eslint-disable max-len */
/* eslint-disable valid-jsdoc */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import wu from 'wu';
import {deepCopy, isIncomplete} from '../../shared-utils/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

type DateOptions = 'Any time' | 'Today' | 'Yesterday' | 'This week' | 'Last week' | 'This month' | 'Last month' | 'This year' | 'Last year';

type FilterOptions = {
  text?: string,
  date?: DateOptions,
  author?: DG.User,
  includeDeleted?: boolean,
};

const getSearchStringByPattern = (datePattern: DateOptions) => {
  switch (datePattern) {
  case 'Today':
    return `started > -1d`;
  case 'Yesterday':
    return `started > -2d and started < -1d`;
  case 'Any time':
    return ``;
  case 'Last year':
    return `started > -2y and started < -1y`;
  case 'This year':
    return `started > -1y`;
  case 'Last month':
    return `started > -2m and started < -1m`;
  case 'This month':
    return `started > -1m`;
  case 'Last week':
    return `started > -2w and started < -1w`;
  case 'This week':
    return `started > -1w`;
  }
};

export namespace historyUtils {
  const groupsCache = new DG.LruCache();

  export async function loadChildRuns(
    funcCallId: string,
  ): Promise<{parentRun: DG.FuncCall, childRuns: DG.FuncCall[]}> {
    const parentRun = await loadRun(funcCallId);

    const childRuns = await grok.dapi.functions.calls.allPackageVersions()
      .include('func, func.package').filter(`options.parentCallId="${funcCallId}"`).list();

    return {parentRun, childRuns};
  }

  /**
   * Loads a FuncCall with a specified ID. By default, also loads its' inputs/outputs and author.
   * FuncCall is loaded with internal TableInfo structs instead of DG.Dataframe-s.
   * Thus, we should load them separately, and it is time-consuming. If you don't need actual values of DF-s,
   * you can skip DF loading using {@link skipDfLoad} param.
   * @param funcCallId FuncCall ID to load
   * @param skipDfLoad If true, skips replacing TableInfo with the actual dataframe
   * @returns Requested FuncCall
   */
  export async function loadRun(funcCallId: string, skipDfLoad = false, skipFileLoad = true) {
    const pulledRun = await grok.dapi.functions.calls.allPackageVersions()
      .include('session.user,func.package, inputs, outputs').find(funcCallId);

    if (!skipFileLoad) {
      const fileInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
        .filter((input) => input.property.propertyType === DG.TYPE.FILE &&
          !!pulledRun.inputs[input.name]);

      await Promise.all(fileInputs
        .map(async (input) => {
          const {id, name} = JSON.parse(pulledRun.inputs[input.name]);
          const bytes = await grok.dapi.files.readAsBytes(id);
          const fileInfo = DG.FileInfo.fromBytes(name, bytes);
          fileInfo.id = id;
          pulledRun.inputs[input.name] = fileInfo;

          return Promise.resolve();
        }),
      );
    }

    if (!skipDfLoad) {
      const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
        .filter((output) =>
          output.property.propertyType === DG.TYPE.DATA_FRAME &&
          !!pulledRun.outputs[output.name],
        );
      await Promise.all(dfOutputs.map(async (output) => {
        pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);
        return Promise.resolve();
      }));

      const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
        .filter((input) =>
          input.property.propertyType === DG.TYPE.DATA_FRAME &&
          !!pulledRun.inputs[input.name],
        );
      await Promise.all(dfInputs.map(async (input) => {
        pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
        return Promise.resolve();
      }));
    }

    return pulledRun;
  }

  /**
   * Saved given FuncCall.
   * FuncCall is only stores references to actual dataframes. Thus, we should upload them separately
   * @param callToSave FuncCall to save
   * @returns Saved FuncCall
   */
  export async function saveRun(callToSave: DG.FuncCall, skipFileSave = true) {
    let allGroup = groupsCache.get('All users');

    if (!allGroup) {
      allGroup = await grok.dapi.groups.find(DG.Group.defaultGroupsIds['All users']);
      groupsCache.set('All users', allGroup);
    }

    const callCopy = deepCopy(callToSave);
    if (isIncomplete(callCopy)) callCopy.options['createdOn'] = dayjs().utc(true).unix();

    if (!skipFileSave) {
      const fileInputs = wu(callCopy.inputParams.values() as DG.FuncCallParam[])
        .filter((input) => input.property.propertyType === DG.TYPE.FILE &&
        !!callCopy.inputs[input.name]);

      await Promise.all(fileInputs
        .map(async (input) => {
          const fileInfo = callCopy.inputs[input.name] as DG.FileInfo;
          const filledFileInfo = DG.FileInfo.fromBytes(fileInfo.name, await fileInfo.readAsBytes());
          await grok.dapi.files.write(filledFileInfo);
          callCopy.inputs[input.name] = {id: filledFileInfo.id, name: filledFileInfo.name};

          return Promise.resolve();
        }),
      );
    }

    const dfOutputs = wu(callCopy.outputParams.values() as DG.FuncCallParam[])
      .filter((output) =>
        output.property.propertyType === DG.TYPE.DATA_FRAME &&
        !!callCopy.outputs[output.name],
      );
    await Promise.all(dfOutputs
      .map(async (output) => {
        await grok.dapi.tables.uploadDataFrame(callCopy.outputs[output.name]);
        await grok.dapi.permissions.grant(callCopy.outputs[output.name].getTableInfo(), allGroup, false);
      }));

    const dfInputs = wu(callCopy.inputParams.values() as DG.FuncCallParam[])
      .filter((input) =>
        input.property.propertyType === DG.TYPE.DATA_FRAME &&
        !!callCopy.inputs[input.name],
      );
    await Promise.all(dfInputs
      .map(async (input) => {
        await grok.dapi.tables.uploadDataFrame(callCopy.inputs[input.name]);
        await grok.dapi.permissions.grant(callCopy.inputs[input.name].getTableInfo(), allGroup, false);
      }));

    return await grok.dapi.functions.calls.allPackageVersions().save(callCopy);
  }

  export async function deleteRun(callToDelete: DG.FuncCall) {
    callToDelete.options['isDeleted'] = true;
    await grok.dapi.functions.calls.allPackageVersions().save(callToDelete);
  }

  /**
   * Loads all the function call of this function.
   * Designed to pull hstorical runs in fast manner and the call {@link loadRun} with specified run ID.
   * WARNING: FuncCall inputs/outputs fields are not included
   * @param funcId ID of Func which calls we are looking for. Get it using {@link func.id} field
   * @return Promise on array of FuncCalls corresponding to the passed Func ID
   * @stability Deprecated. Script ID changes with every package release, so searching by ID is useless in practice.
 */
  export async function pullRuns(
    funcId: string,
    filterOptions: FilterOptions = {},
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {},
  ): Promise<DG.FuncCall[]> {
    let filteringString = `func.id="${funcId}"`;
    filteringString += filterOptions.author ? ` and session.user.id="${filterOptions.author.id}"`:'';
    filteringString += filterOptions.date ? getSearchStringByPattern(filterOptions.date): '';
    const filter = grok.dapi.functions.calls
      .allPackageVersions()
      .filter(filteringString)
      .include('session.user, options');
    const list = filter.list(listOptions);
    return list;
  }

  /**
   * Loads all the function call of this function.
   * Designed to pull hstorical runs in fast manner and the call {@link loadRun} with specified run ID.
   * WARNING: FuncCall inputs/outputs fields are not included by default. Use {@link includedFields} to specify fields to load.
   * @param funcName Name of Func which calls we are looking for. Get it using {@link func.name} field
   * @param filterOptions Struct containing filtering options. These options will be passed as valid filtering string to a request.
   * @param listOptions Struct containing listing options.
   * @param includedFields List of fields to include into response. See {@link DG.FuncCall} struct to see possible values. E.g., 'inputs' or 'outputs'
   * @return Promise on array of FuncCalls corresponding to the passed Func ID
   * @stability Stable
 */
  export async function pullRunsByName(
    funcName: string,
    filterOptions: FilterOptions[] = [],
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {},
    includedFields: string[] = [],
    skipDfLoad: boolean = false,
  ): Promise<DG.FuncCall[]> {
    let filteringString = ``;
    for (const filterOption of filterOptions) {
      const filterOptionCriteria = [] as string[];
      if (filterOption.author) filterOptionCriteria.push(`session.user.id="${filterOption.author.id}"`);
      if (filterOption.date) filterOptionCriteria.push(getSearchStringByPattern(filterOption.date));
      if (filterOption.text) {
        filterOptionCriteria.push(
          `((options.title like "${filterOption.text}") or (options.annotation like "${filterOption.text}"))`,
        );
      }

      if (!filterOption.includeDeleted) {
        filterOptionCriteria.push(
          `((options.isDeleted != "true") or (options.isDeleted = null))`,
        );
      }

      const filterOptionString = filterOptionCriteria.join(' and ');
      if (filterOptionString !== '') {
        if (filteringString === '')
          filteringString += `(${filterOptionString})`;
        else
          filteringString += ` or (${filterOptionString})`;
      }
    }
    if (filteringString !== '')
      filteringString = ` and (${filteringString})`;

    const result =
      await grok.dapi.functions.calls
        .allPackageVersions()
        .filter(`func.name="${funcName}"${filteringString}`)
        .include(`${[...includedFields, 'func.package'].join(',')}`)
        .list(listOptions);

    if ((includedFields.includes('inputs') || includedFields.includes('func.params')) && !skipDfLoad) {
      for (const pulledRun of result) {
        const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
          .filter((input) =>
            input.property.propertyType === DG.TYPE.DATA_FRAME &&
            !!pulledRun.inputs[input.name],
          );
        for (const input of dfInputs)
          pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
      }
    }

    if ((includedFields.includes('outputs') || includedFields.includes('func.params')) && !skipDfLoad) {
      for (const pulledRun of result) {
        const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
          .filter((output) =>
            output.property.propertyType === DG.TYPE.DATA_FRAME &&
            !!pulledRun.outputs[output.name],
          );
        for (const output of dfOutputs)
          pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);
      }
    }

    return result;
  }
}
