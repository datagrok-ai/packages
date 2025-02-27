# bio changelog

## 5.50.1 (2025-02-20)

Remove helm dependency in toAtomicLevel for Linear sequences

## 5.50.0 (2025-02-20)

Support toAtomicLevel and POM conversion for all notations

## 5.49.1 (2025-02-17)

Fix helm splitter for marginal cases

## 5.49.0 (2025-02-17)

To-Tomic-level support for RNA/DNA sequences

## 5.48.3 (2025-02-05)

Remove healthCheck method from the IAutoDockService interface

## 5.48.2 (2025-01-22)

Async renderer caching improvement

## 5.48.1 (2025-01-22)

Improve cell renderer in non grid places

## 5.48.0 (2025-01-21)

Async grid renderer support for other places than grid

## 5.47.2 (2024-01-07)

Use gCell bounds to remove scroll dependency in CellRendererAsyncBase

## 5.47.1 (2024-12-30)

Moved bio substructure filter types from Bio package to bio library

## 5.46.2 (2024-12-23)

Add healthCheck method to the IAutoDockService interface

## 5.46.1 (2024-12-02)

Add terminate method to the IAutoDockService interface

## 5.46.0 (2024-11-19)

Sequence renderer: Support font resize

## 5.45.11 (2024-11-15)

Async cell renderer correct invalidation

## 5.45.10 (2024-11-07)

Remove the startDockerContainer method from the IAutoDockService interface

## 5.45.9 (2024-11-01)

Unknown pallete correct initialization

## 5.45.8 (2024-11-01)

Correct loading of unknown pallete

## 5.45.7 (2024-11-01)

Unknown pallete correct initialization

## 5.45.6 (2024-10-31)

### Bug fixes

* Fix SeqValueBase adding seqHandler, getSplitted, helm
* Fix HelmInputBase for SeqValueBase
* Fix ISeqHandler adding getHelm, splitter
* Fix INotationProvider adding setUnits, getHelm

## 5.45.5 (2024-10-24)

### Bug fixes

* Fix splitterAsHelm for multiple simple polymers
* Fix IHelmHelper adding .seqHelper
* Fix exporting HWE IBio, HelmBio

## 5.45.4 (2024-10-22)

### Bug fixes

* Fix ISeqHandler getValue of type MacromoleculeValueBase
* Fix CellRendererAsyncBase for LRU imageCache, cacheEnabled

## 5.45.3 (2024-10-16)

### Bug fixes

* Fix splitterWithSeparator
* Fix MonomerPlacer onMouseMove handling

## 5.45.2 (2024-10-11)

### Bug fixes

* Fix moving setUnits methods to ISeqHelper
* Fix dependencies version

## 5.45.1 (2024-10-11)

### Bug fixes

* Fix ISeqHelper adding getSeqMonomers

## 5.45.0 (2024-10-10)

### New features

* Add SeqHelper factory for SeqHandler moving to the Bio package

### Bug fixes

* Fix toAtomicLevel for monomers without peptide bond (NH2)
* Fix createHelmWebEditor drawOptions to options
* Fix MonomerPlacer to get tooltip from overridden monomer lib
* Fix Helm cell renderer props adding overridden monomer lib
* Fix monomer lib loading timout on palettes

## 5.44.5 (2024-10-03)

### Bug fixes

* Fix MonomerPlacer to use IMonomerLibBase.getMonomerTextColor
* Fix MonomerPlacer for changed column settings
* Fix MonomerPlacer for original monomer symbol
* Fix SeqHandler .isSeparator to account column tag

## 5.44.4 (2024-10-02)

### New features

* Add use monomer colors from monomer lib for MonomerPlacer

### Bug fixes

* Fix splitAlignedSequences for canonical monomer symbol
* Fix monomer colors for empty monomer lib
* Fix for grok.userSettings
* Fixes for eslint

## 5.44.3 (2024-10-02)

Correct color for monomer lib configs

## 5.44.2 (2024-09-27)

### New features

* Add IMonomer .override method
* Add IMonomerLibHelper .loadMonomerLibForTests method

### Bug fixes

* Fix cell renderer monomer placer to handle currentRow reset
* Fix test Helm HelmHelper.removeGaps

## 5.44.1 (2024-09-25)

### New features

* Add IMonomerLibBase interface for overriding libraries
* Add custom notation for sequences

## 5.44.0 (2024-09-24)

### New features

* Add monomer hover link
* Add getMolHighlight to build ISubstruct from monomer map
* Add HelmHelper parse and removeGaps methods

### Bug fixes

