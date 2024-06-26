# Helm changelog

## 2.3.0 (2024-06-24)

Use forked JSDraw.Lite and HELMWebEditor

### Bug fixes

* Add test for helm-web-editor
* Add test parseHelm without DOM
* Add test seq properties widget for fasta RNA
* GROK-15994: Color missing monomers
* Fix cell renderer to invalidate on lib changed
* Fix dojo load and patch

## 2.2.2 (2024-05-16)

Fix seq properties widget, warning for too long seq, test

## 2.2.1 (2024-05-13)

### Features

* Use Bio monomerLib within Helm Web Editor

### Bug fixes

* Optimize getMonomer tests to prevent reloading the monomer lib
* Add tests for adding missing monomers with Helm Web Editor

## 2.2.0 (2024-05-01)

Optimize cell renderer on async renderer base

### Features

* Add interactivity on monomers into HelmGridCellRenderer
* Add sync render cell from cache (Helm editor specific)
* Prioritize render queue by task consumer id and callback
* Add HelmService test
* Add Helm cell renderer test for scatter plot
* Use types of Pistoia Helm, get rid of ts-ignore
* Add handling missing monomers with Helm cell renderer

### Bug fixes

* Fix Helm cell renderer to clear editor on empty cell value
* Fix alert message box with compressed Scilligence.JSDraw2.Lite.js

## 2.1.34 (2024-04-22)

Fix Helm grid cell renderer

## 2.1.33 (2024-04-19)

Fix cell renderer for scatter plot tooltip, add test

## 2.1.32 (2024-04-15)

### Features

* Add displaying a monomer's origin lib

### Bug fixes

* Fix tests for default lib settings
* Invalidate monomer placer cache on monomer lib changed

## 2.1.31 (2024-03-30)

### Features

* #2707: Add original and canonical to monomer
* Bump dependencies versions

## 2.1.30 (2024-03-13)

### Features

* Add tooltip for sequence with missed monomers

## 2.1.29 (2024-02-21)

* Fix Unknown monomers breaking grid rendering.

## 2.1.28 (2024-02-19)

* Fix TS config file.

## 2.1.27 (2024-02-15)

### Bug fixes

* Fix dojo patch dependency on package init
* Fix getMolfiles without current table view
* Fix initHelm/rewriteLibraries without current table view

## 2.1.26 (2024-02-14)

### Bug fixes

* Fix Properties panel of Context panel for sequences of MSA with gaps

## 2.1.25 (2024-02-09)

### Features

* Show tooltips on monomers rendered with WebEditor.

### Bug fixes

* Fix Helm cell renderer, allowing to render with gaps by skipping.
* Fix message WebEditor not supporting Helm with gaps.
* Prevent display tooltip by fallback cell renderer while WebEditor renders.
* Reset monomer placer on monomer lib changed.
* Fix Pistoia Helm WebEditor settings for case-sensitive monomer libs.
* Fix cell renderer monomer tooltip for polymer type
* Patch WebEditor hanging on getTextWidth

## 2.1.24 (2024-01-09)

### Bug Fixes

* GROK-13798: Fix error bioSubstructureFilter for Helm on size changed

## 2.1.16 (2023-07-21)

This release focuses on stability.

*Dependency: datagarok-api >= 1.10.2*

### Bug Fixes

* Fixed the **To Atomic Level** function for helm sequences.
* `Neither peptide, nor nucleotide` error when calling **Helm Web Editor**
* Macromolecule detector for alphabet UN.
