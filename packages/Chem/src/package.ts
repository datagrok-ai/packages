import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import '../css/chem.css';
import * as chemSearches from './chem-searches';
import {GridCellRendererProxy, RDKitCellRenderer} from './rendering/rdkit-cell-renderer';
import {calculateDescriptors, getDescriptorsTree} from "./docker/api";
import {getDescriptorsSingle, openDescriptorsDialogDocker} from './descriptors/descriptors-calculation';
import {assure} from '@datagrok-libraries/utils/src/test';
import {OpenChemLibSketcher} from './open-chem/ocl-sketcher';
import {_importSdf} from './open-chem/sdf-importer';
import {OCLCellRenderer} from './open-chem/ocl-cell-renderer';
import Sketcher = DG.chem.Sketcher;
import {getActivityCliffs, ISequenceSpaceResult} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import {ActivityCliffsEditor as ActivityCliffsFunctionEditor}
  from '@datagrok-libraries/ml/src/functionEditors/activity-cliffs-function-editor';
import {MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT, EMPTY_MOLECULE_MESSAGE,
  SMARTS_MOLECULE_MESSAGE, elementsTable} from './constants';
import {similarityMetric} from '@datagrok-libraries/ml/src/distance-metrics-methods';

//widget imports
import {SubstructureFilter} from './widgets/chem-substructure-filter';
import {drugLikenessWidget} from './widgets/drug-likeness';
import {addPropertiesAsColumns, getChemPropertyFunc, propertiesWidget} from './widgets/properties';
import {structuralAlertsWidget} from './widgets/structural-alerts';
import {structure2dWidget} from './widgets/structure2d';
import {addRisksAsColumns, toxicityWidget} from './widgets/toxicity';
import {identifiersWidget, openMapIdentifiersDialog, textToSmiles} from './widgets/identifiers';

//panels imports
import {addInchiKeys, addInchis} from './panels/inchi';
import {getMolColumnPropertyPanel} from './panels/chem-column-property-panel';
import {ScaffoldTreeViewer} from './widgets/scaffold-tree';
import {ScaffoldTreeFilter} from './widgets/scaffold-tree-filter';
import {Fingerprint} from './utils/chem-common';
import * as chemCommonRdKit from './utils/chem-common-rdkit';
import {IMolContext, getMolSafe, isFragment, _isSmarts} from './utils/mol-creation_rdkit';
import {checkMoleculeValid, checkMolEqualSmiles, _rdKitModule} from './utils/chem-common-rdkit';
import {_convertMolNotation, convertNotationForColumn} from './utils/convert-notation-utils';
import {molToMolblock} from './utils/convert-notation-utils';
import {getAtomsColumn, checkPackage} from './utils/elemental-analysis-utils';
import {saveAsSdfDialog} from './utils/sdf-utils';
import {getSimilaritiesMarix} from './utils/similarity-utils';

//analytical imports
import {createPropPanelElement, createTooltipElement} from './analysis/activity-cliffs';
import {chemDiversitySearch, ChemDiversityViewer} from './analysis/chem-diversity-viewer';
import {chemSimilaritySearch, ChemSimilarityViewer} from './analysis/chem-similarity-viewer';
import {chemSpace, runChemSpace} from './analysis/chem-space';
import {loadRGroupUserSettings, rGroupAnalysis} from './analysis/r-group-analysis';
import {MmpAnalysis} from './analysis/molecular-matched-pairs/mmp-analysis';

//file importers
import {_importTripos} from './file-importers/mol2-importer';
import {_importSmi} from './file-importers/smi-importer';

