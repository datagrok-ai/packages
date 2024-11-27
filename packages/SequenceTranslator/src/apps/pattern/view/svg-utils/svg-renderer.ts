import _ from 'lodash';
import {PatternConfiguration} from '../../model/types';
import {StrandsBlock} from './strands-block';
import {SVGBlockBase} from './svg-block-base';
import {SVGElementFactory} from './svg-element-factory';
import {TitleBlock} from './title-block';
import {LegendBlock} from './legend-block';
import {LEGEND_PADDING, TITLE_SHIFT} from './const';
import { EventBus } from '../../model/event-bus';
import { DataManager } from '../../model/data-manager';

export class NucleotidePatternSVGRenderer {
  private title: TitleBlock;
  private strands: StrandsBlock;
  private legend: LegendBlock;
  private svgElementFactory = new SVGElementFactory();

  constructor(patternConfig: PatternConfiguration, private eventBus: EventBus, private dataManager: DataManager) {
    const config = _.cloneDeep(patternConfig);

    let heightShift = TITLE_SHIFT;

    this.title = new TitleBlock(this.svgElementFactory, config, heightShift);
    heightShift += this.title.getContentHeight();

    this.strands = new StrandsBlock(this.svgElementFactory, config, heightShift, eventBus, dataManager);
    heightShift += this.strands.getContentHeight();

    this.legend = new LegendBlock(this.svgElementFactory, config, heightShift, eventBus);
  }

  renderPattern(): {svg: SVGElement, divs: HTMLElement[]} {
    const width = this.getGlobalWidth();
    const height = this.getGlobalHeight();
    const canvas = this.svgElementFactory.createCanvas(width, height);

    const elements = [this.title, this.strands, this.legend].map((block) => block.svgElements).flat();
    canvas.append(...elements);

    return {svg: canvas, divs: this.legend.divElements};
  }

  private getGlobalWidth(): number {
    const blocks = [this.title, this.strands, this.legend] as SVGBlockBase[];
    return Math.max(...blocks.map((block) => block.getContentWidth()));
  }

  private getGlobalHeight(): number {
    const blocks = [this.title, this.strands, this.legend];
    const height = blocks.reduce((acc, block) => acc + block.getContentHeight(), TITLE_SHIFT);
    return height;
  }
}
