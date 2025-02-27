import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';
import {Observable, Subject} from 'rxjs';

import {IMonomerLibBase, Monomer, RGroup} from '@datagrok-libraries/bio/src/types/index';
import {HelmAtom, HelmType, IMonomerColors, IWebEditorMonomer, MonomerType, PolymerType} from '@datagrok-libraries/bio/src/helm/types';
import {getMonomerHandleArgs} from '@datagrok-libraries/bio/src/helm/helm-helper';
import {helmTypeToPolymerType} from '@datagrok-libraries/bio/src/monomer-works/monomer-works';
import {HelmTypes, PolymerTypes} from '@datagrok-libraries/bio/src/helm/consts';
import {HELM_OPTIONAL_FIELDS as OPT, HELM_REQUIRED_FIELD as REQ, HELM_RGROUP_FIELDS as RGP} from '@datagrok-libraries/bio/src/utils/const';
import {GAP_SYMBOL, GapOriginals, NOTATION} from '@datagrok-libraries/bio/src/utils/macromolecule/consts';
import {Vector} from '@datagrok-libraries/utils/src/type-declarations';
import {vectorAdd, vectorDotProduct, vectorLength} from '@datagrok-libraries/utils/src/vector-operations';

import {AmbiguousWebEditorMonomer, GapWebEditorMonomer, MissingWebEditorMonomer} from './web-editor-monomer-dummy';
import {LibraryWebEditorMonomer} from './web-editor-monomer-of-library';
import {naturalMonomerColors} from './monomer-colors';

import {_package} from '../../package';

const monomerRe = /[\w()]+/;
//** Do not mess with monomer symbol with parenthesis enclosed in square brackets */
const ambMonomerRe = RegExp(String.raw`\(${monomerRe}(,${monomerRe})+\)`);

const drawMoleculeCall = (s: string) => {
  const canvas = ui.canvas(250, 250);
  grok.chem.canvasMol(0, 0, 250, 250, canvas, s);
  return canvas;
};

export type MonomerLibDataType = { [polymerType: string]: { [monomerSymbol: string]: Monomer } };

const whiteColorV = new Vector([255.0, 255.0, 255.0]);
const blackColorV = new Vector([0.0, 0.0, 0.0]);
const maxTextColorVLen = vectorLength(whiteColorV) * 0.7;

export class MonomerLibBase implements IMonomerLibBase {
  protected _isEmpty: boolean;
  get isEmpty(): boolean { return this._isEmpty; }

  protected _onChanged = new Subject<any>();

  get onChanged(): Observable<any> { return this._onChanged; }


  constructor(
    protected _monomers: MonomerLibDataType,
    public readonly source: string,
  ) {
    this._isEmpty = !this._monomers || Object.keys(this._monomers).length === 0 ||
      Object.entries(this._monomers).every(([_, ptMonomers]) => Object.keys(ptMonomers).length === 0);
    for (const [_monomerType, monomersOfType] of Object.entries(this._monomers)) {
      for (const [_monomerSymbol, monomer] of Object.entries(monomersOfType))
        monomer.lib = this;
    }
  }

  getMonomerSymbolsByType(polymerType: PolymerType): string[] {
    return Object.keys(this._monomers[polymerType]);
  }

  /** Creates missing {@link Monomer} */
  addMissingMonomer(polymerType: PolymerType, monomerSymbol: string): Monomer {
    let mSet = this._monomers[polymerType];
    if (!mSet)
      mSet = this._monomers[polymerType] = {};

    let monomerName: string = monomerSymbol;
    if (monomerSymbol == GAP_SYMBOL || monomerSymbol === GapOriginals[NOTATION.HELM] /* usage from HELMWebEditor */)
      monomerName = 'Gap';
    else if (polymerType === PolymerTypes.PEPTIDE && monomerSymbol === 'X')
      monomerName = 'Any';
    else if (polymerType === PolymerTypes.RNA && monomerSymbol === 'N')
      monomerName = 'Any';

    const m = mSet[monomerSymbol] = {
      [REQ.SYMBOL]: monomerSymbol,
      [REQ.NAME]: monomerName,
      [REQ.MOLFILE]: '',
      [REQ.AUTHOR]: 'MISSING',
      [REQ.ID]: -1,
      [REQ.RGROUPS]:
        wu.count(1).take(9).map((i) => {
          return {
            /* eslint-disable no-multi-spaces */
            // Samples                        //  PEPTIDE     RNA
            [RGP.CAP_GROUP_SMILES]: '',       // '[*:1][H]'  '[*:1][H]'
            [RGP.ALTERNATE_ID]: '',           // 'R1-H'      'R1-H'
            [RGP.CAP_GROUP_NAME]: '',         // 'H'         'H'
            [RGP.LABEL]: `R${i.toString()}`,  // 'R1'        'R1'
            /* eslint-enable no-multi-spaces */
          } as RGroup;
        }).toArray(),
      [REQ.SMILES]: '',
      [REQ.POLYMER_TYPE]: polymerType,
      [REQ.MONOMER_TYPE]: undefined as unknown as MonomerType, // TODO: Can we get monomerType from atom of POM
      [REQ.CREATE_DATE]: null,
    } as Monomer;
    return m;
  }

