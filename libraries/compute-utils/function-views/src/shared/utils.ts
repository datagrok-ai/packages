import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {RUN_ID_COL_LABEL, RUN_NAME_COL_LABEL, VIEWER_PATH, viewerTypesMapping} from '../../../shared-utils/consts';

export const delay = (delayInms: number) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

export const getDefaultValue = (prop: DG.Property) => {
  // Before 1.19 the default value was in .defaultValue. In 1.19 it was moved to options.default
  if (prop.options?.['default'])
    return JSON.parse(prop.options?.['default']);

  const legacyDefaultValue = prop.defaultValue;

  return prop.propertyType === DG.TYPE.STRING && legacyDefaultValue?
    (legacyDefaultValue as string).substring(1, legacyDefaultValue.length - 1):
    legacyDefaultValue;
};


export const getPropViewers = (prop: DG.Property): {name: string, config: Record<string, string | boolean>[]} => {
  const viewersRawConfig = prop.options[VIEWER_PATH];
  return (viewersRawConfig !== undefined) ?
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

export const getDfFromRuns = (
  comparedRuns: DG.FuncCall[],
  func: DG.Func,
  options: {
    parentView?: DG.View,
    parentCall?: DG.FuncCall,
  } = {parentView: undefined, parentCall: undefined},
) => {
  const configFunc = func;

  const allParamViewers = [
    ...configFunc.inputs,
    ...configFunc.outputs,
  ]
    .map((prop) => getPropViewers(prop))
    .reduce((acc, config) => {
      if (!acc[config.name])
        acc[config.name] = config.config;
      else
        acc[config.name].push(...config.config);
      return acc;
    }, {} as Record<string, Record<string, string | boolean>[]>);

  const addColumnsFromProp = (configProp: DG.Property): DG.Column[] => {
    if (configProp.propertyType === DG.TYPE.DATA_FRAME) {
      const requestedViewersConfigs = allParamViewers[configProp.name];

      const viewerColumns = requestedViewersConfigs.map((config) => {
        let columnName = configProp.caption ?? configProp.name;
        const newColumn = DG.Column.fromType(DG.TYPE.DATA_FRAME, columnName, comparedRuns.length);
        newColumn.init(
          (idx: number) => comparedRuns[idx].inputs[configProp.name] ?? comparedRuns[idx].outputs[configProp.name],
        );
        const unusedName = comparisonDf.columns.getUnusedName(`${newColumn.name} (${config['type']})`);
        newColumn.name = unusedName;
        columnName = unusedName;
        newColumn.temp[VIEWER_PATH] = config;
        comparisonDf.columns.add(newColumn);

        return newColumn;
      });

      return viewerColumns;
    } else {
      let columnName = configProp.caption ?? configProp.name;
      //@ts-ignore
      const newColumn = DG.Column.fromType(configProp.propertyType, columnName, comparedRuns.length);
      newColumn.init(
        (idx: number) => comparedRuns[idx].inputs[configProp.name] ?? comparedRuns[idx].outputs[configProp.name],
      );
      const unusedName = comparisonDf.columns.getUnusedName(newColumn.name);
      newColumn.name = unusedName;
      columnName = unusedName;
      comparisonDf.columns.add(newColumn);
      return [newColumn];
    }
  };

  const comparisonDf = DG.DataFrame.create(comparedRuns.length);
  const uniqueRunNames = [] as string[];
  comparedRuns.forEach((run) => {
    let defaultRunName = run.options['title'] ??
        `${run.func.name} - ${getStarted(run)}`;
    let idx = 2;
    while (uniqueRunNames.includes(defaultRunName)) {
      defaultRunName = `${run.func.name} - ${getStarted(run)})
        .toLocaleString('en-us', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})} - ${idx}`;
      idx++;
    }
    uniqueRunNames.push(defaultRunName);
  });

  comparisonDf.columns.add(DG.Column.fromStrings(
    RUN_NAME_COL_LABEL,
    uniqueRunNames,
  ));
  comparisonDf.name = options.parentCall?.func.name ?
    `${options.parentCall?.func.name} - comparison` : `${func.name} - comparison`;

  configFunc.inputs.forEach((prop) => addColumnsFromProp(prop));
  configFunc.outputs.forEach((prop) => addColumnsFromProp(prop));

  // Catching events to render context panel
  grok.events.onCurrentObjectChanged.subscribe(({sender}) => {
    if (
      sender instanceof DG.Column &&
      sender.type === DG.TYPE.DATA_FRAME &&
      grok.shell.tv &&
      grok.shell.tv.temp['isComparison'] &&
      [
        DG.VIEWER.LINE_CHART, DG.VIEWER.SCATTER_PLOT,
        DG.VIEWER.HISTOGRAM, DG.VIEWER.BOX_PLOT,
      ].includes(sender.temp[VIEWER_PATH]['type'])
    ) {
      grok.shell.windows.showProperties = true;

      const getAppendedDfs = (column: DG.Column) => {
        const appendedDf = column.get(0).clone() as DG.DataFrame;
        appendedDf.columns.addNew(RUN_ID_COL_LABEL, DG.TYPE.STRING).init(column.dataFrame.get(RUN_NAME_COL_LABEL, 0));

        for (let i = 1; i < column.length; i++) {
          const newRunDf = column.get(i).clone() as DG.DataFrame;
          newRunDf.columns.addNew(RUN_ID_COL_LABEL, DG.TYPE.STRING).init(column.dataFrame.get(RUN_NAME_COL_LABEL, i));

          // If one of the columns is parsed as int, it could be converted into double for proper append
          const convertibleTypes = [DG.COLUMN_TYPE.INT, DG.COLUMN_TYPE.FLOAT] as DG.ColumnType[];
          for (let j = 0; j < newRunDf.columns.length; j++) {
            const newDfColumn = newRunDf.columns.byIndex(j);
            const appendDfColumn = appendedDf.columns.byIndex(j);

            if (
              newDfColumn.type !== appendDfColumn.type &&
              convertibleTypes.includes(newDfColumn.type) &&
              convertibleTypes.includes(appendDfColumn.type)
            ) {
              if (newDfColumn.type !== DG.COLUMN_TYPE.FLOAT)
                newRunDf.columns.replace(newDfColumn, newDfColumn.convertTo(DG.COLUMN_TYPE.FLOAT));
              if (appendDfColumn.type !== DG.COLUMN_TYPE.FLOAT)
                appendedDf.columns.replace(appendDfColumn, appendDfColumn.convertTo(DG.COLUMN_TYPE.FLOAT));
            }
          }

          appendedDf.append(newRunDf, true);
        }

        return appendedDf;
      };

      const config = sender.temp[VIEWER_PATH]['look'];

      // Avoiding cycling event emission
      // TODO: review the preformance
      setTimeout(() => {
        switch (sender.temp[VIEWER_PATH]['type']) {
        case DG.VIEWER.LINE_CHART:
          const t1 = ui.waitBox(async () => {
            const unitedDf = sender.temp['unitedDf'] as DG.DataFrame ?? getAppendedDfs(sender);
            sender.temp['unitedDf'] = unitedDf;
            return unitedDf.plot.line({...config, 'split': RUN_ID_COL_LABEL}).root;
          });
          $(t1).css({'width': '100%'});
          grok.shell.o = t1;
          break;
        case DG.VIEWER.SCATTER_PLOT:
          const t2 = ui.waitBox(async () => {
            const unitedDf = sender.temp['unitedDf'] as DG.DataFrame ?? getAppendedDfs(sender);
            sender.temp['unitedDf'] = unitedDf;
            return unitedDf.plot.scatter({...config, 'color': RUN_ID_COL_LABEL}).root;
          });
          grok.shell.o = t2;
          $(t2).css({'width': '100%'});
          break;
        case DG.VIEWER.HISTOGRAM:
          const t3 = ui.waitBox(async () => {
            const unitedDf = sender.temp['unitedDf'] as DG.DataFrame ?? getAppendedDfs(sender);
            sender.temp['unitedDf'] = unitedDf;
            return unitedDf.plot.histogram({...config, 'split': RUN_ID_COL_LABEL}).root;
          });
          grok.shell.o = t3;
          $(t3).css({'width': '100%'});
          break;
        case DG.VIEWER.BOX_PLOT:
          const t4 = ui.waitBox(async () => {
            const unitedDf = sender.temp['unitedDf'] as DG.DataFrame ?? getAppendedDfs(sender);
            sender.temp['unitedDf'] = unitedDf;
            return unitedDf.plot.box({...config, 'category': RUN_ID_COL_LABEL}).root;
          });
          grok.shell.o = t4;
          $(t4).css({'width': '100%'});
          break;
        }
      });
    }
  });

  return comparisonDf;
};

export const getStarted = (call: DG.FuncCall) => {
  try {
    return call.started.toDate()
      .toLocaleString('en-us', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'});
  } catch {
    return 'Not completed';
  }
};
