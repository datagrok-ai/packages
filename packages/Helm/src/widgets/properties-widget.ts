import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';

import {SeqHandler} from '@datagrok-libraries/bio/src/utils/seq-handler';
import {NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule';

import {JSDraw2HelmModule} from '../types';
import {removeGapsFromHelm} from '../utils';

declare const JSDraw2: JSDraw2HelmModule;

export class SeqPropertiesError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export function getPropertiesDict(seq: string, sh: SeqHandler): {} {
  const host = ui.div([], {style: {width: '0', height: '0'}});
  document.documentElement.appendChild(host);
  try {
    if (seq.length > 1000)
      throw new SeqPropertiesError('Too long sequence to calculate molecular properties.');

    const helmString = sh.isHelm() ? seq : sh.getConverter(NOTATION.HELM)(seq);
    // Remove gap symbols for compatibility with WebEditor
    const helmString2 = removeGapsFromHelm(helmString);

    const editor = new JSDraw2.Editor(host, {viewonly: true});
    editor.setHelm(helmString2);

    const formula = editor.getFormula(true);
    const molWeight = Math.round(editor.getMolWeight() * 100) / 100;
    const coef = Math.round(editor.getExtinctionCoefficient() * 100) / 100;
    return {
      'formula': formula.replace(/<sub>/g, '').replace(/<\/sub>/g, ''),
      'molecular weight': molWeight,
      'extinction coefficient': coef,
    };
  } finally {
    $(host).empty();
    host.remove();
  }
}


export function getPropertiesWidget(value: DG.SemanticValue): DG.Widget {
  const sh = SeqHandler.forColumn(value.cell.column);
  try {
    const propDict = getPropertiesDict(value.value, sh);
    return new DG.Widget(
      ui.tableFromMap(propDict)
    );
  } catch (err: any) {
    if (err instanceof SeqPropertiesError) {
      // Display warning from err.message
      return new DG.Widget(ui.divText(err.message));
    }
    throw err;
  }
}
