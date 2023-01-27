/* eslint-disable max-len */
/* eslint-disable valid-jsdoc */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import wu from 'wu';

type DateOptions = 'Any time' | 'Today' | 'Yesterday' | 'This week' | 'Last week' | 'This month' | 'Last month' | 'This year' | 'Last year';

type FilterOptions = {
  text?: string,
  date?: DateOptions,
  author?: DG.User,
  isShared?: boolean,
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
  const scriptsCache = {} as Record<string, DG.Script>;

  export async function loadRun(funcCallId: string, skipDfLoad = false) {
    const pulledRun = await grok.dapi.functions.calls.allPackageVersions()
      .include('inputs, outputs, session.user').find(funcCallId);

    const id = pulledRun.func.id;
    // FIX ME: manually get script since pulledRun contains empty Func
    const script = scriptsCache[id] ?? await grok.dapi.functions.allPackageVersions().find(id);

    if (!scriptsCache[id]) scriptsCache[id] = script;
    pulledRun.func = script;
    pulledRun.options['isHistorical'] = true;

    if (!skipDfLoad) {
      const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
        .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
      for (const output of dfOutputs)
        pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);

      const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
        .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
      for (const input of dfInputs)
        pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
    }

    return pulledRun;
  }

  export async function saveRun(callToSave: DG.FuncCall) {
    const dfOutputs = wu(callToSave.outputParams.values() as DG.FuncCallParam[])
      .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
    for (const output of dfOutputs)
      await grok.dapi.tables.uploadDataFrame(callToSave.outputs[output.name]);

    const dfInputs = wu(callToSave.inputParams.values() as DG.FuncCallParam[])
      .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
    for (const input of dfInputs)
      await grok.dapi.tables.uploadDataFrame(callToSave.inputs[input.name]);


    return await grok.dapi.functions.calls.allPackageVersions().save(callToSave);
  }

  export async function deleteRun(callToDelete: DG.FuncCall) {
    await grok.dapi.functions.calls.allPackageVersions().delete(callToDelete);
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
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {}
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
   * WARNING: FuncCall inputs/outputs fields are not included
   * @param funcName Name of Func which calls we are looking for. Get it using {@link func.name} field
   * @return Promise on array of FuncCalls corresponding to the passed Func ID
   * @stability Experimental
 */
  export async function pullRunsByName(
    funcName: string,
    filterOptions: FilterOptions[] = [],
    listOptions: {pageSize?: number, pageNumber?: number, filter?: string, order?: string} = {},
    includedFields: string[] = []
  ): Promise<DG.FuncCall[]> {
    let filteringString = ``;
    for (const filterOption of filterOptions) {
      const filterOptionCriteria = [] as string[];
      if (filterOption.author) filterOptionCriteria.push(`session.user.id="${filterOption.author.id}"`);
      if (filterOption.date) filterOptionCriteria.push(getSearchStringByPattern(filterOption.date));
      if (filterOption.isShared) filterOptionCriteria.push(`options.isShared="true"`);
      if (filterOption.text) {
        filterOptionCriteria.push(
          `((options.title like "${filterOption.text}") or (options.annotation like "${filterOption.text}"))`
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
        .include(`${includedFields.join(',')}`)
        .list(listOptions);

    for (const pulledRun of result) {
      const id = pulledRun.func.id;
      const script = scriptsCache[id] ?? await grok.dapi.functions.allPackageVersions().find(id);

      if (!scriptsCache[id]) scriptsCache[id] = script;
      pulledRun.func = script;
    }

    if (includedFields.includes('inputs') || includedFields.includes('func.params')) {
      for (const pulledRun of result) {
        const dfInputs = wu(pulledRun.inputParams.values() as DG.FuncCallParam[])
          .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
        for (const input of dfInputs)
          pulledRun.inputs[input.name] = await grok.dapi.tables.getTable(pulledRun.inputs[input.name]);
      }
    }

    if (includedFields.includes('outputs') || includedFields.includes('func.params')) {
      for (const pulledRun of result) {
        const dfOutputs = wu(pulledRun.outputParams.values() as DG.FuncCallParam[])
          .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
        for (const output of dfOutputs)
          pulledRun.outputs[output.name] = await grok.dapi.tables.getTable(pulledRun.outputs[output.name]);
      }
    }

    return result;
  }
}
