import * as DG from 'datagrok-api/dg';
import {divText} from 'datagrok-api/ui';
import {ITemplate} from '../types';
import {HitTriageApp} from '../hit-triage-app';

export class HitTriageBaseView extends DG.ViewBase {
  app: HitTriageApp;

  constructor(app: HitTriageApp) {
    super();

    this.app = app;

    this.root.classList.add('grok-hit-triage-view');
    this.root.style.display = 'flex';
    this.statusBarPanels = [divText('Hit Triage')];
  }

  get template(): ITemplate {return this.app.template!;}

  /** Override to initialize the view based on the session. */
  onActivated(): void {
  }

  /** Gets called when any of the previous views change. */
  onReset() {
  }

  async process(): Promise<any> {
  }
}
