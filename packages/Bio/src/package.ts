/* eslint max-lines: "off" */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {Options} from '@datagrok-libraries/utils/src/type-declarations';
import {DimReductionBaseEditor, PreprocessFunctionReturnType}
  from '@datagrok-libraries/ml/src/functionEditors/dimensionality-reduction-editor';
import {getActivityCliffs} from '@datagrok-libraries/ml/src/viewers/activity-cliffs';
import {MmDistanceFunctionsNames} from '@datagrok-libraries/ml/src/macromolecule-distance-functions';
import {BitArrayMetrics, KnownMetrics} from '@datagrok-libraries/ml/src/typed-metrics';
import {NOTATION, TAGS as bioTAGS} from '@datagrok-libraries/bio/src/utils/macromolecule';
import {SeqHandler, SeqTemps} from '@datagrok-libraries/bio/src/utils/seq-handler';
import {IMonomerLib} from '@datagrok-libraries/bio/src/types';
import {SeqPalette} from '@datagrok-libraries/bio/src/seq-palettes';
import {FastaFileHandler} from '@datagrok-libraries/bio/src/utils/fasta-handler';
import {_toAtomicLevel} from '@datagrok-libraries/bio/src/monomer-works/to-atomic-level';
import {SCORE, calculateScores} from '@datagrok-libraries/bio/src/utils/macromolecule/scoring';
import {
  createJsonMonomerLibFromSdf, IMonomerLibHelper
} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';

import {getMacromoleculeColumns} from './utils/ui-utils';
import {
  MacromoleculeDifferenceCellRenderer, MacromoleculeSequenceCellRenderer,
} from './utils/cell-renderer';
import {VdRegionsViewer} from './viewers/vd-regions-viewer';
import {SequenceAlignment} from './seq_align';
import {getEncodedSeqSpaceCol} from './analysis/sequence-space';
import {
  createLinesGrid, createPropPanelElement, createTooltipElement,
} from './analysis/sequence-activity-cliffs';
import {SequenceSimilarityViewer} from './analysis/sequence-similarity-viewer';
import {SequenceDiversityViewer} from './analysis/sequence-diversity-viewer';
import {MONOMERIC_COL_TAGS, SubstructureSearchDialog, invalidateMols} from './substructure-search/substructure-search';
import {convert} from './utils/convert';
import {getMacromoleculeColumnPropertyPanel} from './widgets/representations';
import {saveAsFastaUI} from './utils/save-as-fasta';
import {BioSubstructureFilter} from './widgets/bio-substructure-filter';
import {WebLogoViewer} from './viewers/web-logo-viewer';
import {MonomerLibManager} from './utils/monomer-lib/lib-manager';
import {getMonomerLibraryManagerLink, showManageLibrariesDialog} from './utils/monomer-lib/library-file-manager/ui';
import {demoBio01UI} from './demo/bio01-similarity-diversity';
import {demoBio01aUI} from './demo/bio01a-hierarchical-clustering-and-sequence-space';
import {demoBio01bUI} from './demo/bio01b-hierarchical-clustering-and-activity-cliffs';
import {demoBio03UI} from './demo/bio03-atomic-level';
import {demoBio05UI} from './demo/bio05-helm-msa-sequence-space';
import {checkInputColumnUI} from './utils/check-input-column';
import {MsaWarning} from './utils/multiple-sequence-alignment';
import {multipleSequenceAlignmentUI} from './utils/multiple-sequence-alignment-ui';
import {WebLogoApp} from './apps/web-logo-app';
import {SplitToMonomersFunctionEditor} from './function-edtiors/split-to-monomers-editor';
import {splitToMonomersUI} from './utils/split-to-monomers';
import {MonomerCellRenderer} from './utils/monomer-cell-renderer';
import {BioPackage, BioPackageProperties} from './package-types';
import {getCompositionAnalysisWidget} from './widgets/composition-analysis-widget';
import {MacromoleculeColumnWidget} from './utils/macromolecule-column-widget';
import {addCopyMenuUI} from './utils/context-menu';
import {getRegionDo} from './utils/get-region';
import {GetRegionApp} from './apps/get-region-app';
import {GetRegionFuncEditor} from './utils/get-region-func-editor';
import {sequenceToMolfile} from './utils/sequence-to-mol';
import {detectMacromoleculeProbeDo} from './utils/detect-macromolecule-probe';
import {ActivityCliffsEditor} from '@datagrok-libraries/ml/src/functionEditors/activity-cliffs-function-editor';
import BitArray from '@datagrok-libraries/utils/src/bit-array';
import {BYPASS_LARGE_DATA_WARNING} from '@datagrok-libraries/ml/src/functionEditors/consts';
import {
  getEmbeddingColsNames, multiColReduceDimensionality
} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/reduce-dimensionality';
import {DimReductionMethods} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/types';
import {
  ITSNEOptions, IUMAPOptions
} from '@datagrok-libraries/ml/src/multi-column-dimensionality-reduction/multi-column-dim-reducer';
import {generateLongSequence, generateLongSequence2} from '@datagrok-libraries/bio/src/utils/generator';

import {CyclizedNotationProvider} from './utils/cyclized';
import {getMolColumnFromHelm} from './utils/helm-to-molfile/utils';