import {generateScaffoldTree} from './scripts-api';
import {renderMolecule} from './rendering/render-molecule';
import {RDKitReactionRenderer} from './rendering/rdkit-reaction-renderer';
import {structure3dWidget} from './widgets/structure3d';
import {BitArrayMetrics, BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {_demoActivityCliffs, _demoChemOverview, _demoDatabases4,
  _demoMMPA,
  _demoRgroupAnalysis, _demoScaffoldTree, _demoSimilarityDiversitySearch} from './demo/demo';
import {RuleSet, runStructuralAlertsDetection} from './panels/structural-alerts';
import {getmolColumnHighlights} from './widgets/col-highlights';
import {RDLog, RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {malformedDataWarning} from './utils/malformed-data-utils';
import {DimReductionBaseEditor} from '@datagrok-libraries/ml/src/functionEditors/dimensionality-reduction-editor';
import {getEmbeddingColsNames}
  from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import {Options} from '@datagrok-libraries/utils/src/type-declarations';
import {ITSNEOptions, IUMAPOptions} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/multi-column-dim-reducer';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {drawMoleculeLabels} from './rendering/molecule-label';
import {getMCS} from './utils/most-common-subs';
import { toDart } from 'datagrok-api/dg';

const drawMoleculeToCanvas = chemCommonRdKit.drawMoleculeToCanvas;
const SKETCHER_FUNCS_FRIENDLY_NAMES: {[key: string]: string} = {
  OpenChemLib: 'OpenChemLib',
  Ketcher: 'Ketcher',
  Marvin: 'Marvin',
  ChemDraw: 'ChemDraw',
};

const PREVIOUS_SKETCHER_NAMES: {[key: string]: string} = {
  'Open Chem Sketcher': 'OpenChemLib',
  'ketcherSketcher': 'Ketcher',
  'Marvin JS': 'Marvin',
  'Chem Draw': 'ChemDraw',
};

/**
 * Usage:
 * let a = await grok.functions.call('Chem:getRdKitModule');
 * let b = a.get_mol('C1=CC=CC=C1');
 * alert(b.get_pattern_fp());
 **/

//name: getRdKitModule
//output: object module
export function getRdKitModule(): RDModule {
  return chemCommonRdKit.getRdKitModule();
}

export const _package: DG.Package = new DG.Package();
export let _properties: any;

let _rdRenderer: RDKitCellRenderer;
export let renderer: GridCellRendererProxy;
let _renderers: Map<string, DG.GridCellRenderer>;

//tags: init
export async function initChem(): Promise<void> {
  chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
  await chemCommonRdKit.initRdKitModuleLocal();
  _properties = await _package.getProperties();
  _rdRenderer = new RDKitCellRenderer(getRdKitModule());
  renderer = new GridCellRendererProxy(_rdRenderer, 'Molecule');
  let storedSketcherType = await grok.dapi.userDataStorage.getValue(DG.chem.STORAGE_NAME, DG.chem.KEY, true);
  if (PREVIOUS_SKETCHER_NAMES[storedSketcherType])
    storedSketcherType = PREVIOUS_SKETCHER_NAMES[storedSketcherType];
  if (!storedSketcherType && _properties.Sketcher)
    storedSketcherType = SKETCHER_FUNCS_FRIENDLY_NAMES[_properties.Sketcher];
  const sketcherFunc = DG.Func.find({tags: ['moleculeSketcher']})
    .find((e) => e.name === storedSketcherType || e.friendlyName === storedSketcherType);
  if (sketcherFunc)
    DG.chem.currentSketcherType = sketcherFunc.friendlyName;
  else {
    if (!!storedSketcherType) {
      grok.shell.warning(
        `Package with ${storedSketcherType} function is not installed.Switching to ${DG.DEFAULT_SKETCHER}.`);
    }

    DG.chem.currentSketcherType = DG.DEFAULT_SKETCHER;
  }
  await loadRGroupUserSettings();
  _renderers = new Map();
}

//tags: autostart
export async function initChemAutostart(): Promise<void> { }

//name: Chemistry | Most Diverse Structures
//tags: tooltip
//input: column col {semType: Molecule}
//output: widget result
export async function chemTooltip(col: DG.Column): Promise<DG.Widget | undefined> {
  const version = col.version;

  for (let i = 0; i < col.length; ++i) {
    if (!col.isNone(i) && _isSmarts(col.get(i)))
      return;
  }

  const divMain = ui.div();
  divMain.append(ui.divText('Most diverse structures', {style: {'position': 'relative', 'left': '20px'}}));
  const divStructures = ui.div([ui.loader()]);
  divStructures.classList.add('d4-flex-wrap');

  const getDiverseStructures = async (): Promise<void> => {
    if (col.temp['version'] !== version || col.temp['molIds'].length === 0) {
      const molIds = await chemDiversitySearch(
        col, similarityMetric[BitArrayMetricsNames.Tanimoto], 7, Fingerprint.Morgan, DG.BitSet.create(col.length).setAll(true), true);

      Object.assign(col.temp, {
        'version': version,
        'molIds': molIds,
      });
    }
    ui.empty(divStructures);
    const molIdsCached = col.temp['molIds'];
    for (let i = 0; i < molIdsCached.length; ++i)
      divStructures.append(renderMolecule(col.get(molIdsCached[i]), {width: 75, height: 32}));
  };

  divMain.append(divStructures);
  const widget = new DG.Widget(divMain);
  widget.root.classList.add('chem-tooltip-widget');
  setTimeout(() => getDiverseStructures(), 10);
  return widget;
}

//name: Scaffold Tree
//tags: viewer
//meta.icon: files/icons/scaffold-tree-icon.svg
//output: viewer result
export function scaffoldTreeViewer() : ScaffoldTreeViewer {
  return new ScaffoldTreeViewer();
}

//name: Substructure Filter
//description: RDKit-based substructure filter
//tags: filter
//output: filter result
//meta.semType: Molecule
//meta.primaryFilter: true
export function substructureFilter(): SubstructureFilter {
  return new SubstructureFilter();
}

//name: canvasMol
//input: int x
//input: int y
//input: int w
//input: int h
//input: object canvas
//input: string molString
//input: string scaffoldMolString
//input: object options {optional: true}
export function canvasMol(
  x: number, y: number, w: number, h: number, canvas: HTMLCanvasElement,
  molString: string, scaffoldMolString: string | null = null,
  options = {normalizeDepiction: true, straightenDepiction: true},
): void {
  drawMoleculeToCanvas(x, y, w, h, canvas,
    molString, scaffoldMolString == '' ? null : scaffoldMolString,
    options);
}


//name: drawMolecule
//input: string molStr
//input: int w {optional: true}
//input: int h {optional: true}
//input: bool popupMenu {optional: true}
//output: object canvas
export function drawMolecule(molStr: string, w?: number, h?: number, popupMenu?: boolean): HTMLElement {
  return renderMolecule(molStr, {width: w, height: h, popupMenu: popupMenu});
}


//name: getCLogP
//input: string smiles {semType: Molecule}
//output: double cLogP
export function getCLogP(smiles: string): number {
  const mol = getRdKitModule().get_mol(smiles);
  const res = JSON.parse(mol.get_descriptors()).CrippenClogP;
  mol?.delete();
  return res;
}

//name: rdKitCellRenderer
//output: grid_cell_renderer result
//meta.chemRendererName: RDKit
export async function rdKitCellRenderer(): Promise<RDKitCellRenderer> {
  return new RDKitCellRenderer(getRdKitModule());
}

//name: chemCellRenderer
//tags: cellRenderer, cellRenderer-ChemicalReaction
//meta.cellType: ChemicalReaction
//meta-cell-renderer-sem-type: ChemicalReaction
//output: grid_cell_renderer result
export async function rdKitReactionRenderer(): Promise<RDKitReactionRenderer> {
  return new RDKitReactionRenderer(getRdKitModule());
}

//name: chemCellRenderer
//tags: cellRenderer, cellRenderer-Molecule
//meta.cellType: Molecule
//meta-cell-renderer-sem-type: Molecule
//output: grid_cell_renderer result
export async function chemCellRenderer(): Promise<DG.GridCellRenderer> {
  const propertiesRenderer: string = _properties.Renderer ?? 'RDKit';
  if (!_renderers.has(propertiesRenderer)) {
    const renderFunctions = DG.Func.find({meta: {chemRendererName: propertiesRenderer}});
    if (renderFunctions.length > 0) {
      const r = await renderFunctions[0].apply();
      _renderers.set(_properties.Renderer, r);
      return r;
    }
  }

  renderer.renderer = _renderers.get(propertiesRenderer)!;
  return renderer;
}

//name: getMorganFingerprints
//input: column molColumn {semType: Molecule}
//output: column result
export async function getMorganFingerprints(molColumn: DG.Column): Promise<DG.Column> {
  assure.notNull(molColumn, 'molColumn');

  try {
    const fingerprints = await chemSearches.chemGetFingerprints(molColumn, Fingerprint.Morgan, false);
    const fingerprintsBitsets: (DG.BitSet | null)[] = [];
    for (let i = 0; i < fingerprints.length; ++i) {
      const fingerprint = fingerprints[i] ?
        DG.BitSet.fromBytes(fingerprints[i]!.getRawData().buffer, fingerprints[i]!.length) : null;
      fingerprintsBitsets.push(fingerprint);
    }
    return DG.Column.fromList('object', 'fingerprints', fingerprintsBitsets);
  } catch (e: any) {
    console.error('Chem | Catch in getMorganFingerprints: ' + e.toString());
    throw e;
  }
}

//name: getMorganFingerprint
//input: string molString {semType: Molecule}
//output: object fingerprintBitset [Fingerprints]
export function getMorganFingerprint(molString: string): DG.BitSet {
  const bitArray = chemSearches.chemGetFingerprint(molString, Fingerprint.Morgan);
  return DG.BitSet.fromBytes(bitArray.getRawData().buffer, bitArray.length);
}

//name: getSimilarities
//input: column molStringsColumn
//input: string molString
//output: dataframe result
export async function getSimilarities(molStringsColumn: DG.Column, molString: string): Promise<DG.DataFrame> {
  try {
    const result = await chemSearches.chemGetSimilarities(molStringsColumn, molString);
    return result ? DG.DataFrame.fromColumns([result]) : DG.DataFrame.create();
  } catch (e: any) {
    console.error('Chem | Catch in getSimilarities: ' + e.toString());
    throw e;
  }
}

//name: getDiversities
//input: column molStringsColumn
//input: int limit
//output: dataframe result
export async function getDiversities(molStringsColumn: DG.Column, limit: number = Number.MAX_VALUE):
  Promise<DG.DataFrame> {
  try {
    const result = await chemSearches.chemGetDiversities(molStringsColumn, limit);
    return result ? DG.DataFrame.fromColumns([result]) : DG.DataFrame.create();
  } catch (e: any) {
    console.error('Chem | Catch in getDiversities: ' + e.toString());
    throw e;
  }
}

//name: findSimilar
//input: column molStringsColumn
//input: string molString
//input: int limit
//input: int cutoff
//output: dataframe result
export async function findSimilar(molStringsColumn: DG.Column, molString: string, limit: number = Number.MAX_VALUE,
  cutoff: number = 0.0): Promise<DG.DataFrame> {
  assure.notNull(molStringsColumn, 'molStringsColumn');
  assure.notNull(molString, 'molString');
  assure.notNull(limit, 'limit');
  assure.notNull(cutoff, 'cutoff');

  try {
    const result = await chemSearches.chemFindSimilar(molStringsColumn, molString, {limit: limit, minScore: cutoff});
    return result ? result : DG.DataFrame.create();
  } catch (e: any) {
    console.error('Chem | In findSimilar: ' + e.toString());
    throw e;
  }
}

//name: searchSubstructure
//input: column molStringsColumn
//input: string molString
//input: string molBlockFailover
//output: column result
export async function searchSubstructure(
  molStringsColumn: DG.Column, molString: string,
  molBlockFailover: string): Promise<DG.Column<any>> {
  assure.notNull(molStringsColumn, 'molStringsColumn');
  assure.notNull(molString, 'molString');
  assure.notNull(molBlockFailover, 'molBlockFailover');

  try {
    const result = await chemSearches.chemSubstructureSearchLibrary(molStringsColumn, molString, molBlockFailover);
    const resBitset = DG.BitSet.fromBytes(result.buffer.buffer, molStringsColumn.length);
    return DG.Column.fromList('object', 'bitset', [resBitset]); // TODO: should return a bitset itself
  } catch (e: any) {
    console.error('Chem | In substructureSearch: ' + e.toString());
    throw e;
  }
}

//name: saveAsSdf
//description: As SDF
//tags: fileExporter
export async function saveAsSdf(): Promise<void> {
  const progressIndicator = DG.TaskBarProgressIndicator.create('Saving as SDF...');
  saveAsSdfDialog();
  progressIndicator.close();
}

//#region Top menu

//name: Chem Similarity Search
//tags: viewer
//output: viewer result
//meta.icon: files/icons/chem-similarity-search-viewer.svg
export function similaritySearchViewer(): ChemSimilarityViewer {
  return new ChemSimilarityViewer();
}

//top-menu: Chem | Search | Similarity Search...
//name: Similarity Search
export function similaritySearchTopMenu(): void {
  (grok.shell.v as DG.TableView).addViewer('Chem Similarity Search');
}

//name: Chem Diversity Search
//tags: viewer
//output: viewer result
//meta.icon: files/icons/chem-diversity-search-viewer.svg
export function diversitySearchViewer(): ChemDiversityViewer {
  return new ChemDiversityViewer();
}

//top-menu: Chem | Search | Diversity Search...
//name: Diversity Search
export function diversitySearchTopMenu(): void {
  (grok.shell.v as DG.TableView).addViewer('Chem Diversity Search');
}

//top-menu: Chem | Calculate | Descriptors...
//name: descriptorsDocker
export async function descriptorsDocker(): Promise<void> {
  await openDescriptorsDialogDocker();
}

//name: chemDescriptorsTree
//output: object descriptors
export async function chemDescriptorsTree(): Promise<object> {
  return await getDescriptorsTree();
}

//top-menu: Chem | Calculate | Map Identifiers...
//name: getMapIdentifiers
export async function getMapIdentifiers() {
  await openMapIdentifiersDialog();
}

//name: freeTextToSmiles
//input: string molfile
//output: string smiles
export async function freeTextToSmiles(molfile: string): Promise<string | null> {
  return await textToSmiles(molfile);
}

//name: chemDescriptors
//input: dataframe table
//input: column molecules
//input: list<string> descriptors
export async function chemDescriptors(table: DG.DataFrame, molecules: DG.Column, descriptors: string[]): Promise<void> {
  await calculateDescriptors(table, molecules, descriptors);
}

//name: SearchSubstructureEditor
//tags: editor
//input: funccall call
export function searchSubstructureEditor(call: DG.FuncCall): void {
  if (grok.shell.tv.dataFrame.rowCount > MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT) {
    grok.shell.warning(`Too many rows, maximum for substructure search is ${MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT}`);
    return;
  }
  const molColumns = grok.shell.tv.dataFrame.columns.bySemTypeAll(DG.SEMTYPE.MOLECULE);
  if (!molColumns.length) {
    grok.shell.warning(`Data doesn't contain molecule columns`);
    return;
  } else if (molColumns.length === 1)
    call.func.prepare({molecules: molColumns[0]}).call(true);
  else {
    const colInput = ui.columnInput('Molecules', grok.shell.tv.dataFrame, molColumns[0]);
    ui.dialog({title: 'Substructure search'});
    ui.dialog({title: 'Substructure search'})
      .add(colInput)
      .onOK(async () => {
        call.func.prepare({molecules: colInput.value}).call(true);
      })
      .show();
  }
}


//top-menu: Chem | Search | Substructure Search...
//name: Substructure Search
//input: column molecules { semType: Molecule }
//editor: Chem:SearchSubstructureEditor
export function SubstructureSearchTopMenu(molecules: DG.Column): void {
  const fg = grok.shell.tv.getFiltersGroup({createDefaultFilters: false});
  grok.shell.tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: DG.FILTER_TYPE.SUBSTRUCTURE,
    column: molecules.name,
    columnName: molecules.name,
    molBlock: DG.WHITE_MOLBLOCK,
  });
  grok.shell.tv.grid.scrollToCell(molecules, 0);
  const filterHeader = Array.from(fg.root!.getElementsByClassName('d4-filter-header'))
    .find((el) => Array.from(el!.getElementsByTagName('label')).find((it) => it.textContent === molecules.name));
  if (filterHeader) {
    setTimeout(() => {
      const sketchLink = (filterHeader.parentElement as HTMLElement).getElementsByClassName('sketch-link')[0];
      const element = sketchLink ?? (filterHeader.parentElement as HTMLElement)
        .getElementsByClassName('chem-canvas')[0];
      (element as HTMLElement).click();
    }, 500);
  }
}


