/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {filter} from 'rxjs/operators';
import {Tutorial} from '@datagrok-libraries/tutorials/src/tutorial';
import {interval, fromEvent} from 'rxjs';
import {describeElements, singleDescription, closeWindows} from './utils';

import '../../../../css/tutorial.css';

/** Earth's population modeling */
export const POPULATION_MODEL = `#name: Lotka-Volterra
#equations: 
  dx/dt = alpha * x
  dy/dt = -gamma * y

#argument: t
  initial = 0 {min: 0; max: 2; caption: Start; category: Time}
  final = 15  {min: 2; max: 150; caption: Finish; category: Time}
  step = 0.1  {min: 0.1; max: 1; caption: Step; category: Time}

#inits:  
  x = 20 {min: 2; max: 40; category: Seed; caption: Prey}
  y = 2  {min: 2; max: 10; category: Seed; caption: Predator}

#parameters:
  alpha = 1.1 {min: 0.1; max: 1.5; category: Parameters} [The maximum prey per capita growth rate]
  beta = 0.4  {min: 0.1; max: 1; category: Parameters} [The effect of the presence of predators on the prey death rate]
  gamma = 1.1 {min: 0.1; max: 1.5; category: Parameters} [The predator's per capita death rate]
  delta = 0.4 {min: 0.1; max: 1; category: Parameters} [The effect of the presence of prey on the predator's growth rate]

#output:
  t {caption: Time}
  x {caption: Prey}
  y {caption: Predator}`;

/** Diff Studio UI info */
const uiInfo = [
  `# Model
  
  You can enter the model inputs here.`,
  `# Graphs
  
  The model is incomplete, leading to the following effects:

  * The prey population grows infinitely
  * The predator population steadily declines`,
  `# Dataframe

  The outcomes of the numerical simulation.`,
];

/** Diff Studio editor info */
const editorInfo = [
  `# Equations
   
  Place differential equations in this block.`,
  `# Argument
  
  Define the argument in this block: 
  * the initial value
  * the final value
  * the grid step`,
  `# Annotation
  
  Diff Studio automatically generates user interface. To improve usability, specifiy in braces \`{}\`:

  * \`min\` and \`max\` to get sliders for the rapid model exploration
  * \`caption\` to get the desired input caption
  * \`category\` to group inputs by their categories`,
  `# Inits
  
  Define initial values here.`,
  `# Parameters
  
  If your model has paraterers, specify them here.`,
  `# Annotation
  
  To improve usability, specifiy tooltips in brackets \`[]\`.`,
  `# Output

  The computation output is a dataframe. Customize it here.`,
];

/** Tutorial on solving differential equations */
export class DifferentialEquationsTutorial extends Tutorial {
  get name() {
    return 'Differential equations';
  }
  get description() {
    return 'Learn how to model processes defined by differential equations with Diff Studio';
  }
  get steps() {return 12;}

  demoTable: string = '';
  helpUrl: string = 'https://datagrok.ai/help/compute/diff-studio';

