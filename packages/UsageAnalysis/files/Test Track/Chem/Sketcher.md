1. Open smiles. csv (Browse > Files > Demo Files/chem)
2. Double-click a molecule.
3. In the hamburger menu of the sketcher, click Favorites > Add to Favorites.
4. In the sketcher, enter **C1CCCCC1** (not using ctrl + V) to molecular input field and press Enter. Then click OK. The sketcher closes.
5. Open sketcher again by double clicking the structure. In the hamburger menu, check the content in **Recent** and **Favorites**.
6. In the hamburger menu, click **Copy as SMILES**.
7. Change the molecule
8. Go to the molecular input field and press CTRL+V. Press Enter. Copied molecule should be displayed
10. In the hamburger menu, click **Copy as MOLBLOCK**.
11. 9. Change the molecule
12. Go to the molecular input field and press CTRL+V. Copied molecule should be displayed
13. Repeat steps 2-9 for all available sketcher types for selection from hamburger menu

Check:
* [#1608](https://github.com/datagrok-ai/public/issues/1608): Chem: Render a structure in a tooltip for the sketch box in the filters panel if the depicted substructure is large. Use the following structure:
`CC[C@H](C)[C@@H](C(=O)N[C@H]1CSSC[C@H](NC(=O)[C@@H](NC(=O)[C@@H](NC(=O)[C@@H](NC(=O)CN(C(=O)[C@@H](NC(=O)[C@@H](NC(=O)[C@@H](NC(=O)[C@@H](NC(=O)[C@@H](NC1=O)C(C)C)CC2=CN(C3=CC=CC=C32)C)CCC(=O)N)CC(=O)O)CC4=CNC5=CC=CC=C54)C)C)CC6=CN=CN6)CCCNC(=N)N)C(=O)N(C)[C@@H]([C@@H](C)CC)C(=O)N)NC(=O)[C@@H](CC7=CC=C(C=C7)O)N`
*  [#2448](https://github.com/datagrok-ai/public/issues/2448): Some structures are displayed incorrectly when highlighted if they are in SMILES format:
   * Open SMILES_highlighted.csv dataset (TODO: Add to linked datasets)
   * Open Context panel
   * Click on the column header with molecules
   * Scroll down to Cheminformatics > Highlights > Sketch. Use C1CCCCC1, press enter. The structure should be highlighted in the dataframe.
   * Make these structures highlighted: either use scaffold tree to highlight or use structure filter on 'isosmiles' column
   
   Expected result: highlighted structure is displayed in the same way as non-highlighted (with stereochemistry kept)
---
{
  "order": 5,
  "datasets": [
    "System:DemoFiles/chem/smiles.csv"
  ]
}