//name: ChemSpaceEditor
//tags: editor
//input: funccall call
export function ChemSpaceEditor(call: DG.FuncCall): void {
  const funcEditor = new DimReductionBaseEditor({semtype: DG.SEMTYPE.MOLECULE});
  ui.dialog({title: 'Chemical space'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
      return call.func.prepare({
        molecules: params.col,
        table: params.table,
        methodName: params.methodName,
        similarityMetric: params.similarityMetric,
        plotEmbeddings: params.plotEmbeddings,
        options: params.options,
        preprocessingFunction: params.preprocessingFunction,
        clusterEmbeddings: params.clusterEmbeddings,
      }).call();
    })
    .show();
}

//name: Fingerprints
//tags: dim-red-preprocessing-function
//meta.supportedSemTypes: Molecule
//meta.supportedDistanceFunctions: Tanimoto,Asymmetric,Cosine,Sokal
//input: column col {semType: Molecule}
//input: string _metric {optional: true}
// eslint-disable-next-line max-len
//input: string fingerprintType = 'Morgan' {caption: Fingerprint type; optional: true; choices: ['Morgan', 'RDKit', 'Pattern', 'AtomPair', 'MACCS', 'TopologicalTorsion']}
//output: object result
export async function getFingerprints(
  col: DG.Column, _metric?: string, fingerprintType: Fingerprint = Fingerprint.Morgan) {
  //TODO: get rid of fallback
  let fingerprintTypeStr = fingerprintType as string;
  if ((fingerprintTypeStr.startsWith('\'') || fingerprintTypeStr.startsWith('"')) &&
    fingerprintTypeStr.endsWith('\'') || fingerprintTypeStr.endsWith('"'))
    fingerprintTypeStr = fingerprintTypeStr.slice(1, -1);

  const fpColumn = await chemSearches.chemGetFingerprints(col, fingerprintTypeStr as Fingerprint, false);
  malformedDataWarning(fpColumn, col);
  return {entries: fpColumn, options: {}};
}


//top-menu: Chem | Analyze | Chemical Space...
//name: Chem Space
//description: Maps the dataset to 2D plot based on similarity
//input: dataframe table
//input: column molecules { semType: Molecule }
//input: string methodName { choices:["UMAP", "t-SNE"] }
//input: string similarityMetric { choices:["Tanimoto", "Asymmetric", "Cosine", "Sokal"] }
//input: bool plotEmbeddings = true
//input: object options {optional: true}
//input: func preprocessingFunction {optional: true}
//input: bool clusterEmbeddings {optional: true}
//editor: Chem:ChemSpaceEditor
export async function chemSpaceTopMenu(table: DG.DataFrame, molecules: DG.Column, methodName: DimReductionMethods,
  similarityMetric: BitArrayMetrics = BitArrayMetricsNames.Tanimoto, plotEmbeddings: boolean,
  options?: (IUMAPOptions | ITSNEOptions) & Options, preprocessingFunction?: DG.Func, clusterEmbeddings?: boolean,
): Promise<DG.Viewer | undefined> {
  const res = await runChemSpace(table, molecules, methodName, similarityMetric, plotEmbeddings, options,
    preprocessingFunction, clusterEmbeddings);
  drawMoleculeLabels(table, molecules, res as DG.ScatterPlotViewer, 20, -1, 100, 70);
  return res;
}


