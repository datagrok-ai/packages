import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {COUNTRY_CODES} from './country-codes';
import {ChemspacePriceColumns, ChemspaceOffer, ChemspacePricesTableItem, ChemspaceResult} from './model';
import {delay} from '@datagrok-libraries/utils/src/test';

const host = 'https://api.chem-space.com';
let token: string | null = null;
export const _package = new DG.Package();

const WIDTH = 150;
const HEIGHT = 75;

enum SEARCH_MODE {
  SIMILAR = 'Similar',
  SUBSTRUCTURE = 'Substructure',
  EXACT = 'Exact',
  TEXT = 'Text'
}

enum CATEGORY {
  CSMS = 'CSMS',
  CSMB = 'CSMB',
  CSCS = 'CSCS',
  CSSB = 'CSSB',
  CSSS = 'CSSS',
}

const modeToParam = {[SEARCH_MODE.SIMILAR]: 'sim', [SEARCH_MODE.SUBSTRUCTURE]: 'sub',
  [SEARCH_MODE.TEXT]: 'text', [SEARCH_MODE.EXACT]: 'exact'};

//tags: app
//name: Chemspace
export async function app(): Promise<void> {
  await getApiToken();

  const molecule = ui.input.molecule('', {value: 'c1ccccc1O'});
  const mode = ui.input.choice('Mode', {
    value: SEARCH_MODE.SIMILAR,
    items: Object.values(SEARCH_MODE),
    onValueChanged: () => update(),
  }) as DG.InputBase<SEARCH_MODE>;
  const shipToCountry = ui.input.choice('Ship to country', {
    value: 'United States',
    items: Object.keys(COUNTRY_CODES),
    onValueChanged: () => update(),
  }) as DG.InputBase<string>;
  const category = ui.input.choice('Category', {
    value: CATEGORY.CSCS, items: Object.values(CATEGORY),
    onValueChanged: () => update(),
  }) as DG.InputBase<CATEGORY>;
  const filterForm = ui.form([mode, shipToCountry, category]);
  const filtersHost = ui.div([molecule, filterForm], 'chemspace-controls,ui-form');

  const emptyTable = DG.DataFrame.create();
  const view = grok.shell.addTableView(emptyTable);
  view.name = 'Chemspace';
  view.basePath = '';
  view.description = 'Chemspace search viewer';
  view.root.className = 'grok-view grok-table-view chemspace';

  function update(): void {
    ui.setUpdateIndicator(view.root, true);

    function setDataFrame(t: DG.DataFrame): void {
      if (t.rowCount === 0)
        grok.shell.error('No matches');
      view.dataFrame = t;
      ui.setUpdateIndicator(view.root, false);
    }
    grok.functions.call(`${_package.name}:queryMultipart`, {
      path: `search/${modeToParam[mode.value]}`,
      formParamsStr: JSON.stringify({'SMILES': molecule.value}),
      paramsStr: JSON.stringify({category: category.value,
        shipToCountry: COUNTRY_CODES[shipToCountry.value! as keyof typeof COUNTRY_CODES]}),
    }).then((res) => setDataFrame(DG.DataFrame.fromJson(res)))
      .catch((_) => setDataFrame(emptyTable));
  }

  update();

  molecule.onChanged.subscribe(() => update());
  mode.onChanged.subscribe(() => {
    update();
  });

  const acc = view.toolboxPage.accordion;
  acc.addPane('Chemspace', () => filtersHost, true, acc.panes[0]);
}

