/* Do not change these import lines to match external modules in webpack configuration */
import * as ui from 'datagrok-api/ui';

import {EventBus} from '../../model/event-bus';
import {PatternConfiguration} from '../../model/types';
//@ts-ignore
import * as svgExport from 'save-svg-as-png';
import {NucleotidePatternSVGRenderer} from './svg-renderer';
import { DataManager } from '../../model/data-manager';

export class SvgDisplayManager {
  private svgDisplayDiv = ui.div([], {style: {position: 'relative', minHeight: '300px'}});
  private svgElement: SVGElement;

  private constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) {
    eventBus.updateSvgContainer$.subscribe(() => this.updateSvgContainer());
    eventBus.svgSaveRequested$.subscribe(() => this.saveSvgAsPng());
  }

  static createSvgDiv(eventBus: EventBus, dataManager: DataManager): HTMLDivElement {
    const displayManager = new SvgDisplayManager(eventBus, dataManager);
    return displayManager.svgDisplayDiv;
  }

  private updateSvgContainer(): void {
    $(this.svgDisplayDiv).empty();
    const patternConfig = this.eventBus.getPatternConfig();
    const {svg, divs} = this.createSvg(patternConfig);
    this.svgElement = svg;
    this.svgDisplayDiv.append(this.svgElement);
    this.svgDisplayDiv.append(...divs);
  }

  private createSvg(patternConfig: PatternConfiguration): {svg: SVGElement, divs: HTMLElement[]} {
    const renderer = new NucleotidePatternSVGRenderer(patternConfig, this.eventBus, this.dataManager);
    const {svg, divs} = renderer.renderPattern();
    return {svg, divs};
  }

  private saveSvgAsPng(): void {
    const patternName = this.eventBus.getPatternName();
    svgExport.saveSvgAsPng(this.svgElement, patternName, {backgroundColor: 'white'});
  }
}
