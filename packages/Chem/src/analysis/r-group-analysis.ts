import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {findMCS, findRGroups} from '../scripts-api';
import { getRdKitModule } from '../package';

export function convertToRDKit(smiles: string | null): string | null {
  if (smiles !== null) {
    const regexConv: RegExp = /(\[)(R)(\d+)(\])/g;
    const match = regexConv.exec(smiles);
    if (match !== null)
      smiles = smiles.replace(regexConv, `${match[1]}*:${match[3]}${match[4]}`);
  }
  return smiles;
}

/**
 * Opens a dialog with the sketcher that allows to sketch a core (or perform MCS),
 * and initiate the R-Group Analysis for the specified column with molecules.
 */
export function rGroupAnalysis(col: DG.Column): void {
  const sketcher = new grok.chem.Sketcher();
  const columnPrefixInput = ui.stringInput('Column prefix', 'R');
  const visualAnalysisCheck = ui.boolInput('Visual analysis', true);

  const mcsButton = ui.button('MCS', async () => {
    ui.setUpdateIndicator(sketcher.root, true);
    const smiles: string = await findMCS(col.name, col.dataFrame);
    ui.setUpdateIndicator(sketcher.root, false);
    sketcher.setSmiles(smiles);
  });
  ui.tooltip.bind(mcsButton, 'Most Common Substructure');
  const mcsButtonHost = ui.div([mcsButton]);
  mcsButtonHost.style.display = 'flex';
  mcsButtonHost.style.justifyContent = 'center';

  const dlg = ui.dialog({
    title: 'R-Groups Analysis',
    helpUrl: '/help/domains/chem/cheminformatics.md#r-group-analysis',
  })
    .add(ui.div([
      sketcher,
      mcsButtonHost,
      columnPrefixInput,
      visualAnalysisCheck,
    ]))
    .onOK(async () => {
      const core = sketcher.getSmiles();
      if (core !== null) {
        const res = await findRGroups(col.name, col.dataFrame, core, columnPrefixInput.value);
        const module = getRdKitModule();

        for (const resCol of res.columns) {
          const molsArray = new Array<string>(resCol.length)
           for(let i = 0; i < resCol.length; i++) {
            const mol = module.get_mol(resCol.get(i));
            molsArray[i] = mol.get_molblock().replace('ISO', 'RGP');
            mol.delete();
          }
          const rCol = DG.Column.fromStrings(resCol.name, molsArray);

          rCol.semType = DG.SEMTYPE.MOLECULE;
          rCol.setTag(DG.TAGS.UNITS, 'molblock')
          col.dataFrame.columns.add(rCol);
        }
        if (res.columns.length == 0)
          grok.shell.error('None R-Groups were found');

        const view = grok.shell.getTableView(col.dataFrame.name);
        if (visualAnalysisCheck.value && view) {
          view.trellisPlot({
            xColumnNames: [res.columns.byIndex(0).name],
            yColumnNames: [res.columns.byIndex(1).name],
          });
        }
      } else
        grok.shell.error('No core was provided');
    });
  dlg.show();
  dlg.initDefaultHistory();
}
