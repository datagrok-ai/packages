1. Open the NxProjectFormulaLegend project, check
1. Go to the first SPGI view
1. Open the Filter Panel and add a scaffold tree filter by Structure
1. Upload the old scaffold tree ‘scaffold-tree-for-testing.tree’ - the scaffolds are not colored
1. Upload another old scaffold tree ‘scaffold-tree-for-nx-testing.tree’ - the scaffolds are colored
1. Check some checkboxes, change another setting on the scaffold tree - check the filtering (including other tabs) 
1. Save the layout
1. Close the Filter Panel - the filtering by the scaffold tree should be reset
1. Apply the saved layout - the filtering should be applied
1. Go to another SPGI view
1. Right-click any molecule in the Structure Column and select Current Value > Use as Filter - check the Filter Panel and the filtering (including the other tabs)
1. View > Layout > Clone View
1. On the new view, change the structure in the filter - check the filter on the previous view
1. Click the `core` column’s header
1. Go to the Contest Pane > Chemistry > Rendering
1. Set Filter Type to `categorical`
1. Open the Filter Panel - the Core filter should be categorical 
1. View > Layout > Clone View
1. Set up filtering so that some rows are filtered out
1. Turn off all filters - all filtering should be turned off, all rows displayed.
1. Turn on the filters again
1. Turn off some individual filter - rows filtered out by this individual filter should be shown again
1. Apply some old layouts - check
1. Save a new copy of the project as 'NxProjectFiltering'
1. Close All
1. Open the NxProjectFiltering project, check
---
{
  "order": 5
}