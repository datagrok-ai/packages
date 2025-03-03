import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {category, test, before, expect} from '@datagrok-libraries/utils/src/test';
import {_package, applyModelChemprop, trainModelChemprop} from '../package';
import {CONTAINER_TIMEOUT, ensureContainerRunning, readDataframe} from './utils';
import JSZip from 'jszip';
import { fetchWrapper } from '@datagrok-libraries/utils/src/fetch-utils';

category('chemprop', () => {
  let binBlob: Uint8Array;
  let table: DG.DataFrame;

  before(async () => {
    table = await readDataframe('tests/smiles_test.csv');
  });

  test('trainModel', async () => {
    await ensureContainerRunning('chemprop');
    const parameterValues = getParameterValues();
    const tableForPrediction = DG.DataFrame.fromColumns(table.columns.byNames(['canonical_smiles', 'molregno']));
    const modelBlob = await fetchWrapper(() => trainModelChemprop(tableForPrediction.toCsv(), 'molregno', parameterValues));

    const zip = new JSZip();
    const archive = await zip.loadAsync(modelBlob);
    const file = archive.file('blob.bin');
    binBlob = await file?.async('uint8array')!;
        
    expect(file !== null, true);
  }, {timeout: 90000 + CONTAINER_TIMEOUT});

  test('applyModel', async () => {
    await ensureContainerRunning('chemprop');
    const smilesColumn = table.columns.byName('canonical_smiles');
    const column = await fetchWrapper(() => applyModelChemprop(binBlob, DG.DataFrame.fromColumns([smilesColumn]).toCsv()));
        
    expect(column.length, 20);
  });
}, {timeout: 90000 + CONTAINER_TIMEOUT});

function getParameterValues() {
  return {
    'dataset_type': 'regression',
    'metric': 'rmse',
    'multiclass_num_classes': 3,
    'activation': 'ReLU',
    'atom_messages': false,
    'batch_size': 64,
    'message_bias': false,
    'depth': 3,
    'dropout': 0.0,
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
    'warmup_epochs': 2.0
  };
}