  protected async _run() {
    this.header.textContent = this.name;
    this.describe('Diff Studio enables the simulation of processes defined by ordinary differential equations.');
    this.describe(ui.link('Learn more', this.helpUrl).outerHTML);
    this.title('Model');
    this.describe(`Let\'s implement the Lotka-Volterra predator-prey ${ui.link('model', this.helpUrl).outerHTML}.`);
    closeWindows();

    if (grok.shell.view('Browse') === undefined) {
      grok.shell.v = DG.View.createByType('browse');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 1. Run
    const browseView = grok.shell.view('Browse') as DG.BrowseView;
    grok.shell.v = browseView;
    const appsGroup = browseView.mainTree.getOrCreateGroup('Apps', null, false);
    appsGroup.expanded = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const diffStudioTree = appsGroup.getOrCreateGroup('Diff Studio');
    await this.action(
      'Run Diff Studio',
      fromEvent(diffStudioTree.root, 'dblclick'),
      diffStudioTree.root,
      'Go to <b>Browse > Apps</b>, and double click <b>Diff Studio</b>',
    );

    await new Promise((resolve) => setTimeout(resolve, 100 * 2));
    const templateView = grok.shell.view('Template');
    if (templateView !== undefined)
      templateView!.close();

    const openModelFunc: DG.Func = await grok.functions.eval('DiffStudio:ivpFileHandler');
    const openModelFuncCall = openModelFunc.prepare({'content': POPULATION_MODEL});
    await openModelFuncCall.call();

    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // 2. Explore elements
    this.describe('We start with an incomplete model.');

    const dsView = grok.shell.v as DG.TableView;
    const dsViewRoot = dsView.root;
    let uiFormRoot = dsViewRoot.querySelector('div.ui-form') as HTMLElement;
    let inputRoots = uiFormRoot.querySelectorAll('div.ui-input.ui-input-root.ui-input-float');
    const gridRoot = dsView.grid.root;
    const lineChartRoot = dsViewRoot.querySelector('div.d4-line-chart') as HTMLElement;

    let doneBtn = describeElements([inputRoots[0] as HTMLElement, lineChartRoot, gridRoot], uiInfo);
    await this.action(
      'Explore the interface',
      fromEvent(doneBtn, 'click'),
      undefined,
      'Click "Next" to go to the next item.',
    );

    // 3. Play with inputs    
    let finishEditor = inputRoots[1].querySelector('input[class="ui-input-editor"]') as HTMLInputElement;
    await this.action(
      'Set "Finish" to 150',
      interval(100).pipe(filter(() => finishEditor.value == '150')),
      finishEditor,
      'You can also enter "150" (instead of dragging a slider) to achieve the goal.',
    );

    // 4. Go to ODEs
    const editorRoot = dsViewRoot.querySelector('div.panel-base') as HTMLElement;
    this.describe('Explore the underlying mathematical model.');
    const modelTabRoot = dsViewRoot.querySelector('div.d4-tab-header[name="Model"]') as HTMLElement;
    await this.action(
      'Click the Model tab',
      fromEvent(modelTabRoot, 'click'),
      modelTabRoot,
    );

    // 5. Explore equations editor
    editorRoot.style.width = '515px';
    const lineRoots = editorRoot.querySelectorAll('div[class="cm-line"]') as unknown as HTMLElement[];

    doneBtn = describeElements([
      lineRoots[0],
      lineRoots[4],
      lineRoots[5],
      lineRoots[9],
      lineRoots[13],
      lineRoots[14],
      lineRoots[20],
    ], editorInfo);

    await this.action(
      'Explore editor',
      fromEvent(doneBtn, 'click'),
      undefined,
      'Click "Next" to go to the next item.',
    );

    // 6. Complete 1st equation  
    this.title('Improvement');
    this.describe('Let\'s modify the model so that it takes into account the interaction between predator and prey.');

    const tutorialPanelRoot = document.querySelector('div.tutorials-root-description.ui-div');

    let equation = 'dx/dt = alpha * x - beta * x * y';
    let rawEquation = equation.replaceAll(' ', '');
    let codeDiv = ui.divV([
      ui.label('Get the equation'),
      ui.divH([
        ui.div(equation, 'tutorials-code-section'),
        ui.div(ui.iconFA('copy', () => {
          grok.shell.info('Copied to clipboard');
          navigator.clipboard.writeText(equation);
        }, 'Copy to clipboard'), 'tutorials-copy-icon'),
      ]),
    ]);

    setTimeout(() => tutorialPanelRoot?.append(codeDiv), 100);
    
    await this.action(
      'Complete the first equation',
      interval(100).pipe(filter(() => lineRoots[1].textContent?.replaceAll(' ', '') == rawEquation)),
    );

    codeDiv.hidden = true;

    // 7. Complete 2nd equation    
    equation = 'dy/dt = -gamma * y + delta * x * y';
    rawEquation = equation.replaceAll(' ', '');
    codeDiv = ui.divV([
      ui.label('Get the equation'),
      ui.divH([
        ui.div(equation, 'tutorials-code-section'),
        ui.div(ui.iconFA('copy', () => {
          grok.shell.info('Copied to clipboard');
          navigator.clipboard.writeText(equation);
        }, 'Copy to clipboard'), 'tutorials-copy-icon'),
      ]),
    ]);

    setTimeout(() => tutorialPanelRoot?.append(codeDiv), 100);

    await this.action(
      'Complete the second equation',
      interval(100).pipe(filter(() => lineRoots[2].textContent?.replaceAll(' ', '') == rawEquation)),
    );

    codeDiv.hidden = true;

    // 8. Check meaning
    const description = '# Updates\n\nNow, the model takes into account:' + 
      '\n* the effect of the presence of predators on the prey death rate' +
      '\n* the effect of the presence of prey on the predator\'s growth rate';
    
    let okBtn = singleDescription(lineRoots[1], description, 'Go to the next step');

    await this.action(
      'Click "OK"',
      fromEvent(okBtn, 'click'),
      undefined,
      'Check the updates. Click "OK" to go to the next step.',
    );    

    // 9. Run computations
    this.title('Exploration');
    const runIcnRoot = document.querySelector('i.grok-icon.fal.fa-play.fas') as HTMLElement;

    await this.action(
      'Run the model',
      fromEvent(runIcnRoot, 'click'),
      runIcnRoot,
      `Click the <b>Run</b> icon on the top panel.`,
    );

    editorRoot.style.width = '220px';

    // 10. Play with inputs 
    uiFormRoot = dsViewRoot.querySelector('div.ui-form') as HTMLElement;   
    inputRoots = uiFormRoot.querySelectorAll('div.ui-input.ui-input-root.ui-input-float');

    const preyEditor = inputRoots[3].querySelector('input[class="ui-input-editor"]') as HTMLInputElement;
    await this.action(
      'Set "Prey" to 2',
      interval(100).pipe(filter(() => preyEditor.value == '2')),
      preyEditor,
      'Reduce the initial value of the prey population.',
    );

    // 11. Play with inputs    
    const deltaEditor = inputRoots[8].querySelector('input[class="ui-input-editor"]') as HTMLInputElement;
    await this.action(
      'Set "Delta" to 0.1',
      interval(100).pipe(filter(() => deltaEditor.value == '0.1')),
      deltaEditor,
      'Reduce the effect of preys on the predator\'s growth rate.',
    );

    // 12. Play with inputs
    finishEditor = inputRoots[1].querySelector('input[class="ui-input-editor"]') as HTMLInputElement;
    await this.action(
      'Set "Finish" to 150',
      interval(100).pipe(filter(() => finishEditor.value == '150')),
      finishEditor,
      'Get a simulation over a longer time period.',
    );
  } // _run
} // DifferentialEquationsTutorial
