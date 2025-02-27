/* eslint-disable max-len */

// Models library

/** Chemical reactions, mass-action kinetics */
const CHEM_REACT_MODEL = `#name: Chem react
#tags: model
#description: Mass-action kinetics illustration
#comment: 
  Source: https://doi.org/10.1002/ijch.201800003.
#equations:
  dx1/dt = -k1 * x1 + k2 * (x2)**2 + k3 * x1 * x3 
           - k4 * (x1)**2 - 2 * k5 * (x1)**2 + k6 * x2 * x4

  dx2/dt = 2 * k1 * x1 - 2 * k2 * (x2)**2 
           + k5 * (x1)**2 - k6 * x2 * x4

  dx3/dt = -k3 * x1 * x3 + k4 * (x1)**2 + k6 * x2 * x4

  dx4/dt = k5 * (x1)**2 - k6 * x2 * x4

#parameters:
  k1 = 0.7 {category: Reaction parameters; min: 0.1; max: 5}
  k2 = 0.9 {category: Reaction parameters; min: 0.1; max: 5}
  k3 = 1.2 {category: Reaction parameters; min: 0.1; max: 5}
  k4 = 3.4 {category: Reaction parameters; min: 0.1; max: 5}
  k5 = 2.3 {category: Reaction parameters; min: 0.1; max: 5}
  k6 = 4.5 {category: Reaction parameters; min: 0.1; max: 5}

#inits:
  x1 = 1 {units: mol/L; category: Initial concentrations; min: 0; max: 2}
  x2 = 0 {units: mol/L; category: Initial concentrations; min: 0; max: 2}
  x3 = 0 {units: mol/L; category: Initial concentrations; min: 0; max: 2}
  x4 = 0 {units: mol/L; category: Initial concentrations; min: 0; max: 2}

#argument: t
  initial = 0 {units: min; caption: Initial; category: Time; min: 0; max: 5} [Initial time of simulation]
  final = 6 {units: min; caption: Final; category: Time; min: 6; max: 10} [Final time of simulation]
  step = 0.01 {units: min; caption: Step; category: Time; min: 0.01; max: 0.1; step: 0.001} [Time step of simulation]

#tolerance: 5e-5`;

/** Robertson's chemical reaction model - stiff ODEs */
const ROBERTSON_MODEL = `#name: Robertson
#tags: model
#description: Robertson chemical reaction model
#comment: This is classic example of stiff ODEs.
#equations:
  dA/dt = -0.04 * A + 1e4 * B * C
  dB/dt = 0.04 * A - 1e4 * B * C - 3e7 * B**2
  dC/dt = 3e7 * B**2

#inits:
  A = 1 {units: mol/L; category: Initial concentrations; min: 0; max: 5}
  B = 0 {units: mol/L; category: Initial concentrations; min: 0; max: 5}
  C = 0 {units: mol/L; category: Initial concentrations; min: 0; max: 5}

#argument: t
  start = 0 {units: sec; caption: Initial; category: Time; min: 0; max: 1} [Initial time of simulation]
  finish = 40 {units: sec; caption: Final; category: Time; min: 2; max: 50} [Final time of simulation]
  step = 0.01 {units: sec; caption: Step; category: Time; min: 0.01; max: 0.1} [Time step of simulation]

#tolerance: 1e-7`;

/** Fermentation process simulation */
const FERMENTATION_MODEL = `#name: Fermentation
#tags: model
#description: Simulation of fermentation process in the ethanol production
#comment: 
  Source: https://core.ac.uk/download/pdf/11737483.pdf.
#equations:
  dP/dt = r * X
  dS/dt = -q * X
  dX/dt = V * S / (K + S) * X

#argument: t
  initial = 0 {units: d; caption: Initial; category: Time; min: 0; max: 10} [Initial time of simulation]
  final = 70 {units: d; caption: Final; category: Time; min: 15; max: 100} [Final time of simulation]
  step = 0.01 {units: d; caption: Step; category: Time; min: 0.01; max: 1} [Time step of simulation]

#inits:  
  P = 4.276 {units: ml/ml; caption: ethanol, P; category: Initials; min: 3; max: 6} [Concentration of ethanol]
  S = 0.3185 {units: mg/ml; caption: glucose, S; category: Initials; min: 0.1; max: 0.5} [Concentration of glucose]
  X = 9.2e-2 {units: mg/ml; caption: saccharomyces, X; category: Initials; min: 0.01; max: 0.2} [Saccharomyces wet weight]

#parameters:
  r = 1.3455 {units: mg/ml; category: Parameters; min: 1; max: 2} [The growth rate of ethanol]
  q = 1.1129e-2 {units: mg/ml; category: Parameters; min: 0.01; max: 0.2} [The rate of glucose consumption]
  V = 8.7e-2 {units: mg/ml; category: Parameters; min: 0.01; max: 0.2} [The maximal growth rate of Saccharomyces]
  K = 6.28e-2 {category: Parameters} [Michaelis-Menten constant]
  
#tolerance: 1e-7`;

