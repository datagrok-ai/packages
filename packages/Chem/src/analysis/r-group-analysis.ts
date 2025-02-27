import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {ChemTemps} from '@datagrok-libraries/chem-meta/src/consts';
import { findRGroups, findRGroupsWithCore } from '../scripts-api';
import { convertMolNotation, getRdKitModule } from '../package';
import { getMCS } from '../utils/most-common-subs';
import { IRGroupAnalysisResult } from '../rdkit-service/rdkit-service-worker-substructure';
import { getRdKitService } from '../utils/chem-common-rdkit';
import { _convertMolNotation } from '../utils/convert-notation-utils';
import { SCAFFOLD_COL } from '../constants';
import { delay } from '@datagrok-libraries/utils/src/test';
import { hexToPercentRgb } from '../utils/chem-common';
import { getMolSafe, getQueryMolSafe } from '../utils/mol-creation_rdkit';
import { MolfileHandler } from '@datagrok-libraries/chem-meta/src/parsing-utils/molfile-handler';
import { RDMol } from '@datagrok-libraries/chem-meta/src/rdkit-api';
import {ISubstruct} from '@datagrok-libraries/chem-meta/src/types';

const R_GROUP_PARAMS_STORAGE_NAME = 'r-group-params';
const R_GROUP_PARAMS_KEY = 'selected';

let rGroupSettings: RGroupsSettings | null = null;

const enum RGroupMatchingStrategy {
  Greedy = 'Greedy',
  GreedyChunks = 'GreedyChunks',
  Exhaustive = 'Exhaustive',
  NoSymmetrization = 'NoSymmetrization',
  GA = 'GA'
};

export type RGroupParams = {
  molColName: string,
  core: string,
  rGroupName: string,
  rGroupMatchingStrategy: string,
  onlyMatchAtRGroups: boolean
}

export type RGroupDecompRes = {
  xAxisColName: string,
  yAxisColName: string,
  highlightColName?: string,
}

// const enum RGroupAlignment {
//   None = 'None',
//   NoAlignment = 'NoAlignment',
//   MCS = 'MCS'
// };

type RGroupsRes = {
  rGroups: DG.Column<string>[];
  highlightCol?: DG.Column<object>;
}

type RGroupsSettings = {
  rGroupMatchingStrategy: RGroupMatchingStrategy;
  onlyMatchAtRGroups: boolean;
}

const matchingStrategies: RGroupMatchingStrategy[] = [
  RGroupMatchingStrategy.Greedy,
  RGroupMatchingStrategy.GreedyChunks,
  RGroupMatchingStrategy.Exhaustive,
  RGroupMatchingStrategy.GA,
  RGroupMatchingStrategy.NoSymmetrization,
];

//const alignments: RGroupAlignment[] = [RGroupAlignment.MCS, RGroupAlignment.NoAlignment, RGroupAlignment.None];

const latestAnalysisCols: { [key: string]: string[] } = {};
const latestTrellisPlot: { [key: string]: DG.Viewer | null } = {};
const isMatchColName = 'isMatch';

export function convertToRDKit(smiles: string): string {
  const regexConv: RegExp = /(\[)(R)(\d+)(\])/g;
  const match = regexConv.exec(smiles);
  if (match !== null)
    smiles = smiles.replace(regexConv, `${match[1]}*:${match[3]}${match[4]}`);

  return smiles;
}

/**
 * Opens a dialog with the sketcher that allows to sketch a core (or perform MCS),
 * and initiate the R-Group Analysis for the specified column with molecules.
 * @param {DG.Column} col Column for which to perform R-Group Analysis with specified core
 */
