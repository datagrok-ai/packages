import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import {_package} from '../../package';
import {UiUtils} from '@datagrok-libraries/compute-utils';
import {CampaignFieldTypes, ITemplate, IngestType} from '../types';
import * as C from '../consts';
import '../../../css/hit-triage.css';

type INewCampaignResult = {
    df: DG.DataFrame,
    type: IngestType,
    campaignProps: {[key: string]: any}
}

type ICampaignAccordeon = {
    promise: Promise<INewCampaignResult>,
    root: HTMLElement,
    cancelPromise: Promise<void>
}
/** Creates a new campaign accordeon
 * @param {ITemplate}template template for the campaign. it contains file source type and
 * additional campaign fields
 * @return {ICampaignAccordeon} Object containing root element, promise for the campaign result and cancel promise
 */
export function newCampaignAccordeon(template: ITemplate): ICampaignAccordeon {
  let file: File | null = null;
  const errorDiv = ui.divText('', {style: {color: 'red'}});
  // handling file input
  const onFileChange = async (f: File) => {
    try {
      const df = DG.DataFrame.fromCsv(await f.text());
      await df.meta.detectSemanticTypes();
      const molcol = df.columns.bySemType(DG.SEMTYPE.MOLECULE);
      if (!molcol) {
        errorDiv.innerText = 'No molecules column found';
        return;
      }
      file = f;
      errorDiv.innerText = '';
    } catch (e) {
      errorDiv.innerText = 'Error parsing file';
    }
  };

  const fileInput = UiUtils.fileInput('', null, (f: File) => onFileChange(f), undefined);
  const fileInputDiv = ui.divV([fileInput, errorDiv]);
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
    funcEditorDiv.innerHTML = '';
    funcEditorDiv.appendChild(editor);
  };
  const funcEditorDiv = ui.div();
  const dataSourceFunctionInput = ui.choiceInput(
    'Data source function', Object.keys(dataSourceFunctionsMap)[0],
    Object.keys(dataSourceFunctionsMap), onDataFunctionChange);
  // call the onchange function to create an editor for the first function
  onDataFunctionChange();
  const functionInputDiv = ui.divV([dataSourceFunctionInput, funcEditorDiv]);
  // if the file source is selected as 'File', no other inputs are needed so we hide the function editor
  functionInputDiv.style.display = 'none';
  const dataInputsDiv = ui.divV([fileInputDiv, functionInputDiv]);

  // campaign properties. each template might have number of additional fields that should
  // be filled by user for the campaign. they are cast into DG.Property objects and displayed as a form
  const campaignProps = template.campaignFields.map((field) =>
    DG.Property.fromOptions({name: field.name, type: CampaignFieldTypes[field.type], nullable: !field.required}));
  const campaignPropsObject: {[key: string]: any} = {};
  const campaignPropsForm = ui.input.form(campaignPropsObject, campaignProps);
  // displaying function editor or file input depending on the data source type
  if (template.dataSourceType === 'File') {
    fileInputDiv.style.display = 'block';
    functionInputDiv.style.display = 'none';
  } else {
    fileInputDiv.style.display = 'none';
    functionInputDiv.style.display = 'block';
  }

  const accordeon = ui.accordion();
  accordeon.root.classList.add('hit-triage-new-campaign-accordeon');
  accordeon.addPane('File source', () => dataInputsDiv, true);
  campaignProps.length && accordeon.addPane('Campaign details', () => campaignPropsForm, true);
  const content = ui.div(accordeon.root);
  const buttonsDiv = ui.divH([]); // div for create and cancel buttons
  content.appendChild(buttonsDiv);
  const promise = new Promise<INewCampaignResult>((resolve) => {
    const onOkProxy = async () => {
      if (template.dataSourceType === 'File') {
        if (!file) {
          grok.shell.error('No file selected');
          return;
        }
        const df = DG.DataFrame.fromCsv(await file.text());
        df.name = file.name;
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
    const startCampaignButton = ui.bigButton('Start campaign', () => onOkProxy());
    buttonsDiv.appendChild(startCampaignButton);
  });

  const cancelPromise = new Promise<void>((resolve) => {
    const cancelButton = ui.bigButton('Cancel', () => resolve());
    cancelButton.classList.add('hit-triage-accordeon-cancel-button');
    buttonsDiv.appendChild(cancelButton);
  });

  return {promise, root: content, cancelPromise};
}