export const _package = new BioPackage();

// /** Avoid reassigning {@link monomerLib} because consumers subscribe to {@link IMonomerLib.onChanged} event */
// let monomerLib: MonomerLib | null = null;

//name: getMonomerLibHelper
//description:
//output: object result
export async function getMonomerLibHelper(): Promise<IMonomerLibHelper> {
  return await MonomerLibManager.getInstance();
}

export let hydrophobPalette: SeqPaletteCustom | null = null;

export class SeqPaletteCustom implements SeqPalette {
  private readonly _palette: { [m: string]: string };

  constructor(palette: { [m: string]: string }) {
    this._palette = palette;
  }

  public get(m: string): string {
    return this._palette[m];
  }
}

let monomerLib: IMonomerLib | null = null;

//tags: init
export async function initBio() {
  const logPrefix = 'Bio: _package.initBio()';
  _package.logger.debug(`${logPrefix}, start`);
  const module = await grok.functions.call('Chem:getRdKitModule');
  const t1: number = window.performance.now();
  await Promise.all([
    (async () => {
      const monomerLibManager = await MonomerLibManager.getInstance();
      await monomerLibManager.loadLibraries();
      monomerLib = monomerLibManager.getBioLib();
    })(),
    (async () => {
      const pkgProps = await _package.getProperties();
      const bioPkgProps = new BioPackageProperties(pkgProps);
      _package.properties = bioPkgProps;
    })(),
  ]).finally(() => {
    _package.completeInit();
    const t2: number = window.performance.now();
    _package.logger.debug(`${logPrefix}, loading ET: ${t2 - t1} ms`);
  });

  const monomers: string[] = [];
  const logPs: number[] = [];

  const series = monomerLib!.getMonomerMolsByPolymerType('PEPTIDE')!;
  Object.keys(series).forEach((symbol) => {
    monomers.push(symbol);
    const block = series[symbol].replaceAll('#R', 'O ');
    const mol = module.get_mol(block);
    const logP = JSON.parse(mol.get_descriptors()).CrippenClogP;
    logPs.push(logP);
    mol?.delete();
  });

  const sum = logPs.reduce((a, b) => a + b, 0);
  const avg = (sum / logPs.length) || 0;

  const palette: { [monomer: string]: string } = {};
  for (let i = 0; i < monomers.length; i++)
    palette[monomers[i]] = logPs[i] < avg ? '#4682B4' : '#DC143C';

  hydrophobPalette = new SeqPaletteCustom(palette);

  _package.logger.debug(`${logPrefix}, end`);
}

//name: sequenceTooltip
//tags: tooltip
//input: column col {semType: Macromolecule}
//output: widget result
export function sequenceTooltip(col: DG.Column): DG.Widget<any> {
  const resWidget = new MacromoleculeColumnWidget(col);
  const _resPromise = resWidget.init().then(() => { })
    .catch((err: any) => {
      const errMsg = err instanceof Error ? err.message : err.toString();
      grok.shell.error(errMsg);
    });
  return resWidget;
}

// Keep for backward compatibility
//name: getBioLib
//output: object monomerLib
export function getBioLib(): IMonomerLib {
  return monomerLib!;
}

// For sync internal use, on initialized package
export function getMonomerLib(): IMonomerLib | null {
  return monomerLib!;
}

//name: getSeqHandler
//input: column sequence { semType: Macromolecule }
//output: object result
export function getSeqHandler(sequence: DG.Column<string>): SeqHandler {
  return SeqHandler.forColumn(sequence);
}

// -- Panels --

//name: Bioinformatics | Get Region
//description: Creates a new column with sequences of the region between start and end
//tags: panel
//input: column seqCol {semType: Macromolecule}
//output: widget result
export function getRegionPanel(seqCol: DG.Column<string>): DG.Widget {
  const funcName: string = 'getRegionTopMenu';
  const funcList = DG.Func.find({package: _package.name, name: funcName});
  if (funcList.length !== 1) throw new Error(`Package '${_package.name}' func '${funcName}' not found`);
  const func = funcList[0];
  const funcCall = func.prepare({table: seqCol.dataFrame, sequence: seqCol});
  const funcEditor = new GetRegionFuncEditor(funcCall);
  return funcEditor.widget();
}

//name: Bioinformatics | Manage Monomer Libraries
//description:
//tags: panel, exclude-actions-panel
//input: column seqColumn {semType: Macromolecule}
//output: widget result
export async function libraryPanel(_seqColumn: DG.Column): Promise<DG.Widget> {
  // return getLibraryPanelUI();
  return getMonomerLibraryManagerLink();
}

// -- Func Editors --

//name: GetRegionEditor
//tags: editor
//input: funccall call
export function GetRegionEditor(call: DG.FuncCall): void {
  try {
    const funcEditor = new GetRegionFuncEditor(call);
    funcEditor.dialog();
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : err.toString();
    const errStack = err instanceof Error ? err.stack : undefined;
    grok.shell.error(`Get region editor error: ${errMsg}`);
    _package.logger.error(errMsg, undefined, errStack);
  }
}

