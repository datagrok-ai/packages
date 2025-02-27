# Bio changelog

## 2.19.0 (2025-02-20)

* Correct conversion and highlighting of toAtomicLevel
* Added context actions

## 2.18.4 (2025-02-17)

* ToAtomicLevel support for DNA/RNA
* Monomer manager: Fix correcting R-group lines

## 2.18.3 (2025-02-10)

Correct molblock conversion in monomer library extraction

## 2.18.2 (2025-01-22)

Improve grid cell renderer

## 2.18.1 (2024-12-30)

* Removed dependency from Helm package
* Moved substructure filter types to bio library
* Updated tests

## 2.17.6 (2024-12-11)

* Add monomer manager app view with library dashboards
* Improve detectors
 
## 2.17.5 (2024-12-09)

Monomer manager: Correct loading.

## 2.17.3 (2024-11-27)

Monomer managers as apps

## 2.17.2 (2024-11-19)

* Support Sequence renderer resizing 

## 2.17.1 (2024-11-15)

* Fix Tests
* Fix Fix monomer manager styles
* Fix Monomer manager incorrect loading
* Add R-groups validations

## 2.17.0 (2024-11-06)

Cell renderer: Harmonize macromolecule renderers

## 2.16.9 (2024-11-01)

Correct package initialization

## 2.16.8 (2024-10-31)

### Bug fixes

* Fix SeqHandler check for custom notation
* Fix SeqHandler adding splitter, getHelm, isCustom

## 2.16.7 (2024-10-30)

### Bug fixes

* Fix splitterAsHelm for multiple simple polymers, add test

## 2.16.6 (2024-10-22)

### Bug fixes

* Fix toAtomicLevel using pseudo molfile with removed gaps
* Fix toAtomicLevel Helm parser to clean symbols square brackets
* Fix toAtomicLevel using column's overridden monomer lib
* Fix OverriddenMonomerLibrary for added monomers as not missed
* Fix SeqHandler getValue of type MacromoleculeValueBase
* Fix monomerLibraries override test

## 2.16.5 (2024-10-18)

### Bug fixes

* WebLogo: fix compatibility with column types and fix aggregations
* Monomer manager: Fix validations

### Features

Monomer manager: Add new empty monomer

## 2.16.4 (2024-10-16)

### Bug fixes

* Fix helm parser for separate simple polymers, add tests
* Fix adding MonomerPlacer lengths tests
* Fix monomer lib getTooltip for gaps

## 2.16.3 (2024-10-15)

### Bug fixes

* Fix weblogo slider not visible

## 2.16.2 (2024-10-11)

### Bug fixes

* Fix moving setUnits methods to SeqHelper

## 2.16.1 (2024-10-11)

### Bug fixes

* GROK-16782: Fix bio-substructure-filters tests

## 2.16.0 (2024-10-10)

### New features

* Add SeqHandler factory to SeqHelper

### Bug fixes

* Fix monomer lib loading timout
* Fix natural nucleotides' colors
* Fix SeqHandler.getHelm to return SemanticValue
* Fix moving harmonized sequence notation provider to Helm

## 2.15.13 (2024-10-08)

Monomer manager: Fix Molv2k Rgroup line generation

## 2.15.12 (2024-10-07)

Fix weblogo colors

## 2.15.11 (2024-10-04)

Monomer renderer: Choose correct colors for background

## 2.15.10 (2024-10-04)

Monomer manager: Better discoverabilty of errors.

## 2.15.9 (2024-10-03)

### New features

* Add monomer lib getMonomerTextColor

### Bug fixes

* Fix sample monomer Aca colors
* Fix Difference, Monomer renderers to use getMonomerTextColor
* Fix MacromoleculeCustomCellRenderer console error on onMouseLeave

## 2.15.8 (2024-10-02)

### New features

* Add use monomer lib colors for Monomer Difference Macromolecule
* Add use monomer lib colors fpr WebLogoViewer

### Bug fixes

