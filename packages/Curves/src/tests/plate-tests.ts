import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';

import {category, test, expect, expectArray} from '@datagrok-libraries/utils/src/test';
import {Plate} from "../plate/plate";
import wu from 'wu';

// @ts-ignore
import * as jStat from 'jstat';
import {
  FitChartData,
  fitData,
  IFitChartData,
  LogLinearFunction
} from "@datagrok-libraries/statistics/src/fit/fit-curve";
import {excelToNum, numToExcel} from "../plate/utils";
import {FitConstants} from "../fit/const";
import {MultiCurveViewer} from "../fit/multi-curve-viewer";
import {PlateWidget} from "../plate/plate-widget";


function getPlate(): Plate {
  const concentration = Plate.fromCsvTable(concentrationCsv, 'concentration');
  const layout = Plate.fromCsvTable(layoutCsv, 'role');
  const readout = Plate.fromCsvTable(readoutCsv, 'readout');

  return Plate.fromPlates([concentration, layout, readout]);
}

category('plates', () => {
  test('fromCsvPlate', async () => {
    const plate = Plate.fromCsv(concentrationCsv, { field: 'concentration' });
    plate.print();
    expect(plate.rows, 16);
    expect(plate.cols, 24);
  });

  test('mergePlates', async () => {
    const concentration = Plate.fromCsvTable(concentrationCsv, 'concentration');
    const layout = Plate.fromCsvTable(layoutCsv, 'role');
    const readout = Plate.fromCsvTable(readoutCsv, 'value');

    readout.merge(layout).merge(concentration).print();
  });

  test('fromFile', async () => {
    const concentration = await Plate.fromCsvTableFile('System:DemoFiles/hts/plate/concentration.csv', 'concentration');
    const layout = await Plate.fromCsvTableFile('System:DemoFiles/hts/plate/layout.csv', 'role');
    const readout = await Plate.fromCsvTableFile('System:DemoFiles/hts/plate/readout.csv', 'value');

    Plate.fromPlates([concentration, layout, readout]).print();
  });

  test('fromExcel', async () => {
    const plate = await Plate.fromExcel('System:DemoFiles/hts/plate/plate.xlsx');
    ui.dialog({title: 'Inspect plate'})
      .add(PlateWidget.detailedView(plate.data).root)
      .show({width: 500, height: 500});
    await DG.delay(10000);
  });

  test('normalization', async () => {
    const plate = getPlate();

    const hcMean = jStat.mean(plate.fieldValues('readout', {match: {'layout': 'High Control'}}));
    const lcMean = jStat.mean(plate.fieldValues('readout', {match: {'layout': 'Low Control'}}));
    plate.normalize('readout', value => (hcMean - value) / (hcMean - lcMean));
  });

  test('use case', async () => {
    const plate = getPlate();

    const hcMean = jStat.mean(plate.fieldValues('readout', {match: {'layout': 'High Control'}}));
    const lcMean = jStat.mean(plate.fieldValues('readout', {match: {'layout': 'Low Control'}}));
    plate.normalize('readout', value => (hcMean - value) / (hcMean - lcMean));

    const c1series = plate.doseResponseSeries({concentration: 'concentration', value: 'readout'});
    //const c1fit = fitData(c1series, new LogLinearFunction());
    //console.log(c1fit);

    // now let's make a widget out of it
    // const fitChartData: IFitChartData = {
    //   seriesOptions: { fitFunction: 'log-linear', parameters: [...c1fit.parameters]},
    //   series: [{points: wu(DG.range(c1series.x.length)).map(i => ({ x: c1series.x[i], y: c1series.y[i]})).toArray()}]
    // }

    // const chart = MultiCurveViewer.fromChartData(fitChartData);
    // chart.curvesColumnNames = ['foo'];  // why is it needed?
    // ui.dialog({title: 'Inspect fit'})
    //   .add(chart.root)
    //   .show();

    // await DG.delay(10000);
  });

  // test('tt', async () => {
  //   const concentration = Plate.fromCsvTable(concentrationCsv, 'concentration');
  //   const layout = Plate.fromCsvTable(layoutCsv, 'role');
  //   const readout = Plate.fromCsvTable(readoutCsv, 'readout');
  //
  //   const plate = Plate.fromPlates([concentration, layout, readout]);
  //
  //   const hcMean = jStat.mean(plate.values('readout', {match: {'layout': 'High Control'}}));
  //   const hcMea1 = readout.values({'layout': 'High Control'}).mean();
  //
  //   plate.getSeries({ split: 'compoundId', filter: {'layout': (role) => role.startsWith('Compound')} })
  //     .map((series) => series.fit(...))
  //
  //   plate.getDoseResponseCurves({
  //     split: 'compoundId',
  //     filter: {'layout': (role) => role.startsWith('Compound')},
  //     fit: (series) => series.fit(...),
  //     include: (fitResult: IFitResult) => {
  //       ic50: fitResult.ic50
  //     }
  //   });  // DataFrame
  // });

  test('render', async () => {
    const plate = getPlate();
    ui.dialog({title: 'Inspect plate'})
      .add(PlateWidget.detailedView(plate.data).root)
      .show({width: 500, height: 500});
    await DG.delay(10000);
  });

  test('numToExcel', async () => {
    expect(numToExcel(0), 'A');
    expect(numToExcel(1), 'B');
    expect(numToExcel(26), 'AA');
    expect(numToExcel(52), 'BA');
  });

  test('excelToNum', async () => {
    expect(excelToNum('A'), 0);
    expect(excelToNum('B'), 1);
    expect(excelToNum('Z'), 25);

    expect(excelToNum('AA'), 26);
    expect(excelToNum('BA'), 52);
  });
});




