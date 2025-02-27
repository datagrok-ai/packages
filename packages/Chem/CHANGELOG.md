# Chem changelog

## 1.14.0 (2025-02-24)

### Features

* New improved MMP implementation
* Integration with Reinvent
* Copy molecule as image
* Context actions for chemical columns

### Bug fixes

* GROK-17483: Chem: Structure filter is not reset on reseting the filtering in some cases
* GROK-17461: Scaffold tree: Error when uploading the saved tree
* GROK-17511: Chem | ChemProp: Error when training a model
* GROK-17555: Filter Panel: Reset filter causes errors in some cases
* GROK-17471: Chem: Incorrect filter UI when adding filter via 'Use as filter' or 'Add filter'
* GROK-17555: Filter Panel: Reset filter causes errors in some cases
* GROK-17597: Chem: Wrong filtering when opening the project

## 1.13.1 (2025-01-06)

### Bug fixes

* Fix RDKit cell renderer isolating MonomerHoverData.getSubstruct
* Fix RDKit cell renderer isolating ISubstructProvider.getSubstruct

## 1.13.0 (2024-10-25)

### Bug Fixes

* [#3055](https://github.com/datagrok-ai/public/issues/3055): Page is freezing after applying layout with multiple
  scaffold trees with large number of structures

## 1.12.4 (2024-10-18)

### Bug fixes

* Fix rdkit cell renderer for viewers tooltip, enable test
* Invalidate fingerprints column only in case column data (not metadata) has been changed

## 1.12.3 (2024-10-01)

### Bug fixes

* GROK-16730: Demo: Activity cliffs: Cannot read properties of null

## 1.12.2 (2024-09-25)

### Bug fixes

* Fix rdkit cell renderer error in scatter plot tooltip, add test

## 1.12.1 (2024-09-25)

### Bug fixes

* Expect GPU to be unavailable on some browsers
* Fix MMPa crushing without errors

## 1.11.6 (2024-09-20)

### Bug Fixes

* [#3055](https://github.com/datagrok-ai/public/issues/3055): Page is freezing after applying layout with multiple
  scaffold trees with large number of structures

## 1.11.5 (2024-08-27)

### Bug fixes

* Add tableView to runChemSpace for reduce dimensionality ui options
* [#3004](https://github.com/datagrok-ai/public/issues/3004): Chem: Scaffold tree is based on wrong table by default in
  some cases
* GROK-15938: Chem | Scaffold Tree: Array length differ
* Chem: MMPA: Fix demo

## 1.11.4 (2024-08-23)

### Features

* Chem: MMPA: filter fragments by significance
* Chem: MMPA: project and layout saving
* Chem: MMPA: demo loaded not calculated
* Chem: Removed r-groups settings download from init

### Bug Fixes

* Chem: MMPA: Fixed property panel on cliff line click
* [#2983](https://github.com/datagrok-ai/public/issues/2983): Chem: fix tooltip styles for structure columns
* GROK-16493: MMPA: Fixed Summary viewer doesn't show the values

## 1.11.3 (2024-08-12)

### Features

* Chem: MMPA: Work with multucomponent entities

## 1.11.2 (2024-08-12)

### Features

* Chem: Chemprop: Remove redundant calls in the core and move it fully to package
* Chem: MMPA: Add meaningfull dataset for demo
* Chem: MMPA: Restrictions and CPU fallback
* Chem: MMPA: Compensate filtering by cutoff
* Chem: MMPA: Add reflection for selection
* Chem: MMPA: Add pairs filter, expose filters object so it can be used in any tab, minor improvements
* Chem: Update demos in order to be shown in the Browse

### Bug Fixes

* Chem: MMPA: Fixes for cliffs tab and lines improvements
* [#2964](https://github.com/datagrok-ai/public/issues/2964): Scaffold Tree: 'Selection to filter' reset immediately for
  some data if scaffold tree is present

## 1.11.1 (2024-07-25)

### Bug Fixes

* Removed unnecessary code

## 1.11.0 (2024-07-24)

*Dependency: datagarok-api >= 1.20.0*

### Bug Fixes

* GROK-16328: Chem: R-Group analysis: Broken styles
* GROK-16329: Chem: R-Group analysis: Error when none R groups were found
* GROK-16338: Chem: Chemical space: Reseting marker type to circles
* Chem: Scaffold Tree: Fix representation when the viewers are stacked
* Chem: Chemprop: Fix applying the model to different datasets
* Chem: Fix substructure filter style
* Chem: Do not render molecules with invisible width

## 1.10.0 (2024-06-12)

### Features

* Webgpu acceleration for chem space, activity cliffs, molecule generations
* GROK-15299: Chem: Ability to save results of Chem functions to projects with and without data sync
* GROK-15454: Chem: Similarity/Diversity search viewers: Row source property
* GROK-15508: Chem: MMP: Generated - show what cases are actually generated
* GROK-15501: Chem: MMPA: UI/UX improvements
* GROK-15502: Chem: MMPA: Ability to swith activity on/off
* GROK-15507: Chem: MMP: Control of fragments size
* Chem: Integrate with Chemprop
* Chem: Chemprop upgrade from version "1.6.7" to version "2.0" (reduced memory usage, improved performance)

### Bug Fixes

* GROK-15285: Chem: MMP: Error on re-run
* GROK-15321: Chem: MMP: Error while running Close All after running MMP

## 1.9.2 (2024-04-12)

### Features

* R Group analysis improvements: ability to select 'Only match at R groups', saving R group user settings, small UI
  improvements

## 1.9.1 (2024-04-12)

### Features

* R Group analysis: in browser R group analysis using RDKit JS, highlight of r groups, ability to define enumerated R
  groups in core
* Similarity/Diversity search: ability to recalculate results on filtering

## 1.9.0 (2024-03-21)

### Features

* [#2495](https://github.com/datagrok-ai/public/issues/2495): Chem: MMP - initial vesrion
* [#2540](https://github.com/datagrok-ai/public/issues/2540): Chem | Substructure search: Add an option to toggle the
  realignment of molecules by molecular filter
* [#2525](https://github.com/datagrok-ai/public/issues/2525): Chem | Scaffold Tree: Remove the intermediate dialog
  before the color picker
* [#2504](https://github.com/datagrok-ai/public/issues/2504): Filter panel: The question mark hovering doesn’t show the
  filtering of the scaffold tree viewer

### Bug Fixes

* GROK-15147: Chem | Scaffold Tree: Highlighting disappears in some cases
* GROK-15240: Chem | RGroups: Handling malformed data
* GROK-15213: Chem | RGroups: Undo latest analysis doesn't work when run on multiple dataframes
* GROK-15187: Chem | RGroups: Fixed memory consumption
* GROK-15171: Chem: Substructure filter doesn't apply correctly after removing rows and disable

## 1.8.13 (2024-02-29)

### Bug Fixes

* Warm up substructure search web workers only once when first filter is created on column

## 1.8.12 (2024-02-15)

### Bug Fixes

* Fixed multiple substructure search calls with the same structure (in case multiple layouts are applied to cloned views
  at once)

## 1.8.11 (2024-02-08)

### Bug Fixes

* [#2642](https://github.com/datagrok-ai/public/issues/2642): Filtering done using viewers is unexpectedly reset on
  applying other filters in some cases
* [#2639](https://github.com/datagrok-ai/public/issues/2639): Structure in filter is unexpectedly changed when there are
  two views in some cases
* [#2646](https://github.com/datagrok-ai/public/issues/2646): Structure highlighting is not removed when filters panel
  is closed

## 1.8.10 (2024-01-19)

### Features

* Molecule labels on scatter plot zoom in Chemical Space and Activity Cliffs

### Bug Fixes

* [#2626](https://github.com/datagrok-ai/public/issues/2626): Unexpected warning on adding child node to the scaffold
  tree if parent contains 'H' atom
* [#2628](https://github.com/datagrok-ai/public/issues/2628): Structure filter is not applied in some cases when there
  are two views opened
* [#2629](https://github.com/datagrok-ai/public/issues/2629): Structure filter filters out all molecules in the presence
  of filter-by-zoom scatterplot and multiple views
* GROK-14542: Filter Panel | Structure filter: incorrect behavior on deleting a filter in a cloned view

## 1.8.9 (2024-01-09)

### Features

* Update MinimalLib to 1.2.15 featuring support for RGroups (support for R-group decomposition)
* Chem: Add ability to specify fingerprint types and cluster embeddings for chemical space

### Bug Fixes

* GROK-14383: Chem | Scaffold Tree: The selection doesn't change on folder node click
* GROK-14411: Demo: Exception while closing Scaffold Tree
* GROK-14409: Chem | R-Group Analysis: Error with prefix
* GROK-14375: Chem | Activity cliffs: Implement scatter plot lines renderer
* [#2612](https://github.com/datagrok-ai/public/issues/2612): Chem | Scaffold tree: Structure part containing H atom is
  replaced with '?' in some cases

## 1.8.8 (2023-12-07)

### Bug Fixes

* Chem: Fix demos for scaffold tree, chemical databases and similarity/diversity search.

## 1.8.7 (2023-12-05)

### Features

* [#2550](https://github.com/datagrok-ai/public/issues/2550): Chem: Scaffold Tree: Counter is not updated when applying
  the filters
* [#2525](https://github.com/datagrok-ai/public/issues/2525): Chem: Scaffold Tree: Highlighting improvements:
  * More specific fragments should be drawn on top
  * New icons for different coloring states

### Bug Fixes

* [#2536](https://github.com/datagrok-ai/public/issues/2536): Chem: Substructure Filter: Not terminated on fiter reset
* [#2553](https://github.com/datagrok-ai/public/issues/2553): Chem | Scaffold tree: Realignment issue when the scaffold
  color is set
* GROK-14305: Chem | Scaffold Tree: Error when deleting rows in grid

## 1.8.6 (2023-11-17)

### Bug Fixes

* [#2525](https://github.com/datagrok-ai/public/issues/2525): Chem: Scaffold tree: Highlighting improvements:
  * Add a tooltip for the checkbox
  * Add a tooltip for NOT
* [#2526](https://github.com/datagrok-ai/public/issues/2526): Chem: Molecules realignment improvements:
  * Scaffold tree shouldn't reorient molecules in the grid
* [#2533](https://github.com/datagrok-ai/public/issues/2533): RdKitService stays unresponsive as terminateFlag is not
  reset after substructure search has completed

## 1.8.5 (2023-11-14)

### Features

* [#2459](https://github.com/datagrok-ai/public/issues/2459): Chem: Scaffold Tree: Improvements:
  * Add resetting the scaffold tree viewer (on the reset filter click)
  * Add a tooltip for removing orphans

### Bug Fixes

* [#2511](https://github.com/datagrok-ai/public/issues/2511): Scaffold tree: highlighting is not updated when structure
  is edited
* [#2512](https://github.com/datagrok-ai/public/issues/2512): Filtering options (contains, exact, included in etc.) are
  not synchronised for structure filters on different tabs in some cases

## 1.8.4 (2023-11-07)

### Features

* [#2459](https://github.com/datagrok-ai/public/issues/2459): Chem: Scaffold Tree: Improvements:
  * The “trash can” icon is red and stands out from the general style; make a blue one from the same collection
  * Add Expand All/Collapse All icons for easy navigation
  * Save the state of the tree (what was selected, what was expanded) when saving
* [#2420](https://github.com/datagrok-ai/public/issues/2420): Chem | Scaffold tree coloring:
  * use the trash iscon instead of '-'

### Bug Fixes

* [#2474](https://github.com/datagrok-ai/public/issues/2474): Chem | Scaffold tree: Colour is not inherited by child
  node properly
* [#2476](https://github.com/datagrok-ai/public/issues/2476): Chem | Scaffold tree: Rows are shown as filtered for a
  while after applying structure even if checkbox is not selected
* [#2448](https://github.com/datagrok-ai/public/issues/2448): Some structures are displayed incorrectly when highlighted
  if they are in SMILES format
* [#2473](https://github.com/datagrok-ai/public/issues/2473): Structure filter: 'current value > use as filter' breaks
  filtering in some cases

## 1.8.3 (2023-10-26)

### Features

* [#2421](https://github.com/datagrok-ai/public/issues/2421): Chem | Molecular Search options:
  * Add some hint to explain the new options to users
  * Fix the ability to collapse the controls after switching from Similarity to Contains
  * Make the icon more noticeable
* [#2420](https://github.com/datagrok-ai/public/issues/2420): Chem | Scaffold Tree coloring:
  * The custom coloring should override the default one
  * Coloring for child structures - it's very inconvenient that you can't click the icon again to return to the custom
    color
  * Add the icon for removing the specific node of the scaffold tree

### Bug Fixes

* [#2399](https://github.com/datagrok-ai/public/issues/2399): Scaffold tree viewer: coloring can't be saved to the
  Layout
* [#2450](https://github.com/datagrok-ai/public/issues/2450): Scaffold tree imported from file is not restored on
  applying saved layout
* [#2448](https://github.com/datagrok-ai/public/issues/2448): Some structures are displayed incorrectly when highlighted
  if they are in SMILES format

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
* [#2322](https://github.com/datagrok-ai/public/issues/2322): Properties panel is unexpectedly reset on changing viewer
  properties if there is a scaffold tree filter in filters panel
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
* [#2139](https://github.com/datagrok-ai/public/issues/2139): Scaffold tree stops working after adding an invalid
  structure

## 1.6.20 (2023-07-21)

This release focuses on improvements and bug fixes.

*Dependency: datagarok-api >= 1.14.0*

### Features

* Set default values in all dialogs where appropriate.
* Unified the layout of the search panel results.
* Work with DBs APIs: Added links to sources, similarity search viewer style, reproduce for ChemicalSpace, Enamine.
* **Elemental Analysis**: the resulting column name now includes the specific column for which calculations were
  conducted.
* **R-Groups Analysis**: a new option to choose between searching for MCS exact atoms or MCS exact bonds.
* **Similarity Search**: a new **Follow Current Row** setting prevent recalculation when the current row is changed.
* For proper handling of properties and rendering, we now check for smarts and molecular fragments separately.
* Ability to copy data from the **Descriptors** and **Properties** tabs on the **Context Pane**.
* Moved **Descriptors** and **Fingerprints** from the  **Context Pane**  to the **Top Menu** ( **Chem** > **Calculate
  **).
* Added **Substructure Search** to the **Top Menu** ( **Chem** > **Search**)
* Modified the tooltip for dialog and drag-n-drop to prevent it from overlapping with the data.
* Implemented RDKit rendering for Chembl, ChemblAPI, PubChem, and DrugBank databases if OCL is used currently.
* UI polishing: harmonized input field names, repositioned elements in dialogs, added tooltips, and organized the top
  menu items into groups: Calculate, ADME/Tox, Search, Analyze, and Transform.
* Scaffold Tree improvements:
  * [#1730](https://github.com/datagrok-ai/public/issues/1730): Implemented Scaffold Tree integration to the **Filters
    Panel**.
  * [#1998](https://github.com/datagrok-ai/public/issues/1998): Now a scaffold tree shows a confirmation dialog before
    dropping all trees on the **Clear** icon click.
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