//name: SplitToMonomersEditor
//tags: editor
//input: funccall call
export function SplitToMonomersEditor(call: DG.FuncCall): void {
  const funcEditor = new SplitToMonomersFunctionEditor();
  ui.dialog({title: 'Split to Monomers'})
    .add(funcEditor.paramsUI)
    .onOK(async () => {
      return call.func.prepare(funcEditor.funcParams).call(true);
    })
    .show();
}

//name: SequenceSpaceEditor
//tags: editor
//input: funccall call
export function SequenceSpaceEditor(call: DG.FuncCall) {
  const funcEditor = new DimReductionBaseEditor({semtype: DG.SEMTYPE.MACROMOLECULE});
  ui.dialog({title: 'Sequence Space'})
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

//name: SeqActivityCliffsEditor
//tags: editor
//input: funccall call
export function SeqActivityCliffsEditor(call: DG.FuncCall) {
  const funcEditor = new ActivityCliffsEditor({semtype: DG.SEMTYPE.MACROMOLECULE});
  ui.dialog({title: 'Activity Cliffs'})
    .add(funcEditor.getEditor())
    .onOK(async () => {
      const params = funcEditor.getParams();
      return call.func.prepare({
        table: params.table,
        molecules: params.col,
        activities: params.activities,
        similarity: params.similarityThreshold,
        methodName: params.methodName,
        similarityMetric: params.similarityMetric,
        preprocessingFunction: params.preprocessingFunction,
        options: params.options,
      }).call();
    }).show();
}

// -- Package settings editor --

// //name: packageSettingsEditor
// //description: The database connection
// //tags: packageSettingsEditor
// //input: object propList
// //output: widget result
// export function packageSettingsEditor(propList: DG.Property[]): DG.Widget {
//   const widget = new PackageSettingsEditorWidget(propList);
//   widget.init().then(); // Ignore promise returned
//   return widget as DG.Widget;
// }

// -- Cell renderers --

//name: fastaSequenceCellRenderer
//tags: cellRenderer
//meta.cellType: sequence
//meta.columnTags: quality=Macromolecule, units=fasta
//output: grid_cell_renderer result
export function fastaSequenceCellRenderer(): MacromoleculeSequenceCellRenderer {
  return new MacromoleculeSequenceCellRenderer();
}

// -- Property panels --

//name:  Bioinformatics | Sequence Renderer
//input: column molColumn {semType: Macromolecule}
//tags: panel
//output: widget result
export function macroMolColumnPropertyPanel(molColumn: DG.Column): DG.Widget {
  return getMacromoleculeColumnPropertyPanel(molColumn);
}

//name: Composition analysis
//tags: panel, bio, widgets
//input: semantic_value sequence { semType: Macromolecule }
//output: widget result
export function compositionAnalysisWidget(sequence: DG.SemanticValue): DG.Widget {
  return getCompositionAnalysisWidget(sequence);
}

//name: separatorSequenceCellRenderer
//tags: cellRenderer
//meta.cellType: sequence
//meta.columnTags: quality=Macromolecule, units=separator
//output: grid_cell_renderer result
export function separatorSequenceCellRenderer(): MacromoleculeSequenceCellRenderer {
  return new MacromoleculeSequenceCellRenderer();
}

//name: MacromoleculeDifferenceCellRenderer
//tags: cellRenderer
//meta.cellType: MacromoleculeDifference
//meta.columnTags: quality=MacromoleculeDifference
//output: grid_cell_renderer result
export function macromoleculeDifferenceCellRenderer(): MacromoleculeDifferenceCellRenderer {
  return new MacromoleculeDifferenceCellRenderer();
}


//name: sequenceAlignment
//input: string alignType {choices: ['Local alignment', 'Global alignment']}
// eslint-disable-next-line max-len
//input: string alignTable {choices: ['AUTO', 'NUCLEOTIDES', 'BLOSUM45', 'BLOSUM50', 'BLOSUM62','BLOSUM80','BLOSUM90','PAM30','PAM70','PAM250','SCHNEIDER','TRANS']}
//input: double gap
//input: string seq1
//input: string seq2
//output: object res
export function sequenceAlignment(alignType: string, alignTable: string, gap: number, seq1: string, seq2: string) {
  const toAlign = new SequenceAlignment(seq1, seq2, gap, alignTable);
  const res = alignType == 'Local alignment' ? toAlign.smithWaterman() : toAlign.needlemanWunch();
  return res;
}

// -- Viewers --

//name: WebLogo
//description: WebLogo
//tags: viewer, panel
//output: viewer result
//meta.icon: files/icons/weblogo-viewer.svg
export function webLogoViewer() {
  return new WebLogoViewer();
}

//name: VdRegions
//description: V-Domain regions viewer
//tags: viewer, panel
//meta.icon: files/icons/vdregions-viewer.svg
//output: viewer result
export function vdRegionsViewer() {
  return new VdRegionsViewer();
}


// -- Top menu --

//name: getRegion
//description: Gets a new column with sequences of the region between start and end
//input: column sequence
//input: string start  {optional: true}
//input: string end    {optional: true}
//input: string name   {optional: true} [Name of the column to be created]
//output: column result
export function getRegion(
  sequence: DG.Column<string>, start: string | undefined, end: string | undefined, name: string | undefined
): DG.Column<string> {
  return getRegionDo(sequence,
    start ?? null, end ?? null, name ?? null);
}

//top-menu: Bio | Convert | Get Region...
//name: Get Region Top Menu
//description: Get sequences for a region specified from a Macromolecule
//input: dataframe table                           [Input data table]
//input: column sequence  {semType: Macromolecule} [Sequence column]
//input: string start     {optional: true}         [Region start position name]
//input: string end       {optional: true}         [Region end position name]
//input: string name      {optional: true}         [Region column name]
//editor: Bio:GetRegionEditor
export async function getRegionTopMenu(
  table: DG.DataFrame, sequence: DG.Column,
  start: string | undefined, end: string | undefined, name: string | undefined
): Promise<void> {
  const regCol = getRegionDo(sequence, start ?? null, end ?? null, name ?? null);
  sequence.dataFrame.columns.add(regCol);
  await grok.data.detectSemanticTypes(sequence.dataFrame); // to set renderer
}

//top-menu: Bio | Analyze | Activity Cliffs...
//name: Sequence Activity Cliffs
//description: Detects pairs of molecules with similar structure and significant difference in any given property
//input: dataframe table [Input data table]
//input: column molecules {semType: Macromolecule}
//input: column activities
//input: double similarity = 80 [Similarity cutoff]
//input: string methodName { choices:["UMAP", "t-SNE"] }
//input: string similarityMetric { choices:["Hamming", "Levenshtein", "Monomer chemical distance"] }
//input: func preprocessingFunction
//input: object options {optional: true}
//output: viewer result
//editor: Bio:SeqActivityCliffsEditor
export async function activityCliffs(table: DG.DataFrame, molecules: DG.Column<string>, activities: DG.Column,
  similarity: number, methodName: DimReductionMethods,
  similarityMetric: MmDistanceFunctionsNames | BitArrayMetrics, preprocessingFunction: DG.Func,
  options?: (IUMAPOptions | ITSNEOptions) & Options): Promise<DG.Viewer | undefined> {
  if (!checkInputColumnUI(molecules, 'Activity Cliffs'))
    return;
  const axesNames = getEmbeddingColsNames(table);
  const tags = {
    'units': molecules.getTag(DG.TAGS.UNITS),
    'aligned': molecules.getTag(bioTAGS.aligned),
    'separator': molecules.getTag(bioTAGS.separator),
    'alphabet': molecules.getTag(bioTAGS.alphabet),
  };
  const columnDistanceMetric: MmDistanceFunctionsNames | BitArrayMetrics = similarityMetric;
  const seqCol = molecules;

  const runCliffs = async () => {
    const sp = await getActivityCliffs(
      table,
      seqCol,
      axesNames,
      'Activity cliffs', //scatterTitle
      activities,
      similarity,
      columnDistanceMetric, //similarityMetric
      methodName,
      {...(options ?? {})},
      DG.SEMTYPE.MACROMOLECULE,
      tags,
      preprocessingFunction,
      createTooltipElement,
      createPropPanelElement,
      createLinesGrid,
    );
    return sp;
  };

  const allowedRowCount = methodName === DimReductionMethods.UMAP ? 200_000 : 20_000;
  const fastRowCount = methodName === DimReductionMethods.UMAP ? 5_000 : 2_000;
  if (table.rowCount > allowedRowCount) {
    grok.shell.warning(`Too many rows, maximum for sequence activity cliffs is ${allowedRowCount}`);
    return;
  }

  const pi = DG.TaskBarProgressIndicator.create(`Running sequence activity cliffs ...`);
  return new Promise<DG.Viewer | undefined>((resolve, reject) => {
    if (table.rowCount > fastRowCount && !options?.[BYPASS_LARGE_DATA_WARNING]) {
      ui.dialog().add(ui.divText(`Activity cliffs analysis might take several minutes.
    Do you want to continue?`))
        .onOK(async () => {
          runCliffs().then((res) => resolve(res)).catch((err) => reject(err));
        })
        .onCancel(() => { resolve(undefined); })
        .show();
    } else
      runCliffs().then((res) => resolve(res)).catch((err) => reject(err));
  }).catch((err: any) => {
    const [errMsg, errStack] = errInfo(err);
    _package.logger.error(errMsg, undefined, errStack);
    throw err;
  }).finally(() => { pi.close(); });
}

//name: Encode Sequences
//tags: dim-red-preprocessing-function
//meta.supportedSemTypes: Macromolecule
//meta.supportedTypes: string
//meta.supportedUnits: fasta,separator,helm
//meta.supportedDistanceFunctions: Hamming,Levenshtein,Monomer chemical distance,Needlemann-Wunsch
//input: column col {semType: Macromolecule}
//input: string metric
//input: double gapOpen = 1 {caption: Gap open penalty; default: 1; optional: true}
//input: double gapExtend = 0.6 {caption: Gap extension penalty; default: 0.6; optional: true}
// eslint-disable-next-line max-len
//input: string fingerprintType = 'Morgan' {caption: Fingerprint type; choices: ['Morgan', 'RDKit', 'Pattern', 'AtomPair', 'MACCS', 'TopologicalTorsion']; optional: true}
//output: object result
export async function macromoleculePreprocessingFunction(
  col: DG.Column, metric: MmDistanceFunctionsNames, gapOpen: number = 1, gapExtend: number = 0.6,
  fingerprintType = 'Morgan'): Promise<PreprocessFunctionReturnType> {
  if (col.semType !== DG.SEMTYPE.MACROMOLECULE)
    return {entries: col.toList(), options: {}};
  const {seqList, options} = await getEncodedSeqSpaceCol(col, metric, fingerprintType);
  return {entries: seqList, options: {...options, gapOpen, gapExtend}};
}

//name: Helm Fingerprints
//tags: dim-red-preprocessing-function
//meta.supportedSemTypes: Macromolecule
//meta.supportedTypes: string
//meta.supportedUnits: helm
//meta.supportedDistanceFunctions: Tanimoto,Asymmetric,Cosine,Sokal
//input: column col {semType: Macromolecule}
//input: string _metric
//output: object result
export async function helmPreprocessingFunction(
  col: DG.Column<string>, _metric: BitArrayMetrics): Promise<PreprocessFunctionReturnType> {
  if (col.version !== col.temp[MONOMERIC_COL_TAGS.LAST_INVALIDATED_VERSION])
    await invalidateMols(col, false);
  const molCol = col.temp[MONOMERIC_COL_TAGS.MONOMERIC_MOLS];
  const fingerPrints: DG.Column<DG.BitSet | null> =
    await grok.functions.call('Chem:getMorganFingerprints', {molColumn: molCol});

  const entries: Array<BitArray | null> = new Array(fingerPrints.length).fill(null);
  for (let i = 0; i < fingerPrints.length; i++) {
    if (fingerPrints.isNone(i) || !fingerPrints.get(i))
      continue;
    const fp = fingerPrints.get(i)!;
    entries[i] = BitArray.fromUint32Array(fp.length, new Uint32Array(fp.getBuffer().buffer));
  }
  return {entries, options: {}};
}

//top-menu: Bio | Analyze | Sequence Space...
//name: Sequence Space
//description: Creates 2D sequence space with projected sequences by pairwise distance
//input: dataframe table
//input: column molecules { semType: Macromolecule }
//input: string methodName { choices:["UMAP", "t-SNE"] }
//input: string similarityMetric { choices:["Hamming", "Levenshtein", "Monomer chemical distance"] }
//input: bool plotEmbeddings = true
//input: func preprocessingFunction {optional: true}
//input: object options {optional: true}
//input: bool clusterEmbeddings = true { optional: true }
//output: viewer result
//editor: Bio:SequenceSpaceEditor
export async function sequenceSpaceTopMenu(table: DG.DataFrame, molecules: DG.Column,
  methodName: DimReductionMethods, similarityMetric: BitArrayMetrics | MmDistanceFunctionsNames,
  plotEmbeddings: boolean, preprocessingFunction?: DG.Func, options?: (IUMAPOptions | ITSNEOptions) & Options,
  clusterEmbeddings?: boolean
): Promise<DG.ScatterPlotViewer | undefined> {
  if (!checkInputColumnUI(molecules, 'Sequence Space'))
    return;
  if (!preprocessingFunction)
    preprocessingFunction = DG.Func.find({name: 'macromoleculePreprocessingFunction', package: 'Bio'})[0];
  options ??= {};
  const res = await multiColReduceDimensionality(table, [molecules], methodName,
    [similarityMetric as KnownMetrics], [1], [preprocessingFunction], 'MANHATTAN',
    plotEmbeddings, clusterEmbeddings ?? false,
    {...options, preprocessingFuncArgs: [options.preprocessingFuncArgs ?? {}]}, {
      fastRowCount: 10000,
      scatterPlotName: 'Sequence space',
      bypassLargeDataWarning: options?.[BYPASS_LARGE_DATA_WARNING],
    });
  return res;
}

//top-menu: Bio | Convert | To Atomic Level...
//name: To Atomic Level
//description: Converts sequences to molblocks
//input: dataframe table [Input data table]
//input: column macroMolecule {caption: Sequence; semType: Macromolecule}
//input: bool nonlinear =false {description: Slower mode for cycling/branching HELM structures}
export async function toAtomicLevel(table: DG.DataFrame, seqCol: DG.Column, nonlinear: boolean): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('Converting to atomic level ...');
  try {
    const monomerLib = (await getMonomerLibHelper()).getBioLib();
    await sequenceToMolfile(table, seqCol, nonlinear, monomerLib);
  } finally {
    pi.close();
  }
}

