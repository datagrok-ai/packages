import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import wu from 'wu';
import type ExcelJS from 'exceljs';
import type html2canvas from 'html2canvas';
import { ACTIONS_COLUMN_NAME, AUTHOR_COLUMN_NAME, COMPLETE_COLUMN_NAME, DESC_COLUMN_NAME, EXP_COLUMN_NAME, EXPERIMENTAL_TAG, FAVORITE_COLUMN_NAME, HistoryOptions, STARTED_COLUMN_NAME, HISTORY_SUPPORTED_COL_TYPES, TAGS_COLUMN_NAME, TITLE_COLUMN_NAME, VIEWER_PATH, viewerTypesMapping, storageName, ID_COLUMN_NAME } from './consts';
import dayjs from 'dayjs';
import {delay, getStarted} from '../function-views/src/shared/utils';
import {deserialize} from '@datagrok-libraries/utils/src/json-serialization';
import {OUTPUT_OUTDATED_PATH} from '../reactive-tree-driver/src/runtime/funccall-utils';

export const replaceForWindowsPath = (rawName: string, stringToInsert?: string) => {
  const regExpForWindowsPath = /(\/|\\|\:|\*|\?|\"|\<|\>|\|)/g;

  return rawName.replaceAll(regExpForWindowsPath, stringToInsert ?? '_');
};

export const richFunctionViewReport = async (
  format: string,
  func: DG.Func,
  lastCall: DG.FuncCall,
  dfToViewerMapping: {[key: string]: (DG.Viewer | undefined)[]},
) => {
  const sheetNamesCache = {} as Record<string, string>;

  const getSheetName = (initialName: string, wb: ExcelJS.Workbook) => {
    if (sheetNamesCache[initialName]) return sheetNamesCache[initialName];

    let name = `${initialName}`;
    if (name.length > 31)
      name = `${name.slice(0, 31)}`;
    let i = 1;
    while (wb.worksheets.some((sheet) => sheet.name.toLowerCase() === name.toLowerCase())) {
      let truncatedName = `${initialName}`;
      if (truncatedName.length > (31 - `-${i}`.length))
        truncatedName = `${initialName.slice(0, 31 - `-${i}`.length)}`;
      name = `${truncatedName}-${i}`;
      i++;
    }

    sheetNamesCache[initialName] = name;

    return name;
  };

  if (format === 'Excel') {
    try {
      await DG.Utils.loadJsCss(['/js/common/exceljs.min.js', '/js/common/html2canvas.min.js']);
      //@ts-ignore
      const loadedExcelJS = window.ExcelJS as ExcelJS;
      //@ts-ignore
      const loadedHtml2canvas: typeof html2canvas = window.html2canvas;

      const BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      const exportWorkbook = new loadedExcelJS.Workbook() as ExcelJS.Workbook;

      ui.setDisplay(grok.shell.v.root, false);
      updateIndicatorWithText(grok.shell.v.root.parentElement!, true,
        'Generating report. Please do not switch the browser tab...');

      const plotToSheet = async (
        sheet: ExcelJS.Worksheet,
        viewer: DG.Viewer | undefined,
        columnForImage: number, rowForImage = 0,
        options?: { heightInCells?: number, widthInCells?: number, widthToRender: number, heightToRender: number},
      ) => {
        if (!viewer || !viewer.dataFrame)
          return;
        const newViewer = DG.Viewer.fromType(viewer.type, viewer.dataFrame.clone());
        newViewer.copyViewersLook(viewer);

        const viewerBox = ui.div(newViewer.root, {style: {
          height: `${options?.heightToRender ?? 800}px`,
          width: `${options?.widthToRender ?? 800}px`,
        }});
        viewerBox.classList.add('ui-box');
        viewerBox.classList.remove('ui-div');
        grok.shell.v.root.insertAdjacentElement('afterend', viewerBox);

        await delay(1000);
        const imageDataUrl = (await loadedHtml2canvas(viewerBox)).toDataURL();

        viewerBox.remove();

        const imageId = exportWorkbook.addImage({
          base64: imageDataUrl,
          extension: 'png',
        });

        const ratio = (options?.heightInCells || options?.widthInCells) ?
          Math.min(
            (options?.heightInCells ?? Number.MAX_VALUE) / (800 / 20),
            (options?.widthInCells ?? Number.MAX_VALUE) / (800 / 100),
          ): 1;

        sheet.addImage(imageId, {
          tl: {col: columnForImage, row: rowForImage},
          ext: {width: 800 * ratio, height: 800 * ratio},
        });
      };

      const isScalarType = (type: DG.TYPE) => (DG.TYPES_SCALAR.has(type));

      const isDataFrame = (prop: DG.Property) => (prop.propertyType === DG.TYPE.DATA_FRAME);

      const dfInputs = func.inputs.filter((input) => isDataFrame(input));
      const scalarInputs = func.inputs.filter((input) => isScalarType(input.propertyType));
      const dfOutputs = func.outputs.filter((output) => isDataFrame(output));
      const scalarOutputs = func.outputs.filter((output) => isScalarType(output.propertyType));

      dfInputs.forEach((dfInput) => {
        const visibleTitle = dfInput.options.caption || dfInput.name;
        const currentDfSheet =
      exportWorkbook.worksheets.find((ws) => ws.name === getSheetName(visibleTitle, exportWorkbook)) ??
      exportWorkbook.addWorksheet(getSheetName(visibleTitle, exportWorkbook));

        const currentDf = lastCall.inputs[dfInput.name];
        dfToSheet(currentDfSheet, currentDf);
      });

      if (scalarInputs.length) {
        const inputScalarsSheet = exportWorkbook.addWorksheet('Input scalars');
        scalarsToSheet(inputScalarsSheet, scalarInputs.map((scalarInput) => ({
          caption: scalarInput.options['caption'] ?? scalarInput.name,
          value: lastCall.inputs[scalarInput.name] ?? '',
          units: scalarInput.options['units'] ?? '',
        })));
      }

      dfOutputs.forEach((dfOutput) => {
        const visibleTitle = dfOutput.options.caption || dfOutput.name;
        const currentDfSheet =
      exportWorkbook.worksheets.find((ws) => ws.name === getSheetName(visibleTitle, exportWorkbook)) ??
      exportWorkbook.addWorksheet(getSheetName(visibleTitle, exportWorkbook));

        const currentDf = lastCall.outputs[dfOutput.name];
        dfToSheet(currentDfSheet, currentDf);
      });


      if (scalarOutputs.length) {
        const outputScalarsSheet = exportWorkbook.addWorksheet('Output scalars');
        scalarsToSheet(outputScalarsSheet, scalarOutputs.map((scalarOutput) => ({
          caption: scalarOutput.options['caption'] ?? scalarOutput.name,
          value: lastCall.outputs[scalarOutput.name] ?? '',
          units: scalarOutput.options['units'] ?? '',
        })));
      }

      for (const inputProp of func.inputs.filter((prop) => isDataFrame(prop))) {
        const nonGridViewers = (dfToViewerMapping[inputProp.name] ?? [])
          .filter((viewer) => viewer && viewer.type !== DG.VIEWER.GRID)
          .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer!.type));

        if (nonGridViewers.length === 0) continue;

        const visibleTitle = inputProp.options.caption || inputProp.name;
        const currentDf = lastCall.inputs[inputProp.name];

        for (const [index, viewer] of nonGridViewers.entries()) {
          await plotToSheet(
            exportWorkbook.getWorksheet(getSheetName(visibleTitle, exportWorkbook))!,
            viewer,
            currentDf.columns.length + 2,
            (index > 0) ? (index * 16) + 1 : 0,
            {heightInCells: 16, heightToRender: 600, widthToRender: 600},
          );
        };
      }

      for (const outputProp of func.outputs.filter((prop) => isDataFrame(prop))) {
        const nonGridViewers = (dfToViewerMapping[outputProp.name] ?? [])
          .filter((viewer) => viewer && viewer.type !== DG.VIEWER.GRID)
          .filter((viewer) => Object.values(viewerTypesMapping).includes(viewer!.type));

        if (nonGridViewers.length === 0) continue;

        const visibleTitle = outputProp.options.caption || outputProp.name;
        const currentDf = lastCall.outputs[outputProp.name];

        for (const [index, viewer] of nonGridViewers.entries()) {
          if (!viewer)
            continue;
          if (viewer.type === DG.VIEWER.STATISTICS) {
            const length = currentDf.columns.length;
            const stats = DG.DataFrame.fromColumns([
              DG.Column.string('Name', length).init((i: number) => currentDf.columns.byIndex(i).name),
              DG.Column.int('Values', length).init((i: number) => currentDf.columns.byIndex(i).stats.valueCount),
              DG.Column.int('Nulls', length).init((i: number) => currentDf.columns.byIndex(i).stats.missingValueCount),
              DG.Column.float('Min', length).init((i: number) => currentDf.columns.byIndex(i).stats.min),
              DG.Column.float('Max', length).init((i: number) => currentDf.columns.byIndex(i).stats.max),
              DG.Column.float('Avg', length).init((i: number) => currentDf.columns.byIndex(i).stats.avg),
              DG.Column.float('Stdev', length).init((i: number) => currentDf.columns.byIndex(i).stats.stdev),
            ]);
            dfToSheet(
              exportWorkbook.getWorksheet(getSheetName(visibleTitle, exportWorkbook))!,
              stats,
              currentDf.columns.length + 2,
              (index > 0 && nonGridViewers[index-1]) ? Math.ceil(nonGridViewers[index-1]!.root.clientHeight / 20) + 1 : 0,
            );
          } else {
            await plotToSheet(
              exportWorkbook.getWorksheet(getSheetName(visibleTitle, exportWorkbook))!,
              viewer,
              currentDf.columns.length + 2,
              (index > 0) ? (index * 16) + 1 : 0,
              {heightInCells: 16, heightToRender: 600, widthToRender: 600},
            );
          }
        }
      }

      const buffer = await exportWorkbook.xlsx.writeBuffer();

      const blob =  new Blob([buffer], {type: BLOB_TYPE});

      return [blob, exportWorkbook] as const;
    } catch (e) {
      console.log(e);
    } finally {
      ui.setDisplay(grok.shell.v.root, true);
      updateIndicatorWithText(grok.shell.v.root.parentElement!, false);
    }
  }

  throw new Error('Format is not supported');
};

