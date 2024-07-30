# Datagrok-tools changelog


## 4.13.10 (2024-07-29)

### Bug Fixes

* Added ability to select test by args variable 


## 4.13.9 (2024-07-29)

### Bug Fixes

* Added ability to select category by args variable 

## 4.13.8 (2024-07-18)

### Bug Fixes

* Fixed path chacks for npmignore

## 4.13.6 (2024-07-15)

### Bug Fixes

* Splitt warnings and errors in grok check command

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
