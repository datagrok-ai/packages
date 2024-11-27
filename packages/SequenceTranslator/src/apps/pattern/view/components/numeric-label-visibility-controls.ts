import * as ui from 'datagrok-api/ui';

import {EventBus} from '../../model/event-bus';
import {isOverhangNucleotide} from '../../model/utils';
import {BooleanInput} from '../types';

import $ from 'cash-dom';

/** Toggles for numeric labels over nucleotides in SVG */
export class NumericLabelVisibilityControls {
  private togglesContainer: HTMLDivElement = ui.div([]);

  constructor(
    private eventBus: EventBus
  ) {
    this.eventBus.uniqueNucleotidesChanged$().subscribe(() => {
      this.updateContainer();
    });
  }

  getContainer(): HTMLDivElement {
    return this.togglesContainer;
  }

  private updateContainer(): void {
    $(this.togglesContainer).empty();
    $(this.togglesContainer).append(this.createInputs());
  }

  private createInputs(): HTMLDivElement {
    const uniqueNucleotideBases = this.eventBus.getUniqueNucleotides();
    const nucleotidesWithoutOverhangs = uniqueNucleotideBases.filter((n) => !isOverhangNucleotide(n));

    const inputBases = nucleotidesWithoutOverhangs.map(
      (nucleotide: string) => this.createSingleInput(nucleotide)
    );

    inputBases.sort(
      (inputA, inputB) => inputA.captionLabel.textContent!.localeCompare(inputB.captionLabel.textContent!)
    );

    return ui.divH(inputBases.map((input) => input.root), 'st-numeric-label');
  }

  private createSingleInput(nucleotide: string): BooleanInput {
    const initialValue = this.eventBus.getModificationsWithNumericLabels().includes(nucleotide);
    const input = ui.input.bool(nucleotide, {
      value: initialValue,
      onValueChanged: (value) => this.handleNumericLabelToggle(nucleotide, value)
    });
    $(input.root).css('padding-right', '20px');

    input.setTooltip(`Show numeric labels for ${nucleotide}`);

    return input;
  }

  private handleNumericLabelToggle(nucleotide: string, isVisible: boolean): void {
    const labelledNucleotides = this.eventBus.getModificationsWithNumericLabels();
    const hasNumericLabel = labelledNucleotides.includes(nucleotide);
    if (hasNumericLabel === isVisible)
      return;

    const newArray = isVisible ? labelledNucleotides.concat(nucleotide) :
      labelledNucleotides.filter((n) => n !== nucleotide);
    this.eventBus.updateModificationsWithNumericLabels(newArray);
  }
}