export const reportFuncCallExcel = async(funccall: DG.FuncCall) => {
  return richFunctionViewReport(
    'Excel',
    funccall.func,
    funccall,
    dfToViewerMapping(funccall),
  );
}

export const saveIsFavorite = async (funcCall: DG.FuncCall, isFavorite: boolean) => {
  const favStorageName = `${storageName}_${funcCall.func.name}_Fav`;

  if (isFavorite)
    return grok.dapi.userDataStorage.postValue(favStorageName, funcCall.id, '');
  else
    return grok.dapi.userDataStorage.remove(favStorageName, funcCall.id);
};

export const loadIsFavorite = async (funcCall: DG.FuncCall): Promise<boolean> => {
  const favStorageName = `${storageName}_${funcCall.func.name}_Fav`;
  const hasEntry = await grok.dapi.userDataStorage.getValue(favStorageName, funcCall.id, true);

  return (hasEntry === '') || false;
};

export const setGridCellRendering = (
  grid: DG.Grid,
  runs: Map<string, DG.FuncCall>,
  onEditClick: (cell: DG.GridCell) => void,
  onDeleteClick: (cell: DG.GridCell) => void,
  onFavoriteClick: (cell: DG.GridCell) => void,
  onUnfavoriteClick: (cell: DG.GridCell) => void,
  showActions: boolean,
) => {
  const getRunByIdx = (idx: number) => {
    return runs.get(grid.dataFrame.get(ID_COLUMN_NAME, idx));
  };

  const isFavoriteByIndex = (idx: number) => {
    return grid.dataFrame.get(FAVORITE_COLUMN_NAME, idx);
  };

  grid.onCellPrepare((cell) => {
    if (cell.isColHeader && cell.tableColumn?.name &&
        [ACTIONS_COLUMN_NAME, EXP_COLUMN_NAME, FAVORITE_COLUMN_NAME].includes(cell.tableColumn.name))
      cell.customText = '';

    if (cell.isColHeader)
      return;

    if (cell.tableColumn?.name === ACTIONS_COLUMN_NAME) {
      cell.customText = '';

      cell.element = ui.divH([
        ui.iconFA('trash', () => onDeleteClick(cell), 'Remove run from history'),
        ui.iconFA(
          'edit',
          () => onEditClick(cell),
          'Edit run metadata',
        ),
      ], {style: {padding: '6px', gap: '6px', justifyContent: 'space-between'}});
    }

    if (cell.tableColumn?.name === FAVORITE_COLUMN_NAME) {
      cell.customText = '';
      const unfavoriteIcon =
        ui.iconFA('star', () => onUnfavoriteClick(cell), 'Unfavorite');
      $(unfavoriteIcon).addClass('fas');

      cell.element = ui.div(
        cell.cell.value ?
          unfavoriteIcon :
          ui.iconFA('star', () => onFavoriteClick(cell), 'Favorite'),
        {style: {'padding': '6px'}});
    }

    if (cell.tableColumn?.name === EXP_COLUMN_NAME) {
      cell.customText = '';
      const experimentalTag = ui.iconFA('flask', null, 'Experimental run');
      $(experimentalTag).addClass('fad fa-sm');
      $(experimentalTag).removeClass('fal');

      cell.element = cell.cell.value && cell.cell.value === 'Experimental' ?
        ui.div(experimentalTag, {style: {'padding': '6px'}}) : ui.div();
    }

    if (cell.tableColumn?.name === TAGS_COLUMN_NAME) {
      cell.customText = '';
      const tags = cell.cell.value.length > 0 ? ui.div((cell.cell.value as string | null)?.split(',').map(
        (tag: string) => ui.span([tag], 'd4-tag')),
      'd4-tag-editor') : ui.div();
      $(tags).css({'padding': '3px', 'background-color': 'transparent'});
      cell.element = tags;
    }

    if (cell.tableColumn?.name === ID_COLUMN_NAME) {
      cell.customText = '';
      const run = getRunByIdx(cell.tableRowIndex!);

      if (!run) return;

      const authorIcon = run.author.picture as HTMLElement;
      $(authorIcon).css({'width': '25px', 'height': '25px', 'fontSize': '20px'});

      ui.bind(run.author, authorIcon);

      const experimentalTag = ui.iconFA('flask', null, 'Experimental run');
      experimentalTag.classList.add('fad', 'fa-sm');
      experimentalTag.classList.remove('fal');
      experimentalTag.style.marginLeft = '3px';
      const immutableTags = run.options['immutable_tags'] as string[] | undefined;
      const cardLabel = ui.span([
        ui.label(
          run.options['title'] ??
          run.author?.friendlyName ??
          grok.shell.user.friendlyName, {style: {'color': 'var(--blue-1)'}},
        ),
        ...(immutableTags && immutableTags.includes(EXPERIMENTAL_TAG)) ?
          [experimentalTag]:[],
      ]);

      const editIcon = ui.iconFA('edit', (ev) => {
        ev.stopPropagation();
        onEditClick(cell);
      }, 'Edit run metadata');
      editIcon.classList.add('hp-funccall-card-icon', 'hp-funccall-card-hover-icon');

      const deleteIcon = ui.iconFA('trash-alt', async (ev) => {
        ev.stopPropagation();
        onDeleteClick(cell);
      }, 'Delete run');
      deleteIcon.classList.add('hp-funccall-card-icon', 'hp-funccall-card-hover-icon');

      const unfavoriteIcon = ui.iconFA('star', (ev) => {
        ev.stopPropagation();
        onUnfavoriteClick(cell);
      }, 'Unfavorite');
      unfavoriteIcon.classList.add('fas', 'hp-funccall-card-icon');

      const addToFavorites = ui.iconFA('star',
        (ev) => {
          ev.stopPropagation();
          onFavoriteClick(cell);
        }, 'Favorite');
      addToFavorites.classList.add('hp-funccall-card-icon', 'hp-funccall-card-hover-icon');

      if (isFavoriteByIndex(cell.tableRowIndex!)) {
        ui.setDisplay(addToFavorites, false);
        ui.setDisplay(unfavoriteIcon, true);
      } else {
        ui.setDisplay(unfavoriteIcon, false);
        ui.setDisplay(addToFavorites, true);
      }

      const dateStarted = getStarted(run);

      const card = ui.divH([
        ui.divH([
          authorIcon,
          ui.divV([
            cardLabel,
            ui.span([dateStarted]),
            ...(run.options['tags'] && run.options['tags'].length > 0) ?
              [ui.div(run.options['tags'].map((tag: string) => ui.span([tag], 'd4-tag')))]:[],
          ], 'hp-card-content'),
        ]),
        ui.divH([
          ...showActions ? [unfavoriteIcon, addToFavorites, editIcon, deleteIcon]: [],
        ]),
      ], 'hp-funccall-card');

      const tableRowIndex = cell.tableRowIndex!;
      card.addEventListener('mouseover', () => {
        cell.grid.dataFrame.mouseOverRowIdx = tableRowIndex;
      });
      card.addEventListener('click', (e) => {
        if (e.shiftKey)
          cell.grid.dataFrame.selection.set(tableRowIndex, true);
        else if (e.ctrlKey)
          cell.grid.dataFrame.selection.set(tableRowIndex, false);
        else
          cell.grid.dataFrame.currentRowIdx = tableRowIndex;
      });
      cell.element = card;
    }
  });
};

