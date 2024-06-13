let t = grok.data.demo.molecules(100);
t.columns.addNew('ic50', DG.TYPE.DATA_FRAME).init((i) => grok.data.demo.doseResponse());
t.columns.addNew('hist', DG.TYPE.DATA_FRAME).init((i) => t.col('ic50').get(i));
let tv = grok.shell.addTableView(t);

tv.grid.columns.byName('ic50').cellType = 'html';
tv.grid.columns.byName('hist').cellType = 'html';
tv.grid.columns.byName('ic50').width = 300;
tv.grid.columns.byName('hist').width = 300;

tv.grid.setOptions({rowHeight: 200});

tv.grid.onCellPrepare((gc) => {
  const lineOptions = {
    xColumnName: 'concentration [ug/ml]',
    yColumnNames: ['viability [%]'],
    splitColumnName: 'compound',
    xAxisType: 'logarithmic',
    style: 'dashboard',
    showTopPanel: 'false',
    showSplitSelector: 'false',
    legendVisibility: 'Never',
    showXAxis: 'false',
    showYAxis: 'false',
    showLegend: 'false'
  };

  if (gc.isTableCell && gc.gridColumn.name === 'ic50' && gc.cell.value != null)
    gc.style.element = gc.cell.value.plot.line(lineOptions).root;
  if (gc.isTableCell && gc.gridColumn.name === 'hist' && gc.cell.value != null)
    gc.style.element = gc.cell.value.plot.histogram({showBinSelector: 'false', showColumnSelector: 'false'}).root;
});