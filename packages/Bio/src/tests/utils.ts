import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

import {delay, expect, testEvent} from '@datagrok-libraries/utils/src/test';

import {_package} from '../package-test';

export async function loadFileAsText(name: string): Promise<string> {
  return await _package.files.readAsText(name);
}

export async function readDataframe(tableName: string): Promise<DG.DataFrame> {
  const file = await loadFileAsText(tableName);
  const df = DG.DataFrame.fromCsv(file);
  df.name = tableName.replace('.csv', '');
  return df;
}

export async function createTableView(tableName: string): Promise<DG.TableView> {
  const df = await readDataframe(tableName);
  df.name = tableName.replace('.csv', '');
  const view = grok.shell.addTableView(df);
  return view;
}


/**
 * Tests if a table has non-zero rows and columns.
 *
 * @param {DG.DataFrame} table Target table. */
export function _testTableIsNotEmpty(table: DG.DataFrame): void {
  expect(table.columns.length > 0 && table.rowCount > 0, true);
}

/** Waits if container is not started
 * @param {number} ms - time to wait in milliseconds */
export async function awaitContainerStart(ms: number = 10000): Promise<void> {
  const container = await grok.dapi.docker.dockerContainers.filter('bio').first();
  if (container.status !== 'started' && container.status !== 'checking')
    await delay(ms);
    // TODO: Enable with new JS API version
    // await grok.dapi.docker.dockerContainers.run(container.id, true);
}

export async function awaitGrid(grid: DG.Grid, timeout: number = 5000): Promise<void> {
  await delay(0);
  await testEvent(grid.onAfterDrawContent, () => {},
    () => { grid.invalidate(); }, timeout);
}
