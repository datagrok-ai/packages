import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import '../../css/choice_input.css';
import Choices from 'choices.js';
import {ChoiceInputBase} from "./choice-input-base";


export class ChoiceInputGroups extends ChoiceInputBase {
  static async construct() {
    const field = ui.input.choice('Groups');
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
    field.input.addEventListener('search', async (event) => {
      const newGroups: DG.Group[] = await grok.dapi.groups.getGroupsLookup(choices.input.value);
      choices.clearChoices();
      choices.setChoices(() => newGroups.map((g: DG.Group) => {
        return {value: g.id, label: g.friendlyName};
      }));
    });
    const all = await grok.dapi.groups.list();
    choices.setChoices(() => all.map((g: DG.Group) => {
      return {value: g.id, label: g.friendlyName};
    }));

    return new ChoiceInputGroups(choices, field, (await grok.dapi.groups.getGroupsLookup('All users'))[0].id);
  }

  private constructor(choices: Choices, field: DG.InputBase, allUsers: string) {
    super(choices, field, allUsers);
  }
}
