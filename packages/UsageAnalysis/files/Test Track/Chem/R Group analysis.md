1. Open linked datasets
2. Go to **Chem > Analyze > R-groups analysis**. A dialog opens.
3. In the dialog, click the **MCS** button
4. Select the **Visual analysis** checkbox
5. Click the **OK** button.

**Expected**: balloon `No R Groups were found` for 'smiles' dataset, trellis plot for 'sar-small' dataset

***

1. Open linked datasets (use 'sar-small' dataset)
2. Go to **Chem > Analyze > R-groups analysis**. A dialog opens.
3. In the dialog, click the **MCS** button.
4. Click the **OK** button. **Expected**: a trellis plot with the results.
5. Run **R-groups analysis** once more.
6. Click **MCS**.
7. In the dialog **uncheck** the **Replace latest** checkbox. **Expected**: the second trellis plot should be displayed. In the grid, there should be two sets of columns resulting from the R-Group analysis.
8. Run **R-groups analysis** once more.
9. Click **MCS**.
10. In the dialog **check** the **Replace latest** checkbox. **Expected**: the latest results (columns and trellis plot) are replaced.
11. Run **R-groups analysis** without clicking the MCS. **Expected**: balloon 'No core was provided'
---
{
  "order": 2,
  "datasets": [
    "System:DemoFiles/chem/smiles.csv",
    "System:DemoFiles/chem/sar_small.csv"
  ]
}
