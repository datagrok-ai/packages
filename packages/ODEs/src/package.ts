/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {initMatrOperApi} from '../wasm/matrix-operations-api';
import {solveDefault, solveIVP} from './solver';
import {ODEs, SolverOptions} from './solver-tools/solver-defs';
import {DiffStudio} from './app';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: init
export async function init() {
  await initMatrOperApi();
}

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
export async function runDiffStudio(): Promise<DG.ViewBase> {
  //await runSolverApp();
  const solver = new DiffStudio(false);
  return await solver.runSolverApp();
}

//name: Diff Studio Demo
//description: Interactive solver of ordinary differential equations (ODE)
//meta.demoPath: Compute | Diff Studio
//test: demoEquaSleekX() //wait: 100
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

  const solver = new DiffStudio(false);
  return solver.getFilePreview(file, path);
}