export const setGridColumnsRendering = (grid: DG.Grid) => {
  const actionsCol = grid.columns.byName(ACTIONS_COLUMN_NAME);
  if (actionsCol) {
    actionsCol.cellType = 'html';
    actionsCol.width = 45;
  }

  const favCol = grid.columns.byName(FAVORITE_COLUMN_NAME);
  if (favCol) {
    favCol.cellType = 'html';
    favCol.width = 30;
  }

  const expCol = grid.columns.byName(EXP_COLUMN_NAME);
  if (expCol) {
    expCol.cellType = 'html';
    expCol.width = 30;
  }

  const tagsColumn = grid.columns.byName(TAGS_COLUMN_NAME);
  if (tagsColumn) {
    tagsColumn.cellType = 'html';
    tagsColumn.width = 90;
  }

  const startedCol = grid.columns.byName(STARTED_COLUMN_NAME);
  if (startedCol)
    startedCol.width = 110;

  const idCol = grid.columns.byName(ID_COLUMN_NAME);
  if (idCol)
    idCol.cellType = 'html';
};

export const getFavStorageName = (func: DG.Func) => {
  return `${storageName}_${func.name}_Fav`;
};

export const getColumnName = (key: string) => {
  return camel2title(key);
};

export const getRunsDfFromList = async (
  runs: Map<string, DG.FuncCall>,
  func: DG.Func,
  options?: HistoryOptions,
) => {
  const newRuns = [...runs.values()];

  const getColumnByProp = (prop: DG.Property) => {
    if (prop.propertyType === DG.TYPE.DATE_TIME) {
      return DG.Column.dateTime(prop.caption ?? getColumnName(prop.name), newRuns.length)
        // Workaround for https://reddata.atlassian.net/browse/GROK-15286
        .init((idx) => (<any>window).grok_DayJs_To_DateTime(newRuns[idx].inputs[prop.name]));
    }

    return DG.Column.fromType(
      prop.propertyType as any,
      prop.caption ?? getColumnName(prop.name),
      newRuns.length,
    ).init((idx) =>
      (options?.propFuncs?.[prop.name])?.(newRuns[idx]) ??
      extractStringValue(newRuns[idx], prop.name),
    );
  };

  const getColumnByName = (key: string) => {
    if (key === STARTED_COLUMN_NAME) {
      return DG.Column.dateTime(getColumnName(key), newRuns.length)
        // Workaround for https://reddata.atlassian.net/browse/GROK-15286
        .init((idx) =>
          (<any>window).grok_DayJs_To_DateTime(getStartedOrNull(newRuns[idx]) ?
            newRuns[idx].started.utc(true): dayjs.unix(newRuns[idx].options['createdOn'])),
        );
    }

    if (key === COMPLETE_COLUMN_NAME) {
      return DG.Column.bool(getColumnName(key), newRuns.length)
        // Workaround for https://reddata.atlassian.net/browse/GROK-15286
        .init((idx) => !isIncomplete(newRuns[idx]));
    }

    return DG.Column.fromStrings(
      getColumnName(key),
      newRuns.map((run) => (options?.propFuncs?.[key])?.(run) ?? extractStringValue(run, key)),
    );
  };

  const favoritesRecord: Record<string, string> = await grok.dapi.userDataStorage.get(getFavStorageName(func)) ?? {};
  const favorites = Object.keys(favoritesRecord);

  const getColumn = (key: string) => {
    const prop =
    func.inputs.find((prop) => prop.name === key) ??
    func.outputs.find((prop) => prop.name === key);
    if (prop)
      return getColumnByProp(prop);
    else
      return getColumnByName(key);
  };

  const newRunsGridDf = DG.DataFrame.fromColumns([
    DG.Column.string(EXP_COLUMN_NAME, newRuns.length).init((idx) => {
      const immutableTags = newRuns[idx].options['immutable_tags'] as string[];
      return immutableTags && immutableTags.includes(EXPERIMENTAL_TAG) ? 'Experimental': 'Simulated';
    }),
    ...options?.isHistory ?
      [DG.Column.bool(FAVORITE_COLUMN_NAME, newRuns.length)
        .init((idx) => favorites.includes(newRuns[idx].id))]: [],
    ...options?.showActions ? [DG.Column.string(ACTIONS_COLUMN_NAME, newRuns.length).init('')]: [],
    getColumnByName(STARTED_COLUMN_NAME),
    getColumnByName(COMPLETE_COLUMN_NAME),
    getColumnByName(AUTHOR_COLUMN_NAME),
    DG.Column.string(TAGS_COLUMN_NAME, newRuns.length).init((idx) =>
      newRuns[idx].options['tags'] ? newRuns[idx].options['tags'].join(','): '',
    ),
    DG.Column.string(TITLE_COLUMN_NAME, newRuns.length).init((idx) => newRuns[idx].options['title']),
    DG.Column.string(DESC_COLUMN_NAME, newRuns.length).init((idx) => newRuns[idx].options['description']),
  ]);

  getVisibleProps(func).map((key) => getColumn(key)).forEach((col) => {
    col.name = newRunsGridDf.columns.getUnusedName(col.name);
    newRunsGridDf.columns.add(col, false);
  });

  newRunsGridDf.columns.add(DG.Column.fromStrings(ID_COLUMN_NAME, newRuns.map((newRun) => newRun.id)));

  return newRunsGridDf;
};