  getMonomer(polymerType: PolymerType | null, argMonomerSymbol: string): Monomer | null {
    const logPrefix = `Bio: MonomerLib.getMonomer()`;
    // Adjust RNA's 'R' for ribose to 'r' and 'P' for phosphate to 'p' for case-sensitive monomer names.
    // There are uppercase 'R' and 'P' at RNA samples in test data 'helm2.csv' but lowercase in HELMCoreLibrary.json
    let monomerSymbol = argMonomerSymbol;
    if (polymerType == 'RNA' && monomerSymbol == 'R')
      monomerSymbol = 'r';
    if (polymerType == 'RNA' && monomerSymbol == 'P')
      monomerSymbol = 'p';

    let res: Monomer | null = null;

    if (!polymerType) {
      _package.logger.warning(`${logPrefix} symbol '${argMonomerSymbol}', polymerType not specified.`);
      // Assume any polymer type
      for (const [_polymerType, dict] of Object.entries(this._monomers)) {
        res = dict[monomerSymbol];
        if (res) break;
      }
    } else {
      const dict = this._monomers[polymerType];
      res = dict ? dict[monomerSymbol] : null;
    }
    return res;
  }

  /** Substitutes {@link org.helm.webeditor.Monomers.getMonomer()} */
  getWebEditorMonomer(a: HelmAtom | HelmType, argName?: string): IWebEditorMonomer | null {
    const [biotype, elem] = getMonomerHandleArgs(a, argName);
    const pt = helmTypeToPolymerType(biotype);

    /** Get or create {@link Monomer} object (in case it is missing in monomer library current config) */
    let m: Monomer | null = this.getMonomer(pt, elem);
    if (m && biotype == HelmTypes.LINKER && m[REQ.RGROUPS].length != 2) {
      // Web Editor expects null
      return null;
    }
    if (m && biotype == HelmTypes.SUGAR && m[REQ.RGROUPS].length != 3) {
      // Web Editor expects null
      return null;
    }
    if (!m /* && biotype != HelmTypes.LINKER*/)
      m = this.addMissingMonomer(pt, elem);

    /** Get or create {@link org,helm.WebEditorMonomer} */
    let resWem: IWebEditorMonomer | null = m.wem ?? null;
    if (!resWem) {
      if (elem === GAP_SYMBOL || elem == '*' /* usage from HELMWebEditor */)
        resWem = m.wem = new GapWebEditorMonomer(biotype);
      else if (
        (biotype === HelmTypes.NUCLEOTIDE && elem === 'N') ||
        (biotype === HelmTypes.AA && elem === 'X') ||
        (biotype === HelmTypes.CHEM && false) || // TODO: Ambiguous monomer for CHEM
        ambMonomerRe.test(elem) // e.g. (A,R,_)
      )
        resWem = m.wem = new AmbiguousWebEditorMonomer(biotype, elem);
      else if (!m.lib)
        resWem = m.wem = new MissingWebEditorMonomer(biotype, elem, this.isEmpty);

      if (!resWem)
        resWem = m.wem = LibraryWebEditorMonomer.fromMonomer(biotype, m, this);
    }

    return resWem;
  }

  getTooltip(biotype: HelmType, monomerSymbol: string): HTMLElement {
    const polymerType = helmTypeToPolymerType(biotype);
    const res = ui.div([], {classes: 'ui-form ui-tooltip'});
    const wem = this.getWebEditorMonomer(biotype, monomerSymbol)!;
    const monomer = this.getMonomer(polymerType, monomerSymbol);
    if (monomer) {
      // Symbol & Name
      const symbol = monomer[REQ.SYMBOL];
      const _name = monomer[REQ.NAME];
      const [color, backgroundColor, lineColor] =
        wem ? [wem.textcolor, wem.backgroundcolor, wem.linecolor] : ['#202020', '#A0A0A0', '#202020'];
      res.append(ui.divH([
        ui.div([symbol], {
          style: {
            /* fontWeight: 'bolder', */ textWrap: 'nowrap', marginLeft: '4px', marginRight: '4px',
            color: color, backgroundColor: backgroundColor, borderColor: lineColor,
            borderWidth: '1px', borderStyle: 'solid', borderRadius: '2px', padding: '3px',
            minWidth: '24px', textAlign: 'center',
          }
        }),
        ui.div([monomer.name], {style: {padding: '4px'}}),
      ], {style: {display: 'flex', flexDirection: 'row', justifyContent: 'left'}}));

      // Structure
      //const chemOptions = {autoCrop: true, autoCropMargin: 0, suppressChiralText: true};
      let structureEl: HTMLElement;
      if (monomer.molfile)
        structureEl = drawMoleculeCall(monomer.molfile);
      else if (monomer.smiles) {
        structureEl = ui.divV([
          drawMoleculeCall(monomer.smiles),
          ui.divText('from smiles', {style: {fontSize: 'smaller'}}),
        ]);
      } else {
        // Unable to get monomer's structure
        structureEl = ui.divText('No structure', {style: {margin: '6px'}});
      }
      res.append(ui.div(structureEl,
        {style: {display: 'flex', flexDirection: 'row', justifyContent: 'center', margin: '6px'}}));

      // Source
      if (monomer.symbol != GAP_SYMBOL)
        res.append(ui.divText(monomer.lib?.source ?? 'Missed in libraries'));
    } else {
      res.append(ui.divV([
        ui.divText(`Monomer '${monomerSymbol}' of type '${polymerType}' not found.`),
        ui.divText('Open the Context Panel, then expand Manage Libraries'),
      ]));
    }
    return res;
  }

