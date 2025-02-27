# Sequence Translator changelog

## 1.8.0 (2025-02-20)

* Support for enumeration in all notations
* fallback for polytool convert
* Corrected highlighting

## 1.6.5 (2024-12-01)

### New features

* PolyTool: highlight in mol based on given notation
* PolyTool: Rule manager enhancements

### Bug fixes

* PolyTool fix R3, R4 and elder groups capping

## 1.6.4 (2024-11-27)

* PolyTool: linearization of single sequence molecules
* Enumerator: Added whole library enumeration

## 1.6.3 (2024-11-22)

Moved Context menu items to detector

## 1.6.2 (2024-11-17)

### New features

* PolyTool rule manager enhancement
* Sequence renderer font resizing

## 1.6.1 (2024-11-15)

### Bug fixes

* PolyTool fix default options
* PolyTool fix explicit carbon cut

## 1.6.0 (2024-11-14)

### New features

* Add PolyTool work with sinthetic monomers

## 1.5.3 (2024-11-06)

### Bug fixes

* PolyTool fix rules empty specification (all monomers undergo)

## 1.5.2 (2024-11-06)

### Bug fixes

* PolyTool rules several instances bug fix

## 1.5.1 (2024-11-06)

### Bug fixes

* PolyTool rules fixes rule management
* PolyTool rules fixes crash if monomer is absent

## 1.5.0 (2024-11-04)

### New features

* Add PolyTool interface for rule management

## 1.4.10 (2024-11-01)

### Bug fixes

* Fix build

## 1.4.9 (2024-10-31)

### Bug fixes

* Fix package initializing helmHelper
* Fix Chain using HelmAtom.bio of type PtBio
* Fix PT Enumerate dialog for harmonized sequences
* Fix PT Enumerate for monomer hovering
* Fix PT Enumerate for historical values
* Fix PT Enumerate adding buildCyclizedMonomerHoverLink, WIP
* Fix adding CyclizedGridCellRenderBack

## 1.4.8 (2024-10-25)

### Bug fixes

* PolyTool ambigous R groups handling bug

## 1.4.7 (2024-10-25)

### Bug fixes

* PolyTool ambigous R groups handling bug

## 1.4.6 (2024-10-25)

### New features

* Add PolyTool Enumerate for harmonized sequences
* PolyTool ambigous R groups handling

### Bug fixes

* Fix PolyTool chain, add check consistency, add tests
* Fix PolyTool Convert tests
* Fix the package init

## 1.4.5 (2024-10-11)

### Bug fixes

* Fix for grok.userSettings
* Fix moving support custom notation harmonized sequence
* Fix PT Convert for monomer highlighting
* Fix PT Convert reaction monomer colors
* Fix PT detectors adding tests
* Bump dependencies versions

## 1.4.4 (2024-09-30)

### New features

* Add convert with reaction rules

### Bug fixes

* Fix sample reaction rule and monomer order
* Fix isolate PolyTool convert error on row
* Fix adding test for Chain .fromNotation
* Fix adding test toAtomicLevel getNewMonomer

## 1.4.3 (2024-09-27)

### Features

* Add PolyTool convert reverse

### Bug fixes

* Add sample reaction rule aG + azG = GGaz, test data
* Fix using MonomerLibHelper.loadMonomerLibForTests
* Add test toAtomicLevel with overridden monomer lib
* Fix PolyTool Enumerate for zero-based monomer position
* Fix Chain.getHelm square brackets for multi char symbols

## 1.4.2 (2024-09-24)

### New features

* Add PolyTool breadth enumerator

## 1.4.1 (2024-09-12)

### Bug fixes

* Input style fixes

## 1.4.0 (2024-09-10)

### Features

* Add PolyTool Enumerator Chem dialog to context menu for Molecule

### Bug fixes

* Fixes for PolyTool Enumerator Helm dialog
  * Trivial Name input Behavior
  * Enable for any Macromolecule cell
  * Example with monomers existing in default monomer lib
