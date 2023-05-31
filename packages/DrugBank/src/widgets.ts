import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {findSimilar, searchSubstructure} from './searches';

const WIDTH = 200;
const HEIGHT = 100;

export enum SEARCH_TYPE {
  SIMILARITY = 'similarity',
  SUBSTRUCTURE = 'substructure',
}

export async function searchWidget(molString: string, searchType: SEARCH_TYPE, dbdf: DG.DataFrame,
): Promise<DG.Widget> {
  const headerHost = ui.div();
  const compsHost = ui.div([], 'd4-flex-wrap');
  const panel = ui.divV([headerHost, compsHost]);

  let table: DG.DataFrame | null;
  try {
    switch (searchType) {
    case SEARCH_TYPE.SIMILARITY:
      table = await findSimilar(molString, 20, 0, dbdf);
      break;
    case SEARCH_TYPE.SUBSTRUCTURE:
      table = await searchSubstructure(molString, dbdf);
      break;
    default:
      throw new Error(`DrugBankSearch: No such search type ${searchType}`);
    }
  } catch (e) {
    return new DG.Widget(ui.divText('Error occurred during search. Molecule is possible malformed'));
  }

  compsHost.firstChild?.remove();
  if (table === null || table.filter.trueCount === 0) {
    compsHost.appendChild(ui.divText('No matches'));
    return new DG.Widget(panel);
  }
  table.name = `DrugBank ${searchType} Search`;

  const bitsetIndexes = table.filter.getSelectedIndexes();
  const molCount = Math.min(bitsetIndexes.length, 20);
  const moleculeCol: DG.Column<string> = table.getCol('molecule');
  const idCol: DG.Column<string> = table.getCol('DRUGBANK_ID');
  const nameCol: DG.Column<string> = table.getCol('COMMON_NAME');
  const r = window.devicePixelRatio;

  const renderFunctions = DG.Func.find({meta: {chemRendererName: 'RDKit'}});
  if (renderFunctions.length === 0)
    throw new Error('RDKit renderer is not available');

  for (let n = 0; n < molCount; n++) {
    const piv = bitsetIndexes[n];
    const molfile = moleculeCol.get(piv)!;

    const molHost = ui.canvas(WIDTH, HEIGHT);
    molHost.classList.add('chem-canvas');
    molHost.width = WIDTH * r;
    molHost.height = HEIGHT * r;
    molHost.style.width = (WIDTH).toString() + 'px';
    molHost.style.height = (HEIGHT).toString() + 'px';

    renderFunctions[0].apply().then((rendndererObj) => {
      rendndererObj.render(molHost.getContext('2d')!, 0, 0, WIDTH, HEIGHT, DG.GridCell.fromValue(molfile));
    });

    ui.tooltip.bind(molHost, () => ui.divText(`Common name: ${nameCol.get(piv)!}\nClick to open in DrugBank Online`));
    molHost.addEventListener('click', () => window.open(`https://go.drugbank.com/drugs/${idCol.get(piv)}`, '_blank'));
    compsHost.appendChild(molHost);
  }
  headerHost.appendChild(
    ui.iconFA('arrow-square-down', () => grok.shell.addTableView(table!), 'Open compounds as table'));
  compsHost.style.overflowY = 'auto';

  return new DG.Widget(panel);
}

export function drugNameMoleculeConvert(id: string, dbdfRowCount: number, synonymsCol: DG.Column<string>,
  smilesCol: DG.Column<string>): string {
  const drugName = id.slice(3).toLowerCase();
  //TODO: consider using raw data instead of .get or column iterator (see ApiSamples)
  //TODO: benchmark it
  for (let i = 0; i < dbdfRowCount; i++) {
    const currentSynonym = synonymsCol.get(i)!.toLowerCase();
    //TODO: check why .includes & consider using hash-map
    if (currentSynonym.includes(drugName))
      return smilesCol.get(i)!;
  }
  return '';
}