* Fix test splitters.splitToMonomers for default monomer lib
* Fix monomer lib colors for natural monomers
* Fix monomer colors for empty monomer lib

## 2.15.7 (2024-10-02)

Adjust monomer colors for very 'white' colors.

## 2.15.6 (2024-09-27)

### Bug fixes

* Fix detectMacromolecule forbidding monomers '2,...', add test
* Fix using IMonomerLibHelper.loadMonomerLibForTests
* Fix cell renderer to reset reference sequence on reset current row
* GROK-16699: Fix PepSeA container return meaningful error messages, unskip test
* Fix test data monomers add aG, azG
* Fix unskip toAtomicLevel tests depending on HelmHelper
* Fix detectMacromolecule for harmonized sequences, add test

## 2.15.5 (2024-09-25)

### New features

* Add custom notation, fix tests
* Add overriding monomer library for toAtomicLevel

### Bug fixes

* Fix skipping tests depending on new Helm

## 2.15.4 (2024-09-24)

### New features

* Add monomer hover handling for substruct
* Add highlight param for toAtomicLevel
* Add HelmHelper parse and removeGaps methods
* Add naturalMonomerColors for monomers of MonomerLib
* Add MonomerLib.getWebEditorMonomer (for color)
* Add function Identity for Add new Column

### Bug fixes

* Fix toAtomicLevel for sequences with gaps
* Fix ISeqSplitted remove .canonicals and .originals
* Fix toAtomicLevel tests for linear with gaps

## 2.15.3 (2024-09-22)

Add monomer background coloring

## 2.15.2 (2024-09-18)

Add monomer coloring for fasta/separator from monomer library

## 2.15.1 (2024-09-10)

### Bug fixes

* Fix benchmark tests to sync calls
* Bump dependencies versions

## 2.15.0 (2024-09-04)

Monomer manager

### Features

* Add getHelm for Cyclized notation provider
* Add detector for Dimerized notation provider
* Add Monomer library manager view with duplicate preferences
* Add Monomer manager for editing/adding/removing monomers
* Add monomer lib for PolyTool rules

### Bug fixes

* Fix tests benchmark
* Fix typo Needleman-Wunsch
* Fix test flapping benchmark separatorDnaShorts50Few50
* Fix toAtomicLevel workers error DG is not defined
* Fix biosubstructure filter
* Fix SeqHandler.getHelm lost cycles, add tests
* Fix SeqlHelper.helmToAtomicLevel to work without table

## 2.14.3 (2024-08-27)

### Bug fixes

* Order Top menu
* Fix to Atomic Level hide highlight column
* Fix to Atomic Level for column
* Bump dependencies version, fix tests

## 2.14.2 (2024-08-23)

### Features

* Add highlighting monomer at atomic level

### Bug fixes

* Add tests for toAtomicLevel UI
* Fix demo Helm, MSA, Sequence Space viewer adding

## 2.14.1 (2024-08-14)

Fix monomer substitution matrix calculation

## 2.14.0 (2024-08-06)

### Features

* Add loading monomer sets from .json files

### Bug fixes

* Fix cell renderer dirty flag and reset

## 2.13.8 (2024-08-08)

* Downgrade API version

## 2.13.7 (2024-08-08)

* Adjust monomer max lengths for monomer renderer

## 2.13.6 (2024-07-29)

* SequenceChemSimilarity: warning in case reference monomer not found in monomer library

## 2.13.5 (2024-07-23)

### Bug fixes

* Fix tests for Helm package init wait
* Add detectMacromolecule tests for fasta single char unknown alphabet
* Fix detectMacromolecule checkBadMultichar wo RegExp and fail early
* Fix use allowUnionTypes to allow union types in JSON schema
* GROK-15793: Fix Calculate Identity, Similarity error Index out of bounds
* Add progress indicator for loading monomer libraries
* Fix detectMacromolecule to reject FASTA with numeric monomer

## 2.13.4 (2024-07-02)

### Bug fixes