export function rGroupAnalysis(col: DG.Column, demo = false): void {
  loadRGroupUserSettings();
  const sketcher = new DG.chem.Sketcher();

  //General fields
  const molColNames = col.dataFrame.columns.bySemTypeAll(DG.SEMTYPE.MOLECULE).map((c) => c.name);
  const columnInput = ui.input.choice('Molecules', {value: col.name, items: molColNames});
  const columnPrefixInput = ui.input.string('Column prefix', {value: 'R'});
  ui.tooltip.bind(columnPrefixInput.captionLabel, 'Prefix for R Group columns');
  const visualAnalysisCheck = ui.input.bool('Visual analysis', {value: true});
  ui.tooltip.bind(visualAnalysisCheck.captionLabel, 'Add trellis plot after analysis is completed');
  const replaceLatest = ui.input.bool('Replace latest', {value: true});
  ui.tooltip.bind(replaceLatest.captionLabel, 'Overwrite latest analysis results by new one');

  //MCS fields
  const mcsButton = ui.button('MCS', async () => {
    ui.setUpdateIndicator(sketcher.root, true);
    try {
      const molCol = col.dataFrame.columns.byName(columnInput.value!);
      //TODO: implements mcs using web worker
      const mcsSmarts = await getMCS(molCol, mcsExactAtomsCheck.value!, mcsExactBondsCheck.value!);
      if (mcsSmarts !== null) {
        ui.setUpdateIndicator(sketcher.root, false);
        const mol = getQueryMolSafe(mcsSmarts, '', getRdKitModule());
        if (mol)
          sketcher.setMolFile(mol.get_molblock());
        mol?.delete();
      }
    } catch (e: any) {
      grok.shell.error(e);
      dlg.close();
    }
  });
  ui.tooltip.bind(mcsButton, 'Calculate Most Common Substructure');
  mcsButton.classList.add('chem-mcs-button');
  const mcsExactAtomsCheck = ui.input.bool('Exact atoms', {value: true});
  const mcsExactBondsCheck = ui.input.bool('Exact bonds', {value: true});

  //R groups fields
  const rGroupMatchingStrategy = ui.input.choice('Matching strategy', {
    value: rGroupSettings?.rGroupMatchingStrategy ?? RGroupMatchingStrategy.Greedy, items: matchingStrategies,
    onValueChanged: (value) => {
      rGroupSettings!.rGroupMatchingStrategy = value;
      saveRGroupUserSettings();
    }});
  rGroupMatchingStrategy.root.style.display = 'none';
  const onlyMatchAtRGroupsInput = ui.input.bool('Only match at R groups', {
    value: rGroupSettings?.onlyMatchAtRGroups ?? false, onValueChanged: (value) => {
      rGroupSettings!.onlyMatchAtRGroups = value;
      saveRGroupUserSettings();
    }});
  onlyMatchAtRGroupsInput.root.style.display = 'none';
  ui.tooltip.bind(onlyMatchAtRGroupsInput.captionLabel, 'Return matches only for labelled R groups');

  //settings button to adjust mcs and r-groups settings
  const rGroupsSettingsIcon = ui.iconFA('cog', () => {
    rGroupSettinsOpened = !rGroupSettinsOpened;
    const display = !rGroupSettinsOpened ? 'none' : 'flex';
    rGroupMatchingStrategy.root.style.display = display;
    onlyMatchAtRGroupsInput.root.style.display = display;
  }, 'R group analysis settings');
  rGroupsSettingsIcon.classList.add('chem-rgroup-settings-icon');
  let rGroupSettinsOpened = false;

  const dlg = ui.dialog({
    title: 'R-Groups Analysis',
    helpUrl: '/help/datagrok/solutions/domains/chem/chem.md#r-groups-analysis',
  })
    .add(ui.div([
      sketcher,
      ui.div([
        ui.divH([mcsButton, mcsExactAtomsCheck.root, mcsExactBondsCheck.root], { style: { paddingLeft: '108px' } }),
        columnInput,
        columnPrefixInput,
        ui.divH([visualAnalysisCheck.root, latestAnalysisCols[col.dataFrame.name]?.length ? replaceLatest.root : null]),
        rGroupsSettingsIcon,
        rGroupMatchingStrategy,
        onlyMatchAtRGroupsInput
      ], 'chem-rgroup-settings-div')
    ]))
    .onOK(async () => {
      try {
        if (replaceLatest.value) {
          removeLatestAnalysis(col);
          await delay(50);
        }
        const smarts = await sketcher.getSmarts();
        const funcCall = await DG.Func.find({ name: 'rGroupDecomposition' })[0].prepare({
          df: col.dataFrame,
          molColName: columnInput.value!,
          core: smarts,
          rGroupName: columnPrefixInput.value,
          rGroupMatchingStrategy: rGroupMatchingStrategy.value!,
          visualAnalysis: visualAnalysisCheck.value!,
        }).call(undefined, undefined, { processed: false });
        const res: RGroupDecompRes = funcCall.getOutputParamValue();
        if (res) {
          const view = demo ? (grok.shell.view('Browse')! as DG.BrowseView)!.preview! as DG.TableView : grok.shell.getTableView(col.dataFrame.name);
          //make highlight column invisible
          if (res.highlightColName)
            view.grid.col(res.highlightColName)!.visible = false;
          if (visualAnalysisCheck.value! && view) {
            if (!res.yAxisColName && !res.xAxisColName)
              grok.shell.error('No R-Groups were found');
            else if (!res.yAxisColName || !res.xAxisColName)
              grok.shell.warning(`Not enough R group columns to create trellis plot`);
            else
              latestTrellisPlot[col.dataFrame.name] = view.trellisPlot({
                xColumnNames: [res.xAxisColName],
                yColumnNames: [res.yAxisColName],
              });
          }
        }
      } catch (e: any) {
        grok.shell.error(e.message);
      }
    });
  dlg.show();
  dlg.initDefaultHistory();
}


