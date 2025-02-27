import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import '../../css/choice_input.css';
import Choices from 'choices.js';
import {ChoiceInputBase} from "./choice-input-base";


export class ChoiceInputPackages extends ChoiceInputBase {
  static async construct() {
    const field = ui.input.choice('Packages');

    field.input.setAttribute('multiple', '');
    field.input.querySelectorAll('option').forEach((o) => {o.selected = false;});
    const choices = new Choices(field.input, {
      addItems: true,
      removeItems: true,
      removeItemButton: true,
      searchEnabled: true,
      searchChoices: true,
      itemSelectText: '',
    });
    field.input.addEventListener('change', (event) =>
      (document.querySelector('.ua-apply-button') as HTMLButtonElement).disabled = false);
    const packages = (await grok.dapi.packages.list()).filter((value, index, self) =>
      index === self.findIndex((t) => (t.name === value.name)));
    field.input.addEventListener('search', async (event) => {
      const newPackages: DG.Package[] = packages.filter((p) => p.name.toLowerCase()
        .includes(choices.input.value.toLowerCase()));
      choices.clearChoices();
      choices.setChoices(() => newPackages.map((p: DG.Package) => {
        return {value: p.name, label: p.name};
      }));
    });

    const all = packages;
    choices.setChoices(() => all.map((p: DG.Package) => {
      return {value: p.name, label: p.name};
    }));
    return new ChoiceInputPackages(choices, field);
  }

  private constructor(choices: Choices, field: DG.InputBase) {
    super(choices, field);
  }
}
