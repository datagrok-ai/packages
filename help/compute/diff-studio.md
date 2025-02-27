---
title: "Diff Studio"
keywords:    
  - modeling complex systems processes
  - ordinary differential equations solver
  - initial value problem
  - interactive modeling
  - no-code scientific computing
  - declarative syntax
  - stiff equations solver
---

Differential equations are crucial in modeling complex systems - from pharmacology and drug manufacturing to financial modeling and environmental studies.

Datagrok Diff Studio solves [initial value problems](https://en.wikipedia.org/wiki/Initial_value_problem) for
[ordinary differential equations](https://en.wikipedia.org/wiki/Ordinary_differential_equation) (ODEs) and visualizes solutions in real time,
turning complex math into interactive visual models.

Key benefits:

* **For model users**
  * Instantly see how parameter changes affect your system
  * Find optimal parameter values that match your target data
  * Explore model behavior using Monte Carlo, Sobol, and other methods
* **For model creators**
  * Focus on the math - the platform handles visualization and interface
  * Start quick with pre-built models  
  * Solve both stiff and non-stiff equations
  * Handle complex multi-equation ODE systems
  * Debug equations easily
* **For organizations**
  * Store and share all ODE models in one, centralized hub
  * Convert models to scripts to extend functionality or integrate with other Datagrok tools
  * Build specialized scientific applications

## Working with models

Launch Diff Studio from **Apps** > **Diff Studio**. The app opens with your recent model, or a default template if it's your first time.

To load an existing model, click the <i class="fas fa-folder-open"></i> **Open** icon and choose:

* **Import...** to import local IVP files (or simply drag-and-drop)
* **Library** to open a production model from the [catalog](models.md)
* **Templates** to start with a model template
* **My Models** to open a model from your platform files (**Browse > Files > My files**)
* **Recent** to open your recent models

Once loaded, explore models by adjusting parameters, [fitting to experimental data](function-analysis.md#parameter-optimization), or [running sensitivity analysis](function-analysis.md#sensitivity-analysis). Share specific model runs by copying and sharing the URL with colleagues.

![Run Diff Studio](pics/diff-studio-run.gif)

Download models using the <i class="fas fa-arrow-to-bottom"></i> **Download** icon as IVP files, which you can edit in any text editor. To store a model in Datagrok, click the **SAVE** button and specify the location.

Analyze your model:

* [Parameter Optimization](function-analysis.md#parameter-optimization): Click the **Fit** icon on the top panel to find input conditions that satisfy output constraints.
* [Sensitivity Analysis](function-analysis.md#sensitivity-analysis): Click the **Sensitivity** icon to explore the relationship between inputs and outputs of your model.

![Run Sens Analysis](pics/diff-studio-run-sens-analysis.gif)

## Creating models

Turn on the **Edit** toggle on the top panel. Equations editor opens. Edit formulas or add new ones.
Click <i class="fas fa-sync"></i> **Refresh** or press **F5** to apply changes.

![Edit model](pics/diff-studio-edit-model.gif)

### Model components and syntax

#### Core blocks

These blocks define the basic mathematical model and are required for any model:

1. `#name`: Add a model identifier

   ```python
   #name: Problem 1
   ```

1. `#equations`: Define the system of ODEs to solve. Diff Studio supports any number of equations with single or multi-letter variable names
  
   ```python
   #equations:
     dx/dt = x + y + exp(t)
     dy/dt = x - y - cos(t)
   ```

1. `#argument`: Defines
   * independent variable
   * its initial value (`initial`)
   * final value (`final`), and
   * grid step (`step`)

   The solver calculates values at each step interval across the specified [_initial,final_] range.

   ```python
   #argument: t
     initial = 0
     final = 1
     step = 0.01
   ```

1. `#inits`: Defines initial values for functions being solved

   ```python
   #inits:
     x = 2
     y = 5
   ```

#### Comments

* `#comment`: Write a comment in any place of your model

   ```python
   #comment:
     You can provide any text here. Diff Studio ignores it.
   ```

* Place comments right in formulas using `//`

   ```python
   #equations:
     dx/dt = x + y + exp(t) // 1-st equation
     dy/dt = x - y - cos(t) // 2-nd equation
   ```

#### Model parameters

These blocks define values used in equations. Choose type based on intended use:

* `#parameters`: Generate UI controls for model exploration

   ```python
   #parameters:
     P1 = 1
     P2 = -1

   ```

* `#constants`: Use for fixed values in equations that don't require UI controls

   ```python
   #constants:
     C1 = 1
     C2 = 3
   ```

#### Auxiliary calculations

This block defines mathematical functions using `#parameters`, `#constants`,
`#argument`, and other functions. These are direct calculations (no ODEs involved). Use them to break
down complex calculations and simplify your equations.

* `#expressions`

   ```python
   #expressions:
     E1 = C1 * t + P1
     E2 = C2 * cos(2 * t) + P2
   ```

#### Advanced features

These blocks enable simulations for complex processes.

##### Cyclic processes

Use the `#loop` block for cyclic processes. Set `count` for number of cycles and use any valid mathematical expressions to modify parameters and functions. You can set new values for parameters and change values for functions.

  ```python
  #equations:
    dy/dt = -y + sin(N*t) / t

  #parameters:
    N = 1
  
  #loop:
    count = 3
    N += 2
  ```

![Multi-stage model - loop](pics/diff-studio-loop.gif)

##### Multistage processes

Use the `#update` block to construct models with multiple sequential processes (stages):

1. First stage is always defined in the `#argument` block. Add the stage name:

     ```python
     #argument: t, 1-st stage
       t0 = 0.01
       t1 = 15
       h = 0.01
     ```

1. Subsequent stages are defined in the `#update` blocks. Specify:
   1. Stage name
   1. Stage duration
   1. Parameter modifications. To define parameters, use any valid mathematical expression.

    ```python
    #update: 2-nd stage
      duration = 23
      p = p * 2  
    ```

You can add any number of `#update` blocks to create simulation stages. Each stage appears in distinct color on the line chart:

![Multi-stage model - update](pics/diff-studio-update.gif)

### User interface options

Diff Studio automatically generates the UI, but you can use the following options to improve usability:

* **Captions:**

  * Define the desired captions for the input parameters. If no caption is provided, Diff Studio uses variable name

     ```python
     #argument: t
       start = 0 {caption: Initial time}
       finish = 2 {caption: Final time}
       step = 0.01 {caption: Calculation step}
     ```

  * `#output`: Caption column headers in the solution table. If no caption is provided, Diff Studio uses a variable name

     ```python
     #output:
       t {caption: Time, h}
       A1 {caption: Central}
       A2 {caption: Peripheral}
     ```

    Use this block to set any entity from `#equations` or `#expressions` you want included in the output:

  ![Customize output](pics/diff-studio-output.gif)

* **Categories**: Group related inputs together by specifying their category

   ```python
   #parameters:
     P1 = 1 {category: Parameters}
     P2 = -1 {category: Parameters}
   ```

* **Units**: Add measurement units  

   ```python
   #inits:
     x = 2 {units: C; category: Initial values}
     y = 0 {units: C; category: Initial values}
   ```

* **Tooltips**: Provide tooltips in brackets `[ ]`:

   ```python
     P1 = 1 {category: Parameters} [P1 parameter tooltip]
   ```

* **Input ranges**: Set min/max values and step to create sliders and clickers for interactive model exploration

   ```python
   #inits:
     x = 2 {min: 0; max: 5}
     y = 0 {min: -2; max: 2; step: 0.1}

   ```

  ![Using input annotations](pics/diff-studio-input-annotations.gif)

* **Lookup tables**: The `#meta.inputs` block links model parameters to preset values in a lookup table. Upon linking, Diff Studio creates a dropdown menu to switch between parameter sets and automatically populates model inputs based on the selected preset. To add a lookup table:
    1. Create a CSV file with parameter sets and upload it to Datagrok

       |  |x |y |...|
       |--|--|--|---|
       |Set 1| 1| 2|...|
       |Set 2| 3| 4|...|

    1. Link file to model using the `#meta.inputs` block. Optionally, add a caption, category, and a tooltip:

    ```python
    #meta.inputs: table {choices: OpenFile("System:AppData/DiffStudio/inputs.csv"); caption: [UI label]; category: [Group name]} [Tooltip]
    ```

    ![table-lookups](pics/diff-studio-table-lookups.gif)

### Solver configuration

Use this syntax to define the ODE solver configuration and improve performance:

* `#meta.solver`: Defines numerical solver settings:
  * **Method**: Choose [Rosenbrock-Wanner](https://doi.org/10.1016/j.cam.2015.03.010) solver
    * The ROS34PRw method (`ros34prw`, default)
    * The ROS3PRw method (`ros3prw`)
    * The modified Rosenbrock triple (`mrt`)
  * **Performance limits**
    * `maxTimeMs`: computation time, in milliseconds (default: 5000ms)
    * `maxIterations`: iteration count for debugging

  ```python
  #meta.solver: {method: 'mrt'; maxTimeMs: 50}
  ```

* `#tolerance`: Defines numerical method precision
  
  ```python
  #tolerance: 0.00005
  ```

## Platform integration

You can convert Diff Studio models to Datagrok scripts. This allows you to:

* Access advanced platform features and create reusable components with rich UI ([learn more](compute.md)).
* Add your models to a Model Catalog.

Steps:

1. Toggle **Edit** and click the `</>` icon
1. Add metadata for catalog:
  
   ```python
   #name: Model name
   #tags: model
   #description: Brief description
   ```

1. Click **SAVE**. The script is created and can be found in **Browse** > **Platform** > **Functions** > **Scripts**. The conversion preserves all input annotations, maintaining intuitive UI controls.

## Syntax reference

Diff Studio lets you define model in a declarative form using simple syntax:

|Keyword|Specifies|Example|
|-|-|-|
|**#name**|Model name|[Basic](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/basic.ivp) template, [Robertson's](https://public.datagrok.ai/files/system.appdata/diffstudio/library/robertson.ivp) model|
|**#equations**|Ordinary differential equations ([ODEs](https://en.wikipedia.org/wiki/Ordinary_differential_equation))|[Basic](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/basic.ivp) template, [mass-action](https://public.datagrok.ai/files/system.appdata/diffstudio/library/chem-react.ivp) kinetics simulation|
|**#inits**|[Initial conditions](https://en.wikipedia.org/wiki/Initial_value_problem)|[Basic](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/basic.ivp) template, [fermentation](https://public.datagrok.ai/files/system.appdata/diffstudio/library/fermentation.ivp) modeling|
|**#argument**|The independent variable, its range, and the solution time step|[Basic](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/basic.ivp) template, [pollution](https://public.datagrok.ai/files/system.appdata/diffstudio/library/pollution.ivp) model|
|**#expressions**|Additional computations|[Advanced](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/advanced.ivp) template, [pharmacokinetics](https://public.datagrok.ai/files/system.appdata/diffstudio/library/pk.ivp) simulation|
|**#parameters**|Model parameters (Diff Studio creates UI inputs for them)|[Advanced](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/advanced.ivp) template, [chemical reactions](https://public.datagrok.ai/files/system.appdata/diffstudio/library/chem-react.ivp) modeling|
|**#constants**|Model constants|[Advanced](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/advanced.ivp) template, [bioreactor](https://public.datagrok.ai/files/system.appdata/diffstudio/library/bioreactor.ivp) model|
|**#loop**|Multiple simulation [cycles](#cyclic-processes)|[Pharmacokinetic-pharmacodynamic](https://public.datagrok.ai/files/system.appdata/diffstudio/library/pk-pd.ivp) simulation|
|**#update**|Additional modeling [stage](#multistage-processes)|[Gluconic acid](https://public.datagrok.ai/files/system.appdata/diffstudio/library/ga-production.ivp) production modeling|
|**#output**|Customized model output|[Nimotuzumab](https://public.datagrok.ai/files/system.appdata/diffstudio/library/nimotuzumab.ivp) disposition model|
|**#tolerance**|[Tolerance](https://pythonnumericalmethods.berkeley.edu/notebooks/chapter19.02-Tolerance.html) of the numerical method|[Advanced](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/advanced.ivp) template, [pollution](https://public.datagrok.ai/files/system.appdata/diffstudio/library/pollution.ivp) model|
|**#meta.inputs**|CSV file with inputs [lookup table](#user-interface-options)|[Bioreactor](https://public.datagrok.ai/files/system.appdata/diffstudio/library/bioreactor.ivp) model|
|**#meta.solver**|ODEs solver [settings](#solver-configuration)|[Pharmacokinetics](https://public.datagrok.ai/files/system.appdata/diffstudio/library/pk.ivp) simulation|
|**#comment**|Explanations, notes, remarks, etc.|[Advanced](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/advanced.ivp) template|
|**#tags**|The platform [script](#platform-integration) tags|[Extended](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/extended.ivp) template|
|**#description**|The platform [script](#platform-integration) tooltip|[Extended](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/extended.ivp) template|

To improve UI, annotate model inputs using:

|Option|Specifies|Example|
|-|-|-|
|**caption**|Input caption|[Extended](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/extended.ivp) template|
|**category**|Input category. Items belonging to the same category are grouped together in the UI|[Extended](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/extended.ivp) template|
|**units**|Input measure units|[Mass-action](https://public.datagrok.ai/files/system.appdata/diffstudio/library/chem-react.ivp) kinetics simulation|
|**min**, **max**|Input min and max values, respectively. Use them to get sliders for UI input|[Extended](https://public.datagrok.ai/files/system.appdata/diffstudio/templates/extended.ivp) template|

## See also

* [Function analysis](function-analysis.md)
* [Compute](compute.md)
* [Function annotations](../datagrok/concepts/functions/func-params-annotation.md)
* [Tutorial](https://public.datagrok.ai/apps/tutorials/Tutorials/Scientificcomputing/Differentialequations)
* Videos:
  
  [![UGM](pics/diff-studio-ugm.png "Open on Youtube")](https://www.youtube.com/watch?v=RS163zKe7s8&t=160s)