/** PK simulation */
const PK_MODEL = `#name: PK
#tags: model
#description: Pharmacokinetic (PK) simulation: one-compartment model
#equations:
  d(depot)/dt = -KA * depot
  d(centr)/dt = KA * depot - CL * C2

#expressions:
  C2 = centr / V2

#loop:
  count = 1 {category: Dosing; min: 1; max: 10} [Number of doses]
  depot += dose

#argument: t
  start = 0 {units: h; caption: begin; category: Dosing; min: 0; max: 1} [Begin of dosing interval]
  final = 12 {units: h; caption: end; category: Dosing; min: 5; max: 15} [End of dosing interval]
  step = 0.01 {units: h; caption: step; category: Dosing; min: 0.01; max: 0.1} [Time step of simulation]  

#inits:  
  depot = 0 {category: Initial values}
  centr = 0 {category: Initial values} [Central]

#parameters:  
  dose = 1e4 {category: Dosing; min: 1e3; max: 2e4; step: 1e3} [Dosage]
  KA = 0.3 {caption: rate constant; category: Parameters; min: 0.1; max: 1}
  CL = 2 {caption: clearance; category: Parameters; min: 1; max: 5}
  V2 = 4 {caption: central volume; category: Parameters; min: 1; max: 10} [Central compartment volume]

#meta.solver: {method: 'mrt'; maxTimeMs: 50}
  
#tolerance: 1e-9`;

/** PK-PD simulation */
const PK_PD_MODEL = `#name: PK-PD
#tags: model
#description: Pharmacokinetic-pharmacodynamic (PK-PD) simulation: two-compartment model
#equations:
  d(depot)/dt = -KA * depot
  d(centr)/dt = KA * depot - CL * C2 - Q * C2 + Q * C3
  d(peri)/dt  = Q * C2 - Q * C3
  d(eff)/dt  = Kin - Kout * (1 - C2/(EC50 + C2)) * eff

#expressions:
  C2 = centr / V2
  C3 = peri / V3

#loop:
  count = 10 {caption: count; category: Dosing; min: 1; max: 20} [Number of doses]
  depot += dose

#argument: t
  start = 0 {units: h; caption: begin; category: Dosing; min: 0; max: 1} [Begin of dosing interval]
  final = 12 {units: h; caption: end; category: Dosing; min: 5; max: 15} [End of dosing interval]
  step = 0.1 {units: h; caption: step; category: Dosing; min: 0.01; max: 0.1} [Time step of simulation]  

#inits:  
  depot = 0 {category: Initial values}
  centr = 0 {category: Initial values} [Central]
  peri = 0 {category: Initial values} [Peripheral]
  eff = 0.2 {category: Initial values} [Effective compartment rate]

#parameters:  
  dose = 1e4 {category: Dosing; min: 1e3; max: 2e4; step: 1e3} [Dosage]
  KA = 0.3 {caption: rate constant; category: Parameters; min: 0.1; max: 1}
  CL = 2 {caption: clearance; category: Parameters; min: 1; max: 5}
  V2 = 4 {caption: central volume; category: Parameters; min: 1; max: 10} [Central compartment volume]
  Q = 1 {caption: inter rate; category: Parameters; min: 0.1; max: 1} [Intercompartmental rate]
  V3 = 30 {caption: peri volume; category: Parameters; min: 20; max: 40} [Peripheral compartment volume]
  EC50 = 8 {caption: effect; category: Parameters; min: 1; max: 10}
  Kin = 0.2 {caption: Kin; category: Parameters; min: 0.1; max: 0.5} [The first-order production constant]
  Kout = 0.2 {caption: Kout; category: Parameters; min: 0.1; max: 0.5} [The first-order dissipation rate constant]
  
#tolerance: 1e-9`;

