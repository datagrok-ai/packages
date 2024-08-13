### Trellis plot

1. Open the **demog** dataset.
2. Click the **Add viewer** icon, find **Trellis plot** viewer and press on it. 
* Expected result: **Calendar** visualized viewer opens without errors in console. 
3. Close previously opened viewer. On the **Viewers tab**, click **Trellis plot** icon. 
* Expected result: **Trellis plot** visualized viewer opens without errors in console. 

4. Working with a viewer window:
    * Moving the window by the workspace
    * Navigation inside viewer window
    * Hover and select elements inside viewer
    * Open\Close property window
    * Display of help window
    * Return viewer after closing by **Edit | Undo** (```CTRL + Z```)
    * Interact with all viewer`s elements directly on the viewer.
* Expected Result: Changes should be reflected on the viewer with no errors. 

5. On the **Trellis plot** viewer, click the **Gear** icon. The **Property Pane** opens. 
    * Appearance and UI. Property Pane`s style shouldn't be broken.
    * Moving the property window by the workspace
    * Property search
    * Change the property values. 
* Expected Result: Changes to the properties should be reflected in the Trellis plot viewer without errors, and the viewer should be updated accordingly.

6. Trellis plot viewer submenu (main focus on options: inner viewer changes, properties, Clone, save as PNG, Save to Gallery, Embed, Full Screen, Close)
* Expected Result: Changes should be reflected in the Trellis plot viewer without errors, and the viewer should be updated accordingly.

7. Trellis plot "Tooltip" submenu testinng (main focus on options: Hide, Edit, Use a group tooltip, use as group tooltip, remove group tooltip)
* Changes to the properties should be reflected in the Trellis plot viewer without errors, and the viewer should be updated accordingly. 

8. **Floating viewer** after applying layout:
  * Open new **demog** dataset.
  * Adjust Screen Zoom: Zoom out the screen.
  * Add and Move Viewer: Add a Trellis plot viewer. Detach the viewer and move it to the bottom of the screen.
  * Save the current layout.
  * Reset Screen Zoom: Zoom in the screen to its original size.
  * Apply the previously saved layout.
Expected Results:
  * The layout should automatically adjust to fit the current screen size.
  * All viewers should remain accessible and properly positioned on the screen.

9. **Split updates in properties**. 
  * Test on the SPGI dataset with opened new Trellis plot viewer: 
    * Open the Trellis plot's properties panel.
    * Add or remove X or Y column from the  Trellis plot itself.
    * Check the number of X or Y columns in the properties panel.
  * **Expected results**: number of selected columns in properties should be updated immediately on adding or removing a column.
---
{
  "order": 13
}