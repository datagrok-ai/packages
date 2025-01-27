# Diff Studio Tools

A lightweight TypeScript library for solving initial value problem ([IVP](https://en.wikipedia.org/wiki/Initial_value_problem)) for ordinary differential equations ([ODEs](https://en.wikipedia.org/wiki/Ordinary_differential_equation)) using numerical methods. This library focuses on solving [stiff equations](https://en.wikipedia.org/wiki/Stiff_equation).

## Features

* Solving both [stiff](https://en.wikipedia.org/wiki/Stiff_equation) and non-stiff equations
* Fast computations
* A set of Rosenbrock–Wanner-type methods:
  * The modified Rosenbrock triple ([MRT](https://doi.org/10.1137/S1064827594276424))
  * The [ROS3PRw](https://doi.org/10.1016/j.cam.2015.03.010) method
  * The [ROS34PRw](https://doi.org/10.1016/j.cam.2015.03.010) method
* Scripting:
  * declarative specification of models
  * auto-generated JavaScript code
* Integration with the [Datagrok](https://datagrok.ai) platform
* Zero dependencies

## Installation

```bash
npm i @datagrok/diff-studio-tools
```

## Solving

### General

To find numerical solution of a problem:

$$\frac{dy}{dt} = f(t, y)$$
$$y(t_{0}) = y_0$$

on the segment $[t_0, t_1]$ with the step $h$:

1. Import `ODEs` and a desired numerical method:

   * `mrt` - the [MRT](https://doi.org/10.1137/S1064827594276424) method
   * `ros3prw`- the [ROS3PRw](https://doi.org/10.1016/j.cam.2015.03.010) method
   * `ros34prw` - the [ROS34PRw](https://doi.org/10.1016/j.cam.2015.03.010) method

2. Specify `ODEs` object that defines a problem:

   * `name` - name of a model
   * `arg` - independent variable specification. This is in object with fields:
     * `name` - name of the argument, $t$
     * `start` - initial value of the argument, $t_0$
     * `finish` - final value of the argument, $t_1$
     * `step` - solution grid step, $h$
   * `initial` - initial values, $y_0$
   * `func` - right-hand side of the system, $f(t, y)$. This is a function `(t: number, y: Float64Array, output: Float64Array) => void`:
     * `t` - value of independent variable $t$
     * `y` - values of $y$
     * `output` - output values of $f(t, y)$

   * `tolerance` - numerical tolerance
   * `solutionColNames` - names of solutions, i.e. names of the vector $y$ elements

3. Call numerical method. It returns `Float64Array`-arrays with values of an argument and approximate solutions.

Diff Studio Tools are designed to provide fast computations. Check [performance](#performance) for the details.

### Example

Consider the following problem:

$$\begin{cases}
\frac{dx}{dt} = x + y - t \\
\frac{dy}{dt} = x y + t \\
x(0) = 1 \\
y(0) = -1
\end{cases}$$

To solve it on the segment $[0, 2]$ with the step $0.01$ using the [MRT](https://doi.org/10.1137/S1064827594276424) method with the tolerance $10^{-7}$, we start with imports:

```typescript
import {ODEs, mrt} from '@datagrok-ai/diff-studio-tools';
```

Next, we create

```typescript
const task: ODEs = {
    name: 'Example', // name of your model
    arg: {
        name: 't',  // name of the argument
        start: 0,   // initial value of the argument
        finish: 2,  // final value of the argument
        step: 0.01, // solution grid step
    },
    initial: [1, -1], // initial values
    func: (t: number, y: Float64Array, output: Float64Array) => { // right-hand side of the system
      output[0] = y[0] + y[1] - t; // 1-st equation
      output[1] = y[0] * y[1] + t; // 2-nd equation
    },
    tolerance: 1e-7, // tolerance
    solutionColNames: ['x', 'y'], // names of solution functions
};
```

Finally, we call the specified numerical method to solve `task`:

```typescript
const solution = mrt(task);
```

Currently, `solution` contains:

* `solution[0]` - values of $t$, i.e. the range $0..2$ with the step $0.01$
* `solution[1]` - values of $x(t)$ at the points of this range
* `solution[2]` - values of $y(t)$ at the points of the same range

Find this example in [basic-use.ts](./src/examples/basic-use.ts).

## Performance

The following [classic problems](https://archimede.uniba.it/~testset/testsetivpsolvers/?page_id=26#ODE) are used to evaluate efficiency of Diff Studio methods:

* [Rober](https://archimede.uniba.it/~testset/report/rober.pdf)
  * a stiff system of 3 nonlinear ODEs
  * describes the kinetics of an autocatalytic reaction given by Robertson
  * [robertson.ts](./src/examples/robertson.ts)
* [HIRES](https://archimede.uniba.it/~testset/report/hires.pdf)
  * a stiff system of 8 non-linear equations
  * explains the `High Irradiance Responses' (HIRES) of photomorphogenesis on the basis of phytochrome, by means of a chemical reaction   involving eight reactants
  * [hires.ts](./src/examples/hires.ts)
* [VDPOL](https://archimede.uniba.it/~testset/report/vdpol.pdf)
  * a system of 2 ODEs proposed by B. van der Pol
  * describes the behaviour of nonlinear vacuum tube circuits
  * [vdpol.ts](./src/examples/vdpol.ts)
* [OREGO](https://archimede.uniba.it/~testset/report/orego.pdf)
  * a stiff system of 3 non-linear equations
  * simulates Belousov-Zhabotinskii reaction
  * [orego.ts](./src/examples/orego.ts)
* [E5](https://archimede.uniba.it/~testset/report/e5.pdf)
  * a stiff system of 4 non-linear ODEs
  * represents a chemical pyrolysis model
  * [e5.ts](./src/examples/e5.ts)
* [Pollution](https://archimede.uniba.it/~testset/report/pollu.pdf)
  * a stiff system of 20 non-linear equations
  * describes a chemical reaction part of the air pollution model designed at The Dutch National Institute of Public Health and Environmental Protection
  * [pollution.ts](./src/examples/pollution.ts)

The MRT, ROS3PRw and ROS34PRw methods demonstrate the following time performance (AMD Ryzen 5 5600H 3.30 GHz CPU):

|Problem|Segment|Points|Tolerance|MRT, ms|ROS3PRw, ms|ROS34PRw, ms|
|-|-|-|-|-|-|-|
|[Rober](https://archimede.uniba.it/~testset/report/rober.pdf)|[0, 10E+11]|40K|1E-7|103|446|285|
|[HIRES](https://archimede.uniba.it/~testset/report/hires.pdf)|[0, 321.8122]|32K|1E-10|222|362|215|
|[VDPOL](https://archimede.uniba.it/~testset/report/vdpol.pdf)|[0, 2000]|20K|1E-12|963|1576|760|
|[OREGO](https://archimede.uniba.it/~testset/report/orego.pdf)|[0, 360]|36K|1E-8|381|483|199|
|[E5](https://archimede.uniba.it/~testset/report/e5.pdf)|[0, 10E+13]|40K|1E-6|14|17|8|
|[Pollution](https://archimede.uniba.it/~testset/report/pollu.pdf)|[0, 60]|30K|1E-6|36|50|23|

Run [check-methods.ts](./src/examples/check-methods.ts) to check results.

## Scripting

The library provides tools for declarative specifying models defined by IVPs. This feature enables a development of "no-code" modeling tools seamlessly integrated with the [Datagrok](https://datagrok.ai) platform.

### Model components and syntax

Diff Studio **model** has a simple declarative syntax.

#### Core blocks

These blocks define the basic mathematical model and are required for any model:

1. `#name`: Add a model identifier

   ```python
   #name: Problem
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
### JS-code generation

To transform Diff Studio model to JavaScript code with an appropriate specification of `ODEs` object, follow the steps:

1. Import the parsing and code generating tools:

```typescript
import {getIVP, getJScode} from '@datagrok-ai/diff-studio-tools';
```

2. Define a string with a model specification, use Diff Studio [model syntax](#model-components-and-syntax):

```typescript
const model = `
#name: Example
#equations:
  dx/dt = x + y - cos(t)
  dy/dt = x - y + sin(t)
...
`;
```

3. Parse formulas:

```typescript
const ivp = getIVP(model);
```

The method `getIVP` parses formulas and returns `IVP` object specifying a model.

4. Generate JS-code:

```typescript
const lines = getJScode(ivp);
```

The method `getJScode` transforms `IVP` object to JavaScript code. It returns an array of strings with this code.

Find this example in [scripting.ts](./src/examples/scripting.ts).

## Integration with Datagrok

[Datagrok](https://datagrok.ai) is a platform enabling powerful scientific computing capabilities. It provides next-generation environment for leveraging interactive visualizations, data access, machine learning, and enterprise features to enable developing, publishing, discovering, and using scientific applications.

The library is seamlessly integrated to Datagrok via the [Diff Studio](https://github.com/datagrok-ai/public/tree/master/packages/DiffStudio) package. It provides

* Numerical solving IVPs directly in the browser
* "No-code" models development
* Solving both stiff and non-stiff systems of ODEs
* Automatic generation of user interfaces
* Interactive visualization and model exploration
* Sensitivity analysis and parameters optimization
* Sharing models and computational results

Run the Diff Studio [app](https://public.datagrok.ai/apps/DiffStudio) and check interactive modeling.

Learn more

 * Diff Studio application [docs](https://datagrok.ai/help/compute/diff-studio)
 * Diff Studio example [models](https://datagrok.ai/help/compute/models)
 * [Parameters optimization](https://datagrok.ai/help/compute/function-analysis#parameter-optimization)
 * [Sensitivity analysis](https://datagrok.ai/help/compute/function-analysis#sensitivity-analysis)
