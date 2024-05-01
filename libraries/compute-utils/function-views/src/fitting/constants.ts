// Specific optimization constants

export enum METHOD {
   NELDER_MEAD = 'Nelder-Mead',
   GRAD_DESC = 'Gradient descent',
 };

export const methodTooltip = new Map([
  [METHOD.NELDER_MEAD, 'The Nelder-Mead method'],
  [METHOD.GRAD_DESC, 'The gradient descent method'],
]);

export enum LOSS {
   MAD = 'MAD',
   RMSE = 'RMSE',
 };

export const lossTooltip = new Map([
  [LOSS.MAD, 'Maximum absolute deviation'],
  [LOSS.RMSE, 'Root mean sqaure error'],
]);

/** Grid elements sizes */
export enum GRID_SIZE {
  LOSS_COL_WIDTH = 60,
  ROW_HEIGHT = 180,
  LOSS_GRAPH_WIDTH = 360,
  GOF_VIEWER_WIDTH = 240,
}

/** UI titles */
export enum TITLE {
   ITER = 'Iteration',
   LOSS = 'Loss',
   LOSS_GRAPH = 'Fitting profile',
   TARGET = 'Target',
   FIT = 'Fit',
   METHOD = 'method',
   VALUE = 'Value',
   OBJECTIVE = TARGET,
   SAMPLES = 'samples',
   ID = 'id',
   OBTAINED = 'Simulation',
   LOSS_LOW = 'loss',
 };

/** Items for the fitting help */
enum HELP_ITEMS {
  GOAL = '`Goal`',
  FIT = '`' + TITLE.FIT + '`',
  MIN = '`min`',
  MAX = '`max`',
  TARGET = '`' + TITLE.TARGET + '`',
  METHOD = '`' + TITLE.METHOD + '`',
  CONTEXT = '`Context Panel (F4)`',
  SAMPLES = '`' + TITLE.SAMPLES + '`',
  LOSS = '`' + TITLE.LOSS_LOW + '`',
};

/** Starting help markdown */
export const STARTING_HELP = `# Fitting

Use fitting to solve an inverse problem: find input conditions leading to specified output constraints. 
It computes inputs minimizing deviation measured by [loss function](https://en.wikipedia.org/wiki/Loss_function).

1. In the ${HELP_ITEMS.FIT} block, use switchers to specify inputs to be found:
   * Set ${HELP_ITEMS.MIN} and ${HELP_ITEMS.MAX} values for each selected item. They define the variation range
   * Set values of all other inputs

2. Set output constraints in the ${HELP_ITEMS.TARGET} block:
   * Use switchers to specify target outputs
   * Set target value for each selected item

3. Choose ${HELP_ITEMS.METHOD}. Press <i class="grok-icon fal fa-cog"></i>
to specify its settings.

4. Enter the number of inputs sets to be obtained (in the ${HELP_ITEMS.SAMPLES} field).

5. Specify the loss function type (in the ${HELP_ITEMS.LOSS} field).

6. Press **Run** or <i class="fas fa-play"></i> on the top panel to perform fitting. You will get a
[grid](https://datagrok.ai/help/visualize/viewers/grid) containing 

   * loss function values
   * fitted inputs
   * viewers visualizing the goodness of fit:
   * [line chart](https://datagrok.ai/help/visualize/viewers/line-chart) showing the loss function minimization

7. Open ${HELP_ITEMS.CONTEXT}. You will get the function run corresponding to the selected grid row

8. Press <i class="grok-icon fal fa-question"></i> on the top panel to learn more about 
[parameters optimization](https://datagrok.ai/help/compute/#input-parameter-optimization).

# Learn more

* [Parameters optimization](https://datagrok.ai/help/compute/#input-parameter-optimization)
* [Nelder-Mead method](https://en.wikipedia.org/wiki/Nelder%E2%80%93Mead_method)`;
