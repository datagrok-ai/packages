# Diff Studio Utils

A lightweight TypeScript library for solving initial value problem ([IVP](https://en.wikipedia.org/wiki/Initial_value_problem)) for ordinary differential equations ([ODEs](https://en.wikipedia.org/wiki/Ordinary_differential_equation)) using numerical methods. This library focuses on solving [stiff equations](https://en.wikipedia.org/wiki/Stiff_equation).

## Features

* A set of Rosenbrock–Wanner-type methods:
  * The modified Rosenbrock triple ([MRT](https://doi.org/10.1137/S1064827594276424))
  * The [ROS3PRw](https://doi.org/10.1016/j.cam.2015.03.010) method
  * The [ROS34PRw](https://doi.org/10.1016/j.cam.2015.03.010) method
* Scripting !! TODO: add description
* Zero dependencies

## Installation

```bash
npm install diff-studio-utils !!!TODO: modify
```

## Solving IVP

To find numerical solution of a problem:

$$\frac{dy}{dt} = f(t, y)$$
$$y(t_{0}) = y_0$$

on the segment $[t_0, t_1]$ with the step $h$, start with imports:

```typescript
import {ODEs, mrt} from '@datagrok-ai/diff-studio-tools';
```

Here, we import `mrt` to apply the MRT method. Import `ros3prw` or `ros34prw` to use the ROS3PRw or ROS34PRw methods, respectively.

Set `ODEs` object that specifies a given problem.

For example, to solve

$$\begin{cases}
\frac{dx}{dt} = x + y - t \\
\frac{dy}{dt} = x y + t \\
x(0) = 1 \\
y(0) = -1
\end{cases}$$

on $[0, 2]$ with the step $0.01$ and the tolerance $10^{-7}$, use the following declaration:

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

Call the specified numerical method to solve `task`:

```typescript
const solution = mrt(task);
```

It returns `Float64Array`-arrays with values of an argument and approximate solutions.

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

TO ADD
