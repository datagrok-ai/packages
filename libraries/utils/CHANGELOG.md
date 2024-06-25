# utils changelog

## 4.2.11 (2023-06-20)

New tests reporting method.

## 4.2.10 (2023-06-17)

Fixed core tests compatibility.

## 4.2.9 (2023-06-13)

Fixed viewer testing.

## 4.2.8 (2023-06-05)

Fix the infinite loading of tests.

## 4.2.7 (2023-06-05)

Fix the lastError problem in the test engine.

## 4.2.6 (2023-05-29)

### Features

* Added timeouts for before/after
* Timeout function was updated to async method

## 4.2.5 (2024-05-13)

### Bug fixes

* Forms viewer: catching exceptions when creating inputs for types

## 4.2.4 (2024-05-09)

### Features

* Ability to test viewers with async rendering

## 4.2.3 (2024-05-06)

### Features

* Added support to check Sets and Maps
* Added serialization support for Sets and Maps

## 4.2.2 (2024-04-22)

### Bug fixes

* Forms Viewer: Added check for undefined grid when calculating color coding

## 4.2.1 (2024-04-19)

### Features

* Added svgToImage

## 4.2.0 (2024-04-01)

### Features

* Added active files handler

## 4.1.45 (2024-02-20)

### Bug fixes

