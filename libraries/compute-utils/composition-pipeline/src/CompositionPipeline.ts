import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {filter, take} from 'rxjs/operators';
import {PipelineConfiguration, PipelineCompositionConfiguration, ItemName, ItemPath, PipelineStepConfiguration, PipelinePopupConfiguration, PipelineActionConfiguraion, StateItemConfiguration, PipelineLinkConfiguration, PipelineHooks, RuntimeController, ExportConfig, NqName, NestedPipelineConfig, StateType} from './PipelineConfiguration';
import {keyToPath, pathToKey, PathKey, pathJoin, CompositionGraphConfig, PipelineConfigVariants, cloneConfig, getParentKey, traverseConfigPipelines, isCompositionConfig} from './config-processing-utils';
import {NodeConf, NodeConfTypes, SubNodeConf, SubNodeConfTypes} from './runtime/NodeConf';
import {NodeState} from './runtime/NodeState';
import {LinkState} from './runtime/LinkState';
import {PipelineRuntime} from './runtime/PipelineRuntime';
import {PipelineGlobalState} from './runtime/PipelineGlobalState';
import {HookSpec, CompositionPipelineView, StepSpec} from './view/CompositionPipelineView';
import {RFVPopup} from './view/RFVPopup';
import {RichFunctionView} from '../../function-views';


type ItemsToMerge = {
  step?: PipelineStepConfiguration[];
  popup?: PipelinePopupConfiguration[];
  action?: PipelineActionConfiguraion[];
};

export class CompositionPipeline {
  private id?: ItemName;
  private nqName?: NqName;
  private exportConfig?: ExportConfig;

  private pipelineState = new PipelineGlobalState();

  private config?: CompositionGraphConfig;
  private ioInfo = new Map<NqName, StateItemConfiguration[]>();
  private nodes = new Map<PathKey, NodeState>();
  private links = new Map<PathKey, LinkState>();
  private nestedPipelineConfig = new Map<string, NestedPipelineConfig>();
  private hooks: HookSpec[] = [];
  private steps: { id: string, funcName: string, friendlyName?: string, helpUrl?: string | HTMLElement }[] = [];
  private rt?: PipelineRuntime;

  private viewInst?: CompositionPipelineView;
  private isInit = false;

  static compose(
    compositionConfig: PipelineCompositionConfiguration,
    nestedConfigs: PipelineConfigVariants[],
  ): CompositionGraphConfig {
    const nestedPipelines: {
      [key: PathKey]: PipelineConfigVariants;
    } = {};
    for (const conf of nestedConfigs) {
      const {id} = conf;
      nestedPipelines[id] = cloneConfig(conf);
    }
    return {...compositionConfig, nestedPipelines};
  }

  constructor(conf?: PipelineConfigVariants) {
    if (conf)
      this.setConfig(conf);
  }

  public setConfig(conf: PipelineConfigVariants) {
    if (this.config)
      throw new Error('Pipeline already has config');
    this.config = cloneConfig(conf);
    this.id = this.config.id;
    if (this.nqName && this.nqName !== this.config.nqName)
      throw new Error(`Config different wrapper nqName ${this.config.nqName}, already set to ${this.nqName}`);
    this.nqName = this.config.nqName;
    this.exportConfig = this.config.exportConfig;
  }

  public makePipelineView(nqName = this.nqName) {
    if (this.viewInst)
      throw new Error(`View has been already created for pipeline ${nqName}`);

    if (!nqName)
      throw new Error('No nqName for pipeline');

    if (this.nqName && this.nqName !== nqName)
      throw new Error(`View different wrapper nqName ${nqName}, already set to ${this.nqName}`);

    this.viewInst = new CompositionPipelineView(nqName);
    this.nqName = nqName;
    return this.viewInst;
  }

  public async init() {
    if (this.isInit)
      throw new Error(`Double init for pipeline ${this.nqName} ${this.id}`);

    this.isInit = true;
    if (!this.viewInst)
      throw new Error(`No view for pipeline ${this.nqName} ${this.id}`);

    await this.loadFuncCallsIO();
    this.addScriptStatesToConfig();
    this.processConfig();
    this.addSystemHooks();
    this.rt = new PipelineRuntime(this.nodes, this.links, this.viewInst, this.pipelineState);
    this.viewInst.injectConfiguration(this.steps, this.hooks, this.rt, this.exportConfig);
    this.isInit = true;
    await this.viewInst.init();
  }