//name: Chem Space Embeddings
//input: string col
//input: string methodName
//input: string similarityMetric
//input: string xAxis
//input: string yAxis
//input: object options {optional: true}
//output: object result
export async function getChemSpaceEmbeddings(col: DG.Column, methodName: DimReductionMethods,
  similarityMetric: BitArrayMetrics = BitArrayMetricsNames.Tanimoto, xAxis: string, yAxis: string,
  options?: any): Promise<ISequenceSpaceResult> {
  //need to create dataframe to add fingerprints column
  if (!col.dataFrame) {
    const dfForFp = DG.DataFrame.create(col.length);
    dfForFp.columns.add(col);
  }
  const chemSpaceParams = {
    seqCol: col,
    methodName: methodName,
    similarityMetric: similarityMetric as BitArrayMetrics,
    embedAxesNames: [xAxis, yAxis],
    options: options,
  };
  const chemSpaceRes = await chemSpace(chemSpaceParams);
  return chemSpaceRes;
}

//name: Chem Similarities Matrix
//input: int dim
//input: column col
//input: dataframe df
//input: string colName
//input: object simArr
//output: object res
export async function getChemSimilaritiesMatrix(dim: number, col: DG.Column,
  df: DG.DataFrame, colName: string, simArr: DG.Column[]): Promise<(DG.Column | null)[]> {
  //need to create dataframe to add fingerprints column
  if (!col.dataFrame) {
    const dfForFp = DG.DataFrame.create(col.length);
    dfForFp.columns.add(col);
  }
  return await getSimilaritiesMarix(dim, col, df, colName, simArr);
}

//top-menu: Chem | Analyze | Elemental Analysis...
//name: Elemental Analysis
//input: dataframe table
//input: column molecules { semType: Molecule }
//input: bool radarViewer = false { description: Add a standalone radar viewer }
//input: bool radarGrid = false { description: Show radar in grid cells }
export function elementalAnalysis(table: DG.DataFrame, molecules: DG.Column, radarViewer: boolean,
  radarGrid: boolean): void {
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.info(`The column ${molecules.name} doesn't contain molecules`);
    return;
  }

  const [elements, invalid]: [Map<string, Int32Array>, number[]] = getAtomsColumn(molecules);
  const columnNames: string[] = [];

  if (invalid.filter((el) => el !== null).length > 0) {
    console.log(`Invalid rows ${invalid.map((i) => i.toString()).join(', ')}`);
    grok.shell.warning('Dataset contains malformed data!');
  }

  const extendedElementsTable = ['R'].concat(elementsTable).concat(['Molecule Charge']);

  for (const elName of extendedElementsTable) {
    const value = elements.get(elName);
    if (value) {
      const column = DG.Column.fromInt32Array(elName, value);
      column.name = table.columns.getUnusedName(column.name);
      invalid.map((i) => {
        column.set(i, null);
      });
      table.columns.add(column);
      columnNames.push(column.name);
    }
  }

  const view = grok.shell.getTableView(table.name);

  if (radarViewer) {
    const packageExists = checkPackage('Charts', '_radarViewerDemo');
    if (packageExists) {
      const radarViewer = DG.Viewer.fromType('Radar', table, {
        valuesColumnNames: columnNames,
      });
      view.addViewer(radarViewer);
    } else
      grok.shell.warning('Charts package is not installed');
  }

  if (radarGrid) {
    const packageExists = checkPackage('PowerGrid', 'radarCellRenderer');
    if (packageExists) {
      const gc = view.grid.columns.add({gridColumnName: `elements (${molecules.name})`, cellType: 'radar'});
      gc.settings = {columnNames: columnNames};
      gc.width = 300;
    } else
      grok.shell.warning('PowerGrid package is not installed');
  }
}

//name: R-Groups Analysis
//top-menu: Chem | Analyze | R-Groups Analysis...
export function rGroupsAnalysisMenu(): void {
  const col = grok.shell.t.columns.bySemType(DG.SEMTYPE.MOLECULE);
  if (col === null) {
    grok.shell.error('Current table does not contain molecules');
    return;
  }
  rGroupAnalysis(col);
}

//name: ActivityCliffsEditor
//tags: editor
//input: funccall call
export function ActivityCliffsEditor(call: DG.FuncCall): void {
  const funcEditor = new ActivityCliffsFunctionEditor({semtype: DG.SEMTYPE.MOLECULE});
  ui.dialog({title: 'Activity Cliffs'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
      if (params.activities) {
        call.func.prepare({
          table: params.table,
          molecules: params.col,
          activities: params.activities,
          similarity: params.similarityThreshold,
          methodName: params.methodName,
          similarityMetric: params.similarityMetric,
          preprocessingFunction: params.preprocessingFunction,
          options: params.options,
        }).call(true);
      } else
        grok.shell.error(`Column with activities has not been selected. Table contains no numeric columns.`);
    }).show();
}

//top-menu: Chem | Analyze | Activity Cliffs...
//name: Activity Cliffs
//description: Detects pairs of molecules with similar structure and significant difference in any given property
//input: dataframe table [Input data table]
//input: column molecules {type:categorical; semType: Molecule}
//input: column activities {type:numerical}
//input: double similarity = 80 [Similarity cutoff]
//input: string methodName { choices:["UMAP", "t-SNE"] }
//input: string similarityMetric { choices:["Tanimoto", "Asymmetric", "Cosine", "Sokal"] }
//input: func preprocessingFunction
//input: object options {optional: true}
//editor: Chem:ActivityCliffsEditor
export async function activityCliffs(table: DG.DataFrame, molecules: DG.Column, activities: DG.Column,
  similarity: number, methodName: DimReductionMethods, similarityMetric: BitArrayMetrics,
  preprocessingFunction: DG.Func, options?: (IUMAPOptions | ITSNEOptions) & Options): Promise<void> {
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.error(`Column ${molecules.name} is not of Molecule semantic type`);
    return;
  }
  if (activities.type !== DG.TYPE.INT && activities.type !== DG.TYPE.BIG_INT && activities.type !== DG.TYPE.FLOAT) {
    grok.shell.error(`Column ${activities.name} is not numeric`);
    return;
  }

  const allowedRowCount = 10000;
  const fastRowCount = methodName === DimReductionMethods.UMAP ? 5000 : 2000;
  if (table.rowCount > allowedRowCount) {
    grok.shell.warning(`Too many rows, maximum for activity cliffs is ${allowedRowCount}`);
    return;
  }

  const runActCliffs = async (): Promise<void> => {
    const sp = await getActivityCliffs(table, molecules, axesNames, 'Activity cliffs', activities, similarity,
      similarityMetric, methodName, options, DG.SEMTYPE.MOLECULE, {'units': molecules.tags['units']},
      preprocessingFunction, createTooltipElement, createPropPanelElement, undefined);
    const size = sp.getOptions().look['sizeColumnName'];
    drawMoleculeLabels(table, molecules, sp as DG.ScatterPlotViewer, 20, -1, 100, 105, size);
  };

  const axesNames = getEmbeddingColsNames(table);
  if (table.rowCount > fastRowCount) {
    ui.dialog().add(ui.divText(`Activity cliffs analysis might take several minutes.
    Do you want to continue?`))
      .onOK(async () => {
        const progressBar = DG.TaskBarProgressIndicator.create(`Activity cliffs running...`);
        await runActCliffs();
        progressBar.close();
      })
      .show();
  } else
    await runActCliffs();
}

//top-menu: Chem | Calculate | To InchI...
//name: To InchI
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
export function addInchisTopMenu(table: DG.DataFrame, col: DG.Column): void {
  addInchis(table, col);
}

