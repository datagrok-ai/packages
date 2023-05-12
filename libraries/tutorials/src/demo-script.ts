import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';

import {delay} from '@datagrok-libraries/utils/src/test';


/** Type for {@link DemoScript} step */
export type Step = {
  name: string;
  func: () => Promise<void>;

  /** Step options: description and delay (in ms) after function ends */
  options?: {
    description?: string;
    delay?: number;
  }
};

/** Demo script class. Could be used for creating demo scripts to show the platform capabilities */
export class DemoScript {
  name: string = '';
  description: string = '';

  static currentObject: DemoScript | null = null;

  private _isAutomatic: boolean = false;
  private _currentStep: number = 0;
  private _isStopped: boolean = false;
  private _isCancelled: boolean = false;
  private _isStepProcessed: boolean = false;

  private _root: HTMLDivElement = ui.div([], {id: 'demo-script',
    classes: 'tutorials-root tutorials-track demo-app-script'});

  private _steps: Step[] = [];

  private _mainHeader: HTMLDivElement = ui.panel([], 'tutorials-main-header');
  private _header: HTMLHeadingElement = ui.h2('');
  private _headerDiv: HTMLDivElement = ui.divH([], 'tutorials-root-header');
  private _stopStartBtn: HTMLButtonElement = ui.button(ui.iconFA('pause'),
    () => this._changeStopState(), 'Play / pause');
  private _restartBtn: HTMLButtonElement = ui.button(ui.iconFA('redo'), () => this._restartScript(), 'Restart');
  private _nextStepBtn: HTMLButtonElement = ui.button(ui.iconFA('step-forward'), () => {
    if (!this._isStepProcessed)
      this._nextStep();
  }, 'Next step');

  private _activity: HTMLDivElement = ui.panel([], 'tutorials-root-description');

  private _progressDiv: HTMLDivElement = ui.divV([], 'tutorials-root-progress');
  private _progress: HTMLProgressElement = ui.element('progress');
  private _progressSteps: HTMLDivElement = ui.divText('');

  private _node?: DG.DockNode;
  private _closeBtn: HTMLButtonElement = ui.button(ui.iconFA('chevron-left'), () => this._closeDock());


  constructor(name: string, description: string, isAutomatic: boolean = false) {
    this.name = name;
    this.description = description;
    this._isAutomatic = isAutomatic;

    this._progress.max = 0;
    this._progress.value = 1;

    DemoScript.currentObject = this;
  }

  /** Returns demo script steps */
  get steps(): Step[] {
    return this._steps;
  }

  /** Returns the amount of demo script steps */
  get stepNumber(): number {
    return this._steps.length;
  }


  /** Adds script header */
  private _addHeader(): void {
    this._createHeaderDiv();
    this._createProgressDiv();
    this._mainHeader.append(this._headerDiv, this._progressDiv);
  }

  /** Creates script header div */
  private _createHeaderDiv(): void {
    this._header.innerText = this.name;
    this._headerDiv.append(this._closeBtn);
    this._headerDiv.append(this._header);

    this._headerDiv.append(this._isAutomatic ? this._stopStartBtn : this._nextStepBtn);
  }

  /** Creates script progress div */
  private _createProgressDiv(): void {
    this._progress.max = this.stepNumber;
    this._progressDiv.append(this._progress);
    this._progressSteps = ui.divText(`Step: ${this._progress.value} of ${this.stepNumber}`);

    this._progressDiv.append(this._progressSteps);
  }

  /** Adds description of the script */
  private _addDescription(): void {
    this._activity.append(ui.div(this.description, 'tutorials-root-description'));

    for (let i = 0; i < this.stepNumber; i++) {
      const instructionIndicator = ui.iconFA('clock');
      const instructionDiv = ui.div(this._steps[i].name, 'grok-tutorial-entry-instruction');
      const currentStepDescription = ui.div(this._steps[i].options?.description,
        'grok-tutorial-step-description hidden');
      const entry = ui.divH([
        instructionIndicator,
        instructionDiv,
      ], 'grok-tutorial-entry');

      this._activity.append(entry, currentStepDescription);
    }
  }

  /** Initializes the root of the demo script */
  private _initRoot(): void {
    grok.shell.windows.showContextPanel = true;
    grok.shell.windows.showHelp = false;

    const scriptDockNode = Array.from(grok.shell.dockManager.rootNode.children)[0];

    this._node = grok.shell.dockManager.dock(this._root, DG.DOCK_TYPE.FILL, scriptDockNode, '');

    if (scriptDockNode.parent.container.containerElement.firstElementChild?.lastElementChild?.
      classList.contains('tab-handle-list-container'))
      scriptDockNode.parent.container.containerElement.firstElementChild?.lastElementChild.remove();

    this._node.container.containerElement.classList.add('tutorials-demo-script-container');

    this._addHeader();
    this._root.append(this._mainHeader);

    this._addDescription();
    this._root.append(this._activity);
  }