  private async loadFuncCallsIO() {
    const names = await this.gatherIONqNames();
    for (const name of names) {
      const spec = await this.getFuncIOSpec(name);
      this.ioInfo.set(name, spec);
    }
  }

  private addSystemHooks() {
    const stepIdsToBtnNodes = new Map<PathKey, NodeState[]>();
    const additionalViewNames = new Map<PathKey, NqName>();
    const additionalViews = this.viewInst!.customViews;
    const menuItems = new Map<string, NodeState>();

    for (const node of this.nodes.values()) {
      if (node.type === 'popup' || node.type === 'action') {
        if (node.type === 'popup') {
          const conf = node.conf as PipelinePopupConfiguration;
          additionalViewNames.set(conf.id, conf.nqName);
        }

        const conf = node.conf as (PipelineActionConfiguraion | PipelinePopupConfiguration);

        if (conf.position === 'none')
          continue;

        const parentPathKey = getParentKey(node.conf.id);

        if (conf.position === 'buttons') {
          const nodes = stepIdsToBtnNodes.get(parentPathKey) ?? [];
          nodes.push(node);
          stepIdsToBtnNodes.set(parentPathKey, nodes);
        }
        if (conf.position === 'menu') {
          const nestedConfig = this.nestedPipelineConfig.get(pathToKey(node.pipelinePath))!;
          const prefix = nestedConfig?.friendlyPrefix ?? '';
          const name = conf.friendlyName;
          const fullName = prefix ? `${prefix}: ${name}` : name;
          menuItems.set(fullName, node);
        }
      }
    }

    const beforeInit = [{
      id: '_SystemViewsAdd_',
      handler: async () => {
        for (const [k, nqName] of additionalViewNames.entries()) {
          const view = new RFVPopup(nqName, {historyEnabled: false, isTabbed: true});
          await view.isReady.pipe(filter((x) => x), take(1)).toPromise();
          (view.root).style.width = '100%';
          (view.root).style.height = '100%';
          (view.root).style.overflow = 'hidden';
          additionalViews.set(k, view);
        }
      },
    }];

    const onViewReady = [
      {
        id: '_SystemButtonsAdd_',
        handler: async ({controller}: { controller: RuntimeController }) => {
          for (const [viewKey, nodes] of stepIdsToBtnNodes.entries()) {
            const btns = nodes.map((node) => {
              const conf = node.conf as (PipelineActionConfiguraion | PipelinePopupConfiguration);
              const action = this.rt!.getAction(keyToPath(conf.id));
              return ui.button(action.actionName, action.action);
            });
            const view = controller.getView(keyToPath(viewKey))! as RichFunctionView;
            view.setAdditionalButtons(btns);
          }
        },
      },
      {
        id: '_SystemMenuAdd_',
        handler: async () => {
          for (const [name, node] of menuItems) {
            const conf = node.conf as (PipelineActionConfiguraion | PipelinePopupConfiguration);
            const action = this.rt!.getAction(keyToPath(conf.id));
            this.viewInst!.addMenuItem(name, action.action as () => void);
          }
        },
      },
    ];

    const hooks = {
      beforeInit,
      onViewReady,
    };
    this.hooks.unshift({
      pipelinePath: [],
      hooks,
    });
  }