//name: Databases | Chemspace
//description: Chemspace Samples
//tags: panel, widgets
//input: string smiles {semType: Molecule}
//output: widget result
//condition: true
export async function samplesPanel(smiles: string): Promise<DG.Widget> {
  const updateSearchResults = (acc: DG.Accordion,
    categoryToData: {[key: string]: {[searchMode in SEARCH_MODE]?: HTMLDivElement}},
    cat: CATEGORY, shipToCountry: COUNTRY_CODES): void => {
    const similarPanel = acc.getPane(SEARCH_MODE.SIMILAR);
    const substructurePanel = acc.getPane(SEARCH_MODE.SUBSTRUCTURE);
    const similarExpanded = similarPanel?.expanded ?? false;
    const substructureExpanded = substructurePanel?.expanded ?? false;
    const cacheKey = getCategoryCacheKey(cat, shipToCountry);
    for (const pane of acc.panes)
      acc.removePane(pane);
    acc.addPane(SEARCH_MODE.SIMILAR, () => {
      categoryToData[cacheKey] ??= {};
      categoryToData[cacheKey]![SEARCH_MODE.SIMILAR] ??=
        createSearchPanel(SEARCH_MODE.SIMILAR, smiles, cat, shipToCountry);
      return categoryToData[cacheKey]![SEARCH_MODE.SIMILAR]!;
    }, similarExpanded);
    acc.addPane(SEARCH_MODE.SUBSTRUCTURE, () => {
      categoryToData[cacheKey] ??= {};
      categoryToData[cacheKey]![SEARCH_MODE.SUBSTRUCTURE] ??=
        createSearchPanel(SEARCH_MODE.SUBSTRUCTURE, smiles, cat, shipToCountry);
      return categoryToData[cacheKey]![SEARCH_MODE.SUBSTRUCTURE]!;
    }, substructureExpanded);
  };

  let panels: HTMLDivElement | null = null;
  try {
    if (DG.chem.isMolBlock(smiles))
      smiles = DG.chem.convert(smiles, DG.chem.Notation.MolBlock, DG.chem.Notation.Smiles);
    await getApiToken();
    const acc = ui.accordion();
    const categoryToData: { [key: string]: { [searchMode in SEARCH_MODE]?: HTMLDivElement } } = {};
    const shipToCountry = ui.input.choice('Ship to country', {
      value: 'United States',
      items: Object.keys(COUNTRY_CODES),
      onValueChanged: (value) => updateSearchResults(acc, categoryToData, category.value,
        COUNTRY_CODES[value as keyof typeof COUNTRY_CODES]),
    }) as DG.InputBase<string>;
    const category = ui.input.choice('Category', {
      value: CATEGORY.CSCS, items: Object.values(CATEGORY),
      onValueChanged: (value) => updateSearchResults(acc, categoryToData, value,
        COUNTRY_CODES[shipToCountry.value! as keyof typeof COUNTRY_CODES]),
    }) as DG.InputBase<CATEGORY>;
    category.fireChanged();
    panels = ui.divV([ui.form([shipToCountry, category]), acc.root]);
  } catch (e: any) {
    panels = ui.divText(e.message ?? e);
  }
  return new DG.Widget(panels);
}

