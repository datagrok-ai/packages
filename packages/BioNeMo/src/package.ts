/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { CONSTANTS, DiffDockModel } from './diffdock/diffdock-model';

export const _package = new DG.Package();

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//name: MolMIMModel
//input: string algorithm = "CMA-ES"
//input: int num_molecules = 30
//input: string property_name = "QED"
//input: bool minimize = false
//input: double min_similarity = 0.3
//input: int particles = 30
//input: int iterations = 10
//input: string smi = "[H][C@@]12Cc3c[nH]c4cccc(C1=C[C@H](NC(=O)N(CC)CC)CN2C)c34" {semType: Molecule}
export async function molMIMModel(algorithm: string, num_molecules: number, property_name: string, minimize: boolean, min_similarity: number,
  particles: number, iterations: number, smi: string
) {
  const results = await grok.functions.call('BioNeMo:MolMIMGenerate', {algorithm, num_molecules, property_name, minimize, min_similarity, particles, iterations, smi});
}

//name: EsmFoldModel
//top-menu: Bio | Folding | EsmFold...
//input: dataframe df 
//input: column sequences {semType: Macromolecule}
export async function esmFoldModel(df: DG.DataFrame, sequences: DG.Column) {
  const grid = grok.shell.getTableView(df.name).grid;
  const protein = DG.Column.fromType(DG.TYPE.STRING, 'Protein', sequences.length);
  for (let i = 0; i < sequences.length; ++i) {
    const colValue = sequences.get(i);
    const predictedValue = await grok.functions.call('BioNeMo:esmfold', {sequence: colValue});
    protein.set(i, predictedValue);
  }
  protein.setTag(DG.TAGS.SEMTYPE, DG.SEMTYPE.MOLECULE3D);
  df.columns.add(protein);
  await grok.data.detectSemanticTypes(df);
  grid.invalidate();
}

//name: Bio | EsmFold
//input: semantic_value sequence {semType: Macromolecule}
//output: widget result
export async function esmFoldModelPanel(sequence: DG.SemanticValue): Promise<DG.Widget> {
  const result = new DG.Widget(ui.div());
  const loader = ui.loader();
  result.root.appendChild(loader);
  grok.functions.call('BioNeMo:esmfold', {sequence: sequence.value}).then(async (res) => {
    result.root.removeChild(loader);
    const molstarViewer = await sequence.cell.dataFrame.plot.fromType('Biostructure', {pdb: res});
    result.root.appendChild(molstarViewer.root);
  });
  return result;
}

//name: getTargetFilses
//output: list<string> targetFiles
export async function getTargetFiles(): Promise<string[]> {
  const targetsFiles: DG.FileInfo[] = await grok.dapi.files.list(CONSTANTS.TARGET_PATH, true);
  return targetsFiles.filter(file => file.isDirectory).map(file => file.name);
}

//name: diffDockModelScript
//meta.cache: client
//meta.cache.invalidateOn: 0 * * * *
//input: string ligand
//input: string target
//input: int poses
//output: string result
export async function diffDockModelScript(ligand: string, target: string, poses: number): Promise<string> {
  const encodedPoses = await grok.functions.call('Bionemo:diffdock', {
    protein: target,
    ligand: ligand,
    num_poses: poses,
  });
  return new TextDecoder().decode(encodedPoses.data);
}

//name: DiffDockModel
//top-menu: Chem | Docking | DiffDock...
//input: dataframe df
//input: column ligands {semType: Molecule}
//input: string target {choices: Bionemo: getTargetFiles}
//input: int poses = 5
export async function diffDockModel(df: DG.DataFrame, ligands: DG.Column, target: string, poses: number) {
  const receptorFile = (await grok.dapi.files.list(`${CONSTANTS.TARGET_PATH}/${target}`)).find((file) => file.extension === 'pdbqt')!;
  const receptor = await grok.dapi.files.readAsText(receptorFile);
  const diffDockModel = new DiffDockModel(df, ligands, receptor, receptorFile.name, poses);
  await diffDockModel.run();
}

//name: Biology | DiffDock
//tags: panel, widgets
//input: semantic_value smiles { semType: Molecule }
//output: widget result
export async function diffDockPanel(smiles: DG.SemanticValue): Promise<DG.Widget> {
  const posesInput = ui.input.int('Poses', { value: 10 });
  const targetInput = ui.input.choice('Target', { value: (await getTargetFiles())[0], items: await getTargetFiles() });

  const resultsContainer = ui.div();
  const form = ui.form([targetInput, posesInput]);
  const panels = ui.divV([form, ui.button('Run', async () => {
    await handleRunClick(smiles, posesInput.value!, targetInput.value!, resultsContainer);
  }), resultsContainer]);

  return DG.Widget.fromRoot(panels);
}

async function handleRunClick(smiles: DG.SemanticValue, poses: number, target: string, resultsContainer: HTMLDivElement) {
  resultsContainer.innerHTML = '';
  const loader = ui.loader();
  resultsContainer.appendChild(loader);

  const table = smiles.cell.dataFrame;
  const receptorFile = (await grok.dapi.files.list(`${CONSTANTS.TARGET_PATH}/${target}`)).find(file => file.extension === 'pdbqt')!;
  const receptor = await grok.dapi.files.readAsText(receptorFile);

  const diffDockModel = new DiffDockModel(table, smiles.cell.column, receptor, receptorFile.name, poses);
  const virtualPosesColumnName = getVirtualPosesColumnName(receptorFile.name, poses);

  let virtualPosesColumn = table.columns.byName(virtualPosesColumnName);

  if (!virtualPosesColumn) {
    virtualPosesColumn = await diffDockModel.createColumn(DG.TYPE.STRING, virtualPosesColumnName, table.rowCount);
    table.columns.add(virtualPosesColumn);
    const posesJson = await diffDockModel.getPosesJson(smiles.value, smiles.units);
    virtualPosesColumn.set(smiles.cell.rowIndex, JSON.stringify(posesJson));
    diffDockModel.virtualPosesColumn = virtualPosesColumn;
  } else
    diffDockModel.virtualPosesColumn = virtualPosesColumn;

  const posesJson = JSON.parse(virtualPosesColumn.get(smiles.cell.rowIndex));
  const { bestId, bestPose, confidence } = diffDockModel.findBestPose(posesJson);
  const combinedControl = await diffDockModel.createCombinedControl(posesJson, bestPose, bestId, false);

  resultsContainer.removeChild(loader);
  resultsContainer.append(combinedControl);
}

function getVirtualPosesColumnName(target: string, poses: number): string {
  return `${CONSTANTS.VIRTUAL_POSES_COLUMN_NAME}_${target}_${poses}`;
}