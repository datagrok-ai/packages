import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {closeAllAccordionPanes, demoScaffold, getAccordionPane, openMoleculeDataset,
  openSketcher, scrollTable} from '../utils/demo-utils';
import {DemoScript} from '@datagrok-libraries/tutorials/src/demo-script';
import {awaitCheck, delay} from '@datagrok-libraries/utils/src/test';
import {_importSdf} from '../open-chem/sdf-importer';
import {_package, activityCliffs} from '../package';
import {rGroupAnalysis} from '../analysis/r-group-analysis';
import {CLIFFS_DF_NAME, activityCliffsIdx} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import {BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {ScaffoldTreeViewer} from '../widgets/scaffold-tree';


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
  await demoScript
    .step('Load molecules', async () => {
      tv = await openMoleculeDataset('demo_files/demo_smiles.csv');
      tv.grid.columns.setOrder(firstCols.concat(lastCols));
      grok.shell.windows.showHelp = false;
      grok.shell.windows.context.visible = true;  
      table = tv.dataFrame;
    }, {description: 'Load dataset with molecule columns', delay: 3000})
    .step('Calculate molecule properties', async () => {
      const molColumnName = table.columns.bySemType(DG.SEMTYPE.MOLECULE)!.name;
      table.currentCell = table.cell(0, molColumnName);
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
      await delay(2000);
      sketcherInput.value = 'C1CCCCC1';
      const progressBar = DG.TaskBarProgressIndicator.create(`Sketcher initialization in progress...`);
      await delay(3000);
      progressBar.close();
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
      try {
        dT = new DataTransfer();
      } catch (e) {}
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
  await demoScript
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

  _package.files.readAsText('demo_files/mmp_demo.layout').then(async (layoutString: string) => {
    const layout = DG.ViewLayout.fromJson(layoutString);
    tv.loadLayout(layout);
    tv.dataFrame.currentRowIdx = 0;
    // grok.shell.windows.showHelp = true;
    // grok.shell.windows.help.showHelp('/help/datagrok/solutions/domains/chem/#matched-molecular-pairs');
  });
}


export async function _demoMoleculesVisualizations(): Promise<void> {
  const demoScript = new DemoScript('Demo', 'Creating various viewers on molecule columns');
  let table: DG.DataFrame;
  let tv: DG.TableView;
  await demoScript
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

  await demoScript
    .step('Load data', async () => {
      tv = await openMoleculeDataset('demo_files/sar_small.csv');
      table = tv.dataFrame;
      grok.shell.windows.showContextPanel = false;
      grok.shell.windows.showHelp = false;
    }, {description: 'Load dataset with molecule columns', delay: 2000})
    .step('Specify scaffold', async () => {
      await delay(1000);
      rGroupAnalysis(table.col('smiles')!, true);
      await delay(3000);
      sketcher = document.getElementsByClassName('d4-dialog')[0];
      sketcherInput = sketcher!.getElementsByClassName('grok-sketcher-input')[0]?.children[0] as HTMLInputElement;
      sketcherInput.value = 'O=C1CN=C(c2ccccc2N1)C3CCCCC3';
      const progressBar = DG.TaskBarProgressIndicator.create(`Sketcher initialization in progress...`);
      await delay(3000);
      progressBar.close();
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
  await demoScript
    .step('Load data', async () => {
      tv = await openMoleculeDataset('demo_files/sar_small.csv');
      table = tv.dataFrame;
    }, {description: 'Load dataset with molecule and activity columns.', delay: 2000})
    .step('Find activity cliffs', async () => {
      const molecules = table.col('smiles')!;

      const preprocessing = DG.Func.find({name: 'getFingerprints', package: 'Chem'})[0];
      await activityCliffs(table, molecules, table.col('In-vivo Activity')!,
        78, DimReductionMethods.T_SNE, BitArrayMetricsNames.Tanimoto,
        preprocessing, {}, true);
      tv = (grok.shell.view('Browse')! as DG.BrowseView)!.preview! as DG.TableView;
      awaitCheck(() => {
        for (const v of tv.viewers) {
          if (v.type === DG.VIEWER.SCATTER_PLOT) {
            scatterPlot = v;
            return true;
          }
        }
        return false;
      }, '', 10000)
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


export async function _demoScaffoldTree(): Promise<void> {
  const tv = await openMoleculeDataset('mol1K.csv');
  _package.files.readAsText('demo_files/mol1K.layout').then(async (layoutString: string) => {
    const layout = DG.ViewLayout.fromJson(layoutString);
    tv.loadLayout(layout);

    const scaffoldTree = new ScaffoldTreeViewer();
    scaffoldTree.root.classList.add('d4-viewer', 'd4-scaffold-tree');
    const treeStr = await _package.files.readAsText('demo_files/scaffold-tree.json');
    const table: DG.DataFrame = tv.dataFrame;
    await grok.data.detectSemanticTypes(table);
    
    scaffoldTree.molCol = table.columns.bySemType(DG.SEMTYPE.MOLECULE);
    scaffoldTree.dataFrame = table;
    scaffoldTree.size = 'normal';

    tv.dockManager.dock(scaffoldTree.root, DG.DOCK_TYPE.LEFT, null, '', 0.45);
    await scaffoldTree.loadTreeStr(treeStr);

    grok.shell.windows.showHelp = true;
    grok.shell.windows.help.showHelp('help/datagrok/solutions/domains/chem/chem#scaffold-tree-analysis');
  });
}