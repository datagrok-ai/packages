import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {OrgHelmModule, ScilModule} from '../types';

import {
  RGROUP_CAP_GROUP_NAME,
  RGROUP_CAP_GROUP_SMILES,
  jsonSdfMonomerLibDict,
  MONOMER_SYMBOL,
  RGROUP_ALTER_ID,
  RGROUPS,
  RGROUP_LABEL,
  SDF_MONOMER_NAME
} from '../constants';

import {getMonomerLib} from '../package';

declare const scil: ScilModule;
declare const org: OrgHelmModule;

// Global flag is for replaceAll
const helmGapStartRe = /\{(\*\.)+/g;
const helmGapIntRe = /\.(\*\.)+/g;
const helmGapEndRe = /(\.\*)+\}/g;

export function removeGapsFromHelm(srcHelm: string): string {
  return srcHelm.replaceAll(helmGapStartRe, '{').replaceAll(helmGapIntRe, '.')
    .replaceAll(helmGapEndRe, '}').replace('{*}', '{}');
}

export function getParts(subParts: string[], s: string): string[] {
  const j = 0;
  const allParts: string[] = [];
  for (let k = 0; k < (subParts ?? []).length; ++k) {
    const indexOfMonomer = s.indexOf(subParts[k]);
    const helmBeforeMonomer = s.slice(j, indexOfMonomer);
    allParts.push(helmBeforeMonomer);
    allParts.push(subParts[k]);
    s = s.substring(indexOfMonomer + subParts[k].length);
  }
  allParts.push(s);
  return allParts;
}

export function parseHelm(s: string): string[] {
  const sections = split(s, '$');
  s = sections[0];
  const monomers = [];
  if (!scil.Utils.isNullOrEmpty(s)) {
    const seqs = split(s, '|');
    for (let i = 0; i < seqs.length; ++i) {
      const e = detachAnnotation(seqs[i]);
      s = e.str;

      let p = s.indexOf('{');

      s = s.substring(p + 1);
      p = s.indexOf('}');
      s = s.substring(0, p);

      const ss = split(s, '.');
      for (const monomer of ss) {
        if (!monomer || monomer === '') continue;
        if (monomer.startsWith('[') && monomer.includes(']')) {
          const closingIndex = findClosing(monomer, 1, '[', ']');
          const element = monomer.substring(1, closingIndex);
          monomers.push(element);
          const residue = monomer.substring(closingIndex + 1);
          ss.push(residue);
        } else if (monomer.includes('[') && monomer.endsWith(']')) {
          const openingIndex = findOpening(monomer, monomer.length - 2, '[', ']');
          const element = monomer.substring(openingIndex + 1, monomer.length - 1);
          monomers.push(element);
          const residue = monomer.substring(0, openingIndex);
          ss.push(residue);
        } else if (monomer.includes('(') && monomer.includes(')')) {
          // here we only want to split the string at first '(' and last ')'
          // because entries like [L-hArg(Et,Et)]([L-hArg(Et,Et)]) where L-hArg(Et,Et) is a single monomer
          const firstPiece = monomer.substring(0, monomer.indexOf('('));
          const thirdPiece = monomer.substring(monomer.lastIndexOf(')') + 1);
          const secondPiece = monomer.substring(firstPiece.length + 1, monomer.length - thirdPiece.length - 1);
          const elements = [firstPiece, secondPiece, thirdPiece];
          for (const el of elements)
            ss.push(el);
        } else
          monomers.push(monomer);
      }
    }
  }
  return monomers;
}

// /** Find monomers missed in Helm monomer library configured and
//  * used in org.helm.webeditor / scil.helm.Monomers / org.helm.webeditor.Monomers .
//  */
// export function findMonomers(helmString: string) {
//   const types: string[] = Object.keys(org.helm.webeditor.monomerTypeList());
//   const monomerNameList: any[] = [];
//   const monomerNameI: number = 0;
//   const weMonomers = org.helm.webeditor.Monomers;
//   for (let typeI = 0; typeI < types.length; typeI++) {
//     const ofTypeMonomers: {} = weMonomers.getMonomerSet(types[typeI]) ?? {};
//     Object.keys(ofTypeMonomers).forEach((key) => {
//       const monomer: any = ofTypeMonomers[key];
//       monomerNameList[monomerNameI] = monomer.id;
//       monomerNameI += 1;
//     });
//   }
//   const helmPartList = parseHelm(helmString);
//   return new Set(helmPartList.filter((val) => !monomerNameList.includes(val)));
// }

/** Searches monomers of helmString for missed. */
export function findMonomers(seqMonomerSymbolList: string[]): Set<string> {
  const monomerLib = getMonomerLib();
  return new Set(seqMonomerSymbolList.filter((s) => monomerLib?.getMonomer(null, s)));
}

function findClosing(s: string, start: number, open: string, close: string) {
  let i = start;
  let count = 0;
  while (i < s.length) {
    if (s[i] === open)
      count++;

    if (s[i] === close) {
      if (count === 0)
        return i;
      count--;
    }
    i++;
  }
  return -1;
}

function findOpening(s: string, start: number, open: string, close: string) {
  let i = start;
  let count = 0;
  while (i >= 0) {
    if (s[i] === close)
      count++;

    if (s[i] === open) {
      if (count === 0)
        return i;
      count--;
    }
    i--;
  }
  return -1;
}

function split(s: string, sep: string) {
  const ret = [];
  let frag = '';
  let parentheses = 0;
  let bracket = 0;
  let braces = 0;
  let quote = 0;
  for (let i = 0; i < s.length; ++i) {
    let c = s.substring(i, i + 1);
    if (c == sep && bracket == 0 && parentheses == 0 && braces == 0 && quote == 0) {
      ret.push(frag);
      frag = '';
    } else {
      frag += c;
      if (quote > 0) {
        if (c == '\\' && i + 1 < s.length) {
          ++i;
          const c2 = s.substring(i, i + 1);
          frag += c2;
          c += c2;
        }
      }
      if (c == '\"') {
        if (!(i > 0 && s.substring(i - 1, i) == '\\'))
          quote = quote == 0 ? 1 : 0;
      } else if (c == '[')
        ++bracket;
      else if (c == ']')
        --bracket;
      else if (c == '(')
        ++parentheses;
      else if (c == ')')
        --parentheses;
      else if (c == '{')
        ++braces;
      else if (c == '}')
        --braces;
    }
  }
  ret.push(frag);
  return ret;
}

function detachAnnotation(s: string) {
  const ret = _detachAppendix(s, '\"');
  if (ret.tag != null)
    return ret;

  const r = _detachAppendix(s, '\'');
  return {tag: ret.tag, repeat: r.tag, str: r.str};
}

function _detachAppendix(s: string, c: string) {
  let tag = null;
  if (scil.Utils.endswith(s, c)) {
    let p = s.length - 1;
    while (p > 0) {
      p = s.lastIndexOf(c, p - 1);
      if (p <= 0 || s.substring(p - 1, p) != '\\')
        break;
    }

    if (p > 0 && p < s.length - 1) {
      tag = s.substring(p + 1, s.length - 1);
      s = s.substring(0, p);
    }
  }
  if (tag != null)
    tag = unescape(tag.replace(new RegExp('\\' + c, 'g'), c));
  return {tag: tag, str: s};
}

function unescape(s: string) {
  if (scil.Utils.isNullOrEmpty(s))
    return s;

  return s.replace(/[\\]./g, function(m) {
    switch (m) {
    case '\\r':
      return '\r';
    case '\\n':
      return '\n';
    case '\\t':
      return '\t';
    default:
      return m.substring(1);
    }
  });
}
