// import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {_package} from '../package';
import {colors} from '../utils';

export {colors};
export const FILENAME = 'test-cases.csv';
export const PASSED = 'passed';
export const CRITICALFAIL = 'failed';
export const MINORFAIL = 'minor';
export const BLOCKFAIL = 'blocker';
export const SKIPPED = 'skipped';
export type Status = typeof PASSED | typeof MINORFAIL | typeof CRITICALFAIL | typeof BLOCKFAIL | typeof SKIPPED;

const map = {
  [PASSED]: {name: 'check', color: 'var(--green-2)'},
  [MINORFAIL]: {name: 'times', color: 'var(--orange-2)'},
  [CRITICALFAIL]: {name: 'times', color: 'var(--red-3)'},
  [BLOCKFAIL]: {name: 'lock', color: 'var(--red-3)'},
  [SKIPPED]: {name: 'forward', color: 'var(--orange-2)'},
};


export const errorSeverityLevels : any[] = [MINORFAIL, CRITICALFAIL, BLOCKFAIL];
export const errorSeverityLevelJiraNames : { [id: string]: string; } = {
  [MINORFAIL]: 'MinorError',
  [CRITICALFAIL]: 'CriticalError',
  [BLOCKFAIL]: 'Blocker'
}
export const TicketPriorityLevel : { [id: string]: string; } = {
  [MINORFAIL]: 'Low',
  [CRITICALFAIL]: 'Medium',
  [BLOCKFAIL]: 'Blocker'
}

export async function loadFileAsText(name: string): Promise<string> {
  return await _package.files.readAsText(name);
}

export async function readDataframe(tableName: string): Promise<DG.DataFrame> {
  const file = await loadFileAsText(tableName);
  const df = DG.DataFrame.fromCsv(file);
  df.name = tableName.replace('.csv', '');
  return df;
}

export async function writeDataframe(tableName: string, data: string): Promise<void> {
  await _package.files.writeAsText(tableName, data);
}

export function getIcon(name: string, options?: {style?: string, class?: string[], color?: string, id?: string}): HTMLElement {
  const icon = ui.iconFA(name);
  icon.classList.replace('fal', options?.style ?? 'far');
  if (options?.class)
    icon.classList.add(...options.class);
  if (options?.color)
    icon.style.color = options.color;
  if (options?.id)
    icon.id = options.id;
  return icon;
}

export function getStatusIcon(status: typeof PASSED | typeof MINORFAIL | typeof CRITICALFAIL | typeof BLOCKFAIL | typeof SKIPPED): HTMLElement {
  const obj = map[status];
  if(obj?.name)
    return getIcon(obj.name, {class: ['tt-status-icon'], color: obj.color});
  return ui.div();
}
