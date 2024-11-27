import * as ui from 'datagrok-api/ui';
import { EventBus } from '../../model/event-bus';
import {PatternConfiguration} from '../../model/types';
import { isOverhangNucleotide } from '../../model/utils';
import {LEGEND_PADDING, SVG_CIRCLE_SIZES, SVG_ELEMENT_COLORS, SVG_TEXT_FONT_SIZES} from './const';
import { SENSE_STRAND_HORIZONTAL_SHIFT } from './strands-block';
import {SVGBlockBase} from './svg-block-base';
import {SVGElementFactory} from './svg-element-factory';
import {TextDimensionsCalculator} from './text-dimensions-calculator';
import {getNucleobaseColorFromStyleMap} from './utils';
import { create } from 'lodash';

export class LegendBlock extends SVGBlockBase {
  private _svgElements: SVGElement[] = [];
  private _divElements: HTMLElement[] = [];
  private width: number;

  constructor(
    svgElementFactory: SVGElementFactory,
    config: PatternConfiguration,
    heightShift: number,
    private eventBus: EventBus,
  ) {
    super(svgElementFactory, config, heightShift);
    const uniqueNucleotideBases = this.eventBus.getUniqueNucleotides();
    const nucleotidesWithoutOverhangs = uniqueNucleotideBases.filter((n) => !isOverhangNucleotide(n));
    const {elements, numericLabels, width} = this.createLegendItems(nucleotidesWithoutOverhangs);
    this._svgElements = elements;
    this._divElements = numericLabels;
    this.width = width;
  }

  private isPhosphorothioatePresent(): boolean {
    return Object.values(this.config.phosphorothioateLinkageFlags)
      .flat().some((element) => element);
  }

  private getModificationTypesList(): string[] {
    return [...new Set(
      Object.values(this.config.nucleotideSequences).flat().sort(
        (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
      )
    )];
  }

  get svgElements(): SVGElement[] {
    return this._svgElements;
  }

  get divElements(): HTMLElement[] {
    return this._divElements;
  }

  private createLegendItem(
    name: string,
    xShift: number,
    nucleotidesWithoutOverhangs?: string[]
  ): {elements: SVGElement[], numericLabel: HTMLElement, width: number} {
    //create numeric label toggle checkbox
    const createNumericLabel = !name.includes('linkage') && nucleotidesWithoutOverhangs?.includes(name);
    const numericLabelCheckboxShift = createNumericLabel ? 25 : 0;
    const numLabelCheckboxPosition = {
      x: xShift,
      y: this.yShift - SVG_CIRCLE_SIZES.LEGEND_RADIUS * 4 + 1
    };
    const numericLableVisible = this.eventBus.getModificationsWithNumericLabels().includes(name);
    const numericLabel = createNumericLabel ? ui.boolInput('', numericLableVisible, () => {
      this.eventBus.toggleNumericLabels(numericLableVisible, name);
    }).root : ui.div();
    numericLabel.style.position = 'absolute';
    numericLabel.style.top = numLabelCheckboxPosition.y.toString() + 'px';
    numericLabel.style.left = numLabelCheckboxPosition.x.toString() + 'px';

    //create circle
    const circlePosition = {
      x: xShift + numericLabelCheckboxShift,
      y: this.yShift - SVG_CIRCLE_SIZES.LEGEND_RADIUS
    };

    const circle = name.includes('linkage') ?
      this.svgElementFactory.createStarElement(circlePosition, SVG_ELEMENT_COLORS.LINKAGE_STAR, '1.0', 'default') :
      this.svgElementFactory
        .createCircleElement(circlePosition, SVG_CIRCLE_SIZES.LEGEND_RADIUS, getNucleobaseColorFromStyleMap(name), 'default');


    //create modification label
    const paddedCircleWidth = 2 * SVG_CIRCLE_SIZES.LEGEND_RADIUS;
    xShift += (paddedCircleWidth + + numericLabelCheckboxShift);

    const textPosition = {y: this.yShift, x: xShift};

    const textElement = this.svgElementFactory
      .createTextElement(name, textPosition, SVG_TEXT_FONT_SIZES.COMMENT, SVG_ELEMENT_COLORS.TEXT, 'normal', '1.0', 'default');
    const textWidth = TextDimensionsCalculator.getTextDimensions(name, SVG_TEXT_FONT_SIZES.COMMENT).width;

    return {elements: [circle, numericLabel, textElement].filter((element) => element !== null) as SVGElement[],
      numericLabel: numericLabel, width: paddedCircleWidth + textWidth + (createNumericLabel ? 35 : 5)};
  }

  private createLegendItems(nucleotidesWithoutOverhangs: string[]): 
    { elements: SVGElement[], numericLabels: HTMLElement[], width: number } {
    let xShift = SENSE_STRAND_HORIZONTAL_SHIFT;
    const items = [] as SVGElement[][];
    const divItems: HTMLElement[] = [];

    const shift = (width: number) => xShift += width + 15;

    if (this.isPhosphorothioatePresent()) {
      const {elements, width} = this.createLegendItem('PTO linkage', xShift);
      shift(width);
      items.push(elements);
    }

    const modificationTypes = this.getModificationTypesList();
    modificationTypes.forEach((name) => {
      const {elements, width, numericLabel} = this.createLegendItem(name, xShift, nucleotidesWithoutOverhangs);
      shift(width);
      items.push(elements);
      divItems.push(numericLabel);
    });

    return {elements: items.flat(), numericLabels: divItems, width: xShift};
  }

  getContentHeight(): number { return 20; };

  getContentWidth(): number {
    return this.width;
  }
}