export async function rGroupDecomp(col: DG.Column, params: RGroupParams): Promise<RGroupDecompRes | undefined> {
  const getPrefixIdx = (colPrefix: string) => {
    let prefixIdx = 0;
    col = col.dataFrame.columns.byName(params.molColName);
    const re = new RegExp(`^${colPrefix}$`, 'i');
    if (col.dataFrame.columns.names().filter(((it) => it.match(re))).length) {
      prefixIdx++;
      const maxPrefixIdx = 100;
      for (let i = 0; i < maxPrefixIdx; i++) {
        const reIdx = new RegExp(`^${colPrefix}_${prefixIdx}$`, 'i');
        if (!col.dataFrame.columns.names().filter(((it) => it.match(reIdx))).length)
          break;
        prefixIdx++;
      }
      if (prefixIdx - 1 === maxPrefixIdx) {
        grok.shell.error('Table contains columns named \'R[number]\', please change column prefix');
        return null;
      }
    }
    return prefixIdx;
  };
  const rGroupPrefixRe = `${params.rGroupName}\\d+`;
  const corePrefixRe = `Core`;
  const rGroupPrefixIdx = getPrefixIdx(rGroupPrefixRe);
  const corePrefixIdx = getPrefixIdx(corePrefixRe);
  if (rGroupPrefixIdx === null || corePrefixIdx === null)
    return;
  let core = params.core;
  if (!core) {
    grok.shell.error('No core was provided');
    return;
  }

  let progressBar;
  try {
    const coreSmarts = core;
    core = convertMolNotation(core, DG.chem.Notation.Smarts, DG.chem.Notation.MolBlock);
    const labelledRGroups = !!MolfileHandler.getInstance(core)
      .atomTypes.filter((it) => it.startsWith('R')).length && core.includes('M  RGP');
    if (!labelledRGroups && params.onlyMatchAtRGroups)
      throw (new Error(`Core has no labelled R groups. Add labelled R groups to core or set 
    'Only match at R groups' parameter to false`));
    const coreIsQMol = core.includes('M  ALS') || core.includes('M  RAD');
    if (coreIsQMol)
      core = coreSmarts;
    progressBar = DG.TaskBarProgressIndicator.create(`RGroup analysis running...`);
    //const res = await rGroupsPython(col, core, columnPrefixInput.value, true, onlyMatchAtRGroups);

    const rGroupOptions = {
      matchingStrategy: params.rGroupMatchingStrategy,
      includeTargetMolInResults: true,
      onlyMatchAtRGroups: params.onlyMatchAtRGroups,
    };
    const { rGroups, highlightCol } = await rGroupsMinilib(col, core, coreIsQMol, rGroupPrefixIdx, rGroupOptions);
    const rdkit = getRdKitModule();
    if (rGroups.length) {
      //unmatched are those items for which all R group cols are empty
      const unmatchedItems = new Uint8Array(rGroups[0].length).fill(0);
      latestAnalysisCols[col.dataFrame.name] = [];
      for (const resCol of rGroups) {
        const molsArray = new Array<string>(resCol.length);
        for (let i = 0; i < resCol.length; i++) {
          const molStr = resCol.get(i);
          if (resCol.name !== 'Core') { //R Group columns
            if (!molStr)
              unmatchedItems[i] += 1;
            else
              molsArray[i] = molStr;
          } else { //Core column - need to create molblock to align initial molecule by core
            let mol: RDMol | null = null;
            if (molStr) {
              try {
                mol = rdkit.get_mol(molStr); //try to get mol. In case fail - try to get qmol
                if (!mol)
                  mol = rdkit.get_qmol(molStr);
                if (mol)
                  molsArray[i] = mol.get_molblock().replace('ISO', 'RGP');
              } catch (e) {
                //do nothing here, molsArray[i] is empty for invalid molecules
              } finally {
                mol?.delete();
              }
            }
          }
        }
        let rColName = '';
        if (resCol.name === 'Core') {
          rColName = corePrefixIdx ? `${resCol.name}_${corePrefixIdx}` : resCol.name;
          col.temp[SCAFFOLD_COL] = rColName;
        } else
          rColName = rGroupPrefixIdx ? `${resCol.name}_${rGroupPrefixIdx}` : resCol.name;
        resCol.name = rColName;
        const rCol = DG.Column.fromStrings(rColName, molsArray);
        rCol.semType = DG.SEMTYPE.MOLECULE;
        rCol.meta.units = DG.chem.Notation.MolBlock;
        col.dataFrame.columns.add(rCol);
        latestAnalysisCols[col.dataFrame.name].push(rColName);
      }
      //create column for r groups highlight
      if (highlightCol) {
        col.dataFrame.columns.add(highlightCol);
        latestAnalysisCols[col.dataFrame.name].push(highlightCol.name);
        col.temp[ChemTemps.SUBSTRUCT_COL] = highlightCol.name;
      }
      //create boolean column for match/non match
      const matchCol = DG.Column
        .bool(`${rGroupPrefixIdx ? `${isMatchColName}_${rGroupPrefixIdx}` : isMatchColName}`,
          rGroups[0].length)
        .init((i) => unmatchedItems[i] !== rGroups.length - 1);
      col.dataFrame.columns.add(matchCol);
      latestAnalysisCols[col.dataFrame.name].push(matchCol.name);
      //filter out unmatched values
      const filterUnmatched = DG.BitSet.create(rGroups[0].length).init((i) => matchCol.get(i));
      col.dataFrame.filter.copyFrom(filterUnmatched);
    }
    progressBar.close();

    return {
      xAxisColName: rGroups.length > 1 ? rGroups[1].name : '',  //rGroups[0] column is Core column
      yAxisColName: rGroups.length > 2 ? rGroups[2].name : '',
      highlightColName: rGroups.length ? highlightCol?.name : undefined,
    };

  } catch (e: any) {
    grok.shell.error(e);
    progressBar?.close();
  }
}


