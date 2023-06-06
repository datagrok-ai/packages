import * as DG from 'datagrok-api/dg';

export function getParts(subParts: string[], s: string): string[] {
  const j = 0;
  const allParts: string[] = [];
  for (let k = 0; k < subParts.length; ++k) {
    const indexOfMonomer = s.indexOf(subParts[k]);
    const helmBeforeMonomer = s.slice(j, indexOfMonomer);
    allParts.push(helmBeforeMonomer);
    allParts.push(subParts[k]);
    s = s.substring(indexOfMonomer + subParts[k].length);
  }
  allParts.push(s);
  return allParts;
}

export function parseHelm(s: string) {
  const sections = split(s, '$');
  s = sections[0];
  const monomers = [];
  //@ts-ignore
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
          const element = monomer.substring(1, monomer.indexOf(']'));
          monomers.push(element);
          const residue = monomer.substring(monomer.indexOf(']') + 1);
          ss.push(residue);
        } else if (monomer.includes('[') && monomer.endsWith(']')) {
          const element = monomer.substring(monomer.lastIndexOf('[') + 1, monomer.length - 1);
          monomers.push(element);
          const residue = monomer.substring(0, monomer.lastIndexOf('['));
          ss.push(residue);
        } else if (monomer.includes('(') && monomer.includes(')')) {
          // here we only want to split the string at first '(' and last ')'
          // because entries like [L-hArg(Et,Et)]([L-hArg(Et,Et)]) where L-hArg(Et,Et) is a single monomer
          const firstPiece = monomer.substring(0, monomer.indexOf('('));
          const thirdPiece = monomer.substring(monomer.lastIndexOf(')') + 1);
          const secondPiece = monomer.substring(firstPiece.length + 1, monomer.length - thirdPiece.length - 1);
          const elements =[firstPiece, secondPiece, thirdPiece];
          for (const el of elements)
            ss.push(el);
        } else {
          monomers.push(monomer);
        }
      }
    }
  }
  return monomers;
}
/* this function returns names of monomers that are NOT in the monomer library */
export function findMonomers(helmString: string) {
  //@ts-ignore
  const types = Object.keys(org.helm.webeditor.monomerTypeList());
  const monomers: any = [];
  const monomerNames: any = [];
  for (let i = 0; i < types.length; i++) {
    //@ts-ignore
    // eslint-disable-next-line new-cap
    monomers.push(new scil.helm.Monomers.getMonomerSet(types[i]));
    Object.keys(monomers[i]).forEach((k) => {
      monomerNames.push(monomers[i][k].id);
    });
  }
  const splitString = parseHelm(helmString);
  return new Set(splitString.filter((val) => !monomerNames.includes(val)));
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
      } else if (c == '[') {
        ++bracket;
      } else if (c == ']') {
        --bracket;
      } else if (c == '(') {
        ++parentheses;
      } else if (c == ')') {
        --parentheses;
      } else if (c == '{') {
        ++braces;
      } else if (c == '}') {
        --braces;
      }
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
  //@ts-ignore
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
    tag = tag.replace(new RegExp('\\' + c, 'g'), c);
  return {tag: unescape(tag), str: s};
}

function unescape(s: string) {
  //@ts-ignore
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
