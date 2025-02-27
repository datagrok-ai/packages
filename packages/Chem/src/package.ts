/* eslint-disable max-params */
/* eslint-disable max-len */
/* eslint-disable max-lines */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import '../css/chem.css';
import * as chemSearches from './chem-searches';
import {GridCellRendererProxy, RDKitCellRenderer} from './rendering/rdkit-cell-renderer';
import {assure} from '@datagrok-libraries/utils/src/test';
import {OpenChemLibSketcher} from './open-chem/ocl-sketcher';
import {_importSdf} from './open-chem/sdf-importer';
import {OCLCellRenderer} from './open-chem/ocl-cell-renderer';
import Sketcher = DG.chem.Sketcher;
import {runActivityCliffs, getActivityCliffsEmbeddings, ISequenceSpaceResult} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import {ActivityCliffsEditor as ActivityCliffsFunctionEditor}
  from '@datagrok-libraries/ml/src/functionEditors/activity-cliffs-function-editor';
import {MAX_SUBSTRUCTURE_SEARCH_ROW_COUNT, EMPTY_MOLECULE_MESSAGE,
  SMARTS_MOLECULE_MESSAGE, elementsTable} from './constants';
import {similarityMetric} from '@datagrok-libraries/ml/src/distance-metrics-methods';
import {calculateDescriptors, getDescriptorsTree} from './docker/api';
import {addDescriptorsColsToDf, getDescriptorsSingle, openDescriptorsDialogDocker} from './descriptors/descriptors-calculation';
import {identifiersWidget, openMapIdentifiersDialog, textToSmiles} from './widgets/identifiers';

//widget imports
import {SubstructureFilter} from './widgets/chem-substructure-filter';
import {drugLikenessWidget} from './widgets/drug-likeness';
import {addPropertiesAsColumns, getChemPropertyFunc, getPropertiesAsColumns, propertiesWidget} from './widgets/properties';
import {structuralAlertsWidget} from './widgets/structural-alerts';
import {structure2dWidget} from './widgets/structure2d';
import {addRisksAsColumns, toxicityWidget} from './widgets/toxicity';

//panels imports
import {getInchiKeysImpl, getInchisImpl} from './panels/inchi';
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
import {ActivityCliffsParams, createPropPanelElement, createTooltipElement} from './analysis/activity-cliffs';
import {chemDiversitySearch, ChemDiversityViewer} from './analysis/chem-diversity-viewer';
import {chemSimilaritySearch, ChemSimilarityViewer} from './analysis/chem-similarity-viewer';
import {chemSpace, runChemSpace} from './analysis/chem-space';
import {RGroupDecompRes, RGroupParams, rGroupAnalysis, rGroupDecomp} from './analysis/r-group-analysis';
import {MatchedMolecularPairsViewer} from './analysis/molecular-matched-pairs/mmp-viewer/mmp-viewer';

//file importers
import {_importTripos} from './file-importers/mol2-importer';
import {_importSmi} from './file-importers/smi-importer';

import {generateScaffoldTree} from './scripts-api';
import {renderMolecule} from './rendering/render-molecule';
import {RDKitReactionRenderer} from './rendering/rdkit-reaction-renderer';
import {structure3dWidget} from './widgets/structure3d';
import {BitArrayMetrics, BitArrayMetricsNames} from '@datagrok-libraries/ml/src/typed-metrics';
import {_demoActivityCliffs, _demoChemOverview, _demoMMPA,
  _demoRgroupAnalysis, _demoScaffoldTree, _demoSimilarityDiversitySearch} from './demo/demo';
import {getStructuralAlertsByRules, RuleId, RuleSet, STRUCT_ALERTS_RULES_NAMES} from './panels/structural-alerts';
import {getmolColumnHighlights} from './widgets/col-highlights';
import {RDLog, RDModule, RDMol} from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {malformedDataWarning} from './utils/malformed-data-utils';
import {DimReductionBaseEditor} from '@datagrok-libraries/ml/src/functionEditors/dimensionality-reduction-editor';
import {getEmbeddingColsNames}
  from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import {Options} from '@datagrok-libraries/utils/src/type-declarations';
import {ITSNEOptions, IUMAPOptions} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/multi-column-dim-reducer';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {getMCS} from './utils/most-common-subs';
import JSZip from 'jszip';
import {MolfileHandler} from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler';
import {MolfileHandlerBase} from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler-base';
import {fetchWrapper} from '@datagrok-libraries/utils/src/fetch-utils';
import {CHEM_PROP_MAP} from './open-chem/ocl-service/calculations';
import {cutFragments} from './analysis/molecular-matched-pairs/mmp-viewer/mmp-react-toolkit';
import { ReinventBaseEditor, TARGET_PATH } from './widgets/reinvent-editor';
import { oclMol } from './utils/chem-common-ocl';

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

//name: getMolFileHandler
//input: string molString
//output: object handler
export function getMolFileHandler(molString: string): MolfileHandlerBase {
  return MolfileHandler.getInstance(molString);
}

export const _package: DG.Package = new DG.Package();
export let _properties: any;

let _rdRenderer: RDKitCellRenderer;
export let renderer: GridCellRendererProxy;
let _renderers: Map<string, DG.GridCellRenderer>;
let _initChemPromise: Promise<void> | null = null;

async function initChemInt(): Promise<void> {
  chemCommonRdKit.setRdKitWebRoot(_package.webRoot);
  await chemCommonRdKit.initRdKitModuleLocal();
  _properties = await _package.getProperties();
  _rdRenderer = new RDKitCellRenderer(getRdKitModule());
  renderer = new GridCellRendererProxy(_rdRenderer, 'Molecule');
  let storedSketcherType = grok.userSettings.getValue(DG.chem.STORAGE_NAME, DG.chem.KEY) ?? '';
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
  _renderers = new Map();
}


