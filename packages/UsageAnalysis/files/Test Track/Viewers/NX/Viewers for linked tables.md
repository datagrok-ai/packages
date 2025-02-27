1. Open the NxProjectCalcColumns project copy, check
1. Go to the last view (SPGI (2))
1. View > Layout > Clone View
1. Pin the Structure and ID columns
1. Add three scatterplots. Set: 
   * Different Tables (SPGI, SPGI-linked1,SPGI-linked2) to them
   * Zoom and filter to _pack and zoom by filter_
   * Switch all axes to log scale
   * Add categorical legends
   * For the SPGI-linked1 scatterplot set Row Source to Selected 
1. Add a bar chart. Set:
   * Category to Primary Series names
   * Stack to Scaffold names
   * Switch On Click to Filter
1. Add a bar chart. Set:
   * Sum Average mass
   * Stack to 'Chemist 521'
1. On the grid, for the 'Chemist 521' column, turn on categorical color coding and change the color for Chemist 27
1. Use bar charts to filter and select rows in the grid - check the scatterplots, the third scatterplot should display the corresponding points from the SPGI-linked2 table, check pack and zoom on the second and third scatterplots
1. View > Layout > Clone View - check the viewers, pinned columns, and filtering
1. Return to the previous view and reset filtering on the bar chart (double-click it) - the filtering should be reset on all views
1. Press ESC to reset the selection - selection should be reset on all views, the third scatterplot should be empty
1. Save a new copy of the project as 'NxProjectViewers'

Close All
---
{
  "order": 3
}