export async function rGroupsMinilib(molecules: DG.Column<string>, coreMolecule: string,
  coreIsQMol: boolean, rGroupPrefixIdx: number, options?:
    { [key: string]: string | boolean }): Promise<RGroupsRes> {
  if (!coreMolecule)
    throw new Error('No core was provided');
  const res: IRGroupAnalysisResult =
    await (await getRdKitService())
      .getRGroups(molecules.toList(), coreMolecule, coreIsQMol, options ? JSON.stringify(options) : '');
  const resCols: DG.Column<string>[] = [];
  for (let i = 0; i < res.colNames.length; i++) {
    const col = DG.Column.string(res.colNames[i], molecules.length).init((j) => res.smiles[i][j]);
    col.semType = DG.SEMTYPE.MOLECULE;
    resCols.push(col);
  }
  //creating highlight column
  const highlightColName = `r-groups-highlight_${rGroupPrefixIdx}`;
  const rGroupsNum = res.atomsToHighLight.length;
  const colors = Array<Array<number>>(rGroupsNum);
  for (let r = 0; r < rGroupsNum; r++)
    colors[r] = hexToPercentRgb(DG.Color.toHtml(DG.Color.getCategoricalColor(r)))!;

  const substructCol = DG.Column.fromType('object', highlightColName, molecules.dataFrame.rowCount)
    .init((i) => {
      const substr: ISubstruct = {
        atoms: [],
        bonds: [],
        highlightAtomColors: {},
        highlightBondColors: {},
      };
      for (let j = 0; j < rGroupsNum; j++) {
        if (res.atomsToHighLight[j][i]) {
          res.atomsToHighLight[j][i].forEach((atom) => substr.highlightAtomColors![atom] = colors[j]);
          substr.atoms = substr.atoms!.concat(Array.from(res.atomsToHighLight[j][i]));
        }
        if (res.bondsToHighLight[j][i]) {
          res.bondsToHighLight[j][i].forEach((bond) => substr.highlightBondColors![bond] = colors[j]);
          substr.bonds = substr.bonds!.concat(Array.from(res.bondsToHighLight[j][i]));
        }
      }
      return substr;
    });
  return { rGroups: resCols, highlightCol: substructCol };
}

