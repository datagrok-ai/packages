import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {closeAllAccordionPanes, demoScaffold, getAccordionPane, openMoleculeDataset,
  openSketcher, scrollTable} from '../utils/demo-utils';
import {DemoScript} from '@datagrok-libraries/tutorials/src/demo-script';
import {awaitCheck, delay} from '@datagrok-libraries/utils/src/test';
import {_importSdf} from '../open-chem/sdf-importer';
import {_package, mmpAnalysis} from '../package';
import {rGroupAnalysis} from '../analysis/r-group-analysis';
import {CLIFFS_DF_NAME, activityCliffsIdx, getActivityCliffs} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import {createPropPanelElement, createTooltipElement} from '../analysis/activity-cliffs';
import {BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {getEmbeddingColsNames} from
  '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';

export async function _demoChemOverview(): Promise<void> {
  const sketcherType = DG.chem.currentSketcherType;
  DG.chem.currentSketcherType = 'OpenChemLib';

  const firstCols = [
    'smiles',
    'MolWt',
    'ExactMolWt',
    'NOCount',
    'RingCount',
  ];
  const lastCols = [
    'NumRadicalElectrons',
    'MinPartialCharge',
    'MaxAbsPartialCharge',
    'NHOHCount',
    'NumSaturatedCarbocycles',
    'NumAliphaticHeterocycles',
    'FpDensityMorgan1',
    'NumAromaticHeterocycles',
    'NumValenceElectrons',
    'NumRotatableBonds',
    'NumAromaticCarbocycles',
    'NumAliphaticCarbocycles',
    'NumHDonors',
    'FpDensityMorgan3',
    'NumAromaticRings',
    'HeavyAtomMolWt',
    'NumSaturatedRings',
    'NumHAcceptors',
    'NumHeteroatoms',
    'NumSaturatedHeterocycles',
    'NumAliphaticRings',
    'MaxPartialCharge',
    'FpDensityMorgan2',
    'FractionCSP3',
    'HeavyAtomCount'];

  const demoScript = new DemoScript('Overview', 'Overview of Cheminformatics functionality',
    undefined, {autoStartFirstStep: true});
  let table: DG.DataFrame;
  let tv: DG.TableView;
  let propPanel: Element;
  let canvas: HTMLCanvasElement;
  let filters: DG.FilterGroup;
  demoScript
    .step('Load molecules', async () => {
      tv = await openMoleculeDataset('demo_files/demo_smiles.csv');
      tv.grid.columns.setOrder(firstCols.concat(lastCols));
      grok.shell.windows.showHelp = false;
      table = tv.dataFrame;
    }, {description: 'Load dataset with molecule columns', delay: 3000})
    .step('Calculate molecule properties', async () => {
      await delay(1000);
      grok.shell.windows.showHelp = false; //for some reason help panel appears again, need to hide it
      propPanel = document.getElementsByClassName('grok-entity-prop-panel')[0];
      closeAllAccordionPanes(propPanel!);
      const structurePaneContent = getAccordionPane('Structure', propPanel!);
      getAccordionPane('3D Structure', structurePaneContent!);
      const biologyPaneContent = getAccordionPane('Biology', propPanel!);
      getAccordionPane('Toxicity', biologyPaneContent!);
      await delay(3000);
      grok.shell.windows.showHelp = false;
      table.currentRowIdx = 5;
      grok.shell.windows.showHelp = false;
      await delay(3000);
      table.currentRowIdx = 3;
    }, {description: 'Molecules properties are re-calculating when changing current molecule', delay: 3000})
    .step('Fast rendering', async () => {
      await delay(1000);
      canvas = tv.grid.root.getElementsByTagName('canvas')[2];
      await scrollTable(canvas, 20000, 50, 20);
    }, {description: 'Molecules are rendered immediately when scrolling dataset', delay: 2000})
    .step('Filter molecules by substructure', async () => {
      await delay(1000);
      filters = tv.getFiltersGroup();
      await delay(1000);
      const sketcherDlg = await openSketcher(filters.root, 'sketch-link');
      const sketcherInput = sketcherDlg!
        .getElementsByClassName('grok-sketcher-input')[0]?.children[0] as HTMLInputElement;
      sketcherInput.value = 'C1CCCCC1';
      await delay(1000);
      sketcherInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      Array.from(sketcherDlg!.getElementsByTagName('span')).find((el) => el.textContent === 'OK')?.click();
    }, {description: 'Filtering dataset by substructure', delay: 2000})
    .step('Align by scaffold', async () => {
      filters.close();
      await delay(1000);
      grok.shell.o = tv.dataFrame.col('smiles');
      await delay(2000);
      grok.shell.windows.showHelp = false;
      closeAllAccordionPanes(propPanel!);
      const chemistryPaneContent = getAccordionPane('Chemistry', propPanel!);
      const renderingPaneContent = getAccordionPane('Rendering', chemistryPaneContent!) as HTMLElement;
      await delay(1000);
      const scaffoldSketcher = await openSketcher(renderingPaneContent, 'sketch-link');
      const scaffoldSketcherInput = scaffoldSketcher!
        .getElementsByClassName('grok-sketcher-input')[0]?.children[0] as HTMLInputElement;

      let dT = null;
      try {dT = new DataTransfer();} catch (e) { }
      const evt = new ClipboardEvent('paste', {clipboardData: dT});
            evt.clipboardData!.setData('text/plain', demoScaffold);
            scaffoldSketcherInput.value = demoScaffold;
            await delay(100);
            scaffoldSketcherInput.dispatchEvent(evt);
            Array.from(scaffoldSketcher!.getElementsByTagName('span')).find((el) => el.textContent === 'OK')?.click();
    }, {description: 'Aligning structures by scaffold', delay: 1000})
    .step('Add sparkline columns', async () => {
      tv.grid.columns.add({gridColumnName: `radar`, cellType: 'radar'});
      tv.grid.columns.add({gridColumnName: `barchart`, cellType: 'barchart'});
      tv.grid.columns.setOrder(firstCols.concat(['radar', 'barchart']).concat(lastCols));
      tv.grid.scrollToCell('MolWt', 0);
    })
    .step('Add color coding', async () => {
            table.col('MolWt')!.meta.colors.setLinear();
            table.col('NOCount')!.meta.colors.setConditional({'0 - 6.25': '#73aff5', '6.25 - 12.50': '#ffa500', '12.50 - 18.75': '#ff5140', '18.75 - 25': '#50af28'});
            table.col('RingCount')!.meta.colors.setConditional();
            grok.shell.windows.showHelp = true;
            //@ts-ignore
            grok.shell.windows.help.showHelp('/help/datagrok/solutions/domains/chem/chem');
            DG.chem.currentSketcherType = sketcherType;
    })
    .start();
}


export async function _demoSimilaritySearch(): Promise<void> {
  const demoScript = new DemoScript('Demo', 'Searching for molecules most similar to target molecule');
  let table: DG.DataFrame;
  let tv: DG.TableView;
  demoScript
    .step('Load data', async () => {
      tv = await openMoleculeDataset('smiles.csv');
      table = tv.dataFrame;
      grok.shell.windows.showContextPanel = false;
      grok.shell.windows.showHelp = false;
    }, {description: 'Load dataset with molecule columns', delay: 2000})
    .step('Show molecules, most similar to the current', async () => {
      await delay(1000);
      const similarityViewer = tv.addViewer('Chem Similarity Search');
      grok.shell.o = similarityViewer;
    }, {description: 'Open similarity search viewer. Selected molecule becomes target.', delay: 2000})
    .step('Change target molecule', async () => {
      table.currentRowIdx = 2;
      await delay(3000);
      table.currentRowIdx = 10;
      await delay(3000);
      table.currentRowIdx = 3;
    }, {description: 'Fast similarity search re-calculating when changing current molecule', delay: 3000})
    .step('Final', async () => console.log('Finished'))
    .start();
}


export async function _demoSimilarityDiversitySearch(): Promise<void> {
  const tv = await openMoleculeDataset('demo_files/smiles.csv');
  _package.files.readAsText('demo_files/similarity_diversity.layout').then(async (layoutString: string) => {
    const layout = DG.ViewLayout.fromJson(layoutString);
    await delay(100);
    tv.loadLayout(layout);
  });
  grok.shell.windows.showHelp = true;
  //@ts-ignore
  grok.shell.windows.help.showHelp('/help/datagrok/solutions/domains/chem/chem');
}


export async function _demoMMPA(): Promise<void> {
  const tv = await openMoleculeDataset('demo_files/mmp_demo.csv');
  await mmpAnalysis(tv.dataFrame, tv.dataFrame.col('smiles')!,
    tv.dataFrame.clone().columns.remove('smiles').remove('CMPD_CHEMBLID'), 0.5);
  grok.shell.windows.showHelp = true;
  //@ts-ignore
  //grok.shell.windows.help.showHelp('/help/datagrok/solutions/domains/chem/#matched-molecular-pairs');
}


export async function _demoMoleculesVisualizations(): Promise<void> {
  const demoScript = new DemoScript('Demo', 'Creating various viewers on molecule columns');
  let table: DG.DataFrame;
  let tv: DG.TableView;
  demoScript
    .step('Loading table', async () => {
      tv = await openMoleculeDataset('r-groups.csv');
      table = tv.dataFrame;
      grok.shell.windows.showContextPanel = false;
      grok.shell.windows.showHelp = false;
    }, {description: 'Load dataset with molecule columns', delay: 2000})
    .step('Adding scatter plot', async () => {
      await delay(1000);
      tv.scatterPlot({x: 'R2', y: 'R1', jitterSize: 4, size: 'MolWt'});
    }, {description: 'Adding a scatter plot with molecule columns for x and y axes', delay: 2000})
    .step('Filtering data', async () => {
      tv.getFiltersGroup();
      await delay(1000);
      const startMolwt = 240;
      const stopMolWt = 350;
      for (let i = startMolwt; i < stopMolWt; i + 20) {
        tv.dataFrame.rows.match(`ExactMolWt > ${i}`).filter();
        await delay(500);
      }
    }, {description: 'Results of filtering are interactively shown on scatter plot', delay: 3000})
    .step('Final', async () => console.log('Finished'))
    .start();
}


export async function _demoRgroupAnalysis(): Promise<void> {
  const demoScript = new DemoScript('R-Group Analysis', 'Performing R Group Analysis',
    undefined, {autoStartFirstStep: true});
  let table: DG.DataFrame;
  let tv: DG.TableView;
  let sketcherInput: HTMLInputElement;
  let sketcher: Element;

  const findTrellisPlot = () => {
    for (const viewer of tv.viewers) {
      if (viewer.type === DG.VIEWER.TRELLIS_PLOT)
        return viewer;
    }
    return null;
  };

  demoScript
    .step('Load data', async () => {
      tv = await openMoleculeDataset('demo_files/sar_small.csv');
      table = tv.dataFrame;
      grok.shell.windows.showContextPanel = false;
      grok.shell.windows.showHelp = false;
    }, {description: 'Load dataset with molecule columns', delay: 2000})
    .step('Specify scaffold', async () => {
      await delay(1000);
      rGroupAnalysis(table.col('smiles')!);
      await delay(2000);
      sketcher = document.getElementsByClassName('d4-dialog')[0];
      sketcherInput = sketcher!.getElementsByClassName('grok-sketcher-input')[0]?.children[0] as HTMLInputElement;
      sketcherInput.value = 'O=C1CN=C(c2ccccc2N1)C3CCCCC3';
      sketcherInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    }, {description: 'Open R Group Analysis viewer and enter scaffold structure', delay: 2000})
    .step('Analyse R Groups', async () => {
      const dlgOKButton = Array.from(sketcher!.getElementsByTagName('span')).find((el) => el.textContent === 'OK');
      if (dlgOKButton)
        dlgOKButton.click();
      await awaitCheck(() => {
        return !!findTrellisPlot();
      },
      'r group analysis has not been loaded', 30000);
    }, {description: 'Trellis plot is created from R Group Analysis results', delay: 2000})
    .step('Explore results in various viewers', async () => {
      await delay(1000);
      tv.scatterPlot({x: 'R1', y: 'R2', jitterSize: 4, size: 'LD(50)', color: 'Mol Wt.', autoAxisSize: false});
      tv.barChart({split: 'R1'});
    }, {description: 'Any other type of viewer can be easily created on R Group analysis results', delay: 2000})
    .start();
}


export async function _demoActivityCliffs(): Promise<void> {
  const demoScript = new DemoScript('Activity Cliffs',
    'Searching similar structures with significant activity difference', undefined, {autoStartFirstStep: true});
  let table: DG.DataFrame;
  let tv: DG.TableView;
  let scatterPlot: DG.Viewer;
  demoScript
    .step('Load data', async () => {
      tv = await openMoleculeDataset('demo_files/sar_small.csv');
      table = tv.dataFrame;
    }, {description: 'Load dataset with molecule and activity columns.', delay: 2000})
    .step('Find activity cliffs', async () => {
      const molecules = table.col('smiles')!;
      const progressBar = DG.TaskBarProgressIndicator.create(`Activity cliffs running...`);
      const axesNames = getEmbeddingColsNames(table);
      const encodingFunc = DG.Func.find({name: 'getFingerprints', package: 'Chem'})[0];
      scatterPlot = await getActivityCliffs(table, molecules, axesNames, 'Activity cliffs',
        table.col('In-vivo Activity')!, 78, BitArrayMetricsNames.Tanimoto, DimReductionMethods.T_SNE, {},
        DG.SEMTYPE.MOLECULE, {'units': molecules.meta.units!}, encodingFunc,
        createTooltipElement, createPropPanelElement, undefined, 0.5);
      progressBar.close();
      await delay(1000);
    }, {description: `Results are shown on a scatter plot. Each point on a scatter plot corresponds to a molecule from a dataset.
    Pairs of molecules with similarity higher than specified cutoff, are connected by lines. Marker color corresponds to molecule activity.
    Line opacity corresponds to molecule pair SALI value (Structure−Activity Landscape Index - activity difference divided by 1 minus similarity).
    Marker size corresponds to highest SALI value detected for the molecule.`, delay: 2000})
    .step('Explore activity cliffs', async () => {
      await delay(1000);
      (Array.from(scatterPlot!.root.children)
        .filter((it) => it.className === 'ui-btn ui-btn-ok scatter_plot_link cliffs_grid')[0] as HTMLElement).click();
      await delay(1000);
    }, {description: `Detected cliffs are available in a separate table. 
    Cliffs are pairs of molecules with similarity higher than cutoff. Cliffs are sorted by SALI value.`, delay: 2000})
    .step('Select cliffs', async () => {
      await delay(1000);
      let cliffsGrid: DG.Viewer | null = null;
      for (const i of tv.viewers) {
        if (i.dataFrame.name === `${CLIFFS_DF_NAME}${activityCliffsIdx}`)
          cliffsGrid = i;
      }
            cliffsGrid!.dataFrame.currentRowIdx = 35;
            await delay(3000);
            cliffsGrid!.dataFrame.currentRowIdx = 6;
            await delay(3000);
            cliffsGrid!.dataFrame.currentRowIdx = 5;
    }, {description: `To zoom scatter plot to exact cliff, click on a row in the cliffs table. 
    Additional information about molecule pair is on the context panel. Non common fragments are highlighted in molecules.`, delay: 3000})
    .start();
}


export async function _demoDatabases(): Promise<void> {
  const ids = ['O=C(C)Oc1ccccc1C(=O)O', 'NC1=NC=NC2=C1N=CN2', 'CC(=O)O'];
  const sketcherType = DG.chem.currentSketcherType;
  DG.chem.currentSketcherType = 'OpenChemLib';

  const properties = [
    {
      'name': 'pattern',
      'type': 'string',
      'semType': 'Molecule',
    },
    {
      'name': 'threshold',
      'type': DG.TYPE.FLOAT,
    },
  ];

  const props = properties.map((p) => DG.Property.fromOptions(p));

  const object = {
    pattern: '',
    threshold: 0.5,
  };

  const form = ui.input.form(object, props);
  form.classList.add('ui-form-condensed');
  form.style.minWidth = '0px';
  form.style.width = '130px';

  const queryName = ui.divText('Similarity search with threshold', {style: {width: '140px', fontWeight: 'bold'}});
  const runButton = ui.bigButton('RUN', async () => {
    await runQuery();
  });
  runButton.style.width = '130px';
  const queryDiv = ui.divV([
    queryName,
    form,
    runButton,
  ]);

  const gridDiv = ui.box(null, {style: {width: '100%', height: '100%', marginLeft: '30px'}});

  const totalDiv = ui.divH([
    queryDiv,
    gridDiv,
  ], {style: {height: '100%', width: '100%'}});

  const loading = (isLoading: boolean) => {
    ui.setUpdateIndicator(gridDiv, isLoading);
  };

  const loadNewQuery = async (id: string) => {
    const parent = document.getElementsByClassName('ui-form-condensed')[0] as HTMLElement;
    const sketcherDlg = await openSketcher(parent, 'd4-input-molecule-canvas-host');
    const sketcherInput = sketcherDlg!
      .getElementsByClassName('grok-sketcher-input')[0]?.children[0] as HTMLInputElement;
    sketcherInput.value = id;
    await delay(1000);
    sketcherInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    await delay(1000);
    Array.from(sketcherDlg!.getElementsByTagName('span')).find((el) => el.textContent === 'OK')?.click();
    await delay(1000);
    runButton.classList.add('chem-demo-button-pushed');
    await delay(1000);
    runButton.classList.remove('chem-demo-button-pushed');
  };

  const runQuery = async () => {
    ui.empty(gridDiv);
    loading(true);
    const t = await grok.data.query('Chembl:patternSimilaritySearchWithThreshold',
      {'pattern': object.pattern, 'threshold': `${object.threshold}`});
    await grok.data.detectSemanticTypes(t);
    const grid = t.plot.grid().root;
    loading(false);
    gridDiv.append(grid);
    await delay(1500);
  };

  const search = async (id: string) => {
    await delay(1000);
    await loadNewQuery(id);
    await runQuery();
  };

  const demoScript = new DemoScript('Demo', 'Searching chemical databases');
  demoScript
    .step('Performing search in databases', async () => {
      const view = grok.shell.addView(DG.View.create());
      view.root.append(totalDiv);
    }, {description: `Datagrok allows you to connect various chemical databases and easily 
        perform searches. You can create your own requests using various inputs. 
        As an example we will browse CheMBL database and perform substructure search`, delay: 5000})
    .step('Searching first substructure', async () => {
      await search(ids[0]);
    }, {description: 'Entering substructure via standard molecule input form and performing search by clicking \'RUN\'',
      delay: 2000})
    .step('Searching second substructure', async () => {
      await search(ids[1]);
    }, {description: 'Repeat the same for some other substructure'})
    .step('Searching third substructure', async () => {
      await search(ids[2]);
    }, {description: 'And one more search'})
    .step('Final', async () => {DG.chem.currentSketcherType = sketcherType;})
    .start();
}


export async function _demoDatabases2(): Promise<void> { //Databases integration in property panel
  const table = _importSdf(await _package.files.readAsBytes('mol1K.sdf'))[0];
  grok.shell.windows.showProperties = true;
  grok.shell.windows.showHelp = false;

  //1. Open table
  grok.shell.addTableView(table);
  await delay(2000);

  //2. Open tabs on property panel
  const propPanel = document.getElementsByClassName('grok-entity-prop-panel')[0];
  closeAllAccordionPanes(propPanel!);
  const databasesPaneContent = getAccordionPane('Databases', propPanel!);
    getAccordionPane('ChEMBL (Internal) Substructure Search', databasesPaneContent!) as HTMLElement;
    getAccordionPane('ChEMBL (Internal) Similarity Search', databasesPaneContent!) as HTMLElement;
    await delay(3000);
    table.currentRowIdx = 2;
    await delay(3000);
    table.currentRowIdx = 5;
}


export async function _demoDatabases3(): Promise<void> {
  const ids = ['CHEMBL1827', 'CHEMBL1829', 'CHEMBL1830'];
  const query = `SELECT m.chembl_id AS compound_chembl_id, s.canonical_smiles, act.standard_type, act.standard_value
    FROM compound_structures s, molecule_dictionary m, compound_records r, docs d,
    activities act, assays a, target_dictionary t
    WHERE s.molregno     = m.molregno
    AND m.molregno       = r.molregno
    AND r.record_id      = act.record_id
    AND r.doc_id         = d.doc_id
    AND act.assay_id     = a.assay_id
    AND a.tid            = t.tid
    AND act.standard_type = 'IC50'
    AND t.chembl_id      = '~id~';`;

  const connection = await grok.functions.eval('Chembl:Chembl');
  const queryPanel = ui.box();
  const gridDiv = ui.div();
  const scatterPlot = ui.div();
  const barchart = ui.div();

  const totalDiv = ui.splitV([
    queryPanel,
    gridDiv,
    ui.splitH([
      scatterPlot,
      barchart,
    ]),
  ], {style: {height: '100%', width: '100%'}});

  const loading = (isLoading: boolean) => {
    ui.setUpdateIndicator(gridDiv, isLoading);
    ui.setUpdateIndicator(scatterPlot, isLoading);
    ui.setUpdateIndicator(barchart, isLoading);
  };

  const loadNewQuery = (id: string) => {
    ui.empty(queryPanel);
    const queryDiv = ui.input.textArea(`Compound activity details for target = ${id}`, {value: query.replace(`~id~`, id)});
    queryDiv.input.style.height = '100%';
    queryPanel.append(queryDiv.root);
    const dBQuery = connection!.query('', query.replace(`~id~`, id));
    dBQuery.adHoc = true;
    ui.empty(gridDiv);
    ui.empty(scatterPlot);
    ui.empty(barchart);
    loading(true);
    return dBQuery;
  };

  const loadQueryResults = async (t: DG.DataFrame) => {
    await grok.data.detectSemanticTypes(t);
    const grid = t.plot.grid().root;
    grid.style.width = '100%';
    loading(false);
    gridDiv.append(grid);
    barchart.append(t.plot.bar().root);
    scatterPlot.append(t.plot.scatter().root);
    await delay(1500);
  };


  grok.shell.newView('Databases', [totalDiv]);

  setTimeout(async () => {
    for (const id of ids) {
      const t = await loadNewQuery(id).executeTable();
      await loadQueryResults(t);
    }
  }, 500);
}


export async function _demoDatabases4(): Promise<void> {
  const query = `--name: compound activity details for target 
--connection: Chembl
--input: string target_name = "Acetylcholinesterase" {choices: Query("SELECT distinct pref_name from target_dictionary limit 300 offset 309;")}
--input: string target_id = '93' {choices: Query("SELECT distinct tid::int from target_dictionary where pref_name = @target_name;")}
--input: string substructure = "NC1=CC(=O)c2ccccc2C1=O" {semType: Substructure}
--input: string activity_type = "IC50"

SELECT canonical_smiles, description, standard_inchi, t.target_type, c.molregno, a.chembl_id, a.assay_id FROM assays a  
JOIN target_dictionary t on a.tid = t.tid 
JOIN activities act on a.assay_id = act.assay_id
JOIN compound_structures c on act.molregno = c.molregno
WHERE t.tid = CAST(@target_id as integer)
AND c.canonical_smiles::mol @>@substructure::qmol
AND act.type = @activity_type
LIMIT 50
--end`;

  const connection: DG.DataConnection = await grok.functions.eval('Chembl:Chembl');

  const dBQuery = connection!.query('', query);
  const funccall = dBQuery.prepare();
  const editor = await funccall.getEditor();
  const runButton = ui.bigButton('RUN', async () => {
    await runQuery();
  });

  const runQuery = async () => {
    ui.setUpdateIndicator(gridDiv, true);
    await funccall.call();
    const data: DG.DataFrame = funccall.getOutputParamValue();
    await grok.data.detectSemanticTypes(data);
    const grid = data.plot.grid().root;
    grid.style.width = '100%';
    grid.style.height = '100%';
    ui.empty(gridDiv);
    gridDiv.append(grid);
    ui.setUpdateIndicator(gridDiv, false);
  };

  runButton.style.width = '150px';
  runButton.style.marginLeft = '80px';

  const queryPanel = ui.input.textArea('', {value: query});
  queryPanel.input.style.width = '100%';
  queryPanel.input.style.minHeight = '350px';
  const gridDiv = ui.div('', {style: {position: 'relative', height: '100%'}});

  const tabControl = ui.tabControl({
    'Query Input Form': ui.divV([
      editor,
      runButton,
    ]),
    'Query SQL': queryPanel,
  });
  tabControl.root.style.width = '100%';
  tabControl.root.style.height = '310px';

  const totalDiv = ui.divV([
    tabControl.root,
    gridDiv,
  ], {style: {height: '100%', width: '100%'}});

  const view = grok.shell.addView(DG.View.create());
  view.name = 'Chemical Databases';
  view.root.append(totalDiv);
  setTimeout(() => runQuery(), 0);
}


export async function _demoDatabases5(): Promise<void> {
  const ids = ['CHEMBL1827', 'CHEMBL1829', 'CHEMBL1830'];
  const query = `SELECT m.chembl_id AS compound_chembl_id,
    s.canonical_smiles,
    r.compound_key,
    coalesce(d.pubmed_id::text, d.doi) AS pubmed_id_or_doi,
    a.description                   AS assay_description,   act.standard_type,
    act.standard_relation,
    act.standard_value,
    act.standard_units,
    act.activity_comment
    FROM compound_structures s, molecule_dictionary m, compound_records r, docs d, activities act,
    assays a, target_dictionary t
    WHERE s.molregno     = m.molregno
    AND m.molregno       = r.molregno
    AND r.record_id      = act.record_id
    AND r.doc_id         = d.doc_id
    AND act.assay_id     = a.assay_id
    AND a.tid            = t.tid
    AND act.standard_type = 'IC50'
    AND act.standard_relation = '='
    AND act.standard_units = 'nM'
    AND t.chembl_id      = '~id~'
    limit 500;`;

  const properties = [
    {
      'name': 'target',
      'type': 'string',
    },
    {
      'name': 'standardType',
      'type': 'string',
    },
    {
      'name': 'standardRelation',
      'type': 'string',
    },
    {
      'name': 'standardUnits',
      'type': 'string',
    },
    {
      'name': 'limit',
      'type': DG.TYPE.FLOAT,
    },
  ];

  const props = properties.map((p) => DG.Property.fromOptions(p));

  const object = {
    target: 'CHEMBL1827',
    standardType: 'IC50',
    standardRelation: '=',
    standardUnits: 'nM',
    limit: 500,
  };

  const form = ui.input.form(object, props);
  form.classList.add('ui-form-condensed');
  form.style.minWidth = '0px';
  form.style.width = '130px';

  const queryName = ui.divText('Compound details for target', {style: {width: '140px', fontWeight: 'bold'}});
  const runButton = ui.bigButton('RUN', () => { });
  runButton.style.width = '130px';
  const queryDiv = ui.divV([
    queryName,
    form,
    runButton,
  ]);

  const gridDiv = ui.box(null, {style: {width: '100%', height: '100%', marginLeft: '30px'}});
  const scatterPlot = ui.box();
  const barchart = ui.box(null, {style: {marginLeft: '50px'}});

  const totalDiv = ui.splitV([
    ui.divH([
      queryDiv,
      gridDiv,
    ]),
    ui.splitH([
      scatterPlot,
      barchart,
    ]),
  ], {style: {height: '100%', width: '100%'}});

  const loading = (isLoading: boolean) => {
    ui.setUpdateIndicator(gridDiv, isLoading);
    ui.setUpdateIndicator(scatterPlot, isLoading);
    ui.setUpdateIndicator(barchart, isLoading);
  };

  const connection: DG.DataConnection = await grok.functions.eval('Chembl:Chembl');

  const loadNewQuery = async (id: string) => {
    const idInput = form.children[0].getElementsByClassName('ui-input-editor')[0];
    //@ts-ignore
    idInput.value = id;
    idInput.classList.add('chem-demo-chembl-id-selected');
    await delay(1000);
    runButton.classList.add('chem-demo-button-pushed');
    await delay(1000);
    idInput.classList.remove('chem-demo-chembl-id-selected');
    runButton.classList.remove('chem-demo-button-pushed');
    const dBQuery = connection!.query('', query.replace(`~id~`, id));
    dBQuery.adHoc = true;
    ui.empty(gridDiv);
    ui.empty(scatterPlot);
    ui.empty(barchart);
    loading(true);
    return dBQuery;
  };

  const loadQueryResults = async (t: DG.DataFrame) => {
    await grok.data.detectSemanticTypes(t);
    const grid = t.plot.grid().root;
    loading(false);
    gridDiv.append(grid);
    barchart.append(t.plot.bar().root);
    scatterPlot.append(t.plot.scatter().root);
    await delay(1500);
  };

  grok.shell.newView('Databases', [totalDiv]);

  setTimeout(async () => {
    for (const id of ids) {
      const t = await (await loadNewQuery(id)).executeTable();
      await loadQueryResults(t);
    }
  }, 500);
}

export async function _demoScaffoldTree(): Promise<void> {
  const tv: DG.TableView = await openMoleculeDataset('mol1K.csv');
  _package.files.readAsText('demo_files/scaffold_tree.layout').then((layoutString: string) => {
    const layout = DG.ViewLayout.fromJson(layoutString);
    tv.loadLayout(layout);
  });
  grok.shell.windows.showHelp = true;
  grok.shell.windows.help.showHelp('help/datagrok/solutions/domains/chem/chem#scaffold-tree-analysis');
}
