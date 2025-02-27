import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Observable, defer, of, merge, Subject, BehaviorSubject, from, combineLatest} from 'rxjs';
import {finalize, map, mapTo, toArray, concatMap, tap, takeUntil, debounceTime, scan} from 'rxjs/operators';
import {NodePath, BaseTree, TreeNode} from '../data/BaseTree';
import {PipelineConfigurationProcessed} from '../config/config-processing-utils';
import {isFuncCallSerializedState, PipelineInstanceConfig, PipelineSerializedState, PipelineState} from '../config/PipelineInstance';
import {buildTraverseD} from '../data/graph-traverse-utils';
import {buildRefMap, ConfigTraverseItem, getConfigByInstancePath, isPipelineParallelConfig, isPipelineSelfRef, isPipelineSequentialConfig, isPipelineStaticConfig, isPipelineStepConfig, PipelineStepConfigurationProcessed} from '../config/config-utils';
import {FuncCallAdapter, FuncCallMockAdapter} from './FuncCallAdapters';
import {loadFuncCall, loadInstanceState, makeFuncCall, saveFuncCall, saveInstanceState} from './funccall-utils';
import {ConsistencyInfo, FuncCallNode, FuncCallStateInfo, isFuncCallNode, ParallelPipelineNode, PipelineNodeBase, SequentialPipelineNode, StateTreeNode, StateTreeSerializationOptions, StaticPipelineNode} from './StateTreeNodes';
import {indexFromEnd} from '../utils';
import {LinksState} from './LinksState';
import {ValidationResult} from '../data/common-types';
import {DriverLogger, TreeUpdateMutationPayload} from '../data/Logger';
import {ItemMetadata} from '../view/ViewCommunication';

const MAX_CONCURENT_SAVES = 5;

export class StateTree {
  private closed$ = new Subject<true>();

  public nodeTree: BaseTree<StateTreeNode>;
  public nodesMap: Map<string, StateTreeNode> = new Map();
  public linksState: LinksState;

  public makeStateRequests$ = new Subject<true>();
  public globalROLocked$ = new BehaviorSubject(false);
  public treeMutationsLocked$ = new BehaviorSubject(false);

  constructor(
    item: StateTreeNode,
    public config: PipelineConfigurationProcessed,
    private mockMode = false,
    private defaultValidators = false,
    private logger?: DriverLogger,
  ) {
    this.nodeTree = new BaseTree(item);
    this.linksState = new LinksState(defaultValidators, this.logger);

    this.linksState.runningLinks$.pipe(
      map((links) => !!links?.length),
      takeUntil(this.closed$),
    ).subscribe(this.treeMutationsLocked$);
  }

  //
  // tree state getting
  //

  public toSerializedState(options: StateTreeSerializationOptions = {}): PipelineSerializedState {
    return StateTree.toSerializedStateRec(this.nodeTree.root, options);
  }

  public toState(options: StateTreeSerializationOptions = {}): PipelineState {
    return StateTree.toStateRec(this.nodeTree.root, options, this.linksState);
  }

  public static toStateRec(
    node: TreeNode<StateTreeNode>,
    options: StateTreeSerializationOptions = {},
    linksState?: LinksState,
  ): PipelineState {
    const item = node.getItem();
    const actions = linksState ? linksState.getNodeActionsData(item.uuid) : undefined;
    if (isFuncCallNode(item))
      return item.toState(options, actions);
    const state = item.toState(options, actions);
    const steps = node.getChildren().map((node) => {
      const item = this.toStateRec(node.item, options, linksState);
      return item;
    });
    return {...state, steps};
  }

  public static toSerializedStateRec(
    node: TreeNode<StateTreeNode>,
    options: StateTreeSerializationOptions = {},
  ): PipelineSerializedState {
    const item = node.getItem();
    if (isFuncCallNode(item))
      return item.toSerializedState(options);
    const state = item.toSerializedState(options);
    const steps = node.getChildren().map((node) => {
      const item = this.toSerializedStateRec(node.item, options);
      return item;
    });
    return {...state, steps};
  }

