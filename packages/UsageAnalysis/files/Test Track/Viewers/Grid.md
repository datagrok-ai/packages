### Grid viewer

1. Open the **demog** dataset.
2. Click the **Add viewer** icon, find **Grid viewer** viewer and press on it. 
* Expected result: **Grid viewer** viewer opens without errors in console. 
3. Close previously opened viewer. On the **Viewers tab**, click **Grid viewer** icon. 
* Expected result: **Grid viewer** viewer opens without errors in console. 
4. Interact with all elements directly on the viewer.
* Expected Result: Changes should be reflected quickly and without errors. 
5. Ability to apply color-coding to text:
  * Right-click (RMB) on the desired column in the dataset to open the column's context menu. Navigate to Color Coding Settings. Turn on Color Coding for the selected column in the dataset.
  * Go to Color Coding > 'Edit...'. In the 'Apply to' field, change the setting from background to text. Modify the Color 'Scheme' as desired. Press CLOSE.
  * Expected Result: All color-coding changes applied to the dataset should be immediately reflected in the Grid. The text color in the column should now display the chosen color scheme, and the changes should be consistent throughout the Grid.
6. On the **Grid viewer** viewer, click the **Gear** icon. The **Property Pane** opens.
7. Modify various properties in **Property Pane**:
* Expected Result: Changes to the properties should be reflected in the Grid viewer without errors, and the viewer should be updated accordingly.

8. Column header height and row height in the layout:
* Open the **demog** dataset.
* Adjust the column header height and row height. 
* Open **Grid viewer**:
  * Expexted result: The **Grid viewer** should open without any changes to the column header height and row height from the initial adjustments.
* Adjust the column header height and row height directly within the **Grid viewer**. 
* Save the layout.
 * Refresh browser page or close all.
* Open the **demog** dataset. Apply saved layout
  * Expected results: The saved layout should retain the adjusted row height and column header height for the dataset and the **Grid viewer**. These settings should be applied consistently when the layout is reapplied.

9. Check if the column property is retained when saving the project.
  * Select any column in the dataset. Modify a property of the column.Ensure that the change is applied.
  * Save the project. Close all. Reopen the project you saved.
  * Verify that the column property you changed is still retained and has not reverted to its default setting.
    * Expected Result: The column property should be retained after reopening saved project.

10. Verify 'Pick Up / Apply To' Functionality for Style in Grid ([#1887](https://github.com/datagrok-ai/public/issues/1887))
* Open two demog.csv datasets
* In the first dataset set Color Coding properties for **Age** coumn as: **Linear** with modifyed **color scheme**. Verify that the color-coding is applied correctly.
* After applying the color-coding, navigate to the Color Coding menu. Select **Pick Up Coloring** to capture the color-coding settings applied to the Age column.
* Go to the WEIGHT column. Navigate to the Color Coding menu. Select **Apply Coloring** to apply the picked-up color-coding settings from the **Age**. 
* Expected Result: The color-coding applied to the WEIGHT column should be identical to the color-coding in the AGE column. Ensure that the color gradient match.
* Go to the first dataset
* Right-click the grid and select Grid Color Coding > All and then Pick Up/Apply > Pick UP
* Go to the second dataset
* Right-click the grid and select Pick Up/Apply > Apply - the coloring on grids should match
---
{
  "order": 26,
  "datasets": ["System:DemoFiles/demog.csv"]  
}