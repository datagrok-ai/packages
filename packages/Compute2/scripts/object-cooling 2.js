//name: Object Cooling (Compute 2 Test)
//description: Uses Newton's law of cooling to simulate object cooling process. Default values are for cube of boiling water in air.
//language: javascript
//tags: simulation, demo, test
//input: double ambTemp = 22 {caption: Ambient temperature; units: C; category: Environment; block: 50 }
//input: double initTemp = 100 {caption: Initial temperature; units: C; category: Environment; block: 50 }
//input: double desiredTemp = 30 {caption: Desired temperature; units: C; category: Environment }
//input: double area = 0.06 {caption: Surface area; units: m²; category: Object properties }
//input: double heatCap = 4200 {caption: Heat capacity; units: J/C; category: Object properties }
//input: double heatTransferCoeff = 8.3 {caption: Heat transfer coefficient; units: W/(m² * C); category: Object properties }
//input: int simTime = 21600 {caption: Simulation time; units: sec; category: Simulation }
//output: dataframe simulation {caption: Temp. vs time; category: Output; viewer: Line chart(block: 75) | Grid(block: 25)}
//output: double timeToCool {caption: Time to cool; units: sec.; category: Output}
//output: double coolingFactor {caption: Cooling factor; units: 1 / sec.; category: Calculations; precision: 5}
//output: double tempDiff {caption: Temperature difference; units: C; category: Calculations}
//editor: Compute2:RichFunctionViewEditor
//meta.features: {"sens-analysis": true, "fitting": true}

timeToCool = undefined;

const tempDiff = initTemp - ambTemp;
const coolingFactor = heatTransferCoeff * area / heatCap;

const timeStamps = new Float32Array(simTime).map((_, idx) => idx);
const simulatedTemp = timeStamps.map((timeStamp) => {
  const currentTemp = ambTemp + (tempDiff * (Math.E ** -(coolingFactor * timeStamp)));

  if (!timeToCool && currentTemp < desiredTemp)
    timeToCool = timeStamp;


  return currentTemp;
});

simulation = DG.DataFrame.fromColumns([
  DG.Column.fromFloat32Array('Time', timeStamps),
  DG.Column.fromFloat32Array('Temperature', simulatedTemp),
]);
