import * as ui from 'datagrok-api/ui';

import '../style.css';

import {StringInput} from '../types';

import $ from 'cash-dom';
import {NUCLEOTIDES} from '../../../common/model/const';
import {STRAND, STRANDS, STRAND_LABEL} from '../../model/const';
import {DataManager} from '../../model/data-manager';
import {EventBus} from '../../model/event-bus';
import {applyPatternToRawSequence} from '../../model/translator';
import {SubscriptionManager} from '../../model/subscription-manager';


export class TranslationExamplesBlock {
  private subscriptions = new SubscriptionManager();

  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) { }

  createContainer(): HTMLDivElement {
    return ui.div([
      ui.h1('Translation example'),
      this.createTranslationExamples(),
    ], {style: {paddingTop: '20px'}});
  }

  private createTranslationExamples(): HTMLDivElement {
    const strandExamples = ui.divH([
      ...this.getExampleElements(),
    ], 'ui-form');

    this.eventBus.antisenseStrandToggled$.subscribe(() => {
      this.subscriptions.unsubscribeAll();
      $(strandExamples).empty();
      $(strandExamples).append(this.getExampleElements());
    });

    return strandExamples;
  }

  private getExampleElements(): HTMLDivElement[] {
    return STRANDS.map(
      (strand) => new StrandExample(strand, this.eventBus, this.subscriptions).create()
    );
  }
}

class StrandExample {
  private inputExample: StringInput;
  private outputExample: StringInput;

  constructor(
    private strand: STRAND,
    private eventBus: EventBus,
    private subscriptions: SubscriptionManager,
  ) { }

  create(): HTMLDivElement {
    if (!this.eventBus.isAntisenseStrandActive() && this.strand === STRAND.ANTISENSE)
      return ui.div([]);

    this.inputExample = this.createInputExample();
    this.outputExample = this.createOutputExample(this.inputExample.value!);
    this.subscribeToEvents();

    const strandExample = ui.block50([
      ui.h2(STRAND_LABEL[this.strand]),
      this.inputExample.root,
      this.outputExample.root,
    ], {style: {paddingRight: '20px'}});
    return strandExample;
  }

  private subscribeToEvents(): void {
    const subscription = this.eventBus.strandsLinkagesAndTerminalsUpdated$.subscribe(() => {
      const exampleInputSequence = this.generateExampleSequence();
      this.inputExample.value = exampleInputSequence;
      this.outputExample.value = this.computeOutputValue(exampleInputSequence);
    });

    if (this.strand === STRAND.ANTISENSE)
      this.subscriptions.add(subscription);
  }

  private createInputExample(): StringInput {
    const input = this.createTextInputForExamples();

    const exampleInputSequence = this.generateExampleSequence();
    input.value = exampleInputSequence;

    input.setTooltip(`Example raw nucleotides input for ${STRAND_LABEL[this.strand]}`);

    return input;
  }

  private generateExampleSequence(): string {
    const sourceSequence = this.eventBus.getNucleotideSequences()[this.strand];
    const exampleSequence = sourceSequence.map((_, index) => {
      return NUCLEOTIDES[index % NUCLEOTIDES.length];
    }).join('');

    return exampleSequence;
  }

  private createOutputExample(exampleInputSequence: string): StringInput {
    const output = this.createTextInputForExamples();
    output.value = this.computeOutputValue(exampleInputSequence);

    output.setTooltip(`Pattern applied to the example input for ${STRAND_LABEL[this.strand]}`);

    return output;
  }

  private computeOutputValue(exampleInputSequence: string): string {
    const modifications = this.eventBus.getNucleotideSequences()[this.strand];
    const terminals = this.eventBus.getTerminalModifications()[this.strand];
    const ptoFlags = this.eventBus.getPhosphorothioateLinkageFlags()[this.strand];
    return applyPatternToRawSequence(
      exampleInputSequence, modifications, ptoFlags, terminals
    );
  }

  private createTextInputForExamples(): StringInput {
    const input = ui.textInput('', '');
    this.applyStylingToInput(input);

    return input;
  }

  private applyStylingToInput(input: StringInput): void {
    const textarea = input.root.getElementsByTagName('textarea')[0];
    textarea.setAttribute('readonly', 'true');
    $(textarea).css('resize', 'none');
    $(input.root).css('opacity', '75%');
  }
}