export async function rGroupsPython(col: DG.Column<string>, core: string, prefix: string, withCore: boolean,
  onlyMatchAtRGroups: boolean):
  Promise<RGroupsRes> {
  const resCols = [];
  const res = withCore ? await findRGroupsWithCore(col.name, col.dataFrame, core, onlyMatchAtRGroups) :
    await findRGroups(col.name, col.dataFrame, core, prefix);
  const module = getRdKitModule();
  if (res.rowCount) {
    for (const resCol of res.columns) {
      const molsArray = new Array<string>(resCol.length);
      for (let i = 0; i < resCol.length; i++) {
        const molStr = resCol.get(i);
        try {
          const mol = module.get_mol(molStr);
          molsArray[i] = mol.get_molblock().replace('ISO', 'RGP');
          mol.delete();
        } catch (e) {
          console.warn(`RGroupAnalysisWarning: skipping invalid molecule '${molStr}' at index ${i}`);
        }
      }
      const rCol = DG.Column.fromStrings(resCol.name, molsArray);
      rCol.semType = DG.SEMTYPE.MOLECULE;
      rCol.meta.units = DG.chem.Notation.MolBlock;
      resCols.push(rCol);
    }
  }
  return { rGroups: resCols };
}
function removeLatestAnalysis(col: DG.Column) {
  if (latestTrellisPlot[col.dataFrame.name] && latestTrellisPlot[col.dataFrame.name]!.dataFrame)
    latestTrellisPlot[col.dataFrame.name]!.close();
  delete latestTrellisPlot[col.dataFrame.name];
  if (latestAnalysisCols[col.dataFrame.name])
    latestAnalysisCols[col.dataFrame.name]!.forEach((colName: string) => col.dataFrame.columns.remove(colName));
  delete latestAnalysisCols[col.dataFrame.name];
}

export function loadRGroupUserSettings() {
  if (!rGroupSettings) {
    const settingsStr = grok.userSettings.getValue(R_GROUP_PARAMS_STORAGE_NAME, R_GROUP_PARAMS_KEY);
    rGroupSettings = settingsStr ? JSON.parse(settingsStr) :
      { rGroupMatchingStrategy: RGroupMatchingStrategy.Greedy, onlyMatchAtRGroups: false };
  }
}

function saveRGroupUserSettings() {
  grok.userSettings.add(R_GROUP_PARAMS_STORAGE_NAME, R_GROUP_PARAMS_KEY, JSON.stringify(rGroupSettings));
}
