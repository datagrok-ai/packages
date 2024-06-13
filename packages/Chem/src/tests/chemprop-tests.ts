import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {category, test, before, expect} from '@datagrok-libraries/utils/src/test';
import {_package, getContainer, getAllModelingEngines} from '../package';
import {readDataframe} from './utils';
import JSZip from 'jszip';

const MODEL_ID = 'fb70afc9219181b09fa9f444112ba79e9f22d031c3f3e105ffd029feed1f4a8b';

category('chemprop', () => {
  let container: DG.DockerContainer;
  let binBlob: Uint8Array;
  let table: DG.DataFrame;

  before(async () => {
    table = await readDataframe('tests/smiles_test.csv');
    container = await getContainer();
  });

  test('getAllModelingEngines', async () => {
    if (!container) return;
    const modelingEngines = await getAllModelingEngines();
    expect('Chemprop' in DG.toJs(modelingEngines), true);
  });

  test('trainModel', async () => {
    const parameterValues = getParameterValues();
    const tableForPrediction = DG.DataFrame.fromColumns(table.columns.byNames(['canonical_smiles', 'molregno']));
    const modelBlob = await trainModel(MODEL_ID, tableForPrediction.toCsv(), 'molregno', parameterValues);

    const zip = new JSZip();
    const archive = await zip.loadAsync(modelBlob);
    const file = archive.file('blob.bin');
    binBlob = await file?.async('uint8array')!;
        
    expect(file !== null, true);
  });

  test('applyModel', async () => {
    const smilesColumn = table.columns.byName('canonical_smiles');
    const column = await applyModel(MODEL_ID, binBlob, DG.DataFrame.fromColumns([smilesColumn]).toCsv());
        
    expect(column.length, 30);
  });
});

async function trainModel(id: string, table: string, predict: string, parameterValues: Record<string, any>): Promise<Uint8Array> {
  const container = await getContainer();
  const uriParams = new URLSearchParams({
    'id': id,
    'type': 'Chemprop',
    'table': table,
    'predict': predict
  });

  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/modeling/train_chemprop?' + uriParams, {
    method: 'POST',
    body: JSON.stringify(parameterValues),
    headers: {'Content-Type': 'application/json'}
  });

  if (response.status !== 201)
    throw new Error(`Error training model: ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function applyModel(id: string, modelBlob: Uint8Array, table: string): Promise<DG.Column> {
  const container = await getContainer();
  const uriParams = new URLSearchParams({
    'id': id,
    'type': 'Chemprop',
    'table': table
  });

  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/modeling/predict_chemprop?' + uriParams, {
    method: 'POST',
    body: modelBlob,
    headers: {'Content-Type': 'application/octet-stream'}
  });

  if (response.status !== 201)
    throw new Error(`Error applying model: ${response.statusText}`);
  
  const data = await response.json();
  return DG.Column.fromStrings('outcome', data['outcome'].map((v: any) => v?.toString()));
}

function getParameterValues() {
  return {
    'dataset_type': 'regression',
    'metric': null,
    'multiclass_num_classes': 3,
    'activation': 'ReLU',
    'atom_messages': false,
    'batch_size': 50,
    'message_bias': false,
    'depth': 3,
    'dropout': 0,
    'ensemble_size': 1,
    'epochs': 50,
    'ffn_hidden_dim': 300,
    'ffn_num_layers': 2,
    'final_lr': 0.0001,
    'message_hidden_dim': 300,
    'init_lr': 0.0001,
    'max_lr': 0.001,
    'no_descriptor_scaling': false,
    'num_folds': 1,
    'data_seed': 0,
    'split_sizes': [0.8, 0.1, 0.1],
    'split_type': 'random',
    'undirected': false,
    'warmup_epochs': 2
  };
}