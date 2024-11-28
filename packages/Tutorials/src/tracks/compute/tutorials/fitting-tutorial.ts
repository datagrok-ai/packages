/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {filter, map} from 'rxjs/operators';
import {Tutorial} from '@datagrok-libraries/tutorials/src/tutorial';
import {fromEvent} from 'rxjs';
import {getElement, getView, singleDescription, closeWindows} from './utils';

/** Tutorial on parameters optimization */
export class FittingTutorial extends Tutorial {
  get name() {
    return 'Parameter optimization';
  }
  get description() {
    return 'Find the initial conditions that produce a desired model output';
  }
  get steps() {return 13;}

  demoTable: string = '';
  helpUrl: string = 'https://datagrok.ai/help/compute/function-analysis#parameter-optimization';

  protected async _run() {
    this.header.textContent = this.name;
    this.describe('Parameter optimization solves an inverse problem: finding the input conditions that lead to a specified output of the model.');
    this.describe(ui.link('Learn more', this.helpUrl).outerHTML);
    this.title('Model');
    this.describe('Consider ball flight simulation.');
    closeWindows();

    if (grok.shell.view('Browse') === undefined) {
      grok.shell.v = DG.View.createByType('browse');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const browseView = grok.shell.view('Browse') as DG.BrowseView;
    grok.shell.v = browseView;
    const appsGroup = browseView.mainTree.getOrCreateGroup('Apps', null, false);
    appsGroup.expanded = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const modelCatalogNode = appsGroup.items.find((node) => node.text === 'Model Catalog');

    if (modelCatalogNode === undefined) {
      grok.shell.warning('Cannot run this tutorial: the package Compute is not installed');
      return;
    }

    // 1. Model Catalog
    await this.action(
      'Open Model Catalog',
      fromEvent(modelCatalogNode.root, 'dblclick'),
      modelCatalogNode.root,
      'Go to <b>Browse > Apps</b>, and double click <b>Model Catalog</b>.',
    );

    // 2. Run model
    const modelIconRoot = await getElement(grok.shell.v.root, 'span.d4-link-label[name="span-ballFlight"]');
    if (modelIconRoot === null) {
      grok.shell.warning('Model Catalog run timeout exceeded');
      return;
    }

    await this.action(
      'Run the "Ball flight" model',
      fromEvent(modelIconRoot, 'dblclick'),
      modelIconRoot,
      'Double click <b>Ball flight</b>.',
    );

    // 3. Model
    const modelView = await getView('Ball flight');
    if (modelView === null) {
      grok.shell.warning('Model run timeout exceeded');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const modelRoot = await getElement(modelView.root, 'div.d4-line-chart');
    if (modelRoot === null) {
      grok.shell.warning('Sensitivity analysis run timeout exceeded');
      return;
    }

    let okBtn = singleDescription(
      modelRoot,
      '# Model\n\nThis is a ball flight simulation.',
      'Go to the next step',
    );
    
    await this.action(
      'Click "OK"',
      fromEvent(okBtn, 'click'),
      undefined,
      `Click "OK" to go to the next step.`,
    );

    // 4. Run fitting
    this.title('Fit scalar output');
    this.describe('How should the ball be thrown to make it fly exactly 10 meters? Let\'s find the answer.');

    const fitIcnRoot = document.querySelector('i.grok-icon.fal.fa-chart-line') as HTMLElement;

    await this.action(
      'Click "Fit inputs"',
      fromEvent(fitIcnRoot, 'click'),
      fitIcnRoot,
      'Click the "Fit inputs" icon on the top panel.',
    );

    // 5. Switch Velocity
    const fittingView = await getView('ballFlight - fitting') as DG.TableView;
    if (fittingView === null) {
      grok.shell.warning('Fitting run timeout exceeded');
      return;
    }

    const fitFormRoot = await getElement(fittingView.root, 'div.ui-div.ui-form');
    const velocityInputRoot = fitFormRoot!.children[9] as HTMLElement;
    const velocitySwitcher = velocityInputRoot.querySelector('div.ui-input-editor') as HTMLElement;

    this.describe('Let\'s find the initial velocity and angle.');

    await this.action(
      'Switch on "Velocity"',
      fromEvent(velocitySwitcher, 'click'),
      velocitySwitcher,
    );

    // 6. Switch Angle
    const angleFitInputRoot = fitFormRoot!.children[12] as HTMLElement;
    const angleSwitcher = angleFitInputRoot.querySelector('div.ui-input-editor') as HTMLElement;

    await this.action(
      'Switch on "Angle"',
      fromEvent(angleSwitcher, 'click'),
      angleSwitcher,
    );

    // 7. Target value
    const distFitInputRoot = fitFormRoot!.children[16] as HTMLElement;
    const distSwitcher = distFitInputRoot.querySelector('input.ui-input-editor') as HTMLInputElement;
    const numSource = fromEvent(distSwitcher, 'input').pipe(map((_) => distSwitcher.value), filter((val) => val === '10'));

    await this.action(
      'Set "Max distance" to 10',
      numSource,
      distSwitcher,
      'Set the target value for <b>Max distance</b>.',
    );

    // 8. Run
    const runIcnRoot = document.querySelector('i.grok-icon.fal.fa-play.fas') as HTMLElement;

    await this.action(
      'Click "Run"',
      fromEvent(runIcnRoot, 'click'),
      runIcnRoot,
      `Click the <b>Run</b> icon on the top panel to launch fitting <b>Velocity</b> and <b>Angle</b>. 
      Customize optimizer's settings in the <b>Using</b> block.`,
    );

    // 9. Explore
    const barChartRoot = await getElement(fittingView.root, 'div.d4-bar-chart');
    if (barChartRoot === null) {
      grok.shell.warning('Sensitivity analysis run timeout exceeded');
      return;
    }

    okBtn = singleDescription(
      fittingView.grid.root,
      '# Solution\n\nThe first row presents the best fit:\n\n* the computed <b>Velocity</b> and <b>Angle</b>\n* a visualization illustrating the goodness of fit',
      'Go to the next step',
    );
    
    await this.action(
      'Click "OK"',
      fromEvent(okBtn, 'click'),
      undefined,
      `Click "OK" to go to the next step.`,
    );

    const ballFlightTable = await grok.dapi.files.readCsv('System:AppData/Tutorials/ball-flight-trajectory.csv');
    ballFlightTable.name = 'Ball trajectory';
    grok.shell.addTable(ballFlightTable);

    // 10. Switch off Max distance
    this.title('Fit curve');
    this.describe('How to throw a ball so that it follows a given trajectory?\nYou may check the target in <b>Tables > Ball trajectory</b>.');

    const maxDistRoot = fitFormRoot!.children[16] as HTMLElement;
    const maxDistSwitcher = maxDistRoot.querySelector('div.ui-input-editor') as HTMLElement;

    await this.action(
      'Switch off "Max distance"',
      fromEvent(maxDistSwitcher, 'click'),
      maxDistSwitcher,
    );

    // 11. Switch on Trajectory
    const trajectoryRoot = fitFormRoot!.children[20] as HTMLElement;
    const trajectorySwitcher = trajectoryRoot.querySelector('div.ui-input-editor') as HTMLElement;

    await this.action(
      'Switch on "Trajectory"',
      fromEvent(trajectorySwitcher, 'click'),
      trajectorySwitcher,
    );

    // 12. Select table
    const tableInputRoot = fitFormRoot!.querySelector('div.ui-input-choice.ui-input-table.ui-input-root') as HTMLElement;
    const tableChoiceRoot = tableInputRoot.querySelector('select.ui-input-editor') as HTMLSelectElement;
    tableChoiceRoot.value = '';
    const dfSource = fromEvent(tableChoiceRoot, 'input').pipe(map((_) => tableChoiceRoot.value), filter((val) => val === 'Ball trajectory'));

    await this.action(
      'Set "Trajectory" to "Ball trajectory"',
      dfSource,
      tableInputRoot,
    );

    // 13. Run
    await this.action(
      'Click "Run"',
      fromEvent(runIcnRoot, 'click'),
      runIcnRoot,
    );

    await new Promise<void>((resolve) => {
      //setTimeout(resolve, 5000);
      fittingView.grid.onAfterDrawContent.subscribe((e) => resolve());
    });
  } // _run
} // FittingTutorial
