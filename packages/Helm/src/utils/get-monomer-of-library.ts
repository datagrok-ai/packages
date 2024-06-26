import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import {
  HelmType, IWebEditorMonomer, IMonomerColors, MonomerType, PolymerType, WebEditorRGroups
} from '@datagrok-libraries/bio/src/helm/types';
import {Monomer} from '@datagrok-libraries/bio/src/types';
import {
  HELM_OPTIONAL_FIELDS as OPT, HELM_REQUIRED_FIELD as REQ, HELM_RGROUP_FIELDS as RGP
} from '@datagrok-libraries/bio/src/utils/const';
import {BrokenWebEditorMonomer, getRS, MissingWebEditorMonomer} from './get-monomer-dummy';

function getMonomerColors(monomer: Monomer): IMonomerColors | null {
  const currentMonomerSchema = 'default';
  let monomerSchema: string = currentMonomerSchema;
  if (!monomer.meta || !monomer.meta.colors) return null;

  const monomerColors: { [colorSchemaName: string]: any } = monomer.meta.colors;

  if (!(currentMonomerSchema in monomerColors)) monomerSchema = 'default';

  const res = monomerColors[monomerSchema];

  return !res ? null : {
    textcolor: res.text ?? res.textColor,
    linecolor: res.line ?? res.lineColor,
    backgroundcolor: res.background ?? res.backgroundColor
  } as IMonomerColors;
}

export class LibraryWebEditorMonomer implements IWebEditorMonomer {
  public get rs(): number { return Object.keys(this.at).length; }

  public get issmiles(): boolean { return !!this.smiles; }

  public linecolor?: string;
  public backgroundcolor?: string;
  public textcolor?: string;

  /* eslint-disable max-params */
  protected constructor(
    public readonly id: string,
    public readonly m: string,
    public readonly n: string,
    public readonly na: string | undefined,
    public readonly type: PolymerType,
    public readonly mt: MonomerType,
    public readonly at: WebEditorRGroups,
    public readonly smiles?: string,
  ) /* eslint-enable max-params */ {}

  static fromMonomer(biotype: HelmType, monomer: Monomer): IWebEditorMonomer {
    let at: WebEditorRGroups = {};
    const symbol = monomer[REQ.SYMBOL];
    const smiles = monomer[REQ.SMILES];
    if (monomer.rgroups.length > 0) {
      monomer.rgroups.forEach((it) => {
        at[it[RGP.LABEL]] = it[RGP.CAP_GROUP_NAME];
      });
    } else if (smiles) {
      // Generate R-Groups from SMILES
      at = getRS(smiles);
    } else if (!monomer.lib) {
      // missing
      return new MissingWebEditorMonomer(biotype, symbol);
    } else {
      // broken
      return new BrokenWebEditorMonomer(biotype, symbol);
    }

    const res = new LibraryWebEditorMonomer(
      monomer[REQ.SYMBOL],
      monomer[REQ.MOLFILE],
      monomer[REQ.NAME],
      monomer[OPT.NATURAL_ANALOG],
      monomer[REQ.POLYMER_TYPE],
      monomer[REQ.MONOMER_TYPE],
      at);

    const colors = getMonomerColors(monomer);
    if (colors) {
      res.textcolor = colors?.textcolor;
      res.linecolor = colors?.linecolor;
      res.backgroundcolor = colors?.backgroundcolor;
    }

    return res;
  }
}
