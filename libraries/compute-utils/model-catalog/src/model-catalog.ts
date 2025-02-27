/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {take} from 'rxjs/operators';
import {ModelCatalogView} from './model-catalog-view';
import {ModelHandler} from './model-handler';

export interface ModelCatalogConfig {
  segment: string,
  viewName: string,
  funcName: string,
  startUriLoaded: boolean,
  _package: DG.Package,
  ViewClass: typeof ModelCatalogView,
  HandlerCass: typeof ModelHandler
}

export function makeModelCatalog(options: ModelCatalogConfig, setStartUrlLoaded: Function) {
  const {
    segment, viewName, funcName, startUriLoaded, _package, ViewClass, HandlerCass,
  } = options;

  // Separately process direct link access
  const startOptionalPart = grok.shell.startUri.indexOf('?');
  const startPathSegments = grok.shell.startUri
    .substring('https://'.length, startOptionalPart > 0 ? startOptionalPart: undefined)
    .split('/');

  if (!startUriLoaded && startPathSegments.includes(segment)) {
    const view = ViewClass.findOrCreateCatalogView(viewName, funcName, _package);

    grok.shell.addView(view);
    setStartUrlLoaded();

    if (startPathSegments.length > 3) {
      grok.dapi.functions.filter(`shortName = "${startPathSegments[3]}" and #model`).list().then((lst) => {
        if (lst.length == 1)
          HandlerCass.openModel(lst[0]);
      });
    }

    return;
  }

  const optionalPart = window.location.href.indexOf('?');
  const pathSegments = window.location.href
    .substring('https://'.length, optionalPart > 0 ? optionalPart: undefined)
    .split('/');

  if (pathSegments.includes('browse')) {
    const view = ModelCatalogView.findModelCatalogView('modelCatalog');

    // If there is existing view, then switch on it
    if (view)
      grok.shell.v = view;


    // Always return new with no subscribtions to show in Browse tree
    const newView = ModelCatalogView.createModelCatalogView('Model Catalog', 'modelCatalog', _package);
    return newView;
  }

  // Separately process double-clicking on Model Catalog card
  if (pathSegments.includes('apps')) {
    const view = ModelCatalogView.findModelCatalogView('modelCatalog');

    // If there is existing view, then switch on it
    if (view)
      grok.shell.v = view;
    else {
      const newView = ModelCatalogView.createModelCatalogView('Model Catalog', 'modelCatalog', _package);
      grok.shell.addView(newView);
    }
  }
}

export async function makeModelTreeBrowser(treeNode: DG.TreeViewGroup, browseView: DG.BrowseView) {
  const NO_CATEGORY = 'Uncategorized' as const;

  const modelSource = grok.dapi.functions.filter('(#model)');
  const modelList = await modelSource.list();
  const departments = modelList.reduce((acc, model) => {
    if (model.options.department)
      acc.add(model.options.department);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  const hlProcesses = modelList.reduce((acc, model) => {
    if (model.options.HL_process)
      acc.add(model.options.HL_process);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  const processes = modelList.reduce((acc, model) => {
    if (model.options.process)
      acc.add(model.options.process);
    else
      acc.add(NO_CATEGORY);
    return acc;
  }, new Set([] as string[]));

  for (const department of departments) {
    const serverDep = (department !== NO_CATEGORY ? department: undefined);
    const hasModelsDep = modelList.find((model) =>
      model.options.department === serverDep,
    );

    if (!hasModelsDep) continue;

    const depNode = treeNode.getOrCreateGroup(department, null, false);
    for (const hlProcess of hlProcesses) {
      const serverHlProcess = (hlProcess !== NO_CATEGORY ? hlProcess: undefined);
      const hasModelsHl = modelList.find((model) =>
        model.options.department === serverDep &&
          model.options.HL_process === serverHlProcess,
      );

      if (!hasModelsHl) continue;

      const hlNode = hlProcess !== NO_CATEGORY ? depNode.getOrCreateGroup(hlProcess, null, false): depNode;
      for (const process of processes) {
        const serverProcess = (process !== NO_CATEGORY ? process: undefined);
        const hasModels = modelList.find((model) =>
          model.options.department === serverDep &&
            model.options.HL_process === serverHlProcess &&
            model.options.process === serverProcess,
        );

        if (!hasModels) continue;

        const processNode = process !== NO_CATEGORY ? hlNode.getOrCreateGroup(process, null, false): hlNode;
        processNode.onNodeExpanding.pipe(take(1)).subscribe(() => {
          const modelRule = `(#model)`;
          const depRules = department === NO_CATEGORY ? `(options.department = null)`: `(options.department in ("${department}"))`;
          const hlProcessRules = hlProcess === NO_CATEGORY ? `(options.HL_process = null)`: `(options.HL_process in ("${hlProcess}"))`;
          const processRules = process === NO_CATEGORY ? `(options.process = null)`: `(options.process in ("${process}"))`;
          const filteringRules = `(${[modelRule, depRules, hlProcessRules, processRules].join(' and ')})`;
          processNode.loadSources(grok.dapi.functions.filter(filteringRules));
        });
      }
    }
  }
}
