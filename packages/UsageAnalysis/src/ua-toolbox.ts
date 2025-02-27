import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
// import * as grok from 'datagrok-api/grok';

import {BehaviorSubject} from 'rxjs';
import {UaFilter} from './filter';
import {ViewHandler} from './view-handler';
import {ChoiceInputGroups} from './elements/choice-input-groups';
import {ChoiceInputPackages} from './elements/choice-input-packages';
import {UaView} from './tabs/ua';
import $ from 'cash-dom';
import {ChoiceInputTags} from "./elements/choice-input-tags";
import {ChoiceInputPackagesCategories} from "./elements/choice-input-packages-categories";


export class UaToolbox {
  rootAccordion: DG.Accordion;
  dateInput: DG.InputBase;
  groupsInput: ChoiceInputGroups;
  packagesInput: ChoiceInputPackages;
  tagsInput: ChoiceInputTags;
  packagesCategoriesInput: ChoiceInputPackagesCategories;

  filterStream: BehaviorSubject<UaFilter>;
  dateFromDD: DG.InputBase = ui.input.string('From', {value: ''});
  dateToDD: DG.InputBase = ui.input.string('To', {value: ''});
  usersDD: DG.InputBase = ui.input.string('Users', {value: ''});
  packagesDD: DG.InputBase = ui.input.string('Packages', {value: ''});
  viewHandler: ViewHandler;
  private _backToView: string = 'Packages';
  set backToView(value: string) {
    this._backToView = value;
    if (this.backButton !== undefined)
      this.backButton.innerText = `🠔 back to ${value.toLowerCase()}`;
  }
  get backToView(): string {
    return this._backToView;
  }

  backButton?: HTMLButtonElement;
  formDD: HTMLElement;
  drilldown: UaView | null = null;
  filters: DG.AccordionPane;

  static async construct(viewHandler: ViewHandler) {
    const date = 'this week';
    const dateInput = ui.input.string('Date', {value: date});
    dateInput.addPatternMenu('datetime');
    dateInput.setTooltip('Set the date period');
    const groupsInput = await ChoiceInputGroups.construct();
    const packagesInput = await ChoiceInputPackages.construct();
    const tagsInput = await ChoiceInputTags.construct();
    const packagesCategoriesInput = await ChoiceInputPackagesCategories.construct();
    const filterStream = new BehaviorSubject(new UaFilter({
      date: date,
      groups: [groupsInput.emptyLabel],
      packages: [packagesInput.emptyLabel],
      tags: [tagsInput.emptyLabel],
      packagesCategories: [packagesCategoriesInput.emptyLabel]
    }));
    return new UaToolbox(dateInput, groupsInput, packagesInput, tagsInput, packagesCategoriesInput, filterStream, viewHandler);
  }

