import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export class DGButton extends HTMLButtonElement {
  constructor() {
    super();
    this.classList.add('ui-btn', 'ui-btn-ok');
  }
}

export interface DGButtonT extends DGButton {};

export class DGBigButton extends HTMLButtonElement {
  constructor() {
    super();
    this.classList.add('ui-btn', 'ui-btn-ok', 'ui-btn-raised');
  }
}

export interface DGBigButtonT extends DGBigButton {};

export class DGToggleInput extends HTMLElement {
  private _caption: string = 'Caption';

  private innerEditor = null as null | DG.InputBase<boolean>;

  constructor() {
    super();
  }

  private render() {
    ui.empty(this);
    this.innerEditor = ui.input.toggle(this._caption);
    this.appendChild(this.innerEditor.root);

    this.innerEditor.onChanged.subscribe(() =>
      this.dispatchEvent(new CustomEvent('value-changed', {detail: this.innerEditor!.value})),
    );
  }

  set caption(caption: string) {
    if (!this.innerEditor) this.render();

    this.innerEditor!.caption = caption;
  }

  set nullable(nullable: boolean) {
    if (!this.innerEditor) this.render();

    this.innerEditor!.nullable = nullable;
  }

  set value(value: boolean) {
    if (!this.innerEditor) this.render();

    this.innerEditor!.value = value;
  }

  set tooltip(tooltip: string) {
    if (!this.innerEditor) this.render();

    this.innerEditor!.setTooltip(tooltip);
  }
}

export interface DGToggleInputT extends DGToggleInput {};

export class DGIconFA extends HTMLElement {
  _name = 'edit';
  _cursor = 'pointer';
  _animation = null as null | string;
  _tooltip = null as null | string;
  _faStyle = 'fal' as 'fal' | 'fas' | 'far' | 'fad';

  constructor() {
    super();
  }

  private render() {
    ui.empty(this);
    const t = ui.iconFA(this._name, null, this._tooltip);
    t.style.cursor = this._cursor;
    if (this._animation) t.classList.add(`fa-${this._animation}`);
    t.classList.remove('fal', 'fas', 'far', 'fad');
    t.classList.add(this._faStyle);
    this.appendChild(t);
  }

  set name(val: string) {
    this._name = val;
    this.render();
  }

  set cursor(val: string) {
    this._cursor = val;
    this.render();
  }

  set animation(val: string | null) {
    this._animation = val;
    this.render();
  }

  set tooltip(val: string | null) {
    this._tooltip = val;
    this.render();
  }

  set faStyle(val: typeof this._faStyle) {
    this._faStyle = val;
    this.render();
  }
}

export interface DGIconFAT extends DGIconFA {};

export class DGComboPopup extends HTMLElement {
  private _caption: string | HTMLElement = 'Caption';
  private _items = [] as string[];
  private _tooltip: string | null = null;

  constructor() {
    super();
  }

  public set caption(val: string | HTMLElement) {
    this._caption = val;
    this.render();
  }

  public set items(val: string[]) {
    this._items = val;
    this.render();
  }

  public set tooltip(val: string | null) {
    this._tooltip = val;
    this.render();
  }

  private render() {
    ui.empty(this);
    const newPopup = ui.comboPopup(
      this._caption,
      this._items,
      (item) => this.dispatchEvent(new CustomEvent(
        'selected', {detail: {item, itemIdx: this._items.findIndex((i) => i === item)}}),
      ),
    );
    ui.tooltip.bind(newPopup, this._tooltip);
    newPopup.style.height = '24px';
    newPopup.style.minWidth = '0px';
    newPopup.onclick = (ev) => {
      ev.stopPropagation();
    };
    this.appendChild(newPopup);
  }
}

export interface DGComboPopupT extends DGComboPopup {};