//tags: init
export async function init(): Promise<void> {
  if (!_initChemPromise)
    _initChemPromise = initChemInt();
  await _initChemPromise;
}

//tags: autostart
export async function initChemAutostart(): Promise<void> { }

//name: Chemistry | Most Diverse Structures
//tags: tooltip
//input: column col {semType: Molecule}
//output: widget result
export async function chemTooltip(col: DG.Column): Promise<DG.Widget | undefined> {
  const initialWidth = 255;
  const initialHeight = 90;
  const tooltipMaxWidth = 500;
  const version = col.version;

  for (let i = 0; i < col.length; ++i) {
    if (!col.isNone(i) && _isSmarts(col.get(i)))
      return;
  }

  const divMain = ui.div();
  divMain.append(ui.divText('Most diverse structures', 'chem-tooltip-text'));
  const divStructures = ui.div([ui.loader()]);
  divStructures.classList.add('chem-tooltip-structure-div');

  const getDiverseStructures = async (): Promise<void> => {
    if (col.temp['version'] !== version || col.temp['molIds'].length === 0) {
      const molIds = await chemDiversitySearch(
        col, similarityMetric[BitArrayMetricsNames.Tanimoto], 6, Fingerprint.Morgan, DG.BitSet.create(col.length).setAll(true), true);

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

  Object.assign(widget.root.style, {
    position: 'relative',
    width: `${initialWidth}px`,
    height: `${initialHeight}px`,
  });

  const tooltip = document.querySelector('.d4-tooltip');
  if (tooltip) {
    const {width, height} = tooltip.getBoundingClientRect();
    const isWideTooltip = width + initialWidth > tooltipMaxWidth;

    Object.assign(widget.root.style, {
      left: isWideTooltip ? '0' : `${width - widget.root.offsetWidth}px`,
      top: isWideTooltip ? '0' : `${30 - height}px`,
      width: `${isWideTooltip ? initialWidth : initialWidth + width}px`,
      height: isWideTooltip ? `${initialHeight}px` : '0',
    });
  }

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
//meta.vectorFunc: true
//input: column<string> molColumn {semType: Molecule}
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
  return await fetchWrapper(() => getDescriptorsTree());
}

//top-menu: Chem | Calculate | Map Identifiers...
//name: Map Identifiers
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
  const descCols = await fetchWrapper(() => calculateDescriptors(molecules, descriptors));
  addDescriptorsColsToDf(table, descCols);
}

//name: chemDescriptor
//meta.vectorFunc: true
//input: column<string> molecules {semType: Molecule}
//input: string descriptor
//output: column res
export async function chemDescriptor(molecules: DG.Column, descriptor: string): Promise<DG.Column> {
  let descCol: DG.Column;
  try {
    const descCols = await fetchWrapper(() => calculateDescriptors(molecules, [descriptor]));
    descCol = descCols.length ? descCols.filter((it) => it)[0] : DG.Column.string(descriptor, molecules.length).init(`Error calculating ${descriptor}`);
  } catch (e) {
    descCol = DG.Column.string(descriptor, molecules.length).init(`Error calculating ${descriptor}`);
  }
  return descCol;
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
    const colInput = ui.input.column('Molecules', {table: grok.shell.tv.dataFrame, value: molColumns[0]});
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
  const dialog = ui.dialog({title: 'Chemical space'})
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
    });
  dialog.history(() => ({editorSettings: funcEditor.getStringInput()}), (x: any) => funcEditor.applyStringInput(x['editorSettings']));
  dialog.show();
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
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.error(`Column ${molecules.name} is not of Molecule semantic type`);
    return;
  }
  const clusterColName = table.columns.getUnusedName('Cluster (DBSCAN)');
  const embedColsNames: string[] = getEmbeddingColsNames(table);
  const funcCall = await DG.Func.find({name: 'chemSpaceTransform'})[0].prepare({
    table: table,
    molecules: molecules,
    methodName: methodName,
    similarityMetric: similarityMetric,
    plotEmbeddings: false,
    options: JSON.stringify(options),
    preprocessingFunction: preprocessingFunction,
    clusterEmbeddings: clusterEmbeddings,
  }).call(undefined, undefined, {processed: false});
  let res = funcCall.getOutputParamValue();

  if (plotEmbeddings) {
    res = grok.shell.tv.scatterPlot({x: embedColsNames[0], y: embedColsNames[1], title: 'Chemical space'});
    //temporary fix (to save backward compatibility) since labels option type has been changed from string to array in 1.23 platform version
    if (Object.keys(res.props).includes('labelColumnNames')) { //@ts-ignore
      if (res.props['labelColumnNames'].constructor.name == 'Array')
        res.setOptions({labelColumnNames: [molecules.name]});
    }
    if (clusterEmbeddings)
      res.props.colorColumnName = clusterColName;
  }
  return res;
}

