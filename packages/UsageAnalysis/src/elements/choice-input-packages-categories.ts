import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import '../../css/choice_input.css';
import Choices from 'choices.js';
import {ChoiceInputBase} from "./choice-input-base";


export class ChoiceInputPackagesCategories extends ChoiceInputBase {
    static async construct() {
        const field = ui.input.choice('Categories');

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
        const categories: string[] = ((await grok.functions.call('UsageAnalysis:PackagesCategories')) as DG.DataFrame).getCol('category').toList();

        choices.setChoices(() => categories.map((p: string) => {
            return {value: p, label: p};
        }));
        return new ChoiceInputPackagesCategories(choices, field);
    }

    private constructor(choices: Choices, field: DG.InputBase) {
        super(choices, field, 'any');
    }
}