  getMonomerTextColor(biotype: HelmType, symbol: string): string {
    const colors: IMonomerColors = this.getMonomerColors(biotype, symbol);
    const htmlToA = (html: string): number[] => {
      const rgbM = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(html);
      if (rgbM)
        return [parseInt(rgbM[1]), parseInt(rgbM[2]), parseInt(rgbM[3])];

      const n = DG.Color.fromHtml(html);
      return [DG.Color.r(n), DG.Color.g(n), DG.Color.b(n)];
    };

    const textColorA = htmlToA(colors.textcolor!);
    const textColorAdjV = new Vector([...textColorA.map((v) => v + 1)]);
    const cosTextToWhite = vectorDotProduct(textColorAdjV, whiteColorV) /
      (vectorLength(textColorAdjV) * vectorLength(whiteColorV));

    const backColorA = htmlToA(colors.backgroundcolor!);
    const backColorAdjV = new Vector([...backColorA.map((v) => v + 0.01)]);
    const cosBackToWhite = vectorDotProduct(backColorAdjV, whiteColorV) /
      (vectorLength(backColorAdjV) * vectorLength(whiteColorV));

    let resColorA;
    if (cosBackToWhite < cosTextToWhite)
      resColorA = backColorA;
    else
      resColorA = textColorA;

    let resColorV = new Vector(resColorA);
    const resColorLen = vectorLength(resColorV);
    if (resColorLen > maxTextColorVLen) resColorV = vectorAdd(blackColorV, resColorV, maxTextColorVLen / resColorLen);
    return `rgb(${resColorV[0]}, ${resColorV[1]}, ${resColorV[2]})`;
  }

  getMonomerColors(biotype: HelmType, symbol: string): IMonomerColors {
    const currentMonomerSchema = 'default';
    let monomerSchema: string = currentMonomerSchema;

    const polymerType = helmTypeToPolymerType(biotype);
    const monomer = this.getMonomer(polymerType, symbol)!;
    let res: any;
    if (monomer) {
      if (monomer.meta && monomer.meta.colors) {
        const monomerColors: { [colorSchemaName: string]: any } = monomer.meta.colors;
        if (!(currentMonomerSchema in monomerColors)) monomerSchema = 'default';
        res = monomerColors[monomerSchema];
      }

      if (!res) {
        const biotypeColors: { [symbol: string]: string } | undefined = naturalMonomerColors[biotype];
        const nColor: string = biotypeColors?.[monomer.symbol];
        if (nColor) {
          const nTextColor = DG.Color.toHtml(DG.Color.getContrastColor(DG.Color.fromHtml(nColor)));
          res = {textColor: nTextColor, lineColor: '#202020', backgroundColor: nColor};
        }
      }

      const naSymbol: string | undefined = monomer[OPT.NATURAL_ANALOG];
      if (!res && naSymbol)
        return this.getMonomerColors(biotype, naSymbol);
    }

    if (!res)
      res = {textColor: '#202020', lineColor: '#202020', backgroundColor: '#A0A0A0'};

    return {
      textcolor: res.text ?? res.textColor,
      linecolor: res.line ?? res.lineColor,
      backgroundcolor: res.background ?? res.backgroundColor
    } as IMonomerColors;
  }

  getRS(smiles: string): { [r: string]: string } {
    const newS = smiles.match(/(?<=\[)[^\][]*(?=])/gm);
    const res: { [name: string]: string } = {};
    let el = '';
    let digit;
    if (!!newS) {
      for (let i = 0; i < newS.length; i++) {
        if (newS[i] != null) {
          if (/\d/.test(newS[i])) {
            digit = newS[i][newS[i].length - 1];
            newS[i] = newS[i].replace(/[0-9]/g, '');
            for (let j = 0; j < newS[i].length; j++) {
              if (newS[i][j] != ':')
                el += newS[i][j];
            }
            res['R' + digit] = el;
            el = '';
          }
        }
      }
    }
    return res;
  }
}
