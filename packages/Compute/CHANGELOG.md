# Compute changelog

## 1.41.1 (2025-02-20)

- FittingView: in-webworker parameters optimization of Diff Studio models

## 1.41.0 (2025-02-19)

- ModelCatalog refactored
- API updated for 1.24.0

## 1.40.4 (2025-01-28)

- ModelHandler: help disable sync

## 1.40.3 (2024-12-28)

- ModelHandler: help fix

## 1.40.1 (2024-12-25)

- History fixes and removing obsolete API calls

## 1.39.7 (2024-11-25)

- Added method to render model preview in BrowseTree

## 1.39.6 (2024-11-07)

- ModelCatalog: Added intergration with BrowseTree

## 1.39.5 (2024-11-06)

- RFV: Added validation rules for export options
- ModelCatalog: Fixes for JS API 1.22
- RFV: Moved JSON loading to TestRunner menu for Developers

## 1.39.3 (2024-09-23)

- ModelCatalog: Added info notification on group membership request

## 1.39.2 (2024-09-13)

- RFV: Export generation is now independent of UI state

## 1.39.1 (2024-09-10)

- Fixed DF input in the Fitting view

## 1.38.0-rc.2 (2024-09-09)

- Fixed DF input processing with no viewers

## 1.38.0-rc (2024-09-06)

- Preparing 1.21.1 release

## 1.37.0 (2024-09-05)

- Release for 1.21.0

## 1.37.0-rc (2024-09-04)

- Preparing 1.21.0 release

## 1.36.7 (2024-08-05)

- RFV: Fixed navigation buttons render

## 1.36.6 (2024-08-01)

- RFV: Added spinning for async validation icon

## 1.36.5 (2024-07-31)

- RFV & Wizard: Historical runs load optimization

## 1.36.4 (2024-07-30)

- Deps update

## 1.36.3 (2024-07-30)

- Wizard: Fixed context info icon duplication

## 1.36.2 (2024-07-23)

- RFV: Added validation tooltip width and text-wrap

## 1.36.1 (2024-07-22)

- RFV: Last inputs are now saved locally

## 1.36.0 (2024-07-10)

- RFV: Added output validators support

## 1.35.10 (2024-07-08)

- CompositionPipeline: Exposed options to public interface

## 1.35.8 (2024-07-03)

- PLV: Fixed run loading to load author

## 1.35.7 (2024-07-01)

- HistoryList: Fixed bug on batch deletion
- HistoryInput: Added skipDf option

## 1.35.6 (2024-06-27)

- Exposed mergeValidationResultsInst method

## 1.35.5 (2024-06-26)

- getParamChanges fixed empty FuncCall error

## 1.35.4 (2024-06-25)

- Inputs bugfixes

## 1.35.3 (2024-06-25)

- Changed inputs to use new API

## 1.35.2 (2024-06-24)

- RFV: Added getViewers method

## 1.35.1 (2024-06-19)

- Exposed testPipeline method

## 1.35.0 (2024-06-12)

- Exposed ComputeAPI

## 1.34.3 (2024-05-21)

### Bug fixes

- RFV: Fixed single-tab output logic
- Wizard: Fixed double-help case

## 1.34.2 (2024-05-17)

- RFV: Added HistoryPanel hide on view closing

## 1.34.1 (2024-05-15)

- Fixed imports

## 1.34.0 (2024-05-14)

### Features

- RFV: Removed workaround for tableInput
- RFV: Added tooltips for inputs
- HistoryInput: Changed dates to local timezone
- Added Fitting view

## 1.33.5 (2024-05-09)

### Features

- RFV: Property default value getting both for 1.18.x and 1.19

## 1.33.4 (2024-05-09)

### Features

- Heavyweight imports optimization

## 1.33.3 (2024-05-08)

### Features

- Bundle size optimizations

## 1.33.1 (2024-05-07)

### Features

- Rearranged CSS files
- RFV: Added isOutdatedOutput subject
- HistoryInput: Hides incomplete runs
- HistoryPanel: Added completeness filter

## 1.33.0 (2024-05-06)

- Added CompositionPipeline

## 1.32.4 (2024-05-03)

### Bug fixes

- RFV: Removed workarounds

## 1.32.3 (2024-04-30)

### Bug fixes

- HistoryPanel: Fixed case of duplicated captions

## 1.32.2 (2024-04-29)

### Misc

- Dependencies update

## 1.32.1 (2024-04-29)

### Bug fixes

- RFV: LineChart dynamically resizing

## 1.32.0 (2024-04-18)

### Features

- Added partial save feature for RFV & Wizard
- Run deletion is now implemented via flag
- Wizard: annotation and in-code help pages are now both supported
- History panel: "Params" switch is now hidden if no params exist
- Wizard: Steps now support customId-s

### Bug fixes

- History panel: Fixed grid keeping its size

## 1.31.0 (2024-04-10)

### Features

- ModelCatalog: Adaptation for BrowseView

## 1.30.1 (2024-04-08)

### Bug fixes

- RFV: Default export properly works with nulls

## 1.30.0 (2024-04-08)

### Features

- HistoryInput refactored: now uses same component as HistoryPanel
- `mainInputs` tag renamed to `mainParams`
- Both HistoryInput and HistoryPanel now use `mainParams` to determine visible columns

## 1.29.1 (2024-04-03)

### Features

- HistoryPanel: Added compact mode
- HistoryPanel: Fixed bug with supported column types

## 1.29.0 (2024-03-29)

### Features

- RFV: Disabled re-run on inputs load
- ModelCatalog: Full support of single-file models
- HistoryPanel: Redesigned to use Grid


## 1.28.0 (2024-03-13)

### Features

- Adapted lib for Datagrok v1.18

## 1.27.0 (2024-03-12)

### Features

- RFV: Added last values restoring

## 1.26.0 (2024-03-11)

### Features

- RFV: Moved favorites to UserStorage

## 1.25.3 (2024-03-06)

### Features

- RFV: "readme" tag replaced by "help"

## 1.25.2 (2024-03-05)

### Features

- PLV: Added additional check on step enabling
- ModelCatalog: Added help switching

## 1.25.1 (2024-03-04)

### Features

- SA: input form styles fix

## 1.25.0 (2024-03-04)

### Features

- RFV: Now supports readme files via `meta.readme` tag
- Wizard: Now support help panel state saving

## 1.24.1 (2024-03-02)

### Features

- ModelCatalog: Fixed bug with mandatory groups

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
