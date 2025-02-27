import Choices from "choices.js";
import * as DG from 'datagrok-api/dg';

export abstract class ChoiceInputBase {
    choices: Choices;
    field: DG.InputBase;
    emptyLabel: string;

    protected constructor(choices: Choices, field: DG.InputBase, emptyLabel: string = 'all') {
        this.choices = choices;
        this.field = field;
        this.emptyLabel = emptyLabel;
    }

    getSelectedItems(): string[] {
        const categories = this.choices?.getValue(true) as string[];
        if (categories && categories.length > 0 && categories[0] !== '[]')
            return categories;
        else
            return [this.emptyLabel];
    }

    addItems(items: string[]) {
        if (items && items.length === 1 && items[0] === this.emptyLabel)
            return;
        this.choices.setChoiceByValue(this.choices._store.choices
            .filter((c) => items.includes(c.value.toString().toLowerCase())).map((c) => c.value));
        const element: HTMLElement | null = this.field.root.querySelector('[name="search_terms"]');
        if (element)
            element.style.width = '1ch'
    }
}
