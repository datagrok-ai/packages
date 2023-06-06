import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

import {UnitsHandler} from '@datagrok-libraries/bio/src/utils/units-handler';

/**
 * Checks if the column is suitable for the analysis.
 * @param {DG.Column} col macromolecule coulumn.
 * @param {string} name column name
 * @param {string[]} allowedNotations allowed notations
 * @param {string[]} allowedAlphabets allowed alphabets
 * @param {boolean} notify show warning message if the column is not suitable for the analysis
 * @return {boolean} True if the column is suitable for the analysis.
*/
export function checkInputColumnUI(col: DG.Column, name: string, allowedNotations: string[] = [],
  allowedAlphabets: string[] = [], notify: boolean = true): boolean {
  const [res, msg]: [boolean, string] = checkInputColumn(col, name, allowedNotations, allowedAlphabets);
  if (notify && !res)
    grok.shell.warning(msg);
  return res;
}

/**
 * Checks if the column is suitable for the analysis.
 * @param {DG.Column} col macromolecule coulumn.
 * @param {string} name column name
 * @param {string[]} allowedNotations allowed notations
 * @param {string[]} allowedAlphabets allowed alphabets
 * @return {[boolean, string]} [True if the column is suitable for the analysis, warning message].
 */
export function checkInputColumn(
  col: DG.Column, name: string, allowedNotations: string[] = [], allowedAlphabets: string[] = [],
): [boolean, string] {
  let res: boolean = true;
  let msg: string = '';

  const uh = new UnitsHandler(col);
  if (col.semType !== DG.SEMTYPE.MACROMOLECULE) {
    grok.shell.warning(name + ' analysis is allowed for Macromolecules semantic type');
    res = false;
  } else {
    const notation: string = uh.notation;
    if (allowedNotations.length > 0 &&
      !allowedNotations.some((n) => notation.toUpperCase() == (n.toUpperCase()))
    ) {
      const notationAdd = allowedNotations.length == 0 ? 'any notation' :
        (`notation${allowedNotations.length > 1 ? 's' : ''} ${allowedNotations.map((n) => `"${n}"`).join(', ')} `);
      msg = `${name} + ' analysis is allowed for Macromolecules with notation ${notationAdd}.`;
      res = false;
    } else if (!uh.isHelm()) {
      // alphabet is not specified for 'helm' notation
      const alphabet: string = uh.alphabet;
      if (
        allowedAlphabets.length > 0 &&
        !allowedAlphabets.some((a) => alphabet.toUpperCase() == (a.toUpperCase()))
      ) {
        const alphabetAdd = allowedAlphabets.length == 0 ? 'any alphabet' :
          (`alphabet${allowedAlphabets.length > 1 ? 's' : ''} ${allowedAlphabets.map((a) => `"${a}"`).join(', ')}.`);
        msg = `${name} + ' analysis is allowed for Macromolecules with alphabet ${alphabetAdd}.`;
        res = false;
      }
    }
  }

  return [res, msg];
}