* GROK-15798: Fix To Atomic Level for units FASTA, UN alphabet
* Fix detectMacromolecule to check for bad monomers on separator
* Fix for review camelCase properties

## 2.13.3 (2024-06-28)

### Bug fixes

* Fix MaxMonomerLength package setting, and column setting
* Fix loading monomer libs for explicit stuck from tests

## 2.13.2 (2024-06-26)

### Features

* Add package settings for MonomerWidthMode

### Bug fixes

* Fix cell renderer for long mode
* Fix Cell Renderer column widget for MonomerWidthMode
* Enable package settings editor widget

## 2.13.1 (2024-06-25)

Bump dependencies versions JSDraw.Lite and HELMWebEditor

## 2.13.0 (2024-06-24)

### Bug fixes

* PolyTool: files moved to SequenceTranslator
* GROK-15994: Bio: Color missing monomers
* Use types from js-draw-lite, helm-web-editor
* Fix error on access to MaxMonomerLength package settings
* Fix getMonomer for PolymerType unspecified as any
* Fix monomer lib validation
* GROK-15995: Colors for libraries monomers
* Fix error on open Manage Monomer Libraries
* Fix WebLogo in a column header tooltip

## 2.12.23 (2024-05-30)

### Bug fixes

* to Atomic level: fix the issue with isotopes

## 2.12.22 (2024-05-28)

### Bug fixes

* GROK-15525: MSA: Add check unsuitable data to avoid running MSA with them
* GROK-15796: Bio: Fix cell renderer for convert to Helm
* GROK-15798: Bio: Fix To Atomic Level for units FASTA and alphabet UN
* Fix converter MSA to fasta invalid tags, fix tests

## 2.12.21 (2024-05-20)

Fix cell renderer for column width changed

## 2.12.20 (2024-05-16)

### Bug fixes

* Fix monomer tooltip layout
* Fix monomer name for gaps and any monomer

## 2.12.19 (2024-05-16)

### Bug fixes

* Fix tests cell renderer monomer placer for default monomer lib
* Add tests for monomer placer hitBounds
* Fix cell renderer to limit for visible monomers
* Fix MacromoleculeColumnWidget to limit WebLogo for visible
* Fix WebLogo to limit seq splitting on end position specified
* GROK-15678: Bio: Fix bio-substructure-filter tests on Helm
* GROK-15293: Fix MSA Dialog error while picking empty value in Sequence

## 2.12.18 (2024-05-13)

### Bug fixes

Bio: Fix MonomerLibManager composition with files and events
Bio: Unveil cell renderer errors for tests

## 2.12.17 (2024-05-01)

### Features

* Add MonomerLib.getSummary
* Use Pistoia typization

### Bug fixes

* Fix rendering on grid and without (row tooltip, scatter plot)

## 2.12.16 (2024-04-25)

Bio: Fix crushing substructure filter.

## 2.12.15 (2024-04-19)

Bio: Some optimization in Polytool

## 2.12.14 (2024-04-18)

Bio: Fixed stereochemistry in Polytool

## 2.12.13 (2024-04-15)

Bio: Fix cell renderer for scatter plot, add test

## 2.12.12 (2024-04-15)

### Features

* Polytool: working with molV3000

## 2.12.11 (2024-04-12)

### Features

* Add displaying a monomer's origin lib

### Bug fixes

* Fix the cell-renderer tooltip not showing a hovered monomer

## 2.12.10 (2024-04-11)

### Bug fixes

* Bio: Fix detector for non-fasta seqs of the same length

## 2.12.9 (2024-04-10)

### Bug fixes

* Fix SDF to JSON for Biovia lib

## 2.12.8 (2024-04-09)

### Features

* To atomic level: STEABS block contains less than 80 symbols per row

## 2.12.7 (2024-04-08)

### Features

* Ability to link monomers in molV3000 format

## 2.12.6 (2024-04-07)

### Bug fixes

* Fix detectMacromolecule to invalidate on custom notation

## 2.12.5 (2024-04-05)

### Features