  //
  // additional states getting
  //

  public getValidations() {
    const entries = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        return [...acc, [item.uuid, item.validationInfo$] as const];

      return acc;
    }, [] as (readonly [string, BehaviorSubject<Record<string, ValidationResult>>])[]);
    return Object.fromEntries(entries);
  }

  public getConsistency() {
    const entries = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        return [...acc, [item.uuid, item.consistencyInfo$] as const];

      return acc;
    }, [] as (readonly [string, BehaviorSubject<Record<string, ConsistencyInfo>>])[]);
    return Object.fromEntries(entries);
  }

  public getMeta() {
    const entries = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        return [...acc, [item.uuid, item.metaInfo$] as const];
      return acc;
    }, [] as (readonly [string, BehaviorSubject<Record<string, BehaviorSubject<any | undefined>>>])[]);
    return Object.fromEntries(entries);
  }

  public getFuncCallStates() {
    const entries = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        return [...acc, [item.uuid, item.funcCallState$] as const];
      return acc;
    }, [] as (readonly [string, BehaviorSubject<FuncCallStateInfo | undefined>])[]);
    return Object.fromEntries(entries);
  }

  public getNodesDescriptions() {
    const entries = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      const stateNames = item.nodeDescription.getStateNames();
      const stateChanges = stateNames.map((name) => item.nodeDescription.getStateChanges(name).pipe(
        map((val) => [name, val] as const),
      ));
      const descriptions$ = merge(...stateChanges).pipe(
        scan((acc, [name, val]) => {
          if (name === 'tags') {
            const tags = Object.values(val ?? {}).flat().filter((x) => x) as string[];
            return {...acc, [name]: tags};
          }
          return {...acc, [name]: val};
        }, {} as Record<string, string[] | string>),
        debounceTime(0),
      );
      return [...acc, [item.uuid, descriptions$] as const];
    }, [] as (readonly [string, Observable<Record<string, string | string[]> | undefined>])[]);
    return Object.fromEntries(entries);
  }

  public getIOMutations() {
    const allFlags = this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        return [...acc, item.instancesWrapper.getIOEditsFlag()];
      return acc;
    }, [] as Observable<boolean>[]);
    return merge(...allFlags);
  }

  //
  // events handling
  //

  public init() {
    return this.mutateTree(() => {
      return StateTree.loadOrCreateCalls(this, this.mockMode).pipe(mapTo([]));
    }, false).pipe(mapTo(this));
  }

  // for testing only
  public runMutateTree() {
    return this.mutateTree(() => of([{mutationRootPath: []}] as const));
  }

  public save(uuid?: string, metaData?: ItemMetadata) {
    return this.mutateTree(() => {
      const [root, nqName] = StateTree.findPipelineNode(this, uuid);
      if (this.mockMode)
        throw new Error(`Cannot save mock tree`);
      if (nqName == null)
        throw new Error(`Attempting to save pipeline with no nqName`);
      const rootItem = root.getItem() as PipelineNodeBase;
      if (rootItem.config.provider == null)
        throw new Error(`Attempting to save pipeline with no nqName provider`);
      const pendingFuncCallSaves = this.nodeTree.traverse(root, (acc, node) => {
        const item = node.getItem();
        if (isFuncCallNode(item)) {
          const obs$ = defer(() => saveFuncCall(item.instancesWrapper)).pipe(
            map((nextCall) => {
              const nadapter = new FuncCallAdapter(nextCall, item.isReadonly);
              item.changeAdapter(nadapter);
            }),
          );
          return [...acc, obs$];
        }
        return acc;
      }, [] as Array<Observable<void>>);
      return merge(...pendingFuncCallSaves, MAX_CONCURENT_SAVES).pipe(
        toArray(),
        concatMap(() => this.saveMetaCall(root, nqName, metaData)),
        map((call) => [undefined, call]),
      );
    });
  }

  public moveSubtree(uuid: string, newIdx: number) {
    return this.mutateTree(() => {
      const data = this.nodeTree.find((item) => item.uuid === uuid);
      if (data == null)
        throw new Error(`Node uuid ${uuid} not found`);
      const [node, path] = data;
      this.nodeTree.removeBrunch(path);
      const [ppath, oldIdx] = this.getMutationSlice(path);
      this.nodeTree.attachBrunch(ppath, node, node.getItem().config.id, newIdx);
      const mutationData: TreeUpdateMutationPayload = {
        mutationRootPath: ppath,
        addIdx: newIdx,
        removeIdx: oldIdx,
      };
      return of([mutationData]);
    });
  }

  public removeSubtree(uuid: string) {
    return this.mutateTree(() => {
      const data = this.nodeTree.find((item) => item.uuid === uuid);
      if (data == null)
        throw new Error(`Node uuid ${uuid} not found`);
      const [, path] = data;
      this.nodeTree.removeBrunch(path);
      const [mutationRootPath, removeIdx] = this.getMutationSlice(path);
      const mutationData: TreeUpdateMutationPayload = {
        mutationRootPath,
        removeIdx,
      };
      return of([mutationData]);
    });
  }

  public addSubTree(puuid: string, id: string, pos: number) {
    return this.mutateTree(() => {
      const [_root, _nqName, ppath] = StateTree.findPipelineNode(this, puuid);
      const subConfig = StateTree.getSubConfig(this.config, ppath, id);
      if (isPipelineStepConfig(subConfig)) {
        const fcNode = new FuncCallNode(subConfig, false);
        fcNode.initState(subConfig);
        this.nodeTree.attachBrunch(ppath, new TreeNode(fcNode), id, pos);
      } else {
        StateTree.fromPipelineConfig({
          config: this.config,
          startNode: subConfig,
          startPath: [...ppath, {id, idx: pos}],
          startState: this,
          isReadonly: false,
          defaultValidators: this.defaultValidators,
          mockMode: this.mockMode,
        });
      }
      const mutationData: TreeUpdateMutationPayload = {
        mutationRootPath: ppath,
        addIdx: pos,
      };
      return StateTree.loadOrCreateCalls(this, this.mockMode).pipe(mapTo([mutationData]));
    });
  }

  public loadSubTree(puuid: string, dbId: string, id: string, pos: number, isReadonly: boolean, isReplace = false) {
    return this.mutateTree(() => {
      const [_root, _nqName, ppath] = StateTree.findPipelineNode(this, puuid);
      const subConfig = StateTree.getSubConfig(this.config, ppath, id);
      if (isPipelineStepConfig(subConfig))
        throw new Error(`FuncCall node ${JSON.stringify(ppath)}, but pipeline is expected`);
      const tree = StateTree.load(
        {
          dbId,
          config: subConfig,
          mockMode: this.mockMode,
          defaultValidators: this.defaultValidators,
          isReadonly,
        },
      ).pipe(
        concatMap((tree) => StateTree.loadOrCreateCalls(tree, this.mockMode)),
      ).pipe(
        map((tree) => isReplace ?
          this.nodeTree.replaceBrunch(ppath, tree.nodeTree.root, id, pos) :
          this.nodeTree.attachBrunch(ppath, tree.nodeTree.root, id, pos),
        ),
      );
      const mutationData: TreeUpdateMutationPayload = {
        mutationRootPath: ppath,
        addIdx: pos,
      };
      return tree.pipe(mapTo([mutationData]));
    });
  }

  public runStep(uuid: string, mockResults?: Record<string, any>, mockDelay?: number) {
    return this.withTreeLock(() => {
      if (!this.mockMode && mockResults)
        throw new Error(`Mock results passed to runStep while mock mode is off`);
      const res = this.nodeTree.find((item) => item.uuid === uuid);
      if (!res)
        throw new Error(`Step uuid ${uuid} not found`);
      const [snode] = res;
      const node = snode.getItem();
      if (!isFuncCallNode(node))
        throw new Error(`Step uuid ${uuid} is not FuncCall`);
      return node.instancesWrapper.run(mockResults, mockDelay).pipe(mapTo(undefined));
    });
  }

  public runSequence(startUuid: string, rerunWithConsistent?: boolean, includeNonNested?: boolean) {
    return this.withTreeLock(() => {
      const startNode = includeNonNested ? this.nodeTree.root : this.nodeTree.find((item) => item.uuid === startUuid)?.[0];
      if (startNode == null)
        return of(undefined);
      const nodesSeq = this.nodeTree.traverse(startNode, (acc, node) => [...acc, node.getItem()], [] as StateTreeNode[]);
      const startIdx = nodesSeq.findIndex((node) => node.uuid === startUuid);
      if (startIdx < 0)
        return of(undefined);
      return from(nodesSeq.slice(startIdx)).pipe(
        concatMap((node) => {
          if (!isFuncCallNode(node) || node.pendingDependencies$.value?.length ||
            !node.getStateStore().isRunable$.value || (!node.getStateStore().isOutputOutdated$.value && !rerunWithConsistent))
            return of(undefined);
          if (rerunWithConsistent) {
            return node.getStateStore().overrideToConsistent().pipe(
              concatMap(() => this.linksState.waitForLinks()),
              concatMap(() => node.getStateStore().run()),
              concatMap(() => this.linksState.waitForLinks()),
            );
          } else {
            return node.getStateStore().run().pipe(
              concatMap(() => this.linksState.waitForLinks()),
            );
          }
        }),
        toArray(),
        mapTo(undefined),
      );
    });
  }

  public runAction(uuid: string, additionalParams: Record<string, any> = {}) {
    const action = this.linksState.actions.get(uuid);
    if (!action)
      throw new Error(`Action ${uuid} not found`);
    if (action.spec.type === 'pipeline') {
      return this.mutateTree(() => {
        return action.execPipelineMutations(additionalParams).pipe(
          concatMap((lastPipelineMutations) => from(lastPipelineMutations ?? []).pipe(
            concatMap((data) => {
              const ppath = data.path.slice(0, -1);
              const last = indexFromEnd(data.path);
              const subConfig = last ? StateTree.getSubConfig(this.config, ppath, last.id) : this.config;
              if (isPipelineStepConfig(subConfig))
                throw new Error(`FuncCall node ${JSON.stringify(data.path)}, but pipeline is expected`);
              const subTree = StateTree.fromInstanceConfig(
                {
                  instanceConfig: data.initConfig,
                  config: subConfig,
                  isReadonly: false,
                  defaultValidators: this.defaultValidators,
                  mockMode: this.mockMode,
                });
              if (last) {
                this.nodeTree.removeBrunch(data.path);
                this.nodeTree.attachBrunch(ppath, subTree.nodeTree.root, last.id, last.idx);
              } else
                this.nodeTree.replaceRoot(subTree.nodeTree.root);

              const mutationData: TreeUpdateMutationPayload = last ? {
                mutationRootPath: ppath,
                addIdx: last.idx,
              } : {mutationRootPath: []};
              return StateTree.loadOrCreateCalls(subTree, this.mockMode).pipe(mapTo([mutationData] as const));
            })),
          ),
        );
      });
    } else if (action.spec.type === 'funccall') {
      return this.withTreeLock(() => {
        return action.exec(additionalParams).pipe(
          finalize(() => this.makeStateRequests$.next(true)),
        );
      });
    } else
      return action.exec(additionalParams);
  }

  public updateFuncCall(uuid: string, call: DG.FuncCall) {
    return this.mutateTree(() => {
      const data = this.nodeTree.find((item) => item.uuid === uuid);
      if (!data)
        throw new Error(`No FuncCall node found ${uuid}`);
      const [node, path] = data;
      const ppath = path.slice(0, -1);
      const idx = indexFromEnd(path)?.idx ?? 0;
      const item = node.getItem();
      if (!isFuncCallNode(item) || item.instancesWrapper.isReadonly)
        throw new Error(`FuncCall writable node is expected on path ${JSON.stringify(path)}`);
      const adapter = new FuncCallAdapter(call, false);
      item.changeAdapter(adapter);
      item.instancesWrapper.isOutputOutdated$.next(false);
      return of([{
        mutationRootPath: ppath,
        addIdx: idx,
      }] as const);
    });
  }

  public resetToConsistent(uuid: string, ioName: string) {
    return this.withTreeLock(() => {
      const data = this.nodeTree.find((item) => item.uuid === uuid);
      if (!data)
        return of(undefined);
      const [node] = data;
      const item = node.getItem();
      if (!isFuncCallNode(item))
        return of(undefined);
      item.instancesWrapper.setToConsistent(ioName);
      return of(undefined);
    });
  }

  public close() {
    this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (isFuncCallNode(item))
        item.close();
      return acc;
    }, undefined);
    this.closed$.next(true);
  }

  //
  // creation helpers
  //

  static load({
    dbId,
    config,
    isReadonly = false,
    defaultValidators = false,
    mockMode = false,
  }: {
    dbId: string,
    config: PipelineConfigurationProcessed,
    isReadonly?: boolean,
    defaultValidators?: boolean
    mockMode?: boolean
  }): Observable<StateTree> {
    return defer(async () => {
      const [state, _] = await loadInstanceState(dbId);
      const tree = StateTree.fromInstanceState({state, config, isReadonly, defaultValidators, mockMode});
      return tree;
    });
  }

  static fromPipelineConfig({
    config,
    startNode = config,
    startPath = [],
    startState,
    isReadonly = false,
    defaultValidators = false,
    mockMode = false,
    logger,
  } : {
    config: PipelineConfigurationProcessed;
    startNode?: PipelineConfigurationProcessed;
    startPath?: Readonly<NodePath>;
    startState?: StateTree;
    isReadonly?: boolean;
    defaultValidators?: boolean
    mockMode?: boolean;
    logger?: DriverLogger
  }): StateTree {
    const refMap = buildRefMap(config);

    // TODO: initial infinite cycles detection
    const traverse = buildTraverseD(startPath, (data: ConfigTraverseItem, path) => {
      if (isPipelineParallelConfig(data) || isPipelineSequentialConfig(data)) {
        const items = (data?.initialSteps ?? []).map((step, idx) => {
          const item = data.stepTypes.find((t) => {
            if (isPipelineSelfRef(t)) {
              const derefedStep = refMap.get(t.selfRef);
              return derefedStep?.id === step.id;
            }
            return t.id === step.id;
          });
          if (!item)
            throw new Error(`Node ${step.id} not found on path ${JSON.stringify(path)}`);
          const nextPath = [...path, {id: step.id, idx}];
          const stepItem = {...step, ...item};
          return [stepItem, nextPath] as const;
        });
        return items;
      } else if (isPipelineStaticConfig(data))
        return data.steps.map((step, idx) => [step, [...path, {id: step.id, idx}]] as const);
      else if (isPipelineSelfRef(data)) {
        const next = refMap.get(data.selfRef);
        if (!next)
          throw new Error(`Failed to deref ${data.selfRef} on path ${JSON.stringify(path)}`);

        return [[next, [...path, {id: next.id, idx: 0}]]] as const;
      }
      return [] as const;
    }, new Set<ConfigTraverseItem>());

    const tree = traverse(startNode, (acc, state, path) => {
      const [node, ppath, idx] = StateTree.makeTreeNode(config, refMap, path, isReadonly);
      if (isFuncCallNode(node)) {
        if (!isPipelineStepConfig(state))
          throw new Error(`Wrong FuncCall node state type ${state.type} on path ${JSON.stringify(path)}`);
        node.initState(state);
      }
      return StateTree.addTreeNodeOrCreate({acc, config, node, ppath, pos: idx, defaultValidators, mockMode, logger});
    }, startState);
    return tree!;
  }

  static fromInstanceState({
    state,
    config,
    isReadonly,
    mockMode = false,
    defaultValidators = false,
    logger,
  }: {
    state: PipelineSerializedState;
    config: PipelineConfigurationProcessed;
    isReadonly: boolean,
    defaultValidators?: boolean,
    mockMode?: boolean,
    logger?: DriverLogger
  }): StateTree {
    const refMap = buildRefMap(config);

    const traverse = buildTraverseD([] as Readonly<NodePath>, (item: PipelineSerializedState, path) => {
      if (isFuncCallSerializedState(item))
        return [];
      else
        return item.steps.map((step, idx) => [step, [...path, {id: step.configId, idx}]] as const);
    });

    const tree = traverse(state, (acc, state, path) => {
      const [node, ppath, idx] = StateTree.makeTreeNode(config, refMap, path, isReadonly || state.isReadonly);
      node.restoreState(state);
      return StateTree.addTreeNodeOrCreate({acc, config, node, ppath, pos: idx, defaultValidators, mockMode, logger});
    }, undefined as StateTree | undefined);
    return tree!;
  }

  static fromInstanceConfig({
    instanceConfig,
    config,
    isReadonly = false,
    defaultValidators = false,
    mockMode = false,
    logger,
  }: {
    instanceConfig: PipelineInstanceConfig,
    config: PipelineConfigurationProcessed,
    isReadonly?: boolean,
    defaultValidators?: boolean,
    mockMode?: boolean,
    logger?: DriverLogger
  }): StateTree {
    const refMap = buildRefMap(config);

    // TODO: fix static pipeline missing steps
    const traverse = buildTraverseD([] as Readonly<NodePath>, (data: PipelineInstanceConfig, path, visited) => {
      if (visited!.has(data))
        throw new Error(`Initial config cycle on node ${data.id} path ${JSON.stringify(path)}`);
      visited!.add(data);
      if (data.steps)
        return data.steps.map((step, idx) => [step, [...path, {id: step.id, idx}], visited] as const);
      else
        return [];
    }, new Set<PipelineInstanceConfig>());

    const tree = traverse(instanceConfig, (acc, state, path) => {
      const [node, ppath, idx] = StateTree.makeTreeNode(config, refMap, path, isReadonly);
      if (isFuncCallNode(node))
        node.initState(state);
      return StateTree.addTreeNodeOrCreate({acc, config, node, ppath, pos: idx, defaultValidators, mockMode, logger});
    }, undefined as StateTree | undefined);
    return tree!;
  }

  //
  // tree helpers
  //

  private static makeTreeNode(
    config: PipelineConfigurationProcessed,
    refMap: Map<string, PipelineConfigurationProcessed>,
    path: Readonly<NodePath>,
    isReadonly: boolean,
  ) {
    const confPath = path.map((p) => p.id);
    const nodeConf = getConfigByInstancePath(confPath, config, refMap);
    const node = StateTree.makeNode(nodeConf, isReadonly);
    const ppath = path.slice(0, -1);
    const idx = indexFromEnd(path)?.idx ?? 0;
    return [node, ppath, idx] as const;
  }

  private static makeNode(
    nodeConf: PipelineConfigurationProcessed | PipelineStepConfigurationProcessed,
    isReadonly: boolean,
  ) {
    if (isPipelineStepConfig(nodeConf))
      return new FuncCallNode(nodeConf, isReadonly);
    else if (isPipelineStaticConfig(nodeConf))
      return new StaticPipelineNode(nodeConf, isReadonly);
    else if (isPipelineParallelConfig(nodeConf))
      return new ParallelPipelineNode(nodeConf, isReadonly);
    else if (isPipelineSequentialConfig(nodeConf))
      return new SequentialPipelineNode(nodeConf, isReadonly);

    throw new Error(`Wrong node type ${nodeConf}`);
  }

  private static addTreeNodeOrCreate(
    {
      acc,
      config,
      node,
      ppath,
      pos,
      defaultValidators,
      mockMode,
      logger,
    } : {
      acc: StateTree | undefined;
      config: PipelineConfigurationProcessed;
      node: StateTreeNode;
      ppath: NodePath;
      pos: number;
      defaultValidators: boolean;
      mockMode: boolean;
      logger?: DriverLogger
    },
  ) {
    if (acc)
      acc.nodeTree.addItem(ppath, node, node.config.id, pos);
    else
      return new StateTree(node, config, mockMode, defaultValidators, logger);
    return acc;
  }

  public static loadOrCreateCalls(stateTree: StateTree, mockMode: boolean) {
    return defer(() => {
      const pendingFuncCallLoads = stateTree.nodeTree.traverse(stateTree.nodeTree.root, (acc, node) => {
        const item = node.getItem();
        if (isFuncCallNode(item)) {
          if (item.instancesWrapper.getInstance())
            return acc;
          else if (mockMode) {
            const obs$ = defer(() => {
              const adapter = new FuncCallMockAdapter(item.config.io!, item.isReadonly);
              item.initAdapter({adapter, restrictions: {}, isOutputOutdated: true, runError: undefined}, true);
              return of(undefined);
            });
            return [...acc, obs$];
          } else if (item.instancesWrapper.id == null && item.pendingId == null) {
            const obs$ = defer(() => {
              return from(makeFuncCall(item.config.nqName, false)).pipe(
                map((data) => item.initAdapter(data, true)),
              );
            });
            return [...acc, obs$];
          } else if (item.instancesWrapper.id == null && item.pendingId) {
            const savedId = item.pendingId;
            const obs$ = defer(() => {
              return from(loadFuncCall(savedId, item.isReadonly)).pipe(
                map((data) => item.initAdapter(data, false)),
              );
            });
            return [...acc, obs$];
          }
        }
        return acc;
      }, [] as Array<Observable<undefined | void>>);
      return merge(...pendingFuncCallLoads, MAX_CONCURENT_SAVES).pipe(
        toArray(),
        mapTo(stateTree),
      );
    });
  }

  private static findPipelineNode(stateTree: StateTree, uuid?: string) {
    const data = stateTree.nodeTree.find((item) => uuid == null || item.uuid === uuid);
    if (data == null)
      throw new Error(`Node uuid ${uuid} not found`);
    const [root, path] = data;
    const item = root.getItem();
    if (isFuncCallNode(item))
      throw new Error(`FuncCall node ${uuid}, but pipeline is expected`);

    const nqName = root.getItem().config.nqName;
    return [root, nqName, path] as const;
  }

  private static getSubConfig(config: PipelineConfigurationProcessed, path: NodePath, id: string) {
    const refMap = buildRefMap(config);
    const subConfPath = [...path.map((s) => s.id), id];
    const subConfig = getConfigByInstancePath(subConfPath, config, refMap);
    return subConfig;
  }

  //
  // locking, tree mutation and deps tracking
  //

  private mutateTree<R>(fn: () => Observable<readonly [TreeUpdateMutationPayload?, R?]>, waitForLinks = true) {
    return defer(() => {
      if (this.logger)
        this.logger.logTreeUpdates('treeUpdateStarted');
      this.treeLock();
      return (waitForLinks ? this.linksState.waitForLinks() : of(undefined)).pipe(
        tap(() => this.linksState.disableLinks()),
        concatMap(() => fn()),
      );
    }).pipe(
      tap(() => this.updateNodesMap()),
      concatMap((data) => {
        const [mutationData, res] = data ?? [];
        if (this.logger)
          this.logger.logMutations(mutationData);
        const isMutation = (mutationData?.mutationRootPath && mutationData?.mutationRootPath.length > 0) ||
          mutationData?.addIdx != null ||
          mutationData?.removeIdx != null;
        return this.linksState.update(this.nodeTree, isMutation).pipe(mapTo(res));
      }),
      tap(() => {
        this.removeOrphanedIOMetadata();
        this.setDepsTracker();
      }),
      finalize(() => {
        this.treeUnlock();
        if (this.logger)
          this.logger.logTreeUpdates('treeUpdateFinished');
        this.makeStateRequests$.next(true);
      }),
    );
  }

  private withTreeLock(fn: () => Observable<undefined>) {
    return defer(() => {
      this.treeLock();
      return this.linksState.waitForLinks().pipe(concatMap(() => fn()));
    }).pipe(
      finalize(() => {
        this.treeUnlock();
      }),
    );
  }

  private updateNodesMap() {
    this.nodesMap = new Map();
    this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      this.nodesMap.set(item.uuid, item);
      return acc;
    }, undefined);
  }

  private removeOrphanedIOMetadata() {
    const currentLinkIds = new Set(this.linksState.links.keys());

    this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();

      if (!isFuncCallNode(item)) {
        item.clearOldTags(currentLinkIds);
        return acc;
      }

      item.clearOldValidations(currentLinkIds);

      const ioDeps = this.linksState.ioDependencies.get(item.uuid) ?? {};
      const ioNames = item.instancesWrapper.getStateNames();

      for (const ioName of ioNames) {
        const deps = ioDeps[ioName];
        if (!deps?.data)
          item.clearIORestriction(ioName);
        if (!deps?.meta)
          item.clearIOMeta(ioName);
      }

      return acc;
    }, null);
  }

  private setDepsTracker() {
    this.nodeTree.traverse(this.nodeTree.root, (acc, node) => {
      const item = node.getItem();
      if (!isFuncCallNode(item))
        return acc;

      const deps = this.linksState.stepsDependencies.get(item.uuid);
      const depsStates = [...(deps?.nodes ?? [])].filter((depId) => {
        const depItem = this.nodesMap.get(depId);
        return depItem && isFuncCallNode(depItem);
      }).map((depId) => {
        const depItem = this.nodesMap.get(depId)! as FuncCallNode;
        const hasPending$ = combineLatest([
          depItem.instancesWrapper.isOutputOutdated$,
          depItem.pendingDependencies$.pipe(
            map((d) => d.length !== 0),
          ),
        ]).pipe(map(([isOutdated, hasPending]) => isOutdated || hasPending));
        return [depId, hasPending$] as const;
      });
      item.setDeps(depsStates);
      return acc;
    }, null);
  }

  private treeLock() {
    if (this.globalROLocked$.value)
      throw new Error(`Changes double lock`);
    this.globalROLocked$.next(true);
  }

  private treeUnlock() {
    if (!this.globalROLocked$.value)
      throw new Error(`Changes double unlock`);
    this.globalROLocked$.next(false);
  }

  private getMutationSlice(path: NodePath) {
    if (path.length === 0)
      return [path, 0] as const;

    const ppath = path.slice(0, -1);
    const endSegment = indexFromEnd(path)!;
    return [ppath, endSegment.idx] as const;
  }

  // meta call saving

  private saveMetaCall(
    root: TreeNode<StateTreeNode>,
    nqName: string,
    metaData?: ItemMetadata,
  ) {
    return defer(() => {
      if (this.mockMode)
        return of(undefined);
      const state = StateTree.toSerializedStateRec(root, {disableNodesUUID: true});
      return saveInstanceState(nqName, state, metaData);
    });
  }
}
