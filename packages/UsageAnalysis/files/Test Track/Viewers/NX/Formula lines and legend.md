1. Open the 'NxProjectViewers' project, check
1. Right-click the view’s header and select Table > Add view
1. Add new column:
   * `Qnum((100-${Chemical Space Y})/100, if(qualifier(${Chemical Space X})==">", "<", "="))`
   * Name: `${Chemical Space Y} ${Chemical Space X}`
1. Add a scatterplot. Set:
   * X axis to Chemical Space X
   * Switch all axes to log scale
   * Set Zoom and filter to _pack and zoom by filter_
   * Add formula lines:
       * `${Chemical Space Y} = 0.5* ${Chemical Space X}* ${Chemical Space X} - 1.5 * ${Chemical Space X} -1`
      * `${Chemical Space Y} = 0.1* ${Chemical Space X}* ${Chemical Space X} +  ${Chemical Space X}`
      * `${Chemical Space Y} = 0.1* ${Chemical Space X}` 
      * Add horizontal ones
      * Add vertical ones
   * Set Labels:
      * Label columns: Structure and ID
      * Show Labels For Selected
   * Set Color to Chemical Space X - set a new linear color schema
1. Add a new scatterplot
1. Use Pick Up/Apply from the customized scatterplot to the new one
1. For the second scatterplot:
   * Change coefficients in the formula lines
   * Configure two formula lines with the same formula but different min/max - both lines should be displayed
   * Re-open the formula lines dialog
   * Uncheck a few lines/bands and click OK to save
   * Re-open the formula lines dialog again
   * Check all the checkboxes - all lines/bands should be shown when all checkboxes are selected
   * Set Row Source to FilteredSelected 
   * From the context menu, select Tools > Show regression line
   * Set Color to Series
1. Add a line chart. Set:
   * Split to Series, Stereo categories, Core, R1, R2, R3 - check that the line chart is not freezing and cannot be broken (even after Multiaxes is turned on)
   * Set formula line for Data frame (use the Data frame tab in the Formula Lines dialog):
      * `${Average Mass} = 0.75* ${Chemical Space X}* ${Chemical Space X} - 4 * ${Chemical Space X} -1+300`
      * `${Chemical Space Y} = 0.75* ${Chemical Space X}* ${Chemical Space X} - 4 * ${Chemical Space X} `
      * Customize Color and Style
1. Add another line chart and set:
   * X to  Chemical Space X
   * Y to Chemical Space Y, Average Mass - the corresponding formula lines should be displayed
   * Split to Series
   * Turn on Data > Multiaxes - check the legend
   * Set Y to Average Mass only
   * Switch Y to log scale - check the formula line
1.  Go to the grid and  rename the Chemical Space X and Chemical Space Y columns - check the added calculated columns and formula lines - they should be renamed, too
1.  Add a histogram, bar chart, pie chart, trellis plot, PC plot, and box plot. 
1.  Add legends to all new viewers. Set different positions and visibility
1.  Stack them one over another - check the legends
1.  For the Chem Space X column, change the color coding to conditional and add a new bin - check the coloring and legend on the scatterplot
1.  For the Chem Space X column, change the color coding to linear and change the schema - the scatterplot’s schema should be changed as well
1.  Change any color on the pie chart categorical legend - check the other viewers with such legend
1. Save the layout
1. Apply some old layouts or make some changes
1. Apply the saved layout - check the legend on the stacked viewers
1.  On the scatterplots, use zoom, pan, selection, and filtering by legend
1. Save the layout
1. Change the layout
1. Apply the saved layout
1. Save a new copy of the project as 'NxProjectFormulaLegend'

Close All
---
{
  "order": 4
}
