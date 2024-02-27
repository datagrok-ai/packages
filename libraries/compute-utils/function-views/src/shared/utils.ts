import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import {RUN_ID_COL_LABEL, RUN_NAME_COL_LABEL, VIEWER_PATH, viewerTypesMapping} from '../../../shared-utils/consts';
import wu from 'wu';
import {Observable} from 'rxjs';
import {SubscriptionLike} from '../../../shared-utils/input-wrappers';

export function properUpdateIndicator(e: HTMLElement, state: boolean) {
  if (state) {
    $(e).addClass('ui-box').css({'width': 'auto', 'height': 'auto'});
    ui.setUpdateIndicator(e, true);
  } else {
    ui.setUpdateIndicator(e, false);
    $(e).removeClass('ui-box');
  }
}

export function getObservable<T>(onInput: (f: Function) => SubscriptionLike): Observable<T> {
  return new Observable((observer: any) => {
    const sub = onInput((val: T) => {
      observer.next(val);
    });
    return () => sub.unsubscribe();
  });
}

export const deepCopy = (call: DG.FuncCall) => {
  const deepClone = call.clone();

  const dfOutputs = wu(call.outputParams.values() as DG.FuncCallParam[])
    .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
  for (const output of dfOutputs)
    deepClone.outputs[output.name] = call.outputs[output.name].clone();

  const dfInputs = wu(call.inputParams.values() as DG.FuncCallParam[])
    .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
  for (const input of dfInputs)
    deepClone.inputs[input.name] = call.inputs[input.name].clone();

  return deepClone;
};

export const renderCards = (funcCalls: DG.FuncCall[]) => {
  const selectedCallsSet = new Set<DG.FuncCall>();

  const renderCard = (funcCall: DG.FuncCall) => {
    const cardLabel = ui.label(
      funcCall.options['title'] ??
      funcCall?.author?.friendlyName ??
      'Uploaded run',
      {style: {'color': 'var(--blue-1)'}},
    );

    const addToSelected = ui.iconFA('square', (ev) => {
      ev.stopPropagation();
      selectedCallsSet.add(funcCall);

      addToSelected.style.display = 'none';
      removeFromSelected.style.removeProperty('display');
      // this.updateActionsSection(this.tabs.currentPane.name as TAB_LABELS);
    }, 'Select this run');
    addToSelected.classList.add('hp-funccall-card-icon', 'hp-funccall-card-hover-icon');

    const removeFromSelected = ui.iconFA('check-square', (ev) => {
      ev.stopPropagation();
      selectedCallsSet.delete(funcCall);
      removeFromSelected.style.display = 'none';

      // this.updateActionsSection(this.tabs.currentPane.name as TAB_LABELS);
      addToSelected.style.removeProperty('display');
    }, 'Unselect this run');
    removeFromSelected.classList.add('hp-funccall-card-icon');

    if (!selectedCallsSet.has(funcCall)) {
      addToSelected.style.removeProperty('display');
      removeFromSelected.style.display = 'none';
    } else {
      addToSelected.style.display = 'none';
      removeFromSelected.style.removeProperty('display');
    }

    const dateStarted = new Date(funcCall.started.toString())
      .toLocaleString('en-us', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'});

    const card = ui.divH([
      ui.divH([
        ui.divV([
          cardLabel,
          ui.span([dateStarted]),
          ...(funcCall.options['description']) ? [ui.divText(funcCall.options['description'], 'description')]: [],
          ...(funcCall.options['tags'] && funcCall.options['tags'].length > 0) ?
            [ui.div(funcCall.options['tags'].map((tag: string) => ui.span([tag], 'd4-tag')))]:[],
        ], 'hp-card-content'),
      ]),
      ui.divH([
        addToSelected, removeFromSelected,
      ]),
    ], 'hp-funccall-card');

    ui.tooltip.bind(card, () => ui.tableFromMap({
      Author: grok.shell.user.toMarkup(),
      Date: dateStarted,
      ...(funcCall.options['title']) ? {'Title': funcCall.options['title']}:{},
      ...(funcCall.options['description']) ? {'Description': funcCall.options['description']}:{},
      ...(funcCall.options['tags'] && funcCall.options['tags'].length > 0) ?
        {'Tags': ui.div(funcCall.options['tags'].map((tag: string) => ui.span([tag], 'd4-tag')), 'd4-tag-editor')}:{},
    }));
    return card;
  };

  return {html: ui.divV(funcCalls.map((funcCall) => renderCard(funcCall))), selected: selectedCallsSet};
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

export const getFuncRunLabel = (func: DG.Func) => {
  return func.options['runLabel'];
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
        `${run.func.name} - ${new Date(run.started.toString())
          .toLocaleString('en-us', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})}`;
    let idx = 2;
    while (uniqueRunNames.includes(defaultRunName)) {
      defaultRunName = `${run.func.name} - ${new Date(run.started.toString())
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
