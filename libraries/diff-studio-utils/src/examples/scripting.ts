import {getIVP, getJScode} from '../../index';

/** Example. Solve the following initial value problem
     
      dx / dt = x + y - cos(t)
      dy / dt = x - y + sin(t)
      x(0) = 1
      y(0) = 0

    on [0, 1] with the step 0.01.
 */

/** Diff Studio mode specifying the given problem */
const model = `#name: Example
#equations:
  dx/dt = x + y - cos(t)
  dy/dt = x - y + sin(t)

#inits:
  x = 1
  y = 0

#argument: t
  start = 0
  finish = 1
  step = 0.01`;

// Get parsed formulas
const ivp = getIVP(model);

console.log(ivp);

// Get lines of JS-code specifying ODEs object
const lines = getJScode(ivp);

console.log(lines);