/** Gluconic acid production */
const ACID_PROD_MODEL = `#name: GA-production
#tags: model
#description: Gluconic acid (GA) production by Aspergillus niger modeling
#equations:
  dX/dt = rX
  dS/dt = -gamma * rX - lambda * X
  dO/dt = Kla * (Cod - O) - delta * rX - phi * X
  dP/dt = alpha * rX + beta * X

#expressions:
  mu = muM * S / (Ks + S) * O / (Ko + O)
  rX = mu * X

#argument: t, 1-st stage
  _t0 = 0 {units: h; caption: initial; category: Misc} [Start of the process]
  _t1 = 60 {units: h; caption: 1-st stage; category: Durations; min: 20; max: 80} [Duration of the 1-st stage]
  step = 0.1 {units: h; caption: step; category: Misc; min: 0.01; max: 1} [Time step of simulation]

#update: 2-nd stage
  duration = overall - _t1
  S += 70

#inits:  
  X = 5 {units: kg/m³; caption: biomass; category: Initial concentrations; min: 1; max: 10} [Aspergillus niger biomass]
  S = 150 {units: kg/m³; caption: glucose; category: Initial concentrations; min: 50; max: 200} [Glucose]
  O = 7 {units: kg/m³; caption: oxygen; category: Initial concentrations; min: 1; max: 10} [Dissolved oxygen]
  P = 0 {units: kg/m³; caption: acid; category: Initial concentrations; min: 0; max: 0.1} [Gluconic acid]

#output:
  t {caption: time}
  X {caption: biomass}
  S {caption: glucose}
  O {caption: oxygen}
  P {caption: acid}

#parameters:
  overall = 100 {units: h; category: Durations; min: 100; max: 140} [Overall duration]
  muM = 0.668 {units: 1/h; category: Parameters} [Monod type model parameter]
  alpha = 2.92 {category: Parameters} [Monod type model parameter]
  beta = 0.131 {units: 1/h; category: Parameters} [Monod type model parameter]
  gamma = 2.12 {category: Parameters} [Monod type model parameter]
  lambda = 0.232 {units: 1/h; category: Parameters} [Monod type model parameter]
  delta = 0.278 {category: Parameters} [Monod type model parameter]
  phi = 4.87e-3 {units: 1/h; category: Parameters} [Monod type model parameter]
  Ks = 1.309e2 {units: g/L; category: Parameters} [Monod type model parameter]
  Ko = 3.63e-4 {units: g/L; category: Parameters} [Monod type model parameter]
  Kla = 1.7e-2 {units: 1/s; category: Parameters} [Volumetric mass transfer coefficient]
  Cod = 15 {units: kg/m³; category: Parameters} [Liquid phase dissolved oxygen saturation concentration]
  
#tolerance: 1e-9`;

