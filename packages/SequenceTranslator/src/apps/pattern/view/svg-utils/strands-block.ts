import {NUCLEOTIDES} from '../../../common/model/const';
import {STRAND, STRANDS, TERMINI, TERMINUS} from '../../model/const';
import {PatternConfiguration} from '../../model/types';
import {isOverhangNucleotide} from '../../model/utils';
import {SVG_CIRCLE_SIZES, SVG_ELEMENT_COLORS, SVG_TEXT_FONT_SIZES} from './const';
import {SVGBlockBase} from './svg-block-base';
import {SVGElementFactory} from './svg-element-factory';
import {TextDimensionsCalculator} from './text-dimensions-calculator';
import {computeTextColorForNucleobaseLabel, getNucleobaseColorFromStyleMap, getNucleobaseLabelForCircle} from './utils';

const NUMERIC_LABEL_PADDING = 5;
const SENSE_STRAND_HEIGHT = SVG_TEXT_FONT_SIZES.NUCLEOBASE +
  NUMERIC_LABEL_PADDING + SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER;
const SENSE_STRAND_PADDING = 10;
const LEFT_LABEL_WIDTH = 55;
const SENSE_STRAND_HORIZONTAL_SHIFT = SENSE_STRAND_PADDING + LEFT_LABEL_WIDTH;
const RIGHT_LABEL_WIDTH = 20;

export class StrandsBlock extends SVGBlockBase {
  private strands: SVGBlockBase[];
  private labels: SVGBlockBase[];
  private terminalModifications: SVGBlockBase[];
  constructor(
    svgElementFactory: SVGElementFactory,
    config: PatternConfiguration,
    yShift: number
  ) {
    super(svgElementFactory, config, yShift);
    const strandTypes = STRANDS.filter((strandType) => config.nucleotideSequences[strandType].length > 0);

    this.strands = strandTypes
      .map((strand) => new SingleStrandBlock(this.svgElementFactory, config, yShift, strand));


    this.terminalModifications = strandTypes.map(
      (strandType, idx) =>
        new TerminalModificationLabels(this.svgElementFactory, config, yShift, strandType, this.strands[idx] as SingleStrandBlock)
    );
    this.labels = strandTypes.map(
      (strandType, idx) =>
        new StrandLabel(this.svgElementFactory, config, yShift, strandType, this.terminalModifications[idx] as TerminalModificationLabels)
    );
  }

  get svgElements(): SVGElement[] {
    const elements = [
      ...this.strands,
      ...this.terminalModifications,
      ...this.labels,
    ].map((block) => block.svgElements).flat();
    return elements;
  }

  getContentWidth(): number {
    return Math.max(...this.labels.map((labelBlock) => labelBlock.getContentWidth()));
  }

  getContentHeight(): number {
    const result = this.strands
      .reduce((acc, strand) => acc + strand.getContentHeight(), 0);
    return result;
  }
}

class SingleStrandBlock extends SVGBlockBase {
  private _svgElements: SVGElement[];
  private nucleotideNumericLabels: (number | null)[];
  constructor(
    protected svgElementFactory: SVGElementFactory,
    protected config: PatternConfiguration,
    protected yShift: number,
    private strand: STRAND
  ) {
    super(svgElementFactory, config, yShift);

    // WARNING: should be computed before creating circles
    this.nucleotideNumericLabels = this.computeNucleotideNumericLabels();

    if (this.strand === STRAND.ANTISENSE) {
      this.config.phosphorothioateLinkageFlags[this.strand].reverse();
      this.config.nucleotideSequences[this.strand].reverse();
      this.nucleotideNumericLabels.reverse();
    }

    this._svgElements = [
      this.createStrandCircles(),
      this.createPTOLinkageStars(),
    ].flat();
  }

  private computeNucleotideNumericLabels(): (number | null)[] {
    let index = 0;
    const nucleotides = this.config.nucleotideSequences[this.strand];
    const indices = nucleotides.map((nucleotide) => {
      if (isOverhangNucleotide(nucleotide)) return null;
      index++;
      return index;
    });
    return indices;
  }

