import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import $ from 'cash-dom';
import wu from 'wu';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import {VIEWER_PATH, viewerTypesMapping} from './consts';
import {FuncCallInput, isInputLockable} from './input-wrappers';
import {ValidationResultBase, getValidationIcon} from './validation';

export function isInputBase(input: FuncCallInput): input is DG.InputBase {
  const inputAny = input as any;
  return (inputAny.dart && DG.toJs(inputAny.dart) instanceof DG.InputBase);
}

export const deepCopy = (call: DG.FuncCall) => {
  const deepClone = call.clone();

  const dfOutputs = wu(call.outputParams.values() as DG.FuncCallParam[])
    .filter((output) => output.property.propertyType === DG.TYPE.DATA_FRAME);
  for (const output of dfOutputs)
    deepClone.outputs[output.name] = call.outputs[output.name].clone();

  const dfInputs = wu(call.inputParams.values() as DG.FuncCallParam[])
    .filter((input) => input.property.propertyType === DG.TYPE.DATA_FRAME);
  for (const input of dfInputs)
    deepClone.inputs[input.name] = call.inputs[input.name].clone();

  return deepClone;
};

export const boundImportFunction = (func: DG.Func): string | undefined => {
  return func.options['getRealData'];
};

export const getPropViewers = (prop: DG.Property): {name: string, config: Record<string, string | boolean>[]} => {
  const viewersRawConfig = prop.options[VIEWER_PATH];
  return (viewersRawConfig !== undefined) ?
  // true and false values are retrieved as string, so we parse them separately
    {name: prop.name, config: JSON.parse(viewersRawConfig, (k, v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      // Converting internal Dart labels to JS DG.VIEWER labels
      if (k === 'type') return viewerTypesMapping[v] || v;

      if (!k.toLowerCase().includes('color')) {
        const parsed = Number.parseFloat(v);

        if (!Number.isNaN(parsed))
          return parsed;
      }

      return v;
    })}:
    {name: prop.name, config: []};
};

export const getFuncRunLabel = (func: DG.Func) => {
  return func.options['runLabel'];
};

export const injectLockStates = (input: FuncCallInput) => {
  // if custom lock state methods are available then use them
  if (isInputLockable(input)) return;

  function setDisabledDefault() {
    input.enabled = false;
    $(input.root).removeClass('rfv-restricted-unlocked-input');
    $(input.root).removeClass('rfv-inconsistent-input');
    $(input.root).removeClass('rfv-restricted-input');
  }

  function setRestrictedDefault() {
    input.enabled = false;
    if (isInputBase(input)) (input.input as HTMLInputElement).disabled = false; ;
    $(input.root).addClass('rfv-restricted-input');
    $(input.root).removeClass('rfv-restricted-unlocked-input');
    $(input.root).removeClass('rfv-inconsistent-input');
  }

  function setRestrictedUnlockedDefault() {
    input.enabled = true;
    $(input.root).addClass('rfv-restricted-unlocked-input');
    $(input.root).removeClass('rfv-restricted-input');
    $(input.root).removeClass('rfv-inconsistent-input');
  }

  function setInconsistentDefault() {
    input.enabled = true;
    $(input.root).addClass('rfv-inconsistent-input');
    $(input.root).removeClass('rfv-restricted-input');
    $(input.root).removeClass('rfv-restricted-unlocked-input');
  }

  const inputAny = input as any;
  inputAny.setDisabled = setDisabledDefault;
  inputAny.setRestricted = setRestrictedDefault;
  inputAny.setRestrictedUnlocked = setRestrictedUnlockedDefault;
  inputAny.setInconsistent = setInconsistentDefault;
};

export const inputBaseAdditionalRenderHandler = (val: DG.FuncCallParam, t: DG.InputBase) => {
  const prop = val.property;

  $(t.root).css({
    'width': `${prop.options['block'] ?? '100'}%`,
    'box-sizing': 'border-box',
  });
    // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13004
    t.captionLabel.firstChild!.replaceWith(ui.span([prop.caption ?? prop.name]));
    // DEALING WITH BUG: https://reddata.atlassian.net/browse/GROK-13005
    if (prop.options['units']) t.addPostfix(prop.options['units']);
};

export const injectInputBaseValidation = (t: DG.InputBase) => {
  const validationIndicator = ui.element('i');
  t.addOptions(validationIndicator);
  function setValidation(messages: ValidationResultBase | undefined) {
    while (validationIndicator.firstChild && validationIndicator.removeChild(validationIndicator.firstChild));
    const [icon, popover] = getValidationIcon(messages);
    if (icon && popover) {
      validationIndicator.appendChild(icon);
      validationIndicator.appendChild(popover);
    }

    t.input.classList.remove('d4-invalid');
    t.input.classList.remove('d4-partially-invalid');
    if (messages?.errors && messages.errors.length)
      t.input.classList.add('d4-invalid');
    else if (messages?.warnings && messages.warnings.length)
      t.input.classList.add('d4-partially-invalid');
  }
  (t as any).setValidation = setValidation;
};

export const scalarsToSheet =
  (sheet: ExcelJS.Worksheet, scalars: { caption: string, value: string, units: string }[]) => {
    sheet.addRow(['Parameter', 'Value', 'Units']).font = {bold: true};
    scalars.forEach((scalar) => {
      sheet.addRow([scalar.caption, scalar.value, scalar.units]);
    });

    sheet.getColumn(1).width = Math.max(
      ...scalars.map((scalar) => scalar.caption.toString().length), 'Parameter'.length,
    ) * 1.2;
    sheet.getColumn(2).width = Math.max(
      ...scalars.map((scalar) => scalar.value.toString().length), 'Value'.length) * 1.2;
    sheet.getColumn(3).width = Math.max(
      ...scalars.map((scalar) => scalar.units.toString().length), 'Units'.length) * 1.2;
  };

let dfCounter = 0;
export const dfToSheet = (sheet: ExcelJS.Worksheet, df: DG.DataFrame, column?: number, row?: number) => {
  const columnKey = sheet.getColumn(column ?? 1).letter;
  const tableConfig = {
    name: `ID_${dfCounter.toString()}`,
    ref: `${columnKey}${row ?? 1}`,
    columns: df.columns.toList().map((col) => ({name: col.name, filterButton: false})),
    rows: new Array(df.rowCount).fill(0).map((_, idx) => [...df.row(idx).cells].map((cell) => cell.value)),
  };
  sheet.addTable(tableConfig);
  sheet.columns.forEach((col) => {
    col.width = 25;
    col.alignment = {wrapText: true};
  });
  dfCounter++;
};

export const plotToSheet =
  async (exportWb: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, plot: HTMLElement,
    columnForImage: number, rowForImage: number = 0) => {
    const canvas = await html2canvas(plot as HTMLElement, {logging: false});
    const dataUrl = canvas.toDataURL('image/png');

    const imageId = exportWb.addImage({
      base64: dataUrl,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: {col: columnForImage, row: rowForImage},
      ext: {width: canvas.width, height: canvas.height},
    });
  };
