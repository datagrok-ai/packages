import {solveIvp, IVP2WebWorker} from '@datagrok/diff-studio-tools';

onmessage = async function(evt) {
  try {
    const someNum = Math.random();
    console.time(`worker-${someNum}`);
    const ivp = evt.data.ivp as IVP2WebWorker;
    const runsCount = evt.data.runs as number;
    const mins = evt.data.mins as Float64Array;
    const maxs = evt.data.maxs as Float64Array;

    const outputDim = ivp.deqsCount + 1;

    const res = new Array<Float64Array>(outputDim);

    let i = 0;
    let j = 0;

    for (i = 0; i < outputDim; ++i)
      res[i] = new Float64Array(runsCount);

    const inputsCount = mins.length;
    const inputs = new Float64Array(inputsCount);

    for (i = 0; i < runsCount; ++i) {
      for (j = 0; j < inputsCount; ++j)
        inputs[j] = mins[j] + (maxs[j] - mins[j]) * Math.random();

      const solution = solveIvp(ivp, inputs);
      const size = solution[0].length - 1;

      for (j = 0; j < outputDim; ++j)
        res[j][i] = solution[j][size];
    }

    console.timeEnd(`worker-${someNum}`);
    postMessage({'callResult': 0, 'res': res});
  } catch (e) {
    postMessage({'callResult': -1, 'msg': e instanceof Error ? e.message : ':((('});
  }
};
