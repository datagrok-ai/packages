import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {anyObject, getSmiles, pubChemIdType, pubChemSearchType} from './utils';
import {getCompoundInfo, identitySearch, similaritySearch, substructureSearch} from './pubchem';
import {pubChemBaseURL} from './tests/const';

const WIDTH = 200;
const HEIGHT = 100;

export function renderInfoValue(info: anyObject, refs: anyObject): HTMLElement {
  const infoValue: {[key: string]: any[]} = info.Value;
  let infoValueList = Object.values(infoValue)[0];
  infoValueList = infoValueList.length ? Object.values(infoValueList[0]) : infoValueList;
  let text: string = infoValueList.length ? Object.values(infoValueList[0]).toString() : '';

  if (text && info.ValueUnit)
    text += ` ${info.ValueUnit}`;

  if (info.Table) {
    const columnNames: string[] = info.Table.ColumnName;
    const rows: any[] = info.Table.Row || [];

    return ui.table(rows, (row, _) => {
      row.Cell.map((x: any) => renderInfoValue(x, refs)).toList();
    }, columnNames);
  }

  let result;
  if (infoValue.String && info.URL)
    result = ui.div(text.replaceAll('<img src="/', `<img src="${pubChemBaseURL}`));
  else if (text && info.URL)
    result = ui.link(text, info.URL);
  else if (infoValue.StringList)
    result = ui.list(infoValue.StringList);
  else if (text)
    result = ui.divText(text);
  else if (info.ExternalDataMimeType === 'image/png' && info.ExternalDataURL)
    result = ui.image(info.ExternalDataURL, 200, 150);
  else
    result = null;


  if (result instanceof HTMLElement && info.ReferenceNumber) {
    //@ts-ignore: api types are wrong
    ui.tooltip.bind(result, () => ui.tableFromMap(refs[info.ReferenceNumber]));
  }

  return result ?? ui.divText('unknown');
}

export function renderSection(section: anyObject, refs: anyObject): HTMLDivElement {
  const content = ui.divV([]);

  const description = section.Description;
  if (description)
    content.append(ui.div(description));


  const information: any[] = section.Information;
  if (information) {
    const table = ui.table(information, (inf, _) => [inf.Description || inf.Name, renderInfoValue(inf, refs)]);
    content.append(table);
  }

  const sections: anyObject[] = section.Section;
  if (sections) {
    const acc = ui.accordion(`pubChem/${section.TOCHeading}`);
    for (const section of sections) {
      const paneName = section.TOCHeading;
      acc.addPane(paneName, () => renderSection(section, refs));
      if (section.Description)
        ui.tooltip.bind(ui.divText(paneName), () => ui.div(section.Description));
    }
    content.append(acc.root);
  }
  return content;
}

export async function buildAccordion(id: pubChemIdType | null): Promise<HTMLElement> {
  if (id === '0' || id === null)
    return ui.div('Not found in PubChem');

  const json = await getCompoundInfo(id);

  const acc = ui.accordion('pubChem');
  acc.header = ui.label(`pubchem: ${id}`);

  const references: anyObject = {};
  const recordJson = json.Record;
  for (const ref of recordJson.Reference)
    references[ref.ReferenceNumber] = ref;

  const sections = recordJson.Section;
  for (const section of sections)
    acc.addPane(section.TOCHeading, () => renderSection(section, references));

  return acc.root;
}

export async function getSearchWidget(molString: string, searchType: pubChemSearchType): Promise<DG.Widget> {
  try {
    molString = await getSmiles(molString);
  } catch (e) {
    return new DG.Widget(ui.divText('Molecule string is malformed'));
  }
  const headerHost = ui.div();
  const compsHost = ui.div([ui.loader()], 'd4-flex-wrap');
  const widget = new DG.Widget(ui.divV([headerHost, compsHost]));

  let moleculesJson: anyObject[] | null;
  switch (searchType) {
  case 'similarity':
    moleculesJson = await similaritySearch('smiles', molString);
    break;
  case 'substructure':
    moleculesJson = await substructureSearch('smiles', molString);
    break;
  case 'identity':
    moleculesJson = await identitySearch('smiles', molString);
    break;
  default:
    throw new Error(`DrugBankSearch: Search type \`${searchType}\` not found`);
  }

  if (moleculesJson === null) {
    compsHost.firstChild?.remove();
    compsHost.appendChild(ui.divText('No matches'));
    return widget;
  }

  if (searchType === 'identity') {
    const props: {value: anyObject, urn: anyObject}[] = moleculesJson[0]['props'];
    const result: anyObject = {};
    const bannedKeys = ['label', 'name', 'implementation', 'datatype'];

    for (const prop of props) {
      const urn = prop.urn;
      const label: string = urn.label;
      const name: string | undefined = urn.name;
      const value = Object.values(prop.value)[0];
      const boxedValue = ui.divText(value);

      for (const bannedKey of bannedKeys)
        delete urn[bannedKey];

      ui.tooltip.bind(boxedValue, () => ui.tableFromMap(urn));
      result[`${name ? name + ' ' : ''}${label}`] = boxedValue;
    }

    const resultMap = ui.tableFromMap(result);

    return new DG.Widget(resultMap);
  }

  const r = window.devicePixelRatio;
  const molCount = Math.min(moleculesJson.length, 20);
  const renderFunctions = DG.Func.find({meta: {chemRendererName: 'RDKit'}});
  if (renderFunctions.length === 0)
    throw new Error('RDKit renderer is not available');

  for (let idx = 0; idx < molCount; idx++) {
    const molEntry = moleculesJson[idx] as {'CanonicalSMILES': string, 'CID': number};

    const molHost = ui.canvas(WIDTH, HEIGHT);
    molHost.classList.add('chem-canvas');
    molHost.width = WIDTH * r;
    molHost.height = HEIGHT * r;
    molHost.style.width = `${WIDTH}px`;
    molHost.style.height = `${HEIGHT}px`;

    renderFunctions[0].apply().then((rendndererObj) => {
      rendndererObj.render(molHost.getContext('2d')!, 0, 0, WIDTH, HEIGHT,
        DG.GridCell.fromValue(molEntry['CanonicalSMILES']));
    });

    ui.tooltip.bind(molHost, () => ui.divText(`CID: ${molEntry['CID']}\nClick to open in PubChem`));
    molHost.addEventListener('click',
      () => window.open(`https://pubchem.ncbi.nlm.nih.gov/compound/${molEntry['CID']}`, '_blank'));
    compsHost.appendChild(molHost);
  }

  headerHost.appendChild(ui.iconFA('arrow-square-down', () => {
    const table = DG.DataFrame.fromObjects(moleculesJson!);
    table!.name = 'PubChem Similarity Search';
    grok.shell.addTableView(table!);
  }, 'Open compounds as table'));
  compsHost.style.overflowY = 'auto';
  if (compsHost.parentElement)
    compsHost.parentElement!.style.width = 'auto';

  compsHost.firstChild?.remove();

  if (compsHost.children.length === 0)
    compsHost.appendChild(ui.divText('No matches'));

  return widget;
}
