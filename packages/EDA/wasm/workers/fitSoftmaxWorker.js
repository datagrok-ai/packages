// The following code is generated automatically.

import {exportEDA} from '../../wasm/EDAForWebWorker';
import {cppWrapper} from '../../wasm/callWasmForWebWorker.js';

onmessage = async function (evt) {
  exportEDA().then(module => 
    {
      let args = evt.data;
      let result = cppWrapper(module, args, 'fitSoftmax', 'number');
      postMessage({'callResult': result, 'args': args});
    } )
}