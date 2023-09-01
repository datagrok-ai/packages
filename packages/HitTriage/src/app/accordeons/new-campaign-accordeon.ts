import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {_package} from '../../package';
import {CampaignFieldTypes, HitTriageTemplate, IngestType} from '../types';
import * as C from '../consts';
import '../../../css/hit-triage.css';

type INewCampaignResult = {
    df: DG.DataFrame,
    type: IngestType,
    campaignProps: {[key: string]: any}
}

type HitTriageCampaignAccordeon = {
    promise: Promise<INewCampaignResult>,
    root: HTMLElement,
    cancelPromise: Promise<void>
}
/** Creates a new campaign accordeon
 * @param {HitTriageTemplate}template template for the campaign. it contains file source type and
 * additional campaign fields
 * @return {HitTriageCampaignAccordeon} Object containing root element, promise for the campaign result and cancel
 */
export function newCampaignAccordeon(template: HitTriageTemplate): HitTriageCampaignAccordeon {
  const errorDiv = ui.divText('', {style: {color: 'red'}});
  // handling file input
  let fileDf: DG.DataFrame | null = null;
  const onFileChange = async () => {
    try {
      fileDf = dfInput.value;
      if (!fileDf)
        return;
      await fileDf.meta.detectSemanticTypes();
      const molcol = fileDf.columns.bySemType(DG.SEMTYPE.MOLECULE);
      if (!molcol) {
        errorDiv.innerText = 'No molecules column found';
        return;
      }

      errorDiv.innerText = '';
    } catch (e) {
      errorDiv.innerText = 'Error parsing file';
    }
  };

  const dfInput = ui.tableInput('Dataframe', null, undefined, onFileChange);
  onFileChange();
  const fileInputDiv = ui.divV([dfInput, errorDiv]);
  // functions that have special tag and are applicable for data source. they should return a dataframe with molecules
  const dataSourceFunctions = DG.Func.find({tags: [C.HitTriageDataSourceTag]});
  // for display purposes we use friendly name of the function
  const dataSourceFunctionsMap: {[key: string]: DG.Func} = {};
  dataSourceFunctions.forEach((func) => {
    dataSourceFunctionsMap[func.friendlyName ?? func.name] = func;
  });

  let funcCall: DG.FuncCall | null = null;
  // each data source function can have some parameters like for example number of rows to return
  // whenever user selects a function we create a FuncCall object and get an editor for it
  const onDataFunctionChange = async () => {
    const func = dataSourceFunctionsMap[dataSourceFunctionInput.value!];
    funcCall = func.prepare();
    const editor = await funcCall.getEditor();
    editor.classList.remove('ui-form');
    funcEditorDiv.innerHTML = '';
    funcEditorDiv.appendChild(editor);
  };
  const funcEditorDiv = ui.div();
  const dataSourceFunctionInput = ui.choiceInput(
    C.i18n.dataSourceFunction, template.queryFunctionName ?? Object.keys(dataSourceFunctionsMap)[0],
    Object.keys(dataSourceFunctionsMap), onDataFunctionChange);
  // call the onchange function to create an editor for the first function
  onDataFunctionChange();
  if (template.queryFunctionName)
    dataSourceFunctionInput.root.getElementsByTagName('select').item(0)?.setAttribute('disabled', 'true');
  const functionInputDiv = ui.divV([dataSourceFunctionInput, funcEditorDiv]);
  // if the file source is selected as 'File', no other inputs are needed so we hide the function editor
  functionInputDiv.style.display = 'none';
  const dataInputsDiv = ui.divV([fileInputDiv, functionInputDiv]);

  // campaign properties. each template might have number of additional fields that should
  // be filled by user for the campaign. they are cast into DG.Property objects and displayed as a form
  const campaignProps = template.campaignFields.map((field) =>
    DG.Property.fromOptions({name: field.name, type: CampaignFieldTypes[field.type], nullable: !field.required}));
  const campaignPropsObject: {[key: string]: any} = {};
  const campaignPropsForm = campaignProps.length ? ui.input.form(campaignPropsObject, campaignProps) : ui.div();
  // displaying function editor or file input depending on the data source type
  if (template.dataSourceType === 'File') {
    fileInputDiv.style.display = 'block';
    functionInputDiv.style.display = 'none';
  } else {
    fileInputDiv.style.display = 'none';
    functionInputDiv.style.display = 'block';
  }

  const form = ui.divV([
    dataInputsDiv,
    ...(campaignProps.length ? [ui.h2('Campaign details'), campaignPropsForm] : [])], 'ui-form');
  const content = ui.div(form, 'ui-form');
  const buttonsDiv = ui.buttonsInput([]); // div for create and cancel buttons
  content.appendChild(buttonsDiv);
  const promise = new Promise<INewCampaignResult>((resolve) => {
    const onOkProxy = async () => {
      if (template.dataSourceType === 'File') {
        if (!fileDf) {
          grok.shell.error('No file selected');
          return;
        }
        const df = fileDf;
        df.name = fileDf.name;
        resolve({df, type: 'File', campaignProps: campaignPropsObject});
      } else {
        const func = dataSourceFunctionsMap[dataSourceFunctionInput.value!];
        if (!func) {
          grok.shell.error('No function selected');
          return;
        }
        const funcCallInputs: {[key: string]: any} = {};
        Object.entries(funcCall!.inputs).forEach(([key, value]) => {
          funcCallInputs[key] = value;
        });
        const df: DG.DataFrame = await func.apply(funcCallInputs);
        resolve({df, type: 'Query', campaignProps: campaignPropsObject});
      };
    };
    const startCampaignButton = ui.bigButton(C.i18n.StartCampaign, () => onOkProxy());
    buttonsDiv.appendChild(startCampaignButton);
  });

  const cancelPromise = new Promise<void>((resolve) => {
    const cancelButton = ui.button(C.i18n.cancel, () => resolve());
    cancelButton.classList.add('hit-triage-accordeon-cancel-button');
    //buttonsDiv.appendChild(cancelButton);
  });

  return {promise, root: content, cancelPromise};
}