const concentrationCsv = `col 1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24
A,,,,,,,,,,,,,,,,,,,,,,,,
B,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
C,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
D,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
E,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
F,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
G,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
H,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
I,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
J,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
K,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
L,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
M,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
N,,0.00001,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,
O,,0.00000,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00001,0.00000403,0.00000163,0.000000656,0.000000265,0.000000107,0.0000000431,0.0000000174,0.00000000701,0.00000000183,0.00000,
P,,,,,,,,,,,,,,,,,,,,,,,,`;


const layoutCsv = `col 1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24
A,,,,,,,,,,,,,,,,,,,,,,,,
B,,Low Control,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Low Control,
C,,High Control,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 1,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,Compound 41,High Control,
D,,Low Control,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Low Control,
E,,High Control,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 42,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,Compound 43,High Control,
F,,Low Control,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Low Control,
G,,High Control,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 44,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,Compound 45,High Control,
H,,Low Control,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Low Control,
I,,High Control,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 46,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,Compound 47,High Control,
J,,Low Control,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Low Control,
K,,High Control,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 48,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,Compound 49,High Control,
L,,Low Control,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Low Control,
M,,High Control,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 50,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,Compound 51,High Control,
N,,Low Control,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Low Control,
O,,High Control,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 52,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,Compound 53,High Control,
P,,,,,,,,,,,,,,,,,,,,,,,,`;


