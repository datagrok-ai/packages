import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {EventBus} from '../../model/event-bus';
import {DataManager} from '../../model/data-manager';
import {PatternExistsError, PatternNameExistsError, PhosphorothioateLinkageFlags} from '../../model/types';
import {SvgDisplayManager} from '../svg-utils/svg-display-manager';
import {NumericLabelVisibilityControls} from './numeric-label-visibility-controls';
import { MAX_SEQUENCE_LENGTH, STRAND, STRANDS, STRAND_LABEL } from '../../model/const';
import { NUCLEOTIDES } from '../../../common/model/const';
import { applyPatternToRawSequence } from '../../model/translator';
import { TableControlsManager } from './bulk-convert/table-controls';
import { PatternLoadControlsManager } from './load-block-controls';
import {DEFAULT_DATE, PATTERN_RECORD_KEYS as P, DATE_KEYS as D, LEGEND_SETTINGS_KEYS as L} from '../../model/const';

export class PatternAppRightSection {
  private svgDisplay: HTMLDivElement;
  private loadControlsManager: PatternLoadControlsManager;

  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager,
  ) {
    this.svgDisplay = SvgDisplayManager.createSvgDiv(eventBus, this.dataManager);
    this.loadControlsManager = new PatternLoadControlsManager(this.eventBus, this.dataManager);
  };

  getLayout(): HTMLDivElement {
    const pattenNameInput = this.createPatternNameInput();
    const commentInput = this.createPatternCommentInput();
    const loadPatternButton = this.createLoadPatternButton();
    //const numericLabelTogglesContainer = new NumericLabelVisibilityControls(this.eventBus).getContainer();
    const downloadAndEditControls = this.generateDownloadControls();
    // const translationExamplesContainer = new TranslationExamplesBlock(
    //   this.eventBus, this.dataManager
    // ).createContainer();
    const lengthInputs = this.generateStrandLengthControls();
    const toggleAS = this.createAntisenseStrandToggle();
    const translationAcc = this.createTranslationAccordion();
    const setSequenceBasis = this.createSetSequenceBasisLink();
    const setAllPtoCheckbox = this.createAllPtoActivationInput();
    const modificationLabelsToggle = this.createModificationLabelsToggle();
    const layout = ui.panel([
      ui.divH([pattenNameInput, loadPatternButton, commentInput], 'st-pattern-name-comment-form'),
      ui.divH([
        ui.divV([
          ui.divH([toggleAS, lengthInputs], {style: {justifyContent: 'flex-end', minHeight: '211px'}}),
          ui.divV([setAllPtoCheckbox, modificationLabelsToggle, setSequenceBasis], 'st-strand-actions-div')
        ], {style: {paddingRight: '10px', minHeight: '335px'}}),
        ui.divV([downloadAndEditControls, this.svgDisplay])],
        'st-pattern-div'),
      //numericLabelTogglesContainer,
      //ui.divH([setSequenceBasis, setAllPtoCheckbox], 'st-set-all-div'),
      translationAcc,
      // ui.h1('Additional modifications'),
      // ui.form([
      //   terminalModificationInputs[STRAND.SENSE][FIVE_PRIME_END],
      //   terminalModificationInputs[STRAND.SENSE][THREE_PRIME_END],
      // ]),
      // asModificationDiv,
    ], {style: {overflowX: 'scroll', padding: '12px 24px'}});
    return layout;
  }

  private generateDownloadControls(): HTMLDivElement {
    return ui.divH([
      this.createSavePatternButton(),
      this.createDownloadPngButton(),
      this.createShareLinkButton(),
      this.loadControlsManager.createDeletePatternButton(),
      this.createInfoButton(),
    ], {style: {gap: '12px', marginTop: '12px', justifyContent: 'end'}});
  }


  private generateStrandLengthControls(): HTMLDivElement {
    const strandLengthInputs: {[key: string]: DG.InputBase} = {};
    STRANDS.map((strand) => {
      const sequenceLength = this.eventBus.getNucleotideSequences()[strand].length;
      //@ts-ignore
      const input = ui.input.int('', {value: sequenceLength, showPlusMinus: true, min: 0, max: MAX_SEQUENCE_LENGTH});
      input.onInput.subscribe(() => {
        const length = input.value;
        if (length === null) return;

        if (length <= 0) {
          grok.shell.warning(`Sequence length must be greater than 0`);
          input.value = 1;
        }
        if (length > MAX_SEQUENCE_LENGTH) {
          grok.shell.warning(`Sequence length must be less than ${MAX_SEQUENCE_LENGTH + 1}`);
          input.value = MAX_SEQUENCE_LENGTH;
        }

        this.eventBus.updateStrandLength(strand, input.value!);
      });
      this.eventBus.nucleotideSequencesChanged$.subscribe(() => {
        input.value = this.eventBus.getNucleotideSequences()[strand].length;
      });
      input.setTooltip(`Number of nucleotides in ${strand}, including overhangs`);
      strandLengthInputs[strand] = input;
    })

    this.eventBus.antisenseStrandToggled$.subscribe((active: boolean) => {
      const display = !active ? 'none' : 'flex';
      strandLengthInputs[STRAND.ANTISENSE].root.style.display = display;
   //   $(strandLengthInputs[STRAND.ANTISENSE].root).toggle(active);
    });

    return ui.divV([
      strandLengthInputs[STRAND.SENSE],
      strandLengthInputs[STRAND.ANTISENSE]
    ], 'st-strands-lengths-div');
  }

  private createAntisenseStrandToggle(): HTMLElement {
    const toggleAntisenseStrand = ui.switchInput(``,
      this.eventBus.isAntisenseStrandActive(), () => {
        this.eventBus.toggleAntisenseStrand(toggleAntisenseStrand.value);
      });
    this.eventBus.patternLoaded$.subscribe(() => {
      const loadedValue = this.eventBus.isAntisenseStrandActive();
      if (toggleAntisenseStrand.value !== loadedValue)
        toggleAntisenseStrand.value = loadedValue;
    });
    ui.tooltip.bind(toggleAntisenseStrand.root, 'Toggle antisense strand');
    //toggleAntisenseStrand.setTooltip('Toggle antisense strand');
    return ui.div(toggleAntisenseStrand.root, 'st-toogle-as-input');
  }

  private createPatternCommentInput(): HTMLElement {
    const patternCommentInput = ui.textInput('Comment', this.eventBus.getComment(), () => {
      this.eventBus.updateComment(patternCommentInput.value!);
    });
    $(patternCommentInput.root).addClass('st-comment-input');
    this.eventBus.patternLoaded$.subscribe(() => {
      patternCommentInput.value = this.eventBus.getComment();
    });
    return patternCommentInput.root;
  }

  private createPatternNameInput(): HTMLElement {
    const patternNameInput = ui.input.string('Pattern', {value: this.eventBus.getPatternName()});
    patternNameInput.onChanged.subscribe(() => {
      this.eventBus.updatePatternName(patternNameInput.value);
    });
    $(patternNameInput.root).addClass('st-pattern-text-input');
    this.eventBus.patternLoaded$.subscribe(() => {
      patternNameInput.value = this.eventBus.getPatternName();
    });
    patternNameInput.setTooltip('Name under which pattern will be saved');
    return patternNameInput.root;
  }

  private createTranslationAccordion(): HTMLElement {
    const getTranslationPanes = () => {
      const innerAcc = ui.accordion('translationContents');
      const bulkTranslatePane = innerAcc.addPane('Bulk', () => {
        const tableControls =  (new TableControlsManager(this.eventBus)).createControls();
        tableControls.splice(0, 1);
        return ui.div([...tableControls], 'ui-form');
      });
      ui.tooltip.bind(bulkTranslatePane.root, 'Bulk translation from table input');
      this.createTranslationExamplePane(STRAND.SENSE, innerAcc);
      this.createTranslationExamplePane(STRAND.ANTISENSE, innerAcc);
      innerAcc.root.classList.add('st-translate-accordion');
      
      return innerAcc.root;
    }
    const acc = ui.accordion('translation').addPane('Translation', () => getTranslationPanes());
    return acc.root;
  }

  private createTranslationExamplePane(strand: STRAND, acc: DG.Accordion) {
    const createInputSequence = (): string => {
      const sourceSequence = this.eventBus.getNucleotideSequences()[strand];
      return sourceSequence.map((_, index) => NUCLEOTIDES[index % NUCLEOTIDES.length]).join('');
    }
    const createOutputSeq = (exampleSeq: string) => {
        const modifications = this.eventBus.getNucleotideSequences()[strand];
        const terminals = this.eventBus.getTerminalModifications()[strand];
        const ptoFlags = this.eventBus.getPhosphorothioateLinkageFlags()[strand];
        return applyPatternToRawSequence(
          exampleSeq, modifications, ptoFlags, terminals
        );
    }
    const createTextInput = (seq: string): DG.InputBase => {
      const input = ui.textInput('', seq);
      input.input.classList.add('st-translate-example');
      input.input.setAttribute('readonly', 'true');
      input.setTooltip(`Example raw nucleotides input for ${STRAND_LABEL[strand]}`);
      return input;
    }
    const inputSeq = createInputSequence();
    const inputSeqInput = createTextInput(inputSeq);
    const outputSeqInput = createTextInput(createOutputSeq(inputSeq));
    const accPane = acc.addPane(strand, () => ui.divV([inputSeqInput.root, outputSeqInput.root], 'st-translate-example'));
    accPane.subs.push(this.eventBus.strandsLinkagesAndTerminalsUpdated$.subscribe(() => {
      const inputSeq = createInputSequence();
      inputSeqInput.value = inputSeq;
      outputSeqInput.value = createOutputSeq(inputSeq);
    }));
    return accPane;
  }

  private createSetSequenceBasisLink(): HTMLElement {
    const setAllMonomers = ui.link('Set all monomers...', () => {
      const availableNucleoBases = this.dataManager.fetchAvailableNucleotideBases()
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      const sequenceBaseInput = ui.choiceInput('', availableNucleoBases[0], availableNucleoBases);
      ui.dialog('Set all monomers')
        .add(sequenceBaseInput.root)
        .show()
        .onOK(() => {
          this.eventBus.replaceSequenceBase(sequenceBaseInput.value!)
        })
    });
    setAllMonomers.classList.remove('d4-link-external');
    setAllMonomers.classList.add('st-set-all-monomers');
    return setAllMonomers;
  }

  private createAllPtoActivationInput(): HTMLElement {
    const areAllPtoLinkagesSet = (flags: PhosphorothioateLinkageFlags) => {
      const falsePTOFlagsNum = STRANDS.map((strand) => flags[strand].filter((flag) => !flag).length)
        .reduce((a, b) => a + b, 0);
      return falsePTOFlagsNum === 0;
    }

    const flags = this.eventBus.getPatternConfig().phosphorothioateLinkageFlags;
    const initialValue = areAllPtoLinkagesSet(flags);
    const allPtoActivationInput = ui.input.bool('All PTO', {value: initialValue});
    allPtoActivationInput.onInput.subscribe(() => {
      this.eventBus.setAllPTOLinkages(allPtoActivationInput.value!);
    });
    this.eventBus.phosphorothioateLingeFlagsChanged$.subscribe(() => {
      const flags = this.eventBus.getPatternConfig().phosphorothioateLinkageFlags;
      const val = areAllPtoLinkagesSet(flags);
      if (allPtoActivationInput.value !== val)
        allPtoActivationInput.value = val;
    });

    ui.tooltip.bind(allPtoActivationInput.captionLabel, 'Activate all phosphothioates');
    allPtoActivationInput.root.classList.add('st-all-pto-checkbox');

    return allPtoActivationInput.root;
  }

  private createModificationLabelsToggle(): HTMLElement {
    const initialValue = !!this.eventBus.getNucleotidesWithModificationLabels().length;
    const modificationLabels = ui.input.bool('Modification labels', {value: initialValue});

    modificationLabels.onInput.subscribe(() => {
      this.eventBus.setAllModificationLabels(modificationLabels.value!);
    });

    this.eventBus.nucleotidesModificationLabelsChanged$.subscribe(() => {
      const labels = !!this.eventBus.getNucleotidesWithModificationLabels().length;
      if (modificationLabels.value !== labels)
        modificationLabels.value = labels;
    });

    ui.tooltip.bind(modificationLabels.captionLabel, 'Toggle modification labels');
    return modificationLabels.root;
  }


  private createLoadPatternButton(): HTMLElement {
    const loadPatternInput = ui.iconFA('folder-open', () => {
      const savedConfig  = this.eventBus.getPatternConfig();
      const patternDialog = this.loadControlsManager.createControls();
      ui.dialog('Load pattern')
      .add(patternDialog)
      .show()
      .onOK(() => {})
      .onCancel(() => {
        this.loadControlsManager.handlePatternChoice('', savedConfig);
      })
    });
    loadPatternInput.classList.add('st-load-pattern-button');
    return loadPatternInput;
  }

  private createDownloadPngButton(): HTMLElement {
    const svgDownloadButton = ui.button(
      ui.iconFA('arrow-square-down'), () => this.eventBus.requestSvgSave(), 'Download pattern as PNG');
    svgDownloadButton.classList.add('st-save-download-button');
    return svgDownloadButton;
  }

  private createInfoButton(): HTMLButtonElement {
    const shareLinkButton = ui.button(
      ui.iconFA('info-circle'),
      () => this.openInfoDialog()
    );

    this.eventBus.patternHasUnsavedChanges$.subscribe((hasUnsavedChanges: boolean) => {
      shareLinkButton.disabled = hasUnsavedChanges;
    });

    ui.tooltip.bind(shareLinkButton, 'View pattern metadata');
    return shareLinkButton;
  }

  private async openInfoDialog() {
    let author = this.dataManager.getCurrentUserName();
    let patternName = this.dataManager.getDefaultPatternName();
    let createDate = DEFAULT_DATE;
    let modifyDate = DEFAULT_DATE;
    const hash = new URLSearchParams(window.location.search).get('pattern');
    if (hash !== null) {
      const record = await this.dataManager.getPatternRecordByHash(hash);
      if (record !== null) {
        const authorID = record[P.AUTHOR_ID];
        const userFriendlyName = (await grok.dapi.users.find(authorID)).friendlyName;
        author = userFriendlyName;
        patternName = record[P.PATTERN_CONFIG][L.PATTERN_NAME];
        if (record[P.DATE] !== undefined) {
          const create = record[P.DATE][D.CREATE];
          if (create !== undefined)
            createDate = create;
          const modify = record[P.DATE][D.MODIFY];
          if (modify !== undefined)
            modifyDate = modify;
        }
      }
    }

    const message = ui.divV([
      ui.divText(`Pattern Name: ${patternName}`),
      ui.divText(`Author: ${author}`),
      ui.divText(`Created: ${getInfoTimestamp(new Date(createDate))}`),
      ui.divText(`Modified: ${getInfoTimestamp(new Date(modifyDate))}`),
    ]);
    grok.shell.info(message);
  }

  private createShareLinkButton(): HTMLDivElement {
    const div = ui.div();
    const shareLinkButton = ui.button(
      ui.iconFA('link'),
      () => navigator.clipboard.writeText(window.location.href)
        .then(() => grok.shell.info('Link to pattern copied to clipboard')),
    );
    ui.tooltip.bind(div,
      () =>  shareLinkButton.disabled ? `Save pattern to share link` : `Copy pattern link`);

    div.append(shareLinkButton);
    this.eventBus.patternHasUnsavedChanges$.subscribe((hasUnsavedChanges: boolean) => {
      shareLinkButton.disabled = hasUnsavedChanges;
    });

    ui.tooltip.bind(shareLinkButton, 'Share pattern link');
    return div;
  }

  private createSavePatternButton(): HTMLElement {
    const savePatternButton = ui.button(
      ui.iconFA('save'), () => this.processSaveButtonClick(), 'Save pattern to user storage');
    savePatternButton.classList.add('st-save-download-button');

    this.eventBus.patternHasUnsavedChanges$.subscribe((hasUnsavedChanges: boolean) => {
      savePatternButton.disabled = !hasUnsavedChanges;
    });
    return savePatternButton;
  }

  private processSaveButtonClick(): void {
    const patternName = this.eventBus.getPatternName();
    if (patternName === this.dataManager.getDefaultPatternName()) {
      grok.shell.warning(`Cannot save default pattern`);
      return;
    }
    if (patternName === '') {
      grok.shell.warning(`Insert pattern name`);
      return;
    }
    this.dataManager.savePatternToUserStorage(this.eventBus)
      .then(() => {
        grok.shell.info(`Pattern ${patternName} saved`);
      })
      .catch((e) => this.handleErrorWhileSavingPattern(e));
  }

  private handleErrorWhileSavingPattern(e: Error): void {
    if (e instanceof PatternNameExistsError) {
      new OverwritePatternDialog(this.eventBus, this.dataManager).show();
    } else if (e instanceof PatternExistsError) {
      grok.shell.warning(ui.div([
        ui.divText(`Pattern already exists`),
        ui.button('Load', () => {
          const hash = e.message;
          this.eventBus.requestLoadPatternInNewTab(hash);
        }),
      ]));
    } else {
      console.error('Error while saving pattern', e);
    }
  }
}

class OverwritePatternDialog {
  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) { }

  show(): void {
    const patternName = this.eventBus.getPatternName();
    const dialog = ui.dialog(`Pattern "${patternName}" already exists`);
    dialog.add(ui.divText(
      `Pattern "${patternName}" already exists. Do you want to overwrite it?`
    ));
    dialog.show();

    dialog.onOK(() => this.processOverwriteNamesakePattern());
  }

  private processOverwriteNamesakePattern(): void {
    const patternName = this.eventBus.getPatternName();
    this.dataManager.overwriteExistingPatternInUserStorage(this.eventBus)
      .then(() => {
        grok.shell.info(`Pattern ${patternName} overwritten`);
      })
      .catch((e) => {
        console.error('Error while overwriting pattern in user storage', e);
        grok.shell.error('Error while overwriting pattern');
      });
  }
}

function getInfoTimestamp(date: Date): string {
  return date.toLocaleString().split(':').slice(0, -1).join(':');
}