* Add KNN computation on webGPU for UMAP (sequence space).

## 2.12.4 (2024-04-05)

### Features

* Add support for custom notations, splitters
* Add notation provider, splitter for cyclized macromolecules

### Bug fixes

* Fix cell renderer for original and tooltip with canonical
* Fix WebLogo for positions out of seq length

## 2.12.3 (2024-04-03)

Updated version of openchemlib in dependencies

## 2.12.2 (2024-04-03)

Harmonized MM distance function with monomer similarity matrices.

## 2.12.1 (2024-04-02)

### Bug fixes

* Fix bioSubstructureFilter with two columns
* Fix bioSubstructureFilter error on filters reopen
* GROK-15292: Fix bioSubstructureFilter for reset

## 2.12.0 (2024-03-30)

### Features

* #2707: Add original and canonical to monomer

## 2.11.42 (2024-03-27)

### Bug fixes

* Fix MacromoleculeColumnWidget error with WebLogo disabled
* Fix WebLogo for GAP_SYMBOL
* Fix CompositionAnalysisWidget for gaps

## 2.11.41 (2024-03-26)

### Features

* Polytool: ability to use special engine to create molV3000 with CFG flags in the atoms block

## 2.11.40 (2024-03-22)

### Features

* Polytool rules file handling

## 2.11.39 (2024-03-11)

### Bug fixes

* GROK-15150: Fix display hidden/showed inputs

## 2.11.38 (2024-03-08)

### Bug fixes

* GROK-14910: PepSeA verbose output
* MSA ensures docker container for PepSeA
* Sample files harmonized

## 2.11.37 (2024-03-08)

### Bug fixes

* Check Bio publishing, PepSeA docker

## 2.11.36 (2024-02-28)

### Bug fixes

* GROK-15086: Fix GetRegion, Notation: result column does not render

## 2.11.35 (2024-02-26)

### Features

* #2706: Polytool: init rule based generation

## 2.11.34 (2024-02-20)

### Bug fixes

* Downgrade datagrok-api dependency version to 1.17.4

## 2.11.32 (2024-02-20)

### Bug fixes

* GROK-11982: Bio: Fix duplicates WebLogo on layout, test
* GROK-11983: Bio: Fix duplicates WebLogo on project, test

## 2.11.31 (2024-02-19)

### Features

* GROK-14230: Bio: Add basic UI for monomer lib files adding / validation

## 2.11.30 (2024-02-15)

### Features

* GROK-14598: Bio: Substructure filter sync between cloned views, tests

### Bug fixes

* GROK-14916: Bio: Fix biosubstructure filter for sequences of Helm
* GROK-14913: Bio: Fix To Atomic Level for sequences with gaps, tests

## 2.11.28 (2024-02-07)

### Features

### Bug fixes

* Fix detectMacromolecule allowing double quoted sequences and gaps.
* Fix for min seq length 10, tests.
* Fix user library settings for tests
* Fix test substructureFilter/helm
* Fix README.md images, GIFs size

## 2.11.0 (2023-10-25)

### Features

* Add VdRegionsViewer `filterSource` property.
* Add ToAtomicLevel for non-linear HELM structures.
* Add WebLogo aggregation function.
* Add WebLogo position tooltip with composition table (for count).
* Add PolyTool with Helm2Molfile support

### Bug fixes

* Fix GetRegion to detect semantic type and renderer for created column.
* Fix GetRegion dialog column name field for default value.
* Fix WebLogo viewer for gaps with Helm.
* Fix cell renderer for empty values MSA.
* Fix detectMacromolecule to ignore empty seqs.
* Add property fitWidth for VdRegionsViewer.
* Fix VdRegionsViewer fit width accounting position margin of WebLogo.
* Fix similarity/diversity viewer tests.
* Fix reset filters for Substructure Search filter.
* Fix Macromolecule cell renderer width limit for `devicePixelRatio` less than 1.
* Fix VdRegionsViewer `positionHeight` transmit to enclosed WebLogo.
* Fix added by Split to monomers columns to be not used as a filter.
* Fix WebLogo with `filterSource` of `Selection` to work from project.
* Fix WebLogo with `filterSource` of `Selection` display all in case of empty selection.
* Fix VdRegionsViewer for initial `filterSource`.
* Fix Macromolecule cell render to skip on closed grid.
* Fix WebLogoViewer for empty column (annotated).
* Fix WebLogoViewer and VdRegionsViewer deadlock.
* Fix Activity Cliffs error on Helm dataset
* Fix Macromolecule tooltip, context widget for detach
* Fix WebLogo optimize with postponed update positions
* Fix error in bioSubstructureFilter for Helm