* Fix toAtomicLevel for sequences with gaps
* Fix toAtomicLevel for polymerType of sequence monomer
* Fix ISeqMonomer for biotype and add position
* Fix ISeqSplitted remove .canonicals and .originals
* Fix IMonomerLib .getTooltip for biotype of HelmType
* Fix toAtomicLevel linear for sequences with gaps

## 5.43.1 (2024-09-22)

Add monomer background coloring

## 5.43.0 (2024-09-18)

Add coloring from monomer library to separator/fasta renderer

## 5.42.15 (2024-09-10)

### Bug fixes

* Fix default lib summary for tests

## 5.42.14 (2024-09-04)

### Bug fixes

* Fix toAtomicLevel workers error DG is not defined
* Fix SeqHandler.getHelm lost cycles, add tests`
* Add options for SeqHandler.getHelm
* Fix default monomer libs for PolyTool rules

## 5.42.13 (2024-09-02)

* Add interfaces for monomer management

## 5.42.12 (2024-08-30)

Add getHelm to SeqHandler and INotationProvider

## 5.42.11 (2024-08-24)

### Bug fixes

* Bump HWE dependencies versions
* Fix for user settings for publish

## 5.42.10 (2024-08-23)

### Features

* Add SeqHandler

## 5.42.9 (2024-08-16)

### Features

* HWE option for continuous monomer numbering
* Add HelmInput mouse events redraw, showTooltip
* Bump HWE dependencies versions

## 5.42.8 (2024-08-14)

Fix monomer substitution matrix calculation

## 5.42.7 (2024-08-12)

### Features

* Monomer sets defined with .json files

### Bug fixes

* Fix cell renderer base dirty flag and reset

## 5.42.6 (2024-07-29)

### Features

* sequenceChemSimilarity: warning in case reference monomer not found in monomer library

## 5.42.5 (2024-07-23)

### Features

* Add IHelmHelper.createHelmInput, ui.input.helmAsync

### Bug fixes

* Fix identity scoring for seqs of different lengths

## 5.42.4 (2024-07-02)

Fix types ISeqMonomer from Helm

## 5.42.3 (2024-06-26)

### Bug fixes

* GROK-15996: Fix cell renderer for long mode
* Fix package-lock.json

## 5.42.2 (2024-06-25)

Bump dependencies versions JSDraw.Lite and HELMWebEditor

## 5.42.1 (2024-06-24)

Fix for JSDraw types

## 5.42.0 (2024-06-21)

Use types of forked JSDraw.Lite and HELMWebEditor

## 5.41.12 (2024-06-12)

### Bug fixes

* Fix .pdbqt to .pdb sorting atoms, add tests
* Fix cell renderer async base to reset errorCount

## 5.41.11 (2024-06-11)

### Bug fixes

Fix Pdbqt parser to assume ROOT as MODEL
Fix Pdbqt.toPdb sorting atoms, tests

## 5.41.10 (2024-06-10)

NGL typings

## 5.41.9 (2024-05-29)

Fix Monomer type

## 5.41.8 (2024-05-29)

Fix TAGS, ALPHABET enum

## 5.41.7 (2024-05-28)

### Bug fixes

* GROK-15796: Bio: Fix to Helm cell renderer for convert to Helm

## 5.41.6 (2024-05-20)

Fix monomer placer optimization for column width changed

## 5.41.5 (2024-05-16)

Fix separator splitter to ceil splitter limit
Add seq generator for various notations

## 5.41.4 (2024-05-15)

Move long/many sequence generators to bio lib
Fix SeqHandler setTags optimizing call getStats

## 5.41.3 (2024-05-15)

Fix cell renderer monomer placer hit test

## 5.41.2 (2024-05-13)

### Bug fixes

Fix MonomerLib.getSummary for backward compatibility
Fix cell renderer async base for sync rendering

## 5.41.1 (2024-05-13)

### Features

* Add types for Helm Web Editor

### Bug fixes

* Unveil cell renderer errors for tests
* Fix cell renderer for StackOverflow error on long seqs
* Optimize SeqHandler.getSplitter for split limit (separator)

## 5.41.0 (2024-05-01)

Optimize cell renderer on async renderer base

### Features

* Use ImageData for cell image cache instead of toDataURL string
* Add aux to RenderTask.onAfterRender callback (for interactivity)
* Add cell sync render cell from cache while resizing
* Prioritize render queue by task consumer id and callback
* Add types for Pistoia Helm Web Editor

### Bug fixes

* Fix rendering on grid and without (row tooltip, scatter plot)

## 5.40.8 (2024-04-16)

Fix monomer placer destroying

## 5.40.7 (2024-04-15)

Invalidate monomer placer cache on monomer lib changed

## 5.40.6 (2024-04-11)

### Features

* Add displaying a monomer's origin lib

## 5.40.5 (2024-04-10)

### Bug fixes

* Fix SDF to JSON for Biovia lib

## 5.40.4 (2024-04-09)

### Features

* Modified STEABS block generation when linking monomers (adding not more than 80 symbols per row)

## 5.40.3 (2024-04-08)

### Features

* Ability to link monomers in molV3000 format
* Adding STEABS block when linking monomers

## 5.40.2 (2024-04-07)

### Bug fixes

* Fix SeqHandler for column version

## 5.40.1 (2024-04-05)

### Features

* Add support for custom notations, splitters

### Bug fixes

bio: Fix monomer placer to render original monomers
bio: Fix SeqHandler.getRegion for out of seq length

## 5.40.0 (2024-03-30)

### Features

* #2707: Add original and canonical to ISeqSplitted

### Bug fixes

* Bio: Fix SeqHandler.splitted cache for changing data
* Bio: Fix SeqHandler.forColumn temp cache for changing column

### Breaking changes

* Rename UnitsHandler to SeqHandler, .getOrCreate() to forColumn()

## 5.39.29 (2024-03-07)

### Features

* Add NEWICK_EMPTY const

## 5.39.28 (2024-03-04)

### Bug fixes

* GROK-15086: Fix GetRegion, Notation: doesn't work

## 5.39.27 (2024-02-20)

### Bug fixes

* Downgrade datagrok-api dependency version fixed to 1.17.4

## 5.39.26 (2024-02-20)

### Bug fixes

* Downgrade datagrok-api dependency version to 1.17.4

## 5.39.24 (2024-02-14)

### Features

* Add HelmHelper, types for Helm WebEditor

### Bug fixes

* Fix To Atomic Level for sequences with gaps

## 5.39.20 (2024-01-29)

### Features

* Routines to check viewer for IViewer, IRenderer

## 5.39.19 (2024-01-26)

### Features

* Store errors of postponed rendering for tests

## 5.39.0 (2023-10-25)

### Features

* Add VdRegionsViewer `filterSource` property.
* Add WebLogo `valueAggrType`, `valueColumnName` properties.
* Add routines to get/set user monomer library settings.
* Add Molecule3DUnitsHandler
* Move NGL typings to bio lib
* Move pdb, pdbqt parser to bio lib
* Add IAutoDockService checkOpenCl, dockLigandColumn
* Add Molecule, Molecule3D units handler getAsPdb
* Add IHelmWebEditor

### Bug fixes

* Fix getSplitterWithSeparator for empty seq.
* Fix MonomerPlacer getPosition for empty seq.
* Move maxMonomerLength from column's temp to tags
* Add property fitWidth for VdRegionsViewer
* Fix UnitsHandler to not replace existing tags
* Fix VdRegionsViewer fit width accounting position margin of WebLogo
* Fix UnitsHandler to allow empty alphabet if annotated with tag.
* Fix UnitsHandler.maxLength to be zero for empty data.
* Fix monomer lib handler for PolyTool
* Fix splitter with separator for quoted gaps
* Fix default value for pdbTag prop of Biostructure
* Fix biostructure data provider to return JSON string

## 5.38.0 (2023-09-06)

### Features

* Add UnitsHandler `maxLength`, `posList`, `splitter` properties.
* Add UnitsHandler `getJoiner`, `getConverter` methods, granulate joiners and converters methods.

### Breaking changes

* Remove NotationConverter class, merge functionality into UnitsHandler.

## 5.37.0 (2023-08-30)

### Features

* Added `calculateSimilarity` and `calculateIdentity` functions.
* Added `calculateScores` function.

## 5.36.1 (2023-08-18)

### Bug fixes

* Restore utils `getSplitter` method, it is required for MacromoleculeDifference column.

## 5.36.0 (2023-08-10)

This release introduces chemical sequence similarity functionality.

### Features

* Added `sequenceChemSimilarity` function.

## 5.35.0 (2023-08-06)

Optimize with splitterAsFastaSimple returning ISeqSplitted allowing to speed up processing of
single character alphabets.

### Breaking changes

* SplitterFunc now returns `ISeqSplitted` instead of `string[]`.

### Features

* Add WebLogo property showPositionLabels.

## 5.34.1 (2023-08-01)

Patch release for a small fix for the Macromolecule cell renderer.

### Bug fixes

* GROK-13659: Bio | Tools: Fix MaxMonomerLength Macromolecule cell renderer.

## 5.34.0 (2023-07-21)

This release focuses on improving usability.

### Features

* Added `NotationConverter.getConverter()` getting a function to convert a single value.

### Breaking change

* Removed `NotationConverter.convertStringToHelm()`.
