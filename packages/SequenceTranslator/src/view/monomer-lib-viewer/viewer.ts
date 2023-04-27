/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {drawZoomedInMolecule} from '../utils/draw-molecule';
import {MonomerLibWrapper} from '../../model/monomer-lib-utils/lib-wrapper';

export class MonomerLibViewer {
  static async view(): Promise<void> {
    const table = MonomerLibWrapper.getInstance().getTableForViewer();
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
