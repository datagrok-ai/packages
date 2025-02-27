# Helm changelog

## 2.8.0 (2025-02-20)

Supporting all notations for hovering, conversion and context actions

## 2.7.4 (2025-02-17)

Fix Helm Splitter for marginal cases and tests

## 2.7.3 (2025-02-17)

Support for DNA/RNA for hover and other effects

## 2.7.2 (2025-01-21)

Support for async rendering in non-grid views

## 2.7.1 (2024-12-30)

Moved some tests from Bio package to Helm package (for Bio not to depend on Helm)

## 2.6.0 (2024-11-18)

Correct helm loading

## 2.5.10 (2024-11-15)

Fix async renderer invalidation on cached rendering

## 2.5.9 (2024-11-01)

Correct initialization of the Helm

## 2.5.8 (2024-10-31)

### Bug fixes

* Fix HelmInput for SeqValueBase
* Fix HelmGridCellRenderer for original and canonical symbols
* Fix using HelmAtom

## 2.5.7 (2024-10-24)

### Bug fixes

* Fix HelmHelper adding .seqHelper

## 2.5.6 (2024-10-22)

### Bug fixes

* Fix HelmGridCellRenderer for size limit and flickering
* Remove HelmMonomerPlacer, cleanup
* Fix HelmHelper removeGaps tests using standard monomer libs
* Fix HelmHelper adding tests for parse Helm, and with gaps

## 2.5.5 (2024-10-15)

* Fix Getting monomers in HWE that can contain square brackets

## 2.5.4 (2024-10-10)

### New features

* Fix using SeqHandler factory
* Fix Helm cell renderer get tooltip from overridden monomer lib
* Fix HelmService rendering with overridden monomer lib

## 2.5.3 (2024-09-27)

### Bug fixes

* Fix test Helm HelmHelper.removeGaps
* Fix using IMonomerLibHelper.loadMonomerLibForTests
* Fix test HelmHelper: removeGaps.single-cycle-gap-at-connection
* Fixes for eslint

## 2.5.2 (2024-09-25)

Bump dependencies, bio lib

## 2.5.1 (2024-09-24)

### New features

* Add HelmHelper parse and removeGaps methods, add tests
* Add monomer hover handling for substruct
* Add dojo bundled loading (fix freezing the browser)

## 2.5.0 (2024-09-10)

### Bug fixes

* Fix init dojo loading NGL ahead
* Bump dependencies versions

## 2.4.6 (2024-09-05)

Helm Web editor cell editing causing grid.onCellValueEdited event

## 2.4.5 (2024-08-29)

Fix getHelm for cyclic, bump HWE dependencies

## 2.4.4 (2024-08-27)

### Bug fixes

* Helm: Fix Helm grid cell renderer mouse move handling error

## 2.4.3 (2024-08-23)

Helm: Bump HWE dependencies versions
Helm: Move getMolfiles to HelmHelper (highlight monomer at atomic level)

## 2.4.2 (2024-08-19)

### Bug fixes

* Fix Helm editor default tab to Helm

## 2.4.1 (2024-08-16)

### Features

* HWE option for continuous number, typing
* Add HelmInput mouse events, redraw, showTooltip
* Bump HWE dependencies versions

### Bug fixes

* Polish HelmInput size handling, tooltip

## 2.4.0 (2024-08-06)

### Features

* Add monomer placeholders to HELMWebEditor palette

### Bug fixes

## 2.3.4 (2024-08-06)

### Bug fixes

* Fix HelmInput/tooltip flapping test
* Fix dojo dijit locale to en-us
* Fix HELMWebEditor and Bio init order to handle monomer lib

## 2.3.3 (2024-08-05)

### Features

* Load dojo without CDN

### Bug fixes

* Fix monomers palette filling of HWE
* Fix init dojo require
* Fix test findMonomers

## 2.3.2 (2024-07-23)

### Features

* Add HelmInput

### Bug fixes

* Add tooltip to HelmInput showing monomer of lib, test
* Fix HelmInput to redraw on monomer lib changed
* Fix HelmInput to handle dialog resize

## 2.3.1 (2024-06-28)

Fix cell renderer error before package initialized

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
