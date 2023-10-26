import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {RichFunctionView} from '../function-views';

// validation/advisory system
export interface ActionItems {
    actionName: string;
    action: Function;
  }

export interface Advice {
    description: string;
    actions?: ActionItems[];
  }

export interface ValidationResultBase {
    // awaiting for validation results
    pending?: boolean;
    errors?: Advice[];
    warnings?: Advice[];
    notifications?: Advice[];
  }

export interface ValidationResult extends ValidationResultBase {
    // revalidation request
    revalidate?: string[];
    // revalidations context
    context?: any;
  }

export function isValidationPassed(result?: ValidationResult) {
  return !result?.errors?.length && !result?.pending;
}

export function makeAdvice(description: string, actions?: ActionItems[]) {
  return {description, actions};
}

export function getErrorMessage(result?: ValidationResult) {
  if (result?.errors)
    return result.errors.map((err) => err.description).join('; ');
}

export interface ValidationPayload {
  errors?: (string | Advice)[],
  warnings?: (string | Advice)[],
  notifications?: (string | Advice)[],
}

export function makeValidationResult(payload?: ValidationPayload): ValidationResultBase {
  const wrapper = (item: string | Advice) => typeof item === 'string' ? makeAdvice(item) : item;
  return {
    errors: payload?.errors?.map((err) => wrapper(err)),
    warnings: payload?.warnings?.map((warn) => wrapper(warn)),
    notifications: payload?.notifications?.map((note) => wrapper(note)),
  };
}

export function mergeValidationResults(...results: (ValidationResult | undefined)[]): ValidationResult {
  const errors = [];
  const warnings = [];
  const notifications = [];
  const revalidate = [];
  let context = {};

  for (const result of results) {
    if (result) {
      errors.push(...(result.errors ?? []));
      warnings.push(...(result.warnings ?? []));
      notifications.push(...(result.notifications ?? []));
      revalidate.push(...(result.revalidate ?? []));
      context = {...context, ...(result.context ?? {})};
    }
  }
  return {errors, warnings, notifications, revalidate, context};
}

export function makePendingValidationResult(): ValidationResult {
  return {pending: true};
}

export function makeRevalidation(revalidate: string[], context?: any, result?: ValidationResultBase): ValidationResult {
  return {revalidate, context, ...result};
}

export interface ValidationInfo {
  param: string,
  funcCall: DG.FuncCall,
  lastCall?:DG.FuncCall,
  isRevalidation: boolean,
  isNewOutput: boolean,
  signal: AbortSignal,
  view: RichFunctionView,
  context?: any,
}

export type Validator = (val: any, info: ValidationInfo)
    => Promise<ValidationResult | undefined>;

export type ValidatorFactory = (params: any) => { validator: Validator };

export const nonNullValidator: Validator = async (value: any) => {
  if (value == null)
    return makeValidationResult({errors: ['Missing value']});
};

export function getValidationIcon(messages: ValidationResultBase | undefined) {
  let popover: any;
  let icon: any;
  if (messages?.pending)
    icon = ui.iconFA('spinner', () => {displayValidation(messages, icon, popover);});

  if (messages?.errors && messages.errors.length) {
    icon = ui.iconFA('exclamation-circle', () => {displayValidation(messages, icon, popover);});
    icon.style.color = 'var(--red-3)';
  } else if (messages?.warnings && messages.warnings.length) {
    icon = ui.iconFA('exclamation-circle', () => {displayValidation(messages, icon, popover);});
    icon.style.color = 'var(--orange-2)';
  } else if (messages?.notifications && messages.notifications.length) {
    icon = ui.iconFA('info-circle', () => {displayValidation(messages, icon, popover);} );
    icon.style.color = 'var(--blue-1)';
  }
  if (icon)
    popover = addPopover(icon);

  return icon;
}

function addPopover(icon: HTMLElement) {
  const popover = ui.div();
  stylePopover(popover);
  icon.appendChild(popover);
  return popover;
}

function displayValidation(messages: ValidationResultBase, icon: HTMLElement, popover: HTMLElement) {
  if (popover && icon) {
    alignPopover(icon, popover);
    while (popover.firstChild && popover.removeChild(popover.firstChild));
    const content = renderValidationResults(messages);
    popover.appendChild(content);
    popover.showPopover();
  }
}

function alignPopover(target: HTMLElement, popover: HTMLElement): void {
  const bounds = target.getBoundingClientRect().toJSON();
  popover.style.inset = 'unset';
  popover.style.top = bounds.y + 'px';
  popover.style.left = (bounds.x + 20) + 'px';
}

function stylePopover(popover: HTMLElement): void {
  popover.popover = 'auto';
  popover.style.cursor = 'default';
  popover.style.padding = '10px';
  popover.style.background = '#fdffe5';
  popover.style.border = '1px solid #E4E6CE';
  popover.style.borderRadius = '2px';
  popover.style.boxShadow = '0 0 5px #E4E6CE';
  popover.style.maxWidth = '500px';
}

function renderValidationResults(messages: ValidationResultBase) {
  const root = ui.divV([], {style: {gap: '10px'}});
  for (const category of ['errors', 'warnings', 'notifications'] as const) {
    const advices = messages[category];
    if (!advices?.length)
      continue;
    for (const advice of advices as Advice[]) {
      const icon = getAdviceIcon(category);
      icon!.style.marginRight = '2px';
      root.appendChild(ui.divV([
        ui.span([
          icon,
          advice.description,
        ]),
        ...(advice.actions ?? []).map(
          (action) => ui.link(action.actionName, action.action, undefined, {style: {paddingLeft: '18px'}})),
      ], {style: {lineHeight: '1.2'}}));
    }
  }
  return root;
}

function getAdviceIcon(category: string) {
  let icon: HTMLElement | undefined;
  if (category === 'errors') {
    icon = ui.iconFA('exclamation-circle');
    icon.style.color = 'var(--red-3)';
  } else if (category === 'warnings') {
    icon = ui.iconFA('exclamation-circle');
    icon.style.color = 'var(--orange-2)';
  } else if (category === 'notifications') {
    icon = ui.iconFA('info-circle');
    icon.style.color = 'var(--blue-1)';
  }
  if (icon) {
    icon.style.cursor = 'default';
    icon.style.display = 'inline-block';
    icon.style.fontFamily = '"Font Awesome 5 Pro"';
  }
  return icon;
}