//top-menu: Bio | Analyze | MSA...
//name: MSA
//description: Performs multiple sequence alignment
//tags: bio, panel
export function multipleSequenceAlignmentDialog(): void {
  multipleSequenceAlignmentUI()
    .catch((err: any) => {
      const [errMsg, errStack] = errInfo(err);
      if (err instanceof MsaWarning) {
        grok.shell.warning((err as MsaWarning).element);
        _package.logger.warning(errMsg);
        return;
      }
      grok.shell.error(errMsg);
      _package.logger.error(errMsg, undefined, errStack);
      // throw err; // This error throw is not handled
    });
}

//name: Multiple Sequence Alignment
//description: Multiple sequence alignment
//tags: bio
//input: column sequenceCol {semType: Macromolecule}
//input: column clustersCol
//output: column result
export async function alignSequences(sequenceCol: DG.Column<string> | null = null,
  clustersCol: DG.Column | null = null): Promise<DG.Column<string>> {
  return multipleSequenceAlignmentUI({col: sequenceCol, clustersCol});
}

//top-menu: Bio | Analyze | Composition
//name: Composition Analysis
//description: Visualizes sequence composition on a WebLogo plot
//meta.icon: files/icons/composition-analysis.svg
//output: viewer result
export async function compositionAnalysis(): Promise<void> {
  // Higher priority for columns with MSA data to show with WebLogo.
  const tv = grok.shell.tv;
  const df = tv.dataFrame;
  //@ts-ignore
  const colList: DG.Column[] = df.columns.toList().filter((col) => {
    if (col.semType != DG.SEMTYPE.MACROMOLECULE)
      return false;

    const _colSh = SeqHandler.forColumn(col);
    // TODO: prevent for cyclic, branched or multiple chains in Helm
    return true;
  });

  const handler = async (col: DG.Column) => {
    if (!checkInputColumnUI(col, 'Composition'))
      return;

    const wlViewer = tv.addViewer('WebLogo', {sequenceColumnName: col.name});
    grok.shell.tv.dockManager.dock(wlViewer, DG.DOCK_TYPE.DOWN, null, 'Composition analysis', 0.25);
  };

  let col: DG.Column | null = null;
  if (colList.length == 0) {
    grok.shell.error('Current table does not contain sequences');
    return;
  } else if (colList.length > 1) {
    const colListNames: string [] = colList.map((col) => col.name);
    const selectedCol = colList.find((c) => { return SeqHandler.forColumn(c).isMsa(); });
    const colInput: DG.InputBase = ui.choiceInput(
      'Column', selectedCol ? selectedCol.name : colListNames[0], colListNames);
    ui.dialog({
      title: 'Composition Analysis',
      helpUrl: 'https://datagrok.ai/help/datagrok/solutions/domains/bio/#sequence-composition',
    })
      .add(ui.div([
        colInput,
      ]))
      .onOK(async () => {
        const col: DG.Column | null = colList.find((col) => col.name == colInput.value) ?? null;

        if (col)
          await handler(col);
      })
      .show();
  } else
    col = colList[0];

  if (!col)
    return;

  await handler(col);
}

