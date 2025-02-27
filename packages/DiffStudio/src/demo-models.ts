// Items for Model catalog

import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {solveDefault} from './solver-tools';
import '../css/app-styles.css';
import {LINK} from './ui-constants';

enum PK_PD {
  INITIAL = 0,
  STEP = 0.12,
  DEPOT = 0,
  CENTRAL = 0,
  PERIFERAL = 0,
  EFFECT = 1,
};

/** Return dataframe with the Bioreactor simulation */
export function getBioreactorSim(t0: number, t1: number, h: number, FFox: number, KKox: number, FFred: number,
  KKred: number, Ffree: number, Kfree: number, FKred: number, FKox: number, MEAthiol: number, CO2: number,
  yO2P: number, CYST: number, VL: number, qin: number, yO2in: number, T: number, P: number,
  switchTime: number): DG.DataFrame {
  // constants
  const VLinit = 7.2;
  const VTV = 10;
  const speed = 400;
  const diam = 6;
  const power = 2.1;
  const pH = 7.4;
  const k1red = 0.05604;
  const k1ox = 0.0108;
  const k2Fd = 1.35;
  const k2Fa = 110400000;
  const k2Kd = 0.04038;
  const k2Ka = 120000000;
  const k3FKa = 181200000;
  const k3FKd = 0.01188;
  const k4ox = 0.0108;
  const k4red = 0.05604;
  const ktox = 0.005;
  const krcyst = 0;
  const pO2sat = 100;
  const pKa2MEA = 8.18;
  const H = 1.072069378;
  const R = 0.082;

  // the problem definition
  const odes = {
    name: 'Bioreactor',
    arg: {name: 't', start: t0, finish: t1, step: h},
    initial: [FFox, KKox, FFred, KKred, Ffree, Kfree, FKred, FKox, MEAthiol, CO2, yO2P, CYST, VL],
    func: (t: number, y: Float64Array, output: Float64Array) => {
      // extract function values
      const FFox = y[0];
      const KKox = y[1];
      const FFred = y[2];
      const KKred = y[3];
      const Ffree = y[4];
      const Kfree = y[5];
      const FKred = y[6];
      const FKox = y[7];
      const MEAthiol = y[8];
      const CO2 = y[9];
      const yO2P = y[10];
      const CYST = y[11];
      const VL = y[12];

      // evaluate expressions
      const KF = Math.pow(VL, -0.65) * 0.065 * Math.pow(speed**3 * diam**5 * power / 2.16e12, 0.361);
      const MA = MEAthiol * Math.pow(10, pH - pKa2MEA);
      const qout = qin - KF * (yO2P * H - CO2) * VL * R * T / (P * 1000);
      const OTR = KF * (yO2P * H - CO2);
      const Fin = t < switchTime ? 0 : 0.025;
      const Fper = t < switchTime ? 0.025 : Fin;
      const E0 = VLinit / VL;
      const E1 = (MA * E0)**2;
      const E11 = k1red * FFox * E0 * E1;
      const E12 = k1ox * FFred * E0;
      const E31 = k2Fd * FFred * E0;
      const E32 = k2Fa * (Ffree * E0)**2 * E1;
      const E21 = k1red * KKox * E0 * E1;
      const E22 = k1ox * KKred * E0;
      const E41 = k2Kd * KKred * E0;
      const E42 = k2Ka * (Kfree * E0)**2 * E1;
      const E51 = k3FKa * Ffree * E0 * Kfree * E0;
      const E52 = k3FKd * FKred * E0;
      const E61 = k4ox * FKred * E0 * (CYST * E0)**2;
      const E62 = k4red * FKox * E0 * E1;
      const E70 = E0 * CO2;
      const E71 = (MEAthiol * E0)**2;
      const E72 = (E70 >= 0) ? Math.sqrt(E70) : 0;

      // compute output
      output[0] = -E11 + E12;
      output[1] = -E21 + E22;
      output[2] = E11 - E12 - E31 + E32;
      output[3] = E21 - E22 - E41 + E42;
      output[4] = 2 * (E31 - E32) - E51 + E52;
      output[5] = 2 * (E41 - E42) - E51 + E52;
      output[6] = E51 - E52 - E61 + E62;
      output[7] = E61 - E62;
      output[8] = 2 * (-E11 + E12 - E21 + E22 + E31 + E41 - E32 - E42 - E62 - ktox * E71 * E72) -
        (MEAthiol + MA) * (Fin + Fper) / VL;
      output[9] = (Fin * pO2sat * 0.0022 - 2 * Fper * CO2) / VL + OTR - 0.5 * ktox * E71 * E72;
      output[10] = -OTR * (VL / (VTV - VL)) * R * T * P + yO2in * qin - yO2P * qout;
      output[11] = ktox * E71 * E72 - krcyst * CYST * E0 - (Fin + Fper) * CYST / VL;
      output[12] = Fin - Fper;
    },
    tolerance: 0.00005,
    solutionColNames: ['FFox(t)', 'KKox(t)', 'FFred(t)', 'KKred(t)', 'Ffree(t)', 'Kfree(t)', 'FKred(t)',
      'FKox(t)', 'MEA(t)', 'CO2(t)', 'yO2P(t)', 'CYST(t)', 'VL(t)'],
  }; // odes

  return solveDefault(odes);
} // getBioreactorSim

