1. Open SPGI, SPGI-linked1, SPGI-linked2
1. Go to  Data > Link Tables
1. Set Tables to SPGI and SPGI-linked1
1. Set Link type to  'selection to selection' 
1. Set  Key columns to  Id <> Concept Id
1. Click  Link
1. Click New Link
1. Set Tables to SPGI-linked1 and SPGI-linked2
1. Set Link type to  'selection to filter' 
1. Set Key columns to: 
   1. Sample Name
   1. link column 1
   1. link column 2
   1. link column 3
1. Add a line chart and set properties as follows:
   1. Data:
      1. Table to SPGI-linked2
      1. Filter to `${link column 3}=="v ii" && ${link column 1} <30`
      1. Split to link column 2
      1. Overview to link column 1
   1. X: X to Value1
   1. Y: Y Axis Type to logarithmic
1. Go to SPGI
1. Select/deselect some/all rows. Verify that data displayed on the line chart is as expected (only filtered rows displayed, data not missing unexpectedly)
1. Save the project with datasync as ‘NxProject’
1. Close All
---
{
  "order": 1,
  "datasets": ["System:DemoFiles/SPGI.csv","System:DemoFiles/SPGI-linked1.csv","System:DemoFiles/SPGI-linked2.csv"]
}