  private processConfig() {
    if (!this.config)
      throw new Error('No pipeline config');

    // process merge config
    const {toRemove, toAdd, nestedPipelineConfig} = traverseConfigPipelines(
      this.config,
      (acc, node, path) => {
        if (isCompositionConfig(node))
          this.processMergeConfig(node, path, acc.toRemove, acc.toAdd, acc.nestedPipelineConfig);
        return acc;
      },
      {
        toRemove: new Set<string>(),
        toAdd: new Map<string, ItemsToMerge>(),
        nestedPipelineConfig: new Map<string, NestedPipelineConfig>(),
      },
    );
    this.nestedPipelineConfig = nestedPipelineConfig;

    // process hoooks
    this.hooks = traverseConfigPipelines(
      this.config,
      (acc, node, path) => {
        const hooks = this.getPipelineHooks(node, toRemove, path);
        acc.unshift({hooks, pipelinePath: pathJoin(path, [node.id])});
        return acc;
      },
      [] as HookSpec[],
    );

    // process node items
    traverseConfigPipelines(
      this.config,
      (acc, node, path) => {
        this.processPipelineConfig(node, path, toRemove, toAdd);
        return acc;
      },
      undefined,
    );

    // get steps sequence
    const {pipelineSteps, pipelineSeq} = traverseConfigPipelines(
      this.config,
      (acc, node) => {
        const id = node.id;
        const specs = node.steps.map((s) => ({id: s.id, funcName: s.nqName, friendlyName: s.friendlyName, helpUrl: s.helpUrl}));
        acc.pipelineSteps.set(id, specs);
        acc.pipelineSeq.unshift(id);
        return acc;
      },
      {
        pipelineSteps: new Map<ItemName, StepSpec[]>(),
        pipelineSeq: [] as ItemName[],
      },
    );

    this.steps = pipelineSeq.reduce((acc, id) => {
      const steps = pipelineSteps.get(id)!;
      const pos = nestedPipelineConfig.get(id)?.insertBeforeStep;
      const prefix = nestedPipelineConfig.get(id)?.friendlyPrefix;
      if (pos) {
        const idx = acc.findIndex((spec) => spec.id === pos);
        if (idx > 0) {
          const stepsConfig = prefix ?
            steps.map((step) => ({...step, friendlyName: `${prefix}: ${step.friendlyName}`})) :
            steps;
          acc.splice(idx, 0, ...stepsConfig);
        }

        return acc;
      } else
        return [...acc, ...steps ?? []];
    }, [] as StepSpec[]);
  }

  // deal with hooks

  private getPipelineHooks(node: PipelineConfiguration, toRemove: Set<string>, path: ItemPath) {
    node.hooks = node.hooks ?? {};
    for (const [type, hooks] of Object.entries(node.hooks ?? {})) {
      const filteredHooks = [];
      for (const hook of hooks ?? []) {
        const hookPath = this.updateFullPathLink(hook, pathJoin(path, [node.id]));
        const id = pathToKey(hookPath);
        if (toRemove.has(id))
          continue;

        filteredHooks.push(hook);
      }
      node.hooks[type as keyof PipelineHooks] = filteredHooks;
    }
    return node.hooks;
  }

  // pipeline config processing

  private processPipelineConfig(pipelineConf: PipelineConfiguration, pipelinePath: ItemPath, toRemove: Set<string>, toAdd: Map<string, ItemsToMerge>) {
    const subPath = this.proccessPipelineNodeConfig(pipelineConf, pipelinePath);
    const steps: PipelineStepConfiguration[] = [];
    for (const conf of pipelineConf.steps) {
      const stepConf = this.processNodeConfig<PipelineStepConfiguration>(conf, subPath, subPath, new Set(), 'step');
      if (!stepConf)
        continue;
      const sKey = stepConf.id;
      const popups: PipelinePopupConfiguration[] = [];
      for (const popupConf of this.getAllItems(stepConf.popups ?? [], sKey, toAdd, 'popup')) {
        const pPopupConf = this.processNodeConfig(popupConf, keyToPath(sKey), subPath, toRemove, 'popup');
        if (!pPopupConf)
          continue;

        const actions: PipelineActionConfiguraion[] = [];
        for (const actionConf of this.getAllItems(popupConf.actions ?? [], pPopupConf.id, toAdd, 'action')) {
          const pActionConf = this.processActionNodeConfig(actionConf, keyToPath(pPopupConf.id), subPath, toRemove);
          if (!pActionConf)
            continue;

          actions.push(pActionConf);
        }
        popupConf.actions = actions;
        popups.push(popupConf);
      }
      const actions: PipelineActionConfiguraion[] = [];
      for (const actionConf of this.getAllItems(stepConf.actions ?? [], sKey, toAdd, 'action')) {
        const pActionConf = this.processActionNodeConfig(actionConf, keyToPath(sKey), subPath, toRemove);
        if (!pActionConf)
          continue;

        actions.push(pActionConf);
      }
      stepConf.popups = popups;
      stepConf.actions = actions;
      steps.push(stepConf);
    }
    const links: PipelineLinkConfiguration[] = [];
    for (const link of pipelineConf.links ?? []) {
      const plink = this.processLinkConfig(link, subPath, toRemove);
      if (!plink)
        continue;

      links.push(plink);
    }
    const actions: PipelineActionConfiguraion[] = [];
    for (const actionConf of this.getAllItems(pipelineConf.actions ?? [], pipelineConf.id, toAdd, 'action')) {
      const pActionConf = this.processActionNodeConfig(actionConf, subPath, subPath, toRemove);
      if (!pActionConf)
        continue;

      actions.push(pActionConf);
    }

    pipelineConf.steps = steps;
    pipelineConf.links = links;
    pipelineConf.actions = actions;
  }

