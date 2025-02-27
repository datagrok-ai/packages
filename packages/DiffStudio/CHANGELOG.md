# Diff Studio changelog

## 1.2.4 (2025-02-20)

* Implemented the use of Diff Grok library
* Updated compute-utils

## 1.2.3 (2025-02-12)

* Fixed the Open model menu
* Updated performance info

## 1.2.2 (2025-02-10)

* Implemented the use of Diff Studio Lib solvers
* Added correctness tests

## 1.2.1 (2025-02-01)

Added facet grid plot

## 1.2.0 (2024-12-01)

UI/UX updates:

* Edit/Consumption modes toggle
* Reorganized top menu
* Improved icon placement and visibility
* Implemented run of the app with last called model
* Collapsability of input categories
* Sources and comments in the examples
* Model error indication

Fixes:

* The Acid Production example
* The behavior on the NaN-s case

## 1.1.6 (2024-11-18)

* Updated computations the loop & update features
* Added the platform function for solving equations

## 1.1.5 (2024-10-10)

* Added the Ball flight demo model
* Updated model run widgets

## 1.1.4 (2024-09-30)

Added the use of lookup tables in the Sensitivity Analysis & Fitting features

## 1.1.3 (2024-09-18)

Added the use of lookup tables

## 1.1.2 (2024-09-16)

Added the Bioreactor & SimPKPD models

## 1.1.1 (2024-09-11)

* Browsing: Templates/Examples/Recent models integration to the browse tree
* Added tests & benchmarks: solvers performance & correctness, models features (basic structure, loops, updates, etc.)
* Templates/Examples: updated the basic template, added the Pollution model
* Float64 columns usage implementation
* Improved the main app start

## 1.1.0 (2024-09-10)

* 1.21.1 release

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