  get svgElements(): SVGElement[] {
    return this._svgElements;
  }

  private getStrandCircleYShift(): number {
    return getStrandCircleYShift(this.strand, this.yShift);
  }

  private createStrandCircles(): SVGElement[] {
    const defaultShift = {
      x: SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS + SENSE_STRAND_HORIZONTAL_SHIFT,
      y: this.getStrandCircleYShift()
    };

    const nucleotides = this.config.nucleotideSequences[this.strand];

    const elements = nucleotides
      .map((nucleotide, index) => this.createNucleotideElementGroup(nucleotide, index, defaultShift)).flat();

    return elements;
  }

  private createNucleotideElementGroup(
    nucleotide: string,
    index: number,
    defaultShift: {x: number, y: number}
  ): SVGElement[] {
    const circleElements = this.createNucleotideCircleElements(nucleotide, index, defaultShift);
    const numericLabel = this.config.nucleotidesWithNumericLabels.includes(nucleotide) ?
      this.createNucleotideNumericLabel(index, defaultShift) : null;

    return [...circleElements, numericLabel].filter((element) => element !== null) as SVGElement[];
  }

  private createNucleotideCircleElements(
    nucleotide: string,
    index: number,
    defaultShift: {x: number, y: number}
  ): (SVGElement | null)[] {
    const color = getNucleobaseColorFromStyleMap(nucleotide);
    const centerPosition = {...defaultShift, x: defaultShift.x + index * SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER};

    const circle = this.svgElementFactory
      .createCircleElement(centerPosition, SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS, color);

    const nonModifiedNucleotideLetterLabel = this.createNucleotideLetterLabel(index, defaultShift, nucleotide);

    return [circle, nonModifiedNucleotideLetterLabel];
  }

  private getNucleotideCircleCenterPosition(
    index: number,
    defaultShift: {x: number, y: number}
  ): {x: number, y: number} {
    return {
      x: defaultShift.x + index * SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER,
      y: defaultShift.y
    };
  }

  private createNucleotideLetterLabel(
    index: number,
    defaultShift: {x: number, y: number},
    nucleobase: string
  ): SVGElement | null {
    if (!NUCLEOTIDES.includes(nucleobase))
      return null;

    const text = getNucleobaseLabelForCircle(nucleobase);
    const color = computeTextColorForNucleobaseLabel(nucleobase);
    // position at the very center of the circle
    const position = this.getPositionForNucleotideLabel(index, defaultShift);
    return this.svgElementFactory.createTextElement(
      text,
      position,
      SVG_TEXT_FONT_SIZES.NUCLEOBASE,
      color
    );
  }

  /** Returns the position for the letter with its center being at the center of the circle */
  private getPositionForNucleotideLabel(
    index: number,
    defaultShift: {x: number, y: number}
  ): {x: number, y: number} {
    const circleCenter = this.getNucleotideCircleCenterPosition(index, defaultShift);
    const textDimensions = TextDimensionsCalculator.getTextDimensions('A', SVG_TEXT_FONT_SIZES.NUCLEOBASE);
    return {
      x: circleCenter.x - textDimensions.width / 2,
      // the coefficient 1/3 is fine-tuned to make the text look centered
      y: circleCenter.y + textDimensions.height / 3
    };
  }

  private getNumericLabelYShift(
    defaultShift: {x: number, y: number}
  ): number {
    return this.strand === STRAND.SENSE ?
      defaultShift.y - (SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS + NUMERIC_LABEL_PADDING) :
      defaultShift.y + SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS + NUMERIC_LABEL_PADDING + SVG_TEXT_FONT_SIZES.COMMENT;
  }

