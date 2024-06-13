import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {Molecule3DUnitsHandler} from '@datagrok-libraries/bio/src/molecule-3d';
import {BiostructureData, BiostructureDataJson} from '@datagrok-libraries/bio/src/pdb/types';

import {defaultErrorHandler} from './err-info';

import {_package, openPdbResidues} from '../package';

export type BiostructureViewerWindowType = Window & {
  $biostructureViewer?: {
    contextMenuError?: any,
  },
};
declare const window: BiostructureViewerWindowType;

export function addContextMenuUI(event: DG.EventData): void {
  try {
    if (event.args.item) {
      const item = event.args.item;
      // TODO: TreeViewNode.value is not real DG.FileInfo (no extension property)
      // if ((item instanceof DG.TreeViewNode))
      //   item = item.value;
      const menu: DG.Menu = event.args.menu;
      if (item instanceof DG.FileInfo || item.constructor.name == 'FileInfo') {
        const fi: DG.FileInfo = item;
        if (addContextMenuForFileInfo(fi, menu))
          event.preventDefault();
      } else if (item instanceof DG.GridCell || item.constructor.name == 'GridCell') {
        const gridCell: DG.GridCell = item;
        if (addContextMenuForCell(gridCell, menu))
          event.preventDefault();
      }
    }
  } catch (err: any) {
    defaultErrorHandler(err);
    if (!window.$biostructureViewer) window.$biostructureViewer = {};
    window.$biostructureViewer.contextMenuError = err;
  }
}

export function addContextMenuForFileInfo(fi: DG.FileInfo, menu: DG.Menu): boolean {
  switch (fi.extension.toLowerCase()) {
  case 'pdb': {
    menu.item('Open table residues', async () => {
      openPdbResidues(fi)
        .catch(defaultErrorHandler);
    });
    return true;
  }
  }
  return false;
}

export function addContextMenuForCell(gridCell: DG.GridCell, menu: DG.Menu): boolean {
  const logPrefix: string = `BsV: addContextMenuForCell()`;
  _package.logger.debug(`${logPrefix}, start`);

  function copyRawValue(): void {
    const tgtValue: string = gridCell.cell.value;
    if (!navigator.clipboard) {
      //
      grok.shell.warning('The clipboard functionality requires a secure origin, either HTTPS or localhost.');
    } else {
      navigator.clipboard.writeText(tgtValue)
        .catch(defaultErrorHandler);
      grok.shell.info(`Value copied to clipboard`);
    }
  }

  function downloadRawValue(): void {
    const tableCol = gridCell.tableColumn!;
    const mh = Molecule3DUnitsHandler.getOrCreate(tableCol);

    const fileName: string = mh.getFileName(gridCell.cell);
    const tgtValue: string = gridCell.cell.value;
    DG.Utils.download(fileName, tgtValue);
  }

  async function showNglViewer(): Promise<void> {
    const tableCol = gridCell.tableColumn!;
    const mh = Molecule3DUnitsHandler.getOrCreate(tableCol);

    const valueData: BiostructureData = {
      binary: false,
      data: gridCell.cell.value,
      ext: mh.fileExt(),
    };
    if (gridCell.grid.view instanceof DG.TableView) {
      const view = gridCell.grid.view as DG.TableView;
      const viewer = await gridCell.tableColumn?.dataFrame.plot.fromType('NGL', {
        dataJson: BiostructureDataJson.fromData(valueData),
      });
      if (viewer) view.dockManager.dock(viewer.root);
    }
  }

  async function showBiostructureViewer(): Promise<void> {
    const tableCol = gridCell.tableColumn!;
    const uh = Molecule3DUnitsHandler.getOrCreate(tableCol);

    const valueData: BiostructureData = {
      binary: false,
      data: gridCell.cell.value,
      ext: uh.fileExt(),
    };
    if (gridCell.grid.view instanceof DG.TableView) {
      const view = gridCell.grid.view as DG.TableView;
      const viewer = await gridCell.tableColumn?.dataFrame.plot.fromType('Biostructure', {
        dataJson: BiostructureDataJson.fromData(valueData),
      });
      if (viewer) view.dockManager.dock(viewer.root);
    }
  }

  if (gridCell && gridCell.tableColumn) {
    switch (gridCell.tableColumn.semType) {
    case DG.SEMTYPE.MOLECULE3D: {
      menu
        .item('Copy', copyRawValue)
        .item('Download', downloadRawValue);
      const showG = menu.group('Show');
      const nglM = showG.item('Biostructure', showBiostructureViewer, null,
        {description: 'Show with Biostructure (mol*) viewer'});
      const msM = showG.item('NGL', showNglViewer, null,
        {description: 'Show with NGL viewer'});
      return true;
    }
    }
  }
  return false;
}
