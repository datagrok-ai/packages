# compute-utils changelog

## 1.35.5 (2024-06-26)

- getParamChanges fixed empty FuncCall error

## 1.35.4 (2024-06-25)

- Inputs bugfixes

## 1.35.3 (2024-06-25)

- Changed inputs to use new API

## 1.35.2 (2024-06-24)

- RFV: Added getViewers method

## 1.35.0 (2024-06-12)

- Code adapted for Compute API

## 1.34.3 (2024-05-21)

### Bug fixes

- RFV: Fixed single-tab output logic
- Wizard: Fixed double-help case

## 1.34.2 (2024-05-17)

- RFV: Added HistoryPanel hide on view closing

## 1.34.1 (2024-05-15)

- Fixed imports

## 1.34.0 (2024-05-14)

- Added Fitting view

## 1.33.7 (2024-05-14)

### Features

- RFV: Removed workaround for tableInput
- RFV: Added tooltips for inputs
- HistoryInput: Changed dates to local timezone

## 1.33.6 (2024-05-10)

### Features

- Added lodash.cloneDeepWith types

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

### Bug fixes

- Sensitivity Analysis: fixed input form styles

## 1.25.0 (2024-03-04)

### Features

- RFV: Now supports readme files via `meta.readme` tag
- Wizard: Now support help panel state saving

## 1.24.1 (2024-03-02)

### Bug fixes

- ModelCatalog: Fixed error with mandatory groups

## 1.24.0 (2024-03-01)

### Features

- RFV: Customizable data upload feature

## 1.23.0 (2024-02-28)

### Features

- SA: Updated viewers
- SA: Added analysis by value in custom column

### Bug fixes

- SA: Fixed bug last row analysis

## 1.13.14 (2023-08-30)

### Features

- HistoryInput allow skip df load

## 1.13.13 (2023-08-29)

### Features

- HistoryInput redesigned

## 1.13.9 (2023-08-23)

### Fixed bugs

- Fixed bug with empty captions in RFV blocks

## 1.13.8 (2023-08-18)

### Features

- RFV: Inputs are now disabled during computations
- RFV: editState is now properly saved
- FileInput: Moved icons into options container
- Default users and groups IDs are now taken from API

## 1.13.6 (2023-08-15)

### Features

- FileInput now extends DG.InputBase
- RFV: Historical runs become non-historical on any input change
- RFV: Ribbon panel now reacts on "historicity" of the run
- RFV: Inputs now have a delay before calculation re-run
- RFV: DataFrame export to Excel now uses built-in Excel tables

### Fixed bugs

- Removed workarounds for GROK-13335 & GROK-13337
- PLV: Fixed bug with extra tabs enabled on historical run load

## 1.13.5 (2023-08-10)

### Features

- Heavily optimized export functions for RFV
- RFV now supports format setting for float inputs using `format` tag
- RFV now supports precision setting for float outputs using `precision` tag`

### Fixed bugs

- RFV now saves selected output tab on function rerun
- RFV now fully hides output during function run panel if no input tabs is provided