/** Return dataframe with the PK-PD simulation */
export function getPkPdSim(dose: number, count: number, interval: number, KA: number, CL: number, V2: number, Q: number,
  V3: number, effect: number, EC50: number): DG.DataFrame {
  let t0 = PK_PD.INITIAL;
  let t1 = interval;
  const h = PK_PD.STEP;
  let depot = PK_PD.DEPOT;
  let centr = PK_PD.CENTRAL;
  let peri = PK_PD.PERIFERAL;
  let eff = PK_PD.EFFECT;

  // one stage solution
  const oneStagePkPd = (t0: number, t1: number, h: number, depot: number, centr: number,
    peri: number, eff: number, dose: number, KA: number, CL: number, V2: number, Q: number, V3: number,
    EC50: number, Kin: number, Kout: number) => {
    // the problem definition
    const odes = {
      name: 'PK-PD',
      arg: {name: 't', start: t0, finish: t1, step: h},
      initial: [depot, centr, peri, eff],
      func: (t: number, y: Float64Array, output: Float64Array) => {
        // extract function values
        const depot = y[0];
        const centr = y[1];
        const peri = y[2];
        const eff = y[3];

        // evaluate expressions
        const C2 = centr / V2;
        const C3 = peri / V3;

        // compute output
        output[0] = -KA * depot;
        output[1] = KA * depot - CL * C2 - Q * C2 + Q * C3;
        output[2] = Q * C2 - Q * C3;
        output[3] = Kin - Kout * (1 - C2/(EC50 + C2)) * eff;
      },
      tolerance: 1e-9,
      solutionColNames: ['Depot', 'Central', 'Periferal', 'Effect'],
    }; // odes

    return solveDefault(odes);
  }; // oneStagePkPd

  // solution dataframe
  const solution = DG.DataFrame.fromColumns([
    DG.Column.fromFloat64Array('t', new Float64Array()),
    DG.Column.fromFloat64Array('Depot', new Float64Array()),
    DG.Column.fromFloat64Array('Central', new Float64Array()),
    DG.Column.fromFloat64Array('Periferal', new Float64Array()),
    DG.Column.fromFloat64Array('Effect', new Float64Array()),
  ]);

  let lastIdx = 0;

  // solve the problem
  for (let i = 0; i < count; ++i) {
    depot += dose;
    solution.append(oneStagePkPd(t0, t1, h, depot, centr, peri, eff, dose, KA, CL, V2, Q, V3, EC50, effect, effect),
      true);
    t0 = t1;
    t1 += interval;
    lastIdx = solution.rowCount - 1;
    depot = solution.get('Depot', lastIdx);
    centr = solution.get('Central', lastIdx);
    peri = solution.get('Periferal', lastIdx);
    eff = solution.get('Effect', lastIdx);
  };

  solution.col('t').name = 'Time [h]';

  // expressions
  const size = solution.rowCount;
  const centrConcRaw = new Float64Array(size);
  const periConcRaw = new Float64Array(size);

  const centRaw = solution.col('Central').getRawData();
  const periRaw = solution.col('Periferal').getRawData();

  for (let i = 0; i < size; ++i) {
    centrConcRaw[i] = centRaw[i] / V2;
    periConcRaw[i] = periRaw[i] / V3;
  }

  solution.columns.add(DG.Column.fromFloat64Array('Central concentration', centrConcRaw));
  solution.columns.add(DG.Column.fromFloat64Array('Peripheral concentration', periConcRaw));

  return solution;
} // getPkPdSim

/** Bioreactor demo app info for the Help panel */
const bioreactorInfo = `# Model
Simulation of a controlled fab-arm exchange kinetic
[mechanism](https://doi.org/10.1074/jbc.RA117.000303).
# Try
Interactive results based on input changes.
# Performance
1000 times faster than the previous version.
# Complexity
Each time you change inputs, a system of 13 nonlinear ordinary differential equations is solved.
# No-code
[Diff Studio](${LINK.DIF_STUDIO})
enables the creation of complex models without writing code.
# Learn more
* [Sensitivity analysis](${LINK.SENS_AN})
* [Parameter optimization](${LINK.FITTING})`;

