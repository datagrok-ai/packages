/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {initSolvers} from '../wasm/solving-tools';
import {showHelpPanel} from '../wasm/help-panel';
import {simPKPD} from './pk-pd-tools';

export const _package = new DG.Package();

//tags: init
export async function init(): Promise<void> {
  await initSolvers();
}

//name: PK-PD
//description: Two-compartment pharmacokinetic-pharmacodynamic (PK-PD) simulation
//tags: model
//input: double dose = 10000.0 {units: um; caption: dose; category: Dosing; min: 1000; max: 20000; step: 1000} [Dosage]
//input: int dosesCount = 10 {caption: count; category: Dosing; min: 1; max: 15; step: 1} [Number of doses]
//input: double doseInterval = 12 {units: h; caption: interval; category: Dosing; min: 1; max: 48; step: 1} [Dosing interval]
//input: double KA = 0.3 {caption: rate constant; category: PK parameters; min: 0.1; max: 2}
//input: double CL = 2.0 {caption: clearance; category: PK parameters; min: 1; max: 10}
//input: double V2 = 4.0 {caption: central volume; category: PK parameters; min: 1; max: 10} [Central compartment volume]
//input: double Q = 1.0 {caption: intercompartmental rate; category: PK parameters; min: 1; max: 10}
//input: double V3 = 30.0 {caption: peripheral volume; category: PK parameters; min: 1; max: 40} [Peripheral compartment volume]
//input: double eff = 0.2 {caption: effective rate; category: PD parameters; min: 0.1; max: 2} [Effective compartment rate]
//input: double EC50 = 8.0 {caption: EC50; category: PD parameters; min: 1; max: 10} [Effect]
//output: dataframe simResults {caption: PK-PD simulation; viewer: Line chart(xColumnName: "Time [h]", block: 50) | Grid(block: 50) }
//editor: Compute:RichFunctionViewEditor
//meta.runOnOpen: true
//meta.runOnInput: true
//meta.keepOutput: true
//meta.features: {"sens-analysis": true, "fitting": true}
export async function simulatePKPD(dose: number, dosesCount: number, doseInterval: number, KA: number, CL: number, V2: number, Q: number, V3: number, eff: number, EC50: number): Promise<DG.DataFrame> {
  return await simPKPD('2 compartment PK', dose, dosesCount, doseInterval, KA, CL, V2, Q, V3, eff, eff, EC50);
}

//name: PKPD Demo
//description: Pharmacokinetic-Pharmacodynamic (PK-PD) simulation
//input: double dose = 10000.0 {units: um; caption: dose; category: Dosing; min: 1000; max: 20000; step: 1000} [Dosage]
//input: int dosesCount = 10 {caption: count; category: Dosing; min: 1; max: 15; step: 1} [Number of doses]
//input: double doseInterval = 12 {units: h; caption: interval; category: Dosing; min: 1; max: 48; step: 1} [Dosing interval]
//input: double KA = 0.3 {caption: rate constant; category: PK parameters; min: 0.0001; max: 10}
//input: double CL = 2.0 {caption: clearance; category: PK parameters; min: 0.0001; max: 1000}
//input: double V2 = 4.0 {caption: central volume; category: PK parameters; min: 0.0001; max: 100} [Central compartment volume]
//input: double Q = 1.0 {caption: intercompartmental rate; category: PK parameters; min: 0.0001; max: 10}
//input: double V3 = 30.0 {caption: peripheral volume; category: PK parameters; min: 0.0001; max: 100} [Peripheral compartment volume]
//input: double eff = 0.2 {caption: effective rate; category: PD parameters; min: 0.0001; max: 10} [Effective compartment rate]
//input: double EC50 = 8.0 {caption: EC50; category: PD parameters; min: 0.1; max: 100} [Effect]
//output: dataframe simResults {caption: PK-PD simulation; viewer: Line chart(xColumnName: "Time [h]", block: 100)}
//editor: Compute:RichFunctionViewEditor
//meta.runOnOpen: true
//meta.runOnInput: true
export async function simulatePkPdDemo(dose: number, dosesCount: number, doseInterval: number, KA: number, CL: number, V2: number, Q: number, V3: number, eff: number, EC50: number): Promise<DG.DataFrame> {
  return await simPKPD('2 compartment PK', dose, dosesCount, doseInterval, KA, CL, V2, Q, V3, eff, eff, EC50);
}

//name: PK-PD Simulation Demo
//description: In-browser two-compartment pharmacokinetic-pharmacodynamic (PK-PD) simulation
//meta.demoPath: Compute | PK-PD modeling
//test: demoSimPKPD() //wait: 100
export async function demoSimPKPD(): Promise<any> {
  const doeSimpleFunc: DG.Func = await grok.functions.eval('SimPKPD:simulatePkPdDemo');
  const doeSimpleFuncCall = doeSimpleFunc.prepare();

  const openModelFunc: DG.Func = await grok.functions.eval('Compute:openModelFromFuncall');
  const openModelFuncCall = openModelFunc.prepare({'funccall': doeSimpleFuncCall});
  await openModelFuncCall.call();

  showHelpPanel();
}
