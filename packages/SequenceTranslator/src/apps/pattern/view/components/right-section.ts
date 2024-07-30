import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {EventBus} from '../../model/event-bus';
import {DataManager} from '../../model/data-manager';
import {PatternExistsError, PatternNameExistsError} from '../../model/types';
import {SvgDisplayManager} from '../svg-utils/svg-display-manager';
import {NumericLabelVisibilityControls} from './numeric-label-visibility-controls';
import {TranslationExamplesBlock} from './translation-examples-block';
import {DEFAULT_DATE, PATTERN_RECORD_KEYS as P, DATE_KEYS as D, LEGEND_SETTINGS_KEYS as L} from '../../model/const';

export class PatternAppRightSection {
  private svgDisplay: HTMLDivElement;

  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) {
    this.svgDisplay = SvgDisplayManager.createSvgDiv(eventBus);
  };

  getLayout(): HTMLDivElement {
    const numericLabelTogglesContainer = new NumericLabelVisibilityControls(this.eventBus).getContainer();
    const downloadAndEditControls = this.generateDownloadControls();
    const translationExamplesContainer = new TranslationExamplesBlock(
      this.eventBus, this.dataManager
    ).createContainer();
    const layout = ui.panel([
      this.svgDisplay,
      numericLabelTogglesContainer,
      downloadAndEditControls,
      translationExamplesContainer,
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
      this.createInfoButton(),
    ], {style: {gap: '12px', marginTop: '12px'}});
  }

  private createDownloadPngButton(): HTMLButtonElement {
    const svgDownloadButton = ui.button('Get PNG', () => this.eventBus.requestSvgSave());

    ui.tooltip.bind(svgDownloadButton, 'Download pattern as PNG');

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
      ui.divText(`Author: ${author}`),
      ui.divText(`Pattern Name: ${patternName}`),
      ui.divText(`Created: ${new Date(createDate).toLocaleString()}`),
      ui.divText(`Modified: ${new Date(modifyDate).toLocaleString()}`),
    ]);
    grok.shell.info(message);
  }

  private createShareLinkButton(): HTMLButtonElement {
    const shareLinkButton = ui.button(
      ui.iconFA('link'),
      () => navigator.clipboard.writeText(window.location.href)
        .then(() => grok.shell.info('Link to pattern copied to clipboard'))
    );

    this.eventBus.patternHasUnsavedChanges$.subscribe((hasUnsavedChanges: boolean) => {
      shareLinkButton.disabled = hasUnsavedChanges;
    });

    ui.tooltip.bind(shareLinkButton, 'Share pattern link');
    return shareLinkButton;
  }

  private createSavePatternButton(): HTMLButtonElement {
    const savePatternButton = ui.button('Save', () => this.processSaveButtonClick());

    this.eventBus.patternHasUnsavedChanges$.subscribe((hasUnsavedChanges: boolean) => {
      savePatternButton.disabled = !hasUnsavedChanges;
    });

    ui.tooltip.bind(savePatternButton, 'Save pattern to user storage');

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

