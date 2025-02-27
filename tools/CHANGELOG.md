# Datagrok-tools changelog

## 4.13.63 (2025-02-27)

### Features

* Grok Link minor fixes

## 4.13.62 (2025-02-27)

### Features

* No Sandbox mode for puppeteer removed
* Added debug mode for test and testAll

## 4.13.61 (2025-01-27)

### Features

* No Sandbox mode for puppeteer added

## 4.13.60 (2025-01-09)

### Features

* Updated console output for cases "Tests not found"

## 4.13.59 (2025-01-09)

### Features

* Benchmark testing fix
* Updated csv output result(it saves benchmark and stress data now)


## 4.13.58 (2025-01-09)

### Features

* Test failed results fix


## 4.13.57 (2025-01-08)

### Features

* Test failed results fix

## 4.13.56 (2025-01-06)

### Features

* Worker to browser in test all 

## 4.13.55 (2025-01-06)

### Features

* Removed unnecessary outputs in grok check


## 4.13.54 (2025-01-06)

### Features

* Grok check regex update


## 4.13.53 (2025-01-06)

### Features

* Updated csv output for test all(added workes id)


## 4.13.52 (2024-12-30)

### Features

* Refactored workers to browsers


## 4.13.51 (2024-12-30)

### Features

* Minor fix for testToWorker order in testsAll


## 4.13.50 (2024-12-30)

### Features

* Added testToWorker order for testsAll

## 4.13.49 (2024-12-26)

### Features

* Removed load npm
* Added ability to set vue as external lib for check

## 4.13.48 (2024-12-25)

### Features

* Added load npm

## 4.13.47 (2024-12-25)

### Features

* Fixed category selection for test

## 4.13.46 (2024-12-23)

### Features

* Improved error handling:
  - Different exit codes for package errors / grok script errors
  - Graceful error handling when testing non-existing packages

## 4.13.45 (2024-12-12)

### Features

* Test all workers count variable fixes

## 4.13.44 (2024-12-06)

### Features

* Test fixed infinite testing 

## 4.13.43 (2024-12-02)

### Features

* Publish visual updates

## 4.13.42 (2024-11-29)

### Features

* Publish refresh orientates on debug versions of packages

## 4.13.41 (2024-11-29)

### Features

* Added ability to run auto tests by core variable

## 4.13.39 (2024-11-26)

### Features

* Grok publish added ability to link packages
* Grok test log for multiple workers fix

## 4.13.38 (2024-11-15)

### Features

* Minor fixes

## 4.13.37 (2024-11-15)

### Features

* Output fixes

## 4.13.36 (2024-11-15)

### Features

* Grok test reopens on each failed test

## 4.13.35 (2024-11-4)

### Features

* Grok help fixes

## 4.13.34 (2024-11-1)

### Features

* Config bug fixes

## 4.13.33 (2024-10-31)

### Features

* Added Changelog to package template
* Added ability to reload page on Execution Timeout

## 4.13.32 (2024-10-16)

### Features

* Replaced publishAll by publuish variables 
* Added global.d.ts file

## 4.13.31 (2024-10-15)

### Features

* Grok test without repository fixes


## 4.13.30 (2024-10-11)

### Features

* Grok Check fixes

## 4.13.29 (2024-10-09)

### Features

* Help fixes


## 4.13.28 (2024-10-09)

### Features

* Grok Check update(added checks on caching)

## 4.13.27 (2024-10-02)

### Features

* Publish all added

## 4.13.26 (2024-10-02)

### Features

* Create command fixes

## 4.13.25 (2024-09-30)

### Features

* Test command package publishing fix 

## 4.13.24 (2024-09-26)

### Features

* Test command fixes update

## 4.13.23 (2024-09-23)

### Features

* Test all bug fixes

## 4.13.22 (2024-09-20)

### Features

* Implemented mechanism which allows to test few packages by one function

## 4.13.21 (2024-09-17)

### Features

* Grok check updated for release candidate versions

## 4.13.20 (2024-08-28)

### Features

* Grok link command fixes 

## 4.13.19 (2024-08-27)

### Features

* Package ts data insertation fixes

## 4.13.18 (2024-08-27)

### Features

* Creation fixes

## 4.13.17 (2024-08-27)

### Features

* Added decorators for viewer functions

## 4.13.16 (2024-08-23)

### Features

* Grok link fixes

## 4.13.15 (2024-08-21)

### Features

* Grok link updated to link all dependent libs 

## 4.13.14 (2024-08-09)

### Features

* Timeout update for test runs up to 1 hour

## 4.13.13 (2024-08-09)

### Features

* Added stress test flag

## 4.13.12 (2024-08-05)

### Features

* Puppeteer-screen-recorder version fixed to 3.0.3

## 4.13.11 (2024-07-30)

### Features

* Added commit label to context panel for 'manually' published versions

## 4.13.10 (2024-07-29)

### Features

* Added ability to select test by args variable 

## 4.13.9 (2024-07-29)

### Features

* Added ability to select category by args variable 

## 4.13.8 (2024-07-18)

### Bug Fixes

* Fixed path chacks for npmignore

## 4.13.6 (2024-07-15)

### Features

* Splitted warnings and errors in grok check command

## 4.13.4 (2024-06-25)

### Bug Fixes

* Check source maps fixes 

## 4.13.3 (2024-06-21)

### Features

* Added check on source maps in grock check command

## 4.13.1 (2024-06-04)

### Features

* Added argument `package`, which allows you to choose a package for the `test` command


## 4.12.13 (2023-08-17)

### Bug Fixes

* Datagrok API version check fix
* Check Changelog fix
* Sync --csv and --verbose flags

## 4.12.12 (2023-08-07)

### Features

* Check for datagrok-api dependency

### Bug Fixes

* Latest package version in CHANGELOG check fix

## 4.12.11 (2023-08-04)

### Features

* GROK-13643 Check improvements:
  * There is no beta property in package.json
  * No datagrok-tools in dependencies (or latest version)
  * Latest version from package.json is in CHANGELOG (warning)
  * Ignore CHANGELOG checks for service packages ("servicePackage" property in package.json)
  * Change supported h2 formats (1.7.9 (2023-07-24) and 1.7.9 (WIP))
  * For packages < 1.0.0 exit with exit code 0, and only show warnings. And for packages >= 1.0.0, exit with a non-zero code (only for check command)
  * If an invalid flag/command is specified, output the help and exit with exit code 1

## 4.12.10 (2023-08-01)

### Features

* Video recording enhancements

### Bug Fixes

* FuncSignatures check fix

## 4.12.7 (2023-07-28)

### Features

* Tools: Changelog h2 new format

## 4.12.4 (2023-07-24)

### Features

* GROK-13573 Tools: simplify output (add --verbose flag)
* GROK-13573 Tools: checks for changelog
