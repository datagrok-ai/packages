---
title: "Release history"
slug: develop/admin/releases/release-history
position: 6 # float position is supported
---

## Latest version

| Service                                                   | Docker Image                                                                                      |
|-----------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [Datagrok](../../develop/under-the-hood/infrastructure.md#datagrok-components)      | [datagrok/datagrok:1.18.6](https://hub.docker.com/r/datagrok/datagrok)                            |
| [Grok Connect](../../access/access.md#data-connection) | [datagrok/grok_connect:2.1.10](https://hub.docker.com/r/datagrok/grok_connect)                    |
| Grok Spawner                                              | [datagrok/grok_spawner:1.4.8](https://hub.docker.com/r/datagrok/grok_spawner)                     |
| [Grok Compute](../../develop/under-the-hood/infrastructure.md#grok-compute)         | [datagrok/grok_compute:1.5.5](https://hub.docker.com/r/datagrok/grok_compute)                     |
| [Jupyter Kernel Gateway](../../compute/scripting/scripting.mdx)   | [datagrok/jupyter_kernel_gateway:1.6.2](https://hub.docker.com/r/datagrok/jupyter_kernel_gateway) |
| [Jupyter Notebook](../../compute/jupyter-notebook.md)  | [datagrok/jupyter_notebook:1.1.1](https://hub.docker.com/r/datagrok/jupyter_notebook)             |
| [H2O](../../develop/under-the-hood/infrastructure.md#h2o)                           | [datagrok/h2o:1.1.1](https://hub.docker.com/r/datagrok/h2o)                                       |
| [CVM Nginx](../../develop/under-the-hood/infrastructure.md#load-balancer)           | [datagrok/cvm_nginx:1.10.0](https://hub.docker.com/r/datagrok/cvm_nginx)                          |

See also:
- [Versioning policy](../../develop/dev-process/versioning-policy.md)
- [Docker-Compose](../docker-compose/docker-compose.md)

## 2024-12-23 Datagrok 1.23.0 release

The Datagrok 1.23.0 release includes stability and data access improvements

### Main updates
*  **Visual Query**: with an enhanced UX, you can seamlessly join multiple tables, select specific columns for your report, and pivot and group data
* **Improved function execution**: parallel queries and scripts now run 10x faster

### Platform

#### Browse

* Galleries: Enabled keyboard navigation and selection in brief and card mode

<!-- #### [Scripting](https://datagrok.ai/help/compute/scripting/)

* Inputs: improved InputForm alignment, including for InputForms with complex options -->
    
#### JS API

* Added indefinite parameter to `grok.shell.info`
* Ability to specify tooltip position relative to the element (left / right / top / bottom)
* Added support for different types of parameters for calls:
    *  `grok.functions.call('sin', 0.5);`
  * `grok.functions.call('sin', {x: 0.5});`
  * `grok.functions.call('sin', [0.5]);`

<!-- #### Data Access

*  Enhanced Visual Query
* Improve client-server socket dispatch for functions execution: parallel queries and scripts now run 10x faster
-->
   
### Viewers

* Legend improvements and fixes:
    * Automatic positioning for optimal layout
    * Automatic hiding when the viewer size is too small
    * Proper rendering when positioned on top
* [Trellis plot](../../visualize/viewers/trellis-plot.md): Added support for mouse-over row group for inner viewers
* Fixed:
  *  [#3184](https://github.com/datagrok-ai/public/issues/3184): [Tile Viewer](../../visualize/viewers/tile-viewer.md): Scroll reset and rendering issues after adding new viewer
  * [#3150](https://github.com/datagrok-ai/public/issues/3150): [Box plot](../../visualize/viewers/box-plot.md): New multi-category box plot is not compatible with older layouts that have only single category
  *  [#3188](https://github.com/datagrok-ai/public/issues/3188): [Bar chart](../../visualize/viewers/bar-chart.md): Some categories are missing in the legend when data is filtered

#### [Grid](../../visualize/viewers/grid.md)

* [#2968](https://github.com/datagrok-ai/public/issues/2968): Added multi-column style editing 
* Fixed:
  * [#3101](https://github.com/datagrok-ai/public/issues/3101): Shift-click selects unexpected rows in some cases
  *  [#3168](https://github.com/datagrok-ai/public/issues/3168):  Horizontal scroll bar in table disappears on double-click

#### [Scatterplot](../../visualize/viewers/scatter-plot.md)

* [#3124](https://github.com/datagrok-ai/public/issues/3124): Added support for resizing structure labels
* [#3142](https://github.com/datagrok-ai/public/issues/3142): Added ability to define columns for scatterplot whiskers
* [#2708](https://github.com/datagrok-ai/public/issues/2708): Preserve formula line configuration upon changing columns on the axis
* Fixed:
    * [ #3091](https://github.com/datagrok-ai/public/issues/3091): Show a more detailed message for a missing column
    * [#3055](https://github.com/datagrok-ai/public/issues/3055): Page is freezing after applying layout with multiple scaffold trees with large number of structures (data-specific)
    * [#2965](https://github.com/datagrok-ai/public/issues/2965): Legend color cannot be edited (no color picker icon) if both color and markers use the same column
    * [#3145](https://github.com/datagrok-ai/public/issues/3145): Label can be dragged out of scatter plot area and completely hidden
    * [#3123](https://github.com/datagrok-ai/public/issues/3123): Not all formula lines are shown in some cases
    * [#3175](https://github.com/datagrok-ai/public/issues/3175): Scatterplot with conditionally colored column as color inconsistency: color editor icon is shown, but colors cannot be changed
    * [#3176](https://github.com/datagrok-ai/public/issues/3176): Some labels disappear unexpectedly on zoom in / out
    * [#3180](https://github.com/datagrok-ai/public/issues/3180): Labels: Context menu disappears when unclicking the mouse

#### [Line Chart](../../visualize/viewers/line-chart.md)

* [#3111](https://github.com/datagrok-ai/public/issues/3111): Added color pickers to the legend
* Fixed:
  * [#3033](https://github.com/datagrok-ai/public/issues/3033): Viewer has 'Marker size' option, but it cannot be changed
  * [#2776](https://github.com/datagrok-ai/public/issues/2776):  Page is frozen if too many categories are used in split

### Other fixes

* [#3122](https://github.com/datagrok-ai/public/issues/3122): Pinned columns: Opening the project with pinned columns hides the pinned columns
* [#3119](https://github.com/datagrok-ai/public/issues/3119): Add new column: formula with multi-argument functions is parsed incorrectly if more than one argument contains a column
* [#3211](https://github.com/datagrok-ai/public/issues/3211): Add new column: do not show error message when using ‘IsNotEmpty’ for numerics
* [#3024](https://github.com/datagrok-ai/public/issues/3024):  Parsing source maps is loading the platform

### Packages

* Plugin management improvements: Added package install logs to UI

#### [Hit Triage:](https://github.com/datagrok-ai/public/tree/master/packages/HitTriage/CHANGELOG.md)

* Added ability to edit campaign stages once the campaign starts

## 2024-12-20 1.22.3

### Improvements and fixes:
* Viewers:
  * [#3133](https://github.com/datagrok-ai/public/issues/3133): [Grid](../../visualize/viewers/grid.md): Right arrow on changing column position with drag-and-drop is  working if there is not panel/viewer at the right side
  * [#3184](https://github.com/datagrok-ai/public/issues/3184): [Tile viewer](../../visualize/viewers/tile-viewer.md): Scroll reset and rendering issues after adding new viewer
  * [#3188](https://github.com/datagrok-ai/public/issues/3188): [Bar chart](../../visualize/viewers/bar-chart.md): Some categories are missing in the legend when data is filtered
  * [Scatterplot](../../visualize/viewers/scatter-plot.md):
    * [#2965](https://github.com/datagrok-ai/public/issues/2965): Legend color can not be edited if both color and markers use the same column
    * [#3176](https://github.com/datagrok-ai/public/issues/3176): Some labels disappear unexpectedly on zoom in / out
    * [#3189](https://github.com/datagrok-ai/public/issues/3189): Scatter plot labels are shown for filtered out points
    * [#3191](https://github.com/datagrok-ai/public/issues/3191): Some dots are not shown on scatter plot when labels are enabled
    * [#3175](https://github.com/datagrok-ai/public/issues/3175): Scatter plot with conditionally colored column as color inconsistency: color editor icon is shown, but colors cannot be changed
* [#3174](https://github.com/datagrok-ai/public/issues/3176): Table header tooltip overlaps menus
* [#3168](https://github.com/datagrok-ai/public/issues/3168): Horizontal scroll bar in table disappears on double-click

## 2024-11-25 1.22.2

### Improvements and fixes:
* Viewers:
  * [Scatterplot](../../visualize/viewers/scatter-plot.md):
    * [#3145](https://github.com/datagrok-ai/public/issues/3145): Label can be dragged out of scatter plot area and completely hidden
    * [#3120](https://github.com/datagrok-ai/public/issues/3120): Cannot drag label if Mouse Drag = Select
    * [#3123](https://github.com/datagrok-ai/public/issues/3123): Not all formula lines are shown
  * [PC Plot](../../visualize/viewers/pc-plot.md): Transformation doesn't work
  * [#3150](https://github.com/datagrok-ai/public/issues/3150): [Box plot](../../visualize/viewers/box-plot.md): New multi-category Box plot is not compatible with older layouts that have only single category

## 2024-11-04 1.22.1

### Improvements and fixes:
* Filters: Avoid cross firing of events in duplicate filters
* [#3119](https://github.com/datagrok-ai/public/issues/3119): Add new column: formula with multi-argument functions is parsed incorrectly if more than one argument contains a column
* [#3107](https://github.com/datagrok-ai/public/issues/3107): Grid: Incorrect selection on grid with filtering/sorting enabled
* [#3132](https://github.com/datagrok-ai/public/issues/3132): Color picker: Fixed opening new color picker removes previously selected color
* [#3101](https://github.com/datagrok-ai/public/issues/3101): Shift-click selects unexpected rows in some cases


## 2024-10-22 Datagrok 1.22.0 release 

The Datagrok 1.22.0 release includes stability improvements, key optimizations, and new features for a more efficient and responsive platform

### Main updates

* **Automated data cleanup** keeps the server lean by deleting old data and logs (could be configured)
* **Pyodide**: you can now run Python functions, including data transformation steps, directly in the browser
* **Plugin databases**: you can now ship a Postgres database (such as chemical registration system) with your plugin

### Platform

#### Browse
* Improved structure in the Browse section for more intuitive access to plugins and apps 
* Set a custom order for apps within the tree, making navigation faster and tailored to user needs
* Fixes:
  * Adding new folders now automatically refreshes the tree, keeping the view up-to-date
  * Refreshing now retains previews without resetting, making it easier to track content

#### [Scripting](https://datagrok.ai/help/compute/scripting/)
* Added the ability to get Func result view 
* Refactor handlers, Script, ScriptParam classes 
* Fixed browser tab crash for 1-million-columns script

#### JS API
* [#3063](https://github.com/datagrok-ai/public/issues/3063): Added the capability to add color palettes to configs 
* Addressed an issue preventing dapi.queries from being executable, restoring full query functionality

#### Data Access
* Database initialization update: moved legacy database migrations to init_db.sql, optimizing the setup process and reducing overhead from outdated migration files
* Schema-specific migrations: implemented support for schema-specific database migrations that can be configured directly from packages, allowing for easier version control and better alignment with package requirements

### Viewers
* New Confusion matrix data viewer 
* [Density plot](../../visualize/viewers/density-plot.md): Increase bins after certain zoom
* [#3015](https://github.com/datagrok-ai/public/issues/3015): [Trellis plot](../../visualize/viewers/trellis-plot.md) is re-rendered on changing settings when there is no data to display after settings change 
* [#3052](https://github.com/datagrok-ai/public/issues/3052): Reducing a few seconds delay on creating a screenshot of a viewer 
* Fixes:
  * [#2776](https://github.com/datagrok-ai/public/issues/2776): [Line Chart](../../visualize/viewers/line-chart.md): Page is not frozen if too many categories are used in split 
  * [Histogram](../../visualize/viewers/histogram.md): Slider with bins doesn't suddenly become visible   
  * [Box plot](../../visualize/viewers/box-plot.md): Legend color picker menu closes correctly
  * [Scaffold tree](../../visualize/viewers/scaffold-tree.md): Fixing loader freezing on 0%
  * [Tree map viewer](https://datagrok.ai/help/visualize/viewers/tree-map#interactivity): "Split By" option fixing

#### [Grid](../../visualize/viewers/grid.md)
* Formula-based rendering integration
* Add method to invalidate a single grid cell 
* Fixes:
  * [#2683](https://github.com/datagrok-ai/public/issues/2683): Pinned columns: left-clicking on the column name does not change the Context Panel display 
  * [#3095](https://github.com/datagrok-ai/public/issues/3095): Wrong columns are exported with 'Visible columns only' option if there are multiple views for the table 

#### [Scatterplot](../../visualize/viewers/scatter-plot.md)
* Improved label positioning and size adjustments (including for structure labels [#2688](https://github.com/datagrok-ai/public/issues/2688))
* Added lines to connect data series
* Added color coding via expressions to enhance data visualization capabilities
    
### Packages
* Plugin management improvements: Streamlined plugin uninstall and delete processes
* Added functionality to reset the *touchedOn* flag when selecting a package's current version
* Ability to auto update deprecated packages


#### [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts/CHANGELOG.md)
* [#3090](https://github.com/datagrok-ai/public/issues/3090): Sunburst usability improvements 

#### [PowerPack](https://github.com/datagrok-ai/public/blob/master/packages/PowerPack/CHANGELOG.md)
* Fixes for 'Add new column' functionality:
  * Fixed validation error when using if(true, "yes", error("Error")) in formulas 
  * Resolved incorrect validation when using nested columns in a formula
  * Fixed an error where VectorCall caused addNewColumn to run the script on each row individually, rather than utilizing Script.vectorize for efficient processing
  * Fixed an issue where the filter reset unexpectedly when clicking on a column, even if a category was already selected
  * [#3006](https://github.com/datagrok-ai/public/issues/3006): Changing the return type now correctly triggers column reordering
  * [#3010](https://github.com/datagrok-ai/public/issues/3010): Resolved issue where *Qnum* was incompatible with *if* statements
  * [#2981](https://github.com/datagrok-ai/public/issues/2981): Fixed an issue where typing in calculated formulas caused input to be unexpectedly overwritten
  * [#3009](https://github.com/datagrok-ai/public/issues/3009): Addressed an issue with calculated column hints breaking when using round and curly brackets together

#### [Diff Studio](https://datagrok.ai/help/compute/diff-studio#lookup-tables)
* Value lookups: Implemented the use of lookup tables

#### [EDA](https://datagrok.ai/help/deploy/releases/plugins/EDA#122-2024-09-12)
* Fixes:
  * ANOVA: Fix incorrect column type bug 
  * Missing values imputation: Fixing dialog

### Other fixes
* [#3027](https://github.com/datagrok-ai/public/issues/3027): Cannot copy text from any input in filters panel 
* [#3032](https://github.com/datagrok-ai/public/issues/3032): Page is freezing for a while when color by column is applied in some cases (large number of categories + "starts with") 
* [#2715](https://github.com/datagrok-ai/public/issues/2715): PadLeft and PadRight do not seem to work (WIP)
* [#2959](https://github.com/datagrok-ai/public/issues/2959): DS: Projects: Data-sync project doesn't open if a column with operations on it was excluded from the data source 
* Unexpected logout on refresh token error \- needs handling for invalid session only
* Projects: Misaligned layout on toolbox in data-sync project 
* Converting object to an encodable object failed
* Credentials wipe when package version changes 
* Invisible columns cause exception waterfall 


## 2024-11-04 Datagrok 1.21.4  

### Improvements and fixes:
* Bugfixes for model signatures synchronization
* Text Renderer: Fixed multi-line link rendering

## 2024-09-10 Datagrok 1.21.1 release 

The Datagrok 1.21.1 release enhances platform stability and usability, streamlining workflows for a more intuitive user experience. 

Database migrations are irreversible in this version. You cannot roll back to an older version of Datagrok after the first 1.21.0 run. If a rollback is necessary, please contact Datagrok support for assistance.

### Input API breaking change:
  - The methods of `DG.InputBase` (such as `onInput` and `onChanged`) have been updated. They are now of the `Observable` type (previously they were `Stream`). To subscribe to these events, you will need to update your code from `input.onChanged(() => change());` to `input.onChanged.subscribe(() => change());` (same for `onInput`).
  - Additionally, when creating an input via the `ui.input.xxx` namespace and passing the `onValueChanged` parameter in the options, the parameters for `onValueChanged` have changed. Previously, they were `(input: DG.InputBase<T>)`, but now they are `(value: T, input: DG.InputBase<T>)`. If you don't need the entire input object, you can simply use the `value` parameter in the method.

### Main:

* Lightweight modeling improvements: Interactive dashboard for training predictive models.
  * Binary classification support: interactive prediction threshold, AUC-ROC.
  * Model comparison tool.
  * Automatic model choice.
* Browse improvements: 
   * The ability to move files between connections. 
   * Refreshing browse ‘remembers’ preview. 
   * Creating new folder refreshes browse tree. 
* JS-API: Implemented support for Float64 columns.
* File caching is now enabled by default: it works automatically without the need for configuration.

### Viewers
  
  * [Density plot](../../visualize/viewers/density-plot.md): color palette is added to the viewer. 
  * [#2982](https://github.com/datagrok-ai/public/issues/2982): Tooltip was removed from the legend.
  * Fixes:
    * [#3004](https://github.com/datagrok-ai/public/issues/3004): Two tables with molecules: [Scaffold tree](../../visualize/viewers/scaffold-tree.md) viewer is based on correct table by default.    
    * [#2964](https://github.com/datagrok-ai/public/issues/2964): 'Selection to filter' resets immediately for some data if [Scaffold tree](../../visualize/viewers/scaffold-tree.md) viewer is present in the view. 
    * [#2771](https://github.com/datagrok-ai/public/issues/2771): Filter out legend with empty categories in the legend. 
    * [#2945](https://github.com/datagrok-ai/public/issues/2945): Color picker HEX\RGB choice input in the dialog. 
    * [#2927](https://github.com/datagrok-ai/public/issues/2927): Fixing a collapsed state of the [Heatmap](../../visualize/viewers/heat-map.md) after applying saved layout if it was stacked with another viewer. 
    * Pivot table: Changing columns (pviot, group by or aggregate) through context panel.
    * [Trellis plot](../../visualize/viewers/trellis-plot.md): Fixed the error on redo command after reopening plot via undo.
   
### [Line Chart](../../visualize/viewers/line-chart.md)
* Fixes:
  * Segment coloring: all segments are displayed now.
  * Multi axis mode works with splits.
  * [#2950](https://github.com/datagrok-ai/public/issues/2950): Line chart with multiple axes: legend updates when Y column is changed using in-plot selector. 
  * [#2951](https://github.com/datagrok-ai/public/issues/2951): Number of Y columns updates immediately in properties panel when columns are removed from the plot. 
  * [#2944](https://github.com/datagrok-ai/public/issues/2944): Colors of the line and the legend do not differ when multiple splits are selected. 
 
### [Bar chart](../../visualize/viewers/bar-chart.md)
* Fixes: 
  * Molecules are renderered correctly when bar chart is resizing. 
  * Property "Show selected rows" affects the view. 

### [Box plot](../../visualize/viewers/box-plot.md)
  * The ability to use two or more categories is added.
  * Fix: 
    * 'Show custom tooltip' functionality is fixed. 

### [Scatterplot](../../visualize/viewers/scatter-plot.md)
* [#2688](https://github.com/datagrok-ai/public/issues/2688): Structure labels: improved positions and sizes adjustment. 
* Fix: 
  * Formula Lines: View updates after deleting options. 

 ### [Scripting](https://datagrok.ai/help/compute/scripting/)
  * New ability to download the script as a file. 
  * Default scripts creates without tags. 
  * Fix: 
    * Usage displays runs.

### JS API
  * Ability to get Func result view using API is added. 
  * Metadata set by .tags with column.meta.xxx is replaced.

### Data Access
  * Connections: the 'creating a connection' form is updated.
  * Fix:
    * Databases: New Run_query result creates with the name. 
    
### Enhancements in packages: 
### [Curves](https://github.com/datagrok-ai/public/tree/master/packages/Curves/CHANGELOG.md)
* Fix: 
  * [#2978](https://github.com/datagrok-ai/public/issues/2978): Log-linear function: Fixing initial parameters calculation. 

### [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts/CHANGELOG.md)
  * Fixes:
    * [#2992](https://github.com/datagrok-ai/public/issues/2992): Sunburst can select/filter on empty category.
    * [#2954](https://github.com/datagrok-ai/public/issues/2954): Sunburst: unsupported columns are filtered out in column selector. 

### [PowerPack](https://github.com/datagrok-ai/public/blob/master/packages/PowerPack/CHANGELOG.md)
  * 'Add new column': Formula edit improvements.
  * Fixes:
    * [#2981](https://github.com/datagrok-ai/public/issues/2981): Typing calculated formula: input is not overwritten unexpectedly.
    * [#3008](https://github.com/datagrok-ai/public/issues/3008): Qnum function is not missing from hints. 
    * [#2949](https://github.com/datagrok-ai/public/issues/2949): Calculated columns dialog: no extra scroll bars. 
    * [#2993](https://github.com/datagrok-ai/public/issues/2993): Fixing the unability to type in inputs after adding a calculated column. 
    * [#2918](https://github.com/datagrok-ai/public/issues/2918): Fixing the behaviour when typing `$` in the calculated column dialog.
    * [#2988](https://github.com/datagrok-ai/public/issues/2988): Calculated columns dialog: warnings and error messages are made more clear and consistent. 
    * [#2798](https://github.com/datagrok-ai/public/issues/2798): Calculated column renaming is cascaded to the dependent columns for a saved project. 

 ### [EDA](https://github.com/datagrok-ai/public/blob/master/packages/EDA/CHANGELOG.md)
  * Added to predictive modeling kit:
    * Softmax classifier
    * XGBoost tools
    * Partial least sqaures regression

### [Chem](https://github.com/datagrok-ai/public/blob/master/packages/Chem/CHANGELOG.md)
* Fixes:
  * Chemical space: Reseting marker type to circles. 
  * Activity cliffs: Sets activity default column of date type. 
  * R-Group analysis: error updates when none R-groups were found. 
  * [#2983](https://github.com/datagrok-ai/public/issues/2983): Fixing tooltip styles for structure columns. 

### Other fixes
* Table view: Form styles with refresh button is fixed.
* [#2942](https://github.com/datagrok-ai/public/issues/2942): Export to CSV with 'Molecules As Smiles' works if there is some filtering. 
* [#2943](https://github.com/datagrok-ai/public/issues/2943): Categorical filter in column header is not broken after removing the same column from filters panel. 
* [#2985](https://github.com/datagrok-ai/public/issues/2985): Combined boolean filter can be removed from the project.

## 2024-09-26 1.20.3

### Improvement:
* [#3032](https://github.com/datagrok-ai/public/issues/3032): Page is freezing for a while when colour by column is applied in some cases (large number of categories + "starts with") 

## 2024-08-27 1.20.2

### Improvements and fixes:
* GROK-13701: Column headers rendering updates. 
* [#2982](https://github.com/datagrok-ai/public/issues/2982): Viewers: tooltip was removed from the legend. 
* [#2948](https://github.com/datagrok-ai/public/issues/2948): Colour picker in legend issues. 
* [#2970](https://github.com/datagrok-ai/public/issues/2970): Molecule column is missing in exported CSV with options "molecules as smiles" + "selected columns only". 
* [#2976](https://github.com/datagrok-ai/public/issues/2976): Categorical colouring's properties ".color-coding-fallback-color" and ".color-coding-match-type" are not saved in the layout. 
* [#2791](https://github.com/datagrok-ai/public/issues/2791): Fix duplicated table` renaming. 

## 2024-08-05 1.20.1

### Fixes:
* [#2927](https://github.com/datagrok-ai/public/issues/2927): Heatmap is in a collapsed state after applying saved layout if it was stacked with another viewer.
* [#2942](https://github.com/datagrok-ai/public/issues/2942): Export to CSV with 'Molecules As Smiles' fails if there is some filtering.
* [#2943](https://github.com/datagrok-ai/public/issues/2943): Categorical filter in column header is broken after removing the same column from filters panel.
* [#2949](https://github.com/datagrok-ai/public/issues/2949): Calculated columns dialog: extra scroll bars.
* GROK-16337: Bar Chart: Property "Show selected rows" doesn't affect view.
* Color picker :
   * [#2945](https://github.com/datagrok-ai/public/issues/2945): Color picker HEX\RGB choice input doesn't fit into dialog.
   * [#2948](https://github.com/datagrok-ai/public/issues/2948): Colour picker in legend.
* [Line Chart](../../visualize/viewers/line-chart.md):
   * [#2944](https://github.com/datagrok-ai/public/issues/2944): Line chart: the color of the line and the legend differs when multiple splits are selected.
   * [#2950](https://github.com/datagrok-ai/public/issues/2950): Line chart with multiple axes: legend is not updated when Y column is changed using in-plot selector.
   * [#2951](https://github.com/datagrok-ai/public/issues/2951): Line chart: number of Y columns is not updated immediately in properties panel when columns are removed from the plot.

## 2024-07-23 Datagrok 1.20.0 release 

The Datagrok 1.20.0 release focuses on improving stability, performance, and usability, introducing refined workflows to make the platform more intuitive and reliable. Some of the key improvements in this release include:

* Lightweight predictive modeling improvements. [MlFlow registry integration](https://youtu.be/RS163zKe7s8?t=1424).
* File caching feature reduces the time required to access frequently used files by storing them locally in browser cache. This feature is compatible with various file storages, including Amazon S3, Azure Blob Storage, and more (follow our [guideline](https://datagrok.ai/help/access/files/#caching-files-shares) to configure cache for your connection). 
* Inputs harmonization brought significant stability enhancements and API improvements, ensuring a smoother and more consistent experience across the platform.

### Visualization and usability improvements:

* Macromolecules updates: 
  * long sequences visualization optimized.
  * cell renderer per type for small molecules and column width changes.
  * monomer tooltip polished.
  * monomer placer optimization for column width changed.
  * work with missed monomers in Helm.
* Improved form autosizing.
* [Diff Studio](https://datagrok.ai/help/compute/diff-studio#solver-settings): implementing the debugging mode.
* Layout editing harmonization for Data Query.
* Restyled the process of dragging an entity into a project
* Objects can be added to the favorites list.
* No auto running for functions in browse preview.
* [#2847](https://github.com/datagrok-ai/public/issues/2847): Export CSV without rounding.
 
### Viewers
* Improvements:
  * GROK-14382: Add full property panel menu to the context menu on right click.
  * GROK-15008: Density plot: add functionality.
  * GROK-14607: Network diagram: auto layout.
  * [#2658](https://github.com/datagrok-ai/public/issues/2658): Scatter Plot: ColorMin, ColorMax, SizeMin, SizeMax properties.
  * [#2926](https://github.com/datagrok-ai/public/issues/2926): Heatmap: save scrollbar position for layout.
  * [#2932](https://github.com/datagrok-ai/public/issues/2932): Hide the option “Is Grid” from the property panel. 
  
* Fixes:
  * GROK-11678: Tile viewer: switching between tables doesn't work.
  * GROK-15518: Pivot table, Pie chart: filtration issues.
  * GROK-15811: Pie Chart legend: Fix click on the category black cross. 
  * GROK-16226: DG.Filters sets columnNames incorrectly. 
  * GROK-15626: Viewer settings do not reset after switching between different options. 
  * GROK-16330: Table view: Form style with refresh button is broken. 
  * [#2925]( https://github.com/datagrok-ai/public/issues/2925): Viewer title is not saved in layout if it was edited in viewer's header. 
  * [#2771]( https://github.com/datagrok-ai/public/issues/2771): Filter out legend with empty categories in the legend. 

### Grid
* Improvements:
  * GROK-16205: Support markup links. 
  * GROK-15984: Formula-based rendering.
  * [#2789](https://github.com/datagrok-ai/public/issues/2789): Ability to display the table name/description on the Grid.
* Fixes:
  * GROK-15188: Dataframe/grid: renaming column from '~name' -> 'name' doesn’t change visibility of column. 
  * [#2934](https://github.com/datagrok-ai/public/issues/2934): Some hotkeys for selection/deselection are not working for columns (MacOS).
 
### [Scatterplot](../../visualize/viewers/scatter-plot.md)
* Improvements and fixes:
  * GROK-14632: Marker legend isn't rendered in the trellis plot. 
  * GROK-14376: Scatterplot: unzooming with mouse scroll can go to infinity.
  * [#2913](https://github.com/datagrok-ai/public/issues/2913): Improve different context menu style / functionality between Scatterplot in Trellis vs native Scatterplot.
  
### [Line Chart](../../visualize/viewers/line-chart.md)
* Fixes:
  * GROK-15466: Table > Add View: Formula Lines for Line Chart should be present in added view.
  * GROK-15464: Receiving errors when setting the second split in some cases. 
  * GROK-15485: Bugs in RowSource = FilteredSelected, SelectedOrCurrent.
  * [#2875](https://github.com/datagrok-ai/public/issues/2875): Line chart, trellis plot: number of selected columns is not updated in the properties panel immediately. 
  * [#2904](https://github.com/datagrok-ai/public/issues/2904): When multi axis option is used. together with split, line chart is empty. 
  
### Bar chart
* Improvement:
  * [#2881](https://github.com/datagrok-ai/public/issues/2881): Bar chart: add an option to rotate / invert axes. 
* Fixes:
  * GROK-15887: Viewer window can't be resized in height when it's too high on the screen. 
  * GROK-16234: Wrong label shortening. 
  * GROK-16331: Molecules are rendered incorrectly on resizing bar chart. 
  
### Box plot
* Improvements:
  * [#2905](https://github.com/datagrok-ai/public/issues/2905): Add ''Size by" or "Shape by" or "color by'' options. 
  * GROK-9748: Violin-state option. 
 
### JS API
* Improvements:
  * [Compatibility tool](https://datagrok.ai/help/deploy/releases/compatibility/) for JS API changes.
  * GROK-15771: RFC: Public API. 
  * GROK-15827: Expose core viewer events to JS API. 
  * GROK-16215: Force DG.FileInfo to have `name`. 
* Fix:
  * GROK-16228: `grok.functions.calls.list` returns incorrect Func's nqName functions. 

### Data Access
* Improvements:
  * GROK-15413: Sharepoint data provider. 
* Fixes:
  * GROK-15979: Swagger: blank screen after loading swagger file. 
  * GROK-16003: Queries: New Aggregation Query: PivotGridDbTable. 
  * GROK-15967: Context panel: When you share the connection \- the information doesn`t update.
  
### Enhancements in packages
* Improvements:
  * GROK-15922: EDA: Linear Regression. 
  * GROK-15759: PowerPack: 'Add new column': Formula edit improvements.
  * GROK-11494: [Widgets](https://datagrok.ai/help/visualize/widgets): events.
  * [#2902](https://github.com/datagrok-ai/public/issues/2902): Create "Pivot table" tutorial part.
* Fixes:
  * GROK-15324: Widgets: Recent projects: context menu fixing. 
  * [#2924](https://github.com/datagrok-ai/public/issues/2924): Curves: connectDots doesn't work if fit is turned off. 

### [Bio](https://github.com/datagrok-ai/public/blob/master/packages/Bio/CHANGELOG.md)
* Helm:
  * GROK-15994: Color missing monomers. 
  * GROK-15995: Colors for libraries monomers. 
  * GROK-15796: Helm cell renderer fixes for conversion to Helm. 
* Fixes:
  * GROK-15525: MSA: add checking unsuitable data to avoid running MSA with them. 
  * GROK-15996: Macromolecule cell renderer fails in long mode. 
  * GROK-15798: Atomic Level fixing for units FASTA, UN alphabet.
  * GROK-15793: Calculate Identity, Similarity throw Index out of bounds.

### [Chem](https://github.com/datagrok-ai/public/blob/master/packages/Chem/CHANGELOG.md)
* Fixes:
  * GROK-15299: Functions can't be saved to a project with data sync. 
  * GROK-15790: Transform to smiles doesn't change units. 
 
### [Scripting](https://datagrok.ai/help/compute/scripting/)
* Improvements and fixes:
  * GROK-15424: [Cascade parametrized inputs in scripts](https://datagrok.ai/help/datagrok/concepts/functions/func-params-annotation#function-inputs). 
  * GROK-15876: Split logic for blobs and file parameters. 
  * GROK-15973: Behavior changes for clicking the 'Save' button. 
  * GROK-15968: Usage: rename 'Run count' into 'Successful Runs'. 
  * GROK-15829: Unable to add parameter to script: "+" button is missing. 
 
### Fixes:
* GROK-15834: Table Linking: wrong results when multiple duplicate keys are present in both master and details table. 
* GROK-15871: Project creation date is shown instead of updated one in the dashboards. 
* GROK-15570: Fixes for slider for filtered numerical column where all values are nulls. 
* GROK-12320: "Add new row" button is not rendered properly when no row headers are used.  
* GROK-16208: Tooltips: broken layout for a float column with only nulls. 
* GROK-16269: History prints wrong timestamps. 
* GROK-16320: Predictive modeling: interactive model saves without a name.


## 2024-06-21 1.19.1

### Fixes:

* GROK-16000: HashId for package functions doesn't work.


## 2024-06-07 Datagrok 1.19.0 release

### Visualization and usability improvements
* Updated project`s management.
* Power Search: updated support for entities.
* Usage analysis: user report system improvements.
* Speedup for platform’s startup.
* New hierarchical and expression filters.
* New recent activity view.
* Categorize function improvements.
* Improved experience with sticky meta.
* Browse updates: search, preview, tooltips. 
* Viewers: hooks for custom JS initialization.
* OptiTool: compute inputs providing the specified output of RichFunctionView functions.
* GROK-15361: Updates for Custom formatting.
* GROK-14203: Calculated columns: Update values if the base column values changed.
* [#2673](https://github.com/datagrok-ai/public/issues/2673): PowerGrid: MultiChoice cell renderer.
* [#2681](https://github.com/datagrok-ai/public/issues/2681): PowerGrid: Tags cell renderer.
* [#2765](https://github.com/datagrok-ai/public/issues/2765): PowerPack: integrate search with the semantic value extractors.
* [#2668](https://github.com/datagrok-ai/public/issues/2668): Implement export selected/filtered rows as a CSV.
* [#2710](https://github.com/datagrok-ai/public/issues/2710): Implement export selected dataframe/view as a CSV.
* [#2772](https://github.com/datagrok-ai/public/issues/2772): Pivot table: add a property to hide sparklines.
* [#2847](https://github.com/datagrok-ai/public/issues/2847): Export CSV without rounding.
 
### Viewers
#### Improvements:
* [#2733](https://github.com/datagrok-ai/public/issues/2733): Legend: provide diverse palette and markers' shape.
* [#2755](https://github.com/datagrok-ai/public/issues/2755): Hide the zoom slider for making screenshots.
* [#2742](https://github.com/datagrok-ai/public/issues/2742): Indicate the selected column in the column selector.
* [#2770](https://github.com/datagrok-ai/public/issues/2770): Ability to toggle on / off multiple vs single regression line per category.
* [#2664](https://github.com/datagrok-ai/public/issues/2664): Implement a cascade column renaming used by Formula lines.
* [#2685](https://github.com/datagrok-ai/public/issues/2685): Histogram viewer: add stacked view option when split is set.
#### Fixes:
* [#2642](https://github.com/datagrok-ai/public/issues/2642): Filtering done using viewers is unexpectedly reset on applying other filters.
* [#2771](https://github.com/datagrok-ai/public/issues/2771): Filter out legend with empty categories in the legend.
 
### Grid
#### Improvements:
* GROK-15475: Ability to customize cell styles (content/header, color, font, alignment etc.).
* GROK-15469: Text cells: highlight the search terms.
#### Fixes:
* GROK-15249: Error when pressing Column Properties on a programmatically created Grid.
* GROK-15457: Fix categorical color-coding styles in the property panel.
* [#2682](https://github.com/datagrok-ai/public/issues/2682): Fix the tooltip for Allow Row Reordering.
* [#2663](https://github.com/datagrok-ai/public/issues/2663): Enable easier composition of rows/columns range selections.
 
### Forms
#### Improvements:
* GROK-14951: Clicking on a field should drive to the appropriate column in the table (like 3DX).
* GROK-14985: Ability to edit a form in the form designer.
* GROK-15416: Integration with sparklines.
* [#2687](https://github.com/datagrok-ai/public/issues/2687): Add an option to adjust the size of the compound structure image.
#### Fixes:
* GROK-15209: Error after renaming a column name.
* GROK-15325: In case form viewer is added through layout, grid doesn't jump to corresponding cell when clicking on form viewer field.
* GROK-15677: Fixing "Build a form for selected columns" option.
* [#2644](https://github.com/datagrok-ai/public/issues/2644): Next row button: incorrect behavior after sorting the grid.
 
### [Scatterplot](../../visualize/viewers/scatter-plot.md)
#### Improvements:
* GROK-15459: Ability to show horz axis labels at 45 degrees.
* [#2704](https://github.com/datagrok-ai/public/issues/2704): Add min/max fields for X/Y axes on plot to improve viewer's usability.
#### Fixes:
* GROK-15069: Incorrect hadling of Color and Markers legend in some cases.
* GROK-15190: Scatterplot, line chart: updating formula lines does not work for those specified via a dataframe.
* GROK-13884: The legend is displayed differently depending on the order in which the options are assigned.
* [#2671](https://github.com/datagrok-ai/public/issues/2671): Filtered out data is unexpectedly shown in some cases on filtering the plot further using markers legend.
 
### [Trellis plot](../../visualize/viewers/trellis-plot.md)
#### Improvements:
* GROK-15393: Ability to scroll via mouse wheel.
* [#2636](https://github.com/datagrok-ai/public/issues/2636): Bar chart: improvements.
#### Fixes:
* GROK-15035: Sparklines: incorrect data display.
* GROK-15036: Histogram: error when Row source = MouseOverGroup.                                      	
* GROK-15038: Box plot: error when selecting rows in grid.
* GROK-15013: Bar chart: numbers (zeroes) on chart have different sizes.
* GROK-15033: Line chart: if you set the Split option, the legend remains visible on other inner viewers.
* GROK-15025: Some axes labels overlap the plot.
* GROK-15137: Sparklines: error when setting selected columns.
* GROK-15304: Selecting categories in the legend works incorrectly.
* [#2749](https://github.com/datagrok-ai/public/issues/2749): Line chart and Trellis plot: '+' icon is missing.
 
### [Line Chart](../../visualize/viewers/line-chart.md)
#### Improvements:
* [#2846](https://github.com/datagrok-ai/public/issues/2846): Add distinguishable color legend for line chart when there are multiple Y axes and split key.
* [#2726](https://github.com/datagrok-ai/public/issues/2726): Implement consistent behavior for aggregated and non-aggregated axes.
#### Fixes:
* GROK-15078: Error on changing column name when column used in x\- and y columns.
* GROK-14501: Aggregation Type and Show Split Selector do not work.
* GROK-15048: Incorrect legend display when Row Source = MouseOverGroup and Filter is set.
* [#2782](https://github.com/datagrok-ai/public/issues/2782): Incorrect color-coding while setting filters.
* [#2776](https://github.com/datagrok-ai/public/issues/2776): Page is frozen if too many categories are used in split.
* [#2747](https://github.com/datagrok-ai/public/issues/2747): Formula lines: inconsistent behavior.
* [#2677](https://github.com/datagrok-ai/public/issues/2677): Formula line position is incorrect after switching axis to log scale.
 
### Data Access:
* GROK-14953: Azure blob: directory shown as a file.
* GROK-15397: Storage: add SharePoint provider.
* GROK-15434: Run polytool on molfile v3k libs.
 
### JS API:
* GROK-14512: JS API for entity properties/types/schemas.
* GROK-15671: `format` option does not go to `DG.Property.format`.
* GROK-14674: DG.ViewBase does not trigger UI update on name change.
* GROK-14707: DG.Column.init contructs invalid DataFrame column.
 
### Enhancements in packages
 
### [Bio](https://github.com/datagrok-ai/public/blob/master/packages/Bio/CHANGELOG.md)
#### Improvements:
* GROK-15039: Expose function for PolyTool lib creation.
* GROK-15044: Add basic documentation for monomer lib file manager UI.
* GROK-15045: Monomer lib file manager UI improvements.
* [#2707](https://github.com/datagrok-ai/public/issues/2707): Monomer type as a class.
#### Fixes:
* GROK-14913: Atomic Level for sequences of fasta MSA with gaps fixing.
* GROK-14916: Biosubstructure filter for sequences of Helm fixing.
* GROK-11982: Composition Analysis: duplicates a WebLogo viewer when applying a layout.
* GROK-15086: GetRegion, Notation: doesn't work.
* GROK-15150: hidden/showed inputs incorrect display in forms.
* GROK-15176: An Error after pressing the Molecule on molfile(msa(Sequence)) column.
* GROK-14914: Helm: Fix Properties panel of Context panel for sequences of MSA.
 
### [Chem](https://github.com/datagrok-ai/public/blob/master/packages/Chem/CHANGELOG.md)
#### Improvements:
* GROK-15018: RGroup analysis improvements.
* GROK-15508: MMPA | Generated \- show what cases are actually generated.
* GROK-15501: MMPA | UI/UX and other improvements.
* GROK-15502: MMPA | Ability to switch activity on/off.
* GROK-15454: Similarity, Diversity search viewers | Implement row source.
* GROK-14773: RdKit service as molecule cache.
* [#2729](https://github.com/datagrok-ai/public/issues/2729): Similarity, Diversity searches: add the ability to perform the search for the filtered data.
* [#2525](https://github.com/datagrok-ai/public/issues/2525): Scaffold  tree highlighting improvements.
#### Fixes:
* GROK-14029: Substructure highlight: settings are not saved to the Layout.
* GROK-15063: 2D widget is not resizing.
* GROK-15144: Layout applies incorrectly when having several clones.
* GROK-15127: Python scripts Mutate, Curate, R groups sporadically fail.
* GROK-15171: Filter doesn't apply correctly after removing rows and disabling.
* GROK-15208: MMPA | 'Refreshing pairs...' progress bar is not closing. 
* GROK-15240: Error in balloon after R-group analysis' start (malformed data).
* GROK-15507: MMPA | Control of fragments size (to options).
* GROK-12906: Context Pane: Fix alignment for the *more actions\* icon.
 
### [Curves](https://github.com/datagrok-ai/public/tree/master/packages/Curves/CHANGELOG.md)
#### Improvements:
* [#2754](https://github.com/datagrok-ai/public/issues/2754): Implement capability just to connect the points (without fitting).
* [#2103](https://github.com/datagrok-ai/public/issues/2103): Property panel changes.
* [#2105](https://github.com/datagrok-ai/public/issues/2105): Outliers and curves colors changes.
* [#2101](https://github.com/datagrok-ai/public/issues/2101): Improve curves properties and rendering.
* [#1645](https://github.com/datagrok-ai/public/issues/1645): MultiCurveViewer.
#### Fixes:
* [#2797](https://github.com/datagrok-ai/public/issues/2797): Custom fit function doesn't fit correctly.
* [#2748](https://github.com/datagrok-ai/public/issues/2748): Whole table is broken if the cell with curves contains specific data.
 
### [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts/CHANGELOG.md)
#### Improvements:
* GROK-15447: Radar viewer: add a part of Viewers tutorial.
* GROK-15409: Radar: improvements (interactivity, color-code, etc.).
* GROK-15340: Radar: Spider Plotting \- Multiple series.
* GROK-14610: Sunburst: animation and selection improvements.
* [#2500](https://github.com/datagrok-ai/public/issues/2500): Sunburst improvements.
#### Fixes:
* GROK-13831: Tree viewer: error when trying to set Size or Color.
* GROK-13832: Tree viewer: doesn't respond on table switching.
* GROK-13390: Radar viewer: harmonization.
* GROK-15245: Radar: error when saving to project.
* GROK-15166: Sunburst: error when trying to switch the Table property.
* GROK-14899: Tree Visualization: Color Agg fails on null values.
 
### DiffStudio
#### Improvements:
* GROK-14487: UI improvement.
* GROK-15713: Fitting.
* GROK-15112: Added Bioreactor to examples.
* GROK-15116: Added E-notation parsing.
* GROK-15294: New sidebar feature.
* GROK-15364: New app view feature.
 
### Fixes:
* GROK-14994: Conditions with JS functions don’t work.
* GROK-14673: UiBuilder: validators strange behavior.
* GROK-15341: Semantic value extractors.
* GROK-13568: Help | Compute: Sensitivity Analysis.
* GROK-15192: Incorrect behavior of inputs in scripts and queries.
* GROK-15376: Column data disappearing while changing time format.
* GROK-15613: 'Ctrl + Wheel' behavior as 'Zoom In/Zoom Out'.
* GROK-14828: Downloaded files doubled after Extract Selected Rows.
* GROK-15834: Table Linking: wrong results when multiple duplicate keys are present in both master and details table.
* GROK-15051: Pie chart: error when selecting Segment angle and hovering the empty value.
* [#2824](https://github.com/datagrok-ai/public/issues/2824): Creating Dataframe from csv loses qnum precision.
 
#### [Box Plot](../../visualize/viewers/box-plot.md):
* GROK-15752: Box Plot: can't select points outside of whiskers.
* GROK-15365: Box plot: error when switching Value axis to the log scale in some cases.
* [#2764](https://github.com/datagrok-ai/public/issues/2764): Wrong area is selected with shift-drag when categories at the left are filtered out.
 
#### [Bar chart](../../visualize/viewers/bar-chart.md):
* GROK-15156: Values are not shown for just negative numbers.
* [#2696](https://github.com/datagrok-ai/public/issues/2696): Add highlighting for bar chart subsets.
 
#### [Filter Panel](../../visualize/viewers/filters.md):
* GROK-15650: Combined boolean filter.
* GROK-15122: Categorical filters: Tooltip and mouse over group is automatically cleared after 200ms on category hover.
* GROK-15206: Filters: categorical filter is broken for hidden ~name columns.
* [#2647](https://github.com/datagrok-ai/public/issues/2647): File refresh breaks structure filter.
* [#2684](https://github.com/datagrok-ai/public/issues/2684): Wrong filters are added if there are two views in some cases.
* [#2185](https://github.com/datagrok-ai/public/issues/2185): Fuzzy filter enhancements.
 
#### [Tutorials](https://github.com/datagrok-ai/public/tree/master/packages/Tutorials/CHANGELOG.md):
* GROK-15143: Multivariate Analysis and R-Groups Analysis tutorial: Top menu items don't open properly.
* GROK-15132: Timelines: error when using the legend.




## 2024-06-05 1.18.9

### Addressed Issues:

* GROK-15834: Table Linking: wrong results when multiple duplicate keys are present in both master and details table 
* [#2839](https://github.com/datagrok-ai/public/issues/2839): Show Help in "Settings \- Windows" remains checked always 


## 2024-05-19 1.18.8

### Improvements:
* GROK-15681: Projects Management 
* [#2831](https://github.com/datagrok-ai/public/issues/2831): Default open folders in the Browse Menu 

### Fixes:

* [#2832](https://github.com/datagrok-ai/public/issues/2832): Tab Name changes when reopening Project 
* [#2840](https://github.com/datagrok-ai/public/issues/2840): "Global Search" button on bottom-right bar menu improvements
* [#2834](https://github.com/datagrok-ai/public/issues/2834): Loading of DB tables appears to continue forever and never complete 


## 2024-05-15 1.18.7

### Improvements:

* [#2845](https://github.com/datagrok-ai/public/issues/2845): Changing the colors of labels in the properties

### Fixes:

* [#2824](https://github.com/datagrok-ai/public/issues/2824): Creating Dataframe from csv loses qnum precision


## 2024-05-08 1.18.6

### Fixes:

* FormViewer: fixed an issue with dragging column headers
* Scripting: Clear temporary token for input files


## 2024-05-01 1.18.5

### Improvements:

* Error handling: "Report an error" dialog when you click on exclamation point.
* Sticky meta: improve visibility for users:
   * Show preview for entity types
   * Support multi-values edit 
   * Entity type settings with TabControl 
   * Better type selector for schema editor.
* JS API for entity properties/types/schemas.
* [#2733](https://github.com/datagrok-ai/public/issues/2733): Viewers | Legend: provide diverse palette and markers' shape.
* [#2742](https://github.com/datagrok-ai/public/issues/2742): Viewers: Indicate the selected column in the column selector.
* [#2772](https://github.com/datagrok-ai/public/issues/2772): Pivot table: add a property to hide sparklines.
* GROK-14412: Trellis plot | Column selectors: ESC should close the popup.

### Fixes:

* Azure blob: directory shown as a file.
* GROK-15190: Scatterplot, line chart: updating formula lines does not work for those specified via a dataframe.
* GROK-15249: Error when pressing Column Properties on a programmatically created Grid.
* [#2642](https://github.com/datagrok-ai/public/issues/2642): Filtering done using viewers is unexpectedly reset on applying other filters in some cases.
* [#2644](https://github.com/datagrok-ai/public/issues/2644): Forms | Next row button: incorrect behavior after sorting the grid.
* [#2749](https://github.com/datagrok-ai/public/issues/2749): Line chart and Trellis plot: '+' icon is missing.
* [#1092](https://github.com/datagrok-ai/public/issues/1092): Multiple issues with Conditional Color Dialog.
* [#2764](https://github.com/datagrok-ai/public/issues/2764): Box plot: wrong area is selected with shift-drag when categories at the left are filtered out.
* [#2509](https://github.com/datagrok-ai/public/issues/2509): Pinned columns in multiple views for the same table cause performance issues in some cases.
* [#2782](https://github.com/datagrok-ai/public/issues/2782): Line chart: incorrect color-coding while setting filters.
* [#2636](https://github.com/datagrok-ai/public/issues/2636): Trellis plot | Bar chart: contrast color for blue instead of black works when there is no Stack set to the bar chart inner viewer.
* [#2793](https://github.com/datagrok-ai/public/issues/2793): Scatter plot with 'filter by zoom': filtering by scatter plot is shown in filter panel's '?' after resetting in some cases.


## 2024-04-05 1.18.4

### Addressed Issues

* (Bug) GROK-15334: Large file open fails (WIP)


## 2024-03-28 1.18.3

### Addressed Issues

* (Bug) GROK-15300: Table duplicates after changing ID 


## 2024-03-19 1.18.2

### Addressed Issues

* (Bug) GROK-15215: Async package functions don't work in Add new column 
* (Bug) GROK-15216: Views migration didn't run 
* (Bug) GROK-15166: Sunburst: error when trying to switch the Table property 


## 2024-03-14 1.18.1

### Addressed Issues

* (Improvement) GROK-14698: Color coding: improve traffic lights schemas 


## 2024-03-08 1.18.0

Datagrok 1.18 release focuses on usability improvements and stability:

* Improved **Browser** for navigation, preview, and convenient interaction with all available functionality on the Datagrok platform.
* Ability to clone projects.
* New CVM queue employs multiple JKG nodes to ensure scalable and streamlined script execution.
* New MultiChoice cell renderer to show a number of checkboxes within a cell. For details, see [Add multiple check box and dropdown list to cell of table](https://community.datagrok.ai/t/add-multiple-check-box-and-dropdown-list-to-cell-of-table/835/9?u=oahadzhanian.datagrok.ai).
* New Tags cell renderer for comma-separated rows.
* Automatic error handling report: A "Report an Error" dialog box appears when you click the exclamation point icon (Beta version).
* Sticky meta (Beta version).

### Visualization and usability improvements

* Calculated columns:
  * Save calculated columns to the projects with data synchronization.
  * Update values if the base column values changed.
*  [#2634](https://github.com/datagrok-ai/public/issues/2634): Synchronization between Bar chart and Line chart.
* [#2455](https://github.com/datagrok-ai/public/issues/2455): Viewers: Add the ability to choose several categories with ctrl click.
* [#2548](https://github.com/datagrok-ai/public/issues/2548): Viewers | Legends: implement switching between categories using up and down arrows when one category is selected exclusively.
* [#2635](https://github.com/datagrok-ai/public/issues/2635): Customization of actions on the Context Panel.
* [#2664](https://github.com/datagrok-ai/public/issues/2664): Implement a cascade column renaming used by Formula lines.
* [#2467](https://github.com/datagrok-ai/public/issues/2467): Allow to set tab label for stacked viewers programmatically.
* [#2598](https://github.com/datagrok-ai/public/issues/2598): Context menus to hide selectors.
* [#2564](https://github.com/datagrok-ai/public/issues/2564): Column selectors should not overlap the viewer.
* [#2299](https://github.com/datagrok-ai/public/issues/2299): Make viewers aware of surroundings.
* Rename viewer by hotkey **F2**.
* Column selectors: ESC should close the popup.
* Fixed:
   * [#2570](https://github.com/datagrok-ai/public/issues/2570): Viewers: legend does not show all categories after filtering in specific cases.
   * [#2590](https://github.com/datagrok-ai/public/issues/2590): Calculated columns dialog: not all functions are available in list, search is not working as expected.
* [Grid](../../visualize/viewers/grid.md):
   * [#2645](https://github.com/datagrok-ai/public/issues/2645): Support single decimal place for rounding in calculated columns
   * Rendering table cells with any viewer.
   * Custom numeric format.
   * Fixed:
     * [#2468](https://github.com/datagrok-ai/public/issues/2468): Cell values starting with the quote character are parsed incorrectly.
     * [#2483](https://github.com/datagrok-ai/public/issues/2483): Order and hide columns and Tooltip dialogs: cosmetic issues.
     * [#2503](https://github.com/datagrok-ai/public/issues/2503): Order and Hide: Tooltip with null category shouldn’t be that big.
     * [#2523](https://github.com/datagrok-ai/public/issues/2523): Columns added after performing structure search cannot be shown again if hidden.
* [Filter Panel](../../visualize/viewers/filters.md):
   * [#2185](https://github.com/datagrok-ai/public/issues/2185): Fuzzy filter enhancements:
   * The filter header corresponds to the column name.
   * Ability to combine with free-text filter
   * Save to layout typical searches / search patterns
   * [#2502](https://github.com/datagrok-ai/public/issues/2502): buttons on the filter panel appear on hovering only.
   * Fixed:
     * [#2504](https://github.com/datagrok-ai/public/issues/2504): The question mark hovering doesn’t show the filtering of the scaffold tree viewer.
     * [#2647](https://github.com/datagrok-ai/public/issues/2647): #2647: File refresh breaks structure filter
     * [#2684](https://github.com/datagrok-ai/public/issues/2684): #2684: Wrong filters are added if there are two views in some cases.
* [Scatterplot](../../visualize/viewers/scatter-plot.md):
   * [#2456](https://github.com/datagrok-ai/public/issues/2456): ignore negatives and zero values when switching to log scale.
   * [#2480](https://github.com/datagrok-ai/public/issues/2480):default range should take into account only the rows where both axes values are present.
   * Fixed:
     * [#2330](https://github.com/datagrok-ai/public/issues/2330): Scatterplot has to show empty categories like Box plot and Bar chart do.
     * [#2487](https://github.com/datagrok-ai/public/issues/2487): datetime columns are not supported when adding formula lines.
     * [#2488](https://github.com/datagrok-ai/public/issues/2488): Color selector is missing for formula lines dialog.
     * [#2489](https://github.com/datagrok-ai/public/issues/2489): Color selector opened from the 'style' section in properties panel cannot be closed.
     * [#2505](https://github.com/datagrok-ai/public/issues/2505): If categories are filtered out they shouldn't be shown in the marker legend.
     * [#2527](https://github.com/datagrok-ai/public/issues/2527): error occurs when axes are set to log scale in some cases.
     * [#2530](https://github.com/datagrok-ai/public/issues/2530): Errors on hovering scatterplot with formula lines.
     * [#2665](https://github.com/datagrok-ai/public/issues/2665): Ctrl+Shift+Drag doesn't work for deselection.
     * [#2671](https://github.com/datagrok-ai/public/issues/2671): filtered out data is unexpectedly shown in some cases on filtering the plot further using markers legend.
     * [#671](https://github.com/datagrok-ai/public/issues/671): 'Formula lines' dialog preview is not updated if scatterplot configuration is changed
* [Trellis plot](../../visualize/viewers/trellis-plot.md):
   * [#2457](https://github.com/datagrok-ai/public/issues/2457): redesigning:
     * Move X and Y selectors to the corresponding axes.
     * Most relevant options of the inner viewer should be displayed at the top of the viewer
     * Selectors instead of combo-boxes
   * [#2336](https://github.com/datagrok-ai/public/issues/2336): improve the display of outer and inner viewers properties.
   * [#2636](https://github.com/datagrok-ai/public/issues/2636): Trellis plot | Bar chart: improvements.Now they work with global axes, support multiple splits, and display their axis with category names and colors on the left.
   * Better auto-selection of columns for pie chart and bar chart.
   * Integrate sparklines (Beta version). For details, see [Trellis: sparklines](https://community.datagrok.ai/t/trellis-sparklines/818/1)
   
* [Histogram](../../visualize/viewers/histogram.md):
   * [#2549](https://github.com/datagrok-ai/public/issues/2549): add highlighting for split lines as for line chart.
   * [#2685](https://github.com/datagrok-ai/public/issues/2685): add stacked view option when split is set.
   * Fixed:
     * [#2472](https://github.com/datagrok-ai/public/issues/2472): selected column is not synchronised between in-plot controls and properties panel.
     * [#2524](https://github.com/datagrok-ai/public/issues/2524): Split: no tooltip and Y axis when the values are not normalized.
* [Line chart](../../visualize/viewers/line-chart.md):
   * [#2357](https://github.com/datagrok-ai/public/issues/2357): custom tooltip.
   * [#2623](https://github.com/datagrok-ai/public/issues/2623): implement the one-click way to set the Split by columns.
   *  Interactivity on a stacked bar chart.
   * Fixed:
     * [#2485](https://github.com/datagrok-ai/public/issues/2485): too much empty space if Y axis is logarithmic for specific data.
     * [#2577](https://github.com/datagrok-ai/public/issues/2577): colors in the legend do not match color in the plot in some cases.
     * [#2608](https://github.com/datagrok-ai/public/issues/2608): Line chart with row source = selected: all rows are deselected on clicking line in some cases.
* [Box plot](../../visualize/viewers/box-plot.md): [#2484](https://github.com/datagrok-ai/public/issues/2484): no indication what dot is hovered, wrong dot is selected in some cases.
* [Bar chart](../../visualize/viewers/bar-chart.md):
   * [#2584](https://github.com/datagrok-ai/public/issues/2584): add new aggregations for time ranges such as weeks and days.
   * [#2298](https://github.com/datagrok-ai/public/issues/2298): squeeze the white space around the title.
  * Fixed: [#2562](https://github.com/datagrok-ai/public/issues/2562): error when date column is used as category and split function is non-default.
* For pivot table fixed:
    * [#2535](https://github.com/datagrok-ai/public/issues/2535): non-default aggregations are not saved in layout.
    * [#2606](https://github.com/datagrok-ai/public/issues/2606): colours, formatting, shown/hidden columns are reset on filtering.
*  [Tile viewer](../../visualize/viewers/tile-viewer.md): ability to specify custom lane categories.

*  [Correlation plot](../../visualize/viewers/tile-viewer.md): [#2653](https://github.com/datagrok-ai/public/issues/2653): tooltip issue.

*  [Forms viewer](../../visualize/viewers/forms.md): [#2652](https://github.com/datagrok-ai/public/issues/2652): implemented an option to download a viewer as PNG.

### Data Access

*  Azure Blob integration. For details, see [Azure Blob](../../access/files/shares/azure.md)

### Improvements for developers

* Core: Inputs: validation and harmonization 
   * New `UserInput`.
   * Two-way binding for `DG.InputForm`.
   * `bindFuncCall` method for `InputForm`.
   * Computable "visible" and "enabled" properties
   * `TableInput`: Implement capability to get files from Shares.
   * `NumberInput`: Add capability to set custom step.
   * Removed default rounding for float inputs.
*  Table, RowSource, and Filter properties in js viewers.
*  Scripts logging system.
* Script saving via Ctrl+S.
* Scripting | Variables: added the scrollbar to the variables window.
*  API to send an email from DG.

#### JS API

  * ` Column.getNumber()` method.
  * Dynamical dependencies load for `Utils.loadJsCss(files)`.
   * Auto-generation of Dart interop interface.
  * Exposed `FuncCall` fields to JS.
  * Setter for `InputBase` caption.
  * Made `EventData` for `DataFrame` typed.

## 2024-02-08 1.17.13

### Addressed Issues

* (Bug) [#2647](https://github.com/datagrok-ai/public/issues/2647): #2647: File refresh breaks structure filter
* (Bug) [#2639](https://github.com/datagrok-ai/public/issues/2639): Structure in filter is unexpectedly changed when there are two views in some cases
* (Bug) [#2642](https://github.com/datagrok-ai/public/issues/2642): Filtering done using viewers is unexpectedly reset on applying other filters in some cases (WIP)


## 2024-01-26 1.17.12

### Addressed Issues

* (Bug) Windows share mounts with wrong permissions


## 2024-01-22 1.17.11

### Addressed Issues

* (Bug) [#2628](https://github.com/datagrok-ai/public/issues/2628): Structure filter is not applied in some cases when there are two views opened 


## 2023-12-21 1.17.10

### Addressed Issues

* (Bug) [#2535](https://github.com/datagrok-ai/public/issues/2535): Pivot table: non-default aggregations are not saved in layout 
* (Bug) GROK-14381: Grid | Add Summary column: impossible to hide or add a column through the Order or Hide Columns dialog 
* (Bug) [#2577](https://github.com/datagrok-ai/public/issues/2577): Line chart: colours in the legend do not match colour in the plot in some cases 
* (Bug) [#2570](https://github.com/datagrok-ai/public/issues/2570): Viewers: legend does not show all categories after filtering in specific cases (WIP)
* (Bug) [#2574](https://github.com/datagrok-ai/public/issues/2574): Multiple errors in console on hovering line chart with logarithmic axis and no data 


## 2023-12-11 1.17.9

### Addressed Issues

* GROK-14356: Projects: data-sync option is not shown for .sdf files 


## 2023-12-07 1.17.8

### Addressed Issues

* (Improvement) [#2455](https://github.com/datagrok-ai/public/issues/2455): Viewers: Add the ability to choose several categories with ctrl click (WIP)


## 2023-12-06 1.17.7

### Addressed Issues

* (Improvement) [#2455](https://github.com/datagrok-ai/public/issues/2455): Viewers: Add the ability to choose several categories with ctrl click (WIP)
* (Bug) [#2562](https://github.com/datagrok-ai/public/issues/2562): Bar chart: error when date column is used as category and split function is non-default 


## 2023-11-29 1.17.6

### Addressed Issues

* (Improvement) [#2455](https://github.com/datagrok-ai/public/issues/2455): Viewers: Add the ability to choose several categories with ctrl click 
* (Improvement) [#2527](https://github.com/datagrok-ai/public/issues/2527): Scatterplot: error occurs when axes are set to log scale in some cases
* (Improvement) [#2330](https://github.com/datagrok-ai/public/issues/2330): Scatter plot: has to show empty categories like Box plot and Bar chart do


## 2023-11-28 1.17.5

### Addressed Issues



## 2023-11-23 1.17.4

### Addressed Issues

* (Improvement) GROK-14235: JS API: Utils.loadJsCss(files): dynamically load dependencies (WIP)
* (Bug) GROK-14261: HomeView from PowerPack doesn't work as expected (WIP)
* (Bug) GROK-14229: A user cannot add anything to Favorites 
* (Bug) GROK-14246: JS API: `items` setter on ChoiceInput creates empty option 
* (Bug) GROK-14243: Viewers: ScatterPlot ignores initial filtration (WIP)
* (Bug) GROK-14254: JS API: ui.input.forProperty fails on DF property 
* (Bug) GROK-14272: JS API: ui.input.forProperty has no option to set float format 
* (Bug) GROK-14277: Filter Panel:  Unsupported operation: NaN.ceil() error in some cases 
* (Bug) [#2523](https://github.com/datagrok-ai/public/issues/2523): Columns added after performing structure search cannot be shown again if hidden 
* (Improvement) [#2357](https://github.com/datagrok-ai/public/issues/2357): Line chart: Custom tooltip 
* (Improvement) [#1063](https://github.com/datagrok-ai/public/issues/1063): A way to indicate current viewer 
* (Bug) [#2530](https://github.com/datagrok-ai/public/issues/2530): Errors on hovering scatter plot with formula lines 
* (Improvement) [#2455](https://github.com/datagrok-ai/public/issues/2455): Viewers: Add the ability to choose several categories with ctrl click 
* (Improvement) [#2480](https://github.com/datagrok-ai/public/issues/2480): Scatterplot: default range should take into account only the rows where both axes values are present 
* (Bug) GROK-14271: JS API: defaultValue is ignored by `ui.input.forProperty` 
* GROK-7105: Forms viewer (WIP)
* (Bug) [#2527](https://github.com/datagrok-ai/public/issues/2527): Scatterplot: error occurs when axes are set to log scale in some cases

## 2023-11-13 1.17.3

* (Bug) GROK-14182: ui.choiceInput breaks the old code 
* (Bug) GROK-14210: UI: Format is ignored on floatInput 
* (Improvement) [#2298](https://github.com/datagrok-ai/public/issues/2298): Bar Chart: squeeze the white space around the title (WIP)
* (Improvement) [#2456](https://github.com/datagrok-ai/public/issues/2456): Scatterplot: ignore negatives and zero values when switching to log scale 
* (Improvement) [#2480](https://github.com/datagrok-ai/public/issues/2480): Scatterplot: default range should take into account only the rows where both axes values are present 
* (Bug) [#2485](https://github.com/datagrok-ai/public/issues/2485): Line chart: too much empty space if Y axis is logarithmic for specific data 
* (Improvement) [#2484](https://github.com/datagrok-ai/public/issues/2484): Box plot: no indication what dot is hovered, wrong dot is selected in some cases 
* (Bug) [#2483](https://github.com/datagrok-ai/public/issues/2483): Order and hide columns and Tooltip dialogs: cosmetic issues 
* (Improvement) [#2467](https://github.com/datagrok-ai/public/issues/2467): Allow to set tab label for stacked viewers programmatically 
* GROK-14215: Tiles Viewer: Ability to specify custom lane categories 
* (Bug) [#2489](https://github.com/datagrok-ai/public/issues/2489): Colour selector opened from the 'style' section in properties panel cannot be closed 
* (Bug) [#2503](https://github.com/datagrok-ai/public/issues/2503): Order and Hide: Tooltip with null category shouldn't be that big 
* (Bug) GROK-14221: ChoiceInputs are not refreshing in FRAC classification query 
* (Improvement) GROK-14235: JS API: Utils.loadJsCss(files): dynamically load dependencies (WIP)


## 2023-11-03 1.17.2



## 2023-11-02 1.17.1

* (Improvement) GROK-14180: Implement waiting mode in db.runLocked 
* (Bug) [#2330](https://github.com/datagrok-ai/public/issues/2330): Scatter plot: has to show empty categories like Box plot and Bar chart do 
* (Bug) [#2468](https://github.com/datagrok-ai/public/issues/2468): Cell values starting with the quote character are parsed incorrectly 


## 2023-10-31 1.17.0

Datagrok 1.17 release focuses on stability, performance, and usability improvements:

* The ability to configure the platform through the **Settings** wizard.
* Browser designed for navigation, preview, and convenient access to everything available on the platform: features, applications, plugins, models, shared dashboards, and more.
* Function view now shows function signature if parameters are not user-editable.
* Improved client-side caching of function and query results. To learn more, see [Caching function results](https://datagrok.ai/help/develop/function_results_cache#client-side-cache)
* Summary viewer that aggregates the numeric attributes of features.
* Capability to render table cells with any viewer, along with support for linked tables in in-grid dataframes.
* **Content** tab on the **Context Panel**, making it easy to compare selected rows, filters, highlights, and more.
* **Plots** context pane automatically visualizing selected columns, see [UX updates](https://community.datagrok.ai/t/ux-updates/544/5?u=oahadzhanian.datagrok.ai) for details.
* Lookup tables that let you initialize inputs with a set of pre-defined values. For details, see [Lookup tables](https://datagrok.ai/help/datagrok/concepts/functions/func-params-annotation#lookup-tables).
* [Okta](https://www.okta.com/) support for authorization.

### Visualization and usability improvements

* [#2335](https://github.com/datagrok-ai/public/issues/2335): Tooltip harmonization.
* [#1063](https://github.com/datagrok-ai/public/issues/1063): A way to indicate current viewer.
* Auto sizing for viewers' legend.
* New color input for color coding.
* Columns pane: the ability to filter columns by semantic type and preview their content in the grid on mouse-over.
* Viewers: handling of doubles, `infinity`, `-infinity`, `NaN`, and large-scale floating point numbers.
* Slider in number inputs.
* Fixed:
   * [#2368](https://github.com/datagrok-ai/public/issues/2368): Sketcher | structure lookup service: fix the behavior.
   * [#1960](https://github.com/datagrok-ai/public/issues/1960): "Link Tables" does not persist when table data refreshed/reloaded.
   * [#2011](https://github.com/datagrok-ai/public/issues/2011): Viewers: Inconsistencies in saved layouts won't allow creating a viewer when such layout is applied.
   * [#2060](https://github.com/datagrok-ai/public/issues/2060): Projects: the tabs order is changed from the original uploaded project state.
   * [#2272](https://github.com/datagrok-ai/public/issues/2272): Loading page performance issues.
   * [#2284](https://github.com/datagrok-ai/public/issues/2284): Certain scenarios make it impossible to move or stack a viewer.
   * [#2297](https://github.com/datagrok-ai/public/issues/2297): Viewers | Tooltip: a custom tooltip should not be limited in the number of values.
   * [#2315](https://github.com/datagrok-ai/public/issues/2315): Unexpected columns appear in 'Order and hide' columns dialog if the scaffold tree viewer or structure filter is added.
   * [#2344](https://github.com/datagrok-ai/public/issues/2344): Categorical filter hovering does not highlight data in plots.
   * [#2328](https://github.com/datagrok-ai/public/issues/2328): Viewer docked at the left or at the top is sometimes unexpectedly hidden.
* [Grid](../../visualize/viewers/grid.md):
  * [#2271](https://github.com/datagrok-ai/public/issues/2271): Introduced a property to disable "read-only" warning.
  * [#2367](https://github.com/datagrok-ai/public/issues/2367): Pinned rows improvements.
  *  [#2348](https://github.com/datagrok-ai/public/issues/2348): Add the Sync New Columns setting to the grid.
  * Custom column order is now saved after refresh.
  * The ability to clone grid columns not affecting the dataframe.
  * Column selection by holding Shift and mouse-dragging the column header, see [Grid updates](https://community.datagrok.ai/t/grid-updates/616/11).
  * Fixed:
    * [#2293](https://github.com/datagrok-ai/public/issues/2293): Cannot search in 'order and hide columns' if table contains a summary column
    * Sorting isn't saved after the project reopens.
    * Custom cell sizes get reset when you open a project.
    * Order and Hide Columns: the Column List's hamburger menu appears in the Search field.
* [Filter Panel](../../visualize/viewers/filters.md):
  * [#2358](https://github.com/datagrok-ai/public/issues/2358): Layouts: save the persistence of filter item search visibility.
  * [#2165](https://github.com/datagrok-ai/public/issues/2165): Always add new filters to the top.
  * Fixed:
    * [#2316](https://github.com/datagrok-ai/public/issues/2316): Errors on combining scaffold tree with some other filters.
    * [#2359](https://github.com/datagrok-ai/public/issues/2359): For some filters the item search is not working when another filter search is open
    * The min and max values for dates do not fit the entire value.
* For [Scatter plot](../../visualize/viewers/scatter-plot.md) fixed:
  * [#2285](https://github.com/datagrok-ai/public/issues/2285): Default marker size is not changed on moving slider.
  * [#2408](https://github.com/datagrok-ai/public/issues/2408): Incorrect tooltip for 'zoom and filter'.
  * [#2402](https://github.com/datagrok-ai/public/issues/2402): Min/max values are not saved/restored in the layout.
  * [#2330](https://github.com/datagrok-ai/public/issues/2330): Has to show empty categories like Box plot and Bar chart do.
* [Trellis plot](../../visualize/viewers/trellis-plot.md):

  * [#2336](https://github.com/datagrok-ai/public/issues/2336): Improved the display of outer and inner viewers properties.
  * [#2300](https://github.com/datagrok-ai/public/issues/2300): Added the ability to visualize just one category.
       
* [Line Chart](../../visualize/viewers/line-chart.md):
  * [#2302](https://github.com/datagrok-ai/public/issues/2302): Allows to split by multiple columns.
  * [#2357](https://github.com/datagrok-ai/public/issues/2357): Custom tooltip.
  * [#2360](https://github.com/datagrok-ai/public/issues/2360): Hovering and selecting improvements:
    * Hovering over a line highlights data on other viewers.
    * Ctrl+click, Shift +click, and Ctrl+Shift +click selection toggling actions for lines
    * Clicking the line selects the values on other viewers.
  * [#2049](https://github.com/datagrok-ai/public/issues/2049): Added min/max properties.
  * [#2396](https://github.com/datagrok-ai/public/issues/2396): Line chart with split performance issue on large amounts of data.
  * Fixed:
    * [#2163](https://github.com/datagrok-ai/public/issues/2163): Line chart lines are displayed incorrectly in some cases (drop below the X axis).
    * [#2395](https://github.com/datagrok-ai/public/issues/2395): Unaggregated tooltip and hovered row do not match in some cases.
    * [#2388](https://github.com/datagrok-ai/public/issues/2388): Optimize the display of labels on the x-axis.
    * [#2350](https://github.com/datagrok-ai/public/issues/2350): 'Error loading line chart' on applying layout if line chart has a categorical X axis and **Row Source** is set to `Selected`.

* [Histogram](../../visualize/viewers/histogram.md):

  * [#2197](https://github.com/datagrok-ai/public/issues/2197): Add zoom slider to X axis of Histogram.
  * Fixed:
    * [#2301](https://github.com/datagrok-ai/public/issues/2301): Histogram slider's end can be dragged out of valid range.
    * [#2364](https://github.com/datagrok-ai/public/issues/2364): Some rows are still shown if filter's range is set out of data's boundaries.
    * [#2329](https://github.com/datagrok-ai/public/issues/2329): Histogram 'normalise to filter' option: Y axis values are not updated on zooming.
* [Box Plot](../../visualize/viewers/box-plot.md):
  * [#2203](https://github.com/datagrok-ai/public/issues/2203): Improvements for structures rendering.
  * [#2057](https://github.com/datagrok-ai/public/issues/2057): Added structures rendering on the X axis.
  * FIxed:
    * [#2270](https://github.com/datagrok-ai/public/issues/2270): Selected row dots are not brought to the foreground.
    * [#2286](https://github.com/datagrok-ai/public/issues/2286): Markers overlap with X axis and categories in some cases.
* For [bar chart](../../visualize/viewers/bar-chart.md):  [#2298](https://github.com/datagrok-ai/public/issues/2298): Squeezed the white space around the title.
* Pivot table:
   * [#2166](https://github.com/datagrok-ai/public/issues/2166): Improvements: 
     * An option for filtering or reflecting a filter.
     * The **Row Source** setting.
     * Provided a way to collapse the configuration via the **Show Header** option.
  * Fixed [#2198](https://github.com/datagrok-ai/public/issues/2198): Editing and saving issues.

### Data Access

* Improvements:
  * Schema browsing support.
  * Warning balloon if there is no connection with GrokConnect.
* Fixed [#2454](https://github.com/datagrok-ai/public/issues/2454): Categories contain duplicate values using datadriven queries.

### Improvements for developers

* [#2273](https://github.com/datagrok-ai/public/issues/2273): Implemented global permissions for some entities.
* Improved exporting of logs to CloudWatch: send logs to Amazon CloudWatch according to the Log Export Blocks you can create.
* Support of other than CSV formats to TableInput.
* The scrollbar for the variables window.
* Python scripts harmonization:
  * Fixed DateTime parameter.
  * Fixed column_list parameter.
* Julia scripts harmonization: fixed boolean parameter support.
* Ability to set choice items and values separately.
* Option to allow `DG.Accordion` panes dragging.

#### JS API

* [#2118](https://github.com/datagrok-ai/public/issues/2118): API configuration to define layout import settings 
 * Capability to set grid cell value with `onCellValueEdited` event.
* Capability to get stats from values array.

### Enhancements in packages

* [Bio](https://github.com/datagrok-ai/public/blob/master/packages/Bio/CHANGELOG.md): ToAtomicLevel is available for non-linear HELM structures, enhancements for VdRegionsViewer and WebLogo, other improvements and bug fixes.
* [Chem](https://github.com/datagrok-ai/public/blob/master/packages/Chem/CHANGELOG.md): Highlighting multiple substructures with different colors inside one molecule structure; filtering by superstructure, exact structure, and similarity score; scaffold tree integration with color-coded fragments and other enhancements.
* [Dendrogram](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram/CHANGELOG.md): hierarchical clustering for molecules, the ability to select all leaves from a certain node, a separate loader view to the dendrogram, the ability to switch distance calculation method for macromolecules (Hamming or Levenstein) in case of MSA, and other enhancements.
* [PowerGrid](https://github.com/datagrok-ai/public/tree/master/packages/PowerGrid/CHANGELOG.md): new [smart forms](https://community.datagrok.ai/t/powergrid-smartform/774/1) - a special cell type that renders values from multiple columns in one cell; image rendering on double click on the image URL.
* [Curves](https://github.com/datagrok-ai/public/tree/master/packages/Curves/CHANGELOG.md): aggregations for series statistics, **Context Pane** changes, improved curves demo application, and bug fixes.
* [Peptides](https://github.com/datagrok-ai/public/blob/master/packages/Peptides/CHANGELOG.md): Select All and Deselect All functionality to all viewers, mean activity column for the Most Potent Residues viewer,  WebLogo to Selection table.
* [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts/CHANGELOG.md): improvements for sunburst and surface plot.
* [Tutorials](https://github.com/datagrok-ai/public/tree/master/packages/Tutorials/CHANGELOG.md): new chem tutorials on activity cliffs, R-group analysis, similarity and diversity search, substructure search and filtering.

## 2023-10-04 1.16.7

* (Improvement): Connectors: Added gzip compression of socket message
* (Improvement): Connectors: Added offset, fixed caching 
* (Improvement): DataQuery: Added setting of gzip and batchSize through SQL script meta

## 2023-09-14 1.16.6

* (Bug) GROK-13904: Redocking viewer leads to multiple entries in .viewers list 
* (Bug) [#2350](https://github.com/datagrok-ai/public/issues/2350): 'Error loading line chart' on applying layout, if line chart has categorical X axis and row source = Selected 


## 2023-09-06 1.16.5

* (Bug) GROK-13874: Box plot: incorrectly displays values on the X axis 
* (Bug) [#2329](https://github.com/datagrok-ai/public/issues/2329): Histogram 'normalize to filter' option: Y axis values are not updated on zooming 
* (Bug) [#2328](https://github.com/datagrok-ai/public/issues/2328): Viewer docked at the left or at the top is sometimes unexpectedly hidden 
* (Bug) [#2315](https://github.com/datagrok-ai/public/issues/2315): Unexpected columns appear in 'Order and hide' columns dialog if scaffold tree viewer or structure filter is added 

## 2023-08-30 1.16.4

* (Bug) [#2315](https://github.com/datagrok-ai/public/issues/2315): Unexpected columns appear in 'Order and hide' columns dialog if scaffold tree viewer or structure filter is added 
* (Improvement) [#2057](https://github.com/datagrok-ai/public/issues/2057): Box plot has to render structures on the X axis 
* (Bug) [#2293](https://github.com/datagrok-ai/public/issues/2293): Cannot search in 'order and hide columns' if table contains a summary column 
* (Bug) [#2163](https://github.com/datagrok-ai/public/issues/2163): Line chart lines are displayed incorrectly in some cases (drop below the X axis) 
* (Bug) [#2285](https://github.com/datagrok-ai/public/issues/2285): Scatter plot: default marker size is not changed on moving slider 
* (Bug) [#2316](https://github.com/datagrok-ai/public/issues/2316):  Errors on combining scaffold tree with some other filters 
* (Bug) [#2272](https://github.com/datagrok-ai/public/issues/2272): Loading page performance issues (WIP)
* (Bug) [#2301](https://github.com/datagrok-ai/public/issues/2301): Histogram slider's end can be dragged out of valid range 
* (Bug) GROK-13843: ScatterPlot: displaying the legend issues (WIP)
* (Improvement) [#1063](https://github.com/datagrok-ai/public/issues/1063): A way to indicate current viewer 


## 2023-08-17 1.16.3

* (Improvement) GROK-13737: Cleanup package if it's not in NPM and is not installed 

## 2023-08-15 1.16.2

* Improvement:
* (Improvement) [#2166](https://github.com/datagrok-ai/public/issues/2166): Pivot table: improvements 
* (Improvement) [#2165](https://github.com/datagrok-ai/public/issues/2165): Filter Panel: Always add new filters to the top  (WIP)
* (Bug) GROK-13526: Interpret URLs as hyperlinks: incorrect behavior with line wrapping  (WIP)
* (Bug) GROK-13632: when starting an unsaved query with parameters in dataQueryView, the form with editing parameters is not shown on the first run 
* (Bug) [#2060](https://github.com/datagrok-ai/public/issues/2060): Projects:  the tabs order is changed from the original uploaded project state 
* (Bug) GROK-13718: Grid: custom renderers: custom cell sizes get reset when you open a project 
* (Improvement) [#2197](https://github.com/datagrok-ai/public/issues/2197): Add zoom slider to X axis of Histogram 
* (Bug) GROK-13719: After applying Refresh several times, there is an error:  `Resulting message size [x] is too large for configured max of [y]` 
* (Bug) GROK-13448: "Refresh"-ing DB query resets the sizes of Grid cells 
* (Bug) GROK-13717: Unable to use scripts in add new column 
* (Bug) GROK-13750: Can't create custom viewer from JS 
* (Bug) GROK-13651: Databases | Connections: testing connection issue 


## 2023-07-27 1.16.1

* Improvements:
  * Columns pane: column preview in the grid on mouse-over 
  * Columns pane: ability to filter by semantic type 
* Fixes:
  * GROK-13559: Credentials manager for WebServices is not always working 
  * GROK-13609: Incorrect value for scalar parameters in DB 
  * GROK-13617: FuncCall not serialized properly 


## 2023-07-20 1.16.0

Datagrok 1.16 release focuses on performance and usability improvements:

* Improved data streaming, leading to major performance improvements for small queries.
* Client-side caching of function results, allowing to save time and server capacity when executing immutable functions and queries.
* Improved logging system for queries, featuring a debug mode that helps understand time allocation and optimize performance. Additionally, we provide new tools for tuning specific queries.
* Simplified and updated Datagrok local installation, now available with a [one-click script](https://datagrok.ai/help/develop/admin/docker-compose).
* Self-adjustable viewer layouts that keep viewers usable even in a small window.
* [Fuzzy text filter](../../visualize/viewers/filters.md#text-filter), which enables users to create keyword categories and search or filter text using them.
* URLs are now automatically interpreted as hyperlinks in text. For details, see [visualization-related updates](https://community.datagrok.ai/t/visualization-related-updates/521/36).


### Visualization and usability improvements

* [#1972](https://github.com/datagrok-ai/public/issues/1972): Implemented [fuzzy text filter](../../visualize/viewers/filters.md#text-filter).
* [#2056](https://github.com/datagrok-ai/public/issues/2056): Added [URLs rendering](https://community.datagrok.ai/t/visualization-related-updates/521/36) as hyperlinks in text.
* Enhanced [multiline text rendering](https://community.datagrok.ai/t/visualization-related-updates/521/34)
* Enhanced composed cell renderer layout:
   * Subclasses can now dynamically control the rendering of external content. Labels are evenly distributed over the available space when external content is not rendered.
   *  Added file creation and modification timestamps to file cards for extra information.
* Fixed:
  * [#2011](https://github.com/datagrok-ai/public/issues/2011): Viewers: Inconsistencies in saved layouts won't allow creating a viewer when such layout is applied.
  * [#1929](https://github.com/datagrok-ai/public/issues/1929): Viewers do not support hex colors set in categorical coloring.
  * [#1838](https://github.com/datagrok-ai/public/issues/1838): Error on adding a custom viewer.
  * [#1960](https://github.com/datagrok-ai/public/issues/1960): **Link Tables** does not persist when table data is refreshed/reloaded.
  * [#1964](https://github.com/datagrok-ai/public/issues/1964): Adding group membership via user-based interface does not save.
  * [#1983](https://github.com/datagrok-ai/public/issues/1983): Categorical coloring: colors cannot be changed.
  * [#1986](https://github.com/datagrok-ai/public/issues/1986): Dragging a column to filter panel moves it to the beginning of the table.
  * [#1208](https://github.com/datagrok-ai/public/issues/1208): Default tooltip is unexpectedly reset on duplicating a view
* For [Filter Panel](../../visualize/viewers/filters.md) fixed:
  * [#1230](https://github.com/datagrok-ai/public/issues/1230): Filters: custom filters not synced.
  * [#1609](https://github.com/datagrok-ai/public/issues/1609): FilterGroup.add issue, which caused error message when called through `grok.events.onContextMenu` context.
  * [#1984](https://github.com/datagrok-ai/public/issues/1984): Filter's missing values settings are not properly synced between different tabs/views.
  * [#1987](https://github.com/datagrok-ai/public/issues/1987): Tooltip from the wrong column is shown in filters in some cases.
* [Scatter plot](../../visualize/viewers/scatter-plot.md):
  
  * [#2089](https://github.com/datagrok-ai/public/issues/2089): Added an option to change Scatter plot and Trellis plot's mouse drag action from panning to selection. For trellis plot with an inner scatter plot viewer, the default value is `selection`.
  *  [#2108](https://github.com/datagrok-ai/public/issues/2108): Improved behavior of 'Dot' marker type on Scatter plot.
  *  [#2055](https://github.com/datagrok-ai/public/issues/2055): Implemented indicating zoom state for categorical axes.
* [Trellis plot](../../visualize/viewers/trellis-plot.md):
  *  For trellis plots with an inner PC plot, hidden labels and limited the default number of columns to four.
  * Categorical axes now show a tooltip for small structures, providing clear rendering on the axis. 
  * [#1952](https://github.com/datagrok-ai/public/issues/1952): Improved Trellis plot behavior to exclude displaying empty categories.
  *  [#2144](https://github.com/datagrok-ai/public/issues/2144): Added saving of Trellis inner viewers' states when switching between them.
  * [#2054](https://github.com/datagrok-ai/public/issues/2054): Zooming is now disabled for inner scatter plot, bar chart and box plot viewers. For scatter plot, it can be enabled via a new "Allow zoom" setting.
  * Fixed:
    * [#1957](https://github.com/datagrok-ai/public/issues/1957): Trellis plot: cannot be added in specific case, error on setting structure column as X axis.
    * [#2053](https://github.com/datagrok-ai/public/issues/2053): Trellis plot: tooltip in inner viewer cannot be changed.
    * [#2116](https://github.com/datagrok-ai/public/issues/2116): Column settings are connected on two Trellis plots after settings are picked up/applied.
* [Line Chart](../../visualize/viewers/line-chart.md)
  * [#2049](https://github.com/datagrok-ai/public/issues/2049): Added the  min/max properties.
  * Fixed [#2163](https://github.com/datagrok-ai/public/issues/2163): Line chart lines are displayed incorrectly in some cases (drop below the X axis).
* [Box Plot](../../visualize/viewers/box-plot.md)
  * [#2057](https://github.com/datagrok-ai/public/issues/2057): Added structures rendering on the X axis.
  * Fixed [#1985](https://github.com/datagrok-ai/public/issues/1985): Box plot: Y axis zoom slider behavior is inverted.
* For [correlation plot](../../visualize/viewers/correlation-plot.md), fixed [#2009](https://github.com/datagrok-ai/public/issues/2009): Correlation Plot shows wrong axes.

### Data Access

*  Implemented the ability to call query without loading from server, which leads to acceleration of each query by 200-300ms.
* Added the ability to create hierarchies in the query tree using the `friendlyName`.
*  Added the ability to expand complex structures into columns for Neptune and Neo4j databases. With this update, you no longer need to list node properties explicitly, making query writing much simpler and quicker.
* Fixed:
  * [#1963](https://github.com/datagrok-ai/public/issues/1963): Snowflake Schema View random order for columns.
  * [#1750](https://github.com/datagrok-ai/public/issues/1750): File does not delete from Home Directory in File Manager.

### Improvements for developers

*  Added column tags: `.includeInCsvExport` and  `.includeInBinaryExport`.
*  Added `Property.validateValue(x)`.
*  Added Functions: `PadLeft` and `PadRight(s, length, char)`.
*  Implemented the ability to specify input directly via the `forInputType` method.
*  For Inspector, added dynamic package-originated panels with `meta.inspectorPanel: true`.
*  For Inspector, added the  ability to inspect widgets.
*  Moved adHoc property to FuncCall.

#### [JS API](../../develop/packages/js-api.md)

*  [#2118](https://github.com/datagrok-ai/public/issues/2118): Added the API configuration to define layout import settings.
*  [#1592](https://github.com/datagrok-ai/public/issues/1592): For packages, introduced decorators for functions with special roles (viewers, importers, etc.).
*  For JS API, added `ProgressIndicator.canceled`.
* For FileInfo, exposed `isFile` and `isDirectory` methods to JS API.

### Enhancements in packages

* [Bio](https://github.com/datagrok-ai/public/blob/master/packages/Bio/CHANGELOG.md): separator support for **Sequence Space** and **Activity Cliffs**, Helm monomer type is usable for **MSA**, and other enhancements. 
* [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts/CHANGELOG.md): improvements for Timelines and Sunburst plot, Radar chart fixes.
* [Chem](https://github.com/datagrok-ai/public/blob/master/packages/Chem/CHANGELOG.md): RDKit rendering for various databases (Chembl, ChemblAPI, PubChem, and DrugBank) when OCL is used, **Scaffold Tree** integration into the **Filters Panel**, and other improvements.
* [Curves](https://github.com/datagrok-ai/public/tree/master/packages/Curves/CHANGELOG.md): rendering for curves and confidence intervals, user-defined Javascript function support for running curves with caching, enhanced rendering in small cells, and more. 
* [Demo](https://github.com/datagrok-ai/public/tree/master/packages/Demo/CHANGELOG.md): new [Bioreactors](https://public.datagrok.ai/apps/Tutorials/Demo/Bioreactors), [heatmap](https://public.datagrok.ai/apps/Tutorials/Demo/Visualization/General/Heatmap) and [Chem](https://public.datagrok.ai/apps/Tutorials/Demo/Cheminformatics) demos.
* [Dendrogram](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram/CHANGELOG.md): ability to select leaves from specific nodes, separate loader view, and ability to switch distance calculation methods for macromolecules, while also supporting the semType `macromolecules`.
* [Helm](https://github.com/datagrok-ai/public/tree/master/packages/Helm/CHANGELOG.md): addressed issues.
* [Peptides](https://github.com/datagrok-ai/public/blob/master/packages/Peptides/CHANGELOG.md):  **Invariant Map** now selects sequences instead of filtering.
* [PowerGrid](https://github.com/datagrok-ai/public/tree/master/packages/PowerGrid/CHANGELOG.md): structure editing support for pinned columns.
* [Tutorials](https://github.com/datagrok-ai/public/tree/master/packages/Tutorials/CHANGELOG.md): new tutorials.

  
### Enhancements in libraries

* A new [math](https://github.com/datagrok-ai/public/tree/master/libraries/math/CHANGELOG.md) library intended to be used for high efficiency (mostly wasm) calculations.
* See other updates for [utils](https://github.com/datagrok-ai/public/tree/master/libraries/utils/CHANGELOG.md), [ml](https://github.com/datagrok-ai/public/tree/master/libraries/ml/CHANGELOG.md) and [bio](https://github.com/datagrok-ai/public/tree/master/libraries/bio/CHANGELOG.md).

## 2023-06-29 1.15.4

* Improvements: 
  * [#1730](https://github.com/datagrok-ai/public/issues/1730) Scaffold Tree: Filters panel integration.
* Fixed:
  * [#2052](https://github.com/datagrok-ai/public/issues/2052): Coloring is missing on adding new table view.
  * [#2061](https://github.com/datagrok-ai/public/issues/2061): DataFrame in viewer property is null on "viewer added" event.

## 2023-06-19 1.15.3

* Improvements:  
  * [#1988](https://github.com/datagrok-ai/public/issues/1988): Trellis Plot: Enhancements:
     * Added a column filter to the properties for column selection. X and Y axes accept categorical columns only
     * Removed the "Viewer Type" property from the context panel (users can switch it via the dropdown in the viewer itself)
     * Added the ability to resize a legend for Trellis
     * Adjusted labels appearance on the Y axis. Use ellipsis for long names
     * Added Show GridLines property (when enabled, makes the inner viewer borders visible)
  * [#1951](https://github.com/datagrok-ai/public/issues/1951): Add Global scale option to Trellis plot
  * [#2011](https://github.com/datagrok-ai/public/issues/2011): Viewers: Inconsistencies in saved layouts won't allow creating a viewer when such layout is applied
  * [#1378](https://github.com/datagrok-ai/public/issues/1378): PC Plot: context menu harmonization: added "..." for the Columns item 
  * [#1778](https://github.com/datagrok-ai/public/issues/1778): Viewers: Organize properties consistently in the context panel: moved **Col Label Orientation** to the **Styles** category for heatmap and grid 
* Fixed:
  * [#1984](https://github.com/datagrok-ai/public/issues/1984): Filter's missing values settings are not properly synced between different tabs/views 
  * [#1985](https://github.com/datagrok-ai/public/issues/1985): Box plot: Y axis zoom slider behavior is inverted 
  * [#1986](https://github.com/datagrok-ai/public/issues/1986): Dragging a column to filter panel moves it to the beginning of the table 
  * [#1609](https://github.com/datagrok-ai/public/issues/1609): FilterGroup.add issue 
  * [#1983](https://github.com/datagrok-ai/public/issues/1983): Categorical coloring colors cannot be changed 
  * [#1987](https://github.com/datagrok-ai/public/issues/1987): Tooltip from the wrong column is shown in filters in some cases 
  * [#1959](https://github.com/datagrok-ai/public/issues/1959): Cannot adjust legend width for a Trellis plot 
  * [#1230](https://github.com/datagrok-ai/public/issues/1230): Filters: custom filters not synced 
  * [#2009](https://github.com/datagrok-ai/public/issues/2009): Correlation Plot shows wrong axes
  * [#2028](https://github.com/datagrok-ai/public/issues/2028): Handling the layout save with a viewer loading error 
  * GROK-12902: Chem | Context Pane | Actions: Add to favorites doesn't work 
  * GROK-13238: Adding new columns fails in the presence of virtual columns 
  * [#1838](https://github.com/datagrok-ai/public/issues/1838): Error on adding a custom viewer 
  * GROK-13321: Filter Panel: 'Unsupported operation: NaN.round()' error occurs when hovering the Board Id tab
  * GROK-13343: Trellis plot is not loading from the layout in some cases


## 2023-06-02 1.15.2

* (Bug) GROK-13157: Can't load table without initial permissions 
* GROK-13075: Delete old and inactive containers 
* (Improvement) GROK-13188: Datlas: Improve migration process 


## 2023-05-25 1.15.1

* (Bug) GROK-13109: Databases | Mysql, MariaDB: Get top 100 on some tables throws an error.
* (Bug) GROK-13157: Can't load table without initial permissions.
* (Bug) GROK-13132: Fixed scatter plot legend.
* (Enhancement) [#1378](https://github.com/datagrok-ai/public/issues/1378): PC Plot: context menu harmonization.
* (Bug) [#1929](https://github.com/datagrok-ai/public/issues/1929): Viewers do not support hex colors set in categorical coloring.
* (Bug) [#1208](https://github.com/datagrok-ai/public/issues/1208): Default tooltip is unexpectedly reset on duplicating a view.
* (Bug) GROK-13126: Grid | Layouts: color-coding is applied from the previous layout.


## 2023-05-17 1.15.0

We've launched a new version of the Datagrok platform 1.15.0. This update introduces various enhancements in computations, platform governance, stability, and overall usability. Some of the key improvements in this release include:
* Namespaces view for easy access to all data sources and content within the platform. Now you can explore and access all available data in one centralized location.
* [EDA package](release-history.md#eda) using partial least squares regression for the multivariate data analysis.
* [Bioreactors package](#bioreactors) for the simulation of the mechanism of Controlled Fab-Arm Exchange.
* Usage Analysis package for studying usage statistics. It enables you to analyze user activity, package distribution, and function usage to gain valuable insights for statistical analysis. To learn more, see [Usage Analysis](https://datagrok.ai/help/govern/usage-analysis#usage-analysis-application).
* [Demo application](https://public.datagrok.ai/apps/Tutorials/Demo), an interactive educational resource showcasing the diverse capabilities and features of the DataGrok platform. It offers tutorials and demonstrations for hands-on learning of data manipulation, visualization, modeling, and more.
* Multiple improvements in plugins, such as  [Chem](#chem), [Peptides](#peptides), [Dendrogram](#dendrogram).

### Visualization and usability improvements

* Added core viewers support for  +/- Infinity.
* Introduced new [help property](https://community.datagrok.ai/t/visualization-related-updates/521/33?u=oahadzhanian.datagrok.ai) for all core viewers. It could be either a markdown, or a URL.
* Optimized the BigInt parsing.
* [Grid](../../visualize/viewers/grid.md):
  * [#353](https://github.com/datagrok-ai/public/issues/353): Added "Row Source" option to the configuration of the Grid visualization.
  * Added the Ctrl+Shift+UP shortcut to sort the current column.
  * [#1860](https://github.com/datagrok-ai/public/issues/1860): Implemented the support of **Apply Coloring** for selected columns of compatible data type.
  * Fixed:
    * [#1839](https://github.com/datagrok-ai/public/issues/1839): Datagrok is sporadically frozen in drag-and-drop hover state (moving columns around, adding to filters, calculated columns dialog).
    * [#1840](https://github.com/datagrok-ai/public/issues/1840): Calculated columns: errors on missing values.
    * GROK-12918: An exception when dragging columns to the first position.
    * GROK-13054: Error when saving the layout.
* [Filter Panel](../../visualize/viewers/filters.md):
  * Added the ability to sort the default filters by #categories.
  * Fixed [#1837](https://github.com/datagrok-ai/public/issues/1837): Filters cannot be enabled if all filters were disabled in another view
* [Scatter plot](../../visualize/viewers/scatter-plot.md):
   * [#1746](https://github.com/datagrok-ai/public/issues/1746): Added the ability to set date for the Min and Max values on axes.
   * [#1882](https://github.com/datagrok-ai/public/issues/1882): Reset the Min and Max values on column change.
   * Fixed:
     * [#1764](https://github.com/datagrok-ai/public/issues/1764): Error loading scatter plot for specific data and log scale axes on applying layout.
     * [#1761](https://github.com/datagrok-ai/public/issues/1761): Out of memory on adding viewer with specific data.
     * [#1744](https://github.com/datagrok-ai/public/issues/1744): Table is unexpectedly filtered if scatter plot has 'filter by zoom' setting and empty column on log scale axis.
     * [#1855](https://github.com/datagrok-ai/public/issues/1855): Some data is missing after setting **Zoom and Filter** to `pack and zoom by filter`.
     * [#1858](https://github.com/datagrok-ai/public/issues/1858) Scatter plot with specific data and log scale axis failed to load on applying layout.

* [Line Chart](../../visualize/viewers/line-chart.md)
  * Fixed:
    * [#1852](https://github.com/datagrok-ai/public/issues/1852): Line chart with splitting with specific data is making Datagrok slow (row selection, interaction with line chart).
    * [#1671](https://github.com/datagrok-ai/public/issues/1671) Line chart connects the first and last values when resizing the window.
* [PC Plot](../../visualize/viewers/pc-plot.md):
   * [#1378](https://github.com/datagrok-ai/public/issues/1378): Provided the context menu harmonization:
      * Added the **Filter** menu item with the **Show** and **Show Filtered Out Lines** entries.
      * Added the **Columns... ** menu item that opens the **Select column** dialog.
      * Added the **Selection** menu item with the **Show Current Line**, **Show Mouse Over Line**, and **Show Mouse Over Row Group**  entries.
* [Box Plot](../../visualize/viewers/box-plot.md)
  * [#1635](https://github.com/datagrok-ai/public/issues/1635): Added a zoom slider to adjust axes range.
  * [#1377](https://github.com/datagrok-ai/public/issues/1377): Added Show Category Axis to the X-axis menu.

### Data Access

* Improvements:
  * Added the ability to set JS postprocessor for query transformation.
  * Added  `is null` and `is not null` operators for patterns. 
  * Created a new operator for datetime pattern `\- last 30 days`, same for hours, weeks, and months.
  * Improved performance for specific queries.
  * Provided cache and streaming compatibility.
  * Improved context menu options for tables:
    * Renamed **Visual Query** to **Aggregation Query** .
    * Renamed **Build Query** to **Join DB Tables**.
  * Renamed  the fields in **Aggregation Query**: 
    * Columns to Pivot 
    * Rows to Group by 
    * Measures to Aggregate 
    * Filters to Filter
* Fixed:
  * GROK-12778: Snowflake: Browse Schema doesn't work.
  * GROK-12780: Snowflake: error on the Content tab.
  * GROK-12782: Snowflake: error when running the query.
  * GROK-12876: ClickHouse: Browse Schema doesn't work.
  * GROK-12880: NULL in inspect menu.

### Enhancements in packages

#### [Chem](https://github.com/datagrok-ai/public/tree/7c62a0c018ec631d3b23760d538a17aaf4d4ca36/packages/Chem#readme)

* Improvements:
   * Performed **Elemental Analysis** refinement. Now the resulting column name includes the name of the column for which Elemental Analysis is performed.
   * Added the ability to choose whether to search for MCS exact atoms or MCS exact bonds when performing R-Groups Analysis.
   * Added the ability to avoid recalculating the similarity search when the current row is changed. To achieve this, we introduced the **Follow Current Row** checkbox in the settings of the similarity search viewer. 
   * For proper handling of properties and rendering, we now check for smarts and molecular fragments separately.
   * Provided the ability to copy data from the **Descriptors** and **Properties** tabs on the **Context Pane**.
   * Moved **Descriptors** and **Fingerprints** from the  **Context Pane**  to the **Top Menu** ( **Chem** > **Calculate**).
   * Added **Substructure Search** to the **Top Menu** ( **Chem** > **Search**)
   * Modified the tooltip for dialog and drag-n-drop to prevent it from overlapping with the data.
   * Implemented RDKit rendering for Chembl, ChemblAPI, PubChem, and DrugBank databases if OCL is used currently.
   * Performed UI polishing. We've adjusted input field names, repositioned elements in certain dialogs, added tooltips, and organized the top menu items into groups: Calculate, ADME/Tox, Search, Analyze, and Transform.  
* Fixed:
   * [#1492](https://github.com/datagrok-ai/public/issues/1492): Elemental analysis: malformed data handling.
  * GROK-11898: Orientation for smiles in Structural Alerts.
  * GROK-12115: Hamburger menu closing while switching a sketcher.
  * GROK-12905: Sketcher is not opening from the **Filter Panel**.
  * GROK-12929: Scripts don't work if called from the package.
  * GROK-12933: Drug likeness: set score precision.
  * GROK-12961: Elemental Analysis: `Unsupported operation: NaN.round()` error on some data.
  * GROK-12962: Similarity Search: doesn't work on malformed data

#### [Usage Analysis](https://github.com/datagrok-ai/public/tree/master/packages/UsageAnalysis#readme)

We've released Usage Analysis 1.0.0, a tool for comprehensive statistics and insights into usage patterns on the Datagrok platform. Gain a deeper understanding of user interactions, make data-driven decisions, and optimize performance to enhance the user experience. To learn more, see [Usage Analysis](https://datagrok.ai/help/govern/usage-analysis#usage-analysis-application).

#### [EDA](https://github.com/datagrok-ai/public/tree/master/packages/EDA)

We've implemented the multivariate data analysis using partial least squares (PLS) regression in the EDA package. Our solution reduces the predictors to a smaller set of uncorrelated components and performs least squares regression on them. To provide high-performance in-browser computations, we use WebAssembly. For details, see [Multivariate analysis](https://datagrok.ai/help/explore/multivariate-analysis/pls).

#### [Bioreactors](https://github.com/datagrok-ai/public/tree/master/packages/Bioreactors#readme)

We've created the Bioreactors package for the simulation of the mechanism of [Controlled Fab-Arm Exchange](https://www.jbc.org/article/S0021-9258(20)40445-4/fulltext). The unique Datagrok WebAutosolver tool provides an in-browser solution for implementing simulations of the considered phenomena. To ensure high performance, we utilize wasm-computations.

#### [PhyloTreeViewer](https://github.com/datagrok-ai/public/tree/master/packages/PhyloTreeViewer#readme)

* We've retired the PhyloTree viewer and removed it from the PhylotreeViewer package.
* Added the ability to reset zoom for PhylocanvasGL viewer.

#### [BiostructureViewer](https://github.com/datagrok-ai/public/tree/master/packages/BiostructureViewer#readme)
Now, when you click on a cell with a 3D molecule, we utilize the Biostructure viewer to display the structure in a separate viewer.

#### [Bio](https://github.com/datagrok-ai/public/tree/master/packages/Bio#readme)

* We have structured the top menu by organizing the items into groups: SAR, Structure, Atomic level, and Search. 
* Fixed GROK-13048: Activity cliffs identification for macromolecules.

#### [Dendrogram](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram#readme)

* Improvements:
  * Added a separate loader view to the dendrogram.
  * Added the ability to reset zoom for Dendrogram.
  * Moved hierarchical clustering script to the client side.
  * Allowed to switch distance calculation method for macromolecules (Hamming or Levenstein) in case of MSA.
  * Enabled Dendrogram to work with semType macromolecules.

#### [Peptides](https://github.com/datagrok-ai/public/tree/master/packages/Peptides#readme)

* Fixed: 
    * GROK-12424: Logo Summary Table selection.
    * GROK-12793: Logo Summary Table statistics mismatch.
    * GROK-12794: Wrong statistics on the Distribution Panel. 

#### [Tutorials](https://github.com/datagrok-ai/public/tree/master/packages/Tutorials#readme)

Added new tutorials on [grid customization](https://public.datagrok.ai/apps/tutorials/Tutorials/ExploratoryDataAnalysis/GridCustomization) and how to [add a calculated column](https://public.datagrok.ai/apps/tutorials/Tutorials/Datatransformation/CalculatedColumns).

#### [PowerGrid](https://github.com/datagrok-ai/public/tree/master/packages/PowerGrid#readme)

Added structure editing support for pinned columns.

### Improvements for developers

* Improvements:
  * Added the ability to specify input directly via  `forInputType` method.
  * Added filter property (numerical, categorical) for ColumnInput.
  * Added the ability to create Icon by root.
  * Added functions PadLeft and PadRight (s, length, char).
  * Added Property.validateValue(x).
  * Markup: Added the ability to reference commands by their names.
* Fixed:
  * GROK-12768: DateTimeColumn Timezone inconsistency.
  * GROK-12935: DateTime parsing for "5/21/2022 7:47" pattern.
  * GROK-12971: DateTime parsing for "2-May-2007" pattern.
  * GROK-12936: Float Formatter Error.
  * GROK-12787: UI generation: MultiChoice input binding
#### [JS API](../../develop/packages/js-api.md)

* Improvements:
  * Added ProjectSaving and ProjectClosing events to the existing project events.ts in js-api.
  * Exposed additional menu.item options.
  * Implemented TagsInput control.

#### Enhancements in libraries

[utils](https://github.com/datagrok-ai/public/tree/master/libraries/utils#readme): implemented TypeAhead and DropDown controls.
  
### Other bug fixes

* GROK-12430: Scientific numbers do not convert when converting column type from string to double.
* GROK-12472: The **Link Tables** dialog doesn't work.
* GROK-12805: Viewers: `NullError: method not found: 'F$' on null` error when trying to set Color.
* GROK-13046: Incorrect Min/Max work in AddNewColumnDialog.
* [#1866](https://github.com/datagrok-ai/public/issues/1866) Legends in the stack viewers are not saved properly.
* GROK-12912: Sketcher in core: incorrect dialog display.
* GROK-12954: Viewers: the gear icon does not fit on a 1600x1000 px screen at 2 dpi.
* GROK-13027: Fix Molecule3D grid cell renderer in preview.
* GROK-13068: Projects: `Insufficient privileges to save TableInfo` error when uploading.

## 2023-05-09 1.14.4

* (Bug) GROK-12918: Viewers: Grid: An exception when dragging columns to the first position 
* (Bug) [#1855](https://github.com/datagrok-ai/public/issues/1855): "Pack and zoom by filter": some data is missing 
* (Bug) [#1852](https://github.com/datagrok-ai/public/issues/1852): Line chart with splitting with specific data is making Datagrok slow (row selection, interaction with line chart) 
* (Bug) [#1840](https://github.com/datagrok-ai/public/issues/1840): Calculated columns: errors on missing values 
* null 
* (Bug) [#1837](https://github.com/datagrok-ai/public/issues/1837): Filters cannot be enabled if all filters were disabled in another view 
* (Bug) [#1839](https://github.com/datagrok-ai/public/issues/1839): Datagrok is sporadically frozen in drag-and-drop hover state (moving columns around, adding to filters, calculated columns dialog) 
* (Enhancement) [#1860](https://github.com/datagrok-ai/public/issues/1860): Grid: Support "Apply Coloring" for selected columns of compatible data type 


## 2023-05-03 1.14.3

* (Improvement) GROK-12427: Move Chem descriptors and fingerprints to top-menu -> Calculations (WIP)


## 2023-04-28 1.14.2

* (Improvement) GROK-12922: Cache and streaming compatibility 


## 2023-04-20 1.14.1

* (Improvement) GROK-12721: Tooltip modifications for dialog and drag-n-drop 
* (Improvement) GROK-12788: Cat filter: select one on first select, select all on deselecting last 
* (Enhancement) [#1583](https://github.com/datagrok-ai/public/issues/1583): Scatter Plot: "pack and zoom" option should response to changes when a numerical column is used 
* (Bug) [#1758](https://github.com/datagrok-ai/public/issues/1758): Filtering is slow if there are multiple bar charts on several views 
* (Enhancement) [#1778](https://github.com/datagrok-ai/public/issues/1778): Viewers: Organize properties consistently in the context panel 
* (Enhancement) [#1635](https://github.com/datagrok-ai/public/issues/1635): Box Plot: Add a zoom slider to adjust axes range 
* (Enhancement) [#1746](https://github.com/datagrok-ai/public/issues/1746): Scatter Plot: Date picker for X and Y axes min/max 
* (Bug) [#1671](https://github.com/datagrok-ai/public/issues/1671): Line chart: connects the first and last values when  resizing the window 
* (Bug) GROK-12891: File Manager: scrollbar is missing in the File Tree 


## 2023-04-18 1.14.0

We've launched a new version of the Datagrok platform (1.14.0). This release focuses on improving data access speed and convenience, new visualization and usability features, and ensuring platform stability. Here are some of the biggest improvements made in this release:

* New version of Grok Connect with a completely redesigned data delivery system. Thanks to streaming, you can now work with large data volumes and receive data as the query is being executed.
* [Biostructure Viewer](#biostructureviewer) package for interactive exploration of biological structures. For details, see [Biostructure Viewer](https://community.datagrok.ai/t/macromolecules-updates/661/14).
* New user-designed cell forms feature that allows you to include more details in cells, displaying additional values alongside the cell content. In-grid forms also inherit the color-coding scheme of the grid, enabling you to view even more additional information in the cell.
* [Tile Viewer]( https://public.datagrok.ai/apps/Tutorials/Demo/Viewers/Tile%20Viewer) supporting swimlanes mode, where you can drag and drop cards between lanes.
* Completely redesigned [table link editor](../../transform/link-tables.md).
* Improvement in the function execution efficiency with a significant performance boost of 10x, specifically in formula calculations.
* Multiple improvements in plugins, such as [Chem](#chem), [Bio](#bio), [Helm](#helm), [Peptides](#peptides), [Dendrogram](#dendrogram).

### Visualization and usability improvements

* Core viewers now render molecular structures in the legend marking them with their corresponding colors.
* Placed a hint in the form of three dots (...) in the corner of an element to trigger the context menu when clicked.
* Added a scroll bar in the context menu to handle options that do not fit on the screen.
* For all dialogs that require selecting a molecular column, it is now set as the initial option.
* Ability to select and import multiple files at once using the **Open local file** dialog.
* Consistently reorganized viewers' properties in the **Context pane**:
	 * Moved **Label orientation** to the **Style** tab for PC plot and the other viewers with this property.
   * Moved **Segments Font** to the **Style** tab for line chart.
   * Moved tooltip properties from **Misc** to **Tooltip** and column properties from **Misc** to **Columns** for heatmap and grid.
   * Renamed `Point` to `Line` for PC plot
   * Reordered the properties of the viewers in a way that ensures they use the same order of categories.
* [Grid](../../visualize/viewers/grid.md):
  * Ability to add info panels as columns in the grid.
  * Implemented the column-based edit permissions. Now you can set different editing permissions for each column based on user roles or other criteria.
  * Implemented the ability to view the column's private tags by clicking the **Show private** button (**Context Pane** > **Details**).
  * Added the capability for users to design their own tooltips specific to each column.
  * Implemented a warning that displays the reason why a read-only cell cannot be edited when a user attempts to start editing it.
  *  Implemented the ability to specify columns for in-grid [Default Forms](../../visualize/viewers/grid.md#summary-columns) (**Context Menu** > **Add** > **Forms** > **Default HTML**).
  * Improved default scientific format to show two digits after comma.
  * Fixed:
    * The issue where coloring and format changes were resetting unexpectedly upon interacting with filters, if a group tooltip was set
    * Table is not rendered properly after switching dataframe after sorting data in a column
    * An error when double-clicking on a column header.
* [Filter Panel](../../visualize/viewers/filters.md):
  * Added the ability to drag-and-drop custom filters to the filter panel.
  * Now filters use column format in the tooltip for dates.
  * Consolidated filters application across different tabs so that the behavior is intuitive to users. The **Reset** button resets all filters in the analysis:
      * Turns all filters on.
      * Clears all selected options.
      * Clears visualization filters (e.g. scatterplot color label or `filter by zoom`)
      * Turning on / off a filter makes it turned on /off across all tabs
      * Turning off a filter makes the filter inactive but its selection remains set
  * Fixed:
    * The list of filters becomes empty in **Reorder Filters** dialog
    * Filters synchronization when clicking the **Clear** button
    * Filters re-ordering dialog is not opened if a custom filter was added to filters panel
    * The usability of range filters when min/max values existing in the table were shown instead of actually set range
    * Slow filtering if there are multiple bar charts on several views.
* [Scatter plot](../../visualize/viewers/scatter-plot.md):
  * Now it displays legend labels for conditional coloring.
  * Added date picker for X and Y axes min/max values.
  * Harmonized the scatter plot context menu:
    * Renamed **Drop Lines** to **Show Drop Lines**.
    * Renamed **Regression Line** to **Show Regression Line**.
    * Added a checkbox for toggling **Rectangle/Lasso selection**.
    * Added **Label Color As Marker** to **Context menu** > **Markers**.
    * Now, we've disabled marker type when the marker axis is defined.
  * Made some improvements for **Formula Lines** on the scatter plot:
    * Formula lines labels are now parallel to lines
    * You can hide the regression lines formula by toggling the corresponding checkbox in the context menu (**Tools** > **Show Regression Lines**)
  * Fixed:
    * Table unexpected filtering if scatter plot has `filter by zoom` setting and empty column on log scale axis
    * Error loading scatter plot for specific data and log scale axes on applying layout
    * Incorrect response on enabling `pack and zoom` option when a numerical column is used
    * The visibility of the selected dot on zooming when it is outside the currently shown range
    * Error loading scatter plot for specific data on applying layout
    * Zoom slider behavior for inverted axes
    * Disappearing of the legend when specific filter is applied.
* [Histogram](https://community.datagrok.ai/t/visualization-related-updates/521/32):
  * Added the multi-distribution mode: the ability to show markers and a choice of whether or not distributions should be normalized.
  * Added an option to show markers and straight lines for the split mode.
  * Added an option to normalize distribution in  the split mode.
  * Fixed:
     * incorrect behavior when filtering
     * resetting filter when filtering out missing values.
* [Line Chart](../../visualize/viewers/line-chart.md)
  * Now the line chart renders molecule structures on the X axis.
  * Added the zoom slider on the X axis.
  * Fixed:
    * Wrong data is shown on line chart
    * Unsupported operation: NaN.floor() error
    * Incorrect legend for **Split by** when **Row Source** is set to `Selected`
    * Formula lines error
    * Change columns bug.
* For [PC Plot](../../visualize/viewers/pc-plot.md) we've fixed:
   * Density recalculation on normalization or switching columns to log scale
   * Adding Measures in PC plot transformation.
* [Box Plot](../../visualize/viewers/box-plot.md)
  * Added a zoom slider to adjust axes range
  * Harmonized the box plot context menu:
    * Added new menu entries to **Markers**: **Marker Type**, **Marker Size**, **Marker Opacity**, **Show Inside Values**, and **Show Outside Values**.
    * Added menu **Statistics** on the top level with two entries: **Show Statistics** and **Show p-Value**.
    * Added menu Y axis with **Show Value Axis**, **Axis Type**, **Invert Y axis**, and **Show Value Selector**.
    * Added menu X axis with **Show Category Axis**, **Label Orientation**, and **Show Category Selector**.
* [Bar chart](../../visualize/viewers/bar-chart.md)
  * Harmonized the context menu.
  * Implemented a fix that correctly hides the tooltip when the user selects the **Tooltip** > **Hide** option.
*  [Tile Viewer](../../visualize/viewers/tile-viewer.md) now shows long values that are not fully visible in a tooltip.
* Resolved the issue where the  [Trellis Plot](../../visualize/viewers/trellis-plot.md) displayed not all data until a user clicked a bar chart.

### Data Access

* Improvements:
  * Added the support of [CoreWeave Object Storage](../../access/files/shares/coreweave.md).
  * Conducted Postgres harmonization, which includes complete types support and the addition of regex support in the string pattern for the connector.
  * The MySQL connector now fully supports all types.
  * Added the ability to display SQL views along with tables.
* Fixed:
  * Regex for query annotation.
  * Query annotation: Allow extra spaces.
  * **Browse Schema** action for MySQL now returns the name of the current database.
  * Snowflake: Browse Schema doesn't work.
  * Snowflake: error on the **Content** tab.
  * DataQuery: Query created from connection doesn't return a result.
  * Databases | MS SQL | NorthwindTest | Schemas | dbo: 'com.microsoft.sqlserver.jdbc.SQLServerException:'error in the **Inspect** tab for the column.
  * Error on the **Activity** tab for some connections
  * Snowflake handling of doubles, infinity, -infinity, NaN, and large scale floating point numbers.
  * Exception in parametrized queries with two identical parameter names.
  * Databases | PostgresDart | NorthwindTest: error for the `orders` query.
  * Databases | PostgresDart | ChemblSQL: error on the **Content** tab when clicking the `domains` table.
  * Databases: can't add Visual Query.
  * Databases | Build Query: doesn't show query preview.
  * Databases | Visual Query: error when adding a column.

### Enhancements in packages

<!--#### [ApiSamples](https://github.com/datagrok-ai/public/tree/master/packages/ApiSamples#readme)


ApiSamples now includes new control demos and the "hide-empty-columns" script.-->

#### [BiostructureViewer](https://github.com/datagrok-ai/public/tree/master/packages/BiostructureViewer#readme)

The package provides the functionality of two viewers  that enable the visualization of biological structures on the Datagrok platform.  For details, see [Biostructure Viewer](https://community.datagrok.ai/t/macromolecules-updates/661/14)

#### [Bio](https://github.com/datagrok-ai/public/tree/master/packages/Bio#readme)

* Renamed the dialogs and the items in **Top Menu** > **Bio**.
* Fixed:
  * 'NullError: method not found: 'Q' on null' error when running Sequence Activity Cliffs
  * The aggressiveness of the Macromolecule detector was reduced.

#### [Helm](https://github.com/datagrok-ai/public/tree/master/packages/Helm#readme)

* Fixed:
  * `Neither peptide, nor nucleotide` error when calling **Helm Web Editor**
  * Macromolecule detector for alphabet UN.

#### [Chem](https://github.com/datagrok-ai/public/tree/7c62a0c018ec631d3b23760d538a17aaf4d4ca36/packages/Chem#readme)

* Improvements:
   * Renamed the dialogs and the items in **Top Menu** > **Chem**. Specifically, we've removed the **Sketcher** item and added [**ADME/Tox**](https://community.datagrok.ai/t/cheminformatics-updates/457/23?u=oahadzhanian.datagrok.ai).
   * Updated the column and cell properties and now all chemical information on the **Context Pane** is located under the **Chemistry** info panel. Also, we've removed the diversity Search widget from the **Context Pane** > **Details**.
   * Made tooltip modifications for molecular data. Now, the tooltip in dialogs no longer covers the data and shrinks during drag-n-drop.
   * Improved the handling of malformed and empty data. Now a warning appears with the indexes of the failed molecules in chem analyses.
  * Customization of dimensionality reduction algorithms is now possible, especially in the context of **Chemical Space** and **Activity Cliffs** functions. For details, see [Dimensionality reduction algorithms](https://community.datagrok.ai/t/cheminformatics-updates/457/21).
  * Implemented improvements for Similarity and Diversity Search viewers. Information from any column of the initial dataset can now be added to these viewers, and the color coding applied to the initial dataframe is also displayed there. To learn more, see [New functionality in Similarity/Diversity search](https://community.datagrok.ai/t/cheminformatics-updates/457/19).
  * When a large structure is depicted in the sketch box of the filters panel, it is now rendered in a tooltip.
  * [Scaffold tree](../../datagrok/solutions/domains/chem/chem.md#scaffold-tree-analysis) improvements:
    * Scaffold tree now uses the default sketcher set in the Chem package properties.
    * Implemented logical AND, OR, NOT operations for scaffold tree elements.
* Fixed:
   * Structure display in the structure filter.
   * Scaffold Tree fails on a large dataset.
   * Error occurring on hovering the molecular and macromolecular column's header.
   * Infinite updating when switching to the **Chem Draw** sketcher.
   * Filter synchronization between **Marvin** sketcher and the **Filter Panel** while filtering smarts.
   * Handling empty values in **Fingerprints**.
   * **Group Analysis** viewer: can't open properties by clicking the **Gear** icon.
   * `Result of truncating division is NaN` error when hovering over molecular column's header.
   * **Marvin** filtering via `List/NOT List`.
   * Filter synchronization for different tables if they have the same name of the molecular column.
   * Chem tooltip displaying on the **Context Pane**.
   * `Chem | Possibly a malformed molString at init: 'undefined'` error when hovering over molecular column's header.
   * The issue where the **Cancel** button was not resetting the filter when using **Marvin**.
   * Grid scrolling to the right when hovering over a molecular column.
   * Wrong rendering of malformed data.
   * Molfile copying.
   * The issue with the synchronization of the sketcher. Now, when you switch the sketcher on the **Filter Panel**, it changes the sketcher in the **Hamburger Menu** and on the **Context Pane** accordingly.
   * The  **copy as smiles** action.
   * Color coding for the similarity search viewer.
   * **Elemental Analysis**: false message `Charts package is not installed`.
   * The `Sketcher not found` warning on package init.
   * Sketcher popup clipping in the dialog.
   * Empty values handling in **Descriptors** and **Map Identifiers**.
   * Sketcher duplicating in the **Filter Panel**.
   * Browser tab freezing on hovering a molecule column's header after data was removed.
   * Sketcher tooltip after opening a molecule in Marvin.
   * The molblock native wedging usage. Now it's used where available.

#### [Dendrogram](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram#readme)

The dendrogram viewer now uses standard default colors.

#### [Peptides](https://github.com/datagrok-ai/public/tree/master/packages/Peptides#readme)

We've significantly improved the Peptides package, including a new feature integrating with dendrograms. For more information, see [Peptides updates](https://community.datagrok.ai/t/macromolecules-updates/661/13).

#### [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts#readme)

We've added routing to the viewers' demo.

#### [GIS](https://github.com/datagrok-ai/public/tree/master/packages/GIS#readme)

We've reduced the aggressiveness of detectors and added a column name check.

#### [Tutorials](https://github.com/datagrok-ai/public/tree/master/packages/Tutorials#readme)

 You can now open and share a tutorial via a link.

#### [PowerGrid](https://github.com/datagrok-ai/public/tree/master/packages/PowerGrid#readme)

We've now exposed the pinned columns functionality in the PowerGrid package and fixed the following issues:
  * Unclickable Id link on pinned columns
  * Incorrect displaying after applying the layout with the viewer stacked over the table.

### Improvements for developers

We've separated **Images** and **Docker Containers** in the platform.

#### [PowerPack](https://github.com/datagrok-ai/public/tree/master/packages/PowerPack#readme)

We've added `Qnum` to supported column types and fixed the issue with the execution of some functions in the **Add new column** dialog.

#### [Viewers](../../develop/how-to/develop-custom-viewer.md)

* Added canvas grid cell renderers to the gridext library to render multiple values in a grid cell using a vertical layout.
* Cell renderer now can estimate the desired cell size based on the entire column

#### [JS API](../../develop/packages/js-api.md)

* Improvements:
  * Introduced a new feature for application developers. Now you can [place hints](https://community.datagrok.ai/t/javascript-api-updates/526/21) for users in the form of indicators, and popups, as well as describe a series of visual components in the wizard.  UI methods now come equipped with interactive hints, similar to those found in tutorials, that can be attached to various elements. With the addition of these methods, application authors are able to incorporate interactive hints in their app code, allowing them to introduce new features to their users, among other things.
  * To work with custom filters, we've added `.custom-filter-type` and `.ignore-custom-filter` tags . See [column tags](../../visualize/viewers/filters.md#column-tags) to learn more.
  * Provided `typeAhead`, `dropDown` and `breadcrumbs` controls for the platform.
  * Implemented the capability to export graphics of scatter plot to JS API. You can now render scatter plot viewer to an arbitrary graphics context using JS API. Basically, we've made a viewer that works directly with the cell renderer. This means you can now show cells as viewers and manipulate them in other ways too.
  * Added classes for form viewers in the API: `Form` and `FormViewer`.
  * Added the `onViewRemoving` event.
  * Improved the table join feature by adding the option to merge "all columns" without having to list each individual column.
  * Added `DataQuery.connection`.
  * Added JS renderers: `getDefaultSize(gridColumn)`.
  * Exposed the row tooltip of ScatterPlot viewer to JS API
  * Added the `tags` field to `GridColumn` for storing serializable JS objects.
  * Added the `autoHideTabHeader` property to **Accordion**.
  * Balloon: added the ability to pass elements as content
  * Exposed the `Menu.show` options.
  * Grid: exposed `gridRowToTable` and `tableRowToGrid` methods.
* Fixed:
  * Fixed the TableInput reacting to the programmatic value setting.
  * TableInput does not fire onInput when user uses **Open file** button.
  * The ` whereRowMask()` function to correctly apply the mask to the selection.
  * Signatures of `_render` function for all plots with `CanvasViewerMixin`.
  * Color calculation when the data range is 0.

### Other bug fixes

* Console error on closing viewers.
* Browser tab freezes on hovering a molecule column header after data was removed.
* Floating viewer appears unexpectedly on applying layout in some cases.
* Out of memory on adding viewer with specific data.
* While dragging windows, sometimes text in them might get selected.
* Group Analysis viewer opens twice in the demo.
* Nested context panel's expanded state is not remembered.
* Incorrect bounds of `Datetime` pattern with operator `this week`.
* 3d scatter plot: failed to load if **Show Axes** property is set to `false`.
*  Issue with formula line opacity: opacity set in one formula line object also applies to the others.
* issue with the condensed form, where the icons for options and postfixes overlapped.
* `RegExpExtract` function throwing an exception when no match is found.
* Wrong docker status when making a request.
* Databases: error in the **Sharing** tab of the **Context Pane** after deleting the shared query.

## 2023-05-16 1.13.15

* GROK-12596: Core: Viewers: support for NaN and +/\- Infinity (WIP)
* [#1616](https://github.com/datagrok-ai/public/issues/1616): Scatter plot: zoom slider behavior is inconsistent for inverted axes
* [#1671](https://github.com/datagrok-ai/public/issues/1671): Line chart: connects the first and last values when resizing the window
* [#1852](https://github.com/datagrok-ai/public/issues/1852): Line chart with splitting with specific data is making Datagrok slow (row selection, interaction with line chart) 

## 2023-04-18 1.13.13

* (Bug) [#1808](https://github.com/datagrok-ai/public/issues/1808) Line chart with logarithmic Y axis is rendering data points incorrectly

## 2023-04-12 1.13.12

* (Enhancement) [#1583](https://github.com/datagrok-ai/public/issues/1583): Scatter Plot: "pack and zoom" option should response to changes when a numerical column is used
* (Bug) [#1761](https://github.com/datagrok-ai/public/issues/1761): Out of memory on adding viewer with specific data
* (Bug) [#1764](https://github.com/datagrok-ai/public/issues/1764): Error loading scatter plot for specific data and log scale axes on applying layout
* closes 1744 Table is unexpectedly filtered if scatter plot has 'filter by zoom' setting and empty column on log scale axis
* (Bug) [#1744](https://github.com/datagrok-ai/public/issues/1744): Table is unexpectedly filtered if scatter plot has 'filter by zoom' setting and empty column on log scale axis (WIP)
* (Bug) [#1745](https://github.com/datagrok-ai/public/issues/1745): Floating viewer appears unexpectedly on applying layout in some cases
* (Bug) [#1758](https://github.com/datagrok-ai/public/issues/1758): Filtering is slow if there are multiple bar charts on several views
* Filters: return select filters dialog

## 2023-03-29 1.13.10

* (Bug) GROK-12646: for_entity method is very slow

## 2023-03-28 1.13.9

* (Bug) GROK-12646: for_entity method is very slow (WIP)


## 2023-03-22 1.13.8

* (Enhancement) [#1552](https://github.com/datagrok-ai/public/issues/1552): Scatter Plot: line labels enhancements
* (Bug) [#1613](https://github.com/datagrok-ai/public/issues/1613): 'Error loading scatter plot' for specific data on applying layout
* (Bug) GROK-12382: Websocket reconnects after it closed (WIP)
* Datagrok Docker: Allow grok user use sudo without password
* (Enhancement) [#1111](https://github.com/datagrok-ai/public/issues/1111): Viewers: PivotGrid: transformation result preview
* histogram imitates filter look
* (Bug) [#1628](https://github.com/datagrok-ai/public/issues/1628): Wrong data is shown on line chart
* (Bug) GROK-12479: Project deserialization leads to 50MB response size
* (Bug) GROK-12408: Chem: 'Chem | Possibly a malformed molString at init: `undefined`' error when hovering over mol column's header
* Help: New release history
* fix for column tooltip
* Git: Fixed conflicts
* fix scatterplot
* (Bug) [#1651](https://github.com/datagrok-ai/public/issues/1651): Line chart: incorrect legend for Split by when Row Source=selected
* (Bug) [#1650](https://github.com/datagrok-ai/public/issues/1650): Line chart: Unsupported operation: NaN.floor() error
* (Bug) GROK-12498: Chem: grid scrolls to the right when you hover over a molecular column
* connected not supported
* updated version of grok_connect-1.2.1.jar
* added snowflake dependency
* updated snowflake provider
* made fixes
* updated version
* made small fix
* GROK-12104: Schema browsing support
* added equals and hashcode methods
* added tests dependency, updated psql version
* created sql scripts for testing psql provider
* created base class for testing
* created test class for postgres provider
* created tests infrastructure
* made field params public
* added access modifiers
* made slight changes
* made small changes
* removed equals&hashcode; added getter for data
* updated sql scripts
* added comparator for data frames
* (Improvement) GROK-12090: GrokConnect: Postgres Harmonization
* GROK-12188: Add regex support in string pattern for Postgres Provider
* added method order annotation
* added clear display of parameterized test purpose when running tests
* GROK-12100: GrokConnect: Full types support for Postgres Provider
* added oracle dependency to pom
* Grok Connect: Bump version to 1.3.3
* GROK-12089: Grok Connect Harmonization (WIP)
* Update grok_connect.yaml
* Grok Connect: Updated build script
* GiHub Actions: Push Grok Connect from release branches
* Grok Connect: Remove WIP tests
* created test scripts for oracle provider
* GROK12089
* GROK12210: Edited test queries
* GROK12211: intermediate commit
* GROK-12211: Create test class and test cases for Oracle Provider
* GROK-12212: GrokConnect: Full types support for Oracle Provider
* GROK-12210: GrokConnect: Test Queries for Oracle provider
* (Improvement) GROK-12091: GrokConnect: Oracle Harmonization
* (Improvement) GROK-12103: GrokConnect: Snowflake Harmonization (WIP)
* GROK-12286: GrokConnect: Test Queries for Snowflake provider
* (Improvement) GROK-12346: Add the ability to display sql views along with tables
* GROK-12344: GrokConnect: Test Queries for MSSQL provider
* GROK-12352: Create test class and test cases for MSSQL Provider
* (Improvement) GROK-12092: GrokConnect: MSSQL Harmonization
* GROK-12372: GrokConnect: Test Queries for Athena provider
* (Improvement) GROK-12095: GrokConnect: Athena Harmonization (WIP)
* GROK-12373: Create test class and test cases for Athena Provider
* Grok Connect: Bump version
* (Bug) [#1637](https://github.com/datagrok-ai/public/issues/1637): Filters re-ordering dialog is not opened if a custom filter was added to filters panel
* (Bug) [#1724](https://github.com/datagrok-ai/public/issues/1724): Table is not rendered properly after switching dataframe if it was sorted

## 2023-03-14 1.13.7

* fixes #1609 FilterGroup.add issue

## 2023-02-22 1.13.3

* (Bug) Connecting to local file storage results in error (WIP)

## 2023-02-21 1.13.2

* 1583 manual sketcher resizing (#1598)
* closes #1599 Coloring and format changes are reset unexpectedly on interacting with filters if group tooltip was set
* line chart broken

## 2023-02-15 1.13.1

* Standard color schemes : update "Traffic Lights" palette
* Grid: Enable getCellEditor for meta.columnTags
* Grid: Fix for getGridCell
* fix grid demo dir in its package.json

## 2023-02-13 1.13.0

* update GrokConnect to version 1.1.0
* Charts: syntax fixes in tree-viewer.ts
* update GrokConnect version to 1.1.0
* Charts: fixed filter problem in sankey and chord
* Add null values support to ui.dateInput
* Core: add radioGroup identification to menu options where relevant
* Test Manager: Sort categories alphabetically
* Charts: fixed tree-utils mapRowsToObjects() method
* Charts: removed data duplication in chords and sankey
* bio lib: PDB interfaces
* BiostructureViewer: NGL typings, NglViewer open file
* Dendrogram: Package icon, minor fixes
* Harmonize Demo package
* NglViewer: Move NGL to BiostructureViewer
* Utils: history panel engine refactored
* Utils: removed Cloning step from ComputationView
* Utils: added scriptsCache for HistoryPanel
* Utils: fixed getPackageUrls fails for old runs
* Utils: minor version bump
* datagrok-tools: fix exit codes in grok test
* Fix empty state icon style
* Viewers: added sankey viewer redrawing on filtering
* ClinicalCase: Fix connection to S3 bucket with files
* Test manager: Mark all tests yellow if Unhandled exception occurred
* #863: moved pepsea to Bio package
* (Bug) Table content queries fire events
* Removed StackedBarChart
* Chem: menu: sketcher types as radio buttons
* Viewers: fixed labels which don't move with selected graph node
* #1480: Demo App: WIP
* PIDB: Connection string generation
* bio lib: Fix TreeCutOptions type for min, max optional
* Dendrogram: Fixes allowing empty trees
* Libraries/ml: activity cliffs refactoring
* Utils: added updated indicators to history panel
* PI DB icon
* Compute: deps update
* Bump grok_connect versions
* Compute: updated maintainer email
* update grok connect version to 1.2.0
* Reverted serialization version
* Charts: removed exportation of sankey and chord
* Chem: fix UI tests
* Tutorials: library refactoring
* ScaffoldTree: removing script needed to install ScaffoldGraphDG module + all its occurrences
* Tutorials: add missing property to the library
* bump datagrok tiils version to 4.7.6
* Chem: fixing top menu script based.mutate
* closes #1467 date values should be shown in tooltips.
* Tutorials: reuse code from the tutorials lib
* #1465 Improve usability of range filters
* Chem: map identifiers (increase wait)
* dpetrov/1364: Support for non-standard fragments in structure search
* dpetrov/1217: Scaffold-Tree: fixed environments, fixed aromatics, various ui-changes
* closes #1465 Improve usability of range filters
* #1472 Reuse 'Pick up style' functionality for JsViewers
* Utils: parentView made optional
* chen-meta: bump version
* dpetrov/1217: Scaffold-Tree: fixed autogenerate & deserialize
* Tree view outline
* ML: fix and bump
* Chem: fix and bump
* Chem: skip map identifiers test
* Viewers: changed JS to TS
* Viewers: added Circos for chord viewer
* Viewers: syntax fixes
* Viewers: rewrote code base from JS to TS
* Viewers: fixed word-cloud onPropertyChanged()
* Libraries/ml: fix and version up
* Chem: updated ml dependency, bump version
* Ketcher: updated utils dependence, bump version
* Charts: restructured the package
* Adjusted the type for Entity.getProperties() to \{[index: string]: any}
* Issue #1492: Chem | Elemental analysis: malformed data in dataset handling
* Chem: bump new version
* Tooltip.show now accepts String | HtmlElement
* Minor help updates
* Packages Charts and Viewers merged into one package
* closes #1481 Chem | Cell with molecule: ‘Use as Filter ‘ action causes error
* JKG: Disable Datlas autostart in container
* BiostructureViewer: add 1pdbq.sdf
* #1336: creating new cluster
* #1336: custom clusters serialization
* #1336: enable cluster removing
* Charts: added documentation about new viewers
* #1465 Improve usability of range filters, layout problem
* (Bug) GrokConnect: Neptune list parameters don't work
* #1465 filters improvements default size
* (Bug) Viewers | Map: layer data export doesn't work
* Tutorials: items to fix (WIP)
* #1333: multiple views
* update grok connect version to 1.2.1
* Proper parameter visibility
* Peptides: Disabled Get Peptides Structure
* utils lib: fix errorToConsole for number type
* bio lib: Fix for handling errors in toAtomicLevel, fix for gaps in MSA in toAtomicLevel bump version
* Bio: bump version for dependencies on utils ligand bio lib
* Peptides: throw error if barchart rendering fails
* #1077: UI fixes
* Peptides: fixed aggregated columns not showing in LST
* Peptides: fixed errors in LST
* Peptides: lint fixes
* Peptides: 1.6.0 release
* GIS: fixed odd adding of Markers GL Selection to layers list
* (Bug) Viewers | Map: after setting the 'Render Type', the Layers menu update is one step late
* bio lib: Fix parse newick for no name root, reduce ITreeHelper.newickToDf args, bump version
* Dendrogram: Add tests for TreeHelper, reduce TreeHelper.toNewickDf args, fix for no name root
* Dendrogram: bump version
* ScaffoldTree: script minor fixes
* Dendrogram: Fix using nodePrefix in TreeHelper.toNewickDf correction no name root node
* Utils: HistoryPanel redesigned
* Utils: added ribbonMenu clearing
* Utils: patch version bump
* MLB: Add VRs count to antigen list, fix PTM filter, checkVrForTree, VR space, fix tree for grid with cellType='html',
  fix merged clone trees on network diagram, calc distance on JUNCTION region
* Charts: fixed GIFs size in md file to 800x500
* Compute: migrated default scripts to JS
* closes #1483 Event.path removed from chrome
* Libraries/chem-meta: updated rdKit Reaction api, version up
* Chem: added chemical reaction semantic type to js-api
* Chem: added rdkit reaction cell renderer, version up
* Detectors: one test for all (WIP)
* Docs: Create script to migrate help to Docusaurus
* Chem: #1497 aromatic query substructure search
* bio lib: Fix export type IDendrogramService, TreeCutOptions
* Dendrogram: bump version for dependency bio lib new version
* Charts: replaced jQuery with cash-dom
* bump node version in action packages
* bump npm version to 9 in actions package
* Charts: moved tree-map to deprecated
* dpetrov/1497: Package Chem: Added support for non-standard fragments to structure highlighter
* Compute: renamed default scripts
* Compute: patch version bump
* Utils: moved all history actions to HistoryPanel
* (Bug) JS API: DG.toJs won't work for predictive models
* Chem: reactions renderer \- split row into reactants and products in case of long reaction string
* Charts: added filtering to radar
* ApiTests: added tests for returning FuncCall options
* DevTools: version bump
* js-api: Add semType Molecule3D, PDB_ID
* Charts: added selection to surface-plot
* bio lib: No re export type IDendrogramServer and TreeCutOptions, bump version
* Charts: fixed radar tests
* Dendrogram: Fix import IDendrogramService, bump version
* Dendrogram: Move NglViewer README, PDB_ID semType detector, PDB_ID semType widget panel to BsV, fix Molecule3D file (
  pre)viewers, fix PDB file handler
* bio lib: Remove index.ts
* (Bug) Failed to share a connection
* Fixed NPE
* ApiSamples: version bump
* bio lib: Reduce vd-regions modules, bump version
* Chem: mol2 importer, fix bug with lacking bonds
* Charts: updated substituent analysis and renamed it to group analysis
* Bio: Fix imports from bio lib, bump version
* Dendrogram: Fix imports from bio lib
* PTV: Fix imports from bio lib
* GIS: UI fixes (header in property panel)
* MLB: Selector for VR space dimensionality reduction method UMAP or t-SNE, fix imports from bio lib
* Fix splitter resizing
* GIS: added title and html table for coordinates in property panel
* (Bug) API: `ui.tableInput` shows invalid DF names if tables are opened before its' creation
* Help: DocSearch token
* Chem: ScaffoldTree: removing the highlighting when necessary
* Chem: ScaffoldTree: added the lines (should still be improved though)
* TreeViewNode: added a generics type to represent node.value
* Chem: Scaffold Tree: major code cleanup; made most of it strongly-typed as well
* Chem: Scaffold Tree: added 'ringCutoff' and 'dischargeAndDeradicalize' parameters (to both script and viewer)
* Chem: Scaffold Tree: minor code cleanup
* Chem: Scaffold Tree: saving and opening \- WIP
* Chem: Scaffold Tree: moved UI code to CSS
* Chem: Scaffold Tree: beautified the lines
* Chem: Scaffold Tree: minor fix
* Minor visual improvements
* Fixed #1502: fixed missing custom cluster name in distribution widget
* #1077: WebLogo fixes
* Chem: Scaffold Tree: support for loading and saving trees
* Chem: Scaffold Tree: ability to invoke it from the top menu
* Fixed #1503: added custom cluster name property in logo summary table
* Fixed #1504: fixed aggregated column not appearing in LST
* Fixed #1505: added aggregated columns to distribution widget
* Peptides version 1.6.1
* Chem: Scaffold Tree: Fixed the rendering of non-standard nodes fragments
* Chem: Scaffold Tree: cosmetic improvements
* Chem: Scaffold Tree: Returned accidentally removed version of the aromatic processor
* Chem: Scaffold Tree: help
* Chem: bumped up the version
* (Bug) Scatterplot: range sliders issue when a legend is present
* Chem: Scaffold Tree: Fixed structure highlighter bug on node selection
* Chem: Scaffold Tree: Fixed saving scaffold tree as part of layout
* NglViewer: Remove the package
* Chem: added tests for substructure search with aromatic bond/explicit hydrogen
* Packages: Tutorials: version bump
* Widgets: obsolete smiles widget removal
* Tutorials: clarifications for the scripting tutorial
* Charts: added filtering to group-analysis
* (Bug) FuncCall.options can't be saved to DB
* closes #1499 Legend/viewer inconsistencies when table is filtered
* #1354: fixed RGroup failing with OCL sketcher
* Dendrogram: Fix hierarchicalClustering for datetime type column as float
* JS UI Test: SPE
* closes 1464 Change order of filters
* JS API: add showNextTo parameter to Dialog.show
* Bio: fixed typo
* Charts: refactored sankey
* Issue #1417: Chem | Column Actions | Descriptors: error when empty values are present
* Chem: Scaffold Tree: Added support to cancel tree auto generation
* MLB: Fix VR space scatter plot X, Y data column names on changing data frame
* GIS: removed the showing of custom property panel of GisObject
* (Bug) Add missing DB index
* Help: Fix linter errors
* Charts: refactored chord
* Docker: load image to system
* Build: Universal build script for all OS
* Charts: refactored globe
* Build: Windows compatibility
* Revert "Build: Windows compatibility"
* Widgets: bumped up the version
* #928 recheck properties order
* Build: Docker cache for files in Windows
* Build: Docker files copy
* The ability to construct byte array column using fromList constructor
* (Bug) File Shares: Mount Windows shares
* Charts: added aggregation types to group-analysis
* Cloudfimation:add 80 port to cvm_int_lb SG
* Charts: fixed typos in radar
* update node to 18.12.0 in puppeteer
* Charts: fixed typos in word-cloud
* Fixed #1517: fixed cluster not removing
* add webpack to DSP-package
* Fixes #1521: don't create empty new views
* #1518: replaced settings button with wrench icon
* #1518: removed view name field
* #1518: moved New view button to property panel on selection
* Added Dmytro to beta users
* Chem: add tests for mol2 importer
* Bio: substructure filters refactoring
* Alation: updated api dependency
* GIS: fixed zipcode detector
* bio lib: Move WebLogo viewer to Bio package
* Charts: version up
* (Bug) Color coding: dialog size issue when coloring a molecular column
* Lstolbov/curves (#1526)
* Charts: skipped timelines properties test, version up
* Bio: Move WebLogo viewer to Bio package
* Peptides: Remove reexporting index.ts from bio lib
* Charts: skipped timelines viewer creation tests, version up
* #1314: Chem \- fixed properties widget
* #1487: fixed Structural Alerts panel mol orientation
* Chem: updated Group analysis function, bump version
* Chem: fixed typo in panels
* #1454: use the same instance of rdkit module in structural alerts panel
* Chem: bump version
* FittingTools: bum version
* Revert "GitHub Actions: Bump Meta package version for"
* Peptides: refactored views
* Build: Remove Windows symbols
* Chembl: New server for databases
* #1518: moved custom cluster actions to property panel
* Charts: changed mode to development
* #1518: Monomer-Position viewer hints in icon
* Chembl: Add Chem as grok dependency
* #1518: nullable clusters column input
* #1524: nullable clusters field
* #1524: autogenerate aligned column name
* #1524: added inputs tooltips
* (Bug) Viewers | Trellis plot: errors occur when a trellis plot is displayed in R-Groups Analysis
* (Bug) Package can't be installed with npm proxy specified
* Helm: fixing datagrok-libraries/bio version
* Close #1466 MLB: Fix WebLogo tooltip invalid count rows/sequences with specific monomer at particular position, add
  test, add WebLogo.filterSource property
* Dendrogram: Dendrogram viewer fix props category Style
* JS API: fix Dialog.showModal
* Dendrogram: documentation
* Dendrogram: documentation fix gifs
* Dendrogram: Scroll grid on wheel on tree
* MLB: Fix binding embed columns with VR space scatter plot
* (Bug) Charts | GroupAnalysisViewer: NullError: method not found: 'root' on null
* (Bug) AddNewColumn without passing column type causes the exception (WIP)
* Viewers: Histogram: An option to render the distribution as spline when no split is defined
* dpetrov/1532: Chem: Fixed structure highlight with explicit hydrogen
* Dpetrov/1533 chem structure search makeover (#1535)
* Grok Compute: Default configuration
* Grok Compute: downgrade numpy Fix 'AttributeError: module 'numpy' has no attribute 'bool'' error Numpy removed method
  bool in 1.24.0 More information: https://github.com/numpy/numpy/releases/tag/v1.24.0
* #1529: Chem \- added check if package has been initiated
* DSP: package.json indent
* Update Meta package
* 1476 chem similarity search improvements (#1536)
* Peptides: minor refactoring
* Chem: described similarity search in README
* Build: Multiple actions for docker build
* Git: ignore files generated by datlas during start
* Chem: version up
* Docs: Release documentation
* Docs: Docusaurus documentation
* Grok Shared: Default values for CVM using ipv4 localhost address
* Chem: fixed typos in readme
* Chem: updated similarity search in Wiki
* Chem: similarity search, updated Wiki
* Grok Spawner: optional registry credentials
* Build: Docker output on build action
* JKG: Octave libspqr2 library
* (Bug) Auto init method of Chem package is called multiple times
* JKG: Octave libopenblas library
* Demo DB: MSSQL healthcheck
* ApiTests: New Demo DB servers
* Fixed some tests
* Error handling
* Bump package version
* (Bug) Some inputs cannot be nullified (WIP)
* DevTools: TM fixes
* (Bug) Viewers | Scatterplot : 'zoom by filter' doesn't work, when Filter is set first
* closes #1498 Line chart coloring legend does not match the right colors in some cases
* 1465 Improving usability of range filters
* closes 1475 Chem | Filtering: Filter Panel has to be reopened to display the molecule after Current value>Use as
  filter action
* BiostructureViewer: Change ownership to atanas@datagrok.ai
* Chem: fixing linter errors in similarity search wiki
* Chem: similarity search, linter fixes
* (Bug) Timelines viewer: properties return null dateFormat
* (Bug) Timelines viewer cannot be created (error in onFrameAttached)
* ApiTests: Viewer.props.setDefault/resetDefault
* MLB: Check data consistency VRs of the antigen in tree2 and antibody2antigen
* JS API: fix build error
* Grok Spawner: Debug in log
* Grok Spawner: Fail on docker push errors
* MLB: Check data consistency VRs of the antigen in tree2 and antibody2antigen fix
* Logger: format stacktrace for test engine
* Grok Compute: num cores based on cpu limit
* DevTools: testFunctions fix
* Add team page
* Update css styles
* #1307: fixed PubChem api panels fixed width in window
* Top panel refimnement (WIP)
* #1030: limited drug likeness panel vertically
* #1030: limited structural alerts panel vertically
* closes #1500 Line chart coloring should be able to scale to visible range of data
* dpetrov/1545: Fixed appending orphans folders after scaffold tree is loaded from a local file
* Grok Spawner: Deploy containers to datagrok host if host label is missing
* BiostructureViewer: Fix imports from bio lib, enable ts strict mode, molstar viewer initial
* JS API: add windows.showContextPane
* Cheminformatics | Stability and Polishings (WIP)
* Grok Spawner: Fail if hosts with required labels are missing
* Release notes 1.12.0
* #1465 improve usability of range filters
* Fixed #1543: MPR row ordering fix
* (Bug) Predictive Modeling | H2O: Input fields are not shown in training view (on https://public.datagrok.ai/)
* trellis plot issue
* added type-ahead control to utils
* Help: Documentation for docusaurus
* Docker Compose: Additional profiles
* Docusaurus: Team page with custom images and css
* JS API: package-lock.json upgrade
* Docusaurus: unique location for images
* set julia version to 1.6.7LTS
* Docusaurus: fix
* MLB: Fix VR space zooming on current igphyml clone/tree
* Peptides: changed category to Bioinformatics
* Help: Release notes headings fix
* Chem: columns on null (fixed for To Inchi and To Inchi Keys)
* Chem: fix tests due to panels refinement
* MLB: Bump bio/Bio dependency version for updated WebLogoViewer, VdRegionsViewer
* Rename the property panel to context panel (#1554)
* Chem: fix test for similarity search
* Rename the property panel to context panel
* Chem: skipped UI tests, version up
* Chem: fixed tests, version up
* (Bug) Test engine: enable script testing mechanism for test manager and all packages
* Docs: Fix link in help documentation
* DevTools: bump version
* Usage Analysis: changed category to General
* closes 1482 Chem | Cell with molecule: ‘Sort by similarity ‘ action causes an error
* Docs: Add Browse Schema to Supported Connectors documentation
* MLB: Fix for network diagram data columns
* Meta: Remove ngl-viewer package, bump version
* Chem: #1306 chem item in panel
* Packages: adjust package categories
* Bio: fixed substructure filters tests
* Bio: Enable tests for substructure search, fix grokDependencies versions
* Helm: Fix imports from bio lib, bump version
* fix julia scripts working
* #1523: mutation cliffs now respond to filtering
* #1523: fixed distribution widget for custom clusters
* #1523: fixed cluster creation
* #1523: fixed wrong tooltip stats in LST if filter is applied
* #1557: fixed filter not applied on project load
* #1523: made logo summary table react to filtering
* #1523: store cluster names in selection
* #1557: fixed wrong object is shown on project load
* #1556: added aggregated column to cluster tooltip
* Peptides: fixed Monomer-Position hints
* #274: fixed save and load test
* Library GridExt: Adding repaint call on adding pinned columns
* Removed extra menu items
* Package PowerGrid: Bumping Up version
* #1498 reset filter legend refresh
* 1500 readjusting X axis
* grid core height by visible cols
* scatterplot invalidate method
* scatterplot invalidate canvas method
* Bio: Downgrade platform version dependency
* Add .columns property to DG.ViewLayout
* Chem: diversity search \- additional molecule properties
* added comments to TypeAhead
* added DropDown control
* Build: Moved grok connect to github
* Avoiding using dapi on server to upload tables
* Build: Grok Connect in public
* Docs: how to set the default sketcher + link to the Release Notes
* Peptides: version 1.7.0 release
* Docs: fix link in help documentation
* Peptides: autotests fix
* Docs: fix links in help documentation
* typeahead styles
* add ribbonPanel div
* update ribbonPanel
* Chem: detectors small fix
* closes 1553 slider in log mode
* closes 1551 Line chart: X categorical axis is not aligned with value
* Mdolotov/sketchers refactoring (#1349)
* (Bug) Databases: error in Sharing tab after deleting the shared query
* grid should not throw errors

## 2023-01-27 Dev build 1.12.1

* (Bug) File Shares: Mount Windows shares (WIP)
* (Bug) FuncCall.options can't be saved to DB
* (Bug) Package can't be installed with npm proxy specified
* (Bug) AddNewColumn without passing column type causes the exception

## 2023-01-24 Dev build 1.12.0

We've released a new version of the Datagrok platform (1.12.0). This release focuses on new features for visualization
and usability and traditionally on platform stability.
Here are some of the biggest improvements:

* New [Scaffold Tree](release-history.md#enhancements-in-packages ) visualization that organizes molecular data sets by
  arranging molecules into a tree hierarchy based on their scaffolds. For details,
  see [Scaffold tree](../../datagrok/solutions/domains/chem/chem.md#scaffold-tree-analysis).
* [Dendrogram](release-history.md#enhancements-in-packages) for interactive exploration of the hierarchical clustering.
  For details, see [Dendrogram](https://community.datagrok.ai/t/dendrogram/721).
* Brand new [Map](release-history.md#enhancements-in-packages). To learn more,
  see [Map viewer](https://community.datagrok.ai/t/visualization-related-updates/521/27)
* [Peptides](release-history.md#enhancements-in-packages) new features and capabilities, such as custom clustering and
  multiple views, as well as a slightly redesigned user interface and improved application stability. To learn more,
  see [Macromolecules updates](https://community.datagrok.ai/t/macromolecules-updates/661/11)

### Visualization and usability improvements

* Color coding
  * Scatter plot now has a legend for continuous color coding.
  * In a grid, you can apply color coding to the text or
    background. This option is available for all linear, categorical, and conditional schemas.
  * When inheriting the color coding from the grid, adjustments to the min/max made in the plot are reflected in the
    grid. However, if the original column is not color-coded and selected for the color column in the scatter plot, the
    configuration isn't applied to the column in the grid.
  * Fixed changing the linear color scheme issue. Now the null values don't get colored.
  * Fixed inconsistent behavior of color coding checkboxes in the columns context menu.
* [Scatter plot](../../visualize/viewers/scatter-plot.md):
  * Added the exact min/max of the column on the axes' ticks.
  * Context menu: marker section doesn't close on click.
  * Fixed axis buffer and filters interaction.
* [Bar chart](../../visualize/viewers/bar-chart.md): reordered properties under the Order and Data submenus.
* Formula lines: regarding the line labels, the line title is on the plot, and both title and description are in the
  tooltip.
* We've added radio group identification to menu options where relevant.
* Linked tables:
  * Added the UI to specify multiple columns as key columns.
  * Fixed saving linked tables to the project.

### Enhancements in packages

#### [Chem](https://github.com/datagrok-ai/public/tree/7c62a0c018ec631d3b23760d538a17aaf4d4ca36/packages/Chem#readme)

We've added new **Scaffold Tree** visualization that organizes molecular data sets by arranging molecules into a tree
hierarchy based on their scaffolds. For details, see [Scaffold tree](../../datagrok/solutions/domains/chem/chem.md#scaffold-tree-analysis).

* Improvements:
  * Added the package property to [set the default **Sketcher
    **](https://github.com/datagrok-ai/public/tree/master/packages/Chem#sketcher) so that users won't have to switch on
    the first use manually.
  * Changed the result output for **Chem | Find MCS**. Now it returns a variable instead of a column.
  * Improved the handling of invalid molecules and empty inputs.
  * Added support for aromatic bonds when importing MOL2 files.
* Bug fixes:
  * Excluded blank data from **Diversity Search**.
  * Fixed filter: incorrect behavior after **Reset**.
  * Added progress indicator to **Similarity** and **Diversity Search**.
  * Fixed handling tables with a small number of data points when building **Chemical Space**.
  * Fixed 2d molecule orientation in the widget.
  * Fixed **Structural Alerts** detection memory leak.
  * Fixed Elemental Analysis working on MOLV3000.
  * Provided permanent fix for shared canvas re-allocation in the `rdkit-cell-renderer`.
  * Synchronized the selection and deselection of activity cliffs on scatter plot and grid.
  * Fixed an error after **Use as Filter** action under the cell with a molecule.

#### [Dendrogram](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram#readme)

We've separated **Dendrogram** from [**PhyloTreeViewer
**](https://github.com/datagrok-ai/public/tree/master/packages/PhyloTreeViewer). And now it's
a [package](https://github.com/datagrok-ai/public/tree/master/packages/Dendrogram) for the Datagrok platform for
phylogenetic tree visualization.

Use Dendrogram viewer to:

* Display the Newick tree format files (NWK, NEWICK).
* Inject a dendrogram into the grid for interactive exploration of hierarchical clustering.

For details, see [Dendrogram](https://community.datagrok.ai/t/dendrogram/721).

#### [GIS](https://github.com/datagrok-ai/public/tree/master/packages/GIS)

We've retired Google Map viewer and implemented a Map viewer in
the GIS package. It shows geospatial data on a map as either markers or a heatmap. It displays data in geographic
formats, like GEOJSON, TOPOJSON, KML, and KMZ. You can also add a map viewer to your custom table. To learn more,
see [Map viewer](https://community.datagrok.ai/t/visualization-related-updates/521/27).

#### [Peptides](https://github.com/datagrok-ai/public/tree/master/packages/Peptides#readme)

This release introduces new features and capabilities, such as custom clustering and multiple views, as well as a
slightly redesigned user interface and improved application stability. To learn more,
see [Macromolecules updates](https://community.datagrok.ai/t/macromolecules-updates/661/11)

Improvement:

* Added aggregated columns to the Monomer-Position viewer tooltips. This viewer is used
  in [Peptides SAR](../../datagrok/solutions/domains/bio/peptides-sar.md)

#### [SequenceTranslator](https://github.com/datagrok-ai/public/tree/master/packages/SequenceTranslator#readme)

* Improvements:
  * Added adaptive input fields for chains. They resize automatically upon adding longer sequences.
  * Relocated _direction input fields_ to the right of chain input fields.
  * Improved handling of the malformed data. The malformed string is now filled with red color.
  * Added tooltips.
  * Added routing to open specific tabs from links.
* Bug fixes:
  * Fixed rendering _resulting molecule_ with empty AS, AS2.
  * Fixed rendering for separate strands.

#### [Charts](https://github.com/datagrok-ai/public/tree/master/packages/Charts#readme)

We've merged package **Viewers** to **Charts**, removed obsolete viewers, and refactored the others:

* [Sankey viewer](https://github.com/datagrok-ai/public/tree/master/packages/Charts#sankey):
  * Added a tooltip.
  * Added the selection functionality.
  * Added viewer redrawing on filtering.
  * Fixed focus to highlight the current.object on a viewer
  * Fixed selection on filtered rows.
* [Chord viewer](https://github.com/datagrok-ai/public/tree/master/packages/Charts#chord):
  * Added viewer redrawing on filtering.
  * Fixed the selection functionality.
* [Radar viewer](../../visualize/viewers/radar.md):
  * Fixed changing color issue: synchronized the color of percentiles on the legend and **Context Pane**.

#### [MLB](https://github.com/datagrok-ai/public/tree/master/packages/MolecularLiabilityBrowser#readme)

* VRs tree for grid.
* Revert database connection dataSource `PostgresNet`.
* Fix for routing tree in url.

### Improvements for developers

#### [Viewers](../../develop/how-to/develop-custom-viewer.md)

* Added the ability to specify default viewer settings for the dataframe,
  see [annotation](https://github.com/datagrok-ai/public/issues/1395#issuecomment-1364325511).
* Added the ability to show a custom viewer in the Viewers section of the toolbox. The viewer should have an icon (set
  via `meta.icon tag`). Toolbox visibility can be specified as `meta.toolbox: true`.

#### [JS API](../../develop/packages/js-api.md)

* Improvements:
  * Added optional parameters to `Column.meta.colors.setLinear()` to set min and max values for linear color coding
    scale.You can also use the `COLOR_CODING_SCHEME_MIN` and `COLOR_CODING_SCHEME_MAX` tags.
  * Added radioGroup to Menu.item.
  * Added the ability to set `friendlyName` for `DataConnections` created from JS API.
  * Added hints to UI methods. The purpose is to attach interactive hints, close to what happens in tutorials, to
    elements. Application developers can then use these methods in the app code to introduce a new feature to the user,
    etc.
  * JS Viewers: disabled the removal of the default values (this likely fixes the issue with the JS properties not
    serialized).
  * Exposed schema property for `DataConnection`.
* Bug fixes:
  * `ui.choiceInput` does not work with strings that contain `\r` symbol.
  * Failure to get meta data from `SemanticValue` in JS.
  * Fixed date in `getValues()` in stock-broker.js.
  * Fixed `Project.removeChild` method.

#### [Widgets](https://github.com/datagrok-ai/public/tree/7c62a0c018ec631d3b23760d538a17aaf4d4ca36/packages/Widgets#readme)

* Added the ability to create a custom package settings widget.
* `Widget.getType()` method major code cleanup.

#### Enhancements in libraries

* [utils](https://github.com/datagrok-ai/public/tree/master/libraries/utils#readme):
  * Input categories added in the input form.
  * Added basic validation, btn disabling and UI fixes to **RichFunctionView**.
  * **RichFunctionView**: run button disabling added.
  * Move distance methods and constants to **ML lib** (utils), remove `index.ts`.
  * Exclude blank data from diversity search.
  * Utils for color.
* [ml](https://github.com/datagrok-ai/public/tree/master/libraries/ml#readme):
  * Moved distance methods from **Chem**, **Bio**, **MLB** to **ML lib**.
  * Fixed **Activity Cliffs** page freezing bug.
  * Fixed **Stochastic Proximity Embedding** dialog does not work.
  * Handled errors from web workers.
* [bio](https://github.com/datagrok-ai/public/tree/master/libraries/bio#readme):
  * Clear **Bio** lib dependency on **Phylocanvas**.
  * Separate **Dendrogram** package.
  * Fix dendrogram interfaces to allow emp.
  * Added `ITreeHelper.getNodesByLeaves`.

### [Compute](../../compute/compute.md)

* Improvements:
  * `RichFunctionView` renamed and stabilized.
  * Added script generator app example.
  * Added sample of high-order function.
* Bug fixes:
  * Fixed linking to `RichFunctionView`.

### Other bug fixes

* Actions in packages don't support semantic values.
* Connections: Fixed anonymous mode.
* Databases | Queries: error occurs in `Inchi Key To Chembl`  query when setting an input dataframe.
* DataFrame: CSV parser: when there are no rows, space is auto-selected as a delimiter instead of comma.
* Datagrok page freezes after some time of inactivity.
* Grid does not clear the `mouseOver` status if the cursor is below the last row.
* `grok.shell.project` : `newProject.open()` doesn't change active project.
* Jupyter gateway falls on unrecognized message.
* Predictive Models deploy ID issue.
* Scatterplot: error when setting equal min and max axis ranges.
* Script loses package when user saves it.
* Search pane: textual search matches numerical columns.
* Sending request to docker container results in error.
* Table | Normalize Column does not work.
* Table content queries fire events.
* Tutorials: Scripting: opening a sample table is not counted as a completed step.
* Viewers: Statistics: Histograms: an error when trying to add histogram for the second time.
* Viewers: Statistics: Use in the tooltip does not work.
* Fixed molecules orientation for smiles in activity cliffs tooltip and **Context Pane**.
* Remove docked grid if viewer is closed.
* PowerGrid: Summary columns: normalization of bars.
* PowerGrid: fixed tooltip area.
* Fixed using DataConnection dynamic properties.
* Fixed handling empty values in panels.
* Fixed column selector dialog position in prop panel.
* Handling cases when sketcher friendly name is saved in user storage.
* Fixed **Use as Filter** with multiple columns.
* Fixed trellis plot full screen button.
* Box Plot: **Show Outside Values** does not work.
* Line chart `X` category axis is not aligned with value after filtering.
* `Event.path` removed from chrome.
* Fixed SAR grid didn't react to clicks.
* Fixed `deleteFile` method.
* Fixed possible null pointer exception.
* Fixed `readBinaryDataFrame` method.
* Fixed `DataConnectionParams` type.
* Fixed Filters: custom filters added via API fail during initialization.
* Wrapped DataConnection parameters with MapProxy.
* Menu: do not close menu when checking/unchecking the item.
* Menu: indicate unchecked checkboxes.
* Minimized scatter plot issues: some rows are unexpectedly filtered out, scatter plot shown incorrectly when brought
  back.

### Misc

* Added an improved version of link-all script (grok link / grok unlink) to build and link dependencies of a package for
  local development.
* Added property description for property-bound menu items.
* Avoid keeping DB connection while sending email.

## 2023-01-06 Dev build 1.11.2

* Save table linking to project
* #1412 column selector dialog position in prop panel
* closes #1344 Legend for continuous colorColumn
* Scatter plot coloured by numerical or date column: some data is missing after re-applying saved layout #1411
  Workaround
* Fixed connections leakage
* Merge
* Fixed shapes test
* Datlas: Test: Fix paths to tests in test.all.dart
* Revert "closes #1344 Legend for continuous colorColumn"

## 2022-12-23 Dev build 1.11.1

## 2022-12-22 Dev build 1.11.0

* #1236 Color coding: ability to invert colors for linear color coding
* Elemental analysis: minor fixes (columns hadn't been added if dataset already had the columns with such names)
* Environments: Remove top-menu from demo scripts
* #1282 Chem: fixed molecule size when drawing on canvas
* SequenceTranslator: Handle errors for rows with error while Save SDF
* Environments: Small demo script fix
* ST: Fix error message, bump version
* Implement Logger
* #1289: Chem \- place recent molecules on top of the list, saving the most recent coordinates
* Utils: fixed HistoryInput CSS
* Environments: Test for inline environments
* closes #1253 Formula lines not parallel in log axes
* Chem: fixed sketcher tests
* Chem: #1293 short smiles detector fix
* Elemental analysis: provided an opportunity to add column with molecular formula
* Created index on name and namespace
* Fixed #1281: revert gasteiger charges panel to script-based
* #1297: temporary disable Info panel
* #1261: Chem \- clear sketcher button style fix
* Fixed package notification
* Chem: filtering incorrect recent/favorite molecules
* Chem: returned saving recent/favorites as molfiles
* closes #1292 Line chart is showing less data than expected if table is filtered
* dpetrov/GITGUB-1231: Fixed canvas resize handler by taking into account the element's offset
* ApiTests version update
* Adding auto check children for TreeView nodes
* Package JS-API: Added JS API for TreeViewNode
* GIS: gis-area handler improvement
* GIS: geocoding update
* Chem: fixed bug in addFavorite
* Chem: returned popup menu to similarity/diversity, structure 2d
* #1236 Color coding: ability to invert colors for linear color coding (WIP)
* Chem: handle cases when previous local storage included malformed molecules
* #1300: handling malformed target molecules in similarity search
* Remove delays in JS UI Tests  (WIP)
* Color settings, fix the view styles
* Fixed #1304: rendering only 3 symbols of monomer
* bio lib: Move newickToDf to ITreeHelper api and extend args, remove INewickHelper
* #1221 PhyloTreeViewer: Extend newickToDf args, move it to TreeHelper, remove NewickHelper, bump version
* Elemental analysis: removing option that adds a column with molecular formulas
* ScaffoldTree: changing function names
* Chem: activity cliffs \- remove duplicate code
* Librarise/ml: activity cliffs \- code cleaning
* Butina Cluster: make the algorithm work on the molblock input data
* Chem: similarity/diversity search \- remove ts-ignore
* Chem: rGRoupAnalysis: check conditions at function start
* Minor code cleanup
* Chem: minor code cleanup
* Preventing changing of the current object by expanding a property panel ()
* Chem: constants for units
* Chem: bump version
* #1221 MLB: show all trees / clones of current antigen with NetworkDiagram viewer
* bio lib: bump version to publish
* PhyloTreeViewer: Bump version to publish
* Chem: inchi sketcher bug fix
* closes #1279 axes limits, zooming issues
* Chem: fixed substructure filters test (for Ketcher)
* Set new 1.10.2 version
* PhyloTreeViewer: Downgrade datagrok-api dependency to 1.8.2, bump version to publish
* Butina Cluster: Handling NoneTypes that may occur if invalid data is present in dataset
* Chem: fixing substructure filters tests
* Adding a document with the instructions on how to run docker container on the datagrok instance
* Adding gif for docker_container doc
* Adding gif to the docker_containers.md
* Closes #1321: Chem: R-Group Analysis: unable to choose a column when there are two columns with molecules
* Libraries/chem-meta: added Reaction class to rdkit api
* Bio: updated ml dependency
* Chem: updated ml dependency
* ScaffoldTree: removing one parameter from the script
* ScaffoldTree: minor fixes
* Closes #1329: JS API: ability to highlight rows
* #1252 Color coding: min/max properties for continuous color schemes
* Peptides: settings subject type
* Peptides: selection rendering fix
* Peptides: fixed barchart not rendering on project load
* Peptides: fixed grid row height
* #1077: SAR viewer switch input interaction fix
* Peptides: code cleanup
* Peptides: visible columns fix
* Peptides: fixed settings not triggering changes
* Peptides: fixed settings not updating columns
* Peptides: stability enhancement
* #1119: refactoring WIP
* #1119: made viewers more standalone
* #1119: using raw data for clusters df creation
* #1119: fixed substitution info redundant calculations
* Peptides: fixed monomer-position viewer not rendering
* Peptides: don't add columns pane if no columns present
* #1043: Invariant Map color coding
* #1117: Logo Summary Table enhancements
* Peptides: removed constant clusters column name
* Peptides: cluster tooltip fix
* Peptides: removed activity columns from 'Columns to include'
* Wiki: JS API: Custom viewers: documented filter, selection, and highlighting
* Ddt: unit tests: moved to folders, deleted obsolete
* Ddt: unit tests: func benchmarks
* Ddt: unit tests: minor fix
* Func: lazy initialization of the aux property
* Fixed a bug in the Balloon.error
* JS API: Added Balloon.closeAll()
* Functions: minor optimizations
* Help: Map Viewer \- WIP
* Help: Tree Map
* Help: Word cloud
* Help: Heatmap
* fix UI tests (awaitCheck)
* #1236, #1252
* #1330: temporary disable include columns feature
* Peptides: fixed missing value statistics calculation
* Avoid saving functions when called from socket
* Fixed analyzer warning
* Fixed #1332: devicePixelRation for WebLogo header cell renderer
* #1230 add as value does not work when tags are saved in df
* closes #1237 Scatter plot tooltip
* Peptides: release version 1.5.0
* #1330: enable column choice for Logo Summary table
* Peptides: release version 1.5.1
* #1310: Chem \- fixed similarity/diversity limit
* ST: highlight cells with invalid Type upon registration, initial version
* bio lib: Add generic parameter TNode for getLeafList and getNodeList
* Help | Visualize | Viewers | Heatmap: Edit documentation (WIP)
* PhyloTreeViewer: TreeHelper add generic param TNode for getLeafList and getNodeList according to ITreeHelper
* recloses #1209 Viewer legend is not synchronized with in-viewer filter in a specific case
* Datlas: WIP: Debug make configuration script for startup
* ST: minor fixes
* Datlas: Feat: Print debug messages for make configuration script on startup
* Range sliders hover area incorrect when legend is added
* Chem: Fix test top menu chem space/UMAP logic
* (Bug) Color coding: All does not work for boolean columns
* Jenkins: CI: Set UID and GID for jenkins user in puppeteer container
* #1236 Scatter plot support
* Rename PostgreSQL to dev and hide, rename PostgresNet to Postgres
* #1236 Update the invert icon
* JS API: add the special tags for continuous color schemes
* #1077: added shadow to Mutation Cliff cell renderer value
* Peptides: fixed selection not showing immediately
* #1236 Add the 'Scheme' label
* Update the generated files
* Fixes #1237 Scatter plot tooltip data values
* Chem: #1325 fix queries alignment (#1347)
* Fixed links
* Fixed links and trailing spaces
* ST: autostart fix
* DB: Test: HealthCheck start period
* #1236 Update the editor layout
* (Bug) First package publication on fresh database fails
* SequenceTranslator: Fix package-lock.json for @luma.gl version 8.5.17
* #1345 Formula lines issues
* Chem: remove fix#1325
* GIS: nominatim docker file added
* Help: minor fix
* Utils: added feature request item to ComputationView
* Utils: feature request method override
* MSSQL: Test: Healthcheck start period
* MySQL: Build: microdnf instead of apt-get
* Oracle: Build: user to install
* (Bug) Manage: Users: current object does not change if you make a few consecutive clicks
* #1338: using float for activity delta
* (Bug) d4: Fix TreeMap test
* DSTK: Test: Skip tests until we figure out the new infrastructure
* Datagrok: Build: New version of Grok Connect
* Docker: Build: Use short commit IDs in image tag
* Datagrok: Build: Nginx proxy to 127.0.0.1
* Xamgle: Docs: Fix Help links
* Xample: Docs: Fix Help links
* Datagrok: CI: Olena Ahadzhanian in beta_users.csv
* Fixed possible null pointer exception
* Datlas: Test: Ignore Setup instructions for chem tests
* Datlas: Test: Test File Connections on demo data path
* Datlas: Test: Add localFileSystemAccess option to connectors settings
* Datlas: Test: Increase timeout for inline scripts tests
* (Bug) Color Coding: When changing the linear color scheme, the null values get colored
* Grid: ability to apply color-coding to text instead of background
* Revert some changes to the color coding
* closes #1348 Minimised scatter plot issues
* Public submodule update
* (Bug) Scatterplot: error when setting equal min and max axis ranges
* Fixed deleteFile method
* Fixed readBinaryDataFrame method

## 2022-11-22 Dev build 1.9.0

* bio lib: Fix properly naming for packages/GUIDE.MD
* Bio: Add VdRegionsViewer.positionHeight with default 'Entropy', fix args of exported package functions, fix
  currentView handling for WebLogo-positions tests
* JS UI Test: Predictive modeling (Caret) (WIP)
* JS UI Test: Chem | To Inchi
* JS UI Test: Fingerprints
* bio lib: Fixed phylocanvas.gl and deck.gl versions
* Issue #1123: RadarViewer. Add tests for the updated functionality WIP
* Library gridext: Fixed an issue the the duplicated Grid row header
* Packages PowerGrid: Bumped up the version of the dependency library gridext
* Bio: cell.renderer #1120: sequence Add property to highlight common
* JS UI Test: Groups
* Investigate/improve test manager performance
* DevTools: updated utills version, bump version
* Bio: updated utils library version, bump package version
* Chem: updated utils library version, bump package version
* ClinicalCase: updated utils library version, package version up
* Alation: updated utils lib version and package-test.ts
* ApiSamples: updated utils lib version and package-test.ts
* ApiTests, Arrow: updated utils lib version and package-test.ts
* extended tests with example of datetime column type and join (#1106)
* skip package filter test
* #1078: revert using virtual columns
* DevTools: test-manager \- ability to copy error text from property panel, version up
* Peptides: selection state saving fix
* PTV: Fixed phylocanvas.gl and deck.gl versions
* GIS: selection of rows-points
* JS UI Test: Tags
* Simplified icon methods
* #943 3dscatterplot onload error sometimes
* Utils: #466: Observable naming fix & patch version bump
* Utils: #466: added file input validators
* Utils: #466: fixed input DF uploading
* Utils: Validation class added
* Utils: minor version bump
* Utils: fixed validation error text
* Utils: patch version bump
* Chem: version up
* bio lib: Add interface property NodeType.isLeaf for PhyloTreeViewer, bump version
* SequenceTranslator: duplex registration
* (Bug) ColorPicker blinks in Chrome (WIP)
* DevTools: test manager \- fixed progress bar bug, version up
* Chem: remove substructure search from panel
* achopovsky/#933 to atomic level (#1133)
* bio lib: bump version
* closes 1110 Viewers: legend cannot be resized again
* SequenceTranslator: Axo Labs Pattern enhancement
* Bio, Peptides, MolecularLiabilityBrowser: raise version of lib bio in dependencies
* closes #1131 MultiColumn Selector: selects only columns filtered by search
* (Bug) Nginx: Add additional logging to investigate timeouts
* Docs: LE certificates remewal
* #1103 layout not saving
* (Bug) Grok Connect: the connection visibility
* Settings: mark instance as production (WIP)
* Removed obsolete packages
* Alation: enable Open With handling
* #943 3dscatterplot fix try
* Button alignment for form
* Issue #1034: Charts. RadarViewer removing unused options
* Issue #1123: RadarViewer. Adding tests for the case when options are changed
* Charts: Increase the version
* GIS: selection map points/grid rows (update)
* #609 aggregation mode for pc plot
* Bio: #264 monomer colours by properties
* closes #1134 trellis plot viewer icon
* Docs: Scenarios for release manual testing (WIP)
* Peptides build fix
* Introduce Viewer Serialization Context for saving layouts and projects
* (Bug) JS: DateTimeColumn allows to set string value
* (Bug) InfoPanels: Returning map or widget doesn't work
* (Bug) Package Entities Naming issues (WIP)
* Implement Logger (WIP)
* DevTools: test manager \- fixed tests, moved buttons from ribbon to view
* bio lib: Fix getStats for single line single monomer dataset, add test
* Issue #976: Add packages check
* Issue #976: Check whether elementalAnalysis had been done before in order to avoid error messages
* Chem: Increase version
* #1047: Bio \- substructure filters (helm filtering performance, modified linear search)
* #1118: distribution controls fix
* #1118: SAR mode switch fix
* #1118: collaborative filtering fix
* PhyloTreeViewer: PhylocanvasGL wrapper, injectTreeToGrid
* Converted const isPlainObject to function
* (Bug) Packages: Debug version duplicates release
* Careers section updates
* Issue #1052: Molstar: enable mol\* at the platform fixes
* GIS: autofocus on grid-row select
* Issue #1052: Adding loadStructureFromData
* datagrok-tools: version bump
* Bio: Add test bio.getStats for one line single monomer dataset, attach ticket link to test setRendererManually
* Fixed ORM test
* Fixed param name
* Bio: #1139 \- refactor library, get all data on loaded libraries
* column manager checkwrong columns after reordering
* closes #776 Viewer legend is not synchronized with in-viewer filter
* Bio: #1139 \- refactoir library, notify of monomers changed
* Charts: Surface Plot
* update deploy.md
* (Bug) TreeViewer: duplicated property "Animation Duration"
* SequenceTranslator: Axo Labs Pattern enhancement (WIP)
* Bio: substructure filters tests
* JS: Icons support for JS Viewers
* #943 scrollbars should not appear
* closes 932 Vertical scrollbar is not working in Order or Hide Columns menu
* Bio: #1139 refactor bio, export of capped monomers
* Fixed analyzer warnings
* HELM: add library as global
* Utils: history utils are extracted into separate namespace
* bio lib: Add getMonomerLib():IMonomerLib, fixes WebLogo for empty data
* Bio: Bump version for bio lib 5.5.0
* Helm: Add getMonomerLibObj package function for IMonomerLib implementation
* Fixed ambiguous column names
* Package functions: set helpUrl
* Onuf/grok 11298 external tutorials (#1116)
* Tutorials: update docs
* Issue #946: Adding ui for admet
* Tutorials: allow defining external tutorials and integrate them into the app
* Bio: Script admet-run.py to read ADMET models
* Peptides: Use IMonomerLib through bio lib
* bio: small fix
* Utils: added text filtering on historical runs
* Help: Docs: Terraform deploy instructions
* Help: Docs: Fix Terraform Template
* Help: Docs: Fix lonter errors
* GIS: box-selection bug fixed
* GIS: drag-box selecting issues fixing
* bio lib: Export MonomerWorks change getCappedMonomer(type, name), remove async init()
* Peptides: Use bio.MonomerWorks.getCappedMonomer()
* Help: Docs: Fix Terraform instruction
* Removed debug code
* Peptides: lib/bio version fix
* (Bug) Grid rollover disappears after applying filters or sort
* (Bug) Abnormal behavior when navigating grid by means of upwards arrow
* bio lib: Arrange exports, node types
* Bio: Fix import DG
* Chem: speed up chem space, activity cliffs, similarity search tests
* Tutorials: version bump
* 1128 Order and hide columns dialog isues part 1
* Adding pinned rows to Grid viewer
* Bio: modified test datasets for sequence space/activity cliffs
* PhyloTreeViewer: Fixes for PhylocanvasGlViewer, fix tree-cut-tests (as leaf lists)
* Utils: fixed bug with sharing runs' inputs/outputs
* Chem: fix test R-groups
* Bio: modified activity cliffs in ml library to be able to show modified lines grid
* Tutorials: docs update
* Peptides: analysis loading fix
* 709 filters sync in different views case 1, 2
* ORM: FuncCall visibility should depend on Func visibility (WIP)
* Packages tests
* Fixed syntax error
* Fixed analyzer warning
* Bump ApiTests version
* Bio: UI improvements, version up
* add images to provider conneectors
* fix image sizes for added connectoin images
* Utils: Ability to skip tests
* #1077: settings dialog UI
* (Bug) Simplify the chain for ViewerSerializationContext
* 1128 order or hide dialog(move top move bottom)
* closes 709 filterpanel sync (case with closing filter in different layout)
* Bio: ADMET python venv requirements
* Charts: version bump
* Helm: fixed freezing in substructure filter
* Chem: modified Chem space to call dimentionality reduce results from Bio
* Bio: sequence space on fingerprints
* GIS: detectors sampling of cathegories
* GIS: code optimised, some TODO's removed
* #709 dont close filters menu, just reset them
* Context menu commands: update conditions for JsViewers
* Charts: update readme
* added viewers test (layout)
* #1110 legend cats count incorrect
* closes #643 regression lines in log mode, r2 value
* Issue #1052: Adding pviz-bundle.min.js file
* #1077: Peptides settings
* DrugBank: version bump
* JS UI Test: Chem Sketcher
* Alation: tests fix
* #1152, Bio: work wth pdbs
* SQLite: version bump
* PubChemApi: version bump
* #1077: analysis start from top menu
* bio lib: NodeType, NodeCuttedType interfaces, fixes imports, PhylocanvasGL service interfaces and types
* Bio: Fix test substructureFilters/helm
* #1047: sequence activity cliffs using fingerprints
* GIS: color coding (linear/conditional). Filtering attempts
* #1047: Bio \- sequence activity cliffs using fingerprints
* #1047: Chem: added functions used in Bio to calculate activity cliffs
* Utils: #466: Historical runs with package isolation
* Add vertical alignment
* utils lib: Fix expectedObject for float tolerance
* PhyloTreeViewer: PhylocanvasGlService, fix for grid scroll events, skip render tasks by key, PhylocanvasGlViewer open
  test
* #1152
* Merged in onuf/1148-color-coding-extended-ui (pull request #282)
* #1077: fixed analysis dialog UI
* #1077: replaced SAR viewer title with inputs
* Wiki: update the color coding section
* closes #1156 filter bitset is reset after adding new column
* bio lib: Add IPhylocanvasGlViewer .onAfterRender and onHover, add ITreeHelper
* PhyloTreeViewer: Fix treeCutAsTree with tests, add TreeHelper, PhylocanvasGlViewer events onAfterRender and onHover
* MLB: main view fix routing, TreeBrowser render clone/tree with PhylocanvasGlService, TreeBrowser prevent recreating
  WebGL context, TreeBrowser show tooltip with long id, TwinPViewer NoSchemeItem
* added bool properties check to viewers test
* Added the tree viewer documentation
* Helm: Fix ES2021.String
* closes #1157 show visible only mode in Order and hide dialog
* Wiki: correct a misspelling
* Packages: NLP: add test files
* gridext: Fix remove tsc products
* SequenceTranslator: use sequence types map in registration
* Packages: NLP: add test skip reason
* bio lib: typings for @phylocanvas/phylocanvas.gl
* SequenceTranslator: fix of ribbon panel
* SequenceTranslator: helpers
* Chem: descriptors dlg fix
* SequenceTranslator: download function
* SequenceTranslator: registration constants
* GIS: filtering optimization, conditional color coding
* SequenceTranslator: separation of calculations from registration
* Lib/bio & HELM: MonomerWorks fix
* help: Add gif for PhylocanvasGlViewer
* PhyloTreeViewer: newickToDf set semType for columns node and parent to prevent detectors, add props nodeColumnName and
  parentColumnName to PhylocanvasGlViewer, sync selection between PhylocanvasGL and nwkDf in PhylocanvasGlViewer
* Bio: #264 \- refactoring
* JS UI Test: Form Viewer
* SequenceTranslator: code clarifications
* Grok Connect: CI: Version upgrade in scripts
* created missing indexes
* SequenceTranslator: minor change
* gridext lib: Up datagrok-api dependency version to 1.8.2, bump version
* #1155: Chem: substituent analysis in progress
* Chem: removed incorrect import from package.ts
* #709 #643 minor improvments
* PhyloTreeViewer: Fix GridWthTree and TreeHelper.setGridOrder for use leafColName and DataFrame tag '
  .newickLeafColumn', add tree generator, fix TreeHelper.cutTreeGrid to clean previous cluster marks, up used gridext
  dependency version
* Utils: historical runs API enhancement
* Added the SPGI demo dataset
* HELM: updated dependency
* Bio: #264 \- monomers read and calculated palettte creation
* #1125 add methods for getting value color into ColumnColorHelper (#1137)
* #1125 add methods for getting value color into ColumnColorHelper
* Release of Pinned Rows
* JS-API: Exposing pinned rows API
* Bio: fix init
* bio: version up
* Reorder Columns Dialog: improved a tooltip
* HomeView: got rid of unused code
* Got rid of debug printout
* Added missing files
* Resolves #1071 Color coding menu and dialog is not properly initialised after re-applying layout
* closes #1126 scatterplot packed cats with sparse columns
* Issue #1034: RadarViewer fixing problem with indicator
* JS UI Test: Leaflet Viewer
* Bio: Fix tests for similarity/diversity and activityCliffs, up Chem version in grokDependencies
* Library gridext: Added support for pinned rows.
* Added AppEvents.isProjectPublishing property
* TrellisPlot: code cleanup
* Grid: fix #1130: No tooltip on column header if column is too narrow
* DataFrameViewer: add onDataFrameChanged event
* Library gridext: Bumping up version
* #1148 Color coding: Disable the context menu command instead of error message when coloring type is not applicable
* Utils: fixed run double-load in ComputationView
* fix #1083: Grid: Popup Dialog from hamburger menu stays after the column is deleted
* fix #805: Grid: Change column type \- some strange appearance
* bio: add capPeptideMonomer
* Utils: favourites updated when filter is changed
* Utils: fixed order of the runs
* bio: bump version to 5.9.5
* bio: toAtomicLevel: fix
* bio: bump to 5.9.6
* bio: fix and raise version to 5.9.7
* closes #1161 Transformation Editor: use column selector instead of popup menus
* bio: refactor
* bio: bump version
* add property changed stream to interop
* add property changed stream to interop (#1168)
* (Bug) Files: Windows shares don't work
* Bio: refactor
* (Bug) Files: Harmonize credentials editing (WIP)
* Peptides: monomer tooltips
* closes 1167 zoom slider with specific data
* OligoBatchCalculator: separate constants
* OligoBatchCalculator: user group name and other constants
* GIS: synchronysing heat map with filteration
* added part about tests skipping
* GitHub 1159 Enable Grid column context menu in Pinned columns
* Help | Govern | User group: Add a description of the new functionality
* Chem: remove molecule without sketcher opening
* Charts: substituent analysis viewer in progress
* Peptides: import polishing
* 1157 Order & hide dialog checkbox replaced woth select
* 1161 transformation editor improvemrnts
* OligoBatchCalculator: calculations speedup
* OligoBatchCalculator: constants in order
* bio: monomer library enhances
* Bio: using monomer library
* Oauth: Bind custom google application
* gridext lib: add .gitignore .npmignore, bump version
* OligoBatchCalculator: adiitional modification validation start
* #1155: Chem: substituent analysis viewer in progress
* bio: eror fixed
* Fixed null pointer exception
* CSS fixes
* Helm: bio related refactor
* #1155: Chem: substituent analysis \- fixing bugs,
* Fixed attirbute exception
* #1077: replaced barchart with weblogo
* Peptides: settings sliders fix
* #1077: include columnds
* GitHub 1159 Multiple feature requests for Pin Column sort
* JS-API: notify for copyFrom and invert methods
* #1166: collaborative filtering fix
* Library gridext: Adressing sorting issues in pinned columns
* Library gridext: Updating the version of JS-API
* Package PowerGrid: Bumping up package version, JS-API, gridext
* fix #1173: Significant figures should be rounded properly
* Utils: report to audit about failing tests
* GIS: new colorcoding type, code optimization
* OligoBatchCalculator: validation of changes to additional modifications
* Closes #1163: PhyloTreeViewer TreeForGrid renderer (optimized for visible rows)
* OligoBatcchCalculator: show NaN if sequence is not valid
* Chem: tests
* PhyloTreeViewer: Bump version to publish npm
* Chem: bump version
* Bio: Bump version for dependencies and to publish npm
* Oauth setup
* #1161 transformation editor improvemrnts
* #1157 Order & hide dialog checkbox alignment
* Bio: fix manage libraries
* closes #1174 Can not select empty value colored data points in scatterplot
* #1119: moved out mutation cliffs calculation
* add clickhouse connector image
* Peptides: fixed multiple analysis starts
* GIS: colorcoding with data stored in cells
* Help | Visualize | Viewers | TreeViewer: Create documentation
* Help | Visualize | Viewers | Radar Chart: Create documentation
* closes #1186 Calculated columns dialog is too large in some cases (#1187)
* Dkryvchuk/add new col 2 (#1188)
* #1128 Order or hide dialog not working correctly in chrome
* (Bug) DG.Logger.audit fails with entity params
* JS: Introduce ObjectColumn class
* Packages: PowerPack: update viewer categories
* add to trellis look to js api
* Dkryvchuk/look trellisable (#1189)
* Packages: Charts: update help URLs
* Bio: fix if 0 libraries chosen
* Ability to set custom url for app
* Chem: test fix
* #1117: filtering out unimprotant clusters (naive)
* CI: Build dockerfiles for packages in GitHub Actions
* (Bug) Grid's Hamburger menu jumps around cursor when resizing columns
* Library gridext: Enabled pinned column resize functionality
* GIS: detectors optimization, colorcoding issue fixed
* (Bug) Parameterized Queries: Parameters with \{choices} not working
* bio lib: Calculate .alphabetSize tag on demand
* Closes #1171 Bio: enhance detectMacromolecule speed
* Library gridext: Bumping Up the library's version
* Select tooltip columns: ability to reorder columns (WIP)
* (Bug) Line chart | Overview: Exception if you select a column different from the one selected for display
* Package PowerGrid: Bumping Up the package's version
* (Bug) Queries: scalar queries do not work
* PowerPack: improved error message
* (Bug) Chem: molecules are not rendered if you open a file immediately after starting the platform
* ML: Missing Values Imputation: only show columns with missing values
* JS API: Added SurfacePlot to the list of known viewers
* ApiSamples: add SurfacePlot sample
* (Bug) Packages: if a package's detector.js is not loaded, the whole semantic type detection system stops working
* Packages: deactivate semantic type detector if it throws an error
* SequenceTranslator: remove errorExist flag
* #1077: Header WebLogo selection rendering
* Surface plot: datetime fix
* #1077: header WebLogo interactions
* #1077: fixed most potent residues viewer title
* #1117: rendering mode switch
* #1077: monomer-position viewer cell value color fix (WIP)
* Chem: refinements
* Peptides: settings dialog fix
* #1117: columns aggregation
* JS UI Test: Project Upload
* Remove delays in JS UI Tests  (WIP)
* Bio: Fix import from lib utils, bump version for dependencies and publish to npm
* (Bug) JS: prepare() takes linear time when column is a parameter
* Grok Spawner: Docker Swarm support
* Various issues with PC-PLOT (WIP)
* (Bug) Swagger: Incorrect default value parsing
* Peptides: stats calculation fix
* Peptides: logo monomer ordering fix
* Peptides: version 1.4.0
* Docs: Create Help pages for every provider
* #1155: substituent analysis viewer \- fixing bugs
* #1155: substituent analysis \- fixing bugs
* (Bug) Charts | Radar viewer: the wrong axis occurs
* (Bug) Charts | Radar viewer: doesn't respond to the column deletion in the grid
* (Bug) JS: check permissions method always returns true
* JS API Tests: connections: create, edit, delete, share
* Summary columns don't show after refreshing the page #930
* Issue #534: exposed TableQuery and DbTableQueryBuilder
* Issue #534: docs for TableQuery and DbTableQueryBuilder
* #534: TableQuery & DbTableQueryBuilder tests WIP
* #534: TableQuery & DbTableQueryBuilder tests & fixes WIP
* (Bug) Charts | Radar chart: 'Show All Rows' property issue
* (Bug) Charts | Radar viewer: toggling 'Show Min' and 'Show Max' issues
* RadarViewer: Updating init function
* RadarViewer: removing div id
* Datagrok Docker fail on errors during build
* GIS: filtering bug fixed, filtering optimization, few unit tests added
* JS-API: removed duplicate TableQuery class
* Meta: added ChemDraw
* Jenkins: CI: Add Skipped characteristic to junit tests converter
* Jenkins: CI: Upgrade tools in puppeteer image
* ST: triplex
* ST: reg fixes
* (Bug) Charts | Radar viewer: incorrectly displays negative values (WIP)
* Compute: renamed catalog feature
* (Bug) Charts | Radar viewer: the number of axes should be limited
* Charts: Added radar-viewer-test to package-test
* Resolves #1204 JS API: add Column.meta.format helper
* #1204 JS API: add Column.meta.format helper
* (Bug) Multiple Issues with Chem functionality in Grid
* JS API Tests: TableQuery: create, run (on different query types) (WIP)
* SequenceTranslator: parse dimer/triplex
* Semantic type detectors performance test
* SequenceTranslator: registration: icons instead of buttons, set row height
* UI Tests fixes
* GIS: code optimization, unit tests
* SequenceTranslator: refactoring with isOverhang function
* SequenceTranslator: move functions used in draw-svg to helpers
* bio lib: Add getAlphabet by name, fix NotationConverter.convertHelm, fix UnitsHandler separator property allowing
  undefined, bump version
* #1204 JS API: update Column.meta.format
* Lstolbov/biostructure/render (#1205)
* Meta: updated chemDraw package version
* Closes #1192 Bio: detectMacromolecule benchmark tests
* Bio: detectMacromolecule benchmark tests skipReason for FASTA notation tests
* Bio: skipReason for Bio.detectorsBenchmark.separatorDnaLong1e6Few50
* Fixed tests
* (Bug) JS: Functions.eval output skips toJs
* (Bug) JS: Fix undefined and null confusion in toJs
* JS: Dapi count() method
* Skipped tests
* add new form class
* Bio: Fix splitters and renderers tests, remove force Bio package init
* Test: CI: Skip External provider: small stress test
* Tests: Skip failing group tests
* Fixed categories
* (Bug) PowerPack: initTemplates() test does not work
* Utils: #466: added About menu item
* JKG: Feat: Upgrade components to the latest versions
* Heathchecks for basic images
* generate python requirements file
* Grok Compute: uograde python
* Exposed TableQuery and DbTableQueryBuilder methods
* Added missing extension
* SequenceTranslator: draw-svg: object with Y coordinates
* SequenceTranslator: filter instead of counter using for loop
* (Bug) Chem: Filters: when there are multiple molecule columns, all filters default to the first one
* #709 trying to preserve both state and column name
* Utils: #466: getAbout func updated
* Docker: CI: KyotoCabinet version based on python 3.8

## 2022-11-08 Dev build 1.8.3

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager
* (Bug) connection.shares.connection == null condition doesn't work
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Chem: #454 descriptors
* Chem: small fix
* Fixed package init
* Datlas: fixed project info retrieval
* #1000 viewport exists
* #1000 viewport apeears properly, style changed
* dialog cliptoscreen onresize
* #1000 bands
* Remove labs submodule
* (Bug) Custom context menu items for JS widgets and viewers cannot be registered via API
* (Bug) Dropbox provider doesn't work
* Chem: fix descriptors test
* Chem: #995 removing r-groups
* Chem: #454 compute side polishing
* Update API and public token
* (Bug) Proxy to docker container doesn't work
* Wiki: replace links
* (Bug) Package Credentials Editor doesn't work
* JS API: code cleanup and minor refactoring
* Histogram: reduced the marker size to 4 pixels
* Better wording
* PowerPack: testing \- WIP
* closes #1022 Tooltip: do not show value while using custom renderers
* closes 1021 matrix plot from layout
* JS API: Point.distanceTo, Rect.containsPoint
* dialog resizing before dom created fixwd
* Update beta users list
* (Bug) grok.shell.registerViewer fails
* Minor code cleanup
* (Bug) Ability to clone the connection (WIP)
* Grok Spawner: more information for every request in return
* Docs: devops docs
* closes #1001 matrix plot inner viewer settings
* JS API: update param type in Column.aggregate
* Grok Spawner: docker entrypoint script
* Chem: rgroups exclusion
* #1001 syncing tables in wrong place
* PowerGrid: version bump up
* Sketch View: update UI
* closes #657 line chart selectors with special symbols
* (Bug) Substructure Filter: Disabled if you drag the column to the filter
* closes #856 Chem: add molecule filter to a filter-group by default
* Packages: disable certain sources checks for non-webpack packages
* Chem: descriptors fixes
* (Bug) Method click() throws an exception when called for top menu item
* (Bug) JS: disable Uint8List convertion
* Implement a mechanism to test functions
* Hierarchical pipe-delimited info panels (example: Chembl | Substructure)
* Fixed #1029: File Manager: clicking the file in the Folder Tree doesn't trigger file preview in the main view
* JS: DataFrame.toByteArray method
* Harmonize membership editor
* Package content validation: check package properties' types
* (Bug) Scripts: Sample table does not open
* (Bug) __jsThen error during some packages init
* Docking: highlighting the separator
* Add a script to find internal links in help
* Add the function namespace to tests
* Grid: automatic format for small floats
* Chem: api fix
* (Bug) Grok Spawner: After image creation the container does not start
* CI: Add time spent to junit convertion script
* (Bug) Make loadKeyPair method more robust
* Package permissions fix
* Updated beta users list
* Merge 'master'
* CI: add jq to puppeteer image
* Dockerfiles: fixed container address retrieval
* update img
* Update img
* Docs: onboarding docs refactoring
* Grok Spawner: publish ports on local docker
* Test: mute failing tests
* Refactor Secret Manager connection
* (Bug) Core: MapInput cannot be added to a dialog for function parameters
* Grok Spawner: network properties in responses
* CI: Junit test results converter
* 1002 adds axes to matrix plot
* #1002 inner viewwer setting icon not merged
* Improve start mode selection
* Dockerfiles: get container port
* ##1042: Onboarding documentation: moved things around, minor cleanup
* CI: Add tests manually to junit reports
* Dashboard Projects (WIP)
* #1002 matrix plot axes code refactored
* CI: Convert JSON files to Junit reports
* CI: Add Rsync to pepputeer base image
* PowerGrid: version 1.1.2
* CI: Correct messages to jest tests failures
* Provided a hook to borrow Hamburger menu by external components
* #943 basic axes
* Removed grid column reset for Hamburger menu
* CI: Append timeout and evaluation errors to junit reports
* closes #953 Filters turned off status is not saved in layout
* CI: Include multiline stdout to Junit reports
* CI: Add author to Junit tests output
* JKG-Add-libmamba-to-conda-resolver-mechism
* Sketch View: remove the icon for adding viewers when the view is opened to edit a tooltip
* Docs: Access to servers using SSH
* Added exportable indices bounds for visible rows and columns
* Added xangle registration for export of visible rows and columns
* #943 3D scatter plot enhancements (log coordinates, some ui moments)
* Add new method (RangeSlider_SetShowHandles) \- need for on/off resize in slider
* fixes choice unput value not screened
* #closes 1075
* PropertyGrid editors: moved each editor to a separate file.
* Viewers: ability to pre-aggregate source DataFrame (WIP)
* (Bug) Scripting: JS Script fails, when contains more than 6 params
* (Bug) Can't share a folder from Home connection
* (Bug) Project duplicates Data Query name
* PC Plot: normalization mode
* PC Plot: auto-hide unused filters
* PC Plot: Show value axis when the scale is global
* RangeSlider: an option to not show the bar when the slider is expanded
* closes #1002 axes for trellis plot
* closes #1087 Use custom renderers with scatterplot label
* Core: add html2canvas library
* closes #1072 when context menu and column selector popup menus overlap, the click event triggers on the wrong menu
  item
* dpetrov/GitHub-1083 Made Actions closable in the Hamburger menu
* ColumnComboBox: not opening the drop-down part when right-clicked
* #943 use existing methods for axes tickmarks
* labels refactoring
* Dockerfile methods WIP
* Dockerfiles containerAddress fix
* DockerfilesClient proxyRequest method fix
* GH-863: Dockerfiles JS API update
* #1096 x axis fixed
* #1096 y labels fix
* Proper packages names
* (Bug) Package Entities Naming issues (WIP)
* (Bug) Script icon incorrect
* dpetrov/GitHub-1093 Added virtual columns support for grid's columns manager
* #1096 fixes multiple columns labels
* dpetrov/GitHub-1093 Minor fixes for the grid's columns manager
* Jenkins: Docs: Add Jenkins setup information
* Jenkins: Docs: Add password information for Jenkins
* (Bug) Query Transformation name issue
* #1098 add hittesting and selection to pc plot
* JS API: Custom inputs (WIP)
* dpetrov/GitHub-1104: Fixed returning null view field in ViewLayout object
* Merged in onuf/color-coding-update-bug (pull request #270)
* Group passwords (WIP)
* #601 PC plot improvements(add interactivity)
* #928 context menus
* 601 PC plot improvements(pc plot dies when transformation reset)
* #943 axes improvments
* Merged in onuf/color-coding-update-bug (pull request #273)
* update public token
* #943 issue with axes on otherinstances
* add Dmytro Nahovskyi to list
* (Bug) Right Click on the Grid's Row Header generates exception
* 1103 fixes filters in layout behavior
* change grok conneect version 1.5
* Update beta users table
* Charts: Radar: clarified property description
* Fix button styles
* Ability to load entitty from inactive package version
* MultiColumn Selector \- use subsets of columns when needed  (WIP)
* Error when serealizing df with virtual column
* Viewers: "General | Open in workspace" option
* Databases: groom the providers (WIP)
* User can't log in is login contains hyphens
* (Bug) Pinned Columns: row number column appears twice after layout application
* requirements.R default value for plsdepot has been returned
* buildx_docker_image.sh returned default value for cache_push (true)
* deploy/demo_db_clickhouse/demo_db_clickhouse:
  -f772192786c7f01c4f7afacfe68affa1dd2fe9a9-f772192786c7f01c4f7afacfe68affa1dd2fe9a9.docker.tar edited online with
  Bitbucket
* closes 1126 scatterPlot packed cats with no values
* #609 pc plot filter in aggr mode
* skip package filter test
* Simplified icon methods
* #943 3dscatterplot onload error sometimes
* (Bug) ColorPicker blinks in Chrome (WIP)
* Chem: remove substructure search from panel
* closes 1110 Viewers: legend cannot be resized again
* closes #1131 MultiColumn Selector: selects only columns filtered by search
* (Bug) Nginx: Add additional logging to investigate timeouts
* Docs: LE certificates remewal
* #1103 layout not saving
* (Bug) Grok Connect: the connection visibility
* Settings: mark instance as production (WIP)
* #943 3dscatterplot fix try
* Button alignment for form
* #609 aggregation mode for pc plot
* closes #1134 trellis plot viewer icon
* Introduce Viewer Serialization Context for saving layouts and projects
* (Bug) InfoPanels: Returning map or widget doesn't work
* Implement Logger (WIP)
* (Bug) Packages: Debug version duplicates release
* Careers section updates
* Fixed ORM test
* column manager checkwrong columns after reordering
* closes #776 Viewer legend is not synchronized with in-viewer filter
* update deploy.md
* JS: Icons support for JS Viewers
* #943 scrollbars should not appear
* closes 932 Vertical scrollbar is not working in Order or Hide Columns menu
* Fixed ambiguous column names
* Package functions: set helpUrl
* Removed debug code
* (Bug) Grid rollover disappears after applying filters or sort
* (Bug) Abnormal behavior when navigating grid by means of upwards arrow
* 1128 Order and hide columns dialog isues part 1
* Adding pinned rows to Grid viewer (WIP)
* 709 filters sync in different views case 1, 2
* ORM: FuncCall visibility should depend on Func visibility (WIP)
* Fixed syntax error
* Fixed analyzer warning
* add images to provider conneectors
* fix image sizes for added connectoin images
* (Bug) Simplify the chain for ViewerSerializationContext
* 1128 order or hide dialog(move top move bottom)
* closes 709 filterpanel sync (case with closing filter in different layout)
* #709 dont close filters menu, just reset them
* Context menu commands: update conditions for JsViewers
* #1110 legend cats count incorrect
* closes #643 regression lines in log mode, r2 value
* Merged in onuf/1148-color-coding-extended-ui (pull request #282)
* closes #1156 filter bitset is reset after adding new column
* closes #1157 show visible only mode in Order and hide dialog
* Chem: descriptors dlg fix
* created missing indexes
* #709 #643 minor improvments
* Added the SPGI demo dataset
* #1125 add methods for getting value color into ColumnColorHelper
* Release of Pinned Rows
* Reorder Columns Dialog: improved a tooltip
* HomeView: got rid of unused code
* Got rid of debug printout
* Added missing files
* Resolves #1071 Color coding menu and dialog is not properly initialised after re-applying layout
* closes #1126 scatterplot packed cats with sparse columns
* Added AppEvents.isProjectPublishing property
* TrellisPlot: code cleanup
* Grid: fix #1130: No tooltip on column header if column is too narrow
* DataFrameViewer: add onDataFrameChanged event
* #1148 Color coding: Disable the context menu command instead of error message when coloring type is not applicable
* fix #1083: Grid: Popup Dialog from hamburger menu stays after the column is deleted
* fix #805: Grid: Change column type \- some strange appearance
* closes #1161 Transformation Editor: use column selector instead of popup menus
* add property changed stream to interop
* (Bug) Files: Windows shares don't work
* (Bug) Files: Harmonize credentials editing (WIP)
* closes 1167 zoom slider with specific data
* GitHub 1159 Enable Grid column context menu in Pinned columns
* 1157 Order & hide dialog checkbox replaced woth select
* 1161 transformation editor improvemrnts
* Fixed null pointer exception
* Fixed attirbute exception

## 2022-11-02 Dev build 1.8.2

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager
* (Bug) connection.shares.connection == null condition doesn't work
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Chem: #454 descriptors
* Chem: small fix
* Fixed package init
* Datlas: fixed project info retrieval
* #1000 viewport exists
* #1000 viewport apeears properly, style changed
* dialog cliptoscreen onresize
* #1000 bands
* Remove labs submodule
* (Bug) Custom context menu items for JS widgets and viewers cannot be registered via API
* (Bug) Dropbox provider doesn't work
* Chem: fix descriptors test
* Chem: #995 removing r-groups
* Chem: #454 compute side polishing
* Update API and public token
* (Bug) Proxy to docker container doesn't work
* Wiki: replace links
* (Bug) Package Credentials Editor doesn't work
* JS API: code cleanup and minor refactoring
* Histogram: reduced the marker size to 4 pixels
* Better wording
* PowerPack: testing \- WIP
* closes #1022 Tooltip: do not show value while using custom renderers
* closes 1021 matrix plot from layout
* JS API: Point.distanceTo, Rect.containsPoint
* dialog resizing before dom created fixwd
* Update beta users list
* (Bug) grok.shell.registerViewer fails
* Minor code cleanup
* (Bug) Ability to clone the connection (WIP)
* Grok Spawner: more information for every request in return
* Docs: devops docs
* closes #1001 matrix plot inner viewer settings
* JS API: update param type in Column.aggregate
* Grok Spawner: docker entrypoint script
* Chem: rgroups exclusion
* #1001 syncing tables in wrong place
* PowerGrid: version bump up
* Sketch View: update UI
* closes #657 line chart selectors with special symbols
* (Bug) Substructure Filter: Disabled if you drag the column to the filter
* closes #856 Chem: add molecule filter to a filter-group by default
* Packages: disable certain sources checks for non-webpack packages
* Chem: descriptors fixes
* (Bug) Method click() throws an exception when called for top menu item
* (Bug) JS: disable Uint8List convertion
* Implement a mechanism to test functions
* Hierarchical pipe-delimited info panels (example: Chembl | Substructure)
* Fixed #1029: File Manager: clicking the file in the Folder Tree doesn't trigger file preview in the main view
* JS: DataFrame.toByteArray method
* Harmonize membership editor
* Package content validation: check package properties' types
* (Bug) Scripts: Sample table does not open
* (Bug) __jsThen error during some packages init
* Docking: highlighting the separator
* Add a script to find internal links in help
* Add the function namespace to tests
* Grid: automatic format for small floats
* Chem: api fix
* (Bug) Grok Spawner: After image creation the container does not start
* CI: Add time spent to junit convertion script
* (Bug) Make loadKeyPair method more robust
* Package permissions fix
* Updated beta users list
* Merge 'master'
* CI: add jq to puppeteer image
* Dockerfiles: fixed container address retrieval
* update img
* Update img
* Docs: onboarding docs refactoring
* Grok Spawner: publish ports on local docker
* Test: mute failing tests
* Refactor Secret Manager connection
* (Bug) Core: MapInput cannot be added to a dialog for function parameters
* Grok Spawner: network properties in responses
* CI: Junit test results converter
* 1002 adds axes to matrix plot
* #1002 inner viewwer setting icon not merged
* Improve start mode selection
* Dockerfiles: get container port
* ##1042: Onboarding documentation: moved things around, minor cleanup
* CI: Add tests manually to junit reports
* Dashboard Projects (WIP)
* #1002 matrix plot axes code refactored
* CI: Convert JSON files to Junit reports
* CI: Add Rsync to pepputeer base image
* PowerGrid: version 1.1.2
* CI: Correct messages to jest tests failures
* Provided a hook to borrow Hamburger menu by external components
* #943 basic axes
* Removed grid column reset for Hamburger menu
* CI: Append timeout and evaluation errors to junit reports
* closes #953 Filters turned off status is not saved in layout
* CI: Include multiline stdout to Junit reports
* CI: Add author to Junit tests output
* JKG-Add-libmamba-to-conda-resolver-mechism
* Sketch View: remove the icon for adding viewers when the view is opened to edit a tooltip
* Docs: Access to servers using SSH
* Added exportable indices bounds for visible rows and columns
* Added xangle registration for export of visible rows and columns
* #943 3D scatter plot enhancements (log coordinates, some ui moments)
* Add new method (RangeSlider_SetShowHandles) \- need for on/off resize in slider
* fixes choice unput value not screened
* #closes 1075
* PropertyGrid editors: moved each editor to a separate file.
* Viewers: ability to pre-aggregate source DataFrame (WIP)
* (Bug) Scripting: JS Script fails, when contains more than 6 params
* (Bug) Can't share a folder from Home connection
* (Bug) Project duplicates Data Query name
* PC Plot: normalization mode
* PC Plot: auto-hide unused filters
* PC Plot: Show value axis when the scale is global
* RangeSlider: an option to not show the bar when the slider is expanded
* closes #1002 axes for trellis plot
* closes #1087 Use custom renderers with scatterplot label
* Core: add html2canvas library
* closes #1072 when context menu and column selector popup menus overlap, the click event triggers on the wrong menu
  item
* dpetrov/GitHub-1083 Made Actions closable in the Hamburger menu
* ColumnComboBox: not opening the drop-down part when right-clicked
* #943 use existing methods for axes tickmarks
* labels refactoring
* Dockerfile methods WIP
* Dockerfiles containerAddress fix
* DockerfilesClient proxyRequest method fix
* GH-863: Dockerfiles JS API update
* #1096 x axis fixed
* #1096 y labels fix
* Proper packages names
* (Bug) Package Entities Naming issues (WIP)
* (Bug) Script icon incorrect
* dpetrov/GitHub-1093 Added virtual columns support for grid's columns manager
* #1096 fixes multiple columns labels
* dpetrov/GitHub-1093 Minor fixes for the grid's columns manager
* Jenkins: Docs: Add Jenkins setup information
* Jenkins: Docs: Add password information for Jenkins
* (Bug) Query Transformation name issue
* #1098 add hittesting and selection to pc plot
* JS API: Custom inputs (WIP)
* dpetrov/GitHub-1104: Fixed returning null view field in ViewLayout object
* Merged in onuf/color-coding-update-bug (pull request #270)
* Group passwords (WIP)
* #601 PC plot improvements(add interactivity)
* #928 context menus
* 601 PC plot improvements(pc plot dies when transformation reset)
* #943 axes improvments
* Merged in onuf/color-coding-update-bug (pull request #273)
* update public token
* #943 issue with axes on otherinstances
* add Dmytro Nahovskyi to list
* (Bug) Right Click on the Grid's Row Header generates exception
* 1103 fixes filters in layout behavior
* change grok conneect version 1.5
* Update beta users table
* Charts: Radar: clarified property description
* Fix button styles
* Ability to load entitty from inactive package version
* MultiColumn Selector \- use subsets of columns when needed  (WIP)
* Error when serealizing df with virtual column
* Viewers: "General | Open in workspace" option
* Databases: groom the providers (WIP)
* User can't log in is login contains hyphens
* (Bug) Pinned Columns: row number column appears twice after layout application
* requirements.R default value for plsdepot has been returned
* buildx_docker_image.sh returned default value for cache_push (true)
* deploy/demo_db_clickhouse/demo_db_clickhouse:
  -f772192786c7f01c4f7afacfe68affa1dd2fe9a9-f772192786c7f01c4f7afacfe68affa1dd2fe9a9.docker.tar edited online with
  Bitbucket
* closes 1126 scatterPlot packed cats with no values
* #609 pc plot filter in aggr mode
* skip package filter test
* Simplified icon methods
* #943 3dscatterplot onload error sometimes
* (Bug) ColorPicker blinks in Chrome (WIP)
* Chem: remove substructure search from panel
* closes 1110 Viewers: legend cannot be resized again
* closes #1131 MultiColumn Selector: selects only columns filtered by search
* (Bug) Nginx: Add additional logging to investigate timeouts
* Docs: LE certificates remewal
* #1103 layout not saving
* (Bug) Grok Connect: the connection visibility
* Settings: mark instance as production
* #943 3dscatterplot fix try
* Button alignment for form
* #609 aggregation mode for pc plot
* closes #1134 trellis plot viewer icon
* Introduce Viewer Serialization Context for saving layouts and projects
* (Bug) InfoPanels: Returning map or widget doesn't work
* Implement Logger (WIP)
* (Bug) Packages: Debug version duplicates release
* Careers section updates
* Fixed ORM test
* column manager checkwrong columns after reordering
* closes #776 Viewer legend is not synchronized with in-viewer filter
* update deploy.md
* JS: Icons support for JS Viewers
* #943 scrollbars should not appear
* closes 932 Vertical scrollbar is not working in Order or Hide Columns menu
* Fixed ambiguous column names
* Package functions: set helpUrl
* Removed debug code
* ORM: FuncCall visibility should depend on Func visibility (WIP)
* #1110 legend cats count incorrect
* add images for connector

## 2022-10-19 Dev build 1.8.0

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager
* (Bug) connection.shares.connection == null condition doesn't work
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Chem: #454 descriptors
* Chem: small fix
* Fixed package init
* Datlas: fixed project info retrieval
* #1000 viewport exists
* #1000 viewport apeears properly, style changed
* dialog cliptoscreen onresize
* #1000 bands
* Remove labs submodule
* (Bug) Custom context menu items for JS widgets and viewers cannot be registered via API
* (Bug) Dropbox provider doesn't work
* Chem: fix descriptors test
* Chem: #995 removing r-groups
* Chem: #454 compute side polishing
* Update API and public token
* (Bug) Proxy to docker container doesn't work (WIP)
* Wiki: replace links
* (Bug) Package Credentials Editor doesn't work
* JS API: code cleanup and minor refactoring
* Histogram: reduced the marker size to 4 pixels
* Better wording
* PowerPack: testing \- WIP
* closes #1022 Tooltip: do not show value while using custom renderers
* closes 1021 matrix plot from layout
* JS API: Point.distanceTo, Rect.containsPoint
* dialog resizing before dom created fixwd
* Update beta users list
* (Bug) grok.shell.registerViewer fails
* Minor code cleanup
* (Bug) Ability to clone the connection (WIP)
* Grok Spawner: more information for every request in return
* Docs: devops docs
* closes #1001 matrix plot inner viewer settings
* JS API: update param type in Column.aggregate
* Grok Spawner: docker entrypoint script
* Chem: rgroups exclusion
* #1001 syncing tables in wrong place
* PowerGrid: version bump up
* Sketch View: update UI
* closes #657 line chart selectors with special symbols
* (Bug) Substructure Filter: Disabled if you drag the column to the filter
* closes #856 Chem: add molecule filter to a filter-group by default
* Packages: disable certain sources checks for non-webpack packages
* Chem: descriptors fixes
* (Bug) Method click() throws an exception when called for top menu item
* (Bug) JS: disable Uint8List convertion
* Implement a mechanism to test functions
* Hierarchical pipe-delimited info panels (example: Chembl | Substructure)
* Fixed #1029: File Manager: clicking the file in the Folder Tree doesn't trigger file preview in the main view
* JS: DataFrame.toByteArray method
* Harmonize membership editor
* Package content validation: check package properties' types
* (Bug) Scripts: Sample table does not open
* (Bug) __jsThen error during some packages init
* Docking: highlighting the separator
* Add a script to find internal links in help
* Add the function namespace to tests
* Grid: automatic format for small floats
* Chem: api fix
* (Bug) Grok Spawner: After image creation the container does not start
* CI: Add time spent to junit convertion script
* (Bug) Make loadKeyPair method more robust
* Package permissions fix
* Updated beta users list
* Merge 'master'
* CI: add jq to puppeteer image
* Dockerfiles: fixed container address retrieval
* update img
* Update img
* Docs: onboarding docs refactoring
* Grok Spawner: publish ports on local docker
* Test: mute failing tests
* Refactor Secret Manager connection
* (Bug) Core: MapInput cannot be added to a dialog for function parameters
* Grok Spawner: network properties in responses
* CI: Junit test results converter
* 1002 adds axes to matrix plot
* #1002 inner viewwer setting icon not merged
* Improve start mode selection
* Dockerfiles: get container port (WIP)
* ##1042: Onboarding documentation: moved things around, minor cleanup
* CI: Add tests manually to junit reports
* Dashboard Projects (WIP)
* #1002 matrix plot axes code refactored
* CI: Convert JSON files to Junit reports
* CI: Add Rsync to pepputeer base image
* PowerGrid: version 1.1.2
* CI: Correct messages to jest tests failures
* Provided a hook to borrow Hamburger menu by external components
* #943 basic axes
* Removed grid column reset for Hamburger menu
* CI: Append timeout and evaluation errors to junit reports
* closes #953 Filters turned off status is not saved in layout
* CI: Include multiline stdout to Junit reports
* CI: Add author to Junit tests output
* JKG-Add-libmamba-to-conda-resolver-mechism
* Sketch View: remove the icon for adding viewers when the view is opened to edit a tooltip
* Docs: Access to servers using SSH
* Added exportable indices bounds for visible rows and columns
* Added xangle registration for export of visible rows and columns
* #943 3D scatter plot enhancements (log coordinates, some ui moments)
* Add new method (RangeSlider_SetShowHandles) \- need for on/off resize in slider
* fixes choice unput value not screened
* #closes 1075
* PropertyGrid editors: moved each editor to a separate file.
* Viewers: ability to pre-aggregate source DataFrame (WIP)
* (Bug) Scripting: JS Script fails, when contains more than 6 params
* (Bug) Can't share a folder from Home connection
* (Bug) Project duplicates Data Query name
* PC Plot: normalization mode
* PC Plot: auto-hide unused filters
* PC Plot: Show value axis when the scale is global
* RangeSlider: an option to not show the bar when the slider is expanded
* closes #1002 axes for trellis plot
* closes #1087 Use custom renderers with scatterplot label
* Core: add html2canvas library
* closes #1072 when context menu and column selector popup menus overlap, the click event triggers on the wrong menu
  item
* dpetrov/GitHub-1083 Made Actions closable in the Hamburger menu
* ColumnComboBox: not opening the drop-down part when right-clicked
* #943 use existing methods for axes tickmarks
* labels refactoring
* Dockerfile methods WIP
* Dockerfiles containerAddress fix
* DockerfilesClient proxyRequest method fix
* GH-863: Dockerfiles JS API update
* #1096 x axis fixed
* #1096 y labels fix
* Proper packages names
* (Bug) Package Entities Naming issues (WIP)
* (Bug) Script icon incorrect
* dpetrov/GitHub-1093 Added virtual columns support for grid's columns manager
* #1096 fixes multiple columns labels
* dpetrov/GitHub-1093 Minor fixes for the grid's columns manager
* Jenkins: Docs: Add Jenkins setup information
* Jenkins: Docs: Add password information for Jenkins
* (Bug) Query Transformation name issue
* #1098 add hittesting and selection to pc plot
* JS API: Custom inputs (WIP)
* dpetrov/GitHub-1104: Fixed returning null view field in ViewLayout object
* Merged in onuf/color-coding-update-bug (pull request #270)
* Group passwords (WIP)
* #601 PC plot improvements(add interactivity)
* #928 context menus
* 601 PC plot improvements(pc plot dies when transformation reset)
* #943 axes improvments
* Merged in onuf/color-coding-update-bug (pull request #273)
* update public token
* #943 issue with axes on otherinstances
* add Dmytro Nahovskyi to list
* (Bug) Right Click on the Grid's Row Header generates exception (WIP)
* 1103 fixes filters in layout behavior
* change grok conneect version 1.5
* Update beta users table
* Charts: Radar: clarified property description
* Fix button styles
* Ability to load entitty from inactive package version
* MultiColumn Selector \- use subsets of columns when needed  (WIP)
* Error when serealizing df with virtual column
* Viewers: "General | Open in workspace" option
* Databases: groom the providers (WIP)
* User can't log in is login contains hyphens
* (Bug) Pinned Columns: row number column appears twice after layout application (WIP)
* requirements.R default value for plsdepot has been returned
* buildx_docker_image.sh returned default value for cache_push (true)
* deploy/demo_db_clickhouse/demo_db_clickhouse:
  -f772192786c7f01c4f7afacfe68affa1dd2fe9a9-f772192786c7f01c4f7afacfe68affa1dd2fe9a9.docker.tar edited online with
  Bitbucket
* closes 1126 scatterPlot packed cats with no values
* #609 pc plot filter in aggr mode
* skip package filter test
* (Bug) ColorPicker blinks in Chrome (WIP)

## 2022-10-06 Dev build 1.6.12

* closes #953 Filters turned off status is not saved in layout

## 2022-09-15 Dev build 1.6.11

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager
* (Bug) connection.shares.connection == null condition doesn't work
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager (WIP)
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns (WIP)
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Chem: #454 descriptors
* Chem: small fix
* Fixed package init
* Datlas: fixed project info retrieval
* #1000 viewport exists
* #1000 viewport apeears properly, style changed
* dialog cliptoscreen onresize
* #1000 bands
* Remove labs submodule
* (Bug) Custom context menu items for JS widgets and viewers cannot be registered via API
* (Bug) Dropbox provider doesn't work
* Chem: fix descriptors test
* Chem: #995 removing r-groups
* Chem: #454 compute side polishing
* Update API and public token
* (Bug) Proxy to docker container doesn't work (WIP)
* Wiki: replace links
* (Bug) Package Credentials Editor doesn't work
* JS API: code cleanup and minor refactoring
* Histogram: reduced the marker size to 4 pixels
* Better wording
* PowerPack: testing \- WIP
* closes #1022 Tooltip: do not show value while using custom renderers
* closes 1021 matrix plot from layout
* JS API: Point.distanceTo, Rect.containsPoint
* dialog resizing before dom created fixwd
* Update beta users list
* (Bug) grok.shell.registerViewer fails
* Minor code cleanup
* (Bug) Ability to clone the connection (WIP)
* Grok Spawner: more information for every request in return
* Docs: devops docs
* closes #1001 matrix plot inner viewer settings
* JS API: update param type in Column.aggregate
* Grok Spawner: docker entrypoint script
* Chem: rgroups exclusion
* #1001 syncing tables in wrong place
* PowerGrid: version bump up
* Sketch View: update UI
* closes #657 line chart selectors with special symbols
* (Bug) Substructure Filter: Disabled if you drag the column to the filter
* closes #856 Chem: add molecule filter to a filter-group by default
* Packages: disable certain sources checks for non-webpack packages
* Chem: descriptors fixes
* (Bug) Method click() throws an exception when called for top menu item
* (Bug) JS: disable Uint8List convertion
* Hierarchical pipe-delimited info panels (example: Chembl | Substructure)
* Fixed #1029: File Manager: clicking the file in the Folder Tree doesn't trigger file preview in the main view
* JS: DataFrame.toByteArray method
* Harmonize membership editor
* Package content validation: check package properties' types
* (Bug) Scripts: Sample table does not open
* Migrate Chem tests from ApiTests to Chem package
* SequenceTranslator: fix validation corner case
* (Bug) __jsThen error during some packages init
* #1014: Monomer cell renderer fix
* Peptides: cleanup
* Peptides: fixed Mutation Cliffs cell colors
* Bio: using grok.shell.tv for splitToMonomers
* Peptides: renamed filterting-statistics to statistics
* Peptides: renamed constant
* Peptides: moved gridCellValidation function
* Peptides: renamed grid cell validation function
* #731: Chem \- sketcher tests
* Docking: highlighting the separator
* Bio: #970 fingerprints
* Add a script to find internal links in help

## 2022-09-08 Dev build 1.6.9

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* Scatterplot compact view
* add compact view to scatterplot 1.0
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager (WIP)
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns (WIP)
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Fixed package init
* (Bug) Package Credentials Editor doesn't work (WIP)
* Better wording
* (Bug) grok.shell.registerViewer fails
* Test: Skip Grok Compute tests because of compatility

## 2022-09-07 Dev build 1.6.8

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager (WIP)
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* Funcs: JS-based context functions for multiple columns (WIP)
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Possible NPE fix
* Deprecated old tests
* Fixed package init
* added share-the-folder.gif
* JS API: add stats enums
* JS API: document Column.aggregate
* bio lib: move ntseq from removed Sequence
* Sequence: Remove
* Wiki: replace links
* Moved Markdown.md to Datagrok folder
* Chem: code cleanup and minor refactoring
* JS API: code cleanup and minor refactoring
* PowerPack: testing \- WIP
* PowerGrid: a sample that demonstrates adding sparklines programmatically
* GIS: midterm commit \- detectors, working with census
* PowerGrid: small fix, moved constants to separate variables
* (Bug) Package Credentials Editor doesn't work (WIP)
* Better wording

## 2022-09-06 Dev build 1.6.7

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* #969 forrula-lines vert lines
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager (WIP)
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* JS API: correct return type for viewer.getOptions
* #953: Filters turned off status is not saved in layout
* #966: Deleted column filter should not be filtered on
* #969 new classes system ,aybe should be reworked
* Change order of interop type checks
* #969 linechart hittest
* closes #996 Tooltip not working for partly truncated values
* #864: splitToMonomers function
* Issue #976 Chem: elemental analysis code refactoring
* Issue #976: Chem: elemental analysis (add conversion from smiles to molblock)
* Funcs: JS-based context functions for multiple columns (WIP)
* JS API: Point.distanceTo(p)
* JS API: More documentation
* JS API: InputBase: addCaption, addPostfix, addOptions, setTooltip now return InputBase (useful for call chaining)
* (Bug) ColumnsInput: number of selected columns is not shown upon construction
* JS API: GridColumn.move method
* JS API: documentation
* closes #1015: PowerGrid: Sparklines: Ability to add sparklines from the "Actions" pane for selected columns
* JS API: GridColumn.scrollIntoView, RangeSlider.scrollBy, RangeSlider.scrollTo
* PowerGrid: Sparklines: accessing settings from the hamburger menu
* #930: PowerGrid: sparklines: ability to rename and remove summary columns
* #930: PowerGrid: sparklines: not including datatime columns by default
* #930: PowerGrid: sparklines: managing column order
* #930: PowerGrid: sparklines: setting the sparkline column as a current object after it is created
* Test utils
* Possible NPE fix
* Deprecated old tests
* Fixed package init

## 2022-09-01 Dev build 1.6.6

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* Reversed wrong commit
* Public token
* Chem #995: clean up -Similarity
* Chem #995: open phacts clean up
* Enable saving multiple credentials in credential manager (WIP)
* Fixed logout
* Docs: Alllow askalkin@datagrok.ai to view encrypted files
* (Bug) JS: grok.functions.call doesn't handle error
* Bio: Fix typing for grok.functions and RDKit interfaces, fix WebLogo-positions tests

## 2022-08-30 Dev build 1.6.5

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Docker: Datagrok ca-certficates
* Fixed files API
* CI: Add Alexey Chopovsky to beta users
* Docker: Remove elastic from datagrok
* Docs: Upgrade docker instructions with certificates
* PowerGrid: bumped up version to 1.1.0
* Wiki: edited test manager documentation
* SequenceTranslator: outdated SMILES tests commented
* Bio: Add performance tests
* OligoBatchCalculator: outdated validation tests commented
* DevTools: update dev panel tests
* ClinicalCase: updated README
* ClinicalCase: corected typo
* ClinicalCase: resized image in README
* Reversed wrong commit
* Public token

## 2022-08-29 Dev build 1.6.4

* com
* Fix default value for select (choice) (remove '' and "" from string when chosen default value)
* Implement setRawData for bool columns
* render mols vertically on scatterplot x axis
* lrellis plot not working in LS
* Fixed the method for default choices
* delete useless prints
* bar chart slider positioning
* Grok Spawner: fix default value for GrokSpawnerAddress
* Make modals resizable
* Legends Resizing
* closes #810 Reordered selected columns
* add started/finished/author to funccall
* Layouts | Save to gallery: newly saved layout should appear in the property panel
* Layouts pane: ability to put the layout on the property panel
* CI: Deploy process documentation
* closes #798 selecting dots in jittered scatterplot
* #828 formula lines modal fixed
* #828 order/hide dialog rewworked
* #828 make modal not resizable by default
* JS API: ui.fileBrowser
* Work in progress.
* #831: HitTriage: work in progress
* Moved InputBase descendants to separate files.
* AppEvents.onInputCreated global event
* Ability to reuse database browser, and specify how results are interpreted
* Table Input: ability to get table by executing a database query
* Docs: Publish version from dev to Docker Hub
* Datlas: queue interaction for Grok Connect (WIP)
* Docker image for packages tests
* add compact view to scatterplot 1.0
* Scatterplot compact view
* JS API: View.statusBarPanels (WIP)
* (Bug) Grok connect: decimal, real, and double tests failed
* Grok connect: refactoring of numeric type tests
* JS: UI Forms harmonization (WIP)
* (Bug) Failed to delete package
* DB Indexes
* Fixed filename
* Fixed CSS
* Added a demo dataset with image urls
* PowerGrid: help on linked images
* JS UI Test: Scripting in Add new column (WIP)
* Functions: show function class instead of null in status bar
* Grok connect: refactoring of numeric type tests
* DataFrame.setTag(...) now returns this.
* Renderers: ability to specify column tags as conditions (WIP)
* adds menu click method
* modal click simulation method adjustment
* Datlas connections leaking investigation (WIP)
* Datlas: remove trailing ; in the row checking query
* JS API: Menu.click method
* #831: HitTriage: work in progress \- refactoring
* closes #800 Form does not work after filtering
* Introduced Entity.package Implemented safe delete New permissions check Derived properties support in ORM
* Introduced Entity.package
* GH-686: TreeView events
* modal placement, dont leave page on backspace
* GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Fixed deadlock in exchangeDevKey method
* CSS fixes
* Introduced Entity.package, reviewed Entities list
* Introduced Entity.package, introduced PackageEntityMixin
* Autogenerated code
* Speed-up FilesView start
* Fixed analyzer warnings
* Fixed package.functions section exception
* closes #791 Can not uncheck "Filter out missing values" after saving
* Fixed wrong naming on package deploy
* Removed vis.js from autostart
* Async external connectors fetch
* Speed-up DG start
* FilesView: fix file appearance bug in the card view
* Introduced Entity.package, bugfixes
* Fixed possible NPE
* JS API: BigInt support
* closes #857 Deselection in the scatter plot
* Fixed author parsing
* Package content validation: improve the up-to-date package bundle check
* Fixed tableInput icons
* closes #859 3D scatter plot: implement saving to .png
* Updated beta users
* Tested renderer selection by multiple tags (works fine)
* (Bug) Integration tests: Fix all northwinds for 'External provider: test all Northwinds' test
* refactor: configuration files
* Docs: fix documentation links
* Public submodule
* Add delete FuncCall api
* PackagesView installed filter
* CSS harmonization
* Introduced EntityType.isPackageEntity field
* Fixes #923: Grid: Order or hide columns: provide "move to the top" / "move to the bottom" buttons
* Viewer-specific tooltips (WIP)
* Min() and Max() are not compatible with date and datetime columns #689
* Fixed tests
* removed debug lines
* #closes 858 Cell as an input for widget
* (Bug) FilesView: dock manager exception on opening
* Setup fixes
* Update doc for proxy
* Better transaction management
* Added debug lines
* Some packages not publishing fix
* Removed debug printout
* Add save as png to all viewers
* (Bug) Connection is cloned on sharing
* Reverted GitHub-854 Provided a fix for Modal dialog to consume mouse events
* Dialog: fixed a bug with the resizing
* Grid: Fixed an issue with bool cell renderer
* dapi.files: fixed a bug by reverting to the lazy initialization. Code cleanup.
* fixed: ColumnsInput: an exception when checkedColumns is not specified
* js-api update
* (Bug) Server push is sent twice
* (Bug) Row.setValues doesn't fire onDataChanged event
* Removed debug lines
* Add exceljs to sources
* DateTime scalar functions harmonization
* Fixed shell test
* PowerPack: build fix
* Input fixes, and new disabled styles
* Fixed scalar functions null behavior
* Fixed logical functions in Chrome
* Introduce DateInput with dayjs support
* Fixed deploy exception
* Fixed label css
* (Bug) ScatterPlot: Top and Bottom legend position cuts labels
* (Bug) Selection doesn't work when jitter activated
* ML | Random Data doesn't work ML | Missing Values Imputation doesn't work
* CSS fix
* Fixed dapi and ml tests
* Possible NPE fixed
* Scatterplot 3d detach method
* dapi.root
* View close fixed
* Updated public
* Test: setUpAll and tearDownAll with groups for integration tests
* Test: Skip tests which fail everytime
* Added JS wrapper for EntityRecord
* Packed categories zoom by filter
* package_id migration tuning
* Fixed user login error
* (Bug) FilesUploader: ?layout parameter doesn't work
* CI: Sofiia Podolskaia in beta users
* Test: Use custom session token for integration tests Load session token for integration tests from environment
  variable GROK_SESSION_TOKEN As a fallback value the old session token unit_test_token will be used
* Refactor: Complete refactoring of deploy folder Deprecate old scripts
* Test: File with environment variables for local tests
* GH-954: expanded accessor for TreeViewGroup
* (Bug) Integration tests: External provider (WIP)
* Docs: Instructions to run datlas tests locally on local custom stand
* Test: Add group for all integration tests Fix integration tests which were failing because of session
* closes #936 pie chart improvments
* Test: Add testDevKey config option for docker stands
* Update background for macromolecules
* Test: fix Missing Values Imputation: k-Nearest Neighbour Imputation
* Fixed Datlas tests
* Reverted incorrect fixes
* GH-965: TreeViewGroup.group now also accepts Element
* closes #961 gray out unused categories instead of not showing them
* (Bug) ScatterPlot: Categories rendering issue
* closes #962 Save as PNG: not all elements are added to image
* closes 790 Reset filter doesn't work on "Filter out missing values"
* add button style
* closes #963 Continuous selection on shift+click
* CI: Add short commit to docker image
* Test: Fix Datlas tests
* Load package before loading tests
* Balloons: add the "X" icon
* closes interfaces generation
* (Bug) When user shares an entity from package package is shared too
* Chem harmonization (WIP)
* closes 935 treemap improvments
* Chem: fix fingerprints
* PC Plot: collaborative filtering
* Test: Increase timeout for datlas tests
* (Bug) Packages permission check doesn't work
* closes 935 with all rowSource modes
* closes 945 Line chart: ability to hide and make semi-transparent lines
* FilesView: add the "Add new share" ribbon icon and link below the tree
* FilesView: 'refresh' icon
* CI: Docker Buildx services auto list
* CI: Docker Demo Chembl DB
* CI: Docker Buildx target
* CI: Create test_numeric_types table for external_provider_test
* Test: Increase timeout for Dataset Client: Projects: CRUD: Remove
* Test: Increase timeout for Datlas tests
* Integration tests: datetime test
* Line chart: add tooltips in multiaxis mode
* New FontAwesome version
* Fixed css
* Fix bakcground styles, for macromolecules page
* Chem: restoring sim search, add indeces
* code fix for #935 treemap improvments
* Pipe file downloads
* Folder sharing (WIP)
* Ask credentials on file share open
* Minor style changes
* Sketch View: add the reset button
* JS API: Grid.sortByColumns, Grid.sortTypes
* Chem: fix for similarity search
* Grok connect: performance test (select 1)
* Integration tests: refactor external_provider_perf_test
* Fixed AD login
* GH-955: subDir and share methods
* GH-955: js api update
* (Bug) Files: Unable to open context menu for files in explorer view
* Credentials Manager (WIP)
* (Bug) connection.shares.connection == null condition doesn't work (WIP)
* BarChart: support additive functions 'unique', 'missing value count' and 'value count' in stacked mode (WIP)
* Bio: Optimized renderer, added sampling
* Docker: Datagrok ca-certficates

## 2022-07-18 Dev build 1.5.1

* resizing on right side
* Fixed admin session
* Ability to save favorites for groups
* Grok connect: stress test
* Wiki: macromolecules: harmonization & cleanup
* #10933legends almost work in any position
* #10933 resdrawing legend while dragging
* closes #10933 delete comments and redraw list on setData
* vertical legend maxheight
* generate comments for ts interfaces
* JS API: add optional tooltip check to InputBase.setTooltip
* (Bug) Packages: settings editor doesn't update package properties
* #718 Custom categorical columns sort order in not reflected on plots after page reload
* GitHub #777: exposed DataConnection query method
* closes #10938 Make modals resizable
* StatusBar improvements
* (Bug) JS: ViewBase.basePath doesn't work
* xamgle.lock
* closes #10935 FlexboxLayout should not add extra divs
* recloses #756 bar chart zoom slider visibility
* Grok Spawner port
* CI: Fix all integration tests for any environment
* #424 fixed x axis log availability
* #756 dont show slider asap viewer created
* Deploy docker images
* Cleanup in beta users
* Documentation
* Public token
* Docker buildx release condition
* Docker Datagrok: Set Grok Connect directory
* Scripting: Support async in JS
* Better styling
* Harmonize functions processing
* Ability to disable NPM
* Fixed analyzer warnings
* Updated public token
* Speedup packages view
* Code format
* Lib bio: notation-converter and web-logo minor corrections

## 2022-07-15 Dev build 1.5.0

* resizing on right side
* Fixed admin session
* Ability to save favorites for groups
* Grok connect: stress test
* Wiki: macromolecules: harmonization & cleanup
* #10933legends almost work in any position
* #10933 resdrawing legend while dragging
* closes #10933 delete comments and redraw list on setData
* vertical legend maxheight
* generate comments for ts interfaces
* JS API: add optional tooltip check to InputBase.setTooltip
* (Bug) Packages: settings editor doesn't update package properties
* #718 Custom categorical columns sort order in not reflected on plots after page reload
* GitHub #777: exposed DataConnection query method
* closes #10938 Make modals resizable
* StatusBar improvements
* (Bug) JS: ViewBase.basePath doesn't work
* xamgle.lock
* closes #10935 FlexboxLayout should not add extra divs
* recloses #756 bar chart zoom slider visibility
* Grok Spawner port
* CI: Fix all integration tests for any environment
* #424 fixed x axis log availability
* #756 dont show slider asap viewer created
* Deploy docker images
* Cleanup in beta users
* Documentation
* Public token
* Docker buildx release condition
* Docker Datagrok: Set Grok Connect directory
* debug

## 2022-07-07 Dev build 1.4.14

* Ability to save favorites for groups
* Packages: improve package sources check
* JS UI Test: Density Plot
* Bio: modified getMolfilesFromSeq function
* CSS adjustments
* #740: barchart tooltips
* Model Property Panel layout
* #740: Peptide Space tooltip

## 2022-07-07 Dev build 1.4.13

* (Bug) Integration tests: ChemMapIdentifiers test fails
* CardView: Ribbon shortcuts (WIP)
* Document viewer properties (WIP)
* Fixed warnings
* Public token
* Macromolecules page
* Ability to save favorites for groups
* Fixed NPE
* OnCurrentObjectChangedEvent
* Updated public token
* CSS improvements
* Wiki: Upload data: improvements
* (Bug) Find and replace: an exception when replacing values
* Fixed NPE on admin login
* Added initial permissions for Admin user
* Fix docker datagrok image
* Added missing migration
* #763: distribution panel label fix
* Bio: getting monomer objects from HELM lib

## 2022-07-05 Dev build 1.4.12

* Document viewer properties (WIP)
* Status Bar
* Popup: ability to show context menu next to the element
* Fix link to dart for Windows
* #735 and #736 property panel search improvments, expand all button
* #758 [Tooltip] \- using the option to sketch form for the tooltip completely breaks its responsiveness for further
  modifications (WIP)
* Ability to set layout on third-party system exported data
* Implement JWT tokens (WIP)
* closes #732 tooltip for large text in small cells
* Properties: "depends on" property
* CSS fix

## 2022-07-04 Dev build 1.4.11

* Document viewer properties (WIP)
* string fields
* JS API: support a selection mode via modifier keys only in Bitset.handleClick
* property grid null dependencies
* Compute: Model Catalog app to appear on the Left Panel #411
* JWT test
* RSA KeyPair: Sign and verify methods
* Implement JWT tokens (WIP)
* Bio: top menu added
* fix semtype
* Fixed #745: Compute: several custom viewers are in conflict
* Fixed analyzer warning

## 2022-07-01 Dev build 1.4.10

* JS UI Test: Pie Chart
* Better units CSS
* fix $ sign

## 2022-07-01 Dev build 1.4.9

* dont explicitly set description with several lines

## 2022-07-01 Dev build 1.4.8

* Properties: an option to reorder rows in column grid for multi-column property editor
* Document viewer properties (WIP)
* Fixed exception on AccordionPane.toJs()
* Compute: Model Catalog app to appear on the Left Panel #411
* property generator reads comments from files
* optimize iteration throulines in same files
* open file from other package
* Fixed parameter type in detectSemanticTypes
* Func subtype fixed
* Wiki: fixed broken links
* Wiki: moved dashboards.md
* Add smiles-to-mol scketcher tests
* Added other conversion tests except molV3
* Added value for converted smarts to ketcher_tests

## 2022-06-29 Dev build 1.4.7

* #741: Peptides Space fix
* Peptide space tests fix and performance benchmark
* Helm: Updating the sizes of the HelmWebEditor
* Chem: activity cliffs tests
* Compute: Model Catalog Groups editor #658
* Exercises: lint fixes

## 2022-06-29 Dev build 1.4.6

* OligoBatchCalculator: fix of using new modification
* Compute: Model Catalog Groups editor #658

## 2022-06-29 Dev build 1.4.5

* Test manager: ability to run tests using url (WIP)
* Exercises: fixes
* (Bug) IgnoreCloseAll doesn't work
* Compute: Script icons support
* JS-API: package-test.js fails to load on autostart
* Compute: Model Catalog app to appear on the Left Panel #411
* Docs: Help documentation
* Docusaurus documentation
* (Bug) Parametrized DataQueries don't work (WIP)
* Fixed typo
* Compute: Model Catalog Groups editor #658
* Fixed routes order

## 2022-06-28 Dev build 1.4.4

* [Calculated columns] \- Min() and Max() are not compatible with date and datetime columns #689
* JS API: add initial sync option to grok.data.linkTables
* JS API: Property: expose category, format, nullable, editable properties
* Viewers: ability to use JS-based viewers in Trellis (WIP)
* Fixed packages view css
* PackagesView: Fixed categories refresh
* closes #639 Scaling Structures on the ScatterPlot
* trellis plot with one cat
* Added more beta users
* Grid: updated some properties
* Work in progress
* Properties: "depends on" property (WIP)
* Retired the obsolete `unitTest` tag
* Chem: optimization of dependencies \- WIP
* Chem: optimization of dependencies \- got rid of the built-in js-api
* Chem: removing obsolete stuff from the core
* D4: rebuilt auto-generated files
* Chem: moved openchemlib-full.js under /common for Chem to load it via "sources"
* Delayed execution for autostart functions by default (+ meta.autostartImmediate)
* Optimized favorites requests
* Package Manager -\- audit fix
* Disable package functions logging
* Optimized DataSources list load
* Package Manager: fixed the styles
* Packages: context menu improvements (WIP)
* Core: Apps won't start from Favourites #632
* Css fixes
* Promote MenuItem to JS
* Compute: fix model URL #574
* Compute: Model Catalog Groups editor #658
* Compute: Model Catalog app to appear on the Left Panel #411
* Closes #733: Grid: allow to resize column header by dragging the border between the header and the first row
* CI: Fix links checker
* HELM: issue #700 Smiles + Molifle representation

## 2022-06-23 Dev build 1.4.3

* Simplified JsConvertible
* Closes #709: Filter panel is not synchronised across different views
* (Bug) Correlation plot: histogram cells are not shown
* (Bug) Correlation plot: in-cell scatter plots are empty
* Correlation Plot: cell format set to 0.00
* Package content validation: up-to-date bundle check
* Packages: notify of successful settings saving
* Dialog: showHeader and showFooter properties
* (Bug) Semantic type detection not performed in the file preview pane
* Bio pckg: Fix VdRegions viewer registering

## 2022-06-21 Dev build 1.4.2

* Grok Spawner: create endpoint for docker build from Dockerfile
* Packages Manager (WIP)
* Packages View: visual improvements
* Grid: html rendering: automatically annotating host div with semantic type (WIP)
* Closes #699: Valid formula line on scatter plot is not shown if one of the scatter plot lines is invalid
* Work in progress.
* Merged in spodolskaya/testtrack (pull request #179)
* Changing the behavior of ESC button in the filter panel #644
* (Bug) Semantic type detection: column with manually assigned sem types are being auto-detected
* Closes #642: Autodetection of Structure columns imported from external files
* Package content validation: up-to-date bundle check
* Closes #719: Viewers: current object won't change after viewer properties are edited
* Chem: v1.0.2
* Chem: #697 Close preserves changes, x\- button recovers initial sketch
* Closes #718: Custom categorical columns sort order in not reflected on plots after page reload
* MLBData: set category to "Bioinformatics"
* Closes #605: [Filter Panel] Search doesn't work in the column list for adding column filter ("+" icon)
* MLB: Buildup regions layout for cdr definition/numbering scheme combinations
* MLB: Buildup regions layout for cdr definition/numbering scheme combinations fix

## 2022-06-17 Dev build 1.4.1

* Packages Manager (WIP)

## 2022-06-17 Dev build 1.4.0

* KeyPair::encryptString/decryptString methods fixed for UTF8 symbols
* Grid: add cell context action
* (Bug) Functions: invalid date format in `Time()`  in some acceptable cases
* Packages Manager (WIP)
* Fixed test
* # 700: Helm fixing trouble with rendering
* F2 no longer edits a cell as it is still used as a column editor hotkey
* (Bug) Data | Text: Semantic type is not detected after table loaded
* JS API: Exposed Column.Aggregate
* Closes #642: Autodetection of Structure columns imported from external files
* Opening editor on double click

## 2022-06-15 Dev build 1.3.5

* MLB: Fix camelCase in DataLoader and setup.cmd

## 2022-06-15 Dev build 1.3.4

* Row number is not clickable after applying saved layout #679
* JS API: convert datetime to dayjs object in DG.toJs

## 2022-06-15 Dev build 1.3.3

* Fixed missing taskbar

## 2022-06-15 Dev build 1.3.2

* Packages: Debug packages permissions fix (WIP)
* Closes #701: ositioning of Hamburger menus with inserted pinned columns
* Packages: update the details section
* fixes batch
* Docker Datagrok new image
* tab fix
* tab
* Packages: add url
* Row number is not clickable after applying saved layout #679
* Added the "showCharts" property that apparently was still used
* Closes #703: Dialog: onCancel does not get invoked if you close it by pressing ESC or by clicking on the 'x' icon
* improve enter behavior
* JS API: convert datetime to dayjs object in DG.toJs
* # 700: Fixing bugs in opening the editor

## 2022-06-13 Dev build 1.3.1

* Formatting: add a missing format alias for floats
* Packages: change package card view for debug versions
* Compute: UX harmonization #180 URL fix
* Docs: Dev deployment
* Run Integration tests locally
* JS API Tests: Functions: tests for all built-in arithmetic/logical/date functions (WIP)
* Packages: Debug packages permissions fix (WIP)
* cheminformatics: refactored up to descriptor-based tools
* Packages: add categories

## 2022-06-12 Dev build 1.3.0

* Packages manager WIP
* Packages manager WIP Some styling
* Closes #655: Grid: No auto new line when editing and '+' available
* Exclude broken integration tests
* Datagrok incapsulated grok connect
* Packages: context menu improvements (WIP)
* # 695: style paramter for range slider
* Packages: Package install fail timeout
* Packages: fixed exception on packages without repository
* PackagesClient.deletePublished
* Scripting: understand extra white spaces in the script header (WIP)
* Packages: Ability to delete package (WIP)
* SelectAll: only selecting rows, not columns
* Filters: fixed the indication of the active/inactive state
* Packages: Debug packages permissions fix (WIP)
* # 698: custom property panel
* Peptides: p-value column format fix
* Viewers: harmonizing properties \- WIP
* Peptides: accordion panels width fix
* Update icons.
* Helm: initial update (test files + detectors)
* Helm: updated README.md
* # 700: Helm: implemented renderer, updated wiki
* Compute: UX harmonization #180
* Peptides: visual fixes
* # 700: Helm: help update
* Peptides: analysis save-load fix
* Peptides: lint fix
* Compute: UX harmonization #180 URL fix
* Updated public index

## 2022-06-08 Dev build 1.2.1

* (Bug) Dev: Beta users and test track (WIP)
* SequenceTranslator: update JS API version
* Fixed Datlas tests
* Changes made to grid row header are not saved with layout #528
* Sidebar icons harmonization
* Error searching non-existent layout #670
* Closes #694: Selected/filtered rows: "Save as column" action
* New viewer icons
* Closes #678: Memory consumption is constantly increasing if a view with filters panel is duplicated
* Closes #87 Charts: migrate to TypeScript

## 2022-06-08 Dev build 1.2.0

* Closes #405: Switching table for a viewer: column selection dropdown/dialog in properties panel is not updated
* Row number is not clickable after applying saved layout #679
* Closes #687: Filters: ESC should toggle all filters on/off
* Closes #608: [Filer panel] Substructure search improvements
* Fix new datagrok image
* GtHub actions: Fix category for Mets
* Chem: fixed empty molecule check
* Make CloseAll aware of ignoreCloseAll
* Wiki: fix documentation using markdownlint
* JS-API: fixed check marks in sketcher menu
* # 691: getColumnSeparator function intial

## 2022-06-07 Dev build 1.1.9

* Chem: changed logic of empty molecule check
* OligoBatchCalculator: fix of not valid data in additional modifications table
* SequenceTranslator: fix of conversion
* SequenceTranslator: fix of sequenceToSmiles tests

## 2022-06-07 Dev build 1.1.8

* Removed debug printout.
* Closes #576: Changing the order of values of categorical columns is not reflected in the filter panel
* Remove COMPOSE_PROFILES

## 2022-06-06 Dev build 1.1.7

* Closes #654: Chem: ability to import mol files V3000
* Closes #640: How to switch Structure Search to categorical filter
* Code cleanup.
* Closes #637: [Filter Panel] \- the history of Structure Search fields
* # 604: Chem: "Use as Substructure Filter" action for molecules \- WIP
* Ability to specify actions for semantic types as JS functions
* Closes #604: Chem: "Use as Substructure Filter" action for molecules
* Dockerfile datagrok multiarch
* The modification of the formula is not propagated to other calculated columns #666
* Buildx Docker images
* Docker buildx multiplatform
* Heatmap: add max columns property instead of hardcoded value
* Fix buildx script
* Resolves #669 JS API: add View.temp object to store auxiliary information
* Docker Buildx disable cache
* Docker Buildx multiplatform: one platform at a time
* Docker datagrok new image
* Docker buildx scan images
* Docker buildx log the tar archive
* Closes #604: Chem: "Use as Substructure Filter" action for molecules \- plenty of fixes and improvements
* Closes #604: Chem: "Use as Substructure Filter" action for molecules \- progress indicator, better interactivity
* Closes #604: Chem: "Use as Substructure Filter" action for molecules \- CSS improvements
* Docker Buildx cache push by flag
* JS API: grok.dapi.groups.getGroupsLookup
* Closes #681: Friendly names for columns
* Added a beta user
* Do not tag latest without push
* Datagrok elasticsearch configuration
* Fixing issues with drugNameMolecule function
* Issue #673: InChi-based sketcher structure query integration
* Chem: filtering using Ketcher sketcher

## 2022-05-27 Dev build 1.1.5

* New Datagrok Image with caching layers
* Create release notes for every release
* Js-Api: fixed bug with function name in chem sketcher
* Js-Api: fixed bug with sketcher function

## 2022-05-27 Dev build 1.1.4

* JS API: add Property options

## 2022-05-26 Dev build 1.1.3

* Closes #648: Viewers: Column selectors: Interactivity: previous column is not set back on mouse leave
* Closes #535: Chem: Structure filter (MarvinJS) cannot be removed from filter panel once added
* Charts: add webpack-cli to dev dependencies
* Simple mode: correct misspellings
* # 618 Charts: Timelines: ability to define multiple "Events" columns (WIP)
* Test for dateTime pattern added
* JS API: JsViewer.columnList property
* Meta fix
* (Bug) Old version layout restoring hides row numbers column
* Extending UNDO mechanism (views closing, axes changes) #600
* Fix Meta package format
* Removed debug lines
* Added missing await
* Meta-package in NPM (WIP)
* Fixed S3 file read
* JS API Tests: Functions: tests for all built-in arithmetic/logical/date functions (WIP)
* Oligo Batch Calculator: editing option on the base modification logic (WIP)
* Add uploading ANARCI (aligned to numbering scheme) antibodies sequences (to filter for an antigen) within position
  names columns to separate tables containing scheme and chain within table name.
* JS-Api: implemented sketcher inplace/external modes
* Usage analysis: use groups instead of users in filters
* # 646: replaced objects with Maps & storing indexes
* JS API Tests: Stats: test each exposed method and property (WIP)

## 2022-05-24 Dev build 1.1.2

* Closes #641: Grid.autoSize(maxWidth, maxHeight)
* Grok Scaler
* Unable to set value to datetime column from JS (WIP)
* Removed unused code
* Moved grok_api to separate library
* Grok Scaler documentation
* ApiTests: fix the build error
* ApiTests: add eslint plugin
* ApiTests: linting

## 2022-05-23 Dev build 1.1.1

* Sidebar integration improvements
* PowerGrid: code cleanup, added a description to the "Global Scale", gave friendly names to renderers.
* Removed sparkline renderers from core
* Property description is rendered as markup. Code cleanup.
* (Bug) File Browser: "Bad state: no element" error when clicking on the empty folder in the tree
* Chem: Code cleanup
* Closes #630: Structure queries
* Closes #523: Sketcher: ability to paste molblock
* Better function signatures
* Complete CI Flow
* Moved CI Flow images to Help
* Ignore drawio backups
* New CI Flow Documentation
* Resolves #617 Charts: Timelines: setting "Color by" to empty results in an exception
* CDM: sample project
* Datlas split to libraries (WIP)

## 2022-05-20 Stable version 1.0.0

* Packages: get compatible npm package versions
* (Bug) connection.close in JdbcDataProvider.execute didn't account for exceptions other than SQLException
* Additional tests for calculated columns
* Push version script: releases branch
* Scatter Plot: Scroll bars visibility
* Docker build script: releases branch
* Lines by equations: Ability to create dashed and dotted lines
* Lines by equations: Ability to remove lines from storage
* Datlas: keep trying to connect to Grok connect
* MultiView css fix
* Viewers: harmonize property names for shapes
* Filters: add wildcard support in search over categories
* Formula lines: Update help
* Work in progress
* Minor code cleanup
* (Bug) In-Vis Filter: Does not affect the regression line
* JS: MultiView: DockView support
* Close button on TabControl
* Convert FunctionView to DockView
* JS: MultiView: DockView support
* Peptides: code cleanup and minor improvements
* Model Catalog improvements
* (Bug) Filters: Uncheck/Check a field in the filter panel that does not update the record properly
* Viewers: In-vis filtering: Implement for Bar Chart
* JKG: lost RxODE
* Fixed analyzer warning
* iframe-embeddable views
* Compute: documentation \- WIP
* Added documentation on caching
* OnViewAdding event
* Compute: documentation
* NPM repositories: new package manager UI
* Scatter Plot: Hide property "formula-lines" from PP
* Remove a utility function
* Fixed css
* (Bug) Multiple FuncCall.onCancel subscriptions
* Additional debug lines
* (Bug) Socket fails if there is ID in DataFrame Param value instead of TableInfo
* Formula Lines: Hide '...' button from Filter field in PP
* Change routing for CVM components in AWS
* (Bug) Packages: dapi.packages.find ignores the include string
* (Bug) Packages: URL field is empty for packages deployed from npm repositories
* README
* Datlas: Add logging to ConnectorsPlugin
* Datals: add tryToReconnectToConnectorServer flag
* In-vis Filter: Implement for Line Chart
* Fix concurrent modification during iteration exception
* CSS Fix
* (Bug) Formula Lines: Lines are clipped on some data
* Packages: Add tests for versions
* JS API: Script.sample, Script.reference, Script.tags, Script.environment
* Chem: similarity analysis and SPE removal
* (Bug) Packages: Infinite detectors loop
* Docker versioning
* Chem: panels removal
* Commit version to the according branch
* Fix condition to create branches in public repository
* Git information inside docker containers
* (Bug) In-vis Filter: Take into account property ShowFilteredOutPoints
* Ability to show input parameters in Function View
* (Bug) MariaDB and MySQL databases throw an exception when trying to open a list of tables
* Separate source maps
* Scatter Plot: Make scrollbars like a histogram and place them on the axes
* More error handling for getNpmPackageVersions
* Check js-api build before docker image build
* Push version: get latest datagrok-api version from npm registry
* Packages: optimised search for compatible versions
* Fixed addNewColumn layout
* Unit tests: exclude and include components from command line
* (Bug) Grok connect: NPE after dev deploy
* Updated dev environment v2 for Linux users
* Packages: allow subfolders in the directories reserved for entities
* (Bug) Grok Connect: Athena: java.lang.NullPointerException at java.util.Hashtable.put(Hashtable.java:460)
* JS API: add Property options
* Datlas: remove timer for reconnecting to Grok connect
* Grok connect: improve SettingsManager for tests and GrokConnectShell
* (Bug) Formula Lines: Sometimes tooltips doesn't appear
* Wiki: Access \- WIP
* Package files caching
* Scatter Plot: Marker coding for Split-By-Marker
* JS API: Improved code style (marker coding, formula lines)
* (Bug) Scatter Plot: Y axis shows weird values
* Small help addition
* Scatter Plot: Get rid of code duplication (axes and grid lines)
* (Bug) Bar chart: When "Axis Type" = "logarithmic", numbers on the axis get merged
* (Bug) Grid: categorical color-coding cannot be switched on/off without opening 'Edit' menu in some cases
* Functions: help-url support for scripts in Function View
* Ability to disable events in InputBase
* (Bug) Calculated column with numeric type and empty formula leaves no formula tag
* Ability to show multiple viewers in Function View
* Function View: Show table inputs if there are viewers set
* small css adjustment
* Function View: Adjust table heights
* Grid: add changePropertyPanel property
* Fixed analyzer warnings
* Update public
* Scatter plot: regression line: improve precision for the regression coefficient
* Scatter plot: improve axis formatting (".00" postfixes are often unnecessary)
* Scatter Plot: Rename and move property for MinMax labels visibility
* (Bug) Trellis Plot: full screen mode for inner viewers doesn't work when trellis is zoomed
* Renamed .d to .dart to fix minified code
* CSS fix
* Grok Connect: maven cache in docker image
* Viewers: Unification of properties (alpha/opacity/opaque)
* (Bug) JS API: null reference in JsViewer.dataframe
* Scatter Plot: an option to follow global filter
* Added an SQLite demo file
* SQLite: improved documentation
* Bar chart: improve and refactor collaborative filtering
* Grok connect: NPE when settings in schemas, schema, and query_table_sql are null
* Formula lines: Fixed name conflict
* NPM repositories: add check for deprecated versions
* NPM repositories: improve package search for given scope
* Terraform configuration for CVM
* Function View: Viewer positioning tags
* Function View: Ability to show grid
* Release notes: ignore GitHub Actions commits
* Added isolatesCount to GROK_PARAMETERS
* Added pool settings to GROK_PARAMETERS
* (Bug) Grid: "Show row header" property does not have any effect
* Skip test: ddt.calculated_column.metadata presence after formula application
* (Bug) Tree Map: After selecting column for "Size" property, column selectors on the viewer are duplicated
* Chem: Support filters from packages
* Push version using the version in package.json file
* (Bug) Formula Lines: "=" in the column names breaks the formula lines
* NPM repositories: add registry property
* Actions panel function names fix
* Added build all batch script
* Fixed name conflict (opacity)
* (Bug) Formula Lines: Browser crashes om some analysis
* ElasticSearch log4j vulnerability CVE-2021-44228
* Push version: generate release notes for minor release
* (Bug) ListInput: caption is not shown
* Filters: ability to add multiple filters (for the specified selected package filter) for selected columns
* Filters: ability to remove all filters (via the popup menu)
* Scripting: in-place definition for environments
* (Bug) Viewer Filter: Scatter Plot doesn't refresh after Viewer filter changed
* H2O: log4j CVE-2021-44228 remediation
* Css fixes
* CSS Harmonization
* Changed default run section to condensed mode
* Formula Lines: Name harmonization \- core side (doesn't affect users)
* Formula Lines: Name harmonization \- js api side (affects users). Change property name: equation -> formula. Both
  options are valid, but equation is obsolete.
* (Bug) Filters: closing the viewer does not properly detach it (event subscriptions are leaking)
* (Bug) ColumnComboBox: allowDrop field is ignored
* (Bug) Widget.die() does not kill all descendants
* Filters: ability to drag-and-drop columns to the filter group
* (Bug) Formula Lines: No lines if plot was created from the script annotation (Pmax)
* Propertly detaching JS-based filters
* Minor fixes and improvements
* (Bug) Scatter Plot: Wrong scrollbar length when canvas resized
* JS API: Filters (WIP)
* Bar Chart: Wrong scrollbar length when canvas resized
* JS API: ability to interop with Dart lists (no deep copy)
* Harmonize interop
* Minor code cleanup.
* JS API: getRawData should return real buffers (currently creates a copy)
* (Bug) Bar Chart: Exception when filtered table rows = 0
* SketcherFilter: provided filterType (will be retired soon, anyway)
* Seamless data loading to Function View
* Function View improvements
* Markers: Fixed bug with last marker in List
* Markers: Add new marker for outliers
* Python base image: remove boost artifacts from image
* Package repositories: unique scope check
* Datagrok: disable update certificates by environment variable
* Function View: markup improvements
* Formula Lines: Property harmonization (opacity)
* JS API: Moved properties (column.colors => column.meta.colors, column.markers => column.meta.markers)
* Scripting: global named conda environments
* JS API: Users API
* Formula Lines: Endless lines
* Result Header CSS Fix
* Formula Lines: Minor changes
* Minor code cleanup, switched to the thin barbell look
* Fixed a silly division by zero error
* Fixed filtering and add minor fixes
* _JsBasedHandlers resulting tables names fix
* Bar Chart: Fixed "compact()" call on nullable "stackColAggr"
* Removed parentheses
* (Bug) Line Chart: Fixed bug with "Y Global Scale"
* (Bug) Core: Sensitivity analysis won't work
* Line Chart: Added global Y-axis
* Line Chart: Added title for global Y-axis
* Octave: vectorization
* (Bug) Line Chart: X-selector overlaps the chart when the x-axis is auto-hidden
* (Bug) Line Chart: No X-axis in Multi Axis mode (if there are many lines)
* Line Chart: Show chevrons only on mouse hover
* Line Chart: Ability to set selectors legend position
* JS API: improve the registration of async functions (WIP)
* (Bug) Grid: column popups: popup container left handing in the DOM tree after a popup is closed
* Filters API: passing the requester filter up the event chain
* (Bug) ui.wait() adds default 400x300 size to the container
* Filters in the column property panel
* Grid: column quick panel: ability to add as filter (WIP)
* Bar chart: checkboxes "select" and "filter" in the context menu
* (Bug) Property panel: columns: clicking on the column does not change current object
* Added a comment on comments
* ClientPackageFunc: ability to run function synchronously once the package is loaded
* (Bug) Scatter Plot: programmatic zoom causes an error
* Untyped events since they clearly were not `Stream<String>`
* Bar chart: add categoryValueWidth property (WIP)
* Chem: excludin duplicated features
* (Bug) Scatter Plot: onZoomed returns objects of different data types when the plot is zoomed manually and
  programmaticaly
* Provide Area \- interface for Rect, Polygon, etc.
* Line Chart: Auto margin for yAxisTitle (get rid of yGlobalMarginAxisLeft)
* (Bug) Line Chart: The top marker of each line is cut off
* Line Chart: Changed close-icon style of lines
* Line Chart: Place close buttons to the right of the y-selectors in MultiAxis mode
* Minor CSS improvements
* Wiki harmonization \- WIP
* Name harmonization: API Samples, API Tests
* Set some packages as beta.
* Packages: remove unneeded package detectors
* Dialog.create: made options really optionable :)
* Axes: Ability to display vertical axis on the right side of the chart
* Line Chart: 2 different y-axes when lines count = 2
* Documentation improvements
* Chem: move semantic type detectors to the Chem package
* (Bug) Chem: some panels (drug likeness, toxicity, etc) do not work with molblocks-encoded molecules
* Unit conversion \- WIP
* Chem: get rid of the Molecule-specific renderer tricks in the core
* Line Chart: Special y-selector visual mode for 1 and 2 lines
* Axes: Add more y-tickmarks (need for Line Chart)
* Reusing DruglikenessPredictor
* (Bug) Opening an SDF file results in writing a big binary array to Datagrok's console
* Made the accordion pane's left margin smaller
* (Bug) Info panel invocations end up cluttering Datagrok console
* Build fix
* JS API: Cell.value setter
* (Bug) Chem: double-clicking on a structure: move to the Chem package
* (Bug) Chem: double-clicking on a structure opens an empty sketcher
* (Bug) Chem: Molfile widget does not work with molblocks
* Implemented #243: Chem: sketcher: "Copy as SMILES" and "Copy as MOLBLOCK" context commands
* CSS fixes
* Code cleanup
* Chem: fixed two memory leaks (molecules not being disposed)
* Chem: SDF importer: fixed a bug with 100 first rows being ignored
* Chem: removed unnecessary imports
* JS API: Func.find: ability to search by metadata
* Dart Sketcher: fixed an issue with smiles = null
* Chem: refactoring cell rendering \- WIP
* Formula Lines: Editor
* grok.shell tests fix
* (Bug) Octave: graphics won't work
* DevOps documentation
* Modified field length
* Update the dialog design for developer keys
* Help failed tests troubleshooting
* (Bug) Bar chart: scroll the page when BC scrolls are invisible
* H2O: Grok Helper URL prefix
* (Bug) DataFrame.onCellValue event not fired when a value is deleted in a spreadsheet by pressing Del or Backspace
* Viewer in accordion has zero height
* Bar chart: pass information about is click was on the header
* Bar Chart: maxBarHeight property
* Bar Chart: verticalAlign property
* (Bug) Bar Chart: initial render cuts category names
* (Bug) JS API: Legend.create doesn't return an instance of DG.Legend class
* Add CodeMirror to sources
* Change release-history.md during release
* Updated beta_users.csv
* Bump elasticsearch from 6.4.2 to 7.16.2 Elasticsearch release to upgrade Apache Log4j2
* JS-API: Packages test framework
* Bar chart: add filtering by clicking a category label in the stacked BC
* Bar chart: fixed bar border line
* (Bug) JS API: "Legend.column =" causes an exception
* JKG: Allow gnuplot run on different platforms
* Fix docker build for datagrok
* (Bug) Grid: virtual column of type bool renders as text
* 9913 displaying scalar query outputparams
* 9913 space by arrow
* DataFrame: editable virtual columns
* JS-API: Exposed DataFrame.fromByteArray and FileSource.readAsDataFrame methods
* JS API: updated js-api-common files
* (Bug) Pivot table icon is missing
* JS API: readAsDataFrames renamed to readBinaryDataFrames
* Bar chart: click not on the bar to clear the filter
* PowerPack: added tests for widgets
* ApiTests: added a test for package files
* (Bug) Trellis Plot | Inner Viewer Settings throws an exception
* ParamCommand: default item comands ("open" for project, "details" for users, etc). Support for double-click
* Property panel: decreased the margin for nested accordions
* (Bug) Grid: renderer type is not automatically changed when it is set via column.tags['cell-renderer']
* Resolves #266: Chem: molecule column property panel
* Dialogs: add missing wiki links
* JS API: add Viewer.helpUrl parameter
* Introduce Func.source constants
* (Bug) grok.dapi.files.delete(): NoSuchMethodError
* 9913 dataFame
* API: added getting and saving event types
* Updated demo/bio peptides data
* Added ability to set code in ScriptView constructor
* ViewFactories ScriptView construction enhancement
* Move all demo assets to packages
* (Bug)  JS-based file handlers are not invoked when you double-click on a file in file browser
* # 277 Chem: Substructure filter: fixed collaborative filtering
* # 277 Chem: Substructure filter: picking up current filter
* (Bug) DAPI: Filter returns incorrect query
* Fixed test
* (Bug) Grid: column tools: filter: add: there should be no other filters in the filter group
* Simplified the creation of the popup filter
* # 277 Chem: Substructure filter: better integration for the filter group / popup filter / property panel filter
* Formula Lines: Fixed typo
* Update the beta users list
* Fix a css rule
* NPM repositories: package data caching
* Amazon S3 Adapter: Anonymous access
* Packages: Ability to store content in S3
* Code cleanup and harmonization
* Moved files to folders
* Removed default handlers for Function and Script
* JS API: GridCellRenderer: ability to render values (without GridCell / GridCellStyle)
* Chem: Similarity & Diversity: switched to the renderMolecule() method
* Add a grayed-out text color constant
* DataQueries: Support scalar results in setResult method (WIP)
* UI: Condensed form, units after labels
* added ScriptView.fromParams constructor
* Always create NPM repository
* JS API: Projects API
* Updated public token
* Remove redundant deployDataPath
* Enabled Chem | Descriptors
* Embedding viewer should embed Guest User session
* CI: Vulnerability scan
* (Bug) Filters: the panel is reset when it is closed and re-opened
* JS API: Get last error state (WIP)
* (Bug) Histogram: Opacity for bands has no effect
* (Bug) Line Chart: Exception while activating multiAxis & overviewType at the same time
* (Bug) Line Chart: Previous renders of the chart are visible on the canvas
* (Bug) Line Chart: X axis overlays on lines when \{ overviewType: "Line Chart" }
* AppEvents.lastError: simplified the code and fixed a bug
* Updated package-locks.
* (Bug) Filters: show header property does not work
* JS API: Filters: fine-grained API (WIP)
* Filters: ability to specify filtering criteria during construction
* JS API: JS Filters: ability to provide custom caption
* JS API: Help & Example for ui.colorInput()
* (Bug) Line Chart: Selectors indents (when count = 2)
* (Bug) Scatter plot: Erroneous ticks when zooming out
* Fixed analyzer error
* JS API: Added additional useful FLines methods
* Usage analysis: add Function errors tab
* Chem: minor fixes
* Func.find: fixed a bug with metadata search
* Func.find: ability to search for the result type/semantic type
* Implemented #138: Chem: Text search for molecules in the sketcher
* Chem: refactoring
* JS API: Added ColumnList.getUnusedName()
* (Bug) FLines: Constant lines do not take min-max into account
* credential manager prototype
* 10269 secret manager prototype
* JnJ: monitoring resources: RAM, CPU, HDD
* Implemented #304: Chem: Sketcher: Add to favorites
* (Bug) Filters: free-text input: emptying the input box throws an error
* Tooltip: ability to show multiple tooltips at once
* Filters: Histograms: Tooltips while dragging
* Css style fix for the checkbox in filters
* JS API: add vertical RangeSlider
* (Bug) Accessing .type in onViewerAdded event breaks filter
* Canvas viewers: fixed fps calculation
* Scatter Plot: selected rows should be rendered on top
* Line Chart: logarithmic axes (WIP)
* (Bug) Scatter Plot: area selector: null values are getting selected
* A quick way to move columns to the beginning/end of the spreadsheet
* Box Plot: support for log scale
* Chem: Filter won't appear
* Fixed analyzer warings
* Fixed wrong method
* (Bug) Demo files connection is missing
* Minor CSS fixes
* Fixed typo
* Upgrade H2O
* (Bug) Filters are not applied in some cases
* (Bug) Function View: Add to Workspace button won't work
* (Bug) Function View: Dataframes selection from a file is buggy
* (Bug) Function View: Dataframes selection from a file is buggy
* (Bug) Scatter Plot: column selectors should be enabled in the invalid state
* (Bug) Form: Structure in form viewer is not rendered after page reload
* (Bug) MoleculeInput: caption is not shown
* JS API: Inputs: validation (WIP)
* Public token
* Fixed grok_shared build
* (Bug) Filters: After reopening filters, all columns appear deactivated in the "Select columns" dialog
* (Bug) Filters: Filters for multi-value columns are not saved after reopening the Filters
* (Bug) Filters:  double-click on checkbox: weird characters are visible
* (Bug) Scatter Plot: Custom linear coloring is not propagated
* NPM repositories: add an option to skip installation of deployed packages during repository publication
* Push version from package.json for master branch
* syft local image
* DockManager_Dock now attaches viewer to view
* Fixed #320: Filtering: 'Select columns' dialog for filter panel is showing currently selected columns incorrectly in
  some cases
* Fixed #319: Disabling/not disabling filtering behaviour on closing filter panel is inconsistent in some cases
* (Bug) JS API: incorrect constant in DG.DOCK_TYPE.TOP
* Fix datagro build
* Added Viewer_Remove_From_View function
* js-api-common update
* Scripting: Better handle missing output variables (R, Python)
* Package description: add markdown rendering
* JS API: Dialog.getOpenDialogs()
* JS API: Dialog.input(caption): InputBase
* JS API: Grid: ability to get cell back color
* (Bug) Color coding: the editing dialog shows the black color for categories which color is set via hex codes
* (Bug) Line Chart: rightmost line segment is not always drawn
* New demo dataset: dose-response
* New sample script: charts-in-cells
* GridColumnMeta
* (Bug) Chem: double-clicking on an empty structure does not open a sketcher
* (Bug) Grid: an exception when resizing the window
* Wiki: Doc on running Dart tests locally
* Test file fixed precision
* (Bug) Grid scrolls to first row after adding/deleting row
* Grid: ability to easily add rows to the end
* # 323: MultiForm: WIP
* Fixed null exception
* (Bug) Parameter subquery is empty
* Harmonize viewer title
* Property panel: "Distributions" pane (WIP)
* Core: delete the service jobs before the repository deletion
* bug fixed fro smiles string in example
* Formula lines improvements
* Update repository jobs: change user permissions (WIP)
* Error status style update (WIP)
* (Bug) BoxPlot Y axis labels overlapping with axis column name
* Harmonize PackagesView (WIP)
* Filters: header should stay on top when you scroll down
* (Bug) Input too large for RSA cipher exception during package deploy
* Avoid extra data copy
* update ref to head on public
* Porting Ketcher reading molfile in React to package (WIP)
* DB: migrate test and demo DB to docker
* VirtualItemView.refreshItem
* Docking Manager: improve auto-docking algorithm when the initial split is vertical
* Improved the description of the connection string in the "add connection" dialog.
* Security: WIP
* Docs: add local installation issue.
* (Bug) Color coding: missing values lose the reserved color when the rules for categorical color-coding are set
* Add details about this can be applied only for Debian-based systems.
* Added Neptune logo
* Docs: create documentation for CVM connection from Local Dart stand
* Strong mode static checking (WIP)
* (Bug) Scripting: Reset variables before script run (Python, R)
* Fix analyser warnings
* (Bug) Renv creates environments directories with nested UUIDs
* (Bug) Several functions broken in calculated columns
* Checkbox styling improvement
* (Bug) Chem: moleculeInput won't set smiles
* Expose additional map data structure to save meta information along with project entity #331
* Add additional options to configure the view loading behaviour to project.open() method #332
* Viewers: ability to specify default axis type (linear / logarithmic)
* PC Plot: log scaling for Y axis
* Grid: spacebar to toggle row selection
* Made analysis options less strict.
* Scatter Plot: ability to invert axes
* Bar Chart: fixed an issue with the initial viewport position
* Expose id property for tableView entitity #328
* Core: update OpenChemLib
* (Bug) Exception on reading credentials for package
* Webstorm configs
* Ability to set Function as a default value
* WebStrom default configurations
* Viewers: legend: ability to reset"filter by category"
* (Bug) Newly created user failed to login
* Fixed #344: Miss configured in-visualisation filter kills the browser session
* Fixed the initial position of the filter
* Grid: Excel-style column resizing
* Grid: column rearrangement: fixed the "'offsetParent' was called on null" bug
* Grid: ability to reorder multiple columns at once
* Renamed images
* Implement '!=' and 'NOT IN' operators for matching rows
* Fixed #348: HTML cells \- selection & scrolling issues
* EacapeSequences: R
* Updated help
* Line Chart: "Invert X Axis" property
* Exposed grok.events.onResetFilterRequest
* Scatter Plot: highlight the category on axis on mouse-over
* Sharing file connection must share credentials (WIP)
* Made debug configuration the default one
* Grid tooltip should be more discreet
* Add IN operator to AddNewColumn
* Box Plot: "inverse Y axis" property
* Ability to rename tab of docked viewer
* (Bug) applyLayout drops columns if table property set
* (Bug) Unable to switch scatterplot axis to logarithmic mode
* Chem: working with mol
* (Bug) AddNewColumn: Vectorization doesn't work
* Chem: hiding old realizations of similarity
* (Bug) Unable to delete project
* Grok Compute gunicorn workers
* PowerGrid: initial update
* Chem: hide fasr descriptors calculation
* Closes #372: JS API: expose CsvExportOptions
* Closes #350: Add option on toCsv() function to split QNum into two columns
* (Bug) Unable to call a function from AddNewColumn formula
* Missing table attribute in layout for "active table" #345
* DG.Utils.download(filename, content, contentType)
* Closes #369: Persisting tooltip form state
* Fixed #357: Free-text filter doesn't work for columns which names contain more than one word
* (Bug) Viewers: 'Edit Viewer Tooltip..." disregards the table a viewer is bound to
* Closes #374: Grid: rendering dataframe values as HTML #
* (Bug) toCsv() throws an exception
* User status interop
* (Bug) Filter indicator is hidden after restoring the layout
* Closes #340: Expose Grid renderers for DG native data types
* Closes #383: Items are unexpectedly filtered out after new rows were added
* (Bug) Query View: "Add results to workspace" button does not work
* Closes #385: Filters saved on older DG versions are not restored
* Fixed the type annotation
* Fixed the friendly name
* Closes #393: GridCellRenderer: ability to handle mouse input
* Closes #393: GridCellRenderer: ability to handle mouse input \- added onMouseLeave
* VPN access to dev resources
* Function View convert to TS WIP
* Closes #393: GridCellRenderer: ability to handle mouse input \- fixed onMouseLeave
* Closes #395: GridCellRenderer: ability to render HTML elements
* VPN with credentials
* Merged in kdoncov/grok_connect_vulnerability_fixes (pull request #163)
* Remove deploy folder
* Unable to set value to datetime column from JS
* # 396: Chem: support SMARTS for db querying
* Elasticsearch config
* Chem: polishing
* Closes #401: Vertical Axis: incorrect label density for custom renderers (i.e., Molecules)
* Chem: bumped version up to 0.51
* `LruCache<Key, Value>`: added generic arguments and strongly-typed it
* Simplified code to avoid warnings
* Chem rendering: strongly-typed, simplified
* Chem: work in progress
* Fixed positions descriptions
* Elasticsearch commit
* Closes #423: Grid: JS-based sparklines
* Closes #422: PowerGrid: Sparklines: Sparklines
* Closes #435: ui.columnsInput: a way to specify a subset of columns to choose from
* Closes #436: Grid JS API: ability to add virtual column
* Added new functions: Utils.openFile and Utils.openFileBytes
* BinaryImageCellRenderer: work in progress
* Fixed #403: Scatter plot: wrong category name is shown on highlighting
* Fixed #404: Box plot: axis labels are not updated when axis is inverted or changed to log scale
* public
* Ability to get all packages tests
* Grid: better renderer isolation: an exception in the JS renderer should not affect the whole grid
* Logging: ability to report a given exception only once per session
* GridColumn: fixed serialization of JS-based settings
* Closes #442: PowerGrid: Sparklines: an option to normalize values
* Closes $443: PowerGrid: PercentCompleted cell renderer
* Allow minor builds in push_version script
* PGAdmin connect through SSH tunnel
* # 424: Blocking option (graying it out) to switch to log scale for columns with negative values \- WIP
* Allow user to rename the viewers from the arranged tab #341
* ignore IDE files
* removed duplicate
* # 424: Blocking option (graying it out) to switch to log scale for columns with negative values
* New method: ListUtils.move(list, from, to)
* Grid: manual row reordering
* Closes #455: Ability to define order of categories
* Grid: fixed an issue with the exception when row header is not visible
* Default value computing error handling
* Closes #464: ability to rearrange columns
* Closes #465: Column selectors: search field is invisible (above the screen) when the number of columns is big
* Grid: Order columns: ability to show/hide all selected columns at once
* Grid: Order or Hide: ability to reorder all selected columns at once
* # 466: ComputationView \- work in progress
* Added banner
* (Bug) DataFrame: Column.init(...) does not increment dataframe version
* (Bug) Grid: html cells: rendered cells should be invalidated when table content changes
* # 470: JS API: JS-based custom inputs \- work in progress
* Miss configured in-visualisation filter kills the browser session #344
* New VPN server
* Temporarily rolled back JsView.name-related changes
* Dataframe formula lines are not shown on scatter plot, if scatterplot's table was changed in properties panel #375
* (Bug) Saving Connection doesn't save credentials
* APP_DATA variable in package deploy
* (Bug) NPM repositories: package manager opens with an exception
* Add missing import statement
* Method to check current user permissions
* Fixed typing
* (Bug) Registry is undefined when a package repository update job is launched
* Added Alexander to the list of users.
* # 480: Ordering categories: SMILES should be rendered as molecules
* JS-API: added notify parameter to BitSet.init
* Revert grok_server and connectors changes
* HttpDataSource -\- dapi.functions support
* Fixed wrong parameter name
* # 466 Computation View \- Integration with FunctionView
* JS-API: exposed setBufferSilent method
* JS-API: setBuffer method
* Closes #488: Positioning of Grid cells in HTML rendering mode
* Menu capitalization fixes.
* Closes #489: Grid: "Current Column | Sort | Custom..." should open the "Order or Hide Columns" dialog
* bug: duplicated event firing
* Closes #490: Custom order of categories should be saved in the view layout
* Wrong data is shown in viewers using calculated column after calculated column's formula was updated #434
* bug: changing cell-double-click features
* (Bug) Wrong output of getCategoryIndex with caseSensitive = false
* Datlas: use reader/writer login in Datagrok system connection, if reader login isn't available
* (Bug) Previously deployed packages sometimes get deleted during repository publication
* Ability to use Func options for grouping
* JS: Ability to disable events in InputBase
* Exposed DG.Color.fromHtml method in JsApi
* JS-API: add a default parameter value for FileSource.list()
* (Bug) NPM repositories: missing proxy settings
* Closes #433: Data exported to csv is incorrect in 'sign' columns if there is more than one such column and there are
  some nulls
* Closes #526: [LineChart] \- axes do not scale to plotted points but to max values of plotted columns
* Closes #367: Persisting visualizations zoom when saving analysis \- proper handling of the "no action" zoom type
* Updated help links
* Closes #367: Persisting visualizations zoom when saving analysis
* Packages: skip the build step for packages that were published along with build outputs
* Fixed an issue with the barchart.
* Closes #530: Grid: do not include units in the column header
* Scatter Plot: Animated zoom to filter
* Ability to save new user without permissions
* Top Menu: change "mousedown" event to "click" for clicks on menu items
* (Bug) Package content validation: one-line functions get annotation warnings
* Closes #532: Show only filtered category items on legends
* # 342: (Only) show filtered category items on scatterplot axes
* Caching Column.getUsedCategories for performance reasons
* JS: bySemTypeAll method
* DataSourceCardView categories (WIP)
* setup for connect refined
* Sketching: size up
* (Bug) Can't set and get ViewBase URL
* Chem: sketching issues with substructure search
* (Bug) Color coding: Selected palette in "Colors" panel differs from the actual colors
* (Bug) Modal window positioning bugs
* (Bug) Color Coding: Color does not change for boolean columns
* Closes #547: Chem: SubstructureFilter: substructure is not saved properly
* Update the linear color-coding section
* Add .item to grid context menu args
* Added Widget.isDetached property
* Closes #524: Filters: highlighting stays after you close the filter group
* Chem: substrucure search queries fixed
* Molecule input: code cleanup
* JS API: additional options for Menu.items
* Documentation \- WIP
* Zeno integration (WIP)
* (Bug) Grid: ctrl+click no longer inverts selection
* (Bug) Error when closing a view
* ScatterPlot: made the "viewport" property hidden
* Functions: dateTimeFromUnixTimestamp (WIP)
* Closes #367: Persisting visualizations zoom when saving analysis Closes #552: Zoom Sliders get reset on the Scatter
  Plot (Zoom And Filter: no action, Axes Follow Filter: false) on opening the filter panel with some filtering applied
* Color-coding: add a check for the currently used color-coding type to the column context menu
* git-secret for credentials
* git-secret documentation
* git-secret
* (Bug) Fix Demo deploy
* GitHub #566: CsvImportOptions
* (Bug) Packages: missing version check during package upload
* (Bug) JS API: JS-based viewers that are instantiated directly are not linked to the Dart viewer
* Closes #545: Including columns headers when copying data from the table (ctrl + c / cmd +c )
* ddt folder
* restore lines
* Closes #546: [ScatterPlot] \- the config panel is being closed when trying to change some values in dropdowns
* Closes #507: [Filter panel \- Structures] Turning on / off doesn't work for structure columns in the filter panel
* [Formula Lines] Columns with parentheses in its names used in Bands' formulas breaks Formula Lines rendering #542
* HierarchyView: minor UI improvements
* PowerGrid help \- WIP
* Datagrok build context
* (Bug) Color Coding: After enabling Conditional for numeric column, the colors are displayed as Linear
* Closes #588: DataFrame: strongly-typed columns #588
* Closes #589: Strongly-typed InputBase.value
* Share git secret to aparamonov
* #594: the 'Features' dialog in the predictive modeling view shows incorrect count of checked columns when opened for the second time
* TreeView harmonization
* (Bug) Connections deploy doesn't deploy connection credentials
* Folder content preview wiki: fixed the title
* FilterGroup.add: fixed the signature.
* Added shell.tv: TableView
* Grok connect: test numeric types
* Datlas split to libraries (WIP)
* Closes #527: Grid options don't return default values
* Viewers: Transformations (WIP)
* JS API: fix type annotation for DataFrame.getSortedOrder
* Meta-package in NPM (WIP)
* JS API: better typing \- WIP
* Package guidelines (WIP)
* JS API: GridColumn.renderer
* Sparklines: renamed "Normalize" to "Global Scale"
* #612: Compute: Add "open" option for DataFrameInput
