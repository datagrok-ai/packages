/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {SequenceValidator} from '../../../model/parsing-validation/sequence-validator';
import {FormatDetector} from '../../../model/parsing-validation/format-detector';

import $ from 'cash-dom';
import {ITranslationHelper} from '../../../../../types';

/** Set different colors for letters, can be upgraded to color various monomers */
export function demoPainter(input: string): HTMLSpanElement[] {
  const colors = ['red', 'blueviolet', 'chartreuse',
    'aquamarine', 'darkcyan', 'gold', 'green', 'aqua', 'orange',
    'blue'];
  const spans: HTMLSpanElement[] = [];
  for (let i = 0; i < input.length; ++i) {
    const span = ui.span([input.charAt(i)]);
    // $(span).css('-webkit-text-fill-color', colors.at(Math.round(Math.random() * colors.length))!);
    $(span).css('-webkit-text-fill-color', colors[i % colors.length]!);
    spans.push(span);
  }
  return spans;
}

// todo: port to another place
export function highlightInvalidSubsequence(input: string, th: ITranslationHelper): HTMLSpanElement[] {
  // validate sequence
  let cutoff = 0;
  const format = th.createFormatDetector(input).getFormat();
  if (format !== null)
    cutoff = (new SequenceValidator(input, th)).getInvalidCodeIndex(format!);
  const isValid = cutoff < 0 || input === '';
  const greyTextSpan = ui.span([]);
  $(greyTextSpan).css('-webkit-text-fill-color', 'var(--grey-6)');
  const redTextSpan = ui.span([]);
  $(redTextSpan).css('-webkit-text-fill-color', 'red');

  if (!isValid) {
    greyTextSpan.innerHTML = input.slice(0, cutoff);
    redTextSpan.innerHTML = input.slice(cutoff);
  } else { greyTextSpan.innerHTML = input; }
  return [greyTextSpan, redTextSpan];
};
