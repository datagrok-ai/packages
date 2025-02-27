import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const _package = new DG.Package();

const WIDTH = 200;
const HEIGHT = 100;

const BASE_URL = 'https://www.ebi.ac.uk/chembl/api/data';

export enum SEARCH_TYPE {
  SUBSTRUCTURE = 'substructure',
  SIMILARITY = 'similarity',
}

enum ELEMENTS {
  CHEMBL_ID = 'molecule_chembl_id',
  SMILES = 'canonical_smiles',
  PROPERTIES = 'molecule_properties',
  SIMILARITY = 'similarity',
}

export function getData(searchType: SEARCH_TYPE, smiles: string, score: number | null = null): DG.DataFrame | null {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", `${BASE_URL}/${searchType}/${smiles}${searchType === SEARCH_TYPE.SUBSTRUCTURE ? '' : `/${score}`}`, false);
  xmlhttp.send();
  const xmlDoc = xmlhttp.responseXML;
  if (xmlDoc === null)
    return null;
  const molecules = xmlDoc.getElementsByTagName("molecule");
  const rowCount = Math.min(molecules.length, 20);

  const df = DG.DataFrame.create(rowCount);
  let stopIdx = 0;
  for (let i = 0; i < rowCount; i++) {
    stopIdx = i;
    grok.log.debug(`Row: ${i}`);
    const molecule = molecules[i];

    const chemblId = molecule.getElementsByTagName(ELEMENTS.CHEMBL_ID)[0];
    if (typeof chemblId === 'undefined')
      break;
    let col = df.columns.getOrCreate(ELEMENTS.CHEMBL_ID, DG.TYPE.STRING);
    grok.log.debug(`Chembl ID: ${chemblId}`);
    col.set(i, chemblId.textContent);

    const smiles = molecule.getElementsByTagName(ELEMENTS.SMILES)[0];
    col = df.columns.getOrCreate(ELEMENTS.SMILES, DG.TYPE.STRING);
    grok.log.debug(`SMILES: ${smiles}`);
    col.set(i, smiles.textContent);

    if (searchType === SEARCH_TYPE.SIMILARITY) {
      const similarity = molecule.getElementsByTagName(ELEMENTS.SIMILARITY)[0];
      col = df.columns.getOrCreate(ELEMENTS.SIMILARITY, DG.TYPE.FLOAT);
      grok.log.debug(`Similarity: ${similarity}`);
      col.set(i, parseInt(similarity.textContent ?? '0') / 100);
    }

    // TODO: Show properties in tooltip
    // const properties = molecule.getElementsByTagName(ELEMENTS.PROPERTIES)[0];
    // for (let j = 0; j < properties.children.length; j++) {
    //   const property = properties.children[j];
    //   col = df.columns.getOrCreate(property.tagName, DG.TYPE.STRING, rowCount);
    //   col.set(i, property.textContent);
    // }
  }
  for (let i = stopIdx; i < rowCount; i++)
    df.rows.removeAt(stopIdx);
  return df;
}

export async function chemblSubstructureSearch(mol: string): Promise<DG.DataFrame | null> {
  try {
    // FIXME: data query doesn't read XML properly, so we use XMLHttpRequest
    // let df: DG.DataFrame | null = await grok.data.query(`${_package.name}:SubstructureSmile`, {'smile': mol});
    // const smilesCol = df?.col(COLUMN_NAMES.SMILES) ?? null;
    // if (smilesCol === null || df?.col(COLUMN_NAMES.CHEMBL_ID) === null)
    //   return null;

    // const rowMask = DG.BitSet.create(df!.rowCount, (i) => smilesCol!.get(i) !== '');
    // df = df!.clone(rowMask, [COLUMN_NAMES.SMILES, COLUMN_NAMES.CHEMBL_ID]);
    // if (df.rowCount === 0)
    //   return null;

    // return df;
    return getData(SEARCH_TYPE.SUBSTRUCTURE, mol);
  } catch (e: any) {
    console.error('In SubstructureSearch: ' + e.toString());
    throw e;
  }
}

export async function chemblSimilaritySearch(molecule: string): Promise<DG.DataFrame | null> {
  try {
    // FIXME: data query doesn't read XML properly, so we use XMLHttpRequest
    // let df: DG.DataFrame | null = await grok.data.query(`${_package.name}:SimilaritySmileScore`, {'smile': molecule, 'score': 40});
    // const smilesCol = df?.col(COLUMN_NAMES.SMILES) ?? null;
    // if (smilesCol === null || df!.col(COLUMN_NAMES.CHEMBL_ID) === null)
    //   return null;

    // const rowMask = DG.BitSet.create(df!.rowCount, (i) => smilesCol!.get(i) !== '');
    // df = df!.clone(rowMask, [COLUMN_NAMES.SMILES, COLUMN_NAMES.CHEMBL_ID]);
    // if (df.rowCount === 0)
    //   return null;

    // return df;
    return getData(SEARCH_TYPE.SIMILARITY, molecule, 40);
  } catch (e: any) {
    console.error('In SimilaritySearch: ' + e.toString());
    throw e;
  }
}

