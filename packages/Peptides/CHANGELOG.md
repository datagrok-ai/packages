# Peptides changelog

## 1.21.2 (2025-02-03)

Correct Sizing of mutation cliff grids

## 1.21.1 (2025-01-10)

LST: Fix flickering and incorrect rendering in some cases

## 1.21.0 (2025-01-06)

Enable Project saving for SAR analysis

## 1.19.1 (2024-12-10)

Fix JS-API related changes

## 1.19.0 (2024-11-01)

Migrate to new seqHelper API

## 1.18.7 (2024-10-17)

Fixes For GROK-16606, GROK-16609

## 1.18.6 (2024-10-08)

MCL: Better layout for similar size clusters

## 1.18.5 (2024-10-07)

Fix weblogo support

## 1.18.4 (2024-10-03)

Use monomer tooltip from library

## 1.18.3 (2024-10-02)

Add Monomer meta columns to the Monomer-Position viewer

## 1.18.2 (2024-09-22)

Color monomer background in invariant map

## 1.18.1 (2024-09-18)

Add monomer custom coloring

## 1.17.29 (2024-08-14)

Update MCL implementation

## 1.17.28 (2024-08-08)

* Downgrade API version

## 1.17.27 (2024-08-08)

* Selection viewer restoring original grid sorting
* MCL viewer limiting max intercluster lines
* fix bugs with selections context panel 

## 1.17.26 (2024-08-07)

Rename monomer position viewer to sequence variability map

## 1.17.25 (2024-08-06)

Update MCLalgorytm and Add params to starting menu

## 1.17.24 (2024-07-29)

Fix invariant map values rendering

## 1.17.23 (2024-07-29)

Added options to invariant map:
* split selection for targets
* coloring options via aggregation
* value aggregation
* tooltips
* improved stability

## 1.17.22 (2024-07-22)

Fix Active peptide selection viewer failing on frame attached.

## 1.17.21 (2024-07-12)

Add support for string aggregation with pie chart viewer in LST viewer.

## 1.17.20 (2024-07-09)

MCL: Reverse order of clusters

## 1.17.19 (2024-07-01)

Fix dialog styles

## 1.17.18 (2024-05-27)

Add inflation factor to MCL.

## 1.17.17 (2024-05-06)

Add both annotations to the active peptide selection viewer.

## 1.17.16 (2024-04-29)

Add thresholds to active peptide selection viewer.

## 1.17.15 (2024-04-17)

Cluster max activity viewer working on level of cluster, not cluster size.

## 1.17.14 (2024-04-15)

Fix display of the max activity vs cluster size viewer columns.

## 1.17.13 (2024-04-02)

### Features

* Add max activity vs cluster size viewer.

## 1.17.12 (2024-03-30)

### Features

* #2707: Add original and canonical to ISeqSplitted

## 1.17.11 (2024-03-12)

* Fix context panel issues with mutation cliff pairs.
* Fix filter crashing app and never recovering.
* Precompute mutation cliffs statistics for correct rendering.
* Use mutation cliffs statistics for rendering (instead of invariant map data)
* Use Count and mean difference for size and color of mutation cliffs table.
* Correct tooltip for mutation cliffs table to use mutation cliffs stats.

## 1.17.10 (2024-02-29)

Fix context panel crashing and never recovering

## 1.17.9 (2024-02-29)

Fix Logo summary table not calculating for single clusters and not updating on filter.

## 1.17.8 (2024-02-22)

Allow using qnum activity columns when running SAR analysis from top menu.

## 1.17.7 (2024-02-22)

Allow using qnum activity columns.

## 1.17.6 (2024-02-20)

Fix NW Distance function.

## 1.17.5 (2024-02-15)

Added MCL clustering to peptide analysis.

## 1.17.3 (2024-02-01)

* Sequence space random seeding for reproducibility.
* Use of generated clusters for summery web logo table.

## 1.17.2 (2023-12-26)

* Improved dimensionality reduction (sequence space).

## 1.17.0 (2023-11-29)

### Features

* Renamed activity column to _Activity_ (previously: _Scaled activity_).
* Improved input tooltip in the Mutation Cliffs pairs panel.
* Autosize grids in the Mutation Cliffs pairs panel.
* Hid sequence space embedding columns and axes selectors.
* Saving context panels state.
* Selected cells now have an orange thick border.
* Distribution panel now shows distribution for (1) all activity values, (2) selected rows, (3) peptides selection from
  viewers if mismatched with the total selection.
* Sequence space viewer now uses the Needleman-Wunsch algorithm to compute distances.
* Linearization of helm format macromolecules before sequence space computation.
* Improved rendering speed of invariant map (no lags).
* Improved rendering speed upon selection/filtering.

### Bug Fixes

* Fixed accordion wouldn't update after selection in table view.
* Filtering dataframe causing most potent residues viewer and context panel to crash.
* Filtering dataframe causing major lags.
* Most potent residues viewer crashing on some data.
* Weblogo viewer crashing or causing major lag on selection/filtering.

## 1.16.0 (2023-11-05)

### Features