const helpCache = new DG.LruCache<string, string>();

export const getContextHelp = async (func: DG.Func) => {
  const helpPath = func.options['help'];

  if (!helpPath) return null;

  if (helpCache.get(func.id)) return helpCache.get(func.id);

  const packagePath = `System:AppData/${helpPath}`;
  if (await grok.dapi.files.exists(packagePath)) {
    const readme = await grok.dapi.files.readAsText(packagePath);
    helpCache.set(func.id, readme);
    return readme;
  }

  const homePath = `${grok.shell.user.name}.home/${helpPath}`;
  if (await grok.dapi.files.exists(homePath)) {
    const readme = await grok.dapi.files.readAsText(homePath);
    helpCache.set(func.id, readme);
    return readme;
  }

  return null;
};

export const hasContextHelp = (func: DG.Func) => {
  return !!(func.options['help'] as string | undefined);
};


export const updateIndicatorWithText = (element: HTMLElement, updating: boolean, text?: string) => {
  ui.setUpdateIndicator(element, updating);
  const updatingLabel = element.querySelector('.d4-update-shadow .ui-label');
  if (updating && text && updatingLabel)
    updatingLabel.textContent = text;
};

export const isRunningOnInput = (func: DG.Func) => {
  return func.options['runOnInput'] === 'true';
};

