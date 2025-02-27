import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {historyUtils} from '../../../history-utils';
import {PipelineSerializedState} from '../config/PipelineInstance';
import {FuncCallAdapter} from './FuncCallAdapters';
import {serialize, deserialize} from '@datagrok-libraries/utils/src/json-serialization';
import {FuncCallInstancesBridge} from './FuncCallInstancesBridge';
import {AdapterInitData} from './StateTreeNodes';
import {ItemMetadata} from '../view/ViewCommunication';
import {loadIsFavorite, saveIsFavorite} from '../../../shared-utils/utils';

export const RESTRICTIONS_PATH = 'INPUT_RESTRICTIONS';
export const OUTPUT_OUTDATED_PATH = 'OUTPUT_OUTDATED';
export const RUN_ERROR_PATH = 'RUN_ERROR';

const CONFIG_PATH = 'PIPELINE_CONFIG';

export async function makeFuncCall(
  nqName: string, isReadonly: boolean,
): Promise<AdapterInitData> {
  const func = DG.Func.byName(nqName);
  const fc = func.prepare({});
  fc.newId();
  const adapter = new FuncCallAdapter(fc, isReadonly);
  return {adapter, restrictions: {}, runError: undefined, isOutputOutdated: true};
}

export async function saveFuncCall(bridge: FuncCallInstancesBridge) {
  const fc = bridge.getInstance()?.getFuncCall();
  if (!fc)
    throw new Error(`Attempting to save an empty FuncCall adapter`);
  if (bridge.isRunning$.value)
    throw new Error(`FuncCall node saving during being updated`);

  // TODO: DF restrictions better handling
  fc.options[RESTRICTIONS_PATH] = serialize(bridge.inputRestrictions$.value, {useJsonDF: false});
  fc.options[OUTPUT_OUTDATED_PATH] = serialize(bridge.isOutputOutdated$.value, {useJsonDF: false});
  fc.options[RUN_ERROR_PATH] = bridge.runError$.value;

  fc.newId();
  await historyUtils.saveRun(fc, false);
  return fc;
}

export async function loadFuncCall(
  id: string,
  isReadonly: boolean,
): Promise<AdapterInitData> {
  const fc = await historyUtils.loadRun(id, false, false);
  const restrictions = deserialize(fc.options[RESTRICTIONS_PATH] ?? '{}');
  const isOutputOutdated = deserialize(fc.options[OUTPUT_OUTDATED_PATH] ?? 'false');
  const runError = fc.options[RUN_ERROR_PATH];
  const adapter = new FuncCallAdapter(fc, isReadonly);
  return {adapter, restrictions, runError, isOutputOutdated};
}

export async function makeMetaCall(nqName: string) {
  const func = DG.Func.byName(nqName);
  const metaCall = func.prepare({});
  return metaCall;
}

export async function saveInstanceState(
  nqName: string,
  state: any,
  metaData?: ItemMetadata,
) {
  const metaCall = await makeMetaCall(nqName);
  metaCall.options[CONFIG_PATH] = serialize(state, {useJsonDF: false});
  if (metaData?.title) metaCall.options['title'] = metaData.title;
  if (metaData?.description) metaCall.options['description'] = metaData.description;
  if (metaData?.tags) metaCall.options['tags'] = metaData.tags;
  metaCall.newId();
  await metaCall.call();
  await historyUtils.saveRun(metaCall);
  await saveIsFavorite(metaCall, metaData?.isFavorite ?? false);
  return metaCall;
}

export async function loadInstanceState(id: string) {
  const metaCall = await historyUtils.loadRun(id, false, false);
  const isFavorite = await loadIsFavorite(metaCall);
  const config: PipelineSerializedState = deserialize(metaCall.options[CONFIG_PATH] ?? '{}');
  return [config, metaCall, isFavorite] as const;
}
