//tags: DataQuery
//help-url: https://datagrok.ai/help/access/parameterized-queries
// An example of using parameterized query

grok.data.query('ApiTests:PostgresqlByDouble', {freight: 100.1})
  .then(t => grok.shell.info('Number of orders: ' + t.rowCount));
