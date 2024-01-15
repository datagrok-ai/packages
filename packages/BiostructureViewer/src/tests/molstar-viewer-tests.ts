import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import wu from 'wu';

import {category, delay, expect/*, expect*/, test, testEvent} from '@datagrok-libraries/utils/src/test';
import {BiostructureData, BiostructureDataJson} from '@datagrok-libraries/bio/src/pdb/types';
import {BiostructureProps, IBiostructureViewer} from '@datagrok-libraries/bio/src/viewers/molstar-viewer';

import {awaitGrid} from './utils';
import {PdbGridCellRendererBack} from '../utils/pdb-grid-cell-renderer';
import {DebounceIntervals, MolstarViewer, PROPS as msvPROPS} from '../viewers/molstar-viewer/molstar-viewer';

import {_package} from '../package-test';


category('MolstarViewer', () => {
  test('ligands-Molecule', async () => {
    const [sdfCnt, pdbData]: [Uint8Array, BiostructureData] = await Promise.all([
      _package.files.readAsBytes('samples/1bdq-obs-pred.sdf'),
      (async () => {
        return {binary: true, ext: 'pdb', data: await _package.files.readAsBytes('samples/1bdq-wo-ligands.pdb')};
      })(),
    ]);
    const df: DG.DataFrame = (await grok.functions.call('Chem:importSdf', {bytes: sdfCnt}))[0];
    const ligandCol = df.getCol('molecule');

    const view = grok.shell.addTableView(df);
    await awaitGrid(view.grid);

    const viewer = (await df.plot.fromType('Biostructure', {
      [msvPROPS.dataJson]: BiostructureDataJson.fromData(pdbData),
      [msvPROPS.ligandColumnName]: ligandCol.name,
      [msvPROPS.showCurrentRowLigand]: true,
      [msvPROPS.showSelectedRowsLigands]: true,
    })) as unknown as MolstarViewer;
    view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure', 0.4);

    // The currentRowIdx is set to 0 by default at start
    // df.currentRowIdx = -1;
    // await awaitGrid(view.grid);
    // await Promise.all([viewer.viewPromise, viewer.ligandsPromise]);
    // expect(viewer.ligands.current === null, true, 'No current ligand expected');
    // expect(viewer.ligands.selected.length, 0);

    df.currentRowIdx = 0;
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    await delay(DebounceIntervals.ligands * 2.5); // await for debounce onRebuildViewLigands
    expect(viewer.ligands.current !== null, true, 'The current ligand expected.');
    expect(viewer.ligands.current!.rowIdx, 0, 'The current ligand of rowIdx = 0.');
    expect(viewer.ligands.selected.length, 0);

    df.selection.init((rowI) => rowI === 1 || rowI === 2);
    await delay(DebounceIntervals.ligands * 2.5); // await for debounce onRebuildViewLigands
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    expect(viewer.ligands.current != null, true, 'The current ligand expected.');
    expect(viewer.ligands.current!.rowIdx, 0, 'The current ligand of rowIdx = 0.');
    expect(viewer.ligands.selected.length, 2);

    df.currentRowIdx = 3;
    await delay(DebounceIntervals.ligands * 2.5); // await for debounce onRebuildViewLigands
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    expect(viewer.ligands.current != null, true, 'The current ligand expected.');
    expect(viewer.ligands.current!.rowIdx, 3, 'The current ligand of rowIdx = 3.');
    expect(viewer.ligands.selected.length, 2);
  });

  test('ligands-Molecule3D', async () => {
    const [pdbqtCnt, targetData]: [string, BiostructureData] = await Promise.all([
      _package.files.readAsText('docking/ligand_out.pdbqt'),
      (async () => {
        return {binary: true, ext: 'pdbqt', data: await _package.files.readAsBytes('docking/3SWZ.pdbqt')};
      })(),
    ]);
    const df: DG.DataFrame = (await grok.functions.call('BiostructureViewer:importPdbqt',
      {fileContent: pdbqtCnt, test: true}))[0];
    const ligandCol = df.getCol('molecule');

    const view = grok.shell.addTableView(df);
    await awaitGrid(view.grid);

    const viewer = (await df.plot.fromType('Biostructure', {
      [msvPROPS.dataJson]: BiostructureDataJson.fromData(targetData),
      [msvPROPS.ligandColumnName]: ligandCol.name,
      [msvPROPS.showCurrentRowLigand]: true,
      [msvPROPS.showSelectedRowsLigands]: true,
    })) as unknown as MolstarViewer;
    view.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure', 0.4);

    df.currentRowIdx = 0;
    await delay(50); // await for debounce onRebuildViewLigands
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    expect(viewer.ligands.current !== null, true, 'The current ligand expected');
    expect(viewer.ligands.current!.rowIdx, 0, 'The current ligand of rowIdx = 0.');
    expect(viewer.ligands.selected.length, 0);

    df.selection.init((rowI) => rowI === 2 || rowI === 3);
    await delay(50); // await for debounce onRebuildViewLigands
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    expect(viewer.ligands.current != null, true, 'The current ligand expected');
    expect(viewer.ligands.current!.rowIdx, 0, 'The current ligand of rowIdx = 0.');
    expect(viewer.ligands.selected.length, 2);

    df.currentRowIdx = 1;
    await delay(50); // await for debounce onRebuildViewLigands
    await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);
    expect(viewer.ligands.current != null, true, 'The current ligand expected');
    expect(viewer.ligands.current!.rowIdx, 1, 'The current ligand of rowIdx = 1.');
    expect(viewer.ligands.selected.length, 2);
  });

  const pdbIdCsv: string = `pdb_id
1QBS
1ZP8
2BDJ
1IAN
4UJ1
2BPW`;

  test('pdb_id', async () => {
    const logPrefix: string = `Tests: MolstarViewer.pdb_id`;
    const df = DG.DataFrame.fromCsv(pdbIdCsv);
    const tv = grok.shell.addTableView(df);
    const viewer = await df.plot.fromType('Biostructure',
      {
        biostructureIdColumnName: 'pdb_id',
        biostructureDataProvider: 'BiostructureViewer:getBiostructureRcsbMmcif'
      }) as DG.Viewer<BiostructureProps> & IBiostructureViewer;
    tv.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure with data provider', 0.4);

    // await delay(50); // await for debounce onRebuildViewLigands
    // await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);

    df.currentRowIdx = 0;
    _package.logger.debug(`${logPrefix}, df.currentRowIdx = ${df.currentRowIdx}`);
    await awaitGrid(tv.grid);
    await delay(DebounceIntervals.currentRow * 2.5);
    await viewer.awaitRendered(15000);
    const aViewer = viewer as any;
    expect(aViewer.dataEff !== null, true, 'dataEff is null');
    expect(aViewer.dataEff.options.name, '1QBS');
    expect((aViewer.dataEffStructureRefs?.length ?? 0) >= 2, true, 'Structure in the viewer not found');

    df.currentRowIdx = 2;
    _package.logger.debug(`${logPrefix}, df.currentRowIdx = ${df.currentRowIdx}`);
    await awaitGrid(tv.grid);
    await delay(DebounceIntervals.currentRow * 2.5);
    await viewer.awaitRendered(15000);
    expect(aViewer.dataEff !== null, true, 'dataEff is null');
    expect(aViewer.dataEff.options.name, '2BDJ');
    expect((aViewer.dataEffStructureRefs?.length ?? 0) >= 2, true, 'Structure in the viewer not found');
  }, {timeout: 40000});

  test('bcif_id_binary', async () => {
    const logPrefix: string = `Tests: MolstarViewer.bcif_id_binary`;
    const df = DG.DataFrame.fromCsv(pdbIdCsv);
    const tv = grok.shell.addTableView(df);
    const viewer = await df.plot.fromType('Biostructure',
      {
        biostructureIdColumnName: 'pdb_id',
        biostructureDataProvider: 'BiostructureViewer:getBiostructureRcsbBcif'
      }) as DG.Viewer<BiostructureProps> & IBiostructureViewer;
    tv.dockManager.dock(viewer, DG.DOCK_TYPE.RIGHT, null, 'Biostructure with data provider', 0.4);

    // await delay(50); // await for debounce onRebuildViewLigands
    // await Promise.all([awaitGrid(view.grid), viewer.awaitRendered()]);

    df.currentRowIdx = 0;
    _package.logger.debug(`${logPrefix}, df.currentRowIdx = ${df.currentRowIdx}`);
    await awaitGrid(tv.grid);
    await delay(DebounceIntervals.currentRow * 2.5);
    await viewer.awaitRendered(15000);
    const aViewer = viewer as any;
    expect(aViewer.dataEff !== null, true, 'dataEff is null');
    expect(aViewer.dataEff.options.name, '1QBS');
    expect((aViewer.dataEffStructureRefs?.length ?? 0) >= 2, true, 'Structure in the viewer not found');

    df.currentRowIdx = 2;
    _package.logger.debug(`${logPrefix}, df.currentRowIdx = ${df.currentRowIdx}`);
    await awaitGrid(tv.grid);
    await delay(DebounceIntervals.currentRow * 2.5);
    await viewer.awaitRendered(15000);
    expect(aViewer.dataEff !== null, true, 'dataEff is null');
    expect(aViewer.dataEff.options.name, '2BDJ');
    expect((aViewer.dataEffStructureRefs?.length ?? 0) >= 2, true, 'Structure in the viewer not found');
  }, {timeout: 40000});

  test('pdb_data', async () => {
    const df = await _package.files.readCsv('pdb_data.csv');
    const view = grok.shell.addTableView(df);
    const pdbGCol = view.grid.col('pdb')!;
    expect(!!pdbGCol, true, `'pdb' column not found`);

    const back = PdbGridCellRendererBack.getOrCreate(pdbGCol);
    await back.awaitRendered(15000);

    // region Click
    const cellPdb0 = view.grid.cell('pdb', 0);
    const grb = view.grid.root.getBoundingClientRect();
    const cb = cellPdb0.bounds;
    const ev = new MouseEvent('click', {
      cancelable: true, bubbles: true, view: window, button: 0,
      clientX: grb.left + cb.left + 3, clientY: grb.top + cb.top + 3,
    });
    const gridOverlay = $(view.grid.root).find('canvas').get()[2];
    await testEvent(back.onClicked, () => {}, () => {
      gridOverlay.dispatchEvent(ev); // Click
    }, 20000);
    // endregion Click

    const viewer = wu(view.viewers)
      .find((v) => v.type === 'Biostructure') as MolstarViewer;
    expect(!!viewer, true, 'Viewer not found');
    const aViewer = viewer as any;
    expect(!!aViewer.dataEff, true, 'Viewer dataEff is empty');
    expect((aViewer.dataEffStructureRefs?.length ?? 0) >= 2, true, 'Structure in the viewer not found');
  }, {timeout: 60000});
});