  private constructor(dateInput: DG.InputBase, groupsInput: ChoiceInputGroups,
    packagesInput: ChoiceInputPackages, tagsInput: ChoiceInputTags, packagesCategoriesInput: ChoiceInputPackagesCategories, filterStream: BehaviorSubject<UaFilter>, viewHandler: ViewHandler) {
    this.rootAccordion = ui.accordion();
    this.formDD = ui.div();
    this.dateInput = dateInput;
    this.groupsInput = groupsInput;
    this.packagesInput = packagesInput;
    this.tagsInput = tagsInput;
    this.packagesCategoriesInput = packagesCategoriesInput;
    this.filterStream = filterStream;
    this.viewHandler = viewHandler;
    this.toggleTagsInput(false);
    this.toggleCategoriesInput(false);
    this.filters = this.rootAccordion.addPane('Filters', () => {
      const form = ui.narrowForm([
        dateInput,
        groupsInput.field,
        packagesInput.field,
        tagsInput.field,
        packagesCategoriesInput.field
      ]);
      const applyB = ui.bigButton('Apply', () => {
        applyB.disabled = true;
        this.applyFilter();
      });
      applyB.classList.add('ua-apply-button');
      applyB.disabled = true;
      dateInput.onChanged.subscribe(() => applyB.disabled = false);
      $(form).append(applyB);
      this.dateFromDD.readOnly = true;
      this.dateToDD.readOnly = true;
      this.usersDD.readOnly = true;
      this.packagesDD.readOnly = true;
      this.formDD = ui.narrowForm([
        this.dateFromDD,
        this.dateToDD,
        this.usersDD,
        this.packagesDD,
      ]);
      this.formDD.style.display = 'none';
      const closeButton = ui.button('', () => this.exitDrilldown(), 'Close drilldown filter');
      closeButton.classList.add('ua-close-button', 'fal', 'fa-times');
      this.backButton = ui.button(`🠔 back`, () => {
        this.viewHandler.changeTab(this._backToView);
        this.exitDrilldown();
      }, 'Back to previous tab');
      this.backButton.classList.add('ua-back-button');
      this.formDD.append(this.backButton);
      this.formDD.prepend(closeButton);
      this.formDD.classList.add('ua-drilldown-form');
      form.style.overflow = 'visible';
      return form;
    }, true);
    this.filters.root.before(this.formDD);

    this.viewHandler.view.tabs.onTabChanged.subscribe((_) => {
      if (this.formDD.style.display === 'block') this.exitDrilldown();
      if (this.checkLabels()) {
        this.formDD.style.display = 'block';
        this.filters.root.style.display = 'none';
      }
    });
  }

  exitDrilldown() {
    this.formDD.style.display = 'none';
    this.clearFormDD();
    this.drilldown?.viewers.forEach((v) => v.reloadViewer());
    this.drilldown = null;
    this.filters.root.style.display = 'flex';
  }

  checkLabels() {
    return [this.dateFromDD.value, this.dateToDD.value,
      this.usersDD.value, this.packagesDD.value].some((val) => val);
  }

  clearFormDD() {
    this.dateFromDD.value = '';
    this.dateToDD.value = '';
    this.usersDD.value = '';
    this.packagesDD.value = '';
  }

  getFilter() {
    const filter = new UaFilter({
      date: this.dateInput.value,
      groups: this.groupsInput.getSelectedItems(),
      packages: this.packagesInput.getSelectedItems(),
    });
    if (this.tagsInput.field.root.style.display !== 'none')
      filter.tags = this.tagsInput.getSelectedItems();
    if (this.packagesCategoriesInput.field.root.style.display !== 'none')
      filter.packagesCategories = this.packagesCategoriesInput.getSelectedItems();
    return filter;
  }

  applyFilter() {
    this.filterStream.next(this.getFilter());
    this.viewHandler.setUrlParam('date', this.dateInput.value, true);
    this.viewHandler.setUrlParam('users', this.groupsInput.getSelectedItems().join(','), true);
    this.viewHandler.setUrlParam('packages', this.packagesInput.getSelectedItems().join(','), true);
    if (this.tagsInput.field.root.style.display !== 'none')
      this.viewHandler.setUrlParam('tags', this.tagsInput.getSelectedItems().join(','), false);
    if (this.packagesCategoriesInput.field.root.style.display !== 'none')
      this.viewHandler.setUrlParam('categories', this.packagesCategoriesInput.getSelectedItems().join(','), false);
  }

  setDate(value: string) {
    this.dateInput.value = value;
  }

  setGroups(value: string) {
    this.groupsInput.addItems(value.split(','));
  }

  setPackages(value: string) {
    this.packagesInput.addItems(value.split(','));
  }

  setTags(value: string): void {
    this.tagsInput.addItems(value.split(','));
  }

  setPackagesCategories(value: string): void {
    this.packagesCategoriesInput.addItems(value.split(','));
  }

  toggleTagsInput(visible: boolean): void {
    ui.setDisplay(this.tagsInput.field.root, visible);
  }

  toggleCategoriesInput(visible: boolean): void {
    ui.setDisplay(this.packagesCategoriesInput.field.root, visible);
  }
}
