import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {delay} from '@datagrok-libraries/utils/src/test';
import {oligoTranslatorApp, oligoPatternApp, oligoStructureApp} from '../package';
import {tryCatch} from '../apps/common/model/helpers';

export async function demoOligoTranslatorUI() {
  await tryCatch(async () => {
    const view = await oligoTranslatorApp();
    grok.shell.addView(view);
  });
}

export async function demoOligoPatternUI() {
  await tryCatch(async () => {
    const view = await oligoPatternApp();
    grok.shell.addView(view);
  });
}

export async function demoOligoStructureUI() {
  await tryCatch(async () => {
    async function setInputValue(idx: number, sequence: string): Promise<void> {
      await delay(500);
      const textInputs: NodeListOf<HTMLTextAreaElement> = document.querySelectorAll('.colored-text-input > textarea');
      const textarea = textInputs[idx];
      textarea.value = sequence;
      const event = new Event('input');
      textarea.dispatchEvent(event);
    }

    const view = await oligoStructureApp();
    grok.shell.addView(view);
    const inputSequences = ['Afcgacsu', 'Afcgacsu', 'Afcgacsu'];
    inputSequences.forEach(async (sequence, idx) => {
      await setInputValue(idx, sequence);
    });
  });
}