## 2.10.0 (2023-09-06)

### Features

* GetRegion for Macromolecule:
  * Added dialog Top menu Bio | Convert | GetRegion.
  * Added maintaining `.positionNames` tag for GetRegion derived column.
  * Added using `.regions` tag annotation for GetRegion dialog.

### Bug fixes

* Fixed UnitsHandler.posList length.
* Fixed mistyping top menu path for Identity scoring.
* Fixed Get Region missed in short top menu.
* Fixed tests detectMacromoleculeBenchmark to specify test failed.

## 2.9.0 (2023-08-30)

### Features

* WebLogo: add property `showPositionLabels`.
* WebLogo: optimized with `splitterAsFastaSimple`.
* WebLogo: disable `userEditable` for `fixWidth`.
* VdRegionsViewer: optimized preventing rebuild on `positionWidth` changed and resize.
* VdRegionsViewer: to fit WebLogo enclosed on `positionWidth` of value 0.
* Introduced sequence identity and similarity scoring.

### Bug fixes

* Fix vdRegionsViewer viewer package function name consistency.
* GROK-13310: Bio | Tools: Fix Split to monomers for multiple runs.
* GROK-12675: Bio | Tools: Fix the Composition dialog error on the selection column.
* Allow characters '(', ')', ',', '-', '_' in monomer names for fasta splitter.
* WebLogo: Fix horizontal alignment to the left while `fixWidth``.
* WebLogo: Fix layout for `fixWidth`, `fitArea`, and normal modes.
* VdRegionsViewer: Fix postponed rendering for tests.
* MacromoleculeDifferenceCellRenderer: Fix to not use `UnitsHandler`.

## 2.8.2 (2023-08-01)

This release focuses on improving the monomer cell renderer.

*Dependency: datagrok-api >= 1.13.3*

### Features

* Added sample datasets for natural and synthetic peptide sequences.
* Added sample dataset for cyclic sequences with HELM notation.

### Bug fixes

* GROK-13659: Bio | Tools: Fix MaxMonomerLength for Macromolecule cell renderer.

## 2.8.1 (2023-07-24)

This release focuses on improving the monomer cell renderer.

*Dependency: datagrok-api >= 1.13.3*

### Features

* Monomer cell renderer now defaults to 6 characters per monomer.

## 2.8.0 (2023-07-21)

This release focuses on improving feature stability and usability.

*Dependency: datgarok-api >= 1.13.3*

### Features

* Add Copy group to Macromolecule cell context menu.
* Add DefaultSeparator package property settings.

### Bug Fixes

* Fix VdRegionsViewer filter source checkbox tooltip, workaround.

## 2.7.2 (2023-07-21)

This release focuses on improvements and bug fixes.

*Dependency: datagarok-api >= 1.13.3*

### Features

* Set default values in all dialogs where appropriate.
* Detected Helm monomer type for separator data and made it usable for MSA.
* Added alignment options to **Kalign**.
* Added separator support for **Sequence Space** and **Activity Cliffs**.
* Tooltip: shows monomer atomic structure for macromolecules.
* For macromolecule cells, added the ability to show composition ratios in the property panel.
* **Top menu**: organized the items into groups **SAR**, **Structure**, **Atomic level**, and **Search**.

### Bug Fixes

* GROK-13048: Activity cliffs identification for macromolecules.
