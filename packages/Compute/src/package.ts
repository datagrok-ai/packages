/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {filter} from 'rxjs/operators';
import {OutliersSelectionViewer} from './outliers-selection/outliers-selection-viewer';
export {
  makeValidationResult as makeValidationResult2,
  makeAdvice as makeAdvice2,
  mergeValidationResults as mergeValidationResults2,
} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/utils';
import {ModelCatalogView, ModelHandler, startModelCatalog, makeModelTreeBrowser, renderRestPanel, setModelCatalogEventHandlers, setModelCatalogHandler} from '@datagrok-libraries/compute-utils/model-catalog';

export const _package = new DG.Package();

//name: openModelFromFuncall
//input: funccall funccall
export function openModelFromFuncall(funccall: DG.FuncCall) {
  ModelHandler.openModelFromFunccall(funccall);
}

//name: OutliersSelectionViewer
//description: Creates an outliers selection viewer
//tags: viewer
//output: viewer result
export function OutliersSelection() {
  return new OutliersSelectionViewer();
}

//name: renderRestPanel
//input: func func
//output: widget panel
export async function renderPanel(func: DG.Func): Promise<DG.Widget> {
  return renderRestPanel(func);
}

let startUriLoaded = false;
let initCompleted = false;

const options = {
  _package,
  ViewClass: ModelCatalogView,
  segment: 'Modelhub',
  viewName: 'Model Hub',
  funcName: 'modelCatalog',
  setStartUriLoaded: () => startUriLoaded = true,
  getStartUriLoaded: () => startUriLoaded,
}

//tags: init
export function init() {
  if (initCompleted)
    return;

  setModelCatalogHandler();
  setModelCatalogEventHandlers(options);

  initCompleted = true;
}

//name: Model Hub
//tags: app
//output: view v
//meta.browsePath: Compute
export function modelCatalog() {
  return startModelCatalog(options);
}

//input: dynamic treeNode
//input: view browseView
export async function modelCatalogTreeBrowser(treeNode: DG.TreeViewGroup) {
  await makeModelTreeBrowser(treeNode);
}