export async function getSmiles(molString: string): Promise<string> {
  molString = await grok.functions.call('Chem:convertMolNotation',
    {molecule: molString, sourceNotation: 'unknown', targetNotation: 'smiles'});
  return molString;
}

//name: ChEMBL Search Widget
//tags: widgets
//input: string mol {semType: Molecule}
//input: string searchType
//output: widget result
export async function chemblSearchWidget(mol: string, substructure: boolean = false): Promise<DG.Widget> {
  try {
    mol = await getSmiles(mol);
  } catch (e) {
    return new DG.Widget(ui.divText('Molecule string is malformed'));
  }
  const headerHost = ui.divH([]);
  const compsHost = ui.div([ui.loader(), headerHost], 'd4-flex-wrap chem-viewer-grid chem-search-panel-wrapper');
  const panel = ui.divV([compsHost]);
  const searchFunc = substructure ?
    async () => chemblSubstructureSearch(mol) :
    async () => chemblSimilaritySearch(mol);

  searchFunc().then((table: DG.DataFrame | null) => {
    compsHost.removeChild(compsHost.firstChild!);
    if (table === null) {
      compsHost.appendChild(ui.divText('No matches'));
      return;
    }

    const moleculeCol = table.getCol(ELEMENTS.SMILES);
    const chemblIdCol = table.getCol(ELEMENTS.CHEMBL_ID);
    const molCount = Math.min(table.rowCount, 20);

    for (let i = 0; i < molCount; i++) {
      const molHost = ui.divV([]);
      const res = grok.chem.drawMolecule(moleculeCol.get(i), WIDTH, HEIGHT, true);
      molHost.append(res);
      if (!substructure)
        molHost.append(ui.divText(`Score: ${table.getCol(ELEMENTS.SIMILARITY).get(i)?.toFixed(2)}`));

      ui.tooltip.bind(molHost,
        () => ui.divText(`ChEMBL ID: ${chemblIdCol.get(i)}\nClick to open in ChEMBL Database`));
      molHost.addEventListener('click',
        () => window.open(`https://www.ebi.ac.uk/chembl/compound_report_card/${chemblIdCol.get(i)}`, '_blank'));
      compsHost.appendChild(molHost);
    }

    headerHost.appendChild(ui.iconFA('arrow-square-down', () => {
      table.name = `"ChEMBL Similarity Search"`;
      grok.shell.addTableView(table);
    }, 'Open compounds as table'));
    compsHost.style.overflowY = 'auto';
  },
  )
    .catch((err: any) => {
      if (compsHost.children.length > 0)
        compsHost.removeChild(compsHost.firstChild!);

      const div = ui.divText('No matches');
      ui.tooltip.bind(div, `${err}`);
      compsHost.appendChild(div);
    });
  return new DG.Widget(panel);
}

//name Chembl Get by Id
//input string id
//output dataframe
export async function getById(id: string): Promise<DG.DataFrame | null> {
  if (!id.toLowerCase().startsWith('chembl'))
    id = `CHEMBL${id}`;

  try {
    return await grok.data.query(`${_package.name}:MoleculeJson`, {'molecule_chembl_id__exact': id});
  } catch (e: any) {
    console.error(e);
    return null;
  }
}

//name: Databases | ChEMBL | Substructure Search API
//tags: panel, widgets
//input: string mol {semType: Molecule}
//output: widget result
//condition: true
export async function chemblSubstructureSearchPanel(mol: string): Promise<DG.Widget> {
  return mol ? chemblSearchWidget(mol, true) : new DG.Widget(ui.divText('SMILES is empty'));
}

//name: Databases | ChEMBL | Similarity Search API
//tags: panel, widgets
//input: string mol {semType: Molecule}
//output: widget result
//condition: true
export async function chemblSimilaritySearchPanel(mol: string): Promise<DG.Widget> {
  return mol ? chemblSearchWidget(mol) : new DG.Widget(ui.divText('SMILES is empty'));
}

//name: GetCompoundsIds
//input: string inchiKey
//output: object sources
export async function getCompoundsIds(inchiKey: string): Promise<{[key: string]: string | number}[] | null> {
  const url = `https://www.ebi.ac.uk/unichem/rest/inchikey/${inchiKey}`;
  const params: RequestInit = {method: 'GET', referrerPolicy: 'strict-origin-when-cross-origin'};
  const response = await grok.dapi.fetchProxy(url, params);
  const json = await response.json();
  return response.status !== 200 || json.error ? {} : json;
}