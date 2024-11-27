import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {SubscriptionManager} from '../../model/subscription-manager';

import '../style.css';

import {StringInput} from '../types';

import $ from 'cash-dom';
import {DataManager} from '../../model/data-manager';
import {EventBus} from '../../model/event-bus';
import { PatternConfiguration } from '../../model/types';

export class PatternLoadControlsManager {
  private subscriptions = new SubscriptionManager();
  private authorSelectedByUser = false;

  constructor(
    private eventBus: EventBus,
    private dataManager: DataManager
  ) {
    this.eventBus.patternLoadRequested$.subscribe((patternHash: string) => this.handlePatternChoice(patternHash));

    this.eventBus.patternDeletionRequested$.subscribe(async (patternName: string) => {
      await this.dataManager.deletePattern(patternName, this.eventBus);
    });
  }

   async handlePatternChoice(patternHash: string, config?: PatternConfiguration): Promise<void> {
    let patternConfiguration;
    if (config)
      patternConfiguration = config
    else {
      patternConfiguration = await this.dataManager.getPatternConfig(patternHash);
      if (patternConfiguration === null)
        patternConfiguration = this.dataManager.getDefaultPatternConfig();
    }
    this.eventBus.setPatternConfig(patternConfiguration);
    this.eventBus.updateControlsUponPatternLoaded(patternHash);
    this.eventBus.setLastLoadedPatternConfig(patternConfiguration);
  }

  private isCurrentUserSelected(): boolean {
    return this.eventBus.getSelectedAuthor() !== this.dataManager.getOtherUsersAuthorshipCategory();
  }

  createControls(): HTMLElement {
    const inputsContainer = this.getPatternInputsContainer();
    return inputsContainer;
  }

  private getPatternInputsContainer(): HTMLDivElement {
    const inputsContainer = ui.divV(this.createPatternInputs());

    this.eventBus.patternListUpdated$.subscribe(() => {
      this.subscriptions.unsubscribeAll();

      // todo: change values of selectedPattern and selectedUser here

      $(inputsContainer).empty();
      $(inputsContainer).append(this.createPatternInputs());
    });

    return inputsContainer;
  }

  private createPatternInputs(): HTMLElement[] {
    const authorChoiceInput = this.createAuthorChoiceInput();

    const patternChoiceInputContainer = this.createPatternChoiceInputContainer();
    return [
      authorChoiceInput.root,
      patternChoiceInputContainer
    ];
  }

  private createTypeAhead(source: string[], df: DG.DataFrame): HTMLElement {
    const typeAhead = ui.typeAhead('Search pattern', {
      source: {
        local: source
      },
      minLength: 1, 
      limit: 3, 
      hint: true, 
      autoSelect: true, 
      highlight: true, 
      diacritics: true,
      onSubmit: (event, value) => {
        df.rows.filter((row) => row.pattern === value?.label);
        df.currentRowIdx = df.filter.findNext(-1, true);
      },
      debounceRemote: 100
    });
    typeAhead.onChanged.subscribe(() => {
      if(typeAhead.value === '')
        df.filter.setAll(true);
    })
    return typeAhead.root;
  }

  private createPatternChoiceInputContainer(): HTMLDivElement {
    const patternInput = this.createPatternsGridWithTypeAhead();
    const patternChoiceInputContainer = ui.div([patternInput]);

    const subscription = this.eventBus.userSelection$.subscribe(() => {
      $(patternChoiceInputContainer).empty();
      $(patternChoiceInputContainer).append(this.createPatternsGridWithTypeAhead());
    });
    this.subscriptions.add(subscription);

    return patternChoiceInputContainer;
  }

  private createPatternsGridWithTypeAhead(): HTMLElement {
    const patternNameCol = 'pattern';
    const currentUserPatterns = this.isCurrentUserSelected();
    const patternList = currentUserPatterns ?
    this.dataManager.getCurrentUserPatternNames().filter((it) => it !== this.dataManager.getDefaultPatternName()) :
    this.dataManager.getOtherUsersPatternNames();
    const df = DG.DataFrame.fromColumns([DG.Column.fromStrings(patternNameCol, patternList)]);
    const grid = df.plot.grid();
    grid.col(patternNameCol)!.editable = false;
    const typeAhead = this.createTypeAhead(patternList, df);
    grid.subs.push(
      df.onCurrentRowChanged.subscribe((_) => {
        const patternHash = this.dataManager
          .getPatternHash(df.get(patternNameCol, df.currentRowIdx), this.isCurrentUserSelected());
        this.eventBus.requestPatternLoad(patternHash);
        this.eventBus.updateUrlState(patternHash);
      })
    )
    return ui.divV([typeAhead, grid]);
  }

