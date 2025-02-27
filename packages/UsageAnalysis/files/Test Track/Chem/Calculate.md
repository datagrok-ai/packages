1. Open:
   * Linked datasets (check for smiles (smiles.csv), molV3000 (ApprovedDrugs2015.sdf), molV2000 (mol1K.sdf) formats)
   * smiles_2_columns.csv (TODO: add to linked datasets)
1. Run Chem > Calculate > Descriptors 
2. Select arbitrary values in the dialog.
3. Click OK.
4. Make sure that the column with calculated values is added to the table.
Do the asme for each section in the Calculate menu ()
---
{
  "order": 3,
   "datasets": [
    "System:DemoFiles/chem/smiles.csv",
    "System:AppData/Chem/mol1K.sdf",
    "System:DemoFiles/chem/sdf/ApprovedDrugs2015.sdf"
  ]
}