/** Show info in the Help panel */
function showHelpPanel(info: string): void {
  grok.shell.windows.help.visible = true;
  const helpMD = ui.markdown(info);
  helpMD.classList.add('diff-studio-demo-app-div-md');
  const divHelp = ui.div([helpMD], 'diff-studio-demo-app-div-help');
  grok.shell.windows.help.showHelp(divHelp);
  grok.shell.windows.context.visible = true;
  grok.shell.windows.showContextPanel = false;
  grok.shell.windows.showProperties = false;
  grok.shell.windows.help.visible = true;
}

/** Show Bioreactor help panel */
export function showBioHelpPanel() {
  showHelpPanel(bioreactorInfo);
}

/** PK-PD demo app info for the Help panel */
const pkpdInfo = `# Model
Simulation of a two-compartment pharmacokinetic-pharmacodynamic
([PK-PD](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7348046)).
# Try
Interactive results based on input changes.
# Performance
Nonlinear systems of differential equations are solved within milliseconds.
# No-code
[Diff Studio](${LINK.DIF_STUDIO})
enables the creation of complex models without writing code.
# Learn more
* [Sensitivity analysis](${LINK.SENS_AN})
* [Parameter optimization](${LINK.FITTING})`;

/** Show PK-PD help panel */
export function showPkPdHelpPanel() {
  showHelpPanel(pkpdInfo);
}

/** Ball flight simulation tool */
function getBallFlightTable(t1: number, velocity: number, angle: number, dB: number, roB: number): DG.DataFrame {
  const t0 = 0;
  const h = 0.01;
  const xInit = 0;
  const yInit = 0;
  const vxInit = velocity * Math.cos(angle);
  const vyInit = velocity * Math.sin(angle);
  const g = 9.81;
  const cD = 0.47;
  const roA = 1.225;

  // the problem definition
  const odes = {
    name: 'Ball flight',
    arg: {name: 't', start: t0, finish: t1, step: h},
    initial: [xInit, yInit, vxInit, vyInit],
    func: (t: number, _y: Float64Array, _output) => {
      // extract function values
      const vx = _y[2];
      const vy = _y[3];

      // evaluate expressions
      const v = Math.PI * dB ** 3 / 6;
      const mB = roB * v;
      const aB = 0.25 * Math.PI * dB ** 2;
      const vxSqr = vx * vx;
      const vySqr = vy * vy;
      const vSqr = vxSqr + vySqr;
      const vTotal = Math.sqrt(vSqr);
      const cosAlpha = (vTotal > 1.0e-12) ? (vx / vTotal) : 1;
      const cosBeta = (vTotal > 1.0e-12) ? (vy / vTotal) : 0;
      const drag = 0.5 * cD * roA * vSqr * aB;
      const dragX = -drag * cosAlpha;
      const dragY = -drag * cosBeta;

      // compute output
      _output[0] = vx;
      _output[1] = vy;
      _output[2] = dragX / mB;
      _output[3] = -g + dragY / mB;
    },
    tolerance: 0.00005,
    solutionColNames: ['x', 'y', 'vx', 'vy'],
  };

  return solveDefault(odes);
} // getBallFlightTable

/** Clip numeric table by min value of the specified column */
function clipNumericTable(df: DG.DataFrame, colName: string, minVal: number): DG.DataFrame {
  const col = df.col(colName);

  if (col === null)
    throw new Error('Incorrect column name');

  if (col.stats.min >= minVal)
    return df;

  const idx = (col.getRawData() as Float64Array).findIndex((val) => val < minVal);

  const cols: DG.Column[] = [];

  for (const curCol of df.columns) {
    const raw = curCol.getRawData() as Float64Array;
    cols.push(DG.Column.fromFloat64Array(
      curCol.name,
      raw.slice(0, idx),
    ));
  }

  return DG.DataFrame.fromColumns(cols);
}

/** Return dataframe with ball flight simulation */
export function getBallFlightSim(v: number, a: number, dB: number, roB: number): DG.DataFrame {
  let final = 50;
  let solution = getBallFlightTable(final, v, a, dB, roB);

  if (solution.col('y').stats.min > 0) {
    final *= 100;
    solution = getBallFlightTable(final, v, a, dB, roB);
  }
  solution = clipNumericTable(solution, 'y', 0);

  const dist = solution.col('x');
  const height = solution.col('y');

  dist.name = 'Distance';
  height.name = 'Height';

  const result = DG.DataFrame.fromColumns([dist, height]);
  result.name = 'Ball flight';

  return result;
}
