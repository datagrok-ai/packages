//tags: DataQuery
//help-url: https://datagrok.ai/help/access/databases#parameterized-queries
// Manual master-details linking of tables that are dynamically retrieved from the database
grok.data.query('Demo:Northwind:Countries', {}).then((countries) => {
  let customersView = null;
  grok.shell.addTableView(countries);
  countries.onCurrentRowChanged.subscribe((_) => {
    grok.data.query('northwind:customersByCountry', {country: countries.currentRow['country']}).then((t) => {
      if (customersView === null)
        customersView = grok.shell.addTableView(t);
      customersView.dataFrame = t;
    });
    grok.shell.addTableView(countries);
  })
});