//name: importFasta
//description: Opens FASTA file
//tags: file-handler
//meta.ext: fasta, fna, ffn, faa, frn, fa, fst
//input: string fileContent
//output: list tables
export function importFasta(fileContent: string): DG.DataFrame [] {
  const ffh = new FastaFileHandler(fileContent);
  return ffh.importFasta();
}

//name: importBam
//description: Opens Bam file
//tags: file-handler
//meta.ext: bam, bai
//input: string fileContent
//output: list tables
export function importBam(fileContent: string): DG.DataFrame [] {
  console.log(fileContent);
  return [];
}

//top-menu: Bio | Convert | Notation...
//name: convertDialog
export function convertDialog() {
  const col = getMacromoleculeColumns()[0];
  convert(col);
}

//name: monomerCellRenderer
//tags: cellRenderer
//meta.cellType: Monomer
//meta.columnTags: quality=Monomer
//output: grid_cell_renderer result
export function monomerCellRenderer(): MonomerCellRenderer {
  return new MonomerCellRenderer();
}

//name: testDetectMacromolecule
//input: string path {choices: ['Demo:Files/', 'System:AppData/']}
//output: dataframe result
export async function testDetectMacromolecule(path: string): Promise<DG.DataFrame> {
  const pi = DG.TaskBarProgressIndicator.create('Test detectMacromolecule...');

  const fileList = await grok.dapi.files.list(path, true, '');
  //@ts-ignore
  const fileListToTest = fileList.filter((fi) => fi.fileName.endsWith('.csv'));

  let readyCount = 0;
  const res = [];

  for (const fileInfo of fileListToTest) {
    try {
      const csv = await grok.dapi.files.readAsText(path + fileInfo.fullPath);
      const df = DG.DataFrame.fromCsv(csv);

      for (const col of df.columns) {
        const semType = await grok.functions.call('Bio:detectMacromolecule', {col: col});
        if (semType === DG.SEMTYPE.MACROMOLECULE) {
          //console.warn(`file: ${fileInfo.path}, column: ${col.name}, ` +
          //  `semType: ${semType}, units: ${col.getTag(DG.TAGS.UNITS)}`);
          // console.warn('file: "' + fileInfo.path + '", semType: "' + semType + '", ' +
          //   'units: "' + col.getTag(DG.TAGS.UNITS) + '"');

          res.push({
            file: fileInfo.path, result: 'detected', column: col.name,
            message: `units: ${col.getTag(DG.TAGS.UNITS)}`,
          });
        }
      }
    } catch (err: unknown) {
      // console.error('file: ' + fileInfo.path + ', error: ' + ex.toString());
      res.push({
        file: fileInfo.path, result: 'error', column: null,
        message: err instanceof Error ? err.message : (err as Object).toString(),
      });
    } finally {
      readyCount += 1;
      pi.update(100 * readyCount / fileListToTest.length, `Test ${fileInfo.fileName}`);
    }
  }

  grok.shell.info('Test Demo:Files for detectMacromolecule finished.');
  pi.close();
  const resDf = DG.DataFrame.fromObjects(res)!;
  resDf.name = `datasets_detectMacromolecule_${path}`;
  return resDf;
}

