/* eslint-disable max-len */
/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {solveDefault, solveIVP} from './solver-tools';
import {DiffStudio} from './app';
import {getIVP, IVP, getScriptLines, getScriptParams} from './scripting-tools';

import {getBioreactorSim, getPkPdSim, showBioHelpPanel, showPkPdHelpPanel, getBallFlightSim} from './demo-models';
import {DF_NAME} from './constants';

import {ODEs, SolverOptions} from '@datagrok/diff-grok';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: init
export async function init() {}

//name: solve
//input: object problem
//output: dataframe df
export function solve(problem: ODEs): DG.DataFrame {
  return solveDefault(problem);
}

//name: solveEquations
//input: object problem
//input: object options
//output: dataframe df
export function solveEquations(problem: ODEs, options: Partial<SolverOptions>): DG.DataFrame {
  return solveIVP(problem, options);
}

//name: Diff Studio
//description: Solver of ordinary differential equations systems
//tags: app
//output: view v
//meta.browsePath: Compute
export async function runDiffStudio(): Promise<DG.ViewBase> {
  const solver = new DiffStudio(false);
  return await solver.runSolverApp();
}

//name: Diff Studio Demo
//description: Interactive solver of ordinary differential equations (ODE)
//meta.demoPath: Compute | Diff Studio
//test: runDiffStudioDemo() //wait: 100
export async function runDiffStudioDemo(): Promise<void> {
  const solver = new DiffStudio();
  await solver.runSolverDemoApp();
}

//name: ivpFileHandler
//tags: file-handler
//input: string content
//output: list tables
//meta.ext: ivp
export async function ivpFileHandler(content: string) {
  const solver = new DiffStudio();
  await solver.runSolverApp(content);

  return [];
}

//name: previewIvp
//tags: fileViewer
//meta.fileViewer: ivp
//input: file file
//output: view preview
export async function previewIvp(file: DG.FileInfo): Promise<DG.View> {
  let path: string;

  if (!DiffStudio.isStartingUriProcessed) {
    DiffStudio.isStartingUriProcessed = true;
    path = grok.shell.startUri;
  } else
    path = window.location.href;

  const solver = new DiffStudio(false, true, true);
  return await solver.getFilePreview(file, path);
}

//input: dynamic treeNode
//input: view browseView
export async function runDiffStudioTreeBrowser(treeNode: DG.TreeViewGroup, browseView: DG.BrowseView) {
  //console.log(treeNode);
  new DiffStudio(false, false, false, {treeNode: treeNode, browseView: browseView});
}

//name: Bioreactor
//tags: model
//description: Controlled fab-arm exchange mechanism simulation
//input: double t0 = 0 {units: min; caption: Initial; category: Time} [Initial time of simulation]
//input: double t1 = 1000 {units: min; caption: Final; category: Time; min: 500; max: 1000} [Final time of simulation]
//input: double h = 1 {units: min; caption: Step; category: Time; min: 0.1; max: 2} [Time step of simlulation]
//input: double switchTime = 135 {units: min; caption: switch at; category: Time; min: 70;max: 180; step: 10} [Switch mode time]
//input: double FFox = 0.2 {units: mmol/L; caption: FF oxidized (FFox); category: Initial values; min: 0.15; max: 0.25; step: 0.01} [FF oxidized]
//input: double KKox = 0.2 {units: mmol/L; caption: KK oxidized (KKox); category: Initial values; min: 0.15; max: 0.25; step: 0.01} [KK oxidized]
//input: double FFred = 0.1 {units: mmol/L; caption: FF reduced (FFred); category: Initial values; min: 0.08; max: 0.12; step: 0.01} [FF reduced]
//input: double KKred = 0.1 {units: mmol/L; caption: KK reduced (KKred); category: Initial values; min: 0.08; max: 0.12; step: 0.01} [KK reduced]
//input: double Ffree = 0 {units: mmol/L; caption: F free (Ffree); category: Initial values} [F free]
//input: double Kfree = 0 {units: mmol/L; caption: K free (Ffree); category: Initial values} [K free]
//input: double FKred = 0 {units: mmol/L; caption: FK reduced (FKred); category: Initial values} [FK reduced]
//input: double FKox = 0 {units: mmol/L; caption: FK oxidized (FKox); category: Initial values} [FK oxidized]
//input: double MEAthiol = 15 {units: mmol/L; caption: MEAthiol (MEA); category: Initial values; min: 10; max: 16} [MEAthiol]
//input: double CO2 = 0.12 {units: mmol/L; caption: Dissolved oxygen (CO2); category: Initial values; min: 0.09; max: 0.15} [Dissolved oxygen]
//input: double yO2P = 0.209 {units: atm; caption: Atm headspace (yO2P); category: Initial values} [Atm headspace]
//input: double CYST = 0 {units: mmol/L; caption: Cystamine (CYST); category: Initial values} [Cystamine]
//input: double VL = 7.2 {units: L; caption: Liquid volume (VL); category: Initial values} [Liquid volume]
//input: double qin = 1 {units: L/min; caption: Gas; caption: Gas; category: Parameters;  min: 0.5; max: 1.5} [Gas to headspace]
//input: double yO2in = 0.21 {caption: O2 fraction; category: Parameters;  min: 0.1; max: 0.9} [Oxygen mole fraction]
//input: double T = 300 {units: K; caption: temperature; category: Parameters;  min: 250; max: 350} [System temperature]
//input: double P = 1 {units: atm; caption: pressure; category: Parameters;  min: 1;max: 2} [Headspace pressure]
//output: dataframe Bioreactor {viewer: Line chart(block: 100, multiAxis: "true", multiAxisLegendPosition: "RightCenter", autoLayout: "false", showAggrSelectors: "false") | Grid(block: 100)}
//editor: Compute:RichFunctionViewEditor
//sidebar: @compute
//meta.runOnOpen: true
//meta.runOnInput: true
//meta.features: {"sens-analysis": true, "fitting": true}
//meta.icon: files/icons/bioreactor.png
export function Bioreactor(t0: number, t1: number, h: number, switchTime: number, FFox: number, KKox: number, FFred: number,
  KKred: number, Ffree: number, Kfree: number, FKred: number, FKox: number, MEAthiol: number, CO2: number,
  yO2P: number, CYST: number, VL: number, qin: number, yO2in: number, T: number, P: number): DG.DataFrame {
  return getBioreactorSim(t0, t1, h, FFox, KKox, FFred, KKred, Ffree, Kfree, FKred, FKox, MEAthiol, CO2,
    yO2P, CYST, VL, qin, yO2in, T, P, switchTime);
}

