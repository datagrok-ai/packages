let t = grok.data.demo.demog();

// Conditional color-coding for numerical columns
t.col('height').meta.colors.setConditional({"20-170": "#00FF00", "170-190": "#220505"});

// Linear color-coding for numerical columns
t.col('age').meta.colors.setLinear();

// Categorical color-coding for string columns
t.col('race').meta.colors.setCategorical({"Asian": 4278190335, "Black": 4286578816});

let v = grok.shell.addTableView(t);

let host = ui.div();
let colorCodeRow = function() {
  $(host).empty();
  let cells = Array.from(t.currentRow.cells);
  host.appendChild(ui.divV(
    cells.map((cell) => ui.divText(`${cell.value}`, { style: {'background-color': DG.Color.getCellColorHtml(cell)}}))
  ));
};

v.dockManager.dock(host);

t.onCurrentRowChanged.subscribe((_) => colorCodeRow());
t.currentRowIdx = 5;