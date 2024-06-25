// https://datagrok.ai/help/visualize/viewers/trellis-plot

let view = grok.shell.addTableView(grok.data.demo.demog());

view.addViewer(DG.VIEWER.TRELLIS_PLOT, {
  "viewerType": "Histogram",
  "xColumnNames": [
    "site"
  ],
  "yColumnNames": [
    "race"
  ],
  "innerViewerLook": {
    "#type": "HistogramLook",
    "valueColumnName": "age"
  }
});