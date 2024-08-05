import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {_package} from '../package-test';

import {category, expect, test} from '@datagrok-libraries/utils/src/test';

import {classificationDataset} from './utils';
import {SoftmaxClassifier} from '../softmax-classifier';

const ROWS_K = 50;
const MIN_COLS = 2;
const COLS = 100;
const TIMEOUT = 4000;
const MIN_ACCURACY = 0.9;

category('Softmax', () => {
  test(`Performance: ${ROWS_K}K samples, ${COLS} features`, async () => {
    // Prepare data
    const df = classificationDataset(ROWS_K * 1000, COLS, false);
    const features = df.columns;
    const target = features.byIndex(COLS);
    console.log(target);
    features.remove(target.name);

    const model = new SoftmaxClassifier({
      classesCount: target.categories.length,
      featuresCount: features.length,
    });

    await model.fit(features, target);
    const modelBytes = model.toBytes();

    const unpackedModel = new SoftmaxClassifier(undefined, modelBytes);
    unpackedModel.predict(features);
  }, {timeout: TIMEOUT, benchmark: true});

  test('Correctness', async () => {
    // Prepare data
    const df = classificationDataset(ROWS_K, MIN_COLS, true);
    const features = df.columns;
    const target = features.byIndex(MIN_COLS);
    features.remove(target.name);

    const model = new SoftmaxClassifier({
      classesCount: target.categories.length,
      featuresCount: features.length,
    });

    await model.fit(features, target);
    const modelBytes = model.toBytes();

    const unpackedModel = new SoftmaxClassifier(undefined, modelBytes);
    const prediction = unpackedModel.predict(features);

    let correctPredictions = 0;

    for (let i = 0; i < ROWS_K; ++i) {
      if (target.get(i) === prediction.get(i))
        ++correctPredictions;
    }

    const acc = correctPredictions / ROWS_K;
    console.log(`accuracy: ${acc}`);

    expect(
      acc > MIN_ACCURACY,
      true,
      `Softmax failed, too small accuracy: ${acc}`,
    );
  }, {timeout: TIMEOUT});
}); // Linear regression