//description: Creates search panel
export function createSearchPanel(searchMode: SEARCH_MODE, smiles: string, category: CATEGORY = CATEGORY.CSCS,
  shipToCountry: COUNTRY_CODES = COUNTRY_CODES['United States']): HTMLDivElement {
  const headerHost = ui.divH([/*ui.h2(panelName)*/], 'chemspace-panel-header');
  const compsHost = ui.div([ui.loader()], 'd4-flex-wrap chem-viewer-grid');
  const panel = ui.divV([headerHost, compsHost], 'chemspace-panel');

  const queryParams: {[key: string]: any} = {
    'shipToCountry': shipToCountry,
    'categories': category,
  };
  grok.functions.call(`${_package.name}:queryMultipart`, {
    path: `search/${modeToParam[searchMode]}`,
    formParamsStr: JSON.stringify({'SMILES': smiles}),
    paramsStr: JSON.stringify(queryParams),
  }).then(async (resStr: string) => {
    const res: ChemspaceResult[] = JSON.parse(resStr);
    compsHost.firstChild?.remove();
    if (res.length === 0) {
      compsHost.appendChild(ui.divText('No matches'));
      return;
    }

    function getTooltip(idx: number): HTMLDivElement {
      const props: {[key: string]: any} = {
        'ID': res[idx].csId,
        'Formula': res[idx].molFormula,
      };
      Object.keys(res[idx].properties).forEach((prop) => props[prop] = (res[idx].properties as any)[prop]);
      return ui.divV([ui.tableFromMap(props), ui.divText('Click to open in the store.')]);
    }

    const smilesCol: DG.Column<string> = DG.Column.string('smiles', res.length).init((i) => res[i].smiles);

    let similarityResult: DG.DataFrame | null = null;
    if (searchMode === SEARCH_MODE.SIMILAR)
      similarityResult = await grok.chem.findSimilar(smilesCol, smiles, {limit: 20, cutoff: 0.1});

    for (let i = 0; i < Math.min((similarityResult ? similarityResult.rowCount : res.length), 20); i++) {
      const idx = searchMode === SEARCH_MODE.SIMILAR ? similarityResult!.get('index', i) : i;
      const smiles = smilesCol.get(idx);
      const molHost = ui.div();
      if (smiles) {
        const res = grok.chem.drawMolecule(smiles, WIDTH, HEIGHT, true);
        molHost.append(res);
        if (searchMode === SEARCH_MODE.SIMILAR)
          molHost.appendChild(ui.divText(`Score: ${similarityResult?.get('score', i).toFixed(2)}`));
      }
      ui.tooltip.bind(molHost, () => getTooltip(idx));
      molHost.addEventListener('click', () => window.open(res[idx].link, '_blank'));
      compsHost.appendChild(molHost);
    }
    headerHost.appendChild(ui.iconFA('arrow-square-down', () => {
      const df = DG.DataFrame.fromJson(JSON.stringify(res));
      df.name = `Chemspace ${searchMode}`;
      grok.shell.addTableView(df);
    }, 'Open compounds as table'));
    compsHost.style.overflowY = 'auto';
  })
    .catch((err) => {
      compsHost.firstChild?.remove();
      const div = ui.divText(err.message ?? err);
      ui.tooltip.bind(div, `${err}`);
      compsHost.appendChild(div);
    });

  return panel;
}

//name: Chemspace Prices
//description: Chemspace Prices
//tags: panel, widgets
//input: string id {semType: chemspace-id}
//output: widget result
//condition: true
export async function pricesPanel(id: string): Promise<DG.Widget> {
  let prices: HTMLDivElement | null = null;
  const resData = ui.div([ui.loader()]);
  const updatePrices = (categoryToData: { [key: string]: HTMLDivElement },
    cat: string, shipToCountry: COUNTRY_CODES): void => {
    ui.empty(resData);
    const cacheKey = getCategoryCacheKey(cat, shipToCountry);
    if (!categoryToData[cacheKey]) {
      resData.append(ui.loader());
      grok.functions.call(`${_package.name}:queryMultipart`, {
        path: `search/${modeToParam[SEARCH_MODE.TEXT]}`,
        formParamsStr: JSON.stringify({'query': id}),
        paramsStr: JSON.stringify({'shipToCountry': shipToCountry, 'categories': cat}),
      }).then(async (resStr: string) => {
        const res: ChemspaceResult[] = JSON.parse(resStr);
        ui.empty(resData);
        if (res.length === 0) {
          resData.appendChild(ui.divText('No matches'));
          return;
        };
        if (res.length > 1) {
          resData.appendChild(ui.divText(`Ambigous results for id ${id}`));
          return;
        };
        const offers = res[0].offers;
        const chemspacePricesArray: ChemspacePricesTableItem[] = [];
        offers.forEach((offer) => {
          for (let i = 0; i < offer.prices.length; i++) {
            chemspacePricesArray.push({
              packMg: offer.prices[i].packMg,
              priceUsd: offer.prices[i].priceUsd,
              priceEur: offer.prices[i].priceEur,
              vendorName: offer.vendorName,
              vendorCode: offer.vendorCode,
              leadTimeDays: offer.leadTimeDays,
              purity: offer.purity,
            });
          }
        });
        const table = DG.DataFrame.fromJson(JSON.stringify(chemspacePricesArray));
        //setting format for money columns
        ['priceUsd', 'priceEur'].forEach((name: string) => {
            table.col(name)!.semType = 'Money';
            if (name === 'priceUsd')
              table.col(name)!.meta.format = 'money($)';
        });
        const grid = DG.Grid.create(table);
        grid.root.classList.add('chemspace-prices-grid');
        const button = ui.bigButton('ORDER', () => window.open(res[0].link, '_blank'));
        button.classList.add('chemspace-order-button');
        resData.append(grid.root);
        resData.append(button);
      })
        .catch((err: any) => {
          ui.empty(resData);
          resData.append(ui.divText(err.message ?? err));
        });
    } else
      resData.append(categoryToData[cacheKey]);
  };
  try {
    await getApiToken();
    const categoryToData: { [key: string]: HTMLDivElement } = {};
    const shipToCountry = ui.input.choice('Ship to country', {
      value: 'United States',
      items: Object.keys(COUNTRY_CODES),
      onValueChanged: (value) => updatePrices(categoryToData,
        Object.keys(CATEGORY).join(','), COUNTRY_CODES[value as keyof typeof COUNTRY_CODES]),
    }) as DG.InputBase<string>;
    shipToCountry.fireChanged();
    prices = ui.divV([ui.form([shipToCountry]), resData]);
  } catch (e: any) {
    prices = ui.divText(e.message ?? e);
  }
  return new DG.Widget(prices);
}