export const getFeatures = (func: DG.Func) => {
  return JSON.parse(func.options['features'] ?? '{}');
};

export const getFeature = (features: Record<string, boolean> | string[], featureName: string, defaultValue: boolean) => {
  if (features instanceof Array)
    return features.includes(featureName);

  if (features instanceof Object)
    return features[featureName] ?? defaultValue;

  return defaultValue;
};

export const isIncomplete = (run: DG.FuncCall) => {
  const isOutputOutdated = deserialize(run.options[OUTPUT_OUTDATED_PATH] ?? 'false');
  return isOutputOutdated || !getStartedOrNull(run) || !run.id;
};

export const getStartedOrNull = (run: DG.FuncCall) => {
  try {
    return run.started as any;
  } catch {
    return null;
  }
};

export const extractStringValue = (run: DG.FuncCall, key: string) => {
  if (key === AUTHOR_COLUMN_NAME) return run.author?.friendlyName ?? grok.shell.user.friendlyName;

  const val =
  (run as any)[key] ??
  run.inputs[key] ??
  run.outputs[key] ??
  run.options[key] ??
  null;

  return val?.toString() ?? '';
};

export const getMainParams = (func: DG.Func): string[] | null => {
  return func.options['mainParams'] ? JSON.parse(func.options['mainParams']): null;
};