//top-menu: Bio | Convert | Split to Monomers...
//name: Split to Monomers
//input: dataframe table
//input: column sequence { semType: Macromolecule }
//output: dataframe result
//editor: Bio:SplitToMonomersEditor
export async function splitToMonomersTopMenu(table: DG.DataFrame, sequence: DG.Column): Promise<void> {
  await splitToMonomersUI(table, sequence);
}

//name: Bio: getHelmMonomers
//input: column sequence {semType: Macromolecule}
export function getHelmMonomers(sequence: DG.Column<string>): string[] {
  const sh = SeqHandler.forColumn(sequence);
  const stats = sh.stats;
  return Object.keys(stats.freq);
}


//name: Sequence Similarity Search
//tags: viewer
//meta.icon: files/icons/sequence-similarity-viewer.svg
//output: viewer result
export function similaritySearchViewer(): SequenceSimilarityViewer {
  return new SequenceSimilarityViewer();
}

//top-menu: Bio | Search | Similarity Search
//name: similaritySearch
//description: Finds similar sequences
//output: viewer result
export function similaritySearchTopMenu(): void {
  const view = (grok.shell.v as DG.TableView);
  const viewer = view.addViewer('Sequence Similarity Search');
  view.dockManager.dock(viewer, 'down');
}

//name: Sequence Diversity Search
//tags: viewer
//meta.icon: files/icons/sequence-diversity-viewer.svg
//output: viewer result
export function diversitySearchViewer(): SequenceDiversityViewer {
  return new SequenceDiversityViewer();
}