  private getAllItems<T extends SubNodeConf>(data: T[], prefix: string, toAdd: Map<string, ItemsToMerge>, type: SubNodeConfTypes) {
    const moreItems = toAdd.get(prefix)?.[type] ?? [];
    return [...data, ...moreItems] as T[];
  }

  private proccessPipelineNodeConfig(conf: PipelineConfiguration, pipelinePath: ItemPath) {
    const nodePath = this.updateFullPathNode(conf, pipelinePath);
    const nodeKey = pathToKey(nodePath);

    this.nodes.set(nodeKey, new NodeState(conf, 'pipeline', pipelinePath, this.pipelineState));
    return nodePath;
  }

  private processActionNodeConfig(conf: PipelineActionConfiguraion, path: ItemPath, pipelinePath: ItemPath, toRemove: Set<string>) {
    this.updateFullPathLink(conf, pipelinePath, false);
    const nodePath = this.updateFullPathNode(conf, path);
    const nodeKey = pathToKey(nodePath);
    if (toRemove.has(nodeKey))
      return;

    this.nodes.set(nodeKey, new NodeState(conf, 'action', pipelinePath, this.pipelineState));
    return conf;
  }

  private processNodeConfig<T extends NodeConf>(conf: T, path: ItemPath, pipelinePath: ItemPath, toRemove: Set<string>, type: NodeConfTypes) {
    const nodePath = this.updateFullPathNode(conf, path);
    const nodeKey = pathToKey(nodePath);

    if (toRemove.has(nodeKey))
      return;

    this.nodes.set(nodeKey, new NodeState(conf, type, pipelinePath, this.pipelineState));
    return conf;
  }

  private processLinkConfig(conf: PipelineLinkConfiguration, pipelinePath: ItemPath, toRemove: Set<string>) {
    const linkPath = this.updateFullPathLink(conf, pipelinePath);
    const linkKey = pathToKey(linkPath);
    if (toRemove.has(linkKey))
      return;

    this.links.set(linkKey, new LinkState(conf, pipelinePath, this.pipelineState));
    return conf;
  }

  private updateFullPathLink(target: { id: string, from?: ItemPath | ItemPath[], to?: ItemPath | ItemPath[] }, currentPath: ItemPath, updateId = true) {
    if (target.from) {
      if (Array.isArray(target.from[0]))
        target.from = target.from.map((path) => [...currentPath, ...path]);
      else
        target.from = [...currentPath, ...(target.from as ItemPath)];
    }

    if (target.to) {
      if (Array.isArray(target.to[0]))
        target.to = target.to.map((path) => [...currentPath, ...path]);
      else
        target.to = [...currentPath, ...(target.to as ItemPath)];
    }

    if (updateId)
      return this.updateFullPathNode(target, currentPath);

    return [target.id];
  }

  private updateFullPathNode(target: { id: string }, path: ItemPath) {
    const nPath = pathJoin(path, [target.id]);
    target.id = pathToKey(nPath);
    return nPath;
  }