/** Nimotuzumab disposition model */
const NIMOTUZUMAB_MODEL = `#name: Nimotuzumab
#tags: model
#description: Nimotuzumab disposition model
#comment:
  Source: https://www.mdpi.com/1999-4923/12/12/1147
#equations:
  dA1/dt = (-(CL * A3 / V1 + Q / V1) * A1 + Q / V2 * A2 - kint * Rtot * A1 / (Kss + A1 / V1)) 
           / (1 + Rtot * Kss / (Kss + A1 / V1)**2)

  dA2/dt = (Q / V1 * A1 - Q / V2 * A2) / (1 + Rtotp * Kss / (Kss + A2 / V2)**2)

  dA3/dt = Kin * (1 + Smax * A1**gamma / (S50**gamma + A1**gamma)) - Kout * A3

#argument: t
  start = 0 {caption: Initial; category: Time; min: 0; max: 10} [Initial time of simulation]
  finish = 70 {caption: Final; category: Time; min: 50; max: 100} [Final time of simulation]
  step = 0.01 {caption: Step; category: Time; min: 0.01; max: 1} [Time step of simulation]

#inits:
  A1 = 0.43 {category: Initials; min: 0.2; max: 0.6} [Central]
  A2 = 0.55 {category: Initials; min: 0.3; max: 0.8} [Periferal]
  A3 = 10.32 {category: Initials; min: 5; max: 15} [Mediator]

#output:
  t {caption: Time, h}
  A1 {caption: Central}
  A2 {caption: Periferal}

#parameters:
  CL = 9.64e-3 {category: Parameters; min: 0.005; max: 0.015} [Non-specific clearance]
  V1 = 2.63 {category: Parameters; min: 0.7; max: 3} [Apparent volume of distribution of the central compartment]
  Q = 2.88e-2 {category: Parameters; min: 0.015; max: 0.035} [Distribution clearance of free nimotuzumab between the central and peripheral compartment]
  V2 = 9.92e-3 {category: Parameters; min: 0.0067; max: 0.0265} [Apparent volume of distribution of the peripheral compartment]
  Kss = 15.5 {category: Parameters; min: 10; max: 45} [Quasi steady state constant for the EGFR]
  kint = 1e-2 {category: Parameters; min: 0.01; max: 0.05} [Internalization rate for nimotuzumab-EGFR]
  Rtot = 1.05e-2 {category: Parameters; min: 0.007; max: 0.032} [EGFR in the central compartment]
  Rtotp = 956 {category: Parameters; min: 120; max: 3500} [EGFR in the peripheral compartment]
  Kin = 1.33e-2 {category: Parameters; min: 0.01; max: 0.05} [Zero-order synthesis rate constant]
  Kout = 1.33e-2 {category: Parameters; min: 0.001; max: 0.02} [First-order elimination rate constant]
  S50 = 8.57 {category: Parameters; min: 5; max: 12} [Concentration of free nimotuzumab in the central compartment that achieves the half of Smax]
  Smax = 3.18 {category: Parameters; min: 1; max: 5} [Maximal effect of the stimulation]
  gamma = 0.5 {category: Parameters; min: 0.1; max: 1} [Hill coefficient of the sigmoid function]  

#tolerance: 1e-7`;