  private createNucleotideNumericLabel(
    index: number,
    defaultShift: {x: number, y: number}
  ): SVGElement | null {
    const label = this.nucleotideNumericLabels[index];
    if (label === null) return null;

    const width = TextDimensionsCalculator.getTextDimensions(label.toString(), SVG_TEXT_FONT_SIZES.COMMENT).width;

    const position = {
      x: defaultShift.x + index * SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER - width / 2,
      y: this.getNumericLabelYShift(defaultShift)
    };

    return this.svgElementFactory.createTextElement(
      label.toString(),
      position,
      SVG_TEXT_FONT_SIZES.COMMENT,
      SVG_ELEMENT_COLORS.TEXT
    );
  }

  private createPTOLinkageStars(): SVGElement[] {
    const ptoFlags = this.config.phosphorothioateLinkageFlags[this.strand];

    const yShift = this.getStrandCircleYShift() + SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS * 0.8;

    const elements = ptoFlags
      .map((ptoFlag, index) => {
        if (!ptoFlag) return null;

        const centerPosition = {
          x: SENSE_STRAND_HORIZONTAL_SHIFT + index * SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER,
          y: yShift
        };

        const color = SVG_ELEMENT_COLORS.LINKAGE_STAR;
        return this.svgElementFactory.createStarElement(centerPosition, color);
      })
      .filter((element) => element !== null) as SVGElement[];

    return elements;
  }

  getContentWidth(): number {
    const numberOfMonomers = this.config.nucleotideSequences[this.strand].length;
    return numberOfMonomers * SVG_CIRCLE_SIZES.NUCLEOBASE_DIAMETER;
  }

  getContentHeight(): number {
    return SENSE_STRAND_HEIGHT + SENSE_STRAND_PADDING;
  }
}

class StrandLabel extends SVGBlockBase {
  private _svgElements: SVGElement[];
  constructor(
    protected svgElementFactory: SVGElementFactory,
    protected config: PatternConfiguration,
    protected yShift: number,
    private strand: STRAND,
    private terminalModifications: TerminalModificationLabels
  ) {
    super(svgElementFactory, config, yShift);
    this._svgElements = this.createSVGElements();
  }

  private createSVGElements(): SVGElement[] {
    const elements = [
      this.createLeftLabel(),
      this.createRightLabel()
    ];
    return elements;
  }

  private getLeftLabelWidth(): number {
    return LEFT_LABEL_WIDTH;
  }

  private getRightLabelWidth(): number {
    return RIGHT_LABEL_WIDTH;
  }

  private createLeftLabel(): SVGTextElement {
    const terminus = this.strand === STRAND.SENSE ? TERMINUS.FIVE_PRIME : TERMINUS.THREE_PRIME;
    const text = `${this.strand}: ${terminus}  `;
    const textDimensions = TextDimensionsCalculator.getTextDimensions(text, SVG_TEXT_FONT_SIZES.NUCLEOBASE);
    const position = {
      x: SENSE_STRAND_PADDING,
      y: getStrandCircleYShift(this.strand, this.yShift) + textDimensions.height / 3
    };

    return this.svgElementFactory.createTextElement(
      text,
      position,
      SVG_TEXT_FONT_SIZES.NUCLEOBASE,
      SVG_ELEMENT_COLORS.TEXT
    );
  }

  private createRightLabel(): SVGTextElement {
    const terminus = this.strand === STRAND.SENSE ? TERMINUS.THREE_PRIME : TERMINUS.FIVE_PRIME;
    const text = `  ${terminus}`;
    const textDimensions = TextDimensionsCalculator.getTextDimensions(text, SVG_TEXT_FONT_SIZES.NUCLEOBASE);
    const position = {
      x: SENSE_STRAND_HORIZONTAL_SHIFT + this.terminalModifications.getContentWidth() + 5,
      y: getStrandCircleYShift(this.strand, this.yShift) + textDimensions.height / 3
    };

    return this.svgElementFactory.createTextElement(
      text,
      position,
      SVG_TEXT_FONT_SIZES.NUCLEOBASE,
      SVG_ELEMENT_COLORS.TEXT
    );
  }