//top-menu: Bio | Search | Diversity Search
//name: diversitySearch
//description: Finds the most diverse sequences
//output: viewer result
export function diversitySearchTopMenu() {
  const view = (grok.shell.v as DG.TableView);
  const viewer = view.addViewer('Sequence Diversity Search');
  view.dockManager.dock(viewer, 'down');
}

//name: SearchSubsequenceEditor
//tags: editor
//input: funccall call
export function searchSubsequenceEditor(call: DG.FuncCall) {
  const columns = getMacromoleculeColumns();
  if (columns.length === 1)
    call.func.prepare({macromolecules: columns[0]}).call(true);
  else
    new SubstructureSearchDialog(columns);
}

//top-menu: Bio | Search | Subsequence Search ...
//name: Subsequence Search
//input: column macromolecules
//editor: Bio:SearchSubsequenceEditor
export function SubsequenceSearchTopMenu(macromolecules: DG.Column): void {
  grok.shell.tv.getFiltersGroup({createDefaultFilters: false}).updateOrAdd({
    type: 'Bio:bioSubstructureFilter',
    column: macromolecules.name,
    columnName: macromolecules.name,
  });
  grok.shell.tv.grid.scrollToCell(macromolecules, 0);
}

//top-menu: Bio | Calculate | Identity...
//name: Identity Scoring
//description: Adds a column with fraction of matching monomers
//input: dataframe table [Table containing Macromolecule column]
//input: column macromolecules {semType: Macromolecule} [Sequences to score]
//input: string reference [Sequence, matching column format]
//output: column scores
export async function sequenceIdentityScoring(
  table: DG.DataFrame, macromolecule: DG.Column, reference: string
): Promise<DG.Column<number>> {
  const scores = calculateScores(table, macromolecule, reference, SCORE.IDENTITY);
  return scores;
}

//top-menu: Bio | Calculate | Similarity...
//name: Similarity Scoring
//description: Adds a column with similarity scores, calculated as sum of monomer fingerprint similarities
//input: dataframe table [Table containing Macromolecule column]
//input: column macromolecules {semType: Macromolecule} [Sequences to score]
//input: string reference [Sequence, matching column format]
//output: column scores
export async function sequenceSimilarityScoring(
  table: DG.DataFrame, macromolecule: DG.Column, reference: string
): Promise<DG.Column<number>> {
  const scores = calculateScores(table, macromolecule, reference, SCORE.SIMILARITY);
  return scores;
}


//top-menu: Bio | Manage | Monomer Libraries
//name: Manage Monomer Libraries
//description: Manage HELM monomer libraries
export async function manageMonomerLibraries(): Promise<void> {
  showManageLibrariesDialog();
}

//name: saveAsFasta
//description: As FASTA...
//tags: fileExporter
export function saveAsFasta() {
  saveAsFastaUI();
}

//name: Bio Substructure Filter
//description: Substructure filter for macromolecules
//tags: filter
//output: filter result
//meta.semType: Macromolecule
export function bioSubstructureFilter(): BioSubstructureFilter {
  return new BioSubstructureFilter();
}

// -- Test apps --

//name: webLogoLargeApp
export async function webLogoLargeApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('WebLogo');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const app = new WebLogoApp(urlParams, 'webLogoLargeApp');
    const df: DG.DataFrame = await _package.files.readCsv('data/sample_PT_100000x5.csv');
    await grok.data.detectSemanticTypes(df);
    await app.init(df);
  } finally {
    pi.close();
  }
}