//description: Gets access token
async function getApiToken(): Promise<void> {
  if (token === null) {
    const t = await grok.data.query('Chemspace:AuthToken', null, true);
    token = t.get('access_token', 0) as string;
  }
}

//description: Perform query with multipart form data
//meta.cache: all
//meta.cache.invalidateOn: 0 0 1 * *
//input: string path
//input: string formParamsStr
//input: string paramsStr {optional: true}
//output: string result
export async function queryMultipart(path: string, formParamsStr: string, paramsStr?: string): Promise<string> {
  const formParams: { [key: string]: string } = JSON.parse(formParamsStr);
  const params: { [key: string]: string | number } | undefined = paramsStr ? JSON.parse(paramsStr) : undefined;

  const formData = new FormData();
  Object.keys(formParams).forEach((key) => formData.append(key, formParams[key]));
  const queryUrlParams = params ? `?${Object.keys(params).map((key) => `${key}=${params[key]}`).join('&')}` : '';
  const url = `${host}/v4/${path}${queryUrlParams}`;

  const queryParams = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json; version=2.6',
    },
    body: formData,
  };

  try {
    let response = await grok.dapi.fetchProxy(url, queryParams);
    let totalAttempts = 10;
    let attemptsCount = 0;
    const delayMs = 1000;
    if (!response.ok) {
      if (response.status === 429) {
        while (response.status === 429 && totalAttempts > 0) {
          totalAttempts--;
          attemptsCount++;
          await delay(delayMs * attemptsCount);
          response = await grok.dapi.fetchProxy(url, queryParams);
          if (!response.ok && response.status !== 429)
            throw new Error(`${response.status}, ${response.statusText}`);
        }
      } else
        throw new Error(`${response.status}, ${response.statusText}`);
    }
    const list: ChemspaceResult[] = (await response.json()).items;
    return JSON.stringify(list && list.length > 0 ? list : []);
  } catch (e) {
    throw e;
  }
}

function getCategoryCacheKey(cat: string, shipToCountry: COUNTRY_CODES): string {
  return `${cat}|${shipToCountry}`;
}

