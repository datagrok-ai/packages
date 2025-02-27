import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {TreeNode} from '../data/BaseTree';
import {IRuntimeLinkController, IRuntimeMetaController, IRuntimePipelineMutationController, INameSelectorController, IRuntimeValidatorController, IFuncallActionController} from '../RuntimeControllers';
import {RestrictionType, ValidationResult} from '../data/common-types';
import {StateTreeNode} from './StateTreeNodes';
import {ScopeInfo} from './Link';
import {PipelineInstanceConfig} from '../config/PipelineInstance';

export class ControllerCancelled extends Error { };

export class ControllerBase<T> {
  private isActive = true;

  public outputs: Record<string, T> = {};

  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {}

  protected checkInput(name: string) {
    if (!this.inputsSet.has(name)) {
      const e = new Error(`Handler for Link ${this.id} is trying to set an unknown input ${name}`);
      console.error(e);
      grok.shell.error(e.message);
      throw e;
    }
  }

  protected checkOutput(name: string) {
    if (!this.outputsSet.has(name)) {
      const e = new Error(`Handler for Link ${this.id} is trying to set an unknown output ${name}`);
      console.error(e);
      grok.shell.error(e.message);
      throw e;
    }
  }

  protected checkIsClosed() {
    if (!this.isActive)
      throw new ControllerCancelled();
  }

  getAdditionalParam(name: string) {
    return this.scopeInfo?.additionalParams?.[name];
  }

  close() {
    this.isActive = false;
  }
}

export class LinkController extends ControllerBase<[any, RestrictionType]> implements IRuntimeLinkController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string): T {
    return this.getAll<T>(name)?.[0];
  }

  setAll<T = any>(name: string, state: T, restriction: RestrictionType = 'restricted') {
    this.checkIsClosed();
    this.checkOutput(name);
    this.outputs[name] = [state, restriction] as const;
  }
}

export class ValidatorController extends ControllerBase<ValidationResult | undefined> implements IRuntimeValidatorController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public actions: Record<string, Map<string, string>>,
    public baseNode?: TreeNode<StateTreeNode>,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string): T {
    return this.getAll<T>(name)?.[0];
  }

  getValidationAction(name: string, actionId: string): string | undefined {
    this.checkIsClosed();
    const actions = this.actions[name];
    const actionUUID = actions?.get(actionId);
    return actionUUID;
  }

  setValidation(name: string, validation?: ValidationResult | undefined) {
    this.checkIsClosed();
    this.checkOutput(name);
    this.outputs[name] = validation;
  }
}

export class MetaController extends ControllerBase<any | undefined> implements IRuntimeMetaController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string): T {
    return this.getAll<T>(name)?.[0];
  }

  setViewMeta(name: string, meta?: any | undefined) {
    this.checkIsClosed();
    this.checkOutput(name);
    this.outputs[name] = meta;
  }
}

export class MutationController extends ControllerBase<PipelineInstanceConfig | undefined> implements IRuntimePipelineMutationController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string): T {
    return this.getAll<T>(name)?.[0];
  }

  setPipelineState(name: string, state?: PipelineInstanceConfig) {
    this.checkIsClosed();
    this.checkOutput(name);
    this.outputs[name] = state;
  }
}

export class NameSelectorController extends ControllerBase<any | undefined> implements INameSelectorController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string): T {
    return this.getAll<T>(name)?.[0];
  }

  setDescriptionItem(name: string, val: string) {
    this.checkIsClosed();
    this.outputs[name] = val;
  }
}

export class FuncallActionController extends ControllerBase<any | undefined> implements IFuncallActionController {
  constructor(
    public inputs: Record<string, any[]>,
    public inputsSet: Set<string>,
    public outputsSet: Set<string>,
    public id: string,
    public scopeInfo?: ScopeInfo,
  ) {
    super(inputs, inputsSet, outputsSet, id, scopeInfo);
  }

  getAll<T = any>(name: string): T[] | undefined {
    this.checkIsClosed();
    this.checkInput(name);
    return this.inputs[name];
  }

  getFirst<T = any>(name: string) {
    return this.getAll<T>(name)?.[0];
  }

  setFuncCall(name: string, state: DG.FuncCall) {
    this.checkIsClosed();
    this.checkOutput(name);
    this.outputs[name] = state;
  }
}