//top-menu: Chem | Calculate | To InchI Keys...
//name: To InchI Keys
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
export function addInchisKeysTopMenu(table: DG.DataFrame, col: DG.Column): void {
  addInchiKeys(table, col);
}

//top-menu: Chem | Analyze | Structural Alerts...
//name: Structural Alerts
//tags: HitTriageFunction
//description: Highlights the fragments that could lead to potential chemical hazards
//input: dataframe table [Input data table] {caption: Table}
//input: column molecules {caption: Molecules; type: categorical; semType: Molecule}
//input: bool pains {caption: PAINS; default: true; description: "Pan Assay Interference Compounds filters"}
//input: bool bms {caption: BMS; default: false; description: "Bristol-Myers Squibb HTS Deck filters"}
//input: bool sureChembl {caption: SureChEMBL; default: false; description: "MedChem unfriendly compounds from SureChEMBL"}
//input: bool mlsmr {caption: MLSMR; default: false; description: "NIH MLSMR Excluded Functionality filters"}
//input: bool dandee {caption: Dandee; default: false; description: "University of Dundee NTD Screening Library filters"}
//input: bool inpharmatica {caption: Inpharmatica; default: false; description: "Inpharmatica filters"}
//input: bool lint {caption: LINT; default: false; description: "Pfizer LINT filters"}
//input: bool glaxo {caption: Glaxo; default: false; description: "Glaxo Wellcome Hard filters"}
export async function structuralAlertsTopMenu(table: DG.DataFrame, molecules: DG.Column, pains: boolean, bms: boolean,
  sureChembl: boolean, mlsmr: boolean, dandee: boolean, inpharmatica: boolean, lint: boolean, glaxo: boolean,
): Promise<DG.DataFrame | void> {
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.error(`Column ${molecules.name} is not of Molecule semantic type`);
    return;
  }

  if (table.rowCount > 1000)
    grok.shell.info('Structural Alerts detection will take a while to run');

  const ruleSet: RuleSet = {'PAINS': pains, 'BMS': bms, 'SureChEMBL': sureChembl, 'MLSMR': mlsmr,
    'Dandee': dandee, 'Inpharmatica': inpharmatica, 'LINT': lint, 'Glaxo': glaxo};
  const rdkitService = await chemCommonRdKit.getRdKitService();
  const alertsDf = await grok.data.loadTable(chemCommonRdKit.getRdKitWebRoot() + 'files/alert-collection.csv');

  const progress = DG.TaskBarProgressIndicator.create('Detecting structural alerts...');
  try {
    const resultDf = await runStructuralAlertsDetection(molecules, ruleSet, alertsDf, rdkitService);
    for (const resultCol of resultDf.columns) {
      resultCol.name = table.columns.getUnusedName(`${resultCol.name} (${molecules.name})`);
      table.columns.add(resultCol);
    }
  } catch (e) {
    grok.shell.error('Structural alerts detection failed');
    grok.log.error(`Structural alerts detection failed: ${e}`);
  } finally {
    progress.close();
  }
  return table;
}

//#endregion

//#region Molecule column property panel


//name: Chemistry | Rendering
//input: column molColumn {semType: Molecule}
//tags: panel, exclude-actions-panel
//output: widget result
export function molColumnPropertyPanel(molColumn: DG.Column): DG.Widget {
  return getMolColumnPropertyPanel(molColumn);
}

//name: Chemistry | Highlight
//input: column molColumn {semType: Molecule}
//tags: panel, exclude-actions-panel
//output: widget result
export function molColumnHighlights(molColumn: DG.Column): DG.Widget {
  return getmolColumnHighlights(molColumn);
}

//name: Chemistry | Descriptors
//tags: panel, chem, widgets
//input: string smiles { semType: Molecule }
//output: widget result
export function descriptorsWidget(smiles: string): DG.Widget {
  if (!smiles || DG.chem.Sketcher.isEmptyMolfile(smiles))
    return new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
  return _isSmarts(smiles) || isFragment(smiles) ?
    new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
    getDescriptorsSingle(smiles);
}

//name: Biology | Drug Likeness
//description: Drug Likeness score, with explanations on molecule fragments contributing to the score. OCL.
//help-url: /help/domains/chem/info-panels/drug-likeness.md
//tags: panel, chem, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export function drugLikeness(smiles: DG.SemanticValue): DG.Widget {
  return smiles && !DG.chem.Sketcher.isEmptyMolfile(smiles.value) ?
    _isSmarts(smiles.value) || isFragment(smiles.value) ? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      drugLikenessWidget(smiles) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: Chemistry | Properties
//description: Basic molecule properties
//tags: panel, chem, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export function properties(smiles: DG.SemanticValue): DG.Widget {
  return smiles && !DG.chem.Sketcher.isEmptyMolfile(smiles.value) ?
    _isSmarts(smiles.value) || isFragment(smiles.value)? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      propertiesWidget(smiles) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}

//name: getChemPropertyFunction
//description: Return chem property function
//input: string name
//output: object result
export function getChemPropertyFunction(name: string): null | ((smiles: string) => any) {
  return getChemPropertyFunc(name);
}

