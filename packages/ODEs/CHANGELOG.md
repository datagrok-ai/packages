# Diff Studio changelog

## 1.0.10 (2024-06-10)

Implemented

* The ROS3PRw and ROS34PRw methods for numerical solving ODEs
* Callback mechanism for solvers control
* `#meta.solver`-block for solving method control:
  * method
  * max iterations count
  * max computation time
* Max computation time control feature

## 1.0.9 (2024-05-15)

Added parameters fitting feature

## 1.0.8 (2024-04-08)

Added

* Application view feature
* One-compartment pharmacokinetic (PK) simulation example

## 1.0.7 (2024-03-28)

Added siderbar feature to the generated JS-scripts

## 1.0.6 (2024-03-08)

* E-notation use
* Sensitivity Analysis
* Extended model correctness check

## 1.0.5 (2024-03-01)

Added the Bioreactor example

## 1.0.4 (2024-02-26)

* Styles improvement
* Linechart options update

## 1.0.3 (2024-02-19)

* Tab control with `Model` and `Run` panes
* Interactive model exploration via the `Run` pane
* Routing of the example models
* Check correctness of model inputs annotation
* Comments (`//...`) in formulas
* Expressions usage in the `#output`-block
* Formulas can be used in the `#update`-block to define the duration
* Modeling stages are marked with a color
* Model *ivp*-files handling and preview

## 1.0.2 (2023-12-21)

* Run computations on open Diff Studio
* Solver package name bug fix

## 1.0.1 (2023-12-20)

* Export model to the platform application
* Layout and ribbon update
* Run model on open
* Demo application update

## 1.0.0 (2023-12-12)

In-browser tools for solving ordinary differential equations (ODE) systems.

* Implicit method for solving ODEs
* Declarative ODEs specification parser
* JavaScript code generator
* Application for in-browser solving ODEs
* Templates and use cases
* Demo application