* Fixes for datagrok-api changes
* Add sample cyclized.csv for rules_examples.json
* Fix PolyTool Convert, add tests cyclized
* Fix PolyTool enumerate add progress indicator
* Fixes for api changes
* Fix PT dialogs destroy on build fail
* Fix rules_examples for NH2-D with R3 and syclized sample
* Fix polyToolConvert to work without table
* Add tests for polyToolConvert, ui

## 1.3.14 (2024-09-02)

Fix remove CyclizedNotationProvider

## 1.3.13 (2024-08-19)

### Features

* Improve PolyTool Enumerate Dialog
  * Add check and warning for substituting missed monomers
  * Add flag to keep the original molecule in the result
  * Add choice to select a molecule id and generate derivative

### Bug fixes

* Fix PolyTool Enumerate dialog hanging on monomer click
* Fix user settings for publish

## 1.3.12 (2024-08-16)

PolyTool Enumerator Single and Matrix, dialog, tests

### Bug fixes

* PolyTool Enumerator dialog grid input for placeholders, to atomic level option
* PolyTool Enumerator dialog mouse interactivity, to atomic level, dialog size
* PolyTool Enumerator dialog size and fit molecule input

## 1.3.11 (2024-07-31)

### Features

* Added chemical based enumerator

## 1.3.10 (2024-07-29)

### Features

* Add 'Create/Modified' date metadata to patterns

### Bug fixes

* Load new patterns upon saving / overwriting

## 1.3.9 (2024-07-23)

* Dependency: datgarok-api >= 1.20.0

## 1.3.8 (2024-07-09)

### Features

* Add PolyTool-enumerate context menu for macromolecule cell

### Bug fixes

* Use HelmInput from Helm
* Bump dependencies versions

## 1.3.7 (2024-07-01)

### Bug fixes

* Fix style for colored text input

## 1.3.6 (2024-06-26)

### Bug fixes

* Fix bulk input in Pattern app

## 1.3.5 (2024-06-13)

### Features

* PolyTool Enumeration: cell with helm is added to the input

## 1.3.4 (2024-06-12)

### Bug fixes

* Fix terminal modification SVG rendering

## 1.3.3 (2024-06-12)

### Bug fixes

* Fix terminal modification SVG rendering

## 1.3.2 (2024-06-10)

### Features

* Add package MonomersPath package settings fallback to monomers-sample
* Add README for monomers-sample
* Add sample for bulk translation in Translator app

### Bug fixes

* Fix tests for MonomersPath package settings

## 1.3.1 (2024-06-05)

### Bug fixes

* PolyTool: example data added to project

## 1.3.0 (2024-03-30)

### Features

* PolyTool: algorithm of conversion facilitated, json files are used as rules
* PolyTool: enumeration feature (demo) added

## 1.2.9 (2024-03-30)

### Features

* #2707: Add original and canonical to monomer

## 1.2.7 (2024-01-29)

### Features

* Bulk translation for formats

## 1.2.6 (2024-01-29)

### Bug fixes

* Fixed column input in Pattern
* Fixed whitespaces in molfiles

## 1.2.0 (2023-10-27)

### Features

* Tabs implemented as separate apps
* Clear buttons added to sequence inputs

## 1.1.4 (2023-09-07)

### Bug fixes

* Fixed molfile direction for AS and AS2 on SDF tab

## 1.1.3 (2023-09-07)

### Bug fixes

* Fixed Direction of AS and AS2 for SDF tab

## 1.1.2 (2023-08-16)

### Bug fixes

* Fixed HELM generation for modifications

## 1.1.1 (2023-08-10)

### Features

* Updated dependencies

## 1.1.0 (2023-07-26)

* Dependency: datgarok-api >= 1.15.2

### Features

* Option to add extra formats for translation in addition to `Axolabs`, `BioSpring` and `MerMade12`
* Generation of HELM strings
* Improved SMILES generation
* UI/UX adjustments
