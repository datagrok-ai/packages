import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import {ValidationHelper} from '../helpers/validation-helper';
import {updateDivInnerHTML} from '../utils/utils';
import {createValidationErrorsDiv, getRequiredColumnsByView} from '../utils/views-validation-utils';
import {VIEWS} from '../package';

export class ClinicalCaseViewBase extends DG.ViewBase {
  constructor(name, studyId) {
    super({});
    this.name = name;
    this.studyId = studyId;
  }

  loaded = false;
  domainsAndColumnsForValidation: {};
  validator: ValidationHelper;
  optDomainsWithMissingCols: string[];
  filterChanged = false;
  studyId;

  load(): void {
    ui.setUpdateIndicator(this.root, true, `Loading ${this.name} view`);
    // need timeout here to make update indicator visible
    setTimeout(async ()=> {
      this.validator = new ValidationHelper(getRequiredColumnsByView()[this.name], this.studyId);
      if (this.validator.validate()) {
        this.optDomainsWithMissingCols = Object.keys(this.validator.missingColumnsInOptDomains)
          .filter((it) => this.validator.missingColumnsInOptDomains[it].length);
        this.createView();
        this.loaded = true;
        ui.setUpdateIndicator(this.root, false);
        grok.shell.o = await this.propertyPanel();
      } else {
        updateDivInnerHTML(this.root,
          createValidationErrorsDiv(this.validator.missingDomains, this.validator.missingColumnsInReqDomains,
            this.validator.missingColumnsInOptDomains));
      }
    }, 50);
  }

  createView() { }

  updateGlobalFilter() {}

  async propertyPanel() {
    return await this.createAccWithTitle(this.name).root;
  }

  createAccWithTitle(panelName: string, title = null) {
    const acc = ui.accordion(`${panelName} panel`);
    const accIcon = ui.element('i');
    accIcon.className = 'grok-icon svg-icon svg-view-layout';
    acc.addTitle(ui.span([accIcon, ui.label(`${title ?? panelName}`)]));
    return acc;
  }

  detach(): void {
    super.detach();
    delete VIEWS[this.studyId][this.name];
  }
}