//name: Bioreactor Demo
//description: In-browser simulation of controlled fab-arm exchange mechanism
//meta.demoPath: Compute | Bioreactor
//test: demoBioreactor() //wait: 100
export async function demoBioreactor(): Promise<any> {
  const doeSimpleFunc: DG.Func = await grok.functions.eval('DiffStudio:Bioreactor');
  const doeSimpleFuncCall = doeSimpleFunc.prepare();

  const openModelFunc: DG.Func = await grok.functions.eval('Compute:openModelFromFuncall');
  const openModelFuncCall = openModelFunc.prepare({'funccall': doeSimpleFuncCall});
  await openModelFuncCall.call();

  showBioHelpPanel();
}

//name: PK-PD
//tags: model
//description: Pharmacokinetic-pharmacodynamic (PK-PD) simulation: two-compartment model
//input: double dose = 10000 {caption: dose; category: Dosing; min: 1000; max: 20000; step: 1000} [Dosage]
//input: int count = 10 {caption: count; category: Dosing; min: 1; max: 15; step: 1} [Number of doses]
//input: double interval = 12 {units: h; caption: interval; category: Dosing; min: 1; max: 48; step: 1} [Dosing interval]
//input: double KA = 0.3 {caption: rate constant; category: PK parameters; min: 0.1; max: 2}
//input: double CL = 2.0 {caption: clearance; category: PK parameters; min: 1; max: 10}
//input: double V2 = 4.0 {caption: central volume; category: PK parameters; min: 1; max: 10} [Central compartment volume]
//input: double Q = 1.0 {caption: intercompartmental rate; category: PK parameters; min: 1; max: 10}
//input: double V3 = 30.0 {caption: peripheral volume; category: PK parameters; min: 1; max: 40} [Peripheral compartment volume]
//input: double eff = 0.2 {caption: effective rate; category: PD parameters; min: 0.1; max: 2} [Effective compartment rate]
//input: double EC50 = 8.0 {caption: EC50; category: PD parameters; min: 1; max: 10} [Effect]
//output: dataframe simResults {caption: PK-PD simulation; viewer: Line chart(xColumnName: "Time [h]", block: 50) | Grid(block: 50) }
//editor: Compute:RichFunctionViewEditor
//sidebar: @compute
//meta.runOnOpen: true
//meta.runOnInput: true
//meta.features: {"sens-analysis": true, "fitting": true}
//meta.icon: files/icons/pkpd.png
export function pkPd(dose: number, count: number, interval: number, KA: number, CL: number, V2: number, Q: number,
  V3: number, eff: number, EC50: number): DG.DataFrame {
  return getPkPdSim(dose, count, interval, KA, CL, V2, Q, V3, eff, EC50);
}