  get svgElements(): SVGElement[] {
    return this._svgElements;
  }

  getContentWidth(): number {
    return this.terminalModifications.getContentWidth() + this.getLeftLabelWidth() +
      this.getRightLabelWidth() + SENSE_STRAND_PADDING;
  }

  getContentHeight(): number {
    return this.terminalModifications.getContentHeight();
  }
}

class TerminalModificationLabels extends SVGBlockBase {
  private _svgElements: SVGElement[];
  constructor(
    protected svgElementFactory: SVGElementFactory,
    protected config: PatternConfiguration,
    protected yShift: number,
    private strand: STRAND,
    private strandSvgWrapper: SingleStrandBlock
  ) {
    super(svgElementFactory, config, yShift);
    this._svgElements = this.createSVGElements();
  }

  private createSVGElements(): SVGElement[] {
    const elements = this.createTerminalModifications();
    return elements;
  }

  private getTerminalModification(terminus: TERMINUS): string {
    const terminalModification = this.config.strandTerminusModifications[this.strand][terminus];
    return terminalModification;
  }

  private getTerminalModificationTextDimensions(terminus: TERMINUS): {width: number, height: number} {
    const terminalModification = this.getTerminalModification(terminus);
    const textDimensions = TextDimensionsCalculator
      .getTextDimensions(terminalModification, SVG_TEXT_FONT_SIZES.NUCLEOBASE);
    return textDimensions;
  }

  private getLeftTerminus(): TERMINUS {
    return this.strand === STRAND.SENSE ? TERMINUS.FIVE_PRIME : TERMINUS.THREE_PRIME;
  }

  private createTerminalModification(terminus: TERMINUS): SVGTextElement {
    const terminalModification = this.getTerminalModification(terminus);
    const dimensions = this.getTerminalModificationTextDimensions(terminus);

    const isLeft = terminus === this.getLeftTerminus();
    const xShift = isLeft ? SENSE_STRAND_HORIZONTAL_SHIFT :
      SENSE_STRAND_HORIZONTAL_SHIFT +
      this.getTerminalModificationTextDimensions(this.getLeftTerminus()).width +
      this.strandSvgWrapper.getContentWidth();
    const position = {
      x: xShift,
      y: getStrandCircleYShift(this.strand, this.yShift) + dimensions.height / 3
    };
    if (isLeft) {
      this.strandSvgWrapper.shiftElements({
        x: dimensions.width,
        y: 0
      });
    }

    return this.svgElementFactory.createTextElement(
      terminalModification,
      position,
      SVG_TEXT_FONT_SIZES.NUCLEOBASE,
      SVG_ELEMENT_COLORS.MODIFICATION_TEXT
    );
  }

  private createTerminalModifications(): SVGTextElement[] {
    const termini = (this.strand === STRAND.ANTISENSE) ? TERMINI : Array.from(TERMINI).reverse();
    const textElements = termini.map((terminus) => this.createTerminalModification(terminus));
    return textElements;
  }

  get svgElements(): SVGElement[] {
    return this._svgElements;
  }

  getContentWidth(): number {
    return this.strandSvgWrapper.getContentWidth() +
      TERMINI
        .map((terminus) => this.getTerminalModificationTextDimensions(terminus).width)
        .reduce((acc, curr) => acc += curr, 0);
  }

  getContentHeight(): number {
    return this.strandSvgWrapper.getContentHeight();
  }
}

function getStrandCircleYShift(
  strand: STRAND,
  defaultYShift: number
): number {
  return strand === STRAND.SENSE ?
    defaultYShift + NUMERIC_LABEL_PADDING + SVG_TEXT_FONT_SIZES.COMMENT + SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS :
    defaultYShift + SENSE_STRAND_HEIGHT + SENSE_STRAND_PADDING + SVG_CIRCLE_SIZES.NUCLEOBASE_RADIUS;
}
