// Worker for softmax training

onmessage = async function(evt) {
  const X = evt.data.features;
  const transposedX = evt.data.transposed;
  const Y = evt.data.oneHot;
  const classesWeights = evt.data.classesWeights;
  const iterations = evt.data.iterations;
  const rate = evt.data.rate;
  const penalty = evt.data.penalty;
  const tolerance = evt.data.tolerance;
  const targetRaw = evt.data.targetRaw;
  let loss = 0;
  let lossPrev = 0;

  const n = transposedX.length;
  const m = X.length;
  const c = classesWeights.length;

  // 1. Init params
  // Xavier initialization scale value
  const xavierScale = 2 * Math.sqrt(6.0 / (c + n));
  const params = new Array<Float32Array>(c);
  for (let i = 0; i < c; ++i) {
    const current = new Float32Array(n + 1);

    // initialize bias, b
    current[n] = 0;

    //Xavier initialization of weights, w
    for (let j = 0; j < n; ++j)
      current[j] = (Math.random() - 0.5) * xavierScale;

    params[i] = current;
  }

  // 2. Fitting

  // Routine
  let xBuf: Float32Array;
  let wBuf: Float32Array;
  let zBuf: Float32Array;
  let sum: number;
  let sumExp: number;
  let yTrue: Uint8Array;
  let yPred: Float32Array;
  let dWbuf: Float32Array;
  const Z = new Array<Float32Array>(m);
  for (let i = 0; i < m; ++i)
    Z[i] = new Float32Array(c);
  const dZ = new Array<Float32Array>(c);
  for (let i = 0; i < c; ++i)
    dZ[i] = new Float32Array(m);
  const dW = new Array<Float32Array>(c);
  for (let i = 0; i < c; ++i)
    dW[i] = new Float32Array(n + 1);

  // Fitting
  for (let iter = 0; iter < iterations; ++iter) {
    // 2.1) Forward propagation
    for (let j = 0; j < m; ++j) {
      xBuf = X[j];
      zBuf = Z[j];
      sum = 0;
      sumExp = 0;

      for (let i = 0; i < c; ++i) {
        wBuf = params[i];
        sum = wBuf[n];

        for (let k = 0; k < n; ++k)
          sum += wBuf[k] * xBuf[k];

        zBuf[i] = Math.exp(sum) * classesWeights[i];
        sumExp += zBuf[i];
      }

      for (let i = 0; i < c; ++i)
        zBuf[i] /= sumExp;
    }

    // 2.2) Loss
    loss = 0;

    for (let i = 0; i < m; ++i)
      loss += -Math.log(Z[i][targetRaw[i]]);

    loss /= m;

    if (Math.abs(loss - lossPrev) < tolerance)
      break;

    lossPrev = loss;

    // 2.3) Backward propagation

    // 2.3.1) dZ
    for (let j = 0; j < m; ++j) {
      yPred = Z[j];
      yTrue = Y[j];

      for (let i = 0; i < c; ++i)
        dZ[i][j] = yPred[i] - yTrue[i];
    }

    // 2.3.2) dB
    for (let i = 0; i < c; ++i) {
      sum = 0;
      zBuf = dZ[i];

      for (let j = 0; j < m; ++j)
        sum += zBuf[j];

      dW[i][n] = sum / m;
    }

    // 2.3.3) dW
    for (let i = 0; i < c; ++i) {
      zBuf = dZ[i];
      wBuf = dW[i];

      for (let j = 0; j < n; ++j) {
        xBuf = transposedX[j];

        sum = 0;
        for (let k = 0; k < m; ++k)
          sum += zBuf[k] * xBuf[k];

        wBuf[j] = sum / m;
      }
    }

    // 2.4) Update weights
    for (let i = 0; i < c; ++i) {
      wBuf = params[i];
      dWbuf = dW[i];

      for (let j = 0; j < n; ++j)
        wBuf[j] = (1 - rate * penalty / m) * wBuf[j] - rate * dWbuf[j];

      wBuf[n] -= rate * dWbuf[n];
    }
  } // for iter

  postMessage({'params': params, 'loss': loss});
};
