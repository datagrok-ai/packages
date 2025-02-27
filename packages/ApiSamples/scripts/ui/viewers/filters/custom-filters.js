let tv = grok.shell.addTableView(grok.data.demo.molecules());
await grok.data.detectSemanticTypes(tv.dataFrame);

// We need to load the external package before we use the
// synchronous "tv.filters" method that uses the filter
await grok.functions.call('Chem:substructureFilter');

tv.filters({filters: [
  {type: 'Chem:substructureFilter', columnName: 'smiles'},
]});