export const getVisibleProps = (func: DG.Func, options?: HistoryOptions): string[] => {
  return options?.visibleProps ?? getMainParams(func) ?? func.inputs
    .filter((input) => HISTORY_SUPPORTED_COL_TYPES.includes(input.propertyType as any))
    .map((prop) => prop.name);
};

export const camel2title = (camelCase: string) => camelCase
  .replace(/([A-Z])/g, (match) => ` ${match.toLowerCase()}`)
  .trim()
  .replace(/^./, (match) => match.toUpperCase());

export const deepCopy = (call: DG.FuncCall) => {
  const deepClone = DG.Func.byName(call.func.nqName).prepare();

  //@ts-ignore
  deepClone.id = call.id;

  call.options.forEach((key: string) => deepClone.options[key] = call.options[key]);

  const definedOutputs = wu(deepClone.outputParams.values())
    .filter((output) => call.outputs[output.name] != null);
  for (const output of definedOutputs) {
    if (output.property.propertyType === DG.TYPE.DATA_FRAME)
      deepClone.outputs[output.name] = call.outputs[output.name].clone();
    else
      deepClone.outputs[output.name] = call.outputs[output.name];
  }

  const definedInputs = wu(deepClone.inputParams.values())
    .filter((input) => call.inputs[input.name] != null);
  for (const input of definedInputs) {
    if (input.property.propertyType === DG.TYPE.DATA_FRAME)
      deepClone.inputs[input.name] = call.inputs[input.name].clone();
    else
      deepClone.inputs[input.name] = call.inputs[input.name];
  }

  if (getStartedOrNull(call)) deepClone.started = call.started;

  return deepClone;
};

