import * as ui from 'datagrok-api/ui';
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';

import {category, test, after, before, expect, delay, testEvent} from '@datagrok-libraries/utils/src/test';
import {errInfo} from '@datagrok-libraries/bio/src/utils/err-info';
import {BiostructureViewerWindowType} from '../utils/context-menu';

import {awaitGrid} from './utils';

import {_package} from '../package-test';

declare const window: BiostructureViewerWindowType;

category('ContextMenu', () => {
  before(async () => {
    console.warn('BsV: Tests: ContextMenu: before, start');
    if (!window.$biostructureViewer) window.$biostructureViewer = {};
    window.$biostructureViewer.contextMenuError = null;
    console.warn('BsV: Tests: ContextMenu: before, end');
  });

  after(async () => {
    console.warn('BsV: Tests: ContextMenu: after, start');
    window.$biostructureViewer!.contextMenuError = null;
    console.warn('BsV: Tests: ContextMenu: after, end');
  });

  test('RowHeader', async () => {
    console.warn('BsV: Tests: ContextMenu: RowHeader, start');

    const df = await _package.files.readCsv('pdb_id.csv');
    const view = grok.shell.addTableView(df);
    await awaitGrid(view.grid, 1000);

    let menu: DG.Menu | null = null;
    view.grid.onContextMenu.subscribe((eventMenu: DG.Menu) => {
      menu = eventMenu;
      return true;
    });
    const gridOverlay = $(view.grid.root).find('canvas').get()[2];
    const cellId1 = view.grid.cell('id', 1);
    const grb = view.grid.root.getBoundingClientRect();
    const cb = cellId1.bounds;
    const cmPE = new PointerEvent('contextmenu', {
      cancelable: true, bubbles: true, view: window, button: 2,
      clientX: grb.left + cb.left - 3, clientY: grb.top + cb.top + 3
    });
    try {
      console.warn('BsV: Tests: ContextMenu: RowHeader, dispatching...');
      gridOverlay.dispatchEvent(cmPE);
      console.warn('BsV: Tests: ContextMenu: RowHeader, dispatched.');
      // BiostructureViewer:addContextMenu is calling async as package function
      await awaitGrid(view.grid, 1000);
      console.warn('BsV: Tests: ContextMenu: RowHeader, grid awaited');
      const err = window.$biostructureViewer?.contextMenuError;
      if (err) {
        console.warn('BsV: Tests: ContextMenu: RowHeader, rethrow error stored on context menu');
        // Rethrow error stored on context menu
        throw err;
      }
    } finally {
      console.warn('BsV: Tests: ContextMenu: RowHeader, finally');
      if (menu !== null) {
        // Cleanup or hide menu
        // @ts-ignore
        menu.root.style.display = 'none';
      }
    }
  }, {skipReason: 'GROK-15931'});
});

