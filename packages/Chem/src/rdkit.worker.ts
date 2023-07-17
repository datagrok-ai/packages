import {WORKER_CALL} from './rdkit-service/rdkit-service-worker-api';
import {RdKitServiceWorker as ServiceWorkerClass} from './rdkit-service/rdkit-service-worker';
// @ts-ignore
import initRDKitModule from './RDKit_minimal.js';
//@ts-ignore
import rdKitLibVersion from './rdkit_lib_version';
import {RDModule} from '@datagrok-libraries/chem-meta/src/rdkit-api';

const ctx: Worker = self as any;
let _rdKitModule: RDModule;
let _rdKitServiceWorker: ServiceWorkerClass | null = null;

ctx.addEventListener('message', async (e: any) => {
  const {op, args} = e.data;
  const port = e.ports[0];
  let result;
  try {
    if (op === 'module::init') {
      const webRoot = args[0];
      _rdKitModule = await initRDKitModule({locateFile: () => `${webRoot}/dist/${rdKitLibVersion}.wasm`});
      _rdKitModule.use_legacy_stereo_perception(false);
      console.log('RDKit (worker) initialized');
      _rdKitServiceWorker = new ServiceWorkerClass(_rdKitModule, webRoot);
    } else if (op === WORKER_CALL.INIT_MOLECULES_STRUCTURES) {
      result = _rdKitServiceWorker!.initMoleculesStructures(args[0], args[1]);
    } else if (op === WORKER_CALL.SEARCH_SUBSTRUCTURE) {
      result = await _rdKitServiceWorker!.searchSubstructure(args[0], args[1], args[2], args[3]);
    } else if (op === WORKER_CALL.FREE_MOLECULES_STRUCTURES) {
      _rdKitServiceWorker!.freeMoleculesStructures();
      _rdKitServiceWorker = null;
    } else if (op === WORKER_CALL.GET_FINGERPRINTS) {
      result = _rdKitServiceWorker!.getFingerprints(args[0], args[1], args[2]);
    } else if (op === WORKER_CALL.CONVERT_MOL_NOTATION) {
      result = _rdKitServiceWorker!.convertMolNotation(args[0]);
    } else if (op === WORKER_CALL.GET_STRUCTURAL_ALERTS) {
      result = _rdKitServiceWorker!.getStructuralAlerts(args[0], args[1]);
    } else if (op === WORKER_CALL.POST_TERMINATION_FLAG) {
      result = _rdKitServiceWorker!.postTerminationFlag(args[0]);
    }
    port.postMessage({op: op, retval: result});
  } catch (e) {
    port.postMessage({error: e});
  }
});
