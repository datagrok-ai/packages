/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Subject} from 'rxjs';
import {distinctUntilChanged, map, mapTo, startWith, switchMap, takeUntil} from 'rxjs/operators';

export class InputForm extends HTMLElement {
  private formInst?: DG.InputForm;
  private skipDefaultInit = true;
  private formChanges$ = new Subject<DG.InputForm>();

  // TODO
  private destroyed$ = new Subject<boolean>();

  constructor() {
    super();

    this.formChanges$.pipe(
      switchMap((form) => form.onInputChanged),
      takeUntil(this.destroyed$),
    ).subscribe((ev) => this.dispatchEvent(new CustomEvent('input-changed', {detail: ev})));

    this.formChanges$.pipe(
      switchMap((form) => form.onValidationCompleted.pipe(mapTo(form), startWith(form))),
      map((form) => form.isValid),
      distinctUntilChanged(),
      takeUntil(this.destroyed$),
    ).subscribe((ev) => this.dispatchEvent(new CustomEvent('validation-changed', {detail: ev})));
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  get funcCall() {
    return this.formInst?.source;
  }

  set funcCall(fc: DG.FuncCall | undefined) {
    ui.empty(this);
    this.replaceFunc(fc);
  }

  set skipInit(val: boolean) {
    this.skipDefaultInit = val;
  }

  get skipInit() {
    return this.skipDefaultInit;
  }

  private async replaceFunc(funcCall?: DG.FuncCall) {
    if (!funcCall)
      this.formInst = undefined;
    else {
      this.formInst = await DG.InputForm.forFuncCall(funcCall, {twoWayBinding: true, skipDefaultInit: this.skipDefaultInit} as any);
      this.appendChild(this.formInst.root);
    }
    this.formChanges$.next(this.formInst);
    this.dispatchEvent(new CustomEvent('form-replaced', {detail: this.formInst}));
  }
}

export interface InputFormT extends InputForm {};