//name: Biology | Structural Alerts
//description: Screening drug candidates against structural alerts i.e. fragments associated to a toxicological response
//help-url: /help/domains/chem/info-panels/structural-alerts.md
//tags: panel, chem, widgets
//input: string smiles { semType: Molecule }
//output: widget result
export async function structuralAlerts(smiles: string): Promise<DG.Widget> {
  return smiles && !DG.chem.Sketcher.isEmptyMolfile(smiles) ?
    _isSmarts(smiles) || isFragment(smiles) ? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      structuralAlertsWidget(smiles) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: Structure | Identifiers
//tags: panel, chem, widgets
//input: string smiles { semType: Molecule }
//output: widget result
export async function identifiers(smiles: string): Promise<DG.Widget> {
  return smiles && !DG.chem.Sketcher.isEmptyMolfile(smiles) ?
    _isSmarts(smiles) || isFragment(smiles) ? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      await identifiersWidget(smiles) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: Structure | 3D Structure
//description: 3D molecule representation
//tags: panel, chem, widgets
//input: string molecule { semType: Molecule }
//output: widget result
export async function structure3D(molecule: string): Promise<DG.Widget> {
  return molecule && !DG.chem.Sketcher.isEmptyMolfile(molecule) ?
    _isSmarts(molecule) || isFragment(molecule) ? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      structure3dWidget(molecule) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: Structure | 2D Structure
//description: 2D molecule representation
//tags: panel, chem, widgets
//input: string molecule { semType: Molecule }
//output: widget result
export function structure2d(molecule: string): DG.Widget {
  return molecule && !DG.chem.Sketcher.isEmptyMolfile(molecule) ?
    structure2dWidget(molecule) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: Biology | Toxicity
//description: Toxicity prediction. Calculated by openchemlib
//help-url: /help/domains/chem/info-panels/toxicity-risks.md
//tags: panel, chem, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export function toxicity(smiles: DG.SemanticValue): DG.Widget {
  return smiles && !DG.chem.Sketcher.isEmptyMolfile(smiles.value) ?
    _isSmarts(smiles.value) || isFragment(smiles.value) ? new DG.Widget(ui.divText(SMARTS_MOLECULE_MESSAGE)) :
      toxicityWidget(smiles) : new DG.Widget(ui.divText(EMPTY_MOLECULE_MESSAGE));
}


//name: convertMolNotation
//description: RDKit-based conversion for SMILES, SMARTS, InChi, Molfile V2000 and Molfile V3000
//tags: unitConverter
//input: string molecule {semType: Molecule}
//input: string sourceNotation {choices:["smiles", "smarts", "molblock", "v3Kmolblock"]}
//input: string targetNotation {choices:["smiles", "smarts", "molblock", "v3Kmolblock"]}
//output: string result {semType: Molecule}
export function convertMolNotation(molecule: string, sourceNotation: DG.chem.Notation,
  targetNotation: DG.chem.Notation): string {
  return _convertMolNotation(molecule, sourceNotation, targetNotation, getRdKitModule());
}

//tags: cellEditor
//description: Molecule
//input: grid_cell cell
export async function editMoleculeCell(cell: DG.GridCell): Promise<void> {
  const sketcher = new Sketcher(undefined, validateMolecule);
  const unit = cell.cell.column.tags[DG.TAGS.UNITS];
  let molecule = cell.cell.value;
  if (unit === DG.chem.Notation.Smiles) {
    //convert to molFile to draw in coordinates similar to dataframe cell
    molecule = convertMolNotation(molecule, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock);
  }
  sketcher.setMolecule(molecule);
  const dlg = ui.dialog()
    .add(sketcher)
    .onOK(() => {
      if (unit === DG.chem.Notation.Smiles) {
        //set new cell value only in case smiles has been edited (to avoid undesired molecule orientation change)
        const newValue = sketcher.getSmiles();
        const mol = checkMoleculeValid(cell.cell.value);
        if (!checkMolEqualSmiles(mol, newValue)) {
          try {
            //@ts-ignore TODO Remove on js-api update
            cell.setValue(newValue, true);
          } catch {
            cell.cell.value = newValue;
          }
        }
        mol?.delete();
      } else {
        try {
          //@ts-ignore TODO Remove on js-api update
          cell.setValue(sketcher.getMolFile(), true);
        } catch {
          cell.cell.value = sketcher.getMolFile();
        }
      }
      Sketcher.addToCollection(Sketcher.RECENT_KEY, sketcher.getMolFile());
    })
    .show({resizable: true});
  ui.onSizeChanged(dlg.root).subscribe((_) => {
    if (!sketcher.sketcher?.isInitialized)
      return;
    sketcher._autoResized ? sketcher._autoResized = false : sketcher.resize();
  });
}

//name: OpenChemLib
//tags: moleculeSketcher
//output: widget sketcher
export function openChemLibSketcher(): OpenChemLibSketcher {
  return new OpenChemLibSketcher();
}

//name: importSdfs
//description: Opens SDF file
//tags: file-handler
//meta.ext: sdf,mol
//input: list bytes
//output: list tables
export function importSdf(bytes: Uint8Array): DG.DataFrame[] | void {
  try {
    return _importSdf(Uint8Array.from(bytes));
  } catch (e:any) {
    grok.shell.warning('file is not supported or malformed');
    grok.shell.error(e);
  }
}

//name: importSmi
//description: Opens smi file
//tags: file-handler
//meta.ext: smi
//input: list bytes
//output: list tables
export function importSmi(bytes: Uint8Array): DG.DataFrame[] | void {
  try {
    return _importSmi(Uint8Array.from(bytes));
  } catch (e:any) {
    grok.shell.warning('file is not supported or malformed');
    grok.shell.error(e);
  }
}

//name: importMol2
//description: Opens smi file
//tags: file-handler
//meta.ext: mol2
//input: list bytes
//output: list tables
export function importMol2(bytes: Uint8Array): DG.DataFrame[] | void {
  try {
    return _importTripos(Uint8Array.from(bytes));
  } catch (e:any) {
    grok.shell.warning('file is not supported or malformed');
    grok.shell.error(e);
  }
}

//name: importMol
//description: Opens MOL file
//tags: file-handler
//meta.ext: mol
//input: string content
//output: list tables
export function importMol(content: string): DG.DataFrame[] | void {
  try {
    const molCol = DG.Column.string('molecule', 1).init((_) => content);
    return [DG.DataFrame.fromColumns([molCol])];
  } catch (e:any) {
    grok.shell.warning('file is not supported or malformed');
    grok.shell.error(e);
  }
}

//name: oclCellRenderer
//output: grid_cell_renderer result
//meta.chemRendererName: OpenChemLib
export async function oclCellRenderer(): Promise<OCLCellRenderer> {
  return new OCLCellRenderer();
}

//name: Sort by similarity
//description: Sorts a molecular column by similarity
//tags: exclude-actions-panel
//meta.action: Sort by similarity
//input: semantic_value value { semType: Molecule }
export async function sortBySimilarity(value: DG.SemanticValue): Promise<void> {
  const molCol = value.cell.column;
  const tableRowIdx = value.cell.rowIndex;
  const dframe = molCol.dataFrame;
  const smiles = molCol.get(tableRowIdx);

  const grid = value.viewer as DG.Grid;
  ui.setUpdateIndicator(grid.root, true);
  const progressBar = DG.TaskBarProgressIndicator.create('Sorting Structures...');
  progressBar.update(0, 'Installing ScaffoldGraph..: 0% completed');
  const fingerprints : DG.DataFrame = await callChemSimilaritySearch(dframe, molCol, smiles,
    BitArrayMetricsNames.Tanimoto, 1000000, 0.0, Fingerprint.Morgan);
  ui.setUpdateIndicator(grid.root, false);
  progressBar.update(100, 'Sort completed');
  progressBar.close();

  const idxCol = fingerprints.columns.byName('indexes');
  grid.sort([], []);
  grid.setRowOrder(idxCol.toList());
  //grid.props.pinnedRows = [tableRowIdx];
  //next two rows can be added after Chem is updated to version 1.7 API
  grid.props.pinnedRowColumnNames = [molCol.name];
  grid.props.pinnedRowValues = [value.value];
  grid.scrollToPixels(0, 0); //to address the bug in the core
}

//name: Use as filter
//description: Adds this structure as a substructure filter
//tags: exclude-actions-panel
//meta.action: Use as filter
//input: semantic_value value { semType: Molecule }
export function useAsSubstructureFilter(value: DG.SemanticValue): void {
  const tv = grok.shell.tv;
  if (tv == null)
    throw new Error('Requires an open table view.');

  const molCol = value.cell.column;
  const molecule = value.value;
  if (molCol == null)
    throw new Error('Molecule column not found.');

  let molblock;

  //in case molecule is smiles setting correct coordinates to save molecule orientation in filter
  if (value.cell.column.tags[DG.TAGS.UNITS] == DG.chem.Notation.Smiles)
    molblock = convertMolNotation(molecule, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock);
  else
    molblock = molToMolblock(molecule, getRdKitModule());

  tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: DG.FILTER_TYPE.SUBSTRUCTURE,
    column: molCol.name,
    columnName: molCol.name,
    molBlock: molblock, //@ts-ignore
  }, false);
}

//name: Copy as SMILES
//description: Copies structure as smiles
//tags: exclude-actions-panel
//meta.action: Copy as SMILES
//input: semantic_value value { semType: Molecule }
export function copyAsSmiles(value: DG.SemanticValue): void {
  const smiles = !DG.chem.isMolBlock(value.value) && !_isSmarts(value.value) ? value.value :
    _convertMolNotation(value.value, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles, getRdKitModule());
  navigator.clipboard.writeText(smiles);
  grok.shell.info('Smiles copied to clipboard');
}

//name: Copy as MOLFILE V2000
//description: Copies structure as molfile V2000
//tags: exclude-actions-panel
//meta.action: Copy as MOLFILE V2000
//input: semantic_value value { semType: Molecule }
export function copyAsMolfileV2000(value: DG.SemanticValue): void {
  const molfileV2000 = DG.chem.isMolBlock(value.value) && !value.value.includes('V3000') ? value.value :
    _convertMolNotation(value.value, DG.chem.Notation.Unknown, DG.chem.Notation.MolBlock, getRdKitModule());
  navigator.clipboard.writeText(molfileV2000);
  grok.shell.info('Molfile V2000 copied to clipboard');
}


//name: Copy as MOLFILE V3000
//description: Copies structure as molfile V3000
//tags: exclude-actions-panel
//meta.action: Copy as MOLFILE V3000
//input: semantic_value value { semType: Molecule }
export function copyAsMolfileV3000(value: DG.SemanticValue): void {
  const molfileV3000 = DG.chem.isMolBlock(value.value) && value.value.includes('V3000') ? value.value :
    _convertMolNotation(value.value, DG.chem.Notation.Unknown, DG.chem.Notation.V3KMolBlock, getRdKitModule());
  navigator.clipboard.writeText(molfileV3000);
  grok.shell.info('Molfile V3000 copied to clipboard');
}

//name: Copy as SMARTS
//description: Copies structure as smarts
//tags: exclude-actions-panel
//meta.action: Copy as SMARTS
//input: semantic_value value { semType: Molecule }
export function copyAsSmarts(value: DG.SemanticValue): void {
  const smarts = !DG.chem.isMolBlock(value.value) && _isSmarts(value.value) ? value.value :
    _convertMolNotation(value.value, DG.chem.Notation.Unknown, DG.chem.Notation.Smarts, getRdKitModule());
  navigator.clipboard.writeText(smarts);
  grok.shell.info('Smarts copied to clipboard');
}

//name: isSmiles
//input: string s
//output: bool res
export function isSmiles(s: string) : boolean {
  const ctx: IMolContext = getMolSafe(s, {}, _rdKitModule, true);
  if (ctx.mol !== null) {
    ctx.mol.delete();
    return true;
  }
  return false;
}

//name: isSmarts
//input: string s
//output: bool res
export function isSmarts(s: string): boolean {
  return !!s.match(/\[.?#\d|\$|&|;|,|!.?]/g);
}

//name: detectSmiles
//input: column col
//input: int min
export function detectSmiles(col: DG.Column, min: number) : void {
  if (DG.Detector.sampleCategories(col, isSmiles, min, 10, 0.8)) {
    col.tags[DG.TAGS.UNITS] = DG.UNITS.Molecule.SMILES;
    col.semType = DG.SEMTYPE.MOLECULE;
  }
}

//name: chemSimilaritySearch
//input: dataframe df
//input: column col
//input: string molecule
//input: string metricName
//input: int limit
//input: double minScore
//input: string fingerprint
//output: dataframe result
export async function callChemSimilaritySearch(
  df: DG.DataFrame,
  col: DG.Column,
  molecule: string,
  metricName: BitArrayMetrics,
  limit: number,
  minScore: number,
  fingerprint: string): Promise<DG.DataFrame> {
  const res = await chemSimilaritySearch(df, col, molecule, metricName, limit, minScore, 
    fingerprint as Fingerprint, DG.BitSet.create(col.length).setAll(true));
  return res ?? DG.DataFrame.create();
}


//name: chemDiversitySearch
//input: column col
//input: string metricName
//input: int limit
//input: string fingerprint
//output: dataframe result
export async function callChemDiversitySearch(
  col: DG.Column,
  metricName: BitArrayMetrics,
  limit: number,
  fingerprint: string): Promise<number[]> {
  return await chemDiversitySearch(col, similarityMetric[metricName], limit,
    fingerprint as Fingerprint, DG.BitSet.create(col.length).setAll(true));
}

//top-menu: Chem | Calculate | Properties...
//name: Chemical Properties
//tags: HitTriageFunction
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
//input: bool MW = true
//input: bool HBA = false
//input: bool HBD = false
//input: bool logP = false
//input: bool logS = false
//input: bool PSA = false
//input: bool rotatableBonds = false
//input: bool stereoCenters = false
//input: bool moleculeCharge = false
export async function addChemPropertiesColumns(table: DG.DataFrame, molecules: DG.Column,
  MW?: boolean, HBA?: boolean, HBD?: boolean, logP?: boolean, logS?: boolean,
  PSA?: boolean, rotatableBonds?: boolean, stereoCenters?: boolean, moleculeCharge?: boolean,
): Promise<DG.DataFrame> {
  const propArgs: string[] = ([] as string[]).concat(MW ? ['MW'] : [], HBA ? ['HBA'] : [],
    HBD ? ['HBD'] : [], logP ? ['LogP'] : [], logS ? ['LogS'] : [], PSA ? ['PSA'] : [],
    rotatableBonds ? ['Rotatable bonds'] : [], stereoCenters ? ['Stereo centers'] : [],
    moleculeCharge ? ['Molecule charge'] : []);
  const pb = DG.TaskBarProgressIndicator.create('Chemical properties ...');
  try {
    await addPropertiesAsColumns(table, molecules, propArgs);
  } finally {
    pb.close();
  }
  return table;
}

//top-menu: Chem | Calculate | Toxicity Risks...
//name: Toxicity risks
//tags: HitTriageFunction
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
//input: bool mutagenicity = true
//input: bool tumorigenicity = false
//input: bool irritatingEffects = false
//input: bool reproductiveEffects = false
export async function addChemRisksColumns(table: DG.DataFrame, molecules: DG.Column,
  mutagenicity?: boolean, tumorigenicity?: boolean, irritatingEffects?: boolean, reproductiveEffects?: boolean,
): Promise<DG.DataFrame> {
  const pb = DG.TaskBarProgressIndicator.create('Toxicity risks ...');
  try {
    await addRisksAsColumns(table, molecules, {mutagenicity, tumorigenicity, irritatingEffects, reproductiveEffects});
  } finally {
    pb.close();
  }
  return table;
}

//top-menu: Chem | Analyze | Scaffold Tree
//name: addScaffoldTree
//description: Generates a hierarchical tree based on the scaffolds presented in dataset
export function addScaffoldTree(): void {
  DG.ObjectPropertyBag.setDefaultProperty('Scaffold Tree', 'allowGenerate', true);
  grok.shell.tv.addViewer(ScaffoldTreeViewer.TYPE);
}


//top-menu: Chem | Analyze | Matched Molecular Pairs...
//name:  Matched Molecular Pairs
//input: dataframe table [Input data table]
//input: column molecules { semType: Molecule }
//input: column_list activities {type: numerical}
//input: double fragmentCutoff = 0.4 { description: Max length of fragment in % of core }
//output: object result
export async function mmpAnalysis(table: DG.DataFrame, molecules: DG.Column,
  activities: DG.ColumnList, fragmentCutoff: number = 0.4): Promise<MmpAnalysis> {
  const view = grok.shell.tv;
  const mmp = await MmpAnalysis.init({table, molecules, activities, fragmentCutoff});

  //need this workaround with closing dock node since element cannot be docked repeatedly
  mmp.mmpView.root.classList.add('mmpa');
  const mmpaElement = view.dockManager.element.getElementsByClassName('mmpa')[0];
  if (mmpaElement) {
    const node = view.dockManager.findNode(mmpaElement as HTMLElement);
    if (node)
      view.dockManager.close(node);
  }

  view.dockManager.dock(mmp.mmpView.root, 'right', null, 'MMP Analysis', 1);
  return mmp;
}

//name: Scaffold Tree Filter
//description: Scaffold Tree filter
//tags: filter
//output: filter result
//meta.semType: Molecule
export function scaffoldTreeFilter(): ScaffoldTreeFilter {
  return new ScaffoldTreeFilter();
}

//name: getScaffoldTree
//input: dataframe data
//input: int ringCutoff = 10 [Ignore molecules with # rings > N]
//input: bool dischargeAndDeradicalize = false [Remove charges and radicals from scaffolds]
//output: string result
export async function getScaffoldTree(data: DG.DataFrame,
  ringCutoff: number = 0,
  dischargeAndDeradicalize: boolean = false,
): Promise<string> {
  const molColumn = data.columns.bySemType(DG.SEMTYPE.MOLECULE);
  const invalid: number[] = new Array<number>(data.columns.length);
  const smiles = molColumn?.getTag(DG.TAGS.UNITS) === DG.UNITS.Molecule.SMILES;
  const smilesList: string[] = new Array<string>(data.columns.length);
  for (let rowI = 0; rowI < molColumn!.length; rowI++) {
    let el: string = molColumn?.get(rowI);
    if (!smiles) {
      try {
        el = convertMolNotation(el, DG.chem.Notation.MolBlock, DG.chem.Notation.Smiles);
      } catch {
        invalid[rowI] = rowI;
      }
    }

    smilesList[rowI] = el;
  }
  const smilesColumn: DG.Column = DG.Column.fromStrings('smiles', smilesList);
  smilesColumn.name = data.columns.getUnusedName(smilesColumn.name);
  data.columns.add(smilesColumn);
  const scriptBlob = await generateScaffoldTree(data, smilesColumn!.name, ringCutoff, dischargeAndDeradicalize);
  const scriptRes = new TextDecoder().decode(scriptBlob.data);
  return scriptRes;
}


//name: filterMoleculeDuplicates
//input: list molecules
//input: string molecule
//output: list result
export function removeDuplicates(molecules: string[], molecule: string): string[] {
  const mol1 = checkMoleculeValid(molecule);
  if (!mol1)
    throw new Error(`Molecule is possibly malformed`);
  const filteredMolecules = molecules.filter((smiles) => !checkMolEqualSmiles(mol1, smiles));
  mol1.delete();
  return filteredMolecules;
}


//name: Demo Chem Overview
//meta.demoPath: Cheminformatics | Overview
//description: Overview of Cheminformatics functionality
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoChemOverview(): Promise<void> {
  _demoChemOverview();
}


//name: Demo Similarity Search
//description: Searching for most similar or diverse molecules in dataset
//meta.demoPath: Cheminformatics | Similarity & Diversity Search
export async function demoSimilarityDiversitySearch(): Promise<void> {
  await _demoSimilarityDiversitySearch();
}

//name: Demo Matched Molecular Pairs
//description: Detect matched molecule pairs calculate the difference in activity values between them
//meta.demoPath: Cheminformatics | Matched Molecular Pairs
export async function demoMMPA(): Promise<void> {
  await _demoMMPA();
}


//name: Demo R Group Analysis
//description: R Group Analysis including R-group decomposition and  visual analysis of the obtained R-groups
//meta.demoPath: Cheminformatics | R Group Analysis
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoRgroupAnalysis(): Promise<void> {
  _demoRgroupAnalysis();
}


//name: Demo Activity Cliffs
//description: Searching similar structures with significant activity difference
//meta.demoPath: Cheminformatics | Molecule Activity Cliffs
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoActivityCliffs(): Promise<void> {
  _demoActivityCliffs();
}

//name: Demo Databases
//description: Running various queries to chemical databases using convenient input forms
//meta.demoPath: Cheminformatics | Chemical Databases
export async function demoDatabases(): Promise<void> {
  await _demoDatabases4();
}

//name: Demo Scaffold Tree
//description: Running scaffold analysis with hierarchical tree
//meta.demoPath: Cheminformatics | Scaffold Tree
export async function demoScaffold(): Promise<void> {
  await _demoScaffoldTree();
}


//top-menu: Chem | Transform | Names To Smiles...
//name: namesToSmiles
//input: dataframe data
//input: column names
export async function namesToSmiles(data: DG.DataFrame, names: DG.Column<string>): Promise<void> {
  const namesList = names.toList();
  const res = await grok.functions.call('Chembl:namesToSmiles', {names: namesList});
  const col = res.col('canonical_smiles');
  col.tags[DG.TAGS.UNITS] = DG.UNITS.Molecule.SMILES;
  col.semType = DG.SEMTYPE.MOLECULE;
  data.columns.add(col);
}

//top-menu: Chem | Transform | Convert Notation...
//name: convertNotation
//input: dataframe data
//input: column molecules {semType: Molecule}
//input: string targetNotation = "smiles" {choices:["smiles", "smarts", "molblock", "v3Kmolblock"]}
//input: bool overwrite = false
//input: bool join = true
//output: column result
export async function convertNotation(data: DG.DataFrame, molecules: DG.Column<string>,
  targetNotation: DG.chem.Notation, overwrite = false, join = true ): Promise<void | DG.Column<string>> {
  const res = await convertNotationForColumn(molecules, targetNotation);
  const units = targetNotation === DG.chem.Notation.MolBlock ? DG.UNITS.Molecule.MOLBLOCK :
    targetNotation === DG.chem.Notation.V3KMolBlock ? DG.UNITS.Molecule.V3K_MOLBLOCK : DG.UNITS.Molecule.SMILES;
  if (overwrite) {
    for (let i = 0; i < molecules.length; i++)
      molecules.set(i, res[i], false);
    molecules.tags[DG.TAGS.UNITS] = units;
  } else {
    const col = DG.Column.fromStrings(`${molecules.name}_${targetNotation}`, res);
    col.tags[DG.TAGS.UNITS] = units;
    col.semType = DG.SEMTYPE.MOLECULE;
    if (!join)
      return col;
    data.columns.add(col);
  }
}

//name: canonicalize
//input: string molecule { semType: Molecule }
//output: string smiles { semType: Molecule }
//meta.role: canonicalizer
export function canonicalize(molecule: string): string {
  return convertMolNotation(molecule, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles);
}

//name: validateMolecule
//input: string s
//output: object result
export function validateMolecule(s: string): string | null {
  let logHandle: RDLog | null = null;
  let mol: RDMol | null = null;
  try {
    logHandle = _rdKitModule.set_log_capture('rdApp.error');
    mol = getMolSafe(s, {}, _rdKitModule, true).mol;
    let logBuffer = logHandle?.get_buffer();
    logHandle?.clear_buffer();
    if (!mol && !logBuffer)
      logBuffer = 'unknown error';
    return logBuffer ?? null;
  } finally {
    logHandle?.delete();
    mol?.delete();
  }
}

let container: DG.DockerContainer;

export async function getContainer() {
  if (!container)
    container = await grok.dapi.docker.dockerContainers.filter('chemprop').first();
  if (container.status !== 'started' && container.status !== 'checking')
    await grok.dapi.docker.dockerContainers.run(container.id, true);
  return container;
}

//name: getAllModelingEngines
//description: Gets all registered modeling engines with parameters
//output: map models
export async function getAllModelingEngines(): Promise<object> {
  const container = await getContainer();
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/modeling/engines');
  if (response.status !== 200)
    throw new Error(response.statusText);
  return toDart(await response.json());
}

//name: trainModel
//description: Train model
//input: string id
//input: string type
//input: string tableServerUrl
//input: string tableToken
//input: string predict
//input: map parameterValues
//output: blob result
export async function trainModel(
  id: string, type: string, tableServerUrl: string, tableToken: string, predict: string, parameterValues: {[_: string]: any}
): Promise<Uint8Array> {
  const container = await getContainer();
  const uriParams = new URLSearchParams({
    'id': id,
    'type': type,
    'table_server_url': tableServerUrl,
    'table_token': tableToken,
    'predict': predict
  });
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id,
    '/modeling/train?' + uriParams, {method: 'POST', body: JSON.stringify(parameterValues),
      headers: {'Content-Type': 'application/json'}});
  if (response.status !== 201)
    throw new Error(response.statusText);
  return new Uint8Array(await response.arrayBuffer());
}

//name: applyModel
//description: Apply model
//input: string id
//input: string type
//input: blob modelBlob
//input: string tableServerUrl
//input: string tableToken
//output: list result
export async function applyModel(id: string, type: string, modelBlob: Uint8Array, tableServerUrl: string,
                                 tableToken: string): Promise<DG.Column[]> {
  const container = await getContainer();
  const uriParams = new URLSearchParams({
    'id': id,
    'type': type,
    'table_server_url': tableServerUrl,
    'table_token': tableToken
  });
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id,
    '/modeling/predict?' + uriParams, {method: 'POST', body: modelBlob,
      headers: {'Content-Type': 'application/octet-stream'}});
  if (response.status !== 201)
    throw new Error(response.statusText);
  const data = await response.json();
  const column = DG.Column.fromStrings('outcome', Array.from(data['outcome'], (v: any, _) => v?.toString()));
  return [toDart(column)];
}

export {getMCS};
