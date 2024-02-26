---
title: "Diff Studio"
---

**Datagrok Diff Studio** solves [ordinary differential equations](https://en.wikipedia.org/wiki/Ordinary_differential_equation) (ODEs) right within your web browser, and provides interactive exploration of their solution.

Differential equations play a crucial role in modeling complex systems in diverse fields, from chemical engineering and drug design to environmental studies and financial modeling.

Using **Diff Studio**, you can create mathematical models, build interactive [visualizations](../visualize/viewers),
develop platform [applications](../develop/how-to/build-an-app.md) and combine them with other features of Datagrok.

**Key benefits and features**:

* **Enhanced mathematical modeling:** Diff Studio can model and analyse complex multi-equation systems.
* **Ease of use:** Diff Studio intuitive interface makes it accessible
  and useful to both beginners and experts in mathematical modeling.
* **Rapid design:** The collection of built-in model templates and examples speeds up model design.
* **Streamlined integration:** In a single click, you can convert formulas to the platform [script](scripting.md),
  implementing no-code development.
* **Broad application scope:** Diff Studio usage ranges from [pharmacokinetics](https://en.wikipedia.org/wiki/Pharmacokinetics)
  and [hybrid antibody formation](https://doi.org/10.1073/pnas.1220145110) simulation to [queues](https://en.wikipedia.org/wiki/Queueing_theory) modeling.

## Using Diff Studio

### Running Diff Studio

To run **Diff Studio**:

* Go to **Apps** and run **Diff Studio**. You will see the default code template with one simple differential equation.
* Go to **Run** tab and you will get UI for interactive model exploration.
* Go to **Model** tab, edit formulas or add new ones.
* Click **F5** or go to **Run** tab to re-run calculations and see updated data.

![Run Diff Studio](pics/DiffStudio-run.gif)

### Loading and saving data

* **To save formulas** in a local file, press the <i class="fas fa-save"></i> **Save** icon on the ribbon, and find the *ivp*-file in Downloads. You can open and edit this file using any text editor.
* **To load formulas** from a local file, press the <i class="fas fa-folder-open"></i> **Load...** on the ribbon, choose **From file...**
  option and choose a local file to upload.
* **Drag-n-drop** your *ivp*-file to Datagrok. Diff Studio will open it and load formulas. You can open *ivp*-files stored in the platform.

## Creating a custom differential equation model

### Basic model

A minimal model defining and solving ordinary differential equations contains
*name*, *differential equations*, *initial values* and *argument* specifications.

Use the `#name` keyword to define the name of your model:

```python
#name: Problem1
```

Place differential equations in the `#equations` block. You can add as many equations as you want.
Diff Studio automatically recognizes all identifiers that you use.
You can use one-letter or multi-letter identifiers.

```python
#equations:
  dx/dt = x + y + exp(t)
  dy/dt = x - y - cos(t)
```

Define the argument, its *initial* value, *final* value, and grid *step* in the `#argument` block.
Datagrok provides a numerical solution within the range *[initial, final]* with the specified grid *step*.

```python
#argument: t
  initial = 0
  final = 1
  step = 0.01
```

Define initial values of the functions in the `#inits` block:

```python
#inits:
  x = 2
  y = 5
```

### Advanced model

Use the advanced features to improve your model.

Use `#comment` block to write a comment in any place of your model

```python
#comment:
  You can provide any text here. Diff Studio just ignores it.
```

Place comments right in formulas using `//`

```python
#equations:
  dx/dt = x + y + exp(t) // 1-st equation
  dy/dt = x - y - cos(t) // 2-nd equation
```

Specify constants in the `#constants` block and parameters in the `#parameters` block.

Diff Studio treats `constants` and `parameters` exactly the same way.
However, when you [export equations](#platform-script-generation) to the platform script,
Diff Studio creates input UI only for `parameters` and leave `constants` hardcoded inside the script.

```python
#constants:
  C1 = 1
  C2 = 3

#parameters:
  P1 = 1
  P2 = -1
```

Define auxiliary computations in the `#expressions` block.
The **expression** is any mathematical function containing constants, parameters, argument, and other functions.
The only difference is that `expressions` functions are defined directly
and don't require solving of differential equations.
You can use expressions to separate part of the calculations and simplify your differential equations.

```python
#expressions:
  E1 = C1 * t + P1
  E2 = C2 * cos(2 * t) + P2
```

To customize the computation output, select columns and their captions in the `output` block:

```python
#output:
  t {caption: Time, h}
  A1 {caption: Central}
  A2 {caption: Periferal}
```

![Customize output](pics/DiffStudio-output.gif)

Set [tolerance](https://pythonnumericalmethods.berkeley.edu/notebooks/chapter19.02-Tolerance.html) of the numerical method in the `#tolerance`-line:

```python
#tolerance: 0.00005
```

### Cyclic process simulation

Datagrok provides a special capabilities for modeling cyclic processes and phenomena.

Use the `#loop` feature to specify several modeling cycles.
Define the number of repetitions in the mandatory `count` variable and
use any mathematical expression to modify functions and parameters.
You can set new values for parameters and change values for functions.

```python
#equations:
  dy/dt = -y + sin(N*t) / t

#parameters:
  N = 1
  
#loop:
  count = 3
  N += 2
```

![Multi-stage model - loop](pics/DiffStudio-loop.gif)

### Multi-stage model

The multi-stage model is a model where parameters and function values can vary for different
ranges of argument values.

Add name of the first stage in the `#argument` block:

```python
#argument: t, 1-st stage
  t0 = 0.01
  t1 = 15
  h = 0.01
```

Add the `#update` block. Input name of the stage right after the colon. Set the duration of the new modeling stage in the next line using
the mandatory `duration` variable. Add lines with model inputs updates. Inside you can use any valid mathematical expression to modify functions and parameters.

```python
#update: 2-nd stage
  duration = 23
  p = p * 2
```

You can add any number of `update` blocks. Simulation stages are marked with a color:

![Multi-stage model - update](pics/DiffStudio-update.gif)

## Usability improvements

For all Diff Studio parameters, you can add annotations described in
[functional annotations](../datagrok/concepts/functions/func-params-annotation.md).
When you convert your model into the Datagrok script,
Diff Studio converts it to the script input annotations,
allowing Datagrok to automatically create rich and self-explaining UI.

Define the desired captions for the input parameters.
If no caption is provided, Datagrok will use variable name.

```python
#argument: t
  start = 0 {caption: Initial time}
  finish = 2 {caption: Final time}
  step = 0.01 {caption: Calculation step}
```

Group inputs by specifying their `category`:

```python
#parameters:
  P1 = 1 {category: Parameters}
  P2 = -1 {category: Parameters}
```

Add `units`:

```python
#inits:
  x = 2 {units: C; category: Initial values}
  y = 0 {units: C; category: Initial values}
```

Provide tooltips in brackets `[ ]`:

```python
  P1 = 1 {category: Parameters} [P1 parameter tooltip]
```

Specify `min`, `max` and `step` values to get sliders and clickers for the rapid model exploration:

```python
#inits:
  x = 2 {min: 0; max: 5}
  y = 0 {min: -2; max: 2; step: 0.1}
```

![Using input annotations](pics/DiffStudio-input-annotations.gif)

## Loading templates and examples

To load a template, press the <i class="fas fa-folder-open"></i> **Load...** on the ribbon,
select **Templates** and choose one of the following templates:

| Template   | Features                                                                                    |
|------------|---------------------------------------------------------------------------------------------|
| `Basic`    | Minimum project with one differential equation                                              |
| `Advanced` | Extra math features: *expressions*, *constants*, *parameters* and *tolerance* specification |
| `Extended` | The *annotating* feature for extended UI generation                                         |

To load an example, press the <i class="fas fa-folder-open"></i> **Load...** on the ribbon,
select **Examples** and choose a one.

## Examples

Diff Studio has built-in examples. They cover all Diff Studio capabilities. Get access to them
via the <i class="fas fa-folder-open"></i> **Load...** button on the ribbon and use as a template.

### Chem reactions

The `Chem react` example simulates deterministic [mass-action kinetics](https://en.wikipedia.org/wiki/Law_of_mass_action) given in the network

![add-to-workspace](pics/DiffStudio-chem-react-network.png)

This example illustrates annotation of model inputs.

### Robertson model

Robertson’s chemical reaction model is a well-known example of [stiff equations](https://en.wikipedia.org/wiki/Stiff_equation). It describes the process

![add-to-workspace](pics/DiffStudio-robertson-network.png)

Numerical solution of stiff problems is a complicated task. Diff Studio provides solution of both stiff and non-stiff equations.

### Fermentation

The `Fermentation` example illustrates the kinetics of the biochemical reactions in [fermentation](https://en.wikipedia.org/wiki/Fermentation).

![add-to-workspace](pics/DiffStudio-fermentation.gif)

### PK-PD

PK-PD modeling simulates pharmacokinetics (PK), pharmacodynamics (PD), and their [relationship](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7348046). It is used in drug discovery and development. The `PK-PD` example illustrates the usage of the `loop` feature for dosing specification

![add-to-workspace](pics/DiffStudio-pk-pd.gif)

### Acid production

`Acid production` models gluconic acid [production](https://oatao.univ-toulouse.fr/9919/1/Elqotbi_9919.pdf) by Aspergillus niger. This example shows the usage of the `update` feature for multi-stage simulation

![add-to-workspace](pics/DiffStudio-acid-production.gif)

### Nimotuzumab

The `Nimotuzumab` example simulates population pharmacokinetic for [nimotuzumab](https://www.mdpi.com/1999-4923/12/12/1147). It demonstrates the `output` feature

![add-to-workspace](pics/DiffStudio-nimotuzumab.gif)

Datagrok's ODEs suite has tools for solving both stiff and non-stiff equations. Combine Diff Studio
with [viewers](../visualize/viewers/viewers.md) and [compute](compute.md) tools to explore complex models.

## Platform script generation

You can convert any Diff Studio project to the Datagrok script:

* Press the **JS** button on the top panel
* Press the **SAVE** button to save generated script

Find the created Javascript script in the platform `Scripts`.

Use `#tags: model` to add your model to the `Model Catalog`.
Provide a description in the `#description` line:

```python
#name: Bioreaction
#tags: model
#description: Complex bioreaction simulation
```

The export feature provides an extension of your project with [scripting](scripting.md) tools. Apply it to get:

* non-elementary and special functions' use
* Datagrok packages' functions call

See also

* [Numerical methods for ODEs](https://en.wikipedia.org/wiki/Numerical_methods_for_ordinary_differential_equations)
* [Stiff equations](https://en.wikipedia.org/wiki/Stiff_equation)
