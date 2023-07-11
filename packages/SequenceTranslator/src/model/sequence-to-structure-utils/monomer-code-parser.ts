/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {PHOSPHATE_SYMBOL} from './const';
import {sortByReverseLength} from '../helpers';
import {MonomerLibWrapper} from '../monomer-lib/lib-wrapper';
import {monomersWithPhosphateLinkers} from '../data-loading-utils/json-loader';

/** Wrapper for parsing a strand and getting a sequence of monomer IDs (with
 * omitted linkers, if needed)  */
export class MonomerSequenceParser {
  constructor(
    private sequence: string, private invert: boolean = false,
    // todo: remove from the list of parameters
    private codeMap: Map<string, string>
  ) {
    this.lib = MonomerLibWrapper.getInstance();
  }

  private lib: MonomerLibWrapper;

  /** Get sequence of parsed monomer symbols, which are unique short names for
   * the monomers within the Monomer Library */
  parseSequence(): string[] {
    const parsedRawCodes = this.parseRawSequence();
    return this.addLinkers(parsedRawCodes);
  }

  private addLinkers(parsedRawCodes: string[]) {
    const monomerSymbolSequence: string[] = [];
    parsedRawCodes.forEach((code, i) => {
      const monomerSymbol = this.getSymbolForCode(code);
      if (i > 0 && monomerHasLeftPhosphateLinker(monomerSymbol))
        monomerSymbolSequence.pop();

      monomerSymbolSequence.push(monomerSymbol);

      const isPhosphate = monomerIsPhosphateLinker(monomerSymbol);
      const lastMonomer = i === parsedRawCodes.length - 1;
      const nextMonomerIsPhosphate = (i + 1 < parsedRawCodes.length && monomerIsPhosphateLinker(this.getSymbolForCode(parsedRawCodes[i + 1])));

      // todo: refactor as molfile-specific
      if (!isPhosphate && !monomerHasRightPhosphateLinker(monomerSymbol) && !nextMonomerIsPhosphate && !lastMonomer) {
        monomerSymbolSequence.push(PHOSPHATE_SYMBOL);
      }
    });
    return monomerSymbolSequence;
  }

  private getSymbolForCode(code: string): string {
    let monomerSymbol = this.codeMap.get(code);
    // todo: remove as a legacy workaround, codeMap must contain all the
    // symbols, and symbols are not codes
    monomerSymbol ??= code;
    return monomerSymbol;
  }

  private parseRawSequence(): string[] {
    const allCodesOfFormat = this.getAllCodesOfFormat();
    const parsedCodes = [];
    let i = 0;
    while (i < this.sequence.length) {
      const code = allCodesOfFormat.find(
        (s: string) => s === this.sequence.substring(i, i + s.length)
      )!;
      this.invert ? parsedCodes.unshift(code) : parsedCodes.push(code);
      i += code.length;
    }
    return parsedCodes;
  }

  // todo: port to monomer handler
  private getAllCodesOfFormat(): string[] {
    let allCodesInTheFormat = Array.from(this.codeMap.keys());
    return sortByReverseLength(allCodesInTheFormat);
  }
}

// todo: to be eliminated after full helm support
function monomerHasLeftPhosphateLinker(monomerSymbol: string): boolean {
  return monomersWithPhosphateLinkers['left'].includes(monomerSymbol);
}

function monomerHasRightPhosphateLinker(monomerSymbol: string): boolean {
  return monomersWithPhosphateLinkers['right'].includes(monomerSymbol);
}

function monomerIsPhosphateLinker(monomerSymbol: string): boolean {
  return monomersWithPhosphateLinkers['phosphate'].includes(monomerSymbol);
}
