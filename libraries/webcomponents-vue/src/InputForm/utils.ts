import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import type {ConsistencyInfo} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/runtime/StateTreeNodes';
import type {ValidationResult} from '@datagrok-libraries/compute-utils/reactive-tree-driver/src/data/common-types';
import $ from 'cash-dom';

function addPopover(icon: HTMLElement) {
  const popover = ui.div([], 'd4-tooltip');
  stylePopover(popover);
  icon.appendChild(popover);
  return popover;
}

function displayValidation(
  emit: Function,
  ioName: string,
  input: DG.InputBase,
  status: {
    validation?: ValidationResult,
    consistency?: ConsistencyInfo,
  }, icon: HTMLElement, popover: HTMLElement) {
  alignPopover(icon, popover);
  ui.empty(popover);
  const content = renderValidationResults(emit, ioName, input, status);
  popover.appendChild(content);
  popover.showPopover();
}

function alignPopover(target: HTMLElement, popover: HTMLElement): void {
  const bounds = target.getBoundingClientRect().toJSON();
  popover.style.inset = 'unset';
  popover.style.top = bounds.y + 'px';
  popover.style.left = (bounds.x + 20) + 'px';
}

function stylePopover(popover: HTMLElement): void {
  popover.popover = 'auto';
  $(popover).css({
    'font-style': 'normal',
    'pointer-events': 'all',
    'max-width': '300px',
    'text-wrap': 'pretty',
  });
}

function renderValidationResults(
  emit: Function,
  ioName: string,
  input: DG.InputBase,
  status: {
    validation?: ValidationResult,
    consistency?: ConsistencyInfo,
  }) {
  const root = ui.divV([], {style: {gap: '10px'}});

  if (status.validation) {
    (['errors', 'warnings', 'notifications'] as const)
      .filter((category) => !!status.validation?.[category]?.length)
      .flatMap((category) => status.validation![category]!.map((advice) =>({category, advice})))
      .forEach(({category, advice}) => {
        const sectionIconOptions = getIconOptions(category)!;
        const icon = ui.iconFA(sectionIconOptions.name);
        $(icon).css({'color': sectionIconOptions.color, 'margin-right': '4px'});

        root.appendChild(ui.divV([
          ui.divH([
            icon,
            ui.span([advice.description]),
          ]),
          ...(advice.actions ?? []).map(
            (action) => ui.link(
              action.actionName,
              () => emit('actionRequested', action.action),
              undefined, {style: {paddingLeft: '20px'}})),
        ]));
      });
  }

  if (status.consistency?.inconsistent) {
    const sectionIconOptions = getIconOptions('inconsistent')!;
    const icon = ui.iconFA(sectionIconOptions.name);
    $(icon).css({'color': sectionIconOptions.color, 'margin-right': '4px'});

    const consistentValue = status.consistency.assignedValue;
    root.appendChild(ui.divV([
      ui.divH([
        icon,
        ui.span([`Current value is incosistent. Computed value was ${
          DG.TYPES_SCALAR.has(input.property.propertyType) ?
            consistentValue: 'different'
        }`]),
      ]),
      ui.link(
        'Reset to consistent value',
        () => emit('consistencyReset', ioName),
        undefined, {style: {paddingLeft: '20px'}},
      ),
    ]));
  }

  return root;
}

function getIconOptions(category: 'errors' | 'warnings' | 'notifications' | 'inconsistent') {
  if (category === 'errors') return {name: 'exclamation-circle', color: 'var(--red-3)!important'};
  if (category === 'warnings')
    return {name: 'exclamation-circle', color: 'var(--orange-2)!important'};
  if (category === 'notifications')
    return {name: 'info-circle', color: 'var(--blue-1)!important'};
  if (category === 'inconsistent')
    return {name: 'handshake-slash', color: 'var(--blue-1)!important'};
}

export function getValidationIcon(
  emit: Function,
  ioName: string,
  input: DG.InputBase,
  status: {
  validation?: ValidationResult,
  consistency?: ConsistencyInfo,
}) {
  const {validation, consistency} = status;

  const iconOptions = (() => {
    if (validation?.errors && validation.errors.length) return {name: 'exclamation-circle', color: 'var(--red-3)'};
    if (validation?.warnings && validation.warnings.length)
      return {name: 'exclamation-circle', color: 'var(--orange-2)'};
    if (validation?.notifications && validation.notifications.length)
      return {name: 'info-circle', color: 'var(--blue-1)'};
    if (consistency?.inconsistent)
      return {name: 'handshake-slash', color: 'var(--blue-1)'};

    return null;
  })();

  if (!iconOptions) return null;

  const icon = ui.iconFA(iconOptions.name, () => {displayValidation(emit, ioName, input, status, icon, popover);});
  $(icon).css({'pointer-events': 'all'});
  if (iconOptions.color) $(icon).css('color', `${iconOptions.color}!important`);

  $(icon).toggleClass('fal far');
  const popover = addPopover(icon);

  return [icon, popover] as const;
}

export const injectInputBaseStatus = (emit: Function, ioName: string, t: DG.InputBase) => {
  const validationIndicator = ui.element('i');
  $(validationIndicator).addClass('rfv2-validation-icon');
  t.addOptions(validationIndicator);

  function setStatus(status: {
    validation?: ValidationResult,
    consistency?: ConsistencyInfo,
  }) {
    const {validation, consistency} = status;

    while (validationIndicator.firstChild && validationIndicator.removeChild(validationIndicator.firstChild));
    const iconAndPopover = getValidationIcon(emit, ioName, t, {validation, consistency});
    if (iconAndPopover) {
      validationIndicator.appendChild(iconAndPopover[0]);
      validationIndicator.appendChild(iconAndPopover[1]);
    }

    $(t.input).removeClass('d4-invalid d4-partially-invalid');

    const isAnythingToShow =
      (validation?.errors && validation.errors.length) ||
      (validation?.warnings && validation.warnings.length) ||
      (validation?.notifications && validation.notifications.length) ||
      consistency?.inconsistent;

    $(validationIndicator).css('display', isAnythingToShow ? 'flex': 'none');

    if (validation?.errors && validation.errors.length)
      $(t.input).addClass('d4-invalid');
    else if (validation?.warnings && validation.warnings.length)
      $(t.input).addClass('d4-partially-invalid');
  }

  (t as any).setStatus = setStatus;
};

export function isFuncCallInput(arg: any): boolean {
  return arg && arg.root && arg.onInput;
}

export function isInputInjected(arg: any): boolean {
  return arg?.setStatus && isFuncCallInput(arg);
}
