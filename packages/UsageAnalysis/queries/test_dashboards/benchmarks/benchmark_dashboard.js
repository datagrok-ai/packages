//language: javascript
//input: dataframe result
//output: dataframe out

async function postprocess() {
  let builds = result.col('build_index').categories;
  let buildNames = result.col('build').categories.sort();

  let pivot = result
    .groupBy(['test', 'owner'])
    .pivot('build_index')
    .avg('duration')
    .avg('build_date')
    .first('flaking')
    .add(DG.STR_AGG.CONCAT_UNIQUE, 'status')
    .add(DG.STR_AGG.CONCAT_UNIQUE, 'result')
    .aggregate();

  function generateCommonValueFormula(operation, suffix, value) {
    var result = '';
    if (builds.length == 1)
      return '${' + builds[0] + suffix + value;
    for (var i = 0; i + 2 < builds.length; i++)
      result += operation + '(${' + builds[i] + suffix + value + ',';
    result += operation + '(${' + builds[builds.length - 2] + suffix + value + ',${' +  builds[builds.length - 1] + suffix + value + ')';
    for (var i = 0; i + 2 < builds.length; i++)
      result += ')';
    return result;
  }

  function generateColumnListFormula(suffix) {
    var result = '';
    if (builds.length == 1)
      return '${' + builds[0] + suffix + '}';
    for (var i = 0; i < builds.length; i++) {
      if (i) result += ',';
      result += '${' + builds[i] + suffix + '}';
    }
    return result;
  }

  await pivot.columns.addNewCalculated('min', 'Min([' + generateColumnListFormula(' avg(duration)') + '])');
  await pivot.columns.addNewCalculated('max', 'Max([' + generateColumnListFormula(' avg(duration)') + '])');
  await pivot.columns.addNewCalculated('has_suspicious', 'And(${min} / ${max} < 0.5, ${max} - ${min} > 1000)');
  // await pivot.columns.addNewCalculated('deviation', 'Sqrt(Variance([' + generateColumnListFormula(' avg(duration)') + ']))');
  // await pivot.columns.addNewCalculated('has_suspicious', 'Or(${min} < ${mean} - 1.5 * ${deviation}, ${mean} + 1.5 * ${deviation} < ${max})');
  // await pivot.columns.addNewCalculated('mean', 'Avg([' + generateColumnListFormula(' avg(duration)') + '])');
  // await pivot.columns.addNewCalculated('stable', generateCommonValueFormula("And", ' concat unique(status)}', '== "passed"'), 'bool');
  // await pivot.columns.addNewCalculated('failing', generateCommonValueFormula("Or", ' concat unique(status)}', '== "failed"'), 'bool');
  // await pivot.columns.addNewCalculated('flaking', generateCommonValueFormula("Or", ' first(flaking)}', '== true'), 'bool');
  // await pivot.columns.addNewCalculated('needs_attention', "Or(${flaking},${failing})", 'bool');

  function replaceColumn(prefix, type, buildName, newType) {
    var col = pivot.columns.byName(prefix + type);
    col?.setTag('friendlyName', buildName + newType);
  }

  pivot.columns.byName('owner').semType = 'User';
  pivot.columns.byName('owner').setTag('cell.renderer', 'User');
  pivot.columns.byName('test').semType = 'autotest';

  for (var i = 1; i <= builds.length; i++) {
    var buildName = buildNames[i - 1];
    replaceColumn(i, ' concat unique(status)', i, '');
    replaceColumn(i, ' concat unique(result)', buildName, ' result');
    replaceColumn(i, ' avg(build_date)', buildName, ' build_date');
    replaceColumn(i, ' avg(duration)', buildName, ' duration');
  }

  // const jsonColumn = pivot.columns.addNewString('duration');
  // jsonColumn.semType = FIT_SEM_TYPE;
  // for (let i = 0; i < pivot.rowCount; i++) {
  //   var chartData = {
  //     series: [{
  //       fitFunction: "linear",
  //       points: [
  //         {x: 1, y: pivot.columns.byName('1 avg(duration)').get(i)},
  //         {x: 2, y: pivot.columns.byName('2 avg(duration)').get(i)},
  //         {x: 3, y: pivot.columns.byName('3 avg(duration)').get(i)},
  //         {x: 4, y: pivot.columns.byName('4 avg(duration)').get(i)},
  //         {x: 5, y: pivot.columns.byName('5 avg(duration)').get(i)},
  //       ]
  //     }]
  //   };
  //   jsonColumn.set(i, JSON.stringify(chartData));
  // }
  pivot.name = '1. Benchmark Dashboard';

  out = pivot;
}


if (result.rowCount == 0)  {
  out = DG.DataFrame.fromColumns([
    DG.Column.fromType('string', 'test', 1),
    DG.Column.fromType('string', 'owner', 1)
  ]);
}
else
  await postprocess();