//name: PK-PD demo
//description: Pharmacokinetic-pharmacodynamic (PK-PD) simulation: two-compartment model
//input: double dose = 10000 {caption: dose; category: Dosing; min: 1000; max: 20000; step: 1000} [Dosage]
//input: int count = 10 {caption: count; category: Dosing; min: 1; max: 15; step: 1} [Number of doses]
//input: double interval = 12 {units: h; caption: interval; category: Dosing; min: 1; max: 48; step: 1} [Dosing interval]
//input: double KA = 0.3 {caption: rate constant; category: PK parameters; min: 0.1; max: 2}
//input: double CL = 2.0 {caption: clearance; category: PK parameters; min: 1; max: 10}
//input: double V2 = 4.0 {caption: central volume; category: PK parameters; min: 1; max: 10} [Central compartment volume]
//input: double Q = 1.0 {caption: intercompartmental rate; category: PK parameters; min: 1; max: 10}
//input: double V3 = 30.0 {caption: peripheral volume; category: PK parameters; min: 1; max: 40} [Peripheral compartment volume]
//input: double eff = 0.2 {caption: effective rate; category: PD parameters; min: 0.1; max: 2} [Effective compartment rate]
//input: double EC50 = 8.0 {caption: EC50; category: PD parameters; min: 1; max: 10} [Effect]
//output: dataframe simResults {caption: PK-PD simulation; viewer: Line chart(xColumnName: "Time [h]", block: 100)}
//editor: Compute:RichFunctionViewEditor
//meta.runOnOpen: true
//meta.runOnInput: true
export function pkPdDemo(dose: number, count: number, interval: number, KA: number, CL: number, V2: number, Q: number,
  V3: number, eff: number, EC50: number): DG.DataFrame {
  return getPkPdSim(dose, count, interval, KA, CL, V2, Q, V3, eff, EC50);
}

//name: PK-PD Simulation Demo
//description: In-browser two-compartment pharmacokinetic-pharmacodynamic (PK-PD) simulation
//meta.demoPath: Compute | PK-PD Modeling
//test: demoSimPKPD() //wait: 100
export async function demoSimPKPD(): Promise<any> {
  const doeSimpleFunc: DG.Func = await grok.functions.eval('DiffStudio:pkPdDemo');
  const doeSimpleFuncCall = doeSimpleFunc.prepare();

  const openModelFunc: DG.Func = await grok.functions.eval('Compute:openModelFromFuncall');
  const openModelFuncCall = openModelFunc.prepare({'funccall': doeSimpleFuncCall});
  await openModelFuncCall.call();

  showPkPdHelpPanel();
}

//name: Ball flight
//tags: model
//description: Ball flight simulation
//input: double dB = 0.01 {category: Ball; caption: Diameter; units: m; min: 0.01; max: 0.3}
//input: double roB = 200 {category: Ball; caption: Density; units: kg/m^3; min: 200; max: 1200} [Material density]
//input: double v = 50 {category: Throw parameters; caption: Velocity; min: 40; max: 60; units: m/sec}
//input: double a = 45 {category: Throw parameters; caption: Angle; min: 20; max: 70; units: deg}
//output: double maxDist {caption: Max distance}
//output: double maxHeight {caption: Max height}
//output: dataframe df {caption: Trajectory; viewer: Line chart(block: 60, multiAxis: "false", multiAxisLegendPosition: "RightCenter", autoLayout: "false", showAggrSelectors: "false") | Grid(block: 40)}
//editor: Compute:RichFunctionViewEditor
//sidebar: @compute
//meta.runOnOpen: true
//meta.runOnInput: true
//meta.features: {"sens-analysis": true, "fitting": true}
//meta.icon: files/icons/ball.png
export function ballFlight(dB: number, roB: number, v: number, a: number) {
  const simlulation = getBallFlightSim(v, Math.PI * a / 180, dB, roB);
  return {
    df: simlulation,
    maxDist: simlulation.col('Distance').stats.max,
    maxHeight: simlulation.col('Height').stats.max,
  };
}

//name: serializeEquations
//description: Return serialized initial value problem for ordinary differential equations
//input: string problem
//output: object serialization
export function serializeEquations(problem: string): IVP {
  return getIVP(problem);
}

//name: odesToCode
//description: Perform ODEs serialization to JS-code
//input: object serialization
//output: string code
export function odesToCode(serialization: IVP): string {
  return getScriptLines(serialization).join('\n');
}

//name: solveODE
//description: Solve initial value problem for ordinary differential equations
//input: string problem
//output: dataframe solution
export async function solveODE(problem: string): Promise<DG.DataFrame> {
  const ivp = getIVP(problem);
  const code = getScriptLines(ivp).join('\n');

  const script = DG.Script.create(code);
  const params = getScriptParams(ivp);
  const call = script.prepare(params);

  await call.call();

  return call.outputs[DF_NAME];
}