//name: webLogoAggApp
export async function webLogoAggApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('WebLogo ...');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const app = new WebLogoApp(urlParams, 'webLogoAggApp');
    const df: DG.DataFrame = await _package.files.readCsv('samples/FASTA_PT_activity.csv');
    await grok.data.detectSemanticTypes(df);
    await app.init(df);
  } finally {
    pi.close();
  }
}

//name: getRegionApp
export async function getRegionApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('getRegion ...');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const app = new GetRegionApp(urlParams, 'getRegionApp');
    await app.init();
  } finally {
    pi.close();
  }
}

//name: getRegionHelmApp
export async function getRegionHelmApp(): Promise<void> {
  const pi = DG.TaskBarProgressIndicator.create('getRegion ...');
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const df = await _package.files.readCsv('samples/HELM_empty_vals.csv');
    const app = new GetRegionApp(urlParams, 'getRegionHelmApp');
    await app.init({df: df, colName: 'HELM'});
  } finally {
    pi.close();
  }
}

// -- Tests long seq --

//name: longSeqTableSeparator
export function longSeqTableSeparator(): void {
  const df = DG.DataFrame.fromColumns(generateLongSequence());
  grok.shell.addTableView(df);
}

//name: longSeqTableFasta
export function longSeqTableFasta(): void {
  const df = DG.DataFrame.fromColumns([generateLongSequence2(NOTATION.FASTA)]);
  grok.shell.addTableView(df);
}

//name: longSeqTableHelm
export function longSeqTableHelm(): void {
  const df = DG.DataFrame.fromColumns([generateLongSequence2(NOTATION.HELM)]);
  grok.shell.addTableView(df);
}

// -- Handle context menu --

///name: addCopyMenu
//input: object cell
//input: object menu
export function addCopyMenu(cell: DG.Cell, menu: DG.Menu): void {
  addCopyMenuUI(cell, menu);
}

// -- Demo --

// demoBio01
//name: demoBioSimilarityDiversity
//meta.demoPath: Bioinformatics | Similarity, Diversity
//description: Sequence similarity tracking and evaluation dataset diversity
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Similarity,%20Diversity
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoBioSimilarityDiversity(): Promise<void> {
  await demoBio01UI();
}

// demoBio01a
//name:demoBioSequenceSpace
//meta.demoPath: Bioinformatics | Sequence Space
//description: Exploring sequence space of Macromolecules, comparison with hierarchical clustering results
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Sequence%20Space
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoBioSequenceSpace(): Promise<void> {
  await demoBio01aUI();
}

// demoBio01b
//name: demoBioActivityCliffs
//meta.demoPath: Bioinformatics | Activity Cliffs
//description: Activity Cliffs analysis on Macromolecules data
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Activity%20Cliffs
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoBioActivityCliffs(): Promise<void> {
  await demoBio01bUI();
}

// demoBio03
//name: demoBioAtomicLevel
//meta.demoPath: Bioinformatics | Atomic Level
//description: Atomic level structure of Macromolecules
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Atomic%20Level
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoBioAtomicLevel(): Promise<void> {
  await demoBio03UI();
}

// demoBio05
//name: demoBioHelmMsaSequenceSpace
//meta.demoPath: Bioinformatics | Helm, MSA, Sequence Space
//description: MSA and composition analysis on Helm data
//meta.path: /apps/Tutorials/Demo/Bioinformatics/Helm,%20MSA,%20Sequence%20Space
//meta.isDemoScript: True
//meta.demoSkip: GROK-14320
export async function demoBioHelmMsaSequenceSpace(): Promise<void> {
  await demoBio05UI();
}

//name: SDF to JSON Library
//input: dataframe table
export async function sdfToJsonLib(table: DG.DataFrame) {
  const _jsonMonomerLibrary = createJsonMonomerLibFromSdf(table);
  const jsonMonomerLibrary = JSON.stringify(_jsonMonomerLibrary);
  DG.Utils.download(`${table.name}.json`, jsonMonomerLibrary);
}

// -- Utils --

//name: detectMacromoleculeProbe
//input: file file
//input: string colName = ''
//input: int probeCount = 100
export async function detectMacromoleculeProbe(file: DG.FileInfo, colName: string, probeCount: number): Promise<void> {
  const csv: string = await file.readAsString();
  await detectMacromoleculeProbeDo(csv, colName, probeCount);
}

//name: getMolFromHelm
//input: dataframe df
//input: column helmCol
//input: bool chiralityEngine
//output: column result
export async function getMolFromHelm(
  df: DG.DataFrame, helmCol: DG.Column<string>, chiralityEngine?: boolean
): Promise<DG.Column<string>> {
  return getMolColumnFromHelm(df, helmCol, chiralityEngine);
}

// -- Custom notation providers --

//name: applyNotationProviderForCyclized
//input: column col
//input: string separator
export function applyNotationProviderForCyclized(col: DG.Column<string>, separator: string) {
  col.temp[SeqTemps.notationProvider] = new CyclizedNotationProvider(separator);
}
