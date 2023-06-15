import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {ITreeStyler, MarkupNodeType, TreeStylerBase} from './markup';
import {intToHtmlA, setAlpha} from '@datagrok-libraries/utils/src/color';
import {GridTreeRendererBase} from './grid-tree-renderer-base';
import {LINE_WIDTH, NODE_SIZE} from '../dendrogram';
import {GridTreePlacer} from './grid-tree-placer';
import {NodeType} from '@datagrok-libraries/bio/src/trees';
import {TreeColorNames, TreeDefaultPalette} from '@datagrok-libraries/bio/src/trees';

const TRANS_ALPHA = 0.7;

/** Draws only nodes/leaves visible in leaf range */
export class LeafRangeGridTreeRenderer extends GridTreeRendererBase<MarkupNodeType> {
  /** treeRoot can be null in case of the grid.dataFrame.rowCount is zero
   * @param {DG.Grid}grid - grid to render tree for
   * @param {MarkupNodeType}tree - tree root node
   * @param {GridTreePlacer<MarkupNodeType>}placer - tree placer
   * @param {ITreeStyler<MarkupNodeType>}mainStyler - main tree styler
   * @param {ITreeStyler<MarkupNodeType>}lightStyler - light tree styler
   * @param {ITreeStyler<MarkupNodeType>}currentStyler - current tree styler
   * @param {ITreeStyler<MarkupNodeType>}mouseOverStyler - mouse over tree styler
   * @param {ITreeStyler<MarkupNodeType>}selectionStyler - selection tree styler*/
  constructor(
    grid: DG.Grid, tree: MarkupNodeType | null, placer: GridTreePlacer<MarkupNodeType>,
    mainStyler: ITreeStyler<MarkupNodeType>, lightStyler: ITreeStyler<MarkupNodeType>,
    currentStyler: ITreeStyler<MarkupNodeType>, mouseOverStyler: ITreeStyler<MarkupNodeType>,
    selectionStyler: ITreeStyler<MarkupNodeType>,
  ) {
    super(grid, tree, placer, mainStyler, lightStyler, currentStyler, mouseOverStyler, selectionStyler);
  }

  // -- View --

  public override attach(view: HTMLElement) {
    super.attach(view);

    this.view!.style.setProperty('overflow-y', 'hidden', 'important');
    this.canvas!.style.position = 'absolute';
  }

  // --

  /** treeRoot can be null in case of the grid.dataFrame.rowCount is zero
   * @param {DG.Grid}grid - grid to render tree for
   * @param {MarkupNodeType}treeRoot - tree root node
   * @param {GridTreePlacer<MarkupNodeType>}placer - tree placer
   * @return {LeafRangeGridTreeRenderer}
  */
  public static create(
    grid: DG.Grid, treeRoot: NodeType | null, placer: GridTreePlacer<MarkupNodeType>,
  ): GridTreeRendererBase<MarkupNodeType> {
    const mainStyler = new TreeStylerBase<MarkupNodeType>('main',
      LINE_WIDTH, NODE_SIZE, true,
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Main], TRANS_ALPHA)),
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Main], TRANS_ALPHA)));
    // mainStyler.onTooltipShow.subscribe(({node, e}) => {
    //   //Do not show tooltips on nodes of injected tree
    //   if (node) {
    //     const tooltip = ui.divV([
    //       ui.div(`${node.name}`)]);
    //     ui.tooltip.show(tooltip, e.clientX + 16, e.clientY + 16);
    //   } else {
    //     ui.tooltip.hide();
    //   }
    // });

    const lightStyler = new TreeStylerBase<MarkupNodeType>('light',
      LINE_WIDTH, NODE_SIZE, false,
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Light], TRANS_ALPHA)),
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Light], TRANS_ALPHA)));

    const currentStyler = new TreeStylerBase<MarkupNodeType>('current',
      LINE_WIDTH, NODE_SIZE, false,
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Current], TRANS_ALPHA)),
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Current], TRANS_ALPHA)));

    const mouseOverStyler = new TreeStylerBase<MarkupNodeType>('mouseOver',
      LINE_WIDTH, NODE_SIZE, false,
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.MouseOver], TRANS_ALPHA)),
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.MouseOver], TRANS_ALPHA)));

    const selectionStyler = new TreeStylerBase<MarkupNodeType>('selection',
      LINE_WIDTH, NODE_SIZE, false,
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Selection], TRANS_ALPHA)),
      intToHtmlA(setAlpha(TreeDefaultPalette[TreeColorNames.Selection], TRANS_ALPHA)));

    // TODO: Attach Dendrogram properties to grid (type or object?)

    return new LeafRangeGridTreeRenderer(grid, treeRoot as MarkupNodeType, placer,
      mainStyler, lightStyler, currentStyler, mouseOverStyler, selectionStyler);
  }
}