/** Bioreactor simulation */
const BIOREACTOR_MODEL = `#name: Bioreactor
#tags: model
#description: Bioreactor simulation
#comment: 
  Source: https://doi.org/10.1074/jbc.RA117.000303.
#equations:

  d(FFox)/dt = -E11 + E12

  d(KKox)/dt = -E21 + E22

  d(FFred)/dt = E11 - E12 - E31 + E32

  d(KKred)/dt = E21 - E22 - E41 + E42

  d(Ffree)/dt = 2 * (E31 - E32) - E51 + E52

  d(Kfree)/dt = 2 * (E41 - E42) - E51 + E52

  d(FKred)/dt = E51 - E52 - E61 + E62

  d(FKox)/dt = E61 - E62

  d(MEAthiol)/dt = 2 * (-E11 + E12 - E21 + E22 + E31 + E41 - E32 - E42 - E62 - ktox * E71 * E72)
                   - (MEAthiol + MA) * (Fin + Fper) / VL

  d(CO2)/dt = (Fin * pO2sat * 0.0022 - 2 * Fper * CO2) / VL + OTR - 0.5 * ktox * E71 * E72

  d(yO2P)/dt = -OTR * (VL / (VTV - VL)) * R * T * P + yO2in * qin - yO2P * qout

  d(CYST)/dt = ktox * E71 * E72 - krcyst * CYST * E0 - (Fin + Fper) * CYST / VL

  d(VL)/dt = Fin - Fper

#expressions:

  KF = pow(VL, -0.65) * 0.065 * pow(speed**3 * diam**5 * power / 2.16e12, 0.361)

  MA = MEAthiol * pow(10, pH - pKa2MEA)

  qout = qin - KF * (yO2P * H - CO2) * VL * R * T / (P * 1000)
  
  OTR = KF * (yO2P * H - CO2)

  Fin = t < switchTime ? 0 : 0.025

  Fper = t < switchTime ? 0.025 : Fin

  E0 = VLinit / VL

  E1 = (MA * E0)**2
  
  E11 = k1red * FFox * E0 * E1

  E12 = k1ox * FFred * E0

  E31 = k2Fd * FFred * E0

  E32 = k2Fa * (Ffree * E0)**2 * E1

  E21 = k1red * KKox * E0 * E1

  E22 = k1ox * KKred * E0

  E41 = k2Kd * KKred * E0

  E42 = k2Ka * (Kfree * E0)**2 * E1

  E51 = k3FKa * Ffree * E0 * Kfree * E0

  E52 = k3FKd * FKred * E0

  E61 = k4ox * FKred * E0 * (CYST * E0)**2

  E62 = k4red * FKox * E0 * E1

  E70 = E0 * CO2

  E71 = (MEAthiol * E0)**2

  E72 = (E70 >= 0) ? sqrt(E70) : 0  

#argument: t
  t0 = 0.0   {units: min; caption: Initial; category: Time}                       [Initial time of simulation]
  t1 = 1000  {units: min; caption: Final;   category: Time; min: 500; max: 1000}  [Final time of simulation]
   h = 1     {units: min; caption: Step;    category: Time; min: 0.1; max: 2}     [Time step of simulation]

#inits:  
  FFox     = 0.2   {units: mmol/L; category: Initial values; min: 0.15; max: 0.25; step: 0.01}  [FF oxidized]
  KKox     = 0.2   {units: mmol/L; category: Initial values; min: 0.15; max: 0.25; step: 0.01}  [KK oxidized]
  FFred    = 0.1   {units: mmol/L; category: Initial values; min: 0.08; max: 0.12; step: 0.01}  [FF reduced]
  KKred    = 0.1   {units: mmol/L; category: Initial values; min: 0.08; max: 0.12; step: 0.01}  [KK reduced]
  Ffree    = 0     {units: mmol/L; category: Initial values}                                    [F free]
  Kfree    = 0     {units: mmol/L; category: Initial values}                                    [K free]
  FKred    = 0     {units: mmol/L; category: Initial values}                                    [FK reduced]
  FKox     = 0     {units: mmol/L; category: Initial values}                                    [FK oxidized]
  MEAthiol = 15    {units: mmol/L; category: Initial values; min: 10;   max: 16}                [MEAthiol]
  CO2      = 0.12  {units: mmol/L; category: Initial values; min: 0.09; max: 0.15}              [Dissolved oxygen]
  yO2P     = 0.209 {units: atm;    category: Initial values}                                    [Atm headspace]
  CYST     = 0     {units: mmol/L; category: Initial values}                                    [Cystamine]
  VL       = 7.2   {units: L;      category: Initial values}                                    [Liquid volume]

#constants:
   VLinit = 7.2
      VTV = 10
    speed = 400
     diam = 6
    power = 2.1
       pH = 7.4
    k1red = 5.604e-2
     k1ox = 1.08e-2
     k2Fd = 1.35
     k2Fa = 1.104e8
     k2Kd = 4.038e-2
     k2Ka = 1.2e8
    k3FKa = 1.812e8
    k3FKd = 1.188e-2
     k4ox = 1.08e-2
    k4red = 5.604e-2
     ktox = 5e-3
   krcyst = 0
   pO2sat = 100
  pKa2MEA = 8.18
        H = 1.072069378
        R = 8.2e-2

#parameters:
         qin =    1  {units: L/min; caption: Gas;         category: Parameters;  min: 0.5; max: 1.5}            [Gas to headspace]
       yO2in = 0.21  {              caption: O2 fraction; category: Parameters;  min: 0.1; max: 0.9}            [Oxygen mole fraction]
           T =  300  {units: K;     caption: temperature; category: Parameters;  min: 250; max: 350}            [System temperature]
           P =    1  {units: atm;   caption: pressure;    category: Parameters;  min: 1;   max: 2}              [Headspace pressure]
  switchTime =  135  {units: min;   caption: switch at;   category: Time;        min: 70;  max: 180; step: 10}  [Switch mode time]
  
#meta.inputs: mode {caption: Process mode; category: Process parameters; choices: OpenFile("System:AppData/DiffStudio/library/bioreactor-inputs.csv")} [Reactions flow mode]`;

