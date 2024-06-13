/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {drawZoomedInMolecule} from './components/draw-molecule';
import {MonomerLibWrapper} from '../model/monomer-lib/lib-wrapper';
import {_package} from '../../../package';

export class MonomerLibViewer {
  static async view(): Promise<void> {
    const table = _package.monomerLibWrapper.getTableForViewer();
    table.name = 'Monomer Library';
    const view = grok.shell.addTableView(table);
    view.grid.props.allowEdit = false;
    const onDoubleClick = view.grid.onCellDoubleClick;
    onDoubleClick.subscribe(async (gridCell: DG.GridCell) => {
      const molfile = gridCell.cell.value;
      if (gridCell.tableColumn?.semType === 'Molecule')
        await drawZoomedInMolecule(molfile);
    });
  }
}