* Added Select All and Deselect All functionality to all viewers.
* Added Mean activity column for the Most Potent Residues viewer.
* Added Mean activity to tooltips.
* Added WebLogo to the Selection table.

### Bug Fixes

* Fixed Logo Summary Table tooltip wouldn't show if the analysis table doesn't contain column name 'Cluster'.
* Fixed tooltips would show irrelevant info.

## 1.15.3 (2023-10-26)

### Bug Fixes

* Fixed docking sequence space would completely remove the viewer.

## 1.15.2 (2023-10-26)

### Features

* Improved Sequence space default parameters (changed threshold similarity from 0.8 to 0.3)

## 1.15.1 (2023-10-19)

### Features

* Color-coding Sequence space by scaled activity.
* Optimized Mutation Cliffs calculations to use workers.
* Hid WebLogo positions in Logo Summary Table.

### Bug Fixes

* Fixed Invariant Map color coding wouldn't change when changing the color column.

## 1.15.0 (2023-10-12)

### Features

* Added Sequence Space viewer.
* Selection panel columns now inherit width from the main table.
* Invariant Map cell values are now rendered with contrast color relative to the background.

### Bug Fixes

* Fixed WebLogo in header margin width.
* Widgets in Context panel will now fill all the available width.
* Fixed LST rows are not resizable.
* Fixed selection inconsistency.
* Fixed Most Potent Residues keyboard navigation.
* Fixed analysis not starting when there are columns of the same name.

## 1.14.1 (2023-09-28)

### Bug Fixes

* Fixed a bug when filtering single cluster would break Logo Summary Table.

## 1.14.0 (2023-09-28)

### Features

* Added keyboard navigation to Logo Summary Table, Monomer-Position, Most Potent Residues viewers and Mutation Cliff
  pairs panel.
* Added icon to expand grids in property panel to fullscreen.

### Bug Fixes

* Fixed Distribution panel labels.

## 1.13.3 (2023-09-20)

### Features

* WebLogo now reacts to filtering.

### Bug Fixes

* Fixed distribution panel throwing error when selection matches filter.

## 1.13.2 (2023-09-14)

### Bug Fixes

* Downgraded `datagrok-api` dependency to version 1.16.4.

## 1.13.1 (2023-09-13)

### Bug Fixes

* Most Potent Residues: Fixed issue when the viewer failed to construct in some cases.

## 1.13.0 (2023-09-13)

### Features

* Monomer-Position and Most Potent Residues: Circle size is now based on the absolute value of mean difference.
* Scaling default colors (blue for low values and red for high) in Monomer-Position viewer.
* Highlight rows on mouse over Monomer-Position, Most Potent Residues, Logo Summary Table and WebLogo in the header.
* Changed viewer interactivity to match the platform defaults. Learn more about viewer
  hotkeys [here](https://datagrok.ai/help/visualize/viewers/#selection).
* Accordion with actions, mutation cliffs pairs, distribution and selection panels now shows on any selection.
* Removed steps from tutorial.
* Ignore rows with missing values when starting the analysis.

### Bug Fixes

* Logo Summary Table: Fixed interaction.

## 1.12.0 (2023-08-30)

### Features

* Added sequence identity and similairty functionality.
* Peptides moved to Bio > Analyze > SAR.
* Added tooltips for all inputs and buttons.
* Added Selection panel which shows the current selection as a separate table.
* UI/UX improvements.

### Bug Fixes

* Fixed table view tooltips.
* Fixed selection with WebLogo in the column header.
* Fixed table view couldn't be filtered by monomer position columns.

## 1.11.0 (2023-08-03)

This release introduces sequence identity functionality and some stability and usability improvements.

### Features

* Added sequence identity functionality.
* UI/UX improvements.
* Added activity column choice in settings.

## 1.10.4 (2023-08-01)

### Features

* UI/UX improvements.

### Bug Fixes

* Fixed Monomer-Position viewer not responding to selection correctly.

## 1.10.3 (2023-07-31)

### Bug Fixes

* Fixed wrong values in the invariant map.
* Fixed Mutation Cliffs pair selection would still result in wrong sequences sometimes.

## 1.10.2 (2023-07-24)

### Bug Fixes

* Made invisible Mutation Cliffs pairs columns, containing sequence indexes in the original table view.

## 1.10.1 (2023-07-24)

### Features

* Invariant Map is now selecting sequences instead of filtering.
* Minor UI/UX adjustments.

### Bug Fixes

* Fixed mutation pair selection resulted in wrong unique sequences in the Mutation Cliffs bug.
* Fixed position column labels not showing if the page was scaled.

## 1.10.0 (2023-07-19)

This release focuses on improving analysis stability and usability.

### Features

* Improved activity distribution plots to show selected vs. all.
* Added position number in main table view column headers.
* The Monomer-Position viewer in the Mutation Cliffs mode now shows the number of unique sequences that have monomer
  mutation at the selected position.
* The Monomer-Position viewer in the Mutation Cliffs mode now selects unique sequences that have monomer mutation at the
  selected position.
* The Mutation Cliffs panel now shows unique sequences and corresponding values from columns visible in the table view.

### Bug Fixes

* Fixed bug when filter couldn't be applied to the original table after analysis started.