/** Pollution model */
const POLLUTION_MODEL = `#name: Pollution
#tags: model
#description: The chemical reaction part of the air pollution model developed at The Dutch National Institute of Public Health and Environmental Protection
#comment: 
  Source: https://archimede.uniba.it/~testset/report/pollu.pdf
#equations:
  dy1/dt = -(r1 + r10 + r14 + r23 + r24) + (r2 + r3 + r9 + r11 + r12 + r22 + r25)

  dy2/dt = -r2 - r3 - r9 - r12 + r1 + r21

  dy3/dt = -r15 + r1 + r17 + r19 + r22

  dy4/dt = -r2 - r16 - r17 - r23 + r15

  dy5/dt = -r3 +2 * r4 + r6 +r7 +r13 + r20

  dy6/dt = -r6 - r8 - r14 - r20 + r3 + 2 * r18

  dy7/dt = -r4 - r5 - r6 + r13

  dy8/dt = r4 + r5 + r6 + r7

  dy9/dt = -r7 - r8

  dy10/dt = -r12 +r7 + r9

  dy11/dt = -r9 - r10 + r8 + r11

  dy12/dt = r9

  dy13/dt = -r11 + r10

  dy14/dt = -r13 + r12

  dy15/dt = r14

  dy16/dt = -r18 - r19 + r16

  dy17/dt = -r20

  dy18/dt = r20

  dy19/dt = -r21 - r22 - r24 + r23 + r25

  dy20/dt = -r25 + r24

#expressions:
  r1 = k1 * y1

  r2 = k2 * y2 * y4

  r3 = k3 * y5 * y2

  r4 = k4 * y7

  r5 = k5 * y7

  r6 = k6 * y7 * y6

  r7 = k7 * y9

  r8 = k8 * y9 * y6

  r9 = k9 * y11 * y2

  r10 = k10 * y11 * y1

  r11 = k11 * y13

  r12 = k12 * y10 * y2

  r13 = k13 * y14

  r14 = k14 * y1 * y6

  r15 = k15 * y3

  r16 = k16 * y4

  r17 = k17 * y4

  r18 = k18 * y16

  r19 = k19 * y16

  r20 = k20 * y17 * y6

  r21 = k21 * y19

  r22 = k22 * y19

  r23 = k23 * y1 * y4

  r24 = k24 * y19 * y1

  r25 = k25 * y20

#argument: t
  t0 = 0   {units: min; caption: Initial; category: Time; min: 0; max: 0.9} [Initial time of simulation]
  t1 = 60  {units: min; caption: Final; category: Time; min: 1; max: 100; step: 1} [Final time of simulation]
  h = 0.1  {units: min; caption: Step; category: Time; min: 0.001; max: 0.1; step: 0.001} [Time step of simulation]


#inits:
  y1 = 0    {caption: NO2; category: Initial concentrations; min: 0; max: 0.1} [Initial concentration of NO2]
  y2 = 0.2  {caption: NO; category: Initial concentrations; min: 0; max: 0.4} [Initial concentration of NO]
  y3 = 0    {caption: O3P; category: Initial concentrations; min: 0; max: 0.1} [Initial concentration of O3P]
  y4 = 0.04 {caption: O3; category: Initial concentrations; min: 0; max: 0.1} [Initial concentration of O3]
  y5 = 0    {caption: HO2; category: Initial concentrations} [Initial concentration of HO2]
  y6 = 0    {caption: OH; category: Initial concentrations} [Initial concentration of OH]
  y7 = 0.1  {caption: HCHO; category: Initial concentrations} [Initial concentration of HCHO]
  y8 = 0.3  {caption: CO; category: Initial concentrations} [Initial concentration of CO]
  y9 = 0.01 {caption: ALD; category: Initial concentrations} [Initial concentration of ALD] 
  y10 = 0   {caption: MEO2; category: Initial concentrations} [Initial concentration of MEO2]
  y11 = 0   {caption: C2O3; category: Initial concentrations} [Initial concentration of C2O3]
  y12 = 0   {caption: CO2; category: Initial concentrations} [Initial concentration of CO2]
  y13 = 0   {caption: PAN; category: Initial concentrations} [Initial concentration of PAN]
  y14 = 0   {caption: CH3O; category: Initial concentrations} [Initial concentration of CH3O]
  y15 = 0   {caption: HNO3; category: Initial concentrations} [Initial concentration of HNO3]
  y16 = 0   {caption: O1D; category: Initial concentrations} [Initial concentration of O1D]
  y17 = 0.007 {caption: SO2; category: Initial concentrations} [Initial concentration of SO2]
  y18 = 0   {caption: SO4; category: Initial concentrations} [Initial concentration of SO4]
  y19 = 0   {caption: NO3; category: Initial concentrations} [Initial concentration of NO3]
  y20 = 0   {caption: N2O5; category: Initial concentrations} [Initial concentration of N2O5]

#output:
   t  {caption: t, min}
  y1  {caption: NO2}
  y2  {caption: NO}
  y3  {caption: O3P}
  y4  {caption: O3}
  y5  {caption: HO2}
  y6  {caption: OH}
  y7  {caption: HCHO}
  y8  {caption: CO}
  y9  {caption: ALD} 
  y10 {caption: MEO2}
  y11 {caption: C2O3}
  y12 {caption: CO2}
  y13 {caption: PAN}
  y14 {caption: CH3O}
  y15 {caption: HNO3}
  y16 {caption: O1D}
  y17 {caption: SO2}
  y18 {caption: SO4}
  y19 {caption: NO3}
  y20 {caption: N2O5}

#parameters:
  k1 = 0.35    {category: Reaction constants} [NO2 -> NO + O3P]
  k2 = 26.6    {category: Reaction constants} [NO + O3 -> NO2]
  k3 = 1.23e4  {category: Reaction constants} [HO2 + NO -> NO2 + OH]
  k4 = 8.6e-4  {category: Reaction constants} [HCHO -> 2 HO2 + CO]
  k5 = 8.2e-4  {category: Reaction constants} [HCHO -> CO]
  k6 = 1.5e4   {category: Reaction constants} [HCHO + OH -> HO2 + CO]
  k7 = 1.3e-4  {category: Reaction constants} [ALD -> MEO2 + HO2 + CO]
  k8 = 2.4e4   {category: Reaction constants} [ALD + OH -> C2O3]
  k9 = 1.65e4  {category: Reaction constants} [C2O3 + NO-> NO2 + MEO2 + CO2]
  k10 = 9e3    {category: Reaction constants} [C2O3 + NO2-> PAN]
  k11 = 0.022  {category: Reaction constants} [PAN-> CH3O + NO2]
  k12 = 1.2e4  {category: Reaction constants} [MEO2 + NO-> CH3O + NO2]
  k13 = 1.88   {category: Reaction constants} [CH3O-> HCHO + HO2]
  k14 = 1.63e4 {category: Reaction constants} [NO2 + OH -> HNO3]
  k15 = 4.8e6  {category: Reaction constants} [O3P -> O3]
  k16 = 3.5e-4 {category: Reaction constants} [O3 -> O1D]
  k17 = 0.0175 {category: Reaction constants} [O3 -> O3P]
  k18 = 1e8    {category: Reaction constants} [O1D -> 2 OH]
  k19 = 4.44e11 {category: Reaction constants} [O1D -> O3P]
  k20 = 1240   {category: Reaction constants} [SO2 + OH -> SO4 + HO2] 
  k21 = 2.1    {category: Reaction constants} [NO3 -> NO]
  k22 = 5.78   {category: Reaction constants} [NO3 -> NO2 + O3P]
  k23 = 0.0474 {category: Reaction constants} [NO2 + O3 -> NO3]
  k24 = 1780   {category: Reaction constants} [NO3 + NO2 -> N2O5]
  k25 = 3.12   {category: Reaction constants} [N2O5 -> NO3 + NO2]

#tolerance: 1e-6`;

/** Initial value problem use cases */
export enum USE_CASES {
  CHEM_REACT = CHEM_REACT_MODEL,
  ROBERTSON = ROBERTSON_MODEL,
  FERMENTATION = FERMENTATION_MODEL,
  PK = PK_MODEL,
  PK_PD = PK_PD_MODEL,
  ACID_PROD = ACID_PROD_MODEL,
  NIMOTUZUMAB = NIMOTUZUMAB_MODEL,
  BIOREACTOR = BIOREACTOR_MODEL,
  POLLUTION = POLLUTION_MODEL,
}
