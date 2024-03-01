# Compute changelog

## 1.24.0 (2024-03-01)

### Features

- RFV: Customizable data upload feature

## 1.23.0 (2024-02-28)

### Features

- SA: Updated viewers
- SA: Added analysis by value in custom column

### Bug fixes

- SA: Fixed bug last row analysis

## 1.22.0 (2024-02-20)

### Features

- Added heavy-weight libraries dynamic load

### Bug fixes

- SA: Inputs layout fixed

## 1.21.2 (2024-02-14)

### Bug fixes

- SA: Fixed bug switch styling

## 1.21.0 (2024-02-13)

### Features

- Wizard: now deletes all steps' funccalls on parent funccall deletion
- CPV: Design & performance improvements
- SA: Added units into the form

### Bug fixes

- SA: Fixed bug with identical column names
- CPV: Fixed bug with viewers of the same type

## 1.20.1 (2024-02-05)

### Features

- HistoryInput now supports DF param skipping

## 1.20.0 (2024-02-01)

### Features

- PLV: Added help icon for steps if help is available
- RFV: Added "add to favorites" icon for historical runs cards
- ModelCatalog: Moved help to model's context menu
- RFV: Moved History panel out from context panel

## 1.19.2 (2024-01-18)

### Bug fixes

- RFV: Run button disabling fix

## 1.19.1 (2024-01-18)

### Features

- SA: Internal refactoring & UI improvements

### Bug fixes

- RFV: Foldable categories design fix
- RFV: Buttons layout changes

## 1.19.0 (2024-01-08)

### Features

- RFV: Added `graphics` type support
- RFV: Exposed feature-flags

### Bug fixes

- RFV: Fixed bug for string default values

## 1.18.0 (2023-12-25)

- RFV: Added input form adaptiveness
- RFV: Renamed validator tag to `validatorFunc`
- RFV: Added `nullable` tag for inputs 

## 1.17.3 (2023-11-22)

### Features:

- RFV: New styles for huge viewers
- PLV: Added input resetting from locked state

### Bug Fixes

- RFV: Fixed error on getting pacakge of newly created script
- RFV: Disabled scripts caching for newly created scripts
- RFV: Added workaround for viewers of type Filters

## 1.17.1 (2023-11-07)

### Features

- ModelCatalog: Moved generic code into compute-utils

## 1.17.0 (2023-11-03)

### Features:

- ModelCatalog: Added mandatory groups indication
- PLV: Added inconsistent steps indication
- PLV: Added mandatoryConsistent tag

## 1.16.0 (2023-10-31)

### Features:

- RFV: Added input validators
- RFV: Added input lock-states
- RFV: Added `keepOutput` tag to control output hiding

### Bug Fixes

- RFV: Fixed losing focus on input disabling
- RFV: Fixed empty tooltip appearing
- RFV: Fixed validators & validation icon appearance

## 1.15.2 (WIP)

### Bug Fixes

- Removed idle pkpd.R and pop-pk.R scripts

## 1.15.1 (2023-10-21)

### Bug Fixes

- PLV: Fixed load run bug logic
- RFV: Fixed load run bug logic

## 1.15.0 (2023-09-25)

### Bug Fixes

- RFV: Fixed inputs layout inside of foldable categories

### Features

- RFV: Sensitivity analysis is added

## 1.14.3 (2023-09-08)

### Bug Fixes

- PLV: Fixed options logic on funcCall copy

### Features

- Compute: OutliersViewer's balloon has now proper buttons type

## 1.14.2 (2023-09-07)

### Bug Fixes

- RFV: Fixed tabs reappearance after recalculation

### Features

- RFV: Added styling for scalar tables
- OultiersSelection viewer now supports actionable balloon

## 1.14.1 (2023-09-06)

### Bug Fixes

- Fixed color and numeric values parsing in RFV

## 1.13.12 (2023-08-25)

### Bug Fixes

- Fixed rare bug with historical runs in PLV
- Fixed bug with viewers' captions duplication

## 1.13.9 (2023-08-23)

### Bug Fixes

- Fixed bug with empty captions in RFV blocks

## 1.13.8 (2023-08-18)

### Features

- RFV: Inputs are now disabled during computations
- RFV: editState is now properly saved
- FileInput: Moved icons into options container
- Default users and groups IDs are now taken from API

### Bug fixes

- History panel CSS fixed

## 1.13.6 (2023-08-15)

### Features

- FileInput now extends DG.InputBase
- RFV: Historical runs become non-historical on any input change
- RFV: Ribbon panel now reacts on "historicity" of the run
- RFV: Inputs now have a delay before calculation re-run
- RFV: DataFrame export to Excel now uses built-in Excel tables

### Bug fixes

- Removed workarounds for GROK-13335 & GROK-13337
- PLV: Fixed bug with extra tabs enabled on historical run load

## 1.13.5 (2023-08-10)

### Features

- Heavily optimized export functions for RFV
- RFV now supports format setting for float inputs using `format` tag
- RFV now supports precision setting for float outputs using `precision` tag`

### Bug fixes

- RFV now saves selected output tab on function rerun
- RFV now fully hides output during function run panel if no input tabs is provided

## 1.13.3 (2023-08-01)

- ModelCatalog now shows model readme on card click

## 1.13.2 (2023-07-28)

- RichComputationViewEditor now uses choiceInputs for string properties

## 1.13.0 (2023-07-28)

- RichComputationViewEditor now supports exporting plots' images as separate export option

## 1.12.3 (2023-07-24)

- RichComputationViewEditor now supports inputs defined in other DG functions
- Fixed package augmentation for manually created scripts