export const getPropViewers = (prop: DG.Property): {name: string, config: Record<string, string | boolean>[]} => {
  const viewersRawConfig = prop.options[VIEWER_PATH];
  return viewersRawConfig ?
  // true and false values are retrieved as string, so we parse them separately
    {name: prop.name, config: JSON.parse(viewersRawConfig, (k, v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      // Converting internal Dart labels to JS DG.VIEWER labels
      if (k === 'type') return viewerTypesMapping[v] || v;

      if (!k.toLowerCase().includes('color')) {
        const parsed = Number.parseFloat(v);

        if (!Number.isNaN(parsed))
          return parsed;
      }

      return v;
    })}:
    {name: prop.name, config: []};
};

export const scalarsToSheet =
  (sheet: ExcelJS.Worksheet, scalars: { caption: string, value: string, units: string }[]) => {
    sheet.addRow(['Parameter', 'Value', 'Units']).font = {bold: true};
    scalars.forEach((scalar) => {
      sheet.addRow([scalar.caption, scalar.value, scalar.units]);
    });

    sheet.getColumn(1).width = Math.max(
      ...scalars.map((scalar) => scalar.caption.toString().length), 'Parameter'.length,
    ) * 1.2;
    sheet.getColumn(2).width = Math.max(
      ...scalars.map((scalar) => scalar.value.toString().length), 'Value'.length) * 1.2;
    sheet.getColumn(3).width = Math.max(
      ...scalars.map((scalar) => scalar.units.toString().length), 'Units'.length) * 1.2;
  };

