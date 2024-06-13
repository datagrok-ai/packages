/* eslint-disable max-len */
import {getGPUDevice} from '../getGPUDevice';
import {toOffsetForm} from '../umap/utils';

export async function generationsGPU(structuresN: number, activityN: number, moleculesArray: string[],
  allStructures: string[], allInitActivities: Float32Array, activityName: string[], activities: Float32Array[],
  activityNames: string[], frags: [string, string][][], meanDiffs: Float32Array[], prediction: Float32Array,
  cores: string[], from: string[], to: string[], rulesFrom: ArrayLike<number>, rulesTo: ArrayLike<number>,
  rulesFromCats: string[], rulesToCats: string[]
) {
  console.time('encoding for webGPU');
  let fragsMap: {[_: string]: number} = {};
  const emptyCoreIndex = 0;
  fragsMap[''] = emptyCoreIndex;
  let fragHashCounter = 1;
  const fragsLens = frags.map((val) => val.length);
  const fragsTotalLen = fragsLens.reduce((a, b) => a + b, 0);
  const fragsOffsets = toOffsetForm(fragsLens);
  const initCores = new Uint32Array(fragsTotalLen);
  const initSubsts = new Uint32Array(fragsTotalLen);
  const activitiesFlat = new Float32Array(activityN * structuresN);
  const rulesFromFlat = new Uint32Array(rulesFrom.length);
  const rulesToFlat = new Uint32Array(rulesTo.length);
  const meanDiffsFlat = new Float32Array(meanDiffs.length * meanDiffs[0].length);
  const coresFlat = new Uint32Array(cores.length);
  const fromFlat = new Uint32Array(from.length);
  const toFlat = new Uint32Array(to.length);


  let fragsCounter = 0;
  // encoding for webGPU
  for (let i = 0; i < structuresN; i ++) {
    for (let j = 0; j < activityN; j++) {
      allStructures[j * structuresN + i] = moleculesArray[i];
      allInitActivities[j * structuresN + i] = activities[j][i];
      activityName[j * structuresN + i] = activityNames[j];
    }

    for (let j = 0; j < frags[i].length; j++) {
      const core = frags[i][j][0];
      const subst = frags[i][j][1];
      const coreNum = (fragsMap[core] ??= ++fragHashCounter);
      const substNum = (fragsMap[subst] ??= ++fragHashCounter);
      initCores[fragsCounter] = coreNum;
      initSubsts[fragsCounter] = substNum;
      fragsCounter++;

    //   if (core != '') {
    //     for (let k = 0; k < rulesFrom.length; k++) {
    //       if (subst === rulesFromCats[rulesFrom[k]] ) {
    //         for (let kk = 0; kk < activityN; kk++) {
    //           const activity = activities[kk][i] + meanDiffs[kk][k];
    //           const add = kk * structuresN;
    //           if (activity > prediction[add + i]) {
    //             prediction[add + i] = activity;
    //             cores[add + i] = core;
    //             from[add + i] = subst;
    //             to[add + i] = rulesToCats[rulesTo[k]];
    //           }
    //         }
    //       }
    //     }
    //   }
    }
    for (let kk = 0; kk < activityN; kk++)
      activitiesFlat[kk * structuresN + i] = activities[kk][i];
  }

  for (let k = 0; k < rulesFrom.length; k++) {
    rulesFromFlat[k] = (fragsMap[rulesFromCats[rulesFrom[k]]] ??= ++fragHashCounter);
    rulesToFlat[k] = (fragsMap[rulesToCats[rulesTo[k]]] ??= ++fragHashCounter);
    for (let kk = 0; kk < activityN; kk++)
      meanDiffsFlat[kk * rulesFrom.length + k] = meanDiffs[kk][k];
  }
  // END encoding for webGPU
  console.timeEnd('encoding for webGPU');

  // Start: WEBGPU

  const device = await getGPUDevice();
  if (!device)
    return null; // if no device, return null, as we cannot do anything without it.

  const threadsPerWorkgroupDim = 10;
  const threadsInWorkgroup = threadsPerWorkgroupDim * threadsPerWorkgroupDim;
  const neededThreads = 10000;
  const neededWorkgroups = Math.ceil(neededThreads / threadsInWorkgroup);
  const workgroupsPerDim = Math.ceil(Math.sqrt(neededWorkgroups));
  const totalThreadsPerDim = workgroupsPerDim * threadsPerWorkgroupDim;

  const module = device.createShaderModule({
    label: 'mmp compute shader',
    code: `
        struct InData {
            fragsOfsetts: array<u32, ${fragsOffsets.length}>,
            cores: array<u32, ${initCores.length}>,
            substs: array<u32, ${initSubsts.length}>,
            activities: array<f32, ${activitiesFlat.length}>,
            rulesFrom: array<u32, ${rulesFromFlat.length}>,
            rulesTo: array<u32, ${rulesToFlat.length}>,
            meanDiffs: array<f32, ${meanDiffsFlat.length}>
        }
        
        struct OutData {
            prediction: array<f32, ${prediction.length}>,
            cores: array<u32, ${coresFlat.length}>,
            oFrom: array<u32, ${fromFlat.length}>,
            oTo: array<u32, ${toFlat.length}>
        }

        struct ComputeData {
            startAt: u32,
            endAt: u32
        }

        @group(0) @binding(0) var<storage, read_write> inData: InData;
        @group(0) @binding(1) var<storage, read_write> res: OutData;
        @group(0) @binding(2) var<storage, read_write> computeData: ComputeData;
        @compute @workgroup_size(${threadsPerWorkgroupDim}, ${threadsPerWorkgroupDim}) fn calcGenerations(
            @builtin(global_invocation_id) id: vec3<u32>
          ) {
            let col = id.x;
            let row = id.y;
            let structuresN = ${structuresN}u;
            let activityN = ${activityN}u;
            let workingIndex = row * ${totalThreadsPerDim} + col + computeData.startAt;
            if (workingIndex >= min(computeData.endAt, ${structuresN})) {
                return;
            }

            let fragOffset = inData.fragsOfsetts[workingIndex];
            let fragEnd = inData.fragsOfsetts[workingIndex + 1];
            for (var i = fragOffset; i < fragEnd; i++) {
                let core = inData.cores[i];
                let subst = inData.substs[i];
                if (core == ${emptyCoreIndex}u) {
                    continue;
                }

                for (var k = 0u; k < ${rulesFrom.length}u; k++) {
                    if (subst != inData.rulesFrom[k]) {
                        continue;
                    }
                    for (var kk = 0u; kk < activityN; kk++) {
                        let activity = inData.activities[kk * structuresN + workingIndex] + inData.meanDiffs[kk * ${rulesFrom.length}u + k];
                        let add = kk * structuresN;
                        if (activity > res.prediction[add + workingIndex]) {
                            res.prediction[add + workingIndex] = activity;
                            res.cores[add + workingIndex] = core;
                            res.oFrom[add + workingIndex] = subst;
                            res.oTo[add + workingIndex] = inData.rulesTo[k];
                        }
                    }
                }
            }
          }
    `});

  const pipeline = device.createComputePipeline({
    label: 'mmp generations pipeline',
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'calcGenerations',
    },
  });

  const inData32Size = fragsOffsets.length + initCores.length + initSubsts.length + activitiesFlat.length +
    rulesFromFlat.length + rulesToFlat.length + meanDiffsFlat.length;
  let inDataByteSize = inData32Size * 4;
  const rem1 = inDataByteSize & 15;
  if (rem1 !== 0)
    inDataByteSize += (16 - rem1);

  const generationsInBuffer = device.createBuffer({
    label: 'mmp data in buffer',
    size: inDataByteSize,
    usage: GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const generationsInArrayBuffer = generationsInBuffer.getMappedRange();

  // setting data
  let offsetAccum = 0;
  const fragsOfsettsView = new Uint32Array(generationsInArrayBuffer, offsetAccum, fragsOffsets.length);
  fragsOfsettsView.set(fragsOffsets, 0);
  offsetAccum += 4 * fragsOffsets.length;

  const coresView = new Uint32Array(generationsInArrayBuffer, offsetAccum, initCores.length);
  coresView.set(initCores, 0);
  offsetAccum += 4 * initCores.length;

  const substsView = new Uint32Array(generationsInArrayBuffer, offsetAccum, initSubsts.length);
  substsView.set(initSubsts, 0);
  offsetAccum += 4 * initSubsts.length;

  const activitiesView = new Float32Array(generationsInArrayBuffer, offsetAccum, activitiesFlat.length);
  activitiesView.set(activitiesFlat, 0);
  offsetAccum += 4 * activitiesFlat.length;

  const rulesFromView = new Uint32Array(generationsInArrayBuffer, offsetAccum, rulesFromFlat.length);
  rulesFromView.set(rulesFromFlat, 0);
  offsetAccum += 4 * rulesFromFlat.length;

  const rulesToView = new Uint32Array(generationsInArrayBuffer, offsetAccum, rulesToFlat.length);
  rulesToView.set(rulesToFlat, 0);
  offsetAccum += 4 * rulesToFlat.length;

  const meanDiffsView = new Float32Array(generationsInArrayBuffer, offsetAccum, meanDiffsFlat.length);
  meanDiffsView.set(meanDiffsFlat, 0);
  offsetAccum += 4 * meanDiffsFlat.length;

  generationsInBuffer.unmap();


  const res32Size = prediction.length + coresFlat.length + fromFlat.length + toFlat.length;
  let resByteSize = res32Size * 4;
  const rem2 = resByteSize & 15;
  if (rem2 !== 0)
    resByteSize += (16 - rem2);

  const generationsOutBuffer = device.createBuffer({
    label: 'mmp generations data out buffer',
    size: resByteSize,
    usage: GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  const resultOutBuffer = device.createBuffer({
    label: 'results out buffer mmp generations',
    size: generationsOutBuffer.size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });


  const generationsOutArrayBuffer = generationsOutBuffer.getMappedRange();
  let outOffsetAccum = 0;
  const predictionView = new Float32Array(generationsOutArrayBuffer, outOffsetAccum, prediction.length);
  outOffsetAccum += 4 * prediction.length;
  predictionView.set(prediction, 0);

  const coresOutView = new Uint32Array(generationsOutArrayBuffer, outOffsetAccum, coresFlat.length);
  outOffsetAccum += 4 * coresFlat.length;
  coresOutView.set(coresFlat, 0);

  const fromOutView = new Uint32Array(generationsOutArrayBuffer, outOffsetAccum, fromFlat.length);
  outOffsetAccum += 4 * fromFlat.length;
  fromOutView.set(fromFlat, 0);

  const toOutView = new Uint32Array(generationsOutArrayBuffer, outOffsetAccum, toFlat.length);
  outOffsetAccum += 4 * toFlat.length;
  toOutView.set(toFlat, 0);

  generationsOutBuffer.unmap();

  const computInfoBuffer = device.createBuffer({
    label: 'mmp generations compute info buffer',
    size: 16,
    usage: GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
  });


  const bindGroup = device.createBindGroup({
    label: 'bindGroup for mmp generations buffers',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {binding: 0, resource: {buffer: generationsInBuffer}},
      {binding: 1, resource: {buffer: generationsOutBuffer}},
      {binding: 2, resource: {buffer: computInfoBuffer}},
    ],
  });


  for (let i = 0; i < Math.ceil(structuresN / neededThreads); i++) {
    const startAt = i * neededThreads;
    const endAt = Math.min((i + 1) * neededThreads, structuresN);
    const computeData = new Uint32Array([startAt, endAt]);
    device.queue.writeBuffer(computInfoBuffer, 0, computeData.buffer, 0, 8);

    const encoder = device.createCommandEncoder({
      label: 'mmp generations encoder',
    });
    const pass = encoder.beginComputePass({
      label: 'mmp generations compute pass',
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(
      workgroupsPerDim,
      workgroupsPerDim
    );

    pass.end();
    if (i === Math.ceil(structuresN / neededThreads) - 1) {
      encoder.copyBufferToBuffer(
        generationsOutBuffer,
        0,
        resultOutBuffer,
        0,
        resultOutBuffer.size
      );
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    await device.queue.onSubmittedWorkDone();
  }
  // map the buffer
  await resultOutBuffer.mapAsync(GPUMapMode.READ);

  //   prediction: array<f32, ${prediction.length}>;
  //   cores: array<u32, ${coresFlat.length}>;
  //   from: array<u32, ${fromFlat.length}>;
  //   to: array<u32, ${toFlat.length}>;

  const resultsOutArrayBuffer = resultOutBuffer.getMappedRange();
  let resultOffset = 0;
  const outPredictionsView = new Float32Array(resultsOutArrayBuffer, resultOffset, prediction.length);
  resultOffset += 4 * prediction.length;
  const outCoresView = new Uint32Array(resultsOutArrayBuffer, resultOffset, coresFlat.length);
  resultOffset += 4 * coresFlat.length;
  const outFromView = new Uint32Array(resultsOutArrayBuffer, resultOffset, fromFlat.length);
  resultOffset += 4 * fromFlat.length;
  const outToView = new Uint32Array(resultsOutArrayBuffer, resultOffset, toFlat.length);

  let uniqueFrags = new Array<string>(fragHashCounter + 1);

  Object.entries(fragsMap).forEach(([key, value]) => {
    uniqueFrags[value] = key;
  });

  prediction.set(outPredictionsView);
  for (let i = 0; i < coresFlat.length; i++) {
    cores[i] = uniqueFrags[outCoresView[i]] ?? '';
    from[i] = uniqueFrags[outFromView[i]] ?? '';
    to[i] = uniqueFrags[outToView[i]] ?? '';
  }
  resultOutBuffer.unmap();

  //@ts-ignore // for easier garbage collection
  fragsMap = null; uniqueFrags = null;

  resultOutBuffer.destroy();
  computInfoBuffer.destroy();
  generationsOutBuffer.destroy();
  generationsInBuffer.destroy();
}