const readoutCsv = `col 1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24
A,,,,,,,,,,,,,,,,,,,,,,,,
B,,0.07219099668,0.06947737465,0.07019976172,0.07263956168,0.07334269904,0.07654089128,0.07628940202,0.08834969214,0.13557287840,0.1486864679,0.1503697113,0.15200083420,0.15061775480,0.15309907440,0.15286653780,0.15379914010,0.15155727890,0.15232794460,0.15298766400,0.1538730651,0.1542393465,0.15071555580,
C,,0.14996855360,0.07212290660,0.06957076093,0.07069321642,0.07227733865,0.07664359412,0.07918610560,0.07808503586,0.12496495030,0.1378908893,0.1465698921,0.15578283900,0.15186884230,0.15151635070,0.15141401530,0.15052587190,0.15486747600,0.15294037650,0.15241116130,0.1546532344,0.1537365814,0.07231605295,
D,,0.07023863668,0.07030474895,0.07086594623,0.07378772619,0.07813099195,0.08443275691,0.10024937710,0.11821695280,0.14031173800,0.1505845411,0.1505987702,0.07099481653,0.07322787956,0.07588648236,0.08377558210,0.09888790085,0.11395358370,0.12947949180,0.14055841590,0.1493699333,0.1540055735,0.15226875140,
E,,0.14929130930,0.06932695867,0.07157716491,0.07214187679,0.07721194315,0.08504549754,0.10174360480,0.11748417490,0.13321393730,0.1456650512,0.1483001297,0.07167267085,0.07383087952,0.07670410142,0.08204578635,0.09386326869,0.11296832520,0.30900000000,0.13807843210,0.1487301787,0.1519785410,0.07219836243,
F,,0.07063914398,0.07039007372,0.07078597316,0.07132027961,0.07222210814,0.07442561862,0.08135627908,0.09196745273,0.11146019360,0.1364485205,0.1450632971,0.08126099235,0.09318398047,0.10961914380,0.12860206080,0.14110717340,0.14655533300,0.15212245890,0.15233422070,0.1521740437,0.1539843278,0.15514745160,
G,,0.15147635060,0.07238581078,0.06968522213,0.07128524617,0.07252406181,0.07567350355,0.07943235275,0.09117074615,0.10537654310,0.1344820888,0.1400224330,0.08242500433,0.09563371204,0.10936069820,0.12848949680,0.14108995770,0.14405660970,0.15031406210,0.15131600980,0.1522018720,0.1534152011,0.07219962790,
H,,0.07201551934,0.14139074650,0.10970399700,0.14927003800,0.15153471030,0.15239784500,0.15275285200,0.15300022370,0.15204696770,0.1499048651,0.1522479639,0.08013306126,0.08511773454,0.09873312909,0.11965236570,0.13423325770,0.14790643020,0.14787378410,0.15121033310,0.1516832849,0.1546688514,0.15391338010,
I,,0.15106747120,0.14298828240,0.14478508750,0.14400005770,0.12812788070,0.15020659840,0.15070640480,0.14981230230,0.15107167610,0.1525554191,0.1492535524,0.08018720930,0.08601155699,0.09880353225,0.11672648890,0.13325225690,0.14354164670,0.14463708830,0.15318329890,0.1521327032,0.1512182552,0.07244861048,
J,,0.07134151692,0.07106139536,0.07290563639,0.07320964199,0.07531163459,0.08077714646,0.08726929940,0.10068593880,0.11914215450,0.1418191958,0.1443463920,0.07247201272,0.06999750950,0.07076991276,0.07228675508,0.07237591892,0.07201251723,0.07741640477,0.08773368972,0.1219768071,0.1387552698,0.15192226570,
K,,0.15000436380,0.07156625599,0.07087075250,0.07123659002,0.07345421874,0.07832545577,0.08734304748,0.09985159477,0.11591447310,0.1397237122,0.1459823861,0.07214517236,0.07005683091,0.07016838344,0.07131776580,0.07200174821,0.07350492337,0.07785311421,0.08866229169,0.1234911377,0.1371697196,0.07064796366,
L,,0.07054096934,0.07004726921,0.07201825002,0.07179815990,0.07268889103,0.07379454514,0.07427085340,0.07982570255,0.08854676858,0.1198873673,0.1322562498,0.07034679393,0.07523627163,0.07582258339,0.08392782907,0.09669262374,0.11261560310,0.12874291890,0.14171585180,0.1491004443,0.1502214336,0.15198125010,
M,,0.15232172270,0.07166689716,0.07099964730,0.07172948942,0.07140356089,0.07359647053,0.07391627346,0.07872536050,0.08793247921,0.1177668597,0.1316288144,0.06733039177,0.07260462946,0.07516068933,0.08359475310,0.09611904399,0.11364151330,0.12772328380,0.14070692820,0.1486696188,0.1541842928,0.07174453270,
N,,0.07126884935,0.07332587669,0.07786873273,0.08482253378,0.10140499840,0.11854947500,0.13401382360,0.14613488070,0.15066237370,0.1545757395,0.1510962397,0.07286614211,0.07215169457,0.07227939024,0.07337505876,0.07530546981,0.08265249465,0.09167518260,0.11122719660,0.1391977320,0.1459690588,0.15291802550,
O,,0.15243482930,0.07280165939,0.07688708790,0.31500000000,0.09886803400,0.11454911710,0.12960429510,0.14047477320,0.14718270040,0.1509524590,0.1501338551,0.07212897291,0.07072700474,0.07059273173,0.07088234657,0.07421414395,0.08105493058,0.09094554089,0.10660934950,0.1358113503,0.1432621746,0.07009305748,
P,,,,,,,,,,,,,,,,,,,,,,,,`;