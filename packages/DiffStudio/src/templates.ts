// Template models

/** Basic template illustrating the simplest features */
const TEMPLATE_BASIC = `#name: Template 
#equations:
  dy/dt = -y + sin(t) / t

#argument: t
  initial = 0.01 {min: 0.01; max: 10}
    final = 15   {min: 15; max: 150}
     step = 0.01 {min: 0.001; max: 0.1}

#inits:  
  y = 0 {min: 0; max: 9}`;

/** Advanced template illustrating extended features */
const TEMPLATE_ADVANCED = `#name: Advanced
#comment:
  This is an advanced template. Modify it. Use multi-line formulas if needed.
  Add new equations, expressions, constants & parameters. Edit these comment lines if required.
#equations:
  dx/dt = E1 * y + sin(t)

  dy/dt = E2 * x - pow(t, 5)

#expressions:
  E1 = C1 * exp(-t) + P1
  E2 = C2 * cos(2 * t) + P2

#argument: t
  start = 0
  finish = 10 {min: 10; max: 100}
  step = 0.01

#inits:
  x = 2
  y = 0

#constants:
  C1 = 1
  C2 = 3

#parameters:
  P1 = 1
  P2 = -1

#tolerance: 5e-5`;

/** Extended template illustrating extended features: the use of annotations */
const TEMPLATE_EXTENDED = `#name: Extended
#tags: model
#description: 2D ordinary differential equations system sample
#comment:
  This is an extended template. It has additional scripting annotations.

#equations:
  dx/dt = E1 * y + sin(t)
  dy/dt = E2 * x - pow(t, 5)

#expressions:
  E1 = C1 * exp(-t) + P1
  E2 = C2 * cos(2 * t) + P2

#constants:
  C1 = 1
  C2 = 3

#parameters:
  P1 = 1 {category: Parameters; min: 1; max: 10} [P1 parameter]
  P2 = -1 {category: Parameters; min: -10; max: -1} [P2 parameter]

#inits:
  x = 2 {category: Initial values; min: 0; max: 5} [Initial value of x]
  y = 0 {category: Initial values; min: -2; max: 2} [Initial value of y]

#argument: t
  start = 0 {caption: Initial; category: Time; min: 0; max: 10} [Initial time of simulation]
  finish = 10 {caption: Final; category: Time; min: 10; max: 20} [Final time of simulation]
  step = 0.01 {caption: Step; category: Time; min: 0.01; max: 0.1; step: 0.001} [Time step of simulation]

#tolerance: 5e-5`;

/** Initial value problem templates */
export enum TEMPLATES {
  EMPTY = '',
  BASIC = TEMPLATE_BASIC,
  ADVANCED = TEMPLATE_ADVANCED,
  EXTENDED = TEMPLATE_EXTENDED,
};

/** Template for the Demo app */
export const DEMO_TEMPLATE = `#name: My model
#equations:
  dx/dt = y * cos(p * t) + sin(t)
  dy/dt = x * sin(q * t) - exp(-t)

#argument: t
  initial = 0 {min: 0; max: 3}
  final = 8 {min: 4; max: 20}
  step = 0.01 {min: 0.01; max: 0.1}

#inits:
  x = 0 {min: 0; max: 5}
  y = 1 {min: 1; max: 7}

#parameters:
  p = -2 {min: -2; max: 2}
  q = -1 {min: -1; max: 1}`;

/** Model for testing JS code use & expressions in the output */
export const ENERGY_N_CONTROL = `#name: Energy-n-Control
#tags: model
#description: The energy-n-control demo model
#comment:
  This is an artificial example. It illustrates the use of the Math module 
  and creating custom functions using JavaScript.

#equations:
  dx/dt = E1 * y * weight
  dy/dt = E2 * x * weight

#expressions:
  E1 = P2 * exp(-t)
  E2 = P2 * cos(t)
  weight = sin(PI * P1)

  // this makes further code shorter 
  ceil = Math.ceil

  // simple if-then-else custom function
  func1 = (p, t) => (p < 8) ? ceil(t) : ceil(t**2 / 20)

  // another custom function using the previous one  
  func2 = (p, t) => (p < 5) ? ceil(exp(-t) * 10) : func1(p, t);

  // usage of custom function
  control = (P1 < 3) ? ceil(cos(10 * t)) : func2(P1, t)

  energy = x**2 + y**2

#parameters:
  P1 = 1.1 {caption: frequency; category: Parameters; min: 1; max: 10} [The control parameter]
  P2 = -1.1 {caption: shift; category: Parameters; min: -10; max: -1} [The shift parameter]

#inits:
  x = 2 {category: Initial state; min: 0; max: 5} [Initial value of the x coordinate]
  y = 0 {category: Initial state; min: -2; max: 2} [Initial value of the y coordinate]

#output:
  t {caption: time}
  energy
  control

#argument: t
  start = 0 {caption: Initial; category: Time; min: 0; max: 10} [Initial time of simulation]
  finish = 10 {caption: Final; category: Time; min: 10; max: 20} [Final time of simulation]
  step = 0.01 {caption: Step; category: Time; min: 0.01; max: 0.1; step: 0.001} [Time step of simulation]

#tolerance: 5e-5`;
