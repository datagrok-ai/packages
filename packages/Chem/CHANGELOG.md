# Chem changelog

## 1.8.10 (2024-01-17)

### Features

* Molecule labels on scatter plot zoom in Chemical Space and Activity Cliffs

### Bug Fixes

* [#2626](https://github.com/datagrok-ai/public/issues/2626): Unexpected warning on adding child node to the scaffold tree if parent contains 'H' atom
* [#2628](https://github.com/datagrok-ai/public/issues/2628): Structure filter is not applied in some cases when there are two views opened
* [#2629](https://github.com/datagrok-ai/public/issues/2629): Structure filter filters out all molecules in the presence of filter-by-zoom scatterplot and multiple views

## 1.8.9 (2024-01-09)

### Features

* Update MinimalLib to 1.2.15 featuring support for RGroups (support for R-group decomposition)
* Chem: Add ability to specify fingerprint types and cluster embeddings for chemical space

### Bug Fixes

* GROK-14383: Chem | Scaffold Tree: The selection doesn't change on folder node click
* GROK-14411: Demo: Exception while closing Scaffold Tree
* GROK-14409: Chem | R-Group Analysis: Error with prefix
* GROK-14375: Chem | Activity cliffs: Implement scatter plot lines renderer
* [#2612](https://github.com/datagrok-ai/public/issues/2612): Chem | Scaffold tree: Structure part containing H atom is replaced with '?' in some cases

## 1.8.8 (2023-12-07)

### Bug Fixes

* Chem: Fix demos for scaffold tree, chemical databases and similarity/diversity search.

## 1.8.7 (2023-12-05)

### Features

* [#2550](https://github.com/datagrok-ai/public/issues/2550): Chem: Scaffold Tree: Counter is not updated when applying the filters
* [#2525](https://github.com/datagrok-ai/public/issues/2525): Chem: Scaffold Tree: Highlighting improvements:
  * More specific fragments should be drawn on top
  * New icons for different coloring states

### Bug Fixes

* [#2536](https://github.com/datagrok-ai/public/issues/2536): Chem: Substructure Filter: Not terminated on fiter reset
* [#2553](https://github.com/datagrok-ai/public/issues/2553): Chem | Scaffold tree: Realignment issue when the scaffold color is set
* GROK-14305: Chem | Scaffold Tree: Error when deleting rows in grid

## 1.8.6 (2023-11-17)

### Bug Fixes

* [#2525](https://github.com/datagrok-ai/public/issues/2525): Chem: Scaffold tree: Highlighting improvements:
  * Add a tooltip for the checkbox
  * Add a tooltip for NOT
* [#2526](https://github.com/datagrok-ai/public/issues/2526): Chem: Molecules realignment improvements:
  * Scaffold tree shouldn't reorient molecules in the grid
* [#2533](https://github.com/datagrok-ai/public/issues/2533): RdKitService stays unresponsive as terminateFlag is not reset after substructure search has completed

## 1.8.5 (2023-11-14)

### Features

* [#2459](https://github.com/datagrok-ai/public/issues/2459): Chem: Scaffold Tree: Improvements:
  * Add resetting the scaffold tree viewer (on the reset filter click)
  * Add a tooltip for removing orphans

### Bug Fixes

* [#2511](https://github.com/datagrok-ai/public/issues/2511): Scaffold tree: highlighting is not updated when structure is edited
* [#2512](https://github.com/datagrok-ai/public/issues/2512): Filtering options (contains, exact, included in etc.) are not synchronised for structure filters on different tabs in some cases

## 1.8.4 (2023-11-07)

### Features

* [#2459](https://github.com/datagrok-ai/public/issues/2459): Chem: Scaffold Tree: Improvements:
  * The “trash can” icon is red and stands out from the general style; make a blue one from the same collection
  * Add Expand All/Collapse All icons for easy navigation
  * Save the state of the tree (what was selected, what was expanded) when saving
* [#2420](https://github.com/datagrok-ai/public/issues/2420): Chem | Scaffold tree coloring:
  * use the trash iscon instead of '-'

### Bug Fixes

* [#2474](https://github.com/datagrok-ai/public/issues/2474): Chem | Scaffold tree: Colour is not inherited by child node properly
* [#2476](https://github.com/datagrok-ai/public/issues/2476): Chem | Scaffold tree: Rows are shown as filtered for a while after applying structure even if checkbox is not selected
* [#2448](https://github.com/datagrok-ai/public/issues/2448): Some structures are displayed incorrectly when highlighted if they are in SMILES format
* [#2473](https://github.com/datagrok-ai/public/issues/2473): Structure filter: 'current value > use as filter' breaks filtering in some cases

## 1.8.3 (2023-10-26)

### Features

* [#2421](https://github.com/datagrok-ai/public/issues/2421): Chem | Molecular Search options:
  * Add some hint to explain the new options to users
  * Fix the ability to collapse the controls after switching from Similarity to Contains
  * Make the icon more noticeable
* [#2420](https://github.com/datagrok-ai/public/issues/2420): Chem | Scaffold Tree coloring:
  * The custom coloring should override the default one
  * Coloring for child structures - it's very inconvenient that you can't click the icon again to return to the custom color
  * Add the icon for removing the specific node of the scaffold tree

### Bug Fixes

* [#2399](https://github.com/datagrok-ai/public/issues/2399): Scaffold tree viewer: coloring can't be saved to the Layout
* [#2450](https://github.com/datagrok-ai/public/issues/2450): Scaffold tree imported from file is not restored on applying saved layout
* [#2448](https://github.com/datagrok-ai/public/issues/2448): Some structures are displayed incorrectly when highlighted if they are in SMILES format

## 1.8.2 (2023-10-22)

### Bug Fixes

* GROK-14149: Add progress indicator to sequence/chem space and remove jumping points

## 1.8.1 (2023-10-16)

### Bug Fixes

* [#2399](https://github.com/datagrok-ai/public/issues/2399): Scaffold Tree: Coloring can't be saved to the Layout
* [#2400](https://github.com/datagrok-ai/public/issues/2400): Molecular search: Three dots infinite loading

## 1.8.0 (2023-08-09)

### Features

* GROK-13817: Highlighting multiple substructures with different colors inside one molecule structure
* [#2355](https://github.com/datagrok-ai/public/issues/2355): Integrate Scaffold Tree with color-coded fragments
* GROK-13993: Fast Chemical space on large datasets (> 20k)  using sparse matrix
* GROK-13994: Implemented filter by superstructure, exact structure, similarity score
* GROK-13966: Exposed fingerprints options for similarity, diversity search

## 1.7.2 (2023-09-05)

### Bug Fixes

* Chem: Scaffold Tree: Checkbox shouldn't be set, when group is expanded
* Chem: Scaffold Tree: Fix the behaviour of allowGenerate property

## 1.7.1 (2023-08-31)

### Features

* GROK-13571: Chem | Ability to terminate substructure search if substructure has been changed

### Bug Fixes

* GROK-13327: Chem | Substructure Search: two identical panels open on the Filter Panel
* GROK-13791: Chem | Chemical space (using t-SNE) fails on smiles dataset
* [#2135](https://github.com/datagrok-ai/public/issues/2135):
  * The structure rendering is too small.
* [#2322](https://github.com/datagrok-ai/public/issues/2322): Properties panel is unexpectedly reset on changing viewer properties if there is a scaffold tree filter in filters panel 
* GROK-13848: Chem: Substructure search results flickering

## 1.7.0 (2023-08-09)

### Features

* GROK-13172: Chem | implement substructure search using preliminary filtration by pattern fingerprints

## 1.6.22 (2023-08-07)

### Bug Fixes

* GROK-13713: Chem | Incorrect molecule rendering

## 1.6.21 (2023-08-02)

*Dependency: datagarok-api >= 1.16.0*

### Features

* Calculate drug likeness, toxicity and alerts for whole table from widgets
* Color Coding for toxicity
* Scaffold Tree improvements:
  * [#2154](https://github.com/datagrok-ai/public/issues/2154): Scaffold Tree: harmonization.

### Bug Fixes

* GROK-13586: _chemFindSimilar fails with 'Cannot read properties of null (reading 'rows')'
* [#2135](https://github.com/datagrok-ai/public/issues/2135):
  * The counts and controls are partially hidden
  * When change the drawing of a scaffold, then selection (checkbox) of all other scaffolds gets reset (to unchecked)
* [#2139](https://github.com/datagrok-ai/public/issues/2139): Scaffold tree stops working after adding an invalid structure

## 1.6.20 (2023-07-21)

This release focuses on improvements and bug fixes.

*Dependency: datagarok-api >= 1.14.0*

### Features

* Set default values in all dialogs where appropriate.
* Unified the layout of the search panel results.
* Work with DBs APIs: Added links to sources, similarity search viewer style, reproduce for ChemicalSpace, Enamine.
* **Elemental Analysis**: the resulting column name now includes the specific column for which calculations were conducted.
* **R-Groups Analysis**: a new option to choose between searching for MCS exact atoms or MCS exact bonds.
* **Similarity Search**: a new **Follow Current Row** setting prevent recalculation when the current row is changed. 
* For proper handling of properties and rendering, we now check for smarts and molecular fragments separately.
* Ability to copy data from the **Descriptors** and **Properties** tabs on the **Context Pane**.
* Moved **Descriptors** and **Fingerprints** from the  **Context Pane**  to the **Top Menu** ( **Chem** > **Calculate**).
* Added **Substructure Search** to the **Top Menu** ( **Chem** > **Search**)
* Modified the tooltip for dialog and drag-n-drop to prevent it from overlapping with the data.
* Implemented RDKit rendering for Chembl, ChemblAPI, PubChem, and DrugBank databases if OCL is used currently.
* UI polishing: harmonized input field names, repositioned elements in dialogs, added tooltips, and organized the top menu items into groups: Calculate, ADME/Tox, Search, Analyze, and Transform.
* Scaffold Tree improvements:
  * [#1730](https://github.com/datagrok-ai/public/issues/1730): Implemented Scaffold Tree integration to the **Filters Panel**.
  * [#1998](https://github.com/datagrok-ai/public/issues/1998): Now a scaffold tree shows a confirmation dialog before dropping all trees on the **Clear** icon click.
  * Added the **Allow Generate** property for the viewer in order to control autogeneration.

### Bug Fixes

* GROK-13105: Substructure search doesn't work after similarity search.
* GROK-13118: Activity cliffs selects non-numeric column as activity.
* GROK-13123: Substructure Search: error when the Filter Panel is opened with substructure filtering.
* [#1492](https://github.com/datagrok-ai/public/issues/1492): Elemental analysis: malformed data handling.
* GROK-11898: Orientation for smiles in Structural Alerts.
* GROK-12115: Hamburger menu closing while switching a sketcher.
* GROK-12905: Sketcher is not opening from the **Filter Panel**.
* GROK-12929: Scripts don't work if called from the package.
* GROK-12933: Drug likeness: set score precision.
* GROK-12961: Elemental Analysis: `Unsupported operation: NaN.round()` error on some data.
* GROK-12962: Similarity Search: doesn't work on malformed data.