//name: chemSpaceTransform
//tags: Transform
//input: dataframe table
//input: column molecules { semType: Molecule }
//input: string methodName
//input: string similarityMetric
//input: bool plotEmbeddings = true
//input: string options {optional: true}
//input: bool clusterEmbeddings {optional: true}
export async function chemSpaceTransform(table: DG.DataFrame, molecules: DG.Column, methodName: DimReductionMethods,
  similarityMetric: BitArrayMetrics = BitArrayMetricsNames.Tanimoto, plotEmbeddings: boolean,
  options?: string, clusterEmbeddings?: boolean,
): Promise<DG.Viewer | undefined> {
  const res = await runChemSpace(table, molecules, methodName, similarityMetric, plotEmbeddings, JSON.parse(options ?? '{}'),
    undefined, clusterEmbeddings);
  console.log(`returned from runChemSpace`);
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
export async function elementalAnalysis(table: DG.DataFrame, molecules: DG.Column, radarViewer: boolean,
  radarGrid: boolean): Promise<void> {
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.info(`The column ${molecules.name} doesn't contain molecules`);
    return;
  }

  const funcCall = await DG.Func.find({name: 'runElementalAnalysis'})[0].prepare({
    table: table,
    molecules: molecules,
  }).call(undefined, undefined, {processed: false});
  const columnNames: string[] = funcCall.getOutputParamValue();

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

//name: runElementalAnalysis
//tags: Transform
//input: dataframe table
//input: column molecules { semType: Molecule }
//output: list res
export function runElementalAnalysis(table: DG.DataFrame, molecules: DG.Column): string[] {
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
  return columnNames;
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


//name: rGroupDecomposition
//tags: Transform
//input: dataframe df
//input: string molColName
//input: string core
//input: string rGroupName
//input: string rGroupMatchingStrategy
//input: string onlyMatchAtRGroups = false {optional: true}
//output: object res
export async function rGroupDecomposition(df: DG.DataFrame, molColName: string, core: string,
  rGroupName: string, rGroupMatchingStrategy: string, onlyMatchAtRGroups: boolean): Promise<RGroupDecompRes | undefined> {
  const params: RGroupParams = {
    molColName: molColName,
    core: core,
    rGroupName: rGroupName,
    rGroupMatchingStrategy: rGroupMatchingStrategy,
    onlyMatchAtRGroups: onlyMatchAtRGroups,
  };
  const col = df.col(molColName);
  if (col === null)
    throw new Error(`Current table does not contain ${params.molColName} column`); //exception
  return await rGroupDecomp(col, params);
}


//name: ActivityCliffsEditor
//tags: editor
//input: funccall call
export function ActivityCliffsEditor(call: DG.FuncCall): void {
  const funcEditor = new ActivityCliffsFunctionEditor({semtype: DG.SEMTYPE.MOLECULE});
  const dialog = ui.dialog({title: 'Activity Cliffs'})
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
    });
  dialog.history(() => ({editorSettings: funcEditor.getStringInput()}), (x: any) => funcEditor.applyStringInput(x['editorSettings']));
  dialog.show();
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
//input: func preprocessingFunction {optional: true}
//input: object options {optional: true}
//input: bool isDemo {optional: true}
//input: bool isTest {optional: true}
//editor: Chem:ActivityCliffsEditor
export async function activityCliffs(table: DG.DataFrame, molecules: DG.Column, activities: DG.Column,
  similarity: number, methodName: DimReductionMethods, similarityMetric: BitArrayMetrics,
  preprocessingFunction: DG.Func, options?: (IUMAPOptions | ITSNEOptions) & Options, isDemo?: boolean, isTest?: boolean): Promise<void> {
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
    await DG.Func.find({name: 'activityCliffsTransform'})[0].prepare({
      table: table,
      molecules: molecules,
      activities: activities,
      similarity: similarity,
      methodName: methodName,
      similarityMetric: similarityMetric,
      options: JSON.stringify(options),
      isDemo: isDemo,
    }).call(undefined, undefined, {processed: false});

    const view = isDemo ? (grok.shell.view('Browse')! as DG.BrowseView)!.preview! as DG.TableView : grok.shell.getTableView(table.name);

    view.addViewer(DG.VIEWER.SCATTER_PLOT, {
      xColumnName: axesNames[0],
      yColumnName: axesNames[1],
      color: activities.name,
      showXSelector: false,
      showYSelector: false,
      showSizeSelector: false,
      showColorSelector: false,
      markerMinSize: 5,
      markerMaxSize: 25,
      title: 'Activity cliffs',
      initializationFunction: 'activityCliffsInitFunction',
    }) as DG.ScatterPlotViewer;
  };

  const axesNames = getEmbeddingColsNames(table);
  if (table.rowCount > fastRowCount && !isTest) {
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

//name: activityCliffsInitFunction
//input: viewer v
export async function activityCliffsInitFunction(sp: DG.ScatterPlotViewer): Promise<void> {
  const tag = sp.dataFrame.getTag('activityCliffsParams');
  if (!tag) {
    grok.shell.error(`Activity cliffs parameters not found in table tags`);
    return;
  }
  const actCliffsParams: ActivityCliffsParams = JSON.parse(tag);
  const molCol = sp.dataFrame.col(actCliffsParams.molColName)!;
  const actCol = sp.dataFrame.col(actCliffsParams.activityColName)!;
  const encodedColWithOptions = await getFingerprints(molCol);

  const axesNames = [sp.getOptions().look['xColumnName'], sp.getOptions().look['yColumnName']];

  await runActivityCliffs(sp, sp.dataFrame, molCol, encodedColWithOptions, actCol, axesNames,
    actCliffsParams.similarity, actCliffsParams.similarityMetric, actCliffsParams.options, DG.SEMTYPE.MOLECULE,
    {'units': molCol.meta.units!}, createTooltipElement, createPropPanelElement, undefined, undefined, actCliffsParams.isDemo);
  //temporary fix (to save backward compatibility) since labels option type has been changed from string to array in 1.23 platform version
  if (Object.keys(sp.props).includes('labelColumnNames')) { //@ts-ignore
    if (sp.props['labelColumnNames'].constructor.name == 'Array')
      sp.setOptions({labelColumnNames: [molCol.name]});
  }
  sp.render(sp.getInfo()['canvas'].getContext('2d'));
}

//name: activityCliffsTransform
//tags: Transform
//input: dataframe table [Input data table]
//input: column molecules {type:categorical; semType: Molecule}
//input: column activities {type:numerical}
//input: double similarity = 80 [Similarity cutoff]
//input: string methodName { choices:["UMAP", "t-SNE"] }
//input: string similarityMetric { choices:["Tanimoto", "Asymmetric", "Cosine", "Sokal"] }
//input: string options {optional: true}
//input: bool isDemo {optional: true}
export async function activityCliffsTransform(table: DG.DataFrame, molecules: DG.Column, activities: DG.Column,
  similarity: number, methodName: DimReductionMethods, similarityMetric: BitArrayMetrics,
  options?: string, isDemo?: boolean): Promise<void> {
  const preprocessingFunction = DG.Func.find({name: 'getFingerprints', package: 'Chem'})[0];
  const axesNames = getEmbeddingColsNames(table);
  await getActivityCliffsEmbeddings(table, molecules, axesNames, similarity,
    similarityMetric, methodName, JSON.parse(options ?? '{}'), preprocessingFunction);
  const tagContent: ActivityCliffsParams = {
    molColName: molecules.name,
    activityColName: activities.name,
    similarityMetric: similarityMetric,
    similarity: similarity,
    options: options ?? {},
    isDemo: isDemo,
  };
  table.setTag('activityCliffsParams', JSON.stringify(tagContent));
}

//top-menu: Chem | Calculate | To InchI...
//name: To InchI
//tags: Transform
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
export function addInchisTopMenu(table: DG.DataFrame, col: DG.Column): void {
  const inchiCol = getInchisImpl(col);
  inchiCol.name = table.columns.getUnusedName(inchiCol.name);
  table.columns.add(inchiCol);
}

//name: getInchis
//meta.vectorFunc: true
//input: column<string> molecules {semType: Molecule}
//output: column res
export function getInchis(molecules: DG.Column): DG.Column {
  return getInchisImpl(molecules);
}


//top-menu: Chem | Calculate | To InchI Keys...
//name: To InchI Keys
//tags: Transform
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
export function addInchisKeysTopMenu(table: DG.DataFrame, col: DG.Column): void {
  const inchiKeyCol = getInchiKeysImpl(col);
  inchiKeyCol.name = table.columns.getUnusedName(inchiKeyCol.name);
  table.columns.add(inchiKeyCol);
}

//name: getInchiKeys
//meta.vectorFunc: true
//input: column<string> molecules {semType: Molecule}
//output: column res
export function getInchiKeys(molecules: DG.Column): DG.Column {
  return getInchiKeysImpl(molecules);
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
//input: bool dundee {caption: Dundee; default: false; description: "University of Dundee NTD Screening Library filters"}
//input: bool inpharmatica {caption: Inpharmatica; default: false; description: "Inpharmatica filters"}
//input: bool lint {caption: LINT; default: false; description: "Pfizer LINT filters"}
//input: bool glaxo {caption: Glaxo; default: false; description: "Glaxo Wellcome Hard filters"}
export async function structuralAlertsTopMenu(table: DG.DataFrame, molecules: DG.Column, pains: boolean, bms: boolean,
  sureChembl: boolean, mlsmr: boolean, dundee: boolean, inpharmatica: boolean, lint: boolean, glaxo: boolean,
): Promise<DG.DataFrame | void> {
  if (molecules.semType !== DG.SEMTYPE.MOLECULE) {
    grok.shell.error(`Column ${molecules.name} is not of Molecule semantic type`);
    return;
  }

  await DG.Func.find({name: 'runStructuralAlerts'})[0].prepare({
    table: table,
    molecules: molecules,
    pains: pains,
    bms: bms,
    sureChembl: sureChembl,
    mlsmr: mlsmr,
    dundee: dundee,
    inpharmatica: inpharmatica,
    lint: lint,
    glaxo: glaxo,
  }).call(undefined, undefined, {processed: false});

  return table;
}

//name: runStructuralAlerts
//tags: Transform
//input: dataframe table [Input data table] {caption: Table}
//input: column molecules {caption: Molecules; type: categorical; semType: Molecule}
//input: bool pains {caption: PAINS; default: true; description: "Pan Assay Interference Compounds filters"}
//input: bool bms {caption: BMS; default: false; description: "Bristol-Myers Squibb HTS Deck filters"}
//input: bool sureChembl {caption: SureChEMBL; default: false; description: "MedChem unfriendly compounds from SureChEMBL"}
//input: bool mlsmr {caption: MLSMR; default: false; description: "NIH MLSMR Excluded Functionality filters"}
//input: bool dundee {caption: Dundee; default: false; description: "University of Dundee NTD Screening Library filters"}
//input: bool inpharmatica {caption: Inpharmatica; default: false; description: "Inpharmatica filters"}
//input: bool lint {caption: LINT; default: false; description: "Pfizer LINT filters"}
//input: bool glaxo {caption: Glaxo; default: false; description: "Glaxo Wellcome Hard filters"}
export async function runStructuralAlerts(table: DG.DataFrame, molecules: DG.Column, pains: boolean, bms: boolean,
  sureChembl: boolean, mlsmr: boolean, dundee: boolean, inpharmatica: boolean, lint: boolean, glaxo: boolean,
): Promise<DG.DataFrame | void> {
  if (table.rowCount > 1000)
    grok.shell.info('Structural Alerts detection will take a while to run');

  const ruleSet: RuleSet = {'PAINS': pains, 'BMS': bms, 'SureChEMBL': sureChembl, 'MLSMR': mlsmr,
    'Dundee': dundee, 'Inpharmatica': inpharmatica, 'LINT': lint, 'Glaxo': glaxo};
  const resultDf = await getStructuralAlertsByRules(molecules, ruleSet);

  if (resultDf) {
    for (const resultCol of resultDf.columns) {
      resultCol.name = table.columns.getUnusedName(`${resultCol.name} (${molecules.name})`);
      table.columns.add(resultCol);
    }
  }
  return table;
}

//name: runStructuralAlert
//meta.vectorFunc: true
//input: column<string> molecules {semType: Molecule}
//input: string alert
//output: column res
export async function runStructuralAlert(molecules: DG.Column, alert: RuleId): Promise<DG.Column | void> {
  let col: DG.Column = DG.Column.string(alert, molecules.length).init(`Error calculating ${alert}`);
  try {
    const ruleSet: {[key: string]: boolean} = {};
    for (const rule of STRUCT_ALERTS_RULES_NAMES)
      ruleSet[rule] = alert.toLocaleLowerCase() === rule.toLocaleLowerCase();

    const resultDf = await getStructuralAlertsByRules(molecules, ruleSet as RuleSet);
    if (resultDf) {
      if (!resultDf.columns.names().length)
        col = DG.Column.string(alert, molecules.length).init(`Incorrect alert`);
      else
        col = resultDf.columns.byIndex(0);
    }
  } catch (e) {}
  return col;
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

//name: convertMoleculeNotation
//meta.vectorFunc: true
//input: column<string> molecule {semType: Molecule}
//input: string targetNotation
//output: column result
export async function convertMoleculeNotation(molecule: DG.Column, targetNotation: DG.chem.Notation): Promise<DG.Column> {
  let col: DG.Column;
  let newColName = `${molecule.name}_${targetNotation}`;
  try {
    if (!!molecule.dataFrame?.columns)
      newColName = molecule.dataFrame.columns.getUnusedName(newColName);
  } catch (e) {}

  try {
    const res = await convertNotationForColumn(molecule, targetNotation);
    col = DG.Column.fromStrings(newColName, res);
    col.semType = DG.SEMTYPE.MOLECULE;
  } catch (e: any) {
    col = DG.Column.string(newColName, molecule.length).init((_) => e?.message);
  }
  return col;
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

//top-menu: Chem | Transform | Convert Notation...
//name: Convert Notation
//tags: Transform
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
    molecules.meta.units = units;
  } else {
    const colName = data.columns.getUnusedName(`${molecules.name}_${targetNotation}`);
    const col = DG.Column.fromStrings(colName, res);
    col.meta.units = units;
    col.semType = DG.SEMTYPE.MOLECULE;
    if (!join)
      return col;
    data.columns.add(col);
  }
}

//name: Convert Notation...
//meta.action: Convert Notation...
//input: column col {semType: Molecule}
export function convertMolNotationAction(col: DG.Column) {
  const func = DG.Func.find({name: 'convertNotation', package: 'Chem'})[0];
  if (!func || !col?.dataFrame)
    return;
  func.prepare({data: col.dataFrame, molecules: col}).edit();
} 

//tags: cellEditor
//description: Molecule
//input: grid_cell cell
export async function editMoleculeCell(cell: DG.GridCell): Promise<void> {
  const sketcher = new Sketcher(undefined, validateMolecule);
  const unit = cell.cell.column.meta.units;
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
//meta.action: Sort by similarity
//input: semantic_value value { semType: Molecule }
export async function sortBySimilarity(value: DG.SemanticValue): Promise<void> {
  const molCol = value.cell.column;
  const tableRowIdx = value.cell.rowIndex;
  const dframe = molCol.dataFrame;
  const smiles = molCol.get(tableRowIdx);

  const grid = value.viewer as DG.Grid ?? grok.shell.getTableView(dframe.name)?.grid;
  if (!grid)
    throw new Error('Cannnot access value grid');
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
  if (value.cell.column.meta.units == DG.chem.Notation.Smiles)
    molblock = convertMolNotation(molecule, DG.chem.Notation.Smiles, DG.chem.Notation.MolBlock);
  else
    molblock = molToMolblock(molecule, getRdKitModule());

  tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: DG.FILTER_TYPE.SUBSTRUCTURE,
    column: molCol.name,
    columnName: molCol.name,
    molBlock: molblock,
  }, false);
}

//name: Copy as...
//description: Copies structure in different formats
//meta.action: Copy as...
//tags: exclude-current-value-menu
//input: semantic_value value { semType: Molecule }
export function copyAsAction(value: DG.SemanticValue) {
  const formats = ['Smiles', 'MolfileV2000', 'MolfileV3000', 'Smarts'];
  const menu = DG.Menu.popup();

  formats.forEach((format) => {
    const func = DG.Func.find({package: 'Chem', name: `copyAs${format}`})[0];
    if (func)
      menu.item(format, () => {
        func.apply({value: value});
      });
  });
  menu.show();
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

//name: Copy as IMAGE
//description: Copies structure as Image
//tags: exclude-actions-panel
//meta.action: Copy as Image
//input: semantic_value value { semType: Molecule }
export function copyAsImage(value: DG.SemanticValue): void {
  if (!value?.value || !value?.gridCell?.bounds || !value?.gridCell?.renderer)
    return;
  const gridCellBounds = value.gridCell.bounds;
  const w = 600;
  const heightMultiplier = w / gridCellBounds.width;
  const h = gridCellBounds.height * heightMultiplier;

  const renderer = value.gridCell.renderer;

  const canvas = ui.canvas(w * window.devicePixelRatio, h * window.devicePixelRatio);
  renderer.render(canvas.getContext('2d')!, 0, 0, w, h, value.gridCell, value.gridCell.style);
  canvas.toBlob((blob) => {
    if (!blob)
      return;
    navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(() => {
      grok.shell.info('Image copied to clipboard');
    });
  });
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
    col.meta.units = DG.UNITS.Molecule.SMILES;
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
//tags: HitTriageFunction,Transform
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

//name: getMolProperty
//meta.vectorFunc: true
//input: column<string> molecules {semType: Molecule}
//input: string property {choices:["MW", "HBA", "HBD", "LogP", "LogS", "PSA", "Rotatable bonds", "Stereo centers", "Molecule charge"]}
//output: column res
export async function getMolProperty(molecules: DG.Column, property: string): Promise<DG.Column> {
  let col: DG.Column = DG.Column.string(property, molecules.length).init(`Error calculating ${alert}`);
  try {
    const propNames = Object.keys(CHEM_PROP_MAP);
    let props: string[] = [];

    for (const propName of propNames)
      props = props.concat(propName === property ? [property] : []);

    const cols = await getPropertiesAsColumns(molecules, props);
    if (!cols.length)
      col = DG.Column.string(property, molecules.length).init(`Incorrect property`);
    else
      col = cols[0];
  } catch (e) {}

  return col;
}


//top-menu: Chem | Calculate | Toxicity Risks...
//name: Toxicity Risks
//tags: HitTriageFunction,Transform
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


//name: Matched Molecular Pairs Analysis
//tags: viewer
//output: viewer result
export function mmpViewer(): MatchedMolecularPairsViewer {
  return new MatchedMolecularPairsViewer();
}

//top-menu: Chem | Analyze | Matched Molecular Pairs...
//name:  Matched Molecular Pairs
//input: dataframe table [Input data table]
//input: column molecules { semType: Molecule }
//input: column_list activities {type: numerical}
//input: double fragmentCutoff = 0.4 { description: Maximum fragment size relative to core }
//output: viewer result
export function mmpAnalysis(table: DG.DataFrame, molecules: DG.Column,
  activities: DG.ColumnList, fragmentCutoff: number = 0.4, demo = false): void {
  let view: DG.TableView;

  if (activities.length < 1) {
    grok.shell.warning('MMP analysis requires at least one activity');
    return;
  }

  if (demo) {
    const browseView = grok.shell.view('Browse') as DG.BrowseView;
    view = browseView ? (browseView.preview as DG.TableView) : grok.shell.getTableView(table.name) as DG.TableView;
  } else
    view = grok.shell.getTableView(table.name) as DG.TableView;

  const viewer = view.addViewer('Matched Molecular Pairs Analysis');
  viewer.setOptions({molecules: molecules.name, activities: activities.names(), fragmentCutoff});
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
  const smiles = molColumn?.meta.units === DG.UNITS.Molecule.SMILES;
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


//name: Demo Scaffold Tree
//description: Running scaffold analysis with hierarchical tree
//meta.demoPath: Cheminformatics | Scaffold Tree
export async function demoScaffold(): Promise<void> {
  await _demoScaffoldTree();
}

//top-menu: Chem | Transform | Names To Smiles...
//name: Names To Smiles
//tags: Transform
//input: dataframe data
//input: column names
export async function namesToSmiles(data: DG.DataFrame, names: DG.Column<string>): Promise<void> {
  const namesList = names.toList();
  const res = await grok.functions.call('Chembl:namesToSmiles', {names: namesList});
  const col = res.col('canonical_smiles');
  col.meta.units = DG.UNITS.Molecule.SMILES;
  col.semType = DG.SEMTYPE.MOLECULE;
  data.columns.add(col);
}

//name: canonicalize
//input: string molecule { semType: molecule }
//output: string smiles { semType: molecule }
//meta.role: canonicalizer
export function canonicalize(molecule: string): string {
  return convertMolNotation(molecule, DG.chem.Notation.Unknown, DG.chem.Notation.Smiles);
}

//name: getMolecularFormula
//input: string molecule { semType: molecule }
//output: string molecularFormula
export function getMolecularFormula(molecule: string): string {
  return oclMol(molecule).getMolecularFormula().formula;
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
  return container;
}

export async function trainModelChemprop(table: string, predict: string, parameterValues: Record<string, any>): Promise<Uint8Array> {
  const container = await getContainer();

  const body = {
    type: 'Chemprop',
    table: table,
    predict: predict,
    parameters: parameterValues,
  };

  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/modeling/train_chemprop', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });

  if (response.status !== 201) {
    if (!container.status.startsWith('started') && !container.status.startsWith('checking'))
      throw new Error(`Failed to start container: ${container.friendlyName}`);
    throw new Error(`Error training model: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function applyModelChemprop(modelBlob: Uint8Array, table: string): Promise<DG.Column> {
  const container = await getContainer();

  const body = {
    modelBlob: Array.from(modelBlob),
    table: table,
  };

  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/modeling/predict_chemprop', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
  });

  if (response.status !== 201) {
    if (!container.status.startsWith('started') && !container.status.startsWith('checking'))
      throw new Error(`Failed to start container: ${container.friendlyName}`);
    throw new Error(`Error applying model: ${response.statusText}`);
  }

  const data = await response.json();
  return DG.Column.fromStrings('outcome', data['outcome'].map((v: any) => v?.toString()));
}

//name: trainChemprop
//description: To be added
//meta.mlname: Chemprop
//meta.mlrole: train
//input: dataframe df
//input: column predictColumn
//input: string dataset_type = 'regression' {category: General; choices: ['regression', 'classification']} [Type of dataset, e.g. classification or regression. This determines the loss function used during training.]
//input: string metric = 'rmse' {category: General; choices: ['auc', 'prc-auc', 'rmse', 'mae', 'mse', 'r2', 'accuracy', 'cross_entropy']} [Metric to use during evaluation. Note: Does NOT affect loss function used during training (loss is determined by the `dataset_type` argument).]
//input: int multiclass_num_classes = 3 {category: General} [Number of classes when running multiclass classification]
//input: int num_folds = 1 {category: General} [Number of folds when performing cross validation]
//input: int data_seed = 0 {category: General} [Random seed to use when splitting data into train/val/test sets. When `num_folds` > 1, the first fold uses this seed and all subsequent folds add 1 to the seed.]
//input: list split_sizes = [0.8, 0.1, 0.1] {category: General} [Split proportions for train/validation/test sets]
//input: string split_type = 'random' {category: General; choices: ['random', 'scaffold_balanced', 'predetermined', 'crossval', 'index_predetermined']} [Method of splitting the data into train/val/test]
//input: string activation = 'ReLU' {category: Model; choices: ['ReLU', 'LeakyReLU', 'PReLU', 'tanh', 'SELU', 'ELU']} [Activation function]
//input: bool atom_messages = false {category: Model} [Use messages on atoms instead of messages on bonds]
//input: bool message_bias = false {category: Model} [Whether to add bias to linear layers]
//input: int ensemble_size = 1 {category: Model} [Number of models in ensemble]
//input: int message_hidden_dim = 300 {category: Model} [Dimensionality of hidden layers in MPN]
//input: int depth = 3 {category: Model} [Number of message passing step]
//input: double dropout = 0.0 {category: Model} [Dropout probability]
//input: int ffn_hidden_dim = 300 {category: Model} [Hidden dim for higher-capacity FFN (defaults to hidden_size)]
//input: int ffn_num_layers = 2 {category: Model} [Number of layers in FFN after MPN encoding]
//input: int epochs = 50 {category: Training} [Number of epochs to run]
//input: int batch_size = 64 {category: Training} [Batch size]
//input: double warmup_epochs = 2.0 {category: Training} [Number of epochs during which learning rate increases linearly from init_lr to max_lr. Afterwards, learning rate decreases exponentially from max_lr to final_lr.]
//input: double init_lr = 0.0001 {category: Training} [Initial learning rate]
//input: double max_lr = 0.001 {category: Training} [Maximum learning rate]
//input: double final_lr = 0.0001 {category: Training} [Final learning rate]
//input: bool no_descriptor_scaling = false {category: Training} [Turn off scaling of features]
//output: dynamic model
export async function trainChemprop(
  df: DG.DataFrame, predictColumn: DG.Column, dataset_type: string, metric: string, multiclass_num_classes: number, num_folds: number,
  data_seed: number, split_sizes: any, split_type: string, activation: string, atom_messages: boolean, message_bias: boolean, ensemble_size: number,
  message_hidden_dim: number, depth: number, dropout: number, ffn_hidden_dim: number, ffn_num_layers: number, epochs: number, batch_size: number,
  warmup_epochs: number, init_lr: number, max_lr: number, final_lr: number, no_descriptor_scaling: boolean,
): Promise<Uint8Array | undefined> {
  const parameterValues = {
    'dataset_type': dataset_type,
    'metric': metric,
    'multiclass_num_classes': multiclass_num_classes,
    'activation': activation,
    'atom_messages': atom_messages,
    'batch_size': batch_size,
    'message_bias': message_bias,
    'depth': depth,
    'dropout': dropout,
    'ensemble_size': ensemble_size,
    'epochs': epochs,
    'ffn_hidden_dim': ffn_hidden_dim,
    'ffn_num_layers': ffn_num_layers,
    'final_lr': final_lr,
    'message_hidden_dim': message_hidden_dim,
    'init_lr': init_lr,
    'max_lr': max_lr,
    'no_descriptor_scaling': no_descriptor_scaling,
    'num_folds': num_folds,
    'data_seed': data_seed,
    'split_sizes': split_sizes,
    'split_type': split_type,
    'warmup_epochs': warmup_epochs,
  };
  df.columns.add(predictColumn);
  try {
    const modelBlob = await trainModelChemprop(df.toCsv(), predictColumn.name, parameterValues);
    const zip = new JSZip();
    const archive = await zip.loadAsync(modelBlob);
    const file = archive.file('blob.bin');
    const binBlob = await file?.async('uint8array')!;
    return binBlob;
  } catch (error: any) {
    grok.shell.error(error);
  }
}

//name: applyChemprop
//meta.mlname: Chemprop
//meta.mlrole: apply
//input: dataframe df
//input: dynamic model
//output: dataframe data_out
export async function applyChemprop(df: DG.DataFrame, model: Uint8Array) {
  try {
    const column = await applyModelChemprop(model, df.toCsv());
    return DG.DataFrame.fromColumns([column]);
  } catch (error: any) {
    grok.shell.error(error);
  }
}

//name: isApplicableNN
//meta.mlname: Chemprop
//meta.mlrole: isApplicable
//input: dataframe df
//input: column predictColumn
//output: bool result
export async function isApplicableNN(df: DG.DataFrame, predictColumn: DG.Column) {
  if (df.columns.length > 1)
    return false;
  const featureColumn = df.columns.byIndex(0);
  if (featureColumn.semType != 'Molecule')
    return false;
  if (!predictColumn.matches('numerical'))
    return false;
  return true;
}

export {getMCS};

//top-menu: Chem | Transform | Deprotect...
//name: Deprotect
//description: Generates the new dataset based on the given structure
//input: dataframe table [Input data table]
//input: column molecules {semType: Molecule}
//input: string fragment = "O=C([N:1])OCC1c2ccccc2-c2ccccc21" {semType: Molecule}
export async function deprotect(table: DG.DataFrame, molecules: DG.Column, fragment: string): Promise<void> {
  const module = getRdKitModule();
  const cut = cutFragments(module, molecules.toList(), fragment);
  const res = cut.map((c) => c[0]);
  const col = DG.Column.fromStrings('deprotected', res);
  col.semType = DG.SEMTYPE.MOLECULE;
  table.columns.add(col);
}

async function zipFolder(folder: DG.FileInfo[]): Promise<Blob> {
  const zip = new JSZip();
  folder.forEach(file => {
    zip.file(file.name, file.readAsBytes());
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

//name: getFolders
//output: list<string> targetFiles
export async function getFolders(): Promise<string[]> {
  const targetsFiles: DG.FileInfo[] = await grok.dapi.files.list(TARGET_PATH, true);
  return targetsFiles.filter((dir) =>  dir.isDirectory).map((dir) => dir.name);
}

//name: ReinventEditor
//tags: editor
//input: funccall call
export function reinventEditor(call: DG.FuncCall): void {
  const funcEditor = new ReinventBaseEditor();
  ui.dialog({title: 'Reinvent'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
      call.func.prepare({
        ligand: params.ligand,
        optimize: params.optimize
      }).call(true);
    }).show();
}

//name: runReinvent
//meta.cache: all
//meta.cache.invalidateOn: 0 * * * *
//input: string ligand {semType: Molecule}
//input: string optimize
//output: dataframe result
export async function runReinvent(ligand: string, optimize: string): Promise<DG.DataFrame> {
  const container = await grok.dapi.docker.dockerContainers.filter('reinvent').first();
  const files = (await grok.dapi.files.list(`${TARGET_PATH}/${optimize}`));

  const zipBlob = await zipFolder(files);
  const formData = new FormData();
  formData.append('folder', zipBlob, 'folder.zip');
  [ligand].forEach(smiles => {
    formData.append('smiles', smiles);
  });

  const response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/run_reinvent', {
    method: 'POST',
    body: formData,
  });

  const resultDf = DG.DataFrame.fromJson(await response.text());
  return resultDf;
}

//top-menu: Chem | Generate molecules...
//name: Reinvent
//tags: HitDesignerFunction
//input: string ligand = "OC(CN1CCCC1)NC(CCC1)CC1Cl" {semType: Molecule}
//input: string optimize {choices: Chem:getFolders}
//editor: Chem: ReinventEditor
//output: dataframe result
export async function reinvent(
  ligand: string, optimize: string
): Promise<DG.DataFrame> {
  const resultDfPromise = grok.functions.call('Chem:runReinvent', {
    ligand: ligand,
    optimize: optimize
  });
  const schemas = await grok.dapi.stickyMeta.getSchemas();
  const lineageSchema = schemas.find((s) => s.name === 'Lineage');

  const resultDf: DG.DataFrame = await resultDfPromise;

  if (lineageSchema) {
    const molCol = DG.Column.fromStrings('canonical_smiles', [ligand]);
    molCol.semType = DG.SEMTYPE.MOLECULE;

    const seedDf = generateStickyDf('seed ligand');
    const generatedDf = generateStickyDf('generated');

    const lineagePromise = grok.dapi.stickyMeta.setAllValues(lineageSchema, molCol, seedDf);

    const resultMolCol = resultDf.columns.byName('SMILES');
    const initialMolCol = resultDf.columns.byName('Input_SMILES');
    resultMolCol.semType = DG.SEMTYPE.MOLECULE;
    initialMolCol.semType = DG.SEMTYPE.MOLECULE;
    await grok.data.detectSemanticTypes(resultDf);

    if (resultMolCol) {
      const lineagePromises = resultMolCol.toList().map((smiles: string) => {
        const col = DG.Column.fromStrings('smiles', [smiles]);
        col.semType = DG.SEMTYPE.MOLECULE;
        return grok.dapi.stickyMeta.setAllValues(lineageSchema, col, generatedDf);
      });

      await Promise.all([lineagePromise, ...lineagePromises]);
    }
  }

  const scoreColumn = resultDf.col('Score');
  if (scoreColumn)
    scoreColumn.meta.colors.setLinear([DG.Color.red, DG.Color.green]);

  return resultDf;
}

function generateStickyDf(role: string): DG.DataFrame {
  const lineageDf = DG.DataFrame.create(1);
  const roleCol = lineageDf.columns.addNewString('Role');
  roleCol.set(0, role);
  const optimizedCol = lineageDf.columns.addNewString('Optimized parameters');
  optimizedCol.set(0, 'Binding affinity, hERG, BBB, CYP Inhibitors');
  const authorCol = lineageDf.columns.addNewString('User');
  authorCol.set(0, grok.shell.user.friendlyName);
  const dateCol = lineageDf.columns.addNewString('Date');
  dateCol.set(0, new Date().toLocaleString());
  return lineageDf;
}