  /** Processes next step */
  private async _nextStep(): Promise<void> {
    this._isStepProcessed = true;
    const entry = this._activity.getElementsByClassName('grok-tutorial-entry')[this._currentStep];
    const entryIndicator = this._activity.getElementsByClassName('grok-icon')[this._currentStep];
    const entryInstruction = this._activity.getElementsByClassName('grok-tutorial-step-description')[this._currentStep];

    entryIndicator.className = 'grok-icon far fa-spinner-third fa-spin';
    entryInstruction.classList.remove('hidden');
    entryInstruction.classList.add('visible');

    const currentStep = entry as HTMLDivElement;
    const stepDelay = this._steps[this._currentStep].options?.delay ?
      this._steps[this._currentStep].options?.delay! : 2000;

    await this._steps[this._currentStep].func();
    this._scrollTo(this._root, currentStep.offsetTop - this._mainHeader.offsetHeight);
    await this._countdown(entry as HTMLElement, entryIndicator as HTMLElement, stepDelay);
    await delay(stepDelay);

    entryIndicator.className = 'grok-icon far fa-check';

    this._progress.value++;
    this._progressSteps.innerText = `Step: ${this._progress.value} of ${this.stepNumber}`;

    this._currentStep++;
    this._isStepProcessed = false;

    if (this._currentStep === this.stepNumber) {
      this._isAutomatic ? this._stopStartBtn.replaceWith(this._restartBtn) :
        this._nextStepBtn.replaceWith(this._restartBtn);
    }
  }

  /** Starts the demo script actions */
  private async _startScript(): Promise<void> {
    for (let i = this._currentStep; i < this.stepNumber; i++) {
      if (this._isStopped || this._isCancelled)
        break;

      await this._nextStep();
    }
  }

  /**
   * Scrolls to the current step
   * @param element - Current step element in root
   * @param y - y coordinate of the element
   */
  private _scrollTo(element: HTMLDivElement, y: number): void {
    element.focus();
    element.scrollTop = y;
  }

  /**
   * Adds an interactive delay indicator
   * @param element - Current step element
   * @param indicator - Current step indicator
   * @param time - Indicator animation time
   */
  private async _countdown(element: HTMLElement, indicator: HTMLElement, time: number): Promise<void> {
    const countdownDiv: HTMLDivElement = ui.div([], 'demo-script-countdown');

    indicator.classList.add('hidden');

    let countdown = time / 1000;
    const svg = this._createSVGIndicator(countdown);

    countdownDiv.append(svg);
    element.prepend(countdownDiv);

    const interval = setInterval(() => {
      countdown--;
      if (countdown === 0) {
        clearInterval(interval);
        countdownDiv.remove();

        indicator.classList.remove('hidden');
        indicator.classList.add('visible');
      }
    }, 1000);
  }

  /**
   * Creates SVG with countdown circle
   * @param countdown - countdown time
   * @returns SVG countdown indicator
   */
  private _createSVGIndicator(countdown: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttributeNS(null, 'cx', '7');
    circle.setAttributeNS(null, 'cy', '7');
    circle.setAttributeNS(null, 'r', '6');
    circle.setAttributeNS(null, 'style', `animation: countdown ${countdown}s linear infinite forwards`);
    svg.append(circle);

    return svg;
  }

  /** Changes the state of the demo script (stop/play) */
  private _changeStopState(): void {
    const icon = this._stopStartBtn.getElementsByClassName('grok-icon');
    icon[0].className = 'grok-icon fas fa-play';
    this._isStopped = !this._isStopped;

    if (!this._isStopped) {
      icon[0].className = 'grok-icon fal fa-pause';
      this._startScript();
    }
  }

  /** Restarts the script */
  private _restartScript(): void {
    grok.shell.dockManager.close(this._node!);
    grok.shell.closeAll();
    this._clearRoot();
    this._setInitParams();
    this.start();
  }

  /** Clears the root element */
  private _clearRoot(): void {
    this._root = ui.div([], {id: 'demo-script', classes: 'tutorials-root tutorials-track demo-app-script'});

    this._mainHeader = ui.panel([], 'tutorials-main-header');
    this._header = ui.h2('');
    this._headerDiv = ui.divH([], 'tutorials-root-header');

    this._activity = ui.panel([], 'tutorials-root-description');

    this._progressDiv = ui.divV([], 'tutorials-root-progress');
    this._progress = ui.element('progress');
    this._progressSteps = ui.divText('');

    this._progress.max = 0;
    this._progress.value = 1;
  }

  /** Sets initial parameters */
  private _setInitParams(): void {
    this._currentStep = 0;
    this._isStopped = false;
    this._isCancelled = false;

    const icon = this._stopStartBtn.getElementsByClassName('grok-icon');
    icon[0].className = 'grok-icon fal fa-pause';
  }

  /** Closes demo script dock */
  private _closeDock(): void {
    grok.shell.dockManager.close(this._node!);
    this.cancelScript();
  }

  /** Cancels the script */
  cancelScript(): void {
    this._isCancelled = true;
    DemoScript.currentObject = null;
  }

  /**
   * Adds a new step to script
   * @param name - Step name
   * @param func - Step function
   * @param options - Step options (description and delay after step ends)
   * @returns Returns the current demo script object
   */
  step(name: string, func: () => Promise<void>, options?: {description?: string, delay?: number}): this {
    this._steps[this.steps.length] = {
      name: name,
      func: func,
      options: options,
    };
    return this;
  }

  /** Starts the demo script */
  async start(): Promise<void> {
    this._initRoot();
    grok.shell.newView();
    if (this._isAutomatic)
      this._startScript();
  }
}
