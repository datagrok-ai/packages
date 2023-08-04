# Charts changelog

## 1.1.1 (2023-08-02)

### Features

* [#2098](https://github.com/datagrok-ai/public/issues/2098): Sunburst: Added group tooltips using showRowGroup

## 1.1.0 (2023-08-01)

This release focuses on adding new functionality and improving the existing one.

### Features

* Switched to class decorators for registering viewers
* [#1974](https://github.com/datagrok-ai/public/issues/1974): Timelines: Set the default date format based on the time difference between event start and end values
* [#2096](https://github.com/datagrok-ai/public/issues/2096): Sunburst: Add different click types, highlighting, selection, remove animations:
  * Implemented Ctrl + Click for selecting specific parts of the plot
  * Implemented Shift + Click for adding selection on the plot
  * Implemented Ctrl + Shift + Click for removing selection
  * Implemented highlighting to sync with other viewers
  * Removed animations
* [#2098](https://github.com/datagrok-ai/public/issues/2098): Sunburst: UI/UX improvements:
  * Added tooltips
  * Added molecule rendering on plot
  * Synchronized plot with the table color coding
  * Text doesn't render if it doesn't fit
* [#2097](https://github.com/datagrok-ai/public/issues/2097): Sunburst: Add reset viewer functionality:
  * Added viewer reset on double click and to the context menu
  * Unsubscribes from events when viewer detached

### Bug Fixes

* [#1968](https://github.com/datagrok-ai/public/issues/1968): RadarViewer does not allow changing columns in SpiderChart:
  * Show actual number of columns that are selected
  * RadarViewer contains non numerical columns
* [#1962](https://github.com/datagrok-ai/public/issues/1962): RadarViewer errors on bigint datatype
* Surface plot fixes (format, axis labels)
* [#2098](https://github.com/datagrok-ai/public/issues/2098): Sunburst: UI/UX improvements:
  * Verified that the hierarchy column order is persisted properly if we reopen the "hierarchy" dialog
  * Fixed wrong behavior when second-level classes were not aggregated

## 1.0.24 (2023-05-26)

### Bug Fixes

* [#1973](https://github.com/datagrok-ai/public/issues/1973): Timelines: Visualization is not shown if the Split by column contains long category names
