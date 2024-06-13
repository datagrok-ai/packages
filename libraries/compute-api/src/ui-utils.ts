/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import type {UiUtils} from '@datagrok-libraries/compute-utils/shared-components';

declare global {
  interface Window {
    compute: any
  }
}

export function fileInput(...args: Parameters<typeof UiUtils.fileInput>): ReturnType<typeof UiUtils.fileInput> {
  return window.compute.fileInput(...args);
}

export function historyInput(...args: Parameters<typeof UiUtils.historyInput>):
  ReturnType<typeof UiUtils.historyInput> {
  return window.compute.historyInput(...args);
}

export function historyInputJSON(...args: Parameters<typeof UiUtils.historyInputJSON>):
  ReturnType<typeof UiUtils.historyInputJSON> {
  return window.compute.historyInputJSON(...args);
}

export function historyPanel(...args: Parameters<typeof UiUtils.historyPanel>):
  ReturnType<typeof UiUtils.historyPanel> {
  return window.compute.historyPanel(...args);
}
