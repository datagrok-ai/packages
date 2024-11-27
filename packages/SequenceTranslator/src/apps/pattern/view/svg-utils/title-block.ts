import {STRAND} from '../../model/const';
import {PatternConfiguration} from '../../model/types';
import {FONT_SIZE} from './const';
import {SVGBlockBase} from './svg-block-base';
import {SVGElementFactory} from './svg-element-factory';
import {TextDimensionsCalculator} from './text-dimensions-calculator';

const TITLE_LEFT_PADDING = 15;

export class TitleBlock extends SVGBlockBase {
  private titleText: string;
  private _svgElements: SVGElement[] = [];
  constructor(
    protected svgElementFactory: SVGElementFactory,
    protected config: PatternConfiguration,
    protected yShift: number
  ) {
    super(svgElementFactory, config, yShift);
    this.titleText = this.getTitleText();
    this._svgElements = [this.getTitle()];
  }

  get svgElements(): SVGElement[] {
    return this._svgElements;
  }

  private getTitle(): SVGElement {
    return this.svgElementFactory.createTextElement(
      this.titleText,
      {x: TITLE_LEFT_PADDING, y: this.yShift + FONT_SIZE.TITLE},
      FONT_SIZE.TITLE,
      'black',
      'normal',
      '1.0',
      'default'
    );
  }

  getContentWidth(): number {
    return TextDimensionsCalculator.getTextDimensions(this.titleText, FONT_SIZE.TITLE).width;
  }

  getContentHeight(): number {
    return TextDimensionsCalculator.getTextDimensions(this.titleText, FONT_SIZE.TITLE).height;
  }

  private getTitleText(): string {
    const senseStrandLength = `${this.config.nucleotideSequences[STRAND.SENSE].length}`;
    const antisenseStrandLength = this.config.isAntisenseStrandIncluded ?
      `/${this.config.nucleotideSequences[STRAND.ANTISENSE].length}` : '';
    const titleText = `${this.config.patternName} for ${senseStrandLength}${antisenseStrandLength}-mer`;

    return titleText;
  }
}

