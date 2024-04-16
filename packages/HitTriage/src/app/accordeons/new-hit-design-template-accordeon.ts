import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {_package} from '../../package';
import * as C from '../consts';
import '../../../css/hit-triage.css';
import {HitDesignTemplate, IComputeDialogResult, INewTemplateResult} from '../types';
import {chemFunctionsDialog} from '../dialogs/functions-dialog';
import {getCampaignFieldEditors} from './new-template-accordeon';
import {ItemType, ItemsGrid} from '@datagrok-libraries/utils/src/items-grid';
import {HitAppBase} from '../hit-app-base';

export async function newHitDesignTemplateAccordeon(app: HitAppBase<any>,
  preset?: HitDesignTemplate): Promise<INewTemplateResult<HitDesignTemplate>> {
  const availableTemplates = (await _package.files.list('Hit Design/templates'));
  let hasNameError = false;
  let hasKeyError = false;
  // Remove .json from end
  const availableTemplateNames = availableTemplates.map((file) => file.name.slice(0, -5));
  const availableTemplateKeys: string[] = [];

  for (const file of availableTemplates) {
    try {
      const t: HitDesignTemplate = JSON.parse(await _package.files.readAsText(file));
      availableTemplateKeys.push(t.key);
    } catch (e) {
      console.error(e);
    }
  }
  const availableSubmitFunctions = DG.Func.find({tags: [C.HitTriageSubmitTag]});
  const submitFunctionsMap: {[key: string]: DG.Func} = {};
  availableSubmitFunctions.forEach((func) => {
    submitFunctionsMap[func.friendlyName ?? func.name] = func;
  });
  const submitFunctionInput = ui.choiceInput('Submit function', null, [null, ...Object.keys(submitFunctionsMap)]);
  submitFunctionInput.nullable = true;
  submitFunctionInput.value = preset?.submit?.fName ?? null;
  submitFunctionInput.setTooltip('Select function to be called upon submitting');
  const errorDiv = ui.divText('Template name is empty or already exists', {classes: 'hit-triage-error-div'});
  const keyErrorDiv = ui.divText('Template key is empty or already exists', {classes: 'hit-triage-error-div'});

  // ######### TEMPLATE NAME INPUT #########
  function onTemplateNameChanged() {
    if (templateNameInput.value === '' || availableTemplateNames.includes(templateNameInput.value?.trim() ?? '')) {
      //templateNameInput.root.style.borderBottom = '1px solid red';
      const marginLeft = templateNameInput.input.offsetLeft ?? 0;
      const width = templateNameInput.input.offsetWidth ?? 0;
      errorDiv.style.marginLeft = `${marginLeft}px`;
      errorDiv.style.width = `${width}px`;
      errorDiv.style.opacity = '100%';
      errorDiv.style.borderTop = '1px solid red';
      hasNameError = true;
    } else {
      //templateNameInput.root.style.borderBottom = 'none';
      errorDiv.style.borderTop = 'none';
      errorDiv.style.opacity = '0%';
      hasNameError = false;
    }
  }
  const templateNameInput = ui.stringInput('Name', preset?.name ?? '', onTemplateNameChanged);

  // ######### TEMPLATE KEY INPUT #########
  function onTemplateKeyChange() {
    if (templateKeyInput.value === '' || availableTemplateKeys.includes(templateKeyInput.value?.trim() ?? '')) {
      //templateKeyInput.root.style.borderBottom = '1px solid red';
      const marginLeft = templateKeyInput.input.offsetLeft ?? 0;
      const width = templateKeyInput.input.offsetWidth ?? 0;
      keyErrorDiv.style.marginLeft = `${marginLeft}px`;
      keyErrorDiv.style.width = `${width}px`;
      keyErrorDiv.style.borderTop = '1px solid red';
      keyErrorDiv.style.opacity = '100%';
      hasKeyError = true;
    } else {
      //templateKeyInput.root.style.borderBottom = 'none';
      keyErrorDiv.style.opacity = '0%';
      keyErrorDiv.style.borderTop = 'none';
      hasKeyError = false;
    }
  }

  const templateKeyInput = ui.stringInput('Key', preset?.key ?? '', onTemplateKeyChange);
  templateKeyInput.setTooltip('Template key used for campaign prefix');
  templateNameInput.setTooltip('Template name');
  templateNameInput.root.style.borderBottom = 'none';
  templateKeyInput.root.style.borderBottom = 'none';
  errorDiv.style.opacity = '0%';
  keyErrorDiv.style.opacity = '0%';

  let funcDialogRes: IComputeDialogResult | null = null;
  // used just for functions editor
  const dummyTemplate = {
    compute: {
      descriptors: {
        enabled: true,
        args: preset?.compute?.descriptors?.args ?? [],
      },
      functions: preset?.compute?.functions ?? [],
    },
  } as unknown as HitDesignTemplate;
  const funcInput = await chemFunctionsDialog(app, (res) => {funcDialogRes = res;}, () => null,
    dummyTemplate, false);
  funcInput.root.classList.add('hit-triage-new-template-functions-input');
  const fieldsEditor = getCampaignFieldEditors(preset?.campaignFields);
  const tileCategoriesEditor = getTileCategoryEditor(preset?.stages);
  const detailsDiv = ui.divV(
    [ui.divV([templateNameInput, errorDiv]), ui.divV([templateKeyInput, keyErrorDiv]), fieldsEditor.fieldsDiv]);

  const stagesHeader = ui.h2('Stages');
  ui.tooltip.bind(stagesHeader,
    'Define Stages for designed molecules. For example, "Design", "Synthesis", "Test", etc.');
  const computeHeader = ui.h2('Compute');
  ui.tooltip.bind(computeHeader,
    'Define functions to be calculated for each molecule. For example, "Descriptors", "Descriptors:Descriptors", etc.');
  const form = ui.div(
    [ui.h2('Details'),
      detailsDiv,
      stagesHeader,
      tileCategoriesEditor.fieldsDiv,
      computeHeader,
      funcInput.root,
      ui.h2('Submit'),
      submitFunctionInput.root,
    ], 'ui-form');
  const buttonsDiv = ui.buttonsInput([]);
  form.appendChild(buttonsDiv);
  const buttonsContainerDiv = buttonsDiv.getElementsByClassName('ui-input-editor')?.[0] ?? buttonsDiv;
  const cancelPromise = new Promise<void>((resolve) => {
    const cancelButton = ui.button(C.i18n.cancel, () => resolve());
    buttonsContainerDiv.appendChild(cancelButton);
  });
  const promise = new Promise<HitDesignTemplate>((resolve) => {
    async function onOkProxy() {
      onTemplateNameChanged();
      onTemplateKeyChange();
      funcInput.okProxy();
      if (hasNameError || !templateNameInput.value || templateNameInput.value === '') {
        grok.shell.error('Template name is empty or already exists');
        return;
      }
      if (hasKeyError || !templateKeyInput.value || templateKeyInput.value === '') {
        grok.shell.error('Template key is empty or already exists');
        return;
      }

      const submitFunction = submitFunctionInput.value ? submitFunctionsMap[submitFunctionInput.value] : undefined;
      const out: HitDesignTemplate = {
        name: templateNameInput.value,
        key: templateKeyInput.value,
        campaignFields: fieldsEditor.getFields(),
        stages: tileCategoriesEditor.getFields(),
        compute: {
          descriptors: {
            enabled: !!funcDialogRes?.descriptors?.length,
            args: funcDialogRes?.descriptors ?? [],
          },
          functions: Object.entries(funcDialogRes?.externals ?? {}).map(([funcName, args]) => {
            const splitFunc = funcName.split(':');
            return ({
              name: splitFunc[1],
              package: splitFunc[0],
              args: args,
            });
          }),
          scripts: Object.entries(funcDialogRes?.scripts ?? {})
            .filter(([name, _]) => name.startsWith(C.HTScriptPrefix) && name.split(':').length === 3)
            .map(([scriptId, args]) => {
              const scriptNameParts = scriptId.split(':');
              return ({
                name: scriptNameParts[1] ?? '',
                id: scriptNameParts[2] ?? '',
                args: args,
              });
            }),
          queries: Object.entries(funcDialogRes?.queries ?? {})
            .filter(([name, _]) => name.startsWith(C.HTQueryPrefix) && name.split(':').length === 3)
            .map(([queryName, args]) => {
              const queryNameParts = queryName.split(':');
              return ({
                name: queryNameParts[1] ?? '',
                id: queryNameParts[2] ?? '',
                args: args,
              });
            }),
        },
        ...(submitFunction ? {submit: {fName: submitFunction.name, package: submitFunction.package.name}} : {}),
      };
      saveHitDesignTemplate(out);
      grok.shell.info('Template created successfully');
      resolve(out);
    }
    const createTemplateButton = ui.bigButton(C.i18n.createTemplate, () => onOkProxy());
    buttonsContainerDiv.appendChild(createTemplateButton);
  });

  return {root: form, template: promise, cancelPromise};
}

export function saveHitDesignTemplate(template: HitDesignTemplate) {
  _package.files.writeAsText(`Hit Design/templates/${template.name}.json`, JSON.stringify(template));
}


export function getTileCategoryEditor(preset?: string[]) {
  const props = [DG.Property.fromOptions({name: 'Name', type: DG.TYPE.STRING})];
  const itemsGrid = new ItemsGrid(props,
    preset ? preset.map((i) => ({Name: i})) : undefined, {horizontalInputNames: true});
  let addingItem: ItemType = {};
  function getFieldParams(): string[] {
    const items = itemsGrid.items.filter((f) => f.Name).map((f) => f.Name);
    if (addingItem.Name && addingItem.Name !== '')
      items.push(addingItem.Name);
    return items;
  }
  itemsGrid.onItemAdded.subscribe((_) => {
    addingItem = {};
  });
  itemsGrid.onAddingItemChanged.subscribe((item) => {
    if (item)
      addingItem = item.item;
  });

  return {
    getFields: getFieldParams,
    fieldsDiv: itemsGrid.root,
  };
}