  private createAuthorChoiceInput(): StringInput {
    const possibleValues = [this.dataManager.getCurrentUserAuthorshipCategory()];
    if (this.dataManager.getOtherUsersPatternNames().length > 0)
      possibleValues.push(this.dataManager.getOtherUsersAuthorshipCategory());

    const authorChoiceInput = ui.input.choice(
      'Author',
      {value: this.eventBus.getSelectedAuthor(), items: possibleValues}
    );

    authorChoiceInput.onInput.subscribe(() => {
      this.authorSelectedByUser = true;
      if (authorChoiceInput.value === null)
        throw new Error('author choice must be non-null');
      this.eventBus.selectAuthor(authorChoiceInput.value);
    });
    //this.setAuthorChoiceInputStyle(authorChoiceInput);
    authorChoiceInput.setTooltip('Select pattern author');

    return authorChoiceInput;
  }

  private setAuthorChoiceInputStyle(userChoiceInput: StringInput): void {
    $(userChoiceInput.input).css({
      'max-width': '100px',
      'min-width': '100px',
    });
    $(userChoiceInput.root).css({
      'padding-right': '30px',
      'padding-left': '30px',
    });
  }

  private createPatternChoiceInput(): StringInput {
    const patternList = this.isCurrentUserSelected() ?
      this.dataManager.getCurrentUserPatternNames() :
      this.dataManager.getOtherUsersPatternNames();
  
    if (this.authorSelectedByUser) {
      const patternHash = this.dataManager.getPatternHash(patternList[0], this.isCurrentUserSelected());
      this.eventBus.requestPatternLoad(patternHash);
      this.eventBus.updateUrlState(patternHash);
      this.authorSelectedByUser = false;
    }

    const defaultValue = this.getPatternName(patternList);
    const choiceInput = ui.input.choice('Pattern', {value: defaultValue, items: patternList});
    choiceInput.setTooltip('Select pattern to load');

    $(choiceInput.input).css({
      'max-width': '100px',
      'min-width': '100px',
    });

    this.subscriptions.add(
      choiceInput.onInput.subscribe(
        () => {
          const patternHash = this.dataManager.getPatternHash(choiceInput.value!, this.isCurrentUserSelected());
          this.eventBus.requestPatternLoad(patternHash);
          this.eventBus.updateUrlState(patternHash);
        }
      )
    );

    this.subscriptions.add(
      this.eventBus.patternLoaded$.subscribe(() => {
        const patternName = this.eventBus.getPatternName();
        if (choiceInput.value !== patternName)
          choiceInput.value = this.getPatternName(patternList);
      })
    );

    return choiceInput;
  }

  private getPatternName(patternList: string[]): string {
    return patternList.find(
      (longPatternName) => {
        // The pattern name can be followed by the author name in parenths
        const shortPatternName = longPatternName.split(' (')[0];
        return shortPatternName === this.eventBus.getPatternName();
      }
    ) ?? patternList[0];
  }

  createDeletePatternButton(): HTMLButtonElement {
    const button = ui.button(
      ui.iconFA('trash-alt'),
      () => {
        if (this.eventBus.getPatternName() === this.dataManager.getDefaultPatternName()) {
          grok.shell.warning('Cannot delete not saved pattern');
          return;
        }
        this.showDeletePatternDialog();
      }
    );

    ui.tooltip.bind(button, 'Delete pattern from user storage');

    const subscription = this.eventBus.userSelection$.subscribe(() => {
      // $(button).toggle(this.isCurrentUserSelected());
      button.disabled = !this.isCurrentUserSelected();
    });
    this.subscriptions.add(subscription);

    return button;
  }

  private showDeletePatternDialog(): void {
    const dialog = ui.dialog('Delete pattern');
    const patternName = this.eventBus.getPatternName();
    dialog.add(ui.divText(`Are you sure you want to delete pattern ${patternName}?`));
    dialog.onOK(() => this.eventBus.requestPatternDeletion(patternName));
    dialog.show();
  }
}
