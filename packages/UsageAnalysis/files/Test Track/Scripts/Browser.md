# Tests: Script Browser

The script browser allows you to view previously created scripts, view their properties and manage them.

1. Go to **Browse > Platform > Functions > Scripts**.
2. Type `testRscript` in the search field to find the script from the previous test.
3. Click the script and check all accordions **Context Pane**:
    A. Check all fields in Details it should match the values you specified in previous steps
    B. Try to run the script. Click again on the script and check the context panel again. Usage tab should contain increased Runs count
    C. Try to share the script with other user. Sharing tab should contain user you shared your script with.
    D. Check that Activity has right dates and all actions you performed with connection
    E. Try to send a message to the chat
4. Go to **Browse > Platform > Functions > Scripts** 
* Script browser is open
* You can change the view, use sort and search
5. Run "ACF" (R Script) rom its context menu (input table "TSLA.csv" must be opened)
* Script runs successfully after selecting the required input parameters
* Choose "Edit" item from context menu for "ACF". Script edit tab has been opened
* Open the "Details" tab in [Context Panel](/help/datagrok/navigation/panels/panels.md#context-panel):
  * "Details" tab is open
  * Display inputs and outputs values
* Open the "Script" tab in [Context Panel](/help/datagrok/navigation/panels/panels.md#context-panel):
  * "Script" tab is open. The text of the script is shown here.
* Open the "Activity" tab in [Context Panel](/help/datagrok/navigation/panels/panels.md#context-panel):
  * "Activity" tab is open
  * Display information about actual actions with script


---
{
"order": 4
}