//name: getChemspaceIds
//meta.vectorFunc: true
//input: column<string> molColumn {semType: Molecule}
//input: string shipToCountry
//output: column result
export async function getChemspaceIds(molColumn: DG.Column, shipToCountry: string): Promise<DG.Column | undefined> {
  const pi = DG.TaskBarProgressIndicator.create(`Getting Chemspace ids for ${molColumn.name}...`);
  try {
    await getApiToken();
    const ids = Array<string>(molColumn.length);
    for (let i = 0; i < molColumn.length; i++) {
      let smiles = molColumn.get(i);
      if (DG.chem.isMolBlock(smiles))
        smiles = DG.chem.convert(smiles, DG.chem.Notation.MolBlock, DG.chem.Notation.Smiles);
      const queryParams: {[key: string]: any} = {
        'shipToCountry': shipToCountry,
        'categories': 'CSMS, CSMB, CSCS, CSSB, CSSS',
      };
      try {
        const resStr = await grok.functions.call(`${_package.name}:queryMultipart`, {
          path: `search/${modeToParam[SEARCH_MODE.EXACT]}`,
          formParamsStr: JSON.stringify({'SMILES': smiles}),
          paramsStr: JSON.stringify(queryParams),
        });
        const res = JSON.parse(resStr);
        ids[i] = res.length ? res[0].csId : '';
      } catch (e: any) {
        ids[i] = `Error: ${e.message ?? e}`;
      }
      pi.update(i/molColumn.length*100, `Got ${i} Chemspace ids from ${molColumn.length}`);
    };
    pi.close();
    return DG.Column.fromStrings('csIds', ids);
  } catch (e: any) {
    grok.shell.error(e.message ?? e);
  } finally {
    pi.close();
  }
}

//name: getChemspacePrices
//input: dataframe data
//input: column<string> idsColumn {semType: chemspace-id}
//input: string shipToCountry
//output: dataframe res {action:join(data)}
export async function getChemspacePrices(data: DG.DataFrame, idsColumn: DG.Column,
  shipToCountry: string): Promise<DG.DataFrame | undefined> {
  const pi = DG.TaskBarProgressIndicator.create(`Getting Chemspace prices for ${idsColumn.name}...`);
  try {
    await getApiToken();
    const ids = idsColumn.toList().join(',');
    const queryParams: {[key: string]: any} = {
      'shipToCountry': shipToCountry,
      'categories': 'CSMS, CSMB, CSCS, CSSB, CSSS',
      'count': idsColumn.length,
    };
    const resStr = await grok.functions.call(`${_package.name}:queryMultipart`, {
      path: `search/${modeToParam[SEARCH_MODE.TEXT]}`,
      formParamsStr: JSON.stringify({'query': ids}),
      paramsStr: JSON.stringify(queryParams),
    });
    const res: ChemspaceResult[] = JSON.parse(resStr);
    const resDict: {[key: string]: ChemspacePriceColumns | null} = {};

    const select100MgOffer = (offers: ChemspaceOffer[]): ChemspacePriceColumns | null => {
      for (const offer of offers) {
        if (offer.prices.length) {
          return {
            vendorName: offer.vendorName,
            leadTimeDays: offer.leadTimeDays ?? 0,
            priceUsd: offer.prices[0].priceUsd!,
            packMg: offer.prices[0].packMg,
          };
        }
      }
      return null;
    };

    for (let i = 0; i < res.length; i++)
      resDict[res[i].csId] = select100MgOffer(res[i].offers);

    const vendorCol = DG.Column.string('Vendor', idsColumn.length);
    const leadTime = DG.Column.int('Lead time, days', idsColumn.length);
    const mgCol = DG.Column.float('Pack, mg', idsColumn.length);
    const priceCol = DG.Column.float('Price, USD', idsColumn.length);
    priceCol.semType = 'Money';
    priceCol.meta.format = 'money($)';
    for (let i = 0; i < idsColumn.length; i++) {
      const offer = resDict[idsColumn.get(i)];
      if (offer) {
        vendorCol.set(i, offer.vendorName, false);
        priceCol.set(i, offer.priceUsd, false);
        leadTime.set(i, offer.leadTimeDays ?? null, false);
        mgCol.set(i, offer.packMg, false);
      }
    }
    return DG.DataFrame.fromColumns([vendorCol, mgCol, priceCol, leadTime]);
  } catch (e: any) {
    grok.shell.error(e.message ?? e);
  } finally {
    pi.close();
  }
}
