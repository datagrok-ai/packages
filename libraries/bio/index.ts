//@ts-ignore
import {PhylocanvasTreeNode, Newick, Utils, Shapes, TreeTypes} from '@phylocanvas/phylocanvas.gl';
//@ts-ignore
import {PhylocanvasGL} from '@phylocanvas/phylocanvas.gl';

import {Aminoacids, AminoacidsPalettes} from './src/aminoacids';
import {MonomerWorks} from './src/monomer-works/monomer-works';
import {Nucleotides, NucleotidesPalettes} from './src/nucleotides';
import {SeqPalette, SeqPaletteBase} from './src/seq-palettes';
import {IMonomerLib, Monomer, NodeType, isLeaf, NodeCuttedType} from './src/types';
import {UnknownSeqPalette, UnknownSeqPalettes} from './src/unknown';
import {DrawStyle, printLeftOrCentered} from './src/utils/cell-renderer';
import {FastaFileHandler} from './src/utils/fasta-handler';
import {
  getSplitter,
  splitterAsFasta,
  getSplitterForColumn,
  SplitterFunc,
  monomerToShort,
  splitterAsHelm,
  getStats,
  pickUpPalette,
  getPaletteByType,
  getAlphabet,
  getAlphabetSimilarity,
  ALPHABET,
  NOTATION,
  TAGS,
  ALIGNMENT,
} from './src/utils/macromolecule';
import {NotationConverter} from './src/utils/notation-converter';
import {splitAlignedSequences} from './src/utils/splitter';
import {getTreeHelper, ITreeHelper} from './src/utils/tree-helper';
import {UnitsHandler} from './src/utils/units-handler';
import {VdRegion, VdRegionType} from './src/vd-regions';
import {
  CanvasCallback,
  getPhylocanvasGlService,
  IPhylocanvasGlViewer,
  NodeStyleType,
  PhylocanvasGlServiceBase,
  PhylocanvasGlTask,
  StylesType,
  TreeTypesNames
} from './src/viewers/phylocanvas-gl-viewer';
import {IVdRegionsViewer} from './src/viewers/vd-regions-viewer';
import {PositionHeight, PositionInfo, PositionMonomerInfo, WebLogoViewer} from './src/viewers/web-logo-viewer';
import {MonomerLib} from './src/monomer-works/monomer-lib';
import {readLibrary} from './src/monomer-works/monomer-utils';
import {
  getNglGlService,
  NglGlServiceBase,
  NglGlTask
} from './src/viewers/ngl-gl-viewer';

export {
  ALIGNMENT,
  ALPHABET,
  NOTATION,
  TAGS,
  NotationConverter,
  SplitterFunc,
  getStats,
  getAlphabet,
  getAlphabetSimilarity,
  getSplitter,
  splitterAsFasta,
  splitterAsHelm,
  getSplitterForColumn,
  monomerToShort,
  splitAlignedSequences,
  SeqPalette,
  SeqPaletteBase,
  Aminoacids,
  AminoacidsPalettes,
  Nucleotides,
  NucleotidesPalettes,
  UnknownSeqPalettes,
  UnknownSeqPalette,
  pickUpPalette,
  getPaletteByType,
  PositionHeight,
  PositionInfo,
  PositionMonomerInfo,
  WebLogoViewer,
  UnitsHandler,
  DrawStyle,
  printLeftOrCentered,
  FastaFileHandler,
  VdRegionType,
  VdRegion,
  IVdRegionsViewer,

  NodeType, isLeaf, NodeCuttedType,
  PhylocanvasTreeNode,
  NodeStyleType, StylesType,

  IPhylocanvasGlViewer,
  TreeTypesNames,
  PhylocanvasGlServiceBase,
  CanvasCallback,
  PhylocanvasGlTask,
  getPhylocanvasGlService,

  PhylocanvasGL,
  Shapes, TreeTypes,
  Utils,
  Newick,
  ITreeHelper,
  getTreeHelper,

  getNglGlService,
  NglGlServiceBase,
  NglGlTask,

  //Monomer lib and features
  Monomer,
  IMonomerLib,
  MonomerWorks,
  MonomerLib,
  readLibrary
};