* [#2687](https://github.com/datagrok-ai/public/issues/2687): Forms viewer: Fixed molecule size option name

## 4.1.44 (2024-02-16)

### Features

* [#2687](https://github.com/datagrok-ai/public/issues/2687): Forms viewer: Added an option to adjust the size of the molecule.
* Lowered line threshold for scatterplot lines renderer.

## 4.1.43 (2024-02-15)

### Features

* Added category for core tests.
* Added methods to items grid.

## 4.1.42 (2024-02-12)

### Features

* Updated lines renderer for scatterplot.

## 4.1.41 (2024-02-01)

## 4.1.40 (2024-01-29)

### Features

* Added to testViewer support options.awaitViewer

### Bug fixes 

* Fixed testViewer for element selector

## 4.1.39 (2024-01-26)

## 4.1.38 (2024-01-19)

### Features

* Added timeout option.

## 4.1.37 (2024-01-19)

### Features

* Integrated Dart tests.
* Saved test console logs.

### Bug Fixes

* Added reason for test event.

## 4.1.36 (2023-12-14)

### Bug Fixes

* Fixed test data for the Biostructure viewer.

## 4.1.35 (2023-12-13)

### Bug Fixes

* Scatterplot lines renderer: Sending mouse event on line click.

## 4.1.34 (2023-12-12)

### Bug Fixes

* Forms viewer: Updated layout initial size.

## 4.1.33 (2023-11-30)

### Bug Fixes

* Forms viewer: Fixed indicator margins.

## 4.1.32 (2023-11-30)

### Bug Fixes

* Lines renderer: Fixed incorrect arrows direction in case of multilines.

## 4.1.31 (2023-11-29)

### Features

* Forms viewer:
  * Updated viewer layout.
  * Added styles for updated molecular input.
  * Click on input makes row current.
  * Made column label clickable.
  * Added tooltip on value.
  * Added close button for column labels.
  * Added indicators for current and mouse over row.

### Bug Fixes

* Forms viewer: Fixed setting input text color.

## 4.1.30 (2023-11-27)

### Bug Fixes

* Fixed tests running.

### Features

## 4.1.29 (2023-11-27)

### Features

* Forms viewer:
  * Handled color coding changing, columns removing, input values changing.
  * Made inputs read-only.
  * Set default limit for columns number.
  * Added reaction to Ctrl, Shift, and Ctrl+Shift-click.
  * Added help link.
  * Updated viewer layout.
* Test engine improvements:
  * Before/after isnow skipped if category is skipped.
  * Results now have a stacktrace.

### Bug Fixes

* Forms viewer:
  * Fixed styles.
  * Fixed removing several columns at once.
  * Fixed freezing when mouse enters form.
  * Fixed rendering when showCurrentRow is unset.
  * Fixed rendering in case showCurrentRow and showMouseOverRow are both switched off.
  * Fixed text color coding.
  * Fixed showSelectedRows and checkboxes height.

## 4.1.28 (2023-11-16)

### Features

* Added Forms viewer.

## 4.1.27 (2023-11-16)

### Features

* Added ArrayBuffer to JSON serialization.

## 4.1.26 (2023-11-14)

### Features

* Added capability to set line arrow size on scatterplot.

## 4.1.25 (2023-11-14)

## 4.1.24 (2023-11-11)

### Features

* Improved `appHeader` function.

## 4.1.23 (2023-11-11)

### Features

* Added `appHeader` function.

### Bug Fixes

* Fixed Dart tests in Test Manager.

## 4.1.22 (2023-11-09)

### Features

* Added `demoSkip` option in tests.

## 4.1.21 (2023-11-08)

### Features

* Improved lines rendering on scatterplot.

## 4.1.20 (2023-11-03)

### Features

* Improved vector operations.

## 4.1.19 (2023-10-30)

### Features

* Line rendering on scatterplot improvements.

## 4.1.18 (2023-10-17)

### Features

* Added unsupported dataset for viewers test.

## 4.1.17 (2023-10-13)

### Features

* Added demo tests registration.

## 4.1.16 (2023-10-12)

### Features

* Implemented generic method to draw lines on the scatterplot.

## 4.1.15 (2023-10-04)

### Bug Fixes

* Updated ItemsGrid classes.

## 4.1.14 (2023-09-13)

### Bug Fixes

* Added events after adding ItemsGrid.

## 4.1.13 (2023-09-13)

### Bug Fixes

* Fixed ItemsGrid removing label.

## 4.1.12 (2023-09-12)

### Bug Fixes

* Updated ItemsGrid with custom inputs.

## 4.1.11 (2023-09-10)

### Bug Fixes

* Fixed captions for ItemsGrid.

## 4.1.10 (2023-09-01)

### Bug Fixes

* Fixed checkbox for ItemsGrid.

## 4.1.9 (2023-09-01)

### Bug Fixes

* Added prefix for test parameters.

## 4.1.8 (2023-09-01)

## 4.1.7 (2023-08-31)

### Bug Fixes

* Fixed color input for ItemsGrid.

## 4.1.6 (2023-08-31)

### Features

* Added ItemsGrid component.

## 4.1.5 (2023-08-30)

### Bug Fixes

* Fixed tags for initTests().
* Handled test return values.
* Tests now run by name.

## 4.1.4 (2023-07-25)

### Bug Fixes

* Custom functions now run before tests.

## 4.1.3 (2023-07-19)

### Bug Fixes

* Fixed log transforms.

## 4.1.2 (2023-07-17)

### Bug Fixes

* Fixed y invertion when converting the coordinates in Transform.

## 4.1.1 (2023-06-30)

### Bug Fixes

* Fixed exception check.
* Fixed benchmark timeout.

## 4.1.0 (2023-06-30)

This release focuses on improving stability.

### Features

* Resurrected test tracking system.

## 4.0.17 (2023-06-28)

### Bug Fixes

* Removed y inversion in transform axes.

## 4.0.16 (2023-06-28)

### Bug Fixes

* Added test timeout for categories.

## 4.0.15 (2023-06-26)

### Features

* Added the capability to use custom test timeout.

## 4.0.14 (2023-06-26)

### Bug Fixes

* Fixed universal viewer test.

## 4.0.13 (2023-06-23)

### Bug Fixes

* Fixed test timeout setting.

## 4.0.12 (2023-06-12)

### Features

* Added linear and log transforming for screen/world coordinates and the coordinate grid.

## 4.0.11 (2023-06-07)

### Features

* Added typing for the ColumnInput.

## 4.0.10 (2023-06-01)

## 4.0.9 (2023-06-01)

### Features

* Improved test engine.

## 4.0.8 (2023-05-25)

### Features

* Added normalized matrix calculation.
