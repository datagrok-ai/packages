# bio changelog

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