  // merge config processing

  private processMergeConfig(mergeConf: PipelineCompositionConfiguration,
    path: ItemPath, toRemove: Set<string>, toAdd: Map<string, ItemsToMerge>, nestedPipelineConfig: Map<string, NestedPipelineConfig>,
  ) {
    const subPath = pathJoin(path, [mergeConf.id]);
    for (const item of mergeConf.itemsToRemove ?? []) {
      const itemPath = pathJoin(subPath, item);
      const itemKey = pathToKey(itemPath);
      toRemove.add(itemKey);
    }
    delete mergeConf.itemsToRemove;
    for (const [pipelineId, conf] of Object.entries(mergeConf.nestedPipelinesConfig ?? {})) {
      const pipelineIdFull = pathToKey(pathJoin(subPath, [pipelineId]));
      if (conf.insertBeforeStep) {
        const insertBeforeStep = pathToKey(pathJoin(subPath, [conf.insertBeforeStep]));
        nestedPipelineConfig.set(pipelineIdFull, {...conf, insertBeforeStep});
      } else
        nestedPipelineConfig.set(pipelineIdFull, {...conf});
    }
    delete mergeConf.nestedPipelinesConfig;
    const {popupsToAdd, actionsToAdd} = mergeConf;
    this.processMergeNodeList(popupsToAdd ?? [], subPath, toAdd, 'popup');
    this.processMergeNodeList(actionsToAdd ?? [], subPath, toAdd, 'action');
    delete mergeConf.popupsToAdd;
    delete mergeConf.actionsToAdd;
  }

  private processMergeNodeList(itemsToAdd: [SubNodeConf, ItemPath?][], pipelinePath: ItemPath,
    toAdd: Map<string, ItemsToMerge>, type: SubNodeConfTypes,
  ) {
    for (const [item, path] of itemsToAdd) {
      const itemPath = pathJoin(pipelinePath, path ?? []);
      const tagetKey = pathToKey(itemPath);
      const addConf = toAdd.get(tagetKey) ?? {};
      const addArray = addConf[type] ?? [];
      addArray.unshift(item as any);
      addConf[type] = addArray as any;
      toAdd.set(tagetKey, addConf);
    }
  }

  // funcall states

  private addScriptStatesToConfig() {
    if (!this.config)
      throw new Error('No pipeline config');

    traverseConfigPipelines(
      this.config,
      (acc, node) => {
        for (const conf of node.steps) {
          this.addNodeIOInfo(conf);
          for (const pconf of conf.popups ?? [])
            this.addNodeIOInfo(pconf);
        }
        if (isCompositionConfig(node)) {
          for (const [conf] of node.popupsToAdd ?? [])
            this.addNodeIOInfo(conf);
        }
        return acc;
      },
      undefined,
    );
  }

  private addNodeIOInfo(conf: PipelineStepConfiguration | PipelinePopupConfiguration) {
    const info = cloneConfig(this.ioInfo.get(conf.nqName)) ?? [];
    if (!conf.states)
      conf.states = info;
    else
      conf.states.push(...info);
  }

  private async getFuncIOSpec(nqName: NqName): Promise<StateItemConfiguration[]> {
    const func: DG.Func = await grok.functions.eval(nqName);
    const inputs = func.inputs.map((input) => ({id: input.name, type: input.propertyType as any, stateType: 'input' as StateType}));
    const outputs = func.outputs.map((output) => ({id: output.name, type: output.propertyType as any, stateType: 'output' as StateType}));
    const io = [...inputs, ...outputs];
    return io;
  }

  private async gatherIONqNames() {
    if (!this.config)
      throw new Error('No pipeline config');

    const names = new Set<string>();
    traverseConfigPipelines(
      this.config,
      (acc, node) => {
        for (const conf of node.steps) {
          names.add(conf.nqName);
          for (const pconf of conf.popups ?? [])
            names.add(pconf.nqName);
        }
        if (isCompositionConfig(node)) {
          for (const [conf] of node.popupsToAdd ?? [])
            names.add(conf.nqName);
        }
        return acc;
      },
      names,
    );
    return names;
  }
}
