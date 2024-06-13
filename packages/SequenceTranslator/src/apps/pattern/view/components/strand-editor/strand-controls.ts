import * as ui from 'datagrok-api/ui';

import $ from 'cash-dom';

import {STRAND, STRANDS, STRAND_LABEL} from '../../../model/const';
import {EventBus} from '../../../model/event-bus';
import {StrandType} from '../../../model/types';
import {isOverhangNucleotide} from '../../../model/utils';
import {BooleanInput, StringInput} from '../../types';
import {SubscriptionManager} from '../../../model/subscription-manager';
import {DataManager} from '../../../model/data-manager';

export class StrandControls {
  private displayedInputLabels: Map<StrandType, string[]>;

  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager,
    private subscriptions: SubscriptionManager
  ) {
    const subscription = this.eventBus.nucleotideSequencesChanged$.subscribe(() => {
      this.displayedInputLabels = this.computeDisplayedInputLabels();
    });
    this.subscriptions.add(subscription);
  }

  create(): HTMLDivElement {
    const inputPanels = STRANDS.map((strand) => this.constructControlsPanel(strand));

    const container = ui.divH(inputPanels, {style: {gap: '24px'}});
    return container;
  }

  private constructControlsPanel(strand: StrandType): HTMLDivElement {
    if (!this.eventBus.isAntisenseStrandActive() && strand === STRAND.ANTISENSE)
      return ui.div([]);


    const header = this.constructHeader();
    const modificationControls = this.createControls(strand);

    const container = ui.block([
      ui.h1(`${STRAND_LABEL[strand]}`),
      header,
      modificationControls,
    ], {style: {paddingTop: '12px'}});

    return container;
  }

  private constructHeader() {
    return ui.divH([
      ui.div([ui.divText('#')], {style: {width: '20px'}}),
      ui.block75([ui.divText('Modification')]),
      ui.div([ui.divText('PTO')]),
    ]);
  }

  private createControls(strand: StrandType): HTMLDivElement {
    const nucleobaseInputs = this.createNucleobaseInputs(strand);
    const labels = this.createLabelDivs(strand);
    const ptoLinkageInputs = this.createPTOFlagInputs(strand);
    const container = ui.div(nucleobaseInputs.map(
      (nucleobaseInput, idx) => {
        return ui.divH([
          labels[idx],
          ui.block75([nucleobaseInput.root]),
          ptoLinkageInputs[idx].root,
        ], {style: {alignItems: 'center'}});
      }));
    return container;
  }

  private createNucleobaseInputs(strand: StrandType): StringInput[] {
    const nucleotideBaseChoices: string[] = this.dataManager.fetchAvailableNucleotideBases()
      .sort(
        (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
      );
    const nucleotides = this.eventBus.getNucleotideSequences()[strand];
    const choiceInputs = nucleotides.map((nucleotide, index) => {
      const input = ui.choiceInput<string>('', nucleotide, nucleotideBaseChoices);
      input.onInput(() => {
        const newValue = input.value!;
        this.eventBus.setNucleotide(strand, index, newValue);
      });
      return input;
    });

    return choiceInputs;
  }

  private createPTOFlagInputs(strand: StrandType): BooleanInput[] {
    const ptoLinkageFlags = this.eventBus.getPhosphorothioateLinkageFlags()[strand].slice(1);
    const ptoLinkageInputs = ptoLinkageFlags.map((flag, index) => {
      const input = ui.boolInput('', flag);
      input.onInput(() => {
        const newValue = input.value!;
        this.eventBus.setPhosphorothioateLinkageFlag(strand, index + 1, newValue);
      });

      const subscription = this.eventBus.phosphorothioateLingeFlagsChanged$.subscribe((flags) => {
        const newValue = flags[strand][index + 1];
        input.value = newValue;
      });
      this.subscriptions.add(subscription);

      return input;
    });

    return ptoLinkageInputs;
  }

  private computeDisplayedInputLabels(): Map<StrandType, string[]> {
    const nucleotides = this.eventBus.getNucleotideSequences();
    const labels = new Map<StrandType, string[]>();
    STRANDS.forEach((strand) => {
      let counter = 1;
      const strandNucleotides = nucleotides[strand];
      const strandLabels = strandNucleotides.map((nucleotide) => {
        if (isOverhangNucleotide(nucleotide))
          return '';

        const label = String(counter);
        counter++;
        return label;
      });
      labels.set(strand, strandLabels);
    });

    return labels;
  }

  private createLabelDivs(strand: StrandType): HTMLElement[] {
    const labels = this.createLabels(strand);
    const labelDivs = labels.map((label) => ui.div([label], {style: {width: '20px'}}));

    const subscription = this.eventBus.nucleotideSequencesChanged$.subscribe(() => {
      const newLabels = this.createLabels(strand);
      newLabels.forEach((newLabel, index) => {
        $(labelDivs[index]).empty();
        $(labelDivs[index]).append(newLabel);
      });
    });
    this.subscriptions.add(subscription);

    return labelDivs;
  }

  private createLabels(strand: StrandType): HTMLLabelElement[] {
    const nucleotides = this.eventBus.getNucleotideSequences()[strand];
    const labels = nucleotides.map((_, index) => {
      const labelText = this.displayedInputLabels.get(strand)![index];
      return ui.label(labelText);
    });

    return labels;
  }
}
