import * as DG from 'datagrok-api/dg';
import * as tf from '@tensorflow/tfjs';
import * as JsZip from 'jszip';
import { base64StringToArrayBuffer } from '@tensorflow/tfjs-core/dist/io/io_utils';

export type activations = 'elu'|'hardSigmoid'|'linear'|'relu'|'relu6'|'selu'|'sigmoid'
  |'softmax'|'softplus'|'softsign'|'tanh'|'swish'|'mish';

export function processFeatures(dataframe: DG.DataFrame) {
  let array2d: number[][] = [];
  let val: any;
  for (let i = 0; i < dataframe.rowCount; i++) {
    array2d.push([]);
      for (let col of dataframe.columns) {
        val = dataframe.get(col.name, i);
        if (col.type === DG.TYPE.STRING) {
          //TODO: convert to one-hot and spread across different columns
          //if it's binary, use binary instead of one-hot
          val = col.categories.findIndex((cat: string) => cat === val);
          if (col.categories.length > 2) {
            for (let j = 0; j < col.categories.length; j++) {
              array2d[i].push(val === j ? 1 : 0);
            }
            continue;
          }
        }
        array2d[i].push(val);
      }
  }
  return tf.tensor2d(array2d, undefined, 'float32');
}

export function processLables(column: DG.Column): tf.Tensor2D {
  let labels: number[] | tf.Tensor = [];
  if (column.type === DG.TYPE.STRING) {
    labels = tf.tensor1d(column.toList().map(
      (value) => column.categories.findIndex((cat) => cat === value)
    ), 'float32');
    // if column contains more than 2 categories, make one-hot vectors from it
    if (column.categories.length > 2) {
      labels = tf.oneHot(labels, column.categories.length);
    } else {
      labels = labels.reshape([column.length, 1]);
    }
  } else {
    labels = tf.tensor2d(column.toList(), [column.length, 1], 'float32');
  }
  return labels;
}

export async function saveModel(model: tf.Sequential) {
  await model.save("localstorage://model");

  let zip = new JsZip();
  zip.file("model_topology", localStorage.getItem("tensorflowjs_models/model/model_topology")!);
  zip.file("weight_data", localStorage.getItem("tensorflowjs_models/model/weight_data")!);
  zip.file("weight_specs", localStorage.getItem("tensorflowjs_models/model/weight_specs")!);

  let result;
  if (JsZip.support.uint8array) {
    result = await zip.generateAsync({type : "uint8array"});
  } else {
    console.log("ERROR: This browser doesn't support UInt8Arrays!");
  }
  return result;
}

export async function loadModel(modelArray: Uint8Array) {
  let zip = await JsZip.loadAsync(modelArray);
  
  const out: tf.io.ModelArtifacts = {};
  out.modelTopology = JSON.parse(await zip.file("model_topology")!.async('string'));
  out.weightSpecs = JSON.parse(await zip.file("weight_specs")!.async('string'));
  out.weightData = base64StringToArrayBuffer(await zip.file("weight_data")!.async('binarystring'));

  return tf.loadLayersModel(tf.io.fromMemory(out));
}

export function oneHotToCategory(vector: number[], categories: string[]) {
  if (categories.length == 2) {
    return vector[0] < 0.5 ? categories[0] : categories[1];
  }
  return categories[tf.argMax(vector).arraySync()];
}
