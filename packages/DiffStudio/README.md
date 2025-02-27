# Diff Studio

Diff Studio is a [package](https://datagrok.ai/help/develop/#packages) for the [Datagrok](https://datagrok.ai) platform. It provides in-browser tools for solving [initial value problem](https://en.wikipedia.org/wiki/Initial_value_problem) for systems of ordinary differential equations (ODE) and its interactive exploration.

* Go to **Apps > Compute** and run **Diff Studio**
* Enter formulas or modify template
* Run computations and explore your model

The solver takes a set of the differential equations in a declarative form, and creates a UI that solves the equations, visualizes the results, and lets you change parameters on the fly.

## Quick start

Datagrok provides intuitive tools for the rapid solving ODEs.

* Run the solver:
  * Go to **Apps > Compute**
  * Run **Diff Studio**
  * Modify inputs and explore computations
* Modify equations:
  * Turn on the **Edit** toggle on the top panel
  * Edit formulas or add new ones
  * Click <i class="fas fa-sync"></i> **Refresh** or press **F5** to apply changes
* Use templates:
  * Click <i class="fas fa-folder-open d4-combo-popup" style="min-width: 0px; cursor: default"></i> **Open** icon on the top panel
  * Go to **Templates** and select one of them
  * Once you have completed your model, turn off the **Edit** toggle  
* Save model:
  * Click the **Save** button on the top panel to save model to your platform files (**Browse > Files > My files**)
  * Click <i class="fas fa-arrow-to-bottom"></i> **Download** to save model to a local file. Find the *ivp*-file in Downloads. You can open and edit this file using any text editor
* Drag-n-drop:
  * Drag *ivp*-file with equations right into the browser
* Load model:
  * Click <i class="fas fa-folder-open d4-combo-popup" style="min-width: 0px; cursor: default"></i> **Open** on the top panel
  * Select **Import...** to load model from local file
  * **My Models** contains models from your platform files
  * Find last called models in **Recent**
  * Explore examples in **Library**. They cover all possibilities of Diff Studio
* Analyze model
  * Turn off the **Edit** toggle on the top panel
  * Click the **Fit** icon to [optimize inputs](https://datagrok.ai/help/compute/function-analysis#parameter-optimization)
  * Click the **Sensitivity** icon to run [sensitivity analysis](https://datagrok.ai/help/compute/function-analysis#sensitivity-analysis)

## Create model from template

Start from one of these templates:

| Template | Features|
|----------|---------|
| `Basic`    | the simplest model|
| `Advanced` | extra math features, including *expressions*, *constants*, *parameters* and *tolerance* specification|
| `Extended` | the *annotating* feature for extended UI generation                 |

## Use cases

The solver has built-in use cases. Get access to them via the context menu. You can use them as a template.

* `Chem reactions`
  * simulates [mass-action kinetics](https://en.wikipedia.org/wiki/Law_of_mass_action)
  * illustrates annotation of inputs
* `Robertson's model`
  * Robertson's chemical reaction model
  * [stiff equations](https://en.wikipedia.org/wiki/Stiff_equation) example
  * shows how Datagrok solves complicated ODEs
* `Fermentation`
  * models the kinetics of the biochemical reactions in [fermentation](https://en.wikipedia.org/wiki/Fermentation)
  * shows the usage of `min` and `max` in inputs annotation
* `PK`
  * [pharmacokinetic](https://en.wikipedia.org/wiki/Pharmacokinetics) (PK) simulation
  * demonstrates the usage of the `meta.solver` feature for numerical solver management
* `PK-PD`
  * simulates pharmacokinetics (PK), pharmacodynamics (PD), and their [relationship](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7348046)
  * illustrates the usage of the `loop` feature for dosing specification
* `Acid production`
  * models gluconic acid [production](https://oatao.univ-toulouse.fr/9919/1/Elqotbi_9919.pdf) by Aspergillus niger
  * shows the usage of the `update` feature for multi-stage simulation
* `Nimotuzumab`
  * models population pharmacokinetic for [nimotuzumab](https://www.mdpi.com/1999-4923/12/12/1147)
  * demonstrates the `output` feature
* `Bioreactor`
  * simulates the bioreactor [processes](https://doi.org/10.1074/jbc.RA117.000303)
  * shows how to use `meta.inputs` to specify a table with pre-defined model inputs
* `Pollution`
  * describes a chemical reaction part of the air pollution [model](https://archimede.uniba.it/~testset/report/pollu.pdf) consisting of 25 reaction and 20 reacting compounds
  * demonstrates the simulation of processes described by a stiff system of ODEs

Datagrok's ODEs suite has tools for solving both [stiff](https://en.wikipedia.org/wiki/Stiff_equation) and non-stiff equations. It provides a [numerical solution](https://en.wikipedia.org/wiki/Numerical_methods_for_ordinary_differential_equations).

## Model structure

A model defines [initial value problem](https://en.wikipedia.org/wiki/Initial_value_problem). It contains *name*, *differential equations*, *initial values* and *argument* specifications:

```python
#name: My ODEs
#equations:
  dx/dt = x + y + exp(t)
  dy/dt = x - y - cos(t)
#argument: t
  initial = 0
  final = 1
  step = 0.01
#inits:
  x = 2
  y = 5
```

Use the following sections to specify various problems:

|Control block|Features|
|-------------|--------|
|```#name```|Defines a name|
|```#equations```|Differential equation specification|
|```#argument```|Independent variable specification|
|```#inits```|Initial values specification|
|```#constants```|Constants specification|
|```#parameters```|Parameters specification|
|```#expressions```|Defines auxiliary compuations|
|```#output```|Defines output columns and their captions|
|```#tags```|Specifies tags (`model`, `app`, etc.)|
|```#description```|Defines description of the model|
|```#comment```|Specifies comments block|
|```#meta.solver```|Defines the solver settings|
|```#meta.inputs```|Path to the table with pre-defined model inputs|

## Annotations

The **Run** tab of Diff Studio provides UI for interactive model exploration. Use [annotations](https://datagrok.ai/help/datagrok/concepts/functions/func-params-annotation#parameter-types-and-options) to improve usability. Append them, when defining *parameters*, *initial values* and *argument*.

Group inputs by specifying their `category`:

```python
#parameters:
  P1 = 1 {category: Parameters}
  P2 = -1 {category: Parameters}
```

Define the desired `caption`:

```python
#argument: t
  start = 0 {caption: Initial; category: Time}
  finish = 2 {caption: Final; category: Time}
  step = 0.01 {caption: Step; category: Time}
```

Specify `min`, `max` and `step` values to get sliders and clickers for the rapid model exploration:

```python
#inits:
  x = 2 {min: 0; max: 5}
  y = 0 {min: -2; max: 2; step: 0.1}
```

Provide hints in brackets `[ ]`:

```python
  P1 = 1 {category: Parameters} [P1 parameter tooltip]
```

## Solver management

You can manage the solver of ODEs. Specify its settings in the `#meta.solver`-line:

* the numerical method (`method`)
* the maximum number of iterations (`maxIterations`)
* the maximum computation time (`maxTimeMs`)

Diff Studio implements the following [Rosenbrock–Wanner](https://doi.org/10.1016/j.cam.2015.03.010) methods for solving ODEs:

|Method|Value|
|-------------|--------|
|the modified Rosenbrock triple (MRT)|`'mrt'`|
|the ROS3PRw method|`'ros3prw'`|
|the ROS34PRw method|`'ros34prw'`|

By default, Diff Studio uses ROS34PRw. You may specify the method as follows:

```python
#meta.solver: {method: 'mrt'}
```

To check correctness of formulas, set the maximum number of iterations:

```python
#meta.solver: {method: 'mrt'; maxIterations: 1}
```

Diff Studio alerts you if computations take too long. The default time limit is 5 seconds. To customize it, set the maximum computation time (in milliseconds):

```python
#meta.solver: {method: 'mrt'; maxTimeMs: 50}
```

## Lookup tables

Lookup tables are pre-defined sets of model input values. They're organized as follows:

||x|y|...|
|-----|-----|-----|---|
|Set 1|1|2|...|
|Set 2|3|4|...|

To use a lookup table:

* Create a CSV file with your table and add it to your project
* Add the `#meta.inputs`-line to your model and specify a CSV file with a lookup table
* To improve usability, define `caption`, `category` and a tooltip:

```python
#meta.inputs: table {choices: OpenFile("System:AppData/DiffStudio/inputs.csv"); caption: Mode; category: Settings} [Hint]
```

## Performance

Diff Studio solvers ensure fast **in-browser** intergration of ODEs. The following [classic problems](https://archimede.uniba.it/~testset/testsetivpsolvers/?page_id=26#ODE) illustrate their efficiency:

* [Rober](https://archimede.uniba.it/~testset/report/rober.pdf)
  * a stiff system of 3 nonlinear ODEs
  * describes the kinetics of an autocatalytic reaction given by Robertson
* [HIRES](https://archimede.uniba.it/~testset/report/hires.pdf)
  * a stiff system of 8 non-linear equations
  * explains the `High Irradiance Responses' (HIRES) of photomorphogenesis on the basis of phytochrome, by means of a chemical reaction involving eight reactants
* [VDPOL](https://archimede.uniba.it/~testset/report/vdpol.pdf)
  * a system of 2 ODEs proposed by B. van der Pol
  * describes the behaviour of nonlinear vacuum tube circuits
* [OREGO](https://archimede.uniba.it/~testset/report/orego.pdf)
  * a stiff system of 3 non-linear equations
  * simulates Belousov-Zhabotinskii reaction
* [E5](https://archimede.uniba.it/~testset/report/e5.pdf)
  * a stiff system of 4 non-linear ODEs
  * represents a chemical pyrolysis model
* [Pollution](https://archimede.uniba.it/~testset/report/pollu.pdf)
  * a stiff system of 20 non-linear equations
  * describes a chemical reaction part of the air pollution model designed at The Dutch National Institute of Public Health and Environmental Protection

The MRT, ROS3PRw and ROS34PRw methods demonstrate the following time performance (AMD Ryzen 5 5600H 3.30 GHz CPU):

|Problem|Segment|Points|Tolerance|MRT, ms|ROS3PRw, ms|ROS34PRw, ms|
|-|-|-|-|-|-|-|
|[Rober](https://archimede.uniba.it/~testset/report/rober.pdf)|[0, 10E+11]|40K|1E-7|103|446|285|
|[HIRES](https://archimede.uniba.it/~testset/report/hires.pdf)|[0, 321.8122]|32K|1E-10|222|362|215|
|[VDPOL](https://archimede.uniba.it/~testset/report/vdpol.pdf)|[0, 2000]|20K|1E-12|963|1576|760|
|[OREGO](https://archimede.uniba.it/~testset/report/orego.pdf)|[0, 360]|36K|1E-8|381|483|199|
|[E5](https://archimede.uniba.it/~testset/report/e5.pdf)|[0, 10E+13]|40K|1E-6|14|17|8|
|[Pollution](https://archimede.uniba.it/~testset/report/pollu.pdf)|[0, 60]|30K|1E-6|36|50|23|

This table compares the efficiency of the methods when solving each test problem on a fixed segment and providing solutions at a specified number of points with a given tolerance.

## Export to JavaScript script

Once you are satisfied with the result, you can convert your model to a Datagrok application. To do so:

1. Turn on the **Edit** toggle on the top panel
2. Click **</>** icon. Script editor opens in a new view
3. Click **SAVE** button
4. Script is created, and can be found in the "Scripts" section of the platform

Improve usability. Use `#tags: model` to add your model to `Model Catalog`. Provide a description in the `#description`-line:

```python
#name: Bioreaction
#tags: model
#description: Complex bioreaction simulation
```

Apply [scripting](https://datagrok.ai/help/compute/scripting) tools to get:

* non-elementary and special functions' use
* Datagrok packages' functions call

Find more features in Diff Studio [docs](https://datagrok.ai/help/compute/diff-studio).

See also

* [Sensitivity analysis](https://datagrok.ai/help/compute/function-analysis#sensitivity-analysis)
* [Parameter optimization](https://datagrok.ai/help/compute/function-analysis#parameter-optimization)
* [Scripting](https://datagrok.ai/help/compute/scripting)