let dfCounter = 0;
export const dfToSheet = (sheet: ExcelJS.Worksheet, df?: DG.DataFrame, column?: number, row?: number) => {
  if (!df)
    return;
  const columnKey = sheet.getColumn(column ?? 1).letter;
  const tableConfig = {
    name: `ID_${dfCounter.toString()}`,
    ref: `${columnKey}${row ?? 1}`,
    columns: df.columns.toList().map((col) => ({name: col.name, filterButton: false})),
    rows: new Array(df.rowCount).fill(0).map((_, idx) => [...df.row(idx).cells].map((cell) => cell.value)),
  };
  sheet.addTable(tableConfig);
  sheet.columns.forEach((col) => {
    col.width = 25;
    col.alignment = {wrapText: true};
  });
  dfCounter++;
};

export const getFuncCallDefaultFilename = (funcCall: DG.FuncCall) => {
  return `${funcCall.func.nqName} - ${getStartedOrNull(funcCall) ?? 'Not completed'}.xlsx`;
};

const isDataFrame = (prop: DG.Property) => (prop.propertyType === DG.TYPE.DATA_FRAME);

export const dfToViewerMapping = (funcCall: DG.FuncCall) => {
  const func = funcCall.func;

  const mapping = {} as Record<string, (DG.Viewer | undefined)[]>;
  Promise.all(func.inputs
    .filter((output) => isDataFrame(output))
    .map(async (p) => {
      mapping[p.name] = await Promise.all(getPropViewers(p).config
        .map((config) => configToViewer(funcCall.inputs[p.name], config)));

      return mapping[p.name];
    }));

  Promise.all(func.outputs
    .filter((output) => isDataFrame(output))
    .map(async (p) => {
      mapping[p.name] = await Promise.all(getPropViewers(p).config
        .map((config) => configToViewer(funcCall.outputs[p.name], config)));

      return mapping[p.name];
    }));

  return mapping;
};

const configToViewer = async (df: DG.DataFrame | undefined, config: Record<string, any>) => {
  if (!df)
    return;
  const type = config['type'];
  const viewer = await df.plot.fromType(type) as DG.Viewer;
  viewer.setOptions(config);

  return viewer;
};
